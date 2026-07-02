import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../sharedComponent/service/environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { isDevMode } from '@angular/core';
import { ProductData, VariantDTO, DeliveryMethod, PaymentMethod } from '../models/interface';

interface CartItem {
  product: ProductData;
  quantity: number;
  isVariant: boolean;
  selectedVariants?: VariantDTO[];
  unitPrice: number;
  originalPrice?: number;
}

interface Cart {
  items: Map<string, CartItem>;
  subtotal: number;
  totalItems: number;
}

// Simple guest order interface for local storage
interface GuestOrder {
  id: string;
  orderNumber: string;
  items: any[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryMethod: 'delivery' | 'pickup';
  paymentMethod: string;
  deliveryInfo?: {
    fullName: string;
    phoneNumber: string;
    address: string;
    email?: string;
    instructions?: string;
  };
  orderDate: string;
  status: 'confirmed' | 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  branchId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class StoreCartService {
  private cartItems = signal<Map<string, CartItem>>(new Map());
  private readonly CART_STORAGE_KEY = 'store_cart';
  private readonly ORDERS_STORAGE_KEY = 'store_orders';
  private apiUrl: string;

  // Computed values for reactive updates
  cart = computed<Cart>(() => {
    const items = this.cartItems();
    const subtotal = this.calculateSubtotal(items);
    const totalItems = this.calculateTotalItems(items);
    return { items, subtotal, totalItems };
  });

  isCartEmpty = computed(() => this.cartItems().size === 0);
  totalItems = computed(() => this.calculateTotalItems(this.cartItems()));

  constructor(private http: HttpClient) {
    this.apiUrl = this.getBaseApiUrl();
    this.loadCartFromStorage();
  }

  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

  private loadCartFromStorage(): void {
    try {
      const storedCart = localStorage.getItem(this.CART_STORAGE_KEY);
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        const cartMap = new Map();
        
        Object.keys(parsedCart.items).forEach(key => {
          const item = parsedCart.items[key];
          const unitPrice = item.unitPrice || this.getProductPrice(item.product, item.selectedVariants?.[0]);
          
          cartMap.set(key, {
            product: item.product,
            quantity: item.quantity,
            isVariant: item.isVariant,
            selectedVariants: item.selectedVariants || [],
            unitPrice: unitPrice
          });
        });
        
        this.cartItems.set(cartMap);
        console.log('Cart loaded from storage:', cartMap.size, 'items, subtotal:', this.cart().subtotal);
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      this.clearCart();
    }
  }

  private saveCartToStorage(): void {
    try {
      const currentCart = this.cartItems();
      const cartData = {
        items: Object.fromEntries(currentCart),
        subtotal: this.cart().subtotal,
        totalItems: this.cart().totalItems,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(cartData));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }

  private saveOrderToStorage(order: GuestOrder): void {
    try {
      const existingOrders = this.getStoredOrders();
      existingOrders.push(order);
      localStorage.setItem(this.ORDERS_STORAGE_KEY, JSON.stringify(existingOrders));
    } catch (error) {
      console.error('Error saving order to storage:', error);
    }
  }

  private getStoredOrders(): GuestOrder[] {
    try {
      const storedOrders = localStorage.getItem(this.ORDERS_STORAGE_KEY);
      return storedOrders ? JSON.parse(storedOrders) : [];
    } catch (error) {
      console.error('Error loading orders from storage:', error);
      return [];
    }
  }

  private getProductPrice(product: ProductData, variant?: VariantDTO): number {
    if (variant && variant.price !== undefined && variant.price !== null) {
      const variantPrice = typeof variant.price === 'string' ? parseFloat(variant.price) : variant.price;
      if (!isNaN(variantPrice)) {
        return variantPrice;
      }
    }
    
    const price = product.sellingPrice;
    if (price === undefined || price === null) {
      console.warn('No price found for product:', product.name, 'defaulting to 0');
      return 0;
    }
    
    const productPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(productPrice) ? 0 : productPrice;
  }

  // Public API Methods
  getCart(): Cart {
    return this.cart();
  }

addToCart(product: ProductData, variant?: VariantDTO): void {
  const currentCart = new Map(this.cartItems());
  const idToUse = variant ? `${product.id}-${variant.id}` : product.id.toString();
  
  // Use discounted price instead of regular selling price
  const unitPrice = this.getDiscountedPrice(product, variant);
  
  console.log('Adding to cart:', {
    product: product.name,
    variant: variant?.name,
    unitPrice: unitPrice,
    id: idToUse
  });

  if (currentCart.has(idToUse)) {
    const existingItem = currentCart.get(idToUse)!;
    currentCart.set(idToUse, {
      ...existingItem,
      quantity: existingItem.quantity + 1
    });
  } else {
    const clonedProduct = JSON.parse(JSON.stringify(product));
    const selectedVariants = variant ? [variant] : [];
    
    currentCart.set(idToUse, {
      product: clonedProduct,
      quantity: 1,
      isVariant: !!variant,
      selectedVariants: selectedVariants,
      unitPrice: unitPrice, // Store discounted price
      originalPrice: this.getOriginalPrice(product, variant) // Store original price for reference
    });
  }
  
  this.cartItems.set(currentCart);
  this.saveCartToStorage();
  console.log('Cart updated - items:', currentCart.size, 'subtotal:', this.cart().subtotal);
}

// Add these helper methods to StoreCartService:

private getDiscountedPrice(product: ProductData, variant?: VariantDTO): number {
  // Use variant price if available
  if (variant && variant.price !== undefined && variant.price !== null) {
    const variantPrice = typeof variant.price === 'string' ? parseFloat(variant.price) : variant.price;
    if (!isNaN(variantPrice)) {
      // Apply discount to variant if product has discount
      if (product.discount && product.discount.value) {
        return this.calculateDiscountedPrice(variantPrice, product.discount);
      }
      return variantPrice;
    }
  }
  
  // Calculate discounted price for product
  const price = product.sellingPrice;
  if (price === undefined || price === null) {
    console.warn('No price found for product:', product.name, 'defaulting to 0');
    return 0;
  }
  
  const productPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (product.discount && product.discount.value) {
    return this.calculateDiscountedPrice(productPrice, product.discount);
  }
  
  return isNaN(productPrice) ? 0 : productPrice;
}

private calculateDiscountedPrice(originalPrice: number, discount: any): number {
  if (!discount || !discount.value) return originalPrice;
  
  const discountTypeName = discount.discountType?.name || discount.discountType;
  
  if (discountTypeName === 'PERCENTAGE') {
    const discountAmount = originalPrice * (discount.value / 100);
    return Math.max(0, originalPrice - discountAmount);
  }
  
  if (discountTypeName === 'FIXED_AMOUNT' || discountTypeName === 'AMOUNT') {
    return Math.max(0, originalPrice - discount.value);
  }
  
  // Default: assume percentage
  const discountAmount = originalPrice * (discount.value / 100);
  return Math.max(0, originalPrice - discountAmount);
}

private getOriginalPrice(product: ProductData, variant?: VariantDTO): number {
  if (variant && variant.price !== undefined && variant.price !== null) {
    const variantPrice = typeof variant.price === 'string' ? parseFloat(variant.price) : variant.price;
    if (!isNaN(variantPrice)) return variantPrice;
  }
  
  const price = product.sellingPrice;
  if (price === undefined || price === null) return 0;
  
  return typeof price === 'string' ? parseFloat(price) : price;
}


  removeFromCart(product: ProductData, variant?: VariantDTO): void {
    const currentCart = new Map(this.cartItems());
    const idToUse = variant ? `${product.id}-${variant.id}` : product.id.toString();
    
    currentCart.delete(idToUse);
    this.cartItems.set(currentCart);
    this.saveCartToStorage();
  }

  updateQuantity(product: ProductData, quantity: number, variant?: VariantDTO): void {
    if (quantity <= 0) {
      this.removeFromCart(product, variant);
      return;
    }
    
    const currentCart = new Map(this.cartItems());
    const idToUse = variant ? `${product.id}-${variant.id}` : product.id.toString();
    
    if (currentCart.has(idToUse)) {
      const existingItem = currentCart.get(idToUse)!;
      currentCart.set(idToUse, {
        ...existingItem,
        quantity: quantity
      });
      
      this.cartItems.set(currentCart);
      this.saveCartToStorage();
    }
  }

  clearCart(): void {
    this.cartItems.set(new Map());
    localStorage.removeItem(this.CART_STORAGE_KEY);
    console.log('Cart cleared');
  }

  private calculateSubtotal(cart: Map<string, CartItem>): number {
    let subtotal = 0;
    cart.forEach((item) => {
      const itemTotal = item.unitPrice * item.quantity;
      subtotal += itemTotal;
    });
    return subtotal;
  }

  private calculateTotalItems(cart: Map<string, CartItem>): number {
    let total = 0;
    cart.forEach(item => total += item.quantity);
    return total;
  }

  /**
   * Generate valid order number that meets size constraints
   */
  private generateValidOrderNumber(): string {
    // Use sequential numbers for simplicity and validation
    const lastOrderNumber = localStorage.getItem('lastStoreOrderNumber');
    let nextNumber = 1000;
    
    if (lastOrderNumber) {
      const match = lastOrderNumber.match(/\d+/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }
    
    const orderNumber = `STORE-${nextNumber}`;
    localStorage.setItem('lastStoreOrderNumber', orderNumber);
    
    console.log('Generated order number:', orderNumber, 'Length:', orderNumber.length);
    return orderNumber;
  }

  /**
   * Generate unique order ID for local storage
   */
  private generateOrderId(): string {
    return `GST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Build order items in correct format
   */
//   private buildOrderItems(cartItems: CartItem[]): any[] {
//   const orderItems: any[] = [];

//   cartItems.forEach(item => {
//     // Ensure we have valid product ID
//     const productId = item.product?.id;
//     if (!productId) {
//       console.warn('⚠️ Skipping item with invalid product ID:', item);
//       return;
//     }

//     const orderItem = {
//       id: 0,
//       totalPrice: item.unitPrice * item.quantity,
//       quantity: item.quantity,
//       productId: productId,
//       productVariantId: item.selectedVariants?.[0]?.id || 0,
//       orderId: 0
//     };
//     orderItems.push(orderItem);
//   });

//   return orderItems;
// }

  /**
   * Calculate total quantity
   */
  private calculateTotalQuantity(cartItems: CartItem[]): number {
    let total = 0;
    cartItems.forEach(item => {
      total += item.quantity;
    });
    return total;
  }

  /**
   * Main order placement method
   */
placeOrder(orderData: any): Observable<any> {
  console.log('🛒 Starting order placement process...');
  console.log('📋 Order Data Received:', orderData);
  
  const orderNumber = this.generateValidOrderNumber();
  const orderId = this.generateOrderId();
  const cartItems = Array.from(this.cartItems().values());
  
  if (cartItems.length === 0) {
    console.error('❌ Cannot place empty order');
    return throwError(() => new Error('Cannot place empty order'));
  }

  // Create customer first
  return this.getOrCreateGuestCustomer(orderData.deliveryInfo).pipe(
    switchMap((customerId: number) => {
      console.log('✅ Got Customer ID:', customerId);
      
      const orderItems = this.buildOrderItems(cartItems);
      const totalQuantity = this.calculateTotalQuantity(cartItems);
      const subtotal = this.calculateSubtotal(this.cartItems());
      const deliveryFee = orderData.deliveryFee || 0;
      const total = subtotal + deliveryFee;

      console.log('🔧 Order Items Structure:', orderItems);
      console.log('💰 Order Totals:', { subtotal, deliveryFee, total, totalQuantity });

      // Build payload according to schema - ONLY required fields marked with *
      const apiPayload: any = {
        orderStatus: 'CONFIRMED', // Required - using CONFIRMED for e-store orders
        totalAmount: total.toString(), // Required - must be string
        quantity: totalQuantity, // Required - number (not integer)
        orderItem: orderItems // Required array
      };

      // Add optional fields only if they have valid values
      apiPayload.id = 0; // For creation
      apiPayload.orderNumber = orderNumber;
      apiPayload.updatedAt = new Date().toISOString();
      apiPayload.createdDate = new Date().toISOString();
      apiPayload.amountTendered = total;
      
      // Only add these IDs if you have valid values
      if (customerId && customerId > 0) {
        apiPayload.customerId = customerId;
      }
      
      if (orderData.branchId && orderData.branchId > 0) {
        apiPayload.branchId = orderData.branchId;
      }

      // Add delivery-related fields
      if (deliveryFee > 0) {
        apiPayload.deliveryFee = deliveryFee;
      }
      
      if (orderData.deliveryInfo?.email) {
        apiPayload.customerEmail = orderData.deliveryInfo.email;
      }
      
      // Add estimated times
      apiPayload.estimatedReadyTime = new Date(Date.now() + 20 * 60000).toISOString();
      
      if (orderData.deliveryMethod === 'DELIVERY') {
        apiPayload.estimatedDeliveryTime = new Date(Date.now() + 40 * 60000).toISOString();
      }

      // DO NOT include discountId, paymentId, cashierId, deliveryInfoId unless you have valid IDs

      console.log('🚀 Final API Payload:', JSON.stringify(apiPayload, null, 2));

      // Create guest order for local storage
      const guestOrder: GuestOrder = {
        id: orderId,
        orderNumber: orderNumber,
        items: cartItems.map(item => ({
          product: item.product,
          quantity: item.quantity,
          selectedVariants: item.selectedVariants,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity
        })),
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        total: total,
        deliveryMethod: orderData.deliveryMethod === 'DELIVERY' ? 'delivery' : 'pickup',
        paymentMethod: orderData.paymentMethod,
        deliveryInfo: orderData.deliveryInfo,
        orderDate: new Date().toISOString(),
        status: 'confirmed',
        branchId: orderData.branchId || 0
      };

      this.saveOrderToStorage(guestOrder);

      console.log('📦 Attempting API call to:', `${this.apiUrl}/x/api/v2/pos/orders`);

      return this.http.post(`${this.apiUrl}/x/api/v2/pos/orders`, apiPayload).pipe(
        map((response: any) => {
          console.log('✅ Order placed successfully via API:', response);
          this.clearCart();
          
          return {
            success: true,
            orderId: orderId,
            orderNumber: orderNumber,
            apiResponse: response,
            message: 'Order placed successfully'
          };
        }),
        catchError((error: any) => {
          console.error('❌ API order submission failed:', error);
          console.error('❌ Status:', error.status);
          
          if (error.error) {
            console.error('🔍 Server error details:', JSON.stringify(error.error, null, 2));
          }
          
          console.log('📦 Order saved locally with ID:', orderId);
          return throwError(() => error);
        })
      );
    }),
    catchError((error: any) => {
      console.error('❌ Error in order placement chain:', error);
      return throwError(() => error);
    })
  );
}

/**
 * Build order items in correct format according to schema
 */
private buildOrderItems(cartItems: CartItem[]): any[] {
  const orderItems: any[] = [];

  cartItems.forEach(item => {
    const productId = item.product?.id;
    if (!productId) {
      console.warn('⚠️ Skipping item with invalid product ID:', item);
      return;
    }

    // Main product order item - CORRECTED to match schema
    const orderItem: any = {
      id: 0, // Required by schema
      totalPrice: item.unitPrice * item.quantity,
      quantity: item.quantity,
      productId: productId,
      productVariantId: item.selectedVariants?.[0]?.id || 0,
      orderId: 0 // Will be set by backend
    };

    orderItems.push(orderItem);
  });

  console.log('✅ Built order items matching schema:', orderItems);
  return orderItems;
}

// Helper method to get or create guest customer
private getOrCreateGuestCustomer(deliveryInfo: any): Observable<number> {
  // Create proper customer data with required fields
  const guestCustomerData: any = {
    name: deliveryInfo?.fullName?.trim() || 'Guest Customer',
    email: deliveryInfo?.email?.trim() || '',
    phoneNumber: deliveryInfo?.phoneNumber?.trim() || '',
    loyaltyPoints: 0
  };

  // Remove empty fields that might cause validation issues
  if (!guestCustomerData.email) {
    delete guestCustomerData.email;
  }
  if (!guestCustomerData.phoneNumber) {
    delete guestCustomerData.phoneNumber;
  }

  console.log('👤 Creating guest customer with data:', guestCustomerData);

  return this.http.post<any>(`${this.apiUrl}/x/api/v2/pos/customers`, guestCustomerData).pipe(
    map((response: any) => {
      console.log('✅ Guest customer created with ID:', response.id);
      return response.id;
    }),
    catchError((error) => {
      console.error('❌ Failed to create guest customer:', error);
      
      // Log detailed error information
      if (error.error) {
        console.error('🔍 Customer creation error details:', JSON.stringify(error.error, null, 2));
      }
      
      // For now, use a fallback customer ID or skip customer creation
      console.warn('⚠️ Using fallback customer ID 1');
      return of(0); // Use 0 instead of 1 as fallback
    })
  );
}
// Helper method to create delivery info
private createDeliveryInfo(deliveryInfo: any): Observable<number> {
  const deliveryInfoData = {
    fullName: deliveryInfo.fullName,
    phoneNumber: deliveryInfo.phoneNumber,
    address: deliveryInfo.address,
    email: deliveryInfo.email || '',
    instructions: deliveryInfo.instructions || ''
  };

  return this.http.post<any>(`${this.apiUrl}/x/api/v2/pos/deliveryInfos`, deliveryInfoData).pipe(
    map((response: any) => {
      console.log('✅ Delivery info created:', response);
      return response.id;
    }),
    catchError((error) => {
      console.error('❌ Failed to create delivery info:', error);
      console.error('Error details:', error.error);
      // If delivery info creation fails, we can't proceed with delivery
      return throwError(() => new Error('Failed to create delivery information. Please check the delivery details.'));
    })
  );
}
  /**
   * Enhanced order placement with delivery information
   */
  placeOrderWithDelivery(orderData: any): Observable<any> {
    return this.placeOrder(orderData);
  }

  /**
   * Process payment
   */
  processPayment(paymentPayload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/payments`, paymentPayload).pipe(
      catchError((error: any) => {
        console.warn('Payment processing failed:', error);
        return of({
          success: true,
          paymentId: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          message: 'Payment processed (mock response for guest order)'
        });
      })
    );
  }

  /**
   * Get all guest orders
   */
  getGuestOrders(): GuestOrder[] {
    return this.getStoredOrders();
  }

  /**
   * Get specific guest order by ID
   */
  getGuestOrder(orderId: string): GuestOrder | undefined {
    const storedOrders = this.getStoredOrders();
    return storedOrders.find(order => order.id === orderId);
  }

  /**
   * Get order by order number
   */
  getOrderByOrderNumber(orderNumber: string): GuestOrder | undefined {
    const storedOrders = this.getStoredOrders();
    return storedOrders.find(order => order.orderNumber === orderNumber);
  }

  /**
   * Calculate delivery fee
   */
  calculateDeliveryFee(address?: string): number {
    const baseFee = 1000;
    return baseFee;
  }

  /**
   * Enhanced debug method
   */
  debugOrderPayload(orderData: any): void {
    console.log('🔍 DEBUG - Order Payload Analysis:');
    
    const cartItems = Array.from(this.cartItems().values());
    console.log('📦 Cart Items:', cartItems.map(item => ({
      product: item.product.name,
      productId: item.product.id,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      total: item.unitPrice * item.quantity,
      variants: item.selectedVariants?.map(v => ({
        name: v.name,
        id: v.id,
        price: v.price,
        quantity: v.selectedQuantity
      })) || []
    })));
    
    console.log('💰 Pricing Calculation:', {
      cartSubtotal: this.cart().subtotal,
      deliveryFee: orderData.deliveryFee,
      total: this.cart().subtotal + (orderData.deliveryFee || 0)
    });
    
    console.log('🚚 Delivery Info:', orderData.deliveryInfo);
    console.log('💳 Payment Method:', orderData.paymentMethod);
    console.log('📋 Delivery Method:', orderData.deliveryMethod);
    console.log('🏪 Branch ID:', orderData.branchId);
  }

  /**
   * Validate delivery information
   */
  validateDeliveryInfo(deliveryInfo: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!deliveryInfo?.fullName?.trim()) {
      errors.push('Full name is required');
    }
    
    if (!deliveryInfo?.phoneNumber?.trim()) {
      errors.push('Phone number is required');
    } else if (!/^[0-9+\-\s()]{10,}$/.test(deliveryInfo.phoneNumber)) {
      errors.push('Please enter a valid phone number');
    }
    
    if (!deliveryInfo?.address?.trim()) {
      errors.push('Delivery address is required');
    } else if (deliveryInfo.address.trim().length < 10) {
      errors.push('Please provide a complete delivery address');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Get item quantity in cart
   */
  getItemQuantity(product: ProductData, variant?: VariantDTO): number {
    const idToUse = variant ? `${product.id}-${variant.id}` : product.id.toString();
    return this.cartItems().get(idToUse)?.quantity || 0;
  }

  /**
   * Check if product is in cart
   */
  isInCart(product: ProductData, variant?: VariantDTO): boolean {
    const idToUse = variant ? `${product.id}-${variant.id}` : product.id.toString();
    return this.cartItems().has(idToUse);
  }

  /**
   * Get cart item by product and variant
   */
  getCartItem(product: ProductData, variant?: VariantDTO): CartItem | undefined {
    const idToUse = variant ? `${product.id}-${variant.id}` : product.id.toString();
    return this.cartItems().get(idToUse);
  }
}
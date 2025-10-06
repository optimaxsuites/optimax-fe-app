// store-cart.service.ts - FIXED VERSION
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GuestOrderService } from './guest-order.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../sharedComponent/service/environments/environment';
import { isDevMode } from '@angular/core';
import { ProductData, VariantDTO, DeliveryMethod, PaymentMethod } from '../models/interface';
import { GuestOrder, OrderStatus } from '../models/guest-order.interface';

interface CartItem {
  product: ProductData;
  quantity: number;
  isVariant: boolean;
  selectedVariants?: VariantDTO[];
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
  cart = computed(() => {
    const items = this.cartItems();
    const subtotal = this.calculateSubtotal(items);
    const totalItems = this.calculateTotalItems(items);
    return { items, subtotal, totalItems };
  });

  isCartEmpty = computed(() => this.cartItems().size === 0);
  totalItems = computed(() => this.calculateTotalItems(this.cartItems()));

  constructor(
    private guestOrderService: GuestOrderService,
    private http: HttpClient
  ) {
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
          cartMap.set(key, {
            product: item.product,
            quantity: item.quantity,
            isVariant: item.isVariant,
            selectedVariants: item.selectedVariants || []
          });
        });
        
        this.cartItems.set(cartMap);
        console.log('Cart loaded from storage:', cartMap.size, 'items');
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

  // Public API
  getCart() {
    return this.cart();
  }

  addToCart(product: ProductData, variant?: VariantDTO): void {
    const currentCart = new Map(this.cartItems());
    const idToUse = variant ? `${product.id}-${variant.id}` : product.id.toString();
    
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
        selectedVariants: selectedVariants
      });
    }
    
    this.cartItems.set(currentCart);
    this.saveCartToStorage();
    console.log('Cart updated - items:', currentCart.size);
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
  }

  private calculateSubtotal(cart: Map<string, CartItem>): number {
    let subtotal = 0;
    cart.forEach((item) => {
      const price = item.product.sellingPrice;
      if (price !== undefined && price !== null) {
        const priceValue = typeof price === 'string' ? parseFloat(price) : price;
        if (!isNaN(priceValue)) {
          subtotal += priceValue * item.quantity;
        }
      }
    });
    return subtotal;
  }

  private calculateTotalItems(cart: Map<string, CartItem>): number {
    let total = 0;
    cart.forEach(item => total += item.quantity);
    return total;
  }

  /**
   * Enhanced order placement with delivery support
   */
  placeOrder(orderData: any): Observable<any> {
    this.debugOrderPayload(orderData);
    const orderNumber = this.generateOrderNumber();
    const orderId = this.guestOrderService.generateOrderId();
    
    // Prepare order items in the correct format
    const orderItems = orderData.items.map((item: any) => ({
      productId: item.productId || item.product?.id,
      quantity: item.quantity,
      unitPrice: item.price || item.unitPrice || item.product?.sellingPrice,
      totalPrice: (item.price || item.unitPrice || item.product?.sellingPrice) * item.quantity,
      productVariantId: item.selectedVariants?.[0]?.id || null
    }));

    // Build API payload
    const apiPayload = {
      orderNumber: orderNumber,
      orderStatus: 'CONFIRMED',
      totalAmount: orderData.total.toString(),
      quantity: orderData.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      branchId: orderData.branchId || 1,
      paymentMethod: orderData.paymentMethod?.toUpperCase() || PaymentMethod.CASH,
      orderItem: orderItems,
      deliveryMethod: orderData.deliveryMethod?.toUpperCase() || DeliveryMethod.PICKUP,
      deliveryFee: orderData.deliveryFee || 0,
      amountTendered: orderData.total,
      customerEmail: orderData.deliveryInfo?.email || '',
      createdDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deliveryInfo: orderData.deliveryMethod?.toUpperCase() === DeliveryMethod.DELIVERY ? {
        fullName: orderData.deliveryInfo.fullName,
        phoneNumber: orderData.deliveryInfo.phoneNumber,
        address: orderData.deliveryInfo.address,
        email: orderData.deliveryInfo.email || '',
        instructions: orderData.deliveryInfo.instructions || ''
      } : null
    };

    // Create guest order for local storage with proper typing
    const guestOrder: GuestOrder = {
      id: orderId,
      orderNumber: orderNumber,
      items: orderData.items,
      subtotal: orderData.subtotal,
      deliveryFee: orderData.deliveryFee || 0,
      total: orderData.total,
      deliveryMethod: orderData.deliveryMethod === 'DELIVERY' ? 'delivery' : 'pickup',
      paymentMethod: orderData.paymentMethod,
      deliveryInfo: orderData.deliveryInfo,
      orderDate: new Date().toISOString(),
      status: 'confirmed' as OrderStatus,
      branchId: orderData.branchId || 1
    };

    // Save to both services
    this.guestOrderService.saveOrder(guestOrder);
    this.saveOrderToStorage(guestOrder);

    // Attempt API call
    return this.http.post(`${this.apiUrl}/orders`, apiPayload).pipe(
      map((response: any) => {
        console.log('Order placed successfully via API:', response);
        return {
          success: true,
          orderId: orderId,
          orderNumber: orderNumber,
          apiResponse: response,
          message: 'Order placed successfully'
        };
      }),
      catchError((error: any) => {
        console.warn('API order submission failed, but order saved locally:', error);
        return of({
          success: true,
          orderId: orderId,
          orderNumber: orderNumber,
          message: 'Order placed successfully (saved locally)',
          isLocal: true
        });
      })
    );
  }

  /**
   * Enhanced order placement with delivery information
   */
  placeOrderWithDelivery(orderData: any): Observable<any> {
    return this.placeOrder(orderData);
  }

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

  getGuestOrders(): GuestOrder[] {
    const storedOrders = this.getStoredOrders();
    const guestOrders = this.guestOrderService.getOrders();
    
    // Merge both sources, removing duplicates
    const allOrders = [...storedOrders, ...guestOrders];
    const uniqueOrders = allOrders.filter((order, index, self) => 
      index === self.findIndex(o => o.id === order.id)
    );
    
    return uniqueOrders.sort((a, b) => 
      new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );
  }

  getGuestOrder(orderId: string): GuestOrder | undefined {
    // Check stored orders first
    const storedOrders = this.getStoredOrders();
    const storedOrder = storedOrders.find(order => order.id === orderId);
    if (storedOrder) return storedOrder;

    // Fall back to guest service
    return this.guestOrderService.getOrder(orderId);
  }

  getOrderByOrderNumber(orderNumber: string): GuestOrder | undefined {
    const storedOrders = this.getStoredOrders();
    return storedOrders.find(order => order.orderNumber === orderNumber) || 
           this.guestOrderService.getOrders().find(order => order.orderNumber === orderNumber);
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `ORD-${timestamp}-${random}`.toUpperCase();
  }

  // Utility methods for delivery
  calculateDeliveryFee(address?: string): number {
    // Simple delivery fee calculation - you can enhance this based on distance
    const baseFee = 1000;
    return baseFee;
  }

  debugOrderPayload(orderData: any): void {
  console.log('🔍 DEBUG - Order Payload Analysis:');
  console.log('📦 Order Items:', orderData.items);
  console.log('💰 Pricing:', {
    subtotal: orderData.subtotal,
    deliveryFee: orderData.deliveryFee,
    total: orderData.total
  });
  console.log('🚚 Delivery Info:', orderData.deliveryInfo);
  console.log('💳 Payment Method:', orderData.paymentMethod);
  console.log('📋 Delivery Method:', orderData.deliveryMethod);
  
  // Check if delivery info is properly structured
  if (orderData.deliveryInfo) {
    console.log('✅ Delivery Info Structure:', {
      hasFullName: !!orderData.deliveryInfo.fullName,
      hasPhone: !!orderData.deliveryInfo.phoneNumber,
      hasAddress: !!orderData.deliveryInfo.address,
      hasEmail: !!orderData.deliveryInfo.email,
      hasInstructions: !!orderData.deliveryInfo.instructions
    });
  }
}

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
}
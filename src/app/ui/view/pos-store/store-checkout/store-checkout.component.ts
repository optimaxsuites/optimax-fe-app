import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ImageCacheService } from '../../../service/image-cache.service';
import { StoreCartService } from '../../../service/store-cart.service';
import { StoreOrderService, StoreOrderPOST, StoreOrderItemPOST } from '../../../service/store-order.service';

declare var PaystackPop: any;

@Component({
  selector: 'app-store-checkout',
  templateUrl: './store-checkout.component.html',
  styleUrls: ['./store-checkout.component.scss'],
})
export class StoreCheckoutComponent implements OnInit {
  cartItems: Map<any, any> = new Map();
  subtotal: number = 0;
  totalItems: number = 0;
  isDelivery: boolean = false;
  deliveryFee: number = 1000;
  paymentMethod: string = 'cash';
  isLoading: boolean = false;
  formErrors: string[] = [];

  deliveryInfo = {
    fullName: '',
    phoneNumber: '',
    address: '',
    email: '',
    instructions: '',
  };

  paymentMethods = [
    {
      value: 'cash',
      label: 'Pay with Cash',
      icon: 'fa-money-bill-wave',
      description: 'Pay when you pickup your order',
      disabled: false,
    },
    {
      value: 'transfer',
      label: 'Bank Transfer',
      icon: 'fa-building-columns',
      description: 'Transfer to our bank account',
      disabled: false,
    },
    {
      value: 'card',
      label: 'Credit/Debit Card',
      icon: 'fa-credit-card',
      description: 'Pay securely with Paystack',
      disabled: false,
    },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private imageCacheService: ImageCacheService,
    private cartService: StoreCartService,
    private storeOrderService: StoreOrderService
  ) {}

  ngOnInit(): void {
    this.loadCartData();
  }

  loadCartData(): void {
    const cartData = this.cartService.getCart();
    this.cartItems = cartData.items;
    this.subtotal = cartData.subtotal;
    this.totalItems = cartData.totalItems;

    if (this.cartItems.size === 0) {
      this.router.navigate(['/store']);
    }
  }

  get total(): number {
    return this.subtotal + (this.isDelivery ? this.deliveryFee : 0);
  }

  getProductImage(product: any) {
    return this.imageCacheService.getProductImage(product);
  }

  toggleDelivery(isDelivery: boolean): void {
    this.isDelivery = isDelivery;
    this.formErrors = [];

    if (isDelivery) {
      this.deliveryFee = this.cartService.calculateDeliveryFee();
    } else {
      this.deliveryInfo = {
        fullName: '',
        phoneNumber: '',
        address: '',
        email: '',
        instructions: '',
      };
    }
  }

  validateForm(): boolean {
    this.formErrors = [];

    if (this.cartItems.size === 0) {
      this.formErrors.push('Your cart is empty. Please add items before placing an order.');
      return false;
    }

    if (this.isDelivery) {
      const validation = this.cartService.validateDeliveryInfo(this.deliveryInfo);
      if (!validation.isValid) {
        this.formErrors = validation.errors;
        return false;
      }
    }

    if (!this.paymentMethod) {
      this.formErrors.push('Please select a payment method');
      return false;
    }

    return true;
  }

  canPlaceOrder(): boolean {
    if (this.isLoading) return false;

    if (this.isDelivery) {
      return (
        !!this.deliveryInfo.fullName?.trim() &&
        !!this.deliveryInfo.phoneNumber?.trim() &&
        !!this.deliveryInfo.address?.trim() &&
        !!this.paymentMethod
      );
    }
    return !!this.paymentMethod;
  }

  async placeOrder(): Promise<void> {
    if (this.isLoading || !this.validateForm()) return;

    this.isLoading = true;
    this.formErrors = [];

    try {
      const orderData = this.prepareOrderData();
      
      if (this.paymentMethod === 'card') {
        await this.handlePaystackPayment(orderData);
      } else {
        await this.handleCashPayment(orderData);
      }
    } catch (error) {
      this.isLoading = false;
      console.error('Order placement failed:', error);
      this.handleOrderError(error);
    }
  }

  private async handlePaystackPayment(orderData: StoreOrderPOST): Promise<void> {
    const customerEmail = this.deliveryInfo.email || 'customer@example.com';
    const amount = this.total * 100; // Paystack expects amount in kobo

    this.storeOrderService.processPaystackPayment(
      customerEmail,
      amount,
      orderData.orderNumber
    ).subscribe({
      next: (paystackResponse: any) => {
        console.log('✅ Paystack payment successful:', paystackResponse);
        
        this.storeOrderService.createOrderWithPayment(
          orderData,
          'card',
          paystackResponse.reference,
          this.isDelivery ? this.deliveryInfo : undefined
        ).subscribe({
          next: (orderResponse: any) => {
            this.isLoading = false;
            console.log('✅ Order created after payment:', orderResponse);
            
            this.cartService.clearCart();
            
            const currentUuid = this.route.snapshot.paramMap.get('uuid');
            const orderId = orderResponse.id || orderResponse.orderId;

            this.router.navigate(
              ['/store', currentUuid, 'order-confirmation', orderId],
              {
                state: {
                  orderData: orderResponse,
                  deliveryMethod: this.isDelivery ? 'delivery' : 'pickup',
                  paymentMethod: this.paymentMethod,
                  paymentStatus: 'paid'
                },
              }
            );
          },
          error: (error: any) => {
            this.isLoading = false;
            console.error('❌ Order creation after payment failed:', error);
            this.handleOrderError(error);
          }
        });
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('❌ Paystack payment failed:', error);
        
        if (error.message?.includes('cancelled by user')) {
          this.formErrors = ['Payment was cancelled. Please try again.'];
        } else {
          this.formErrors = ['Payment failed. Please try again or use a different payment method.'];
        }
      }
    });
  }

  private async handleCashPayment(orderData: StoreOrderPOST): Promise<void> {
    console.log('💵 Processing cash/transfer payment...');
    console.log('Order data:', JSON.stringify(orderData, null, 2));
    
    this.storeOrderService.createCashOrder(
      orderData,
      this.isDelivery ? this.deliveryInfo : undefined
    ).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        console.log('✅ Order placed successfully:', response);
        
        this.cartService.clearCart();
        
        const currentUuid = this.route.snapshot.paramMap.get('uuid');
        const orderId = response.id || response.orderId;

        this.router.navigate(
          ['/store', currentUuid, 'order-confirmation', orderId],
          {
            state: {
              orderData: response,
              deliveryMethod: this.isDelivery ? 'delivery' : 'pickup',
              paymentMethod: this.paymentMethod,
              paymentStatus: 'pending'
            },
          }
        );
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('❌ Order placement failed:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        this.handleOrderError(error);
      },
    });
  }

  private prepareOrderData(): StoreOrderPOST {
    // Map cart items to order items with proper schema compliance
    const orderItems: StoreOrderItemPOST[] = Array.from(this.cartItems.entries()).map(
      ([key, value]) => {
        const hasValidVariant = value.selectedVariants?.[0]?.id && value.selectedVariants[0].id > 0;
        
        return {
          id: 0, // Must be 0 for new items per schema
          totalPrice: Number((value.product.sellingPrice * value.quantity).toFixed(2)), // Ensure proper number format
          quantity: Number(value.quantity), // Ensure it's a number (double)
          productId: Number(value.product.id), // Ensure integer
          productVariantId: hasValidVariant ? Number(value.selectedVariants[0].id) : null, // Can be null per schema
          orderId: null // Must be null for new orders
        };
      }
    );

    // Calculate total quantity (sum of all item quantities)
    const totalQuantity = orderItems.reduce((total, item) => total + item.quantity, 0);
    
    // Get customer email, fallback to default
    const customerEmail = this.deliveryInfo.email || 'customer@example.com';
    
    // Calculate estimated times
    const now = new Date();
    
    // Ready time: 30 minutes from now
    const readyTime = new Date(now);
    readyTime.setMinutes(readyTime.getMinutes() + 30);
    
    // Delivery time: 60 minutes from now for delivery, same as ready time for pickup
    const deliveryTime = new Date(now);
    if (this.isDelivery) {
      deliveryTime.setMinutes(deliveryTime.getMinutes() + 60);
    } else {
      deliveryTime.setMinutes(deliveryTime.getMinutes() + 30);
    }

    // Generate order number with length validation (max 12 chars per schema)
    const orderNumber = this.generateOrderNumber();
    
    // Validate order number length
    if (orderNumber.length > 12) {
      console.error('❌ Order number exceeds maximum length of 12 characters:', orderNumber);
      throw new Error('Order number too long');
    }

    // Build the order data according to schema
    const orderData: StoreOrderPOST = {
      id: 0, // Must be 0 for new orders
      orderNumber: orderNumber, // Max 12 chars
      orderStatus: 'PENDING', // Valid enum value - changed from UNPAID to PENDING
      updatedAt: now.toISOString(), // ISO date-time string
      createdDate: now.toISOString(), // ISO date-time string
      amountTendered: 0, // For cash orders, will be updated after payment
      totalAmount: this.total.toFixed(2), // String format as per schema example "52.08"
      quantity: totalQuantity, // Total quantity as number (double)
      customerId: 1, // Default customer ID (should be actual customer ID in production)
      branchId: 1, // Default branch ID (should be actual branch ID in production)
      discountId: null, // Nullable, set to null if no discount
      paymentId: null, // Will be set after payment record is created
      cashierId: null, // Nullable, no cashier for online orders
      orderItem: orderItems, // Array of order items
      deliveryFee: this.isDelivery ? Number(this.deliveryFee) : 0, // Number type
      estimatedReadyTime: readyTime.toISOString(), // String (ISO format)
      estimatedDeliveryTime: deliveryTime.toISOString(), // String (ISO format)
      customerEmail: customerEmail, // String
      deliveryInfoId: null, // Will be set after delivery info is created (if delivery)
      deliverTypeId: this.isDelivery ? 1 : null, // Integer or null - 1 for delivery, null for pickup
      deliveryStatus: 'PENDING' // Valid enum: PENDING, CONFIRMED, PROCESSING, OUT_FOR_DELIVERY, DELIVERED, REFUNDED, CANCELLED
    };

    // Validate the order data before returning
    this.validateOrderData(orderData);

    return orderData;
  }

  private validateOrderData(orderData: StoreOrderPOST): void {
    const errors: string[] = [];

    // Validate required fields
    if (!orderData.orderNumber) errors.push('Order number is required');
    if (orderData.orderNumber && orderData.orderNumber.length > 12) {
      errors.push('Order number exceeds maximum length of 12 characters');
    }
    if (!orderData.orderStatus) errors.push('Order status is required');
    if (!orderData.totalAmount) errors.push('Total amount is required');
    if (orderData.quantity === undefined || orderData.quantity === null) {
      errors.push('Quantity is required');
    }
    if (!orderData.orderItem || orderData.orderItem.length === 0) {
      errors.push('Order must contain at least one item');
    }

    // Validate order status enum
    const validOrderStatuses = ['PAID', 'PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED', 'PROCESSING'];
    if (!validOrderStatuses.includes(orderData.orderStatus)) {
      errors.push(`Invalid order status: ${orderData.orderStatus}`);
    }

    // Validate delivery status enum
    const validDeliveryStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'REFUNDED', 'CANCELLED'];
    if (orderData.deliveryStatus && !validDeliveryStatuses.includes(orderData.deliveryStatus)) {
      errors.push(`Invalid delivery status: ${orderData.deliveryStatus}`);
    }

    // Validate order items
    orderData.orderItem.forEach((item, index) => {
      if (item.totalPrice === undefined || item.totalPrice === null) {
        errors.push(`Order item ${index + 1}: Total price is required`);
      }
      if (item.quantity === undefined || item.quantity === null || item.quantity <= 0) {
        errors.push(`Order item ${index + 1}: Valid quantity is required`);
      }
      if (!item.productId) {
        errors.push(`Order item ${index + 1}: Product ID is required`);
      }
    });

    // Validate numeric fields
    if (isNaN(parseFloat(orderData.totalAmount))) {
      errors.push('Total amount must be a valid number');
    }
    if (orderData.deliveryFee < 0) {
      errors.push('Delivery fee cannot be negative');
    }

    if (errors.length > 0) {
      console.error('❌ Order validation failed:', errors);
      throw new Error(`Order validation failed: ${errors.join(', ')}`);
    }

    console.log('✅ Order data validation passed');
  }

  private generateOrderNumber(): string {
    const lastOrderNumber = localStorage.getItem('lastEStoreOrderNumber');
    let nextNumber = 1000;
    
    if (lastOrderNumber) {
      const match = lastOrderNumber.match(/\d+/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }
    
    // Format: ES-XXXXX (max 12 chars, currently 8-9 chars)
    // This allows for orders up to ES-999999 before hitting the 12 char limit
    const orderNumber = `ES-${nextNumber}`;
    
    // Check if we're approaching the limit
    if (orderNumber.length > 12) {
      console.error('❌ Order number sequence exceeded maximum length');
      // Reset to a shorter format or handle overflow
      const resetNumber = `ES-${Date.now().toString().slice(-6)}`;
      localStorage.setItem('lastEStoreOrderNumber', resetNumber);
      return resetNumber;
    }
    
    localStorage.setItem('lastEStoreOrderNumber', orderNumber);
    return orderNumber;
  }

  private handleOrderError(error: any): void {
    console.error('🔍 Detailed error analysis:', {
      status: error.status,
      statusText: error.statusText,
      message: error.message,
      error: error.error
    });

    let errorMessage = 'Failed to place order. Please try again.';

    if (error.status === 400) {
      if (typeof error === 'string' && error.includes('Validation errors')) {
        errorMessage = error;
      } else if (error.error?.fieldErrors) {
        const fieldErrors = error.error.fieldErrors
          .map((err: any) => `${err.field}: ${err.message || err.errorCode}`)
          .join(', ');
        errorMessage = `Validation failed: ${fieldErrors}`;
      } else {
        errorMessage = 'Invalid order data. Please check your information and try again.';
      }
    } else if (error.status === 401) {
      errorMessage = 'Authentication failed. Please refresh the page and try again.';
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to place orders.';
    } else if (error.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.status === 0) {
      errorMessage = 'Network error. Please check your internet connection.';
    } else if (error.message?.includes('Payment record must be created')) {
      errorMessage = 'Payment processing failed. Please try a different payment method.';
    } else if (error.message?.includes('Cannot place empty order')) {
      errorMessage = 'Your cart is empty. Please add items before placing an order.';
    } else if (error.message?.includes('Order number too long')) {
      errorMessage = 'System error: Order number generation failed. Please contact support.';
    } else if (error.message?.includes('Invalid payment response format')) {
      errorMessage = 'Payment service error. Please contact support.';
    }

    this.formErrors = [errorMessage];
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateQuantity(item: any, change: number): void {
    const newQuantity = item.quantity + change;
    if (newQuantity > 0) {
      this.cartService.updateQuantity(
        item.product,
        newQuantity,
        item.selectedVariants?.[0]
      );
      this.loadCartData();
    }
  }

  removeItem(item: any): void {
    this.cartService.removeFromCart(item.product, item.selectedVariants?.[0]);
    this.loadCartData();
  }

  getPaymentMethodIcon(method: string): string {
    const paymentMethod = this.paymentMethods.find((pm) => pm.value === method);
    return paymentMethod?.icon || 'fa-credit-card';
  }

  getPaymentMethodLabel(method: string): string {
    const paymentMethod = this.paymentMethods.find((pm) => pm.value === method);
    return paymentMethod?.label || method;
  }

  getPaymentMethodClasses(method: any): string {
    const baseClasses = 'flex items-center p-4 border-2 rounded-lg transition-all duration-300';

    if (method.disabled) {
      return `${baseClasses} border-gray-200 bg-gray-50 cursor-not-allowed opacity-60`;
    }

    if (this.paymentMethod === method.value) {
      return `${baseClasses} border-customGreen bg-green-50 cursor-pointer`;
    }

    return `${baseClasses} border-gray-200 hover:border-gray-300 cursor-pointer`;
  }

  goBack(): void {
    const currentUuid = this.route.snapshot.paramMap.get('uuid');
    
    if (currentUuid) {
      this.router.navigate(['/store', currentUuid]);
    } else {
      this.router.navigate(['/store']);
    }
  }

  // Debug helper method
  debugOrderPayload(): void {
    try {
      const orderData = this.prepareOrderData();
      console.log('🔍 DEBUG - Final Order Payload:');
      console.log('Headers:', {
        'Content-Type': 'application/json'
      });
      console.log('Payload:', JSON.stringify(orderData, null, 2));
      console.log('✅ Order validation passed');
    } catch (error) {
      console.error('❌ Order validation failed:', error);
    }
  }

  isPaystackLoaded(): boolean {
    return typeof PaystackPop !== 'undefined';
  }
}
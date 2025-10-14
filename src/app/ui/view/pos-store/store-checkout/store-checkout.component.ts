// store-checkout.component.ts - FULLY UPDATED
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

  // Available payment methods
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
      disabled: false, // Now enabled for Paystack
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
        // Handle Paystack payment
        await this.handlePaystackPayment(orderData);
      } else {
        // Handle cash/transfer payments
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
  const amount = this.total;

  this.storeOrderService.processPaystackPayment(
    customerEmail,
    amount,
    orderData.orderNumber
  ).subscribe({
    next: (paystackResponse: any) => {
      console.log('✅ Paystack payment successful:', paystackResponse);
      
      // Create order with payment reference
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
    const orderItems: StoreOrderItemPOST[] = Array.from(this.cartItems.entries()).map(
      ([key, value]) => {
        const hasValidVariant = value.selectedVariants?.[0]?.id && value.selectedVariants[0].id > 0;
        const productVariantId = hasValidVariant ? value.selectedVariants[0].id : null;

        return {
          id: 0,
          totalPrice: value.product.sellingPrice * value.quantity,
          quantity: value.quantity,
          productId: value.product.id,
          productVariantId: productVariantId,
          orderId: null
        };
      }
    );

    const totalQuantity = orderItems.reduce((total, item) => total + item.quantity, 0);
    const customerEmail = this.deliveryInfo.email || 'customer@example.com';

    return {
      id: 0,
      orderNumber: this.generateOrderNumber(),
      orderStatus: 'UNPAID', // Will be updated based on payment
      updatedAt: new Date().toISOString(),
      createdDate: new Date().toISOString(),
      amountTendered: 0,
      totalAmount: this.total.toFixed(2),
      quantity: totalQuantity,
      customerId: 1,
      branchId: 1,
      discountId: null,
      paymentId: null,
      cashierId: null,
      orderItem: orderItems,
      deliveryFee: this.isDelivery ? this.deliveryFee : 0,
      estimatedReadyTime: new Date(Date.now() + 30 * 60000).toISOString(),
      estimatedDeliveryTime: this.isDelivery 
        ? new Date(Date.now() + 60 * 60000).toISOString()
        : new Date().toISOString(),
      customerEmail: customerEmail,
      deliveryInfoId: null
    };
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
    
    const orderNumber = `ESTORE-${nextNumber}`;
    localStorage.setItem('lastEStoreOrderNumber', orderNumber);
    return orderNumber;
  }

  private handleOrderError(error: any): void {
    let errorMessage = 'Failed to place order. Please try again.';

    if (error.status === 400) {
      errorMessage = 'Invalid order data. Please check your information and try again.';
      console.error('Bad Request Details:', error.error);
    } else if (error.status === 500) {
      errorMessage = 'Server error. Please try again later.';
      console.error('Server Error Details:', error.error);
    } else if (error.status === 0) {
      errorMessage = 'Network error. Please check your internet connection.';
    } else if (error.message?.includes('Cannot place empty order')) {
      errorMessage = 'Your cart is empty. Please add items before placing an order.';
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
  // Get the current UUID from the route parameters
  const currentUuid = this.route.snapshot.paramMap.get('uuid');
  
  if (currentUuid) {
    // Navigate back to the store with the actual UUID
    this.router.navigate(['/store', currentUuid]);
  } else {
    // Fallback if no UUID is found
    this.router.navigate(['/store']);
  }
}

  debugOrderPayload(): void {
    const cartItems = Array.from(this.cartItems.values());
    console.log('🔍 DEBUG - Current Cart State:');
    console.log('Cart Items Count:', cartItems.length);
    console.log('Cart Items:', cartItems);
    console.log('Subtotal:', this.subtotal);
    console.log('Delivery Fee:', this.isDelivery ? this.deliveryFee : 0);
    console.log('Total:', this.total);
    console.log('Delivery Method:', this.isDelivery ? 'DELIVERY' : 'PICKUP');
    console.log('Payment Method:', this.paymentMethod);
  }

  // Check if Paystack is loaded
  isPaystackLoaded(): boolean {
    return typeof PaystackPop !== 'undefined';
  }
}
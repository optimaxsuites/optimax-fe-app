// store-checkout.component.ts - ENHANCED VERSION
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ImageCacheService } from '../../../service/image-cache.service';
import { StoreCartService } from '../../../service/store-cart.service';
import { DeliveryMethod, PaymentMethod } from '../../../models/interface';

@Component({
  selector: 'app-store-checkout',
  templateUrl: './store-checkout.component.html',
  styleUrls: ['./store-checkout.component.scss']
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
    instructions: ''
  };

  // Available payment methods
  paymentMethods = [
  { 
    value: 'cash', 
    label: 'Pay with Cash', 
    icon: 'fa-money-bill-wave', 
    description: 'Pay when you pickup your order',
    disabled: false 
  },
  { 
    value: 'transfer', 
    label: 'Bank Transfer', 
    icon: 'fa-building-columns', 
    description: 'Transfer to our bank account',
    disabled: false 
  },
  { 
    value: 'card', 
    label: 'Credit/Debit Card', 
    icon: 'fa-credit-card', 
    description: 'Pay securely with your card', 
    disabled: true 
  }
];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private imageCacheService: ImageCacheService,
    private cartService: StoreCartService
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
      // Calculate dynamic delivery fee based on address or other factors
      this.deliveryFee = this.cartService.calculateDeliveryFee();
    } else {
      // Reset delivery info when switching to pickup
      this.deliveryInfo = {
        fullName: '',
        phoneNumber: '',
        address: '',
        email: '',
        instructions: ''
      };
    }
  }

  validateForm(): boolean {
    this.formErrors = [];

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
      return !!this.deliveryInfo.fullName?.trim() && 
             !!this.deliveryInfo.phoneNumber?.trim() && 
             !!this.deliveryInfo.address?.trim() &&
             !!this.paymentMethod;
    }
    return !!this.paymentMethod;
  }

  async placeOrder(): Promise<void> {
    if (this.isLoading || !this.validateForm()) return;
    
    this.isLoading = true;
    this.formErrors = [];

    try {
      // Prepare order items in the correct format
      const orderItems = Array.from(this.cartItems.entries()).map(([key, value]) => ({
        productId: value.product.id,
        productName: value.product.name,
        product: value.product, // Include full product for guest orders
        quantity: value.quantity,
        price: value.product.sellingPrice,
        unitPrice: value.product.sellingPrice,
        selectedVariants: value.selectedVariants || [],
        isVariant: value.isVariant
      }));

      const totalQuantity = orderItems.reduce((total, item) => total + item.quantity, 0);

      const orderData = {
        items: orderItems,
        subtotal: this.subtotal,
        deliveryFee: this.isDelivery ? this.deliveryFee : 0,
        total: this.total,
        deliveryMethod: this.isDelivery ? DeliveryMethod.DELIVERY : DeliveryMethod.PICKUP,
        paymentMethod: this.paymentMethod.toUpperCase(),
        deliveryInfo: this.isDelivery ? this.deliveryInfo : null,
        branchId: 1, // Get from store context
        orderDate: new Date().toISOString()
      };

      console.log('Placing order with data:', orderData);

      this.cartService.placeOrderWithDelivery(orderData).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          console.log('Order placed successfully:', response);
          
          // Clear cart on successful order
          this.cartService.clearCart();
          
          const currentUuid = this.route.snapshot.paramMap.get('uuid');
          const orderId = response.orderId;
          
          this.router.navigate(['/store', currentUuid, 'order-confirmation', orderId], {
            state: { 
              orderData: response,
              deliveryMethod: this.isDelivery ? 'delivery' : 'pickup'
            }
          });
        },
        error: (error: any) => {
          this.isLoading = false;
          console.error('Order placement failed:', error);
          this.handleOrderError(error);
        }
      });

    } catch (error) {
      this.isLoading = false;
      console.error('Order placement failed:', error);
      this.handleOrderError(error);
    }
  }

  private handleOrderError(error: any): void {
    let errorMessage = 'Failed to place order. Please try again.';
    
    if (error.status === 400) {
      errorMessage = 'Invalid order data. Please check your information and try again.';
    } else if (error.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.status === 0) {
      errorMessage = 'Network error. Please check your internet connection.';
    }
    
    this.formErrors = [errorMessage];
    
    // Scroll to top to show errors
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateQuantity(item: any, change: number): void {
    const newQuantity = item.quantity + change;
    if (newQuantity > 0) {
      this.cartService.updateQuantity(item.product, newQuantity, item.selectedVariants?.[0]);
      this.loadCartData(); // Refresh cart data
    }
  }

  removeItem(item: any): void {
    this.cartService.removeFromCart(item.product, item.selectedVariants?.[0]);
    this.loadCartData(); // Refresh cart data
  }

  getPaymentMethodIcon(method: string): string {
    const paymentMethod = this.paymentMethods.find(pm => pm.value === method);
    return paymentMethod?.icon || 'fa-credit-card';
  }

  getPaymentMethodLabel(method: string): string {
    const paymentMethod = this.paymentMethods.find(pm => pm.value === method);
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
    this.router.navigate(['/store']);
  }
}
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ImageCacheService } from '../../../service/image-cache.service';
import { StoreCartService } from '../../../service/store-cart.service';
import { StoreOrderService, StoreOrderPOST, StoreOrderItemPOST } from '../../../service/store-order.service';
import { MetadataService } from '../../../service/metadata.service';
import { StoreCustomerService } from '../../../service/store-customer.service';
import { TaxDTO, DiscountDTO } from '../../../models/interface';
import { AuthStateService } from '../../../service/auth-state.service';
import { HttpClient } from '@angular/common/http';
import { forkJoin, lastValueFrom, throwError, Observable, catchError, map } from 'rxjs';
import { isDevMode } from '@angular/core';
import { environment } from '../../../sharedComponent/service/environments/environment';

declare var PaystackPop: any;

// Updated User interface to match your AuthStateService
interface User {
  name: string;
  isGuest: boolean;
  email?: string;
  username?: string;
  upi?: {
    fullname?: string;
    email?: string;
    phoneNumber?: string;
  };
  phone?: string;
  preferences?: any;
  requiresVerification?: boolean;
}

@Component({
  selector: 'app-store-checkout',
  templateUrl: './store-checkout.component.html',
  styleUrls: ['./store-checkout.component.scss']
})
export class StoreCheckoutComponent implements OnInit, OnDestroy {
  // Cart data
  cartItems: Map<any, any> = new Map();
  subtotal: number = 0;
  totalDiscount: number = 0;
  discountBreakdown: any[] = [];
  totalItems: number = 0;
  
  // Delivery & payment
  isDelivery: boolean = false;
  deliveryFee: number = 0;
  paymentMethod: string = 'cash';
  isLoading: boolean = false;
  formErrors: string[] = [];
  
  // Tax & totals
  taxBreakdown: any[] = [];
  taxAmount: number = 0;
  
  // Branch & customer info
  branchInfo: any = null;
  customerName: string = '';
  customerEmail: string = '';
  customerPhone: string = '';
  
  // Delivery info
  deliveryInfo = {
    fullName: '',
    phoneNumber: '',
    address: '',
    email: '',
    instructions: ''
  };

  // Validation states
  phoneTouched: boolean = false;
  phoneError: string = '';

  // Payment methods
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

  // API configuration
  private apiBaseUrl: string;
  private currentBranchId: number = 1;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private imageCacheService: ImageCacheService,
    private cartService: StoreCartService,
    private location: Location,
    private storeOrderService: StoreOrderService,
    private authStateService: AuthStateService,
    private http: HttpClient,
    private storeCustomerService: StoreCustomerService,
    private metadataService: MetadataService
  ) {
    this.apiBaseUrl = this.getBaseApiUrl();
  }

  ngOnInit(): void {
    console.log('🔄 Checkout Component Initialized');
    this.initializeCheckout();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

  private async initializeCheckout(): Promise<void> {
    this.isLoading = true;
    try {
      this.metadataService.selectedBranchId$.subscribe((branchId) => {
        this.currentBranchId = branchId || 0
      console.log('🏛️ Checkout using Branch ID:', this.currentBranchId);})
      
      this.loadCartData();
      this.loadCustomerInfo();
      this.calculateAllCharges();
    } catch (error) {
      console.error('Error initializing checkout:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private loadCustomerInfo(): void {
    try {
      // Try session storage first
      const storedUser = sessionStorage.getItem('currentUser');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        this.customerName = userData.name || 'Guest';
        this.customerEmail = userData.email || 'guest@example.com';
        this.customerPhone = userData.phone || '';
        console.log('👤 Loaded customer from session:', userData);
      }
      
      // Try auth service
      const authUser = this.authStateService.getCurrentUser() as User;
      if (authUser && !authUser.isGuest) {
        // Fixed: Use safe navigation for upi property
        this.customerName = authUser.upi?.fullname || authUser.username || this.customerName;
        this.customerEmail = authUser.email || this.customerEmail;
        this.customerPhone = authUser.phone || this.customerPhone;
        console.log('👤 Loaded customer from auth:', authUser);
      }
      
      // Set delivery info with customer data
      this.deliveryInfo.fullName = this.customerName;
      this.deliveryInfo.email = this.customerEmail;
      this.deliveryInfo.phoneNumber = this.customerPhone;
      
    } catch (error) {
      console.warn('⚠️ Could not load customer info:', error);
    }
  }

  private loadCartData(): void {
    const cartData = this.cartService.getCart();
    this.cartItems = cartData.items;
    this.totalItems = cartData.totalItems;
    
    // Calculate gross subtotal from original prices
    let grossSubtotal = 0;
    this.cartItems.forEach(item => {
      grossSubtotal += (item.originalPrice || item.unitPrice) * item.quantity;
    });
    this.subtotal = grossSubtotal;
    
    console.log('🛒 Cart loaded (Gross):', {
      items: this.cartItems.size,
      subtotal: this.subtotal,
      totalItems: this.totalItems
    });
  }


  calculateDiscounts(): void {
    console.log('🎁 Populating discounts...');
    
    let totalDiscount = 0;
    const discountBreakdown: any[] = [];
    
    this.cartItems.forEach((item) => {
      const originalPrice = item.originalPrice || item.unitPrice;
      const discountedUnitPrice = item.unitPrice;
      const quantity = item.quantity;
      
      const itemDiscountAmount = (originalPrice - discountedUnitPrice) * quantity;
      
      if (itemDiscountAmount > 0) {
        totalDiscount += itemDiscountAmount;
        
        discountBreakdown.push({
          productName: item.product.name,
          discountAmount: Math.round(itemDiscountAmount * 100) / 100,
          quantity: quantity
        });
      }
    });
    
    this.totalDiscount = Math.round(totalDiscount * 100) / 100;
    this.discountBreakdown = discountBreakdown;
    
    console.log('✅ Discounts populated:', {
      totalDiscount: this.totalDiscount,
      breakdown: discountBreakdown
    });
  }

  calculateTaxes(): void {
    console.log('💰 Calculating taxes from net prices...');
    
    let taxBreakdown: any[] = [];
    let totalTax = 0;
    const taxGroups = new Map<number, { name: string; rate: number; taxableAmount: number }>();
    
    this.cartItems.forEach((item) => {
      const product = item.product;
      const quantity = item.quantity;
      // Tax is calculated on the net price (discounted price)
      const taxableAmountForItem = item.unitPrice * quantity;
      
      if (product.tax) {
        let taxRate = 0;
        let taxName = 'Tax';
        let taxId = 0;
        
        if (Array.isArray(product.tax) && product.tax.length > 0) {
          const taxObj = product.tax[0];
          taxRate = taxObj.rate || 0;
          taxName = taxObj.name || `Tax ${taxRate}%`;
          taxId = taxObj.id || 0;
        } else if (typeof product.tax === 'object' && 'rate' in product.tax) {
          taxRate = (product.tax as TaxDTO).rate || 0;
          taxName = (product.tax as TaxDTO).name || `Tax ${taxRate}%`;
          taxId = (product.tax as TaxDTO).id || 0;
        } else if (typeof product.tax === 'number') {
          taxRate = product.tax;
          taxName = `Tax ${taxRate}%`;
          taxId = product.id * 1000;
        }
        
        if (taxRate > 0 && taxableAmountForItem > 0) {
          if (!taxGroups.has(taxId)) {
            taxGroups.set(taxId, { name: taxName, rate: taxRate, taxableAmount: 0 });
          }
          const group = taxGroups.get(taxId)!;
          group.taxableAmount += taxableAmountForItem;
        }
      }
    });
    
    taxGroups.forEach((group, taxId) => {
      const taxAmt = (group.taxableAmount * group.rate) / 100;
      totalTax += taxAmt;
      taxBreakdown.push({
        taxId: taxId,
        name: group.name,
        rate: group.rate,
        taxableAmount: Math.round(group.taxableAmount * 100) / 100,
        taxAmount: Math.round(taxAmt * 100) / 100
      });
    });
    
    this.taxBreakdown = taxBreakdown;
    this.taxAmount = Math.round(totalTax * 100) / 100;
  }

  private calculateAllCharges(): void {
    this.calculateTaxes();
    this.calculateDiscounts();
    
    console.log('💰 All calculations complete:', {
      subtotal: this.subtotal,
      totalDiscount: this.totalDiscount,
      taxAmount: this.taxAmount,
      deliveryFee: this.deliveryFee
    });
  }

  get total(): number {
    const calculatedTotal = this.subtotal - this.totalDiscount + this.taxAmount + (this.isDelivery ? this.deliveryFee : 0);
    const finalTotal = Math.max(0, Math.round(calculatedTotal * 100) / 100);
    return finalTotal;
  }

  toggleDelivery(isDelivery: boolean): void {
    this.isDelivery = isDelivery;
    this.formErrors = [];

    if (!isDelivery) {
      this.deliveryInfo.address = '';
    }
  }

  validateForm(): boolean {
    this.formErrors = [];

    if (this.cartItems.size === 0) {
      this.formErrors.push('Your cart is empty. Please add items before placing an order.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    if (this.isDelivery) {
      if (!this.deliveryInfo.fullName?.trim()) {
        this.formErrors.push('Full name is required for delivery');
      }
      
      if (!this.deliveryInfo.phoneNumber?.trim()) {
        const err = 'Phone number is required for delivery';
        this.formErrors.push(err);
        this.phoneError = err;
      } else if (!/^[0-9+\-\s()]{10,}$/.test(this.deliveryInfo.phoneNumber)) {
        const err = 'Please enter a valid phone number';
        this.formErrors.push(err);
        this.phoneError = err;
      } else {
        this.phoneError = '';
      }
      
      if (!this.deliveryInfo.address?.trim()) {
        this.formErrors.push('Delivery address is required');
      }
    } else {
      // For pickup, we still want to validate phone if it's provided or required
      if (this.deliveryInfo.phoneNumber && !/^[0-9+\-\s()]{10,}$/.test(this.deliveryInfo.phoneNumber)) {
        this.phoneError = 'Please enter a valid phone number';
      } else {
        this.phoneError = '';
      }
    }

    if (!this.paymentMethod) {
      this.formErrors.push('Please select a payment method');
    }

    return this.formErrors.length === 0;
  }

  get savingsSummary(): string {
    if (this.totalDiscount <= 0) return '';
    
    const discountPercentage = (this.totalDiscount / this.subtotal) * 100;
    return `You saved ₦${this.totalDiscount.toLocaleString('en-NG')} (${discountPercentage.toFixed(1)}%)`;
  }

  canPlaceOrder(): boolean {
    if (this.isLoading) return false;
    return this.validateForm();
  }

  async placeOrder(): Promise<void> {
    this.phoneTouched = true;
    if (!this.canPlaceOrder()) return;

    this.isLoading = true;
    this.formErrors = [];

    // 1. Recipient Info (From the Form - used for Delivery and Receipts)
    const recipientInfo = {
      name: this.deliveryInfo.fullName || this.customerName || 'Guest Customer',
      email: this.deliveryInfo.email || this.customerEmail || 'customer@example.com',
      phoneNumber: this.deliveryInfo.phoneNumber || this.customerPhone
    };

    // 2. Payer Info (From the Auth Profile - used for Account/Transaction linking)
    const currentUser = this.authStateService.getCurrentUser() as any;
    const isGuest = !currentUser || currentUser.isGuest;
    
    // If logged in, we strictly use their profile details for the Payer record
    const payerInfo = isGuest ? recipientInfo : {
      name: currentUser.upi?.fullname || currentUser.username || recipientInfo.name,
      email: currentUser.email || recipientInfo.email,
      phoneNumber: currentUser.phone || recipientInfo.phoneNumber
    };

    // Use the specific POS ID if available, otherwise pass 0 to force resolution/creation
    const customerId = (!isGuest && currentUser.posCustomerId) ? currentUser.posCustomerId : 0;

    console.log('📦 Ordering initiated:', { 
      isGuest, 
      payer: payerInfo, 
      recipient: recipientInfo 
    });

    try {
      const orderData = this.prepareOrderData(customerId);
      
      if (this.paymentMethod === 'card') {
        await this.handlePaystackPayment(orderData, payerInfo);
      } else {
        await this.handleCashPayment(orderData, payerInfo);
      }
    } catch (error) {
      this.isLoading = false;
      console.error('❌ Order placement initiation failed:', error);
      this.handleOrderError(error);
    }
  }

  private async handlePaystackPayment(orderData: any, customerInfo: any): Promise<void> {
    const customerEmail = this.deliveryInfo.email || this.customerEmail || 'customer@example.com';
    const amount = this.total * 100; // Paystack expects amount in kobo

    console.log('💳 Initiating Paystack payment...', { 
      email: customerEmail, 
      amount: amount,
      orderNumber: orderData.orderNumber 
    });

    this.storeOrderService.processPaystackPayment(
      customerEmail,
      amount,
      orderData.orderNumber,
      this.currentBranchId
    ).subscribe({
      next: (paystackResponse: any) => {
        console.log('✅ Paystack payment successful:', paystackResponse);
        
        const paidOrderData = {
          ...orderData,
          orderStatus: 'PAID'
        };
        
        // Check if createOrderWithPayment accepts deliveryInfo
        // If it does, pass it; otherwise, embed it in orderData
        this.storeOrderService.createOrderWithPayment(
          paidOrderData,
          'card',
          paystackResponse.reference,
          this.isDelivery ? this.deliveryInfo : undefined,
          customerInfo
        ).subscribe({
          next: (orderResponse: any) => {
            console.log('✅ Order created after payment:', orderResponse);
            this.navigateToConfirmation(orderResponse);
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
  private async handleCashPayment(orderData: any, customerInfo: any): Promise<void> {
    console.log('💵 Processing cash/transfer payment...');
    
    this.storeOrderService.createCashOrder(
      orderData,
      this.isDelivery ? this.deliveryInfo : undefined,
      customerInfo
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Order placed successfully:', response);
        this.navigateToConfirmation(response);
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('❌ Order placement failed:', error);
        this.handleOrderError(error);
      }
    });
  }

  private prepareOrderData(customerId: number): any {
    const orderItems: StoreOrderItemPOST[] = Array.from(this.cartItems.entries()).map(
      ([key, value]) => {
        const hasValidVariant = value.selectedVariants?.[0]?.id && value.selectedVariants[0].id > 0;
        const sellingPrice = value.product.sellingPrice || 0;
        const itemTotal = sellingPrice * value.quantity;
        
        return {
          id: 0,
          totalPrice: Math.round(itemTotal * 100) / 100,
          quantity: Number(value.quantity),
          productId: Number(value.product.id),
          productVariantId: hasValidVariant ? Number(value.selectedVariants[0].id) : null,
          orderId: null
        };
      }
    );

    const totalQuantity = orderItems.reduce((total, item) => total + item.quantity, 0);
    
    // Use customer info
    const customerEmail = this.deliveryInfo.email || this.customerEmail || 'customer@example.com';
    const customerName = this.deliveryInfo.fullName || this.customerName || 'Guest Customer';
    
    const now = new Date();
    const readyTime = new Date(now);
    readyTime.setMinutes(readyTime.getMinutes() + 30);
    
    const deliveryTime = new Date(now);
    if (this.isDelivery) {
      deliveryTime.setMinutes(deliveryTime.getMinutes() + 60);
    } else {
      deliveryTime.setMinutes(deliveryTime.getMinutes() + 30);
    }

    const orderNumber = this.generateOrderNumber();
    
    // Calculate final total
    const totalAmount = this.total;

    console.log('💰 Preparing order data:', {
      orderNumber,
      totalAmount,
      totalQuantity,
      customerName,
      customerEmail,
      isDelivery: this.isDelivery,
      deliveryFee: this.deliveryFee,
      totalDiscount: this.totalDiscount,
      taxAmount: this.taxAmount
    });

    const orderData: any = {
      id: 0,
      orderNumber: orderNumber,
      orderStatus: 'PENDING',
      updatedAt: now.toISOString(),
      createdDate: now.toISOString(),
      amountTendered: 0,
      isOnline: true,
      totalAmount: totalAmount.toFixed(2),
      quantity: totalQuantity,
      customerId: customerId,
      branchId: this.currentBranchId,
      discountId: null,
      paymentId: null,
      cashierId: null,
      orderItem: orderItems,
      deliveryFee: this.isDelivery ? Number(this.deliveryFee) : 0,
      estimatedReadyTime: readyTime.toISOString(),
      estimatedDeliveryTime: deliveryTime.toISOString(),
      customerEmail: customerEmail,
      deliveryInfoId: null,
      deliverTypeId: this.isDelivery ? 1 : null,
      deliveryTypeId: this.isDelivery ? 1 : null,
      deliveryStatus: 'PENDING'
    };

    return orderData;
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

  private navigateToConfirmation(orderResponse: any): void {
    this.isLoading = false;
    
    // Clear cart
    this.cartService.clearCart();
    
    const currentUuid = this.route.snapshot.paramMap.get('uuid');
    const backendOrderId = orderResponse.id || orderResponse;

    console.log('🚀 Navigating to confirmation...', { 
      backendOrderId, 
      orderResponse
    });

    // Build full order data
    const customerName = this.deliveryInfo.fullName || this.customerName || 'Guest Customer';
    const customerEmail = this.deliveryInfo.email || this.customerEmail || 'customer@example.com';
    
    let fullOrderData;
    if (typeof orderResponse === 'number') {
      fullOrderData = {
        id: orderResponse,
        orderNumber: this.generateOrderNumber(),
        orderStatus: 'PENDING',
        status: 'PENDING',
        createdDate: new Date().toISOString(),
        orderDate: new Date().toISOString(),
        totalAmount: this.total,
        total: this.total,
        subtotal: this.subtotal,
        totalDiscount: this.totalDiscount,
        discountBreakdown: this.discountBreakdown,
        taxAmount: this.taxAmount,
        taxBreakdown: this.taxBreakdown,
        deliveryFee: this.isDelivery ? this.deliveryFee : 0,
        deliveryMethod: this.isDelivery ? 'delivery' : 'pickup',
        deliveryInfo: this.isDelivery ? this.deliveryInfo : null,
        items: Array.from(this.cartItems.values()),
        orderItem: Array.from(this.cartItems.values()),
        paymentMethod: this.paymentMethod,
        customerName: customerName,
        customerEmail: customerEmail,
        branchInfo: this.branchInfo
      };
    } else {
      fullOrderData = {
        ...orderResponse,
        subtotal: this.subtotal,
        totalDiscount: this.totalDiscount,
        discountBreakdown: this.discountBreakdown,
        taxAmount: this.taxAmount,
        taxBreakdown: this.taxBreakdown,
        deliveryFee: this.isDelivery ? this.deliveryFee : 0,
        deliveryMethod: this.isDelivery ? 'delivery' : 'pickup',
        deliveryInfo: this.isDelivery ? this.deliveryInfo : null,
        items: Array.from(this.cartItems.values()),
        orderItem: Array.from(this.cartItems.values()),
        paymentMethod: this.paymentMethod,
        customerName: customerName,
        customerEmail: customerEmail,
        branchInfo: this.branchInfo
      };
    }

    // Store in localStorage for confirmation page
    localStorage.setItem('lastOrder', JSON.stringify(fullOrderData));
    console.log('💾 Saved order data for confirmation');

    // Navigate to confirmation
    this.router.navigate(
      ['optimerce', currentUuid, 'order-confirmation', backendOrderId],
      {
        state: {
          orderData: fullOrderData,
          backendOrderId: backendOrderId
        },
        replaceUrl: true
      }
    );
  }

  private handleOrderError(error: any): void {
    console.error('🔍 Detailed error analysis:', error);

    let errorMessage = 'Failed to place order. Please try again.';

    if (error.status === 400) {
      errorMessage = 'Invalid order data. Please check your information and try again.';
    } else if (error.status === 401) {
      errorMessage = 'Authentication failed. Please refresh the page and try again.';
    } else if (error.status === 500) {
      errorMessage = 'Server error. Please try again in a few minutes.';
    }

    this.formErrors = [errorMessage];
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Template helper methods
  hasItemDiscount(product: any): boolean {
    return !!(product?.discount?.value && product.discount.value > 0);
  }

  getItemDiscountPercentage(product: any): number {
    if (!product?.discount?.value) return 0;
    const discount = product.discount;
    const discountType = discount.discountType?.name || discount.discountType || 'PERCENTAGE';
    
    if (discountType === 'PERCENTAGE') {
      return discount.value;
    } else if (discountType === 'FIXED_AMOUNT' || discountType === 'AMOUNT') {
      const sellingPrice = product.sellingPrice || 0;
      return Math.round((discount.value / sellingPrice) * 100);
    }
    
    return discount.value;
  }


  getProductImage(product: any) {
    return this.imageCacheService.getProductImage(product);
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
    this.location.back();
  }
}
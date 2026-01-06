import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ImageCacheService } from '../../../service/image-cache.service';
import { StoreCartService } from '../../../service/store-cart.service';
import { StoreOrderService, StoreOrderPOST, StoreOrderItemPOST } from '../../../service/store-order.service';
import { TaxDTO, DiscountDTO } from '../../../models/interface';
import { AuthStateService } from '../../../service/auth-state.service';
import { HttpClient } from '@angular/common/http';
import { forkJoin, lastValueFrom, throwError, Observable, catchError, map } from 'rxjs';
import { isDevMode } from '@angular/core';
import { environment } from '../../../sharedComponent/service/environments/environment';

interface GeolocationCoordinates {
  lat: number;
  lng: number;
}

interface DeliveryConfig {
  id: number;
  baseFee: number;
  perKmRate: number;
  maxFee: number;
  minFee: number;
  expressFee: number;
  estimatedDays: number;
  sameDayDeliveryCutoffTime: string;
  createdAt: string;
  updatedAt: string;
  branchId: number;
  estimatedDaysType: string;
  logisticsPartnerId: number;
  isActive: boolean;
}

interface BranchInfo {
  id: number;
  name: string;
  description: string;
  address: string;
  phoneNo: number;
  whatsappPhoneNumber: string;
  longitude: string;
  latitude: string;
}

interface GeocodingResponse {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

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
  isCalculatingDelivery: boolean = false;
  formErrors: string[] = [];
  
  // Tax & totals
  taxBreakdown: any[] = [];
  taxAmount: number = 0;
  
  // Geolocation
  branchCoordinates: GeolocationCoordinates | null = null;
  customerCoordinates: GeolocationCoordinates | null = null;
  calculatedDistance: number | null = null;
  deliveryConfig: DeliveryConfig | null = null;
  
  // Branch & customer info
  branchInfo: BranchInfo | null = null;
  showLocationPicker: boolean = false;
  customerName: string = '';
  customerEmail: string = '';
  customerPhone: string = '';
  
  // Delivery info
  deliveryInfo = {
    fullName: '',
    phoneNumber: '',
    address: '',
    email: '',
    instructions: '',
    coordinates: null as GeolocationCoordinates | null
  };

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
  private readonly LOCATIONIQ_API_KEY = 'pk.cfb14b234e3e72743ea1aa24a1104fc0';
  private apiBaseUrl: string;
  private currentBranchId: number = 1; // Default branch ID, you can get this from your metadata service

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private imageCacheService: ImageCacheService,
    private cartService: StoreCartService,
    private location: Location,
    private storeOrderService: StoreOrderService,
    private authStateService: AuthStateService,
    private http: HttpClient
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
    try {
      // Load customer info from auth/session
      this.loadCustomerInfo();
      
      // Load cart data
      this.loadCartData();
      
      // Load branch info and delivery config from API
      await this.loadBranchAndDeliveryConfig();
      
      // Calculate all charges
      this.calculateAllCharges();
      
      console.log('✅ Checkout initialization complete');
    } catch (error) {
      console.error('❌ Failed to initialize checkout:', error);
      this.formErrors.push('Failed to load checkout data. Please refresh the page.');
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
    this.subtotal = cartData.subtotal;
    this.totalItems = cartData.totalItems;
    
    console.log('🛒 Cart loaded:', {
      items: this.cartItems.size,
      subtotal: this.subtotal,
      totalItems: this.totalItems
    });
  }

  private async loadBranchAndDeliveryConfig(): Promise<void> {
    try {
      // Fetch branch details
      const branchUrl = `${this.apiBaseUrl}/x/api/v2/pos/branches/${this.currentBranchId}`;
      this.branchInfo = await lastValueFrom(
        this.http.get<BranchInfo>(branchUrl).pipe(
          catchError(error => {
            console.error('❌ Failed to load branch info:', error);
            return throwError(() => new Error('Could not load store information'));
          })
        )
      );
      
      if (this.branchInfo) {
        // Parse coordinates
        this.branchCoordinates = {
          lat: parseFloat(this.branchInfo.latitude),
          lng: parseFloat(this.branchInfo.longitude)
        };
        
        console.log('🏪 Branch loaded:', {
          name: this.branchInfo.name,
          coordinates: this.branchCoordinates
        });
        
        // Try to fetch delivery configuration for this branch
        try {
          const deliveryUrl = `${this.apiBaseUrl}/x/api/v2/pos/deliveryTypes/${this.currentBranchId}`;
          this.deliveryConfig = await lastValueFrom(
            this.http.get<DeliveryConfig>(deliveryUrl).pipe(
              catchError(error => {
                console.warn('⚠️ No delivery config found, using defaults:', error);
                return throwError(() => new Error('Using default delivery settings'));
              })
            )
          );
          
          if (this.deliveryConfig) {
            console.log('🚚 Delivery config loaded:', this.deliveryConfig);
          }
        } catch (deliveryError) {
          // Use default delivery config if not available
          this.deliveryConfig = this.getDefaultDeliveryConfig();
          console.log('⚙️ Using default delivery config:', this.deliveryConfig);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load branch/delivery config:', error);
      this.formErrors.push('Could not load delivery information. Please try again later.');
      
      // Set default coordinates (Abuja center) as fallback
      this.branchCoordinates = { lat: 9.0765, lng: 7.3986 };
      this.deliveryConfig = this.getDefaultDeliveryConfig();
    }
  }

  private getDefaultDeliveryConfig(): DeliveryConfig {
    return {
      id: 0,
      baseFee: 1000,
      perKmRate: 200,
      maxFee: 5000,
      minFee: 500,
      expressFee: 2000,
      estimatedDays: 1,
      sameDayDeliveryCutoffTime: '18:30',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      branchId: this.currentBranchId,
      estimatedDaysType: 'DAYS',
      logisticsPartnerId: 0,
      isActive: true
    };
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

  calculateDiscounts(): void {
    console.log('🎁 Calculating discounts...');
    
    let totalDiscount = 0;
    const discountBreakdown: any[] = [];
    
    this.cartItems.forEach((item, key) => {
      const product = item.product;
      const quantity = item.quantity;
      
      if (product.discount && this.isDiscountActive(product.discount)) {
        const discountInfo = this.calculateItemDiscount(product, quantity);
        
        if (discountInfo.amount > 0) {
          totalDiscount += discountInfo.amount;
          
          discountBreakdown.push({
            productName: product.name,
            discountName: product.discount.name || 'Discount',
            discountType: product.discount.discountType?.name || 'PERCENTAGE',
            discountPercentage: discountInfo.percentage,
            discountAmount: discountInfo.amount,
            quantity: quantity
          });
        }
      }
    });
    
    this.totalDiscount = Math.round(totalDiscount * 100) / 100; // Round to 2 decimal places
    this.discountBreakdown = discountBreakdown;
    
    console.log('✅ Discounts calculated:', {
      totalDiscount: this.totalDiscount,
      breakdown: discountBreakdown
    });
  }

  private isDiscountActive(discount: DiscountDTO): boolean {
    if (!discount || discount.active === false) return false;
    
    // Check if discount has a valid value
    if (!discount.value || discount.value <= 0) return false;
    
    // Check dates if available
    if (discount.startDate && discount.endDate) {
      const now = new Date();
      const startDate = new Date(discount.startDate);
      const endDate = new Date(discount.endDate);
      
      if (now < startDate || now > endDate) {
        return false;
      }
    }
    
    return true;
  }

  private calculateItemDiscount(product: any, quantity: number): { amount: number; percentage: number } {
    const discount = product.discount;
    const sellingPrice = product.sellingPrice || 0;
    const itemTotal = sellingPrice * quantity;
    
    if (!discount || !discount.value) return { amount: 0, percentage: 0 };
    
    const discountType = discount.discountType?.name || discount.discountType || 'PERCENTAGE';
    
    if (discountType === 'PERCENTAGE') {
      const discountAmount = (itemTotal * discount.value) / 100;
      return { 
        amount: Math.round(discountAmount * 100) / 100, 
        percentage: discount.value 
      };
    } 
    else if (discountType === 'FIXED_AMOUNT' || discountType === 'AMOUNT') {
      const discountAmount = discount.value * quantity;
      const percentage = (discountAmount / itemTotal) * 100;
      return { 
        amount: Math.round(discountAmount * 100) / 100, 
        percentage: Math.round(percentage * 100) / 100 
      };
    }
    
    // Default to percentage
    const discountAmount = (itemTotal * discount.value) / 100;
    return { 
      amount: Math.round(discountAmount * 100) / 100, 
      percentage: discount.value 
    };
  }

  calculateTaxes(): void {
    console.log('💰 Calculating taxes...');
    
    let taxBreakdown: any[] = [];
    let totalTax = 0;
    const taxGroups = new Map<number, { name: string; rate: number; taxableAmount: number }>();
    
    this.cartItems.forEach((item, key) => {
      const product = item.product;
      const quantity = item.quantity;
      const sellingPrice = product.sellingPrice || 0;
      const itemTotal = sellingPrice * quantity;
      
      // Apply discount to taxable amount if product has discount
      let taxableAmount = itemTotal;
      if (product.discount && this.isDiscountActive(product.discount)) {
        const discountInfo = this.calculateItemDiscount(product, quantity);
        taxableAmount -= discountInfo.amount;
      }
      
      if (product.tax) {
        let taxRate = 0;
        let taxName = 'Tax';
        let taxId = 0;
        
        // Handle tax array
        if (Array.isArray(product.tax)) {
          if (product.tax.length > 0) {
            const taxObj = product.tax[0];
            taxRate = taxObj.rate || 0;
            taxName = taxObj.name || `Tax ${taxRate}%`;
            taxId = taxObj.id || 0;
          }
        }
        // Handle single tax object
        else if (typeof product.tax === 'object' && 'rate' in product.tax) {
          taxRate = (product.tax as TaxDTO).rate || 0;
          taxName = (product.tax as TaxDTO).name || `Tax ${taxRate}%`;
          taxId = (product.tax as TaxDTO).id || 0;
        }
        // Handle legacy number tax
        else if (typeof product.tax === 'number') {
          taxRate = product.tax;
          taxName = `Tax ${taxRate}%`;
          taxId = product.id * 1000;
        }
        
        if (taxRate > 0 && taxableAmount > 0) {
          if (!taxGroups.has(taxId)) {
            taxGroups.set(taxId, { name: taxName, rate: taxRate, taxableAmount: 0 });
          }
          
          const group = taxGroups.get(taxId)!;
          group.taxableAmount += taxableAmount;
        }
      }
    });
    
    // Calculate tax amounts for each group
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
    
    console.log('✅ Taxes calculated:', {
      taxAmount: this.taxAmount,
      breakdown: taxBreakdown
    });
  }

  async calculateDeliveryFee(): Promise<void> {
    if (!this.isDelivery || !this.deliveryInfo.coordinates || !this.branchCoordinates) {
      this.deliveryFee = 0;
      return;
    }
    
    this.isCalculatingDelivery = true;
    
    try {
      // Calculate distance using Haversine formula
      this.calculatedDistance = this.calculateDistance(
        this.branchCoordinates.lat,
        this.branchCoordinates.lng,
        this.deliveryInfo.coordinates.lat,
        this.deliveryInfo.coordinates.lng
      );
      
      console.log('📍 Distance calculated:', {
        distance: this.calculatedDistance,
        branch: this.branchCoordinates,
        customer: this.deliveryInfo.coordinates
      });
      
      // Calculate delivery fee based on config
      if (this.deliveryConfig) {
        this.deliveryFee = this.calculateFeeFromDistance(
          this.calculatedDistance,
          this.deliveryConfig
        );
      } else {
        // Fallback calculation
        this.deliveryFee = 1000 + Math.max(0, (this.calculatedDistance - 5) * 200);
      }
      
      // Round to nearest 50
      this.deliveryFee = Math.ceil(this.deliveryFee / 50) * 50;
      
      console.log('🚚 Delivery fee calculated:', {
        distance: this.calculatedDistance,
        baseFee: this.deliveryConfig?.baseFee || 1000,
        perKmRate: this.deliveryConfig?.perKmRate || 200,
        finalFee: this.deliveryFee
      });
      
    } catch (error) {
      console.error('❌ Error calculating delivery fee:', error);
      this.deliveryFee = this.deliveryConfig?.baseFee || 1500;
    } finally {
      this.isCalculatingDelivery = false;
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateFeeFromDistance(distance: number, config: DeliveryConfig): number {
    const baseFee = config.baseFee || 1000;
    const perKmRate = config.perKmRate || 200;
    const freeDistance = 2; // Free within 2km (configurable)
    
    if (distance <= freeDistance) {
      return config.minFee || 0;
    }
    
    const chargeableDistance = distance - freeDistance;
    const distanceFee = chargeableDistance * perKmRate;
    let totalFee = baseFee + distanceFee;
    
    // Apply minimum and maximum fee limits
    if (config.minFee && totalFee < config.minFee) {
      totalFee = config.minFee;
    }
    if (config.maxFee && totalFee > config.maxFee) {
      totalFee = config.maxFee;
    }
    
    return totalFee;
  }

  get total(): number {
    const calculatedTotal = this.subtotal - this.totalDiscount + this.taxAmount + (this.isDelivery ? this.deliveryFee : 0);
    const finalTotal = Math.max(0, Math.round(calculatedTotal * 100) / 100);
    return finalTotal;
  }

  toggleDelivery(isDelivery: boolean): void {
    this.isDelivery = isDelivery;
    this.formErrors = [];

    if (isDelivery) {
      // Try to get user's location automatically
      this.getUserLocation();
    } else {
      this.deliveryInfo.address = '';
      this.deliveryInfo.coordinates = null;
      this.calculatedDistance = null;
      this.deliveryFee = 0;
    }
  }

  async getUserLocation(): Promise<void> {
    if (!navigator.geolocation) {
      console.warn('⚠️ Geolocation is not supported by browser');
      this.showLocationPicker = true;
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      this.deliveryInfo.coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      // Reverse geocode to get address
      await this.reverseGeocode(this.deliveryInfo.coordinates);
      
      // Calculate delivery fee
      await this.calculateDeliveryFee();
      
      console.log('📍 User location acquired:', {
        coordinates: this.deliveryInfo.coordinates,
        address: this.deliveryInfo.address
      });
      
    } catch (error) {
      console.warn('⚠️ Could not get user location:', error);
      this.showLocationPicker = true;
    }
  }

  async onLocationSelected(location: { lat: number; lng: number; address?: string }): Promise<void> {
    if (!location) return;
    
    this.deliveryInfo.coordinates = {
      lat: location.lat,
      lng: location.lng
    };
    
    if (location.address) {
      this.deliveryInfo.address = location.address;
    }
    
    this.showLocationPicker = false;
    
    // Calculate delivery fee for new location
    await this.calculateDeliveryFee();
  }

  async geocodeAddress(): Promise<void> {
    if (!this.deliveryInfo.address || this.deliveryInfo.address.trim().length < 5) {
      return;
    }

    this.isCalculatingDelivery = true;
    
    try {
      // Use LocationIQ geocoding service
      const url = `https://us1.locationiq.com/v1/search?key=${this.LOCATIONIQ_API_KEY}&q=${encodeURIComponent(this.deliveryInfo.address)}&format=json&countrycodes=ng&limit=1`;
      
      const response = await lastValueFrom(
        this.http.get<GeocodingResponse[]>(url).pipe(
          catchError(error => {
            console.error('❌ Geocoding failed:', error);
            return throwError(() => new Error('Could not find this address. Please check and try again.'));
          })
        )
      );
      
      if (response && response[0]) {
        this.deliveryInfo.coordinates = {
          lat: parseFloat(response[0].lat),
          lng: parseFloat(response[0].lon)
        };
        
        // Update address with formatted version
        if (!this.deliveryInfo.address.includes(response[0].display_name)) {
          this.deliveryInfo.address = response[0].display_name;
        }
        
        await this.calculateDeliveryFee();
        
        console.log('📍 Address geocoded:', {
          address: this.deliveryInfo.address,
          coordinates: this.deliveryInfo.coordinates
        });
      }
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      this.formErrors.push('Could not find this address. Please check and try again.');
    } finally {
      this.isCalculatingDelivery = false;
    }
  }

  async reverseGeocode(coordinates: GeolocationCoordinates): Promise<void> {
    try {
      const url = `https://us1.locationiq.com/v1/reverse?key=${this.LOCATIONIQ_API_KEY}&lat=${coordinates.lat}&lon=${coordinates.lng}&format=json`;
      
      const response = await lastValueFrom(
        this.http.get<GeocodingResponse>(url).pipe(
          catchError(error => {
            console.warn('⚠️ Reverse geocoding failed:', error);
            return throwError(() => new Error('Could not get address from coordinates'));
          })
        )
      );
      
      if (response && response.display_name) {
        this.deliveryInfo.address = response.display_name;
      }
    } catch (error) {
      console.warn('⚠️ Could not reverse geocode:', error);
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
      if (!this.deliveryInfo.coordinates) {
        this.formErrors.push('Please select a delivery location to calculate delivery fee.');
        return false;
      }
      
      if (!this.deliveryInfo.fullName?.trim()) {
        this.formErrors.push('Full name is required for delivery');
      }
      
      if (!this.deliveryInfo.phoneNumber?.trim()) {
        this.formErrors.push('Phone number is required for delivery');
      } else if (!/^[0-9+\-\s()]{10,}$/.test(this.deliveryInfo.phoneNumber)) {
        this.formErrors.push('Please enter a valid phone number');
      }
      
      if (!this.deliveryInfo.address?.trim()) {
        this.formErrors.push('Delivery address is required');
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
    if (this.isLoading || this.isCalculatingDelivery) return false;
    return this.validateForm();
  }

  async placeOrder(): Promise<void> {
    if (!this.canPlaceOrder()) return;

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
      console.error('❌ Order placement failed:', error);
      this.handleOrderError(error);
    }
  }

  private async handlePaystackPayment(orderData: any): Promise<void> {
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
      orderData.orderNumber
    ).subscribe({
      next: (paystackResponse: any) => {
        console.log('✅ Paystack payment successful:', paystackResponse);
        
        const paidOrderData = {
          ...orderData,
          orderStatus: 'PAID'
        };
        
        this.storeOrderService.createOrderWithPayment(
          paidOrderData,
          'card',
          paystackResponse.reference,
          this.isDelivery ? this.deliveryInfo : undefined
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

  private async handleCashPayment(orderData: any): Promise<void> {
    console.log('💵 Processing cash/transfer payment...');
    
    this.storeOrderService.createCashOrder(
      orderData,
      this.cartItems,
      this.isDelivery ? this.deliveryInfo : undefined
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

  private prepareOrderData(): any {
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
      customerId: 1, // Guest customer ID
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
        deliveryDistance: this.calculatedDistance,
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
        deliveryDistance: this.calculatedDistance,
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
      ['user/checkout/store', currentUuid, 'order-confirmation', backendOrderId],
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

  getDiscountedPrice(product: any, variant?: any): number {
    const sellingPrice = product.sellingPrice || 0;
    const discount = product.discount;
    
    if (!discount || !discount.value) return sellingPrice;
    
    const discountType = discount.discountType?.name || discount.discountType || 'PERCENTAGE';
    
    if (discountType === 'PERCENTAGE') {
      return sellingPrice * (1 - discount.value / 100);
    } 
    else if (discountType === 'FIXED_AMOUNT' || discountType === 'AMOUNT') {
      return Math.max(0, sellingPrice - discount.value);
    }
    
    return sellingPrice;
  }

  getProductImage(product: any) {
    return this.imageCacheService.getProductImage(product);
  }

  openLocationPicker(): void {
    this.showLocationPicker = true;
  }

  closeLocationPicker(): void {
    this.showLocationPicker = false;
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
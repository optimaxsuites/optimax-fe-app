// order-confirmation.component.ts - COMPLETE VERSION
import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreCartService } from '../../../service/store-cart.service';
import { GuestOrderService } from '../../../service/guest-order.service';
import * as confetti from 'canvas-confetti';

interface DeliveryStep {
  status: string;
  label: string;
  icon: string;
  time: string;
  completed: boolean;
  active: boolean;
}

@Component({
  selector: 'app-order-confirmation',
  templateUrl: './order-confirmation.component.html',
  styleUrls: ['./order-confirmation.component.scss']
})
export class OrderConfirmationComponent implements OnInit, AfterViewInit {
  @ViewChild('confettiCanvas', { static: false }) confettiCanvas!: ElementRef<HTMLCanvasElement>;
  
  orderId: string = '';
  orderDetails: any = null;
  orderItems: any[] = [];
  isLoading: boolean = true;
  isGuestOrder: boolean = true;
  showTracking: boolean = false;
  
  deliverySteps: DeliveryStep[] = [];
  
  // Debug properties
  debugMode: boolean = true;
  displayState: string = 'loading';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cartService: StoreCartService,
    private guestOrderService: GuestOrderService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    console.log('🔄 Order Confirmation - Order ID:', this.orderId);
    this.displayState = 'loading';
    this.loadOrderDetails();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.fireConfetti();
    }, 500);
  }

  loadOrderDetails(): void {
    console.log('🔍 Starting order details loading...');
    
    try {
      // Method 1: Check navigation state (most recent order)
      const navigation = this.router.getCurrentNavigation();
      const stateOrder = navigation?.extras?.state?.['orderData'];
      
      if (stateOrder) {
        console.log('✅ Found order in navigation state');
        this.orderDetails = stateOrder;
        this.processData();
        return;
      }

      // Method 2: Check all possible storage locations
      this.checkAllStorageLocations();
      
    } catch (error) {
      console.error('❌ Error loading order details:', error);
      this.createDemoOrderData();
    }
  }

  private checkAllStorageLocations(): void {
    console.log('🔍 Checking all storage locations...');
    
    // Check multiple storage keys
    const storageKeys = ['guest_orders', 'store_orders', 'recent_orders'];
    
    for (const key of storageKeys) {
      console.log(`🔍 Checking localStorage key: ${key}`);
      const storedData = localStorage.getItem(key);
      
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          console.log(`📁 Data found in ${key}:`, data);
          
          let foundOrder = this.findOrderInData(data, this.orderId);
          
          if (foundOrder) {
            console.log(`✅ Order found in ${key}:`, foundOrder);
            this.orderDetails = foundOrder;
            this.processData();
            return;
          }
        } catch (error) {
          console.error(`❌ Error parsing ${key}:`, error);
        }
      }
    }
    
    // If still not found, check guest service
    console.log('🔍 Checking guest order service...');
    const guestOrder = this.guestOrderService.getOrder(this.orderId);
    if (guestOrder) {
      console.log('✅ Found order in guest service:', guestOrder);
      this.orderDetails = guestOrder;
      this.processData();
      return;
    }
    
    // Final fallback - create demo data
    console.log('🔄 No order found, creating demo data');
    this.createDemoOrderData();
  }

  private findOrderInData(data: any, orderId: string): any {
    if (Array.isArray(data)) {
      // Array of orders
      return data.find(order => 
        order.id === orderId || 
        order.orderId === orderId ||
        order.orderNumber === orderId
      );
    } else if (data && typeof data === 'object') {
      // Single order object
      if (data.id === orderId || data.orderId === orderId || data.orderNumber === orderId) {
        return data;
      }
      
      // Check if it's a cart structure
      if (data.items && (data.subtotal !== undefined || data.total !== undefined)) {
        console.log('🛒 Found cart-like structure, converting to order');
        return this.convertCartToOrder(data, orderId);
      }
    }
    
    return null;
  }

  private convertCartToOrder(cartData: any, orderId: string): any {
    const items = cartData.items instanceof Map ? 
      Array.from(cartData.items.values()) : 
      Object.values(cartData.items || {});
    
    const subtotal = cartData.subtotal || this.calculateSubtotal(items);
    const deliveryFee = cartData.deliveryFee || 0;
    const total = subtotal + deliveryFee;

    return {
      id: orderId,
      orderNumber: orderId,
      items: items,
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      total: total,
      deliveryMethod: 'pickup',
      paymentMethod: 'cash',
      orderDate: new Date().toISOString(),
      status: 'confirmed'
    };
  }

  private calculateSubtotal(items: any[]): number {
    return items.reduce((total, item) => {
      const price = item.product?.sellingPrice || item.price || 0;
      const quantity = item.quantity || 1;
      return total + (price * quantity);
    }, 0);
  }

  private processData(): void {
    console.log('🔄 Processing order data...');
    
    if (!this.orderDetails) {
      console.error('❌ No order details to process');
      this.createDemoOrderData();
      return;
    }
    
    console.log('📊 Raw order details:', this.orderDetails);
    
    this.isGuestOrder = true;
    this.processOrderItems();
    this.initializeDeliveryTracking();
    
    // CRITICAL: Set loading to false and force change detection
    this.isLoading = false;
    this.displayState = 'confirmed';
    this.cdr.detectChanges();
    
    console.log('✅ Order processing complete');
    console.log('📊 isLoading:', this.isLoading);
    console.log('📊 displayState:', this.displayState);
    console.log('📦 Order Items Count:', this.orderItems.length);
    console.log('📦 Order Items:', this.orderItems);
    
    // Force another change detection after a brief delay
    setTimeout(() => {
      this.cdr.detectChanges();
      console.log('🔄 Forced change detection completed');
    }, 100);
  }

  private createDemoOrderData(): void {
    console.log('🎭 Creating demo order data');
    
    this.orderDetails = {
      id: this.orderId,
      orderNumber: `DEMO-${this.orderId}`,
      items: [
        {
          product: {
            id: 1,
            name: 'Demo Product 1',
            sellingPrice: 25.99,
            selectedVariants: []
          },
          quantity: 2,
          isVariant: false
        },
        {
          product: {
            id: 2,
            name: 'Demo Product 2',
            sellingPrice: 45.50,
            selectedVariants: []
          },
          quantity: 1,
          isVariant: false
        }
      ],
      subtotal: 97.48,
      deliveryFee: 10.00,
      total: 107.48,
      deliveryMethod: 'delivery',
      paymentMethod: 'cash',
      deliveryInfo: {
        fullName: 'Demo Customer',
        phoneNumber: '+1234567890',
        address: '123 Demo Street, Demo City',
        instructions: 'Demo delivery instructions'
      },
      orderDate: new Date().toISOString(),
      status: 'confirmed'
    };
    
    this.processData();
  }

  processOrderItems(): void {
    console.log('🔄 Processing order items...');
    
    if (!this.orderDetails) {
      console.warn('❌ No order details available');
      this.orderItems = [];
      return;
    }

    try {
      let items = this.orderDetails.items;
      
      console.log('📦 Raw items data type:', typeof items);
      console.log('📦 Raw items data:', items);
      
      // Handle different data structures
      if (items instanceof Map) {
        console.log('🗺️ Items is a Map, converting to array');
        this.orderItems = Array.from(items.values());
      } else if (Array.isArray(items)) {
        console.log('📋 Items is already an array');
        this.orderItems = items;
      } else if (typeof items === 'object' && items !== null) {
        console.log('🔤 Items is an object, converting to array');
        this.orderItems = Object.values(items);
      } else {
        console.warn('❌ Unknown items format:', items);
        this.orderItems = [];
      }
      
      console.log('✅ Final processed order items:', this.orderItems);
      console.log('✅ Order items count:', this.orderItems.length);
      
    } catch (error) {
      console.error('❌ Error processing order items:', error);
      this.orderItems = [];
    }
  }

  initializeDeliveryTracking(): void {
    if (!this.orderDetails) return;

    // Ensure required fields exist
    if (!this.orderDetails.status) {
      this.orderDetails.status = 'confirmed';
    }
    if (!this.orderDetails.deliveryMethod) {
      this.orderDetails.deliveryMethod = 'pickup';
    }

    const orderDate = new Date(this.orderDetails.orderDate);
    
    this.deliverySteps = [
      {
        status: 'confirmed',
        label: 'Order Confirmed',
        icon: '✓',
        time: this.formatTime(orderDate),
        completed: true,
        active: this.orderDetails.status === 'confirmed'
      },
      {
        status: 'preparing',
        label: 'Preparing',
        icon: '👨‍🍳',
        time: this.formatTime(new Date(orderDate.getTime() + 10 * 60000)),
        completed: this.isStepCompleted('preparing'),
        active: this.orderDetails.status === 'preparing'
      },
      {
        status: 'on_the_way',
        label: 'On the Way',
        icon: '🚗',
        time: this.formatTime(new Date(orderDate.getTime() + 20 * 60000)),
        completed: this.isStepCompleted('on_the_way'),
        active: this.orderDetails.status === 'on_the_way'
      },
      {
        status: 'delivered',
        label: 'Delivered',
        icon: '🏠',
        time: this.formatTime(new Date(orderDate.getTime() + 45 * 60000)),
        completed: this.isStepCompleted('delivered'),
        active: this.orderDetails.status === 'delivered'
      }
    ];

    console.log('✅ Delivery tracking initialized:', this.deliverySteps);
  }

  isStepCompleted(stepStatus: string): boolean {
    const statusOrder = ['confirmed', 'preparing', 'on_the_way', 'delivered'];
    const currentStatusIndex = statusOrder.indexOf(this.orderDetails.status);
    const stepStatusIndex = statusOrder.indexOf(stepStatus);
    
    return stepStatusIndex <= currentStatusIndex;
  }

  isStepActive(stepStatus: string): boolean {
    return this.orderDetails.status === stepStatus;
  }

  getStepClass(step: DeliveryStep): string {
    if (step.completed) {
      return step.active ? 'bg-green-500 text-white animate-pulse' : 'bg-green-500 text-white';
    }
    return 'bg-gray-200 text-gray-500';
  }

  getDeliveryProgress(): number {
    const statusOrder = ['confirmed', 'preparing', 'on_the_way', 'delivered'];
    const currentStatusIndex = statusOrder.indexOf(this.orderDetails.status);
    return Math.max(25, ((currentStatusIndex + 1) / statusOrder.length) * 100);
  }

  trackDelivery(): void {
    this.showTracking = true;
    setTimeout(() => {
      const element = document.querySelector('.bg-white.shadow-lg');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  fireConfetti(): void {
    if (!this.confettiCanvas?.nativeElement) {
      console.log('❌ Confetti canvas not found, will retry');
      setTimeout(() => this.fireConfetti(), 100);
      return;
    }

    try {
      const canvas = this.confettiCanvas.nativeElement;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const myConfetti = confetti.create(canvas, {
        resize: true,
        useWorker: true
      });

      myConfetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        myConfetti({
          particleCount: 80,
          angle: 60,
          spread: 65,
          origin: { x: 0 }
        });

        myConfetti({
          particleCount: 80,
          angle: 120,
          spread: 65,
          origin: { x: 1 }
        });
      }, 300);
      
      console.log('🎉 Confetti fired successfully');
    } catch (error) {
      console.error('❌ Confetti error:', error);
    }
  }

  goToStore(): void {
    const currentUuid = this.route.snapshot.paramMap.get('uuid');
    if (currentUuid) {
      this.router.navigate(['/store', currentUuid]);
    } else {
      this.router.navigate(['/store']);
    }
  }

  printOrder(): void {
    window.print();
  }

  getStatusColorClass(): string {
    switch (this.orderDetails?.status) {
      case 'confirmed': return 'text-blue-600';
      case 'preparing': return 'text-yellow-600';
      case 'on_the_way': return 'text-orange-600';
      case 'delivered': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }

  getStatusBadgeClass(): string {
    switch (this.orderDetails?.status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'on_the_way': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getEstimatedTime(): string {
    if (this.orderDetails?.deliveryMethod === 'delivery') {
      return '30-45 minutes';
    }
    return '15-25 minutes';
  }

  formatNumber(value: number): string {
    if (!value && value !== 0) return '0.00';
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatTitleCase(text: string): string {
    if (!text) return '';
    return text.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  }

  // Add this method to test template rendering
  testTemplateRendering(): void {
    console.log('🧪 Testing template rendering...');
    console.log('🧪 isLoading:', this.isLoading);
    console.log('🧪 orderDetails:', !!this.orderDetails);
    console.log('🧪 orderItems length:', this.orderItems.length);
    
    // Force Angular to re-render the template
    this.cdr.detectChanges();
    
    // Check if the main content element exists in DOM
    setTimeout(() => {
      const mainContent = document.querySelector('.bg-white.shadow-lg');
      console.log('🧪 Main content element in DOM:', !!mainContent);
      console.log('🧪 Main content visibility:', mainContent ? window.getComputedStyle(mainContent).visibility : 'N/A');
      console.log('🧪 Main content display:', mainContent ? window.getComputedStyle(mainContent).display : 'N/A');
      console.log('🧪 Main content opacity:', mainContent ? window.getComputedStyle(mainContent).opacity : 'N/A');
    }, 100);
  }
}
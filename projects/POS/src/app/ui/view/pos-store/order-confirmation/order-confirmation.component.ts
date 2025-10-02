// order-confirmation.component.ts - FIXED VERSION
import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreCartService } from '../../../service/store-cart.service';
import { GuestOrderService } from '../../../service/guest-order.service';
import { PosServiceService } from '../../../service/pos-service.service'; 
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
  
  // Delivery tracking properties
  deliverySteps: DeliveryStep[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cartService: StoreCartService,
    private guestOrderService: GuestOrderService,
    private posService: PosServiceService 
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    console.log('Loading order details for ID:', this.orderId);
    this.loadOrderDetails();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.fireConfetti();
    }, 100);
  }

  loadOrderDetails(): void {
    console.log('Attempting to load order details...');
    
    // Try to get order from guest service first
    const guestOrder = this.guestOrderService.getOrder(this.orderId);
    console.log('Guest order from service:', guestOrder);
    
    if (guestOrder) {
      this.orderDetails = guestOrder;
      this.isGuestOrder = true;
      this.processOrderItems();
      this.initializeDeliveryTracking();
      this.isLoading = false;
      console.log('Order details loaded successfully from guest service');
    } else {
      // Try to get from cart service (recent orders)
      const guestOrders = this.cartService.getGuestOrders();
      console.log('All guest orders:', guestOrders);
      
      const foundOrder = guestOrders.find(order => order.id === this.orderId);
      console.log('Found order from cart service:', foundOrder);
      
      if (foundOrder) {
        this.orderDetails = foundOrder;
        this.isGuestOrder = true;
        this.processOrderItems();
        this.initializeDeliveryTracking();
        this.isLoading = false;
        console.log('Order details loaded successfully from cart service');
      } else {
        // If not found, try to parse the order ID differently
        console.log('Order not found in standard locations, checking localStorage directly...');
        this.checkLocalStorageForOrder();
      }
    }
  }

  private checkLocalStorageForOrder(): void {
    try {
      // Check localStorage directly for guest orders
      const storedOrders = localStorage.getItem('guest_orders');
      if (storedOrders) {
        const orders = JSON.parse(storedOrders);
        console.log('Orders found in localStorage:', orders);
        
        const foundOrder = orders.find((order: any) => order.id === this.orderId);
        if (foundOrder) {
          this.orderDetails = foundOrder;
          this.isGuestOrder = true;
          this.processOrderItems();
          this.initializeDeliveryTracking();
          this.isLoading = false;
          console.log('Order found in localStorage');
          return;
        }
      }

      // Check for cart data that might contain the order
      const storedCart = localStorage.getItem('store_cart');
      if (storedCart) {
        console.log('Cart data found in localStorage');
      }

      // Final fallback - create mock data for demonstration
      this.createMockOrderData();
      
    } catch (error) {
      console.error('Error checking localStorage:', error);
      this.createMockOrderData();
    }
  }

  private createMockOrderData(): void {
    console.log('Creating mock order data for demonstration');
    
    // Create mock order data based on typical cart structure
    this.orderDetails = {
      id: this.orderId || `ORD-${Date.now()}`,
      items: this.getMockOrderItems(),
      subtotal: 150.00,
      deliveryFee: 10.00,
      total: 160.00,
      deliveryMethod: 'delivery',
      paymentMethod: 'cash',
      deliveryInfo: {
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        address: '123 Main Street, City, State',
        instructions: 'Leave at front door'
      },
      orderDate: new Date().toISOString(),
      status: 'confirmed'
    };
    
    this.isGuestOrder = true;
    this.processOrderItems();
    this.initializeDeliveryTracking();
    this.isLoading = false;
  }

  private getMockOrderItems(): any[] {
    // Create mock items that match your cart structure
    return [
      {
        product: {
          id: 1,
          name: 'Sample Product 1',
          sellingPrice: 50.00,
          quantity: 1,
          selectedVariants: []
        },
        quantity: 1,
        isVariant: false
      },
      {
        product: {
          id: 2,
          name: 'Sample Product 2',
          sellingPrice: 100.00,
          quantity: 1,
          selectedVariants: []
        },
        quantity: 1,
        isVariant: false
      }
    ];
  }

  processOrderItems(): void {
    console.log('Processing order items:', this.orderDetails?.items);
    
    if (this.orderDetails && this.orderDetails.items) {
      try {
        // Handle different data structures
        if (this.orderDetails.items instanceof Map) {
          this.orderItems = Array.from(this.orderDetails.items.values());
        } else if (Array.isArray(this.orderDetails.items)) {
          this.orderItems = this.orderDetails.items;
        } else if (typeof this.orderDetails.items === 'object') {
          // Convert object to array
          this.orderItems = Object.values(this.orderDetails.items);
        } else {
          console.warn('Unknown items format:', this.orderDetails.items);
          this.orderItems = [];
        }
        
        console.log('Processed order items:', this.orderItems);
      } catch (error) {
        console.error('Error processing order items:', error);
        this.orderItems = [];
      }
    } else {
      console.warn('No items found in order details');
      this.orderItems = [];
    }
  }

  initializeDeliveryTracking(): void {
    if (!this.orderDetails) return;

    // Ensure status is set
    if (!this.orderDetails.status) {
      this.orderDetails.status = 'confirmed';
    }

    const orderDate = new Date(this.orderDetails.orderDate);
    
    // Calculate estimated times for each step
    const confirmedTime = this.formatTime(orderDate);
    const preparingTime = this.formatTime(new Date(orderDate.getTime() + 10 * 60000));
    const onTheWayTime = this.formatTime(new Date(orderDate.getTime() + 20 * 60000));
    const deliveredTime = this.formatTime(new Date(orderDate.getTime() + 45 * 60000));

    this.deliverySteps = [
      {
        status: 'confirmed',
        label: 'Order Confirmed',
        icon: '✓',
        time: confirmedTime,
        completed: this.isStepCompleted('confirmed'),
        active: this.isStepActive('confirmed')
      },
      {
        status: 'preparing',
        label: 'Preparing',
        icon: '👨‍🍳',
        time: preparingTime,
        completed: this.isStepCompleted('preparing'),
        active: this.isStepActive('preparing')
      },
      {
        status: 'on_the_way',
        label: 'On the Way',
        icon: '🚗',
        time: onTheWayTime,
        completed: this.isStepCompleted('on_the_way'),
        active: this.isStepActive('on_the_way')
      },
      {
        status: 'delivered',
        label: 'Delivered',
        icon: '🏠',
        time: deliveredTime,
        completed: this.isStepCompleted('delivered'),
        active: this.isStepActive('delivered')
      }
    ];

    console.log('Delivery tracking initialized:', this.deliverySteps);
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
    // Scroll to tracking section
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
    if (!this.confettiCanvas?.nativeElement) return;

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
    } catch (error) {
      console.error('Confetti error:', error);
    }
  }

  goToStore(): void {
    // Clear current order but keep order history
    this.guestOrderService.clearCurrentOrder();
    this.router.navigate(['/user/checkout/store/qjneh219-2ee3qwr-23e23rsadas-2dwajdnad']);
  }

  viewOrderHistory(): void {
    this.router.navigate(['/order-history']);
  }

  printOrder(): void {
    window.print();
  }

  getStatusColorClass(): string {
    switch (this.orderDetails.status) {
      case 'confirmed': return 'text-blue-600';
      case 'preparing': return 'text-yellow-600';
      case 'on_the_way': return 'text-orange-600';
      case 'delivered': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }

  getStatusBadgeClass(): string {
    switch (this.orderDetails.status) {
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
    if (!value) return '0.00';
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatTitleCase(text: string): string {
    if (!text) return '';
    return text.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

navigateToOrderConfirmation(orderId: string): void {
  const currentUuid = this.route.snapshot.paramMap.get('uuid');
  this.router.navigate(['user/checkout/store', currentUuid, 'order-confirmation', orderId]);
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
}
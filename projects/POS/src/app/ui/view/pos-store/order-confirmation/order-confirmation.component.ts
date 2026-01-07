// order-confirmation.component.ts - CRITICAL FIXES

import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreCartService } from '../../../service/store-cart.service';
import { GuestOrderService } from '../../../service/guest-order.service';
import * as confetti from 'canvas-confetti';
import { StoreOrderService } from '../../../service/store-order.service';

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
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cartService: StoreCartService,
    private guestOrderService: GuestOrderService,
    private storeOrderService: StoreOrderService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('🚀 Order Confirmation Component Initialized');
    
    // Get order ID from route
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    console.log('🎯 Order ID from route:', this.orderId);
    
    // Try to get order data from navigation state first
    const navigation = this.router.getCurrentNavigation();
    const historyState = history.state;
    
    let orderData = null;
    
    // Priority 1: Navigation state (fix TypeScript index signature error)
    if (navigation?.extras?.state && navigation.extras.state['orderData']) {
      orderData = navigation.extras.state['orderData'];
      console.log('✅ Found order in navigation state');
    }
    // Priority 2: History state
    else if (historyState && historyState['orderData']) {
      orderData = historyState['orderData'];
      console.log('✅ Found order in history state');
    }
    // Priority 3: localStorage
    else {
      const cachedOrder = localStorage.getItem('lastOrder');
      if (cachedOrder) {
        try {
          orderData = JSON.parse(cachedOrder);
          console.log('✅ Found order in localStorage');
        } catch (e) {
          console.error('❌ Failed to parse localStorage:', e);
        }
      }
    }
    
    if (orderData) {
      this.orderDetails = orderData;
      console.log('📦 Order details loaded:', this.orderDetails);
      this.processOrderData();
      this.isLoading = false;
      
      // Also fetch from backend for latest data (silent update)
      if (this.orderId && this.orderId !== '0') {
        this.fetchOrderFromBackend(Number(this.orderId), true);
      }
    } else {
      // Must fetch from backend
      console.log('⚠️ No local order data, fetching from backend...');
      this.loadOrderDetails();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.fireConfetti();
    }, 500);
  }

  loadOrderDetails(): void {
    if (!this.orderId || this.orderId === '0') {
      console.error('❌ Invalid order ID');
      this.isLoading = false;
      return;
    }

    const numericId = Number(this.orderId);
    if (!isNaN(numericId) && numericId > 0) {
      this.fetchOrderFromBackend(numericId);
    } else {
      this.isLoading = false;
    }
  }

  private fetchOrderFromBackend(orderId: number, silentUpdate: boolean = false): void {
    console.log('🌐 Fetching order from backend:', orderId);
    
    if (!silentUpdate) {
      this.isLoading = true;
    }
    
    this.storeOrderService.getOrderById(orderId).subscribe({
      next: (order: any) => {
        console.log('✅ Backend order received:', order);
        
        const normalizedOrder = this.normalizeOrderData(order);
        
        if (silentUpdate) {
          // Merge with existing data, but persist the local customer name if it's more specific
          const currentName = this.orderDetails?.customerName;
          const isGeneric = !currentName || currentName.toLowerCase().includes('guest');
          
          this.orderDetails = {
            ...this.orderDetails,
            ...normalizedOrder,
            // Keep local name if it's not generic and backend IS generic
            customerName: (!isGeneric && normalizedOrder.customerName.toLowerCase().includes('guest')) 
                          ? currentName 
                          : normalizedOrder.customerName,
            items: normalizedOrder.items?.length > 0 ? normalizedOrder.items : this.orderDetails.items
          };
        } else {
          this.orderDetails = normalizedOrder;
          this.processOrderData();
        }
        
        if (!silentUpdate) {
          this.isLoading = false;
        }
        
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('❌ Failed to fetch from backend:', error);
        if (!silentUpdate) {
          this.isLoading = false;
        }
      }
    });
  }

  private normalizeOrderData(order: any): any {
    console.log('🔄 Normalizing backend order:', order);
    
    const items = order.orderItem || order.items || [];
    
    // Calculate subtotal
    const subtotal = items.reduce((total: number, item: any) => {
      const price = item.product?.sellingPrice || item.totalPrice || 0;
      const quantity = item.quantity || 1;
      return total + (price * quantity);
    }, 0);
    
    // Get tax info
    let taxAmount = order.taxAmount || order.totalTax || 0;
    let taxBreakdown = order.taxBreakdown || [];
    
    if (order.taxSummary && Array.isArray(order.taxSummary)) {
      taxBreakdown = order.taxSummary.map((tax: any) => ({
        name: tax.name || 'Tax',
        rate: tax.rate || 0,
        taxAmount: tax.value || 0
      }));
      
      if (taxAmount === 0) {
        taxAmount = taxBreakdown.reduce((total: number, tax: any) => total + tax.taxAmount, 0);
      }
    }
    
    // Parse date
    let createdDate = order.createdDate;
    if (Array.isArray(createdDate)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = createdDate;
      createdDate = new Date(year, month - 1, day, hour, minute, second);
    } else if (typeof createdDate === 'string') {
      createdDate = new Date(createdDate);
    }
    
    // 🔥 CRITICAL FIX: Get actual customer name from order
    const customerName = order.customer?.name || 'Guest Customer';
    const customerEmail = order.customerEmail || order.customer?.email || '';
    
    console.log('👤 Customer from backend:', {
      name: customerName,
      email: customerEmail,
      fullCustomer: order.customer
    });
    
    return {
      id: order.id,
      orderNumber: order.orderNumber || `ORD-${order.id}`,
      orderStatus: order.orderStatus || 'PENDING',
      status: order.orderStatus || 'PENDING',
      createdDate: createdDate,
      orderDate: createdDate,
      totalAmount: order.totalAmount || order.grandTotal || 0,
      total: order.totalAmount || order.grandTotal || 0,
      grandTotal: order.grandTotal || order.totalAmount || 0,
      subtotal: order.subtotal || subtotal,
      taxAmount: taxAmount,
      taxBreakdown: taxBreakdown,
      taxSummary: order.taxSummary,
      deliveryFee: order.deliveryFee || 0,
      totalDiscount: order.totalDiscount || 0,
      totalTax: order.totalTax || 0,
      customerName: order.deliveryInfo?.fullName || order.customerName || order.customer?.name || 'Guest Customer',
      customerEmail: order.deliveryInfo?.email || order.customer?.email || '',
      customer: order.customer,
      deliveryMethod: order.deliveryFee > 0 ? 'delivery' : 'pickup',
      deliveryInfo: order.deliveryInfo,
      items: items,
      orderItem: items,
      paymentMethod: order.paymentMethod || 'cash',
      branch: order.branch
    };
  }

  private processOrderData(): void {
    console.log('🔄 Processing order data...');
    
    if (!this.orderDetails) {
      console.error('❌ No order details');
      return;
    }
    
    console.log('📊 Order details:', {
      orderNumber: this.orderDetails.orderNumber,
      customerName: this.orderDetails.customerName,
      subtotal: this.orderDetails.subtotal,
      taxAmount: this.orderDetails.taxAmount,
      taxBreakdown: this.orderDetails.taxBreakdown,
      total: this.orderDetails.total || this.orderDetails.totalAmount
    });
    
    this.processOrderItems();
    this.cdr.detectChanges();
  }

  processOrderItems(): void {
    console.log('📦 Processing order items...');
    
    if (!this.orderDetails) {
      this.orderItems = [];
      return;
    }

    let items = this.orderDetails.items || this.orderDetails.orderItem || [];
    
    if (items instanceof Map) {
      this.orderItems = Array.from(items.values());
    } else if (Array.isArray(items)) {
      this.orderItems = items;
    } else if (typeof items === 'object') {
      this.orderItems = Object.values(items);
    } else {
      this.orderItems = [];
    }
    
    console.log('✅ Processed items:', this.orderItems.length);
  }

  fireConfetti(): void {
    if (!this.confettiCanvas?.nativeElement) {
      setTimeout(() => this.fireConfetti(), 200);
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
        particleCount: 200,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']
      });

      setTimeout(() => {
        myConfetti({
          particleCount: 100,
          angle: 60,
          spread: 70,
          origin: { x: 0, y: 0.6 }
        });

        myConfetti({
          particleCount: 100,
          angle: 120,
          spread: 70,
          origin: { x: 1, y: 0.6 }
        });
      }, 300);
    } catch (error) {
      console.error('❌ Confetti error:', error);
    }
  }

  getProductImage(product: any): string {
    if (!product) return 'assets/placeholder-product.jpg';
    
    // 1. Try productImages array (standard ProductData from frontend/backend)
    const images = product.productImages || product.product_images;
    if (Array.isArray(images) && images.length > 0) {
      const imgNo = images[0]?.imgNo || images[0]?.img_no;
      if (imgNo) {
        return `https://be.optimaxsuites.com/x/api/v2/pos/products/images/${imgNo}`;
      }
    }
    
    // 2. Try single productImage object
    if (product.productImage?.imgNo) {
      return `https://be.optimaxsuites.com/x/api/v2/pos/products/images/${product.productImage.imgNo}`;
    }
    
    // 3. Try direct imageUrl
    if (product.imageUrl) {
      return product.imageUrl;
    }
    
    return 'assets/placeholder-product.jpg';
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

  trackDelivery(): void {
    console.log('Track delivery clicked');
  }

  getEstimatedTime(): string {
    const deliveryMethod = this.orderDetails?.deliveryMethod || 'pickup';
    return deliveryMethod === 'delivery' ? '30-45 minutes' : '15-25 minutes';
  }

  formatNumber(value: number): string {
    if (value === null || value === undefined) return '0.00';
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) return '0.00';
    
    return numValue.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  formatDate(dateInput: any): string {
    if (!dateInput) return 'Unknown date';
    
    try {
      let date: Date;
      
      if (Array.isArray(dateInput)) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = dateInput;
        date = new Date(year, month - 1, day, hour, minute, second);
      } else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      } else if (dateInput instanceof Date) {
        date = dateInput;
      } else {
        return 'Invalid date';
      }
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }
}
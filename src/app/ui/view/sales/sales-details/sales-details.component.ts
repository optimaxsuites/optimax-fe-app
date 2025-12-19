import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Order, DateType } from '../../../models/interface'; 
import { HttpErrorResponse } from '@angular/common/http'; 
import { StoreOrderService } from '../../../service/store-order.service';

export interface CancellationEvent {
  orderId: number | string;
  reason: string;
  chargeback: boolean;
}

@Component({
  selector: 'app-sales-details',
  templateUrl: './sales-details.component.html',
  styleUrl: './sales-details.component.scss'
})
export class SalesDetailsComponent implements OnInit, OnChanges {

  @Input() order?: Order;
  @Input() isEstore: boolean = false; 
  @Output() back = new EventEmitter<void>();
  @Output() cancelOrderConfirmed = new EventEmitter<CancellationEvent>(); 
  @Output() statusUpdated = new EventEmitter<void>();
  
  loading = true;
  error = false;
  
  showCancelModal = false;
  showStatusDropdown = false;
  cancellationReason: string = '';
  requireChargeback: boolean = false;
  
  // Display labels for the dropdown
  statusOptions = [
    'Pending',
    'Processing', // Changed from Packaged to align closer to backend 'PROCESSING'
    'Out for Delivery',
    'Delivered',
    'Cancelled'
  ];

  // Mapping from Display Label -> Backend Enum
  // Backend Accepted: [CANCELLED, PROCESSING, DELIVERED, REFUNDED, OUT_FOR_DELIVERY, CONFIRMED, PENDING]
  private deliveryStatusMap: { [key: string]: string } = {
    'Awaiting Payment': 'PENDING',
    'Pending': 'PENDING',
    'Processing': 'PROCESSING',
    'Packaged': 'PROCESSING', // Legacy mapping
    'Out for Delivery': 'OUT_FOR_DELIVERY',
    'Delivered': 'DELIVERED',
    'Failed Delivery': 'CANCELLED',
    'Cancelled': 'CANCELLED'
  };

  currentUser: string = 'System'; 

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storeOrderService: StoreOrderService
  ) { }

  ngOnInit(): void {
    this.loading = false;
    this.fetchCurrentUser();
    console.log('Sales details initialized with order:', this.order, 'isEstore:', this.isEstore);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['order'] && changes['order'].currentValue) {
      console.log('Order data changed:', changes['order'].currentValue);
      this.loading = false;
    }
  }

  fetchCurrentUser(): void {
    const userStr = localStorage.getItem('user') || localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        this.currentUser = userObj.name || userObj.username || userObj.email || 'Admin';
      } catch (e) {
        this.currentUser = userStr; 
      }
    } else {
        this.currentUser = 'Admin';
    }
  }

  goBack(): void {
    this.back.emit();
  }
  
  toggleStatusDropdown(): void {
    this.showStatusDropdown = !this.showStatusDropdown;
  }

  updateStatus(statusLabel: string): void {
    this.showStatusDropdown = false;
    
    if(!this.order || !this.order.id) return;

    // Convert display label to backend Enum
    const backendStatus = this.deliveryStatusMap[statusLabel] || statusLabel.toUpperCase();
    
    console.log(`Updating status: "${statusLabel}" mapped to Backend Enum: "${backendStatus}"`);

    this.loading = true;
    
    // Pass the full order object and the CORRECTED backend status
    this.storeOrderService.updateDeliveryStatus(this.order, backendStatus, this.currentUser).subscribe({
      next: (res) => {
        console.log('Status updated', res);
        alert(`Order status updated to ${statusLabel}`);
        
        if(this.order) {
           this.order.deliveryStatus = backendStatus; // Update local model with backend enum
           this.order.updatedBy = this.currentUser; 
           
           if (res && res.orderStatus) {
               this.order.orderStatus = res.orderStatus;
           }
        }
        
        this.statusUpdated.emit();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to update status', err);
        const msg = err.error?.message || err.message || 'Failed to update status';
        alert(`Error: ${msg}`);
        this.loading = false;
      }
    });
  }

  openCancelModal(): void {
    if (this.order?.deliveryStatus === 'OUT_FOR_DELIVERY' || this.order?.deliveryStatus === 'DELIVERED') {
        alert('Cannot cancel order that is Out for Delivery or Delivered.');
        return;
    }

    this.cancellationReason = '';
    this.requireChargeback = false;
    this.showCancelModal = true;
  }
  
  confirmCancellation(): void {
    if (!this.order || !this.cancellationReason || !this.order.id) {
      alert('Order ID or reason is missing. Cannot proceed with cancellation.');
      return;
    }

    this.cancelOrderConfirmed.emit({
      orderId: this.order.id, 
      reason: this.cancellationReason,
      chargeback: this.requireChargeback
    });
    
    if (this.order) {
        this.order.updatedBy = this.currentUser;
    }

    this.showCancelModal = false;
    this.cancellationReason = ''; 
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
  }

  formatDate(date: DateType): string {
    if (!date) return 'N/A';
    
    if (typeof date === 'string') {
      return new Date(date).toLocaleString();
    }

    if (Array.isArray(date) && date.length >= 3) {
      const [year, month, day, hour, minute, second] = date;
      const dateObj = new Date(Number(year), Number(month) - 1, Number(day), Number(hour) || 0, Number(minute) || 0, Number(second) || 0);
      return dateObj.toLocaleString();
    }
    
    return 'N/A';
  }

  calculateTotalItems(): number {
    if (!this.order?.orderItem) return 0;
    return this.order.orderItem.reduce((total: number, item: any) => total + (item.quantity || 0), 0);
  }

  calculateSubtotal(): number {
    if (!this.order?.orderItem) return this.order?.totalAmount || 0;
    return this.order.orderItem.reduce((total: number, item: any) => {
      const quantity = item.quantity || 0;
      const unitPrice = this.getItemUnitPrice(item);
      return total + (unitPrice * quantity);
    }, 0);
  }

  calculateDiscount(): number {
    return 0;
  }
  calculateTax(): number {
    if (!this.order?.orderItem) return 0;
    return this.order.orderItem.reduce((totalTax: number, item: any) => {
      const quantity = item.quantity || 0;
      const unitPrice = this.getItemUnitPrice(item);
      const subtotal = unitPrice * quantity;
      const taxRate = this.getItemTaxRate(item);
      const itemTax = (taxRate / 100) * subtotal;
      return totalTax + itemTax;
    }, 0);
  }

  calculateTotal(): number {
    return this.calculateSubtotal() + this.calculateTax() - this.calculateDiscount();
  }

  getItemUnitPrice(item: any): number {
    if (!item) return 0;
    const variantPrice = item.productVariant?.price;
    const productPrice = parseFloat(item.product?.sellingPrice || '0');
    return variantPrice || productPrice;
  }

  getItemTaxRate(item: any): number {
    if (!item?.product?.tax?.rate) return 5; 
    return item.product.tax.rate;
  }

  printOrderDetails(): void {
    window.print();
  }
}
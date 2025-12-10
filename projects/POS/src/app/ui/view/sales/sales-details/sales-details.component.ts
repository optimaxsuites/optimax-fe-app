import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Order, DateType } from '../../../models/interface'; 
import { HttpErrorResponse } from '@angular/common/http'; 

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
  @Output() back = new EventEmitter<void>();
  @Output() cancelOrderConfirmed = new EventEmitter<CancellationEvent>(); 
  
  loading = true;
  error = false;
  

  showCancelModal = false;
  cancellationReason: string = '';
  requireChargeback: boolean = false;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loading = false;
    console.log('Sales details initialized with order:', this.order);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['order'] && changes['order'].currentValue) {
      console.log('Order data changed:', changes['order'].currentValue);
      this.loading = false;
    }
  }

  goBack(): void {
    this.back.emit();
  }
  
  openCancelModal(): void {
    this.cancellationReason = '';
    this.requireChargeback = false;
    this.showCancelModal = true;
  }
  
  confirmCancellation(): void {
    if (!this.order || !this.cancellationReason || !this.order.id) {
      alert('Order ID or reason is missing. Cannot proceed with cancellation.');
      return;
    }

    // Emit the event with cancellation data. The parent component will call the service.
    this.cancelOrderConfirmed.emit({
      orderId: this.order.id, 
      reason: this.cancellationReason,
      chargeback: this.requireChargeback
    });

    if (this.requireChargeback) {
      console.log(`Chargeback requested for Order ${this.order.orderNumber}. Client needs refund.`);
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
      // Subtract 1 from month for 0-indexing
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
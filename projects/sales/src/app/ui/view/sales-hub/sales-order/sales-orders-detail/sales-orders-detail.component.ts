import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SalesService } from '../../../../service/sales/sales.service';
import { SalesOrder } from '../../../../domain/sales/sales.dto';

@Component({
  selector: 'app-sales-orders-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sales-orders-detail.component.html',
  styleUrl: './sales-orders-detail.component.scss'
})
export class SalesOrdersDetailComponent implements OnChanges {
  @Input() detailId?: string;
  @Output() closed = new EventEmitter<void>();

  order: SalesOrder | null = null;
  isLoading = false;

  constructor(private salesService: SalesService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['detailId'] && this.detailId) {
      this.loadOrderDetail(this.detailId);
    }
  }

  loadOrderDetail(id: string): void {
    this.isLoading = true;
    this.salesService.getSalesOrderById(id).subscribe({
      next: (order) => {
        this.order = order;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading order detail:', err);
        this.isLoading = false;
      }
    });
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined) return '-';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  getStatusBadgeClass(status: string | undefined): string {
    if (!status) return 'status-pending';
    const classes: Record<string, string> = {
      'PENDING': 'status-pending',
      'CONFIRMED': 'status-confirmed',
      'PROCESSING': 'status-processing',
      'SHIPPED': 'status-shipped',
      'DELIVERED': 'status-delivered',
      'CANCELLED': 'status-cancelled'
    };
    return classes[status] || 'status-pending';
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return '';
    const labels: Record<string, string> = {
      'PENDING': 'Pending',
      'CONFIRMED': 'Confirmed',
      'PROCESSING': 'Processing',
      'SHIPPED': 'Shipped',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  processOrder(): void {
    if (this.order && confirm(`Process order ${this.order.orderNumber}?`)) {
      this.salesService.updateSalesOrder(this.order.id, { status: 'PROCESSING' }).subscribe({
        next: (updated) => {
          this.order = updated;
          alert(`Order ${this.order.orderNumber} is now processing`);
        },
        error: (err) => {
          console.error('Error processing order:', err);
        }
      });
    }
  }

  shipOrder(): void {
    if (this.order && confirm(`Ship order ${this.order.orderNumber}?`)) {
      this.salesService.updateSalesOrder(this.order.id, { status: 'SHIPPED' }).subscribe({
        next: (updated) => {
          this.order = updated;
          alert(`Order ${this.order.orderNumber} has been shipped`);
        },
        error: (err) => {
          console.error('Error shipping order:', err);
        }
      });
    }
  }

  deliverOrder(): void {
    if (this.order && confirm(`Mark order ${this.order.orderNumber} as delivered?`)) {
      this.salesService.updateSalesOrder(this.order.id, { status: 'DELIVERED', actualDeliveryDate: new Date() }).subscribe({
        next: (updated) => {
          this.order = updated;
          alert(`Order ${this.order.orderNumber} has been delivered`);
        },
        error: (err) => {
          console.error('Error delivering order:', err);
        }
      });
    }
  }

  onClose(): void {
    this.closed.emit();
  }
}

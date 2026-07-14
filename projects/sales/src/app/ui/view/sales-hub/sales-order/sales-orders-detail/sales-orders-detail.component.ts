import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SalesService } from '../../../../service/sales/sales.service';
import { SalesOrder, Invoice } from '../../../../domain/sales/sales.dto';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';

@Component({
  selector: 'app-sales-orders-detail',
  standalone: true,
  imports: [CommonModule, BackButtonComponent],
  templateUrl: './sales-orders-detail.component.html',
  styleUrl: './sales-orders-detail.component.scss'
})
export class SalesOrdersDetailComponent implements OnChanges, OnInit {
  @Input() detailId?: string;
  @Output() closed = new EventEmitter<void>();

  order: SalesOrder | null = null;
  isLoading = false;
  invoiceGenerated = false;

  constructor(
    private salesService: SalesService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.detailId || this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadOrderDetail(id);
    }
  }

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
        if (order) {
          this.checkIfInvoiceExists(order.id);
        }
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
    if (this.closed.observed) {
      this.closed.emit();
    } else {
      const uuid = this.route.snapshot.paramMap.get('uuid');
      if (uuid) {
        this.router.navigate(['/admin/sales/sales-hub', uuid]);
      } else {
        this.router.navigate(['/admin/sales/sales-hub']);
      }
    }
  }

  checkIfInvoiceExists(orderId: string): void {
    this.salesService.getInvoices({ page: 0, size: 100 }).subscribe({
      next: (res) => {
        this.invoiceGenerated = res.data.some(inv => inv.orderId === orderId);
      },
      error: (err) => {
        console.error('Error checking matching invoice:', err);
      }
    });
  }

  viewInvoice(): void {
    if (!this.order) return;
    this.salesService.getInvoices({ page: 0, size: 100 }).subscribe({
      next: (res) => {
        const matchingInvoice = res.data.find(inv => inv.orderId === this.order!.id);
        if (matchingInvoice) {
          const uuid = this.route.snapshot.paramMap.get('uuid');
          if (uuid) {
            this.router.navigate(['/admin/sales/invoices', matchingInvoice.id, uuid]);
          } else {
            this.router.navigate(['/admin/sales/invoices', matchingInvoice.id]);
          }
        } else {
          alert('Could not find invoice.');
        }
      },
      error: (err) => {
        console.error('Error viewing invoice:', err);
      }
    });
  }

  generateInvoice(): void {
    if (!this.order) return;
    
    if (confirm(`Generate invoice for order ${this.order.orderNumber}?`)) {
      const invoiceData: Partial<Invoice> = {
        orderId: this.order.id,
        quoteId: this.order.quoteId,
        customerId: this.order.customerId,
        customerName: this.order.customerName,
        items: this.order.items.map(item => ({
          id: Math.random().toString(36).substr(2, 9),
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })),
        subtotal: this.order.subtotal,
        taxAmount: this.order.taxAmount,
        discountAmount: this.order.discountAmount,
        totalAmount: this.order.totalAmount,
        amountPaid: 0,
        balanceDue: this.order.totalAmount,
        currency: this.order.currency,
        status: 'DRAFT',
        notes: this.order.notes,
        paymentTerms: 'Net 30',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days due
        logoUrl: this.order.logoUrl
      };

      this.salesService.createInvoice(invoiceData).subscribe({
        next: (createdInvoice: Invoice) => {
          alert(`Invoice ${createdInvoice.invoiceNumber} has been successfully generated.`);
          const uuid = this.route.snapshot.paramMap.get('uuid');
          if (uuid) {
            this.router.navigate(['/admin/sales/invoices', createdInvoice.id, uuid]);
          } else {
            this.router.navigate(['/admin/sales/invoices', createdInvoice.id]);
          }
        },
        error: (err: any) => {
          console.error('Error generating invoice:', err);
          alert('Failed to generate invoice. Please try again.');
        }
      });
    }
  }
}

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../../service/sales/sales.service';
import { Payment, Invoice, SalesOrder, Quote, Customer } from '../../../domain/sales/sales.dto';
import { BackButtonComponent } from '../../../shared-component/view/back-button/back-button.component';
import { forkJoin, of } from 'rxjs';

interface TimelineEvent {
  title: string;
  icon: string;
  status: 'completed' | 'active' | 'failed' | 'pending' | 'refunded';
  timestamp: Date;
  description: string;
  meta?: { label: string; value: string }[];
}

@Component({
  selector: 'app-transaction-history-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, BackButtonComponent],
  templateUrl: './transaction-history-detail.component.html',
  styleUrl: './transaction-history-detail.component.scss'
})
export class TransactionHistoryDetailComponent implements OnInit {
  @Input() paymentId?: string;
  @Output() closed = new EventEmitter<void>();

  payment: Payment | null = null;
  invoice: Invoice | null = null;
  salesOrder: SalesOrder | null = null;
  quote: Quote | null = null;
  customer: Customer | null = null;
  isLoading = true;

  timelineEvents: TimelineEvent[] = [];

  constructor(private salesService: SalesService) { }

  ngOnInit(): void {
    if (this.paymentId) {
      this.loadLifecycle();
    } else {
      this.isLoading = false;
    }
  }

  loadLifecycle(): void {
    this.isLoading = true;
    this.salesService.getPaymentById(this.paymentId!).subscribe({
      next: (payment) => {
        if (!payment) {
          this.isLoading = false;
          return;
        }
        this.payment = payment;

        // Trace Invoice
        this.salesService.getInvoiceById(payment.invoiceId).subscribe({
          next: (invoice) => {
            this.invoice = invoice;

            // Parallel fetch for Sales Orders, Quotes, Customer, and Payments Log
            const orderObs = invoice ? this.salesService.getSalesOrders({ status: 'ALL', size: 100 }) : of({ data: [] as SalesOrder[] });
            const quoteObs = invoice ? this.salesService.getQuotes({ status: 'ALL', size: 100 }) : of({ data: [] as Quote[] });
            const customerObs = this.salesService.getCustomerById(payment.customerId);
            const allPaymentsObs = invoice ? this.salesService.getPayments({ invoiceId: invoice.id, size: 100 }) : of({ data: [] as Payment[] });

            forkJoin([orderObs, quoteObs, customerObs, allPaymentsObs]).subscribe({
              next: ([ordersResponse, quotesResponse, customerResult, paymentsResult]) => {
                this.customer = customerResult;

                if (invoice) {
                  // Robust order matching
                  const invoiceOrderIdClean = invoice.orderId.replace('ORD-', '').replace(/^0+/, '');
                  this.salesOrder = ordersResponse.data.find(o =>
                    o.id === invoice.orderId ||
                    o.orderNumber === invoice.orderId ||
                    o.id === invoiceOrderIdClean ||
                    (o.orderNumber.replace('SO-', '') === invoice.orderId.replace('ORD-', ''))
                  ) || null;

                  if (this.salesOrder) {
                    // Robust quote matching
                    const orderQuoteIdClean = this.salesOrder.quoteId ? this.salesOrder.quoteId.replace('QT-', '').replace(/^0+/, '') : '';
                    this.quote = quotesResponse.data.find(q =>
                      q.id === this.salesOrder!.quoteId ||
                      q.quoteNumber === this.salesOrder!.quoteId ||
                      q.id === orderQuoteIdClean ||
                      (this.salesOrder!.quoteId && q.quoteNumber.replace('QT-', '') === this.salesOrder!.quoteId.replace('QT-', ''))
                    ) || null;
                  }
                }

                // Resolve list of payments specifically for this invoice
                const relatedPayments = paymentsResult.data;

                this.buildTimeline(relatedPayments);
                this.isLoading = false;
              },
              error: (err) => {
                console.error('Error fetching lifecycle details:', err);
                this.isLoading = false;
              }
            });
          },
          error: (err) => {
            console.error('Error loading invoice for payment lifecycle:', err);
            this.isLoading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error loading payment:', err);
        this.isLoading = false;
      }
    });
  }

  buildTimeline(payments: Payment[]): void {
    this.timelineEvents = [];

    // Helper to simulate a time offset for mock dates
    const createTime = (date: Date, hours: number, minutes: number, seconds: number): Date => {
      const d = new Date(date);
      d.setHours(hours, minutes, seconds, 0);
      return d;
    };

    // 1. Quotation Stage
    if (this.quote) {
      const qDate = new Date(this.quote.createdAt);
      this.timelineEvents.push({
        title: `Quotation Generated (${this.quote.quoteNumber})`,
        icon: 'fa-file-lines',
        status: 'completed',
        timestamp: createTime(qDate, 9, 15, 30),
        description: `Draft quotation raised for client ${this.quote.customerName}.`,
        meta: [
          { label: 'Amount', value: this.formatCurrency(this.quote.totalAmount, this.quote.currency) },
          { label: 'Items Count', value: String(this.quote.items?.length || 0) },
          { label: 'Validity', value: new Date(this.quote.validUntil).toLocaleDateString('en-NG') }
        ]
      });

      if (this.quote.status === 'ACCEPTED' || this.quote.status === 'CONVERTED') {
        this.timelineEvents.push({
          title: 'Quotation Accepted by Customer',
          icon: 'fa-circle-check',
          status: 'completed',
          timestamp: createTime(qDate, 16, 45, 10),
          description: `Client accepted quote terms. Status updated to ${this.quote.status}.`
        });
      }
    }

    // 2. Sales Order Stage
    if (this.salesOrder) {
      const oDate = new Date(this.salesOrder.orderDate);
      this.timelineEvents.push({
        title: `Sales Order Confirmed (${this.salesOrder.orderNumber})`,
        icon: 'fa-box',
        status: 'completed',
        timestamp: createTime(oDate, 10, 5, 20),
        description: `Order approved and registered in inventory. Shipping to: ${this.salesOrder.shippingAddress || 'Customer Address'}`,
        meta: [
          { label: 'Subtotal', value: this.formatCurrency(this.salesOrder.subtotal, this.salesOrder.currency) },
          { label: 'Tax Amount', value: this.formatCurrency(this.salesOrder.taxAmount, this.salesOrder.currency) },
          { label: 'Total Value', value: this.formatCurrency(this.salesOrder.totalAmount, this.salesOrder.currency) }
        ]
      });

      if (this.salesOrder.status === 'PROCESSING' || this.salesOrder.status === 'SHIPPED' || this.salesOrder.status === 'DELIVERED') {
        this.timelineEvents.push({
          title: 'Order Put in Processing',
          icon: 'fa-gears',
          status: 'completed',
          timestamp: createTime(oDate, 14, 30, 0),
          description: 'Items allocated and package prep completed.'
        });
      }

      if (this.salesOrder.status === 'SHIPPED' || this.salesOrder.status === 'DELIVERED') {
        const shipDate = this.salesOrder.expectedDeliveryDate ? new Date(this.salesOrder.expectedDeliveryDate) : oDate;
        this.timelineEvents.push({
          title: 'Order Dispatched to Courier',
          icon: 'fa-truck',
          status: 'completed',
          timestamp: createTime(shipDate, 11, 20, 15),
          description: 'Package handed over to logistics carrier for delivery.'
        });
      }

      if (this.salesOrder.status === 'DELIVERED') {
        const delDate = this.salesOrder.actualDeliveryDate ? new Date(this.salesOrder.actualDeliveryDate) : oDate;
        this.timelineEvents.push({
          title: 'Order Delivered to Client',
          icon: 'fa-house-chimney-user',
          status: 'completed',
          timestamp: createTime(delDate, 15, 45, 0),
          description: 'Package delivered and received signature confirmation from client obo receiver.'
        });
      }
    }

    // 3. Billing Stage
    if (this.invoice) {
      const invDate = new Date(this.invoice.issueDate);
      this.timelineEvents.push({
        title: `Sales Invoice Issued (${this.invoice.invoiceNumber})`,
        icon: 'fa-file-invoice-dollar',
        status: 'completed',
        timestamp: createTime(invDate, 9, 0, 10),
        description: `Invoice raised against Sales Order. Payment terms configured: ${this.invoice.paymentTerms}.`,
        meta: [
          { label: 'Invoice Total', value: this.formatCurrency(this.invoice.totalAmount, this.invoice.currency) },
          { label: 'Amount Paid', value: this.formatCurrency(this.invoice.amountPaid, this.invoice.currency) },
          { label: 'Due Date', value: new Date(this.invoice.dueDate).toLocaleDateString('en-NG') }
        ]
      });

      if (this.invoice.status === 'SENT') {
        this.timelineEvents.push({
          title: 'Invoice Sent to Customer',
          icon: 'fa-paper-plane',
          status: 'completed',
          timestamp: createTime(invDate, 9, 30, 0),
          description: `Billing invoice dispatched to account contact: ${this.customer?.email || 'Customer Billing Contact'}.`
        });
      }

      if (this.invoice.status === 'CANCELLED') {
        this.timelineEvents.push({
          title: 'Invoice Cancelled',
          icon: 'fa-ban',
          status: 'failed',
          timestamp: createTime(new Date(), 12, 0, 0),
          description: 'Invoice has been voided / cancelled.'
        });
      }
    }

    // 4. Payments Stage
    // We add all payment attempts related to this invoice
    payments.forEach(p => {
      const pDate = new Date(p.paymentDate);
      let status: 'completed' | 'failed' | 'pending' | 'refunded' = 'completed';
      let icon = 'fa-money-bill-wave';
      let desc = '';

      if (p.status === 'COMPLETED') {
        status = 'completed';
        icon = 'fa-circle-check';
        desc = `Payment of ${this.formatCurrency(p.amount, p.currency)} received via ${p.method.replace('_', ' ')}. Reference transaction ID: ${p.reference}`;
      } else if (p.status === 'FAILED') {
        status = 'failed';
        icon = 'fa-circle-xmark';
        desc = `Payment attempt of ${this.formatCurrency(p.amount, p.currency)} failed via ${p.method.replace('_', ' ')}. Reference transaction ID: ${p.reference}. Reason: ${p.notes || 'Decline'}`;
      } else if (p.status === 'PENDING') {
        status = 'pending';
        icon = 'fa-clock';
        desc = `Payment transaction of ${this.formatCurrency(p.amount, p.currency)} initiated and awaiting clearance. Reference transaction ID: ${p.reference}`;
      } else if (p.status === 'REFUNDED') {
        status = 'refunded';
        icon = 'fa-rotate-left';
        desc = `Refund of ${this.formatCurrency(p.amount, p.currency)} processed. Reference transaction ID: ${p.reference}`;
      }

      this.timelineEvents.push({
        title: `Payment ${p.status.toLowerCase()} (${p.paymentNumber})`,
        icon: icon,
        status: status,
        timestamp: createTime(pDate, 11, 40, 0),
        description: desc
      });
    });

    // Sort chronologically by timestamp
    this.timelineEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Helpers
  goBack(): void {
    this.closed.emit();
  }

  formatCurrency(amount: number, currency: string = 'NGN'): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  getTimelineClass(status: string): string {
    return `timeline-node-${status}`;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'COMPLETED': 'completed',
      'FAILED': 'failed',
      'PENDING': 'pending',
      'REFUNDED': 'refunded'
    };
    return classes[status] || 'pending';
  }
}

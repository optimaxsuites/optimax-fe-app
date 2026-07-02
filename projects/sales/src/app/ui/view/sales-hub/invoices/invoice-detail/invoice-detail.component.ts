// src/app/ui/view/sales-module/invoice-detail/invoice-detail.component.ts

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SalesService } from '../../../../service/sales/sales.service';
import { Invoice, InvoiceStatus } from '../../../../domain/sales/sales.dto';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, BackButtonComponent],
  templateUrl: './invoice-detail.component.html',
  styleUrls: ['./invoice-detail.component.scss']
})
export class InvoiceDetailComponent implements OnInit {
  @Input() detailId?: string;
  @Output() closed = new EventEmitter<void>();
  @Output() edit = new EventEmitter<string>();

  invoice: Invoice | null = null;
  isLoading = true;
  showPaymentModal = false;
  paymentAmount = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService
  ) {}

  ngOnInit(): void {
    const id = this.detailId || this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInvoice(id);
    } else {
      this.isLoading = false;
    }
  }

  loadInvoice(id: string): void {
    this.isLoading = true;
    this.salesService.getInvoiceById(id).subscribe({
      next: (invoice: Invoice | null) => {
        this.invoice = invoice;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading invoice:', err);
        this.isLoading = false;
      }
    });
  }

  formatCurrency(amount: number): string {
    const currency = this.invoice?.currency || 'NGN';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
  }

  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'DRAFT': 'status-draft',
      'SENT': 'status-sent',
      'PAID': 'status-paid',
      'PARTIAL': 'status-partial',
      'OVERDUE': 'status-overdue',
      'CANCELLED': 'status-cancelled'
    };
    return classes[status] || 'status-draft';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'DRAFT': 'draft',
      'SENT': 'sent',
      'PAID': 'paid',
      'PARTIAL': 'partial',
      'OVERDUE': 'overdue',
      'CANCELLED': 'cancelled'
    };
    return classes[status] || 'draft';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'DRAFT': 'Draft',
      'SENT': 'Sent',
      'PAID': 'Paid',
      'PARTIAL': 'Partial',
      'OVERDUE': 'Overdue',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  isOverdue(dueDate: Date | string): boolean {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    return due < today;
  }

  getTotalQuantity(): number {
    if (!this.invoice || !this.invoice.items) return 0;
    return this.invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  getTotalInWords(amount: number): string {
    if (amount === 0) return 'Zero';
    
    const currency = this.invoice?.currency || 'NGN';
    const currencySymbol = currency === 'NGN' ? 'Naira' : currency;
    
    const naira = Math.floor(amount);
    const kobo = Math.round((amount - naira) * 100);
    
    if (naira === 0) return `${kobo} Kobo`;
    
    let words = this.numberToWords(naira) + ' ' + currencySymbol;
    if (kobo > 0) {
      words += ` and ${this.numberToWords(kobo)} Kobo`;
    }
    return words;
  }

  private numberToWords(num: number): string {
    if (num === 0) return 'Zero';
    
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Million', 'Billion'];
    
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const u = num % 10;
      return tens[t] + (u > 0 ? ' ' + units[u] : '');
    }
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const r = num % 100;
      return units[h] + ' Hundred' + (r > 0 ? ' and ' + this.numberToWords(r) : '');
    }
    
    let result = '';
    let remaining = num;
    let group = 0;
    
    while (remaining > 0) {
      const chunk = remaining % 1000;
      if (chunk > 0) {
        const chunkWords = this.numberToWords(chunk);
        result = chunkWords + (thousands[group] ? ' ' + thousands[group] : '') + (result ? ' ' + result : '');
      }
      remaining = Math.floor(remaining / 1000);
      group++;
    }
    
    return result;
  }

  markAsPaid(): void {
    if (this.invoice && confirm(`Mark invoice ${this.invoice.invoiceNumber} as paid?`)) {
      this.salesService.updateInvoice(this.invoice.id, { 
        status: 'PAID', 
        amountPaid: this.invoice.totalAmount, 
        balanceDue: 0,
        paidAt: new Date()
      }).subscribe({
        next: (updated: Invoice) => {
          this.invoice = updated;
          alert(`Invoice ${this.invoice!.invoiceNumber} has been marked as paid`);
        },
        error: (err: any) => {
          console.error('Error marking invoice as paid:', err);
          alert('Failed to mark invoice as paid. Please try again.');
        }
      });
    }
  }

  sendInvoice(): void {
    if (this.invoice && confirm(`Send invoice ${this.invoice.invoiceNumber} to ${this.invoice.customerName}?`)) {
      this.salesService.updateInvoice(this.invoice.id, { status: 'SENT' }).subscribe({
        next: (updated: Invoice) => {
          this.invoice = updated;
          alert(`Invoice ${updated.invoiceNumber} has been sent successfully.`);
          
          if (updated.quoteId) {
            this.salesService.updateQuote(updated.quoteId, { status: 'CONVERTED' }).subscribe({
              next: () => console.log(`Quote ${updated.quoteId} updated to CONVERTED`),
              error: (err) => console.error('Error updating quote to CONVERTED:', err)
            });
          }
        },
        error: (err: any) => {
          console.error('Error sending invoice:', err);
          alert('Failed to send invoice. Please try again.');
        }
      });
    }
  }

  recordPayment(amount: number): void {
    if (!this.invoice || amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const currentPaid = this.invoice.amountPaid || 0;
    const newPaid = currentPaid + amount;
    const balance = Math.max(0, this.invoice.totalAmount - newPaid);
    const newStatus: InvoiceStatus = balance <= 0 ? 'PAID' : 'PARTIAL';

    const updates: Partial<Invoice> = {
      amountPaid: newPaid,
      balanceDue: balance,
      status: newStatus
    };

    if (newStatus === 'PAID') {
      updates.paidAt = new Date();
    }

    this.salesService.updateInvoice(this.invoice.id, updates).subscribe({
      next: (updated: Invoice) => {
        this.invoice = updated;
        this.showPaymentModal = false;
        this.paymentAmount = 0;
        alert(`Payment of ${this.formatCurrency(amount)} recorded successfully. Invoice status: ${newStatus}`);
      },
      error: (err: any) => {
        console.error('Error recording payment:', err);
        alert('Failed to record payment. Please try again.');
      }
    });
  }

  cancelInvoice(): void {
    if (this.invoice && confirm(`Are you sure you want to cancel invoice ${this.invoice.invoiceNumber}?`)) {
      this.salesService.updateInvoice(this.invoice.id, { status: 'CANCELLED' }).subscribe({
        next: (updated: Invoice) => {
          this.invoice = updated;
          alert(`Invoice ${updated.invoiceNumber} has been cancelled.`);
        },
        error: (err: any) => {
          console.error('Error cancelling invoice:', err);
          alert('Failed to cancel invoice. Please try again.');
        }
      });
    }
  }

  markAsOverdue(): void {
    if (this.invoice && confirm(`Mark invoice ${this.invoice.invoiceNumber} as overdue?`)) {
      this.salesService.updateInvoice(this.invoice.id, { status: 'OVERDUE' }).subscribe({
        next: (updated: Invoice) => {
          this.invoice = updated;
          alert(`Invoice ${updated.invoiceNumber} marked as overdue.`);
        },
        error: (err: any) => {
          console.error('Error marking invoice as overdue:', err);
          alert('Failed to mark invoice as overdue. Please try again.');
        }
      });
    }
  }

  goBack(): void {
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

  editInvoice(): void {
    if (this.edit.observed) {
      this.edit.emit(this.invoice!.id);
    } else {
      const uuid = this.route.snapshot.paramMap.get('uuid');
      if (uuid) {
        this.router.navigate(['/admin/sales/invoices', this.invoice!.id, 'edit', uuid]);
      } else {
        this.router.navigate(['/admin/sales/invoices', this.invoice!.id, 'edit']);
      }
    }
  }

  viewCustomer(): void {
    if (this.invoice && this.invoice.customerId) {
      const uuid = this.route.snapshot.paramMap.get('uuid');
      if (uuid) {
        this.router.navigate(['/admin/sales/customers', this.invoice.customerId, uuid]);
      } else {
        this.router.navigate(['/admin/sales/customers', this.invoice.customerId]);
      }
    }
  }
}
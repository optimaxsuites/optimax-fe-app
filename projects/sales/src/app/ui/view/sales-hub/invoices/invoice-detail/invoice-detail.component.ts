// src/app/ui/view/sales-module/invoice-detail/invoice-detail.component.ts

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SalesService } from '../../../../service/sales/sales.service';
import { Invoice, InvoiceStatus, PaymentMethod, SaleLifecycleStatus, SalesandTransactions } from '../../../../domain/sales/sales.dto';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';
import { SharedOverlayModule } from '../../../../../shared-overlay.module';
import { PaymentReceiptComponent } from '../../payment-receipt/payment-receipt.component';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, BackButtonComponent, SharedOverlayModule, PaymentReceiptComponent],
  templateUrl: './invoice-detail.component.html',
  styleUrls: ['./invoice-detail.component.scss']
})
export class InvoiceDetailComponent implements OnInit {
  @Input() detailId?: string;
  @Output() closed = new EventEmitter<void>();
  @Output() edit = new EventEmitter<string>();

  invoice: any = null;
  isLoading = true;
  showPaymentModal = false;
  paymentAmount = 0;
  isDownloading = false;

  selectedReceiptPaymentId?: string | number;
  showReceiptModal = false;

  openReceiptForPayment(paymentId: string | number): void {
    this.selectedReceiptPaymentId = paymentId;
    this.showReceiptModal = true;
  }

  closeReceipt(): void {
    this.selectedReceiptPaymentId = undefined;
    this.showReceiptModal = false;
  }

  invoicePayments: SalesandTransactions[] = [];
  paymentMethod: PaymentMethod = 'BANK_TRANSFER';
  paymentReference = '';
  paymentNotes = '';
  paymentDate = new Date().toISOString().substring(0, 10);
  isSavingPayment = false;

  paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CARD', label: 'Credit/Debit Card' },
    { value: 'CASH', label: 'Cash' },
    { value: 'POS', label: 'POS Terminal' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money' },
    { value: 'CHEQUE', label: 'Cheque' }
  ];

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
        if (invoice) {
          this.loadPaymentsForInvoice(invoice.id);
        } else {
          this.isLoading = false;
        }
      },
      error: (err: any) => {
        console.error('Error loading invoice:', err);
        this.isLoading = false;
      }
    });
  }

  loadPaymentsForInvoice(invoiceId: string | number): void {
    this.salesService.getSalesandTransactions({ invoiceId, size: 100 }).subscribe({
      next: (res) => {
        this.invoicePayments = res.data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading invoice payments:', err);
        this.isLoading = false;
      }
    });
  }

  openPaymentModal(): void {
    if (this.invoice) {
      this.paymentAmount = this.invoice.balanceDue || 0;
      this.paymentMethod = 'BANK_TRANSFER';
      this.paymentReference = '';
      this.paymentNotes = '';
      this.paymentDate = new Date().toISOString().substring(0, 10);
      this.showPaymentModal = true;
    }
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
  }

  savePayment(): void {
    if (!this.invoice || this.paymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    
    const balanceDue = this.invoice.balanceDue || 0;
    if (this.paymentAmount > balanceDue) {
      if (!confirm(`The amount exceeds the invoice's balance due (${this.formatCurrency(balanceDue)}). Proceed?`)) {
        return;
      }
    }

    this.isSavingPayment = true;
    
    const payload: Partial<SalesandTransactions> = {
      invoiceId: this.invoice,
      customerId: this.invoice.customerId,
      customerName: this.invoice.customerName,
      paidAmount: this.paymentAmount,
      totalAmount: this.invoice.totalAmount,
      currency: this.invoice.currency,
      paymentMethod: this.paymentMethod,
      reference: this.paymentReference.trim() || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'PAYMENT_COMPLETED',
      orderDate: new Date(this.paymentDate),
      transactionNotes: this.paymentNotes.trim(),
      balanceDue: Math.max(0, balanceDue - this.paymentAmount)
    };

    this.salesService.createSalesandTransactions(payload).subscribe({
      next: (res) => {
        this.isSavingPayment = false;
        this.showPaymentModal = false;
        this.loadInvoice(this.invoice!.id);
        this.openReceiptForPayment(String(res.id) || '');
      },
      error: (err) => {
        this.isSavingPayment = false;
        console.error('Error recording payment:', err);
        alert('Failed to record payment. Please try again.');
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
    return this.invoice.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
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



  showSendInvoiceModal = false;
  showCancelInvoiceModal = false;
  pendingInvoiceNumber = '';
  pendingCustomerName = '';

  sendInvoice(): void {
    if (!this.invoice) return;
    const custName = (this.invoice.customerName as any)?.name || this.invoice.customerName || 'Customer';
    this.pendingInvoiceNumber = this.invoice.invoiceNumber || '';
    this.pendingCustomerName = custName;
    this.showSendInvoiceModal = true;
  }

  confirmSendInvoice(): void {
    if (!this.invoice) return;
    this.showSendInvoiceModal = false;
    this.salesService.updateInvoice(this.invoice.id, { status: 'SENT' }).subscribe({
      next: (updated: Invoice) => {
        this.invoice = updated;
        if (updated.quoteId) {
          this.salesService.updateQuote(updated.quoteId, { status: 'CONVERTED' }).subscribe({
            next: () => console.log(`Quote ${updated.quoteId} updated to CONVERTED`),
            error: (err) => console.error('Error updating quote to CONVERTED:', err)
          });
        }
      },
      error: (err: any) => {
        console.error('Error sending invoice:', err);
      }
    });
  }

  cancelInvoice(): void {
    if (!this.invoice) return;
    this.pendingInvoiceNumber = this.invoice.invoiceNumber || '';
    this.showCancelInvoiceModal = true;
  }

  confirmCancelInvoice(): void {
    if (!this.invoice) return;
    this.showCancelInvoiceModal = false;
    this.salesService.updateInvoice(this.invoice.id, { status: 'CANCELLED' }).subscribe({
      next: (updated: Invoice) => {
        this.invoice = updated;
      },
      error: (err: any) => {
        console.error('Error cancelling invoice:', err);
      }
    });
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

  goToInvoicesList(): void {
    const sessionStorageKey = 'dashboard-catalog-quotes-invoices-orders-customers-transactions';
    sessionStorage.setItem(sessionStorageKey, 'Invoices');

    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/sales-hub', uuid]);
    } else {
      this.router.navigate(['/admin/sales/sales-hub']);
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

  downloadPDF(): void {
    const element = document.getElementById('invoice-detail-sheet');
    if (element) {
      this.isDownloading = true;
      element.classList.add('pdf-printing-active');
      
      setTimeout(() => {
        html2canvas(element, { 
          scale: 2, 
          useCORS: true, 
          allowTaint: true,
          backgroundColor: '#ffffff'
        }).then((canvas) => {
          element.classList.remove('pdf-printing-active');
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const imgWidth = 210; // A4 size width
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
          pdf.save(`Invoice-${this.invoice?.invoiceNumber || 'Detail'}.pdf`);
          this.isDownloading = false;
        }).catch(err => {
          element.classList.remove('pdf-printing-active');
          console.error('Error generating PDF:', err);
          this.isDownloading = false;
          alert('Failed to generate PDF. Printing window instead.');
          window.print();
        });
      }, 50);
    } else {
      alert('Could not find element to export. Printing window instead.');
      window.print();
    }
  }
}
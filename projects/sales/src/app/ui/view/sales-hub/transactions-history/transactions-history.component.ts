import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../service/sales/sales.service';
import { Payment, PaymentStatus, PaymentMethod, Invoice } from '../../../domain/sales/sales.dto';
import { SharedOverlayModule } from '../../../../shared-overlay.module';
import { TransactionHistoryDetailComponent } from '../transaction-history-detail/transaction-history-detail.component';

@Component({
  selector: 'app-transactions-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SharedOverlayModule,
    TransactionHistoryDetailComponent
  ],
  templateUrl: './transactions-history.component.html',
  styleUrl: './transactions-history.component.scss'
})
export class TransactionsHistoryComponent implements OnInit, OnDestroy {
  Math = Math;
  
  payments: Payment[] = [];
  invoices: Invoice[] = [];
  isLoading = true;
  activeSubTab: 'payments' | 'billing' = 'payments';
  
  selectedPaymentId?: string;
  showPaymentDetail = false;
  
  // Filters
  filters = {
    status: 'ALL',
    searchTerm: '',
    dateFrom: '',
    dateTo: '',
    page: 0,
    size: 10
  };

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // Stats
  stats = {
    totalCollected: 0,
    pending: 0,
    failed: 0,
    refunded: 0
  };

  // Modals & Forms
  showPaymentModal = false;
  isSaving = false;
  
  paymentForm = {
    invoiceId: '',
    amount: 0,
    method: 'BANK_TRANSFER' as PaymentMethod,
    reference: '',
    notes: '',
    paymentDate: new Date().toISOString().substring(0, 10)
  };

  selectedInvoiceForPayment?: Invoice;

  paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CARD', label: 'Credit/Debit Card' },
    { value: 'CASH', label: 'Cash' },
    { value: 'POS', label: 'POS Terminal' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money' },
    { value: 'CHEQUE', label: 'Cheque' }
  ];

  paymentStatusOptions: { value: PaymentStatus | 'ALL'; label: string; color: string }[] = [
    { value: 'ALL', label: 'All Transactions', color: 'gray' },
    { value: 'COMPLETED', label: 'Completed', color: 'green' },
    { value: 'PENDING', label: 'Pending', color: 'yellow' },
    { value: 'FAILED', label: 'Failed', color: 'red' },
    { value: 'REFUNDED', label: 'Refunded', color: 'purple' }
  ];

  private destroy$ = new Subject<void>();

  constructor(private salesService: SalesService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.isLoading = true;
    this.loadInvoices();
    this.loadPayments();
  }

  loadPayments(): void {
    this.salesService.getPayments(this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.payments = response.data;
          this.totalElements = response.total;
          this.totalPages = Math.ceil(response.total / this.filters.size);
          this.calculateStats();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading payments:', err);
          this.isLoading = false;
        }
      });
  }

  loadInvoices(): void {
    // Load all invoices for dropdown selection and billing overview
    this.salesService.getInvoices({ status: 'ALL', searchTerm: '', page: 0, size: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.invoices = response.data;
        },
        error: (err) => {
          console.error('Error loading invoices for transactions:', err);
        }
      });
  }

  calculateStats(): void {
    // We calculate statistics using all payments in local storage
    this.salesService.getPayments({ status: 'ALL', size: 1000 }).subscribe({
      next: (response) => {
        const allPayments = response.data;
        this.stats = {
          totalCollected: allPayments.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0),
          pending: allPayments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0),
          failed: allPayments.filter(p => p.status === 'FAILED').reduce((sum, p) => sum + p.amount, 0),
          refunded: allPayments.filter(p => p.status === 'REFUNDED').reduce((sum, p) => sum + p.amount, 0)
        };
      }
    });
  }

  applyFilters(): void {
    this.filters.page = 0;
    this.currentPage = 0;
    this.loadPayments();
  }

  resetFilters(): void {
    this.filters = {
      status: 'ALL',
      searchTerm: '',
      dateFrom: '',
      dateTo: '',
      page: 0,
      size: 10
    };
    this.currentPage = 0;
    this.loadPayments();
  }

  onPageChange(page: number): void {
    this.filters.page = page;
    this.currentPage = page;
    this.loadPayments();
  }

  // Modals
  openRecordPaymentModal(): void {
    this.paymentForm = {
      invoiceId: '',
      amount: 0,
      method: 'BANK_TRANSFER',
      reference: '',
      notes: '',
      paymentDate: new Date().toISOString().substring(0, 10)
    };
    this.selectedInvoiceForPayment = undefined;
    this.showPaymentModal = true;
  }

  closeRecordPaymentModal(): void {
    this.showPaymentModal = false;
  }

  openPaymentDetail(paymentId: string): void {
    this.selectedPaymentId = paymentId;
    this.showPaymentDetail = true;
  }

  closePaymentDetail(): void {
    this.selectedPaymentId = undefined;
    this.showPaymentDetail = false;
    this.loadData();
  }

  onInvoiceSelect(event: any): void {
    const invoiceId = event.target.value;
    this.selectedInvoiceForPayment = this.invoices.find(i => i.id === invoiceId);
    if (this.selectedInvoiceForPayment) {
      // Auto-set the payment amount to the balance due
      this.paymentForm.amount = this.selectedInvoiceForPayment.balanceDue;
    } else {
      this.paymentForm.amount = 0;
    }
  }

  savePayment(): void {
    if (!this.paymentForm.invoiceId) {
      alert('Please select an invoice');
      return;
    }
    if (this.paymentForm.amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    if (this.selectedInvoiceForPayment && this.paymentForm.amount > this.selectedInvoiceForPayment.balanceDue) {
      if (!confirm(`The payment amount exceeds the balance due (${this.formatCurrency(this.selectedInvoiceForPayment.balanceDue)}). Do you want to proceed?`)) {
        return;
      }
    }

    this.isSaving = true;
    const invoice = this.selectedInvoiceForPayment!;
    
    const paymentPayload: Partial<Payment> = {
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      amount: this.paymentForm.amount,
      currency: invoice.currency,
      method: this.paymentForm.method,
      reference: this.paymentForm.reference.trim() || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'COMPLETED' as PaymentStatus, // Defaulting to COMPLETED for direct records
      paymentDate: new Date(this.paymentForm.paymentDate),
      notes: this.paymentForm.notes.trim()
    };

    this.salesService.recordPayment(paymentPayload).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.closeRecordPaymentModal();
        alert(`Payment recorded successfully with transaction number: ${res.paymentNumber}`);
        this.loadData();
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Error saving payment:', err);
        alert('Failed to record payment. Please try again.');
      }
    });
  }

  // Formatting helpers
  formatCurrency(amount: number, currency: string = 'NGN'): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  // Payment Status badging
  getPaymentStatusBadgeClass(status: PaymentStatus): string {
    const classes: Record<PaymentStatus, string> = {
      'COMPLETED': 'status-paid',
      'PENDING': 'status-pending',
      'FAILED': 'status-failed',
      'REFUNDED': 'status-refunded'
    };
    return classes[status] || 'status-pending';
  }

  getPaymentStatusLabel(status: PaymentStatus): string {
    const labels: Record<PaymentStatus, string> = {
      'COMPLETED': 'Completed',
      'PENDING': 'Pending',
      'FAILED': 'Failed',
      'REFUNDED': 'Refunded'
    };
    return labels[status] || status;
  }

  // Dynamic Invoice Payment Status (Paid, Partial, Overdue, Unpaid)
  getInvoicePaymentStatus(invoice: Invoice): 'PAID' | 'PARTIAL' | 'OVERDUE' | 'UNPAID' | 'CANCELLED' {
    if (invoice.status === 'CANCELLED') {
      return 'CANCELLED';
    }
    if (invoice.balanceDue === 0) {
      return 'PAID';
    }
    if (invoice.amountPaid > 0) {
      return 'PARTIAL';
    }
    const isOverdue = new Date(invoice.dueDate) < new Date() && new Date(invoice.dueDate).toDateString() !== new Date().toDateString();
    if (isOverdue) {
      return 'OVERDUE';
    }
    return 'UNPAID';
  }

  getInvoiceStatusBadgeClass(invoice: Invoice): string {
    const status = this.getInvoicePaymentStatus(invoice);
    const classes: Record<string, string> = {
      'PAID': 'status-paid',
      'PARTIAL': 'status-partial',
      'OVERDUE': 'status-failed',
      'UNPAID': 'status-pending',
      'CANCELLED': 'status-cancelled'
    };
    return classes[status] || 'status-pending';
  }

  getInvoiceStatusLabel(invoice: Invoice): string {
    const status = this.getInvoicePaymentStatus(invoice);
    const labels: Record<string, string> = {
      'PAID': 'Paid',
      'PARTIAL': 'Partial',
      'OVERDUE': 'Overdue',
      'UNPAID': 'Unpaid',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  getPageNumbers(): number[] {
    const maxVisible = 5;
    let start = Math.max(0, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible);
    
    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }
    
    return Array.from({ length: end - start }, (_, i) => start + i);
  }
}

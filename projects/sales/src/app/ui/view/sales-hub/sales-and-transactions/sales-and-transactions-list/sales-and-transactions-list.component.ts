import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { SalesandTransactions, SaleLifecycleStatus, PaymentMethod } from '../../../../domain/sales/sales.dto';
import { SharedOverlayModule } from '../../../../../shared-overlay.module';
import { PaymentReceiptComponent } from '../../payment-receipt/payment-receipt.component';

@Component({
  selector: 'app-sales-and-transactions-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedOverlayModule,
    PaymentReceiptComponent
  ],
  templateUrl: './sales-and-transactions-list.component.html',
  styleUrls: ['./sales-and-transactions-list.component.scss']
})
export class SalesAndTransactionsListComponent implements OnInit, OnDestroy {
  protected readonly Math = Math;

  transactions: SalesandTransactions[] = [];
  filteredTransactions: SalesandTransactions[] = [];
  isLoading: boolean = false;
  searchTerm: string = '';
  selectedStatus: string = 'ALL';

  // Record Payment Modal State
  showPaymentModal = false;
  selectedTxForPayment: SalesandTransactions | null = null;
  paymentAmount: number = 0;
  paymentMethod: PaymentMethod = 'BANK_TRANSFER';
  paymentReference: string = '';
  paymentNotes: string = '';
  paymentDate: string = new Date().toISOString().substring(0, 10);
  isSavingPayment = false;

  paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'BANK_TRANSFER', label: 'Bank Transfer (EFT)' },
    { value: 'CARD', label: 'Credit / Debit Card' },
    { value: 'CASH', label: 'Cash Payment' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'POS', label: 'Point of Sale (POS)' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money' }
  ];

  // Print Receipt Modal State
  showReceiptModal = false;
  selectedReceiptTx: SalesandTransactions | null = null;
  selectedTxId: number | string | null = null;
  showDetailModal: boolean = false;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;

  statusOptions: { label: string; value: string }[] = [
    { label: 'All Lifecycle Statuses', value: 'ALL' },
    { label: 'Quote Sent', value: 'QUOTE_SENT' },
    { label: 'Quote Accepted', value: 'QUOTE_ACCEPTED' },
    { label: 'Quote Converted', value: 'QUOTE_CONVERTED' },
    { label: 'Invoice Sent', value: 'INVOICE_SENT' },
    { label: 'Payment Pending', value: 'PAYMENT_PENDING' },
    { label: 'Payment Completed', value: 'PAYMENT_COMPLETED' },
    { label: 'Dispatched', value: 'DISPATCHED' },
    { label: 'Delivered', value: 'DELIVERED' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private salesService: SalesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTransactions(): void {
    this.isLoading = true;
    this.salesService.getSalesandTransactions({ size: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.transactions = res.data || [];
          this.applyFilters();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading sales and transactions:', err);
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    let result = [...this.transactions];

    if (this.selectedStatus !== 'ALL') {
      result = result.filter(tx => tx.status === this.selectedStatus);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(tx => 
        (tx.orderId || '').toLowerCase().includes(term) ||
        (tx.quoteId?.quoteNumber || '').toLowerCase().includes(term) ||
        (tx.paymentNumber || '').toLowerCase().includes(term) ||
        (tx.reference || '').toLowerCase().includes(term) ||
        (this.getCustomerName(tx)).toLowerCase().includes(term)
      );
    }

    this.totalPages = Math.ceil(result.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    this.filteredTransactions = result.slice(start, start + this.pageSize);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'ALL';
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyFilters();
    }
  }

  getPageNumbers(): number[] {
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  getStatusCount(status: string): number {
    return this.transactions.filter(tx => tx.status === status).length;
  }

  getCustomerName(tx: SalesandTransactions): string {
    if (!tx) return 'N/A';
    if (typeof tx.customerName === 'object' && tx.customerName?.name) {
      return tx.customerName.name;
    }
    if (typeof tx.customerId === 'object' && tx.customerId?.name) {
      return tx.customerId.name;
    }
    return String(tx.customerName || tx.customerId || 'N/A');
  }

  getQuoteNumber(tx: SalesandTransactions): string {
    if (!tx) return '-';
    if (tx.quoteId && typeof tx.quoteId === 'object') {
      return tx.quoteId.quoteNumber || '-';
    }
    return '-';
  }

  viewDetails(tx: SalesandTransactions): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    const txIdStr = String(tx.id);
    if (uuid) {
      this.router.navigate(['/admin/sales/sales-and-transactions', txIdStr, uuid]);
    } else {
      this.router.navigate(['/admin/sales/sales-and-transactions', txIdStr]);
    }
  }

  getStatusBadgeClass(status: SaleLifecycleStatus | string): string {
    switch (status) {
      case 'QUOTE_SENT': return 'badge-sent';
      case 'QUOTE_ACCEPTED':
      case 'QUOTE_CONVERTED': return 'badge-converted';
      case 'QUOTE_REJECTED': return 'badge-rejected';
      case 'INVOICE_SENT': return 'badge-invoice';
      case 'PAYMENT_PENDING':
      case 'PAYMENT_IN_PROGRESS': return 'badge-pending';
      case 'PAYMENT_COMPLETED':
      case 'RECEIPT_GENERATED': return 'badge-completed';
      case 'PAYMENT_FAILED': return 'badge-failed';
      case 'DISPATCHED':
      case 'IN_TRANSIT': return 'badge-transit';
      case 'DELIVERED': return 'badge-delivered';
      case 'RETURNED': return 'badge-returned';
      default: return 'badge-default';
    }
  }

  formatStatusLabel(status: SaleLifecycleStatus | string): string {
    if (!status) return 'DRAFT';
    return status.replace(/_/g, ' ');
  }

  formatCurrency(amount: number, currency: string = 'NGN'): string {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₦';
    return `${symbol}${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  openPaymentModal(tx: SalesandTransactions, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedTxForPayment = tx;
    const isMonthly = tx.PaymentMode === 'MONTHLY' || (tx.installmentNumber && tx.installmentNumber > 1);
    if (isMonthly && tx.installmentNumber) {
      const perInstallment = (tx.totalAmount || 0) / tx.installmentNumber;
      this.paymentAmount = tx.balanceDue > 0 ? Math.min(perInstallment, tx.balanceDue) : perInstallment;
    } else {
      this.paymentAmount = tx.balanceDue > 0 ? tx.balanceDue : (tx.totalAmount || 0) - (tx.paidAmount || 0);
    }

    this.paymentMethod = tx.paymentMethod || 'BANK_TRANSFER';
    this.paymentReference = '';
    this.paymentNotes = '';
    this.paymentDate = new Date().toISOString().substring(0, 10);
    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedTxForPayment = null;
  }

  openReceiptModal(tx: SalesandTransactions, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedReceiptTx = tx;
    this.showReceiptModal = true;
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
    this.selectedReceiptTx = null;
  }

  savePayment(): void {
    if (!this.selectedTxForPayment || this.paymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    const tx = this.selectedTxForPayment;
    const currentBalance = tx.balanceDue !== undefined ? tx.balanceDue : ((tx.totalAmount || 0) - (tx.paidAmount || 0));

    if (this.paymentAmount > currentBalance && currentBalance > 0) {
      if (!confirm(`The payment amount (${this.formatCurrency(this.paymentAmount, tx.currency)}) exceeds the balance due (${this.formatCurrency(currentBalance, tx.currency)}). Proceed?`)) {
        return;
      }
    }

    this.isSavingPayment = true;
    const newPaidAmount = (tx.paidAmount || 0) + this.paymentAmount;
    const newBalanceDue = Math.max(0, (tx.totalAmount || 0) - newPaidAmount);
    const newCompletedInstallments = (tx.completedInstallments || 0) + 1;
    const newStatus: SaleLifecycleStatus = newBalanceDue === 0 ? 'PAYMENT_COMPLETED' : 'PAYMENT_IN_PROGRESS';

    const updatePayload: Partial<SalesandTransactions> = {
      paidAmount: newPaidAmount,
      balanceDue: newBalanceDue,
      completedInstallments: newCompletedInstallments,
      paymentMethod: this.paymentMethod,
      status: newStatus,
      reference: this.paymentReference.trim() || tx.reference || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      transactionNotes: this.paymentNotes.trim() || tx.transactionNotes
    };

    this.salesService.updateSalesandTransactions(tx.id, updatePayload).subscribe({
      next: (updatedTx) => {
        this.isSavingPayment = false;
        this.closePaymentModal();
        this.loadTransactions();
        this.openReceiptModal(updatedTx || tx);
      },
      error: (err) => {
        this.isSavingPayment = false;
        console.error('Error saving transaction payment:', err);
        alert('Failed to record payment. Please try again.');
      }
    });
  }
}

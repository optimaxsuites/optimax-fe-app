import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { deriveOrderProgress, OrderFilter, OrderProgress } from '../../../../service/sales/order-progress';
import { SalesandTransactions, SaleLifecycleStatus, PaymentMethod } from '../../../../domain/sales/sales.dto';
import { parseApiDate } from '../../../../service/sales/date.util';
import { SharedOverlayModule } from '../../../../../shared-overlay.module';
import { PaymentReceiptComponent } from '../../payment-receipt/payment-receipt.component';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-sales-and-transactions-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedOverlayModule,
    PaymentReceiptComponent,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './sales-and-transactions-list.component.html',
  styleUrls: ['./sales-and-transactions-list.component.scss']
})
export class SalesAndTransactionsListComponent implements OnInit, OnDestroy {
  protected readonly Math = Math;

  transactions: SalesandTransactions[] = [];
  filteredTransactions: SalesandTransactions[] = [];
  customers: any[] = [];
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

  // Statuses reached before an invoice has actually been sent — the delivery note step in the
  // sales flow (Quotation -> Convert -> Invoice -> Delivery Tracking -> Delivery Note -> Receipt)
  // only makes sense once there's an invoice out the door, and INVOICE_CANCELLED means there
  // never will be for this transaction.
  private static readonly PRE_INVOICE_STATUSES: readonly SaleLifecycleStatus[] = [
    'QUOTE_SENT', 'QUOTE_ACCEPTED', 'QUOTE_REJECTED', 'QUOTE_CONVERTED', 'INVOICE_CANCELLED'
  ];

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;

  // Sidebar date-range filter
  filters: { dateFrom: string; dateTo: string } = { dateFrom: '', dateTo: '' };

  // AI insight banner
  aiDismissed = false;

  // Row selection (bulk actions bar)
  selectedTransactionIds: number[] = [];

  /** Sidebar filters by where each order actually is (see order-progress.ts). */
  readonly stageFilters: { value: OrderFilter; label: string; icon: string; pill: string }[] = [
    { value: 'QUOTE', label: 'Quote Stage', icon: 'fa-file-invoice', pill: 'blue' },
    { value: 'AWAITING_LPO', label: 'Awaiting LPO', icon: 'fa-hourglass-half', pill: 'orange' },
    { value: 'IN_DELIVERY', label: 'In Delivery', icon: 'fa-truck', pill: 'blue' },
    { value: 'DELIVERED', label: 'Delivered', icon: 'fa-home', pill: 'green' },
    { value: 'INVOICED', label: 'Awaiting Payment', icon: 'fa-file-invoice-dollar', pill: 'orange' },
    { value: 'PAID', label: 'Paid', icon: 'fa-check-circle', pill: 'green' },
    { value: 'STOPPED', label: 'Declined / Cancelled', icon: 'fa-exclamation-circle', pill: 'red' }
  ];

  /** Each order's progress, worked out from its quote, LPO, delivery note and invoice. */
  private progressById = new Map<number, OrderProgress>();
  /** Each order's full quote and invoice — the order may only carry their ids. */
  private linkedById = new Map<number, { quote: any; invoice: any }>();

  progressOf(tx: SalesandTransactions): OrderProgress {
    return this.progressById.get(tx.id) || deriveOrderProgress({ tx, quote: tx.quoteId, invoice: tx.invoiceId });
  }

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

  get todayDateString(): string {
    return new Date().toISOString().substring(0, 10);
  }

  constructor(
    private salesService: SalesService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Normalizes a raw API date value before handing it to the `date` pipe —
  // the pipe treats a raw number as milliseconds, which breaks on backend
  // records whose timestamps are epoch seconds.
  toDate(value: unknown): Date | null {
    return parseApiDate(value);
  }

  /** See SalesService.orderNumberFor() — the backend's number, or one derived from the record. */
  orderNumberOf(tx: any): string {
    return this.salesService.orderNumberFor(tx);
  }

  loadTransactions(): void {
    this.isLoading = true;
    // This component does its own search/status/date-range filtering and pagination over the
    // full set below (applyFilters()), so it needs everything up front rather than a capped
    // page — a small size here would silently hide anything past the cap from search/filters.
    forkJoin({
      transactions: this.salesService.getSalesandTransactions({ size: 1000 }),
      customers: this.salesService.getCustomers({ page: 0, size: 1000 }),
      notes: this.salesService.getDeliveryNotes({ size: 1000 }),
      lpos: this.salesService.getSalesLpos(),
      quotes: this.salesService.getQuotes({ size: 1000 }),
      invoices: this.salesService.getInvoices({ size: 1000 })
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ transactions, customers, notes, lpos, quotes, invoices }: any) => {
          this.customers = customers.data || [];
          this.transactions = transactions.data || [];
          this.indexProgress(notes?.data || [], lpos || [], quotes?.data || [], invoices?.data || []);
          this.applyFilters();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading sales and transactions:', err);
          this.isLoading = false;
        }
      });
  }

  /** Works out every order's stage once per load, from its linked documents. */
  private indexProgress(notes: any[], lpos: any[], quotes: any[], invoices: any[]): void {
    const quoteById = new Map(quotes.map(q => [String(q.id), q]));
    const invoiceById = new Map(invoices.map(i => [String(i.id), i]));
    const noteByOrder = new Map<string, any>();
    const noteByQuote = new Map<string, any>();
    notes.forEach(n => {
      if (n.salesOrderId != null) noteByOrder.set(String(n.salesOrderId), n);
      if (n.quoteId != null) noteByQuote.set(String(n.quoteId), n);
    });
    const lpoQuotes = new Set(lpos.filter(l => l.status !== 'REJECTED').map(l => String(l.quoteId)));

    this.progressById.clear();
    this.linkedById.clear();
    this.transactions.forEach(tx => {
      const nestedQuote: any = tx.quoteId && typeof tx.quoteId === 'object' ? tx.quoteId : null;
      const quoteId = nestedQuote?.id ?? tx.quoteId;
      const quote: any = (quoteId != null ? quoteById.get(String(quoteId)) : undefined) || nestedQuote;
      const nestedInvoice: any = tx.invoiceId && typeof tx.invoiceId === 'object' ? tx.invoiceId : null;
      const invoiceId = nestedInvoice?.id ?? tx.invoiceId;
      const invoice: any = (invoiceId != null ? invoiceById.get(String(invoiceId)) : undefined) || nestedInvoice;
      this.linkedById.set(tx.id, { quote, invoice });
      const hasLpo = (quoteId != null && lpoQuotes.has(String(quoteId))) || !!this.salesService.getQuoteLpoDocument(quote);
      const deliveryNote = noteByOrder.get(String(tx.id)) || (quoteId != null ? noteByQuote.get(String(quoteId)) : undefined);
      this.progressById.set(tx.id, deriveOrderProgress({ tx, quote, hasLpo, deliveryNote, invoice }));
    });
  }

  applyFilters(): void {
    let result = [...this.transactions];

    if (this.selectedStatus !== 'ALL') {
      result = result.filter(tx => this.progressOf(tx).filter === this.selectedStatus);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(tx =>
        this.orderNumberOf(tx).toLowerCase().includes(term) ||
        this.getQuoteNumber(tx).toLowerCase().includes(term) ||
        (tx.paymentNumber || '').toLowerCase().includes(term) ||
        (tx.reference || '').toLowerCase().includes(term) ||
        (this.getCustomerName(tx)).toLowerCase().includes(term)
      );
    }

    if (this.filters.dateFrom) {
      const from = new Date(this.filters.dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter(tx => {
        const created = this.toDate(tx.quoteConvertedDate || tx.orderDate);
        return !!created && created >= from;
      });
    }

    if (this.filters.dateTo) {
      const to = new Date(this.filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(tx => {
        const created = this.toDate(tx.quoteConvertedDate || tx.orderDate);
        return !!created && created <= to;
      });
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
    this.filters = { dateFrom: '', dateTo: '' };
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

  onPageSizeChange(size: number): void {
    this.pageSize = Number(size);
    this.currentPage = 1;
    this.applyFilters();
  }

  // ============================================================
  // ROW SELECTION (bulk actions bar)
  // ============================================================

  isSelected(id: number): boolean {
    return this.selectedTransactionIds.includes(id);
  }

  toggleSelection(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.isSelected(id)) {
        this.selectedTransactionIds = [...this.selectedTransactionIds, id];
      }
    } else {
      this.selectedTransactionIds = this.selectedTransactionIds.filter(x => x !== id);
    }
  }

  isAllSelected(): boolean {
    return this.filteredTransactions.length > 0
      && this.filteredTransactions.every(tx => this.isSelected(tx.id));
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const pageIds = this.filteredTransactions.map(tx => tx.id);
    if (checked) {
      this.selectedTransactionIds = Array.from(new Set([...this.selectedTransactionIds, ...pageIds]));
    } else {
      const pageIdSet = new Set(pageIds);
      this.selectedTransactionIds = this.selectedTransactionIds.filter(id => !pageIdSet.has(id));
    }
  }

  /**
   * There's no explicit "payment due date" field on a sales transaction —
   * the closest proxy is the expected delivery date: once goods should
   * already be delivered but a balance is still outstanding, the payment
   * is treated as overdue (mirrors invoice-list's isOverdue convention).
   */
  isPaymentOverdue(tx: SalesandTransactions): boolean {
    if (!tx || !(tx.balanceDue > 0)) return false;
    const due = this.toDate(tx.expectedDeliveryDate);
    if (!due) return false;
    const now = new Date();
    return due < now && due.toDateString() !== now.toDateString();
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

  getStageCount(filter: OrderFilter): number {
    return this.transactions.filter(tx => this.progressOf(tx).filter === filter).length;
  }

  getStatusCount(status: string): number {
    return this.transactions.filter(tx => tx.status === status).length;
  }

  getCustomerName(tx: SalesandTransactions | null): string {
    if (!tx) return 'N/A';
    if (typeof tx.customerName === 'object' && (tx.customerName as any)?.name) {
      return (tx.customerName as any).name;
    }
    if (typeof tx.customerId === 'object' && (tx.customerId as any)?.name) {
      return (tx.customerId as any).name;
    }
    // Resolve integer customerId against loaded customers list
    const rawId = tx.customerId ?? tx.customerName;
    if (rawId && this.customers.length) {
      const found = this.customers.find(c => c.id === rawId || String(c.id) === String(rawId));
      if (found?.name) return found.name;
    }
    return String(tx.customerName || tx.customerId || 'N/A');
  }

  getQuoteNumber(tx: SalesandTransactions): string {
    if (!tx) return '-';
    const quote = this.linkedById.get(tx.id)?.quote || (tx.quoteId && typeof tx.quoteId === 'object' ? tx.quoteId : null);
    return quote?.quoteNumber || '-';
  }

  /** The order's value from the priced document behind it — the invoice once there is one, else
   *  the quote. The order's own totalAmount is only a copy taken when the quote was created or
   *  converted, so it goes stale when the quote is edited or invoiced for a different amount. */
  amountOf(tx: SalesandTransactions): number {
    const linked = this.linkedById.get(tx.id);
    return Number(linked?.invoice?.totalAmount) || Number(linked?.quote?.totalAmount) || tx.totalAmount || 0;
  }

  currencyOf(tx: SalesandTransactions): string {
    const linked = this.linkedById.get(tx.id);
    return tx.currency || linked?.invoice?.currency || linked?.quote?.currency || 'NGN';
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
    return status
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, character => character.toUpperCase());
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

  // ============================================================
  // ROW ACTION AVAILABILITY — buttons always render; these decide whether
  // they're clickable, so a seller can always see the full action set
  // instead of buttons disappearing once they're not yet relevant.
  // ============================================================

  // Statuses where recording a payment doesn't make business sense even if balanceDue happens
  // to be stale/nonzero: no invoice exists yet (still at quote stage, or the invoice was
  // cancelled), or the order is in a terminal state where a new payment shouldn't be accepted.
  // This used to only exclude QUOTE_REJECTED/PAYMENT_FAILED — a payment could still be recorded
  // against an order whose invoice was just cancelled, or before any invoice even existed.
  private static readonly NON_PAYABLE_STATUSES: readonly SaleLifecycleStatus[] = [
    ...SalesAndTransactionsListComponent.PRE_INVOICE_STATUSES, 'PAYMENT_FAILED', 'PAYMENT_REFUNDED', 'RETURNED'
  ];

  canRecordPayment(tx: SalesandTransactions): boolean {
    return tx.balanceDue > 0 && !SalesAndTransactionsListComponent.NON_PAYABLE_STATUSES.includes(tx.status);
  }

  canViewReceipt(tx: SalesandTransactions): boolean {
    return (tx.paidAmount || 0) > 0;
  }

  savePayment(): void {
    if (!this.selectedTxForPayment || this.paymentAmount <= 0) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please enter a valid payment amount' });
      return;
    }

    if (this.paymentDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const inputDate = new Date(this.paymentDate);
      inputDate.setHours(0, 0, 0, 0);
      if (inputDate > today) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Payment date cannot be in the future.' });
        return;
      }
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
        this.syncInvoicePaymentStatus(tx, newPaidAmount, newBalanceDue);
      },
      error: (err) => {
        this.isSavingPayment = false;
        console.error('Error saving transaction payment:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to record payment. Please try again.' });
      }
    });
  }

  /**
   * Every payment is recorded here, on the SalesandTransactions record — but the linked
   * Invoice's own amountPaid/balanceDue (set once at creation, see invoice-form.component.ts)
   * never got updated afterward, so Invoice Detail's "Payment Status" card and the printed
   * receipt's "Total Paid to Date"/"Remaining Balance Due" kept showing the invoice's original,
   * pre-payment figures right next to a correct payment history on the same page.
   */
  private syncInvoicePaymentStatus(tx: SalesandTransactions, paidAmount: number, balanceDue: number): void {
    const invoiceId = (tx.invoiceId as any)?.id ?? tx.invoiceId;
    if (!invoiceId) return;
    this.salesService.updateInvoice(invoiceId, { amountPaid: paidAmount, balanceDue } as any).subscribe({
      error: (err) => console.error('Failed to sync payment status to linked invoice:', err)
    });
  }
}

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SalesService, OrderSnapshot } from '../../../../service/sales/sales.service';
import { ORDER_STAGES } from '../../../../service/sales/order-progress';
import { SalesandTransactions, SaleLifecycleStatus } from '../../../../domain/sales/sales.dto';
import { parseApiDate } from '../../../../service/sales/date.util';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';

@Component({
  selector: 'app-sales-and-transactions-detail',
  standalone: true,
  imports: [CommonModule, BackButtonComponent],
  templateUrl: './sales-and-transactions-detail.component.html',
  styleUrls: ['./sales-and-transactions-detail.component.scss']
})
export class SalesAndTransactionsDetailComponent implements OnInit, OnDestroy {
  @Input() detailId?: number | string | null;
  @Output() closed = new EventEmitter<void>();

  transaction: SalesandTransactions | null = null;
  /** The order with its quote, LPO, delivery note, invoice and customer (see getOrderSnapshot). */
  snapshot: OrderSnapshot | null = null;
  readonly stages = ORDER_STAGES;
  isLoading: boolean = true;

  private destroy$ = new Subject<void>();

  /** See SalesService.orderNumberFor(). */
  get orderNumber(): string {
    return this.salesService.orderNumberFor(this.transaction);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService
  ) {}

  // Reading route.snapshot.paramMap once here meant navigating from one order's detail URL
  // straight to another's kept showing the first order — Angular's default RouteReuseStrategy
  // reuses this component instance across same-route-pattern navigations, so ngOnInit never
  // re-ran. Subscribing to the live paramMap instead re-loads whenever the :id actually changes.
  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const idParam = this.detailId || params.get('id');
      if (idParam) {
        this.loadTransaction(idParam);
      } else {
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTransaction(id: number | string): void {
    this.isLoading = true;
    this.salesService.getOrderSnapshot(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (snapshot) => {
        this.snapshot = snapshot;
        this.transaction = snapshot?.tx || null;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading transaction details:', err);
        this.isLoading = false;
      }
    });
  }

  // Normalizes a raw API date value before handing it to the `date` pipe —
  // the pipe treats a raw number as milliseconds, which breaks on backend
  // records whose timestamps are epoch seconds.
  toDate(value: unknown): Date | null {
    return parseApiDate(value);
  }

  // deliveredAt comes back as epoch (getTime() === 0) as a "not delivered yet"
  // sentinel rather than being omitted, so treat that the same as no date.
  getDeliveredAtDate(): Date | null {
    const d = parseApiDate(this.transaction?.deliveredAt);
    return d && d.getTime() > 0 ? d : null;
  }

  private get customer(): any {
    return this.snapshot?.customer || null;
  }

  getCustomerName(): string {
    if (!this.transaction) return 'N/A';
    const tx: any = this.transaction;
    return this.customer?.name
      || (typeof tx.customerName === 'object' ? tx.customerName?.name : null)
      || (typeof tx.customerId === 'object' ? tx.customerId?.name : null)
      || 'N/A';
  }

  getCustomerEmail(): string {
    return this.customer?.email || '-';
  }

  getCustomerPhone(): string {
    return this.customer?.phone || '-';
  }

  private joinAddress(v: any): string {
    return Array.isArray(v) ? v.filter(Boolean).join(', ') : (v || '');
  }

  getBillingAddress(): string {
    return this.transaction?.billingAddress || this.joinAddress(this.customer?.address) || 'N/A';
  }

  getShippingAddress(): string {
    return this.snapshot?.deliveryNote?.deliveryAddress || this.snapshot?.deliveryNote?.customerAddress
      || this.transaction?.shippingAddress || this.joinAddress(this.customer?.deliverAddress)
      || this.getBillingAddress();
  }

  getQuoteNumber(): string {
    if (this.snapshot?.quote?.quoteNumber) return this.snapshot.quote.quoteNumber;
    if (!this.transaction?.quoteId) return 'N/A';
    if (typeof this.transaction.quoteId === 'object') {
      return this.transaction.quoteId.quoteNumber || 'N/A';
    }
    return String(this.transaction.quoteId);
  }

  getInvoiceNumber(): string {
    if (this.snapshot?.invoice?.invoiceNumber) return this.snapshot.invoice.invoiceNumber;
    if (!this.transaction?.invoiceId) return 'N/A';
    if (typeof this.transaction.invoiceId === 'object') {
      return this.transaction.invoiceId.invoiceNumber || 'N/A';
    }
    return String(this.transaction.invoiceId);
  }

  getItemsList(): any[] {
    if (this.snapshot?.items?.length) return this.snapshot.items;
    if (!this.transaction) return [];
    if (this.transaction.items && Array.isArray((this.transaction.items as any).items)) {
      return (this.transaction.items as any).items;
    }
    if (this.transaction.quoteId && Array.isArray((this.transaction.quoteId as any).items)) {
      return (this.transaction.quoteId as any).items;
    }
    return [];
  }

  /** The priced document behind the order — the invoice once there is one, else the quote. */
  private get pricedDoc(): any {
    return this.snapshot?.invoice || this.snapshot?.quote || null;
  }

  get currency(): string {
    return this.transaction?.currency || this.pricedDoc?.currency || 'NGN';
  }

  get subtotal(): number { return this.transaction?.subtotal || this.pricedDoc?.subtotal || 0; }
  get discountAmount(): number { return this.transaction?.discountAmount || this.pricedDoc?.discountAmount || 0; }
  get taxAmount(): number { return this.transaction?.taxAmount || this.pricedDoc?.taxAmount || 0; }
  get totalAmount(): number { return this.transaction?.totalAmount || this.pricedDoc?.totalAmount || 0; }
  get paidAmount(): number { return this.transaction?.paidAmount || 0; }
  get balanceDue(): number {
    const due = this.transaction?.balanceDue;
    return due != null && (due > 0 || this.paidAmount > 0) ? due : Math.max(0, this.totalAmount - this.paidAmount);
  }

  // ── Lifecycle (from the linked documents, not the order record's own status) ──

  get progressLabel(): string {
    return this.snapshot?.progress.label || this.formatStatusLabel(this.transaction?.status);
  }

  get progressTone(): string {
    return this.snapshot?.progress.tone || 'draft';
  }

  /** The stage's tone as one of this page's existing badge styles. */
  get progressBadgeClass(): string {
    const map: Record<string, string> = {
      draft: 'badge-default', sent: 'badge-sent', accepted: 'badge-converted', pending: 'badge-pending',
      transit: 'badge-transit', delivered: 'badge-delivered', invoice: 'badge-invoice', paid: 'badge-completed', cancelled: 'badge-rejected'
    };
    return this.snapshot ? map[this.progressTone] || 'badge-default' : this.getStatusBadgeClass(this.transaction?.status);
  }

  readonly stageIcons = ['fa-paper-plane', 'fa-check-circle', 'fa-file-import', 'fa-truck', 'fa-home', 'fa-file-invoice-dollar', 'fa-wallet'];

  isStageReached(index: number): boolean {
    const p = this.snapshot?.progress;
    return !!p && index <= p.stage && !(p.stopped && index === p.stage);
  }

  isStageStopped(index: number): boolean {
    const p = this.snapshot?.progress;
    return !!p && p.stopped && index === p.stage;
  }

  /** The date shown under each lifecycle step, when one is known. */
  stageDate(index: number): Date | null {
    const s = this.snapshot;
    const tx: any = this.transaction;
    if (!s || !tx) return null;
    const dn: any = s.deliveryNote;
    const candidates: unknown[][] = [
      [tx.quoteSentDate, s.quote?.createdAt, tx.orderDate],
      [tx.quoteConvertedDate, tx.quoteAcceptedOrRejectedDate],
      [s.lpo?.createdAt, s.lpo?.document?.uploadedAt],
      [dn?.dispatchedAt, dn?.createdAt],
      [dn?.deliveredAt, dn?.receivedAt],
      [tx.invoiceSentDate, s.invoice?.issueDate, (s.invoice as any)?.createdAt],
      []
    ];
    for (const value of candidates[index] || []) {
      const d = parseApiDate(value);
      if (d && d.getTime() > 0) return d;
    }
    return null;
  }

  stageDetail(index: number): string {
    const s = this.snapshot;
    if (!s) return '';
    switch (index) {
      case 2: return s.lpo?.lpoNumber ? `LPO ${s.lpo.lpoNumber}` : '';
      case 3: return s.deliveryNote ? `${s.deliveryNote.deliveryNumber} · ${this.formatDisplayLabel(s.deliveryNote.status)}` : '';
      case 5: return s.invoice?.invoiceNumber || '';
      case 6: return `${this.formatCurrency(this.paidAmount, this.currency)} paid`;
      default: return '';
    }
  }

  // ── Linked documents ──

  openQuote(): void { this.openDoc('quotes', this.snapshot?.quote?.id); }
  openInvoice(): void { this.openDoc('invoices', this.snapshot?.invoice?.id); }
  openDeliveryNote(): void { this.openDoc('delivery-notes', this.snapshot?.deliveryNote?.id); }

  private openDoc(segment: string, id: unknown): void {
    if (id == null) return;
    const uuid = this.route.snapshot.paramMap.get('uuid');
    this.router.navigate(uuid ? ['/admin/sales', segment, id, uuid] : ['/admin/sales', segment, id]);
  }

  /** The LPO's number; "Received" for an LPO only stored as a file on the quote. */
  get lpoLabel(): string {
    if (this.snapshot?.lpo?.lpoNumber) return this.snapshot.lpo.lpoNumber;
    if (this.snapshot?.lpo || this.salesService.getQuoteLpoDocument(this.snapshot?.quote)) return 'Received';
    return '—';
  }

  formatLabel(value: string | undefined): string {
    return value ? this.formatDisplayLabel(value) : '—';
  }

  getStatusBadgeClass(status: SaleLifecycleStatus | string | undefined): string {
    if (!status) return 'badge-default';
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

  formatStatusLabel(status: SaleLifecycleStatus | string | undefined): string {
    if (!status) return 'DRAFT';
    return this.formatDisplayLabel(status);
  }

  formatPaymentMethodLabel(paymentMethod: string | undefined): string {
    return this.formatDisplayLabel(paymentMethod || 'BANK_TRANSFER');
  }

  formatPaymentModeLabel(paymentMode: string | undefined): string {
    const normalizedMode = (paymentMode || 'ONE-OFF').replace(/_/g, '-');
    return normalizedMode.toUpperCase() === 'ONE-OFF'
      ? 'One-Off'
      : this.formatDisplayLabel(normalizedMode);
  }

  private formatDisplayLabel(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, character => character.toUpperCase());
  }

  formatCurrency(amount: number | undefined, currency: string = 'NGN'): string {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₦';
    return `${symbol}${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  printSnapshot(): void {
    window.print();
  }

  goBack(): void {
    if (this.closed.observed) {
      this.closed.emit();
    } else {
      this.goToTransactionsList();
    }
  }

  goToTransactionsList(): void {
    // Must match the [cacheKey] passed to <app-nav-tab> in sales-hub.component.html.
    const sessionStorageKey = 'sales-hub';
    sessionStorage.setItem(sessionStorageKey, 'Sales & Transactions');

    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/sales-hub', uuid]);
    } else {
      this.router.navigate(['/admin/sales/sales-hub']);
    }
  }

  closeModal(): void {
    this.goBack();
  }
}
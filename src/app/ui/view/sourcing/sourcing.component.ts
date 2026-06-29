import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, take, switchMap } from 'rxjs/operators';

import { SourcingService } from '../../service/sourcing/sourcing.service';
import {
  BuyerRfq, VendorQuoteResponse, IssuedLpo,
  IssuedLpoItem, ProcurementStats, CreateLpoForm,
} from '../../domain/sourcing/sourcing.dto';
import { TableColumn } from '../../shared-component/view/table/table.component';

type ActiveTable = 'rfqs' | 'lpos';

@Component({
  selector: 'app-sourcing',
  templateUrl: './sourcing.component.html',
  styleUrl: './sourcing.component.scss'
})
export class SourcingComponent implements OnInit, OnDestroy {
Math = Math;
  private destroy$ = new Subject<void>();

  // ── Data ─────────────────────────────────────────────────────────────────────
  rfqs:      BuyerRfq[]            = [];
  lpos:      IssuedLpo[]           = [];
  stats:     ProcurementStats | null = null;

  // ── Table toggle ──────────────────────────────────────────────────────────────
  activeTable: ActiveTable = 'rfqs';

  // ── RFQ side panel (shows all vendor quotes for that RFQ) ────────────────────
  showRfqPanel    = false;
  selectedRfq:    BuyerRfq | null = null;
  rfqQuotes:      VendorQuoteResponse[] = [];
  loadingQuotes   = false;

  // ── Quote detail side panel (drill into a single vendor's quote) ──────────────
  showQuotePanel  = false;
  selectedQuote:  VendorQuoteResponse | null = null;

  // ── Award confirm modal ───────────────────────────────────────────────────────
  showAwardModal  = false;
  quoteToAward:   VendorQuoteResponse | null = null;

  // ── LPO creation centre modal ─────────────────────────────────────────────────
  showLpoModal    = false;
  lpoForm: CreateLpoForm = this.blankLpoForm();
  lpoFormErrors:  Record<string, string> = {};
  lpoFromQuote:   VendorQuoteResponse | null = null;

  // ── LPO side panel (view issued LPO detail) ───────────────────────────────────
  showLpoPanel    = false;
  selectedLpo:    IssuedLpo | null = null;

  // ── Cancel LPO confirm ────────────────────────────────────────────────────────
  showCancelLpoModal = false;
  lpoToCancel:    IssuedLpo | null = null;

  // ── Payment terms options ─────────────────────────────────────────────────────
  readonly paymentTermOptions = [
    'Advance Payment', 'Net 15', 'Net 30', 'Net 45', 'Net 60',
    '50% Advance / 50% on Delivery', 'Letter of Credit',
  ];

  // ── RFQ table columns — 6 <td>s ──────────────────────────────────────────────
  rfqColumns: TableColumn[] = [
    { header: 'RFQ No.',     field: 'rfqNumber',   sortable: true },
    { header: 'Title',       field: 'title',        sortable: true },
    { header: 'Department',  field: 'department',   sortable: true },
    { header: 'Expiry',      sortField: 'expiryDate', sortable: true,
      formatter: (r: BuyerRfq) => this.fmtDate(r.expiryDate) },
    { header: 'Quotes',      align: 'center',
      formatter: (r: BuyerRfq) => `${r.quotesReceived} / ${r.vendorsInvited}` },
    { header: 'Status',      field: 'status',       sortable: true },
  ];

  // ── LPO table columns — 6 <td>s ──────────────────────────────────────────────
  lpoColumns: TableColumn[] = [
    { header: 'LPO No.',    field: 'lpoNumber',        sortable: true },
    { header: 'Vendor',     field: 'vendorName',        sortable: true },
    { header: 'Order',      field: 'orderName',         sortable: true },
    { header: 'Issued',     sortField: 'issuedDate',    sortable: true,
      formatter: (r: IssuedLpo) => this.fmtDate(r.issuedDate) },
    { header: 'Total',      align: 'right',
      formatter: (r: IssuedLpo) => this.fmtCurrency(r.total, r.currency) },
    { header: 'Status',     field: 'status',            sortable: true },
  ];

  constructor(private sourcingService: SourcingService) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.sourcingService.getRfqs()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => this.rfqs = list);

    this.sourcingService.getIssuedLpos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => this.lpos = list);

    this.refreshStats();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private refreshStats(): void {
    this.sourcingService.getSourcingStats().pipe(take(1)).subscribe(s => this.stats = s);
  }

  // ── Toggle ────────────────────────────────────────────────────────────────────
  switchTable(t: ActiveTable): void { this.activeTable = t; }

  get pendingQuoteCount(): number {
    return this.rfqs.filter(r => r.status === 'open' && r.quotesReceived > 0).length;
  }

  get lpoCount(): number { return this.lpos.length; }

  // ─────────────────────────────────────────────────────────────────────────────
  // RFQ PANEL — shows all vendor quotes for a selected RFQ
  // ─────────────────────────────────────────────────────────────────────────────
  onRfqRowClick(rfq: BuyerRfq): void {
    this.selectedRfq  = rfq;
    this.showRfqPanel = true;
    this.rfqQuotes    = [];
    this.loadingQuotes = true;

    this.sourcingService.getQuotesForRfq(rfq.id)
      .pipe(take(1))
      .subscribe(quotes => {
        this.rfqQuotes    = quotes;
        this.loadingQuotes = false;
      });
  }

  closeRfqPanel(): void {
    this.showRfqPanel = false;
    this.selectedRfq  = null;
    this.rfqQuotes    = [];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // QUOTE DETAIL PANEL — drill into one vendor's full quote
  // ─────────────────────────────────────────────────────────────────────────────
  openQuotePanel(quote: VendorQuoteResponse): void {
    this.selectedQuote  = quote;
    this.showQuotePanel = true;
  }

  closeQuotePanel(): void {
    this.showQuotePanel  = false;
    this.selectedQuote   = null;
  }

  shortlistQuote(quote: VendorQuoteResponse): void {
    this.sourcingService.shortlistQuote(quote.id);
    // Refresh the quotes panel
    if (this.selectedRfq) {
      this.sourcingService.getQuotesForRfq(this.selectedRfq.id)
        .pipe(take(1))
        .subscribe(q => this.rfqQuotes = q);
    }
    if (this.selectedQuote?.id === quote.id) {
      this.selectedQuote = { ...this.selectedQuote, status: 'shortlisted' };
    }
  }

  rejectQuote(quote: VendorQuoteResponse): void {
    this.sourcingService.rejectQuote(quote.id);
    if (this.selectedRfq) {
      this.sourcingService.getQuotesForRfq(this.selectedRfq.id)
        .pipe(take(1))
        .subscribe(q => this.rfqQuotes = q);
    }
    if (this.selectedQuote?.id === quote.id) {
      this.closeQuotePanel();
    }
  }

  // ── Award flow: confirm → create LPO ─────────────────────────────────────────
  openAwardModal(quote: VendorQuoteResponse): void {
    this.quoteToAward   = quote;
    this.showAwardModal = true;
  }

  closeAwardModal(): void { this.showAwardModal = false; this.quoteToAward = null; }

  confirmAward(): void {
    if (!this.quoteToAward || !this.selectedRfq) return;
    this.sourcingService.awardQuote(this.quoteToAward.id, this.selectedRfq.id);
    // Refresh quotes
    this.sourcingService.getQuotesForRfq(this.selectedRfq.id)
      .pipe(take(1))
      .subscribe(q => this.rfqQuotes = q);
    this.closeAwardModal();
    this.closeQuotePanel();
    // Open LPO creation modal pre-filled from this quote
    this.openLpoModalFromQuote(this.quoteToAward);
    this.refreshStats();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LPO CREATION MODAL
  // ─────────────────────────────────────────────────────────────────────────────
  openLpoModalFromQuote(quote: VendorQuoteResponse): void {
    this.lpoFromQuote  = quote;
    this.lpoForm = {
      vendorName:       quote.vendorName,
      vendorEmail:      quote.vendorEmail,
      orderName:        this.selectedRfq?.orderName ?? '',
      department:       this.selectedRfq?.department ?? '',
      deliveryDeadline: this.selectedRfq ? this.isoDate(this.selectedRfq.deliveryDeadline) : '',
      deliveryAddress:  this.selectedRfq?.deliveryAddress ?? '',
      paymentTerms:     quote.paymentTerms,
      specialConditions:'',
      internalNotes:    '',
      currency:         quote.currency,
      items: quote.items
        .filter(i => i.availability === 'available' && i.unitPrice !== null)
        .map((i, idx) => ({
          id:          `li-${idx}`,
          name:        i.itemName,
          description: i.description,
          quantity:    i.quantity,
          unit:        i.unit,
          unitPrice:   i.unitPrice ?? 0,
          totalPrice:  i.totalPrice ?? 0,
        })),
    };
    this.lpoFormErrors = {};
    this.showLpoModal  = true;
  }

  openBlankLpoModal(): void {
    this.lpoFromQuote = null;
    this.lpoForm      = this.blankLpoForm();
    this.lpoFormErrors = {};
    this.showLpoModal  = true;
  }

  closeLpoModal(): void {
    this.showLpoModal  = false;
    this.lpoFromQuote  = null;
  }

  recalcLpoItems(): void {
    this.lpoForm.items.forEach(item => {
      item.totalPrice = item.unitPrice * item.quantity;
    });
  }

  addLpoItem(): void {
    this.lpoForm.items.push({
      id: `li-${Date.now()}`, name: '', description: '',
      quantity: 1, unit: 'pcs', unitPrice: 0, totalPrice: 0,
    });
  }

  removeLpoItem(idx: number): void {
    this.lpoForm.items.splice(idx, 1);
  }

  get lpoSubtotal(): number {
    return this.lpoForm.items.reduce((s, i) => s + i.totalPrice, 0);
  }

  get lpoTax(): number { return this.lpoSubtotal * 0.075; }
  get lpoTotal(): number { return this.lpoSubtotal + this.lpoTax; }

  submitLpo(): void {
    this.lpoFormErrors = {};
    if (!this.lpoForm.vendorName.trim())    { this.lpoFormErrors['vendorName']       = 'Vendor name is required.'; }
    if (!this.lpoForm.orderName.trim())     { this.lpoFormErrors['orderName']        = 'Order name is required.'; }
    if (!this.lpoForm.deliveryDeadline)     { this.lpoFormErrors['deliveryDeadline'] = 'Delivery date is required.'; }
    if (!this.lpoForm.deliveryAddress.trim()){ this.lpoFormErrors['deliveryAddress'] = 'Delivery address is required.'; }
    if (this.lpoForm.items.length === 0)    { this.lpoFormErrors['items']            = 'At least one line item is required.'; }
    if (Object.keys(this.lpoFormErrors).length > 0) return;

    const newLpo = this.sourcingService.createLpo({
      rfqId:           this.selectedRfq?.id,
      rfqNumber:       this.selectedRfq?.rfqNumber,
      quotationId:     this.lpoFromQuote?.id,
      quotationNumber: this.lpoFromQuote?.quotationNumber,
      vendorName:      this.lpoForm.vendorName,
      vendorEmail:     this.lpoForm.vendorEmail,
      orderName:       this.lpoForm.orderName,
      department:      this.lpoForm.department,
      deliveryDeadline: new Date(this.lpoForm.deliveryDeadline),
      deliveryAddress:  this.lpoForm.deliveryAddress,
      paymentTerms:     this.lpoForm.paymentTerms,
      specialConditions: this.lpoForm.specialConditions || undefined,
      internalNotes:    this.lpoForm.internalNotes || undefined,
      currency:         this.lpoForm.currency,
      items:            this.lpoForm.items,
      subtotal:         this.lpoSubtotal,
      tax:              this.lpoTax,
      total:            this.lpoTotal,
    });

    this.closeLpoModal();
    this.closeRfqPanel();
    this.activeTable = 'lpos';
    this.refreshStats();

    // Open the new LPO side panel immediately
    this.selectedLpo  = newLpo;
    this.showLpoPanel = true;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LPO DETAIL PANEL
  // ─────────────────────────────────────────────────────────────────────────────
  onLpoRowClick(lpo: IssuedLpo): void {
    this.selectedLpo  = lpo;
    this.showLpoPanel = true;
  }

  closeLpoPanel(): void { this.showLpoPanel = false; this.selectedLpo = null; }

  openCancelLpoModal(lpo: IssuedLpo): void { this.lpoToCancel = lpo; this.showCancelLpoModal = true; }
  closeCancelLpoModal(): void { this.showCancelLpoModal = false; this.lpoToCancel = null; }

  confirmCancelLpo(): void {
    if (!this.lpoToCancel) return;
    this.sourcingService.cancelLpo(this.lpoToCancel.id);
    if (this.selectedLpo?.id === this.lpoToCancel.id) {
      this.selectedLpo = { ...this.selectedLpo, status: 'cancelled' };
    }
    this.closeCancelLpoModal();
    this.refreshStats();
  }

  downloadLpo(lpo: IssuedLpo, e: MouseEvent): void {
    e.stopPropagation();
    console.log('[Procurement] Download LPO:', lpo.lpoNumber);
  }

  // ── Formatting ────────────────────────────────────────────────────────────────
  fmtDate(d: Date | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  fmtCurrency(n: number, cur = 'NGN'): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: cur, minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(n);
  }

  fmtNumber(n: number | null): string {
    if (!n && n !== 0) return '';
    return new Intl.NumberFormat('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  }

  private isoDate(d: Date): string {
    return new Date(d).toISOString().split('T')[0];
  }

  isExpired(d: Date): boolean { return new Date(d) < new Date(); }
  isDueSoon(d: Date): boolean {
    const t = new Date(d).getTime(), now = Date.now();
    return t >= now && t <= now + 3 * 24 * 60 * 60 * 1000;
  }

  rfqExpiryClass(rfq: BuyerRfq): string {
    if (rfq.status !== 'open') return '';
    if (this.isExpired(rfq.expiryDate)) return 'text-danger';
    if (this.isDueSoon(rfq.expiryDate)) return 'text-warning';
    return '';
  }

  rfqBadge(status: string): string {
    const m: Record<string, string> = {
      open:      'badge-open',
      closed:    'badge-closed',
      awarded:   'badge-awarded',
      cancelled: 'badge-cancelled',
      expired:   'badge-expired',
    };
    return `badge ${m[status] ?? ''}`;
  }

  quoteBadge(status: string): string {
    const m: Record<string, string> = {
      received:     'badge-received',
      under_review: 'badge-review',
      shortlisted:  'badge-shortlisted',
      awarded:      'badge-awarded',
      rejected:     'badge-rejected',
    };
    return `badge ${m[status] ?? ''}`;
  }

  lpoBadge(status: string): string {
    const m: Record<string, string> = {
      draft:     'badge-draft',
      sent:      'badge-sent',
      accepted:  'badge-accepted',
      rejected:  'badge-rejected',
      fulfilled: 'badge-fulfilled',
      cancelled: 'badge-cancelled',
    };
    return `badge ${m[status] ?? ''}`;
  }

  // Cheapest quote in a set
  isCheapest(quote: VendorQuoteResponse): boolean {
    return quote.priceRank === 1;
  }

  // Savings vs most expensive quote
  savingsVsHighest(quote: VendorQuoteResponse): number {
    if (!this.rfqQuotes.length) return 0;
    const max = Math.max(...this.rfqQuotes.map(q => q.total));
    return max - quote.total;
  }

  private blankLpoForm(): CreateLpoForm {
    return {
      vendorName: '', vendorEmail: '', orderName: '', department: '',
      deliveryDeadline: '', deliveryAddress: '',
      paymentTerms: 'Net 30', specialConditions: '', internalNotes: '',
      currency: 'NGN', items: [],
    };
  }

  get today(): string { return new Date().toISOString().split('T')[0]; }
}
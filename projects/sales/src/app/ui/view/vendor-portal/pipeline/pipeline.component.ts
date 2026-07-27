import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';

import { VendorService, computeQuotationTotals, isQuotationSubmittable } from '../../../service/vendor-portal/vendor.service';
import { VendorPortalNavService } from '../../../service/vendor-portal/vendor-portal-nav.service';
import {
  Rfq,
  Quotation,
  QuotationItem,
  VendorStats,
  ItemAvailability,
  MAX_REVISION_ROUNDS,
  Lpo,
  Invoice,
  FinanceStats,
  LpoStats,
  InvoiceLineItem,
  VendorProfile,
  RfqAttachment,
  RfqAttachmentType,
} from '../../../domain/vendor-portal/vendor.dto';
import { TableColumn } from '../../../shared-component/view/table/table.component';

// The four stages of a single order's life, end to end. One component now
// owns all of them (previously split across DashboardComponent — RFQ/
// Quotation — and FinanceComponent — LPO/Invoice) so the whole pipeline
// shares one visual language, one KPI rail, and one segmented switch
// instead of two structurally-identical-but-separately-styled pages.
type ActiveTable   = 'rfqs' | 'quotations' | 'lpos' | 'invoices';
type RfqFilter     = 'all' | 'open' | 'converted' | 'expired' | 'closed' | 'due_soon';
type QuotFilter    = 'all' | 'draft' | 'sent' | 'revision_requested' | 'accepted' | 'rejected' | 'withdrawn';
type LpoFilter     = 'all' | 'pending' | 'accepted' | 'rejected' | 'fulfilled';
type InvoiceFilter = 'all' | 'draft' | 'submitted' | 'approved' | 'paid' | 'overdue' | 'disputed';

@Component({
  selector: 'app-pipeline',
  templateUrl: './pipeline.component.html',
  styleUrl: './pipeline.component.scss',
})
export class PipelineComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  readonly MAX_REVISION_ROUNDS = MAX_REVISION_ROUNDS;

  // ── Data ─────────────────────────────────────────────────────────────────────
  rfqs: Rfq[] = [];
  quotations: Quotation[] = [];
  lpos: Lpo[] = [];
  invoices: Invoice[] = [];
  stats: VendorStats | null = null;
  financeStats: FinanceStats | null = null;
  lpoStats: LpoStats | null = null;
  profile: VendorProfile | null = null;

  // ── One 4-way switch for the whole pipeline ───────────────────────────────────
  activeTable: ActiveTable = 'rfqs';

  // ── Card-driven filters — one per entity, same pattern as before ─────────────
  rfqFilter: RfqFilter = 'all';
  quotFilter: QuotFilter = 'all';
  lpoFilter: LpoFilter = 'all';
  invoiceFilter: InvoiceFilter = 'all';

  // ── RFQ side panel ────────────────────────────────────────────────────────────
  showRfqPanel = false;
  selectedRfq: Rfq | null = null;

  // ── Quotation side panel ──────────────────────────────────────────────────────
  showQuotationPanel = false;
  selectedQuotation: Quotation | null = null;

  // ── Quotation editor centre modal (shared for Convert, Edit and Revise flows) ──
  showQuotationModal = false;
  editingQuotation: Quotation | null = null;
  isQuotationReadOnly = false;

  // ── Send / resubmit confirm modal ─────────────────────────────────────────────
  showSendConfirm = false;
  quotationToSend: Quotation | null = null;

  // ── Withdraw confirm modal ────────────────────────────────────────────────────
  showWithdrawConfirm = false;
  quotationToWithdraw: Quotation | null = null;
  withdrawReason = '';

  // ── Simulate client decision modal (demo stand-in — see method docs) ─────────
  showSimulateDecisionModal = false;
  quotationToSimulate: Quotation | null = null;
  simulateDecisionType: 'accept' | 'revision' | 'reject' = 'revision';
  simulateDecisionNote = '';
  simulateDecisionError: string | null = null;

  // ── LPO side panel ────────────────────────────────────────────────────────────
  showLpoPanel = false;
  selectedLpo: Lpo | null = null;

  // ── LPO Accept modal ──────────────────────────────────────────────────────────
  showAcceptModal = false;
  lpoToAccept: Lpo | null = null;

  // ── LPO Reject modal ──────────────────────────────────────────────────────────
  showRejectModal = false;
  lpoToReject: Lpo | null = null;
  rejectionReason = '';
  rejectionError = false;

  // ── Invoice side panel ────────────────────────────────────────────────────────
  showInvoicePanel = false;
  selectedInvoice: Invoice | null = null;

  // ── Create Invoice centre modal (from LPO, pre-filled, or standalone) ────────
  showInvoiceModal = false;
  invoiceForm: Partial<Invoice> & { items: InvoiceLineItem[] } = { items: [] };
  invoiceFormErrors: Record<string, string> = {};
  sourceLpo: Lpo | null = null;
  private lpoRemaining: Record<string, number> = {};
  excludedFullyInvoicedCount = 0;

  // ── RFQ columns — 6 <td>s ─────────────────────────────────────────────────────
  rfqColumns: TableColumn[] = [
    { header: 'RFQ No.', field: 'rfqNumber', sortable: true },
    { header: 'Client', field: 'clientName', sortable: true },
    { header: 'Category', field: 'category', sortable: true },
    { header: 'Due Date', sortable: true, sortField: 'dueDate', formatter: (row: Rfq) => this.fmtDate(row.dueDate) },
    { header: 'Est. Value', align: 'right',
      formatter: (row: Rfq) => row.totalEstimatedValue ? this.fmtCurrency(row.totalEstimatedValue, row.currency) : '—' },
    { header: 'Status', field: 'status', sortable: true },
  ];

  // ── Quotation columns — 5 <td>s ───────────────────────────────────────────────
  quotationColumns: TableColumn[] = [
    { header: 'Quotation No.', field: 'quotationNumber', sortable: true },
    { header: 'Client', field: 'clientName', sortable: true },
    { header: 'Due / Created', sortable: true, sortField: 'createdDate', formatter: (row: Quotation) => this.fmtDate(row.createdDate) },
    { header: 'Total', align: 'right', formatter: (row: Quotation) => row.total > 0 ? this.fmtCurrency(row.total, row.currency) : '—' },
    { header: 'Status', field: 'status', sortable: true },
  ];

  // ── LPO columns — 5 <td>s ─────────────────────────────────────────────────────
  lpoColumns: TableColumn[] = [
    { header: 'LPO No.', field: 'lpoNumber', sortable: true },
    { header: 'Client', field: 'clientName', sortable: true },
    { header: 'Delivery Date', sortField: 'deliveryDate', sortable: true, formatter: (r: Lpo) => this.fmtDate(r.deliveryDate) },
    { header: 'Total Value', align: 'right', formatter: (r: Lpo) => this.fmtCurrency(r.total, r.currency) },
    { header: 'Status', field: 'status', sortable: true },
  ];

  // ── Invoice columns — 5 <td>s ─────────────────────────────────────────────────
  invoiceColumns: TableColumn[] = [
    { header: 'Invoice No.', field: 'invoiceNumber', sortable: true },
    { header: 'Client', field: 'clientName', sortable: true },
    { header: 'Issued / Due', sortField: 'issuedDate', sortable: true, formatter: (r: Invoice) => this.fmtDate(r.issuedDate) },
    { header: 'Total', align: 'right', formatter: (r: Invoice) => this.fmtCurrency(r.total, r.currency) },
    { header: 'Status', field: 'status', sortable: true },
  ];

  constructor(
    private vendorService: VendorService,
    private nav: VendorPortalNavService,
  ) {}

  // ════════════════════════════════════════════════════════════════════════════
  //  LIFECYCLE
  // ════════════════════════════════════════════════════════════════════════════
  ngOnInit(): void {
    this.vendorService.loadRfqs();

    this.vendorService.getRfqs().pipe(takeUntil(this.destroy$)).subscribe((list) => (this.rfqs = list));
    this.vendorService.getLpos().pipe(takeUntil(this.destroy$)).subscribe((list) => (this.lpos = list));
    this.vendorService.getInvoices().pipe(takeUntil(this.destroy$)).subscribe((list) => (this.invoices = list));
    this.vendorService.getProfile().pipe(takeUntil(this.destroy$)).subscribe((p) => (this.profile = p));

    this.vendorService.getQuotations().pipe(takeUntil(this.destroy$)).subscribe((list) => {
      this.quotations = list;
      // Keep the open side-panel in sync if the underlying record changed
      // (e.g. after a simulated client revision request or a withdrawal).
      if (this.selectedQuotation) {
        const fresh = list.find((q) => q.id === this.selectedQuotation!.id);
        this.selectedQuotation = fresh ? JSON.parse(JSON.stringify(fresh)) : null;
        if (!fresh) this.showQuotationPanel = false;
      }
    });

    this.refreshStats();

    // Command palette hand-off: "open RFQ-2026-004" / "open LPO-…" / etc lands here.
    this.nav.focusRequest$.pipe(takeUntil(this.destroy$)).subscribe((req) => {
      if (!req) return;
      if (req.kind === 'rfq') {
        const rfq = this.rfqs.find((r) => r.id === req.id);
        if (rfq) { this.activeTable = 'rfqs'; this.onRfqRowClick(rfq); this.nav.clearFocusRequest(); }
      } else if (req.kind === 'quotation') {
        const q = this.quotations.find((x) => x.id === req.id);
        if (q) { this.activeTable = 'quotations'; this.openQuotationSidePanel(q); this.nav.clearFocusRequest(); }
      } else if (req.kind === 'lpo') {
        const lpo = this.lpos.find((l) => l.id === req.id);
        if (lpo) { this.activeTable = 'lpos'; this.onLpoRowClick(lpo); this.nav.clearFocusRequest(); }
      } else if (req.kind === 'invoice') {
        const inv = this.invoices.find((i) => i.id === req.id);
        if (inv) { this.activeTable = 'invoices'; this.onInvoiceRowClick(inv); this.nav.clearFocusRequest(); }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private refreshStats(): void {
    this.vendorService.getVendorStats().pipe(take(1)).subscribe((s) => (this.stats = s));
    this.vendorService.getLpoStats().pipe(take(1)).subscribe((s) => (this.lpoStats = s));
    this.vendorService.getFinanceStats().pipe(take(1)).subscribe((s) => (this.financeStats = s));
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  SWITCH + FILTER — one 4-way toggle, one filterCard() for every KPI card
  //  across the whole pipeline
  // ════════════════════════════════════════════════════════════════════════════
  switchTable(t: ActiveTable): void {
    this.activeTable = t;
  }

  filterCard(
    table: ActiveTable,
    rfqFilter?: RfqFilter,
    quotFilter?: QuotFilter,
    lpoFilter?: LpoFilter,
    invoiceFilter?: InvoiceFilter,
  ): void {
    this.activeTable = table;
    if (rfqFilter     !== undefined) { this.rfqFilter     = rfqFilter; }
    if (quotFilter    !== undefined) { this.quotFilter    = quotFilter; }
    if (lpoFilter     !== undefined) { this.lpoFilter     = lpoFilter; }
    if (invoiceFilter !== undefined) { this.invoiceFilter = invoiceFilter; }
  }

  clearRfqFilter():     void { this.rfqFilter     = 'all'; }
  clearQuotFilter():    void { this.quotFilter    = 'all'; }
  clearLpoFilter():     void { this.lpoFilter     = 'all'; }
  clearInvoiceFilter(): void { this.invoiceFilter = 'all'; }

  get filteredRfqs(): Rfq[] {
    if (this.rfqFilter === 'all')      return this.rfqs;
    if (this.rfqFilter === 'due_soon') return this.rfqs.filter(r => r.status === 'open' && this.isDueSoon(r.dueDate));
    return this.rfqs.filter(r => r.status === this.rfqFilter);
  }

  get filteredQuotations(): Quotation[] {
    if (this.quotFilter === 'all') return this.quotations;
    return this.quotations.filter(q => q.status === this.quotFilter);
  }

  get filteredLpos(): Lpo[] {
    if (this.lpoFilter === 'all') return this.lpos;
    return this.lpos.filter(l => l.status === this.lpoFilter);
  }

  get filteredInvoices(): Invoice[] {
    if (this.invoiceFilter === 'all') return this.invoices;
    return this.invoices.filter(i => i.status === this.invoiceFilter);
  }

  get unreadCount(): number { return this.rfqs.filter((r) => !r.isRead).length; }
  get draftCount(): number { return this.quotations.filter((q) => q.status === 'draft').length; }
  get needsRevisionCount(): number { return this.quotations.filter((q) => q.status === 'revision_requested').length; }
  get lpoUnreadCount(): number { return this.lpos.filter(l => !l.isRead).length; }
  get invoiceOverdueCount(): number { return this.invoices.filter(i => i.status === 'overdue').length; }

  // ════════════════════════════════════════════════════════════════════════════
  //  RFQ FLOW
  // ════════════════════════════════════════════════════════════════════════════
  onRfqRowClick(rfq: Rfq): void {
    this.selectedRfq = rfq;
    this.showRfqPanel = true;
    if (!rfq.isRead) { this.vendorService.markRfqAsRead(rfq.id); }
  }

  closeRfqPanel(): void { this.showRfqPanel = false; this.selectedRfq = null; }

  rfqHasQuotation(rfqId: string): boolean { return this.vendorService.rfqHasQuotation(rfqId); }

  openConvertModal(rfq: Rfq): void {
    const q = this.vendorService.createQuotationFromRfq(rfq);
    this.refreshStats();
    this.editingQuotation = JSON.parse(JSON.stringify(q));
    this.isQuotationReadOnly = false;
    this.showQuotationModal = true;
  }

  viewQuotationFromRfq(rfq: Rfq): void {
    const q = this.quotations.find((x) => x.rfqId === rfq.id) ?? null;
    this.closeRfqPanel();
    this.activeTable = 'quotations';
    if (q) { this.openQuotationSidePanel(q); }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  QUOTATION FLOW
  // ════════════════════════════════════════════════════════════════════════════
  onQuotationRowClick(q: Quotation): void { this.openQuotationSidePanel(q); }

  openQuotationSidePanel(q: Quotation): void {
    this.selectedQuotation = q;
    this.showQuotationPanel = true;
  }

  closeQuotationPanel(): void { this.showQuotationPanel = false; this.selectedQuotation = null; }

  // Where this quotation sits in the RFQ → Quotation → LPO → Invoice chain.
  // Now that LPOs/Invoices live in the same component, this reads real
  // invoice/payment state instead of the conservative guess the old,
  // split-component version had to make.
  quotationLifecycleStages(q: Quotation): { label: string; state: 'done' | 'current' | 'upcoming' | 'stopped' }[] {
    if (q.status === 'rejected' || q.status === 'withdrawn') {
      return [
        { label: 'RFQ', state: 'done' },
        { label: 'Quotation', state: 'stopped' },
        { label: 'LPO', state: 'upcoming' },
        { label: 'Invoice', state: 'upcoming' },
        { label: 'Paid', state: 'upcoming' },
      ];
    }
    const relatedLpo = this.lpos.find((l) => l.quotationNumber === q.quotationNumber);
    const relatedInvoices = relatedLpo ? this.invoices.filter((i) => i.lpoId === relatedLpo.id) : [];
    const hasInvoice = relatedInvoices.length > 0;
    const fullyPaid = hasInvoice && relatedInvoices.every((i) => i.status === 'paid');
    const quotDone = q.status === 'accepted';
    return [
      { label: 'RFQ', state: 'done' },
      { label: 'Quotation', state: quotDone ? 'done' : 'current' },
      { label: 'LPO', state: relatedLpo ? 'done' : quotDone ? 'current' : 'upcoming' },
      { label: 'Invoice', state: hasInvoice ? 'done' : relatedLpo ? 'current' : 'upcoming' },
      { label: 'Paid', state: fullyPaid ? 'done' : hasInvoice ? 'current' : 'upcoming' },
    ];
  }

  viewRfqFromQuotation(q: Quotation): void {
    const rfq = this.rfqs.find((r) => r.id === q.rfqId);
    if (!rfq) return;
    this.closeQuotationPanel();
    this.activeTable = 'rfqs';
    this.onRfqRowClick(rfq);
  }

  // Jump forward from a quotation to the LPO raised against it, if any.
  viewLpoFromQuotation(q: Quotation): void {
    const lpo = this.lpos.find((l) => l.quotationNumber === q.quotationNumber);
    if (!lpo) return;
    this.closeQuotationPanel();
    this.activeTable = 'lpos';
    this.onLpoRowClick(lpo);
  }

  isEditableStatus(q: Quotation): boolean {
    return q.status === 'draft' || q.status === 'revision_requested';
  }

  openQuotationEditor(q: Quotation): void {
    this.editingQuotation = JSON.parse(JSON.stringify(q));
    this.isQuotationReadOnly = false;
    this.showQuotationModal = true;
  }

  openQuotationViewer(q: Quotation): void {
    this.editingQuotation = JSON.parse(JSON.stringify(q));
    this.isQuotationReadOnly = true;
    this.showQuotationModal = true;
  }

  closeQuotationModal(): void { this.showQuotationModal = false; this.editingQuotation = null; }

  onPriceChange(item: QuotationItem, raw: string): void {
    const v = parseFloat(raw.replace(/,/g, ''));
    item.unitPrice = isNaN(v) || v < 0 ? null : v;
    this.recalcEditing();
  }

  onOfferedQtyChange(item: QuotationItem, raw: string): void {
    const v = parseInt(raw.replace(/,/g, ''), 10);
    item.offeredQuantity = isNaN(v) || v <= 0 ? null : v;
    this.recalcEditing();
  }

  setAvailability(item: QuotationItem, availability: ItemAvailability): void {
    item.availability = availability;
    if (availability === 'available') {
      item.offeredQuantity = null;
      item.substituteDescription = null;
    } else if (availability === 'unavailable') {
      item.unitPrice = null;
      item.offeredQuantity = null;
      item.substituteDescription = null;
    } else if (availability === 'partial') {
      item.substituteDescription = null;
      if (item.offeredQuantity !== null && item.offeredQuantity >= item.quantity) {
        item.offeredQuantity = null;
      }
    }
    this.recalcEditing();
  }

  itemAvailabilityLabel(a: ItemAvailability): string {
    const m: Record<ItemAvailability, string> = {
      available: 'Full qty', partial: 'Partial', substitute: 'Substitute', unavailable: 'Unavailable',
    };
    return m[a];
  }

  trackByRfqItemId(_index: number, item: QuotationItem): string { return item.rfqItemId; }

  private recalcEditing(): void {
    if (!this.editingQuotation) return;
    this.editingQuotation = computeQuotationTotals(this.editingQuotation);
  }

  isComplete(q: Quotation): boolean { return isQuotationSubmittable(q); }

  get editingComplete(): boolean {
    return !!this.editingQuotation && this.isComplete(this.editingQuotation);
  }

  saveDraft(): void {
    if (!this.editingQuotation) return;
    this.vendorService.updateQuotation(this.editingQuotation);
    if (this.selectedQuotation?.id === this.editingQuotation.id) {
      this.selectedQuotation = JSON.parse(JSON.stringify(this.editingQuotation));
    }
    this.refreshStats();
    this.closeQuotationModal();
  }

  get isResubmitFlow(): boolean { return this.quotationToSend?.status === 'revision_requested'; }

  openSendConfirm(q: Quotation): void { this.quotationToSend = q; this.showSendConfirm = true; }
  cancelSend(): void { this.showSendConfirm = false; this.quotationToSend = null; }

  requestSendFromModal(): void {
    if (this.editingQuotation && this.editingComplete) {
      this.vendorService.updateQuotation(this.editingQuotation);
      this.openSendConfirm(this.editingQuotation);
    }
  }

  executeSend(): void {
    if (!this.quotationToSend) return;
    if (this.quotationToSend.status === 'revision_requested') {
      this.vendorService.resubmitQuotation(this.quotationToSend);
    } else {
      this.vendorService.sendQuotation(this.quotationToSend.id);
    }
    this.showSendConfirm = false;
    this.quotationToSend = null;
    this.closeQuotationModal();
    this.closeQuotationPanel();
    this.refreshStats();
  }

  openWithdrawConfirm(q: Quotation): void {
    this.quotationToWithdraw = q;
    this.withdrawReason = '';
    this.showWithdrawConfirm = true;
  }
  cancelWithdraw(): void { this.showWithdrawConfirm = false; this.quotationToWithdraw = null; }
  executeWithdraw(): void {
    if (!this.quotationToWithdraw) return;
    this.vendorService.withdrawQuotation(this.quotationToWithdraw.id, this.withdrawReason.trim() || undefined);
    this.showWithdrawConfirm = false;
    this.quotationToWithdraw = null;
    this.closeQuotationPanel();
    this.refreshStats();
  }

  openSimulateDecision(q: Quotation): void {
    this.quotationToSimulate = q;
    this.simulateDecisionType = 'revision';
    this.simulateDecisionNote = '';
    this.simulateDecisionError = null;
    this.showSimulateDecisionModal = true;
  }
  setSimulateDecisionType(type: 'accept' | 'revision' | 'reject'): void {
    this.simulateDecisionType = type;
    this.simulateDecisionError = null;
  }
  cancelSimulateDecision(): void { this.showSimulateDecisionModal = false; this.quotationToSimulate = null; }
  canExecuteSimulateDecision(): boolean {
    return this.simulateDecisionType === 'accept' || !!this.simulateDecisionNote.trim();
  }
  simDecisionNoteLabel(): string {
    switch (this.simulateDecisionType) {
      case 'accept': return 'Note to vendor (optional)';
      case 'reject': return 'Why is the client rejecting this?';
      default: return 'What is the client asking to change?';
    }
  }
  simDecisionPlaceholder(): string {
    switch (this.simulateDecisionType) {
      case 'accept': return 'e.g. Looks good, please proceed.';
      case 'reject': return 'e.g. Going with another vendor on this one.';
      default: return 'e.g. Can you match the full quantity on item 2? The price on item 4 is above our budget…';
    }
  }
  simDecisionCtaLabel(): string {
    switch (this.simulateDecisionType) {
      case 'accept': return 'Accept Quotation';
      case 'reject': return 'Reject Quotation';
      default: return 'Send Back for Revision';
    }
  }
  simDecisionTabClass(type: 'accept' | 'revision' | 'reject'): string {
    const active = this.simulateDecisionType === type;
    const activeColor = { accept: 'text-emerald-700', revision: 'text-orange-700', reject: 'text-red-700' }[type];
    return `px-2 py-1.5 text-xs font-semibold rounded-md transition-colors ${
      active ? `bg-white shadow-sm ${activeColor}` : 'text-[#94a9b3] hover:text-[#5a7380]'
    }`;
  }
  simDecisionCtaClass(): string {
    const colorClass = {
      accept: 'bg-emerald-500 hover:bg-emerald-600',
      revision: 'bg-orange-500 hover:bg-orange-600',
      reject: 'bg-red-500 hover:bg-red-600',
    }[this.simulateDecisionType];
    return `px-5 py-2.5 text-sm font-semibold rounded-xl text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colorClass}`;
  }
  executeSimulateDecision(): void {
    if (!this.quotationToSimulate || !this.canExecuteSimulateDecision()) return;
    const note = this.simulateDecisionNote.trim();
    const id = this.quotationToSimulate.id;
    let result: { ok: boolean; reason?: string };
    switch (this.simulateDecisionType) {
      case 'accept': result = this.vendorService.acceptQuotation(id, note || undefined); break;
      case 'reject': result = this.vendorService.rejectQuotation(id, note); break;
      default: result = this.vendorService.requestRevision(id, note);
    }
    if (!result.ok) {
      this.simulateDecisionError = result.reason ?? 'Could not complete this action.';
      return;
    }
    this.showSimulateDecisionModal = false;
    this.quotationToSimulate = null;
    this.closeQuotationPanel();
    this.refreshStats();
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  LPO FLOW  ── row click → side panel → accept/reject OR create invoice
  // ════════════════════════════════════════════════════════════════════════════
  onLpoRowClick(lpo: Lpo): void {
    this.selectedLpo = lpo;
    this.showLpoPanel = true;
    if (!lpo.isRead) { this.vendorService.markLpoAsRead(lpo.id); }
  }

  closeLpoPanel(): void { this.showLpoPanel = false; this.selectedLpo = null; }

  openAcceptModal(lpo: Lpo): void { this.lpoToAccept = lpo; this.showAcceptModal = true; }
  closeAcceptModal(): void { this.showAcceptModal = false; this.lpoToAccept = null; }

  confirmAccept(): void {
    if (!this.lpoToAccept) return;
    this.vendorService.acceptLpo(this.lpoToAccept.id);
    if (this.selectedLpo?.id === this.lpoToAccept.id) {
      this.selectedLpo = { ...this.selectedLpo, status: 'accepted' };
    }
    this.closeAcceptModal();
    this.refreshStats();
  }

  openRejectModal(lpo: Lpo): void {
    this.lpoToReject = lpo;
    this.rejectionReason = '';
    this.rejectionError = false;
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.lpoToReject = null;
    this.rejectionReason = '';
    this.rejectionError = false;
  }

  confirmReject(): void {
    if (!this.lpoToReject) return;
    if (!this.rejectionReason.trim()) { this.rejectionError = true; return; }
    this.vendorService.rejectLpo(this.lpoToReject.id, this.rejectionReason.trim());
    if (this.selectedLpo?.id === this.lpoToReject.id) {
      this.selectedLpo = { ...this.selectedLpo, status: 'rejected', rejectionReason: this.rejectionReason.trim() };
    }
    this.closeRejectModal();
    this.refreshStats();
  }

  lpoRemainingByItem(lpo: Lpo): Record<string, number> {
    const invoiced = this.vendorService.getInvoicedQuantities(lpo.id);
    const out: Record<string, number> = {};
    lpo.items.forEach((li) => (out[li.id] = Math.max(0, li.quantity - (invoiced[li.id] ?? 0))));
    return out;
  }

  lpoFullyInvoiced(lpo: Lpo): boolean {
    const remaining = this.lpoRemainingByItem(lpo);
    return lpo.items.every((li) => remaining[li.id] <= 0);
  }

  // Jump back from an LPO to the quotation it was raised from.
  viewQuotationFromLpo(lpo: Lpo): void {
    const q = this.quotations.find((x) => x.quotationNumber === lpo.quotationNumber);
    if (!q) return;
    this.closeLpoPanel();
    this.activeTable = 'quotations';
    this.openQuotationSidePanel(q);
  }

  createInvoiceFromLpo(lpo: Lpo): void {
    const num = `INV-${new Date().getFullYear()}-${String(this.invoices.length + 1).padStart(3, '0')}`;
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    this.lpoRemaining = this.lpoRemainingByItem(lpo);
    this.sourceLpo = lpo;

    const invoiceableItems = lpo.items.filter((li) => this.lpoRemaining[li.id] > 0);
    this.excludedFullyInvoicedCount = lpo.items.length - invoiceableItems.length;

    this.invoiceForm = {
      invoiceNumber: num,
      lpoId: lpo.id,
      lpoNumber: lpo.lpoNumber,
      quotationNumber: lpo.quotationNumber,
      clientName: lpo.clientName,
      clientEmail: lpo.clientEmail,
      currency: lpo.currency,
      issuedDate: new Date(),
      dueDate,
      status: 'draft',
      includeSignature: !!this.profile?.signatureDataUrl,
      notes: '',
      items: invoiceableItems.map((item, idx) => {
        const qty = this.lpoRemaining[item.id];
        return {
          id: `item-${idx}`,
          lpoItemId: item.id,
          description: `${item.name} (${item.description})`,
          quantity: qty,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * qty,
        };
      }),
    };

    this.recalcInvoiceForm();
    this.invoiceFormErrors = {};
    this.showInvoiceModal = true;
  }

  openBlankInvoiceModal(): void {
    const num = `INV-${new Date().getFullYear()}-${String(this.invoices.length + 1).padStart(3, '0')}`;
    this.sourceLpo = null;
    this.lpoRemaining = {};
    this.excludedFullyInvoicedCount = 0;
    this.invoiceForm = {
      invoiceNumber: num,
      clientName: '',
      currency: 'NGN',
      issuedDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'draft',
      includeSignature: !!this.profile?.signatureDataUrl,
      subtotal: 0, tax: 0, total: 0,
      amountPaid: 0, amountOutstanding: 0,
      notes: '',
      items: [{ id: 'item-0', description: '', quantity: 1, unit: 'pcs', unitPrice: 0, totalPrice: 0 }],
    };
    this.invoiceFormErrors = {};
    this.showInvoiceModal = true;
  }

  closeInvoiceModal(): void {
    this.showInvoiceModal = false;
    this.sourceLpo = null;
    this.lpoRemaining = {};
  }

  isLockedItem(item: InvoiceLineItem): boolean { return !!item.lpoItemId; }

  maxQtyForItem(item: InvoiceLineItem): number | null {
    return item.lpoItemId ? (this.lpoRemaining[item.lpoItemId] ?? item.quantity) : null;
  }

  recalcInvoiceForm(): void {
    const subtotal = (this.invoiceForm.items || []).reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    this.invoiceForm.subtotal = subtotal;
    this.invoiceForm.tax = subtotal * 0.075;
    this.invoiceForm.total = subtotal * 1.075;
    this.invoiceForm.amountOutstanding = this.invoiceForm.total;
  }

  updateItemPrice(item: InvoiceLineItem, raw: string): void {
    if (this.isLockedItem(item)) return;
    item.unitPrice = parseFloat(raw.replace(/,/g, '')) || 0;
    item.totalPrice = item.unitPrice * item.quantity;
    this.recalcInvoiceForm();
  }

  updateItemQty(item: InvoiceLineItem, raw: string): void {
    let qty = parseInt(raw, 10) || 1;
    const max = this.maxQtyForItem(item);
    if (max !== null) { qty = Math.min(Math.max(1, qty), Math.max(1, max)); }
    item.quantity = qty;
    item.totalPrice = item.unitPrice * item.quantity;
    this.recalcInvoiceForm();
  }

  addInvoiceItem(): void {
    const idx = (this.invoiceForm.items?.length ?? 0);
    this.invoiceForm.items?.push({ id: `item-${idx}`, description: '', quantity: 1, unit: 'pcs', unitPrice: 0, totalPrice: 0 });
  }

  removeInvoiceItem(idx: number): void {
    const item = this.invoiceForm.items?.[idx];
    if (item && this.isLockedItem(item)) return;
    this.invoiceForm.items?.splice(idx, 1);
    this.recalcInvoiceForm();
  }

  submitInvoice(): void {
    this.invoiceFormErrors = {};
    if (!this.invoiceForm.clientName?.trim()) { this.invoiceFormErrors['clientName'] = 'Client name is required.'; }
    if (!this.invoiceForm.items?.length) { this.invoiceFormErrors['items'] = 'At least one line item is required.'; }
    for (const item of this.invoiceForm.items ?? []) {
      const max = this.maxQtyForItem(item);
      if (max !== null && item.quantity > max) {
        this.invoiceFormErrors['items'] = `"${item.description}" exceeds what's left to invoice on this LPO.`;
      }
    }
    if (Object.keys(this.invoiceFormErrors).length > 0) return;

    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: this.invoiceForm.invoiceNumber!,
      lpoId: this.invoiceForm.lpoId,
      lpoNumber: this.invoiceForm.lpoNumber,
      quotationNumber: this.invoiceForm.quotationNumber,
      clientName: this.invoiceForm.clientName!.trim(),
      clientEmail: this.invoiceForm.clientEmail,
      issuedDate: this.invoiceForm.issuedDate ?? new Date(),
      dueDate: this.invoiceForm.dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'submitted',
      items: this.invoiceForm.items!,
      subtotal: this.invoiceForm.subtotal ?? 0,
      tax: this.invoiceForm.tax ?? 0,
      total: this.invoiceForm.total ?? 0,
      amountPaid: 0,
      amountOutstanding: this.invoiceForm.total ?? 0,
      currency: this.invoiceForm.currency ?? 'NGN',
      notes: this.invoiceForm.notes,
      includeSignature: this.invoiceForm.includeSignature,
    };

    this.vendorService.createInvoice(invoice);
    this.closeInvoiceModal();
    this.closeLpoPanel();
    this.activeTable = 'invoices';
    this.refreshStats();
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  INVOICE FLOW
  // ════════════════════════════════════════════════════════════════════════════
  onInvoiceRowClick(inv: Invoice): void {
    this.selectedInvoice = inv;
    this.showInvoicePanel = true;
  }

  closeInvoicePanel(): void { this.showInvoicePanel = false; this.selectedInvoice = null; }

  // Jump back from an invoice to the LPO it was raised against, if any.
  viewLpoFromInvoice(inv: Invoice): void {
    const lpo = this.lpos.find((l) => l.id === inv.lpoId);
    if (!lpo) return;
    this.closeInvoicePanel();
    this.activeTable = 'lpos';
    this.onLpoRowClick(lpo);
  }

  paymentProgress(inv: Invoice): number {
    if (inv.total === 0) return 0;
    return Math.min(100, Math.round((inv.amountPaid / inv.total) * 100));
  }

  // ── Lifecycle visibility ─────────────────────────────────────────────────────
  lpoLifecycleStages(lpo: Lpo): { label: string; state: 'done' | 'current' | 'upcoming' | 'stopped' }[] {
    if (lpo.status === 'rejected') {
      return [
        { label: 'RFQ', state: 'done' },
        { label: 'Quotation', state: 'done' },
        { label: 'LPO', state: 'stopped' },
        { label: 'Invoice', state: 'upcoming' },
        { label: 'Paid', state: 'upcoming' },
      ];
    }
    const related = this.invoices.filter((i) => i.lpoId === lpo.id);
    const hasInvoice = related.length > 0;
    const fullyPaid = hasInvoice && related.every((i) => i.status === 'paid');
    return [
      { label: 'RFQ', state: 'done' },
      { label: 'Quotation', state: 'done' },
      { label: 'LPO', state: lpo.status === 'pending' ? 'current' : 'done' },
      { label: 'Invoice', state: hasInvoice ? 'done' : (lpo.status === 'pending' ? 'upcoming' : 'current') },
      { label: 'Paid', state: fullyPaid ? 'done' : (hasInvoice ? 'current' : 'upcoming') },
    ];
  }

  invoiceLifecycleStages(inv: Invoice): { label: string; state: 'done' | 'current' | 'upcoming' | 'stopped' }[] {
    const paid = inv.status === 'paid';
    return [
      { label: 'RFQ', state: 'done' },
      { label: 'Quotation', state: 'done' },
      { label: 'LPO', state: inv.lpoNumber ? 'done' : 'upcoming' },
      { label: 'Invoice', state: paid ? 'done' : 'current' },
      { label: 'Paid', state: paid ? 'done' : 'upcoming' },
    ];
  }

  // ── Reset demo data ───────────────────────────────────────────────────────────
  resetDemoData(): void {
    const confirmed = window.confirm(
      "This clears every locally-simulated RFQ, quotation, LPO and invoice in this browser and reloads the starting demo dataset. This can't be undone. Continue?",
    );
    if (!confirmed) return;
    this.vendorService.resetDemoData();
    this.closeRfqPanel();
    this.closeQuotationPanel();
    this.closeLpoPanel();
    this.closeInvoicePanel();
    this.refreshStats();
  }

  // ── Downloads ─────────────────────────────────────────────────────────────────
  downloadRfq(rfq: Rfq, e: MouseEvent): void { e.stopPropagation(); console.log('Download RFQ', rfq.rfqNumber); }
  downloadQuotation(q: Quotation, e: MouseEvent): void { e.stopPropagation(); console.log('Download Quotation', q.quotationNumber); }
  downloadLpo(lpo: Lpo, e: MouseEvent): void { e.stopPropagation(); console.log('[Pipeline] Download LPO:', lpo.lpoNumber); }
  downloadInvoice(inv: Invoice, e: MouseEvent): void { e.stopPropagation(); console.log('[Pipeline] Download Invoice:', inv.invoiceNumber); }

  downloadAttachment(file: RfqAttachment, e: MouseEvent): void {
    e.stopPropagation();
    window.open(file.url, '_blank', 'noopener');
  }

  // ── Status → (tone, icon) mapping for <app-vp-status> ──────────────────────────
  rfqStatusTone(s: string): 'info' | 'success' | 'danger' | 'neutral' {
    const map: Record<string, 'info' | 'success' | 'danger' | 'neutral'> = {
      open: 'info', converted: 'success', expired: 'danger', closed: 'neutral',
    };
    return map[s] ?? 'neutral';
  }
  rfqStatusIcon(s: string): 'dot' | 'check' | 'x' | 'dash' {
    const map: Record<string, 'dot' | 'check' | 'x' | 'dash'> = {
      open: 'dot', converted: 'check', expired: 'x', closed: 'dash',
    };
    return map[s] ?? 'dot';
  }
  quotStatusTone(s: string): 'neutral' | 'info' | 'warning' | 'success' | 'danger' {
    const map: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
      draft: 'neutral', sent: 'info', revision_requested: 'warning', accepted: 'success', rejected: 'danger', withdrawn: 'neutral',
    };
    return map[s] ?? 'neutral';
  }
  quotStatusIcon(s: string): 'dash' | 'clock' | 'half' | 'check' | 'x' {
    const map: Record<string, 'dash' | 'clock' | 'half' | 'check' | 'x'> = {
      draft: 'dash', sent: 'clock', revision_requested: 'half', accepted: 'check', rejected: 'x', withdrawn: 'dash',
    };
    return map[s] ?? 'dash';
  }
  lpoStatusTone(s: string): 'warning' | 'success' | 'info' | 'danger' | 'neutral' {
    const map: Record<string, 'warning' | 'success' | 'info' | 'danger' | 'neutral'> = {
      pending: 'warning', accepted: 'info', fulfilled: 'success', rejected: 'danger', cancelled: 'neutral',
    };
    return map[s] ?? 'neutral';
  }
  lpoStatusIcon(s: string): 'clock' | 'dot' | 'check' | 'x' | 'dash' {
    const map: Record<string, 'clock' | 'dot' | 'check' | 'x' | 'dash'> = {
      pending: 'clock', accepted: 'dot', fulfilled: 'check', rejected: 'x', cancelled: 'dash',
    };
    return map[s] ?? 'dot';
  }
  invoiceStatusTone(s: string): 'neutral' | 'info' | 'success' | 'danger' | 'warning' {
    const map: Record<string, 'neutral' | 'info' | 'success' | 'danger' | 'warning'> = {
      draft: 'neutral', submitted: 'info', approved: 'info', paid: 'success', overdue: 'danger', disputed: 'warning',
    };
    return map[s] ?? 'neutral';
  }
  invoiceStatusIcon(s: string): 'dash' | 'clock' | 'half' | 'check' | 'x' {
    const map: Record<string, 'dash' | 'clock' | 'half' | 'check' | 'x'> = {
      draft: 'dash', submitted: 'clock', approved: 'half', paid: 'check', overdue: 'x', disputed: 'x',
    };
    return map[s] ?? 'dash';
  }

  attachmentIconBg(type: RfqAttachmentType): string {
    const map: Record<RfqAttachmentType, string> = {
      pdf: 'bg-[#fceeed] text-[#c02c2c]',
      doc: 'bg-[#eaf1fd] text-[#2461d9]',
      xls: 'bg-[#e7f6ef] text-[#17845a]',
      image: 'bg-[#f3ecfb] text-[#7c3aed]',
      dwg: 'bg-[#fdf1e0] text-[#b3690a]',
      zip: 'bg-[#eef2f5] text-[#566670]',
      other: 'bg-[#eef2f5] text-[#566670]',
    };
    return map[type] ?? map.other;
  }

  // ── Formatting ────────────────────────────────────────────────────────────────
  fmtDate(d: Date | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  fmtDateTime(d: Date | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  fmtCurrency(n: number, cur = 'NGN'): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: cur, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }

  fmtNumber(n: number | null): string {
    if (n === null || n === undefined) return '';
    return new Intl.NumberFormat('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  }

  isExpired(d: Date): boolean { return new Date(d) < new Date(); }
  isDueSoon(d: Date): boolean {
    const t = new Date(d).getTime(), now = Date.now();
    return t >= now && t <= now + 3 * 24 * 60 * 60 * 1000;
  }

  dueDateClass(rfq: Rfq): string {
    if (rfq.status !== 'open') return '';
    if (this.isExpired(rfq.dueDate)) return 'text-danger';
    if (this.isDueSoon(rfq.dueDate)) return 'text-warning';
    return '';
  }

  deliveryDateClass(lpo: Lpo): string {
    if (lpo.status !== 'pending' && lpo.status !== 'accepted') return '';
    if (this.isExpired(lpo.deliveryDate)) return 'text-danger';
    if (this.isDueSoon(lpo.deliveryDate)) return 'text-warning';
    return '';
  }

  quotStatusLabel(s: string): string {
    const m: Record<string, string> = {
      draft: 'Draft', sent: 'Sent', revision_requested: 'Needs Revision', accepted: 'Accepted', rejected: 'Rejected', withdrawn: 'Withdrawn',
    };
    return m[s] ?? s;
  }
}

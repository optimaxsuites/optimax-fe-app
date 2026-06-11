import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';

import { VendorService } from '../../../service/vendor-portal/vendor.service';
import { Rfq, Quotation, QuotationItem, VendorStats } from '../../../domain/vendor-portal/vendor.dto';

// TableColumn drives the <th> header row inside app-table.
// Adjust this import path to wherever your shared library resolves in the project,
// e.g. 'src/app/shared/view/table/table.component'
import { TableColumn } from '../../../shared-component/view/table/table.component';

type ActiveTable = 'rfqs' | 'quotations';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ── Data ─────────────────────────────────────────────────────────────────────
  rfqs:       Rfq[]       = [];
  quotations: Quotation[] = [];
  stats:      VendorStats | null = null;

  // ── Table toggle ──────────────────────────────────────────────────────────────
  activeTable: ActiveTable = 'rfqs';

  // ── RFQ detail panel ─────────────────────────────────────────────────────────
  showRfqPanel = false;
  selectedRfq: Rfq | null = null;

  // ── Quotation editor/viewer modal ─────────────────────────────────────────────
  showQuotationModal   = false;
  editingQuotation:    Quotation | null = null;
  isQuotationReadOnly  = false;

  // ── Send-confirm modal ────────────────────────────────────────────────────────
  showSendConfirm  = false;
  quotationToSend: Quotation | null = null;

  // ── Column definitions (header row only — cells are in the custom template) ───
  // We pass empty actions:[] so app-table doesn't render its own Actions <th>.
  // Our appTableBody template includes the actions <td> itself.
  rfqColumns: TableColumn[] = [
    { header: 'RFQ No.',    field: 'rfqNumber',  sortable: true },
    { header: 'Client',     field: 'clientName', sortable: true },
    { header: 'Category',   field: 'category',   sortable: true },
    { header: 'Items',      align: 'center' },
    { header: 'Due Date',   sortField: 'dueDate', sortable: true },
    { header: 'Est. Value', align: 'right' },
    { header: 'Status',     field: 'status',     sortable: true },
    { header: 'Actions' },
  ];

  quotationColumns: TableColumn[] = [
    { header: 'Quotation No.', field: 'quotationNumber', sortable: true },
    { header: 'RFQ Ref.',      field: 'rfqNumber',       sortable: true },
    { header: 'Client',        field: 'clientName',      sortable: true },
    { header: 'Created',       sortField: 'createdDate', sortable: true },
    { header: 'Valid Until' },
    { header: 'Total',         align: 'right' },
    { header: 'Status',        field: 'status',          sortable: true },
    { header: 'Actions' },
  ];

  constructor(private vendorService: VendorService) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.vendorService.getRfqs()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => this.rfqs = list);

    this.vendorService.getQuotations()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => this.quotations = list);

    this.refreshStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private refreshStats(): void {
    this.vendorService.getVendorStats().pipe(take(1)).subscribe(s => this.stats = s);
  }

  // ── Table toggle ──────────────────────────────────────────────────────────────
  switchTable(t: ActiveTable): void { this.activeTable = t; }

  get unreadCount():  number { return this.rfqs.filter(r => !r.isRead).length; }
  get draftCount():   number { return this.quotations.filter(q => q.status === 'draft').length; }

  // ── RFQ panel ─────────────────────────────────────────────────────────────────
  openRfqPanel(rfq: Rfq): void {
    this.selectedRfq  = rfq;
    this.showRfqPanel = true;
    if (!rfq.isRead) { this.vendorService.markRfqAsRead(rfq.id); }
  }

  closeRfqPanel(): void {
    this.showRfqPanel = false;
    this.selectedRfq  = null;
  }

  rfqHasQuotation(rfqId: string): boolean {
    return this.vendorService.rfqHasQuotation(rfqId);
  }

  // ── RFQ → Quotation ───────────────────────────────────────────────────────────
  convertToQuotation(rfq: Rfq): void {
    const q = this.vendorService.createQuotationFromRfq(rfq);
    this.refreshStats();
    this.closeRfqPanel();
    this.activeTable = 'quotations';
    this.openQuotationEditor(q);
  }

  goToQuotationTab(): void {
    this.activeTable = 'quotations';
    this.closeRfqPanel();
  }

  // ── Quotation modal ───────────────────────────────────────────────────────────
  openQuotationEditor(q: Quotation): void {
    this.editingQuotation    = JSON.parse(JSON.stringify(q)); // deep clone
    this.isQuotationReadOnly = false;
    this.showQuotationModal  = true;
  }

  openQuotationViewer(q: Quotation): void {
    this.editingQuotation    = JSON.parse(JSON.stringify(q));
    this.isQuotationReadOnly = true;
    this.showQuotationModal  = true;
  }

  closeQuotationModal(): void {
    this.showQuotationModal = false;
    this.editingQuotation   = null;
  }

  // ── Item editing ──────────────────────────────────────────────────────────────
  onPriceChange(item: QuotationItem, raw: string): void {
    const v        = parseFloat(raw);
    item.unitPrice = isNaN(v) || v < 0 ? null : v;
    item.totalPrice = item.unitPrice !== null ? item.unitPrice * item.quantity : null;
    this.recalcEditing();
  }

  toggleUnavailable(item: QuotationItem): void {
    item.availability = item.availability === 'available' ? 'unavailable' : 'available';
    if (item.availability === 'unavailable') { item.unitPrice = null; item.totalPrice = null; }
    this.recalcEditing();
  }

  private recalcEditing(): void {
    if (!this.editingQuotation) return;
    const q        = this.editingQuotation;
    const subtotal = q.items.reduce((s, i) =>
      i.availability === 'available' && i.unitPrice !== null
        ? s + i.unitPrice * i.quantity : s, 0);
    q.subtotal = subtotal;
    q.tax      = subtotal * 0.075;
    q.total    = subtotal + q.tax;
  }

  isComplete(q: Quotation): boolean {
    return q.items.some(i => i.availability === 'available' && i.unitPrice !== null);
  }

  get editingComplete(): boolean {
    return !!this.editingQuotation && this.isComplete(this.editingQuotation);
  }

  // ── Save / Send ───────────────────────────────────────────────────────────────
  saveDraft(): void {
    if (!this.editingQuotation) return;
    this.vendorService.updateQuotation(this.editingQuotation);
    this.refreshStats();
    this.closeQuotationModal();
  }

  openSendConfirm(q: Quotation): void {
    this.quotationToSend = q;
    this.showSendConfirm = true;
  }

  requestSendFromModal(): void {
    if (this.editingQuotation && this.editingComplete) {
      this.vendorService.updateQuotation(this.editingQuotation);
      this.openSendConfirm(this.editingQuotation);
    }
  }

  cancelSend(): void { this.showSendConfirm = false; this.quotationToSend = null; }

  executeSend(): void {
    if (!this.quotationToSend) return;
    this.vendorService.sendQuotation(this.quotationToSend.id);
    this.showSendConfirm   = false;
    this.quotationToSend   = null;
    this.closeQuotationModal();
    this.refreshStats();
  }

  // ── Downloads (stub) ──────────────────────────────────────────────────────────
  downloadRfq(rfq: Rfq, event: MouseEvent): void {
    event.stopPropagation();
    console.log('[VendorPortal] Download RFQ:', rfq.rfqNumber);
  }

  downloadQuotation(q: Quotation, event: MouseEvent): void {
    event.stopPropagation();
    console.log('[VendorPortal] Download Quotation:', q.quotationNumber);
  }

  // ── Formatting ────────────────────────────────────────────────────────────────
  fmtDate(d: Date | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  fmtCurrency(n: number, cur = 'NGN'): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: cur, minimumFractionDigits: 2
    }).format(n);
  }

  // ── Date helpers ──────────────────────────────────────────────────────────────
  isExpired(d: Date):  boolean { return new Date(d) < new Date(); }
  isDueSoon(d: Date):  boolean {
    const t = new Date(d).getTime(), now = Date.now();
    return t >= now && t <= now + 3 * 24 * 60 * 60 * 1000;
  }

  dueDateClass(rfq: Rfq): string {
    if (rfq.status !== 'open')         return '';
    if (this.isExpired(rfq.dueDate))   return 'text-danger';
    if (this.isDueSoon(rfq.dueDate))   return 'text-warning';
    return '';
  }

  // ── Badge classes ─────────────────────────────────────────────────────────────
  rfqBadge(status: string): string {
    const m: Record<string, string> = { open: 'badge-open', converted: 'badge-converted', expired: 'badge-expired', closed: 'badge-closed' };
    return `badge ${m[status] ?? ''}`;
  }

  quotBadge(status: string): string {
    const m: Record<string, string> = { draft: 'badge-draft', sent: 'badge-sent', accepted: 'badge-accepted', rejected: 'badge-rejected' };
    return `badge ${m[status] ?? ''}`;
  }
}
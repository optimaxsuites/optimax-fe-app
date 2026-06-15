import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';

import { VendorService } from '../../../service/vendor-portal/vendor.service';
import {
  Lpo, Invoice, FinanceStats, LpoStats,
  InvoiceLineItem,
} from '../../../domain/vendor-portal/vendor.dto';
import { TableColumn } from '../../../shared-component/view/table/table.component';

type ActiveTable = 'lpos' | 'invoices';

@Component({
  selector: 'app-finance',
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.scss',
})
export class FinanceComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ── Data ─────────────────────────────────────────────────────────────────────
  lpos:        Lpo[]     = [];
  invoices:    Invoice[] = [];
  financeStats: FinanceStats | null = null;
  lpoStats:     LpoStats | null = null;

  // ── Table toggle ──────────────────────────────────────────────────────────────
  activeTable: ActiveTable = 'lpos';

  // ── LPO side panel ────────────────────────────────────────────────────────────
  showLpoPanel = false;
  selectedLpo: Lpo | null = null;

  // ── LPO Accept modal ──────────────────────────────────────────────────────────
  showAcceptModal = false;
  lpoToAccept: Lpo | null = null;

  // ── LPO Reject modal ──────────────────────────────────────────────────────────
  showRejectModal  = false;
  lpoToReject:     Lpo | null = null;
  rejectionReason  = '';
  rejectionError   = false;

  // ── Invoice side panel ────────────────────────────────────────────────────────
  showInvoicePanel  = false;
  selectedInvoice:  Invoice | null = null;

  // ── Create Invoice centre modal ───────────────────────────────────────────────
  // Opened from either the LPO panel (pre-filled) or standalone
  showInvoiceModal  = false;
  invoiceForm: Partial<Invoice> & { items: InvoiceLineItem[] } = { items: [] };
  invoiceFormErrors: Record<string, string> = {};

  // ── LPO columns — 5 <td>s ────────────────────────────────────────────────────
  lpoColumns: TableColumn[] = [
    { header: 'LPO No.',       field: 'lpoNumber',    sortable: true },
    { header: 'Client',        field: 'clientName',   sortable: true },
    { header: 'Delivery Date', sortField: 'deliveryDate', sortable: true,
      formatter: (r: Lpo) => this.fmtDate(r.deliveryDate) },
    { header: 'Total Value',   align: 'right',
      formatter: (r: Lpo) => this.fmtCurrency(r.total, r.currency) },
    { header: 'Status',        field: 'status',       sortable: true },
  ];

  // ── Invoice columns — 5 <td>s ─────────────────────────────────────────────────
  invoiceColumns: TableColumn[] = [
    { header: 'Invoice No.',  field: 'invoiceNumber', sortable: true },
    { header: 'Client',       field: 'clientName',    sortable: true },
    { header: 'Issued / Due', sortField: 'issuedDate', sortable: true,
      formatter: (r: Invoice) => this.fmtDate(r.issuedDate) },
    { header: 'Total',        align: 'right',
      formatter: (r: Invoice) => this.fmtCurrency(r.total, r.currency) },
    { header: 'Status',       field: 'status',        sortable: true },
  ];

  constructor(private vendorService: VendorService) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.vendorService.getLpos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => this.lpos = list);

    this.vendorService.getInvoices()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => this.invoices = list);

    this.refreshStats();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private refreshStats(): void {
    this.vendorService.getLpoStats().pipe(take(1)).subscribe(s => this.lpoStats = s);
    this.vendorService.getFinanceStats().pipe(take(1)).subscribe(s => this.financeStats = s);
  }

  // ── Toggle ────────────────────────────────────────────────────────────────────
  switchTable(t: ActiveTable): void { this.activeTable = t; }

  get lpoUnreadCount(): number { return this.lpos.filter(l => !l.isRead).length; }
  get invoiceOverdueCount(): number { return this.invoices.filter(i => i.status === 'overdue').length; }

  // ─────────────────────────────────────────────────────────────────────────────
  // LPO FLOW  ── row click → side panel → accept/reject OR create invoice
  // ─────────────────────────────────────────────────────────────────────────────
  onLpoRowClick(lpo: Lpo): void {
    this.selectedLpo  = lpo;
    this.showLpoPanel = true;
    if (!lpo.isRead) { this.vendorService.markLpoAsRead(lpo.id); }
  }

  closeLpoPanel(): void { this.showLpoPanel = false; this.selectedLpo = null; }

  // Accept
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

  // Reject
  openRejectModal(lpo: Lpo): void {
    this.lpoToReject     = lpo;
    this.rejectionReason = '';
    this.rejectionError  = false;
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.lpoToReject     = null;
    this.rejectionReason = '';
    this.rejectionError  = false;
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

  // Create invoice from an accepted LPO — pre-fills the invoice form
  createInvoiceFromLpo(lpo: Lpo): void {
    const num = `INV-${new Date().getFullYear()}-${String(this.invoices.length + 1).padStart(3, '0')}`;
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    this.invoiceForm = {
      invoiceNumber: num,
      lpoId:         lpo.id,
      lpoNumber:     lpo.lpoNumber,
      clientName:    lpo.clientName,
      clientEmail:   lpo.clientEmail,
      currency:      lpo.currency,
      issuedDate:    new Date(),
      dueDate,
      status:        'draft',
      subtotal:      lpo.subtotal,
      tax:           lpo.tax,
      total:         lpo.total,
      amountPaid:    0,
      amountOutstanding: lpo.total,
      notes:         '',
      items: lpo.items.map((item, idx) => ({
        id:          `item-${idx}`,
        description: `${item.name} (${item.quantity} ${item.unit} × ${this.fmtCurrency(item.unitPrice, lpo.currency)})`,
        quantity:    item.quantity,
        unit:        item.unit,
        unitPrice:   item.unitPrice,
        totalPrice:  item.totalPrice,
      })),
    };

    this.invoiceFormErrors = {};
    this.showInvoiceModal  = true;
  }

  // Create blank invoice
  openBlankInvoiceModal(): void {
    const num = `INV-${new Date().getFullYear()}-${String(this.invoices.length + 1).padStart(3, '0')}`;
    this.invoiceForm = {
      invoiceNumber: num,
      clientName:    '',
      currency:      'NGN',
      issuedDate:    new Date(),
      dueDate:       new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status:        'draft',
      subtotal:      0, tax: 0, total: 0,
      amountPaid:    0, amountOutstanding: 0,
      notes:         '',
      items:         [{ id: 'item-0', description: '', quantity: 1, unit: 'pcs', unitPrice: 0, totalPrice: 0 }],
    };
    this.invoiceFormErrors = {};
    this.showInvoiceModal  = true;
  }

  closeInvoiceModal(): void { this.showInvoiceModal = false; }

  recalcInvoiceForm(): void {
    const subtotal = (this.invoiceForm.items || []).reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    this.invoiceForm.subtotal         = subtotal;
    this.invoiceForm.tax              = subtotal * 0.075;
    this.invoiceForm.total            = subtotal * 1.075;
    this.invoiceForm.amountOutstanding = this.invoiceForm.total;
  }

  updateItemPrice(item: InvoiceLineItem, raw: string): void {
    item.unitPrice  = parseFloat(raw.replace(/,/g, '')) || 0;
    item.totalPrice = item.unitPrice * item.quantity;
    this.recalcInvoiceForm();
  }

  updateItemQty(item: InvoiceLineItem, raw: string): void {
    item.quantity   = parseInt(raw, 10) || 1;
    item.totalPrice = item.unitPrice * item.quantity;
    this.recalcInvoiceForm();
  }

  addInvoiceItem(): void {
    const idx = (this.invoiceForm.items?.length ?? 0);
    this.invoiceForm.items?.push({ id: `item-${idx}`, description: '', quantity: 1, unit: 'pcs', unitPrice: 0, totalPrice: 0 });
  }

  removeInvoiceItem(idx: number): void {
    this.invoiceForm.items?.splice(idx, 1);
    this.recalcInvoiceForm();
  }

  submitInvoice(): void {
    this.invoiceFormErrors = {};
    if (!this.invoiceForm.clientName?.trim()) { this.invoiceFormErrors['clientName'] = 'Client name is required.'; }
    if (!this.invoiceForm.items?.length)      { this.invoiceFormErrors['items'] = 'At least one line item is required.'; }
    if (Object.keys(this.invoiceFormErrors).length > 0) return;

    // In real implementation call vendorService.createInvoice(...)
    console.log('[Finance] Submit invoice:', this.invoiceForm);
    this.closeInvoiceModal();
    this.closeLpoPanel();
    this.activeTable = 'invoices';
    this.refreshStats();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INVOICE FLOW  ── row click → side panel
  // ─────────────────────────────────────────────────────────────────────────────
  onInvoiceRowClick(inv: Invoice): void {
    this.selectedInvoice  = inv;
    this.showInvoicePanel = true;
  }

  closeInvoicePanel(): void { this.showInvoicePanel = false; this.selectedInvoice = null; }

  downloadLpo(lpo: Lpo, e: MouseEvent): void { e.stopPropagation(); console.log('[Finance] Download LPO:', lpo.lpoNumber); }
  downloadInvoice(inv: Invoice, e: MouseEvent): void { e.stopPropagation(); console.log('[Finance] Download Invoice:', inv.invoiceNumber); }

  paymentProgress(inv: Invoice): number {
    if (inv.total === 0) return 0;
    return Math.min(100, Math.round((inv.amountPaid / inv.total) * 100));
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
    if (!n) return '';
    return new Intl.NumberFormat('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  }

  isExpired(d: Date): boolean { return new Date(d) < new Date(); }
  isDueSoon(d: Date): boolean {
    const t = new Date(d).getTime(), now = Date.now();
    return t >= now && t <= now + 3 * 24 * 60 * 60 * 1000;
  }

  deliveryDateClass(lpo: Lpo): string {
    if (lpo.status !== 'pending' && lpo.status !== 'accepted') return '';
    if (this.isExpired(lpo.deliveryDate)) return 'text-danger';
    if (this.isDueSoon(lpo.deliveryDate)) return 'text-warning';
    return '';
  }

  lpoBadge(status: string): string {
    const m: Record<string, string> = {
      pending:   'badge-pending',
      accepted:  'badge-accepted',
      rejected:  'badge-rejected',
      fulfilled: 'badge-fulfilled',
      cancelled: 'badge-closed',
    };
    return `badge ${m[status] ?? ''}`;
  }

  invoiceBadge(status: string): string {
    const m: Record<string, string> = {
      draft:     'badge-draft',
      submitted: 'badge-submitted',
      approved:  'badge-approved',
      paid:      'badge-paid',
      overdue:   'badge-overdue',
      disputed:  'badge-disputed',
    };
    return `badge ${m[status] ?? ''}`;
  }
}
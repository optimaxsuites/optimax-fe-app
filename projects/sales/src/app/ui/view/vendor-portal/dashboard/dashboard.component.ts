import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';

import { VendorService } from '../../../service/vendor-portal/vendor.service';
import {
  Rfq,
  Quotation,
  QuotationItem,
  VendorStats,
} from '../../../domain/vendor-portal/vendor.dto';
import { TableColumn } from '../../../shared-component/view/table/table.component';

type ActiveTable = 'rfqs' | 'quotations';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  rfqs: Rfq[] = [];
  quotations: Quotation[] = [];
  stats: VendorStats | null = null;

  activeTable: ActiveTable = 'rfqs';

  // ── RFQ side panel ────────────────────────────────────────────────────────────
  showRfqPanel = false;
  selectedRfq: Rfq | null = null;

  // ── Quotation side panel ──────────────────────────────────────────────────────
  showQuotationPanel = false;
  selectedQuotation: Quotation | null = null;

  // ── Quotation editor centre modal (shared for both Convert and Edit flows) ────
  showQuotationModal = false;
  editingQuotation: Quotation | null = null;
  isQuotationReadOnly = false;

  // ── Send confirm modal ────────────────────────────────────────────────────────
  showSendConfirm = false;
  quotationToSend: Quotation | null = null;

  // ── RFQ columns
  // Each column has a formatter so resolveCell() always returns a value.
  // appTableBody overrides the <td> rendering but the headers must match exactly.
  // 6 columns → 6 <td>s in the template.
  rfqColumns: TableColumn[] = [
    {
      header: 'RFQ No.',
      field: 'rfqNumber',
      sortable: true,
    },
    {
      header: 'Client',
      field: 'clientName',
      sortable: true,
    },
    {
      header: 'Category',
      field: 'category',
      sortable: true,
    },
    {
      header: 'Due Date',
      sortable: true,
      sortField: 'dueDate',
      formatter: (row: Rfq) => this.fmtDate(row.dueDate),
    },
    {
      header: 'Est. Value',
      align: 'right',
      formatter: (row: Rfq) =>
        row.totalEstimatedValue ? this.fmtCurrency(row.totalEstimatedValue, row.currency) : '—',
    },
    {
      header: 'Status',
      field: 'status',
      sortable: true,
    },
  ];

  // ── Quotation columns
  // 5 columns → 5 <td>s in the template.
  quotationColumns: TableColumn[] = [
    {
      header: 'Quotation No.',
      field: 'quotationNumber',
      sortable: true,
    },
    {
      header: 'Client',
      field: 'clientName',
      sortable: true,
    },
    {
      header: 'Due / Created',
      sortable: true,
      sortField: 'createdDate',
      formatter: (row: Quotation) => this.fmtDate(row.createdDate),
    },
    {
      header: 'Total',
      align: 'right',
      formatter: (row: Quotation) =>
        row.total > 0 ? this.fmtCurrency(row.total, row.currency) : '—',
    },
    {
      header: 'Status',
      field: 'status',
      sortable: true,
    },
  ];

  constructor(private vendorService: VendorService) {}

  ngOnInit(): void {
    this.vendorService
      .getRfqs()
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => (this.rfqs = list));

    this.vendorService
      .getQuotations()
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => (this.quotations = list));

    this.refreshStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private refreshStats(): void {
    this.vendorService
      .getVendorStats()
      .pipe(take(1))
      .subscribe((s) => (this.stats = s));
  }

  switchTable(t: ActiveTable): void {
    this.activeTable = t;
  }

  get unreadCount(): number {
    return this.rfqs.filter((r) => !r.isRead).length;
  }
  get draftCount(): number {
    return this.quotations.filter((q) => q.status === 'draft').length;
  }

  // ── RFQ panel ─────────────────────────────────────────────────────────────────
  onRfqRowClick(rfq: Rfq): void {
    this.selectedRfq = rfq;
    this.showRfqPanel = true;
    if (!rfq.isRead) {
      this.vendorService.markRfqAsRead(rfq.id);
    }
  }

  closeRfqPanel(): void {
    this.showRfqPanel = false;
    this.selectedRfq = null;
  }

  rfqHasQuotation(rfqId: string): boolean {
    return this.vendorService.rfqHasQuotation(rfqId);
  }

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
    if (q) {
      this.openQuotationSidePanel(q);
    }
  }

  // ── Quotation panel ───────────────────────────────────────────────────────────
  onQuotationRowClick(q: Quotation): void {
    this.openQuotationSidePanel(q);
  }

  openQuotationSidePanel(q: Quotation): void {
    this.selectedQuotation = q;
    this.showQuotationPanel = true;
  }

  closeQuotationPanel(): void {
    this.showQuotationPanel = false;
    this.selectedQuotation = null;
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

  closeQuotationModal(): void {
    this.showQuotationModal = false;
    this.editingQuotation = null;
  }

  // ── Item editing ──────────────────────────────────────────────────────────────
  onPriceChange(item: QuotationItem, raw: string): void {
    const v = parseFloat(raw.replace(/,/g, ''));
    item.unitPrice = isNaN(v) || v < 0 ? null : v;
    item.totalPrice = item.unitPrice !== null ? item.unitPrice * item.quantity : null;
    this.recalcEditing();
  }

  toggleUnavailable(item: QuotationItem): void {
    item.availability = item.availability === 'available' ? 'unavailable' : 'available';
    if (item.availability === 'unavailable') {
      item.unitPrice = null;
      item.totalPrice = null;
    }
    this.recalcEditing();
  }

  private recalcEditing(): void {
    if (!this.editingQuotation) return;
    const q = this.editingQuotation;
    const subtotal = q.items.reduce(
      (s, i) =>
        i.availability === 'available' && i.unitPrice !== null ? s + i.unitPrice * i.quantity : s,
      0,
    );
    q.subtotal = subtotal;
    q.tax = subtotal * 0.075;
    q.total = subtotal + q.tax;
  }

  isComplete(q: Quotation): boolean {
    return q.items.some((i) => i.availability === 'available' && i.unitPrice !== null);
  }

  get editingComplete(): boolean {
    return !!this.editingQuotation && this.isComplete(this.editingQuotation);
  }

  // ── Save / Send ───────────────────────────────────────────────────────────────
  saveDraft(): void {
    if (!this.editingQuotation) return;
    this.vendorService.updateQuotation(this.editingQuotation);
    if (this.selectedQuotation?.id === this.editingQuotation.id) {
      this.selectedQuotation = JSON.parse(JSON.stringify(this.editingQuotation));
    }
    this.refreshStats();
    this.closeQuotationModal();
  }

  openSendConfirm(q: Quotation): void {
    this.quotationToSend = q;
    this.showSendConfirm = true;
  }
  cancelSend(): void {
    this.showSendConfirm = false;
    this.quotationToSend = null;
  }

  requestSendFromModal(): void {
    if (this.editingQuotation && this.editingComplete) {
      this.vendorService.updateQuotation(this.editingQuotation);
      this.openSendConfirm(this.editingQuotation);
    }
  }

  executeSend(): void {
    if (!this.quotationToSend) return;
    this.vendorService.sendQuotation(this.quotationToSend.id);
    this.showSendConfirm = false;
    this.quotationToSend = null;
    this.closeQuotationModal();
    this.closeQuotationPanel();
    this.refreshStats();
  }

  // ── Downloads ─────────────────────────────────────────────────────────────────
  downloadRfq(rfq: Rfq, e: MouseEvent): void {
    e.stopPropagation();
    console.log('Download RFQ', rfq.rfqNumber);
  }
  downloadQuotation(q: Quotation, e: MouseEvent): void {
    e.stopPropagation();
    console.log('Download Quotation', q.quotationNumber);
  }

  // ── Formatting ────────────────────────────────────────────────────────────────
  fmtDate(d: Date | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  fmtCurrency(n: number, cur = 'NGN'): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }

  fmtNumber(n: number | null): string {
    if (n === null || n === undefined) return '';
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  }

  isExpired(d: Date): boolean {
    return new Date(d) < new Date();
  }
  isDueSoon(d: Date): boolean {
    const t = new Date(d).getTime(),
      now = Date.now();
    return t >= now && t <= now + 3 * 24 * 60 * 60 * 1000;
  }

  dueDateClass(rfq: Rfq): string {
    if (rfq.status !== 'open') return '';
    if (this.isExpired(rfq.dueDate)) return 'text-danger';
    if (this.isDueSoon(rfq.dueDate)) return 'text-warning';
    return '';
  }

  rfqBadge(s: string): string {
    const m: Record<string, string> = {
      open: 'badge-open',
      converted: 'badge-converted',
      expired: 'badge-expired',
      closed: 'badge-closed',
    };
    return `badge ${m[s] ?? ''}`;
  }

  quotBadge(s: string): string {
    const m: Record<string, string> = {
      draft: 'badge-draft',
      sent: 'badge-sent',
      accepted: 'badge-accepted',
      rejected: 'badge-rejected',
    };
    return `badge ${m[s] ?? ''}`;
  }
}

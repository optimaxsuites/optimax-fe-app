import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { SalesDeliveryNote, SalesDeliveryNoteStatus, Quote } from '../../../../domain/sales/sales.dto';
import { formatApiDate } from '../../../../service/sales/date.util';

import { SharedOverlayModule } from '../../../../../shared-overlay.module';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

/** Row shape combining both real delivery note records and converted quotes still waiting on
 *  one — the two sources the dashboard table shows side by side. AWAITING_NOTE is a synthetic,
 *  UI-only status for the "pending" rows — kept distinct from the backend's own PENDING status
 *  (a real delivery note that's been created but not yet dispatched) so the two aren't conflated.
 *  Delivery notes are only ever generated through the quote-driven LPO wizard now (Conversion ->
 *  Receive LPO -> Generate Delivery Note), so the queue is keyed off converted quotes instead of
 *  orders past the invoice stage — see SalesService.getConvertedQuotesAwaitingDeliveryNote(). */
interface DeliveryNoteRow {
  kind: 'pending' | 'note';
  id: string | number;
  displayNumber: string;
  orderId: string;
  customerName: string;
  itemCount: number;
  status: 'AWAITING_NOTE' | SalesDeliveryNoteStatus;
  date: unknown;
  source: Quote | SalesDeliveryNote;
}

@Component({
  selector: 'app-delivery-note-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedOverlayModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './delivery-note-list.component.html',
  styleUrls: ['./delivery-note-list.component.scss']
})
export class DeliveryNoteListComponent implements OnInit, OnDestroy {
  protected readonly Math = Math;

  pendingQuotes: Quote[] = [];
  deliveryNotes: SalesDeliveryNote[] = [];
  customers: any[] = [];
  orderIdByQuoteId = new Map<number, string>();
  orderIdByTransactionId = new Map<number, string>();
  rows: DeliveryNoteRow[] = [];
  filteredRows: DeliveryNoteRow[] = [];
  isLoading = true;

  filters = {
    status: 'ALL',
    searchTerm: ''
  };

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;

  stats = {
    total: 0,
    awaitingNote: 0,
    pending: 0,
    dispatched: 0,
    delivered: 0
  };

  statusOptions: { value: string; label: string; icon: string }[] = [
    { value: 'ALL', label: 'All', icon: 'fa-layer-group' },
    { value: 'AWAITING_NOTE', label: 'Awaiting Note', icon: 'fa-hourglass-half' },
    { value: 'PENDING', label: 'Pending', icon: 'fa-clock' },
    { value: 'DISPATCHED', label: 'Dispatched', icon: 'fa-truck' },
    { value: 'DELIVERED', label: 'Delivered', icon: 'fa-check-circle' },
    { value: 'CANCELLED', label: 'Cancelled', icon: 'fa-times-circle' }
  ];

  aiDismissed = false;

  private destroy$ = new Subject<void>();

  constructor(
    private messageService: MessageService,
    private salesService: SalesService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.isLoading = true;
    forkJoin({
      pending: this.salesService.getConvertedQuotesAwaitingDeliveryNote(),
      notes: this.salesService.getDeliveryNotes({ size: 1000 }),
      customers: this.salesService.getCustomers({ page: 0, size: 200 }),
      orderIdLookup: this.salesService.getOrderIdLookup()
    }).subscribe({
      next: ({ pending, notes, customers, orderIdLookup }) => {
        this.customers = customers.data;
        this.pendingQuotes = pending;
        this.deliveryNotes = notes.data;
        this.orderIdByQuoteId = orderIdLookup.byQuoteId;
        this.orderIdByTransactionId = orderIdLookup.byTransactionId;
        this.buildRows();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading delivery notes:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load delivery notes. Please try again.' });
        this.isLoading = false;
      }
    });
  }

  private buildRows(): void {
    const pendingRows: DeliveryNoteRow[] = this.pendingQuotes.map(quote => ({
      kind: 'pending',
      id: quote.id,
      displayNumber: quote.quoteNumber || `#${quote.id}`,
      orderId: this.orderIdByQuoteId.get(quote.id) || '—',
      customerName: this.getCustomerName(quote.customerId, quote.customerName),
      itemCount: (quote.items || []).length,
      status: 'AWAITING_NOTE',
      date: quote.createdAt,
      source: quote
    }));

    const noteRows: DeliveryNoteRow[] = this.deliveryNotes.map(note => ({
      kind: 'note',
      id: note.id ?? note.deliveryNumber,
      displayNumber: note.deliveryNumber,
      orderId: (note.salesOrderId != null ? this.orderIdByTransactionId.get(note.salesOrderId) : undefined) || '—',
      customerName: this.getCustomerName(note.customerId),
      itemCount: (note.items || []).length,
      status: note.status || 'PENDING',
      date: note.createdAt,
      source: note
    }));

    this.rows = [...pendingRows, ...noteRows];
    this.calculateStats();
    this.applyFilters();
  }

  private calculateStats(): void {
    this.stats = {
      total: this.rows.length,
      awaitingNote: this.rows.filter(r => r.status === 'AWAITING_NOTE').length,
      pending: this.rows.filter(r => r.status === 'PENDING').length,
      dispatched: this.rows.filter(r => r.status === 'DISPATCHED').length,
      delivered: this.rows.filter(r => r.status === 'DELIVERED').length
    };
  }

  applyFilters(): void {
    let result = [...this.rows];

    if (this.filters.status !== 'ALL') {
      result = result.filter(r => r.status === this.filters.status);
    }

    if (this.filters.searchTerm.trim()) {
      const term = this.filters.searchTerm.toLowerCase().trim();
      result = result.filter(r =>
        r.displayNumber.toLowerCase().includes(term) ||
        r.customerName.toLowerCase().includes(term)
      );
    }

    // Most recent first.
    result.sort((a, b) => {
      const aTime = this.toTime(a.date);
      const bTime = this.toTime(b.date);
      return bTime - aTime;
    });

    this.totalPages = Math.ceil(result.length / this.pageSize) || 1;
    if (this.currentPage >= this.totalPages) this.currentPage = 0;

    const start = this.currentPage * this.pageSize;
    this.filteredRows = result.slice(start, start + this.pageSize);
  }

  private toTime(value: unknown): number {
    if (!value) return 0;
    const d = new Date(value as any);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  resetFilters(): void {
    this.filters = { status: 'ALL', searchTerm: '' };
    this.currentPage = 0;
    this.applyFilters();
  }

  onPageChange(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.currentPage = page;
    this.applyFilters();
  }

  getPageNumbers(): number[] {
    const maxVisible = 5;
    let start = Math.max(0, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible);
    if (end - start < maxVisible) start = Math.max(0, end - maxVisible);
    return Array.from({ length: end - start }, (_, i) => start + i);
  }

  getCustomerName(customerId: any, customerName?: any): string {
    if (customerName) {
      if (typeof customerName === 'object') return customerName.name || String(customerName) || '—';
      return String(customerName);
    }
    if (!customerId) return '—';
    if (typeof customerId === 'object') {
      if (customerId.name) return customerId.name;
      const id = customerId.id ?? customerId;
      const c = this.customers.find(c => c.id === id || String(c.id) === String(id));
      return c?.name || 'Customer';
    }
    const c = this.customers.find(c => c.id === customerId || String(c.id) === String(customerId));
    return c?.name || `Customer #${customerId}`;
  }

  formatDate(date: unknown): string {
    return formatApiDate(date);
  }

  /** Maps a row's status to the `dnl-status-badge--*` suffix defined in the stylesheet —
   *  AWAITING_NOTE (synthetic) reuses the orange "pending" look, and the backend's own PENDING
   *  (created, not yet dispatched) reuses the gray "draft" look. */
  getStatusBadgeSuffix(status: string): string {
    const suffixes: Record<string, string> = {
      AWAITING_NOTE: 'pending',
      PENDING: 'draft',
      DISPATCHED: 'dispatched',
      IN_TRANSIT: 'dispatched',
      DELIVERED: 'delivered',
      RETURNED: 'cancelled',
      CANCELLED: 'cancelled'
    };
    return suffixes[status] || 'draft';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      AWAITING_NOTE: 'Awaiting Note',
      PENDING: 'Pending',
      DISPATCHED: 'Dispatched',
      IN_TRANSIT: 'In Transit',
      DELIVERED: 'Delivered',
      RETURNED: 'Returned',
      CANCELLED: 'Cancelled'
    };
    return labels[status] || status;
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  private navExtras() {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    return uuid ? uuid : null;
  }

  generateFromQuote(row: DeliveryNoteRow): void {
    const uuid = this.navExtras();
    const path = uuid ? ['/admin/sales/delivery-notes/generate', uuid] : ['/admin/sales/delivery-notes/generate'];
    this.router.navigate(path, { queryParams: { quoteId: String(row.id) } });
  }

  viewDeliveryNote(row: DeliveryNoteRow): void {
    const uuid = this.navExtras();
    this.router.navigate(uuid ? ['/admin/sales/delivery-notes', row.id, uuid] : ['/admin/sales/delivery-notes', row.id]);
  }

  editDeliveryNote(row: DeliveryNoteRow): void {
    const uuid = this.navExtras();
    this.router.navigate(uuid ? ['/admin/sales/delivery-notes', row.id, 'edit', uuid] : ['/admin/sales/delivery-notes', row.id, 'edit']);
  }

  canEdit(row: DeliveryNoteRow): boolean {
    return row.kind === 'note' && row.status === 'PENDING';
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { DeliveryNote, DeliveryNoteStatus, SalesandTransactions } from '../../../../domain/sales/sales.dto';
import { formatApiDate } from '../../../../service/sales/date.util';

import { SharedOverlayModule } from '../../../../../shared-overlay.module';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

/** Row shape combining both real delivery note records and orders that are still waiting for
 *  one — the two sources the dashboard table shows side by side. AWAITING_NOTE is a synthetic,
 *  UI-only status for the "pending" rows — kept distinct from the backend's own PENDING status
 *  (a real delivery note that's been created but not yet dispatched) so the two aren't conflated. */
interface DeliveryNoteRow {
  kind: 'pending' | 'note';
  id: string | number;
  displayNumber: string;
  customerName: string;
  itemCount: number;
  status: 'AWAITING_NOTE' | DeliveryNoteStatus;
  date: unknown;
  source: SalesandTransactions | DeliveryNote;
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

  pendingOrders: SalesandTransactions[] = [];
  deliveryNotes: DeliveryNote[] = [];
  customers: any[] = [];
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
      pending: this.salesService.getOrdersAwaitingDeliveryNote(),
      notes: this.salesService.getDeliveryNotes({ size: 1000 }),
      customers: this.salesService.getCustomers({ page: 0, size: 200 })
    }).subscribe({
      next: ({ pending, notes, customers }) => {
        this.customers = customers.data;
        this.pendingOrders = pending;
        this.deliveryNotes = notes.data;
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
    const pendingRows: DeliveryNoteRow[] = this.pendingOrders.map(tx => ({
      kind: 'pending',
      id: tx.id,
      displayNumber: tx.orderId || `#${tx.id}`,
      customerName: this.getCustomerName(tx.customerId, tx.customerName),
      itemCount: this.countOrderItems(tx),
      status: 'AWAITING_NOTE',
      date: tx.orderDate || tx.quoteConvertedDate,
      source: tx
    }));

    const noteRows: DeliveryNoteRow[] = this.deliveryNotes.map(note => ({
      kind: 'note',
      id: note.id ?? note.deliveryNumber,
      displayNumber: note.deliveryNumber,
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

  private countOrderItems(tx: SalesandTransactions): number {
    const invoiceItems = (tx.invoiceId as any)?.items;
    if (Array.isArray(invoiceItems)) return invoiceItems.length;
    const txItems = (tx.items as any)?.items;
    if (Array.isArray(txItems)) return txItems.length;
    const quoteItems = (tx.quoteId as any)?.items;
    if (Array.isArray(quoteItems)) return quoteItems.length;
    return 0;
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
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled'
    };
    return suffixes[status] || 'draft';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      AWAITING_NOTE: 'Awaiting Note',
      PENDING: 'Pending',
      DISPATCHED: 'Dispatched',
      DELIVERED: 'Delivered',
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

  openNewDeliveryNote(): void {
    const uuid = this.navExtras();
    this.router.navigate(uuid ? ['/admin/sales/delivery-notes/new', uuid] : ['/admin/sales/delivery-notes/new']);
  }

  createFromOrder(row: DeliveryNoteRow): void {
    const uuid = this.navExtras();
    const path = uuid ? ['/admin/sales/delivery-notes/new', uuid] : ['/admin/sales/delivery-notes/new'];
    this.router.navigate(path, { queryParams: { orderId: String(row.id) } });
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

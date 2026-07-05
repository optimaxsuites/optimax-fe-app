import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountingService } from '../../../services/accounting.service';
import { AccountingEventDTO, PaginationResult } from '../../domain/accounting.dto';
import { formatFlexDate } from '../../sharedComponent/date.util';
import { downloadCsv } from '../../sharedComponent/export.util';

@Component({
  selector: 'app-finance-events',
  templateUrl: './finance-events.component.html',
  styleUrls: ['./finance-events.component.scss'],
})
export class FinanceEventsComponent implements OnInit, OnDestroy {
  events: AccountingEventDTO[] = [];
  totalSize = 0;
  page = 0;
  pageSize = 20;
  loading = false;

  searchQuery = '';
  filterModule = '';
  filterStatus = '';
  filterCurrency = '';

  stats = { initiated: 0, pending: 0, approved: 0, completed: 0 };
  selectedEvent: AccountingEventDTO | null = null;

  private subs = new Subscription();

  constructor(
    private accountingService: AccountingService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  load(): void {
    this.loading = true;
    this.subs.add(
      this.accountingService.getEvents(this.page, this.pageSize).subscribe({
        next: (res: PaginationResult<AccountingEventDTO>) => {
          this.events = res.content;
          this.totalSize = res.totalSize;
          this.computeStats();
          this.loading = false;
        },
        error: () => { this.loading = false; }
      })
    );
  }

  computeStats(): void {
    this.stats = {
      initiated: this.events.filter(e => this.getStatus(e) === 'INITIATED').length,
      pending:   this.events.filter(e => this.getStatus(e) === 'PENDING').length,
      approved:  this.events.filter(e => this.getStatus(e) === 'APPROVED').length,
      completed: this.events.filter(e => this.getStatus(e) === 'COMPLETED').length,
    };
  }

  getStatus(ev: AccountingEventDTO): string {
    return (ev as any).status || ev.metadata?.status || 'PENDING';
  }

  getDirection(ev: AccountingEventDTO): string {
    return ev.metadata?.direction || ev.metadata?.type || 'OUT';
  }

  getCounterparty(ev: AccountingEventDTO): string {
    return ev.metadata?.memberName || ev.metadata?.counterparty
      || ev.metadata?.employeeName || ev.metadata?.accountName || '—';
  }

  formatAmount(ev: AccountingEventDTO): string {
    const symbol = ev.currency === 'USD' ? '$' : ev.currency === 'GBP' ? '£' : '₦';
    return symbol + (ev.amount ?? 0).toLocaleString();
  }

  formatDate(d: any): string { return formatFlexDate(d); }

  get filteredEvents(): AccountingEventDTO[] {
    const q = this.searchQuery.toLowerCase();
    return this.events.filter(ev => {
      if (q && !ev.reference?.toLowerCase().includes(q) && !ev.description?.toLowerCase().includes(q)) return false;
      if (this.filterModule && ev.sourceModule !== this.filterModule) return false;
      if (this.filterStatus && this.getStatus(ev) !== this.filterStatus) return false;
      if (this.filterCurrency && ev.currency !== this.filterCurrency) return false;
      return true;
    });
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterModule = '';
    this.filterStatus = '';
    this.filterCurrency = '';
  }

  prevPage(): void {
    if (this.page > 0) { this.page--; this.load(); }
  }

  nextPage(): void {
    if ((this.page + 1) * this.pageSize < this.totalSize) { this.page++; this.load(); }
  }

  approve(ev: AccountingEventDTO): void {
    (ev as any).status = 'APPROVED';
    this.computeStats();
    if (this.selectedEvent?.id === ev.id) this.selectedEvent = null;
  }

  reject(ev: AccountingEventDTO): void {
    (ev as any).status = 'REJECTED';
    this.computeStats();
    if (this.selectedEvent?.id === ev.id) this.selectedEvent = null;
  }

  viewEvent(ev: AccountingEventDTO): void {
    this.selectedEvent = this.selectedEvent?.id === ev.id ? null : ev;
  }

  closeDetail(): void { this.selectedEvent = null; }

  openAuditLog(): void {
    const uuid = this.route.snapshot.params['uuid'];
    this.router.navigateByUrl(`/admin/accounting/finance-auditlog/${uuid}`);
  }

  exportCsv(): void {
    const headers = ['Date', 'Reference', 'Description', 'Counterparty', 'Module', 'Direction', 'Amount', 'Currency', 'Status'];
    const rows = this.filteredEvents.map(ev => [
      this.formatDate(ev.transactionDate),
      ev.reference || '',
      ev.description || ev.eventType,
      this.getCounterparty(ev),
      ev.sourceModule,
      this.getDirection(ev),
      ev.amount ?? 0,
      ev.currency,
      this.getStatus(ev),
    ]);
    downloadCsv(`accounting-events-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  get insightText(): string {
    if (this.loading) return 'Analysing events…';
    const n = this.events.length;
    if (!n) return 'No events found. Events are auto-generated when financial transactions occur across HR, POS, Expense and other modules.';
    const parts: string[] = [`${n} event${n !== 1 ? 's' : ''} loaded`];
    if (this.stats.pending > 0) parts.push(`⚠ ${this.stats.pending} pending approval`);
    if (this.stats.initiated > 0) parts.push(`${this.stats.initiated} initiated`);
    if (this.stats.approved > 0) parts.push(`${this.stats.approved} approved`);
    if (this.stats.completed > 0) parts.push(`${this.stats.completed} completed`);
    const action = this.stats.pending > 0
      ? ` → ${this.stats.pending} item${this.stats.pending > 1 ? 's' : ''} require your approval before they can post to ledger.`
      : ' → All events have been reviewed.';
    return parts.join(' · ') + action;
  }
}

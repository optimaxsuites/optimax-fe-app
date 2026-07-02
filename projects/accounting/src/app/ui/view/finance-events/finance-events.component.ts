import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountingService } from '../../../services/accounting.service';
import { AccountingEventDTO, PaginationResult } from '../../domain/accounting.dto';

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

  private subs = new Subscription();

  constructor(private accountingService: AccountingService) {}

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

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

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
  }

  reject(ev: AccountingEventDTO): void {
    (ev as any).status = 'REJECTED';
    this.computeStats();
  }
}

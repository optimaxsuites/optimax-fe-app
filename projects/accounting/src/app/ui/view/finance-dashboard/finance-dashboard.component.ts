import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { AccountingService } from '../../../services/accounting.service';
import { AccountingEventDTO, JournalEntryDTO, LedgerEntryDTO, AccountType } from '../../domain/accounting.dto';
import { formatFlexDate } from '../../sharedComponent/date.util';

@Component({
  selector: 'app-finance-dashboard',
  templateUrl: './finance-dashboard.component.html',
  styleUrls: ['./finance-dashboard.component.scss'],
})
export class FinanceDashboardComponent implements OnInit, OnDestroy {
  today = new Date();
  loading = false;

  pendingEvents = 0;
  totalJournals = 0;
  recentJournals: JournalEntryDTO[] = [];

  totalRevenue = 0;
  totalExpenses = 0;

  private subs = new Subscription();

  get netProfit(): number { return this.totalRevenue - this.totalExpenses; }

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
      forkJoin({
        events:   this.accountingService.getEvents(0, 100),
        journals: this.accountingService.getJournalEntries(0, 5),
        ledger:   this.accountingService.getLedgerEntries(0, 200)
      }).subscribe({
        next: ({ events, journals, ledger }) => {
          this.pendingEvents  = events.content.filter((e: AccountingEventDTO) =>
            ((e as any).status || e.metadata?.status || 'PENDING') === 'PENDING'
          ).length;

          this.totalJournals  = journals.totalSize;
          this.recentJournals = journals.content;

          // Derive revenue and expenses from ledger credit/debit by account type
          this.totalRevenue  = ledger.content
            .filter((l: LedgerEntryDTO) => l.account?.accountType === AccountType.INCOME)
            .reduce((s: number, l: LedgerEntryDTO) => s + (l.credit ?? 0), 0);

          this.totalExpenses = ledger.content
            .filter((l: LedgerEntryDTO) =>
              l.account?.accountType === AccountType.EXPENSE ||
              (l.account?.accountType as any) === 'COST_OF_SALES'
            )
            .reduce((s: number, l: LedgerEntryDTO) => s + (l.debit ?? 0), 0);

          this.loading = false;
        },
        error: () => { this.loading = false; }
      })
    );
  }

  formatNgn(val: number): string {
    if (!val) return '₦0';
    if (val >= 1_000_000) return '₦' + (val / 1_000_000).toFixed(1) + 'M';
    if (val >= 1_000)     return '₦' + (val / 1_000).toFixed(1) + 'K';
    return '₦' + val.toLocaleString();
  }

  formatDate(d: any): string { return formatFlexDate(d); }

  navigate(segment: string): void {
    const uuid = this.route.snapshot.params['uuid'];
    this.router.navigateByUrl(`/admin/accounting/${segment}/${uuid}`);
  }

  get insightText(): string {
    if (this.loading) return 'Aggregating financial data…';
    const profit = this.netProfit;
    const sign = profit >= 0 ? '+' : '';
    const parts: string[] = [
      `Revenue: ₦${this.totalRevenue.toLocaleString()}`,
      `Expenses: ₦${this.totalExpenses.toLocaleString()}`,
      `Net: ${sign}₦${Math.abs(profit).toLocaleString()}`,
    ];
    if (this.pendingEvents > 0) parts.push(`⚠ ${this.pendingEvents} event${this.pendingEvents > 1 ? 's' : ''} awaiting approval`);
    const action = this.pendingEvents > 0
      ? ` → Review pending events to keep your ledger current.`
      : profit < 0
        ? ` → Net loss detected. Review expense categories for cost optimisation opportunities.`
        : ` → Financials are healthy. All events reviewed.`;
    return parts.join(' · ') + action;
  }

  entryLabel(j: JournalEntryDTO): string {
    return `JE-${String(j.entryNumber ?? j.id).padStart(4, '0')}`;
  }
}

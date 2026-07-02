import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { AccountingService } from '../../../services/accounting.service';
import { AccountingEventDTO, JournalEntryDTO, LedgerEntryDTO, AccountType } from '../../domain/accounting.dto';

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

  constructor(private accountingService: AccountingService) {}

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

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  entryLabel(j: JournalEntryDTO): string {
    return `JE-${String(j.entryNumber ?? j.id).padStart(4, '0')}`;
  }
}

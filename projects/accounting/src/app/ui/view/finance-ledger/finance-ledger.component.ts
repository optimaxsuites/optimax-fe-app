import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { AccountingService } from '../../../services/accounting.service';
import { AccountDTO, LedgerEntryDTO, PaginationResult } from '../../domain/accounting.dto';

@Component({
  selector: 'app-finance-ledger',
  templateUrl: './finance-ledger.component.html',
  styleUrls: ['./finance-ledger.component.scss'],
})
export class FinanceLedgerComponent implements OnInit, OnDestroy {
  activeTab = 'ledger';
  today = new Date();

  ledgerEntries: LedgerEntryDTO[] = [];
  accounts: AccountDTO[] = [];
  totalSize = 0;
  page = 0;
  pageSize = 30;
  loading = false;

  filterAccountId: number | null = null;
  dateFrom = '';
  dateTo = '';

  private subs = new Subscription();

  constructor(private accountingService: AccountingService) {}

  ngOnInit(): void {
    this.subs.add(
      this.accountingService.getAccounts(0, 200).subscribe({
        next: res => { this.accounts = res.content; }
      })
    );
    this.load();
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  setTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'ledger') this.load();
  }

  load(): void {
    this.loading = true;
    this.subs.add(
      this.accountingService.getLedgerEntries(this.page, this.pageSize, this.filterAccountId ?? undefined).subscribe({
        next: (res: PaginationResult<LedgerEntryDTO>) => {
          this.ledgerEntries = res.content;
          this.totalSize = res.totalSize;
          this.loading = false;
        },
        error: () => { this.loading = false; }
      })
    );
  }

  applyFilter(): void {
    this.page = 0;
    this.load();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  journalRef(entry: LedgerEntryDTO): string {
    const id = entry.journalEntryLine?.journalEntry?.entryNumber
      ?? entry.journalEntryLine?.journalEntry?.id
      ?? entry.journalEntryLineId;
    return id ? `JE-${String(id).padStart(4, '0')}` : '—';
  }

  accountLabel(entry: LedgerEntryDTO): string {
    const acc = entry.account;
    return acc ? `${acc.accountCode} — ${acc.accountName}` : '—';
  }

  formatNgn(val: number): string {
    if (!val) return '—';
    return '₦' + val.toLocaleString();
  }

  // Trial balance: aggregate ledger entries by account
  get trialBalance(): { account: AccountDTO; totalDebit: number; totalCredit: number }[] {
    const map = new Map<number, { account: AccountDTO; totalDebit: number; totalCredit: number }>();
    for (const entry of this.ledgerEntries) {
      if (!entry.account) continue;
      const id = entry.account.id;
      if (!map.has(id)) map.set(id, { account: entry.account, totalDebit: 0, totalCredit: 0 });
      const row = map.get(id)!;
      row.totalDebit  += entry.debit  ?? 0;
      row.totalCredit += entry.credit ?? 0;
    }
    return Array.from(map.values()).sort((a, b) => a.account.accountCode - b.account.accountCode);
  }

  get trialTotalDebit(): number  { return this.trialBalance.reduce((s, r) => s + r.totalDebit,  0); }
  get trialTotalCredit(): number { return this.trialBalance.reduce((s, r) => s + r.totalCredit, 0); }
  get trialBalanced(): boolean   { return Math.abs(this.trialTotalDebit - this.trialTotalCredit) < 0.01; }

  typeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      ASSET: 'badge-blue', LIABILITY: 'badge-red', EQUITY: 'badge-purple',
      INCOME: 'badge-green', EXPENSE: 'badge-orange', COST_OF_SALES: 'badge-amber'
    };
    return map[type] || 'badge-gray';
  }

  prevPage(): void {
    if (this.page > 0) { this.page--; this.load(); }
  }

  nextPage(): void {
    if ((this.page + 1) * this.pageSize < this.totalSize) { this.page++; this.load(); }
  }
}

import { Component, OnInit } from '@angular/core';
import { AccountingService } from '../../../services/accounting.service';
import { ToastService } from '../../../services/toast.service';
import { AccountDTO, LedgerEntryDTO, PaginationResult, SourceModule } from '../../domain/accounting.dto';

export interface AccountLedgerGroup {
  accountName: string;
  accountId: number;
  account?: AccountDTO;
  entries: LedgerEntryDTO[];
  openingBalance: number;
}

@Component({
  selector: 'app-general-ledger',
  templateUrl: './general-ledger.component.html',
  styleUrls: ['./general-ledger.component.scss']
})
export class GeneralLedgerComponent implements OnInit {

  // ── Filter State ──────────────────────────────────────
  fromDate: string = '';
  toDate: string = '';
  selectedAccountId: number | string = '';
  selectedModule: string = '';
  searchQuery: string = '';

  // ── Source Modules ────────────────────────────────────
  sourceModules = Object.values(SourceModule);

  // ── Pagination ────────────────────────────────────────
  first: number = 0;
  rows: number = 10;
  rowsPerPageOptions: number[] = [10, 20, 50];
  totalRecords: number = 0;

  // ── Data ──────────────────────────────────────────────
  allEntries: LedgerEntryDTO[] = [];
  filteredEntries: LedgerEntryDTO[] = [];
  groupedLedger: AccountLedgerGroup[] = [];
  accounts: AccountDTO[] = [];
  loading = false;

  constructor(
    private accountingService: AccountingService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadAccounts();
    this.loadLedgerEntries();
  }

  loadAccounts() {
    this.accountingService.getAccounts(0, 1000).subscribe(res => {
      this.accounts = res.content || [];
    });
  }

  loadLedgerEntries() {
    this.loading = true;
    this.accountingService.getLedgerEntries(0, 1000).subscribe({
      next: (res: PaginationResult<LedgerEntryDTO>) => {
        this.allEntries = (res.content || []).map((entry: any) => ({
          ...entry,
          // Flatten nested fields the template expects as direct properties
          date: entry.entryDate,
          description: entry.description || entry.journalEntryLine?.description || 'System Entry',
          transactionReference: entry.transactionReference ||
            entry.journalEntryLine?.journalEntry?.transaction?.transactionReference || '—',
          sourceModule: entry.sourceModule ||
            entry.journalEntryLine?.journalEntry?.transaction?.sourceModule || 'MANUAL'
        }));
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.toastService.error('Failed to load ledger data');
        this.loading = false;
      }
    });
  }

  // ── Filtering ─────────────────────────────────────────
  applyFilters(): void {
    let result = [...this.allEntries];

    if (this.fromDate) {
      result = result.filter(e => e.entryDate >= this.fromDate);
    }
    if (this.toDate) {
      result = result.filter(e => e.entryDate <= this.toDate);
    }
    if (this.selectedAccountId) {
      result = result.filter(e => e.accountId === +this.selectedAccountId || e.account?.id === +this.selectedAccountId);
    }
    if (this.selectedModule) {
      // Note: SourceModule info might be nested or need derivation if not on LedgerEntry directly
      // For now, filtering by description or other hints if module isn't on DTO
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(e =>
        e.description?.toLowerCase().includes(q) ||
        e.account?.accountName?.toLowerCase().includes(q)
      );
    }

    this.filteredEntries = result;
    this.totalRecords = result.length;
    this.first = 0;
    this.buildGroups();
  }

  resetFilters(): void {
    this.fromDate = '';
    this.toDate = '';
    this.selectedAccountId = '';
    this.selectedModule = '';
    this.searchQuery = '';
    this.applyFilters();
  }

  // ── Grouping ──────────────────────────────────────────
  private buildGroups(): void {
    const map = new Map<number, AccountLedgerGroup>();

    for (const entry of this.filteredEntries) {
      const accId = entry.accountId || entry.account?.id;
      if (!accId) continue;

      if (!map.has(accId)) {
        map.set(accId, {
          accountId: accId,
          accountName: entry.account?.accountName || 'Unknown Account',
          account: entry.account,
          entries: [],
          openingBalance: 0
        });
      }
      map.get(accId)!.entries.push(entry);
    }

    // Calculate opening balance
    map.forEach(group => {
      group.entries.sort((a, b) => a.entryDate.localeCompare(b.entryDate));
      const firstEntry = group.entries[0];
      if (firstEntry) {
        group.openingBalance = firstEntry.balanceAfter
          - firstEntry.debit
          + firstEntry.credit;
      }
    });

    this.groupedLedger = Array.from(map.values());
  }

  // ── Pagination Event ──────────────────────────────────
  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  onRowClick(entry: any): void {
    console.log('[GeneralLedger] Drilling into:', entry.transactionReference);
  }

  // ── Export ────────────────────────────────────────────
  exportLedger(): void {
    const headers = ['Date', 'Description', 'Account', 'Debit', 'Credit', 'Balance After'];
    const rows = this.filteredEntries.map(e => [
      e.entryDate,
      e.description,
      e.account?.accountName || 'N/A',
      e.debit || '',
      e.credit || '',
      e.balanceAfter
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `general-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Helpers ───────────────────────────────────────────
  getModuleBadgeClass(module: string): string {
    const map: Record<string, string> = {
      POS:         'bg-blue-100 text-customBlue border-2 border-customBlue/20',
      HR:          'bg-purple-100 text-purple-800 border-2 border-purple-200',
      HOSPITALITY: 'bg-indigo-100 text-indigo-800 border-2 border-indigo-200',
      BANK:        'bg-teal-100 text-teal-800 border-2 border-teal-200',
    };
    return map[module] || 'bg-gray-100 text-gray-800 border-2 border-gray-200';
  }

  trackByAccount(_: number, group: AccountLedgerGroup): number { return group.accountId; }
  trackByEntry(_: number, entry: LedgerEntryDTO): number { return entry.id; }

  getTotalDebits(): number { return this.filteredEntries.reduce((sum, e) => sum + (e.debit || 0), 0); }
  getTotalCredits(): number { return this.filteredEntries.reduce((sum, e) => sum + (e.credit || 0), 0); }
  getGroupDebits(group: AccountLedgerGroup): number { return group.entries.reduce((sum, e) => sum + (e.debit || 0), 0); }
  getGroupCredits(group: AccountLedgerGroup): number { return group.entries.reduce((sum, e) => sum + (e.credit || 0), 0); }
  
  getClosingBalance(group: AccountLedgerGroup): number {
    if (!group.entries.length) return 0;
    return group.entries[group.entries.length - 1].balanceAfter;
  }
}

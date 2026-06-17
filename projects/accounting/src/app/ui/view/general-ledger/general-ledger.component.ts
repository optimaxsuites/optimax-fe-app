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

  // ── Entry Detail Drawer ───────────────────────────────
  selectedEntry: LedgerEntryDTO | null = null;
  isEntryOpen = false;

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
        console.log('[GeneralLedger Debug] Raw entries count:', res?.content?.length || 0);
        if (res?.content?.length > 0) {
          console.log('[GeneralLedger Debug] First entry raw:', res.content[0]);
        }
        
        this.allEntries = (res.content || []).map((entry: any) => {
          const normalizedDate = this.normalizeDateArray(entry.entryDate);
          return {
            ...entry,
            entryDate: normalizedDate,
            date: normalizedDate,
            description: entry.description || 
              entry.journalEntryLine?.description || 
              entry.journalEntryLine?.journalEntry?.description || 
              entry.journalEntryLine?.journalEntry?.transaction?.description || 'System Entry',
            transactionReference: entry.transactionReference ||
              entry.journalEntryLine?.journalEntry?.transaction?.transactionReference || 
              entry.journalEntryLine?.journalEntry?.transaction?.reference || '—',
            sourceModule: entry.sourceModule ||
              entry.journalEntryLine?.journalEntry?.transaction?.sourceModule || 
              entry.journalEntryLine?.journalEntry?.transaction?.source || 'MANUAL'
          };
        });
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
      // Fallback for missing account IDs to ensure data is still visible in a 'Suspense' category if necessary
      const safeAccId = accId || 999999; 
      const safeAccName = entry.account?.accountName || 'Unassigned/Suspense Account';

      if (!map.has(safeAccId)) {
        map.set(safeAccId, {
          accountId: safeAccId,
          accountName: safeAccName,
          account: entry.account,
          entries: [],
          openingBalance: 0
        });
      }
      map.get(safeAccId)!.entries.push(entry);
    }

    // Calculate opening balance
    map.forEach(group => {
      group.entries.sort((a, b) => {
        const dateA = new Date(a.entryDate || 0).getTime();
        const dateB = new Date(b.entryDate || 0).getTime();
        return dateA - dateB;
      });
      const firstEntry = group.entries[0];
      if (firstEntry) {
        group.openingBalance = (firstEntry.balanceAfter || 0)
          - (firstEntry.debit || 0)
          + (firstEntry.credit || 0);
      }
    });

    this.groupedLedger = Array.from(map.values());
  }

  // ── Pagination Event ──────────────────────────────────
  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  onRowClick(entry: LedgerEntryDTO): void {
    this.selectedEntry = entry;
    this.isEntryOpen = true;
  }

  closeEntryDrawer(): void {
    this.isEntryOpen = false;
    this.selectedEntry = null;
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

  printLedger(): void {
    if (!this.groupedLedger.length) {
      this.toastService.warn('No ledger data to print.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.toastService.error('Popup blocked! Please allow popups to print the ledger.');
      return;
    }

    const totalDebits = this.getTotalDebits();
    const totalCredits = this.getTotalCredits();
    
    let groupsHtml = '';
    this.groupedLedger.forEach(group => {
      let rowsHtml = '';
      group.entries.forEach(entry => {
        rowsHtml += `
          <tr>
            <td>${entry.entryDate || '—'}</td>
            <td>${entry.description || '—'}</td>
            <td>${entry.transactionReference || '—'}</td>
            <td class="amount">${entry.debit ? entry.debit.toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '-'}</td>
            <td class="amount">${entry.credit ? entry.credit.toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '-'}</td>
            <td class="amount">${entry.balanceAfter.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
          </tr>
        `;
      });

      groupsHtml += `
        <div class="account-section">
          <div class="account-header">
            <h3>${group.accountName} (${group.account?.accountCode || 'N/A'})</h3>
            <div class="balances">
              <span>Opening: ₦${group.openingBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
              <span style="margin-left: 20px;">Closing: ₦${this.getClosingBalance(group).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 15%">Date</th>
                <th style="width: 35%">Description</th>
                <th style="width: 20%">Reference</th>
                <th style="width: 10%">Debit</th>
                <th style="width: 10%">Credit</th>
                <th style="width: 10%">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    });

    const html = `
      <html>
        <head>
          <title>General Ledger - Optimax Accounting</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
            body { font-family: 'Inter', sans-serif; color: #111827; padding: 40px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid #2E6276; padding-bottom: 20px; margin-bottom: 40px; }
            .header-info h1 { margin: 0; font-size: 32px; font-weight: 800; color: #2E6276; text-transform: uppercase; letter-spacing: -1px; }
            .header-info p { margin: 5px 0 0; color: #6B7280; font-weight: 600; }
            .summary-box { background: #F9FAFB; padding: 20px; border-radius: 12px; display: flex; gap: 40px; margin-bottom: 40px; border: 1px solid #E5E7EB; }
            .summary-item label { display: block; font-size: 11px; font-weight: 800; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
            .summary-item span { font-size: 18px; font-weight: 800; color: #111827; }
            .account-section { margin-bottom: 50px; page-break-inside: avoid; }
            .account-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
            .account-header h3 { margin: 0; font-size: 20px; font-weight: 800; color: #111827; }
            .account-header .balances { font-weight: 600; color: #4B5563; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { text-align: left; background: #2E6276; color: white; padding: 12px 15px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
            td { padding: 12px 15px; border-bottom: 1px solid #F3F4F6; font-size: 12px; color: #374151; font-weight: 500; }
            .amount { text-align: right; font-family: monospace; font-weight: 700; }
            @media print {
              body { padding: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-info">
              <h1>General Ledger</h1>
              <p>Accounting Report • Printed on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          
          <div class="summary-box">
            <div class="summary-item"><label>Total Debits</label><span>₦${totalDebits.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span></div>
            <div class="summary-item"><label>Total Credits</label><span>₦${totalCredits.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span></div>
            <div class="summary-item"><label>Status</label><span style="color:#059669">POSTED</span></div>
          </div>

          ${groupsHtml}

          <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; font-size: 10px; color: #9CA3AF; font-weight: 600;">
            <span>Generated by Optimax ERP Accounting Module</span>
            <span>Signature: __________________________</span>
          </div>

          <script>
            window.onload = () => {
              window.print();
              // window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  private normalizeDateArray(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.length >= 3) {
      const [y, mo, d, h = 0, mi = 0, s = 0] = value;
      return new Date(y, mo - 1, d, h, mi, s).toISOString();
    }
    return String(value);
  }
}

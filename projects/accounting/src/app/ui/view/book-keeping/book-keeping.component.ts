import { Component, OnInit } from '@angular/core';
import { AccountingService } from '../../../services/accounting.service';
import { ToastService } from '../../../services/toast.service';
import { 
  JournalEntryDTO, 
  JournalEntryLineDTO, 
  PaginationResult 
} from '../../domain/accounting.dto';

@Component({
  selector: 'app-book-keeping',
  templateUrl: './book-keeping.component.html',
  styleUrl: './book-keeping.component.scss'
})
export class BookKeepingComponent implements OnInit {
  // Data
  journalEntries: JournalEntryDTO[] = [];
  selectedJournalLines: JournalEntryLineDTO[] = [];
  selectedJournal: JournalEntryDTO | null = null;

  // State
  loading = false;
  linesLoading = false;
  isLinesSidebarOpen = false;
  
  // Pagination
  totalRecords = 0;
  first = 0;
  rows = 10;

  // Filter state
  searchQuery = '';
  statusFilter = '';

  // Sort state for lines (sidebar)
  sortField = '';
  sortOrder = 1; // 1 for asc, -1 for desc

  // Sort state for main journals table
  mainSortField = '';
  mainSortOrder = 1; // 1 for asc, -1 for desc

  constructor(
    private accountingService: AccountingService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadJournalEntries();
  }

  loadJournalEntries() {
    this.loading = true;
    this.accountingService.getJournalEntries(this.first / this.rows, this.rows).subscribe({
      next: (res: PaginationResult<JournalEntryDTO>) => {
        // Java backend returns LocalDateTime as array [y,m,d,h,min,s,nano] — normalize to ISO string
        this.journalEntries = (res.content || []).map(entry => ({
          ...entry,
          entryDate: this.normalizeDateArray((entry as any).entryDate)
        }));
        this.totalRecords = res.totalSize || 0;
        this.loading = false;
      },
      error: () => {
        this.toastService.error('Failed to load journal entries');
        this.loading = false;
      }
    });
  }

  /** Converts Java LocalDateTime array [y,m,d,h,min,s,nano] or an ISO string to a JS Date string. */
  private normalizeDateArray(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.length >= 3) {
      const [y, mo, d, h = 0, mi = 0, s = 0] = value;
      return new Date(y, mo - 1, d, h, mi, s).toISOString();
    }
    return String(value);
  }

  viewJournalLines(entry: JournalEntryDTO) {
    this.selectedJournal = entry;
    this.isLinesSidebarOpen = true;
    this.loadJournalLines(entry.id);
  }

  loadJournalLines(journalId: number) {
    this.linesLoading = true;
    this.accountingService.getJournalLines(0, 100, journalId).subscribe({
      next: (res: PaginationResult<JournalEntryLineDTO>) => {
        this.selectedJournalLines = res.content || [];
        this.linesLoading = false;
      },
      error: () => {
        this.toastService.error('Failed to load journal lines');
        this.linesLoading = false;
      }
    });
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
    this.loadJournalEntries();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'POSTED': return 'bg-customGreen/10 text-customGreen border-customGreen/20';
      case 'DRAFT': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'REVERSED': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  // ── Computed sidebar helpers ─────────────────────────────
  getSidebarTotalDebit(): number {
    return this.selectedJournalLines.reduce((s, l) => s + (l.debitAmount || 0), 0);
  }

  getSidebarTotalCredit(): number {
    return this.selectedJournalLines.reduce((s, l) => s + (l.creditAmount || 0), 0);
  }

  isSidebarBalanced(): boolean {
    const d = this.getSidebarTotalDebit();
    const c = this.getSidebarTotalCredit();
    return Math.abs(d - c) < 0.01; // floating-point tolerance
  }

  // ── Stat helpers ───────────────────────────────────────
  getPostedCount(): number {
    return this.journalEntries.filter(e => e.status === 'POSTED').length;
  }

  getDraftCount(): number {
    return this.journalEntries.filter(e => e.status === 'DRAFT').length;
  }

  get filteredJournalEntries(): any[] {
    let list = [...this.journalEntries];
    if (this.statusFilter) {
      list = list.filter(e => e.status === this.statusFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(e =>
        (e.transaction?.transactionReference || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        String(e.entryNumber || e.id).includes(q)
      );
    }
    if (this.mainSortField) {
      list.sort((a, b) => {
        let valA = this.getNestedValue(a, this.mainSortField);
        let valB = this.getNestedValue(b, this.mainSortField);
        
        if (valA === undefined || valA === null) valA = 0;
        if (valB === undefined || valB === null) valB = 0;

        if (typeof valA === 'string') {
          return valA.localeCompare(valB) * this.mainSortOrder;
        } else {
          return (valA - valB) * this.mainSortOrder;
        }
      });
    }
    return list;
  }

  getNestedValue(obj: any, path: string): any {
    if (!obj) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  get sortedJournalLines(): JournalEntryLineDTO[] {
    if (!this.sortField) return this.selectedJournalLines;
    return [...this.selectedJournalLines].sort((a, b) => {
      let valA = (a as any)[this.sortField] || 0;
      let valB = (b as any)[this.sortField] || 0;
      if (valA < valB) return -1 * this.sortOrder;
      if (valA > valB) return 1 * this.sortOrder;
      return 0;
    });
  }

  sortBy(field: string) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 1 ? -1 : 1;
    } else {
      this.sortField = field;
      this.sortOrder = 1;
    }
  }

  sortMainBy(field: string) {
    if (this.mainSortField === field) {
      this.mainSortOrder = this.mainSortOrder === 1 ? -1 : 1;
    } else {
      this.mainSortField = field;
      this.mainSortOrder = 1;
    }
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.statusFilter = '';
    this.sortField = '';
    this.sortOrder = 1;
    this.mainSortField = '';
    this.mainSortOrder = 1;
    this.toastService.info('Filters cleared');
  }

  downloadVoucher(): void {
    if (!this.selectedJournal) return;

    const entry = this.selectedJournal;
    const lines = this.selectedJournalLines;
    const date  = new Date(entry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const ref   = entry.transaction?.transactionReference || '—';

    const lineRows = lines.map(l => `
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid #f1f1f1; font-weight:700">${l.account?.accountCode || ''} — ${l.account?.accountName || ''}</td>
        <td style="padding:12px 16px; border-bottom:1px solid #f1f1f1; text-align:right; color:#dc2626; font-weight:800">${l.debitAmount > 0 ? '₦' + l.debitAmount.toLocaleString('en-NG', {minimumFractionDigits:2}) : '—'}</td>
        <td style="padding:12px 16px; border-bottom:1px solid #f1f1f1; text-align:right; color:#059669; font-weight:800">${l.creditAmount > 0 ? '₦' + l.creditAmount.toLocaleString('en-NG', {minimumFractionDigits:2}) : '—'}</td>
      </tr>
    `).join('');

    const totalDebit  = lines.reduce((s, l) => s + (l.debitAmount || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (l.creditAmount || 0), 0);

    const html = `
      <!DOCTYPE html><html><head><title>Journal Voucher</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #111; }
        h1   { font-size: 28px; font-weight: 900; margin: 0; color: #2E6276; }
        .meta { margin: 24px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .meta-item label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; color: #9ca3af; display: block; }
        .meta-item span  { font-size: 15px; font-weight: 700; color: #111; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        thead tr { background: #2E6276; }
        thead th { padding: 12px 16px; color: white; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; text-align: left; }
        .totals td { font-weight: 900; background: #f9fafb; border-top: 2px solid #2E6276; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; }
        @media print { body { margin: 20px; } }
      </style></head><body>
      <h1>Journal Voucher</h1>
      <p style="color:#9ca3af;font-size:13px;margin:4px 0 0">#${entry.entryNumber ?? entry.id} &nbsp;•&nbsp; ${entry.status}</p>
      <div class="meta">
        <div class="meta-item"><label>Entry Date</label><span>${date}</span></div>
        <div class="meta-item"><label>Transaction Reference</label><span>${ref}</span></div>
        <div class="meta-item"><label>Description</label><span>${entry.description || '—'}</span></div>
        <div class="meta-item"><label>Status</label><span>${entry.status}</span></div>
      </div>
      <table>
        <thead><tr>
          <th>Account</th>
          <th style="text-align:right">Debit (₦)</th>
          <th style="text-align:right">Credit (₦)</th>
        </tr></thead>
        <tbody>${lineRows}</tbody>
        <tfoot><tr class="totals">
          <td style="padding:12px 16px;font-weight:900">TOTAL</td>
          <td style="padding:12px 16px;text-align:right;color:#dc2626">₦${totalDebit.toLocaleString('en-NG',{minimumFractionDigits:2})}</td>
          <td style="padding:12px 16px;text-align:right;color:#059669">₦${totalCredit.toLocaleString('en-NG',{minimumFractionDigits:2})}</td>
        </tr></tfoot>
      </table>
      <div class="footer">Generated by Optimax ERP &nbsp;&bull;&nbsp; ${new Date().toLocaleString()}</div>
      <script>window.onload = function(){ window.print(); }<\/script>
      </body></html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }
}

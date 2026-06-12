// disbursement.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DisbursementService } from '../../../services/disbursement.service';
import { Router } from '@angular/router';
import {
  AccountingTransactionDTO,
  BankConnectionDTO,
  DisbursementDTO
} from '../../domain/accounting.dto';

@Component({
  selector: 'app-disbursement',
  templateUrl: './disbursement.component.html',
  styleUrls: ['./disbursement.component.scss']
})
export class DisbursementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ── Styling ────────────────────────────────────────────
  customBlue = '#2E6276';
  customGreen = '#2EB270';

  // ── State ──────────────────────────────────────────────
  isLoading = false;
  isDetailOpen = false;
  isProcessing = false;
  
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // ── Data ───────────────────────────────────────────────
  transactions: AccountingTransactionDTO[] = [];
  filteredTransactions: AccountingTransactionDTO[] = [];
  disbursements: DisbursementDTO[] = [];
  bankConnections: BankConnectionDTO[] = [];

  // Resolved HR Data cache (id -> employee object)
  resolvedEmployees: Record<number, any> = {};

  // ── Selection / UI ─────────────────────────────────────
  selectedTransaction: AccountingTransactionDTO | null = null;
  selectedBankConnectionId: number | null = null;

  // ── Pagination ─────────────────────────────────────────
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  paginatedTransactions: AccountingTransactionDTO[] = [];

  // ── Filters ────────────────────────────────────────────
  activeModuleFilter = '';
  searchQuery = '';

  Math = Math;

  constructor(
    private disbursementService: DisbursementService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==========================================================================
  // DATA LOADING
  // ==========================================================================

  loadData(): void {
    this.isLoading = true;

    this.disbursementService.getApprovedTransactions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.transactions = (res.content || []).map(tx => {
            const rawStatus = tx.status || tx.Status || (tx as any).reviewStatus;
            return {
              ...tx,
              reviewStatus: rawStatus || 'APPROVED'
            };
          });
          this.applyFilters();
          this.isLoading = false;
        },
        error: (err) => { 
          console.error('Failed to load approved transactions', err);
          this.isLoading = false; 
        }
      });

    this.disbursementService.getDisbursements()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => { this.disbursements = res.content || []; },
        error: () => {}
      });

    this.disbursementService.getBankConnections()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => { this.bankConnections = (res.content || []).filter(b => b.active); },
        error: () => {}
      });
  }

  // ==========================================================================
  // SELECTION
  // ==========================================================================

  selectTransaction(trx: AccountingTransactionDTO): void {
    this.selectedTransaction = trx;
    this.isDetailOpen = true;
    this.resolveRecipientDetails(trx);
  }

  openWizard(): void {
    this.isDetailOpen = false;
    this.router.navigate(['/payout'], { 
      state: { transaction: this.selectedTransaction } 
    });
  }

  closeDetail(): void {
    this.isDetailOpen = false;
    this.selectedTransaction = null;
  }

  directPayout(trx: AccountingTransactionDTO): void {
    this.selectedTransaction = trx;
    this.openWizard();
  }

  resolveRecipientDetails(trx: AccountingTransactionDTO): void {
    const meta = trx.metadata || trx.accountingEvent?.metadata;
    if (!meta) return;

    if (Array.isArray(meta)) {
      // Batch resolve
      meta.forEach(r => {
        if (r.employeeId && !this.resolvedEmployees[r.employeeId]) {
          this.disbursementService.getEmployeeById(r.employeeId).subscribe(emp => {
            this.resolvedEmployees[r.employeeId] = emp;
          });
        }
      });
    } else if (meta.employeeId && !this.resolvedEmployees[meta.employeeId]) {
      // Single resolve
      this.disbursementService.getEmployeeById(meta.employeeId).subscribe(emp => {
        this.resolvedEmployees[meta.employeeId] = emp;
      });
    }
  }


  // ==========================================================================
  // PROVENANCE HELPERS
  // ==========================================================================

  getMappedBy(trx: AccountingTransactionDTO): string {
    const mb = trx.mappedBy;
    if (mb && typeof mb === 'object') return mb.fullname || mb.username || '—';
    if (typeof mb === 'string') return mb as string;
    return trx.metadata?.mappedBy || '—';
  }

  getApprovedBy(trx: AccountingTransactionDTO): string {
    const ab = trx.approvedBy;
    if (ab && typeof ab === 'object') return ab.fullname || ab.username || '—';
    if (typeof ab === 'string') return ab as string;
    return trx.metadata?.approvedBy || trx.metadata?.approverName || '—';
  }

  getApprovedDate(trx: AccountingTransactionDTO): string {
    const d = trx.approvalDate || trx.metadata?.approvalDate || trx.metadata?.approvedAt;
    if (!d) return '—';
    return new Date(d as string).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  getMappingId(trx: AccountingTransactionDTO): number | null {
    return trx.mapping?.id ?? trx.mappingMetadata?.id ?? trx.metadata?.mappingId ?? null;
  }

  isArray(obj: any): boolean {
    return Array.isArray(obj);
  }

  // ==========================================================================
  // MULTI-RECIPIENT GETTERS
  // ==========================================================================

  get isMultiRecipient(): boolean {
    const meta = this.selectedTransaction?.metadata || this.selectedTransaction?.accountingEvent?.metadata;
    return this.isArray(meta);
  }

  get recipientList(): any[] {
    if (!this.isMultiRecipient) return [];
    return this.selectedTransaction?.metadata || this.selectedTransaction?.accountingEvent?.metadata || [];
  }

  // ==========================================================================
  // RECIPIENT INFO (single)
  // ==========================================================================

  getRecipientInfo(trx: AccountingTransactionDTO): { name: string; bank: string; account: string } {
    const meta = trx.metadata || trx.accountingEvent?.metadata || trx.mappingMetadata?.metadata;
    if (!meta || Array.isArray(meta)) return { name: '—', bank: '—', account: '—' };

    // Prefer resolved HR data
    const hrEmp = meta.employeeId ? this.resolvedEmployees[meta.employeeId] : null;

    return {
      name: hrEmp ? `${hrEmp.firstName} ${hrEmp.lastName}` : (meta.recipientName || meta.accountName || meta.employeeName || meta.beneficiaryName || '—'),
      bank: hrEmp?.bankName || meta.bankName || meta.bank || '—',
      account: hrEmp?.accountNumber || meta.accountNumber || meta.account || '—'
    };
  }

  getRecipientCount(trx: AccountingTransactionDTO): number {
    const meta = trx.metadata || trx.accountingEvent?.metadata;
    if (this.isArray(meta)) return meta.length;
    return 1;
  }

  // ==========================================================================
  // FILTERS
  // ==========================================================================

  applyFilters(): void {
    let result = [...this.transactions];
    if (this.activeModuleFilter) {
      result = result.filter(t => t.sourceModule === this.activeModuleFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(t =>
        (t.transactionReference || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    }
    this.filteredTransactions = result;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredTransactions.length / this.pageSize) || 1;
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedTransactions = this.filteredTransactions.slice(start, end);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  setModuleFilter(module: string): void {
    this.activeModuleFilter = this.activeModuleFilter === module ? '' : module;
    this.applyFilters();
  }

  // ==========================================================================
  // STATS
  // ==========================================================================

  getApprovedCount(): number {
    return this.transactions.length;
  }

  getPendingDisbursementCount(): number {
    return this.disbursements.filter(d => d.status === 'PENDING').length;
  }

  getFailedCount(): number {
    return this.disbursements.filter(d => d.status === 'FAILED').length;
  }

  getDisbursedTodayAmount(): number {
    const today = new Date().toDateString();
    return this.disbursements
      .filter(d => d.status === 'DISBURSED' && new Date(d.disbursedAt || '').toDateString() === today)
      .reduce((sum, d) => sum + (d.totalDisbursementAmount || 0), 0);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  getModuleIcon(module: string): string {
    const icons: Record<string, string> = {
      'HR': 'fa-users',
      'HOSPITALITY': 'fa-hotel',
      'EXPENSE': 'fa-receipt',
      'MARKETPLACE': 'fa-store',
      'POS': 'fa-cash-register',
      'BANK': 'fa-building-columns',
      'MANUAL': 'fa-pen-to-square'
    };
    return icons[module] || 'fa-layer-group';
  }

  formatTxDate(date: any): string {
    if (!date) return '—';
    if (Array.isArray(date)) {
      return new Date(date[0], date[1] - 1, date[2]).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}
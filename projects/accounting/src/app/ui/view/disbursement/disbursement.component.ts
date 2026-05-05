// disbursement.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DisbursementService } from '../../../services/disbursement.service';
import {
  AccountingTransactionDTO,
  BankConnectionDTO,
  CreateDisbursementPayload,
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
  isDetailOpen = false;
  isConfirmModalOpen = false;
  selectedBankConnectionId: number | null = null;

  // ── Filters ────────────────────────────────────────────
  activeModuleFilter = '';
  searchQuery = '';

  constructor(private disbursementService: DisbursementService) {}

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
    this.selectedBankConnectionId = null;
    this.errorMessage = null;
    this.isDetailOpen = true;

    // Resolve HR data if needed
    this.resolveRecipientDetails(trx);
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

  closeDetail(): void {
    this.isDetailOpen = false;
    this.selectedTransaction = null;
    this.isConfirmModalOpen = false;
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
  // PAYOUT
  // ==========================================================================

  openConfirmModal(): void {
    if (!this.selectedBankConnectionId) {
      this.errorMessage = 'Please select a funding source before proceeding.';
      return;
    }
    this.errorMessage = null;
    this.isConfirmModalOpen = true;
  }

  cancelConfirm(): void {
    this.isConfirmModalOpen = false;
  }

  confirmPayout(): void {
    if (!this.selectedTransaction || !this.selectedBankConnectionId) return;

    const bankConn = this.bankConnections.find(b => b.id === this.selectedBankConnectionId);
    const disbursedFrom = bankConn?.providerName || 'Unknown';

    let payload: CreateDisbursementPayload;

    if (this.isMultiRecipient) {
      payload = {
        transactions: this.recipientList.map(() => ({ id: this.selectedTransaction!.id })),
        recipients: this.recipientList.map(r => ({ employeeId: r.employeeId, amount: r.amount })),
        totalDisbursementAmount: this.selectedTransaction.amount,
        status: 'PENDING',
        disbursedFrom
      };
    } else {
      payload = {
        transaction: { id: this.selectedTransaction.id },
        disbursementAmount: this.selectedTransaction.amount,
        status: 'PENDING',
        disbursedFrom
      };
    }

    this.isProcessing = true;
    this.disbursementService.createDisbursement(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isProcessing = false;
          this.isConfirmModalOpen = false;
          this.isDetailOpen = false;
          this.successMessage = 'Payout dispatched successfully!';
          setTimeout(() => { this.successMessage = null; }, 5000);
          this.loadData();
        },
        error: (err) => {
          this.isProcessing = false;
          this.errorMessage = err?.error?.message || 'Failed to process payout. Please try again.';
        }
      });
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
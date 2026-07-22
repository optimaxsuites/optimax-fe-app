import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DisbursementService } from '../../../services/disbursement.service';
import {
  AccountingTransactionDTO,
  CreateDisbursementPayload,
  DisbursementDTO,
  DisbursementStatus
} from '../../domain/accounting.dto';
import { formatFlexDate } from '../../sharedComponent/date.util';

@Component({
  selector: 'app-finance-payments',
  templateUrl: './finance-payments.component.html',
  styleUrls: ['./finance-payments.component.scss'],
})
export class FinancePaymentsComponent implements OnInit, OnDestroy {
  activeFilter = 'all';
  activeTab: 'tray' | 'history' = 'tray';
  wizardStep = 1;
  loading = false;
  processing = false;

  DisbursementStatus = DisbursementStatus;

  allDisbursements: DisbursementDTO[] = [];
  disbursementDetails = new Map<number, DisbursementDTO>();
  disbursementDetailLoading = new Set<number>();
  historyLoading = false;
  historySearch = '';
  historyPage = 1;
  historyPageSize = 10;
  expandedDisbursementId: number | null = null;

  allTransactions: AccountingTransactionDTO[] = [];
  selectedIds = new Set<number>();
  expandedId: number | null = null;

  searchQuery = '';
  pageSize = 10;
  currentPage = 1;

  paymentMethod = 'paystack';
  scheduleDate = '';
  disbursedFrom = 'ACCOUNT';
  secondAuthCode = '';

  paymentResult: DisbursementDTO | null = null;
  paymentError = '';

  private subs = new Subscription();

  constructor(private disbursementService: DisbursementService) {}

  ngOnInit(): void { this.load(); this.loadHistory(); }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  load(): void {
    this.loading = true;
    const module = this.activeFilter === 'all' ? undefined : this.activeFilter;
    this.subs.add(
      this.disbursementService.getApprovedTransactions(module).subscribe({
        next: res => { this.allTransactions = res.content ?? []; this.loading = false; },
        error: () => { this.loading = false; }
      })
    );
  }

  loadHistory(): void {
    this.historyLoading = true;
    this.disbursementDetails.clear();
    this.subs.add(
      this.disbursementService.getAllDisbursements().subscribe({
        next: res => { this.allDisbursements = res.content ?? []; this.historyLoading = false; },
        error: () => { this.historyLoading = false; }
      })
    );
  }

  setTab(t: 'tray' | 'history'): void {
    this.activeTab = t;
    if (t === 'history') this.loadHistory();
  }

  get filteredDisbursements(): DisbursementDTO[] {
    const q = this.historySearch.toLowerCase().trim();
    if (!q) return this.allDisbursements;
    return this.allDisbursements.filter(d =>
      String(d.id).includes(q) ||
      d.status?.toLowerCase().includes(q) ||
      d.disbursedFrom?.toLowerCase().includes(q) ||
      d.monifyReference?.toLowerCase().includes(q) ||
      d.createdAt?.toLowerCase().includes(q)
    );
  }

  get historyTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredDisbursements.length / this.historyPageSize));
  }

  get historyPageNumbers(): number[] {
    return Array.from({ length: this.historyTotalPages }, (_, i) => i + 1);
  }

  get pagedDisbursements(): DisbursementDTO[] {
    const start = (this.historyPage - 1) * this.historyPageSize;
    return this.filteredDisbursements.slice(start, start + this.historyPageSize);
  }

  onHistorySearch(val: string): void {
    this.historySearch = val;
    this.historyPage = 1;
  }

  goHistoryPage(p: number): void {
    if (p >= 1 && p <= this.historyTotalPages) this.historyPage = p;
  }

  toggleDisbursement(id: number): void {
    if (this.expandedDisbursementId === id) {
      this.expandedDisbursementId = null;
      return;
    }
    this.expandedDisbursementId = id;
    if (!this.disbursementDetails.has(id) && !this.disbursementDetailLoading.has(id)) {
      this.disbursementDetailLoading.add(id);
      this.subs.add(
        this.disbursementService.getDisbursementById(id).subscribe({
          next: detail => {
            this.disbursementDetails.set(id, detail);
            this.disbursementDetailLoading.delete(id);
          },
          error: () => { this.disbursementDetailLoading.delete(id); }
        })
      );
    }
  }

  getDisbursementDetail(id: number): DisbursementDTO | undefined {
    return this.disbursementDetails.get(id);
  }

  isDetailLoading(id: number): boolean {
    return this.disbursementDetailLoading.has(id);
  }

  disbursementStatusClass(s: DisbursementStatus): string {
    return ({
      [DisbursementStatus.DISBURSED]:   'status-disbursed',
      [DisbursementStatus.PROCESSING]:  'status-processing',
      [DisbursementStatus.PENDING]:     'status-pending',
      [DisbursementStatus.APPROVED]:    'status-approved',
      [DisbursementStatus.FAILED]:      'status-failed',
    } as any)[s] || '';
  }

  setFilter(f: string): void {
    this.activeFilter = f;
    this.selectedIds.clear();
    this.expandedId = null;
    this.searchQuery = '';
    this.currentPage = 1;
    this.load();
  }

  setStep(s: number): void {
    if (s === 2 && this.selectedIds.size === 0) return;
    this.wizardStep = s;
  }

  toggleCard(id: number): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  toggleSelect(t: AccountingTransactionDTO, event: Event): void {
    event.stopPropagation();
    const next = new Set(this.selectedIds);
    if (next.has(t.id)) { next.delete(t.id); } else { next.add(t.id); }
    this.selectedIds = next;
  }

  selectAll(): void {
    this.selectedIds = new Set(this.allTransactions.map(t => t.id));
  }

  deselectAll(): void {
    this.selectedIds = new Set();
  }

  get filteredTransactions(): AccountingTransactionDTO[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.allTransactions;
    return this.allTransactions.filter(t =>
      (t.transactionReference?.toLowerCase().includes(q)) ||
      (t.description?.toLowerCase().includes(q)) ||
      (t.sourceModule?.toLowerCase().includes(q)) ||
      (t.metadata?.employeeName?.toLowerCase().includes(q)) ||
      (t.metadata?.memberName?.toLowerCase().includes(q)) ||
      (t.externalReference?.toLowerCase().includes(q))
    );
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTransactions.length / this.pageSize));
  }

  get requests(): AccountingTransactionDTO[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredTransactions.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    return pages;
  }

  onSearch(val: string): void {
    this.searchQuery = val;
    this.currentPage = 1;
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.currentPage = p;
  }

  get selectedTransactions(): AccountingTransactionDTO[] {
    return this.allTransactions.filter(t => this.selectedIds.has(t.id));
  }

  get selectedTotal(): number {
    return this.selectedTransactions.reduce((s, t) => s + (t.amount ?? 0), 0);
  }

  get totalAwaiting(): number {
    return this.allTransactions.reduce((s, t) => s + (t.amount ?? 0), 0);
  }

  get requiresSecondAuth(): number {
    return this.allTransactions.filter(t => (t.amount ?? 0) >= 500_000).length;
  }

  get selectedRequireAuth(): number {
    return this.selectedTransactions.filter(t => (t.amount ?? 0) >= 500_000).length;
  }

  get byModule(): Record<string, { count: number; total: number }> {
    const map: Record<string, { count: number; total: number }> = {};
    for (const t of this.selectedTransactions) {
      const m = t.sourceModule ?? 'OTHER';
      if (!map[m]) map[m] = { count: 0, total: 0 };
      map[m].count++;
      map[m].total += t.amount ?? 0;
    }
    return map;
  }

  get byModuleEntries(): { module: string; count: number; total: number }[] {
    return Object.entries(this.byModule).map(([module, v]) => ({ module, ...v }));
  }

  formatNgn(val: number): string {
    return '₦' + (val ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  }

  formatDate(d: any): string {
    return formatFlexDate(d);
  }

  displayName(t: AccountingTransactionDTO): string {
    return t.description
      || t.metadata?.memberName
      || t.metadata?.employeeName
      || `TXN-${t.id}`;
  }

  displayMeta(t: AccountingTransactionDTO): string {
    return [t.sourceModule, t.metadata?.groupName || t.metadata?.purpose]
      .filter(Boolean).join(' · ');
  }

  avatarText(t: AccountingTransactionDTO): string {
    return this.displayName(t).split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  moduleClass(m: string): string {
    return ({ HR: 'payroll', EXPENSE: 'expense', BANK: 'vendor', HOSPITALITY: 'loans', MARKETPLACE: 'loans' } as any)[m] || '';
  }

  avatarClass(m: string): string {
    return ({ HR: 'payroll-bg', EXPENSE: 'expense-bg', BANK: 'vendor-bg', HOSPITALITY: 'loans-bg', MARKETPLACE: 'loans-bg' } as any)[m] || '';
  }

  tagClass(m: string): string {
    return ({ HR: 'payroll-tag', EXPENSE: 'expense-tag', BANK: 'vendor-tag', HOSPITALITY: 'loans-tag', MARKETPLACE: 'loans-tag' } as any)[m] || '';
  }

  processPayment(): void {
    if (this.processing || this.selectedIds.size === 0) return;
    this.processing = true;
    this.paymentError = '';

    const payload: CreateDisbursementPayload = {
      transactions: this.selectedTransactions.map(t => ({ id: t.id })),
      totalDisbursementAmount: this.selectedTotal,
      status: 'PENDING',
      disbursedFrom: this.disbursedFrom,
    };

    this.subs.add(
      this.disbursementService.createDisbursement(payload).subscribe({
        next: res => {
          this.paymentResult = res;
          this.processing = false;
          this.wizardStep = 5;
        },
        error: err => {
          this.paymentError = err?.error?.message || 'Payment failed. Please try again.';
          this.processing = false;
        }
      })
    );
  }

  resetWizard(): void {
    this.wizardStep = 1;
    this.selectedIds = new Set();
    this.expandedId = null;
    this.paymentResult = null;
    this.paymentError = '';
    this.secondAuthCode = '';
    this.load();
    this.loadHistory();
  }

  get insightText(): string {
    if (this.loading) return 'Loading payment tray…';
    const n = this.allTransactions.length;
    if (!n) return 'No pending payment requests. Requests appear here when expense claims or payroll runs are approved.';
    const auth2 = this.requiresSecondAuth;
    const total = this.totalAwaiting;
    const parts: string[] = [`${n} request${n !== 1 ? 's' : ''} pending disbursement · ₦${total.toLocaleString()} total`];
    if (auth2 > 0) parts.push(`⚠ ${auth2} require CBN dual-authorisation (>₦500k)`);
    const action = auth2 > 0
      ? ` → A second authoriser must approve before these can be processed.`
      : ` → Select requests in the tray, then proceed through the 5-step wizard.`;
    return parts.join(' · ') + action;
  }
}

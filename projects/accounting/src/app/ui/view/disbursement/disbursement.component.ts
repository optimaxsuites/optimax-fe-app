import { Component, OnInit } from '@angular/core';
import { concatMap } from 'rxjs/operators';
import { DisbursementService } from '../../../services/disbursement.service';
import {
  AccountingTransactionDTO,
  BankConnectionDTO,
  CreateDisbursementPayload,
  CreateTransactionPayload,
  DisbursementDTO,
  TransactionReviewStatus
} from '../../domain/accounting.dto';

interface FundingAccount {
  id: string;
  name: string;
  number: string;
  type: 'BANK' | 'CASH';
  bankName: string;
  balance: number;
  selected: boolean;
}

@Component({
  selector: 'app-disbursement',
  templateUrl: './disbursement.component.html',
  styleUrls: ['./disbursement.component.scss']
})
export class DisbursementComponent implements OnInit {

  // ── Data ────────────────────────────────────────────────
  allTransactions: AccountingTransactionDTO[] = [];
  filteredTransactions: AccountingTransactionDTO[] = [];
  allDisbursements: DisbursementDTO[] = [];
  searchQuery: string = '';

  // ── Loading / Error States ───────────────────────────────
  isLoadingTransactions = false;
  isLoadingFunding = false;
  payoutError: string | null = null;

  // ── Filters & Selection ──────────────────────────────────
  activeCardFilter: 'ALL' | 'TODAY' | 'PENDING' | 'APPROVED' | 'FAILED' = 'ALL';
  selectedSourceModule: string = '';
  selectedType: string = '';
  dateRange: string = '';
  selectedTransactions: Set<number> = new Set<number>();
  selectAll: boolean = false;

  // ── Sidebar State ────────────────────────────────────────
  isReviewModalOpen: boolean = false;
  selectedSidebarTransaction: any = null;

  // ── Funding Sources (loaded from bank-connections API) ───
  fundingAccounts: FundingAccount[] = [];

  // ── Wizard State ─────────────────────────────────────────
  viewMode: 'DASHBOARD' | 'EXECUTE' = 'DASHBOARD';
  selectedTransaction: AccountingTransactionDTO | null = null;
  currentStep: number = 1; // 1:Review  2:Source  3:Success
  isProcessing = false;
  internalMemo: string = '';
  disbursementDate: string = new Date().toISOString().split('T')[0];

  // Selected funding source (single)
  selectedSourceId: string | null = null;

  // Destination account form
  destBank: string = '';
  destAccountNumber: string = '';
  destAccountName: string = '';

  get selectedSource(): FundingAccount | undefined {
    return this.fundingAccounts.find(a => a.id === this.selectedSourceId);
  }

  // ── Dashboard Stats ──────────────────────────────────────
  get totalPendingValue(): number {
    return this.filteredTransactions.reduce((s, t) => s + t.amount, 0);
  }

  get approvedDisbursements(): number {
    return this.allTransactions.length;
  }

  get disbursementsToday(): number {
    const today = new Date().toDateString();
    return this.allTransactions.filter(t =>
      this.parseTransactionDate(t.transactionDate).toDateString() === today
    ).length;
  }

  /**
   * Total disbursed amount today: sums disbursementAmount from disbursements
   * where status === 'DISBURSED' and disbursedAt is today's date.
   */
  get totalDisbursedAmountToday(): number {
    const today = new Date().toDateString();
    return this.allDisbursements
      .filter(d => d.status === 'DISBURSED' && d.disbursedAt && new Date(d.disbursedAt).toDateString() === today)
      .reduce((s, d) => s + d.disbursementAmount, 0);
  }

  get availableLiquidity(): number {
    return this.fundingAccounts.reduce((s, a) => s + a.balance, 0);
  }

  get selectedFundingAccounts(): FundingAccount[] {
    return this.fundingAccounts.filter(a => a.id === this.selectedSourceId);
  }

  get selectedFundingBalance(): number {
    return this.selectedFundingAccounts.reduce((s, a) => s + a.balance, 0);
  }

  get selectedFundingNames(): string {
    return this.selectedFundingAccounts.map(a => a.name).join(', ') || '—';
  }

  public chartOptions: any;

  constructor(private disbursementService: DisbursementService) {
    this.chartOptions = {
      series: [{ name: "Allocated", data: [42, 28, 15, 10, 5] }],
      chart: { type: "bar", height: 350, toolbar: { show: false } },
      plotOptions: { bar: { columnWidth: "40%", borderRadius: 2 } },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ["HR", "POS", "EXPENSE", "HOSPITALITY", "MARKETPLACE"],
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: "#6B7280", fontSize: "12px", fontWeight: 600 } }
      },
      yaxis: { show: false },
      grid: { borderColor: "#f1f1f1", strokeDashArray: 0, yaxis: { lines: { show: true } } },
      fill: { opacity: 1, colors: ['#2EB270'] }
    };
  }

  ngOnInit(): void {
    this.loadTransactions();
    this.loadDisbursements();
    this.loadBankConnections();
  }

  // ── Data Loaders ────────────────────────────────────────

  loadTransactions(): void {
    this.isLoadingTransactions = true;
    this.disbursementService.getApprovedTransactions().subscribe({
      next: response => {
        this.allTransactions = (response.content || []).map(t => ({
          ...t,
          transactionDate: this.parseTransactionDate(t.transactionDate),
          Status: t.status // sync legacy alias
        }));
        this.filteredTransactions = [...this.allTransactions];
        this.isLoadingTransactions = false;
      },
      error: err => {
        console.error('Failed to load transactions:', err);
        this.isLoadingTransactions = false;
      }
    });
  }

  loadDisbursements(): void {
    this.disbursementService.getDisbursements().subscribe({
      next: response => {
        this.allDisbursements = response.content || [];
      },
      error: err => {
        console.error('Failed to load disbursements:', err);
      }
    });
  }

  loadBankConnections(): void {
    this.isLoadingFunding = true;
    this.disbursementService.getBankConnections().subscribe({
      next: response => {
        const activeConnections: BankConnectionDTO[] = (response.content || []).filter(c => c.active);
        this.fundingAccounts = activeConnections.map(conn => ({
          id: conn.id.toString(),
          name: conn.providerName,
          bankName: conn.providerName,
          number: '',
          type: 'BANK' as const,
          balance: 0,
          selected: false
        }));
        this.isLoadingFunding = false;
      },
      error: err => {
        console.error('Failed to load bank connections:', err);
        this.isLoadingFunding = false;
      }
    });
  }

  // ── Confirm Payout — Two sequential API calls ────────────
  confirmPayout(): void {
    if (!this.selectedTransaction || !this.selectedSource) return;
    this.isProcessing = true;
    this.payoutError = null;

    // Build the transaction creation payload from the selected transaction's data
    const txPayload: CreateTransactionPayload = {
      transactionReference: this.selectedTransaction.transactionReference,
      sourceModule: this.selectedTransaction.sourceModule as string,
      amount: this.selectedTransaction.amount,
      currency: this.selectedTransaction.currency || 'NGN',
      status: 'APPROVED',
      accountId: this.selectedTransaction.account?.id,
      description: this.selectedTransaction.description || this.selectedTransaction.transactionReference,
      externalReference: this.selectedTransaction.externalReference || undefined
    };

    // Step 1: POST transaction → get transactionId
    // Step 2: POST disbursement using that transactionId
    this.disbursementService.createTransaction(txPayload).pipe(
      concatMap(createdTx => {
        const disbursementPayload: CreateDisbursementPayload = {
          transaction: { id: createdTx.id },
          disbursementAmount: this.selectedTransaction!.amount,
          status: 'PENDING',
          disbursedFrom: this.selectedSource!.name
        };
        return this.disbursementService.createDisbursement(disbursementPayload);
      })
    ).subscribe({
      next: () => {
        this.isProcessing = false;
        this.currentStep = 3;
        // Remove this transaction from the queue
        this.allTransactions = this.allTransactions.filter(
          t => t.transactionReference !== this.selectedTransaction!.transactionReference
        );
        this.filteredTransactions = [...this.allTransactions];
        // Refresh disbursements for updated stats
        this.loadDisbursements();
      },
      error: err => {
        this.isProcessing = false;
        this.payoutError = err?.error?.message
          || err?.message
          || 'Payout failed. Please try again or contact support.';
        console.error('Payout error:', err);
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  /**
   * Safely convert any transactionDate format to a JS Date.
   * Handles: number[] (Java array), string (ISO), or Date object.
   */
  parseTransactionDate(td: number[] | string | Date | any): Date {
    if (!td) return new Date();
    if (Array.isArray(td)) return DisbursementService.parseJavaDate(td);
    return new Date(td as string);
  }

  filterTransactions(): void {
    const q = this.searchQuery.toLowerCase().trim();
    let currentTxs = this.allTransactions;

    const todayStr = new Date().toDateString();
    if (this.activeCardFilter === 'TODAY') {
      currentTxs = currentTxs.filter(t => this.parseTransactionDate(t.transactionDate).toDateString() === todayStr);
    } else if (this.activeCardFilter === 'PENDING') {
      currentTxs = currentTxs.filter(t => t.Status !== 'APPROVED' && t.Status !== 'REJECTED');
    } else if (this.activeCardFilter === 'APPROVED') {
      currentTxs = currentTxs.filter(t => true);
    } else if (this.activeCardFilter === 'FAILED') {
      currentTxs = [];
    }

    if (this.selectedSourceModule && this.selectedSourceModule !== 'All Modules') {
      currentTxs = currentTxs.filter(t => t.sourceModule.toLowerCase() === this.selectedSourceModule.toLowerCase());
    }

    if (q) {
      currentTxs = currentTxs.filter(t => {
        const createdByStr = typeof t.createdBy === 'string'
          ? t.createdBy
          : (t.createdBy?.fullname || t.createdBy?.username || '');
        return createdByStr.toLowerCase().includes(q) ||
          t.transactionReference.toLowerCase().includes(q) ||
          t.sourceModule.toLowerCase().includes(q);
      });
    }

    this.filteredTransactions = [...currentTxs];
    this.updateSelectAllCheckbox();
  }

  setCardFilter(filter: 'ALL' | 'TODAY' | 'PENDING' | 'APPROVED' | 'FAILED'): void {
    this.activeCardFilter = this.activeCardFilter === filter ? 'ALL' : filter;
    this.filterTransactions();
  }

  // ── Row Selection ────────────────────────────────────────
  toggleSelection(trxId: number): void {
    if (this.selectedTransactions.has(trxId)) {
      this.selectedTransactions.delete(trxId);
    } else {
      this.selectedTransactions.add(trxId);
    }
    this.updateSelectAllCheckbox();
  }

  toggleSelectAll(): void {
    if (this.selectAll) {
      this.selectedTransactions.clear();
      this.selectAll = false;
    } else {
      this.filteredTransactions.forEach(t => this.selectedTransactions.add(t.id));
      this.selectAll = true;
    }
  }

  updateSelectAllCheckbox(): void {
    if (this.filteredTransactions.length === 0) {
      this.selectAll = false;
    } else {
      this.selectAll = this.filteredTransactions.every(t => this.selectedTransactions.has(t.id));
    }
  }

  get isAnySelected(): boolean {
    return this.selectedTransactions.size > 0;
  }

  // ── Sidebar Logic ────────────────────────────────────────
  openSidebar(trx: AccountingTransactionDTO): void {
    this.selectedSidebarTransaction = {
      id: trx.id,
      date: this.parseTransactionDate(trx.transactionDate).toLocaleDateString(),
      description: trx.description || trx.transactionReference,
      spent: trx.amount,
      received: null,
      assignedTo: typeof trx.createdBy === 'string' ? trx.createdBy : (trx.createdBy?.fullname || trx.createdBy?.username),
      reviewed: false
    };
    this.isReviewModalOpen = true;
  }

  closeSidebar(): void {
    this.isReviewModalOpen = false;
    this.selectedSidebarTransaction = null;
  }

  // ── View Actions ─────────────────────────────────────────
  isBatchReviewOpen: boolean = false;
  selectedLineItems: any[] = [];
  isViewOnly: boolean = false;

  openBatchReview(trx: AccountingTransactionDTO): void {
    this.selectedTransaction = trx;
    this.internalMemo = `Settlement for ${trx.transactionReference} — ${trx.description?.substring(0, 50)}`;
    this.disbursementDate = new Date().toISOString().split('T')[0];
    this.isViewOnly = (trx.Status === TransactionReviewStatus.DISBURSED || trx.Status === TransactionReviewStatus.APPROVED);

    // Remove dummy data and populate with primary account details
    this.selectedLineItems = []; // Keeping it as an array in case we want to support multiple beneficiaries later
    
    // Resolve "right account details" with fallback logic
    const meta = trx.metadata || {};
    this.destBank = meta.bankName || meta.bank || meta.destinationBank || this.getAccountBank(trx);
    this.destAccountNumber = meta.accountNumber || meta.account || meta.destAccount || this.getAccountNumber(trx);
    this.destAccountName = meta.memberName || meta.employeeName || meta.accountName || meta.recipientName || trx.account?.accountName || '';
    
    this.payoutError = null;
    this.isBatchReviewOpen = true;
  }

  closeBatchReview(): void {
    this.isBatchReviewOpen = false;
    this.isApproveConfirmOpen = false;
  }

  isApproveConfirmOpen: boolean = false;

  openApproveConfirm(): void {
    this.isApproveConfirmOpen = true;
  }

  closeApproveConfirm(): void {
    this.isApproveConfirmOpen = false;
  }

  confirmApproval(): void {
    if (this.selectedTransaction) {
      this.selectedTransaction.Status = TransactionReviewStatus.APPROVED;
    }
    this.isApproveConfirmOpen = false;
  }

  proceedToPayment(): void {
    if (!this.selectedTransaction) return;
    this.payoutError = null;
    this.isBatchReviewOpen = false;
    this.viewMode = 'EXECUTE';
    this.currentStep = 2;
  }

  backToDashboard(): void {
    this.viewMode = 'DASHBOARD';
    this.selectedTransaction = null;
    this.currentStep = 1;
    this.payoutError = null;
  }

  // ── Meta & Formatting Helpers (Aligned with Queue Manager) ──

  formatLabel(val: string | undefined): string {
    if (!val) return '';
    return val.replace(/_/g, ' ');
  }

  formatMetadataKey(key: string): string {
    if (!key) return '';
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  getMetadataEntries(metadata: any): { key: string, value: any }[] {
    if (!metadata) return [];
    return Object.entries(metadata)
      .map(([key, value]) => ({ key, value }))
      .filter(item => item.value !== null && item.value !== undefined && item.value !== '');
  }

  isCurrencyField(key: string): boolean {
    const currencyKeys = ['amount', 'repayable', 'rate', 'interest', 'balance', 'bankBalance', 'approvedAmount', 'totalRepayable'];
    const lowerKey = key.toLowerCase();
    return currencyKeys.some(ck => lowerKey.includes(ck));
  }

  isDateField(key: string): boolean {
    const dateKeys = ['initiatedat', 'approveddate', 'createdat', 'updatedat', 'expecteddate', 'date'];
    const lowerKey = key.toLowerCase();
    return dateKeys.some(dk => lowerKey.includes(dk));
  }

  getStatusClass(status: string | undefined): string {
    switch (status) {
      case 'APPROVED':    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'REJECTED':    return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'DISBURSED':   return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'UNREVIEWED':
      case 'IN_REVIEW':   return 'bg-amber-100 text-amber-800 border-amber-200';
      default:            return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  // ── Wizard Steps ─────────────────────────────────────────
  nextStep(): void {
    if (this.currentStep < 2) this.currentStep++;
  }

  prevStep(): void {
    if (this.currentStep > 1) this.currentStep--;
  }

  toggleFundingAccount(account: FundingAccount): void {
    account.selected = !account.selected;
  }

  // ── Badge Helpers ─────────────────────────────────────────
  getModuleBadgeClass(module: string): string {
    const map: Record<string, string> = {
      'POS':         'bg-blue-50 text-customBlue border-customBlue/20',
      'HR':          'bg-purple-50 text-purple-700 border-purple-200',
      'HOSPITALITY': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'EXPENSE':     'bg-orange-50 text-orange-700 border-orange-200',
      'MARKETPLACE': 'bg-teal-50 text-teal-700 border-teal-200',
      'BANK':        'bg-teal-50 text-teal-700 border-teal-200',
      'MANUAL':      'bg-gray-50 text-gray-700 border-gray-200',
    };
    return map[module?.toUpperCase()] || 'bg-gray-50 text-gray-600 border-gray-200';
  }

  getCategoryColor(category: string): string {
    return this.getModuleBadgeClass(category);
  }

  /** Safely retrieves the bank/institution name from an AccountID object */
  getAccountBank(trx: AccountingTransactionDTO): string {
    const meta = trx.metadata || {};
    return meta.bankName || meta.bank || meta.destinationBank || (trx.account as any)?.bankName || ' — ';
  }

  /** Safely retrieves the account number from an AccountID object */
  getAccountNumber(trx: AccountingTransactionDTO): string {
    const meta = trx.metadata || {};
    return meta.accountNumber || meta.account || meta.destAccount || (trx.account as any)?.accountNumber || ' — ';
  }

  /** Get display name for createdBy which can be string or UserDTO */
  getCreatedByName(trx: AccountingTransactionDTO): string {
    if (typeof trx.createdBy === 'string') return trx.createdBy;
    return trx.createdBy?.fullname || trx.createdBy?.username || '—';
  }

  exportTable(): void {
    console.log('Exporting disbursement report…');
  }
}

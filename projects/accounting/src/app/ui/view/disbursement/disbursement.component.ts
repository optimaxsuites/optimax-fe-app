import { Component, OnInit } from '@angular/core';
import { DisbursementService } from '../../../services/disbursement.service';
import { AccountingTransactionDTO, TransactionReviewStatus } from '../../domain/accounting.dto';

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
  searchQuery: string = '';

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

  // ── Funding Sources ──────────────────────────────────────
  fundingAccounts: FundingAccount[] = [
    { id: 'bank-1', name: 'Standard Chartered', number: '0012345678', type: 'BANK', bankName: 'Standard Chartered Bank', balance: 8450000, selected: false },
    { id: 'bank-2', name: 'GTBank Operating', number: '3021456789', type: 'BANK', bankName: 'Guaranty Trust Bank', balance: 3980000, selected: false },
    { id: 'cash-1', name: 'Main Office Vault', number: 'VAULT-001', type: 'CASH', bankName: 'Physical Cash', balance: 250000, selected: false },
    { id: 'cash-2', name: 'Petty Cash Box', number: 'PETTY-001', type: 'CASH', bankName: 'Physical Cash', balance: 45000, selected: false },
  ];

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
    // allTransactions are populated via getApprovedTransactions()
    return this.allTransactions.length;
  }

  get disbursementsToday(): number {
    const today = new Date().toDateString();
    return this.allTransactions.filter(t =>
      new Date(t.transactionDate).toDateString() === today
    ).length;
  }

  get totalDisbursedAmountToday(): number {
    const today = new Date().toDateString();
    return this.allTransactions
      .filter(t => new Date(t.transactionDate).toDateString() === today)
      .reduce((s, t) => s + t.amount, 0);
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
      series: [
        {
          name: "Allocated",
          data: [42, 28, 15, 10, 5]
        }
      ],
      chart: {
        type: "bar",
        height: 350,
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          columnWidth: "40%",
          borderRadius: 2
        }
      },
      dataLabels: {
        enabled: false
      },
      xaxis: {
        categories: ["HR", "POS", "Expense", "Hospitality", "Marketplace"],
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: {
            colors: "#6B7280",
            fontSize: "12px",
            fontWeight: 600
          }
        }
      },
      yaxis: {
        show: false
      },
      grid: {
        borderColor: "#f1f1f1",
        strokeDashArray: 0,
        yaxis: {
          lines: { show: true }
        }
      },
      fill: {
        opacity: 1,
        colors: ['#2EB270'] // Use customGreen here
      }
    };
  }

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.disbursementService.getApprovedTransactions().subscribe(trxs => {
      const p1: AccountingTransactionDTO = { ...trxs[0], id: 991, transactionReference: 'MOC-111', Status: 'UNREVIEWED', amount: 45000, sourceModule: 'EXPENSE' } as any;
      const p2: AccountingTransactionDTO = { ...trxs[0], id: 992, transactionReference: 'MOC-112', Status: 'IN_REVIEW', amount: 80000, sourceModule: 'HR' } as any;
      const p3: AccountingTransactionDTO = { ...trxs[0], id: 993, transactionReference: 'MOC-113', Status: 'REJECTED', amount: 125000, sourceModule: 'MARKETPLACE' } as any;
      const p4: AccountingTransactionDTO = { ...trxs[0], id: 994, transactionReference: 'MOC-114', Status: 'DISBURSED', amount: 500000, sourceModule: 'HOSPITALITY' } as any;
      
      this.allTransactions = [...trxs, p1, p2, p3, p4];
      this.filteredTransactions = [...this.allTransactions];
    });
  }

  filterTransactions(): void {
    const q = this.searchQuery.toLowerCase().trim();
    let currentTxs = this.allTransactions;

    // Card filter
    const todayStr = new Date().toDateString();
    if (this.activeCardFilter === 'TODAY') {
      currentTxs = currentTxs.filter(t => new Date(t.transactionDate).toDateString() === todayStr);
    } else if (this.activeCardFilter === 'PENDING') {
      // Assuming pending logic corresponds to specific logic, or everything loaded since this is queue
      currentTxs = currentTxs.filter(t => t.Status !== 'APPROVED' && t.Status !== 'REJECTED');
    } else if (this.activeCardFilter === 'APPROVED') {
      // Mocking approved check
      currentTxs = currentTxs.filter(t => true); 
    } else if (this.activeCardFilter === 'FAILED') {
      currentTxs = [];
    }

    // Source Module Dropdown
    if (this.selectedSourceModule && this.selectedSourceModule !== 'All Modules') {
      currentTxs = currentTxs.filter(t => t.sourceModule.toLowerCase() === this.selectedSourceModule.toLowerCase());
    }

    // Search query
    if (q) {
      currentTxs = currentTxs.filter(t =>
        t.createdBy.toLowerCase().includes(q) ||
        t.transactionReference.toLowerCase().includes(q) ||
        t.sourceModule.toLowerCase().includes(q)
      );
    }
    
    this.filteredTransactions = [...currentTxs];
    this.updateSelectAllCheckbox();
  }

  setCardFilter(filter: 'ALL' | 'TODAY' | 'PENDING' | 'APPROVED' | 'FAILED'): void {
    if (this.activeCardFilter === filter) {
      this.activeCardFilter = 'ALL';
    } else {
      this.activeCardFilter = filter;
    }
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
      date: new Date(trx.transactionDate).toLocaleDateString(),
      description: trx.description || trx.transactionReference,
      spent: trx.amount,
      received: null,
      assignedTo: trx.createdBy,
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
  openBatchReview(trx: AccountingTransactionDTO): void {
    this.selectedTransaction = trx;
    this.internalMemo = `Settlement for ${trx.transactionReference} — ${trx.description?.substring(0, 50)}`;
    this.disbursementDate = new Date().toISOString().split('T')[0];
    
    // Mock line items based on amount to show varied data
    this.selectedLineItems = [
      { recipient: 'Elena Hernandez', role: 'Senior Architect', account: '0123456789', bank: 'Access Bank', type: 'ACH', amount: trx.amount * 0.45 },
      { recipient: 'Marcus Chen', role: 'Project Lead', account: '3024519921', bank: 'Guaranty Trust Bank', type: 'WIRE', amount: trx.amount * 0.35 },
      { recipient: 'Sarah Jenkins', role: 'Junior Consultant', account: '0012398471', bank: 'Zenith Bank', type: 'ACH', amount: trx.amount * 0.20 }
    ];

    // Reset single-select and destination fields
    this.selectedSourceId = null;
    this.destBank = '';
    this.destAccountNumber = '';
    this.destAccountName = '';
    this.isBatchReviewOpen = true;
  }

  closeBatchReview(): void {
    this.isBatchReviewOpen = false;
    this.isApproveConfirmOpen = false; // reset
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
      // If we wanted to re-filter, we could call this.filterTransactions() here
    }
    this.isApproveConfirmOpen = false;
  }

  proceedToPayment(): void {
    if (!this.selectedTransaction) return;
    this.isBatchReviewOpen = false;
    this.viewMode = 'EXECUTE';
    this.currentStep = 2; // Jump straight to payment method
  }

  backToDashboard(): void {
    this.viewMode = 'DASHBOARD';
    this.selectedTransaction = null;
    this.currentStep = 1;
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

  confirmPayout(): void {
    if (!this.selectedTransaction) return;
    this.isProcessing = true;

    setTimeout(() => {
      this.isProcessing = false;
      this.currentStep = 3;
      this.allTransactions = this.allTransactions.filter(
        t => t.transactionReference !== this.selectedTransaction!.transactionReference
      );
      this.filteredTransactions = [...this.allTransactions];
    }, 1800);
  }

  // ── Helpers ──────────────────────────────────────────────
  getCategoryColor(category: string): string {
    const map: Record<string, string> = {
      'EXPENSE':     'bg-orange-100 text-orange-700',
      'HR':          'bg-purple-100 text-purple-700',
      'PROCUREMENT': 'bg-blue-100 text-blue-700',
      'UTILITY':     'bg-yellow-100 text-yellow-700',
      'MAINTENANCE': 'bg-teal-100 text-teal-700',
      'HOSPITALITY': 'bg-indigo-100 text-indigo-700',
      'SUPPLY CHAIN':'bg-gray-100 text-gray-700',
    };
    return map[category.toUpperCase()] || 'bg-gray-100 text-gray-600';
  }

  /** Safely retrieves the bank/institution name from an AccountID object */
  getAccountBank(trx: AccountingTransactionDTO): string {
    return (trx.AccountID as any)?.bankName || '—';
  }

  /** Safely retrieves the account number from an AccountID object */
  getAccountNumber(trx: AccountingTransactionDTO): string {
    return (trx.AccountID as any)?.accountNumber || '—';
  }

  exportTable(): void {
    console.log('Exporting disbursement report…');
  }
}

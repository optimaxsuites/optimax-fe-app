import { Component, OnInit } from '@angular/core';
import { DisbursementService } from '../../../services/disbursement.service';
import { AccountingTransactionDTO } from '../../domain/accounting.dto';

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

  constructor(private disbursementService: DisbursementService) { }

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.disbursementService.getApprovedTransactions().subscribe(trxs => {
      this.allTransactions = trxs;
      this.filteredTransactions = [...trxs];
    });
  }

  filterTransactions(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredTransactions = [...this.allTransactions];
      return;
    }
    this.filteredTransactions = this.allTransactions.filter(t =>
      t.createdBy.toLowerCase().includes(q) ||
      t.transactionReference.toLowerCase().includes(q) ||
      (t.AccountID as any)?.bankName?.toLowerCase().includes(q) ||
      t.sourceModule.toLowerCase().includes(q)
    );
  }

  // ── View Actions ─────────────────────────────────────────
  openExecution(trx: AccountingTransactionDTO): void {
    this.selectedTransaction = trx;
    this.currentStep = 1;
    this.internalMemo = `Settlement for ${trx.transactionReference} — ${trx.description?.substring(0, 50)}`;
    this.disbursementDate = new Date().toISOString().split('T')[0];
    // Reset single-select and destination fields
    this.selectedSourceId = null;
    this.destBank = '';
    this.destAccountNumber = '';
    this.destAccountName = '';
    this.viewMode = 'EXECUTE';
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

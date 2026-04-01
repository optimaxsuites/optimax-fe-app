import { Component } from '@angular/core';

interface BankTransaction {
  date: Date;
  description: string;
  debit: number | null;
  credit: number | null;
  status: 'Matched' | 'Unmatched';
  id?: string;
}

interface ErpTransaction {
  date: Date;
  reference: string;
  description: string;
  debit: number | null;
  credit: number | null;
  account: string;
  id?: string;
}

interface PendingDeposit {
  date: Date;
  description: string;
  amount: number;
  onStatement: boolean;
  dateCleared?: Date;
  id?: string;
}

interface AchDeposit {
  date: Date;
  customer: string;
  type: string;
  amount: number;
  onStatement: boolean;
  dateCleared?: Date;
  id?: string;
}

interface UncashedCheck {
  checkNumber: string;
  for: string;
  date: Date;
  amount: number;
  onStatement: boolean;
  dateCleared?: Date;
  id?: string;
}

interface Account {
  name: string;
  id: string;
  balance?: number;
}

@Component({
  selector: 'app-reconciliation',
  templateUrl: './reconciliation.component.html',
  styleUrls: ['./reconciliation.component.scss']
})
export class ReconciliationComponent {

  // Form controls
  fromDateStr: string = '';
  toDateStr: string = '';
  selectedAccount: Account | null = null;
  
  // UI state
  loading = false;
  loadingItem = false;
  checked: boolean = true; // Default to side-by-side
  sidebarCollapsed = true;
  reportsDialogVisible = false;

  // Modal State
  showMatchModal: boolean = false;
  selectedTransactionMatch: BankTransaction | null = null;
  
  // Account options
  accounts: Account[] = [
    { name: 'Main Business Account', id: '1', balance: 1850000 },
    { name: 'Savings Account', id: '2', balance: 500000 },
    { name: 'Payroll Account', id: '3', balance: 300000 }
  ];
  
  // Status and reconciliation data
  status: string = 'Unreconciled';
  difference: string = '₦0.00';
  
  // Balance data
  bankBalance: number = 1850000;
  glBalance: number = 1820000;
  adjustedBankBalance: number = 1850000;
  adjustedGlBalance: number = 1820000;
  pendingDepositsTotal: number = 150000;
  uncashedChecksTotal: number = 50000;
  futureMonthEntries: number = 12000;
  bankFutureEntries: number = 8000;
  isBalanced: boolean = false;
  
  // Transaction data
  bankTransactions: BankTransaction[] = [
    { 
      date: new Date('2024-01-05'), 
      description: 'POS PAYMENT 1234', 
      debit: 15000, 
      credit: null, 
      status: 'Unmatched',
      id: 'bank_1'
    },
    { 
      date: new Date('2024-01-07'), 
      description: 'TRANSFER FROM CLIENT', 
      debit: null, 
      credit: 50000, 
      status: 'Matched',
      id: 'bank_2'
    },
    { 
      date: new Date('2024-01-10'), 
      description: 'BANK FEE', 
      debit: 500, 
      credit: null, 
      status: 'Unmatched',
      id: 'bank_3'
    },
    { 
      date: new Date('2024-01-12'), 
      description: 'CUSTOMER DEPOSIT', 
      debit: null, 
      credit: 75000, 
      status: 'Unmatched',
      id: 'bank_4'
    }
  ];
  
  erpTransactions: ErpTransaction[] = [
    { 
      date: new Date('2024-01-05'), 
      reference: 'INV-1001', 
      description: 'Office Supplies', 
      debit: 15000, 
      credit: null, 
      account: 'Expenses',
      id: 'erp_1'
    },
    { 
      date: new Date('2024-01-07'), 
      reference: 'CUST-45', 
      description: 'Payment Received', 
      debit: null, 
      credit: 50000, 
      account: 'Accounts Receivable',
      id: 'erp_2'
    },
    { 
      date: new Date('2024-01-10'), 
      reference: 'BANK-FEE-001', 
      description: 'Monthly Fee', 
      debit: 500, 
      credit: null, 
      account: 'Bank Charges',
      id: 'erp_3'
    }
  ];
  
  // Pending transactions data
  pendingDeposits: PendingDeposit[] = [
    { 
      date: new Date('2024-01-15'), 
      description: 'Customer Payment - ABC Corp', 
      amount: 50000, 
      onStatement: false,
      id: 'pending_1'
    }
  ];
  
  achDeposits: AchDeposit[] = [];
  uncashedChecks: UncashedCheck[] = [];

  constructor() {
    this.selectedAccount = this.accounts[0];
    this.calculateBalances();
  }

  // Load/fetch data
  load(): void {
    this.loadingItem = true;
    setTimeout(() => {
      this.loadingItem = false;
      this.updateSummary();
      this.calculateBalances();
    }, 1000);
  }

  loadTransactions(): void {
    this.loading = true;
    setTimeout(() => {
      this.loading = false;
      this.updateSummary();
    }, 1000);
  }

  // Auto-match transactions
  autoMatchTransactions(): void {
    this.loading = true;
    setTimeout(() => {
      this.loading = false;
      this.updateSummary();
      this.calculateBalances();
    }, 1500);
  }

  // Manual match transaction
  matchTransaction(transaction: BankTransaction): void {
    this.selectedTransactionMatch = transaction;
    this.showMatchModal = true;
  }

  confirmMatch(): void {
    if (this.selectedTransactionMatch) {
      this.selectedTransactionMatch.status = 'Matched';
      this.bankTransactions = [...this.bankTransactions]; // Trigger change detection
      this.closeModal();
      this.updateSummary();
      this.calculateBalances();
    }
  }

  bypassMatch(): void {
    this.closeModal();
  }

  closeModal(): void {
    this.showMatchModal = false;
    this.selectedTransactionMatch = null;
  }

  // Calculate balances and reconciliation status
  calculateBalances(): void {
    // Simplified logic for demo
    const pendingDepositsNotOnStatement = this.pendingDeposits
      .filter(d => !d.onStatement)
      .reduce((sum, d) => sum + d.amount, 0);
    
    this.adjustedBankBalance = this.bankBalance + pendingDepositsNotOnStatement;
    this.adjustedGlBalance = this.glBalance - this.futureMonthEntries + this.bankFutureEntries;
    
    const differenceAmount = Math.abs(this.adjustedBankBalance - this.adjustedGlBalance);
    this.difference = this.formatCurrency(differenceAmount);
    
    this.isBalanced = differenceAmount < 0.01;
    this.status = this.isBalanced ? 'Reconciled' : 'Unreconciled';
  }


  updatePendingStatus(item: PendingDeposit): void {
    this.calculateBalances();
  }

  finalizeReconciliation(): void {
    if (!this.isBalanced) return;
    this.loading = true;
    setTimeout(() => {
      this.loading = false;
      this.status = 'Finalized';
    }, 1500);
  }

  exportReport(): void {
    // Placeholder
  }

  updateSummary(): void {
    this.calculateBalances();
  }

  getMatchedCount(): number {
    return this.bankTransactions.filter(tx => tx.status === 'Matched').length;
  }

  getUnmatchedCount(): number {
    return this.bankTransactions.filter(tx => tx.status === 'Unmatched').length;
  }

  getMatchedPercentage(): number {
    if (this.bankTransactions.length === 0) return 0;
    return Math.round((this.getMatchedCount() / this.bankTransactions.length) * 100);
  }

  formatCurrency(value: number): string {
    return '₦' + value.toLocaleString('en-NG', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  getStatusSeverity(status: string): string {
    switch (status.toLowerCase()) {
      case 'reconciled':
      case 'finalized':
      case 'matched':
        return 'success';
      case 'unreconciled':
      case 'unmatched':
        return 'warning';
      default:
        return 'info';
    }
  }
}
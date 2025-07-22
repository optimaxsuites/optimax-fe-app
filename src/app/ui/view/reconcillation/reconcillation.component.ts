import { Component } from '@angular/core';
import { MenuItem, MessageService } from 'primeng/api';

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
  selector: 'app-reconcillation',
  templateUrl: './reconcillation.component.html',
  styleUrls: ['./reconcillation.component.scss'],
  providers: [MessageService]
})
export class ReconcillationComponent {
  // Form controls
  fromDate: Date | null = null;
  toDate: Date | null = null;
  selectedAccount: Account | null = null;
  
  // UI state
  loading = false;
  loadingItem = false;
  checked: boolean = false; // Toggle between side-by-side and tab view
  sidebarCollapsed = false;
  reportsDialogVisible = false;
  
  // Account options
  accounts: Account[] = [
    { name: 'Main Business Account', id: '1', balance: 1850000 },
    { name: 'Savings Account', id: '2', balance: 500000 },
    { name: 'Payroll Account', id: '3', balance: 300000 }
  ];
  
  // Status and reconciliation data
  status: string = 'Unreconciled';
  difference: string = '₦0.00';
  
  // Split button menu items
  items: MenuItem[] = [];
  
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
    },
    { 
      date: new Date('2024-01-11'), 
      reference: 'SAL-789', 
      description: 'Sales Revenue', 
      debit: null, 
      credit: 125000, 
      account: 'Sales Revenue',
      id: 'erp_4'
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
    },
    { 
      date: new Date('2024-01-16'), 
      description: 'Invoice #1234 Payment', 
      amount: 100000, 
      onStatement: true, 
      dateCleared: new Date('2024-01-17'),
      id: 'pending_2'
    },
    { 
      date: new Date('2024-01-18'), 
      description: 'Wire Transfer', 
      amount: 75000, 
      onStatement: false,
      id: 'pending_3'
    }
  ];
  
  achDeposits: AchDeposit[] = [
    { 
      date: new Date('2024-01-14'), 
      customer: 'ABC Corp', 
      type: 'ACH Payment', 
      amount: 75000, 
      onStatement: false,
      id: 'ach_1'
    },
    { 
      date: new Date('2024-01-16'), 
      customer: 'XYZ Ltd', 
      type: 'Direct Deposit', 
      amount: 45000, 
      onStatement: true,
      dateCleared: new Date('2024-01-17'),
      id: 'ach_2'
    }
  ];
  
  uncashedChecks: UncashedCheck[] = [
    { 
      checkNumber: '1001', 
      for: 'Office Supplies', 
      date: new Date('2024-01-08'), 
      amount: 25000, 
      onStatement: false,
      id: 'check_1'
    },
    { 
      checkNumber: '1002', 
      for: 'Equipment Rental', 
      date: new Date('2024-01-12'), 
      amount: 15000, 
      onStatement: false,
      id: 'check_2'
    },
    { 
      checkNumber: '1003', 
      for: 'Consulting Services', 
      date: new Date('2024-01-14'), 
      amount: 35000, 
      onStatement: true,
      dateCleared: new Date('2024-01-15'),
      id: 'check_3'
    }
  ];

  constructor(private messageService: MessageService) {
    this.initializeMenuItems();
    this.initializeDates();
    this.updateSummary();
    this.calculateBalances();
  }

  private initializeMenuItems(): void {
    this.items = [
      { 
        label: 'Auto-match', 
        icon: 'pi pi-link',
        command: () => this.autoMatchTransactions()
      },
      { 
        label: 'Fetch Transactions', 
        icon: 'pi pi-download',
        command: () => this.loadTransactions()
      },
      { separator: true },
      { 
        label: 'Finalize Reconciliation', 
        icon: 'pi pi-check-circle',
        command: () => this.finalizeReconciliation()
      },
      { separator: true },
      { 
        label: 'Save & Exit', 
        icon: 'pi pi-sign-out',
        command: () => this.saveAndExit()
      }
    ];
  }

  private initializeDates(): void {
    const today = new Date();
    this.toDate = new Date(today);
    this.fromDate = new Date(today.getFullYear(), today.getMonth(), 1); // First day of current month
    this.selectedAccount = this.accounts[0]; // Default to first account
  }

  // Toggle sidebar visibility
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  // Load/fetch data
  load(): void {
    if (!this.selectedAccount) {
      this.showToast('warn', 'Warning', 'Please select a bank account');
      return;
    }
    
    if (!this.fromDate || !this.toDate) {
      this.showToast('warn', 'Warning', 'Please select date range');
      return;
    }

    this.loadingItem = true;
    
    // Simulate API call
    setTimeout(() => {
      this.loadingItem = false;
      this.showToast('success', 'Success', 'Data loaded successfully');
      this.updateSummary();
      this.calculateBalances();
    }, 2000);
  }

  loadTransactions(): void {
    this.loading = true;
    
    // Simulate loading transactions
    setTimeout(() => {
      this.loading = false;
      this.showToast('success', 'Success', 'Transactions loaded successfully');
      this.updateSummary();
    }, 1500);
  }

  // Auto-match transactions
  autoMatchTransactions(): void {
    this.loading = true;
    let matchCount = 0;
    
    // Simple matching logic based on amount and date proximity
    this.bankTransactions.forEach(bankTx => {
      if (bankTx.status === 'Unmatched') {
        const matchingErp = this.erpTransactions.find(erpTx => {
          const amountMatch = (bankTx.debit && erpTx.debit && bankTx.debit === erpTx.debit) ||
                             (bankTx.credit && erpTx.credit && bankTx.credit === erpTx.credit);
          const dateMatch = Math.abs(bankTx.date.getTime() - erpTx.date.getTime()) <= 3 * 24 * 60 * 60 * 1000; // Within 3 days
          return amountMatch && dateMatch;
        });
        
        if (matchingErp) {
          bankTx.status = 'Matched';
          matchCount++;
        }
      }
    });
    
    setTimeout(() => {
      this.loading = false;
      this.showToast('success', 'Auto-Match Complete', `${matchCount} transactions matched automatically`);
      this.updateSummary();
      this.calculateBalances();
    }, 2000);
  }

  // Manual match transaction
  matchTransaction(transaction: BankTransaction): void {
    // This would typically open a dialog to select matching ERP transaction
    // For demo purposes, we'll just mark it as matched
    transaction.status = 'Matched';
    this.showToast('success', 'Matched', `Transaction ${transaction.description} has been matched`);
    this.updateSummary();
    this.calculateBalances();
  }

  // Calculate balances and reconciliation status
  calculateBalances(): void {
    // Calculate total pending deposits not on statement
    const pendingDepositsNotOnStatement = this.pendingDeposits
      .filter(d => !d.onStatement)
      .reduce((sum, d) => sum + d.amount, 0);
    
    // Calculate total uncashed checks not on statement
    const uncashedChecksNotOnStatement = this.uncashedChecks
      .filter(c => !c.onStatement)
      .reduce((sum, c) => sum + c.amount, 0);
    
    // Calculate adjusted bank balance
    this.adjustedBankBalance = this.bankBalance + pendingDepositsNotOnStatement - uncashedChecksNotOnStatement;
    
    // Calculate adjusted GL balance
    this.adjustedGlBalance = this.glBalance - this.futureMonthEntries + this.bankFutureEntries;
    
    // Calculate difference
    const differenceAmount = Math.abs(this.adjustedBankBalance - this.adjustedGlBalance);
    this.difference = this.formatCurrency(differenceAmount);
    
    // Check if balanced (allowing for small rounding differences)
    this.isBalanced = differenceAmount < 0.01;
    
    // Update status
    this.status = this.isBalanced ? 'Reconciled' : 'Unreconciled';
    
    // Update pending totals for display
    this.pendingDepositsTotal = pendingDepositsNotOnStatement;
    this.uncashedChecksTotal = uncashedChecksNotOnStatement;
  }

  // Computed properties for pending deposits
  get depositsOnStatement(): number {
    return this.pendingDeposits
      .filter(d => d.onStatement)
      .reduce((sum, d) => sum + d.amount, 0);
  }

  get remainingDeposits(): number {
    return this.pendingDeposits
      .filter(d => !d.onStatement)
      .reduce((sum, d) => sum + d.amount, 0);
  }

  // Update pending item status
  updatePendingStatus(item: PendingDeposit | AchDeposit | UncashedCheck): void {
    if (item.onStatement && !item.dateCleared) {
      item.dateCleared = new Date();
    } else if (!item.onStatement) {
      item.dateCleared = undefined;
    }
    
    this.calculateBalances();
    this.showToast('success', 'Updated', 'Pending item status updated');
  }

  // Find match for deposit
  findMatchForDeposit(deposit: PendingDeposit): void {
    // Search for matching bank transactions
    const matches = this.bankTransactions.filter(tx => 
      tx.credit === deposit.amount && 
      tx.status === 'Unmatched' &&
      Math.abs(tx.date.getTime() - deposit.date.getTime()) <= 7 * 24 * 60 * 60 * 1000 // Within 7 days
    );
    
    if (matches.length > 0) {
      this.showToast('info', 'Matches Found', `Found ${matches.length} potential matches for ${deposit.description}`);
    } else {
      this.showToast('info', 'No Matches', `No matching transactions found for ${deposit.description}`);
    }
  }

  // Finalize reconciliation
  finalizeReconciliation(): void {
    if (!this.isBalanced) {
      this.showToast('error', 'Cannot Finalize', 'Reconciliation must be balanced before finalizing');
      return;
    }
    
    this.loading = true;
    
    setTimeout(() => {
      this.loading = false;
      this.status = 'Finalized';
      this.showToast('success', 'Reconciliation Finalized', 'Reconciliation has been successfully finalized');
    }, 1500);
  }

  // Save and exit
  saveAndExit(): void {
    this.loading = true;
    
    setTimeout(() => {
      this.loading = false;
      this.showToast('success', 'Saved', 'Reconciliation progress has been saved');
      // Here you would typically navigate away or close the component
    }, 1000);
  }

  // Get status severity for p-tag
  getStatusSeverity(status: string): string {
    switch (status.toLowerCase()) {
      case 'reconciled':
      case 'finalized':
      case 'matched':
        return 'success';
      case 'unreconciled':
      case 'unmatched':
        return 'warning';
      case 'error':
        return 'danger';
      default:
        return 'info';
    }
  }

  // Handle file upload
  handleFileUpload(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    
    if (!allowedTypes.includes(file.type)) {
      this.showToast('error', 'Invalid File', 'Please upload a CSV or Excel file');
      return;
    }
    
    this.loading = true;
    
    // Simulate file processing
    setTimeout(() => {
      this.loading = false;
      this.showToast('success', 'Import Complete', `${file.name} has been imported successfully`);
      // Here you would process the file and update transactions
    }, 2000);
    
    // Clear the input
    event.target.value = '';
  }

  // Export report
  exportReport(): void {
    this.loading = true;
    
    setTimeout(() => {
      this.loading = false;
      this.showToast('success', 'Export Complete', 'Report has been exported successfully');
      // Here you would generate and download the report
    }, 1500);
  }

  // Show reports dialog
  showReportsDialog(): void {
    this.reportsDialogVisible = true;
  }

  // Generate specific report
  generateReport(type: 'pre' | 'post' | 'discrepancy'): void {
    this.loading = true;
    
    const reportNames = {
      pre: 'Pre-Reconciliation Report',
      post: 'Post-Reconciliation Report',
      discrepancy: 'Discrepancy Report'
    };
    
    setTimeout(() => {
      this.loading = false;
      this.reportsDialogVisible = false;
      this.showToast('success', 'Report Generated', `${reportNames[type]} has been generated successfully`);
    }, 1500);
  }

  // Update summary calculations
  updateSummary(): void {
    this.calculateBalances();
  }

  // Get matched transactions count
  getMatchedCount(): number {
    return this.bankTransactions.filter(tx => tx.status === 'Matched').length;
  }

  // Get unmatched transactions count
  getUnmatchedCount(): number {
    return this.bankTransactions.filter(tx => tx.status === 'Unmatched').length;
  }

  // Get matched percentage
  getMatchedPercentage(): number {
    if (this.bankTransactions.length === 0) return 0;
    return Math.round((this.getMatchedCount() / this.bankTransactions.length) * 100);
  }

  // Format currency helper
  formatCurrency(value: number): string {
    return '₦' + value.toLocaleString('en-NG', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  // Show toast message
  showToast(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.add({
      severity: severity,
      summary: summary,
      detail: detail,
      life: 3000
    });
  }
}
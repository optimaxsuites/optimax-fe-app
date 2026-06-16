import { Component, OnInit } from '@angular/core'

interface BankTransaction {
  id: string;
  date: Date;
  description: string;
  debit: number | null;
  credit: number | null;
  status: 'Matched' | 'Unmatched' | 'Pending' | 'Disputed';
  category?: string;
  reference?: string;
  matchedWith?: string;
  confidence?: number;
}

interface ErpTransaction {
  id: string;
  date: Date;
  reference: string;
  description: string;
  debit: number | null;
  credit: number | null;
  account: string;
  category?: string;
  status?: string;
}

interface PendingItem {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'deposit' | 'check' | 'ach' | 'wire';
  onStatement: boolean;
  dateCleared?: Date;
  estimatedClearDate?: Date;
}

interface Account {
  id: string;
  name: string;
  number: string;
  balance: number;
  type: string;
  lastReconciled?: Date;
}

@Component({
  selector: 'app-bank-reconciliation',
  templateUrl: './bank-reconciliation.component.html',
  styleUrls: ['./bank-reconciliation.component.scss']
})
export class BankReconciliationComponent implements OnInit {
  // Component state
  selectedAccount: Account | null = null;
  fromDate: string = '';
  toDate: string = '';
  viewMode: 'split' | 'tabs' | 'overlay' = 'split';
  sidebarCollapsed: boolean = false;
  loading: boolean = false;
  searchTerm: string = '';
  filterStatus: string = 'all';
  autoMatchEnabled: boolean = true;
  showAdvancedFilters: boolean = false;
  selectedTransactions: string[] = [];
  showReportsModal: boolean = false;
  activeTab: string = 'bank';

  // Modal state
  showMatchModal: boolean = false;
  selectedTransactionMatch: BankTransaction | null = null;

  // Sample data
  accounts: Account[] = [
    { 
      id: '1', 
      name: 'Main Business Account', 
      number: '****1234',
      balance: 1850000, 
      type: 'Checking',
      lastReconciled: new Date('2024-01-15')
    },
    { 
      id: '2', 
      name: 'Savings Account', 
      number: '****5678',
      balance: 500000, 
      type: 'Savings',
      lastReconciled: new Date('2024-01-10')
    },
    { 
      id: '3', 
      name: 'Payroll Account', 
      number: '****9012',
      balance: 300000, 
      type: 'Checking',
      lastReconciled: new Date('2024-01-12')
    }
  ];

  bankTransactions: BankTransaction[] = [
    {
      id: 'bank_1',
      date: new Date('2024-01-05'),
      description: 'POS PAYMENT - OFFICE DEPOT',
      debit: 15000,
      credit: null,
      status: 'Unmatched',
      category: 'Office Supplies',
      reference: 'POS123456',
      confidence: 85
    },
    {
      id: 'bank_2',
      date: new Date('2024-01-07'),
      description: 'WIRE TRANSFER FROM ABC CORP',
      debit: null,
      credit: 50000,
      status: 'Matched',
      category: 'Revenue',
      reference: 'WIRE789012',
      confidence: 98
    },
    {
      id: 'bank_3',
      date: new Date('2024-01-10'),
      description: 'MONTHLY MAINTENANCE FEE',
      debit: 500,
      credit: null,
      status: 'Matched',
      category: 'Bank Fees',
      reference: 'FEE345678',
      confidence: 100
    },
    {
      id: 'bank_4',
      date: new Date('2024-01-12'),
      description: 'CUSTOMER DEPOSIT - XYZ LTD',
      debit: null,
      credit: 75000,
      status: 'Pending',
      category: 'Revenue',
      reference: 'DEP901234',
      confidence: 92
    },
    {
      id: 'bank_5',
      date: new Date('2024-01-15'),
      description: 'ACH PAYMENT - UTILITIES',
      debit: 8500,
      credit: null,
      status: 'Disputed',
      category: 'Utilities',
      reference: 'ACH567890',
      confidence: 45
    }
  ];

  erpTransactions: ErpTransaction[] = [
    {
      id: 'erp_1',
      date: new Date('2024-01-05'),
      reference: 'INV-1001',
      description: 'Office Supplies Purchase',
      debit: 15000,
      credit: null,
      account: 'Office Expenses',
      category: 'Office Supplies'
    },
    {
      id: 'erp_2',
      date: new Date('2024-01-07'),
      reference: 'CUST-45',
      description: 'Payment from ABC Corp',
      debit: null,
      credit: 50000,
      account: 'Accounts Receivable',
      category: 'Revenue'
    },
    {
      id: 'erp_3',
      date: new Date('2024-01-10'),
      reference: 'BANK-FEE-001',
      description: 'Monthly Bank Fee',
      debit: 500,
      credit: null,
      account: 'Bank Charges',
      category: 'Bank Fees'
    },
    {
      id: 'erp_4',
      date: new Date('2024-01-15'),
      reference: 'UTIL-789',
      description: 'Electricity Bill Payment',
      debit: 8500,
      credit: null,
      account: 'Utilities Expense',
      category: 'Utilities'
    }
  ];

  pendingItems: PendingItem[] = [
    {
      id: 'pending_1',
      date: new Date('2024-01-16'),
      description: 'Outstanding Check #1001',
      amount: 25000,
      type: 'check',
      onStatement: false,
      estimatedClearDate: new Date('2024-01-20')
    },
    {
      id: 'pending_2',
      date: new Date('2024-01-17'),
      description: 'Pending ACH Deposit',
      amount: 35000,
      type: 'ach',
      onStatement: false,
      estimatedClearDate: new Date('2024-01-19')
    },
    {
      id: 'pending_3',
      date: new Date('2024-01-18'),
      description: 'Wire Transfer In Progress',
      amount: 100000,
      type: 'wire',
      onStatement: true,
      dateCleared: new Date('2024-01-18')
    }
  ];

  ngOnInit(): void {
    this.initializeDates();
    this.selectedAccount = this.accounts[0];
  }

  private initializeDates(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.fromDate = firstDay.toISOString().split('T')[0];
    this.toDate = today.toISOString().split('T')[0];
  }

  // Getters for computed properties
  get filteredBankTransactions(): BankTransaction[] {
    return this.bankTransactions.filter(tx => {
      const matchesSearch = tx.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           tx.reference?.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = this.filterStatus === 'all' || tx.status.toLowerCase() === this.filterStatus.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }

  get stats() {
    const matched = this.bankTransactions.filter(tx => tx.status === 'Matched').length;
    const unmatched = this.bankTransactions.filter(tx => tx.status === 'Unmatched').length;
    const pending = this.bankTransactions.filter(tx => tx.status === 'Pending').length;
    const disputed = this.bankTransactions.filter(tx => tx.status === 'Disputed').length;
    const total = this.bankTransactions.length;
    
    const totalDebits = this.bankTransactions.reduce((sum, tx) => sum + (tx.debit || 0), 0);
    const totalCredits = this.bankTransactions.reduce((sum, tx) => sum + (tx.credit || 0), 0);
    const netAmount = totalCredits - totalDebits;
    
    return {
      matched,
      unmatched,
      pending,
      disputed,
      total,
      matchedPercentage: total > 0 ? Math.round((matched / total) * 100) : 0,
      totalDebits,
      totalCredits,
      netAmount
    };
  }

  // Helper methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Matched': return 'bg-green-100 text-green-800 border-green-200';
      case 'Unmatched': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Disputed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Matched': return '✓';
      case 'Unmatched': return '✗';
      case 'Pending': return '⟳';
      case 'Disputed': return '⚠';
      default: return '';
    }
  }

  getPendingTypeColor(type: string): string {
    switch (type) {
      case 'deposit': return 'bg-green-400';
      case 'check': return 'bg-yellow-400';
      case 'ach': return 'bg-blue-400';
      case 'wire': return 'bg-purple-400';
      default: return 'bg-gray-400';
    }
  }

  // Event handlers
  onAccountChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedAccount = this.accounts.find(acc => acc.id === target.value) || null;
  }

  onFromDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.fromDate = target.value;
  }

  onToDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.toDate = target.value;
  }

  onSearchTermChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
  }

  onFilterStatusChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.filterStatus = target.value;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  setViewMode(mode: 'split' | 'tabs' | 'overlay'): void {
    this.viewMode = mode;
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  toggleReportsModal(): void {
    this.showReportsModal = !this.showReportsModal;
  }

  handleAutoMatch(): void {
    this.loading = true;
    setTimeout(() => {
      this.bankTransactions = this.bankTransactions.map(tx => {
        if (tx.status === 'Unmatched' && Math.random() > 0.3) {
          return { ...tx, status: 'Matched' as const, confidence: Math.floor(Math.random() * 30) + 70 };
        }
        return tx;
      });
      this.loading = false;
    }, 2000);
  }

  handleManualMatch(transactionId: string): void {
    const transaction = this.bankTransactions.find(tx => tx.id === transactionId);
    if (transaction) {
      this.selectedTransactionMatch = transaction;
      this.showMatchModal = true;
    }
  }

  confirmMatch(): void {
    if (this.selectedTransactionMatch) {
      this.bankTransactions = this.bankTransactions.map(tx => 
        tx.id === this.selectedTransactionMatch!.id ? { ...tx, status: 'Matched' as const, confidence: 100 } : tx
      );
      this.closeMatchModal();
    }
  }

  flagTransaction(): void {
    if (this.selectedTransactionMatch) {
      this.bankTransactions = this.bankTransactions.map(tx => 
        tx.id === this.selectedTransactionMatch!.id ? { ...tx, status: 'Disputed' as const } : tx
      );
      this.closeMatchModal();
    }
  }

  bypassMatch(): void {
    this.closeMatchModal();
  }

  closeMatchModal(): void {
    this.showMatchModal = false;
    this.selectedTransactionMatch = null;
  }

  toggleTransactionSelection(transactionId: string): void {
    const index = this.selectedTransactions.indexOf(transactionId);
    if (index > -1) {
      this.selectedTransactions.splice(index, 1);
    } else {
      this.selectedTransactions.push(transactionId);
    }
  }

  toggleAllTransactions(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.selectedTransactions = this.filteredBankTransactions.map(tx => tx.id);
    } else {
      this.selectedTransactions = [];
    }
  }

  isTransactionSelected(transactionId: string): boolean {
    return this.selectedTransactions.includes(transactionId);
  }

  handleBulkAction(action: string): void {
    if (this.selectedTransactions.length === 0) return;
    
    this.bankTransactions = this.bankTransactions.map(tx => {
      if (this.selectedTransactions.includes(tx.id)) {
        switch (action) {
          case 'match':
            return { ...tx, status: 'Matched' as const };
          case 'unmatch':
            return { ...tx, status: 'Unmatched' as const };
          case 'dispute':
            return { ...tx, status: 'Disputed' as const };
          default:
            return tx;
        }
      }
      return tx;
    });
    this.selectedTransactions = [];
  }

  getUnmatchedTransactions(): BankTransaction[] {
    return this.bankTransactions.filter(tx => tx.status === 'Unmatched');
  }

  getPotentialMatches(bankTx: BankTransaction): ErpTransaction[] {
    return this.erpTransactions.filter(erpTx => 
      (bankTx.debit && erpTx.debit && Math.abs(bankTx.debit - erpTx.debit) < 1000) ||
      (bankTx.credit && erpTx.credit && Math.abs(bankTx.credit - erpTx.credit) < 1000)
    );
  }

  getPendingItemsByType(type: string): { count: number; total: number } {
    const items = this.pendingItems.filter(item => item.type === type);
    return {
      count: items.length,
      total: items.reduce((sum, item) => sum + item.amount, 0)
    };
  }
}
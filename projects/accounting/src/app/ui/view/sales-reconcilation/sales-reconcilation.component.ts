import { Component, OnInit } from '@angular/core';

export interface Transaction {
  id: string;
  dateTime: string;
  item?: string;
  description?: string;
  type: 'Card' | 'Cash';
  amount: number;
  status: 'Matched' | 'Delayed' | 'Not Found' | 'ERP Delay' | 'No ERP Record';
  delay?: string;
}

export interface Bank {
  name: string;
  accounts: string[];
}

export interface ReconciliationSummary {
  matched: number;
  delayed: number;
  unmatched: number;
}

export interface Discrepancy {
  type: 'warning' | 'error';
  icon: string;
  message: string;
}

@Component({
  selector: 'app-sales-reconcilation',
  templateUrl: './sales-reconcilation.component.html',
  styleUrls: ['./sales-reconcilation.component.scss']
})
export class SalesReconcilationComponent implements OnInit {
  
  // View state
  isSideBySideView = false;
  showErpTransactions = true;
  showBankTransactions = true;
  searchTerm = '';
  
  // Filter options
  banks: Bank[] = [
    { name: 'GTBank (Default)', accounts: ['0123456789', '9876543210'] },
    { name: 'Access Bank', accounts: ['1111111111', '2222222222'] },
    { name: 'Zenith Bank', accounts: ['3333333333', '4444444444'] }
  ];
  
  dateRangeOptions = ['Today (Auto)', 'Custom Range'];
  paymentTypeOptions = ['All Types', 'Cash Only', 'Card Only'];
  
  // Selected filters
  selectedBank = this.banks[0];
  selectedAccount = this.banks[0].accounts[0];
  selectedDateRange = this.dateRangeOptions[0];
  selectedPaymentType = this.paymentTypeOptions[0];
  
  // Summary data
  summary: ReconciliationSummary = {
    matched: 142300,
    delayed: 23500,
    unmatched: 8200
  };
  
  // ERP Transactions
  erpTransactions: Transaction[] = [
    {
      id: '#POS-8876',
      dateTime: '15/01 09:30:22',
      item: 'iPhone 15',
      type: 'Card',
      amount: 650000,
      status: 'Matched'
    },
    {
      id: '#POS-8877',
      dateTime: '15/01 10:15:47',
      item: 'AirPods Pro',
      type: 'Cash',
      amount: 280000,
      status: 'Delayed',
      delay: '18min delay'
    },
    {
      id: '#POS-8878',
      dateTime: '15/01 11:03:12',
      item: 'MacBook Pro',
      type: 'Card',
      amount: 1200000,
      status: 'Not Found'
    },
    {
      id: '#POS-8879',
      dateTime: '15/01 12:20:15',
      item: 'iPad Air',
      type: 'Card',
      amount: 450000,
      status: 'Matched'
    },
    {
      id: '#POS-8880',
      dateTime: '15/01 13:45:30',
      item: 'Apple Watch',
      type: 'Cash',
      amount: 320000,
      status: 'Delayed',
      delay: '25min delay'
    }
  ];
  
  // Bank Transactions
  bankTransactions: Transaction[] = [
    {
      id: 'BANK-5567',
      dateTime: '15/01 09:30:45',
      description: 'POS Purchase',
      type: 'Card',
      amount: 650000,
      status: 'Matched'
    },
    {
      id: 'BANK-5568',
      dateTime: '15/01 10:33:12',
      description: 'Cash Deposit',
      type: 'Cash',
      amount: 280000,
      status: 'ERP Delay'
    },
    {
      id: 'BANK-5569',
      dateTime: '15/01 11:05:00',
      description: 'POS Refund',
      type: 'Card',
      amount: 75000,
      status: 'No ERP Record'
    },
    {
      id: 'BANK-5570',
      dateTime: '15/01 12:20:30',
      description: 'POS Purchase',
      type: 'Card',
      amount: 450000,
      status: 'Matched'
    },
    {
      id: 'BANK-5571',
      dateTime: '15/01 14:10:45',
      description: 'Cash Deposit',
      type: 'Cash',
      amount: 320000,
      status: 'ERP Delay'
    }
  ];
  
  // Report data
  cashier = 'Adeola Johnson';
  reportDate = '15 Jan 2024 (Single Day)';
  discrepanciesCount = 3;
  
  discrepancies: Discrepancy[] = [
    {
      type: 'warning',
      icon: '⚠️',
      message: 'Delayed: #POS-8877 (18mins)'
    },
    {
      type: 'error',
      icon: '❌',
      message: 'Missing: #POS-8878 (MacBook Pro)'
    },
    {
      type: 'error',
      icon: '❌',
      message: 'Extra: BANK-5569 (Refund)'
    }
  ];
  
  constructor() { }
  
  ngOnInit(): void {
    this.updateSummary();
  }
  
  // Toggle view methods
  toggleSideBySideView(): void {
    this.isSideBySideView = !this.isSideBySideView;
  }
  
  toggleErpTransactions(): void {
    this.showErpTransactions = !this.showErpTransactions;
  }
  
  toggleBankTransactions(): void {
    this.showBankTransactions = !this.showBankTransactions;
  }
  
  // Filter methods
  onBankChange(): void {
    this.selectedAccount = this.selectedBank.accounts[0];
    this.updateSummary();
  }
  
  onAccountChange(): void {
    this.updateSummary();
  }
  
  onDateRangeChange(): void {
    this.updateSummary();
  }
  
  onPaymentTypeChange(): void {
    this.updateSummary();
  }
  
  onSearchChange(): void {
    // Implement search functionality
    console.log('Searching for:', this.searchTerm);
  }
  
  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  }
  
  getStatusClass(status: string): string {
    switch (status) {
      case 'Matched':
        return 'bg-green-100 text-green-800';
      case 'Delayed':
      case 'ERP Delay':
        return 'bg-yellow-100 text-yellow-800';
      case 'Not Found':
      case 'No ERP Record':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
  
  getStatusIcon(status: string): string {
    switch (status) {
      case 'Matched':
        return '✅';
      case 'Delayed':
      case 'ERP Delay':
        return '⚠️';
      case 'Not Found':
      case 'No ERP Record':
        return '❌';
      default:
        return '⚪';
    }
  }
  
  getRowHoverClass(status: string): string {
    switch (status) {
      case 'Matched':
        return 'hover:bg-green-50';
      case 'Delayed':
      case 'ERP Delay':
        return 'hover:bg-yellow-50';
      case 'Not Found':
      case 'No ERP Record':
        return 'hover:bg-red-50';
      default:
        return 'hover:bg-gray-50';
    }
  }
  
  private updateSummary(): void {
    // Simulate dynamic summary calculation based on filters
    const matched = this.erpTransactions.filter(t => t.status === 'Matched').length;
    const delayed = this.erpTransactions.filter(t => t.status === 'Delayed').length;
    const unmatched = this.erpTransactions.filter(t => t.status === 'Not Found').length;
    
    console.log(`Summary updated - Matched: ${matched}, Delayed: ${delayed}, Unmatched: ${unmatched}`);
  }
  
  // Export methods
  exportAsPDF(): void {
    console.log('Exporting reconciliation report as PDF...');
    // Implement PDF export logic
  }
  
  downloadExcel(): void {
    console.log('Downloading reconciliation data as Excel...');
    // Implement Excel download logic
  }
  
  // Filtered data getters
  get filteredErpTransactions(): Transaction[] {
    return this.erpTransactions.filter(transaction => {
      const matchesSearch = !this.searchTerm || 
        transaction.id.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        transaction.item?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesPaymentType = this.selectedPaymentType === 'All Types' ||
        (this.selectedPaymentType === 'Cash Only' && transaction.type === 'Cash') ||
        (this.selectedPaymentType === 'Card Only' && transaction.type === 'Card');
      
      return matchesSearch && matchesPaymentType;
    });
  }
  
  get filteredBankTransactions(): Transaction[] {
    return this.bankTransactions.filter(transaction => {
      const matchesSearch = !this.searchTerm || 
        transaction.id.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        transaction.description?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesPaymentType = this.selectedPaymentType === 'All Types' ||
        (this.selectedPaymentType === 'Cash Only' && transaction.type === 'Cash') ||
        (this.selectedPaymentType === 'Card Only' && transaction.type === 'Card');
      
      return matchesSearch && matchesPaymentType;
    });
  }
  
  get erpTransactionCount(): number {
    return this.filteredErpTransactions.length;
  }
  
  get bankTransactionCount(): number {
    return this.filteredBankTransactions.length;
  }
}
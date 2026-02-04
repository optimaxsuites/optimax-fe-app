import { Component, OnInit } from '@angular/core';

export interface Transaction {
  id: string;
  dateTime: string;
  item?: string;
  description?: string;
  type: 'Card' | 'Cash';
  amount: number;
  status: 'Matched' | 'Delayed' | 'Not Found' | 'ERP Delay' | 'No ERP Record' | 'Partial' | 'Overpaid';
  delay?: string;
  expectedAmount?: number;
}

export interface Bank {
  name: string;
  accounts: string[];
}

export interface ReconciliationSummary {
  matched: number;
  delayed: number;
  unmatched: number;
  partial: number;
  overpaid: number;
}

export interface Discrepancy {
  type: 'warning' | 'error';
  icon: string;
  message: string;
}

export interface ImportedFile {
  name: string;
  type: string;
  uploadDate: string;
  file: File;
}

@Component({
  selector: 'app-sales-reconciliation',
  templateUrl: './sales-reconciliation.component.html',
  styleUrls: ['./sales-reconciliation.component.scss']
})
export class SalesReconciliationComponent implements OnInit {
  
  // View state
  isSideBySideView = false;
  showErpTransactions = true;
  showBankTransactions = true;
  searchTerm = '';
  showImportDropdown = false;
  
  // Imported files
  importedFiles: ImportedFile[] = [];
  
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
    unmatched: 8200,
    partial: 15000,
    overpaid: 10000 
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
    },
    {
      id: '#POS-8881',
      dateTime: '15/01 14:30:00',
      item: 'iPhone Charger',
      type: 'Cash',
      amount: 15000,
      expectedAmount: 20000,
      status: 'Partial'
    },
    {
      id: '#POS-8882',
      dateTime: '15/01 15:45:00',
      item: 'AirPods Case',
      type: 'Card',
      amount: 10000,
      expectedAmount: 8000,
      status: 'Overpaid'
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
    },
    {
      id: 'BANK-5572',
      dateTime: '15/01 14:31:00',
      description: 'Cash Deposit (Partial)',
      type: 'Cash',
      amount: 15000,
      expectedAmount: 20000,
      status: 'Partial'
    },
    {
      id: 'BANK-5573',
      dateTime: '15/01 15:46:00',
      description: 'POS Overpayment',
      type: 'Card',
      amount: 10000,
      expectedAmount: 8000,
      status: 'Overpaid'
    }
  ];
  
  // Report data
  cashier = 'Adeola Johnson';
  reportDate = '15 Jan 2024 (Single Day)';
  discrepanciesCount = 5; // Updated to match actual discrepancies
  
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
    },
    {
      type: 'error',
      icon: '⬇️',
      message: 'Partial Payment: #POS-8881 (Paid 15,000 of 20,000)'
    },
    {
      type: 'error',
      icon: '⬆️',
      message: 'Overpayment: #POS-8882 (Paid 10,000 for 8,000 item)'
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
      case 'Partial':
      case 'Overpaid':
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
      case 'Partial':
        return '⬇️';
      case 'Overpaid':
        return '⬆️';
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
      case 'Partial':
      case 'Overpaid':
        return 'hover:bg-red-50';
      default:
        return 'hover:bg-gray-50';
    }
  }
  
  private updateSummary(): void {
    // Calculate summary based on filtered transactions
    const filteredErp = this.filteredErpTransactions;
    
    // Calculate amounts for each status
    const matched = filteredErp
      .filter(t => t.status === 'Matched')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const delayed = filteredErp
      .filter(t => t.status === 'Delayed')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const unmatched = filteredErp
      .filter(t => t.status === 'Not Found')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const partial = filteredErp
      .filter(t => t.status === 'Partial')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const overpaid = filteredErp
      .filter(t => t.status === 'Overpaid')
      .reduce((sum, t) => sum + t.amount, 0);
    
    this.summary = {
      matched,
      delayed,
      unmatched,
      partial,
      overpaid
    };
    
    console.log(`Summary updated - Matched: ${matched}, Delayed: ${delayed}, Unmatched: ${unmatched}, Partial: ${partial}, Overpaid: ${overpaid}`);
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
  
  // Import methods
  toggleImportDropdown(): void {
    this.showImportDropdown = !this.showImportDropdown;
  }
  
  importFile(fileType: string): void {
    this.showImportDropdown = false;
    
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = this.getFileAcceptAttribute(fileType);
    
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.processImportedFile(file, fileType);
      }
    };
    
    input.click();
  }
  
  getFileAcceptAttribute(fileType: string): string {
    switch(fileType) {
      case 'excel':
        return '.xlsx,.xls';
      case 'pdf':
        return '.pdf';
      case 'csv':
        return '.csv';
      default:
        return '*';
    }
  }
  
  processImportedFile(file: File, fileType: string): void {
    const fileInfo: ImportedFile = {
      name: file.name,
      type: fileType,
      uploadDate: new Date().toLocaleDateString(),
      file: file
    };
    
    this.importedFiles.push(fileInfo);
    
    // You can add specific processing logic based on file type
    switch(fileType) {
      case 'pdf':
        this.processPDF(file);
        break;
      case 'excel':
        this.processExcel(file);
        break;
      case 'csv':
        this.processCSV(file);
        break;
    }
  }
  
  // Example processing methods (implement according to your needs)
  processPDF(file: File): void {
    console.log('Processing PDF:', file.name);
    // Add your PDF processing logic here
    // For example, extract text from PDF or display it
  }
  
  processExcel(file: File): void {
    console.log('Processing Excel:', file.name);
    // Add your Excel processing logic here
    // For example, parse Excel data and update transactions
  }
  
  processCSV(file: File): void {
    console.log('Processing CSV:', file.name);
    // Add your CSV processing logic here
    // For example, parse CSV data and update transactions
  }
  
  // View imported file
  viewFile(file: ImportedFile): void {
    // Implement file viewing logic
    console.log('Viewing file:', file.name);
    
    // For PDFs, you might open in a new tab
    if (file.type === 'pdf') {
      const fileURL = URL.createObjectURL(file.file);
      window.open(fileURL, '_blank');
    }
    // For Excel/CSV, you might parse and display the data
  }
  
  // Remove imported file
  removeFile(file: ImportedFile): void {
    const index = this.importedFiles.indexOf(file);
    if (index > -1) {
      this.importedFiles.splice(index, 1);
    }
  }
  
  // Filtered data getters
  get filteredErpTransactions(): Transaction[] {
    return this.erpTransactions.filter(transaction => {
      const matchesSearch = !this.searchTerm || 
        transaction.id.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (transaction.item && transaction.item.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
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
        (transaction.description && transaction.description.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
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
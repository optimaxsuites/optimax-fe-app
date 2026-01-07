import { Component, OnInit } from '@angular/core';

interface Transaction {
  date: Date;
  description: string;
  category: string;
  credit: number | null;
  debit: number | null;
  balance: number;
}

@Component({
  selector: 'app-bank-account-overview',
  templateUrl: './bank-account-overview.component.html',
  styleUrls: ['./bank-account-overview.component.scss']
})
export class BankAccountOverviewComponent implements OnInit {
  // Account data
  bankName = 'Wema Bank';
  accountName = 'Miracle Igbinoghene';
  accountNumber = '0123456789';
  currency = 'NGN (₦)';
  currentBalance = 120000;
  availableBalance = 118000;
  lastSyncDate = new Date();
  
  // Statement summary
  openingBalance = 90000;
  closingBalance = 120000;
  totalCredits = 50000;
  totalDebits = 21500;
  transactionCount = 3;
  
  // Date range
  dateRange: Date[] = [
    new Date(2025, 6, 1), // July 1, 2025
    new Date() // Today
  ];
  
  // Transactions data
  transactions: Transaction[] = [
    { date: new Date(2025, 6, 10), description: 'POS Withdrawal - ATM', category: 'Withdrawal', credit: null, debit: 20000, balance: 120000 },
    { date: new Date(2025, 6, 9), description: 'Transfer from John Okoro', category: 'Income', credit: 50000, debit: null, balance: 140000 },
    { date: new Date(2025, 6, 8), description: 'Airtime MTN', category: 'Utilities', credit: null, debit: 1500, balance: 90000 }
  ];
  
  // Filter options
  categories = ['All', 'Income', 'Withdrawal', 'Utilities', 'Transfer'];
  filteredCategories = ['Income', 'Withdrawal', 'Utilities', 'Transfer']; // Without 'All'
  selectedCategory = 'All';
  searchText = '';
  
  // Import/export dialog
  importExportDialogVisible = false;
  importExportAction = '';
  exportFormat = 'CSV';
  exportDateRange: Date[] = [
    new Date(2025, 6, 1),
    new Date()
  ];
  
  // Editing
  editedTransaction: Transaction | null = null;
  
  ngOnInit(): void {
    // You might want to load data from a service here
  }
  
  syncAccount(): void {
    // Implement sync logic
    this.lastSyncDate = new Date();
  }
  
  getEditedTransactionCategory(): string {
  return this.editedTransaction?.category || '';
}

setEditedTransactionCategory(category: string): void {
  if (this.editedTransaction) {
    this.editedTransaction.category = category;
  }
}

  filterTransactions(): Transaction[] {
    return this.transactions.filter(t => {
      const matchesCategory = this.selectedCategory === 'All' || t.category === this.selectedCategory;
      const matchesSearch = this.searchText === '' || 
        t.description.toLowerCase().includes(this.searchText.toLowerCase()) ||
        t.category.toLowerCase().includes(this.searchText.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }
  
  showImportExportDialog(action: string): void {
    this.importExportAction = action;
    this.importExportDialogVisible = true;
  }
  
  formatCurrency(value: number | null): string {
    if (value === null) return '';
    return `₦${value.toLocaleString('en-NG')}`;
  }
  
  startEdit(transaction: Transaction): void {
    this.editedTransaction = { ...transaction };
  }
  
  saveEdit(): void {
    if (this.editedTransaction) {
      const index = this.transactions.findIndex(t => 
        t.date.getTime() === this.editedTransaction?.date.getTime() && 
        t.description === this.editedTransaction.description
      );
      if (index !== -1) {
        this.transactions[index] = { ...this.editedTransaction };
      }
      this.editedTransaction = null;
    }
  }
  
  cancelEdit(): void {
    this.editedTransaction = null;
  }
}
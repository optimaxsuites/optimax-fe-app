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
  
  // UI State
  showDatePicker = false;
  showCategoryDropdown = false;
  showEditCategoryDropdown = false;
  
  // Import/export dialog
  importExportDialogVisible = false;
  importExportAction = '';
  exportFormat = 'CSV';
  exportDateRange: Date[] = [
    new Date(2025, 6, 1),
    new Date()
  ];
  selectedFileName = '';
  
  // Editing
  editedTransaction: Transaction | null = null;
  
  // Pagination
  currentPage = 1;
  rowsPerPage = 10;
  
  ngOnInit(): void {
    // Close dropdowns when clicking outside
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        this.showCategoryDropdown = false;
        this.showEditCategoryDropdown = false;
        this.showDatePicker = false;
      }
    });
  }
  
  syncAccount(): void {
    // Implement sync logic
    this.lastSyncDate = new Date();
    // You can add a toast notification here
  }
  
  // Date Picker Methods
  toggleDatePicker(): void {
    this.showDatePicker = !this.showDatePicker;
    this.showCategoryDropdown = false;
    this.showEditCategoryDropdown = false;
  }
  
  formatDateRange(): string {
    if (this.dateRange && this.dateRange.length === 2 && this.dateRange[0] && this.dateRange[1]) {
      const start = this.dateRange[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const end = this.dateRange[1].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${start} - ${end}`;
    }
    return 'Select Date Range';
  }
  
  // Category Dropdown Methods
  toggleCategoryDropdown(): void {
    this.showCategoryDropdown = !this.showCategoryDropdown;
    this.showDatePicker = false;
    this.showEditCategoryDropdown = false;
  }
  
  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.showCategoryDropdown = false;
    this.currentPage = 1; // Reset to first page when filter changes
  }
  
  // Edit Category Dropdown Methods
  toggleEditCategoryDropdown(): void {
    this.showEditCategoryDropdown = !this.showEditCategoryDropdown;
  }
  
  getEditedTransactionCategory(): string {
    return this.editedTransaction?.category || '';
  }

  setEditedTransactionCategory(category: string): void {
    if (this.editedTransaction) {
      this.editedTransaction.category = category;
    }
    this.showEditCategoryDropdown = false;
  }
  
  // Filter and Search Methods
  filterTransactions(): Transaction[] {
    return this.transactions.filter(t => {
      const matchesCategory = this.selectedCategory === 'All' || t.category === this.selectedCategory;
      const matchesSearch = this.searchText === '' || 
        t.description.toLowerCase().includes(this.searchText.toLowerCase()) ||
        t.category.toLowerCase().includes(this.searchText.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }
  
  // Pagination Methods
  getPaginatedTransactions(): Transaction[] {
    const filtered = this.filterTransactions();
    const startIndex = (this.currentPage - 1) * this.rowsPerPage;
    const endIndex = startIndex + this.rowsPerPage;
    return filtered.slice(startIndex, endIndex);
  }
  
  getTotalPages(): number {
    const filtered = this.filterTransactions();
    return Math.ceil(filtered.length / this.rowsPerPage) || 1;
  }
  
  getPageStart(): number {
    if (this.filterTransactions().length === 0) return 0;
    return ((this.currentPage - 1) * this.rowsPerPage) + 1;
  }
  
  getPageEnd(): number {
    const filtered = this.filterTransactions();
    const end = this.currentPage * this.rowsPerPage;
    return Math.min(end, filtered.length);
  }
  
  nextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
    }
  }
  
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }
  
  onRowsPerPageChange(): void {
    this.currentPage = 1; // Reset to first page when rows per page changes
  }
  
  // Import/Export Methods
  showImportExportDialog(action: string): void {
    this.importExportAction = action;
    this.importExportDialogVisible = true;
  }
  
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFileName = file.name;
      // Here you would typically upload the file
      console.log('File selected:', file.name);
    }
  }
  
  clearSelectedFile(): void {
    this.selectedFileName = '';
    const fileInput = document.getElementById('fileUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
  
  handleImportExport(): void {
    if (this.importExportAction === 'import') {
      // Implement import logic
      console.log('Importing file:', this.selectedFileName);
    } else {
      // Implement export logic
      console.log('Exporting as:', this.exportFormat);
    }
    this.importExportDialogVisible = false;
    this.selectedFileName = '';
  }
  
  // Transaction Editing Methods
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
      this.showEditCategoryDropdown = false;
    }
  }
  
  cancelEdit(): void {
    this.editedTransaction = null;
    this.showEditCategoryDropdown = false;
  }

  closeModalOnBackdrop(event: MouseEvent): void {
    // Close modal when clicking on backdrop
    if (event.target === event.currentTarget) {
      this.importExportDialogVisible = false;
    }
  }
}

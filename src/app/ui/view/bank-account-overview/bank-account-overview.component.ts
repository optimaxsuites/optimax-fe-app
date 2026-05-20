import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PaystackService } from '../../../services/paystack.service';
import { DisbursementService } from '../../../services/disbursement.service';
import { ToastService } from '../../../services/toast.service';
import {
  PaystackBalanceDTO,
  PaystackTransactionDTO,
  PaystackTransferPayload
} from '../../domain/accounting.dto';

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
export class BankAccountOverviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ── Source Hub Toggle ─────────────────────────────────
  activeSource: 'bank' | 'paystack' = 'bank';

  // ── Multi-Account Data ─────────────────────────────────
  bankAccounts = [
    {
      bankName: 'Wema Bank',
      accountName: 'Miracle Igbinoghene',
      accountNumber: '0123456789',
      currency: 'NGN (₦)',
      currentBalance: 1250000.00,
      availableBalance: 1248000.00,
      openingBalance: 738500.00,
      closingBalance: 1250000.00,
      transactions: [
        { date: new Date(2026, 4, 19), description: 'TRANSFER FROM JOHN DOE', category: 'Income', credit: 50000.00 as number | null, debit: null as number | null, balance: 1250000.00 },
        { date: new Date(2026, 4, 18), description: 'POS Settlement – Store 001', category: 'Income', credit: 320000.00 as number | null, debit: null as number | null, balance: 1200000.00 },
        { date: new Date(2026, 4, 17), description: 'STAFF SALARIES - MAY BATCH', category: 'Transfer', credit: null as number | null, debit: 1200000.00 as number | null, balance: 880000.00 },
        { date: new Date(2026, 4, 15), description: 'CATERING SERVICE INFLOW', category: 'Income', credit: 85000.00 as number | null, debit: null as number | null, balance: 2080000.00 },
        { date: new Date(2026, 4, 12), description: 'MTN INTERNET FIBER', category: 'Utilities', credit: null as number | null, debit: 25000.00 as number | null, balance: 1995000.00 },
        { date: new Date(2026, 4, 10), description: 'UTILITIES - EKEDC BILL', category: 'Utilities', credit: null as number | null, debit: 85000.00 as number | null, balance: 2020000.00 },
        { date: new Date(2026, 4, 9),  description: 'Client Invoice #4582', category: 'Income', credit: 450000.00 as number | null, debit: null as number | null, balance: 2105000.00 },
        { date: new Date(2026, 4, 8),  description: 'Reconciliation Adjustment', category: 'Income', credit: 15000.00 as number | null, debit: null as number | null, balance: 1655000.00 },
        { date: new Date(2026, 4, 6),  description: 'Office Stationery Hub', category: 'Withdrawal', credit: null as number | null, debit: 18500.00 as number | null, balance: 1640000.00 },
        { date: new Date(2026, 4, 5),  description: 'PAYSTACK DISBURSEMENT INFLOW', category: 'Income', credit: 950000.00 as number | null, debit: null as number | null, balance: 1658500.00 },
        { date: new Date(2026, 4, 3),  description: 'General Cleaning Service', category: 'Withdrawal', credit: null as number | null, debit: 30000.00 as number | null, balance: 708500.00 },
        { date: new Date(2026, 4, 2),  description: 'TAX PROVISION Q1', category: 'Withdrawal', credit: null as number | null, debit: 150000.00 as number | null, balance: 738500.00 }
      ]
    },
    {
      bankName: 'Access Bank',
      accountName: 'Miracle Igbinoghene',
      accountNumber: '0987654321',
      currency: 'NGN (₦)',
      currentBalance: 5420300.50,
      availableBalance: 5410000.50,
      openingBalance: 4490300.50,
      closingBalance: 5420300.50,
      transactions: [
        { date: new Date(2026, 4, 20), description: 'Client Invoice #4589', category: 'Income', credit: 1500000.00 as number | null, debit: null as number | null, balance: 5420300.50 },
        { date: new Date(2026, 4, 15), description: 'Office Rent Payment', category: 'Withdrawal', credit: null as number | null, debit: 500000.00 as number | null, balance: 3920300.50 },
        { date: new Date(2026, 4, 10), description: 'Vendor Settlement - AgroCorp', category: 'Transfer', credit: null as number | null, debit: 250000.00 as number | null, balance: 4420300.50 },
        { date: new Date(2026, 4, 8),  description: 'Hospitality POS Daily Inflow', category: 'Income', credit: 180000.00 as number | null, debit: null as number | null, balance: 4670300.50 },
        { date: new Date(2026, 4, 5),  description: 'Lagos State Water Corp', category: 'Utilities', credit: null as number | null, debit: 15000.00 as number | null, balance: 4490300.50 }
      ]
    },
    {
      bankName: 'Zenith Bank',
      accountName: 'Miracle Igbinoghene',
      accountNumber: '1122334455',
      currency: 'NGN (₦)',
      currentBalance: 8900450.75,
      availableBalance: 8890450.75,
      openingBalance: 5950450.75,
      closingBalance: 8900450.75,
      transactions: [
        { date: new Date(2026, 4, 18), description: 'Treasury Bill Interest Credit', category: 'Income', credit: 450000.00 as number | null, debit: null as number | null, balance: 8900450.75 },
        { date: new Date(2026, 4, 12), description: 'Investment Liquidation', category: 'Income', credit: 2500000.00 as number | null, debit: null as number | null, balance: 8450450.75 },
        { date: new Date(2026, 4, 6),  description: 'Interbank Sweep Outflow', category: 'Transfer', credit: null as number | null, debit: 1000000.00 as number | null, balance: 5950450.75 }
      ]
    },
    {
      bankName: 'GTBank',
      accountName: 'Miracle Igbinoghene',
      accountNumber: '2233445566',
      currency: 'NGN (₦)',
      currentBalance: 367000.00,
      availableBalance: 365000.00,
      openingBalance: 434000.00,
      closingBalance: 367000.00,
      transactions: [
        { date: new Date(2026, 4, 19), description: 'Fuel Purchase - Enyo', category: 'Withdrawal', credit: null as number | null, debit: 22000.00 as number | null, balance: 367000.00 },
        { date: new Date(2026, 4, 14), description: 'Office Groceries - Shoprite', category: 'Withdrawal', credit: null as number | null, debit: 45000.00 as number | null, balance: 389000.00 },
        { date: new Date(2026, 4, 8),  description: 'Refund for Excess Charge', category: 'Income', credit: 12000.00 as number | null, debit: null as number | null, balance: 434000.00 }
      ]
    }
  ];

  // ── Active Account (defaults to first) ────────────────
  get selectedAccount() { return this.bankAccounts[this.selectedAccountIndex]; }
  selectedAccountIndex = 0;
  showAccountDropdown = false;
  isLoading = false;

  // ── Traditional Bank Data (proxied from selectedAccount) ─
  get bankName() { return this.selectedAccount.bankName; }
  get accountName() { return this.selectedAccount.accountName; }
  get accountNumber() { return this.selectedAccount.accountNumber; }
  get currency() { return this.selectedAccount.currency; }
  get currentBalance() { return this.selectedAccount.currentBalance; }
  get availableBalance() { return this.selectedAccount.availableBalance; }
  get openingBalance() { return this.selectedAccount.openingBalance; }
  get closingBalance() { return this.selectedAccount.closingBalance; }
  
  get totalCredits(): number {
    return this.filterTransactions().reduce((sum, t) => sum + (t.credit || 0), 0);
  }
  
  get totalDebits(): number {
    return this.filterTransactions().reduce((sum, t) => sum + (t.debit || 0), 0);
  }
  
  get transactionCount(): number {
    return this.filterTransactions().length;
  }

  get transactions(): Transaction[] { return this.selectedAccount.transactions; }

  lastSyncDate = new Date();
  showBalance = true;

  // Date range (Defaulting to May 2026 for high-fidelity data demonstration)
  dateRange: Date[] = [
    new Date(2026, 4, 1),
    new Date(2026, 4, 31)
  ];

  get startDateString(): string {
    return this.formatDateToYYYYMMDD(this.dateRange[0]);
  }

  get endDateString(): string {
    return this.formatDateToYYYYMMDD(this.dateRange[1]);
  }

  onStartDateChange(value: string): void {
    if (value) {
      this.dateRange[0] = new Date(value);
      this.currentPage = 1;
    }
  }

  onEndDateChange(value: string): void {
    if (value) {
      this.dateRange[1] = new Date(value);
      this.currentPage = 1;
    }
  }

  applyDateRange(): void {
    this.showDatePicker = false;
    this.currentPage = 1;
    this.toastService.success('Date range filter applied successfully');
  }

  formatDateToYYYYMMDD(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Filter options
  categories = ['All', 'Income', 'Withdrawal', 'Utilities', 'Transfer'];
  filteredCategories = ['Income', 'Withdrawal', 'Utilities', 'Transfer']; // Without 'All'
  selectedCategory = 'All';
  searchText = '';
  
  // UI State
  showDatePicker = false;
  showCategoryDropdown = false;
  showEditCategoryDropdown = false;

  selectAccount(index: number): void {
    this.isLoading = true;
    this.showAccountDropdown = false;
    this.currentPage = 1;
    setTimeout(() => {
      this.selectedAccountIndex = index;
      this.lastSyncDate = new Date();
      this.isLoading = false;
    }, 800);
  }

  toggleAccountDropdown(): void {
    this.showAccountDropdown = !this.showAccountDropdown;
  }

  toggleBalanceVisibility(): void {
    this.showBalance = !this.showBalance;
  }
  
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

  // ── Paystack Wallet Integrated State ──────────────────
  paystackActiveTab: 'balance' | 'transactions' | 'transfer' = 'balance';
  paystackBalanceData: PaystackBalanceDTO | null = null;
  paystackBalanceLoading = false;
  paystackBalanceError: string | null = null;

  paystackTransactions: PaystackTransactionDTO[] = [];
  paystackTxLoading = false;
  paystackTxError: string | null = null;

  paystackTxStartDate = '';
  paystackTxEndDate = '';
  paystackTxTypeFilter = '';

  paystackTxCurrentPage = 1;
  paystackTxPageSize = 10;

  paystackSelectedTxDetail: PaystackTransactionDTO | null = null;
  paystackTxDetailLoading = false;
  paystackTxDetailError: string | null = null;
  paystackShowDetailDialog = false;

  paystackEmployees: any[] = [];
  paystackEmployeesLoading = false;
  paystackSelectedEmployeeId: number | null = null;
  paystackTransferAmount: number | null = null;
  paystackIsTransferring = false;
  paystackShowConfirmDialog = false;
  paystackLastTransferReference: string | null = null;
  paystackTransferError: string | null = null;

  constructor(
    private paystackService: PaystackService,
    private disbursementService: DisbursementService,
    private toastService: ToastService,
    private route: ActivatedRoute
  ) {}
  
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

    this.checkVerificationCallback();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  syncAccount(): void {
    this.isLoading = true;
    setTimeout(() => {
      this.lastSyncDate = new Date();
      this.isLoading = false;
    }, 1000);
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
      
      let matchesDate = true;
      if (this.dateRange && this.dateRange.length === 2 && this.dateRange[0] && this.dateRange[1]) {
        const start = new Date(this.dateRange[0]);
        start.setHours(0, 0, 0, 0);
        const end = new Date(this.dateRange[1]);
        end.setHours(23, 59, 59, 999);
        const tDate = new Date(t.date);
        matchesDate = tDate >= start && tDate <= end;
      }
      return matchesCategory && matchesSearch && matchesDate;
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

  // ==========================================================================
  // SOURCE TOGGLE SWITCHER
  // ==========================================================================

  setActiveSource(source: 'bank' | 'paystack'): void {
    this.activeSource = source;
    if (source === 'paystack') {
      this.paystackActiveTab = 'balance';
      this.loadPaystackBalance();
      this.loadPaystackTransactions();
      this.loadPaystackEmployees();
    }
  }

  setPaystackActiveTab(tab: 'balance' | 'transactions' | 'transfer'): void {
    this.paystackActiveTab = tab;
    if (tab === 'transactions' && this.paystackTransactions.length === 0 && !this.paystackTxLoading) {
      this.loadPaystackTransactions();
    }
    if (tab === 'transfer' && this.paystackEmployees.length === 0 && !this.paystackEmployeesLoading) {
      this.loadPaystackEmployees();
    }
  }

  // ==========================================================================
  // PAYSTACK WALLET BALANCE
  // ==========================================================================

  loadPaystackBalance(): void {
    this.paystackBalanceLoading = true;
    this.paystackBalanceError = null;

    this.paystackService.getBalance()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.paystackBalanceData = res.data;
          this.paystackBalanceLoading = false;
        },
        error: (err) => {
          this.paystackBalanceError = err?.error?.message || 'Failed to load wallet balance. Please try again.';
          this.paystackBalanceLoading = false;
        }
      });
  }

  refreshPaystackBalance(): void {
    this.loadPaystackBalance();
  }

  // ==========================================================================
  // PAYSTACK TRANSACTIONS
  // ==========================================================================

  loadPaystackTransactions(): void {
    this.paystackTxLoading = true;
    this.paystackTxError = null;
    this.paystackTxCurrentPage = 1;

    this.paystackService
      .getTransactions(
        this.paystackTxStartDate || undefined,
        this.paystackTxEndDate   || undefined,
        this.paystackTxTypeFilter || undefined
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.paystackTransactions = res.data || [];
          this.paystackTxLoading = false;
        },
        error: (err) => {
          this.paystackTxError = err?.error?.message || 'Failed to load transactions.';
          this.paystackTxLoading = false;
        }
      });
  }

  applyPaystackTxFilters(): void {
    this.loadPaystackTransactions();
  }

  clearPaystackTxFilters(): void {
    this.paystackTxStartDate   = '';
    this.paystackTxEndDate     = '';
    this.paystackTxTypeFilter  = '';
    this.loadPaystackTransactions();
  }

  get paginatedPaystackTransactions(): PaystackTransactionDTO[] {
    const start = (this.paystackTxCurrentPage - 1) * this.paystackTxPageSize;
    return this.paystackTransactions.slice(start, start + this.paystackTxPageSize);
  }

  get paystackTxTotalPages(): number {
    return Math.ceil(this.paystackTransactions.length / this.paystackTxPageSize) || 1;
  }

  paystackTxNextPage(): void {
    if (this.paystackTxCurrentPage < this.paystackTxTotalPages) this.paystackTxCurrentPage++;
  }

  paystackTxPrevPage(): void {
    if (this.paystackTxCurrentPage > 1) this.paystackTxCurrentPage--;
  }

  getPaystackTxPageStart(): number {
    if (this.paystackTransactions.length === 0) return 0;
    return (this.paystackTxCurrentPage - 1) * this.paystackTxPageSize + 1;
  }

  getPaystackTxPageEnd(): number {
    return Math.min(this.paystackTxCurrentPage * this.paystackTxPageSize, this.paystackTransactions.length);
  }

  // ==========================================================================
  // PAYSTACK EMPLOYEES (HR)
  // ==========================================================================

  loadPaystackEmployees(): void {
    this.paystackEmployeesLoading = true;

    this.disbursementService.getEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.paystackEmployees = res?.content || res || [];
          this.paystackEmployeesLoading = false;
        },
        error: () => {
          this.paystackEmployeesLoading = false;
          this.toastService.warn('Could not load employee list.');
        }
      });
  }

  get selectedPaystackEmployee(): any {
    return this.paystackEmployees.find(e => e.id === this.paystackSelectedEmployeeId) || null;
  }

  getPaystackEmployeeDisplayName(employee: any): string {
    if (!employee) return '';
    return employee.fullName
      || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
      || employee.name
      || `Employee #${employee.id}`;
  }

  // ==========================================================================
  // PAYSTACK SINGLE TRANSFER DISBURSEMENT
  // ==========================================================================

  get isPaystackTransferFormValid(): boolean {
    return !!this.paystackSelectedEmployeeId && !!this.paystackTransferAmount && this.paystackTransferAmount > 0;
  }

  openPaystackConfirmDialog(): void {
    if (!this.isPaystackTransferFormValid) {
      this.toastService.warn('Please select an employee and enter a valid amount.');
      return;
    }
    this.paystackShowConfirmDialog = true;
  }

  cancelPaystackTransfer(): void {
    this.paystackShowConfirmDialog = false;
  }

  confirmPaystackTransfer(): void {
    if (!this.paystackSelectedEmployeeId || !this.paystackTransferAmount) return;

    const payload: PaystackTransferPayload = {
      employeeId: this.paystackSelectedEmployeeId,
      amount:     this.paystackTransferAmount
    };

    this.paystackIsTransferring    = true;
    this.paystackShowConfirmDialog = false;
    this.paystackTransferError     = null;
    this.paystackLastTransferReference = null;

    this.paystackService.initiateTransfer(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.paystackLastTransferReference = res.data?.reference || null;
          this.paystackIsTransferring = false;
          this.toastService.success(
            `Transfer initiated successfully. Reference: ${res.data?.reference}`
          );
          this.resetPaystackTransferForm();
          this.loadPaystackBalance();
          this.loadPaystackTransactions();
        },
        error: (err) => {
          this.paystackTransferError  = err?.error?.message || 'Transfer failed. Please try again.';
          this.paystackIsTransferring = false;
          this.toastService.error(this.paystackTransferError!);
        }
      });
  }

  resetPaystackTransferForm(): void {
    this.paystackSelectedEmployeeId = null;
    this.paystackTransferAmount     = null;
    this.paystackTransferError      = null;
  }

  // ==========================================================================
  // PAYSTACK VERIFICATION & DETAIL VIEW MODALS
  // ==========================================================================

  checkVerificationCallback(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const ref = params['reference'] || params['trxref'];
      if (ref) {
        this.activeSource = 'paystack';
        this.toastService.info(`Verifying transaction: ${ref}...`);
        this.paystackService.verifyPayment(ref)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              if (res.data?.status === 'SUCCESS') {
                this.toastService.success(`Payment verified successfully! Amount: ${this.formatNaira(res.data.amount)}`);
              } else {
                this.toastService.warn(`Payment status: ${res.data?.status || 'UNKNOWN'}`);
              }
              this.loadPaystackBalance();
              this.loadPaystackTransactions();
            },
            error: (err) => {
              this.toastService.error(err?.error?.message || 'Payment verification failed.');
            }
          });
      }
    });
  }

  viewPaystackTransactionDetail(reference: string): void {
    this.paystackTxDetailLoading = true;
    this.paystackTxDetailError = null;
    this.paystackShowDetailDialog = true;
    this.paystackSelectedTxDetail = null;

    this.paystackService.getTransactionByReference(reference)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.paystackSelectedTxDetail = res.data;
          this.paystackTxDetailLoading = false;
        },
        error: (err) => {
          this.paystackTxDetailError = err?.error?.message || 'Failed to fetch transaction details.';
          this.paystackTxDetailLoading = false;
        }
      });
  }

  closePaystackDetailDialog(): void {
    this.paystackShowDetailDialog = false;
    this.paystackSelectedTxDetail = null;
    this.paystackTxDetailError = null;
  }

  // ==========================================================================
  // PAYSTACK HELPERS
  // ==========================================================================

  formatNaira(amount: number | null | undefined): string {
    if (amount == null) return '—';
    return `₦${Number(amount).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  getPaystackTypeClass(type: string): string {
    return type === 'CREDIT'
      ? 'bg-green-100 text-green-700 border border-green-200'
      : 'bg-red-100 text-red-700 border border-red-200';
  }

  getPaystackTypeAmountClass(type: string): string {
    return type === 'CREDIT' ? 'text-customGreen font-semibold' : 'text-red-600 font-semibold';
  }

  getPaystackStatusClass(status: string): string {
    switch (status) {
      case 'SUCCESS': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'PENDING': return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'FAILED':  return 'bg-rose-100 text-rose-800 border border-rose-200';
      default:        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  }

  formatPaystackTxDate(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

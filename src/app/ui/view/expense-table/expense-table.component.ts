import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ExpenseService, Expense, ExpenseStatus, MerchantDTO, CategoryDTO, TaxDTO } from '../../service/expense.service';
import { debounceTime, Subject } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-expense-table',
  templateUrl: './expense-table.component.html',
  styleUrls: ['./expense-table.component.scss'],
  providers: [ConfirmationService, MessageService]
})
export class ExpenseTableComponent implements OnInit {
  expenses: Expense[] = [];
  filteredExpenses: Expense[] = [];
  searchTerm: string = '';
  // FIX: Allow selectedExpense to be null to match its initialization.
  selectedExpense: Expense | null = null;
  currentUserId: string = '';
  private searchTermSubject: Subject<string> = new Subject();

  sidebarVisible = false;
  isModalOpen: boolean = false;
  isModalOpen2: boolean = false;
  dropdownOpen = {
    category: false,
    status: false,
    dateRange: false
  };

  selectedCategory: string | null = null;
  selectedStatus: string | null = null;
  dateRangeType: string | null = null;
  dateFrom: string | null = null;
  dateTo: string | null = null;

  categories = ['Administrative', 'Cost of Goods Sold', 'Employee-Related', 'Operating Expenses', 'Sales and Marketing', 'Others'];
  statuses = Object.values(ExpenseStatus);

  expense: any;
  expenseId: string | null = null;
  // FIX: Change selectedExpenses type to an array of Expense objects.
  selectedExpenses: Expense[] = [];

  onRowSelect(event: any) {
    this.selectedExpenses = event.value;
  }

  onRowUnselect(event: any) {
    this.selectedExpenses = event.value;
  }
  
  deleteSelectedExpenses() {
    if (!this.selectedExpenses.length) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${this.selectedExpenses.length} expenses?`,
      header: `Delete Selected Expenses`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-warning',
      acceptIcon: 'pi pi-trash',
      rejectIcon: 'pi pi-times',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',

      accept: () => {
        this.selectedExpenses.forEach(exp => this.deleteExpense(exp));
        this.selectedExpenses = [];
      }
    });
  }

  colorClasses: string[] = [
    'color-lightblue',
    'color-lightgreen',
    'color-lightyellow',
    'color-lightcoral',
    'color-lightpink'
  ];

  constructor(
    private router: Router,
    private expenseService: ExpenseService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  getExpenseCount(): number {
    return this.expenses?.length || 0;
  }

  ngOnInit(): void {
    this.loadExpenses();
    this.searchTermSubject.pipe(debounceTime(300)).subscribe(() => {
      this.applyFilters();
    });
  }

  loadExpenses(): void {
    this.expenseService.getExpenses().subscribe(expenses => {
      this.expenses = expenses;
      this.filteredExpenses = [...this.expenses];
      console.log('Loaded expenses from API:', this.filteredExpenses);
    });
  }

  get dateRangeLabel(): string {
    if (!this.dateRangeType) return 'Date Range';
    const labels: { [key: string]: string } = {
      'today': 'Today',
      'week': 'This Week',
      'month': 'This Month',
      'custom': 'Custom Range'
    };
    return labels[this.dateRangeType] || 'Date Range';
  }

  onSearchInputChange(): void {
    this.searchTermSubject.next(this.searchTerm);
  }

  applyFilters(): void {
    this.filteredExpenses = this.expenses.filter(expense => {
      const merchantName = (expense.merchant as MerchantDTO)?.name || '';
      const categoryName = (expense.category as CategoryDTO)?.name || '';

      if (this.searchTerm &&
        !merchantName.toLowerCase().includes(this.searchTerm.toLowerCase()) &&
        !expense.id.toString().includes(this.searchTerm) &&
        !expense.amount.toString().includes(this.searchTerm) &&
        !categoryName.toLowerCase().includes(this.searchTerm.toLowerCase())) {
        return false;
      }

      if (this.selectedCategory && categoryName !== this.selectedCategory) {
        return false;
      }

      if (this.selectedStatus && expense.status !== this.selectedStatus) {
        return false;
      }

      if (this.dateFrom && this.dateTo) {
        const fromDate = new Date(this.dateFrom);
        const toDate = new Date(this.dateTo + 'T23:59:59');
        const expenseDate = new Date(expense.eventDate);

        if (expenseDate < fromDate || expenseDate > toDate) {
          return false;
        }
      }
      return true;
    });
  }
  
  applyDateRange(): void {
    if (!this.dateRangeType) {
      this.applyFilters();
      return;
    }
    const today = new Date();
    let fromDate = new Date();
    let toDate = new Date();

    switch (this.dateRangeType) {
      case 'today':
        fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        toDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        break;
      case 'week':
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysToMonday);
        toDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        break;
      case 'month':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'custom':
        if (!this.dateFrom || !this.dateTo) {
          this.applyFilters();
          return;
        }
        fromDate = new Date(this.dateFrom);
        toDate = new Date(this.dateTo + 'T23:59:59');
        break;
      default:
        this.applyFilters();
        return;
    }

    if (this.dateRangeType !== 'custom') {
      this.dateFrom = fromDate.toISOString().split('T')[0];
      this.dateTo = toDate.toISOString().split('T')[0];
    }
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  toggleDropdown(type: 'category' | 'status' | 'dateRange'): void {
    Object.keys(this.dropdownOpen).forEach(key => {
      if (key !== type) {
        this.dropdownOpen[key as keyof typeof this.dropdownOpen] = false;
      }
    });
    this.dropdownOpen[type] = !this.dropdownOpen[type];
  }

  selectCategory(category: string | null): void {
    this.selectedCategory = category;
    this.dropdownOpen.category = false;
    this.applyFilters();
  }

  selectStatus(status: string | null): void {
    this.selectedStatus = status;
    this.dropdownOpen.status = false;
    this.applyFilters();
  }

  selectDateRange(range: string): void {
    this.dateRangeType = range;
    this.dropdownOpen.dateRange = false;

    if (range !== 'custom') {
      this.dateFrom = null;
      this.dateTo = null;
    } else if (range === 'custom') {
      this.dateRangeType = 'custom';
      // this.dateFrom = null;
      // this.dateTo = null;
    }

    this.applyDateRange();
  }
  
  applyCustomDateRange(): void {
    if (this.dateFrom && this.dateTo) {
      if (new Date(this.dateFrom) > new Date(this.dateTo)) {
        const temp = this.dateFrom;
        this.dateFrom = this.dateTo;
        this.dateTo = temp;
      }
      this.applyFilters();
    }
  }

  openAdvancedFilters(): void {
    console.log('Opening advanced filters');
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedExpense = null;
    this.isModalOpen2 = false;
  }

  generateRandomColor(): string {
    const colors = ['#ADD8E6', '#90EE90', '#FFFFE0', '#F08080', '#FFB6C1'];
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
  }

  navigateToexpense(): void {
    this.router.navigate(['/expense-summary']);
  }

  navigateToForm(): void {
    this.router.navigate(['/expensesForm']);
  }

  confirmDelete(expense: Expense): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete this expense?`,
      header: `Delete Expense - ${expense.merchant?.name ?? ''}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-warning',
      acceptIcon: 'pi pi-trash',
      rejectIcon: 'pi pi-times',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        this.deleteExpense(expense);
      }
    });
  }

  deleteExpense(expense: Expense): void {
    this.expenseService.deleteExpense(expense.id).subscribe(() => {
      this.loadExpenses();
      this.messageService.add({
        severity: 'success',
        summary: 'Expense Deleted',
        detail: `Expense for ${expense.merchant?.name ?? ''} has been successfully deleted.`
      });
    });
  }

  viewExpenseApproval(expense: Expense): void {
    this.selectedExpense = { ...expense };
    this.isModalOpen2 = true;
  }

  editExpense(expense: Expense): void {
    this.selectedExpense = { ...expense };
    this.isModalOpen = true;
  }

  saveEditedExpense(): void {
    if (!this.selectedExpense) return;
    const updatedExpense: Expense = {
      ...this.selectedExpense,
      name: this.selectedExpense.name || '',
      description: this.selectedExpense.description || '',
      eventDate: this.selectedExpense.eventDate || new Date().toISOString(),
      currency: this.selectedExpense.currency,
      amount: this.selectedExpense.amount,
      status: this.selectedExpense.status,
      paidBy: this.selectedExpense.paidBy,
      receiptReference: this.selectedExpense.receiptReference,
      merchantId: this.selectedExpense.merchantId,
      categoryId: this.selectedExpense.categoryId,
      taxId: this.selectedExpense.taxId,
      scheduledPaymentId: this.selectedExpense.scheduledPaymentId,
      merchant: this.selectedExpense.merchant,
      category: this.selectedExpense.category,
      tax: this.selectedExpense.tax,
      scheduledPayment: this.selectedExpense.scheduledPayment,
      quantity: this.selectedExpense.quantity
    };
    
    this.expenseService.updateExpense(this.selectedExpense.id, updatedExpense).subscribe(() => {
      this.loadExpenses();
      this.messageService.add({
        severity: 'success',
        summary: 'Expense Updated',
        detail: `Expense for ${this.selectedExpense?.merchant?.name} has been successfully updated.`
      });
      this.closeModal();
    });
  }

  getTotalAmount(): number {
    return this.expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  }

  getApprovedCount(): number {
    return this.expenses.filter(expense => expense.status === ExpenseStatus.APPROVED).length;
  }

  getPendingCount(): number {
    return this.expenses.filter(expense => expense.status === ExpenseStatus.PENDING).length;
  }

  getRejectedCount(): number {
    return this.expenses.filter(expense => expense.status === ExpenseStatus.REJECTED).length;
  }

  approve(request: Expense): void {
    const updatedExpense: Expense = {
      ...request,
      status: ExpenseStatus.APPROVED
    };
    this.expenseService.updateExpense(request.id, updatedExpense).subscribe(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Request Approved',
        detail: `Expense for ${request.merchant?.name ?? ''} has been approved successfully.`
      });
      this.loadExpenses();
    });
  }
  
  reject(request: Expense): void {
    const updatedExpense: Expense = {
      ...request,
      status: ExpenseStatus.REJECTED
    };
    this.expenseService.updateExpense(request.id, updatedExpense).subscribe(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Request Rejected',
        detail: `Expense for ${request.merchant?.name ?? ''} has been rejected.`
      });
      this.loadExpenses();
    });
  }


  bulkApprove(): void {
    if (this.selectedExpenses.length === 0) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'No Expenses Selected', 
        detail: 'Please select at least one expense to approve.' });
      return;
    }
    this.selectedExpenses.forEach(exp => this.approve(exp));
    this.selectedExpenses = [];
  }

  bulkReject(): void {
    if (this.selectedExpenses.length === 0) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'No Expenses Selected', 
        detail: 'Please select at least one expense to reject.' });
      return;
    }
    this.selectedExpenses.forEach(exp => this.reject(exp));
    this.selectedExpenses = [];
  }

  calculateDisplayAmount(expense: Expense): number {
    const baseAmount = Number(expense.amount);
    const taxRate = expense.tax && typeof expense.tax === 'object'
      ? expense.tax.rate / 100
      : (typeof expense.tax === 'number' ? 
        expense.tax / 100 : 0);
      return baseAmount * (1 + taxRate);
  }
  
  getTaxRateDisplayValue(taxPercentage: TaxDTO | number | undefined): number | undefined {
    if (taxPercentage === undefined || taxPercentage === null) {
      return undefined;
    }
    return typeof taxPercentage === 'object' ? taxPercentage.rate : taxPercentage;
  }


  formatAmount(value: number | string | null | undefined): string {
    const n = Number(value);
    return !isNaN(n) && value !== null && value !== undefined ? n.toLocaleString(): '';
  }

  updateEditAmount(event: any): void {
    if (this.selectedExpense){
      const raw = (event.target.value || '').toString().replace(/,/g, '');
      const num = Number(raw);
      this.selectedExpense.amount = !isNaN(num) ? num : 0;

    }
  }

  onlyNumbers(event: KeyboardEvent): void {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'];
    if (allowedKeys.includes(event.key) || (event.ctrlKey && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase()))) {
      return;
    }
    if (!/[0-9]/.test(event.key)) {
      event.preventDefault();
    }
  }


  hasTaxPercentage(expense: Expense | null): boolean {
    return !!expense && (expense as any).taxPercentage !== undefined;
  }

  getTaxPercentage(expense: Expense | null): number | undefined {
    return expense ? (expense as any).taxPercentage : undefined
  }

  getExpenseDate(expense: Expense | null): string | Date | undefined {
    return expense ? (expense as any ).data : undefined;
  }

  onTaxInputChange(event: Event): void {
    if (!this.selectedExpense) return;

    const input = event.target as HTMLInputElement;
    const rateValue = parseFloat(input.value) || 0;

    this.selectedExpense.tax = {
      id: this.selectedExpense.tax?.id || 0,
      name: 'Custom',
      rate: rateValue,
      description: 'Custom tax rate'
    };
  }

  onDateInputChange(event: Event): void {
    if (!this.selectedExpense) return;

    const input = event.target as HTMLInputElement;
    this.selectedExpense.eventDate = input.value; 
  }

}
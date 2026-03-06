import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

import { MatIconModule } from '@angular/material/icon';

import { debounceTime, Subject } from 'rxjs';

import {
  ExpenseService,
  Expense,
  ExpenseStatus,
  MerchantDTO,
  CategoryDTO,
  TaxDTO,
} from '../../service/expense.service';

import { SideModalComponent } from '../../sharedComponent/view/side-modal/side-modal.component';

@Component({
  selector: 'app-expense-table',
  templateUrl: './expense-table.component.html',
  styleUrls: ['./expense-table.component.scss'],
  standalone: true,
  providers: [ConfirmationService, MessageService],
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    ConfirmDialogModule,
    ToastModule,
    InputTextModule,
    InputNumberModule,
    TooltipModule,
    MatIconModule,
    SideModalComponent,
  ],
})
export class ExpenseTableComponent implements OnInit {
  [x: string]: any;
  expenses: Expense[] = [];
  filteredExpenses: Expense[] = [];
  selectedExpenses: Expense[] = [];

  searchTerm: string = '';
  private searchTermSubject: Subject<string> = new Subject();

  selectedExpense: Expense | null = null;

  // Track selected IDs for the edit form dropdowns
  editMerchantId: number | null = null;
  editCategoryId: number | null = null;

  isModalOpen: boolean = false;
  isModalOpen2: boolean = false;

  // Receipt modal properties
  showReceiptModal: boolean = false;
  receiptModalUrl: string = '';
  receiptModalTitle: string = '';
  receiptImageLoading: boolean = false;
  receiptImageError: string = '';

  // Receipt preview blob URLs for the detail view modal
  companyReceiptUrl: string | null = null;
  employeeReceiptUrl: string | null = null;
  companyReceiptLoading: boolean = false;
  employeeReceiptLoading: boolean = false;

  dropdownOpen = {
    category: false,
    status: false,
    dateRange: false,
  };

  selectedCategory: string | null = null;
  selectedStatus: string | null = null;

  dateRangeType: string | null = null;
  dateFrom: string | null = null;
  dateTo: string | null = null;

  categoryNames: string[] = [];
  categories: CategoryDTO[] = [];
  merchants: MerchantDTO[] = [];

  private loadCategories(): void {
    this.expenseService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.categoryNames = categories.map((c) => c.name);
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.categories = [];
        this.categoryNames = [];
      },
    });
  }

  private loadMerchants(): void {
    this.expenseService.getMerchants().subscribe({
      next: (merchants) => {
        this.merchants = merchants;
      },
      error: (err) => {
        console.error('Error loading merchants:', err);
        this.merchants = [];
      },
    });
  }

  statuses = Object.values(ExpenseStatus);

  colorClasses: string[] = [
    'color-lightblue',
    'color-lightgreen',
    'color-lightyellow',
    'color-lightcoral',
    'color-lightpink',
  ];

  constructor(
    private router: Router,
    private expenseService: ExpenseService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
  ) {}

  getExpenseCount(): number {
    return this.expenses?.length || 0;
  }

  /** Returns true if the expense is APPROVED — used to lock editing */
  isApproved(expense: Expense): boolean {
    return expense?.status === ExpenseStatus.APPROVED;
  }

  ngOnInit(): void {
    this.loadExpenses();
    this.loadCategories();
    this.loadMerchants();
    this.searchTermSubject.pipe(debounceTime(300)).subscribe(() => {
      this.applyFilters();
    });
  }

  loadExpenses(): void {
    this.expenseService.getExpenses().subscribe((expenses) => {
      this.expenses = expenses.sort((a, b) => b.id - a.id);
      this.filteredExpenses = [...this.expenses];
    });
  }

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
      icon: 'pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-warning',
      acceptIcon: 'pi-trash',
      rejectIcon: 'pi-times',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        this.selectedExpenses.forEach((exp) => this.deleteExpense(exp));
        this.selectedExpenses = [];
      },
    });
  }

  get dateRangeLabel(): string {
    if (!this.dateRangeType) return 'Date Range';
    const labels: { [key: string]: string } = {
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
      custom: 'Custom Range',
    };
    return labels[this.dateRangeType] || 'Date Range';
  }

  onSearchInputChange(): void {
    this.searchTermSubject.next(this.searchTerm);
  }

  applyFilters(): void {
    this.filteredExpenses = this.expenses.filter((expense) => {
      const merchantName = (expense.merchant as MerchantDTO)?.name || '';
      const categoryName = (expense.category as CategoryDTO)?.name || '';
      const amountStr = Math.floor(Number(expense.amount)).toString();

      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase().trim();
        const matchesName = (expense.name || '').toLowerCase().includes(term);
        const matchesAmount = amountStr.includes(term);
        const matchesMerchant = merchantName.toLowerCase().includes(term);
        const matchesCategory = categoryName.toLowerCase().includes(term);
        const matchesId = expense.id.toString().includes(term);

        if (
          !matchesName &&
          !matchesAmount &&
          !matchesMerchant &&
          !matchesCategory &&
          !matchesId
        ) {
          return false;
        }
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
        fromDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
        );
        toDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          23,
          59,
          59,
        );
        break;
      case 'week':
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        fromDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - daysToMonday,
        );
        toDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          23,
          59,
          59,
        );
        break;
      case 'month':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        toDate = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0,
          23,
          59,
          59,
        );
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
    Object.keys(this.dropdownOpen).forEach((key) => {
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
    this.editMerchantId = null;
    this.editCategoryId = null;
    if (this.companyReceiptUrl) {
      URL.revokeObjectURL(this.companyReceiptUrl);
      this.companyReceiptUrl = null;
    }
    if (this.employeeReceiptUrl) {
      URL.revokeObjectURL(this.employeeReceiptUrl);
      this.employeeReceiptUrl = null;
    }
  }

  generateRandomColor(): string {
    const colors = ['#ADD8E6', '#90EE90', '#FFFFE0', '#F08080', '#FFB6C1'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  navigateToSummary(): void {
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
      acceptIcon: 'pi-trash',
      rejectIcon: 'pi-times',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        this.deleteExpense(expense);
      },
    });
  }

  deleteExpense(expense: Expense): void {
    this.expenseService.deleteExpense(expense.id).subscribe(() => {
      this.loadExpenses();
      this.messageService.add({
        severity: 'success',
        summary: 'Expense Deleted',
        detail: `Expense for ${expense.merchant?.name ?? ''} has been successfully deleted.`,
      });
    });
  }

  /** Opens the detail view modal and loads receipt previews from expense object */
  viewExpenseApproval(expense: Expense): void {
    this.selectedExpense = { ...expense };
    this.selectedExpense.merchant =
      this.selectedExpense.merchant ??
      ({
        id: 0,
        name: '',
        phoneNumber: '',
        address: '',
        emailAddress: '',
        contactPersonName: '',
      } as MerchantDTO);
    this.selectedExpense.category =
      this.selectedExpense.category ?? ({ id: 0, name: '' } as CategoryDTO);

    // Reset receipt state
    this.companyReceiptUrl = null;
    this.employeeReceiptUrl = null;
    this.companyReceiptLoading = false;
    this.employeeReceiptLoading = false;

    console.log(' Full Expense Object:', this.selectedExpense);
    console.log('Company Receipt:', this.selectedExpense.companyReceipt);
    console.log(' Employee Receipt:', this.selectedExpense.expenseReceipt);

    // Always convert the raw file path to a proper web-accessible URL
    if (this.selectedExpense.companyReceipt?.url) {
      const rawUrl = this.selectedExpense.companyReceipt.url;
      this.companyReceiptUrl = this.convertToWebUrl(rawUrl);
      console.log(' Company Receipt - Raw URL:', rawUrl);
      console.log(' Company Receipt - Web URL:', this.companyReceiptUrl);
    } else {
      console.warn(' No company receipt URL found');
    }

    if (this.selectedExpense.expenseReceipt?.url) {
      const rawUrl = this.selectedExpense.expenseReceipt.url;
      this.employeeReceiptUrl = this.convertToWebUrl(rawUrl);
      console.log(' Employee Receipt - Raw URL:', rawUrl);
      console.log(' Employee Receipt - Web URL:', this.employeeReceiptUrl);
    } else {
      console.warn(' No employee receipt URL found');
    }

    this.isModalOpen2 = true;
  }

  /** Opens the edit modal — blocked with a toast if the expense is APPROVED */
  editExpense(expense: Expense): void {
    if (this.isApproved(expense)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Edit Not Allowed',
        detail: 'Approved expenses cannot be edited.',
      });
      return;
    }

    this.selectedExpense = JSON.parse(JSON.stringify(expense));
    if (this.selectedExpense) {
      this.editMerchantId =
        this.selectedExpense.merchantId ||
        this.selectedExpense.merchant?.id ||
        null;
      this.editCategoryId =
        this.selectedExpense.categoryId ||
        this.selectedExpense.category?.id ||
        null;
      this.selectedExpense.tax = this.selectedExpense.tax ?? undefined;
    }
    this.isModalOpen = true;
  }

  saveEditedExpense(): void {
    if (!this.selectedExpense) return;

    if (!this.editMerchantId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please select a Merchant before saving.',
      });
      return;
    }

    if (!this.editCategoryId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please select a Category before saving.',
      });
      return;
    }

    const updatedExpense: any = {
      name: this.selectedExpense.name || '',
      description: this.selectedExpense.description || '',
      eventDate:
        this.selectedExpense.eventDate ||
        new Date().toISOString().split('T')[0],
      quantity: this.selectedExpense.quantity || 1,
      currency: this.selectedExpense.currency,
      amount: Number(this.selectedExpense.amount) || 0,
      status: this.selectedExpense.status,
      paidBy: this.selectedExpense.paidBy,
      receiptReference: this.selectedExpense.receiptReference || '',
      merchantId: Number(this.editMerchantId),
      categoryId: Number(this.editCategoryId),
      taxId: this.selectedExpense.taxId || this.selectedExpense.tax?.id || 1,
      scheduledPaymentId: this.selectedExpense.scheduledPaymentId || null,
    };

    const expenseId = this.selectedExpense.id;
    this.expenseService.updateExpense(expenseId, updatedExpense).subscribe({
      next: () => {
        this.loadExpenses();
        this.messageService.add({
          severity: 'success',
          summary: 'Expense Updated',
          detail: 'Expense has been successfully updated.',
        });
        this.closeModal();
      },
      error: (error) => {
        console.error('Update error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail:
            error?.error?.message ||
            'Failed to update expense. Please try again.',
        });
      },
    });
  }

  getTotalAmount(): number {
    return this.expenses.reduce(
      (sum, expense) => sum + (Number(expense.amount) || 0),
      0,
    );
  }

  getApprovedCount(): number {
    return this.expenses.filter((e) => e.status === ExpenseStatus.APPROVED)
      .length;
  }

  getApprovedAmount(): number {
    return this.expenses
      .filter((e) => e.status === ExpenseStatus.APPROVED)
      .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  }

  getPendingCount(): number {
    return this.expenses.filter((e) => e.status === ExpenseStatus.PENDING)
      .length;
  }

  getPendingAmount(): number {
    return this.expenses
      .filter((e) => e.status === ExpenseStatus.PENDING)
      .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  }

  getRejectedCount(): number {
    return this.expenses.filter((e) => e.status === ExpenseStatus.REJECTED)
      .length;
  }

  getRejectedAmount(): number {
    return this.expenses
      .filter((e) => e.status === ExpenseStatus.REJECTED)
      .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  }


  private buildUpdatePayload(expense: Expense, newStatus: ExpenseStatus): any {
    const merchantId = expense.merchantId || expense.merchant?.id;
    const categoryId = expense.categoryId || expense.category?.id;
    const taxId = expense.taxId || (expense.tax as TaxDTO)?.id || 1;


    let eventDate = expense.eventDate;
    if (Array.isArray(eventDate)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] =
        eventDate as any;
      eventDate = new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        second,
      ).toISOString();
    }

    return {
      name: expense.name || '',
      description: expense.description || '',
      eventDate: eventDate || new Date().toISOString(),
      quantity: expense.quantity || 1,
      currency: expense.currency,
      amount: Number(expense.amount) || 0,
      status: newStatus, 
      paidBy:
        typeof expense.paidBy === 'string'
          ? expense.paidBy
          : String(expense.paidBy),
      receiptReference: expense.receiptReference || '',
      merchantId: Number(merchantId),
      categoryId: Number(categoryId),
      taxId: Number(taxId),
      scheduledPaymentId: expense.scheduledPaymentId || null,
    };
  }

  approve(request: Expense): void {
    const merchantId = request.merchantId || request.merchant?.id;
    const categoryId = request.categoryId || request.category?.id;

    if (!merchantId || !categoryId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Approve',
        detail:
          'This expense is missing a Merchant or Category. Please edit it first.',
      });
      return;
    }

    const payload = this.buildUpdatePayload(request, ExpenseStatus.APPROVED);
    console.log(' Approve payload:', JSON.stringify(payload, null, 2));

    this.expenseService.updateExpense(request.id, payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Request Approved',
          detail: `Expense for ${request.merchant?.name ?? ''} has been approved.`,
        });
        this.loadExpenses();

        // If detail modal is open, refresh the selected expense so the badge updates
        if (this.isModalOpen2 && this.selectedExpense?.id === request.id) {
          this.selectedExpense = {
            ...this.selectedExpense,
            status: ExpenseStatus.APPROVED,
          };
        }
      },
      error: (error) => {
        console.error('❌ Approve error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Approval Failed',
          detail:
            error?.error?.message ||
            'Failed to approve expense. Please try again.',
        });
      },
    });
  }

  reject(request: Expense): void {
    const merchantId = request.merchantId || request.merchant?.id;
    const categoryId = request.categoryId || request.category?.id;

    if (!merchantId || !categoryId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Reject',
        detail:
          'This expense is missing a Merchant or Category. Please edit it first.',
      });
      return;
    }

    const payload = this.buildUpdatePayload(request, ExpenseStatus.REJECTED);
    console.log('❌ Reject payload:', JSON.stringify(payload, null, 2));

    this.expenseService.updateExpense(request.id, payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Request Rejected',
          detail: `Expense for ${request.merchant?.name ?? ''} has been rejected.`,
        });
        this.loadExpenses();

        // If detail modal is open, refresh the selected expense so the badge updates
        if (this.isModalOpen2 && this.selectedExpense?.id === request.id) {
          this.selectedExpense = {
            ...this.selectedExpense,
            status: ExpenseStatus.REJECTED,
          };
        }
      },
      error: (error) => {
        console.error('❌ Reject error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Rejection Failed',
          detail:
            error?.error?.message ||
            'Failed to reject expense. Please try again.',
        });
      },
    });
  }

  bulkApprove(): void {
    if (!this.selectedExpenses.length) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Expenses Selected',
        detail: 'Please select at least one expense.',
      });
      return;
    }
    this.selectedExpenses.forEach((exp) => this.approve(exp));
    this.selectedExpenses = [];
  }

  bulkReject(): void {
    if (!this.selectedExpenses.length) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Expenses Selected',
        detail: 'Please select at least one expense.',
      });
      return;
    }
    this.selectedExpenses.forEach((exp) => this.reject(exp));
    this.selectedExpenses = [];
  }

  calculateDisplayAmount(expense: Expense): number {
    const baseAmount = Number(expense.amount);
    const taxRate =
      expense.tax && typeof expense.tax === 'object'
        ? expense.tax.rate / 100
        : typeof expense.tax === 'number'
          ? expense.tax / 100
          : 0;
    return baseAmount * (1 + taxRate);
  }

  getTaxRateDisplayValue(
    taxPercentage: TaxDTO | number | undefined,
  ): number | undefined {
    if (taxPercentage === undefined || taxPercentage === null) return undefined;
    return typeof taxPercentage === 'object'
      ? taxPercentage.rate
      : taxPercentage;
  }

  formatAmount(value: number | string | null | undefined): string {
    const n = Number(value);
    return !isNaN(n) && value !== null && value !== undefined
      ? n.toLocaleString()
      : '';
  }

  updateEditAmount(event: any): void {
    if (this.selectedExpense) {
      const raw = (event.target.value || '').toString().replace(/,/g, '');
      const num = Number(raw);
      this.selectedExpense.amount = !isNaN(num) ? num : 0;
    }
  }

  onlyNumbers(event: KeyboardEvent): void {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
    ];
    if (
      allowedKeys.includes(event.key) ||
      (event.ctrlKey && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase()))
    )
      return;
    if (!/[0-9]/.test(event.key)) event.preventDefault();
  }

  hasTaxPercentage(expense: Expense | null): boolean {
    return !!expense && (expense as any).taxPercentage !== undefined;
  }

  getTaxPercentage(expense: Expense | null): number | undefined {
    return expense ? (expense as any).taxPercentage : undefined;
  }

  getExpenseDate(expense: Expense | null): string | Date | undefined {
    return expense ? (expense as any).data : undefined;
  }

  onTaxInputChange(event: Event): void {
    if (!this.selectedExpense) return;
    const input = event.target as HTMLInputElement;
    this.selectedExpense.tax = {
      id: this.selectedExpense.tax?.id || 0,
      name: 'Custom',
      rate: parseFloat(input.value) || 0,
      description: 'Custom tax rate',
    };
  }

  onDateInputChange(event: Event): void {
    if (!this.selectedExpense) return;
    this.selectedExpense.eventDate = (event.target as HTMLInputElement).value;
  }

  openReceiptModal(url: string, title: string): void {
    if (!url) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Receipt',
        detail: 'Receipt URL is not available.',
      });
      return;
    }
    console.log('Opening receipt modal:', { url, title });
    this.receiptModalUrl = url;
    this.receiptModalTitle = title;
    this.receiptImageLoading = true;
    this.receiptImageError = '';
    this.showReceiptModal = true;
  }

  /** Closes receipt modal */
  closeReceiptModal(): void {
    this.showReceiptModal = false;
    this.receiptModalUrl = '';
    this.receiptModalTitle = '';
    this.receiptImageLoading = false;
    this.receiptImageError = '';
  }

  
  onReceiptImageLoad(): void {
    this.receiptImageLoading = false;
    console.log('Receipt image loaded successfully');
  }

  /** Handle image load error — show a download link as fallback */
  onReceiptImageError(event: any): void {
    this.receiptImageLoading = false;
    this.receiptImageError =
      'The receipt image could not be loaded. It may require authentication or be a PDF. Use "Open in New Tab" to view it.';
    console.error('Receipt image load error. URL was:', this.receiptModalUrl);
  }

  onReceiptThumbnailError(event: any, type: 'company' | 'employee'): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
    }
    console.warn(
      `Receipt thumbnail failed to load (${type}). URL may need auth or be a non-image file.`,
    );
  }

  private convertToWebUrl(path: string): string {
    if (!path) return '';

    // Already a full URL — return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // Strip the server-side filesystem prefix
    let cleanPath = path.replace(/^\/opt\/optimax/, '');

    // Ensure the path starts with /
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }

    return `https://be.optimaxsuites.com${cleanPath}`;
  }

  formatEventDate(eventDate: any): string | Date {
    if (!eventDate) return '';

    if (typeof eventDate === 'string' || eventDate instanceof Date) {
      return eventDate;
    }

    if (Array.isArray(eventDate)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = eventDate;
      return new Date(year, month - 1, day, hour, minute, second);
    }

    return eventDate;
  }

  formatEventDateForInput(eventDate: any): string {
    if (!eventDate) return '';

    const date = this.formatEventDate(eventDate);

    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    if (typeof date === 'string') {
      return date.split('T')[0];
    }

    return '';
  }
}

import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { v4 as uuidV4 } from "uuid";


import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { FileUploadModule } from 'primeng/fileupload';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService, MessageService } from 'primeng/api';

import { MatIconModule } from '@angular/material/icon';

import { debounceTime, Subject, takeUntil } from 'rxjs';

import {
  ExpenseService,
  Expense,
  ExpenseStatus,
  MerchantDTO,
  CategoryDTO,
  TaxDTO,
  PaidBy,
  Currency
} from '../../service/expense.service';

import { EmailService } from '../../sharedComponent/service/email.service';
import { SideModalComponent } from '../../sharedComponent/view/side-modal/side-modal.component';
import { ExpenseImportService, ParsedExpenseRow, ImportResult } from '../../service/expense-import.service';

@Component({
  selector: 'app-expense-table',
  templateUrl: './expense-table.component.html',
  styleUrls: ['./expense-table.component.scss'],
  standalone: true,
  providers: [ConfirmationService, MessageService],
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
    DialogModule,
    DropdownModule,
    FileUploadModule,
    InputTextareaModule,
    ProgressSpinnerModule,
    SkeletonModule,
  ],
})
export class ExpenseTableComponent implements OnInit, OnDestroy {
  [x: string]: any;

  // Data
  expenses: Expense[] = [];
  filteredExpenses: Expense[] = [];
  selectedExpenses: Expense[] = [];
  selectedExpense: Expense | null = null;

  // FIX #1: Loading state guards stat cards and table from showing NaN/empty before data arrives
  isLoading = true;

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // Search
  searchTerm: string = '';
  private searchTermSubject: Subject<string> = new Subject();

  // Track selected IDs for the edit form dropdowns
  editMerchantId: number | null = null;
  editCategoryId: number | null = null;

  // Modals
  isModalOpen: boolean = false;
  isModalOpen2: boolean = false;
  showReceiptModal: boolean = false;
  isEditMode = false;

  // Extra actions
  viewAllUsers = false;
  showImportModal = false;

  // Receipt modal properties
  receiptModalUrl: string = '';
  receiptModalTitle: string = '';
  receiptImageLoading: boolean = false;
  receiptImageError: string = '';
  receiptImageUrl: SafeUrl | null = null;
  receiptBlobUrl: string | null = null;

  // Receipt preview blob URLs for the detail view modal
  companyReceiptUrl: string | null = null;
  employeeReceiptUrl: string | null = null;
  companyReceiptLoading: boolean = false;
  employeeReceiptLoading: boolean = false;

  // Forms
  expenseForm!: FormGroup;

  // Filters
  dropdownOpen = {
    category: false,
    status: false,
    dateRange: false,
  };

  selectedCategory: string | null = null;
  selectedStatus: ExpenseStatus | 'ALL' = 'ALL';

  dateRangeType: string | null = null;
  dateFrom: string | null = null;
  dateTo: string | null = null;

  // Dropdown data
  categoryNames: string[] = [];
  categories: CategoryDTO[] = [];
  merchants: MerchantDTO[] = [];
  taxes: TaxDTO[] = [];

  // Enums for template
  ExpenseStatus = ExpenseStatus;
  PaidBy = PaidBy;
  Currency = Currency;

  // Actions menu
  activeMenuExpenseId: number | null = null;

  statuses = Object.values(ExpenseStatus);

  colorClasses: string[] = [
    'color-lightblue', 'color-lightgreen', 'color-lightyellow',
    'color-lightcoral', 'color-lightpink',
  ];

  // FIX #8: Rejection reason captured in component state, not via browser prompt()
  rejectionReason: string = '';
  showRejectionDialog = false;
  pendingRejectRequest: Expense | null = null;

  // --- Import Modal Fields ---
  importDragging = false;
  importFile: File | null = null;
  importLoading = false;
  importProgress = 0;
  importResult: ImportResult | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private expenseService: ExpenseService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
    private emailService: EmailService,
    private importService: ExpenseImportService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadExpenses();
    this.loadCategories();
    this.loadMerchants();
    this.loadTaxes();

    this.searchTermSubject.pipe(debounceTime(300), takeUntil(this.destroy$)).subscribe(() => {
      this.applyFilters();
    });

    this.expenseService.expensesUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadExpenses());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.receiptBlobUrl) URL.revokeObjectURL(this.receiptBlobUrl);
    if (this.companyReceiptUrl) URL.revokeObjectURL(this.companyReceiptUrl);
    if (this.employeeReceiptUrl) URL.revokeObjectURL(this.employeeReceiptUrl);
  }

  initForm(): void {
    this.expenseForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      eventDate: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      currency: [Currency.NGN, Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      paidBy: [PaidBy.COMPANY, Validators.required],
      receiptReference: [''],
      merchantId: [null, Validators.required],
      categoryId: [null, Validators.required],
      taxId: [null],
      scheduledPaymentId: [null],
      companyReceiptFile: [null],
      expenseReceiptFile: [null]
    });
  }

  loadExpenses(): void {
    // FIX #1: Set loading true before fetch so skeleton shows
    this.isLoading = true;

    const source$ = (this.selectedStatus && this.selectedStatus !== 'ALL')
      ? this.expenseService.getExpensesByStatus(this.selectedStatus as ExpenseStatus)
      : (this.viewAllUsers ? this.expenseService.getAllExpenses() : this.expenseService.getExpenses());

    source$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (expenses) => {
        this.expenses = expenses.sort((a, b) => b.id - a.id);
        this.totalElements = expenses.length;
        this.totalPages = Math.ceil(expenses.length / this.pageSize);
        this.applyFilters();
        // FIX #1: Turn off loading only after data is set
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading expenses:', error);
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load expenses' });
      }
    });
  }

  private loadCategories(): void {
    this.expenseService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.categoryNames = categories.map((c) => c.name);
      },
      error: (err) => { console.error('Error loading categories:', err); this.categories = []; }
    });
  }

  private loadMerchants(): void {
    this.expenseService.getMerchants().subscribe({
      next: (merchants) => { this.merchants = merchants; },
      error: (err) => { console.error('Error loading merchants:', err); this.merchants = []; }
    });
  }

  private loadTaxes(): void {
    this.expenseService.getTaxRates().subscribe({
      next: (taxes) => { this.taxes = taxes; },
      error: (err) => { console.error('Error loading taxes:', err); this.taxes = []; }
    });
  }

  toggleViewAll(): void {
    this.viewAllUsers = !this.viewAllUsers;
    this.loadExpenses();
  }

  openImportModal(): void {
    this.showImportModal = true;
    this.importFile = null;
    this.importResult = null;
    this.importProgress = 0;
  }

  onImportCancelled(): void {
    this.showImportModal = false;
    this.clearImportFile();
  }

  clearImportFile(): void {
    this.importFile = null;
    this.importResult = null;
    this.importProgress = 0;
  }

  onImportDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.importDragging = true;
  }

  onImportDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.importDragging = false;
  }

  onImportDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.importDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.setImportFile(file);
  }

  onImportFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.setImportFile(input.files[0]);
  }

  private setImportFile(file: File): void {
    const validTypes = ['.csv', '.xlsx', '.xls'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(ext)) {
      this.messageService.add({ severity: 'error', summary: 'Invalid File', detail: 'Only CSV, XLSX, and XLS files are supported.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.messageService.add({ severity: 'error', summary: 'File Too Large', detail: 'File must be under 10MB.' });
      return;
    }
    this.importFile = file;
    this.importResult = null;
  }

  downloadImportTemplate(): void {
    this.importService.downloadTemplate();
  }

  async processImport(): Promise<void> {
    if (!this.importFile || this.importLoading) return;

    this.importLoading = true;
    this.importProgress = 10;
    this.importResult = null;

    try {
      const rows = await this.importService.parseFile(this.importFile);
      this.importProgress = 40;

      const result: ImportResult = { total: rows.length, success: 0, errors: 0, errorMessages: [] };

      // Validate merchants and categories from the loaded lists
      const validRows = rows.filter(row => {
        if (!row.isValid) {
          result.errors++;
          result.errorMessages.push(`Row ${row.rowNumber}: ${row.validationErrors.join(', ')}`);
          return false;
        }

        const merchant = this.merchants.find(m => m.name.toLowerCase() === row.merchant.toLowerCase());
        const category = this.categories.find(c => c.name.toLowerCase() === row.category.toLowerCase());

        if (!merchant) {
          result.errors++;
          result.errorMessages.push(`Row ${row.rowNumber}: Merchant "${row.merchant}" not found. Add it first.`);
          return false;
        }
        if (!category) {
          result.errors++;
          result.errorMessages.push(`Row ${row.rowNumber}: Category "${row.category}" not found. Add it first.`);
          return false;
        }

        // Attach resolved IDs to row
        (row as any).merchantId = merchant.id;
        (row as any).categoryId = category.id;
        return true;
      });

      this.importProgress = 60;

      // Submit valid rows one by one
      let processed = 0;
      for (const row of validRows) {
        const payload = {
          name: row.name,
          description: row.description || '',
          eventDate: new Date(row.eventDate).toISOString(),
          quantity: 1,
          currency: row.currency,
          amount: row.amount,
          status: 'PENDING',
          paidBy: row.paidBy,
          receiptReference: row.receiptReference,
          merchantId: (row as any).merchantId,
          categoryId: (row as any).categoryId,
          taxId: null,
          scheduledPaymentId: null
        };

        try {
          await this.expenseService.addExpense(payload).toPromise();
          result.success++;
        } catch (err: any) {
          result.errors++;
          result.errorMessages.push(`Row ${row.rowNumber}: API error — ${err?.message || 'Unknown error'}`);
        }

        processed++;
        this.importProgress = 60 + Math.round((processed / validRows.length) * 35);
      }

      this.importProgress = 100;
      this.importResult = result;
      this.importLoading = false;

      if (result.success > 0) {
        this.loadExpenses();
        this.messageService.add({
          severity: result.errors > 0 ? 'warn' : 'success',
          summary: 'Import Complete',
          detail: `${result.success} expense(s) imported successfully${result.errors > 0 ? `, ${result.errors} failed` : ''}.`
        });
      } else {
        this.messageService.add({ severity: 'error', summary: 'Import Failed', detail: 'No expenses could be imported. Check the error details.' });
      }

    } catch (err: any) {
      this.importLoading = false;
      this.importProgress = 0;
      this.messageService.add({ severity: 'error', summary: 'Parse Error', detail: err.message || 'Failed to read the file.' });
    }
  }

  onImportComplete(imported: any): void {
    this.showImportModal = false;
    this.messageService.add({ severity: 'success', summary: 'Import Complete', detail: 'Expenses imported successfully.' });
    this.loadExpenses();
  }

  navigateToAnalytics(): void {
    this.router.navigate([`/admin/expenses/analytics/` + uuidV4()]);
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
        if (!matchesName && !matchesAmount && !matchesMerchant && !matchesCategory && !matchesId) return false;
      }

      if (this.selectedCategory && categoryName !== this.selectedCategory) return false;

      if (this.selectedStatus && this.selectedStatus !== 'ALL' && expense.status !== this.selectedStatus) return false;

      if (this.dateFrom && this.dateTo) {
        const fromDate = new Date(this.dateFrom);
        const toDate = new Date(this.dateTo + 'T23:59:59');
        const expenseDate = new Date(expense.eventDate);
        if (expenseDate < fromDate || expenseDate > toDate) return false;
      }
      return true;
    });
  }

  applyDateRange(): void {
    if (!this.dateRangeType) { this.applyFilters(); return; }
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
        if (!this.dateFrom || !this.dateTo) { this.applyFilters(); return; }
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

  clearSearch(): void { this.searchTerm = ''; this.applyFilters(); }

  toggleDropdown(type: 'category' | 'status' | 'dateRange'): void {
    Object.keys(this.dropdownOpen).forEach((key) => {
      if (key !== type) this.dropdownOpen[key as keyof typeof this.dropdownOpen] = false;
    });
    this.dropdownOpen[type] = !this.dropdownOpen[type];
  }

  selectCategory(category: string | null): void {
    this.selectedCategory = category;
    this.dropdownOpen.category = false;
    this.applyFilters();
  }

  selectStatus(status: ExpenseStatus | 'ALL'): void {
    this.selectedStatus = status;
    this.dropdownOpen.status = false;
    this.currentPage = 0;
    this.loadExpenses();
  }

  selectDateRange(range: string | null): void {
    this.dateRangeType = range;
    this.dropdownOpen.dateRange = false;
    if (range !== 'custom') { this.dateFrom = null; this.dateTo = null; }
    this.applyDateRange();
  }

  applyCustomDateRange(): void {
    if (this.dateFrom && this.dateTo) {
      if (new Date(this.dateFrom) > new Date(this.dateTo)) {
        const temp = this.dateFrom; this.dateFrom = this.dateTo; this.dateTo = temp;
      }
      this.applyFilters();
    }
  }

  get dateRangeLabel(): string {
    if (!this.dateRangeType) return 'Date Range';
    const labels: { [key: string]: string } = {
      today: 'Today', week: 'This Week', month: 'This Month', custom: 'Custom Range',
    };
    return labels[this.dateRangeType] || 'Date Range';
  }

  onRowSelect(event: any) { this.selectedExpenses = event.value; }
  onRowUnselect(event: any) { this.selectedExpenses = event.value; }

  openCreateModal(): void {
    this.isEditMode = false;
    this.expenseForm.reset({ currency: Currency.NGN, paidBy: PaidBy.COMPANY, quantity: 1, taxId: null });
    this.isModalOpen = true;
  }

  openEditModal(expense: Expense): void {
    if (this.isApproved(expense)) {
      this.messageService.add({ severity: 'warn', summary: 'Edit Not Allowed', detail: 'Approved expenses cannot be edited.' });
      return;
    }

    this.isEditMode = true;
    this.selectedExpense = expense;
    const eventDate = this.formatEventDateForInput(expense.eventDate);

    this.expenseForm.patchValue({
      name: expense.name,
      description: expense.description,
      eventDate: eventDate,
      quantity: expense.quantity,
      currency: expense.currency,
      amount: expense.amount,
      paidBy: expense.paidBy,
      receiptReference: expense.receiptReference,
      merchantId: expense.merchantId || expense.merchant?.id,
      categoryId: expense.categoryId || expense.category?.id,
      taxId: expense.taxId || expense.tax?.id || 1,
      scheduledPaymentId: expense.scheduledPaymentId
    });

    this.editMerchantId = expense.merchantId || expense.merchant?.id || null;
    this.editCategoryId = expense.categoryId || expense.category?.id || null;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isModalOpen2 = false;
    this.selectedExpense = null;
    this.editMerchantId = null;
    this.editCategoryId = null;
    this.expenseForm.reset();
    if (this.companyReceiptUrl) { URL.revokeObjectURL(this.companyReceiptUrl); this.companyReceiptUrl = null; }
    if (this.employeeReceiptUrl) { URL.revokeObjectURL(this.employeeReceiptUrl); this.employeeReceiptUrl = null; }
  }

  viewExpenseApproval(expense: Expense): void {
    this.selectedExpense = { ...expense };
    this.selectedExpense.merchant = this.selectedExpense.merchant ?? ({ id: 0, name: '', phoneNumber: '', address: '', emailAddress: '', contactPersonName: '' } as MerchantDTO);
    this.selectedExpense.category = this.selectedExpense.category ?? ({ id: 0, name: '' } as CategoryDTO);

    this.companyReceiptUrl = null;
    this.employeeReceiptUrl = null;
    this.companyReceiptLoading = false;
    this.employeeReceiptLoading = false;

    if (this.selectedExpense.companyReceipt?.url) {
      const apiUrl = this.convertToWebUrl(this.selectedExpense.companyReceipt.url);
      this.companyReceiptLoading = true;
      this.http.get(apiUrl, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          if (this.companyReceiptUrl) URL.revokeObjectURL(this.companyReceiptUrl);
          this.companyReceiptUrl = URL.createObjectURL(blob);
          this.companyReceiptLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => { console.error('Failed to load company receipt:', err); this.companyReceiptLoading = false; this.cdr.detectChanges(); }
      });
    }

    if (this.selectedExpense.expenseReceipt?.url) {
      const apiUrl = this.convertToWebUrl(this.selectedExpense.expenseReceipt.url);
      this.employeeReceiptLoading = true;
      this.http.get(apiUrl, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          if (this.employeeReceiptUrl) URL.revokeObjectURL(this.employeeReceiptUrl);
          this.employeeReceiptUrl = URL.createObjectURL(blob);
          this.employeeReceiptLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => { console.error('Failed to load employee receipt:', err); this.employeeReceiptLoading = false; this.cdr.detectChanges(); }
      });
    }

    this.isModalOpen2 = true;
  }

  openReceiptModal(apiUrl: string, title: string): void {
    if (!apiUrl) {
      this.messageService.add({ severity: 'warn', summary: 'No Receipt', detail: 'Receipt URL is not available.' });
      return;
    }

    this.receiptModalTitle = title;
    this.receiptModalUrl = '';
    this.receiptImageLoading = true;
    this.receiptImageError = '';
    this.showReceiptModal = true;

    this.http.get(apiUrl, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        if (this.receiptBlobUrl) URL.revokeObjectURL(this.receiptBlobUrl);
        this.receiptBlobUrl = URL.createObjectURL(blob);
        this.receiptImageUrl = this.sanitizer.bypassSecurityTrustUrl(this.receiptBlobUrl);
        this.receiptModalUrl = this.receiptBlobUrl;
        this.receiptImageLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to fetch receipt:', err);
        this.receiptImageLoading = false;
        this.receiptImageError = 'The receipt could not be loaded. Use "Open in New Tab" to view it directly.';
        this.cdr.detectChanges();
      }
    });
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
    if (this.receiptBlobUrl) { URL.revokeObjectURL(this.receiptBlobUrl); this.receiptBlobUrl = null; }
    this.receiptImageUrl = null;
    this.receiptModalUrl = '';
    this.receiptModalTitle = '';
    this.receiptImageLoading = false;
    this.receiptImageError = '';
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  onSubmit(): void {
    if (this.expenseForm.invalid) {
      Object.keys(this.expenseForm.controls).forEach(key => {
        this.expenseForm.get(key)?.markAsTouched();
      });
      this.messageService.add({ severity: 'warn', summary: 'Validation Error', detail: 'Please fill in all required fields.' });
      return;
    }

    const formValue = this.expenseForm.value;
    const eventDate = new Date(formValue.eventDate).toISOString();
    const expenseData = { ...formValue, eventDate };

    if (this.isEditMode && this.selectedExpense) {
      const updatedExpense: any = {
        name: expenseData.name,
        description: expenseData.description,
        eventDate: expenseData.eventDate,
        quantity: expenseData.quantity,
        currency: expenseData.currency,
        amount: Number(expenseData.amount) || 0,
        status: this.selectedExpense.status,
        paidBy: expenseData.paidBy,
        receiptReference: expenseData.receiptReference || '',
        merchantId: Number(expenseData.merchantId),
        categoryId: Number(expenseData.categoryId),
        taxId: expenseData.taxId ?? null,
        scheduledPaymentId: expenseData.scheduledPaymentId || null,
      };

      this.expenseService.updateExpense(this.selectedExpense.id, updatedExpense).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Expense Updated', detail: 'Expense has been successfully updated.' });
          this.closeModal();
          this.loadExpenses();
        },
        error: (error) => {
          console.error('Update error:', error);
          this.messageService.add({ severity: 'error', summary: 'Update Failed', detail: error?.error?.message || 'Failed to update expense.' });
        }
      });
    } else {
      const companyReceipt = formValue.companyReceiptFile;
      const expenseReceipt = formValue.expenseReceiptFile;

      this.expenseService.addExpense(expenseData, companyReceipt, expenseReceipt)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Expense Created', detail: 'Expense has been successfully created.' });
            this.closeModal();
            this.loadExpenses();
          },
          error: (error) => {
            console.error('Error creating expense:', error);
            this.messageService.add({ severity: 'error', summary: 'Creation Failed', detail: error.message || 'Failed to create expense.' });
          }
        });
    }
  }

  confirmDelete(expense: Expense): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete this expense?`,
      header: `Delete Expense — ${expense.merchant?.name ?? ''}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-warning',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => this.deleteExpense(expense),
    });
  }

  deleteExpense(expense: Expense): void {
    this.expenseService.deleteExpense(expense.id).subscribe({
      next: () => {
        this.loadExpenses();
        this.messageService.add({ severity: 'success', summary: 'Expense Deleted', detail: `Expense for ${expense.merchant?.name ?? ''} has been deleted.` });
      },
      error: (error) => {
        console.error('Delete error:', error);
        this.messageService.add({ severity: 'error', summary: 'Delete Failed', detail: error.message || 'Failed to delete expense.' });
      }
    });
  }

  deleteSelectedExpenses() {
    if (!this.selectedExpenses.length) return;
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${this.selectedExpenses.length} expenses?`,
      header: `Delete Selected Expenses`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        this.selectedExpenses.forEach((exp) => this.deleteExpense(exp));
        this.selectedExpenses = [];
      }
    });
  }

  // ============================================
  // APPROVAL / REJECTION
  // ============================================

  private normalizeStatus(status: string | ExpenseStatus | null | undefined): string {
    if (!status) {
      return '';
    }
    return String(status).trim().toUpperCase();
  }

  isApproved(expense: Expense): boolean {
    return this.normalizeStatus(expense?.status) === ExpenseStatus.APPROVED;
  }

  isRejected(expense: Expense): boolean {
    return this.normalizeStatus(expense?.status) === ExpenseStatus.REJECTED;
  }

  isLocked(expense: Expense): boolean {
    return this.isApproved(expense) || this.isRejected(expense);
  }

  canApproveOrReject(expense: Expense): boolean {
    return this.normalizeStatus(expense?.status) === ExpenseStatus.PENDING;
  }

  approve(request: Expense): void {
    // FIX #3: Hard guard — prevents double-approving
    if (!this.canApproveOrReject(request)) {
      this.messageService.add({ severity: 'warn', summary: 'Already Actioned', detail: 'This expense has already been approved or rejected.' });
      return;
    }

    const merchantId = request.merchantId || request.merchant?.id;
    const categoryId = request.categoryId || request.category?.id;

    if (!merchantId || !categoryId) {
      this.messageService.add({ severity: 'warn', summary: 'Cannot Approve', detail: 'This expense is missing a Merchant or Category. Please edit it first.' });
      return;
    }

    this.confirmationService.confirm({
      message: `Are you sure you want to approve this expense?`,
      header: `Approve Expense — ${request.merchant?.name ?? ''}`,
      icon: 'pi pi-check-circle',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      acceptLabel: 'Approve',
      rejectLabel: 'Cancel',
      accept: () => {
        this.expenseService.approveExpense(request).subscribe({
          next: (updatedExpense) => {
            this.messageService.add({ severity: 'success', summary: 'Expense Approved', detail: `Expense for ${request.merchant?.name ?? ''} has been approved.` });

            // Notify submitter
            // The API returns expenseBy as a full object with email and fullname
            const submitterEmail = (request as any).expenseBy?.email;
            const submitterName  = (request as any).expenseBy?.fullname || request.name;

            if (submitterEmail) {
              console.log('[approve] ✅ Sending approval email to expense creator:', submitterEmail);
              this.emailService.sendExpenseNotification(
                submitterName,
                submitterEmail,
                `${request.name} — ${this.formatAmount(request.amount)} ${request.currency ?? 'NGN'}`,
                'APPROVED'
              ).subscribe({
                next: () => console.log('[approve] ✅ Approval email sent to:', submitterEmail),
                error: (err) => console.error('[approve] ❌ Approval email failed:', err)
              });
            } else {
              console.warn('[approve] ⚠️ No submitter email found on expense object. Keys available:', Object.keys(request));
              console.warn('[approve] Full expense object:', request);
            }

            this.loadExpenses();
            if (this.isModalOpen2 && this.selectedExpense?.id === request.id) {
              this.selectedExpense = updatedExpense;
            }
          },
          error: (error) => {
            console.error('Approve error:', error);
            this.messageService.add({ severity: 'error', summary: 'Approval Failed', detail: error?.error?.message || 'Failed to approve expense.' });
          }
        });
      }
    });
  }

  // FIX #8: Rejection dialog — no more browser prompt()
  openRejectionDialog(request: Expense): void {
    if (!this.canApproveOrReject(request)) {
      this.messageService.add({ severity: 'warn', summary: 'Already Actioned', detail: 'This expense has already been approved or rejected.' });
      return;
    }
    this.pendingRejectRequest = request;
    this.rejectionReason = '';
    this.showRejectionDialog = true;
  }

  confirmRejection(): void {
    const request = this.pendingRejectRequest;
    if (!request) return;

    const reason = this.rejectionReason.trim() || 'Rejected by manager';
    this.showRejectionDialog = false;
    this.pendingRejectRequest = null;

    this.expenseService.rejectExpense(request, reason).subscribe({
      next: (updatedExpense) => {
        this.messageService.add({ severity: 'warn', summary: 'Expense Rejected', detail: `Expense for ${request.merchant?.name ?? ''} has been rejected.` });

        // The API returns expenseBy as a full object with email and fullname
        const submitterEmail = (request as any).expenseBy?.email;
        const submitterName  = (request as any).expenseBy?.fullname || request.name;

        if (submitterEmail) {
          console.log('[reject] ✅ Sending rejection email to expense creator:', submitterEmail);
          this.emailService.sendExpenseNotification(
            submitterName,
            submitterEmail,
            `${request.name} — ${this.formatAmount(request.amount)} ${request.currency ?? 'NGN'}`,
            'REJECTED',
            reason
          ).subscribe({
            next: () => console.log('[reject] ✅ Rejection email sent to:', submitterEmail),
            error: (err) => console.error('[reject] ❌ Rejection email failed:', err)
          });
        } else {
          console.warn('[reject] ⚠️ No submitter email found. Keys available:', Object.keys(request));
          console.warn('[reject] Full expense object:', request);
        }

        this.loadExpenses();
        if (this.isModalOpen2 && this.selectedExpense?.id === request.id) {
          this.selectedExpense = updatedExpense;
        }
      },
      error: (error) => {
        console.error('Reject error:', error);
        this.messageService.add({ severity: 'error', summary: 'Rejection Failed', detail: error?.error?.message || 'Failed to reject expense.' });
      }
    });
  }

  cancelRejection(): void {
    this.showRejectionDialog = false;
    this.pendingRejectRequest = null;
    this.rejectionReason = '';
  }

  // Keep reject() as an alias for backward-compat with bulk reject
  reject(request: Expense): void {
    this.openRejectionDialog(request);
  }

  bulkApprove(): void {
    if (!this.selectedExpenses.length) {
      this.messageService.add({ severity: 'warn', summary: 'No Expenses Selected', detail: 'Please select at least one expense.' });
      return;
    }
    this.confirmationService.confirm({
      message: `Approve ${this.selectedExpenses.length} selected expenses?`,
      header: 'Bulk Approve',
      icon: 'pi pi-check-circle',
      acceptButtonStyleClass: 'p-button-success',
      acceptLabel: 'Approve All',
      rejectLabel: 'Cancel',
      accept: () => {
        // FIX #3: Only attempt to approve PENDING ones
        this.selectedExpenses.filter(e => this.canApproveOrReject(e)).forEach(exp => this.approve(exp));
        this.selectedExpenses = [];
      }
    });
  }

  bulkReject(): void {
    if (!this.selectedExpenses.length) {
      this.messageService.add({ severity: 'warn', summary: 'No Expenses Selected', detail: 'Please select at least one expense.' });
      return;
    }
    this.confirmationService.confirm({
      message: `Reject ${this.selectedExpenses.length} selected expenses?`,
      header: 'Bulk Reject',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Reject All',
      rejectLabel: 'Cancel',
      accept: () => {
        this.selectedExpenses.filter(e => this.canApproveOrReject(e)).forEach(exp => this.reject(exp));
        this.selectedExpenses = [];
      }
    });
  }

  onCompanyReceiptChange(event: any): void {
    const file = event.target.files[0];
    if (file) this.expenseForm.patchValue({ companyReceiptFile: file });
  }

  onExpenseReceiptChange(event: any): void {
    const file = event.target.files[0];
    if (file) this.expenseForm.patchValue({ expenseReceiptFile: file });
  }

  onPageChange(page: number): void { this.currentPage = page; }

  get paginatedExpenses(): Expense[] {
    const start = this.currentPage * this.pageSize;
    return this.filteredExpenses.slice(start, start + this.pageSize);
  }

  nextPage(): void { if (this.currentPage < this.totalPages - 1) this.currentPage++; }
  previousPage(): void { if (this.currentPage > 0) this.currentPage--; }

  getExpenseCount(): number { return this.expenses?.length || 0; }
  getTotalAmount(): number { return this.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0); }
  getApprovedCount(): number { return this.expenses.filter(e => e.status === ExpenseStatus.APPROVED).length; }
  getApprovedAmount(): number { return this.expenses.filter(e => e.status === ExpenseStatus.APPROVED).reduce((s, e) => s + (Number(e.amount) || 0), 0); }
  getPendingCount(): number { return this.expenses.filter(e => e.status === ExpenseStatus.PENDING).length; }
  getPendingAmount(): number { return this.expenses.filter(e => e.status === ExpenseStatus.PENDING).reduce((s, e) => s + (Number(e.amount) || 0), 0); }
  getRejectedCount(): number { return this.expenses.filter(e => e.status === ExpenseStatus.REJECTED).length; }
  getRejectedAmount(): number { return this.expenses.filter(e => e.status === ExpenseStatus.REJECTED).reduce((s, e) => s + (Number(e.amount) || 0), 0); }

  // FIX #10: Table now shows base amount (consistent with detail view)
  calculateDisplayAmount(expense: Expense): number {
    return Number(expense.amount) || 0;
  }

  getTaxRateDisplayValue(taxPercentage: TaxDTO | number | undefined): number | undefined {
    if (taxPercentage === undefined || taxPercentage === null) return undefined;
    return typeof taxPercentage === 'object' ? taxPercentage.rate : taxPercentage;
  }

  formatAmount(value: number | string | null | undefined): string {
    const n = Number(value);
    return !isNaN(n) && value !== null && value !== undefined ? n.toLocaleString() : '';
  }

  generateRandomColor(): string {
    const colors = ['#ADD8E6', '#90EE90', '#FFFFE0', '#F08080', '#FFB6C1'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  navigateToexpense(): void { this.router.navigate(['/admin/expenses/expense-summary']); }
  navigateToForm(): void { this.router.navigate(['/admin/expenses/expensesForm']); }

  updateEditAmount(event: any): void {
    if (this.selectedExpense) {
      const raw = (event.target.value || '').toString().replace(/,/g, '');
      const num = Number(raw);
      this.selectedExpense.amount = !isNaN(num) ? num : 0;
    }
  }

  onlyNumbers(event: KeyboardEvent): void {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'];
    if (allowedKeys.includes(event.key) || (event.ctrlKey && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase()))) return;
    if (!/[0-9]/.test(event.key)) event.preventDefault();
  }

  onTaxInputChange(event: Event): void {
    if (!this.selectedExpense) return;
    const input = event.target as HTMLInputElement;
    this.selectedExpense.tax = { id: this.selectedExpense.tax?.id || 0, name: 'Custom', rate: parseFloat(input.value) || 0, description: 'Custom tax rate' };
  }

  onDateInputChange(event: Event): void {
    if (!this.selectedExpense) return;
    this.selectedExpense.eventDate = (event.target as HTMLInputElement).value;
  }

  onReceiptImageLoad(): void { this.receiptImageLoading = false; }

  onReceiptImageError(event: any): void {
    this.receiptImageLoading = false;
    this.receiptImageError = 'Preview unavailable for this file type. Use "Open in New Tab" to download it.';
  }

  onReceiptThumbnailError(event: any, type: 'company' | 'employee'): void {
    const img = event.target as HTMLImageElement;
    if (img) img.style.display = 'none';
  }

  private convertToWebUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const filename = path.split('/').pop();
    return `https://be.optimaxsuites.com/x/api/v2/exp/expenses/images/${filename}`;
  }

  formatEventDate(eventDate: any): string | Date {
    if (!eventDate) return '';
    if (typeof eventDate === 'string' || eventDate instanceof Date) return eventDate;
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
    if (typeof date === 'string') return date.split('T')[0];
    return '';
  }

  getStatusBadgeClass(status: ExpenseStatus): string {
    switch (status) {
      case ExpenseStatus.PENDING: return 'badge-warning';
      case ExpenseStatus.APPROVED: return 'badge-success';
      case ExpenseStatus.REJECTED: return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  editExpense(expense: Expense): void { this.openEditModal(expense); }
  saveEditedExpense(): void { this.onSubmit(); }
  get receiptApiUrl(): string { return this.receiptModalUrl; }
}
import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

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

import { SideModalComponent } from '../../sharedComponent/view/side-modal/side-modal.component';

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
    InputTextareaModule
  ],
})
export class ExpenseTableComponent implements OnInit, OnDestroy {
  [x: string]: any;
  
  // Data
  expenses: Expense[] = [];
  filteredExpenses: Expense[] = [];
  selectedExpenses: Expense[] = [];
  selectedExpense: Expense | null = null;

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
  isModalOpen: boolean = false;        // Edit/Create modal
  isModalOpen2: boolean = false;       // Detail view modal
  showReceiptModal: boolean = false;
  isEditMode = false;

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

  statuses = Object.values(ExpenseStatus);

  colorClasses: string[] = [
    'color-lightblue',
    'color-lightgreen',
    'color-lightyellow',
    'color-lightcoral',
    'color-lightpink',
  ];

  // Destroy subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private expenseService: ExpenseService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer
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

    // Subscribe to expense updates
    this.expenseService.expensesUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadExpenses());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up blob URLs
    if (this.receiptBlobUrl) {
      URL.revokeObjectURL(this.receiptBlobUrl);
    }
    if (this.companyReceiptUrl) {
      URL.revokeObjectURL(this.companyReceiptUrl);
    }
    if (this.employeeReceiptUrl) {
      URL.revokeObjectURL(this.employeeReceiptUrl);
    }
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
      taxId: [1, Validators.required],
      scheduledPaymentId: [null],
      companyReceiptFile: [null],
      expenseReceiptFile: [null]
    });
  }


  loadExpenses(): void {
    if (this.selectedStatus && this.selectedStatus !== 'ALL') {
      this.expenseService.getExpensesByStatus(this.selectedStatus as ExpenseStatus)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (expenses) => {
            this.expenses = expenses.sort((a, b) => b.id - a.id);
            this.totalElements = expenses.length;
            this.totalPages = Math.ceil(expenses.length / this.pageSize);
            this.applyFilters();
          },
          error: (error) => {
            console.error('Error loading expenses:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to load expenses'
            });
          }
        });
    } else {
      this.expenseService.getExpenses().subscribe({
        next: (expenses) => {
          this.expenses = expenses.sort((a, b) => b.id - a.id);
          this.totalElements = expenses.length;
          this.totalPages = Math.ceil(expenses.length / this.pageSize);
          this.applyFilters();
        },
        error: (error) => {
          console.error('Error loading expenses:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load expenses'
          });
        }
      });
    }
  }

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

  private loadTaxes(): void {
    this.expenseService.getTaxRates().subscribe({
      next: (taxes) => {
        this.taxes = taxes;
      },
      error: (err) => {
        console.error('Error loading taxes:', err);
        this.taxes = [];
      }
    });
  }

  onSearchInputChange(): void {
    this.searchTermSubject.next(this.searchTerm);
  }

  applyFilters(): void {
    this.filteredExpenses = this.expenses.filter((expense) => {
      const merchantName = (expense.merchant as MerchantDTO)?.name || '';
      const categoryName = (expense.category as CategoryDTO)?.name || '';
      const amountStr = Math.floor(Number(expense.amount)).toString();

      // Search term filter
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

      // Category filter
      if (this.selectedCategory && categoryName !== this.selectedCategory) {
        return false;
      }

      // Status filter
      if (this.selectedStatus && this.selectedStatus !== 'ALL' && expense.status !== this.selectedStatus) {
        return false;
      }

      // Date range filter
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

  selectStatus(status: ExpenseStatus | 'ALL'): void {
    this.selectedStatus = status;
    this.dropdownOpen.status = false;
    this.currentPage = 0;
    this.loadExpenses();
  }

  selectDateRange(range: string | null): void {
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


  onRowSelect(event: any) {
    this.selectedExpenses = event.value;
  }

  onRowUnselect(event: any) {
    this.selectedExpenses = event.value;
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.expenseForm.reset({
      currency: Currency.NGN,
      paidBy: PaidBy.COMPANY,
      quantity: 1,
      taxId: 1
    });
    this.isModalOpen = true;
  }

  openEditModal(expense: Expense): void {
    if (this.isApproved(expense)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Edit Not Allowed',
        detail: 'Approved expenses cannot be edited.',
      });
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
    
    // Set edit IDs for backward compatibility
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
    
    // Clean up receipt URLs
    if (this.companyReceiptUrl) {
      URL.revokeObjectURL(this.companyReceiptUrl);
      this.companyReceiptUrl = null;
    }
    if (this.employeeReceiptUrl) {
      URL.revokeObjectURL(this.employeeReceiptUrl);
      this.employeeReceiptUrl = null;
    }
  }
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
        error: (err) => {
          console.error('Failed to load company receipt thumbnail:', err);
          this.companyReceiptLoading = false;
          this.cdr.detectChanges();
        },
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
        error: (err) => {
          console.error('Failed to load employee receipt thumbnail:', err);
          this.employeeReceiptLoading = false;
          this.cdr.detectChanges();
        },
      });
    }

    this.isModalOpen2 = true;
  }

  openReceiptModal(apiUrl: string, title: string): void {
    if (!apiUrl) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Receipt',
        detail: 'Receipt URL is not available.',
      });
      return;
    }

    this.receiptModalTitle = title;
    this.receiptModalUrl = '';
    this.receiptImageLoading = true;
    this.receiptImageError = '';
    this.showReceiptModal = true;

    this.http.get(apiUrl, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        if (this.receiptBlobUrl) {
          URL.revokeObjectURL(this.receiptBlobUrl);
        }
        this.receiptBlobUrl = URL.createObjectURL(blob);
        this.receiptImageUrl = this.sanitizer.bypassSecurityTrustUrl(this.receiptBlobUrl);
        this.receiptModalUrl = this.receiptBlobUrl;
        this.receiptImageLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to fetch receipt:', err);
        this.receiptImageLoading = false;
        this.receiptImageError =
          'The receipt could not be loaded. Use "Open in New Tab" to view it directly.';
        this.cdr.detectChanges();
      },
    });
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
    if (this.receiptBlobUrl) {
      URL.revokeObjectURL(this.receiptBlobUrl);
      this.receiptBlobUrl = null;
    }
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
        const control = this.expenseForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields.'
      });
      return;
    }

    const formValue = this.expenseForm.value;
    
    // Convert date to ISO string
    const eventDate = new Date(formValue.eventDate).toISOString();
    
    const expenseData = {
      ...formValue,
      eventDate: eventDate
    };

    if (this.isEditMode && this.selectedExpense) {
      // Update existing expense
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
        taxId: expenseData.taxId || 1,
        scheduledPaymentId: expenseData.scheduledPaymentId || null,
      };

      this.expenseService.updateExpense(this.selectedExpense.id, updatedExpense).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Expense Updated',
            detail: 'Expense has been successfully updated.',
          });
          this.closeModal();
          this.loadExpenses();
        },
        error: (error) => {
          console.error('Update error:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Update Failed',
            detail: error?.error?.message || 'Failed to update expense. Please try again.',
          });
        },
      });
    } else {
      // Create new expense
      const companyReceipt = formValue.companyReceiptFile;
      const expenseReceipt = formValue.expenseReceiptFile;
      
      this.expenseService.addExpense(expenseData, companyReceipt, expenseReceipt)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Expense Created',
              detail: 'Expense has been successfully created.',
            });
            this.closeModal();
            this.loadExpenses();
          },
          error: (error) => {
            console.error('Error creating expense:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Creation Failed',
              detail: error.message || 'Failed to create expense. Please try again.',
            });
          }
        });
    }
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
    this.expenseService.deleteExpense(expense.id).subscribe({
      next: () => {
        this.loadExpenses();
        this.messageService.add({
          severity: 'success',
          summary: 'Expense Deleted',
          detail: `Expense for ${expense.merchant?.name ?? ''} has been successfully deleted.`,
        });
      },
      error: (error) => {
        console.error('Delete error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Failed',
          detail: error.message || 'Failed to delete expense. Please try again.',
        });
      }
    });
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

  // ============================================
  // APPROVAL/REJECTION OPERATIONS
  // ============================================

  /** Returns true if the expense is APPROVED — used to lock editing */
  isApproved(expense: Expense): boolean {
    return expense?.status === ExpenseStatus.APPROVED;
  }

  approve(request: Expense): void {
    const merchantId = request.merchantId || request.merchant?.id;
    const categoryId = request.categoryId || request.category?.id;

    if (!merchantId || !categoryId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Approve',
        detail: 'This expense is missing a Merchant or Category. Please edit it first.',
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Are you sure you want to approve this expense?`,
      header: `Approve Expense - ${request.merchant?.name ?? ''}`,
      icon: 'pi pi-check-circle',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      acceptIcon: 'pi-check',
      rejectIcon: 'pi-times',
      acceptLabel: 'Approve',
      rejectLabel: 'Cancel',
      accept: () => {
        this.expenseService.approveExpense(request).subscribe({
          next: (updatedExpense) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Request Approved',
              detail: `Expense for ${request.merchant?.name ?? ''} has been approved.`,
            });
            this.loadExpenses();

            // Refresh modal if open
            if (this.isModalOpen2 && this.selectedExpense?.id === request.id) {
              this.selectedExpense = updatedExpense;
            }
          },
          error: (error) => {
            console.error('❌ Approve error:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Approval Failed',
              detail: error?.error?.message || 'Failed to approve expense. Please try again.',
            });
          },
        });
      }
    });
  }

  reject(request: Expense): void {
    const merchantId = request.merchantId || request.merchant?.id;
    const categoryId = request.categoryId || request.category?.id;

    if (!merchantId || !categoryId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Reject',
        detail: 'This expense is missing a Merchant or Category. Please edit it first.',
      });
      return;
    }

    // Use a custom dialog with text input for reason
    this.confirmationService.confirm({
      message: 'Please provide a reason for rejection (optional):',
      header: `Reject Expense - ${request.merchant?.name ?? ''}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      acceptIcon: 'pi-times',
      rejectIcon: 'pi-undo',
      acceptLabel: 'Reject',
      rejectLabel: 'Cancel',
      accept: () => {

        const reason = prompt('Enter rejection reason:') || 'Rejected by manager';
        
        this.expenseService.rejectExpense(request, reason).subscribe({
          next: (updatedExpense) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Request Rejected',
              detail: `Expense for ${request.merchant?.name ?? ''} has been rejected.`,
            });
            this.loadExpenses();

            // Refresh modal if open
            if (this.isModalOpen2 && this.selectedExpense?.id === request.id) {
              this.selectedExpense = updatedExpense;
            }
          },
          error: (error) => {
            console.error('❌ Reject error:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Rejection Failed',
              detail: error?.error?.message || 'Failed to reject expense. Please try again.',
            });
          },
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

    this.confirmationService.confirm({
      message: `Are you sure you want to approve ${this.selectedExpenses.length} expenses?`,
      header: `Bulk Approve Expenses`,
      icon: 'pi pi-check-circle',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      acceptIcon: 'pi-check',
      rejectIcon: 'pi-times',
      acceptLabel: 'Approve All',
      rejectLabel: 'Cancel',
      accept: () => {
        this.selectedExpenses.forEach((exp) => this.approve(exp));
        this.selectedExpenses = [];
      }
    });
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

    this.confirmationService.confirm({
      message: `Are you sure you want to reject ${this.selectedExpenses.length} expenses?`,
      header: `Bulk Reject Expenses`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      acceptIcon: 'pi-times',
      rejectIcon: 'pi-undo',
      acceptLabel: 'Reject All',
      rejectLabel: 'Cancel',
      accept: () => {
        this.selectedExpenses.forEach((exp) => this.reject(exp));
        this.selectedExpenses = [];
      }
    });
  }


  onCompanyReceiptChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.expenseForm.patchValue({ companyReceiptFile: file });
    }
  }

  onExpenseReceiptChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.expenseForm.patchValue({ expenseReceiptFile: file });
    }
  }


  onPageChange(page: number): void {
    this.currentPage = page;
  }

  get paginatedExpenses(): Expense[] {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredExpenses.slice(start, end);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }


  getExpenseCount(): number {
    return this.expenses?.length || 0;
  }

  generateRandomColor(): string {
    const colors = ['#ADD8E6', '#90EE90', '#FFFFE0', '#F08080', '#FFB6C1'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  navigateToexpense(): void {
    this.router.navigate(['/admin/expenses/expense-summary']);
  }

  navigateToForm(): void {
    this.router.navigate(['/admin/expenses/expensesForm']);
  }

  getTotalAmount(): number {
    return this.expenses.reduce(
      (sum, expense) => sum + (Number(expense.amount) || 0),
      0,
    );
  }

  getApprovedCount(): number {
    return this.expenses.filter((e) => e.status === ExpenseStatus.APPROVED).length;
  }

  getApprovedAmount(): number {
    return this.expenses
      .filter((e) => e.status === ExpenseStatus.APPROVED)
      .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  }

  getPendingCount(): number {
    return this.expenses.filter((e) => e.status === ExpenseStatus.PENDING).length;
  }

  getPendingAmount(): number {
    return this.expenses
      .filter((e) => e.status === ExpenseStatus.PENDING)
      .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  }

  getRejectedCount(): number {
    return this.expenses.filter((e) => e.status === ExpenseStatus.REJECTED).length;
  }

  getRejectedAmount(): number {
    return this.expenses
      .filter((e) => e.status === ExpenseStatus.REJECTED)
      .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
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

  getTaxRateDisplayValue(taxPercentage: TaxDTO | number | undefined): number | undefined {
    if (taxPercentage === undefined || taxPercentage === null) return undefined;
    return typeof taxPercentage === 'object' ? taxPercentage.rate : taxPercentage;
  }

  formatAmount(value: number | string | null | undefined): string {
    const n = Number(value);
    return !isNaN(n) && value !== null && value !== undefined ? n.toLocaleString() : '';
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

  onReceiptImageLoad(): void {
    this.receiptImageLoading = false;
  }

  onReceiptImageError(event: any): void {
    this.receiptImageLoading = false;
    this.receiptImageError =
      'Preview unavailable for this file type. Use "Open in New Tab" to download it.';
    console.error('Receipt render error. Blob URL was:', this.receiptModalUrl);
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

    const parts = path.split('/');
    const filename = parts[parts.length - 1]; // Get last part

    return `https://be.optimaxsuites.com/x/api/v2/exp/expenses/images/${filename}`;
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

  getStatusBadgeClass(status: ExpenseStatus): string {
    switch (status) {
      case ExpenseStatus.PENDING:
        return 'badge-warning';
      case ExpenseStatus.APPROVED:
        return 'badge-success';
      case ExpenseStatus.REJECTED:
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  canApproveOrReject(expense: Expense): boolean {
    return expense.status === ExpenseStatus.PENDING;
  }

  editExpense(expense: Expense): void {
    this.openEditModal(expense);
  }

  saveEditedExpense(): void {
    this.onSubmit();
  }

  get receiptApiUrl(): string {
    return this.receiptModalUrl;
  }
}
import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService, MessageService } from 'primeng/api';

import { debounceTime, Subject, takeUntil } from 'rxjs';

import {
  ExpenseService,
  Expense,
  ExpenseLineItemDTO,
  ExpenseMedia,
  ExpenseStatus,
  MerchantDTO,
  CategoryDTO,
  TaxDTO,
  UserDTO,
  PaidBy,
  Currency
} from '../../service/expense.service';
import { ReceiptCacheService } from '../../service/receipt-cache.service';

import { EmailService } from '../../sharedComponent/service/email.service';
import { SideModalComponent } from '../../sharedComponent/view/side-modal/side-modal.component';
import { ExpenseImportService, ImportResult } from '../../service/expense-import.service';

@Component({
  selector: 'app-expense-table',
  templateUrl: './expense-table.component.html',
  styleUrls: ['./expense-table.component.scss'],
  standalone: true,
  providers: [ConfirmationService, MessageService],
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    TableModule, ButtonModule, ConfirmDialogModule, ToastModule,
    InputTextModule, InputNumberModule, TooltipModule, SideModalComponent,
    DialogModule, DropdownModule, FileUploadModule,
    InputTextareaModule, ProgressSpinnerModule, SkeletonModule,
  ],
})
export class ExpenseTableComponent implements OnInit, OnDestroy {
  [x: string]: any;

  // ─── Data ────────────────────────────────────────────────────────────────
  expenses:         Expense[] = [];
  filteredExpenses: Expense[] = [];
  selectedExpenses: Expense[] = [];
  selectedExpense:  Expense | null = null;
  isLoading = true;

  // All expenses from API (unfiltered by ownership) — used for "All Employees" view
  private allExpensesFromApi: Expense[] = [];

  // Pagination
  currentPage   = 0;
  pageSize      = 10;
  totalElements = 0;
  totalPages    = 0;

  // Search
  searchTerm = '';
  private searchTermSubject = new Subject<string>();

  editMerchantId: number | null = null;
  editCategoryId: number | null = null;

  // ─── Modals ───────────────────────────────────────────────────────────────
  isModalOpen      = false;
  isModalOpen2     = false;
  showReceiptModal = false;
  isEditMode       = false;

  // ─── Auth / role state ────────────────────────────────────────────────────
  canViewAll    = false;
  currentUserId: number | null = null;


  viewAllUsers = false;

  showImportModal = false;

  // ─── Receipt display ──────────────────────────────────────────────────────
  receiptModalUrl     = '';
  receiptModalTitle   = '';
  receiptImageLoading = false;
  receiptImageError   = '';
  receiptImageUrl: SafeUrl | null = null;
  receiptBlobUrl: string | null = null;

  companyReceiptUrls:  string[] = [];
  employeeReceiptUrls: string[] = [];
  companyReceiptIndex   = 0;
  employeeReceiptIndex  = 0;
  companyReceiptLoading  = false;
  employeeReceiptLoading = false;

  // Single-URL aliases kept for template backward-compat
  get companyReceiptUrl():  string | null { return this.companyReceiptUrls[this.companyReceiptIndex]  ?? null; }
  get employeeReceiptUrl(): string | null { return this.employeeReceiptUrls[this.employeeReceiptIndex] ?? null; }

  // ─── Forms ────────────────────────────────────────────────────────────────
  expenseForm!: FormGroup;

  // ─── Filters ──────────────────────────────────────────────────────────────
  dropdownOpen   = { category: false, status: false, dateRange: false };
  selectedCategory: string | null          = null;
  selectedStatus:   ExpenseStatus | 'ALL'  = 'ALL';
  dateRangeType:    string | null          = null;
  dateFrom:         string | null          = null;
  dateTo:           string | null          = null;

  // ─── Lookup data ──────────────────────────────────────────────────────────
  categoryNames: string[]      = [];
  categories:    CategoryDTO[] = [];
  merchants:     MerchantDTO[] = [];
  taxes:         TaxDTO[]      = [];

  // ─── User cache ────────────────────────────────────────────────────────────
  private userCache: Map<number, UserDTO> = new Map();

  ExpenseStatus = ExpenseStatus;
  PaidBy        = PaidBy;
  Currency      = Currency;

  activeMenuExpenseId: number | null = null;
  statuses    = Object.values(ExpenseStatus);
  colorClasses = ['color-lightblue', 'color-lightgreen', 'color-lightyellow', 'color-lightcoral', 'color-lightpink'];

  rejectionReason     = '';
  showRejectionDialog = false;
  pendingRejectRequest: Expense | null = null;

  // ─── Import ───────────────────────────────────────────────────────────────
  importDragging = false;
  importFile:    File | null     = null;
  importLoading  = false;
  importProgress = 0;
  importResult:  ImportResult | null = null;

  // ─── Per-row loading sets ─────────────────────────────────────────────────
  approvingIds = new Set<number>();
  rejectingIds = new Set<number>();
  deletingIds  = new Set<number>();

  // ─── Tax map ──────────────────────────────────────────────────────────────
  taxMap: Record<number, TaxDTO> = {};

  private destroy$ = new Subject<void>();

  constructor(
    private router:              Router,
    private expenseService:      ExpenseService,
    private receiptCache:        ReceiptCacheService,
    private confirmationService: ConfirmationService,
    private messageService:      MessageService,
    private cdr:                 ChangeDetectorRef,
    private http:                HttpClient,
    private fb:                  FormBuilder,
    private sanitizer:           DomSanitizer,
    private emailService:        EmailService,
    private importService:       ExpenseImportService
  ) {
    this.initForm();
  }

  async ngOnInit(): Promise<void> {
    this.resolveCanViewAll();
    await this.expenseService.waitForToken();
    this.resolveCanViewAll();

    this.loadExpenses();
    this.loadCategories();
    this.loadMerchants();
    this.loadTaxes();

    this.searchTermSubject
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());

    this.expenseService.expensesUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadExpenses());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.receiptBlobUrl) URL.revokeObjectURL(this.receiptBlobUrl);
    this._revokeAllReceiptUrls();
  }

  private _revokeAllReceiptUrls(): void {
    [...this.companyReceiptUrls, ...this.employeeReceiptUrls]
      .filter(Boolean).forEach(u => URL.revokeObjectURL(u));
    this.companyReceiptUrls   = [];
    this.employeeReceiptUrls  = [];
    this.companyReceiptIndex  = 0;
    this.employeeReceiptIndex = 0;
  }

  // ─── Receipt navigation ────────────────────────────────────────────────────
  nextCompanyReceipt():  void { if (this.companyReceiptIndex  < this.companyReceiptUrls.length  - 1) this.companyReceiptIndex++; }
  prevCompanyReceipt():  void { if (this.companyReceiptIndex  > 0) this.companyReceiptIndex--; }
  nextEmployeeReceipt(): void { if (this.employeeReceiptIndex < this.employeeReceiptUrls.length - 1) this.employeeReceiptIndex++; }
  prevEmployeeReceipt(): void { if (this.employeeReceiptIndex > 0) this.employeeReceiptIndex--; }

  // ─────────────────────────────────────────────────────────────────────────
  // toggleViewAll
  //
  // Flips between "My Expenses" and "All Employees" views.
  // When switching to "All Employees", loads the global endpoint and shows everything.
  // When switching to "My Expenses", loads scoped endpoint and filters system entries.
  // This is now available to everyone (no role gating in the toggle behavior).
  // ─────────────────────────────────────────────────────────────────────────
  toggleViewAll(): void {
    if (!this.canViewAll) {
      this.viewAllUsers = false;
      return;
    }
    this.viewAllUsers = !this.viewAllUsers;
    this.loadExpenses();
  }

  // ─── Role resolution ──────────────────────────────────────────────────────
  private resolveCanViewAll(): void {
    try {
      const primaryRaw =
        sessionStorage.getItem('userPrimaryInfoRegData') ||
        localStorage.getItem('userPrimaryInfoRegData');
      const primary = primaryRaw ? JSON.parse(primaryRaw) : null;

      const regRaw =
        sessionStorage.getItem('userRegData') ||
        localStorage.getItem('userRegData');
      const reg = regRaw ? JSON.parse(regRaw) : null;

      const storedIdStr =
        sessionStorage.getItem('userid') ||
        localStorage.getItem('userid');
      const storedId = storedIdStr ? Number(storedIdStr) : null;

      this.currentUserId =
        (primary?.user?.id && typeof primary.user.id === 'number') ? primary.user.id :
        (reg?.id           && typeof reg.id           === 'number') ? reg.id          :
        (storedId && !isNaN(storedId) && storedId > 0)             ? storedId        : null;

      const flatRole = (sessionStorage.getItem('role') || localStorage.getItem('role') || '')
        .toUpperCase().trim();

      const primaryRoles: string[] = (primary?.user?.roles || [])
        .map((r: any) => typeof r === 'string' ? r.toUpperCase() : (r?.name || '').toUpperCase())
        .filter(Boolean);

      const regRoles: string[] = (reg?.roles || [])
        .map((r: any) => typeof r === 'string' ? r.toUpperCase() : (r?.name || '').toUpperCase())
        .filter(Boolean);

      const allRoles = [flatRole, ...primaryRoles, ...regRoles].filter(Boolean);
      const adminRoleSet = new Set([
        'ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_HR', 'ROLE_FINANCE', 'ADMIN', 'MANAGER'
      ]);
      this.canViewAll = allRoles.some(r => adminRoleSet.has(r));
      if (!this.canViewAll) {
        this.viewAllUsers = false;
      }

      console.log(`[resolveCanViewAll] userId=${this.currentUserId} canViewAll=${this.canViewAll} roles=`, allRoles);
    } catch (e) {
      console.error('[resolveCanViewAll] Error:', e);
      this.canViewAll    = false;
      this.currentUserId = null;
    }
  }

  private resolveCurrentUserDetails(): { fullname: string; email: string } {
    try {
      const primaryRaw =
        sessionStorage.getItem('userPrimaryInfoRegData') ||
        localStorage.getItem('userPrimaryInfoRegData');
      const primary = primaryRaw ? JSON.parse(primaryRaw) : null;
      return {
        fullname: primary?.fullname || primary?.name ||
          sessionStorage.getItem('username') || localStorage.getItem('username') || 'Admin',
        email: primary?.email ||
          sessionStorage.getItem('email') || localStorage.getItem('email') || ''
      };
    } catch { return { fullname: 'Admin', email: '' }; }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // isSystemEntry — true when expenseBy is null/empty (system-created entries)
  // ─────────────────────────────────────────────────────────────────────────
  private isSystemEntry(e: Expense): boolean {
    // Engr Damilola worked on this: do not hide legacy expense rows just because expenseBy is partially populated.
    const eb = e.expenseBy;
    if (eb === null || eb === undefined) return false;
    if (typeof eb === 'number') return eb <= 0;
    if (typeof eb === 'string') return !!eb.trim() && Number(eb) <= 0;
    if (typeof eb === 'object') {
      const hasId     = typeof (eb as any).id     === 'number' && (eb as any).id     > 0;
      const hasUserId = typeof (eb as any).userId === 'number' && (eb as any).userId > 0;
      return false;
    }
    return false;
  }

  private resolveExpenseOwnerId(expense: Expense): number | null {
    const explicitId = Number((expense as any).expenseById);
    if (!isNaN(explicitId) && explicitId > 0) return explicitId;

    const expenseBy = expense.expenseBy as any;
    if (typeof expenseBy === 'number' && expenseBy > 0) return expenseBy;
    if (typeof expenseBy === 'string') {
      const parsed = Number(expenseBy);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (expenseBy && typeof expenseBy === 'object') {
      const userId = Number(expenseBy.userId ?? expenseBy.id);
      if (!isNaN(userId) && userId > 0) return userId;
    }

    return null;
  }

  private isOwnExpense(expense: Expense): boolean {
    return !!this.currentUserId && this.resolveExpenseOwnerId(expense) === this.currentUserId;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // getExpenseCreatorName — resolves creator's name from expense object
  //
  // The backend is inconsistent: some expenses have expenseBy populated with
  // full user objects, others have expenseBy: null. For null cases, we show
  // "System" since these are likely imported or system-generated expenses.
  // ─────────────────────────────────────────────────────────────────────────
  getExpenseCreatorName(expense: Expense): string {
    // If expenseBy is null, this is likely a system-generated or imported expense
    if (expense.expenseBy === null) {
      console.log(`[getExpenseCreatorName] expense.id=${expense.id} has null expenseBy - showing as System`);
      return 'System';
    }

    // Check if expenseBy is a full UserDTO object
    if (expense.expenseBy && typeof expense.expenseBy === 'object') {
      const eb = expense.expenseBy as any;
      
      if (typeof eb.fullname === 'string' && eb.fullname.trim()) {
        return eb.fullname;
      }
      if (typeof eb.name === 'string' && eb.name.trim()) {
        return eb.name;
      }
      if (typeof eb.username === 'string' && eb.username.trim()) {
        return eb.username;
      }
    }

    // Fallback: expenseBy still a number (shouldn't happen after enrichment, but just in case)
    if (typeof expense.expenseBy === 'number' && expense.expenseBy > 0) {
      return `User #${expense.expenseBy}`;
    }

    // Check alternative fields for creator info (though from logs, these are undefined)
    const alternatives = ['createdBy', 'submittedBy', 'creator', 'author'];
    for (const field of alternatives) {
      const value = (expense as any)[field];
      if (value) {
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
        if (typeof value === 'object') {
          const name = value.fullname || value.name || value.username;
          if (typeof name === 'string' && name.trim()) return name;
        }
      }
    }

    // Ultimate fallback
    return 'Unknown';
  }

  getApprovedByName(expense: Expense): string {
    const approvedBy = (expense as any).approvedBy;
    if (!approvedBy) return '—';
    if (typeof approvedBy === 'object') {
      return approvedBy.fullname || approvedBy.name || approvedBy.username || '—';
    }
    if (typeof approvedBy === 'number' && approvedBy > 0) {
      return `User #${approvedBy}`;
    }
    return '—';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // enrichExpensesWithUserData — Convert numeric user IDs to placeholder UserDTOs
  //
  // If expenseBy is just a number (user ID), this creates a user placeholder
  // object so the template can display something meaningful instead of just "Unknown".
  // ─────────────────────────────────────────────────────────────────────────
  private enrichExpensesWithUserData(expenses: Expense[]): void {
    const needsEnrichment = expenses.filter(e => {
      if (!e.expenseBy) return false;
      if (typeof e.expenseBy === 'number') return true;
      if (typeof e.expenseBy === 'string') {
        const num = Number(e.expenseBy);
        return !isNaN(num) && num > 0;
      }
      return false;
    });

    if (!needsEnrichment.length) {
      return;
    }

    // Collect unique user IDs and create placeholders
    const processedIds = new Set<number>();
    needsEnrichment.forEach(e => {
      const userId = typeof e.expenseBy === 'number' ? e.expenseBy : Number(e.expenseBy as string);
      if (!isNaN(userId) && userId > 0 && !processedIds.has(userId)) {
        processedIds.add(userId);
        
        // Create a placeholder UserDTO for this ID if not cached
        if (!this.userCache.has(userId)) {
          const placeholder: UserDTO = {
            id: userId,
            userId: userId,
            fullname: `User #${userId}`,
            username: `user_${userId}`,
            email: '',
            phoneNumber: '',
            clientType: '',
            gender: '',
            accountId: '',
            address: '',
            city: '',
            state: '',
            country: ''
          };
          this.userCache.set(userId, placeholder);
        }
      }
    });

    // Apply cached placeholders to all expenses
    expenses.forEach(e => {
      if (typeof e.expenseBy === 'number' && this.userCache.has(e.expenseBy)) {
        e.expenseBy = this.userCache.get(e.expenseBy);
      } else if (typeof e.expenseBy === 'string') {
        const userId = Number(e.expenseBy);
        if (!isNaN(userId) && this.userCache.has(userId)) {
          e.expenseBy = this.userCache.get(userId) || e.expenseBy;
        }
      }
    });
  }
  private _applyOwnershipFilter(expenses: Expense[]): void {
    let filtered: Expense[];

    if (this.viewAllUsers && this.canViewAll) {
      // All users mode: show everything from the requested endpoint
      filtered = expenses;
      console.log('[_applyOwnershipFilter] All Employees mode → showing all', filtered.length);
    } else {
      // My Expenses — show only rows submitted by the current user.
      // If user context is missing, fall back to hiding system rows only.
      filtered = this.currentUserId
        ? expenses.filter(e => this.resolveExpenseOwnerId(e) === this.currentUserId)
        : expenses.filter(e => !this.isSystemEntry(e));
      console.log('[_applyOwnershipFilter] My Expenses mode → showing', filtered.length,
        '| currentUserId:', this.currentUserId);
    }

    // FIX: Enrich expenses with full user data if expenseBy is just an ID
    this.enrichExpensesWithUserData(filtered);

    this.expenses      = filtered.sort((a, b) => b.id - a.id);
    this.totalElements = this.expenses.length;
    this.totalPages    = Math.ceil(this.expenses.length / this.pageSize);
    this.applyFilters();
    this.cdr.detectChanges();
  }

  loadExpenses(): void {
    this.isLoading = true;
    if (!this.canViewAll) {
      this.viewAllUsers = false;
    }

    const expenseLoader = (this.viewAllUsers && this.canViewAll)
      ? this.expenseService.getAllExpenses()
      : this.expenseService.getExpenses();

    expenseLoader
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (expenses) => {
          console.log('[loadExpenses] API returned', expenses.length,
            '| viewAllUsers:', this.viewAllUsers, '| canViewAll:', this.canViewAll);

          // Cache the raw API result so toggleViewAll() can switch without re-fetching
          this.allExpensesFromApi = expenses;

          this._applyOwnershipFilter(expenses);
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[loadExpenses] Error:', err);
          this.isLoading = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load expenses' });
        }
      });
  }

  private loadCategories(): void {
    this.expenseService.getCategories().subscribe({
      next: (c) => { this.categories = c; this.categoryNames = c.map(x => x.name); },
      error: (err) => { console.error(err); this.categories = []; }
    });
  }

  private loadMerchants(): void {
    this.expenseService.getMerchants().subscribe({
      next: (m) => { this.merchants = m; },
      error: (err) => { console.error(err); this.merchants = []; }
    });
  }

  private loadTaxes(): void {
    this.expenseService.getTaxRates().subscribe({
      next: (t) => {
        this.taxes  = t;
        this.taxMap = t.reduce((acc, tax) => ({ ...acc, [tax.id]: tax }), {} as Record<number, TaxDTO>);
      },
      error: (err) => { console.error(err); this.taxes = []; }
    });
  }

  filterByStatus(status: ExpenseStatus | 'ALL'): void {
    this.selectedStatus = status;
    this.currentPage    = 0;
    this.applyFilters();
  }

  isActiveStatusFilter(status: ExpenseStatus | 'ALL'): boolean { return this.selectedStatus === status; }

  // ─────────────────────────────────────────────────────────────────────────
  // viewExpenseApproval
  //
  // FIX: Properly handles receipt URLs from API response and cache.
  // Converts relative paths to absolute URLs for both single receipts
  // and receipt arrays.
  // ─────────────────────────────────────────────────────────────────────────
  viewExpenseApproval(expense: Expense): void {
    this._revokeAllReceiptUrls();
    this.companyReceiptLoading  = false;
    this.employeeReceiptLoading = false;
    this.selectedExpense = { ...expense };
    this.isModalOpen2    = true;

    this.expenseService.getExpenseById(expense.id).subscribe({
      next: (full: Expense) => {
        full.merchant = full.merchant ?? ({ id: 0, name: '', phoneNumber: '', address: '', emailAddress: '', contactPersonName: '' } as MerchantDTO);
        full.category = full.category ?? ({ id: 0, name: '' } as CategoryDTO);
        
        // ✨ FIX: Convert API receipts with relative paths to absolute URLs
        if (full.companyReceipt?.url && !full.companyReceipt.url.startsWith('http')) {
          console.log('[viewExpenseApproval] Converting company receipt URL:', full.companyReceipt.url);
          full.companyReceipt.url = this.buildReceiptUrl(full.companyReceipt);
        }
        if (full.companyReceipts?.length) {
          full.companyReceipts = full.companyReceipts.map(r => ({
            ...r,
            url: r.url.startsWith('http') ? r.url : this.buildReceiptUrl(r)
          }));
        }

        if (full.expenseReceipt?.url && !full.expenseReceipt.url.startsWith('http')) {
          console.log('[viewExpenseApproval] Converting employee receipt URL:', full.expenseReceipt.url);
          full.expenseReceipt.url = this.buildReceiptUrl(full.expenseReceipt);
        }
        if (full.expenseReceipts?.length) {
          full.expenseReceipts = full.expenseReceipts.map(r => ({
            ...r,
            url: r.url.startsWith('http') ? r.url : this.buildReceiptUrl(r)
          }));
        }

        // Fallback to cache if no receipts from API
        if (!full.companyReceipt && !full.companyReceipts?.length) {
          const cached = this.receiptCache.getReceiptInfo(full.id);
          if (cached?.companyReceipts?.length) {
            console.log('[viewExpenseApproval] Using cached company receipts');
            full.companyReceipts = cached.companyReceipts.map((meta) => ({
              id: 0,
              name: meta.fileName,
              url: `https://be.optimaxsuites.com/x/api/v2/exp/expenses/images/${meta.mediaNo}`,
              mediaNo: meta.mediaNo
            }));
            full.companyReceipt = full.companyReceipts[0];
          }
        }

        if (!full.expenseReceipt && !full.expenseReceipts?.length) {
          const cached = this.receiptCache.getReceiptInfo(full.id);
          if (cached?.employeeReceipts?.length) {
            console.log('[viewExpenseApproval] Using cached employee receipts');
            full.expenseReceipts = cached.employeeReceipts.map((meta) => ({
              id: 0,
              name: meta.fileName,
              url: `https://be.optimaxsuites.com/x/api/v2/exp/expenses/images/${meta.mediaNo}`,
              mediaNo: meta.mediaNo
            }));
            full.expenseReceipt = full.expenseReceipts[0];
          }
        }
        
        this.selectedExpense = full;
        this.cdr.detectChanges();
        this._loadReceiptThumbnails(full);
      },
      error: (err) => {
        console.warn('[viewExpenseApproval] Detail fetch failed, using list data:', err);
        
        // ✨ FIX: Also check cache when fetch fails
        const cachedReceipts = this.receiptCache.getReceiptInfo(expense.id);
        if (cachedReceipts?.companyReceipts?.length) {
          expense.companyReceipts = cachedReceipts.companyReceipts.map((meta) => ({
            id: 0,
            name: meta.fileName,
            url: `https://be.optimaxsuites.com/x/api/v2/exp/expenses/images/${meta.mediaNo}`,
            mediaNo: meta.mediaNo
          }));
          if (!expense.companyReceipt) expense.companyReceipt = expense.companyReceipts[0];
        }
        if (cachedReceipts?.employeeReceipts?.length) {
          expense.expenseReceipts = cachedReceipts.employeeReceipts.map((meta) => ({
            id: 0,
            name: meta.fileName,
            url: `https://be.optimaxsuites.com/x/api/v2/exp/expenses/images/${meta.mediaNo}`,
            mediaNo: meta.mediaNo
          }));
          if (!expense.expenseReceipt) expense.expenseReceipt = expense.expenseReceipts[0];
        }
        
        if (this.selectedExpense) {
          this.selectedExpense.merchant = this.selectedExpense.merchant ?? ({ id: 0, name: '', phoneNumber: '', address: '', emailAddress: '', contactPersonName: '' } as MerchantDTO);
          this.selectedExpense.category = this.selectedExpense.category ?? ({ id: 0, name: '' } as CategoryDTO);
        }
        this._loadReceiptThumbnails(expense);
      }
    });
  }

  // ✨ Helper method to convert relative receipt paths to absolute URLs
  private buildReceiptUrl(receipt: ExpenseMedia): string {
    if (!receipt.url) return '';
    
    // Already an absolute URL
    if (receipt.url.startsWith('http')) {
      return receipt.url;
    }
    
    // Backend returns paths like: /opt/optimax/media/profile/images/d723DV3W5QL
    // Convert to: https://be.optimaxsuites.com/x/api/v2/exp/expenses/images/d723DV3W5QL
    const filename = receipt.url.split('/').pop();
    return `https://be.optimaxsuites.com/x/api/v2/exp/expenses/images/${filename}`;
  }

  // ✨ Build receipt URL from mediaNo
  private buildReceiptUrlFromMediaNo(mediaNo: string): string {
    return `https://be.optimaxsuites.com/x/api/v2/exp/expenses/images/${mediaNo}`;
  }

  private _getCompanyReceipts(expense: Expense): ExpenseMedia[] {
    if ((expense as any).companyReceipts?.length) return (expense as any).companyReceipts;
    if (expense.companyReceipt) return [expense.companyReceipt];
    return [];
  }

  private _getEmployeeReceipts(expense: Expense): ExpenseMedia[] {
    if ((expense as any).expenseReceipts?.length) return (expense as any).expenseReceipts;
    if (expense.expenseReceipt) return [expense.expenseReceipt];
    return [];
  }

  private _loadReceiptThumbnails(expense: Expense, preserveExisting = false): void {
    expense = this.normalizeExpenseMedia(expense);
    const oldCompanyUrls  = preserveExisting ? [...this.companyReceiptUrls]  : [];
    const oldEmployeeUrls = preserveExisting ? [...this.employeeReceiptUrls] : [];

    if (!preserveExisting) this._revokeAllReceiptUrls();

    const loadList = (media: ExpenseMedia[], type: 'company' | 'employee') => {
      const urls  = media.map(m => m.url ? this.convertToWebUrl(m.url) : '');
      const out:  string[] = [];
      let done = 0;

      if (!urls.length) {
        if (type === 'company')  { this.companyReceiptUrls  = preserveExisting ? oldCompanyUrls  : []; this.companyReceiptLoading  = false; }
        else                     { this.employeeReceiptUrls = preserveExisting ? oldEmployeeUrls : []; this.employeeReceiptLoading = false; }
        this.cdr.detectChanges();
        return;
      }

      if (type === 'company') this.companyReceiptLoading = true;
      else                    this.employeeReceiptLoading = true;

      urls.forEach((url, idx) => {
        if (!url) { done++; finalize(); return; }

        this.http.get(url, { responseType: 'blob' }).subscribe({
          next: (b) => { out[idx] = URL.createObjectURL(b); done++; finalize(); },
          error: ()  => { done++; finalize(); }
        });
      });

      const finalize = () => {
        if (done < urls.length) return;
        const final = out.filter(Boolean);
        if (type === 'company')  {
          if (preserveExisting && !final.length) this.companyReceiptUrls = oldCompanyUrls;
          else { oldCompanyUrls.forEach(u => URL.revokeObjectURL(u)); this.companyReceiptUrls = final; }
          this.companyReceiptIndex  = 0;
          this.companyReceiptLoading  = false;
        } else {
          if (preserveExisting && !final.length) this.employeeReceiptUrls = oldEmployeeUrls;
          else { oldEmployeeUrls.forEach(u => URL.revokeObjectURL(u)); this.employeeReceiptUrls = final; }
          this.employeeReceiptIndex  = 0;
          this.employeeReceiptLoading = false;
        }
        this.cdr.detectChanges();
      };
    };

    loadList(this._getCompanyReceipts(expense),  'company');
    loadList(this._getEmployeeReceipts(expense), 'employee');
  }

  openReceiptModal(apiUrl: string, title: string): void {
    if (!apiUrl) { this.messageService.add({ severity: 'warn', summary: 'No Receipt', detail: 'Receipt URL not available.' }); return; }
    this.receiptModalTitle   = title;
    this.receiptModalUrl     = '';
    this.receiptImageLoading = true;
    this.receiptImageError   = '';
    this.showReceiptModal    = true;

    this.http.get(apiUrl, { responseType: 'blob' }).subscribe({
      next: (b) => {
        if (this.receiptBlobUrl) URL.revokeObjectURL(this.receiptBlobUrl);
        this.receiptBlobUrl    = URL.createObjectURL(b);
        this.receiptImageUrl   = this.sanitizer.bypassSecurityTrustUrl(this.receiptBlobUrl);
        this.receiptModalUrl   = this.receiptBlobUrl;
        this.receiptImageLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.receiptImageLoading = false; this.receiptImageError = 'Could not load receipt. Use "Open in New Tab".'; this.cdr.detectChanges(); }
    });
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
    if (this.receiptBlobUrl) { URL.revokeObjectURL(this.receiptBlobUrl); this.receiptBlobUrl = null; }
    this.receiptImageUrl = null; this.receiptModalUrl = ''; this.receiptModalTitle = '';
    this.receiptImageLoading = false; this.receiptImageError = '';
  }

  approve(request: Expense): void {
    if (!this.canApproveOrReject(request)) {
      this.messageService.add({ severity: 'warn', summary: 'Already Actioned', detail: 'This expense has already been approved or rejected.' }); return;
    }
    if (this.isOwnExpense(request)) {
      this.messageService.add({ severity: 'warn', summary: 'Cannot Approve', detail: 'You cannot approve your own expense.' }); return;
    }
    const merchantId = request.merchantId || request.merchant?.id;
    const categoryId = request.categoryId || request.category?.id;
    if (!merchantId || !categoryId) {
      this.messageService.add({ severity: 'warn', summary: 'Cannot Approve', detail: 'Missing Merchant or Category. Please edit first.' }); return;
    }

    this.confirmationService.confirm({
      message: 'Are you sure you want to approve this expense?',
      header: `Approve — ${request.merchant?.name ?? ''}`,
      icon: 'pi pi-check-circle', acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary', acceptLabel: 'Approve', rejectLabel: 'Cancel',
      accept: () => {
        this.approvingIds.add(request.id);
        this.expenseService.approveExpense(request).subscribe({
          next: (updated) => {
            this.approvingIds.delete(request.id);
            this.messageService.add({ severity: 'success', summary: 'Approved', detail: 'Expense approved.' });

            const index = this.expenses.findIndex(e => e.id === request.id);
            if (index !== -1) { this.expenses[index] = { ...this.expenses[index], ...updated, status: ExpenseStatus.APPROVED }; this.applyFilters(); }

            // Post to finance disbursement tray
            const txPayload = {
              transactionReference: `EXP-${request.id}-${Date.now()}`,
              sourceModule: 'EXPENSE',
              amount: this.calculateTotalWithTax(request),
              currency: request.currency || 'NGN',
              status: 'APPROVED',
              description: `Expense: ${request.name}`,
              externalReference: String(request.id),
              metadata: {
                expenseId: request.id,
                bankName: (request as any).bankName || null,
                accountName: (request as any).accountName || null,
                accountNumber: (request as any).accountNumber || null,
              }
            };
            this.http.post(
              'https://be.optimaxsuites.com/x/api/v2/accounting/transactions',
              txPayload,
              { headers: new HttpHeaders({ 'X-Tenant-ID': 'optimax' }) }
            ).subscribe({
              next: () => this.messageService.add({ severity: 'info', summary: 'Finance', detail: 'Expense queued for payment in finance tray.' }),
              error: (e) => console.error('[approve] finance transaction failed:', e)
            });

            const submitterEmail = (request as any).expenseBy?.email   || (updated as any).expenseBy?.email   || '';
            const submitterName  = (request as any).expenseBy?.fullname || (updated as any).expenseBy?.fullname || 'Team Member';
            const admin = this.resolveCurrentUserDetails();
            const label = `${request.name} — ${this.formatAmount(request.amount)} ${request.currency ?? 'NGN'}`;
            if (submitterEmail) {
              this.emailService.sendExpenseApprovedNotification(submitterName, submitterEmail, label, admin.fullname)
                .subscribe({ error: (e: any) => console.error('[approve] email failed:', e) });
            }

            if (this.isModalOpen2 && this.selectedExpense?.id === request.id) {
              const merged: Expense = this.normalizeExpenseMedia({
                ...updated,
                companyReceipt:  updated.companyReceipt  ?? this.selectedExpense!.companyReceipt,
                expenseReceipt:  updated.expenseReceipt  ?? this.selectedExpense!.expenseReceipt,
                lineItems:       updated.lineItems?.length ? updated.lineItems : this.selectedExpense!.lineItems,
                ...(((updated as any).companyReceipts  ?? (this.selectedExpense as any)?.companyReceipts)  ? { companyReceipts:  (updated as any).companyReceipts  ?? (this.selectedExpense as any).companyReceipts  } : {}),
                ...(((updated as any).expenseReceipts  ?? (this.selectedExpense as any)?.expenseReceipts)  ? { expenseReceipts:  (updated as any).expenseReceipts  ?? (this.selectedExpense as any).expenseReceipts  } : {}),
              });
              this.selectedExpense = merged;
              this._loadReceiptThumbnails(merged, true);
              this.cdr.detectChanges();
            }
          },
          error: (err) => {
            this.approvingIds.delete(request.id);
            this.messageService.add({ severity: 'error', summary: 'Approval Failed', detail: err?.error?.message || 'Failed to approve.' });
          }
        });
      }
    });
  }

  openRejectionDialog(request: Expense): void {
    if (!this.canApproveOrReject(request)) {
      this.messageService.add({ severity: 'warn', summary: 'Already Actioned', detail: 'Already approved or rejected.' }); return;
    }
    if (this.isOwnExpense(request)) {
      this.messageService.add({ severity: 'warn', summary: 'Cannot Reject', detail: 'You cannot reject your own expense.' }); return;
    }
    this.pendingRejectRequest = request; this.rejectionReason = ''; this.showRejectionDialog = true;
  }

  confirmRejection(): void {
    const request = this.pendingRejectRequest; if (!request) return;
    const reason  = this.rejectionReason.trim() || 'Rejected by manager';
    this.showRejectionDialog = false; this.pendingRejectRequest = null;

    this.rejectingIds.add(request.id);
    this.expenseService.rejectExpense(request, reason).subscribe({
      next: (updated) => {
        this.rejectingIds.delete(request.id);
        this.messageService.add({ severity: 'warn', summary: 'Rejected', detail: 'Expense rejected.' });

        const index = this.expenses.findIndex(e => e.id === request.id);
        if (index !== -1) { this.expenses[index] = { ...this.expenses[index], ...updated, status: ExpenseStatus.REJECTED, rejectionReason: reason }; this.applyFilters(); }

        const submitterEmail = (request as any).expenseBy?.email   || (updated as any).expenseBy?.email   || '';
        const submitterName  = (request as any).expenseBy?.fullname || (updated as any).expenseBy?.fullname || 'Team Member';
        const admin = this.resolveCurrentUserDetails();
        const label = `${request.name} — ${this.formatAmount(request.amount)} ${request.currency ?? 'NGN'}`;
        if (submitterEmail) {
          this.emailService.sendExpenseRejectedNotification(submitterName, submitterEmail, label, admin.fullname, reason)
            .subscribe({ error: (e: any) => console.error('[reject] email failed:', e) });
        }

        if (this.isModalOpen2 && this.selectedExpense?.id === request.id) {
          const merged: Expense = this.normalizeExpenseMedia({
            ...updated,
            companyReceipt: updated.companyReceipt ?? this.selectedExpense!.companyReceipt,
            expenseReceipt: updated.expenseReceipt ?? this.selectedExpense!.expenseReceipt,
            lineItems:      updated.lineItems?.length ? updated.lineItems : this.selectedExpense!.lineItems,
            ...(((updated as any).companyReceipts ?? (this.selectedExpense as any)?.companyReceipts) ? { companyReceipts: (updated as any).companyReceipts ?? (this.selectedExpense as any).companyReceipts } : {}),
            ...(((updated as any).expenseReceipts ?? (this.selectedExpense as any)?.expenseReceipts) ? { expenseReceipts: (updated as any).expenseReceipts ?? (this.selectedExpense as any).expenseReceipts } : {}),
          });
          this.selectedExpense = merged;
          this._loadReceiptThumbnails(merged, true);
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.rejectingIds.delete(request.id);
        this.messageService.add({ severity: 'error', summary: 'Rejection Failed', detail: err?.error?.message || 'Failed to reject.' });
      }
    });
  }

  cancelRejection(): void { this.showRejectionDialog = false; this.pendingRejectRequest = null; this.rejectionReason = ''; }
  reject(request: Expense): void { this.openRejectionDialog(request); }

  openEditModal(expense: Expense): void {
    if (this.isApproved(expense)) { this.messageService.add({ severity: 'warn', summary: 'Locked', detail: 'Approved expenses cannot be edited.' }); return; }
    // Engr Damilola worked on this: fetch the full expense before editing so line items appear in the popup.
    this.isEditMode = true;
    this.selectedExpense = { ...expense };
    this.isModalOpen = true;

    this.expenseService.getExpenseById(expense.id).subscribe({
      next: (full) => {
        this.selectedExpense = {
          ...full,
          lineItems: full.lineItems?.length ? full.lineItems : this.fallbackLineItems(full),
        };
        this.patchEditForm(this.selectedExpense);
        this.cdr.detectChanges();
      },
      error: () => {
        if (this.selectedExpense) {
          this.selectedExpense.lineItems = this.selectedExpense.lineItems?.length
            ? this.selectedExpense.lineItems
            : this.fallbackLineItems(this.selectedExpense);
          this.patchEditForm(this.selectedExpense);
        }
      }
    });
  }

  closeModal(): void {
    this.isModalOpen = false; this.isModalOpen2 = false;
    this.selectedExpense = null; this.editMerchantId = null; this.editCategoryId = null;
    this.expenseForm.reset();
    this._revokeAllReceiptUrls();
  }

  onSubmit(): void {
    if (this.expenseForm.invalid) {
      Object.keys(this.expenseForm.controls).forEach(k => this.expenseForm.get(k)?.markAsTouched());
      this.messageService.add({ severity: 'warn', summary: 'Validation Error', detail: 'Please fill in all required fields.' }); return;
    }
    const fv = this.expenseForm.value;
    if (this.isEditMode && this.selectedExpense) {
      const payload: any = {
        name: fv.name, description: fv.description, eventDate: new Date(fv.eventDate).toISOString(),
        quantity: fv.quantity, currency: fv.currency, amount: Number(fv.amount) || 0,
        status: this.selectedExpense.status, paidBy: fv.paidBy, receiptReference: fv.receiptReference || '',
        merchantId: Number(fv.merchantId), categoryId: Number(fv.categoryId),
        taxId: fv.taxId ?? null, scheduledPaymentId: fv.scheduledPaymentId || null,
        lineItems: this.normalizedLineItems(this.selectedExpense),
        bankName: (this.selectedExpense as any).bankName || null,
        accountName: (this.selectedExpense as any).accountName || null,
        accountNumber: (this.selectedExpense as any).accountNumber || null,
      };
      this.expenseService.updateExpense(this.selectedExpense.id, payload).subscribe({
        next: () => { this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Expense updated.' }); this.closeModal(); },
        error: (err) => { this.messageService.add({ severity: 'error', summary: 'Failed', detail: err?.error?.message || 'Update failed.' }); }
      });
    } else {
      this.expenseService.addExpense({
        ...fv, eventDate: new Date(fv.eventDate).toISOString(), expenseBy: this.currentUserId,
      }, fv.companyReceiptFile, fv.expenseReceiptFile)
        .pipe(takeUntil(this.destroy$)).subscribe({
          next: () => { this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Expense created.' }); this.closeModal(); },
          error: (err) => { this.messageService.add({ severity: 'error', summary: 'Failed', detail: err.message || 'Creation failed.' }); }
        });
    }
  }

  editExpense(expense: Expense): void  { this.openEditModal(expense); }
  saveEditedExpense(): void            { this.onSubmit(); }

  confirmDelete(expense: Expense): void {
    if (this.isApproved(expense)) {
      this.messageService.add({ severity: 'warn', summary: 'Cannot Delete', detail: 'Approved expenses cannot be deleted. Contact your administrator.' }); return;
    }
    this.confirmationService.confirm({
      message: 'Delete this expense?', header: `Delete — ${expense.merchant?.name ?? ''}`,
      icon: 'pi pi-exclamation-triangle', acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Delete', rejectLabel: 'Cancel', accept: () => this.deleteExpense(expense)
    });
  }

  deleteExpense(expense: Expense): void {
    if (this.isApproved(expense)) {
      this.messageService.add({ severity: 'warn', summary: 'Cannot Delete', detail: 'Approved expenses cannot be deleted.' }); return;
    }
    this.deletingIds.add(expense.id);
    this.expenseService.deleteExpense(expense.id).subscribe({
      next: () => {
        this.deletingIds.delete(expense.id);
        this.expenses = this.expenses.filter(e => e.id !== expense.id);
        this.allExpensesFromApi = this.allExpensesFromApi.filter(e => e.id !== expense.id);
        this.applyFilters();
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Expense deleted.' });
      },
      error: (err) => {
        this.deletingIds.delete(expense.id);
        this.messageService.add({ severity: 'error', summary: 'Failed', detail: err.message || 'Delete failed.' });
      }
    });
  }

  deleteSelectedExpenses(): void {
    if (!this.selectedExpenses.length) return;
    const deletable = this.selectedExpenses.filter(e => !this.isApproved(e));
    const blocked   = this.selectedExpenses.length - deletable.length;
    if (!deletable.length) { this.messageService.add({ severity: 'warn', summary: 'Cannot Delete', detail: 'All selected expenses are approved.' }); return; }
    this.confirmationService.confirm({
      message: `Delete ${deletable.length} expense(s)?${blocked > 0 ? ` (${blocked} approved will be skipped)` : ''}`,
      header: 'Bulk Delete', icon: 'pi pi-exclamation-triangle', acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Delete', rejectLabel: 'Cancel',
      accept: () => { deletable.forEach(e => this.deleteExpense(e)); this.selectedExpenses = []; }
    });
  }

  bulkApprove(): void {
    if (!this.selectedExpenses.length) { this.messageService.add({ severity: 'warn', summary: 'None Selected', detail: 'Select at least one expense.' }); return; }
    this.confirmationService.confirm({
      message: `Approve ${this.selectedExpenses.length} selected?`, header: 'Bulk Approve',
      icon: 'pi pi-check-circle', acceptButtonStyleClass: 'p-button-success', acceptLabel: 'Approve All', rejectLabel: 'Cancel',
      accept: () => { this.selectedExpenses.filter(e => this.canApproveOrReject(e)).forEach(e => this.approve(e)); this.selectedExpenses = []; }
    });
  }

  bulkReject(): void {
    if (!this.selectedExpenses.length) { this.messageService.add({ severity: 'warn', summary: 'None Selected', detail: 'Select at least one expense.' }); return; }
    this.confirmationService.confirm({
      message: `Reject ${this.selectedExpenses.length} selected?`, header: 'Bulk Reject',
      icon: 'pi pi-exclamation-triangle', acceptButtonStyleClass: 'p-button-danger', acceptLabel: 'Reject All', rejectLabel: 'Cancel',
      accept: () => { this.selectedExpenses.filter(e => this.canApproveOrReject(e)).forEach(e => this.reject(e)); this.selectedExpenses = []; }
    });
  }

  // ─── Filters ──────────────────────────────────────────────────────────────
  onSearchInputChange(): void { this.searchTermSubject.next(this.searchTerm); }

  applyFilters(): void {
    this.filteredExpenses = this.expenses.filter((e) => {
      const merchant = (e.merchant as MerchantDTO)?.name || '';
      const category = (e.category as CategoryDTO)?.name || '';
      const amount   = Math.floor(Number(e.amount)).toString();

      if (this.searchTerm) {
        const t = this.searchTerm.toLowerCase().trim();
        if (!(e.name || '').toLowerCase().includes(t) && !amount.includes(t) &&
            !merchant.toLowerCase().includes(t) && !category.toLowerCase().includes(t) &&
            !e.id.toString().includes(t)) return false;
      }
      if (this.selectedCategory && category !== this.selectedCategory) return false;
      if (this.selectedStatus && this.selectedStatus !== 'ALL' && e.status !== this.selectedStatus) return false;
      if (this.dateFrom && this.dateTo) {
        const d = new Date(e.eventDate);
        if (d < new Date(this.dateFrom) || d > new Date(this.dateTo + 'T23:59:59')) return false;
      }
      return true;
    });
  }

  applyDateRange(): void {
    if (!this.dateRangeType) { this.applyFilters(); return; }
    const t = new Date(); let from = new Date(), to = new Date();
    if (this.dateRangeType === 'today')       { from = new Date(t.getFullYear(), t.getMonth(), t.getDate()); to = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59); }
    else if (this.dateRangeType === 'week')   { const d = t.getDay() === 0 ? 6 : t.getDay() - 1; from = new Date(t.getFullYear(), t.getMonth(), t.getDate() - d); to = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59); }
    else if (this.dateRangeType === 'month')  { from = new Date(t.getFullYear(), t.getMonth(), 1); to = new Date(t.getFullYear(), t.getMonth() + 1, 0, 23, 59, 59); }
    else if (this.dateRangeType === 'custom') { if (!this.dateFrom || !this.dateTo) { this.applyFilters(); return; } from = new Date(this.dateFrom); to = new Date(this.dateTo + 'T23:59:59'); }
    if (this.dateRangeType !== 'custom') { this.dateFrom = from.toISOString().split('T')[0]; this.dateTo = to.toISOString().split('T')[0]; }
    this.applyFilters();
  }

  applyCustomDateRange(): void {
    if (this.dateFrom && this.dateTo) {
      if (new Date(this.dateFrom) > new Date(this.dateTo)) { const tmp = this.dateFrom; this.dateFrom = this.dateTo; this.dateTo = tmp; }
      this.applyFilters();
    }
  }

  clearSearch(): void { this.searchTerm = ''; this.applyFilters(); }

  toggleDropdown(type: 'category' | 'status' | 'dateRange'): void {
    Object.keys(this.dropdownOpen).forEach(k => { if (k !== type) this.dropdownOpen[k as keyof typeof this.dropdownOpen] = false; });
    this.dropdownOpen[type] = !this.dropdownOpen[type];
  }

  selectCategory(c: string | null): void       { this.selectedCategory = c; this.dropdownOpen.category = false; this.applyFilters(); }
  selectStatus(s: ExpenseStatus | 'ALL'): void  { this.selectedStatus = s; this.dropdownOpen.status = false; this.currentPage = 0; this.applyFilters(); }
  selectDateRange(r: string | null): void       { this.dateRangeType = r; this.dropdownOpen.dateRange = false; if (r !== 'custom') { this.dateFrom = null; this.dateTo = null; } this.applyDateRange(); }

  get dateRangeLabel(): string { const m: any = { today: 'Today', week: 'This Week', month: 'This Month', custom: 'Custom Range' }; return this.dateRangeType ? (m[this.dateRangeType] || 'Date Range') : 'Date Range'; }

  onRowSelect(e: any)   { this.selectedExpenses = e.value; }
  onRowUnselect(e: any) { this.selectedExpenses = e.value; }

  // ─── Import ───────────────────────────────────────────────────────────────
  openImportModal(): void   { this.showImportModal = true; this.importFile = null; this.importResult = null; this.importProgress = 0; }
  onImportCancelled(): void { this.showImportModal = false; this.clearImportFile(); }
  clearImportFile(): void   { this.importFile = null; this.importResult = null; this.importProgress = 0; }
  onImportDragOver(e: DragEvent): void  { e.preventDefault(); e.stopPropagation(); this.importDragging = true; }
  onImportDragLeave(e: DragEvent): void { e.preventDefault(); e.stopPropagation(); this.importDragging = false; }
  onImportDrop(e: DragEvent): void      { e.preventDefault(); e.stopPropagation(); this.importDragging = false; const f = e.dataTransfer?.files[0]; if (f) this.setImportFile(f); }
  onImportFileSelect(e: Event): void    { const i = e.target as HTMLInputElement; if (i.files?.[0]) this.setImportFile(i.files[0]); }

  private setImportFile(file: File): void {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!['.csv', '.xlsx', '.xls'].includes(ext)) { this.messageService.add({ severity: 'error', summary: 'Invalid File', detail: 'Only CSV, XLSX, XLS supported.' }); return; }
    if (file.size > 10 * 1024 * 1024) { this.messageService.add({ severity: 'error', summary: 'Too Large', detail: 'Max 10 MB.' }); return; }
    this.importFile = file; this.importResult = null;
  }

  downloadImportTemplate(): void { this.importService.downloadTemplate(); }

  async processImport(): Promise<void> {
    if (!this.importFile || this.importLoading) return;
    this.importLoading = true; this.importProgress = 10; this.importResult = null;
    try {
      const rows = await this.importService.parseFile(this.importFile);
      this.importProgress = 40;
      const result: ImportResult = { total: rows.length, success: 0, errors: 0, errorMessages: [] };
      const valid = rows.filter(row => {
        if (!row.isValid) { result.errors++; result.errorMessages.push(`Row ${row.rowNumber}: ${row.validationErrors.join(', ')}`); return false; }
        const m = this.merchants.find((x: MerchantDTO) => x.name.toLowerCase() === row.merchant.toLowerCase());
        const c = this.categories.find((x: CategoryDTO) => x.name.toLowerCase() === row.category.toLowerCase());
        if (!m) { result.errors++; result.errorMessages.push(`Row ${row.rowNumber}: Merchant "${row.merchant}" not found.`); return false; }
        if (!c) { result.errors++; result.errorMessages.push(`Row ${row.rowNumber}: Category "${row.category}" not found.`); return false; }
        (row as any).merchantId = m.id; (row as any).categoryId = c.id; return true;
      });
      this.importProgress = 60;
      for (let i = 0; i < valid.length; i++) {
        const row = valid[i];
        try {
          await this.expenseService.addExpense({
            name: row.name, description: row.description || '', eventDate: new Date(row.eventDate).toISOString(),
            quantity: 1, currency: row.currency, amount: row.amount, status: 'PENDING', paidBy: row.paidBy,
            receiptReference: row.receiptReference, merchantId: (row as any).merchantId,
            categoryId: (row as any).categoryId, taxId: null, scheduledPaymentId: null, expenseBy: this.currentUserId,
          }).toPromise();
          result.success++;
        } catch (e: any) { result.errors++; result.errorMessages.push(`Row ${row.rowNumber}: ${e?.message || 'API error'}`); }
        this.importProgress = 60 + Math.round(((i + 1) / valid.length) * 35);
      }
      this.importProgress = 100; this.importResult = result; this.importLoading = false;
      if (result.success > 0) {
        this.loadExpenses();
        this.messageService.add({ severity: result.errors > 0 ? 'warn' : 'success', summary: 'Import Complete', detail: `${result.success} imported${result.errors > 0 ? `, ${result.errors} failed` : ''}.` });
      } else { this.messageService.add({ severity: 'error', summary: 'Import Failed', detail: 'No expenses imported.' }); }
    } catch (e: any) {
      this.importLoading = false; this.importProgress = 0;
      this.messageService.add({ severity: 'error', summary: 'Parse Error', detail: e.message || 'Could not read file.' });
    }
  }

  onImportComplete(): void { this.showImportModal = false; this.loadExpenses(); }

  // ─── Status helpers ───────────────────────────────────────────────────────
  private normalizeStatus(s: string | ExpenseStatus | null | undefined): string { return s ? String(s).trim().toUpperCase() : ''; }
  isApproved(e: Expense): boolean         { return this.normalizeStatus(e?.status) === ExpenseStatus.APPROVED; }
  isRejected(e: Expense): boolean         { return this.normalizeStatus(e?.status) === ExpenseStatus.REJECTED; }
  isLocked(e: Expense): boolean           { return this.isApproved(e) || this.isRejected(e); }
  canApproveOrReject(e: Expense): boolean { return this.normalizeStatus(e?.status) === ExpenseStatus.PENDING; }

  // ─── Pagination ───────────────────────────────────────────────────────────
  onPageChange(p: number): void { this.currentPage = p; }
  get paginatedExpenses(): Expense[] { const s = this.currentPage * this.pageSize; return this.filteredExpenses.slice(s, s + this.pageSize); }
  nextPage(): void     { if (this.currentPage < this.totalPages - 1) this.currentPage++; }
  previousPage(): void { if (this.currentPage > 0) this.currentPage--; }

  // ─── Summary ──────────────────────────────────────────────────────────────
  getExpenseCount(): number { return this.expenses?.length || 0; }

  getTaxForExpense(e: Expense | null): TaxDTO | null {
    if (!e) return null;
    if (e.tax && typeof e.tax === 'object' && (e.tax as TaxDTO).id)
      return { ...(e.tax as TaxDTO), rate: Number((e.tax as TaxDTO).rate) || 0 };
    if (e.taxId && this.taxMap[e.taxId]) return this.taxMap[e.taxId];
    return null;
  }

  calculateTaxAmount(e: Expense | null): number {
    if (!e) return 0;
    const tax = this.getTaxForExpense(e);
    return tax?.rate ? (Number(e.amount) || 0) * Number(tax.rate) / 100 : 0;
  }

  calculateTotalWithTax(e: Expense | null): number {
    if (!e) return 0;
    return (Number(e.amount) || 0) + this.calculateTaxAmount(e);
  }

  calculateDisplayAmount(e: Expense): number { return this.calculateTotalWithTax(e); }

  getTotalAmount(): number    { return this.expenses.reduce((s, e) => s + this.calculateTotalWithTax(e), 0); }
  getApprovedCount(): number  { return this.expenses.filter(e => e.status === ExpenseStatus.APPROVED).length; }
  getApprovedAmount(): number { return this.expenses.filter(e => e.status === ExpenseStatus.APPROVED).reduce((s, e) => s + this.calculateTotalWithTax(e), 0); }
  getPendingCount(): number   { return this.expenses.filter(e => e.status === ExpenseStatus.PENDING).length; }
  getPendingAmount(): number  { return this.expenses.filter(e => e.status === ExpenseStatus.PENDING).reduce((s, e) => s + this.calculateTotalWithTax(e), 0); }
  getRejectedCount(): number  { return this.expenses.filter(e => e.status === ExpenseStatus.REJECTED).length; }
  getRejectedAmount(): number { return this.expenses.filter(e => e.status === ExpenseStatus.REJECTED).reduce((s, e) => s + this.calculateTotalWithTax(e), 0); }

  getTaxRateDisplayValue(tax: TaxDTO | number | undefined): number | undefined {
    if (tax === undefined || tax === null) return undefined;
    return typeof tax === 'object' ? Number((tax as TaxDTO).rate) || 0 : tax as number;
  }

  // ─── Formatting ───────────────────────────────────────────────────────────
  formatAmount(v: number | string | null | undefined): string {
    const n = Number(v); return !isNaN(n) && v !== null && v !== undefined ? n.toLocaleString() : '';
  }

  formatEventDate(d: any): string | Date {
    if (!d) return '';
    if (typeof d === 'string' || d instanceof Date) return d;
    if (Array.isArray(d)) { const [y, mo, day, h = 0, mi = 0, s = 0] = d; return new Date(y, mo - 1, day, h, mi, s); }
    return d;
  }

  formatEventDateForInput(d: any): string {
    if (!d) return '';
    const dt = this.formatEventDate(d);
    if (dt instanceof Date) return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    if (typeof dt === 'string') return dt.split('T')[0];
    return '';
  }

  updateEditAmount(e: any): void {
    if (!this.selectedExpense) return;
    const n = Number((e.target.value || '').toString().replace(/,/g, ''));
    this.selectedExpense.amount = !isNaN(n) ? n : 0;
  }

  onlyNumbers(e: KeyboardEvent): void {
    const allow = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'];
    if (allow.includes(e.key) || (e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))) return;
    if (!/[0-9]/.test(e.key)) e.preventDefault();
  }

  onTaxInputChange(e: Event): void {
    if (!this.selectedExpense) return;
    const v = parseFloat((e.target as HTMLInputElement).value) || 0;
    this.selectedExpense.tax = { id: this.selectedExpense.tax?.id || 0, name: 'Custom', rate: v, description: '' };
  }

  onDateInputChange(e: Event): void { if (this.selectedExpense) this.selectedExpense.eventDate = (e.target as HTMLInputElement).value; }
  updateLineItem(index: number, field: 'quantity' | 'unitPrice' | 'totalPrice' | 'name', value: any): void {
    if (!this.selectedExpense?.lineItems?.[index]) return;
    const item = this.selectedExpense.lineItems[index];
    if (field === 'name') {
      item.name = String(value || '');
      return;
    }
    const num = Number(value) || 0;
    if (field === 'quantity') {
      item.quantity = Math.max(1, Math.round(num || 1));
      item.totalPrice = this.roundMoney(item.quantity * (Number(item.unitPrice) || 0));
    } else if (field === 'unitPrice') {
      item.unitPrice = this.roundMoney(num);
      item.totalPrice = this.roundMoney((Number(item.quantity) || 1) * item.unitPrice);
    } else {
      item.totalPrice = this.roundMoney(num);
      item.unitPrice = this.roundMoney(item.totalPrice / Math.max(Number(item.quantity) || 1, 1));
    }
    this.syncExpenseFromLineItems(this.selectedExpense);
  }
  addEditLineItem(): void {
    if (!this.selectedExpense) return;
    this.selectedExpense.lineItems = [...(this.selectedExpense.lineItems || []), { name: '', quantity: 1, unitPrice: 0, totalPrice: 0 }];
  }
  removeEditLineItem(index: number): void {
    if (!this.selectedExpense?.lineItems) return;
    this.selectedExpense.lineItems.splice(index, 1);
    this.syncExpenseFromLineItems(this.selectedExpense);
  }

  private patchEditForm(expense: Expense): void {
    // Engr Damilola worked on this: keep the edit form in sync with resolved IDs from the backend.
    this.expenseForm.patchValue({
      name: expense.name, description: expense.description,
      eventDate: this.formatEventDateForInput(expense.eventDate),
      quantity: expense.quantity, currency: expense.currency, amount: expense.amount,
      paidBy: expense.paidBy, receiptReference: expense.receiptReference,
      merchantId: expense.merchantId || expense.merchant?.id,
      categoryId: expense.categoryId || expense.category?.id,
      taxId: expense.taxId || expense.tax?.id || 1,
      scheduledPaymentId: expense.scheduledPaymentId
    });
    this.editMerchantId = expense.merchantId || expense.merchant?.id || null;
    this.editCategoryId = expense.categoryId || expense.category?.id || null;
  }

  private fallbackLineItems(expense: Expense): ExpenseLineItemDTO[] {
    // Engr Damilola worked on this: synthesize a single line item for older expenses without stored line items.
    return [{
      name: expense.name || 'Expense item',
      quantity: Number(expense.quantity) || 1,
      unitPrice: this.roundMoney((Number(expense.amount) || 0) / Math.max(Number(expense.quantity) || 1, 1)),
      totalPrice: this.roundMoney(Number(expense.amount) || 0)
    }];
  }

  private normalizedLineItems(expense: Expense | null): ExpenseLineItemDTO[] {
    return (expense?.lineItems || [])
      .map(item => ({
        id: item.id,
        name: (item.name || '').trim(),
        quantity: Math.max(1, Number(item.quantity) || 1),
        unitPrice: this.roundMoney(Number(item.unitPrice) || 0),
        totalPrice: this.roundMoney(Number(item.totalPrice) || 0)
      }))
      .filter(item => item.name && item.totalPrice >= 0);
  }

  private syncExpenseFromLineItems(expense: Expense): void {
    const items = this.normalizedLineItems(expense);
    expense.lineItems = items;
    expense.quantity = items.reduce((sum, item) => sum + item.quantity, 0) || 1;
    expense.amount = this.roundMoney(items.reduce((sum, item) => sum + item.totalPrice, 0));
    this.expenseForm.patchValue({ quantity: expense.quantity, amount: expense.amount }, { emitEvent: false });
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
  onReceiptImageLoad(): void  { this.receiptImageLoading = false; }
  onReceiptImageError(e: any): void { this.receiptImageLoading = false; this.receiptImageError = 'Preview unavailable. Use "Open in New Tab".'; }
  onReceiptThumbnailError(e: any, type: 'company' | 'employee'): void { const img = e.target as HTMLImageElement; if (img) img.style.display = 'none'; }

  private convertToWebUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `https://be.optimaxsuites.com/x/api/v2/exp/expenses/images/${path.split('/').pop()}`;
  }

  private normalizeExpenseMedia(expense: Expense): Expense {
    const normalizeOne = (receipt?: ExpenseMedia | null): ExpenseMedia | undefined => {
      if (!receipt) return undefined;
      return { ...receipt, url: this.convertToWebUrl(receipt.url || receipt.mediaNo || '') };
    };
    const normalizeMany = (receipts?: ExpenseMedia[]): ExpenseMedia[] | undefined =>
      receipts?.map((receipt) => ({ ...receipt, url: this.convertToWebUrl(receipt.url || receipt.mediaNo || '') }));

    return {
      ...expense,
      companyReceipt: normalizeOne(expense.companyReceipt),
      expenseReceipt: normalizeOne(expense.expenseReceipt),
      ...((expense as any).companyReceipts ? { companyReceipts: normalizeMany((expense as any).companyReceipts) } : {}),
      ...((expense as any).expenseReceipts ? { expenseReceipts: normalizeMany((expense as any).expenseReceipts) } : {}),
    };
  }

  getStatusBadgeClass(s: ExpenseStatus): string { return { [ExpenseStatus.PENDING]: 'badge-warning', [ExpenseStatus.APPROVED]: 'badge-success', [ExpenseStatus.REJECTED]: 'badge-danger' }[s] || 'badge-secondary'; }
  generateRandomColor(): string { return ['#ADD8E6', '#90EE90', '#FFFFE0', '#F08080', '#FFB6C1'][Math.floor(Math.random() * 5)]; }
  navigateToAnalytics(): void { this.router.navigate(['/admin/expenses/analytics/all']); }
  navigateToForm(): void      { this.router.navigate(['/admin/expenses/expensesForm']); }
  navigateToexpense(): void   { this.router.navigate(['/admin/expenses/expense-summary']); }
  openCreateModal(): void     { this.isEditMode = false; this.expenseForm.reset({ currency: Currency.NGN, paidBy: PaidBy.COMPANY, quantity: 1, taxId: null }); this.isModalOpen = true; }
  onCompanyReceiptChange(e: any): void { if (e.target.files[0]) this.expenseForm.patchValue({ companyReceiptFile: e.target.files[0] }); }
  onExpenseReceiptChange(e: any): void { if (e.target.files[0]) this.expenseForm.patchValue({ expenseReceiptFile: e.target.files[0] }); }
  get receiptApiUrl(): string { return this.receiptModalUrl; }

  initForm(): void {
    this.expenseForm = this.fb.group({
      name: ['', Validators.required], description: ['', Validators.required],
      eventDate: ['', Validators.required], quantity: [1, [Validators.required, Validators.min(1)]],
      currency: [Currency.NGN, Validators.required], amount: [0, [Validators.required, Validators.min(0)]],
      paidBy: [PaidBy.COMPANY, Validators.required], receiptReference: [''],
      merchantId: [null, Validators.required], categoryId: [null, Validators.required],
      taxId: [null], scheduledPaymentId: [null],
      companyReceiptFile: [null], expenseReceiptFile: [null]
    });
  }
}

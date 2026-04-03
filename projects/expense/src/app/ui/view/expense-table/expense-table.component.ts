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
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService, MessageService } from 'primeng/api';

import { debounceTime, Subject, takeUntil } from 'rxjs';

import {
  ExpenseService,
  Expense,
  ExpenseMedia,
  ExpenseStatus,
  MerchantDTO,
  CategoryDTO,
  TaxDTO,
  PaidBy,
  Currency
} from '../../service/expense.service';

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

  // Pagination — pageSize=10 is the default; p-table handles pages internally
  currentPage    = 0;
  pageSize       = 10;
  totalElements  = 0;
  totalPages     = 0;

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
  canViewAll     = false;
  currentUserId: number | null = null;

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
  companyReceiptLoading  = false;
  employeeReceiptLoading = false;

  // Single-URL aliases kept for template backward-compat
  get companyReceiptUrl():  string | null { return this.companyReceiptUrls[0]  ?? null; }
  get employeeReceiptUrl(): string | null { return this.employeeReceiptUrls[0] ?? null; }

  // ─── Forms ────────────────────────────────────────────────────────────────
  expenseForm!: FormGroup;

  // ─── Filters ──────────────────────────────────────────────────────────────
  dropdownOpen   = { category: false, status: false, dateRange: false };
  selectedCategory: string | null           = null;
  selectedStatus:   ExpenseStatus | 'ALL'   = 'ALL';
  dateRangeType:    string | null           = null;
  dateFrom:         string | null           = null;
  dateTo:           string | null           = null;

  // ─── Lookup data ──────────────────────────────────────────────────────────
  categoryNames: string[]      = [];
  categories:    CategoryDTO[] = [];
  merchants:     MerchantDTO[] = [];
  taxes:         TaxDTO[]      = [];

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
    this.companyReceiptUrls  = [];
    this.employeeReceiptUrls = [];
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
  // isSystemEntry
  //
  // Returns true when an expense has NO human submitter — i.e. expenseBy is
  // null, undefined, 0, or an empty object. These are admin/system-created
  // records and should only be visible to admins (canViewAll = true).
  // ─────────────────────────────────────────────────────────────────────────
  private isSystemEntry(e: Expense): boolean {
    const eb = e.expenseBy;
    if (eb === null || eb === undefined) return true;
    if (typeof eb === 'number') return eb <= 0;
    if (typeof eb === 'string') return !eb.trim() || Number(eb) <= 0;
    if (typeof eb === 'object') {
      const hasId     = typeof (eb as any).id     === 'number' && (eb as any).id     > 0;
      const hasUserId = typeof (eb as any).userId === 'number' && (eb as any).userId > 0;
      return !hasId && !hasUserId;
    }
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // loadExpenses  ← THE KEY FIX
  //
  // WHAT WAS WRONG IN ALL PREVIOUS VERSIONS:
  //   Every previous attempt tried to client-side filter by matching
  //   currentUserId against expenseBy.id or expenseBy.userId.
  //   This always broke because:
  //
  //     a) The backend UserDTO has TWO id fields (id = profile PK,
  //        userId = auth PK). The logged-in user's currentUserId comes
  //        from the auth token and matches 'userid' in sessionStorage,
  //        which maps to expenseBy.userId — BUT some expenses are tagged
  //        with only expenseBy.id (the profile PK), and these differ.
  //
  //     b) When a new expense is created, the backend returns it with
  //        the expenseBy populated using whichever id it stored. If that
  //        id doesn't match currentUserId exactly, the expense gets
  //        excluded from the filtered list, making it look "missing".
  //
  // THE CORRECT APPROACH:
  //   The /expenses endpoint already scopes results by the authenticated
  //   user's tenant and identity via the Bearer token + X-Tenant-ID header.
  //   So for a REGULAR USER, every expense the API returns IS their expense
  //   — the backend already did the filtering. We only need to:
  //
  //     1. Show everything the API returned (regular user)
  //     2. Exclude system entries (expenseBy = null) from regular users
  //        so they don't see admin-created entries mixed in
  //
  //   For ADMINS (canViewAll = true): show everything without any filter.
  //
  // WHY THIS IS SAFE:
  //   The API endpoint requires a valid Bearer token and X-Tenant-ID.
  //   Without those, it returns 401. So the API already enforces ownership.
  //   Our client-side filter's only job is to hide system-created entries
  //   from regular users.
  // ─────────────────────────────────────────────────────────────────────────
  loadExpenses(): void {
    this.isLoading = true;

    this.expenseService.getExpenses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (expenses) => {
          console.log('[loadExpenses] API returned', expenses.length, 'expenses | canViewAll:', this.canViewAll);

          let filtered: Expense[];

          if (this.canViewAll) {
            // ── ADMIN/MANAGER: show ALL expenses the API returned
            filtered = expenses;
            console.log('[loadExpenses] Admin mode → showing all', filtered.length);
          } else {
            // ── REGULAR USER: show everything the API returned EXCEPT
            //    system entries (expenseBy = null). The API already scoped
            //    results to this user — no further id-matching needed.
            filtered = expenses.filter(e => !this.isSystemEntry(e));
            console.log('[loadExpenses] User mode → showing', filtered.length,
              '(excluded', expenses.length - filtered.length, 'system entries)');
          }

          // Sort newest first — preserve existing sort behaviour
          this.expenses      = filtered.sort((a, b) => b.id - a.id);
          this.totalElements = this.expenses.length;
          this.totalPages    = Math.ceil(this.expenses.length / this.pageSize);

          // applyFilters runs AFTER ownership filter so p-table paginator
          // operates on the already-filtered set — pagination is unaffected
          this.applyFilters();

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
        this.selectedExpense = full;
        this.cdr.detectChanges();
        this._loadReceiptThumbnails(full);
      },
      error: (err) => {
        console.warn('[viewExpenseApproval] Detail fetch failed, using list data:', err);
        if (this.selectedExpense) {
          this.selectedExpense.merchant = this.selectedExpense.merchant ?? ({ id: 0, name: '', phoneNumber: '', address: '', emailAddress: '', contactPersonName: '' } as MerchantDTO);
          this.selectedExpense.category = this.selectedExpense.category ?? ({ id: 0, name: '' } as CategoryDTO);
        }
        this._loadReceiptThumbnails(expense);
      }
    });
  }

  private _getCompanyReceipts(expense: Expense): ExpenseMedia[] {
    if (expense.companyReceipts && expense.companyReceipts.length > 0) return expense.companyReceipts;
    if (expense.companyReceipt) return [expense.companyReceipt];
    return [];
  }

  private _getEmployeeReceipts(expense: Expense): ExpenseMedia[] {
    if (expense.expenseReceipts && expense.expenseReceipts.length > 0) return expense.expenseReceipts;
    if (expense.expenseReceipt) return [expense.expenseReceipt];
    return [];
  }

  private _loadReceiptThumbnails(expense: Expense, preserveExisting = false): void {
    const oldCompanyUrls = preserveExisting ? [...this.companyReceiptUrls] : [];
    const oldEmployeeUrls = preserveExisting ? [...this.employeeReceiptUrls] : [];

    if (!preserveExisting) {
      this._revokeAllReceiptUrls();
    }

    const companyMedia = this._getCompanyReceipts(expense);
    const employeeMedia = this._getEmployeeReceipts(expense);

    const loadMediaList = (media: ExpenseMedia[], type: 'company' | 'employee') => {
      const list = media.map((m) => (m.url ? this.convertToWebUrl(m.url) : '')); // ignore invalid URL
      const outUrls: string[] = [];
      let completed = 0;

      if (list.length === 0) {
        if (type === 'company') {
          this.companyReceiptUrls = preserveExisting ? oldCompanyUrls : [];
          this.companyReceiptLoading = false;
        } else {
          this.employeeReceiptUrls = preserveExisting ? oldEmployeeUrls : [];
          this.employeeReceiptLoading = false;
        }
        return;
      }

      if (type === 'company') this.companyReceiptLoading = true;
      else this.employeeReceiptLoading = true;

      list.forEach((url, idx) => {
        if (!url) {
          completed += 1;
          if (completed === list.length) {
            if (type === 'company') {
              this.companyReceiptUrls = outUrls.length ? outUrls : (preserveExisting ? oldCompanyUrls : []);
              this.companyReceiptLoading = false;
            } else {
              this.employeeReceiptUrls = outUrls.length ? outUrls : (preserveExisting ? oldEmployeeUrls : []);
              this.employeeReceiptLoading = false;
            }
            this.cdr.detectChanges();
          }
          return;
        }

        this.http.get(url, { responseType: 'blob' }).subscribe({
          next: (b) => {
            outUrls[idx] = URL.createObjectURL(b);
            completed += 1;
            if (completed === list.length) {
              if (type === 'company') {
                this.companyReceiptUrls = outUrls;
                this.companyReceiptLoading = false;
              } else {
                this.employeeReceiptUrls = outUrls;
                this.employeeReceiptLoading = false;
              }
              this.cdr.detectChanges();
            }
          },
          error: () => {
            completed += 1;
            if (completed === list.length) {
              if (type === 'company') {
                this.companyReceiptUrls = outUrls.length ? outUrls : (preserveExisting ? oldCompanyUrls : []);
                this.companyReceiptLoading = false;
              } else {
                this.employeeReceiptUrls = outUrls.length ? outUrls : (preserveExisting ? oldEmployeeUrls : []);
                this.employeeReceiptLoading = false;
              }
              this.cdr.detectChanges();
            }
          }
        });
      });
    };

    loadMediaList(companyMedia, 'company');
    loadMediaList(employeeMedia, 'employee');
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

            const submitterEmail = (request as any).expenseBy?.email   || (updated as any).expenseBy?.email   || '';
            const submitterName  = (request as any).expenseBy?.fullname || (updated as any).expenseBy?.fullname || 'Team Member';
            const admin  = this.resolveCurrentUserDetails();
            const label  = `${request.name} — ${this.formatAmount(request.amount)} ${request.currency ?? 'NGN'}`;
            if (submitterEmail) {
              this.emailService.sendExpenseApprovedNotification(submitterName, submitterEmail, label, admin.fullname)
                .subscribe({ error: (e: any) => console.error('[approve] email failed:', e) });
            }

            if (this.isModalOpen2 && this.selectedExpense?.id === request.id) {
              console.log('[approve] request/updated receipts:', {
                requestCompanyReceipt: request.companyReceipt,
                requestCompanyReceipts: request.companyReceipts,
                updatedCompanyReceipt: updated.companyReceipt,
                updatedCompanyReceipts: updated.companyReceipts,
                selectedCompanyReceipt: this.selectedExpense.companyReceipt,
                selectedCompanyReceipts: this.selectedExpense.companyReceipts,
              });

              const merged = { ...updated,
                companyReceipt: updated.companyReceipt ?? this.selectedExpense.companyReceipt,
                expenseReceipt: updated.expenseReceipt ?? this.selectedExpense.expenseReceipt,
                companyReceipts: updated.companyReceipts ?? this.selectedExpense.companyReceipts,
                expenseReceipts: updated.expenseReceipts ?? this.selectedExpense.expenseReceipts,
              };
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
        const admin  = this.resolveCurrentUserDetails();
        const label  = `${request.name} — ${this.formatAmount(request.amount)} ${request.currency ?? 'NGN'}`;
        if (submitterEmail) {
          this.emailService.sendExpenseRejectedNotification(submitterName, submitterEmail, label, admin.fullname, reason)
            .subscribe({ error: (e: any) => console.error('[reject] email failed:', e) });
        }

        if (this.isModalOpen2 && this.selectedExpense?.id === request.id) {
          console.log('[reject] request/updated receipts:', {
            requestCompanyReceipt: request.companyReceipt,
            requestCompanyReceipts: request.companyReceipts,
            updatedCompanyReceipt: updated.companyReceipt,
            updatedCompanyReceipts: updated.companyReceipts,
            selectedCompanyReceipt: this.selectedExpense.companyReceipt,
            selectedCompanyReceipts: this.selectedExpense.companyReceipts,
          });

          const merged = { ...updated,
            companyReceipt: updated.companyReceipt ?? this.selectedExpense.companyReceipt,
            expenseReceipt: updated.expenseReceipt ?? this.selectedExpense.expenseReceipt,
            companyReceipts: updated.companyReceipts ?? this.selectedExpense.companyReceipts,
            expenseReceipts: updated.expenseReceipts ?? this.selectedExpense.expenseReceipts,
          };
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
    this.isEditMode = true; this.selectedExpense = expense;
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
    this.isModalOpen    = true;
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
        taxId: fv.taxId ?? null, scheduledPaymentId: fv.scheduledPaymentId || null
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

  // ─── Pagination (unchanged) ───────────────────────────────────────────────
  onPageChange(p: number): void { this.currentPage = p; }
  get paginatedExpenses(): Expense[] { const s = this.currentPage * this.pageSize; return this.filteredExpenses.slice(s, s + this.pageSize); }
  nextPage(): void     { if (this.currentPage < this.totalPages - 1) this.currentPage++; }
  previousPage(): void { if (this.currentPage > 0) this.currentPage--; }

  // ─── Summary (tax-inclusive) ──────────────────────────────────────────────
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
  onReceiptImageLoad(): void  { this.receiptImageLoading = false; }
  onReceiptImageError(e: any): void { this.receiptImageLoading = false; this.receiptImageError = 'Preview unavailable. Use "Open in New Tab".'; }
  onReceiptThumbnailError(e: any, type: 'company' | 'employee'): void { const img = e.target as HTMLImageElement; if (img) img.style.display = 'none'; }

  private convertToWebUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `https://be.optimaxsuites.com/x/api/v2/exp/expenses/images/${path.split('/').pop()}`;
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
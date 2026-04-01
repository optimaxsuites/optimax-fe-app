import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpenseService } from '../../service/expense.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { NgForm } from '@angular/forms';
import { Location } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthenticationService } from '../../sharedComponent/service/auth-service/authentication.service';
import { EmailService } from '../../sharedComponent/service/email.service';
import { Subject, Observable, of } from 'rxjs';
import { debounceTime, catchError, map } from 'rxjs/operators';
import { RecurringPayment } from '../../sharedComponent/view/recurring-payment-modal/recurring-payment.model';
import { RecurringPaymentModalComponent } from '../../sharedComponent/view/recurring-payment-modal/recurring-payment-modal.component';
import { BillSplit, BillSplitParticipant } from '../../sharedComponent/view/bill-splitting-modal/bill-splitting.model';
import { SideModalComponent } from '../../sharedComponent/view/side-modal/side-modal.component';
import { MatIconModule } from '@angular/material/icon';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

/** Role used to look up approvers via the backend API */
const APPROVER_ROLE = 'MANAGER';

/**
 * Fallback approver emails — used only while backend endpoint is pending.
 * @todo Remove once GET /users/by-role is available.
 */
const FALLBACK_APPROVER_EMAILS: { fullname: string; email: string }[] = [
  { fullname: 'Admin',   email: 'a.olayemi@yahoo.com' },
  { fullname: 'Finance', email: 'damilola@centrifugegroup.com' },
];

/** Max expenses allowed per user per calendar month before a warning is shown */
const MONTHLY_EXPENSE_LIMIT = 20;

@Component({
  selector: 'app-expense-forms-modal',
  templateUrl: './expense-forms-modal.component.html',
  styleUrls: ['./expense-forms-modal.component.scss'],
  standalone: true,
  providers: [MessageService, ConfirmationService],
  imports: [
    CommonModule, FormsModule, MatIconModule, NgSelectModule,
    ToastModule, TooltipModule, DialogModule, ConfirmDialogModule,
    RecurringPaymentModalComponent, SideModalComponent,
  ],
})
export class ExpenseFormsModalComponent implements OnInit, OnDestroy {

  // ─── Form state ───────────────────────────────────────────────────────────
  expenseSummary: any = { amount: null, quantity: 1, paidBy: 'COMPANY' };
  isDragging = false;
  currentStage = 'to-submit';
  productData: any = {};
  signatureUrl: string | null = null;

  // ─── FIX 1: Loading / submitting state ───────────────────────────────────
  isSubmitting = false;
  isSendingEmail = false;

  // ─── FIX 3: Amount display mode ──────────────────────────────────────────
  // 'per_item' means user enters price per item; total = quantity × amount
  // 'total' means user enters the full total directly
  amountMode: 'per_item' | 'total' = 'total';

  // ─── FIX 8: Multiple document attachments ────────────────────────────────
  // Company receipt (required) — supports multiple files
  companyReceiptFiles: File[] = [];
  companyReceiptPreviews: string[] = [];

  // Employee receipt (required when paidBy=EMPLOYEE) — supports multiple files
  employeeReceiptFiles: File[] = [];
  employeeReceiptPreviews: string[] = [];

  // Legacy single-file properties kept for backward compatibility
  get receiptFile(): File | null { return this.companyReceiptFiles[0] ?? null; }
  get employeeReceiptFile(): File | null { return this.employeeReceiptFiles[0] ?? null; }

  // ─── Dropdown data ────────────────────────────────────────────────────────
  categories: { id: number; name: string; description?: string }[] = [];
  categoryNames: string[] = [];
  merchants: { id: number; name: string; phoneNumber: string; address: string; emailAddress: string; contactPersonName: string }[] = [];
  taxRates: { id: number; name: string; rate: number }[] = [];
  selectedCurrency = 'NGN';
  availableCurrencies = ['USD', 'EUR', 'GBP', 'NGN'];

  // ─── FIX 15: Monthly batching ─────────────────────────────────────────────
  currentMonthExpenseCount = 0;
  showMonthlyLimitWarning = false;
  readonly MONTHLY_LIMIT = MONTHLY_EXPENSE_LIMIT;

  // ─── Modals ───────────────────────────────────────────────────────────────
  showCategoryModal = false;
  showMerchantModal = false;
  showTaxModal = false;
  showAdvancedPayment = false;
  showBillSplit = false;

  newCategoryData = { name: '', description: '' };
  newMerchantData = { name: '', phoneNumber: '', address: '', emailAddress: '', contactPersonName: '' };
  newTaxData = { name: '', rate: 0, description: '' };

  // ─── Advanced payment / bill split ────────────────────────────────────────
  advancedPaymentData?: RecurringPayment;
  billSplitData?: BillSplit;
  numParticipants = 2;
  splitError: string | null = null;

  searchTermSubject = new Subject<string>();

  @ViewChild(RecurringPaymentModalComponent) recurringModal?: RecurringPaymentModalComponent;

  public signaturePadOptions: Object = { minWidth: 1, canvasWidth: 500, canvasHeight: 300 };

  constructor(
    private expenseService: ExpenseService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private location: Location,
    private http: HttpClient,
    private emailService: EmailService,
    private authService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadMerchants();
    this.loadTaxRates();
    this.checkMonthlyLimit();
    this.searchTermSubject.pipe(debounceTime(300)).subscribe(() => this.applyFilters());

    this.route.queryParams.subscribe((params) => {
      const expenseId = params['id'];
      if (expenseId) {
        this.expenseService.getExpenseById(expenseId).subscribe((expense) => {
          if (expense) {
            this.expenseSummary = { ...expense };
            this.signatureUrl = expense.signature || null;
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.revokeAllPreviews();
  }

  // ─── FIX 5: Resolve current user (nested user.id) ────────────────────────
  private resolveCurrentUser(): { id: number | null; fullname: string; email: string } {
    try {
      const primaryRaw =
        sessionStorage.getItem('userPrimaryInfoRegData') ||
        localStorage.getItem('userPrimaryInfoRegData');
      const primary = primaryRaw ? JSON.parse(primaryRaw) : null;

      const regRaw =
        sessionStorage.getItem('userRegData') ||
        localStorage.getItem('userRegData');
      const reg = regRaw ? JSON.parse(regRaw) : null;

      const storedId =
        sessionStorage.getItem('userid') ||
        localStorage.getItem('userid');

      // Priority: nested user.id → userRegData.id → flat userid string
      const id: number | null =
        (primary?.user?.id && typeof primary.user.id === 'number') ? primary.user.id :
        (reg?.id           && typeof reg.id           === 'number') ? reg.id           :
        storedId ? (Number(storedId) || null) : null;

      const fullname =
        primary?.fullname || primary?.name ||
        sessionStorage.getItem('username') || localStorage.getItem('username') || 'Unknown User';

      const email =
        primary?.email ||
        sessionStorage.getItem('email') || localStorage.getItem('email') || '';

      console.log('[ExpenseForm] resolveCurrentUser → id:', id, 'name:', fullname);
      return { id, fullname, email };
    } catch {
      return { id: null, fullname: 'Unknown User', email: '' };
    }
  }

  // ─── FIX 14: Fetch approvers from API with fallback ───────────────────────
  private fetchApprovers(): Observable<{ fullname: string; email: string }[]> {
    const authToken =
      sessionStorage.getItem('Token') || localStorage.getItem('token') ||
      sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    const tenantId = sessionStorage.getItem('tenantId') || localStorage.getItem('tenantId') || 'mod';

    let headers = new HttpHeaders({ 'X-Tenant-ID': tenantId });
    if (authToken) headers = headers.set('Authorization', `Bearer ${authToken}`);

    // @todo swap URL once backend confirms endpoint
    const approverUrl = `https://be.optimaxsuites.com/x/api/v2/us/ur/users/by-role?role=${APPROVER_ROLE}`;

    return this.http.get<any[]>(approverUrl, { headers }).pipe(
      map((users: any[]) =>
        users.filter(u => u.email).map(u => ({
          fullname: u.fullname || u.name || u.username || 'Approver',
          email:    u.email || u.emailAddress || '',
        }))
      ),
      catchError((err) => {
        console.warn('[ExpenseForm] fetchApprovers API failed — using fallback:', err);
        return of(FALLBACK_APPROVER_EMAILS);
      })
    );
  }

  private notifyAdmins(
    submitterName: string,
    expenseName: string,
    amount: number,
    currency: string,
    submitterEmail: string
  ): void {
    this.fetchApprovers().subscribe({
      next: (approvers) => {
        if (!approvers.length) {
          console.warn('[ExpenseForm] No approvers found — notification skipped.');
          return;
        }
        approvers.forEach(approver => {
          if (!approver.email || approver.email.toLowerCase() === submitterEmail.toLowerCase()) return;
          this.emailService.sendExpenseSubmissionAlert(submitterName, approver.email, expenseName, amount, currency)
            .pipe(catchError(err => { console.error(`[notifyAdmins] ❌ ${approver.email}:`, err); return of(null); }))
            .subscribe(() => console.log(`[notifyAdmins] ✉️  ${approver.email}`));
        });

        // Confirmation copy to submitter
        if (submitterEmail) {
          this.emailService.sendNotificationEmail({
            name: submitterName,
            receiverEmail: submitterEmail,
            subject: '📋 Expense Submitted — Awaiting Approval',
            body: `<p>Hi ${submitterName},</p>
                   <p>Your expense <strong>${expenseName}</strong> of
                   <strong>${currency} ${amount.toLocaleString()}</strong>
                   has been submitted and is pending approval.</p>
                   <p>You will be notified once reviewed.</p>
                   <br/><p style="color:#666;">Optimax Finance Team</p>`
          }).pipe(catchError(err => { console.error('[notifyAdmins] submitter copy failed:', err); return of(null); }))
            .subscribe(() => console.log(`[notifyAdmins] ✉️  submitter copy: ${submitterEmail}`));
        }
      },
      error: (err) => console.error('[notifyAdmins] fetchApprovers error:', err)
    });
  }

  // ─── FIX 15: Monthly batching check ──────────────────────────────────────
  private checkMonthlyLimit(): void {
    const currentUser = this.resolveCurrentUser();
    if (!currentUser.id) return;

    this.expenseService.getExpenses().subscribe({
      next: (expenses) => {
        const now = new Date();
        const thisMonth = expenses.filter(e => {
          // Match current user
          const uid = typeof e.expenseBy === 'object' && e.expenseBy !== null
            ? (e.expenseBy as any).id ?? (e.expenseBy as any).userId
            : Number(e.expenseBy);
          if (uid !== currentUser.id) return false;

          // Match current month/year
          const d = Array.isArray(e.eventDate)
            ? new Date((e.eventDate as any)[0], (e.eventDate as any)[1] - 1)
            : new Date(e.eventDate as string);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });

        this.currentMonthExpenseCount = thisMonth.length;
        this.showMonthlyLimitWarning = thisMonth.length >= MONTHLY_EXPENSE_LIMIT;

        if (this.showMonthlyLimitWarning) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Monthly Limit Reached',
            detail: `You have submitted ${thisMonth.length} expenses this month (limit: ${MONTHLY_EXPENSE_LIMIT}). Please contact your manager.`,
            life: 8000
          });
        }
      },
      error: () => {} // non-critical, silently ignore
    });
  }

  // ─── FIX 3: Computed total amount ────────────────────────────────────────
  get computedTotal(): number {
    const amount = Number(this.expenseSummary.amount) || 0;
    const qty    = Number(this.expenseSummary.quantity) || 1;
    return this.amountMode === 'per_item' ? amount * qty : amount;
  }

  get computedTotalWithTax(): number {
    const tax = Number(this.expenseSummary.taxPercentage) || 0;
    return this.computedTotal + (this.computedTotal * tax / 100);
  }

  // ─── SUBMIT ───────────────────────────────────────────────────────────────
  submitExpense(form: NgForm): void {
    if (this.categories.length === 0) {
      this.messageService.add({ severity: 'error', summary: 'No Categories', detail: 'Please add at least one category.' }); return;
    }
    if (this.merchants.length === 0) {
      this.messageService.add({ severity: 'error', summary: 'No Merchants', detail: 'Please add at least one merchant.' }); return;
    }
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.messageService.add({ severity: 'error', summary: 'Form Invalid', detail: 'Please fill in all required fields.' }); return;
    }

    // ─── FIX 2: Quantity validation ───────────────────────────────────────
    if (!this.expenseSummary.quantity || Number(this.expenseSummary.quantity) < 1) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Quantity', detail: 'Quantity must be at least 1.' }); return;
    }

    // ─── FIX 3: Amount validation ──────────────────────────────────────────
    if (!this.expenseSummary.amount || Number(this.expenseSummary.amount) <= 0) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Amount', detail: 'Amount must be greater than 0.' }); return;
    }

    if (this.companyReceiptFiles.length === 0) {
      this.messageService.add({ severity: 'error', summary: 'Missing Receipt', detail: 'Please upload at least one receipt file.' }); return;
    }
    if (this.expenseSummary.paidBy === 'EMPLOYEE' && this.employeeReceiptFiles.length === 0) {
      this.messageService.add({ severity: 'error', summary: 'Missing Employee Receipt', detail: 'Please upload the employee receipt file.' }); return;
    }

    const selectedCategory = this.categories.find(c => c.name === this.expenseSummary.category);
    const selectedMerchant = this.merchants.find(m => m.name === this.expenseSummary.merchant);
    const selectedTax      = this.taxRates.find(t => t.rate === this.expenseSummary.taxPercentage);

    if (!selectedCategory) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Category', detail: `Category "${this.expenseSummary.category}" not found.` }); return;
    }
    if (!selectedMerchant) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Merchant', detail: `Merchant "${this.expenseSummary.merchant}" not found.` }); return;
    }

    const currentUser = this.resolveCurrentUser();
    if (!currentUser.id) {
      this.messageService.add({ severity: 'warn', summary: 'Session Warning', detail: 'Your session may have expired. Please refresh and try again.' });
    }

    // ─── FIX 3: Use computed total as the amount sent to backend ──────────
    const finalAmount = this.computedTotal;

    const employeeData: any = {
      name:               this.expenseSummary.name || '',
      description:        this.expenseSummary.description || '',
      eventDate:          this.expenseSummary.eventDate
                            ? new Date(this.expenseSummary.eventDate).toISOString()
                            : new Date().toISOString(),
      quantity:           Number(this.expenseSummary.quantity) || 1,
      currency:           this.selectedCurrency,
      amount:             finalAmount,
      status:             'PENDING',
      paidBy:             (this.expenseSummary.paidBy || 'EMPLOYEE').toUpperCase(),
      receiptReference:   this.expenseSummary.receiptReference || '',
      merchantId:         selectedMerchant.id,
      categoryId:         selectedCategory.id,
      taxId:              selectedTax?.id ?? null,
      scheduledPaymentId: null,
      expenseBy:          currentUser.id,
    };

    if (this.advancedPaymentData) employeeData.recurringPayment = this.advancedPaymentData;
    if (this.billSplitData)       employeeData.billSplit         = this.convertBillSplitToDTO(this.billSplitData);

    // ─── FIX 1: Set loading state ─────────────────────────────────────────
    this.isSubmitting = true;

    // ─── FIX 8: Pass first file — backend currently supports single file.
    //    When backend supports multiple, loop and call addExpense per file
    //    or update buildFormData to append multiple files.
    this.expenseService.addExpense(
      employeeData,
      this.companyReceiptFiles[0] || undefined,
      this.employeeReceiptFiles[0] || undefined
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.messageService.add({
          severity: 'success', summary: 'Expense Submitted',
          detail: 'Your expense has been submitted and is pending review.'
        });

        this.notifyAdmins(currentUser.fullname, employeeData.name, finalAmount, this.selectedCurrency, currentUser.email);

        this.resetForm();
        form.resetForm();
        this.advancedPaymentData = undefined;
        this.billSplitData       = undefined;
        this.showAdvancedPayment = false;
        this.showBillSplit       = false;
        this.router.navigate(['/admin/expenses']);
      },
      error: (error: any) => {
        // ─── FIX 1: Clear loading state on error ─────────────────────────
        this.isSubmitting = false;
        this.messageService.add({
          severity: 'error', summary: 'Submission Failed',
          detail: error.error?.message || error.message || 'An error occurred. Please try again.'
        });
      }
    });
  }

  // Data loaders
  private loadCategories(): void {
    this.expenseService.getCategories().subscribe({
      next: (c) => { this.categories = c; this.categoryNames = c.map(x => x.name); },
      error: (err) => { console.error(err); this.categories = []; this.categoryNames = []; }
    });
  }

  private loadMerchants(): void {
    this.expenseService.getMerchants().subscribe({
      next: (m) => { this.merchants = m; },
      error: (err) => { console.error(err); this.merchants = []; }
    });
  }

  private loadTaxRates(): void {
    this.expenseService.getTaxRates().subscribe({
      next: (t) => { this.taxRates = t; },
      error: (err) => { console.error(err); this.taxRates = []; }
    });
  }

  // ─── FIX 8: Multi-file handling ───────────────────────────────────────────
  onDragOver(e: DragEvent)  { e.preventDefault(); e.stopPropagation(); this.isDragging = true; }
  onDragLeave(e: DragEvent) { e.preventDefault(); e.stopPropagation(); this.isDragging = false; }

  onFileDrop(e: DragEvent, type: string): void {
    e.preventDefault(); e.stopPropagation(); this.isDragging = false;
    const files = Array.from(e.dataTransfer?.files || []);
    files.forEach(f => this.assignFile(f, type));
  }

  onFileSelect(e: Event, type: string): void {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    files.forEach(f => this.assignFile(f, type));
    input.value = ''; // reset so same file can be re-added if needed
  }

  assignFile(file: File, type: string): void {
    if (file.size > 10 * 1024 * 1024) {
      this.messageService.add({ severity: 'error', summary: 'File Too Large', detail: `${file.name} exceeds 10 MB.` }); return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type)) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Type', detail: 'JPG, PNG or PDF only.' }); return;
    }

    if (type === 'receipt') {
      this.companyReceiptFiles.push(file);
      if (this.isImageFile(file)) this.companyReceiptPreviews.push(URL.createObjectURL(file));
      else this.companyReceiptPreviews.push('');
    } else if (type === 'employeeReceipt') {
      this.employeeReceiptFiles.push(file);
      if (this.isImageFile(file)) this.employeeReceiptPreviews.push(URL.createObjectURL(file));
      else this.employeeReceiptPreviews.push('');
    }
  }

  removeFile(type: string, index: number): void {
    if (type === 'receipt') {
      if (this.companyReceiptPreviews[index]) URL.revokeObjectURL(this.companyReceiptPreviews[index]);
      this.companyReceiptFiles.splice(index, 1);
      this.companyReceiptPreviews.splice(index, 1);
    } else if (type === 'employeeReceipt') {
      if (this.employeeReceiptPreviews[index]) URL.revokeObjectURL(this.employeeReceiptPreviews[index]);
      this.employeeReceiptFiles.splice(index, 1);
      this.employeeReceiptPreviews.splice(index, 1);
    }
  }

  isImageFile(f: File | null): boolean { return !!f && f.type.startsWith('image/'); }
  isPdfFile(f: File | null): boolean   { return !!f && f.type === 'application/pdf'; }

  private revokeAllPreviews(): void {
    [...this.companyReceiptPreviews, ...this.employeeReceiptPreviews]
      .filter(Boolean)
      .forEach(url => URL.revokeObjectURL(url));
    this.companyReceiptPreviews  = [];
    this.employeeReceiptPreviews = [];
  }

  // ─── Legacy single-file helpers (kept for template backward compat) ───────
  private revokeReceiptPreview(): void {}
  private revokeEmployeeReceiptPreview(): void {}

  // Category / Merchant / Tax modals
  openModal(type: 'category' | 'merchant' | 'tax') {
    if (type === 'category') this.showCategoryModal = true;
    else if (type === 'merchant') this.showMerchantModal = true;
    else this.showTaxModal = true;
  }

  closeModal(type: 'category' | 'merchant' | 'tax') {
    if (type === 'category')      { this.showCategoryModal = false; this.newCategoryData = { name: '', description: '' }; }
    else if (type === 'merchant') { this.showMerchantModal = false; this.newMerchantData = { name: '', phoneNumber: '', address: '', emailAddress: '', contactPersonName: '' }; }
    else                          { this.showTaxModal      = false; this.newTaxData = { name: '', rate: 0, description: '' }; }
  }

  addNewCategory() {
    const name = this.newCategoryData.name?.trim();
    if (!name) return;
    if (this.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      this.messageService.add({ severity: 'error', summary: 'Duplicate', detail: 'Category already exists.' }); return;
    }
    this.expenseService.addCategory({ id: 0, name, description: this.newCategoryData.description?.trim() || '' }).subscribe({
      next: (s) => { this.categories = [...this.categories, s]; this.expenseSummary.category = s.name;
        this.messageService.add({ severity: 'success', summary: 'Added', detail: `"${name}" created.` }); this.closeModal('category'); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Could not save category.' })
    });
  }

  removeCategory(id: number) {
    const cat = this.categories.find(c => c.id === id); if (!cat) return;
    this.categories = this.categories.filter(c => c.id !== id);
    if (this.expenseSummary.category === cat.name) this.expenseSummary.category = null;
    this.messageService.add({ severity: 'success', summary: 'Removed', detail: `"${cat.name}" removed.` });
  }

  addNewMerchant() {
    const name = this.newMerchantData.name?.trim();
    if (!name) { this.messageService.add({ severity: 'error', summary: 'Required', detail: 'Merchant name is required.' }); return; }
    this.expenseService.addMerchant({ id: 0, ...this.newMerchantData, name } as any).subscribe({
      next: (s) => { this.merchants = [...this.merchants, s]; this.expenseSummary.merchant = s.name;
        this.messageService.add({ severity: 'success', summary: 'Added', detail: `"${name}" created.` }); this.closeModal('merchant'); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Could not save merchant.' })
    });
  }

  addNewTaxRate() {
    const name = this.newTaxData.name?.trim();
    if (!name || this.newTaxData.rate < 0) {
      this.messageService.add({ severity: 'error', summary: 'Invalid', detail: 'Name and valid rate required.' }); return;
    }
    if (this.taxRates.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      this.messageService.add({ severity: 'error', summary: 'Duplicate', detail: 'Tax rate already exists.' }); return;
    }
    this.expenseService.addTaxRate({ id: 0, name, rate: this.newTaxData.rate, description: this.newTaxData.description?.trim() }).subscribe({
      next: (s) => { this.taxRates = [...this.taxRates, s]; this.expenseSummary.taxPercentage = s.rate;
        this.messageService.add({ severity: 'success', summary: 'Added', detail: `"${name}" created.` }); this.closeModal('tax'); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Could not save tax rate.' })
    });
  }

  // Advanced payment / bill split
  onAdvancedPaymentSave(p: RecurringPayment) { this.advancedPaymentData = p; this.showAdvancedPayment = false; }
  onAdvancedPaymentCancel() { this.showAdvancedPayment = false; }

  openBillSplit() {
    this.billSplitData = { enabled: true, method: 'equal', participants: [], totalAmount: this.computedTotal };
    this.generateParticipants(); this.showBillSplit = true;
  }

  generateParticipants() {
    if (!this.billSplitData) return;
    this.billSplitData.participants = Array.from({ length: this.numParticipants }, (_, i) =>
      ({ id: `${i + 1}`, name: `Person ${i + 1}`, shareAmount: 0, sharePercent: 0 } as BillSplitParticipant));
    if (this.billSplitData.method === 'equal') this.autoDistributeEqual();
  }

  autoDistributeEqual() {
    if (!this.billSplitData?.participants.length) return;
    const pp = this.computedTotal / this.billSplitData.participants.length;
    this.billSplitData.participants.forEach(p => (p.shareAmount = pp));
    this.billSplitData.totalAmount = this.computedTotal;
  }

  saveBillSplit() {
    this.splitError = null; if (!this.billSplitData) return;
    const total = this.computedTotal;
    if (this.billSplitData.method === 'equal') this.autoDistributeEqual();
    if (this.billSplitData.method === 'percentage') {
      const s = this.billSplitData.participants.reduce((a, p) => a + (p.sharePercent || 0), 0);
      if (s !== 100) { this.splitError = 'Percentages must add up to 100%.'; return; }
      this.billSplitData.participants.forEach(p => (p.shareAmount = (p.sharePercent! / 100) * total));
    }
    if (this.billSplitData.method === 'amount') {
      const s = this.billSplitData.participants.reduce((a, p) => a + (p.shareAmount || 0), 0);
      if (s !== total) { this.splitError = `Amounts must add up to ${total}.`; return; }
    }
    this.billSplitData.totalAmount = total; this.showBillSplit = false;
  }

  removeBillSplit() { this.billSplitData = undefined; this.showBillSplit = false; }

  private convertBillSplitToDTO(b: BillSplit | undefined): any {
    if (!b) return undefined;
    return {
      splitMethod: b.method.toUpperCase(), numberOfPeople: b.participants.length,
      totalAmount: b.totalAmount || 0,
      shares: b.participants.map(p => ({ personName: p.name || 'Unknown', shareAmount: p.shareAmount || 0 }))
    };
  }

  // Misc helpers
  applyFilters(): void {}
  cancelExpenses() { this.router.navigate(['/admin/expenses']); }
  goBack()         { this.router.navigate(['/admin/expenses']); }
  generateId(): string { return Math.random().toString(36).substr(2, 9); }

  resetForm(): void {
    this.expenseSummary = { name: '', description: '', amount: null, merchant: '', category: null, quantity: 1, taxPercentage: null, eventDate: '', paidBy: 'COMPANY' };
    this.companyReceiptFiles = []; this.employeeReceiptFiles = [];
    this.revokeAllPreviews();
    this.signatureUrl = null;
    this.amountMode = 'total';
  }

  formatAmount(value: number | string | null): string {
    const n = Number(value);
    return !isNaN(n) && value !== null ? n.toLocaleString() : '';
  }

  updateAmount(event: any): void {
    const n = Number((event.target.value || '').toString().replace(/,/g, ''));
    this.expenseSummary.amount = !isNaN(n) ? n : null;
  }

  // ─── FIX 7: Tax reflected in total ───────────────────────────────────────
  calculateTotalAmount(): number { return this.computedTotalWithTax; }

  saveExpenseToLocalStorage(expense: any): void {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    expenses.push(expense); localStorage.setItem('expenses', JSON.stringify(expenses));
  }
}
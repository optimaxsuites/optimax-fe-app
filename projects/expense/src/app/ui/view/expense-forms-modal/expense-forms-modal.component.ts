import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpenseService } from '../../service/expense.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { NgForm } from '@angular/forms';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../../sharedComponent/service/auth-service/authentication.service';
import { EmailService } from '../../sharedComponent/service/email.service';
import { Subject } from 'rxjs';
import { debounceTime, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
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

/** Roles that receive new-expense notification emails */
const ADMIN_ROLES = ['ADMIN', 'MANAGER', 'FINANCE', 'HR', 'DEVELOPER'];

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
  expenseSummary: any = { amount: null };
  receiptFile: File | null = null;
  invoiceFile: File | null = null;
  signatureUrl: string | null = null;
  receiptPreviewUrl: string | null = null;
  employeeReceiptPreviewUrl: string | null = null;
  employeeReceiptFile: File | null = null;
  isDragging = false;
  isSendingEmail = false;
  currentStage = 'to-submit';
  productData: any = {};

  // ─── Dropdown data ────────────────────────────────────────────────────────
  categories: { id: number; name: string; description?: string }[] = [];
  categoryNames: string[] = [];
  merchants: { id: number; name: string; phoneNumber: string; address: string; emailAddress: string; contactPersonName: string }[] = [];
  taxRates: { id: number; name: string; rate: number }[] = [];
  selectedCurrency = 'NGN';
  availableCurrencies = ['USD', 'EUR', 'GBP', 'NGN'];

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
    this.searchTermSubject.pipe(debounceTime(300)).subscribe(() => this.applyFilters());

    this.route.queryParams.subscribe((params) => {
      const expenseId = params['id'];
      if (expenseId) {
        this.expenseService.getExpenseById(expenseId).subscribe((expense) => {
          if (expense) {
            this.expenseSummary = { ...expense };
            this.receiptFile  = expense.receiptFile  || null;
            this.invoiceFile  = expense.invoiceFile  || null;
            this.signatureUrl = expense.signature    || null;
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.revokeReceiptPreview();
    this.revokeEmployeeReceiptPreview();
  }

  // RESOLVE CURRENT USER
  //
  // Reads directly from the sessionStorage keys your AuthenticationService
  //
  //   "userPrimaryInfoRegData" — full user object (confirmed key)
  //   "userid"                 — plain ID string (used in isLoggedIn/logout)
  //   "username"               — display name fallback
  private resolveCurrentUser(): { id: number | null; fullname: string; email: string } {
    try {
      const raw =
        sessionStorage.getItem('userPrimaryInfoRegData') ||
        localStorage.getItem('userPrimaryInfoRegData');

      const ud = raw ? JSON.parse(raw) : null;

      const storedId =
        sessionStorage.getItem('userid') ||
        localStorage.getItem('userid');

      const id: number | null =
        (ud && typeof ud.id     === 'number') ? ud.id :
        (ud && typeof ud.userId === 'number') ? ud.userId :
        storedId ? (Number(storedId) || null) : null;

      return {
        id,
        fullname: ud?.fullname
               || ud?.name
               || sessionStorage.getItem('username')
               || localStorage.getItem('username')
               || 'Unknown User',
        email: ud?.email || ud?.emailAddress || '',
      };
    } catch {
      return { id: null, fullname: 'Unknown User', email: '' };
    }
  }

  // RESOLVE ADMIN USERS FROM STORAGE
  //
  // Reads from sessionStorage/localStorage — no HTTP call, no UserService.
  // Probes the most common storage keys for a cached user list.
  private resolveAdminsFromStorage(): { fullname: string; email: string }[] {
    const KEYS = ['allUsers', 'users', 'userList', 'employeeList', 'staffList'];

    for (const key of KEYS) {
      const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (!raw) continue;
      try {
        const list = JSON.parse(raw);
        if (!Array.isArray(list) || !list.length) continue;

        const admins = list.filter((u: any) => {
          const role = (u.role || u.clientType || u.userType || '').toUpperCase();
          return ADMIN_ROLES.some(r => role.includes(r));
        });

        if (admins.length) {
          console.log(`[ExpenseForm] ${admins.length} admin(s) from storage key "${key}"`);
          return admins.map((u: any) => ({
            fullname: u.fullname || u.name || u.username || 'Admin',
            email:    u.email    || u.emailAddress || '',
          }));
        }
      } catch { /* malformed JSON — try next key */ }
    }

    console.warn('[ExpenseForm] No admin list in storage — email notification skipped.');
    return [];
  }

  // SUBMIT EXPENSE
  //
  // Correct email flow — Step 1:
  //   1. expenseBy = logged-in user id  (from sessionStorage "userid")
  //   2. status    = PENDING
  //   3. On success → read admin list from storage → email each admin
  //   4. Do NOT email the submitter here (that happens on approve / reject)
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
    if (!this.receiptFile) {
      this.messageService.add({ severity: 'error', summary: 'Missing Receipt', detail: 'Please upload the receipt file.' }); return;
    }
    if (this.expenseSummary.paidBy === 'EMPLOYEE' && !this.employeeReceiptFile) {
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

    // ── Resolve logged-in user from sessionStorage ────────────────────────
    const currentUser = this.resolveCurrentUser();

    if (!currentUser.id) {
      this.messageService.add({
        severity: 'warn', summary: 'Session Warning',
        detail: 'Your session may have expired. Expense will be saved but may not link to your account correctly.'
      });
    }

    const employeeData: any = {
      name:               this.expenseSummary.name || '',
      description:        this.expenseSummary.description || '',
      eventDate:          this.expenseSummary.eventDate
                            ? new Date(this.expenseSummary.eventDate).toISOString()
                            : new Date().toISOString(),
      quantity:           this.expenseSummary.quantity || 1,
      currency:           this.selectedCurrency,
      amount:             Number(this.expenseSummary.amount) || 0,
      status:             'PENDING',
      paidBy:             (this.expenseSummary.paidBy || 'EMPLOYEE').toUpperCase(),
      receiptReference:   this.expenseSummary.receiptReference || '',
      merchantId:         selectedMerchant.id,
      categoryId:         selectedCategory.id,
      taxId:              selectedTax?.id ?? null,
      scheduledPaymentId: null,
      expenseBy:          currentUser.id,   //  dynamic — from sessionStorage "userid"
    };

    if (this.advancedPaymentData) employeeData.recurringPayment = this.advancedPaymentData;
    if (this.billSplitData)       employeeData.billSplit         = this.convertBillSplitToDTO(this.billSplitData);

    this.expenseService.addExpense(
      employeeData,
      this.receiptFile        || undefined,
      this.employeeReceiptFile || undefined
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success', summary: 'Expense Submitted',
          detail: 'Your expense has been submitted and is pending review.'
        });

        // ✅ Step 1: email admins only — NOT the submitter
        this.notifyAdmins(currentUser.fullname, employeeData.name, employeeData.amount, this.selectedCurrency, currentUser.email);

        this.resetForm();
        form.resetForm();
        this.advancedPaymentData = undefined;
        this.billSplitData       = undefined;
        this.showAdvancedPayment = false;
        this.showBillSplit       = false;
        this.router.navigate(['/admin/expenses']);
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error', summary: 'Submission Failed',
          detail: error.error?.message || error.message || 'An error occurred while submitting the expense.'
        });
      }
    });
  }


  private notifyAdmins(
    submitterName: string,
    expenseName: string,
    amount: number,
    currency: string,
    submitterEmail: string
  ): void {
    const admins = this.resolveAdminsFromStorage();
    if (!admins.length) return;

    this.isSendingEmail = true;
    admins.forEach(admin => {
      if (!admin.email || admin.email.toLowerCase() === submitterEmail.toLowerCase()) return;
      this.emailService.sendExpenseSubmissionAlert(submitterName, admin.email, expenseName, amount, currency)
        .pipe(catchError(err => { console.error(`[notifyAdmins] ❌ ${admin.email}:`, err); return of(null); }))
        .subscribe(() => console.log(`[notifyAdmins] ✉️  ${admin.email}`));
    });
    this.isSendingEmail = false;
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

  // File handling
  onDragOver(e: DragEvent)  { e.preventDefault(); e.stopPropagation(); this.isDragging = true; }
  onDragLeave(e: DragEvent) { e.preventDefault(); e.stopPropagation(); this.isDragging = false; }

  onFileDrop(e: DragEvent, type: string): void {
    e.preventDefault(); e.stopPropagation(); this.isDragging = false;
    if (e.dataTransfer?.files[0]) this.assignFile(e.dataTransfer.files[0], type);
  }

  onFileSelect(e: Event, type: string): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) this.assignFile(input.files[0], type);
  }

  assignFile(file: File, type: string): void {
    if (file.size > 10 * 1024 * 1024) {
      this.messageService.add({ severity: 'error', summary: 'File Too Large', detail: 'Max 10 MB.' }); return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type)) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Type', detail: 'JPG, PNG or PDF only.' }); return;
    }
    if (type === 'receipt') {
      this.revokeReceiptPreview(); this.receiptFile = file;
      if (this.isImageFile(file)) this.receiptPreviewUrl = URL.createObjectURL(file);
    } else if (type === 'invoice') {
      this.invoiceFile = file;
    } else if (type === 'employeeReceipt') {
      this.revokeEmployeeReceiptPreview(); this.employeeReceiptFile = file;
      if (this.isImageFile(file)) this.employeeReceiptPreviewUrl = URL.createObjectURL(file);
    }
  }

  removeFile(type: string): void {
    if (type === 'receipt')              { this.receiptFile         = null; this.revokeReceiptPreview(); }
    else if (type === 'invoice')         { this.invoiceFile         = null; }
    else if (type === 'employeeReceipt') { this.employeeReceiptFile = null; this.revokeEmployeeReceiptPreview(); }
  }

  isImageFile(f: File | null): boolean { return !!f && f.type.startsWith('image/'); }
  isPdfFile(f: File | null): boolean   { return !!f && f.type === 'application/pdf'; }

  private revokeReceiptPreview(): void {
    if (this.receiptPreviewUrl) { URL.revokeObjectURL(this.receiptPreviewUrl); this.receiptPreviewUrl = null; }
  }

  private revokeEmployeeReceiptPreview(): void {
    if (this.employeeReceiptPreviewUrl) { URL.revokeObjectURL(this.employeeReceiptPreviewUrl); this.employeeReceiptPreviewUrl = null; }
  }

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
    this.billSplitData = { enabled: true, method: 'equal', participants: [], totalAmount: this.expenseSummary.amount };
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
    const pp = this.expenseSummary.amount / this.billSplitData.participants.length;
    this.billSplitData.participants.forEach(p => (p.shareAmount = pp));
    this.billSplitData.totalAmount = this.expenseSummary.amount;
  }

  saveBillSplit() {
    this.splitError = null; if (!this.billSplitData) return;
    const total = this.expenseSummary.amount;
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
    this.expenseSummary = { name: '', description: '', amount: null, merchant: '', category: null, quantity: null, taxPercentage: null, eventDate: '' };
    this.receiptFile = null; this.invoiceFile = null; this.employeeReceiptFile = null; this.signatureUrl = null;
    this.revokeReceiptPreview(); this.revokeEmployeeReceiptPreview();
  }

  formatAmount(value: number | string | null): string {
    const n = Number(value);
    return !isNaN(n) && value !== null ? n.toLocaleString() : '';
  }

  updateAmount(event: any): void {
    const n = Number((event.target.value || '').toString().replace(/,/g, ''));
    this.expenseSummary.amount = !isNaN(n) ? n : null;
  }

  calculateTotalAmount(): number {
    if (!this.expenseSummary.amount || !this.expenseSummary.taxPercentage) return this.expenseSummary.amount || 0;
    const base = Number(this.expenseSummary.amount);
    return base + base * (Number(this.expenseSummary.taxPercentage) / 100);
  }

  saveExpenseToLocalStorage(expense: any): void {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    expenses.push(expense); localStorage.setItem('expenses', JSON.stringify(expenses));
  }
}
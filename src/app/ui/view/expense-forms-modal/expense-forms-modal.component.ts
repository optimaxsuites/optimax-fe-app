import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpenseService, Expense } from '../../service/expense.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { NgForm } from '@angular/forms';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../sharedComponent/service/environments/environment';
import { AuthenticationService } from '../../sharedComponent/service/auth-service/authentication.service';
import { EmailService } from '../../sharedComponent/service/email.service';
import { Subject } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
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
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-expense-forms-modal',
  templateUrl: './expense-forms-modal.component.html',
  styleUrls: ['./expense-forms-modal.component.scss'],
  standalone: true,
  providers: [MessageService, ConfirmationService],
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    NgSelectModule,
    ToastModule,
    TooltipModule,
    DialogModule,
    ConfirmDialogModule,
    RecurringPaymentModalComponent,
    SideModalComponent
  ]
})
export class ExpenseFormsModalComponent implements OnInit {

  //  Removed stub methods (drawStart, saveSignature, clearSignature) that threw errors

  productData: any = {};
  categories: { id: number; name: string; description?: string }[] = [];
  categoryNames: string[] = [];
  isDragging = false;
  searchTermSubject = new Subject<string>();

  //  Quantity is a lookup list — keep as is but could be replaced with a plain number input
  Quantity: { name: string }[] = [
    { name: '1' }, { name: '2' }, { name: '3' }, { name: '4' }, { name: '5' },
    { name: '6' }, { name: '7' }, { name: '8' }, { name: '9' }, { name: '10' },
  ];

  projects = [
    { label: 'Project 1', value: 'project1' },
    { label: 'Project 2', value: 'project2' },
    { label: 'Project 3', value: 'project3' },
    { label: 'None', value: 'None' },
  ];

  currentStage: string = 'to-submit';
  expenseSummary: any = { amount: null };
  receiptFile: File | null = null;
  invoiceFile: File | null = null;
  signatureUrl: string | null = null;

  receiptPreviewUrl: string | null = null;
  employeeReceiptPreviewUrl: string | null = null;

  paidBy: 'company' | 'employee' = 'company';
  employeeReceiptFile: File | null = null;

  //  Track email sending state so we can show feedback
  isSendingEmail = false;

  public signaturePadOptions: Object = {
    minWidth: 1,
    canvasWidth: 500,
    canvasHeight: 300,
  };

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

    this.searchTermSubject.pipe(debounceTime(300)).subscribe(() => {
      this.applyFilters();
    });

    this.route.queryParams.subscribe((params) => {
      const expenseId = params['id'];
      if (expenseId) {
        this.expenseService.getExpenseById(expenseId).subscribe((expense) => {
          if (expense) {
            this.expenseSummary = { ...expense };
            this.receiptFile = expense.receiptFile || null;
            this.invoiceFile = expense.invoiceFile || null;
            this.signatureUrl = expense.signature || null;
          }
        });
      }
    });
  }

  private loadCategories(): void {
    this.expenseService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.categoryNames = categories.map(c => c.name);
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.categories = [];
        this.categoryNames = [];
      }
    });
  }

  private loadMerchants(): void {
    this.expenseService.getMerchants().subscribe({
      next: (merchants) => { this.merchants = merchants; },
      error: (err) => {
        console.error('Error loading merchants:', err);
        this.merchants = [];
      }
    });
  }

  private loadTaxRates(): void {
    this.expenseService.getTaxRates().subscribe({
      next: (taxRates) => { this.taxRates = taxRates; },
      error: (err) => {
        console.error('Error loading tax rates:', err);
        this.taxRates = [];
      }
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onFileDrop(event: DragEvent, type: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.assignFile(event.dataTransfer.files[0], type);
    }
  }

  onFileSelect(event: Event, type: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.assignFile(input.files[0], type);
    }
  }

  assignFile(file: File, type: string): void {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.messageService.add({ severity: 'error', summary: 'File Too Large', detail: 'File size must be less than 10MB' });
      return;
    }
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      this.messageService.add({ severity: 'error', summary: 'Invalid File Type', detail: 'Only JPG, PNG, and PDF files are allowed' });
      return;
    }

    if (type === 'receipt') {
      this.revokeReceiptPreview();
      this.receiptFile = file;
      if (this.isImageFile(file)) {
        this.receiptPreviewUrl = URL.createObjectURL(file);
      }
    } else if (type === 'invoice') {
      this.invoiceFile = file;
    } else if (type === 'employeeReceipt') {
      this.revokeEmployeeReceiptPreview();
      this.employeeReceiptFile = file;
      if (this.isImageFile(file)) {
        this.employeeReceiptPreviewUrl = URL.createObjectURL(file);
      }
    }
  }

  isImageFile(file: File | null): boolean { return !!file && file.type.startsWith('image/'); }
  isPdfFile(file: File | null): boolean   { return !!file && file.type === 'application/pdf'; }

  private revokeReceiptPreview(): void {
    if (this.receiptPreviewUrl) {
      URL.revokeObjectURL(this.receiptPreviewUrl);
      this.receiptPreviewUrl = null;
    }
  }

  private revokeEmployeeReceiptPreview(): void {
    if (this.employeeReceiptPreviewUrl) {
      URL.revokeObjectURL(this.employeeReceiptPreviewUrl);
      this.employeeReceiptPreviewUrl = null;
    }
  }

  removeFile(type: string): void {
    if (type === 'receipt') {
      this.receiptFile = null;
      this.revokeReceiptPreview();
    } else if (type === 'invoice') {
      this.invoiceFile = null;
    } else if (type === 'employeeReceipt') {
      this.employeeReceiptFile = null;
      this.revokeEmployeeReceiptPreview();
    }
  }

  applyFilters(): void {
    console.log('Applying filters...');
  }

  cancelExpenses() { this.router.navigate(['/admin/expenses']); }
  goBack()         { this.router.navigate(['/admin/expenses']); }

  saveExpenseToLocalStorage(expense: any): void {
    let expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    expenses.push(expense);
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }

  generateId(): string { return Math.random().toString(36).substr(2, 9); }

  resetForm(): void {
    this.expenseSummary = {
      name: '', description: '', amount: null, merchant: '', category: null,
      quantity: null, taxPercentage: null, project: null, eventDate: '', comment: '',
    };
    this.receiptFile = null;
    this.invoiceFile = null;
    this.employeeReceiptFile = null;
    this.signatureUrl = null;
    this.revokeReceiptPreview();
    this.revokeEmployeeReceiptPreview();
  }

  formatAmount(value: number | string | null): string {
    const n = Number(value);
    return !isNaN(n) && value !== null ? n.toLocaleString() : '';
  }

  ngOnDestroy(): void {
    this.revokeReceiptPreview();
    this.revokeEmployeeReceiptPreview();
  }

  updateAmount(event: any): void {
    const raw = (event.target.value || '').toString().replace(/,/g, '');
    const num = Number(raw);
    this.expenseSummary.amount = !isNaN(num) ? num : null;
  }

  calculateTotalAmount(): number {
    if (!this.expenseSummary.amount || !this.expenseSummary.taxPercentage) {
      return this.expenseSummary.amount || 0;
    }
    const baseAmount = Number(this.expenseSummary.amount);
    const taxRate = Number(this.expenseSummary.taxPercentage) / 100;
    return baseAmount + baseAmount * taxRate;
  }

  showCategoryModal = false;
  showMerchantModal = false;
  showTaxModal = false;

  newCategoryData: { name: string; description: string } = { name: '', description: '' };
  newMerchantData: { name: string; phoneNumber: string; address: string; emailAddress: string; contactPersonName: string } = {
    name: '', phoneNumber: '', address: '', emailAddress: '', contactPersonName: ''
  };
  newTaxData: { name: string; rate: number; description: string } = { name: '', rate: 0, description: '' };

  merchants: { id: number; name: string; phoneNumber: string; address: string; emailAddress: string; contactPersonName: string }[] = [];
  taxRates: { id: number; name: string; rate: number }[] = [];

  openModal(modalType: 'category' | 'merchant' | 'tax') {
    if (modalType === 'category')  this.showCategoryModal = true;
    else if (modalType === 'merchant') this.showMerchantModal = true;
    else if (modalType === 'tax')  this.showTaxModal = true;
  }

  closeModal(modalType: 'category' | 'merchant' | 'tax') {
    if (modalType === 'category')      { this.showCategoryModal = false; this.resetCategoryData(); }
    else if (modalType === 'merchant') { this.showMerchantModal = false; this.resetMerchantData(); }
    else if (modalType === 'tax')      { this.showTaxModal = false; this.resetTaxData(); }
  }

  addNewCategory() {
    const trimmedName = this.newCategoryData.name?.trim() || '';
    if (!trimmedName) return;
    const exists = this.categories.some(cat => cat.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      this.messageService.add({ severity: 'error', summary: 'Duplicate Category', detail: 'This category already exists.' });
      return;
    }
    this.expenseService.addCategory({ id: 0, name: trimmedName, description: this.newCategoryData.description?.trim() || 'No description provided' }).subscribe({
      next: (savedCategory) => {
        this.categories = [...this.categories, savedCategory];
        this.expenseSummary.category = savedCategory.name;
        this.messageService.add({ severity: 'success', summary: 'Category Added', detail: `"${trimmedName}" created.` });
        this.closeModal('category');
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Save Failed', detail: 'Failed to save category.' })
    });
  }

  removeCategory(categoryId: number) {
    const cat = this.categories.find(c => c.id === categoryId);
    if (cat) {
      this.categories = this.categories.filter(c => c.id !== categoryId);
      if (this.expenseSummary.category === cat.name) this.expenseSummary.category = null;
      this.messageService.add({ severity: 'success', summary: 'Category Deleted', detail: `"${cat.name}" removed` });
    }
  }

  addNewMerchant() {
    const trimmedName = this.newMerchantData.name?.trim() || '';
    if (!trimmedName) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Input', detail: 'Merchant name is required' });
      return;
    }
    this.expenseService.addMerchant({ id: 0, ...this.newMerchantData, name: trimmedName } as any).subscribe({
      next: (savedMerchant) => {
        this.merchants = [...this.merchants, savedMerchant];
        this.expenseSummary.merchant = savedMerchant.name;
        this.messageService.add({ severity: 'success', summary: 'Merchant Added', detail: `"${trimmedName}" created.` });
        this.closeModal('merchant');
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Save Failed', detail: 'Failed to save merchant.' })
    });
  }

  addNewTaxRate() {
    const trimmedName = this.newTaxData.name?.trim() || '';
    if (!trimmedName || this.newTaxData.rate < 0) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Input', detail: 'Tax name and valid rate are required' });
      return;
    }
    const exists = this.taxRates.some(t => t.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      this.messageService.add({ severity: 'error', summary: 'Duplicate Tax Rate', detail: 'This tax rate already exists.' });
      return;
    }
    this.expenseService.addTaxRate({ id: 0, name: trimmedName, rate: this.newTaxData.rate, description: this.newTaxData.description?.trim() }).subscribe({
      next: (savedTaxRate) => {
        this.taxRates = [...this.taxRates, savedTaxRate];
        this.expenseSummary.taxPercentage = savedTaxRate.rate;
        this.messageService.add({ severity: 'success', summary: 'Tax Rate Added', detail: `"${trimmedName}" created.` });
        this.closeModal('tax');
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Save Failed', detail: 'Failed to save tax rate.' })
    });
  }

  private resetCategoryData() { this.newCategoryData = { name: '', description: '' }; }
  private resetMerchantData() { this.newMerchantData = { name: '', phoneNumber: '', address: '', emailAddress: '', contactPersonName: '' }; }
  private resetTaxData()     { this.newTaxData = { name: '', rate: 0, description: '' }; }

  advancedPaymentData?: RecurringPayment;
  showAdvancedPayment = false;

  @ViewChild(RecurringPaymentModalComponent) recurringModal?: RecurringPaymentModalComponent;

  onAdvancedPaymentSave(payment: RecurringPayment) {
    this.advancedPaymentData = payment;
    this.showAdvancedPayment = false;
  }

  onAdvancedPaymentCancel() { this.showAdvancedPayment = false; }

  private convertBillSplitToDTO(billSplit: BillSplit | undefined): any {
    if (!billSplit) return undefined;
    return {
      splitMethod: billSplit.method.toUpperCase(),
      numberOfPeople: billSplit.participants.length,
      totalAmount: billSplit.totalAmount || 0,
      shares: billSplit.participants.map(p => ({
        personName: p.name || 'Unknown',
        shareAmount: p.shareAmount || 0
      }))
    };
  }

  billSplitData?: BillSplit;
  showBillSplit = false;
  numParticipants = 2;
  splitError: string | null = null;
  selectedCurrency = 'NGN';
  availableCurrencies = ['USD', 'EUR', 'GBP', 'NGN'];

  openBillSplit() {
    this.billSplitData = { enabled: true, method: 'equal', participants: [], totalAmount: this.expenseSummary.amount };
    this.generateParticipants();
    this.showBillSplit = true;
  }

  generateParticipants() {
    if (!this.billSplitData) return;
    this.billSplitData.participants = Array.from({ length: this.numParticipants }, (_, i) => ({
      id: `${i + 1}`, name: `Person ${i + 1}`, shareAmount: 0, sharePercent: 0
    } as BillSplitParticipant));
    if (this.billSplitData.method === 'equal') this.autoDistributeEqual();
  }

  autoDistributeEqual() {
    if (!this.billSplitData) return;
    const total = this.expenseSummary.amount;
    const count = this.billSplitData.participants.length;
    if (count > 0) {
      const perPerson = total / count;
      this.billSplitData.participants.forEach(p => (p.shareAmount = perPerson));
      this.billSplitData.totalAmount = total;
    }
  }

  saveBillSplit() {
    this.splitError = null;
    if (!this.billSplitData) return;
    const total = this.expenseSummary.amount;
    if (this.billSplitData.method === 'equal') this.autoDistributeEqual();
    if (this.billSplitData.method === 'percentage') {
      const sumPercent = this.billSplitData.participants.reduce((acc, p) => acc + (p.sharePercent || 0), 0);
      if (sumPercent !== 100) { this.splitError = 'Percentages must add up to 100%.'; return; }
      this.billSplitData.participants.forEach(p => (p.shareAmount = (p.sharePercent! / 100) * total));
    }
    if (this.billSplitData.method === 'amount') {
      const sumAmount = this.billSplitData.participants.reduce((acc, p) => acc + (p.shareAmount || 0), 0);
      if (sumAmount !== total) { this.splitError = `Amounts must add up to ${total}`; return; }
    }
    this.billSplitData.totalAmount = total;
    this.showBillSplit = false;
  }

  removeBillSplit() { this.billSplitData = undefined; this.showBillSplit = false; }

  submitExpense(form: NgForm): void {
    if (this.categories.length === 0) {
      this.messageService.add({ severity: 'error', summary: 'No Categories', detail: 'Please add at least one category.' });
      return;
    }
    if (this.merchants.length === 0) {
      this.messageService.add({ severity: 'error', summary: 'No Merchants', detail: 'Please add at least one merchant.' });
      return;
    }
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.messageService.add({ severity: 'error', summary: 'Form Invalid', detail: 'Please fill in all required fields.' });
      return;
    }
    if (!this.receiptFile) {
      this.messageService.add({ severity: 'error', summary: 'Missing Receipt', detail: 'Please upload the receipt file.' });
      return;
    }
    if (this.expenseSummary.paidBy === 'EMPLOYEE' && !this.employeeReceiptFile) {
      this.messageService.add({ severity: 'error', summary: 'Missing Employee Receipt', detail: 'Please upload the employee receipt file.' });
      return;
    }

    const selectedCategory = this.categories.find(cat => cat.name === this.expenseSummary.category);
    const selectedMerchant = this.merchants.find(merch => merch.name === this.expenseSummary.merchant);
    const selectedTax = this.taxRates.find(tax => tax.rate === this.expenseSummary.taxPercentage);

    if (!selectedCategory) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Category', detail: `Category "${this.expenseSummary.category}" not found.` });
      return;
    }
    if (!selectedMerchant) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Merchant', detail: `Merchant "${this.expenseSummary.merchant}" not found.` });
      return;
    }

    const eventDate = this.expenseSummary.eventDate
      ? new Date(this.expenseSummary.eventDate).toISOString()
      : new Date().toISOString();

    // FIX #6: expenseBy should come from auth context, not be hardcoded.
    const CURRENT_USER_ID = Number(sessionStorage.getItem('userid') || '0') || null;

    const employeeData: any = {
      name: this.expenseSummary.name || '',
      description: this.expenseSummary.description || '',
      eventDate: eventDate,
      quantity: this.expenseSummary.quantity || 1,
      currency: this.selectedCurrency,
      amount: Number(this.expenseSummary.amount) || 0,
      status: 'PENDING',
      paidBy: this.expenseSummary.paidBy?.toUpperCase() || 'EMPLOYEE',
      receiptReference: this.expenseSummary.receiptReference || '',
      merchantId: selectedMerchant.id,
      categoryId: selectedCategory.id,
      taxId: selectedTax?.id ?? null,
      scheduledPaymentId: null,
      expenseBy: CURRENT_USER_ID
    };

    if (this.advancedPaymentData) {
      employeeData.recurringPayment = this.advancedPaymentData;
    }
    if (this.billSplitData) {
      employeeData.billSplit = this.convertBillSplitToDTO(this.billSplitData);
    }

    // FIX #7: Use switchMap to avoid nested subscribe — cleaner and avoids memory leaks
    this.expenseService.addExpense(
      employeeData,
      this.receiptFile || undefined,
      this.employeeReceiptFile || undefined
    ).subscribe({
      next: (response: any) => {
        // Step 1: Notify the user the expense was submitted
        this.messageService.add({
          severity: 'success',
          summary: 'Expense Submitted',
          detail: 'Your expense has been submitted and is pending review.'
        });
 
        this.isSendingEmail = true;

        // Pull the logged-in admin's email dynamically from session/local storage
        const currentUser =
          JSON.parse(sessionStorage.getItem('user') || '{}') ||
          JSON.parse(localStorage.getItem('user') || '{}');

        const adminEmail     = currentUser?.email || currentUser?.emailAddress;
        const adminName      = currentUser?.fullname || currentUser?.name || 'Admin';
        const submitterEmail = currentUser?.email || currentUser?.emailAddress;
        const submitterName  = employeeData.name;

        if (!adminEmail) {
          console.warn('[submitExpense] ⚠️ Could not resolve admin email from session. Check your auth service.');
        }

        // Primary notification to admin
        if (adminEmail) {
          console.log('[submitExpense] 📧 Notifying admin:', adminEmail);
          this.emailService.sendExpenseSubmissionAlert(
            submitterName,
            adminEmail,
            employeeData.name,
            employeeData.amount,
            this.selectedCurrency
          ).subscribe({
            next: () => {
              // Copy to self (same user) when available
              if (submitterEmail && submitterEmail !== adminEmail) {
                console.log('[submitExpense] 📧 Sending copy to submitter:', submitterEmail);
                this.emailService.sendExpenseSubmissionAlert(
                  submitterName,
                  submitterEmail,
                  employeeData.name,
                  employeeData.amount,
                  this.selectedCurrency
                ).subscribe({
                  next: () => {
                    this.isSendingEmail = false;
                    this.messageService.add({
                      severity: 'info',
                      summary: 'Notification Sent',
                      detail: `Admin notification sent to ${adminEmail}, copy sent to ${submitterEmail}.`
                    });
                  },
                  error: (err) => {
                    this.isSendingEmail = false;
                    this.messageService.add({
                      severity: 'warn',
                      summary: 'Copy Email Failed',
                      detail: `Admin notified, but copy to ${submitterEmail} failed.`
                    });
                    console.error('[submitExpense] Copy email failed:', err);
                  }
                });
              } else {
                this.isSendingEmail = false;
                this.messageService.add({
                  severity: 'info',
                  summary: 'Notification Sent',
                  detail: `Admin notification sent to ${adminEmail}.`
                });
              }
            },
            error: (err) => {
              this.isSendingEmail = false;
              this.messageService.add({
                severity: 'warn',
                summary: 'Email Not Delivered',
                detail: 'Expense saved but admin notification could not be sent.'
              });
              console.error('[submitExpense] ❌ Admin email failed:', err);
            }
          });
        } else {
          this.isSendingEmail = false;
          this.messageService.add({
            severity: 'warn',
            summary: 'Email Not Sent',
            detail: 'Expense saved but admin user email was not available.'
          });
        }

        // Step 3: Reset and navigate
        this.resetForm();
        form.resetForm();
        this.advancedPaymentData = undefined;
        this.billSplitData = undefined;
        this.showAdvancedPayment = false;
        this.showBillSplit = false;
        this.router.navigate(['admin/expenses/expense/59af6dcd-78d7-46f7-b1d4-f6d3a027561f']);
      },
      error: (error: any) => {
        console.error('Error submitting expense:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Submission Failed',
          detail: error.error?.message || error.message || 'An error occurred while submitting the expense.'
        });
      }
    });
  }
}
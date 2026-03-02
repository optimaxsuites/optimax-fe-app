import { Component, OnInit, ViewChild } from '@angular/core';
import { ExpenseService, Expense } from '../../service/expense.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { NgForm } from '@angular/forms';
import { Location } from '@angular/common';
// import { RecurringPaymentModalComponent } from "../../sharedComponent/view/recurring-payment-modal/recurring-payment-modal.component";
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { RecurringPayment } from '../../sharedComponent/view/recurring-payment-modal/recurring-payment.model';
import { RecurringPaymentModalComponent } from '../../sharedComponent/view/recurring-payment-modal/recurring-payment-modal.component';
import { BillSplit, BillSplitParticipant } from '../../sharedComponent/view/bill-splitting-modal/bill-splitting.model';

type PaidByBackend = 'COMPANY' | 'EMPLOYEE';

@Component({
  selector: 'app-expense-forms-modal',
  templateUrl: './expense-forms-modal.component.html',
  styleUrls: ['./expense-forms-modal.component.scss'],
  providers: [MessageService]
})
export class ExpenseFormsModalComponent implements OnInit {
  drawStart() { throw new Error('Method not implemented.'); }
  saveSignature() { throw new Error('Method not implemented.'); }
  clearSignature() { throw new Error('Method not implemented.'); }

  productData: any = {};
  categories: { id: number; name: string; description?: string }[] = [];
  categoryNames: string[] = [];
  isDragging = false;
  searchTermSubject = new Subject<string>();

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

  // Who paid — drives employee receipt requirement
  paidBy: 'company' | 'employee' = 'company';
  employeeReceiptFile: File | null = null;

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
    private location: Location
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

  // ── File drag/drop/upload helpers ──────────────────────────────────────────

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
    if (type === 'receipt')          this.receiptFile = file;
    else if (type === 'invoice')     this.invoiceFile = file;
    else if (type === 'employeeReceipt') this.employeeReceiptFile = file;
  }

  isImageFile(file: File): boolean { return file.type.startsWith('image/'); }
  isPdfFile(file: File): boolean   { return file.type === 'application/pdf'; }
  getFilePreview(file: File): string {
    return this.isImageFile(file) ? URL.createObjectURL(file) : '';
  }

  removeFile(type: string): void {
    if (type === 'receipt')          this.receiptFile = null;
    else if (type === 'invoice')     this.invoiceFile = null;
    else if (type === 'employeeReceipt') this.employeeReceiptFile = null;
  }

  applyFilters(): void {
    console.log('Applying filters...');
  }

  cancelExpenses() { this.router.navigate(['/expense/:uuid']); }
  goBack()         { this.router.navigate(['/expense/:uuid']); }

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
  }

  formatAmount(value: number | string | null): string {
    const n = Number(value);
    return !isNaN(n) && value !== null ? n.toLocaleString() : '';
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

  // ── Modals ─────────────────────────────────────────────────────────────────

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
    if (modalType === 'category') this.showCategoryModal = true;
    else if (modalType === 'merchant') this.showMerchantModal = true;
    else if (modalType === 'tax') this.showTaxModal = true;
  }

  closeModal(modalType: 'category' | 'merchant' | 'tax') {
    if (modalType === 'category')  { this.showCategoryModal = false; this.resetCategoryData(); }
    else if (modalType === 'merchant') { this.showMerchantModal = false; this.resetMerchantData(); }
    else if (modalType === 'tax')  { this.showTaxModal = false; this.resetTaxData(); }
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
        this.messageService.add({ severity: 'success', summary: 'Category added', detail: `Category "${trimmedName}" created.` });
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
      this.messageService.add({ severity: 'success', summary: 'Category deleted', detail: `"${cat.name}" removed` });
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

  // ── Recurring / Advanced Payment ────────────────────────────────────────────

  advancedPaymentData?: RecurringPayment;
  showAdvancedPayment = false;

  @ViewChild(RecurringPaymentModalComponent) recurringModal?: RecurringPaymentModalComponent;

  onAdvancedPaymentSave(payment: RecurringPayment) {
    this.advancedPaymentData = payment;
    this.showAdvancedPayment = false;
    console.log('Recurring Payment Saved:', payment);
  }

  onAdvancedPaymentCancel() { this.showAdvancedPayment = false; }

  // ── Submit ──────────────────────────────────────────────────────────────────

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

    const selectedCategory = this.categories.find(cat => cat.name === this.expenseSummary.category);
    const selectedMerchant = this.merchants.find(merch => merch.name === this.expenseSummary.merchant);
    const selectedTax = this.taxRates.find(tax => tax.rate === this.expenseSummary.taxPercentage);

    if (!selectedCategory) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Category', detail: `Category "${this.expenseSummary.category}" not found.` }); return;
    }
    if (!selectedMerchant) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Merchant', detail: `Merchant "${this.expenseSummary.merchant}" not found.` }); return;
    }

    const apiExpense: any = {
      name: this.expenseSummary.name || '',
      description: this.expenseSummary.description || '',
      eventDate: this.expenseSummary.eventDate || new Date().toISOString().split('T')[0],
      quantity: this.expenseSummary.quantity || 1,
      currency: this.selectedCurrency,
      amount: Number(this.expenseSummary.amount) || 0,
      status: 'PENDING',
      paidBy: this.expenseSummary.paidBy?.toUpperCase() || 'EMPLOYEE',
      receiptReference: this.expenseSummary.receiptReference || '',
      merchantId: selectedMerchant.id,
      categoryId: selectedCategory.id,
      taxId: selectedTax ? selectedTax.id : 1,
      scheduledPaymentId: 0
    };

    if (this.advancedPaymentData) {
      apiExpense.recurringPayment = this.advancedPaymentData;
    }
    if (this.billSplitData) {
      apiExpense.billSplit = this.convertBillSplitToDTO(this.billSplitData);
    }

    const isNewExpense = !this.expenseSummary.id;
    const obs = isNewExpense
      ? this.expenseService.addExpense(apiExpense)
      : this.expenseService.updateExpense(apiExpense.id, apiExpense);

    obs.subscribe({
      next: (response: any) => {
        console.log('Expense saved:', response);

        // ✅ Upload receipts using the saved expense's ID
        const savedId = String(response.id || this.expenseSummary.id);

        const uploadTasks: Promise<void>[] = [];

        // Upload company receipt
        if (this.receiptFile) {
          const companyUpload = this.expenseService
            .uploadCompanyReceipt(savedId, this.receiptFile)
            .toPromise()
            .then(() => console.log('Company receipt uploaded'))
            .catch(err => console.warn('Company receipt upload failed:', err));
          uploadTasks.push(companyUpload);
        }

        // Upload employee receipt if paid by employee
        if (this.expenseSummary.paidBy?.toUpperCase() === 'EMPLOYEE' && this.employeeReceiptFile) {
          const employeeUpload = this.expenseService
            .uploadEmployeeReceipt(savedId, this.employeeReceiptFile)
            .toPromise()
            .then(() => console.log('Employee receipt uploaded'))
            .catch(err => console.warn('Employee receipt upload failed:', err));
          uploadTasks.push(employeeUpload);
        }

        // Navigate after all uploads complete (or fail gracefully)
        Promise.allSettled(uploadTasks).then(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Expense Submitted',
            detail: 'Expense and receipts successfully submitted.'
          });
          this.resetForm();
          form.resetForm();
          this.advancedPaymentData = undefined;
          this.billSplitData = undefined;
          this.showAdvancedPayment = false;
          this.showBillSplit = false;
          this.router.navigate(['/expenses']);
        });
      },
      error: (error: any) => {
        console.error('Error submitting expense:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Submission Failed',
          detail: error.message || 'An error occurred while submitting the expense.'
        });
      }
    });
  }

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

  // ── Bill Split ──────────────────────────────────────────────────────────────

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
}
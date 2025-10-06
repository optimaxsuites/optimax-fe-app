import { Component, OnInit, ViewChild } from '@angular/core';
import { ExpenseService, Expense, ExpenseStatus, CategoryDTO, MerchantDTO, TaxDTO, Currency } from '../../service/expense.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { NgForm } from '@angular/forms';
import { RecurringPaymentModalComponent } from "../../sharedComponent/view/recurring-payment-modal/recurring-payment-modal.component";
import { RecurringPayment } from '../../sharedComponent/view/recurring-payment-modal/recurring-payment.model';
import { BillSplit, BillSplitParticipant } from '../../sharedComponent/view/bill-splitting-modal/bill-splitting.model';

@Component({
  selector: 'app-expense-forms-modal',
  templateUrl: './expense-forms-modal.component.html',
  styleUrls: ['./expense-forms-modal.component.scss'],
  providers: [MessageService],
})
export class ExpenseFormsModalComponent implements OnInit {

  expenseSummary: Partial<Expense> = {};
  receiptFile: File | null = null;
  invoiceFile: File | null = null;
  employeeReceiptFile: File | null = null;
  signatureUrl: string | null = null; 

  categories: CategoryDTO[] = [];
  merchants: MerchantDTO[] = [];
  taxRates: TaxDTO[] = [];
  
  selectedCurrency: Currency = Currency.NGN;
  availableCurrencies = Object.values(Currency);

  showCategoryModal = false;
  showMerchantModal = false;
  showTaxModal = false;

  newCategoryData: Partial<CategoryDTO> = {};
  newMerchantData: Partial<MerchantDTO> = {};
  newTaxData: Partial<TaxDTO> = {};

  advancedPaymentData?: RecurringPayment;
  showAdvancedPayment = false;
  billSplitData?: BillSplit;
  numParticipants = 2;
  showBillSplit = false;
  splitError: string | null = null;

  @ViewChild(RecurringPaymentModalComponent) recurringModal?: RecurringPaymentModalComponent;
  @ViewChild('expenseForm') expenseForm!: NgForm;

  constructor(
    private expenseService: ExpenseService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();

    this.route.queryParams.subscribe((params) => {
      const expenseId = params['id'];
      if (expenseId) {
        this.expenseService.getExpenseById(expenseId).subscribe(
          (expense) => {
            this.expenseSummary = { ...expense };
          },
          (error) => {
            console.error('Error fetching expense:', error);
          }
        );
      }
    });
  }
  
  loadInitialData(): void {
    this.categories = [
      { id: 1, name: 'Administrative', description: 'General administrative expenses and office supplies' },
      { id: 2, name: 'Cost of Goods Sold', description: 'Direct costs related to the production of goods sold by the company' },
      { id: 3, name: 'Employee-Related', description: 'Expenses related to employee salaries, benefits, and training' },
      { id: 4, name: 'Operating Expenses', description: 'Day-to-day expenses required to run the business' },
      { id: 5, name: 'Sales and Marketing', description: 'Costs associated with promoting and selling products or services' },
    ];
    this.merchants = [{ id: 1, name: 'Amazon', phoneNumber: '', address: '', emailAddress: '', contactPersonName: '' }];
    this.taxRates = [{ id: 1, name: 'No Tax', rate: 0, description: ''}, { id: 2, name: 'VAT', rate: 7.5, description: ''}];
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    target.classList.add('dragover');
  }

  onFileDrop(event: DragEvent, type: string): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    target.classList.remove('dragover');
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.assignFile(file, type);
    }
  }

  onFileSelect(event: Event, type: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.assignFile(file, type);
    }
  }
  
  assignFile(file: File, type: string): void {
    if (type === 'receipt') {
      this.receiptFile = file;
    } else if (type === 'invoice') {
      this.invoiceFile = file;
    } else if (type === 'employeeReceipt') {
      this.employeeReceiptFile = file;
    }
  }

  goBack(): void {
    this.router.navigate(['/expenses']);
  }

  cancelExpenses(): void {
    this.goBack();
  }

  submitExpense(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.messageService.add({ severity: 'error', summary: 'Form Invalid', detail: 'Please fill in all required fields.' });
      return;
    }

    if (!this.receiptFile) {
      this.messageService.add({ severity: 'error', summary: 'Missing Receipt', detail: 'Please upload a receipt file.' });
      return;
    }
    
    if (this.expenseSummary.paidBy === 'EMPLOYEE' && !this.employeeReceiptFile) {
      this.messageService.add({ severity: 'error', summary: 'Missing Employee Receipt', detail: 'Please upload the employee receipt file since this expense is paid by the employee.' });
      return;
    }

    const newExpense: Expense = {
      ...this.expenseSummary as Expense,
      id: typeof this.expenseSummary.id === 'number' ? this.expenseSummary.id : this.generateId(),
      status: ExpenseStatus.PENDING,
      amount: Number(this.expenseSummary.amount),
      paidBy: this.expenseSummary.paidBy as Expense['paidBy']
    };

    this.expenseService.addExpense(newExpense).subscribe(
      (response) => {
        console.log('Expense saved:', response);
        this.messageService.add({
          severity: 'success',
          summary: 'Expense Submitted',
          detail: `Expense has been successfully submitted.`
        });
        this.resetForm();
      },
      (error) => {
        console.error('Error submitting expense:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Submission Failed',
          detail: 'An error occurred while submitting the expense. Please try again.'
        });
      }
    );
  }

  generateId(): number {
    return Math.floor(Math.random() * 1000000000);
  }

  resetForm(): void {
    this.expenseSummary = {};
    this.receiptFile = null;
    this.invoiceFile = null;
    this.employeeReceiptFile = null;
    this.signatureUrl = null;
    this.showAdvancedPayment = false;
    this.showBillSplit = false;
    if (this.expenseForm) {
      this.expenseForm.resetForm();
    }
  }

  formatAmount(value: number | string | null | undefined): string {
    const n = Number(value);
    return !isNaN(n) && value !== null && value !== undefined ? n.toLocaleString() : '';
  }

  updateAmount(event: any): void {
    const raw = (event.target.value || '').toString().replace(/,/g, '');
    const num = Number(raw);
    this.expenseSummary.amount = !isNaN(num) ? num : undefined;
  }

  calculateTotalAmount(): number {
    const baseAmount = Number(this.expenseSummary.amount);
    const taxRate = this.expenseSummary.tax ? (this.expenseSummary.tax as TaxDTO).rate / 100 : 0;
    return baseAmount * (1 + taxRate);
  }

  openModal(modalType: 'category' | 'merchant' | 'tax'): void {
    switch(modalType) {
      case 'category':
        this.showCategoryModal = true;
        break;
      case 'merchant':
        this.showMerchantModal = true;
        break;
      case 'tax':
        this.showTaxModal = true;
        break;
    }
  }

  closeModal(modalType: 'category' | 'merchant' | 'tax'): void {
    switch(modalType) {
      case 'category':
        this.showCategoryModal = false;
        this.resetCategoryData();
        break;
      case 'merchant':
        this.showMerchantModal = false;
        this.resetMerchantData();
        break;
      case 'tax':
        this.showTaxModal = false;
        this.resetTaxData();
        break;
    }
  }

  addNewCategory(): void {
    const trimmedName = this.newCategoryData.name?.trim() || '';
    if (!trimmedName) {
      return;
    }
    const exists = this.categories.some(cat => cat.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      this.messageService.add({ severity: 'error', summary: 'Duplicate Category', detail: 'This category already exists.' });
      return;
    }
    const newCategory: CategoryDTO = {
      id: this.categories.length + 1,
      name: trimmedName,
      description: this.newCategoryData.description || 'No description provided'
    };
    this.categories = [...this.categories, newCategory];
    this.expenseSummary.category = newCategory;
    this.messageService.add({ severity: 'success', summary: 'Category added', detail: `Category "${trimmedName}" has been created successfully` });
    this.closeModal('category');
  }

  removeCategory(categoryId: number): void {
    const categoryToDelete = this.categories.find(cat => cat.id === categoryId);
    if (categoryToDelete) {
      this.categories = this.categories.filter(cat => cat.id !== categoryId);
      if (this.expenseSummary.category?.id === categoryId) {
        this.expenseSummary.category = undefined;
      }
      this.messageService.add({ severity: 'success', summary: 'Category deleted', detail: `Category "${categoryToDelete.name}" has been removed` });
    }
  }

  addNewMerchant(): void {
    const trimmedName = this.newMerchantData.name?.trim() || '';
    if (!trimmedName) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Input', detail: 'Merchant name is required' });
      return;
    }
    const newMerchant: MerchantDTO = {
      id: this.merchants.length + 1,
      name: trimmedName,
      phoneNumber: this.newMerchantData.phoneNumber || '',
      address: this.newMerchantData.address || '',
      emailAddress: this.newMerchantData.emailAddress || '',
      contactPersonName: this.newMerchantData.contactPersonName || ''
    };
    this.merchants = [...this.merchants, newMerchant];
    this.expenseSummary.merchant = newMerchant;
    this.messageService.add({ severity: 'success', summary: 'Merchant Added', detail: `Merchant "${trimmedName}" has been created successfully` });
    this.closeModal('merchant');
  }

  addNewTaxRate(): void {
    const trimmedName = this.newTaxData.name?.trim() || '';
    if (!trimmedName || this.newTaxData.rate === undefined || this.newTaxData.rate < 0) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Input', detail: 'Tax name and valid rate are required' });
      return;
    }
    const exists = this.taxRates.some(tax => tax.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      this.messageService.add({ severity: 'error', summary: 'Duplicate Tax Rate', detail: 'This tax rate already exists.' });
      return;
    }
    const newTaxRate: TaxDTO = {
      id: this.taxRates.length + 1,
      name: trimmedName,
      rate: this.newTaxData.rate,
      description: this.newTaxData.description || 'No description provided'
    };
    this.taxRates = [...this.taxRates, newTaxRate];
    this.expenseSummary.tax = newTaxRate;
    this.messageService.add({ severity: 'success', summary: 'Tax Rate Added', detail: `Tax rate "${trimmedName}" has been created successfully` });
    this.closeModal('tax');
  }

  private resetCategoryData(): void {
    this.newCategoryData = {};
  }
  private resetMerchantData(): void {
    this.newMerchantData = {};
  }
  private resetTaxData(): void {
    this.newTaxData = {};
  }

  onAdvancedPaymentSave(payment: RecurringPayment): void {
    this.advancedPaymentData = payment;
    this.showAdvancedPayment = false;
  }
  onAdvancedPaymentCancel(): void {
    this.showAdvancedPayment = false;
  }

  openBillSplit(): void {
    this.billSplitData = {
      enabled: true,
      method: 'equal',
      participants: [],
      totalAmount: this.expenseSummary.amount!
    };
    this.generateParticipants();
    this.showBillSplit = true;
  }

  generateParticipants(): void {
    if (!this.billSplitData) return;
    this.billSplitData.participants = Array.from({ length: this.numParticipants }, (_, i) => ({
      id: `${i + 1}`,
      name: `Person ${i + 1}`,
      shareAmount: 0,
      sharePercent: 0
    } as BillSplitParticipant));
    if (this.billSplitData.method === 'equal') {
      this.autoDistributeEqual();
    }
  }

  autoDistributeEqual(): void {
    if (!this.billSplitData || !this.expenseSummary.amount) return;
    const total = this.expenseSummary.amount;
    const count = this.billSplitData.participants.length;
    if (count > 0) {
      const perPerson = total / count;
      this.billSplitData.participants.forEach(p => {
        p.shareAmount = perPerson;
      });
    }
  }

  saveBillSplit(): void {
    this.splitError = null;
    if (!this.billSplitData) return;
    const total = this.expenseSummary.amount!;
    if (this.billSplitData.method === 'percentage') {
      const sumPercent = this.billSplitData.participants.reduce((acc, p) => acc + (p.sharePercent || 0), 0);
      if (sumPercent !== 100) {
        this.splitError = 'Percentages must add up to 100%.';
        return;
      }
      this.billSplitData.participants.forEach(p => {
        p.shareAmount = (p.sharePercent! / 100) * total;
      });
    }
    if (this.billSplitData.method === 'amount') {
      const sumAmount = this.billSplitData.participants.reduce((acc, p) => acc + (p.shareAmount || 0), 0);
      if (sumAmount !== total) {
        this.splitError = `Amounts must add up to ${total}`;
        return;
      }
    }
    this.billSplitData.totalAmount = total;
    this.showBillSplit = false;
  }

  removeBillSplit(): void {
    this.billSplitData = undefined;
    this.showBillSplit = false;
  }
}
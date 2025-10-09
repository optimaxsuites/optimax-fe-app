import { Component, OnInit, ViewChild } from '@angular/core';
import { ExpenseService, Expense } from '../../service/expense.service';
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
drawStart() {
throw new Error('Method not implemented.');
}
saveSignature() {
throw new Error('Method not implemented.');
}
clearSignature() {
throw new Error('Method not implemented.');
}


  productData: any = {};
  categories: { id: number; name: string; description?:string }[] = [];
 

  Quantity: { name: string }[] = [
    { name: '1' },
    { name: '2' },
    { name: '3' },
    { name: '4' },
    { name: '5' },
    { name: '6' },
    { name: '7' },
    { name: '8' },
    { name: '9' },
    { name: '10' },
  ]

  // paymentMethods = [
  //   { label: 'Cash', value: 'cash' },
  //   { label: 'Credit Card', value: 'credit' },
  //   { label: 'Debit Card', value: 'debit' },
  // ];

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
  // Who paid for this expense (default: company)
paidBy: 'company' | 'employee' = 'company';

// Extra receipt when employee is the payer
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
    private messageService: MessageService
  ) {}

 ngOnInit(): void {
  this.loadCategories();  
  this.loadMerchants();
  this.loadTaxRates();

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
      console.log('Categories loaded:', categories);
    },
    error: (err) => {
      console.error('Error loading categories:', err);
      this.categories = [];
    }
  });

}


private loadMerchants(): void {
  this.expenseService.getMerchants().subscribe({
    next: (merchants) => {
      this.merchants = merchants;
      console.log('Merchants loaded:', merchants);
    },
    error: (err) => {
      console.error('Error loading merchants:', err);
      this.merchants = [];
    }
  });
}

private loadTaxRates(): void {
  this.expenseService.getTaxRates().subscribe({
    next: (taxRates) => {
      this.taxRates = taxRates;
      console.log('Tax rates loaded:', taxRates);
    },
    error: (err) => {
      console.error('Error loading tax rates:', err);
      this.taxRates = [];
    }
  });
}
  
  // onAmountInput(event: any): void {
  //   const input = event.target.value;
  //   if (input < 0) {
  //     this.expenseSummary.amount = 0; 
  //   } else {
  //     this.expenseSummary.amount = input;
  //   }
  // }

  
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

  cancelExpenses() {
    this.router.navigate(['/expense/:uuid']);
  }

  goBack(){
    this.router.navigate(['/expense/:uuid']);
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




  saveExpenseToLocalStorage(expense: any): void {
    // Retrieve existing expenses from localStorage, or initialize an empty array
    let expenses = JSON.parse(localStorage.getItem('expenses') || '[]');

    // Add the new expense to the list
    expenses.push(expense);

    // Save the updated list of expenses back to localStorage
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }
  
  generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
  resetForm(): void {
    // Reset the expenseSummary object (form data)
    this.expenseSummary = {
      name: '',
      description: '',
      amount: null,
      merchant: '',
      category: null,
      quantity: null,
      taxPercentage: null,
      project: null,
      eventDate: '',
      comment: '',
    };
  
    // Reset file inputs
    this.receiptFile = null;
    this.invoiceFile = null;
    this.signatureUrl = null;  // If you have a signature URL to reset
  
    // If using a form reference, you could reset it here (optional if using ngForm)
    // this.expenseForm.reset(); // This would reset if you are using a template-driven form
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
  const taxAmount = baseAmount * taxRate;
  
  return baseAmount + taxAmount;
}

showCategoryModal = false;
showMerchantModal = false;
showTaxModal = false;

newCategoryData: {name: string, description: string } = {
  name: '',
  description: ''
};


newMerchantData: {
  name: string;
  phoneNumber: string;
  address: string;
  emailAddress: string;
  contactPersonName: string
} = {
  name: '',
  phoneNumber: '',
  address: '',
  emailAddress: '',
  contactPersonName: ''
};

newTaxData: { name: string; rate: number; description: string } = {
  name: '',
  rate: 0,
  description: ''
};

merchants: { id:number; name: string; phoneNumber: string; address: string; emailAddress: string; contactPersonName: string }[] = [];

taxRates: { id: number; name: string; rate: number }[] = [];

openModal(modalType: 'category' | 'merchant' | 'tax') {
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

closeModal(modalType: 'category' | 'merchant' | 'tax') {
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

addNewCategory() {
  const trimmedName = this.newCategoryData.name?.trim() || '';

  if (!trimmedName) {
    return;
  }
    
  const exists = this.categories.some(cat =>
    cat.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (exists) {
    this.messageService.add({
      severity: 'error',
      summary: 'Duplicate Category',  
      detail: 'This category already exists.'
    });
    return;
  }

  const newCategory: any = {
    name: trimmedName,
    description: this.newCategoryData.description?.trim() || 'No description provided'
  };

  console.log('Creating category via API:', newCategory);

  this.expenseService.addCategory(newCategory).subscribe({
    next: (savedCategory) => {
      console.log('Category saved to API:', savedCategory);
      this.categories = [...this.categories, savedCategory];
      this.expenseSummary.category = savedCategory.name;
      
      this.messageService.add({
        severity: 'success',
        summary: 'Category added',
        detail: `Category "${trimmedName}" has been created and saved to database.`
      });

      this.closeModal('category');
    },
    error: (error) => {
      console.error('Error saving category:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Save Failed',
        detail: 'Failed to save category. Please try again.'
      });
    }
  });
}



removeCategory(categoryId: number) {
  const categoryToDelete = this.categories.find(cat => cat.id === categoryId);

  if (categoryToDelete) {
    this.categories = this.categories.filter(cat => cat.id !== categoryId);

    if (this.expenseSummary.category === categoryToDelete.name) {
      this.expenseSummary.category = null;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Category deleted',
      detail: `Category "${categoryToDelete.name}" has been removed`
    });
  }
}


addNewMerchant() {
  const trimmedName = this.newMerchantData.name?.trim() || '';

  if (!trimmedName) {
    this.messageService.add({
      severity: 'error',
      summary: 'Invalid Input',
      detail: 'Merchant name is required'
    });
    return;
  }

  const newMerchant: any = {
    name: trimmedName,
    phoneNumber: this.newMerchantData.phoneNumber || '',
    address: this.newMerchantData.address || '',
    emailAddress: this.newMerchantData.emailAddress || '',
    contactPersonName: this.newMerchantData.contactPersonName || ''
  };

  console.log('Creating merchant via API:', newMerchant);

  this.expenseService.addMerchant(newMerchant).subscribe({
    next: (savedMerchant) => {
      console.log('Merchant saved to API:', savedMerchant);
      this.merchants = [...this.merchants, savedMerchant];
      this.expenseSummary.merchant = savedMerchant.name;

      this.messageService.add({
        severity: 'success',  
        summary: 'Merchant Added',
        detail: `Merchant "${trimmedName}" has been created and saved to database.`
      });

      this.closeModal('merchant');
    },
    error: (error) => {
      console.error('Error saving merchant:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Save Failed',
        detail: 'Failed to save merchant. Please try again.'
      });
    }
  });
}


addNewTaxRate() {
  const trimmedName = this.newTaxData.name?.trim() || '';

  if (!trimmedName || this.newTaxData.rate < 0) {
    this.messageService.add({
      severity: 'error',
      summary: 'Invalid Input',
      detail: 'Tax name and valid rate are required'
    });
    return;
  }

  const exists = this.taxRates.some(tax =>
    tax.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (exists) {
    this.messageService.add({
      severity: 'error',
      summary: 'Duplicate Tax Rate',
      detail: 'This tax rate already exists.'
    });
    return;
  }

  const newTaxRate: any = {
    name: trimmedName,
    rate: this.newTaxData.rate,
    description: this.newTaxData.description?.trim() || 'No description provided'
  };

  console.log('Creating tax rate via API:', newTaxRate);

  this.expenseService.addTaxRate(newTaxRate).subscribe({
    next: (savedTaxRate) => {
      console.log('Tax rate saved to API:', savedTaxRate);
      this.taxRates = [...this.taxRates, savedTaxRate];
      this.expenseSummary.taxPercentage = savedTaxRate.rate;

      this.messageService.add({
        severity: 'success',
        summary: 'Tax Rate Added',
        detail: `Tax rate "${trimmedName}" has been created and saved to database.`
      });

      this.closeModal('tax');
    },
    error: (error) => {
      console.error('Error saving tax rate:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Save Failed',
        detail: 'Failed to save tax rate. Please try again.'
      });
    }
  });
}
private resetCategoryData() {
  this.newCategoryData = { name: '', description: ''};
}

private resetMerchantData() {
  this.newMerchantData = {
    name: '',
    phoneNumber: '',
    address: '',
    emailAddress: '',
    contactPersonName: ''
  };
}

private resetTaxData() {
  this.newTaxData = { name: '', rate: 0, description: ''};
}

 // Recurring payment data
  advancedPaymentData?: RecurringPayment;
  showAdvancedPayment = false;

  @ViewChild(RecurringPaymentModalComponent) recurringModal?: RecurringPaymentModalComponent;

  // Called when recurring modal emits "save"
  onAdvancedPaymentSave(payment: RecurringPayment) {
    this.advancedPaymentData = payment;
    this.showAdvancedPayment = false;  // hide form after save
    console.log('Recurring Payment Saved:', payment);
  }

  onAdvancedPaymentCancel() {
    this.showAdvancedPayment = false; // hide form
  }

 submitExpense(form: NgForm): void {

  if (this.categories.length === 0) {
    this.messageService.add({
      severity: 'error',
      summary: 'No Categories',
      detail: 'Please add at least one category before submitting an expense.'
    });
    return;
  }

  if (this.merchants.length === 0) {  
    this.messageService.add({
      severity: 'error',
      summary: 'No Merchants',
      detail: 'Please add at least one merchant before submitting an expense.'
    });
    return;
  }

  if (form.invalid) {
    form.control.markAllAsTouched();
    this.messageService.add({
      severity: 'error',
      summary: 'Form Invalid',
      detail: 'Please fill in all required fields.'
    });
    return;
  }

  if (!this.receiptFile) {
    this.messageService.add({
      severity: 'error',
      summary: 'Missing Receipt',
      detail: 'Please upload the receipt file.'
    });
    return;
  }

  if (this.expenseSummary.paidBy === 'employee' && !this.employeeReceiptFile) {
    this.messageService.add({
      severity: 'error',
      summary: 'Missing Employee Receipt',
      detail: 'Please upload the employee receipt file.'
    });
    return;
  }

  console.log('Debug - Current expenseSummary:', this.expenseSummary);
  console.log('Debug - Available categories:', this.categories);
  console.log('Debug - Available merchants:', this.merchants);
  console.log('Debug - Available tax rates:', this.taxRates);

  const selectedCategory = this.categories.find(cat => cat.name === this.expenseSummary.category);
  const selectedMerchant = this.merchants.find(merch => merch.name === this.expenseSummary.merchant);
  const selectedTax = this.taxRates.find(tax => tax.rate === this.expenseSummary.taxPercentage);

  console.log('Debug - Found category:', selectedCategory);
  console.log('Debug - Found merchant:', selectedMerchant);
  console.log('Debug - Found tax:', selectedTax);

  if (!selectedCategory) {
    this.messageService.add({
      severity: 'error',
      summary: 'Invalid Category',
      detail: `Category "${this.expenseSummary.category}" not found. Please select a valid category.`
    });
    return;
  }

  if (!selectedMerchant) {
    this.messageService.add({
      severity: 'error',
      summary: 'Invalid Merchant',
      detail: `Merchant "${this.expenseSummary.merchant}" not found. Please select a valid merchant.`
    });
    return;
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

  console.log('Debug - Final API expense:', apiExpense);

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

  obs.subscribe(
    response => {
      console.log('Expense saved to API:', response);
      this.messageService.add({
        severity: 'success',
        summary: 'Expense Submitted',
        detail: 'Expense successfully submitted to the server.'
      });
      
      this.resetForm();
      form.resetForm();
      this.advancedPaymentData = undefined;
      this.billSplitData = undefined;
      this.showAdvancedPayment = false;
      this.showBillSplit = false;
      
      this.router.navigate(['/expenses']);
    },
    error => {
      console.error('Error submitting expense to API:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Submission Failed',
        detail: error.message || 'An error occurred while submitting the expense.'
      });
    }
  );
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

  // Bill Split state
  billSplitData?: BillSplit;
  showBillSplit = false;
  numParticipants = 2;
  splitError: string | null = null;
selectedCurrency = 'NGN';
availableCurrencies = ['USD', 'EUR', 'GBP', 'NGN'];

  // ➖➖ Bill Split Methods ➖➖
  openBillSplit() {
    this.billSplitData = {
      enabled: true,
      method: 'equal',
      participants: [],
      totalAmount: this.expenseSummary.amount
    };
    this.generateParticipants();
    this.showBillSplit = true;
  }

  generateParticipants() {
    if (!this.billSplitData) return;

    this.billSplitData.participants = Array.from(
      { length: this.numParticipants },
      (_, i) =>
        ({
          id: `${i + 1}`,
          name: `Person ${i + 1}`,
          shareAmount: 0,
          sharePercent: 0
        } as BillSplitParticipant)
    );

    if (this.billSplitData.method === 'equal') {
      this.autoDistributeEqual();
    }
  }

  autoDistributeEqual() {
    if (!this.billSplitData) return;
    const total = this.expenseSummary.amount;
    const count = this.billSplitData.participants.length;
    if (count > 0) {
      const perPerson = total / count;
      this.billSplitData.participants.forEach(p => {
        p.shareAmount = perPerson;
      });
    }
  }

  saveBillSplit() {
    this.splitError = null;
    if (!this.billSplitData) return;

    const total = this.expenseSummary.amount;

    if (this.billSplitData.method === 'equal') {
      this.autoDistributeEqual();
    }

    if (this.billSplitData.method === 'percentage') {
      const sumPercent = this.billSplitData.participants.reduce(
        (acc, p) => acc + (p.sharePercent || 0),
        0
      );
      if (sumPercent !== 100) {
        this.splitError = 'Percentages must add up to 100%.';
        return;
      }
      this.billSplitData.participants.forEach(p => {
        p.shareAmount = (p.sharePercent! / 100) * total;
      });
    }

    if (this.billSplitData.method === 'amount') {
      const sumAmount = this.billSplitData.participants.reduce(
        (acc, p) => acc + (p.shareAmount || 0),
        0
      );
      if (sumAmount !== total) {
        this.splitError = `Amounts must add up to ${total}`;
        return;
      }
    }

    this.billSplitData.totalAmount = total;
    this.showBillSplit = false;
  }

  removeBillSplit() {
    this.billSplitData = undefined;
    this.showBillSplit = false;
  }
}





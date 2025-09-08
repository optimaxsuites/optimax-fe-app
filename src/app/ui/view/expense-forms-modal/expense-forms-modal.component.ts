import { Component, OnInit, ViewChild } from '@angular/core';
import { ExpenseService, Expense } from '../../service/expense.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { NgForm } from '@angular/forms';


@Component({
  selector: 'app-expense-forms-modal',
  templateUrl: './expense-forms-modal.component.html',
  styleUrls: ['./expense-forms-modal.component.scss'],
  providers: [MessageService]
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
  categories: { id: string; name: string; description?:string }[] = [
     { id: '1', name: 'Administrative', description: 'General administrative expenses and office supplies' },
     { id: '2', name: 'Cost of Goods Sold', description: 'Direct costs related to the production of goods sold by the company' },
     { id: '3', name: 'Employee-Related', description: 'Expenses related to employee salaries, benefits, and training' },
     { id: '4', name: 'Operating Expenses', description: 'Day-to-day expenses required to run the business' },
     { id: '5', name: 'Sales and Marketing', description: 'Costs associated with promoting and selling products or services' },
    //  { name: 'Others' },
  ];
 

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
    this.route.queryParams.subscribe((params) => {
      const expenseId = params['id'];
      if (expenseId) {
        const expense = this.expenseService.getExpenseById(expenseId);
        if (expense) {
          this.expenseSummary = { ...expense };
          this.receiptFile = expense.receiptFile || null;
          this.invoiceFile = expense.invoiceFile || null;
          this.signatureUrl = expense.signature || null; 
        }
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
    }
  }



  submitExpense(form: NgForm): void {
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
        detail: 'Please upload a receipt file.'
      });
      return;
    }

  
    
    const newExpense: Expense = {
      ...this.expenseSummary,
      id: this.expenseSummary.id || this.generateId(),
      status: 'Pending',
      amount: Number(this.expenseSummary.amount),
      receiptFile: this.receiptFile, 
      invoiceFile: this.invoiceFile, 
      signature: this.signatureUrl, 
    };

    newExpense.amount = Number(newExpense.amount);
    // if (this.expenseSummary.id) {
    //   this.expenseService.updateExpense(newExpense);
    // } else {
    //   this.expenseService.addExpense(newExpense);
    // }
      // Save the expense to localStorage
// Save the expense to localStorage
this.saveExpenseToLocalStorage(newExpense);
console.log('Expense saved to localStorage:', newExpense);

this.messageService.add({
  severity: 'success',
  summary: 'Expense Submitted',
  detail: `Expense for ${newExpense.merchant} has been successfully submitted.`
})

 // Reset the form data
  this.resetForm();
  form.resetForm();
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

merchants: { name: string; emailAddress?: string }[] = [
  { name: 'Amazon'},
  { name: 'Grand Square'}
];

taxRates: { name: string; rate: number }[] = [
  { name: 'No Tax', rate: 0},
  { name: 'VAT', rate: 7.5}
];

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

const newCategory = {
  id: this.generateId(),
  name: trimmedName,
  description: this.newCategoryData.description?.trim() || 'No description provided'
};

this.categories = [...this.categories, newCategory];

// this.categories.push(newCategory);
this.expenseSummary.category = trimmedName;

this.messageService.add({
  severity: 'success',
  summary: 'Category added',
  detail: `Category "${trimmedName}" has been created successfully`
});

this.closeModal('category');

}




removeCategory(categoryId: string) {
  const categoryToDelete = this.categories.find(cat => cat.id === categoryId);

  if (categoryToDelete) {
    this.categories = this.categories.filter(cat => cat.id != categoryId);

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

  const newMerchant = {
    name: trimmedName,
    phoneNumber: this.newMerchantData.phoneNumber,
    address: this.newMerchantData.address,
    emailAddress: this.newMerchantData.emailAddress,
    contactPersonName: this.newMerchantData.contactPersonName
  };

  this.merchants = [...this.merchants, {name: newMerchant.name, emailAddress: newMerchant.emailAddress}];

  this.expenseSummary.merchant = newMerchant.name;
  console.log('Full merchant date:', newMerchant);

  this.messageService.add({
    severity: 'success',  
    summary: 'Merchant Added',
    detail: `Merchant "${trimmedName}" has been created successfully`
  });

  this.closeModal('merchant');

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

  const newTaxRate = {
    name: trimmedName,
    rate: this.newTaxData.rate,
    description: this.newTaxData.description?.trim() || 'No description provided'
  };

  this.taxRates = [...this.taxRates, newTaxRate];

  this.expenseSummary.taxPercentage = newTaxRate.rate;

  this.messageService.add({
    severity: 'success',
    summary: 'Tax Rate Added',
    detail: `Tax rate "${trimmedName}" has been created successfully`
  });

  this.closeModal('tax');

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

}







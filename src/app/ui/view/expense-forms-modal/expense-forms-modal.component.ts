import { Component, OnInit, ViewChild } from '@angular/core';
import { ExpenseService, Expense } from '../../service/expense.service';
import { Router, ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-expense-forms-modal',
  templateUrl: './expense-forms-modal.component.html',
  styleUrls: ['./expense-forms-modal.component.scss'],
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
  categories: { name: string }[] = [
    { name: 'Travel' },
    { name: 'Food' },
    { name: 'Accommodation' },
    { name: 'Entertainment' },
    {name: 'Transportation' },
    { name: 'Utilities' },
    { name: 'Insurance' },
    { name: 'Healthcare' },
    { name: 'Office Supplies' },
    { name: 'Other' },
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
    private route: ActivatedRoute
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

  
  onAmountInput(event: any): void {
    const input = event.target.value;
    if (input < 0) {
      this.expenseSummary.amount = 0; 
    } else {
      this.expenseSummary.amount = input;
    }
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
  goBack(){
    this.router.navigate(['/admin/expenses/:uuid']);
  }
  
  assignFile(file: File, type: string): void {
    if (type === 'receipt') {
      this.receiptFile = file;
    } else if (type === 'invoice') {
      this.invoiceFile = file;
    }
  }



  submitExpense(): void {
    const newExpense: Expense = {
      ...this.expenseSummary,
      id: this.expenseSummary.id || this.generateId(),
      status: 'Pending',
      receiptFile: this.receiptFile, 
      invoiceFile: this.invoiceFile, 
      signature: this.signatureUrl, 
    };

    // if (this.expenseSummary.id) {
    //   this.expenseService.updateExpense(newExpense);
    // } else {
    //   this.expenseService.addExpense(newExpense);
    // }
      // Save the expense to localStorage
// Save the expense to localStorage
this.saveExpenseToLocalStorage(newExpense);
console.log('Expense saved to localStorage:', newExpense);

 // Reset the form data
  this.resetForm();
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
      Quantity: null,
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
}

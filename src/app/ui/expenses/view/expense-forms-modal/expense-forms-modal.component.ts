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
    { name: 'Other' },
  ];

  paymentMethods = [
    { label: 'Cash', value: 'cash' },
    { label: 'Credit Card', value: 'credit' },
    { label: 'Debit Card', value: 'debit' },
  ];

  projects = [
    { label: 'Project 1', value: 'project1' },
    { label: 'Project 2', value: 'project2' },
    { label: 'Project 3', value: 'project3' },
  ];

  currentStage: string = 'to-submit';
  expenseSummary: any = { amount: null }; // Start with null to show the placeholder
  receiptFile: File | null = null;
  invoiceFile: File | null = null;
  signatureUrl: string | null = null; // To store the signature as a data URL

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
          this.signatureUrl = expense.signature || null; // Load saved signature
        }
      }
    });
  }

  // Handle amount input to prevent negative values
  onAmountInput(event: any): void {
    const input = event.target.value;
    if (input < 0) {
      this.expenseSummary.amount = 0; // Set to 0 if input is negative
    } else {
      this.expenseSummary.amount = input;
    }
  }

  // Handle the drag over event
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    target.classList.add('dragover');
  }

  // Handle the file drop event
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

  // Handle file selection via input field
  onFileSelect(event: Event, type: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.assignFile(file, type);
    }
  }

  // Assign the dropped or selected file to the correct variable
  assignFile(file: File, type: string): void {
    if (type === 'receipt') {
      this.receiptFile = file;
    } else if (type === 'invoice') {
      this.invoiceFile = file;
    }
  }



  // Submit the expense
  submitExpense(): void {
    const newExpense: Expense = {
      ...this.expenseSummary,
      id: this.expenseSummary.id || this.generateId(),
      status: this.currentStage,
      receiptFile: this.receiptFile, 
      invoiceFile: this.invoiceFile, 
      signature: this.signatureUrl, 
    };

    if (this.expenseSummary.id) {
      this.expenseService.updateExpense(newExpense);
    } else {
      this.expenseService.addExpense(newExpense);
    }

    this.router.navigate(['/expenses']);
  }

  // Generate a random ID for new expenses
  generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

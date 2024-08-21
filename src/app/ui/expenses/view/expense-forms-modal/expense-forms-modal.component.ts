import { Component, OnInit } from '@angular/core';
import { ExpenseService, Expense } from '../../service/expense.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-expense-forms-modal',
  templateUrl: './expense-forms-modal.component.html',
  styleUrls: ['./expense-forms-modal.component.scss'],
})
export class ExpenseFormsModalComponent implements OnInit {
  currentStage: string = 'to-submit';
  expenseSummary: any = {};
  receiptFile: File | null = null;
  invoiceFile: File | null = null;

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
        }
      }
    });
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

  // Assign the dropped or selected file to the correct variable
  assignFile(file: File, type: string): void {
    if (type === 'receipt') {
      this.receiptFile = file;
    } else if (type === 'invoice') {
      this.invoiceFile = file;
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

  // Submit the expense
  submitExpense() {
    // If editing, update the existing expense
    if (this.expenseSummary.id) {
      this.expenseService.updateExpense(this.expenseSummary);
    } else {
      // If creating a new expense
      const newExpense: Expense = {
        ...this.expenseSummary,
        id: this.generateId(),
        status: this.currentStage,
      };
      this.expenseService.addExpense(newExpense);
    }

    this.router.navigate(['/expenses']);
  }

  // Generate a random ID for new expenses
  generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

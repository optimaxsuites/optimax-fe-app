import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ExpenseService, Expense } from '../../service/expense.service';

@Component({
  selector: 'app-expense-table',
  templateUrl: './expense-table.component.html',
  styleUrls: ['./expense-table.component.scss'],
})
// Existing imports and component metadata

export class ExpenseTableComponent implements OnInit {
  expenses: Expense[] = [];

  constructor(
    private router: Router, 
    private expenseService: ExpenseService
  ) {}

  ngOnInit(): void {
    this.expenseService.expenses$.subscribe((expenses) => {
      this.expenses = expenses;
    });
  }

  navigateToForm(): void {
    this.router.navigate(['/expenses/expensesForm']);
  }

  editExpense(expense: Expense): void {
    this.router.navigate(['/expenses/expensesForm'], {
      queryParams: { id: expense.id }
    });
  }

  deleteExpense(expense: Expense): void {
    this.expenseService.deleteExpense(expense.id);
  }

  // New method to navigate to the approval page
  viewExpenseApproval(expense: Expense): void {
    this.router.navigate(['/expenses/expensesApproval', expense.id]);
  }
}
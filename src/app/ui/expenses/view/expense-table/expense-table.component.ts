import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ExpenseService, Expense } from '../../service/expense.service';

@Component({
  selector: 'app-expense-table',
  templateUrl: './expense-table.component.html',
  styleUrls: ['./expense-table.component.scss'],
})
export class ExpenseTableComponent implements OnInit {
  expenses: Expense[] = [];
  filteredExpenses: Expense[] = [];
  searchTerm: string = '';

  constructor(
    private router: Router, 
    private expenseService: ExpenseService
  ) {}

  ngOnInit(): void {
    this.expenseService.expenses$.subscribe((expenses) => {
      this.expenses = expenses;
      this.filteredExpenses = expenses;
    });
  }

  onSearch(): void {
    if (this.searchTerm) {
      this.filteredExpenses = this.expenses.filter(expense =>
        expense.merchant.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        expense.category.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        expense.amount.toString().includes(this.searchTerm) ||
        expense.date.toString().includes(this.searchTerm) ||
        expense.id.toString().includes(this.searchTerm) ||
        expense.status.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredExpenses = this.expenses;
    }
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

  viewExpenseApproval(expense: Expense): void {
    this.router.navigate(['/expenses/expensesApproval', expense.id]);
  }
}

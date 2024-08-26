import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ExpenseService, Expense } from '../../service/expense.service';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-expense-table',
  templateUrl: './expense-table.component.html',
  styleUrls: ['./expense-table.component.scss'],
})
export class ExpenseTableComponent implements OnInit {
  expenses: Expense[] = [];
  filteredExpenses: Expense[] = [];
  searchTerm: string = '';
  private searchTermSubject: Subject<string> = new Subject();

  constructor(
    private router: Router, 
    private expenseService: ExpenseService
  ) {}

  ngOnInit(): void {
    // Subscribe to expenses from the service
    this.expenseService.expenses$.subscribe((expenses) => {
      this.expenses = expenses;
      this.filteredExpenses = expenses; // Initially, display all expenses
    });

    // Debounce the search input to avoid frequent filtering
    this.searchTermSubject.pipe(debounceTime(300)).subscribe(() => {
      this.onSearch();
    });
  }

  // Called when the user types in the search input
  onSearchInputChange(): void {
    this.searchTermSubject.next(this.searchTerm);
  }

  // Filter the expenses based on the search term
  onSearch(): void {
    if (this.searchTerm) {
      this.filteredExpenses = this.expenses.filter(expense =>
        expense.merchant.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        expense.id.toString().includes(this.searchTerm) ||
        expense.amount.toString().includes(this.searchTerm)
      );
    } else {
      this.filteredExpenses = this.expenses; // If no search term, show all expenses
    }
  }

  // Navigate to the form to add a new expense
  navigateToForm(): void {
    this.router.navigate(['/expenses/expensesForm']);
  }

  // Navigate to the form to edit an existing expense
  editExpense(expense: Expense): void {
    this.router.navigate(['/expenses/expensesForm'], {
      queryParams: { id: expense.id }
    });
  }

  // Delete an expense
  deleteExpense(expense: Expense): void {
    this.expenseService.deleteExpense(expense.id);
  }

  // View the approval details of an expense
  viewExpenseApproval(expense: Expense): void {
    this.router.navigate(['/expenses/expensesApproval', expense.id]);
  }
}

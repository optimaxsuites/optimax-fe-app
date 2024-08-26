import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Expense {
  signature: null;
  invoiceFile: null;
  receiptFile: null;
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  comment: string;
  status: string;
  receiptFileName?: string; 
  invoiceFileName?: string; 
}

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  private expenses: Expense[] = [];
  private expensesSubject = new BehaviorSubject<Expense[]>(this.expenses);
  expenses$ = this.expensesSubject.asObservable();

  // Add a new expense and update subscribers
  addExpense(expense: Expense): void {
    this.expenses.push(expense);
    this.expensesSubject.next(this.expenses);
  }
  
  // Update an existing expense and notify subscribers
  updateExpense(updatedExpense: Expense): void {
    const index = this.expenses.findIndex(expense => expense.id === updatedExpense.id);
    if (index !== -1) {
      this.expenses[index] = updatedExpense;
      this.expensesSubject.next(this.expenses);
    }
  }

  // Delete an expense by ID and notify subscribers
  deleteExpense(id: string): void {
    this.expenses = this.expenses.filter((expense) => expense.id !== id);
    this.expensesSubject.next(this.expenses);
  }

  // Find an expense by ID
  getExpenseById(id: string): Expense | undefined {
    return this.expenses.find((expense) => expense.id === id);
  }
}

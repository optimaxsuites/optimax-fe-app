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
  receiptFileName?: string; // Optional property for receipt file name
  invoiceFileName?: string; // Optional property for invoice file name
}


@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  private expenses: Expense[] = [];
  private expensesSubject = new BehaviorSubject<Expense[]>(this.expenses);
  expenses$ = this.expensesSubject.asObservable();

  addExpense(expense: Expense): void {
    this.expenses.push(expense);
    this.expensesSubject.next(this.expenses);
  }
  
  updateExpense(updatedExpense: Expense): void {
    const index = this.expenses.findIndex(expense => expense.id === updatedExpense.id);
    if (index !== -1) {
      this.expenses[index] = updatedExpense;
      this.expensesSubject.next(this.expenses);
    }
  }

  deleteExpense(id: string): void {
    this.expenses = this.expenses.filter((expense) => expense.id !== id);
    this.expensesSubject.next(this.expenses);
  }

  getExpenseById(id: string): Expense | undefined {
    return this.expenses.find((expense) => expense.id === id);
  }
}

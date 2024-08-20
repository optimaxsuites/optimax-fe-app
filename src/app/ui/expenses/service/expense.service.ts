import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Expense {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  comment: string;
  status: string;
}

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  updateExpense(expenseSummary: any) {
    throw new Error('Method not implemented.');
  }
  private expenses: Expense[] = [];
  private expensesSubject = new BehaviorSubject<Expense[]>(this.expenses);
  expenses$ = this.expensesSubject.asObservable();

  addExpense(expense: Expense): void {
    this.expenses.push(expense);
    this.expensesSubject.next(this.expenses);
  }
  

  deleteExpense(id: string): void {
    this.expenses = this.expenses.filter((expense) => expense.id !== id);
    this.expensesSubject.next(this.expenses);
  }

  getExpenseById(id: string): Expense | undefined {
    return this.expenses.find((expense) => expense.id === id);
  }



  
}
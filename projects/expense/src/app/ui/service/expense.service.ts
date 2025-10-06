import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';


export interface Expense {
  id: number;
  name: string;
  description: string;
  eventDate: string;
  quantity?: number;
  currency: Currency;
  amount: number;
  status: ExpenseStatus;
  paidBy: PaidBy;
  receiptReference?: string;
  merchantId: number;
  categoryId: number;
  taxId: number;
  scheduledPaymentId: number;
  merchant?: MerchantDTO;
  category?: CategoryDTO;
  tax?: TaxDTO;
  scheduledPayment?: ScheduledPaymentDTO;
}

export interface CategoryDTO {
  id: number;
  name: string;
  description?: string;
}

export interface MerchantDTO {
  id: number;
  name: string;
  phoneNumber: string;
  address: string;
  emailAddress: string;
  contactPersonName: string;
}

export interface TaxDTO {
  id: number;
  name: string;
  rate: number;
  description?: string;
}

export enum ExpenseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum PaidBy {
  COMPANY = 'COMPANY',  
  EMPLOYEE = 'EMPLOYEE'
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  NGN = 'NGN'
}

export enum PaymentType {
  ONE_TIME = 'ONE_TIME',
  RECURRING = 'RECURRING'
}

export enum SplitMethod {
  EQUAL = 'EQUAL',
  PERCENTAGE = 'PERCENTAGE',
  CUSTOM = 'CUSTOM'
}

export interface ExpenseFilterDTO {
  category?: CategoryDTO;
  status?: ExpenseStatus;
  dateRangeType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ExpenseSummaryDTO {
  totalAmount: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

export interface ScheduledPaymentDTO {
  id: number;
  type: PaymentType;
  startDate: string;
  emailReminder: boolean;
}

export interface BillSplitDTO {
  id: number;
  splitMethod: SplitMethod;
  numberOfPeople: number;
  totalAmount: number;
  shares: PersonShareDTO[];
}

export interface PersonShareDTO {
  personName: string;
  shareAmount: number;
}


@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private apiUrl = 'https://be.optimaxsuites.com/x/api/v2/exp/expenses';
  private expensesSubject = new BehaviorSubject<Expense[]>([]);
  public expenses$ = this.expensesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadExpenses();
  }

  private loadExpenses(): void {
    this.http.get<Expense[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    ).subscribe(expenses => {
      this.expensesSubject.next(expenses);
    });
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => new Error('Something bad happened; please try again later.'));
  }

  getExpenses(): Observable<Expense[]> {
    return this.http.get<Expense[]>(this.apiUrl).pipe( 
      tap(expenses => this.expensesSubject.next(expenses)),
      catchError(this.handleError)
    );
  }

  getExpenseById(id: number): Observable<Expense> {
    return this.http.get<Expense>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  addExpense(expense: Expense): Observable<Expense> {
    return this.http.post<Expense>(this.apiUrl, expense).pipe( 
      tap(() => this.loadExpenses()),
      catchError(this.handleError)
    );
  }

  updateExpense(id: number, updatedExpense: Expense): Observable<Expense> { 
    return this.http.put<Expense>(`${this.apiUrl}/${id}`, updatedExpense).pipe(
      tap(() => this.loadExpenses()),
      catchError(this.handleError)
    );
  }

  deleteExpense(id: number): Observable<void> { 
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.loadExpenses()),
      catchError(this.handleError)
    );
  }

  uploadCompanyReceipt(id: number, file: File): Observable<Expense> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Expense>(`${this.apiUrl}/${id}/company-receipt`, formData);
  }

  uploadEmployeeReceipt(id: number, file: File): Observable<Expense> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Expense>(`${this.apiUrl}/${id}/employee-receipt`, formData);
  }

}

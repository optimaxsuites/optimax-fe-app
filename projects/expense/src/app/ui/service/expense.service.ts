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
  recurringPayment?: any;
  billSplit?: BillSplitDTO;
  taxPercentage?: number;
  date?: string;
  signature?: string | null;
  receiptFile?: File | null;
  invoiceFile?: File | null;
  employeeReceiptFile?: File | null;
}



export type PaidByBackend = 'COMPANY' | 'EMPLOYEE';

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
  private apiHost = 'https://be.optimaxsuites.com';
  private baseUrl = `${this.apiHost}/x/api/v2/exp`;
  private expenseUrl = `${this.baseUrl}/expenses`;

  private expensesSubject = new BehaviorSubject<Expense[]>([]);
  public expenses$ = this.expensesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadExpenses();
  }

   private handleError(error: any): Observable<never> {
    console.log('ERROR FOUND!');
    console.log('Error status:', error.status);
    console.log('Error message:', error.message);
    console.log('Full error:', error);  
    
    return throwError(() => new Error('Something bad happened; please try again later.'));
  }

  private loadExpenses(): void {
    this.http.get<Expense[]>(this.expenseUrl).pipe(
      catchError(this.handleError)
    ).subscribe({
      next: (expenses) => this.expensesSubject.next(expenses),
      error: (err) => console.error('Error loading initial expenses:', err)
    });
  }


  getExpenses(): Observable<Expense[]> {
    return this.http.get<Expense[]>(this.expenseUrl).pipe( 
      tap(expenses => this.expensesSubject.next(expenses)),
      catchError(this.handleError)
    );
  }

  getExpenseById(id: number): Observable<Expense> {
    return this.http.get<Expense>(`${this.expenseUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  addExpense(expense: Expense): Observable<Expense> {
    return this.http.post<Expense>(this.expenseUrl, expense).pipe( 
      tap(() => this.loadExpenses()),
      catchError(this.handleError)
    );
  }

  updateExpense(id: number, updatedExpense: Expense): Observable<Expense> { 
    return this.http.put<Expense>(`${this.expenseUrl}/${id}`, updatedExpense).pipe(
      tap(() => this.loadExpenses()),
      catchError(this.handleError)
    );
  }

  deleteExpense(id: number): Observable<void> { 
    return this.http.delete<void>(`${this.expenseUrl}/${id}`).pipe(
      tap(() => this.loadExpenses()),
      catchError(this.handleError)
    );
  }

  getCategories(): Observable<CategoryDTO[]> {
    return this.http.get<CategoryDTO[]>(`${this.baseUrl}/categories`).pipe(
      catchError(this.handleError)
    );
  }

  addCategory(category: CategoryDTO): Observable<CategoryDTO> {
    return this.http.post<CategoryDTO>(`${this.baseUrl}/categories`, category).pipe(
      catchError(this.handleError)
    );
  }

  getMerchants(): Observable<MerchantDTO[]> {
    return this.http.get<MerchantDTO[]>(`${this.baseUrl}/merchants`).pipe(
      catchError(this.handleError)
    );
  }

  addMerchant(merchant: MerchantDTO): Observable<MerchantDTO> {
    return this.http.post<MerchantDTO>(`${this.baseUrl}/merchants`, merchant).pipe(
      catchError(this.handleError)
    );
  }

  getTaxRates(): Observable<TaxDTO[]> {
    return this.http.get<TaxDTO[]>(`${this.baseUrl}/taxes`).pipe(
      catchError(this.handleError)
    );
  }

  addTaxRate(tax: TaxDTO): Observable<TaxDTO> {
    return this.http.post<TaxDTO>(`${this.baseUrl}/taxes`, tax).pipe(
      catchError(this.handleError)
    );
  }

  getEmployeeReceipt(expenseId: string) : Observable<Blob> {
    return this.http.get(`${this.expenseUrl}/${expenseId}/employee-receipt`, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  uploadEmployeeReceipt(expenseId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Expense>(`${this.expenseUrl}/${expenseId}/employee-receipt`, formData).pipe(
      catchError(this.handleError)
        );
  }

  getCompanyReceipt(expenseId: string): Observable<Blob> {
    return this.http.get(`${this.expenseUrl}/${expenseId}/company-receipt`, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  } 

  uploadCompanyReceipt(expenseId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Expense>(`${this.expenseUrl}/${expenseId}/company-receipt`, formData).pipe(
      catchError(this.handleError)
    );
  }

  

}

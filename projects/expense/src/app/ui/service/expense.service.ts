import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
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

  constructor(private http: HttpClient, private messageService: MessageService) {
    this.loadExpenses();
  }

  private getHeaders(): HttpHeaders {
    const authToken = sessionStorage.getItem('Token') || 
                      localStorage.getItem('token') || 
                      sessionStorage.getItem('authToken') || 
                      localStorage.getItem('authToken');
    
    const tenantId = sessionStorage.getItem('tenantId') || localStorage.getItem('tenantId') || 'mod';
    
    console.log('getHeaders - Token found:', !!authToken);
    console.log('getHeaders - Tenant ID:', tenantId);
    
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId
    });

    if (authToken) {
      headers = headers.set('Authorization', `Bearer ${authToken}`);
      console.log('getHeaders - Authorization header added');
    } else {
      console.warn('getHeaders - NO TOKEN FOUND FOR AUTHORIZATION');
    }

    return headers;
  }

  private handleError(error: any): Observable<never> {
    console.log('ERROR FOUND!');
    console.log('Error status:', error.status);
    console.log('Error message:', error.message);
    console.log('Full error object:', error);
    console.log('Error response body:', error.error);
    
    if (error.status === 401) {
      console.error('Authentication Error: User not authenticated or token expired');
      console.error('Please ensure you are logged in and have a valid authentication token');
    }
    
    return throwError(() => new Error(error.message || 'Something bad happened; please try again later.'));
  }

  private loadExpenses(): void {
    const params = new HttpParams()
      .set('page', '1')
      .set('size', '1000');
    
    this.http.get<Expense[]>(this.expenseUrl, { 
      headers: this.getHeaders(),
      params: params 
    }).pipe(
      catchError((error) => {
        console.error('Error loading expenses:', error);
        // Don't break the UI - show a warning message and return an empty array
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Unable to refresh expense list. Please reload the page.'
        });
        return of([] as Expense[]);
      })
    ).subscribe({
      next: (expenses) => {
        // Sort by ID descending (newest first)
        const sortedExpenses = expenses.sort((a, b) => b.id - a.id);
        this.expensesSubject.next(sortedExpenses);
      },
      error: (err) => console.error('Error loading initial expenses:', err)
    });
  }

  getExpenses(): Observable<Expense[]> {
    const params = new HttpParams()
      .set('page', '1')
      .set('size', '1000');
    
    return this.http.get<Expense[]>(this.expenseUrl, { 
      headers: this.getHeaders(),
      params: params 
    }).pipe( 
      tap(expenses => {
        // Sort by ID descending (newest first)
        const sortedExpenses = expenses.sort((a, b) => b.id - a.id);
        console.log(' Fetched and sorted expenses:', sortedExpenses.length);
        console.log('Top 5 IDs:', sortedExpenses.slice(0, 5).map(e => e.id));
        this.expensesSubject.next(sortedExpenses);
      }),
      catchError(this.handleError)
    );
  }

  getExpenseById(id: number): Observable<Expense> {
    return this.http.get<Expense>(`${this.expenseUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      tap(expense => {
        console.log('Fetched full expense by ID:', id);
        console.log('   Merchant:', expense.merchant?.name ?? 'NOT POPULATED');
        console.log('   Category:', expense.category?.name ?? 'NOT POPULATED');
      }),
      catchError(this.handleError)
    );
  }

  addExpense(expense: Expense): Observable<Expense> {
    const cleanPayload = {
      name: expense.name,
      description: expense.description,
      eventDate: expense.eventDate,
      quantity: expense.quantity,
      currency: expense.currency,
      amount: expense.amount,
      status: expense.status,
      paidBy: expense.paidBy,
      receiptReference: expense.receiptReference || '',
      merchantId: expense.merchantId,
      categoryId: expense.categoryId,
      // ⚠️ Only include taxId if it's a valid ID (not 0)
      taxId: expense.taxId && expense.taxId > 0 ? expense.taxId : null,
      // ⚠️ Only include scheduledPaymentId if it's a valid ID (not 0)
      scheduledPaymentId: expense.scheduledPaymentId && expense.scheduledPaymentId > 0 ? expense.scheduledPaymentId : null
    };
    
    console.log('=== CLEAN EXPENSE PAYLOAD ===');
    console.log(JSON.stringify(cleanPayload, null, 2));
    console.log('=== END PAYLOAD ===');
    
    return this.http.post<Expense>(this.expenseUrl, cleanPayload, { headers: this.getHeaders() }).pipe( 
      tap(() => this.loadExpenses()),
      catchError(this.handleError)
    );
  }

  updateExpense(id: number, updatedExpense: Expense): Observable<Expense> { 
    const cleanPayload: any = {
      name: updatedExpense.name,
      description: updatedExpense.description,
      eventDate: updatedExpense.eventDate,
      quantity: updatedExpense.quantity,
      currency: updatedExpense.currency,
      amount: updatedExpense.amount,
      status: updatedExpense.status,
      paidBy: updatedExpense.paidBy,
      receiptReference: updatedExpense.receiptReference || '',
      merchantId: updatedExpense.merchantId,
      categoryId: updatedExpense.categoryId,
      taxId: updatedExpense.taxId || 1,
      scheduledPaymentId: updatedExpense.scheduledPaymentId || null

    };
    
    console.log('=== CLEAN UPDATE EXPENSE PAYLOAD ===');
    console.log(JSON.stringify(cleanPayload, null, 2));
    console.log('=== END PAYLOAD ===');
    
    console.log('PUT /expenses/' + id + ' with payload:', cleanPayload);
    return this.http.put<Expense>(`${this.expenseUrl}/${id}`, cleanPayload, { headers: this.getHeaders() }).pipe(
      tap((response) => {
        console.log('PUT response:', response);
        // Reload expenses to keep list in sync
        this.loadExpenses();
      }),
      catchError(this.handleError)
    );
  }

  deleteExpense(id: number): Observable<void> { 
    return this.http.delete<void>(`${this.expenseUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      tap(() => this.loadExpenses()),
      catchError(this.handleError)
    );
  }

  getCategories(): Observable<CategoryDTO[]> {
    return this.http.get<CategoryDTO[]>(`${this.baseUrl}/categories`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  addCategory(category: CategoryDTO): Observable<CategoryDTO> {
    return this.http.post<CategoryDTO>(`${this.baseUrl}/categories`, category, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getMerchants(): Observable<MerchantDTO[]> {
    return this.http.get<MerchantDTO[]>(`${this.baseUrl}/merchants`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  addMerchant(merchant: MerchantDTO): Observable<MerchantDTO> {
    return this.http.post<MerchantDTO>(`${this.baseUrl}/merchants`, merchant, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getTaxRates(): Observable<TaxDTO[]> {
    return this.http.get<TaxDTO[]>(`${this.baseUrl}/taxes`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  addTaxRate(tax: TaxDTO): Observable<TaxDTO> {
    return this.http.post<TaxDTO>(`${this.baseUrl}/taxes`, tax, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getEmployeeReceipt(expenseId: string): Observable<Blob> {
    return this.http.get(`${this.expenseUrl}/${expenseId}/employee-receipt`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  uploadEmployeeReceipt(expenseId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    // For file uploads, we need to remove Content-Type header to let browser set it with boundary
    const headers = this.getHeaders().delete('Content-Type');
    
    return this.http.post<Expense>(`${this.expenseUrl}/${expenseId}/employee-receipt`, formData, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  getCompanyReceipt(expenseId: string): Observable<Blob> {
    return this.http.get(`${this.expenseUrl}/${expenseId}/company-receipt`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  } 

  uploadCompanyReceipt(expenseId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    // For file uploads, we need to remove Content-Type header to let browser set it with boundary
    const headers = this.getHeaders().delete('Content-Type');
    
    return this.http.post<Expense>(`${this.expenseUrl}/${expenseId}/company-receipt`, formData, { headers }).pipe(
      catchError(this.handleError)
    );
  }
}

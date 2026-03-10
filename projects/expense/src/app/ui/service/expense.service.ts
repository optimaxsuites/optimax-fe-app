import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { MessageService } from 'primeng/api';


export enum ExpenseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum PaidBy {
  COMPANY = 'COMPANY',
  EMPLOYEE = 'EMPLOYEE'
}

export type PaidByBackend = 'COMPANY' | 'EMPLOYEE';

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

export interface ExpenseMedia {
  id: number;
  name: string;
  url: string;
  mediaNo: string;
}

export interface UserDTO {
  id: number;
  fullname: string;
  userId: number;
  email: string;
  phoneNumber: string;
  username: string;
  clientType: string;
  gender: string;
  accountId: string;
  address: string;
  city: string;
  state: string;
  country: string;
}

export interface MerchantDTO {
  id: number;
  name: string;
  phoneNumber: string;
  address: string;
  emailAddress: string;
  contactPersonName: string;
}

export interface CategoryDTO {
  id: number;
  name: string;
  description?: string;
}

export interface TaxDTO {
  id: number;
  name: string;
  rate: number;
  description?: string;
}

export interface ScheduledPaymentDTO {
  id: number;
  type: PaymentType | string;
  startDate: string;
  emailReminder: boolean;
}

export interface PersonShareDTO {
  personName: string;
  shareAmount: number;
}

export interface BillSplitDTO {
  id: number;
  splitMethod: SplitMethod;
  numberOfPeople: number;
  totalAmount: number;
  shares: PersonShareDTO[];
}

export interface Expense {
  id: number;
  name: string;
  description: string;
  eventDate: string;
  quantity?: number;
  currency: Currency | string;
  amount: number | string;
  status: ExpenseStatus;
  paidBy: PaidByBackend | PaidBy;
  receiptReference?: string;
  merchantId?: number;
  categoryId?: number;
  taxId?: number;
  scheduledPaymentId?: number | null;
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
  companyReceipt?: ExpenseMedia;
  expenseReceipt?: ExpenseMedia;
  expenseBy?: UserDTO;
  approvedBy?: UserDTO;
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


@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private apiHost = 'https://be.optimaxsuites.com';
  private baseUrl = `${this.apiHost}/x/api/v2/exp`;
  private expenseUrl = `${this.baseUrl}/expenses`;
  private categoryUrl = `${this.baseUrl}/categories`;
  private merchantUrl = `${this.baseUrl}/merchants`;
  private taxUrl = `${this.baseUrl}/taxes`;

  private expensesSubject = new BehaviorSubject<Expense[]>([]);
  public expenses$ = this.expensesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) {
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

  private getMultipartHeaders(): HttpHeaders {
    const authToken = sessionStorage.getItem('Token') || 
                      localStorage.getItem('token') || 
                      sessionStorage.getItem('authToken') || 
                      localStorage.getItem('authToken');
    
    const tenantId = sessionStorage.getItem('tenantId') || localStorage.getItem('tenantId') || 'mod';
    
    let headers = new HttpHeaders({
      'X-Tenant-ID': tenantId
    });

    if (authToken) {
      headers = headers.set('Authorization', `Bearer ${authToken}`);
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
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Unable to refresh expense list. Please reload the page.'
        });
        return of([] as Expense[]);
      })
    ).subscribe({
      next: (expenses) => {
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
        const sortedExpenses = expenses.sort((a, b) => b.id - a.id);
        console.log('Fetched and sorted expenses:', sortedExpenses.length);
        console.log('Top 5 IDs:', sortedExpenses.slice(0, 5).map(e => e.id));
        this.expensesSubject.next(sortedExpenses);
      }),
      catchError(this.handleError)
    );
  }

  getExpenseById(id: number | string): Observable<Expense> {
    return this.http.get<Expense>(`${this.expenseUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      tap(expense => {
        console.log('Fetched full expense by ID:', id);
        console.log('   Merchant:', expense.merchant?.name ?? 'NOT POPULATED');
        console.log('   Category:', expense.category?.name ?? 'NOT POPULATED');
      }),
      catchError(this.handleError)
    );
  }

  addExpense(expense: any, companyReceipt?: File, employeeReceipt?: File): Observable<Expense> {
    const formData = new FormData();

    // Convert expense object to JSON string and append as 'employee' field
    const expenseJson = JSON.stringify(expense);
    console.log('📤 Expense JSON payload:', expenseJson);
    formData.append('employee', new Blob([expenseJson], { type: 'application/json' }));

    // Append files if provided
    if (companyReceipt) {
      console.log('📎 Adding company receipt:', companyReceipt.name, companyReceipt.size, 'bytes');
      formData.append('companyReceipt', companyReceipt, companyReceipt.name);
    }

    if (employeeReceipt) {
      console.log('📎 Adding employee receipt:', employeeReceipt.name, employeeReceipt.size, 'bytes');
      formData.append('expenseReceipt', employeeReceipt, employeeReceipt.name);
    }

    const headers = this.getMultipartHeaders();

    return this.http.post<Expense>(this.expenseUrl, formData, { headers }).pipe(
      tap((response) => {
        console.log(' Expense created successfully:', response);
        this.loadExpenses();
      }),
      catchError(this.handleError)
    );
  }

  addExpenseWithReceipts(expense: any, companyReceipt?: File, employeeReceipt?: File): Observable<Expense> {
    return this.addExpense(expense, companyReceipt, employeeReceipt);
  }

  updateExpense(id: number, updatedExpense: Expense | any): Observable<Expense> { 
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
    const headers = this.getMultipartHeaders();
    
    return this.http.post<Expense>(`${this.expenseUrl}/${expenseId}/company-receipt`, formData, { headers }).pipe(
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
    const headers = this.getMultipartHeaders();
    
    return this.http.post<Expense>(`${this.expenseUrl}/${expenseId}/employee-receipt`, formData, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  getCategories(): Observable<CategoryDTO[]> {
    return this.http.get<CategoryDTO[]>(this.categoryUrl, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  addCategory(category: CategoryDTO): Observable<CategoryDTO> {
    return this.http.post<CategoryDTO>(this.categoryUrl, category, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getMerchants(): Observable<MerchantDTO[]> {
    return this.http.get<MerchantDTO[]>(this.merchantUrl, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  addMerchant(merchant: MerchantDTO): Observable<MerchantDTO> {
    return this.http.post<MerchantDTO>(this.merchantUrl, merchant, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getTaxRates(): Observable<TaxDTO[]> {
    return this.http.get<TaxDTO[]>(this.taxUrl, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  addTaxRate(tax: TaxDTO): Observable<TaxDTO> {
    return this.http.post<TaxDTO>(this.taxUrl, tax, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  // ============================================================================
  // FIX: Image 401 Unauthorized Error
  // ============================================================================
  // Problem: <img src="url"> doesn't send authentication headers
  // Solution: Fetch image as blob with auth headers, then display
  // ============================================================================

  /**
   * Fetch receipt image with authentication
   * Returns blob that can be displayed in <img> tag
   * 
   * WHY THIS WORKS:
   * Before (❌ Fails):
   *   <img src="https://api.com/image/abc">
   *   → Browser makes request WITHOUT auth headers
   *   → Backend returns 401 Unauthorized
   *
   * After (✅ Works):
   *   1. Angular fetches image WITH auth headers using HttpClient
   *   2. Converts response to Blob
   *   3. Creates blob URL: blob:http://localhost:4200/abc-123
   *   4. Sets <img src="blob:...">
   *   5. Browser displays image from memory
   * 
   * @param url The image URL to fetch
   * @returns Observable<Blob> The image data as a blob
   */
  getReceiptImage(url: string): Observable<Blob> {
    return this.http.get(url, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }
}
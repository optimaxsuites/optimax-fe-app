import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, throwError, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
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
  expenseBy?: UserDTO | any;
  approvedBy?: UserDTO | any;
  approvedAt?: string;
  accountingTransactionId?: number;
  rejectedBy?: UserDTO | any;
  rejectedAt?: string;
  rejectionReason?: string;
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
  private expensesUpdatedSubject = new Subject<void>();
  public expensesUpdated$ = this.expensesUpdatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) {
    this.loadExpenses();
  }


  private getHeaders(): HttpHeaders {
    const authToken =
      sessionStorage.getItem('Token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('authToken') ||
      localStorage.getItem('authToken');

    const tenantId =
      sessionStorage.getItem('tenantId') || localStorage.getItem('tenantId') || 'mod';

    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId
    });

    if (authToken) {
      headers = headers.set('Authorization', `Bearer ${authToken}`);
    } else {
      console.warn('getHeaders - NO TOKEN FOUND FOR AUTHORIZATION');
    }
    return headers;
  }

  private getMultipartHeaders(): HttpHeaders {
    const authToken =
      sessionStorage.getItem('Token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('authToken') ||
      localStorage.getItem('authToken');

    const tenantId =
      sessionStorage.getItem('tenantId') || localStorage.getItem('tenantId') || 'mod';


    let headers = new HttpHeaders({ 'X-Tenant-ID': tenantId });

    if (authToken) {
      headers = headers.set('Authorization', `Bearer ${authToken}`);
    }
    return headers;
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error | status:', error.status, '| message:', error.message);
    console.error('Response body:', error.error);
    if (error.status === 401) {
      console.error('Authentication Error: token missing or expired');
    }
    return throwError(() => new Error(error.message || 'Something bad happened; please try again later.'));
  }


  private resolveExpenseById(expense: Expense): number | null {
    const eb = expense.expenseBy as any;
    if (!eb) return null;
    if (typeof eb === 'number') return eb;
    if (typeof eb === 'object') return eb.id ?? eb.userId ?? null;
    return null;
  }


  private normaliseEventDate(eventDate: any): string {
    if (!eventDate) return new Date().toISOString();
    if (Array.isArray(eventDate)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = eventDate;
      return new Date(year, month - 1, day, hour, minute, second).toISOString();
    }
    return String(eventDate);
  }

  private buildFormData(payload: object, companyReceipt?: File, employeeReceipt?: File): FormData {
    const formData = new FormData();
    formData.append(
      'employee',
      new Blob([JSON.stringify(payload)], { type: 'application/json' })
    );
    if (companyReceipt) {
      formData.append('companyReceipt', companyReceipt, companyReceipt.name);
    }
    if (employeeReceipt) {
      formData.append('expenseReceipt', employeeReceipt, employeeReceipt.name);
    }
    return formData;
  }


  private loadExpenses(): void {
    const params = new HttpParams().set('page', '1').set('size', '1000');
    this.http
      .get<Expense[]>(this.expenseUrl, { headers: this.getHeaders(), params })
      .pipe(
        catchError((error) => {
          console.error('Error loading expenses:', error);
          this.messageService.add({
            severity: 'warn',
            summary: 'Warning',
            detail: 'Unable to refresh expense list. Please reload the page.'
          });
          return of([] as Expense[]);
        })
      )
      .subscribe({
        next: (expenses) =>
          this.expensesSubject.next(expenses.sort((a, b) => b.id - a.id)),
        error: (err) => console.error('Error loading initial expenses:', err)
      });
  }

  getExpenses(): Observable<Expense[]> {
    const params = new HttpParams().set('page', '1').set('size', '1000');
    return this.http
      .get<Expense[]>(this.expenseUrl, { headers: this.getHeaders(), params })
      .pipe(
        tap((expenses) => {
          const sorted = expenses.sort((a, b) => b.id - a.id);
          this.expensesSubject.next(sorted);
        }),
        catchError(this.handleError)
      );
  }

  getAllExpenses(): Observable<Expense[]> {
    return this.http
      .get<Expense[]>(`${this.baseUrl}/expenses/all`, { headers: this.getHeaders() })
      .pipe(
        catchError((err) => {
          console.error('getAllExpenses failed:', err);
          return this.getExpenses();
        })
      );
  }

  getExpensesByStatus(status: ExpenseStatus): Observable<Expense[]> {
    const params = new HttpParams().set('page', '1').set('size', '1000');
    const url = `${this.expenseUrl}/find/by/expense/status/${status}`;
    return this.http
      .get<Expense[]>(url, { headers: this.getHeaders(), params })
      .pipe(catchError(this.handleError));
  }

  getExpenseById(id: number | string): Observable<Expense> {
    return this.http
      .get<Expense>(`${this.expenseUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        tap((expense) => {
          console.log('Fetched full expense:', id, '| expenseBy:', expense.expenseBy);
        }),
        catchError(this.handleError)
      );
  }


  addExpense(expense: any, companyReceipt?: File, employeeReceipt?: File): Observable<Expense> {
    console.log('📤 Creating expense:', JSON.stringify(expense, null, 2));
    const formData = this.buildFormData(expense, companyReceipt, employeeReceipt);

    return this.http
      .post<Expense>(this.expenseUrl, formData, { headers: this.getMultipartHeaders() })
      .pipe(
        tap((response) => {
          console.log(' Expense created:', response);
          this.loadExpenses();
          this.expensesUpdatedSubject.next();
        }),
        catchError(this.handleError)
      );
  }

  addExpenseWithReceipts(expense: any, companyReceipt?: File, employeeReceipt?: File): Observable<Expense> {
    return this.addExpense(expense, companyReceipt, employeeReceipt);
  }

  
  updateExpense(id: number, updatedExpense: Expense | any): Observable<Expense> {
    const payload: any = {
      id,
      name: updatedExpense.name,
      description: updatedExpense.description,
      eventDate: this.normaliseEventDate(updatedExpense.eventDate),
      quantity: updatedExpense.quantity,
      currency: updatedExpense.currency,
      amount: updatedExpense.amount,
      status: updatedExpense.status,
      paidBy: updatedExpense.paidBy,
      receiptReference: updatedExpense.receiptReference || '',
      merchantId: updatedExpense.merchantId ?? updatedExpense.merchant?.id,
      categoryId: updatedExpense.categoryId ?? updatedExpense.category?.id,
      taxId: updatedExpense.taxId ?? updatedExpense.tax?.id ?? 1,
      scheduledPaymentId: updatedExpense.scheduledPaymentId || null
    };

    console.log('📤 Update payload:', JSON.stringify(payload, null, 2));

    return this.http
      .post<Expense>(this.expenseUrl, this.buildFormData(payload), {
        headers: this.getMultipartHeaders()
      })
      .pipe(
        tap((response) => {
          console.log(' Expense updated:', response);
          this.loadExpenses();
          this.expensesUpdatedSubject.next();
        }),
        catchError(this.handleError)
      );
  }

  approveExpense(expense: Expense): Observable<Expense> {
    const currentUser = JSON.parse(sessionStorage.getItem('userDetails') || '{}');
    const currentUserId = currentUser.id || 48;

    console.log('🔍 Fetching full expense before approval, ID:', expense.id);

    return this.getExpenseById(expense.id).pipe(
      // If the individual GET fails fall back to the object we already have
      catchError(() => {
        console.warn('⚠️ Could not fetch full expense — using list-level object as fallback');
        return of(expense);
      }),
      switchMap((full: Expense) => {
        const expenseById = this.resolveExpenseById(full);

        if (expenseById === null) {
          console.error('❌ expenseBy resolved to null. The DB NOT NULL constraint will reject this.');
        } else {
          console.log('👤 expenseBy ID for approval:', expenseById);
        }

        const payload: any = {
          id: full.id,
          name: full.name,
          description: full.description,
          eventDate: this.normaliseEventDate(full.eventDate),
          quantity: full.quantity,
          currency: full.currency,
          amount: full.amount,
          status: ExpenseStatus.APPROVED,
          paidBy: full.paidBy,
          receiptReference: full.receiptReference || '',
          merchantId: full.merchantId ?? full.merchant?.id,
          categoryId: full.categoryId ?? full.category?.id,
          taxId: full.taxId ?? full.tax?.id ?? 1,
          scheduledPaymentId: full.scheduledPaymentId || null,
          expenseBy: currentUserId
        };

        console.log(' Approval payload:', JSON.stringify(payload, null, 2));

        return this.http.post<Expense>(
          this.expenseUrl,
          this.buildFormData(payload),
          { headers: this.getMultipartHeaders() }
        );
      }),
      tap((response) => {
        console.log(' Expense approved:', response);
        this.loadExpenses();
        this.messageService.add({
          severity: 'success',
          summary: 'Approved',
          detail: 'Expense approved successfully!'
        });
      }),
      catchError((error) => {
        console.error('❌ Approve failed:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Approval Failed',
          detail: error?.error?.message || error.message || 'Failed to approve expense.'
        });
        return this.handleError(error);
      })
    );
  }

  rejectExpense(expense: Expense, reason?: string): Observable<Expense> {
    const currentUser = JSON.parse(sessionStorage.getItem('userDetails') || '{}');
    const currentUserId = currentUser.id || 48;

    console.log('🔍 Fetching full expense before rejection, ID:', expense.id);

    return this.getExpenseById(expense.id).pipe(
      catchError(() => {
        console.warn('⚠️ Could not fetch full expense — using list-level object as fallback');
        return of(expense);
      }),
      switchMap((full: Expense) => {
        const expenseById = this.resolveExpenseById(full);

        if (expenseById === null) {
          console.error('❌ expenseBy resolved to null. The DB NOT NULL constraint will reject this.');
        } else {
          console.log('👤 expenseBy ID for rejection:', expenseById);
        }

        const payload: any = {
          id: full.id,
          name: full.name,
          description: full.description,
          eventDate: this.normaliseEventDate(full.eventDate),
          quantity: full.quantity,
          currency: full.currency,
          amount: full.amount,
          status: ExpenseStatus.REJECTED,
          paidBy: full.paidBy,
          receiptReference: full.receiptReference || '',
          merchantId: full.merchantId ?? full.merchant?.id,
          categoryId: full.categoryId ?? full.category?.id,
          taxId: full.taxId ?? full.tax?.id ?? 1,
          scheduledPaymentId: full.scheduledPaymentId || null,
          rejectionReason: reason || 'No reason provided',
          expenseBy: currentUserId
        };

        console.log('❌ Rejection payload:', JSON.stringify(payload, null, 2));

        return this.http.post<Expense>(
          this.expenseUrl,
          this.buildFormData(payload),
          { headers: this.getMultipartHeaders() }
        );
      }),
      tap((response) => {
        console.log(' Expense rejected:', response);
        this.loadExpenses();
        this.messageService.add({
          severity: 'success',
          summary: 'Rejected',
          detail: 'Expense rejected successfully!'
        });
      }),
      catchError((error) => {
        console.error('❌ Reject failed:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Rejection Failed',
          detail: error?.error?.message || error.message || 'Failed to reject expense.'
        });
        return this.handleError(error);
      })
    );
  }


  deleteExpense(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.expenseUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        tap(() => {
          this.loadExpenses();
          this.expensesUpdatedSubject.next();
        }),
        catchError(this.handleError)
      );
  }

  getCompanyReceipt(expenseId: string): Observable<Blob> {
    return this.http
      .get(`${this.expenseUrl}/${expenseId}/company-receipt`, {
        headers: this.getHeaders(),
        responseType: 'blob'
      })
      .pipe(catchError(this.handleError));
  }

  uploadCompanyReceipt(expenseId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<Expense>(`${this.expenseUrl}/${expenseId}/company-receipt`, formData, {
        headers: this.getMultipartHeaders()
      })
      .pipe(catchError(this.handleError));
  }

  getEmployeeReceipt(expenseId: string): Observable<Blob> {
    return this.http
      .get(`${this.expenseUrl}/${expenseId}/employee-receipt`, {
        headers: this.getHeaders(),
        responseType: 'blob'
      })
      .pipe(catchError(this.handleError));
  }

  uploadEmployeeReceipt(expenseId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<Expense>(`${this.expenseUrl}/${expenseId}/employee-receipt`, formData, {
        headers: this.getMultipartHeaders()
      })
      .pipe(catchError(this.handleError));
  }

  getReceiptImage(url: string): Observable<Blob> {
    return this.http
      .get(url, { headers: this.getHeaders(), responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }


  getCategories(): Observable<CategoryDTO[]> {
    return this.http
      .get<CategoryDTO[]>(this.categoryUrl, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  addCategory(category: CategoryDTO): Observable<CategoryDTO> {
    return this.http
      .post<CategoryDTO>(this.categoryUrl, category, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }


  getMerchants(): Observable<MerchantDTO[]> {
    return this.http
      .get<MerchantDTO[]>(this.merchantUrl, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  addMerchant(merchant: MerchantDTO): Observable<MerchantDTO> {
    return this.http
      .post<MerchantDTO>(this.merchantUrl, merchant, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }


  getTaxRates(): Observable<TaxDTO[]> {
    return this.http
      .get<TaxDTO[]>(this.taxUrl, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  addTaxRate(tax: TaxDTO): Observable<TaxDTO> {
    return this.http
      .post<TaxDTO>(this.taxUrl, tax, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }


  convertToWebUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const filename = path.split('/').pop() || path;
    return `${this.expenseUrl}/images/${filename}`;
  }
}
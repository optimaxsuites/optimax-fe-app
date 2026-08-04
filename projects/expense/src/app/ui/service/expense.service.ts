import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, throwError, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ReceiptCacheService, ReceiptFileMetadata } from './receipt-cache.service';


export enum ExpenseStatus {
  PENDING  = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum PaidBy {
  COMPANY  = 'COMPANY',
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
  ONE_TIME  = 'ONE_TIME',
  RECURRING = 'RECURRING'
}

export enum SplitMethod {
  EQUAL      = 'EQUAL',
  PERCENTAGE = 'PERCENTAGE',
  CUSTOM     = 'CUSTOM'
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

export interface ExpenseLineItemDTO {
  id?: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
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
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  expenseById?: number;
  approvedById?: number;
  approvedAt?: string;
  rejectedById?: number;
  rejectedAt?: string;
  rejectionReason?: string;
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
  lineItems?: ExpenseLineItemDTO[];
  taxPercentage?: number;
  date?: string;
  signature?: string | null;
  receiptFile?: File | null;
  invoiceFile?: File | null;
  employeeReceiptFile?: File | null;
  companyReceipt?: ExpenseMedia;
  expenseReceipt?: ExpenseMedia;
  companyReceipts?: ExpenseMedia[];
  expenseReceipts?: ExpenseMedia[];
  expenseBy?: UserDTO | any;
  approvedBy?: UserDTO | any;
  accountingTransactionId?: number;
  rejectedBy?: UserDTO | any;
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
  private apiHost  = 'https://be.optimaxsuites.com';
  private baseUrl  = `${this.apiHost}/x/api/v2/exp`;
  private expenseUrl  = `${this.baseUrl}/expenses`;
  private categoryUrl = `${this.baseUrl}/categories`;
  private merchantUrl = `${this.baseUrl}/merchants`;
  private taxUrl      = `${this.baseUrl}/taxes`;

  private expensesSubject        = new BehaviorSubject<Expense[]>([]);
  public  expenses$              = this.expensesSubject.asObservable();
  private expensesUpdatedSubject = new Subject<void>();
  public  expensesUpdated$       = this.expensesUpdatedSubject.asObservable();


  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private receiptCache: ReceiptCacheService
  ) {}


  waitForToken(timeoutMs = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = this.getAuthToken();
      if (token) { resolve(); return; }

      const interval = 100;
      let elapsed = 0;
      const poll = setInterval(() => {
        elapsed += interval;
        if (this.getAuthToken()) {
          clearInterval(poll);
          console.log('[ExpenseService] waitForToken — token found after', elapsed, 'ms');
          resolve();
        } else if (elapsed >= timeoutMs) {
          clearInterval(poll);
          console.warn('[ExpenseService] waitForToken — timed out after', timeoutMs, 'ms');
          resolve(); // resolve anyway so the UI shows empty state, not a frozen spinner
        }
      }, interval);
    });
  }

  // ─── Auth helpers ────

  private getAuthToken(): string {
    return (
      sessionStorage.getItem('Token')     ||
      sessionStorage.getItem('token')     ||
      sessionStorage.getItem('authToken') ||
      localStorage.getItem('Token')       ||
      localStorage.getItem('token')       ||
      localStorage.getItem('authToken')   ||
      ''
    );
  }

  private getTenantId(): string {
    return (
      sessionStorage.getItem('tenantId') ||
      localStorage.getItem('tenantId')   ||
      'optimax'
    );
  }

  private getHeaders(): HttpHeaders {
    const token    = this.getAuthToken();
    const tenantId = this.getTenantId();

    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-ID':  tenantId
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    } else {
      console.warn('[ExpenseService] getHeaders — no auth token found. Requests may fail with 401/400.');
    }
    return headers;
  }

  private getMultipartHeaders(): HttpHeaders {
    const token    = this.getAuthToken();
    const tenantId = this.getTenantId();

    let headers = new HttpHeaders({ 'X-Tenant-ID': tenantId });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  // ─── Error handling ──

  private handleError(error: any): Observable<never> {
    console.error('[ExpenseService] API Error | status:', error.status, '| url:', error.url);
    console.error('[ExpenseService] Response body:', error.error);

    if (error.status === 401) {
      console.error('[ExpenseService] 401 — token is missing or expired. Re-login required.');
    } else if (error.status === 500) {
      console.error('[ExpenseService] 500 — backend internal error:', error.error?.message);
    }

    return throwError(() => new Error(error?.error?.message || error.message || 'Server error'));
  }

  // ─── Resolve the logged-in user's AUTH id ─────────────────────────────────

  private resolveCurrentUserId(): number | null {
    try {
      const parseNumericId = (value: any): number | null => {
        const n = Number(value);
        return !isNaN(n) && n > 0 ? n : null;
      };

      const storedId =
        sessionStorage.getItem('userid') ||
        localStorage.getItem('userid');
      if (storedId) {
        const parsed = parseNumericId(storedId);
        if (parsed) return parsed;
      }

      const regRaw =
        sessionStorage.getItem('userRegData') ||
        localStorage.getItem('userRegData');
      const reg = regRaw ? JSON.parse(regRaw) : null;
      const regId = parseNumericId(reg?.id ?? reg?.userId);
      if (regId) return regId;

      const primaryRaw =
        sessionStorage.getItem('userPrimaryInfoRegData') ||
        localStorage.getItem('userPrimaryInfoRegData');
      const primary = primaryRaw ? JSON.parse(primaryRaw) : null;
      const primaryId = parseNumericId(primary?.user?.id ?? primary?.id);
      if (primaryId) return primaryId;

      return null;
    } catch { return null; }
  }

  private resolveExpenseById(expense: Expense): number | null {
    const explicitId = Number((expense as any).expenseById);
    if (!isNaN(explicitId) && explicitId > 0) return explicitId;
    const eb = expense.expenseBy as any;
    if (!eb) return null;
    if (typeof eb === 'number') return eb;
    if (typeof eb === 'object') return eb.userId ?? eb.id ?? null;
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
    formData.append('employee', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (companyReceipt)  formData.append('companyReceipt',  companyReceipt,  companyReceipt.name);
    if (employeeReceipt) formData.append('expenseReceipt',  employeeReceipt, employeeReceipt.name);
    return formData;
  }

  // ─── Data loading ─────

  getExpenses(): Observable<Expense[]> {
    const params = new HttpParams().set('page', '1').set('size', '1000');
    return this.http
      .get<Expense[]>(this.expenseUrl, { headers: this.getHeaders(), params })
      .pipe(
        tap((expenses) => {
          const sorted = expenses.sort((a, b) => b.id - a.id);
          this.expensesSubject.next(sorted);
        }),
        catchError((error) => {
          console.error('[ExpenseService] getExpenses failed:', error.status, error.error?.message);

          const msg: string = error.error?.message || '';
          if (error.status === 500 && msg.includes('primary/info')) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Session Issue',
              detail: 'The server could not verify your session. Try logging out and back in.',
              life: 8000
            });
          } else if (error.status === 401) {
            this.messageService.add({
              severity: 'error',
              summary: 'Unauthorised',
              detail: 'Your session has expired. Please log in again.',
              life: 8000
            });
          } else if (error.status !== 500) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Could Not Load Expenses',
              detail: 'Unable to fetch expenses. Please refresh the page.',
              life: 6000
            });
          }

          const cached = this.expensesSubject.getValue();
          return of(cached.length ? cached : [] as Expense[]);
        })
      );
  }

  getAllExpenses(): Observable<Expense[]> {
    return this.http
      .get<Expense[]>(`${this.baseUrl}/expenses/all`, { headers: this.getHeaders() })
      .pipe(
        catchError((err) => {
          if (err.status === 500 || err.status === 404) {
            console.warn('[ExpenseService] /expenses/all not available, falling back to paginated endpoint');
          } else {
            console.error('[ExpenseService] getAllExpenses failed:', err.status, err.error?.message);
          }
          const params = new HttpParams().set('page', '1').set('size', '1000');
          return this.http
            .get<Expense[]>(this.expenseUrl, { headers: this.getHeaders(), params })
            .pipe(catchError(() => of([] as Expense[])));
        })
      );
  }

  getExpensesByStatus(status: ExpenseStatus): Observable<Expense[]> {
    const params = new HttpParams().set('page', '1').set('size', '1000');
    const url    = `${this.expenseUrl}/find/by/expense/status/${status}`;
    return this.http
      .get<Expense[]>(url, { headers: this.getHeaders(), params })
      .pipe(catchError(this.handleError));
  }

  getExpenseById(id: number | string): Observable<Expense> {
    return this.http
      .get<Expense>(`${this.expenseUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        tap((expense) => console.log('[ExpenseService] getExpenseById:', id, '| expenseBy:', expense.expenseBy)),
        catchError(this.handleError)
      );
  }


  addExpense(expense: any, companyReceipt?: File, employeeReceipt?: File): Observable<Expense> {
    console.log('[ExpenseService] Creating expense:', JSON.stringify(expense, null, 2));
    const formData = this.buildFormData(expense, companyReceipt, employeeReceipt);
    
    return this.http
      .post<Expense>(this.expenseUrl, formData, { headers: this.getMultipartHeaders() })
      .pipe(
        tap((response) => {
          console.log('[ExpenseService] Expense created:', response);


          console.log('[ExpenseService] API response receipt fields:', {
            companyReceipt:  response.companyReceipt,
            expenseReceipt:  response.expenseReceipt,
            companyReceipts: response.companyReceipts,
            expenseReceipts: response.expenseReceipts,
          });

          const companyReceiptMetadata: ReceiptFileMetadata[] = [];
          const employeeReceiptMetadata: ReceiptFileMetadata[] = [];

          // ── Company receipt ───────────────────────────────────────────────────
          // Try single receipt first, then array form
          const companyReceipt = response.companyReceipt
            ?? response.companyReceipts?.[0];

          if (companyReceipt?.mediaNo) {
            console.log('[ExpenseService] ✅ Real company receipt mediaNo from API:', companyReceipt.mediaNo);
            companyReceiptMetadata.push({
              fileName:   companyReceipt.name || 'receipt',
              mediaNo:    companyReceipt.mediaNo,   // ← backend-issued ID, NOT a local name
              size:       0,
              type:       'image/*',
              uploadedAt: Date.now(),
            });
          } else {
            console.warn(
              '[ExpenseService] ⚠️  Backend did not return companyReceipt.mediaNo in the create response.' +
              ' Receipt will not be cached and may not display after approval.' +
              ' Check if your backend returns the full receipt object in the POST /expenses response.'
            );
          }

          // ── Employee receipt ──────────────────────────────────────────────────
          const employeeReceipt = response.expenseReceipt
            ?? response.expenseReceipts?.[0];

          if (employeeReceipt?.mediaNo) {
            console.log('[ExpenseService] ✅ Real employee receipt mediaNo from API:', employeeReceipt.mediaNo);
            employeeReceiptMetadata.push({
              fileName:   employeeReceipt.name || 'receipt',
              mediaNo:    employeeReceipt.mediaNo,
              size:       0,
              type:       'image/*',
              uploadedAt: Date.now(),
            });
          }

          // Only call setReceiptInfo if we have at least one real mediaNo
          if (response.id && (companyReceiptMetadata.length > 0 || employeeReceiptMetadata.length > 0)) {
            this.receiptCache.setReceiptInfo(response.id, companyReceiptMetadata, employeeReceiptMetadata);
          } else if (response.id) {
            console.warn(
              `[ExpenseService] ⚠️  No valid receipt metadata received from backend for expense ${response.id}.` +
              ' Cache will not be populated. Receipts may not persist across approval.'
            );
          }

          const current = this.expensesSubject.getValue();
          this.expensesSubject.next([response, ...current]);
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
      name:               updatedExpense.name,
      description:        updatedExpense.description,
      eventDate:          this.normaliseEventDate(updatedExpense.eventDate),
      quantity:           updatedExpense.quantity,
      currency:           updatedExpense.currency,
      amount:             updatedExpense.amount,
      status:             updatedExpense.status,
      paidBy:             updatedExpense.paidBy,
      receiptReference:   updatedExpense.receiptReference || '',
      merchantId:         updatedExpense.merchantId ?? updatedExpense.merchant?.id,
      categoryId:         updatedExpense.categoryId ?? updatedExpense.category?.id,
      taxId:              updatedExpense.taxId ?? updatedExpense.tax?.id ?? 1,
      scheduledPaymentId: updatedExpense.scheduledPaymentId || null
    };

    console.log('[ExpenseService] Update payload:', JSON.stringify(payload, null, 2));
    return this.http
      .post<Expense>(this.expenseUrl, this.buildFormData(payload), { headers: this.getMultipartHeaders() })
      .pipe(
        tap((response) => {
          console.log('[ExpenseService] Expense updated:', response);
          this.expensesUpdatedSubject.next();
        }),
        catchError(this.handleError)
      );
  }

  
  approveExpense(expense: Expense): Observable<Expense> {
    const currentUserId = this.resolveCurrentUserId();
    console.log('[ExpenseService] approveExpense id:', expense.id, '| admin (approvedBy):', currentUserId);
  
    return this.getExpenseById(expense.id).pipe(
      catchError(() => {
        console.warn('[ExpenseService] getExpenseById failed in approve — using list-level object');
        return of(expense);
      }),
      switchMap((full: Expense) => {
        const originalSubmitterId =
          this.resolveExpenseById(full) ??
          this.resolveExpenseById(expense);

        if (!full.id) {
          return throwError(() => new Error('Expense ID is missing. Approval cannot continue.'));
        }
        if (!currentUserId) {
          return throwError(() => new Error('Current approver could not be resolved. Please sign in again.'));
        }
        if (!originalSubmitterId) {
          return throwError(() => new Error('Original expense owner could not be resolved. Please refresh and try again.'));
        }
  
        const payload: any = {
          id:                 full.id,
          name:               full.name,
          description:        full.description,
          eventDate:          this.normaliseEventDate(full.eventDate),
          quantity:           full.quantity,
          currency:           full.currency,
          amount:             full.amount,
          status:             ExpenseStatus.APPROVED,  // ← Must be APPROVED
          paidBy:             full.paidBy,
          receiptReference:   full.receiptReference || '',
          merchantId:         full.merchantId ?? full.merchant?.id,
          categoryId:         full.categoryId ?? full.category?.id,
          taxId:              full.taxId ?? full.tax?.id ?? null,
          scheduledPaymentId: full.scheduledPaymentId || null,
          expenseBy:          originalSubmitterId,
          approvedBy:         currentUserId,
          approvedAt:         new Date().toISOString(),
          // DON'T include receipts in the approval POST payload
          // The backend will preserve them automatically
        };
  
        console.log('[ExpenseService] Approval payload:', JSON.stringify(payload, null, 2));
  
        return this.http.post<Expense>(
          this.expenseUrl,
          this.buildFormData(payload),
          { headers: this.getMultipartHeaders() }
        ).pipe(
          switchMap((approvedExpense: Expense) => {
            // ✨ FIX: The approval POST response SHOULD include receipt data
            console.log('[ExpenseService] Approval POST response receipts:', {
              companyReceipt: approvedExpense.companyReceipt,
              expenseReceipt: approvedExpense.expenseReceipt,
              companyReceipts: approvedExpense.companyReceipts,
              expenseReceipts: approvedExpense.expenseReceipts,
            });
  
            // Re-fetch to get the confirmed approval status
            return this.getExpenseById(approvedExpense.id || full.id).pipe(
              catchError(() => {
                // If fetch fails, use the POST response which already has receipts
                console.warn('[ExpenseService] Re-fetch failed, using POST response');
                return of(approvedExpense);
              })
            );
          })
        );
      }),
      tap((response) => {
        console.log('[ExpenseService] Expense approved (final):', response);
        console.log('[ExpenseService] Receipt fields after approval:', {
          companyReceipt: response.companyReceipt,
          expenseReceipt: response.expenseReceipt,
          companyReceipts: response.companyReceipts,
          expenseReceipts: response.expenseReceipts,
        });
  
        // ✨ FIX: If receipts are missing from API response, check cache
        if (!response.companyReceipt && !response.companyReceipts) {
          const cached = this.receiptCache.getReceiptInfo(response.id);
          if (cached?.companyReceipts?.length) {
            console.log('[ExpenseService] Using cached company receipts (API returned none)');
            response.companyReceipts = cached.companyReceipts.map((meta) => ({
              id: 0,
              name: meta.fileName,
              url: `https://be.optimaxsuites.com/x/api/v2/exp/expenses/images/${meta.mediaNo}`,
              mediaNo: meta.mediaNo
            }));
            response.companyReceipt = response.companyReceipts[0];
          }
        }
  
        if (!response.expenseReceipt && !response.expenseReceipts) {
          const cached = this.receiptCache.getReceiptInfo(response.id);
          if (cached?.employeeReceipts?.length) {
            console.log('[ExpenseService] Using cached employee receipts (API returned none)');
            response.expenseReceipts = cached.employeeReceipts.map((meta) => ({
              id: 0,
              name: meta.fileName,
              url: `https://be.optimaxsuites.com/x/api/v2/exp/expenses/images/${meta.mediaNo}`,
              mediaNo: meta.mediaNo
            }));
            response.expenseReceipt = response.expenseReceipts[0];
          }
        }
  
        const current = this.expensesSubject.getValue();
        const idx = current.findIndex(e => e.id === response.id);
        if (idx !== -1) {
          const updated = [...current];
          updated[idx] = response;
          this.expensesSubject.next(updated);
        }
  
        this.expensesUpdatedSubject.next();
        this.messageService.add({ severity: 'success', summary: 'Approved', detail: 'Expense approved successfully!' });
      }),
      catchError((error) => {
        console.error('[ExpenseService] Approve failed:', error);
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
    const currentUserId = this.resolveCurrentUserId();
    console.log('[ExpenseService] rejectExpense id:', expense.id, '| admin (rejectedBy):', currentUserId);
  
    return this.getExpenseById(expense.id).pipe(
      catchError(() => {
        console.warn('[ExpenseService] getExpenseById failed in reject — using list-level object');
        return of(expense);
      }),
      switchMap((full: Expense) => {
        const originalSubmitterId =
          this.resolveExpenseById(full) ??
          this.resolveExpenseById(expense);

        if (!full.id) {
          return throwError(() => new Error('Expense ID is missing. Rejection cannot continue.'));
        }
        if (!currentUserId) {
          return throwError(() => new Error('Current approver could not be resolved. Please sign in again.'));
        }
        if (!originalSubmitterId) {
          return throwError(() => new Error('Original expense owner could not be resolved. Please refresh and try again.'));
        }
  
        const payload: any = {
          id:                 full.id,
          name:               full.name,
          description:        full.description,
          eventDate:          this.normaliseEventDate(full.eventDate),
          quantity:           full.quantity,
          currency:           full.currency,
          amount:             full.amount,
          status:             ExpenseStatus.REJECTED,  // ← Must be REJECTED
          paidBy:             full.paidBy,
          receiptReference:   full.receiptReference || '',
          merchantId:         full.merchantId ?? full.merchant?.id,
          categoryId:         full.categoryId ?? full.category?.id,
          taxId:              full.taxId ?? full.tax?.id ?? null,
          scheduledPaymentId: full.scheduledPaymentId || null,
          rejectionReason:    reason || 'No reason provided',
          expenseBy:          originalSubmitterId,
          rejectedBy:         currentUserId,
          rejectedAt:         new Date().toISOString(),
          // DON'T include receipts in the rejection POST payload
          // The backend will preserve them automatically
        };
  
        console.log('[ExpenseService] Rejection payload:', JSON.stringify(payload, null, 2));
  
        return this.http.post<Expense>(
          this.expenseUrl,
          this.buildFormData(payload),
          { headers: this.getMultipartHeaders() }
        ).pipe(
          switchMap((rejectedExpense: Expense) => {
            // ✨ FIX: The rejection POST response SHOULD include receipt data
            console.log('[ExpenseService] Rejection POST response receipts:', {
              companyReceipt: rejectedExpense.companyReceipt,
              expenseReceipt: rejectedExpense.expenseReceipt,
            });
  
            // Re-fetch to get the confirmed rejection status
            return this.getExpenseById(rejectedExpense.id || full.id).pipe(
              catchError(() => {
                console.warn('[ExpenseService] Re-fetch failed, using POST response');
                return of(rejectedExpense);
              })
            );
          })
        );
      }),
      tap((response) => {
        console.log('[ExpenseService] Expense rejected (final):', response);
        console.log('[ExpenseService] Receipt fields after rejection:', {
          companyReceipt: response.companyReceipt,
          expenseReceipt: response.expenseReceipt,
        });
  
        // ✨ FIX: If receipts are missing from API response, check cache
        if (!response.companyReceipt && !response.companyReceipts) {
          const cached = this.receiptCache.getReceiptInfo(response.id);
          if (cached?.companyReceipts?.length) {
            console.log('[ExpenseService] Using cached company receipts (API returned none)');
            response.companyReceipts = cached.companyReceipts.map((meta) => ({
              id: 0,
              name: meta.fileName,
              url: `https://be.optimaxsuites.com/x/api/v2/exp/expenses/images/${meta.mediaNo}`,
              mediaNo: meta.mediaNo
            }));
            response.companyReceipt = response.companyReceipts[0];
          }
        }
  
        if (!response.expenseReceipt && !response.expenseReceipts) {
          const cached = this.receiptCache.getReceiptInfo(response.id);
          if (cached?.employeeReceipts?.length) {
            console.log('[ExpenseService] Using cached employee receipts (API returned none)');
            response.expenseReceipts = cached.employeeReceipts.map((meta) => ({
              id: 0,
              name: meta.fileName,
              url: `https://be.optimaxsuites.com/x/api/v2/exp/expenses/images/${meta.mediaNo}`,
              mediaNo: meta.mediaNo
            }));
            response.expenseReceipt = response.expenseReceipts[0];
          }
        }
  
        const current = this.expensesSubject.getValue();
        const idx = current.findIndex(e => e.id === response.id);
        if (idx !== -1) {
          const updated = [...current];
          updated[idx] = response;
          this.expensesSubject.next(updated);
        }
  
        this.expensesUpdatedSubject.next();
        this.messageService.add({ severity: 'success', summary: 'Rejected', detail: 'Expense rejected successfully!' });
      }),
      catchError((error) => {
        console.error('[ExpenseService] Reject failed:', error);
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
          // Remove from BehaviorSubject immediately so table updates without waiting for reload
          const current = this.expensesSubject.getValue();
          this.expensesSubject.next(current.filter(e => e.id !== id));
          this.expensesUpdatedSubject.next();
        }),
        catchError(this.handleError)
      );
  }

  // ─── Receipt helpers 

  getCompanyReceipt(expenseId: string): Observable<Blob> {
    return this.http
      .get(`${this.expenseUrl}/${expenseId}/company-receipt`, { headers: this.getHeaders(), responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  uploadCompanyReceipt(expenseId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<Expense>(`${this.expenseUrl}/${expenseId}/company-receipt`, formData, { headers: this.getMultipartHeaders() })
      .pipe(catchError(this.handleError));
  }

  getEmployeeReceipt(expenseId: string): Observable<Blob> {
    return this.http
      .get(`${this.expenseUrl}/${expenseId}/employee-receipt`, { headers: this.getHeaders(), responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  uploadEmployeeReceipt(expenseId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<Expense>(`${this.expenseUrl}/${expenseId}/employee-receipt`, formData, { headers: this.getMultipartHeaders() })
      .pipe(catchError(this.handleError));
  }

  getReceiptImage(url: string): Observable<Blob> {
    return this.http
      .get(url, { headers: this.getHeaders(), responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  // ─── Lookups ─────────

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

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpContext } from '@angular/common/http';
import { BehaviorSubject, catchError, finalize, from, map, Observable, of, shareReplay, tap, throwError, switchMap } from 'rxjs';

import { SUPPRESS_ERROR_TOAST } from '../shared-component/service/error-message/error-toast.interceptor';
import { environment } from '../shared-component/environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  baseurl = 'https://be.optimaxsuites.com'
  vettingWebhookUrl = 'https://automation.optimaxsuites.com/webhook/a6eb636c-407e-49e1-9810-ee852b4a2a22'
  private employeesSubject = new BehaviorSubject<any[]>([]);
  employees$ = this.employeesSubject.asObservable();
  private employeesLoaded = false;
  private employeesLoading = false;
  private employeesRequest$: Observable<any[]> | null = null;
  
  constructor(private http: HttpClient) { }

  private getActiveSessionUserId(): string {
    return String(sessionStorage.getItem('userid') || '').trim();
  }

  private clearStaleCurrentEmployeeCache(): void {
    localStorage.removeItem('currentEmployee');
    sessionStorage.removeItem('currentEmployee');
    sessionStorage.removeItem('currentEmployeeUserId');
  }

  addEmployee(data: any): Observable<any>{
    return this.http
        .post<any>(
            this.baseurl +
                `/x/api/v2/hr/employees`, data)
        .pipe(catchError(this.handleError));
  }

  updateEmployee(data: any, id: number): Observable<any>{
    return this.http
        .put<any>(
            this.baseurl +
                `/x/api/v2/hr/employees/${id}`, data)
        .pipe(catchError(this.handleError));
  }

  uploadEmployeePhoto(employee: any, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    const context = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);
    return this.http
      .put<any>(this.baseurl + `/x/api/v2/hr/employees/${employee.id}/photo`, formData, { context })
      .pipe(catchError(this.handleError));
  }

  addBulkEmployee(data: {}[]): Observable<any>{
    return this.http
        .post<any>(
            this.baseurl +
                `/x/api/v2/hr/employees/createBatchEmployee`, data)
        .pipe(catchError(this.handleError));
  }

  sendNotificationEmail(to: string, subject: string, htmlBody: string): Observable<any> {
    return this.http
      .post<any>(this.baseurl + '/x/api/v2/notification/send-email', {
        to,
        subject,
        body: htmlBody,
        html: true,
      })
      .pipe(catchError(this.handleError));
  }

  sendWelcomeEmail(data: any): Observable<any> {
    const promise = fetch(
      'https://automation.optimaxsuites.com/webhook/6d585766-d7f8-442f-89f0-64d9502d05ac',
      {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    ).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json().catch(() => ({}));
    });
    return from(promise);
  }

  getActiveEmployees(): Observable<any[]> {
    return this.http
      .get<any[]>(this.baseurl + '/x/api/v2/hr/employees/active')
      .pipe(
        map((data: any) => Array.isArray(data) ? data : (data?.content ?? data?.data ?? [])),
        catchError(() => of([]))
      );
  }

  getAllEmployee(force = false): Observable<any[]> {
    if (!force && this.employeesLoaded) {
      return of(this.employeesSubject.value);
    }

    if (!force && this.employeesLoading && this.employeesRequest$) {
      return this.employeesRequest$;
    }

    this.employeesLoading = true;
    const request$ = this.http
      .get<any>(this.baseurl + `/x/api/v2/hr/employees?page=1&size=1200`)
      .pipe(
        map((data) => this.normalizeEmployees(data)),
        tap((employees) => {
          this.employeesSubject.next(employees);
          this.employeesLoaded = true;
        }),
        catchError(this.handleError),
        finalize(() => {
          this.employeesLoading = false;
          this.employeesRequest$ = null;
        }),
        shareReplay(1)
      );

    this.employeesRequest$ = request$;
    return request$;
  }

  ensureEmployeesLoaded(): void {
    this.getAllEmployee().subscribe({
      error: () => undefined
    });
  }

  refreshEmployees(): Observable<any[]> {
    return this.getAllEmployee(true);
  }

  getEmployeeById(id: number | string): Observable<any>{
    return this.http
        .get<any>(
            this.baseurl +
                `/x/api/v2/hr/employees/${id}`)
        .pipe(catchError(this.handleError));
  }

  /**
   * Get employee by user ID
   * This endpoint might not work for all users due to permissions
   */
  getEmployeeByUserId(userId: number | string): Observable<any> {
    return this.http
      .get<any>(
        this.baseurl +
          `/x/api/v2/hr/employees/employee/by/userId/${userId}`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Get the employee ID for the currently logged-in user
   * This method tries multiple strategies to find the correct employee ID
   */
  getEmployeeIdForCurrentUser(): Observable<number> {
    const userId = sessionStorage.getItem('userid');
    
    if (!userId) {
      // In development mode or missing session, fallback to default user/employee ID (1)
      if (environment.env === 'development') {
        console.warn('No user ID found in session; using fallback employee ID (1) for development.');
        return of(1);
      }
      return throwError(() => new Error('No user ID found in session'));
    }
    
    // Strategy 1: Try to get from stored employee ID scoped to active user session
    const storedEmployeeId = sessionStorage.getItem('employeeId');
    const storedEmployeeUserId = sessionStorage.getItem('employeeUserId');
    if (
      storedEmployeeId
      && storedEmployeeId !== 'undefined'
      && storedEmployeeId !== 'null'
      && storedEmployeeUserId
      && String(storedEmployeeUserId) === String(userId)
    ) {
      return of(Number(storedEmployeeId));
    }

    // Clear stale employee cache when switching users.
    if (storedEmployeeId && storedEmployeeUserId && String(storedEmployeeUserId) !== String(userId)) {
      sessionStorage.removeItem('employeeId');
    }

    // Strategy 2: Ask the backend directly for the employee record linked to this login user ID.
    // (Previously this scanned the full employee list and, as a last resort, matched
    // `employee.id === userId` — but an employee's record ID and their login user ID are
    // unrelated identifier spaces, so that match was only ever coincidentally correct and
    // could silently resolve to the WRONG employee. A hardcoded per-user fallback map used to
    // sit here too, for the same reason — removed for the same reason.)
    return this.getEmployeeByUserId(userId).pipe(
      map(employee => {
        if (!employee?.id) {
          throw new Error(`No employee found for user ID ${userId}`);
        }
        sessionStorage.setItem('employeeId', String(employee.id));
        sessionStorage.setItem('employeeUserId', String(userId));
        return employee.id;
      }),
      catchError((error) => {
        console.error(`Failed to resolve employee for user ${userId}:`, error);

        if (environment.env === 'development') {
          console.warn(`Could not determine employee ID for user ${userId}; falling back to ID 1 in dev mode.`);
          return of(1);
        }

        return throwError(() => new Error(`Could not determine employee ID for user ${userId}`));
      })
    );
  }

  /**
   * Get the full employee object for the current user
   */
  getCurrentEmployee(): Observable<any> {
    const activeUserId = this.getActiveSessionUserId();
    const cachedUserId = String(sessionStorage.getItem('currentEmployeeUserId') || '').trim();
    const storedEmployee = localStorage.getItem('currentEmployee') || sessionStorage.getItem('currentEmployee');

    if (storedEmployee && activeUserId && cachedUserId && cachedUserId === activeUserId) {
      try {
        const employee = JSON.parse(storedEmployee);
        if (employee && employee.id) {
          console.log('Using stored employee:', employee);
          return of(employee);
        }
      } catch(e) {}
    }

    // Cache belongs to a different user (or cannot be validated), force refresh.
    this.clearStaleCurrentEmployeeCache();
    
    return this.getEmployeeIdForCurrentUser().pipe(
      switchMap(employeeId => this.getEmployeeById(employeeId)),
      tap(employee => {
        console.log('Fetched current employee:', employee);
        localStorage.setItem('currentEmployee', JSON.stringify(employee));
        sessionStorage.setItem('currentEmployee', JSON.stringify(employee));
        if (activeUserId) {
          sessionStorage.setItem('currentEmployeeUserId', activeUserId);
        }
        if (employee.id) {
          sessionStorage.setItem('employeeId', String(employee.id));
          if (activeUserId) {
            sessionStorage.setItem('employeeUserId', activeUserId);
          }
        }
      })
    );
  }

  deleteEmployee(id: number | string): Observable<any> {
    return this.http
      .delete<any>(
        this.baseurl +
          `/x/api/v2/hr/employees/${id}`)
      .pipe(catchError(this.handleError));
  }

  
  getSalaryById(id: number): Observable<any>{
    return this.http
        .get<any>(
            this.baseurl +
                `/x/api/v2/hr/salaries/getSalaryByLevel/${id}`)
        .pipe(catchError(this.handleError));
  }

  getAllAllowanceTypes(): Observable<any[]> {
    return this.http
      .get<any>(this.baseurl + '/x/api/v2/hr/allowanceTypes?page=1&size=100')
      .pipe(catchError(this.handleError));
  }

  getAllBonusTypes(): Observable<any[]> {
    return this.http
      .get<any>(this.baseurl + '/x/api/v2/hr/bonusTypes')
      .pipe(catchError(this.handleError));
  }

  getAllDeductionTypes(): Observable<any[]> {
    return this.http
      .get<any>(this.baseurl + '/x/api/v2/hr/deductionsTypes')
      .pipe(catchError(this.handleError));
  }

  getAllowanceTypeById(id: number){
    return this.http
    .get<any>(
        this.baseurl +
            `/x/api/v2/hr/allowanceTypes/${id}`)
    .pipe(catchError(this.handleError));
  }

  getBonusTypeById(id: number){
    return this.http
    .get<any>(
        this.baseurl +
            `/x/api/v2/hr/bonusTypes/${id}`)
    .pipe(catchError(this.handleError));
  }

  getDeductionTypeById(id: number){
    return this.http
    .get<any>(
        this.baseurl +
            `/x/api/v2/hr/deductionsType/${id}`)
    .pipe(catchError(this.handleError));
  }

  getOverTimeTypeById(id: number){
    return this.http
    .get<any>(
        this.baseurl +
            `/x/api/v2/hr/overtimeTypes/${id}`)
    .pipe(catchError(this.handleError));
  }

  getEmployeeImage(fileName: string){
    return this.http
    .get<any>(
        this.baseurl +
            `/x/api/v2/hr/employees/images/${fileName}`, { responseType: 'blob' as 'json' })
    .pipe(catchError(this.handleError));
  }

  addNOK(data: any) {
    return this.http
    .post<any>(
        this.baseurl +
            `/x/api/v2/hr/nextOfKins`, data)
    .pipe(catchError(this.handleError));
  }

  getNOKByEmployeeId(id: any) {
    return this.http
    .get<any>(
        this.baseurl +
            `/x/api/v2/hr/nextOfKins/getNextOfKinByEmployeeId/${id}`)
    .pipe(catchError(this.handleError));
  }

  updateNOK(id: number, data: any) {
    return this.http
    .put<any>(this.baseurl + `/x/api/v2/hr/nextOfKins/${id}`, data)
    .pipe(catchError(this.handleError));
  }

  deleteNOK(id: number) {
    return this.http
    .delete<any>(this.baseurl + `/x/api/v2/hr/nextOfKins/${id}`)
    .pipe(catchError(this.handleError));
  }

  addGuarantor(data: any) {
    return this.http
    .post<any>(
        this.baseurl +
            `/x/api/v2/hr/guarantors`, data)
    .pipe(catchError(this.handleError));
  }

  getGuarantor(id: any) {
    return this.http
    .get<any>(
        this.baseurl +
            `/x/api/v2/hr/guarantors/getGuarantorByEmployeeId/${id}`)
    .pipe(catchError(this.handleError));
  }

  updateGuarantor(id: number, data: any) {
    return this.http
    .put<any>(this.baseurl + `/x/api/v2/hr/guarantors/${id}`, data)
    .pipe(catchError(this.handleError));
  }

  deleteGuarantor(id: number) {
    return this.http
    .delete<any>(this.baseurl + `/x/api/v2/hr/guarantors/${id}`)
    .pipe(catchError(this.handleError));
  }

  sendOnboardingVetting(payload: any, data: any): Observable<any> {
    const context = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);
    return this.http
      .post<any>(this.vettingWebhookUrl, {payload, data}, { context })
      .pipe(catchError(this.handleError));
  }

  getOffboarding(employeeId: number | string): Observable<any> {
    return this.http
      .get<any>(this.baseurl + `/x/api/v2/hr/offboarding/employee/${employeeId}`)
      .pipe(catchError(this.handleError));
  }

  createOffboarding(data: any): Observable<any> {
    return this.http
      .post<any>(this.baseurl + `/x/api/v2/hr/offboarding`, data)
      .pipe(catchError(this.handleError));
  }

  updateOffboarding(id: number | string, data: any): Observable<any> {
    return this.http
      .put<any>(this.baseurl + `/x/api/v2/hr/offboarding/${id}`, data)
      .pipe(catchError(this.handleError));
  }

  submitGuarantorConfirmation(data: FormData): Observable<any> {
    const context = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);
    return this.http
      .post<any>(this.vettingWebhookUrl, data, { context })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
        console.error("An error occurred:", error.error.message);
    } else {
        console.error(
          `Backend returned code ${error.status} for ${error.url || 'unknown URL'}, ` +
                `body was: ${JSON.stringify(error.error)}`
        );
    }
    return throwError(() => error);
  }

  private normalizeEmployees(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }
}
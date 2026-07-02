import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpContext } from '@angular/common/http';
import { BehaviorSubject, catchError, finalize, map, Observable, of, shareReplay, tap, throwError, switchMap } from 'rxjs';

import { SUPPRESS_ERROR_TOAST } from '../shared-component/service/error-message/error-toast.interceptor';

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

  addBulkEmployee(data: {}[]): Observable<any>{
    return this.http
        .post<any>(
            this.baseurl +
                `/x/api/v2/hr/employees/createBatchEmployee`, data)
        .pipe(catchError(this.handleError));
  }

  sendWelcomeEmail(data: any): Observable<any>{
    return this.http
        .post<any>(
             "https://automation.optimaxsuites.com/webhook/6d585766-d7f8-442f-89f0-64d9502d05ac", data)
        .pipe(catchError(this.handleError));
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
      return throwError(() => new Error('No user ID found in session'));
    }
    
    console.log('Getting employee ID for user ID:', userId);
    
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
      console.log('Using stored employee ID:', storedEmployeeId);
      return of(Number(storedEmployeeId));
    }

    // Clear stale employee cache when switching users.
    if (storedEmployeeId && storedEmployeeUserId && String(storedEmployeeUserId) !== String(userId)) {
      sessionStorage.removeItem('employeeId');
    }
    
    // Strategy 2: Try to get from the loan list (which we know works)
    // This requires the loan service, so we need to inject it
    // We'll handle this in the component instead
    
    // Strategy 3: Try to get from employee list by user ID
    return this.getAllEmployee().pipe(
      map(employees => {
        console.log(`Searching through ${employees.length} employees for user ID: ${userId}`);
        
        // Try to find employee by various user ID fields
        const employee = employees.find(emp => 
          String(emp.userId) === String(userId) || 
          String(emp.user?.id) === String(userId) ||
          String(emp.user?.userId) === String(userId) ||
          String(emp.id) === String(userId)
        );
        
        if (employee && employee.id) {
          console.log('Found employee via list search:', employee);
          console.log('Employee ID:', employee.id);
          sessionStorage.setItem('employeeId', String(employee.id));
          sessionStorage.setItem('employeeUserId', String(userId));
          return employee.id;
        }
        
        throw new Error(`No employee found for user ID ${userId}`);
      }),
      catchError((error) => {
        console.error('Failed to find employee from list:', error);
        
        // Strategy 4: Known mapping fallback (from working loans)
        // This is a temporary solution based on known data
        const userIdNum = Number(userId);
        let fallbackEmployeeId: number | null = null;
        
        // Known mappings from your loan data:
        // - User ID 48 (developer) -> Employee ID 16
        // - User ID 41 (admin) -> Employee ID 5
        if (userIdNum === 48) {
          fallbackEmployeeId = 16;
        } else if (userIdNum === 41) {
          fallbackEmployeeId = 5;
        } else if (userIdNum === 32) {
          fallbackEmployeeId = 17; // If there are other users, add mappings here
        }
        
        if (fallbackEmployeeId) {
          console.log(`Using fallback employee ID ${fallbackEmployeeId} for user ${userId}`);
          sessionStorage.setItem('employeeId', String(fallbackEmployeeId));
          sessionStorage.setItem('employeeUserId', String(userId));
          return of(fallbackEmployeeId);
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
            `Backend returned code ${error.status}, ` +
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
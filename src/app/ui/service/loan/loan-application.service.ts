// loan-application.service.ts
import { Injectable, isDevMode } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { LoanApplication, LoanApplicationFormData } from './loan.types';
import { LoanService } from './loan.service';
import { EmployeeService } from '../../service/employee.service';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
// import { catchError, map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LoanApplicationService {
  private readonly applicationsSubject = new BehaviorSubject<LoanApplication[]>([]);
  private hasLoadedApplications = false;

  constructor(
    private loanService: LoanService,
    private employeeService: EmployeeService
  ) {}

  // Submit a new loan application
  submitLoanApplication(formData: LoanApplicationFormData){
    return this.loanService.createLoanApplication(formData).pipe(
       catchError(this.handleError)
    );
  }

  // Get all applications
  getAllApplications(): Observable<LoanApplication[]> {
    return this.refreshApplications();
  }

  // Get application by ID
  getApplicationById(id: string): Observable<LoanApplication | undefined> {
    return this.loanService.getLoanApplicationByIdentifier(id).pipe(
      tap((application) => {
        if (application) {
          this.upsertApplication(application);
        }
      })
    );
  }

  // Get applications by employee ID
  getApplicationsByEmployeeId(employeeId: string, employeeName?: string): Observable<LoanApplication[]> {
    return this.refreshApplications().pipe(
      map((applications) => this.filterApplicationsByEmployee(applications, employeeId, employeeName))
    );
  }

  // Get real-time observable
  getApplicationsObservable(): Observable<LoanApplication[]> {
    if (!this.hasLoadedApplications) {
      this.refreshApplications().subscribe({
        error: () => {
          this.applicationsSubject.next([]);
        }
      });
    }

    return this.applicationsSubject.asObservable();
  }

  saveApplication(application: LoanApplication): Observable<LoanApplication> {
    return this.loanService.saveLoanApplication(application).pipe(
      tap((savedApplication) => this.upsertApplication(savedApplication))
    );
  }

  refreshApplications(): Observable<LoanApplication[]> {
    return this.loanService.listLoanApplications().pipe(
      tap((applications) => {
        this.hasLoadedApplications = true;
        this.applicationsSubject.next(applications);
      })
    );
  }

  private resolveEmployeeRecord(formData: LoanApplicationFormData): Observable<any> {
    const directEmployeeId =
      typeof formData.employeeId === 'number' && Number.isFinite(formData.employeeId)
        ? formData.employeeId
        : Number(formData.employeeId);

    return this.employeeService.getAllEmployee().pipe(
      map((response) => this.extractEmployees(response)),
      switchMap((employees) => {
        const matchingEmployee =
          employees.find((employee) => this.matchesDirectEmployeeId(employee, directEmployeeId)) ||
          employees.find((employee) => this.isMatchingEmployee(employee, formData)) ||
          this.findEmployeeFromSession(employees);

        if (matchingEmployee) {
          return of(matchingEmployee);
        }

        if (Number.isFinite(directEmployeeId)) {
          return this.employeeService.getEmployeeById(directEmployeeId);
        }

        throw new Error('Unable to resolve employee record for loan application');
      })
    );
  }

  private matchesDirectEmployeeId(employee: any, directEmployeeId: number): boolean {
    if (!Number.isFinite(directEmployeeId)) {
      return false;
    }

    const normalizedDirectId = String(directEmployeeId).trim();
    const employeeIdentifiers = [
      employee?.id,
      employee?.userId,
      employee?.user?.id,
      employee?.employeeId,
      employee?.employeeCode,
      employee?.staffId,
    ]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean);

    return employeeIdentifiers.includes(normalizedDirectId);
  }

  private extractEmployees(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.content)) {
      return response.content;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
  }

  private isMatchingEmployee(employee: any, formData: LoanApplicationFormData): boolean {
    const formEmployeeId = String(formData.employeeId || '').trim();
    const employeeIdentifiers = [employee?.id, employee?.employeeId, employee?.employeeCode, employee?.staffId]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean);

    if (formEmployeeId && employeeIdentifiers.includes(formEmployeeId)) {
      return true;
    }

    const normalizedEmployeeName = this.normalizeValue(
      employee?.fullName || [employee?.firstName, employee?.lastName].filter(Boolean).join(' ')
    );
    const normalizedFormName = this.normalizeValue(formData.employeeName || '');

    return !!normalizedEmployeeName && normalizedEmployeeName === normalizedFormName;
  }

  private findEmployeeFromSession(employees: any[]): any | undefined {
    const userRegData = this.readStoredUserRegData();
    const sessionUsername = this.normalizeValue(sessionStorage.getItem('username') || localStorage.getItem('username') || '');
    const sessionUserId = String(sessionStorage.getItem('userid') || localStorage.getItem('userid') || '').trim();
    const regEmail = this.normalizeValue(userRegData?.email || '');
    const regUsername = this.normalizeValue(userRegData?.username || '');

    return employees.find((employee) => {
      const employeeIdentifiers = [
        employee?.id,
        employee?.userId,
        employee?.user?.id,
        employee?.employeeId,
        employee?.employeeCode,
        employee?.staffId
      ]
        .map((value) => String(value ?? '').trim())
        .filter(Boolean);
      const employeeEmail = this.normalizeValue(employee?.email || employee?.workEmail || '');
      const employeeUsername = this.normalizeValue(employee?.username || employee?.userName || '');
      const employeeName = this.normalizeValue(
        employee?.fullName || [employee?.firstName, employee?.lastName].filter(Boolean).join(' ')
      );

      if (sessionUserId && employeeIdentifiers.includes(sessionUserId)) {
        return true;
      }

      if (regEmail && employeeEmail === regEmail) {
        return true;
      }

      if (sessionUsername && (employeeUsername === sessionUsername || employeeEmail === sessionUsername || employeeName === sessionUsername)) {
        return true;
      }

      if (regUsername && (employeeUsername === regUsername || employeeEmail === regUsername || employeeName === regUsername)) {
        return true;
      }

      return false;
    });
  }

  private readStoredUserRegData(): any | null {
    const rawValue = sessionStorage.getItem('userRegData') || localStorage.getItem('userRegData');

    if (!rawValue || rawValue === 'undefined' || rawValue === 'null') {
      return null;
    }

    try {
      return JSON.parse(rawValue);
    } catch {
      return null;
    }
  }

  private filterApplicationsByEmployee(
    applications: LoanApplication[],
    employeeId: string,
    employeeName?: string
  ): LoanApplication[] {
    const normalizedEmployeeId = String(employeeId || '').trim();
    const normalizedEmployeeName = this.normalizeValue(employeeName || '');

    return applications.filter((application) => {
      if (normalizedEmployeeId && String(application.employeeId || '').trim() === normalizedEmployeeId) {
        return true;
      }

      if (normalizedEmployeeName && this.normalizeValue(application.fullName || '') === normalizedEmployeeName) {
        return true;
      }

      return false;
    });
  }

  private upsertApplication(application: LoanApplication): void {
    const currentApplications = [...this.applicationsSubject.value];
    const existingIndex = currentApplications.findIndex((item) =>
      item.id === application.id || item.loanCode === application.loanCode
    );

    if (existingIndex >= 0) {
      currentApplications[existingIndex] = application;
    } else {
      currentApplications.unshift(application);
    }

    this.applicationsSubject.next(currentApplications);
  }

  private normalizeValue(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private handleError(error: any): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      if (isDevMode()) {
        console.error('Loan submission HTTP error', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          error: error.error
        });
      }
      return throwError(() => error);
    }

    console.error('Loan submission error', error);
    return throwError(() => error);
  }
}
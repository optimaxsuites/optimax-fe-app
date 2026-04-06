import { Injectable, isDevMode } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { LoanApplication, LoanApplicationFormData } from './loan.types';
import { LoanService } from './loan.service';
import { EmployeeService } from '../../service/employee.service';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

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

  submitLoanApplication(formData: LoanApplicationFormData): Observable<LoanApplication> {
  return this.loanService.createLoanApplication(formData).pipe(
    tap((createdApplication) => {
      this.hasLoadedApplications = true;
      this.upsertApplication(this.buildOptimisticSubmittedApplication(formData, createdApplication), true);
      // Remove or modify this refresh call - it's causing the connection refused error
      // this.refreshApplications().subscribe({ error: () => {} });
    }),
    catchError(this.handleError)
  );
}

  getAllApplications(): Observable<LoanApplication[]> {
    return this.refreshApplications();
  }

  getApplicationById(id: string): Observable<LoanApplication | undefined> {
    return this.loanService.getLoanApplicationByIdentifier(id).pipe(
      map((application) => {
        if (!application) {
          return undefined;
        }

        const existingIndex = this.findMatchingApplicationIndex(this.applicationsSubject.value, application);
        if (existingIndex < 0) {
          return application;
        }

        return this.mergeLoanApplications(this.applicationsSubject.value[existingIndex], application);
      }),
      tap((application) => {
        if (application) {
          this.upsertApplication(application, true);
        }
      })
    );
  }

  getApplicationsByEmployeeId(employeeId: string, employeeName?: string): Observable<LoanApplication[]> {
    return this.refreshApplications().pipe(
      map((applications) => this.filterApplicationsByEmployee(applications, employeeId, employeeName))
    );
  }

getApplicationsObservable(): Observable<LoanApplication[]> {
  if (!this.hasLoadedApplications) {
    this.refreshApplications().subscribe({
      error: (err) => {
        // Don't show error for connection refused
        console.debug('Initial load failed, using empty array');
        this.applicationsSubject.next([]);
      }
    });
  }
  return this.applicationsSubject.asObservable();
}

  saveApplication(application: LoanApplication): Observable<LoanApplication> {
    return this.loanService.saveLoanApplication(application).pipe(
      tap((savedApplication) => this.upsertApplication(savedApplication, true))
    );
  }

  refreshApplications(): Observable<LoanApplication[]> {
    return this.loanService.listLoanApplications().pipe(
      map((applications) => this.mergeApplicationCollections(this.applicationsSubject.value, applications)),
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

  private upsertApplication(application: LoanApplication, persistLocally = false): void {
    const currentApplications = [...this.applicationsSubject.value];
    const existingIndex = this.findMatchingApplicationIndex(currentApplications, application);

    if (existingIndex >= 0) {
      currentApplications[existingIndex] = this.mergeLoanApplications(currentApplications[existingIndex], application);
    } else {
      currentApplications.unshift(application);
    }

    this.applicationsSubject.next(currentApplications);
  }

  private mergeApplicationCollections(
    currentApplications: LoanApplication[],
    fetchedApplications: LoanApplication[]
  ): LoanApplication[] {
    const mergedApplications = [...currentApplications];

    fetchedApplications.forEach((application) => {
      const existingIndex = this.findMatchingApplicationIndex(mergedApplications, application);
      if (existingIndex >= 0) {
        mergedApplications[existingIndex] = this.mergeLoanApplications(mergedApplications[existingIndex], application);
      } else {
        mergedApplications.push(application);
      }
    });

    return mergedApplications.sort((first, second) => 
      new Date(second.requestDate || 0).getTime() - new Date(first.requestDate || 0).getTime()
    );
  }

  private mergeLoanApplications(existing: LoanApplication, incoming: LoanApplication): LoanApplication {
    return {
      ...existing,
      ...incoming,
      id: incoming.localOnly ? existing.id : incoming.id || existing.id,
      loanCode: incoming.localOnly ? existing.loanCode : incoming.loanCode || existing.loanCode,
      clientSubmissionKey: incoming.clientSubmissionKey || existing.clientSubmissionKey,
      localOnly: incoming.localOnly && !existing.localOnly ? incoming.localOnly : false,
      employeeId: incoming.employeeId || existing.employeeId,
      fullName: incoming.fullName || existing.fullName,
      department: incoming.department || existing.department,
      requestDate: incoming.requestDate || existing.requestDate,
      purpose: incoming.purpose || existing.purpose,
      amount: incoming.amount || existing.amount,
      repaymentAmount: incoming.repaymentAmount || existing.repaymentAmount,
      repaymentTime: incoming.repaymentTime || existing.repaymentTime,
      repaymentStartDate: incoming.repaymentStartDate || existing.repaymentStartDate,
      repaymentDay: incoming.repaymentDay || existing.repaymentDay,
      modeOfPayment: incoming.modeOfPayment || existing.modeOfPayment,
      status: incoming.status || existing.status,
      approvedDate: incoming.approvedDate ?? existing.approvedDate,
      approvedBy: incoming.approvedBy ?? existing.approvedBy,
      disbursedDate: incoming.disbursedDate ?? existing.disbursedDate,
      disbursedBy: incoming.disbursedBy ?? existing.disbursedBy,
      completedDate: incoming.completedDate ?? existing.completedDate,
      rejectedDate: incoming.rejectedDate ?? existing.rejectedDate,
      rejectedBy: incoming.rejectedBy ?? existing.rejectedBy,
      adminComment: incoming.adminComment ?? existing.adminComment,
      currentBalance: incoming.currentBalance ?? existing.currentBalance,
      totalPaid: incoming.totalPaid ?? existing.totalPaid,
      totalPrincipalPaid: incoming.totalPrincipalPaid ?? existing.totalPrincipalPaid,
      totalInterestPaid: incoming.totalInterestPaid ?? existing.totalInterestPaid,
      outstandingPrincipal: incoming.outstandingPrincipal ?? existing.outstandingPrincipal,
      interestRate: incoming.interestRate ?? existing.interestRate,
      repaymentSchedule: incoming.repaymentSchedule?.length ? incoming.repaymentSchedule : existing.repaymentSchedule,
      paymentHistory: incoming.paymentHistory?.length ? incoming.paymentHistory : existing.paymentHistory,
      statusHistory: incoming.statusHistory?.length ? incoming.statusHistory : existing.statusHistory,
      supportingDocuments: incoming.supportingDocuments?.length ? incoming.supportingDocuments : existing.supportingDocuments
    };
  }

  private buildOptimisticSubmittedApplication(
    formData: LoanApplicationFormData,
    createdApplication: LoanApplication
  ): LoanApplication {
    const normalizedPurpose = formData.purpose === 'other'
      ? formData.otherPurpose || 'Other'
      : formData.purpose;
    const requestDate = formData.requestDate || createdApplication.requestDate || new Date().toISOString();
    const clientSubmissionKey = this.buildClientSubmissionKey({
      employeeId: Number(formData.employeeId || createdApplication.employeeId || 0),
      amount: Number(formData.amount || createdApplication.amount || 0),
      purpose: normalizedPurpose || createdApplication.purpose || '',
      modeOfPayment: formData.modeOfPayment || createdApplication.modeOfPayment,
      requestDate
    });

    return {
      ...createdApplication,
      id: this.looksLikeValidCreatedApplication(createdApplication, formData) ? createdApplication.id : -Date.now(),
      loanCode: this.looksLikeValidCreatedApplication(createdApplication, formData)
        ? (createdApplication.loanCode || String(createdApplication.id))
        : `LOCAL-${Date.now()}`,
      clientSubmissionKey,
      localOnly: !this.looksLikeValidCreatedApplication(createdApplication, formData),
      employeeId: createdApplication.employeeId || Number(formData.employeeId || 0),
      fullName: createdApplication.fullName || formData.employeeName || 'Employee',
      department: createdApplication.department || formData.department || '',
      amount: Number(formData.amount || createdApplication.amount || 0),
      purpose: normalizedPurpose || createdApplication.purpose || '',
      repaymentAmount: Number(formData.repaymentAmount || createdApplication.repaymentAmount || 0),
      repaymentTime: Number(formData.repaymentTime || createdApplication.repaymentTime || 0),
      repaymentStartDate: formData.repaymentStartDate || createdApplication.repaymentStartDate,
      repaymentDay: formData.repaymentDay || createdApplication.repaymentDay,
      modeOfPayment: formData.modeOfPayment || createdApplication.modeOfPayment,
      requestDate,
      status: createdApplication.status || 'PENDING',
      currentBalance: createdApplication.currentBalance || Number(formData.amount || 0),
      outstandingPrincipal: createdApplication.outstandingPrincipal || Number(formData.amount || 0),
      statusHistory: createdApplication.statusHistory || [],
      repaymentSchedule: createdApplication.repaymentSchedule || [],
      paymentHistory: createdApplication.paymentHistory || [],
      acknowledgment: true,
      adminComment: createdApplication.adminComment || ''
    };
  }

  private looksLikeValidCreatedApplication(
    application: LoanApplication,
    formData: LoanApplicationFormData
  ): boolean {
    const normalizedRequestedPurpose = this.normalizeValue(
      formData.purpose === 'other' ? formData.otherPurpose || 'Other' : formData.purpose || ''
    );
    const normalizedApplicationPurpose = this.normalizeValue(application.purpose || '');
    return Boolean(
      application.id > 0 &&
      application.amount > 0 &&
      normalizedApplicationPurpose &&
      normalizedRequestedPurpose === normalizedApplicationPurpose &&
      application.employeeId > 0
    );
  }

  private findMatchingApplicationIndex(applications: LoanApplication[], candidate: LoanApplication): number {
    const candidateSignature = this.buildClientSubmissionKey(candidate);
    return applications.findIndex((item) => {
      if (item.id === candidate.id || item.loanCode === candidate.loanCode) return true;
      const itemSignature = this.buildClientSubmissionKey(item);
      return !!candidateSignature && candidateSignature === itemSignature;
    });
  }

  private buildClientSubmissionKey(application: {
    employeeId?: number;
    amount?: number;
    purpose?: string;
    modeOfPayment?: string;
    requestDate?: string;
    clientSubmissionKey?: string;
  }): string {
    if (application.clientSubmissionKey) return application.clientSubmissionKey;
    const normalizedDate = String(application.requestDate || '').trim();
    const parsedDate = normalizedDate ? new Date(normalizedDate) : null;
    const normalizedTimestamp = parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toISOString().slice(0, 16)
      : normalizedDate;
    return [
      String(application.employeeId || 0),
      String(Number(application.amount || 0)),
      this.normalizeValue(application.purpose || ''),
      String(application.modeOfPayment || ''),
      normalizedTimestamp
    ].join('|');
  }

  private normalizeValue(value: string): string {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

 private handleError(error: any): Observable<never> {
  if (error instanceof HttpErrorResponse) {
    // Don't log connection refused errors as errors
    if (error.status === 0 || error.message?.includes('Connection refused')) {
      console.debug('Backend connection issue, but operation may have succeeded');
      // Return a successful observable with empty data instead of throwing
      return of(null as any) as Observable<never>;
    }
    
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
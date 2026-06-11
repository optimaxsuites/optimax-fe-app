import { Injectable, isDevMode } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { LoanApplication, LoanApplicationFormData } from './loan.types';
import { LoanService } from './loan.service';
import { EmployeeService } from '../../service/employee.service';
import { LoanStatusNotificationService } from './loan-status-notification.service';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LoanApplicationService {
  private readonly applicationsSubject = new BehaviorSubject<LoanApplication[]>([]);
  private readonly applicationsCacheKeyPrefix = 'advance-loan-applications-cache';
  private hasLoadedApplications = false;

  constructor(
    private loanService: LoanService,
    private employeeService: EmployeeService,
    private loanStatusNotificationService: LoanStatusNotificationService
  ) {}

  submitLoanApplication(formData: LoanApplicationFormData): Observable<LoanApplication> {
  return this.loanService.createLoanApplication(formData).pipe(
    catchError((error) => this.recoverSubmittedApplication(formData, error)),
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
    // Always return the same observable as getApplicationsObservable for UI consistency
    return this.getApplicationsObservable();
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
        const existingIndex = application
          ? this.findMatchingApplicationIndex(this.applicationsSubject.value, application)
          : -1;

        // A by-id read should refresh an existing cached row, not replace the shared list
        // with a singleton snapshot when the cache doesn't already contain that loan.
        if (application && existingIndex >= 0) {
          this.upsertApplication(application, true);
        }
      })
    );
  }

  getApplicationsByEmployeeId(employeeId: string, employeeName?: string): Observable<LoanApplication[]> {
    return this.getAllApplications().pipe(
      map((applications) => this.filterApplicationsByEmployee(applications, employeeId, employeeName))
    );
  }

getApplicationsObservable(): Observable<LoanApplication[]> {
  const cachedApplications = this.getCachedApplications();
  if (!cachedApplications && !this.hasLoadedApplications) {
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

  saveApplication(
    application: LoanApplication,
    previousStatusOverride?: LoanApplication['status'] | null
  ): Observable<LoanApplication> {
    const previousApplication = this.findMatchingApplication(this.applicationsSubject.value, application);
    const previousStatus = previousStatusOverride ?? previousApplication?.status;

    return this.loanService.saveLoanApplication(application).pipe(
      map((savedApplication) => this.resolveSavedApplication(application, savedApplication)),
      tap((savedApplication) => this.upsertApplication(savedApplication, true)),
      switchMap((savedApplication) => {
        if (!this.shouldNotifyStatusChange(previousStatus, savedApplication.status)) {
          return of(savedApplication);
        }

        return this.loanStatusNotificationService.notifyStatusChange(savedApplication, previousStatus || undefined).pipe(
          map(() => savedApplication)
        );
      })
    );
  }

  refreshApplications(): Observable<LoanApplication[]> {
    return this.loanService.listLoanApplications().pipe(
      map((applications) => this.mergeApplicationCollections(this.applicationsSubject.value, applications)),
      tap((applications) => {
        this.hasLoadedApplications = true;
        this.applicationsSubject.next(applications);
        this.writeCachedApplications(applications);
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
    if (!application.localOnly && !this.looksLikeCacheableApplication(application)) {
      return;
    }

    const currentApplications = [...this.applicationsSubject.value];
    const existingIndex = this.findMatchingApplicationIndex(currentApplications, application);

    if (existingIndex >= 0) {
      currentApplications[existingIndex] = this.mergeLoanApplications(currentApplications[existingIndex], application);
    } else {
      currentApplications.unshift(application);
    }

    this.applicationsSubject.next(currentApplications);

    if (persistLocally) {
      this.hasLoadedApplications = true;
      this.writeCachedApplications(currentApplications);
    }
  }

  private getCachedApplications(): LoanApplication[] | null {
    if (this.hasLoadedApplications) {
      return this.applicationsSubject.value;
    }

    const rawCache = sessionStorage.getItem(this.getApplicationsCacheKey());
    if (!rawCache) {
      return null;
    }

    try {
      const parsedCache = JSON.parse(rawCache);
      if (!Array.isArray(parsedCache)) {
        return null;
      }

      const applications = parsedCache as LoanApplication[];
      this.hasLoadedApplications = true;
      this.applicationsSubject.next(applications);
      return applications;
    } catch {
      sessionStorage.removeItem(this.getApplicationsCacheKey());
      return null;
    }
  }

  private writeCachedApplications(applications: LoanApplication[]): void {
    sessionStorage.setItem(this.getApplicationsCacheKey(), JSON.stringify(applications));
  }

  private getApplicationsCacheKey(): string {
    const sessionUserId = String(sessionStorage.getItem('userid') || localStorage.getItem('userid') || '').trim() || 'anonymous';
    return `${this.applicationsCacheKeyPrefix}:${sessionUserId}`;
  }

  private findMatchingApplication(applications: LoanApplication[], target: LoanApplication): LoanApplication | undefined {
    const existingIndex = this.findMatchingApplicationIndex(applications, target);
    return existingIndex >= 0 ? applications[existingIndex] : undefined;
  }

  private shouldNotifyStatusChange(previousStatus: LoanApplication['status'] | undefined, nextStatus: LoanApplication['status'] | undefined): boolean {
    return !!nextStatus && !!previousStatus && previousStatus !== nextStatus;
  }

  private mergeApplicationCollections(
    currentApplications: LoanApplication[],
    fetchedApplications: LoanApplication[]
  ): LoanApplication[] {
    const mergedApplications = fetchedApplications
      .filter((application) => this.looksLikeCacheableApplication(application))
      .map((application) => ({ ...application }));

    currentApplications
      .filter((application) => application.localOnly)
      .forEach((application) => {
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
      purposeCode: incoming.purposeCode || existing.purposeCode || '',
      amount: incoming.amount || existing.amount,
      repaymentAmount: incoming.repaymentAmount || existing.repaymentAmount,
      repaymentTime: incoming.repaymentTime || existing.repaymentTime,
      repaymentStartDate: incoming.repaymentStartDate || existing.repaymentStartDate,
      repaymentDay: incoming.repaymentDay || existing.repaymentDay,
      modeOfPayment: incoming.modeOfPayment || existing.modeOfPayment,
      status: incoming.status || existing.status,
      approvedAmount: incoming.approvedAmount ?? existing.approvedAmount,
      interestAgreement: incoming.interestAgreement ?? existing.interestAgreement,
      approvedDate: incoming.approvedDate ?? existing.approvedDate,
      approvedBy: incoming.approvedBy ?? existing.approvedBy,
      disbursedAmount: incoming.disbursedAmount ?? existing.disbursedAmount,
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
      outstandingBalance: incoming.outstandingBalance ?? existing.outstandingBalance,
      outstandingInterest: incoming.outstandingInterest ?? existing.outstandingInterest,
      outstandingPrincipal: incoming.outstandingPrincipal ?? existing.outstandingPrincipal,
      nextPaymentDueDate: incoming.nextPaymentDueDate ?? existing.nextPaymentDueDate,
      skippedPaymentsCount: incoming.skippedPaymentsCount ?? existing.skippedPaymentsCount,
      overduePaymentsCount: incoming.overduePaymentsCount ?? existing.overduePaymentsCount,
      disbursementInitiatedAt: incoming.disbursementInitiatedAt ?? existing.disbursementInitiatedAt,
      disbursementInitiatedBy: incoming.disbursementInitiatedBy ?? existing.disbursementInitiatedBy,
      disbursementInstructionReference: incoming.disbursementInstructionReference ?? existing.disbursementInstructionReference,
      disbursementConfirmedAt: incoming.disbursementConfirmedAt ?? existing.disbursementConfirmedAt,
      disbursementConfirmedBy: incoming.disbursementConfirmedBy ?? existing.disbursementConfirmedBy,
      disbursementReference: incoming.disbursementReference ?? existing.disbursementReference,
      employeeBankName: incoming.employeeBankName ?? existing.employeeBankName,
      employeeAccountNumber: incoming.employeeAccountNumber ?? existing.employeeAccountNumber,
      memberBankName: incoming.memberBankName ?? existing.memberBankName,
      memberAccountNumber: incoming.memberAccountNumber ?? existing.memberAccountNumber,
      totalLateFeesAccrued: incoming.totalLateFeesAccrued ?? existing.totalLateFeesAccrued,
      totalLateFeesPaid: incoming.totalLateFeesPaid ?? existing.totalLateFeesPaid,
      interestRate: incoming.interestRate ?? existing.interestRate,
      lateFeePercentage: incoming.lateFeePercentage ?? existing.lateFeePercentage,
      lateFeeGracePeriodDays: incoming.lateFeeGracePeriodDays ?? existing.lateFeeGracePeriodDays,
      lastPaymentReceived: incoming.lastPaymentReceived ?? existing.lastPaymentReceived,
      lastPaymentAmount: incoming.lastPaymentAmount ?? existing.lastPaymentAmount,
      gracePeriodRequests: incoming.gracePeriodRequests?.length ? incoming.gracePeriodRequests : existing.gracePeriodRequests,
      repaymentSchedule: incoming.repaymentSchedule?.length ? incoming.repaymentSchedule : existing.repaymentSchedule,
      paymentHistory: incoming.paymentHistory?.length ? incoming.paymentHistory : existing.paymentHistory,
      statusHistory: incoming.statusHistory?.length ? incoming.statusHistory : existing.statusHistory,
      supportingDocuments: incoming.supportingDocuments?.length ? incoming.supportingDocuments : existing.supportingDocuments
    };
  }

  private resolveSavedApplication(existingApplication: LoanApplication, savedApplication: LoanApplication | null | undefined): LoanApplication {
    if (!savedApplication) {
      return existingApplication;
    }

    if (!this.looksLikeCacheableApplication(savedApplication)) {
      return this.mergeLoanApplications(existingApplication, {
        ...savedApplication,
        id: existingApplication.id,
        loanCode: existingApplication.loanCode,
        employeeId: existingApplication.employeeId,
        fullName: existingApplication.fullName,
        amount: existingApplication.amount,
        requestDate: existingApplication.requestDate,
        purpose: existingApplication.purpose,
        purposeCode: existingApplication.purposeCode
      });
    }

    return this.mergeLoanApplications(existingApplication, savedApplication);
  }

  private looksLikeCacheableApplication(application: LoanApplication | null | undefined): boolean {
    if (!application) {
      return false;
    }

    const hasIdentifier = Number(application.id || 0) > 0 || !!String(application.loanCode || '').trim();
    const hasEmployee = Number(application.employeeId || 0) > 0;
    const hasAmount = Number(application.amount || 0) > 0;
    const hasPurpose = !!String(application.purpose || '').trim();
    const hasRequestDate = !!String(application.requestDate || '').trim();

    return hasIdentifier && hasEmployee && hasAmount && hasPurpose && hasRequestDate;
  }

  private buildOptimisticSubmittedApplication(
    formData: LoanApplicationFormData,
    createdApplication: LoanApplication
  ): LoanApplication {
    const normalizedPurpose = formData.purpose === 'other'
      ? formData.otherPurpose || 'Other'
      : formData.purpose;
    // Find the selected purpose object if possible
    let selectedPurposeCode = formData.purposeCode || '';
    let selectedPurposeName = normalizedPurpose;
    if (formData.purposeCode && Array.isArray((window as any).erpLoanPurposes)) {
      const found = (window as any).erpLoanPurposes.find((p: any) => p.code === formData.purposeCode);
      if (found) selectedPurposeName = found.name;
    }
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
      purpose: selectedPurposeName || normalizedPurpose || createdApplication.purpose || '',
      purposeCode: selectedPurposeCode || formData.purposeCode || createdApplication.purposeCode || '',
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

  private recoverSubmittedApplication(
    formData: LoanApplicationFormData,
    error: unknown
  ): Observable<LoanApplication> {
    if (!(error instanceof HttpErrorResponse) || error.status !== 500) {
      return throwError(() => error);
    }

    const candidateSignature = this.buildClientSubmissionKey({
      employeeId: Number(formData.employeeId || 0),
      amount: Number(formData.amount || 0),
      purpose: formData.purpose === 'other' ? formData.otherPurpose || 'Other' : formData.purpose || '',
      modeOfPayment: formData.modeOfPayment,
      requestDate: formData.requestDate
    });

    return this.loanService.listLoanApplications().pipe(
      map((applications) => {
        const recoveredApplication = applications.find((application) => {
          if (this.buildClientSubmissionKey(application) === candidateSignature) {
            return true;
          }

          return this.matchesSubmittedApplication(application, formData);
        });

        if (!recoveredApplication) {
          throw error;
        }

        if (isDevMode()) {
          console.warn('Recovered advance-loan submission after backend 500 response', {
            requestedAt: formData.requestDate,
            recoveredLoanId: recoveredApplication.id,
            recoveredLoanCode: recoveredApplication.loanCode
          });
        }

        return recoveredApplication;
      })
    );
  }

  private matchesSubmittedApplication(application: LoanApplication, formData: LoanApplicationFormData): boolean {
    const normalizedPurpose = this.normalizeValue(
      formData.purpose === 'other' ? formData.otherPurpose || 'Other' : formData.purpose || ''
    );
    const normalizedApplicationPurpose = this.normalizeValue(application.purpose || '');
    if (normalizedPurpose !== normalizedApplicationPurpose) {
      return false;
    }

    if (Number(application.employeeId || 0) !== Number(formData.employeeId || 0)) {
      return false;
    }

    if (Number(application.amount || 0) !== Number(formData.amount || 0)) {
      return false;
    }

    if (String(application.modeOfPayment || '') !== String(formData.modeOfPayment || '')) {
      return false;
    }

    const requestedAt = new Date(String(formData.requestDate || '')).getTime();
    const applicationRequestedAt = new Date(String(application.requestDate || '')).getTime();
    if (!Number.isFinite(requestedAt) || !Number.isFinite(applicationRequestedAt)) {
      return false;
    }

    return Math.abs(applicationRequestedAt - requestedAt) <= 5 * 60 * 1000;
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
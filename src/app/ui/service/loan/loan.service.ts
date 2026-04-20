// loan.service.ts
import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import {
  AdvanceLoan,
  AdvanceLoanPaymentHistory,
  AdvanceLoanRepaymentSchedule,
  AdvanceLoanStats,
  AdvanceLoanStatusHistory,
  AdvanceLoanUser
} from '../../domain/loan/advance-loan.dto';
import {
  LoanApplication,
  LoanApplicationFormData,
  PaymentRecord,
  RepaymentScheduleItem,
  StatusChange
} from './loan.types';
import {
  normalizeLoanRepaymentStartDate,
  persistLoanRepaymentDay,
  persistLoanRequestedAmount,
  persistLoanRepaymentStartDate,
  persistLoanStatusChangedAt,
  persistLoanStatusActorName,
  readPersistedLoanRequestedAmount,
  readPersistedLoanInterestRate,
  readPersistedLoanLateFeePercentage,
  readPersistedLoanLateFeeGracePeriodDays,
  readPersistedLoanStatusChangedAt,
  readPersistedLoanStatusNote,
  readPersistedLoanStatusActorName,
  resolveCompletedLoanActor,
  resolveLoanActorName,
  resolveLoanEmployeeName,
  resolveLoanTotalRepayableAmount,
  resolvePaymentActorName
} from './loan-display.util';
import { SUPPRESS_ERROR_TOAST } from '../../shared-component/service/error-message/error-toast.interceptor';

@Injectable({
  providedIn: 'root'
})
export class LoanService {

  // In-memory cache for advance loans
  private advanceLoansCache: AdvanceLoan[] | null = null;
  private advanceLoansCacheTimestamp: number = 0;
  private readonly cacheTTL = 2 * 60 * 1000; // 2 minutes

  /**
   * Clears the in-memory cache for advance loans.
   */
  clearAdvanceLoansCache(): void {
    this.advanceLoansCache = null;
    this.advanceLoansCacheTimestamp = 0;
  }

  private readonly standardLoanUrl = 'https://be.optimaxsuites.com/x/api/v2/hr/advanceLoans';
  private readonly repaymentStartDateSignatureCacheKey = 'advance-loan-repayment-start-date-signature-cache';

  constructor(private http: HttpClient) {}

  /**
   * Loads all advance loans, using in-memory cache if available and fresh.
   * Pass forceRefresh=true to bypass cache.
   */
  getAllAdvanceLoans(forceRefresh = false): Observable<AdvanceLoan[]> {
    const now = Date.now();
    if (!forceRefresh && this.advanceLoansCache && (now - this.advanceLoansCacheTimestamp < this.cacheTTL)) {
      return of(this.advanceLoansCache);
    }

    const tenantId = 'optimax';
    const token = sessionStorage.getItem('token');
    const fetchPage = (page: number): Observable<AdvanceLoan[]> => {
      return this.http.get<any>(`${this.standardLoanUrl}?page=${page}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenantId
        },
        context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
        responseType: 'json'
      }).pipe(
        map(response => this.safeParseResponse(response)),
        switchMap(data => {
          if (Array.isArray(data)) {
            if (data.length === 10) {
              return fetchPage(page + 1).pipe(
                map(nextPageLoans => [...data, ...nextPageLoans])
              );
            }
            return of(data);
          }
          return of([]);
        })
      );
    };

    return fetchPage(1).pipe(
      tap(loans => {
        this.advanceLoansCache = loans;
        this.advanceLoansCacheTimestamp = Date.now();
        console.log(`[CACHE] Advance loans loaded and cached: ${loans.length}`);
      }),
      catchError((error) => {
        console.error('Failed to load loans from API:', error.status);
        return of([]);
      })
    );
  }

  getAdvanceLoanById(id: number): Observable<AdvanceLoan> {
    return this.http.get<AdvanceLoan>(`${this.standardLoanUrl}/${id}`, {
      context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
      responseType: 'json'
    }).pipe(
      map(response => this.safeParseResponse(response)),
      catchError(this.handleError)
    );
  }

  createAdvanceLoan(payload: any): Observable<AdvanceLoan> {
    let requestBody = Array.isArray(payload) ? payload[0] : payload;
    
    const formattedPayload = {
      employeeId: Number(requestBody.employeeId),
      monthlySalary: Number(requestBody.monthlySalary || 0),
      amount: Number(requestBody.amount),
      purpose: String(requestBody.purpose || '').trim(),
      purposeCode: String(requestBody.purposeCode || '').trim() || null,
      repaymentAmount: Number(requestBody.repaymentAmount),
      repaymentTime: Number(requestBody.repaymentTime),
      repaymentPeriodMonths: Number(requestBody.repaymentPeriodMonths || requestBody.repaymentTime || 0),
      repaymentStartDate: this.toBackendDateTime(normalizeLoanRepaymentStartDate(requestBody.repaymentStartDate)),
      repaymentDay: Number(requestBody.repaymentDay || 0) || null,
      modeOfPayment: requestBody.modeOfPayment || 'MONTHLY',
      requestDate: requestBody.requestDate || new Date().toISOString(),
      status: 'PENDING'
    };
    
    console.log('Sending payload:', formattedPayload);
    
    return this.http.post<AdvanceLoan>(this.standardLoanUrl, formattedPayload, {
      headers: { 
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(response => this.safeParseResponse(response)),
      tap((response: AdvanceLoan) => {
        console.log('Loan created:', response.id, 'Status:', response.status);
      }),
      catchError((error) => {
        if (error.status === 0 || error.message?.includes('Connection refused')) {
          console.warn('Connection issue, but loan may have been created');
          return throwError(() => error);
        }

        if (error instanceof HttpErrorResponse && error.status === 500) {
          return throwError(() => error);
        }

        return this.handleError(error);
      })
    );
  }

  updateAdvanceLoan(id: number, payload: any): Observable<AdvanceLoan> {
    const requestBody = Array.isArray(payload) ? payload[0] : payload;
    
    // ✅ FIX: Ensure all status values are uppercase before sending to backend
    if (requestBody.statusHistory && Array.isArray(requestBody.statusHistory)) {
      requestBody.statusHistory = requestBody.statusHistory.map((entry: any) => {
        const allowedStatuses = [
          'PENDING', 'AWAITING_INTEREST_ACCEPTANCE', 'APPROVED', 
          'READY_FOR_DISBURSEMENT', 'REJECTED', 'ACTIVE', 'SKIPPED', 
          'OVERDUE', 'DEFAULTED', 'COMPLETED', 'PAUSED'
        ];
        
        let status = entry.status ? String(entry.status).toUpperCase() : entry.status;
        if (!allowedStatuses.includes(status)) {
          console.warn(`Invalid status value detected: ${entry.status}, defaulting to PENDING`);
          status = 'PENDING';
        }
        
        let statusBeforeOverride = entry.statusBeforeOverride 
          ? String(entry.statusBeforeOverride).toUpperCase() 
          : entry.statusBeforeOverride;
        if (statusBeforeOverride && !allowedStatuses.includes(statusBeforeOverride)) {
          statusBeforeOverride = 'PENDING';
        }
        
        return {
          ...entry,
          status,
          statusBeforeOverride
        };
      });
    }
    
    // ✅ Also ensure root status is uppercase
    if (requestBody.status) {
      requestBody.status = String(requestBody.status).toUpperCase();
    }
    
    if (isDevMode()) {
      console.log('Update request payload:', requestBody);
    }
    
    return this.http.put<AdvanceLoan>(`${this.standardLoanUrl}/${id}`, requestBody, {
      responseType: 'json'
    }).pipe(
      map(response => this.safeParseResponse(response)),
      catchError((error) => {
        console.error('Backend error response:', error?.error);
        return this.handleError(error);
      })
    );
  }

  getAdvanceLoanStats(): Observable<AdvanceLoanStats> {
    return this.http.get<AdvanceLoanStats>(`${this.standardLoanUrl}/stats`, {
      responseType: 'json'
    }).pipe(
      map(response => this.safeParseResponse(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Returns all loan applications, using cache unless forceRefresh is true.
   */
  listLoanApplications(forceRefresh = false): Observable<LoanApplication[]> {
    return this.getAllAdvanceLoans(forceRefresh).pipe(
      map((loans) => {
        return loans.map((loan) => this.toLoanApplication(loan));
      }),
      catchError((error) => {
        console.error('Error listing loan applications:', error);
        return of([]);
      })
    );
  }

  getLoanApplicationByIdentifier(identifier: string): Observable<LoanApplication | undefined> {
    return this.getAdvanceLoanByIdentifier(identifier).pipe(
      map((loan) => loan ? this.toLoanApplication(loan) : undefined)
    );
  }

  createLoanApplication(formData: LoanApplicationFormData): Observable<LoanApplication> {
    const payload = {
      employeeId: Number(formData.employeeId || 0),
      monthlySalary: Number(formData.monthlySalary || 0),
      amount: Number(formData.amount),
      purpose: String(formData.purpose === 'other' ? formData.otherPurpose || 'Other' : formData.purpose || '').trim(),
      purposeCode: String(formData.purposeCode || '').trim() || null,
      repaymentAmount: Number(formData.repaymentAmount),
      repaymentTime: Number(formData.repaymentTime),
      repaymentPeriodMonths: Number(formData.repaymentTime),
      repaymentStartDate: this.toBackendDateTime(normalizeLoanRepaymentStartDate(formData.repaymentStartDate)),
      repaymentDay: Number(formData.repaymentDay || 0) || null,
      modeOfPayment: formData.modeOfPayment,
      requestDate: formData.requestDate || new Date().toISOString(),
      status: 'PENDING'
    };
    
    console.log('Creating loan with payload:', payload);
    
    return this.createAdvanceLoan(payload).pipe(
      map((loan) => {
        const application = this.toLoanApplication(loan);
        const originalRequestDate = this.normalizeDateValue(loan.requestDate, formData.requestDate || new Date().toISOString());
        persistLoanRepaymentStartDate({
          id: Number(application.id || loan.id || 0),
          loanCode: String(application.loanCode || loan.loanCode || loan.id || '')
        }, formData.repaymentStartDate || application.repaymentStartDate);
        persistLoanRequestedAmount({
          id: Number(application.id || loan.id || 0),
          loanCode: String(application.loanCode || loan.loanCode || loan.id || '')
        }, formData.amount);
        persistLoanRepaymentDay({
          id: Number(application.id || loan.id || 0),
          loanCode: String(application.loanCode || loan.loanCode || loan.id || '')
        }, formData.repaymentDay || application.repaymentDay);
        this.persistRepaymentStartDateBySignature({
          employeeId: Number(application.employeeId || formData.employeeId || 0),
          amount: Number(application.amount || formData.amount || 0),
          purpose: application.purpose || formData.purpose,
          modeOfPayment: application.modeOfPayment || formData.modeOfPayment,
          requestDate: originalRequestDate,
          repaymentStartDate: formData.repaymentStartDate || application.repaymentStartDate
        });
        return {
          ...application,
          requestDate: originalRequestDate,
          fullName: application.fullName || formData.employeeName || 'Employee',
          department: application.department || formData.department || ''
        };
      })
    );
  }

  saveLoanApplication(application: LoanApplication): Observable<LoanApplication> {
    const identifier = String(application.id || application.loanCode);

    return this.getAdvanceLoanByIdentifier(identifier).pipe(
      switchMap((sourceLoan) => {
        if (!sourceLoan) {
          return throwError(() => new Error('Loan not found on backend'));
        }

        const payload = this.toUpdatePayload(application, sourceLoan);
        
        if (isDevMode()) {
          console.log('Advance loan update payload:', JSON.stringify(payload, null, 2));
        }

        return this.updateAdvanceLoan(
          Number(sourceLoan.id),
          payload
        );
      }),
      map((loan) => this.toLoanApplication(loan))
    );
  }

  private safeParseResponse(response: any): any {
    if (!response) {
      return response;
    }
    if (typeof response === 'object') {
      return response;
    }
    if (typeof response === 'string') {
      let cleanResponse = response.trim();
      if (cleanResponse.charCodeAt(0) === 0xFEFF) {
        cleanResponse = cleanResponse.substring(1);
      }
      try {
        const parsed = JSON.parse(cleanResponse);
        if (parsed === null || parsed === undefined) {
          console.warn('Parsed response is null or undefined');
        }
        return parsed;
      } catch (e) {
        const error = e as Error;
        console.error('JSON Parse Error:', error);
        console.error('Raw response (first 500 chars):', cleanResponse.substring(0, 500));
        throw new Error(`Invalid JSON response from server: ${error.message}`);
      }
    }
    return response;
  }

  private getAdvanceLoanByIdentifier(identifier: string): Observable<AdvanceLoan | undefined> {
    const numericId = this.parseNumericId(identifier);

    if (numericId !== null) {
      return this.getAdvanceLoanById(numericId).pipe(
        map((loan) => loan),
        catchError(() =>
          this.getAllAdvanceLoans().pipe(
            map((loans) => this.findAdvanceLoanByIdentifier(loans, identifier))
          )
        )
      );
    }

    return this.getAllAdvanceLoans().pipe(
      map((loans) => this.findAdvanceLoanByIdentifier(loans, identifier))
    );
  }

  private findAdvanceLoanByIdentifier(loans: AdvanceLoan[], identifier: string): AdvanceLoan | undefined {
    const normalizedIdentifier = String(identifier || '').trim();
    return loans.find((loan) =>
      String(loan.id) === normalizedIdentifier ||
      String(loan.loanCode || '').trim() === normalizedIdentifier
    );
  }

  private toLoanApplication(loan: AdvanceLoan): LoanApplication {
    this.backfillPersistedStatusActors(loan);

    const mappedRepaymentSchedule = (loan.repaymentSchedule || []).map((item, index) =>
      this.toRepaymentScheduleItem(item, index)
    );
    const paymentHistory = (loan.paymentHistory || []).map((item, index) =>
      this.toPaymentRecord(item, index)
    );
    const statusHistory = this.buildStatusHistory(
      loan,
      (loan.statusHistory || []).map((item) => this.toStatusChange(item, loan))
    );
    const employee = loan.employee;
    const requestDate = this.resolveLoanRequestDate(loan);
    const interestRate = this.deriveInterestRate(loan, statusHistory);
    const lateFeePercentage = this.deriveLateFeePercentage(loan);
    const lateFeeGracePeriodDays = this.deriveLateFeeGracePeriodDays(loan);
    const repaymentSchedule = mappedRepaymentSchedule.length > 0
      ? mappedRepaymentSchedule
      : this.buildFallbackRepaymentSchedule(loan, interestRate, requestDate);
    const normalizedStatus = this.toLoanStatus(loan.status);
    const resolvedTotalPaid = this.resolveTotalPaid(loan, paymentHistory, repaymentSchedule);
    const resolvedCurrentBalance = this.resolveCurrentBalance(loan, repaymentSchedule, resolvedTotalPaid, normalizedStatus);
    const resolvedOutstandingPrincipal = this.resolveOutstandingPrincipal(loan, repaymentSchedule, resolvedTotalPaid, normalizedStatus);
    const resolvedEmployeeId = Number(employee?.id || 0);
    const resolvedFullName = this.getEmployeeFullName(employee) || 'Employee';
    const resolvedDepartment = employee?.department?.name ?? '';
    const persistedRequestedAmount = readPersistedLoanRequestedAmount({
      id: Number(loan.id || 0),
      loanCode: String(loan.loanCode || loan.id || '')
    });
    const normalizedRepaymentStartDate = normalizeLoanRepaymentStartDate(loan.repaymentStartDate);
    const resolvedRepaymentDay = Number(loan.repaymentDay || 0);

    return {
      id: Number(loan.id || 0),
      loanCode: String(loan.loanCode || loan.id),
      approvedAmount: Number(loan.approvedAmount || 0) || undefined,
      approvedDate: this.normalizeDateValue(loan.approvedDate) || undefined,
      approvedBy: loan.approvedBy,
      disbursedAmount: Number(loan.disbursedAmount || 0) || undefined,
      disbursedDate: this.normalizeDateValue(loan.disbursedDate) || undefined,
      disbursedBy: loan.disbursedBy,
      requestDate,
      completedDate: this.normalizeDateValue(loan.completedDate) || undefined,
      rejectedDate: this.normalizeDateValue(loan.rejectedDate) || undefined,
      rejectedBy: loan.rejectedBy,
      adminComment: loan.adminComment || '',
      employeeId: resolvedEmployeeId,
      fullName: resolvedFullName,
      department: resolvedDepartment,
      amount: this.resolveDisplayAmount(loan, normalizedStatus, persistedRequestedAmount),
      modeOfPayment: this.fromBackendPaymentMode(loan.modeOfPayment),
      status: normalizedStatus,
      purpose: loan.purpose || '',
      repaymentTime: Number(loan.repaymentTime || repaymentSchedule.length || 0),
      repaymentAmount: Number(loan.repaymentAmount || repaymentSchedule[0]?.totalAmount || 0),
      repaymentStartDate: normalizedRepaymentStartDate || undefined,
      repaymentDay: Number.isFinite(resolvedRepaymentDay) && resolvedRepaymentDay > 0 ? resolvedRepaymentDay : undefined,
      acknowledgment: true,
      interestRate,
      interestAgreement: loan.interestAgreement ? {
        id: Number(loan.interestAgreement.id || 0) || undefined,
        loanId: Number(loan.interestAgreement.loanId || loan.id || 0),
        employeeId: Number(loan.interestAgreement.employeeId || resolvedEmployeeId || 0),
        proposedInterestRate: Number(loan.interestAgreement.proposedInterestRate || 0),
        agreedInterestRate: Number(loan.interestAgreement.agreedInterestRate || 0),
        status: loan.interestAgreement.status,
        agreedAt: this.normalizeDateValue(loan.interestAgreement.agreedAt) || undefined,
        agreementMethod: loan.interestAgreement.agreementMethod,
        ipAddress: loan.interestAgreement.ipAddress,
        notes: loan.interestAgreement.notes
      } : undefined,
      lateFeePercentage,
      lateFeeGracePeriodDays,
      currentBalance: resolvedCurrentBalance,
      totalPaid: resolvedTotalPaid,
      totalPrincipalPaid: Number(loan.totalPrincipalPaid || 0),
      totalInterestPaid: Number(loan.totalInterestPaid || 0),
      outstandingBalance: Number(loan.outstandingBalance || resolvedCurrentBalance || 0) || undefined,
      outstandingInterest: Number(loan.outstandingInterest || 0) || undefined,
      outstandingPrincipal: resolvedOutstandingPrincipal,
      nextPaymentDueDate: this.normalizeDateValue(loan.nextPaymentDueDate) || undefined,
      skippedPaymentsCount: Number(loan.skippedPaymentsCount || 0) || undefined,
      overduePaymentsCount: Number(loan.overduePaymentsCount || 0) || undefined,
      disbursementInitiatedAt: this.normalizeDateValue(loan.disbursementInitiatedAt) || undefined,
      disbursementInitiatedBy: loan.disbursementInitiatedBy,
      disbursementInstructionReference: String(loan.disbursementInstructionReference || '').trim() || undefined,
      disbursementConfirmedAt: this.normalizeDateValue(loan.disbursementConfirmedAt) || undefined,
      disbursementConfirmedBy: loan.disbursementConfirmedBy,
      disbursementReference: String(loan.disbursementReference || '').trim() || undefined,
      employeeBankName: String(loan.employeeBankName || '').trim() || undefined,
      employeeAccountNumber: String(loan.employeeAccountNumber || '').trim() || undefined,
      memberBankName: String(loan.employeeBankName || '').trim() || undefined,
      memberAccountNumber: String(loan.employeeAccountNumber || '').trim() || undefined,
      totalLateFeesAccrued: Number(loan.totalLateFeesAccrued || 0) || undefined,
      totalLateFeesPaid: Number(loan.totalLateFeesPaid || 0) || undefined,
      lastPaymentReceived: this.normalizeDateValue(loan.lastPaymentReceived) || undefined,
      lastPaymentAmount: Number(loan.lastPaymentAmount || 0) || undefined,
      gracePeriodRequests: (loan.gracePeriodRequests || []).map((request) => ({
        id: Number(request.id || 0) || undefined,
        loanId: Number(request.loanId || loan.id || 0),
        employeeId: Number(request.employeeId || resolvedEmployeeId || 0),
        installmentNumber: Number(request.installmentNumber || 0),
        paymentSubtype: String(request.paymentSubtype || ''),
        amountPaid: Number(request.amountPaid || 0),
        remainingBalance: Number(request.remainingBalance || 0),
        requestedAt: this.normalizeDateValue(request.requestedAt, new Date().toISOString()),
        requestedDays: Number(request.requestedDays || 0),
        reason: String(request.reason || ''),
        status: String(request.status || 'PENDING'),
        reviewedAt: this.normalizeDateValue(request.reviewedAt) || undefined,
        reviewedBy: request.reviewedBy,
        reviewNote: request.reviewNote || undefined,
        rejectionReason: request.rejectionReason || undefined,
        approvedGraceDays: Number(request.approvedGraceDays || 0) || undefined,
        newDueDate: this.normalizeDateValue(request.newDueDate) || undefined,
        paymentCompletedAt: this.normalizeDateValue(request.paymentCompletedAt) || undefined
      })),
      statusHistory,
      repaymentSchedule,
      paymentHistory,
      supportingDocuments: []
    };
  }

  private backfillPersistedStatusActors(loan: AdvanceLoan): void {
    const cacheableLoan = {
      id: Number(loan.id || 0),
      loanCode: String(loan.loanCode || loan.id || '')
    };

    (loan.statusHistory || []).forEach((item) => {
      const status = this.toLoanStatus(item.status);
      persistLoanStatusChangedAt(cacheableLoan, status, item.changedAt);
      if (status !== 'PENDING' && status !== 'COMPLETED') {
        persistLoanStatusActorName(cacheableLoan, status, item.changedBy);
      }
    });

    persistLoanStatusActorName(cacheableLoan, 'APPROVED', loan.approvedBy);
    persistLoanStatusActorName(cacheableLoan, 'ACTIVE', loan.disbursedBy);
    persistLoanStatusActorName(cacheableLoan, 'REJECTED', loan.rejectedBy);
    persistLoanStatusChangedAt(cacheableLoan, 'APPROVED', loan.approvedDate);
    persistLoanStatusChangedAt(cacheableLoan, 'ACTIVE', loan.disbursedDate);
    persistLoanStatusChangedAt(cacheableLoan, 'COMPLETED', loan.completedDate);
    persistLoanStatusChangedAt(cacheableLoan, 'REJECTED', loan.rejectedDate);
  }

  private resolveTotalPaid(
    loan: AdvanceLoan,
    paymentHistory: PaymentRecord[],
    repaymentSchedule: RepaymentScheduleItem[]
  ): number {
    const backendTotalPaid = Number(loan.totalPaid || 0);
    if (backendTotalPaid > 0) {
      return backendTotalPaid;
    }
    const historyTotalPaid = paymentHistory.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
    if (historyTotalPaid > 0) {
      return Number(historyTotalPaid.toFixed(2));
    }
    const schedulePaidTotal = repaymentSchedule.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
    return Number(schedulePaidTotal.toFixed(2));
  }

  private resolveCurrentBalance(
    loan: AdvanceLoan,
    repaymentSchedule: RepaymentScheduleItem[],
    totalPaid: number,
    status: LoanApplication['status']
  ): number {
    const backendCurrentBalance = Number(loan.currentBalance || 0);
    if (status === 'COMPLETED') {
      return 0;
    }
    if (backendCurrentBalance > 0) {
      return backendCurrentBalance;
    }
    const scheduledOutstanding = this.calculateScheduledOutstanding(repaymentSchedule, totalPaid);
    if (scheduledOutstanding > 0) {
      return scheduledOutstanding;
    }
    const backendOutstandingPrincipal = Number(loan.outstandingPrincipal || 0);
    if (backendOutstandingPrincipal > 0) {
      return backendOutstandingPrincipal;
    }
    if (status === 'ACTIVE' || status === 'APPROVED') {
      return Math.max(Number(loan.amount || 0) - totalPaid, 0);
    }
    return 0;
  }

  private resolveOutstandingPrincipal(
    loan: AdvanceLoan,
    repaymentSchedule: RepaymentScheduleItem[],
    totalPaid: number,
    status: LoanApplication['status']
  ): number {
    const backendOutstandingPrincipal = Number(loan.outstandingPrincipal || 0);
    if (status === 'COMPLETED') {
      return 0;
    }
    if (backendOutstandingPrincipal > 0) {
      return backendOutstandingPrincipal;
    }
    const scheduledPrincipalOutstanding = repaymentSchedule.reduce((sum, item) => {
      return sum + Math.max(Number(item.principalAmount || 0) - Number(item.paidAmount || 0), 0);
    }, 0);
    if (scheduledPrincipalOutstanding > 0) {
      return Number(scheduledPrincipalOutstanding.toFixed(2));
    }
    if (status === 'ACTIVE' || status === 'APPROVED') {
      return Math.max(Number(loan.amount || 0) - totalPaid, 0);
    }
    return 0;
  }

  private calculateScheduledOutstanding(repaymentSchedule: RepaymentScheduleItem[], totalPaid: number): number {
    const totalScheduledAmount = repaymentSchedule.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
    if (totalScheduledAmount <= 0) {
      return 0;
    }
    return Number(Math.max(totalScheduledAmount - totalPaid, 0).toFixed(2));
  }

  private toRepaymentScheduleItem(item: AdvanceLoanRepaymentSchedule, index: number): RepaymentScheduleItem {
    return {
      id: Number(item.id || index + 1),
      installmentNo: Number(item.installmentNo || index + 1),
      dueDate: item.dueDate,
      principalAmount: Number(item.principalAmount || 0),
      interestAmount: Number(item.interestAmount || 0),
      totalAmount: Number(item.totalAmount || 0),
      paidAmount: Number(item.paidAmount || 0),
      remainingBalance: Number(item.remainingBalance || 0),
      status: this.toRepaymentStatus(item.status)
    };
  }

  private toPaymentRecord(item: AdvanceLoanPaymentHistory, index: number): PaymentRecord {
    const principalAmount = Number(item.principalAmount || item.principalApplied || 0);
    const interestPaid = Number(item.interestPaid || item.interestApplied || 0);
    const lateFeeAmount = Number(item.lateFeeAmount || item.lateFeeApplied || 0);
    const fallbackTotalAmount = Number(item.amount || principalAmount + interestPaid + lateFeeAmount || 0);

    return {
      id: Number(item.id || index + 1),
      loanId: Number(item.loanId || 0),
      paidAt: this.normalizeDateValue(item.paidAt, new Date().toISOString()),
      principalAmount,
      interestPaid,
      lateFeeAmount,
      totalAmount: Number(item.totalAmount || fallbackTotalAmount || 0),
      remainingBalance: Number(item.remainingBalance || 0),
      paymentMethod: item.paymentMethod || item.modeofPayment || 'BANK_TRANSFER',
      referenceNumber: item.referenceNumber || item.paymentReference || '',
      installmentNo: Number(item.installmentNo || item.installmentNumber || 0),
      notes: item.notes || '',
      receiptNumber: item.receiptNumber || '',
      receivedBy: resolvePaymentActorName(item as unknown as Pick<PaymentRecord, 'receivedBy'>)
    };
  }

  private toStatusChange(item: AdvanceLoanStatusHistory, loan: AdvanceLoan): StatusChange {
    const status = this.toLoanStatus(item.status);
    return {
      id: Number(item.id || 0),
      status,
      changedAt: item.changedAt,
      changedBy: resolveLoanActorName(item.changedBy, {
        fallbackName: this.getPersistedStatusActorName(loan, status)
      }),
      notes: item.notes || this.getPersistedStatusNote(loan, status) || '',
      overrideOpen: item.overrideOpen,
      overrideBy: item.overrideBy ? this.getUserDisplayName(item.overrideBy) : undefined,
      overrideReason: item.overrideReason || undefined,
      statusBeforeOverride: this.toLoanStatus(item.statusBeforeOverride || item.status),
      interestRate: Number((item as any).interestRate || 0)
    };
  }

  private buildStatusHistory(loan: AdvanceLoan, mappedHistory: StatusChange[]): StatusChange[] {
    const combinedHistory = [...mappedHistory];
    this.buildDerivedStatusHistory(loan).forEach((derivedEntry) => {
      const alreadyTracked = combinedHistory.some((existingEntry) =>
        existingEntry.status === derivedEntry.status &&
        this.normalizeDateValue(existingEntry.changedAt) === derivedEntry.changedAt
      );
      if (!alreadyTracked) {
        combinedHistory.push(derivedEntry);
      }
    });
    return combinedHistory
      .filter((entry) => !!this.normalizeDateValue(entry.changedAt))
      .sort((first, second) => new Date(first.changedAt).getTime() - new Date(second.changedAt).getTime());
  }

  private buildDerivedStatusHistory(loan: AdvanceLoan): StatusChange[] {
    const entries: StatusChange[] = [];
    const currentStatus = this.toLoanStatus(loan.status);
    const adminComment = String(loan.adminComment || '').trim();
    const normalizedRequestDate = this.resolveLoanRequestDate(loan);
    const normalizedApprovedDate = this.normalizeDateValue(loan.approvedDate);
    const normalizedDisbursedDate = this.normalizeDateValue(loan.disbursedDate);
    const normalizedCompletedDate = this.normalizeDateValue(loan.completedDate);
    const normalizedRejectedDate = this.normalizeDateValue(loan.rejectedDate);
    const mappedPaymentHistory = (loan.paymentHistory || []).map((item, index) => this.toPaymentRecord(item, index));

    if (normalizedRequestDate) {
      entries.push({
        status: 'PENDING',
        changedAt: normalizedRequestDate,
        changedBy: resolveLoanEmployeeName({
          fullName: this.getEmployeeFullName(loan.employee),
          employeeId: Number(loan.employee?.id || 0)
        }),
        notes: 'Loan application submitted'
      });
    }

    const shouldInferApproved = !normalizedApprovedDate && (currentStatus === 'ACTIVE' || currentStatus === 'COMPLETED' || !!normalizedDisbursedDate || !!normalizedCompletedDate);
    if (shouldInferApproved) {
      entries.push({
        status: 'APPROVED',
        changedAt: normalizedDisbursedDate || normalizedCompletedDate || normalizedRequestDate || new Date().toISOString(),
        changedBy: this.getStatusActorDisplayName(loan, 'APPROVED', loan.approvedBy || loan.disbursedBy),
        notes: this.getPersistedStatusNote(loan, 'APPROVED') || 'Loan approved'
      });
    }

    if (normalizedApprovedDate) {
      const explicitApprovedDate = this.getPersistedStatusChangedAt(loan, 'APPROVED');
      if (explicitApprovedDate || currentStatus !== 'AWAITING_INTEREST_ACCEPTANCE') {
        entries.push({
          status: 'APPROVED',
          changedAt: explicitApprovedDate || normalizedApprovedDate,
          changedBy: this.getStatusActorDisplayName(loan, 'APPROVED', loan.approvedBy),
          notes: this.getPersistedStatusNote(loan, 'APPROVED') || (currentStatus === 'APPROVED' && adminComment ? adminComment : 'Loan approved')
        });
      }
    }

    const persistedAwaitingInterestAcceptanceDate = this.getPersistedStatusChangedAt(loan, 'AWAITING_INTEREST_ACCEPTANCE');
    if (persistedAwaitingInterestAcceptanceDate) {
      entries.push({
        status: 'AWAITING_INTEREST_ACCEPTANCE',
        changedAt: persistedAwaitingInterestAcceptanceDate,
        changedBy: this.getStatusActorDisplayName(loan, 'AWAITING_INTEREST_ACCEPTANCE', loan.approvedBy),
        notes: this.getPersistedStatusNote(loan, 'AWAITING_INTEREST_ACCEPTANCE') || 'Interest proposal sent to employee'
      });
    }

    const persistedReadyForDisbursementDate = this.getPersistedStatusChangedAt(loan, 'READY_FOR_DISBURSEMENT');
    if (persistedReadyForDisbursementDate) {
      entries.push({
        status: 'READY_FOR_DISBURSEMENT',
        changedAt: persistedReadyForDisbursementDate,
        changedBy: this.getStatusActorDisplayName(loan, 'READY_FOR_DISBURSEMENT', loan.approvedBy),
        notes: this.getPersistedStatusNote(loan, 'READY_FOR_DISBURSEMENT') || 'Loan is ready for disbursement'
      });
    }

    if (normalizedDisbursedDate) {
      entries.push({
        status: 'ACTIVE',
        changedAt: this.getPersistedStatusChangedAt(loan, 'ACTIVE') || normalizedDisbursedDate,
        changedBy: this.getStatusActorDisplayName(loan, 'ACTIVE', loan.disbursedBy),
        notes: 'Loan disbursed'
      });
    }

    if (normalizedCompletedDate) {
      entries.push({
        status: 'COMPLETED',
        changedAt: this.getPersistedStatusChangedAt(loan, 'COMPLETED') || normalizedCompletedDate,
        changedBy: resolveCompletedLoanActor({
          paymentHistory: mappedPaymentHistory,
          fullName: this.getEmployeeFullName(loan.employee),
          employeeId: Number(loan.employee?.id || 0)
        }),
        notes: 'Loan completed'
      });
    }

    if (normalizedRejectedDate) {
      entries.push({
        status: 'REJECTED',
        changedAt: this.getPersistedStatusChangedAt(loan, 'REJECTED') || normalizedRejectedDate,
        changedBy: this.getStatusActorDisplayName(loan, 'REJECTED', loan.rejectedBy),
        notes: this.getPersistedStatusNote(loan, 'REJECTED') || (currentStatus === 'REJECTED' && adminComment ? adminComment : 'Loan rejected')
      });
    }

    return entries;
  }

  private toUpdatePayload(application: LoanApplication, sourceLoan: AdvanceLoan): any {
    const actingUserId = this.getCurrentUserId();
    const normalizedRepaymentStartDate = normalizeLoanRepaymentStartDate(
      application.repaymentStartDate || sourceLoan.repaymentStartDate || ''
    );
    const normalizedRepaymentDay = Number(application.repaymentDay || sourceLoan.repaymentDay || 0);

    if (normalizedRepaymentStartDate) {
      persistLoanRepaymentStartDate({
        id: Number(sourceLoan.id || application.id || 0),
        loanCode: String(sourceLoan.loanCode || application.loanCode || sourceLoan.id || '')
      }, normalizedRepaymentStartDate);
      this.persistRepaymentStartDateBySignature({
        employeeId: Number(sourceLoan.employee?.id || application.employeeId || 0),
        amount: Number(application.amount || sourceLoan.amount || 0),
        purpose: application.purpose || sourceLoan.purpose || '',
        modeOfPayment: application.modeOfPayment || this.fromBackendPaymentMode(sourceLoan.modeOfPayment),
        requestDate: this.resolveOriginalRequestDate(application, sourceLoan),
        repaymentStartDate: normalizedRepaymentStartDate
      });
    }

    if (Number.isFinite(normalizedRepaymentDay) && normalizedRepaymentDay > 0) {
      persistLoanRepaymentDay({
        id: Number(sourceLoan.id || application.id || 0),
        loanCode: String(sourceLoan.loanCode || application.loanCode || sourceLoan.id || '')
      }, normalizedRepaymentDay);
    }

    const statusBeforeOverride = this.normalizeStatusBeforeOverride(
      application.status,
      this.resolveStatusBeforeOverride(application.status, sourceLoan.statusBeforeOverride, sourceLoan.status),
      sourceLoan.status
    );

    const resolvedGracePeriodRequests = application.gracePeriodRequests?.length
      ? application.gracePeriodRequests.map((request) => ({
          id: this.parseNumericId(request.id),
          loanId: Number(request.loanId || sourceLoan.id || application.id || 0),
          employeeId: Number(request.employeeId || sourceLoan.employee?.id || application.employeeId || 0),
          installmentNumber: Number(request.installmentNumber || 0),
          paymentSubtype: String(request.paymentSubtype || 'PRINCIPAL_REPAYMENT'),
          amountPaid: Number(request.amountPaid || 0),
          remainingBalance: Number(request.remainingBalance || 0),
          requestedAt: this.toBackendDateTime(request.requestedAt || ''),
          requestedDays: Number(request.requestedDays || 0),
          reason: String(request.reason || ''),
          status: String(request.status || 'PENDING'),
          reviewedAt: this.toBackendDateTime(request.reviewedAt || ''),
          reviewedBy: this.extractUserId(request.reviewedBy) || undefined,
          reviewNote: request.reviewNote || '',
          rejectionReason: request.rejectionReason || '',
          approvedGraceDays: Number(request.approvedGraceDays || 0),
          newDueDate: this.toBackendDateTime(request.newDueDate || ''),
          paymentCompletedAt: this.toBackendDateTime(request.paymentCompletedAt || '')
        }))
      : (sourceLoan.gracePeriodRequests || []);

    const resolvedRepaymentSchedule = application.repaymentSchedule?.length
      ? application.repaymentSchedule.map((item) => ({
          id: this.parseNumericId(item.id),
          installmentNo: item.installmentNo,
          dueDate: this.toBackendDateTime(item.dueDate),
          principalAmount: item.principalAmount,
          interestAmount: item.interestAmount,
          totalAmount: item.totalAmount,
          paidAmount: Number(item.paidAmount || 0),
          remainingBalance: item.remainingBalance,
          status: item.status,
          paymentMethod: item.paymentMethod,
          receiptNumber: item.receiptNumber,
          reminderSentAt: this.toBackendDateTime(item.reminderSentAt || ''),
          lateFeeAmount: item.lateFeeAmount,
          creditReportedAt: this.toBackendDateTime(item.creditReportedAt || '')
        }))
      : (sourceLoan.repaymentSchedule || []);

    const resolvedPaymentHistory = application.paymentHistory?.length
      ? application.paymentHistory.map((item) => ({
          id: this.parseNumericId(item.id),
          loanId: Number(sourceLoan.id),
          paidAt: this.toBackendDateTime(item.paidAt),
          principalAmount: Number(item.principalAmount || 0),
          interestPaid: Number(item.interestPaid || 0),
          lateFeeAmount: Number(item.lateFeeAmount || 0),
          totalAmount: item.totalAmount,
          remainingBalance: Number(item.remainingBalance || application.currentBalance || 0),
          paymentMethod: item.paymentMethod,
          referenceNumber: item.referenceNumber || '',
          installmentNo: Number(item.installmentNo || 0),
          notes: item.notes || '',
          receiptNumber: item.receiptNumber || String(item.id || '')
        }))
      : (sourceLoan.paymentHistory || []);

    const existingStatusHistoryKeys = new Set(
      (sourceLoan.statusHistory || []).map((entry) => `${this.toLoanStatus(entry.status)}::${this.normalizeDateValue(entry.changedAt)}`)
    );

    const appendedStatusHistory = (application.statusHistory || [])
      .filter((entry) => {
        const key = `${this.toLoanStatus(entry.status)}::${this.normalizeDateValue(entry.changedAt)}`;
        return !!this.normalizeDateValue(entry.changedAt) && !existingStatusHistoryKeys.has(key);
      })
      .map((entry) => ({
        id: this.parseNumericId(entry.id),
        status: this.toLoanStatus(entry.status),
        changedAt: this.toBackendDateTime(entry.changedAt),
        changedBy: this.resolveBackendUser(entry.changedBy) || (entry.status === application.status ? this.resolveBackendUser(actingUserId) : null),
        notes: entry.notes || '',
        overrideOpen: Boolean(entry.overrideOpen),
        overrideBy: this.resolveBackendUser(entry.overrideBy),
        overrideReason: entry.overrideReason || '',
        statusBeforeOverride: this.normalizeStatusBeforeOverride(entry.status, entry.statusBeforeOverride, sourceLoan.status),
        interestRate: entry.interestRate !== undefined ? Number(entry.interestRate) : undefined
      }));

    const resolvedStatusHistory = this.deduplicateStatusHistory([
      ...(sourceLoan.statusHistory || []).map((entry) => ({
        ...entry,
        status: this.toLoanStatus(entry.status),
        changedAt: this.toBackendDateTime(entry.changedAt),
        changedBy: this.resolveBackendUser(entry.changedBy),
        overrideBy: this.resolveBackendUser(entry.overrideBy),
        statusBeforeOverride: this.normalizeStatusBeforeOverride(entry.status, entry.statusBeforeOverride, sourceLoan.status)
      })),
      ...appendedStatusHistory
    ]);

    const carriesApprovalMetadata = application.status === 'AWAITING_INTEREST_ACCEPTANCE'
      || application.status === 'APPROVED'
      || application.status === 'READY_FOR_DISBURSEMENT'
      || application.status === 'ACTIVE'
      || application.status === 'COMPLETED';

    const resolvedApprovedDate = carriesApprovalMetadata
      ? this.toBackendDateTime(application.approvedDate || sourceLoan.approvedDate || '')
      : this.toBackendDateTime(sourceLoan.approvedDate || '');

    const resolvedApprovedBy = this.resolveBackendUser(
      carriesApprovalMetadata
        ? this.extractUserId(application.approvedBy) || this.extractUserId(sourceLoan.approvedBy) || actingUserId
        : this.extractUserId(sourceLoan.approvedBy)
    );

    const resolvedApprovedById = this.extractUserId(resolvedApprovedBy) || undefined;
    const resolvedDisbursementInitiatedById = this.extractUserId(application.disbursementInitiatedBy || sourceLoan.disbursementInitiatedBy) || undefined;
    const resolvedDisbursementConfirmedById = this.extractUserId(application.disbursementConfirmedBy || sourceLoan.disbursementConfirmedBy) || undefined;
    const resolvedDisbursedById = this.extractUserId(
      application.status === 'ACTIVE'
        ? this.extractUserId(application.disbursedBy) || actingUserId
        : this.extractUserId(sourceLoan.disbursedBy)
    ) || undefined;
    const resolvedRejectedById = this.extractUserId(
      application.status === 'REJECTED'
        ? this.extractUserId(application.rejectedBy) || actingUserId
        : this.extractUserId(sourceLoan.rejectedBy)
    ) || undefined;

    return this.compactPayload({
      id: Number(sourceLoan.id),
      loanCode: sourceLoan.loanCode || application.loanCode || String(application.id),
      employeeId: Number(sourceLoan.employee?.id || application.employeeId || 0),
      monthlySalary: Number(sourceLoan.monthlySalary || 0),
      amount: application.amount,
      approvedAmount: Number(application.approvedAmount || sourceLoan.approvedAmount || application.amount || 0),
      purpose: application.purpose,
      repaymentAmount: application.repaymentAmount,
      repaymentTime: application.repaymentTime,
      repaymentPeriodMonths: Number(sourceLoan.repaymentPeriodMonths || application.repaymentTime || 0),
      repaymentStartDate: this.toBackendDateTime(normalizedRepaymentStartDate),
      repaymentDay: Number.isFinite(normalizedRepaymentDay) && normalizedRepaymentDay > 0 ? normalizedRepaymentDay : null,
      modeOfPayment: application.modeOfPayment,
      interestRate: Number(application.interestRate || sourceLoan.interestRate || 0),
      totalRepayable: Number(
        resolveLoanTotalRepayableAmount({
          repaymentSchedule: application.repaymentSchedule,
          repaymentAmount: application.repaymentAmount || sourceLoan.repaymentAmount,
          repaymentTime: application.repaymentTime || sourceLoan.repaymentTime,
          amount: application.amount || sourceLoan.amount,
          status: application.status,
          modeOfPayment: application.modeOfPayment
        }) || sourceLoan.totalRepayable || 0
      ),
      requestDate: this.toBackendDateTime(this.resolveOriginalRequestDate(application, sourceLoan)),
      approvedDate: resolvedApprovedDate,
      approvedBy: typeof application.approvedBy === 'object' ? application.approvedBy?.id : application.approvedBy,
      disbursementInitiatedAt: this.toBackendDateTime(application.disbursementInitiatedAt || sourceLoan.disbursementInitiatedAt || ''),
      disbursementInitiatedBy: typeof application.disbursementInitiatedBy === 'object' ? application.disbursementInitiatedBy?.id : application.disbursementInitiatedBy,
      disbursementInstructionReference: application.disbursementInstructionReference || sourceLoan.disbursementInstructionReference || '',
      disbursementConfirmedAt: this.toBackendDateTime(application.disbursementConfirmedAt || sourceLoan.disbursementConfirmedAt || ''),
      disbursementConfirmedBy: typeof application.disbursementConfirmedBy === 'object' ? application.disbursementConfirmedBy?.id : application.disbursementConfirmedBy,
      disbursementReference: application.disbursementReference || sourceLoan.disbursementReference || '',
      disbursedAmount: Number(application.disbursedAmount || sourceLoan.disbursedAmount || application.approvedAmount || sourceLoan.approvedAmount || 0),
      disbursedDate: this.toBackendDateTime(application.disbursedDate || sourceLoan.disbursedDate || ''),
      disbursedBy: typeof application.disbursedBy === 'object' ? application.disbursedBy?.id : application.disbursedBy,
      completedDate: this.toBackendDateTime(
        application.status === 'COMPLETED' ? application.completedDate || sourceLoan.completedDate || '' : sourceLoan.completedDate || ''
      ),
      rejectedDate: this.toBackendDateTime(
        application.status === 'REJECTED' ? application.rejectedDate || sourceLoan.rejectedDate || '' : sourceLoan.rejectedDate || ''
      ),
      rejectedBy: typeof application.rejectedBy === 'object' ? application.rejectedBy?.id : application.rejectedBy,
      status: typeof application.status === 'string' ? application.status.toUpperCase() : application.status,
      adminComment: application.adminComment || sourceLoan.adminComment || this.getLatestStatusNote(application),
      currentBalance: application.currentBalance,
      totalPaid: application.totalPaid,
      totalPrincipalPaid: Number(application.totalPrincipalPaid || sourceLoan.totalPrincipalPaid || 0),
      totalInterestPaid: Number(application.totalInterestPaid || sourceLoan.totalInterestPaid || 0),
      totalLateFeesAccrued: Number(application.totalLateFeesAccrued || sourceLoan.totalLateFeesAccrued || 0),
      totalLateFeesPaid: Number(application.totalLateFeesPaid || sourceLoan.totalLateFeesPaid || 0),
      outstandingPrincipal: Number(application.outstandingPrincipal || sourceLoan.outstandingPrincipal || application.currentBalance || 0),
      outstandingInterest: Number(application.outstandingInterest || sourceLoan.outstandingInterest || 0),
      outstandingBalance: Number(application.outstandingBalance || sourceLoan.outstandingBalance || application.currentBalance || 0),
      lastPaymentReceived: this.toBackendDateTime(application.lastPaymentReceived || sourceLoan.lastPaymentReceived || ''),
      lastPaymentAmount: Number(application.lastPaymentAmount || sourceLoan.lastPaymentAmount || 0),
      nextPaymentDueDate: this.toBackendDateTime(application.nextPaymentDueDate || sourceLoan.nextPaymentDueDate || ''),
      skippedPaymentsCount: Number(application.skippedPaymentsCount || sourceLoan.skippedPaymentsCount || 0),
      overduePaymentsCount: Number(application.overduePaymentsCount || sourceLoan.overduePaymentsCount || 0),
      employeeBankName: application.employeeBankName || application.memberBankName || sourceLoan.employeeBankName || '',
      employeeAccountNumber: application.employeeAccountNumber || application.memberAccountNumber || sourceLoan.employeeAccountNumber || '',
      statusBeforeOverride,
      gracePeriodRequests: resolvedGracePeriodRequests,
      repaymentSchedule: resolvedRepaymentSchedule,
      paymentHistory: resolvedPaymentHistory,
      statusHistory: (resolvedStatusHistory || [])
        .map((item: any) => {
          const allowedStatuses = [
            'PENDING',
            'AWAITING_INTEREST_ACCEPTANCE',
            'APPROVED',
            'READY_FOR_DISBURSEMENT',
            'REJECTED',
            'ACTIVE',
            'SKIPPED',
            'OVERDUE',
            'DEFAULTED',
            'COMPLETED',
            'PAUSED'
          ];
          let status = typeof item.status === 'string' ? item.status.toUpperCase() : item.status;
          if (!allowedStatuses.includes(status)) {
            status = 'PENDING';
          }
          let statusBeforeOverride = typeof item.statusBeforeOverride === 'string' ? item.statusBeforeOverride.toUpperCase() : item.statusBeforeOverride;
          if (statusBeforeOverride && !allowedStatuses.includes(statusBeforeOverride)) {
            statusBeforeOverride = 'PENDING';
          }
          let notes = typeof item.notes === 'string' ? item.notes.trim().replace(/[.]+$/, '') : item.notes;
          return {
            ...item,
            status,
            statusBeforeOverride,
            notes,
            changedBy: typeof item.changedBy === 'object' ? item.changedBy?.id : item.changedBy,
            overrideBy: typeof item.overrideBy === 'object' ? item.overrideBy?.id : item.overrideBy
          };
        })
        .filter((item: any) => {
          const allowedStatuses = [
            'PENDING',
            'AWAITING_INTEREST_ACCEPTANCE',
            'APPROVED',
            'READY_FOR_DISBURSEMENT',
            'REJECTED',
            'ACTIVE',
            'SKIPPED',
            'OVERDUE',
            'DEFAULTED',
            'COMPLETED',
            'PAUSED'
          ];
          return allowedStatuses.includes(item.status);
        }),
      lateFeePercentage: Number(application.lateFeePercentage || sourceLoan.lateFeePercentage || 0),
      lateFeeGracePeriodDays: Number(application.lateFeeGracePeriodDays || sourceLoan.lateFeeGracePeriodDays || 0)
    });
  }

  private resolveInterestAgreement(application: any, sourceLoan: any) {
    if (application.interestAgreement) return application.interestAgreement;
    if (sourceLoan.interestAgreement) return sourceLoan.interestAgreement;
    return {
      id: 0,
      loanId: Number(sourceLoan.id || application.id || 0),
      employeeId: Number(sourceLoan.employee?.id || application.employeeId || 0),
      proposedInterestRate: Number(application.interestRate || sourceLoan.interestRate || 0),
      agreedInterestRate: Number(application.interestRate || sourceLoan.interestRate || 0),
      status: 'PENDING',
      agreedAt: null,
      agreementMethod: 'EMAIL_LINK',
      ipAddress: null,
      notes: null
    };
  }

  private extractUserId(user: any): number {
    if (user === null || user === undefined) return 0;
    if (typeof user === 'number' && !isNaN(user)) return user;
    if (typeof user === 'string') {
      const parsed = parseInt(user, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof user === 'object') {
      const id = user.id ?? user.userId ?? user.ID ?? user.UserId;
      if (id !== undefined) {
        const parsed = parseInt(id, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
    }
    return 0;
  }

  private getCurrentUserId(): number {
    const storedUserId = String(sessionStorage.getItem('userid') || localStorage.getItem('userid') || '').trim();
    const parsedUserId = Number(storedUserId);
    return Number.isFinite(parsedUserId) ? parsedUserId : 0;
  }

  private parseNumericId(value: string | number | undefined | null): number | null {
    const rawValue = String(value ?? '').trim();
    if (!rawValue || !/^\d+$/.test(rawValue)) {
      return null;
    }
    const numericValue = Number(rawValue);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  private deduplicateStatusHistory(statusHistory: Array<Record<string, any>>): Array<Record<string, any>> {
    const seenEntries = new Set<string>();

    return statusHistory.filter((entry) => {
      const status = this.toLoanStatus(String(entry['status'] || ''));
      const changedAt = this.normalizeDateValue(entry['changedAt']);
      const key = `${status}::${changedAt}`;

      if (!status || !changedAt || seenEntries.has(key)) {
        return false;
      }

      seenEntries.add(key);
      return true;
    });
  }

  private normalizeStatusBeforeOverride(
    currentStatus: LoanApplication['status'],
    candidateStatusBeforeOverride: unknown,
    fallbackStatus: unknown
  ): LoanApplication['status'] | null {
    const normalizedCandidateStatus = this.toLoanStatus(String(candidateStatusBeforeOverride || ''));
    if (normalizedCandidateStatus && normalizedCandidateStatus !== currentStatus) {
      return normalizedCandidateStatus;
    }

    const normalizedFallbackStatus = this.toLoanStatus(String(fallbackStatus || ''));
    if (normalizedFallbackStatus && normalizedFallbackStatus !== currentStatus) {
      return normalizedFallbackStatus;
    }

    return null;
  }

  private compactPayload<T>(value: T): T {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.compactPayload(item))
        .filter((item) => item !== null && item !== undefined) as T;
    }

    if (value && typeof value === 'object') {
      const compactedEntries = Object.entries(value as Record<string, unknown>)
        .reduce<Record<string, unknown>>((accumulator, [key, entryValue]) => {
          const compactedValue = this.compactPayload(entryValue);

          if (compactedValue === null || compactedValue === undefined) {
            return accumulator;
          }

          if (typeof compactedValue === 'string' && !compactedValue.trim()) {
            return accumulator;
          }

          accumulator[key] = compactedValue;
          return accumulator;
        }, {});

      return compactedEntries as T;
    }

    return value;
  }

  private resolveBackendUser(value: unknown): AdvanceLoanUser | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const userId = this.extractUserId(value);
      if (userId <= 0) {
        return null;
      }
      return {
        id: userId,
        fullname: String((value as any).fullname || (value as any).fullName || this.getStoredCurrentUserName(userId) || `User ${userId}`),
        userId: Number((value as any).userId || userId),
        email: String((value as any).email || this.getStoredValue(['email']) || ''),
        phoneNumber: String((value as any).phoneNumber || (value as any).phone || this.getStoredValue(['phoneNumber', 'phone']) || ''),
        username: String((value as any).username || this.getStoredValue(['username']) || ''),
        clientType: String((value as any).clientType || ''),
        gender: String((value as any).gender || ''),
        accountId: String((value as any).accountId || ''),
        address: String((value as any).address || ''),
        city: String((value as any).city || ''),
        state: String((value as any).state || ''),
        country: String((value as any).country || '')
      };
    }

    const userId = this.extractUserId(value);
    if (userId <= 0) {
      return null;
    }

    return {
      id: userId,
      fullname: this.getStoredCurrentUserName(userId) || `User ${userId}`,
      userId,
      email: this.getStoredValue(['email']) || '',
      phoneNumber: this.getStoredValue(['phoneNumber', 'phone']) || '',
      username: this.getStoredValue(['username']) || '',
      clientType: '',
      gender: '',
      accountId: '',
      address: '',
      city: '',
      state: '',
      country: ''
    };
  }

  private getStoredCurrentUserName(userId?: number): string {
    const currentUserId = this.getCurrentUserId();
    const fallbackName = this.getStoredValue(['fullname', 'fullName', 'name', 'username']) || '';
    if (!userId || (currentUserId > 0 && userId === currentUserId)) {
      return fallbackName;
    }
    return '';
  }

  private getStoredValue(keys: string[]): string {
    for (const key of keys) {
      const value = String(sessionStorage.getItem(key) || localStorage.getItem(key) || '').trim();
      if (value) {
        return value;
      }
    }
    return '';
  }

  private resolveDisplayAmount(loan: AdvanceLoan, status: LoanApplication['status'], persistedRequestedAmount: number): number {
    const backendAmount = Number(loan.amount || 0);
    if (
      (status === 'PENDING' || status === 'AWAITING_INTEREST_ACCEPTANCE') &&
      persistedRequestedAmount > 0 &&
      Math.abs(backendAmount - persistedRequestedAmount) <= 2
    ) {
      return Number(persistedRequestedAmount.toFixed(2));
    }

    return Number(backendAmount.toFixed(2));
  }

  private getEmployeeFullName(employee?: AdvanceLoan['employee']): string {
    if (!employee) {
      return 'Employee';
    }
    const fullName = [employee.firstName, employee.lastName]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(' ');
    return fullName || 'Employee';
  }

  private getUserDisplayName(user: AdvanceLoanUser | number | undefined): string {
    return resolveLoanActorName(user);
  }

  private getStatusActorDisplayName(
    loan: Pick<AdvanceLoan, 'id' | 'loanCode'>,
    status: LoanApplication['status'],
    actor: AdvanceLoanUser | number | undefined
  ): string {
    return resolveLoanActorName(actor, {
      fallbackName: this.getPersistedStatusActorName(loan, status)
    });
  }

  private getPersistedStatusActorName(
    loan: Pick<AdvanceLoan, 'id' | 'loanCode'>,
    status: LoanApplication['status']
  ): string {
    return readPersistedLoanStatusActorName({
      id: Number(loan.id || 0),
      loanCode: String(loan.loanCode || loan.id || '')
    }, status);
  }

  private getPersistedStatusNote(
    loan: Pick<AdvanceLoan, 'id' | 'loanCode'>,
    status: LoanApplication['status']
  ): string {
    return readPersistedLoanStatusNote({
      id: Number(loan.id || 0),
      loanCode: String(loan.loanCode || loan.id || '')
    }, status);
  }

  private getPersistedStatusChangedAt(
    loan: Pick<AdvanceLoan, 'id' | 'loanCode'>,
    status: LoanApplication['status']
  ): string {
    return readPersistedLoanStatusChangedAt({
      id: Number(loan.id || 0),
      loanCode: String(loan.loanCode || loan.id || '')
    }, status);
  }

  private getLatestStatusNote(application: LoanApplication): string {
    const latestHistory = [...(application.statusHistory || [])]
      .sort((first, second) => new Date(second.changedAt).getTime() - new Date(first.changedAt).getTime())[0];
    return latestHistory?.notes || '';
  }

  private resolveOriginalRequestDate(application: LoanApplication, sourceLoan: AdvanceLoan): string {
    const candidateDates = [
      this.normalizeDateValue(application.requestDate),
      this.resolveLoanRequestDate(sourceLoan),
      ...((application.statusHistory || [])
        .filter((item) => item.status === 'PENDING')
        .map((item) => this.normalizeDateValue(item.changedAt))
        .filter(Boolean))
    ].filter(Boolean);

    if (!candidateDates.length) {
      return new Date().toISOString();
    }

    const originalRequestDate = [...candidateDates].sort(
      (first, second) => new Date(first).getTime() - new Date(second).getTime()
    )[0];

    return originalRequestDate;
  }

  private resolveLoanRequestDate(loan: AdvanceLoan): string {
    const directRequestDate = this.normalizeDateValue(loan.requestDate);
    if (directRequestDate) {
      return directRequestDate;
    }

    const pendingHistoryDate = [...(loan.statusHistory || [])]
      .filter((item) => this.toLoanStatus(item.status) === 'PENDING')
      .map((item) => this.normalizeDateValue(item.changedAt))
      .filter(Boolean)
      .sort((first, second) => new Date(first).getTime() - new Date(second).getTime())[0];

    if (pendingHistoryDate) {
      return pendingHistoryDate;
    }

    return this.normalizeDateValue(loan.approvedDate)
      || this.normalizeDateValue(loan.disbursedDate)
      || this.normalizeDateValue(loan.completedDate)
      || new Date().toISOString();
  }

  private fromBackendPaymentMode(paymentMode?: string): 'MONTHLY' | 'ONE_OFF' {
    return String(paymentMode || '').toUpperCase() === 'ONE_OFF' ? 'ONE_OFF' : 'MONTHLY';
  }

  private toLoanStatus(status?: string): LoanApplication['status'] {
    const normalizedStatus = String(status || '').toUpperCase();
    switch (normalizedStatus) {
      case 'APPROVED':
      case 'REJECTED':
      case 'READY_FOR_DISBURSEMENT':
      case 'READY-FOR-DISBURSEMENT':
      case 'ACTIVE':
      case 'COMPLETED':
      case 'AWAITING_INTEREST_ACCEPTANCE':
      case 'SKIPPED':
      case 'OVERDUE':
      case 'DEFAULTED':
      case 'PAUSED':
        return normalizedStatus === 'READY-FOR-DISBURSEMENT' ? 'READY_FOR_DISBURSEMENT' : normalizedStatus;
      default:
        return 'PENDING';
    }
  }

  private toRepaymentStatus(status?: string): RepaymentScheduleItem['status'] {
    const normalizedStatus = String(status || '').toUpperCase();
    switch (normalizedStatus) {
      case 'PAID':
      case 'OVERDUE':
      case 'SKIPPED':
        return normalizedStatus;
      default:
        return 'PENDING';
    }
  }

  private deriveInterestRate(loan: AdvanceLoan, statusHistory: StatusChange[] = []): number {
    const latestApprovedInterestRate = [...statusHistory]
      .filter((entry) => entry.status === 'APPROVED' && Number(entry.interestRate || 0) > 0)
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())[0]?.interestRate;
    if (Number(latestApprovedInterestRate || 0) > 0) {
      return Number(Number(latestApprovedInterestRate).toFixed(2));
    }

    const persistedInterestRate = readPersistedLoanInterestRate({
      id: Number(loan.id || 0),
      loanCode: String(loan.loanCode || loan.id || '')
    });
    if (persistedInterestRate > 0) {
      return Number(persistedInterestRate.toFixed(2));
    }

    const explicitRate = Number((loan as any).interestRate);
    if (Number.isFinite(explicitRate) && explicitRate > 0) {
      return Number(explicitRate.toFixed(2));
    }

    const normalizedStatus = String(loan.status || '').toUpperCase();
    if (normalizedStatus !== 'APPROVED' && normalizedStatus !== 'ACTIVE' && normalizedStatus !== 'COMPLETED') {
      return 0;
    }

    const principal = Number(loan.amount || 0);
    const tenureMonths = Number(loan.repaymentTime || 0);
    if (principal <= 0 || tenureMonths <= 0) {
      return this.getDefaultInterestRate(loan.modeOfPayment, tenureMonths);
    }

    if (!loan.repaymentSchedule?.length) {
      return this.getDefaultInterestRate(loan.modeOfPayment, tenureMonths);
    }

    const totalInterest = loan.repaymentSchedule.reduce(
      (sum, item) => sum + Number(item.interestAmount || 0),
      0
    );

    if (totalInterest <= 0) {
      return this.getDefaultInterestRate(loan.modeOfPayment, tenureMonths);
    }

    const annualizedRate = ((totalInterest / principal) * 100 * 12) / tenureMonths;
    return Number(annualizedRate.toFixed(2));
  }

  private deriveLateFeePercentage(loan: AdvanceLoan): number {
    const explicitLateFeePercentage = Number((loan as any).lateFeePercentage || 0);
    if (Number.isFinite(explicitLateFeePercentage) && explicitLateFeePercentage >= 0) {
      return Number(explicitLateFeePercentage.toFixed(2));
    }

    const persistedLateFeePercentage = readPersistedLoanLateFeePercentage({
      id: Number(loan.id || 0),
      loanCode: String(loan.loanCode || loan.id || '')
    });
    if (persistedLateFeePercentage > 0) {
      return Number(persistedLateFeePercentage.toFixed(2));
    }

    return 2;
  }

  private deriveLateFeeGracePeriodDays(loan: AdvanceLoan): number {
    const explicitGracePeriodDays = Number((loan as any).lateFeeGracePeriodDays || 0);
    if (Number.isFinite(explicitGracePeriodDays) && explicitGracePeriodDays >= 0) {
      return Math.round(explicitGracePeriodDays);
    }

    const persistedGracePeriodDays = readPersistedLoanLateFeeGracePeriodDays({
      id: Number(loan.id || 0),
      loanCode: String(loan.loanCode || loan.id || '')
    });
    if (persistedGracePeriodDays > 0) {
      return Math.round(persistedGracePeriodDays);
    }

    return 15;
  }

  private getDefaultInterestRate(modeOfPayment?: string, tenureMonths = 0): number {
    if (String(modeOfPayment || '').toUpperCase() === 'ONE_OFF') {
      return 5;
    }
    if (tenureMonths <= 3) {
      return 4.5;
    }
    if (tenureMonths <= 6) {
      return 6;
    }
    if (tenureMonths <= 12) {
      return 8.5;
    }
    return 10.5;
  }

  private buildFallbackRepaymentSchedule(
    loan: AdvanceLoan,
    interestRate: number,
    fallbackRequestDate: string
  ): RepaymentScheduleItem[] {
    const normalizedStatus = this.toLoanStatus(loan.status);
    const totalAmount = Number(loan.amount || 0);
    const tenureMonths = Number(loan.repaymentTime || 0);
    const modeOfPayment = this.fromBackendPaymentMode(loan.modeOfPayment);

    if ((normalizedStatus !== 'ACTIVE' && normalizedStatus !== 'COMPLETED') || totalAmount <= 0 || tenureMonths <= 0) {
      return [];
    }

    const baseDateRaw = this.normalizeDateValue(loan.disbursedDate)
      || this.normalizeDateValue(loan.approvedDate)
      || fallbackRequestDate
      || new Date().toISOString();
    const baseDate = new Date(baseDateRaw);
    const monthlyInterestRate = interestRate > 0 ? interestRate / 100 / 12 : 0;

    if (modeOfPayment === 'ONE_OFF') {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(15);
      const oneOffInterest = Number((totalAmount * (interestRate / 100)).toFixed(2));
      const oneOffTotal = Number((totalAmount + oneOffInterest).toFixed(2));
      return [{
        installmentNo: 1,
        dueDate: dueDate.toISOString(),
        principalAmount: Number(totalAmount.toFixed(2)),
        interestAmount: oneOffInterest,
        totalAmount: oneOffTotal,
        paidAmount: 0,
        remainingBalance: 0,
        status: 'PENDING'
      }];
    }

    const monthlyPayment = monthlyInterestRate > 0
      ? totalAmount *
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, tenureMonths)) /
        (Math.pow(1 + monthlyInterestRate, tenureMonths) - 1)
      : totalAmount / tenureMonths;

    const schedule: RepaymentScheduleItem[] = [];
    let remainingBalance = totalAmount;

    for (let month = 1; month <= tenureMonths; month++) {
      const interestPortion = monthlyInterestRate > 0 ? remainingBalance * monthlyInterestRate : 0;
      const principalPortion = monthlyPayment - interestPortion;
      remainingBalance = Math.max(remainingBalance - principalPortion, 0);
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + month);
      dueDate.setDate(15);
      schedule.push({
        installmentNo: month,
        dueDate: dueDate.toISOString(),
        principalAmount: Number(principalPortion.toFixed(2)),
        interestAmount: Number(interestPortion.toFixed(2)),
        totalAmount: Number(monthlyPayment.toFixed(2)),
        paidAmount: 0,
        remainingBalance: Number(remainingBalance.toFixed(2)),
        status: 'PENDING'
      });
    }
    return schedule;
  }

  private normalizeDateValue(value: unknown, fallback = ''): string {
    if (Array.isArray(value)) {
      const [year, month, day, hour = 0, minute = 0, second = 0, nanosecond = 0] = value;
      const numericParts = [year, month, day, hour, minute, second, nanosecond].map((part) => Number(part || 0));
      if (numericParts.slice(0, 3).every((part) => Number.isFinite(part) && part > 0)) {
        const [safeYear, safeMonth, safeDay, safeHour, safeMinute, safeSecond, safeNanosecond] = numericParts;
        const millisecond = Math.floor(safeNanosecond / 1000000);
        const normalizedDate = new Date(Date.UTC(safeYear, safeMonth - 1, safeDay, safeHour, safeMinute, safeSecond, millisecond));
        return Number.isNaN(normalizedDate.getTime()) ? fallback : normalizedDate.toISOString();
      }
      return fallback;
    }
    const rawValue = String(value ?? '').trim();
    if (!rawValue || rawValue.toLowerCase() === 'null' || rawValue.toLowerCase() === 'undefined') {
      return fallback;
    }
    const timestamp = new Date(rawValue).getTime();
    return Number.isFinite(timestamp) ? rawValue : fallback;
  }

  private toBackendDateTime(value: unknown, fallback: string | null = null): string | null {
    const normalizedValue = this.normalizeDateValue(value, fallback ?? '');
    if (!normalizedValue) {
      return fallback;
    }
    return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)
      ? `${normalizedValue}T00:00:00`
      : normalizedValue;
  }

  private resolveStatusBeforeOverride(
    nextStatus: LoanApplication['status'],
    currentStatusBeforeOverride: unknown,
    currentStatus: unknown
  ): LoanApplication['status'] | null {
    const normalizedCurrentStatusBeforeOverride = this.toLoanStatus(String(currentStatusBeforeOverride || ''));
    if (normalizedCurrentStatusBeforeOverride && normalizedCurrentStatusBeforeOverride !== nextStatus) {
      return normalizedCurrentStatusBeforeOverride;
    }

    const normalizedCurrentStatus = this.toLoanStatus(String(currentStatus || ''));
    if (normalizedCurrentStatus && normalizedCurrentStatus !== nextStatus) {
      return normalizedCurrentStatus;
    }

    return null;
  }

  private persistRepaymentStartDateBySignature(entry: {
    employeeId: number;
    amount: number;
    purpose: string;
    modeOfPayment: string;
    requestDate: string;
    repaymentStartDate: unknown;
  }): void {
    const normalizedRepaymentStartDate = normalizeLoanRepaymentStartDate(entry.repaymentStartDate);
    const signature = this.buildRepaymentStartDateSignature(entry);
    if (!signature || !normalizedRepaymentStartDate) {
      return;
    }

    const cache = this.readRepaymentStartDateSignatureCache();
    cache[signature] = normalizedRepaymentStartDate;
    this.writeRepaymentStartDateSignatureCache(cache);
  }

  private readRepaymentStartDateBySignature(entry: {
    employeeId: number;
    amount: number;
    purpose: string;
    modeOfPayment: string;
    requestDate: string;
  }): string {
    const signature = this.buildRepaymentStartDateSignature(entry);
    if (!signature) {
      return '';
    }

    const cache = this.readRepaymentStartDateSignatureCache();
    return normalizeLoanRepaymentStartDate(cache[signature] || '');
  }

  private buildRepaymentStartDateSignature(entry: {
    employeeId: number;
    amount: number;
    purpose: string;
    modeOfPayment: string;
    requestDate: string;
  }): string {
    const normalizedDate = this.normalizeDateValue(entry.requestDate);
    const parsedDate = normalizedDate ? new Date(normalizedDate) : null;
    const normalizedTimestamp = parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toISOString().slice(0, 16)
      : String(entry.requestDate || '').trim();

    return [
      String(Number(entry.employeeId || 0)),
      String(Number(entry.amount || 0)),
      normalizedTimestamp
    ].join('|');
  }

  private readRepaymentStartDateSignatureCache(): Record<string, string> {
    const rawValue = String(localStorage.getItem(this.repaymentStartDateSignatureCacheKey) || sessionStorage.getItem(this.repaymentStartDateSignatureCacheKey) || '').trim();
    if (!rawValue || rawValue === 'null' || rawValue === 'undefined') {
      return {};
    }

    try {
      const parsedValue = JSON.parse(rawValue);
      return parsedValue && typeof parsedValue === 'object' ? parsedValue as Record<string, string> : {};
    } catch {
      return {};
    }
  }

  private writeRepaymentStartDateSignatureCache(cache: Record<string, string>): void {
    const serializedCache = JSON.stringify(cache);
    localStorage.setItem(this.repaymentStartDateSignatureCacheKey, serializedCache);
    sessionStorage.setItem(this.repaymentStartDateSignatureCacheKey, serializedCache);
  }

  private handleError(error: any): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      if (isDevMode()) {
        console.error('Advance loan API error', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          error: error.error
        });
        if (error.error && typeof error.error === 'string') {
          console.error('Raw error response:', error.error);
        }
        if (error.error && error.error.error instanceof SyntaxError) {
          console.error('JSON Parse Error - The server returned invalid JSON');
        }
      }
      return throwError(() => error);
    }
    console.error('Advance loan service error', error);
    return throwError(() => error);
  }
}
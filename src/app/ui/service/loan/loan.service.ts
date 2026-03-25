import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
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
  persistLoanStatusActorName,
  readPersistedLoanInterestRate,
  readPersistedLoanStatusNote,
  readPersistedLoanStatusActorName,
  resolveCompletedLoanActor,
  resolveLoanActorName,
  resolveLoanEmployeeName,
  resolvePaymentActorName
} from './loan-display.util';

@Injectable({
  providedIn: 'root'
})
export class LoanService {

  private readonly standardLoanUrl = 'https://be.optimaxsuites.com/x/api/v2/hr/advanceLoans';
  private readonly originalRequestDateCacheKey = 'advance-loan-original-request-dates';
  private readonly loanMetadataCacheKey = 'advance-loan-submit-metadata';

  constructor(private http: HttpClient) {}

  getAllAdvanceLoans(): Observable<AdvanceLoan[]> {
    return this.http.get<AdvanceLoan[]>(this.standardLoanUrl, {
      responseType: 'json'
    }).pipe(
      map(response => this.safeParseResponse(response)),
      catchError(this.handleError)
    );
  }

  getAdvanceLoanById(id: number): Observable<AdvanceLoan> {
    return this.http.get<AdvanceLoan>(`${this.standardLoanUrl}/${id}`, {
      responseType: 'json'
    }).pipe(
      map(response => this.safeParseResponse(response)),
      catchError(this.handleError)
    );
  }

  createAdvanceLoan(payload: any): Observable<AdvanceLoan> {
    // Ensure payload is an object, not an array
    const requestBody = Array.isArray(payload) ? payload[0] : payload;
    
    return this.http.post<AdvanceLoan>(this.standardLoanUrl, requestBody, {
      responseType: 'json'
    }).pipe(
      map(response => this.safeParseResponse(response)),
      catchError(this.handleError)
    );
  }

  updateAdvanceLoan(id: number, payload: any): Observable<AdvanceLoan> {
    // Ensure payload is an object, not an array
    const requestBody = Array.isArray(payload) ? payload[0] : payload;
    
    if (isDevMode()) {
      console.log('Update request payload:', requestBody);
    }
    
    return this.http.put<AdvanceLoan>(`${this.standardLoanUrl}/${id}`, requestBody, {
      responseType: 'json'
    }).pipe(
      map(response => this.safeParseResponse(response)),
      catchError(this.handleError)
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

  listLoanApplications(): Observable<LoanApplication[]> {
    return this.getAllAdvanceLoans().pipe(
      map((loans) => loans.map((loan) => this.toLoanApplication(loan)))
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
      amount: formData.amount,
      purpose: formData.purpose === 'other' ? formData.otherPurpose || 'Other' : formData.purpose,
      repaymentAmount: formData.repaymentAmount,
      repaymentTime: formData.repaymentTime,
      modeOfPayment: formData.modeOfPayment,
      requestDate: formData.requestDate || new Date().toISOString()
    };
    
    return this.createAdvanceLoan(payload).pipe(
      map((loan) => {
        const application = this.toLoanApplication(loan);
        const originalRequestDate = this.normalizeDateValue(loan.requestDate, formData.requestDate || new Date().toISOString());
        this.persistOriginalRequestDate(loan.id, loan.loanCode, originalRequestDate);
        this.persistLoanMetadata(loan.id, loan.loanCode, {
          employeeId: Number(formData.employeeId || 0),
          fullName: formData.employeeName || application.fullName || 'Employee',
          department: formData.department ?? application.department ?? '',
          requestDate: originalRequestDate
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
    // If response is null or undefined
    if (!response) {
      return response;
    }

    // If response is already an object, return it
    if (typeof response === 'object') {
      return response;
    }

    // If response is a string, try to parse it
    if (typeof response === 'string') {
      // Clean the string if needed (remove BOM, extra whitespace)
      let cleanResponse = response.trim();
      
      // Remove BOM if present
      if (cleanResponse.charCodeAt(0) === 0xFEFF) {
        cleanResponse = cleanResponse.substring(1);
      }
      
      try {
        const parsed = JSON.parse(cleanResponse);
        
        // Check for common JSON errors
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

    // For any other type, return as is
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
    const requestDate = this.resolveCachedOriginalRequestDate(
      Number(loan.id || 0),
      String(loan.loanCode || loan.id),
      this.normalizeDateValue(loan.requestDate, new Date().toISOString()),
      statusHistory
    );
    const cachedMetadata = this.getPersistedLoanMetadata(Number(loan.id || 0), String(loan.loanCode || loan.id));
    const interestRate = this.deriveInterestRate(loan, statusHistory);
    const repaymentSchedule = mappedRepaymentSchedule.length > 0
      ? mappedRepaymentSchedule
      : this.buildFallbackRepaymentSchedule(loan, interestRate, requestDate);
    const normalizedStatus = this.toLoanStatus(loan.status);
    const resolvedTotalPaid = this.resolveTotalPaid(loan, paymentHistory, repaymentSchedule);
    const resolvedCurrentBalance = this.resolveCurrentBalance(loan, repaymentSchedule, resolvedTotalPaid, normalizedStatus);
    const resolvedOutstandingPrincipal = this.resolveOutstandingPrincipal(loan, repaymentSchedule, resolvedTotalPaid, normalizedStatus);
    const resolvedEmployeeId = Number(employee?.id || cachedMetadata.employeeId || 0);
    const resolvedFullName = this.getEmployeeFullName(employee) || cachedMetadata.fullName || 'Employee';
    const resolvedDepartment = employee?.department?.name ?? cachedMetadata.department ?? '';

    this.persistLoanMetadata(Number(loan.id || 0), String(loan.loanCode || loan.id), {
      employeeId: resolvedEmployeeId,
      fullName: resolvedFullName,
      department: resolvedDepartment,
      requestDate
    });

    return {
      id: Number(loan.id || 0),
      loanCode: String(loan.loanCode || loan.id),
      approvedDate: this.normalizeDateValue(loan.approvedDate) || undefined,
      approvedBy: loan.approvedBy,
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
      amount: Number(loan.amount || 0),
      modeOfPayment: this.fromBackendPaymentMode(loan.modeOfPayment),
      status: normalizedStatus,
      purpose: loan.purpose || '',
      repaymentTime: Number(loan.repaymentTime || repaymentSchedule.length || 0),
      repaymentAmount: Number(loan.repaymentAmount || repaymentSchedule[0]?.totalAmount || 0),
      acknowledgment: true,
      interestRate,
      currentBalance: resolvedCurrentBalance,
      totalPaid: resolvedTotalPaid,
      totalPrincipalPaid: Number(loan.totalPrincipalPaid || 0),
      totalInterestPaid: Number(loan.totalInterestPaid || 0),
      outstandingPrincipal: resolvedOutstandingPrincipal,
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
      if (status === 'PENDING' || status === 'COMPLETED') {
        return;
      }

      persistLoanStatusActorName(cacheableLoan, status, item.changedBy);
    });

    persistLoanStatusActorName(cacheableLoan, 'APPROVED', loan.approvedBy);
    persistLoanStatusActorName(cacheableLoan, 'ACTIVE', loan.disbursedBy);
    persistLoanStatusActorName(cacheableLoan, 'REJECTED', loan.rejectedBy);
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
    return {
      id: Number(item.id || index + 1),
      loanId: typeof item.loanId === 'number' ? item.loanId : item.loanId?.id,
      paidAt: item.paidAt,
      principalAmount: Number(item.principalAmount || 0),
      interestPaid: Number(item.interestPaid || 0),
      lateFeeAmount: Number(item.lateFeeAmount || 0),
      totalAmount: Number(item.totalAmount || 0),
      remainingBalance: Number(item.remainingBalance || 0),
      paymentMethod: item.modeofPayment || 'BANK_TRANSFER',
      referenceNumber: item.referenceNumber || '',
      installmentNo: Number(item.installmentNo || 0),
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
    const normalizedRequestDate = this.normalizeDateValue(loan.requestDate);
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
      entries.push({
        status: 'APPROVED',
        changedAt: normalizedApprovedDate,
        changedBy: this.getStatusActorDisplayName(loan, 'APPROVED', loan.approvedBy),
        notes: this.getPersistedStatusNote(loan, 'APPROVED') || (currentStatus === 'APPROVED' && adminComment ? adminComment : 'Loan approved')
      });
    }

    if (normalizedDisbursedDate) {
      entries.push({
        status: 'ACTIVE',
        changedAt: normalizedDisbursedDate,
        changedBy: this.getStatusActorDisplayName(loan, 'ACTIVE', loan.disbursedBy),
        notes: 'Loan disbursed'
      });
    }

    if (normalizedCompletedDate) {
      entries.push({
        status: 'COMPLETED',
        changedAt: normalizedCompletedDate,
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
        changedAt: normalizedRejectedDate,
        changedBy: this.getStatusActorDisplayName(loan, 'REJECTED', loan.rejectedBy),
        notes: this.getPersistedStatusNote(loan, 'REJECTED') || (currentStatus === 'REJECTED' && adminComment ? adminComment : 'Loan rejected')
      });
    }

    return entries;
  }

  private toUpdatePayload(application: LoanApplication, sourceLoan: AdvanceLoan): any {
    const actingUserId = this.getCurrentUserId();

    return {
      id: Number(sourceLoan.id),
      loanCode: sourceLoan.loanCode || application.loanCode || String(application.id),
      employeeId: Number(sourceLoan.employee?.id || application.employeeId || 0),
      amount: application.amount,
      purpose: application.purpose,
      repaymentAmount: application.repaymentAmount,
      repaymentTime: application.repaymentTime,
      modeOfPayment: application.modeOfPayment,
      requestDate: this.toBackendDateTime(this.resolveOriginalRequestDate(application, sourceLoan)),
      approvedDate: this.toBackendDateTime(application.approvedDate || sourceLoan.approvedDate || ''),
      approvedBy: this.resolveNullableUserId(
        application.status === 'APPROVED'
          ? this.extractUserId(application.approvedBy) || actingUserId
          : this.extractUserId(sourceLoan.approvedBy)
      ),
      disbursedDate: this.toBackendDateTime(application.disbursedDate || sourceLoan.disbursedDate || ''),
      disbursedBy: this.resolveNullableUserId(
        application.status === 'ACTIVE'
          ? this.extractUserId(application.disbursedBy) || actingUserId
          : this.extractUserId(sourceLoan.disbursedBy)
      ),
      completedDate: this.toBackendDateTime(
        application.status === 'COMPLETED' ? application.completedDate || sourceLoan.completedDate || '' : sourceLoan.completedDate || ''
      ),
      rejectedDate: this.toBackendDateTime(
        application.status === 'REJECTED' ? application.rejectedDate || sourceLoan.rejectedDate || '' : sourceLoan.rejectedDate || ''
      ),
      rejectedBy: this.resolveNullableUserId(
        application.status === 'REJECTED'
          ? this.extractUserId(application.rejectedBy) || actingUserId
          : this.extractUserId(sourceLoan.rejectedBy)
      ),
      status: application.status,
      adminComment: application.adminComment || sourceLoan.adminComment || this.getLatestStatusNote(application),
      currentBalance: application.currentBalance,
      totalPaid: application.totalPaid,
      totalPrincipalPaid: Number(application.totalPrincipalPaid || sourceLoan.totalPrincipalPaid || 0),
      totalInterestPaid: Number(application.totalInterestPaid || sourceLoan.totalInterestPaid || 0),
      outstandingPrincipal: Number(application.outstandingPrincipal || sourceLoan.outstandingPrincipal || application.currentBalance || 0),
      statusBeforeOverride: sourceLoan.statusBeforeOverride || application.status,
      repaymentSchedule: (application.repaymentSchedule || []).map((item, index) => ({
        id: this.resolveNumericId(sourceLoan.repaymentSchedule?.[index]?.id),
        installmentNo: item.installmentNo,
        dueDate: this.toBackendDateTime(item.dueDate),
        principalAmount: item.principalAmount,
        interestAmount: item.interestAmount,
        totalAmount: item.totalAmount,
        paidAmount: Number(item.paidAmount || 0),
        remainingBalance: item.remainingBalance,
        status: item.status
      })),
      paymentHistory: (application.paymentHistory || []).map((item, index) => ({
        id: this.resolveNumericId(sourceLoan.paymentHistory?.[index]?.id),
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
      })),
      statusHistory: [],
      interestRate: application.interestRate
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

  private resolveNumericId(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'object' && value !== null && 'id' in value) {
      const nestedId = Number((value as { id?: unknown }).id);
      return Number.isFinite(nestedId) ? nestedId : 0;
    }
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  private resolveNullableUserId(value: unknown): number | null {
    const userId = this.extractUserId(value);
    return userId > 0 ? userId : null;
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

  private getLatestStatusNote(application: LoanApplication): string {
    const latestHistory = [...(application.statusHistory || [])]
      .sort((first, second) => new Date(second.changedAt).getTime() - new Date(first.changedAt).getTime())[0];
    return latestHistory?.notes || '';
  }

  private resolveOriginalRequestDate(application: LoanApplication, sourceLoan: AdvanceLoan): string {
    const candidateDates = [
      this.getPersistedOriginalRequestDate(application.id, application.loanCode),
      this.getPersistedOriginalRequestDate(Number(sourceLoan.id || 0), String(sourceLoan.loanCode || sourceLoan.id)),
      this.normalizeDateValue(application.requestDate),
      this.normalizeDateValue(sourceLoan.requestDate),
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

    this.persistOriginalRequestDate(
      application.id || Number(sourceLoan.id || 0),
      application.loanCode || String(sourceLoan.loanCode || sourceLoan.id),
      originalRequestDate
    );

    return originalRequestDate;
  }

  private resolveCachedOriginalRequestDate(
    loanId: number,
    loanCode: string,
    requestDate: string,
    statusHistory: StatusChange[]
  ): string {
    const candidateDates = [
      this.getPersistedOriginalRequestDate(loanId, loanCode),
      requestDate,
      ...statusHistory
        .filter((item) => item.status === 'PENDING')
        .map((item) => this.normalizeDateValue(item.changedAt))
        .filter(Boolean)
    ].filter(Boolean);

    const originalRequestDate = candidateDates.length
      ? [...candidateDates].sort((first, second) => new Date(first).getTime() - new Date(second).getTime())[0]
      : requestDate;

    this.persistOriginalRequestDate(loanId, loanCode, originalRequestDate);
    return originalRequestDate;
  }

  private getPersistedOriginalRequestDate(loanId: number, loanCode: string): string {
    const cache = this.readOriginalRequestDateCache();
    return String(cache[`id:${loanId}`] || cache[`code:${loanCode}`] || '').trim();
  }

  private persistOriginalRequestDate(loanId: number, loanCode: string, requestDate: string): void {
    const normalizedRequestDate = this.normalizeDateValue(requestDate);
    if (!normalizedRequestDate) {
      return;
    }

    const cache = this.readOriginalRequestDateCache();
    if (loanId > 0) {
      cache[`id:${loanId}`] = normalizedRequestDate;
    }
    if (loanCode) {
      cache[`code:${loanCode}`] = normalizedRequestDate;
    }
    this.writeOriginalRequestDateCache(cache);
  }

  private readOriginalRequestDateCache(): Record<string, string> {
    const rawValue = localStorage.getItem(this.originalRequestDateCacheKey);
    if (!rawValue) {
      return {};
    }
    try {
      const parsedValue = JSON.parse(rawValue);
      return parsedValue && typeof parsedValue === 'object' ? parsedValue : {};
    } catch {
      return {};
    }
  }

  private writeOriginalRequestDateCache(cache: Record<string, string>): void {
    try {
      localStorage.setItem(this.originalRequestDateCacheKey, JSON.stringify(cache));
    } catch {
      // Ignore storage write failures
    }
  }

  private getPersistedLoanMetadata(
    loanId: number,
    loanCode: string
  ): { employeeId?: number; fullName?: string; department?: string; requestDate?: string } {
    const cache = this.readLoanMetadataCache();
    const metadata = cache[`id:${loanId}`] || cache[`code:${loanCode}`] || {};
    return typeof metadata === 'object' && metadata !== null ? metadata : {};
  }

  private persistLoanMetadata(
    loanId: number,
    loanCode: string,
    metadata: { employeeId?: number; fullName?: string; department?: string; requestDate?: string }
  ): void {
    const cache = this.readLoanMetadataCache();
    const normalizedMetadata = {
      employeeId: Number(metadata.employeeId || 0),
      fullName: String(metadata.fullName || '').trim(),
      department: typeof metadata.department === 'string' ? metadata.department : String(metadata.department ?? '').trim(),
      requestDate: this.normalizeDateValue(metadata.requestDate)
    };

    if (loanId > 0) {
      cache[`id:${loanId}`] = normalizedMetadata;
    }
    if (loanCode) {
      cache[`code:${loanCode}`] = normalizedMetadata;
    }
    this.writeLoanMetadataCache(cache);
  }

  private readLoanMetadataCache(): Record<string, { employeeId?: number; fullName?: string; department?: string; requestDate?: string }> {
    const rawValue = localStorage.getItem(this.loanMetadataCacheKey);
    if (!rawValue) {
      return {};
    }
    try {
      const parsedValue = JSON.parse(rawValue);
      return parsedValue && typeof parsedValue === 'object' ? parsedValue : {};
    } catch {
      return {};
    }
  }

  private writeLoanMetadataCache(
    cache: Record<string, { employeeId?: number; fullName?: string; department?: string; requestDate?: string }>
  ): void {
    try {
      localStorage.setItem(this.loanMetadataCacheKey, JSON.stringify(cache));
    } catch {
      // Ignore storage write failures
    }
  }

  private fromBackendPaymentMode(paymentMode?: string): 'MONTHLY' | 'ONE_OFF' {
    return String(paymentMode || '').toUpperCase() === 'ONE_OFF' ? 'ONE_OFF' : 'MONTHLY';
  }

  private toLoanStatus(status?: string): LoanApplication['status'] {
    const normalizedStatus = String(status || '').toUpperCase();
    switch (normalizedStatus) {
      case 'APPROVED':
      case 'REJECTED':
      case 'ACTIVE':
      case 'COMPLETED':
        return normalizedStatus;
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
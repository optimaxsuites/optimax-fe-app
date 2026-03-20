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

@Injectable({
  providedIn: 'root'
})
export class LoanService {

  private readonly standardLoanUrl = 'https://be.optimaxsuites.com/x/api/v2/hr/advanceLoans';
  private readonly originalRequestDateCacheKey = 'advance-loan-original-request-dates';

  constructor(private http: HttpClient) {}

  getAllAdvanceLoans(): Observable<AdvanceLoan[]> {
    return this.http.get<AdvanceLoan[]>(this.standardLoanUrl).pipe(
      catchError(this.handleError)
    );
  }

  getAdvanceLoanById(id: number): Observable<AdvanceLoan> {
    return this.http.get<AdvanceLoan>(`${this.standardLoanUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  createAdvanceLoan(payload: any): Observable<AdvanceLoan> {
    return this.http.post<AdvanceLoan>(this.standardLoanUrl, payload).pipe(
      catchError(this.handleError)
    );
  }

  updateAdvanceLoan(id: number, payload: any): Observable<AdvanceLoan> {
    return this.http.put<AdvanceLoan>(`${this.standardLoanUrl}/${id}`, payload).pipe(
      catchError(this.handleError)
    );
  }

  getAdvanceLoanStats(): Observable<AdvanceLoanStats> {
    return this.http.get<AdvanceLoanStats>(`${this.standardLoanUrl}/stats`).pipe(
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
    return this.createAdvanceLoan({
      employeeId: Number(formData.employeeId || 0),
      amount: formData.amount,
      purpose: formData.purpose === 'other' ? formData.otherPurpose || 'Other' : formData.purpose,
      repaymentAmount: formData.repaymentAmount,
      repaymentTime: formData.repaymentTime,
      modeOfPayment: formData.modeOfPayment,
      requestDate: formData.requestDate || new Date().toISOString()
    }).pipe(
      map((loan) => {
        const application = this.toLoanApplication(loan);
        const originalRequestDate = this.normalizeDateValue(loan.requestDate, formData.requestDate || new Date().toISOString());
        this.persistOriginalRequestDate(loan.id, loan.loanCode, originalRequestDate);

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

        // ===== INSERT ALL THE DEBUG CODE HERE =====
        console.log('=== COMPLETE PAYLOAD DEBUG ===');
        
        // Check every field that might be a user reference
        const fieldsToCheck = [
          'approvedBy', 'disbursedBy', 'rejectedBy', 
          'createdBy', 'updatedBy', 'modifiedBy',
          'approvedById', 'disbursedById', 'rejectedById'
        ];

        fieldsToCheck.forEach(field => {
          if (payload[field] !== undefined) {
            console.log(`${field}:`, {
              type: typeof payload[field],
              value: payload[field],
              isObject: typeof payload[field] === 'object' && payload[field] !== null
            });
          }
        });

        // Also check any field that might be an array of objects
        if (payload.statusHistory) {
          payload.statusHistory.forEach((item: any, index: number) => {
            console.log(`statusHistory[${index}].changedBy:`, {
              type: typeof item.changedBy,
              value: item.changedBy,
              isObject: typeof item.changedBy === 'object' && item.changedBy !== null
            });
            if (item.overrideBy) {
              console.log(`statusHistory[${index}].overrideBy:`, {
                type: typeof item.overrideBy,
                value: item.overrideBy
              });
            }
          });
        }

        // Check repaymentSchedule and paymentHistory for any user fields
        if (payload.repaymentSchedule) {
          payload.repaymentSchedule.forEach((item: any, index: number) => {
            if (item.createdBy || item.updatedBy) {
              console.log(`repaymentSchedule[${index}] has user fields:`, {
                createdBy: item.createdBy,
                updatedBy: item.updatedBy
              });
            }
          });
        }

        if (payload.paymentHistory) {
          payload.paymentHistory.forEach((item: any, index: number) => {
            if (item.createdBy || item.updatedBy || item.receivedBy) {
              console.log(`paymentHistory[${index}] has user fields:`, {
                createdBy: item.createdBy,
                updatedBy: item.updatedBy,
                receivedBy: item.receivedBy
              });
            }
          });
        }

        console.log('=== END DEBUG ===');
        // ===== END OF DEBUG CODE =====

        if (isDevMode()) {
          console.log('Advance loan update payload', JSON.parse(JSON.stringify(payload)));
        }

        return this.updateAdvanceLoan(
          Number(sourceLoan.id),
          payload
        );
      }),
      map((loan) => this.toLoanApplication(loan))
    );
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
    const repaymentSchedule = (loan.repaymentSchedule || []).map((item, index) =>
      this.toRepaymentScheduleItem(item, index)
    );
    const paymentHistory = (loan.paymentHistory || []).map((item, index) =>
      this.toPaymentRecord(item, index)
    );
    const statusHistory = this.buildStatusHistory(
      loan,
      (loan.statusHistory || []).map((item) => this.toStatusChange(item))
    );
    const employee = loan.employee;
    const requestDate = this.resolveCachedOriginalRequestDate(
      Number(loan.id || 0),
      String(loan.loanCode || loan.id),
      this.normalizeDateValue(loan.requestDate, new Date().toISOString()),
      statusHistory
    );

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
      employeeId: Number(employee?.id || 0),
      fullName: this.getEmployeeFullName(employee),
      department: employee?.department?.name || '',
      amount: Number(loan.amount || 0),
      modeOfPayment: this.fromBackendPaymentMode(loan.modeOfPayment),
      status: this.toLoanStatus(loan.status),
      purpose: loan.purpose || '',
      repaymentTime: Number(loan.repaymentTime || repaymentSchedule.length || 0),
      repaymentAmount: Number(loan.repaymentAmount || repaymentSchedule[0]?.totalAmount || 0),
      acknowledgment: true,
      interestRate: this.deriveInterestRate(loan),
      currentBalance: Number(loan.currentBalance || 0),
      totalPaid: Number(loan.totalPaid || 0),
      totalPrincipalPaid: Number(loan.totalPrincipalPaid || 0),
      totalInterestPaid: Number(loan.totalInterestPaid || 0),
      outstandingPrincipal: Number(loan.outstandingPrincipal || 0),
      statusHistory,
      repaymentSchedule,
      paymentHistory,
      supportingDocuments: []
    };
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
      receivedBy: 'System'
    };
  }

  private toStatusChange(item: AdvanceLoanStatusHistory): StatusChange {
    return {
      id: Number(item.id || 0),
      status: this.toLoanStatus(item.status),
      changedAt: item.changedAt,
      changedBy: this.getUserDisplayName(item.changedBy),
      notes: item.notes || '',
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

    if (normalizedRequestDate) {
      entries.push({
        status: 'PENDING',
        changedAt: normalizedRequestDate,
        changedBy: 'Employee',
        notes: 'Loan application submitted'
      });
    }

    if (normalizedApprovedDate) {
      entries.push({
        status: 'APPROVED',
        changedAt: normalizedApprovedDate,
        changedBy: this.getUserDisplayName(loan.approvedBy),
        notes: currentStatus === 'APPROVED' && adminComment ? adminComment : 'Loan approved'
      });
    }

    if (normalizedDisbursedDate) {
      entries.push({
        status: 'ACTIVE',
        changedAt: normalizedDisbursedDate,
        changedBy: this.getUserDisplayName(loan.disbursedBy),
        notes: 'Loan disbursed'
      });
    }

    if (normalizedCompletedDate) {
      entries.push({
        status: 'COMPLETED',
        changedAt: normalizedCompletedDate,
        changedBy: 'System',
        notes: 'Loan completed'
      });
    }

    if (normalizedRejectedDate) {
      entries.push({
        status: 'REJECTED',
        changedAt: normalizedRejectedDate,
        changedBy: this.getUserDisplayName(loan.rejectedBy),
        notes: currentStatus === 'REJECTED' && adminComment ? adminComment : 'Loan rejected'
      });
    }

    return entries;
  }

  /**
   * Create payload for PUT /advanceLoans/{id}.
   * Audit history actor fields are excluded because the backend does not
   * accept its own response shape for those nested objects on update.
   */
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
    requestDate: this.resolveOriginalRequestDate(application, sourceLoan),
    approvedDate: application.approvedDate || sourceLoan.approvedDate || '',
    //  Send just the ID (Long) for top-level fields
    approvedBy: application.status === 'APPROVED'
      ? this.extractUserId(application.approvedBy) || actingUserId
      : this.extractUserId(sourceLoan.approvedBy),
    disbursedDate: application.disbursedDate || sourceLoan.disbursedDate || '',
    disbursedBy: application.status === 'ACTIVE'
      ? this.extractUserId(application.disbursedBy) || actingUserId
      : this.extractUserId(sourceLoan.disbursedBy),
    completedDate: application.status === 'COMPLETED' ? application.completedDate || sourceLoan.completedDate || '' : sourceLoan.completedDate || '',
    rejectedDate: application.status === 'REJECTED' ? application.rejectedDate || sourceLoan.rejectedDate || '' : sourceLoan.rejectedDate || '',
    rejectedBy: application.status === 'REJECTED'
      ? this.extractUserId(application.rejectedBy) || actingUserId
      : this.extractUserId(sourceLoan.rejectedBy),
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
      dueDate: item.dueDate,
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
      paidAt: item.paidAt,
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

  // Helper method to extract user ID from various formats
  private extractUserId(user: any): number {
    if (user === null || user === undefined) return 0;
    
    // If it's already a number
    if (typeof user === 'number' && !isNaN(user)) return user;
    
    // If it's a string, parse it
    if (typeof user === 'string') {
      const parsed = parseInt(user, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    // If it's an object, try to get id or userId
    if (typeof user === 'object') {
      // Try different ID fields
      const id = user.id ?? user.userId ?? user.ID ?? user.UserId;
      if (id !== undefined) {
        const parsed = parseInt(id, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
    }
    
    return 0;
  }
  private buildUserObject(user: any, fallbackUser?: any): any {
  // If it's already a valid user object, return it as-is
  if (user && typeof user === 'object' && !Array.isArray(user)) {
    // Make sure all fields have the correct types
    return {
      id: Number(user.id || user.userId || 0),
      userId: Number(user.userId || user.id || 0),
      fullname: String(user.fullname || user.fullName || user.name || `User ${user.id || ''}`),
      email: String(user.email || ''),
      username: String(user.username || ''),
      clientType: String(user.clientType || ''),
      gender: String(user.gender || ''),
      accountId: String(user.accountId || ''),
      address: String(user.address || ''),
      city: String(user.city || ''),
      state: String(user.state || ''),
      country: String(user.country || ''),
      phoneNumber: String(user.phoneNumber || user.phone || '')
    };
  }
  
  // Get the user ID
  const userId = this.extractUserId(user);
  
  // If we have a fallback user, use it as template
  if (fallbackUser && typeof fallbackUser === 'object') {
    return {
      id: Number(fallbackUser.id || userId || 0),
      userId: Number(fallbackUser.userId || userId || 0),
      fullname: String(fallbackUser.fullname || fallbackUser.fullName || `User ${userId}`),
      email: String(fallbackUser.email || ''),
      username: String(fallbackUser.username || ''),
      clientType: String(fallbackUser.clientType || ''),
      gender: String(fallbackUser.gender || ''),
      accountId: String(fallbackUser.accountId || ''),
      address: String(fallbackUser.address || ''),
      city: String(fallbackUser.city || ''),
      state: String(fallbackUser.state || ''),
      country: String(fallbackUser.country || ''),
      phoneNumber: String(fallbackUser.phoneNumber || fallbackUser.phone || '')
    };
  }
  
  // Create minimal user object with all fields as correct types
  return {
    id: Number(userId),
    userId: Number(userId),
    fullname: `User ${userId}`,
    email: '',
    username: '',
    clientType: '',
    gender: '',
    accountId: '',
    address: '',
    city: '',
    state: '',
    country: '',
    phoneNumber: ''
  };
}

  private resolveAuditUserId(
    primaryUser: AdvanceLoanUser | number | string | undefined,
    fallbackUserId = 0,
    sourceUser?: AdvanceLoanUser | number
  ): number {
    const primaryUserId = this.extractFlexibleUserId(primaryUser);
    if (primaryUserId > 0) {
      return primaryUserId;
    }

    const sourceUserId = this.extractUserId(sourceUser);
    if (sourceUserId > 0) {
      return sourceUserId;
    }

    return fallbackUserId > 0 ? fallbackUserId : 0;
  }

  private extractFlexibleUserId(user: AdvanceLoanUser | number | string | undefined): number {
    if (typeof user === 'number' && Number.isFinite(user)) {
      return user;
    }

    if (typeof user === 'string') {
      const parsedUserId = Number(String(user).trim());
      return Number.isFinite(parsedUserId) ? parsedUserId : 0;
    }

    return this.extractUserId(user);
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
    if (!user) {
      return 'System';
    }

    if (typeof user === 'number') {
      return user > 0 ? `User ${user}` : 'System';
    }

    return user.fullname || user.username || user.email || 'System';
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
      // Ignore storage write failures and continue with in-memory request dates.
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

  private deriveInterestRate(loan: AdvanceLoan): number {
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

  private normalizeDateValue(value: unknown, fallback = ''): string {
    const rawValue = String(value ?? '').trim();

    if (!rawValue || rawValue.toLowerCase() === 'null' || rawValue.toLowerCase() === 'undefined') {
      return fallback;
    }

    const timestamp = new Date(rawValue).getTime();
    return Number.isFinite(timestamp) ? rawValue : fallback;
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
      }
      return throwError(() => error);
    }

    console.error('Advance loan service error', error);
    return throwError(() => error);
  }
}
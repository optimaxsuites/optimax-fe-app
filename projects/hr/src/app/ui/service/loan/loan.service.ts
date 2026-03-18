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
        return {
          ...application,
          requestDate: this.normalizeDateValue(loan.requestDate, formData.requestDate || new Date().toISOString()),
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

        return this.updateAdvanceLoan(
          Number(sourceLoan.id),
          this.toUpdatePayload(application, sourceLoan)
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
    const statusHistory = (loan.statusHistory || []).map((item) => this.toStatusChange(item));
    const employee = loan.employee;

    return {
      id: Number(loan.id || 0),
      loanCode: String(loan.loanCode || loan.id),
      approvedDate: this.normalizeDateValue(loan.approvedDate) || undefined,
      approvedBy: loan.approvedBy,
      disbursedDate: this.normalizeDateValue(loan.disbursedDate) || undefined,
      disbursedBy: loan.disbursedBy,
      requestDate: this.normalizeDateValue(loan.requestDate, new Date().toISOString()),
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

  /**
   * Create payload for PUT /advanceLoans/{id}
   * Uses IDs (not full objects) as shown in the endpoint documentation
   */
  private toUpdatePayload(application: LoanApplication, sourceLoan: AdvanceLoan): any {
    return {
      id: Number(sourceLoan.id),
      loanCode: sourceLoan.loanCode || application.loanCode || String(application.id),
      employeeId: Number(sourceLoan.employee?.id || application.employeeId || 0),
      amount: application.amount,
      purpose: application.purpose,
      repaymentAmount: application.repaymentAmount,
      repaymentTime: application.repaymentTime,
      modeOfPayment: application.modeOfPayment,
      requestDate: sourceLoan.requestDate || application.requestDate,
      approvedDate: application.approvedDate || sourceLoan.approvedDate || '',
      approvedBy: this.extractUserId(sourceLoan.approvedBy),
      disbursedDate: application.disbursedDate || sourceLoan.disbursedDate || '',
      disbursedBy: this.extractUserId(sourceLoan.disbursedBy),
      completedDate: application.status === 'COMPLETED' ? application.completedDate || sourceLoan.completedDate || '' : sourceLoan.completedDate || '',
      rejectedDate: application.status === 'REJECTED' ? application.rejectedDate || sourceLoan.rejectedDate || '' : sourceLoan.rejectedDate || '',
      rejectedBy: this.extractUserId(sourceLoan.rejectedBy),
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
      statusHistory: (application.statusHistory || []).map((item, index) => ({
        id: this.resolveNumericId(sourceLoan.statusHistory?.[index]?.id),
        status: item.status,
        changedAt: item.changedAt,
        changedBy: this.extractUserId(sourceLoan.statusHistory?.[index]?.changedBy),
        notes: item.notes || '',
        overrideOpen: item.overrideOpen ?? false,
        overrideBy: this.extractUserId(sourceLoan.statusHistory?.[index]?.overrideBy),
        overrideReason: item.overrideReason || sourceLoan.statusHistory?.[index]?.overrideReason || '',
        statusBeforeOverride: item.statusBeforeOverride || sourceLoan.statusHistory?.[index]?.statusBeforeOverride || sourceLoan.statusBeforeOverride || application.status
      })),
      interestRate: application.interestRate
    };
  }

  // Helper method to extract user ID from various formats
  private extractUserId(user: AdvanceLoanUser | number | undefined): number {
    if (!user) return 0;
    if (typeof user === 'number') return user;
    return Number(user.id || user.userId || 0);
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

    const principal = Number(loan.amount || 0);
    const tenureMonths = Number(loan.repaymentTime || 0);
    if (principal <= 0 || tenureMonths <= 0 || !loan.repaymentSchedule?.length) {
      return 0;
    }

    const totalInterest = loan.repaymentSchedule.reduce(
      (sum, item) => sum + Number(item.interestAmount || 0),
      0
    );

    if (totalInterest <= 0) {
      return 0;
    }

    const annualizedRate = ((totalInterest / principal) * 100 * 12) / tenureMonths;
    return Number(annualizedRate.toFixed(2));
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
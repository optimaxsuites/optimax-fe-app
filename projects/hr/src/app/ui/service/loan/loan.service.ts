import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
    return this.http.get<AdvanceLoan[]>(this.standardLoanUrl);
  }

  getAdvanceLoanById(id: number): Observable<AdvanceLoan> {
    return this.http.get<AdvanceLoan>(`${this.standardLoanUrl}/${id}`);
  }

  createAdvanceLoan(payload: any): Observable<AdvanceLoan> {
    return this.http.post<AdvanceLoan>(this.standardLoanUrl, payload);
  }

  updateAdvanceLoan(id: number, payload: any): Observable<AdvanceLoan> {
    return this.http.put<AdvanceLoan>(`${this.standardLoanUrl}/${id}`, payload);
  }

  getAdvanceLoanStats(payload: any): Observable<AdvanceLoanStats> {
    return this.http.post<AdvanceLoanStats>(`${this.standardLoanUrl}/stats`, payload);
  }

  getApplicationByIdFromBackend(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.standardLoanUrl}/${id}`);
  }

  updateApplicationOnBackend(id: number | string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.standardLoanUrl}/${id}`, payload);
  }

  postLoanStats(payload: any): Observable<any> {
    return this.http.post<any>(`${this.standardLoanUrl}/stats`, payload);
  }

  getAllApplicationsFromBackend(): Observable<any[]> {
    return this.http.get<any[]>(this.standardLoanUrl);
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

  createLoanApplication(formData: LoanApplicationFormData, employeeNumericId: number): Observable<LoanApplication> {
    return this.createAdvanceLoan(this.toCreatePayload(formData, employeeNumericId)).pipe(
      map((loan) => this.toLoanApplication(loan))
    );
  }

  saveLoanApplication(application: LoanApplication): Observable<LoanApplication> {
    const identifier = application.backendId ? String(application.backendId) : application.id;

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
      backendId: Number(loan.id),
      loanCode: String(loan.loanCode || loan.id),
      id: String(loan.loanCode || loan.id),
      approvedDate: loan.approvedDate || undefined,
      disbursementDate: loan.disbursedDate || undefined,
      startDate: loan.disbursedDate || undefined,
      endDate: loan.completedDate || loan.rejectedDate || undefined,
      submittedAt: loan.requestDate || undefined,
      adminComment: loan.adminComment || '',
      employeeId: String(employee?.id ?? ''),
      fullName: this.getEmployeeFullName(employee),
      department: employee?.department?.name || '',
      loanAmount: Number(loan.amount || 0),
      paymentMode: this.fromBackendPaymentMode(loan.modeOfPayment),
      status: this.toLoanStatus(loan.status),
      dateSubmitted: loan.requestDate || new Date().toISOString(),
      purpose: loan.purpose || '',
      repaymentPeriod: Number(loan.repaymentTime || repaymentSchedule.length || 0),
      monthlyRepayment: Number(loan.repaymentAmount || repaymentSchedule[0]?.totalPayment || 0),
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
      id: String(item.id || index + 1),
      monthNumber: Number(item.installmentNo || index + 1),
      dueDate: item.dueDate,
      principal: Number(item.principalAmount || 0),
      interest: Number(item.interestAmount || 0),
      totalPayment: Number(item.totalAmount || 0),
      remainingBalance: Number(item.remainingBalance || 0),
      status: this.toRepaymentStatus(item.status),
      paidAmount: Number(item.paidAmount || 0)
    };
  }

  private toPaymentRecord(item: AdvanceLoanPaymentHistory, index: number): PaymentRecord {
    return {
      id: String(item.id || index + 1),
      date: item.paidAt,
      amount: Number(item.totalAmount || 0),
      principalAmount: Number(item.principalAmount || 0),
      interestPaid: Number(item.interestPaid || 0),
      lateFeeAmount: Number(item.lateFeeAmount || 0),
      remainingBalance: Number(item.remainingBalance || 0),
      paymentMethod: item.paymentMethod || 'BANK_TRANSFER',
      referenceNumber: item.referenceNumber || '',
      installmentNo: Number(item.installmentNo || 0),
      notes: item.notes || '',
      receiptNumber: item.receiptNumber || '',
      receivedBy: 'System'
    };
  }

  private toStatusChange(item: AdvanceLoanStatusHistory): StatusChange {
    return {
      id: String(item.id || ''),
      status: this.toLoanStatus(item.status),
      date: item.changedAt,
      changedBy: this.getUserDisplayName(item.changedBy),
      notes: item.notes || '',
      interestRate: Number((item as any).interestRate || 0)
    };
  }

  private toCreatePayload(formData: LoanApplicationFormData, employeeNumericId: number): any {
    return {
      id: 0,
      loanCode: '',
      employeeId: employeeNumericId,
      amount: formData.loanAmount,
      purpose: formData.loanPurpose === 'other' ? formData.otherPurpose || 'Other' : formData.loanPurpose,
      repaymentAmount: formData.monthlyRepaymentAmount,
      repaymentTime: formData.repaymentPeriod,
      modeOfPayment: this.toBackendPaymentMode(formData.paymentMode),
      requestDate: new Date().toISOString(),
      approvedDate: '',
      approvedBy: 0,
      disbursedDate: '',
      disbursedBy: 0,
      completedDate: '',
      rejectedDate: '',
      rejectedBy: 0,
      status: 'PENDING',
      adminComment: '',
      currentBalance: formData.loanAmount,
      totalPaid: 0,
      totalPrincipalPaid: 0,
      totalInterestPaid: 0,
      outstandingPrincipal: formData.loanAmount,
      statusBeforeOverride: 'PENDING',
      repaymentSchedule: [],
      paymentHistory: [],
      statusHistory: []
    };
  }

  private toUpdatePayload(application: LoanApplication, sourceLoan: AdvanceLoan): any {
    return {
      id: Number(sourceLoan.id),
      loanCode: sourceLoan.loanCode || application.loanCode || application.id,
      employeeId: Number(sourceLoan.employee?.id || this.parseNumericId(application.employeeId) || 0),
      amount: application.loanAmount,
      purpose: application.purpose,
      repaymentAmount: application.monthlyRepayment,
      repaymentTime: application.repaymentPeriod,
      modeOfPayment: this.toBackendPaymentMode(application.paymentMode),
      requestDate: sourceLoan.requestDate || application.dateSubmitted,
      approvedDate: application.approvedDate || sourceLoan.approvedDate || '',
      approvedBy: sourceLoan.approvedBy?.id || 0,
      disbursedDate: application.disbursementDate || sourceLoan.disbursedDate || '',
      disbursedBy: sourceLoan.disbursedBy?.id || 0,
      completedDate: application.status === 'COMPLETED' ? application.endDate || sourceLoan.completedDate || '' : sourceLoan.completedDate || '',
      rejectedDate: application.status === 'REJECTED' ? application.endDate || sourceLoan.rejectedDate || '' : sourceLoan.rejectedDate || '',
      rejectedBy: sourceLoan.rejectedBy?.id || 0,
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
        installmentNo: item.monthNumber,
        dueDate: item.dueDate,
        principalAmount: item.principal,
        interestAmount: item.interest,
        totalAmount: item.totalPayment,
        paidAmount: Number(item.paidAmount || 0),
        remainingBalance: item.remainingBalance,
        status: item.status
      })),
      paymentHistory: (application.paymentHistory || []).map((item, index) => ({
        id: this.resolveNumericId(sourceLoan.paymentHistory?.[index]?.id),
        loanId: Number(sourceLoan.id),
        paidAt: item.date,
        principalAmount: Number(item.principalAmount || 0),
        interestPaid: Number(item.interestPaid || 0),
        lateFeeAmount: Number(item.lateFeeAmount || 0),
        totalAmount: item.amount,
        remainingBalance: Number(item.remainingBalance || application.currentBalance || 0),
        paymentMethod: item.paymentMethod,
        referenceNumber: item.referenceNumber || '',
        installmentNo: Number(item.installmentNo || 0),
        notes: item.notes || '',
        receiptNumber: item.receiptNumber || item.id || ''
      })),
      statusHistory: (application.statusHistory || []).map((item, index) => ({
        id: this.resolveNumericId(sourceLoan.statusHistory?.[index]?.id),
        status: item.status,
        changedAt: item.date,
        changedBy: this.resolveNumericId(sourceLoan.statusHistory?.[index]?.changedBy),
        notes: item.notes || '',
        overrideOpen: false,
        overrideBy: this.resolveNumericId(sourceLoan.statusHistory?.[index]?.overrideBy),
        overrideReason: sourceLoan.statusHistory?.[index]?.overrideReason || '',
        statusBeforeOverride: sourceLoan.statusHistory?.[index]?.statusBeforeOverride || sourceLoan.statusBeforeOverride || application.status
      })),
      interestRate: application.interestRate
    };
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
      .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())[0];
    return latestHistory?.notes || '';
  }

  private toBackendPaymentMode(paymentMode?: string): 'MONTHLY' | 'ONE_OFF' {
    return paymentMode === 'one_off' ? 'ONE_OFF' : 'MONTHLY';
  }

  private fromBackendPaymentMode(paymentMode?: string): 'monthly' | 'one_off' {
    return String(paymentMode || '').toUpperCase() === 'ONE_OFF' ? 'one_off' : 'monthly';
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
}
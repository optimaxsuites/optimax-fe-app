// loan-approval.service.ts
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { LoanApplication, RepaymentScheduleItem, StatusChange, LoanStatus, LoanStatusUpdate } from './loan.types';
import { LoanApplicationService } from './loan-application.service';
import { AdvanceInterestAgreementService } from './loan-interest-agreement.service';
import { LoanPurposeService } from './loan-purpose.service';
import {
  normalizeLoanRepaymentStartDate,
  readPersistedLoanLateFeeGracePeriodDays,
  readPersistedLoanLateFeePercentage,
  readPersistedLoanRepaymentDay,
  readPersistedLoanRepaymentStartDate,
  persistLoanInterestRate,
  persistLoanLateFeePercentage,
  persistLoanLateFeeGracePeriodDays,
  persistLoanRepaymentDay,
  persistLoanRepaymentStartDate,
  persistLoanStatusActorName,
  persistLoanStatusChangedAt,
  persistLoanStatusNote
} from './loan-display.util';

@Injectable({
  providedIn: 'root'
})
export class LoanApprovalService {
  constructor(
    private loanApplicationService: LoanApplicationService,
    private interestAgreementService: AdvanceInterestAgreementService,
    private loanPurposeService: LoanPurposeService
  ) {}

  updateApplicationStatus(
    loanId: string | number,
    statusOrUpdate: LoanStatus | LoanStatusUpdate
  ): Observable<LoanApplication> {
    return this.loanApplicationService.getApplicationById(String(loanId)).pipe(
      switchMap((application) => {
        if (!application) {
          return throwError(() => new Error('Application not found'));
        }

        const workingApplication: LoanApplication = {
          ...application,
          repaymentSchedule: [...(application.repaymentSchedule || [])],
          paymentHistory: [...(application.paymentHistory || [])],
          statusHistory: [...(application.statusHistory || [])],
          gracePeriodRequests: [...(application.gracePeriodRequests || [])]
        };

        // Get status as string and ensure it's uppercase, then cast to LoanStatus
        const rawStatus = typeof statusOrUpdate === 'string' ? statusOrUpdate : statusOrUpdate.status;
        const status = rawStatus.toUpperCase() as LoanStatus;
        
        const notes = typeof statusOrUpdate === 'string' ? undefined : statusOrUpdate.notes;
        const actingUserId = this.getCurrentUserId();
        const changedAt = typeof statusOrUpdate === 'string'
          ? new Date().toISOString()
          : this.toLoanDateTime(statusOrUpdate.changedAt) || new Date().toISOString();
        const interestRate = typeof statusOrUpdate === 'string' ? undefined : statusOrUpdate.interestRate;
        const lateFeePercentage = Number((statusOrUpdate as any).lateFeePercentage);
        const lateFeeGracePeriodDays = Number((statusOrUpdate as any).lateFeeGracePeriodDays);
        const repaymentStartDate = normalizeLoanRepaymentStartDate((statusOrUpdate as any).repaymentStartDate);
        const repaymentDay = Number((statusOrUpdate as any).repaymentDay);
        const disbursementInitiatedAt = this.toLoanDateTime((statusOrUpdate as any).disbursementInitiatedAt);
        const disbursementInitiatedBy = (statusOrUpdate as any).disbursementInitiatedBy;
        const disbursementInstructionReference = String((statusOrUpdate as any).disbursementInstructionReference || '').trim();
        const overrideOpen = typeof statusOrUpdate === 'string' ? undefined : (statusOrUpdate as any).overrideOpen;
        const overrideReason = typeof statusOrUpdate === 'string' ? undefined : String((statusOrUpdate as any).overrideReason || '').trim();
        const statusBeforeOverride = typeof statusOrUpdate === 'string'
          ? undefined
          : ((statusOrUpdate as any).statusBeforeOverride as LoanStatus | undefined);
        const previousStatus = application.status;
        
        if (interestRate !== undefined && Number.isFinite(interestRate)) {
          workingApplication.interestRate = Number(interestRate.toFixed(2));
          persistLoanInterestRate(workingApplication, workingApplication.interestRate);
        }

        if (Number.isFinite(lateFeePercentage) && lateFeePercentage >= 0) {
          workingApplication.lateFeePercentage = Number(lateFeePercentage.toFixed(2));
          persistLoanLateFeePercentage(workingApplication, workingApplication.lateFeePercentage);
        }

        if (Number.isFinite(lateFeeGracePeriodDays) && lateFeeGracePeriodDays >= 0) {
          workingApplication.lateFeeGracePeriodDays = Math.round(lateFeeGracePeriodDays);
          persistLoanLateFeeGracePeriodDays(workingApplication, workingApplication.lateFeeGracePeriodDays);
        }
        
        workingApplication.status = status;
        workingApplication.adminComment = notes || workingApplication.adminComment || '';
        if (overrideReason) {
          workingApplication.statusBeforeOverride = statusBeforeOverride || previousStatus;
        }

        if (notes?.trim()) {
          persistLoanStatusNote(workingApplication, status, notes);
        }
        persistLoanStatusChangedAt(workingApplication, status, changedAt);

        if (repaymentStartDate) {
          workingApplication.repaymentStartDate = repaymentStartDate;
          persistLoanRepaymentStartDate(workingApplication, repaymentStartDate);
        }
        if (Number.isFinite(repaymentDay) && repaymentDay > 0) {
          workingApplication.repaymentDay = repaymentDay;
          persistLoanRepaymentDay(workingApplication, repaymentDay);
        }

        const resolvedStatusBeforeOverride = statusBeforeOverride 
          ? statusBeforeOverride.toUpperCase() as LoanStatus 
          : previousStatus;
        
        const nextStatusHistoryEntry: StatusChange = {
          status: status,
          changedAt,
          changedBy: actingUserId,
          notes: notes || workingApplication.adminComment || '',
          overrideOpen: typeof overrideOpen === 'boolean' ? overrideOpen : undefined,
          overrideReason: overrideReason || undefined,
          statusBeforeOverride: resolvedStatusBeforeOverride,
          interestRate: interestRate !== undefined && Number.isFinite(interestRate)
            ? Number(interestRate.toFixed(2))
            : undefined
        };

        switch (status) {
          // removed AWAITING_INTEREST_ACCEPTANCE
          case 'APPROVED':
            workingApplication.approvedDate = changedAt;
            workingApplication.approvedBy = actingUserId;
            persistLoanStatusActorName(workingApplication, 'APPROVED', actingUserId);
            this.ensureApprovalTerms(workingApplication);
            this.recalculateApprovalTerms(workingApplication);
            break;
          case 'ACTIVE':
            workingApplication.disbursedDate = changedAt;
            workingApplication.disbursedBy = actingUserId;
            persistLoanStatusActorName(workingApplication, 'ACTIVE', actingUserId);
            if (!workingApplication.repaymentSchedule?.length && workingApplication.repaymentStartDate && workingApplication.repaymentDay) {
              workingApplication.repaymentSchedule = this.generateRepaymentScheduleWithStartDate(
                workingApplication.amount,
                workingApplication.repaymentTime,
                Number(workingApplication.interestRate || 0),
                workingApplication.modeOfPayment,
                new Date(workingApplication.repaymentStartDate),
                workingApplication.repaymentDay
              );
            } else if (!workingApplication.repaymentSchedule?.length) {
              workingApplication.repaymentSchedule = this.generateRepaymentSchedule(
                workingApplication.amount,
                workingApplication.repaymentTime,
                Number(workingApplication.interestRate || 0),
                workingApplication.modeOfPayment
              );
            }
            workingApplication.repaymentAmount = workingApplication.repaymentSchedule.length > 0
              ? workingApplication.repaymentSchedule[0].totalAmount
              : 0;
            workingApplication.totalPaid = workingApplication.paymentHistory.reduce((sum, payment) => sum + payment.totalAmount, 0);
            workingApplication.totalInterestPaid = workingApplication.paymentHistory.reduce(
              (sum, payment) => sum + Number(payment.interestPaid || 0),
              0
            );
            workingApplication.totalPrincipalPaid = workingApplication.paymentHistory.reduce(
              (sum, payment) => sum + Number(payment.principalAmount || 0),
              0
            );
            {
              const totalRepayable = workingApplication.repaymentSchedule.reduce((sum, item) => sum + item.totalAmount, 0);
              workingApplication.currentBalance = Math.max(totalRepayable - workingApplication.totalPaid, 0);
              workingApplication.outstandingPrincipal = Math.max(
                workingApplication.amount - Number(workingApplication.totalPrincipalPaid || 0),
                0
              );
            }
            break;
          case 'READY_FOR_DISBURSEMENT':
            workingApplication.disbursementInitiatedAt = disbursementInitiatedAt || workingApplication.disbursementInitiatedAt || changedAt;
            workingApplication.disbursementInitiatedBy = disbursementInitiatedBy || workingApplication.disbursementInitiatedBy || actingUserId;
            workingApplication.disbursementInstructionReference = disbursementInstructionReference || workingApplication.disbursementInstructionReference;
            persistLoanStatusActorName(workingApplication, 'READY_FOR_DISBURSEMENT', actingUserId);
            break;
          case 'COMPLETED':
            workingApplication.completedDate = changedAt;
            workingApplication.currentBalance = 0;
            workingApplication.outstandingPrincipal = 0;
            break;
          case 'REJECTED':
            workingApplication.rejectedDate = changedAt;
            workingApplication.rejectedBy = actingUserId;
            persistLoanStatusActorName(workingApplication, 'REJECTED', actingUserId);
            break;
          case 'PENDING':
            break;
        }

        workingApplication.statusHistory = [
          ...(workingApplication.statusHistory || []).filter((entry) =>
            !(entry.status === nextStatusHistoryEntry.status && entry.changedAt === nextStatusHistoryEntry.changedAt)
          ),
          nextStatusHistoryEntry
        ].sort((left, right) => new Date(left.changedAt).getTime() - new Date(right.changedAt).getTime());

        return this.loanApplicationService.saveApplication(workingApplication, previousStatus).pipe(
          switchMap((savedApp) => {
            console.log('Status updated successfully to:', savedApp.status);
            return this.loanApplicationService.getApplicationById(String(loanId)).pipe(
              map((refreshedApp) => refreshedApp || savedApp)
            );
          })
        );
      })
    );
  }

  private getCurrentUserId(): number {
    const storedUserId = String(sessionStorage.getItem('userid') || localStorage.getItem('userid') || '').trim();
    const parsedUserId = Number(storedUserId);
    return Number.isFinite(parsedUserId) ? parsedUserId : 0;
  }

  private toLoanDateTime(value: string | undefined): string {
    const rawValue = String(value || '').trim();
    if (!rawValue) return '';
    return /^\d{4}-\d{2}-\d{2}$/.test(rawValue) ? `${rawValue}T00:00:00` : rawValue;
  }

  private recalculateApprovalTerms(application: LoanApplication): void {
    const hasRecordedPayments = (application.paymentHistory || []).length > 0 || Number(application.totalPaid || 0) > 0;
    if (hasRecordedPayments) return;

    const normalizedRepaymentStartDate = normalizeLoanRepaymentStartDate(application.repaymentStartDate);

    application.repaymentSchedule = normalizedRepaymentStartDate
      ? this.generateRepaymentScheduleWithStartDate(
          application.amount,
          application.repaymentTime,
          Number(application.interestRate || 0),
          application.modeOfPayment,
          new Date(normalizedRepaymentStartDate),
          application.repaymentDay
        )
      : this.generateRepaymentSchedule(
          application.amount,
          application.repaymentTime,
          Number(application.interestRate || 0),
          application.modeOfPayment
        );

    application.repaymentAmount = application.repaymentSchedule.length > 0
      ? application.repaymentSchedule[0].totalAmount
      : 0;

    const totalRepayable = application.repaymentSchedule.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
    const totalInterest = application.repaymentSchedule.reduce((sum, item) => sum + Number(item.interestAmount || 0), 0);
    application.currentBalance = Number(Math.max(totalRepayable - Number(application.totalPaid || 0), 0).toFixed(2));
    application.outstandingPrincipal = Number(Math.max(application.amount - Number(application.totalPrincipalPaid || 0), 0).toFixed(2));
    application.outstandingInterest = Number(Math.max(totalInterest - Number(application.totalInterestPaid || 0), 0).toFixed(2));
    application.outstandingBalance = Number(application.currentBalance.toFixed(2));
  }

  private ensureApprovalTerms(application: LoanApplication): void {
    const persistedRepaymentStartDate = readPersistedLoanRepaymentStartDate(application);
    const firstInstallmentDueDate = normalizeLoanRepaymentStartDate(application.repaymentSchedule?.[0]?.dueDate);
    const resolvedRepaymentStartDate = normalizeLoanRepaymentStartDate(
      application.repaymentStartDate || persistedRepaymentStartDate || firstInstallmentDueDate
    );

    if (resolvedRepaymentStartDate) {
      application.repaymentStartDate = resolvedRepaymentStartDate;
      persistLoanRepaymentStartDate(application, resolvedRepaymentStartDate);
    }

    const firstInstallmentDay = firstInstallmentDueDate ? new Date(firstInstallmentDueDate).getDate() : 0;
    const persistedRepaymentDay = readPersistedLoanRepaymentDay(application);
    const resolvedRepaymentDay = Number(application.repaymentDay || persistedRepaymentDay || firstInstallmentDay || 0);

    if (Number.isFinite(resolvedRepaymentDay) && resolvedRepaymentDay > 0) {
      application.repaymentDay = resolvedRepaymentDay;
      persistLoanRepaymentDay(application, resolvedRepaymentDay);
    }

    const persistedLateFeePercentage = readPersistedLoanLateFeePercentage(application);
    const resolvedLateFeePercentage = Number(application.lateFeePercentage || persistedLateFeePercentage || 2);
    if (Number.isFinite(resolvedLateFeePercentage) && resolvedLateFeePercentage >= 0) {
      application.lateFeePercentage = Number(resolvedLateFeePercentage.toFixed(2));
      persistLoanLateFeePercentage(application, application.lateFeePercentage);
    }

    const persistedLateFeeGracePeriodDays = readPersistedLoanLateFeeGracePeriodDays(application);
    const resolvedLateFeeGracePeriodDays = Number(application.lateFeeGracePeriodDays || persistedLateFeeGracePeriodDays || 15);
    if (Number.isFinite(resolvedLateFeeGracePeriodDays) && resolvedLateFeeGracePeriodDays >= 0) {
      application.lateFeeGracePeriodDays = Math.round(resolvedLateFeeGracePeriodDays);
      persistLoanLateFeeGracePeriodDays(application, application.lateFeeGracePeriodDays);
    }
  }

  approveLoan(loanId: string | number, notes?: string, interestRate?: number, repaymentStartDate?: string, repaymentDay?: number, lateFeePercentage?: number, lateFeeGracePeriodDays?: number): Observable<LoanApplication> {
    // Fetch the application and then the purpose to check for default interest
    // Always approve directly, no more AWAITING_INTEREST_ACCEPTANCE
    return this.loanApplicationService.getApplicationById(String(loanId)).pipe(
      switchMap((application) => {
        if (!application) throw new Error('Application not found');
        const purposeCode = application.purposeCode || application.purpose;
        return this.loanPurposeService.getPurposeByCode(purposeCode).pipe(
          switchMap((purpose) => {
            const approvalNotes = `Loan auto-approved with default interest rate of ${purpose?.defaultInterestRate ?? interestRate}%.`;
            const interestToSet = purpose?.defaultInterestRate ?? interestRate;
            return this.updateApplicationStatus(loanId, {
              status: 'APPROVED',
              notes: approvalNotes,
              changedAt: new Date().toISOString(),
              interestRate: interestToSet,
              lateFeePercentage: lateFeePercentage,
              lateFeeGracePeriodDays: lateFeeGracePeriodDays,
              repaymentStartDate: repaymentStartDate,
              repaymentDay: repaymentDay
            } as any);
          })
        );
      })
    );
  }

  rejectLoan(loanId: string | number, notes: string): Observable<LoanApplication> {
    return this.updateApplicationStatus(loanId, {
      status: 'REJECTED' as LoanStatus,
      notes: notes || 'Loan rejected',
      changedAt: new Date().toISOString()
    });
  }

  acceptInterestRate(loanId: string | number, acceptedRate: number): Observable<LoanApplication> {
    console.log('Employee accepting interest rate - setting status to APPROVED');
    
    return this.updateApplicationStatus(loanId, {
      status: 'APPROVED' as LoanStatus,
      notes: `Employee accepted interest rate of ${acceptedRate}%`,
      changedAt: new Date().toISOString(),
      interestRate: acceptedRate
    } as any).pipe(
      switchMap((loan) => {
        return this.interestAgreementService.getAgreementByLoanId(Number(loanId)).pipe(
          switchMap((agreement: any) => {
            if (agreement && agreement.id) {
              return this.interestAgreementService.updateAgreement(agreement.id, {
                loanId: agreement.loanId,
                employeeId: agreement.employeeId,
                proposedInterestRate: agreement.proposedInterestRate,
                agreedInterestRate: acceptedRate,
                status: 'ACCEPTED', // Fix: use ACCEPTED to match AdvanceInterestAgreement type
                agreedAt: new Date().toISOString(),
                agreementMethod: agreement.agreementMethod || 'DASHBOARD',
                ipAddress: agreement.ipAddress || '0.0.0.0',
                notes: agreement.notes
              }).pipe(
                map(() => loan),
                catchError((error) => {
                  console.error('Interest agreement acceptance update failed after loan approval:', error);
                  return of(loan);
                })
              );
            }
            return of(loan);
          }),
          catchError((error) => {
            console.error('Interest agreement lookup failed after loan approval:', error);
            return of(loan);
          })
        );
      })
    );
  }

  rejectInterestRate(loanId: string | number, reason: string): Observable<LoanApplication> {
    // removed AWAITING_INTEREST_ACCEPTANCE logic
    
    return this.updateApplicationStatus(loanId, {
      status: 'REJECTED',
      notes: `Employee rejected proposed interest rate. Reason: ${reason}. Admin review required before resubmission.`,
      changedAt: new Date().toISOString()
    }).pipe(
      switchMap((loan) => {
        return this.interestAgreementService.getAgreementByLoanId(Number(loanId)).pipe(
          switchMap((agreement: any) => {
            if (agreement && agreement.id) {
              if (agreement.status === 'DECLINED') {
                return of(loan);
              }

              return this.interestAgreementService.updateAgreement(agreement.id, {
                loanId: agreement.loanId,
                employeeId: agreement.employeeId,
                proposedInterestRate: agreement.proposedInterestRate,
                agreedInterestRate: agreement.agreedInterestRate,
                status: 'DECLINED',
                agreementMethod: agreement.agreementMethod || 'DASHBOARD',
                ipAddress: agreement.ipAddress || '0.0.0.0',
                notes: reason || 'Interest rate declined by employee'
              }).pipe(
                map(() => loan),
                catchError((error) => {
                  console.error('Interest agreement rejection update failed after loan status update:', error);
                  return of(loan);
                })
              );
            }
            return of(loan);
          }),
          catchError((error) => {
            console.error('Interest agreement lookup failed after loan rejection feedback:', error);
            return of(loan);
          })
        );
      })
    );
  }

  overrideLoanStatus(
    loanId: string | number,
    nextStatus: Extract<LoanStatus, 'ACTIVE' | 'PAUSED'>,
    reason: string
  ): Observable<LoanApplication> {
    return this.loanApplicationService.getApplicationById(String(loanId)).pipe(
      switchMap((application) => {
        if (!application) {
          return throwError(() => new Error('Application not found'));
        }

        const previousStatus = application.status;
        const displayStatus = (status: LoanStatus) => status.replace(/_/g, ' ');

        return this.updateApplicationStatus(loanId, {
          status: nextStatus,
          changedAt: new Date().toISOString(),
          notes: `Admin override changed loan status from ${displayStatus(previousStatus)} to ${displayStatus(nextStatus)}. Reason: ${reason}`,
          overrideOpen: nextStatus !== 'ACTIVE',
          overrideReason: reason,
          statusBeforeOverride: previousStatus,
          repaymentStartDate: application.repaymentStartDate,
          repaymentDay: application.repaymentDay
        } as any);
      })
    );
  }

  getPendingApplications(): Observable<LoanApplication[]> {
    return this.loanApplicationService.getAllApplications().pipe(
      switchMap((applications) => of(applications.filter((application) => application.status === 'PENDING')))
    );
  }

  determineInterestRate(loan: Pick<LoanApplication, 'modeOfPayment' | 'repaymentTime'>): number {
    if (loan.modeOfPayment === 'ONE_OFF') return 5;
    const tenureMonths = loan.repaymentTime || 0;
    if (tenureMonths <= 3) return 4.5;
    if (tenureMonths <= 6) return 6;
    if (tenureMonths <= 12) return 8.5;
    return 10.5;
  }

  calculateRepaymentBreakdown(
    amount: number,
    months: number,
    interestRate: number,
    modeOfPayment?: 'MONTHLY' | 'ONE_OFF'
  ): { repaymentAmount: number; totalRepayment: number; totalInterest: number } {
    if (modeOfPayment === 'ONE_OFF') {
      const totalInterest = amount * (interestRate / 100);
      const totalRepayment = amount + totalInterest;
      return {
        repaymentAmount: Number(totalRepayment.toFixed(2)),
        totalRepayment: Number(totalRepayment.toFixed(2)),
        totalInterest: Number(totalInterest.toFixed(2))
      };
    }

    if (!months || months <= 0) {
      return { repaymentAmount: 0, totalRepayment: 0, totalInterest: 0 };
    }

    const monthlyInterestRate = interestRate > 0 ? interestRate / 100 / 12 : 0;
    const monthlyPayment = monthlyInterestRate > 0
      ? amount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, months)) / (Math.pow(1 + monthlyInterestRate, months) - 1)
      : amount / months;

    const totalRepayment = monthlyPayment * months;
    const totalInterest = totalRepayment - amount;

    return {
      repaymentAmount: Number(monthlyPayment.toFixed(2)),
      totalRepayment: Number(totalRepayment.toFixed(2)),
      totalInterest: Number(totalInterest.toFixed(2))
    };
  }

  private generateRepaymentSchedule(
    amount: number,
    months: number,
    interestRate: number,
    modeOfPayment?: 'MONTHLY' | 'ONE_OFF'
  ): RepaymentScheduleItem[] {
    if (modeOfPayment === 'ONE_OFF') {
      const oneOffInterest = amount * (interestRate / 100);
      const oneOffTotal = amount + oneOffInterest;
      const oneOffDueDate = new Date();
      oneOffDueDate.setMonth(oneOffDueDate.getMonth() + 1);
      oneOffDueDate.setDate(15);

      return [{
        installmentNo: 1,
        dueDate: oneOffDueDate.toISOString().split('T')[0],
        principalAmount: parseFloat(amount.toFixed(2)),
        interestAmount: parseFloat(oneOffInterest.toFixed(2)),
        totalAmount: parseFloat(oneOffTotal.toFixed(2)),
        paidAmount: 0,
        remainingBalance: 0,
        status: 'PENDING'
      }];
    }

    if (!months || months <= 0) return [];

    const schedule: RepaymentScheduleItem[] = [];
    const monthlyInterestRate = interestRate > 0 ? interestRate / 100 / 12 : 0;

    const monthlyPayment = monthlyInterestRate > 0
      ? amount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, months)) / (Math.pow(1 + monthlyInterestRate, months) - 1)
      : amount / months;

    let remainingBalance = amount;

    for (let month = 1; month <= months; month++) {
      const interest = monthlyInterestRate > 0 ? remainingBalance * monthlyInterestRate : 0;
      const principal = monthlyPayment - interest;
      remainingBalance -= principal;

      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + month);
      dueDate.setDate(15);

      schedule.push({
        installmentNo: month,
        dueDate: dueDate.toISOString().split('T')[0],
        principalAmount: parseFloat(principal.toFixed(2)),
        interestAmount: parseFloat(interest.toFixed(2)),
        totalAmount: parseFloat(monthlyPayment.toFixed(2)),
        paidAmount: 0,
        remainingBalance: parseFloat(Math.max(remainingBalance, 0).toFixed(2)),
        status: 'PENDING'
      });
    }

    return schedule;
  }

  private generateRepaymentScheduleWithStartDate(
    amount: number,
    months: number,
    interestRate: number,
    modeOfPayment?: 'MONTHLY' | 'ONE_OFF',
    startDate?: Date,
    repaymentDay?: number
  ): RepaymentScheduleItem[] {
    if (modeOfPayment === 'ONE_OFF') {
      const oneOffInterest = amount * (interestRate / 100);
      const oneOffTotal = amount + oneOffInterest;
      const oneOffDueDate = startDate ? new Date(startDate) : new Date();
      const oneOffRepaymentDay = repaymentDay || oneOffDueDate.getDate();
      const maxDay = new Date(oneOffDueDate.getFullYear(), oneOffDueDate.getMonth() + 1, 0).getDate();
      oneOffDueDate.setDate(Math.min(oneOffRepaymentDay, maxDay));
      
      return [{
        installmentNo: 1,
        dueDate: oneOffDueDate.toISOString().split('T')[0],
        principalAmount: parseFloat(amount.toFixed(2)),
        interestAmount: parseFloat(oneOffInterest.toFixed(2)),
        totalAmount: parseFloat(oneOffTotal.toFixed(2)),
        paidAmount: 0,
        remainingBalance: 0,
        status: 'PENDING'
      }];
    }

    if (!months || months <= 0) return [];

    const schedule: RepaymentScheduleItem[] = [];
    const monthlyInterestRate = interestRate > 0 ? interestRate / 100 / 12 : 0;

    const monthlyPayment = monthlyInterestRate > 0
      ? amount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, months)) / (Math.pow(1 + monthlyInterestRate, months) - 1)
      : amount / months;

    let remainingBalance = amount;
    const baseDate = startDate ? new Date(startDate) : new Date();
    const dayOfMonth = repaymentDay || 15;

    for (let month = 0; month < months; month++) {
      const interest = monthlyInterestRate > 0 ? remainingBalance * monthlyInterestRate : 0;
      const principal = monthlyPayment - interest;
      remainingBalance -= principal;

      const dueDate = new Date(baseDate);
      dueDate.setMonth(baseDate.getMonth() + month);
      
      const maxDay = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
      dueDate.setDate(Math.min(dayOfMonth, maxDay));

      schedule.push({
        installmentNo: month + 1,
        dueDate: dueDate.toISOString().split('T')[0],
        principalAmount: parseFloat(principal.toFixed(2)),
        interestAmount: parseFloat(interest.toFixed(2)),
        totalAmount: parseFloat(monthlyPayment.toFixed(2)),
        paidAmount: 0,
        remainingBalance: parseFloat(Math.max(remainingBalance, 0).toFixed(2)),
        status: 'PENDING'
      });
    }

    return schedule;
  }
}
// loan-approval.service.ts
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { LoanApplication, RepaymentScheduleItem, StatusChange, LoanStatus } from './loan.types';
import { LoanApplicationService } from './loan-application.service';
import { AdvanceInterestAgreementService } from './loan-interest-agreement.service';
import { normalizeLoanRepaymentStartDate, persistLoanInterestRate, persistLoanStatusActorName, persistLoanStatusNote } from './loan-display.util';

@Injectable({
  providedIn: 'root'
})
export class LoanApprovalService {
  constructor(
    private loanApplicationService: LoanApplicationService,
    private interestAgreementService: AdvanceInterestAgreementService
  ) {}

  updateApplicationStatus(
    loanId: string | number,
    statusOrUpdate: LoanStatus | StatusChange
  ): Observable<LoanApplication> {
    return this.loanApplicationService.getApplicationById(String(loanId)).pipe(
      switchMap((application) => {
        if (!application) {
          return throwError(() => new Error('Application not found'));
        }

        const status = typeof statusOrUpdate === 'string' ? statusOrUpdate : statusOrUpdate.status;
        const notes = typeof statusOrUpdate === 'string' ? undefined : statusOrUpdate.notes;
        const actingUserId = this.getCurrentUserId();
        const changedAt = typeof statusOrUpdate === 'string'
          ? new Date().toISOString()
          : this.toLoanDateTime(statusOrUpdate.changedAt) || new Date().toISOString();
        const interestRate = typeof statusOrUpdate === 'string' ? undefined : statusOrUpdate.interestRate;
        const repaymentStartDate = normalizeLoanRepaymentStartDate((statusOrUpdate as any).repaymentStartDate);
        const repaymentDay = Number((statusOrUpdate as any).repaymentDay);
        
        if (interestRate !== undefined && Number.isFinite(interestRate)) {
          application.interestRate = Number(interestRate.toFixed(2));
          persistLoanInterestRate(application, application.interestRate);
        }
        
        application.status = status;
        application.adminComment = notes || application.adminComment || '';

        if (notes?.trim()) {
          persistLoanStatusNote(application, status, notes);
        }

        if (repaymentStartDate) {
          application.repaymentStartDate = repaymentStartDate;
        }
        if (Number.isFinite(repaymentDay) && repaymentDay > 0) {
          application.repaymentDay = repaymentDay;
        }

        switch (status) {
          case 'AWAITING_INTEREST_ACCEPTANCE':
            break;
          case 'APPROVED':
            application.approvedDate = changedAt;
            application.approvedBy = actingUserId;
            persistLoanStatusActorName(application, 'APPROVED', actingUserId);
            this.recalculateApprovalTerms(application);
            break;
          case 'ACTIVE':
            application.disbursedDate = changedAt;
            application.disbursedBy = actingUserId;
            persistLoanStatusActorName(application, 'ACTIVE', actingUserId);
            if (!application.repaymentSchedule?.length && application.repaymentStartDate && application.repaymentDay) {
              application.repaymentSchedule = this.generateRepaymentScheduleWithStartDate(
                application.amount,
                application.repaymentTime,
                Number(application.interestRate || 0),
                application.modeOfPayment,
                new Date(application.repaymentStartDate),
                application.repaymentDay
              );
            } else if (!application.repaymentSchedule?.length) {
              application.repaymentSchedule = this.generateRepaymentSchedule(
                application.amount,
                application.repaymentTime,
                Number(application.interestRate || 0),
                application.modeOfPayment
              );
            }
            application.repaymentAmount = application.repaymentSchedule.length > 0
              ? application.repaymentSchedule[0].totalAmount
              : 0;
            application.totalPaid = application.paymentHistory.reduce((sum, payment) => sum + payment.totalAmount, 0);
            application.totalInterestPaid = application.paymentHistory.reduce(
              (sum, payment) => sum + Number(payment.interestPaid || 0),
              0
            );
            application.totalPrincipalPaid = application.paymentHistory.reduce(
              (sum, payment) => sum + Number(payment.principalAmount || 0),
              0
            );
            {
              const totalRepayable = application.repaymentSchedule.reduce((sum, item) => sum + item.totalAmount, 0);
              application.currentBalance = Math.max(totalRepayable - application.totalPaid, 0);
              application.outstandingPrincipal = Math.max(
                application.amount - Number(application.totalPrincipalPaid || 0),
                0
              );
            }
            break;
          case 'COMPLETED':
            application.completedDate = changedAt;
            application.currentBalance = 0;
            application.outstandingPrincipal = 0;
            break;
          case 'REJECTED':
            application.rejectedDate = changedAt;
            application.rejectedBy = actingUserId;
            persistLoanStatusActorName(application, 'REJECTED', actingUserId);
            break;
          case 'PENDING':
            break;
        }

        return this.loanApplicationService.saveApplication(application).pipe(
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
    application.currentBalance = Number(Math.max(totalRepayable - Number(application.totalPaid || 0), 0).toFixed(2));
    application.outstandingPrincipal = Number(Math.max(application.amount - Number(application.totalPrincipalPaid || 0), 0).toFixed(2));
  }

  approveLoan(loanId: string | number, notes?: string, interestRate?: number, repaymentStartDate?: string, repaymentDay?: number): Observable<LoanApplication> {
    console.log('Approving loan - setting status to AWAITING_INTEREST_ACCEPTANCE');
    
    return this.updateApplicationStatus(loanId, {
      status: 'AWAITING_INTEREST_ACCEPTANCE',
      notes: notes || `Proposed interest rate: ${interestRate}%. Awaiting employee acceptance.`,
      changedAt: new Date().toISOString(),
      interestRate: interestRate,
      repaymentStartDate: repaymentStartDate,
      repaymentDay: repaymentDay
    } as any).pipe(
      switchMap((loan) => {
        if (loan && interestRate) {
          return this.interestAgreementService.createAgreement({
            loanId: loan.id,
            employeeId: loan.employeeId,
            proposedInterestRate: interestRate,
            agreementMethod: 'DASHBOARD',
            notes: notes
          }).pipe(
            map(() => loan)
          );
        }
        return of(loan);
      })
    );
  }

  rejectLoan(loanId: string | number, notes: string): Observable<LoanApplication> {
    return this.updateApplicationStatus(loanId, {
      status: 'REJECTED',
      notes: notes || 'Loan rejected',
      changedAt: new Date().toISOString()
    });
  }

  acceptInterestRate(loanId: string | number, acceptedRate: number): Observable<LoanApplication> {
    console.log('Employee accepting interest rate - setting status to APPROVED');
    
    return this.updateApplicationStatus(loanId, {
      status: 'APPROVED',
      notes: `Employee accepted interest rate of ${acceptedRate}%`,
      changedAt: new Date().toISOString(),
      interestRate: acceptedRate
    } as any).pipe(
      switchMap((loan) => {
        return this.interestAgreementService.getAgreementByLoanId(Number(loanId)).pipe(
          switchMap((agreement: any) => {
            if (agreement && agreement.id) {
              return this.interestAgreementService.acceptAgreement(agreement.id, acceptedRate).pipe(
                map(() => loan)
              );
            }
            return of(loan);
          })
        );
      })
    );
  }

  rejectInterestRate(loanId: string | number, reason: string): Observable<LoanApplication> {
    console.log('Employee rejecting interest rate - setting status back to PENDING');
    
    return this.updateApplicationStatus(loanId, {
      status: 'PENDING',
      notes: `Employee rejected proposed interest rate. Reason: ${reason}`,
      changedAt: new Date().toISOString()
    }).pipe(
      switchMap((loan) => {
        return this.interestAgreementService.getAgreementByLoanId(Number(loanId)).pipe(
          switchMap((agreement: any) => {
            if (agreement && agreement.id) {
              return this.interestAgreementService.declineAgreement(agreement.id, reason).pipe(
                map(() => loan)
              );
            }
            return of(loan);
          })
        );
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
// loan-approval.service.ts
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { LoanApplication, RepaymentScheduleItem, StatusChange } from './loan.types';
import { LoanApplicationService } from './loan-application.service';

@Injectable({
  providedIn: 'root'
})
export class LoanApprovalService {
  constructor(private loanApplicationService: LoanApplicationService) {}

  updateApplicationStatus(
    loanId: string | number,
    statusOrUpdate: 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED' | 'PENDING' | StatusChange
  ): Observable<LoanApplication> {
    return this.loanApplicationService.getApplicationById(String(loanId)).pipe(
      switchMap((application) => {
        if (!application) {
          return throwError(() => new Error('Application not found'));
        }

        const oldStatus = application.status;
        const status = typeof statusOrUpdate === 'string' ? statusOrUpdate : statusOrUpdate.status;
        const notes = typeof statusOrUpdate === 'string' ? undefined : statusOrUpdate.notes;
        const actingUserId = this.getCurrentUserId();
        const changedAt = typeof statusOrUpdate === 'string'
          ? new Date().toISOString()
          : statusOrUpdate.changedAt || new Date().toISOString();
        const interestRate = typeof statusOrUpdate === 'string' ? undefined : statusOrUpdate.interestRate;
        
        // Set interest rate if needed
        if (interestRate !== undefined && Number.isFinite(interestRate)) {
          application.interestRate = Number(interestRate.toFixed(2));
        } else if (status === 'APPROVED' && !application.interestRate) {
          application.interestRate = this.determineInterestRate(application);
        }

        // Update the application status
        application.status = status;
        application.adminComment = notes || application.adminComment || '';

        // Update dates based on status
        switch (status) {
          case 'APPROVED':
            application.approvedDate = new Date().toISOString();
            application.approvedBy = actingUserId;
            application.disbursedDate = undefined;
            break;
          case 'ACTIVE':
            application.disbursedDate = new Date().toISOString();
            application.disbursedBy = actingUserId;
            // Generate repayment schedule if needed
            if (!application.repaymentSchedule?.length) {
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
            application.completedDate = new Date().toISOString();
            application.currentBalance = 0;
            application.outstandingPrincipal = 0;
            break;
          case 'REJECTED':
            application.rejectedDate = new Date().toISOString();
            application.rejectedBy = actingUserId;
            break;
        }

        // Save the application (this will send statusHistory: [])
        return this.loanApplicationService.saveApplication(application).pipe(
          // AFTER successful save, refresh the application to get the complete data with history
          switchMap((savedApp) => {
            console.log('Status updated successfully, refreshing data...');
            return this.loanApplicationService.getApplicationById(String(loanId)).pipe(
              map((refreshedApp) => {
                if (!refreshedApp) {
                  return savedApp; // Fallback to saved app if refresh fails
                }
                console.log('Refreshed application with history:', refreshedApp.statusHistory);
                return refreshedApp;
              })
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

  approveLoan(loanId: string | number, notes?: string): Observable<LoanApplication> {
    return this.updateApplicationStatus(loanId, {
      status: 'APPROVED',
      notes: notes || 'Loan approved',
      changedAt: new Date().toISOString()
    });
  }

  rejectLoan(loanId: string | number, notes: string): Observable<LoanApplication> {
    return this.updateApplicationStatus(loanId, {
      status: 'REJECTED',
      notes: notes || 'Loan rejected',
      changedAt: new Date().toISOString()
    });
  }

  getPendingApplications(): Observable<LoanApplication[]> {
    return this.loanApplicationService.getAllApplications().pipe(
      switchMap((applications) => of(applications.filter((application) => application.status === 'PENDING')))
    );
  }

  determineInterestRate(loan: Pick<LoanApplication, 'modeOfPayment' | 'repaymentTime'>): number {
    if (loan.modeOfPayment === 'ONE_OFF') {
      return 5;
    }

    const tenureMonths = loan.repaymentTime || 0;

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
      return {
        repaymentAmount: 0,
        totalRepayment: 0,
        totalInterest: 0
      };
    }

    const monthlyInterestRate = interestRate > 0 ? interestRate / 100 / 12 : 0;
    const monthlyPayment = monthlyInterestRate > 0
      ? amount *
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, months)) /
        (Math.pow(1 + monthlyInterestRate, months) - 1)
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

    if (!months || months <= 0) {
      return [];
    }

    const schedule: RepaymentScheduleItem[] = [];
    const monthlyInterestRate = interestRate > 0 ? interestRate / 100 / 12 : 0;

    const monthlyPayment = monthlyInterestRate > 0
      ? amount *
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, months)) /
        (Math.pow(1 + monthlyInterestRate, months) - 1)
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
}
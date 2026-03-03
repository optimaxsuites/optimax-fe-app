// loan-approval.service.ts
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { LoanApplication, RepaymentScheduleItem, StatusChange } from './loan.types';
import { LoanStorageService } from './loan-storage.service';

@Injectable({
  providedIn: 'root'
})
export class LoanApprovalService {
  
  constructor(private storageService: LoanStorageService) {}

  // Update application status with optional comment
  updateApplicationStatus(
    loanId: string,
    statusOrUpdate: 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED' | 'PENDING' | StatusChange
  ): Observable<LoanApplication> {
    const application = this.storageService.getApplicationById(loanId);
    
    if (!application) {
      throw new Error('Application not found');
    }

    const oldStatus = application.status;
    const status = typeof statusOrUpdate === 'string' ? statusOrUpdate : statusOrUpdate.status;
    const notes = typeof statusOrUpdate === 'string' ? undefined : statusOrUpdate.notes;
    const changedBy = typeof statusOrUpdate === 'string' ? 'Admin' : statusOrUpdate.changedBy || 'Admin';
    const date = typeof statusOrUpdate === 'string' ? new Date().toISOString() : statusOrUpdate.date || new Date().toISOString();
    const interestRate = typeof statusOrUpdate === 'string' ? undefined : statusOrUpdate.interestRate;

    if (interestRate !== undefined && Number.isFinite(interestRate)) {
      application.interestRate = Number(interestRate.toFixed(2));
    }

    // Update application
    application.status = status;
    
    // Add to status history
    application.statusHistory.push({
      status: status,
      date: date,
      changedBy: changedBy,
      notes: notes || `Status changed from ${oldStatus} to ${status}`,
      interestRate: application.interestRate
    });
    
    // Handle special cases
    switch(status) {
      case 'APPROVED':
        application.approvedDate = new Date().toISOString().split('T')[0];
        application.startDate = new Date().toISOString().split('T')[0];
        application.repaymentSchedule = this.generateRepaymentSchedule(
          application.loanAmount,
          application.repaymentPeriod,
          application.interestRate,
          application.paymentMode
        );
        application.monthlyRepayment = application.repaymentSchedule.length > 0
          ? application.repaymentSchedule[0].totalPayment
          : 0;

        application.totalPaid = application.paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
        const totalRepayable = application.repaymentSchedule.reduce((sum, item) => sum + item.totalPayment, 0);
        application.currentBalance = Math.max(totalRepayable - application.totalPaid, 0);
        break;
      case 'ACTIVE':
        if (!application.startDate) {
          application.startDate = new Date().toISOString().split('T')[0];
        }
        break;
      case 'COMPLETED':
        application.endDate = new Date().toISOString().split('T')[0];
        application.currentBalance = 0;
        break;
      case 'REJECTED':
        application.endDate = new Date().toISOString().split('T')[0];
        break;
    }
    
    // Save changes
    this.storageService.updateApplication(application);
    return of({...application});
  }

  // Approve loan (convenience method)
  approveLoan(loanId: string, notes?: string): Observable<LoanApplication> {
    return this.updateApplicationStatus(loanId, {
      status: 'APPROVED',
      notes: notes || 'Loan approved',
      changedBy: 'Admin',
      date: new Date().toISOString()
    });
  }

  // Reject loan (convenience method)
  rejectLoan(loanId: string, notes: string): Observable<LoanApplication> {
    return this.updateApplicationStatus(loanId, {
      status: 'REJECTED',
      notes: notes || 'Loan rejected',
      changedBy: 'Admin',
      date: new Date().toISOString()
    });
  }

  // Get pending applications
  getPendingApplications(): Observable<LoanApplication[]> {
    const all = this.storageService.getAllApplications();
    const pending = all.filter(app => app.status === 'PENDING');
    return of(pending);
  }

  private generateRepaymentSchedule(
    loanAmount: number,
    months: number,
    interestRate: number,
    paymentMode?: 'monthly' | 'one_off'
  ): RepaymentScheduleItem[] {
    if (paymentMode === 'one_off') {
      const oneOffInterest = loanAmount * (interestRate / 100);
      const oneOffTotal = loanAmount + oneOffInterest;

      return [{
        monthNumber: 1,
        dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        principal: parseFloat(loanAmount.toFixed(2)),
        interest: parseFloat(oneOffInterest.toFixed(2)),
        totalPayment: parseFloat(oneOffTotal.toFixed(2)),
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
      ? loanAmount *
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, months)) /
        (Math.pow(1 + monthlyInterestRate, months) - 1)
      : loanAmount / months;

    let remainingBalance = loanAmount;

    for (let month = 1; month <= months; month++) {
      const interest = monthlyInterestRate > 0 ? remainingBalance * monthlyInterestRate : 0;
      const principal = monthlyPayment - interest;
      remainingBalance -= principal;

      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + month);

      schedule.push({
        monthNumber: month,
        dueDate: dueDate.toISOString().split('T')[0],
        principal: parseFloat(principal.toFixed(2)),
        interest: parseFloat(interest.toFixed(2)),
        totalPayment: parseFloat(monthlyPayment.toFixed(2)),
        remainingBalance: parseFloat(Math.max(remainingBalance, 0).toFixed(2)),
        status: 'PENDING'
      });
    }

    return schedule;
  }
}
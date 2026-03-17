// loan-repayment.service.ts
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { LoanApplication, RepaymentScheduleItem, PaymentRecord } from './loan.types';
import { LoanApplicationService } from './loan-application.service';

@Injectable({
  providedIn: 'root'
})
export class LoanRepaymentService {
  private readonly repaymentGraceDays = 5;
  private readonly repaymentOverdueDays = 15;
  private readonly creditReportDays = 30;
  private readonly lateFeeRate = 0.02;
  
  constructor(private loanApplicationService: LoanApplicationService) {}

  // Get repayment schedule for a loan
  getRepaymentSchedule(loanId: string): Observable<RepaymentScheduleItem[]> {
    return this.loanApplicationService.getApplicationById(loanId).pipe(
      switchMap((loan) => {
        if (!loan) {
          return of([]);
        }

        this.refreshRepaymentLifecycle(loan);
        return this.loanApplicationService.saveApplication(loan).pipe(
          map((savedLoan) => savedLoan.repaymentSchedule || [])
        );
      })
    );
  }

  // Record a payment
  recordPayment(loanId: string, payment: Partial<PaymentRecord>): Observable<LoanApplication> {
    return this.loanApplicationService.getApplicationById(loanId).pipe(
      switchMap((loan) => {
        if (!loan) {
          return throwError(() => new Error('Loan not found'));
        }

        if (loan.status !== 'ACTIVE' && loan.status !== 'APPROVED') {
          return throwError(() => new Error('Payments can only be recorded for approved or active loans'));
        }

        this.refreshRepaymentLifecycle(loan);

        const nextDue = this.getNextOpenInstallment(loan);
        if (!nextDue) {
          return throwError(() => new Error('No payable installment found for this loan'));
        }

        const paidAmount = Number(payment.amount || 0);
        if (paidAmount <= 0) {
          return throwError(() => new Error('Payment amount must be greater than zero'));
        }

        if (paidAmount < nextDue.totalPayment) {
          return throwError(() => new Error('Payment amount cannot be less than the due installment amount'));
        }

        const paymentDate = payment.date || new Date().toISOString();
        const receiptNumber = this.generateReceiptNumber(loan.id);
        const extraAmount = this.roundCurrency(Math.max(paidAmount - nextDue.totalPayment, 0));
        const principalPaid = this.roundCurrency((nextDue.principal || 0) + extraAmount);
        const interestPaid = this.roundCurrency(nextDue.interest || 0);

        const paymentRecord: PaymentRecord = {
          id: receiptNumber,
          date: paymentDate,
          amount: paidAmount,
          principalAmount: principalPaid,
          interestPaid,
          lateFeeAmount: Number(nextDue.lateFeeAmount || 0),
          remainingBalance: this.roundCurrency(Math.max((loan.currentBalance || 0) - paidAmount, 0)),
          paymentMethod: payment.paymentMethod || 'BANK_TRANSFER',
          referenceNumber: payment.referenceNumber || receiptNumber,
          installmentNo: nextDue.monthNumber,
          receiptNumber,
          receivedBy: payment.receivedBy || 'System',
          notes: payment.notes
        };

        loan.paymentHistory = [...(loan.paymentHistory || []), paymentRecord];

        nextDue.status = 'PAID';
        nextDue.paymentDate = paymentDate;
        nextDue.paidAmount = paidAmount;
        nextDue.paymentMethod = paymentRecord.paymentMethod;
        nextDue.receiptNumber = receiptNumber;

        loan.totalPaid = this.roundCurrency((loan.totalPaid || 0) + paidAmount);
        loan.totalPrincipalPaid = this.roundCurrency((loan.totalPrincipalPaid || 0) + principalPaid);
        loan.totalInterestPaid = this.roundCurrency((loan.totalInterestPaid || 0) + interestPaid);
        loan.currentBalance = this.roundCurrency(Math.max((loan.currentBalance || 0) - paidAmount, 0));
        loan.outstandingPrincipal = this.roundCurrency(
          Math.max((loan.outstandingPrincipal ?? loan.loanAmount) - principalPaid, 0)
        );

        this.updateFutureRemainingBalances(loan);

        const hasOpenInstallments = loan.repaymentSchedule.some(item => item.status === 'PENDING' || item.status === 'OVERDUE');
        if (!hasOpenInstallments || loan.currentBalance <= 0) {
          loan.status = 'COMPLETED';
          loan.currentBalance = 0;
          loan.outstandingPrincipal = 0;
          loan.endDate = new Date().toISOString().split('T')[0];
          loan.statusHistory.push({
            status: 'COMPLETED',
            date: new Date().toISOString(),
            changedBy: 'System',
            notes: 'Loan marked completed after full repayment.'
          });
        }

        this.refreshRepaymentLifecycle(loan);
        return this.loanApplicationService.saveApplication(loan);
      })
    );
  }

  private refreshRepaymentLifecycle(loan: LoanApplication): void {
    if (!loan.repaymentSchedule?.length) {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    loan.repaymentSchedule.forEach(item => {
      if (item.status === 'PAID' || item.status === 'SKIPPED') {
        return;
      }

      const dueDate = new Date(item.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const overdueDays = Math.max(
        Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)),
        0
      );

      if (overdueDays >= this.repaymentGraceDays && !item.reminderSentAt) {
        item.reminderSentAt = new Date().toISOString();
      }

      if (overdueDays >= this.repaymentOverdueDays) {
        item.status = 'OVERDUE';

        if (!item.lateFeeAmount) {
          const lateFee = this.roundCurrency(item.totalPayment * this.lateFeeRate);
          item.lateFeeAmount = lateFee;
          item.interest = this.roundCurrency((item.interest || 0) + lateFee);
          item.totalPayment = this.roundCurrency(item.totalPayment + lateFee);
          loan.currentBalance = this.roundCurrency((loan.currentBalance || 0) + lateFee);
        }

        if (overdueDays >= this.creditReportDays && !item.creditReportedAt) {
          item.creditReportedAt = new Date().toISOString();
        }
      } else {
        item.status = 'PENDING';
      }
    });
  }

  private getNextOpenInstallment(loan: LoanApplication): RepaymentScheduleItem | undefined {
    return [...(loan.repaymentSchedule || [])]
      .filter(item => item.status === 'PENDING' || item.status === 'OVERDUE')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  }

  private updateFutureRemainingBalances(loan: LoanApplication): void {
    let runningBalance = this.roundCurrency(loan.currentBalance || 0);

    const ordered = [...loan.repaymentSchedule].sort((a, b) => a.monthNumber - b.monthNumber);
    ordered.forEach(item => {
      if (item.status === 'PAID') {
        item.remainingBalance = runningBalance;
        return;
      }

      const principal = Number(item.principal || 0);
      runningBalance = this.roundCurrency(Math.max(runningBalance - principal, 0));
      item.remainingBalance = runningBalance;
    });
  }

  private generateReceiptNumber(loanId: string): string {
    return `PAY-${loanId}-${Date.now()}`;
  }

  private roundCurrency(value: number): number {
    return Number(value.toFixed(2));
  }

  // Get payment history for a loan
  getPaymentHistory(loanId: string): Observable<PaymentRecord[]> {
    return this.loanApplicationService.getApplicationById(loanId).pipe(
      map((loan) => loan?.paymentHistory || [])
    );
  }

  // Check if loan is overdue
  isLoanOverdue(loanId: string): Observable<boolean> {
    return this.loanApplicationService.getApplicationById(loanId).pipe(
      switchMap((loan) => {
        if (!loan) {
          return of(false);
        }

        this.refreshRepaymentLifecycle(loan);
        return this.loanApplicationService.saveApplication(loan).pipe(
          map((savedLoan) => savedLoan.repaymentSchedule.some(item => item.status === 'OVERDUE'))
        );
      })
    );
  }
}
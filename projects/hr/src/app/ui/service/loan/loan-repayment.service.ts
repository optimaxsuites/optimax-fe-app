// loan-repayment.service.ts (fixed - remove properties that don't exist)
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { LoanApplication, RepaymentScheduleItem, PaymentRecord, LoanStatus, StatusChange } from './loan.types';
import { LoanApplicationService } from './loan-application.service';
import { resolveCompletedLoanActor, resolveLoanEmployeeName, resolvePaymentActorName } from './loan-display.util';

@Injectable({
  providedIn: 'root'
})
export class LoanRepaymentService {
  private readonly repaymentGraceDays = 5;
  private readonly creditReportDays = 30;
  private readonly defaultLateFeeRate = 0.02;
  private readonly defaultedInstallmentThreshold = 3;
  
  constructor(private loanApplicationService: LoanApplicationService) {}

  getRepaymentSchedule(loanId: number): Observable<RepaymentScheduleItem[]> {
    return this.loanApplicationService.getApplicationById(String(loanId)).pipe(
      switchMap((loan) => {
        if (!loan) return of([]);
        this.refreshRepaymentLifecycle(loan);
        return this.loanApplicationService.saveApplication(loan).pipe(
          map((savedLoan) => savedLoan.repaymentSchedule || [])
        );
      })
    );
  }

  recordPayment(
    loanId: number,
    payment: Partial<PaymentRecord> & { totalAmount?: number; paymentMethod?: string; paidAt?: string }
  ): Observable<LoanApplication> {
    return this.loanApplicationService.getApplicationById(String(loanId)).pipe(
      switchMap((loan) => {
        if (!loan) return throwError(() => new Error('Loan not found'));
        if (!['ACTIVE', 'SKIPPED', 'OVERDUE'].includes(loan.status)) {
          return throwError(() => new Error('Payments can only be recorded for active, skipped, or overdue loans'));
        }

        this.refreshRepaymentLifecycle(loan);

        const nextDue = this.getNextOpenInstallment(loan);
        if (!nextDue) {
          return throwError(() => new Error('No payable installment found for this loan'));
        }

        let paidAmount = Number(payment.totalAmount || 0);
        if (paidAmount <= 0) {
          return throwError(() => new Error('Payment amount must be greater than zero'));
        }

        let lateFeePaid = 0;
        if (nextDue.lateFeeAmount && nextDue.lateFeeAmount > 0) {
          if (paidAmount >= nextDue.totalAmount + nextDue.lateFeeAmount) {
            lateFeePaid = nextDue.lateFeeAmount;
          } else if (paidAmount > nextDue.totalAmount) {
            lateFeePaid = paidAmount - nextDue.totalAmount;
            paidAmount = nextDue.totalAmount;
          }
        }

        if (paidAmount < nextDue.totalAmount) {
          return throwError(() => new Error(`Payment amount cannot be less than the due installment amount`));
        }

        const paymentDate = payment.paidAt || new Date().toISOString();
        const receiptNumber = this.generateReceiptNumber(loan.id);
        const extraAmount = this.roundCurrency(Math.max(paidAmount - nextDue.totalAmount, 0));
        const principalPaid = this.roundCurrency((nextDue.principalAmount || 0) + extraAmount);
        const interestPaid = this.roundCurrency(nextDue.interestAmount || 0);
        const paymentActor = resolvePaymentActorName(payment, resolveLoanEmployeeName(loan));

        const paymentRecord: PaymentRecord = {
          id: Date.now(),
          loanId: loan.id,
          paidAt: paymentDate,
          totalAmount: paidAmount,
          principalAmount: principalPaid,
          interestPaid,
          lateFeeAmount: lateFeePaid,
          remainingBalance: this.roundCurrency(Math.max((loan.currentBalance || 0) - paidAmount, 0)),
          paymentMethod: payment.paymentMethod || 'BANK_TRANSFER',
          referenceNumber: payment.referenceNumber || receiptNumber,
          installmentNo: nextDue.installmentNo,
          receiptNumber,
          receivedBy: paymentActor,
          notes: payment.notes || ''
        };

        loan.paymentHistory = [...(loan.paymentHistory || []), paymentRecord];

        nextDue.status = 'PAID';
        nextDue.paidAmount = paidAmount;
        nextDue.paymentMethod = paymentRecord.paymentMethod;
        nextDue.receiptNumber = receiptNumber;
        if (lateFeePaid > 0) {
          nextDue.lateFeeAmount = 0;
        }

        loan.totalPaid = this.roundCurrency((loan.totalPaid || 0) + paidAmount);
        loan.totalPrincipalPaid = this.roundCurrency((loan.totalPrincipalPaid || 0) + principalPaid);
        loan.totalInterestPaid = this.roundCurrency((loan.totalInterestPaid || 0) + interestPaid);
        loan.totalLateFeesPaid = this.roundCurrency((loan.totalLateFeesPaid || 0) + lateFeePaid);
        loan.currentBalance = this.roundCurrency(Math.max((loan.currentBalance || 0) - paidAmount, 0));
        loan.outstandingPrincipal = this.roundCurrency(
          Math.max((loan.outstandingPrincipal ?? loan.amount) - principalPaid, 0)
        );
        if (loan.status === 'ACTIVE' && loan.statusBeforeOverride) {
          loan.statusBeforeOverride = undefined;
        }

        this.updateFutureRemainingBalances(loan);

        const hasOpenInstallments = loan.repaymentSchedule.some(item => item.status !== 'PAID');
        if (!hasOpenInstallments || loan.currentBalance <= 0) {
          loan.status = 'COMPLETED';
          loan.currentBalance = 0;
          loan.outstandingPrincipal = 0;
          loan.completedDate = new Date().toISOString();
          this.appendStatusHistoryEntry(loan, {
            status: 'COMPLETED',
            changedAt: new Date().toISOString(),
            changedBy: resolveCompletedLoanActor({
              paymentHistory: [...(loan.paymentHistory || []), paymentRecord],
              fullName: loan.fullName,
              employeeId: loan.employeeId
            }),
            notes: 'Loan marked completed after full repayment.'
          });
        }

        this.refreshRepaymentLifecycle(loan);
        return this.loanApplicationService.saveApplication(loan);
      })
    );
  }

  refreshRepaymentLifecycle(loan: LoanApplication): void {
    if (!loan.repaymentSchedule?.length) return;

    const currentStatus = loan.status;
    if (currentStatus === 'PAUSED' || currentStatus === 'DEFAULTED' || currentStatus === 'COMPLETED') {
      this.updateDerivedRepaymentFields(loan);
      return;
    }

    if (!this.isRepaymentLifecycleStatus(currentStatus) && !loan.disbursedDate) {
      this.updateDerivedRepaymentFields(loan);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    loan.repaymentSchedule.forEach(item => {
      if (item.status === 'PAID') return;

      const dueDate = new Date(item.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const overdueDays = Math.max(
        Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)),
        0
      );

      const isSkippedInstallment = item.status === 'SKIPPED';

      if (isSkippedInstallment) {
        if (overdueDays > 0) {
          item.status = 'OVERDUE';
        }
      } else if (overdueDays > 0) {
        item.status = 'OVERDUE';
      } else {
        item.status = 'PENDING';
      }

      if (overdueDays >= this.repaymentGraceDays && !item.reminderSentAt) {
        item.reminderSentAt = new Date().toISOString();
      }

      if (item.status === 'OVERDUE' && overdueDays >= this.getLateFeeGracePeriodDays(loan)) {
        if (!item.lateFeeAmount || item.lateFeeAmount === 0) {
          const unpaidInstallmentAmount = this.roundCurrency(Math.max(
            (Number(item.principalAmount || 0) + Number(item.interestAmount || 0)) - Number(item.paidAmount || 0),
            0
          ));
          const lateFee = this.roundCurrency(unpaidInstallmentAmount * this.getLateFeeRate(loan));
          
          item.lateFeeAmount = lateFee;
          const originalTotal = item.totalAmount;
          item.totalAmount = this.roundCurrency(originalTotal + lateFee);
          loan.totalLateFeesAccrued = this.roundCurrency((loan.totalLateFeesAccrued || 0) + lateFee);
          loan.currentBalance = this.roundCurrency((loan.currentBalance || 0) + lateFee);
        }
      }

      if (overdueDays >= this.creditReportDays && !item.creditReportedAt) {
        item.creditReportedAt = new Date().toISOString();
      }
    });

    this.updateDerivedRepaymentFields(loan);
  }

  private getNextOpenInstallment(loan: LoanApplication): RepaymentScheduleItem | undefined {
    return [...(loan.repaymentSchedule || [])]
      .filter(item => item.status === 'PENDING' || item.status === 'OVERDUE' || item.status === 'SKIPPED')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  }

  applyApprovedGracePeriod(request: {
    loanId: number;
    installmentNumber: number;
    newDueDate: string;
    approvedGraceDays?: number;
    reviewNote?: string;
  }): Observable<LoanApplication> {
    return this.loanApplicationService.getApplicationById(String(request.loanId)).pipe(
      switchMap((loan) => {
        if (!loan) {
          return throwError(() => new Error('Loan not found'));
        }

        const installment = [...(loan.repaymentSchedule || [])]
          .sort((left, right) => left.installmentNo - right.installmentNo)
          .find((item) => item.installmentNo === request.installmentNumber && item.status !== 'PAID')
          || this.getNextOpenInstallment(loan);

        if (!installment) {
          return throwError(() => new Error('No eligible installment found for grace period approval'));
        }

        installment.dueDate = request.newDueDate;
        installment.status = 'SKIPPED';
        installment.notes = request.reviewNote?.trim()
          ? `Grace period approved. ${request.reviewNote.trim()}`
          : `Grace period approved for ${request.approvedGraceDays || 0} days.`;
        installment.reminderSentAt = undefined;
        installment.creditReportedAt = undefined;

        this.refreshRepaymentLifecycle(loan);

        return this.loanApplicationService.saveApplication(loan);
      })
    );
  }

  private updateDerivedRepaymentFields(loan: LoanApplication): void {
    const openInstallments = [...(loan.repaymentSchedule || [])]
      .filter((item) => item.status !== 'PAID')
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());

    const skippedCount = openInstallments.filter((item) => item.status === 'SKIPPED').length;
    const overdueCount = openInstallments.filter((item) => item.status === 'OVERDUE').length;

    loan.skippedPaymentsCount = skippedCount;
    loan.overduePaymentsCount = overdueCount;
    loan.nextPaymentDueDate = openInstallments[0]?.dueDate;

    const nextStatus = this.deriveLoanLifecycleStatus(loan, skippedCount, overdueCount, openInstallments.length);
    if (nextStatus !== loan.status) {
      const previousStatus = loan.status;
      loan.status = nextStatus;
      this.appendStatusHistoryEntry(loan, {
        status: nextStatus,
        changedAt: new Date().toISOString(),
        changedBy: 'System',
        notes: this.buildLifecycleStatusNote(previousStatus, nextStatus, skippedCount, overdueCount)
      });
    }
  }

  private deriveLoanLifecycleStatus(
    loan: LoanApplication,
    skippedCount: number,
    overdueCount: number,
    openInstallmentCount: number
  ): LoanStatus {
    if (loan.currentBalance <= 0 || openInstallmentCount === 0) {
      return 'COMPLETED';
    }

    if (
      loan.status === 'ACTIVE' &&
      ['DEFAULTED', 'OVERDUE', 'SKIPPED', 'PAUSED'].includes(String(loan.statusBeforeOverride || ''))
    ) {
      return 'ACTIVE';
    }

    if (overdueCount >= this.defaultedInstallmentThreshold) {
      return 'DEFAULTED';
    }

    if (overdueCount > 0) {
      return 'OVERDUE';
    }

    if (skippedCount > 0) {
      return 'SKIPPED';
    }

    return 'ACTIVE';
  }

  private buildLifecycleStatusNote(
    previousStatus: LoanStatus,
    nextStatus: LoanStatus,
    skippedCount: number,
    overdueCount: number
  ): string {
    switch (nextStatus) {
      case 'SKIPPED':
        return `Grace period is active. ${skippedCount} installment${skippedCount === 1 ? '' : 's'} currently skipped.`;
      case 'OVERDUE':
        return `Loan is overdue with ${overdueCount} overdue installment${overdueCount === 1 ? '' : 's'}.`;
      case 'DEFAULTED':
        return `Loan has defaulted after ${overdueCount} overdue installments.`;
      case 'ACTIVE':
        return previousStatus === 'SKIPPED'
          ? 'Grace period resolved and repayment returned to active status.'
          : previousStatus === 'OVERDUE'
            ? 'Outstanding arrears resolved and loan returned to active status.'
            : 'Loan repayment is active.';
      case 'COMPLETED':
        return 'Loan marked completed after all installments were paid.';
      default:
        return `Loan status changed from ${previousStatus} to ${nextStatus}.`;
    }
  }

  private appendStatusHistoryEntry(loan: LoanApplication, entry: StatusChange): void {
    const normalizedStatusHistory = [...(loan.statusHistory || [])];
    const existingEntry = normalizedStatusHistory[normalizedStatusHistory.length - 1];

    if (
      existingEntry?.status === entry.status &&
      existingEntry?.notes === entry.notes
    ) {
      return;
    }

    loan.statusHistory = [...normalizedStatusHistory, entry].sort(
      (left, right) => new Date(left.changedAt).getTime() - new Date(right.changedAt).getTime()
    );
  }

  private isRepaymentLifecycleStatus(status: LoanStatus): boolean {
    return ['ACTIVE', 'SKIPPED', 'OVERDUE', 'DEFAULTED', 'PAUSED', 'COMPLETED'].includes(status);
  }

  private updateFutureRemainingBalances(loan: LoanApplication): void {
    let runningBalance = this.roundCurrency(loan.currentBalance || 0);
    const ordered = [...loan.repaymentSchedule].sort((a, b) => a.installmentNo - b.installmentNo);
    
    ordered.forEach(item => {
      if (item.status === 'PAID') {
        item.remainingBalance = runningBalance;
        return;
      }
      const principal = Number(item.principalAmount || 0);
      runningBalance = this.roundCurrency(Math.max(runningBalance - principal, 0));
      item.remainingBalance = runningBalance;
    });
  }

  private generateReceiptNumber(loanId: number): string {
    return `PAY-${loanId}-${Date.now()}`;
  }

  private roundCurrency(value: number): number {
    return Number(value.toFixed(2));
  }

  private getLateFeeRate(loan: LoanApplication): number {
    // A missing value must fall through to the default, not become a valid 0%.
    const configuredPercentage = Number(loan.lateFeePercentage ?? NaN);
    if (Number.isFinite(configuredPercentage) && configuredPercentage >= 0) {
      return configuredPercentage / 100;
    }

    return this.defaultLateFeeRate;
  }

  private getLateFeeGracePeriodDays(loan: LoanApplication): number {
    const configuredGracePeriodDays = Number(loan.lateFeeGracePeriodDays ?? NaN);
    if (Number.isFinite(configuredGracePeriodDays) && configuredGracePeriodDays >= 0) {
      return Math.round(configuredGracePeriodDays);
    }

    return 15;
  }

  getPaymentHistory(loanId: number): Observable<PaymentRecord[]> {
    return this.loanApplicationService.getApplicationById(String(loanId)).pipe(
      map((loan) => loan?.paymentHistory || [])
    );
  }

  isLoanOverdue(loanId: number): Observable<boolean> {
    return this.loanApplicationService.getApplicationById(String(loanId)).pipe(
      switchMap((loan) => {
        if (!loan) return of(false);
        this.refreshRepaymentLifecycle(loan);
        return this.loanApplicationService.saveApplication(loan).pipe(
          map((savedLoan) => savedLoan.repaymentSchedule.some(item => item.status === 'OVERDUE'))
        );
      })
    );
  }
}
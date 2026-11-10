import { SALARY_DEDUCTION_NOTE, SELF_SERVICE_PAYMENTS_ENABLED } from '../repayment-methods';
import { Component, Input, OnChanges, OnInit, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { LoanApplication, RepaymentScheduleItem } from '../../../service/loan/loan.types';
import { formatNaira } from '../../../service/loan/loan-format.util';

@Component({
  selector: 'app-employee-payment-reminder',
  templateUrl: './employee-payment-reminder.component.html',
  styleUrls: ['./employee-payment-reminder.component.scss']
})
export class EmployeePaymentReminderComponent implements OnInit, OnChanges {
  /** Self-service repayment buttons are off for now: repayments come off salary (see repayment-methods.ts). */
  readonly selfServicePayments = SELF_SERVICE_PAYMENTS_ENABLED;
  readonly salaryDeductionNote = SALARY_DEDUCTION_NOTE;
  @Input() loans: LoanApplication[] = [];
  @Output() makePaymentClick = new EventEmitter<{ loan: LoanApplication; installment: RepaymentScheduleItem }>();

  upToDateNotification: {
    loan: LoanApplication;
    installment: RepaymentScheduleItem;
    daysUntilDue: number;
    dismissalKey: string;
  } | null = null;
  
  upcomingPayments: Array<{
    loan: LoanApplication;
    installment: RepaymentScheduleItem;
    daysUntilDue: number;
  }> = [];
  
  overduePayments: Array<{
    loan: LoanApplication;
    installment: RepaymentScheduleItem;
    daysOverdue: number;
  }> = [];

  lockedLoans: Array<{
    loan: LoanApplication;
    title: string;
    message: string;
  }> = [];

  ngOnInit(): void {
    this.calculateReminders();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loans']) {
      this.calculateReminders();
    }
  }

  calculateReminders(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.upcomingPayments = [];
    this.overduePayments = [];
    this.lockedLoans = [];
    this.upToDateNotification = null;

    this.loans.forEach(loan => {
      if (loan.status === 'PAUSED' || loan.status === 'DEFAULTED') {
        if (Number(loan.currentBalance || 0) > 0) {
          this.lockedLoans.push({
            loan,
            title: loan.status === 'PAUSED' ? 'Repayment Paused' : 'Loan Defaulted',
            message: loan.status === 'PAUSED'
              ? 'Admin has temporarily paused this loan. Payments and extension requests are locked until the loan is restored.'
              : 'This loan is currently defaulted. Payments are locked here until admin reactivates or restructures the account.'
          });
        }
        return;
      }

      if (loan.status !== 'ACTIVE' && loan.status !== 'SKIPPED' && loan.status !== 'OVERDUE') return;

      loan.repaymentSchedule?.forEach(installment => {
        if (installment.status === 'PAID' || installment.status === 'SKIPPED') return;

        const dueDate = new Date(installment.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          this.overduePayments.push({
            loan,
            installment,
            daysOverdue: Math.abs(diffDays)
          });
        } else if (diffDays <= 7) {
          this.upcomingPayments.push({
            loan,
            installment,
            daysUntilDue: diffDays
          });
        }
      });
    });

    this.upcomingPayments.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    this.overduePayments.sort((a, b) => b.daysOverdue - a.daysOverdue);

    const checkpointInstallment = this.upcomingPayments[0];

    if (
      checkpointInstallment &&
      this.overduePayments.length === 0 &&
      this.lockedLoans.length === 0 &&
      [7, 3, 1].includes(checkpointInstallment.daysUntilDue)
    ) {
      const dismissalKey = this.buildDismissalKey(
        checkpointInstallment.loan,
        checkpointInstallment.installment,
        checkpointInstallment.daysUntilDue
      );
      if (!this.isDismissed(dismissalKey)) {
        this.upToDateNotification = {
          ...checkpointInstallment,
          dismissalKey
        };
      }
    }
  }

  makePayment(loan: LoanApplication, installment: RepaymentScheduleItem): void {
    this.makePaymentClick.emit({ loan, installment });
  }

  formatCurrency(amount: number): string {
    return formatNaira(amount);
  }

  getDaysText(days: number): string {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  }

  getOverdueText(days: number): string {
    if (days === 1) return '1 day overdue';
    return `${days} days overdue`;
  }

  getUrgencyClass(days: number): string {
    if (days === 0) return 'urgent';
    if (days <= 2) return 'warning';
    return 'normal';
  }

  getOverdueUrgencyClass(days: number): string {
    if (days >= 30) return 'critical';
    if (days >= 14) return 'high';
    return 'medium';
  }

  getLockClass(status: LoanApplication['status']): string {
    return status === 'DEFAULTED' ? 'defaulted' : 'paused';
  }

  dismissUpToDateNotification(): void {
    if (!this.upToDateNotification) {
      return;
    }

    sessionStorage.setItem(this.upToDateNotification.dismissalKey, '1');
    this.upToDateNotification = null;
  }

  private buildDismissalKey(loan: LoanApplication, installment: RepaymentScheduleItem, daysUntilDue: number): string {
    return [
      'employee-payment-reminder',
      String(loan.id || loan.loanCode || 'loan'),
      String(installment.installmentNo || 0),
      String(installment.dueDate || ''),
      String(daysUntilDue)
    ].join(':');
  }

  private isDismissed(key: string): boolean {
    return sessionStorage.getItem(key) === '1';
  }
}
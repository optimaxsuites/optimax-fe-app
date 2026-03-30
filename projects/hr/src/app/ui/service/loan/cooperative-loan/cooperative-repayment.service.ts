import { Injectable } from '@angular/core';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeNotification, CooperativeRepayment } from './cooperative.types';

export interface CooperativeRepaymentContext {
  loans: CooperativeLoan[];
  repayments: CooperativeRepayment[];
  notifications: CooperativeNotification[];
  repaymentDueDay: number;
  repaymentGraceDays: number;
  repaymentOverdueDays: number;
  lateFeeRate: number;
  creditReportDays: number;
  saveToStorage: () => void;
  formatCurrency: (amount: number) => string;
  createMemberStatusNotification: (loan: CooperativeLoan, title: string, message: string) => void;
  createRepaymentReminderNotification: (repayment: CooperativeRepayment, message: string) => void;
  createCreditReportNotification: (repayment: CooperativeRepayment) => void;
}

@Injectable({
  providedIn: 'root'
})
export class CooperativeRepaymentService {
  getRepaymentsByLoanId(context: CooperativeRepaymentContext, loanId: string | number): CooperativeRepayment[] {
    const normalizedLoanId = String(loanId);
    this.ensureRepaymentScheduleForLoan(context, normalizedLoanId);
    this.refreshOverdueStatuses(context, normalizedLoanId);

    return context.repayments
      .filter(item => String(item.loanId) === normalizedLoanId)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .map(item => ({ ...item }));
  }

  recordRepayment(
    context: CooperativeRepaymentContext,
    loanId: string | number,
    payload: { amount: number; modeofPayment: CooperativeRepayment['modeofPayment']; paidDate?: string }
  ): CooperativeRepayment | undefined {
    const normalizedLoanId = String(loanId);
    const loan = context.loans.find(item => String(item.id) === normalizedLoanId);
    if (!loan || loan.status !== 'ACTIVE') {
      return undefined;
    }

    this.refreshOverdueStatuses(context, normalizedLoanId);

    const openRepayments = context.repayments
      .filter(item => String(item.loanId) === normalizedLoanId && item.status !== 'PAID')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const nextDue = openRepayments[0];

    if (!nextDue) {
      return undefined;
    }

    const paidAmount = Number(payload.amount || 0);
    if (paidAmount <= 0) {
      return undefined;
    }

    if (paidAmount < nextDue.amount) {
      return undefined;
    }

    const paymentTimestamp = payload.paidDate || new Date().toISOString();
    const modeofPayment = payload.modeofPayment || 'BANK_TRANSFER';
    let remainingPayment = paidAmount;
    let principalPaidTotal = 0;
    let interestPaidTotal = 0;

    const recordedRepayment: CooperativeRepayment = {
      ...nextDue,
      amount: paidAmount,
      paidDate: paymentTimestamp,
      modeofPayment,
      receiptNumber: this.generateReceiptNumber(this.getLoanCode(loan))
    };

    for (let index = 0; index < openRepayments.length && remainingPayment > 0; index++) {
      const installment = openRepayments[index];
      const installmentAmount = Number(installment.amount || 0);
      const scheduledInterest = Number(installment.interestComponent || 0);
      const scheduledLateFee = Number(installment.lateFeeAmount || 0);
      const scheduledPrincipal = Number(
        installment.principalComponent || Math.max(installmentAmount - scheduledInterest - scheduledLateFee, 0)
      );

      if (remainingPayment >= installmentAmount) {
        remainingPayment = this.roundCurrency(remainingPayment - installmentAmount);
        installment.paidDate = paymentTimestamp;
        installment.modeofPayment = modeofPayment;
        installment.receiptNumber = this.generateReceiptNumber(this.getLoanCode(loan));
        installment.status = 'PAID';

        principalPaidTotal += scheduledPrincipal;
        interestPaidTotal += scheduledInterest;
        continue;
      }

      const appliedAmount = this.roundCurrency(remainingPayment);
      const principalReduction = Math.min(appliedAmount, Math.max(scheduledPrincipal, 0));
      const remainingAfterPrincipal = Math.max(appliedAmount - principalReduction, 0);
      const interestReduction = Math.min(remainingAfterPrincipal, Math.max(scheduledInterest, 0));
      const lateFeeReduction = Math.min(
        Math.max(remainingAfterPrincipal - interestReduction, 0),
        Math.max(scheduledLateFee, 0)
      );

      installment.principalComponent = this.roundCurrency(Math.max(scheduledPrincipal - principalReduction, 0));
      installment.interestComponent = this.roundCurrency(Math.max(scheduledInterest - interestReduction, 0));
      installment.lateFeeAmount = this.roundCurrency(Math.max(scheduledLateFee - lateFeeReduction, 0));
      installment.amount = this.roundCurrency(Math.max(installmentAmount - appliedAmount, 0));
      if (installment.amount === 0) {
        installment.paidDate = paymentTimestamp;
        installment.modeofPayment = modeofPayment;
        installment.receiptNumber = this.generateReceiptNumber(this.getLoanCode(loan));
        installment.status = 'PAID';
      }
      principalPaidTotal += principalReduction;
      interestPaidTotal += interestReduction;
      remainingPayment = 0;
    }

    loan.totalPrincipalPaid = this.roundCurrency(Number(loan.totalPrincipalPaid || 0) + principalPaidTotal);
    loan.totalInterestPaid = this.roundCurrency(Number(loan.totalInterestPaid || 0) + interestPaidTotal);
    loan.outstandingPrincipal = this.roundCurrency(
      Math.max(Number(loan.outstandingPrincipal ?? loan.amount ?? 0) - principalPaidTotal, 0)
    );
    loan.updatedAt = paymentTimestamp;

    const remainingOpen = context.repayments.some(item => String(item.loanId) === normalizedLoanId && item.status !== 'PAID');
    if (!remainingOpen) {
      loan.status = 'COMPLETED';
      loan.completionDate = new Date().toISOString();
      loan.outstandingPrincipal = 0;
      loan.updatedAt = new Date().toISOString();

      context.createMemberStatusNotification(
        loan,
        'Loan Completed',
        `All repayments for loan ${this.getLoanCode(loan)} are received. Your loan is now completed.`
      );
    }

    context.saveToStorage();
    return recordedRepayment;
  }

  getOverdueRepaymentsByLoanId(context: CooperativeRepaymentContext, loanId: string | number): CooperativeRepayment[] {
    const normalizedLoanId = String(loanId);
    this.refreshOverdueStatuses(context, normalizedLoanId);
    return context.repayments
      .filter(item => String(item.loanId) === normalizedLoanId && item.status === 'OVERDUE')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .map(item => ({ ...item }));
  }

  sendRepaymentReminder(context: CooperativeRepaymentContext, loanId: string | number): boolean {
    const normalizedLoanId = String(loanId);
    const loan = context.loans.find(item => String(item.id) === normalizedLoanId);
    if (!loan) {
      return false;
    }

    const nowIso = new Date().toISOString();
    const loanRepayments = context.repayments
      .filter(item => String(item.loanId) === normalizedLoanId && item.status !== 'PAID')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const overdueItems = loanRepayments.filter(item => item.status === 'OVERDUE');
    const reminderTargets = overdueItems.length > 0 ? overdueItems : loanRepayments.slice(0, 1);

    reminderTargets.forEach(item => {
      item.reminderSentAt = nowIso;
    });

    const totalOverdue = overdueItems.reduce((sum, item) => sum + item.amount, 0);
    const message = overdueItems.length > 0
      ? `Reminder: ${overdueItems.length} repayment(s) are overdue for loan ${this.getLoanCode(loan)} totaling ${context.formatCurrency(totalOverdue)}.`
      : `Reminder: Your next repayment for loan ${this.getLoanCode(loan)} is due on the 15th repayment cycle.`;

    context.notifications.unshift({
      id: Date.now(),
      type: 'LOAN_REPAYMENT_REMINDER',
      recipient: 'MEMBER',
      title: 'Loan Repayment Reminder',
      message,
      loanId: loan.id,
      memberId: Number(this.getLoanMemberId(loan)),
      createdAt: new Date().toISOString(),
      read: false
    });

    context.saveToStorage();
    return true;
  }

  markLoanAsDefaulted(context: CooperativeRepaymentContext, loanId: string | number): CooperativeLoan | undefined {
    const normalizedLoanId = String(loanId);
    const loan = context.loans.find(item => String(item.id) === normalizedLoanId);
    if (!loan || (loan.status !== 'ACTIVE' && loan.status !== 'APPROVED')) {
      return undefined;
    }

    this.refreshOverdueStatuses(context, normalizedLoanId);

    loan.status = 'DEFAULTED';
    loan.defaultedDate = new Date().toISOString();
    loan.applicationStage = undefined;
    loan.updatedAt = new Date().toISOString();

    context.notifications.unshift({
      id: Date.now(),
      type: 'LOAN_DEFAULTED',
      recipient: 'MEMBER',
      title: 'Loan Marked as Defaulted',
      message: `Your loan ${this.getLoanCode(loan)} has been marked as defaulted. Please contact the cooperative admin immediately.`,
      loanId: loan.id,
      memberId: Number(this.getLoanMemberId(loan)),
      createdAt: new Date().toISOString(),
      read: false
    });

    context.saveToStorage();
    return { ...loan };
  }

  applyPatronageToMemberLoan(
    context: CooperativeRepaymentContext,
    memberId: string,
    amount: number
  ): { appliedAmount: number; loanId?: string } {
    const patronageAmount = Number(amount || 0);
    if (patronageAmount <= 0) {
      return { appliedAmount: 0 };
    }

    const activeLoan = context.loans
      .filter(item => this.getLoanMemberId(item) === memberId && item.status === 'ACTIVE')
      .sort((a, b) => new Date(a.applicationDate || a.requestDate).getTime() - new Date(b.applicationDate || b.requestDate).getTime())[0];

    if (!activeLoan) {
      return { appliedAmount: 0 };
    }

    this.ensureRepaymentScheduleForLoan(context, String(activeLoan.id));
    this.refreshOverdueStatuses(context, String(activeLoan.id));

    const openRepayments = context.repayments
      .filter(item => String(item.loanId) === String(activeLoan.id) && item.status !== 'PAID')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    if (openRepayments.length === 0) {
      return { appliedAmount: 0, loanId: String(activeLoan.id) };
    }

    let remainingCredit = patronageAmount;
    const now = new Date().toISOString();
    let principalPaidTotal = 0;
    let interestPaidTotal = 0;

    openRepayments.forEach(item => {
      if (remainingCredit <= 0) {
        return;
      }

      const installmentAmount = Number(item.amount || 0);
      const scheduledInterest = Number(item.interestComponent || 0);
      const scheduledLateFee = Number(item.lateFeeAmount || 0);
      const scheduledPrincipal = Number(
        item.principalComponent || Math.max(installmentAmount - scheduledInterest - scheduledLateFee, 0)
      );

      if (remainingCredit >= installmentAmount) {
        remainingCredit = this.roundCurrency(remainingCredit - installmentAmount);
        item.paidDate = now;
        item.modeofPayment = 'OTHER';
        item.status = 'PAID';
        principalPaidTotal += scheduledPrincipal;
        interestPaidTotal += scheduledInterest;
        return;
      }

      const appliedAmount = this.roundCurrency(remainingCredit);
      const principalReduction = Math.min(appliedAmount, Math.max(scheduledPrincipal, 0));
      const remainingAfterPrincipal = Math.max(appliedAmount - principalReduction, 0);
      const interestReduction = Math.min(remainingAfterPrincipal, Math.max(scheduledInterest, 0));
      const lateFeeReduction = Math.min(
        Math.max(remainingAfterPrincipal - interestReduction, 0),
        Math.max(scheduledLateFee, 0)
      );

      item.principalComponent = this.roundCurrency(Math.max(scheduledPrincipal - principalReduction, 0));
      item.interestComponent = this.roundCurrency(Math.max(scheduledInterest - interestReduction, 0));
      item.lateFeeAmount = this.roundCurrency(Math.max(scheduledLateFee - lateFeeReduction, 0));
      item.amount = this.roundCurrency(Math.max(installmentAmount - appliedAmount, 0));
      if (item.amount === 0) {
        item.paidDate = now;
        item.modeofPayment = 'OTHER';
        item.status = 'PAID';
      }
      principalPaidTotal += principalReduction;
      interestPaidTotal += interestReduction;
      remainingCredit = 0;
    });

    const appliedAmount = Number((patronageAmount - remainingCredit).toFixed(2));
    const stillOpen = context.repayments.some(item => String(item.loanId) === String(activeLoan.id) && item.status !== 'PAID');

    activeLoan.totalPrincipalPaid = this.roundCurrency(Number(activeLoan.totalPrincipalPaid || 0) + principalPaidTotal);
    activeLoan.totalInterestPaid = this.roundCurrency(Number(activeLoan.totalInterestPaid || 0) + interestPaidTotal);
    activeLoan.outstandingPrincipal = this.roundCurrency(
      Math.max(Number(activeLoan.outstandingPrincipal ?? activeLoan.amount ?? 0) - principalPaidTotal, 0)
    );

    if (!stillOpen) {
      activeLoan.status = 'COMPLETED';
      activeLoan.completionDate = now;
      activeLoan.outstandingPrincipal = 0;
      activeLoan.updatedAt = now;
    } else {
      activeLoan.updatedAt = now;
    }

    context.saveToStorage();
    return { appliedAmount, loanId: String(activeLoan.id) };
  }

  generateRepaymentSchedule(context: CooperativeRepaymentContext, loan: CooperativeLoan): void {
    const retainedRepayments = context.repayments.filter(item => String(item.loanId) !== String(loan.id));
    context.repayments.splice(0, context.repayments.length, ...retainedRepayments);

    const disbursedDate = loan.disbursedDate ? new Date(loan.disbursedDate) : loan.disbursedDate ? new Date(loan.disbursedDate) : new Date();
    const duration = Number(loan.duration ?? loan.repaymentTime ?? 0);
    if (duration <= 0) {
      return;
    }

    const totalRepayment = Number(loan.totalRepayment ?? ((loan.repaymentAmount ?? loan.repaymentAmount ?? 0) * duration));
    const baseInstallment = this.roundCurrency(totalRepayment / duration);
    const totalInterest = this.roundCurrency(Math.max(totalRepayment - loan.amount, 0));
    const baseInterest = this.roundCurrency(totalInterest / duration);
    let principalBalance = this.roundCurrency(loan.amount);
    let interestBalance = totalInterest;

    for (let installment = 1; installment <= duration; installment++) {
      const dueDate = this.computeInstallmentDueDate(context.repaymentDueDay, disbursedDate, installment);
      const interestComponent = installment === duration
        ? this.roundCurrency(interestBalance)
        : this.roundCurrency(baseInterest);
      const principalComponent = installment === duration
        ? this.roundCurrency(principalBalance)
        : this.roundCurrency(Math.max(baseInstallment - interestComponent, 0));

      interestBalance = this.roundCurrency(Math.max(interestBalance - interestComponent, 0));
      principalBalance = this.roundCurrency(Math.max(principalBalance - principalComponent, 0));
      const installmentAmount = this.roundCurrency(principalComponent + interestComponent);

      context.repayments.push({
        id: Number(`${loan.id}${installment}`),
        loanId: loan.id,
        amount: installmentAmount,
        dueDate: dueDate.toISOString(),
        principalComponent,
        interestComponent,
        lateFeeAmount: 0,
        status: 'PENDING'
      });
    }
  }

  ensureRepaymentScheduleForLoan(context: CooperativeRepaymentContext, loanId: string): void {
    const loan = context.loans.find(item => String(item.id) === loanId);
    if (!loan || loan.status !== 'ACTIVE') {
      return;
    }

    const hasRepayment = context.repayments.some(item => String(item.loanId) === loanId);
    if (hasRepayment) {
      return;
    }

    this.generateRepaymentSchedule(context, loan);
    context.saveToStorage();
  }

  refreshOverdueStatuses(context: CooperativeRepaymentContext, loanId?: string): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let updated = false;
    const nowIso = new Date().toISOString();

    context.repayments.forEach(item => {
      if (loanId && String(item.loanId) !== String(loanId)) {
        return;
      }

      if (item.status === 'PAID') {
        return;
      }

      const due = new Date(item.dueDate);
      due.setHours(0, 0, 0, 0);
      const overdueDays = Math.max(
        Math.floor((today.getTime() - due.getTime()) / (24 * 60 * 60 * 1000)),
        0
      );

      if (overdueDays >= context.repaymentGraceDays && !item.reminderSentAt) {
        item.reminderSentAt = nowIso;
        context.createRepaymentReminderNotification(item, 'Repayment grace period has elapsed. Please repay to avoid overdue penalties.');
        updated = true;
      }

      if (overdueDays >= context.repaymentOverdueDays) {
        if (item.status !== 'OVERDUE') {
          item.status = 'OVERDUE';
          updated = true;
        }

        if (!item.lateFeeAmount) {
          const lateFee = this.roundCurrency(item.amount * context.lateFeeRate);
          item.lateFeeAmount = lateFee;
          item.amount = this.roundCurrency(item.amount + lateFee);
          updated = true;
        }

        if (overdueDays >= context.creditReportDays && !item.creditReportedAt) {
          item.creditReportedAt = nowIso;
          context.createCreditReportNotification(item);
          updated = true;
        }
        return;
      }

      const nextStatus: CooperativeRepayment['status'] = 'PENDING';
      if (item.status !== nextStatus) {
        item.status = nextStatus;
        updated = true;
      }
    });

    if (updated) {
      context.saveToStorage();
    }
  }

  private computeInstallmentDueDate(repaymentDueDay: number, disbursedDate: Date, installment: number): Date {
    const dueDate = new Date(disbursedDate);
    dueDate.setHours(0, 0, 0, 0);
    dueDate.setDate(1);
    dueDate.setMonth(dueDate.getMonth() + installment);
    dueDate.setDate(repaymentDueDay);
    return dueDate;
  }

  private roundCurrency(value: number): number {
    return Number(Number(value || 0).toFixed(2));
  }

  private generateReceiptNumber(loanCode: string): string {
    const stamp = `${Date.now()}`.slice(-6);
    const shortLoanCode = loanCode.replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase();
    return `RCP-${shortLoanCode}-${stamp}`;
  }

  private getLoanCode(loan: CooperativeLoan): string {
    return String(loan.loanCode || loan.loanId || loan.id || '');
  }

  private getLoanMemberId(loan: CooperativeLoan): string {
    return String(loan.memberId || loan.cooperativeMemberId || '');
  }
}

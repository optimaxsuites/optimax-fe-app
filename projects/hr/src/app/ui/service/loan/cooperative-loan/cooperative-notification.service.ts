import { Injectable } from '@angular/core';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import {
  CooperativeLoanGroup,
  CooperativeMember,
  CooperativeNotification,
  CooperativeRepayment,
  CooperativeLoanGuarantor
} from './cooperative.types';

interface PendingMembershipApplication {
  id: string;
  employeeId: string;
  fullName: string;
  requestedTier: string;
  source: 'SELF' | 'ADMIN_INVITE';
  submittedAt: string;
  note?: string;
  status: 'PENDING_MANAGER_APPROVAL';
}

export interface CooperativeNotificationContext {
  notifications: CooperativeNotification[];
  saveToStorage: () => void;
  getMemberById: (id: string) => CooperativeMember | undefined;
  getLoanById: (id: string) => CooperativeLoan | undefined;
  getGroupById: (id: string) => CooperativeLoanGroup | undefined;
  formatCurrency: (amount: number) => string;
}

@Injectable({
  providedIn: 'root'
})
export class CooperativeNotificationService {
  getNotifications(context: CooperativeNotificationContext): CooperativeNotification[] {
    return [...context.notifications];
  }

  markNotificationAsRead(context: CooperativeNotificationContext, id: string): void {
    const notification = context.notifications.find(item => item.id === id);
    if (!notification) {
      return;
    }

    notification.read = true;
    context.saveToStorage();
  }

  createPendingApprovalNotification(context: CooperativeNotificationContext, loan: CooperativeLoan): void {
    const memberId = this.getLoanMemberId(loan);
    const member = context.getMemberById(memberId);
    const groupId = this.getLoanGroupId(loan);
    const group = groupId ? context.getGroupById(groupId) : undefined;
    context.notifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'LOAN_PENDING_APPROVAL',
      recipient: 'ADMIN',
      title: 'Loan Pending Approval',
      message: `${member?.fullName || 'Member'} submitted ${context.formatCurrency(loan.amount)} for ${group?.name || 'loan group'} (${this.getLoanCode(loan)}) and is ready for admin review.`,
      loanId: loan.id,
      memberId,
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  createPendingMembershipApprovalNotification(context: CooperativeNotificationContext, item: PendingMembershipApplication): void {
    context.notifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'LOAN_STATUS_UPDATE',
      recipient: 'ADMIN',
      title: 'Membership Approval Pending',
      message: `${item.fullName} (${item.employeeId}) submitted a cooperative membership request and is pending manager approval.`,
      loanId: '',
      memberId: item.employeeId,
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  createMemberStatusNotification(
    context: CooperativeNotificationContext,
    loan: CooperativeLoan,
    title: string,
    message: string
  ): void {
    const memberId = this.getLoanMemberId(loan);
    context.notifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'LOAN_STATUS_UPDATE',
      recipient: 'MEMBER',
      title,
      message,
      loanId: loan.id,
      memberId,
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  createGuarantorNotifications(context: CooperativeNotificationContext, loan: CooperativeLoan): void {
    (loan.guarantors || []).forEach((guarantor) => {
      const normalizedGuarantor: CooperativeLoanGuarantor = {
        memberId: String(guarantor.memberId || ''),
        guaranteedAmount: Number(guarantor.guaranteedAmount || 0),
        status: (guarantor.status as CooperativeLoanGuarantor['status']) || 'PENDING',
        requestedAt: guarantor.requestedAt || new Date().toISOString(),
        decidedAt: guarantor.decidedAt,
        note: guarantor.note
      };

      if (!normalizedGuarantor.memberId) {
        return;
      }

      if (normalizedGuarantor.status !== 'PENDING') {
        return;
      }

      const guarantorMember = context.getMemberById(normalizedGuarantor.memberId);
      context.notifications.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'GUARANTOR_REQUEST',
        recipient: 'MEMBER',
        title: 'Guarantor Request',
        message: `You were requested as guarantor for loan ${this.getLoanCode(loan)} (${context.formatCurrency(normalizedGuarantor.guaranteedAmount)}).`,
        loanId: loan.id,
        memberId: guarantorMember?.id || normalizedGuarantor.memberId,
        createdAt: new Date().toISOString(),
        read: false
      });
    });
  }

  createRepaymentReminderNotification(
    context: CooperativeNotificationContext,
    repayment: CooperativeRepayment,
    message: string
  ): void {
    const loan = context.getLoanById(String(repayment.loanId));
    if (!loan) {
      return;
    }

    const memberId = this.getLoanMemberId(loan);
    context.notifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'LOAN_REPAYMENT_REMINDER',
      recipient: 'MEMBER',
      title: 'Repayment Reminder',
      message: `${message} Loan ${this.getLoanCode(loan)} installment due ${new Date(repayment.dueDate).toDateString()}.`,
      loanId: loan.id,
      memberId,
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  createCreditReportNotification(context: CooperativeNotificationContext, repayment: CooperativeRepayment): void {
    const loan = context.getLoanById(String(repayment.loanId));
    if (!loan) {
      return;
    }

    const memberId = this.getLoanMemberId(loan);
    context.notifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'LOAN_STATUS_UPDATE',
      recipient: 'MEMBER',
      title: 'Credit Bureau Alert',
      message: `Loan ${this.getLoanCode(loan)} has exceeded delinquency threshold and is flagged for credit bureau reporting.`,
      loanId: loan.id,
      memberId,
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  private getLoanMemberId(loan: CooperativeLoan): string {
    return String(loan.memberId || loan.cooperativeMemberId || '');
  }

  private getLoanGroupId(loan: CooperativeLoan): string {
    return String(loan.groupId || loan.cooperativeGroupId || '');
  }

  private getLoanCode(loan: CooperativeLoan): string {
    return String(loan.loanCode || loan.loanId || loan.id || '');
  }
}

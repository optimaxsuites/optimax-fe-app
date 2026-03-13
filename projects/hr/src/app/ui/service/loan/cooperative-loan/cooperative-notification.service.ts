import { Injectable } from '@angular/core';
import {
  CooperativeLoan,
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
    const member = context.getMemberById(loan.memberId);
    const group = loan.groupId ? context.getGroupById(loan.groupId) : undefined;
    context.notifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'LOAN_PENDING_APPROVAL',
      recipient: 'ADMIN',
      title: 'Loan Pending Approval',
      message: `${member?.fullName || 'Member'} submitted ${context.formatCurrency(loan.amount)} for ${group?.name || 'loan group'} (${loan.loanId}) and is ready for admin review.`,
      loanId: loan.id,
      memberId: loan.memberId,
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
    context.notifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'LOAN_STATUS_UPDATE',
      recipient: 'MEMBER',
      title,
      message,
      loanId: loan.id,
      memberId: loan.memberId,
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  createGuarantorNotifications(context: CooperativeNotificationContext, loan: CooperativeLoan): void {
    (loan.guarantors || []).forEach((guarantor: CooperativeLoanGuarantor) => {
      if (guarantor.status !== 'PENDING') {
        return;
      }

      const guarantorMember = context.getMemberById(guarantor.memberId);
      context.notifications.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'GUARANTOR_REQUEST',
        recipient: 'MEMBER',
        title: 'Guarantor Request',
        message: `You were requested as guarantor for loan ${loan.loanId} (${context.formatCurrency(guarantor.guaranteedAmount)}).`,
        loanId: loan.id,
        memberId: guarantorMember?.id || guarantor.memberId,
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
    const loan = context.getLoanById(repayment.loanId);
    if (!loan) {
      return;
    }

    context.notifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'LOAN_REPAYMENT_REMINDER',
      recipient: 'MEMBER',
      title: 'Repayment Reminder',
      message: `${message} Loan ${loan.loanId} installment due ${new Date(repayment.dueDate).toDateString()}.`,
      loanId: loan.id,
      memberId: loan.memberId,
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  createCreditReportNotification(context: CooperativeNotificationContext, repayment: CooperativeRepayment): void {
    const loan = context.getLoanById(repayment.loanId);
    if (!loan) {
      return;
    }

    context.notifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'LOAN_STATUS_UPDATE',
      recipient: 'MEMBER',
      title: 'Credit Bureau Alert',
      message: `Loan ${loan.loanId} has exceeded delinquency threshold and is flagged for credit bureau reporting.`,
      loanId: loan.id,
      memberId: loan.memberId,
      createdAt: new Date().toISOString(),
      read: false
    });
  }
}

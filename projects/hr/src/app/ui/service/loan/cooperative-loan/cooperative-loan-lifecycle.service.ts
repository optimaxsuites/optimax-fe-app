import { Injectable } from '@angular/core';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeLoanGuarantor, CooperativeNotification } from './cooperative.types';

export interface CooperativeLoanLifecycleContext {
  loans: CooperativeLoan[];
  notifications: CooperativeNotification[];
  saveToStorage: () => void;
  generateNextInternalLoanId: () => string;
  generateNextPublicLoanCode: () => string;
  createPendingApprovalNotification: (loan: CooperativeLoan) => void;
  createMemberStatusNotification: (loan: CooperativeLoan, title: string, message: string) => void;
  createGuarantorNotifications: (loan: CooperativeLoan) => void;
  generateRepaymentSchedule: (loan: CooperativeLoan) => void;
}

@Injectable({
  providedIn: 'root'
})
export class CooperativeLoanLifecycleService {
  addLoan(
    context: CooperativeLoanLifecycleContext,
    loan: Omit<CooperativeLoan, 'id' | 'loanId' | 'createdAt' | 'updatedAt'>
  ): CooperativeLoan {
    const normalizedGuarantors: CooperativeLoanGuarantor[] = (loan['guarantors'] || []).map((item: any) => ({
      memberId: String(item.memberId || '').trim(),
      guaranteedAmount: Number(item.guaranteedAmount || 0),
      status: item.status || 'PENDING',
      requestedAt: item.requestedAt || new Date().toISOString(),
      decidedAt: item.decidedAt,
      note: item.note
    })).filter((item: CooperativeLoanGuarantor) => !!item.memberId && item.guaranteedAmount > 0);

    const initialStage = loan['status'] === 'PENDING'
      ? normalizedGuarantors.some((item: CooperativeLoanGuarantor) => item.status === 'PENDING')
        ? 'PENDING_GUARANTOR_APPROVAL'
        : 'READY_FOR_ADMIN_REVIEW'
      : loan['applicationStage'];

    const newLoan: CooperativeLoan = {
      ...loan,
      groupId: String(loan['groupId'] || loan['groupId'] || ''),
      id: context.generateNextInternalLoanId(),
      loanId: context.generateNextPublicLoanCode(),
      totalPrincipalPaid: Number(loan['totalPrincipalPaid'] || 0),
      totalInterestPaid: Number(loan['totalInterestPaid'] || 0),
      outstandingPrincipal: Number(loan['outstandingPrincipal'] ?? loan['amount'] ?? 0),
      applicationStage: initialStage,
      guarantors: normalizedGuarantors,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    context.loans.push(newLoan);

    if (newLoan.status === 'PENDING') {
      if (newLoan.applicationStage === 'READY_FOR_ADMIN_REVIEW') {
        context.createPendingApprovalNotification(newLoan);
      } else {
        context.createGuarantorNotifications(newLoan);
      }
    }

    context.saveToStorage();
    return { ...newLoan };
  }

  updateLoan(context: CooperativeLoanLifecycleContext, loan: CooperativeLoan): CooperativeLoan {
    const index = context.loans.findIndex(l => l.id === loan.id);
    if (index !== -1) {
      loan.updatedAt = new Date().toISOString();
      context.loans[index] = loan;
      context.saveToStorage();
    }
    return { ...loan };
  }

  approveLoan(context: CooperativeLoanLifecycleContext, id: string): CooperativeLoan | undefined {
    const loan = context.loans.find(item => item.id === id);
    if (!loan || loan.status !== 'PENDING') {
      return undefined;
    }

    if (loan.applicationStage === 'PENDING_GUARANTOR_APPROVAL') {
      return undefined;
    }

    loan.status = 'APPROVED';
    loan.approvedDate = new Date().toISOString();
    loan.fundsReserved = true;
    loan.applicationStage = 'UNDER_ADMIN_REVIEW';
    loan.updatedAt = new Date().toISOString();

    context.createMemberStatusNotification(
      loan,
      'Loan Approved',
      `Your loan ${loan.loanId} has been approved and funds are marked for disbursement.`
    );

    context.saveToStorage();
    return { ...loan };
  }

  disburseLoan(context: CooperativeLoanLifecycleContext, id: string): CooperativeLoan | undefined {
    const loan = context.loans.find(item => item.id === id);
    if (!loan || loan.status !== 'APPROVED') {
      return undefined;
    }

    loan.status = 'ACTIVE';
    loan.disbursedDate = new Date().toISOString();
    loan.fundsReserved = false;
    loan.applicationStage = undefined;
    loan.totalPrincipalPaid = Number(loan.totalPrincipalPaid || 0);
    loan.totalInterestPaid = Number(loan.totalInterestPaid || 0);
    loan.outstandingPrincipal = Number(loan.outstandingPrincipal ?? loan.amount ?? 0);
    loan.updatedAt = new Date().toISOString();

    context.generateRepaymentSchedule(loan);
    context.createMemberStatusNotification(
      loan,
      'Loan Disbursed',
      `Your loan ${loan.loanId} has been disbursed and is now active with repayment schedule generated.`
    );

    context.saveToStorage();
    return { ...loan };
  }

  rejectLoan(context: CooperativeLoanLifecycleContext, id: string, reason: string): CooperativeLoan | undefined {
    const loan = context.loans.find(item => item.id === id);
    if (!loan || !reason.trim()) {
      return undefined;
    }

    loan.status = 'REJECTED';
    loan.rejectionReason = reason.trim();
    loan.fundsReserved = false;
    loan.applicationStage = undefined;
    loan.updatedAt = new Date().toISOString();

    context.createMemberStatusNotification(
      loan,
      'Loan Rejected',
      `Your loan ${loan.loanId} was rejected. Reason: ${loan.rejectionReason}`
    );

    context.saveToStorage();
    return { ...loan };
  }

  requestLoanChanges(context: CooperativeLoanLifecycleContext, id: string, note: string): CooperativeLoan | undefined {
    const loan = context.loans.find(item => item.id === id);
    if (!loan || !note.trim()) {
      return undefined;
    }

    loan.adminRequestNote = note.trim();
    loan.applicationStage = 'INFO_REQUESTED';
    loan.infoRequestedDate = new Date().toISOString();
    loan.updatedAt = new Date().toISOString();

    context.notifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'LOAN_INFO_REQUESTED',
      recipient: 'MEMBER',
      title: 'Additional Information Requested',
      message: `Admin requested updates on loan ${loan.loanId}: ${loan.adminRequestNote}`,
      loanId: loan.id,
      memberId: String(loan.memberId || loan.cooperativeMemberId || ''),
      createdAt: new Date().toISOString(),
      read: false
    });

    context.saveToStorage();
    return { ...loan };
  }

  setLoanPendingReview(context: CooperativeLoanLifecycleContext, id: string, note?: string): CooperativeLoan | undefined {
    const loan = context.loans.find(item => item.id === id);
    if (!loan) {
      return undefined;
    }

    if (loan.status !== 'PENDING' && loan.status !== 'APPROVED') {
      return undefined;
    }

    loan.status = 'PENDING';
    loan.applicationStage = 'READY_FOR_ADMIN_REVIEW';
    if (note?.trim()) {
      loan.adminRequestNote = note.trim();
    }
    loan.updatedAt = new Date().toISOString();
    context.saveToStorage();
    return { ...loan };
  }

  submitGuarantorDecision(
    context: CooperativeLoanLifecycleContext,
    loanId: string,
    guarantorMemberId: string,
    decision: 'APPROVED' | 'REJECTED' | 'EXPIRED',
    note?: string
  ): CooperativeLoan | undefined {
    const loan = context.loans.find(item => item.id === loanId);
    if (!loan || loan.status !== 'PENDING' || !loan.guarantors?.length) {
      return undefined;
    }

    const guarantor = loan.guarantors.find(item => item.memberId === guarantorMemberId);
    if (!guarantor || guarantor.status !== 'PENDING') {
      return undefined;
    }

    guarantor.status = decision;
    guarantor.decidedAt = new Date().toISOString();
    guarantor.note = note?.trim() || guarantor.note;
    loan.updatedAt = new Date().toISOString();

    context.notifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'GUARANTOR_STATUS_UPDATE',
      recipient: 'MEMBER',
      title: 'Guarantor Update',
      message: `A guarantor responded ${decision} for loan ${loan.loanId}.`,
      loanId: loan.id,
      memberId: String(loan.memberId || loan.cooperativeMemberId || ''),
      createdAt: new Date().toISOString(),
      read: false
    });

    const hasFailed = loan.guarantors.some(item => item.status === 'REJECTED' || item.status === 'EXPIRED');
    const allApproved = loan.guarantors.every(item => item.status === 'APPROVED');

    if (hasFailed) {
      loan.status = 'REJECTED';
      loan.rejectionReason = 'Guarantor approval failed. Please submit a fresh application.';
      loan.applicationStage = undefined;
      context.createMemberStatusNotification(
        loan,
        'Loan Rejected',
        `Loan ${loan.loanId} was rejected because one or more guarantor approvals failed.`
      );
    } else if (allApproved) {
      loan.applicationStage = 'READY_FOR_ADMIN_REVIEW';
      context.createPendingApprovalNotification(loan);
    } else {
      loan.applicationStage = 'PENDING_GUARANTOR_APPROVAL';
    }

    context.saveToStorage();
    return { ...loan };
  }
}

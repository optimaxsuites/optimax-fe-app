import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, catchError, map, tap } from 'rxjs';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { 
  CooperativeMember, 
  CooperativeLoanGroup,
  CooperativeGroupMembership,
  CooperativeContributionEntry,
  CooperativeGroupInviteHistoryEntry,
  CooperativeRepayment,
  CooperativeStats,
  CooperativeNotification,
  CooperativeEmployeeProfile,
  CooperativeMembershipEligibility,
  CooperativeMembershipActionResult,
  CooperativeMembershipApplication,
} from './cooperative.types';
import { CooperativeMembershipContext, CooperativeMembershipService } from './cooperative-membership.service';
import { CooperativeNotificationContext, CooperativeNotificationService } from './cooperative-notification.service';
import {
  CooperativeGroupApiContributionHistory,
  CooperativeGroupApiPayload,
  CooperativeGroupApiResponse
} from './cooperative-group.service';
import {
  CooperativeLoanApiCreatePayload,
  CooperativeLoanApiContributionHistory,
  CooperativeLoanApiGroupRef,
  CooperativeLoanApiMemberRef,
  CooperativeLoanApiMemberPayload,
  CooperativeLoanApiPaymentHistory,
  CooperativeLoanApiResponse,
  CooperativeLoanApiService,
  CooperativeLoanApiStatusHistory,
  CooperativeLoanApiUpdatePayload,
  CooperativeLoanStatsResponse
} from './cooperative-loan.service';
import { CooperativeGroupContext, CooperativeGroupService } from './cooperative-group.service';
import { CooperativeRepaymentContext, CooperativeRepaymentService } from './cooperative-repayment.service';
import { group } from '@angular/animations';

interface PendingMembershipApplication {
  id: string;
  employeeId: string;
  fullName: string;
  requestedTier: string;
  source: 'SELF' | 'ADMIN_INVITE';
  requestDate: string;
  note?: string;
  status: 'PENDING_MANAGER_APPROVAL';
}

@Injectable({
  providedIn: 'root'
})
export class CooperativeService {
    constructor() {
      this.loadFromStorage();
      this.applyDashboardTestingReset();
      this.initializeSampleData();
    }
    private getGroupContext(): CooperativeGroupContext {
      return {
        groups: this.groups,
        members: this.members,
        groupMemberships: this.groupMemberships,
        contributionEntries: this.contributionEntries,
        saveToStorage: () => this.saveToStorage()
      };
    }
  private readonly cooperativeMembershipService = inject(CooperativeMembershipService);
  private readonly cooperativeNotificationService = inject(CooperativeNotificationService);
  private readonly cooperativeLoanApiService = inject(CooperativeLoanApiService);
  private readonly cooperativeGroupService = inject(CooperativeGroupService);
  private readonly cooperativeRepaymentService = inject(CooperativeRepaymentService);
  private storageKey = 'cooperative_data';
  private readonly dashboardTestingResetKey = `${this.storageKey}_dashboard_testing_reset_v1`;
  private readonly skipGroupMembershipSeedKey = `${this.storageKey}_skip_group_membership_seed`;
  private readonly repaymentDueDay = 15;
  private readonly repaymentGraceDays = 5;
  private readonly repaymentOverdueDays = 15;
  private readonly lateFeeRate = 0.02;
  private readonly creditReportDays = 30;
  
  private members: CooperativeMember[] = [];
  private loans: CooperativeLoan[] = [];
  private groups: CooperativeLoanGroup[] = [];
  private groupMemberships: CooperativeGroupMembership[] = [];
  private contributionEntries: CooperativeContributionEntry[] = [];
  private groupInviteHistory: CooperativeGroupInviteHistoryEntry[] = [];
  private repayments: CooperativeRepayment[] = [];
  private notifications: CooperativeNotification[] = [];
  private pendingMembershipApplications: PendingMembershipApplication[] = [];
  
  private membersSubject = new BehaviorSubject<CooperativeMember[]>([]);
  private loansSubject = new BehaviorSubject<CooperativeLoan[]>([]);
  private notificationsSubject = new BehaviorSubject<CooperativeNotification[]>([]);
  private statsSnapshot?: CooperativeStats;
  private memberApiRecords: Record<string, CooperativeLoanApiMemberRef> = {};
  private groupApiRecords: Record<string, CooperativeGroupApiResponse> = {};

  // Removed duplicate constructor

  // ==================== INITIALIZATION ====================

  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        let hasNormalizedLoanIds = false;
        const data = JSON.parse(stored);
        this.members = data.members || [];
        this.loans = data.loans || [];
        this.groups = (data.groups || []).map((group: any) => ({
          ...group,
          minEligibleSalary: Number(group.minEligibleSalary || 0),
          monthlyContributionAmount: Number(group.monthlyContributionAmount || 0),
          maxBorrowingPercentage: Number(group.maxBorrowingPercentage || 0),
          minMemberTenureMonths: group.minMemberTenureMonths ?? 6,
          patronageEligible: group.patronageEligible ?? true,
          patronageRate: group.patronageRate ?? 0,
          requiresGuarantors: group.requiresGuarantors ?? false,
          minimumGuarantors: group.minimumGuarantors ?? 0,
          quickDisbursement: group.quickDisbursement ?? false
        }));
        this.loans = (data.loans || []).map((loan: any) => ({
          ...loan,
          loanCode: String(loan.loanCode || loan.loanId || ''),
          loanId: String(loan.loanId || loan.loanCode || ''),
          cooperativeMemberId: String(loan.cooperativeMemberId || loan.memberId || ''),
          memberId: String(loan.memberId || loan.cooperativeMemberId || ''),
          cooperativeGroupId: String(loan.cooperativeGroupId || loan.groupId || ''),
          groupId: String(loan.groupId || loan.cooperativeGroupId || ''),
          repaymentAmount: Number(loan.repaymentAmount || 0),
          repaymentTime: Number((loan.repaymentTime ?? loan.duration) || 0),
          duration: Number((loan.duration ?? loan.repaymentTime) || 0),
          requestDate: loan.requestDate || loan.applicationDate || new Date().toISOString(),
          applicationDate: loan.applicationDate || loan.requestDate || new Date().toISOString(),
          disbursedDate: loan.disbursedDate || '',
          completedDate: loan.completedDate || loan.completionDate || '',
          completionDate: loan.completionDate || loan.completedDate || '',
          adminComment: loan.adminComment || loan.adminRequestNote || '',
          adminRequestNote: loan.adminRequestNote || loan.adminComment || '',
          totalPaid: Number(loan.totalPaid || 0),
          totalRepayment: Number(loan.totalRepayment || 0),
          interestRate: Number(loan.interestRate || 0),
          modeOfPayment: loan.modeOfPayment || 'MONTHLY',
          totalPrincipalPaid: Number(loan.totalPrincipalPaid || 0),
          totalInterestPaid: Number(loan.totalInterestPaid || 0),
          outstandingPrincipal: Number(loan.outstandingPrincipal ?? loan.amount ?? 0),
          applicationStage:
            loan.applicationStage ||
            (loan.status === 'PENDING' ? 'READY_FOR_ADMIN_REVIEW' : undefined),
          guarantors: (loan.guarantors || []).map((guarantor: any) => ({
            memberId: String(guarantor.memberId || ''),
            guaranteedAmount: Number(guarantor.guaranteedAmount || 0),
            status: guarantor.status || 'PENDING',
            requestedAt: guarantor.requestedAt || loan.applicationDate || loan.requestDate || new Date().toISOString(),
            decidedAt: guarantor.decidedAt,
            note: guarantor.note
          }))
        }));
        this.repayments = data.repayments || [];
        this.repayments = (data.repayments || []).map((repayment: any) => ({
          ...repayment,
          amount: Number(repayment.amount || 0),
          principalComponent: Number(repayment.principalComponent || 0),
          interestComponent: Number(repayment.interestComponent || 0),
          lateFeeAmount: Number(repayment.lateFeeAmount || 0),
          receiptNumber: repayment.receiptNumber || undefined,
          reminderSentAt: repayment.reminderSentAt || undefined,
          creditReportedAt: repayment.creditReportedAt || undefined
        }));
        this.notifications = (data.notifications || []).map((notification: any) => ({
          ...notification,
          type: notification.type || 'LOAN_PENDING_APPROVAL',
          recipient: notification.recipient || 'ADMIN'
        }));
        this.pendingMembershipApplications = (data.pendingMembershipApplications || []).map((item: any) => ({
          id: String(item.id || ''),
          employeeId: String(item.employeeId || ''),
          fullName: String(item.fullName || 'Employee'),
          requestedTier: String(item.requestedTier || 'STANDARD'),
          source: item.source === 'ADMIN_INVITE' ? 'ADMIN_INVITE' : 'SELF',
          requestDate: item.requestDate || new Date().toISOString(),
          note: item.note,
          status: 'PENDING_MANAGER_APPROVAL'
        }));
        this.groupMemberships = (data.groupMemberships || []).map((membership: any) => ({
          id: String(membership.id || ''),
          memberId: String(membership.memberId || ''),
          groupId: String(membership.groupId || ''),
          status: membership.status || 'PENDING',
          monthlyContributionAmount: Number(membership.monthlyContributionAmount || 0),
          totalContribution: Number(membership.totalContribution || 0),
          joinedAt: membership.joinedAt || '',
          requestedAt: membership.requestedAt || membership.joinedAt || new Date().toISOString(),
          reviewedAt: membership.reviewedAt,
          reviewNote: membership.reviewNote,
          rejectionReason: membership.rejectionReason,
          lastContributionDate: membership.lastContributionDate
        }));
        this.contributionEntries = (data.contributionEntries || []).map((entry: any) => ({
          id: String(entry.id || ''),
          membershipId: String(entry.membershipId || ''),
          memberId: String(entry.memberId || ''),
          groupId: String(entry.groupId || ''),
          amount: Number(entry.amount || 0),
          contributionMonth: String(entry.contributionMonth || ''),
          contributedAt: entry.contributedAt || new Date().toISOString(),
          status: 'POSTED'
        }));
        this.groupInviteHistory = (data.groupInviteHistory || []).map((entry: any) => ({
          id: String(entry.id || ''),
          groupId: String(entry.groupId || ''),
          employeeId: String(entry.employeeId || ''),
          employeeName: String(entry.employeeName || 'Employee'),
          employeeEmail: String(entry.employeeEmail || ''),
          department: String(entry.department || 'Unassigned'),
          rank: entry.rank || 'JUNIOR',
          tenureMonths: Number(entry.tenureMonths || 0),
          sentAt: entry.sentAt || new Date().toISOString(),
          subject: String(entry.subject || 'New cooperative group available'),
          message: String(entry.message || '')
        }));

        hasNormalizedLoanIds = this.normalizeLoanIdentifiers();
        if (hasNormalizedLoanIds) {
          this.saveToStorage();
        }
      } catch (e) {
        console.error('Failed to load data', e);
      }
    }
  }

  private normalizeLoanIdentifiers(): boolean {
    let changed = false;
    const usedInternalIds = new Set(this.loans.map(loan => String(loan.id || '')));
    const usedLoanCodes = new Set(this.loans.map(loan => String(loan.loanCode || loan.loanId || '')));
    const internalIdRemap = new Map<string, string>();

    for (let i = 0; i < this.loans.length; i += 1) {
      const loan = this.loans[i];
      const originalInternalId = String(loan.id || '');
      const originalLoanCode = String(loan.loanCode || loan.loanId || '');
      const originalMemberId = String(loan.cooperativeMemberId || loan.memberId || '');

      const requiresInternalIdRefresh =
        !originalInternalId ||
        originalInternalId === originalMemberId ||
        /^\d+$/.test(originalInternalId);

      if (requiresInternalIdRefresh) {
        usedInternalIds.delete(originalInternalId);
        const refreshedInternalId = this.generateNextInternalLoanId(usedInternalIds);
        loan.id = refreshedInternalId;
        usedInternalIds.add(refreshedInternalId);
        changed = true;

        if (originalInternalId && originalInternalId !== refreshedInternalId) {
          internalIdRemap.set(originalInternalId, refreshedInternalId);
        }
      }

      const requiresLoanCodeRefresh =
        !originalLoanCode ||
        originalLoanCode === originalMemberId ||
        originalLoanCode === String(loan.id || '');

      if (requiresLoanCodeRefresh) {
        usedLoanCodes.delete(originalLoanCode);
        const refreshedLoanCode = this.generateNextPublicLoanCode(usedLoanCodes);
        loan.loanCode = refreshedLoanCode;
        loan.loanId = refreshedLoanCode;
        usedLoanCodes.add(refreshedLoanCode);
        changed = true;
      }
    }

    if (internalIdRemap.size > 0) {
      this.repayments = this.repayments.map(repayment => ({
        ...repayment,
        loanId: internalIdRemap.get(String(repayment.loanId || '')) || repayment.loanId
      }));

      this.notifications = this.notifications.map(notification => ({
        ...notification,
        loanId: internalIdRemap.get(String(notification.loanId || '')) || notification.loanId
      }));
      changed = true;
    }

    return changed;
  }

  private generateNextInternalLoanId(existingIds?: Set<string>): string {
    const usedIds = existingIds || new Set(this.loans.map(item => String(item.id || '')));
    let sequence = this.loans.length + 1;
    let candidate = '';

    do {
      candidate = `CLN-${String(sequence).padStart(3, '0')}`;
      sequence += 1;
    } while (usedIds.has(candidate));

    return candidate;
  }

  private generateNextPublicLoanCode(existingCodes?: Set<string>): string {
    const usedCodes = existingCodes || new Set(this.loans.map(item => String(item.loanCode || item.loanId || '')));
    let sequence = this.loans.length + 1;
    let candidate = '';

    do {
      candidate = `COPLO-${String(sequence).padStart(3, '0')}`;
      sequence += 1;
    } while (usedCodes.has(candidate));

    return candidate;
  }

  private saveToStorage(): void {
    const hasNormalizedLoanIds = this.normalizeLoanIdentifiers();
    const payload = {
      members: this.members,
      loans: this.loans,
      groups: this.groups,
      contributionEntries: this.contributionEntries,
      groupInviteHistory: this.groupInviteHistory,
      repayments: this.repayments,
      notifications: this.notifications,
      pendingMembershipApplications: this.pendingMembershipApplications,
      groupMemberships: this.groupMemberships
    };

    localStorage.setItem(this.storageKey, JSON.stringify(payload));
    this.publishState();

    if (hasNormalizedLoanIds) {
      localStorage.setItem(this.storageKey, JSON.stringify({
        ...payload,
        loans: this.loans,
        repayments: this.repayments,
        notifications: this.notifications
      }));
    }
  }

  private applyDashboardTestingReset(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored || localStorage.getItem(this.dashboardTestingResetKey)) {
      return;
    }

    const hasLoans = this.loans.length > 0;
    const hasGroupJoinData = this.groupMemberships.length > 0;

    if (!hasLoans && !hasGroupJoinData) {
      localStorage.setItem(this.dashboardTestingResetKey, new Date().toISOString());
      return;
    }

    this.loans = [];
    this.contributionEntries = [];
    this.repayments = [];
    this.groupMemberships = [];
    this.notifications = this.notifications.filter(notification =>
      notification.type !== 'LOAN_PENDING_APPROVAL' &&
      notification.type !== 'GROUP_JOIN_REQUEST' &&
      notification.type !== 'GROUP_JOIN_STATUS_UPDATE'
    );

    localStorage.setItem(this.skipGroupMembershipSeedKey, 'true');
    localStorage.setItem(this.dashboardTestingResetKey, new Date().toISOString());
    this.saveToStorage();
  }

  private publishState(): void {
    this.membersSubject.next([...this.members]);
    this.loansSubject.next([...this.loans]);
    this.notificationsSubject.next(this.buildNotificationsSnapshot());
  }

  private buildNotificationsSnapshot(): CooperativeNotification[] {
    const derivedNotifications = this.buildDerivedNotifications().map((notification) => {
      const matchingStoredNotification = this.notifications.find((item) =>
        item.id === notification.id || this.getNotificationStateKey(item) === this.getNotificationStateKey(notification)
      );

      return matchingStoredNotification
        ? { ...notification, read: matchingStoredNotification.read }
        : notification;
    });

    const derivedKeys = new Set(derivedNotifications.map((notification) => this.getNotificationStateKey(notification)));
    const persistedNotifications = this.notifications.filter((notification) => {
      if (notification.id.startsWith('derived:')) {
        return false;
      }

      return !derivedKeys.has(this.getNotificationStateKey(notification));
    });

    return [...derivedNotifications, ...persistedNotifications]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .map((notification) => ({ ...notification }));
  }

  private buildDerivedNotifications(): CooperativeNotification[] {
    const derivedNotifications: CooperativeNotification[] = [];

    this.pendingMembershipApplications.forEach((application) => {
      derivedNotifications.push({
        id: `derived:membership-approval:${application.id}`,
        type: 'LOAN_STATUS_UPDATE',
        recipient: 'ADMIN',
        title: 'Membership Approval Pending',
        message: `${application.fullName} (${application.employeeId}) submitted a cooperative membership request and is pending manager approval.`,
        loanId: '',
        memberId: application.employeeId,
        createdAt: application.requestDate || new Date().toISOString(),
        read: false
      });
    });

    this.groupMemberships.forEach((membership) => {
      const member = this.getMemberById(membership.memberId);
      const group = this.getGroupById(membership.groupId);

      if (membership.status === 'PENDING') {
        derivedNotifications.push({
          id: `derived:group-join-request:${membership.id}`,
          type: 'GROUP_JOIN_REQUEST',
          recipient: 'ADMIN',
          title: 'Group Join Request',
          message: `${member?.fullName || 'Member'} requested to join ${group?.name || 'a cooperative group'} and is awaiting admin review.`,
          loanId: membership.id,
          memberId: membership.memberId,
          createdAt: membership.requestedAt || membership.joinedAt || new Date().toISOString(),
          read: false
        });
      }

      if (membership.status === 'ACTIVE' || membership.status === 'REJECTED') {
        derivedNotifications.push({
          id: `derived:group-join-status:${membership.id}:${membership.status}`,
          type: 'GROUP_JOIN_STATUS_UPDATE',
          recipient: 'MEMBER',
          title: membership.status === 'ACTIVE' ? 'Group Join Approved' : 'Group Join Request Rejected',
          message: membership.status === 'ACTIVE'
            ? `Your request to join ${group?.name || 'the selected group'} was approved${membership.reviewNote ? `: ${membership.reviewNote}` : '.'}`
            : `Your request to join ${group?.name || 'the selected group'} was rejected${membership.rejectionReason ? `: ${membership.rejectionReason}` : '.'}`,
          loanId: membership.id,
          memberId: membership.memberId,
          createdAt: membership.reviewedAt || membership.joinedAt || membership.requestedAt || new Date().toISOString(),
          read: false
        });
      }
    });

    this.loans.forEach((loan) => {
      const memberId = String(loan.memberId || loan.cooperativeMemberId || '');
      const member = memberId ? this.getMemberById(memberId) : undefined;
      const groupId = String(loan.groupId || loan.cooperativeGroupId || '');
      const group = groupId ? this.getGroupById(groupId) : undefined;
      const loanCode = String(loan.loanCode || loan.loanId || loan.id || '');

      if (loan.status === 'PENDING' || loan.applicationStage === 'READY_FOR_ADMIN_REVIEW' || loan.applicationStage === 'UNDER_ADMIN_REVIEW') {
        derivedNotifications.push({
          id: `derived:loan-pending:${loan.id}`,
          type: 'LOAN_PENDING_APPROVAL',
          recipient: 'ADMIN',
          title: 'Loan Pending Approval',
          message: `${member?.fullName || 'Member'} submitted ${this.formatCurrency(Number(loan.amount || 0))} for ${group?.name || 'loan group'} (${loanCode}) and is ready for admin review.`,
          loanId: loan.id,
          memberId,
          createdAt: loan.applicationDate || loan.requestDate || new Date().toISOString(),
          read: false
        });
      }

      if (loan.applicationStage === 'INFO_REQUESTED') {
        derivedNotifications.push({
          id: `derived:loan-info-requested:${loan.id}`,
          type: 'LOAN_INFO_REQUESTED',
          recipient: 'MEMBER',
          title: 'Additional Information Requested',
          message: loan.adminRequestNote
            ? `More information is required for loan ${loanCode}: ${loan.adminRequestNote}`
            : `More information is required for loan ${loanCode}.`,
          loanId: loan.id,
          memberId,
          createdAt: loan.updatedAt || loan.applicationDate || loan.requestDate || new Date().toISOString(),
          read: false
        });
      }

      if (loan.status === 'DEFAULTED') {
        derivedNotifications.push({
          id: `derived:loan-defaulted:${loan.id}`,
          type: 'LOAN_DEFAULTED',
          recipient: 'MEMBER',
          title: 'Loan Marked as Defaulted',
          message: `Your loan ${loanCode} has been marked as defaulted. Please contact the cooperative admin immediately.`,
          loanId: loan.id,
          memberId,
          createdAt: loan.defaultedDate || loan.updatedAt || new Date().toISOString(),
          read: false
        });
      }

      (loan.guarantors || [])
        .filter((guarantor) => String(guarantor.memberId || '') !== '')
        .filter((guarantor) => guarantor.status === 'PENDING')
        .forEach((guarantor) => {
          derivedNotifications.push({
            id: `derived:guarantor-request:${loan.id}:${String(guarantor.memberId)}`,
            type: 'GUARANTOR_REQUEST',
            recipient: 'MEMBER',
            title: 'Guarantor Request',
            message: `You were requested as guarantor for loan ${loanCode} (${this.formatCurrency(Number(guarantor.guaranteedAmount || 0))}).`,
            loanId: loan.id,
            memberId: String(guarantor.memberId),
            createdAt: guarantor.requestedAt || loan.applicationDate || loan.requestDate || new Date().toISOString(),
            read: false
          });
        });

      const openRepayments = this.repayments
        .filter((repayment) => String(repayment.loanId) === String(loan.id) && repayment.status !== 'PAID')
        .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());

      if (openRepayments.length === 0) {
        return;
      }

      const overdueRepayments = openRepayments.filter((repayment) => repayment.status === 'OVERDUE');
      const latestReminderAt = openRepayments
        .map((repayment) => repayment.reminderSentAt)
        .filter((value): value is string => !!value)
        .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];

      if (!latestReminderAt && overdueRepayments.length === 0) {
        return;
      }

      const totalOverdue = overdueRepayments.reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);
      const nextDue = openRepayments[0];
      const reminderMessage = overdueRepayments.length > 0
        ? `Reminder: ${overdueRepayments.length} repayment(s) are overdue for loan ${loanCode} totaling ${this.formatCurrency(totalOverdue)}.`
        : `Reminder: Your next repayment for loan ${loanCode} is due on ${new Date(nextDue.dueDate).toDateString()}.`;

      derivedNotifications.push({
        id: `derived:repayment-reminder:${loan.id}`,
        type: 'LOAN_REPAYMENT_REMINDER',
        recipient: 'MEMBER',
        title: 'Loan Repayment Reminder',
        message: reminderMessage,
        loanId: loan.id,
        memberId,
        createdAt: latestReminderAt || nextDue.dueDate,
        read: false
      });
    });

    return derivedNotifications;
  }

  private getNotificationStateKey(notification: CooperativeNotification): string {
    const normalizedLoanId = String(notification.loanId || '');
    const normalizedMemberId = String(notification.memberId || '');

    if (notification.type === 'GROUP_JOIN_STATUS_UPDATE' || notification.type === 'LOAN_STATUS_UPDATE') {
      return `${notification.type}:${normalizedLoanId}:${normalizedMemberId}:${notification.title}`;
    }

    return `${notification.type}:${normalizedLoanId}:${normalizedMemberId}`;
  }

  private ensureDefaultGroups(): boolean {
    const defaultGroups = this.getDefaultGroups();
    const existingGroupIds = new Set(this.groups.map(group => String(group.id)));
    const missingGroups = defaultGroups.filter(group => !existingGroupIds.has(group.id));

    if (missingGroups.length === 0) {
      return false;
    }

    this.groups = [...this.groups, ...missingGroups];
    return true;
  }

  private getDefaultGroups(): CooperativeLoanGroup[] {
    return [
      {
        id: '1',
        name: 'Home Renovation Group',
        description: 'Supports housing upgrades, rent support, and essential home improvement projects.',
        minEligibleSalary: 120000,
        monthlyContributionAmount: 15000,
        maxBorrowingPercentage: 220,
        minAmount: 50000,
        maxAmount: 1200000,
        interestRate: 5,
        minDuration: 3,
        maxDuration: 24,
        minMemberTenureMonths: 6,
        requiresShares: false,
        requiresGuarantors: false,
        minimumGuarantors: 0,
        patronageEligible: true,
        patronageRate: 12,
        status: 'ACTIVE'
      },
      {
        id: '2',
        name: 'Education Support Group',
        description: 'Designed for school fees, certification programs, and other education expenses.',
        minEligibleSalary: 100000,
        monthlyContributionAmount: 10000,
        maxBorrowingPercentage: 180,
        minAmount: 30000,
        maxAmount: 750000,
        interestRate: 8,
        minDuration: 3,
        maxDuration: 18,
        minMemberTenureMonths: 6,
        requiresShares: false,
        requiresGuarantors: true,
        minimumGuarantors: 2,
        patronageEligible: true,
        patronageRate: 10,
        status: 'ACTIVE'
      },
      {
        id: '3',
        name: 'Medical Emergency Group',
        description: 'Fast-response lending for urgent medical and emergency family needs.',
        minEligibleSalary: 80000,
        monthlyContributionAmount: 8000,
        maxBorrowingPercentage: 150,
        minAmount: 20000,
        maxAmount: 500000,
        interestRate: 6.5,
        minDuration: 1,
        maxDuration: 12,
        minMemberTenureMonths: 3,
        requiresShares: false,
        requiresGuarantors: false,
        minimumGuarantors: 0,
        patronageEligible: false,
        patronageRate: 0,
        status: 'ACTIVE'
      },
      {
        id: '4',
        name: 'Home Improvement Group',
        description: 'For home upgrades, repairs, and renovations.',
        minEligibleSalary: 150000,
        monthlyContributionAmount: 18000,
        maxBorrowingPercentage: 220,
        minAmount: 50000,
        maxAmount: 1200000,
        interestRate: 8.5,
        minDuration: 6,
        maxDuration: 24,
        minMemberTenureMonths: 6,
        requiresShares: false,
        requiresGuarantors: true,
        minimumGuarantors: 2,
        patronageEligible: true,
        patronageRate: 14,
        status: 'ACTIVE'
      },
      {
        id: '5',
        name: 'Vehicle & Mobility Group',
        description: 'For vehicle purchase, major repairs, and mobility tools required for daily work and family needs.',
        minEligibleSalary: 170000,
        monthlyContributionAmount: 22000,
        maxBorrowingPercentage: 260,
        minAmount: 100000,
        maxAmount: 1800000,
        interestRate: 7.8,
        minDuration: 4,
        maxDuration: 30,
        minMemberTenureMonths: 8,
        requiresShares: false,
        requiresGuarantors: true,
        minimumGuarantors: 1,
        patronageEligible: true,
        patronageRate: 16,
        status: 'ACTIVE'
      },
      {
        id: '6',
        name: 'Green Energy Upgrade Group',
        description: 'Helps finance solar installations, inverter systems, and other energy-saving home upgrades.',
        minEligibleSalary: 130000,
        monthlyContributionAmount: 12000,
        maxBorrowingPercentage: 210,
        minAmount: 60000,
        maxAmount: 900000,
        interestRate: 6.9,
        minDuration: 3,
        maxDuration: 24,
        minMemberTenureMonths: 6,
        requiresShares: false,
        requiresGuarantors: false,
        minimumGuarantors: 0,
        patronageEligible: true,
        patronageRate: 12,
        status: 'ACTIVE'
      },
      {
        id: '7',
        name: 'Celebration & Family Events Group',
        description: 'Designed for wedding, naming, and other planned family event expenses with controlled repayment.',
        minEligibleSalary: 110000,
        monthlyContributionAmount: 8000,
        maxBorrowingPercentage: 160,
        minAmount: 30000,
        maxAmount: 500000,
        interestRate: 6.2,
        minDuration: 2,
        maxDuration: 12,
        minMemberTenureMonths: 4,
        requiresShares: false,
        requiresGuarantors: false,
        minimumGuarantors: 0,
        patronageEligible: false,
        patronageRate: 0,
        status: 'INACTIVE'
      },
      {
        id: '8',
        name: 'Executive Flexi Capital Group',
        description: 'Premium group for senior staff requiring higher loan ceilings with stronger contribution history.',
        minEligibleSalary: 400000,
        monthlyContributionAmount: 50000,
        maxBorrowingPercentage: 400,
        minAmount: 300000,
        maxAmount: 5000000,
        interestRate: 9.1,
        minDuration: 6,
        maxDuration: 36,
        minMemberTenureMonths: 12,
        requiresShares: true,
        requiresGuarantors: true,
        minimumGuarantors: 2,
        patronageEligible: true,
        patronageRate: 10,
        status: 'ACTIVE'
      }
    ];
  }

  private initializeSampleData(): void {
    const shouldSkipGroupMembershipSeed = localStorage.getItem(this.skipGroupMembershipSeedKey) === 'true';
    const hasUpdatedGroups = this.ensureDefaultGroups();

    if (this.members.length === 0) {
      this.createSampleMembers();
      this.createSampleLoans();
      if (!shouldSkipGroupMembershipSeed && this.groupMemberships.length === 0) {
        this.createSampleGroupMemberships();
      }
      this.saveToStorage();
    } else if (this.groups.length === 0) {
      this.saveToStorage();
    } else if (!shouldSkipGroupMembershipSeed && this.groupMemberships.length === 0) {
      this.createSampleGroupMemberships();
      this.saveToStorage();
    } else if (hasUpdatedGroups) {
      this.saveToStorage();
    }

    const seedVersionKey = `${this.storageKey}_loan_group_seed_v2`;
    if (!shouldSkipGroupMembershipSeed && !localStorage.getItem(seedVersionKey)) {
      this.ensureDefaultGroups();
      this.createSampleGroupMemberships();
      localStorage.setItem(seedVersionKey, 'true');
      this.saveToStorage();
    }

    if (this.groupMemberships.length === 0 && this.contributionEntries.length > 0) {
      this.contributionEntries = [];
      this.saveToStorage();
    } else if (this.groupMemberships.length > 0 && this.contributionEntries.length === 0) {
      this.createContributionLedgerFromMemberships();
      this.saveToStorage();
    }

    this.publishState();
  }

  private createSampleGroupMemberships(): void {
    const now = new Date();
    const activeGroups = this.groups.filter(group => group.status === 'ACTIVE');

    if (activeGroups.length === 0 || this.members.length === 0) {
      this.groupMemberships = [];
      return;
    }

    this.groupMemberships = this.members.flatMap((member, memberIndex) => {
      const firstGroup = activeGroups[memberIndex % activeGroups.length];
      const secondGroup = activeGroups[(memberIndex + 2) % activeGroups.length];
      const thirdGroup = activeGroups[(memberIndex + 4) % activeGroups.length];
      const joinedGroups = [firstGroup, secondGroup, thirdGroup].filter(
        (group, index, self) => self.findIndex(item => item.id === group.id) === index
      );

      return joinedGroups.map((group, groupIndex) => {
        const monthsContributed = 5 + ((memberIndex + groupIndex) % 9);
        const joinedAt = new Date(now);
        joinedAt.setMonth(joinedAt.getMonth() - monthsContributed);

        return {
          id: `${member.id}-${group.id}`,
          memberId: member.id,
          groupId: group.id,
          status: 'ACTIVE' as const,
          monthlyContributionAmount: Number(group.monthlyContributionAmount || 0),
          totalContribution: Number((group.monthlyContributionAmount || 0) * monthsContributed),
          joinedAt: joinedAt.toISOString(),
          requestedAt: joinedAt.toISOString(),
          reviewedAt: joinedAt.toISOString(),
          reviewNote: 'Seeded active membership',
          lastContributionDate: now.toISOString()
        };
      });
    });
  }

  private createContributionLedgerFromMemberships(): void {
    this.contributionEntries = this.groupMemberships.flatMap(membership => {
      if (membership.status !== 'ACTIVE') {
        return [];
      }

      const monthlyContribution = Number(membership.monthlyContributionAmount || 0);
      const totalContribution = Number(membership.totalContribution || 0);
      if (monthlyContribution <= 0 || totalContribution <= 0) {
        return [];
      }

      const lastContributionDate = new Date(membership.lastContributionDate || membership.joinedAt || membership.requestedAt || new Date().toISOString());
      const entryAmounts: number[] = [];
      let remaining = totalContribution;

      while (remaining > 0) {
        const entryAmount = Math.min(monthlyContribution, remaining);
        entryAmounts.unshift(Number(entryAmount.toFixed(2)));
        remaining = Number((remaining - entryAmount).toFixed(2));
      }

      return entryAmounts.map((amount, index) => {
        const contributedAt = new Date(lastContributionDate);
        contributedAt.setMonth(lastContributionDate.getMonth() - (entryAmounts.length - index - 1));

        return {
          id: `${membership.id}-${String(index + 1).padStart(2, '0')}`,
          membershipId: membership.id,
          memberId: membership.memberId,
          groupId: membership.groupId,
          amount,
          contributionMonth: `${contributedAt.getFullYear()}-${String(contributedAt.getMonth() + 1).padStart(2, '0')}`,
          contributedAt: contributedAt.toISOString(),
          status: 'POSTED' as const
        };
      });
    });
  }

  private createSampleMembers(): void {
    const now = new Date().toISOString();
    this.members = [
      {
        id: '1',
        memberId: 'COP-001',
        fullName: 'Samuel Bamidele',
        email: 'samuel.bamidele@example.com',
        phone: '+234 803 123 4567',
        joinDate: '2022-11-15T10:30:00Z',
        status: 'ACTIVE',
        shareCapital: 280000,
        address: '23 Bourdillon Road, Ikoyi, Lagos',
        emergencyContact: {
          name: 'Temi Bamidele',
          phone: '+234 803 234 5678',
          relationship: 'Spouse'
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: '2',
        memberId: 'COP-002',
        fullName: 'Ruth Ekanem',
        email: 'ruth.ekanem@example.com',
        phone: '+234 803 234 5678',
        joinDate: '2023-01-20T09:15:00Z',
        status: 'ACTIVE',
        shareCapital: 220000,
        address: '15 Awolowo Road, Ikoyi, Lagos',
        emergencyContact: {
          name: 'Bassey Ekanem',
          phone: '+234 803 345 6789',
          relationship: 'Spouse'
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: '3',
        memberId: 'COP-003',
        fullName: 'Aisha Mohammed',
        email: 'aisha.mohammed@example.com',
        phone: '+234 803 345 6789',
        joinDate: '2023-03-10T14:30:00Z',
        status: 'ACTIVE',
        shareCapital: 160000,
        address: '7 Kano Street, Alimosho, Lagos',
        emergencyContact: {
          name: 'Ibrahim Mohammed',
          phone: '+234 803 456 7890',
          relationship: 'Brother'
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: '4',
        memberId: 'COP-004',
        fullName: 'Ifeanyi Nwosu',
        email: 'ifeanyi.nwosu@example.com',
        phone: '+234 803 456 7891',
        joinDate: '2022-09-12T11:00:00Z',
        status: 'ACTIVE',
        shareCapital: 320000,
        address: '11 Admiralty Way, Lekki, Lagos',
        emergencyContact: {
          name: 'Ada Nwosu',
          phone: '+234 803 456 7892',
          relationship: 'Sister'
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: '5',
        memberId: 'COP-005',
        fullName: 'Kemi Alade',
        email: 'kemi.alade@example.com',
        phone: '+234 803 567 8901',
        joinDate: '2023-04-05T09:20:00Z',
        status: 'ACTIVE',
        shareCapital: 190000,
        address: '6 GRA Phase 2, Port Harcourt',
        emergencyContact: {
          name: 'Tunde Alade',
          phone: '+234 803 567 8902',
          relationship: 'Spouse'
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: '6',
        memberId: 'COP-006',
        fullName: 'Bola Adeyemi',
        email: 'bola.adeyemi@example.com',
        phone: '+234 803 678 9012',
        joinDate: '2022-12-18T08:40:00Z',
        status: 'ACTIVE',
        shareCapital: 260000,
        address: '14 Toyin Street, Ikeja, Lagos',
        emergencyContact: {
          name: 'Mide Adeyemi',
          phone: '+234 803 678 9013',
          relationship: 'Brother'
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: '7',
        memberId: 'COP-007',
        fullName: 'Joy Olatunji',
        email: 'joy.olatunji@example.com',
        phone: '+234 803 789 0123',
        joinDate: '2023-06-01T13:10:00Z',
        status: 'ACTIVE',
        shareCapital: 140000,
        address: '33 New Bodija, Ibadan',
        emergencyContact: {
          name: 'Sola Olatunji',
          phone: '+234 803 789 0124',
          relationship: 'Sister'
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: '8',
        memberId: 'COP-008',
        fullName: 'Haruna Bello',
        email: 'haruna.bello@example.com',
        phone: '+234 803 890 1234',
        joinDate: '2022-10-08T15:05:00Z',
        status: 'ACTIVE',
        shareCapital: 310000,
        address: '8 Ahmadu Bello Way, Kaduna',
        emergencyContact: {
          name: 'Mariya Bello',
          phone: '+234 803 890 1235',
          relationship: 'Spouse'
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: '9',
        memberId: 'COP-009',
        fullName: 'Grace Essien',
        email: 'grace.essien@example.com',
        phone: '+234 803 901 2345',
        joinDate: '2023-02-14T12:00:00Z',
        status: 'ACTIVE',
        shareCapital: 175000,
        address: '20 Marian Road, Calabar',
        emergencyContact: {
          name: 'Ini Essien',
          phone: '+234 803 901 2346',
          relationship: 'Brother'
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: '10',
        memberId: 'COP-010',
        fullName: 'Daniel Okafor',
        email: 'daniel.okafor@example.com',
        phone: '+234 803 012 3456',
        joinDate: '2023-05-22T10:10:00Z',
        status: 'ACTIVE',
        shareCapital: 230000,
        address: '44 Trans-Amadi, Port Harcourt',
        emergencyContact: {
          name: 'Uju Okafor',
          phone: '+234 803 012 3457',
          relationship: 'Spouse'
        },
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  private createSampleLoans(): void {
    const now = new Date().toISOString();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    this.loans = [
      {
        id: 'CLN-001',
        loanCode: 'COPLO-001',
        loanId: 'COPLO-001',
        cooperativeMemberId: '1',
        memberId: '1',
        cooperativeGroupId: '1',
        groupId: '1',
        amount: 350000,
        purpose: 'Home renovation',
        repaymentAmount: 30625,
        duration: 12,
        repaymentTime: 12,
        interestRate: 5,
        totalRepayment: 367500,
        totalPaid: 0,
        totalPrincipalPaid: 0,
        totalInterestPaid: 0,
        outstandingPrincipal: 350000,
        modeOfPayment: 'MONTHLY',
        status: 'ACTIVE',
        applicationStage: 'READY_FOR_ADMIN_REVIEW',
        requestDate: sixMonthsAgo.toISOString(),
        applicationDate: sixMonthsAgo.toISOString(),
        approvedDate: sixMonthsAgo.toISOString(),
        disbursedDate: sixMonthsAgo.toISOString(),
        completedDate: '',
        rejectedDate: '',
        adminComment: '',
        guarantors: [],
        paymentHistory: [],
        statusHistory: [],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'CLN-002',
        loanCode: 'COPLO-002',
        loanId: 'COPLO-002',
        cooperativeMemberId: '2',
        memberId: '2',
        cooperativeGroupId: '2',
        groupId: '2',
        amount: 150000,
        purpose: 'Children\'s school fees',
        repaymentAmount: 18000,
        duration: 9,
        repaymentTime: 9,
        interestRate: 8,
        totalRepayment: 162000,
        totalPaid: 0,
        totalPrincipalPaid: 0,
        totalInterestPaid: 0,
        outstandingPrincipal: 150000,
        modeOfPayment: 'MONTHLY',
        status: 'ACTIVE',
        applicationStage: 'READY_FOR_ADMIN_REVIEW',
        guarantors: [
          {
            memberId: '1',
            guaranteedAmount: 80000,
            status: 'APPROVED',
            requestedAt: sixMonthsAgo.toISOString(),
            decidedAt: sixMonthsAgo.toISOString()
          },
          {
            memberId: '3',
            guaranteedAmount: 70000,
            status: 'APPROVED',
            requestedAt: sixMonthsAgo.toISOString(),
            decidedAt: sixMonthsAgo.toISOString()
          }
        ],
        requestDate: sixMonthsAgo.toISOString(),
        applicationDate: sixMonthsAgo.toISOString(),
        approvedDate: sixMonthsAgo.toISOString(),
        disbursedDate: sixMonthsAgo.toISOString(),
        completedDate: '',
        rejectedDate: '',
        adminComment: '',
        paymentHistory: [],
        statusHistory: [],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 3,
        loanCode: 'COPLO-003',
        loanId: 'COPLO-003',
        cooperativeMemberId: '3',
        memberId: '3',
        cooperativeGroupId: '3',
        groupId: '3',
        amount: 50000,
        purpose: 'Medical emergency',
        repaymentAmount: 17750,
        duration: 3,
        repaymentTime: 3,
        interestRate: 6.5,
        totalRepayment: 53250,
        totalPaid: 53250,
        totalPrincipalPaid: 50000,
        totalInterestPaid: 3250,
        outstandingPrincipal: 0,
        modeOfPayment: 'MONTHLY',
        status: 'COMPLETED',
        applicationStage: 'READY_FOR_ADMIN_REVIEW',
        requestDate: '2023-08-01T10:00:00Z',
        applicationDate: '2023-08-01T10:00:00Z',
        approvedDate: '2023-08-03T10:00:00Z',
        disbursedDate: '2023-08-05T10:00:00Z',
        completedDate: '2023-11-05T10:00:00Z',
        completionDate: '2023-11-05T10:00:00Z',
        rejectedDate: '',
        adminComment: '',
        guarantors: [],
        paymentHistory: [],
        statusHistory: [],
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  // ==================== MEMBER METHODS ====================

  getMembers(): Observable<CooperativeMember[]> {
    return this.cooperativeLoanApiService.getAllMembers().pipe(
      map((rawMembers) => {
        const members = rawMembers.map((member) => this.mapApiMemberToMember(member));
        this.syncMemberCache(members, rawMembers);
        return members;
      }),
      catchError((error) => {
        console.error('Failed to load cooperative members', error);
        return of([...this.members]);
      })
    );
  }

  getMembersObservable(): Observable<CooperativeMember[]> {
    return this.membersSubject.asObservable();
  }

  getMemberById(id: string): CooperativeMember | undefined {
    return this.members.find(m => m.id === id || m.memberId === id || m.employeeId === id);
  }

  addMember(member: Omit<CooperativeMember, 'id' | 'memberId' | 'createdAt' | 'updatedAt'>): Observable<CooperativeMember> {
    return this.cooperativeLoanApiService.createMember(this.buildMemberApiPayload(member)).pipe(
      map((rawMember) => {
        const createdMember = this.mergeMemberLocalFields(this.mapApiMemberToMember(rawMember), member);
        this.upsertMemberInCache(createdMember, rawMember);
        return createdMember;
      })
    );
  }

  updateMember(member: CooperativeMember): Observable<CooperativeMember> {
    return this.cooperativeLoanApiService.updateMember(this.toNumberId(member.id), this.buildMemberApiPayload(member)).pipe(
      map((rawMember) => {
        const updatedMember = this.mergeMemberLocalFields(this.mapApiMemberToMember(rawMember), member);
        this.upsertMemberInCache(updatedMember, rawMember);
        return updatedMember;
      })
    );
  }

  loadMemberById(id: string): Observable<CooperativeMember | undefined> {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      return of(this.getMemberById(id));
    }

    return this.cooperativeLoanApiService.getMemberById(numericId).pipe(
      map((rawMember) => {
        const member = this.mergeMemberLocalFields(this.mapApiMemberToMember(rawMember), this.getMemberById(id));
        this.upsertMemberInCache(member, rawMember);
        return member;
      }),
      catchError((error) => {
        console.error('Failed to load cooperative member', error);
        return of(this.getMemberById(id));
      })
    );
  }

  deleteMember(id: string): boolean {
    const index = this.members.findIndex(m => m.id === id);
    if (index !== -1) {
      this.members.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  private getMembershipContext(): CooperativeMembershipContext {
    return {
      members: this.members,
      pendingMembershipApplications: this.pendingMembershipApplications,
      notifications: this.notifications,
      saveToStorage: () => this.saveToStorage()
    };
  }

  private getNotificationContext(): CooperativeNotificationContext {
    return {
      notifications: this.notifications,
      saveToStorage: () => this.saveToStorage(),
      getMemberById: (id) => this.getMemberById(id),
      getLoanById: (id) => this.getLoanById(id),
      getGroupById: (id) => this.getGroupById(id),
      formatCurrency: (amount) => this.formatCurrency(amount)
    };
  }

  private getRepaymentContext(): CooperativeRepaymentContext {
    return {
      loans: this.loans,
      repayments: this.repayments,
      notifications: this.notifications,
      repaymentDueDay: this.repaymentDueDay,
      repaymentGraceDays: this.repaymentGraceDays,
      repaymentOverdueDays: this.repaymentOverdueDays,
      lateFeeRate: this.lateFeeRate,
      creditReportDays: this.creditReportDays,
      saveToStorage: () => this.saveToStorage(),
      formatCurrency: (amount) => this.formatCurrency(amount),
      createMemberStatusNotification: (loan, title, message) => this.createMemberStatusNotification(loan, title, message),
      createRepaymentReminderNotification: (repayment, message) => this.cooperativeNotificationService.createRepaymentReminderNotification(this.getNotificationContext(), repayment, message),
      createCreditReportNotification: (repayment) => this.cooperativeNotificationService.createCreditReportNotification(this.getNotificationContext(), repayment)
    };
  }

  // private getGroupContext(): CooperativeGroupContext {
  //   return {
  //     members: this.members,
  //     groups: this.groups,
  //     groupMemberships: this.groupMemberships,
  //     saveToStorage: () => this.saveToStorage()
  //   };
  // }

  // ==================== MEMBERSHIP POLICY ====================

  checkMembershipEligibility(employee: CooperativeEmployeeProfile): CooperativeMembershipEligibility {
    return this.cooperativeMembershipService.checkMembershipEligibility(employee);
  }

  applyForMembership(application: CooperativeMembershipApplication): CooperativeMembershipActionResult {
    return this.cooperativeMembershipService.applyForMembership(this.getMembershipContext(), application);
  }

  inviteEmployee(employee: CooperativeEmployeeProfile): CooperativeMembershipActionResult {
    return this.cooperativeMembershipService.inviteEmployee(this.getMembershipContext(), employee);
  }

  getPendingMembershipApplications(): Array<PendingMembershipApplication> {
    return this.cooperativeMembershipService.getPendingMembershipApplications(this.getMembershipContext());
  }

  private toStringId(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'object' && value !== null && 'id' in value) {
      return String((value as { id: string | number }).id);
    }

    return String(value);
  }

  private toNumberId(value: unknown): number {
    const numericValue = Number(this.toStringId(value));
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  private normalizeChangedBy(value: any): any {
    if (value && typeof value === 'object') {
      return {
        id: Number(value.id || 0),
        fullname: String(value.fullname || value.fullName || 'System'),
        userId: Number(value.userId || 0),
        email: String(value.email || ''),
        phoneNumber: String(value.phoneNumber || ''),
        username: String(value.username || ''),
        clientType: String(value.clientType || ''),
        gender: String(value.gender || ''),
        accountId: String(value.accountId || ''),
        address: String(value.address || ''),
        city: String(value.city || ''),
        state: String(value.state || ''),
        country: String(value.country || '')
      };
    }

    return {
      id: 0,
      fullname: 'System',
      userId: 0,
      email: '',
      phoneNumber: '',
      username: '',
      clientType: '',
      gender: '',
      accountId: '',
      address: '',
      city: '',
      state: '',
      country: ''
    };
  }

  private normalizeLoanStatusHistory(entries: CooperativeLoanApiStatusHistory[] | undefined): CooperativeLoan['statusHistory'] {
    return (entries || []).map((entry) => ({
      id: Number(entry.id || 0),
      status: String(entry.status || 'PENDING'),
      changedAt: entry.changedAt || new Date().toISOString(),
      changedBy: this.normalizeChangedBy(entry.changedBy),
      notes: String(entry.notes || ''),
      overrideOpen: Boolean(entry.overrideOpen),
      overrideBy: this.normalizeChangedBy(entry.overrideBy),
      overrideReason: String(entry.overrideReason || ''),
      statusBeforeOverride: String(entry.statusBeforeOverride || '')
    }));
  }

  private normalizeLoanPaymentHistory(entries: CooperativeLoanApiPaymentHistory[] | undefined): CooperativeLoan['paymentHistory'] {
    return (entries || []).map((entry) => ({
      id: Number(entry.id || 0),
      cooperativeLoan: null as unknown as CooperativeLoan,
      installmentNo: Number(entry.installmentNo || 0),
      paidAt: entry.paidAt || '',
      amount: Number(entry.amount || 0),
      modeofPayment: String(entry.paymentMethod || entry.modeofPayment || 'BANK_TRANSFER'),
      referenceNumber: String(entry.referenceNumber || ''),
      interest: Number(entry.interest || 0),
      remainingBalance: Number(entry.remainingBalance || 0),
      status: String(entry.status || 'PENDING'),
      lateFeeAmount: Number(entry.lateFeeAmount || 0),
      totalPayment: Number(entry.totalPayment || 0),
      notes: String(entry.notes || ''),
      receiptNumber: String(entry.receiptNumber || '')
    }));
  }

  private resolveLoanInterestRate(rawLoan: CooperativeLoanApiResponse): number {
    const directRate = Number((rawLoan as any).interestRate || 0);
    if (directRate > 0) {
      return directRate;
    }

    const groupRate = typeof rawLoan.cooperativeGroupId === 'object'
      ? Number(rawLoan.cooperativeGroupId?.interestRate || 0)
      : 0;
    if (groupRate > 0) {
      return groupRate;
    }

    const memberGroupRate = Array.isArray((rawLoan.cooperativeMemberId as CooperativeLoanApiMemberRef | undefined)?.cooperativeGroup)
      ? Number((rawLoan.cooperativeMemberId as CooperativeLoanApiMemberRef).cooperativeGroup?.[0]?.interestRate || 0)
      : 0;

    return memberGroupRate > 0 ? memberGroupRate : 0;
  }

  private resolveLoanTotalRepayment(rawLoan: CooperativeLoanApiResponse, interestRate: number): number {
    const repaymentAmount = Number(rawLoan.repaymentAmount || 0);
    const repaymentTime = Number(rawLoan.repaymentTime || 0);

    if (repaymentAmount > 0 && repaymentTime > 0) {
      return Number((repaymentAmount * repaymentTime).toFixed(2));
    }

    const amount = Number(rawLoan.amount || 0);
    if (amount <= 0) {
      return 0;
    }

    return Number((amount + (amount * interestRate) / 100).toFixed(2));
  }

  private normalizeGuarantors(rawGuarantors: CooperativeLoanApiResponse['guarantors'], loanAmount: number, requestedAt: string): CooperativeLoan['guarantors'] {
    const guarantorList = Array.isArray(rawGuarantors)
      ? rawGuarantors
      : rawGuarantors
        ? [rawGuarantors]
        : [];

    return guarantorList.map((guarantor) => ({
      memberId: this.toStringId(guarantor?.employee?.id || guarantor?.memberId || guarantor?.id),
      guaranteedAmount: Number(guarantor?.guaranteedAmount || loanAmount || 0),
      status: String(guarantor?.status || 'PENDING'),
      requestedAt: guarantor?.requestedAt || requestedAt,
      decidedAt: guarantor?.decidedAt,
      note: guarantor?.note
    }));
  }

  private mapBackendMemberToLocal(memberRef: CooperativeLoanApiMemberRef | number | string | undefined): CooperativeMember | undefined {
    if (!memberRef || typeof memberRef !== 'object' || !('id' in memberRef)) {
      return undefined;
    }

    const employee = memberRef.employee;
    const fullName = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || `Member ${memberRef.id}`;
    const contributionTotal = (memberRef.contributionHistory || []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const joinDate = this.resolveMemberJoinDate(memberRef, memberRef.contributionHistory);
    const existingMember = this.getMemberById(String(memberRef.id)) || this.getMemberById(String(memberRef.employeeId || ''));
    const now = new Date().toISOString();

    return {
      id: String(memberRef.id),
      employeeId: this.toStringId(memberRef.employeeId),
      memberId: existingMember?.memberId || this.generateMemberCode(memberRef.id),
      fullName,
      email: String(employee?.workEmail || employee?.email || ''),
      phone: String(employee?.phone || ''),
      joinDate,
      status: (memberRef.status as CooperativeMember['status']) || 'ACTIVE',
      shareCapital: contributionTotal > 0 ? Number(contributionTotal.toFixed(2)) : Number(existingMember?.shareCapital || 0),
      address: String(employee?.address || existingMember?.address || ''),
      emergencyContact: existingMember?.emergencyContact,
      createdAt: existingMember?.createdAt || joinDate || now,
      updatedAt: now
    };
  }

  private mapApiMemberToMember(rawMember: CooperativeLoanApiMemberRef): CooperativeMember {
    return this.mapBackendMemberToLocal(rawMember) || {
      id: String(rawMember.id),
      employeeId: this.toStringId(rawMember.employeeId),
      memberId: this.generateMemberCode(rawMember.id),
      fullName: `Member ${rawMember.id}`,
      email: '',
      phone: '',
      joinDate: new Date().toISOString(),
      status: 'ACTIVE',
      shareCapital: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private resolveMemberJoinDate(memberRef: CooperativeLoanApiMemberRef, contributions: CooperativeLoanApiContributionHistory[] | undefined): string {
    const firstContributionDate = [...(contributions || [])]
      .map((entry) => String(entry.date || '').trim())
      .filter(Boolean)
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0];

    return memberRef.employee?.employementStartDate || firstContributionDate || new Date().toISOString();
  }

  private generateMemberCode(id: number | string): string {
    const numericId = Number(id);
    if (Number.isFinite(numericId) && numericId > 0) {
      return `COP-${String(numericId).padStart(3, '0')}`;
    }

    return `COP-${String(id)}`;
  }

  private syncMemberCache(members: CooperativeMember[], rawMembers: CooperativeLoanApiMemberRef[]): void {
    this.memberApiRecords = rawMembers.reduce<Record<string, CooperativeLoanApiMemberRef>>((records, member) => {
      records[String(member.id)] = member;
      return records;
    }, {});

    this.members = members.map((member) => this.mergeMemberLocalFields(member, this.getMemberById(member.id) || this.getMemberById(member.employeeId || '')));
    rawMembers.forEach((member) => {
      (member.cooperativeGroup || []).forEach((group) => {
        this.upsertGroupInCache(this.mapApiGroupToGroup(group), false);
      });
    });
    this.rebuildDerivedMembershipStateFromApi();
    this.publishState();
  }

  private upsertMemberInCache(member: CooperativeMember, rawMember?: CooperativeLoanApiMemberRef): void {
    const existingIndex = this.members.findIndex((item) => String(item.id) === String(member.id));
    if (existingIndex === -1) {
      this.members = [member, ...this.members];
    } else {
      this.members = this.members.map((item, index) => (index === existingIndex ? member : item));
    }

    if (rawMember) {
      this.memberApiRecords[String(rawMember.id)] = rawMember;
      (rawMember.cooperativeGroup || []).forEach((group) => {
        this.upsertGroupInCache(this.mapApiGroupToGroup(group), false);
      });
    }

    this.rebuildDerivedMembershipStateFromApi();
    this.publishState();
  }

  private mergeMemberLocalFields(member: CooperativeMember, existingMember?: Partial<CooperativeMember>): CooperativeMember {
    return {
      ...member,
      employeeId: member.employeeId || String(existingMember?.employeeId || ''),
      memberId: member.memberId || String(existingMember?.memberId || ''),
      shareCapital: Number(member.shareCapital || existingMember?.shareCapital || 0),
      address: member.address || existingMember?.address,
      emergencyContact: member.emergencyContact || existingMember?.emergencyContact,
      createdAt: String(existingMember?.createdAt || member.createdAt || new Date().toISOString()),
      updatedAt: new Date().toISOString()
    };
  }

  private buildMemberApiPayload(member: Partial<CooperativeMember>): CooperativeLoanApiMemberPayload {
    const existingRaw = this.memberApiRecords[String(member.id || '')];
    const employeeId = this.toNumberId(member.employeeId || existingRaw?.employeeId);

    return {
      id: this.toNumberId(member.id || existingRaw?.id),
      employeeId,
      status: String(member.status || existingRaw?.status || 'ACTIVE'),
      cooperativeGroup: existingRaw?.cooperativeGroup || [],
      contributionHistory: existingRaw?.contributionHistory || [],
      loanHistory: existingRaw?.loanHistory || []
    };
  }

  private mapBackendGroupToLocal(groupRef: CooperativeLoanApiGroupRef | number | string | undefined): CooperativeLoanGroup | undefined {
    if (!groupRef || typeof groupRef !== 'object' || !('id' in groupRef)) {
      return undefined;
    }

    return {
      id: String(groupRef.id),
      name: String(groupRef.name || groupRef.code || `Group ${groupRef.id}`),
      description: String(groupRef.description || ''),
      monthlyContributionAmount: Number(groupRef.monthlyAmount || 0),
      maxBorrowingPercentage: 0,
      minAmount: 0,
      maxAmount: Number(groupRef.withdrawCap || 0),
      interestRate: Number(groupRef.interestRate || 0),
      minDuration: 0,
      maxDuration: 0,
      requiresShares: false,
      patronageEligible: Number(groupRef.patronageRate || 0) > 0,
      patronageRate: Number(groupRef.patronageRate || 0),
      status: String(groupRef.status || 'ACTIVE') === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    };
  }

  private mergeLoanReferenceData(rawLoans: CooperativeLoanApiResponse[]): void {
    let membersChanged = false;
    let groupsChanged = false;

    rawLoans.forEach((loan) => {
      const mappedMember = this.mapBackendMemberToLocal(loan.cooperativeMemberId);
      if (mappedMember) {
        const existingMemberIndex = this.members.findIndex((member) => member.id === mappedMember.id || member.memberId === mappedMember.memberId);
        if (existingMemberIndex === -1) {
          this.members = [...this.members, mappedMember];
          membersChanged = true;
        }
      }

      const mappedGroup = this.mapBackendGroupToLocal(loan.cooperativeGroupId);
      if (mappedGroup) {
        const existingGroupIndex = this.groups.findIndex((groupItem) => groupItem.id === mappedGroup.id);
        if (existingGroupIndex === -1) {
          this.groups = [...this.groups, mappedGroup];
          groupsChanged = true;
        }
      }
    });

    if (membersChanged || groupsChanged) {
      this.publishState();
    }
  }

  private mapApiLoanToLoan(rawLoan: CooperativeLoanApiResponse): CooperativeLoan {
    const memberId = this.toStringId(rawLoan.cooperativeMemberId);
    const groupId = this.toStringId(rawLoan.cooperativeGroupId);
    const interestRate = this.resolveLoanInterestRate(rawLoan);
    const totalRepayment = this.resolveLoanTotalRepayment(rawLoan, interestRate);
    const paymentHistory = this.normalizeLoanPaymentHistory(rawLoan.paymentHistory);

    const mappedLoan: CooperativeLoan = {
      id: this.toStringId(rawLoan.id),
      loanCode: String(rawLoan.loanCode || `COPLO-${rawLoan.id}`),
      cooperativeMemberId: memberId,
      cooperativeGroupId: groupId,
      amount: Number(rawLoan.amount || 0),
      purpose: String(rawLoan.purpose || ''),
      repaymentAmount: Number(rawLoan.repaymentAmount || 0),
      repaymentTime: Number(rawLoan.repaymentTime || 0),
      modeOfPayment: String(rawLoan.modeOfPayment || 'MONTHLY'),
      requestDate: rawLoan.requestDate || '',
      approvedDate: rawLoan.approvedDate || '',
      disbursedDate: rawLoan.disbursedDate || '',
      completedDate: rawLoan.completedDate || '',
      rejectedDate: rawLoan.rejectedDate || '',
      status: String(rawLoan.status || 'PENDING'),
      adminComment: String(rawLoan.adminComment || ''),
      applicationStage: rawLoan.applicationStage || 'PENDING_GUARANTOR_APPROVAL',
      guarantors: this.normalizeGuarantors(rawLoan.guarantors, Number(rawLoan.amount || 0), rawLoan.requestDate || new Date().toISOString()),
      guarantorApproval: Boolean(rawLoan.guarantorApproval),
      totalPaid: Number(rawLoan.totalPaid || 0),
      totalPrincipalPaid: Number(rawLoan.totalPrincipalPaid || 0),
      totalInterestPaid: Number(rawLoan.totalInterestPaid || 0),
      outstandingPrincipal: Number(rawLoan.outstandingPrincipal ?? Math.max(totalRepayment - Number(rawLoan.totalPaid || 0), 0)),
      paymentHistory,
      statusHistory: this.normalizeLoanStatusHistory(rawLoan.statusHistory),
      loanId: String(rawLoan.loanCode || `COPLO-${rawLoan.id}`),
      memberId,
      groupId,
      duration: Number(rawLoan.repaymentTime || 0),
      interestRate,
      totalRepayment,
      applicationDate: rawLoan.requestDate || '',
      completionDate: rawLoan.completedDate || ''
    };

    mappedLoan.paymentHistory = paymentHistory.map((entry) => ({ ...entry, cooperativeLoan: mappedLoan }));

    return mappedLoan;
  }

  private cloneLoanForMutation(loan: CooperativeLoan): CooperativeLoan {
    return {
      ...loan,
      guarantors: (loan.guarantors || []).map((guarantor) => ({ ...guarantor })),
      paymentHistory: (loan.paymentHistory || []).map((entry) => ({ ...entry })),
      statusHistory: (loan.statusHistory || []).map((entry) => ({ ...entry }))
    };
  }

  private appendLoanStatusHistory(
    loan: CooperativeLoan,
    status: string,
    notes: string,
    changedAt = new Date().toISOString()
  ): void {
    loan.statusHistory = [
      {
        id: Date.now(),
        status,
        changedAt,
        changedBy: undefined as any,
        notes,
        overrideOpen: false,
        overrideBy: undefined as any,
        overrideReason: '',
        statusBeforeOverride: ''
      },
      ...(loan.statusHistory || [])
    ];
  }

  private extractRepaymentInstallmentNumber(repayment: CooperativeRepayment): number {
    const fromId = String(repayment.id || '').match(/-RP-(\d+)$/)?.[1];
    return Number(fromId || 0);
  }

  private buildRepaymentContextForLoan(loan: CooperativeLoan, repayments: CooperativeRepayment[]): CooperativeRepaymentContext {
    return {
      loans: [loan],
      repayments,
      notifications: [],
      repaymentDueDay: this.repaymentDueDay,
      repaymentGraceDays: this.repaymentGraceDays,
      repaymentOverdueDays: this.repaymentOverdueDays,
      lateFeeRate: this.lateFeeRate,
      creditReportDays: this.creditReportDays,
      saveToStorage: () => undefined,
      formatCurrency: (amount) => this.formatCurrency(amount),
      createMemberStatusNotification: () => undefined,
      createRepaymentReminderNotification: () => undefined,
      createCreditReportNotification: () => undefined
    };
  }

  private deriveRepaymentsFromLoan(loan: CooperativeLoan): CooperativeRepayment[] {
    if (loan.status !== 'ACTIVE' && loan.status !== 'COMPLETED' && loan.status !== 'DEFAULTED') {
      return [];
    }

    const loanClone = this.cloneLoanForMutation(loan);
    const repayments: CooperativeRepayment[] = [];
    const context = this.buildRepaymentContextForLoan(loanClone, repayments);
    this.cooperativeRepaymentService.generateRepaymentSchedule(context, loanClone);

    const paymentHistory = [...(loan.paymentHistory || [])].sort((left, right) => {
      const installmentGap = Number(left.installmentNo || 0) - Number(right.installmentNo || 0);
      if (installmentGap !== 0) {
        return installmentGap;
      }

      return new Date(left.paidAt || 0).getTime() - new Date(right.paidAt || 0).getTime();
    });

    paymentHistory.forEach((payment) => {
      const installmentNo = Number(payment.installmentNo || 0);
      const repayment = repayments.find((item) => this.extractRepaymentInstallmentNumber(item) === installmentNo);
      if (!repayment) {
        return;
      }

      repayment.paidDate = payment.paidAt || repayment.paidDate;
      repayment.modeofPayment = (payment.modeofPayment as CooperativeRepayment['modeofPayment']) || 'BANK_TRANSFER';
      repayment.receiptNumber = payment.receiptNumber || undefined;
      repayment.lateFeeAmount = Number(payment.lateFeeAmount || repayment.lateFeeAmount || 0);
      repayment.status = payment.status === 'PAID' ? 'PAID' : repayment.status;
    });

    this.cooperativeRepaymentService.refreshOverdueStatuses(context, String(loan.id));
    return repayments.map((repayment) => ({ ...repayment }));
  }

  private syncRepaymentCacheForLoan(loan: CooperativeLoan): void {
    const retainedRepayments = this.repayments.filter((item) => String(item.loanId) !== String(loan.id));
    this.repayments = [...retainedRepayments, ...this.deriveRepaymentsFromLoan(loan)];
  }

  private buildPaymentHistoryFromRepayments(loan: CooperativeLoan, repayments: CooperativeRepayment[]): CooperativeLoan['paymentHistory'] {
    const orderedRepayments = [...repayments].sort(
      (left, right) => this.extractRepaymentInstallmentNumber(left) - this.extractRepaymentInstallmentNumber(right)
    );

    let runningBalance = Number(loan.totalRepayment || 0);

    return orderedRepayments
      .filter((repayment) => repayment.status === 'PAID' && repayment.paidDate)
      .map((repayment, index) => {
        const totalPayment = Number(repayment.amount || 0);
        runningBalance = Math.max(Number((runningBalance - totalPayment).toFixed(2)), 0);

        return {
          id: index + 1,
          cooperativeLoan: loan,
          installmentNo: this.extractRepaymentInstallmentNumber(repayment),
          paidAt: repayment.paidDate || '',
          amount: Number(repayment.amount || 0),
          modeofPayment: repayment.modeofPayment || 'BANK_TRANSFER',
          referenceNumber: '',
          interest: Number(repayment.interestComponent || 0),
          remainingBalance: runningBalance,
          status: repayment.status,
          lateFeeAmount: Number(repayment.lateFeeAmount || 0),
          totalPayment,
          notes: '',
          receiptNumber: repayment.receiptNumber || ''
        };
      });
  }

  private persistLoanMutation(
    id: string,
    mutate: (loan: CooperativeLoan) => CooperativeLoan | undefined,
    sideEffect?: (loan: CooperativeLoan) => void
  ): Observable<CooperativeLoan | undefined> {
    const existingLoan = this.getLoanById(id);
    if (!existingLoan) {
      return of(undefined);
    }

    const mutatedLoan = mutate(this.cloneLoanForMutation(existingLoan));
    if (!mutatedLoan) {
      return of(undefined);
    }

    return this.updateLoan(mutatedLoan).pipe(
      map((updatedLoan) => {
        sideEffect?.(updatedLoan);
        return updatedLoan;
      }),
      catchError((error) => {
        console.error('Failed to persist cooperative loan mutation', error);
        return of(undefined);
      })
    );
  }

  private syncLoanCache(loans: CooperativeLoan[]): void {
    this.loans = [...loans];
    this.repayments = [];
    this.loans.forEach((loan) => this.syncRepaymentCacheForLoan(loan));
    this.publishState();
  }

  private mapApiGroupToGroup(rawGroup: CooperativeGroupApiResponse): CooperativeLoanGroup {
    return {
      id: String(rawGroup.id),
      name: String(rawGroup.name || rawGroup.code || `Group ${rawGroup.id}`),
      description: String(rawGroup.description || ''),
      minEligibleSalary: 0,
      monthlyContributionAmount: Number(rawGroup.monthlyAmount || 0),
      maxBorrowingPercentage: 0,
      minAmount: 0,
      maxAmount: Number(rawGroup.withdrawCap || 0),
      interestRate: Number(rawGroup.interestRate || 0),
      minDuration: 1,
      maxDuration: 12,
      minMemberTenureMonths: 0,
      requiresShares: false,
      requiresGuarantors: false,
      minimumGuarantors: 0,
      quickDisbursement: false,
      patronageEligible: Number(rawGroup.patronageRate || 0) > 0,
      patronageRate: Number(rawGroup.patronageRate || 0),
      status: String(rawGroup.status || 'ACTIVE') === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    };
  }

  private syncGroupCache(groups: CooperativeLoanGroup[], rawGroups: CooperativeGroupApiResponse[] = []): void {
    if (rawGroups.length > 0) {
      this.groupApiRecords = rawGroups.reduce<Record<string, CooperativeGroupApiResponse>>((records, group) => {
        records[String(group.id)] = group;
        return records;
      }, {});
    }

    this.groups = [...groups];
    this.rebuildDerivedMembershipStateFromApi();
    this.publishState();
  }

  private upsertGroupInCache(group: CooperativeLoanGroup, publish = true, rawGroup?: CooperativeGroupApiResponse): void {
    const existingIndex = this.groups.findIndex((item) => String(item.id) === String(group.id));
    if (existingIndex === -1) {
      this.groups = [group, ...this.groups];
    } else {
      this.groups = this.groups.map((item, index) => (index === existingIndex ? group : item));
    }

    if (rawGroup) {
      this.groupApiRecords[String(rawGroup.id)] = rawGroup;
    }

    if (publish) {
      this.rebuildDerivedMembershipStateFromApi();
      this.publishState();
    }
  }

  private rebuildDerivedMembershipStateFromApi(): void {
    const rawMembers = Object.values(this.memberApiRecords);
    if (rawMembers.length === 0) {
      return;
    }

    const derivedContributionEntries = this.deriveContributionEntriesFromApi(rawMembers, Object.values(this.groupApiRecords));
    const derivedMemberships = this.deriveGroupMembershipsFromApi(rawMembers, derivedContributionEntries);

    if (derivedMemberships.length === 0 && derivedContributionEntries.length === 0) {
      return;
    }

    const pendingOrRejectedMemberships = this.groupMemberships.filter((item) => item.status !== 'ACTIVE' && !String(item.id).startsWith('api-'));
    const localContributionEntries = this.contributionEntries.filter((item) => !String(item.id).startsWith('api-'));
    const derivedMembershipIds = new Set(derivedMemberships.map((item) => item.id));

    this.groupMemberships = [...pendingOrRejectedMemberships, ...derivedMemberships];
    this.contributionEntries = [
      ...localContributionEntries.filter((item) => !derivedMembershipIds.has(item.membershipId)),
      ...derivedContributionEntries
    ];

    localStorage.setItem(this.skipGroupMembershipSeedKey, 'true');
    this.saveToStorage();
  }

  private deriveGroupMembershipsFromApi(
    rawMembers: CooperativeLoanApiMemberRef[],
    contributionEntries: CooperativeContributionEntry[]
  ): CooperativeGroupMembership[] {
    const contributionTotals = contributionEntries.reduce<Record<string, { total: number; latestDate: string }>>((totals, entry) => {
      const existing = totals[entry.membershipId] || { total: 0, latestDate: '' };
      const latestDate = !existing.latestDate || new Date(entry.contributedAt).getTime() > new Date(existing.latestDate).getTime()
        ? entry.contributedAt
        : existing.latestDate;

      totals[entry.membershipId] = {
        total: Number((existing.total + Number(entry.amount || 0)).toFixed(2)),
        latestDate
      };

      return totals;
    }, {});

    return rawMembers.flatMap((memberRef) => {
      const memberId = String(memberRef.id);
      const joinedAt = this.resolveMemberJoinDate(memberRef, memberRef.contributionHistory);

      return (memberRef.cooperativeGroup || []).map((group) => {
        const membershipId = `api-${memberId}-${group.id}`;
        const contributionSnapshot = contributionTotals[membershipId];

        return {
          id: membershipId,
          memberId,
          groupId: String(group.id),
          status: 'ACTIVE' as const,
          monthlyContributionAmount: Number(group.monthlyAmount || 0),
          totalContribution: Number(contributionSnapshot?.total || 0),
          joinedAt,
          requestedAt: joinedAt,
          reviewedAt: joinedAt,
          reviewNote: 'Derived from backend cooperative membership data',
          lastContributionDate: contributionSnapshot?.latestDate || joinedAt
        };
      });
    });
  }

  private deriveContributionEntriesFromApi(
    rawMembers: CooperativeLoanApiMemberRef[],
    rawGroups: CooperativeGroupApiResponse[]
  ): CooperativeContributionEntry[] {
    const memberLookup = rawMembers.reduce<Record<string, CooperativeMember>>((records, memberRef) => {
      const mappedMember = this.getMemberById(String(memberRef.id)) || this.mapApiMemberToMember(memberRef);
      records[String(memberRef.id)] = mappedMember;
      return records;
    }, {});

    const contributionGroups = rawGroups.length > 0
      ? rawGroups.map((group) => ({
          id: String(group.id),
          contributionHistory: group.contributionHistory || []
        }))
      : rawMembers.flatMap((memberRef) =>
          (memberRef.cooperativeGroup || []).map((group) => ({
            id: String(group.id),
            contributionHistory: group.contributionHistory || []
          }))
        );

    return contributionGroups.flatMap((group) => {
      return group.contributionHistory.flatMap((entry, index) => {
        const matchedMember = this.findMemberForContributionEntry(entry, memberLookup);
        if (!matchedMember) {
          return [];
        }

        const contributedAt = String(entry.date || new Date().toISOString());
        return [{
          id: `api-${group.id}-${entry.id || index + 1}-${matchedMember.id}`,
          membershipId: `api-${matchedMember.id}-${group.id}`,
          memberId: matchedMember.id,
          groupId: group.id,
          amount: Number(entry.amount || 0),
          contributionMonth: `${new Date(contributedAt).getFullYear()}-${String(new Date(contributedAt).getMonth() + 1).padStart(2, '0')}`,
          contributedAt,
          status: 'POSTED' as const
        }];
      });
    });
  }

  private findMemberForContributionEntry(
    entry: CooperativeGroupApiContributionHistory | CooperativeLoanApiContributionHistory,
    memberLookup: Record<string, CooperativeMember>
  ): CooperativeMember | undefined {
    const contributionLabel = String(entry.member || '').trim().toLowerCase();
    if (!contributionLabel) {
      return undefined;
    }

    return Object.values(memberLookup).find((member) => {
      return [member.fullName, member.email, member.memberId, member.employeeId]
        .filter((value): value is string => typeof value === 'string' && !!value.trim())
        .some((value) => value.trim().toLowerCase() === contributionLabel);
    });
  }

  private buildGroupApiPayload(group: Omit<CooperativeLoanGroup, 'id'> | CooperativeLoanGroup): CooperativeGroupApiPayload {
    const normalizedGroup = group as CooperativeLoanGroup;
    return {
      id: this.toNumberId((normalizedGroup as CooperativeLoanGroup).id),
      code: '',
      name: String(normalizedGroup.name || ''),
      monthlyAmount: Number(normalizedGroup.monthlyContributionAmount || 0),
      memberIds: [],
      memberLimit: 0,
      withdrawCap: Number(normalizedGroup.maxAmount || 0),
      interestRate: Number(normalizedGroup.interestRate || 0),
      currentBalance: 0,
      contributionHistory: [],
      loanHistory: [],
      status: String(normalizedGroup.status || 'ACTIVE'),
      description: String(normalizedGroup.description || ''),
      patronageRate: normalizedGroup.patronageEligible ? Number(normalizedGroup.patronageRate || 0) : 0,
      patronageAmount: 0
    };
  }

  loadGroups(): Observable<CooperativeLoanGroup[]> {
    return this.cooperativeGroupService.getAllCooperativeGroups().pipe(
      map((rawGroups) => {
        const groups = rawGroups.map((group) => this.mapApiGroupToGroup(group));
        this.syncGroupCache(groups, rawGroups);
        return groups;
      }),
      catchError((error) => {
        console.error('Failed to load cooperative groups', error);
        return of(this.getGroups());
      })
    );
  }

  loadGroupById(id: string): Observable<CooperativeLoanGroup | undefined> {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      return of(this.getGroupById(id));
    }

    return this.cooperativeGroupService.getCooperativeGroupById(numericId).pipe(
      map((rawGroup) => {
        const group = this.mapApiGroupToGroup(rawGroup);
        this.upsertGroupInCache(group, true, rawGroup);
        return group;
      }),
      catchError((error) => {
        console.error('Failed to load cooperative group', error);
        return of(this.getGroupById(id));
      })
    );
  }

  private upsertLoanInCache(loan: CooperativeLoan): void {
    const existingIndex = this.loans.findIndex((item) => String(item.id) === String(loan.id));
    if (existingIndex === -1) {
      this.loans = [loan, ...this.loans];
    } else {
      this.loans = this.loans.map((item, index) => (index === existingIndex ? loan : item));
    }
    this.syncRepaymentCacheForLoan(loan);
    this.publishState();
  }

  private buildCreateLoanPayload(loan: Omit<CooperativeLoan, 'id' | 'loanId' | 'createdAt' | 'updatedAt'>): CooperativeLoanApiCreatePayload {
    return {
      id: 0,
      loanCode: loan.loanCode || '',
      cooperativeMemberId: { id: this.toNumberId(loan.cooperativeMemberId || loan.memberId) },
      cooperativeGroupId: { id: this.toNumberId(loan.cooperativeGroupId || loan.groupId) },
      amount: Number(loan.amount || 0),
      purpose: String(loan.purpose || ''),
      repaymentAmount: Number(loan.repaymentAmount || 0),
      repaymentTime: Number(loan.repaymentTime || loan.duration || 0),
      modeOfPayment: String(loan.modeOfPayment || 'MONTHLY'),
      requestDate: loan.requestDate || loan.applicationDate || new Date().toISOString(),
      approvedDate: loan.approvedDate || '',
      disbursedDate: loan.disbursedDate || '',
      completedDate: loan.completedDate || loan.completionDate || '',
      rejectedDate: loan.rejectedDate || '',
      status: String(loan.status || 'PENDING'),
      adminComment: String(loan.adminComment || loan.adminRequestNote || ''),
      applicationStage: loan.applicationStage,
      guarantorApproval: Boolean(loan.guarantorApproval),
      totalPaid: Number(loan.totalPaid || 0),
      totalPrincipalPaid: Number(loan.totalPrincipalPaid || 0),
      totalInterestPaid: Number(loan.totalInterestPaid || 0),
      outstandingPrincipal: Number(loan.outstandingPrincipal || loan.amount || 0),
      paymentHistory: [],
      statusHistory: []
    };
  }

  private buildUpdateLoanPayload(loan: CooperativeLoan): CooperativeLoanApiUpdatePayload {
    return {
      id: this.toNumberId(loan.id),
      loanCode: loan.loanCode,
      cooperativeMemberId: this.toNumberId(loan.cooperativeMemberId || loan.memberId),
      cooperativeGroupId: this.toNumberId(loan.cooperativeGroupId || loan.groupId),
      amount: Number(loan.amount || 0),
      purpose: String(loan.purpose || ''),
      repaymentAmount: Number(loan.repaymentAmount || 0),
      repaymentTime: Number(loan.repaymentTime || loan.duration || 0),
      modeOfPayment: String(loan.modeOfPayment || 'MONTHLY'),
      requestDate: loan.requestDate || loan.applicationDate || new Date().toISOString(),
      approvedDate: loan.approvedDate || '',
      disbursedDate: loan.disbursedDate || '',
      completedDate: loan.completedDate || loan.completionDate || '',
      rejectedDate: loan.rejectedDate || '',
      status: String(loan.status || 'PENDING'),
      adminComment: String(loan.adminComment || loan.adminRequestNote || ''),
      applicationStage: loan.applicationStage,
      guarantorsId: this.toNumberId(loan.guarantors?.[0]?.memberId),
      guarantorApproval: Boolean(loan.guarantorApproval),
      totalPaid: Number(loan.totalPaid || 0),
      totalPrincipalPaid: Number(loan.totalPrincipalPaid || 0),
      totalInterestPaid: Number(loan.totalInterestPaid || 0),
      outstandingPrincipal: Number(loan.outstandingPrincipal || 0),
      paymentHistory: (loan.paymentHistory || []).map((entry) => ({
        id: Number(entry.id || 0),
        installmentNo: Number(entry.installmentNo || 0),
        paidAt: entry.paidAt || '',
        amount: Number(entry.amount || 0),
        paymentMethod: entry.modeofPayment || 'BANK_TRANSFER',
        referenceNumber: entry.referenceNumber || '',
        interest: Number(entry.interest || 0),
        remainingBalance: Number(entry.remainingBalance || 0),
        status: entry.status || 'PENDING',
        lateFeeAmount: Number(entry.lateFeeAmount || 0),
        totalPayment: Number(entry.totalPayment || 0),
        notes: entry.notes || '',
        receiptNumber: entry.receiptNumber || ''
      })),
      statusHistory: (loan.statusHistory || []).map((entry) => ({
        id: Number(entry.id || 0),
        status: entry.status || 'PENDING',
        changedAt: entry.changedAt || new Date().toISOString(),
        changedBy: entry.changedBy,
        notes: entry.notes || '',
        overrideOpen: Boolean(entry.overrideOpen),
        overrideBy: entry.overrideBy,
        overrideReason: entry.overrideReason || '',
        statusBeforeOverride: entry.statusBeforeOverride || ''
      }))
    };
  }

  loadLoanById(id: string): Observable<CooperativeLoan | undefined> {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      return of(this.getLoanById(id));
    }

    return this.cooperativeLoanApiService.getLoanById(numericId).pipe(
      map((rawLoan) => {
        this.mergeLoanReferenceData([rawLoan]);
        const loan = this.mapApiLoanToLoan(rawLoan);
        this.upsertLoanInCache(loan);
        return loan;
      }),
      catchError((error) => {
        console.error('Failed to load cooperative loan', error);
        return of(this.getLoanById(id));
      })
    );
  }

  loadStats(): Observable<CooperativeStats> {
    return this.cooperativeLoanApiService.getLoanStats({}).pipe(
      map((stats) => this.mapLoanStats(stats)),
      catchError((error) => {
        console.error('Failed to load cooperative loan stats', error);
        return of(this.getStats());
      })
    );
  }

  private mapLoanStats(stats: CooperativeLoanStatsResponse): CooperativeStats {
    if (Array.isArray(stats.cooperativeLoans) && stats.cooperativeLoans.length > 0) {
      this.mergeLoanReferenceData(stats.cooperativeLoans);
      this.syncLoanCache(stats.cooperativeLoans.map((loan) => this.mapApiLoanToLoan(loan)));
    }

    const snapshot: CooperativeStats = {
      totalMembers: this.members.length,
      activeMembers: this.members.filter((member) => member.status === 'ACTIVE').length,
      totalLoans: Number(stats.totalRecord || this.loans.length),
      activeLoans: Number(stats.totalActive || this.loans.filter((loan) => loan.status === 'ACTIVE').length),
      pendingLoans: Number(stats.totalPending || this.loans.filter((loan) => loan.status === 'PENDING').length),
      totalFund: this.members.reduce((sum, member) => sum + Number(member.shareCapital || 0), 0),
      loanPortfolio: Number(stats.totalOutstanding || stats.totalLoanAmount || 0)
    };

    this.statsSnapshot = snapshot;
    return snapshot;
  }

  // ==================== LOAN METHODS ====================

  getLoans(): Observable<CooperativeLoan[]> {
    return this.cooperativeLoanApiService.getAllLoans().pipe(
      map((rawLoans) => {
        this.mergeLoanReferenceData(rawLoans);
        const loans = rawLoans.map((loan) => this.mapApiLoanToLoan(loan));
        this.syncLoanCache(loans);
        return loans;
      }),
      catchError((error) => {
        console.error('Failed to load cooperative loans', error);
        return of([...this.loans]);
      })
    );
  }

  getLoansObservable(): Observable<CooperativeLoan[]> {
    return this.loansSubject.asObservable();
  }

  getLoanById(id: string): CooperativeLoan | undefined {
    return this.loans.find(l => String(l.id) === id || String(l.loanCode || l.loanId || '') === id);
  }

  getLoansByMember(memberId: string): CooperativeLoan[] {
    return this.loans.filter(l => String(l.cooperativeMemberId || l.memberId || '') === memberId);
  }

  addLoan(loan: Omit<CooperativeLoan, 'id' | 'loanId' | 'createdAt' | 'updatedAt'>): Observable<CooperativeLoan> {
    return this.cooperativeLoanApiService.createLoan(this.buildCreateLoanPayload(loan)).pipe(
      map((rawLoan) => {
        this.mergeLoanReferenceData([rawLoan]);
        const createdLoan = this.mapApiLoanToLoan(rawLoan);
        this.upsertLoanInCache(createdLoan);
        this.createPendingApprovalNotification(createdLoan);
        if ((createdLoan.guarantors || []).length > 0) {
          this.createGuarantorNotifications(createdLoan);
        }
        return createdLoan;
      })
    );
  }

  updateLoan(loan: CooperativeLoan): Observable<CooperativeLoan> {
    return this.cooperativeLoanApiService.updateLoan(this.toNumberId(loan.id), this.buildUpdateLoanPayload(loan)).pipe(
      map((rawLoan) => {
        this.mergeLoanReferenceData([rawLoan]);
        const updatedLoan = this.mapApiLoanToLoan(rawLoan);
        this.upsertLoanInCache(updatedLoan);
        return updatedLoan;
      })
    );
  }

  approveLoan(id: string): Observable<CooperativeLoan | undefined> {
    return this.persistLoanMutation(id, (loan) => {
      if (loan.status !== 'PENDING' || loan.applicationStage === 'PENDING_GUARANTOR_APPROVAL') {
        return undefined;
      }

      const now = new Date().toISOString();
      loan.status = 'APPROVED';
      loan.approvedDate = now;
      loan.fundsReserved = true;
      loan.applicationStage = 'UNDER_ADMIN_REVIEW';
      loan.updatedAt = now;
      this.appendLoanStatusHistory(loan, 'APPROVED', 'Loan approved and funds reserved for disbursement.', now);
      return loan;
    }, (loan) => {
      this.createMemberStatusNotification(
        loan,
        'Loan Approved',
        `Your loan ${loan.loanId || loan.loanCode} has been approved and funds are marked for disbursement.`
      );
      this.saveToStorage();
    });
  }

  disburseLoan(id: string): Observable<CooperativeLoan | undefined> {
    return this.persistLoanMutation(id, (loan) => {
      if (loan.status !== 'APPROVED') {
        return undefined;
      }

      const now = new Date().toISOString();
      loan.status = 'ACTIVE';
      loan.disbursedDate = now;
      loan.fundsReserved = false;
      loan.applicationStage = undefined;
      loan.totalPrincipalPaid = Number(loan.totalPrincipalPaid || 0);
      loan.totalInterestPaid = Number(loan.totalInterestPaid || 0);
      loan.outstandingPrincipal = Number(loan.outstandingPrincipal ?? loan.amount ?? 0);
      loan.updatedAt = now;
      this.appendLoanStatusHistory(loan, 'ACTIVE', 'Loan disbursed and activated.', now);
      return loan;
    }, (loan) => {
      this.createMemberStatusNotification(
        loan,
        'Loan Disbursed',
        `Your loan ${loan.loanId || loan.loanCode} has been disbursed and is now active.`
      );
      this.saveToStorage();
    });
  }

  rejectLoan(id: string, reason: string): Observable<CooperativeLoan | undefined> {
    return this.persistLoanMutation(id, (loan) => {
      if (!reason.trim()) {
        return undefined;
      }

      const now = new Date().toISOString();
      loan.status = 'REJECTED';
      loan.rejectionReason = reason.trim();
      loan.rejectedDate = now;
      loan.fundsReserved = false;
      loan.applicationStage = undefined;
      loan.updatedAt = now;
      this.appendLoanStatusHistory(loan, 'REJECTED', `Loan rejected: ${loan.rejectionReason}`, now);
      return loan;
    }, (loan) => {
      this.createMemberStatusNotification(
        loan,
        'Loan Rejected',
        `Your loan ${loan.loanId || loan.loanCode} was rejected. Reason: ${loan.rejectionReason}`
      );
      this.saveToStorage();
    });
  }

  requestLoanChanges(id: string, note: string): Observable<CooperativeLoan | undefined> {
    return this.persistLoanMutation(id, (loan) => {
      if (!note.trim()) {
        return undefined;
      }

      const now = new Date().toISOString();
      loan.adminRequestNote = note.trim();
      loan.applicationStage = 'INFO_REQUESTED';
      loan.infoRequestedDate = now;
      loan.updatedAt = now;
      this.appendLoanStatusHistory(loan, String(loan.status || 'PENDING'), `Additional information requested: ${loan.adminRequestNote}`, now);
      return loan;
    }, (loan) => {
      this.saveToStorage();
    });
  }

  setLoanPendingReview(id: string, note?: string): Observable<CooperativeLoan | undefined> {
    return this.persistLoanMutation(id, (loan) => {
      if (loan.status !== 'PENDING' && loan.status !== 'APPROVED') {
        return undefined;
      }

      const now = new Date().toISOString();
      loan.status = 'PENDING';
      loan.applicationStage = 'READY_FOR_ADMIN_REVIEW';
      if (note?.trim()) {
        loan.adminRequestNote = note.trim();
      }
      loan.updatedAt = now;
      this.appendLoanStatusHistory(loan, 'PENDING', loan.adminRequestNote || 'Loan kept pending for admin review.', now);
      return loan;
    });
  }

  submitGuarantorDecision(
    loanId: string,
    guarantorMemberId: string,
    decision: 'APPROVED' | 'REJECTED' | 'EXPIRED',
    note?: string
  ): Observable<CooperativeLoan | undefined> {
    return this.persistLoanMutation(loanId, (loan) => {
      if (loan.status !== 'PENDING' || !loan.guarantors?.length) {
        return undefined;
      }

      const guarantor = loan.guarantors.find((item) => item.memberId === guarantorMemberId);
      if (!guarantor || guarantor.status !== 'PENDING') {
        return undefined;
      }

      const now = new Date().toISOString();
      guarantor.status = decision;
      guarantor.decidedAt = now;
      guarantor.note = note?.trim() || guarantor.note;
      loan.updatedAt = now;

      const hasFailed = loan.guarantors.some((item) => item.status === 'REJECTED' || item.status === 'EXPIRED');
      const allApproved = loan.guarantors.every((item) => item.status === 'APPROVED');

      if (hasFailed) {
        loan.status = 'REJECTED';
        loan.rejectedDate = now;
        loan.rejectionReason = 'Guarantor approval failed. Please submit a fresh application.';
        loan.applicationStage = undefined;
        this.appendLoanStatusHistory(loan, 'REJECTED', loan.rejectionReason, now);
      } else if (allApproved) {
        loan.applicationStage = 'READY_FOR_ADMIN_REVIEW';
      } else {
        loan.applicationStage = 'PENDING_GUARANTOR_APPROVAL';
      }

      return loan;
    }, (loan) => {
      this.notifications.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'GUARANTOR_STATUS_UPDATE',
        recipient: 'MEMBER',
        title: 'Guarantor Update',
        message: `A guarantor responded ${decision} for loan ${loan.loanId || loan.loanCode}.`,
        loanId: loan.id,
        memberId: String(loan.memberId || loan.cooperativeMemberId || ''),
        createdAt: new Date().toISOString(),
        read: false
      });
      this.saveToStorage();
    });
  }

  getEligibleGroupsForMember(memberId: string, monthlySalary = 0): CooperativeLoanGroup[] {
    return this.cooperativeGroupService.getEligibleGroupsForMember(this.getGroupContext(), memberId, monthlySalary);
  }

  getGroupMembershipsByMember(memberId: string): CooperativeGroupMembership[] {
    return this.cooperativeGroupService.getGroupMembershipsByMember(this.getGroupContext(), memberId);
  }

  getMembersSnapshot(): CooperativeMember[] {
    return this.members.map(member => ({ ...member }));
  }

  getGroupMemberships(): CooperativeGroupMembership[] {
    return this.cooperativeGroupService.getGroupMemberships(this.getGroupContext());
  }

  getContributionEntries(): CooperativeContributionEntry[] {
    return this.contributionEntries.map(entry => ({ ...entry }));
  }

  getContributionEntriesByGroup(groupId: string): CooperativeContributionEntry[] {
    return this.contributionEntries
      .filter(entry => entry.groupId === groupId)
      .sort((a, b) => new Date(a.contributedAt).getTime() - new Date(b.contributedAt).getTime())
      .map(entry => ({ ...entry }));
  }

  recordGroupContribution(
    membershipId: string,
    payload: { amount: number; contributionMonth: string; contributedAt?: string }
  ): CooperativeContributionEntry | undefined {
    return this.cooperativeGroupService.recordContribution(this.getGroupContext(), membershipId, payload);
  }

  getGroupMembership(memberId: string, groupId: string): CooperativeGroupMembership | undefined {
    return this.cooperativeGroupService.getGroupMembership(this.getGroupContext(), memberId, groupId);
  }

  applyForGroupMembership(memberId: string, groupId: string): CooperativeGroupMembership {
    const existingMembership = this.getGroupMembership(memberId, groupId);
    const membership = this.cooperativeGroupService.applyForGroupMembership(this.getGroupContext(), memberId, groupId);

    if (!existingMembership || existingMembership.status === 'REJECTED') {
      this.cooperativeNotificationService.createGroupJoinRequestNotification(this.getNotificationContext(), membership);
      this.saveToStorage();
    }

    return membership;
  }

  approveGroupMembership(membershipId: string, note?: string): CooperativeGroupMembership | undefined {
    const membership = this.cooperativeGroupService.approveGroupMembership(this.getGroupContext(), membershipId, note);
    if (!membership) {
      return undefined;
    }

    const group = this.getGroupById(membership.groupId);
    this.cooperativeNotificationService.createGroupJoinStatusNotification(
      this.getNotificationContext(),
      membership,
      'Group Join Approved',
      `Your request to join ${group?.name || 'the selected group'} was approved${membership.reviewNote ? `: ${membership.reviewNote}` : '.'}`
    );
    this.saveToStorage();

    return membership;
  }

  rejectGroupMembership(membershipId: string, reason?: string): CooperativeGroupMembership | undefined {
    const membership = this.cooperativeGroupService.rejectGroupMembership(this.getGroupContext(), membershipId, reason);
    if (!membership) {
      return undefined;
    }

    const group = this.getGroupById(membership.groupId);
    this.cooperativeNotificationService.createGroupJoinStatusNotification(
      this.getNotificationContext(),
      membership,
      'Group Join Request Rejected',
      `Your request to join ${group?.name || 'the selected group'} was rejected${membership.rejectionReason ? `: ${membership.rejectionReason}` : '.'}`
    );
    this.saveToStorage();

    return membership;
  }

  getMaxBorrowableAmountForGroup(memberId: string, groupId: string): number {
    return this.cooperativeGroupService.getMaxBorrowableAmountForGroup(this.getGroupContext(), memberId, groupId);
  }

  getMemberTenureMonths(memberId: string): number {
    return this.cooperativeGroupService.getMemberTenureMonths(this.getGroupContext(), memberId);
  }

  getRepaymentsByLoanId(loanId: string | number): CooperativeRepayment[] {
    return this.cooperativeRepaymentService.getRepaymentsByLoanId(this.getRepaymentContext(), String(loanId));
  }

  recordRepayment(
    loanId: string | number,
    payload: { amount: number; modeofPayment: CooperativeRepayment['modeofPayment']; paidDate?: string }
  ): Observable<CooperativeRepayment | undefined> {
    return this.persistLoanMutation(String(loanId), (loan) => {
      const repayments = this.deriveRepaymentsFromLoan(loan);
      const context = this.buildRepaymentContextForLoan(loan, repayments);
      const recordedRepayment = this.cooperativeRepaymentService.recordRepayment(context, String(loan.id), payload);
      if (!recordedRepayment) {
        return undefined;
      }

      loan.paymentHistory = this.buildPaymentHistoryFromRepayments(loan, repayments);
      loan.totalPaid = Number(loan.paymentHistory.reduce((sum, entry) => sum + Number(entry.totalPayment || 0), 0).toFixed(2));
      return loan;
    }).pipe(
      map((updatedLoan) => {
        if (!updatedLoan) {
          return undefined;
        }

        const repayments = this.getRepaymentsByLoanId(updatedLoan.id);
        const latestPayment = [...repayments]
          .filter((repayment) => repayment.paidDate)
          .sort((left, right) => new Date(right.paidDate || 0).getTime() - new Date(left.paidDate || 0).getTime())[0];
        return latestPayment;
      })
    );
  }

  getOverdueRepaymentsByLoanId(loanId: string | number): CooperativeRepayment[] {
    return this.cooperativeRepaymentService.getOverdueRepaymentsByLoanId(this.getRepaymentContext(), String(loanId));
  }

  sendRepaymentReminder(loanId: string | number): boolean {
    return this.cooperativeRepaymentService.sendRepaymentReminder(this.getRepaymentContext(), String(loanId));
  }

  markLoanAsDefaulted(loanId: string | number): Observable<CooperativeLoan | undefined> {
    return this.persistLoanMutation(String(loanId), (loan) => {
      if (loan.status !== 'ACTIVE' && loan.status !== 'APPROVED') {
        return undefined;
      }

      const now = new Date().toISOString();
      loan.status = 'DEFAULTED';
      loan.defaultedDate = now;
      loan.applicationStage = undefined;
      loan.updatedAt = now;
      this.appendLoanStatusHistory(loan, 'DEFAULTED', 'Loan marked as defaulted.', now);
      return loan;
    }, (loan) => {
      this.saveToStorage();
    });
  }

  applyPatronageToMemberLoan(memberId: string, amount: number): Observable<{ appliedAmount: number; loanId?: string }> {
    const activeLoan = this.loans
      .filter((item) => String(item.memberId || item.cooperativeMemberId || '') === memberId && item.status === 'ACTIVE')
      .sort((left, right) => new Date(left.applicationDate || left.requestDate).getTime() - new Date(right.applicationDate || right.requestDate).getTime())[0];

    if (!activeLoan || Number(amount || 0) <= 0) {
      return of({ appliedAmount: 0 });
    }

    return this.persistLoanMutation(String(activeLoan.id), (loan) => {
      const repayments = this.deriveRepaymentsFromLoan(loan);
      const context = this.buildRepaymentContextForLoan(loan, repayments);
      const result = this.cooperativeRepaymentService.applyPatronageToMemberLoan(context, memberId, amount);
      if (result.appliedAmount <= 0) {
        return undefined;
      }

      loan.paymentHistory = this.buildPaymentHistoryFromRepayments(loan, repayments).map((entry) => ({
        ...entry,
        modeofPayment: entry.modeofPayment || 'OTHER',
        notes: entry.notes || 'Patronage applied to loan balance.'
      }));
      loan.totalPaid = Number(loan.paymentHistory.reduce((sum, entry) => sum + Number(entry.totalPayment || 0), 0).toFixed(2));
      return loan;
    }).pipe(
      map((updatedLoan) => ({
        appliedAmount: updatedLoan ? Number(amount || 0) : 0,
        loanId: updatedLoan ? String(updatedLoan.id) : undefined
      }))
    );
  }

  // ==================== GROUP/group METHODS ====================

  // Removed obsolete getGroups(): CooperativeLoangroup[] method
  getGroups(): CooperativeLoanGroup[] {
    return this.cooperativeGroupService.getGroups(this.getGroupContext());
  }

  getGroupById(id: string): CooperativeLoanGroup | undefined {
    return this.cooperativeGroupService.getGroupById(this.getGroupContext(), id);
  }

  addGroup(group: Omit<CooperativeLoanGroup, 'id'>): Observable<CooperativeLoanGroup> {
    return this.cooperativeGroupService.createCooperativeGroup(this.buildGroupApiPayload(group)).pipe(
      map((rawGroup) => {
        const createdGroup = this.mapApiGroupToGroup(rawGroup);
        this.upsertGroupInCache(createdGroup);
        return createdGroup;
      })
    );
  }

  updateGroup(group: CooperativeLoanGroup): Observable<CooperativeLoanGroup> {
    return this.cooperativeGroupService.updateCooperativeGroup(this.toNumberId(group.id), this.buildGroupApiPayload(group)).pipe(
      map((rawGroup) => {
        const updatedGroup = this.mapApiGroupToGroup(rawGroup);
        this.upsertGroupInCache(updatedGroup);
        return updatedGroup;
      })
    );
  }

  setGroupStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Observable<CooperativeLoanGroup | undefined> {
    const existingGroup = this.getGroupById(id);
    if (!existingGroup) {
      return of(undefined);
    }

    return this.updateGroup({ ...existingGroup, status }).pipe(
      map((updatedGroup) => updatedGroup)
    );
  }

  getGroupInviteHistory(groupId: string): CooperativeGroupInviteHistoryEntry[] {
    return this.groupInviteHistory
      .filter(entry => entry.groupId === groupId)
      .sort((left, right) => new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime());
  }

  recordGroupInvites(
    groupId: string,
    invites: Array<Omit<CooperativeGroupInviteHistoryEntry, 'id' | 'groupId' | 'sentAt'>>
  ): CooperativeGroupInviteHistoryEntry[] {
    const createdEntries = invites.map(invite => ({
      ...invite,
      id: `CGI-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      groupId,
      sentAt: new Date().toISOString()
    }));

    this.groupInviteHistory = [...createdEntries, ...this.groupInviteHistory];
    this.saveToStorage();
    return createdEntries;
  }

  // ==================== NOTIFICATION METHODS ====================

  getNotifications(): Observable<CooperativeNotification[]> {
    return of(this.buildNotificationsSnapshot());
  }

  getNotificationsSnapshot(): CooperativeNotification[] {
    return this.buildNotificationsSnapshot();
  }

  getNotificationsObservable(): Observable<CooperativeNotification[]> {
    return this.notificationsSubject.asObservable();
  }

  markNotificationAsRead(id: string): void {
    const storedNotification = this.notifications.find((item) => item.id === id);
    if (storedNotification) {
      this.cooperativeNotificationService.markNotificationAsRead(this.getNotificationContext(), id);
      return;
    }

    const derivedNotification = this.buildNotificationsSnapshot().find((item) => item.id === id);
    if (!derivedNotification) {
      return;
    }

    this.notifications.unshift({ ...derivedNotification, read: true });
    this.saveToStorage();
  }

  private createPendingApprovalNotification(loan: CooperativeLoan): void {
    this.cooperativeNotificationService.createPendingApprovalNotification(this.getNotificationContext(), loan);
  }

  private createPendingMembershipApprovalNotification(item: PendingMembershipApplication): void {
    this.cooperativeNotificationService.createPendingMembershipApprovalNotification(this.getNotificationContext(), item);
  }

  private createMemberStatusNotification(loan: CooperativeLoan, title: string, message: string): void {
    this.cooperativeNotificationService.createMemberStatusNotification(this.getNotificationContext(), loan, title, message);
  }

  private createGuarantorNotifications(loan: CooperativeLoan): void {
    this.cooperativeNotificationService.createGuarantorNotifications(this.getNotificationContext(), loan);
  }

  // ==================== STATS METHODS ====================

  getStats(): CooperativeStats {
    if (this.statsSnapshot) {
      return this.statsSnapshot;
    }

    const activeMembers = this.members.filter(m => m.status === 'ACTIVE').length;
    const activeLoans = this.loans.filter(l => l.status === 'ACTIVE').length;
    const pendingLoans = this.loans.filter(l => l.status === 'PENDING').length;
    
    const totalFund = this.members.reduce((sum, m) => sum + m.shareCapital, 0);
    const loanPortfolio = this.loans
      .filter(l => l.status === 'ACTIVE')
      .reduce((sum, l) => sum + l.amount, 0);

    return {
      totalMembers: this.members.length,
      activeMembers,
      totalLoans: this.loans.length,
      activeLoans,
      pendingLoans,
      totalFund,
      loanPortfolio
    };
  }

  // ==================== UTILITY ====================

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  }

}
import type {
  CooperativeEmployeeProfile,
  CooperativeMembershipEligibility,
  CooperativeMembershipApplication,
  CooperativeMembershipActionResult
} from './cooperative.types';
// API and DTO types
import type {
  CooperativeLoanApiMemberRef,
  CooperativeGroupApiResponse,
  CooperativeLoanApiResponse,
  CooperativeLoanApiCreatePayload,
  CooperativeLoanApiUpdatePayload,
  CooperativeLoanApiMemberPayload
} from './cooperative-loan-api.service';
import type { CooperativeNotificationContext } from './cooperative-notification.service';
import type { CooperativeRepaymentContext } from './cooperative-repayment.service';


import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  CooperativeMember,
  CooperativeLoanGroup,
  CooperativeGroupMembership,
  CooperativeContributionEntry,
  CooperativeGroupInviteHistoryEntry,
  CooperativeRepayment,
  CooperativeNotification,
  CooperativeStats
} from './cooperative.types';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { PendingMembershipApplication, CooperativeMembershipContext } from './cooperative-membership.service';
import { CooperativeMembershipService } from './cooperative-membership.service';
import { CooperativeNotificationService } from './cooperative-notification.service';
import { CooperativeLoanApiService } from './cooperative-loan-api.service';
import { CooperativeGroupService, CooperativeGroupContext } from './cooperative-group.service';
import { CooperativeRepaymentService } from './cooperative-repayment.service';

@Injectable({ providedIn: 'root' })
export class CooperativeService {
  /**
   * Approve a pending cooperative membership application by ID
   */
  approveMembershipApplication(applicationId: number) {
    return this.cooperativeMembershipService.approvePendingMembershipApplication(this.getMembershipContext(), applicationId);
  }

  /**
   * Reject a pending cooperative membership application by ID
   */
  rejectMembershipApplication(applicationId: number) {
    return this.cooperativeMembershipService.rejectPendingMembershipApplication(this.getMembershipContext(), applicationId);
  }

  /**
   * Synchronize all existing CooperativeMember records so memberId = employeeId
   */
  private synchronizeMemberIds(): void {
    let changed = false;
    this.members = this.members.map(member => {
      if (member.employeeId && member.memberId !== member.employeeId) {
        changed = true;
        return { ...member, memberId: member.employeeId };
      }
      return member;
    });
    if (changed) {
      this.saveToStorage();
    }
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

  // Track if we're using real API data or local fallback
  usingRealApiData = false;

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
        this.loans = (data.loans || []).map((loan: any, idx: number) => ({
          ...loan,
          loanCode: String(loan.loanCode || loan.loanId || ''),
          loanId: Number(loan.loanId || loan.loanCode || idx + 1),
          cooperativeMemberId: Number(loan.cooperativeMemberId || loan.memberId || 0),
          memberId: Number(loan.memberId || loan.cooperativeMemberId || 0),
          cooperativeGroupId: Number(loan.cooperativeGroupId || loan.groupId || 0),
          groupId: Number(loan.groupId || loan.cooperativeGroupId || 0),
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
            memberId: Number(guarantor.memberId || 0),
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
        this.notifications = (data.notifications || []).map((notification: any, idx: number) => ({
          ...notification,
          id: Number(notification.id || idx + 1),
          type: notification.type || 'LOAN_PENDING_APPROVAL',
          recipient: notification.recipient || 'ADMIN',
          loanId: Number(notification.loanId || 0)
        }));
        this.pendingMembershipApplications = (data.pendingMembershipApplications || []).map((item: any) => ({
          id: Number(item.id),
          employeeId: Number(item.employeeId),
          fullName: String(item.fullName || 'Employee'),
          requestedTier: String(item.requestedTier || 'STANDARD'),
          source: item.source === 'ADMIN_INVITE' ? 'ADMIN_INVITE' : 'SELF',
          requestDate: item.requestDate || new Date().toISOString(),
          note: item.note,
          status: 'PENDING_MANAGER_APPROVAL'
        }));
        this.groupMemberships = (data.groupMemberships || []).map((membership: any) => ({
          id: Number(membership.id),
          memberId: Number(membership.memberId),
          groupId: Number(membership.groupId),
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
          id: Number(entry.id),
          membershipId: Number(entry.membershipId),
          memberId: Number(entry.memberId),
          groupId: Number(entry.groupId),
          amount: Number(entry.amount || 0),
          contributionMonth: String(entry.contributionMonth || ''),
          contributedAt: entry.contributedAt || new Date().toISOString(),
          status: 'POSTED'
        }));
        this.groupInviteHistory = (data.groupInviteHistory || []).map((entry: any) => ({
          id: Number(entry.id),
          groupId: Number(entry.groupId),
          employeeId: Number(entry.employeeId),
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
        loan.id = Number(refreshedInternalId);
        usedInternalIds.add(refreshedInternalId);
        changed = true;

        if (originalInternalId && originalInternalId !== String(refreshedInternalId)) {
          internalIdRemap.set(originalInternalId, String(refreshedInternalId));
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
        loan.loanId = Number(refreshedLoanCode.replace(/\D/g, ''));
        usedLoanCodes.add(refreshedLoanCode);
        changed = true;
      }
    }

    if (internalIdRemap.size > 0) {
      this.repayments = this.repayments.map(repayment => ({
        ...repayment,
        loanId: Number(internalIdRemap.get(String(repayment.loanId)) || repayment.loanId)
      }));

      this.notifications = this.notifications.map(notification => ({
        ...notification,
        loanId: Number(internalIdRemap.get(String(notification.loanId)) || notification.loanId)
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
      // Remove derived notifications (previously used string IDs)
      if (typeof notification.id !== 'number') {
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
    let derivedIdCounter = 100000; // Start derived IDs at a high number to avoid collision

    this.pendingMembershipApplications.forEach((application) => {
      derivedNotifications.push({
        id: derivedIdCounter++,
        type: 'LOAN_STATUS_UPDATE',
        recipient: 'ADMIN',
        title: 'Membership Approval Pending',
        message: `${application.fullName} (${application.employeeId}) submitted a cooperative membership request and is pending manager approval.`,
        loanId: 0,
        memberId: Number(application.employeeId),
        createdAt: application.requestDate || new Date().toISOString(),
        read: false
      });
    });

    this.groupMemberships.forEach((membership) => {
      const member = this.getMemberById(membership.memberId);
      const group = this.getGroupById(membership.groupId);

      if (membership.status === 'PENDING') {
        derivedNotifications.push({
          id: derivedIdCounter++,
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
          id: derivedIdCounter++,
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
      const memberId = loan.memberId || loan.cooperativeMemberId || 0;
      const member = memberId ? this.getMemberById(memberId) : undefined;
      const groupId = loan.groupId || loan.cooperativeGroupId || 0;
      const group = groupId ? this.getGroupById(groupId) : undefined;
      const loanCode = String(loan.loanCode || loan.loanId || loan.id || '');

      if (loan.status === 'PENDING' || loan.applicationStage === 'READY_FOR_ADMIN_REVIEW' || loan.applicationStage === 'UNDER_ADMIN_REVIEW') {
        derivedNotifications.push({
          id: derivedIdCounter++,
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
          id: derivedIdCounter++,
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
          id: derivedIdCounter++,
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
        .filter((guarantor: any) => !!guarantor.memberId)
        .filter((guarantor: any) => guarantor.status === 'PENDING')
        .forEach((guarantor: any) => {
          derivedNotifications.push({
            id: derivedIdCounter++,
            type: 'GUARANTOR_REQUEST',
            recipient: 'MEMBER',
            title: 'Guarantor Request',
            message: `You were requested as guarantor for loan ${loanCode} (${this.formatCurrency(Number(guarantor.guaranteedAmount || 0))}).`,
            loanId: loan.id,
            memberId: guarantor.memberId,
            createdAt: guarantor.requestedAt || loan.applicationDate || loan.requestDate || new Date().toISOString(),
            read: false
          });
        });

      const openRepayments = this.repayments
        .filter((repayment) => repayment.loanId === loan.id && repayment.status !== 'PAID')
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
        id: derivedIdCounter++,
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
    const missingGroups = defaultGroups.filter(group => !existingGroupIds.has(String(group.id)));

    if (missingGroups.length === 0) {
      return false;
    }

    this.groups = [...this.groups, ...missingGroups];
    return true;
  }

  private getDefaultGroups(): CooperativeLoanGroup[] {
    return [
      {
        id: 1,
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
        id: 2,
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
        id: 3,
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

    let membershipIdCounter = 1;
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
          id: membershipIdCounter++,
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
    let contributionIdCounter = 1;
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
          id: contributionIdCounter++,
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
        id: 1,
        memberId: 1,
        employeeId: 1,
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
        id: 2,
        memberId: 2,
        employeeId: 2,
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
        id: 3,
        memberId: 3,
        employeeId: 3,
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
      }
    ];
  }

  private createSampleLoans(): void {
    const now = new Date().toISOString();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    this.loans = [];
    for (let i = 0; i < 5; i++) {
      this.loans.push({
        id: i + 1,
        loanCode: `COPLO-00${i + 1}`,
        loanId: i + 1,
        cooperativeMemberId: i + 1,
        memberId: i + 1,
        cooperativeGroupId: 1,
        groupId: 1,
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
      });
    }
  }

  // ==================== MEMBER METHODS ====================

  getMembers(): Observable<CooperativeMember[]> {
    return this.cooperativeLoanApiService.getAllMembers().pipe(
      map((rawMembers) => {
        console.log('Raw members from API:', rawMembers);
        
        if (!rawMembers || rawMembers.length === 0) {
          console.warn('No members found in backend. Using local sample data.');
          this.usingRealApiData = false;
          return [...this.members];
        }
        
        this.usingRealApiData = true;
        const members = rawMembers.map((member) => this.mapApiMemberToMember(member));
        this.syncMemberCache(members, rawMembers);
        return members;
      }),
      catchError((error) => {
        console.error('Failed to load cooperative members', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        
        if (error.status === 401) {
          console.warn('Authentication required. Please log in again.');
        }
        
        this.usingRealApiData = false;
        return of([...this.members]);
      })
    );
  }

  getMembersObservable(): Observable<CooperativeMember[]> {
    return this.membersSubject.asObservable();
  }

  getMemberById(id: number): CooperativeMember | undefined {
    return this.members.find(m => m.id === id || m.memberId === id || m.employeeId === id);
  }

  isUsingRealData(): boolean {
    return this.usingRealApiData;
  }

  addMember(member: Omit<CooperativeMember, 'id' | 'memberId' | 'createdAt' | 'updatedAt'>): Observable<CooperativeMember> {
    // Always set memberId = employeeId
    const patchedMember = {
      ...member,
      memberId: member.employeeId
    };
    return this.cooperativeLoanApiService.createMember(this.buildMemberApiPayload(patchedMember)).pipe(
      map((rawMember) => {
        const createdMember = this.mergeMemberLocalFields(this.mapApiMemberToMember(rawMember), patchedMember);
        this.upsertMemberInCache(createdMember, rawMember);
        return createdMember;
      })
    );
  }

  updateMember(member: CooperativeMember): Observable<CooperativeMember> {
    // Always set memberId = employeeId
    const patchedMember = {
      ...member,
      memberId: member.employeeId
    };
    return this.cooperativeLoanApiService.updateMember(Number(member.id), this.buildMemberApiPayload(patchedMember)).pipe(
      map((rawMember) => {
        const updatedMember = this.mergeMemberLocalFields(this.mapApiMemberToMember(rawMember), patchedMember);
        this.upsertMemberInCache(updatedMember, rawMember);
        return updatedMember;
      })
    );
  }

  loadMemberById(id: number): Observable<CooperativeMember | undefined> {
    if (!Number.isFinite(id)) {
      return of(this.getMemberById(id));
    }

    return this.cooperativeLoanApiService.getMemberById(id).pipe(
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

  deleteMember(id: number): boolean {
    const index = this.members.findIndex(m => m.memberId === id);
    if (index !== -1) {
      this.members.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // ==================== LOAN METHODS ====================

  getLoans(): Observable<CooperativeLoan[]> {
    return this.cooperativeLoanApiService.getAllLoans().pipe(
      map((rawLoans) => {
        console.log('Raw loans from API:', rawLoans);
        
        if (!rawLoans || rawLoans.length === 0) {
          console.warn('No loans found in backend. Using local loans.');
          return [...this.loans];
        }
        
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

  getLoanById(id: number): CooperativeLoan | undefined {
    return this.loans.find(l => l.loanId === id || l.id === id);
  }

  getLoansByMember(memberId: number): CooperativeLoan[] {
    return this.loans.filter(l => l.cooperativeMemberId === memberId || l.memberId === memberId);
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
    return this.cooperativeLoanApiService.updateLoan(Number(loan.id), this.buildUpdateLoanPayload(loan)).pipe(
      map((rawLoan) => {
        this.mergeLoanReferenceData([rawLoan]);
        const updatedLoan = this.mapApiLoanToLoan(rawLoan);
        this.upsertLoanInCache(updatedLoan);
        return updatedLoan;
      })
    );
  }

  // ==================== LOAN DETAIL METHODS ====================

  loadLoanById(id: number): Observable<CooperativeLoan | undefined> {
    if (!Number.isFinite(id)) {
      return of(this.getLoanById(id));
    }

    return this.cooperativeLoanApiService.getLoanById(id).pipe(
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

  // ==================== LOAN WORKFLOW METHODS ====================

  approveLoan(id: number): Observable<CooperativeLoan | undefined> {
    const loan = this.getLoanById(id);
    if (!loan || loan.status !== 'PENDING') {
      return of(undefined);
    }

    loan.status = 'APPROVED';
    loan.approvedDate = new Date().toISOString();
    loan.fundsReserved = true;
    loan.updatedAt = new Date().toISOString();
    this.appendLoanStatusHistory(loan, 'APPROVED', 'Loan approved and funds reserved for disbursement.');
    this.updateLoan(loan).subscribe();
    return of(loan);
  }

  rejectLoan(id: number, reason: string): Observable<CooperativeLoan | undefined> {
    const loan = this.getLoanById(id);
    if (!loan || (loan.status !== 'PENDING' && loan.status !== 'APPROVED')) {
      return of(undefined);
    }

    loan.status = 'REJECTED';
    loan.rejectionReason = reason;
    loan.rejectedDate = new Date().toISOString();
    loan.updatedAt = new Date().toISOString();
    this.appendLoanStatusHistory(loan, 'REJECTED', `Loan rejected: ${reason}`);
    this.updateLoan(loan).subscribe();
    return of(loan);
  }

  disburseLoan(id: number): Observable<CooperativeLoan | undefined> {
    const loan = this.getLoanById(id);
    if (!loan || loan.status !== 'APPROVED') {
      return of(undefined);
    }

    loan.status = 'ACTIVE';
    loan.disbursedDate = new Date().toISOString();
    loan.updatedAt = new Date().toISOString();
    this.appendLoanStatusHistory(loan, 'ACTIVE', 'Loan disbursed and activated.');
    this.updateLoan(loan).subscribe();
    return of(loan);
  }

  requestLoanChanges(id: number, note: string): Observable<CooperativeLoan | undefined> {
    const loan = this.getLoanById(id);
    if (!loan) {
      return of(undefined);
    }

    loan.adminRequestNote = note;
    loan.applicationStage = 'INFO_REQUESTED';
    loan.infoRequestedDate = new Date().toISOString();
    loan.updatedAt = new Date().toISOString();
    this.appendLoanStatusHistory(loan, loan.status || 'PENDING', `Additional information requested: ${note}`);
    this.updateLoan(loan).subscribe();
    return of(loan);
  }

  setLoanPendingReview(id: number, note?: string): Observable<CooperativeLoan | undefined> {
    const loan = this.getLoanById(id);
    if (!loan) {
      return of(undefined);
    }

    loan.status = 'PENDING';
    loan.applicationStage = 'READY_FOR_ADMIN_REVIEW';
    if (note) {
      loan.adminRequestNote = note;
    }
    loan.updatedAt = new Date().toISOString();
    this.appendLoanStatusHistory(loan, 'PENDING', note || 'Loan kept pending for admin review.');
    this.updateLoan(loan).subscribe();
    return of(loan);
  }

  submitGuarantorDecision(loanId: number, guarantorMemberId: number, decision: 'APPROVED' | 'REJECTED'): Observable<CooperativeLoan | undefined> {
    const loan = this.getLoanById(loanId);
    if (!loan || !loan.guarantors) {
      return of(undefined);
    }

    const guarantor = loan.guarantors.find(g => g.memberId === guarantorMemberId);
    if (!guarantor || guarantor.status !== 'PENDING') {
      return of(undefined);
    }

    guarantor.status = decision;
    guarantor.decidedAt = new Date().toISOString();

    const hasFailed = loan.guarantors.some(g => g.status === 'REJECTED');
    const allApproved = loan.guarantors.every(g => g.status === 'APPROVED');

    if (hasFailed) {
      loan.status = 'REJECTED';
      loan.rejectedDate = new Date().toISOString();
      loan.rejectionReason = 'Guarantor approval failed.';
      loan.applicationStage = undefined;
      this.appendLoanStatusHistory(loan, 'REJECTED', loan.rejectionReason);
    } else if (allApproved) {
      loan.applicationStage = 'READY_FOR_ADMIN_REVIEW';
    } else {
      loan.applicationStage = 'PENDING_GUARANTOR_APPROVAL';
    }

    loan.updatedAt = new Date().toISOString();
    this.updateLoan(loan).subscribe();
    return of(loan);
  }

  markLoanAsDefaulted(id: number): Observable<CooperativeLoan | undefined> {
    const loan = this.getLoanById(id);
    if (!loan || (loan.status !== 'ACTIVE' && loan.status !== 'APPROVED')) {
      return of(undefined);
    }

    loan.status = 'DEFAULTED';
    loan.defaultedDate = new Date().toISOString();
    loan.updatedAt = new Date().toISOString();
    this.appendLoanStatusHistory(loan, 'DEFAULTED', 'Loan marked as defaulted.');
    this.updateLoan(loan).subscribe();
    return of(loan);
  }

  sendRepaymentReminder(id: number): boolean {
    const loan = this.getLoanById(id);
    if (!loan || loan.status !== 'ACTIVE') {
      return false;
    }

    const repayments = this.getRepaymentsByLoanId(id);
    const overdueRepayments = repayments.filter(r => r.status === 'OVERDUE');
    
    if (overdueRepayments.length > 0) {
      this.createMemberStatusNotification(loan, 'Overdue Payment Reminder', 
        `You have ${overdueRepayments.length} overdue repayment(s) totaling ${this.formatCurrency(overdueRepayments.reduce((sum, r) => sum + r.amount, 0))}.`);
    } else {
      const nextDue = repayments.filter(r => r.status !== 'PAID').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
      if (nextDue) {
        this.createMemberStatusNotification(loan, 'Upcoming Payment Reminder',
          `Your next repayment of ${this.formatCurrency(nextDue.amount)} is due on ${new Date(nextDue.dueDate).toLocaleDateString()}.`);
      }
    }
    
    return true;
  }

  // ==================== GROUP METHODS ====================

  loadGroups(): Observable<CooperativeLoanGroup[]> {
    return this.cooperativeGroupService.getAllCooperativeGroups().pipe(
      map((rawGroups) => {
        console.log('Raw groups from API:', rawGroups);
        
        if (!rawGroups || rawGroups.length === 0) {
          console.warn('No groups found in backend. Using local groups.');
          return this.getGroups();
        }
        
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

  loadGroupById(id: number): Observable<CooperativeLoanGroup | undefined> {
    if (!Number.isFinite(id)) {
      return of(this.getGroupById(id));
    }

    return this.cooperativeGroupService.getCooperativeGroupById(id).pipe(
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

  getGroups(): CooperativeLoanGroup[] {
    return [...this.groups];
  }

  getGroupById(id: number): CooperativeLoanGroup | undefined {
    return this.groups.find(g => g.id === id);
  }

  addGroup(group: Omit<CooperativeLoanGroup, 'id'>): Observable<CooperativeLoanGroup> {
    const newGroup: CooperativeLoanGroup = {
      ...group,
      id: Date.now(),
      minEligibleSalary: Number(group.minEligibleSalary || 0),
      monthlyContributionAmount: Number(group.monthlyContributionAmount || 0),
      maxBorrowingPercentage: Number(group.maxBorrowingPercentage || 0),
      minMemberTenureMonths: Number(group.minMemberTenureMonths || 0),
      requiresGuarantors: Boolean(group.requiresGuarantors),
      minimumGuarantors: Number(group.minimumGuarantors || 0),
      quickDisbursement: Boolean(group.quickDisbursement),
      patronageRate: group.patronageEligible ? group.patronageRate : 0
    };
    
    this.groups.push(newGroup);
    this.saveToStorage();
    return of({ ...newGroup });
  }

  updateGroup(group: CooperativeLoanGroup): Observable<CooperativeLoanGroup> {
    const index = this.groups.findIndex(g => g.id === group.id);
    if (index !== -1) {
      this.groups[index] = { ...group };
      this.saveToStorage();
    }
    return of({ ...group });
  }

  setGroupStatus(id: number, status: 'ACTIVE' | 'INACTIVE'): Observable<CooperativeLoanGroup | undefined> {
    const group = this.getGroupById(id);
    if (!group) {
      return of(undefined);
    }
    
    group.status = status;
    this.saveToStorage();
    return of(group);
  }

  getGroupInviteHistory(groupId: number): CooperativeGroupInviteHistoryEntry[] {
    return this.groupInviteHistory
      .filter(entry => entry.groupId === groupId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }

  recordGroupInvites(groupId: number, invites: Array<Omit<CooperativeGroupInviteHistoryEntry, 'id' | 'groupId' | 'sentAt'>>): CooperativeGroupInviteHistoryEntry[] {
    const createdEntries = invites.map(invite => ({
      ...invite,
      id: Date.now(),
      groupId,
      sentAt: new Date().toISOString()
    }));

    this.groupInviteHistory = [...createdEntries, ...this.groupInviteHistory];
    this.saveToStorage();
    return createdEntries;
  }

  // ==================== GROUP MEMBERSHIP METHODS ====================

  getGroupMemberships(): CooperativeGroupMembership[] {
    return this.groupMemberships.map(item => ({ ...item }));
  }

  getGroupMembershipsByMember(memberId: number): CooperativeGroupMembership[] {
    return this.groupMemberships.filter(item => item.memberId === memberId);
  }

  getGroupMembership(memberId: number, groupId: number): CooperativeGroupMembership | undefined {
    return this.groupMemberships.find(item => item.memberId === memberId && item.groupId === groupId);
  }

  getContributionEntriesByGroup(groupId: number): CooperativeContributionEntry[] {
    return this.contributionEntries.filter(entry => entry.groupId === groupId);
  }

  getMaxBorrowableAmountForGroup(memberId: number, groupId: number): number {
    const group = this.getGroupById(groupId);
    const membership = this.getGroupMembership(memberId, groupId);
    if (!group || !membership || membership.status !== 'ACTIVE') {
      return 0;
    }
    return Number(((membership.totalContribution || 0) * (Number(group.maxBorrowingPercentage || 0) / 100)).toFixed(2));
  }

  applyForGroupMembership(memberId: number, groupId: number): CooperativeGroupMembership {
    const existing = this.getGroupMembership(memberId, groupId);
    if (existing) {
      if (existing.status === 'REJECTED') {
        existing.status = 'PENDING';
        existing.requestedAt = new Date().toISOString();
        existing.reviewedAt = undefined;
        existing.rejectionReason = undefined;
        this.saveToStorage();
      }
      return { ...existing };
    }

    const group = this.getGroupById(groupId);
    const membership: CooperativeGroupMembership = {
      id: Date.now(),
      memberId,
      groupId,
      status: 'PENDING',
      monthlyContributionAmount: Number(group?.monthlyContributionAmount || 0),
      totalContribution: 0,
      joinedAt: '',
      requestedAt: new Date().toISOString()
    };

    this.groupMemberships.push(membership);
    this.saveToStorage();
    return { ...membership };
  }

  approveGroupMembership(id: number, note?: string): CooperativeGroupMembership | undefined {
    const membership = this.groupMemberships.find(m => m.id === id);
    if (!membership) {
      return undefined;
    }

    membership.status = 'ACTIVE';
    membership.joinedAt = new Date().toISOString();
    membership.reviewedAt = membership.joinedAt;
    membership.reviewNote = note?.trim() || undefined;
    membership.rejectionReason = undefined;
    this.saveToStorage();
    return { ...membership };
  }

  rejectGroupMembership(id: number, reason: string): CooperativeGroupMembership | undefined {
    const membership = this.groupMemberships.find(m => m.id === id);
    if (!membership) {
      return undefined;
    }

    membership.status = 'REJECTED';
    membership.reviewedAt = new Date().toISOString();
    membership.reviewNote = reason.trim() || undefined;
    membership.rejectionReason = reason.trim() || undefined;
    this.saveToStorage();
    return { ...membership };
  }

  recordGroupContribution(membershipId: number, payload: { amount: number; contributionMonth: string; contributedAt?: string }): CooperativeContributionEntry | undefined {
    const membership = this.groupMemberships.find(m => m.id === membershipId && m.status === 'ACTIVE');
    if (!membership) {
      return undefined;
    }

    const amount = Number(payload.amount || 0);
    const contributionMonth = String(payload.contributionMonth || '').trim();
    if (amount <= 0 || !/^\d{4}-\d{2}$/.test(contributionMonth)) {
      return undefined;
    }

    const hasExistingEntry = this.contributionEntries.some(entry => entry.membershipId === membershipId && entry.contributionMonth === contributionMonth);
    if (hasExistingEntry) {
      return undefined;
    }

    const contributedAt = payload.contributedAt || new Date().toISOString();
    const entry: CooperativeContributionEntry = {
      id: Date.now(),
      membershipId,
      memberId: membership.memberId,
      groupId: membership.groupId,
      amount,
      contributionMonth,
      contributedAt,
      status: 'POSTED'
    };

    this.contributionEntries.push(entry);
    membership.totalContribution = Number((Number(membership.totalContribution || 0) + amount).toFixed(2));
    membership.lastContributionDate = contributedAt;
    this.saveToStorage();

    return { ...entry };
  }

  // ==================== REPAYMENT METHODS ====================

  getRepaymentsByLoanId(loanId: number): CooperativeRepayment[] {
    return this.repayments.filter(repayment => repayment.loanId === loanId);
  }

  recordRepayment(loanId: number, payload: { amount: number; modeofPayment: CooperativeRepayment['modeofPayment']; paidDate?: string }): Observable<CooperativeRepayment | undefined> {
    const loan = this.getLoanById(loanId);
    if (!loan || loan.status !== 'ACTIVE') {
      return of(undefined);
    }

    const repayment: CooperativeRepayment = {
      id: Date.now(),
      loanId,
      amount: payload.amount,
      dueDate: new Date().toISOString(),
      paidDate: payload.paidDate || new Date().toISOString(),
      modeofPayment: payload.modeofPayment,
      status: 'PAID'
    };

    this.repayments.push(repayment);
    loan.totalPaid = Number((Number(loan.totalPaid || 0) + payload.amount).toFixed(2));
    this.saveToStorage();

    return of(repayment);
  }

  applyPatronageToMemberLoan(memberId: number, amount: number): Observable<{ appliedAmount: number; loanId?: number }> {
    const activeLoan = this.loans
      .filter(l => (l.memberId || l.cooperativeMemberId) === memberId && l.status === 'ACTIVE')
      .sort((a, b) => new Date(a.applicationDate || a.requestDate).getTime() - new Date(b.applicationDate || b.requestDate).getTime())[0];

    if (!activeLoan || amount <= 0) {
      return of({ appliedAmount: 0 });
    }

    const repayment: CooperativeRepayment = {
      id: Date.now(),
      loanId: activeLoan.id,
      amount: amount,
      dueDate: new Date().toISOString(),
      paidDate: new Date().toISOString(),
      modeofPayment: 'OTHER',
      status: 'PAID',
      notes: 'Patronage applied to loan balance.'
    };

    this.repayments.push(repayment);
    activeLoan.totalPaid = Number((Number(activeLoan.totalPaid || 0) + amount).toFixed(2));
    this.saveToStorage();

    return of({ appliedAmount: amount, loanId: activeLoan.id });
  }

  // ==================== STATS METHODS ====================

  getStats(): CooperativeStats {
    return {
      totalMembers: this.members.length,
      activeMembers: this.members.filter(m => m.status === 'ACTIVE').length,
      totalLoans: this.loans.length,
      activeLoans: this.loans.filter(l => l.status === 'ACTIVE').length,
      pendingLoans: this.loans.filter(l => l.status === 'PENDING').length,
      totalFund: this.members.reduce((sum, m) => sum + m.shareCapital, 0),
      loanPortfolio: this.loans.filter(l => l.status === 'ACTIVE').reduce((sum, l) => sum + l.amount, 0)
    };
  }

  // ==================== UTILITY METHODS ====================

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getMembersSnapshot(): CooperativeMember[] {
    return [...this.members];
  }

  getNotificationsSnapshot(): CooperativeNotification[] {
    return this.buildNotificationsSnapshot();
  }

  getNotificationsObservable(): Observable<CooperativeNotification[]> {
    return this.notificationsSubject.asObservable();
  }

  // ==================== PRIVATE HELPER METHODS ====================

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
      getMemberById: (id: number) => this.getMemberById(id),
      getLoanById: (id: number) => this.getLoanById(id),
      getGroupById: (id: number) => this.getGroupById(id),
      formatCurrency: (amount: number) => this.formatCurrency(amount)
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


  private generateMemberCode(id: number | string): string {
    const numericId = Number(id);
    if (Number.isFinite(numericId) && numericId > 0) {
      return `COP-${String(numericId).padStart(3, '0')}`;
    }
    return `COP-${String(id)}`;
  }

  private mapApiMemberToMember(rawMember: CooperativeLoanApiMemberRef): CooperativeMember {
    return {
      id: Number(rawMember.id),
      employeeId: Number(rawMember.employeeId),
      memberId: Number(rawMember.id),
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

  private mapApiGroupToGroup(rawGroup: CooperativeGroupApiResponse): CooperativeLoanGroup {
    return {
      id: Number(rawGroup.id),
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

  private mapApiLoanToLoan(rawLoan: CooperativeLoanApiResponse): CooperativeLoan {
    return {
      id: Number(rawLoan.id),
      loanCode: String(rawLoan.loanCode || `COPLO-${rawLoan.id}`),
      cooperativeMemberId: Number(rawLoan.cooperativeMemberId),
      cooperativeGroupId: Number(rawLoan.cooperativeGroupId),
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
      guarantors: [],
      guarantorApproval: Boolean(rawLoan.guarantorApproval),
      totalPaid: Number(rawLoan.totalPaid || 0),
      totalPrincipalPaid: Number(rawLoan.totalPrincipalPaid || 0),
      totalInterestPaid: Number(rawLoan.totalInterestPaid || 0),
      outstandingPrincipal: Number(rawLoan.outstandingPrincipal || 0),
      paymentHistory: [],
      statusHistory: [],
      loanId: typeof rawLoan.loanCode === 'string' && !isNaN(Number(rawLoan.loanCode)) ? Number(rawLoan.loanCode) : (typeof rawLoan.id === 'number' ? rawLoan.id : undefined),
      memberId: Number(rawLoan.cooperativeMemberId),
      groupId: Number(rawLoan.cooperativeGroupId),
      duration: Number(rawLoan.repaymentTime || 0),
      interestRate: 0,
      totalRepayment: 0,
      applicationDate: rawLoan.requestDate || '',
      completionDate: rawLoan.completedDate || ''
    };
  }

  private buildCreateLoanPayload(loan: Omit<CooperativeLoan, 'id' | 'loanId' | 'createdAt' | 'updatedAt'>): CooperativeLoanApiCreatePayload {
    const now = new Date().toISOString();
    this.members = [
      {
        id: 1,
        memberId: 1,
        employeeId: 1,
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
        id: 2,
        memberId: 2,
        employeeId: 2,
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
        id: 3,
        memberId: 3,
        employeeId: 3,
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
      }
    ];
    return {
      id: 0, // API will assign
      loanCode: loan.loanCode,
      cooperativeMemberId: { id: loan.cooperativeMemberId },
      cooperativeGroupId: { id: loan.cooperativeGroupId },
      amount: loan.amount,
      purpose: loan.purpose,
      repaymentAmount: loan.repaymentAmount,
      repaymentTime: loan.repaymentTime,
      modeOfPayment: loan.modeOfPayment,
      requestDate: loan.requestDate,
      approvedDate: loan.approvedDate,
      disbursedDate: loan.disbursedDate,
      completedDate: loan.completedDate,
      rejectedDate: loan.rejectedDate,
      status: loan.status,
      adminComment: loan.adminComment,
      applicationStage: loan.applicationStage,
      guarantorsId: undefined,
      guarantorApproval: loan.guarantorApproval,
      totalPaid: loan.totalPaid,
      totalPrincipalPaid: loan.totalPrincipalPaid,
      totalInterestPaid: loan.totalInterestPaid,
      outstandingPrincipal: loan.outstandingPrincipal,
      paymentHistory: loan.paymentHistory as any,
      statusHistory: loan.statusHistory as any
    };
  }

  private buildUpdateLoanPayload(loan: CooperativeLoan): CooperativeLoanApiUpdatePayload {
    return {
      ...loan,
      cooperativeMemberId: loan.cooperativeMemberId,
      cooperativeGroupId: loan.cooperativeGroupId
    };
  }

  private mergeLoanReferenceData(rawLoans: CooperativeLoanApiResponse[]): void {
    rawLoans.forEach((loan) => {
      const mappedMember = this.mapBackendMemberToLocal(loan.cooperativeMemberId);
      if (mappedMember) {
        const existingMemberIndex = this.members.findIndex((member) => member.id === mappedMember.id);
        if (existingMemberIndex === -1) {
          this.members = [...this.members, mappedMember];
        }
      }
    });
    this.publishState();
  }

  private mapBackendMemberToLocal(memberRef: CooperativeLoanApiMemberRef | number | string | undefined): CooperativeMember | undefined {
    if (!memberRef || typeof memberRef !== 'object' || !('id' in memberRef)) {
      return undefined;
    }
    const employee = memberRef.employee;
    const fullName = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || `Member ${memberRef.id}`;
    return {
      id: Number(memberRef.id),
      employeeId: Number(memberRef.employeeId),
      memberId: Number(memberRef.id),
      fullName,
      email: String(employee?.workEmail || employee?.email || ''),
      phone: String(employee?.phone || ''),
      joinDate: new Date().toISOString(),
      status: (memberRef.status as CooperativeMember['status']) || 'ACTIVE',
      shareCapital: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
      this.publishState();
    }
  }

  private syncMemberCache(members: CooperativeMember[], rawMembers: CooperativeLoanApiMemberRef[]): void {
    this.memberApiRecords = rawMembers.reduce<Record<string, CooperativeLoanApiMemberRef>>((records, member) => {
      records[String(member.id)] = member;
      return records;
    }, {});
    this.members = members;
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
    }
    this.publishState();
  }

  private mergeMemberLocalFields(member: CooperativeMember, existingMember?: Partial<CooperativeMember>): CooperativeMember {
    return {
      ...member,
      employeeId: Number(member.employeeId || existingMember?.employeeId || 0),
      memberId: Number(member.memberId || existingMember?.memberId || 0),
      shareCapital: Number(member.shareCapital || existingMember?.shareCapital || 0),
      address: member.address || existingMember?.address,
      emergencyContact: member.emergencyContact || existingMember?.emergencyContact,
      createdAt: String(existingMember?.createdAt || member.createdAt || new Date().toISOString()),
      updatedAt: new Date().toISOString()
    };
  }

  private buildMemberApiPayload(member: Partial<CooperativeMember>): CooperativeLoanApiMemberPayload {
    const existingRaw = this.memberApiRecords[String(member.id || '')];
    const employeeId = Number(member.employeeId || existingRaw?.employeeId);
    return {
      id: Number(member.id || existingRaw?.id),
      employeeId,
      status: String(member.status || existingRaw?.status || 'ACTIVE'),
      cooperativeGroup: existingRaw?.cooperativeGroup || [],
      contributionHistory: existingRaw?.contributionHistory || [],
      loanHistory: existingRaw?.loanHistory || []
    };
  }

  private syncLoanCache(loans: CooperativeLoan[]): void {
    this.loans = [...loans];
    this.publishState();
  }

  private upsertLoanInCache(loan: CooperativeLoan): void {
    const existingIndex = this.loans.findIndex((item) => String(item.id) === String(loan.id));
    if (existingIndex === -1) {
      this.loans = [loan, ...this.loans];
    } else {
      this.loans = this.loans.map((item, index) => (index === existingIndex ? loan : item));
    }
    this.publishState();
  }

  private appendLoanStatusHistory(loan: CooperativeLoan, status: string, notes: string, changedAt = new Date().toISOString()): void {
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

  private createPendingApprovalNotification(loan: CooperativeLoan): void {
    this.cooperativeNotificationService.createPendingApprovalNotification(this.getNotificationContext(), loan);
  }

  private createMemberStatusNotification(loan: CooperativeLoan, title: string, message: string): void {
    this.cooperativeNotificationService.createMemberStatusNotification(this.getNotificationContext(), loan, title, message);
  }

  private createGuarantorNotifications(loan: CooperativeLoan): void {
    this.cooperativeNotificationService.createGuarantorNotifications(this.getNotificationContext(), loan);
  }

  // Membership methods
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
}
// Ensure this file is treated as a module
export {};
import type {
  CooperativeEmployeeProfile,
  CooperativeMembershipEligibility,
  CooperativeMembershipApplication,
  CooperativeMembershipActionResult
} from './cooperative.types';
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
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
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
  private saveToStorage(): void {
    const data = {
      members: this.members,
      loans: this.loans,
      groups: this.groups,
      groupMemberships: this.groupMemberships,
      contributionEntries: this.contributionEntries,
      groupInviteHistory: this.groupInviteHistory,
      repayments: this.repayments,
      notifications: this.notifications,
      pendingMembershipApplications: this.pendingMembershipApplications
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }
  private groupMembershipChangedSubject = new Subject<void>();

  public getGroupMembershipChangedObservable(): Observable<void> {
    return this.groupMembershipChangedSubject.asObservable();
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

  constructor() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        this.members = data.members || [];
        this.loans = data.loans || [];
        this.groups = data.groups || [];
        this.groupMemberships = data.groupMemberships || [];
        this.contributionEntries = data.contributionEntries || [];
        this.groupInviteHistory = data.groupInviteHistory || [];
        this.repayments = data.repayments || [];
        this.notifications = data.notifications || [];
        this.pendingMembershipApplications = data.pendingMembershipApplications || [];
      } catch (e) {
        // Ignore parse errors, start fresh
      }
    }
  }

  private membersSubject = new BehaviorSubject<CooperativeMember[]>([]);
  private loansSubject = new BehaviorSubject<CooperativeLoan[]>([]);
  private notificationsSubject = new BehaviorSubject<CooperativeNotification[]>([]);
  private statsSnapshot?: CooperativeStats;
  private memberApiRecords: Record<string, CooperativeLoanApiMemberRef> = {};
  private groupApiRecords: Record<string, CooperativeGroupApiResponse> = {};

  usingRealApiData = true;

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
    let derivedIdCounter = 100000;

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

  // ==================== MEMBER METHODS ====================

  public getMembers(): Observable<CooperativeMember[]> {
    this.debugTokenStatus();
    this.checkUserPermissions();
    console.log('=== Getting members from API ===');
    
    const currentUserId = Number(sessionStorage.getItem('userid')) || 1001;
    const currentUsername = sessionStorage.getItem('username') || 'Current User';
    const currentEmail = sessionStorage.getItem('email') || 'current.user@example.com';
    const currentFullname = sessionStorage.getItem('fullname') || currentUsername;
    
    return this.cooperativeLoanApiService.getAllMembers().pipe(
      map((rawMembers) => {
        console.log('Raw members from API:', rawMembers);
        
        if (rawMembers && (rawMembers as any).error) {
          console.error('API returned error:', (rawMembers as any).error);
          this.usingRealApiData = false;
          return this.createLocalMember(currentUserId, currentFullname, currentEmail);
        }
        
        if (!rawMembers || rawMembers.length === 0) {
          console.log('No members found in backend. This is normal if you haven\'t applied for membership yet.');
          this.usingRealApiData = true;
          return [];
        }
        
        this.usingRealApiData = true;
        const members = rawMembers.map((member) => this.mapApiMemberToMember(member));
        this.syncMemberCache(members, rawMembers);
        return members;
      }),
      catchError((error) => {
        console.error('Failed to load cooperative members, using local fallback:', error);
        this.usingRealApiData = false;
        return of(this.createLocalMember(currentUserId, currentFullname, currentEmail));
      })
    );
  }

  private createLocalMember(userId: number, fullName: string, email: string): CooperativeMember[] {
    const now = new Date().toISOString();
    const sampleMember: CooperativeMember = {
      id: userId,
      memberId: userId,
      employeeId: userId,
      fullName: fullName,
      email: email,
      phone: '',
      joinDate: now,
      status: 'ACTIVE',
      shareCapital: 0,
      address: '',
      emergencyContact: undefined,
      createdAt: now,
      updatedAt: now
    };
    this.members = [sampleMember];
    console.log('Created local member for UI display only:', sampleMember);
    return [sampleMember];
  }

  public getMembersObservable(): Observable<CooperativeMember[]> {
    return this.membersSubject.asObservable();
  }

  public getMemberById(id: number): CooperativeMember | undefined {
    return this.members.find(m => m.id === id || m.memberId === id || m.employeeId === id);
  }

  public isUsingRealData(): boolean {
    return this.usingRealApiData;
  }

  public addMember(member: Omit<CooperativeMember, 'id' | 'memberId' | 'createdAt' | 'updatedAt'>): Observable<CooperativeMember> {
    const patchedMember = { ...member, memberId: member.employeeId };
    return this.cooperativeLoanApiService.createMember(this.buildMemberApiPayload(patchedMember)).pipe(
      map((rawMember) => {
        const createdMember = this.mergeMemberLocalFields(this.mapApiMemberToMember(rawMember), patchedMember);
        this.upsertMemberInCache(createdMember, rawMember);
        return createdMember;
      })
    );
  }

  public updateMember(member: CooperativeMember): Observable<CooperativeMember> {
    const patchedMember = { ...member, memberId: member.employeeId };
    return this.cooperativeLoanApiService.updateMember(Number(member.id), this.buildMemberApiPayload(patchedMember)).pipe(
      map((rawMember) => {
        const updatedMember = this.mergeMemberLocalFields(this.mapApiMemberToMember(rawMember), patchedMember);
        this.upsertMemberInCache(updatedMember, rawMember);
        return updatedMember;
      })
    );
  }

  public loadMemberById(id: number): Observable<CooperativeMember | undefined> {
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

  // ==================== GROUP METHODS ====================

  public loadGroups(): Observable<CooperativeLoanGroup[]> {
    console.log('[CooperativeService] Loading groups from backend');
    return this.cooperativeGroupService.getAllCooperativeGroups().pipe(
      map((rawGroups) => {
        console.log('[CooperativeService] Raw groups from API:', rawGroups);
        if (rawGroups && (rawGroups as any).error) {
          console.error('[CooperativeService] API returned error for groups:', (rawGroups as any).error);
          return [];
        }
        if (!rawGroups || rawGroups.length === 0) {
          console.warn('[CooperativeService] No groups found in backend.');
          return [];
        }
        const groups = rawGroups.map((group) => this.mapApiGroupToGroup(group));
        this.syncGroupCache(groups, rawGroups);
        console.log('[CooperativeService] Processed groups:', groups);
        return groups;
      }),
      catchError((error) => {
        console.error('[CooperativeService] Failed to load cooperative groups:', error);
        return of([]);
      })
    );
  }

  public loadGroupById(id: number): Observable<CooperativeLoanGroup | undefined> {
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

  public createGroup(group: Omit<CooperativeLoanGroup, 'id'>): Observable<CooperativeLoanGroup> {
    console.log('[CooperativeService] Creating group via API:', group);
    const payload = {
      name: group.name,
      description: group.description || '',
      monthlyAmount: group.monthlyContributionAmount,
      withdrawCap: group.maxAmount,
      interestRate: group.interestRate,
      status: 'ACTIVE',
      memberLimit: 100,
      currentBalance: 0,
      contributionHistory: [],
      loanHistory: [],
      patronageRate: group.patronageRate || 0,
      patronageAmount: 0
    };
    console.log('[CooperativeService] Sending payload:', payload);
    return this.cooperativeGroupService.createCooperativeGroup(payload).pipe(
      map((rawGroup) => {
        console.log('[CooperativeService] Group created successfully:', rawGroup);
        const newGroup = this.mapApiGroupToGroup(rawGroup);
        this.upsertGroupInCache(newGroup, true, rawGroup);
        this.publishState();
        return newGroup;
      }),
      catchError((error) => {
        console.error('[CooperativeService] Failed to create group:', error);
        throw error;
      })
    );
  }

  public updateGroup(group: CooperativeLoanGroup): Observable<CooperativeLoanGroup> {
    console.log('[CooperativeService] Updating group via API:', group);
    const payload = {
      id: group.id,
      name: group.name,
      description: group.description || '',
      monthlyAmount: group.monthlyContributionAmount,
      withdrawCap: group.maxAmount,
      interestRate: group.interestRate,
      status: group.status,
      memberLimit: 100,
      currentBalance: 0,
      contributionHistory: [],
      loanHistory: [],
      patronageRate: group.patronageRate || 0,
      patronageAmount: 0
    };
    return this.cooperativeGroupService.updateCooperativeGroup(group.id, payload).pipe(
      map((rawGroup) => {
        console.log('[CooperativeService] Group updated successfully:', rawGroup);
        const updatedGroup = this.mapApiGroupToGroup(rawGroup);
        this.upsertGroupInCache(updatedGroup, true, rawGroup);
        this.publishState();
        return updatedGroup;
      }),
      catchError((error) => {
        console.error('[CooperativeService] Failed to update group:', error);
        throw error;
      })
    );
  }

  public setGroupStatus(id: number, status: 'ACTIVE' | 'INACTIVE'): Observable<CooperativeLoanGroup | undefined> {
    const group = this.getGroupById(id);
    if (!group) {
      return of(undefined);
    }
    const updatedGroup = { ...group, status };
    return this.updateGroup(updatedGroup);
  }

  public getGroups(): CooperativeLoanGroup[] {
    return [...this.groups];
  }

  public getGroupById(id: number): CooperativeLoanGroup | undefined {
    return this.groups.find(g => g.id === id);
  }

  public addGroup(group: Omit<CooperativeLoanGroup, 'id'>): Observable<CooperativeLoanGroup> {
    return this.createGroup(group);
  }

  public getGroupInviteHistory(groupId: number): CooperativeGroupInviteHistoryEntry[] {
    return this.groupInviteHistory
      .filter(entry => entry.groupId === groupId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }

  public recordGroupInvites(groupId: number, invites: Array<Omit<CooperativeGroupInviteHistoryEntry, 'id' | 'groupId' | 'sentAt'>>): CooperativeGroupInviteHistoryEntry[] {
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

  public getGroupMemberships(): CooperativeGroupMembership[] {
    return this.groupMemberships.map(item => ({ ...item }));
  }

  public getGroupMembershipsByMember(memberId: number): CooperativeGroupMembership[] {
    return this.groupMemberships.filter(item => item.memberId === memberId);
  }

  public getGroupMembership(memberId: number, groupId: number): CooperativeGroupMembership | undefined {
    return this.groupMemberships.find(item => item.memberId === memberId && item.groupId === groupId);
  }

  public applyForGroupMembership(memberId: number, groupId: number): CooperativeGroupMembership {
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

  public approveGroupMembership(id: number, note?: string): CooperativeGroupMembership | undefined {
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
    this.groupMembershipChangedSubject.next();
    return { ...membership };
  }

  public rejectGroupMembership(id: number, reason: string): CooperativeGroupMembership | undefined {
    const membership = this.groupMemberships.find(m => m.id === id);
    if (!membership) {
      return undefined;
    }
    membership.status = 'REJECTED';
    membership.reviewedAt = new Date().toISOString();
    membership.reviewNote = reason.trim() || undefined;
    membership.rejectionReason = reason.trim() || undefined;
    this.saveToStorage();
    this.groupMembershipChangedSubject.next();
    return { ...membership };
  }

  public getContributionEntriesByGroup(groupId: number): CooperativeContributionEntry[] {
    return this.contributionEntries.filter(entry => entry.groupId === groupId);
  }

  public recordGroupContribution(membershipId: number, payload: { amount: number; contributionMonth: string; contributedAt?: string }): CooperativeContributionEntry | undefined {
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

  public getMaxBorrowableAmountForGroup(memberId: number, groupId: number): number {
    const group = this.getGroupById(groupId);
    const membership = this.getGroupMembership(memberId, groupId);
    if (!group || !membership || membership.status !== 'ACTIVE') {
      return 0;
    }
    return Number(((membership.totalContribution || 0) * (Number(group.maxBorrowingPercentage || 0) / 100)).toFixed(2));
  }

  // ==================== LOAN METHODS ====================

  public getLoans(): Observable<CooperativeLoan[]> {
    return this.cooperativeLoanApiService.getAllLoans().pipe(
      map((rawLoans) => {
        if (rawLoans && (rawLoans as any).error) {
          console.warn('API returned error for loans:', (rawLoans as any).error);
          return [];
        }
        const loans = rawLoans.map((loan) => this.mapApiLoanToLoan(loan));
        this.syncLoanCache(loans);
        return loans;
      }),
      catchError((error) => {
        console.error('Failed to load cooperative loans', error);
        return of([]);
      })
    );
  }

  public getLoansObservable(): Observable<CooperativeLoan[]> {
    return this.loansSubject.asObservable();
  }

  public getLoansByMember(memberId: number): CooperativeLoan[] {
    return this.loans.filter(l => l.cooperativeMemberId === memberId || l.memberId === memberId);
  }

  public addLoan(loan: Omit<CooperativeLoan, 'id' | 'loanId' | 'createdAt' | 'updatedAt'>): Observable<CooperativeLoan> {
    return this.cooperativeLoanApiService.createLoan(this.buildCreateLoanPayload(loan)).pipe(
      map((rawLoan) => this.mapApiLoanToLoan(rawLoan)),
      catchError((error) => {
        console.error('Failed to create cooperative loan', error);
        throw error;
      })
    );
  }

  public updateLoan(loan: CooperativeLoan): Observable<CooperativeLoan> {
    return this.cooperativeLoanApiService.updateLoan(Number(loan.id), this.buildUpdateLoanPayload(loan)).pipe(
      map((rawLoan) => this.mapApiLoanToLoan(rawLoan)),
      catchError((error) => {
        console.error('Failed to update cooperative loan', error);
        throw error;
      })
    );
  }

  public getLoanById(id: number): Observable<CooperativeLoan | undefined> {
    return this.cooperativeLoanApiService.getLoanById(id).pipe(
      map((rawLoan) => this.mapApiLoanToLoan(rawLoan)),
      catchError((error) => {
        console.error('Failed to load cooperative loan', error);
        return of(undefined);
      })
    );
  }

  public loadLoanById(id: number): Observable<CooperativeLoan | undefined> {
    if (!Number.isFinite(id)) {
      return of(undefined);
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
        return of(undefined);
      })
    );
  }

  // ==================== LOAN WORKFLOW METHODS ====================

  public approveLoan(id: number): Observable<CooperativeLoan | undefined> {
    return this.loadLoanById(id).pipe(
      switchMap((loan) => {
        if (!loan || loan.status !== 'PENDING') {
          return of(undefined);
        }
        loan.status = 'APPROVED';
        loan.approvedDate = new Date().toISOString();
        (loan as any).fundsReserved = true;
        loan.updatedAt = new Date().toISOString();
        this.appendLoanStatusHistory(loan, 'APPROVED', 'Loan approved and funds reserved for disbursement.');
        return this.updateLoan(loan).pipe(map(() => loan));
      })
    );
  }

  public rejectLoan(id: number, reason: string): Observable<CooperativeLoan | undefined> {
    return this.loadLoanById(id).pipe(
      switchMap((loan) => {
        if (!loan || (loan.status !== 'PENDING' && loan.status !== 'APPROVED')) {
          return of(undefined);
        }
        loan.status = 'REJECTED';
        (loan as any).rejectionReason = reason;
        loan.rejectedDate = new Date().toISOString();
        loan.updatedAt = new Date().toISOString();
        this.appendLoanStatusHistory(loan, 'REJECTED', `Loan rejected: ${reason}`);
        return this.updateLoan(loan).pipe(map(() => loan));
      })
    );
  }

  public disburseLoan(id: number): Observable<CooperativeLoan | undefined> {
    return this.loadLoanById(id).pipe(
      switchMap((loan) => {
        if (!loan || loan.status !== 'APPROVED') {
          return of(undefined);
        }
        loan.status = 'ACTIVE';
        loan.disbursedDate = new Date().toISOString();
        loan.updatedAt = new Date().toISOString();
        this.appendLoanStatusHistory(loan, 'ACTIVE', 'Loan disbursed and activated.');
        return this.updateLoan(loan).pipe(map(() => loan));
      })
    );
  }

  public requestLoanChanges(id: number, note: string): Observable<CooperativeLoan | undefined> {
    return this.loadLoanById(id).pipe(
      switchMap((loan) => {
        if (!loan) {
          return of(undefined);
        }
        (loan as any).adminRequestNote = note;
        loan.applicationStage = 'INFO_REQUESTED';
        (loan as any).infoRequestedDate = new Date().toISOString();
        loan.updatedAt = new Date().toISOString();
        this.appendLoanStatusHistory(loan, loan.status || 'PENDING', `Additional information requested: ${note}`);
        return this.updateLoan(loan).pipe(map(() => loan));
      })
    );
  }

  public setLoanPendingReview(id: number, note?: string): Observable<CooperativeLoan | undefined> {
    return this.loadLoanById(id).pipe(
      switchMap((loan) => {
        if (!loan) {
          return of(undefined);
        }
        loan.status = 'PENDING';
        loan.applicationStage = 'READY_FOR_ADMIN_REVIEW';
        if (note) {
          (loan as any).adminRequestNote = note;
        }
        loan.updatedAt = new Date().toISOString();
        this.appendLoanStatusHistory(loan, 'PENDING', note || 'Loan kept pending for admin review.');
        return this.updateLoan(loan).pipe(map(() => loan));
      })
    );
  }

  public submitGuarantorDecision(loanId: number, guarantorMemberId: number, decision: 'APPROVED' | 'REJECTED'): Observable<CooperativeLoan | undefined> {
    return this.loadLoanById(loanId).pipe(
      switchMap((loan) => {
        if (!loan || !loan.guarantors) {
          return of(undefined);
        }
        const guarantor = loan.guarantors.find((g: any) => g.memberId === guarantorMemberId);
        if (!guarantor || guarantor.status !== 'PENDING') {
          return of(undefined);
        }
        guarantor.status = decision;
        guarantor.decidedAt = new Date().toISOString();
        const hasFailed = loan.guarantors.some((g: any) => g.status === 'REJECTED');
        const allApproved = loan.guarantors.every((g: any) => g.status === 'APPROVED');
        if (hasFailed) {
          loan.status = 'REJECTED';
          loan.rejectedDate = new Date().toISOString();
          (loan as any).rejectionReason = 'Guarantor approval failed.';
          loan.applicationStage = undefined;
          this.appendLoanStatusHistory(loan, 'REJECTED', (loan as any).rejectionReason);
        } else if (allApproved) {
          loan.applicationStage = 'READY_FOR_ADMIN_REVIEW';
        } else {
          loan.applicationStage = 'PENDING_GUARANTOR_APPROVAL';
        }
        loan.updatedAt = new Date().toISOString();
        return this.updateLoan(loan).pipe(map(() => loan));
      })
    );
  }

  public markLoanAsDefaulted(id: number): Observable<CooperativeLoan | undefined> {
    return this.loadLoanById(id).pipe(
      switchMap((loan) => {
        if (!loan || (loan.status !== 'ACTIVE' && loan.status !== 'APPROVED')) {
          return of(undefined);
        }
        loan.status = 'DEFAULTED';
        (loan as any).defaultedDate = new Date().toISOString();
        loan.updatedAt = new Date().toISOString();
        this.appendLoanStatusHistory(loan, 'DEFAULTED', 'Loan marked as defaulted.');
        return this.updateLoan(loan).pipe(map(() => loan));
      })
    );
  }

  public sendRepaymentReminder(id: number): boolean {
    return false;
  }

  // ==================== REPAYMENT METHODS ====================

  public getRepaymentsByLoanId(loanId: number): CooperativeRepayment[] {
    return this.repayments.filter(repayment => repayment.loanId === loanId);
  }

  public recordRepayment(loanId: number, payload: { amount: number; modeofPayment: CooperativeRepayment['modeofPayment']; paidDate?: string }): Observable<CooperativeRepayment | undefined> {
    return this.loadLoanById(loanId).pipe(
      switchMap((loan) => {
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
      })
    );
  }

  public applyPatronageToMemberLoan(memberId: number, amount: number): Observable<{ appliedAmount: number; loanId?: number }> {
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

  public getStats(): CooperativeStats {
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

  // ==================== MEMBERSHIP APPLICATION METHODS ====================

  public async approveMembershipApplication(applicationId: number, note?: string): Promise<CooperativeMembershipActionResult> {
    const result = await this.cooperativeMembershipService.approvePendingMembershipApplication(
      this.getMembershipContext(),
      applicationId,
      note
    );
    this.groupMembershipChangedSubject.next();
    return result;
  }

  public async rejectMembershipApplication(applicationId: number, reason?: string): Promise<CooperativeMembershipActionResult> {
    const result = await this.cooperativeMembershipService.rejectPendingMembershipApplication(
      this.getMembershipContext(),
      applicationId,
      reason
    );
    this.groupMembershipChangedSubject.next();
    return result;
  }

  // Membership methods
  checkMembershipEligibility(employee: CooperativeEmployeeProfile): CooperativeMembershipEligibility {
    return this.cooperativeMembershipService.checkMembershipEligibility(employee);
  }

  async applyForMembership(application: CooperativeMembershipApplication) {
    return await this.cooperativeMembershipService.applyForMembership(
      this.getMembershipContext(),
      application
    );
  }

  inviteEmployee(employee: CooperativeEmployeeProfile): CooperativeMembershipActionResult {
    return this.cooperativeMembershipService.inviteEmployee(this.getMembershipContext(), employee);
  }

  getPendingMembershipApplications(): Array<PendingMembershipApplication> {
    return this.cooperativeMembershipService.getPendingMembershipApplications(this.getMembershipContext());
  }

  // ==================== UTILITY METHODS ====================

  public formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  public getMembersSnapshot(): CooperativeMember[] {
    return [...this.members];
  }

  public getNotificationsSnapshot(): CooperativeNotification[] {
    return this.buildNotificationsSnapshot();
  }

  public getNotificationsObservable(): Observable<CooperativeNotification[]> {
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
      getLoanById: (id: number) => undefined,
      getGroupById: (id: number) => this.getGroupById(id),
      formatCurrency: (amount: number) => this.formatCurrency(amount)
    };
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
    console.log('[CooperativeService] mapApiGroupToGroup input:', rawGroup);
    const status = (rawGroup.status === 'INACTIVE') ? 'INACTIVE' : 'ACTIVE';
    const mappedGroup: CooperativeLoanGroup = {
      id: Number(rawGroup.id),
      name: String(rawGroup.name || rawGroup.code || `Group ${rawGroup.id}`),
      description: String(rawGroup.description || ''),
      minEligibleSalary: 0,
      monthlyContributionAmount: Number(rawGroup.monthlyAmount || 0),
      maxBorrowingPercentage: 100,
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
      status: status
    };
    console.log('[CooperativeService] mapApiGroupToGroup output:', mappedGroup);
    return mappedGroup;
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
    return {
      id: 0,
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

  private debugTokenStatus(): void {
    const token = sessionStorage.getItem('token');
    const Token = sessionStorage.getItem('Token');
    const accessToken = sessionStorage.getItem('accessToken');
    console.log('=== Token Debug ===');
    console.log('token (lowercase):', token ? `${token.substring(0, 50)}...` : 'NOT FOUND');
    console.log('Token (capital T):', Token ? `${Token.substring(0, 50)}...` : 'NOT FOUND');
    console.log('accessToken:', accessToken ? `${accessToken.substring(0, 50)}...` : 'NOT FOUND');
    console.log('User:', sessionStorage.getItem('username'));
    console.log('User ID:', sessionStorage.getItem('userid'));
    console.log('Role:', sessionStorage.getItem('role'));
    console.log('==================');
  }

  private checkUserPermissions(): boolean {
    const role = sessionStorage.getItem('role');
    console.log('Checking user permissions for cooperative access...');
    console.log('User role:', role);
    return true;
  }
}
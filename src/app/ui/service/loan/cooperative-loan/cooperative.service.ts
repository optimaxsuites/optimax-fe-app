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
  CooperativeLoanApiMemberPayload,
  CooperativeContributionHistoryApiPayload,
  CooperativeContributionHistoryApiResponse,
  CooperativeGracePeriodRequestApiPayload,
  CooperativeGracePeriodRequestApiResponse,
  CooperativeGroupMembershipApiPayload,
  CooperativeGroupMembershipApiResponse,
  CooperativeGroupMembershipApiUpdatePayload,
  CooperativeGroupMembershipHistoryApiPayload,
  CooperativeLoanApiAuditUser,
  CooperativeLoanPurposeApiResponse,
  CooperativeLoanGuarantorApiPayload
} from './cooperative-loan-api.service';
import type { CooperativeNotificationContext } from './cooperative-notification.service';
import type { CooperativeRecordedRepayment, CooperativeRepaymentContext } from './cooperative-repayment.service';

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of, Subject, throwError } from 'rxjs';
import { map, catchError, switchMap, finalize, shareReplay } from 'rxjs/operators';
import {
  CooperativeMember,
  CooperativeLoanGroup,
  CooperativeGroupMembership,
  CooperativeGroupMembershipHistory,
  CooperativeContributionEntry,
  CooperativeContributionPaymentMethod,
  CooperativePendingContributionRequest,
  CooperativeGroupInviteHistoryEntry,
  CooperativeRepayment,
  CooperativeNotification,
  CooperativeStats
} from './cooperative.types';
import { CooperativeLoan, CooperativeLoanGracePeriodRequest } from '../../../domain/loan/cooperative-loan.dto';
import { PendingMembershipApplication, CooperativeMembershipContext } from './cooperative-membership.service';
import { CooperativeMembershipService } from './cooperative-membership.service';
import { CooperativeNotificationService } from './cooperative-notification.service';
import { CooperativeLoanApiService } from './cooperative-loan-api.service';
import {
  CooperativeDisbursementConfirmationService,
  CreateCooperativeDisbursementPayload,
  CooperativeDisbursementConfirmation
} from './cooperative-disbursement-confirmation.service';
import { CooperativeGroupService, CooperativeGroupContext, CooperativeGroupApiPayload } from './cooperative-group.service';
import { CooperativePaymentRecordService } from './cooperative-payment-record.service';
import { CooperativeRepaymentService } from './cooperative-repayment.service';
import { LoanStatusNotificationService } from '../loan-status-notification.service';
import { EmployeeService } from '../../employee.service';
import { LoanSupportingDocument } from '../loan.types';

@Injectable({ providedIn: 'root' })
export class CooperativeService {
  // (2) Increase cache TTL to 5 minutes (300,000 ms)
  private readonly collectionCacheTtlMs = 300_000;
  private readonly persistedGroupOverridesStorageKey = 'cooperative-group-field-overrides';

  private saveToStorage(): void {
    // Cooperative state is intentionally not persisted locally.
  }
  private groupMembershipChangedSubject = new Subject<void>();

  public getGroupMembershipChangedObservable(): Observable<void> {
    return this.groupMembershipChangedSubject.asObservable();
  }

  private readonly cooperativeMembershipService = inject(CooperativeMembershipService);
  private readonly cooperativeNotificationService = inject(CooperativeNotificationService);
  private readonly cooperativeLoanApiService = inject(CooperativeLoanApiService);
  private readonly cooperativeDisbursementConfirmationService = inject(CooperativeDisbursementConfirmationService);
  private readonly cooperativeGroupService = inject(CooperativeGroupService);
  private readonly cooperativePaymentRecordService = inject(CooperativePaymentRecordService);
  private readonly cooperativeRepaymentService = inject(CooperativeRepaymentService);
  private readonly loanStatusNotificationService = inject(LoanStatusNotificationService);
  private readonly employeeService = inject(EmployeeService);
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
  private pendingContributionRequests: CooperativePendingContributionRequest[] = [];
  private groupInviteHistory: CooperativeGroupInviteHistoryEntry[] = [];
  private repayments: CooperativeRepayment[] = [];
  private notifications: CooperativeNotification[] = [];
  private pendingMembershipApplications: PendingMembershipApplication[] = [];

  constructor() {}

  private membersSubject = new BehaviorSubject<CooperativeMember[]>([]);
  private loansSubject = new BehaviorSubject<CooperativeLoan[]>([]);
  private notificationsSubject = new BehaviorSubject<CooperativeNotification[]>([]);
  private statsSnapshot?: CooperativeStats;
  private memberApiRecords: Record<string, CooperativeLoanApiMemberRef> = {};
  private groupApiRecords: Record<string, CooperativeGroupApiResponse> = {};
  private persistedGroupOverrides: Record<string, Partial<CooperativeLoanGroup>> = this.loadPersistedGroupOverrides();
  private groupMembershipApiRecords: Record<string, CooperativeGroupMembershipApiResponse> = {};
  private contributionApiRecords: Record<string, CooperativeContributionHistoryApiResponse> = {};
  private memberNameLookupInFlight = new Set<number>();
  private membersLoadedAt = 0;
  private groupsLoadedAt = 0;
  private groupMembershipsLoadedAt = 0;
  private contributionEntriesLoadedAt = 0;
  private loansLoadedAt = 0;
  private membersRequest$?: Observable<CooperativeMember[]>;
  private groupsRequest$?: Observable<CooperativeLoanGroup[]>;
  private groupMembershipsRequest$?: Observable<CooperativeGroupMembership[]>;
  private contributionEntriesRequest$?: Observable<CooperativeContributionEntry[]>;
  private loansRequest$?: Observable<CooperativeLoan[]>;

  usingRealApiData = true;

  private hasFreshCache(loadedAt: number): boolean {
    return loadedAt > 0 && (Date.now() - loadedAt) < this.collectionCacheTtlMs;
  }

  private markMembersCacheFresh(): void {
    this.membersLoadedAt = Date.now();
  }

  private markGroupsCacheFresh(): void {
    this.groupsLoadedAt = Date.now();
  }

  private markGroupMembershipsCacheFresh(): void {
    this.groupMembershipsLoadedAt = Date.now();
  }

  private markContributionEntriesCacheFresh(): void {
    this.contributionEntriesLoadedAt = Date.now();
  }

  private markLoansCacheFresh(): void {
    this.loansLoadedAt = Date.now();
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
    if (this.hasFreshCache(this.membersLoadedAt)) {
      return of([...this.members]);
    }

    if (this.membersRequest$) {
      return this.membersRequest$;
    }

    this.debugTokenStatus();
    this.checkUserPermissions();
    console.log('=== Getting members from API ===');

    this.membersRequest$ = this.cooperativeLoanApiService.getAllMembers().pipe(
      switchMap((rawMembers) => {
        console.log('Raw members from API:', rawMembers);
        
        if (rawMembers && (rawMembers as any).error) {
          console.error('API returned error:', (rawMembers as any).error);
          this.usingRealApiData = false;
          return throwError(() => new Error('Cooperative members request returned an invalid response.'));
        }
        
        if (!rawMembers || rawMembers.length === 0) {
          console.log('No members found in backend. This is normal if you haven\'t applied for membership yet.');
          this.usingRealApiData = true;
          this.syncMemberCache([], []);
          return of([] as CooperativeMember[]);
        }

        this.usingRealApiData = true;
        const members = rawMembers.map((member) => this.mapApiMemberToMember(member));

        return this.employeeService.getAllEmployee().pipe(
          map((employees) => {
            const enrichedMembers = this.enrichMembersWithEmployeeDirectory(members, employees);
            this.syncMemberCache(enrichedMembers, rawMembers);
            return enrichedMembers;
          }),
          catchError((error) => {
            console.warn('Failed to enrich cooperative members with employee directory data:', error);
            this.syncMemberCache(members, rawMembers);
            return of(members);
          })
        );
      }),
      catchError((error) => {
        console.error('Failed to load cooperative members from backend:', error);
        this.usingRealApiData = false;
        return throwError(() => error);
      }),
      finalize(() => {
        this.membersRequest$ = undefined;
      }),
      shareReplay(1)
    );

    return this.membersRequest$;
  }

  public getMembersObservable(): Observable<CooperativeMember[]> {
    return this.membersSubject.asObservable();
  }

  public getMemberById(id: number): CooperativeMember | undefined {
    const cachedMember = this.members.find(m => m.id === id || m.memberId === id || m.employeeId === id);
    if (cachedMember) {
      return cachedMember;
    }

    const rawMember = this.memberApiRecords[String(id)];
    return rawMember ? this.mapApiMemberToMember(rawMember) : undefined;
  }

  public resolveCurrentSessionMember(members: CooperativeMember[] = this.members): CooperativeMember | undefined {
    const sessionUserId = Number(
      sessionStorage.getItem('userid')
      || sessionStorage.getItem('userId')
      || localStorage.getItem('userid')
      || localStorage.getItem('userId')
      || 0
    );
    const sessionUsername = String(sessionStorage.getItem('username') || localStorage.getItem('username') || '').trim().toLowerCase();
    const sessionEmail = String(sessionStorage.getItem('email') || localStorage.getItem('email') || '').trim().toLowerCase();
    const sessionFullName = String(sessionStorage.getItem('fullname') || localStorage.getItem('fullname') || '').trim().toLowerCase();

    let userRegEmail = '';
    let userRegName = '';
    const userRegDataRaw = sessionStorage.getItem('userRegData');
    if (userRegDataRaw) {
      try {
        const userRegData = JSON.parse(userRegDataRaw);
        userRegEmail = String(userRegData?.email || '').trim().toLowerCase();
        userRegName = String(userRegData?.fullname || userRegData?.fullName || userRegData?.name || '').trim().toLowerCase();
      } catch {
        userRegEmail = '';
        userRegName = '';
      }
    }

    return members.find((member) => {
      const rawMember = this.memberApiRecords[String(member.id)]
        || this.memberApiRecords[String(member.memberId)]
        || this.memberApiRecords[String(member.employeeId)];
      const rawEmployee = rawMember?.employee;

      const numericIds = [
        Number(member.id || 0),
        Number(member.memberId || 0),
        Number(member.employeeId || 0),
        Number(rawEmployee?.userId || 0)
      ].filter((value) => Number.isFinite(value) && value > 0);

      if (sessionUserId && numericIds.includes(sessionUserId)) {
        return true;
      }

      const emails = [
        String(member.email || '').trim().toLowerCase(),
        String(rawMember?.email || '').trim().toLowerCase(),
        String(rawEmployee?.email || '').trim().toLowerCase(),
        String(rawEmployee?.workEmail || '').trim().toLowerCase()
      ].filter(Boolean);

      if ((sessionEmail && emails.includes(sessionEmail)) || (userRegEmail && emails.includes(userRegEmail))) {
        return true;
      }

      const employeeName = `${String(rawEmployee?.firstName || '').trim()} ${String(rawEmployee?.lastName || '').trim()}`.trim().toLowerCase();
      const names = [
        String(member.fullName || '').trim().toLowerCase(),
        String(rawMember?.fullName || rawMember?.fullname || rawMember?.name || '').trim().toLowerCase(),
        employeeName
      ].filter(Boolean);

      return Boolean(
        (sessionUsername && (emails.includes(sessionUsername) || names.includes(sessionUsername)))
        || (sessionFullName && names.includes(sessionFullName))
        || (userRegName && names.includes(userRegName))
      );
    });
  }

  public getMemberDisplayName(id: number | string | undefined): string {
    const normalizedId = Number(id || 0);
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
      return 'Unknown member';
    }

    const cachedName = this.getPreferredMemberName(this.getMemberById(normalizedId));
    if (cachedName) {
      return cachedName;
    }

    this.ensureMemberNameLoaded(normalizedId);
    return '';
  }

  public getMemberTenureMonths(memberOrId: CooperativeMember | number | undefined): number {
    const member = typeof memberOrId === 'number'
      ? this.getMemberById(memberOrId)
      : memberOrId;

    if (!member) {
      return 0;
    }

    const startDate = this.extractDateValue(member.joinDate)
      || this.extractDateValue(member.createdAt)
      || this.extractDateValue(member.updatedAt);

    if (!startDate) {
      return 0;
    }

    const start = new Date(startDate);
    const today = new Date();

    if (Number.isNaN(start.getTime()) || start > today) {
      return 0;
    }

    let months = (today.getFullYear() - start.getFullYear()) * 12;
    months += today.getMonth() - start.getMonth();

    if (today.getDate() < start.getDate()) {
      months -= 1;
    }

    return Math.max(months, 0);
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
      switchMap((rawMember) => {
        const member = this.mergeMemberLocalFields(this.mapApiMemberToMember(rawMember), this.getMemberById(id));
        const employeeId = Number(member.employeeId || rawMember.employeeId || 0);

        if (this.getPreferredMemberName(member) || !Number.isFinite(employeeId) || employeeId <= 0) {
          this.upsertMemberInCache(member, rawMember);
          return of(member);
        }

        return this.employeeService.getEmployeeById(employeeId).pipe(
          map((employee) => {
            const enrichedMember = this.mergeMemberWithEmployeeRecord(member, employee);
            this.upsertMemberInCache(enrichedMember, rawMember);
            return enrichedMember;
          }),
          catchError((error) => {
            console.warn(`Failed to enrich cooperative member ${id} with employee ${employeeId}:`, error);
            this.upsertMemberInCache(member, rawMember);
            return of(member);
          })
        );
      }),
      catchError((error) => {
        console.error('Failed to load cooperative member', error);
        return of(this.getMemberById(id));
      })
    );
  }

  private ensureMemberNameLoaded(id: number): void {
    if (!Number.isFinite(id) || id <= 0 || this.memberNameLookupInFlight.has(id)) {
      return;
    }

    this.memberNameLookupInFlight.add(id);
    this.loadMemberById(id).subscribe({
      next: (member) => {
        if (!member || !this.getPreferredMemberName(member)) {
          console.warn(`[CooperativeService] Member ${id} was loaded but still has no resolvable display name.`);
        }
        this.memberNameLookupInFlight.delete(id);
      },
      error: (error) => {
        console.error(`[CooperativeService] Failed to backfill member name for id ${id}.`, error);
        this.memberNameLookupInFlight.delete(id);
      }
    });
  }

  // ==================== GROUP METHODS ====================

 public loadGroups(): Observable<CooperativeLoanGroup[]> {
  if (this.hasFreshCache(this.groupsLoadedAt)) {
    return of([...this.groups]);
  }

  if (this.groupsRequest$) {
    return this.groupsRequest$;
  }

  console.log('[CooperativeService] Loading groups from backend');
  this.groupsRequest$ = this.cooperativeGroupService.getAllCooperativeGroups().pipe(
    switchMap((rawGroups) => {
      console.log('[CooperativeService] Raw groups from API:', rawGroups);
      if (rawGroups && (rawGroups as any).error) {
        console.error('[CooperativeService] API returned error for groups:', (rawGroups as any).error);
        this.usingRealApiData = false;
        throw new Error('Cooperative groups request returned an invalid response.');
      }
      if (!rawGroups || rawGroups.length === 0) {
        console.warn('[CooperativeService] No groups found in backend.');
        this.syncGroupCache([], []);
        return of([]);
      }
      this.usingRealApiData = true;
      
      //  Always fetch details for every group to ensure accounting fields are populated
      return this.fetchDetailedGroups(rawGroups).pipe(
        map((hydratedGroups) => {
          const groups = hydratedGroups.map((group) => this.mapApiGroupToGroup(group));
          this.syncGroupCache(groups, hydratedGroups);
          console.log('[CooperativeService] Processed groups with accounting details:', groups);
          return groups;
        })
      );
    }),
    catchError((error) => {
      console.error('[CooperativeService] Failed to load cooperative groups:', error);
      this.usingRealApiData = false;
      return throwError(() => error);
    }),
    finalize(() => {
      this.groupsRequest$ = undefined;
    }),
    shareReplay(1)
  );

  return this.groupsRequest$;
}

private fetchDetailedGroups(rawGroups: CooperativeGroupApiResponse[]): Observable<CooperativeGroupApiResponse[]> {
  // Fetch details for ALL groups, not just those that appear incomplete
  // This ensures accounting fields are always populated
  return forkJoin(
    rawGroups.map((rawGroup) => 
      this.cooperativeGroupService.getCooperativeGroupById(Number(rawGroup.id)).pipe(
        map((detailGroup) => {
          // Merge the detail group data, giving priority to detail endpoint data
          const merged = { ...rawGroup, ...detailGroup };
          console.log(`[CooperativeService] Fetched details for group ${rawGroup.id}:`, {
            accountingEmail: merged.accountingEmail,
            hasPrincipal: !!merged.principalBankName && !!merged.principalCollectionAccount,
            hasInterest: !!merged.interestBankName && !!merged.interestCollectionAccount,
            hasLateFee: !!merged.lateFeeBankName && !!merged.lateFeeCollectionAccount
          });
          return merged;
        }),
        catchError((error) => {
          console.warn(`[CooperativeService] Failed to fetch details for group ${rawGroup.id}, using list data:`, error);
          // If detail fetch fails, still return the list data (might be incomplete)
          return of(rawGroup);
        })
      )
    )
  );
}


public refreshGroups(): Observable<CooperativeLoanGroup[]> {
  console.log('[CooperativeService] Refreshing groups from backend');
  // Clear cache to force fresh load
  this.groupsLoadedAt = 0;
  this.groupsRequest$ = undefined;
  return this.loadGroups();
}

  public loadGroupById(id: number): Observable<CooperativeLoanGroup | undefined> {
    if (!Number.isFinite(id)) {
      return of(this.getGroupById(id));
    }
    return this.cooperativeGroupService.getCooperativeGroupById(id).pipe(
      map((rawGroup) => {
        const group = this.mapApiGroupToGroup(rawGroup);
        this.upsertGroupInCache(group, true, rawGroup, false);
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
  const payload = this.buildGroupApiPayload(group);
  console.log('[CooperativeService] Sending payload with bank fields:', {
    contributionsBankName: payload.contributionsBankName,
    contributionsAccount: payload.contributionsAccount,
    principalBankName: payload.principalBankName,
    principalCollectionAccount: payload.principalCollectionAccount,
    interestBankName: payload.interestBankName,
    interestCollectionAccount: payload.interestCollectionAccount,
    lateFeeBankName: payload.lateFeeBankName,
    lateFeeCollectionAccount: payload.lateFeeCollectionAccount,
    accountingEmail: payload.accountingEmail
  });
  return this.cooperativeGroupService.createCooperativeGroup(payload).pipe(
    map((rawGroup) => {
      console.log('[CooperativeService] Group created successfully:', rawGroup);
      const newGroup = this.mergeGroupLocalFields(this.mapApiGroupToGroup(rawGroup), group);
      this.persistGroupOverride(newGroup);
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
    const payload = this.buildGroupApiPayload(group);
    return this.cooperativeGroupService.updateCooperativeGroup(group.id, payload).pipe(
      map((rawGroup) => {
        console.log('[CooperativeService] Group updated successfully:', rawGroup);
        const updatedGroup = this.mergeGroupLocalFields(this.mapApiGroupToGroup(rawGroup), group);
        this.persistGroupOverride(updatedGroup);
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

  private getGroupContext(): CooperativeGroupContext {
    return {
      members: this.members,
      groups: this.groups,
      groupMemberships: this.groupMemberships,
      contributionEntries: this.contributionEntries,
      saveToStorage: () => this.saveToStorage()
    };
  }

  public getEligibleGroupsForMember(memberId: number, monthlySalary = 0): CooperativeLoanGroup[] {
    return this.cooperativeGroupService.getEligibleGroupsForMember(this.getGroupContext(), memberId, monthlySalary);
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

  public loadGroupMemberships(): Observable<CooperativeGroupMembership[]> {
    if (this.hasFreshCache(this.groupMembershipsLoadedAt)) {
      return of(this.getGroupMemberships());
    }

    if (this.groupMembershipsRequest$) {
      return this.groupMembershipsRequest$;
    }

    this.groupMembershipsRequest$ = this.cooperativeLoanApiService.getAllGroupMemberships().pipe(
      map((rawMemberships) => {
        const memberships = rawMemberships.map((membership) => this.mapApiGroupMembershipToMembership(membership));
        this.syncGroupMembershipCache(memberships, rawMemberships);
        return memberships;
      }),
      catchError((error) => {
        console.error('Failed to load cooperative group memberships', error);
        return of(this.getGroupMemberships());
      }),
      finalize(() => {
        this.groupMembershipsRequest$ = undefined;
      }),
      shareReplay(1)
    );

    return this.groupMembershipsRequest$;
  }

  public loadGroupMembershipsByMember(memberId: number): Observable<CooperativeGroupMembership[]> {
    if (!Number.isFinite(memberId)) {
      return of(this.getGroupMembershipsByMember(memberId));
    }

    if (this.hasFreshCache(this.groupMembershipsLoadedAt)) {
      return of(this.getGroupMembershipsByMember(memberId));
    }

    return this.cooperativeLoanApiService.getGroupMembershipsByMember(memberId).pipe(
      map((response) => {
        const groups = [...(response.activeGroups || []), ...(response.pendingGroups || [])];
        if (groups.length > 0) {
          this.mergeGroupCache(groups.map((group) => this.mapApiGroupToGroup(group)), groups);
        }

        const memberships = (response.memberships || []).map((membership) => this.mapApiGroupMembershipToMembership(membership));
        memberships.forEach((membership, index) => this.upsertGroupMembershipInCache(membership, false, response.memberships[index]));
        this.publishState();
        return memberships;
      }),
      catchError((error) => {
        console.error(`Failed to load cooperative group memberships for member ${memberId}`, error);
        return of(this.getGroupMembershipsByMember(memberId));
      })
    );
  }

  public loadGroupMembershipsForMember(member: CooperativeMember): Observable<CooperativeGroupMembership[]> {
    const memberId = Number(member.id || 0);
    if (!Number.isFinite(memberId) || memberId <= 0) {
      return of([]);
    }

    if (this.hasFreshCache(this.groupMembershipsLoadedAt)) {
      return of(this.groupMemberships.filter((item) => item.memberId === memberId).map((item) => ({ ...item })));
    }

    return this.cooperativeLoanApiService.getGroupMembershipsByMember(memberId).pipe(
      map((response) => {
        const groups = [...(response.activeGroups || []), ...(response.pendingGroups || [])];
        if (groups.length > 0) {
          this.mergeGroupCache(groups.map((group) => this.mapApiGroupToGroup(group)), groups);
        }

        const memberships = (response.memberships || [])
          .map((rawMembership, membershipIndex) => {
            const membership = this.mapApiGroupMembershipToMembership(rawMembership);
            this.upsertGroupMembershipInCache(membership, false, response.memberships[membershipIndex]);
            return membership;
          })
          .filter((membership) => membership.memberId === memberId);

        this.publishState();
        return memberships;
      }),
      catchError((error) => {
        console.error(`Failed to load cooperative group memberships for member ${memberId}`, error);
        return of(this.getGroupMembershipsByMember(memberId));
      })
    );
  }

  public refreshGroupMembershipsForMember(member: CooperativeMember): Observable<CooperativeGroupMembership[]> {
    this.groupMembershipsLoadedAt = 0;
    return this.loadGroupMembershipsForMember(member);
  }

  public getGroupMemberships(): CooperativeGroupMembership[] {
    return this.groupMemberships.map(item => ({ ...item }));
  }

  public getGroupMembershipsByMember(memberId: number): CooperativeGroupMembership[] {
    return this.groupMemberships.filter(item => item.memberId === memberId);
  }

  public getGroupMembership(memberId: number, groupId: number): CooperativeGroupMembership | undefined {
    return this.groupMemberships.find(item => item.memberId === memberId && item.groupId === groupId);
  }

  public applyForGroupMembership(memberId: number, groupId: number): Observable<CooperativeGroupMembership> {
    const existing = this.getGroupMembership(memberId, groupId);
    const now = new Date().toISOString();

    if (existing) {
      if (existing.status !== 'REJECTED') {
        return of({ ...existing });
      }

      const reopenedMembership: CooperativeGroupMembership = {
        ...existing,
        status: 'PENDING',
        requestedAt: now,
        reviewedAt: undefined,
        reviewedBy: undefined,
        reviewNote: undefined,
        rejectionReason: undefined,
        rejectedAt: undefined
      };

      return this.cooperativeLoanApiService.updateGroupMembership(
        Number(existing.id),
        this.buildGroupMembershipUpdatePayload(reopenedMembership)
      ).pipe(
        map((rawMembership) => {
          const membership = this.mapApiGroupMembershipToMembership(rawMembership);
          this.upsertGroupMembershipInCache(membership, true, rawMembership);
          this.groupMembershipChangedSubject.next();
          return membership;
        }),
        switchMap((membership) => this.persistGroupMembershipHistory(membership, 'PENDING', 'Membership request reopened').pipe(
          map(() => membership),
          catchError(() => of(membership))
        ))
      );
    }

    const group = this.getGroupById(groupId);
    const membership: CooperativeGroupMembership = {
      id: 0,
      memberId,
      groupId,
      status: 'PENDING',
      monthlyContributionAmount: Number(group?.monthlyContributionAmount || 0),
      totalContribution: 0,
      joinedAt: '',
      requestedAt: now,
      expectedContributionDay: 1,
      membershipHistory: []
    };

    return this.cooperativeLoanApiService.createGroupMembership(this.buildGroupMembershipCreatePayload(membership)).pipe(
      map((rawMembership) => {
        const createdMembership = this.mapApiGroupMembershipToMembership(rawMembership);
        this.upsertGroupMembershipInCache(createdMembership, true, rawMembership);
        this.groupMembershipChangedSubject.next();
        return createdMembership;
      }),
      switchMap((createdMembership) => this.persistGroupMembershipHistory(createdMembership, 'PENDING').pipe(
        map(() => createdMembership),
        catchError(() => of(createdMembership))
      ))
    );
  }

  public approveGroupMembership(id: number, note?: string): Observable<CooperativeGroupMembership | undefined> {
    const membership = this.groupMemberships.find(m => m.id === id);
    if (!membership) {
      return of(undefined);
    }

    const approvedAt = new Date().toISOString();
    const updatedMembership: CooperativeGroupMembership = {
      ...membership,
      status: 'ACTIVE',
      joinedAt: approvedAt,
      approvedAt,
      activatedAt: approvedAt,
      reviewedAt: approvedAt,
      reviewedBy: this.getCurrentAuditUserId(),
      reviewNote: note?.trim() || undefined,
      rejectionReason: undefined,
      rejectedAt: undefined
    };

    return this.cooperativeLoanApiService.updateGroupMembership(id, this.buildGroupMembershipUpdatePayload(updatedMembership)).pipe(
      map((rawMembership) => {
        const approvedMembership = this.mapApiGroupMembershipToMembership(rawMembership);
        this.upsertGroupMembershipInCache(approvedMembership, true, rawMembership);
        this.groupMembershipChangedSubject.next();
        return approvedMembership;
      }),
      switchMap((approvedMembership) => this.persistGroupMembershipHistory(approvedMembership, 'ACTIVE', note?.trim()).pipe(
        map(() => approvedMembership),
        catchError(() => of(approvedMembership))
      ))
    );
  }

  public rejectGroupMembership(id: number, reason: string): Observable<CooperativeGroupMembership | undefined> {
    const membership = this.groupMemberships.find(m => m.id === id);
    if (!membership) {
      return of(undefined);
    }

    const reviewedAt = new Date().toISOString();
    const rejectionReason = reason.trim();
    const updatedMembership: CooperativeGroupMembership = {
      ...membership,
      status: 'REJECTED',
      reviewedAt,
      reviewedBy: this.getCurrentAuditUserId(),
      reviewNote: rejectionReason || undefined,
      rejectionReason: rejectionReason || undefined,
      rejectedAt: reviewedAt
    };

    return this.cooperativeLoanApiService.updateGroupMembership(id, this.buildGroupMembershipUpdatePayload(updatedMembership)).pipe(
      map((rawMembership) => {
        const rejectedMembership = this.mapApiGroupMembershipToMembership(rawMembership);
        this.upsertGroupMembershipInCache(rejectedMembership, true, rawMembership);
        this.groupMembershipChangedSubject.next();
        return rejectedMembership;
      }),
      switchMap((rejectedMembership) => this.persistGroupMembershipHistory(rejectedMembership, 'REJECTED', rejectionReason).pipe(
        map(() => rejectedMembership),
        catchError(() => of(rejectedMembership))
      ))
    );
  }

  public getContributionEntriesByGroup(groupId: number): CooperativeContributionEntry[] {
    return this.contributionEntries.filter(entry => entry.groupId === groupId);
  }

  public loadContributionEntries(): Observable<CooperativeContributionEntry[]> {
    if (this.hasFreshCache(this.contributionEntriesLoadedAt)) {
      return of([...this.contributionEntries]);
    }

    if (this.contributionEntriesRequest$) {
      return this.contributionEntriesRequest$;
    }

    this.contributionEntriesRequest$ = this.cooperativeLoanApiService.getAllContributionHistories().pipe(
      map((rawEntries) => {
        const entries = rawEntries.map((entry) => this.mapApiContributionEntryToLocal(entry));
        this.syncContributionCache(entries, rawEntries);
        this.reconcilePendingContributionRequests();
        return entries;
      }),
      catchError((error) => {
        console.error('Failed to load cooperative contribution histories', error);
        this.reconcilePendingContributionRequests();
        return of([...this.contributionEntries]);
      }),
      finalize(() => {
        this.contributionEntriesRequest$ = undefined;
      }),
      shareReplay(1)
    );

    return this.contributionEntriesRequest$;
  }

  public getPendingContributionRequestsByGroup(groupId: number): CooperativePendingContributionRequest[] {
    this.reconcilePendingContributionRequests();
    return this.pendingContributionRequests
      .filter((request) => request.groupId === groupId)
      .sort((left, right) => new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime())
      .map((request) => ({ ...request }));
  }

  public createContributionConfirmationRequest(
    membershipId: number,
    payload: {
      amount: number;
      contributionMonth: string;
      paymentMethod: CooperativeContributionPaymentMethod;
    }
  ): Observable<CooperativePendingContributionRequest | undefined> {
    const membership = this.groupMemberships.find((item) => item.id === membershipId && item.status === 'ACTIVE');
    if (!membership) {
      return of(undefined);
    }

    const group = this.groups.find((item) => item.id === membership.groupId);
    const amount = Number(payload.amount || 0);
    const contributionMonth = String(payload.contributionMonth || '').trim();
    const paymentMethod = String(payload.paymentMethod || '').trim() as CooperativeContributionPaymentMethod;

    if (!group || amount <= 0 || !/^\d{4}-\d{2}$/.test(contributionMonth) || !paymentMethod) {
      return of(undefined);
    }

    const hasConfirmedEntry = this.contributionEntries.some((entry) =>
      entry.membershipId === membershipId && entry.contributionMonth === contributionMonth
    );
    if (hasConfirmedEntry) {
      return of(undefined);
    }

    const hasPendingRequest = this.pendingContributionRequests.some((request) =>
      request.membershipId === membershipId
      && request.contributionMonth === contributionMonth
      && request.status === 'PENDING_CONFIRMATION'
    );
    if (hasPendingRequest) {
      return of(undefined);
    }

    const request: CooperativePendingContributionRequest = {
      id: Date.now(),
      membershipId,
      memberId: membership.memberId,
      groupId: membership.groupId,
      amount,
      contributionMonth,
      requestedAt: new Date().toISOString(),
      paymentMethod,
      accountingEmail: String(group.accountingEmail || '').trim(),
      contributionsBankName: String(group.contributionsBankName || '').trim(),
      contributionsAccount: String(group.contributionsAccount || '').trim(),
      status: 'PENDING_CONFIRMATION'
    };

    this.pendingContributionRequests = [request, ...this.pendingContributionRequests];
    this.saveToStorage();
    this.publishState();

    return of({ ...request });
  }

  public recordGroupContribution(membershipId: number, payload: { amount: number; contributionMonth: string; contributedAt?: string }): Observable<CooperativeContributionEntry | undefined> {
    const membership = this.groupMemberships.find(m => m.id === membershipId && m.status === 'ACTIVE');
    if (!membership) {
      return of(undefined);
    }
    const amount = Number(payload.amount || 0);
    const contributionMonth = String(payload.contributionMonth || '').trim();
    if (amount <= 0 || !/^\d{4}-\d{2}$/.test(contributionMonth)) {
      return of(undefined);
    }
    const hasExistingEntry = this.contributionEntries.some(entry => entry.membershipId === membershipId && entry.contributionMonth === contributionMonth);
    if (hasExistingEntry) {
      return of(undefined);
    }
    const contributedAt = payload.contributedAt || new Date().toISOString();

    const requestPayload: CooperativeContributionHistoryApiPayload = {
      membershipId,
      memberId: membership.memberId,
      groupId: membership.groupId,
      contributionAmount: amount,
      paymentMethod: 'BANK_TRANSFER',
      contributionMonth,
      postedAt: contributedAt,
      postedBy: this.getCurrentAuditUser()
    };

    return this.cooperativeLoanApiService.createContributionHistory(requestPayload).pipe(
      map((rawEntry) => {
        const entry = this.mapApiContributionEntryToLocal(rawEntry);
        this.upsertContributionEntryInCache(entry, false, rawEntry);
        return entry;
      }),
      switchMap((entry) => this.loadGroupMemberships().pipe(
        map(() => entry),
        catchError(() => of(entry))
      ))
    );
  }

  public loadGracePeriodRequests(): Observable<CooperativeLoanGracePeriodRequest[]> {
    return this.cooperativeLoanApiService.getAllGracePeriodRequests().pipe(
      map((rawRequests) => {
        const requests = rawRequests.map((request) => this.mapApiGracePeriodRequestToLocal(request));
        this.syncGracePeriodRequestsIntoLoanCache(requests);
        return requests;
      }),
      catchError((error) => {
        console.error('Failed to load cooperative grace period requests', error);
        return of(this.collectGracePeriodRequestsFromLoanCache());
      })
    );
  }

  public createGracePeriodRequest(payload: CooperativeGracePeriodRequestApiPayload): Observable<CooperativeLoanGracePeriodRequest> {
    return this.cooperativeLoanApiService.createGracePeriodRequest(payload).pipe(
      map((rawRequest) => {
        const request = this.mapApiGracePeriodRequestToLocal(rawRequest);
        this.upsertGracePeriodRequestInLoanCache(request);
        return request;
      })
    );
  }

  public updateGracePeriodRequest(id: number, payload: CooperativeGracePeriodRequestApiPayload): Observable<CooperativeLoanGracePeriodRequest> {
    return this.cooperativeLoanApiService.updateGracePeriodRequest(id, {
      ...payload,
      reviewedBy: this.getCurrentAuditUserId()
    }).pipe(
      map((rawRequest) => {
        const request = this.mapApiGracePeriodRequestToLocal(rawRequest);
        this.upsertGracePeriodRequestInLoanCache(request);
        return request;
      })
    );
  }

  public approveGracePeriodRequest(request: CooperativeLoanGracePeriodRequest, approvedGraceDays: number, reviewNote = ''): Observable<CooperativeLoanGracePeriodRequest> {
    const newDueDate = this.resolveGracePeriodNewDueDate(request, approvedGraceDays);
    const { reviewedBy, ...requestPayload } = request;
    return this.updateGracePeriodRequest(request.id, {
      ...requestPayload,
      status: 'APPROVED',
      reviewedAt: new Date().toISOString(),
      approvedGraceDays,
      newDueDate,
      reviewNote: reviewNote || `Grace period approved for ${approvedGraceDays} day(s).`,
      rejectionReason: ''
    }).pipe(
      map((updatedRequest) => {
        this.applyApprovedGracePeriodToRepayment(updatedRequest);
        return updatedRequest;
      })
    );
  }

  public rejectGracePeriodRequest(request: CooperativeLoanGracePeriodRequest, rejectionReason: string): Observable<CooperativeLoanGracePeriodRequest> {
    const trimmedReason = rejectionReason.trim();
    const { reviewedBy, ...requestPayload } = request;
    return this.updateGracePeriodRequest(request.id, {
      ...requestPayload,
      status: 'REJECTED',
      reviewedAt: new Date().toISOString(),
      reviewNote: trimmedReason,
      rejectionReason: trimmedReason,
      approvedGraceDays: undefined,
      newDueDate: undefined
    });
  }

  public loadLoanPurposes(): Observable<CooperativeLoanPurposeApiResponse[]> {
    return this.cooperativeLoanApiService.getAllLoanPurposes().pipe(
      map((purposes) => purposes.filter((purpose) => purpose.isActive !== false)),
      catchError((error) => {
        console.error('Failed to load cooperative loan purposes', error);
        return of([]);
      })
    );
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
    if (this.hasFreshCache(this.loansLoadedAt)) {
      return of([...this.loans]);
    }

    if (this.loansRequest$) {
      return this.loansRequest$;
    }

    return this.fetchLoans();
  }

  public refreshLoans(): Observable<CooperativeLoan[]> {
    return this.fetchLoans();
  }

  private fetchLoans(): Observable<CooperativeLoan[]> {
    this.loansRequest$ = this.cooperativeLoanApiService.getAllLoans().pipe(
      map((rawLoans) => {
        if (rawLoans && (rawLoans as any).error) {
          console.warn('API returned error for loans:', (rawLoans as any).error);
          this.syncLoanCache([]);
          return [];
        }
        this.mergeLoanReferenceData(rawLoans);
        const loans = rawLoans.map((loan) => this.mapApiLoanToLoan(loan));
        this.syncLoanCache(loans);
        return loans;
      }),
      catchError((error) => {
        console.error('Failed to load cooperative loans', error);
        return of([]);
      }),
      finalize(() => {
        this.loansRequest$ = undefined;
      }),
      shareReplay(1)
    );

    return this.loansRequest$;
  }

  public getLoansObservable(): Observable<CooperativeLoan[]> {
    return this.loansSubject.asObservable();
  }

  public getLoansByMember(memberId: number): CooperativeLoan[] {
    return this.loans.filter(l => l.cooperativeMemberId === memberId || l.memberId === memberId);
  }

  public addLoan(loan: Omit<CooperativeLoan, 'id' | 'loanId' | 'createdAt' | 'updatedAt'>): Observable<CooperativeLoan> {
    return this.cooperativeLoanApiService.createLoan(this.buildCreateLoanPayload(loan)).pipe(
      map((rawLoan) => this.mapApiLoanToLoan(rawLoan, loan)),
      catchError((error) => {
        console.error('Failed to create cooperative loan', error);
        throw error;
      })
    );
  }

  public updateLoan(loan: CooperativeLoan): Observable<CooperativeLoan> {
    return this.cooperativeLoanApiService.updateLoan(Number(loan.id), this.buildUpdateLoanPayload(loan)).pipe(
      map((rawLoan) => {
        const updatedLoan = this.mapApiLoanToLoan(rawLoan, loan);
        this.upsertLoanInCache(updatedLoan);
        return updatedLoan;
      }),
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
        const previousStatus = loan.status;
        const previousStage = loan.applicationStage;
        loan.status = 'APPROVED';
        loan.approvedDate = new Date().toISOString();
        loan.approvedBy = this.getCurrentAuditUserId();
        loan.approvedAmount = loan.approvedAmount ?? loan.amount;
        (loan as any).fundsReserved = true;
        loan.updatedAt = new Date().toISOString();
        this.appendLoanStatusHistory(loan, 'APPROVED', 'Loan approved and funds reserved for disbursement.');
        return this.saveLoanWorkflowUpdate(loan, previousStatus, previousStage).pipe(map((updatedLoan) => updatedLoan || loan));
      })
    );
  }

  public approveLoanWithTerms(
    id: number,
    options: { repaymentDay?: number; repaymentStartDate?: string; adminComment?: string; interestRate?: number; lateFeePercentage?: number; lateFeeGraceDays?: number }
  ): Observable<CooperativeLoan | undefined> {
    return this.loadLoanById(id).pipe(
      switchMap((loan) => {
        if (!loan || !['PENDING', 'AWAITING_INTEREST_ACCEPTANCE'].includes(loan.status)) {
          return of(undefined);
        }
        const previousStatus = loan.status;
        const previousStage = loan.applicationStage;
        loan.status = 'APPROVED';
        loan.approvedDate = new Date().toISOString();
        loan.approvedBy = this.getCurrentAuditUserId();
        loan.approvedAmount = loan.approvedAmount ?? loan.amount;
        (loan as any).fundsReserved = true;
        if (options.interestRate != null)    loan.interestRate      = options.interestRate;
        if (options.lateFeePercentage != null) loan.lateFeePercentage = options.lateFeePercentage;
        if (options.lateFeeGraceDays != null) loan.lateFeeGraceDays = options.lateFeeGraceDays;
        if (options.repaymentDay)      loan.repaymentDay      = options.repaymentDay;
        if (options.repaymentStartDate) loan.repaymentStartDate = options.repaymentStartDate;
        if (options.adminComment)       loan.adminComment       = options.adminComment;
        loan.updatedAt = new Date().toISOString();
        this.appendLoanStatusHistory(loan, 'APPROVED', options.adminComment || 'Loan approved and funds reserved for disbursement.');
        return this.saveLoanWorkflowUpdate(loan, previousStatus, previousStage).pipe(map((updatedLoan) => updatedLoan || loan));
      })
    );
  }

public sendLoanToAccountingForDisbursement(
  id: number,
  options?: {
    accountingEmail?: string;
    disbursementInstructionReference?: string;
    disbursementReference?: string;
    paymentMethod?: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'PAYROLL_DEDUCTION';
    notes?: string;
  }
): Observable<CooperativeLoan | undefined> {
  return this.loadLoanById(id).pipe(
    switchMap((loan) => {
      if (!loan || loan.status !== 'APPROVED') {
        return of(undefined);
      }

      return this.loadGroups().pipe(
        switchMap((groups) => {
          const groupId = Number(loan.groupId || loan.cooperativeGroupId || 0);
          const group = groups.find((item) => Number(item.id) === groupId);
          const previousStatus = loan.status;
          const previousStage = loan.applicationStage;
          const initiatedAt = new Date().toISOString();
          const auditUserId = this.getCurrentAuditUserId();
          const instructionReference = options?.disbursementInstructionReference
            || loan.disbursementInstructionLoanReference
            || loan.loanCode
            || `COOP-${loan.id}`;
          const disbursementReference = options?.disbursementReference
            || loan.disbursementReference
            || `PENDING-${instructionReference}`;
          const workflowNote = options?.notes?.trim() || 'Loan sent to accounting for disbursement.';
          const paymentMethod = options?.paymentMethod || 'BANK_TRANSFER';
          const memberId = Number(loan.memberId || loan.cooperativeMemberId || 0) || undefined;
          const groupMembershipId = Number(loan.membershipId || 0) || undefined;
          const groupName = String(group?.name || '').trim() || undefined;

          // Preserve financial details from the group
          const principalBankName = loan.principalBankName || group?.principalBankName;
          const principalCollectionAccount = loan.principalCollectionAccount || group?.principalCollectionAccount;
          const interestBankName = loan.interestBankName || group?.interestBankName;
          const interestCollectionAccount = loan.interestCollectionAccount || group?.interestCollectionAccount;
          const lateFeeBankName = loan.lateFeeBankName || group?.lateFeeBankName;
          const lateFeeCollectionAccount = loan.lateFeeCollectionAccount || group?.lateFeeCollectionAccount;
          const accountingEmail = options?.accountingEmail || loan.accountingEmail || group?.accountingEmail;

          loan.status = 'READY_FOR_DISBURSEMENT';
          // DO NOT set applicationStage - leave it as is
          loan.disbursementInitiatedAt = initiatedAt;
          loan.disbursementInitiatedBy = auditUserId;
          loan.disbursementInstructionLoanReference = instructionReference;
          loan.disbursementReference = disbursementReference;
          loan.updatedAt = initiatedAt;
          loan.adminComment = options?.notes?.trim()
            ? `${loan.adminComment ? `${loan.adminComment}\n` : ''}Accounting note: ${options.notes.trim()}`
            : loan.adminComment;
          
          // Preserve financial fields
          loan.principalBankName = principalBankName;
          loan.principalCollectionAccount = principalCollectionAccount;
          loan.interestBankName = interestBankName;
          loan.interestCollectionAccount = interestCollectionAccount;
          loan.lateFeeBankName = lateFeeBankName;
          loan.lateFeeCollectionAccount = lateFeeCollectionAccount;
          loan.accountingEmail = accountingEmail;

          this.appendLoanStatusHistory(loan, 'READY_FOR_DISBURSEMENT', workflowNote, initiatedAt);

          return this.cooperativeDisbursementConfirmationService.getConfirmationByLoanId(loan.id).pipe(
            switchMap((confirmation) => {
              const confirmationPayload: Partial<CooperativeDisbursementConfirmation> = {
                loanId: loan.id,
                disbursedAmount: Number(loan.amount || 0),
                memberId,
                groupMembershipId,
                groupName,
                disbursementInstructionReference: instructionReference,
                disbursementReference,
                paymentMethod,
                notes: workflowNote
              };

              const persistConfirmation$ = confirmation?.id
                ? this.cooperativeDisbursementConfirmationService.updateConfirmation(confirmation.id, confirmationPayload)
                : this.cooperativeDisbursementConfirmationService.createConfirmation({
                    loanId: loan.id,
                    disbursedAmount: Number(loan.amount || 0),
                    memberId,
                    groupMembershipId,
                    groupName,
                    disbursementInstructionReference: instructionReference,
                    disbursementReference,
                    paymentMethod,
                    notes: workflowNote
                  } as CreateCooperativeDisbursementPayload);

              return persistConfirmation$.pipe(
                switchMap(() => this.saveLoanWorkflowUpdate(loan, previousStatus, previousStage)),
                switchMap((updatedLoan) => {
                  // Only send webhook if it's a valid URL (not an email)
                  const webhookUrl = group?.accountingWebhookUrl;
                  const isValidWebhookUrl = webhookUrl && 
                    (webhookUrl.startsWith('http://') || webhookUrl.startsWith('https://')) &&
                    !webhookUrl.includes('@'); // Not an email address
                  
                  if (isValidWebhookUrl) {
                    const webhookPayload = {
                      loanId: updatedLoan.id,
                      loanCode: updatedLoan.loanCode,
                      status: updatedLoan.status,
                      amount: Number(updatedLoan.amount || 0),
                      disbursementInstructionReference: updatedLoan.disbursementInstructionLoanReference,
                      disbursementReference: updatedLoan.disbursementReference,
                      disbursementInitiatedAt: updatedLoan.disbursementInitiatedAt,
                      disbursementInitiatedBy: auditUserId,
                      paymentMethod,
                      accountingEmail: accountingEmail || undefined,
                      group: group ? {
                        id: group.id,
                        code: group.code,
                        name: group.name,
                        accountingEmail: group.accountingEmail,
                        accountingWebhookUrl: group.accountingWebhookUrl,
                        principalBankName: group.principalBankName,
                        principalCollectionAccount: group.principalCollectionAccount,
                        interestRate: group.interestRate,
                        lateFeePercentage: group.lateFeePercentage,
                        lateFeeGraceDays: group.lateFeeGraceDays
                      } : undefined,
                      memberId: updatedLoan.memberId || updatedLoan.cooperativeMemberId,
                      membershipId: updatedLoan.membershipId,
                      notes: workflowNote
                    };

                    return this.cooperativeDisbursementConfirmationService
                      .notifyAccountingWebhook(webhookUrl, webhookPayload)
                      .pipe(
                        catchError((error) => {
                          console.warn('Webhook notification failed:', error);
                          return of(null);
                        }),
                        map(() => updatedLoan)
                      );
                  }
                  
                  return of(updatedLoan);
                })
              );
            })
          );
        })
      );
    })
  );
}

  public rejectLoan(id: number, reason: string): Observable<CooperativeLoan | undefined> {
    return this.loadLoanById(id).pipe(
      switchMap((loan) => {
        if (!loan || (loan.status !== 'PENDING' && loan.status !== 'APPROVED')) {
          return of(undefined);
        }
        const previousStatus = loan.status;
        const previousStage = loan.applicationStage;
        loan.status = 'REJECTED';
        (loan as any).rejectionReason = reason;
        loan.rejectedDate = new Date().toISOString();
        loan.updatedAt = new Date().toISOString();
        this.appendLoanStatusHistory(loan, 'REJECTED', `Loan rejected: ${reason}`);
        return this.saveLoanWorkflowUpdate(loan, previousStatus, previousStage).pipe(map((updatedLoan) => updatedLoan || loan));
      })
    );
  }

  public disburseLoan(
    id: number,
    options?: {
      disbursedAmount?: number;
      disbursementReference?: string;
      paymentMethod?: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'PAYROLL_DEDUCTION';
      notes?: string;
    }
  ): Observable<CooperativeLoan | undefined> {
    return this.loadLoanById(id).pipe(
      switchMap((loan) => {
        if (!loan || loan.status !== 'READY_FOR_DISBURSEMENT') {
          return of(undefined);
        }
        const previousStatus = loan.status;
        const previousStage = loan.applicationStage;

        loan.status = 'ACTIVE';
        loan.disbursedDate = new Date().toISOString();
        loan.disbursementConfirmedAt = loan.disbursedDate;
        loan.disbursementConfirmedBy = this.getCurrentAuditUserId();
        loan.disbursedAmount = Number(options?.disbursedAmount || loan.disbursedAmount || loan.amount || 0);
        loan.disbursementReference = options?.disbursementReference || loan.disbursementReference || `COOP-DISB-${loan.id}-${Date.now()}`;
        loan.disbursementInstructionLoanReference = loan.disbursementInstructionLoanReference || loan.loanCode || `COOP-${loan.id}`;
        loan.updatedAt = new Date().toISOString();
        this.appendLoanStatusHistory(loan, 'ACTIVE', options?.notes || 'Loan disbursed and activated.');

        // Auto-generate repayment schedule when loan becomes ACTIVE
        try {
          const context = {
            loans: this.loans,
            repayments: this.repayments,
            notifications: this.notifications,
            repaymentDueDay: this.repaymentDueDay,
            repaymentGraceDays: this.repaymentGraceDays,
            repaymentOverdueDays: this.repaymentOverdueDays,
            lateFeeRate: this.lateFeeRate,
            creditReportDays: this.creditReportDays,
            saveToStorage: () => {},
            formatCurrency: (amount: number) => this.formatCurrency(amount),
            createMemberStatusNotification: (
              loan: CooperativeLoan,
              title: string,
              message: string
            ) => {
              // No-op for schedule generation
            },
            createRepaymentReminderNotification: (
              repayment: import("./cooperative.types").CooperativeRepayment,
              message: string
            ) => {
              // No-op for schedule generation
            },
            createCreditReportNotification: (
              repayment: import("./cooperative.types").CooperativeRepayment
            ) => {
              // No-op for schedule generation
            }
          };
          this.cooperativeRepaymentService.ensureRepaymentScheduleForLoan(context, String(loan.id));
        } catch (e) {
          // Optionally log error
        }

        return this.cooperativeDisbursementConfirmationService.getConfirmationByLoanId(loan.id).pipe(
          switchMap((confirmation) => {
            const paymentMethod = options?.paymentMethod || 'BANK_TRANSFER';
            const disbursementInstructionReference = loan.disbursementInstructionLoanReference || loan.loanCode || `COOP-${loan.id}`;
            const disbursementReference = loan.disbursementReference || `COOP-DISB-${loan.id}-${Date.now()}`;
            const memberId = Number(loan.memberId || loan.cooperativeMemberId || 0) || undefined;
            const groupMembershipId = Number(loan.membershipId || 0) || undefined;
            const groupName = this.getGroupById(Number(loan.groupId || loan.cooperativeGroupId || 0))?.name || undefined;

            const confirmationPayload: Partial<CooperativeDisbursementConfirmation> = {
              loanId: loan.id,
              disbursedAmount: Number(loan.disbursedAmount || loan.amount || 0),
              memberId,
              groupMembershipId,
              groupName,
              disbursementConfirmedAt: loan.disbursedDate,
              disbursementConfirmedBy: this.getCurrentAuditUserId(),
              disbursementInstructionReference,
              disbursementReference,
              paymentMethod,
              notes: options?.notes || 'Disbursement confirmed from cooperative loan workflow.'
            };

            const persistConfirmation$ = confirmation?.id
              ? this.cooperativeDisbursementConfirmationService.updateConfirmation(confirmation.id, confirmationPayload)
              : this.cooperativeDisbursementConfirmationService.createConfirmation({
                  loanId: loan.id,
                  disbursedAmount: Number(loan.disbursedAmount || loan.amount || 0),
                  memberId,
                  groupMembershipId,
                  groupName,
                  disbursementInstructionReference,
                  disbursementReference,
                  paymentMethod,
                  notes: options?.notes || 'Disbursement confirmed from cooperative loan workflow.'
                } as CreateCooperativeDisbursementPayload);

            return persistConfirmation$.pipe(
              switchMap(() => this.saveLoanWorkflowUpdate(loan, previousStatus, previousStage).pipe(map((updatedLoan) => updatedLoan || loan)))
            );
          })
        );
      })
    );
  }

  public requestLoanChanges(id: number, note: string): Observable<CooperativeLoan | undefined> {
    return this.loadLoanById(id).pipe(
      switchMap((loan) => {
        if (!loan) {
          return of(undefined);
        }
        const previousStatus = loan.status;
        const previousStage = loan.applicationStage;
        (loan as any).adminRequestNote = note;
        loan.applicationStage = 'INFO_REQUESTED';
        (loan as any).infoRequestedDate = new Date().toISOString();
        loan.updatedAt = new Date().toISOString();
        this.appendLoanStatusHistory(loan, loan.status || 'PENDING', `Additional information requested: ${note}`);
        return this.saveLoanWorkflowUpdate(loan, previousStatus, previousStage).pipe(map((updatedLoan) => updatedLoan || loan));
      })
    );
  }

  public setLoanPendingReview(id: number, note?: string): Observable<CooperativeLoan | undefined> {
    return this.loadLoanById(id).pipe(
      switchMap((loan) => {
        if (!loan) {
          return of(undefined);
        }
        const previousStatus = loan.status;
        const previousStage = loan.applicationStage;
        loan.status = 'PENDING';
        loan.applicationStage = 'READY_FOR_ADMIN_REVIEW';
        if (note) {
          (loan as any).adminRequestNote = note;
        }
        loan.updatedAt = new Date().toISOString();
        this.appendLoanStatusHistory(loan, 'PENDING', note || 'Loan kept pending for admin review.');
        return this.saveLoanWorkflowUpdate(loan, previousStatus, previousStage).pipe(map((updatedLoan) => updatedLoan || loan));
      })
    );
  }

  public pauseLoan(id: number, note = 'Repayment paused by admin.'): Observable<CooperativeLoan | undefined> {
    return this.loadLoanById(id).pipe(
      switchMap((loan) => {
        if (!loan || !['ACTIVE', 'OVERDUE', 'SKIPPED'].includes(loan.status || '')) {
          return of(undefined);
        }

        const previousStatus = loan.status;
        const previousStage = loan.applicationStage;
        loan.status = 'PAUSED';
        loan.updatedAt = new Date().toISOString();
        loan.adminComment = note
          ? `${loan.adminComment ? `${loan.adminComment}\n` : ''}${note}`
          : loan.adminComment;
        this.appendLoanStatusHistory(loan, 'PAUSED', note);
        if (loan.statusHistory?.length) {
          loan.statusHistory[0].overrideOpen = true;
          loan.statusHistory[0].overrideReason = note;
          loan.statusHistory[0].statusBeforeOverride = previousStatus || '';
        }
        return this.saveLoanWorkflowUpdate(loan, previousStatus, previousStage).pipe(map((updatedLoan) => updatedLoan || loan));
      })
    );
  }

  public restorePausedLoan(id: number, note = 'Repayment restored by admin.'): Observable<CooperativeLoan | undefined> {
    return this.loadLoanById(id).pipe(
      switchMap((loan) => {
        if (!loan || loan.status !== 'PAUSED') {
          return of(undefined);
        }

        const previousStatus = loan.status;
        const previousStage = loan.applicationStage;
        loan.status = 'ACTIVE';
        loan.updatedAt = new Date().toISOString();
        loan.adminComment = note
          ? `${loan.adminComment ? `${loan.adminComment}\n` : ''}${note}`
          : loan.adminComment;
        this.syncLoanLifecycleFromRepayments(loan);
        this.appendLoanStatusHistory(loan, loan.status || 'ACTIVE', note);
        if (loan.statusHistory?.length) {
          loan.statusHistory[0].overrideOpen = true;
          loan.statusHistory[0].overrideReason = note;
          loan.statusHistory[0].statusBeforeOverride = previousStatus || 'PAUSED';
        }
        return this.saveLoanWorkflowUpdate(loan, previousStatus, previousStage).pipe(map((updatedLoan) => updatedLoan || loan));
      })
    );
  }

  public submitGuarantorDecision(loanId: number, guarantorMemberId: number, decision: 'APPROVED' | 'REJECTED'): Observable<CooperativeLoan | undefined> {
    return this.loadLoanById(loanId).pipe(
      switchMap((loan) => {
        if (!loan || !loan.guarantors) {
          return of(undefined);
        }
        const previousStatus = loan.status;
        const previousStage = loan.applicationStage;
        const guarantor = loan.guarantors.find((g: any) => g.memberId === guarantorMemberId);
        if (!guarantor || guarantor.status !== 'PENDING') {
          return of(undefined);
        }
        guarantor.status = decision;
        guarantor.decidedAt = new Date().toISOString();
        guarantor.note = decision === 'APPROVED'
          ? 'Guarantor approved through cooperative workflow.'
          : 'Guarantor rejected through cooperative workflow.';
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

        const guarantorPayload: CooperativeLoanGuarantorApiPayload = {
          id: guarantor.id,
          loanId: loan.id,
          guarantorMemberId,
          guaranteedAmount: Number(guarantor.guaranteedAmount || 0),
          status: decision,
          requestedAt: guarantor.requestedAt || loan.applicationDate || loan.requestDate || new Date().toISOString(),
          respondedAt: guarantor.decidedAt,
          responseNote: guarantor.note
        };

        const guarantorRequest = guarantor.id
          ? this.cooperativeLoanApiService.updateLoanGuarantor(Number(guarantor.id), guarantorPayload)
          : this.cooperativeLoanApiService.createLoanGuarantor(guarantorPayload);

        return guarantorRequest.pipe(
          switchMap(() => this.saveLoanWorkflowUpdate(loan, previousStatus, previousStage).pipe(map((updatedLoan) => updatedLoan || loan)))
        );
      })
    );
  }

  public markLoanAsDefaulted(id: number): Observable<CooperativeLoan | undefined> {
    return this.loadLoanById(id).pipe(
      switchMap((loan) => {
        if (!loan || !['ACTIVE', 'OVERDUE', 'SKIPPED'].includes(loan.status || '')) {
          return of(undefined);
        }

        this.refreshLoanRepaymentStatuses(loan.id);
        const overdueInstallments = this.repayments.filter((repayment) => repayment.loanId === loan.id && repayment.status === 'OVERDUE').length;
        if (overdueInstallments < 3) {
          return of(undefined);
        }
        const previousStatus = loan.status;
        const previousStage = loan.applicationStage;
        loan.status = 'DEFAULTED';
        (loan as any).defaultedDate = new Date().toISOString();
        loan.updatedAt = new Date().toISOString();
        this.appendLoanStatusHistory(loan, 'DEFAULTED', 'Loan marked as defaulted.');
        return this.saveLoanWorkflowUpdate(loan, previousStatus, previousStage).pipe(map((updatedLoan) => updatedLoan || loan));
      })
    );
  }

  public sendRepaymentReminder(id: number): boolean {
    return false;
  }

  // ==================== REPAYMENT METHODS ====================

  public getRepaymentsByLoanId(loanId: number): CooperativeRepayment[] {
    // Always delegate to the repayment service, which will auto-generate if needed
    return this.cooperativeRepaymentService.getRepaymentsByLoanId(this.getRepaymentContext(), loanId);
  }

  public recordRepayment(
    loanId: number,
    payload: {
      amount: number;
      modeofPayment: CooperativeRepayment['modeofPayment'];
      paidDate?: string;
      paymentType?: 'PRINCIPAL_REPAYMENT' | 'INTEREST_REPAYMENT' | 'LATE_FEE';
      paymentReference?: string;
      paidFromAccount?: string;
      paidIntoAccount?: string;
    }
  ): Observable<CooperativeRepayment | undefined> {
    return this.loadLoanById(loanId).pipe(
      switchMap((loan) => {
        if (!loan || !['ACTIVE', 'OVERDUE', 'SKIPPED'].includes(loan.status || '')) {
          return of(undefined);
        }
        const previousStatus = loan.status;
        const previousStage = loan.applicationStage;
        const openRepayments = this.getRepaymentsByLoanId(loanId).filter((repayment) => repayment.status !== 'PAID');
        const targetRepayment = openRepayments[0];
        const installmentNumber = targetRepayment ? this.getRepaymentInstallmentNumber(loanId, targetRepayment.id) : 0;
        const paidAt = payload.paidDate || new Date().toISOString();

        const repaymentResult = this.cooperativeRepaymentService.recordRepayment(this.getRepaymentContext(), loanId, {
          amount: payload.amount,
          modeofPayment: payload.modeofPayment,
          paidDate: paidAt,
          paymentType: payload.paymentType
        });

        if (!repaymentResult) {
          return of(undefined);
        }

        const updatedLoan = this.loans.find((item) => item.id === loanId) || loan;
        const paymentReference = payload.paymentReference || repaymentResult.repayment.receiptNumber || `COOP-PAY-${loanId}-${Date.now()}`;
        const memberId = Number(updatedLoan.memberId || updatedLoan.cooperativeMemberId || 0);
        const membershipId = Number(updatedLoan.membershipId || 0) || undefined;
        const groupId = Number(updatedLoan.groupId || updatedLoan.cooperativeGroupId || 0) || undefined;
        const group = this.getGroupById(groupId || 0);
        const paymentType = payload.paymentType
          || (repaymentResult.lateFeeApplied > 0 && repaymentResult.principalApplied === 0 && repaymentResult.interestApplied === 0
            ? 'LATE_FEE'
            : 'PRINCIPAL_REPAYMENT');
        const paidIntoAccount = payload.paidIntoAccount || this.resolveGroupPaymentAccount(group, paymentType).accountNumber;

        return this.cooperativePaymentRecordService.createPaymentRecord({
          loanId,
          memberId,
          membershipId,
          groupId,
          paymentType,
          installmentNumber,
          amount: Number(payload.amount || 0),
          principalApplied: repaymentResult.principalApplied,
          interestApplied: repaymentResult.interestApplied,
          lateFeeApplied: repaymentResult.lateFeeApplied,
          remainingBalance: repaymentResult.remainingBalance,
          paymentMethod: payload.modeofPayment || 'BANK_TRANSFER',
          paymentReference,
          paidIntoAccount,
          paidFromAccount: String(payload.paidFromAccount || '').trim() || undefined,
          paidAt,
          notes: `Repayment recorded via ${payload.modeofPayment || 'BANK_TRANSFER'} for ${paymentType.replace(/_/g, ' ').toLowerCase()}`,
          receiptNumber: repaymentResult.repayment.receiptNumber
        }).pipe(
          switchMap((paymentRecord) => {
            updatedLoan.paymentHistory = [
              {
                id: paymentRecord.id,
                paymentType: paymentRecord.paymentType,
                membershipId,
                loanId,
                groupId,
                installmentNumber,
                installmentNo: installmentNumber,
                paidAt: paymentRecord.paidAt,
                amount: paymentRecord.amount,
                principalApplied: paymentRecord.principalApplied,
                principalAmount: paymentRecord.principalApplied,
                interestApplied: paymentRecord.interestApplied,
                referenceNumber: paymentRecord.paymentReference,
                interest: Number(paymentRecord.interestApplied || 0),
                lateFeeApplied: paymentRecord.lateFeeApplied,
                remainingBalance: Number(paymentRecord.remainingBalance || 0),
                paymentMethod: paymentRecord.paymentMethod,
                paymentReference: paymentRecord.paymentReference,
                paidIntoAccount: paymentRecord.paidIntoAccount,
                paidFromAccount: paymentRecord.paidFromAccount || '',
                recordedBy: paymentRecord.recordedBy,
                recordedAt: paymentRecord.recordedAt,
                recordStatus: paymentRecord.status,
                modeofPayment: paymentRecord.paymentMethod,
                status: paymentRecord.status,
                lateFeeAmount: Number(paymentRecord.lateFeeApplied || 0),
                totalPayment: paymentRecord.amount,
                notes: paymentRecord.notes || '',
                receiptNumber: paymentRecord.receiptNumber || paymentRecord.paymentReference
              },
              ...(updatedLoan.paymentHistory || [])
            ];
            updatedLoan.lastPaymentReceived = paymentRecord.paidAt;
            updatedLoan.lastPaymentAmount = paymentRecord.amount;
            updatedLoan.updatedAt = new Date().toISOString();

            return this.saveLoanWorkflowUpdate(updatedLoan, previousStatus, previousStage).pipe(
              map(() => repaymentResult.repayment)
            );
          })
        );
      })
    );
  }

  private resolveGroupPaymentAccount(
    group: CooperativeLoanGroup | undefined,
    paymentType: 'PRINCIPAL_REPAYMENT' | 'INTEREST_REPAYMENT' | 'LATE_FEE'
  ): { bankName: string; accountNumber: string } {
    if (!group) {
      return { bankName: '', accountNumber: '' };
    }

    switch (paymentType) {
      case 'INTEREST_REPAYMENT':
        return {
          bankName: String(group.interestBankName || '').trim(),
          accountNumber: String(group.interestCollectionAccount || '').trim()
        };
      case 'LATE_FEE':
        return {
          bankName: String(group.lateFeeBankName || '').trim(),
          accountNumber: String(group.lateFeeCollectionAccount || '').trim()
        };
      case 'PRINCIPAL_REPAYMENT':
      default:
        return {
          bankName: String(group.principalBankName || '').trim(),
          accountNumber: String(group.principalCollectionAccount || '').trim()
        };
    }
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
      getLoanById: (id: number) => this.loans.find((loan) => loan.id === id),
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
      formatCurrency: (amount: number) => this.formatCurrency(amount),
      createMemberStatusNotification: (loan, title, message) => this.createMemberStatusNotification(loan, title, message),
      createRepaymentReminderNotification: (repayment, message) => this.createRepaymentReminderNotification(repayment, message),
      createCreditReportNotification: (repayment) => this.createCreditReportNotification(repayment)
    };
  }

  private getRepaymentInstallmentNumber(loanId: number, repaymentId: number): number {
    const loanRepayments = this.getRepaymentsByLoanId(loanId);
    const repaymentIndex = loanRepayments.findIndex((item) => item.id === repaymentId);
    return repaymentIndex >= 0 ? repaymentIndex + 1 : 0;
  }

  private createMemberStatusNotification(loan: CooperativeLoan, title: string, message: string): void {
    this.cooperativeNotificationService.createMemberStatusNotification(
      this.getNotificationContext(),
      loan,
      title,
      message
    );
  }

  private createRepaymentReminderNotification(repayment: CooperativeRepayment, message: string): void {
    this.cooperativeNotificationService.createRepaymentReminderNotification(
      this.getNotificationContext(),
      repayment,
      message
    );
  }

  private createCreditReportNotification(repayment: CooperativeRepayment): void {
    this.cooperativeNotificationService.createCreditReportNotification(
      this.getNotificationContext(),
      repayment
    );
  }

  private extractNumericId(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      return Number(value || 0);
    }
    if (value && typeof value === 'object' && 'id' in value) {
      return Number((value as { id?: unknown }).id || 0);
    }
    return 0;
  }

  private extractDateValue(value: unknown): string {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return '';
      }

      if (/^\d{4},\d{1,2},\d{1,2}(,\d{1,2}){0,4}$/.test(trimmed)) {
        return this.formatDateArray(trimmed.split(',').map((part) => Number(part.trim())));
      }

      return trimmed;
    }

    if (Array.isArray(value)) {
      return this.formatDateArray(value.map((part) => Number(part)));
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString();
    }

    return '';
  }

  private formatDateArray(parts: number[]): string {
    if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) {
      return '';
    }

    const [year, month, day, hour = 0, minute = 0, second = 0, nanos = 0] = parts;
    const millisecond = Math.floor(nanos / 1000000);

    if (parts.length <= 3) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    return new Date(year, month - 1, day, hour, minute, second, millisecond).toISOString();
  }

  private getPreferredMemberName(member?: Partial<CooperativeMember> | null): string {
    const fullName = String(member?.fullName || '').trim();
    if (!fullName || /^member\s*(undefined|\d+)$/i.test(fullName) || /^\d+$/.test(fullName)) {
      return '';
    }
    return fullName;
  }

  private extractMemberDisplayName(rawMember?: Partial<CooperativeLoanApiMemberRef> | null): string {
    const employee = rawMember?.employee;
    const employeeFirstName = String(employee?.firstName || employee?.firstname || '').trim();
    const employeeLastName = String(employee?.lastName || employee?.lastname || '').trim();
    const employeeJoinedName = `${employeeFirstName} ${employeeLastName}`.trim();
    const employeeDirectName = String(employee?.fullName || employee?.fullname || employee?.name || '').trim();
    const directName = String(rawMember?.fullName || rawMember?.fullname || rawMember?.name || '').trim();
    const chosenName = employeeJoinedName || employeeDirectName || directName;

    if (chosenName && !/^member\s*(undefined|\d+)$/i.test(chosenName) && !/^\d+$/.test(chosenName)) {
      return chosenName;
    }

    return '';
  }

  private mapApiMemberToMember(rawMember: CooperativeLoanApiMemberRef): CooperativeMember {
    const employee = rawMember?.employee;
    const fullName = this.extractMemberDisplayName(rawMember);
    // Try joinDate, then createdAt, then updatedAt
    let joinedAt = this.extractDateValue((rawMember as any).joinDate);
    if (!joinedAt) {
      joinedAt = this.extractDateValue(rawMember.createdAt);
    }
    if (!joinedAt) {
      joinedAt = this.extractDateValue(rawMember.updatedAt);
    }

    return {
      id: Number(rawMember.id),
      employeeId: Number(rawMember.employeeId || employee?.id || 0),
      memberId: Number(rawMember.memberId || rawMember.id),
      fullName,
      email: String(employee?.workEmail || employee?.email || rawMember.email || ''),
      phone: String(employee?.phone || rawMember.phone || ''),
      joinDate: joinedAt,
      monthlySalary: Number(rawMember.monthlySalary || 0),
      status: this.normalizeMemberStatus(rawMember.status),
      shareCapital: 0,
      address: String(employee?.address || rawMember.address || ''),
      cooperativeGroup: Array.isArray(rawMember.cooperativeGroup) ? rawMember.cooperativeGroup : [],
      contributionHistory: Array.isArray(rawMember.contributionHistory) ? rawMember.contributionHistory : [],
      loanHistory: Array.isArray(rawMember.loanHistory) ? rawMember.loanHistory : [],
      createdAt: this.extractDateValue(rawMember.createdAt) || joinedAt,
      updatedAt: this.extractDateValue(rawMember.updatedAt) || new Date().toISOString()
    };
  }

  private mapApiGroupToGroup(rawGroup: CooperativeGroupApiResponse): CooperativeLoanGroup {
    const existingGroup = this.groups.find((group) => Number(group.id) === Number(rawGroup.id))
      || this.persistedGroupOverrides[String(rawGroup.id)];
    const groupLike = rawGroup as any;
    const status = (rawGroup.status === 'INACTIVE') ? 'INACTIVE' : 'ACTIVE';
    const mappedGroup: CooperativeLoanGroup = {
      id: Number(rawGroup.id),
      code: String(rawGroup.code || ''),
      name: String(rawGroup.name || rawGroup.code || `Group ${rawGroup.id}`),
      description: String(rawGroup.description || ''),
      minEligibleSalary: this.resolveGroupNumber(groupLike.minEligibleSalary, existingGroup?.minEligibleSalary, 0),
      monthlyContributionAmount: this.resolveGroupNumber(groupLike.monthlyAmount ?? groupLike.monthlyContributionAmount, existingGroup?.monthlyContributionAmount, 0),
      maxBorrowingPercentage: this.resolveGroupNumber(groupLike.maxBorrowingPercentage, existingGroup?.maxBorrowingPercentage, 100),
      minAmount: this.resolveGroupNumber(groupLike.minAmount, existingGroup?.minAmount, 0),
      maxAmount: this.resolveGroupNumber(groupLike.maxAmount, existingGroup?.maxAmount, Number(rawGroup.withdrawCap || 0)),
      interestRate: Number(rawGroup.interestRate || 0),
      minDuration: this.resolveGroupNumber(groupLike.minDuration, existingGroup?.minDuration, 1),
      maxDuration: this.resolveGroupNumber(groupLike.maxDuration, existingGroup?.maxDuration, 12),
      minMemberTenureMonths: Number(rawGroup.minMemberTenureMonths || 0),
      requiresShares: this.resolveGroupBoolean(groupLike.requiresShares, existingGroup?.requiresShares, false),
      requiresGuarantors: this.resolveGroupBoolean(rawGroup.requiresGuarantors, undefined, false),
      minimumGuarantors: this.resolveOptionalGroupNumber(existingGroup?.minimumGuarantors, rawGroup.minimumGuarantors),
      quickDisbursement: this.resolveGroupBoolean(groupLike.quickDisbursement, existingGroup?.quickDisbursement, false),
      patronageEligible: this.resolveGroupBoolean(groupLike.patronageEligible, existingGroup?.patronageEligible, Number(rawGroup.patronageRate || 0) > 0),
      patronageRate: Number(rawGroup.patronageRate || 0),
      patronageAmount: Number(rawGroup.patronageAmount || 0),
      memberLimit: this.resolveOptionalGroupNumber(rawGroup.memberLimit, existingGroup?.memberLimit),
      withdrawCap: Number(rawGroup.withdrawCap || 0),
      currentBalance: Number(rawGroup.currentBalance || 0),
      contributionsBankName: this.resolveGroupString(groupLike.contributionsBankName, groupLike.contributionBankName, existingGroup?.contributionsBankName),
      contributionsAccount: this.resolveGroupString(groupLike.contributionsAccount, groupLike.contributionAccount, existingGroup?.contributionsAccount),
      principalBankName: this.resolveGroupString(groupLike.principalBankName, existingGroup?.principalBankName),
      principalCollectionAccount: this.resolveGroupString(groupLike.principalCollectionAccount, groupLike.principalAccount, existingGroup?.principalCollectionAccount),
      interestBankName: this.resolveGroupString(groupLike.interestBankName, existingGroup?.interestBankName),
      interestCollectionAccount: this.resolveGroupString(groupLike.interestCollectionAccount, groupLike.interestAccount, existingGroup?.interestCollectionAccount),
      lateFeePercentage: this.resolveOptionalGroupNumber(groupLike.lateFeePercentage, existingGroup?.lateFeePercentage),
      lateFeeGraceDays: this.resolveOptionalGroupNumber(groupLike.lateFeeGraceDays ?? groupLike.lateFeeGracePeriodDays, existingGroup?.lateFeeGraceDays),
      lateFeeBankName: this.resolveGroupString(groupLike.lateFeeBankName, existingGroup?.lateFeeBankName),
      lateFeeCollectionAccount: this.resolveGroupString(groupLike.lateFeeCollectionAccount, groupLike.lateFeeAccount, existingGroup?.lateFeeCollectionAccount),
      accountingEmail: this.resolveGroupString(groupLike.accountingEmail, groupLike.accountEmail, existingGroup?.accountingEmail),
      accountingWebhookUrl: this.resolveGroupString(groupLike.accountingWebhookUrl, groupLike.webhookUrl, existingGroup?.accountingWebhookUrl),
      status: status
    };
    return mappedGroup;
  }

private buildGroupApiPayload(
  group: Omit<CooperativeLoanGroup, 'id'> | CooperativeLoanGroup
): CooperativeGroupApiPayload {
  const groupId = 'id' in group ? Number(group.id || 0) : 0;
  const memberIds = [...new Set(
    this.groupMemberships
      .filter((membership) => Number(membership.groupId || 0) === groupId)
      .map((membership) => Number(membership.memberId || 0))
      .filter((memberId) => Number.isFinite(memberId) && memberId > 0)
  )];
  const contributionHistory = this.contributionEntries
    .filter((entry) => Number(entry.groupId || 0) === groupId)
    .map((entry) => ({
      id: Number(entry.id || 0) || undefined,
      memberId: Number(entry.memberId || 0) || undefined,
      amount: Number(entry.amount || 0),
      date: String(entry.contributedAt || '')
    }));

  // CRITICAL FIX: Ensure all string fields return empty string instead of undefined
  return {
    id: groupId || 0,
    groupId: groupId || 0,
    code: group.code || undefined,
    name: group.name,
    minEligibleSalary: Number(group.minEligibleSalary || 0),
    monthlyAmount: Number(group.monthlyContributionAmount || 0),
    maxBorrowingPercentage: Number(group.maxBorrowingPercentage || 0),
    minAmount: Number(group.minAmount || 0),
    maxAmount: Number(group.maxAmount || group.withdrawCap || 0),
    minDuration: Number(group.minDuration || 0),
    maxDuration: Number(group.maxDuration || 0),
    memberIds,
    memberLimit: group.memberLimit ?? 0,
    withdrawCap: Number(group.withdrawCap || group.maxAmount || 0),
    interestRate: Number(group.interestRate || 0),
    currentBalance: Number(group.currentBalance || 0),
    contributionHistory,
    loanHistory: [],
    status: group.status || 'ACTIVE',
    description: group.description || '',
    patronageRate: Number(group.patronageRate || 0),
    patronageAmount: Number(group.patronageAmount || 0),
    requiresGuarantors: Boolean(group.requiresGuarantors),
    minimumGuarantors: Number(group.minimumGuarantors || 0),
    minMemberTenureMonths: Number(group.minMemberTenureMonths || 0),
    // IMPORTANT: Convert undefined to empty string to satisfy the interface
    contributionsBankName: String((group.contributionsBankName ?? '').trim()),
    contributionsAccount: String((group.contributionsAccount ?? '').trim()),
    principalBankName: String((group.principalBankName ?? '').trim()),
    principalCollectionAccount: String((group.principalCollectionAccount ?? '').trim()),
    interestBankName: String((group.interestBankName ?? '').trim()),
    interestCollectionAccount: String((group.interestCollectionAccount ?? '').trim()),
    lateFeePercentage: Number(group.lateFeePercentage || 0) || undefined,
    lateFeeGraceDays: Number(group.lateFeeGraceDays || 0) || undefined,
    lateFeeBankName: String((group.lateFeeBankName ?? '').trim()),
    lateFeeCollectionAccount: String((group.lateFeeCollectionAccount ?? '').trim()),
    accountingEmail: group.accountingEmail || undefined,
    accountingWebhookUrl: group.accountingWebhookUrl || undefined
  };
}
  private mergeGroupLocalFields(group: CooperativeLoanGroup, existingGroup?: Partial<CooperativeLoanGroup>): CooperativeLoanGroup {
    return {
      ...group,
      code: group.code || existingGroup?.code || '',
      description: group.description || existingGroup?.description || '',
      minEligibleSalary: this.resolveGroupNumber(group.minEligibleSalary, existingGroup?.minEligibleSalary, 0),
      maxBorrowingPercentage: this.resolveGroupNumber(group.maxBorrowingPercentage, existingGroup?.maxBorrowingPercentage, 100),
      minAmount: this.resolveGroupNumber(group.minAmount, existingGroup?.minAmount, 0),
      maxAmount: this.resolveGroupNumber(group.maxAmount, existingGroup?.maxAmount, group.withdrawCap || 0),
      minDuration: this.resolveGroupNumber(group.minDuration, existingGroup?.minDuration, 1),
      maxDuration: this.resolveGroupNumber(group.maxDuration, existingGroup?.maxDuration, 12),
      requiresShares: this.resolveGroupBoolean(group.requiresShares, existingGroup?.requiresShares, false),
      requiresGuarantors: this.resolveGroupBoolean(group.requiresGuarantors, existingGroup?.requiresGuarantors, false),
      minimumGuarantors: this.resolveOptionalGroupNumber(group.minimumGuarantors, existingGroup?.minimumGuarantors),
      quickDisbursement: this.resolveGroupBoolean(group.quickDisbursement, existingGroup?.quickDisbursement, false),
      patronageEligible: this.resolveGroupBoolean(group.patronageEligible, existingGroup?.patronageEligible, Number(group.patronageRate || 0) > 0),
      patronageRate: this.resolveGroupNumber(group.patronageRate, existingGroup?.patronageRate, 0),
      patronageAmount: this.resolveOptionalGroupNumber(group.patronageAmount, existingGroup?.patronageAmount),
      memberLimit: this.resolveOptionalGroupNumber(group.memberLimit, existingGroup?.memberLimit),
      contributionsBankName: this.resolveGroupString(group.contributionsBankName, existingGroup?.contributionsBankName),
      contributionsAccount: this.resolveGroupString(group.contributionsAccount, existingGroup?.contributionsAccount),
      principalBankName: this.resolveGroupString(group.principalBankName, existingGroup?.principalBankName),
      principalCollectionAccount: this.resolveGroupString(group.principalCollectionAccount, existingGroup?.principalCollectionAccount),
      interestBankName: this.resolveGroupString(group.interestBankName, existingGroup?.interestBankName),
      interestCollectionAccount: this.resolveGroupString(group.interestCollectionAccount, existingGroup?.interestCollectionAccount),
      lateFeePercentage: this.resolveOptionalGroupNumber(group.lateFeePercentage, existingGroup?.lateFeePercentage),
      lateFeeGraceDays: this.resolveOptionalGroupNumber(group.lateFeeGraceDays, existingGroup?.lateFeeGraceDays),
      lateFeeBankName: this.resolveGroupString(group.lateFeeBankName, existingGroup?.lateFeeBankName),
      lateFeeCollectionAccount: this.resolveGroupString(group.lateFeeCollectionAccount, existingGroup?.lateFeeCollectionAccount),
      accountingEmail: this.resolveGroupString(group.accountingEmail, existingGroup?.accountingEmail),
      accountingWebhookUrl: this.resolveGroupString(group.accountingWebhookUrl, existingGroup?.accountingWebhookUrl)
    };
  }

  private resolveGroupNumber(value: unknown, fallback: unknown, defaultValue = 0): number {
    const candidates = [value, fallback, defaultValue];
    for (const candidate of candidates) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return defaultValue;
  }

  private resolveOptionalGroupNumber(value: unknown, fallback?: unknown): number | undefined {
    for (const candidate of [value, fallback]) {
      if (candidate === null || candidate === undefined || candidate === '') {
        continue;
      }
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  private resolveGroupBoolean(value: unknown, fallback: unknown, defaultValue = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    if (typeof fallback === 'boolean') {
      return fallback;
    }
    if (typeof fallback === 'string') {
      const normalized = fallback.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }
    if (typeof fallback === 'number') {
      return fallback !== 0;
    }
    return defaultValue;
  }

  private resolveGroupString(...values: unknown[]): string {
    for (const value of values) {
      const normalizedValue = String(value || '').trim();
      if (normalizedValue) {
        return normalizedValue;
      }
    }
    return '';
  }

  private loadPersistedGroupOverrides(): Record<string, Partial<CooperativeLoanGroup>> {
    try {
      const rawValue = localStorage.getItem(this.persistedGroupOverridesStorageKey)
        || sessionStorage.getItem(this.persistedGroupOverridesStorageKey)
        || '';
      const parsed = rawValue ? JSON.parse(rawValue) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private persistGroupOverride(group: Partial<CooperativeLoanGroup> & { id: number }): void {
    const groupId = String(group.id || '').trim();
    if (!groupId) {
      return;
    }

    this.persistedGroupOverrides[groupId] = {
      ...this.persistedGroupOverrides[groupId],
      ...group
    };

    try {
      const serialized = JSON.stringify(this.persistedGroupOverrides);
      localStorage.setItem(this.persistedGroupOverridesStorageKey, serialized);
      sessionStorage.setItem(this.persistedGroupOverridesStorageKey, serialized);
    } catch {
      // Ignore storage write failures; cache merging still works for the current session.
    }
  }

  private mapApiLoanToLoan(rawLoan: CooperativeLoanApiResponse, sourceLoan?: Partial<CooperativeLoan>): CooperativeLoan {
    const mappedLoanId = this.resolveLoanNumber(rawLoan.id, sourceLoan?.id);
    const memberId = this.resolveLoanNumber(this.extractNumericId(rawLoan.cooperativeMemberId), sourceLoan?.cooperativeMemberId, sourceLoan?.memberId);
    const groupId = this.resolveLoanNumber(this.extractNumericId(rawLoan.cooperativeGroupId), sourceLoan?.cooperativeGroupId, sourceLoan?.groupId);
    const guarantors = Array.isArray(rawLoan.guarantors)
      ? rawLoan.guarantors
      : rawLoan.guarantors
        ? [rawLoan.guarantors]
        : [];
    const paymentHistory = Array.isArray(rawLoan.paymentHistory) ? rawLoan.paymentHistory : [];
    const statusHistory = Array.isArray(rawLoan.statusHistory) ? rawLoan.statusHistory : [];
    const supportingDocuments = Array.isArray(rawLoan.supportingDocuments) ? rawLoan.supportingDocuments : [];

    const existingLoan = this.loans.find((item) => String(item.id) === String(mappedLoanId || rawLoan.id));

    return this.mergeLoanFinancialSnapshot({
      id: mappedLoanId || 0,
      loanCode: this.resolveLoanString(rawLoan.loanCode, sourceLoan?.loanCode, existingLoan?.loanCode, `COPLO-${mappedLoanId || rawLoan.id || ''}`),
      cooperativeMemberId: memberId || 0,
      cooperativeGroupId: groupId || 0,
      membershipId: Number(
        rawLoan.membershipId ??
        sourceLoan?.membershipId ??
        existingLoan?.membershipId ??
        0
      ) || undefined,
      amount: Number(rawLoan.amount || 0),
      purpose: String(rawLoan.purpose || ''),
      approvedAmount: this.resolveLoanNumber(rawLoan.approvedAmount, sourceLoan?.approvedAmount, existingLoan?.approvedAmount),
      repaymentAmount: Number(rawLoan.repaymentAmount || 0),
      repaymentTime: Number(rawLoan.repaymentTime || 0),
      repaymentStartDate: this.resolveLoanDate(rawLoan.repaymentStartDate, sourceLoan?.repaymentStartDate, existingLoan?.repaymentStartDate),
      repaymentDay: this.resolveLoanNumber(rawLoan.repaymentDay, sourceLoan?.repaymentDay, existingLoan?.repaymentDay),
      modeOfPayment: String(rawLoan.modeOfPayment || 'MONTHLY'),
      requestDate: this.extractDateValue(rawLoan.requestDate) || '',
      approvedDate: this.resolveLoanDate(rawLoan.approvedDate, sourceLoan?.approvedDate, existingLoan?.approvedDate) || '',
      approvedBy: rawLoan.approvedBy ?? sourceLoan?.approvedBy ?? existingLoan?.approvedBy,
      disbursedDate: this.resolveLoanDate(rawLoan.disbursedDate, sourceLoan?.disbursedDate, existingLoan?.disbursedDate) || '',
      disbursementInitiatedAt: this.resolveLoanDate(rawLoan.disbursementInitiatedAt, sourceLoan?.disbursementInitiatedAt, existingLoan?.disbursementInitiatedAt),
      disbursementInitiatedBy: rawLoan.disbursementInitiatedBy ?? sourceLoan?.disbursementInitiatedBy ?? existingLoan?.disbursementInitiatedBy,
      disbursementInstructionLoanReference: String(rawLoan.disbursementInstructionLoanReference || ''),
      disbursementConfirmedAt: this.resolveLoanDate(rawLoan.disbursementConfirmedAt, sourceLoan?.disbursementConfirmedAt, existingLoan?.disbursementConfirmedAt),
      disbursementConfirmedBy: rawLoan.disbursementConfirmedBy,
      disbursementReference: String(rawLoan.disbursementReference || ''),
      disbursedAmount: this.resolveLoanNumber(rawLoan.disbursedAmount, sourceLoan?.disbursedAmount, existingLoan?.disbursedAmount),
      completedDate: this.resolveLoanDate(rawLoan.completedDate, sourceLoan?.completedDate, existingLoan?.completedDate) || '',
      rejectedDate: this.resolveLoanDate(rawLoan.rejectedDate, sourceLoan?.rejectedDate, existingLoan?.rejectedDate) || '',
      rejectedBy: rawLoan.rejectedBy ?? sourceLoan?.rejectedBy ?? existingLoan?.rejectedBy,
      status: this.resolveLoanString(rawLoan.status, sourceLoan?.status, existingLoan?.status, 'PENDING'),
      adminComment: this.resolveLoanString(rawLoan.adminComment, sourceLoan?.adminComment, existingLoan?.adminComment),
      applicationStage: this.resolveLoanString(rawLoan.applicationStage, sourceLoan?.applicationStage, existingLoan?.applicationStage, 'PENDING_GUARANTOR_APPROVAL'),
      guarantorsId: Number(rawLoan.guarantorsId || 0) || undefined,
      guarantors: guarantors.map((guarantor: any) => ({
        id: Number(guarantor.id || 0) || undefined,
        loanId: Number(guarantor.loanId || mappedLoanId || rawLoan.id || 0) || undefined,
        guarantorMemberId: Number(guarantor.guarantorMemberId || guarantor.memberId || 0) || undefined,
        memberId: Number(guarantor.guarantorMemberId || guarantor.memberId || 0),
        guaranteedAmount: Number(guarantor.guaranteedAmount || 0),
        status: String(guarantor.status || 'PENDING'),
        requestedAt: String(guarantor.requestedAt || ''),
        respondedAt: this.extractDateValue(guarantor.respondedAt) || undefined,
        responseNote: String(guarantor.responseNote || ''),
        decidedAt: this.extractDateValue(guarantor.respondedAt || guarantor.decidedAt) || undefined,
        note: String(guarantor.responseNote || guarantor.note || '')
      })),
      guarantorApproval: Boolean(rawLoan.guarantorApproval),
      guarantorApprovalStatus: String(rawLoan.guarantorApprovalStatus || ''),
      interestRate: Number(rawLoan.interestRate || 0) || undefined,
      lateFeePercentage: Number(rawLoan.lateFeePercentage || 0) || undefined,
      lateFeeGraceDays: Number(rawLoan.lateFeeGraceDays || 0) || undefined,
      totalRepayable: Number(rawLoan.totalRepayable || 0) || undefined,
      totalPaid: Number(rawLoan.totalPaid || 0),
      totalPrincipalPaid: Number(rawLoan.totalPrincipalPaid || 0),
      totalInterestPaid: Number(rawLoan.totalInterestPaid || 0),
      totalLateFeesAccrued: Number(rawLoan.totalLateFeesAccrued || 0) || undefined,
      totalLateFeesPaid: Number(rawLoan.totalLateFeesPaid || 0) || undefined,
      outstandingPrincipal: Number(rawLoan.outstandingPrincipal || 0),
      outstandingInterest: Number(rawLoan.outstandingInterest || 0) || undefined,
      outstandingBalance: Number(rawLoan.outstandingBalance || 0) || undefined,
      lastPaymentReceived: this.extractDateValue(rawLoan.lastPaymentReceived) || undefined,
      lastPaymentAmount: Number(rawLoan.lastPaymentAmount || 0) || undefined,
      nextPaymentDueDate: this.extractDateValue(rawLoan.nextPaymentDueDate) || undefined,
      skippedPaymentsCount: this.resolveLoanNumber(rawLoan.skippedPaymentsCount, sourceLoan?.skippedPaymentsCount, existingLoan?.skippedPaymentsCount),
      overduePaymentsCount: this.resolveLoanNumber(rawLoan.overduePaymentsCount, sourceLoan?.overduePaymentsCount, existingLoan?.overduePaymentsCount),
      memberBankName: String(rawLoan.memberBankName || ''),
      memberAccountNumber: String(rawLoan.memberAccountNumber || ''),
      principalBankName: String(rawLoan.principalBankName || '').trim() || undefined,
      principalCollectionAccount: String(rawLoan.principalCollectionAccount || '').trim() || undefined,
      interestBankName: String(rawLoan.interestBankName || '').trim() || undefined,
      interestCollectionAccount: String(rawLoan.interestCollectionAccount || '').trim() || undefined,
      lateFeeBankName: String(rawLoan.lateFeeBankName || '').trim() || undefined,
      lateFeeCollectionAccount: String(rawLoan.lateFeeCollectionAccount || '').trim() || undefined,
      accountingEmail: String(rawLoan.accountingEmail || '').trim() || undefined,
      accountingWebhookUrl: String(rawLoan.accountingWebhookUrl || '').trim() || undefined,
      gracePeriodRequests: (Array.isArray(rawLoan.gracePeriodRequests) ? rawLoan.gracePeriodRequests : []).map((request: any) => ({
        id: Number(request.id || 0),
        loanId: Number(request.loanId || rawLoan.id || 0),
        memberId: Number(request.memberId || memberId),
        installmentNumber: Number(request.installmentNumber || 0),
        paymentSubtype: String(request.paymentSubtype || ''),
        amountPaid: Number(request.amountPaid || 0),
        remainingBalance: Number(request.remainingBalance || 0),
        requestedAt: String(request.requestedAt || ''),
        requestedDays: Number(request.requestedDays || 0),
        reason: String(request.reason || ''),
        status: String(request.status || 'PENDING'),
        reviewedAt: this.extractDateValue(request.reviewedAt) || undefined,
        reviewedBy: request.reviewedBy,
        reviewNote: String(request.reviewNote || ''),
        rejectionReason: String(request.rejectionReason || ''),
        approvedGraceDays: Number(request.approvedGraceDays || 0) || undefined,
        newDueDate: this.extractDateValue(request.newDueDate) || undefined,
        paymentCompletedAt: this.extractDateValue(request.paymentCompletedAt) || undefined
      })),
      paymentHistory: paymentHistory.map((payment: any) => ({
        id: Number(payment.id || 0),
        paymentType: String(payment.paymentType || ''),
        membershipId: Number(payment.membershipId || 0) || undefined,
        loanId: Number(payment.loanId || rawLoan.id || 0) || undefined,
        groupId: Number(payment.groupId || groupId) || undefined,
        cooperativeLoan: payment.cooperativeLoan,
        installmentNumber: Number(payment.installmentNumber || 0) || undefined,
        installmentNo: Number(payment.installmentNo || 0),
        paidAt: String(payment.paidAt || ''),
        amount: Number(payment.amount || 0),
        principalApplied: Number(payment.principalApplied || 0) || undefined,
        principalAmount: Number(payment.principalAmount || 0) || undefined,
        interestApplied: Number(payment.interestApplied || 0) || undefined,
        interest: Number(payment.interest || 0),
        lateFeeApplied: Number(payment.lateFeeApplied || 0) || undefined,
        lateFeeAmount: Number(payment.lateFeeAmount || 0),
        remainingBalance: Number(payment.remainingBalance || 0),
        paymentMethod: String(payment.paymentMethod || ''),
        paymentReference: String(payment.paymentReference || ''),
        referenceNumber: String(payment.referenceNumber || ''),
        paidIntoAccount: String(payment.paidIntoAccount || ''),
        paidFromAccount: String(payment.paidFromAccount || ''),
        recordedBy: Number(payment.recordedBy || 0) || undefined,
        recordedAt: this.extractDateValue(payment.recordedAt) || undefined,
        recordStatus: String(payment.recordStatus || ''),
        modeofPayment: String(payment.paymentMethod || payment.modeofPayment || 'BANK_TRANSFER'),
        status: String(payment.status || 'PENDING'),
        totalPayment: Number(payment.totalPayment || 0),
        notes: String(payment.notes || ''),
        receiptNumber: String(payment.receiptNumber || '')
      })),
      statusHistory: statusHistory.map((history: any) => ({
        id: Number(history.id || 0),
        status: String(history.status || 'PENDING'),
        changedAt: String(history.changedAt || ''),
        changedBy: history.changedBy,
        notes: String(history.notes || ''),
        overrideOpen: Boolean(history.overrideOpen),
        overrideBy: history.overrideBy,
        overrideReason: String(history.overrideReason || ''),
        statusBeforeOverride: String(history.statusBeforeOverride || '')
      })),
      supportingDocuments: supportingDocuments.map((document: any) => ({
        name: String(document?.name || document?.fileName || 'Supporting document'),
        size: Number(document?.size || 0),
        type: String(document?.type || document?.mimeType || 'application/octet-stream'),
        uploadedAt: String(document?.uploadedAt || document?.createdAt || new Date().toISOString())
      })) as LoanSupportingDocument[],
      loanId: typeof rawLoan.loanCode === 'string' && !isNaN(Number(rawLoan.loanCode)) ? Number(rawLoan.loanCode) : (typeof rawLoan.id === 'number' ? rawLoan.id : undefined),
      memberId: memberId,
      groupId: groupId,
      duration: Number(rawLoan.repaymentTime || 0),
      totalRepayment: Number(rawLoan.totalRepayable || rawLoan.totalRepayment || 0),
      applicationDate: this.extractDateValue(rawLoan.requestDate) || '',
      completionDate: this.extractDateValue(rawLoan.completedDate) || '',
      createdAt: this.extractDateValue(rawLoan.createdAt) || undefined,
      updatedAt: this.extractDateValue(rawLoan.updatedAt) || undefined,
      adminRequestNote: String(rawLoan.adminRequestNote || ''),
      rejectionReason: String(rawLoan.rejectionReason || ''),
      infoRequestedDate: this.extractDateValue(rawLoan.infoRequestedDate) || undefined,
      defaultedDate: this.extractDateValue(rawLoan.defaultedDate) || undefined,
      fundsReserved: Boolean(rawLoan.fundsReserved),
      legacyGuarantor: !Array.isArray(rawLoan.guarantors) && rawLoan.guarantors ? rawLoan.guarantors as any : undefined
    }, sourceLoan);
  }

  private mergeLoanFinancialSnapshot(loan: CooperativeLoan, sourceLoan?: Partial<CooperativeLoan>): CooperativeLoan {
    const existingLoan = this.loans.find((item) => String(item.id) === String(loan.id));
    const group = this.getGroupById(Number(loan.cooperativeGroupId || loan.groupId || 0));

    return {
      ...loan,
      principalBankName: this.resolveLoanSnapshotString(loan.principalBankName, sourceLoan?.principalBankName, existingLoan?.principalBankName, group?.principalBankName),
      principalCollectionAccount: this.resolveLoanSnapshotString(loan.principalCollectionAccount, sourceLoan?.principalCollectionAccount, existingLoan?.principalCollectionAccount, group?.principalCollectionAccount),
      interestBankName: this.resolveLoanSnapshotString(loan.interestBankName, sourceLoan?.interestBankName, existingLoan?.interestBankName, group?.interestBankName),
      interestCollectionAccount: this.resolveLoanSnapshotString(loan.interestCollectionAccount, sourceLoan?.interestCollectionAccount, existingLoan?.interestCollectionAccount, group?.interestCollectionAccount),
      lateFeeBankName: this.resolveLoanSnapshotString(loan.lateFeeBankName, sourceLoan?.lateFeeBankName, existingLoan?.lateFeeBankName, group?.lateFeeBankName),
      lateFeeCollectionAccount: this.resolveLoanSnapshotString(loan.lateFeeCollectionAccount, sourceLoan?.lateFeeCollectionAccount, existingLoan?.lateFeeCollectionAccount, group?.lateFeeCollectionAccount),
      accountingEmail: this.resolveLoanSnapshotString(loan.accountingEmail, sourceLoan?.accountingEmail, existingLoan?.accountingEmail, group?.accountingEmail),
      accountingWebhookUrl: this.resolveLoanSnapshotString(loan.accountingWebhookUrl, sourceLoan?.accountingWebhookUrl, existingLoan?.accountingWebhookUrl, group?.accountingWebhookUrl)
    };
  }

  private resolveLoanNumber(...values: unknown[]): number | undefined {
    for (const value of values) {
      if (value === null || value === undefined || value === '') {
        continue;
      }

      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private resolveLoanDate(...values: unknown[]): string | undefined {
    for (const value of values) {
      const normalizedValue = this.extractDateValue(value);
      if (normalizedValue) {
        return normalizedValue;
      }
    }

    return undefined;
  }

  private resolveLoanString(...values: unknown[]): string {
    let fallback = '';

    values.forEach((value, index) => {
      if (index === values.length - 1 && typeof value === 'string') {
        fallback = value;
      }
    });

    for (const value of values) {
      const normalizedValue = String(value || '').trim();
      if (normalizedValue) {
        return normalizedValue;
      }
    }

    return fallback;
  }

  private resolveLoanSnapshotString(...values: Array<string | undefined>): string | undefined {
    for (const value of values) {
      const normalized = String(value || '').trim();
      if (normalized) {
        return normalized;
      }
    }

    return undefined;
  }

  private buildCreateLoanPayload(loan: Omit<CooperativeLoan, 'id' | 'loanId' | 'createdAt' | 'updatedAt'>): CooperativeLoanApiCreatePayload {
    const cooperativeMemberId = Number(loan.cooperativeMemberId || loan.memberId || 0);
    const cooperativeGroupId = Number(loan.cooperativeGroupId || loan.groupId || 0);
    const repaymentTime = Number(loan.repaymentTime || loan.duration || 0);
    const modeOfPayment = String(loan.modeOfPayment || 'MONTHLY').toUpperCase() === 'ONE_OFF' ? 'ONE_OFF' : 'MONTHLY';
    const requestDate = String(loan.requestDate || loan.applicationDate || new Date().toISOString()).trim() || new Date().toISOString();
    const requiresGuarantors = Boolean(loan.guarantors?.length || loan.applicationStage === 'PENDING_GUARANTOR_APPROVAL');
    const principalBankName = String(loan.principalBankName || '').trim() || undefined;
    const principalCollectionAccount = String(loan.principalCollectionAccount || '').trim() || undefined;
    const interestBankName = String(loan.interestBankName || '').trim() || undefined;
    const interestCollectionAccount = String(loan.interestCollectionAccount || '').trim() || undefined;
    const lateFeeBankName = String(loan.lateFeeBankName || '').trim() || undefined;
    const lateFeeCollectionAccount = String(loan.lateFeeCollectionAccount || '').trim() || undefined;
    const accountingEmail = String(loan.accountingEmail || '').trim() || undefined;
    const accountingWebhookUrl = String(loan.accountingWebhookUrl || '').trim() || undefined;

    return {
      loanCode: loan.loanCode || undefined,
      cooperativeMemberId,
      cooperativeGroupId,
      membershipId: loan.membershipId,
      amount: loan.amount,
      purpose: loan.purpose,
      repaymentAmount: loan.repaymentAmount,
      repaymentTime,
      repaymentStartDate: this.toBackendDateTime(loan.repaymentStartDate),
      repaymentDay: loan.repaymentDay,
      modeOfPayment,
      requestDate: this.toBackendDateTime(requestDate),
      status: this.normalizeCooperativeLoanStatusValue(loan.status, 'PENDING'),
      adminComment: String(loan.adminComment || '').trim() || undefined,
      applicationStage: requiresGuarantors ? 'PENDING_GUARANTOR_APPROVAL' : 'READY_FOR_ADMIN_REVIEW',
      guarantorApproval: requiresGuarantors ? Boolean(loan.guarantorApproval) : undefined,
      guarantorApprovalStatus: requiresGuarantors ? 'PENDING' : undefined,
      guarantors: (loan.guarantors || []).map((guarantor) => ({
        id: guarantor.id || undefined,
        guarantorMemberId: guarantor.guarantorMemberId || guarantor.memberId,
        guaranteedAmount: guarantor.guaranteedAmount,
        status: String(guarantor.status || 'PENDING'),
        requestedAt: this.toBackendDateTime(guarantor.requestedAt),
        responseNote: String(guarantor.responseNote || guarantor.note || '').trim() || undefined
      })),
      interestRate: loan.interestRate,
      lateFeePercentage: loan.lateFeePercentage,
      lateFeeGraceDays: loan.lateFeeGraceDays,
      totalRepayable: loan.totalRepayable || loan.totalRepayment,
      memberBankName: String(loan.memberBankName || '').trim() || undefined,
      memberAccountNumber: String(loan.memberAccountNumber || '').trim() || undefined,
      principalBankName,
      principalCollectionAccount,
      interestBankName,
      interestCollectionAccount,
      lateFeeBankName,
      lateFeeCollectionAccount,
      accountingEmail,
      accountingWebhookUrl,
      supportingDocuments: (loan.supportingDocuments || []).length ? loan.supportingDocuments as any : undefined
    };
  }

  private buildUpdateLoanPayload(loan: CooperativeLoan): CooperativeLoanApiUpdatePayload {
    const cooperativeMemberId = Number(loan.cooperativeMemberId || loan.memberId || 0);
    const cooperativeGroupId = Number(loan.cooperativeGroupId || loan.groupId || 0);
    const hasGuarantors = Array.isArray(loan.guarantors) && loan.guarantors.length > 0;
    const guarantorApprovalStatus = String(loan.guarantorApprovalStatus || '').trim().toUpperCase() || undefined;
    const disbursementInstructionLoanReference = String(loan.disbursementInstructionLoanReference || '').trim() || undefined;
    const disbursementReference = String(loan.disbursementReference || '').trim() || undefined;
    const memberBankName = String(loan.memberBankName || '').trim() || undefined;
    const memberAccountNumber = String(loan.memberAccountNumber || '').trim() || undefined;
    const principalBankName = String(loan.principalBankName || '').trim() || undefined;
    const principalCollectionAccount = String(loan.principalCollectionAccount || '').trim() || undefined;
    const interestBankName = String(loan.interestBankName || '').trim() || undefined;
    const interestCollectionAccount = String(loan.interestCollectionAccount || '').trim() || undefined;
    const lateFeeBankName = String(loan.lateFeeBankName || '').trim() || undefined;
    const lateFeeCollectionAccount = String(loan.lateFeeCollectionAccount || '').trim() || undefined;
    const accountingEmail = String(loan.accountingEmail || '').trim() || undefined;
    const accountingWebhookUrl = String(loan.accountingWebhookUrl || '').trim() || undefined;

    return {
      id: loan.id,
      loanCode: loan.loanCode,
      cooperativeMemberId,
      cooperativeGroupId,
      membershipId: loan.membershipId,
      amount: loan.amount,
      purpose: loan.purpose,
      approvedAmount: loan.approvedAmount ?? (loan.status === 'APPROVED' ? loan.amount : undefined),
      repaymentAmount: loan.repaymentAmount,
      repaymentTime: loan.repaymentTime,
      repaymentStartDate: this.toBackendDateTime(loan.repaymentStartDate),
      repaymentDay: loan.repaymentDay,
      modeOfPayment: loan.modeOfPayment,
      requestDate: this.toBackendDateTime(loan.requestDate),
      approvedDate: this.toBackendDateTime(loan.approvedDate),
      disbursedDate: this.toBackendDateTime(loan.disbursedDate),
      disbursementInitiatedAt: this.toBackendDateTime(loan.disbursementInitiatedAt),
      disbursementInstructionLoanReference,
      disbursementConfirmedAt: this.toBackendDateTime(loan.disbursementConfirmedAt),
      disbursementReference,
      disbursedAmount: loan.disbursedAmount,
      completedDate: this.toBackendDateTime(loan.completedDate),
      rejectedDate: this.toBackendDateTime(loan.rejectedDate),
      status: this.normalizeCooperativeLoanStatusValue(loan.status, 'PENDING'),
      adminComment: String(loan.adminComment || '').trim() || undefined,
      applicationStage: String(loan.applicationStage || '').trim() || undefined,
      guarantorsId: loan.guarantorsId,
      guarantorApproval: hasGuarantors ? loan.guarantorApproval : undefined,
      guarantorApprovalStatus: hasGuarantors ? guarantorApprovalStatus : undefined,
      guarantors: hasGuarantors ? (loan.guarantors || []).map((guarantor) => ({
        id: guarantor.id,
        loanId: guarantor.loanId || loan.id,
        guarantorMemberId: guarantor.guarantorMemberId || guarantor.memberId,
        guaranteedAmount: guarantor.guaranteedAmount,
        status: guarantor.status,
        requestedAt: this.toBackendDateTime(guarantor.requestedAt),
        respondedAt: this.toBackendDateTime(guarantor.respondedAt || guarantor.decidedAt),
        responseNote: String(guarantor.responseNote || guarantor.note || '').trim() || undefined
      })) : undefined,
      interestRate: loan.interestRate,
      lateFeePercentage: loan.lateFeePercentage,
      lateFeeGraceDays: loan.lateFeeGraceDays,
      totalRepayable: loan.totalRepayable || loan.totalRepayment,
      totalPaid: loan.totalPaid,
      totalPrincipalPaid: loan.totalPrincipalPaid,
      totalInterestPaid: loan.totalInterestPaid,
      totalLateFeesAccrued: loan.totalLateFeesAccrued,
      totalLateFeesPaid: loan.totalLateFeesPaid,
      outstandingPrincipal: loan.outstandingPrincipal,
      outstandingInterest: loan.outstandingInterest,
      outstandingBalance: loan.outstandingBalance,
      lastPaymentReceived: this.toBackendDateTime(loan.lastPaymentReceived),
      lastPaymentAmount: loan.lastPaymentAmount,
      nextPaymentDueDate: this.toBackendDateTime(loan.nextPaymentDueDate),
      skippedPaymentsCount: loan.skippedPaymentsCount,
      overduePaymentsCount: loan.overduePaymentsCount,
      memberBankName,
      memberAccountNumber,
      principalBankName,
      principalCollectionAccount,
      interestBankName,
      interestCollectionAccount,
      lateFeeBankName,
      lateFeeCollectionAccount,
      accountingEmail,
      accountingWebhookUrl,
      gracePeriodRequests: (loan.gracePeriodRequests || []).length ? (loan.gracePeriodRequests || []).map((request) => ({
        id: Number(request.id || 0) || undefined,
        loanId: Number(request.loanId || loan.id || 0),
        memberId: Number(request.memberId || cooperativeMemberId || 0),
        installmentNumber: Number(request.installmentNumber || 0),
        paymentSubtype: String(request.paymentSubtype || ''),
        amountPaid: Number(request.amountPaid || 0),
        remainingBalance: Number(request.remainingBalance || 0),
        requestedAt: this.toBackendDateTime(request.requestedAt),
        requestedDays: Number(request.requestedDays || 0),
        reason: String(request.reason || ''),
        status: String(request.status || 'PENDING'),
        reviewedAt: this.toBackendDateTime(request.reviewedAt),
        reviewedBy: this.extractAuditUserId(request.reviewedBy),
        reviewNote: String(request.reviewNote || ''),
        rejectionReason: String(request.rejectionReason || ''),
        approvedGraceDays: Number(request.approvedGraceDays || 0) || undefined,
        newDueDate: this.toBackendDateTime(request.newDueDate),
        paymentCompletedAt: this.toBackendDateTime(request.paymentCompletedAt)
      })) : undefined,
      paymentHistory: (loan.paymentHistory || []).length ? (loan.paymentHistory || []).map((payment) => ({
        id: Number(payment.id || 0) || undefined,
        paymentType: String(payment.paymentType || ''),
        membershipId: Number(payment.membershipId || loan.membershipId || 0) || undefined,
        loanId: Number(payment.loanId || loan.id || 0),
        groupId: Number(payment.groupId || cooperativeGroupId || 0) || undefined,
        installmentNumber: Number(payment.installmentNumber || 0) || undefined,
        installmentNo: Number(payment.installmentNo || 0),
        paidAt: this.toBackendDateTime(payment.paidAt),
        amount: Number(payment.amount || 0),
        principalApplied: Number(payment.principalApplied || 0) || undefined,
        principalAmount: Number(payment.principalAmount || 0) || undefined,
        interestApplied: Number(payment.interestApplied || 0) || undefined,
        interest: Number(payment.interest || 0),
        lateFeeApplied: Number(payment.lateFeeApplied || 0) || undefined,
        lateFeeAmount: Number(payment.lateFeeAmount || 0),
        remainingBalance: Number(payment.remainingBalance || 0),
        paymentMethod: String(payment.paymentMethod || payment.modeofPayment || ''),
        paymentReference: String(payment.paymentReference || ''),
        referenceNumber: String(payment.referenceNumber || ''),
        paidIntoAccount: String(payment.paidIntoAccount || ''),
        paidFromAccount: String(payment.paidFromAccount || ''),
        recordedBy: Number(payment.recordedBy || 0) || undefined,
        recordedAt: this.toBackendDateTime(payment.recordedAt),
        recordStatus: String(payment.recordStatus || ''),
        status: String(payment.status || 'PENDING'),
        totalPayment: Number(payment.totalPayment || payment.amount || 0),
        notes: String(payment.notes || ''),
        receiptNumber: String(payment.receiptNumber || '')
      })) : undefined,
      supportingDocuments: (loan.supportingDocuments || []).length ? loan.supportingDocuments : undefined
    };
  }

  private toBackendDateTime(value: unknown): string | undefined {
    const rawValue = this.extractDateValue(value) || String(value || '').trim();
    if (!rawValue) {
      return undefined;
    }

    if (/^\d{4},\d{1,2},\d{1,2}(,\d{1,2}){0,4}$/.test(rawValue)) {
      const normalized = this.formatDateArray(rawValue.split(',').map((part) => Number(part.trim())));
      return normalized || undefined;
    }

    return /^\d{4}-\d{2}-\d{2}$/.test(rawValue) ? `${rawValue}T00:00:00` : rawValue;
  }

  private extractAuditUserId(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    }

    if (value && typeof value === 'object') {
      const parsed = Number((value as { id?: unknown; userId?: unknown }).id || (value as { id?: unknown; userId?: unknown }).userId || 0);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    }

    return undefined;
  }

  private normalizeCooperativeLoanStatusValue(value: unknown, fallback?: string): string | undefined {
    const normalized = String(value || fallback || '').trim().toUpperCase();
    if (!normalized) {
      return undefined;
    }

    const allowedStatuses = new Set([
      'PENDING',
      'AWAITING_INTEREST_ACCEPTANCE',
      'APPROVED',
      'READY_FOR_DISBURSEMENT',
      'REJECTED',
      'ACTIVE',
      'COMPLETED',
      'SKIPPED',
      'OVERDUE',
      'DEFAULTED',
      'PAUSED'
    ]);

    return allowedStatuses.has(normalized) ? normalized : undefined;
  }

  private toAuditUserPayload(value: unknown): CooperativeLoanApiAuditUser | undefined {
    const id = this.extractAuditUserId(value);
    if (!id) {
      return undefined;
    }

    if (value && typeof value === 'object') {
      const actor = value as Partial<CooperativeLoanApiAuditUser>;
      return {
        id,
        fullname: String(actor.fullname || this.getCurrentAuditUser()?.fullname || `User ${id}`),
        userId: Number(actor.userId || id),
        email: String(actor.email || ''),
        phoneNumber: String(actor.phoneNumber || ''),
        username: String(actor.username || ''),
        clientType: String(actor.clientType || ''),
        gender: String(actor.gender || ''),
        accountId: String(actor.accountId || ''),
        address: String(actor.address || ''),
        city: String(actor.city || ''),
        state: String(actor.state || ''),
        country: String(actor.country || '')
      };
    }

    return this.getCurrentAuditUserId() === id
      ? this.getCurrentAuditUser()
      : {
          id,
          fullname: `User ${id}`,
          userId: id,
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

  private getCurrentAuditUserId(): number | undefined {
    const userId = Number(
      sessionStorage.getItem('userid')
      || sessionStorage.getItem('userId')
      || localStorage.getItem('userid')
      || localStorage.getItem('userId')
      || 0
    );

    return Number.isFinite(userId) && userId > 0 ? userId : undefined;
  }

  private getCurrentAuditUser(): CooperativeLoanApiAuditUser | undefined {
    const id = this.getCurrentAuditUserId();
    if (!id) {
      return undefined;
    }

    const fullname = sessionStorage.getItem('fullname')
      || localStorage.getItem('fullname')
      || sessionStorage.getItem('username')
      || 'System User';

    return {
      id,
      fullname,
      userId: id,
      email: sessionStorage.getItem('email') || localStorage.getItem('email') || '',
      phoneNumber: sessionStorage.getItem('phoneNumber') || localStorage.getItem('phoneNumber') || '',
      username: sessionStorage.getItem('username') || localStorage.getItem('username') || fullname,
      clientType: sessionStorage.getItem('clientType') || localStorage.getItem('clientType') || '',
      gender: sessionStorage.getItem('gender') || localStorage.getItem('gender') || '',
      accountId: sessionStorage.getItem('accountId') || localStorage.getItem('accountId') || '',
      address: sessionStorage.getItem('address') || localStorage.getItem('address') || '',
      city: sessionStorage.getItem('city') || localStorage.getItem('city') || '',
      state: sessionStorage.getItem('state') || localStorage.getItem('state') || '',
      country: sessionStorage.getItem('country') || localStorage.getItem('country') || ''
    };
  }

  private normalizeGroupMembershipStatus(status: unknown): CooperativeGroupMembership['status'] {
    const normalized = String(status || 'PENDING').toUpperCase();
    if (normalized === 'ACTIVE' || normalized === 'REJECTED' || normalized === 'INACTIVE') {
      return normalized;
    }
    if (normalized === 'APPROVED') {
      return 'ACTIVE';
    }
    return 'PENDING';
  }

  private mapApiGroupMembershipHistoryToLocal(history: any): CooperativeGroupMembershipHistory {
    return {
      id: Number(history?.id || 0),
      membershipId: Number(history?.membershipId || 0),
      groupId: Number(history?.groupId || 0),
      status: this.normalizeGroupMembershipStatus(history?.status),
      changedAt: this.extractDateValue(history?.changedAt) || new Date().toISOString(),
      changedBy: typeof history?.changedBy === 'object'
        ? Number(history.changedBy?.id || 0) || undefined
        : Number(history?.changedBy || 0) || undefined,
      notes: String(history?.notes || '') || undefined
    };
  }

  private mapApiGroupMembershipToMembership(rawMembership: CooperativeGroupMembershipApiResponse): CooperativeGroupMembership {
    const groupId = Number(rawMembership.groupId || 0);
    const group = this.getGroupById(groupId);
    const status = this.normalizeGroupMembershipStatus(rawMembership.status);
    const joinedAt = this.extractDateValue(rawMembership.activatedAt || rawMembership.approvedAt || rawMembership.requestedAt) || '';
    const reviewedAt = this.extractDateValue(rawMembership.approvedAt || rawMembership.rejectedAt || rawMembership.inactiveAt) || undefined;

    return {
      id: Number(rawMembership.id || 0),
      memberId: Number(rawMembership.memberId || 0),
      groupId,
      membershipId: Number(rawMembership.membershipId || rawMembership.id || 0) || undefined,
      status,
      monthlyContributionAmount: Number(group?.monthlyContributionAmount || 0),
      totalContribution: Number(rawMembership.totalContributed || 0),
      joinedAt,
      requestedAt: this.extractDateValue(rawMembership.requestedAt) || undefined,
      approvedAt: this.extractDateValue(rawMembership.approvedAt) || undefined,
      activatedAt: this.extractDateValue(rawMembership.activatedAt) || undefined,
      rejectedAt: this.extractDateValue(rawMembership.rejectedAt) || undefined,
      inactiveAt: this.extractDateValue(rawMembership.inactiveAt) || undefined,
      reviewedAt,
      reviewedBy: typeof rawMembership.reviewedBy === 'object'
        ? Number(rawMembership.reviewedBy?.id || 0) || undefined
        : undefined,
      reviewNote: String(rawMembership.reviewNote || '') || undefined,
      rejectionReason: String(rawMembership.rejectionReason || '') || undefined,
      lastContributionAmount: Number(rawMembership.lastContributionAmount || 0) || undefined,
      lastContributionDate: this.extractDateValue(rawMembership.lastContributionDate) || undefined,
      expectedContributionDay: Number(rawMembership.expectedContributionDay || 0) || undefined,
      membershipHistory: Array.isArray(rawMembership.membershipHistory)
        ? rawMembership.membershipHistory.map((history) => this.mapApiGroupMembershipHistoryToLocal(history))
        : []
    };
  }

  private buildGroupMembershipCreatePayload(membership: CooperativeGroupMembership): CooperativeGroupMembershipApiPayload {
    return {
      memberId: membership.memberId,
      groupId: membership.groupId,
      membershipId: membership.membershipId,
      status: membership.status,
      requestedAt: membership.requestedAt,
      reviewNote: membership.reviewNote,
      rejectionReason: membership.rejectionReason,
      totalContributed: membership.totalContribution,
      lastContributionAmount: membership.lastContributionAmount,
      lastContributionDate: membership.lastContributionDate,
      expectedContributionDay: membership.expectedContributionDay,
      membershipHistory: (membership.membershipHistory || []).map((history) => ({
        membershipId: history.membershipId,
        groupId: history.groupId,
        status: history.status,
        changedAt: history.changedAt,
        changedBy: this.getCurrentAuditUserId(),
        notes: history.notes
      }))
    };
  }

  private buildGroupMembershipUpdatePayload(membership: CooperativeGroupMembership): CooperativeGroupMembershipApiUpdatePayload {
    return {
      id: membership.id,
      memberId: membership.memberId,
      groupId: membership.groupId,
      membershipId: membership.membershipId,
      status: membership.status,
      requestedAt: membership.requestedAt,
      approvedAt: membership.approvedAt,
      activatedAt: membership.activatedAt,
      rejectedAt: membership.rejectedAt,
      inactiveAt: membership.inactiveAt,
      reviewedBy: membership.reviewedBy,
      reviewNote: membership.reviewNote,
      rejectionReason: membership.rejectionReason,
      totalContributed: membership.totalContribution,
      lastContributionAmount: membership.lastContributionAmount,
      lastContributionDate: membership.lastContributionDate,
      expectedContributionDay: membership.expectedContributionDay
    };
  }

  private persistGroupMembershipHistory(
    membership: CooperativeGroupMembership,
    status: CooperativeGroupMembership['status'],
    notes?: string
  ): Observable<unknown> {
    const auditUserId = this.getCurrentAuditUserId();
    if (!auditUserId) {
      return of(undefined);
    }

    const payload: CooperativeGroupMembershipHistoryApiPayload = {
      membershipId: Number(membership.membershipId || membership.id),
      groupId: membership.groupId,
      status,
      changedAt: new Date().toISOString(),
      changedBy: auditUserId,
      notes: notes || undefined
    };

    return this.cooperativeLoanApiService.createGroupMembershipHistory(payload);
  }

  private mapApiContributionEntryToLocal(rawEntry: CooperativeContributionHistoryApiResponse): CooperativeContributionEntry {
    return {
      id: Number(rawEntry.id || 0),
      membershipId: Number(rawEntry.membershipId || 0),
      memberId: Number(rawEntry.memberId || 0),
      groupId: Number(rawEntry.groupId || 0),
      amount: Number(rawEntry.contributionAmount || 0),
      contributionMonth: String(rawEntry.contributionMonth || ''),
      contributedAt: this.extractDateValue(rawEntry.postedAt) || new Date().toISOString(),
      status: 'POSTED',
      paymentMethod: this.normalizeContributionPaymentMethod(rawEntry.paymentMethod),
      paymentRecordId: Number(rawEntry.paymentRecordId || 0) || undefined,
      postedBy: typeof rawEntry.postedBy === 'object'
        ? Number(rawEntry.postedBy?.id || 0) || undefined
        : undefined
    };
  }

  private normalizeContributionPaymentMethod(value: unknown): CooperativeContributionPaymentMethod {
    const normalized = String(value || '').trim().toUpperCase();

    switch (normalized) {
      case 'CARD':
      case 'CASH':
      case 'PAYROLL_DEDUCTION':
      case 'MOBILE_MONEY':
      case 'BANK_TRANSFER':
        return normalized;
      default:
        return 'BANK_TRANSFER';
    }
  }

  private mapApiGracePeriodRequestToLocal(rawRequest: CooperativeGracePeriodRequestApiResponse): CooperativeLoanGracePeriodRequest {
    return {
      id: Number(rawRequest.id || 0),
      loanId: Number(rawRequest.loanId || 0),
      memberId: Number(rawRequest.memberId || 0),
      installmentNumber: Number(rawRequest.installmentNumber || 0),
      paymentSubtype: String(rawRequest.paymentSubtype || ''),
      amountPaid: Number(rawRequest.amountPaid || 0),
      remainingBalance: Number(rawRequest.remainingBalance || 0),
      requestedAt: this.extractDateValue(rawRequest.requestedAt) || new Date().toISOString(),
      requestedDays: Number(rawRequest.requestedDays || 0),
      reason: String(rawRequest.reason || ''),
      status: String(rawRequest.status || 'PENDING'),
      reviewedAt: this.extractDateValue(rawRequest.reviewedAt) || undefined,
      reviewedBy: rawRequest.reviewedBy,
      reviewNote: String(rawRequest.reviewNote || '') || undefined,
      rejectionReason: String(rawRequest.rejectionReason || '') || undefined,
      approvedGraceDays: Number(rawRequest.approvedGraceDays || 0) || undefined,
      newDueDate: this.extractDateValue(rawRequest.newDueDate) || undefined,
      paymentCompletedAt: this.extractDateValue(rawRequest.paymentCompletedAt) || undefined
    };
  }

  private collectGracePeriodRequestsFromLoanCache(): CooperativeLoanGracePeriodRequest[] {
    return this.loans.flatMap((loan) => loan.gracePeriodRequests || []);
  }

  private syncGracePeriodRequestsIntoLoanCache(requests: CooperativeLoanGracePeriodRequest[]): void {
    const requestsByLoanId = requests.reduce<Record<string, CooperativeLoanGracePeriodRequest[]>>((records, request) => {
      const key = String(request.loanId);
      records[key] = [...(records[key] || []), request];
      return records;
    }, {});

    this.loans = this.loans.map((loan) => ({
      ...loan,
      gracePeriodRequests: requestsByLoanId[String(loan.id)] || loan.gracePeriodRequests || []
    }));
    this.publishState();
  }

  private upsertGracePeriodRequestInLoanCache(request: CooperativeLoanGracePeriodRequest): void {
    this.loans = this.loans.map((loan) => {
      if (String(loan.id) !== String(request.loanId)) {
        return loan;
      }

      const existingRequests = loan.gracePeriodRequests || [];
      const existingIndex = existingRequests.findIndex((item) => String(item.id) === String(request.id));
      if (existingIndex === -1) {
        return { ...loan, gracePeriodRequests: [request, ...existingRequests] };
      }

      return {
        ...loan,
        gracePeriodRequests: existingRequests.map((item, index) => (index === existingIndex ? request : item))
      };
    });
    this.publishState();
  }

  private resolveGracePeriodNewDueDate(request: CooperativeLoanGracePeriodRequest, approvedGraceDays: number): string {
    const loanRepayments = this.repayments
      .filter((repayment) => repayment.loanId === request.loanId)
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());

    const targetRepayment = loanRepayments[Math.max(Number(request.installmentNumber || 1) - 1, 0)];
    const baseDate = targetRepayment?.dueDate || request.newDueDate || request.requestedAt || new Date().toISOString();
    const nextDueDate = new Date(baseDate);
    nextDueDate.setDate(nextDueDate.getDate() + Number(approvedGraceDays || 0));
    return nextDueDate.toISOString();
  }

  private applyApprovedGracePeriodToRepayment(request: CooperativeLoanGracePeriodRequest): void {
    const sortedRepayments = this.repayments
      .filter((repayment) => repayment.loanId === request.loanId)
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());

    const targetRepayment = sortedRepayments[Math.max(Number(request.installmentNumber || 1) - 1, 0)];
    if (!targetRepayment || !request.newDueDate) {
      return;
    }

    const targetIndex = sortedRepayments.findIndex((repayment) => repayment.id === targetRepayment.id);
    const previousDueDate = new Date(targetRepayment.dueDate);
    const approvedDueDate = new Date(request.newDueDate);
    const shiftMilliseconds = approvedDueDate.getTime() - previousDueDate.getTime();

    sortedRepayments.forEach((repayment, index) => {
      if (index < targetIndex || repayment.status === 'PAID') {
        return;
      }

      const baseDueDate = new Date(repayment.dueDate);
      const shiftedDueDate = index === targetIndex
        ? approvedDueDate
        : new Date(baseDueDate.getTime() + shiftMilliseconds);

      repayment.dueDate = shiftedDueDate.toISOString();
      repayment.reminderSentAt = undefined;
      repayment.creditReportedAt = undefined;

      if (index === targetIndex) {
        repayment.status = 'SKIPPED';
      } else {
        repayment.status = 'PENDING';
      }
    });

    const loan = this.loans.find((item) => item.id === request.loanId);
    if (loan) {
      loan.nextPaymentDueDate = request.newDueDate;
      loan.updatedAt = new Date().toISOString();
      if (loan.status !== 'PAUSED' && loan.status !== 'COMPLETED' && loan.status !== 'DEFAULTED') {
        loan.status = 'SKIPPED';
      }
      this.syncLoanLifecycleFromRepayments(loan);
    }

    this.saveToStorage();
    this.publishState();
  }

  private getLoanLateFeeGraceDays(loan: CooperativeLoan): number {
    const groupId = loan.groupId || loan.cooperativeGroupId;
    const group = groupId ? this.getGroupById(groupId) : undefined;
    return Math.max(Number(group?.lateFeeGraceDays || this.repaymentOverdueDays || 0), 0);
  }

  private refreshLoanRepaymentStatuses(loanId: number): void {
    const loan = this.loans.find((item) => item.id === loanId);
    if (!loan || loan.status === 'COMPLETED' || loan.status === 'DEFAULTED' || loan.status === 'REJECTED') {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const graceDays = this.getLoanLateFeeGraceDays(loan);
    let hasChanges = false;

    this.repayments
      .filter((repayment) => repayment.loanId === loanId && repayment.status !== 'PAID')
      .forEach((repayment) => {
        if (loan.status === 'PAUSED') {
          return;
        }

        const dueDate = new Date(repayment.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const overdueDays = Math.max(Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)), 0);

        let nextStatus = repayment.status;
        if (overdueDays > graceDays) {
          nextStatus = 'OVERDUE';
        } else if (repayment.status !== 'SKIPPED') {
          nextStatus = 'PENDING';
        }

        if (nextStatus !== repayment.status) {
          repayment.status = nextStatus;
          hasChanges = true;
        }
      });

    if (this.syncLoanLifecycleFromRepayments(loan)) {
      hasChanges = true;
    }

    if (hasChanges) {
      loan.updatedAt = new Date().toISOString();
      this.saveToStorage();
      this.publishState();
    }
  }

  private syncLoanLifecycleFromRepayments(loan: CooperativeLoan): boolean {
    const openRepayments = this.repayments
      .filter((repayment) => repayment.loanId === loan.id && repayment.status !== 'PAID')
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());

    const skippedCount = openRepayments.filter((repayment) => repayment.status === 'SKIPPED').length;
    const overdueCount = openRepayments.filter((repayment) => repayment.status === 'OVERDUE').length;
    const nextDueDate = openRepayments[0]?.dueDate;
    let changed = false;

    if (loan.skippedPaymentsCount !== skippedCount) {
      loan.skippedPaymentsCount = skippedCount;
      changed = true;
    }

    if (loan.overduePaymentsCount !== overdueCount) {
      loan.overduePaymentsCount = overdueCount;
      changed = true;
    }

    if ((loan.nextPaymentDueDate || '') !== (nextDueDate || '')) {
      loan.nextPaymentDueDate = nextDueDate;
      changed = true;
    }

    if (loan.status === 'PAUSED' || loan.status === 'COMPLETED' || loan.status === 'REJECTED') {
      return changed;
    }

    let nextStatus = loan.status;
    if (overdueCount >= 3) {
      nextStatus = 'DEFAULTED';
      if (!loan.defaultedDate) {
        loan.defaultedDate = new Date().toISOString();
      }
    } else if (overdueCount > 0) {
      nextStatus = 'OVERDUE';
    } else if (skippedCount > 0) {
      nextStatus = 'SKIPPED';
    } else if (loan.disbursedDate) {
      nextStatus = 'ACTIVE';
    }

    if (nextStatus !== loan.status) {
      loan.status = nextStatus;
      changed = true;
    }

    return changed;
  }

  private syncGroupMembershipCache(
    memberships: CooperativeGroupMembership[],
    rawMemberships: CooperativeGroupMembershipApiResponse[] = []
  ): void {
    if (rawMemberships.length > 0) {
      this.groupMembershipApiRecords = rawMemberships.reduce<Record<string, CooperativeGroupMembershipApiResponse>>((records, membership) => {
        records[String(membership.id)] = membership;
        return records;
      }, {});
    }
    this.groupMemberships = [...memberships];
    this.markGroupMembershipsCacheFresh();
    this.publishState();
  }

  private upsertGroupMembershipInCache(
    membership: CooperativeGroupMembership,
    publish = true,
    rawMembership?: CooperativeGroupMembershipApiResponse
  ): void {
    const existingIndex = this.groupMemberships.findIndex((item) => String(item.id) === String(membership.id));
    if (existingIndex === -1) {
      this.groupMemberships = [membership, ...this.groupMemberships];
    } else {
      this.groupMemberships = this.groupMemberships.map((item, index) => (index === existingIndex ? membership : item));
    }
    if (rawMembership) {
      this.groupMembershipApiRecords[String(rawMembership.id)] = rawMembership;
    }
    this.markGroupMembershipsCacheFresh();
    if (publish) {
      this.publishState();
    }
  }

  private syncContributionCache(
    entries: CooperativeContributionEntry[],
    rawEntries: CooperativeContributionHistoryApiResponse[] = []
  ): void {
    if (rawEntries.length > 0) {
      this.contributionApiRecords = rawEntries.reduce<Record<string, CooperativeContributionHistoryApiResponse>>((records, entry) => {
        records[String(entry.id)] = entry;
        return records;
      }, {});
    }
    this.contributionEntries = [...entries];
    this.markContributionEntriesCacheFresh();
    this.reconcilePendingContributionRequests();
    this.publishState();
  }

  private upsertContributionEntryInCache(
    entry: CooperativeContributionEntry,
    publish = true,
    rawEntry?: CooperativeContributionHistoryApiResponse
  ): void {
    const existingIndex = this.contributionEntries.findIndex((item) => String(item.id) === String(entry.id));
    if (existingIndex === -1) {
      this.contributionEntries = [entry, ...this.contributionEntries];
    } else {
      this.contributionEntries = this.contributionEntries.map((item, index) => (index === existingIndex ? entry : item));
    }
    if (rawEntry) {
      this.contributionApiRecords[String(rawEntry.id)] = rawEntry;
    }
    this.markContributionEntriesCacheFresh();
    this.reconcilePendingContributionRequests();
    if (publish) {
      this.publishState();
    }
  }

  private reconcilePendingContributionRequests(save = true): void {
    const nextRequests = this.pendingContributionRequests.map((request) => {
      const matchingEntry = this.contributionEntries.find((entry) =>
        entry.membershipId === request.membershipId && entry.contributionMonth === request.contributionMonth
      );

      if (!matchingEntry) {
        return request;
      }

      return {
        ...request,
        status: 'CONFIRMED' as const,
        confirmedAt: request.confirmedAt || matchingEntry.contributedAt
      };
    });

    this.pendingContributionRequests = nextRequests;

    if (save) {
      this.saveToStorage();
    }
  }

  private mergeGroupCache(groups: CooperativeLoanGroup[], rawGroups: CooperativeGroupApiResponse[] = []): void {
    groups.forEach((group, index) => this.upsertGroupInCache(group, false, rawGroups[index], false));
    this.refreshGroupMembershipAmountsFromGroups();
    this.publishState();
  }

  private syncGroupCache(groups: CooperativeLoanGroup[], rawGroups: CooperativeGroupApiResponse[] = []): void {
    if (rawGroups.length > 0) {
      this.groupApiRecords = rawGroups.reduce<Record<string, CooperativeGroupApiResponse>>((records, group) => {
        records[String(group.id)] = group;
        return records;
      }, {});
    }
    this.groups = [...groups];
    this.markGroupsCacheFresh();
    this.refreshGroupMembershipAmountsFromGroups();
    this.publishState();
  }

  private hydrateGroupsWithDetails(
    rawGroups: CooperativeGroupApiResponse[]
  ): Observable<CooperativeGroupApiResponse[]> {
    return forkJoin(
      rawGroups.map((rawGroup) => {
        if (!this.groupNeedsDetailHydration(rawGroup)) {
          return of(rawGroup);
        }

        return this.cooperativeGroupService.getCooperativeGroupById(Number(rawGroup.id)).pipe(
          map((detailGroup) => ({ ...rawGroup, ...detailGroup })),
          catchError(() => of(rawGroup))
        );
      })
    );
  }

  private groupNeedsDetailHydration(rawGroup: CooperativeGroupApiResponse): boolean {
    return [
      rawGroup.contributionsBankName,
      rawGroup.contributionsAccount,
      rawGroup.principalBankName,
      rawGroup.principalCollectionAccount,
      rawGroup.interestBankName,
      rawGroup.interestCollectionAccount,
      rawGroup.lateFeeBankName,
      rawGroup.lateFeeCollectionAccount,
      rawGroup.accountingEmail,
      rawGroup.accountingWebhookUrl
    ].some((value) => value == null || String(value).trim() === '');
  }

  private upsertGroupInCache(
    group: CooperativeLoanGroup,
    publish = true,
    rawGroup?: CooperativeGroupApiResponse,
    markCollectionFresh = true
  ): void {
    const existingIndex = this.groups.findIndex((item) => String(item.id) === String(group.id));
    if (existingIndex === -1) {
      this.groups = [group, ...this.groups];
    } else {
      this.groups = this.groups.map((item, index) => (index === existingIndex ? group : item));
    }
    if (rawGroup) {
      this.groupApiRecords[String(rawGroup.id)] = rawGroup;
    }
    if (markCollectionFresh) {
      this.markGroupsCacheFresh();
    }
    this.refreshGroupMembershipAmountsFromGroups();
    if (publish) {
      this.publishState();
    }
  }

  private refreshGroupMembershipAmountsFromGroups(): void {
    this.groupMemberships = this.groupMemberships.map((membership) => ({
      ...membership,
      monthlyContributionAmount: Number(this.getGroupById(membership.groupId)?.monthlyContributionAmount || membership.monthlyContributionAmount || 0)
    }));
  }

  private syncMemberCache(members: CooperativeMember[], rawMembers: CooperativeLoanApiMemberRef[]): void {
    this.memberApiRecords = rawMembers.reduce<Record<string, CooperativeLoanApiMemberRef>>((records, member) => {
      records[String(member.id)] = member;
      if (member.memberId) {
        records[String(member.memberId)] = member;
      }
      if (member.employeeId) {
        records[String(member.employeeId)] = member;
      }
      return records;
    }, {});
    this.members = members;
    this.markMembersCacheFresh();
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
      if (rawMember.memberId) {
        this.memberApiRecords[String(rawMember.memberId)] = rawMember;
      }
      if (rawMember.employeeId) {
        this.memberApiRecords[String(rawMember.employeeId)] = rawMember;
      }
    }
    this.markMembersCacheFresh();
    this.publishState();
  }

  private syncLoanCache(loans: CooperativeLoan[]): void {
    this.loans = [...loans];
    this.markLoansCacheFresh();
    this.publishState();
  }

  private upsertLoanInCache(loan: CooperativeLoan): void {
    const existingIndex = this.loans.findIndex((item) => String(item.id) === String(loan.id));
    if (existingIndex === -1) {
      this.loans = [loan, ...this.loans];
    } else {
      this.loans = this.loans.map((item, index) => (index === existingIndex ? loan : item));
    }
    this.markLoansCacheFresh();
    this.publishState();
  }

  private mergeLoanReferenceData(rawLoans: CooperativeLoanApiResponse[]): void {
    let changed = false;
    rawLoans.forEach((loan) => {
      const mappedMember = this.mapBackendMemberToLocal(loan.cooperativeMemberId);
      if (mappedMember) {
        const existingMemberIndex = this.members.findIndex((member) =>
          member.id === mappedMember.id || member.memberId === mappedMember.memberId || member.employeeId === mappedMember.employeeId
        );
        if (existingMemberIndex === -1) {
          this.members = [...this.members, mappedMember];
          changed = true;
        } else {
          const mergedMember = this.mergeMemberLocalFields(mappedMember, this.members[existingMemberIndex]);
          this.members = this.members.map((member, index) => (index === existingMemberIndex ? mergedMember : member));
          changed = true;
        }

        const rawMemberRef = loan.cooperativeMemberId;
        if (rawMemberRef && typeof rawMemberRef === 'object' && 'id' in rawMemberRef) {
          this.memberApiRecords[String(rawMemberRef.id)] = rawMemberRef;
          if (rawMemberRef.memberId) {
            this.memberApiRecords[String(rawMemberRef.memberId)] = rawMemberRef;
          }
          if (rawMemberRef.employeeId) {
            this.memberApiRecords[String(rawMemberRef.employeeId)] = rawMemberRef;
          }
        }
      }
    });
    if (changed) {
      this.publishState();
    }
  }

  private mapBackendMemberToLocal(memberRef: CooperativeLoanApiMemberRef | number | string | undefined): CooperativeMember | undefined {
    if (!memberRef || typeof memberRef !== 'object' || !('id' in memberRef)) {
      return undefined;
    }
    const employee = memberRef.employee;
    const fullName = this.extractMemberDisplayName(memberRef);
    return {
      id: Number(memberRef.id),
      employeeId: Number(memberRef.employeeId || employee?.id || 0),
      memberId: Number(memberRef.memberId || memberRef.id),
      fullName,
      email: String(employee?.workEmail || employee?.email || ''),
      phone: String(employee?.phone || ''),
      joinDate: String((memberRef as any).joinDate || (memberRef as any).createdAt || ''),
      monthlySalary: Number(memberRef.monthlySalary || 0),
      status: this.normalizeMemberStatus(memberRef.status),
      shareCapital: 0,
      cooperativeGroup: Array.isArray(memberRef.cooperativeGroup) ? memberRef.cooperativeGroup : [],
      contributionHistory: Array.isArray(memberRef.contributionHistory) ? memberRef.contributionHistory : [],
      loanHistory: Array.isArray(memberRef.loanHistory) ? memberRef.loanHistory : [],
      createdAt: String((memberRef as any).createdAt || ''),
      updatedAt: String((memberRef as any).updatedAt || (memberRef as any).createdAt || '')
    };
  }

  private mergeMemberLocalFields(member: CooperativeMember, existingMember?: Partial<CooperativeMember>): CooperativeMember {
    const preferredName = this.getPreferredMemberName(member) || this.getPreferredMemberName(existingMember) || member.fullName;
    return {
      ...member,
      fullName: preferredName,
      email: member.email || existingMember?.email || '',
      phone: member.phone || existingMember?.phone || '',
      employeeId: Number(member.employeeId || existingMember?.employeeId || 0),
      memberId: Number(member.memberId || existingMember?.memberId || 0),
      shareCapital: Number(member.shareCapital || existingMember?.shareCapital || 0),
      address: member.address || existingMember?.address,
      emergencyContact: member.emergencyContact || existingMember?.emergencyContact,
      createdAt: String(existingMember?.createdAt || member.createdAt || new Date().toISOString()),
      updatedAt: new Date().toISOString()
    };
  }

  private normalizeMemberStatus(status: unknown): CooperativeMember['status'] {
    const normalizedStatus = String(status || '').trim().toUpperCase();

    if (normalizedStatus === 'INACTIVE') {
      return 'INACTIVE';
    }

    if (normalizedStatus === 'SUSPENDED') {
      return 'SUSPENDED';
    }

    return 'ACTIVE';
  }

  private enrichMembersWithEmployeeDirectory(members: CooperativeMember[], employees: any[]): CooperativeMember[] {
    const employeeMap = new Map<number, any>();

    employees.forEach((employee) => {
      const employeeId = Number(employee?.id || employee?.employeeId || employee?.staffId || 0);
      if (Number.isFinite(employeeId) && employeeId > 0) {
        employeeMap.set(employeeId, employee);
      }
    });

    return members.map((member) => {
      const employee = employeeMap.get(Number(member.employeeId || 0));
      return employee ? this.mergeMemberWithEmployeeRecord(member, employee) : member;
    });
  }

  private mergeMemberWithEmployeeRecord(member: CooperativeMember, employee: any): CooperativeMember {
    const firstName = String(employee?.firstName || employee?.firstname || '').trim();
    const lastName = String(employee?.lastName || employee?.lastname || '').trim();
    const fallbackName = String(employee?.fullName || employee?.fullname || employee?.name || '').trim();
    const fullName = `${firstName} ${lastName}`.trim() || fallbackName;

    return {
      ...member,
      fullName: this.getPreferredMemberName({ fullName }) || this.getPreferredMemberName(member) || member.fullName,
      email: String(employee?.workEmail || employee?.email || member.email || '').trim(),
      phone: String(employee?.phone || member.phone || '').trim(),
      address: String(employee?.address || member.address || '').trim(),
      employeeId: Number(member.employeeId || employee?.id || employee?.employeeId || 0) || member.employeeId,
      memberAccountNumber: String(employee?.accountNumber || ''),
      memberBankName: String(employee?.bankName || ''),
      firstName: String(employee?.firstName || ''),
      lastName: String(employee?.lastName || ''),
      updatedAt: new Date().toISOString()
    };
  }

  private buildMemberApiPayload(member: Partial<CooperativeMember>): CooperativeLoanApiMemberPayload {
    const existingRaw = this.memberApiRecords[String(member.id || '')];
    const employeeId = Number(member.employeeId || existingRaw?.employeeId);
    return {
      id: Number(member.id || existingRaw?.id),
      employeeId,
      monthlySalary: Number(member.monthlySalary || existingRaw?.monthlySalary || 0),
      status: this.normalizeMemberStatus(member.status || existingRaw?.status || 'ACTIVE'),
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
        changedBy: this.getCurrentAuditUserId() as any,
        notes,
        overrideOpen: false,
        overrideBy: undefined as any,
        overrideReason: '',
        statusBeforeOverride: ''
      },
      ...(loan.statusHistory || [])
    ];
  }

  private saveLoanWorkflowUpdate(
    loan: CooperativeLoan,
    previousStatus?: string | null,
    previousStage?: string | null
  ): Observable<CooperativeLoan> {
    return this.updateLoan(loan).pipe(
      switchMap((updatedLoan) => {
        if (!this.hasLoanStateChanged(updatedLoan, previousStatus, previousStage)) {
          return of(updatedLoan);
        }

        const memberId = Number(updatedLoan.memberId || updatedLoan.cooperativeMemberId || 0);
        const member = memberId ? this.getMemberById(memberId) : undefined;

        return this.loanStatusNotificationService
          .notifyCooperativeStatusChange(updatedLoan, member, previousStatus, previousStage)
          .pipe(map(() => updatedLoan));
      })
    );
  }

  private hasLoanStateChanged(
    loan: CooperativeLoan,
    previousStatus?: string | null,
    previousStage?: string | null
  ): boolean {
    return String(previousStatus || '') !== String(loan.status || '')
      || String(previousStage || '') !== String(loan.applicationStage || '');
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
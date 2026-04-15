import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../shared-component/service/environments/environment.prod';
import { CooperativeContributionEntry, CooperativeGroupMembership, CooperativeLoanGroup, CooperativeMember } from './cooperative.types';

export interface CooperativeGroupApiContributionHistory {
  id?: number;
  memberId?: number;
  amount?: number;
  date?: string;
}

export interface CooperativeGroupApiResponse {
  id: number;
  groupId?: number;
  code?: string;
  name?: string;
  minEligibleSalary?: number;
  monthlyAmount?: number;
  maxBorrowingPercentage?: number;
  minAmount?: number;
  maxAmount?: number;
  minDuration?: number;
  maxDuration?: number;
  minMemberTenureMonths?: number;
  requiresShares?: boolean;
  requiresGuarantors?: boolean;
  minimumGuarantors?: number;
  memberIds?: number[];
  memberLimit?: number;
  withdrawCap?: number;
  interestRate?: number;
  currentBalance?: number;
  contributionHistory?: CooperativeGroupApiContributionHistory[];
  loanHistory?: any[];
  status?: string;
  description?: string;
  patronageEligible?: boolean;
  patronageRate?: number;
  patronageAmount?: number;
  contributionsBankName?: string;
  contributionsAccount?: string;
  principalBankName?: string;
  principalCollectionAccount?: string;
  interestBankName?: string;
  interestCollectionAccount?: string;
  lateFeePercentage?: number;
  lateFeeGraceDays?: number;
  lateFeeBankName?: string;
  lateFeeCollectionAccount?: string;
  accountingEmail?: string;
  accountingWebhookUrl?: string;
}

export interface CooperativeGroupApiPayload {
  id?: number;
  groupId?: number;
  code?: string;
  name: string;
  minEligibleSalary?: number;
  monthlyAmount: number;
  maxBorrowingPercentage?: number;
  minAmount?: number;
  maxAmount?: number;
  minDuration?: number;
  maxDuration?: number;
  minMemberTenureMonths?: number;
  requiresShares?: boolean;
  requiresGuarantors?: boolean;
  minimumGuarantors?: number;
  memberIds?: number[];
  memberLimit?: number;
  withdrawCap: number;
  interestRate: number;
  currentBalance?: number;
  contributionHistory?: CooperativeGroupApiContributionHistory[];
  loanHistory?: any[];
  status?: string;
  description?: string;
  patronageEligible?: boolean;
  patronageRate?: number;
  patronageAmount?: number;
  contributionsBankName: string;
  contributionsAccount: string;
  principalBankName: string;
  principalCollectionAccount: string;
  interestBankName: string;
  interestCollectionAccount: string;
  lateFeePercentage?: number;
  lateFeeGraceDays?: number;
  lateFeeBankName: string;
  lateFeeCollectionAccount: string;
  accountingEmail?: string;
  accountingWebhookUrl?: string;
}

export interface CooperativeGroupContext {
  members: CooperativeMember[];
  groups: CooperativeLoanGroup[];
  groupMemberships: CooperativeGroupMembership[];
  contributionEntries: CooperativeContributionEntry[];
  saveToStorage: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class CooperativeGroupService {
    private readonly groupsUrl = `${this.getBaseApiUrl()}/x/api/v2/hr/cooperativeGroups`;

    constructor(private http: HttpClient) {}

    private getBaseApiUrl(): string {
      return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
    }

    private getAuthHeaders(): HttpHeaders {
      const token = sessionStorage.getItem('token') || sessionStorage.getItem('Token');
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': 'optimax',
        'Content-Type': 'application/json'
      });
    }

    getAllCooperativeGroups(): Observable<CooperativeGroupApiResponse[]> {
      console.log('[CooperativeGroupService] Fetching all groups from:', this.groupsUrl);
      const headers = this.getAuthHeaders();
      return this.http.get<CooperativeGroupApiResponse[]>(this.groupsUrl, { headers }).pipe(
        map((groups) => {
          console.log('[CooperativeGroupService] Groups received:', groups);
          console.log('[CooperativeGroupService] Number of groups:', groups?.length);
          return groups;
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('[CooperativeGroupService] Error fetching groups:', error);
          console.error('[CooperativeGroupService] Error status:', error.status);
          console.error('[CooperativeGroupService] Error message:', error.message);
          console.error('[CooperativeGroupService] Error URL:', this.groupsUrl);
          return of([]);
        })
      );
    }

    getCooperativeGroupById(id: number): Observable<CooperativeGroupApiResponse> {
      const url = `${this.groupsUrl}/${id}`;
      console.log(`[CooperativeGroupService] Fetching group by ID: ${id} from: ${url}`);
      const headers = this.getAuthHeaders();
      return this.http.get<CooperativeGroupApiResponse>(url, { headers }).pipe(
        map((group) => {
          console.log(`[CooperativeGroupService] Group received:`, group);
          return group;
        }),
        catchError((error: HttpErrorResponse) => {
          console.error(`[CooperativeGroupService] Error fetching group ${id}:`, error);
          return throwError(() => error);
        })
      );
    }

    createCooperativeGroup(payload: CooperativeGroupApiPayload): Observable<CooperativeGroupApiResponse> {
      console.log('[CooperativeGroupService] Creating group with payload:', payload);
      console.log('[CooperativeGroupService] POST URL:', this.groupsUrl);
      const headers = this.getAuthHeaders();
      return this.http.post<CooperativeGroupApiResponse>(this.groupsUrl, payload, { headers }).pipe(
        map((group) => {
          console.log('[CooperativeGroupService] Group created successfully:', group);
          return group;
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('[CooperativeGroupService] Error creating group:', error);
          console.error('[CooperativeGroupService] Error status:', error.status);
          console.error('[CooperativeGroupService] Error message:', error.message);
          console.error('[CooperativeGroupService] Request URL:', this.groupsUrl);
          console.error('[CooperativeGroupService] Request payload:', payload);
          return throwError(() => error);
        })
      );
    }

    updateCooperativeGroup(id: number, payload: CooperativeGroupApiPayload): Observable<CooperativeGroupApiResponse> {
      console.log(`[CooperativeGroupService] Updating group ${id} with payload:`, payload);
      const headers = this.getAuthHeaders();
      return this.http.put<CooperativeGroupApiResponse>(`${this.groupsUrl}/${id}`, payload, { headers }).pipe(
        map((group) => {
          console.log(`[CooperativeGroupService] Group ${id} updated successfully:`, group);
          return group;
        }),
        catchError((error: HttpErrorResponse) => {
          console.error(`[CooperativeGroupService] Error updating group ${id}:`, error);
          return throwError(() => error);
        })
      );
    }

  getEligibleGroupsForMember(
    context: CooperativeGroupContext,
    memberId: number,
    monthlySalary = 0
  ): CooperativeLoanGroup[] {
    const member = context.members.find(item => item.id === memberId);
    if (!member) {
      return [];
    }

    const tenureMonths = this.calculateTenureMonths(member.joinDate);
    return context.groups
      .filter(item => item.status === 'ACTIVE')
      .filter(item => tenureMonths >= (item.minMemberTenureMonths || 0))
      .filter(item => monthlySalary >= Number(item.minEligibleSalary || 0))
      .map(item => ({ ...item }));
  }

  getGroupMembershipsByMember(context: CooperativeGroupContext, memberId: number): CooperativeGroupMembership[] {
    return context.groupMemberships
      .filter(item => item.memberId === memberId)
      .map(item => ({ ...item }));
  }

  getGroupMemberships(context: CooperativeGroupContext): CooperativeGroupMembership[] {
    return context.groupMemberships.map(item => ({ ...item }));
  }

  getContributionEntriesByGroup(context: CooperativeGroupContext, groupId: number): CooperativeContributionEntry[] {
    return context.contributionEntries
      .filter(item => item.groupId === groupId)
      .map(item => ({ ...item }));
  }

  getGroupMembership(
    context: CooperativeGroupContext,
    memberId: number,
    groupId: number
  ): CooperativeGroupMembership | undefined {
    return context.groupMemberships.find(item => item.memberId === memberId && item.groupId === groupId);
  }

  applyForGroupMembership(
    context: CooperativeGroupContext,
    memberId: number,
    groupId: number
  ): CooperativeGroupMembership {
    const now = new Date().toISOString();
    const existing = this.getGroupMembership(context, memberId, groupId);
    if (existing) {
      if (existing.status === 'REJECTED') {
        existing.status = 'PENDING';
        existing.requestedAt = now;
        existing.reviewedAt = undefined;
        existing.reviewNote = undefined;
        existing.rejectionReason = undefined;
        context.saveToStorage();
      }
      return { ...existing };
    }

    const group = this.getGroupById(context, groupId);
    const membership: CooperativeGroupMembership = {
      id: Date.now(),
      memberId,
      groupId: groupId,
      status: 'PENDING',
      monthlyContributionAmount: Number(group?.monthlyContributionAmount || 0),
      totalContribution: 0,
      joinedAt: '',
      requestedAt: now
    };

    context.groupMemberships.push(membership);
    context.saveToStorage();
    return { ...membership };
  }

  approveGroupMembership(
    context: CooperativeGroupContext,
    membershipId: number,
    note?: string
  ): CooperativeGroupMembership | undefined {
    const membership = context.groupMemberships.find(item => item.id === membershipId);
    if (!membership) {
      return undefined;
    }

    membership.status = 'ACTIVE';
    membership.joinedAt = new Date().toISOString();
    membership.reviewedAt = membership.joinedAt;
    membership.reviewNote = String(note || '').trim() || undefined;
    membership.rejectionReason = undefined;
    context.saveToStorage();
    return { ...membership };
  }

  recordContribution(
    context: CooperativeGroupContext,
    membershipId: number,
    payload: { amount: number; contributionMonth: string; contributedAt?: string }
  ): CooperativeContributionEntry | undefined {
    const membership = context.groupMemberships.find(item => item.id === membershipId && item.status === 'ACTIVE');
    if (!membership) {
      return undefined;
    }

    const amount = Number(payload.amount || 0);
    const contributionMonth = String(payload.contributionMonth || '').trim();
    if (amount <= 0 || !/^\d{4}-\d{2}$/.test(contributionMonth)) {
      return undefined;
    }

    const hasExistingEntry = context.contributionEntries.some(item => item.membershipId === membershipId && item.contributionMonth === contributionMonth);
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

    context.contributionEntries.push(entry);
    membership.totalContribution = Number((Number(membership.totalContribution || 0) + amount).toFixed(2));
    membership.lastContributionDate = contributedAt;
    context.saveToStorage();

    return { ...entry };
  }

  rejectGroupMembership(
    context: CooperativeGroupContext,
    membershipId: number,
    reason?: string
  ): CooperativeGroupMembership | undefined {
    const membership = context.groupMemberships.find(item => item.id === membershipId);
    if (!membership) {
      return undefined;
    }

    membership.status = 'REJECTED';
    membership.reviewedAt = new Date().toISOString();
    membership.reviewNote = String(reason || '').trim() || undefined;
    membership.rejectionReason = String(reason || '').trim() || undefined;
    context.saveToStorage();
    return { ...membership };
  }

  getMaxBorrowableAmountForGroup(context: CooperativeGroupContext, memberId: number, groupId: number): number {
    const group = this.getGroupById(context, groupId);
    const membership = this.getGroupMembership(context, memberId, groupId);

    if (!group || !membership || membership.status !== 'ACTIVE') {
      return 0;
    }

    return Number(((membership.totalContribution || 0) * (Number(group.maxBorrowingPercentage || 0) / 100)).toFixed(2));
  }

  getMemberTenureMonths(context: CooperativeGroupContext, memberId: number): number {
    const member = context.members.find(item => item.id === memberId);
    if (!member) {
      return 0;
    }

    return this.calculateTenureMonths(member.joinDate);
  }

  getGroups(context: CooperativeGroupContext): CooperativeLoanGroup[] {
    return [...context.groups];
  }

  getGroupById(context: CooperativeGroupContext, id: number): CooperativeLoanGroup | undefined {
    return context.groups.find(p => p.id === id);
  }

  addGroup(context: CooperativeGroupContext, group: Omit<CooperativeLoanGroup, 'id'>): CooperativeLoanGroup {
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

    context.groups.push(newGroup);
    context.saveToStorage();
    return { ...newGroup };
  }

  updateGroup(context: CooperativeGroupContext, group: CooperativeLoanGroup): CooperativeLoanGroup {
    const index = context.groups.findIndex(p => p.id === group.id);
    if (index !== -1) {
      context.groups[index] = {
        ...group,
        minEligibleSalary: Number(group.minEligibleSalary || 0),
        monthlyContributionAmount: Number(group.monthlyContributionAmount || 0),
        maxBorrowingPercentage: Number(group.maxBorrowingPercentage || 0),
        minMemberTenureMonths: Number(group.minMemberTenureMonths || 0),
        requiresGuarantors: Boolean(group.requiresGuarantors),
        minimumGuarantors: Number(group.minimumGuarantors || 0),
        quickDisbursement: Boolean(group.quickDisbursement),
        patronageRate: group.patronageEligible ? group.patronageRate : 0
      };
      context.saveToStorage();
    }
    return { ...group };
  }

  setGroupStatus(context: CooperativeGroupContext, id: number, status: 'ACTIVE' | 'INACTIVE'): void {
    const group = context.groups.find(p => p.id === id);
    if (!group) {
      return;
    }

    group.status = status;
    context.saveToStorage();
  }

  private calculateTenureMonths(employmentStartDate: string): number {
    const start = new Date(employmentStartDate);
    if (Number.isNaN(start.getTime())) {
      return 0;
    }

    const now = new Date();
    let months = (now.getFullYear() - start.getFullYear()) * 12;
    months += now.getMonth() - start.getMonth();

    if (now.getDate() < start.getDate()) {
      months -= 1;
    }

    return Math.max(months, 0);
  }
}
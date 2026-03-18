import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CooperativeContributionEntry, CooperativeGroupMembership, CooperativeLoanGroup, CooperativeMember } from './cooperative.types';

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
    private groupUrl = 'https://be.optimaxsuites.com/x/api/v2/hr/cooperativeGroups';

    constructor(private http: HttpClient) {}

    createCooperativeGroup(payload: any): Observable<any> {
      return this.http.post(this.groupUrl, payload);
    }
  getEligibleGroupsForMember(
    context: CooperativeGroupContext,
    memberId: string,
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
      .filter(item => !item.requiresShares || member.shareCapital > 0)
      .map(item => ({ ...item }));
  }

  getGroupMembershipsByMember(context: CooperativeGroupContext, memberId: string): CooperativeGroupMembership[] {
    return context.groupMemberships
      .filter(item => item.memberId === memberId)
      .map(item => ({ ...item }));
  }

  getGroupMemberships(context: CooperativeGroupContext): CooperativeGroupMembership[] {
    return context.groupMemberships.map(item => ({ ...item }));
  }

  getContributionEntriesByGroup(context: CooperativeGroupContext, groupId: string): CooperativeContributionEntry[] {
    return context.contributionEntries
      .filter(item => item.groupId === groupId)
      .map(item => ({ ...item }));
  }

  getGroupMembership(
    context: CooperativeGroupContext,
    memberId: string,
    groupId: string
  ): CooperativeGroupMembership | undefined {
    return context.groupMemberships.find(item => item.memberId === memberId && item.groupId === groupId);
  }

  applyForGroupMembership(
    context: CooperativeGroupContext,
    memberId: string,
    groupId: string
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
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    membershipId: string,
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
    membershipId: string,
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
      id: `${membershipId}-${contributionMonth}`,
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
    membershipId: string,
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

  getMaxBorrowableAmountForGroup(context: CooperativeGroupContext, memberId: string, groupId: string): number {
    const group = this.getGroupById(context, groupId);
    const membership = this.getGroupMembership(context, memberId, groupId);

    if (!group || !membership || membership.status !== 'ACTIVE') {
      return 0;
    }

    return Number(((membership.totalContribution || 0) * (Number(group.maxBorrowingPercentage || 0) / 100)).toFixed(2));
  }

  getMemberTenureMonths(context: CooperativeGroupContext, memberId: string): number {
    const member = context.members.find(item => item.id === memberId);
    if (!member) {
      return 0;
    }

    return this.calculateTenureMonths(member.joinDate);
  }

  getGroups(context: CooperativeGroupContext): CooperativeLoanGroup[] {
    return [...context.groups];
  }


  getGroupById(context: CooperativeGroupContext, id: string): CooperativeLoanGroup | undefined {
    return context.groups.find(p => p.id === id);
  }


  addGroup(context: CooperativeGroupContext, group: Omit<CooperativeLoanGroup, 'id'>): CooperativeLoanGroup {
    const newGroup: CooperativeLoanGroup = {
      ...group,
      id: Date.now().toString(),
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


  setGroupStatus(context: CooperativeGroupContext, id: string, status: 'ACTIVE' | 'INACTIVE'): void {
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

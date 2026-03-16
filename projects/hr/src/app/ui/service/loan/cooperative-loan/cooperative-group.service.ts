import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CooperativeGroupMembership, CooperativeLoanGroup, CooperativeMember } from './cooperative.types';

export interface CooperativeGroupContext {
  members: CooperativeMember[];
  groups: CooperativeLoanGroup[];
  groupMemberships: CooperativeGroupMembership[];
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
    const existing = this.getGroupMembership(context, memberId, groupId);
    if (existing) {
      return { ...existing };
    }

    const group = this.getGroupById(context, groupId);
    const membership: CooperativeGroupMembership = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      memberId,
      groupId: groupId,
      status: 'ACTIVE',
      monthlyContributionAmount: Number(group?.monthlyContributionAmount || 0),
      totalContribution: 0,
      joinedAt: new Date().toISOString()
    };

    context.groupMemberships.push(membership);
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

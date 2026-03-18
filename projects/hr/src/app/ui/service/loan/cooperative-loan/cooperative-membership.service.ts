import { Injectable } from '@angular/core';
import {
  CooperativeNotification,
  CooperativeEmployeeProfile,
  CooperativeMember,
  CooperativeMembershipActionResult,
  CooperativeMembershipApplication,
  CooperativeMembershipEligibility,
  CooperativeMembershipTierPolicy,
  CooperativeStaffRank
} from './cooperative.types';

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

export interface CooperativeMembershipContext {
  members: CooperativeMember[];
  pendingMembershipApplications: PendingMembershipApplication[];
  notifications: CooperativeNotification[];
  saveToStorage: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class CooperativeMembershipService {
  checkMembershipEligibility(employee: CooperativeEmployeeProfile): CooperativeMembershipEligibility {
    const tenureMonths = this.calculateTenureMonths(employee.employmentStartDate);
    const probationCompleted = this.isProbationCompleted(employee);
    const policy = this.getTierPolicy(employee.rank);

    if (employee.employmentType === 'CONTRACT' || employee.employmentType === 'INTERN') {
      return {
        canApply: false,
        canBeInvited: false,
        requiresInvite: false,
        requiresManagerApproval: false,
        autoApprove: false,
        isOnHold: false,
        isBlocked: true,
        rank: employee.rank,
        tenureMonths,
        probationCompleted,
        policy,
        message: 'Contract and intern staff cannot join the cooperative, and managers cannot invite them.'
      };
    }

    if (employee.hasActiveDisciplinaryIssue) {
      return {
        canApply: false,
        canBeInvited: false,
        requiresInvite: false,
        requiresManagerApproval: false,
        autoApprove: false,
        isOnHold: false,
        isBlocked: true,
        rank: employee.rank,
        tenureMonths,
        probationCompleted,
        policy,
        message: 'Membership is blocked due to active disciplinary issues.'
      };
    }

    if (tenureMonths < 12 || !probationCompleted) {
      return {
        canApply: false,
        canBeInvited: false,
        requiresInvite: false,
        requiresManagerApproval: false,
        autoApprove: false,
        isOnHold: true,
        isBlocked: false,
        rank: employee.rank,
        tenureMonths,
        probationCompleted,
        policy,
        message: 'Membership is on hold until at least 1 year in service and probation completion.'
      };
    }

    if (employee.rank === 'JUNIOR') {
      return {
        canApply: false,
        canBeInvited: true,
        requiresInvite: true,
        requiresManagerApproval: false,
        autoApprove: false,
        isOnHold: false,
        isBlocked: false,
        rank: employee.rank,
        tenureMonths,
        probationCompleted,
        policy,
        message: 'Junior staff can only join through admin invitation.'
      };
    }

    if (employee.rank === 'MID') {
      return {
        canApply: true,
        canBeInvited: false,
        requiresInvite: false,
        requiresManagerApproval: true,
        autoApprove: false,
        isOnHold: false,
        isBlocked: false,
        rank: employee.rank,
        tenureMonths,
        probationCompleted,
        policy,
        message: 'Mid-level staff can self-apply and require manager approval.'
      };
    }

    return {
      canApply: true,
      canBeInvited: false,
      requiresInvite: false,
      requiresManagerApproval: false,
      autoApprove: true,
      isOnHold: false,
      isBlocked: false,
      rank: employee.rank,
      tenureMonths,
      probationCompleted,
      policy,
      message: 'Senior management and executives are automatically eligible members.'
    };
  }

  applyForMembership(
    context: CooperativeMembershipContext,
    application: CooperativeMembershipApplication
  ): CooperativeMembershipActionResult {
    const eligibility = this.checkMembershipEligibility(application.employee);

    if (application.source === 'ADMIN_INVITE') {
      return this.inviteEmployee(context, application.employee);
    }

    if (!eligibility.canApply) {
      return {
        success: false,
        status: eligibility.isOnHold ? 'ON_HOLD' : eligibility.requiresInvite ? 'INVITE_REQUIRED' : 'REJECTED',
        message: eligibility.message,
        eligibility
      };
    }

    if (eligibility.autoApprove) {
      const member = this.createOrUpdateMemberFromEmployee(context, application.employee, eligibility.policy.minShares);
      return {
        success: true,
        status: 'AUTO_APPROVED',
        message: 'Membership approved automatically based on rank policy.',
        eligibility,
        member
      };
    }

    const existingPending = context.pendingMembershipApplications.find(
      item => item.employeeId === application.employee.employeeId && item.status === 'PENDING_MANAGER_APPROVAL'
    );

    if (!existingPending) {
      const pendingItem: PendingMembershipApplication = {
        id: `MPA-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        employeeId: application.employee.employeeId,
        fullName: application.employee.fullName,
        requestedTier: application.requestedTier || eligibility.policy.tier,
        source: application.source,
        requestDate: new Date().toISOString(),
        note: application.note,
        status: 'PENDING_MANAGER_APPROVAL'
      };

      context.pendingMembershipApplications.unshift(pendingItem);
      context.notifications.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'LOAN_STATUS_UPDATE',
        recipient: 'ADMIN',
        title: 'Membership Approval Pending',
        message: `${pendingItem.fullName} (${pendingItem.employeeId}) submitted a cooperative membership request and is pending manager approval.`,
        loanId: '',
        memberId: pendingItem.employeeId,
        createdAt: new Date().toISOString(),
        read: false
      });
      context.saveToStorage();
    }

    return {
      success: true,
      status: 'PENDING_MANAGER_APPROVAL',
      message: 'Membership application submitted and pending manager approval.',
      eligibility
    };
  }

  inviteEmployee(
    context: CooperativeMembershipContext,
    employee: CooperativeEmployeeProfile
  ): CooperativeMembershipActionResult {
    const eligibility = this.checkMembershipEligibility(employee);

    if (employee.employmentType === 'CONTRACT' || employee.employmentType === 'INTERN') {
      return {
        success: false,
        status: 'REJECTED',
        message: 'Managers are not allowed to invite contract or intern staff into cooperative membership.',
        eligibility
      };
    }

    if (eligibility.isOnHold) {
      return {
        success: false,
        status: 'ON_HOLD',
        message: eligibility.message,
        eligibility
      };
    }

    if (!eligibility.canBeInvited) {
      return {
        success: false,
        status: 'REJECTED',
        message: 'This employee rank is not invite-based. Use the standard application flow.',
        eligibility
      };
    }

    const activationPath = '/member/cooperative/dashboard';
    context.notifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'LOAN_STATUS_UPDATE',
      recipient: 'MEMBER',
      title: 'Congratulations! You Are Invited',
      message: `Congratulations ${employee.fullName}! You are eligible for cooperative membership. Activate your membership here: ${activationPath}`,
      loanId: '',
      memberId: employee.employeeId,
      createdAt: new Date().toISOString(),
      read: false
    });
    context.saveToStorage();

    return {
      success: true,
      status: 'PENDING_MANAGER_APPROVAL',
      message: 'Invitation sent. Membership will proceed through manager/admin confirmation workflow.',
      eligibility
    };
  }

  getPendingMembershipApplications(context: CooperativeMembershipContext): Array<PendingMembershipApplication> {
    return context.pendingMembershipApplications.map(item => ({ ...item }));
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

  private isProbationCompleted(employee: CooperativeEmployeeProfile): boolean {
    if (employee.onProbation) {
      return false;
    }

    if (!employee.probationEndDate) {
      return true;
    }

    const probationEnd = new Date(employee.probationEndDate);
    if (Number.isNaN(probationEnd.getTime())) {
      return false;
    }

    return probationEnd.getTime() <= Date.now();
  }

  private getTierPolicy(rank: CooperativeStaffRank): CooperativeMembershipTierPolicy {
    switch (rank) {
      case 'EXEC':
        return {
          tier: 'EXECUTIVE',
          maxLoan: 3000000,
          minShares: 150000,
          votingRights: 'FULL'
        };
      case 'SENIOR':
        return {
          tier: 'GOLD',
          maxLoan: 2000000,
          minShares: 100000,
          votingRights: 'FULL'
        };
      case 'MID':
        return {
          tier: 'STANDARD',
          maxLoan: 1000000,
          minShares: 50000,
          votingRights: 'LIMITED'
        };
      default:
        return {
          tier: 'STANDARD',
          maxLoan: 500000,
          minShares: 25000,
          votingRights: 'LIMITED'
        };
    }
  }

  private createOrUpdateMemberFromEmployee(
    context: CooperativeMembershipContext,
    employee: CooperativeEmployeeProfile,
    minShares: number
  ): CooperativeMember {
    const existing = context.members.find(member =>
      member.email.toLowerCase() === employee.email.toLowerCase() || member.id === employee.employeeId
    );

    if (existing) {
      existing.fullName = employee.fullName;
      existing.phone = employee.phone || existing.phone;
      existing.address = employee.department || existing.address;
      existing.status = 'ACTIVE';
      existing.shareCapital = Math.max(existing.shareCapital, minShares);
      existing.updatedAt = new Date().toISOString();
      context.saveToStorage();
      return { ...existing };
    }

    const newMember: CooperativeMember = {
      id: employee.employeeId,
      memberId: `COP-${String(context.members.length + 1).padStart(3, '0')}`,
      fullName: employee.fullName,
      email: employee.email,
      phone: employee.phone || '',
      joinDate: new Date().toISOString(),
      status: 'ACTIVE',
      shareCapital: minShares,
      address: employee.department,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    context.members.push(newMember);
    context.saveToStorage();
    return { ...newMember };
  }
}

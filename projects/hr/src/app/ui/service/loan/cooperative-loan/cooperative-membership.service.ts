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

export interface PendingMembershipApplication {
  id: number;
  employeeId: number;
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
    const policy = this.getTierPolicy(employee.rank);
    // Only block contract/intern or those with active disciplinary issues
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
        tenureMonths: 0,
        probationCompleted: true,
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
        tenureMonths: 0,
        probationCompleted: true,
        policy,
        message: 'Membership is blocked due to active disciplinary issues.'
      };
    }
    // Allow all other employees to apply, but require admin approval
    return {
      canApply: true,
      canBeInvited: false,
      requiresInvite: false,
      requiresManagerApproval: true,
      autoApprove: false,
      isOnHold: false,
      isBlocked: false,
      rank: employee.rank,
      tenureMonths: 0,
      probationCompleted: true,
      policy,
      message: 'All employees are eligible to apply for cooperative membership. Admin approval is required.'
    };
  }

  applyForMembership(
    context: CooperativeMembershipContext,
    application: CooperativeMembershipApplication,
    apiService: any // CooperativeLoanApiService
  ): Promise<CooperativeMembershipActionResult> {
    const eligibility = this.checkMembershipEligibility(application.employee);

    if (application.source === 'ADMIN_INVITE') {
      return Promise.resolve(this.inviteEmployee(context, application.employee));
    }

    if (!eligibility.canApply) {
      return Promise.resolve({
        success: false,
        status: eligibility.isOnHold ? 'ON_HOLD' : eligibility.requiresInvite ? 'INVITE_REQUIRED' : 'REJECTED',
        message: eligibility.message,
        eligibility
      });
    }

    if (eligibility.autoApprove) {
      // Directly create member in backend
      return apiService.createMember({
        employeeId: application.employee.employeeId,
        fullName: application.employee.fullName,
        email: application.employee.email,
        phone: application.employee.phone,
        shareCapital: eligibility.policy.minShares,
        address: application.employee.department,
        status: 'ACTIVE'
      }).toPromise().then((createdMember: any) => ({
        success: true,
        status: 'AUTO_APPROVED',
        message: 'Membership approved automatically based on rank policy.',
        eligibility,
        member: createdMember
      }));
    }

    // Simulate pending application (should be sent to backend in real app)
    // Here, just return pending status
    return Promise.resolve({
      success: true,
      status: 'PENDING_MANAGER_APPROVAL',
      message: 'Membership application submitted and pending manager approval.',
      eligibility
    });
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
      id: Date.now(),
      type: 'LOAN_STATUS_UPDATE',
      recipient: 'MEMBER',
      title: 'Congratulations! You Are Invited',
      message: `Congratulations ${employee.fullName}! You are eligible for cooperative membership. Activate your membership here: ${activationPath}`,
      loanId: 0,
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
      employeeId: employee.employeeId,
      memberId: employee.employeeId,
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

  approvePendingMembershipApplication(context: CooperativeMembershipContext, applicationId: number, apiService: any): Promise<CooperativeMembershipActionResult> {
    // In a real app, fetch application from backend, here just simulate
    const application = context.pendingMembershipApplications.find(app => app.id === applicationId && app.status === 'PENDING_MANAGER_APPROVAL');
    if (!application) {
      return Promise.resolve({
        success: false,
        status: 'REJECTED',
        message: 'Application not found or already processed.',
        eligibility: undefined as any
      });
    }
    // Create member in backend
    return apiService.createMember({
      employeeId: application.employeeId,
      fullName: application.fullName,
      email: '',
      phone: '',
      shareCapital: 25000, // Use default or fetch from eligibility
      address: '',
      status: 'ACTIVE'
    }).toPromise().then((createdMember: any) => ({
      success: true,
      status: 'AUTO_APPROVED',
      message: 'Membership approved and member activated.',
      eligibility: undefined,
      member: createdMember
    }));
  }

  rejectPendingMembershipApplication(context: CooperativeMembershipContext, applicationId: number, apiService: any): Promise<CooperativeMembershipActionResult> {
    // In a real app, update application status in backend
    const application = context.pendingMembershipApplications.find(app => app.id === applicationId && app.status === 'PENDING_MANAGER_APPROVAL');
    if (!application) {
      return Promise.resolve({
        success: false,
        status: 'REJECTED',
        message: 'Application not found or already processed.',
        eligibility: undefined as any
      });
    }
    // Simulate rejection (should call backend API)
    return Promise.resolve({
      success: true,
      status: 'REJECTED',
      message: 'Membership application rejected.',
      eligibility: undefined as any
    });
  }
}

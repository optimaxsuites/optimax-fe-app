import { Injectable } from '@angular/core';
import { EmployeeService } from '../../../service/employee.service';
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
import { firstValueFrom } from 'rxjs';
import { CooperativeLoanApiService } from './cooperative-loan-api.service'; // Import your actual API service

export interface PendingMembershipApplication {
  id: number;
  employeeId: number;
  fullName: string;
  requestedTier: string;
  source: 'SELF' | 'ADMIN_INVITE';
  requestDate: string;
  note?: string;
  status: 'PENDING_MANAGER_APPROVAL';
  reviewedAt?: string;
  rejectionReason?: string;
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
  constructor(
    private employeeService: EmployeeService,
    private apiService: CooperativeLoanApiService // Inject the actual API service
  ) {}

  private async getEmployeeIdFromUserId(userId: number): Promise<number> {
    try {
      const employee = await firstValueFrom(this.employeeService.getEmployeeByUserId(userId));
      if (!employee || !employee.id) {
        console.error(`Employee not found for user ID ${userId}`);
        throw new Error(`Employee not found for user ID ${userId}`);
      }
      return employee.id;
    } catch (error) {
      console.error(`Failed to find employee for user ID ${userId}:`, error);
      throw error;
    }
  }

  private async getFullMemberDetails(memberId: number): Promise<any> {
    try {
      const member = await firstValueFrom(this.apiService.getMemberById(memberId));
      return member;
    } catch (error) {
      console.error('Error fetching full member details:', error);
      throw error;
    }
  }

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
    // Allow all other employees to apply, and auto-approve membership
    return {
      canApply: true,
      canBeInvited: false,
      requiresInvite: false,
      requiresManagerApproval: false,
      autoApprove: true,
      isOnHold: false,
      isBlocked: false,
      rank: employee.rank,
      tenureMonths: 0,
      probationCompleted: true,
      policy,
      message: 'All employees are eligible to apply for cooperative membership. Membership will be activated instantly.'
    };
  }

  async applyForMembership(
    context: CooperativeMembershipContext,
    application: CooperativeMembershipApplication
  ): Promise<CooperativeMembershipActionResult> {
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

    // Check if employee already has a pending application
    const existingPending = context.pendingMembershipApplications.find(
      app => app.employeeId === application.employee.employeeId && app.status === 'PENDING_MANAGER_APPROVAL'
    );
    if (existingPending) {
      return {
        success: false,
        status: 'PENDING_MANAGER_APPROVAL',
        message: 'You already have a pending membership application. Please wait for admin approval.',
        eligibility
      };
    }

    // Check if employee is already a member
    const existingMember = context.members.find(
      member => member.employeeId === application.employee.employeeId || member.email === application.employee.email
    );
    if (existingMember && existingMember.status === 'ACTIVE') {
      return {
        success: false,
        status: 'ALREADY_MEMBER',
        message: 'You are already an active cooperative member.',
        eligibility,
        member: existingMember
      };
    }

    // Always auto-approve: Directly create member in backend
    try {
      // Get the correct employee ID dynamically
      const employeeId = await this.getEmployeeIdFromUserId(application.employee.employeeId);
      
      // Create member using the API service (returns Observable)
      const createdMember = await firstValueFrom(this.apiService.createMember({
        employeeId: employeeId,
        fullName: application.employee.fullName,
        email: application.employee.email,
        phone: application.employee.phone || '',
        shareCapital: eligibility.policy.minShares,
        address: application.employee.department || '',
        status: 'ACTIVE'
      }));
      
      // Fetch full member details
      let fullMember: any;
      try {
        fullMember = await this.getFullMemberDetails(createdMember.id);
      } catch (error) {
        console.warn('Could not fetch full member details, using partial data:', error);
        // Fallback to using the created member data and application data
        fullMember = {
          id: createdMember.id,
          employeeId: createdMember.employeeId,
          status: createdMember.status,
          fullName: application.employee.fullName,
          email: application.employee.email,
          phone: application.employee.phone || '',
          shareCapital: eligibility.policy.minShares,
          address: application.employee.department || '',
          joinDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      // Add to local context
      const newMember: CooperativeMember = {
        id: fullMember.id,
        employeeId: application.employee.employeeId,
        memberId: fullMember.id,
        fullName: fullMember.fullName || application.employee.fullName,
        email: fullMember.email || application.employee.email,
        phone: fullMember.phone || application.employee.phone || '',
        joinDate: fullMember.joinDate || new Date().toISOString(),
        status: (fullMember.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') || 'ACTIVE',
        shareCapital: fullMember.shareCapital || eligibility.policy.minShares,
        address: fullMember.address || application.employee.department || '',
        createdAt: fullMember.createdAt || new Date().toISOString(),
        updatedAt: fullMember.updatedAt || new Date().toISOString()
      };
      context.members.push(newMember);
      context.saveToStorage();
      
      return {
        success: true,
        status: 'AUTO_APPROVED',
        message: 'Membership activated instantly.',
        eligibility,
        member: newMember
      };
    } catch (error) {
      console.error('Error creating member:', error);
      return {
        success: false,
        status: 'REJECTED',
        message: 'Failed to create member. Please try again.',
        eligibility
      };
    }
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

    // Check if employee already has a pending application
    const existingPending = context.pendingMembershipApplications.find(
      app => app.employeeId === employee.employeeId && app.status === 'PENDING_MANAGER_APPROVAL'
    );
    
    if (!existingPending) {
      // Create pending application for invited employee
      const newApplication: PendingMembershipApplication = {
        id: Date.now(),
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        requestedTier: eligibility.policy.tier,
        source: 'ADMIN_INVITE',
        requestDate: new Date().toISOString(),
        status: 'PENDING_MANAGER_APPROVAL'
      };
      context.pendingMembershipApplications.push(newApplication);
      context.saveToStorage();
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

  async approvePendingMembershipApplication(
    context: CooperativeMembershipContext, 
    applicationId: number,
    note?: string
  ): Promise<CooperativeMembershipActionResult> {
    const application = context.pendingMembershipApplications.find(
      app => app.id === applicationId && app.status === 'PENDING_MANAGER_APPROVAL'
    );
    
    if (!application) {
      return {
        success: false,
        status: 'REJECTED',
        message: 'Application not found or already processed.',
        eligibility: this.getEmptyEligibility()
      };
    }

    try {
      // Get the correct employee ID dynamically
      const employeeId = await this.getEmployeeIdFromUserId(application.employeeId);
      
      // Create member using the API service (returns Observable)
      const createdMember = await firstValueFrom(this.apiService.createMember({
        employeeId: employeeId,
        fullName: application.fullName,
        email: '',
        phone: '',
        shareCapital: 25000,
        address: '',
        status: 'ACTIVE'
      }));

      // Fetch full member details
      let fullMember: any;
      try {
        fullMember = await this.getFullMemberDetails(createdMember.id);
      } catch (error) {
        console.warn('Could not fetch full member details, using partial data:', error);
        // Fallback to using the created member data
        fullMember = {
          id: createdMember.id,
          employeeId: createdMember.employeeId,
          status: createdMember.status,
          fullName: application.fullName,
          email: '',
          phone: '',
          shareCapital: 25000,
          address: '',
          joinDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      // Remove from pending applications
      const index = context.pendingMembershipApplications.findIndex(app => app.id === applicationId);
      if (index !== -1) {
        context.pendingMembershipApplications.splice(index, 1);
      }

      // Add to members list
      const newMember: CooperativeMember = {
        id: fullMember.id,
        employeeId: application.employeeId,
        memberId: fullMember.id,
        fullName: fullMember.fullName || application.fullName,
        email: fullMember.email || '',
        phone: fullMember.phone || '',
        joinDate: fullMember.joinDate || new Date().toISOString(),
        status: (fullMember.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') || 'ACTIVE',
        shareCapital: fullMember.shareCapital || 25000,
        address: fullMember.address || '',
        createdAt: fullMember.createdAt || new Date().toISOString(),
        updatedAt: fullMember.updatedAt || new Date().toISOString()
      };
      context.members.push(newMember);

      // Create notification for the applicant
      const notification: CooperativeNotification = {
        id: Date.now(),
        type: 'LOAN_STATUS_UPDATE',
        recipient: 'MEMBER',
        title: 'Membership Application Approved',
        message: `Your cooperative membership application has been approved${note ? `: ${note}` : '.'} You are now an active member.`,
        loanId: 0,
        memberId: application.employeeId,
        createdAt: new Date().toISOString(),
        read: false
      };
      context.notifications.push(notification);
      
      context.saveToStorage();

      return {
        success: true,
        status: 'APPROVED',
        message: `Membership approved${note ? `: ${note}` : ''} and member activated.`,
        eligibility: this.getEmptyEligibility(),
        member: newMember
      };
    } catch (error) {
      console.error('Error creating member during approval:', error);
      return {
        success: false,
        status: 'REJECTED',
        message: 'Failed to approve membership. Please try again.',
        eligibility: this.getEmptyEligibility()
      };
    }
  }

  async rejectPendingMembershipApplication(
    context: CooperativeMembershipContext, 
    applicationId: number,
    reason?: string
  ): Promise<CooperativeMembershipActionResult> {
    const application = context.pendingMembershipApplications.find(
      app => app.id === applicationId && app.status === 'PENDING_MANAGER_APPROVAL'
    );
    
    if (!application) {
      return {
        success: false,
        status: 'REJECTED',
        message: 'Application not found or already processed.',
        eligibility: this.getEmptyEligibility()
      };
    }

    // Remove from pending applications list
    const index = context.pendingMembershipApplications.findIndex(app => app.id === applicationId);
    if (index !== -1) {
      context.pendingMembershipApplications.splice(index, 1);
    }

    // Create notification for the applicant
    const notification: CooperativeNotification = {
      id: Date.now(),
      type: 'LOAN_STATUS_UPDATE',
      recipient: 'MEMBER',
      title: 'Membership Application Rejected',
      message: `Your cooperative membership application has been rejected${reason ? `: ${reason}` : '.'}`,
      loanId: 0,
      memberId: application.employeeId,
      createdAt: new Date().toISOString(),
      read: false
    };
    context.notifications.push(notification);
    context.saveToStorage();

    return {
      success: true,
      status: 'REJECTED',
      message: `Membership application rejected${reason ? `: ${reason}` : ''}`,
      eligibility: this.getEmptyEligibility()
    };
  }

  private getEmptyEligibility(): CooperativeMembershipEligibility {
    return {
      canApply: false,
      canBeInvited: false,
      requiresInvite: false,
      requiresManagerApproval: false,
      autoApprove: false,
      isOnHold: false,
      isBlocked: false,
      rank: 'JUNIOR',
      tenureMonths: 0,
      probationCompleted: true,
      policy: {
        tier: 'STANDARD',
        maxLoan: 500000,
        minShares: 25000,
        votingRights: 'LIMITED'
      },
      message: ''
    };
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

    // Do not set memberId to employeeId; let backend generate memberId
    const newMember: CooperativeMember = {
      id: 0, // Placeholder until backend assigns real id
      employeeId: employee.employeeId,
      memberId: 0, // Placeholder until backend assigns real memberId
      fullName: employee.fullName,
      email: employee.email,
      phone: employee.phone || '',
      joinDate: new Date().toISOString(),
      status: 'ACTIVE',
      shareCapital: minShares,
      address: employee.department || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    context.members.push(newMember);
    context.saveToStorage();
    return { ...newMember };
  }
}
import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { 
  CooperativeMember, 
  CooperativeLoanGroup,
  CooperativeGroupMembership,
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
import { CooperativeLoanLifecycleContext, CooperativeLoanLifecycleService } from './cooperative-loan-lifecycle.service';
import { CooperativeGroupContext, CooperativeGroupService } from './cooperative-group.service';
import { CooperativeRepaymentContext, CooperativeRepaymentService } from './cooperative-repayment.service';
import { group } from '@angular/animations';

interface PendingMembershipApplication {
  id: string;
  employeeId: string;
  fullName: string;
  requestedTier: string;
  source: 'SELF' | 'ADMIN_INVITE';
  submittedAt: string;
  note?: string;
  status: 'PENDING_MANAGER_APPROVAL';
}

@Injectable({
  providedIn: 'root'
})
export class CooperativeService {
    constructor() {
      this.loadFromStorage();
      this.initializeSampleData();
    }
    private getGroupContext(): CooperativeGroupContext {
      return {
        groups: this.groups,
        members: this.members,
        groupMemberships: this.groupMemberships,
        saveToStorage: () => this.saveToStorage()
      };
    }
  private readonly cooperativeMembershipService = inject(CooperativeMembershipService);
  private readonly cooperativeNotificationService = inject(CooperativeNotificationService);
  private readonly cooperativeLoanLifecycleService = inject(CooperativeLoanLifecycleService);
  private readonly cooperativeGroupService = inject(CooperativeGroupService);
  private readonly cooperativeRepaymentService = inject(CooperativeRepaymentService);
  private storageKey = 'cooperative_data';
  private readonly repaymentDueDay = 15;
  private readonly repaymentGraceDays = 5;
  private readonly repaymentOverdueDays = 15;
  private readonly lateFeeRate = 0.02;
  private readonly creditReportDays = 30;
  
  private members: CooperativeMember[] = [];
  private loans: CooperativeLoan[] = [];
  private groups: CooperativeLoanGroup[] = [];
  private groupMemberships: CooperativeGroupMembership[] = [];
  private repayments: CooperativeRepayment[] = [];
  private notifications: CooperativeNotification[] = [];
  private pendingMembershipApplications: PendingMembershipApplication[] = [];
  
  private membersSubject = new BehaviorSubject<CooperativeMember[]>([]);
  private loansSubject = new BehaviorSubject<CooperativeLoan[]>([]);
  private notificationsSubject = new BehaviorSubject<CooperativeNotification[]>([]);

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
          repaymentAmount: Number((loan.repaymentAmount ?? loan.monthlyRepayment) || 0),
          monthlyRepayment: Number((loan.monthlyRepayment ?? loan.repaymentAmount) || 0),
          repaymentTime: Number((loan.repaymentTime ?? loan.duration) || 0),
          duration: Number((loan.duration ?? loan.repaymentTime) || 0),
          requestDate: loan.requestDate || loan.applicationDate || new Date().toISOString(),
          applicationDate: loan.applicationDate || loan.requestDate || new Date().toISOString(),
          disbursedDate: loan.disbursedDate || loan.disbursementDate || '',
          disbursementDate: loan.disbursementDate || loan.disbursedDate || '',
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
          submittedAt: item.submittedAt || new Date().toISOString(),
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
          joinedAt: membership.joinedAt || new Date().toISOString(),
          lastContributionDate: membership.lastContributionDate
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

  private publishState(): void {
    this.membersSubject.next([...this.members]);
    this.loansSubject.next([...this.loans]);
    this.notificationsSubject.next([...this.notifications]);
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
    const hasUpdatedGroups = this.ensureDefaultGroups();

    if (this.members.length === 0) {
      this.createSampleMembers();
      this.createSampleLoans();
      if (this.groupMemberships.length === 0) {
        this.createSampleGroupMemberships();
      }
      this.saveToStorage();
    } else if (this.groups.length === 0) {
      this.saveToStorage();
    } else if (this.groupMemberships.length === 0) {
      this.createSampleGroupMemberships();
      this.saveToStorage();
    } else if (hasUpdatedGroups) {
      this.saveToStorage();
    }

    const seedVersionKey = `${this.storageKey}_loan_group_seed_v2`;
    if (!localStorage.getItem(seedVersionKey)) {
      this.ensureDefaultGroups();
      this.createSampleGroupMemberships();
      localStorage.setItem(seedVersionKey, 'true');
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
          lastContributionDate: now.toISOString()
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
        monthlyRepayment: 30625,
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
        disbursementDate: sixMonthsAgo.toISOString(),
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
        monthlyRepayment: 18000,
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
        disbursementDate: sixMonthsAgo.toISOString(),
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
        monthlyRepayment: 17750,
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
        disbursementDate: '2023-08-05T10:00:00Z',
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
    return of([...this.members]);
  }

  getMembersObservable(): Observable<CooperativeMember[]> {
    return this.membersSubject.asObservable();
  }

  getMemberById(id: string): CooperativeMember | undefined {
    // Synchronous fallback for now
    return this.members.find(m => m.id === id || m.memberId === id);
    // For async fetch, use a separate method or Observable
  }

  addMember(member: Omit<CooperativeMember, 'id' | 'memberId' | 'createdAt' | 'updatedAt'>): CooperativeMember {
    // Integrate backend POST for member creation
    // Returns Observable<CooperativeMember>
    // The payload should match backend requirements
    // FIX: Remove call to createCooperativeMember, not present on PayrollLoanDeductionService
    // Implement member creation logic here or call appropriate service
    // Placeholder: return member with generated id
    return { ...member, id: Date.now().toString(), memberId: 'COP-' + Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as CooperativeMember;
  }

  updateMember(member: CooperativeMember): CooperativeMember {
    const index = this.members.findIndex(m => m.id === member.id);
    if (index !== -1) {
      member.updatedAt = new Date().toISOString();
      this.members[index] = member;
      this.saveToStorage();
    }
    return { ...member };
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

  private getLoanLifecycleContext(): CooperativeLoanLifecycleContext {
    return {
      loans: this.loans,
      notifications: this.notifications,
      saveToStorage: () => this.saveToStorage(),
      generateNextInternalLoanId: () => this.generateNextInternalLoanId(),
      generateNextPublicLoanCode: () => this.generateNextPublicLoanCode(),
      createPendingApprovalNotification: (loan) => this.createPendingApprovalNotification(loan),
      createMemberStatusNotification: (loan, title, message) => this.createMemberStatusNotification(loan, title, message),
      createGuarantorNotifications: (loan) => this.createGuarantorNotifications(loan),
      generateRepaymentSchedule: (loan) => this.cooperativeRepaymentService.generateRepaymentSchedule(this.getRepaymentContext(), loan)
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

  // ==================== LOAN METHODS ====================

  getLoans(): Observable<CooperativeLoan[]> {
    return of([...this.loans]);
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

  addLoan(loan: Omit<CooperativeLoan, 'id' | 'loanId' | 'createdAt' | 'updatedAt'>): CooperativeLoan {
    // Integrate backend POST for loan creation
    // Returns Observable<CooperativeLoan>
    // The payload should match backend requirements
    // FIX: Remove call to createCooperativeLoan, not present on PayrollLoanDeductionService
    // Implement loan creation logic here or call appropriate service
    // Placeholder: return loan with generated id
    const generatedCode = 'COPLO-' + Date.now();
    return {
      ...loan,
      id: Date.now().toString(),
      loanCode: generatedCode,
      loanId: generatedCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as CooperativeLoan;
  }

  updateLoan(loan: CooperativeLoan): CooperativeLoan {
    return this.cooperativeLoanLifecycleService.updateLoan(this.getLoanLifecycleContext(), loan);
  }

  approveLoan(id: string): CooperativeLoan | undefined {
    return this.cooperativeLoanLifecycleService.approveLoan(this.getLoanLifecycleContext(), id);
  }

  disburseLoan(id: string): CooperativeLoan | undefined {
    return this.cooperativeLoanLifecycleService.disburseLoan(this.getLoanLifecycleContext(), id);
  }

  rejectLoan(id: string, reason: string): CooperativeLoan | undefined {
    return this.cooperativeLoanLifecycleService.rejectLoan(this.getLoanLifecycleContext(), id, reason);
  }

  requestLoanChanges(id: string, note: string): CooperativeLoan | undefined {
    return this.cooperativeLoanLifecycleService.requestLoanChanges(this.getLoanLifecycleContext(), id, note);
  }

  setLoanPendingReview(id: string, note?: string): CooperativeLoan | undefined {
    return this.cooperativeLoanLifecycleService.setLoanPendingReview(this.getLoanLifecycleContext(), id, note);
  }

  submitGuarantorDecision(
    loanId: string,
    guarantorMemberId: string,
    decision: 'APPROVED' | 'REJECTED' | 'EXPIRED',
    note?: string
  ): CooperativeLoan | undefined {
    return this.cooperativeLoanLifecycleService.submitGuarantorDecision(
      this.getLoanLifecycleContext(),
      loanId,
      guarantorMemberId,
      decision,
      note
    );
  }

  getEligibleGroupsForMember(memberId: string, monthlySalary = 0): CooperativeLoanGroup[] {
    return this.cooperativeGroupService.getEligibleGroupsForMember(this.getGroupContext(), memberId, monthlySalary);
  }

  getGroupMembershipsByMember(memberId: string): CooperativeGroupMembership[] {
    return this.cooperativeGroupService.getGroupMembershipsByMember(this.getGroupContext(), memberId);
  }

  getGroupMembership(memberId: string, groupId: string): CooperativeGroupMembership | undefined {
    return this.cooperativeGroupService.getGroupMembership(this.getGroupContext(), memberId, groupId);
  }

  applyForGroupMembership(memberId: string, groupId: string): CooperativeGroupMembership {
    return this.cooperativeGroupService.applyForGroupMembership(this.getGroupContext(), memberId, groupId);
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
    payload: { amount: number; paymentMethod: CooperativeRepayment['paymentMethod']; paidDate?: string }
  ): CooperativeRepayment | undefined {
    return this.cooperativeRepaymentService.recordRepayment(this.getRepaymentContext(), String(loanId), payload);
  }

  getOverdueRepaymentsByLoanId(loanId: string | number): CooperativeRepayment[] {
    return this.cooperativeRepaymentService.getOverdueRepaymentsByLoanId(this.getRepaymentContext(), String(loanId));
  }

  sendRepaymentReminder(loanId: string | number): boolean {
    return this.cooperativeRepaymentService.sendRepaymentReminder(this.getRepaymentContext(), String(loanId));
  }

  markLoanAsDefaulted(loanId: string | number): CooperativeLoan | undefined {
    return this.cooperativeRepaymentService.markLoanAsDefaulted(this.getRepaymentContext(), String(loanId));
  }

  applyPatronageToMemberLoan(memberId: string, amount: number): { appliedAmount: number; loanId?: string } {
    return this.cooperativeRepaymentService.applyPatronageToMemberLoan(this.getRepaymentContext(), memberId, amount);
  }

  // ==================== GROUP/group METHODS ====================

  // Removed obsolete getGroups(): CooperativeLoangroup[] method
  getGroups(): CooperativeLoanGroup[] {
    return this.cooperativeGroupService.getGroups(this.getGroupContext());
  }

  getGroupById(id: string): CooperativeLoanGroup | undefined {
    return this.cooperativeGroupService.getGroupById(this.getGroupContext(), id);
  }

  addGroup(group: Omit<CooperativeLoanGroup, 'id'>): CooperativeLoanGroup {
    return this.cooperativeGroupService.addGroup(this.getGroupContext(), group);
  }

  updateGroup(group: CooperativeLoanGroup): CooperativeLoanGroup {
    return this.cooperativeGroupService.updateGroup(this.getGroupContext(), group);
  }

  setGroupStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): void {
    this.cooperativeGroupService.setGroupStatus(this.getGroupContext(), id, status);
  }

  // ==================== NOTIFICATION METHODS ====================

  getNotifications(): Observable<CooperativeNotification[]> {
    return of(this.cooperativeNotificationService.getNotifications(this.getNotificationContext()));
  }

  getNotificationsObservable(): Observable<CooperativeNotification[]> {
    return this.notificationsSubject.asObservable();
  }

  markNotificationAsRead(id: string): void {
    this.cooperativeNotificationService.markNotificationAsRead(this.getNotificationContext(), id);
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
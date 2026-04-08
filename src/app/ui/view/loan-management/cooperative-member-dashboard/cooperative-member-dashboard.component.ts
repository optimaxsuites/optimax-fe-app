import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { Subscription } from 'rxjs';
import { of } from 'rxjs';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import { EmployeeService } from '../../../service/employee.service';
import { EmployeeLoanService } from '../../../service/loan/emoloyee-loan.service';
import { AuthenticationService } from '../../../shared-component/service/auth-service/authentication.service';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import {
  CooperativeMember,
  CooperativeRepayment,
  CooperativeGroupMembership,
  CooperativeNotification,
  CooperativeEmployeeProfile,
  CooperativeMembershipEligibility,
  CooperativeMembershipApplication,
  CooperativeStaffRank,
  CooperativeLoanGroup
} from '../../../service/loan/cooperative-loan/cooperative.types';

import { PendingMembershipApplication } from '../../../service/loan/cooperative-loan/cooperative-membership.service';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { LoanApplication, RepaymentScheduleItem } from '../../../service/loan/loan.types';
import { formatLoanPurposeDisplay } from '../../../service/loan/loan-display.util';
import { CooperativeMembershipRequestSource } from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-cooperative-member-dashboard',
  templateUrl: './cooperative-member-dashboard.component.html',
  styleUrls: ['./cooperative-member-dashboard.component.scss']
})
export class CooperativeMemberDashboardComponent implements OnInit, OnDestroy {
  private readonly invalidDisplayNamePattern = /^(unknown member|member\s*(undefined|\d+)|\d+)$/i;

    openDashboard(): void {
      // Optionally, you can add logic to focus a dashboard tab or scroll to dashboard section
      // For now, just close the modal and ensure dashboard content is visible
      this.showMembershipConfirmationModal = false;
      this.showLoanHistory = true;
      // If you have a dashboard tab or section, you can add navigation logic here
    }
  showMembershipConfirmationModal = false;
  showJoinGroupConfirmationModal = false;
  currentUuid = uuidV4();
  currentMemberId = 0;
  
  member?: CooperativeMember;
  loans: CooperativeLoan[] = [];
  repaymentsByLoanId: Record<number, CooperativeRepayment[]> = {};
  isLoading = true;
  showApplicationModal = false;
  showJoinGroupModal = false;
  joinGroupConfirmationMessage = '';
  showMyGroupsModal = false;
  showPaymentModal = false;
  showLoanHistory = true;
  showLoanDetailsModal = false;
  selectedRepaymentHistoryLoanId: number | null = null;
  selectedLoanForDetails: CooperativeLoan | null = null;
  selectedPaymentLoan?: CooperativeLoan;
  paymentAmount = 0;
  modeofPayment: CooperativeRepayment['modeofPayment'] = 'BANK_TRANSFER';
  actionMessage = '';
  actionMessageTone: 'error' | 'success' | 'info' = 'error';
  memberStatusUpdates: CooperativeNotification[] = [];
  groupJoinDecisionUpdates: CooperativeNotification[] = [];
  memberGroups: Array<{
    membership: CooperativeGroupMembership;
    groupName: string;
    maxBorrowable: number;
  }> = [];
  availableJoinGroups: CooperativeLoanGroup[] = [];
  eligibleJoinGroupIds: number[] = [];
  currentEmployeeSalary = 0;
  selectedGroupId: number | null = null;
  patronageRate = 20;

  get eligibleJoinGroupIdsAsString(): string[] {
    return this.eligibleJoinGroupIds.map(id => id.toString());
  }
  membershipMessage = '';
  currentEmployeeProfile: CooperativeEmployeeProfile = {
    employeeId: 0,
    fullName: 'Current Employee',
    email: '',
    phone: '+234 800 000 0000',
    department: 'Operations',
    rank: 'MID',
    employmentType: 'PERMANENT',
    employmentStartDate: '2024-01-15T08:00:00Z',
    onProbation: false,
    probationEndDate: '2024-07-15T08:00:00Z',
    hasActiveDisciplinaryIssue: false,
    managerId: 'MGR-001'
  };
  activityFeed: Array<{
    id: string;
    type: 'LOAN' | 'GROUP' | 'NOTIFICATION';
    title: string;
    description: string;
    date: string;
    status?: string;
    link?: string;
  }> = [];
  usingRealData = false;
  private notificationsSubscription?: Subscription;
  private groupMembershipChangedSubscription?: Subscription;
  private membersSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private cooperativeService: CooperativeService,
    private employeeService: EmployeeService,
    private employeeLoanService: EmployeeLoanService,
    private backNavigationService: BackNavigationService,
    private router: Router,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {
    const routeUuid = this.route.snapshot.paramMap.get('uuid');
    if (routeUuid) {
      this.currentUuid = routeUuid;
    }

    this.loadCurrentEmployeeProfile();

    this.notificationsSubscription = this.cooperativeService.getNotificationsObservable().subscribe((notifications: CooperativeNotification[]) => {
      this.updateMemberStatusUpdates(notifications);
      this.updateActivityFeed();
    });

    this.membersSubscription = this.cooperativeService.getMembersObservable().subscribe((members: CooperativeMember[]) => {
      this.syncMemberFromBackendCache(members);
    });

    this.groupMembershipChangedSubscription = this.cooperativeService.getGroupMembershipChangedObservable().subscribe(() => {
      this.loadMemberData();
    });
  }

  ngOnDestroy(): void {
    this.notificationsSubscription?.unsubscribe();
    this.groupMembershipChangedSubscription?.unsubscribe();
    this.membersSubscription?.unsubscribe();
  }

  get displayMemberName(): string {
    const resolvedName = this.member
      ? this.cooperativeService.getMemberDisplayName(this.member.id || this.member.memberId || this.member.employeeId)
      : '';
    const fallbackName = String(this.currentEmployeeProfile.fullName || sessionStorage.getItem('fullname') || sessionStorage.getItem('username') || 'Cooperative Member').trim();
    const name = resolvedName && !this.invalidDisplayNamePattern.test(resolvedName)
      ? resolvedName
      : fallbackName;
    return name.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
  }

  loadCurrentEmployeeProfile(): void {
    if (!this.authenticationService.isAuthenticated()) {
      this.authenticationService.logout();
      return;
    }
    
    const userId = sessionStorage.getItem('userid');
    const username = sessionStorage.getItem('username');
    const email = sessionStorage.getItem('email');
    const userRegDataRaw = sessionStorage.getItem('userRegData');
    
    let fullName = sessionStorage.getItem('fullname');
    
    if (!fullName && userRegDataRaw) {
      try {
        const userRegData = JSON.parse(userRegDataRaw);
        fullName = userRegData.fullname || userRegData.fullName || userRegData.name || username;
      } catch (e) {
        console.error('Error parsing userRegData:', e);
      }
    }
    
    if (!fullName) {
      fullName = username || 'Cooperative Member';
    }
    
    this.currentEmployeeProfile = {
      employeeId: 0,
      fullName: fullName,
      email: email || '',
      phone: '',
      department: '',
      rank: 'MID',
      employmentType: 'PERMANENT',
      employmentStartDate: new Date().toISOString(),
      onProbation: false,
      probationEndDate: '',
      hasActiveDisciplinaryIssue: false,
      managerId: ''
    };

    this.employeeService.getCurrentEmployee().subscribe({
      next: (employee) => {
        this.currentEmployeeProfile = this.mapEmployeeToProfile(employee);
        this.loadMemberData();
      },
      error: (error) => {
        console.warn('Failed to resolve current employee profile for cooperative dashboard:', error);
      }
    });

    this.loadMemberData();
  }

  loadMemberData(): void {
    this.isLoading = true;
    this.actionMessage = '';
    // Always show dashboard for registered members, even if no groups

    this.cooperativeService.loadGroups().subscribe({
      next: (groups) => {
        console.log('Groups loaded:', groups);
        console.log('Using real API data:', this.cooperativeService.isUsingRealData());
        
        this.cooperativeService.getMembers().subscribe({
          next: (members: CooperativeMember[]) => {
            console.log('Loaded members:', members);
            console.log('Using real API data:', this.cooperativeService.isUsingRealData());
            this.usingRealData = this.cooperativeService.isUsingRealData();

            const member = this.resolveDashboardMember(members);

            if (member && this.isResolvedMemberActive(member)) {
              this.loadDashboardForMember(member);
            } else {
              this.member = undefined;
              this.loans = [];
              this.repaymentsByLoanId = {};
              this.memberGroups = [];
              this.availableJoinGroups = [];
              this.eligibleJoinGroupIds = [];
              this.actionMessage = 'No member profile found. Please apply for membership.';
              this.actionMessageTone = 'error';
              this.isLoading = false;
            }
          },
          error: (error) => {
            console.error('Error loading members:', error);
            this.tryResolveCurrentMemberDirectly('Failed to load member data. Please try again later.');
          }
        });
      },
      error: (error) => {
        console.error('Error loading groups:', error);
        this.cooperativeService.getMembers().subscribe({
          next: (members: CooperativeMember[]) => {
            console.log('Loaded members (groups failed):', members);
            this.usingRealData = this.cooperativeService.isUsingRealData();
            const member = this.resolveDashboardMember(members);
            
            if (member && this.isResolvedMemberActive(member)) {
              this.loadDashboardForMember(member);
              if (!this.usingRealData) {
                this.actionMessageTone = 'error';
                this.actionMessage = 'Failed to load some cooperative data from the backend.';
              }
            }
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Error loading members:', err);
            this.tryResolveCurrentMemberDirectly('Failed to load member data. Please try again later.');
          }
        });
      }
    });
  }

  private loadDashboardForMember(member: CooperativeMember): void {
    this.member = member;
    this.currentMemberId = Number(member.id || member.memberId || this.currentMemberId || 0);
    this.applyMemberProfile(member);
    this.refreshMemberFromBackend(member);

    this.cooperativeService.getLoans().subscribe({
      next: (loans) => {
        this.loans = loans
          .filter(loan => loan.cooperativeMemberId === member.id || loan.memberId === member.id)
          .sort((a: CooperativeLoan, b: CooperativeLoan) =>
            new Date(b.requestDate || b.approvedDate || b.requestDate || '').getTime() -
            new Date(a.requestDate || a.approvedDate || a.requestDate || '').getTime()
          );
        this.cooperativeService.loadGroupMembershipsForMember(member).subscribe({
          next: (memberships) => {
            this.memberGroups = memberships
              .filter((item: CooperativeGroupMembership) => item.status === 'ACTIVE')
              .map((item: CooperativeGroupMembership) => ({
                membership: item,
                groupName: this.cooperativeService.getGroupById(item.groupId || item.groupId)?.name || 'Unknown Group',
                maxBorrowable: this.cooperativeService.getMaxBorrowableAmountForGroup(member.id, item.groupId || item.groupId)
              }));

            this.refreshJoinGroupOptions(member.id);
            const hasSelectedGroup = this.selectedGroupId !== null
              && this.memberGroups.some(group => group.membership.groupId === this.selectedGroupId);
            this.selectedGroupId = hasSelectedGroup ? this.selectedGroupId : null;
            this.loadRepayments();
            this.actionMessage = this.usingRealData ? '' : this.actionMessage;
            this.updateMemberStatusUpdates();
            this.updateActivityFeed();
            this.isLoading = false;
          },
          error: (membershipError) => {
            console.error('Error loading group memberships:', membershipError);
            this.memberGroups = [];
            this.availableJoinGroups = [];
            this.eligibleJoinGroupIds = [];
            this.updateMemberStatusUpdates();
            this.updateActivityFeed();
            this.isLoading = false;
          }
        });
      },
      error: (loanError) => {
        console.error('Error loading loans:', loanError);
        this.loans = [];
        this.updateMemberStatusUpdates();
        this.updateActivityFeed();
        this.isLoading = false;
      }
    });
  }

  private tryResolveCurrentMemberDirectly(failureMessage: string): void {
    const candidateIds = Array.from(new Set([
      Number(this.currentEmployeeProfile.employeeId || 0),
      Number(sessionStorage.getItem('employeeId') || 0),
      Number(sessionStorage.getItem('userid') || 0),
      Number(localStorage.getItem('userid') || 0)
    ].filter((value) => Number.isFinite(value) && value > 0)));

    if (!candidateIds.length) {
      this.isLoading = false;
      this.actionMessage = failureMessage;
      this.actionMessageTone = 'error';
      return;
    }

    const tryCandidate = (index: number): void => {
      if (index >= candidateIds.length) {
        this.isLoading = false;
        this.actionMessage = failureMessage;
        this.actionMessageTone = 'error';
        return;
      }

      this.cooperativeService.loadMemberById(candidateIds[index]).subscribe({
        next: (member) => {
          if (member && this.isResolvedMemberActive(member)) {
            this.usingRealData = true;
            this.actionMessage = '';
            this.loadDashboardForMember(member);
            return;
          }
          tryCandidate(index + 1);
        },
        error: () => {
          tryCandidate(index + 1);
        }
      });
    };

    tryCandidate(0);
  }

  private toPreviewRole(rank: CooperativeStaffRank): 'JUNIOR' | 'MID' | 'SENIOR' {
    if (rank === 'SENIOR' || rank === 'EXEC') {
      return 'SENIOR';
    }
    if (rank === 'MID') {
      return 'MID';
    }
    return 'JUNIOR';
  }

  private syncMemberFromBackendCache(members: CooperativeMember[]): void {
    const currentMemberId = Number(this.member?.id || this.member?.memberId || this.member?.employeeId || 0);
    const matchedMember = currentMemberId > 0
      ? members.find((member) =>
          Number(member.id || 0) === currentMemberId
          || Number(member.memberId || 0) === currentMemberId
          || Number(member.employeeId || 0) === currentMemberId
        )
      : this.cooperativeService.resolveCurrentSessionMember(members);

    if (!matchedMember) {
      return;
    }

    this.member = matchedMember;
    this.applyMemberProfile(matchedMember);
  }

  private applyMemberProfile(member: CooperativeMember): void {
    const useFullName = this.cooperativeService.getMemberDisplayName(member.id || member.memberId || member.employeeId);
    this.currentEmployeeProfile = {
      ...this.currentEmployeeProfile,
      employeeId: member.employeeId || this.currentEmployeeProfile.employeeId,
      fullName: useFullName && !this.invalidDisplayNamePattern.test(useFullName)
        ? useFullName
        : this.currentEmployeeProfile.fullName,
      email: member.email || this.currentEmployeeProfile.email,
      phone: member.phone || this.currentEmployeeProfile.phone,
      department: member.address || this.currentEmployeeProfile.department
    };
  }

  private refreshMemberFromBackend(member: CooperativeMember): void {
    const memberId = Number(member.id || 0);
    if (!Number.isFinite(memberId) || memberId <= 0) {
      return;
    }

    this.cooperativeService.loadMemberById(memberId).subscribe({
      next: (freshMember) => {
        if (!freshMember) {
          return;
        }
        this.member = freshMember;
        this.applyMemberProfile(freshMember);
      },
      error: (error) => {
        console.error('Failed to refresh cooperative member from backend:', error);
      }
    });
  }

  get hasMembership(): boolean {
    return !!this.member;
  }

  get canApplyForLoan(): boolean {
    return true;
  }

  submitMembershipApplication(): void {
    if (this.hasMembership) {
      this.membershipMessage = 'You are already an active cooperative member.';
      return;
    }

    const application: CooperativeMembershipApplication = {
      employee: this.currentEmployeeProfile,
      source: 'SELF' as CooperativeMembershipRequestSource
    };

    this.cooperativeService.applyForMembership(application).then(result => {
      this.membershipMessage = result.message;
      if (result.member) {
        this.member = result.member;
        this.loadMemberData();
      }
    });
  }

  applyForMembership(): void {
    const application = {
      employee: this.currentEmployeeProfile,
      source: 'SELF' as CooperativeMembershipRequestSource
    };
    this.cooperativeService.applyForMembership(application).then(result => {
      if (result.success) {
        this.actionMessage = '';
        this.actionMessageTone = 'success';
        this.showMembershipConfirmationModal = true;
      } else {
        this.actionMessage = result.message;
        this.actionMessageTone = 'error';
      }
    });
  }

  closeMembershipConfirmationModal(): void {
    this.showMembershipConfirmationModal = false;
  }

  private mapEmployeeToProfile(employee: any): CooperativeEmployeeProfile {
    const firstName = String(employee?.firstName || '').trim();
    const lastName = String(employee?.lastName || '').trim();
    const fallbackName = String(employee?.fullName || employee?.name || '').trim();
    const fullName = `${firstName} ${lastName}`.trim() || fallbackName || 'Current Employee';

    const email = String(employee?.email || employee?.workEmail || '').trim();
    const levelName = String(employee?.level?.name || employee?.level || employee?.jobTitle || '').trim();
    const employmentTypeName = String(
      employee?.employmentType?.name || employee?.employmentType || employee?.jobType?.name || employee?.jobType || ''
    ).trim();

    return {
      employeeId: Number(employee?.id ?? employee?.employeeId ?? this.currentEmployeeProfile.employeeId),
      fullName,
      email,
      phone: String(employee?.phone || this.currentEmployeeProfile.phone || '').trim(),
      department: String(employee?.department?.name || employee?.department || this.currentEmployeeProfile.department || 'Operations').trim(),
      rank: this.mapRank(levelName),
      employmentType: this.mapEmploymentType(employmentTypeName),
      employmentStartDate:
        employee?.employementStartDate ||
        employee?.employmentStartDate ||
        employee?.hireDate ||
        this.currentEmployeeProfile.employmentStartDate,
      onProbation: Boolean(employee?.onProbation),
      probationEndDate: employee?.probationEndDate || this.currentEmployeeProfile.probationEndDate,
      hasActiveDisciplinaryIssue: Boolean(employee?.hasActiveDisciplinaryIssue || employee?.disciplinaryCaseOpen),
      managerId: String(employee?.supervisor?.id || employee?.supervisor || employee?.managerId || this.currentEmployeeProfile.managerId || '').trim() || undefined
    };
  }

  private currentCurrentEmployeeId(): number {
    return Number(this.currentEmployeeProfile.employeeId || 0);
  }

  private resolveDashboardMember(members: CooperativeMember[]): CooperativeMember | undefined {
    const currentEmployeeId = Number(this.currentCurrentEmployeeId() || 0);
    const normalizedEmail = String(this.currentEmployeeProfile.email || '').trim().toLowerCase();
    const normalizedFullName = String(this.currentEmployeeProfile.fullName || '').trim().toLowerCase();

    return this.cooperativeService.resolveCurrentSessionMember(members)
      || members.find((member) => Number(member.employeeId || 0) === currentEmployeeId)
      || members.find((member) => String(member.email || '').trim().toLowerCase() === normalizedEmail)
      || members.find((member) => String(member.fullName || '').trim().toLowerCase() === normalizedFullName)
      || (this.currentMemberId > 0 ? this.cooperativeService.getMemberById(Number(this.currentMemberId)) : undefined);
  }

  private isResolvedMemberActive(member: CooperativeMember | undefined): boolean {
    const normalizedStatus = String(member?.status || '').trim().toUpperCase();
    return !!member && normalizedStatus !== 'INACTIVE' && normalizedStatus !== 'SUSPENDED' && normalizedStatus !== 'REJECTED';
  }

  private mapRank(value: string): CooperativeEmployeeProfile['rank'] {
    const normalized = value.toLowerCase();
    if (normalized.includes('executive') || normalized.includes('exec') || normalized.includes('director')) {
      return 'EXEC';
    }
    if (normalized.includes('senior') || normalized.includes('manager') || normalized.includes('lead') || normalized.includes('head')) {
      return 'SENIOR';
    }
    if (normalized.includes('mid') || normalized.includes('associate') || normalized.includes('level 2') || normalized.includes('level 3')) {
      return 'MID';
    }
    return 'JUNIOR';
  }

  private mapEmploymentType(value: string): CooperativeEmployeeProfile['employmentType'] {
    const normalized = value.toLowerCase();
    if (normalized.includes('intern')) {
      return 'INTERN';
    }
    if (normalized.includes('contract')) {
      return 'CONTRACT';
    }
    return 'PERMANENT';
  }

  get activeLoans(): CooperativeLoan[] {
    return this.filterLoansBySelectedGroup(this.loans).filter(l => l.status === 'ACTIVE');
  }

  get pendingLoans(): CooperativeLoan[] {
    return this.filterLoansBySelectedGroup(this.loans).filter(l => l.status === 'PENDING');
  }

  get completedLoans(): CooperativeLoan[] {
    return this.filterLoansBySelectedGroup(this.loans).filter(l => l.status === 'COMPLETED');
  }

  get totalBorrowed(): number {
    return this.filterLoansBySelectedGroup(this.loans).reduce((sum, l) => sum + l.amount, 0);
  }

  get personalTotalBorrowed(): number {
    return this.loans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  }

  get outstandingBalance(): number {
    return this.activeLoans.reduce((sum, loan) => sum + this.getOutstandingAmount(loan), 0);
  }

  get personalOutstandingBalance(): number {
    return this.loans.filter(loan => loan.status === 'ACTIVE').reduce((sum, loan) => sum + this.getOutstandingAmount(loan), 0);
  }

  get nextPayment(): { amount: number; dueDate: string } | null {
    const upcoming = this.activeLoans
      .flatMap((loan: CooperativeLoan) => this.getOpenRepayments(loan.id))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
    if (upcoming) {
      return { amount: upcoming.amount, dueDate: upcoming.dueDate };
    }
    return null;
  }

  get personalNextPayment(): { amount: number; dueDate: string } | null {
    const upcoming = this.loans
      .filter(loan => loan.status === 'ACTIVE')
      .flatMap((loan: CooperativeLoan) => this.getOpenRepayments(loan.id))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
    if (upcoming) {
      return { amount: upcoming.amount, dueDate: upcoming.dueDate };
    }
    return null;
  }

  get estimatedPatronageThisYear(): number {
    const year = new Date().getFullYear();
    const memberLoanIds = new Set(this.loans.map(loan => loan.id));
    const yearlyInterestPaid = Object.values(this.repaymentsByLoanId)
      .flat()
      .filter(repayment => {
        if (!repayment.paidDate) return false;
        return new Date(repayment.paidDate).getFullYear() === year && memberLoanIds.has(repayment.loanId);
      })
      .reduce((sum, repayment) => {
        const loan = this.loans.find(item => item.id === repayment.loanId);
        if (!loan || !loan.totalRepayment) return sum;
        const ratio = Math.max((loan.totalRepayment - loan.amount) / loan.totalRepayment, 0);
        return sum + repayment.amount * ratio;
      }, 0);
    return Number((yearlyInterestPaid * (this.patronageRate / 100)).toFixed(2));
  }

  get primaryActiveLoan(): CooperativeLoan | null {
    return this.activeLoans[0] || null;
  }

  get displayedLoans(): CooperativeLoan[] {
    return this.filterLoansBySelectedGroup(this.loans);
  }

  get selectedGroupName(): string {
    if (this.selectedGroupId === null) {
      return 'All Groups';
    }
    return this.memberGroups.find(group => group.membership.groupId === this.selectedGroupId)?.groupName || 'Selected Group';
  }

  get currentMemberTenureMonths(): number {
    return this.member ? this.cooperativeService.getMemberTenureMonths(this.member) : 0;
  }

  getLoanGroupName(loan: CooperativeLoan): string {
    const groupId = loan.groupId ?? loan.cooperativeGroupId;
    return groupId != null ? this.cooperativeService.getGroupById(groupId)?.name || 'Unknown Group' : 'Ungrouped';
  }

  viewAllLoans(): void {
    this.router.navigate(['/admin/hr/loan-management/employee-loan-history', this.member?.id || this.currentMemberId, this.currentUuid], {
      state: { source: 'employee', cooperative: true, uuid: this.currentUuid }
    });
  }

  applyForLoan(): void {
    this.showApplicationModal = true;
  }

  openQuickPaymentModal(): void {
    if (!this.primaryActiveLoan) {
      this.actionMessage = 'No active loan available for payment right now.';
      this.actionMessageTone = 'error';
      return;
    }
    this.openPaymentModal(this.primaryActiveLoan);
  }

  toggleLoanHistory(): void {
    this.showLoanHistory = !this.showLoanHistory;
  }

  viewFullLoanHistory(): void {
    this.viewAllLoans();
  }

  openMyGroupsModal(): void {
    if (this.memberGroups.length === 0) {
      this.actionMessage = 'You do not belong to any active groups yet.';
      this.actionMessageTone = 'error';
      return;
    }
    this.showMyGroupsModal = true;
  }

  closeMyGroupsModal(): void {
    this.showMyGroupsModal = false;
  }

  openGroupDashboard(groupId: number): void {
    console.log('[openGroupDashboard] Navigating to group dashboard:', {
      groupId,
      currentUuid: this.currentUuid,
      memberId: this.member?.id || this.currentMemberId
    });
    this.closeMyGroupsModal();
    this.router.navigate(['/member/cooperative/groups', groupId, this.currentUuid], {
      state: { memberId: this.member?.id || this.currentMemberId }
    });
  }

  openJoinGroupModal(): void {
    if (!this.member) {
      this.actionMessage = 'You need an active cooperative membership profile before joining a group.';
      this.actionMessageTone = 'error';
      return;
    }
    if (this.member) this.refreshJoinGroupOptions(this.member.id);
    this.showJoinGroupModal = true;
  }

  closeJoinGroupModal(): void {
    this.showJoinGroupModal = false;
    this.joinGroupConfirmationMessage = '';
  }

  applyToJoinGroup(groupId: string | number): void {
    const groupIdNum = Number(groupId);
    if (!this.member) {
      this.actionMessage = 'Unable to join a group without an active cooperative membership profile.';
      this.actionMessageTone = 'error';
      return;
    }

    if (!this.eligibleJoinGroupIds.includes(groupIdNum)) {
      const groupName = this.cooperativeService.getGroupById(groupIdNum)?.name || 'this group';
      this.actionMessage = `You are not eligible to join ${groupName} because your current salary does not meet the minimum requirement.`;
      this.actionMessageTone = 'error';
      return;
    }

    this.cooperativeService.applyForGroupMembership(Number(this.member.id), groupIdNum).subscribe({
      next: (membership) => {
        const groupName = this.cooperativeService.getGroupById(groupIdNum)?.name || 'the selected group';
        this.joinGroupConfirmationMessage = membership.status === 'ACTIVE'
          ? `You have successfully joined ${groupName}.`
          : `Your application to join ${groupName} has been submitted for admin approval.`;
        this.actionMessageTone = 'success';
        this.showJoinGroupModal = false;
        this.showJoinGroupConfirmationModal = true;
      },
      error: () => {
        this.actionMessage = 'The group join request could not be submitted. Please try again.';
        this.actionMessageTone = 'error';
      }
    });
  }
  closeJoinGroupConfirmationModal(): void {
    this.showJoinGroupConfirmationModal = false;
    this.joinGroupConfirmationMessage = '';
  }

  confirmJoinGroupAndRefresh(): void {
    this.closeJoinGroupModal();
    setTimeout(() => this.loadMemberData(), 200);
  }

  setGroupDashboard(groupId: number | string): void {
    this.selectedGroupId = typeof groupId === 'string' ? Number(groupId) : groupId;
    this.selectedRepaymentHistoryLoanId = null;
  }

  closeApplicationModal(): void {
    this.showApplicationModal = false;
  }

  onApplicationSubmitted(): void {
    this.showApplicationModal = false;
    this.loadMemberData();
  }

  viewLoanDetails(id: number): void {
    const loan = this.loans.find(item => item.id === id);
    if (!loan) {
      this.actionMessage = 'Loan details are not available right now.';
      this.actionMessageTone = 'error';
      return;
    }
    this.selectedLoanForDetails = loan;
    this.showLoanDetailsModal = true;
  }

  closeLoanDetailsModal(): void {
    this.showLoanDetailsModal = false;
    this.selectedLoanForDetails = null;
  }

  openFullLoanDetailsFromModal(): void {
    if (!this.selectedLoanForDetails) return;
    const loanId = this.selectedLoanForDetails.id;
    this.closeLoanDetailsModal();
    this.router.navigate([`/member/cooperative/loans/${loanId}/${this.currentUuid}`]);
  }

  viewRepaymentHistory(id: number): void {
    this.selectedRepaymentHistoryLoanId = this.selectedRepaymentHistoryLoanId === id ? null : id;
  }

  closeRepaymentHistory(): void {
    this.selectedRepaymentHistoryLoanId = null;
  }

  get selectedRepaymentHistoryLoan(): CooperativeLoan | null {
    if (!this.selectedRepaymentHistoryLoanId) return null;
    return this.loans.find(item => item.id === this.selectedRepaymentHistoryLoanId) || null;
  }

  get selectedRepaymentHistoryRows(): CooperativeRepayment[] {
    if (!this.selectedRepaymentHistoryLoanId) return [];
    return [...(this.repaymentsByLoanId[this.selectedRepaymentHistoryLoanId] || [])]
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }

  get selectedRepaymentScheduleLoan(): LoanApplication | null {
    if (!this.selectedRepaymentHistoryLoan) return null;
    return this.toLoanApplicationScheduleView(this.selectedRepaymentHistoryLoan);
  }

  private toLoanApplicationScheduleView(loan: CooperativeLoan): LoanApplication {
    const repayments: CooperativeRepayment[] = [...(this.repaymentsByLoanId[loan.id] || [])]
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const totalPaid = repayments.filter(item => item.status === 'PAID').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const currentBalance = repayments.filter(item => item.status !== 'PAID').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    let remainingBalance = Number(loan.totalRepayment || 0);
    const repaymentSchedule: RepaymentScheduleItem[] = repayments.map((item, index) => {
      const totalPayment = Number(item.amount || 0);
      const principal = Number(item.principalComponent || Math.max(totalPayment - Number(item.interestComponent || 0), 0));
      const interest = Number(item.interestComponent || 0);
      remainingBalance = Math.max(Number((remainingBalance - totalPayment).toFixed(2)), 0);
      return {
        installmentNo: index + 1,
        dueDate: item.dueDate,
        principalAmount: principal,
        interestAmount: interest,
        totalAmount: totalPayment,
        remainingBalance,
        status: item.status,
        paymentMethod: item.modeofPayment || 'BANK_TRANSFER',
        paidAmount: item.status === 'PAID' ? totalPayment : 0
      };
    });
    const mappedStatus: LoanApplication['status'] = loan.status === 'DEFAULTED' ? 'ACTIVE' : 
      loan.status === 'PENDING' || loan.status === 'APPROVED' || loan.status === 'REJECTED' || loan.status === 'ACTIVE' || loan.status === 'COMPLETED' ? loan.status : 'PENDING';
    return {
      id: Number(loan.loanId || loan.id || 0),
      loanCode: String(loan.loanCode || loan.loanId || loan.id || ''),
      employeeId: Number(this.member?.memberId || loan.memberId || loan.cooperativeMemberId || 0),
      fullName: this.member
        ? this.cooperativeService.getMemberDisplayName(this.member.id || this.member.memberId || this.member.employeeId)
        : 'Cooperative Member',
      department: this.currentEmployeeProfile.department || 'Cooperative',
      amount: Number(loan.amount || 0),
      modeOfPayment: String(loan.modeOfPayment || '').toUpperCase() === 'ONE_OFF' ? 'ONE_OFF' : 'MONTHLY',
      status: mappedStatus,
      requestDate: loan.applicationDate || loan.requestDate || new Date().toISOString(),
      purpose: loan.purpose,
      repaymentTime: Number(loan.duration || 0),
      repaymentAmount: Number(loan.repaymentAmount || 0),
      acknowledgment: true,
      interestRate: Number(loan.interestRate || 0),
      currentBalance,
      totalPaid,
      totalPrincipalPaid: 0,
      totalInterestPaid: 0,
      outstandingPrincipal: currentBalance,
      adminComment: loan.adminComment || '',
      statusHistory: [],
      repaymentSchedule,
      paymentHistory: []
    };
  }

  openPaymentModal(loan: CooperativeLoan): void {
    this.selectedPaymentLoan = loan;
    this.paymentAmount = this.getNextInstallmentAmount(loan.id) || Number(loan.repaymentAmount || 0);
    this.modeofPayment = 'BANK_TRANSFER';
    this.showPaymentModal = true;
    this.actionMessage = '';
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedPaymentLoan = undefined;
    this.paymentAmount = 0;
    this.modeofPayment = 'BANK_TRANSFER';
  }

  submitPayment(): void {
    if (!this.selectedPaymentLoan || this.paymentAmount <= 0) return;
    this.cooperativeService.recordRepayment(this.selectedPaymentLoan.id, {
      amount: this.paymentAmount,
      modeofPayment: this.modeofPayment,
      paidDate: new Date().toISOString()
    }).subscribe((repayment: CooperativeRepayment | undefined) => {
      if (!repayment) {
        this.actionMessage = 'Unable to record payment right now. Please try again.';
        this.actionMessageTone = 'error';
        return;
      }
      this.closePaymentModal();
      this.loadMemberData();
      this.actionMessage = `Payment of ${this.formatCurrency(repayment.amount)} was recorded successfully.`;
      this.actionMessageTone = 'success';
    });
  }

  getOutstandingAmount(loan: CooperativeLoan): number {
    const repayments: CooperativeRepayment[] = this.repaymentsByLoanId[loan.id] || [];
    if (repayments.length === 0) return loan.amount;
    return repayments.filter((item: CooperativeRepayment) => item.status !== 'PAID').reduce((sum: number, item: CooperativeRepayment) => sum + item.amount, 0);
  }

  getNextDueDate(loanId: number): string | null {
    const next = this.getOpenRepayments(loanId).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
    return next?.dueDate || null;
  }

  getNextInstallmentAmount(loanId: number): number {
    const next = this.getOpenRepayments(loanId).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
    return next?.amount || 0;
  }

  getLastPaymentDate(loanId: number): string | null {
    const lastPaid = (this.repaymentsByLoanId[loanId] || [])
      .filter(item => item.status === 'PAID' && !!item.paidDate)
      .sort((a, b) => new Date(b.paidDate as string).getTime() - new Date(a.paidDate as string).getTime())[0];
    return lastPaid?.paidDate || null;
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  getInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  goBack(): void {
    this.backNavigationService.goBack(['/member/cooperative/dashboard', this.currentUuid]);
  }

  private loadRepayments(): void {
    this.repaymentsByLoanId = {};
    this.loans.forEach(loan => {
      this.repaymentsByLoanId[loan.id] = this.cooperativeService.getRepaymentsByLoanId(loan.id);
    });
  }

  private refreshJoinGroupOptions(memberId: number): void {
    const existingMemberships = this.cooperativeService.getGroupMembershipsByMember(memberId);
    const joinedOrPendingGroupIds = new Set(
      existingMemberships.filter(item => item.status === 'ACTIVE' || item.status === 'PENDING').map(item => item.groupId)
    );
    const employeeId = Number(this.member?.employeeId || this.currentEmployeeProfile.employeeId || 0);
    const fallbackSalary = Number(this.currentEmployeeProfile.monthlySalary || 0);

    const updateEligibleGroups = (salary: number): void => {
      this.currentEmployeeSalary = salary;
      this.currentEmployeeProfile = {
        ...this.currentEmployeeProfile,
        monthlySalary: salary
      };
      const eligibleGroups = this.cooperativeService.getEligibleGroupsForMember(memberId, salary);
      this.availableJoinGroups = eligibleGroups.filter(group => !joinedOrPendingGroupIds.has(group.id));
      this.eligibleJoinGroupIds = this.availableJoinGroups.map(group => group.id);
    };

    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      updateEligibleGroups(fallbackSalary);
      return;
    }

    this.employeeLoanService.getSalaryByEmployeeId(employeeId).subscribe({
      next: (salaryData: { baseSalary?: number; monthlySalary?: number; salary?: number }) => {
        const salary = Number(salaryData?.baseSalary || salaryData?.monthlySalary || salaryData?.salary || 0);
        updateEligibleGroups(salary || fallbackSalary);
      },
      error: () => {
        updateEligibleGroups(fallbackSalary);
      }
    });
  }

  private getOpenRepayments(loanId: number): CooperativeRepayment[] {
    return (this.repaymentsByLoanId[loanId] || []).filter(item => item.status !== 'PAID');
  }

  private filterLoansBySelectedGroup(loans: CooperativeLoan[]): CooperativeLoan[] {
    if (this.selectedGroupId === null) return loans;
    return loans.filter(loan => {
      const groupId = loan.groupId ?? loan.cooperativeGroupId;
      return groupId === this.selectedGroupId;
    });
  }

  getActivationLinkFromMessage(message: string): string | null {
    if (this.hasMembership) {
      return null;
    }
    if (!message) return null;
    const match = message.match(/(https?:\/\/\S+|\/member\/cooperative\/dashboard\S*)/i);
    return match ? match[0].replace(/[).,]+$/, '') : null;
  }

  getMessageWithoutActivationLink(message: string): string {
    const link = this.getActivationLinkFromMessage(message);
    if (!link) return message;
    return message.replace(link, '').replace(/\s{2,}/g, ' ').trim();
  }

  openActivationLink(event: Event, link: string): void {
    event.preventDefault();
    if (!link) return;
    if (link.startsWith('/member/cooperative/dashboard')) {
      this.router.navigate(['/member/cooperative/dashboard', this.currentUuid], {
        queryParams: { activateMembership: 'true' }
      }).then(() => {
        setTimeout(() => this.loadMemberData(), 500);
      });
      return;
    }
    if (/^https?:\/\//i.test(link)) {
      window.open(link, '_blank', 'noopener,noreferrer');
      return;
    }
    this.router.navigateByUrl(link);
    setTimeout(() => this.loadMemberData(), 500);
  }

  private updateMemberStatusUpdates(source?: CooperativeNotification[]): void {
    const allNotifications = source || this.cooperativeService.getNotificationsSnapshot();
    const targetMemberId = this.member?.id || this.currentMemberId;
    const memberNotifications = allNotifications
      .filter(notification => notification.recipient === 'MEMBER')
      .filter(notification => !targetMemberId || notification.memberId === targetMemberId)
      .filter(notification => !this.hasMembership || !this.getActivationLinkFromMessageRaw(notification.message))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    this.groupJoinDecisionUpdates = memberNotifications.filter(notification => notification.type === 'GROUP_JOIN_STATUS_UPDATE').slice(0, 5);
    this.memberStatusUpdates = memberNotifications.filter(notification =>
      notification.type === 'LOAN_STATUS_UPDATE' ||
      notification.type === 'LOAN_INFO_REQUESTED' ||
      notification.type === 'LOAN_REPAYMENT_REMINDER' ||
      notification.type === 'GUARANTOR_REQUEST' ||
      notification.type === 'GUARANTOR_STATUS_UPDATE' ||
      notification.type === 'LOAN_DEFAULTED'
    ).slice(0, 5);
  }

  private getActivationLinkFromMessageRaw(message: string): string | null {
    if (!message) return null;
    const match = message.match(/(https?:\/\/\S+|\/member\/cooperative\/dashboard\S*)/i);
    return match ? match[0].replace(/[).,]+$/, '') : null;
  }

  private buildActivityFeed(): Array<{
    id: string;
    type: 'LOAN' | 'GROUP' | 'NOTIFICATION';
    title: string;
    description: string;
    date: string;
    status?: string;
    link?: string;
  }> {
    const activities: Array<{
      id: string;
      type: 'LOAN' | 'GROUP' | 'NOTIFICATION';
      title: string;
      description: string;
      date: string;
      status?: string;
      link?: string;
    }> = [];

    this.loans.forEach(loan => {
      activities.push({
        id: `loan-${loan.id}-application`,
        type: 'LOAN',
        title: 'Loan Application',
        description: `Applied for loan of ${this.formatCurrency(loan.amount)} for ${loan.purpose || 'general purpose'}`,
        date: loan.requestDate,
        status: loan.status,
        link: `/member/cooperative/loans/${loan.id}/${this.currentUuid}`
      });
      const repayments: CooperativeRepayment[] = this.repaymentsByLoanId[loan.id] || [];
      repayments.forEach((repayment) => {
        if (repayment.status === 'PAID' && repayment.paidDate) {
          activities.push({
            id: `repayment-${repayment.id}`,
            type: 'LOAN',
            title: 'Loan Repayment',
            description: `Made repayment of ${this.formatCurrency(repayment.amount)} for loan ${loan.loanCode || loan.id}`,
            date: repayment.paidDate,
            status: 'PAID',
            link: `/member/cooperative/loans/${loan.id}/${this.currentUuid}`
          });
        } else if (repayment.status === 'OVERDUE') {
          activities.push({
            id: `repayment-overdue-${repayment.id}`,
            type: 'LOAN',
            title: 'Overdue Payment',
            description: `Payment of ${this.formatCurrency(repayment.amount)} is overdue for loan ${loan.loanCode || loan.id}`,
            date: repayment.dueDate,
            status: 'OVERDUE',
            link: `/member/cooperative/loans/${loan.id}/${this.currentUuid}`
          });
        }
      });
    });

    this.memberGroups.forEach(group => {
      activities.push({
        id: `group-${group.membership.id}-joined`,
        type: 'GROUP',
        title: 'Group Membership',
        description: `Joined ${group.groupName} cooperative group`,
        date: group.membership.joinedAt,
        status: group.membership.status,
        link: `/member/cooperative/groups/${group.membership.groupId}/${this.currentUuid}`
      });
    });

    const allNotifications = [...this.memberStatusUpdates, ...this.groupJoinDecisionUpdates];
    allNotifications.forEach(notification => {
      activities.push({
        id: `notification-${notification.id}`,
        type: 'NOTIFICATION',
        title: notification.title,
        description: notification.message,
        date: notification.createdAt,
        link: notification.loanId ? `/member/cooperative/loans/${notification.loanId}/${this.currentUuid}` : undefined
      });
    });

    return activities.sort((a: { date: string }, b: { date: string }) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  }

  private updateActivityFeed(): void {
    this.activityFeed = this.buildActivityFeed();
  }
}
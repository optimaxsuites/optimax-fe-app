// ...existing code...
// ...existing code...
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { Subscription, forkJoin } from 'rxjs';
import { of } from 'rxjs';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import { EmployeeService } from '../../../service/employee.service';
import { EmployeeLoanService } from '../../../service/loan/emoloyee-loan.service';
import { AuthenticationService } from '../../../shared-component/service/auth-service/authentication.service';
import { CooperativeLoan, PaymentHistory, StatusHistory } from '../../../domain/loan/cooperative-loan.dto';
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
import { formatLoanPurposeDisplay, formatCooperativeLoanCode as _formatCooperativeLoanCode } from '../../../service/loan/loan-display.util';
import { startLoanLoadProfiler } from '../../../service/loan/loan-load-profiler.util';
import { CooperativeMembershipRequestSource } from '../../../service/loan/cooperative-loan/cooperative.types';

interface CooperativeMemberLoanRow {
  loan: CooperativeLoan;
  loanId: string | number;
  groupName: string;
  amount: string;
  statusClass: string;
  statusLabel: string;
  outstandingAmount: string;
}

@Component({
  selector: 'app-cooperative-member-dashboard',
  templateUrl: './cooperative-member-dashboard.component.html',
  styleUrls: ['./cooperative-member-dashboard.component.scss']
})

export class CooperativeMemberDashboardComponent implements OnInit, OnDestroy {
  showGracePeriodModal = false;

  openGracePeriodRequest(): void {
    this.showGracePeriodModal = true;
  }

  closeGracePeriodModal(): void {
    this.showGracePeriodModal = false;
  }

      selectedExtensionLoanId: number | null = null;
      // Open extension modal for selected loan from dropdown
      openExtensionModalFromDropdown(): void {
        if (!this.selectedExtensionLoanId) return;
        const loan = this.loans.find(l => l.id === this.selectedExtensionLoanId);
        if (loan) {
          this.selectedRepaymentHistoryLoanId = loan.id;
          // Optionally, scroll to repayment schedule or open modal if needed
          // You may want to trigger a modal or UI state here
          // For now, just show the repayment schedule and let user use per-installment extension
        }
      }
    /**
     * Returns a formatted member ID for display in the dashboard header.
     * Example: pad to 3 digits with zeros and prefix with 'COP-'.
     */
    public formatMemberId(raw: string | number | undefined | null): string {
      if (raw === undefined || raw === null) return 'N/A';
      const num = Number(raw);
      if (!Number.isFinite(num) || num <= 0) return 'N/A';
      return 'COP-' + num.toString().padStart(3, '0');
    }
  // Expose as a public method for template use
  public formatCooperativeLoanCode(raw: string | number | undefined | null): string {
    return _formatCooperativeLoanCode(raw);
  }
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
  displayedLoanRows: CooperativeMemberLoanRow[] = [];
  repaymentsByLoanId: Record<number, CooperativeRepayment[]> = {};
  isLoading = true;
  showApplicationModal = false;
  showJoinGroupModal = false;
  joinGroupConfirmationMessage = '';
  showMyGroupsModal = false;
  showPaymentModal = false;
  showLoanHistory = true;
  showRecentActivity = true;
  showLoanDetailsModal = false;
  selectedRepaymentHistoryLoanId: number | null = null;
  selectedLoanForDetails: CooperativeLoan | null = null;
  selectedPaymentLoan?: CooperativeLoan;
  selectedPaymentInstallment: CooperativeRepayment | null = null;
  allowPaymentLoanSelection = false;
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
    level: 'MID',
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
      level: 'MID',
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
      },
      error: (error) => {
        console.warn('Failed to resolve current employee profile for cooperative dashboard:', error);
      },
      complete: () => {
        this.loadMemberData();
      }
    });
  }

  loadMemberData(): void {
    const loadProfiler = startLoanLoadProfiler('cooperative-member-dashboard');
    this.isLoading = true;
    this.actionMessage = '';
    // Always show dashboard for registered members, even if no groups

    forkJoin({
      groups: this.cooperativeService.loadGroups(),
      members: this.cooperativeService.getMembers()
    }).subscribe({
      next: ({ groups, members }) => {
        console.log('Groups loaded:', groups);
        console.log('Loaded members:', members);
        console.log('Using real API data:', this.cooperativeService.isUsingRealData());
        this.usingRealData = this.cooperativeService.isUsingRealData();

        const member = this.resolveDashboardMember(members);

        if (member && this.isResolvedMemberActive(member)) {
          this.loadDashboardForMember(member, loadProfiler);
          return;
        }

        if (member) {
          this.loadRegisteredMemberState(member);
          return;
        }

        this.member = undefined;
        this.loans = [];
        this.repaymentsByLoanId = {};
        this.memberGroups = [];
        this.availableJoinGroups = [];
        this.eligibleJoinGroupIds = [];
        this.displayedLoanRows = [];
        this.actionMessage = 'No member profile found. Please apply for membership.';
        this.actionMessageTone = 'error';
        loadProfiler.success({ loans: 0, groups: 0, state: 'no-member-profile' });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading cooperative dashboard data:', error);
        loadProfiler.error({ message: 'Failed to load cooperative member dashboard data' });
        this.tryResolveCurrentMemberDirectly('Failed to load member data. Please try again later.');
      }
    });
  }

  private loadDashboardForMember(member: CooperativeMember, loadProfiler?: ReturnType<typeof startLoanLoadProfiler>): void {
    this.member = member;
    this.currentMemberId = Number(member.id || member.memberId || this.currentMemberId || 0);
    this.applyMemberProfile(member);
    forkJoin({
      loans: this.cooperativeService.getLoans(),
      memberships: this.cooperativeService.refreshGroupMembershipsForMember(member)
    }).subscribe({
      next: ({ loans, memberships }) => {
        this.loans = loans
          .filter(loan => loan.cooperativeMemberId === member.id || loan.memberId === member.id)
          .sort((a: CooperativeLoan, b: CooperativeLoan) =>
            new Date(b.requestDate || b.approvedDate || b.requestDate || '').getTime() -
            new Date(a.requestDate || a.approvedDate || a.requestDate || '').getTime()
          );

        this.memberGroups = memberships
          .filter((item: CooperativeGroupMembership) => item.status === 'ACTIVE')
          .map((item: CooperativeGroupMembership) => ({
            membership: item,
            groupName: this.cooperativeService.getGroupById(item.groupId || item.groupId)?.name || 'Unknown Group',
            maxBorrowable: this.cooperativeService.getMaxBorrowableAmountForGroup(member.id, item.groupId || item.groupId)
          }));

        // --- Ensure repayment schedules are always generated for ACTIVE loans ---
        const activeLoans = this.loans.filter(l => l.status === 'ACTIVE');
        if (activeLoans.length > 0) {
          activeLoans.forEach(loan => {
            // This will auto-generate the schedule if missing
            this.cooperativeService.getRepaymentsByLoanId(loan.id);
          });
        }

        this.refreshJoinGroupOptions(member.id);
        const hasSelectedGroup = this.selectedGroupId !== null
          && this.memberGroups.some(group => group.membership.groupId === this.selectedGroupId);
        this.selectedGroupId = hasSelectedGroup ? this.selectedGroupId : null;
        this.refreshDisplayedLoanRows();
        this.loadRepayments();
        // Always show repayment schedule for ACTIVE loans
        if (activeLoans.length > 0) {
          // Always select the first ACTIVE loan for repayment schedule if none is selected
          if (!this.selectedRepaymentHistoryLoanId || !activeLoans.some(l => l.id === this.selectedRepaymentHistoryLoanId)) {
            this.selectedRepaymentHistoryLoanId = activeLoans[0].id;
          }
        } else {
          this.selectedRepaymentHistoryLoanId = null;
        }
        this.actionMessage = this.usingRealData ? '' : this.actionMessage;
        this.updateMemberStatusUpdates();
        this.updateActivityFeed();
        loadProfiler?.success({ loans: this.loans.length, groups: this.memberGroups.length });
        this.isLoading = false;
      },
      error: (dashboardError) => {
        console.error('Error loading member loan dashboard:', dashboardError);
        this.loans = [];
        this.displayedLoanRows = [];
        this.memberGroups = [];
        this.availableJoinGroups = [];
        this.eligibleJoinGroupIds = [];
        this.updateMemberStatusUpdates();
        this.updateActivityFeed();
        loadProfiler?.error({ message: 'Failed to load cooperative member loan data' });
        this.isLoading = false;
      }
    });
  }

  private loadRegisteredMemberState(member: CooperativeMember): void {
    this.member = member;
    this.currentMemberId = Number(member.id || member.memberId || this.currentMemberId || 0);
    this.applyMemberProfile(member);
    this.loans = [];
    this.displayedLoanRows = [];
    this.repaymentsByLoanId = {};
    this.memberGroups = [];
    this.availableJoinGroups = [];
    this.eligibleJoinGroupIds = [];
    this.updateMemberStatusUpdates();
    this.updateActivityFeed();
    this.actionMessage = this.getRegisteredMemberStateMessage(member.status);
    this.actionMessageTone = 'error';
    this.isLoading = false;
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
          if (member) {
            this.usingRealData = true;
            this.loadRegisteredMemberState(member);
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
      level: levelName,
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

  private extractKnownDate(value: string | undefined | null): string {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) {
      return '';
    }

    const parsed = new Date(normalizedValue);
    return Number.isNaN(parsed.getTime()) ? '' : normalizedValue;
  }

  private calculateTenureMonths(startDate: string): number {
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

  private getRegisteredMemberStateMessage(status: string | undefined): string {
    const normalizedStatus = String(status || '').trim().toUpperCase();

    if (normalizedStatus === 'SUSPENDED') {
      return 'Your cooperative membership is suspended. Contact an administrator for assistance.';
    }

    if (normalizedStatus === 'INACTIVE') {
      return 'Your cooperative membership is inactive. Contact an administrator for assistance.';
    }

    if (normalizedStatus === 'REJECTED') {
      return 'Your cooperative membership record is rejected. Contact an administrator for clarification.';
    }

    return 'Your cooperative membership is not active right now. Contact an administrator for assistance.';
  }

  // mapRank removed: now using level directly from employee DTO

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

private refreshDisplayedLoanRows(): void {
  this.displayedLoanRows = this.displayedLoans.slice(0, 5).map((loan) => ({
    loan,
    loanId: this.formatCooperativeLoanCode(loan.loanCode ?? loan.loanId ?? loan.id ?? 'N/A'),
    groupName: this.getLoanGroupName(loan),
    amount: this.formatCurrency(loan.amount),
    statusClass: this.getStatusClass(loan.status),
    statusLabel: this.getStatusDisplay(loan.status),
    outstandingAmount: this.formatCurrency(this.getOutstandingAmount(loan))
  }));
}

  /**
/**
/**
 * Returns a user-friendly display string for a loan status code in Title Case.
 */
public getStatusDisplay(status: string | undefined | null): string {
  if (!status) return '';
  // Convert status to Title Case with spaces
  const normalized = String(status).replace(/_/g, ' ').toLowerCase();
  return normalized.replace(/\b\w/g, c => c.toUpperCase());
}

public toTitleCase(value: string | undefined | null): string {
  if (!value) return '';
  const normalized = String(value).replace(/_/g, ' ').toLowerCase();
  return normalized.replace(/\b\w/g, c => c.toUpperCase());
}

  get selectedGroupName(): string {
    if (this.selectedGroupId === null) {
      return 'All Groups';
    }
    return this.memberGroups.find(group => group.membership.groupId === this.selectedGroupId)?.groupName || 'Selected Group';
  }

  get currentMemberSinceDate(): string {
    const membershipDates = this.memberGroups
      .map((group) => this.extractKnownDate(group.membership.joinedAt || group.membership.activatedAt || group.membership.approvedAt || group.membership.requestedAt))
      .filter((value): value is string => !!value)
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());

    return membershipDates[0]
      || this.extractKnownDate(this.member?.joinDate)
      || this.extractKnownDate(this.member?.createdAt)
      || this.extractKnownDate(this.member?.updatedAt)
      || '';
  }

  get currentMemberTenureMonths(): number {
    return this.calculateTenureMonths(this.currentMemberSinceDate);
  }

  getLoanGroupName(loan: CooperativeLoan): string {
    const groupId = loan.groupId ?? loan.cooperativeGroupId;
    return groupId != null ? this.cooperativeService.getGroupById(groupId)?.name || 'Unknown Group' : 'Ungrouped';
  }

  viewAllLoans(): void {
    this.router.navigate(['/loan-management/cooperative-member-loan-history', this.member?.id || this.currentMemberId, this.currentUuid], {
      state: { source: 'member', cooperative: true, uuid: this.currentUuid }
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
    this.openPaymentModal(this.primaryActiveLoan, true);
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
    this.refreshDisplayedLoanRows();
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

  viewRepaymentSchedule(id: number): void {
    this.selectedRepaymentHistoryLoanId = this.selectedRepaymentHistoryLoanId === id ? null : id;
  }

  viewRepaymentHistory(id: number): void {
    this.viewRepaymentSchedule(id);
  }

  closeRepaymentHistory(): void {
    this.selectedRepaymentHistoryLoanId = null;
  }

  get selectedRepaymentHistoryLoan(): CooperativeLoan | null {
    if (!this.selectedRepaymentHistoryLoanId) return null;
    return this.loans.find(item => item.id === this.selectedRepaymentHistoryLoanId) || null;
  }

  get selectedLoanPaymentHistory(): PaymentHistory[] {
    const loan = this.selectedLoanForDetails;
    if (!loan) {
      return [];
    }

    return [...(loan.paymentHistory || [])].sort((left, right) =>
      new Date(right.paidAt || right.recordedAt || 0).getTime() - new Date(left.paidAt || left.recordedAt || 0).getTime()
    );
  }

  get selectedLoanTimeline(): StatusHistory[] {
    const loan = this.selectedLoanForDetails;
    if (!loan) {
      return [];
    }

    return [...(loan.statusHistory || [])]
      .filter((entry) => !!entry?.changedAt)
      .sort((left, right) => new Date(left.changedAt).getTime() - new Date(right.changedAt).getTime());
  }

  get selectedLoanDetailsGroup(): CooperativeLoanGroup | null {
    if (!this.selectedLoanForDetails) {
      return null;
    }

    const groupId = Number(this.selectedLoanForDetails.groupId || this.selectedLoanForDetails.cooperativeGroupId || 0);
    return groupId ? this.cooperativeService.getGroupById(groupId) || null : null;
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

  get selectedRepaymentScheduleGroup(): CooperativeLoanGroup | null {
    if (!this.selectedRepaymentHistoryLoan) {
      return null;
    }

    const groupId = Number(this.selectedRepaymentHistoryLoan.groupId || this.selectedRepaymentHistoryLoan.cooperativeGroupId || 0);
    return groupId ? this.cooperativeService.getGroupById(groupId) || null : null;
  }

  get payableLoans(): CooperativeLoan[] {
    return this.loans.filter((loan) => ['ACTIVE', 'SKIPPED', 'OVERDUE'].includes(loan.status || ''));
  }

  get selectedPaymentGroup(): CooperativeLoanGroup | null {
    if (!this.selectedPaymentLoan) {
      return null;
    }

    const groupId = Number(this.selectedPaymentLoan.groupId || this.selectedPaymentLoan.cooperativeGroupId || 0);
    return groupId ? this.cooperativeService.getGroupById(groupId) || null : null;
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
    const mappedStatus: LoanApplication['status'] = loan.status === 'PENDING'
      || loan.status === 'APPROVED'
      || loan.status === 'REJECTED'
      || loan.status === 'READY_FOR_DISBURSEMENT'
      || loan.status === 'ACTIVE'
      || loan.status === 'SKIPPED'
      || loan.status === 'OVERDUE'
      || loan.status === 'DEFAULTED'
      || loan.status === 'PAUSED'
      || loan.status === 'COMPLETED'
      ? loan.status
      : 'PENDING';
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

  openPaymentModal(loan: CooperativeLoan, allowSelection = false): void {
    const nextInstallment = this.getOpenRepayments(loan.id)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] || null;
    if (!nextInstallment) {
      this.actionMessage = 'No payable installment is available for this loan right now.';
      this.actionMessageTone = 'error';
      return;
    }

    this.selectedPaymentLoan = loan;
    this.selectedPaymentInstallment = nextInstallment;
    this.allowPaymentLoanSelection = allowSelection;
    this.showPaymentModal = true;
    this.actionMessage = '';
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedPaymentLoan = undefined;
    this.selectedPaymentInstallment = null;
    this.allowPaymentLoanSelection = false;
    this.paymentAmount = 0;
    this.modeofPayment = 'BANK_TRANSFER';
  }

  handlePaymentSuccess(): void {
    this.closePaymentModal();
    this.loadMemberData();
    this.actionMessage = 'Payment was recorded successfully.';
    this.actionMessageTone = 'success';
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

  getPaymentMethodLabel(method?: string): string {
    switch (String(method || '').toUpperCase()) {
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      case 'CASH':
        return 'Cash';
      case 'PAYROLL_DEDUCTION':
        return 'Payroll Deduction';
      case 'CHEQUE':
        return 'Cheque';
      case 'MOBILE_MONEY':
        return 'Mobile Money';
      default:
        return method || 'Not set';
    }
  }

  getLoanRepaymentStartDate(loan: CooperativeLoan): string {
    return loan.repaymentStartDate || loan.requestDate || loan.applicationDate || '';
  }

  getLoanRepaymentDayDisplay(loan: CooperativeLoan): string {
    const repaymentDay = Number(loan.repaymentDay || 0);
    if (!repaymentDay) {
      return 'Not set';
    }

    return `${repaymentDay}${this.getDayOrdinal(repaymentDay)}`;
  }

  getLoanDisbursementStatusText(loan: CooperativeLoan): string {
    if (loan.disbursedDate || loan.status === 'ACTIVE' || loan.status === 'COMPLETED') {
      return 'Disbursed';
    }

    if (loan.disbursementConfirmedAt) {
      return 'Confirmed';
    }

    if (loan.disbursementInitiatedAt || loan.status === 'READY_FOR_DISBURSEMENT') {
      return 'Ready For Disbursement';
    }

    return 'Not Disbursed';
  }

  getLoanDisbursementStatusClass(loan: CooperativeLoan): string {
    const status = this.getLoanDisbursementStatusText(loan);
    if (status === 'Disbursed') {
      return 'status-active';
    }
    if (status === 'Confirmed' || status === 'Ready For Disbursement') {
      return 'status-ready_for_disbursement';
    }
    return 'status-pending';
  }

  getTimelineActor(entry: StatusHistory): string {
    const actor = entry.changedBy;
    if (actor && typeof actor === 'object') {
      return String(actor.fullname || actor.username || actor.email || 'System').trim();
    }

    const numericActor = Number(actor || 0);
    return numericActor > 0 ? `Admin #${numericActor}` : 'System';
  }

  private getDayOrdinal(day: number): string {
    if (day > 3 && day < 21) {
      return 'th';
    }

    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
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
  if (!status) return '';
  // Convert to lowercase and replace spaces with underscores for CSS class
  const normalized = status.toLowerCase().replace(/ /g, '_');
  return `status-${normalized}`;
}

  getActivityIconClass(type: 'LOAN' | 'GROUP' | 'NOTIFICATION'): string {
    if (type === 'GROUP') {
      return 'fas fa-people-group';
    }

    if (type === 'NOTIFICATION') {
      return 'fas fa-bell';
    }

    return 'fas fa-file-invoice-dollar';
  }

  openActivityItem(item: { link?: string }): void {
    if (!item.link) {
      return;
    }

    this.navigateToSafeMemberLink(item.link);
  }

  getDocumentSizeLabel(size?: number): string {
    const bytes = Number(size || 0);
    if (bytes <= 0) {
      return 'Unknown size';
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  goBack(): void {
    this.backNavigationService.goBack(['/member/cooperative/dashboard', this.currentUuid]);
  }

  private loadRepayments(): void {
    this.repaymentsByLoanId = {};
    this.loans.forEach(loan => {
      this.repaymentsByLoanId[loan.id] = this.cooperativeService.getRepaymentsByLoanId(loan.id);
    });
    this.refreshDisplayedLoanRows();
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
    if (this.navigateToSafeMemberLink(link)) {
      setTimeout(() => this.loadMemberData(), 500);
    }
  }

  private navigateToSafeMemberLink(link: string): boolean {
    const normalizedLink = String(link || '').trim();
    if (!normalizedLink.startsWith('/')) {
      this.actionMessage = 'That link is not available right now.';
      this.actionMessageTone = 'error';
      return false;
    }

    const tree = this.router.parseUrl(normalizedLink);
    const primarySegments = tree.root.children['primary']?.segments.map(segment => segment.path) || [];
    const allowedPrefixes = [
      ['member', 'cooperative'],
      ['admin', 'hr', 'cooperative']
    ];
    const isAllowed = allowedPrefixes.some(prefix =>
      prefix.every((segment, index) => primarySegments[index] === segment)
    );

    if (!isAllowed) {
      this.actionMessage = 'That link is not available from the cooperative dashboard.';
      this.actionMessageTone = 'error';
      return false;
    }

    this.actionMessage = '';
    this.router.navigateByUrl(tree);
    return true;
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
      status: this.getStatusDisplay(loan.status),  // Format the status here
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
          status: this.getStatusDisplay('PAID'),  // Format the status here
          link: `/member/cooperative/loans/${loan.id}/${this.currentUuid}`
        });
      } else if (repayment.status === 'OVERDUE') {
        activities.push({
          id: `repayment-overdue-${repayment.id}`,
          type: 'LOAN',
          title: 'Overdue Payment',
          description: `Payment of ${this.formatCurrency(repayment.amount)} is overdue for loan ${loan.loanCode || loan.id}`,
          date: repayment.dueDate,
          status: this.getStatusDisplay('OVERDUE'),  // Format the status here
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
      status: this.getStatusDisplay(group.membership.status),  // Format the status here
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
      status: notification.type === 'GROUP_JOIN_STATUS_UPDATE' ? this.getStatusDisplay(notification.type) : undefined,
      link: notification.loanId ? `/member/cooperative/loans/${notification.loanId}/${this.currentUuid}` : undefined
    });
  });

  return activities.sort((a: { date: string }, b: { date: string }) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
}

  private updateActivityFeed(): void {
    this.activityFeed = this.buildActivityFeed();
  }

  toggleRecentActivity(): void {
    this.showRecentActivity = !this.showRecentActivity;
  }
}
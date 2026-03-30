import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { Subscription } from 'rxjs';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import { EmployeeService } from '../../../service/employee.service';
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
  showMembershipConfirmationModal = false;
  currentUuid = uuidV4();
  currentMemberId: number = 1;
  
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
  actionMessageTone: 'error' | 'success' = 'error';
  memberStatusUpdates: CooperativeNotification[] = [];
  groupJoinDecisionUpdates: CooperativeNotification[] = [];
  memberGroups: Array<{
    membership: CooperativeGroupMembership;
    groupName: string;
    maxBorrowable: number;
  }> = [];
  availableJoinGroups: CooperativeLoanGroup[] = [];
  eligibleJoinGroupIds: number[] = [];
  selectedGroupId: number | null = null;
  patronageRate = 20;

  get eligibleJoinGroupIdsAsString(): string[] {
    return this.eligibleJoinGroupIds.map(id => id.toString());
  }
  membershipMessage = '';
  currentEmployeeProfile: CooperativeEmployeeProfile = {
    employeeId: 1,
    fullName: 'Current Employee',
    email: 'employee@company.com',
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

  constructor(
    private route: ActivatedRoute,
    private cooperativeService: CooperativeService,
    private employeeService: EmployeeService,
    private backNavigationService: BackNavigationService,
    private router: Router
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

    // Subscribe to group membership changes and reload member data automatically
    this.groupMembershipChangedSubscription = this.cooperativeService.getGroupMembershipChangedObservable().subscribe(() => {
      this.loadMemberData();
    });
  }

  ngOnDestroy(): void {
    this.notificationsSubscription?.unsubscribe();
    this.groupMembershipChangedSubscription?.unsubscribe();
  }

  loadCurrentEmployeeProfile(): void {
    this.employeeService.getAllEmployee().subscribe({
      next: (data) => {
        const response: any = data;
        const employees = Array.isArray(response)
          ? response
          : Array.isArray(response?.content)
          ? response.content
          : Array.isArray(response?.data)
          ? response.data
          : [];

        const userRegDataRaw = sessionStorage.getItem('userRegData');
        const userRegData = userRegDataRaw ? JSON.parse(userRegDataRaw) : null;
        const sessionUsername = String(sessionStorage.getItem('username') || '').trim().toLowerCase();
        const sessionUserId = String(sessionStorage.getItem('userid') || '').trim();

        const matchedEmployee = employees.find((employee: any) => {
          const employeeId = Number(employee?.id ?? employee?.employeeId ?? 0);
          const employeeEmail = String(employee?.email || employee?.workEmail || '').trim().toLowerCase();
          const employeeUsername = String(employee?.username || employee?.userName || '').trim().toLowerCase();

          const regEmail = String(userRegData?.email || '').trim().toLowerCase();
          const regUsername = String(userRegData?.username || '').trim().toLowerCase();

          if (sessionUserId && employeeId === Number(sessionUserId)) {
            return true;
          }

          if (regEmail && employeeEmail && employeeEmail === regEmail) {
            return true;
          }

          if (sessionUsername && (employeeUsername === sessionUsername || employeeEmail === sessionUsername)) {
            return true;
          }

          if (regUsername && (employeeUsername === regUsername || employeeEmail === regUsername)) {
            return true;
          }

          return false;
        }) || employees[0];

        if (matchedEmployee) {
          this.currentEmployeeProfile = this.mapEmployeeToProfile(matchedEmployee);
          this.currentMemberId = Number(this.currentEmployeeProfile.employeeId) || this.currentMemberId;
          // Ensure member exists for employee before loading member data
          // this.cooperativeService.ensureMemberForEmployee(this.currentEmployeeProfile).subscribe(() => {
          this.loadMemberData();
          // });
        } else {
          this.loadMemberData();
        }
      },
      error: () => {
        this.loadMemberData();
      }
    });
  }

  loadMemberData(): void {
    this.isLoading = true;
    this.actionMessage = '';

    this.cooperativeService.loadGroups().subscribe(() => {
      this.cooperativeService.getMembers().subscribe((members: CooperativeMember[]) => {
        console.log('Loaded members:', members);
        console.log('Using real API data:', this.cooperativeService.isUsingRealData());
        this.usingRealData = this.cooperativeService.isUsingRealData();


        // Try to find member by currentMemberId
        let member = this.cooperativeService.getMemberById(Number(this.currentMemberId));

        // If not found, try to find by email or username (for fallback)
        if (!member) {
          member = members.find(m =>
            m.email?.toLowerCase() === this.currentEmployeeProfile.email?.toLowerCase() ||
            m.fullName?.toLowerCase() === this.currentEmployeeProfile.fullName?.toLowerCase()
          );
        }

        // If still not found, use the first available member (for local/sample data)
        if (!member && members.length > 0) {
          member = members[0];
        }

        // If still not found, auto-create member for signed-in user
        if (!member) {
          const newMember: Omit<CooperativeMember, 'id' | 'memberId' | 'createdAt' | 'updatedAt'> = {
            employeeId: this.currentEmployeeProfile.employeeId,
            fullName: this.currentEmployeeProfile.fullName,
            email: this.currentEmployeeProfile.email,
            phone: this.currentEmployeeProfile.phone || '',
            joinDate: new Date().toISOString(),
            status: 'ACTIVE',
            shareCapital: 0,
            address: this.currentEmployeeProfile.department,
            emergencyContact: undefined
          };
          this.cooperativeService.addMember(newMember).subscribe(() => {
            // After creation, reload member data
            this.loadMemberData();
          });
          return;
        }


        if (member && member.status === 'ACTIVE') {
          this.member = member;
          this.currentEmployeeProfile = {
            ...this.currentEmployeeProfile,
            employeeId: member.employeeId || member.id,
            fullName: member.fullName,
            email: member.email,
            phone: member.phone,
            department: member.address || this.currentEmployeeProfile.department
          };

          this.loans = this.cooperativeService
            .getLoansByMember(member.id)
            .sort((a: CooperativeLoan, b: CooperativeLoan) => new Date(b.requestDate || b.approvedDate || b.requestDate || '').getTime() - new Date(a.requestDate || a.approvedDate || a.requestDate || '').getTime());

          this.memberGroups = this.cooperativeService.getGroupMembershipsByMember(member.id)
            .filter((item: CooperativeGroupMembership) => item.status === 'ACTIVE')
            .map((item: CooperativeGroupMembership) => ({
              membership: item,
              groupName: this.cooperativeService.getGroupById(item.groupId || item.groupId)?.name || 'Unknown Group',
              maxBorrowable: this.cooperativeService.getMaxBorrowableAmountForGroup(member.id, item.groupId || item.groupId)
            }));

          // Debug: Log memberGroups after refresh
          console.log('[DEBUG] memberGroups after loadMemberData:', this.memberGroups);

          this.refreshJoinGroupOptions(member.id);
          const hasSelectedGroup = this.selectedGroupId !== null
            && this.memberGroups.some(group => group.membership.groupId === this.selectedGroupId);
          this.selectedGroupId = hasSelectedGroup ? this.selectedGroupId : null;
          this.loadRepayments();

          // Show message based on data source
          if (!this.usingRealData) {
            this.actionMessageTone = 'error';
          } else {
            this.actionMessage = '';
          }
        } else {
          this.member = undefined;
          this.loans = [];
          this.repaymentsByLoanId = {};
          this.memberGroups = [];
          this.availableJoinGroups = [];
          this.eligibleJoinGroupIds = [];
          this.actionMessage = 'No member profile found. Please contact HR.';
          this.actionMessageTone = 'error';
        }

        this.updateMemberStatusUpdates();
        this.updateActivityFeed();
        this.isLoading = false;
      });
    });
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

    const email = String(employee?.email || employee?.workEmail || '').trim() || 'employee@company.com';
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

  // Computed properties
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
    return this.loans
      .filter(loan => loan.status === 'ACTIVE')
      .reduce((sum, loan) => sum + this.getOutstandingAmount(loan), 0);
  }

  get nextPayment(): { amount: number; dueDate: string } | null {
    const upcoming = this.activeLoans
      .flatMap((loan: CooperativeLoan) => this.getOpenRepayments(loan.id))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    if (upcoming) {
      return {
        amount: upcoming.amount,
        dueDate: upcoming.dueDate
      };
    }

    return null;
  }

  get personalNextPayment(): { amount: number; dueDate: string } | null {
    const upcoming = this.loans
      .filter(loan => loan.status === 'ACTIVE')
      .flatMap((loan: CooperativeLoan) => this.getOpenRepayments(loan.id))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    if (upcoming) {
      return {
        amount: upcoming.amount,
        dueDate: upcoming.dueDate
      };
    }

    return null;
  }

  get estimatedPatronageThisYear(): number {
    const year = new Date().getFullYear();
    const memberLoanIds = new Set(this.loans.map(loan => loan.id));

    const yearlyInterestPaid = Object.values(this.repaymentsByLoanId)
      .flat()
      .filter(repayment => {
        if (!repayment.paidDate) {
          return false;
        }

        return new Date(repayment.paidDate).getFullYear() === year && memberLoanIds.has(repayment.loanId);
      })
      .reduce((sum, repayment) => {
        const loan = this.loans.find(item => item.id === repayment.loanId);
        if (!loan || !loan.totalRepayment) {
          return sum;
        }

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

  getLoanGroupName(loan: CooperativeLoan): string {
    const groupId = loan.groupId ?? loan.cooperativeGroupId;
    return groupId != null ? this.cooperativeService.getGroupById(groupId)?.name || 'Unknown Group' : 'Ungrouped';
  }

  // Navigation
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

    const membership = this.cooperativeService.applyForGroupMembership(Number(this.member.id), groupIdNum);
    const groupName = this.cooperativeService.getGroupById(groupIdNum)?.name || 'the selected group';

    // Show confirmation message in modal, don't close yet
    this.joinGroupConfirmationMessage = membership.status === 'ACTIVE'
      ? `You have successfully joined ${groupName}.`
      : `Your application to join ${groupName} has been submitted for admin approval.`;
    this.actionMessageTone = 'success';
  }

  confirmJoinGroupAndRefresh(): void {
    this.closeJoinGroupModal();
    setTimeout(() => this.loadMemberData(), 200);
    // Removed extra closing curly brace to restore class structure
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
    if (!this.selectedLoanForDetails) {
      return;
    }

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
    if (!this.selectedRepaymentHistoryLoanId) {
      return null;
    }
    return this.loans.find(item => item.id === this.selectedRepaymentHistoryLoanId) || null;
  }

  get selectedRepaymentHistoryRows(): CooperativeRepayment[] {
    if (!this.selectedRepaymentHistoryLoanId) {
      return [];
    }
    return [...(this.repaymentsByLoanId[this.selectedRepaymentHistoryLoanId] || [])]
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }

  get selectedRepaymentScheduleLoan(): LoanApplication | null {
    if (!this.selectedRepaymentHistoryLoan) {
      return null;
    }

    return this.toLoanApplicationScheduleView(this.selectedRepaymentHistoryLoan);
  }

  private toLoanApplicationScheduleView(loan: CooperativeLoan): LoanApplication {
    const repayments: CooperativeRepayment[] = [...(this.repaymentsByLoanId[loan.id] || [])]
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const totalPaid = repayments
      .filter(item => item.status === 'PAID')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const currentBalance = repayments
      .filter(item => item.status !== 'PAID')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

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

    const mappedStatus: LoanApplication['status'] = loan.status === 'DEFAULTED'
      ? 'ACTIVE'
      : loan.status === 'PENDING' || loan.status === 'APPROVED' || loan.status === 'REJECTED' || loan.status === 'ACTIVE' || loan.status === 'COMPLETED'
      ? loan.status
      : 'PENDING';

    return {
      id: Number(loan.loanId || loan.id || 0),
      loanCode: String(loan.loanCode || loan.loanId || loan.id || ''),
      employeeId: Number(this.member?.memberId || loan.memberId || loan.cooperativeMemberId || 0),
      fullName: this.member?.fullName || 'Cooperative Member',
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
    if (!this.selectedPaymentLoan || this.paymentAmount <= 0) {
      return;
    }

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
    if (repayments.length === 0) {
      return loan.amount;
    }
    return repayments
      .filter((item: CooperativeRepayment) => item.status !== 'PAID')
      .reduce((sum: number, item: CooperativeRepayment) => sum + item.amount, 0);
  }

  getNextDueDate(loanId: number): string | null {
    const next = this.getOpenRepayments(loanId)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
    return next?.dueDate || null;
  }

  getNextInstallmentAmount(loanId: number): number {
    const next = this.getOpenRepayments(loanId)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
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
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
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
    const activeGroups = this.cooperativeService
      .getGroups()
      .filter(group => group.status === 'ACTIVE');
    const existingMemberships = this.cooperativeService.getGroupMembershipsByMember(memberId);
    const joinedOrPendingGroupIds = new Set(
      existingMemberships
        .filter(item => item.status === 'ACTIVE' || item.status === 'PENDING')
        .map(item => item.groupId)
    );

    this.availableJoinGroups = activeGroups.filter(group => !joinedOrPendingGroupIds.has(group.id));
    this.eligibleJoinGroupIds = this.availableJoinGroups.map(group => group.id);
  }

  private getOpenRepayments(loanId: number): CooperativeRepayment[] {
    return (this.repaymentsByLoanId[loanId] || []).filter(item => item.status !== 'PAID');
  }

  private filterLoansBySelectedGroup(loans: CooperativeLoan[]): CooperativeLoan[] {
    if (this.selectedGroupId === null) {
      return loans;
    }
    return loans.filter(loan => {
      const groupId = loan.groupId ?? loan.cooperativeGroupId;
      return groupId === this.selectedGroupId;
    });
  }

  getActivationLinkFromMessage(message: string): string | null {
    if (!message) {
      return null;
    }

    const match = message.match(/(https?:\/\/\S+|\/member\/cooperative\/dashboard\S*)/i);
    return match ? match[0].replace(/[).,]+$/, '') : null;
  }

  getMessageWithoutActivationLink(message: string): string {
    const link = this.getActivationLinkFromMessage(message);
    if (!link) {
      return message;
    }

    return message.replace(link, '').replace(/\s{2,}/g, ' ').trim();
  }

  openActivationLink(event: Event, link: string): void {
    event.preventDefault();

    if (!link) {
      return;
    }

    if (link.startsWith('/member/cooperative/dashboard')) {
      this.router.navigate(['/member/cooperative/dashboard', this.currentUuid], {
        queryParams: { activateMembership: 'true' }
      }).then(() => {
        // After navigation, refresh member data
        setTimeout(() => this.loadMemberData(), 500);
      });
      return;
    }

    if (/^https?:\/\//i.test(link)) {
      window.open(link, '_blank', 'noopener,noreferrer');
      return;
    }

    this.router.navigateByUrl(link);
    // Also refresh member data in case of in-app navigation
    setTimeout(() => this.loadMemberData(), 500);
  }

  private updateMemberStatusUpdates(source?: CooperativeNotification[]): void {
    const allNotifications = source || this.cooperativeService.getNotificationsSnapshot();
    const targetMemberId = this.member?.id || this.currentMemberId;

    const memberNotifications = allNotifications
      .filter(notification => notification.recipient === 'MEMBER')
      .filter(notification => !targetMemberId || notification.memberId === targetMemberId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    this.groupJoinDecisionUpdates = memberNotifications
      .filter(notification => notification.type === 'GROUP_JOIN_STATUS_UPDATE')
      .slice(0, 5);

    this.memberStatusUpdates = memberNotifications
      .filter(notification =>
        notification.type === 'LOAN_STATUS_UPDATE' ||
        notification.type === 'LOAN_INFO_REQUESTED' ||
        notification.type === 'LOAN_REPAYMENT_REMINDER' ||
        notification.type === 'GUARANTOR_REQUEST' ||
        notification.type === 'GUARANTOR_STATUS_UPDATE' ||
        notification.type === 'LOAN_DEFAULTED'
      )
      .slice(0, 5);
  }

  /**
   * Builds an activity feed for the dashboard
   * Combines loan activities, group join activities, and notifications
   */
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

    // Add loan activities
    this.loans.forEach(loan => {
      // Loan application activity
      activities.push({
        id: `loan-${loan.id}-application`,
        type: 'LOAN',
        title: 'Loan Application',
        description: `Applied for loan of ${this.formatCurrency(loan.amount)} for ${loan.purpose || 'general purpose'}`,
        date: loan.requestDate,
        status: loan.status,
        link: `/member/cooperative/loans/${loan.id}/${this.currentUuid}`
      });

      // Check for repayments
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

    // Add group activities
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

    // Add notifications
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

    // Sort by date (most recent first) and limit to 10 activities
    return activities
      .sort((a: { date: string }, b: { date: string }) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }

  /**
   * Updates the activity feed property
   */
  private updateActivityFeed(): void {
    this.activityFeed = this.buildActivityFeed();
  }
}
// ...existing code...
// ...existing code...
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Subscription } from 'rxjs';
import { v4 as uuidV4 } from 'uuid';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import { TableColumn } from '../../../shared-component/view/table/table.component';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { MailNotificationService } from '../../../service/mailNotification.service';
import {
  CooperativeContributionEntry,
  CooperativeContributionPaymentMethod,
  CooperativeGroupMembership,
  CooperativeLoanGroup,
  CooperativeMember,
  CooperativePendingContributionRequest,
  CooperativeRepayment
} from '../../../service/loan/cooperative-loan/cooperative.types';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { formatCooperativeLoanCode } from '../../../service/loan/loan-display.util';

interface GroupBorrowerRow {
  memberId: number;
  memberName: string;
  loanId: string;
  status: string;
  amount: number;
  totalPaid: number;
  outstanding: number;
  progressPercent: number;
  repaymentStatus: string;
  nextDueDate: string | null;
  hasOverdueRepayment: boolean;
}

interface GroupContributionRow {
  memberId: number;
  memberName: string;
  memberCode: number;
  monthlyContribution: number;
  totalContribution: number;
  joinedAt: string;
}

interface GroupMemberRosterRow {
  memberRecordId: number;
  memberName: string;
  memberCode: number;
  membershipId: number;
  joinedAt: string;
}

interface GroupRecentJoinerRow {
  memberId: number;
  fullName: string;
  email: string;
  joinedAt: string;
}

interface GroupMonthlyContributionSnapshotRow {
  memberId: number;
  memberName: string;
  memberCode: number;
  expectedAmount: number;
  postedAmount: number;
  status: 'POSTED' | 'PENDING';
  contributedAt: string;
}

interface ContributionHistoryPoint {
  monthKey: string;
  monthLabel: string;
  totalContribution: number;
  activeContributorCount: number;
}

interface GroupActivityItem {
  id: string;
  type: 'join' | 'loan' | 'repayment' | 'completion' | 'contribution';
  title: string;
  description: string;
  occurredAt: string;
}

@Component({
  selector: 'app-cooperative-member-group-dashboard',
  templateUrl: './cooperative-member-group-dashboard.component.html',
  styleUrls: ['./cooperative-member-group-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.Emulated
})
export class CooperativeMemberGroupDashboardComponent implements OnInit, OnDestroy {

  // Format loan code for display (with COPLO- prefix)
  public formatLoanCode(code: string | number | undefined | null): string {
    return formatCooperativeLoanCode(code);
  }

  // Convert status to Title Case
  public toTitleCase(status: string): string {
    if (!status) return '';
    if (status.toUpperCase() === 'READY_FOR_DISBURSEMENT') {
      return 'Disbursable';
    }
    return status.toLowerCase().replace(/(^|\s|_)[a-z]/g, (match) => match.toUpperCase()).replace(/_/g, ' ');
  }

  showGracePeriodModal = false;
  selectedLoan: CooperativeLoan | null = null;

  openCooperativeGraceRequest(): void {
    // Find the current member's loan (if any)
    if (this.currentMember) {
      // Find the first loan for the current member in this group
      this.selectedLoan = this.groupLoans.find(
        loan => loan.cooperativeMemberId === this.currentMember!.memberId && loan.cooperativeGroupId === this.group?.id
      ) || null;
    } else {
      this.selectedLoan = null;
    }
    this.showGracePeriodModal = true;
  }

  closeGracePeriodModal(): void {
    this.showGracePeriodModal = false;
    this.selectedLoan = null;
  }
  private readonly invalidDisplayNamePattern = /^(unknown member|member\s*(undefined|\d+)|\d+)$/i;
  currentUuid = uuidV4();
  /**
   * Call this method after approving a group membership to force the dashboard to reload.
   * Example usage (after approval):
   *   dashboardComponent.forceReloadAfterApproval();
   */
  forceReloadAfterApproval(): void {
    this.loadDashboard();
    this.actionMessageTone = 'success';
    this.actionMessage = 'Membership approved. Dashboard reloaded.';
  }
  currentGroupId = '';
  currentMemberId = '';
  memberDirectoryQuery = '';
  showMemberDirectoryModal = false;
  isLoading = true;
  actionMessage = '';
  actionMessageTone: 'error' | 'success' = 'error';
  isContributionModalOpen = false;
  isSubmittingContribution = false;
  contributionForm = {
    amount: 0,
    contributionMonth: '',
    paymentMethod: 'BANK_TRANSFER' as CooperativeContributionPaymentMethod
  };
  contributionError = '';

  group?: CooperativeLoanGroup;
  currentMember?: CooperativeMember;
  currentMembership?: CooperativeGroupMembership;
  groupMemberships: CooperativeGroupMembership[] = [];
  groupMembers: CooperativeMember[] = [];
  groupLoans: CooperativeLoan[] = [];
  groupContributionEntries: CooperativeContributionEntry[] = [];
  pendingContributionRequests: CooperativePendingContributionRequest[] = [];
  borrowerRows: GroupBorrowerRow[] = [];
  contributionRows: GroupContributionRow[] = [];

  // Helper to normalize status label for display
  getStatusLabel(status: string): string {
    return status === 'READY_FOR_DISBURSEMENT' ? 'Disbursable' : status;
  }
  groupMemberRosterRows: GroupMemberRosterRow[] = [];
  selectedContributionMonth = '';
  recentJoiners: GroupRecentJoinerRow[] = [];
  contributionHistory: ContributionHistoryPoint[] = [];
  activityFeed: GroupActivityItem[] = [];
  private membersSubscription?: Subscription;

  readonly contributionColumns: TableColumn<GroupContributionRow>[] = [
    { header: 'Member', field: 'memberName' },
    { header: 'Code', formatter: row => this.formatMemberId(row.memberCode) },
    { header: 'Monthly', formatter: row => this.formatCurrency(row.monthlyContribution) },
    { header: 'Total', formatter: row => this.formatCurrency(row.totalContribution) },
    { header: 'Joined', formatter: row => row.joinedAt ? new Date(row.joinedAt).toLocaleDateString('en-US') : '—' }
  ];

  readonly groupMemberRosterColumns: TableColumn<GroupMemberRosterRow>[] = [
    { header: 'Member', field: 'memberName' },
    { header: 'Member ID', field: 'memberCode' },
    { header: 'Membership ID', field: 'membershipId' },
    { header: 'Joined', formatter: row => row.joinedAt ? new Date(row.joinedAt).toLocaleDateString('en-US') : '—' },
    { header: 'Actions' }
  ];

  readonly recentJoinerColumns: TableColumn<GroupRecentJoinerRow>[] = [
    { header: 'Member', field: 'fullName' },
    { header: 'Member ID', formatter: row => this.formatMemberId(row.memberId) },
    { header: 'Email', field: 'email' },
    { header: 'Joined', formatter: row => row.joinedAt ? new Date(row.joinedAt).toLocaleDateString('en-US') : '—' }
  ];

  readonly contributionPaymentMethodOptions: Array<{ value: CooperativeContributionPaymentMethod; label: string }> = [
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CARD', label: 'Card' },
    { value: 'CASH', label: 'Cash' },
    { value: 'PAYROLL_DEDUCTION', label: 'Payroll Deduction' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money' }
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly cooperativeService: CooperativeService,
    private readonly backNavigationService: BackNavigationService,
    private readonly mailNotificationService: MailNotificationService
  ) {}

  ngOnInit(): void {
    this.membersSubscription = this.cooperativeService.getMembersObservable().subscribe((members) => {
      this.syncMemberDisplayState(members);
    });

    this.route.params.subscribe(params => {
      this.currentUuid = params['uuid'] || this.currentUuid;
      this.currentGroupId = params['groupId'] || this.currentGroupId;
      this.currentMemberId = String(window.history.state?.memberId || '').trim() || this.resolveCurrentMemberId();
      this.loadDashboard();
    });
  }

  ngOnDestroy(): void {
    this.membersSubscription?.unsubscribe();
  }

  get totalMembers(): number {
    return this.groupMembers.length;
  }

  get filteredGroupMemberRosterRows(): GroupMemberRosterRow[] {
    const query = this.normalizeDirectoryQuery(this.memberDirectoryQuery);
    if (!query) {
      return this.groupMemberRosterRows;
    }

    return this.groupMemberRosterRows.filter((row) => {
      return [row.memberName, row.memberCode, row.membershipId]
        .some((value) => this.normalizeDirectoryQuery(value).includes(query));
    });
  }

  get previewGroupMemberRosterRows(): GroupMemberRosterRow[] {
    return this.groupMemberRosterRows.slice(0, 3);
  }

  get activeBorrowersCount(): number {
    return this.borrowerRows.filter(row => row.status === 'ACTIVE' || row.status === 'APPROVED').length;
  }

  get completedBorrowersCount(): number {
    return this.borrowerRows.filter(row => row.status === 'COMPLETED').length;
  }

  get monthlyContributionPool(): number {
    const latestMonth = this.contributionHistory[this.contributionHistory.length - 1];
    return latestMonth?.totalContribution || this.groupMemberships.reduce((sum, item) => sum + Number(item.monthlyContributionAmount || 0), 0);
  }

  get totalContributionPool(): number {
    return this.groupMemberships.reduce((sum, item) => sum + Number(item.totalContribution || 0), 0);
  }

  get overdueBorrowersCount(): number {
    return this.borrowerRows.filter(row => row.hasOverdueRepayment).length;
  }

  get averageRepaymentProgress(): number {
    if (this.borrowerRows.length === 0) {
      return 0;
    }

    const total = this.borrowerRows.reduce((sum, row) => sum + row.progressPercent, 0);
    return Math.round(total / this.borrowerRows.length);
  }

  get currentMemberDisplayName(): string {
    const resolvedName = this.currentMember
      ? this.cooperativeService.getMemberDisplayName(this.currentMember.id || this.currentMember.memberId || this.currentMember.employeeId)
      : '';
    return this.getSafeDisplayName(resolvedName, this.currentMember?.fullName);
  }

  getMemberDisplayName(memberId: number | string | undefined): string {
    const normalizedId = Number(memberId || 0);
    const resolvedName = this.cooperativeService.getMemberDisplayName(memberId);
    const cachedName = normalizedId > 0 ? this.cooperativeService.getMemberById(normalizedId)?.fullName : '';
    return this.getSafeDisplayName(resolvedName, cachedName, normalizedId > 0 ? `Member ${normalizedId}` : 'Cooperative Member');
  }

  get completedBorrowerNames(): string[] {
    return this.borrowerRows
      .filter(row => row.status === 'COMPLETED')
      .map(row => row.memberName);
  }

  get highestContributionMonth(): number {
    return this.contributionHistory.reduce((max, item) => Math.max(max, item.totalContribution), 0);
  }

  get canPostContribution(): boolean {
    return !!this.currentMembership && this.currentMembership.status === 'ACTIVE';
  }

  get resolvedCurrentGroup(): CooperativeLoanGroup | undefined {
    const groupId = Number(this.currentGroupId || this.group?.id || 0);
    if (!Number.isFinite(groupId) || groupId <= 0) {
      return this.group;
    }

    return this.mergeGroupRecords(this.group, this.cooperativeService.getGroupById(groupId));
  }

  get currentGroupAccountingEmail(): string {
    return String(this.resolvedCurrentGroup?.accountingEmail || '').trim();
  }

  get currentGroupContributionBankName(): string {
    return String(this.resolvedCurrentGroup?.contributionsBankName || '').trim();
  }

  get currentGroupContributionAccount(): string {
    return String(this.resolvedCurrentGroup?.contributionsAccount || '').trim();
  }

  get contributionMonthOptions(): Array<{ value: string; label: string }> {
    const monthKeys = new Set<string>();
    this.contributionHistory.forEach((item) => monthKeys.add(item.monthKey));
    this.groupContributionEntries.forEach((entry) => {
      if (entry.contributionMonth) {
        monthKeys.add(entry.contributionMonth);
      }
    });

    if (monthKeys.size === 0) {
      monthKeys.add(this.getDefaultContributionMonth());
    }

    return Array.from(monthKeys)
      .sort((left, right) => right.localeCompare(left))
      .map((value) => ({ value, label: this.getContributionMonthLabel(value) }));
  }

  get selectedContributionMonthLabel(): string {
    return this.selectedContributionMonth ? this.getContributionMonthLabel(this.selectedContributionMonth) : 'Selected Month';
  }

  get monthlyContributionSnapshotRows(): GroupMonthlyContributionSnapshotRow[] {
    const targetMonth = this.selectedContributionMonth || this.getDefaultContributionMonth();

    return this.groupMemberships.map((membership) => {
      const member = this.cooperativeService.getMemberById(membership.memberId);
      const monthEntries = this.groupContributionEntries.filter((entry) =>
        entry.membershipId === membership.id && entry.contributionMonth === targetMonth
      );
      const postedAmount = monthEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      const latestEntry = [...monthEntries].sort((left, right) => new Date(right.contributedAt).getTime() - new Date(left.contributedAt).getTime())[0];

      return {
        memberId: Number(membership.memberId),
        memberName: this.getMemberDisplayName(membership.memberId),
        memberCode: member?.memberId ? Number(member.memberId) : Number(membership.memberId),
        expectedAmount: Number(membership.monthlyContributionAmount || 0),
        postedAmount,
        status: postedAmount > 0 ? 'POSTED' as const : 'PENDING' as const,
        contributedAt: latestEntry?.contributedAt || ''
      };
    }).sort((left, right) => left.memberName.localeCompare(right.memberName));
  }

  get hasExistingContributionForSelectedMonth(): boolean {
    if (!this.currentMembership || !this.contributionForm.contributionMonth) {
      return false;
    }

    return this.groupContributionEntries.some(entry => {
      return entry.membershipId === this.currentMembership?.id && entry.contributionMonth === this.contributionForm.contributionMonth;
    });
  }

  get hasExistingPendingContributionRequestForSelectedMonth(): boolean {
    if (!this.currentMembership || !this.contributionForm.contributionMonth) {
      return false;
    }

    return this.pendingContributionRequests.some((request) =>
      request.membershipId === this.currentMembership?.id
      && request.contributionMonth === this.contributionForm.contributionMonth
      && request.status === 'PENDING_CONFIRMATION'
    );
  }


  // Add these properties with your other properties (around line 89)
isRepaymentBoardExpanded = true; // For retractable repayment board

// Add this method with your other methods (around line 115)
toggleRepaymentBoard(): void {
  this.isRepaymentBoardExpanded = !this.isRepaymentBoardExpanded;
}

// Add these helper methods for the repayment schedule
getLoanByBorrowerRow(borrower: GroupBorrowerRow): CooperativeLoan | null {
  return this.groupLoans.find(loan => 
    String(loan.loanCode || loan.loanId || loan.id) === borrower.loanId
  ) || null;
}

getMemberByBorrowerRow(borrower: GroupBorrowerRow): CooperativeMember | null {
  return this.cooperativeService.getMemberById(borrower.memberId) || null;
}

  loadDashboard(): void {
    this.isLoading = true;
    this.actionMessage = '';

    this.cooperativeService.loadGroupById(Number(this.currentGroupId)).subscribe(group => {
      this.group = group;
      if (!this.group) {
        this.actionMessage = 'This group could not be found.';
        this.isLoading = false;
        return;
      }

      forkJoin({
        members: this.cooperativeService.getMembers(),
        memberships: this.cooperativeService.loadGroupMemberships(),
        contributions: this.cooperativeService.loadContributionEntries(),
        loans: this.cooperativeService.getLoans(),
        groups: this.cooperativeService.refreshGroups()
      }).subscribe(({ loans, groups }) => {
        const hydratedGroup = groups.find((item) => Number(item.id) === Number(this.currentGroupId));
        if (hydratedGroup) {
          this.group = this.mergeGroupRecords(this.group, hydratedGroup);
        }

        this.groupMemberships = this.cooperativeService.getGroupMemberships()
          .filter(item => String(item.groupId) === this.currentGroupId && item.status === 'ACTIVE')
          .sort((a, b) => new Date(b.joinedAt || b.requestedAt || '').getTime() - new Date(a.joinedAt || a.requestedAt || '').getTime());

        this.groupMembers = this.groupMemberships
          .map(item => this.cooperativeService.getMemberById(item.memberId))
          .filter((member): member is CooperativeMember => !!member);

        this.groupContributionEntries = this.cooperativeService.getContributionEntriesByGroup(Number(this.currentGroupId));
        this.pendingContributionRequests = this.cooperativeService.getPendingContributionRequestsByGroup(Number(this.currentGroupId));

        this.currentMember = this.cooperativeService.getMemberById(Number(this.currentMemberId));
        this.currentMembership = this.groupMemberships.find(item => item.memberId === this.currentMember?.id);
        this.refreshCurrentMemberFromBackend();

        this.recentJoiners = this.buildRecentJoinerRows();

        this.contributionRows = this.groupMemberships.map(membership => {
          const member = this.cooperativeService.getMemberById(membership.memberId);
          const totalContribution = this.groupContributionEntries
            .filter(entry => entry.membershipId === membership.id)
            .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

          return {
            memberId: Number(membership.memberId),
            memberName: this.cooperativeService.getMemberDisplayName(membership.memberId),
            memberCode: member?.memberId ? Number(member.memberId) : Number(membership.memberId),
            monthlyContribution: Number(membership.monthlyContributionAmount || 0),
            totalContribution: totalContribution || Number(membership.totalContribution || 0),
            joinedAt: membership.joinedAt || membership.requestedAt || member?.joinDate || ''
          };
        });
        this.groupMemberRosterRows = this.buildGroupMemberRosterRows();

        this.contributionHistory = this.buildContributionHistory();
        this.selectedContributionMonth = this.contributionMonthOptions[0]?.value || this.getDefaultContributionMonth();

        this.groupLoans = loans.filter(loan => String(loan.groupId || loan.cooperativeGroupId || '') === this.currentGroupId);
        this.borrowerRows = this.groupLoans
          .filter(loan => loan.status !== 'REJECTED' && loan.status !== 'PENDING')
          .map(loan => this.toBorrowerRow(loan))
          .sort((a, b) => b.progressPercent - a.progressPercent);

        this.activityFeed = this.buildActivityFeed();

        this.isLoading = false;
      });
    });
  }

  private buildContributionHistory(monthCount = 6): ContributionHistoryPoint[] {
    const now = new Date();
    const points: ContributionHistoryPoint[] = [];

    for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
      const periodDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const monthKey = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`;
      const monthEntries = this.groupContributionEntries.filter(entry => entry.contributionMonth === monthKey);
      const activeContributorIds = new Set(monthEntries.map(entry => entry.memberId));
      const totalContribution = monthEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      
      points.push({
        monthKey,
        monthLabel: this.getContributionMonthLabel(monthKey),
        totalContribution,
        activeContributorCount: activeContributorIds.size
      });
    }

    return points;
  }

  /**
   * Builds the activity feed for the group dashboard
   * Combines member join activities, loan activities, repayments, and contributions
   */
  private buildActivityFeed(): GroupActivityItem[] {
    const activities: GroupActivityItem[] = [];

    // Add member join activities
    this.groupMemberships.forEach(membership => {
      const member = this.cooperativeService.getMemberById(membership.memberId);
      if (member) {
        activities.push({
          id: `join-${membership.id}`,
          type: 'join',
          title: 'New Member Joined',
          description: `${this.cooperativeService.getMemberDisplayName(membership.memberId)} joined the group.`,
          occurredAt: membership.joinedAt || membership.requestedAt || member.joinDate || new Date().toISOString()
        });
      }
    });

    // Add loan activities
    this.groupLoans.forEach(loan => {
      const member = this.cooperativeService.getMemberById(Number(loan.memberId ?? loan.cooperativeMemberId ?? 0));
      const memberName = this.cooperativeService.getMemberDisplayName(Number(loan.memberId ?? loan.cooperativeMemberId ?? 0));
      if (loan.status === 'COMPLETED') {
        activities.push({
          id: `loan-completed-${loan.id}`,
          type: 'completion',
          title: 'Loan Completed',
          description: `${memberName} completed repayment for loan ${String(loan.loanCode || loan.loanId || loan.id)}.`,
          occurredAt: this.dateToString(loan.completedDate) || this.dateToString(loan.completionDate) || this.dateToString(loan.disbursedDate) || loan.applicationDate || loan.requestDate || new Date().toISOString()
        });
      } else if (loan.status === 'ACTIVE' && loan.disbursedDate) {
        activities.push({
          id: `loan-active-${loan.id}`,
          type: 'loan',
          title: 'Loan Disbursed',
          description: `${memberName} received a loan of ${this.formatCurrency(loan.amount)}.`,
          occurredAt: this.dateToString(loan.disbursedDate) || loan.applicationDate || loan.requestDate || new Date().toISOString()
        });
      } else if (loan.status === 'APPROVED') {
        activities.push({
          id: `loan-approved-${loan.id}`,
          type: 'loan',
          title: 'Loan Approved',
          description: `${memberName}'s loan application was approved.`,
          occurredAt: this.dateToString(loan.approvedDate) || loan.applicationDate || loan.requestDate || new Date().toISOString()
        });
      }
    });

    // Add repayment activities
    this.groupLoans.forEach(loan => {
      const memberName = this.cooperativeService.getMemberDisplayName(Number(loan.memberId ?? loan.cooperativeMemberId ?? 0));
      const repayments = this.cooperativeService.getRepaymentsByLoanId(Number(loan.id));
      repayments.forEach(repayment => {
        if (repayment.status === 'PAID' && repayment.paidDate) {
          activities.push({
            id: `repayment-${repayment.id}`,
            type: 'repayment',
            title: 'Repayment Made',
            description: `${memberName} made a repayment of ${this.formatCurrency(repayment.amount)}.`,
            occurredAt: repayment.paidDate
          });
        } else if (repayment.status === 'OVERDUE') {
          activities.push({
            id: `repayment-overdue-${repayment.id}`,
            type: 'repayment',
            title: 'Overdue Payment',
            description: `${memberName}'s repayment of ${this.formatCurrency(repayment.amount)} is overdue.`,
            occurredAt: repayment.dueDate
          });
        }
      });
    });

    // Add contribution activities
    this.groupContributionEntries.forEach(entry => {
      const member = this.cooperativeService.getMemberById(entry.memberId);
      if (member) {
        activities.push({
          id: `contribution-${entry.id}`,
          type: 'contribution',
          title: 'Contribution Posted',
          description: `${this.cooperativeService.getMemberDisplayName(entry.memberId)} contributed ${this.formatCurrency(entry.amount)} for ${this.getContributionMonthLabel(entry.contributionMonth)}.`,
          occurredAt: entry.contributedAt
        });
      }
    });

    // Sort by date (most recent first) and limit to 15 activities
    return activities
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 15);
  }

  openContributionModal(): void {
    if (!this.canPostContribution || !this.currentMembership) {
      return;
    }

    this.contributionError = '';
    this.isContributionModalOpen = true;
    this.contributionForm = {
      amount: Number(this.currentMembership.monthlyContributionAmount || 0),
      contributionMonth: this.getDefaultContributionMonth(),
      paymentMethod: 'BANK_TRANSFER'
    };
  }

  closeContributionModal(): void {
    this.isContributionModalOpen = false;
    this.isSubmittingContribution = false;
    this.contributionError = '';
  }

  submitContribution(): void {
    if (!this.currentMembership) {
      this.contributionError = 'Your active membership could not be found.';
      return;
    }

    if (this.hasExistingContributionForSelectedMonth) {
      this.contributionError = 'A contribution has already been posted for this month.';
      return;
    }

    const amount = Number(this.contributionForm.amount || 0);
    const contributionMonth = String(this.contributionForm.contributionMonth || '').trim();
    const paymentMethod = this.contributionForm.paymentMethod;
    if (amount <= 0) {
      this.contributionError = 'Enter a valid contribution amount.';
      return;
    }

    if (!/^\d{4}-\d{2}$/.test(contributionMonth)) {
      this.contributionError = 'Select a valid contribution month.';
      return;
    }

    if (this.hasExistingPendingContributionRequestForSelectedMonth) {
      this.contributionError = 'A confirmation request for this month is already waiting for accounting review.';
      return;
    }

    if (!this.currentGroupAccountingEmail || !this.currentGroupContributionBankName || !this.currentGroupContributionAccount) {
      this.contributionError = 'This group is missing the accounting email or contribution bank details.';
      return;
    }

    this.isSubmittingContribution = true;
    this.contributionError = '';

    this.mailNotificationService.sendMail({
      name: 'Accounting Team',
      recieverEmail: this.currentGroupAccountingEmail,
      subject: `Contribution Confirmation Request - ${this.group?.name || 'Cooperative Group'} - ${this.getContributionMonthLabel(contributionMonth)}`,
      body: this.buildContributionConfirmationMailBody(amount, contributionMonth, paymentMethod)
    }).subscribe({
      next: () => {
        this.cooperativeService.createContributionConfirmationRequest(this.currentMembership!.id, {
          amount,
          contributionMonth,
          paymentMethod
        }).subscribe((request) => {
          this.isSubmittingContribution = false;
          if (!request) {
            this.contributionError = 'The contribution confirmation request could not be created. Check the month and try again.';
            return;
          }
          this.closeContributionModal();
          this.loadDashboard();
          this.actionMessageTone = 'success';
          this.actionMessage = `Contribution confirmation request sent for ${this.getContributionMonthLabel(contributionMonth)}.`;
        });
      },
      error: (err) => {
        this.isSubmittingContribution = false;
        let detail = 'The accounting confirmation email could not be sent. Please try again.';
        if (err && err.status === 403) {
          detail = 'Email notification failed due to authorization error. Please contact your administrator.';
        }
        this.contributionError = detail;
      }
    });
  }

  getPendingContributionRequestsForCurrentMember(): CooperativePendingContributionRequest[] {
    if (!this.currentMember) {
      return [];
    }

    return this.pendingContributionRequests.filter((request) => request.memberId === this.currentMember?.id);
  }

  getContributionRequestStatusClass(status: CooperativePendingContributionRequest['status']): string {
    return `request-${status.toLowerCase().replace(/_/g, '-')}`;
  }

  getContributionPaymentMethodLabel(paymentMethod: CooperativeContributionPaymentMethod): string {
    return paymentMethod.replace(/_/g, ' ');
  }

  private buildContributionConfirmationMailBody(
    amount: number,
    contributionMonth: string,
    paymentMethod: CooperativeContributionPaymentMethod
  ): string {
    const contributionMonthLabel = this.getContributionMonthLabel(contributionMonth);
    return `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">
        <p>Dear Accounting Team,</p>
        <p>A cooperative member has submitted a monthly contribution and is requesting payment confirmation.</p>
        <ul>
          <li><strong>Group:</strong> ${this.group?.name || 'Cooperative Group'}</li>
          <li><strong>Member:</strong> ${this.currentMemberDisplayName}</li>
          <li><strong>Member ID:</strong> ${this.currentMember?.memberId || this.currentMember?.id || this.currentMemberId || 'N/A'}</li>
          <li><strong>Contribution Month:</strong> ${contributionMonthLabel}</li>
          <li><strong>Amount:</strong> ${this.formatCurrency(amount)}</li>
          <li><strong>Payment Method:</strong> ${this.getContributionPaymentMethodLabel(paymentMethod)}</li>
          <li><strong>Contribution Bank:</strong> ${this.currentGroupContributionBankName}</li>
          <li><strong>Contribution Account:</strong> ${this.currentGroupContributionAccount}</li>
        </ul>
        <p>Please confirm the payment by updating the contribution record in the accounting workflow. The group contribution totals will update after confirmation.</p>
        <p>Regards,<br/><strong>Cooperative Member Portal</strong></p>
      </div>
    `;
  }

  private toBorrowerRow(loan: CooperativeLoan): GroupBorrowerRow {
    const memberId = Number(loan.memberId ?? loan.cooperativeMemberId ?? 0);
    const member = this.cooperativeService.getMemberById(memberId);
    const repayments = this.cooperativeService.getRepaymentsByLoanId(Number(loan.id));
    const totalPaid = repayments
      .filter(item => item.status === 'PAID')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const outstanding = this.getOutstandingAmount(loan, repayments);
    const progressPercent = this.getRepaymentProgressPercent(loan, totalPaid);
    const nextDueDate = this.getNextDueDate(repayments);
    const hasOverdueRepayment = repayments.some(item => item.status === 'OVERDUE');

    return {
      memberId,
      memberName: this.cooperativeService.getMemberDisplayName(memberId),
      loanId: String(loan.loanCode || loan.loanId || loan.id || ''),
      status: loan.status,
      amount: Number(loan.amount || 0),
      totalPaid,
      outstanding,
      progressPercent,
      repaymentStatus: hasOverdueRepayment ? 'Overdue' : loan.status === 'COMPLETED' ? 'Completed' : 'On Track',
      nextDueDate,
      hasOverdueRepayment
    };
  }

  private getOutstandingAmount(loan: CooperativeLoan, repayments: CooperativeRepayment[]): number {
    if (repayments.length === 0) {
      return Number(loan.amount || 0);
    }

    return repayments
      .filter(item => item.status !== 'PAID')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  private getRepaymentProgressPercent(loan: CooperativeLoan, totalPaid: number): number {
    const repaymentTarget = Number(loan.totalRepayment || 0);
    if (loan.status === 'COMPLETED') {
      return 100;
    }

    if (repaymentTarget <= 0) {
      return 0;
    }

    return Math.min(100, Math.max(0, Math.round((totalPaid / repaymentTarget) * 100)));
  }

  private getNextDueDate(repayments: CooperativeRepayment[]): string | null {
    const next = [...repayments]
      .filter(item => item.status !== 'PAID')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    return next?.dueDate || null;
  }

  private resolveCurrentMemberId(): string {
    const matched = this.cooperativeService.resolveCurrentSessionMember(this.cooperativeService.getMembersSnapshot());
    return matched ? String(matched.id) : '';
  }

  private syncMemberDisplayState(members: CooperativeMember[]): void {
    if (!this.group) {
      return;
    }

    const normalizedCurrentMemberId = Number(this.currentMember?.id || this.currentMember?.memberId || this.currentMember?.employeeId || this.currentMemberId || 0);
    const matchedCurrentMember = normalizedCurrentMemberId > 0
      ? members.find((member) =>
          Number(member.id || 0) === normalizedCurrentMemberId
          || Number(member.memberId || 0) === normalizedCurrentMemberId
          || Number(member.employeeId || 0) === normalizedCurrentMemberId
        )
      : this.cooperativeService.resolveCurrentSessionMember(members);

    if (matchedCurrentMember) {
      this.currentMember = matchedCurrentMember;
      this.currentMemberId = String(matchedCurrentMember.id || matchedCurrentMember.memberId || matchedCurrentMember.employeeId || this.currentMemberId);
      this.currentMembership = this.groupMemberships.find(item => item.memberId === matchedCurrentMember.id);
    }

    this.groupMembers = this.groupMemberships
      .map(item => this.cooperativeService.getMemberById(item.memberId))
      .filter((member): member is CooperativeMember => !!member);

    this.contributionRows = this.groupMemberships.map(membership => {
      const member = this.cooperativeService.getMemberById(membership.memberId);
      const totalContribution = this.groupContributionEntries
        .filter(entry => entry.membershipId === membership.id)
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

      return {
        memberId: Number(membership.memberId),
        memberName: this.getMemberDisplayName(membership.memberId),
        memberCode: member?.memberId ? Number(member.memberId) : Number(membership.memberId),
        monthlyContribution: Number(membership.monthlyContributionAmount || 0),
        totalContribution: totalContribution || Number(membership.totalContribution || 0),
        joinedAt: membership.joinedAt || membership.requestedAt || member?.joinDate || ''
      };
    });
    this.groupMemberRosterRows = this.buildGroupMemberRosterRows();

    this.recentJoiners = this.buildRecentJoinerRows();

    this.borrowerRows = this.groupLoans
      .filter(loan => loan.status !== 'REJECTED' && loan.status !== 'PENDING')
      .map(loan => this.toBorrowerRow(loan))
      .sort((a, b) => b.progressPercent - a.progressPercent);

    this.activityFeed = this.buildActivityFeed();

    if (!this.selectedContributionMonth || !this.contributionMonthOptions.some((option) => option.value === this.selectedContributionMonth)) {
      this.selectedContributionMonth = this.contributionMonthOptions[0]?.value || this.getDefaultContributionMonth();
    }
  }

  private refreshCurrentMemberFromBackend(): void {
    const memberId = Number(this.currentMember?.id || this.currentMember?.memberId || this.currentMember?.employeeId || 0);
    if (!Number.isFinite(memberId) || memberId <= 0) {
      return;
    }

    this.cooperativeService.loadMemberById(memberId).subscribe({
      next: (member) => {
        if (!member) {
          return;
        }

        this.currentMember = member;
        this.currentMemberId = String(member.id || member.memberId || member.employeeId || this.currentMemberId);
        this.syncMemberDisplayState(this.cooperativeService.getMembersSnapshot());
      },
      error: (error) => {
        console.error('Failed to refresh current group member from backend:', error);
      }
    });
  }

  private buildGroupMemberRosterRows(): GroupMemberRosterRow[] {
    return this.groupMemberships.map((membership) => {
      const member = this.cooperativeService.getMemberById(membership.memberId);
      const fallbackMemberId = Number(membership.memberId || 0);

      return {
        memberRecordId: Number(member?.id || fallbackMemberId),
        memberName: this.getMemberDisplayName(membership.memberId),
        memberCode: member?.memberId ? Number(member.memberId) : fallbackMemberId,
        membershipId: Number(membership.id || 0),
        joinedAt: membership.joinedAt || membership.requestedAt || member?.joinDate || ''
      };
    }).sort((left, right) => left.memberName.localeCompare(right.memberName));
  }

  private buildRecentJoinerRows(): GroupRecentJoinerRow[] {
    return this.groupMemberships
      .map((membership) => {
        const member = this.cooperativeService.getMemberById(membership.memberId);
        const joinedAt = membership.joinedAt || membership.requestedAt || member?.joinDate || '';

        return {
          memberId: Number(member?.memberId || membership.memberId || 0),
          fullName: this.getMemberDisplayName(membership.memberId),
          email: String(member?.email || '').trim(),
          joinedAt
        };
      })
      .sort((left, right) => new Date(right.joinedAt || 0).getTime() - new Date(left.joinedAt || 0).getTime())
      .slice(0, 5);
  }

  private mergeGroupRecords(
    primary?: CooperativeLoanGroup | null,
    secondary?: CooperativeLoanGroup | null
  ): CooperativeLoanGroup | undefined {
    if (!primary && !secondary) {
      return undefined;
    }

    if (!primary) {
      return secondary || undefined;
    }

    if (!secondary) {
      return primary;
    }

    const preferString = (first?: string, second?: string): string => {
      const primaryValue = String(first || '').trim();
      if (primaryValue) {
        return primaryValue;
      }
      return String(second || '').trim();
    };

    const preferNumber = (first?: number, second?: number): number => {
      if (Number.isFinite(Number(first))) {
        return Number(first);
      }
      return Number(second || 0);
    };

    return {
      ...secondary,
      ...primary,
      code: preferString(primary.code, secondary.code),
      name: preferString(primary.name, secondary.name),
      description: preferString(primary.description, secondary.description),
      contributionsBankName: preferString(primary.contributionsBankName, secondary.contributionsBankName),
      contributionsAccount: preferString(primary.contributionsAccount, secondary.contributionsAccount),
      principalBankName: preferString(primary.principalBankName, secondary.principalBankName),
      principalCollectionAccount: preferString(primary.principalCollectionAccount, secondary.principalCollectionAccount),
      interestBankName: preferString(primary.interestBankName, secondary.interestBankName),
      interestCollectionAccount: preferString(primary.interestCollectionAccount, secondary.interestCollectionAccount),
      lateFeeBankName: preferString(primary.lateFeeBankName, secondary.lateFeeBankName),
      lateFeeCollectionAccount: preferString(primary.lateFeeCollectionAccount, secondary.lateFeeCollectionAccount),
      accountingEmail: preferString(primary.accountingEmail, secondary.accountingEmail),
      accountingWebhookUrl: preferString(primary.accountingWebhookUrl, secondary.accountingWebhookUrl),
      monthlyContributionAmount: preferNumber(primary.monthlyContributionAmount, secondary.monthlyContributionAmount),
      interestRate: preferNumber(primary.interestRate, secondary.interestRate),
      minDuration: preferNumber(primary.minDuration, secondary.minDuration),
      maxDuration: preferNumber(primary.maxDuration, secondary.maxDuration),
      lateFeePercentage: preferNumber(primary.lateFeePercentage, secondary.lateFeePercentage),
      lateFeeGraceDays: preferNumber(primary.lateFeeGraceDays, secondary.lateFeeGraceDays)
    };
  }

  clearMemberDirectoryQuery(): void {
    this.memberDirectoryQuery = '';
  }

  openMemberDirectoryModal(): void {
    this.showMemberDirectoryModal = true;
  }

  closeMemberDirectoryModal(): void {
    this.showMemberDirectoryModal = false;
  }

  viewMemberProfile(memberId: number): void {
    if (!Number.isFinite(memberId) || memberId <= 0) {
      return;
    }

    this.router.navigate([`/admin/hr/cooperative/members/${memberId}/${this.currentUuid}`], {
      queryParams: { dashboard: 'cooperative', source: 'group-dashboard', groupId: this.currentGroupId }
    });
  }

  private getSafeDisplayName(primaryName?: string | null, secondaryName?: string | null, fallbackName = 'Cooperative Member'): string {
    const candidates = [primaryName, secondaryName, this.currentMember?.fullName, sessionStorage.getItem('fullname'), sessionStorage.getItem('username')]
      .map((value) => String(value || '').trim())
      .filter((value) => value && !this.invalidDisplayNamePattern.test(value));

    return candidates[0] || fallbackName;
  }

  openMemberLoanHistory(memberId: string): void {
    this.router.navigate(['/admin/hr/loan-management/employee-loan-history', memberId, this.currentUuid], {
      state: {
        source: 'employee',
        cooperative: true,
        uuid: this.currentUuid,
        groupId: Number(this.currentGroupId || 0) || undefined,
        returnSource: 'group-dashboard'
      }
    });
  }

  goBack(): void {
    this.backNavigationService.goBack(
      ['/member/cooperative/dashboard', this.currentUuid],
      {
        state: {
          memberId: Number(this.currentMember?.id || this.currentMemberId || 0) || undefined,
          source: 'group-dashboard'
        }
      }
    );
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  private dateToString(date: Date | string | undefined): string | undefined {
    if (!date) return undefined;
    if (date instanceof Date) {
      return date.toISOString();
    }
    return date;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
  }

  getRepaymentStatusClass(status: string): string {
    return `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
  }

  getActivityIconClass(type: GroupActivityItem['type']): string {
    if (type === 'join') {
      return 'fas fa-user-plus';
    }

    if (type === 'contribution') {
      return 'fas fa-piggy-bank';
    }

    if (type === 'repayment') {
      return 'fas fa-credit-card';
    }

    if (type === 'completion') {
      return 'fas fa-flag-checkered';
    }

    return 'fas fa-hand-holding-dollar';
  }

  isCurrentMember(memberId: number): boolean {
    return !!this.currentMember && String(this.currentMember.id) === String(memberId);
  }

  canViewBorrowerAmounts(row: GroupBorrowerRow): boolean {
    return this.isCurrentMember(row.memberId);
  }

  getDefaultContributionMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  public getContributionMonthLabel(monthKey: string): string {
    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      return 'selected';
    }

    const [year, month] = monthKey.split('-').map(value => Number(value));
    return new Date(year, month - 1, 1).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }

  private normalizeDirectoryQuery(value: string | number | null | undefined): string {
    return String(value ?? '').trim().toLowerCase();
  }

  public formatMemberId(memberId: number | string | undefined): string {
    const idNum = Number(memberId);
    if (!idNum || isNaN(idNum)) return 'N/A';
    return `COP-${idNum.toString().padStart(3, '0')}`;
  }

  public formatMembershipId(
    membershipId: number | string | undefined,
    groupCode?: string,
    memberCode?: number | string
  ): string {
    if (!membershipId || !groupCode || !memberCode) return '';
    const alphaPart = groupCode.split('-')[0];
    return `${alphaPart}-${memberCode}-${membershipId}`;
  }
}
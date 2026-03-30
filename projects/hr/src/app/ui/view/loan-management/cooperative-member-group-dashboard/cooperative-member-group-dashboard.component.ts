import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import { TableColumn } from '../../../shared-component/view/table/table.component';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import {
  CooperativeContributionEntry,
  CooperativeGroupMembership,
  CooperativeLoanGroup,
  CooperativeMember,
  CooperativeRepayment
} from '../../../service/loan/cooperative-loan/cooperative.types';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';

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
  styleUrls: ['./cooperative-member-group-dashboard.component.scss']
})
export class CooperativeMemberGroupDashboardComponent implements OnInit {
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
  isLoading = true;
  actionMessage = '';
  actionMessageTone: 'error' | 'success' = 'error';
  isContributionModalOpen = false;
  isSubmittingContribution = false;
  contributionForm = {
    amount: 0,
    contributionMonth: ''
  };
  contributionError = '';

  group?: CooperativeLoanGroup;
  currentMember?: CooperativeMember;
  currentMembership?: CooperativeGroupMembership;
  groupMemberships: CooperativeGroupMembership[] = [];
  groupMembers: CooperativeMember[] = [];
  groupLoans: CooperativeLoan[] = [];
  groupContributionEntries: CooperativeContributionEntry[] = [];
  borrowerRows: GroupBorrowerRow[] = [];
  contributionRows: GroupContributionRow[] = [];
  recentJoiners: CooperativeMember[] = [];
  contributionHistory: ContributionHistoryPoint[] = [];
  activityFeed: GroupActivityItem[] = [];

  readonly contributionColumns: TableColumn<GroupContributionRow>[] = [
    { header: 'Member', field: 'memberName' },
    { header: 'Code', field: 'memberCode' },
    { header: 'Monthly', formatter: row => this.formatCurrency(row.monthlyContribution) },
    { header: 'Total', formatter: row => this.formatCurrency(row.totalContribution) },
    { header: 'Joined', formatter: row => row.joinedAt ? new Date(row.joinedAt).toLocaleDateString('en-US') : '—' }
  ];

  readonly recentJoinerColumns: TableColumn<CooperativeMember>[] = [
    { header: 'Member', field: 'fullName' },
    { header: 'Member ID', field: 'memberId' },
    { header: 'Email', field: 'email' },
    { header: 'Joined', formatter: row => row.joinDate ? new Date(row.joinDate).toLocaleDateString('en-US') : '—' }
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly cooperativeService: CooperativeService,
    private readonly backNavigationService: BackNavigationService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.currentUuid = params['uuid'] || this.currentUuid;
      this.currentGroupId = params['groupId'] || this.currentGroupId;
      this.currentMemberId = String(window.history.state?.memberId || '').trim() || this.resolveCurrentMemberId();
      this.loadDashboard();
    });
  }

  get totalMembers(): number {
    return this.groupMembers.length;
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

  get hasExistingContributionForSelectedMonth(): boolean {
    if (!this.currentMembership || !this.contributionForm.contributionMonth) {
      return false;
    }

    return this.groupContributionEntries.some(entry => {
      return entry.membershipId === this.currentMembership?.id && entry.contributionMonth === this.contributionForm.contributionMonth;
    });
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

      this.groupMemberships = this.cooperativeService.getGroupMemberships()
        .filter(item => String(item.groupId) === this.currentGroupId && item.status === 'ACTIVE')
        .sort((a, b) => new Date(b.joinedAt || b.requestedAt || '').getTime() - new Date(a.joinedAt || a.requestedAt || '').getTime());

      this.groupMembers = this.groupMemberships
        .map(item => this.cooperativeService.getMemberById(item.memberId))
        .filter((member): member is CooperativeMember => !!member);

      this.groupContributionEntries = this.cooperativeService.getContributionEntriesByGroup(Number(this.currentGroupId));

      this.currentMember = this.cooperativeService.getMemberById(Number(this.currentMemberId));
      this.currentMembership = this.groupMemberships.find(item => item.memberId === this.currentMember?.id);

      this.recentJoiners = [...this.groupMembers]
        .sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime())
        .slice(0, 5);

      this.contributionRows = this.groupMemberships.map(membership => {
        const member = this.cooperativeService.getMemberById(membership.memberId);
        const totalContribution = this.groupContributionEntries
          .filter(entry => entry.membershipId === membership.id)
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

        return {
          memberId: Number(membership.memberId),
          memberName: member?.fullName || 'Unknown member',
          memberCode: member?.memberId ? Number(member.memberId) : Number(membership.memberId),
          monthlyContribution: Number(membership.monthlyContributionAmount || 0),
          totalContribution: totalContribution || Number(membership.totalContribution || 0),
          joinedAt: membership.joinedAt || membership.requestedAt || member?.joinDate || ''
        };
      });

      this.contributionHistory = this.buildContributionHistory();

      this.cooperativeService.getLoans().subscribe(loans => {
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
          description: `${member.fullName} joined the group.`,
          occurredAt: membership.joinedAt || membership.requestedAt || member.joinDate || new Date().toISOString()
        });
      }
    });

    // Add loan activities
    this.groupLoans.forEach(loan => {
      const member = this.cooperativeService.getMemberById(Number(loan.memberId ?? loan.cooperativeMemberId ?? 0));
      if (loan.status === 'COMPLETED') {
        activities.push({
          id: `loan-completed-${loan.id}`,
          type: 'completion',
          title: 'Loan Completed',
          description: `${member?.fullName || 'A member'} completed repayment for loan ${String(loan.loanCode || loan.loanId || loan.id)}.`,
          occurredAt: loan.completedDate || loan.completionDate || loan.disbursedDate || loan.applicationDate || loan.requestDate || new Date().toISOString()
        });
      } else if (loan.status === 'ACTIVE' && loan.disbursedDate) {
        activities.push({
          id: `loan-active-${loan.id}`,
          type: 'loan',
          title: 'Loan Disbursed',
          description: `${member?.fullName || 'A member'} received a loan of ${this.formatCurrency(loan.amount)}.`,
          occurredAt: loan.disbursedDate || loan.applicationDate || loan.requestDate || new Date().toISOString()
        });
      } else if (loan.status === 'APPROVED') {
        activities.push({
          id: `loan-approved-${loan.id}`,
          type: 'loan',
          title: 'Loan Approved',
          description: `${member?.fullName || 'A member'}'s loan application was approved.`,
          occurredAt: loan.approvedDate || loan.applicationDate || loan.requestDate || new Date().toISOString()
        });
      }
    });

    // Add repayment activities
    this.groupLoans.forEach(loan => {
      const member = this.cooperativeService.getMemberById(Number(loan.memberId ?? loan.cooperativeMemberId ?? 0));
      const repayments = this.cooperativeService.getRepaymentsByLoanId(Number(loan.id));
      repayments.forEach(repayment => {
        if (repayment.status === 'PAID' && repayment.paidDate) {
          activities.push({
            id: `repayment-${repayment.id}`,
            type: 'repayment',
            title: 'Repayment Made',
            description: `${member?.fullName || 'A member'} made a repayment of ${this.formatCurrency(repayment.amount)}.`,
            occurredAt: repayment.paidDate
          });
        } else if (repayment.status === 'OVERDUE') {
          activities.push({
            id: `repayment-overdue-${repayment.id}`,
            type: 'repayment',
            title: 'Overdue Payment',
            description: `${member?.fullName || 'A member'}'s repayment of ${this.formatCurrency(repayment.amount)} is overdue.`,
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
          description: `${member.fullName} contributed ${this.formatCurrency(entry.amount)} for ${this.getContributionMonthLabel(entry.contributionMonth)}.`,
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
      contributionMonth: this.getDefaultContributionMonth()
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
    if (amount <= 0) {
      this.contributionError = 'Enter a valid contribution amount.';
      return;
    }

    if (!/^\d{4}-\d{2}$/.test(contributionMonth)) {
      this.contributionError = 'Select a valid contribution month.';
      return;
    }

    this.isSubmittingContribution = true;
    this.contributionError = '';

    const entry = this.cooperativeService.recordGroupContribution(this.currentMembership.id, {
      amount,
      contributionMonth,
      contributedAt: new Date().toISOString()
    });

    this.isSubmittingContribution = false;

    if (!entry) {
      this.contributionError = 'The contribution could not be posted. Check the month and try again.';
      return;
    }

    this.closeContributionModal();
    this.loadDashboard();
    this.actionMessageTone = 'success';
    this.actionMessage = `Contribution posted for ${this.getContributionMonthLabel(contributionMonth)}.`;
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
      memberName: member?.fullName || 'Unknown member',
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
    const members = this.cooperativeService.getMembersSnapshot();
    const sessionUserId = String(sessionStorage.getItem('userid') || '').trim();
    const sessionUsername = String(sessionStorage.getItem('username') || '').trim().toLowerCase();
    const userRegDataRaw = sessionStorage.getItem('userRegData');
    const userRegData = userRegDataRaw ? JSON.parse(userRegDataRaw) : null;
    const regEmail = String(userRegData?.email || '').trim().toLowerCase();

    const matched = members.find(member => {
      const memberId = String(member.id || '').trim();
      const memberCode = String(member.memberId || '').trim();
      const memberEmail = String(member.email || '').trim().toLowerCase();
      const memberName = String(member.fullName || '').trim().toLowerCase();

      if (sessionUserId && (memberId === sessionUserId || memberCode === sessionUserId)) {
        return true;
      }

      if (regEmail && memberEmail === regEmail) {
        return true;
      }

      if (sessionUsername && (memberEmail === sessionUsername || memberName === sessionUsername)) {
        return true;
      }

      return false;
    });

    return matched ? String(matched.id) : '';
  }

  openMemberLoanHistory(memberId: string): void {
    this.router.navigate(['/admin/hr/loan-management/employee-loan-history', memberId, this.currentUuid], {
      state: { source: 'employee', cooperative: true, uuid: this.currentUuid }
    });
  }

  goBack(): void {
    this.backNavigationService.goBack(['/member/cooperative/dashboard', this.currentUuid]);
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
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
}
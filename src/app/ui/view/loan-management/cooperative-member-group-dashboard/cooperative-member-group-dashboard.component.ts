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
  memberId: string;
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
  memberId: string;
  memberName: string;
  memberCode: string;
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
    private readonly cooperativeService: CooperativeService,
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

    this.group = this.cooperativeService.getGroupById(this.currentGroupId);
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

    this.groupContributionEntries = this.cooperativeService.getContributionEntriesByGroup(this.currentGroupId);

    this.currentMember = this.cooperativeService.getMemberById(this.currentMemberId);
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
        memberId: membership.memberId,
        memberName: member?.fullName || 'Unknown member',
        memberCode: member?.memberId || membership.memberId,
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
  }

  private buildContributionHistory(monthCount = 6): ContributionHistoryPoint[] {
    const now = new Date();
    const points: ContributionHistoryPoint[] = [];

    for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
      const periodDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const monthKey = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`;
      const monthEntries = this.groupContributionEntries.filter(entry => entry.contributionMonth === monthKey);
      const activeContributorIds = new Set(monthEntries.map(entry => entry.memberId));

      points.push({
        monthKey,
        monthLabel: periodDate.toLocaleString('en-US', { month: 'short' }),
        totalContribution: monthEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
        activeContributorCount: activeContributorIds.size
      });
    }

    return points;
  }

  private buildActivityFeed(): GroupActivityItem[] {
    const joinActivities = this.groupMemberships
      .map(membership => {
        const member = this.cooperativeService.getMemberById(membership.memberId);
        return {
          id: `join-${membership.id}`,
          type: 'join' as const,
          title: 'Member Joined Group',
          description: `${member?.fullName || 'A member'} joined ${this.group?.name || 'this group'}.`,
          occurredAt: membership.reviewedAt || membership.joinedAt || membership.requestedAt || new Date().toISOString()
        };
      });

    const contributionActivities = this.groupContributionEntries.map(entry => {
      const member = this.cooperativeService.getMemberById(entry.memberId);
      const monthLabel = this.getContributionMonthLabel(entry.contributionMonth);

      return {
        id: `contribution-${entry.id}`,
        type: 'contribution' as const,
        title: 'Contribution Posted',
        description: this.isCurrentMember(String(member?.id || ''))
          ? `You posted your ${monthLabel} contribution.`
          : `${member?.fullName || 'A member'} posted a ${monthLabel} contribution.`,
        occurredAt: entry.contributedAt || new Date().toISOString()
      };
    });

    const repaymentActivities = this.groupLoans.flatMap(loan => {
      const member = this.cooperativeService.getMemberById(String(loan.memberId || loan.cooperativeMemberId || ''));
      return this.cooperativeService.getRepaymentsByLoanId(String(loan.id))
        .filter(repayment => !!repayment.paidDate)
        .map(repayment => ({
          id: `repayment-${repayment.id}`,
          type: 'repayment' as const,
          title: 'Repayment Received',
          description: this.isCurrentMember(String(member?.id || ''))
            ? `You made a repayment for ${String(loan.loanCode || loan.loanId || loan.id)}.`
            : `${member?.fullName || 'A member'} made a repayment in ${this.group?.name || 'the group'}.`,
          occurredAt: repayment.paidDate || new Date().toISOString()
        }));
    });

    const loanActivities = this.groupLoans.map(loan => {
      const member = this.cooperativeService.getMemberById(String(loan.memberId || loan.cooperativeMemberId || ''));
      const title = loan.status === 'COMPLETED' ? 'Loan Completed' : 'New Group Loan';
      const description = loan.status === 'COMPLETED'
        ? `${member?.fullName || 'A member'} completed repayment for ${String(loan.loanCode || loan.loanId || loan.id)}.`
        : `${member?.fullName || 'A member'} started a borrowing cycle in ${this.group?.name || 'the group'}.`;

      return {
        id: `loan-${loan.id}-${loan.status}`,
        type: loan.status === 'COMPLETED' ? 'completion' as const : 'loan' as const,
        title,
        description,
        occurredAt: loan.completedDate || loan.completionDate || loan.disbursedDate || loan.disbursedDate || loan.applicationDate || loan.requestDate || new Date().toISOString()
      };
    });

    return [...joinActivities, ...loanActivities, ...repaymentActivities, ...contributionActivities]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 8);
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
    const memberId = String(loan.memberId || loan.cooperativeMemberId || '');
    const member = this.cooperativeService.getMemberById(memberId);
    const repayments = this.cooperativeService.getRepaymentsByLoanId(String(loan.id));
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

    return matched?.id || '';
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

  isCurrentMember(memberId: string): boolean {
    return !!this.currentMember && this.currentMember.id === memberId;
  }

  canViewBorrowerAmounts(row: GroupBorrowerRow): boolean {
    return this.isCurrentMember(row.memberId);
  }

  getDefaultContributionMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private getContributionMonthLabel(monthKey: string): string {
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
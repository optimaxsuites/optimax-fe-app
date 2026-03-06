import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { EmployeeService } from '../../../service/employee.service';
import {
  CooperativeStats,
  CooperativeLoan,
  CooperativeMember,
  CooperativeNotification,
  CooperativeEmployeeProfile,
  CooperativeMembershipEligibility
} from '../../../service/loan/cooperative-loan/cooperative.types';

interface DashboardActivity {
  icon: string;
  message: string;
  time: string;
}

interface DashboardAlert {
  level: 'warning' | 'danger';
  message: string;
}

type PatronageDistributionMethod = 'ADD_TO_SHARES' | 'CASH_PAYOUT' | 'APPLY_TO_LOAN';

interface MemberPatronageRow {
  memberId: string;
  memberName: string;
  interestPaid: number;
  patronageAmount: number;
  distributionMethod: PatronageDistributionMethod;
  hasActiveLoan: boolean;
}

interface InviteCandidateRow {
  employee: CooperativeEmployeeProfile;
  eligibility: CooperativeMembershipEligibility;
}

@Component({
  selector: 'app-cooperative-dashboard',
  templateUrl: './cooperative-dashboard.component.html',
  styleUrls: ['./cooperative-dashboard.component.scss']
})
export class CooperativeDashboardComponent implements OnInit {
  stats!: CooperativeStats;
  recentLoans: CooperativeLoan[] = [];
  recentMembers: CooperativeMember[] = [];
  pendingApprovals: CooperativeLoan[] = [];
  notifications: CooperativeNotification[] = [];
  recentActivity: DashboardActivity[] = [];
  alerts: DashboardAlert[] = [];
  patronageEstimate = 0;
  showPatronageModal = false;
  patronageYear = 2024;
  patronageYearOptions: number[] = [];
  patronageRate = 20;
  totalInterestCollected = 0;
  totalToDistribute = 0;
  patronageRows: MemberPatronageRow[] = [];
  patronageMessage = '';
  isLoading = true;
  showApplicationModal = false;
  prefillMemberId: string | null = null;
  showLoanSummaryModal = false;
  selectedLoanForSummary: CooperativeLoan | null = null;
  employeeDirectory: CooperativeEmployeeProfile[] = [];
  inviteCandidates: InviteCandidateRow[] = [];
  selectedInviteEmployeeIds = new Set<string>();
  inviteMessage = '';

  private allLoans: CooperativeLoan[] = [];
  private allMembers: CooperativeMember[] = [];

  constructor(
    private location: Location,
    private cooperativeService: CooperativeService,
    private employeeService: EmployeeService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const openApplication = params.get('openApplication');
      this.prefillMemberId = params.get('memberId');

      if (openApplication === 'true') {
        this.showApplicationModal = true;
      }
    });

    this.loadDashboard();
    this.loadNotifications();
    this.loadEmployeeDirectory();
  }

  get unreadNotificationCount(): number {
    return this.notifications.filter(notification => !notification.read).length;
  }

  get defaultedLoansCount(): number {
    return this.allLoans.filter(loan => loan.status === 'DEFAULTED').length;
  }

  loadDashboard(): void {
    this.isLoading = true;

    // Get stats
    this.stats = this.cooperativeService.getStats();

    // Get recent loans
    this.cooperativeService.getLoans().subscribe(loans => {
      this.allLoans = [...loans];
      this.recentLoans = [...loans]
        .sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime())
        .slice(0, 5);

      this.pendingApprovals = loans
        .filter(loan => loan.status === 'PENDING')
        .sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime())
        .slice(0, 5);

      this.patronageEstimate = this.estimatePatronage();
      this.refreshPatronageYearOptions();
      this.refreshDashboardSignals();
    });

    // Get recent members
    this.cooperativeService.getMembers().subscribe(members => {
      this.allMembers = [...members];
      this.recentMembers = [...members]
        .sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime())
        .slice(0, 5);

      this.refreshDashboardSignals();
      this.refreshInviteCandidates();
      this.isLoading = false;
    });
  }

  get inviteCandidatesCount(): number {
    return this.inviteCandidates.length;
  }

  get isAllInviteCandidatesSelected(): boolean {
    return this.inviteCandidates.length > 0 && this.selectedInviteEmployeeIds.size === this.inviteCandidates.length;
  }

  loadNotifications(): void {
    this.cooperativeService.getNotifications().subscribe(notifications => {
      this.notifications = [...notifications]
        .filter(notification => notification.type === 'LOAN_PENDING_APPROVAL')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
    });

    this.cooperativeService.getNotificationsObservable().subscribe(notifications => {
      this.notifications = [...notifications]
        .filter(notification => notification.type === 'LOAN_PENDING_APPROVAL')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
    });
  }

  refreshDashboardSignals(): void {
    this.recentActivity = this.buildRecentActivity();
    this.alerts = this.buildAlerts();
  }

  buildRecentActivity(): DashboardActivity[] {
    const activities: DashboardActivity[] = [];
    const memberMap = new Map(this.allMembers.map(member => [member.id, member]));

    const latestLoan = this.recentLoans[0];
    if (latestLoan) {
      const member = memberMap.get(latestLoan.memberId);
      const product = this.cooperativeService.getProductById(latestLoan.productId);
      activities.push({
        icon: 'fas fa-file-signature',
        message: `${member?.fullName || 'A member'} applied for ${this.formatCurrency(latestLoan.amount)} (${product?.name || 'Loan'})`,
        time: this.getRelativeTime(latestLoan.applicationDate)
      });
    }

    const activeLoan = this.allLoans.find(loan => loan.status === 'ACTIVE');
    if (activeLoan) {
      const member = memberMap.get(activeLoan.memberId);
      activities.push({
        icon: 'fas fa-money-check-alt',
        message: `${member?.fullName || 'A member'} made payment of ${this.formatCurrency(activeLoan.monthlyRepayment)}`,
        time: '5h ago'
      });
    }

    const latestMember = this.recentMembers[0];
    if (latestMember) {
      activities.push({
        icon: 'fas fa-user-plus',
        message: `New member joined: ${latestMember.fullName}`,
        time: this.getRelativeTime(latestMember.joinDate)
      });
    }

    return activities;
  }

  buildAlerts(): DashboardAlert[] {
    const dashboardAlerts: DashboardAlert[] = [];

    const overdueCount = this.allLoans.filter(loan => this.isLoanOverdue(loan)).length;
    if (overdueCount > 0) {
      dashboardAlerts.push({
        level: 'danger',
        message: `${overdueCount} loan${overdueCount > 1 ? 's are' : ' is'} overdue and require immediate follow-up.`
      });
    }

    const availableFund = this.stats.totalFund - this.stats.loanPortfolio;
    if (availableFund < 100000) {
      dashboardAlerts.push({
        level: 'warning',
        message: `Low cooperative fund balance: ${this.formatCurrency(Math.max(availableFund, 0))} available for new disbursements.`
      });
    }

    if (this.pendingApprovals.length > 0) {
      dashboardAlerts.push({
        level: 'warning',
        message: `${this.pendingApprovals.length} pending approval${this.pendingApprovals.length > 1 ? 's need' : ' needs'} attention.`
      });
    }

    return dashboardAlerts;
  }

  isLoanOverdue(loan: CooperativeLoan): boolean {
    if (loan.status !== 'ACTIVE' || !loan.disbursementDate) {
      return false;
    }

    const disbursedAt = new Date(loan.disbursementDate).getTime();
    const now = Date.now();
    const durationMs = loan.duration * 30 * 24 * 60 * 60 * 1000;

    return now - disbursedAt > durationMs;
  }

  getRelativeTime(dateValue: string): string {
    const now = Date.now();
    const value = new Date(dateValue).getTime();
    const seconds = Math.max(0, Math.floor((now - value) / 1000));

    if (seconds < 60) {
      return 'just now';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    if (days === 1) {
      return 'yesterday';
    }

    return `${days}d ago`;
  }

  estimatePatronage(): number {
    return this.stats.loanPortfolio * 0.02;
  }

  navigateTo(path: string): void {
    if (path === 'apply') {
      this.showApplicationModal = true;
      return;
    }

    this.router.navigate([`/admin/hr/cooperative/${path}/${uuidV4()}`]);
  }

  closeApplicationModal(): void {
    this.showApplicationModal = false;
  }

  onApplicationSubmitted(): void {
    this.loadDashboard();
  }

  viewMember(id: string): void {
    this.router.navigate([`/admin/hr/cooperative/members/${id}/${uuidV4()}`]);
  }

  viewLoan(id: string): void {
    const loan = this.allLoans.find(item => item.id === id);
    if (!loan) {
      return;
    }

    this.selectedLoanForSummary = loan;
    this.showLoanSummaryModal = true;
  }

  closeLoanSummaryModal(): void {
    this.showLoanSummaryModal = false;
    this.selectedLoanForSummary = null;
  }

  getSelectedLoanMemberName(): string {
    if (!this.selectedLoanForSummary) {
      return '';
    }

    return this.getMemberName(this.selectedLoanForSummary.memberId);
  }

  getSelectedLoanProductName(): string {
    if (!this.selectedLoanForSummary) {
      return '';
    }

    return this.cooperativeService.getProductById(this.selectedLoanForSummary.productId)?.name || 'N/A';
  }

  openCooperativeApprovalForm(loan: CooperativeLoan): void {
    this.closeLoanSummaryModal();
    this.router.navigate([`/admin/hr/cooperative/loans/${loan.id}/${uuidV4()}`]);
  }

  reviewPendingApprovals(): void {
    this.router.navigate(['/admin/hr/cooperative/loans', uuidV4()], {
      queryParams: { status: 'PENDING' }
    });
  }

  disburseLoans(): void {
    this.router.navigate(['/admin/hr/cooperative/loans', uuidV4()], {
      queryParams: { status: 'APPROVED' }
    });
  }

  reviewDefaultedLoans(): void {
    this.router.navigate(['/admin/hr/cooperative/loans', uuidV4()], {
      queryParams: { status: 'DEFAULTED' }
    });
  }

  toggleInviteSelection(employeeId: string): void {
    if (this.selectedInviteEmployeeIds.has(employeeId)) {
      this.selectedInviteEmployeeIds.delete(employeeId);
      return;
    }

    this.selectedInviteEmployeeIds.add(employeeId);
  }

  isInviteSelected(employeeId: string): boolean {
    return this.selectedInviteEmployeeIds.has(employeeId);
  }

  selectAllInviteCandidates(): void {
    if (this.isAllInviteCandidatesSelected) {
      this.selectedInviteEmployeeIds.clear();
      return;
    }

    this.selectedInviteEmployeeIds = new Set(this.inviteCandidates.map(item => item.employee.employeeId));
  }

  inviteSelectedCandidates(): void {
    if (this.selectedInviteEmployeeIds.size === 0) {
      this.inviteMessage = 'Select at least one employee to invite.';
      return;
    }

    const selectedRows = this.inviteCandidates.filter(item => this.selectedInviteEmployeeIds.has(item.employee.employeeId));
    const successfulInvites = selectedRows
      .map(item => this.cooperativeService.inviteEmployee(item.employee))
      .filter(result => result.success).length;

    this.inviteMessage = `${successfulInvites} invite(s) processed successfully.`;
    this.selectedInviteEmployeeIds.clear();
    this.refreshInviteCandidates();
  }

  runPatronageCalculator(): void {
    this.patronageEstimate = this.estimatePatronage();
    this.patronageMessage = '';
    this.refreshPatronageYearOptions();
    this.showPatronageModal = true;
    this.calculatePatronage();
  }

  setPatronageYear(yearValue: number | string): void {
    const parsedYear = Number(yearValue);
    if (!Number.isFinite(parsedYear)) {
      return;
    }

    this.patronageYear = parsedYear;
    this.calculatePatronage();
  }

  closePatronageModal(): void {
    this.showPatronageModal = false;
  }

  calculatePatronage(): void {
    const loansById = new Map(this.allLoans.map(loan => [loan.id, loan]));
    const memberById = new Map(this.allMembers.map(member => [member.id, member]));
    const activeLoanMembers = new Set(this.allLoans.filter(loan => loan.status === 'ACTIVE').map(loan => loan.memberId));

    const paidRepayments = this.allLoans
      .flatMap(loan => this.cooperativeService.getRepaymentsByLoanId(loan.id))
      .filter(repayment => {
        if (!repayment.paidDate || repayment.status !== 'PAID') {
          return false;
        }

        return new Date(repayment.paidDate).getFullYear() === this.patronageYear;
      });

    const interestByMember = new Map<string, number>();

    paidRepayments.forEach(repayment => {
      const loan = loansById.get(repayment.loanId);
      if (!loan || !loan.totalRepayment) {
        return;
      }

      const interestRatio = Math.max((loan.totalRepayment - loan.amount) / loan.totalRepayment, 0);
      const interestPortion = Number((repayment.amount * interestRatio).toFixed(2));
      const previous = interestByMember.get(loan.memberId) || 0;
      interestByMember.set(loan.memberId, Number((previous + interestPortion).toFixed(2)));
    });

    this.totalInterestCollected = Number(
      Array.from(interestByMember.values()).reduce((sum, value) => sum + value, 0).toFixed(2)
    );
    this.totalToDistribute = Number((this.totalInterestCollected * (this.patronageRate / 100)).toFixed(2));

    this.patronageRows = Array.from(memberById.values())
      .map(member => {
        const interestPaid = interestByMember.get(member.id) || 0;
        const patronageAmount = Number((interestPaid * (this.patronageRate / 100)).toFixed(2));
        const hasActiveLoan = activeLoanMembers.has(member.id);
        return {
          memberId: member.id,
          memberName: member.fullName,
          interestPaid,
          patronageAmount,
          distributionMethod: hasActiveLoan ? 'APPLY_TO_LOAN' : 'ADD_TO_SHARES',
          hasActiveLoan
        } as MemberPatronageRow;
      })
      .filter(item => item.interestPaid > 0)
      .sort((a, b) => b.interestPaid - a.interestPaid);
  }

  onDistributionMethodChange(row: MemberPatronageRow, method: PatronageDistributionMethod): void {
    row.distributionMethod = method;
  }

  approvePatronageDistribution(): void {
    if (this.patronageRows.length === 0 || this.totalToDistribute <= 0) {
      this.patronageMessage = 'No patronage available to distribute for the selected year.';
      return;
    }

    this.patronageRows.forEach(row => {
      const member = this.allMembers.find(item => item.id === row.memberId);
      if (!member || row.patronageAmount <= 0) {
        return;
      }

      if (row.distributionMethod === 'ADD_TO_SHARES') {
        member.shareCapital = Number((member.shareCapital + row.patronageAmount).toFixed(2));
        this.cooperativeService.updateMember({ ...member });
        return;
      }

      if (row.distributionMethod === 'APPLY_TO_LOAN') {
        const result = this.cooperativeService.applyPatronageToMemberLoan(row.memberId, row.patronageAmount);
        if (result.appliedAmount <= 0) {
          member.shareCapital = Number((member.shareCapital + row.patronageAmount).toFixed(2));
          this.cooperativeService.updateMember({ ...member });
        }
        return;
      }
    });

    this.patronageMessage = `Patronage distribution approved for ${this.patronageRows.length} member(s).`;
    this.loadDashboard();
    this.calculatePatronage();
  }

  exportPatronageReport(): void {
    if (this.patronageRows.length === 0) {
      this.patronageMessage = 'No patronage data to export for the selected year.';
      return;
    }

    const headers = ['Member', 'Interest Paid', 'Patronage', 'Distribution Method'];
    const rows = this.patronageRows.map(item => [
      item.memberName,
      item.interestPaid.toFixed(2),
      item.patronageAmount.toFixed(2),
      this.getDistributionMethodLabel(item.distributionMethod)
    ]);

    const csvContent = [headers, ...rows]
      .map(line => line.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `patronage-distribution-${this.patronageYear}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  printPatronageReport(): void {
    window.print();
  }

  getDistributionMethodLabel(method: PatronageDistributionMethod): string {
    if (method === 'ADD_TO_SHARES') {
      return 'Add to Shares';
    }

    if (method === 'CASH_PAYOUT') {
      return 'Cash Payout';
    }

    return 'Apply to Loan';
  }

  private refreshPatronageYearOptions(): void {
    const currentYear = new Date().getFullYear();
    const yearSet = new Set<number>([currentYear]);

    this.allLoans.forEach(loan => {
      this.cooperativeService.getRepaymentsByLoanId(loan.id).forEach(repayment => {
        if (repayment.paidDate) {
          yearSet.add(new Date(repayment.paidDate).getFullYear());
        }
      });
    });

    this.patronageYearOptions = Array.from(yearSet).sort((a, b) => b - a);

    if (this.patronageYearOptions.length > 0 && !this.patronageYearOptions.includes(this.patronageYear)) {
      this.patronageYear = this.patronageYearOptions[0];
    }
  }

  goToPendingApproval(loanId: string): void {
    this.router.navigate([`/admin/hr/cooperative/loans/${loanId}/${uuidV4()}`]);
  }

  openNotification(notification: CooperativeNotification): void {
    if (!notification.read) {
      this.cooperativeService.markNotificationAsRead(notification.id);
    }

    this.router.navigate([`/admin/hr/cooperative/loans/${notification.loanId}/${uuidV4()}`]);
  }

  getMemberName(memberId: string): string {
    return this.allMembers.find(member => member.id === memberId)?.fullName || memberId;
  }

  getInviteTenureLabel(employee: CooperativeEmployeeProfile): string {
    const startDate = new Date(employee.employmentStartDate);
    const now = new Date();
    let months = (now.getFullYear() - startDate.getFullYear()) * 12;
    months += now.getMonth() - startDate.getMonth();
    if (now.getDate() < startDate.getDate()) {
      months -= 1;
    }

    return `${Math.max(months, 0)}mo`;
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  private loadEmployeeDirectory(): void {
    this.employeeService.getAllEmployee().subscribe({
      next: (data) => {
        const rawEmployees = Array.isArray(data)
          ? data : []
          

        this.employeeDirectory = rawEmployees
          .map((employee: any) => this.mapEmployeeToProfile(employee))
          .filter((employee: CooperativeEmployeeProfile | null): employee is CooperativeEmployeeProfile => !!employee);

        this.refreshInviteCandidates();
      },
      error: () => {
        this.employeeDirectory = [];
        this.refreshInviteCandidates();
      }
    });
  }

  private refreshInviteCandidates(): void {
    const memberEmails = new Set(this.allMembers.map(member => member.email.toLowerCase()));
    this.inviteCandidates = this.employeeDirectory
      .map(employee => ({
        employee,
        eligibility: this.cooperativeService.checkMembershipEligibility(employee)
      }))
      .filter(item =>
        item.employee.rank === 'JUNIOR' &&
        item.eligibility.canBeInvited &&
        !memberEmails.has(item.employee.email.toLowerCase())
      );
  }

  private mapEmployeeToProfile(employee: any): CooperativeEmployeeProfile | null {
    const firstName = String(employee?.firstName || '').trim();
    const lastName = String(employee?.lastName || '').trim();
    const fallbackName = String(employee?.fullName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim() || fallbackName;
    const email = String(employee?.email || employee?.workEmail || '').trim();

    if (!fullName || !email) {
      return null;
    }

    const employeeId = String(employee?.id ?? employee?.employeeId ?? employee?.staffId ?? '');
    if (!employeeId) {
      return null;
    }

    const departmentName =
      String(employee?.department?.name || employee?.department || employee?.unit || '').trim() || 'Unassigned';

    const levelName = String(employee?.level?.name || employee?.level || employee?.jobTitle || '').trim();
    const employmentTypeName = String(
      employee?.employmentType?.name || employee?.employmentType || employee?.jobType?.name || employee?.jobType || ''
    ).trim();

    const employmentStartDate =
      employee?.employementStartDate || employee?.employmentStartDate || employee?.hireDate || employee?.createdAt;

    return {
      employeeId,
      fullName,
      email,
      phone: String(employee?.phone || '').trim(),
      department: departmentName,
      rank: this.mapRank(levelName),
      employmentType: this.mapEmploymentType(employmentTypeName),
      employmentStartDate: employmentStartDate || new Date().toISOString(),
      onProbation: Boolean(employee?.onProbation),
      probationEndDate: employee?.probationEndDate,
      hasActiveDisciplinaryIssue: Boolean(employee?.hasActiveDisciplinaryIssue || employee?.disciplinaryCaseOpen),
      managerId: String(employee?.supervisor?.id || employee?.supervisor || employee?.managerId || '').trim() || undefined
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

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/admin/hr/loan/uu']);
  }
}
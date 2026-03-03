import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeStats, CooperativeLoan, CooperativeMember, CooperativeNotification } from '../../../service/loan/cooperative-loan/cooperative.types';

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

  private allLoans: CooperativeLoan[] = [];
  private allMembers: CooperativeMember[] = [];

  constructor(
    private location: Location,
    private cooperativeService: CooperativeService,
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
      this.isLoading = false;
    });
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
    this.router.navigate([`/admin/hr/cooperative/loans/${id}/${uuidV4()}`]);
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

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/admin/hr/loan/uu']);
  }
}
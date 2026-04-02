// ...existing code...
import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication, PaymentRecord, RepaymentScheduleItem, StatusChange } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { EmployeeService } from '../../../service/employee.service';
import {
  compareLoanSortValues,
  formatLoanDepartmentDisplay,
  formatLoanPurposeDisplay,
  getLoanRepaymentStatusTitle,
  hasLoanBeenDisbursed,
  hasLoanRepaymentStarted,
  resolveCompletedLoanActor,
  resolveLoanActorName,
  resolveLoanEmployeeName,
  resolveLoanOutstandingBalance,
  resolveLoanRepaymentProgress,
  resolveLoanTotalPaid,
  resolveLoanTotalRepayableAmount
} from '../../../service/loan/loan-display.util';

interface LoanDashboardAlert {
  level: 'warning' | 'danger';
  message: string;
}

interface LoanRecentActivity {
  id: string;
  type: 'PAYMENT' | 'MILESTONE' | 'COMPLETION';
  level: 'success' | 'info' | 'warning';
  message: string;
  loanId: string;
  loanApplicationId: LoanApplication['id'];
  occurredAt: string;
}

@Component({
  selector: 'app-loan-dashboard',
  templateUrl: './loan-dashboard.component.html',
  styleUrls: ['./loan-dashboard.component.scss']
})
export class LoanDashboardComponent implements OnInit, OnDestroy {
    onDashboardSwitch(event: Event): void {
      const value = (event.target as HTMLSelectElement).value;
      this.onDashboardSelect(value);
    }
  readonly recentLoanLimit = 10;
  isLoading = false;
  selectedDashboard: 'advance' | 'cooperative' = 'advance';
  searchTerm: string = '';
  isDashboardMenuOpen = false;
  activeFilter: string = 'ALL'; // 'ALL', 'PENDING', 'ACTIVE'
  sortField: string = 'requestDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  dashboardStats = {
    activeLoans: 0,
    pendingApplications: 0,
    totalBalance: 0
  };

  recentLoans: LoanApplication[] = [];
  allLoans: LoanApplication[] = [];
  filteredLoans: LoanApplication[] = [];
  totalFilteredLoans = 0;
  alerts: LoanDashboardAlert[] = [];
  recentActivities: LoanRecentActivity[] = [];
  selectedLoan: LoanApplication | null = null;
  showLoanDetailsModal = false;

  recentLoanColumns = [
    { header: 'Loan ID', field: 'loanCode' },
    { header: 'Employee', field: 'fullName' },
    { header: 'Employee ID', field: 'employeeId' },
    { header: 'Department', field: 'department' },
    {
      header: 'Amount',
      formatter: (row: LoanApplication) => this.formatCurrency(row.amount)
    },
    {
      header: 'Status',
      field: 'status',
      badgeClass: (row: LoanApplication) => `status-badge ${this.getStatusClass(row.status)}`
    },
    {
      header: 'Date',
      formatter: (row: LoanApplication) => new Date(row.requestDate).toLocaleDateString()
    }
  ];

  recentLoanActions = [
    { id: 'view', label: 'View Details', className: 'btn-view' },
    { id: 'history', label: 'History', className: 'btn-history' }
  ];
  
  private loanSubscription!: Subscription;
  private readonly routeSubscription = new Subscription();

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private loanApplicationService: LoanApplicationService,
    private employeeService: EmployeeService,
    private hostElement: ElementRef<HTMLElement>
  ) {}

  ngOnInit() {
    this.routeSubscription.add(
      this.route.queryParamMap.subscribe(params => {
        this.selectedDashboard = params.get('dashboard') === 'cooperative' ? 'cooperative' : 'advance';
      })
    );
    this.loadDashboardData();
    this.setupLoanSubscription();
  }

  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
    if (this.loanSubscription) {
      this.loanSubscription.unsubscribe();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.isDashboardMenuOpen) {
      return;
    }

    if (!this.hostElement.nativeElement.contains(event.target as Node)) {
      this.isDashboardMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.isDashboardMenuOpen = false;
  }

  navigateToCurrentDashboard(): void {
    this.onDashboardSelect(this.selectedDashboard);
  }

  toggleDashboardMenu(event?: Event): void {
    event?.stopPropagation();
    this.isDashboardMenuOpen = !this.isDashboardMenuOpen;
  }

  switchDashboard(value: 'advance' | 'cooperative'): void {
    this.isDashboardMenuOpen = false;
    this.onDashboardSelect(value);
  }

  onDashboardSelect(value: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { dashboard: value === 'cooperative' ? 'cooperative' : 'advance' },
      queryParamsHandling: 'merge'
    });
  }

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.loanApplicationService.getAllApplications().subscribe({
      next: (applications) => {
        // Filter out test data
        const filteredLoans = applications.filter(loan => 
          !(loan.fullName ?? '').includes('John Doe') && 
          !(loan.fullName ?? '').includes('Jane Doe')
        );
        // Fetch employee details for each loan
        const employeeIds = filteredLoans.map(loan => loan.employeeId);
        Promise.all(employeeIds.map(id => this.employeeService.getEmployeeById(Number(id)).toPromise()))
          .then(employeeDetails => {
            this.allLoans = filteredLoans.map((loan, idx) => ({
              ...loan,
              fullName: employeeDetails[idx]?.fullName || loan.fullName,
              department: formatLoanDepartmentDisplay(employeeDetails[idx]?.department || loan.department)
            }));
            this.updateDashboardStats();
            this.applyFilter();
            this.updateAlerts();
            this.updateRecentActivities();
            this.isLoading = false;
          })
          .catch(() => {
            this.allLoans = filteredLoans.map((loan) => ({
              ...loan,
              department: formatLoanDepartmentDisplay(loan.department)
            }));
            this.updateDashboardStats();
            this.applyFilter();
            this.updateAlerts();
            this.updateRecentActivities();
            this.isLoading = false;
          });
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading = false;
      }
    });
  }

  setupLoanSubscription(): void {
    this.loanSubscription = this.loanApplicationService.getApplicationsObservable().subscribe({
      next: (applications) => {
        // Filter out test data
        this.allLoans = applications.filter(loan => 
          !(loan.fullName ?? '').includes('John Doe') && 
          !(loan.fullName ?? '').includes('Jane Doe')
        );
        this.syncSelectedLoan();
        this.updateDashboardStats();
        this.applyFilter();
        this.updateAlerts();
        this.updateRecentActivities();
      },
      error: (error) => {
        console.error('Error in loan subscription:', error);
      }
    });
  }

  updateDashboardStats(): void {
    this.dashboardStats.pendingApplications = this.allLoans.filter(loan => 
      loan.status === 'PENDING'
    ).length;
    
    this.dashboardStats.activeLoans = this.allLoans.filter(loan => 
      loan.status === 'ACTIVE'
    ).length;
    
    this.dashboardStats.totalBalance = this.allLoans.reduce((total, loan) => {
      return total + resolveLoanOutstandingBalance(loan);
    }, 0);
  }

  applyFilter(): void {
    this.activeFilter = 'ALL';
    const latestLoans = this.getLatestSubmittedLoans();

    this.totalFilteredLoans = this.allLoans.length;

    // Keep the dashboard as a recent-records overview only.
    this.filteredLoans = this.sortLoans(latestLoans);
      
    this.recentLoans = this.filteredLoans;
  }

  updateAlerts(): void {
    const nextAlerts: LoanDashboardAlert[] = [];

    const overdueLoansCount = this.allLoans.filter(loan => this.isLoanOverdue(loan)).length;
    if (overdueLoansCount > 0) {
      nextAlerts.push({
        level: 'danger',
        message: `${overdueLoansCount} active loan${overdueLoansCount > 1 ? 's are' : ' is'} overdue. Immediate review is required.`
      });
    }

    const pendingExposure = this.allLoans
      .filter(loan => loan.status === 'PENDING')
      .reduce((sum, loan) => sum + loan.amount, 0);
    const estimatedFundPool = 10000000;
    const availableFund = Math.max(estimatedFundPool - this.dashboardStats.totalBalance, 0);

    if (availableFund < 1000000 || pendingExposure > availableFund) {
      nextAlerts.push({
        level: 'warning',
        message: `Low advance loan fund buffer detected (est. available: ₦${availableFund.toLocaleString()}). Prioritize disbursements and approvals.`
      });
    }

    this.alerts = nextAlerts;
  }

  updateRecentActivities(): void {
    const activities: LoanRecentActivity[] = [];
    const currentDate = new Date();

    this.allLoans.forEach((loan) => {
      const paymentHistory = [...(loan.paymentHistory || [])].sort(
        (first, second) => new Date(first.paidAt).getTime() - new Date(second.paidAt).getTime()
      );

      const totalRepayable = resolveLoanTotalRepayableAmount(loan);
      let cumulativePaid = 0;
      const milestoneThresholds = [25, 50, 75, 100];
      const crossedMilestones = new Set<number>();

      paymentHistory.forEach((payment, index) => {
        const paymentDate = new Date(payment.paidAt);
        const paymentAmount = Number(payment.totalAmount || 0);

        if (this.isSameMonth(paymentDate, currentDate)) {
          activities.push({
            id: `${loan.id}-payment-${payment.id || index}`,
            type: 'PAYMENT',
            level: 'info',
            message: `Repayment alert: ${loan.fullName || 'An employee'} posted ${this.formatCurrency(paymentAmount)} to loan ${loan.loanCode} this month.`,
            loanId: loan.loanCode,
            loanApplicationId: loan.id,
            occurredAt: payment.paidAt
          });
        }

        cumulativePaid = Number((cumulativePaid + paymentAmount).toFixed(2));
        const progressPercent = totalRepayable > 0 ? (cumulativePaid / totalRepayable) * 100 : 0;

        milestoneThresholds.forEach((threshold) => {
          if (progressPercent < threshold || crossedMilestones.has(threshold)) {
            return;
          }

          crossedMilestones.add(threshold);
          activities.push({
            id: `${loan.id}-milestone-${threshold}`,
            type: threshold === 100 ? 'COMPLETION' : 'MILESTONE',
            level: 'success',
            message: threshold === 100
              ? `Repayment milestone: ${loan.fullName || 'An employee'} has fully repaid loan ${loan.loanCode}.`
              : `Repayment milestone: ${loan.fullName || 'An employee'} has reached ${threshold}% repayment on loan ${loan.loanCode}.`,
            loanId: loan.loanCode,
            loanApplicationId: loan.id,
            occurredAt: threshold === 100 && loan.completedDate ? loan.completedDate : payment.paidAt
          });
        });
      });
    });

    this.recentActivities = activities
      .sort((first, second) => new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime())
      .slice(0, 5);
  }

  openRecentActivity(activity: LoanRecentActivity): void {
    this.viewLoanDetails(activity.loanApplicationId);
  }

  getActivityRelativeTime(activityDate: string): string {
    const eventTime = new Date(activityDate).getTime();
    const diffMs = Date.now() - eventTime;

    if (!Number.isFinite(diffMs) || diffMs < 0) {
      return 'just now';
    }

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) {
      return 'just now';
    }

    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    return new Date(activityDate).toLocaleDateString();
  }

  getActivityIcon(activityType: LoanRecentActivity['type']): string {
    switch (activityType) {
      case 'PAYMENT':
        return 'fa-credit-card';
      case 'MILESTONE':
        return 'fa-chart-line';
      case 'COMPLETION':
        return 'fa-circle-check';
      default:
        return 'fa-info-circle';
    }
  }

  getActivityLevelClass(level: LoanRecentActivity['level']): string {
    switch (level) {
      case 'success':
        return 'activity-success';
      case 'warning':
        return 'activity-warning';
      default:
        return 'activity-info';
    }
  }

  isLoanOverdue(loan: LoanApplication): boolean {
    if (loan.status !== 'ACTIVE') {
      return false;
    }

    const hasOverdueInstallment = loan.repaymentSchedule?.some(item => item.status === 'OVERDUE');
    if (hasOverdueInstallment) {
      return true;
    }

    if (loan.completedDate) {
      return new Date(loan.completedDate).getTime() < Date.now();
    }

    return false;
  }

  private isSameMonth(left: Date, right: Date): boolean {
    return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
  }

  private getLatestSubmittedLoans(): LoanApplication[] {
    return [...this.allLoans]
      .sort((first, second) => {
        const firstTime = new Date(first.requestDate).getTime();
        const secondTime = new Date(second.requestDate).getTime();
        return secondTime - firstTime;
      })
      .slice(0, this.recentLoanLimit);
  }

  // Filter methods
  showPendingLoans(): void {
    this.activeFilter = 'PENDING';
    this.applyFilter();
  }

  showActiveLoans(): void {
    this.activeFilter = 'ACTIVE';
    this.applyFilter();
  }

  showAllLoans(): void {
    this.activeFilter = 'ALL';
    this.applyFilter();
  }

  setSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = field === 'requestDate' ? 'desc' : 'asc';
    }

    this.applyFilter();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'fa-sort';
    }

    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  openDisbursementCenter(loanId?: string | number): void {
    const queryParams = loanId !== undefined ? { loanId: String(loanId) } : undefined;
    this.router.navigate(['/admin/hr/loan-management/loan-disbursement', uuidV4()], {
      queryParams
    });
  }

  manageEmployeeAdvanceLoans(): void {
    this.router.navigate(['/admin/hr/loan-management/loan-approval', uuidV4()]);
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'APPROVED': return 'status-approved';
      case 'PENDING': return 'status-pending';
      case 'REJECTED': return 'status-rejected';
      case 'ACTIVE': return 'status-active';
      case 'COMPLETED': return 'status-completed';
      default: return 'status-default';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  handleRecentLoanAction(event: { actionId: string; row: LoanApplication }) {
    if (event.actionId === 'view') {
      this.viewLoanDetails(event.row.id);
      return;
    }
    if (event.actionId === 'history') {
      this.seeLoanHistory(event.row.employeeId);
    }
  }

  selectLoan(loan: LoanApplication): void {
    this.selectedLoan = loan;
  }

  viewLoanDetails(loanId: string | number) {
    const loan = this.allLoans.find(l => l.id === loanId);
    if (loan) {
      this.selectedLoan = loan;
      this.showLoanDetailsModal = true;

      this.loanApplicationService.getApplicationById(String(loan.id)).subscribe({
        next: (latestLoan) => {
          if (!latestLoan) {
            return;
          }

          this.selectedLoan = latestLoan;
          this.replaceLoanInDashboard(latestLoan);
        },
        error: (error) => {
          console.error('Error refreshing admin loan preview:', error);
        }
      });
    }
  }

  closeLoanDetailsModal(): void {
    this.showLoanDetailsModal = false;
    this.selectedLoan = null;
  }

  getPreviewAppliedDate(loan: LoanApplication): string | null {
    const pendingEntry = this.getStatusHistoryByStatus(loan, 'PENDING');
    return pendingEntry?.changedAt || loan.requestDate || null;
  }

  getPreviewDisplayedStatus(loan: LoanApplication): LoanApplication['status'] {
    return this.resolvePreviewDisplayedStatus(loan, this.buildStatusTimeline(loan));
  }

  getPreviewApprovedDate(loan: LoanApplication): string | null {
    if (loan.approvedDate) {
      return loan.approvedDate;
    }

    const approvedEntry = this.getStatusHistoryByStatus(loan, 'APPROVED');
    if (approvedEntry?.changedAt) {
      return approvedEntry.changedAt;
    }

    if (loan.status === 'ACTIVE' || loan.status === 'COMPLETED') {
      return loan.disbursedDate || loan.completedDate || null;
    }

    if (loan.status === 'APPROVED') {
      return this.getPreviewAdminFeedback(loan)?.changedAt || this.getPreviewLatestStatusDate(loan) || loan.requestDate;
    }

    return null;
  }

  getPreviewDisbursedDate(loan: LoanApplication): string | null {
    if (loan.disbursedDate) {
      return loan.disbursedDate;
    }

    const activeEntry = this.getStatusHistoryByStatus(loan, 'ACTIVE');
    if (activeEntry?.changedAt) {
      return activeEntry.changedAt;
    }

    if (loan.status === 'ACTIVE' || loan.status === 'COMPLETED') {
      return this.getPreviewLatestMeaningfulStatusDate(loan, 'ACTIVE', 'APPROVED');
    }

    return null;
  }

  getPreviewInterestRate(loan: LoanApplication): number {
    const displayedStatus = this.getPreviewDisplayedStatus(loan);
    if (displayedStatus !== 'APPROVED' && displayedStatus !== 'ACTIVE' && displayedStatus !== 'COMPLETED') {
      return 0;
    }

    return Number(loan.interestRate || 0);
  }

  getPreviewAdminFeedback(loan: LoanApplication): StatusChange | null {
    const timeline = this.buildStatusTimeline(loan);
    const withNotes = timeline
      .filter((item) => item.status !== 'PENDING' && !!item.notes?.trim())
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime());

    if (withNotes[0]) {
      return withNotes[0];
    }

    if (!loan.adminComment?.trim()) {
      return null;
    }

    return {
      status: loan.status,
      changedAt: this.getPreviewLatestStatusDate(loan) || loan.requestDate,
      changedBy: this.resolveCurrentStatusActor(loan),
      notes: loan.adminComment
    };
  }

  getPreviewLatestStatusDate(loan: LoanApplication): string | null {
    const timeline = this.buildStatusTimeline(loan);
    if (!timeline.length) {
      return null;
    }

    return [...timeline].sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())[0]?.changedAt || null;
  }

  getPreviewLatestMeaningfulStatusDate(loan: LoanApplication, ...statuses: LoanApplication['status'][]): string | null {
    const timeline = this.buildStatusTimeline(loan)
      .filter((item) => statuses.includes(item.status))
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime());

    return timeline[0]?.changedAt || null;
  }

  getOverdueInstallmentsCount(loan: LoanApplication): number {
    return (loan.repaymentSchedule || []).filter(item => item.status === 'OVERDUE').length;
  }

  getReminderSentCount(loan: LoanApplication): number {
    return (loan.repaymentSchedule || []).filter(item => !!item.reminderSentAt).length;
  }

  getCreditReportedCount(loan: LoanApplication): number {
    return (loan.repaymentSchedule || []).filter(item => !!item.creditReportedAt).length;
  }

  getLateFeesTotal(loan: LoanApplication): number {
    return (loan.repaymentSchedule || []).reduce((sum, item) => sum + Number(item.lateFeeAmount || 0), 0);
  }

  getPreviewResolvedAmountPaid(loan: LoanApplication): number {
    return resolveLoanTotalPaid(loan);
  }

  getPreviewTotalRepayableAmount(loan: LoanApplication): number {
    return resolveLoanTotalRepayableAmount(loan);
  }

  getPreviewResolvedOutstandingBalance(loan: LoanApplication): number {
    return resolveLoanOutstandingBalance(loan);
  }

  getPreviewProgressPercentage(loan: LoanApplication): number {
    return resolveLoanRepaymentProgress(loan);
  }

  hasPreviewRepaymentStarted(loan: LoanApplication): boolean {
    return hasLoanRepaymentStarted(loan);
  }

  hasPreviewBeenDisbursed(loan: LoanApplication): boolean {
    return hasLoanBeenDisbursed(loan);
  }

  getPreviewRepaymentStatusTitle(loan: LoanApplication): string {
    return getLoanRepaymentStatusTitle(loan);
  }

  getPreviewPaidInstallmentsCount(loan: LoanApplication): number {
    return (loan.repaymentSchedule || []).filter((item) => item.status === 'PAID').length;
  }

  getPreviewTotalInstallmentsCount(loan: LoanApplication): number {
    return (loan.repaymentSchedule || []).length || Number(loan.repaymentTime || 0);
  }

  getLifecycleInstallmentsPreview(loan: LoanApplication): RepaymentScheduleItem[] {
    return [...(loan.repaymentSchedule || [])]
      .sort((a, b) => a.installmentNo - b.installmentNo)
      .slice(0, 6);
  }

  getInstallmentLifecycleLabel(item: RepaymentScheduleItem): string {
    if (item.status === 'PAID') {
      return 'Paid';
    }

    if (item.status === 'OVERDUE') {
      return `Overdue (${this.getOverdueDays(item)}d)`;
    }

    if (item.reminderSentAt) {
      return 'Grace Reminder Sent';
    }

    return 'Upcoming';
  }

  private buildStatusTimeline(loan: LoanApplication): StatusChange[] {
    const timeline = [...(loan.statusHistory || [])];
    const requestDate = this.normalizeDate(loan.requestDate);
    const approvedDate = this.normalizeDate(loan.approvedDate);
    const rejectedDate = this.normalizeDate(loan.rejectedDate);
    const disbursedDate = this.normalizeDate(loan.disbursedDate);
    const completedDate = this.normalizeDate(loan.completedDate);

    if (requestDate) {
      timeline.push({ status: 'PENDING', changedAt: requestDate, changedBy: resolveLoanEmployeeName(loan), notes: 'Loan application submitted' });
    }

    const shouldInferApproved = !approvedDate && (loan.status === 'ACTIVE' || loan.status === 'COMPLETED' || !!disbursedDate || !!completedDate);
    if (shouldInferApproved) {
      timeline.push({
        status: 'APPROVED',
        changedAt: disbursedDate || completedDate || requestDate || new Date().toISOString(),
        changedBy: this.formatActor(loan.approvedBy || loan.disbursedBy),
        notes: 'Loan approved'
      });
    }

    if (approvedDate) {
      timeline.push({
        status: 'APPROVED',
        changedAt: approvedDate,
        changedBy: this.formatActor(loan.approvedBy),
        notes: loan.status === 'APPROVED' && loan.adminComment ? loan.adminComment : 'Loan approved'
      });
    }

    if (rejectedDate) {
      timeline.push({
        status: 'REJECTED',
        changedAt: rejectedDate,
        changedBy: this.formatActor(loan.rejectedBy),
        notes: loan.status === 'REJECTED' && loan.adminComment ? loan.adminComment : 'Loan rejected'
      });
    }

    if (disbursedDate) {
      timeline.push({ status: 'ACTIVE', changedAt: disbursedDate, changedBy: this.formatActor(loan.disbursedBy), notes: 'Loan disbursed' });
    }

    if (completedDate) {
      timeline.push({ status: 'COMPLETED', changedAt: completedDate, changedBy: resolveCompletedLoanActor(loan), notes: 'Loan completed' });
    }

    const dedupedTimeline = timeline
      .filter((entry, index, entries) => {
        const normalizedDate = this.normalizeDate(entry.changedAt);
        if (!normalizedDate) {
          return false;
        }

        return index === entries.findIndex((candidate) =>
          candidate.status === entry.status && this.normalizeDate(candidate.changedAt) === normalizedDate
        );
      })
      .sort((left, right) => {
        const statusOrderDifference = this.getStatusProgressionOrder(left.status) - this.getStatusProgressionOrder(right.status);
        if (statusOrderDifference !== 0) {
          return statusOrderDifference;
        }

        return new Date(left.changedAt).getTime() - new Date(right.changedAt).getTime();
      });

    const resolvedStatus = this.resolvePreviewDisplayedStatus(loan, dedupedTimeline);
    const hasResolvedStatus = dedupedTimeline.some((entry) => entry.status === resolvedStatus);

    if (!hasResolvedStatus) {
      dedupedTimeline.push({
        status: resolvedStatus,
        changedAt: completedDate || disbursedDate || approvedDate || rejectedDate || requestDate || new Date().toISOString(),
        changedBy: this.resolveCurrentStatusActor(loan),
        notes: loan.adminComment || `Loan ${resolvedStatus.toLowerCase()}`
      });
    }

    return dedupedTimeline;
  }

  private getStatusProgressionOrder(status: LoanApplication['status']): number {
    switch (status) {
      case 'PENDING':
        return 1;
      case 'APPROVED':
        return 2;
      case 'ACTIVE':
        return 3;
      case 'COMPLETED':
        return 4;
      case 'REJECTED':
        return 5;
      default:
        return 99;
    }
  }

  private resolvePreviewDisplayedStatus(loan: LoanApplication, timeline: StatusChange[] = []): LoanApplication['status'] {
    const explicitStatus = this.normalizeStatus(loan.status);
    const latestTimelineStatus = timeline
      .filter((item) => !!this.normalizeDate(item.changedAt))
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())[0]?.status;

    if (explicitStatus === 'COMPLETED') {
      return 'COMPLETED';
    }

    if (explicitStatus === 'ACTIVE') {
      return 'ACTIVE';
    }

    if (explicitStatus === 'REJECTED') {
      return 'REJECTED';
    }

    if (explicitStatus === 'APPROVED') {
      return 'APPROVED';
    }

    if (latestTimelineStatus && latestTimelineStatus !== 'PENDING') {
      return latestTimelineStatus;
    }

    if (this.normalizeDate(loan.completedDate)) {
      return 'COMPLETED';
    }

    if (this.normalizeDate(loan.disbursedDate)) {
      return 'ACTIVE';
    }

    if (this.normalizeDate(loan.rejectedDate)) {
      return 'REJECTED';
    }

    if (this.normalizeDate(loan.approvedDate)) {
      return 'APPROVED';
    }

    return explicitStatus || latestTimelineStatus || 'PENDING';
  }

  private getStatusHistoryByStatus(loan: LoanApplication, status: LoanApplication['status']): StatusChange | null {
    const timeline = this.buildStatusTimeline(loan)
      .filter((item) => item.status === status)
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime());

    return timeline[0] ?? null;
  }

  private resolveCurrentStatusActor(loan: LoanApplication): string {
    switch (loan.status) {
      case 'APPROVED':
        return this.formatActor(loan.approvedBy);
      case 'REJECTED':
        return this.formatActor(loan.rejectedBy);
      case 'ACTIVE':
        return this.formatActor(loan.disbursedBy);
      case 'COMPLETED':
        return resolveCompletedLoanActor(loan);
      default:
        return resolveLoanEmployeeName(loan);
    }
  }

  private normalizeDate(value: string | undefined): string {
    const rawValue = String(value || '').trim();
    if (!rawValue || rawValue.toLowerCase() === 'null' || rawValue.toLowerCase() === 'undefined') {
      return '';
    }

    const timestamp = new Date(rawValue).getTime();
    return Number.isFinite(timestamp) ? rawValue : '';
  }

  private normalizeStatus(status: string | undefined): LoanApplication['status'] | null {
    const normalizedStatus = String(status || '').trim().toUpperCase();

    switch (normalizedStatus) {
      case 'PENDING':
      case 'APPROVED':
      case 'REJECTED':
      case 'ACTIVE':
      case 'COMPLETED':
        return normalizedStatus;
      default:
        return null;
    }
  }

  private formatActor(actor: LoanApplication['approvedBy'] | LoanApplication['disbursedBy'] | LoanApplication['rejectedBy'] | string | undefined): string {
    return resolveLoanActorName(actor);
  }

  private syncSelectedLoan(): void {
    if (!this.selectedLoan) {
      return;
    }

    const refreshedLoan = this.allLoans.find((loan) =>
      loan.id === this.selectedLoan?.id || loan.loanCode === this.selectedLoan?.loanCode
    );

    if (refreshedLoan) {
      this.selectedLoan = refreshedLoan;
    }
  }

  private replaceLoanInDashboard(updatedLoan: LoanApplication): void {
    const loanIndex = this.allLoans.findIndex((loan) =>
      loan.id === updatedLoan.id || loan.loanCode === updatedLoan.loanCode
    );

    if (loanIndex < 0) {
      return;
    }

    const nextLoans = [...this.allLoans];
    nextLoans[loanIndex] = updatedLoan;
    this.allLoans = nextLoans;
    this.syncSelectedLoan();
    this.applyFilter();
  }

  private getOverdueDays(item: RepaymentScheduleItem): number {
    if (item.status !== 'OVERDUE') {
      return 0;
    }

    const dueDate = new Date(item.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Math.max(Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)), 0);
  }

  openApprovalForm(loan: LoanApplication): void {
    this.closeLoanDetailsModal();
    this.router.navigate(['/admin/hr/loan-management/loan-details', String(loan.id), uuidV4()], {
      state: { source: 'dashboard-modal' }
    });
  }

  seeLoanHistory(employeeId: string | number) {
    this.router.navigate(['/admin/hr/loan-management/employee-loan-history', String(employeeId), uuidV4()], {
      state: { source: 'admin' }
    });
  }

  searchLoans(event: any) {
    this.searchTerm = event.target.value;
    this.applyFilter();
  }

  formatDepartmentDisplay(department?: unknown): string {
    return formatLoanDepartmentDisplay(department);
  }

  private sortLoans(loans: LoanApplication[]): LoanApplication[] {
    return [...loans].sort((a, b) => {
      let valueA: string | number = '';
      let valueB: string | number = '';

      switch (this.sortField) {
        case 'loanId':
          valueA = String(a.loanCode || a.id).toLowerCase();
          valueB = String(b.loanCode || b.id).toLowerCase();
          break;
        case 'employeeId':
          valueA = String(a.employeeId).toLowerCase();
          valueB = String(b.employeeId).toLowerCase();
          break;
        case 'employeeName':
          valueA = (a.fullName || '').toLowerCase();
          valueB = (b.fullName || '').toLowerCase();
          break;
        case 'department':
          valueA = this.formatDepartmentDisplay(a.department).toLowerCase();
          valueB = this.formatDepartmentDisplay(b.department).toLowerCase();
          break;
        case 'amount':
          valueA = a.amount || 0;
          valueB = b.amount || 0;
          break;
        case 'status':
          valueA = (a.status || '').toLowerCase();
          valueB = (b.status || '').toLowerCase();
          break;
        case 'requestDate':
          valueA = new Date(a.requestDate).getTime();
          valueB = new Date(b.requestDate).getTime();
          break;
        default:
          return 0;
      }

      const comparison = compareLoanSortValues(valueA, valueB);
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  viewPendingApprovals() {
    this.router.navigate(['/admin/hr/loan-management/loan-approval', uuidV4()]);
  }

  viewActiveLoans() {
    this.router.navigate(['/admin/hr/loan-management/loans', uuidV4()], { 
      queryParams: { status: 'ACTIVE' } 
    });
  }

  generateReports() {
    this.router.navigate(['/admin/hr/loan-management/reports', uuidV4()]);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/admin/hr/loan', uuidV4()]);
  }

  get approvedLoansCount(): number {
    return this.allLoans.filter(loan => loan.status === 'APPROVED').length;
  }
}


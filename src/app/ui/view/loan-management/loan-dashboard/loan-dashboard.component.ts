import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication, PaymentRecord, RepaymentScheduleItem, StatusChange } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { EmployeeService } from '../../../service/employee.service';
import { startLoanLoadProfiler } from '../../../service/loan/loan-load-profiler.util';
import { getSessionUserDisplayName } from '../../../shared-component/service/session-user-display.util';
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
  resolveLoanOutstandingExposure,
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

interface DashboardLoanRow {
  loan: LoanApplication;
  displayId: string;
  employeeId: string | number;
  fullName: string;
  departmentDisplay: string;
  overduePolicySummary: string;
  statusClass: string;
  statusLabel: string;
}

type LoanLifecycleStage = {
  status: LoanApplication['status'];
  fieldLabel: string;
};

const LOAN_LIFECYCLE_STAGES: LoanLifecycleStage[] = [
  { status: 'PENDING', fieldLabel: 'Applied On' },
  { status: 'APPROVED', fieldLabel: 'Approved On' },
  { status: 'READY_FOR_DISBURSEMENT', fieldLabel: 'Disbursable On' },
  { status: 'ACTIVE', fieldLabel: 'Disbursed On' },
  { status: 'SKIPPED', fieldLabel: 'Skipped On' },
  { status: 'OVERDUE', fieldLabel: 'Overdue On' },
  { status: 'PAUSED', fieldLabel: 'Paused On' },
  { status: 'DEFAULTED', fieldLabel: 'Defaulted On' },
  { status: 'COMPLETED', fieldLabel: 'Completed On' }
];

@Component({
  selector: 'app-loan-dashboard',
  templateUrl: './loan-dashboard.component.html',
  styleUrls: ['./loan-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class LoanDashboardComponent implements OnInit, OnDestroy {
  readonly recentLoanLimit = 9;
  readonly dashboardTableRowsPerPage = 10;
  private hasInitializedLoanSubscription = false;
  isLoading = false;
  isDataLoaded = false;
  isInitialLoad = true;
  selectedDashboard: 'advance' | 'cooperative' = 'advance';
  searchTerm: string = '';
  isDashboardMenuOpen = false;
  activeFilter: LoanApplication['status'] | 'ALL' = 'ALL';
  sortField: string = 'requestDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  dashboardStats = {
    activeLoans: 0,
    pendingApplications: 0,
    awaitingInterestAcceptance: 0,
    readyForDisbursement: 0,
    skippedLoans: 0,
    overdueLoans: 0,
    pausedLoans: 0,
    defaultedLoans: 0,
    totalBalance: 0
  };

  recentLoans: LoanApplication[] = [];
  dashboardLoanRows: DashboardLoanRow[] = [];
  allLoans: LoanApplication[] = [];
  filteredLoans: LoanApplication[] = [];
  totalFilteredLoans = 0;
  displayedLoanSubset: LoanApplication['status'] | 'ALL' = 'ALL';
  alerts: LoanDashboardAlert[] = [];
  recentActivities: LoanRecentActivity[] = [];
  selectedLoan: LoanApplication | null = null;
  showLoanDetailsModal = false;

  private loanSubscription!: Subscription;
  private readonly routeSubscription = new Subscription();
  private readonly employeeLookup = new Map<string, any>();

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

  getInitials(name: string): string {
    if (!name) return 'AD';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  get adminDisplayName(): string {
    return getSessionUserDisplayName('Admin');
  }

  formatAdvanceLoanDisplayId(loan: LoanApplication | undefined | null): string {
    if (!loan) {
      return '';
    }

    const rawCode = String(loan.loanCode || loan.id || '').trim();
    if (!rawCode) {
      return '';
    }

    return /^ADV-/i.test(rawCode) ? rawCode : `ADV-${rawCode}`;
  }

  getShortAdvanceLoanDisplayId(loan: LoanApplication | undefined | null, maxLength = 14): string {
    const displayId = this.formatAdvanceLoanDisplayId(loan);
    return displayId.length > maxLength ? `${displayId.slice(0, maxLength)}...` : displayId;
  }

  get statusSummaryCards(): Array<{
    title: string;
    value: number | string;
    note: string;
    iconClass: string;
    accentClass: string;
    filter: LoanApplication['status'] | 'ALL';
  }> {
    return [
      {
        title: 'Pending Review',
        value: this.dashboardStats.pendingApplications,
        note: 'Fresh applications awaiting decision',
        iconClass: 'fa-hourglass-half',
        accentClass: 'pending',
        filter: 'PENDING'
      },
      {
        title: 'Ready To Disburse',
        value: this.dashboardStats.readyForDisbursement,
        note: 'Approved and queued for release',
        iconClass: 'fa-hand-holding-dollar',
        accentClass: 'ready',
        filter: 'READY_FOR_DISBURSEMENT'
      },
      {
        title: 'Active',
        value: this.dashboardStats.activeLoans,
        note: 'Loans currently in repayment',
        iconClass: 'fa-check-circle',
        accentClass: 'active',
        filter: 'ACTIVE'
      },
      {
        title: 'Outstanding Balance',
        value: this.formatCurrency(this.dashboardStats.totalBalance),
        note: 'Current exposure across active and at-risk loans',
        iconClass: 'fa-chart-line',
        accentClass: 'balance',
        filter: 'ALL'
      }
    ];
  }

  get adminDashboardCards() {
    return this.statusSummaryCards;
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

  // ============================================
  // CACHING METHODS - Load data once, use cached data
  // ============================================
  
  loadDashboardData(): void {
    this.setupLoanSubscription();
    this.refreshLoanData();
  }

  private processApplications(applications: LoanApplication[], onComplete?: () => void): void {
    // First load employees to enrich loan data
    this.employeeService.getAllEmployee().pipe(catchError(() => of([]))).subscribe({
      next: (employees) => {
        this.rebuildEmployeeLookup(Array.isArray(employees) ? employees : []);
        this.allLoans = this.enrichLoansWithEmployeeData(
          applications.filter((loan) => !(loan.fullName ?? '').includes('Rolayo Awe') && !(loan.fullName ?? '').includes('Rolayo Awe'))
        );
        this.processLoadedData();
        this.isDataLoaded = true;
        onComplete?.();
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.allLoans = applications;
        this.processLoadedData();
        this.isDataLoaded = true;
        onComplete?.();
      }
    });
  }

  private processLoadedData(): void {
    this.syncSelectedLoan();
    this.updateDashboardStats();
    this.applyFilter();
    this.updateRecentActivities();
  }

  refreshLoanData(): void {
    const loadProfiler = startLoanLoadProfiler('advance-admin-dashboard');
    if (!this.isDataLoaded) {
      this.isLoading = true;
    }
    this.loanApplicationService.refreshApplications().subscribe({
      next: (applications) => {
        this.processApplications(applications || [], () => {
          loadProfiler.success({ loans: this.allLoans.length, filtered: this.filteredLoans.length });
          this.isLoading = false;
          this.isInitialLoad = false;
          this.isDataLoaded = true;
        });
      },
      error: (error) => {
        console.error('Error refreshing applications:', error);
        loadProfiler.error({ message: 'Failed to load advance admin dashboard' });
        this.isLoading = false;
      }
    });
  }

  setupLoanSubscription(): void {
    if (this.hasInitializedLoanSubscription) {
      return;
    }

    this.hasInitializedLoanSubscription = true;
    this.loanSubscription = this.loanApplicationService.getApplicationsObservable().subscribe({
      next: (applications) => {
        this.employeeService.getAllEmployee().pipe(catchError(() => of([]))).subscribe((employees) => {
          this.rebuildEmployeeLookup(Array.isArray(employees) ? employees : []);
          this.allLoans = this.enrichLoansWithEmployeeData(
            applications.filter((loan) => !(loan.fullName ?? '').includes('Rolayo Awe') && !(loan.fullName ?? '').includes('Rolayo Awe'))
          );
          this.processLoadedData();
          if (this.allLoans.length > 0 || !this.isInitialLoad) {
            this.isDataLoaded = true;
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error in loan subscription:', error);
      }
    });
  }

  private rebuildEmployeeLookup(employees: any[]): void {
    this.employeeLookup.clear();

    employees.forEach((employee) => {
      [employee?.id, employee?.userId, employee?.employeeId, employee?.employeeCode, employee?.staffId]
        .map((value) => String(value ?? '').trim())
        .filter(Boolean)
        .forEach((key) => this.employeeLookup.set(key, employee));
    });
  }

  private enrichLoansWithEmployeeData(loans: LoanApplication[]): LoanApplication[] {
    return loans.map((loan) => {
      const employee = this.employeeLookup.get(String(loan.employeeId ?? '').trim());

      return {
        ...loan,
        fullName: employee?.fullName || loan.fullName,
        department: formatLoanDepartmentDisplay(employee?.department || loan.department)
      };
    });
  }

  updateDashboardStats(): void {
    this.dashboardStats.pendingApplications = this.allLoans.filter(loan => 
      loan.status === 'PENDING'
    ).length;

    this.dashboardStats.readyForDisbursement = this.allLoans.filter(loan =>
      loan.status === 'READY_FOR_DISBURSEMENT'
    ).length;
    
    this.dashboardStats.activeLoans = this.allLoans.filter(loan => 
      loan.status === 'ACTIVE'
    ).length;

    this.dashboardStats.skippedLoans = this.allLoans.filter(loan =>
      loan.status === 'SKIPPED'
    ).length;

    this.dashboardStats.overdueLoans = this.allLoans.filter(loan =>
      loan.status === 'OVERDUE'
    ).length;

    this.dashboardStats.pausedLoans = this.allLoans.filter(loan =>
      loan.status === 'PAUSED'
    ).length;

    this.dashboardStats.defaultedLoans = this.allLoans.filter(loan =>
      loan.status === 'DEFAULTED'
    ).length;
    
    this.dashboardStats.totalBalance = this.allLoans
      .filter((loan) => loan.status === 'ACTIVE')
      .reduce((total, loan) => total + resolveLoanOutstandingExposure(loan), 0);
  }

  get pendingExtensionRequestsCount(): number {
    return this.allLoans.reduce((count, loan) => {
      const requests = (loan as any)?.gracePeriodRequests;
      if (!Array.isArray(requests)) {
        return count;
      }
      return count + requests.filter((request: any) => String(request?.status || '').toUpperCase() === 'PENDING').length;
    }, 0);
  }

  applyFilter(): void {
    let matchingLoans = [...this.allLoans];
    this.displayedLoanSubset = this.activeFilter;

    if (this.activeFilter !== 'ALL') {
      matchingLoans = matchingLoans.filter((loan) => loan.status === this.activeFilter);
    }

    this.totalFilteredLoans = matchingLoans.length;

    const latestLoans = matchingLoans
      .sort((first, second) => new Date(second.requestDate).getTime() - new Date(first.requestDate).getTime())
      .slice(0, this.recentLoanLimit);

    this.filteredLoans = this.sortLoans(latestLoans);
    this.dashboardLoanRows = this.filteredLoans.map((loan) => this.buildDashboardLoanRow(loan));
      
    this.recentLoans = this.filteredLoans;
  }

  private buildDashboardLoanRow(loan: LoanApplication): DashboardLoanRow {
    return {
      loan,
      displayId: this.getShortAdvanceLoanDisplayId(loan),
      employeeId: loan.employeeId || 'N/A',
      fullName: loan.fullName || 'N/A',
      departmentDisplay: this.formatDepartmentDisplay(loan.department),
      overduePolicySummary: this.getOverduePolicySummary(loan),
      statusClass: this.getStatusClass(loan.status),
      statusLabel: this.getStatusDisplay(loan.status)
    };
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
            message: `Repayment alert: ${(loan && loan.fullName) ? loan.fullName : 'An employee'} posted ${this.formatCurrency(paymentAmount)} to loan ${(loan && loan.loanCode) ? loan.loanCode : ''} this month.`,
            loanId: (loan && loan.loanCode) ? loan.loanCode : '',
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
              ? `Repayment milestone: ${(loan && loan.fullName) ? loan.fullName : 'An employee'} has fully repaid loan ${(loan && loan.loanCode) ? loan.loanCode : ''}.`
              : `Repayment milestone: ${(loan && loan.fullName) ? loan.fullName : 'An employee'} has reached ${threshold}% repayment on loan ${(loan && loan.loanCode) ? loan.loanCode : ''}.`,
            loanId: (loan && loan.loanCode) ? loan.loanCode : '',
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

  private isSameMonth(left: Date, right: Date): boolean {
    return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
  }

  setStatusFilter(status: LoanApplication['status'] | 'ALL'): void {
    this.activeFilter = status;
    this.applyFilter();
  }

  getStatusDisplay(status: LoanApplication['status'] | undefined): string {
    if (!status) return '';
    if (status === 'READY_FOR_DISBURSEMENT') {
      return 'Disbursable';
    }
    return String(status)
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  getDisplayedSubsetLabel(): string {
    if (this.displayedLoanSubset === 'ALL') {
      return 'all';
    }
    return this.getStatusDisplay(this.displayedLoanSubset).toLowerCase();
  }

  shouldShowViewLoansAction(): boolean {
    return this.displayedLoanSubset === 'PENDING';
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

  openPurposeManagement(): void {
    const routeBase = this.router.url.includes('/admin/hr/')
      ? '/admin/hr/loan-management'
      : '/loan-management';
    this.router.navigate([`${routeBase}/loan-purposes`, uuidV4()]);
  }

  getStatusClass(status: string | undefined): string {
  switch (status) {
    case 'PENDING': return 'status-pending';
    case 'APPROVED': return 'status-approved';
    case 'READY_FOR_DISBURSEMENT': return 'status-ready_for_disbursement';
    case 'ACTIVE': return 'status-active';
    case 'REJECTED': return 'status-rejected';
    case 'COMPLETED': return 'status-completed';
    case 'SKIPPED': return 'status-skipped';
    case 'OVERDUE': return 'status-overdue';
    case 'DEFAULTED': return 'status-defaulted';
    case 'PAUSED': return 'status-paused';
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

  getLateFeePercentageDisplay(loan: LoanApplication): string {
    return `${Number(loan.lateFeePercentage ?? 2).toFixed(2)}%`;
  }

  getLateFeeGracePeriodDisplay(loan: LoanApplication): string {
    const graceDays = Math.round(Number(loan.lateFeeGracePeriodDays ?? 15));
    return `${graceDays} day${graceDays === 1 ? '' : 's'}`;
  }

  getOverduePolicySummary(loan: LoanApplication): string {
    return `${this.getLateFeePercentageDisplay(loan)} after ${this.getLateFeeGracePeriodDisplay(loan)} grace`;
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

  getPreviewLifecycleStageFields(loan: LoanApplication): Array<{ label: string; value: string }> {
    return LOAN_LIFECYCLE_STAGES.map((stage) => ({
      label: stage.fieldLabel,
      value: this.formatPreviewLifecycleDate(this.getPreviewLifecycleStageDate(loan, stage.status))
    }));
  }

  getPreviewLifecycleStageDate(loan: LoanApplication, status: LoanApplication['status']): string | null {
    switch (status) {
      case 'PENDING':
        return this.getPreviewAppliedDate(loan);
      case 'APPROVED':
        return this.getPreviewApprovedDate(loan);
      case 'READY_FOR_DISBURSEMENT':
        return this.getStatusHistoryByStatus(loan, 'READY_FOR_DISBURSEMENT')?.changedAt || null;
      case 'ACTIVE':
        return this.getPreviewDisbursedDate(loan);
      case 'SKIPPED':
      case 'OVERDUE':
      case 'PAUSED':
      case 'DEFAULTED':
        return this.getStatusHistoryByStatus(loan, status)?.changedAt || null;
      case 'COMPLETED':
        return this.getStatusHistoryByStatus(loan, 'COMPLETED')?.changedAt || loan.completedDate || null;
      default:
        return null;
    }
  }

  formatPreviewLifecycleDate(date: string | null): string {
    return date ? new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    }) : 'N/A';
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

  getPreviewRecentPayments(loan: LoanApplication): PaymentRecord[] {
    return [...(loan.paymentHistory || [])]
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
      .slice(0, 5);
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
        return method || 'Not specified';
    }
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
    const timeline = [...(loan.statusHistory || [])]
      .map((entry) => ({
        ...entry,
        status: this.normalizeStatus(entry.status) || 'PENDING'
      }))
      .filter((entry) => !!this.normalizeDate(entry.changedAt));
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
      case 'PENDING': return 1;
      case 'APPROVED': return 2;
      case 'READY_FOR_DISBURSEMENT': return 3;
      case 'ACTIVE': return 4;
      case 'SKIPPED': return 5;
      case 'OVERDUE': return 6;
      case 'PAUSED': return 7;
      case 'DEFAULTED': return 8;
      case 'COMPLETED': return 9;
      case 'REJECTED': return 10;
      default: return 99;
    }
  }

  private resolvePreviewDisplayedStatus(loan: LoanApplication, timeline: StatusChange[] = []): LoanApplication['status'] {
    const explicitStatus = this.normalizeStatus(loan.status);
    const latestTimelineStatus = timeline
      .filter((item) => !!this.normalizeDate(item.changedAt))
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())[0]?.status;

    if (explicitStatus === 'COMPLETED') return 'COMPLETED';
    if (explicitStatus === 'DEFAULTED') return 'DEFAULTED';
    if (explicitStatus === 'PAUSED') return 'PAUSED';
    if (explicitStatus === 'OVERDUE') return 'OVERDUE';
    if (explicitStatus === 'SKIPPED') return 'SKIPPED';
    if (explicitStatus === 'ACTIVE') return 'ACTIVE';
    if (explicitStatus === 'REJECTED') return 'REJECTED';
    if (explicitStatus === 'READY_FOR_DISBURSEMENT') return 'READY_FOR_DISBURSEMENT';
    if (explicitStatus === 'APPROVED') return 'APPROVED';

    if (latestTimelineStatus && latestTimelineStatus !== 'PENDING') {
      return latestTimelineStatus;
    }

    if (this.normalizeDate(loan.completedDate)) return 'COMPLETED';
    if (this.normalizeDate(loan.disbursedDate)) return 'ACTIVE';
    if (this.normalizeDate(loan.rejectedDate)) return 'REJECTED';
    if (this.normalizeDate(loan.approvedDate)) return 'APPROVED';

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
      case 'READY_FOR_DISBURSEMENT':
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
      case 'READY_FOR_DISBURSEMENT':
      case 'REJECTED':
      case 'ACTIVE':
      case 'SKIPPED':
      case 'OVERDUE':
      case 'DEFAULTED':
      case 'PAUSED':
      case 'COMPLETED':
        return normalizedStatus;
      case 'READY-FOR-DISBURSEMENT':
        return 'READY_FOR_DISBURSEMENT';
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

  openGracePeriodRequests(): void {
    const routeBase = this.router.url.includes('/admin/hr/')
      ? '/admin/hr/loan-management'
      : '/loan-management';
    this.router.navigate([`${routeBase}/grace-period-requests`, uuidV4()]);
  }

  generateReports(): void {
    this.router.navigate(['/admin/hr/loan-management/reports', uuidV4()]);
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
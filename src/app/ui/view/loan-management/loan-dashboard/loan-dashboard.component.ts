import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';

interface LoanDashboardAlert {
  level: 'warning' | 'danger';
  message: string;
}

interface LoanRecentActivity {
  id: string;
  type: 'PAYMENT_MILESTONE' | 'MONTHLY_PAYMENT' | 'OVERDUE_PAYMENT';
  level: 'success' | 'info' | 'warning';
  message: string;
  loanId: string;
  employeeId: string;
  occurredAt: string;
}

@Component({
  selector: 'app-loan-dashboard',
  templateUrl: './loan-dashboard.component.html',
  styleUrls: ['./loan-dashboard.component.scss']
})
export class LoanDashboardComponent implements OnInit, OnDestroy {
  isLoading = false;
  searchTerm: string = '';
  activeFilter: string = 'ALL'; // 'ALL', 'PENDING', 'ACTIVE'
  
  dashboardStats = {
    activeLoans: 0,
    pendingApplications: 0,
    totalBalance: 0
  };

  recentLoans: LoanApplication[] = [];
  allLoans: LoanApplication[] = [];
  filteredLoans: LoanApplication[] = [];
  alerts: LoanDashboardAlert[] = [];
  recentActivities: LoanRecentActivity[] = [];
  selectedLoan: LoanApplication | null = null;
  showLoanDetailsModal = false;

  recentLoanColumns = [
    { header: 'Loan ID', field: 'id' },
    { header: 'Employee', field: 'fullName' },
    { header: 'Employee ID', field: 'employeeId' },
    { header: 'Department', field: 'department' },
    {
      header: 'Amount',
      formatter: (row: LoanApplication) => this.formatCurrency(row.loanAmount)
    },
    {
      header: 'Status',
      field: 'status',
      badgeClass: (row: LoanApplication) => `status-badge ${this.getStatusClass(row.status)}`
    },
    {
      header: 'Date',
      formatter: (row: LoanApplication) => new Date(row.dateSubmitted).toLocaleDateString()
    }
  ];

  recentLoanActions = [
    { id: 'view', label: 'View Details', className: 'btn-view' },
    { id: 'history', label: 'History', className: 'btn-history' }
  ];
  
  private loanSubscription!: Subscription;

  constructor(
    private location: Location,
    private router: Router,
    private loanApplicationService: LoanApplicationService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
    this.setupLoanSubscription();
  }

  ngOnDestroy(): void {
    if (this.loanSubscription) {
      this.loanSubscription.unsubscribe();
    }
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.loanApplicationService.getAllApplications().subscribe({
      next: (applications) => {
        // Filter out test data
        this.allLoans = applications.filter(loan => 
          !loan.fullName.includes('John Doe') && 
          !loan.fullName.includes('Jane Doe')
        );
        this.updateDashboardStats();
        this.applyFilter();
        this.updateAlerts();
        this.updateRecentActivities();
        this.isLoading = false;
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
          !loan.fullName.includes('John Doe') && 
          !loan.fullName.includes('Jane Doe')
        );
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
      loan.status === 'ACTIVE' || loan.status === 'APPROVED'
    ).length;
    
    this.dashboardStats.totalBalance = this.allLoans.reduce((total, loan) => {
      return total + (loan.currentBalance || 0);
    }, 0);
  }

  applyFilter(): void {
    let filtered = [...this.allLoans];
    
    // Apply status filter
    if (this.activeFilter === 'PENDING') {
      filtered = filtered.filter(loan => loan.status === 'PENDING');
    } else if (this.activeFilter === 'ACTIVE') {
      filtered = filtered.filter(loan => loan.status === 'ACTIVE' || loan.status === 'APPROVED');
    }
    
    // Apply search filter if exists
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(loan => 
        loan.fullName.toLowerCase().includes(term) ||
        loan.employeeId.toLowerCase().includes(term) ||
        (loan.purpose && loan.purpose.toLowerCase().includes(term)) ||
        loan.department.toLowerCase().includes(term)
      );
    }
    
    // Sort by date and limit to 5 for display
    this.filteredLoans = filtered
      .sort((a, b) => new Date(b.dateSubmitted).getTime() - new Date(a.dateSubmitted).getTime())
      .slice(0, 5);
      
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
      .reduce((sum, loan) => sum + loan.loanAmount, 0);
    const estimatedFundPool = 10000000;
    const availableFund = Math.max(estimatedFundPool - this.dashboardStats.totalBalance, 0);

    if (availableFund < 1000000 || pendingExposure > availableFund) {
      nextAlerts.push({
        level: 'warning',
        message: `Low welfare fund buffer detected (est. available: ₦${availableFund.toLocaleString()}). Prioritize disbursements and approvals.`
      });
    }

    this.alerts = nextAlerts;
  }

  updateRecentActivities(): void {
    const activities: LoanRecentActivity[] = [];
    const now = Date.now();

    this.allLoans.forEach((loan) => {
      const paidRatio = loan.loanAmount > 0 ? (loan.totalPaid || 0) / loan.loanAmount : 0;

      if (paidRatio >= 0.5 && (loan.status === 'ACTIVE' || loan.status === 'APPROVED' || loan.status === 'COMPLETED')) {
        activities.push({
          id: `${loan.id}-milestone`,
          type: 'PAYMENT_MILESTONE',
          level: 'success',
          message: `${loan.fullName} has paid off ${Math.round(paidRatio * 100)}% of their loan balance.`,
          loanId: loan.id,
          employeeId: loan.employeeId,
          occurredAt: this.getLatestPaymentDate(loan) || loan.approvedDate || loan.dateSubmitted
        });
      }

      const latestPaymentDate = this.getLatestPaymentDate(loan);
      if (latestPaymentDate) {
        activities.push({
          id: `${loan.id}-payment`,
          type: 'MONTHLY_PAYMENT',
          level: 'info',
          message: `${loan.fullName} just made their monthly installment.`,
          loanId: loan.id,
          employeeId: loan.employeeId,
          occurredAt: latestPaymentDate
        });
      }

      const overdueInstallmentDate = this.getOverdueInstallmentDate(loan, now);
      if (overdueInstallmentDate) {
        activities.push({
          id: `${loan.id}-overdue`,
          type: 'OVERDUE_PAYMENT',
          level: 'warning',
          message: `${loan.fullName}'s payment for this month is overdue.`,
          loanId: loan.id,
          employeeId: loan.employeeId,
          occurredAt: overdueInstallmentDate
        });
      }
    });

    const sortedActivities = activities
      .sort((first, second) => new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime())
      .slice(0, 10);

    this.recentActivities = sortedActivities.length > 0
      ? sortedActivities
      : this.getMockRecentActivities();
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
      case 'PAYMENT_MILESTONE':
        return 'fa-chart-line';
      case 'MONTHLY_PAYMENT':
        return 'fa-credit-card';
      case 'OVERDUE_PAYMENT':
        return 'fa-exclamation-circle';
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

    if (loan.endDate) {
      return new Date(loan.endDate).getTime() < Date.now();
    }

    return false;
  }

  private getLatestPaymentDate(loan: LoanApplication): string | null {
    const payments = loan.paymentHistory || [];
    if (payments.length === 0) {
      return null;
    }

    return [...payments]
      .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())[0]
      .date;
  }

  private getOverdueInstallmentDate(loan: LoanApplication, now: number): string | null {
    if (loan.status !== 'ACTIVE' && loan.status !== 'APPROVED') {
      return null;
    }

    const schedule = loan.repaymentSchedule || [];
    const overdueItem = schedule.find((item) => {
      if (item.status === 'OVERDUE') {
        return true;
      }

      if (item.status !== 'PENDING') {
        return false;
      }

      return new Date(item.dueDate).getTime() < now;
    });

    return overdueItem?.dueDate || null;
  }

  private getMockRecentActivities(): LoanRecentActivity[] {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000)).toISOString();
    const threeHoursAgo = new Date(now.getTime() - (3 * 60 * 60 * 1000)).toISOString();
    const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString();

    return [
      {
        id: 'mock-activity-1',
        type: 'PAYMENT_MILESTONE',
        level: 'success',
        message: 'Eseose Odion has paid off 50% of their loan balance.',
        loanId: 'LN-MOCK001',
        employeeId: 'EMP-123',
        occurredAt: oneHourAgo
      },
      {
        id: 'mock-activity-2',
        type: 'MONTHLY_PAYMENT',
        level: 'info',
        message: 'Chisom Ada just made their monthly installment.',
        loanId: 'LN-MOCK002',
        employeeId: 'EMP-204',
        occurredAt: threeHoursAgo
      },
      {
        id: 'mock-activity-3',
        type: 'OVERDUE_PAYMENT',
        level: 'warning',
        message: "Peter Obi's payment for this month is overdue.",
        loanId: 'LN-MOCK003',
        employeeId: 'EMP-078',
        occurredAt: yesterday
      }
    ];
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

  manageEmployeeWelfare(): void {
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
      this.seeLoanHistory(event.row.id);
    }
  }

  selectLoan(loan: LoanApplication): void {
    this.selectedLoan = loan;
  }

  viewLoanDetails(loanId: string) {
    const loan = this.allLoans.find(l => l.id === loanId);
    if (loan) {
      this.selectedLoan = loan;
      this.showLoanDetailsModal = true;
    }
  }

  closeLoanDetailsModal(): void {
    this.showLoanDetailsModal = false;
    this.selectedLoan = null;
  }

  openApprovalForm(loan: LoanApplication): void {
    this.closeLoanDetailsModal();
    this.router.navigate(['/admin/hr/loan-management/loan-details', loan.id, uuidV4()], {
      state: { source: 'dashboard-modal' }
    });
  }

  seeLoanHistory(employeeId: string) {
    this.router.navigate(['/admin/hr/loan-management/employee-loan-history', employeeId, uuidV4()], {
      state: { source: 'admin' }
    });
  }

  searchLoans(event: any) {
    this.searchTerm = event.target.value;
    this.applyFilter();
  }

  viewPendingApprovals() {
    this.router.navigate(['/admin/hr/loan-management/loan-approval', uuidV4()]);
  }

  viewActiveLoans() {
    this.router.navigate(['/admin/hr/loan-management/loans'], { 
      queryParams: { status: 'ACTIVE' } 
    });
  }

  generateReports() {
    this.router.navigate(['/admin/hr/loan-management/reports']);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/admin/hr/loan', uuidV4()]);
  }
}


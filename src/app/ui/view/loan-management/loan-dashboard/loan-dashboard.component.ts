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
  selectedLoan: LoanApplication | null = null;

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
      this.router.navigate(['/admin/hr/loan-management/loan-details', loanId, uuidV4()], {
        state: { source: 'dashboard' }
      });
    }
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
    this.router.navigate(['/admin/hr/loan-management/reports', uuidV4()]);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/admin/hr/loan', uuidV4()]);
  }
}


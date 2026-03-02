import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';

@Component({
  selector: 'app-loan-dashboard',
  templateUrl: './loan-dashboard.component.html',
  styleUrls: ['./loan-dashboard.component.scss']
})
export class LoanDashboardComponent implements OnInit, OnDestroy {
  isLoading = false;
  searchTerm: string = '';
  activeFilter: string = 'ALL'; // 'ALL', 'PENDING', 'ACTIVE'
  
  dashboardStats: {
    activeLoans: number;
    pendingApplications: number;
    totalBalance: number;
  } | null = null;

  recentLoans: LoanApplication[] = [];
  allLoans: LoanApplication[] = [];
  filteredLoans: LoanApplication[] = [];
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
    private router: Router,
    private loanApplicationService: LoanApplicationService
  ) {}

  ngOnInit() {
    this.dashboardStats = {
      activeLoans: 0,
      pendingApplications: 0,
      totalBalance: 0
    };
    this.loadDashboardData();
    this.setupLoanSubscription();
  }

  ngOnDestroy(): void {
    if (this.loanSubscription) {
      this.loanSubscription.unsubscribe();
    }
  }

  setupLoanSubscription(): void {
    this.loanSubscription = this.loanApplicationService.getApplicationsObservable().subscribe({
      next: (applications) => {
        this.allLoans = applications;
        this.updateDashboardStats();
        this.applyFilter(); // Apply current filter when data changes
      },
      error: (error) => {
        console.error('Error in loan subscription:', error);
      }
    });
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.loanApplicationService.getAllApplications().subscribe({
      next: (applications) => {
        this.allLoans = applications;
        this.updateDashboardStats();
        this.applyFilter(); // Apply current filter when data loads
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading = false;
      }
    });
  }

  updateDashboardStats(): void {
    if (!this.dashboardStats) {
      this.dashboardStats = {
        activeLoans: 0,
        pendingApplications: 0,
        totalBalance: 0
      };
    }
    
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

  // New method to apply filters
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
      this.router.navigate(['/admin/hr/loan-management/loan-details', loanId, uuidV4()]);
    }
  }

  seeLoanHistory(employeeId: string) {
    this.router.navigate(['/admin/hr/loan-management/employee-loan-history', employeeId, uuidV4()]);
  }

  searchLoans(event: any) {
    this.searchTerm = event.target.value;
    this.applyFilter(); // Re-apply filters with new search term
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
}


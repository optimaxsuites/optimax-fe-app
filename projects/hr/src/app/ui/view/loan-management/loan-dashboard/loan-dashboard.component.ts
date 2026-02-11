import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { LoanService, LoanApplication } from '../../../service/loan/loan.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-loan-dashboard',
  templateUrl: './loan-dashboard.component.html',
  styleUrls: ['./loan-dashboard.component.scss']
})
export class LoanDashboardComponent implements OnInit, OnDestroy {
  isLoading = false;
  searchTerm: string = '';
  
  dashboardStats = {
    activeLoans: 0,
    pendingApplications: 0,
    totalBalance: 0
  };

  recentLoans: LoanApplication[] = [];
  allLoans: LoanApplication[] = [];
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
    private loanService: LoanService
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

  setupLoanSubscription(): void {
    this.loanSubscription = this.loanService.getApplicationsObservable().subscribe({
      next: (applications) => {
        this.allLoans = applications;
        this.updateDashboardStats();
        this.updateRecentLoans();
      },
      error: (error) => {
        console.error('Error in loan subscription:', error);
      }
    });
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.loanService.getAllApplications().subscribe({
      next: (applications) => {
        this.allLoans = applications;
        this.updateDashboardStats();
        this.updateRecentLoans();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading = false;
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
      return total + loan.currentBalance;
    }, 0);
  }

  updateRecentLoans(): void {
    // Get 5 most recent loans
    this.recentLoans = [...this.allLoans]
      .sort((a, b) => new Date(b.dateSubmitted).getTime() - new Date(a.dateSubmitted).getTime())
      .slice(0, 5);
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

  applyForLoan() {
    this.router.navigate(['/admin/hr/loan-management/request-for-loan', 'uuid']);
  }

  approveLoan() {
    this.router.navigate(['/admin/hr/loan-management/loan-approval', 'uuid']);
  }

  viewLoanDetails(loanId: string) {
    const loan = this.allLoans.find(l => l.id === loanId);
    if (loan) {
      this.selectLoan(loan);
      // Optionally navigate to details page
      // this.router.navigate(['/admin/hr/loan-management/loan-details', loan.employeeId, 'uuid']);
    }
  }

  seeLoanHistory(loanId: string) {
    const loan = this.allLoans.find(l => l.id === loanId);
    if (loan) {
      this.router.navigate(['/admin/hr/loan-management/employee-loan-history', loan.employeeId, 'uuid']);
    }
  }

  searchLoans(event: any) {
    this.searchTerm = event.target.value;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      this.recentLoans = this.allLoans
        .filter(loan => 
          loan.fullName.toLowerCase().includes(term) ||
          loan.employeeId.toLowerCase().includes(term) ||
          loan.purpose.toLowerCase().includes(term) ||
          loan.department.toLowerCase().includes(term)
        )
        .slice(0, 5);
    } else {
      this.updateRecentLoans();
    }
  }

  navigateTo(destination: string) {
    switch(destination) {
      case 'reports':
        // Add reports navigation later
        console.log('Navigate to reports');
        break;
    }
  }
}

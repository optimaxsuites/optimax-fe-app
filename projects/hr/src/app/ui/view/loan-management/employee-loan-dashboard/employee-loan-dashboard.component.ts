import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router'; 
import { LoanService, LoanApplication } from '../../../service/loan/loan.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-employee-dashboard',
  templateUrl: './employee-loan-dashboard.component.html',
  styleUrls: ['./employee-loan-dashboard.component.scss']
})
export class EmployeeDashboardComponent implements OnInit, OnDestroy {
  employeeName: string = 'Employee Name';
  employeeId: string = 'EMP-123'; // Fixed employee ID
  isLoading: boolean = false;
  uuid: string = '';
  
  showHistory: boolean = true;
  showLoanForm: boolean = false;
  
  loanCounts = {
    pending: 0,
    active: 0,
    requested: 0,
    rejected: 0,
    completed: 0
  };
  
  allLoans: LoanApplication[] = [];
  private loanSubscription!: Subscription;

  historyColumns = [
    { header: 'Loan ID', field: 'id' },
    {
      header: 'Date',
      formatter: (row: LoanApplication) => new Date(row.dateSubmitted).toLocaleDateString()
    },
    { header: 'Purpose', field: 'purpose' },
    {
      header: 'Amount',
      formatter: (row: LoanApplication) => this.formatCurrency(row.loanAmount)
    },
    {
      header: 'Status',
      formatter: (row: LoanApplication) => this.getStatusDisplay(row.status),
      badgeClass: (row: LoanApplication) => `status-badge status-${this.getStatusClass(row.status)}`
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loanService: LoanService
  ) {}

  ngOnInit(): void {
    this.loadEmployeeData();
    this.setupLoanSubscription();
  }

  ngOnDestroy(): void {
    if (this.loanSubscription) {
      this.loanSubscription.unsubscribe();
    }
  }

  setupLoanSubscription(): void {
    // Subscribe to loan updates for real-time data
    this.loanSubscription = this.loanService.getApplicationsObservable().subscribe({
      next: (applications) => {
        this.allLoans = applications.filter(loan => 
          loan.employeeId === this.employeeId
        );
        this.calculateLoanCounts();
      },
      error: (error) => {
        console.error('Error in loan subscription:', error);
      }
    });
  }

  loadEmployeeData(): void {
    this.isLoading = true;
    
    this.route.params.subscribe(params => {
      this.uuid = params['uuid'];
      
      // In real app, get from auth service
      this.employeeName = 'John Doe';
      this.employeeId = 'EMP-123'; // Fixed ID for testing
      
      this.loadLoanData();
    });
  }

  loadLoanData(): void {
    this.isLoading = true;
    this.loanService.getAllApplications().subscribe({
      next: (applications) => {
        this.allLoans = applications.filter(loan => 
          loan.employeeId === this.employeeId
        );
        this.calculateLoanCounts();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading loan data:', error);
        this.isLoading = false;
      }
    });
  }

  calculateLoanCounts(): void {
    this.loanCounts = {
      pending: 0,
      active: 0,
      requested: 0,
      rejected: 0,
      completed: 0
    };
    
    this.allLoans.forEach(loan => {
      switch(loan.status) {
        case 'PENDING':
          this.loanCounts.pending++;
          this.loanCounts.requested++;
          break;
        case 'APPROVED':
          this.loanCounts.active++;
          break;
        case 'REJECTED':
          this.loanCounts.rejected++;
          break;
        case 'COMPLETED':
          this.loanCounts.completed++;
          break;
        case 'ACTIVE':
          this.loanCounts.active++;
          break;
      }
    });
  }

  toggleLoanForm(): void {
    this.showLoanForm = !this.showLoanForm;
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
  }

  onLoanSubmitted(): void {
    this.showLoanForm = false;
    // Data will automatically update via subscription
    alert('Loan request submitted successfully!');
  }

  viewDetailedHistory(): void {
    if (this.uuid) {
      this.router.navigate(['/admin/hr/loan-management/employee-loan-history', this.employeeId, this.uuid]);
    } else {
      this.router.navigate(['/admin/hr/loan-management/employee-loan-history', this.employeeId]);
    }
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getTotalRequests(): number {
    return this.allLoans.length;
  }

  getStatusDisplay(status: string): string {
    switch(status) {
      case 'PENDING': return 'Pending';
      case 'APPROVED': return 'Approved';
      case 'ACTIVE': return 'Active';
      case 'REJECTED': return 'Rejected';
      case 'COMPLETED': return 'Completed';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'PENDING': return 'pending';
      case 'APPROVED': return 'active';
      case 'ACTIVE': return 'active';
      case 'REJECTED': return 'rejected';
      case 'COMPLETED': return 'completed';
      default: return status.toLowerCase();
    }
  }
}

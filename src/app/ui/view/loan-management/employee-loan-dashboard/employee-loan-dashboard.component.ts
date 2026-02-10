import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoanService, LoanApplication } from '../../../service/loan/loan.service';

@Component({
  selector: 'app-employee-dashboard',
  templateUrl: './employee-loan-dashboard.component.html',
  styleUrls: ['./employee-loan-dashboard.component.scss']
})

export class EmployeeDashboardComponent implements OnInit {
  employeeName: string = 'Employee Name';
  employeeId: string = 'EMP-001';
  showHistory: boolean = false;
  selectedFilter: string = 'all';
  isLoading: boolean = false;
  
  loanCounts = {
    pending: 0,
    active: 0,
    requested: 0,
    rejected: 0,
    completed: 0
  };
  
  allLoans: LoanApplication[] = [];
  filteredLoans: LoanApplication[] = [];

  constructor(
    private router: Router,
    private loanService: LoanService
  ) {}

  ngOnInit(): void {
    this.loadEmployeeData();
  }

  loadEmployeeData(): void {
    this.isLoading = true;
    
    // In real app, get employee data from auth service
    this.employeeName = 'John Doe';
    this.employeeId = 'EMP-123';
    
    this.loadLoanData();
  }

  loadLoanData(): void {
    this.loanService.getAllApplications().subscribe({
      next: (applications) => {
        // Filter for current employee's loans
        this.allLoans = applications.filter(loan => 
          loan.employeeId === this.employeeId
        );
        
        this.calculateLoanCounts();
        this.filterLoans();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading loan data:', error);
        this.isLoading = false;
      }
    });
  }

  calculateLoanCounts(): void {
    // Reset counts
    this.loanCounts = {
      pending: 0,
      active: 0,
      requested: 0,
      rejected: 0,
      completed: 0
    };
    
    // Map service statuses to dashboard counts
    this.allLoans.forEach(loan => {
      switch(loan.status) {
        case 'PENDING':
          this.loanCounts.requested++;
          this.loanCounts.pending++;
          break;
        case 'APPROVED':
          this.loanCounts.active++;
          break;
        case 'REJECTED':
          this.loanCounts.rejected++;
          break;
        // Add completed logic if you add that status
      }
    });
  }

  applyForLoan(): void {
    // Navigate to loan application form
    console.log('Navigate to application form');
    this.router.navigate(['/admin/hr/loan-management/request-for-loan/', 'uuid'])
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
    if (this.showHistory) {
      this.filterLoans();
    }
  }

  filterLoans(): void {
    if (this.selectedFilter === 'all') {
      this.filteredLoans = [...this.allLoans];
    } else {
      // Map dashboard filter to service status
      let serviceStatus: string;
      
      switch(this.selectedFilter) {
        case 'PENDING':
        case 'REQUESTED':
          serviceStatus = 'PENDING';
          break;
        case 'ACTIVE':
          serviceStatus = 'APPROVED';
          break;
        case 'REJECTED':
          serviceStatus = 'REJECTED';
          break;
        case 'COMPLETED':
          // Handle completed loans
          serviceStatus = 'COMPLETED';
          break;
        default:
          serviceStatus = this.selectedFilter;
      }
      
      if (serviceStatus === 'COMPLETED') {
        // Filter for completed loans
        this.filteredLoans = this.allLoans.filter(loan => 
          loan.status === 'APPROVED' && this.isLoanCompleted(loan)
        );
      } else {
        this.filteredLoans = this.allLoans.filter(loan => 
          loan.status === serviceStatus
        );
      }
    }
  }

  isLoanCompleted(loan: LoanApplication): boolean {
    // Simple logic: consider loans older than 6 months as completed
    const submissionDate = new Date(loan.dateSubmitted);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return submissionDate < sixMonthsAgo;
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getPurposeDisplay(purpose: string): string {
    const purposeMap: { [key: string]: string } = {
      'medical': 'Medical Emergency',
      'education': 'Education',
      'housing': 'Housing',
      'vehicle': 'Vehicle',
      'debt_consolidation': 'Debt Consolidation',
      'personal': 'Personal',
      'other': 'Other'
    };
    return purposeMap[purpose] || purpose;
  }

  getStatusDisplay(status: string): string {
    switch(status) {
      case 'PENDING': return 'PENDING';
      case 'APPROVED': return 'ACTIVE';
      case 'REJECTED': return 'REJECTED';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'PENDING': return 'pending';
      case 'APPROVED': return 'active';
      case 'REJECTED': return 'rejected';
      default: return status.toLowerCase();
    }
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router'; 
import { Subscription } from 'rxjs';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';

@Component({
  selector: 'app-employee-dashboard',
  templateUrl: './employee-loan-dashboard.component.html',
  styleUrls: ['./employee-loan-dashboard.component.scss']
})
export class EmployeeDashboardComponent implements OnInit, OnDestroy {
  employeeName: string = 'Employee Name';
  employeeId: string = 'EMP-123';
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
  selectedLoanForSchedule: LoanApplication | null = null;
  messages: Message[] = [];

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
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private loanApplicationService: LoanApplicationService
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

  private sortLoansByRecent(loans: LoanApplication[]): LoanApplication[] {
    return [...loans].sort((a, b) => {
      const timestampA = new Date(a.submittedAt || a.dateSubmitted).getTime();
      const timestampB = new Date(b.submittedAt || b.dateSubmitted).getTime();
      const dateDiff = timestampB - timestampA;
      if (dateDiff !== 0) {
        return dateDiff;
      }

      return b.id.localeCompare(a.id);
    });
  }

  setupLoanSubscription(): void {
    // Subscribe to loan updates for real-time data
    this.loanSubscription = this.loanApplicationService.getApplicationsObservable().subscribe({
      next: (applications) => {
        const employeeLoans = applications.filter(loan => 
          loan.employeeId === this.employeeId
        );
        this.allLoans = this.sortLoansByRecent(employeeLoans);
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
      this.employeeName = 'Eseose Odion';
      this.employeeId = 'EMP-123';
      
      this.loadLoanData();
    });
  }

  loadLoanData(): void {
    this.isLoading = true;
    this.loanApplicationService.getApplicationsByEmployeeId(this.employeeId).subscribe({
      next: (applications) => {
        this.allLoans = this.sortLoansByRecent(applications);
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

  openLoanFormModal(): void {
    this.showLoanForm = true;
  }

  closeLoanFormModal(): void {
    this.showLoanForm = false;
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
  }

  onLoanSubmitted(): void {
    this.showLoanForm = false;
    this.loadLoanData();
    this.messages = [{
      severity: 'success',
      summary: 'Loan Submitted',
      detail: 'Your loan request has been submitted successfully.'
    }];
  }

  viewDetailedHistory(): void {
    if (this.uuid) {
      this.router.navigate(['/admin/hr/loan-management/employee-loan-history', this.employeeId, this.uuid], {
        state: { source: 'employee' }
      });
    } else {
      this.router.navigate(['/admin/hr/loan-management/employee-loan-history', this.employeeId, uuidV4()], {
        state: { source: 'employee' }
      });
    }
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/admin/hr/loan', uuidV4()]);
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

  viewRepaymentSchedule(loan: LoanApplication): void {
    this.selectedLoanForSchedule = loan;
  }

  closeRepaymentSchedule(): void {
    this.selectedLoanForSchedule = null;
  }
}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoanService, LoanApplication } from '../../../service/loan/loan.service';

@Component({
  selector: 'app-employee-history',
  templateUrl: './employee-loan-history.component.html',
  styleUrls: ['./employee-loan-history.component.scss']
})
export class EmployeeLoanHistoryComponent implements OnInit {
  employeeId: string = '';
  employeeName: string = '';
  employeeLoans: LoanApplication[] = [];
  isLoading: boolean = true;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loanService: LoanService
  ) {}
  
  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.employeeId = params['employeeId'];
      this.loadEmployeeHistory();
    });
  }
  
  loadEmployeeHistory(): void {
    this.isLoading = true;
    this.loanService.getAllApplications().subscribe({
      next: (allLoans) => {
        // Filter loans for this employee
        this.employeeLoans = allLoans.filter(loan => 
          loan.employeeId === this.employeeId
        ).sort((a, b) => 
          new Date(b.dateSubmitted).getTime() - new Date(a.dateSubmitted).getTime()
        );
        
        if (this.employeeLoans.length > 0) {
          this.employeeName = this.employeeLoans[0].fullName;
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading employee history:', error);
        this.isLoading = false;
      }
    });
  }
  
  goBack(): void {
    this.router.navigate(['/admin/hr/loan-management/loan-approval']);
  }
  
  viewLoanDetails(loanId: string): void {
    this.router.navigate(['/admin/hr/loan-management/loan-details', loanId]);
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
  
  getTotalBorrowed(): number {
    return this.employeeLoans.reduce((sum, loan) => sum + loan.loanAmount, 0);
  }
  
  getTotalPaid(): number {
    return this.employeeLoans.reduce((sum, loan) => sum + loan.totalPaid, 0);
  }
  
  getTotalBalance(): number {
    return this.employeeLoans.reduce((sum, loan) => sum + loan.currentBalance, 0);
  }
}
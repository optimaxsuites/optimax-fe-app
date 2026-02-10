// loan-details.component.ts (add these methods)
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoanService, LoanApplication } from '../../../service/loan/loan.service';

@Component({
  selector: 'app-loan-details',
  templateUrl: './loan-details.component.html',
  styleUrls: ['./loan-details.component.scss']
})
export class LoanDetailsComponent implements OnInit {
  employeeId: string = ''; // Changed from loanId to employeeId
  loan: LoanApplication | null = null;
  isLoading: boolean = true;
  showRepaymentSchedule: boolean = false;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loanService: LoanService
  ) {}
  
  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.employeeId = params['employeeId'];
      this.loadLoanDetails();
    });
  }
  
  loadLoanDetails(): void {
    this.isLoading = true;
    // Get all applications and find the one for this employee
    this.loanService.getAllApplications().subscribe({
      next: (applications) => {
        // Find the most recent pending/active loan for this employee
        const employeeLoans = applications.filter(app => 
          app.employeeId === this.employeeId
        ).sort((a, b) => 
          new Date(b.dateSubmitted).getTime() - new Date(a.dateSubmitted).getTime()
        );
        
        this.loan = employeeLoans.length > 0 ? employeeLoans[0] : null;
        this.isLoading = false;
        
        // Show repayment schedule if loan is APPROVED or ACTIVE
        if (this.loan) {
          this.showRepaymentSchedule = this.loan.status === 'APPROVED' || 
                                       this.loan.status === 'ACTIVE' || 
                                       this.loan.status === 'COMPLETED';
        }
      },
      error: (error) => {
        console.error('Error loading loan details:', error);
        this.isLoading = false;
      }
    });
  }
  
  // Approve loan
  approveLoan(): void {
    if (!this.loan) return;
    
    if (confirm('Are you sure you want to APPROVE this loan?')) {
      this.loanService.updateApplicationStatus(this.loan.id, 'APPROVED').subscribe({
        next: () => {
          alert('Loan approved successfully!');
          this.showRepaymentSchedule = true; // Show repayment schedule
          this.loadLoanDetails(); // Reload loan data
        },
        error: (error) => {
          console.error('Error approving loan:', error);
          alert('Failed to approve loan');
        }
      });
    }
  }
  
  // Reject loan
  rejectLoan(): void {
    if (!this.loan) return;
    
    if (confirm('Are you sure you want to REJECT this loan?')) {
      this.loanService.updateApplicationStatus(this.loan.id, 'REJECTED').subscribe({
        next: () => {
          alert('Loan rejected successfully!');
          this.router.navigate(['/admin/hr/loan-management/loan-approval']);
        },
        error: (error) => {
          console.error('Error rejecting loan:', error);
          alert('Failed to reject loan');
        }
      });
    }
  }
  
  // Go back to approval UI
  goBack(): void {
    this.router.navigate(['/admin/hr/loan-management/loan-approval']);
  }
  
  // View employee loan history
  viewEmployeeHistory(): void {
    if (this.loan) {
      this.router.navigate(['/admin/hr/loan-management/employee-history', this.loan.employeeId]);
    }
  }
  
  // Calculate progress percentage
  getProgressPercentage(): number {
    if (!this.loan) return 0;
    return ((this.loan.loanAmount - this.loan.currentBalance) / this.loan.loanAmount) * 100;
  }
  
  // Format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }
}
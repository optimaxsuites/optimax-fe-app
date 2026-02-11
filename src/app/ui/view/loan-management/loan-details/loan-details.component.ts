import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoanService, LoanApplication, StatusChange } from '../../../service/loan/loan.service';

@Component({
  selector: 'app-loan-details',
  templateUrl: './loan-details.component.html',
  styleUrls: ['./loan-details.component.scss']
})
export class LoanDetailsComponent implements OnInit {
  employeeId: string = '';
  loan: LoanApplication | null = null;
  isLoading: boolean = true;
  canChangeStatus: boolean = true; // Set based on user role
  
  statusOptions = [
    { value: 'PENDING', label: 'Pending', color: '#ffc107' },
    { value: 'APPROVED', label: 'Approved', color: '#28a745' },
    { value: 'REJECTED', label: 'Rejected', color: '#dc3545' },
    { value: 'ACTIVE', label: 'Active', color: '#17a2b8' },
    { value: 'COMPLETED', label: 'Completed', color: '#6c757d' }
  ];

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
    this.loanService.getAllApplications().subscribe({
      next: (applications) => {
        // Find the loan for this employee
        const employeeLoans = applications.filter(app => 
          app.employeeId === this.employeeId
        ).sort((a, b) => 
          new Date(b.dateSubmitted).getTime() - new Date(a.dateSubmitted).getTime()
        );
        
        this.loan = employeeLoans.length > 0 ? employeeLoans[0] : null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading loan details:', error);
        this.isLoading = false;
      }
    });
  }
  
  // Status tracking methods
  getStatusColor(status: string): string {
    const statusOption = this.statusOptions.find(option => option.value === status);
    return statusOption ? statusOption.color : '#6c757d';
  }

  getStatusLabel(status: string): string {
    const statusOption = this.statusOptions.find(option => option.value === status);
    return statusOption ? statusOption.label : 'Unknown';
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  changeStatus(newStatus: string): void {
    if (!this.loan) return;
    
    if (confirm(`Are you sure you want to change status to ${this.getStatusLabel(newStatus)}?`)) {
      this.loanService.updateApplicationStatus(this.loan.id, newStatus as any).subscribe({
        next: () => {
          alert('Status updated successfully!');
          this.loadLoanDetails(); // Reload to get updated data
        },
        error: (error) => {
          console.error('Error updating status:', error);
          alert('Failed to update status');
        }
      });
    }
  }

  // Existing methods
  approveLoan(): void {
    if (!this.loan) return;
    this.changeStatus('APPROVED');
  }
  
  rejectLoan(): void {
    if (!this.loan) return;
    this.changeStatus('REJECTED');
  }
  
  goBack(): void {
    this.router.navigate(['/admin/hr/loan-management/loan-approval', 'uuid']);
  }
  
  viewEmployeeHistory(): void {
    if (this.loan) {
      this.router.navigate(['/admin/hr/loan-management/employee-loan-history', this.loan.employeeId, 'uuid']);
    }
  }
  
  getProgressPercentage(): number {
    if (!this.loan) return 0;
    return ((this.loan.loanAmount - this.loan.currentBalance) / this.loan.loanAmount) * 100;
  }
  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }
}
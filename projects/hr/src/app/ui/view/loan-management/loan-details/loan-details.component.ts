import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { LoanApplication, StatusChange } from '../../../service/loan/loan.service';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanApprovalService } from '../../../service/loan/loan-approval.service';

@Component({
  selector: 'app-loan-details',
  templateUrl: './loan-details.component.html',
  styleUrls: ['./loan-details.component.scss']
})
export class LoanDetailsComponent implements OnInit {
  employeeId: string = '';
  loan: LoanApplication | null = null;
  isLoading: boolean = true;
  canChangeStatus: boolean = true;
  
  // Comment form for approval/rejection
  commentForm: FormGroup;
  showCommentModal: boolean = false;
  selectedAction: LoanApplication['status'] | '' = '';
  
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
    private fb: FormBuilder,
    private loanApplicationService: LoanApplicationService,
    private loanApprovalService: LoanApprovalService
  ) {
    this.commentForm = this.fb.group({
      comment: ['', Validators.required]
    });
  }
  
  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.employeeId = params['employeeId'];
      this.loadLoanDetails();
    });
  }
  
  loadLoanDetails(): void {
    this.isLoading = true;

    // First try treating the route param as a loan/application ID.
    this.loanApplicationService.getApplicationById(this.employeeId).subscribe({
      next: (loan) => {
        if (loan) {
          this.loan = loan;
          this.isLoading = false;
          return;
        }

        // Fallback: treat the route param as an employee ID.
        this.loanApplicationService.getApplicationsByEmployeeId(this.employeeId).subscribe({
          next: (applications) => {
            const employeeLoans = applications.sort((a, b) =>
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

  // Open comment modal for approval/rejection
  openCommentModal(action: LoanApplication['status']): void {
    this.selectedAction = action;
    this.commentForm.reset();
    this.showCommentModal = true;
  }

  // Close comment modal
  closeCommentModal(): void {
    this.showCommentModal = false;
    this.selectedAction = '';
    this.commentForm.reset();
  }

  // Submit status change with comment
  submitStatusChange(): void {
    if (!this.loan) return;
    if (!this.selectedAction) return;
    
    // For reject, comment is mandatory
    if (this.selectedAction === 'REJECTED' && this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    const statusUpdate: StatusChange = {
      status: this.selectedAction,
      notes: this.commentForm.value.comment || '',
      changedBy: sessionStorage.getItem('username') || 'Admin',
      date: new Date().toISOString()
    };

    this.loanApprovalService.updateApplicationStatus(this.loan.id, statusUpdate).subscribe({
      next: () => {
        alert(`Loan ${this.selectedAction.toLowerCase()} successfully!`);
        this.closeCommentModal();
        this.loadLoanDetails();
      },
      error: (error) => {
        console.error('Error updating status:', error);
        alert(`Failed to ${this.selectedAction.toLowerCase()} loan`);
      }
    });
  }

  get commentControl(): FormControl {
    return this.commentForm.get('comment') as FormControl;
  }

  approveLoan(): void {
    this.openCommentModal('APPROVED');
  }
  
  rejectLoan(): void {
    this.openCommentModal('REJECTED');
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

  // Get payment mode display text
  getPaymentModeDisplay(mode?: string): string {
    switch(mode) {
      case 'monthly': return 'Monthly Installments';
      case 'one_off': return 'One-off Payment';
      default: return mode || 'Not specified';
    }
  }
}
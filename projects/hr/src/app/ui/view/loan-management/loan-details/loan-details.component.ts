import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication, StatusChange } from '../../../service/loan/loan.types';
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
  navigationSource: string = 'approval';
  
  // Comment form for approval/rejection
  commentForm: FormGroup;
  showCommentModal: boolean = false;
  selectedAction: LoanApplication['status'] | '' = '';
  messages: Message[] = [];
  suggestedInterestRate = 0;
  approvalPreview = {
    monthlyRepayment: 0,
    totalRepayment: 0,
    totalInterest: 0
  };
  
  statusOptions = [
    { value: 'PENDING', label: 'Pending', color: '#ffc107' },
    { value: 'APPROVED', label: 'Approved', color: '#28a745' },
    { value: 'REJECTED', label: 'Rejected', color: '#dc3545' },
    { value: 'ACTIVE', label: 'Active', color: '#17a2b8' },
    { value: 'COMPLETED', label: 'Completed', color: '#6c757d' }
  ];

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private loanApplicationService: LoanApplicationService,
    private loanApprovalService: LoanApprovalService
  ) {
    this.commentForm = this.fb.group({
      comment: ['', Validators.required],
      interestRate: [0, [Validators.min(0), Validators.max(100)]]
    });
  }
  
  ngOnInit(): void {
    this.navigationSource = window.history.state?.source || 'approval';

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
    this.suggestedInterestRate = this.loan ? this.loanApprovalService.determineInterestRate(this.loan) : 0;
    this.commentForm.patchValue({
      interestRate: action === 'APPROVED' ? this.suggestedInterestRate : this.loan?.interestRate ?? 0
    });

    const interestRateControl = this.commentForm.get('interestRate');
    if (action === 'APPROVED') {
      interestRateControl?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
      this.updateApprovalPreview(Number(this.commentForm.value.interestRate ?? this.suggestedInterestRate));
    } else {
      interestRateControl?.setValidators([Validators.min(0), Validators.max(100)]);
    }
    interestRateControl?.updateValueAndValidity();

    this.showCommentModal = true;
  }

  // Close comment modal
  closeCommentModal(): void {
    this.showCommentModal = false;
    this.selectedAction = '';
    this.commentForm.reset();
    this.suggestedInterestRate = 0;
    this.approvalPreview = {
      monthlyRepayment: 0,
      totalRepayment: 0,
      totalInterest: 0
    };
  }

  onInterestRateInput(): void {
    if (this.selectedAction !== 'APPROVED') {
      return;
    }

    const currentRate = Number(this.commentForm.value.interestRate ?? 0);
    this.updateApprovalPreview(currentRate);
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

    if (this.selectedAction === 'APPROVED' && this.interestRateControl.invalid) {
      this.interestRateControl.markAsTouched();
      return;
    }

    const statusUpdate: StatusChange = {
      status: this.selectedAction,
      notes: this.commentForm.value.comment || '',
      changedBy: sessionStorage.getItem('username') || 'Admin',
      date: new Date().toISOString(),
      interestRate: this.selectedAction === 'APPROVED'
        ? Number(this.commentForm.value.interestRate ?? this.suggestedInterestRate)
        : Number(this.commentForm.value.interestRate ?? 0)
    };

    this.loanApprovalService.updateApplicationStatus(this.loan.id, statusUpdate).subscribe({
      next: () => {
        this.messages = [{
          severity: 'success',
          summary: 'Status Updated',
          detail: `Loan ${this.selectedAction.toLowerCase()} successfully.`
        }];
        this.closeCommentModal();
        this.loadLoanDetails();
      },
      error: (error) => {
        console.error('Error updating status:', error);
        this.messages = [{
          severity: 'error',
          summary: 'Update Failed',
          detail: `Failed to ${this.selectedAction.toLowerCase()} loan.`
        }];
      }
    });
  }

  get commentControl(): FormControl {
    return this.commentForm.get('comment') as FormControl;
  }

  get interestRateControl(): FormControl {
    return this.commentForm.get('interestRate') as FormControl;
  }

  approveLoan(): void {
    this.openCommentModal('APPROVED');
  }
  
  rejectLoan(): void {
    this.openCommentModal('REJECTED');
  }
  
  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/admin/hr/loan', uuidV4()]);
  }
  
  viewEmployeeHistory(): void {
    if (this.loan) {
      this.router.navigate(['/admin/hr/loan-management/employee-loan-history', this.loan.employeeId, uuidV4()], {
        state: { source: 'admin' }
      });
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
      default: return this.toTitleCase((mode || '').replace(/_/g, ' ')) || 'Not specified';
    }
  }

  getPurposeDisplay(purpose?: string | null): string {
    return this.toTitleCase((purpose || '').replace(/_/g, ' ')) || 'N/A';
  }

  private toTitleCase(value: string): string {
    return value
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(' ');
  }

  private updateApprovalPreview(interestRate: number): void {
    if (!this.loan) {
      return;
    }

    this.approvalPreview = this.loanApprovalService.calculateRepaymentBreakdown(
      this.loan.loanAmount,
      this.loan.repaymentPeriod,
      Number.isFinite(interestRate) ? interestRate : 0,
      this.loan.paymentMode
    );
  }
}
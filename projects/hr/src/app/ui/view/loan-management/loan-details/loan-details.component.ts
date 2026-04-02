import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication, StatusChange } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanApprovalService } from '../../../service/loan/loan-approval.service';
import { ErrorMessageService } from '../../../shared-component/service/error-message/error-message.service';
import {
  getLoanRepaymentStatusTitle,
  hasLoanBeenDisbursed,
  hasLoanRepaymentStarted,
  resolveCompletedLoanActor,
  resolveLoanActorName,
  resolveLoanEmployeeName,
  resolveLoanOutstandingBalance,
  resolveLoanRepaymentProgress,
  resolveLoanTotalPaid,
  resolveLoanTotalRepayableAmount
} from '../../../service/loan/loan-display.util';

@Component({
  selector: 'app-loan-details',
  templateUrl: './loan-details.component.html',
  styleUrls: ['./loan-details.component.scss']
})
export class LoanDetailsComponent implements OnInit {
  employeeId: string = '';
  loan: LoanApplication | null = null;
  statusTimeline: StatusChange[] = [];
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
    repaymentAmount: 0,
    totalRepayment: 0,
    totalInterest: 0
  };
  
  statusOptions = [
    { value: 'PENDING', label: 'Pending', color: '#ffc107' },
    { value: 'APPROVED', label: 'Approved', color: '#4f7cff' },
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
    private loanApprovalService: LoanApprovalService,
    private errorMessageService: ErrorMessageService
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
          this.updateStatusTimeline();
          this.isLoading = false;
          return;
        }

        // Fallback: treat the route param as an employee ID.
        this.loanApplicationService.getApplicationsByEmployeeId(this.employeeId).subscribe({
          next: (applications) => {
            const employeeLoans = applications.sort((a, b) =>
              new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
            );

            this.loan = employeeLoans.length > 0 ? employeeLoans[0] : null;
            this.updateStatusTimeline();
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
  private updateStatusTimeline(): void {
    this.statusTimeline = this.loan ? this.buildStatusTimeline(this.loan) : [];
  }

  private buildStatusTimeline(loan: LoanApplication): StatusChange[] {
    const timeline = [...(loan.statusHistory || [])];
    const requestDate = this.normalizeDate(loan.requestDate);
    const approvedDate = this.normalizeDate(loan.approvedDate);
    const rejectedDate = this.normalizeDate(loan.rejectedDate);
    const disbursedDate = this.normalizeDate(loan.disbursedDate);
    const completedDate = this.normalizeDate(loan.completedDate);

    if (requestDate) {
      timeline.push({
        status: 'PENDING',
        changedAt: requestDate,
        changedBy: resolveLoanEmployeeName(loan),
        notes: 'Loan application submitted'
      });
    }

    const shouldInferApproved = !approvedDate && (loan.status === 'ACTIVE' || loan.status === 'COMPLETED' || !!disbursedDate || !!completedDate);
    if (shouldInferApproved) {
      timeline.push({
        status: 'APPROVED',
        changedAt: disbursedDate || completedDate || requestDate || new Date().toISOString(),
        changedBy: this.formatHistoryActor(loan.approvedBy || loan.disbursedBy),
        notes: 'Loan approved'
      });
    }

    if (approvedDate) {
      timeline.push({
        status: 'APPROVED',
        changedAt: approvedDate,
        changedBy: this.formatHistoryActor(loan.approvedBy),
        notes: loan.status === 'APPROVED' && loan.adminComment ? loan.adminComment : 'Loan approved'
      });
    }

    if (rejectedDate) {
      timeline.push({
        status: 'REJECTED',
        changedAt: rejectedDate,
        changedBy: this.formatHistoryActor(loan.rejectedBy),
        notes: loan.status === 'REJECTED' && loan.adminComment ? loan.adminComment : 'Loan rejected'
      });
    }

    if (disbursedDate) {
      timeline.push({
        status: 'ACTIVE',
        changedAt: disbursedDate,
        changedBy: this.formatHistoryActor(loan.disbursedBy),
        notes: 'Loan disbursed'
      });
    }

    if (completedDate) {
      timeline.push({
        status: 'COMPLETED',
        changedAt: completedDate,
        changedBy: resolveCompletedLoanActor(loan),
        notes: 'Loan completed'
      });
    }

    const dedupedTimeline = timeline.filter((entry, index, entries) => {
      const normalizedDate = this.normalizeDate(entry.changedAt);
      if (!normalizedDate) {
        return false;
      }

      return index === entries.findIndex((candidate) =>
        candidate.status === entry.status && this.normalizeDate(candidate.changedAt) === normalizedDate
      );
    });

    const hasCurrentStatus = dedupedTimeline.some((entry) => entry.status === loan.status);
    if (!hasCurrentStatus) {
      dedupedTimeline.push({
        status: loan.status,
        changedAt: completedDate || disbursedDate || approvedDate || rejectedDate || requestDate || new Date().toISOString(),
        changedBy: this.resolveCurrentStatusActor(loan),
        notes: loan.adminComment || `Loan ${this.getStatusLabel(loan.status).toLowerCase()}`
      });
    }

    return dedupedTimeline.sort((left, right) => {
      const statusOrderDifference = this.getStatusProgressionOrder(left.status) - this.getStatusProgressionOrder(right.status);
      if (statusOrderDifference !== 0) {
        return statusOrderDifference;
      }

      return new Date(left.changedAt).getTime() - new Date(right.changedAt).getTime();
    });
  }

  private getStatusProgressionOrder(status: LoanApplication['status']): number {
    switch (status) {
      case 'PENDING':
        return 1;
      case 'APPROVED':
        return 2;
      case 'ACTIVE':
        return 3;
      case 'COMPLETED':
        return 4;
      case 'REJECTED':
        return 5;
      default:
        return 99;
    }
  }

  private resolveCurrentStatusActor(loan: LoanApplication): string {
    switch (loan.status) {
      case 'APPROVED':
        return this.formatHistoryActor(loan.approvedBy);
      case 'REJECTED':
        return this.formatHistoryActor(loan.rejectedBy);
      case 'ACTIVE':
        return this.formatHistoryActor(loan.disbursedBy);
      case 'COMPLETED':
        return resolveCompletedLoanActor(loan);
      default:
        return resolveLoanEmployeeName(loan);
    }
  }

  private normalizeDate(value: string | undefined): string {
    const rawValue = String(value || '').trim();
    if (!rawValue || rawValue.toLowerCase() === 'null' || rawValue.toLowerCase() === 'undefined') {
      return '';
    }

    const timestamp = new Date(rawValue).getTime();
    return Number.isFinite(timestamp) ? rawValue : '';
  }

  private formatHistoryActor(actor: LoanApplication['approvedBy'] | LoanApplication['disbursedBy'] | LoanApplication['rejectedBy'] | string | undefined): string {
    return resolveLoanActorName(actor);
  }

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
      repaymentAmount: 0,
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
      changedBy: Number(sessionStorage.getItem('userid') || localStorage.getItem('userid') || 0) || 'Admin',
      changedAt: new Date().toISOString(),
      interestRate: this.selectedAction === 'APPROVED'
        ? Number(this.commentForm.value.interestRate ?? this.suggestedInterestRate)
        : Number(this.commentForm.value.interestRate ?? 0)
    };

    this.loanApprovalService.updateApplicationStatus(this.loan.id, statusUpdate).subscribe({
      next: () => {
        const actionVerb = this.getActionVerb(this.selectedAction);
        this.messages = [{
          severity: 'success',
          summary: 'Status Updated',
          detail: `Loan ${actionVerb}d successfully.`
        }];
        this.closeCommentModal();
        this.loadLoanDetails();
      },
      error: (error) => {
        console.error('Error updating status:', error);
        const actionVerb = this.getActionVerb(this.selectedAction);
        this.messages = [{
          severity: 'error',
          summary: 'Update Failed',
          detail: this.errorMessageService.getUserMessage(
            error,
            `Failed to ${actionVerb} loan.`
          )
        }];
      }
    });
  }

  private getActionVerb(action: LoanApplication['status'] | ''): string {
    switch (action) {
      case 'APPROVED':
        return 'approve';
      case 'REJECTED':
        return 'reject';
      case 'ACTIVE':
        return 'disburse';
      case 'COMPLETED':
        return 'complete';
      default:
        return 'update';
    }
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
    return this.loan ? resolveLoanRepaymentProgress(this.loan) : 0;
  }

  getResolvedAmountPaid(): number {
    return this.loan ? resolveLoanTotalPaid(this.loan) : 0;
  }

  getTotalRepayableAmount(): number {
    return this.loan ? resolveLoanTotalRepayableAmount(this.loan) : 0;
  }

  getResolvedOutstandingBalance(): number {
    return this.loan ? resolveLoanOutstandingBalance(this.loan) : 0;
  }

  hasRepaymentStarted(): boolean {
    return this.loan ? hasLoanRepaymentStarted(this.loan) : false;
  }

  hasBeenDisbursed(): boolean {
    return this.loan ? hasLoanBeenDisbursed(this.loan) : false;
  }

  getRepaymentStatusTitle(): string {
    return this.loan ? getLoanRepaymentStatusTitle(this.loan) : 'Repayment has not started';
  }

  getPaidInstallmentsCount(): number {
    return (this.loan?.repaymentSchedule || []).filter((item) => item.status === 'PAID').length;
  }

  getTotalInstallmentsCount(): number {
    return (this.loan?.repaymentSchedule || []).length || Number(this.loan?.repaymentTime || 0);
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
      case 'MONTHLY': return 'Monthly Installments';
      case 'ONE_OFF': return 'One-off Payment';
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
      this.loan.amount,
      this.loan.repaymentTime,
      Number.isFinite(interestRate) ? interestRate : 0,
      this.loan.modeOfPayment
    );
  }
}
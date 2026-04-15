// loan-details.component.ts
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
import { RepaymentScheduleItem } from '../../../service/loan/loan.types';
import {
  formatLoanRepaymentDayDisplay,
  getLoanRepaymentStatusTitle,
  hasLoanBeenDisbursed,
  hasLoanRepaymentStarted,
  normalizeLoanRepaymentStartDate,
  resolveCompletedLoanActor,
  resolveLoanActorName,
  resolveLoanEmployeeName,
  resolveLoanOutstandingBalance,
  resolveLoanRepaymentProgress,
  resolveLoanTotalPaid,
  resolveLoanTotalRepayableAmount
} from '../../../service/loan/loan-display.util';

type LoanLifecycleStage = {
  status: LoanApplication['status'];
  label: string;
  color: string;
  notes: string;
  fieldLabel: string;
};

const LOAN_LIFECYCLE_STAGES: LoanLifecycleStage[] = [
  { status: 'PENDING', label: 'Pending', color: '#ffc107', notes: 'Loan application submitted', fieldLabel: 'Applied On' },
  { status: 'AWAITING_INTEREST_ACCEPTANCE', label: 'Awaiting Employee Acceptance', color: '#eb9b3f', notes: 'Awaiting employee acceptance of the proposed interest rate', fieldLabel: 'Interest Proposal Sent On' },
  { status: 'APPROVED', label: 'Approved', color: '#4f7cff', notes: 'Loan approved', fieldLabel: 'Approved On' },
  { status: 'READY_FOR_DISBURSEMENT', label: 'Ready for Disbursement', color: '#0284c7', notes: 'Loan is ready for disbursement', fieldLabel: 'Ready for Disbursement On' },
  { status: 'ACTIVE', label: 'Active', color: '#17a2b8', notes: 'Loan disbursed', fieldLabel: 'Disbursed On' },
  { status: 'SKIPPED', label: 'Skipped', color: '#8b5cf6', notes: 'Grace period approved for the current installment', fieldLabel: 'Grace Period Approved On' },
  { status: 'OVERDUE', label: 'Overdue', color: '#ef4444', notes: 'Repayment is overdue', fieldLabel: 'Overdue Since' },
  { status: 'DEFAULTED', label: 'Defaulted', color: '#7f1d1d', notes: 'Loan defaulted after repeated overdue installments', fieldLabel: 'Defaulted On' },
  { status: 'PAUSED', label: 'Paused', color: '#475569', notes: 'Repayment temporarily paused by admin', fieldLabel: 'Paused On' },
  { status: 'COMPLETED', label: 'Completed', color: '#6c757d', notes: 'Loan completed', fieldLabel: 'Completed On' }
];

@Component({
  selector: 'app-loan-details',
  templateUrl: './loan-details.component.html',
  styleUrls: ['./loan-details.component.scss']
})
export class LoanDetailsComponent implements OnInit {
  loanId: string = '';
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
  showOverrideModal = false;
  overrideTargetStatus: 'ACTIVE' | 'PAUSED' = 'PAUSED';
  overrideReason = '';
  approvalPreview = {
    repaymentAmount: 0,
    totalRepayment: 0,
    totalInterest: 0
  };

  get lifecycleStageFields(): Array<{ label: string; value: string }> {
    return LOAN_LIFECYCLE_STAGES.map((stage) => ({
      label: stage.fieldLabel,
      value: this.formatDate(this.getLifecycleStageDate(stage.status))
    }));
  }
  
  statusOptions = [
    ...LOAN_LIFECYCLE_STAGES,
    { status: 'REJECTED' as LoanApplication['status'], value: 'REJECTED', label: 'Rejected', color: '#dc3545', notes: 'Loan rejected', fieldLabel: 'Rejected On' }
  ].map((stage) => ({ value: stage.status, label: stage.label, color: stage.color }));

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
      interestRate: [0, [Validators.min(0), Validators.max(100)]],
      lateFeePercentage: [2, [Validators.required, Validators.min(0), Validators.max(100)]],
      lateFeeGracePeriodDays: [15, [Validators.required, Validators.min(0), Validators.max(365)]],
      repaymentDay: [15, [Validators.required, Validators.min(1), Validators.max(31)]]
    });
  }
  
  ngOnInit(): void {
    this.navigationSource = window.history.state?.source || 'approval';

    this.route.params.subscribe(params => {
      this.loanId = params['loanId'];
      this.loadLoanDetails();
    });
  }
  
  get commentControl(): FormControl {
    return this.commentForm.get('comment') as FormControl;
  }

  get interestRateControl(): FormControl {
    return this.commentForm.get('interestRate') as FormControl;
  }

  get lateFeePercentageControl(): FormControl {
    return this.commentForm.get('lateFeePercentage') as FormControl;
  }

  get lateFeeGracePeriodDaysControl(): FormControl {
    return this.commentForm.get('lateFeeGracePeriodDays') as FormControl;
  }

  get repaymentDayControl(): FormControl {
    return this.commentForm.get('repaymentDay') as FormControl;
  }
  
  loadLoanDetails(): void {
    this.isLoading = true;

    this.loanApplicationService.getApplicationById(this.loanId).subscribe({
      next: (loan) => {
        if (loan) {
          this.loan = loan;
          this.updateStatusTimeline();
          this.isLoading = false;
          return;
        }

        this.loan = null;
        this.updateStatusTimeline();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading loan details:', error);
        this.loan = null;
        this.updateStatusTimeline();
        this.isLoading = false;
      }
    });
  }
  
  private updateStatusTimeline(): void {
    this.statusTimeline = this.loan ? this.buildStatusTimeline(this.loan) : [];
  }

  private buildStatusTimeline(loan: LoanApplication): StatusChange[] {
    const timeline = [...(loan.statusHistory || [])]
      .map((item) => ({ ...item, status: this.normalizeStatus(item.status) || 'PENDING' as LoanApplication['status'] }))
      .filter((item) => !!this.normalizeDate(item.changedAt));

    this.buildDerivedLifecycleEntries(loan).forEach((entry) => {
      const duplicateIndex = timeline.findIndex((item) =>
        item.status === entry.status && this.normalizeDate(item.changedAt) === this.normalizeDate(entry.changedAt)
      );
      if (duplicateIndex < 0) {
        timeline.push(entry);
      }
    });

    return timeline.sort((left, right) =>
      new Date(left.changedAt).getTime() - new Date(right.changedAt).getTime()
    );
  }

  private normalizeDate(value: string | undefined): string {
    const rawValue = String(value || '').trim();
    if (!rawValue || rawValue.toLowerCase() === 'null' || rawValue.toLowerCase() === 'undefined') {
      return '';
    }
    const timestamp = new Date(rawValue).getTime();
    return Number.isFinite(timestamp) ? rawValue : '';
  }

  private formatHistoryActor(actor: any): string {
    return resolveLoanActorName(actor);
  }

  getStatusColor(status: string): string {
    const statusOption = this.statusOptions.find(option => option.value === status);
    return statusOption ? statusOption.color : '#6c757d';
  }

  getStatusLabel(status: string): string {
    const statusOption = this.statusOptions.find(option => option.value === status);
    return statusOption ? statusOption.label : this.toTitleCase(String(status || '').replace(/_/g, ' ').replace(/-/g, ' ')) || 'Unknown';
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

  // Format repayment day with ordinal suffix (1st, 2nd, 3rd, etc.)
  formatRepaymentDay(day: number | undefined): string {
    return formatLoanRepaymentDayDisplay(day);
  }

  // Get ordinal suffix for a number
  getDayOrdinal(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  // Format repayment start date for display
  formatRepaymentStartDate(value: unknown): string {
    const normalizedDate = normalizeLoanRepaymentStartDate(value);
    if (!normalizedDate) return 'N/A';
    return new Date(normalizedDate).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Get displayed repayment start date from loan
  getDisplayedRepaymentStartDate(loan: LoanApplication | null): string {
    if (!loan) return 'N/A';
    return this.formatRepaymentStartDate(loan.repaymentStartDate);
  }

  getDisplayedRepaymentDay(loan: LoanApplication | null): string {
    return this.formatRepaymentDay(loan?.repaymentDay);
  }

  getLifecycleStageDate(status: LoanApplication['status']): string {
    if (!this.loan) return '';

    switch (status) {
      case 'PENDING':
        return this.loan.requestDate || this.getStatusHistoryByStatus('PENDING')?.changedAt || '';
      case 'APPROVED':
        return this.loan.approvedDate || this.getStatusHistoryByStatus('APPROVED')?.changedAt || '';
      case 'ACTIVE':
        return this.loan.disbursedDate || this.getStatusHistoryByStatus('ACTIVE')?.changedAt || '';
      case 'COMPLETED':
        return this.loan.completedDate || this.getStatusHistoryByStatus('COMPLETED')?.changedAt || '';
      case 'REJECTED':
        return this.loan.rejectedDate || this.getStatusHistoryByStatus('REJECTED')?.changedAt || '';
      case 'AWAITING_INTEREST_ACCEPTANCE':
      case 'READY_FOR_DISBURSEMENT':
      default:
        return this.getStatusHistoryByStatus(status)?.changedAt || '';
    }
  }

  openCommentModal(action: LoanApplication['status']): void {
    this.selectedAction = action;
    this.commentForm.reset();
    this.suggestedInterestRate = this.loan ? this.loanApprovalService.determineInterestRate(this.loan) : 0;
    const currentInterestRate = Number(this.loan?.interestRate || this.suggestedInterestRate);
    
    this.commentForm.patchValue({
      interestRate: action === 'APPROVED' ? currentInterestRate : this.loan?.interestRate ?? 0,
      lateFeePercentage: this.loan?.lateFeePercentage ?? 2,
      lateFeeGracePeriodDays: this.loan?.lateFeeGracePeriodDays ?? 15,
      comment: '',
      repaymentDay: this.loan?.repaymentDay || 15
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

  canPauseLoan(): boolean {
    return this.loan?.status === 'ACTIVE' || this.loan?.status === 'SKIPPED' || this.loan?.status === 'OVERDUE';
  }

  canRestoreActiveLoan(): boolean {
    return this.loan?.status === 'PAUSED'
      || this.loan?.status === 'DEFAULTED'
      || this.loan?.status === 'OVERDUE'
      || this.loan?.status === 'SKIPPED';
  }

  openOverrideModal(targetStatus: 'ACTIVE' | 'PAUSED'): void {
    this.overrideTargetStatus = targetStatus;
    this.overrideReason = '';
    this.showOverrideModal = true;
  }

  closeOverrideModal(): void {
    this.showOverrideModal = false;
    this.overrideReason = '';
  }

  submitOverrideStatusChange(): void {
    if (!this.loan) {
      return;
    }

    if (!this.overrideReason.trim()) {
      this.messages = [{
        severity: 'warn',
        summary: 'Reason Required',
        detail: 'Please provide a reason for overriding the loan status.'
      }];
      return;
    }

    this.loanApprovalService.overrideLoanStatus(this.loan.id, this.overrideTargetStatus, this.overrideReason.trim()).subscribe({
      next: () => {
        this.messages = [{
          severity: 'success',
          summary: 'Status Overridden',
          detail: `Loan status changed to ${this.getStatusLabel(this.overrideTargetStatus)}.`
        }];
        this.closeOverrideModal();
        this.loadLoanDetails();
      },
      error: (error) => {
        console.error('Error overriding loan status:', error);
        this.messages = [{
          severity: 'error',
          summary: 'Override Failed',
          detail: this.errorMessageService.getUserMessage(error, 'Failed to override loan status.')
        }];
      }
    });
  }

  getOverrideModalTitle(): string {
    return this.overrideTargetStatus === 'PAUSED' ? 'Pause Loan' : 'Restore Active Status';
  }

  getOverrideSubmitLabel(): string {
    return this.overrideTargetStatus === 'PAUSED' ? 'Pause Loan' : 'Set Active';
  }

  onInterestRateInput(): void {
    if (this.selectedAction !== 'APPROVED') {
      return;
    }
    const currentRate = Number(this.commentForm.value.interestRate ?? 0);
    this.updateApprovalPreview(currentRate);
  }

  submitStatusChange(): void {
    if (!this.loan) return;
    if (!this.selectedAction) return;
    
    if (this.selectedAction === 'REJECTED' && this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    if (this.selectedAction === 'APPROVED' && (this.interestRateControl.invalid || this.lateFeePercentageControl.invalid || this.lateFeeGracePeriodDaysControl.invalid || this.repaymentDayControl.invalid)) {
      this.interestRateControl.markAsTouched();
      this.lateFeePercentageControl.markAsTouched();
      this.lateFeeGracePeriodDaysControl.markAsTouched();
      this.repaymentDayControl.markAsTouched();
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

    if (this.selectedAction === 'APPROVED') {
      const repaymentDay = this.commentForm.value.repaymentDay;
      const repaymentStartDate = normalizeLoanRepaymentStartDate(this.loan.repaymentStartDate);
      const lateFeePercentage = Number(this.commentForm.value.lateFeePercentage ?? 2);
      const lateFeeGracePeriodDays = Number(this.commentForm.value.lateFeeGracePeriodDays ?? 15);
      
      this.loanApprovalService.approveLoan(
        this.loan.id, 
        statusUpdate.notes, 
        statusUpdate.interestRate, 
        repaymentStartDate, 
        repaymentDay,
        lateFeePercentage,
        lateFeeGracePeriodDays
      ).subscribe({
        next: () => {
          this.messages = [{
            severity: 'success',
            summary: 'Loan Approved',
            detail: `Loan approved with ${statusUpdate.interestRate}% interest rate. Awaiting employee acceptance.`
          }];
          this.closeCommentModal();
          this.loadLoanDetails();
        },
        error: (error) => {
          console.error('Error approving loan:', error);
          this.messages = [{
            severity: 'error',
            summary: 'Approval Failed',
            detail: this.errorMessageService.getUserMessage(error, 'Failed to approve loan.')
          }];
        }
      });
    } else {
      this.loanApprovalService.updateApplicationStatus(this.loan.id, statusUpdate).subscribe({
        next: () => {
          const actionVerb = this.selectedAction === 'REJECTED' ? 'rejected' : 'updated';
          this.messages = [{
            severity: 'success',
            summary: 'Status Updated',
            detail: `Loan ${actionVerb} successfully.`
          }];
          this.closeCommentModal();
          this.loadLoanDetails();
        },
        error: (error) => {
          console.error('Error updating status:', error);
          const actionVerb = this.selectedAction === 'REJECTED' ? 'reject' : 'update';
          this.messages = [{
            severity: 'error',
            summary: 'Update Failed',
            detail: this.errorMessageService.getUserMessage(error, `Failed to ${actionVerb} loan.`)
          }];
        }
      });
    }
  }

  approveLoan(): void {
    this.openCommentModal('APPROVED');
  }

  getRepaymentDaySuggestion(): string {
    const repaymentStartDate = normalizeLoanRepaymentStartDate(this.loan?.repaymentStartDate);
    if (!repaymentStartDate) {
      return 'Suggestion: use the same day of month as the employee selected for their repayment start date.';
    }

    const date = new Date(repaymentStartDate);
    const suggestedDay = date.getDate();
    const monthYear = date.toLocaleDateString('en-NG', {
      month: 'long',
      year: 'numeric'
    });
    const firstInstallmentDate = date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const selectedDay = Number(this.commentForm.value.repaymentDay || suggestedDay);

    return `Suggestion: use ${suggestedDay} so repayments after ${monthYear} stay on the ${suggestedDay}${this.getDayOrdinal(suggestedDay)} of each month. You can still choose ${selectedDay}; the first installment will remain ${firstInstallmentDate}.`;
  }

  getEmployeeInterestRejectionComment(): string {
    if (!this.loan || this.loan.status !== 'AWAITING_INTEREST_ACCEPTANCE') {
      return '';
    }

    const timelineComment = [...(this.loan.statusHistory || [])]
      .filter((entry) => entry.status === 'AWAITING_INTEREST_ACCEPTANCE' && !!entry.notes?.trim())
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())
      .map((entry) => this.extractEmployeeInterestRejectionReason(entry.notes || ''))
      .find(Boolean);

    if (timelineComment) {
      return timelineComment;
    }

    if (this.loan.interestAgreement?.status === 'DECLINED' && this.loan.interestAgreement.notes) {
      return this.extractEmployeeInterestRejectionReason(this.loan.interestAgreement.notes);
    }

    return this.extractEmployeeInterestRejectionReason(this.loan.adminComment || '');
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

  get skippedRepaymentItems(): RepaymentScheduleItem[] {
    return (this.loan?.repaymentSchedule || [])
      .filter((item) => item.status === 'SKIPPED')
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());
  }

  get overdueRepaymentItems(): RepaymentScheduleItem[] {
    return (this.loan?.repaymentSchedule || [])
      .filter((item) => item.status === 'OVERDUE')
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());
  }

  getOverdueDays(item: RepaymentScheduleItem): number {
    if (item.status !== 'OVERDUE') {
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(item.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diff = today.getTime() - dueDate.getTime();
    return Math.max(Math.floor(diff / (24 * 60 * 60 * 1000)), 0);
  }
  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }

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

  private extractEmployeeInterestRejectionReason(note: string): string {
    const trimmedNote = String(note || '').trim();
    if (!trimmedNote) {
      return '';
    }

    const matchedReason = trimmedNote.match(/Employee rejected proposed interest rate\. Reason:\s*(.+?)(?:\.\s*Admin review required.*)?$/i);
    if (matchedReason?.[1]) {
      return matchedReason[1].trim();
    }

    if (/declined|rejected/i.test(trimmedNote)) {
      return trimmedNote;
    }

    return '';
  }

  private normalizeStatus(status: string | undefined): LoanApplication['status'] | null {
    const normalizedStatus = String(status || '').trim().toUpperCase();
    if (normalizedStatus === 'READY-FOR-DISBURSEMENT') {
      return 'READY_FOR_DISBURSEMENT';
    }
    const validStatuses: LoanApplication['status'][] = ['PENDING', 'AWAITING_INTEREST_ACCEPTANCE', 'APPROVED', 'READY_FOR_DISBURSEMENT', 'REJECTED', 'ACTIVE', 'COMPLETED'];
    return validStatuses.includes(normalizedStatus as LoanApplication['status']) ? normalizedStatus as LoanApplication['status'] : null;
  }

  private getStatusHistoryByStatus(status: LoanApplication['status']): StatusChange | null {
    const entries = this.statusTimeline
      .filter((item) => item.status === status)
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime());
    return entries[0] ?? null;
  }

  private buildDerivedLifecycleEntries(loan: LoanApplication): StatusChange[] {
    const entries: StatusChange[] = [];
    const includeApprovedEntry = loan.status !== 'AWAITING_INTEREST_ACCEPTANCE';
    const stageEntries: Array<StatusChange | null> = [
      this.buildLifecycleEntry('PENDING', loan.requestDate, resolveLoanEmployeeName(loan), 'Loan application submitted'),
      includeApprovedEntry
        ? this.buildLifecycleEntry('APPROVED', loan.approvedDate, this.formatHistoryActor(loan.approvedBy), loan.adminComment || 'Loan approved')
        : null,
      this.buildLifecycleEntry('ACTIVE', loan.disbursedDate, this.formatHistoryActor(loan.disbursedBy), 'Loan disbursed'),
      this.buildLifecycleEntry('COMPLETED', loan.completedDate, resolveCompletedLoanActor(loan), 'Loan completed'),
      this.buildLifecycleEntry('REJECTED', loan.rejectedDate, this.formatHistoryActor(loan.rejectedBy), loan.adminComment || 'Loan rejected')
    ];

    stageEntries.forEach((entry) => {
      if (entry) {
        entries.push(entry);
      }
    });

    return entries;
  }

  private buildLifecycleEntry(
    status: LoanApplication['status'],
    changedAt: string | undefined,
    changedBy: string,
    notes: string
  ): StatusChange | null {
    const normalizedChangedAt = this.normalizeDate(changedAt);
    if (!normalizedChangedAt) {
      return null;
    }

    return {
      status,
      changedAt: normalizedChangedAt,
      changedBy,
      notes
    };
  }

  private updateApprovalPreview(interestRate: number): void {
    if (!this.loan) return;

    this.approvalPreview = this.loanApprovalService.calculateRepaymentBreakdown(
      this.loan.amount,
      this.loan.repaymentTime,
      Number.isFinite(interestRate) ? interestRate : 0,
      this.loan.modeOfPayment
    );
  }
}
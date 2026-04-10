import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import { CooperativeLoan, PaymentHistory, StatusHistory } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeMember, CooperativeLoanGroup, CooperativeRepayment, CooperativeLoanGuarantor } from '../../../service/loan/cooperative-loan/cooperative.types';
import { formatLoanPurposeDisplay, formatLoanRepaymentDayDisplay } from '../../../service/loan/loan-display.util';

type CooperativeLoanAuditEntryView = {
  status: string;
  changedAt: string;
  changedBy: string;
  notes: string;
};

type CooperativeLoanLifecycleStage = {
  status: string;
  label: string;
  color: string;
  notes: string;
  fieldLabel: string;
};

const COOPERATIVE_LOAN_LIFECYCLE_STAGES: CooperativeLoanLifecycleStage[] = [
  { status: 'PENDING', label: 'Pending', color: '#ffc107', notes: 'Loan application submitted', fieldLabel: 'Applied On' },
  { status: 'APPROVED', label: 'Approved', color: '#4f7cff', notes: 'Loan approved', fieldLabel: 'Approved On' },
  { status: 'READY_FOR_DISBURSEMENT', label: 'Ready for Disbursement', color: '#0284c7', notes: 'Loan is ready for disbursement', fieldLabel: 'Ready for Disbursement On' },
  { status: 'ACTIVE', label: 'Active', color: '#17a2b8', notes: 'Loan disbursed', fieldLabel: 'Disbursed On' },
  { status: 'SKIPPED', label: 'Skipped', color: '#8b5cf6', notes: 'Grace period approved for the current installment', fieldLabel: 'Grace Period Approved On' },
  { status: 'OVERDUE', label: 'Overdue', color: '#ef4444', notes: 'Repayment is overdue', fieldLabel: 'Overdue Since' },
  { status: 'DEFAULTED', label: 'Defaulted', color: '#7f1d1d', notes: 'Loan defaulted after repeated overdue installments', fieldLabel: 'Defaulted On' },
  { status: 'PAUSED', label: 'Paused', color: '#475569', notes: 'Repayment temporarily paused by admin', fieldLabel: 'Paused On' },
  { status: 'COMPLETED', label: 'Completed', color: '#6c757d', notes: 'Loan completed', fieldLabel: 'Completed On' },
  { status: 'REJECTED', label: 'Rejected', color: '#dc3545', notes: 'Loan rejected', fieldLabel: 'Rejected On' }
];

@Component({
  selector: 'app-cooperative-loan-detail',
  templateUrl: './cooperative-loan-detail.component.html',
  styleUrls: ['./cooperative-loan-detail.component.scss']
})
export class CooperativeLoanDetailComponent implements OnInit {
  currentUuid = uuidV4();
  loan!: CooperativeLoan;
  statusTimeline: CooperativeLoanAuditEntryView[] = [];
  member?: CooperativeMember;
  group?: CooperativeLoanGroup;
  repaymentSchedule: CooperativeRepayment[] = [];
  guarantors: CooperativeLoanGuarantor[] = [];
  isLoading = true;
  commentForm: FormGroup;
  showCommentModal = false;
  selectedAction: 'APPROVED' | 'REJECTED' | '' = '';
  
  showRejectModal = false;
  showRequestChangesModal = false;
  showRecordPaymentModal = false;
  showGracePeriodModal = false;
  showOverrideModal = false;
  overrideAction: 'pause' | 'restore' = 'pause';
  overrideReason = '';
  rejectionReason = '';
  requestChangesNote = '';
  paymentAmount = 0;
  modeofPayment: CooperativeRepayment['modeofPayment'] = 'BANK_TRANSFER';
  messages: Message[] = [];

  get lifecycleStageFields(): Array<{ label: string; value: string }> {
    return COOPERATIVE_LOAN_LIFECYCLE_STAGES.map((stage) => ({
      label: stage.fieldLabel,
      value: this.formatDate(this.getLifecycleStageDate(stage.status))
    }));
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cooperativeService: CooperativeService,
    private backNavigationService: BackNavigationService,
    private fb: FormBuilder
  ) {
    this.commentForm = this.fb.group({
      comment: ['', Validators.required],
      interestRate: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      repaymentDay: [15, [Validators.required, Validators.min(1), Validators.max(31)]]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = Number(params['id']);
      this.currentUuid = params['uuid'] || this.currentUuid;
      this.loadLoan(id);
    });
  }

  loadLoan(id: number): void {
    this.isLoading = true;
    this.cooperativeService.loadLoanById(id).subscribe(loan => {
      if (loan) {
        this.loan = loan;
        const memberId = loan.cooperativeMemberId ?? loan.memberId;
        this.member = memberId !== undefined ? this.cooperativeService.getMemberById(memberId) : undefined;
        const groupId = loan.cooperativeGroupId ?? loan.groupId;
        this.group = groupId !== undefined ? this.cooperativeService.getGroupById(groupId) : undefined;
        this.repaymentSchedule = this.cooperativeService.getRepaymentsByLoanId(loan.id);
        this.guarantors = this.normalizeGuarantors(loan.guarantors);
        this.seedPaymentDefaults();
        this.updateStatusTimeline();
      }

      this.isLoading = false;
    });
  }

  openRecordPaymentModal(): void {
    if (this.loan.status !== 'ACTIVE') {
      return;
    }

    this.seedPaymentDefaults();
    this.showRecordPaymentModal = true;
  }

  cancelRecordPayment(): void {
    this.showRecordPaymentModal = false;
    this.seedPaymentDefaults();
  }

  openGracePeriodModal(): void {
    if (!this.loan || this.loan.status !== 'ACTIVE' || !this.nextGracePeriodInstallment) {
      return;
    }

    this.showGracePeriodModal = true;
  }

  closeGracePeriodModal(): void {
    this.showGracePeriodModal = false;
  }

  handleGracePeriodSubmitted(): void {
    this.showGracePeriodModal = false;
    this.loadLoan(this.loan.id);
  }

  recordPayment(): void {
    if (this.loan.status !== 'ACTIVE') {
      return;
    }

    this.cooperativeService.recordRepayment(this.loan.id, {
      amount: this.paymentAmount,
      modeofPayment: this.modeofPayment,
      paidDate: new Date().toISOString()
    }).subscribe((recorded) => {
      if (!recorded) {
        this.messages = [{
          severity: 'warn',
          summary: 'Payment Not Recorded',
          detail: 'Unable to record payment. Confirm amount and loan state.'
        }];
        return;
      }

      this.cooperativeService.getLoanById(this.loan.id).subscribe((latest) => {
        if (latest) {
          this.loan = latest;
        }
        this.repaymentSchedule = this.cooperativeService.getRepaymentsByLoanId(this.loan.id);
        this.showRecordPaymentModal = false;

        this.messages = [{
          severity: 'success',
          summary: 'Payment Recorded',
          detail: `${this.formatCurrency(recorded.amount)} recorded via ${this.getmodeofPaymentLabel(recorded.modeofPayment)}.`
        }];
      });
    });
  }

  sendReminder(): void {
    const success = this.cooperativeService.sendRepaymentReminder(this.loan.id);
    if (!success) {
      this.messages = [{
        severity: 'warn',
        summary: 'Reminder Failed',
        detail: 'Unable to send reminder for this loan.'
      }];
      return;
    }

    this.messages = [{
      severity: 'info',
      summary: 'Reminder Sent',
      detail: 'Repayment reminder sent to the member.'
    }];
  }

  openPauseModal(): void {
    this.overrideAction = 'pause';
    this.overrideReason = '';
    this.showOverrideModal = true;
  }

  openRestoreModal(): void {
    this.overrideAction = 'restore';
    this.overrideReason = '';
    this.showOverrideModal = true;
  }

  closeOverrideModal(): void {
    this.showOverrideModal = false;
    this.overrideReason = '';
  }

  submitOverrideAction(): void {
    const reason = this.overrideReason.trim();
    if (!reason) {
      this.messages = [{
        severity: 'warn',
        summary: 'Reason Required',
        detail: 'Provide an override reason before applying this status change.'
      }];
      return;
    }

    if (this.overrideAction === 'pause') {
      this.pauseLoan(reason);
      return;
    }

    this.restoreLoan(reason);
  }

  pauseLoan(reason = 'Repayment paused by admin.'): void {
    this.cooperativeService.pauseLoan(this.loan.id, reason).subscribe((updated) => {
      if (!updated) {
        this.messages = [{
          severity: 'warn',
          summary: 'Pause Failed',
          detail: 'Only active, skipped, or overdue cooperative loans can be paused.'
        }];
        return;
      }

      this.loan = updated;
      this.repaymentSchedule = this.cooperativeService.getRepaymentsByLoanId(this.loan.id);
      this.closeOverrideModal();
      this.messages = [{
        severity: 'info',
        summary: 'Loan Paused',
        detail: 'Repayment activity has been paused and the override reason was stored in the audit trail.'
      }];
    });
  }

  restoreLoan(reason = 'Repayment restored by admin.'): void {
    this.cooperativeService.restorePausedLoan(this.loan.id, reason).subscribe((updated) => {
      if (!updated) {
        this.messages = [{
          severity: 'warn',
          summary: 'Restore Failed',
          detail: 'Only paused cooperative loans can be restored.'
        }];
        return;
      }

      this.loan = updated;
      this.repaymentSchedule = this.cooperativeService.getRepaymentsByLoanId(this.loan.id);
      this.closeOverrideModal();
      this.messages = [{
        severity: 'success',
        summary: 'Loan Restored',
        detail: 'Repayment status has been restored and the override note was captured.'
      }];
    });
  }

  markDefaulted(): void {
    this.cooperativeService.markLoanAsDefaulted(this.loan.id).subscribe((updated) => {
      if (!updated) {
        this.messages = [{
          severity: 'warn',
          summary: 'Action Not Allowed',
          detail: 'Only approved or active loans can be marked as defaulted.'
        }];
        return;
      }

      this.loan = updated;
      this.guarantors = this.normalizeGuarantors(updated.guarantors);
      this.repaymentSchedule = this.cooperativeService.getRepaymentsByLoanId(this.loan.id);
      this.messages = [{
        severity: 'warn',
        summary: 'Loan Defaulted',
        detail: 'Loan status updated to DEFAULTED and member notification has been sent.'
      }];
    });
  }

  approveLoan(): void {
    this.openCommentModal('APPROVED');
  }

  showRejectDialog(): void {
    this.openCommentModal('REJECTED');
  }

  rejectLoan(): void {
    if (this.rejectionReason.trim()) {
      this.cooperativeService.rejectLoan(this.loan.id, this.rejectionReason).subscribe((updated: CooperativeLoan | undefined) => {
        if (!updated) {
          this.messages = [{
            severity: 'warn',
            summary: 'Rejection Failed',
            detail: 'Unable to reject loan at this time.'
          }];
          return;
        }

        this.loan = updated;
        this.showRejectModal = false;
        this.rejectionReason = '';
        this.messages = [{
          severity: 'success',
          summary: 'Loan Rejected',
          detail: 'Loan rejected, reason saved, and member notified with the reason.'
        }];
      });
      return;
    }

    this.messages = [{
      severity: 'warn',
      summary: 'Reason Required',
      detail: 'Please provide a rejection reason before submitting.'
    }];
  }

  get commentControl(): FormControl {
    return this.commentForm.get('comment') as FormControl;
  }

  get interestRateControl(): FormControl {
    return this.commentForm.get('interestRate') as FormControl;
  }

  get repaymentDayControl(): FormControl {
    return this.commentForm.get('repaymentDay') as FormControl;
  }

  openCommentModal(action: 'APPROVED' | 'REJECTED'): void {
    this.selectedAction = action;
    this.commentForm.reset({
      comment: '',
      interestRate: Number(this.loan?.interestRate || this.group?.interestRate || 0),
      repaymentDay: Number(this.loan?.repaymentDay || 15)
    });

    if (action === 'APPROVED') {
      this.interestRateControl.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
      this.repaymentDayControl.setValidators([Validators.required, Validators.min(1), Validators.max(31)]);
    } else {
      this.interestRateControl.clearValidators();
      this.repaymentDayControl.clearValidators();
    }

    this.interestRateControl.updateValueAndValidity();
    this.repaymentDayControl.updateValueAndValidity();
    this.showCommentModal = true;
  }

  closeCommentModal(): void {
    this.showCommentModal = false;
    this.selectedAction = '';
    this.commentForm.reset();
  }

  submitStatusChange(): void {
    if (!this.loan || !this.selectedAction) {
      return;
    }

    if (this.selectedAction === 'REJECTED' && this.commentControl.invalid) {
      this.commentControl.markAsTouched();
      return;
    }

    if (this.selectedAction === 'APPROVED' && (this.interestRateControl.invalid || this.repaymentDayControl.invalid)) {
      this.interestRateControl.markAsTouched();
      this.repaymentDayControl.markAsTouched();
      return;
    }

    const comment = String(this.commentForm.value.comment || '').trim();

    if (this.selectedAction === 'APPROVED') {
      this.cooperativeService.approveLoanWithTerms(this.loan.id, {
        interestRate: Number(this.commentForm.value.interestRate || this.loan.interestRate || this.group?.interestRate || 0),
        repaymentDay: Number(this.commentForm.value.repaymentDay || this.loan.repaymentDay || 15),
        repaymentStartDate: this.loan.repaymentStartDate,
        adminComment: comment || 'Loan approved and funds reserved for disbursement.'
      }).subscribe((updated) => {
        if (!updated) {
          this.messages = [{
            severity: 'warn',
            summary: 'Approval Failed',
            detail: 'Only pending loans can be approved.'
          }];
          return;
        }

        this.loan = updated;
        this.guarantors = this.normalizeGuarantors(updated.guarantors);
        this.repaymentSchedule = this.cooperativeService.getRepaymentsByLoanId(this.loan.id);
        this.updateStatusTimeline();
        this.closeCommentModal();
        this.messages = [{
          severity: 'success',
          summary: 'Loan Approved',
          detail: 'Loan approved, approval date recorded, member notified, and funds marked for disbursement.'
        }];
      });
      return;
    }

    this.cooperativeService.rejectLoan(this.loan.id, comment).subscribe((updated) => {
      if (!updated) {
        this.messages = [{
          severity: 'warn',
          summary: 'Rejection Failed',
          detail: 'Unable to reject loan at this time.'
        }];
        return;
      }

      this.loan = updated;
      this.updateStatusTimeline();
      this.closeCommentModal();
      this.messages = [{
        severity: 'success',
        summary: 'Loan Rejected',
        detail: 'Loan rejected, reason saved, and member notified with the reason.'
      }];
    });
  }

  cancelReject(): void {
    this.showRejectModal = false;
    this.rejectionReason = '';
  }

  disburseLoan(): void {
    const beforeStats = this.cooperativeService.getStats();
    const beforeAvailable = Math.max(beforeStats.totalFund - beforeStats.loanPortfolio, 0);
    this.cooperativeService.disburseLoan(this.loan.id).subscribe((updated: CooperativeLoan | undefined) => {
      const afterStats = this.cooperativeService.getStats();
      const afterAvailable = Math.max(afterStats.totalFund - afterStats.loanPortfolio, 0);

      if (!updated) {
        this.messages = [{
          severity: 'warn',
          summary: 'Disbursement Failed',
          detail: 'Only cooperative loans already sent to accounting can be marked as disbursed.'
        }];
        return;
      }

      this.loan = updated;
      this.repaymentSchedule = this.cooperativeService.getRepaymentsByLoanId(this.loan.id);
      const deducted = Math.max(beforeAvailable - afterAvailable, 0);

      this.messages = [{
        severity: 'success',
        summary: 'Loan Disbursed',
        detail: `Loan is now ACTIVE, disbursement date recorded, repayment schedule generated, and ${this.formatCurrency(deducted || this.loan.amount)} deducted from the co-op pool.`
      }];
    });
  }

  openDisbursementWorkspace(): void {
    this.router.navigate(['/admin/hr/cooperative/loans', this.currentUuid], {
      queryParams: {
        mode: 'disburse',
        loanId: String(this.loan.id),
        dashboard: 'cooperative'
      }
    });
  }

  showRequestChangesDialog(): void {
    this.showRequestChangesModal = true;
  }

  requestChanges(): void {
    if (!this.requestChangesNote.trim()) {
      this.messages = [{
        severity: 'warn',
        summary: 'Note Required',
        detail: 'Please provide a note before requesting changes.'
      }];
      return;
    }

    this.cooperativeService.requestLoanChanges(this.loan.id, this.requestChangesNote).subscribe((updated) => {
      if (!updated) {
        this.messages = [{
          severity: 'warn',
          summary: 'Request Failed',
          detail: 'Unable to request changes at this time.'
        }];
        return;
      }

      this.loan = updated;
      this.guarantors = this.normalizeGuarantors(updated.guarantors);
      this.showRequestChangesModal = false;
      this.requestChangesNote = '';
      this.messages = [{
        severity: 'info',
        summary: 'Changes Requested',
        detail: 'Change request sent to member and saved on this application.'
      }];
    });
  }

  cancelRequestChanges(): void {
    this.showRequestChangesModal = false;
    this.requestChangesNote = '';
  }

  completeLoan(): void {
    this.loan.status = 'COMPLETED';
    this.loan.completedDate = new Date().toISOString();
    this.cooperativeService.updateLoan(this.loan).subscribe({
      next: (updatedLoan) => {
        this.loan = updatedLoan;
        this.messages = [{
          severity: 'success',
          summary: 'Loan Completed',
          detail: 'Loan marked as completed.'
        }];
      },
      error: () => {
        this.messages = [{
          severity: 'warn',
          summary: 'Update Failed',
          detail: 'Unable to mark this loan as completed right now.'
        }];
      }
    });
  }

  setPendingReview(): void {
    this.cooperativeService.setLoanPendingReview(this.loan.id, 'Application kept pending for further admin validation.').subscribe((updated) => {
      if (!updated) {
        this.messages = [{
          severity: 'warn',
          summary: 'Action Not Allowed',
          detail: 'Unable to keep this application in pending review queue.'
        }];
        return;
      }

      this.loan = updated;
      this.messages = [{
        severity: 'info',
        summary: 'Marked as Pending',
        detail: 'Application remains in pending queue for later decision.'
      }];
    });
  }

  approveGuarantor(memberId: number): void {
    this.cooperativeService.submitGuarantorDecision(this.loan.id, memberId, 'APPROVED').subscribe((updated) => {
      if (!updated) {
        this.messages = [{
          severity: 'warn',
          summary: 'Unable To Approve',
          detail: 'This guarantor request may already be decided.'
        }];
        return;
      }

      this.loan = updated;
      this.guarantors = this.normalizeGuarantors(updated.guarantors);
      this.messages = [{
        severity: 'success',
        summary: 'Guarantor Approved',
        detail: 'Guarantor response recorded successfully.'
      }];
    });
  }

  rejectGuarantor(memberId: number): void {
    this.cooperativeService.submitGuarantorDecision(this.loan.id, memberId, 'REJECTED').subscribe((updated) => {
      if (!updated) {
        this.messages = [{
          severity: 'warn',
          summary: 'Unable To Reject',
          detail: 'This guarantor request may already be decided.'
        }];
        return;
      }

      this.loan = updated;
      this.guarantors = this.normalizeGuarantors(updated.guarantors);
      this.messages = [{
        severity: 'warn',
        summary: 'Guarantor Rejected',
        detail: 'Guarantor rejection recorded. Application status updated accordingly.'
      }];
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/cooperative/dashboard', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusColor(status: string): string {
    return COOPERATIVE_LOAN_LIFECYCLE_STAGES.find((item) => item.status === status)?.color || '#6c757d';
  }

  getStatusLabel(status: string): string {
    return COOPERATIVE_LOAN_LIFECYCLE_STAGES.find((item) => item.status === status)?.label || String(status || '').replace(/_/g, ' ');
  }

  getDisplayedRepaymentStartDate(): string {
    return this.loan?.repaymentStartDate ? this.formatDate(this.loan.repaymentStartDate) : 'N/A';
  }

  getDisplayedRepaymentDay(): string {
    return formatLoanRepaymentDayDisplay(this.loan?.repaymentDay);
  }

  get memberDisplayName(): string {
    const memberId = this.loan?.cooperativeMemberId ?? this.loan?.memberId;
    return this.cooperativeService.getMemberDisplayName(memberId);
  }

 getStatusClass(status: string | undefined): string {
  switch (status) {
    case 'PENDING': return 'status-pending';
    case 'AWAITING_INTEREST_ACCEPTANCE': return 'status-awaiting_interest_acceptance';
    case 'APPROVED': return 'status-approved';
    case 'READY_FOR_DISBURSEMENT': return 'status-ready_for_disbursement';
    case 'ACTIVE': return 'status-active';
    case 'REJECTED': return 'status-rejected';
    case 'COMPLETED': return 'status-completed';
    case 'SKIPPED': return 'status-skipped';
    case 'OVERDUE': return 'status-overdue';
    case 'DEFAULTED': return 'status-defaulted';
    case 'PAUSED': return 'status-paused';
    default: return 'status-default';
  }
}

  getGuarantorStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  getGuarantorMemberName(memberId: number): string {
    return this.cooperativeService.getMemberDisplayName(memberId);
  }

  getmodeofPaymentLabel(method?: CooperativeRepayment['modeofPayment']): string {
    switch (method) {
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      case 'CASH':
        return 'Cash';
      case 'PAYROLL_DEDUCTION':
        return 'Payroll Deduction';
      case 'MOBILE_MONEY':
        return 'Mobile Money';
      case 'OTHER':
        return 'Other';
      default:
        return '-';
    }
  }

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  getRepaymentStatusLabel(item: CooperativeRepayment): string {
    if (item.status === 'PAID') {
      return 'PAID';
    }

    if (item.status === 'OVERDUE') {
      return `OVERDUE (${this.getOverdueDays(item)}d)`;
    }

    return 'UPCOMING';
  }

  getOverdueDays(item: CooperativeRepayment): number {
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

  get paidAmount(): number {
    return this.repaymentSchedule
      .filter(item => item.status === 'PAID')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  get remainingAmount(): number {
    return Math.max((this.loan.repaymentAmount || 0) - this.paidAmount, 0);
  }

  get paymentProgress(): number {
    if (!this.loan.repaymentAmount) {
      return 0;
    }

    return Math.min((this.paidAmount / (this.loan.repaymentAmount || 1)) * 100, 100);
  }

  get overdueRepaymentsCount(): number {
    return this.repaymentSchedule.filter(item => item.status === 'OVERDUE').length;
  }

  get canMarkDefaulted(): boolean {
    return this.overdueRepaymentsCount >= 3 && ['ACTIVE', 'OVERDUE', 'SKIPPED'].includes(this.loan.status || '');
  }

  get canPauseLoan(): boolean {
    return ['ACTIVE', 'OVERDUE', 'SKIPPED'].includes(this.loan.status || '');
  }

  get canRestoreLoan(): boolean {
    return this.loan?.status === 'PAUSED';
  }

  get hasOpenRepayments(): boolean {
    return this.repaymentSchedule.some(item => item.status !== 'PAID');
  }

  get nextGracePeriodInstallment(): CooperativeRepayment | undefined {
    return this.repaymentSchedule
      .filter(item => item.status !== 'PAID')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  }

  get previousLoansCount(): number {
    if (!this.member) {
      return 0;
    }

    return this.cooperativeService
      .getLoansByMember(this.member.id)
      .filter(item => item.id !== this.loan.id).length;
  }

  get completedPreviousLoansCount(): number {
    if (!this.member) {
      return 0;
    }

    return this.cooperativeService
      .getLoansByMember(this.member.id)
      .filter(item => item.id !== this.loan.id && item.status === 'COMPLETED').length;
  }

  get approvedGuarantorsCount(): number {
    return this.guarantors.filter(item => item.status === 'APPROVED').length;
  }

  get pendingGuarantorsCount(): number {
    return this.guarantors.filter(item => item.status === 'PENDING').length;
  }

  get guarantorCoverageAmount(): number {
    return this.guarantors.reduce((sum, item) => sum + Number(item.guaranteedAmount || 0), 0);
  }

  get loanToShareRatio(): number {
    const shares = Number(this.member?.shareCapital || 0);
    if (!shares) {
      return 0;
    }

    return Number(((this.loan.amount / shares) * 100).toFixed(1));
  }

  get repaymentCapacityLabel(): string {
    const shares = Number(this.member?.shareCapital || 0);
    if (!shares) {
      return 'UNKNOWN';
    }

    const ratio = (this.loan.repaymentAmount > 0 ? shares / this.loan.repaymentAmount : 0);
    if (ratio >= 3) {
      return 'GOOD';
    }

    if (ratio >= 2) {
      return 'MODERATE';
    }

    return 'LOW';
  }

  get creditHistoryLabel(): string {
    return this.overdueRepaymentsCount > 0 ? 'HAS DELINQUENCY' : 'NO DEFAULT HISTORY';
  }

  get lifecycleAuditTrail(): CooperativeLoanAuditEntryView[] {
    const historyEntries = [...(this.loan?.statusHistory || [])]
      .map((entry) => this.mapStatusHistoryEntry(entry))
      .filter((entry): entry is CooperativeLoanAuditEntryView => !!entry);

    const fallbackEntries = [
      this.buildFallbackAuditEntry('PENDING', this.loan?.applicationDate || this.loan?.requestDate, this.memberDisplayName || 'Member', 'Loan application submitted'),
      this.buildFallbackAuditEntry('APPROVED', this.loan?.approvedDate, this.formatHistoryActor(this.loan?.approvedBy), 'Loan approved'),
      this.buildFallbackAuditEntry('READY_FOR_DISBURSEMENT', this.loan?.disbursementInitiatedAt, this.formatHistoryActor(this.loan?.disbursementInitiatedBy), 'Loan sent to accounting for disbursement'),
      this.buildFallbackAuditEntry('ACTIVE', this.loan?.disbursedDate, this.formatHistoryActor(this.loan?.disbursementConfirmedBy), 'Loan disbursed and activated'),
      this.buildFallbackAuditEntry('COMPLETED', this.loan?.completionDate, 'System', 'Loan completed'),
      this.buildFallbackAuditEntry('REJECTED', this.loan?.rejectedDate, this.formatHistoryActor(this.loan?.rejectedBy), this.loan?.rejectionReason || 'Loan rejected')
    ].filter((entry): entry is CooperativeLoanAuditEntryView => !!entry);

    const mergedEntries = [...historyEntries];
    fallbackEntries.forEach((entry) => {
      const alreadyExists = mergedEntries.some((item) => item.status === entry.status && item.changedAt === entry.changedAt);
      if (!alreadyExists) {
        mergedEntries.push(entry);
      }
    });

    return mergedEntries.sort((left, right) => new Date(left.changedAt).getTime() - new Date(right.changedAt).getTime());
  }

  private updateStatusTimeline(): void {
    this.statusTimeline = this.buildStatusTimeline();
  }

  private buildStatusTimeline(): CooperativeLoanAuditEntryView[] {
    const historyEntries = [...(this.loan?.statusHistory || [])]
      .map((entry) => this.mapStatusHistoryEntry(entry))
      .filter((entry): entry is CooperativeLoanAuditEntryView => !!entry)
      .sort((left, right) => new Date(left.changedAt).getTime() - new Date(right.changedAt).getTime());

    const fallbackEntries = this.buildDerivedLifecycleEntries();
    fallbackEntries.forEach((entry) => {
      const alreadyExists = historyEntries.some((item) => item.status === entry.status && item.changedAt === entry.changedAt);
      if (!alreadyExists) {
        historyEntries.push(entry);
      }
    });

    return historyEntries.sort((left, right) => new Date(left.changedAt).getTime() - new Date(right.changedAt).getTime());
  }

  private buildDerivedLifecycleEntries(): CooperativeLoanAuditEntryView[] {
    const entries: CooperativeLoanAuditEntryView[] = [];
    const stageEntries: Array<CooperativeLoanAuditEntryView | null> = [
      this.buildLifecycleEntry('PENDING', this.loan?.applicationDate || this.loan?.requestDate, this.memberDisplayName || 'Member', 'Loan application submitted'),
      this.buildLifecycleEntry('APPROVED', this.loan?.approvedDate, this.formatHistoryActor(this.loan?.approvedBy), this.loan?.adminComment || 'Loan approved'),
      this.buildLifecycleEntry('READY_FOR_DISBURSEMENT', this.loan?.disbursementInitiatedAt, this.formatHistoryActor(this.loan?.disbursementInitiatedBy), 'Loan sent to accounting for disbursement'),
      this.buildLifecycleEntry('ACTIVE', this.loan?.disbursedDate, this.formatHistoryActor(this.loan?.disbursementConfirmedBy), 'Loan disbursed and activated'),
      this.buildLifecycleEntry('COMPLETED', this.loan?.completionDate || this.loan?.completedDate, 'System', 'Loan completed'),
      this.buildLifecycleEntry('REJECTED', this.loan?.rejectedDate, this.formatHistoryActor(this.loan?.rejectedBy), this.loan?.rejectionReason || 'Loan rejected'),
      this.buildLifecycleEntry('DEFAULTED', this.loan?.defaultedDate, 'System', 'Loan marked as defaulted')
    ];

    stageEntries.forEach((entry) => {
      if (entry) {
        entries.push(entry);
      }
    });

    return entries;
  }

  private buildLifecycleEntry(status: string, changedAt: string | undefined, changedBy: string, notes: string): CooperativeLoanAuditEntryView | null {
    if (!changedAt) {
      return null;
    }

    return {
      status,
      changedAt,
      changedBy,
      notes
    };
  }

  getLifecycleStageDate(status: string): string {
    switch (status) {
      case 'PENDING':
        return this.loan?.requestDate || this.loan?.applicationDate || '';
      case 'APPROVED':
        return this.loan?.approvedDate || '';
      case 'READY_FOR_DISBURSEMENT':
        return this.loan?.disbursementInitiatedAt || '';
      case 'ACTIVE':
        return this.loan?.disbursedDate || '';
      case 'COMPLETED':
        return this.loan?.completionDate || this.loan?.completedDate || '';
      case 'REJECTED':
        return this.loan?.rejectedDate || '';
      case 'DEFAULTED':
        return this.loan?.defaultedDate || '';
      case 'PAUSED':
      case 'OVERDUE':
      case 'SKIPPED':
      default:
        return this.statusTimeline.filter((item) => item.status === status).sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())[0]?.changedAt || '';
    }
  }

  get latestAuditEntry(): CooperativeLoanAuditEntryView | null {
    return [...this.lifecycleAuditTrail].sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())[0] || null;
  }

  get lifecycleBadges(): string[] {
    const badges: string[] = [];

    if (this.loan?.applicationStage === 'PENDING_GUARANTOR_APPROVAL') {
      badges.push('Guarantor Queue');
    }

    if (this.loan?.applicationStage === 'INFO_REQUESTED') {
      badges.push('Info Requested');
    }

    switch (this.loan?.status) {
      case 'READY_FOR_DISBURSEMENT':
        badges.push('Accounting Queue');
        break;
      case 'SKIPPED':
        badges.push('Grace Shift');
        break;
      case 'OVERDUE':
        badges.push(`${this.overdueRepaymentsCount || this.loan?.overduePaymentsCount || 1} Overdue`);
        break;
      case 'PAUSED':
        badges.push('Admin Hold');
        break;
      case 'DEFAULTED':
        badges.push('Escalated');
        break;
    }

    return badges.slice(0, 3);
  }

  get recentPaymentHistory(): PaymentHistory[] {
    return [...(this.loan?.paymentHistory || [])].sort((left, right) =>
      new Date(right.paidAt || right.recordedAt || 0).getTime() - new Date(left.paidAt || left.recordedAt || 0).getTime()
    );
  }

  getPaymentEntryMethodLabel(payment: PaymentHistory): string {
    return this.getmodeofPaymentLabel((payment.modeofPayment || payment.paymentMethod || 'BANK_TRANSFER') as CooperativeRepayment['modeofPayment']);
  }

  get statusDisplayLabel(): string {
    return String(this.loan?.status || '').replace(/_/g, ' ');
  }

  private seedPaymentDefaults(): void {
    const nextUnpaid = this.repaymentSchedule
      .filter(item => item.status !== 'PAID')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    this.paymentAmount = nextUnpaid?.amount || this.loan?.repaymentAmount || 0;
    this.modeofPayment = 'BANK_TRANSFER';
  }

  private normalizeGuarantors(guarantors: CooperativeLoan['guarantors'] | undefined): CooperativeLoanGuarantor[] {
    return (guarantors || []).map((guarantor) => ({
      memberId: Number(guarantor.memberId ?? 0),
      guaranteedAmount: Number(guarantor.guaranteedAmount ?? 0),
      status: (guarantor.status as CooperativeLoanGuarantor['status']) || 'PENDING',
      requestedAt: guarantor.requestedAt || new Date().toISOString(),
      decidedAt: guarantor.decidedAt,
      note: guarantor.note
    }));
  }

  private mapStatusHistoryEntry(entry: StatusHistory | undefined): CooperativeLoanAuditEntryView | null {
    if (!entry?.changedAt) {
      return null;
    }

    return {
      status: String(entry.status || this.loan?.status || 'PENDING'),
      changedAt: entry.changedAt,
      changedBy: this.formatHistoryActor(entry.changedBy),
      notes: String(entry.notes || '')
    };
  }

  private buildFallbackAuditEntry(status: string, changedAt: string | undefined, changedBy: string, notes: string): CooperativeLoanAuditEntryView | null {
    if (!changedAt) {
      return null;
    }

    return {
      status,
      changedAt,
      changedBy: changedBy || 'System',
      notes
    };
  }

  formatHistoryActor(value: unknown): string {
    if (value && typeof value === 'object') {
      const actor = value as { fullname?: string; username?: string; email?: string };
      return String(actor.fullname || actor.username || actor.email || 'System').trim();
    }

    const numericValue = Number(value || 0);
    if (numericValue > 0) {
      return `Admin #${numericValue}`;
    }

    return 'System';
  }
}
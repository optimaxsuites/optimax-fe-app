
// ...existing imports and code...

// All methods are already inside the main class below. Removed duplicate/erroneous class and misplaced code above.
import { Component, EventEmitter, Input, Output, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { LoanApplication, StatusChange, RepaymentScheduleItem } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanApprovalService } from '../../../service/loan/loan-approval.service';
import { LoanPurposeService, LoanPurposeData } from '../../../service/loan/loan-purpose.service';
import {
  formatLoanRepaymentDayDisplay,
  formatLoanPaymentModeDisplay,
  formatLoanPurposeDisplay,
  normalizeLoanRepaymentStartDate,
  resolveCompletedLoanActor,
  resolveLoanActorName,
  resolveLoanEmployeeName,
  resolveLoanTotalRepayableAmount
} from '../../../service/loan/loan-display.util';

type LoanLifecycleStage = {
  status: LoanApplication['status'];
  label: string;
  notes: string;
  fieldLabel: string;
};

const LOAN_LIFECYCLE_STAGES: LoanLifecycleStage[] = [
  { status: 'PENDING', label: 'Pending', notes: 'Loan application submitted', fieldLabel: 'Applied On' },
  { status: 'APPROVED', label: 'Approved', notes: 'Loan approved', fieldLabel: 'Approved On' },
  { status: 'READY_FOR_DISBURSEMENT', label: 'Disbursable', notes: 'Loan is disbursable', fieldLabel: 'Disbursable On' },
  { status: 'ACTIVE', label: 'Active', notes: 'Loan disbursed', fieldLabel: 'Disbursed On' },
  { status: 'SKIPPED', label: 'Skipped', notes: 'Repayment installment was skipped under an approved grace adjustment', fieldLabel: 'Skipped On' },
  { status: 'OVERDUE', label: 'Overdue', notes: 'Repayment has fallen behind schedule', fieldLabel: 'Overdue On' },
  { status: 'PAUSED', label: 'Paused', notes: 'Repayment activity has been paused by admin', fieldLabel: 'Paused On' },
  { status: 'DEFAULTED', label: 'Defaulted', notes: 'Loan has defaulted after repeated overdue installments', fieldLabel: 'Defaulted On' },
  { status: 'COMPLETED', label: 'Completed', notes: 'Loan completed', fieldLabel: 'Completed On' }
];

@Component({
  selector: 'app-employee-loan-details-modal',
  templateUrl: './employee-loan-details-modal.component.html',
  styleUrls: ['./employee-loan-details-modal.component.scss']
})
export class EmployeeLoanDetailsModalComponent implements OnInit, OnChanges {
  @Input() loan: LoanApplication | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();

  isDetailLoading = false;
  feedbackMessage = '';
  feedbackTone: 'success' | 'error' | 'info' = 'info';
  loanPurposes: LoanPurposeData[] = [];

  constructor(
    private loanApplicationService: LoanApplicationService,
    private loanApprovalService: LoanApprovalService,
    private loanPurposeService: LoanPurposeService
  ) {}

  ngOnInit(): void {
    this.loanPurposeService.getAllPurposes().subscribe({
      next: (purposes) => {
        this.loanPurposes = purposes;
        this.resolveLoanPurposeCode(this.loan);
        this.refreshLoanDetails();
      },
      error: (error) => {
        console.error('Error loading loan purposes in modal:', error);
        this.refreshLoanDetails();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loan']) {
      this.resolveLoanPurposeCode(this.loan);
      this.refreshLoanDetails();
    }
  }

  private resolveLoanPurposeCode(loan: LoanApplication | null): void {
    if (!loan) return;
    let code = (loan.purposeCode || '').trim().toUpperCase();
    let name = (loan.purpose || '').trim().toLowerCase();
    if (code === 'N/A' || code === '') {
      if (name) {
        const matchedPurpose = this.loanPurposes.find(p => (p.name || '').trim().toLowerCase() === name);
        if (matchedPurpose) {
          loan.purposeCode = matchedPurpose.code;
        }
      }
    }
  }

  get statusTimeline(): StatusChange[] {
    return this.loan ? this.buildStatusTimeline(this.loan) : [];
  }

  get lifecycleStageFields(): Array<{ label: string; value: string }> {
    return LOAN_LIFECYCLE_STAGES.map((stage) => ({
      label: stage.fieldLabel,
      value: this.formatDate(this.getLifecycleStageDate(stage.status))
    }));
  }

  get displayedStatus(): LoanApplication['status'] {
    return this.loan ? this.resolveDisplayedStatus(this.loan, this.statusTimeline) : 'PENDING';
  }

  get hasLoanDetails(): boolean {
    return !!this.loan;
  }

  get hasRepaymentLockNotice(): boolean {
    return this.displayedStatus === 'PAUSED' || this.displayedStatus === 'DEFAULTED';
  }

  isCurrentTimelineStatus(status: LoanApplication['status'] | undefined): boolean {
    if (!this.loan || !status) return false;
    return this.displayedStatus === status;
  }

  requestClose(): void {
    this.close.emit();
  }

  private refreshLoanDetails(): void {
    if (!this.loan?.id) {
      this.isDetailLoading = false;
      return;
    }

    const selectedLoanId = this.loan.id;
    this.isDetailLoading = true;
    // No interest agreement logic

    this.loanApplicationService.getApplicationById(String(selectedLoanId)).subscribe({
      next: (latestLoan) => {
        if (latestLoan && this.loan?.id === selectedLoanId) {
          this.loan = {
            ...this.loan,
            ...latestLoan
          };
          this.resolveLoanPurposeCode(this.loan);
        }

        this.isDetailLoading = false;
        // No interest agreement logic
      },
      error: (error) => {
        console.error('Error loading full loan details:', error);
        this.isDetailLoading = false;
        // No interest agreement logic
      }
    });
  }


  private setFeedback(tone: 'success' | 'error' | 'info', message: string): void {
    this.feedbackTone = tone;
    this.feedbackMessage = message;
  }

  private clearFeedback(): void {
    this.feedbackTone = 'info';
    this.feedbackMessage = '';
  }

  onMakePayment(event: { loan: LoanApplication; installment: RepaymentScheduleItem }): void {
    console.log('Make payment for:', event);
    this.refresh.emit();
  }

  calculateMonthlyRepayment(): number {
    if (!this.loan) return 0;
    const rate = this.getDisplayedInterestRate() / 100 / 12;
    const amount = this.loan.amount;
    const months = this.loan.repaymentTime;
    
    if (rate > 0 && months > 0) {
      return amount * rate * Math.pow(1 + rate, months) / (Math.pow(1 + rate, months) - 1);
    }
    return amount / months;
  }

  calculateTotalInterest(): number {
    if (!this.loan) return 0;
    const totalRepayable = this.calculateTotalRepayable();
    return totalRepayable - this.loan.amount;
  }

  calculateTotalRepayable(): number {
    if (!this.loan) return 0;
    if (this.loan.modeOfPayment === 'ONE_OFF') {
      return this.loan.amount * (1 + this.getDisplayedInterestRate() / 100);
    }
    return this.calculateMonthlyRepayment() * this.loan.repaymentTime;
  }

  formatCurrency(amount: number | undefined): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount ?? 0);
  }

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  formatPaymentModeDisplay(mode?: string | null): string {
    return formatLoanPaymentModeDisplay(mode);
  }

  getAppliedDate(): string | null {
    return this.getLifecycleStageDate('PENDING');
  }

  getAwaitingInterestAcceptanceDate(): string | null {
    return null;
  }

  getApprovedDate(): string | null {
    return this.getLifecycleStageDate('APPROVED');
  }

  getReadyForDisbursementDate(): string | null {
    return this.getLifecycleStageDate('READY_FOR_DISBURSEMENT');
  }

  getDisbursedDate(): string | null {
    return this.getLifecycleStageDate('ACTIVE');
  }

  getCompletedDate(): string | null {
    return this.getLifecycleStageDate('COMPLETED');
  }

  getLatestStatusDate(): string | null {
    if (!this.statusTimeline.length) return null;
    const sorted = [...this.statusTimeline].sort(
      (left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime()
    );
    return sorted[0]?.changedAt ?? null;
  }

  getAdminFeedback(): StatusChange | null {
    const withNotes = this.statusTimeline
      .filter((item) => item.status !== 'PENDING' && !!item.notes?.trim())
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime());

    if (withNotes[0]) return withNotes[0];
    if (!this.loan?.adminComment?.trim()) return null;

    return {
      status: this.loan.status,
      changedAt: this.getLatestStatusDate() || this.loan.requestDate,
      changedBy: this.resolveCurrentStatusActor(this.loan),
      notes: this.loan.adminComment
    };
  }

  getDisplayedInterestRate(): number {
    return Number(this.loan?.interestRate ?? 0);
  }

  getTotalRepayableAmount(): number {
    return this.loan ? resolveLoanTotalRepayableAmount(this.loan) : 0;
  }

  getDisplayedRepaymentStartDate(): string {
    const normalizedDate = normalizeLoanRepaymentStartDate(this.loan?.repaymentStartDate);
    if (!normalizedDate) {
      return 'N/A';
    }
    return new Date(normalizedDate).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getDisplayedRepaymentDay(): string {
    return formatLoanRepaymentDayDisplay(this.loan?.repaymentDay);
  }

  getDisplayedLateFeePercentage(): string {
    return `${Number(this.loan?.lateFeePercentage ?? 2).toFixed(2)}%`;
  }

  getDisplayedLateFeeGracePeriodDays(): string {
    const days = Number(this.loan?.lateFeeGracePeriodDays ?? 15);
    return `${days} day${days === 1 ? '' : 's'}`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  getStatusDisplay(status: string | undefined): string {
    switch (status) {
        case 'AWAITING_INTEREST_ACCEPTANCE':
          return 'Awaiting Interest Acceptance';
        case 'READY_FOR_DISBURSEMENT':
          return 'Disbursable';
        case 'SKIPPED':
          return 'Skipped';
        case 'OVERDUE':
          return 'Overdue';
        case 'PAUSED':
          return 'Paused';
        case 'DEFAULTED':
          return 'Defaulted';
        case 'PENDING':
          return 'Pending';
        case 'APPROVED':
          return 'Approved';
        case 'REJECTED':
          return 'Rejected';
        case 'ACTIVE':
          return 'Active';
        case 'COMPLETED':
          return 'Completed';
        default:
          return String(status || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  }

  getDayOrdinal(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  getDisbursementStatusText(): string {
    if (!this.loan) return 'N/A';
    
    if (this.loan.status === 'ACTIVE' && this.loan.disbursedDate) {
      return 'Disbursed';
    }
    if (this.loan.status === 'READY_FOR_DISBURSEMENT') {
      return 'Disbursable';
    }
    if (this.loan.disbursementInitiatedAt) {
      return 'Initiated - Pending Confirmation';
    }
    if (this.loan.status === 'APPROVED') {
      return 'Awaiting Initiation';
    }
    return 'Not Started';
  }

  getDisbursementStatusClass(): string {
    if (!this.loan) return '';
    
    if (this.loan.status === 'ACTIVE' && this.loan.disbursedDate) {
      return 'status-completed';
    }
    if (this.loan.status === 'READY_FOR_DISBURSEMENT') {
      return 'status-ready_for_disbursement';
    }
    if (this.loan.disbursementInitiatedAt) {
      return 'status-pending';
    }
    return 'status-default';
  }

  getRepaymentLockTitle(): string {
    return this.displayedStatus === 'DEFAULTED' ? 'Loan Defaulted' : 'Loan Paused';
  }

  getRepaymentLockMessage(): string {
    if (this.displayedStatus === 'DEFAULTED') {
      return 'This loan has defaulted. You can review the repayment timeline, but payment and extension actions are disabled until admin restores the loan.';
    }

    return 'This loan has been paused by admin. You can still review the repayment history, but payment and extension actions are temporarily disabled.';
  }

  getDisbursementInitiatedByName(): string {
    if (!this.loan?.disbursementInitiatedBy) return 'N/A';
    return resolveLoanActorName(this.loan.disbursementInitiatedBy);
  }

  getApprovedByName(): string {
    if (!this.loan?.approvedBy) return '';
    return resolveLoanActorName(this.loan.approvedBy);
  }

  private buildStatusTimeline(loan: LoanApplication): StatusChange[] {
    const timeline = this.getNormalizedLoanStatusHistory(loan)
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

  private resolveDisplayedStatus(loan: LoanApplication, timeline: StatusChange[] = []): LoanApplication['status'] {
    const explicitStatus = this.normalizeStatus(loan.status);
    const latestTimelineStatus = timeline.length > 0 ? timeline[timeline.length - 1].status : null;

    if (explicitStatus === 'COMPLETED') return 'COMPLETED';
    if (explicitStatus === 'DEFAULTED') return 'DEFAULTED';
    if (explicitStatus === 'PAUSED') return 'PAUSED';
    if (explicitStatus === 'OVERDUE') return 'OVERDUE';
    if (explicitStatus === 'SKIPPED') return 'SKIPPED';
    if (explicitStatus === 'ACTIVE') return 'ACTIVE';
    if (explicitStatus === 'READY_FOR_DISBURSEMENT') return 'READY_FOR_DISBURSEMENT';
    // removed 'AWAITING_INTEREST_ACCEPTANCE'
    if (explicitStatus === 'REJECTED') return 'REJECTED';
    if (explicitStatus === 'APPROVED') return 'APPROVED';
    if (latestTimelineStatus && latestTimelineStatus !== 'PENDING') return latestTimelineStatus;
    if (this.normalizeDate(loan.completedDate)) return 'COMPLETED';
    if (this.normalizeDate(loan.disbursedDate)) return 'ACTIVE';
    if (this.normalizeDate(loan.rejectedDate)) return 'REJECTED';
    if (this.normalizeDate(loan.approvedDate)) return 'APPROVED';
    return explicitStatus || latestTimelineStatus || 'PENDING';
  }

  private resolveCurrentStatusActor(loan: LoanApplication): string {
    // Implementation as needed or remove if not used
    return '';
  }

  private normalizeStatus(status: string | undefined): LoanApplication['status'] | null {
    const normalizedStatus = String(status || '').trim().toUpperCase();
    if (normalizedStatus === 'READY-FOR-DISBURSEMENT') {
      return 'READY_FOR_DISBURSEMENT';
    }
    const validStatuses: LoanApplication['status'][] = ['PENDING', 'APPROVED', 'READY_FOR_DISBURSEMENT', 'REJECTED', 'ACTIVE', 'SKIPPED', 'OVERDUE', 'DEFAULTED', 'PAUSED', 'COMPLETED'];
    return validStatuses.includes(normalizedStatus as LoanApplication['status']) ? normalizedStatus as LoanApplication['status'] : null;
  }

  private formatActor(actor: any): string {
    return resolveLoanActorName(actor);
  }

  private getStatusHistoryByStatus(status: LoanApplication['status']): StatusChange | null {
    if (!this.loan) return null;
    return this.findStatusHistoryByStatus(this.getNormalizedLoanStatusHistory(this.loan), status);
  }

  private getLifecycleStageDate(status: LoanApplication['status']): string | null {
    if (!this.loan) return null;

    switch (status) {
      case 'PENDING':
        return this.loan.requestDate || this.getStatusHistoryByStatus('PENDING')?.changedAt || null;
      case 'APPROVED':
        return this.loan.approvedDate || this.getStatusHistoryByStatus('APPROVED')?.changedAt || null;
      case 'ACTIVE':
        return this.loan.disbursedDate || this.getStatusHistoryByStatus('ACTIVE')?.changedAt || null;
      case 'SKIPPED':
      case 'OVERDUE':
      case 'PAUSED':
      case 'DEFAULTED':
        return this.getStatusHistoryByStatus(status)?.changedAt || null;
      case 'COMPLETED':
        return this.loan.completedDate || this.getStatusHistoryByStatus('COMPLETED')?.changedAt || null;
      case 'REJECTED':
        return this.loan.rejectedDate || this.getStatusHistoryByStatus('REJECTED')?.changedAt || null;
      case 'READY_FOR_DISBURSEMENT':
      default:
        return this.getStatusHistoryByStatus(status)?.changedAt || null;
    }
  }

  private buildDerivedLifecycleEntries(loan: LoanApplication): StatusChange[] {
    const entries: StatusChange[] = [];
    const loanStatusHistory = this.getNormalizedLoanStatusHistory(loan);
    const getHistoryEntry = (status: LoanApplication['status']) => this.findStatusHistoryByStatus(loanStatusHistory, status);

    const stageEntries: Array<StatusChange | null> = [
      this.buildLifecycleEntry('PENDING', this.loan?.requestDate || loan.requestDate, this.resolveEmployeeDisplayName(loan), 'Loan application submitted'),
      this.buildLifecycleEntry('APPROVED', loan.approvedDate, this.formatActor(loan.approvedBy), loan.adminComment || 'Loan approved'),
      this.buildLifecycleEntry('READY_FOR_DISBURSEMENT', loan.disbursementInitiatedAt, this.formatActor(loan.disbursementInitiatedBy), 'Loan sent to accounting for disbursement'),
      this.buildLifecycleEntry('ACTIVE', loan.disbursedDate, this.formatActor(loan.disbursedBy), 'Loan disbursed'),
      this.buildLifecycleEntry('SKIPPED', getHistoryEntry('SKIPPED')?.changedAt, this.resolveCurrentStatusActor(loan), 'Repayment installment skipped after approved grace adjustment'),
      this.buildLifecycleEntry('OVERDUE', getHistoryEntry('OVERDUE')?.changedAt, this.resolveCurrentStatusActor(loan), 'Repayment has become overdue'),
      this.buildLifecycleEntry('PAUSED', getHistoryEntry('PAUSED')?.changedAt, this.resolveCurrentStatusActor(loan), 'Loan paused by admin'),
      this.buildLifecycleEntry('DEFAULTED', getHistoryEntry('DEFAULTED')?.changedAt, this.resolveCurrentStatusActor(loan), 'Loan defaulted after repeated overdue installments'),
      this.buildLifecycleEntry('COMPLETED', loan.completedDate, resolveCompletedLoanActor(loan), 'Loan completed'),
      this.buildLifecycleEntry('REJECTED', loan.rejectedDate, this.formatActor(loan.rejectedBy), loan.adminComment || 'Loan rejected')
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
    changedAt: string | undefined | null,
    changedBy: string,
    notes: string
  ): StatusChange | null {
    const normalizedChangedAt = this.normalizeDate(changedAt || undefined);
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

  private findStatusHistoryByStatus(entries: StatusChange[], status: LoanApplication['status']): StatusChange | null {
    const matchingEntries = entries
      .filter((item) => item.status === status)
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime());

    return matchingEntries[0] ?? null;
  }

  private getNormalizedLoanStatusHistory(loan: LoanApplication): StatusChange[] {
    return [...(loan.statusHistory || [])].map((item) => ({
      ...item,
      status: this.normalizeStatus(item.status) || 'PENDING' as LoanApplication['status']
    }));
  }
  
    // --- MISSING METHODS ADDED BELOW ---
    private normalizeDate(value: string | undefined | null): string {
      const localRawValue = String(value || '').trim();
      if (!localRawValue || localRawValue.toLowerCase() === 'null' || localRawValue.toLowerCase() === 'undefined') {
        return '';
      }
      const timestamp = new Date(localRawValue).getTime();
      return Number.isFinite(timestamp) ? localRawValue : '';
    }

    private resolveEmployeeDisplayName(loan: LoanApplication): string {
      return loan.fullName || loan.employeeBankName || (loan.employeeId ? String(loan.employeeId) : '') || 'Employee';
    }
}
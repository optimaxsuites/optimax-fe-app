import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { LoanApplication, StatusChange } from '../../../service/loan/loan.types';
import { LoanApprovalService } from '../../../service/loan/loan-approval.service';
import { AdvanceInterestAgreementService, AdvanceInterestAgreement } from '../../../service/loan/loan-interest-agreement.service';
import {
  formatLoanPaymentModeDisplay,
  formatLoanPurposeDisplay,
  resolveCompletedLoanActor,
  resolveLoanActorName,
  resolveLoanEmployeeName,
  resolveLoanTotalRepayableAmount
} from '../../../service/loan/loan-display.util';

@Component({
  selector: 'app-employee-loan-details-modal',
  templateUrl: './employee-loan-details-modal.component.html',
  styleUrls: ['./employee-loan-details-modal.component.scss']
})
export class EmployeeLoanDetailsModalComponent implements OnInit {
  @Input() loan: LoanApplication | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();

  showInterestModal = false;
  showRejectionReason = false;
  rejectionReason = '';
  isLoading = false;
  interestAgreement: AdvanceInterestAgreement | null = null;

  constructor(
    private loanApprovalService: LoanApprovalService,
    private interestAgreementService: AdvanceInterestAgreementService
  ) {}

  ngOnInit(): void {
    this.loadInterestAgreement();
  }

  get statusTimeline(): StatusChange[] {
    return this.loan ? this.buildStatusTimeline(this.loan) : [];
  }

  get displayedStatus(): LoanApplication['status'] {
  return this.loan ? this.resolveDisplayedStatus(this.loan, this.statusTimeline) : 'PENDING';
}

  isCurrentTimelineStatus(status: LoanApplication['status'] | undefined): boolean {
    if (!this.loan || !status) return false;
    return this.displayedStatus === status;
  }

  requestClose(): void {
    this.close.emit();
  }

  openInterestAcceptanceModal(): void {
    this.loadInterestAgreement();
    this.showInterestModal = true;
    this.showRejectionReason = false;
    this.rejectionReason = '';
  }

  closeInterestModal(): void {
    this.showInterestModal = false;
    this.showRejectionReason = false;
    this.rejectionReason = '';
  }

  private loadInterestAgreement(): void {
    if (this.loan?.id) {
      this.interestAgreementService.getAgreementByLoanId(this.loan.id).subscribe({
        next: (agreement) => {
          this.interestAgreement = agreement;
          console.log('Interest agreement status:', agreement?.status);
        },
        error: (error) => {
          console.error('Error loading interest agreement:', error);
        }
      });
    }
  }

  // When employee accepts
acceptInterestRate(): void {
  if (!this.loan) return;
  
  this.isLoading = true;
  const acceptedRate = this.getDisplayedInterestRate();
  
  this.loanApprovalService.acceptInterestRate(this.loan.id, acceptedRate).subscribe({
    next: () => {
      this.isLoading = false;
      this.closeInterestModal();
      this.refresh.emit();
      alert(`Interest rate of ${acceptedRate}% accepted successfully. Loan is now APPROVED.`);
    },
    error: (error) => {
      this.isLoading = false;
      console.error('Error accepting interest rate:', error);
      alert('Failed to accept interest rate. Please try again.');
    }
  });
}

// When employee rejects
rejectInterestRate(): void {
  if (!this.loan) return;
  
  if (!this.showRejectionReason) {
    this.showRejectionReason = true;
    return;
  }
  
  if (!this.rejectionReason.trim()) {
    alert('Please provide a reason for rejecting the interest rate.');
    return;
  }
  
  this.isLoading = true;
  
  this.loanApprovalService.rejectInterestRate(this.loan.id, this.rejectionReason).subscribe({
    next: () => {
      this.isLoading = false;
      this.closeInterestModal();
      this.refresh.emit();
      alert('Interest rate rejected. Loan returned to PENDING status for admin review.');
    },
    error: (error) => {
      this.isLoading = false;
      console.error('Error rejecting interest rate:', error);
      alert('Failed to reject interest rate. Please try again.');
    }
  });
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
    if (!this.loan) return null;
    const pendingEntry = this.getStatusHistoryByStatus('PENDING');
    return pendingEntry?.changedAt || this.loan.requestDate || null;
  }

  getApprovedDate(): string | null {
    if (!this.loan) return null;
    if (this.loan.approvedDate) return this.loan.approvedDate;
    const approvedHistory = this.getStatusHistoryByStatus('APPROVED');
    if (approvedHistory?.changedAt) return approvedHistory.changedAt;
    return null;
  }

  getDisbursedDate(): string | null {
    if (!this.loan) return null;
    if (this.loan.disbursedDate) return this.loan.disbursedDate;
    const activeHistory = this.getStatusHistoryByStatus('ACTIVE');
    if (activeHistory?.changedAt) return activeHistory.changedAt;
    return null;
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

 // The interest rate comes from the loan directly
getDisplayedInterestRate(): number {
  if (!this.loan) return 0;
  return Number(this.loan.interestRate || 0);
}


  getTotalRepayableAmount(): number {
    return this.loan ? resolveLoanTotalRepayableAmount(this.loan) : 0;
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
      case 'APPROVED': return 'status-approved';
      case 'ACTIVE': return 'status-active';
      case 'PENDING': return 'status-pending';
      case 'REJECTED': return 'status-rejected';
      case 'COMPLETED': return 'status-completed';
      case 'AWAITING_INTEREST_ACCEPTANCE': return 'status-pending';
      default: return 'status-default';
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
        changedBy: this.resolveEmployeeDisplayName(loan),
        notes: 'Loan application submitted'
      });
    }

    if (approvedDate) {
      timeline.push({
        status: 'APPROVED',
        changedAt: approvedDate,
        changedBy: this.formatActor(loan.approvedBy),
        notes: loan.adminComment || 'Loan approved'
      });
    }

    if (rejectedDate) {
      timeline.push({
        status: 'REJECTED',
        changedAt: rejectedDate,
        changedBy: this.formatActor(loan.rejectedBy),
        notes: loan.adminComment || 'Loan rejected'
      });
    }

    if (disbursedDate) {
      timeline.push({
        status: 'ACTIVE',
        changedAt: disbursedDate,
        changedBy: this.formatActor(loan.disbursedBy),
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

    return timeline.sort((left, right) => 
      new Date(left.changedAt).getTime() - new Date(right.changedAt).getTime()
    );
  }

  private resolveDisplayedStatus(loan: LoanApplication, timeline: StatusChange[] = []): LoanApplication['status'] {
    const explicitStatus = this.normalizeStatus(loan.status);
    const latestTimelineStatus = timeline.length > 0 ? timeline[timeline.length - 1].status : null;

    if (explicitStatus === 'COMPLETED') return 'COMPLETED';
    if (explicitStatus === 'ACTIVE') return 'ACTIVE';
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
    switch (loan.status) {
      case 'APPROVED': return this.formatActor(loan.approvedBy);
      case 'REJECTED': return this.formatActor(loan.rejectedBy);
      case 'ACTIVE': return this.formatActor(loan.disbursedBy);
      case 'COMPLETED': return resolveCompletedLoanActor(loan);
      default: return this.resolveEmployeeDisplayName(loan);
    }
  }

  private resolveEmployeeDisplayName(loan: LoanApplication): string {
    return resolveLoanEmployeeName(loan);
  }

  private normalizeDate(value: string | undefined): string {
    const rawValue = String(value || '').trim();
    if (!rawValue || rawValue.toLowerCase() === 'null' || rawValue.toLowerCase() === 'undefined') return '';
    const timestamp = new Date(rawValue).getTime();
    return Number.isFinite(timestamp) ? rawValue : '';
  }

  private normalizeStatus(status: string | undefined): LoanApplication['status'] | null {
    const normalizedStatus = String(status || '').trim().toUpperCase();
    const validStatuses: LoanApplication['status'][] = ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED'];
    return validStatuses.includes(normalizedStatus as LoanApplication['status']) ? normalizedStatus as LoanApplication['status'] : null;
  }

  private formatActor(actor: any): string {
    return resolveLoanActorName(actor);
  }

  private getStatusHistoryByStatus(status: LoanApplication['status']): StatusChange | null {
    if (!this.statusTimeline.length) return null;
    const entries = this.statusTimeline
      .filter((item) => item.status === status)
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime());
    return entries[0] ?? null;
  }
}
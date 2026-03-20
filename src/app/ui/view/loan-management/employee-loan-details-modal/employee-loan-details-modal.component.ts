import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LoanApplication, StatusChange } from '../../../service/loan/loan.types';
import { formatLoanPaymentModeDisplay, formatLoanPurposeDisplay } from '../../../service/loan/loan-display.util';

@Component({
  selector: 'app-employee-loan-details-modal',
  templateUrl: './employee-loan-details-modal.component.html',
  styleUrls: ['./employee-loan-details-modal.component.scss']
})
export class EmployeeLoanDetailsModalComponent {
  @Input() loan: LoanApplication | null = null;
  @Output() close = new EventEmitter<void>();

  get statusTimeline(): StatusChange[] {
    return this.loan ? this.buildStatusTimeline(this.loan) : [];
  }

  get displayedStatus(): LoanApplication['status'] {
    return this.loan ? this.resolveDisplayedStatus(this.loan, this.statusTimeline) : 'PENDING';
  }

  isCurrentTimelineStatus(status: LoanApplication['status'] | undefined): boolean {
    if (!this.loan || !status) {
      return false;
    }

    return this.displayedStatus === status;
  }

  requestClose(): void {
    this.close.emit();
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
    if (!this.loan) {
      return null;
    }

    const pendingEntry = this.getStatusHistoryByStatus('PENDING');
    if (pendingEntry?.changedAt) {
      return pendingEntry.changedAt;
    }

    return this.loan.requestDate || null;
  }

  getApprovedDate(): string | null {
    if (!this.loan) {
      return null;
    }

    if (this.loan.approvedDate) {
      return this.loan.approvedDate;
    }

    const approvedHistory = this.getStatusHistoryByStatus('APPROVED');
    if (approvedHistory?.changedAt) {
      return approvedHistory.changedAt;
    }

    if (this.loan.status === 'ACTIVE' || this.loan.status === 'COMPLETED') {
      return this.loan.disbursedDate || this.loan.completedDate || null;
    }

    if (this.loan.status === 'APPROVED') {
      return this.getAdminFeedback()?.changedAt || this.getLatestStatusDate() || this.loan.requestDate;
    }

    return null;
  }

  getLatestStatusDate(): string | null {
    if (!this.statusTimeline.length) {
      return null;
    }

    const sorted = [...this.statusTimeline].sort(
      (left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime()
    );
    return sorted[0]?.changedAt ?? null;
  }

  getAdminFeedback(): StatusChange | null {
    const withNotes = this.statusTimeline
      .filter((item) => item.status !== 'PENDING' && !!item.notes?.trim())
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime());

    if (withNotes[0]) {
      return withNotes[0];
    }

    if (!this.loan?.adminComment?.trim()) {
      return null;
    }

    return {
      status: this.loan.status,
      changedAt: this.getLatestStatusDate() || this.loan.requestDate,
      changedBy: this.resolveCurrentStatusActor(this.loan),
      notes: this.loan.adminComment
    };
  }

  getDisplayedInterestRate(): number {
    if (!this.loan) {
      return 0;
    }

    if (this.displayedStatus !== 'APPROVED' && this.displayedStatus !== 'ACTIVE' && this.displayedStatus !== 'COMPLETED') {
      return 0;
    }

    if (Number(this.loan.interestRate || 0) > 0) {
      return Number(this.loan.interestRate || 0);
    }

    const approvedEntry = this.getStatusHistoryByStatus('APPROVED');
    return Number(approvedEntry?.interestRate || 0);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'N/A';
    }

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
      case 'APPROVED':
        return 'status-approved';
      case 'ACTIVE':
        return 'status-active';
      case 'PENDING':
        return 'status-pending';
      case 'REJECTED':
        return 'status-rejected';
      case 'COMPLETED':
        return 'status-completed';
      default:
        return 'status-default';
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
        notes: loan.status === 'APPROVED' && loan.adminComment ? loan.adminComment : 'Loan approved'
      });
    }

    if (rejectedDate) {
      timeline.push({
        status: 'REJECTED',
        changedAt: rejectedDate,
        changedBy: this.formatActor(loan.rejectedBy),
        notes: loan.status === 'REJECTED' && loan.adminComment ? loan.adminComment : 'Loan rejected'
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
        changedBy: 'System',
        notes: 'Loan completed'
      });
    }

    const dedupedTimeline = timeline
      .filter((entry, index, entries) => {
        const normalizedDate = this.normalizeDate(entry.changedAt);
        if (!normalizedDate) {
          return false;
        }

        return index === entries.findIndex((candidate) =>
          candidate.status === entry.status && this.normalizeDate(candidate.changedAt) === normalizedDate
        );
      })
      .sort((left, right) => new Date(left.changedAt).getTime() - new Date(right.changedAt).getTime());

    const resolvedStatus = this.resolveDisplayedStatus(loan, dedupedTimeline);
    const hasResolvedStatus = dedupedTimeline.some((entry) => entry.status === resolvedStatus);

    if (!hasResolvedStatus) {
      dedupedTimeline.push({
        status: resolvedStatus,
        changedAt: completedDate || disbursedDate || approvedDate || rejectedDate || requestDate || new Date().toISOString(),
        changedBy: this.resolveCurrentStatusActor(loan, resolvedStatus),
        notes: loan.adminComment || `Loan ${resolvedStatus.toLowerCase()}`
      });
    }

    return dedupedTimeline;
  }

  private resolveDisplayedStatus(loan: LoanApplication, timeline: StatusChange[] = []): LoanApplication['status'] {
    const explicitStatus = this.normalizeStatus(loan.status);
    const latestTimelineStatus = timeline
      .filter((item) => !!this.normalizeDate(item.changedAt))
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())[0]?.status;

    if (latestTimelineStatus && latestTimelineStatus !== 'PENDING') {
      return latestTimelineStatus;
    }

    if (this.normalizeDate(loan.completedDate)) {
      return 'COMPLETED';
    }

    if (this.normalizeDate(loan.disbursedDate)) {
      return 'ACTIVE';
    }

    if (this.normalizeDate(loan.rejectedDate)) {
      return 'REJECTED';
    }

    if (this.normalizeDate(loan.approvedDate)) {
      return 'APPROVED';
    }

    if (explicitStatus) {
      return explicitStatus;
    }

    return latestTimelineStatus || 'PENDING';
  }

  private resolveCurrentStatusActor(loan: LoanApplication, status: LoanApplication['status'] = this.displayedStatus): string {
    switch (status) {
      case 'APPROVED':
        return this.formatActor(loan.approvedBy);
      case 'REJECTED':
        return this.formatActor(loan.rejectedBy);
      case 'ACTIVE':
        return this.formatActor(loan.disbursedBy);
      case 'COMPLETED':
        return 'System';
      default:
        return this.resolveEmployeeDisplayName(loan);
    }
  }

  private resolveEmployeeDisplayName(loan: LoanApplication): string {
    const fullName = String(loan.fullName || '').trim();
    if (fullName) {
      return fullName;
    }

    const employeeId = Number(loan.employeeId || 0);
    if (employeeId > 0) {
      return `Employee ${employeeId}`;
    }

    return 'Employee';
  }

  private normalizeDate(value: string | undefined): string {
    const rawValue = String(value || '').trim();
    if (!rawValue || rawValue.toLowerCase() === 'null' || rawValue.toLowerCase() === 'undefined') {
      return '';
    }

    const timestamp = new Date(rawValue).getTime();
    return Number.isFinite(timestamp) ? rawValue : '';
  }

  private normalizeStatus(status: string | undefined): LoanApplication['status'] | null {
    const normalizedStatus = String(status || '').trim().toUpperCase();

    switch (normalizedStatus) {
      case 'PENDING':
      case 'APPROVED':
      case 'REJECTED':
      case 'ACTIVE':
      case 'COMPLETED':
        return normalizedStatus;
      default:
        return null;
    }
  }

  private formatActor(actor: LoanApplication['approvedBy'] | LoanApplication['disbursedBy'] | LoanApplication['rejectedBy'] | string | undefined): string {
    if (!actor) {
      return 'System';
    }

    if (typeof actor === 'string') {
      return actor;
    }

    if (typeof actor === 'number') {
      return actor > 0 ? `User ${actor}` : 'System';
    }

    return actor.fullname || actor.username || actor.email || 'System';
  }

  private getStatusHistoryByStatus(status: LoanApplication['status']): StatusChange | null {
    if (!this.statusTimeline.length) {
      return null;
    }

    const entries = this.statusTimeline
      .filter((item) => item.status === status)
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime());

    return entries[0] ?? null;
  }
}

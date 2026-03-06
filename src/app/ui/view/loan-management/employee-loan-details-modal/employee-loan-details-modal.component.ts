import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LoanApplication, StatusChange } from '../../../service/loan/loan.types';

@Component({
  selector: 'app-employee-loan-details-modal',
  templateUrl: './employee-loan-details-modal.component.html',
  styleUrls: ['./employee-loan-details-modal.component.scss']
})
export class EmployeeLoanDetailsModalComponent {
  @Input() loan: LoanApplication | null = null;
  @Output() close = new EventEmitter<void>();

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

  getApprovedDate(): string | null {
    if (!this.loan) {
      return null;
    }

    if (this.loan.approvedDate) {
      return this.loan.approvedDate;
    }

    const approvedHistory = this.getStatusHistoryByStatus('APPROVED');
    return approvedHistory?.date ?? null;
  }

  getLatestStatusDate(): string | null {
    if (!this.loan || !this.loan.statusHistory?.length) {
      return null;
    }

    const sorted = [...this.loan.statusHistory].sort(
      (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
    );
    return sorted[0]?.date ?? null;
  }

  getAdminFeedback(): StatusChange | null {
    if (!this.loan?.statusHistory?.length) {
      return null;
    }

    const withNotes = this.loan.statusHistory
      .filter((item) => !!item.notes?.trim())
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

    return withNotes[0] ?? null;
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

  private getStatusHistoryByStatus(status: LoanApplication['status']): StatusChange | null {
    if (!this.loan?.statusHistory?.length) {
      return null;
    }

    const entries = this.loan.statusHistory
      .filter((item) => item.status === status)
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

    return entries[0] ?? null;
  }
}

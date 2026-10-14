import { Component, DestroyRef, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { AdvancePaymentRecordService, PaymentRecord } from '../../../service/loan/loan-payment-record.service';
import { formatNaira, getLoanStatusLabel } from '../../../service/loan/loan-format.util';
import { getPaymentTypeLabel, getPaymentTypeTone } from '../../../service/loan/loan-payment-types';

/** Payment records for one advance loan. Reloads whenever `loanId` changes. */
@Component({
  selector: 'app-employee-payment-history',
  templateUrl: './employee-payment-history.component.html',
  styleUrls: ['./employee-payment-history.component.scss']
})
export class EmployeePaymentHistoryComponent implements OnChanges {
  private readonly destroyRef = inject(DestroyRef);

  @Input() loanId!: number;

  paymentRecords: PaymentRecord[] = [];
  isLoading = false;
  loadFailed = false;
  /** Sum of COMPLETED payments only; pending/failed records are not money received. */
  totalPaid = 0;
  pendingTotal = 0;

  private loadSubscription?: Subscription;

  constructor(private paymentRecordService: AdvancePaymentRecordService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loanId']) {
      this.loadPaymentHistory();
    }
  }

  loadPaymentHistory(): void {
    // Switching loans quickly must not let an older response overwrite the newer one.
    this.loadSubscription?.unsubscribe();
    this.paymentRecords = [];
    this.totalPaid = 0;
    this.pendingTotal = 0;
    this.loadFailed = false;

    const loanId = Number(this.loanId || 0);
    if (!loanId) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.loadSubscription = this.paymentRecordService.getPaymentRecordsByLoanId(loanId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (records) => {
          // Keep only this loan's records even if the backend ignores the loanId filter.
          this.paymentRecords = (records || [])
            .filter((record) => Number(record.loanId) === loanId)
            .sort((a, b) =>
              new Date(b.paidAt || b.recordedAt || '').getTime() - new Date(a.paidAt || a.recordedAt || '').getTime()
            );
          this.totalPaid = this.sumByStatus('COMPLETED');
          this.pendingTotal = this.sumByStatus('PENDING');
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading payment history:', error);
          this.loadFailed = true;
          this.isLoading = false;
        }
      });
  }

  private sumByStatus(status: PaymentRecord['status']): number {
    const total = this.paymentRecords
      .filter((record) => String(record.status || '').toUpperCase() === status)
      .reduce((sum, record) => sum + Number(record.amount || 0), 0);
    return Number(total.toFixed(2));
  }

  formatCurrency(amount: number): string {
    return formatNaira(amount);
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getPaymentTypeLabel(type: string): string {
    return getPaymentTypeLabel(type);
  }

  getPaymentTypeClass(type: string): string {
    return getPaymentTypeTone(type);
  }

  getPaymentMethodLabel(method: string | undefined): string {
    return getLoanStatusLabel(method) || 'N/A';
  }

  getStatusLabel(status: string): string {
    return getLoanStatusLabel(status);
  }

  getStatusClass(status: string): string {
    switch (String(status || '').toUpperCase()) {
      case 'COMPLETED': return 'status-completed';
      case 'PENDING': return 'status-pending';
      case 'FAILED': return 'status-failed';
      default: return '';
    }
  }
}

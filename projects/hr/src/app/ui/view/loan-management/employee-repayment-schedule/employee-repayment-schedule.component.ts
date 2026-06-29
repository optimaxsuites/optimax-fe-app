// employee-repayment-schedule.component.ts
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { LoanApplication, RepaymentScheduleItem } from '../../../service/loan/loan.types';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeLoanGroup, CooperativeRepayment } from '../../../service/loan/cooperative-loan/cooperative.types';
import {
  formatLoanPurposeDisplay,
  getLoanRepaymentStatusTitle,
  hasLoanBeenDisbursed,
  hasLoanRepaymentStarted,
  resolveLoanOutstandingBalance,
  resolveLoanRepaymentProgress,
  resolveLoanTotalPaid,
  resolveLoanTotalRepayableAmount,
  resolveLoanInterestAmount
} from '../../../service/loan/loan-display.util';

@Component({
  selector: 'app-employee-repayment-schedule',
  templateUrl: './employee-repayment-schedule.component.html',
  styleUrls: ['./employee-repayment-schedule.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class EmployeeRepaymentScheduleComponent implements OnInit, OnChanges {
  @Input() loan!: LoanApplication;
  @Input() paymentMode: 'advance' | 'cooperative' = 'advance';
  @Input() cooperativeLoan: CooperativeLoan | null = null;
  @Input() cooperativeGroup: CooperativeLoanGroup | null = null;
  @Output() repaymentUpdated = new EventEmitter<void>();
  
  // Summary stats
  totalPaid: number = 0;
  totalRemaining: number = 0;
  totalRepayable: number = 0;
  paidCount: number = 0;
  upcomingCount: number = 0;
  overdueCount: number = 0;
  completionPercentage: number = 0;
  
  // For visualization
  nextPaymentDate: string = '';
  nextPaymentAmount: number = 0;
  
  // Modal visibility
  showPaymentModal = false;
  showGracePeriodModal = false;
  selectedInstallment: RepaymentScheduleItem | null = null;
  selectedCooperativeInstallment: CooperativeRepayment | null = null;
  
  ngOnInit() {
    this.calculateStats();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loan']) {
      this.calculateStats();
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  getFormattedLoanCode(): string {
    if (!this.loan) return '';
    const rawCode = String(this.loan.loanCode || this.loan.id || '').trim();
    if (!rawCode) return '';
    return /^ADV-/i.test(rawCode) ? rawCode : `ADV-${rawCode}`;
  }

  getStatusDisplay(status: string | undefined): string {
    if (!status) return '';
    return String(status)
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  getStatusClass(status: string | undefined): string {
    const statusMap: Record<string, string> = {
      'PENDING': 'pending',
      'APPROVED': 'approved',
      'READY_FOR_DISBURSEMENT': 'ready_for_disbursement',
      'ACTIVE': 'active',
      'REJECTED': 'rejected',
      'COMPLETED': 'completed',
      'SKIPPED': 'skipped',
      'OVERDUE': 'overdue',
      'DEFAULTED': 'defaulted',
      'PAUSED': 'paused'
    };
    return statusMap[status || ''] || 'default';
  }
  
  calculateStats(): void {
    if (!this.loan?.repaymentSchedule?.length) {
      this.totalPaid = 0;
      this.totalRemaining = 0;
      this.totalRepayable = 0;
      this.paidCount = 0;
      this.upcomingCount = 0;
      this.overdueCount = 0;
      this.completionPercentage = 0;
      this.nextPaymentDate = '';
      this.nextPaymentAmount = 0;
      return;
    }

    this.totalPaid = resolveLoanTotalPaid(this.loan);
    this.totalRepayable = resolveLoanTotalRepayableAmount(this.loan);
    this.totalRemaining = resolveLoanOutstandingBalance(this.loan);
    
    this.paidCount = this.loan.repaymentSchedule
      .filter(item => item.status === 'PAID').length;
    
    this.upcomingCount = this.loan.repaymentSchedule
      .filter(item => item.status === 'PENDING').length;
    
    this.overdueCount = this.loan.repaymentSchedule
      .filter(item => item.status === 'OVERDUE').length;

    this.completionPercentage = resolveLoanRepaymentProgress(this.loan);
    
    const nextPayment = this.loan.repaymentSchedule
      .find(item => item.status === 'PENDING');
    
    if (nextPayment) {
      this.nextPaymentDate = nextPayment.dueDate;
      this.nextPaymentAmount = nextPayment.totalAmount;
    } else {
      this.nextPaymentDate = '';
      this.nextPaymentAmount = 0;
    }
  }
  
  openPaymentModal(installment?: RepaymentScheduleItem): void {
    if (!this.canTakeRepaymentActions()) return;

    if (installment) {
      this.selectedInstallment = installment;
    } else {
      this.selectedInstallment = this.loan?.repaymentSchedule
        .find(item => item.status === 'PENDING' || item.status === 'OVERDUE') || null;
    }
    this.selectedCooperativeInstallment = this.paymentMode === 'cooperative'
      ? this.mapToCooperativeInstallment(this.selectedInstallment)
      : null;
    this.showPaymentModal = true;
  }
  
  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedInstallment = null;
    this.selectedCooperativeInstallment = null;
  }
  
  openGracePeriodModal(installment?: RepaymentScheduleItem): void {
    if (!this.canTakeRepaymentActions()) return;

    if (installment) {
      this.selectedInstallment = installment;
    } else {
      this.selectedInstallment = this.loan?.repaymentSchedule
        .find(item => item.status === 'PENDING' || item.status === 'OVERDUE') || null;
    }
    
    // Use setTimeout to ensure modal renders properly
    setTimeout(() => {
      this.showGracePeriodModal = true;
    }, 0);
  }
  
  closeGracePeriodModal(): void {
    this.showGracePeriodModal = false;
    this.selectedInstallment = null;
  }
  
  onPaymentSuccess(): void {
    this.closePaymentModal();
    this.calculateStats();
    this.repaymentUpdated.emit();
  }
  
  onGracePeriodSubmitted(): void {
    this.closeGracePeriodModal();
    this.calculateStats();
    this.repaymentUpdated.emit();
  }
  
  getStatusIcon(status: string): string {
    switch(status) {
      case 'PAID': return 'fas fa-check-circle';
      case 'PENDING': return 'fas fa-clock';
      case 'OVERDUE': return 'fas fa-exclamation-triangle';
      case 'SKIPPED': return 'fas fa-ban';
      default: return 'fas fa-circle';
    }
  }
  
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  hasBeenDisbursed(): boolean {
    return hasLoanBeenDisbursed(this.loan);
  }

  hasRepaymentStarted(): boolean {
    return hasLoanRepaymentStarted(this.loan);
  }

  getRepaymentStatusTitle(): string {
    return getLoanRepaymentStatusTitle(this.loan);
  }

  canTakeRepaymentActions(): boolean {
    return this.loan?.status === 'ACTIVE' || this.loan?.status === 'SKIPPED' || this.loan?.status === 'OVERDUE';
  }

  hasRepaymentScheduleAccess(): boolean {
    return this.canTakeRepaymentActions()
      || this.loan?.status === 'PAUSED'
      || this.loan?.status === 'DEFAULTED'
      || this.loan?.status === 'COMPLETED'
      || this.hasBeenDisbursed();
  }

  isRepaymentLocked(): boolean {
    return this.loan?.status === 'PAUSED' || this.loan?.status === 'DEFAULTED';
  }

  getRepaymentLockTitle(): string {
    return this.loan?.status === 'DEFAULTED' ? 'Repayment Locked By Default' : 'Repayment Temporarily Paused';
  }

  getRepaymentLockMessage(): string {
    if (this.loan?.status === 'DEFAULTED') {
      return 'This loan has been marked as defaulted. You can still review the schedule, but payment and extension requests stay locked until admin intervenes.';
    }
    return 'This loan is currently paused by admin. You can review the repayment schedule, but payment and extension requests are temporarily unavailable.';
  }

  private mapToCooperativeInstallment(installment: RepaymentScheduleItem | null): CooperativeRepayment | null {
    if (!installment || !this.cooperativeLoan) return null;

    return {
      id: Number(installment.id || installment.installmentNo || 0),
      loanId: Number(this.cooperativeLoan.id || 0),
      amount: Number(installment.totalAmount || 0),
      dueDate: installment.dueDate,
      principalComponent: Number(installment.principalAmount || 0),
      interestComponent: Number(installment.interestAmount || 0),
      lateFeeAmount: Number(installment.lateFeeAmount || 0),
      modeofPayment: (installment.paymentMethod as CooperativeRepayment['modeofPayment']) || 'BANK_TRANSFER',
      status: installment.status,
      receiptNumber: installment.receiptNumber,
      notes: installment.notes
    };
  }
}
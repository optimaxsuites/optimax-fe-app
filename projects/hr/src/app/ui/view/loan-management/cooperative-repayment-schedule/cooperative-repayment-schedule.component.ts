import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeLoanGroup, CooperativeMember, CooperativeRepayment } from '../../../service/loan/cooperative-loan/cooperative.types';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { formatNaira, getLoanStatusLabel } from '../../../service/loan/loan-format.util';

@Component({
  selector: 'app-cooperative-repayment-schedule',
  templateUrl: './cooperative-repayment-schedule.component.html',
  styleUrls: ['./cooperative-repayment-schedule.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CooperativeRepaymentScheduleComponent implements OnInit, OnChanges {
  @Input() loan!: CooperativeLoan;
  @Input() member!: CooperativeMember;
  @Input() group: CooperativeLoanGroup | null = null;
  @Input() repayments: CooperativeRepayment[] = [];
  @Input() showActions: boolean = true;
  @Output() repaymentUpdated = new EventEmitter<void>();
  @Input() cooperativeService!: CooperativeService;

  // Modal visibility
  showPaymentModal = false;
  showGracePeriodModal = false;
  selectedInstallment: CooperativeRepayment | null = null;

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

  ngOnInit() {
    this.ensureRepaymentsLoaded();
    this.calculateStats();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loan'] || changes['repayments']) {
      this.ensureRepaymentsLoaded();
      this.calculateStats();
    }
  }

  ensureRepaymentsLoaded(): void {
    // If repayments are empty, try to fetch or initialize them
    if (this.loan && this.cooperativeService && (!this.repayments || this.repayments.length === 0)) {
      const fetched = this.cooperativeService.getRepaymentsByLoanId(this.loan.id);
      if (fetched && fetched.length > 0) {
        this.repayments = fetched;
        // Debug output
        console.warn('[CoopRepaymentSchedule] Repayments loaded for loan', this.loan.id, fetched);
      } else {
        // Debug output
        console.warn('[CoopRepaymentSchedule] No repayments found for loan', this.loan.id);
      }
    }
  }

  formatCurrency(amount: number): string {
    return formatNaira(amount);
  }

  get repaymentSchedule() {
    if (!this.loan || !this.cooperativeService) return [];
    const repayments = this.repayments.length 
      ? this.repayments 
      : this.cooperativeService.getRepaymentsByLoanId(this.loan.id) || [];
    let remainingBalance = Number(this.loan.repaymentAmount || this.loan.amount || 0);
    return repayments.map((item, index) => {
      const totalPayment = Number(item.amount || 0);
      const principal = Number(item.principalComponent || Math.max(totalPayment - Number(item.interestComponent || 0), 0));
      const interest = Number(item.interestComponent || 0);
      remainingBalance = Math.max(Number((remainingBalance - totalPayment).toFixed(2)), 0);
      return {
        schedule: {
          installmentNo: index + 1,
          dueDate: item.dueDate,
          principalAmount: principal,
          interestAmount: interest,
          totalAmount: totalPayment,
          paidAmount: item.status === 'PAID' ? totalPayment : 0,
          remainingBalance,
          status: item.status,
          paymentMethod: item.modeofPayment || 'BANK_TRANSFER'
        },
        repayment: item
      };
    });
  }

  get scheduleRows() {
    return this.repaymentSchedule.map((row: any) => row.schedule);
  }

  calculateStats(): void {
    const schedule = this.repaymentSchedule;
    if (!schedule.length) {
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
    this.totalPaid = schedule.filter((item: any) => item.schedule.status === 'PAID').reduce((sum: number, item: any) => sum + Number(item.schedule.totalAmount || 0), 0);
    this.totalRepayable = schedule.reduce((sum: number, item: any) => sum + Number(item.schedule.totalAmount || 0), 0);
    this.totalRemaining = schedule.filter((item: any) => item.schedule.status !== 'PAID').reduce((sum: number, item: any) => sum + Number(item.schedule.totalAmount || 0), 0);
    this.paidCount = schedule.filter((item: any) => item.schedule.status === 'PAID').length;
    this.upcomingCount = schedule.filter((item: any) => item.schedule.status === 'PENDING').length;
    this.overdueCount = schedule.filter((item: any) => item.schedule.status === 'OVERDUE').length;
    this.completionPercentage = this.totalRepayable > 0 ? Math.round((this.totalPaid / this.totalRepayable) * 100) : 0;
    const nextPayment = schedule.find((item: any) => item.schedule.status === 'PENDING');
    if (nextPayment) {
      this.nextPaymentDate = nextPayment.schedule.dueDate;
      this.nextPaymentAmount = nextPayment.schedule.totalAmount;
    } else {
      this.nextPaymentDate = '';
      this.nextPaymentAmount = 0;
    }
  }

  getStatusDisplay(status: string): string {
    return getLoanStatusLabel(status);
  }

  getFormattedLoanCode(): string {
    const rawCode = String(this.loan?.loanCode || this.loan?.loanId || this.loan?.id || '').trim();
    return rawCode || 'COOP-LOAN';
  }

  getRepaymentStatusTitle(): string {
    if (this.loan?.status === 'COMPLETED') {
      return 'Repaid in Full';
    }
    if (this.loan?.status === 'DEFAULTED') {
      return 'Defaulted';
    }
    if (this.loan?.status === 'PAUSED') {
      return 'Paused by Admin';
    }
    if (this.loan?.status === 'OVERDUE') {
      return 'Overdue';
    }
    if (this.loan?.status === 'SKIPPED') {
      return 'Skipped Installment';
    }
    return 'In Repayment';
  }

  openPaymentModal(installment: CooperativeRepayment | null = null): void {
    if (!this.canTakeRepaymentActions()) {
      return;
    }
    this.selectedInstallment = installment;
    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedInstallment = null;
  }

  openGracePeriodModal(installment: CooperativeRepayment | null = null): void {
    if (!this.canTakeRepaymentActions()) {
      return;
    }
    this.selectedInstallment = installment;
    this.showGracePeriodModal = true;
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

  getStatusClass(status: string): string {
    switch(status) {
      case 'PAID': return 'status-paid';
      case 'PENDING': return 'status-pending';
      case 'OVERDUE': return 'status-overdue';
      case 'SKIPPED': return 'status-skipped';
      default: return '';
    }
  }

  getProgressColor(): string {
    if (this.overdueCount > 0) return '#ea580c';
    if (this.completionPercentage >= 100) return '#059669';
    if (this.completionPercentage >= 50) return '#f59e0b';
    return '#3b82f6';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  canTakeRepaymentActions(): boolean {
    return this.loan?.status === 'ACTIVE' || this.loan?.status === 'SKIPPED' || this.loan?.status === 'OVERDUE';
  }

  hasRepaymentScheduleAccess(): boolean {
    return this.canTakeRepaymentActions()
      || this.loan?.status === 'PAUSED'
      || this.loan?.status === 'DEFAULTED'
      || this.loan?.status === 'COMPLETED';
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

  // Helper method to get repayment by installment number - returns null instead of undefined
  getRepaymentByInstallmentNo(installmentNo: number): CooperativeRepayment | null {
    const schedule = this.repaymentSchedule;
    if (schedule && schedule[installmentNo - 1]) {
      return schedule[installmentNo - 1].repayment;
    }
    return null;
  }
}
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { LoanApplication, RepaymentScheduleItem } from '../../../service/loan/loan.types';
import {
  formatLoanPurposeDisplay,
  getLoanRepaymentStatusTitle,
  hasLoanBeenDisbursed,
  hasLoanRepaymentStarted,
  resolveLoanOutstandingBalance,
  resolveLoanRepaymentProgress,
  resolveLoanTotalPaid,
  resolveLoanTotalRepayableAmount
} from '../../../service/loan/loan-display.util';

@Component({
  selector: 'app-employee-repayment-schedule',
  templateUrl: './employee-repayment-schedule.component.html',
  styleUrls: ['./employee-repayment-schedule.component.scss']
})
export class EmployeeRepaymentScheduleComponent implements OnInit, OnChanges {
  @Input() loan!: LoanApplication;
  
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
    this.calculateStats();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loan']) {
      this.calculateStats();
    }
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
    
    // Find next payment
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
    if (this.overdueCount > 0) return '#FF0000';
    if (this.completionPercentage >= 100) return '#2EB270';
    if (this.completionPercentage >= 50) return '#FFA500';
    return '#2E6276';
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
  
  isOverdue(item: RepaymentScheduleItem): boolean {
    if (item.status !== 'PENDING') return false;
    const dueDate = new Date(item.dueDate);
    const today = new Date();
    return dueDate < today;
  }
}
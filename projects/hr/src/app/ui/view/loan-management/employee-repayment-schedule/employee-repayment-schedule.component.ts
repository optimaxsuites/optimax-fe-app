import { Component, Input, OnInit } from '@angular/core';
import { LoanApplication, RepaymentScheduleItem } from '../../../service/loan/loan.types';

@Component({
  selector: 'app-employee-repayment-schedule',
  templateUrl: './employee-repayment-schedule.component.html',
  styleUrls: ['./employee-repayment-schedule.component.scss']
})
export class EmployeeRepaymentScheduleComponent implements OnInit {
  @Input() loan!: LoanApplication;
  
  // Summary stats
  totalPaid: number = 0;
  totalRemaining: number = 0;
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
  
  calculateStats(): void {
    if (!this.loan?.repaymentSchedule) return;
    
    this.totalPaid = this.loan.repaymentSchedule
      .filter(item => item.status === 'PAID')
      .reduce((sum, item) => sum + item.totalAmount, 0);
    
    this.totalRemaining = this.loan.repaymentSchedule
      .filter(item => item.status !== 'PAID')
      .reduce((sum, item) => sum + item.totalAmount, 0);
    
    this.paidCount = this.loan.repaymentSchedule
      .filter(item => item.status === 'PAID').length;
    
    this.upcomingCount = this.loan.repaymentSchedule
      .filter(item => item.status === 'PENDING').length;
    
    this.overdueCount = this.loan.repaymentSchedule
      .filter(item => item.status === 'OVERDUE').length;
    
    this.completionPercentage = (this.paidCount / this.loan.repaymentSchedule.length) * 100;
    
    // Find next payment
    const nextPayment = this.loan.repaymentSchedule
      .find(item => item.status === 'PENDING');
    
    if (nextPayment) {
      this.nextPaymentDate = nextPayment.dueDate;
      this.nextPaymentAmount = nextPayment.totalAmount;
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
  
  isOverdue(item: RepaymentScheduleItem): boolean {
    if (item.status !== 'PENDING') return false;
    const dueDate = new Date(item.dueDate);
    const today = new Date();
    return dueDate < today;
  }
}
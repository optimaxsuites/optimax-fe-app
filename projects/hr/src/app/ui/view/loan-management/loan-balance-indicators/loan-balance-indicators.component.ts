import { Component, Input, OnInit } from '@angular/core';
import { LoanApplication } from '../../../service/loan/loan.types';

@Component({
  selector: 'app-loan-balance-indicators',
  templateUrl: '../loan-balance-indicators/loan-balance-indicators.component.html',
  styleUrls: ['../loan-balance-indicators/loan-balance-indicators.component.scss']
})
export class LoanBalanceIndicatorsComponent implements OnInit {
  @Input() loan!: LoanApplication;
  
  progressPercentage: number = 0;
  isOverdue: boolean = false;
  daysUntilDue: number = 0;
  nextPaymentDate?: string;
  
  ngOnInit() {
    this.calculateBalanceInfo();
  }
  
  calculateBalanceInfo(): void {
    if (!this.loan) return;
    
    // Calculate progress
    this.progressPercentage = ((this.loan.loanAmount - this.loan.currentBalance) / this.loan.loanAmount) * 100;
    
    // Find next payment due
    const pendingPayments = this.loan.repaymentSchedule.filter(
      item => item.status === 'PENDING' || item.status === 'OVERDUE'
    );
    
    if (pendingPayments.length > 0) {
      this.nextPaymentDate = pendingPayments[0].dueDate;
      
      // Calculate days until due
      const today = new Date();
      const dueDate = new Date(pendingPayments[0].dueDate);
      this.daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      this.isOverdue = this.daysUntilDue < 0;
    }
  }
  
  getProgressColor(): string {
    if (this.isOverdue) return '#FF0000';
    if (this.progressPercentage >= 100) return '#2EB270';
    if (this.progressPercentage >= 75) return '#2EB270';
    if (this.progressPercentage >= 50) return '#FFA500';
    return '#2E6276';
  }
  
  getStatusText(): string {
    if (this.loan.currentBalance <= 0) return 'Paid Off';
    if (this.isOverdue) return 'Overdue';
    if (this.progressPercentage >= 100) return 'Completed';
    if (this.progressPercentage >= 75) return 'Almost Done';
    if (this.progressPercentage >= 50) return 'Halfway There';
    if (this.progressPercentage >= 25) return 'In Progress';
    return 'Just Started';
  }
}
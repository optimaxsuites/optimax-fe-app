import { Component, Input, OnInit } from '@angular/core';
import { LoanService, LoanApplication, RepaymentScheduleItem } from '../../../service/loan/loan.service';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-repayment-schedule',
  templateUrl: './repayment-schedule-view.component.html',
  styleUrls: ['./repayment-schedule-view.component.scss']
})
export class RepaymentScheduleComponent implements OnInit {
  @Input() loan!: LoanApplication;
  
  displayedColumns: string[] = ['month', 'dueDate', 'principal', 'interest', 'total', 'balance', 'status'];
  chartData: any[] = [];
  chartLabels: string[] = [];
  
  ngOnInit() {
    this.prepareChartData();
  }
  
  prepareChartData(): void {
    if (!this.loan?.repaymentSchedule) return;
    
    // Prepare data for the chart
    this.chartLabels = this.loan.repaymentSchedule.map((item: { monthNumber: any; }) => `Month ${item.monthNumber}`);
    
    const principalData = this.loan.repaymentSchedule.map((item: { principal: any; }) => item.principal);
    const interestData = this.loan.repaymentSchedule.map((item: { interest: any; }) => item.interest);
    const balanceData = this.loan.repaymentSchedule.map((item: { remainingBalance: any; }) => item.remainingBalance);
    
    this.chartData = [
      { data: principalData, label: 'Principal', type: 'bar', order: 1 },
      { data: interestData, label: 'Interest', type: 'bar', order: 2 },
      { data: balanceData, label: 'Remaining Balance', type: 'line', order: 3, yAxisID: 'y1' }
    ];
  }
  
  getTotalPrincipal(): number {
    return this.loan.repaymentSchedule.reduce((sum: any, item: { principal: any; }) => sum + item.principal, 0);
  }
  
  getTotalInterest(): number {
    return this.loan.repaymentSchedule.reduce((sum: any, item: { interest: any; }) => sum + item.interest, 0);
  }
  
  getTotalPayment(): number {
    return this.loan.repaymentSchedule.reduce((sum: any, item: { totalPayment: any; }) => sum + item.totalPayment, 0);
  }
  
  getStatusClass(status: string): string {
    switch(status.toLowerCase()) {
      case 'paid': return 'status-paid';
      case 'pending': return 'status-pending';
      case 'overdue': return 'status-overdue';
      case 'skipped': return 'status-skipped';
      default: return '';
    }
  }
}
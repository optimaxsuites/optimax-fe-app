import { Component, Input, OnInit } from '@angular/core';
import { LoanApplication, RepaymentScheduleItem } from '../../../service/loan/loan.types';

@Component({
  selector: 'app-repayment-schedule-view',
  templateUrl: './repayment-schedule-view.component.html',
  styleUrls: ['./repayment-schedule-view.component.scss']
})
export class RepaymentScheduleViewComponent implements OnInit {
  @Input() loan!: LoanApplication;
  
  displayedColumns: string[] = ['month', 'dueDate', 'principal', 'interest', 'total', 'balance', 'status'];

  repaymentColumns = [
    {
      header: 'Month',
      formatter: (row: RepaymentRow) => row.isTotal ? 'Totals' : row.monthNumber
    },
    {
      header: 'Due Date',
      formatter: (row: RepaymentRow) =>
        row.isTotal ? '—' : (row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—')
    },
    {
      header: 'Principal',
      formatter: (row: RepaymentRow) =>
        typeof row.principal === 'number' ? `₦${row.principal.toLocaleString()}` : '—'
    },
    {
      header: 'Interest',
      formatter: (row: RepaymentRow) =>
        typeof row.interest === 'number' ? `₦${row.interest.toLocaleString()}` : '—'
    },
    {
      header: 'Total Payment',
      formatter: (row: RepaymentRow) =>
        typeof row.totalPayment === 'number' ? `₦${row.totalPayment.toLocaleString()}` : '—'
    },
    {
      header: 'Remaining Balance',
      formatter: (row: RepaymentRow) =>
        row.isTotal ? '-' : (typeof row.remainingBalance === 'number' ? `₦${row.remainingBalance.toLocaleString()}` : '—')
    },
    {
      header: 'Status',
      formatter: (row: RepaymentRow) => row.isTotal ? '' : row.status,
      badgeClass: (row: RepaymentRow) =>
        row.isTotal ? '' : (row.status ? `payment-status ${this.getStatusClass(row.status)}` : '')
    }
  ];

  get repaymentRows() {
    if (!this.loan?.repaymentSchedule) return [];
    const rows: RepaymentRow[] = [...this.loan.repaymentSchedule];
    rows.push({
      monthNumber: 0,
      dueDate: '',
      principal: this.getTotalPrincipal(),
      interest: this.getTotalInterest(),
      totalPayment: this.getTotalPayment(),
      remainingBalance: 0,
      status: 'PENDING',
      isTotal: true
    });
    return rows;
  }
  
  // Visualization data
  paymentBreakdown: { month: number, principal: number, interest: number }[] = [];
  maxPaymentAmount: number = 0;
  
  ngOnInit() {
    this.prepareVisualizationData();
  }
  
  prepareVisualizationData(): void {
    if (!this.loan?.repaymentSchedule) return;
    
    this.paymentBreakdown = this.loan.repaymentSchedule.map(item => ({
      month: item.monthNumber,
      principal: item.principal,
      interest: item.interest
    }));
    
    // Find maximum total payment for scaling
    this.maxPaymentAmount = Math.max(...this.loan.repaymentSchedule.map(item => 
      item.principal + item.interest
    ));
  }
  
  getTotalPrincipal(): number {
    return this.loan.repaymentSchedule.reduce((sum, item) => sum + item.principal, 0);
  }
  
  getTotalInterest(): number {
    return this.loan.repaymentSchedule.reduce((sum, item) => sum + item.interest, 0);
  }
  
  getTotalPayment(): number {
    return this.loan.repaymentSchedule.reduce((sum, item) => sum + item.totalPayment, 0);
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
  
  // Calculate bar height for visualization (0-100%)
  calculateBarHeight(amount: number): number {
    if (this.maxPaymentAmount === 0) return 0;
    return (amount / this.maxPaymentAmount) * 100;
  }
}

type RepaymentRow = RepaymentScheduleItem & { isTotal?: boolean };

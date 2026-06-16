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
      header: 'Installment',
      formatter: (row: RepaymentRow) => row.isTotal ? 'Totals' : row.installmentNo
    },
    {
      header: 'Due Date',
      formatter: (row: RepaymentRow) =>
        row.isTotal ? '—' : (row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—')
    },
    {
      header: 'Principal',
      formatter: (row: RepaymentRow) =>
        typeof row.principalAmount === 'number' ? `₦${row.principalAmount.toLocaleString()}` : '—'
    },
    {
      header: 'Interest',
      formatter: (row: RepaymentRow) =>
        typeof row.interestAmount === 'number' ? `₦${row.interestAmount.toLocaleString()}` : '—'
    },
    {
      header: 'Total Payment',
      formatter: (row: RepaymentRow) =>
        typeof row.totalAmount === 'number' ? `₦${row.totalAmount.toLocaleString()}` : '—'
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
      installmentNo: 0,
      dueDate: '',
      principalAmount: this.getTotalPrincipal(),
      interestAmount: this.getTotalInterest(),
      totalAmount: this.getTotalPayment(),
      paidAmount: this.loan.totalPaid || 0,
      remainingBalance: 0,
      status: 'PENDING',
      paymentMethod: 'SUMMARY',
      isTotal: true
    });
    return rows;
  }
  
  // Visualization data
  paymentBreakdown: { installmentNo: number, principalAmount: number, interestAmount: number }[] = [];
  maxPaymentAmount: number = 0;
  
  ngOnInit() {
    this.prepareVisualizationData();
  }
  
  prepareVisualizationData(): void {
    if (!this.loan?.repaymentSchedule) return;
    
    this.paymentBreakdown = this.loan.repaymentSchedule.map(item => ({
      installmentNo: item.installmentNo,
      principalAmount: item.principalAmount,
      interestAmount: item.interestAmount
    }));
    
    // Find maximum total payment for scaling
    this.maxPaymentAmount = Math.max(...this.loan.repaymentSchedule.map(item => 
      item.totalAmount
    ));
  }
  
  getTotalPrincipal(): number {
    return this.loan.repaymentSchedule.reduce((sum, item) => sum + item.principalAmount, 0);
  }
  
  getTotalInterest(): number {
    return this.loan.repaymentSchedule.reduce((sum, item) => sum + item.interestAmount, 0);
  }
  
  getTotalPayment(): number {
    return this.loan.repaymentSchedule.reduce((sum, item) => sum + item.totalAmount, 0);
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

import { Component, Input, OnInit } from '@angular/core';
import { AdvancePaymentRecordService, PaymentRecord } from '../../../service/loan/loan-payment-record.service';

@Component({
  selector: 'app-employee-payment-history',
  templateUrl: './employee-payment-history.component.html',
  styleUrls: ['./employee-payment-history.component.scss']
})
export class EmployeePaymentHistoryComponent implements OnInit {
  @Input() loanId!: number;
  
  paymentRecords: PaymentRecord[] = [];
  isLoading = false;
  totalPaid = 0;
  
  constructor(private paymentRecordService: AdvancePaymentRecordService) {}

  ngOnInit(): void {
    if (this.loanId) {
      this.loadPaymentHistory();
    }
  }

  loadPaymentHistory(): void {
    this.isLoading = true;
    this.paymentRecordService.getPaymentRecordsByLoanId(this.loanId).subscribe({
      next: (records) => {
        this.paymentRecords = records.sort((a, b) => 
          new Date(b.paidAt || b.recordedAt || '').getTime() - new Date(a.paidAt || a.recordedAt || '').getTime()
        );
        this.totalPaid = this.paymentRecords.reduce((sum, record) => sum + record.amount, 0);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading payment history:', error);
        this.isLoading = false;
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getPaymentTypeLabel(type: string): string {
    switch(type) {
      case 'PRINCIPAL_REPAYMENT': return 'Principal Payment';
      case 'INTEREST_REPAYMENT': return 'Interest Payment';
      case 'LATE_FEE': return 'Late Fee';
      default: return type;
    }
  }

  getPaymentTypeClass(type: string): string {
    switch(type) {
      case 'PRINCIPAL_REPAYMENT': return 'principal';
      case 'INTEREST_REPAYMENT': return 'interest';
      case 'LATE_FEE': return 'late-fee';
      default: return '';
    }
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'COMPLETED': return 'status-completed';
      case 'PENDING': return 'status-pending';
      case 'FAILED': return 'status-failed';
      default: return '';
    }
  }
}
// loan-repayment.service.ts
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { LoanApplication, RepaymentScheduleItem, PaymentRecord } from './loan.types';
import { LoanStorageService } from './loan-storage.service';

@Injectable({
  providedIn: 'root'
})
export class LoanRepaymentService {
  
  constructor(private storageService: LoanStorageService) {}

  // Get repayment schedule for a loan
  getRepaymentSchedule(loanId: string): Observable<RepaymentScheduleItem[]> {
    const loan = this.storageService.getApplicationById(loanId);
    return of(loan?.repaymentSchedule || []);
  }

  // Record a payment
  recordPayment(loanId: string, payment: Partial<PaymentRecord>): Observable<LoanApplication> {
    const loan = this.storageService.getApplicationById(loanId);
    
    if (!loan) {
      throw new Error('Loan not found');
    }

    const paymentRecord: PaymentRecord = {
      id: 'PAY-' + Date.now(),
      date: payment.date || new Date().toISOString(),
      amount: payment.amount || 0,
      paymentMethod: payment.paymentMethod || 'Bank Transfer',
      referenceNumber: payment.referenceNumber,
      receivedBy: payment.receivedBy || 'System',
      notes: payment.notes
    };

    // Add payment record
    loan.paymentHistory.push(paymentRecord);
    
    // Update total paid and current balance
    loan.totalPaid += paymentRecord.amount;
    loan.currentBalance -= paymentRecord.amount;
    
    // Update repayment schedule
    this.updateRepaymentScheduleStatus(loan);
    
    // Save changes
    this.storageService.updateApplication(loan);
    return of({...loan});
  }

  private updateRepaymentScheduleStatus(loan: LoanApplication): void {
    let remainingBalance = loan.currentBalance;
    
    // Mark payments as paid based on total paid
    for (let i = 0; i < loan.repaymentSchedule.length; i++) {
      const item = loan.repaymentSchedule[i];
      
      if (item.totalPayment <= loan.totalPaid) {
        item.status = 'PAID';
        item.paymentDate = new Date().toISOString();
        item.paidAmount = item.totalPayment;
      }
    }
  }

  // Get payment history for a loan
  getPaymentHistory(loanId: string): Observable<PaymentRecord[]> {
    const loan = this.storageService.getApplicationById(loanId);
    return of(loan?.paymentHistory || []);
  }

  // Check if loan is overdue
  isLoanOverdue(loanId: string): Observable<boolean> {
    const loan = this.storageService.getApplicationById(loanId);
    if (!loan) return of(false);
    
    const today = new Date();
    const hasOverdue = loan.repaymentSchedule.some(item => {
      if (item.status === 'PENDING') {
        const dueDate = new Date(item.dueDate);
        return dueDate < today;
      }
      return false;
    });
    
    return of(hasOverdue);
  }
}
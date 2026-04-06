// employee-interest-acceptance.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Message } from 'primeng/api';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApprovalService } from '../../../service/loan/loan-approval.service';
// Fix the import path - make sure this file exists or remove if not needed
// import { AdvanceInterestAgreementService, AdvanceInterestAgreement } from '../../../service/loan/advance-interest-agreement.service';

@Component({
  selector: 'app-employee-interest-acceptance',
  templateUrl: './employee-interest-acceptance.component.html',
  styleUrls: ['./employee-interest-acceptance.component.scss']
})
export class EmployeeInterestAcceptanceComponent implements OnInit {
  @Input() loan: LoanApplication | null = null;
  @Output() decisionMade = new EventEmitter<{ accepted: boolean; message: string }>();
  @Output() close = new EventEmitter<void>();
  
  isLoading = false;
  messages: Message[] = [];
  rejectionReason = '';
  showRejectionReason = false;
  // interestAgreement: AdvanceInterestAgreement | null = null;

  constructor(
    private loanApprovalService: LoanApprovalService
    // private interestAgreementService: AdvanceInterestAgreementService // Remove until service is created
  ) {}

  ngOnInit(): void {
    // this.loadInterestAgreement(); // Comment out until service exists
  }

  // loadInterestAgreement(): void {
  //   this.interestAgreementService.getAgreementByLoanId(this.loan!.id).subscribe({
  //     next: (agreement: AdvanceInterestAgreement) => {
  //       this.interestAgreement = agreement;
  //     },
  //     error: (error: any) => {
  //       console.error('Error loading interest agreement:', error);
  //     }
  //   });
  // }

  getProposedInterestRate(): number {
    // return this.interestAgreement?.proposedInterestRate || this.loan?.interestRate || 0;
    return this.loan?.interestRate || 0;
  }

  getMonthlyRepaymentAmount(): number {
    if (!this.loan) return 0;
    const rate = this.getProposedInterestRate() / 100 / 12;
    const amount = this.loan.amount;
    const months = this.loan.repaymentTime;
    
    if (rate > 0) {
      return amount * rate * Math.pow(1 + rate, months) / (Math.pow(1 + rate, months) - 1);
    }
    return amount / months;
  }

  getTotalRepayable(): number {
    return this.getMonthlyRepaymentAmount() * (this.loan?.repaymentTime || 0);
  }

  getTotalInterest(): number {
    return this.getTotalRepayable() - (this.loan?.amount || 0);
  }

  acceptInterest(): void {
    this.isLoading = true;
    const acceptedRate = this.getProposedInterestRate();
    
    this.loanApprovalService.acceptInterestRate(this.loan!.id, acceptedRate).subscribe({
      next: () => {
        this.showMessage('success', 'Interest Rate Accepted', `You have accepted the ${acceptedRate}% interest rate. Your loan is now approved.`);
        this.decisionMade.emit({ accepted: true, message: `Accepted ${acceptedRate}% interest rate` });
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error accepting interest rate:', error);
        this.showMessage('error', 'Error', 'Failed to accept interest rate. Please try again.');
        this.isLoading = false;
      }
    });
  }

  rejectInterest(): void {
    if (!this.showRejectionReason) {
      this.showRejectionReason = true;
      return;
    }
    
    if (!this.rejectionReason.trim()) {
      this.showMessage('warn', 'Reason Required', 'Please provide a reason for rejecting the interest rate.');
      return;
    }
    
    this.isLoading = true;
    this.loanApprovalService.rejectInterestRate(this.loan!.id, this.rejectionReason).subscribe({
      next: () => {
        this.showMessage('info', 'Interest Rate Rejected', `You have rejected the proposed interest rate. The loan has been returned to pending status.`);
        this.decisionMade.emit({ accepted: false, message: this.rejectionReason });
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error rejecting interest rate:', error);
        this.showMessage('error', 'Error', 'Failed to reject interest rate. Please try again.');
        this.isLoading = false;
      }
    });
  }

  private showMessage(severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string): void {
    this.messages = [{ severity, summary, detail }];
    setTimeout(() => { this.messages = []; }, 5000);
  }

  cancel(): void {
    this.close.emit();
  }
}
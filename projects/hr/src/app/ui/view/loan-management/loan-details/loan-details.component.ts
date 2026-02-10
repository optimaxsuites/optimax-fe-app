import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoanService, LoanApplication } from '../../../service/loan/loan.service';

@Component({
  selector: 'app-loan-details',
  templateUrl: './loan-details.component.html',
  styleUrls: ['./loan-details.component.scss']
})
export class LoanDetailsComponent implements OnInit {
  loanId: string = '';
  loan: LoanApplication | null = null;
  isLoading: boolean = true;
  activeTab: 'overview' | 'repayment' | 'status' | 'payments' = 'overview';
  
  constructor(
    private route: ActivatedRoute,
    private loanService: LoanService
  ) {}
  
  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.loanId = params['id'];
      this.loadLoanDetails();
    });
  }
  
  loadLoanDetails(): void {
    this.isLoading = true;
    this.loanService.getApplicationById(this.loanId).subscribe({
      next: (loan) => {
        this.loan = loan || null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading loan details:', error);
        this.isLoading = false;
      }
    });
  }
  
  setActiveTab(tab: 'overview' | 'repayment' | 'status' | 'payments'): void {
    this.activeTab = tab;
  }
  
  // Calculate progress percentage
  getProgressPercentage(): number {
    if (!this.loan) return 0;
    return ((this.loan.loanAmount - this.loan.currentBalance) / this.loan.loanAmount) * 100;
  }
  
  // Check if loan is overdue
  isOverdue(): boolean {
    if (!this.loan) return false;
    const today = new Date();
    const startDate = new Date(this.loan.startDate || this.loan.dateSubmitted);
    
    // Check if any payment is more than 30 days overdue
    const monthsPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    // Find unpaid installments
    const unpaidInstallments = this.loan.repaymentSchedule.filter(
      (  item: { status: string; }) => item.status === 'PENDING' || item.status === 'OVERDUE'
    );
    
    return unpaidInstallments.some(item => {
      const dueDate = new Date(item.dueDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysOverdue > 30;
    });
  }
}
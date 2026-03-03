import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeMember, CooperativeLoan, CooperativeRepayment } from '../../../service/loan/cooperative-loan/cooperative.types';
@Component({
  selector: 'app-cooperative-member-dashboard',
  templateUrl: './cooperative-member-dashboard.component.html',
  styleUrls: ['./cooperative-member-dashboard.component.scss']
})
export class CooperativeMemberDashboardComponent implements OnInit {
  // This would come from auth service in real app
  currentMemberId = '1'; // Eseose Odion's ID from sample data
  
  member!: CooperativeMember;
  loans: CooperativeLoan[] = [];
  repaymentsByLoanId: Record<string, CooperativeRepayment[]> = {};
  isLoading = true;
  showApplicationModal = false;
  showPaymentModal = false;
  loanStatusFilter: 'PENDING' | 'ACTIVE' | 'COMPLETED' = 'ACTIVE';
  selectedPaymentLoan?: CooperativeLoan;
  paymentAmount = 0;
  paymentMethod: CooperativeRepayment['paymentMethod'] = 'BANK_TRANSFER';
  actionMessage = '';
  patronageRate = 20;

  constructor(
    private location: Location,
    private cooperativeService: CooperativeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMemberData();
  }

  loadMemberData(): void {
    this.isLoading = true;
    this.actionMessage = '';
    
    const member = this.cooperativeService.getMemberById(this.currentMemberId);
    if (member) {
      this.member = member;
      this.loans = this.cooperativeService
        .getLoansByMember(member.id)
        .sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
      this.loadRepayments();
    }
    
    this.isLoading = false;
  }

  // Computed properties
  get activeLoans(): CooperativeLoan[] {
    return this.loans.filter(l => l.status === 'ACTIVE');
  }

  get pendingLoans(): CooperativeLoan[] {
    return this.loans.filter(l => l.status === 'PENDING');
  }

  get completedLoans(): CooperativeLoan[] {
    return this.loans.filter(l => l.status === 'COMPLETED');
  }

  get totalBorrowed(): number {
    return this.loans.reduce((sum, l) => sum + l.amount, 0);
  }

  get outstandingBalance(): number {
    return this.activeLoans.reduce((sum, loan) => sum + this.getOutstandingAmount(loan), 0);
  }

  get nextPayment(): { amount: number; dueDate: string } | null {
    const upcoming = this.activeLoans
      .flatMap(loan => this.getOpenRepayments(loan.id))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    if (upcoming) {
      return {
        amount: upcoming.amount,
        dueDate: upcoming.dueDate
      };
    }

    return null;
  }

  get estimatedPatronageThisYear(): number {
    const year = new Date().getFullYear();
    const memberLoanIds = new Set(this.loans.map(loan => loan.id));

    const yearlyInterestPaid = Object.values(this.repaymentsByLoanId)
      .flat()
      .filter(repayment => {
        if (!repayment.paidDate) {
          return false;
        }

        return new Date(repayment.paidDate).getFullYear() === year && memberLoanIds.has(repayment.loanId);
      })
      .reduce((sum, repayment) => {
        const loan = this.loans.find(item => item.id === repayment.loanId);
        if (!loan || !loan.totalRepayment) {
          return sum;
        }

        const ratio = Math.max((loan.totalRepayment - loan.amount) / loan.totalRepayment, 0);
        return sum + repayment.amount * ratio;
      }, 0);

    return Number((yearlyInterestPaid * (this.patronageRate / 100)).toFixed(2));
  }

  get primaryActiveLoan(): CooperativeLoan | null {
    return this.activeLoans[0] || null;
  }

  get filteredLoansByStatus(): CooperativeLoan[] {
    if (this.loanStatusFilter === 'PENDING') {
      return this.pendingLoans;
    }

    if (this.loanStatusFilter === 'COMPLETED') {
      return this.completedLoans;
    }

    return this.activeLoans;
  }

  // Navigation
  viewAllLoans(): void {
    this.router.navigate(['/member/cooperative/my-loans', uuidV4()]);
  }

  applyForLoan(): void {
    this.showApplicationModal = true;
  }

  closeApplicationModal(): void {
    this.showApplicationModal = false;
  }

  onApplicationSubmitted(): void {
    this.showApplicationModal = false;
    this.loadMemberData();
  }

  viewLoanDetails(id: string): void {
    this.router.navigate([`/member/cooperative/loans/${id}/${uuidV4()}`]);
  }

  setLoanStatusFilter(status: 'PENDING' | 'ACTIVE' | 'COMPLETED'): void {
    this.loanStatusFilter = status;
  }

  openPaymentModal(loan: CooperativeLoan): void {
    this.selectedPaymentLoan = loan;
    this.paymentAmount = this.getNextInstallmentAmount(loan.id) || loan.monthlyRepayment;
    this.paymentMethod = 'BANK_TRANSFER';
    this.showPaymentModal = true;
    this.actionMessage = '';
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedPaymentLoan = undefined;
    this.paymentAmount = 0;
    this.paymentMethod = 'BANK_TRANSFER';
  }

  submitPayment(): void {
    if (!this.selectedPaymentLoan || this.paymentAmount <= 0) {
      return;
    }

    const repayment = this.cooperativeService.recordRepayment(this.selectedPaymentLoan.id, {
      amount: this.paymentAmount,
      paymentMethod: this.paymentMethod,
      paidDate: new Date().toISOString()
    });

    if (!repayment) {
      this.actionMessage = 'Unable to record payment right now. Please try again.';
      return;
    }

    this.closePaymentModal();
    this.loadMemberData();
    this.actionMessage = `Payment of ${this.formatCurrency(repayment.amount)} was recorded successfully.`;
  }

  getOutstandingAmount(loan: CooperativeLoan): number {
    const repayments = this.repaymentsByLoanId[loan.id] || [];
    if (repayments.length === 0) {
      return loan.amount;
    }

    return repayments
      .filter(item => item.status !== 'PAID')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  getNextDueDate(loanId: string): string | null {
    const next = this.getOpenRepayments(loanId)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    return next?.dueDate || null;
  }

  getNextInstallmentAmount(loanId: string): number {
    const next = this.getOpenRepayments(loanId)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    return next?.amount || 0;
  }

  getLastPaymentDate(loanId: string): string | null {
    const lastPaid = (this.repaymentsByLoanId[loanId] || [])
      .filter(item => item.status === 'PAID' && !!item.paidDate)
      .sort((a, b) => new Date(b.paidDate as string).getTime() - new Date(a.paidDate as string).getTime())[0];

    return lastPaid?.paidDate || null;
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/admin/hr/loan/uu']);
  }

  private loadRepayments(): void {
    this.repaymentsByLoanId = {};
    this.loans.forEach(loan => {
      this.repaymentsByLoanId[loan.id] = this.cooperativeService.getRepaymentsByLoanId(loan.id);
    });
  }

  private getOpenRepayments(loanId: string): CooperativeRepayment[] {
    return (this.repaymentsByLoanId[loanId] || []).filter(item => item.status !== 'PAID');
  }
}
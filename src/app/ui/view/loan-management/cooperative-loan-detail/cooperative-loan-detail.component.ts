import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoan, CooperativeMember, CooperativeLoanGroup, CooperativeRepayment, CooperativeLoanGuarantor } from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-cooperative-loan-detail',
  templateUrl: './cooperative-loan-detail.component.html',
  styleUrls: ['./cooperative-loan-detail.component.scss']
})
export class CooperativeLoanDetailComponent implements OnInit {
  currentUuid = uuidV4();
  loan!: CooperativeLoan;
  member?: CooperativeMember;
  group?: CooperativeLoanGroup;
  repaymentSchedule: CooperativeRepayment[] = [];
  guarantors: CooperativeLoanGuarantor[] = [];
  isLoading = true;
  
  showRejectModal = false;
  showRequestChangesModal = false;
  showRecordPaymentModal = false;
  rejectionReason = '';
  requestChangesNote = '';
  paymentAmount = 0;
  paymentMethod: CooperativeRepayment['paymentMethod'] = 'BANK_TRANSFER';
  messages: Message[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cooperativeService: CooperativeService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      this.currentUuid = params['uuid'] || this.currentUuid;
      this.loadLoan(id);
    });
  }

  loadLoan(id: string): void {
    this.isLoading = true;
    const loan = this.cooperativeService.getLoanById(id);
    
    if (loan) {
      this.loan = loan;
      this.member = this.cooperativeService.getMemberById(loan.memberId);
      this.group = loan.groupId ? this.cooperativeService.getGroupById(loan.groupId) : undefined;
      this.repaymentSchedule = this.cooperativeService.getRepaymentsByLoanId(loan.id);
      this.guarantors = [...(loan.guarantors || [])];
      this.seedPaymentDefaults();
    }
    
    this.isLoading = false;
  }

  openRecordPaymentModal(): void {
    if (this.loan.status !== 'ACTIVE') {
      return;
    }

    this.seedPaymentDefaults();
    this.showRecordPaymentModal = true;
  }

  cancelRecordPayment(): void {
    this.showRecordPaymentModal = false;
    this.seedPaymentDefaults();
  }

  recordPayment(): void {
    if (this.loan.status !== 'ACTIVE') {
      return;
    }

    const recorded = this.cooperativeService.recordRepayment(this.loan.id, {
      amount: this.paymentAmount,
      paymentMethod: this.paymentMethod,
      paidDate: new Date().toISOString()
    });

    if (!recorded) {
      this.messages = [{
        severity: 'warn',
        summary: 'Payment Not Recorded',
        detail: 'Unable to record payment. Confirm amount and loan state.'
      }];
      return;
    }

    const latest = this.cooperativeService.getLoanById(this.loan.id);
    if (latest) {
      this.loan = latest;
    }
    this.repaymentSchedule = this.cooperativeService.getRepaymentsByLoanId(this.loan.id);
    this.showRecordPaymentModal = false;

    this.messages = [{
      severity: 'success',
      summary: 'Payment Recorded',
      detail: `${this.formatCurrency(recorded.amount)} recorded via ${this.getPaymentMethodLabel(recorded.paymentMethod)}.`
    }];
  }

  sendReminder(): void {
    const success = this.cooperativeService.sendRepaymentReminder(this.loan.id);
    if (!success) {
      this.messages = [{
        severity: 'warn',
        summary: 'Reminder Failed',
        detail: 'Unable to send reminder for this loan.'
      }];
      return;
    }

    this.messages = [{
      severity: 'info',
      summary: 'Reminder Sent',
      detail: 'Repayment reminder sent to the member.'
    }];
  }

  markDefaulted(): void {
    const updated = this.cooperativeService.markLoanAsDefaulted(this.loan.id);
    if (!updated) {
      this.messages = [{
        severity: 'warn',
        summary: 'Action Not Allowed',
        detail: 'Only approved or active loans can be marked as defaulted.'
      }];
      return;
    }

    this.loan = updated;
    this.repaymentSchedule = this.cooperativeService.getRepaymentsByLoanId(this.loan.id);
    this.messages = [{
      severity: 'warn',
      summary: 'Loan Defaulted',
      detail: 'Loan status updated to DEFAULTED and member notification has been sent.'
    }];
  }

  approveLoan(): void {
    const updated = this.cooperativeService.approveLoan(this.loan.id);
    if (!updated) {
      this.messages = [{
        severity: 'warn',
        summary: 'Approval Failed',
        detail: 'Only pending loans can be approved.'
      }];
      return;
    }

    this.loan = updated;
    this.guarantors = [...(updated.guarantors || [])];
    this.messages = [{
      severity: 'success',
      summary: 'Loan Approved',
      detail: 'Loan approved, approval date recorded, member notified, and funds marked for disbursement.'
    }];
  }

  showRejectDialog(): void {
    this.showRejectModal = true;
  }

  rejectLoan(): void {
    if (this.rejectionReason.trim()) {
      const updated = this.cooperativeService.rejectLoan(this.loan.id, this.rejectionReason);
      if (!updated) {
        this.messages = [{
          severity: 'warn',
          summary: 'Rejection Failed',
          detail: 'Unable to reject loan at this time.'
        }];
        return;
      }

      this.loan = updated;
      this.showRejectModal = false;
      this.rejectionReason = '';
      this.messages = [{
        severity: 'success',
        summary: 'Loan Rejected',
        detail: 'Loan rejected, reason saved, and member notified with the reason.'
      }];
      return;
    }

    this.messages = [{
      severity: 'warn',
      summary: 'Reason Required',
      detail: 'Please provide a rejection reason before submitting.'
    }];
  }

  cancelReject(): void {
    this.showRejectModal = false;
    this.rejectionReason = '';
  }

  disburseLoan(): void {
    const beforeStats = this.cooperativeService.getStats();
    const beforeAvailable = Math.max(beforeStats.totalFund - beforeStats.loanPortfolio, 0);
    const updated = this.cooperativeService.disburseLoan(this.loan.id);
    const afterStats = this.cooperativeService.getStats();
    const afterAvailable = Math.max(afterStats.totalFund - afterStats.loanPortfolio, 0);

    if (!updated) {
      this.messages = [{
        severity: 'warn',
        summary: 'Disbursement Failed',
        detail: 'Only approved loans can be disbursed.'
      }];
      return;
    }

    this.loan = updated;
    this.repaymentSchedule = this.cooperativeService.getRepaymentsByLoanId(this.loan.id);
    const deducted = Math.max(beforeAvailable - afterAvailable, 0);

    this.messages = [{
      severity: 'success',
      summary: 'Loan Disbursed',
      detail: `Loan is now ACTIVE, disbursement date recorded, repayment schedule generated, and ${this.formatCurrency(deducted || this.loan.amount)} deducted from the co-op pool.`
    }];
  }

  showRequestChangesDialog(): void {
    this.showRequestChangesModal = true;
  }

  requestChanges(): void {
    if (!this.requestChangesNote.trim()) {
      this.messages = [{
        severity: 'warn',
        summary: 'Note Required',
        detail: 'Please provide a note before requesting changes.'
      }];
      return;
    }

    const updated = this.cooperativeService.requestLoanChanges(this.loan.id, this.requestChangesNote);
    if (!updated) {
      this.messages = [{
        severity: 'warn',
        summary: 'Request Failed',
        detail: 'Unable to request changes at this time.'
      }];
      return;
    }

    this.loan = updated;
    this.guarantors = [...(updated.guarantors || [])];
    this.showRequestChangesModal = false;
    this.requestChangesNote = '';
    this.messages = [{
      severity: 'info',
      summary: 'Changes Requested',
      detail: 'Change request sent to member and saved on this application.'
    }];
  }

  cancelRequestChanges(): void {
    this.showRequestChangesModal = false;
    this.requestChangesNote = '';
  }

  completeLoan(): void {
    this.loan.status = 'COMPLETED';
    this.loan.completionDate = new Date().toISOString();
    this.cooperativeService.updateLoan(this.loan);
    this.messages = [{
      severity: 'success',
      summary: 'Loan Completed',
      detail: 'Loan marked as completed.'
    }];
  }

  setPendingReview(): void {
    const updated = this.cooperativeService.setLoanPendingReview(this.loan.id, 'Application kept pending for further admin validation.');
    if (!updated) {
      this.messages = [{
        severity: 'warn',
        summary: 'Action Not Allowed',
        detail: 'Unable to keep this application in pending review queue.'
      }];
      return;
    }

    this.loan = updated;
    this.messages = [{
      severity: 'info',
      summary: 'Marked as Pending',
      detail: 'Application remains in pending queue for later decision.'
    }];
  }

  approveGuarantor(memberId: string): void {
    const updated = this.cooperativeService.submitGuarantorDecision(this.loan.id, memberId, 'APPROVED');
    if (!updated) {
      this.messages = [{
        severity: 'warn',
        summary: 'Unable To Approve',
        detail: 'This guarantor request may already be decided.'
      }];
      return;
    }

    this.loan = updated;
    this.guarantors = [...(updated.guarantors || [])];
    this.messages = [{
      severity: 'success',
      summary: 'Guarantor Approved',
      detail: 'Guarantor response recorded successfully.'
    }];
  }

  rejectGuarantor(memberId: string): void {
    const updated = this.cooperativeService.submitGuarantorDecision(this.loan.id, memberId, 'REJECTED');
    if (!updated) {
      this.messages = [{
        severity: 'warn',
        summary: 'Unable To Reject',
        detail: 'This guarantor request may already be decided.'
      }];
      return;
    }

    this.loan = updated;
    this.guarantors = [...(updated.guarantors || [])];
    this.messages = [{
      severity: 'warn',
      summary: 'Guarantor Rejected',
      detail: 'Guarantor rejection recorded. Application status updated accordingly.'
    }];
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/loan', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  getGuarantorStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  getGuarantorMemberName(memberId: string): string {
    return this.cooperativeService.getMemberById(memberId)?.fullName || memberId;
  }

  getPaymentMethodLabel(method?: CooperativeRepayment['paymentMethod']): string {
    switch (method) {
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      case 'CASH':
        return 'Cash';
      case 'PAYROLL_DEDUCTION':
        return 'Payroll Deduction';
      case 'MOBILE_MONEY':
        return 'Mobile Money';
      case 'OTHER':
        return 'Other';
      default:
        return '-';
    }
  }

  getRepaymentStatusLabel(item: CooperativeRepayment): string {
    if (item.status === 'PAID') {
      return 'PAID';
    }

    if (item.status === 'OVERDUE') {
      return `OVERDUE (${this.getOverdueDays(item)}d)`;
    }

    return 'UPCOMING';
  }

  getOverdueDays(item: CooperativeRepayment): number {
    if (item.status !== 'OVERDUE') {
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(item.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diff = today.getTime() - dueDate.getTime();
    return Math.max(Math.floor(diff / (24 * 60 * 60 * 1000)), 0);
  }

  get paidAmount(): number {
    return this.repaymentSchedule
      .filter(item => item.status === 'PAID')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  get remainingAmount(): number {
    return Math.max(this.loan.totalRepayment - this.paidAmount, 0);
  }

  get paymentProgress(): number {
    if (!this.loan.totalRepayment) {
      return 0;
    }

    return Math.min((this.paidAmount / this.loan.totalRepayment) * 100, 100);
  }

  get overdueRepaymentsCount(): number {
    return this.repaymentSchedule.filter(item => item.status === 'OVERDUE').length;
  }

  get canMarkDefaulted(): boolean {
    return this.overdueRepaymentsCount > 0 && (this.loan.status === 'ACTIVE' || this.loan.status === 'APPROVED');
  }

  get hasOpenRepayments(): boolean {
    return this.repaymentSchedule.some(item => item.status !== 'PAID');
  }

  get previousLoansCount(): number {
    if (!this.member) {
      return 0;
    }

    return this.cooperativeService
      .getLoansByMember(this.member.id)
      .filter(item => item.id !== this.loan.id).length;
  }

  get completedPreviousLoansCount(): number {
    if (!this.member) {
      return 0;
    }

    return this.cooperativeService
      .getLoansByMember(this.member.id)
      .filter(item => item.id !== this.loan.id && item.status === 'COMPLETED').length;
  }

  get approvedGuarantorsCount(): number {
    return this.guarantors.filter(item => item.status === 'APPROVED').length;
  }

  get pendingGuarantorsCount(): number {
    return this.guarantors.filter(item => item.status === 'PENDING').length;
  }

  get guarantorCoverageAmount(): number {
    return this.guarantors.reduce((sum, item) => sum + Number(item.guaranteedAmount || 0), 0);
  }

  get loanToShareRatio(): number {
    const shares = Number(this.member?.shareCapital || 0);
    if (!shares) {
      return 0;
    }

    return Number(((this.loan.amount / shares) * 100).toFixed(1));
  }

  get repaymentCapacityLabel(): string {
    const shares = Number(this.member?.shareCapital || 0);
    if (!shares) {
      return 'UNKNOWN';
    }

    const ratio = this.loan.monthlyRepayment > 0 ? shares / this.loan.monthlyRepayment : 0;
    if (ratio >= 3) {
      return 'GOOD';
    }

    if (ratio >= 2) {
      return 'MODERATE';
    }

    return 'LOW';
  }

  get creditHistoryLabel(): string {
    return this.overdueRepaymentsCount > 0 ? 'HAS DELINQUENCY' : 'NO DEFAULT HISTORY';
  }

  private seedPaymentDefaults(): void {
    const nextUnpaid = this.repaymentSchedule
      .filter(item => item.status !== 'PAID')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    this.paymentAmount = nextUnpaid?.amount || this.loan?.monthlyRepayment || 0;
    this.paymentMethod = 'BANK_TRANSFER';
  }
}
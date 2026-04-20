import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoanGroup, CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';
import { formatLoanPurposeDisplay } from '../../../service/loan/loan-display.util';
import { EmployeeService } from '../../../service/employee.service';
import { MailNotificationService } from '../../../service/mailNotification.service';
import { BackButtonModule } from '../../../shared-component/view/back-button/back-button.module';

type QueueMessage = {
  severity: 'success' | 'error' | 'warn';
  summary: string;
  detail: string;
};

@Component({
  selector: 'app-cooperative-loan-disbursement-ui',
  standalone: true,
  imports: [CommonModule, FormsModule, BackButtonModule],
  templateUrl: './cooperative-loan-disbursement-ui.component.html',
  styleUrls: ['./cooperative-loan-disbursement-ui.component.scss']
})
export class CooperativeLoanDisbursementUiComponent implements OnInit {
  readonly queuePageSize = 6;

  currentUuid = '';
  isLoading = true;
  isSubmitting = false;
  messages: QueueMessage[] = [];

  loans: CooperativeLoan[] = [];
  members: CooperativeMember[] = [];
  groups: CooperativeLoanGroup[] = [];
  selectedLoanId = '';
  selectedEmployeeDetails: any = null;

  approvedSearchTerm = '';
  readySearchTerm = '';
  approvedPage = 1;
  readyPage = 1;

  accountingEmail = '';
  emailNotes = '';
  disbursementInstructionReference = '';
  disbursementInitiatedAt = '';
  disbursementInitiatedBy = '';
  disbursementAmount = 0;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'PAYROLL_DEDUCTION' = 'BANK_TRANSFER';
  checklistIdentityVerified = false;
  checklistAccountVerified = false;
  checklistComplianceCleared = false;
  checklistFundsReserved = false;

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private cooperativeService: CooperativeService,
    private employeeService: EmployeeService,
    private mailNotificationService: MailNotificationService
  ) {}

  ngOnInit(): void {
    this.currentUuid = this.route.snapshot.paramMap.get('uuid') || '';
    // Ensure group memberships are loaded before loading loans
    this.cooperativeService.loadGroupMemberships().subscribe({
      next: () => this.loadData(),
      error: () => this.loadData() // fallback to loading data even if memberships fail
    });
  }

  loadData(): void {
    this.isLoading = true;
    forkJoin({
      groups: this.cooperativeService.loadGroups(),
      members: this.cooperativeService.getMembers(),
      loans: this.cooperativeService.refreshLoans()
    }).subscribe({
      next: ({ groups, members, loans }) => {
        this.groups = groups;
        this.members = members;
        this.loans = loans;
        this.isLoading = false;

        const requestedLoanId = String(this.route.snapshot.queryParamMap.get('loanId') || '').trim();
        const defaultLoan = this.readyForDisbursementLoans[0] || this.approvedLoans[0] || null;
        const selectedLoan = [...this.readyForDisbursementLoans, ...this.approvedLoans].find((loan) => String(loan.id) === requestedLoanId) || defaultLoan;

        if (selectedLoan) {
          this.selectLoan(selectedLoan);
        }
      },
      error: () => {
        this.isLoading = false;
        this.showMessage('error', 'Load Failed', 'The cooperative disbursement queue could not be loaded.');
      }
    });
  }

  get approvedLoans(): CooperativeLoan[] {
    const term = this.approvedSearchTerm.trim().toLowerCase();
    return this.loans
      .filter((loan) => loan.status === 'APPROVED')
      .filter((loan) => this.matchesSearch(loan, term))
      .sort((left, right) => new Date(right.approvedDate || right.requestDate || right.applicationDate || 0).getTime() - new Date(left.approvedDate || left.requestDate || left.applicationDate || 0).getTime());
  }

  get readyForDisbursementLoans(): CooperativeLoan[] {
    const term = this.readySearchTerm.trim().toLowerCase();
    return this.loans
      .filter((loan) => loan.status === 'READY_FOR_DISBURSEMENT')
      .filter((loan) => this.matchesSearch(loan, term))
      .sort((left, right) => new Date(right.disbursementInitiatedAt || right.approvedDate || 0).getTime() - new Date(left.disbursementInitiatedAt || left.approvedDate || 0).getTime());
  }

  get selectedLoan(): CooperativeLoan | null {
    return [...this.readyForDisbursementLoans, ...this.approvedLoans].find((loan) => String(loan.id) === this.selectedLoanId) || null;
  }

  get selectedGroup(): CooperativeLoanGroup | undefined {
    const loan = this.selectedLoan;
    return loan ? this.getGroupForLoan(loan) : undefined;
  }

  get paginatedApprovedLoans(): CooperativeLoan[] {
    const start = (this.approvedPage - 1) * this.queuePageSize;
    return this.approvedLoans.slice(start, start + this.queuePageSize);
  }

  get paginatedReadyLoans(): CooperativeLoan[] {
    const start = (this.readyPage - 1) * this.queuePageSize;
    return this.readyForDisbursementLoans.slice(start, start + this.queuePageSize);
  }

  get approvedTotalPages(): number {
    return Math.max(1, Math.ceil(this.approvedLoans.length / this.queuePageSize));
  }

  get readyTotalPages(): number {
    return Math.max(1, Math.ceil(this.readyForDisbursementLoans.length / this.queuePageSize));
  }

  toStringId(id: string | number | undefined): string {
    return id !== undefined && id !== null ? String(id) : '';
  }

  get queueTotalAmount(): number {
    return [...this.approvedLoans, ...this.readyForDisbursementLoans].reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  }

  get canSendToAccounting(): boolean {
    return !!this.selectedLoan && this.selectedLoan.status === 'APPROVED' && !!this.accountingEmail.trim() && !this.isSubmitting;
  }

  get canMarkAsDisbursed(): boolean {
    return !!this.selectedLoan
      && this.selectedLoan.status === 'READY_FOR_DISBURSEMENT'
      && !this.isSubmitting
      && this.checklistIdentityVerified
      && this.checklistAccountVerified
      && this.checklistComplianceCleared
      && this.checklistFundsReserved;
  }

  selectLoan(loan: CooperativeLoan): void {
    this.selectedLoanId = String(loan.id);
    this.disbursementAmount = Number(loan.amount || 0);
    this.paymentMethod = 'BANK_TRANSFER';
    this.emailNotes = '';
    this.accountingEmail = String(loan.accountingEmail || this.getGroupForLoan(loan)?.accountingEmail || '').trim();
    this.disbursementInstructionReference = loan.disbursementInstructionLoanReference || this.generateDisbursementReference(loan);
    this.disbursementInitiatedAt = loan.disbursementInitiatedAt || '';
    this.disbursementInitiatedBy = this.getAuditUserLabel(loan.disbursementInitiatedBy);
    this.checklistIdentityVerified = false;
    this.checklistAccountVerified = false;
    this.checklistComplianceCleared = false;
    this.checklistFundsReserved = false;
    this.loadEmployeeDetails(loan);
  }

  loadEmployeeDetails(loan: CooperativeLoan): void {
    const member = this.getMemberForLoan(loan);
    const employeeId = Number(member?.employeeId || 0);
    if (!employeeId) {
      this.selectedEmployeeDetails = null;
      return;
    }

    this.employeeService.getEmployeeById(employeeId).subscribe({
      next: (employee) => {
        this.selectedEmployeeDetails = employee;
      },
      error: () => {
        this.selectedEmployeeDetails = null;
      }
    });
  }

  sendToAccounting(): void {
    const loan = this.selectedLoan;
    const group = this.selectedGroup;
    if (!loan || !group || !this.canSendToAccounting) {
      return;
    }

    const accountingEmail = this.accountingEmail.trim();
    const instructionReference = this.disbursementInstructionReference || this.generateDisbursementReference(loan);

    this.isSubmitting = true;
    this.mailNotificationService.sendMail(this.buildAccountingMailBody(loan, group, accountingEmail, instructionReference)).subscribe({
      next: () => {
        this.cooperativeService.sendLoanToAccountingForDisbursement(loan.id, {
          accountingEmail,
          disbursementInstructionReference: instructionReference,
          paymentMethod: this.paymentMethod,
          notes: this.emailNotes.trim() || undefined
        }).subscribe({
          next: (updatedLoan) => {
            if (!updatedLoan) {
              this.refreshSelectedLoanState(loan.id, {
                matchedStatus: 'READY_FOR_DISBURSEMENT',
                successSummary: 'Already Sent',
                successDetail: (freshLoan) => `Loan ${freshLoan.loanCode || freshLoan.id} is already READY_FOR_DISBURSEMENT. The queue has been refreshed.`,
                fallbackSummary: 'Workflow Skipped',
                fallbackDetail: 'Only approved cooperative loans can be sent to accounting.'
              });
              return;
            }
            this.isSubmitting = false;
            this.upsertLoan(updatedLoan);
            this.selectLoan(updatedLoan);
            this.showMessage('success', 'Sent to Accounting', `Loan ${updatedLoan.loanCode || updatedLoan.id} has been moved to READY_FOR_DISBURSEMENT.`);
          },
          error: () => {
            this.isSubmitting = false;
            this.showMessage('error', 'Update Failed', 'The email was sent, but the cooperative disbursement workflow could not be updated.');
          }
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        let detail = `Unable to send the disbursement instruction to ${accountingEmail}.`;
        if (err && err.status === 403) {
          detail = 'Email notification failed due to authorization error. Please contact your administrator.';
        }
        this.showMessage('error', 'Email Failed', detail);
      }
    });
  }

  markAsDisbursed(): void {
    const loan = this.selectedLoan;
    if (!loan || !this.canMarkAsDisbursed) {
      return;
    }

    this.isSubmitting = true;
    this.cooperativeService.disburseLoan(loan.id, {
      disbursedAmount: this.disbursementAmount,
      paymentMethod: this.paymentMethod,
      notes: this.emailNotes.trim() || 'Loan disbursement confirmed from cooperative queue.'
    }).subscribe({
      next: (updatedLoan) => {
        if (!updatedLoan) {
          this.refreshSelectedLoanState(loan.id, {
            matchedStatus: 'ACTIVE',
            successSummary: 'Already Disbursed',
            successDetail: (freshLoan) => `Loan ${freshLoan.loanCode || freshLoan.id} is already ACTIVE. The queue has been refreshed.`,
            fallbackSummary: 'Disbursement Failed',
            fallbackDetail: 'Only READY_FOR_DISBURSEMENT loans can be marked as disbursed.'
          });
          return;
        }
        this.isSubmitting = false;
        this.upsertLoan(updatedLoan);
        this.selectLoan(updatedLoan);
        this.showMessage('success', 'Loan Disbursed', `Loan ${updatedLoan.loanCode || updatedLoan.id} has been moved to ACTIVE.`);
      },
      error: () => {
        this.isSubmitting = false;
        this.showMessage('error', 'Disbursement Failed', 'The cooperative loan could not be marked as disbursed.');
      }
    });
  }

  viewLoanDetails(): void {
    const loan = this.selectedLoan;
    if (!loan) {
      return;
    }
    this.router.navigate(['/admin/hr/cooperative/loans', loan.id, this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/loan', this.currentUuid || 'uu'], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  goToApprovedPage(page: number): void {
    if (page >= 1 && page <= this.approvedTotalPages) {
      this.approvedPage = page;
    }
  }

  goToReadyPage(page: number): void {
    if (page >= 1 && page <= this.readyTotalPages) {
      this.readyPage = page;
    }
  }

  getMemberName(loan: CooperativeLoan): string {
    const member = this.getMemberForLoan(loan);
    return member?.fullName || `Member #${loan.memberId || loan.cooperativeMemberId || '—'}`;
  }

  getGroupName(loan: CooperativeLoan): string {
    return this.getGroupForLoan(loan)?.name || `Group #${loan.groupId || loan.cooperativeGroupId || '—'}`;
  }

  getGroupCode(loan: CooperativeLoan): string {
    return this.getGroupForLoan(loan)?.code || '—';
  }

  getMemberId(loan: CooperativeLoan): number | string {
    return loan.memberId || loan.cooperativeMemberId || '—';
  }

  getMembershipId(loan: CooperativeLoan): number | string {
    if (loan.membershipId) {
      return loan.membershipId;
    }
    const membership = this.cooperativeService.getGroupMembership(
      loan.cooperativeMemberId,
      loan.cooperativeGroupId
    );
    return membership?.id || '—';
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(Number(amount || 0));
  }

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  getStatusClass(status: string | undefined): string {
    const normalized = String(status || '').toLowerCase().replace(/_/g, '-');
    return `status-${normalized}`;
  }

  getReadyDate(loan: CooperativeLoan): string {
    return loan.disbursementInitiatedAt || loan.approvedDate || loan.requestDate || loan.applicationDate || '';
  }

  private matchesSearch(loan: CooperativeLoan, term: string): boolean {
    if (!term) {
      return true;
    }

    return [
      String(loan.loanCode || loan.loanId || loan.id || ''),
      this.getMemberName(loan),
      this.getGroupName(loan),
      this.getGroupCode(loan),
      String(loan.purpose || ''),
      String(loan.memberId || loan.cooperativeMemberId || ''),
      String(loan.membershipId || '')
    ].some((value) => value.toLowerCase().includes(term));
  }

  private getMemberForLoan(loan: CooperativeLoan): CooperativeMember | undefined {
    const memberId = Number(loan.memberId || loan.cooperativeMemberId || 0);
    return this.members.find((member) => Number(member.id) === memberId || Number(member.memberId) === memberId || Number(member.employeeId) === memberId);
  }

  private getGroupForLoan(loan: CooperativeLoan): CooperativeLoanGroup | undefined {
    const groupId = Number(loan.groupId || loan.cooperativeGroupId || 0);
    return this.groups.find((group) => Number(group.id) === groupId);
  }

  private getAuditUserLabel(value: number | object | undefined): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'object') {
      return String((value as { fullname?: string; username?: string }).fullname || (value as { username?: string }).username || '').trim();
    }
    return String(value);
  }

  private buildAccountingMailBody(
    loan: CooperativeLoan,
    group: CooperativeLoanGroup,
    accountingEmail: string,
    instructionReference: string
  ): { name: string; recieverEmail: string; subject: string; body: string } {
    const memberName = this.getMemberName(loan);
    const loanId = loan.loanCode || loan.loanId || loan.id;
    const bankName = this.selectedEmployeeDetails?.bankName || loan.memberBankName || 'N/A';
    const accountNumber = this.selectedEmployeeDetails?.accountNumber || loan.memberAccountNumber || 'N/A';

    return {
      name: 'Accounting Team',
      recieverEmail: accountingEmail,
      subject: `Cooperative Loan Disbursement Request - ${loanId}`,
      body: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">
          <p>Dear Accounting Team,</p>
          <p>A cooperative loan has been approved and is ready for disbursement processing.</p>
          <ul>
            <li><strong>Loan ID:</strong> ${loanId}</li>
            <li><strong>Member:</strong> ${memberName}</li>
            <li><strong>Member ID:</strong> ${this.getMemberId(loan)}</li>
            <li><strong>Group Membership ID:</strong> ${this.getMembershipId(loan)}</li>
            <li><strong>Group Name:</strong> ${group.name}</li>
            <li><strong>Group Code:</strong> ${group.code || 'N/A'}</li>
            <li><strong>Approved Amount:</strong> ${this.formatCurrency(loan.amount)}</li>
            <li><strong>Interest Rate:</strong> ${group.interestRate || 0}%</li>
            <li><strong>Repayment Period:</strong> ${loan.duration || loan.repaymentTime || 0} months</li>
            <li><strong>Purpose:</strong> ${this.formatPurposeDisplay(loan.purpose)}</li>
            <li><strong>Funding Bank:</strong> ${group.principalBankName || 'N/A'}</li>
            <li><strong>Funding Account:</strong> ${group.principalCollectionAccount || 'N/A'}</li>
            <li><strong>Borrower Bank:</strong> ${bankName}</li>
            <li><strong>Borrower Account Number:</strong> ${accountNumber}</li>
            <li><strong>Disbursement Instruction Reference:</strong> ${instructionReference}</li>
          </ul>
          ${this.emailNotes.trim() ? `<p><strong>Additional Notes:</strong> ${this.emailNotes.trim()}</p>` : ''}
          <p>Regards,<br/><strong>HR Management</strong></p>
        </div>
      `
    };
  }

  private generateDisbursementReference(loan: CooperativeLoan): string {
    const loanPrefix = String(loan.loanCode || loan.loanId || loan.id || 'COOP').replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase();
    return `COOP-DISB-${loanPrefix}-${Date.now().toString().slice(-6)}`;
  }

  private upsertLoan(updatedLoan: CooperativeLoan): void {
    const index = this.loans.findIndex((loan) => loan.id === updatedLoan.id);
    if (index === -1) {
      this.loans = [updatedLoan, ...this.loans];
      return;
    }
    this.loans = this.loans.map((loan) => loan.id === updatedLoan.id ? updatedLoan : loan);
  }

  private refreshSelectedLoanState(
    loanId: number,
    options: {
      matchedStatus: string;
      successSummary: string;
      successDetail: (loan: CooperativeLoan) => string;
      fallbackSummary: string;
      fallbackDetail: string;
    }
  ): void {
    this.cooperativeService.loadLoanById(loanId).subscribe({
      next: (freshLoan) => {
        this.isSubmitting = false;
        if (freshLoan) {
          this.upsertLoan(freshLoan);
          this.selectLoan(freshLoan);

          if (freshLoan.status === options.matchedStatus) {
            this.showMessage('success', options.successSummary, options.successDetail(freshLoan));
            return;
          }
        }

        this.showMessage('warn', options.fallbackSummary, options.fallbackDetail);
      },
      error: () => {
        this.isSubmitting = false;
        this.showMessage('warn', options.fallbackSummary, options.fallbackDetail);
      }
    });
  }

  private showMessage(severity: QueueMessage['severity'], summary: string, detail: string): void {
    this.messages = [{ severity, summary, detail }];
    setTimeout(() => {
      this.messages = [];
    }, 6000);
  }
}
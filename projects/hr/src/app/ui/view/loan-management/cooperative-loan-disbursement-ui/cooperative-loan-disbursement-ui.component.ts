import { Location } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoanGroup, CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';
import { formatLoanPurposeDisplay, resolveLoanActorName } from '../../../service/loan/loan-display.util';
import { resolveCooperativeTotalRepayable } from '../../../service/loan/cooperative-loan/cooperative-loan-amounts.util';
import { EmployeeService } from '../../../service/employee.service';
import { MailNotificationService } from '../../../service/mailNotification.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { getLoanStatusClass } from '../../../service/loan/loan-format.util';
import { resolveTenantId } from '../../../service/loan/loan-tenant.util';

type QueueMessage = {
  severity: 'success' | 'error' | 'warn';
  summary: string;
  detail: string;
};

@Component({
  selector: 'app-cooperative-loan-disbursement-ui',
  templateUrl: './cooperative-loan-disbursement-ui.component.html',
  styleUrls: ['./cooperative-loan-disbursement-ui.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CooperativeLoanDisbursementUiComponent implements OnInit {
  readonly queuePageSize = 6;
  // Loading states for partial UI rendering
  isLoansLoading = true;
  isMembersLoading = true;
  isGroupsLoading = true;

  batchSelectedLoanIds: Set<number> = new Set();
  batchViewIndex: number = 0;
  batchEmployeeDetailsMap: Map<number, any> = new Map();
  private batchLoanNotesMap: Map<number, string> = new Map();
  private batchLoanReferenceMap: Map<number, string> = new Map();
  isSendToAccountingModalVisible = false;
  isLoanDetailsModalVisible = false;
  submissionProgress = 0;

  // Helper to format membership ID as [group code letters]-[member id]-[membership id]
  public getFormattedMembershipId(loan: CooperativeLoan): string {
    const group = this.getGroupForLoan(loan);
    let groupCode = (group?.code || '').match(/^[A-Za-z]+/)?.[0] || '';
    const member = this.getMemberForLoan(loan);
    const memberIdNum = loan.cooperativeMemberId || loan.memberId || member?.id || member?.memberId;
    const membership = this.cooperativeService.resolveGroupMembershipForLoan(loan, member);
    const membershipIdRaw = membership?.membershipId || '';
    if (membershipIdRaw && groupCode && memberIdNum) {
      return `${groupCode}-${memberIdNum}-${membershipIdRaw}`;
    }
    return '';
  }

  // Helper to format just the member ID as COP-XXX (static prefix, zero-padded)
  public getFormattedMemberId(loan: CooperativeLoan): string {
    const member = this.getMemberForLoan(loan);
    const memberIdNum = member?.memberId || loan.cooperativeMemberId || loan.memberId;
    if (memberIdNum) {
      const padded = String(memberIdNum).padStart(3, '0');
      return `COP-${padded}`;
    }
    return '';
  }

  currentUuid = '';
  isLoading = true;
  isSubmitting = false;
  messages: QueueMessage[] = [];

  loans: CooperativeLoan[] = [];
  members: CooperativeMember[] = [];
  groups: CooperativeLoanGroup[] = [];
  selectedLoanId = '';
  selectedEmployeeDetails: any = null;
  isLoadingEmployeeDetails = false;
  /** Confirmation step for "Set Loan to Active". */
  showDisbursementConfirmation = false;
  bankTransferReference = '';

  
  approvedSearchTerm = '';
  readySearchTerm = '';
  approvedPage = 1;
  readyPage = 1;


  // Advanced UI compatibility properties
  selectedDisbursementLoan: CooperativeLoan | null = null;
  approvedSortKey: string = 'approvedDate';
  readySortKey: string = 'readyDate';
  approvedSortDirection: string = 'desc';
  readySortDirection: string = 'desc';

  accountingEmail = '';
  principalBankName = '';
  principalCollectionAccount = '';
  interestBankName = '';
  interestCollectionAccount = '';
  lateFeeBankName = '';
  lateFeeCollectionAccount = '';
  lateFeePercentage: number | undefined;
  lateFeeGraceDays: number | undefined;
  accountingWebhookUrl = '';
  emailNotes = '';
  emailNotesError = false;
  disbursementInstructionReference = '';
  disbursementInitiatedAt = '';
  disbursementInitiatedBy = '';
  disbursementAmount = 0;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'PAYROLL_DEDUCTION' = 'BANK_TRANSFER';

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private cooperativeService: CooperativeService,
    private employeeService: EmployeeService,
    private mailNotificationService: MailNotificationService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.currentUuid = this.route.snapshot.paramMap.get('uuid') || '';
    this.loadAllData();
  }

  loadAllData(): void {
  // Groups, members and loans load in parallel: loans used to wait for groups to succeed, so a slow or
  // failed groups call (or the members 500) left the disbursement queue empty.
  this.cooperativeService.loadGroups().subscribe({
    next: (groups) => {
      this.groups = groups;
      this.isGroupsLoading = false;
    },
    error: () => {
      this.isGroupsLoading = false;
      this.showMessage('error', 'Load Failed', 'Could not load cooperative groups.');
    }
  });

  this.cooperativeService.getMembers().subscribe({
    next: (members) => {
      this.members = members;
      this.isMembersLoading = false;
    },
    error: () => {
      this.isMembersLoading = false;
    }
  });

  this.cooperativeService.refreshLoans().subscribe({
    next: (loans) => {
      this.loans = loans;
      this.isLoansLoading = false;

      const requestedLoanId = String(this.route.snapshot.queryParamMap.get('loanId') || '').trim();
      const defaultLoan = this.readyForDisbursementLoans[0] || this.approvedLoans[0] || null;
      const selectedLoan = [...this.readyForDisbursementLoans, ...this.approvedLoans].find((loan) => String(loan.id) === requestedLoanId) || defaultLoan;
      if (selectedLoan) {
        this.selectLoan(selectedLoan);
      }
    },
    error: () => {
      this.isLoansLoading = false;
      this.showMessage('error', 'Load Failed', 'The cooperative disbursement queue could not be loaded.');
    }
  });

  // Load group memberships
  this.cooperativeService.loadGroupMemberships().subscribe();
}
  getQueuedDisbursementTotal(): number {
    return this.getApprovedQueueTotal() + this.getReadyForDisbursementTotal();
  }

  getApprovedQueueTotal(): number {
    return this.approvedLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  }

  getReadyForDisbursementTotal(): number {
    return this.readyForDisbursementLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  }

  hasQueueLoans(): boolean {
    return this.approvedLoans.length > 0 || this.readyForDisbursementLoans.length > 0;
  }

  getFilteredApprovedLoans(): CooperativeLoan[] {
    return this.approvedLoans.filter((loan) => this.matchesSearch(loan, this.approvedSearchTerm));
  }

  getFilteredReadyForDisbursementLoans(): CooperativeLoan[] {
    return this.readyForDisbursementLoans.filter((loan) => this.matchesSearch(loan, this.readySearchTerm));
  }

  getPaginatedApprovedLoans(): CooperativeLoan[] {
    const start = (this.approvedPage - 1) * this.queuePageSize;
    return this.getFilteredApprovedLoans().slice(start, start + this.queuePageSize);
  }

  getPaginatedReadyForDisbursementLoans(): CooperativeLoan[] {
    const start = (this.readyPage - 1) * this.queuePageSize;
    return this.getFilteredReadyForDisbursementLoans().slice(start, start + this.queuePageSize);
  }

  getFilteredApprovedTotal(): number {
    return this.getFilteredApprovedLoans().reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  }

  getFilteredReadyForDisbursementTotal(): number {
    return this.getFilteredReadyForDisbursementLoans().reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  }

  getApprovedTotalPages(): number {
    return Math.max(1, Math.ceil(this.getFilteredApprovedLoans().length / this.queuePageSize));
  }

  getReadyTotalPages(): number {
    return Math.max(1, Math.ceil(this.getFilteredReadyForDisbursementLoans().length / this.queuePageSize));
  }

  onApprovedSearchChange(value: string): void {
    this.approvedSearchTerm = value;
    this.approvedPage = 1;
  }

  onReadySearchChange(value: string): void {
    this.readySearchTerm = value;
    this.readyPage = 1;
  }

  getApprovedResultsLabel(): string {
    return this.buildResultsLabel(this.getFilteredApprovedLoans().length, this.approvedPage);
  }

  getReadyResultsLabel(): string {
    return this.buildResultsLabel(this.getFilteredReadyForDisbursementLoans().length, this.readyPage);
  }

  buildResultsLabel(totalItems: number, page: number): string {
    if (!totalItems) {
      return 'Showing 0 results';
    }
    const start = (page - 1) * this.queuePageSize + 1;
    const end = Math.min(start + this.queuePageSize - 1, totalItems);
    return `Showing ${start}-${end} of ${totalItems}`;
  }

  formatDate(value?: string | null): string {
    if (!value) return 'N/A';
    return new Date(value).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getQueueStatusLabel(loan: CooperativeLoan): string {
    if (loan.status === 'READY_FOR_DISBURSEMENT') return 'Disbursable';
    if (loan.status === 'APPROVED') return 'Approved';
    return String(loan.status || '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  getQueueStatusClass(loan: CooperativeLoan): string {
    return loan.status === 'READY_FOR_DISBURSEMENT' ? 'status-ready_for_disbursement' : 'status-approved';
  }

  getFullName(loan: CooperativeLoan): string {
    return this.getMemberName(loan);
  }

  getGroupNameTpl(loan: CooperativeLoan): string {
    return this.getGroupName(loan);
  }

  getGroupCodeTpl(loan: CooperativeLoan): string {
    return this.getGroupCode(loan);
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

  get approvedTotalPages(): number {
    return Math.max(1, Math.ceil(this.approvedLoans.length / this.queuePageSize));
  }

  get readyTotalPages(): number {
    return Math.max(1, Math.ceil(this.readyForDisbursementLoans.length / this.queuePageSize));
  }

  get canSendToAccounting(): boolean {
    return !!this.selectedLoan
      && this.selectedLoan.status === 'APPROVED'
      && !this.isSubmitting
      && !this.isLoadingEmployeeDetails
      && this.hasBankDetails(this.selectedEmployeeDetails, this.selectedLoan);
  }

  /** Bank name and account number for the payout, from the employee record or the loan. */
  hasBankDetails(employee: any, loan: CooperativeLoan | null | undefined): boolean {
    const accountNumber = String(employee?.accountNumber || loan?.memberAccountNumber || '').trim();
    const bankName = String(employee?.bankName || loan?.memberBankName || '').trim();
    return !!accountNumber && accountNumber.toUpperCase() !== 'N/A' && !!bankName && bankName.toUpperCase() !== 'N/A';
  }

  get selectedLoanMissingBankDetails(): boolean {
    return this.selectedLoan?.status === 'APPROVED'
      && !this.isLoadingEmployeeDetails
      && !this.hasBankDetails(this.selectedEmployeeDetails, this.selectedLoan);
  }

  onCurrentLoanNoteChange(value: string): void {
    this.emailNotes = value;
    if (this.selectedDisbursementLoan) {
      this.batchLoanNotesMap.set(this.selectedDisbursementLoan.id, value);
    }
  }

  private getStoredLoanNote(loan: CooperativeLoan | null | undefined): string {
    if (!loan) return '';
    return this.batchLoanNotesMap.get(loan.id) || '';
  }

  selectLoan(loan: CooperativeLoan, skipServerRefresh = false): void {
    if (this.selectedDisbursementLoan?.id !== loan.id) {
      this.cancelDisbursementConfirmation();
    }
    this.selectedLoanId = String(loan.id);
    this.selectedDisbursementLoan = loan;
    this.disbursementAmount = Number(loan.amount || 0);
    this.paymentMethod = 'BANK_TRANSFER';
    this.emailNotes = this.getStoredLoanNote(loan);
    
    // Get the group - if groups aren't loaded yet, try to get it from the loan directly
    let group = this.getGroupForLoan(loan);
    
    // If groups are still loading, we need to wait or get from cache
    if (!group && this.groups.length === 0 && this.isGroupsLoading) {
      // Groups are still loading, set a timeout to retry
      setTimeout(() => {
        const retryGroup = this.getGroupForLoan(loan);
        if (retryGroup) {
          this.populateGroupFields(retryGroup);
        }
      }, 500);
    }
    
    // Populate group fields if we have the group
    if (group) {
      this.populateGroupFields(group);
    } else {
      // Fallback: try to get group info from the loan object itself
      this.accountingEmail = String(loan.accountingEmail || '').trim();
      this.principalBankName = loan.principalBankName || '';
      this.principalCollectionAccount = loan.principalCollectionAccount || '';
      this.interestBankName = loan.interestBankName || '';
      this.interestCollectionAccount = loan.interestCollectionAccount || '';
      this.lateFeeBankName = loan.lateFeeBankName || '';
      this.lateFeeCollectionAccount = loan.lateFeeCollectionAccount || '';
      this.lateFeePercentage = loan.lateFeePercentage;
      this.lateFeeGraceDays = loan.lateFeeGraceDays;
      this.accountingWebhookUrl = loan.accountingWebhookUrl || '';
    }
    
    this.disbursementInstructionReference = loan.disbursementInstructionLoanReference || this.generateDisbursementReference(loan);
    this.disbursementInitiatedAt = loan.disbursementInitiatedAt ? (typeof loan.disbursementInitiatedAt === 'string' ? loan.disbursementInitiatedAt : loan.disbursementInitiatedAt.toISOString()) : '';
    this.disbursementInitiatedBy = this.getAuditUserLabel(loan.disbursementInitiatedBy);
    this.loadEmployeeDetails(loan);
  }

  toggleLoanSelection(loan: CooperativeLoan): void {
    if (this.selectedDisbursementLoan?.id === loan.id) {
      this.clearSelectedLoan();
      return;
    }
    this.selectLoan(loan);
  }

  openLoanDetailsModal(loan: CooperativeLoan): void {
    this.selectLoan(loan);
    this.isLoanDetailsModalVisible = true;
  }

  openBatchLoanDetailsModal(): void {
    const loans = this.batchSelectedLoans;
    if (!loans.length) {
      return;
    }

    this.batchViewIndex = 0;
    const currentLoan = loans[0];
    this.selectLoan(currentLoan);
    this.isLoanDetailsModalVisible = true;
  }

  closeLoanDetailsModal(): void {
    this.isLoanDetailsModalVisible = false;
    this.cancelDisbursementConfirmation();
    setTimeout(() => {
      if (!this.isSendToAccountingModalVisible) {
        this.selectedDisbursementLoan = null;
        this.selectedEmployeeDetails = null;
        this.selectedLoanId = '';
      }
    }, 300);
  }

  private clearSelectedLoan(): void {
    this.selectedLoanId = '';
    this.selectedDisbursementLoan = null;
    this.selectedEmployeeDetails = null;
    this.disbursementInstructionReference = '';
    this.disbursementInitiatedAt = '';
    this.disbursementInitiatedBy = '';
    this.disbursementAmount = 0;
    this.emailNotes = '';
    this.emailNotesError = false;
    this.isSendToAccountingModalVisible = false;
    this.isLoanDetailsModalVisible = false;
  }

  loadEmployeeDetails(loan: CooperativeLoan): void {
    const member = this.getMemberForLoan(loan);
    const employeeId = Number(member?.employeeId || 0);
    this.selectedEmployeeDetails = null;
    if (!employeeId) {
      this.isLoadingEmployeeDetails = false;
      return;
    }

    this.isLoadingEmployeeDetails = true;
    this.employeeService.getEmployeeById(employeeId).subscribe({
      next: (employee) => {
        // Ignore a late response for a loan that's no longer selected, so one member's bank
        // details can never end up on another member's disbursement.
        if (this.selectedLoan?.id !== loan.id) {
          return;
        }
        this.selectedEmployeeDetails = employee;
        this.isLoadingEmployeeDetails = false;
      },
      error: () => {
        if (this.selectedLoan?.id !== loan.id) {
          return;
        }
        this.selectedEmployeeDetails = null;
        this.isLoadingEmployeeDetails = false;
      }
    });
  }

sendToAccounting(): void {
  if (!this.emailNotes?.trim() || this.isSubmitting) {
    this.emailNotesError = !this.emailNotes?.trim();
    return;
  }

  if (this.isBatchMode) {
    this.sendBatchToAccounting();
    return;
  }

  const loan = this.selectedLoan;
  const group = this.selectedGroup;
  if (loan && loan.status === 'APPROVED' && !this.isLoadingEmployeeDetails && !this.hasBankDetails(this.selectedEmployeeDetails, loan)) {
    this.showMessage('error', 'Bank Details Missing', `${this.getMemberName(loan)} has no bank name and account number on file. Add them before sending to accounting.`);
    return;
  }
  if (!loan || !group || !this.canSendToAccounting) {
    return;
  }

  this.emailNotesError = false;

  const instructionReference = this.disbursementInstructionReference || this.generateDisbursementReference(loan);
  const adminComment = this.emailNotes.trim() || undefined;
  const transactionDate = new Date().toISOString();
  
  // Get member details
  const member = this.getMemberForLoan(loan);
  const memberName = this.getMemberName(loan);
  
  const approvedAmount = Number(loan.approvedAmount || loan.amount || 0);
  // Metadata only; same figure the member saw when applying.
  const totalRepayable = resolveCooperativeTotalRepayable(loan, group.interestRate);

  this.isSubmitting = true;
  
  // Use the correct base URL
  const baseUrl = 'https://be.optimaxsuites.com';
  const apiUrl = `${baseUrl}/x/api/v2/accounting/events`;
  
  const accountingEventPayload = {
    id: 0,
    sourceModule: "HR",
    eventType: "LOAN_DISBURSEMENT",
    amount: approvedAmount,
    currency: "NGN",
    reference: instructionReference,
    description: adminComment || `Loan disbursement for ${memberName}`,
    transactionDate: transactionDate,
    metadata: {
      loanId: loan.id,
      loanCode: loan.loanCode || loan.loanId,
      member: memberName,
      memberId: loan.memberId || loan.cooperativeMemberId,
      membershipId: loan.membershipId,
      groupMembershipId: this.getFormattedMembershipId(loan),
      groupName: group.name,
      groupCode: group.code,
      groupInterestRate: group.interestRate,
      repaymentPeriod: loan.duration || loan.repaymentTime,
      approvedAmount,
      totalRepayable: totalRepayable,
      modeOfPayment: loan.modeOfPayment || 'MONTHLY',
      paymentMethod: this.paymentMethod,
      purpose: loan.purpose,
      approvedDate: loan.approvedDate,
      approvedBy: loan.approvedBy,
      bankName: this.selectedEmployeeDetails?.bankName || loan.memberBankName || 'N/A',
      accountNumber: this.selectedEmployeeDetails?.accountNumber || loan.memberAccountNumber || 'N/A',
      accountName: memberName,
      initiatedBy: this.disbursementInitiatedBy || sessionStorage.getItem('fullname') || sessionStorage.getItem('username') || 'Admin',
      initiatedAt: transactionDate,
      instructionReference: instructionReference
    }
  };

  
  this.http.post(apiUrl, accountingEventPayload).subscribe({
    next: (response) => {

      // Update loan status using the cooperative service
      // Pass the group financial details to preserve them
      this.cooperativeService.sendLoanToAccountingForDisbursement(loan.id, {
        accountingEmail: this.accountingEmail,
        disbursementInstructionReference: instructionReference,
        paymentMethod: this.paymentMethod,
        notes: adminComment
      }).subscribe({
        next: (updatedLoan: CooperativeLoan | undefined) => {
          if (!updatedLoan) {
            this.refreshSelectedLoanState(loan.id, {
              matchedStatus: 'READY_FOR_DISBURSEMENT',
              successSummary: 'Already Sent',
              successDetail: (freshLoan: CooperativeLoan) => `Loan ${freshLoan.loanCode || freshLoan.id} is already Disbursable. The queue has been refreshed.`,
              fallbackSummary: 'Workflow Skipped',
              fallbackDetail: 'Only approved cooperative loans can be sent to accounting.'
            });
            return;
          }

          // Always re-fetch the full loan details to ensure all fields are preserved
          this.cooperativeService.loadLoanById(updatedLoan.id).subscribe({
            next: (freshLoan: CooperativeLoan | undefined) => {
              this.isSubmitting = false;
              if (freshLoan) {
                this.batchLoanNotesMap.delete(freshLoan.id);
                this.upsertLoan(freshLoan);
                this.selectLoan(freshLoan);
                 this.showMessage('success', 'Disbursable', `Loan ${freshLoan.loanCode || freshLoan.id} has been moved to Disbursable.`);
              } else {
                this.showMessage('warn', 'Loan Reload Failed', 'Loan status updated, but full details could not be reloaded.');
              }
            },
            error: (error: any) => {
              this.isSubmitting = false;
              this.showMessage('warn', 'Loan Reload Failed', 'Loan status updated, but full details could not be reloaded.');
            }
          });
        },
        error: (error: any) => {
          console.error('Error updating loan status:', error);
          this.isSubmitting = false;
          this.showMessage('error', 'Update Failed', 'The accounting event was posted, but the loan status could not be updated.');
        }
      });
    },
    error: (error: any) => {
      console.error('=== POST FAILED ===');
      console.error('Error posting to accounting events:', error);
      console.error('Failed payload:', JSON.stringify(accountingEventPayload, null, 2));
      console.error('===================');

      this.isSubmitting = false;
      this.showMessage('error', 'Accounting Event Failed', `Failed to post to accounting: ${error.message || 'Unknown error'}. Loan status remains APPROVED.`);
    }
  });
}

  getApprovedByName(loan: CooperativeLoan): string {
    const value = loan.approvedBy as unknown;
    if (!value) {
      return 'N/A';
    }
    if (typeof value === 'object') {
      const user = value as { fullname?: string; username?: string; id?: number };
      return String(user.fullname || user.username || user.id || 'N/A');
    }
    return String(value);
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
    const member = this.getMemberForLoan(loan);
    const membership = this.cooperativeService.resolveGroupMembershipForLoan(loan, member);
    return membership?.id || loan.membershipId || '—';
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(Number(amount || 0));
  }

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  getStatusClass(status: string | undefined): string {
    return getLoanStatusClass(status, 'status-', '-');
  }

  getReadyDate(loan: CooperativeLoan): string {
    const dateValue = loan.disbursementInitiatedAt || loan.approvedDate || loan.requestDate || loan.applicationDate || '';
    return this.dateToString(dateValue);
  }

  private dateToString(value: string | Date | undefined): string {
    if (!value) return '';
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
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

  private populateGroupFields(group: CooperativeLoanGroup): void {
  this.accountingEmail = String(this.selectedDisbursementLoan?.accountingEmail || group.accountingEmail || '').trim();
  this.principalBankName = group.principalBankName || '';
  this.principalCollectionAccount = group.principalCollectionAccount || '';
  this.interestBankName = group.interestBankName || '';
  this.interestCollectionAccount = group.interestCollectionAccount || '';
  this.lateFeeBankName = group.lateFeeBankName || '';
  this.lateFeeCollectionAccount = group.lateFeeCollectionAccount || '';
  this.lateFeePercentage = group.lateFeePercentage;
  this.lateFeeGraceDays = group.lateFeeGraceDays;
  this.accountingWebhookUrl = group.accountingWebhookUrl || '';
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
    return resolveLoanActorName(value as any);
  }

  private generateDisbursementReference(loan: CooperativeLoan, indexOffset = 0): string {
    const loanPrefix = String(loan.loanCode || loan.loanId || loan.id || 'COOP').replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase();
    const uniquePart = (Date.now() + indexOffset).toString().slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `COOP-DISB-${loanPrefix}-${uniquePart}`;
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

  /** "Set Loan to Active": ask for the bank transfer reference and an explicit confirmation first. */
  setLoanActive(loan: CooperativeLoan): void {
    if (!loan || loan.status !== 'READY_FOR_DISBURSEMENT' || this.isSubmitting) return;
    this.bankTransferReference = '';
    this.showDisbursementConfirmation = true;
  }

  cancelDisbursementConfirmation(): void {
    this.showDisbursementConfirmation = false;
    this.bankTransferReference = '';
  }

  get isBankTransferReferenceValid(): boolean {
    return this.bankTransferReference.trim().length >= 4;
  }

  confirmSetLoanActive(): void {
    const loan = this.selectedDisbursementLoan;
    if (!loan || this.isSubmitting) return;
    if (!this.isBankTransferReferenceValid) {
      this.showMessage('warn', 'Reference Required', 'Enter the bank transfer reference for this disbursement.');
      return;
    }

    const reference = this.bankTransferReference.trim();
    this.isSubmitting = true;
    this.cooperativeService.disburseLoan(loan.id, {
      disbursedAmount: loan.amount,
      paymentMethod: this.paymentMethod,
      disbursementReference: reference,
      notes: `Loan disbursed and activated. Bank reference: ${reference}.`
    }).subscribe({
      next: (updated: CooperativeLoan | undefined) => {
        this.isSubmitting = false;
        if (updated) {
          this.cancelDisbursementConfirmation();
          // Remove the activated loan from the queue immediately
          this.loans = this.loans.filter(l => l.id !== loan.id);
          this.selectedLoanId = '';
          this.showMessage('success', 'Loan Activated', `Loan has been set to ACTIVE. Bank reference: ${reference}.`);
          this.loadAllData();
        } else {
          this.showMessage('warn', 'Activation Failed', 'Loan could not be set to ACTIVE. It may no longer be Disbursable; reload and check its status.');
        }
      },
      error: () => {
        this.isSubmitting = false;
        this.showMessage('error', 'Activation Failed', 'Could not set loan to ACTIVE. Nothing was changed; please try again.');
      }
    });
  }

  get batchSelectedLoans(): CooperativeLoan[] {
  return this.approvedLoans.filter(loan => this.batchSelectedLoanIds.has(loan.id));
}

get isBatchMode(): boolean {
  return this.batchSelectedLoanIds.size >= 2;
}

getBatchTotalAmount(): number {
  return this.batchSelectedLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
}

isBatchSelected(loan: CooperativeLoan): boolean {
  return this.batchSelectedLoanIds.has(loan.id);
}

  toggleBatchSelect(loan: CooperativeLoan): void {
    if (this.batchSelectedLoanIds.has(loan.id)) {
      this.batchSelectedLoanIds.delete(loan.id);
      this.batchEmployeeDetailsMap.delete(loan.id);
    } else {
      this.batchSelectedLoanIds.add(loan.id);
      if (!this.batchEmployeeDetailsMap.has(loan.id)) {
        const member = this.getMemberForLoan(loan);
        const employeeId = Number(member?.employeeId || 0);
        if (employeeId) {
          this.employeeService.getEmployeeById(employeeId).subscribe({
            next: (emp) => this.batchEmployeeDetailsMap.set(loan.id, emp),
            error: () => this.batchEmployeeDetailsMap.set(loan.id, null)
          });
        } else {
          this.batchEmployeeDetailsMap.set(loan.id, null);
        }
      }
    }

    const newSize = this.batchSelectedLoanIds.size;
    this.batchViewIndex = newSize > 0 ? Math.min(this.batchViewIndex, newSize - 1) : 0;

    if (newSize === 1) {
      this.selectLoan(loan);
    }
  }

  selectAllApprovedLoans(): void {
    this.getFilteredApprovedLoans().forEach(loan => {
      if (!this.batchSelectedLoanIds.has(loan.id)) {
        this.batchSelectedLoanIds.add(loan.id);
        if (!this.batchEmployeeDetailsMap.has(loan.id)) {
          const member = this.getMemberForLoan(loan);
          const employeeId = Number(member?.employeeId || 0);
          if (employeeId) {
            this.employeeService.getEmployeeById(employeeId).subscribe({
              next: (emp) => this.batchEmployeeDetailsMap.set(loan.id, emp),
              error: () => this.batchEmployeeDetailsMap.set(loan.id, null)
            });
          } else {
            this.batchEmployeeDetailsMap.set(loan.id, null);
          }
        }
      }
    });
  }

  clearBatchSelection(): void {
    this.batchSelectedLoanIds.clear();
    this.batchEmployeeDetailsMap.clear();
    this.batchViewIndex = 0;
  }

  navigateBatch(direction: 1 | -1): void {
    const total = this.batchSelectedLoans.length;
    if (total < 2) return;
    this.batchViewIndex = (this.batchViewIndex + direction + total) % total;
    const loan = this.batchSelectedLoans[this.batchViewIndex];
    if (loan) {
      this.selectLoan(loan);
      this.selectedEmployeeDetails = this.batchEmployeeDetailsMap.get(loan.id) ?? null;
      if (!this.selectedEmployeeDetails && !this.batchEmployeeDetailsMap.has(loan.id)) {
        this.loadEmployeeDetails(loan);
      }
    }
  }

  openSendToAccountingModal(): void {
    if (this.isBatchMode) {
      const allApproved = this.batchSelectedLoans.every(l => l.status === 'APPROVED');
      if (!allApproved) return;

      this.batchViewIndex = Math.min(this.batchViewIndex, Math.max(0, this.batchSelectedLoans.length - 1));
      const currentLoan = this.batchSelectedLoans[this.batchViewIndex];
      if (currentLoan) {
        this.selectLoan(currentLoan);
      }

      this.emailNotesError = false;
      this.isSendToAccountingModalVisible = true;
      this.submissionProgress = 0;
      return;
    }

    if (!this.selectedDisbursementLoan || this.selectedDisbursementLoan.status !== 'APPROVED') {
      return;
    }

    if (!this.disbursementInstructionReference) {
      this.disbursementInstructionReference = this.generateDisbursementReference(this.selectedDisbursementLoan);
    }

    this.emailNotesError = false;
    this.isSendToAccountingModalVisible = true;
    this.submissionProgress = 0;
  }

  closeSendToAccountingModal(): void {
    if (!this.isSubmitting) {
      this.isSendToAccountingModalVisible = false;
      this.emailNotesError = false;
      this.submissionProgress = 0;
    }
  }

  /**
   * Batch send: make sure every selected member's bank details are loaded and present first, so
   * accounting never receives 'N/A' as an account number.
   */
  sendBatchToAccounting(): void {
    const loans = this.batchSelectedLoans.filter(l => l.status === 'APPROVED');
    if (!loans.length) return;

    const missing = loans.filter((loan) => !this.batchEmployeeDetailsMap.get(loan.id));
    const fetches = missing.map((loan) => {
      const employeeId = Number(this.getMemberForLoan(loan)?.employeeId || 0);
      return (employeeId ? this.employeeService.getEmployeeById(employeeId) : of(null)).pipe(
        map((employee) => ({ loan, employee })),
        catchError(() => of({ loan, employee: null }))
      );
    });
    this.isSubmitting = true;
    (fetches.length ? forkJoin(fetches) : of([] as Array<{ loan: CooperativeLoan; employee: any }>)).subscribe((results) => {
      results.forEach(({ loan, employee }) => this.batchEmployeeDetailsMap.set(loan.id, employee));
      this.isSubmitting = false;

      const withoutBankDetails = loans.filter((loan) => !this.hasBankDetails(this.batchEmployeeDetailsMap.get(loan.id), loan));
      if (withoutBankDetails.length) {
        const names = withoutBankDetails.slice(0, 3).map((loan) => this.getMemberName(loan)).join(', ');
        const more = withoutBankDetails.length > 3 ? ` and ${withoutBankDetails.length - 3} more` : '';
        this.showMessage('error', 'Bank Details Missing', `Nothing was sent. These members have no bank name and account number on file: ${names}${more}. Add them, or untick those loans, then try again.`);
        return;
      }

      this.postBatchToAccounting(loans);
    });
  }

  private postBatchToAccounting(loans: CooperativeLoan[]): void {

    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const tenantId = resolveTenantId();
    
    const currentUser = sessionStorage.getItem('fullname') || 
                        sessionStorage.getItem('username') || 
                        localStorage.getItem('fullname') || 
                        localStorage.getItem('username') || 
                        'System';

    const initiatedAt = new Date().toISOString();
    const initiatedBy = currentUser;
    this.emailNotesError = false;
    this.isSubmitting = true;
    this.submissionProgress = 10;

    const loanRefs = loans.map((loan, idx) => ({
      loan,
      reference: this.generateDisbursementReference(loan, idx),
      employeeDetails: this.batchEmployeeDetailsMap.get(loan.id) || null,
      group: this.getGroupForLoan(loan)
    }));

    const headers = token ? new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId
    }) : undefined;
    const options = headers ? { headers } : undefined;

    const apiBaseUrl = 'https://be.optimaxsuites.com';
    const url = `${apiBaseUrl}/x/api/v2/accounting/events`;

    this.submissionProgress = 35;

    // Step 1: Concurrently post accounting events
    const accountingRequests = loanRefs.map(({ loan, reference, employeeDetails, group }) => {
      const approvedAmount = Number(loan.approvedAmount || loan.amount || 0);
      const totalRepayable = resolveCooperativeTotalRepayable(loan, group?.interestRate);
      const memberName = this.getMemberName(loan);
      const loanNote = this.getStoredLoanNote(loan) || this.emailNotes;

      const accountingPayload = {
        id: 0,
        sourceModule: 'HR',
        eventType: 'LOAN_DISBURSEMENT',
        amount: approvedAmount,
        currency: 'NGN',
        reference,
        description: loanNote || `Loan disbursement for ${memberName}`,
        transactionDate: initiatedAt,
        metadata: {
          loanId: loan.id,
          loanCode: loan.loanCode || loan.loanId,
          member: memberName,
          memberId: loan.memberId || loan.cooperativeMemberId,
          membershipId: loan.membershipId,
          groupMembershipId: this.getFormattedMembershipId(loan),
          groupName: group?.name || 'N/A',
          groupCode: group?.code || 'N/A',
          groupInterestRate: group?.interestRate || 0,
          repaymentPeriod: loan.duration || loan.repaymentTime,
          approvedAmount,
          totalRepayable,
          modeOfPayment: loan.modeOfPayment || 'MONTHLY',
          paymentMethod: this.paymentMethod,
          purpose: loan.purpose,
          approvedDate: loan.approvedDate,
          approvedBy: loan.approvedBy,
          bankName: employeeDetails?.bankName || loan.memberBankName || 'N/A',
          accountNumber: employeeDetails?.accountNumber || loan.memberAccountNumber || 'N/A',
          accountName: memberName,
          initiatedBy,
          initiatedAt,
          notes: loanNote
        }
      };

      return this.http.post(url, accountingPayload, options);
    });

    forkJoin(accountingRequests).subscribe({
      next: () => {
        this.submissionProgress = 70;

        // Step 2: Concurrently update loan statuses
        const statusUpdates = loanRefs.map(({ loan, reference }) => {
          const loanNote = this.getStoredLoanNote(loan) || this.emailNotes;
          const group = this.getGroupForLoan(loan);
          const accountingEmail = String(loan.accountingEmail || group?.accountingEmail || '').trim();
          return this.cooperativeService.sendLoanToAccountingForDisbursement(loan.id, {
            accountingEmail,
            disbursementInstructionReference: reference,
            disbursementReference: `PENDING-${reference}`,
            paymentMethod: this.paymentMethod,
            notes: loanNote
          });
        });

        forkJoin(statusUpdates).subscribe({
          next: (updatedLoans) => {
            this.submissionProgress = 90;

            // Step 3: Reload each updated loan
            const reloadRequests = updatedLoans
              .filter((l): l is CooperativeLoan => !!l)
              .map(updated => this.cooperativeService.loadLoanById(updated.id));

            const skippedCount = updatedLoans.length - reloadRequests.length;
            if (!reloadRequests.length) {
              // forkJoin([]) completes without emitting, which used to leave the spinner running.
              this.isSubmitting = false;
              this.submissionProgress = 0;
              this.showMessage('warn', 'Statuses Not Updated', 'Accounting events were posted, but none of the selected loans could be moved to Sent to Accounting. Reload and check them before retrying.');
              return;
            }

            forkJoin(reloadRequests).subscribe({
              next: (freshLoans) => {
                this.submissionProgress = 100;
                this.isSubmitting = false;

                freshLoans.forEach(freshLoan => {
                  if (freshLoan) {
                    this.batchLoanNotesMap.delete(freshLoan.id);
                    this.upsertLoan(freshLoan);
                  }
                });

                this.isSendToAccountingModalVisible = false;
                this.isLoanDetailsModalVisible = false;
                this.clearBatchSelection();
                this.selectedDisbursementLoan = null;
                this.selectedLoanId = '';
                if (skippedCount > 0) {
                  this.showMessage('warn', 'Batch Partially Updated', `${reloadRequests.length} loan(s) sent to accounting. ${skippedCount} loan(s) had their accounting event posted but their status could not be updated; reload and check them before retrying.`);
                } else {
                  this.showMessage('success', 'Batch Sent', `${loans.length} disbursement request(s) sent to accounting successfully.`);
                }
              },
              error: () => {
                this.isSubmitting = false;
                this.submissionProgress = 0;
                this.showMessage('warn', 'Reload Failed', 'Batch updated, but some loan details could not be reloaded.');
              }
            });
          },
          error: (error) => {
            console.error('Error updating status for batch:', error);
            this.isSubmitting = false;
            this.submissionProgress = 0;
            this.showMessage('error', 'Status Update Failed', 'Accounting events were posted, but some loan statuses could not be updated.');
          }
        });
      },
      error: (error) => {
        console.error('Batch send failed:', error);
        this.isSubmitting = false;
        this.submissionProgress = 0;
        this.showMessage('error', 'Batch Post Failed', `Failed to send batch to accounting: ${error.message || 'Unknown error'}`);
      }
    });
  }

}
// ...existing code...
import { Location } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoanGroup, CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';
import { formatLoanPurposeDisplay } from '../../../service/loan/loan-display.util';
import { EmployeeService } from '../../../service/employee.service';
import { MailNotificationService } from '../../../service/mailNotification.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { getTokenFromStorage } from '../../../service/loan/cooperative-loan/token-util';
import { environment } from '../../../shared-component/environments/environment';

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
  isSendToAccountingModalVisible = false;

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
  // Load groups first (most important for financial fields)
  this.cooperativeService.loadGroups().subscribe({
    next: (groups) => {
      this.groups = groups;
      this.isGroupsLoading = false;
      
      // After groups are loaded, load members and loans
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
    },
    error: () => {
      this.isGroupsLoading = false;
      this.showMessage('error', 'Load Failed', 'Could not load cooperative groups.');
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
    if (loan.status === 'READY_FOR_DISBURSEMENT') return 'Ready For Disbursement';
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
    return !!this.selectedLoan && this.selectedLoan.status === 'APPROVED' && !this.isSubmitting;
  }

  selectLoan(loan: CooperativeLoan): void {
  this.selectedLoanId = String(loan.id);
  this.selectedDisbursementLoan = loan;
  this.disbursementAmount = Number(loan.amount || 0);
  this.paymentMethod = 'BANK_TRANSFER';
  this.emailNotes = '';
  
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
  this.disbursementInitiatedAt = loan.disbursementInitiatedAt || '';
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

  if (!this.emailNotes.trim()) {
    this.emailNotesError = true;
    this.showMessage('warn', 'Missing Notes', 'Additional notes are required before sending to accounting.');
    return;
  }

  this.emailNotesError = false;

  const instructionReference = this.disbursementInstructionReference || this.generateDisbursementReference(loan);
  const adminComment = this.emailNotes.trim() || undefined;
  const transactionDate = new Date().toISOString();
  
  // Get member details
  const member = this.getMemberForLoan(loan);
  const memberName = this.getMemberName(loan);
  
  // Calculate total repayable amount
  const totalRepayable = Number(loan.amount || 0) * (1 + (Number(group.interestRate || 0) / 100));

  this.isSubmitting = true;

  const apiUrl = `${environment.apiBaseUrl}/x/api/v2/accounting/events`;

  const token = getTokenFromStorage();
  const tenantId = sessionStorage.getItem('tenantId') || sessionStorage.getItem('tenant')
    || localStorage.getItem('tenantId') || localStorage.getItem('tenant') || 'optimax';
  const authHeaders = new HttpHeaders({
    'Authorization': token ? `Bearer ${token}` : '',
    'X-Tenant-ID': tenantId && tenantId !== 'undefined' && tenantId !== 'null' ? tenantId : 'optimax',
    'Content-Type': 'application/json'
  });

  const accountingEventPayload = {
    sourceModule: 'HR',
    eventType: 'LOAN_DISBURSEMENT',
    amount: Number(loan.approvedAmount || loan.amount || 0),
    currency: 'NGN',
    reference: instructionReference,
    description: adminComment || `Loan disbursement for ${memberName}`,
    transactionDate: transactionDate,
    metadata: {
      loanId: String(loan.id ?? ''),
      loanCode: String(loan.loanCode || loan.loanId || loan.id || ''),
      member: memberName,
      memberId: String(loan.memberId || loan.cooperativeMemberId || ''),
      membershipId: String(loan.membershipId ?? ''),
      groupMembershipId: this.getFormattedMembershipId(loan),
      groupName: String(group.name || ''),
      groupCode: String(group.code || ''),
      groupInterestRate: String(group.interestRate ?? ''),
      repaymentPeriod: String(loan.duration || loan.repaymentTime || ''),
      approvedAmount: String(Number(loan.approvedAmount || loan.amount || 0)),
      totalRepayable: String(totalRepayable),
      modeOfPayment: String(loan.modeOfPayment || 'MONTHLY'),
      paymentMethod: String(this.paymentMethod),
      purpose: String(loan.purpose || ''),
      approvedDate: String(loan.approvedDate || ''),
      approvedBy: this.getApprovedByName(loan),
      bankName: String(this.selectedEmployeeDetails?.bankName || loan.memberBankName || 'N/A'),
      accountNumber: String(this.selectedEmployeeDetails?.accountNumber || loan.memberAccountNumber || 'N/A'),
      accountName: memberName,
      initiatedBy: String(this.disbursementInitiatedBy || sessionStorage.getItem('fullname') || sessionStorage.getItem('username') || 'Admin'),
      initiatedAt: transactionDate,
      instructionReference: instructionReference
    }
  };

  console.log('=== DISBURSEMENT PAYLOAD DEBUG ===');
  console.log('POST URL:', apiUrl);
  console.log('Payload:', JSON.stringify(accountingEventPayload, null, 2));
  console.log('===================================');
  
  this.http.post(apiUrl, accountingEventPayload, { headers: authHeaders }).subscribe({
    next: (response) => {
      console.log('=== POST SUCCESS RESPONSE ===');
      console.log('Response:', response);
      console.log('=============================');

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
              successDetail: (freshLoan: CooperativeLoan) => `Loan ${freshLoan.loanCode || freshLoan.id} is already READY_FOR_DISBURSEMENT. The queue has been refreshed.`,
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
                this.upsertLoan(freshLoan);
                this.selectLoan(freshLoan);
                this.showMessage('success', 'Ready for Disbursement', `Loan ${freshLoan.loanCode || freshLoan.id} has been moved to READY_FOR_DISBURSEMENT.`);
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
    if (typeof value === 'object') {
      return String((value as { fullname?: string; username?: string }).fullname || (value as { username?: string }).username || '').trim();
    }
    return String(value);
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

  setLoanActive(loan: CooperativeLoan): void {
    if (!loan || loan.status === 'ACTIVE') return;
    this.isSubmitting = true;
    this.cooperativeService.disburseLoan(loan.id, {
      disbursedAmount: loan.amount,
      paymentMethod: this.paymentMethod,
      notes: 'Loan activated by admin.'
    }).subscribe({
      next: (updated: CooperativeLoan | undefined) => {
        this.isSubmitting = false;
        if (updated) {
          // Remove the activated loan from the queue immediately
          this.loans = this.loans.filter(l => l.id !== loan.id);
          this.selectedLoanId = '';
          this.showMessage('success', 'Loan Activated', `Loan has been set to ACTIVE.`);
          this.loadAllData();
        } else {
          this.showMessage('warn', 'Activation Failed', 'Loan could not be set to ACTIVE.');
        }
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.showMessage('error', 'Activation Failed', 'Could not set loan to ACTIVE.');
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
  } else {
    this.batchSelectedLoanIds.add(loan.id);
  }
}

selectAllApprovedLoans(): void {
  this.getFilteredApprovedLoans().forEach(loan => {
    this.batchSelectedLoanIds.add(loan.id);
  });
}

clearBatchSelection(): void {
  this.batchSelectedLoanIds.clear();
  this.batchViewIndex = 0;
}

navigateBatch(direction: 1 | -1): void {
  const total = this.batchSelectedLoans.length;
  if (total < 2) return;
  this.batchViewIndex = (this.batchViewIndex + direction + total) % total;
  const loan = this.batchSelectedLoans[this.batchViewIndex];
  if (loan) {
    this.selectLoan(loan);
  }
}

openSendToAccountingModal(): void {
  if (this.isBatchMode) {
    const allApproved = this.batchSelectedLoans.every(l => l.status === 'APPROVED');
    if (!allApproved) return;
  }
  if (!this.selectedDisbursementLoan) return;
  
  if (!this.disbursementInstructionReference) {
    this.disbursementInstructionReference = this.generateDisbursementReference(this.selectedDisbursementLoan);
  }
  
  this.emailNotesError = false;
  this.isSendToAccountingModalVisible = true;
}

}
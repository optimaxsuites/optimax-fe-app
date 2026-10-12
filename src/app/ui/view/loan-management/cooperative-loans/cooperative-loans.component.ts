import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { Message } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import { CooperativeLoan } from '../../../../ui/domain/loan/cooperative-loan.dto';
import { CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';
import { CooperativeLoanGroup } from '../../../service/loan/cooperative-loan/cooperative.types';
import { compareLoanSortValues, formatLoanPurposeDisplay, resolveLoanActorName } from '../../../service/loan/loan-display.util';
import { EmployeeService } from '../../../service/employee.service';
import { MailNotificationService } from '../../../service/mailNotification.service';
import { getLoanStatusClass, getLoanStatusLabel } from '../../../service/loan/loan-format.util';

type CooperativeLoanAuditEntryView = {
  status: string;
  changedAt: string;
  changedBy: string;
  notes: string;
};

@Component({
  selector: 'app-cooperative-loans',
  templateUrl: './cooperative-loans.component.html',
  styleUrls: ['./cooperative-loans.component.scss']
})
export class CooperativeLoansComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

    formatMemberId(memberId: number | string | undefined): string {
      const idNum = Number(memberId);
      if (!idNum || isNaN(idNum)) return '';
      return `COP-${idNum.toString().padStart(3, '0')}`;
    }

    formatMembershipId(membershipId: number | string | undefined, groupCode?: string, memberId?: number | string): string {
      if (!membershipId || !groupCode || !memberId) return '';
      const alphaPart = groupCode.split('-')[0];
      return `${alphaPart}-${memberId}-${membershipId}`;
    }
  private readonly advanceStatusFilters = ['PENDING', 'APPROVED', 'READY_FOR_DISBURSEMENT', 'ACTIVE', 'SKIPPED', 'OVERDUE', 'PAUSED', 'COMPLETED', 'DEFAULTED', 'REJECTED'] as const;
  private isAdvanceStatusFilter(status: string | null): status is (typeof this.advanceStatusFilters)[number] {
    return !!status && this.advanceStatusFilters.includes(status as (typeof this.advanceStatusFilters)[number]);
  }
  readonly pageSize = 20;
  currentPage = 1;
  toStringId(id: string | number | undefined): string {
    return id !== undefined && id !== null ? String(id) : '';
  }
  getLoanIdDisplay(loan: CooperativeLoan): string {
    const code = loan.loanCode ? loan.loanCode : (loan.loanId ? loan.loanId.toString() : '');
    return code.length > 11 ? code.slice(0, 11) + '...' : code;
  }
  currentUuid = uuidV4();
  loans: CooperativeLoan[] = [];
  filteredLoans: CooperativeLoan[] = [];
  members: CooperativeMember[] = [];
  groups: CooperativeLoanGroup[] = [];
  isLoading = true;
  memberIdFilter: string | null = null;
  memberNameForTitle: string = '';
  isLoadingEmployeeDetails = false;
  isSubmittingDisbursement = false;
  disbursementViewMode = false;
  searchTerm = '';
  showDisbursementModal = false;
  selectedDisbursementLoanId = '';
  selectedEmployeeDetails: any = null;
  accountingEmail = '';
  emailNotes = '';
  disbursementInstructionReference = '';
  disbursementInitiatedAt = '';
  disbursementInitiatedBy = '';
  disbursementReference = '';
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'PAYROLL_DEDUCTION' = 'BANK_TRANSFER';
  messages: Message[] = [];
  disbursedDate = '';
  disbursementAmount = 0;
  disbursementRecipientType: 'BORROWER' | 'THIRD_PARTY' = 'BORROWER';
  thirdPartyName = '';
  checklistIdentityVerified = false;
  checklistAccountVerified = false;
  checklistComplianceCleared = false;
  checklistFundsReserved = false;
  statusFilter: '' | 'PENDING' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'ACTIVE' | 'SKIPPED' | 'OVERDUE' | 'PAUSED' | 'COMPLETED' | 'DEFAULTED' | 'REJECTED' = '';
  stageFilter: '' | 'READY_FOR_ADMIN_REVIEW' | 'PENDING_GUARANTOR_APPROVAL' | 'INFO_REQUESTED' = '';
  groupFilter = '';
  openDisbursementOnLoad = false;

  // Sorting
  sortField = 'applicationDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  statusOptions: Array<{ label: string; value: 'PENDING' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'ACTIVE' | 'SKIPPED' | 'OVERDUE' | 'PAUSED' | 'COMPLETED' | 'DEFAULTED' | 'REJECTED' }> = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Disbursable', value: 'READY_FOR_DISBURSEMENT' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Skipped', value: 'SKIPPED' },
    { label: 'Overdue', value: 'OVERDUE' },
    { label: 'Paused', value: 'PAUSED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Defaulted', value: 'DEFAULTED' },
    { label: 'Rejected', value: 'REJECTED' }
  ];

  constructor(
    private cooperativeService: CooperativeService,
    private employeeService: EmployeeService,
    private mailNotificationService: MailNotificationService,
    private backNavigationService: BackNavigationService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const routeUuid = this.route.snapshot.paramMap.get('uuid');
    if (routeUuid) {
      this.currentUuid = routeUuid;
    }

    const dedicatedDisbursementRoute = this.isDedicatedDisbursementRoute();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const status = params.get('status');
      if (this.isAdvanceStatusFilter(status)) {
        this.statusFilter = status;
      }
      this.disbursementViewMode = dedicatedDisbursementRoute || params.get('mode') === 'disburse';
      this.openDisbursementOnLoad = this.disbursementViewMode;
      const requestedLoanId = String(params.get('loanId') || '').trim();
      if (requestedLoanId) {
        this.selectedDisbursementLoanId = requestedLoanId;
      }
      const stage = params.get('stage');
      if (stage === 'READY_FOR_ADMIN_REVIEW' || stage === 'PENDING_GUARANTOR_APPROVAL' || stage === 'INFO_REQUESTED') {
        this.stageFilter = stage;
      }
      // Handle memberId filter
      this.memberIdFilter = params.get('memberId');
      this.updateMemberNameForTitle();
      this.applyFilters();
    });

    this.loadLoans();
  }

  private updateMemberNameForTitle(): void {
    if (this.memberIdFilter && this.members.length > 0) {
      this.memberNameForTitle = this.getMemberName(this.memberIdFilter);
    } else {
      this.memberNameForTitle = '';
    }
  }

  loadLoans(): void {
    this.isLoading = true;
    forkJoin({
      groups: this.cooperativeService.loadGroups(),
      members: this.cooperativeService.getMembers(),
      loans: this.cooperativeService.getLoans()
    }).subscribe(({ groups, members, loans }: { groups: CooperativeLoanGroup[]; members: CooperativeMember[]; loans: CooperativeLoan[] }) => {
      this.groups = groups;
      this.members = members;
      this.loans = loans;
      this.updateMemberNameForTitle();
      this.applyFilters();
      this.isLoading = false;

      if (this.disbursementViewMode) {
        this.initializeDisbursementWorkspace();
      } else if (this.openDisbursementOnLoad && this.approvedLoans.length > 0) {
        this.openDisbursementModal();
        this.openDisbursementOnLoad = false;
      }
    });
  }

  applyFilters(): void {
    let results = [...this.loans];

    // Filter by memberId if present
    if (this.memberIdFilter) {
      results = results.filter(loan => String(loan.memberId || loan.cooperativeMemberId) === String(this.memberIdFilter));
    }

    const search = this.searchTerm.trim().toLowerCase();
    if (search) {
      results = results.filter(loan => {
        const memberName = this.getMemberName(loan.cooperativeMemberId || loan.memberId).toLowerCase();
        const groupName = this.getGroupName(loan.groupId || loan.cooperativeGroupId).toLowerCase();
        return (
          loan.loanCode.toLowerCase().includes(search) ||
          memberName.includes(search) ||
          groupName.includes(search) ||
          loan.status.toLowerCase().includes(search) ||
          String(loan.purpose || '').toLowerCase().includes(search)
        );
      });
    }

    // Status filter
    if (this.statusFilter) {
      results = results.filter(loan => loan.status === this.statusFilter);
    }

    if (this.stageFilter) {
      results = results.filter(loan => loan.applicationStage === this.stageFilter);
    }

    if (this.groupFilter) {
      results = results.filter(loan => String(loan.groupId || loan.cooperativeGroupId || '') === this.groupFilter);
    }

    this.filteredLoans = this.sortData(results);
    this.resetPagination();
  }

  sortData(data: CooperativeLoan[]): CooperativeLoan[] {
    return data.sort((a, b) => {
      let valueA: any, valueB: any;
      const extractNum = (val: any) => {
        const str = String(val || '');
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };
      switch(this.sortField) {
        case 'loanCode':
        case 'loanId':
        case 'id':
          valueA = extractNum(a.loanCode || a.loanId || a.id);
          valueB = extractNum(b.loanCode || b.loanId || b.id);
          break;
        case 'amount':
          valueA = a.amount;
          valueB = b.amount;
          break;
        case 'status':
          valueA = a.status;
          valueB = b.status;
          break;
        case 'applicationDate':
          valueA = new Date(a.requestDate || a.applicationDate || 0).getTime();
          valueB = new Date(b.requestDate || b.applicationDate || 0).getTime();
          break;
        default:
          return 0;
      }
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return this.sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }
      const comparison = compareLoanSortValues(valueA, valueB);
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  setSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.stageFilter = '';
    this.groupFilter = '';
    this.sortField = 'applicationDate';
    this.sortDirection = 'desc';
    this.applyFilters();
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.searchTerm = input?.value || '';
    this.applyFilters();
  }

  refreshList(): void {
    this.loadLoans();
  }

  applyStatusFromCard(status: '' | 'PENDING' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'ACTIVE' | 'SKIPPED' | 'OVERDUE' | 'PAUSED' | 'COMPLETED' | 'DEFAULTED' | 'REJECTED'): void {
    this.setStatusFilter(status);
  }

  setStatusFilter(status: '' | 'PENDING' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'ACTIVE' | 'SKIPPED' | 'OVERDUE' | 'PAUSED' | 'COMPLETED' | 'DEFAULTED' | 'REJECTED'): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  setStageFilter(stage: '' | 'READY_FOR_ADMIN_REVIEW' | 'PENDING_GUARANTOR_APPROVAL' | 'INFO_REQUESTED'): void {
    this.stageFilter = stage;
    this.applyFilters();
  }

  viewLoan(id: string | number): void {
    this.router.navigate([`/admin/hr/cooperative/loans/${String(id)}/${this.currentUuid}`], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  openDisbursementModal(loanId?: string | number): void {
    this.router.navigate(['/admin/hr/cooperative/loan-disbursement', this.currentUuid], {
      queryParams: {
        dashboard: 'cooperative',
        loanId: loanId ? String(loanId) : null
      },
      queryParamsHandling: 'merge'
    });
  }

  exitDisbursementView(): void {
    if (this.isDedicatedDisbursementRoute()) {
      this.router.navigate(['/admin/hr/cooperative/loans', this.currentUuid], {
        queryParams: { dashboard: 'cooperative' }
      });
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: null, loanId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  closeDisbursementModal(): void {
    this.showDisbursementModal = false;
  }

  onDisbursementLoanChange(): void {
    this.syncDisbursementFields();
  }

  disburseSelectedLoan(): void {
    if (!this.canDisburseSelectedLoan || !this.selectedDisbursementLoan || this.isSubmittingDisbursement) {
      return;
    }

    this.isSubmittingDisbursement = true;
    const disbursementReference = String(this.disbursementReference || this.selectedDisbursementLoan.disbursementReference || '').trim()
      || `COOP-DISB-${this.selectedDisbursementLoan.id}-${Date.now()}`;

    this.cooperativeService.disburseLoan(Number(this.selectedDisbursementLoan.id), {
      disbursedAmount: Number(this.disbursementAmount || this.selectedDisbursementLoan.amount || 0),
      disbursementReference,
      paymentMethod: this.paymentMethod,
      notes: this.emailNotes?.trim() || 'Loan disbursement confirmed from cooperative queue.'
    }).subscribe((updated: CooperativeLoan | undefined) => {
      if (!updated) {
        this.messages = [{ severity: 'warn', summary: 'Disbursement Failed', detail: 'Only approved loans can be disbursed.' }];
        this.isSubmittingDisbursement = false;
        return;
      }

      this.messages = [{ severity: 'success', summary: 'Loan Disbursed', detail: `Loan ${updated.loanCode || updated.loanId || updated.id} has been marked as disbursed.` }];
      this.loadLoans();
      this.statusFilter = 'ACTIVE';
      this.applyFilters();
      this.isSubmittingDisbursement = false;
    });
  }

  sendToAccounting(): void {
    if (!this.selectedDisbursementLoan || !this.accountingEmail.trim() || this.isSubmittingDisbursement) {
      return;
    }

    const selectedLoan = this.selectedDisbursementLoan;
    const instructionReference = this.disbursementInstructionReference || this.generateDisbursementReference(selectedLoan);
    const accountingEmail = this.accountingEmail.trim();
    const memberName = this.getMemberName(selectedLoan.cooperativeMemberId || selectedLoan.memberId);

    this.isSubmittingDisbursement = true;
    this.mailNotificationService.sendMail(this.buildAccountingMailBody(accountingEmail, instructionReference)).subscribe({
      next: () => {
        this.cooperativeService.sendLoanToAccountingForDisbursement(Number(selectedLoan.id), {
          accountingEmail,
          disbursementInstructionReference: instructionReference,
          disbursementReference: this.disbursementReference || `PENDING-${instructionReference}`,
          paymentMethod: this.paymentMethod,
          notes: this.emailNotes?.trim() || undefined
        }).subscribe({
          next: (updatedLoan) => {
            if (!updatedLoan) {
              this.messages = [{ severity: 'warn', summary: 'Workflow Skipped', detail: 'Only approved cooperative loans can be sent to accounting.' }];
              this.isSubmittingDisbursement = false;
              return;
            }
            this.disbursementInitiatedAt = updatedLoan.disbursementInitiatedAt ? (typeof updatedLoan.disbursementInitiatedAt === 'string' ? updatedLoan.disbursementInitiatedAt : updatedLoan.disbursementInitiatedAt.toISOString()) : '';
            this.disbursementInitiatedBy = this.getAuditUserLabel(updatedLoan.disbursementInitiatedBy) || this.getCurrentUserDisplayName();
            this.disbursementInstructionReference = updatedLoan.disbursementInstructionLoanReference || instructionReference;
            this.disbursementReference = updatedLoan.disbursementReference || this.disbursementReference;
            this.messages = [{
              severity: 'success',
              summary: 'Sent to Accounting',
              detail: `${memberName}'s cooperative loan was sent to accounting for disbursement processing.`
            }];
            this.loadLoans();
            this.isSubmittingDisbursement = false;
          },
          error: () => {
            this.messages = [{ severity: 'error', summary: 'Update Failed', detail: 'The email was sent, but the loan workflow could not be updated.' }];
            this.isSubmittingDisbursement = false;
          }
        });
      },
      error: (err) => {
        // Suppress noisy logs, show user-friendly message
        let detail = `Unable to send the disbursement email to ${accountingEmail}.`;
        if (err && err.status === 403) {
          detail = 'Email notification failed due to authorization error. Please contact your administrator.';
        }
        this.messages = [{ severity: 'error', summary: 'Email Failed', detail }];
        this.isSubmittingDisbursement = false;
      }
    });
  }

  reviewLoan(id: string | number): void {
    this.router.navigate([`/admin/hr/cooperative/loans/${String(id)}/${this.currentUuid}`], {
      queryParams: { mode: 'review', dashboard: 'cooperative' }
    });
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
    return getLoanStatusClass(status);
  }

  getStatusLabel(status: string | undefined): string {
    return getLoanStatusLabel(status);
  }

  getLifecycleBadges(loan: CooperativeLoan): string[] {
    const badges: string[] = [];

    switch (loan.status) {
      case 'READY_FOR_DISBURSEMENT':
        badges.push('Accounting Queue');
        break;
      case 'SKIPPED':
        badges.push('Grace Shift');
        break;
      case 'OVERDUE':
        badges.push(`${loan.overduePaymentsCount || 1} Overdue`);
        break;
      case 'PAUSED':
        badges.push('Admin Hold');
        break;
      case 'DEFAULTED':
        badges.push('Escalated');
        break;
    }

    if (loan.applicationStage === 'PENDING_GUARANTOR_APPROVAL') {
      badges.push('Guarantor Queue');
    } else if (loan.applicationStage === 'INFO_REQUESTED') {
      badges.push('Info Requested');
    } else if (loan.status === 'APPROVED') {
      badges.push('Awaiting Accounting');
    }

    return badges.slice(0, 2);
  }

  getLatestAuditNote(loan: CooperativeLoan): string {
    const latestEntry = this.getLatestAuditEntry(loan);
    const note = String(latestEntry?.notes || loan.rejectionReason || loan.adminComment || '').trim();
    return note.length > 88 ? `${note.slice(0, 88)}...` : note;
  }

  getLatestAuditMeta(loan: CooperativeLoan): string {
    const latestEntry = this.getLatestAuditEntry(loan);
    if (!latestEntry) {
      return '';
    }

    return `${latestEntry.changedBy} · ${new Date(latestEntry.changedAt).toLocaleDateString()}`;
  }

  getStageDisplayLabel(stage: string | undefined): string {
    if (!stage) {
      return 'All Stages';
    }

    switch (stage) {
      case 'READY_FOR_ADMIN_REVIEW':
        return 'Ready for Admin Review';
      case 'PENDING_GUARANTOR_APPROVAL':
        return 'Pending Guarantor Approval';
      case 'INFO_REQUESTED':
        return 'Info Requested';
      default:
        return String(stage).replace(/_/g, ' ');
    }
  }

  getStageLabel(loan: CooperativeLoan): string {
    if (loan.status === 'READY_FOR_DISBURSEMENT') {
      return 'Disbursable';
    }

    if (loan.status === 'APPROVED') {
      return 'Awaiting Disbursement';
    }

    if (!loan.applicationStage) {
      return '-';
    }

    if (loan.applicationStage === 'READY_FOR_ADMIN_REVIEW') {
      return 'Ready For Admin Review';
    }

    if (loan.applicationStage === 'PENDING_GUARANTOR_APPROVAL') {
      return 'Pending Guarantor Approval';
    }

    if (loan.applicationStage === 'INFO_REQUESTED') {
      return 'Info Requested';
    }

    return 'Under Admin Review';
  }

  getMemberName(memberId: string | number | undefined): string {
    return this.cooperativeService.getMemberDisplayName(memberId);
  }

  getGroupName(groupId: string | number | undefined): string {
    if (groupId === undefined || groupId === null || groupId === '') {
      return 'Ungrouped';
    }

    const normalizedGroupId = String(groupId);
    const group = this.groups.find(item => String(item.id) === normalizedGroupId);
    return group?.name || 'Unknown Group';
  }

  getRelativeDate(dateValue: string): string {
    const now = Date.now();
    const timestamp = new Date(dateValue).getTime();
    const diffMs = Math.max(0, now - timestamp);
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (days < 1) {
      return 'today';
    }

    if (days < 30) {
      return `${days}d ago`;
    }

    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }

  get pendingCount(): number {
    return this.loans.filter(l => l.status === 'PENDING').length;
  }

  get approvedCount(): number {
    return this.loans.filter(l => l.status === 'APPROVED').length;
  }

  get readyForDisbursementCount(): number {
    return this.loans.filter(l => l.status === 'READY_FOR_DISBURSEMENT').length;
  }

  get activeCount(): number {
    return this.loans.filter(l => l.status === 'ACTIVE').length;
  }

  get skippedCount(): number {
    return this.loans.filter(l => l.status === 'SKIPPED').length;
  }

  get overdueCount(): number {
    return this.loans.filter(l => l.status === 'OVERDUE').length;
  }

  get pausedCount(): number {
    return this.loans.filter(l => l.status === 'PAUSED').length;
  }

  get completedCount(): number {
    return this.loans.filter(l => l.status === 'COMPLETED').length;
  }

  get defaultedCount(): number {
    return this.loans.filter(l => l.status === 'DEFAULTED').length;
  }

  get rejectedCount(): number {
    return this.loans.filter(l => l.status === 'REJECTED').length;
  }

  get readyForReviewCount(): number {
    return this.loans.filter(l => l.status === 'PENDING' && l.applicationStage === 'READY_FOR_ADMIN_REVIEW').length;
  }

  get totalPortfolio(): number {
    return this.loans
      .filter(l => l.status === 'ACTIVE')
      .reduce((sum, l) => sum + l.amount, 0);
  }

  get statusCounts(): { pending: number; approved: number; readyForDisbursement: number; active: number; skipped: number; overdue: number; paused: number; completed: number; defaulted: number; rejected: number; total: number } {
    return {
      pending: this.pendingCount,
      approved: this.approvedCount,
      readyForDisbursement: this.readyForDisbursementCount,
      active: this.activeCount,
      skipped: this.skippedCount,
      overdue: this.overdueCount,
      paused: this.pausedCount,
      completed: this.completedCount,
      defaulted: this.defaultedCount,
      rejected: this.rejectedCount,
      total: this.loans.length
    };
  }

  get stageCounts(): { readyForReview: number; pendingGuarantorApproval: number; infoRequested: number; awaitingDisbursement: number } {
    return {
      readyForReview: this.loans.filter((loan) => loan.status === 'PENDING' && loan.applicationStage === 'READY_FOR_ADMIN_REVIEW').length,
      pendingGuarantorApproval: this.loans.filter((loan) => loan.applicationStage === 'PENDING_GUARANTOR_APPROVAL').length,
      infoRequested: this.loans.filter((loan) => loan.applicationStage === 'INFO_REQUESTED').length,
      awaitingDisbursement: this.readyForDisbursementCount
    };
  }

  get overviewCards(): Array<{ label: string; value: number; status: '' | 'PENDING' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'ACTIVE' | 'SKIPPED' | 'OVERDUE' | 'PAUSED' | 'COMPLETED' | 'DEFAULTED' | 'REJECTED'; icon: string; tone: string; note: string }> {
    return [
      { label: 'Pending', value: this.statusCounts.pending, status: 'PENDING', icon: 'fa-hourglass-half', tone: 'pending', note: 'Applications waiting in queue' },
      { label: 'Approved', value: this.statusCounts.approved, status: 'APPROVED', icon: 'fa-check-circle', tone: 'approved', note: 'Approved cooperative loans' },
      { label: 'Ready To Disburse', value: this.statusCounts.readyForDisbursement, status: 'READY_FOR_DISBURSEMENT', icon: 'fa-hand-holding-dollar', tone: 'ready', note: 'Cleared for fund release' },
      { label: 'Active', value: this.statusCounts.active, status: 'ACTIVE', icon: 'fa-wallet', tone: 'active', note: 'Loans currently in repayment' },
      { label: 'Skipped', value: this.statusCounts.skipped, status: 'SKIPPED', icon: 'fa-forward', tone: 'skipped', note: 'Grace-approved schedule shifts' },
      { label: 'Overdue', value: this.statusCounts.overdue, status: 'OVERDUE', icon: 'fa-triangle-exclamation', tone: 'overdue', note: 'Repayments past grace days' },
      { label: 'Paused', value: this.statusCounts.paused, status: 'PAUSED', icon: 'fa-circle-pause', tone: 'paused', note: 'Admin-suspended repayments' },
      { label: 'Defaulted', value: this.statusCounts.defaulted, status: 'DEFAULTED', icon: 'fa-shield-halved', tone: 'defaulted', note: 'Repayments needing escalation' },
      { label: 'Total Applications', value: this.statusCounts.total, status: '', icon: 'fa-file-invoice', tone: 'total', note: `${this.statusCounts.completed} completed · ${this.statusCounts.rejected} rejected` }
    ];
  }

  get secondaryOverviewCards(): Array<{ label: string; value: number; stage: '' | 'READY_FOR_ADMIN_REVIEW' | 'PENDING_GUARANTOR_APPROVAL' | 'INFO_REQUESTED'; tone: string; note: string }> {
    return [
      { label: 'Ready For Review', value: this.stageCounts.readyForReview, stage: 'READY_FOR_ADMIN_REVIEW', tone: 'ready-review', note: 'Admin-ready applications' },
      { label: 'Guarantor Queue', value: this.stageCounts.pendingGuarantorApproval, stage: 'PENDING_GUARANTOR_APPROVAL', tone: 'guarantor', note: 'Waiting on guarantor action' },
      { label: 'Info Requested', value: this.stageCounts.infoRequested, stage: 'INFO_REQUESTED', tone: 'info-requested', note: 'Members asked for updates' }
    ];
  }

  applyStageFromCard(stage: '' | 'READY_FOR_ADMIN_REVIEW' | 'PENDING_GUARANTOR_APPROVAL' | 'INFO_REQUESTED'): void {
    this.stageFilter = stage;
    this.applyFilters();
  }

  handleSecondaryCardClick(card: { stage: '' | 'READY_FOR_ADMIN_REVIEW' | 'PENDING_GUARANTOR_APPROVAL' | 'INFO_REQUESTED'; tone: string }): void {
    this.applyStageFromCard(card.stage);
  }

  get paginatedLoans(): CooperativeLoan[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredLoans.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLoans.length / this.pageSize));
  }

  get paginationStart(): number {
    return this.filteredLoans.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredLoans.length);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
  }

  get groupOptions(): CooperativeLoanGroup[] {
    const groupIdsInLoans = new Set(
      this.loans
        .map(loan => String(loan.groupId || loan.cooperativeGroupId || ''))
        .filter(Boolean)
    );

    return this.groups
      .filter(group => groupIdsInLoans.has(String(group.id)))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  get approvedLoans(): CooperativeLoan[] {
    return this.loans
      .filter(item => item.status === 'APPROVED')
      .sort((a, b) => new Date(b.approvedDate || b.requestDate || b.applicationDate || 0).getTime() - new Date(a.approvedDate || a.requestDate || a.applicationDate || 0).getTime());
  }

  get readyForDisbursementLoans(): CooperativeLoan[] {
    return this.loans
      .filter(item => item.status === 'READY_FOR_DISBURSEMENT' || (item.status === 'APPROVED' && (item.applicationStage === 'READY_FOR_DISBURSEMENT' || !!item.disbursementInitiatedAt)))
      .sort((a, b) => new Date(b.disbursementInitiatedAt || b.approvedDate || b.requestDate || b.applicationDate || 0).getTime() - new Date(a.disbursementInitiatedAt || a.approvedDate || a.requestDate || a.applicationDate || 0).getTime());
  }

  get selectedDisbursementLoan(): CooperativeLoan | undefined {
    return [...this.readyForDisbursementLoans, ...this.approvedLoans].find(item => String(item.id) === this.selectedDisbursementLoanId);
  }

  get selectedDisbursementGroup(): CooperativeLoanGroup | undefined {
    return this.getSelectedDisbursementGroup();
  }

  get canSendToAccounting(): boolean {
    return !!this.selectedDisbursementLoan && !!this.accountingEmail.trim() && !this.isSubmittingDisbursement;
  }

  get canMarkSelectedAsDisbursed(): boolean {
    return !!this.selectedDisbursementLoan
      && this.selectedDisbursementLoan.status === 'READY_FOR_DISBURSEMENT'
      && this.canDisburseSelectedLoan
      && !this.isSubmittingDisbursement;
  }

  get canDisburseSelectedLoan(): boolean {
    if (!this.selectedDisbursementLoanId || !this.selectedDisbursementLoan) {
      return false;
    }

    if (this.disbursementRecipientType === 'THIRD_PARTY' && !this.thirdPartyName.trim()) {
      return false;
    }

    return (
      this.checklistIdentityVerified &&
      this.checklistAccountVerified &&
      this.checklistComplianceCleared &&
      this.checklistFundsReserved
    );
  }

  getDisbursementMemberName(): string {
    if (!this.selectedDisbursementLoan) {
      return '-';
    }

    return this.getMemberName(this.selectedDisbursementLoan.cooperativeMemberId || this.selectedDisbursementLoan.memberId);
  }

  private syncDisbursementFields(): void {
    const loan = this.selectedDisbursementLoan;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    this.disbursedDate = `${yyyy}-${mm}-${dd}`;
    this.disbursementAmount = Number(loan?.amount || 0);
    this.accountingEmail = this.getSelectedDisbursementGroup()?.accountingEmail || this.accountingEmail || '';
    this.disbursementInstructionReference = loan?.disbursementInstructionLoanReference || this.generateDisbursementReference(loan);
    this.disbursementInitiatedAt = loan?.disbursementInitiatedAt ? (typeof loan.disbursementInitiatedAt === 'string' ? loan.disbursementInitiatedAt : loan.disbursementInitiatedAt.toISOString()) : '';
    this.disbursementInitiatedBy = this.getAuditUserLabel(loan?.disbursementInitiatedBy) || '';
    this.disbursementReference = loan?.disbursementReference || '';
    this.loadSelectedEmployeeDetails();
  }

  private initializeDisbursementWorkspace(): void {
    const preferredLoanId = this.selectedDisbursementLoanId && [...this.readyForDisbursementLoans, ...this.approvedLoans].some((loan) => String(loan.id) === this.selectedDisbursementLoanId)
      ? this.selectedDisbursementLoanId
      : String(this.readyForDisbursementLoans[0]?.id || this.approvedLoans[0]?.id || '');

    if (!preferredLoanId) {
      this.selectedDisbursementLoanId = '';
      return;
    }

    this.selectedDisbursementLoanId = preferredLoanId;
    this.syncDisbursementFields();
  }

  selectDisbursementLoan(loan: CooperativeLoan): void {
    this.selectedDisbursementLoanId = String(loan.id);
    this.syncDisbursementFields();
  }

  private loadSelectedEmployeeDetails(): void {
    const selectedLoan = this.selectedDisbursementLoan;
    const selectedMember = selectedLoan ? this.members.find((member) => member.id === (selectedLoan.cooperativeMemberId || selectedLoan.memberId) || member.memberId === (selectedLoan.cooperativeMemberId || selectedLoan.memberId)) : undefined;
    const employeeId = Number(selectedMember?.employeeId || 0);

    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      this.selectedEmployeeDetails = null;
      return;
    }

    this.isLoadingEmployeeDetails = true;
    this.employeeService.getEmployeeById(employeeId).subscribe({
      next: (employee) => {
        this.selectedEmployeeDetails = employee;
        this.isLoadingEmployeeDetails = false;
      },
      error: () => {
        this.selectedEmployeeDetails = null;
        this.isLoadingEmployeeDetails = false;
      }
    });
  }

  private getSelectedDisbursementGroup(): CooperativeLoanGroup | undefined {
    const selectedLoan = this.selectedDisbursementLoan;
    return selectedLoan ? this.groups.find((group) => group.id === (selectedLoan.groupId || selectedLoan.cooperativeGroupId)) : undefined;
  }

  private buildAccountingMailBody(accountingEmail: string, instructionReference: string): { name: string; recieverEmail: string; subject: string; body: string } {
    const loan = this.selectedDisbursementLoan;
    const group = this.getSelectedDisbursementGroup();
    const memberName = loan ? this.getMemberName(loan.cooperativeMemberId || loan.memberId) : 'Member';
    const employeeEmail = this.selectedEmployeeDetails?.email || this.selectedEmployeeDetails?.workEmail || 'N/A';
    const bankName = this.selectedEmployeeDetails?.bankName || loan?.memberBankName || 'N/A';
    const accountNumber = this.selectedEmployeeDetails?.accountNumber || loan?.memberAccountNumber || 'N/A';
    const loanId = loan?.loanCode || loan?.loanId || loan?.id || '';

    return {
      name: 'Accounting Team',
      recieverEmail: accountingEmail,
      subject: `Cooperative Loan Disbursement Request - ${loanId}`,
      body: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">
          <p>Dear Accounting Team,</p>
          <p>A cooperative loan has been approved and is disbursable.</p>
          <ul>
            <li><strong>Loan ID:</strong> ${loanId}</li>
            <li><strong>Member:</strong> ${memberName}</li>
            <li><strong>Member ID:</strong> ${loan?.memberId || loan?.cooperativeMemberId || 'N/A'}</li>
            <li><strong>Membership ID:</strong> ${loan?.membershipId || 'N/A'}</li>
            <li><strong>Member Email:</strong> ${employeeEmail}</li>
            <li><strong>Group:</strong> ${group?.name || 'Unknown Group'}</li>
            <li><strong>Group Code:</strong> ${group?.code || 'N/A'}</li>
            <li><strong>Group ID:</strong> ${group?.id || 'N/A'}</li>
            <li><strong>Approved Amount:</strong> ${this.formatCurrency(Number(loan?.amount || 0))}</li>
            <li><strong>Interest Rate:</strong> ${group?.interestRate || loan?.interestRate || 0}%</li>
            <li><strong>Repayment Period:</strong> ${loan?.duration || loan?.repaymentTime || 0} months</li>
            <li><strong>Purpose:</strong> ${this.formatPurposeDisplay(loan?.purpose)}</li>
            <li><strong>Bank Name:</strong> ${bankName}</li>
            <li><strong>Account Number:</strong> ${accountNumber}</li>
            <li><strong>Group Funding Bank:</strong> ${group?.principalBankName || 'N/A'}</li>
            <li><strong>Group Funding Account:</strong> ${group?.principalCollectionAccount || 'N/A'}</li>
            <li><strong>Accounting Email:</strong> ${accountingEmail}</li>
            <li><strong>Disbursement Instruction Reference:</strong> ${instructionReference}</li>
            <li><strong>Disbursement Reference:</strong> ${this.disbursementReference || `PENDING-${instructionReference}`}</li>
          </ul>
          ${this.emailNotes?.trim() ? `<p><strong>Additional Notes:</strong> ${this.emailNotes.trim()}</p>` : ''}
          <p>Regards,<br/><strong>HR Management</strong></p>
        </div>
      `
    };
  }

  private isDedicatedDisbursementRoute(): boolean {
    return String(this.route.snapshot.routeConfig?.path || '').includes('cooperative/loan-disbursement');
  }

  private generateDisbursementReference(loan?: CooperativeLoan): string {
    const loanPrefix = String(loan?.loanCode || loan?.loanId || loan?.id || 'COOP').replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase();
    return `COOP-DISB-${loanPrefix}-${Date.now().toString().slice(-6)}`;
  }

  private getAuditUserLabel(value: number | object | undefined): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'object' && value !== null) {
      return String((value as { fullname?: string; username?: string }).fullname || (value as { username?: string }).username || '').trim();
    }

    return this.getCurrentUserDisplayName();
  }

  private getCurrentUserDisplayName(): string {
    return String(sessionStorage.getItem('fullname') || sessionStorage.getItem('username') || 'Admin').trim();
  }

  private getLatestAuditEntry(loan: CooperativeLoan): CooperativeLoanAuditEntryView | null {
    const latestHistory = [...(loan.statusHistory || [])]
      .filter((entry) => !!entry?.changedAt)
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())[0];

    if (!latestHistory) {
      return null;
    }

    return {
      status: String(latestHistory.status || loan.status || ''),
      changedAt: latestHistory.changedAt,
      changedBy: this.formatHistoryActor(latestHistory.changedBy),
      notes: String(latestHistory.notes || '')
    };
  }

  private formatHistoryActor(value: unknown): string {
    return resolveLoanActorName(value as any);
  }

  private resetPagination(): void {
    this.currentPage = 1;
  }
}
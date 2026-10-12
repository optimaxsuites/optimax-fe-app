// Type definitions for approval table rows and messages
type ApprovalMessage = {
  severity: 'success' | 'error';
  summary: string;
  detail: string;
};

interface CooperativeApprovalRow {
  loan: CooperativeLoan;
  loanCode: string;
  memberName: string;
  memberId: string;
  membershipId: string;
  groupName: string;
  amount: number;
  purposeDisplay: string;
  groupInterestRate: string;
  groupLateFeeDisplay: string;
  totalRepayable: number;
  stageLabel: string;
  statusClass: string;
  statusLabel: string;
  appliedOn: string;
}

import { CommonModule, Location } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, Subscription, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeMember, CooperativeLoanGroup, CooperativeGroupMembership } from '../../../service/loan/cooperative-loan/cooperative.types';
import { RepaymentDayHelperService } from '../../../service/loan/repayment-day-helper.service';
import { compareLoanSortValues, formatLoanPurposeDisplay } from '../../../service/loan/loan-display.util';
import { resolveCooperativeTotalRepayable } from '../../../service/loan/cooperative-loan/cooperative-loan-amounts.util';
import { BackButtonModule } from '../../../shared-component/view/back-button/back-button.module';
import { startLoanLoadProfiler } from '../../../service/loan/loan-load-profiler.util';

@Component({
  selector: 'app-cooperative-loan-approval-ui',
  standalone: true,
  imports: [CommonModule, FormsModule, BackButtonModule],
  templateUrl: './cooperative-loan-approval-ui.component.html',
  styleUrls: ['./cooperative-loan-approval-ui.component.scss'],
  encapsulation: ViewEncapsulation.None

})
export class CooperativeLoanApprovalUiComponent implements OnInit, OnDestroy {
  // ==================== TABLE CONFIGURATION ====================
  approvalTableColumns = [
    { header: 'Loan ID', field: 'loanCode', sortable: true, className: 'loan-id-cell' },
    { header: 'Member', field: 'memberName', sortable: true },
    { header: 'Member ID', field: 'memberId' },
    { header: 'Membership ID', field: 'membershipId' },
    { header: 'Group', field: 'groupName', sortable: true, className: 'group-cell' },
    { header: 'Amount', field: 'amount', sortable: true, className: 'amount-cell', formatter: (row: any) => this.formatCurrency(row.amount) },
    { header: 'Duration', field: 'duration', formatter: (row: any) => `${row.loan.repaymentTime || row.loan.duration || '—'} mo.` },
    { header: 'Purpose', field: 'purposeDisplay' },
    { header: 'Interest Rate', field: 'groupInterestRate' },
    { header: 'Total Repayable', field: 'totalRepayable', className: 'amount-cell', formatter: (row: any) => this.formatCurrency(row.totalRepayable) },
    { header: 'Status', field: 'statusLabel', sortable: true },
    { header: 'Applied On', field: 'appliedOn', sortable: true, formatter: (row: any) => row.appliedOn ? (new Date(row.appliedOn)).toLocaleDateString() : '' },
  ];

  approvalTableActions = [
    {
      id: 'view',
      label: '',
      icon: 'fas fa-eye',
      ariaLabel: 'View Details',
      className: 'btn-view',
    },
    {
      id: 'approve',
      label: '',
      icon: 'fas fa-check',
      ariaLabel: 'Approve',
      className: 'btn-approve',
      visible: (row: any) => row.loan.status === 'PENDING',
    },
    {
      id: 'reject',
      label: '',
      icon: 'fas fa-times',
      ariaLabel: 'Reject',
      className: 'btn-reject',
      visible: (row: any) => row.loan.status === 'PENDING' || row.loan.status === 'APPROVED',
    },
  ];

  // ==================== PROPERTIES ====================
  readonly pageSize = 10;
  currentUuid = '';
  currentPage = 1;
  searchTerm = '';
  sortField = 'applicationDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  filters = {
    groupId: '',
    status: '',
    stage: '',
    dateFrom: '',
    dateTo: '',
    minAmount: null as number | null,
    maxAmount: null as number | null
  };

  loans: CooperativeLoan[] = [];
  members: CooperativeMember[] = [];
  groups: CooperativeLoanGroup[] = [];
  memberships: CooperativeGroupMembership[] = [];
  filteredLoans: CooperativeLoan[] = [];
  filteredLoanRows: CooperativeApprovalRow[] = [];
  
  isLoading = true;
  isSubmitting = false;
  messages: ApprovalMessage[] = [];
  
  currentMember: CooperativeMember | undefined;
  
  // Lookup maps for performance
  private readonly memberLookup = new Map<number, CooperativeMember>();
  private readonly groupLookup = new Map<number, CooperativeLoanGroup>();
  private readonly membershipLookup = new Map<string, CooperativeGroupMembership>();
  
  // Approval modal
  showApprovalModal = false;
  selectedLoanForApproval: CooperativeLoan | null = null;
  approvalRepaymentDay = 15;
  approvalRepaymentStartDate = '';
  approvalAdminComment = '';
  availableRepaymentDays: number[] = [];
  repaymentDayWarning = '';

  // Reject modal
  showRejectModal = false;
  selectedLoanForRejection: CooperativeLoan | null = null;
  rejectionReason = '';
  
  // Search debounce
  private readonly searchTermChanges = new Subject<string>();
  private readonly subscriptions = new Subscription();

  // ==================== CONSTRUCTOR ====================
  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private cooperativeService: CooperativeService,
    private repaymentDayHelper: RepaymentDayHelperService
  ) {}

  // ==================== LIFECYCLE HOOKS ====================
  ngOnInit(): void {
    this.currentUuid = this.route.snapshot.paramMap.get('uuid') || '';
    this.subscriptions.add(
      this.searchTermChanges.pipe(debounceTime(250), distinctUntilChanged()).subscribe(() => this.applyFilters())
    );
    this.setDefaultRepaymentStartDate();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ==================== DATA LOADING ====================
  loadData(): void {
    const loadProfiler = startLoanLoadProfiler('cooperative-loan-approval');
    this.isLoading = true;
    
    // Each source falls back to empty on failure so one broken endpoint (e.g. members 500) doesn't hide the loans.
    const orEmpty = <T>(source: Observable<T[]>, label: string): Observable<T[]> => source.pipe(
      catchError((error) => {
        console.error(`[CooperativeLoanApproval] Failed to load ${label}:`, error);
        return of([] as T[]);
      })
    );

    forkJoin({
      groups: orEmpty(this.cooperativeService.loadGroups(), 'groups'),
      members: orEmpty(this.cooperativeService.getMembers(), 'members'),
      loans: orEmpty(this.cooperativeService.refreshLoans(), 'loans'),
      memberships: orEmpty(this.cooperativeService.loadGroupMemberships(), 'memberships')
    }).subscribe({
      next: ({ groups, members, loans, memberships }) => {
        this.groups = groups;
        this.members = members;
        this.loans = loans;
        this.memberships = memberships;
        this.currentMember = this.cooperativeService.resolveCurrentSessionMember(members);
        this.rebuildLookups();
        this.applyFilters();
        loadProfiler.success({ loans: this.loans.length, filtered: this.filteredLoans.length });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.isLoading = false;
        loadProfiler.error({ message: 'Failed to load cooperative loan approval data' });
        this.showError('Failed to load loan applications. Please try again.');
      }
    });
  }

  private rebuildLookups(): void {
    // Clear existing maps
    this.memberLookup.clear();
    this.groupLookup.clear();
    this.membershipLookup.clear();

    // Build member lookup using ALL possible ID fields to prevent API calls
    this.members.forEach((member) => {
      // Store by internal id
      if (member.id && member.id > 0) {
        this.memberLookup.set(member.id, member);
      }
      // Store by cooperative memberId
      if (member.memberId && member.memberId > 0) {
        this.memberLookup.set(member.memberId, member);
      }
      // Store by employeeId
      if (member.employeeId && member.employeeId > 0) {
        this.memberLookup.set(member.employeeId, member);
      }
    });

    // Build group lookup
    this.groups.forEach((group) => {
      this.groupLookup.set(group.id, group);
    });

    // Build membership lookup
    this.memberships.forEach((membership) => {
      const key = `${membership.memberId}|${membership.groupId}`;
      this.membershipLookup.set(key, membership);
    });
  }

  // ==================== SAFE HELPER METHODS (NO API CALLS) ====================
  
  /**
   * SAFE VERSION - Only uses local cache, never triggers API calls
   * This prevents the 401 error when member is not found
   */
  private safeGetMemberForLoan(loan: CooperativeLoan): CooperativeMember | undefined {
    const id = loan.cooperativeMemberId;
    if (id !== null && id !== undefined && Number(id) > 0) {
      // Only return if exists in local lookup - don't trigger API calls
      return this.memberLookup.get(Number(id));
    }
    return undefined;
  }

  /**
   * SAFE VERSION - Only uses local cache for membership lookup
   */
  private safeGetMembershipForLoan(loan: CooperativeLoan): CooperativeGroupMembership | undefined {
    const directMembershipId = Number(loan.membershipId || 0);
    if (directMembershipId > 0) {
      const byId = this.memberships.find((membership) => Number(membership.id) === directMembershipId);
      if (byId) {
        return byId;
      }
    }

    const member = this.safeGetMemberForLoan(loan);
    const groupId = Number(loan.cooperativeGroupId || loan.groupId || 0);
    const candidateMemberIds = [
      Number(loan.cooperativeMemberId || 0),
      Number(loan.memberId || 0),
      Number(member?.id || 0),
      Number(member?.memberId || 0)
    ].filter((value) => value > 0);

    if (!groupId || candidateMemberIds.length === 0) {
      return undefined;
    }

    return this.memberships.find((membership) =>
      Number(membership.groupId) === groupId
      && candidateMemberIds.includes(Number(membership.memberId))
    );
  }

  // ==================== HELPER METHODS ====================
  setDefaultRepaymentStartDate(): void {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    this.approvalRepaymentStartDate = d.toISOString().split('T')[0];
    this.onRepaymentStartDateChange(this.approvalRepaymentStartDate);
  }

  // MODIFIED: Use safe method to prevent API calls
  getMemberForLoan(loan: CooperativeLoan): CooperativeMember | undefined {
    return this.safeGetMemberForLoan(loan);
  }

  getMemberIdForLoan(loan: CooperativeLoan): number | undefined {
    return Number(loan.cooperativeMemberId || loan.memberId || 0) || undefined;
  }

  getGroupForLoan(loan: CooperativeLoan): CooperativeLoanGroup | undefined {
    const groupId = loan.cooperativeGroupId || loan.groupId;
    if (!groupId) return undefined;
    return this.groupLookup.get(Number(groupId));
  }

  // MODIFIED: Use safe method to prevent API calls
  getMembershipForLoan(loan: CooperativeLoan): CooperativeGroupMembership | undefined {
    return this.safeGetMembershipForLoan(loan);
  }

  // MODIFIED: Returns fallback text instead of triggering API calls
  getMemberName(loan: CooperativeLoan): string {
    const member = this.safeGetMemberForLoan(loan);
    if (member?.fullName) {
      return member.fullName;
    }
    // Return a placeholder instead of triggering API call
    const id = loan.cooperativeMemberId;
    return id ? `Member ${id}` : 'Unknown Member';
  }

  getMemberIdentifier(loan: CooperativeLoan): string {
    const memberId = this.getMemberIdForLoan(loan);
    if (!memberId) return '';
    return `COP-${String(memberId).padStart(3, '0')}`;
  }

  getMembershipId(loan: CooperativeLoan): string {
    const membership = this.safeGetMembershipForLoan(loan);
    const group = this.getGroupForLoan(loan);
    const memberId = this.getMemberIdForLoan(loan);
    
    if (!membership?.membershipId || !group?.code || !memberId) return '';
    
    const alphaPart = group.code.split('-')[0];
    return `${alphaPart}-${memberId}-${membership.membershipId}`;
  }

  getGroupName(loan: CooperativeLoan): string {
    return this.getGroupForLoan(loan)?.name || `Group #${loan.cooperativeGroupId || loan.groupId || '?'}`;
  }

  getGroupCode(loan: CooperativeLoan): string {
    return this.getGroupForLoan(loan)?.code || '—';
  }

  getGroupId(loan: CooperativeLoan): number | string {
    return this.getGroupForLoan(loan)?.id || loan.cooperativeGroupId || loan.groupId || '—';
  }

  getLoanCode(loan: CooperativeLoan): string {
    const raw = String(loan.loanCode || loan.loanId || loan.id || '');
    return raw.length > 14 ? raw.slice(0, 14) + '…' : raw;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  getGroupInterestRate(loan: CooperativeLoan): string {
    const group = this.getGroupForLoan(loan);
    if (!group || group.interestRate == null) return '—';
    return `${Number(group.interestRate)}%`;
  }

  getGroupLateFeeDisplay(loan: CooperativeLoan): string {
    const group = this.getGroupForLoan(loan);
    if (!group) return '—';
    const pct = Number(group.lateFeePercentage || 0).toFixed(2);
    const days = Math.round(Number(group.lateFeeGraceDays || 0));
    return `${pct}% / ${days}d grace`;
  }

  getTotalRepayable(loan: CooperativeLoan): number {
    return resolveCooperativeTotalRepayable(loan, this.getGroupForLoan(loan)?.interestRate);
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return 'status-pending';
    const normalized = String(status).trim().toUpperCase().replace(/\s+/g, '_');
    const statusClassMap: Record<string, string> = {
      'PENDING': 'status-pending',
      'APPROVED': 'status-approved',
      'READY_FOR_DISBURSEMENT': 'status-ready_for_disbursement',
      'ACTIVE': 'status-active',
      'COMPLETED': 'status-completed',
      'REJECTED': 'status-rejected',
      'OVERDUE': 'status-overdue',
      'DEFAULTED': 'status-defaulted',
      'PAUSED': 'status-paused',
      'SKIPPED': 'status-skipped'
    };
    return statusClassMap[normalized] || 'status-pending';
  }

  getStatusLabel(status: string | undefined): string {
    const map: Record<string, string> = {
      'PENDING': 'Pending',
      'APPROVED': 'Approved',
      'READY_FOR_DISBURSEMENT': 'Disbursable',
      'ACTIVE': 'Active',
      'COMPLETED': 'Completed',
      'REJECTED': 'Rejected',
      'OVERDUE': 'Overdue',
      'DEFAULTED': 'Defaulted',
      'PAUSED': 'Paused',
      'SKIPPED': 'Skipped'
    };
    const key = (status || '').toUpperCase();
    if (map[key]) return map[key];
    // Convert any unmapped status to Title Case
    return String(status || '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  getStageLabel(stage: string | undefined): string {
    const map: Record<string, string> = {
      PENDING_GUARANTOR_APPROVAL: 'Awaiting Guarantors',
      READY_FOR_ADMIN_REVIEW: 'Ready for Review',
      UNDER_ADMIN_REVIEW: 'Under Review',
      INFO_REQUESTED: 'Info Requested'
    };
    return map[stage || ''] || '';
  }

  getMinRepaymentDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }

  // ==================== STATS CARDS ====================
  get pendingCount(): number {
    return this.loans.filter(l => l.status === 'PENDING' || l.applicationStage === 'READY_FOR_ADMIN_REVIEW').length;
  }

  get approvedCount(): number {
    return this.loans.filter(l => l.status === 'APPROVED').length;
  }

  get activeCount(): number {
    return this.loans.filter(l => l.status === 'ACTIVE').length;
  }

  get totalActiveLoanBalance(): number {
    return this.loans
      .filter((loan) => loan.status === 'ACTIVE')
      .reduce((sum, loan) => sum + Number(
        loan.outstandingBalance ||
        loan.outstandingPrincipal ||
        Math.max(Number(loan.totalRepayment || loan.totalRepayable || 0) - Number(loan.totalPaid || 0), 0)
      ), 0);
  }

  get rejectedCount(): number {
    return this.loans.filter(l => l.status === 'REJECTED').length;
  }

  get completedCount(): number {
    return this.loans.filter(l => l.status === 'COMPLETED').length;
  }

  get skippedCount(): number {
    return this.filteredLoans.filter(l => l.status === 'SKIPPED').length;
  }

  get overdueCount(): number {
    return this.filteredLoans.filter(l => l.status === 'OVERDUE').length;
  }

  get pausedCount(): number {
    return this.filteredLoans.filter(l => l.status === 'PAUSED').length;
  }

  get defaultedCount(): number {
    return this.filteredLoans.filter(l => l.status === 'DEFAULTED').length;
  }

  get totalLoanAmount(): number {
    return this.loans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  }

  // ==================== FILTERING & SORTING ====================
  applyFilters(): void {
    let result = [...this.loans];

    // Filter by group
    if (this.filters.groupId) {
      result = result.filter(l => String(l.cooperativeGroupId || l.groupId || '') === this.filters.groupId);
    }

    // Filter by status
    if (this.filters.status) {
      const filterStatus = String(this.filters.status).trim().toUpperCase().replace(/\s+/g, '_');
      result = result.filter(l => {
        const loanStatus = String(l.status).trim().toUpperCase().replace(/\s+/g, '_');
        return loanStatus === filterStatus;
      });
    }

    // Filter by application stage
    if (this.filters.stage) {
      result = result.filter(l => (l.applicationStage || '').toUpperCase() === this.filters.stage.toUpperCase());
    }

    // Filter by date from
    if (this.filters.dateFrom) {
      const from = new Date(this.filters.dateFrom).getTime();
      result = result.filter(l => new Date(l.applicationDate || l.requestDate || '').getTime() >= from);
    }

    // Filter by date to
    if (this.filters.dateTo) {
      const to = new Date(this.filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(l => new Date(l.applicationDate || l.requestDate || '').getTime() <= to.getTime());
    }

    // Filter by min amount
    if (this.filters.minAmount !== null) {
      result = result.filter(l => Number(l.amount || 0) >= this.filters.minAmount!);
    }

    // Filter by max amount
    if (this.filters.maxAmount !== null) {
      result = result.filter(l => Number(l.amount || 0) <= this.filters.maxAmount!);
    }

    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(l =>
        this.getMemberName(l).toLowerCase().includes(term) ||
        this.getGroupName(l).toLowerCase().includes(term) ||
        String(l.loanCode || l.loanId || l.id || '').toLowerCase().includes(term)
      );
    }

    this.filteredLoans = this.sortData(result);
    this.filteredLoanRows = this.filteredLoans.map((loan) => this.buildApprovalRow(loan));
    this.resetPagination();
  }

  private buildApprovalRow(loan: CooperativeLoan): CooperativeApprovalRow {
    return {
      loan,
      loanCode: this.getLoanCode(loan),
      memberName: this.getMemberName(loan),
      memberId: this.getMemberIdentifier(loan),
      membershipId: this.getMembershipId(loan),
      groupName: this.getGroupName(loan),
      amount: Number(loan.amount || 0),
      purposeDisplay: this.formatPurposeDisplay(loan.purpose),
      groupInterestRate: this.getGroupInterestRate(loan),
      groupLateFeeDisplay: this.getGroupLateFeeDisplay(loan),
      totalRepayable: this.getTotalRepayable(loan),
      stageLabel: this.getStageLabel(loan.applicationStage),
      statusClass: this.getStatusClass(loan.status),
      statusLabel: this.getStatusLabel(loan.status),
      appliedOn: loan.applicationDate || loan.requestDate || ''
    };
  }

  onSearchTermChange(value: string): void {
    this.searchTerm = value;
    this.searchTermChanges.next(value);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filters = { 
      groupId: '', 
      status: '', 
      stage: '', 
      dateFrom: '', 
      dateTo: '', 
      minAmount: null, 
      maxAmount: null 
    };
    this.sortField = 'applicationDate';
    this.sortDirection = 'desc';
    this.applyFilters();
  }

  applyStatusFromCard(status: string): void {
    this.filters.status = this.filters.status === status ? '' : status;
    this.applyFilters();
  }

  sortData(data: CooperativeLoan[]): CooperativeLoan[] {
    return [...data].sort((a, b) => {
      let vA: string | number = '';
      let vB: string | number = '';
      const extractNum = (val: any) => {
        const str = String(val || '');
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };
      switch (this.sortField) {
        case 'loanCode':
        case 'loanId':
        case 'id':
          vA = extractNum(a.loanCode || a.loanId || a.id);
          vB = extractNum(b.loanCode || b.loanId || b.id);
          break;
        case 'applicationDate':
          vA = new Date(a.applicationDate || a.requestDate || '').getTime();
          vB = new Date(b.applicationDate || b.requestDate || '').getTime();
          break;
        case 'amount':
          vA = Number(a.amount || 0);
          vB = Number(b.amount || 0);
          break;
        case 'memberName':
          vA = this.getMemberName(a).toLowerCase();
          vB = this.getMemberName(b).toLowerCase();
          break;
        case 'groupName':
          vA = this.getGroupName(a).toLowerCase();
          vB = this.getGroupName(b).toLowerCase();
          break;
        case 'status':
          vA = (a.status || '').toLowerCase();
          vB = (b.status || '').toLowerCase();
          break;
        default:
          return 0;
      }
      const cmp = typeof vA === 'number' && typeof vB === 'number'
        ? (this.sortDirection === 'asc' ? vA - vB : vB - vA)
        : compareLoanSortValues(vA, vB) * (this.sortDirection === 'asc' ? 1 : -1);
      return cmp;
    });
  }

  setSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = field === 'applicationDate' ? 'desc' : 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  // ==================== PAGINATION ====================
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLoans.length / this.pageSize));
  }

  get paginationStart(): number {
    return this.filteredLoans.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredLoans.length);
  }

  get paginatedLoans(): CooperativeApprovalRow[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredLoanRows.slice(startIndex, startIndex + this.pageSize);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
  }

  private resetPagination(): void {
    this.currentPage = 1;
  }

  // ==================== ACTIONS ====================
  handleTableAction(event: { actionId: string; row: any }): void {
    const { actionId, row } = event;
    switch (actionId) {
      case 'view':
        this.viewLoanDetail(row.loan);
        break;
      case 'approve':
        this.openApprovalModal(row.loan);
        break;
      case 'reject':
        this.openRejectModal(row.loan);
        break;
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/loan', this.currentUuid || 'uu'], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  viewLoanDetail(loan: CooperativeLoan): void {
    const uuid = this.currentUuid || this.route.snapshot.paramMap.get('uuid') || '';
    this.router.navigate(['/admin/hr/cooperative/loans', loan.id, uuid], {
      queryParams: { dashboard: 'cooperative', mode: 'review' }
    });
  }

  openCooperativeLoanHistory(loanOrMemberId: CooperativeLoan | number): void {
    let memberId: number | undefined;
    if (typeof loanOrMemberId === 'number') {
      memberId = loanOrMemberId;
    } else if (loanOrMemberId && typeof loanOrMemberId === 'object') {
      memberId = this.getMemberIdForLoan(loanOrMemberId);
    }
    if (!memberId) {
      this.showError('Member ID not found');
      return;
    }
    this.router.navigate(['/admin/hr/loan-management/cooperative-member-loan-history', memberId, this.currentUuid], {
      state: { source: 'admin', cooperative: true, uuid: this.currentUuid }
    });
  }

  // ==================== APPROVAL FLOW ====================
  openApprovalModal(loan: CooperativeLoan): void {
    this.selectedLoanForApproval = loan;
    this.approvalAdminComment = '';
    this.setDefaultRepaymentStartDate();
    this.approvalRepaymentStartDate = loan.repaymentStartDate || this.approvalRepaymentStartDate;
    this.approvalRepaymentDay = Number(loan.repaymentDay || 0);
    this.onRepaymentStartDateChange(this.approvalRepaymentStartDate);
    this.showApprovalModal = true;
  }

  closeApprovalModal(): void {
    this.showApprovalModal = false;
    this.selectedLoanForApproval = null;
    this.availableRepaymentDays = [];
    this.repaymentDayWarning = '';
  }

  submitApproval(): void {
    if (!this.selectedLoanForApproval) return;
    
    if (!this.approvalRepaymentStartDate) {
      this.showError('Please set a repayment start date.');
      return;
    }
    
    if (this.repaymentDayWarning) {
      this.showError(this.repaymentDayWarning);
      return;
    }

    this.isSubmitting = true;
    const loanId = this.selectedLoanForApproval.id;
    const options = {
      repaymentDay: this.approvalRepaymentDay,
      repaymentStartDate: this.approvalRepaymentStartDate,
      adminComment: this.approvalAdminComment.trim() || undefined
    };

    this.cooperativeService.approveLoanWithTerms(loanId, options).subscribe({
      next: (updated) => {
        if (updated) {
          this.isSubmitting = false;
          const idx = this.loans.findIndex(l => l.id === loanId);
          if (idx !== -1) this.loans[idx] = updated;
          this.applyFilters();
          this.showSuccess(`Loan ${this.getLoanCode(updated)} approved successfully.`);
          this.closeApprovalModal();
          return;
        }

        this.cooperativeService.loadLoanById(loanId).subscribe({
          next: (freshLoan) => {
            this.isSubmitting = false;
            if (freshLoan) {
              const idx = this.loans.findIndex(l => l.id === loanId);
              if (idx !== -1) this.loans[idx] = freshLoan;
              this.applyFilters();

              if (freshLoan.status === 'APPROVED') {
                this.showSuccess(`Loan ${this.getLoanCode(freshLoan)} is already approved. The list has been refreshed.`);
              } else {
                this.showError('Only pending loans can be approved.');
              }
            } else {
              this.showError('Only pending loans can be approved.');
            }
            this.closeApprovalModal();
          },
          error: () => {
            this.isSubmitting = false;
            this.showError('Only pending loans can be approved.');
            this.closeApprovalModal();
          }
        });
      },
      error: (error) => {
        console.error('Approval error:', error);
        this.isSubmitting = false;
        this.showError('Failed to approve loan. Please try again.');
      }
    });
  }

  // ==================== REJECTION FLOW ====================
  openRejectModal(loan: CooperativeLoan): void {
    this.selectedLoanForRejection = loan;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedLoanForRejection = null;
  }

  confirmRejection(): void {
    if (!this.selectedLoanForRejection) return;
    
    if (!this.rejectionReason.trim()) {
      this.showError('Please provide a rejection reason.');
      return;
    }

    this.isSubmitting = true;
    const loanId = this.selectedLoanForRejection.id;
    const reason = this.rejectionReason.trim();

    this.cooperativeService.rejectLoan(loanId, reason).subscribe({
      next: (updated) => {
        if (updated) {
          this.isSubmitting = false;
          const idx = this.loans.findIndex(l => l.id === loanId);
          if (idx !== -1) this.loans[idx] = updated;
          this.applyFilters();
          this.showSuccess(`Loan ${this.getLoanCode(updated)} rejected.`);
          this.closeRejectModal();
          return;
        }

        this.cooperativeService.loadLoanById(loanId).subscribe({
          next: (freshLoan) => {
            this.isSubmitting = false;
            if (freshLoan) {
              const idx = this.loans.findIndex(l => l.id === loanId);
              if (idx !== -1) this.loans[idx] = freshLoan;
              this.applyFilters();

              if (freshLoan.status === 'REJECTED') {
                this.showSuccess(`Loan ${this.getLoanCode(freshLoan)} is already rejected. The list has been refreshed.`);
              } else {
                this.showError('Failed to reject loan.');
              }
            } else {
              this.showError('Failed to reject loan.');
            }
            this.closeRejectModal();
          },
          error: () => {
            this.isSubmitting = false;
            this.showError('Failed to reject loan.');
            this.closeRejectModal();
          }
        });
      },
      error: (error) => {
        console.error('Rejection error:', error);
        this.isSubmitting = false;
        this.showError('Failed to reject loan. Please try again.');
      }
    });
  }

  // ==================== REPAYMENT DATE HELPERS ====================
  onRepaymentStartDateChange(dateStr: string): void {
    if (!dateStr) {
      this.availableRepaymentDays = [];
      this.repaymentDayWarning = '';
      return;
    }

    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    this.availableRepaymentDays = this.repaymentDayHelper.getValidRepaymentDays(year, month);
    const suggestedDay = this.repaymentDayHelper.suggestRepaymentDay(date);
    this.approvalRepaymentDay = suggestedDay;
    this.repaymentDayWarning = this.getRepaymentDayWarning();
  }

  getRepaymentDayWarning(): string {
    if (!this.approvalRepaymentStartDate) return '';
    
    const date = new Date(this.approvalRepaymentStartDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    
    if (!this.repaymentDayHelper.validateRepaymentDay(this.approvalRepaymentDay, year, month)) {
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      return `Selected repayment day is not valid for ${monthYear}.`;
    }
    
    return '';
  }

  getRepaymentDaySuggestion(): string {
    if (!this.approvalRepaymentStartDate) return '';
    
    const date = new Date(this.approvalRepaymentStartDate);
    const suggestedDay = this.repaymentDayHelper.suggestRepaymentDay(date);
    const monthYear = date.toLocaleDateString('en-NG', {
      month: 'long',
      year: 'numeric'
    });
    
    return `Repayments will follow the ${suggestedDay}${this.getDayOrdinal(suggestedDay)} of each month based on the selected start date in ${monthYear}.`;
  }

  getDayOrdinal(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  // ==================== MESSAGE HANDLERS ====================
  private showSuccess(detail: string): void {
    this.messages = [{ severity: 'success', summary: 'Success', detail }];
    setTimeout(() => { this.messages = []; }, 5000);
  }

  private showError(detail: string): void {
    this.messages = [{ severity: 'error', summary: 'Error', detail }];
    setTimeout(() => { this.messages = []; }, 7000);
  }
}
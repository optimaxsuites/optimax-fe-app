import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeMember, CooperativeLoanGroup } from '../../../service/loan/cooperative-loan/cooperative.types';
import { RepaymentDayHelperService } from '../../../service/loan/repayment-day-helper.service';
import { compareLoanSortValues, formatLoanPurposeDisplay } from '../../../service/loan/loan-display.util';

type ApprovalMessage = {
  severity: 'success' | 'error';
  summary: string;
  detail: string;
};

@Component({
  selector: 'app-cooperative-loan-approval-ui',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cooperative-loan-approval-ui.component.html',
  styleUrls: ['./cooperative-loan-approval-ui.component.scss']
})
export class CooperativeLoanApprovalUiComponent implements OnInit {
  readonly pageSize = 20;
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
  filteredLoans: CooperativeLoan[] = [];
  isLoading = true;
  isSubmitting = false;
  messages: ApprovalMessage[] = [];

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

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private cooperativeService: CooperativeService,
    private repaymentDayHelper: RepaymentDayHelperService
  ) {}

  ngOnInit(): void {
    this.currentUuid = this.route.snapshot.paramMap.get('uuid') || '';
    this.setDefaultRepaymentStartDate();
    this.loadData();
  }

  // ── Data loading ──────────────────────────────────────────────

  loadData(): void {
    this.isLoading = true;
    forkJoin({
      groups: this.cooperativeService.loadGroups(),
      members: this.cooperativeService.getMembers(),
      loans: this.cooperativeService.getLoans()
    }).subscribe({
      next: ({ groups, members, loans }) => {
        this.groups = groups;
        this.members = members;
        this.loans = loans;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.showError('Failed to load loan applications. Please try again.');
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────

  setDefaultRepaymentStartDate(): void {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    this.approvalRepaymentStartDate = d.toISOString().split('T')[0];
    this.onRepaymentStartDateChange(this.approvalRepaymentStartDate);
  }

  getMemberForLoan(loan: CooperativeLoan): CooperativeMember | undefined {
    const mid = loan.cooperativeMemberId || loan.memberId || 0;
    return this.members.find(m => m.id === mid || m.memberId === mid || m.employeeId === mid);
  }

  getGroupForLoan(loan: CooperativeLoan): CooperativeLoanGroup | undefined {
    const gid = loan.cooperativeGroupId || loan.groupId || 0;
    return this.groups.find(g => g.id === gid);
  }

  getMemberName(loan: CooperativeLoan): string {
    return this.getMemberForLoan(loan)?.fullName || `Member #${loan.cooperativeMemberId || loan.memberId}`;
  }

  getGroupName(loan: CooperativeLoan): string {
    return this.getGroupForLoan(loan)?.name || `Group #${loan.cooperativeGroupId || loan.groupId}`;
  }

  getGroupCode(loan: CooperativeLoan): string {
    return this.getGroupForLoan(loan)?.code || '—';
  }

  getGroupId(loan: CooperativeLoan): number | string {
    return this.getGroupForLoan(loan)?.id || loan.cooperativeGroupId || loan.groupId || '—';
  }

  getMemberIdentifier(loan: CooperativeLoan): number | string {
    const member = this.getMemberForLoan(loan);
    return member?.memberId || loan.cooperativeMemberId || loan.memberId || '—';
  }

  getMembershipId(loan: CooperativeLoan): number | string {
    return loan.membershipId || '—';
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
    const g = this.getGroupForLoan(loan);
    return g ? `${Number(g.interestRate || 0).toFixed(2)}%` : '—';
  }

  getGroupLateFeeDisplay(loan: CooperativeLoan): string {
    const g = this.getGroupForLoan(loan);
    if (!g) return '—';
    const pct = Number(g.lateFeePercentage || 0).toFixed(2);
    const days = Math.round(Number(g.lateFeeGraceDays || 0));
    return `${pct}% / ${days}d grace`;
  }

  getTotalRepayable(loan: CooperativeLoan): number {
    if (loan.totalRepayable) return Number(loan.totalRepayable);
    const amount = Number(loan.amount || 0);
    const group = this.getGroupForLoan(loan);
    const rate = Number(group?.interestRate || 0) / 100;
    const months = Number(loan.repaymentTime || loan.duration || 1);
    return amount + (amount * rate * months);
  }

  getStatusClass(status: string | undefined): string {
    const map: Record<string, string> = {
      PENDING: 'status-pending',
      APPROVED: 'status-approved',
      READY_FOR_DISBURSEMENT: 'status-ready',
      ACTIVE: 'status-active',
      COMPLETED: 'status-completed',
      REJECTED: 'status-rejected',
      OVERDUE: 'status-overdue',
      DEFAULTED: 'status-defaulted',
      PAUSED: 'status-paused',
      SKIPPED: 'status-skipped'
    };
    return map[status || ''] || 'status-pending';
  }

  getStatusLabel(status: string | undefined): string {
    const map: Record<string, string> = {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      READY_FOR_DISBURSEMENT: 'Ready for Disbursement',
      ACTIVE: 'Active',
      COMPLETED: 'Completed',
      REJECTED: 'Rejected',
      OVERDUE: 'Overdue',
      DEFAULTED: 'Defaulted',
      PAUSED: 'Paused',
      SKIPPED: 'Skipped'
    };
    return map[status || ''] || String(status || '');
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

  // ── Stats cards ───────────────────────────────────────────────

  get pendingCount(): number {
    return this.loans.filter(l => l.status === 'PENDING' || l.applicationStage === 'READY_FOR_ADMIN_REVIEW').length;
  }

  get approvedCount(): number {
    return this.loans.filter(l => l.status === 'APPROVED').length;
  }

  get activeCount(): number {
    return this.loans.filter(l => l.status === 'ACTIVE').length;
  }

  get rejectedCount(): number {
    return this.loans.filter(l => l.status === 'REJECTED').length;
  }

  get completedCount(): number {
    return this.loans.filter(l => l.status === 'COMPLETED').length;
  }

  get totalLoanAmount(): number {
    return this.loans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  }

  // ── Filtering & sorting ───────────────────────────────────────

  applyFilters(): void {
    let result = [...this.loans];

    if (this.filters.groupId) {
      result = result.filter(l => String(l.cooperativeGroupId || l.groupId || '') === this.filters.groupId);
    }

    if (this.filters.status) {
      result = result.filter(l => l.status === this.filters.status);
    }

    if (this.filters.stage) {
      result = result.filter(l => l.applicationStage === this.filters.stage);
    }

    if (this.filters.dateFrom) {
      const from = new Date(this.filters.dateFrom).getTime();
      result = result.filter(l => new Date(l.applicationDate || l.requestDate || '').getTime() >= from);
    }

    if (this.filters.dateTo) {
      const to = new Date(this.filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(l => new Date(l.applicationDate || l.requestDate || '').getTime() <= to.getTime());
    }

    if (this.filters.minAmount !== null) {
      result = result.filter(l => Number(l.amount || 0) >= this.filters.minAmount!);
    }

    if (this.filters.maxAmount !== null) {
      result = result.filter(l => Number(l.amount || 0) <= this.filters.maxAmount!);
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(l =>
        this.getMemberName(l).toLowerCase().includes(term) ||
        this.getGroupName(l).toLowerCase().includes(term) ||
        String(l.loanCode || l.loanId || l.id || '').toLowerCase().includes(term)
      );
    }

    this.filteredLoans = this.sortData(result);
    this.resetPagination();
  }

  onSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filters = { groupId: '', status: '', stage: '', dateFrom: '', dateTo: '', minAmount: null, maxAmount: null };
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
      switch (this.sortField) {
        case 'loanCode':
          vA = String(a.loanCode || a.loanId || a.id || '').toLowerCase();
          vB = String(b.loanCode || b.loanId || b.id || '').toLowerCase();
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
      const cmp = compareLoanSortValues(vA, vB);
      return this.sortDirection === 'asc' ? cmp : -cmp;
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

  // ── Pagination ────────────────────────────────────────────────

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLoans.length / this.pageSize));
  }

  get paginationStart(): number {
    return this.filteredLoans.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredLoans.length);
  }

  get paginatedLoans(): CooperativeLoan[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredLoans.slice(start, start + this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  private resetPagination(): void {
    this.currentPage = 1;
  }

  // ── Navigation ────────────────────────────────────────────────

  goBack(): void {
    if (this.currentUuid) {
      this.router.navigate(['/admin/hr/cooperative/dashboard', this.currentUuid], {
        queryParams: { dashboard: 'cooperative' }
      });
      return;
    }
    this.location.back();
  }

  viewLoanDetail(loan: CooperativeLoan): void {
    const uuid = this.currentUuid || this.route.snapshot.paramMap.get('uuid') || '';
    this.router.navigate(['/admin/hr/cooperative/loans', loan.id, uuid], {
      queryParams: { dashboard: 'cooperative', mode: 'review' }
    });
  }

  // ── Approval flow ─────────────────────────────────────────────

  openApprovalModal(loan: CooperativeLoan): void {
    this.selectedLoanForApproval = loan;
    this.approvalAdminComment = '';
    this.setDefaultRepaymentStartDate();
    this.approvalRepaymentDay = Number(loan.repaymentDay || 15);
    this.approvalRepaymentStartDate = loan.repaymentStartDate || this.approvalRepaymentStartDate;
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
        this.isSubmitting = false;
        if (updated) {
          const idx = this.loans.findIndex(l => l.id === loanId);
          if (idx !== -1) this.loans[idx] = updated;
          this.applyFilters();
          this.showSuccess(`Loan ${this.getLoanCode(updated)} approved successfully.`);
        }
        this.closeApprovalModal();
      },
      error: () => {
        this.isSubmitting = false;
        this.showError('Failed to approve loan. Please try again.');
      }
    });
  }

  // ── Rejection flow ────────────────────────────────────────────

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
        this.isSubmitting = false;
        if (updated) {
          const idx = this.loans.findIndex(l => l.id === loanId);
          if (idx !== -1) this.loans[idx] = updated;
          this.applyFilters();
          this.showSuccess(`Loan ${this.getLoanCode(updated)} rejected.`);
        }
        this.closeRejectModal();
      },
      error: () => {
        this.isSubmitting = false;
        this.showError('Failed to reject loan. Please try again.');
      }
    });
  }

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
    if (!this.approvalRepaymentDay || !this.availableRepaymentDays.includes(this.approvalRepaymentDay)) {
      this.approvalRepaymentDay = suggestedDay;
    }

    this.repaymentDayWarning = this.getRepaymentDayWarning();
  }

  getRepaymentDayWarning(): string {
    if (!this.approvalRepaymentStartDate) {
      return '';
    }

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
    if (!this.approvalRepaymentStartDate) {
      return '';
    }

    const date = new Date(this.approvalRepaymentStartDate);
    const suggestedDay = this.repaymentDayHelper.suggestRepaymentDay(date);
    const monthYear = date.toLocaleDateString('en-NG', {
      month: 'long',
      year: 'numeric'
    });

    return `Suggestion: use ${suggestedDay}${this.getDayOrdinal(suggestedDay)} so repayments stay aligned from ${monthYear}.`;
  }

  getDayOrdinal(day: number): string {
    if (day > 3 && day < 21) {
      return 'th';
    }

    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }

  // ── Messages ──────────────────────────────────────────────────

  private showSuccess(detail: string): void {
    this.messages = [{ severity: 'success', summary: 'Success', detail }];
    setTimeout(() => { this.messages = []; }, 5000);
  }

  private showError(detail: string): void {
    this.messages = [{ severity: 'error', summary: 'Error', detail }];
    setTimeout(() => { this.messages = []; }, 7000);
  }
}

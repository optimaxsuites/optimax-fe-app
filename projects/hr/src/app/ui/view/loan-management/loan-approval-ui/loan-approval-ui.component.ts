import { Component, OnDestroy, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanApprovalService } from '../../../service/loan/loan-approval.service';
import { RepaymentDayHelperService } from '../../../service/loan/repayment-day-helper.service';
import { startLoanLoadProfiler } from '../../../service/loan/loan-load-profiler.util';
import {
  compareLoanSortValues,
  formatLoanDepartmentDisplay,
  formatLoanPurposeDisplay,
  resolveLoanTotalRepayableAmount
} from '../../../service/loan/loan-display.util';

interface LoanApprovalRow {
  loan: LoanApplication;
  loanCode: string | number;
  fullName: string;
  employeeId: string | number;
  departmentDisplay: string;
  purposeDisplay: string;
  overduePolicySummary: string;
  totalRepayable: number;
  statusClass: string;
  statusLabel: string;
}

@Component({
  selector: 'app-loan-approval-ui',
  templateUrl: './loan-approval-ui.component.html',
  styleUrls: ['./loan-approval-ui.component.scss']
})
export class LoanApprovalUiComponent implements OnInit, OnDestroy {
  readonly pageSize = 20;
  currentPage = 1;
  searchTerm: string = '';
  sortField: string = 'requestDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  filters = {
    employeeId: '',
    department: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    minAmount: null as number | null,
    maxAmount: null as number | null
  };

  loanApplications: LoanApplication[] = [];
  filteredLoans: LoanApplication[] = [];
  filteredLoanRows: LoanApprovalRow[] = [];
  isLoading = true;
  messages: Message[] = [];

  // Approval modal properties
  showApprovalModal = false;
  selectedLoanForApproval: LoanApplication | null = null;
  proposedInterestRate: number = 0;
  proposedLateFeePercentage: number = 2;
  proposedLateFeeGracePeriodDays: number = 15;
  proposedRepaymentDay: number = 15;
  approvalNotes: string = '';
  repaymentStartDate: string = '';
  availableRepaymentDays: number[] = [];
  repaymentDayWarning: string = '';

  // Reject modal properties
  showRejectModal = false;
  selectedLoanForRejection: LoanApplication | null = null;
  rejectionReason: string = '';
  private readonly searchTermChanges = new Subject<string>();
  private readonly subscriptions = new Subscription();

  constructor(
    private location: Location,
    private router: Router,
    private loanApplicationService: LoanApplicationService,
    private loanApprovalService: LoanApprovalService,
    private repaymentDayHelper: RepaymentDayHelperService
  ) {}

  ngOnInit() {
    this.subscriptions.add(
      this.searchTermChanges.pipe(debounceTime(250), distinctUntilChanged()).subscribe(() => this.applyFilters())
    );
    this.loadApplications();
    this.setDefaultRepaymentStartDate();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  setDefaultRepaymentStartDate(): void {
    const today = new Date();
    today.setMonth(today.getMonth() + 1);
    this.repaymentStartDate = today.toISOString().split('T')[0];
    this.onRepaymentStartDateChange(this.repaymentStartDate);
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

  formatDepartmentDisplay(department?: unknown): string {
    return formatLoanDepartmentDisplay(department);
  }

  getLateFeePercentageDisplay(loan: LoanApplication): string {
    return `${Number(loan.lateFeePercentage ?? 2).toFixed(2)}%`;
  }

  getLateFeeGracePeriodDisplay(loan: LoanApplication): string {
    const graceDays = Math.round(Number(loan.lateFeeGracePeriodDays ?? 15));
    return `${graceDays} day${graceDays === 1 ? '' : 's'}`;
  }

  getOverduePolicySummary(loan: LoanApplication): string {
    return `${this.getLateFeePercentageDisplay(loan)} after ${this.getLateFeeGracePeriodDisplay(loan)} grace`;
  }

  getLoanTotalRepayable(loan: LoanApplication): number {
    return resolveLoanTotalRepayableAmount(loan);
  }

  openLoanDetails(loan: LoanApplication): void {
    this.viewLoanDetails(loan.id, uuidV4());
  }

  loadApplications(): void {
    const loadProfiler = startLoanLoadProfiler('advance-loan-approval');
    this.isLoading = true;
    this.loanApplicationService.getAllApplications().subscribe({
      next: (applications) => {
        this.loanApplications = applications.map((loan) => ({
          ...loan,
          department: this.formatDepartmentDisplay(loan.department)
        }));
        this.applyFilters();
        loadProfiler.success({ loans: this.loanApplications.length, filtered: this.filteredLoans.length });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading applications:', error);
        loadProfiler.error({ message: 'Failed to load advance loan approval data' });
        this.isLoading = false;
      }
    });
  }

  applyFilters() {
    let results = [...this.loanApplications];

    if (this.filters.employeeId) {
      const term = this.filters.employeeId.toLowerCase();
      results = results.filter(loan =>
        String(loan.employeeId).toLowerCase().includes(term)
      );
    }

    if (this.filters.department) {
      const term = this.filters.department.toLowerCase();
      results = results.filter(loan =>
        this.formatDepartmentDisplay(loan.department).toLowerCase().includes(term)
      );
    }

    if (this.filters.status) {
      const term = this.filters.status.toUpperCase();
      results = results.filter(loan =>
        loan.status.toUpperCase() === term
      );
    }

    if (this.filters.dateFrom) {
      const fromDate = new Date(this.filters.dateFrom).getTime();
      results = results.filter((loan) => new Date(loan.requestDate).getTime() >= fromDate);
    }

    if (this.filters.dateTo) {
      const toDate = new Date(this.filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      results = results.filter((loan) => new Date(loan.requestDate).getTime() <= toDate.getTime());
    }

    if (this.filters.minAmount !== null) {
      results = results.filter(loan => loan.amount >= this.filters.minAmount!);
    }

    if (this.filters.maxAmount !== null) {
      results = results.filter(loan => loan.amount <= this.filters.maxAmount!);
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      results = results.filter(loan =>
        (loan.fullName ?? '').toLowerCase().includes(term) ||
        String(loan.employeeId).toLowerCase().includes(term)
      );
    }

    this.filteredLoans = this.sortData(results);
    this.filteredLoanRows = this.filteredLoans.map((loan) => this.buildLoanApprovalRow(loan));
    this.resetPagination();
  }

  private buildLoanApprovalRow(loan: LoanApplication): LoanApprovalRow {
    return {
      loan,
      loanCode: loan.loanCode || loan.id,
      fullName: loan.fullName || 'N/A',
      employeeId: loan.employeeId || 'N/A',
      departmentDisplay: this.formatDepartmentDisplay(loan.department),
      purposeDisplay: this.formatPurposeDisplay(loan.purpose),
      overduePolicySummary: this.getOverduePolicySummary(loan),
      totalRepayable: this.getLoanTotalRepayable(loan),
      statusClass: this.getStatusClass(loan.status),
      statusLabel: this.getStatusLabel(loan.status)
    };
  }

  onSearchTermChange(value: string) {
    this.searchTerm = value;
    this.searchTermChanges.next(value);
  }

  resetFilters() {
    this.searchTerm = '';
    this.filters = {
      employeeId: '',
      department: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      minAmount: null,
      maxAmount: null
    };
    this.sortField = 'requestDate';
    this.sortDirection = 'desc';
    this.applyFilters();
  }

  applyStatusFromCard(status: string): void {
    const allowedStatuses = new Set([
      '',
      'PENDING',
      'AWAITING_INTEREST_ACCEPTANCE',
      'APPROVED',
      'READY_FOR_DISBURSEMENT',
      'ACTIVE',
      'SKIPPED',
      'OVERDUE',
      'PAUSED',
      'DEFAULTED',
      'REJECTED',
      'COMPLETED'
    ]);

    this.filters.status = allowedStatuses.has(status) ? status : '';
    this.applyFilters();
  }

  sortData(data: LoanApplication[]): LoanApplication[] {
    return [...data].sort((a, b) => {
      let valueA: string | number = '';
      let valueB: string | number = '';

      switch (this.sortField) {
        case 'loanId':
          valueA = String(a.loanCode || a.id).toLowerCase();
          valueB = String(b.loanCode || b.id).toLowerCase();
          break;
        case 'requestDate':
          valueA = new Date(a.requestDate).getTime();
          valueB = new Date(b.requestDate).getTime();
          break;
        case 'amount':
          valueA = a.amount;
          valueB = b.amount;
          break;
        case 'interestRate':
          valueA = a.interestRate || 0;
          valueB = b.interestRate || 0;
          break;
        case 'totalRepayable':
          valueA = this.getLoanTotalRepayable(a);
          valueB = this.getLoanTotalRepayable(b);
          break;
        case 'employeeId':
          valueA = String(a.employeeId).toLowerCase();
          valueB = String(b.employeeId).toLowerCase();
          break;
        case 'fullName':
          valueA = (a.fullName ?? '').toLowerCase();
          valueB = (b.fullName ?? '').toLowerCase();
          break;
        case 'department':
          valueA = this.formatDepartmentDisplay(a.department).toLowerCase();
          valueB = this.formatDepartmentDisplay(b.department).toLowerCase();
          break;
        case 'purpose':
          valueA = this.formatPurposeDisplay(a.purpose).toLowerCase();
          valueB = this.formatPurposeDisplay(b.purpose).toLowerCase();
          break;
        case 'status':
          valueA = (a.status ?? '').toLowerCase();
          valueB = (b.status ?? '').toLowerCase();
          break;
        default:
          return 0;
      }

      const comparison = compareLoanSortValues(valueA, valueB);
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  setSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = field === 'requestDate' ? 'desc' : 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'fa-sort';
    }
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  getStatusClass(status: string | undefined): string {
  switch (status) {
    case 'PENDING': return 'status-pending';
    case 'AWAITING_INTEREST_ACCEPTANCE': return 'status-awaiting_interest_acceptance';
    case 'APPROVED': return 'status-approved';
    case 'READY_FOR_DISBURSEMENT': return 'status-ready_for_disbursement';
    case 'ACTIVE': return 'status-active';
    case 'REJECTED': return 'status-rejected';
    case 'COMPLETED': return 'status-completed';
    case 'SKIPPED': return 'status-skipped';
    case 'OVERDUE': return 'status-overdue';
    case 'DEFAULTED': return 'status-defaulted';
    case 'PAUSED': return 'status-paused';
    default: return 'status-default';
  }
}

  getStatusLabel(status: string | undefined): string {
    switch (status) {
      case 'AWAITING_INTEREST_ACCEPTANCE':
        return 'AWAITING INTEREST ACCEPTANCE';
      case 'READY_FOR_DISBURSEMENT':
        return 'READY FOR DISBURSEMENT';
      default:
        return String(status || '').replace(/_/g, ' ');
    }
  }

  get statusCounts() {
    return {
      pending: this.loanApplications.filter(loan => loan.status === 'PENDING').length,
      awaitingInterestAcceptance: this.loanApplications.filter(loan => loan.status === 'AWAITING_INTEREST_ACCEPTANCE').length,
      approved: this.loanApplications.filter(loan => loan.status === 'APPROVED').length,
      readyForDisbursement: this.loanApplications.filter(loan => loan.status === 'READY_FOR_DISBURSEMENT').length,
      rejected: this.loanApplications.filter(loan => loan.status === 'REJECTED').length,
      active: this.loanApplications.filter(loan => loan.status === 'ACTIVE').length,
      skipped: this.loanApplications.filter(loan => loan.status === 'SKIPPED').length,
      overdue: this.loanApplications.filter(loan => loan.status === 'OVERDUE').length,
      paused: this.loanApplications.filter(loan => loan.status === 'PAUSED').length,
      defaulted: this.loanApplications.filter(loan => loan.status === 'DEFAULTED').length,
      completed: this.loanApplications.filter(loan => loan.status === 'COMPLETED').length,
      total: this.loanApplications.length
    };
  }

  get overviewCards(): Array<{ label: string; value: number; status: '' | 'PENDING' | 'AWAITING_INTEREST_ACCEPTANCE' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'ACTIVE' | 'SKIPPED' | 'OVERDUE' | 'PAUSED' | 'DEFAULTED' | 'REJECTED' | 'COMPLETED'; icon: string; tone: string; note: string }> {
    return [
      { label: 'Pending', value: this.statusCounts.pending, status: 'PENDING', icon: 'fa-hourglass-half', tone: 'pending', note: 'New requests awaiting review' },
      { label: 'Awaiting Interest', value: this.statusCounts.awaitingInterestAcceptance, status: 'AWAITING_INTEREST_ACCEPTANCE', icon: 'fa-percent', tone: 'awaiting', note: 'Employees yet to accept proposals' },
      { label: 'Approved', value: this.statusCounts.approved, status: 'APPROVED', icon: 'fa-check-circle', tone: 'approved', note: 'Approved before disbursement prep' },
      { label: 'Ready To Disburse', value: this.statusCounts.readyForDisbursement, status: 'READY_FOR_DISBURSEMENT', icon: 'fa-hand-holding-dollar', tone: 'ready', note: 'Cleared for fund release' },
      { label: 'Active', value: this.statusCounts.active, status: 'ACTIVE', icon: 'fa-check-double', tone: 'active', note: 'Loans in repayment' },
      { label: 'Skipped', value: this.statusCounts.skipped, status: 'SKIPPED', icon: 'fa-forward', tone: 'skipped', note: 'Grace-adjusted accounts' },
      { label: 'Overdue', value: this.statusCounts.overdue, status: 'OVERDUE', icon: 'fa-triangle-exclamation', tone: 'overdue', note: 'Requires intervention now' },
      { label: 'Paused', value: this.statusCounts.paused, status: 'PAUSED', icon: 'fa-circle-pause', tone: 'paused', note: 'Admin hold in effect' },
      { label: 'Defaulted', value: this.statusCounts.defaulted, status: 'DEFAULTED', icon: 'fa-shield-halved', tone: 'defaulted', note: 'Critical repayment failures' },
      { label: 'Total Applications', value: this.statusCounts.total, status: '', icon: 'fa-file-invoice', tone: 'total', note: `${this.statusCounts.completed} completed · ${this.statusCounts.rejected} rejected` }
    ];
  }

  get primaryOverviewCards() {
    return this.overviewCards.filter((card) =>
      ['pending', 'awaiting', 'approved', 'ready', 'total'].includes(card.tone)
    );
  }

  get secondaryOverviewCards() {
    return this.overviewCards.filter((card) =>
      !['pending', 'awaiting', 'approved', 'ready', 'total'].includes(card.tone)
    );
  }

  get paginatedLoans(): LoanApprovalRow[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredLoanRows.slice(startIndex, startIndex + this.pageSize);
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

  private resetPagination(): void {
    this.currentPage = 1;
  }

  // Approval methods
  openApprovalModal(loan: LoanApplication): void {
    this.selectedLoanForApproval = loan;
    this.proposedInterestRate = Number(loan.interestRate || this.loanApprovalService.determineInterestRate(loan));
    this.proposedLateFeePercentage = Number(loan.lateFeePercentage ?? 2);
    this.proposedLateFeeGracePeriodDays = Number(loan.lateFeeGracePeriodDays ?? 15);
    this.repaymentStartDate = loan.repaymentStartDate || this.getMinRepaymentDate();
    this.proposedRepaymentDay = loan.repaymentDay || 0;
    this.approvalNotes = '';
    this.onRepaymentStartDateChange(this.repaymentStartDate);
    this.showApprovalModal = true;
  }

  getEmployeeInterestRejectionComment(loan: LoanApplication | null | undefined): string {
    if (!loan || loan.status !== 'AWAITING_INTEREST_ACCEPTANCE') {
      return '';
    }

    const statusHistoryComment = [...(loan.statusHistory || [])]
      .filter((entry) => entry.status === 'AWAITING_INTEREST_ACCEPTANCE' && !!entry.notes?.trim())
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())
      .map((entry) => this.extractEmployeeInterestRejectionReason(entry.notes || ''))
      .find(Boolean);

    if (statusHistoryComment) {
      return statusHistoryComment;
    }

    if (loan.interestAgreement?.status === 'DECLINED' && loan.interestAgreement.notes) {
      return this.extractEmployeeInterestRejectionReason(loan.interestAgreement.notes);
    }

    return this.extractEmployeeInterestRejectionReason(loan.adminComment || '');
  }

  private extractEmployeeInterestRejectionReason(note: string): string {
    const trimmedNote = String(note || '').trim();
    if (!trimmedNote) {
      return '';
    }

    const matchedReason = trimmedNote.match(/Employee rejected proposed interest rate\. Reason:\s*(.+?)(?:\.\s*Admin review required.*)?$/i);
    if (matchedReason?.[1]) {
      return matchedReason[1].trim();
    }

    if (/declined|rejected/i.test(trimmedNote)) {
      return trimmedNote;
    }

    return '';
  }

  closeApprovalModal(): void {
    this.showApprovalModal = false;
    this.selectedLoanForApproval = null;
    this.repaymentStartDate = '';
    this.availableRepaymentDays = [];
    this.repaymentDayWarning = '';
  }

  submitApproval(): void {
    if (!this.selectedLoanForApproval) return;
    
    this.loanApprovalService.approveLoan(
      this.selectedLoanForApproval.id,
      this.approvalNotes,
      this.proposedInterestRate,
      this.repaymentStartDate,
      this.proposedRepaymentDay,
      this.proposedLateFeePercentage,
      this.proposedLateFeeGracePeriodDays
    ).subscribe({
      next: () => {
        this.messages = [{
          severity: 'success',
          summary: 'Loan Approved',
          detail: `Loan approved with ${this.proposedInterestRate}% interest rate. Awaiting employee acceptance.`
        }];
        this.closeApprovalModal();
        this.loadApplications();
      },
      error: (error) => {
        console.error('Error approving loan:', error);
        this.messages = [{
          severity: 'error',
          summary: 'Approval Failed',
          detail: 'Failed to approve loan.'
        }];
      }
    });
  }

  // Reject methods
  openRejectModal(loan: LoanApplication): void {
    this.selectedLoanForRejection = loan;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedLoanForRejection = null;
    this.rejectionReason = '';
  }

  confirmRejection(): void {
    if (!this.rejectionReason.trim()) {
      this.messages = [{
        severity: 'warn',
        summary: 'Reason Required',
        detail: 'Please provide a reason for rejecting this loan application.'
      }];
      return;
    }

    if (!this.selectedLoanForRejection) return;

    this.loanApprovalService.rejectLoan(this.selectedLoanForRejection.id, this.rejectionReason).subscribe({
      next: () => {
        this.messages = [{
          severity: 'success',
          summary: 'Loan Rejected',
          detail: 'Loan rejected successfully.'
        }];
        this.closeRejectModal();
        this.loadApplications();
      },
      error: (error) => {
        console.error('Error rejecting loan:', error);
        this.messages = [{
          severity: 'error',
          summary: 'Rejection Failed',
          detail: 'Failed to reject loan.'
        }];
      }
    });
  }

  viewLoanDetails(applicationId: string | number, uuid: string) {
    this.router.navigate(['/admin/hr/loan-management/loan-details', String(applicationId), uuid], {
      state: { source: 'approval' }
    });
  }

  seeLoanHistory(employeeId: string | number) {
    this.router.navigate(['/admin/hr/loan-management/employee-loan-history', String(employeeId), uuidV4()], {
      state: { source: 'admin' }
    });
  }

  onRepaymentStartDateChange(dateStr: string): void {
    if (!dateStr) {
      this.availableRepaymentDays = [];
      return;
    }
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    this.availableRepaymentDays = this.repaymentDayHelper.getValidRepaymentDays(year, month);
    const suggestedDay = this.repaymentDayHelper.suggestRepaymentDay(date);
    if (!this.proposedRepaymentDay || !this.availableRepaymentDays.includes(this.proposedRepaymentDay)) {
      this.proposedRepaymentDay = suggestedDay;
    }
    this.repaymentDayWarning = this.getRepaymentDayWarning();
  }

  getRepaymentDayWarning(): string {
    if (!this.repaymentStartDate) return '';
    const date = new Date(this.repaymentStartDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    if (!this.repaymentDayHelper.validateRepaymentDay(this.proposedRepaymentDay, year, month)) {
      return `Selected day (${this.proposedRepaymentDay}) is not valid for ${date.toLocaleString('default', { month: 'long' })} ${year}. Maximum days: ${this.repaymentDayHelper.getMaxDaysInMonth(year, month)}`;
    }
    return '';
  }

  getRepaymentDaySuggestion(): string {
    if (!this.repaymentStartDate) {
      return '';
    }

    const date = new Date(this.repaymentStartDate);
    const suggestedDay = date.getDate();
    const monthYear = date.toLocaleDateString('en-NG', {
      month: 'long',
      year: 'numeric'
    });
    const firstInstallmentDate = date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return `Suggestion: use ${suggestedDay} so repayments after ${monthYear} stay on the ${suggestedDay}${this.getDayOrdinal(suggestedDay)} of each month. You can still choose ${this.proposedRepaymentDay || suggestedDay}; the first installment will remain ${firstInstallmentDate}.`;
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

  getMinRepaymentDate(): string {
    const today = new Date();
    today.setMonth(today.getMonth() + 1);
    return today.toISOString().split('T')[0];
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/admin/hr/loan', uuidV4()]);
  }
}
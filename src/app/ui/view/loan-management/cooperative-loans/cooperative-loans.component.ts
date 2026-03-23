import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import { CooperativeLoan } from '../../../../ui/domain/loan/cooperative-loan.dto';
import { CooperativeLoanGroup, CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';
import { compareLoanSortValues, formatLoanPurposeDisplay } from '../../../service/loan/loan-display.util';

@Component({
  selector: 'app-cooperative-loans',
  templateUrl: './cooperative-loans.component.html',
  styleUrls: ['./cooperative-loans.component.scss']
})
export class CooperativeLoansComponent implements OnInit {
  currentUuid = uuidV4();
  loans: CooperativeLoan[] = [];
  filteredLoans: CooperativeLoan[] = [];
  members: CooperativeMember[] = [];
  groups: CooperativeLoanGroup[] = [];
  isLoading = true;
  searchTerm = '';
  showDisbursementModal = false;
  selectedDisbursementLoanId = '';
  disbursedDate = '';
  disbursementAmount = 0;
  disbursementRecipientType: 'BORROWER' | 'THIRD_PARTY' = 'BORROWER';
  thirdPartyName = '';
  checklistIdentityVerified = false;
  checklistAccountVerified = false;
  checklistComplianceCleared = false;
  checklistFundsReserved = false;
  statusFilter: '' | 'PENDING' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'REJECTED' = '';
  stageFilter: '' | 'READY_FOR_ADMIN_REVIEW' | 'PENDING_GUARANTOR_APPROVAL' | 'INFO_REQUESTED' = '';
  groupFilter = '';
  openDisbursementOnLoad = false;

  // Sorting
  sortField = 'applicationDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  statusOptions: Array<{ label: string; value: 'PENDING' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'REJECTED' }> = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Defaulted', value: 'DEFAULTED' },
    { label: 'Rejected', value: 'REJECTED' }
  ];

  constructor(
    private cooperativeService: CooperativeService,
    private backNavigationService: BackNavigationService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const routeUuid = this.route.snapshot.paramMap.get('uuid');
    if (routeUuid) {
      this.currentUuid = routeUuid;
    }

    this.route.queryParamMap.subscribe(params => {
      const status = params.get('status');
      if (status === 'PENDING' || status === 'APPROVED' || status === 'ACTIVE' || status === 'COMPLETED' || status === 'DEFAULTED' || status === 'REJECTED') {
        this.statusFilter = status;
      }
      this.openDisbursementOnLoad = params.get('mode') === 'disburse';
      const stage = params.get('stage');
      if (stage === 'READY_FOR_ADMIN_REVIEW' || stage === 'PENDING_GUARANTOR_APPROVAL' || stage === 'INFO_REQUESTED') {
        this.stageFilter = stage;
      }
      this.applyFilters();
    });

    this.loadLoans();
  }

  loadLoans(): void {
    this.isLoading = true;
    this.cooperativeService.loadGroups().subscribe(groups => {
      this.groups = groups;
    });

    this.cooperativeService.getMembers().subscribe(members => {
      this.members = members;
    });

    this.cooperativeService.getLoans().subscribe(loans => {
      this.loans = loans;
      this.applyFilters();
      this.isLoading = false;

      if (this.openDisbursementOnLoad && this.approvedLoans.length > 0) {
        this.openDisbursementModal();
        this.openDisbursementOnLoad = false;
      }
    });
  }

  applyFilters(): void {
    let results = [...this.loans];

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
  }

  sortData(data: CooperativeLoan[]): CooperativeLoan[] {
    return data.sort((a, b) => {
      let valueA: any, valueB: any;

      switch(this.sortField) {
        case 'loanId':
          valueA = a.loanCode || a.loanId || '';
          valueB = b.loanCode || b.loanId || '';
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

  applyStatusFromCard(status: '' | 'PENDING' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'REJECTED'): void {
    this.setStatusFilter(status);
  }

  setStatusFilter(status: '' | 'PENDING' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'REJECTED'): void {
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
    this.showDisbursementModal = true;
    const targetLoanId = loanId && this.approvedLoans.some(item => String(item.id) === String(loanId))
      ? String(loanId)
      : String(this.approvedLoans[0]?.id || '');

    this.selectedDisbursementLoanId = targetLoanId;
    this.disbursementRecipientType = 'BORROWER';
    this.thirdPartyName = '';
    this.checklistIdentityVerified = false;
    this.checklistAccountVerified = false;
    this.checklistComplianceCleared = false;
    this.checklistFundsReserved = false;
    this.syncDisbursementFields();
  }

  closeDisbursementModal(): void {
    this.showDisbursementModal = false;
  }

  onDisbursementLoanChange(): void {
    this.syncDisbursementFields();
  }

  disburseSelectedLoan(): void {
    if (!this.canDisburseSelectedLoan || !this.selectedDisbursementLoan) {
      return;
    }

    this.cooperativeService.disburseLoan(String(this.selectedDisbursementLoan.id)).subscribe((updated) => {
      if (!updated) {
        return;
      }

      this.closeDisbursementModal();
      this.loadLoans();
      this.statusFilter = 'ACTIVE';
      this.applyFilters();
    });
  }

  reviewLoan(id: string | number): void {
    this.router.navigate([`/admin/hr/cooperative/loans/${String(id)}/${this.currentUuid}`], {
      queryParams: { mode: 'review', dashboard: 'cooperative' }
    });
  }

  goBack(): void {
    this.backNavigationService.goBack(['/admin/hr/loan', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  getStageLabel(loan: CooperativeLoan): string {
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
    if (memberId === undefined || memberId === null || memberId === '') {
      return 'Unknown member';
    }

    const normalizedMemberId = String(memberId);
    const member = this.members.find(item => item.id === normalizedMemberId || item.memberId === normalizedMemberId);
    return member?.fullName || normalizedMemberId;
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

  get activeCount(): number {
    return this.loans.filter(l => l.status === 'ACTIVE').length;
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

  get statusCounts(): { pending: number; approved: number; active: number; completed: number; defaulted: number; rejected: number; total: number } {
    return {
      pending: this.pendingCount,
      approved: this.approvedCount,
      active: this.activeCount,
      completed: this.completedCount,
      defaulted: this.defaultedCount,
      rejected: this.rejectedCount,
      total: this.loans.length
    };
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

  get selectedDisbursementLoan(): CooperativeLoan | undefined {
    return this.approvedLoans.find(item => String(item.id) === this.selectedDisbursementLoanId);
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
  }
}
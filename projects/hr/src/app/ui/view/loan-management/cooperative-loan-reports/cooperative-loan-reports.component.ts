import { CommonModule, formatDate } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, Subscription, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoanGroup, CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';
import { formatLoanPurposeDisplay } from '../../../service/loan/loan-display.util';
import { TableColumn } from '../../../shared-component/view/table/table.component';
import { startLoanLoadProfiler } from '../../../service/loan/loan-load-profiler.util';
import { CooperativeGroupMembership } from '../../../service/loan/cooperative-loan/cooperative.types';
import { CooperativeLoanPurposeService } from '../../../service/loan/cooperative-loan/cooperative-loan-purpose.service';
import { LoanPurposeData } from '../../../service/loan/loan-purpose.service';
import { toCsvCell } from '../../../service/loan/csv-export.util';
import { getLoanStatusClass, hasOutstandingBalanceStatus } from '../../../service/loan/loan-format.util';

type LoanReportSummary = {
  totalLoans: number;
  totalAmount: number;
  totalPaid: number;
  totalBalance: number;
};

interface CooperativeLoanReportRow {
  loan: CooperativeLoan;
  loanId: string;
  memberName: string;
  memberId: string; // formatted
  membershipId: string; // formatted
  groupName: string;
  purposeCode: string;
  purpose: string;
  lateFeePolicy: string;
  amount: number;
  groupInterest: number;
  interestAmount: number;
  repayableAmount: number;
  lateFeeAmount: number;
  paid: number;
  balance: number;
  status: string;
  date: string;
  statusClass: string;
}

@Component({
  selector: 'app-cooperative-loan-reports',
  templateUrl: './cooperative-loan-reports.component.html',
  styleUrls: ['./cooperative-loan-reports.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CooperativeLoanReportsComponent implements OnInit, OnDestroy {
    memberships: CooperativeGroupMembership[] = [];
  readonly pageSize = 10;
  currentUuid = '';
  currentPage = 1;
  isLoading = true;

  loans: CooperativeLoan[] = [];
  filteredLoans: CooperativeLoan[] = [];
  filteredLoanRows: CooperativeLoanReportRow[] = [];
  reportColumns: TableColumn[] = [
    { header: 'Loan ID', sortable: true },
    { header: 'Member', sortable: true },
    { header: 'Member Id' },
    { header: 'Membership ID' },
    { header: 'Group Name', sortable: true },
    { header: 'Purpose' },
    { header: 'Amount', sortable: true },
    { header: 'Group Interest' },
    { header: 'Interest Amount' },
    { header: 'Repayable Amount' },
    { header: 'Paid' },
    { header: 'Balance' },
    { header: 'Status', sortable: true },
    { header: 'Date' },
    { header: 'Actions' }
  ];

  get paginatedLoanRows(): CooperativeLoanReportRow[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredLoanRows.slice(startIndex, startIndex + this.pageSize);
  }

  handleTableAction(event: { actionId: string; row: CooperativeLoanReportRow }) {
    if (event.actionId === 'open') {
      this.openLoanDetails(event.row.loan.id);
    }
  }

  members: CooperativeMember[] = [];
  groups: CooperativeLoanGroup[] = [];
  cooperativePurposes: LoanPurposeData[] = [];
  alerts: string[] = [];

  filters = {
    search: '',
    groupId: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  };

  sortField: 'requestDate' | 'amount' | 'status' | 'member' | 'group' | 'loanId' = 'requestDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  readonly statuses = [
    'PENDING',
    'APPROVED',
    'READY_FOR_DISBURSEMENT',
    'ACTIVE',
    'OVERDUE',
    'SKIPPED',
    'PAUSED',
    'DEFAULTED',
    'COMPLETED',
    'REJECTED'
  ];

  summary: LoanReportSummary = {
    totalLoans: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalBalance: 0
  };

  private readonly statusLabelMap: Record<string, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    READY_FOR_DISBURSEMENT: 'Disbursable',
    ACTIVE: 'Active',
    OVERDUE: 'Overdue',
    SKIPPED: 'Skipped',
    PAUSED: 'Paused',
    DEFAULTED: 'Defaulted',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected'
  };

  private readonly memberNameLookup = new Map<number, string>();
  private readonly groupNameLookup = new Map<number, string>();
  private readonly searchChanges = new Subject<string>();
  private readonly subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cooperativeService: CooperativeService,
    private cooperativeLoanPurposeService: CooperativeLoanPurposeService
  ) {}

  ngOnInit(): void {
    this.currentUuid = this.route.snapshot.paramMap.get('uuid') || '';
    this.subscriptions.add(
      this.searchChanges.pipe(debounceTime(250), distinctUntilChanged()).subscribe(() => this.applyFilters())
    );
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  formatStatusDisplay(status: string): string {
    if (!status) return '';
    return this.statusLabelMap[status] || status
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  onSearchChange(value: string): void {
    this.filters.search = value;
    this.searchChanges.next(value);
  }

  loadData(): void {
    const loadProfiler = startLoanLoadProfiler('cooperative-loan-reports');
    this.isLoading = true;
    // Each source falls back to empty on failure so one broken endpoint (e.g. members 500) doesn't hide the loans.
    const orEmpty = <T>(source: Observable<T[]>, label: string): Observable<T[]> => source.pipe(
      catchError((error) => {
        console.error(`[CooperativeLoanReports] Failed to load ${label}:`, error);
        return of([] as T[]);
      })
    );

    forkJoin({
      loans: orEmpty(this.cooperativeService.getLoans(), 'loans'),
      members: orEmpty(this.cooperativeService.getMembers(), 'members'),
      groups: orEmpty(this.cooperativeService.loadGroups(), 'groups'),
      memberships: orEmpty(this.cooperativeService.loadGroupMemberships(), 'memberships'), // Batch fetch all memberships
      purposes: orEmpty(this.cooperativeLoanPurposeService.getAllPurposes(false), 'purposes')
    }).subscribe({
      next: ({ loans, members, groups, memberships, purposes }) => {
        this.loans = loans;
        this.members = members;
        this.groups = groups;
        this.memberships = memberships;
        this.cooperativePurposes = Array.isArray(purposes) ? purposes : [];
        this.rebuildLookups();
        this.applyFilters();
        this.alerts = this.buildAlerts(loans);
        loadProfiler.success({ loans: this.loans.length, filtered: this.filteredLoans.length });
        this.isLoading = false;
      },
      error: () => {
        loadProfiler.error({ message: 'Failed to load cooperative loan reports' });
        this.isLoading = false;
      }
    });
  }

  private rebuildLookups(): void {
    this.memberNameLookup.clear();
    this.groupNameLookup.clear();

    this.members.forEach((member) => {
      const displayName = member.fullName || `Member #${member.memberId || 'N/A'}`;
      if (typeof member.memberId === 'number' && !isNaN(member.memberId)) {
        this.memberNameLookup.set(member.memberId, displayName);
      }
    });

    this.groups.forEach((group) => {
      this.groupNameLookup.set(group.id, group.name || 'Ungrouped');
    });
  }

  applyFilters(): void {
    const searchTerm = this.filters.search.trim().toLowerCase();
    let results = [...this.loans];

    if (searchTerm) {
      results = results.filter((loan) => {
        const memberName = this.getMemberName(loan).toLowerCase();
        const groupName = this.getGroupName(loan).toLowerCase();
        return [
          String(loan.loanCode || loan.loanId || loan.id).toLowerCase(),
          memberName,
          groupName,
          String(loan.memberId || loan.cooperativeMemberId || '').toLowerCase()
        ].some((value) => value.includes(searchTerm));
      });
    }

    if (this.filters.groupId) {
      results = results.filter((loan) => String(loan.groupId || loan.cooperativeGroupId || '') === this.filters.groupId);
    }

    if (this.filters.status) {
      results = results.filter((loan) => loan.status === this.filters.status);
    }

    if (this.filters.dateFrom) {
      const fromDate = new Date(this.filters.dateFrom).getTime();
      results = results.filter((loan) => new Date(loan.requestDate || loan.applicationDate || '').getTime() >= fromDate);
    }

    if (this.filters.dateTo) {
      const toDate = new Date(this.filters.dateTo).getTime();
      results = results.filter((loan) => new Date(loan.requestDate || loan.applicationDate || '').getTime() <= toDate);
    }

    this.filteredLoans = this.sortLoans(results);
    this.filteredLoanRows = this.filteredLoans.map((loan) => this.buildLoanReportRow(loan));
    this.currentPage = 1;
    this.calculateSummary();
  }

  private buildLoanReportRow(loan: CooperativeLoan): CooperativeLoanReportRow {
    const group = this.groups.find(g => g.id === (loan.groupId || loan.cooperativeGroupId));
    // Find the correct membership for this member and group
    const memberIdNum = Number(loan.cooperativeMemberId || loan.memberId || 0);
    const groupId = Number(loan.groupId || loan.cooperativeGroupId || 0);
    const membership = this.memberships.find((m: CooperativeGroupMembership) => m.memberId === memberIdNum && m.groupId === groupId);
    const membershipIdRaw = membership?.membershipId || '';
    const amount = Number(loan.amount || 0);
    const repayableAmount = Number(loan.totalRepayment || 0);
    const interestAmount = Math.max(repayableAmount - amount, 0);
    const lateFeePercentage = this.resolveLateFeePercentage(loan, group);
    const lateFeeGraceDays = this.resolveLateFeeGraceDays(loan, group);
    const lateFeeAmount = this.calculateTotalLateFees(loan, lateFeePercentage);

    return {
      loan,
      loanId: String(loan.loanCode || loan.loanId || loan.id),
      memberName: this.getMemberName(loan),
      memberId: this.formatMemberId(memberIdNum),
      membershipId: this.formatMembershipId(String(membershipIdRaw), group?.code, memberIdNum),
      groupName: this.getGroupName(loan),
      purposeCode: this.getPurposeCodeDisplay(loan),
      purpose: this.formatPurposeDisplay(loan.purpose),
      lateFeePolicy: this.getLateFeePolicyDisplay(lateFeePercentage, lateFeeGraceDays),
      amount,
      groupInterest: group ? Number(group.interestRate || 0) : 0,
      interestAmount,
      repayableAmount,
      lateFeeAmount,
      paid: Number(loan.totalPaid || 0),
      balance: this.getCurrentBalance(loan),
      status: this.formatStatusDisplay(loan.status),
      date: loan.requestDate || loan.applicationDate || '',
      statusClass: this.getStatusClass(loan.status)
    };
  }

  private formatMemberId(memberId: number): string {
    if (!memberId || isNaN(memberId)) return '';
    return `COP-${memberId.toString().padStart(3, '0')}`;
  }

  /**
   * Formats the membership ID as [alphabetical part of group code]-[member id]-[membership id].
   * E.g. groupCode: PSU-001, memberId: 5, membershipId: 1 => PSU-5-1
   */
  private formatMembershipId(membershipId: string | number, groupCode?: string, memberId?: number): string {
    if (!membershipId || !groupCode || !memberId) return '';
    // Extract only the alphabetical part of the group code (e.g., PSU from PSU-001)
    const alphaPart = groupCode.split('-')[0];
    return `${alphaPart}-${memberId}-${membershipId}`;
  }

  private getPurposeCodeDisplay(loan: CooperativeLoan): string {
    const persistedCode = String((loan as any).purposeCode || (loan as any).loanPurposeCode || '').trim();
    if (persistedCode) {
      return persistedCode;
    }

    const purposeName = String(loan.purpose || '').trim().toLowerCase();
    if (purposeName) {
      const matchedPurpose = this.cooperativePurposes.find((purpose) =>
        String(purpose.name || '').trim().toLowerCase() === purposeName
      );
      const matchedCode = String(matchedPurpose?.code || '').trim();
      if (matchedCode) {
        return matchedCode;
      }
    }

    return 'N/A';
  }

  private resolveLateFeePercentage(loan: CooperativeLoan, group?: CooperativeLoanGroup): number {
    const value = Number((loan as any).lateFeePercentage ?? group?.lateFeePercentage ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  private resolveLateFeeGraceDays(loan: CooperativeLoan, group?: CooperativeLoanGroup): number {
    const value = Number((loan as any).lateFeeGraceDays ?? group?.lateFeeGraceDays ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  private getLateFeePolicyDisplay(lateFeePercentage: number, lateFeeGraceDays: number): string {
    if (!lateFeePercentage && !lateFeeGraceDays) {
      return 'No late fee policy';
    }

    return `${lateFeePercentage}% after ${lateFeeGraceDays} day(s)`;
  }

  /**
   * Late fees on a cooperative loan, matching how the repayment service charges them: an installment
   * only becomes OVERDUE after the group's grace period, and its fee (installment amount x rate) is
   * then recorded on lateFeeAmount. Uses the real repayment list, as the loan detail page does.
   */
  private calculateTotalLateFees(loan: CooperativeLoan, lateFeePercentage: number): number {
    const inRepayment = ['ACTIVE', 'OVERDUE', 'SKIPPED', 'PAUSED', 'DEFAULTED', 'COMPLETED'].includes(String(loan.status || ''));
    if (!inRepayment) {
      return 0;
    }

    const totalLateFees = this.cooperativeService.getRepaymentsByLoanId(loan.id).reduce((sum, repayment) => {
      const recordedLateFee = Number(repayment.lateFeeAmount || 0);
      if (recordedLateFee > 0) {
        return sum + recordedLateFee;
      }
      // Overdue but not yet accrued locally: estimate with the same base the service uses.
      if (repayment.status === 'OVERDUE' && lateFeePercentage > 0) {
        return sum + Number(repayment.amount || 0) * (lateFeePercentage / 100);
      }
      return sum;
    }, 0);

    return Number(totalLateFees.toFixed(2));
  }

  resetFilters(): void {
    this.filters = {
      search: '',
      groupId: '',
      status: '',
      dateFrom: '',
      dateTo: ''
    };
    this.applyFilters();
  }

  get paginationStart(): number {
  return this.filteredLoanRows.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
}

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredLoanRows.length);
  }

  get filteredTotalAmount(): number {
    return this.filteredLoanRows.reduce((sum, row) => sum + row.amount, 0);
  }

  // Add this method for sort icons
  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }


  setSort(field: string): void {
  // Map UI field names to internal sort fields
  const fieldMap: { [key: string]: string } = {
    'loanId': 'loanId',
    'member': 'member', 
    'group': 'group',
    'amount': 'amount',
    'status': 'status',
    'date': 'requestDate'
  };
  
  const internalField = fieldMap[field] || field;
  
  if (this.sortField === internalField) {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    this.sortField = internalField as any;
    this.sortDirection = 'desc';
  }
  this.applyFilters();
}

  get paginatedLoans(): CooperativeLoanReportRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredLoanRows.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(Math.ceil(this.filteredLoans.length / this.pageSize), 1);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
  }

  getMemberName(loan: CooperativeLoan): string {
    const memberId = Number(loan.cooperativeMemberId || loan.memberId || 0);
    return this.memberNameLookup.get(memberId) || `Member #${memberId || 'N/A'}`;
  }

  getGroupName(loan: CooperativeLoan): string {
    const groupId = Number(loan.groupId || loan.cooperativeGroupId || 0);
    return this.groupNameLookup.get(groupId) || 'Ungrouped';
  }

  getCurrentBalance(loan: CooperativeLoan): number {
    // Balance = Repayable Amount - Paid, always decreasing as payments are made
    const repayable = Number(loan.totalRepayment || loan.repaymentAmount || 0);
    const paid = Number(loan.totalPaid || 0);
    return Math.max(repayable - paid, 0);
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

getStatusClass(status: string | undefined): string {
  return getLoanStatusClass(status);
}
  openLoanDetails(loanId: number): void {
    this.router.navigate(['/admin/hr/cooperative/loans', loanId, this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  exportToExcel(): void {
    const worksheet = XLSX.utils.json_to_sheet(this.buildExportRows());
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cooperative Loan Reports');
    XLSX.writeFile(workbook, `cooperative_loan_report_${formatDate(new Date(), 'yyyy-MM-dd', 'en-US')}.xlsx`);
  }

  exportToCSV(): void {
    const rows = this.buildExportRows();
    const headers = Object.keys(rows[0] || {});
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => this.escapeCsvValue(row[header as keyof typeof row])).join(','))
    ].join('\n');

    this.downloadBlob(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), `cooperative_loan_report_${formatDate(new Date(), 'yyyy-MM-dd', 'en-US')}.csv`);
  }

  printReport(): void {
    const popup = window.open('', '_blank');
    if (!popup) {
      return;
    }

    const rows = this.filteredLoanRows.map((row) => `
      <tr>
        <td>${row.loanId}</td>
        <td>${row.memberName}</td>
        <td>${row.membershipId || 'N/A'}</td>
        <td>${row.groupName}</td>
        <td>${row.purposeCode}</td>
        <td>${row.purpose}</td>
        <td>${row.lateFeePolicy}</td>
        <td>${this.formatCurrency(row.amount)}</td>
        <td>${this.formatCurrency(row.repayableAmount)}</td>
        <td>${row.groupInterest}%</td>
        <td>${this.formatCurrency(row.lateFeeAmount)}</td>
        <td>${this.formatCurrency(row.paid)}</td>
        <td>${this.formatCurrency(row.balance)}</td>
        <td>${row.status}</td>
        <td>${formatDate(row.date, 'mediumDate', 'en-US')}</td>
      </tr>
    `).join('');

    popup.document.write(`
      <html>
        <head>
          <title>Cooperative Loan Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #183542; }
            h1 { margin-bottom: 8px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
            .card { border: 1px solid #d6e5ea; border-radius: 8px; padding: 12px; background: #f7fbfc; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border-bottom: 1px solid #dfeaec; padding: 10px; text-align: left; }
            th { background: #234a58; color: #fff; }
          </style>
        </head>
        <body>
          <h1>Cooperative Loan Report</h1>
          <div>Generated ${formatDate(new Date(), 'medium', 'en-US')}</div>
          <div class="summary">
            <div class="card"><strong>Total Loans</strong><div>${this.summary.totalLoans}</div></div>
            <div class="card"><strong>Total Amount (Active)</strong><div>${this.formatCurrency(this.summary.totalAmount)}</div></div>
            <div class="card"><strong>Total Paid (Active)</strong><div>${this.formatCurrency(this.summary.totalPaid)}</div></div>
            <div class="card"><strong>Total Balance (Active)</strong><div>${this.formatCurrency(this.summary.totalBalance)}</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Member</th>
                <th>Membership ID</th>
                <th>Group Name</th>
                <th>Purpose Code</th>
                <th>Purpose</th>
                <th>Late Fee / Grace Days</th>
                <th>Amount</th>
                <th>Repayable Amount</th>
                <th>Group Interest</th>
                <th>Late Fee Amount</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.print();
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/loan', this.currentUuid || 'uu'], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  private sortLoans(loans: CooperativeLoan[]): CooperativeLoan[] {
    return [...loans].sort((left, right) => {
      let valueA: string | number = '';
      let valueB: string | number = '';
      const extractNum = (val: any) => {
        const str = String(val || '');
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };
      switch (this.sortField) {
        case 'loanId':
          valueA = extractNum(left.loanCode || left.loanId || left.id);
          valueB = extractNum(right.loanCode || right.loanId || right.id);
          break;
        case 'amount':
          valueA = Number(left.amount || 0);
          valueB = Number(right.amount || 0);
          break;
        case 'status':
          valueA = String(left.status || '').toLowerCase();
          valueB = String(right.status || '').toLowerCase();
          break;
        case 'member':
          valueA = this.getMemberName(left).toLowerCase();
          valueB = this.getMemberName(right).toLowerCase();
          break;
        case 'group':
          valueA = this.getGroupName(left).toLowerCase();
          valueB = this.getGroupName(right).toLowerCase();
          break;
        default:
          valueA = new Date(left.requestDate || left.applicationDate || '').getTime();
          valueB = new Date(right.requestDate || right.applicationDate || '').getTime();
      }
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return this.sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }
      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private calculateSummary(): void {
    // Financial totals cover every loan still in repayment, including overdue/defaulted ones.
    const activeLoans = this.filteredLoans.filter(loan => hasOutstandingBalanceStatus(loan.status));
    
    this.summary = {
      totalLoans: this.filteredLoans.length,
      totalAmount: activeLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0),
      totalPaid: activeLoans.reduce((sum, loan) => sum + Number(loan.totalPaid || 0), 0),
      totalBalance: activeLoans.reduce((sum, loan) => sum + this.getCurrentBalance(loan), 0)
    };
  }

  private buildAlerts(loans: CooperativeLoan[]): string[] {
    const alerts: string[] = [];
    const overdueLoans = loans.filter((loan) => loan.status === 'OVERDUE').length;
    const defaultedLoans = loans.filter((loan) => loan.status === 'DEFAULTED').length;
    const pausedLoans = loans.filter((loan) => loan.status === 'PAUSED').length;

    if (overdueLoans > 0) {
      alerts.push(`${overdueLoans} cooperative loan${overdueLoans === 1 ? '' : 's'} require repayment follow-up.`);
    }
    if (defaultedLoans > 0) {
      alerts.push(`${defaultedLoans} cooperative loan${defaultedLoans === 1 ? '' : 's'} are in default.`);
    }
    if (pausedLoans > 0) {
      alerts.push(`${pausedLoans} cooperative loan${pausedLoans === 1 ? '' : 's'} are currently on admin hold.`);
    }

    return alerts;
  }

  private buildExportRows(): Array<Record<string, string | number>> {
    return this.filteredLoanRows.map((row) => ({
      'Loan ID': row.loanId,
      'Member Name': row.memberName,
      'Membership ID': row.membershipId || 'N/A',
      'Group Name': row.groupName,
      'Purpose Code': row.purposeCode,
      'Purpose': row.purpose,
      'Late Fee / Grace Days': row.lateFeePolicy,
      'Loan Amount': row.amount,
      'Repayable Amount': row.repayableAmount,
      'Group Interest Rate (%)': row.groupInterest,
      'Late Fee Amount': row.lateFeeAmount,
      'Total Paid': row.paid,
      'Outstanding Balance': row.balance,
      'Status': row.status,
      'Requested Date': formatDate(row.date, 'yyyy-MM-dd', 'en-US')
    }));
  }

  private escapeCsvValue(value: string | number): string {
    return toCsvCell(value);
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
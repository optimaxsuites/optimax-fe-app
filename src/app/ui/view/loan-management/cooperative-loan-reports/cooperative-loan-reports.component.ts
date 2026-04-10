import { CommonModule, Location, formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoanGroup, CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';
import { formatLoanPurposeDisplay } from '../../../service/loan/loan-display.util';

type LoanReportSummary = {
  totalLoans: number;
  totalAmount: number;
  activePortfolio: number;
  overdueCount: number;
  defaultedCount: number;
  pausedCount: number;
};

type LoanActivityItem = {
  loanId: number;
  loanCode: string;
  status: string;
  changedAt: string;
  actor: string;
  notes: string;
};

@Component({
  selector: 'app-cooperative-loan-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cooperative-loan-reports.component.html',
  styleUrls: ['./cooperative-loan-reports.component.scss']
})
export class CooperativeLoanReportsComponent implements OnInit {
  readonly pageSize = 20;
  currentUuid = '';
  currentPage = 1;
  isLoading = true;

  loans: CooperativeLoan[] = [];
  filteredLoans: CooperativeLoan[] = [];
  members: CooperativeMember[] = [];
  groups: CooperativeLoanGroup[] = [];
  recentActivity: LoanActivityItem[] = [];
  alerts: string[] = [];

  filters = {
    search: '',
    groupId: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  };

  sortField: 'requestDate' | 'amount' | 'status' | 'member' | 'group' = 'requestDate';
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
    activePortfolio: 0,
    overdueCount: 0,
    defaultedCount: 0,
    pausedCount: 0
  };

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private cooperativeService: CooperativeService
  ) {}

  ngOnInit(): void {
    this.currentUuid = this.route.snapshot.paramMap.get('uuid') || '';
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    forkJoin({
      loans: this.cooperativeService.getLoans(),
      members: this.cooperativeService.getMembers(),
      groups: this.cooperativeService.loadGroups()
    }).subscribe({
      next: ({ loans, members, groups }) => {
        this.loans = loans;
        this.members = members;
        this.groups = groups;
        this.applyFilters();
        this.recentActivity = this.buildRecentActivity(loans);
        this.alerts = this.buildAlerts(loans);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
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
    this.currentPage = 1;
    this.calculateSummary();
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

  setSort(field: 'requestDate' | 'amount' | 'status' | 'member' | 'group'): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = field === 'requestDate' ? 'desc' : 'asc';
    }

    this.applyFilters();
  }

  get paginatedLoans(): CooperativeLoan[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredLoans.slice(start, start + this.pageSize);
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
    const memberId = Number(loan.memberId || loan.cooperativeMemberId || 0);
    const member = this.members.find((item) => item.id === memberId || item.memberId === memberId || item.employeeId === memberId);
    return member?.fullName || `Member #${memberId || 'N/A'}`;
  }

  getGroupName(loan: CooperativeLoan): string {
    const groupId = Number(loan.groupId || loan.cooperativeGroupId || 0);
    return this.groups.find((item) => item.id === groupId)?.name || 'Ungrouped';
  }

  getCurrentBalance(loan: CooperativeLoan): number {
    return Number(loan.outstandingBalance || loan.outstandingPrincipal || Math.max(Number(loan.totalRepayment || 0) - Number(loan.totalPaid || 0), 0));
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  getStatusClass(status: string | undefined): string {
    return `status-${String(status || 'default').toLowerCase()}`;
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

    const rows = this.filteredLoans.map((loan) => `
      <tr>
        <td>${loan.loanCode || loan.loanId || loan.id}</td>
        <td>${this.getMemberName(loan)}</td>
        <td>${this.getGroupName(loan)}</td>
        <td>${this.formatCurrency(Number(loan.amount || 0))}</td>
        <td>${this.formatCurrency(this.getCurrentBalance(loan))}</td>
        <td>${loan.status}</td>
        <td>${formatDate(loan.requestDate || loan.applicationDate || '', 'mediumDate', 'en-US')}</td>
      </tr>
    `).join('');

    popup.document.write(`
      <html>
        <head>
          <title>Cooperative Loan Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #183542; }
            h1 { margin-bottom: 8px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
            .card { border: 1px solid #d6e5ea; border-radius: 8px; padding: 12px; background: #f7fbfc; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border-bottom: 1px solid #dfeaec; padding: 10px; text-align: left; }
            th { background: #234a58; color: #fff; }
          </style>
        </head>
        <body>
          <h1>Cooperative Loan Report</h1>
          <div>Generated ${formatDate(new Date(), 'medium', 'en-US')}</div>
          <div class="summary">
            <div class="card"><strong>Total Loans</strong><div>${this.summary.totalLoans}</div></div>
            <div class="card"><strong>Total Amount</strong><div>${this.formatCurrency(this.summary.totalAmount)}</div></div>
            <div class="card"><strong>Active Portfolio</strong><div>${this.formatCurrency(this.summary.activePortfolio)}</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Member</th>
                <th>Group</th>
                <th>Amount</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Requested</th>
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
    this.location.back();
  }

  private sortLoans(loans: CooperativeLoan[]): CooperativeLoan[] {
    return [...loans].sort((left, right) => {
      let valueA: string | number = '';
      let valueB: string | number = '';

      switch (this.sortField) {
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
    this.summary = {
      totalLoans: this.filteredLoans.length,
      totalAmount: this.filteredLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0),
      activePortfolio: this.filteredLoans
        .filter((loan) => ['ACTIVE', 'OVERDUE', 'SKIPPED', 'PAUSED'].includes(loan.status || ''))
        .reduce((sum, loan) => sum + this.getCurrentBalance(loan), 0),
      overdueCount: this.filteredLoans.filter((loan) => loan.status === 'OVERDUE').length,
      defaultedCount: this.filteredLoans.filter((loan) => loan.status === 'DEFAULTED').length,
      pausedCount: this.filteredLoans.filter((loan) => loan.status === 'PAUSED').length
    };
  }

  private buildRecentActivity(loans: CooperativeLoan[]): LoanActivityItem[] {
    return loans
      .flatMap((loan) => (loan.statusHistory || []).map((entry) => ({
        loanId: loan.id,
        loanCode: String(loan.loanCode || loan.loanId || loan.id),
        status: entry.status,
        changedAt: entry.changedAt,
        actor: typeof entry.changedBy === 'object' ? entry.changedBy.fullname : `User ${entry.changedBy || 'System'}`,
        notes: entry.notes
      })))
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())
      .slice(0, 8);
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
    return this.filteredLoans.map((loan) => ({
      'Loan ID': String(loan.loanCode || loan.loanId || loan.id),
      'Member ID': Number(loan.memberId || loan.cooperativeMemberId || 0),
      'Member Name': this.getMemberName(loan),
      'Group': this.getGroupName(loan),
      'Group ID': Number(loan.groupId || loan.cooperativeGroupId || 0),
      'Membership ID': Number(loan.membershipId || 0),
      'Purpose': this.formatPurposeDisplay(loan.purpose),
      'Loan Amount': Number(loan.amount || 0),
      'Total Repaid': Number(loan.totalPaid || 0),
      'Outstanding Balance': this.getCurrentBalance(loan),
      'Interest Rate': Number(loan.interestRate || 0),
      'Repayment Day': Number(loan.repaymentDay || 0),
      'Repayment Start Date': loan.repaymentStartDate || 'N/A',
      'Status': loan.status,
      'Requested Date': formatDate(loan.requestDate || loan.applicationDate || '', 'yyyy-MM-dd', 'en-US'),
      'Approved Date': loan.approvedDate ? formatDate(loan.approvedDate, 'yyyy-MM-dd', 'en-US') : 'N/A',
      'Disbursed Date': loan.disbursedDate ? formatDate(loan.disbursedDate, 'yyyy-MM-dd', 'en-US') : 'N/A',
      'Completed Date': loan.completedDate ? formatDate(loan.completedDate, 'yyyy-MM-dd', 'en-US') : 'N/A'
    }));
  }

  private escapeCsvValue(value: string | number): string {
    const stringValue = String(value ?? '');
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
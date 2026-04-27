import { Component, OnInit } from '@angular/core';
import { Location, formatDate } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import * as XLSX from 'xlsx';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import { CooperativeLoan } from '../../../../ui/domain/loan/cooperative-loan.dto';
import { CooperativeMember, CooperativeRepayment } from '../../../service/loan/cooperative-loan/cooperative.types';
import { EmployeeService } from '../../../service/employee.service';
import {
  compareLoanSortValues,
  formatLoanDepartmentDisplay,
  formatLoanPurposeDisplay,
  resolveLoanOutstandingBalance,
  resolveLoanTotalPaid,
  resolveLoanTotalRepayableAmount
} from '../../../service/loan/loan-display.util';

@Component({
  selector: 'app-employee-history',
  templateUrl: './employee-loan-history.component.html',
  styleUrls: ['./employee-loan-history.component.scss']
})
export class EmployeeLoanHistoryComponent implements OnInit {
  readonly pageSize = 20;
  currentPage = 1;
  employeeId: string = '';
  employeeName: string = '';
  employeeLoans: LoanApplication[] = [];
  filteredLoans: LoanApplication[] = [];
  isLoading: boolean = true;
  viewSource: 'admin' | 'employee' = 'admin';
  historyMode: 'advance' | 'cooperative' = 'advance';
  currentUuid: string = uuidV4();

  get activeLoansCount(): number {
    return this.employeeLoans.filter(loan => loan.status === 'ACTIVE').length;
  }
  cooperativeMember: CooperativeMember | null = null;
  private returnGroupId?: number;
  private cooperativeLoanByCode = new Map<string, CooperativeLoan>();
  selectedLoanForDetails: LoanApplication | null = null;
  showLoanDetailsModal: boolean = false;
  
  // Sorting properties
  sortField: string = 'requestDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  statusFilter: '' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'AWAITING_INTEREST_ACCEPTANCE' | 'READY_FOR_DISBURSEMENT' | 'ACTIVE' | 'COMPLETED' = '';
  dateFrom: string = '';
  dateTo: string = '';
  readonly statusOptions: Array<{ label: string; value: '' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'READY_FOR_DISBURSEMENT' | 'ACTIVE' | 'COMPLETED' }> = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Ready for Disbursement', value: 'READY_FOR_DISBURSEMENT' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Completed', value: 'COMPLETED' }
  ];
  
  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private backNavigationService: BackNavigationService,
    private loanApplicationService: LoanApplicationService,
    private cooperativeService: CooperativeService,
    private employeeService: EmployeeService
  ) {}
  
  ngOnInit(): void {
    this.viewSource = window.history.state?.source === 'employee' ? 'employee' : 'admin';
    this.historyMode = window.history.state?.cooperative ? 'cooperative' : 'advance';
    this.currentUuid = window.history.state?.uuid || this.currentUuid;
    this.employeeName = window.history.state?.employeeName || this.employeeName;
    const groupId = Number(window.history.state?.groupId || 0);
    this.returnGroupId = Number.isFinite(groupId) && groupId > 0 ? groupId : undefined;

    this.route.params.subscribe(params => {
      this.employeeId = params['employeeId'];
      this.currentUuid = params['uuid'] || this.currentUuid;
      this.loadEmployeeHistory();
    });
  }
  
  loadEmployeeHistory(): void {
    if (this.historyMode === 'cooperative') {
      this.loadCooperativeHistory();
      return;
    }

    this.isLoading = true;
    this.loanApplicationService.getApplicationsByEmployeeId(this.employeeId, this.employeeName).subscribe({
      next: (applications) => {
        // Fetch employee details for this employeeId
        this.employeeService.getEmployeeById(Number(this.employeeId)).toPromise()
          .then(employee => {
            this.employeeLoans = applications.map(loan => ({
              ...loan,
              fullName: employee?.fullName || loan.fullName,
              department: formatLoanDepartmentDisplay(employee?.department || loan.department)
            }));
            this.filteredLoans = [...this.employeeLoans];
            this.employeeName = employee?.fullName || (this.employeeLoans[0]?.fullName ?? '');
            // Apply initial sorting
            this.applySort();
            this.isLoading = false;
          })
          .catch(() => {
            this.employeeLoans = applications.map((loan) => ({
              ...loan,
              department: formatLoanDepartmentDisplay(loan.department)
            }));
            this.filteredLoans = [...this.employeeLoans];
            this.employeeName = this.employeeLoans[0]?.fullName ?? '';
            this.applySort();
            this.isLoading = false;
          });
      },
      error: (error) => {
        this.employeeLoans = [];
        this.filteredLoans = [];
        console.error('Error loading employee history:', error);
        this.isLoading = false;
      }
    });
  }

  private loadCooperativeHistory(): void {
    this.isLoading = true;
    const member = this.cooperativeService.getMemberById(Number(this.employeeId));

    if (!member) {
      this.employeeLoans = [];
      this.filteredLoans = [];
      this.employeeName = 'Cooperative Member';
      this.isLoading = false;
      return;
    }

    this.cooperativeMember = member;
    this.employeeName = member.fullName;
    const cooperativeLoans = this.cooperativeService
      .getLoansByMember(member.id)
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

    this.cooperativeLoanByCode.clear();
    cooperativeLoans.forEach(loan => {
      this.cooperativeLoanByCode.set(loan.loanCode, loan);
    });

    this.employeeLoans = cooperativeLoans.map(loan => this.mapCooperativeLoanToLoanApplication(loan, member));
    this.filteredLoans = [...this.employeeLoans];
    this.applySort();
    this.isLoading = false;
  }

  private mapCooperativeLoanToLoanApplication(loan: CooperativeLoan, member: CooperativeMember): LoanApplication {
    const repayments = this.cooperativeService
      .getRepaymentsByLoanId(loan.id)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const totalPaid = repayments
      .filter(item => item.status === 'PAID')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const currentBalance = repayments
      .filter(item => item.status !== 'PAID')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    let remainingBalance = Number(loan.repaymentAmount || 0);
    const repaymentSchedule = repayments.map((item, index) => {
      const totalPayment = Number(item.amount || 0);
      const principal = Number(item.principalComponent || Math.max(totalPayment - Number(item.interestComponent || 0), 0));
      const interest = Number(item.interestComponent || 0);
      remainingBalance = Math.max(Number((remainingBalance - totalPayment).toFixed(2)), 0);

      return {
        installmentNo: index + 1,
        dueDate: item.dueDate,
        principalAmount: principal,
        interestAmount: interest,
        totalAmount: totalPayment,
        paidAmount: item.status === 'PAID' ? totalPayment : 0,
        remainingBalance,
        status: item.status,
        paymentMethod: item.modeofPayment || 'BANK_TRANSFER'
      };
    });

    // Only allow valid status values
    const allowedStatuses: LoanApplication['status'][] = [
      'PENDING',
      'APPROVED',
      'READY_FOR_DISBURSEMENT',
      'REJECTED',
      'ACTIVE',
      'SKIPPED',
      'OVERDUE',
      'DEFAULTED',
      'PAUSED',
      'COMPLETED'
    ];
    let mappedStatus: LoanApplication['status'] = 'PENDING';
    if (allowedStatuses.includes(loan.status as LoanApplication['status'])) {
      mappedStatus = loan.status as LoanApplication['status'];
    } else {
      mappedStatus = 'PENDING';
    }

    return {
      id: Number(loan.id || 0),
      loanCode: loan.loanCode,
      employeeId: Number(member.id || 0),
      fullName: member.fullName,
      department: member.address || 'Cooperative',
      amount: Number(loan.amount || 0),
      modeOfPayment: 'MONTHLY',
      status: mappedStatus,
      requestDate: loan.requestDate,
      purpose: loan.purpose,
      repaymentTime: Number(loan.repaymentTime || 0),
      repaymentAmount: Number(loan.repaymentAmount || 0),
      acknowledgment: true,
      interestRate: 0, // Not present in DTO, set as needed
      currentBalance,
      totalPaid,
      totalPrincipalPaid: 0,
      totalInterestPaid: 0,
      outstandingPrincipal: Number(loan.outstandingPrincipal || currentBalance || 0),
      adminComment: loan.adminComment || '',
      statusHistory: [],
      repaymentSchedule,
      paymentHistory: repayments
        .filter((item: CooperativeRepayment) => item.status === 'PAID' && !!item.paidDate)
        .map((item: CooperativeRepayment, index: number) => ({
          id: index + 1,
          loanId: Number(loan.id || 0),
          paidAt: item.paidDate as string,
          principalAmount: Number(item.principalComponent || 0),
          interestPaid: Number(item.interestComponent || 0),
          lateFeeAmount: Number(item.lateFeeAmount || 0),
          totalAmount: Number(item.amount || 0),
          remainingBalance: Number(loan.outstandingPrincipal || 0),
          paymentMethod: item.modeofPayment || 'BANK_TRANSFER',
          referenceNumber: item.receiptNumber || `CPAY-${loan.loanCode}-${index + 1}`,
          installmentNo: index + 1,
          receiptNumber: item.receiptNumber || `CPAY-${loan.loanCode}-${index + 1}`,
          notes: '',
          receivedBy: 'System'
        }))
    };
  }
  
  // Sorting method
  sortData(data: LoanApplication[]): LoanApplication[] {
    return [...data].sort((a, b) => {
      let valueA: string | number = '';
      let valueB: string | number = '';

      // Get values based on sort field
      switch(this.sortField) {
        case 'requestDate':
          valueA = new Date(a.requestDate).getTime();
          valueB = new Date(b.requestDate).getTime();
          break;
        case 'amount':
          valueA = a.amount;
          valueB = b.amount;
          break;
        case 'interestRate':
          valueA = a.interestRate ?? 0;
          valueB = b.interestRate ?? 0;
          break;
        case 'totalRepayable':
          valueA = this.getLoanTotalRepayable(a);
          valueB = this.getLoanTotalRepayable(b);
          break;
        case 'loanId':
          valueA = String(a.loanCode || a.id).toLowerCase();
          valueB = String(b.loanCode || b.id).toLowerCase();
          break;
        case 'purpose':
          valueA = a.purpose.toLowerCase();
          valueB = b.purpose.toLowerCase();
          break;
        case 'status':
          valueA = a.status.toLowerCase();
          valueB = b.status.toLowerCase();
          break;
        case 'totalPaid':
          valueA = a.totalPaid;
          valueB = b.totalPaid;
          break;
        case 'currentBalance':
          valueA = a.currentBalance;
          valueB = b.currentBalance;
          break;
        default:
          return 0;
      }

      // Compare values
      const comparison = compareLoanSortValues(valueA, valueB);
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  // Apply sorting
  applySort(): void {
    this.filteredLoans = this.sortData(this.getFilteredLoans());
    this.resetPagination();
  }

  onFiltersChanged(): void {
    this.applySort();
  }

  resetFilters(): void {
    this.statusFilter = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.applySort();
  }

  // Set sort field and direction
  setSort(field: string): void {
    if (this.sortField === field) {
      // Toggle direction if same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New field, default to descending for dates, ascending for others
      this.sortField = field;
      this.sortDirection = field === 'requestDate' ? 'desc' : 'asc';
    }
    this.applySort();
  }

  // Get sort icon class
  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'fa-sort'; // Default unsorted icon
    }
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }
  
  goBack(): void {
    if (this.historyMode === 'cooperative' && this.viewSource === 'employee') {
      const targetCommands = this.returnGroupId
        ? ['/member/cooperative/groups', this.returnGroupId, this.currentUuid]
        : ['/member/cooperative/dashboard', this.currentUuid];

      this.router.navigate(targetCommands, {
        replaceUrl: true,
        state: {
          memberId: Number(this.cooperativeMember?.id || this.employeeId || 0) || undefined,
          source: 'group-dashboard',
          groupId: this.returnGroupId
        }
      }).then((navigated) => {
        if (navigated) {
          window.dispatchEvent(new Event('resize'));
        }
      });
      return;
    }

    if (this.historyMode === 'cooperative' && this.viewSource === 'admin') {
      this.backNavigationService.goBack(['/admin/hr/loan', this.currentUuid], {
        queryParams: { dashboard: 'cooperative' }
      });
      return;
    }

    this.router.navigate(['/admin/hr/loan', this.currentUuid || uuidV4()]);
  }
  
  viewLoanDetails(loan: LoanApplication): void {
    if (this.historyMode === 'cooperative' && this.viewSource === 'admin') {
      const cooperativeLoan = this.cooperativeLoanByCode.get(loan.loanCode);
      if (cooperativeLoan) {
        this.router.navigate(['/admin/hr/cooperative/loans', cooperativeLoan.id, this.currentUuid], {
          queryParams: { dashboard: 'cooperative' }
        });
        return;
      }
    }

    if (this.viewSource === 'employee') {
      this.selectedLoanForDetails = loan;
      this.showLoanDetailsModal = true;
      return;
    }

    this.router.navigate(['/admin/hr/loan-management/loan-details', String(loan.id), uuidV4()], {
      state: { source: 'admin-history' }
    });
  }

  closeLoanDetailsModal(): void {
    this.showLoanDetailsModal = false;
    this.selectedLoanForDetails = null;
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

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  formatDepartmentDisplay(department?: unknown): string {
    return formatLoanDepartmentDisplay(department);
  }
  
  getTotalBorrowed(): number {
    return this.employeeLoans.reduce((sum, loan) => sum + loan.amount, 0);
  }
  
  getTotalPaid(): number {
    return this.employeeLoans.reduce((sum, loan) => sum + resolveLoanTotalPaid(loan), 0);
  }
  
  getTotalBalance(): number {
    return this.employeeLoans.reduce((sum, loan) => sum + resolveLoanOutstandingBalance(loan), 0);
  }

  getLoanResolvedPaid(loan: LoanApplication): number {
    return resolveLoanTotalPaid(loan);
  }

  getLoanResolvedBalance(loan: LoanApplication): number {
    return resolveLoanOutstandingBalance(loan);
  }

  getLoanTotalRepayable(loan: LoanApplication): number {
    return resolveLoanTotalRepayableAmount(loan);
  }

  get paginatedLoans(): LoanApplication[] {
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

  exportToExcel(): void {
    const worksheetData = this.filteredLoans.map(loan => ({
      'Loan ID': loan.loanCode || loan.id,
      'Employee ID': loan.employeeId,
      'Employee Name': loan.fullName,
      'Department': this.formatDepartmentDisplay(loan.department),
      'Purpose': this.formatPurposeDisplay(loan.purpose),
      'Loan Amount': loan.amount,
      'Interest Rate': `${loan.interestRate || 0}%`,
      'Total Paid': this.getLoanResolvedPaid(loan),
      'Current Balance': this.getLoanResolvedBalance(loan),
      'Status': loan.status,
      'Date Submitted': formatDate(loan.requestDate, 'yyyy-MM-dd', 'en-US'),
      'Approved Date': loan.approvedDate ? formatDate(loan.approvedDate, 'yyyy-MM-dd', 'en-US') : 'N/A',
      'Disbursed Date': loan.disbursedDate ? formatDate(loan.disbursedDate, 'yyyy-MM-dd', 'en-US') : 'N/A',
      'Completed Date': loan.completedDate ? formatDate(loan.completedDate, 'yyyy-MM-dd', 'en-US') : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Loan History');
    XLSX.writeFile(workbook, `${this.getHistoryFileBaseName()}.xlsx`);
  }

  exportToCSV(): void {
    const headers = [
      'Loan ID',
      'Employee ID',
      'Employee Name',
      'Department',
      'Purpose',
      'Loan Amount',
      'Interest Rate',
      'Total Paid',
      'Current Balance',
      'Status',
      'Date Submitted',
      'Approved Date',
      'Disbursed Date',
      'Completed Date'
    ];

    const csvRows = this.filteredLoans.map(loan => [
      loan.loanCode || loan.id,
      loan.employeeId,
      loan.fullName,
      this.formatDepartmentDisplay(loan.department),
      this.formatPurposeDisplay(loan.purpose),
      loan.amount,
      `${loan.interestRate || 0}%`,
      this.getLoanResolvedPaid(loan),
      this.getLoanResolvedBalance(loan),
      loan.status,
      formatDate(loan.requestDate, 'yyyy-MM-dd', 'en-US'),
      loan.approvedDate ? formatDate(loan.approvedDate, 'yyyy-MM-dd', 'en-US') : 'N/A',
      loan.disbursedDate ? formatDate(loan.disbursedDate, 'yyyy-MM-dd', 'en-US') : 'N/A',
      loan.completedDate ? formatDate(loan.completedDate, 'yyyy-MM-dd', 'en-US') : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(value => this.escapeCsvValue(value)).join(','))
    ].join('\n');

    this.downloadBlob(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), `${this.getHistoryFileBaseName()}.csv`);
  }

  printReport(): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return;
    }

    const reportDate = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
    const reportName = `employee_loan_history_${this.employeeId}_${reportDate}`;

    const styles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #2E6276; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 16px; }
        .filters-applied { background: #f8feff; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #2E6276; color: white; padding: 10px; text-align: left; }
        td { padding: 8px 10px; border-bottom: 1px solid #e3eef0; }
        tr:nth-child(even) { background: #f8feff; }
        .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
        .summary-card { background: #f8feff; padding: 15px; border-radius: 4px; text-align: center; }
        .summary-card h3 { margin: 0 0 5px 0; color: #2E6276; }
        .summary-card .value { font-size: 1.4rem; font-weight: bold; color: #2EB270; }
        .date { color: #8a8a8a; font-size: 0.9rem; }
      </style>
    `;

    const filtersApplied = this.getAppliedFiltersSummary();

    const content = `
      <html>
        <head><title>${reportName}</title>${styles}</head>
        <body>
          <div class="header">
            <div>
              <h1>Employee Loan History</h1>
              <div><strong>Employee:</strong> ${this.employeeName}</div>
              <div><strong>Employee ID:</strong> ${this.employeeId}</div>
            </div>
            <div class="date">Generated: ${formatDate(new Date(), 'medium', 'en-US')}</div>
          </div>

          <div class="summary">
            <div class="summary-card">
              <h3>Total Loans</h3>
              <div class="value">${this.filteredLoans.length}</div>
            </div>
            <div class="summary-card">
              <h3>Total Borrowed</h3>
              <div class="value">₦${this.getTotalBorrowed().toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <h3>Total Balance</h3>
              <div class="value">₦${this.getTotalBalance().toLocaleString()}</div>
            </div>
          </div>

          ${filtersApplied ? `<div class="filters-applied"><strong>Filters Applied:</strong> ${filtersApplied}</div>` : ''}

          <table>
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Date</th>
                <th>Purpose</th>
                <th>Amount</th>
                <th>Interest Rate</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${this.filteredLoans.map(loan => `
                <tr>
                  <td>${loan.loanCode || loan.id}</td>
                  <td>${formatDate(loan.requestDate, 'mediumDate', 'en-US')}</td>
                  <td>${this.formatPurposeDisplay(loan.purpose)}</td>
                  <td>₦${loan.amount.toLocaleString()}</td>
                  <td>${loan.interestRate || 0}%</td>
                  <td>₦${this.getLoanResolvedPaid(loan).toLocaleString()}</td>
                  <td>₦${this.getLoanResolvedBalance(loan).toLocaleString()}</td>
                  <td>${loan.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  }

  private getFilteredLoans(): LoanApplication[] {
    return this.employeeLoans.filter((loan) => {
      const matchesStatus = !this.statusFilter || loan.status === this.statusFilter;
      const requestTimestamp = new Date(loan.requestDate).getTime();

      if (!Number.isFinite(requestTimestamp)) {
        return matchesStatus && !this.dateFrom && !this.dateTo;
      }

      const matchesFrom = !this.dateFrom || requestTimestamp >= new Date(this.dateFrom).getTime();
      const matchesTo = !this.dateTo || requestTimestamp <= this.getEndOfDayTimestamp(this.dateTo);

      return matchesStatus && matchesFrom && matchesTo;
    });
  }

  private getEndOfDayTimestamp(dateValue: string): number {
    const endOfDay = new Date(dateValue);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay.getTime();
  }

  private getAppliedFiltersSummary(): string {
    return [
      this.statusFilter ? `status: ${this.statusFilter}` : '',
      this.dateFrom ? `dateFrom: ${this.dateFrom}` : '',
      this.dateTo ? `dateTo: ${this.dateTo}` : ''
    ].filter(Boolean).join(' • ');
  }

  private getHistoryFileBaseName(): string {
    const reportDate = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
    const employeeName = (this.employeeName || 'employee')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');
    const employeeId = (this.employeeId || 'unknown').trim().replace(/\s+/g, '_');

    return `${employeeName}_${employeeId}_${reportDate}`;
  }

  private escapeCsvValue(value: unknown): string {
    const normalized = String(value ?? '');
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private resetPagination(): void {
    this.currentPage = 1;
  }
}
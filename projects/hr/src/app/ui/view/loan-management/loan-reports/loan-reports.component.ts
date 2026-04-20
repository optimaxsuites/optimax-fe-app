import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import * as XLSX from 'xlsx';
//import { saveAs } from 'file-saver';
import { formatDate } from '@angular/common';
import { startLoanLoadProfiler } from '../../../service/loan/loan-load-profiler.util';
import {
  compareLoanSortValues,
  formatLoanDepartmentDisplay,
  formatLoanPurposeDisplay,
  formatAdvancedLoanCode,
  resolveLoanInterestAmount,
  resolveLoanTotalRepayableAmount
} from '../../../service/loan/loan-display.util';

interface LoanReportRow {
  loan: LoanApplication;
  displayPurpose: string;
  displayPurposeShort: string;
  departmentDisplay: string;
  interestAmount: number;
  totalRepayable: number;
  statusClass: string;
  statusLabel: string;
}

@Component({
  selector: 'app-loan-reports',
  templateUrl: './loan-reports.component.html',
  styleUrls: ['./loan-reports.component.scss']
})
export class LoanReportsComponent implements OnInit {
  readonly pageSize = 20;
  currentPage = 1;
  isLoading = false;
  allLoans: LoanApplication[] = [];
  filteredLoans: LoanApplication[] = [];
  filteredLoanRows: LoanReportRow[] = [];
  filteredTotalAmount = 0;
  
  // Filters
  filters = {
    loanId: '',
    employeeName: '',
    employeeId: '',
    department: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  };
  
  // Sorting
  sortField: string = 'requestDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // Available departments and statuses for dropdowns
  departments: string[] = [];
  statuses: Array<{ value: string; label: string }> = [
    { value: 'PENDING', label: 'PENDING' },
    { value: 'APPROVED', label: 'APPROVED' },
    { value: 'REJECTED', label: 'REJECTED' },
    { value: 'AWAITING_INTEREST_ACCEPTANCE', label: 'AWAITING INTEREST ACCEPTANCE' },
    { value: 'READY_FOR_DISBURSEMENT', label: 'READY FOR DISBURSEMENT' },
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'COMPLETED', label: 'COMPLETED' }
  ];
  
  // Summary stats
  summaryStats = {
    totalLoans: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalBalance: 0,
    pendingCount: 0,
    activeCount: 0,
    completedCount: 0
  };
  private readonly textFilterChanges = new Subject<void>();
  private readonly subscriptions = new Subscription();

  constructor(
    private location: Location,
    private router: Router,
    private loanApplicationService: LoanApplicationService
  ) {}

  ngOnInit() {
    this.subscriptions.add(
      this.textFilterChanges.pipe(debounceTime(250)).subscribe(() => this.applyFilters())
    );
    this.loadLoans();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onTextFilterChange(): void {
    this.textFilterChanges.next();
  }

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  formatDepartmentDisplay(department?: unknown): string {
    return formatLoanDepartmentDisplay(department);
  }

  getLoanTotalRepayable(loan: LoanApplication): number {
    return resolveLoanTotalRepayableAmount(loan);
  }

  getLoanInterestAmount(loan: LoanApplication): number {
    return resolveLoanInterestAmount(loan);
  }

  getFormattedLoanId(loan: LoanApplication): string {
    return formatAdvancedLoanCode(loan.loanCode || loan.id);
  }

  loadLoans(): void {
    const loadProfiler = startLoanLoadProfiler('advance-loan-reports');
    this.isLoading = true;
    this.loanApplicationService.getAllApplications().subscribe({
      next: (applications) => {
        this.allLoans = applications.map((loan) => ({
          ...loan,
          department: this.formatDepartmentDisplay(loan.department)
        }));
        this.filteredLoans = [...this.allLoans];
        this.extractDepartments();
        this.calculateSummaryStats();
        this.applyFilters();
        loadProfiler.success({ loans: this.allLoans.length, filtered: this.filteredLoans.length });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading loans:', error);
        loadProfiler.error({ message: 'Failed to load advance loan reports' });
        this.isLoading = false;
      }
    });
  }

  extractDepartments(): void {
    const depts = new Set(
      this.allLoans
        .map(loan => this.formatDepartmentDisplay(loan.department))
        .filter((department): department is string => Boolean(department))
    );
    this.departments = Array.from(depts).sort();
  }

  calculateSummaryStats(): void {
    this.summaryStats = {
      totalLoans: this.filteredLoans.length,
      totalAmount: this.filteredLoans.reduce((sum, loan) => sum + loan.amount, 0),
      totalPaid: this.filteredLoans.reduce((sum, loan) => sum + (loan.totalPaid || 0), 0),
      totalBalance: this.filteredLoans.reduce((sum, loan) => sum + (loan.currentBalance || 0), 0),
      pendingCount: this.filteredLoans.filter(loan => loan.status === 'PENDING').length,
      activeCount: this.filteredLoans.filter(loan => loan.status === 'ACTIVE' || loan.status === 'APPROVED').length,
      completedCount: this.filteredLoans.filter(loan => loan.status === 'COMPLETED').length
    };
  }

  applyFilters(): void {
    let results = [...this.allLoans];

    // Filter by Loan ID
    if (this.filters.loanId) {
      const term = this.filters.loanId.toLowerCase();
      results = results.filter(loan => 
        String(loan.loanCode || loan.id).toLowerCase().includes(term)
      );
    }

    // Filter by Employee Name
    if (this.filters.employeeName) {
      const term = this.filters.employeeName.toLowerCase();
      results = results.filter(loan => 
        (loan.fullName ?? '').toLowerCase().includes(term)
      );
    }

    // Filter by Employee ID
    if (this.filters.employeeId) {
      const term = this.filters.employeeId.toLowerCase();
      results = results.filter(loan => 
        String(loan.employeeId).toLowerCase().includes(term)
      );
    }

    // Filter by Department
    if (this.filters.department) {
      results = results.filter(loan => 
        this.formatDepartmentDisplay(loan.department) === this.filters.department
      );
    }

    // Filter by Status
    if (this.filters.status) {
      results = results.filter(loan => 
        loan.status === this.filters.status
      );
    }

    // Filter by Date Range
    if (this.filters.dateFrom) {
      const fromDate = new Date(this.filters.dateFrom).getTime();
      results = results.filter(loan => 
        new Date(loan.requestDate).getTime() >= fromDate
      );
    }

    if (this.filters.dateTo) {
      const toDate = new Date(this.filters.dateTo).getTime();
      results = results.filter(loan => 
        new Date(loan.requestDate).getTime() <= toDate
      );
    }

    this.filteredLoans = this.sortData(results);
    this.filteredLoanRows = this.filteredLoans.map((loan) => this.buildLoanReportRow(loan));
    this.filteredTotalAmount = this.filteredLoans.reduce((sum, loan) => sum + loan.amount, 0);
    this.calculateSummaryStats();
    this.resetPagination();
  }

  private buildLoanReportRow(loan: LoanApplication): LoanReportRow {
    const displayPurpose = this.formatPurposeDisplay(loan.purpose);

    return {
      loan,
      displayPurpose,
      displayPurposeShort: displayPurpose.length > 30 ? `${displayPurpose.slice(0, 30)}...` : displayPurpose,
      departmentDisplay: this.formatDepartmentDisplay(loan.department),
      interestAmount: this.getLoanInterestAmount(loan),
      totalRepayable: this.getLoanTotalRepayable(loan),
      statusClass: this.getStatusClass(loan.status),
      statusLabel: this.getStatusLabel(loan.status)
    };
  }

  resetFilters(): void {
    this.filters = {
      loanId: '',
      employeeName: '',
      employeeId: '',
      department: '',
      status: '',
      dateFrom: '',
      dateTo: ''
    };
    this.applyFilters();
  }

  // Sorting
  sortData(data: LoanApplication[]): LoanApplication[] {
    return [...data].sort((a, b) => {
      let valueA: string | number = '';
      let valueB: string | number = '';

      switch(this.sortField) {
        case 'loanId':
          valueA = String(a.loanCode || a.id).toLowerCase();
          valueB = String(b.loanCode || b.id).toLowerCase();
          break;
        case 'employeeName':
          valueA = (a.fullName ?? '').toLowerCase();
          valueB = (b.fullName ?? '').toLowerCase();
          break;
        case 'employeeId':
          valueA = String(a.employeeId).toLowerCase();
          valueB = String(b.employeeId).toLowerCase();
          break;
        case 'department':
            valueA = this.formatDepartmentDisplay(a.department).toLowerCase();
            valueB = this.formatDepartmentDisplay(b.department).toLowerCase();
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
        case 'status':
          valueA = a.status.toLowerCase();
          valueB = b.status.toLowerCase();
          break;
        case 'requestDate':
          valueA = new Date(a.requestDate).getTime();
          valueB = new Date(b.requestDate).getTime();
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
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  // Export to Excel
  exportToExcel(): void {
    const worksheetData = this.filteredLoans.map(loan => ({
      'Loan ID': loan.loanCode,
      'Employee ID': loan.employeeId,
      'Employee Name': loan.fullName,
      'Department': this.formatDepartmentDisplay(loan.department),
      'Purpose': loan.purpose,
      'Loan Amount': loan.amount,
      'Interest Rate': loan.interestRate + '%',
      'Interest Amount': this.getLoanInterestAmount(loan),
      'Repayable Amount': this.getLoanTotalRepayable(loan),
      'Total Paid': loan.totalPaid || 0,
      'Current Balance': loan.currentBalance || 0,
      'Repayment Period': loan.repaymentTime + ' months',
      'Status': loan.status,
      'Date Submitted': formatDate(loan.requestDate, 'yyyy-MM-dd', 'en-US'),
      'Approved Date': loan.approvedDate ? formatDate(loan.approvedDate, 'yyyy-MM-dd', 'en-US') : 'N/A',
      'Disbursed Date': loan.disbursedDate ? formatDate(loan.disbursedDate, 'yyyy-MM-dd', 'en-US') : 'N/A',
      'Completed Date': loan.completedDate ? formatDate(loan.completedDate, 'yyyy-MM-dd', 'en-US') : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Loan Reports');
    
    // Generate filename with report date
    const reportDate = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
    const filename = `loan_report_for_${reportDate}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
  }

  // Export to CSV
  exportToCSV(): void {
    const headers = [
      'Loan ID', 'Employee ID', 'Employee Name', 'Department', 'Purpose',
      'Loan Amount', 'Interest Rate', 'Interest Amount', 'Repayable Amount', 'Total Paid', 'Current Balance',
      'Repayment Period', 'Status', 'Date Submitted',
      'Approved Date', 'Start Date', 'End Date'
    ];

    const csvData = this.filteredLoans.map(loan => [
      loan.loanCode,
      loan.employeeId,
      loan.fullName,
      this.formatDepartmentDisplay(loan.department),
      loan.purpose,
      loan.amount,
      loan.interestRate + '%',
      this.getLoanInterestAmount(loan),
      this.getLoanTotalRepayable(loan),
      loan.totalPaid || 0,
      loan.currentBalance || 0,
      loan.repaymentTime + ' months',
      loan.status,
      formatDate(loan.requestDate, 'yyyy-MM-dd', 'en-US'),
      loan.approvedDate ? formatDate(loan.approvedDate, 'yyyy-MM-dd', 'en-US') : 'N/A',
      loan.disbursedDate ? formatDate(loan.disbursedDate, 'yyyy-MM-dd', 'en-US') : 'N/A',
      loan.completedDate ? formatDate(loan.completedDate, 'yyyy-MM-dd', 'en-US') : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(value => this.escapeCsvValue(value)).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const reportDate = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
    this.downloadBlob(blob, `loan_report_for_${reportDate}.csv`);
  }

  // Print Report
  printReport(): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reportDate = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
    const reportName = `loan_report_for_${reportDate}`;

    const styles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #2E6276; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .filters-applied { background: #f8feff; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #2E6276; color: white; padding: 10px; text-align: left; }
        td { padding: 8px 10px; border-bottom: 1px solid #e3eef0; }
        tr:nth-child(even) { background: #f8feff; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
        .summary-card { background: #f8feff; padding: 15px; border-radius: 4px; text-align: center; }
        .summary-card h3 { margin: 0 0 5px 0; color: #2E6276; }
        .summary-card .value { font-size: 1.4rem; font-weight: bold; color: #2EB270; }
        .date { color: #8a8a8a; font-size: 0.9rem; }
      </style>
    `;

    const filtersApplied = Object.entries(this.filters)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' • ');

    const content = `
      <html>
        <head><title>${reportName}</title>${styles}</head>
        <body>
          <div class="header">
            <h1>${reportName}</h1>
            <div class="date">Generated: ${formatDate(new Date(), 'medium', 'en-US')}</div>
          </div>
          
          <div class="summary">
            <div class="summary-card">
              <h3>Total Loans</h3>
              <div class="value">${this.summaryStats.totalLoans}</div>
            </div>
            <div class="summary-card">
              <h3>Total Amount</h3>
              <div class="value">₦${this.summaryStats.totalAmount.toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <h3>Total Paid</h3>
              <div class="value">₦${this.summaryStats.totalPaid.toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <h3>Total Balance</h3>
              <div class="value">₦${this.summaryStats.totalBalance.toLocaleString()}</div>
            </div>
          </div>

          ${filtersApplied ? `<div class="filters-applied"><strong>Filters Applied:</strong> ${filtersApplied}</div>` : ''}

          <table>
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Amount</th>
                <th>Interest</th>
                <th>Interest Amount</th>
                <th>Repayable Amount</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${this.filteredLoans.map(loan => `
                <tr>
                  <td>${loan.loanCode}</td>
                  <td>${loan.fullName}<br><small>${loan.employeeId}</small></td>
                  <td>${loan.department}</td>
                  <td>₦${loan.amount.toLocaleString()}</td>
                  <td>${loan.interestRate || 0}%</td>
                  <td>₦${this.getLoanInterestAmount(loan).toLocaleString()}</td>
                  <td>₦${this.getLoanTotalRepayable(loan).toLocaleString()}</td>
                  <td>₦${(loan.totalPaid || 0).toLocaleString()}</td>
                  <td>₦${(loan.currentBalance || 0).toLocaleString()}</td>
                  <td>${loan.status}</td>
                  <td>${formatDate(loan.requestDate, 'mediumDate', 'en-US')}</td>
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

  // Navigation
  // goBack(): void {
  //   this.router.navigate(['/admin/hr/loan-management/loan-dashboard']);
  // }

  // viewLoanDetails(loanId: string): void {
  //   this.router.navigate(['/admin/hr/loan-management/loan-details', loanId]);
  // }

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
    const titleCase = (str: string) =>
      str
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    switch (status) {
      case 'AWAITING_INTEREST_ACCEPTANCE':
        return titleCase('AWAITING INTEREST ACCEPTANCE');
      case 'READY_FOR_DISBURSEMENT':
        return titleCase('READY FOR DISBURSEMENT');
      default:
        return titleCase(String(status || ''));
    }
  }

  getStatusCount(status: string): number {
  return this.filteredLoans.filter(loan => loan.status === status).length;
 }

 getFilteredTotal(): number {
  return this.filteredTotalAmount;
}

  get paginatedLoans(): LoanReportRow[] {
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

  goBack(): void {
  if (window.history.length > 1) {
    this.location.back();
    return;
  }

  this.router.navigate(['/admin/hr/loan', uuidV4()]);
}

  viewLoanDetails(loanId: string | number): void {
  this.router.navigate(['/admin/hr/loan-management/loan-details', String(loanId), uuidV4()], {
    state: { source: 'reports' }
  });
}
}
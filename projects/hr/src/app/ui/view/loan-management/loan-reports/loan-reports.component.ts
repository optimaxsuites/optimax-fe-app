import { Component, OnInit, ViewEncapsulation, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanPurposeService, LoanPurposeData } from '../../../service/loan/loan-purpose.service';
import * as XLSX from 'xlsx';
import { formatDate } from '@angular/common';
import { startLoanLoadProfiler } from '../../../service/loan/loan-load-profiler.util';
import { ChangeDetectorRef } from '@angular/core';
import {
  compareLoanSortValues,
  formatLoanDepartmentDisplay,
  formatLoanPurposeDisplay,
  formatAdvancedLoanCode,
  resolveLoanLateFeeGracePeriodDays,
  resolveLoanLateFeePercentage,
  resolveLoanInterestAmount,
  resolveLoanTotalRepayableAmount,
  resolveLoanTotalLateFees
} from '../../../service/loan/loan-display.util';
import { toCsvCell } from '../../../service/loan/csv-export.util';
import { formatNaira, getLoanStatusClass, getLoanStatusLabel, hasOutstandingBalanceStatus } from '../../../service/loan/loan-format.util';

interface LoanReportRow {
  loan: LoanApplication;
  displayPurpose: string;
  displayPurposeShort: string;
  departmentDisplay: string;
  interestAmount: number;
  totalRepayable: number;
  totalLateFees: number;
  balanceWithLateFees: number;
  statusClass: string;
  statusLabel: string;
  purposeCode: string;
}

@Component({
  selector: 'app-loan-reports',
  templateUrl: './loan-reports.component.html',
  styleUrls: ['./loan-reports.component.scss'],
  encapsulation: ViewEncapsulation.None 
})
export class LoanReportsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  readonly pageSize = 10;
  currentPage = 1;
  isLoading = false;
  isDataLoaded = false;
  allLoans: LoanApplication[] = [];
  filteredLoans: LoanApplication[] = [];
  filteredLoanRows: LoanReportRow[] = [];
  filteredTotalAmount = 0;
  
  // Store loan purposes for lookup
  loanPurposes: LoanPurposeData[] = [];
  
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
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'READY_FOR_DISBURSEMENT', label: 'Disbursable' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'SKIPPED', label: 'Skipped' },
    { value: 'OVERDUE', label: 'Overdue' },
    { value: 'PAUSED', label: 'Paused' },
    { value: 'DEFAULTED', label: 'Defaulted' }
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
    private loanApplicationService: LoanApplicationService,
    private loanPurposeService: LoanPurposeService,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit() {
    this.subscriptions.add(
      this.textFilterChanges.pipe(debounceTime(250)).subscribe(() => this.applyFilters())
    );
    this.loadPurposesAndLoans();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ============================================
  // LOAD PURPOSES FIRST, THEN LOANS
  // ============================================
  
  loadPurposesAndLoans(): void {
    this.isLoading = true;
    
    // First load all loan purposes
    this.loanPurposeService.getAllPurposes(false).subscribe({
      next: (purposes: LoanPurposeData[]) => {
        this.loanPurposes = purposes;
        // Now load loans
        this.loadLoans();
      },
      error: (error) => {
        console.error('Error loading purposes:', error);
        this.loanPurposes = [];
        this.loadLoans();
      }
    });
  }

  // Purpose code lookup - EXACT SAME LOGIC as loan-details.component.ts
  getPurposeCodeDisplay(purposeCode?: string | null, purposeName?: string | null): string {
    // Robustly resolve code from name if needed, using loaded purposes
    let code = purposeCode || '';
    let name = purposeName || '';
    // Ignore 'N/A' as a valid code
    if (code.trim().toUpperCase() === 'N/A') code = '';
    if (!code && name && this.loanPurposes.length) {
      const nameTrimmed = name.trim().toLowerCase();
      const found = this.loanPurposes.find(p => p.name.trim().toLowerCase() === nameTrimmed);
      if (found) code = found.code;
    }
    return code && code !== '' ? code : 'N/A';
  }

  getPurposeDisplay(purpose?: string | null, purposeCode?: string | null): string {
    // Robustly resolve name from code if needed, using loaded purposes
    let name = purpose || '';
    let code = purposeCode || '';
    // Ignore 'N/A' as a valid code
    if (code.trim().toUpperCase() === 'N/A') code = '';
    if (!name && code && this.loanPurposes.length) {
      const codeTrimmed = code.trim();
      const found = this.loanPurposes.find(p => p.code.trim() === codeTrimmed);
      if (found) name = found.name;
    }
    return this.toTitleCase((name || '').replace(/_/g, ' ')) || 'N/A';
  }

  private toTitleCase(value: string): string {
    return value
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(' ');
  }

  loadLoans(): void {
    const loadProfiler = startLoanLoadProfiler('advance-loan-reports');
    
    this.loanApplicationService.getApplicationsObservable().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (applications) => {
        if (!applications || applications.length === 0) {
          this.loanApplicationService.refreshApplications().subscribe({
            next: (refreshedApps) => {
              this.processApplications(refreshedApps || []);
              loadProfiler.success({ loans: this.allLoans.length, filtered: this.filteredLoans.length });
              this.isLoading = false;
            },
            error: (refreshError) => {
              console.error('Error refreshing applications:', refreshError);
              this.processApplications([]);
              this.isLoading = false;
            }
          });
          return;
        }
        this.processApplications(applications);
        loadProfiler.success({ loans: this.allLoans.length, filtered: this.filteredLoans.length });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading loans from observable:', error);
        this.loanApplicationService.getAllApplications().subscribe({
          next: (applications) => {
            this.processApplications(applications || []);
            this.isLoading = false;
          },
          error: (fallbackError) => {
            console.error('Fallback also failed:', fallbackError);
            this.processApplications([]);
            this.isLoading = false;
          }
        });
      }
    });
  }

  private processApplications(applications: LoanApplication[]): void {
    this.allLoans = applications.map(loan => ({
      ...loan,
      department: this.formatDepartmentDisplay(loan.department),
      fullName: loan.fullName || `Employee ${loan.employeeId}`
    }));
    
    
    this.filteredLoans = [...this.allLoans];
    this.extractDepartments();
    this.calculateSummaryStats();
    this.applyFilters();
    this.isDataLoaded = true;
    this.cdr.detectChanges();
  }

  // ============================================
  // HELPER METHODS
  // ============================================
  
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

 getLateFeePolicyDisplay(loan: LoanApplication): string {
  const lateFee = resolveLoanLateFeePercentage(loan);
  const graceDays = resolveLoanLateFeeGracePeriodDays(loan);
  
  // Check if values exist and are valid numbers
  if (lateFee === null || lateFee === undefined || graceDays === null || graceDays === undefined) {
    return 'Not set';
  }
  
  if (lateFee === 0 && graceDays === 0) {
    return 'No late fee policy';
  }
  
  return `${lateFee}% after ${graceDays} days`;
}

  formatLateFeeAmount(amount: number): string {
    if (!amount || amount === 0) return this.formatCurrency(0);
    return this.formatCurrency(amount);
  }

  // Calculate late fees for a loan (based on principal of overdue installments)
 calculateTotalLateFees(loan: LoanApplication): number {
    // Same rule the repayment service uses to charge fees (and the dashboard shows):
    // recorded fee, else % of unpaid principal + interest once past the grace period.
    return resolveLoanTotalLateFees(loan);
  }

  // Loans still in repayment (including overdue/defaulted) for the financial summary cards
  get activeLoans(): LoanApplication[] {
    return this.allLoans.filter(loan => hasOutstandingBalanceStatus(loan.status));
  }

  get activeTotalAmount(): number {
    return this.activeLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0);
  }

  get activeTotalBalance(): number {
    return this.activeLoans.reduce((sum, loan) => sum + (loan.currentBalance || 0), 0);
  }

  get activeTotalLateFees(): number {
    return this.activeLoans.reduce((sum, loan) => sum + this.calculateTotalLateFees(loan), 0);
  }

  get activeTotalBalanceWithLateFees(): number {
    return this.activeTotalBalance + this.activeTotalLateFees;
  }

  extractDepartments(): void {
    const depts = new Set(
      this.allLoans
        .map(loan => this.formatDepartmentDisplay(loan.department))
        .filter((department): department is string => Boolean(department) && department !== 'N/A')
    );
    this.departments = Array.from(depts).sort();
  }

  calculateSummaryStats(): void {
    this.summaryStats = {
      totalLoans: this.filteredLoans.length,
      totalAmount: this.filteredLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0),
      totalPaid: this.filteredLoans.reduce((sum, loan) => sum + (loan.totalPaid || 0), 0),
      totalBalance: this.filteredLoans.reduce((sum, loan) => sum + (loan.currentBalance || 0), 0),
      pendingCount: this.filteredLoans.filter(loan => loan.status === 'PENDING').length,
      activeCount: this.filteredLoans.filter(loan => loan.status === 'ACTIVE').length,
      completedCount: this.filteredLoans.filter(loan => loan.status === 'COMPLETED').length
    };
  }

  // ============================================
  // FILTERING & SORTING
  // ============================================
  
  applyFilters(): void {
    let results = [...this.allLoans];

    if (this.filters.loanId) {
      const term = this.filters.loanId.toLowerCase();
      results = results.filter(loan => 
        String(loan.loanCode || loan.id).toLowerCase().includes(term)
      );
    }

    if (this.filters.employeeName) {
      const term = this.filters.employeeName.toLowerCase();
      results = results.filter(loan => 
        (loan.fullName ?? '').toLowerCase().includes(term)
      );
    }

    if (this.filters.employeeId) {
      const term = this.filters.employeeId.toLowerCase();
      results = results.filter(loan => 
        String(loan.employeeId).toLowerCase().includes(term)
      );
    }

    if (this.filters.department) {
      results = results.filter(loan => 
        this.formatDepartmentDisplay(loan.department) === this.filters.department
      );
    }

    if (this.filters.status) {
      results = results.filter(loan => 
        loan.status === this.filters.status
      );
    }

    if (this.filters.dateFrom) {
      const fromDate = new Date(this.filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      results = results.filter(loan => 
        new Date(loan.requestDate).getTime() >= fromDate.getTime()
      );
    }

    if (this.filters.dateTo) {
      const toDate = new Date(this.filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      results = results.filter(loan => 
        new Date(loan.requestDate).getTime() <= toDate.getTime()
      );
    }

    this.filteredLoans = this.sortData(results);
    this.filteredLoanRows = this.filteredLoans.map((loan) => this.buildLoanReportRow(loan));
    this.filteredTotalAmount = this.filteredLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0);
    this.calculateSummaryStats();
    this.resetPagination();
  }

  private buildLoanReportRow(loan: LoanApplication): LoanReportRow {
    const displayPurpose = this.formatPurposeDisplay(loan.purpose);
    const totalLateFees = this.calculateTotalLateFees(loan);
    const balanceWithLateFees = (loan.currentBalance || 0) + totalLateFees;
    
    // Use the same purpose code lookup as loan-details component
    const purposeCode = this.getPurposeCodeDisplay(loan.purposeCode, loan.purpose);
    
    return {
      loan,
      displayPurpose,
      displayPurposeShort: displayPurpose.length > 30 ? `${displayPurpose.slice(0, 30)}...` : displayPurpose,
      departmentDisplay: this.formatDepartmentDisplay(loan.department),
      interestAmount: this.getLoanInterestAmount(loan),
      totalRepayable: this.getLoanTotalRepayable(loan),
      totalLateFees,
      balanceWithLateFees,
      statusClass: this.getStatusClass(loan.status),
      statusLabel: this.getStatusLabel(loan.status),
      purposeCode
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
          valueA = a.amount || 0;
          valueB = b.amount || 0;
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
          valueA = (a.status || '').toLowerCase();
          valueB = (b.status || '').toLowerCase();
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
      this.sortDirection = field === 'requestDate' ? 'desc' : 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  // ============================================
  // STATUS HELPERS
  // ============================================
  
  getStatusClass(status: string | undefined): string {
    return getLoanStatusClass(status);
  }

  getStatusLabel(status: string | undefined): string {
    return getLoanStatusLabel(status);
  }

  getStatusCount(status: string): number {
    return this.filteredLoans.filter(loan => loan.status === status).length;
  }

  getFilteredTotal(): number {
    return this.filteredTotalAmount;
  }

  formatCurrency(amount: number): string {
    return formatNaira(amount);
  }

  // ============================================
  // PAGINATION
  // ============================================
  
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

  // ============================================
  // EXPORTS
  // ============================================
  
  exportToExcel(): void {
    const worksheetData = this.filteredLoanRows.map((row, index) => ({
      'S/N': (this.currentPage - 1) * this.pageSize + index + 1,
      'Loan ID': row.loan.loanCode,
      'Employee Name': row.loan.fullName,
      'Employee ID': row.loan.employeeId,
      'Department': row.departmentDisplay,
      'Purpose Code': row.purposeCode,
      'Purpose': row.displayPurpose,
      'Late Fee / Grace Days': this.getLateFeePolicyDisplay(row.loan),
      'Loan Amount': row.loan.amount,
      'Interest Rate': `${row.loan.interestRate || 0}%`,
      'Interest Amount': row.interestAmount,
      'Repayable Amount': row.totalRepayable,
      'Late Fee Amount': row.totalLateFees,
      'Total Paid': row.loan.totalPaid || 0,
      'Current Balance': row.balanceWithLateFees,
      'Status': row.statusLabel,
      'Date Submitted': formatDate(row.loan.requestDate, 'yyyy-MM-dd', 'en-US'),
      'Approved Date': row.loan.approvedDate ? formatDate(row.loan.approvedDate, 'yyyy-MM-dd', 'en-US') : 'N/A',
      'Disbursed Date': row.loan.disbursedDate ? formatDate(row.loan.disbursedDate, 'yyyy-MM-dd', 'en-US') : 'N/A',
      'Completed Date': row.loan.completedDate ? formatDate(row.loan.completedDate, 'yyyy-MM-dd', 'en-US') : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Loan Reports');
    
    const reportDate = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
    const filename = `loan_report_for_${reportDate}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
  }

  exportToCSV(): void {
    const headers = [
      'S/N', 'Loan ID', 'Employee Name', 'Employee ID', 'Department', 'Purpose Code', 'Purpose',
      'Late Fee / Grace Days', 'Loan Amount', 'Interest Rate', 'Interest Amount', 'Repayable Amount',
      'Late Fee Amount', 'Total Paid', 'Current Balance', 'Status', 'Date Submitted',
      'Approved Date', 'Disbursed Date', 'Completed Date'
    ];

    const csvData = this.filteredLoanRows.map((row, index) => [
      (this.currentPage - 1) * this.pageSize + index + 1,
      row.loan.loanCode,
      row.loan.fullName,
      row.loan.employeeId,
      row.departmentDisplay,
      row.purposeCode,
      row.displayPurpose,
      this.getLateFeePolicyDisplay(row.loan),
      row.loan.amount,
      `${row.loan.interestRate || 0}%`,
      row.interestAmount,
      row.totalRepayable,
      row.totalLateFees,
      row.loan.totalPaid || 0,
      row.balanceWithLateFees,
      row.statusLabel,
      formatDate(row.loan.requestDate, 'yyyy-MM-dd', 'en-US'),
      row.loan.approvedDate ? formatDate(row.loan.approvedDate, 'yyyy-MM-dd', 'en-US') : 'N/A',
      row.loan.disbursedDate ? formatDate(row.loan.disbursedDate, 'yyyy-MM-dd', 'en-US') : 'N/A',
      row.loan.completedDate ? formatDate(row.loan.completedDate, 'yyyy-MM-dd', 'en-US') : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(value => this.escapeCsvValue(value)).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const reportDate = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
    this.downloadBlob(blob, `loan_report_for_${reportDate}.csv`);
  }

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
            <h1>Loan Reports</h1>
            <div class="date">Generated: ${formatDate(new Date(), 'medium', 'en-US')}</div>
          </div>
          
          <div class="summary">
            <div class="summary-card">
              <h3>Total Loans</h3>
              <div class="value">${this.summaryStats.totalLoans}</div>
            </div>
            <div class="summary-card">
              <h3>Total Amount (Active)</h3>
              <div class="value">${this.formatCurrency(this.activeTotalAmount)}</div>
            </div>
            <div class="summary-card">
              <h3>Total Paid</h3>
              <div class="value">${this.formatCurrency(this.summaryStats.totalPaid)}</div>
            </div>
            <div class="summary-card">
              <h3>Total Balance (Active)</h3>
              <div class="value">${this.formatCurrency(this.activeTotalBalanceWithLateFees)}</div>
            </div>
          </div>

          ${filtersApplied ? `<div class="filters-applied"><strong>Filters Applied:</strong> ${filtersApplied}</div>` : ''}

          <table>
            <thead>
              <tr>
                <th>S/N</th>
                <th>Loan ID</th>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Purpose Code</th>
                <th>Purpose</th>
                <th>Late Fee / Grace Days</th>
                <th>Amount</th>
                <th>Interest</th>
                <th>Interest Amount</th>
                <th>Repayable Amount</th>
                <th>Late Fee Amount</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${this.filteredLoanRows.map((row, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${row.loan.loanCode}</td>
                  <td>${row.loan.fullName}<br><small>${row.loan.employeeId}</small></td>
                  <td>${row.loan.employeeId}</td>
                  <td>${row.departmentDisplay}</td>
                  <td>${row.purposeCode}</td>
                  <td>${row.displayPurpose}</td>
                  <td>${this.getLateFeePolicyDisplay(row.loan)}</td>
                  <td>${this.formatCurrency(row.loan.amount)}</td>
                  <td>${row.loan.interestRate || 0}%</td>
                  <td>${this.formatCurrency(row.interestAmount)}</td>
                  <td>${this.formatCurrency(row.totalRepayable)}</td>
                  <td>${this.formatLateFeeAmount(row.totalLateFees)}</td>
                  <td>${this.formatCurrency(row.loan.totalPaid || 0)}</td>
                  <td>${this.formatCurrency(row.balanceWithLateFees)}</td>
                  <td>${row.statusLabel}</td>
                  <td>${formatDate(row.loan.requestDate, 'mediumDate', 'en-US')}</td>
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

  // ============================================
  // UTILITIES
  // ============================================
  
  private escapeCsvValue(value: unknown): string {
    return toCsvCell(value);
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
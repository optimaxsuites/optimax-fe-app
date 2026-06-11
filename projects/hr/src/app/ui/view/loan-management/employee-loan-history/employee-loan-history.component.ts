import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Location, formatDate } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import * as XLSX from 'xlsx';
import { LoanApplication, RepaymentScheduleItem } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { EmployeeService } from '../../../service/employee.service';
import { LoanPurposeService, LoanPurposeData } from '../../../service/loan/loan-purpose.service';
import {
  compareLoanSortValues,
  formatLoanDepartmentDisplay,
  formatLoanPurposeDisplay,
  formatAdvancedLoanCode,
  resolveLoanLateFeeGracePeriodDays,
  resolveLoanLateFeePercentage,
  resolveLoanOutstandingBalance,
  resolveLoanTotalPaid,
  resolveLoanTotalRepayableAmount,
  resolveLoanInterestAmount
} from '../../../service/loan/loan-display.util';

interface EmployeeLoanHistoryRow {
  loan: LoanApplication;
  formattedLoanCode: string;
  purposeCode: string;
  purposeDisplay: string;
  purposeDisplayShort: string;
  lateFeePolicyDisplay: string;
  interestAmount: number;
  totalRepayable: number;
  totalLateFees: number;
  paidAmount: number;
  balanceWithLateFees: number;
  statusClass: string;
  statusLabel: string;
}

@Component({
  selector: 'app-employee-history',
  templateUrl: './employee-loan-history.component.html',
  styleUrls: ['./employee-loan-history.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class EmployeeLoanHistoryComponent implements OnInit {
  readonly pageSize = 10;
  currentPage = 1;
  employeeId: string = '';
  employeeName: string = '';
  employeeLoans: LoanApplication[] = [];
  filteredLoans: LoanApplication[] = [];
  filteredLoanRows: EmployeeLoanHistoryRow[] = [];
  isLoading: boolean = true;
  isDataLoaded: boolean = false;
  viewSource: 'admin' | 'employee' = 'admin';
  currentUuid: string = uuidV4();
  
  // Loan purposes for lookup
  loanPurposes: LoanPurposeData[] = [];

  get activeLoansCount(): number {
    return this.employeeLoans.filter(loan => loan.status === 'ACTIVE').length;
  }
  
  selectedLoanForDetails: LoanApplication | null = null;
  selectedLoanForSchedule: LoanApplication | null = null;
  showLoanDetailsModal: boolean = false;

  // Grace Period Modal Properties
  showGracePeriodModal: boolean = false;
  selectedGracePeriodLoan: LoanApplication | null = null;
  selectedGracePeriodInstallment: RepaymentScheduleItem | null = null;
  activeGracePeriodLoans: LoanApplication[] = [];
  
  // Sorting properties
  sortField: string = 'requestDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  statusFilter: '' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'READY_FOR_DISBURSEMENT' | 'ACTIVE' | 'COMPLETED' | 'SKIPPED' | 'OVERDUE' | 'PAUSED' | 'DEFAULTED' = '';
  dateFrom: string = '';
  dateTo: string = '';
  
  readonly statusOptions: Array<{ label: string; value: '' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'READY_FOR_DISBURSEMENT' | 'ACTIVE' | 'COMPLETED' | 'SKIPPED' | 'OVERDUE' | 'PAUSED' | 'DEFAULTED' }> = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Ready for Disbursement', value: 'READY_FOR_DISBURSEMENT' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Skipped', value: 'SKIPPED' },
    { label: 'Overdue', value: 'OVERDUE' },
    { label: 'Paused', value: 'PAUSED' },
    { label: 'Defaulted', value: 'DEFAULTED' }
  ];

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private loanApplicationService: LoanApplicationService,
    private employeeService: EmployeeService,
    private loanPurposeService: LoanPurposeService
  ) {}
  
  ngOnInit(): void {
    this.loanPurposeService.getAllPurposes(false).subscribe({
      next: (purposes) => {
        this.loanPurposes = purposes;
        this.viewSource = window.history.state?.source === 'employee' ? 'employee' : 'admin';
        this.currentUuid = window.history.state?.uuid || this.currentUuid;
        this.employeeName = window.history.state?.employeeName || this.employeeName;

        this.route.params.subscribe(params => {
          this.employeeId = params['employeeId'];
          this.currentUuid = params['uuid'] || this.currentUuid;
          this.loadEmployeeHistory();
        });
      },
      error: (error) => {
        console.error('Error loading purposes:', error);
        this.loadEmployeeHistory();
      }
    });
  }

  // ============================================
  // GRACE PERIOD METHODS
  // ============================================

  openGracePeriodRequest(): void {
    const activeLoans = this.employeeLoans.filter(loan => loan.status === 'ACTIVE');

    if (!activeLoans.length) {
      alert('You can only request a payment extension when you have at least one active loan.');
      return;
    }

    this.activeGracePeriodLoans = activeLoans;
    this.selectedGracePeriodLoan = activeLoans[0];
    this.selectedGracePeriodInstallment = this.getNextOpenInstallmentForLoan(activeLoans[0]);
    this.showGracePeriodModal = true;
  }

  private getNextOpenInstallmentForLoan(loan: LoanApplication): RepaymentScheduleItem | null {
    return [...(loan.repaymentSchedule || [])]
      .filter((item) => item.status === 'PENDING' || item.status === 'OVERDUE')
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())[0] || null;
  }

  closeGracePeriodModal(): void {
    this.showGracePeriodModal = false;
    this.selectedGracePeriodLoan = null;
    this.selectedGracePeriodInstallment = null;
    this.activeGracePeriodLoans = [];
  }

  onGracePeriodSubmitted(): void {
    this.closeGracePeriodModal();
    this.loadEmployeeHistory();
  }
  
  // ============================================
  // HELPER METHODS
  // ============================================
  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  formatLateFeeAmount(amount: number): string {
    if (!amount || amount === 0) return '—';
    return this.formatCurrency(amount);
  }

  getFormattedLoanCode(loan: LoanApplication): string {
    return formatAdvancedLoanCode(loan.loanCode || loan.id);
  }

  getPurposeCodeDisplay(purposeCode?: string | null, purposeName?: string | null): string {
    let code = purposeCode || '';
    if (code.trim().toUpperCase() === 'N/A') code = '';
    if (!code && purposeName && this.loanPurposes.length) {
      const nameTrimmed = purposeName.trim().toLowerCase();
      const found = this.loanPurposes.find(p => p.name.trim().toLowerCase() === nameTrimmed);
      if (found) code = found.code;
    }
    return code && code !== '' ? code : 'N/A';
  }

  getLateFeePolicyDisplay(loan: LoanApplication): string {
    const lateFee = resolveLoanLateFeePercentage(loan);
    const graceDays = resolveLoanLateFeeGracePeriodDays(loan);
    
    if (loan.status === 'PENDING') {
      return 'Pending approval';
    }
    
    if (lateFee === undefined || lateFee === null || graceDays === undefined || graceDays === null) {
      return 'Not configured';
    }
    
    if (lateFee === 0 && graceDays === 0) {
      return 'No late fee policy';
    }
    
    return `${lateFee}% after ${graceDays} days`;
  }

  calculateTotalLateFees(loan: LoanApplication): number {
    if (loan.status !== 'OVERDUE' && loan.status !== 'ACTIVE') {
      return 0;
    }
    
    const lateFeePercentage = resolveLoanLateFeePercentage(loan);
    if (!lateFeePercentage || lateFeePercentage === 0) return 0;
    
    const overdueInstallments = (loan.repaymentSchedule || []).filter(
      item => item.status === 'OVERDUE'
    );
    
    if (overdueInstallments.length === 0) return 0;
    
    let totalLateFees = 0;
    for (const installment of overdueInstallments) {
      const principalAmount = installment.principalAmount || 0;
      const lateFeeAmount = principalAmount * (lateFeePercentage / 100);
      totalLateFees += lateFeeAmount;
    }
    
    return Number(totalLateFees.toFixed(2));
  }

  // Active loans only for summary cards
  get activeLoans(): LoanApplication[] {
    return this.employeeLoans.filter(loan => loan.status === 'ACTIVE');
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

  // ============================================
  // DATA LOADING
  // ============================================
  
  loadEmployeeHistory(): void {
    this.isLoading = true;
    this.loanApplicationService.getApplicationsByEmployeeId(this.employeeId, this.employeeName).subscribe({
      next: (applications) => {
        this.employeeService.getEmployeeById(Number(this.employeeId)).toPromise()
          .then(employee => {
            this.employeeLoans = applications.map(loan => ({
              ...loan,
              fullName: employee?.fullName || loan.fullName,
              department: formatLoanDepartmentDisplay(employee?.department || loan.department)
            }));
            this.filteredLoans = [...this.employeeLoans];
            this.employeeName = employee?.fullName || (this.employeeLoans[0]?.fullName ?? '');
            this.applySort();
            this.isLoading = false;
            this.isDataLoaded = true;
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
            this.isDataLoaded = true;
          });
      },
      error: (error) => {
        this.employeeLoans = [];
        this.filteredLoans = [];
        console.error('Error loading employee history:', error);
        this.isLoading = false;
        this.isDataLoaded = true;
      }
    });
  }

  // ============================================
  // BUILD LOAN ROW
  // ============================================
  
  private buildLoanHistoryRow(loan: LoanApplication): EmployeeLoanHistoryRow {
    const displayPurpose = this.formatPurposeDisplay(loan.purpose);
    const totalLateFees = this.calculateTotalLateFees(loan);
    const balanceWithLateFees = (loan.currentBalance || 0) + totalLateFees;
    const purposeCode = this.getPurposeCodeDisplay(loan.purposeCode, loan.purpose);
    
    return {
      loan,
      formattedLoanCode: this.getFormattedLoanCode(loan),
      purposeCode,
      purposeDisplay: displayPurpose,
      purposeDisplayShort: displayPurpose.length > 30 ? `${displayPurpose.slice(0, 30)}...` : displayPurpose,
      lateFeePolicyDisplay: this.getLateFeePolicyDisplay(loan),
      interestAmount: resolveLoanInterestAmount(loan),
      totalRepayable: resolveLoanTotalRepayableAmount(loan),
      totalLateFees,
      paidAmount: resolveLoanTotalPaid(loan),
      balanceWithLateFees,
      statusClass: this.getStatusClass(loan.status),
      statusLabel: this.getStatusLabel(loan.status)
    };
  }

  // ============================================
  // FILTERING & SORTING
  // ============================================
  
  applySort(): void {
    this.filteredLoans = this.sortData(this.getFilteredLoans());
    this.filteredLoanRows = this.filteredLoans.map(loan => this.buildLoanHistoryRow(loan));
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

  sortData(data: LoanApplication[]): LoanApplication[] {
    return [...data].sort((a, b) => {
      let valueA: string | number = '';
      let valueB: string | number = '';

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
          valueA = resolveLoanTotalRepayableAmount(a);
          valueB = resolveLoanTotalRepayableAmount(b);
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
          valueA = resolveLoanTotalPaid(a);
          valueB = resolveLoanTotalPaid(b);
          break;
        case 'currentBalance':
          valueA = resolveLoanOutstandingBalance(a);
          valueB = resolveLoanOutstandingBalance(b);
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
    this.applySort();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
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

  // ============================================
  // STATUS HELPERS
  // ============================================
  
  getStatusClass(status: string | undefined): string {
    const statusMap: Record<string, string> = {
      'PENDING': 'status-pending',
      'APPROVED': 'status-approved',
      'READY_FOR_DISBURSEMENT': 'status-ready_for_disbursement',
      'ACTIVE': 'status-active',
      'REJECTED': 'status-rejected',
      'COMPLETED': 'status-completed',
      'SKIPPED': 'status-skipped',
      'OVERDUE': 'status-overdue',
      'DEFAULTED': 'status-defaulted',
      'PAUSED': 'status-paused'
    };
    return statusMap[status || ''] || 'status-default';
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return '';
    return status.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  get totalPaidSum(): number {
    return this.filteredLoans.reduce((sum, loan) => sum + resolveLoanTotalPaid(loan), 0);
  }

  get filteredTotalAmount(): number {
    return this.filteredLoans.reduce((sum, loan) => sum + loan.amount, 0);
  }

  // ============================================
  // PAGINATION
  // ============================================
  
  get paginatedLoanRows(): EmployeeLoanHistoryRow[] {
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
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
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
      'Loan ID': row.formattedLoanCode,
      'Purpose Code': row.purposeCode,
      'Purpose': row.purposeDisplay,
      'Late Fee / Grace Days': row.lateFeePolicyDisplay,
      'Amount': row.loan.amount,
      'Interest': `${row.loan.interestRate || 0}%`,
      'Interest Amount': row.interestAmount,
      'Repayable Amount': row.totalRepayable,
      'Late Fee Amount': row.totalLateFees,
      'Paid': row.paidAmount,
      'Balance': row.balanceWithLateFees,
      'Status': row.statusLabel,
      'Date': formatDate(row.loan.requestDate, 'yyyy-MM-dd', 'en-US')
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Loan History');
    XLSX.writeFile(workbook, `${this.getHistoryFileBaseName()}.xlsx`);
  }

  exportToCSV(): void {
    const headers = [
      'S/N', 'Loan ID', 'Purpose Code', 'Purpose', 'Late Fee / Grace Days',
      'Amount', 'Interest', 'Interest Amount', 'Repayable Amount', 'Late Fee Amount',
      'Paid', 'Balance', 'Status', 'Date'
    ];

    const csvData = this.filteredLoanRows.map((row, index) => [
      (this.currentPage - 1) * this.pageSize + index + 1,
      row.formattedLoanCode,
      row.purposeCode,
      row.purposeDisplay,
      row.lateFeePolicyDisplay,
      row.loan.amount,
      `${row.loan.interestRate || 0}%`,
      row.interestAmount,
      row.totalRepayable,
      row.totalLateFees,
      row.paidAmount,
      row.balanceWithLateFees,
      row.statusLabel,
      formatDate(row.loan.requestDate, 'yyyy-MM-dd', 'en-US')
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(value => this.escapeCsvValue(value)).join(','))
    ].join('\n');

    this.downloadBlob(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), `${this.getHistoryFileBaseName()}.csv`);
  }

  printReport(): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #2E6276; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #2E6276; color: white; padding: 10px; text-align: left; }
        td { padding: 8px 10px; border-bottom: 1px solid #e3eef0; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
        .summary-card { background: #f8feff; padding: 15px; border-radius: 4px; text-align: center; }
        .summary-card .value { font-size: 1.4rem; font-weight: bold; color: #2EB270; }
      </style>
    `;

    const content = `
      <html>
        <head><title>Employee Loan History</title>${styles}</head>
        <body>
          <h1>Loan History: ${this.employeeName}</h1>
          <div class="summary">
            <div class="summary-card"><h3>Active Loans</h3><div class="value">${this.activeLoansCount}</div></div>
            <div class="summary-card"><h3>Total Amount</h3><div class="value">${this.formatCurrency(this.activeTotalAmount)}</div></div>
            <div class="summary-card"><h3>Total Paid</h3><div class="value">${this.formatCurrency(this.totalPaidSum)}</div></div>
            <div class="summary-card"><h3>Total Balance</h3><div class="value">${this.formatCurrency(this.activeTotalBalanceWithLateFees)}</div></div>
          </div>

          <table>
            <thead>
              <tr><th>S/N</th><th>Loan ID</th><th>Purpose</th><th>Amount</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              ${this.filteredLoanRows.map((row, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${row.formattedLoanCode}</td>
                  <td>${row.purposeDisplayShort}</td>
                  <td>${this.formatCurrency(row.loan.amount)}</td>
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

  private getHistoryFileBaseName(): string {
    const reportDate = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
    const employeeName = (this.employeeName || 'employee').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    const employeeId = (this.employeeId || 'unknown').trim().replace(/\s+/g, '_');
    return `${employeeName}_${employeeId}_${reportDate}`;
  }

  private escapeCsvValue(value: unknown): string {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
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
    this.router.navigate(['/admin/hr/loan', this.currentUuid || uuidV4()]);
  }

  viewLoanDetails(loan: LoanApplication): void {
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

  viewRepaymentSchedule(loan: LoanApplication): void {
    this.selectedLoanForSchedule = loan;
    this.loanApplicationService.getApplicationById(String(loan.id)).subscribe({
      next: (latestLoan) => {
        if (latestLoan) this.selectedLoanForSchedule = latestLoan;
      },
      error: (error) => console.error('Error refreshing repayment schedule loan:', error)
    });
  }

  closeRepaymentSchedule(): void {
    this.selectedLoanForSchedule = null;
  }
}
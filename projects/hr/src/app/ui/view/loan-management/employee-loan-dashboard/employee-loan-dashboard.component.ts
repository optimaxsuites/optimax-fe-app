import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router'; 
import { Subscription } from 'rxjs';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication, RepaymentScheduleItem } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { EmployeeService } from '../../../service/employee.service';
import { startLoanLoadProfiler } from '../../../service/loan/loan-load-profiler.util';
import {
  compareLoanSortValues,
  formatLoanPurposeDisplay,
  formatLoanRepaymentDayDisplay,
  formatLoanRepaymentMonthYear,
  resolveLoanTotalRepayableAmount
} from '../../../service/loan/loan-display.util';

interface EmployeeLoanHistoryRow {
  loan: LoanApplication;
  displayId: string;
  purposeDisplay: string;
  amountDisplay: string;
  repaymentMonthYear: string;
  repaymentDay: string;
  overduePolicySummary: string;
  totalRepayableDisplay: string;
  statusClass: string;
  statusLabel: string;
}

@Component({
  selector: 'app-employee-dashboard',
  templateUrl: './employee-loan-dashboard.component.html',
  styleUrls: ['./employee-loan-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None 
})
export class EmployeeDashboardComponent implements OnInit, OnDestroy {
  private hasInitializedLoanSubscription = false;
  tableRefreshInProgress = false;

  openGracePeriodRequest(): void {
    const activeLoans = this.getActiveLoansForExtension();

    if (!activeLoans.length) {
      this.messages = [{
        severity: 'warn',
        summary: 'Extension Unavailable',
        detail: 'You can only request a payment extension when you have at least one active loan.'
      }];
      return;
    }

    this.activeGracePeriodLoans = activeLoans;
    this.selectedGracePeriodLoan = activeLoans[0];
    this.selectedGracePeriodInstallment = this.getNextOpenInstallmentForLoan(activeLoans[0]);
    this.showGracePeriodModal = true;
  }

  isValidDate(value: any): boolean {
    if (!value) return false;
    const date = value instanceof Date ? value : new Date(value);
    return !isNaN(date.getTime());
  }

  employeeName: string = '';
  employeeId: string = '';
  employeeDepartment: string = '';
  isLoading: boolean = false;
  isDataLoaded: boolean = false; 
  isInitialLoad: boolean = true;
  uuid: string = '';
  
  showHistory: boolean = true;
  showStatusUpdates: boolean = true;
  showLoanForm: boolean = false;
  showPaymentForm: boolean = false;
  showGracePeriodModal: boolean = false;
  
  loanCounts = {
    pending: 0,
    awaitingInterestAcceptance: 0,
    readyForDisbursement: 0,
    approved: 0,
    active: 0,
    skipped: 0,
    overdue: 0,
    paused: 0,
    defaulted: 0,
    rejected: 0,
    completed: 0
  };
  
  allLoans: LoanApplication[] = [];
  recentLoanRows: EmployeeLoanHistoryRow[] = [];
  private loanSubscription!: Subscription;
  selectedLoanForSchedule: LoanApplication | null = null;
  selectedLoanForDetails: LoanApplication | null = null;
  selectedPaymentLoan: LoanApplication | null = null;
  selectedPaymentInstallment: RepaymentScheduleItem | null = null;
  selectedGracePeriodLoan: LoanApplication | null = null;
  selectedGracePeriodInstallment: RepaymentScheduleItem | null = null;
  allowPaymentLoanSelection = false;
  showLoanDetailsModal: boolean = false;
  messages: Message[] = [];
  payableLoans: LoanApplication[] = [];
  activeGracePeriodLoans: LoanApplication[] = [];
  applicationUpdates: Array<{ 
    loanId: string; 
    status: LoanApplication['status']; 
    changedAt: string; 
    message: string;
    iconClass: string;
  }> = [];
  historySortField: string = 'requestDate';
  historySortDirection: 'asc' | 'desc' = 'desc';

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private loanApplicationService: LoanApplicationService,
    private employeeService: EmployeeService
  ) {}

  ngOnInit(): void {
    this.hydrateEmployeeIdentityFromSession();
    this.loadEmployeeData();
  }

  private buildFullNameFromEmployeePayload(employee: any): string {
    const firstName = String(employee?.firstName || '').trim();
    const lastName = String(employee?.lastName || '').trim();
    const joinedName = `${firstName} ${lastName}`.trim();
    return joinedName || String(employee?.fullName || employee?.name || '').trim();
  }

  private hydrateEmployeeIdentityFromSession(): void {
    const storedFullName = String(sessionStorage.getItem('fullname') || '').trim();
    const storedEmployeeId = String(sessionStorage.getItem('employeeId') || '').trim();
    const cachedCurrentEmployeeRaw = sessionStorage.getItem('currentEmployee') || localStorage.getItem('currentEmployee');

    let fullNameFromCachedEmployee = '';
    try {
      if (cachedCurrentEmployeeRaw) {
        const cachedEmployee = JSON.parse(cachedCurrentEmployeeRaw);
        fullNameFromCachedEmployee = this.buildFullNameFromEmployeePayload(cachedEmployee);
      }
    } catch {
      // Ignore malformed cached employee payload.
    }

    let fullNameFromRegistration = '';
    try {
      const rawUserRegData = sessionStorage.getItem('userRegData');
      if (rawUserRegData) {
        const parsed = JSON.parse(rawUserRegData);
        fullNameFromRegistration = String(parsed?.fullName || parsed?.fullname || parsed?.name || '').trim();
      }
    } catch {
      // Ignore malformed registration payload and continue with other safe fallbacks.
    }

    const immediateName = fullNameFromCachedEmployee || storedFullName || fullNameFromRegistration;
    if (immediateName) {
      this.employeeName = immediateName;
    }

    if (storedEmployeeId && storedEmployeeId !== 'undefined' && storedEmployeeId !== 'null') {
      this.employeeId = storedEmployeeId;
    }
  }

  ngOnDestroy(): void {
    if (this.loanSubscription) {
      this.loanSubscription.unsubscribe();
    }
  }

  get displayEmployeeName(): string {
    const directName = String(this.employeeName || '').trim();
    if (directName) {
      return directName;
    }

    const cachedCurrentEmployeeRaw = sessionStorage.getItem('currentEmployee') || localStorage.getItem('currentEmployee');
    if (cachedCurrentEmployeeRaw) {
      try {
        const cachedEmployee = JSON.parse(cachedCurrentEmployeeRaw);
        const cachedEmployeeName = this.buildFullNameFromEmployeePayload(cachedEmployee);
        if (cachedEmployeeName) {
          return cachedEmployeeName;
        }
      } catch {
        // Ignore malformed cached employee payload.
      }
    }

    const sessionFullName = String(sessionStorage.getItem('fullname') || '').trim();
    if (sessionFullName) {
      return sessionFullName;
    }

    return '';
  }

  get displayEmployeeId(): string {
    const directEmployeeId = String(this.employeeId || '').trim();
    if (directEmployeeId && directEmployeeId !== 'undefined' && directEmployeeId !== 'null') {
      return directEmployeeId;
    }

    const sessionEmployeeId = String(sessionStorage.getItem('employeeId') || '').trim();
    if (sessionEmployeeId && sessionEmployeeId !== 'undefined' && sessionEmployeeId !== 'null') {
      return sessionEmployeeId;
    }

    return '';
  }

  get recentApplicationUpdates(): Array<{ loanId: string; status: LoanApplication['status']; changedAt: string; message: string; iconClass: string }> {
    return this.applicationUpdates.slice(0, 3);
  }

  get totalBalanceSum(): number {
    return this.allLoans
      .filter(loan => loan.status === 'ACTIVE')
      .reduce((sum, loan) => sum + (loan.currentBalance || 0), 0);
  }

  getLoanTotalRepayable(loan: LoanApplication): number {
    return resolveLoanTotalRepayableAmount(loan);
  }

  formatAdvanceLoanDisplayId(loan: LoanApplication | undefined | null): string {
    if (!loan) {
      return '';
    }
    const rawCode = String(loan.loanCode || loan.id || '').trim();
    if (!rawCode) {
      return '';
    }
    return /^ADV-/i.test(rawCode) ? rawCode : `ADV-${rawCode}`;
  }

  getShortAdvanceLoanDisplayId(loan: LoanApplication | undefined | null, maxLength = 14): string {
    const displayId = this.formatAdvanceLoanDisplayId(loan);
    return displayId.length > maxLength ? `${displayId.slice(0, maxLength)}...` : displayId;
  }

  private sortLoansByRecent(loans: LoanApplication[]): LoanApplication[] {
    return [...loans].sort((a, b) => {
      const timestampA = new Date(a.requestDate).getTime();
      const timestampB = new Date(b.requestDate).getTime();
      const dateDiff = timestampB - timestampA;
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return compareLoanSortValues(String(b.loanCode || b.id), String(a.loanCode || a.id));
    });
  }

  setHistorySort(field: string): void {
    if (this.historySortField === field) {
      this.historySortDirection = this.historySortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.historySortField = field;
      this.historySortDirection = field === 'requestDate' ? 'desc' : 'asc';
    }
    this.refreshRecentLoanRows();
  }

  getHistorySortIcon(field: string): string {
    if (this.historySortField !== field) {
      return 'fa-sort';
    }
    return this.historySortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  setupLoanSubscription(): void {
    if (this.hasInitializedLoanSubscription) {
      return;
    }

    this.hasInitializedLoanSubscription = true;
    this.loanSubscription = this.loanApplicationService.getApplicationsObservable().subscribe({
      next: (applications) => {
        const employeeLoans = applications.filter((loan) => this.isCurrentEmployeeLoan(loan));
        this.allLoans = this.sortLoansByRecent(employeeLoans);
        this.syncSelectedLoanDetails();
        this.refreshPayableLoans();
        this.calculateLoanCounts();
        this.refreshApplicationUpdates();
        this.refreshRecentLoanRows();
        if (this.allLoans.length > 0 || !this.isInitialLoad) {
          this.isDataLoaded = true;
          this.isLoading = false;
          this.tableRefreshInProgress = false;
        }
      },
      error: (error) => {
        console.error('Error in loan subscription:', error);
      }
    });
  }

  loadEmployeeData(): void {
    this.isLoading = true;

    this.route.params.subscribe(params => {
      this.uuid = params['uuid'];

      const userId = this.resolveSessionUserId();
      if (!userId) {
        this.handleEmployeeLookupFailure('No logged-in user ID found in session. Please sign in again.');
        return;
      }

      this.employeeService.getEmployeeByUserId(userId).subscribe({
        next: (response) => {
          if (response) {
            this.employeeId = String(response.id || response.employeeId || this.employeeId || '');
            this.employeeName = `${response.firstName || ''} ${response.lastName || ''}`.trim() || response.fullName || this.displayEmployeeName;
            this.employeeDepartment = response.department?.name || response.department || '';
            if (this.employeeId) {
              sessionStorage.setItem('employeeId', this.employeeId);
              sessionStorage.setItem('employeeUserId', userId);
            }
          }

          this.setupLoanSubscription();
          this.loadLoanData();
        },
        error: (error) => {
          console.error(`Error loading employee for user ID ${userId}:`, error);
          this.handleEmployeeLookupFailure(`No employee record is linked to your user account (user ID ${userId}).`);
        }
      });
    });
  }

  private resolveSessionUserId(): string {
    const isUsable = (value: unknown): boolean => {
      const normalized = String(value ?? '').trim().toLowerCase();
      return !!normalized && normalized !== 'undefined' && normalized !== 'null';
    };

    const storedUserId = sessionStorage.getItem('userid') || localStorage.getItem('userid');
    if (isUsable(storedUserId)) {
      return String(storedUserId).trim();
    }

    try {
      const rawUserRegData = sessionStorage.getItem('userRegData') || localStorage.getItem('userRegData');
      if (rawUserRegData) {
        const parsed = JSON.parse(rawUserRegData);
        const payload = Array.isArray(parsed) ? parsed[0] : parsed;
        const regUserId = payload?.id ?? payload?.userId;
        if (isUsable(regUserId)) {
          return String(regUserId).trim();
        }
      }
    } catch {
      // Ignore malformed registration payload.
    }

    return '';
  }

  private handleEmployeeLookupFailure(detail: string): void {
    this.messages = [{ severity: 'warn', summary: 'Employee Not Found', detail }];

    // Fall back to any employee ID already cached for this session so the dashboard still renders.
    if (this.displayEmployeeId) {
      this.employeeId = this.displayEmployeeId;
      this.setupLoanSubscription();
      this.loadLoanData();
      return;
    }

    this.isLoading = false;
  }

  private processLoadedData(): void {
    this.allLoans = this.sortLoansByRecent(this.allLoans);
    this.syncSelectedLoanDetails();
    this.refreshPayableLoans();
    this.calculateLoanCounts();
    this.refreshApplicationUpdates();
    this.refreshRecentLoanRows();
    this.isDataLoaded = true;
  }

  loadLoanData(showTableSpinner = false): void {
  const loadProfiler = startLoanLoadProfiler('employee-loan-dashboard');
  this.tableRefreshInProgress = showTableSpinner;
  if (!this.isDataLoaded) {
    this.isLoading = true;
  }
  this.loanApplicationService.refreshApplications().subscribe({
    next: (applications) => {
      const employeeLoans = applications.filter((loan) => this.isCurrentEmployeeLoan(loan));
      this.allLoans = this.sortLoansByRecent(employeeLoans);
      this.processLoadedData();
      loadProfiler.success({ loans: this.allLoans.length, payable: this.payableLoans.length });
      this.isLoading = false;
      this.isInitialLoad = false;
      this.isDataLoaded = true;
      this.tableRefreshInProgress = false;
    },
    error: (error) => {
      console.error('Error loading loan data:', error);
      loadProfiler.error({ message: 'Failed to load employee loan dashboard' });
      this.isLoading = false;
      this.tableRefreshInProgress = false;
    }
  });
}

  refreshLoanData(showTableSpinner = false): void {
    this.loadLoanData(showTableSpinner);
  }

  private refreshRecentLoanRows(): void {
    const sortedLoans = this.sortHistoryLoans(this.allLoans);
    this.recentLoanRows = sortedLoans.slice(0, 9).map((loan) => ({
      loan,
      displayId: this.getShortAdvanceLoanDisplayId(loan),
      purposeDisplay: this.formatPurposeDisplay(loan.purpose),
      amountDisplay: this.formatCurrency(loan.amount),
      repaymentMonthYear: this.formatRepaymentMonthYear(loan.repaymentStartDate),
      repaymentDay: this.formatRepaymentDay(loan.repaymentDay),
      overduePolicySummary: this.getOverduePolicySummary(loan),
      totalRepayableDisplay: this.formatCurrency(this.getLoanTotalRepayable(loan)),
      statusClass: this.getStatusClass(loan.status).toLowerCase(),
      statusLabel: this.getStatusDisplay(loan.status)
    }));
  }

  private isCurrentEmployeeLoan(loan: LoanApplication): boolean {
    if (String(loan.employeeId) === this.employeeId) {
      return true;
    }
    return (loan.fullName ?? '').trim().toLowerCase() === this.employeeName.trim().toLowerCase();
  }

  calculateLoanCounts(): void {
    this.loanCounts = {
      pending: 0,
      awaitingInterestAcceptance: 0,
      readyForDisbursement: 0,
      approved: 0,
      active: 0,
      skipped: 0,
      overdue: 0,
      paused: 0,
      defaulted: 0,
      rejected: 0,
      completed: 0
    };
    
    this.allLoans.forEach(loan => {
      switch(loan.status) {
        case 'PENDING':
          this.loanCounts.pending++;
          break;
        case 'APPROVED':
          this.loanCounts.approved++;
          break;
        case 'READY_FOR_DISBURSEMENT':
          this.loanCounts.readyForDisbursement++;
          break;
        case 'REJECTED':
          this.loanCounts.rejected++;
          break;
        case 'COMPLETED':
          this.loanCounts.completed++;
          break;
        case 'ACTIVE':
          this.loanCounts.active++;
          break;
        case 'SKIPPED':
          this.loanCounts.skipped++;
          break;
        case 'OVERDUE':
          this.loanCounts.overdue++;
          break;
        case 'PAUSED':
          this.loanCounts.paused++;
          break;
        case 'DEFAULTED':
          this.loanCounts.defaulted++;
          break;
      }
    });
  }

  openLoanFormModal(): void {
    this.showLoanForm = true;
  }

  private sortHistoryLoans(loans: LoanApplication[]): LoanApplication[] {
    return [...loans].sort((a, b) => {
      let valueA: string | number = '';
      let valueB: string | number = '';

      switch (this.historySortField) {
        case 'loanId':
          valueA = String(a.loanCode || a.id).toLowerCase();
          valueB = String(b.loanCode || b.id).toLowerCase();
          break;
        case 'requestDate':
          valueA = new Date(a.requestDate).getTime();
          valueB = new Date(b.requestDate).getTime();
          break;
        case 'purpose':
          valueA = this.formatPurposeDisplay(a.purpose).toLowerCase();
          valueB = this.formatPurposeDisplay(b.purpose).toLowerCase();
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
          valueA = this.getStatusDisplay(a.status).toLowerCase();
          valueB = this.getStatusDisplay(b.status).toLowerCase();
          break;
        default:
          return 0;
      }

      const comparison = compareLoanSortValues(valueA, valueB);
      return this.historySortDirection === 'asc' ? comparison : -comparison;
    });
  }

  openPaymentFormModal(): void {
    this.refreshPayableLoans();

    if (!this.payableLoans.length) {
      this.messages = [{
        severity: 'warn',
        summary: 'Repayment Action Locked',
        detail: this.getPaymentActionNote()
      }];
      return;
    }

    const preferredLoan = this.getPreferredPayableLoan();
    if (!preferredLoan) {
      return;
    }

    this.selectedPaymentLoan = preferredLoan;
    this.selectedPaymentInstallment = this.getNextOpenInstallmentForLoan(preferredLoan);
    this.allowPaymentLoanSelection = true;
    this.showPaymentForm = true;
  }

  closePaymentFormModal(): void {
    this.showPaymentForm = false;
    this.selectedPaymentLoan = null;
    this.selectedPaymentInstallment = null;
    this.allowPaymentLoanSelection = false;
  }

  closeGracePeriodModal(): void {
    this.showGracePeriodModal = false;
    this.selectedGracePeriodLoan = null;
    this.selectedGracePeriodInstallment = null;
    this.activeGracePeriodLoans = [];
  }

  handlePaymentSuccess(): void {
    this.closePaymentFormModal();
    this.refreshLoanData(true);
  }

  onGracePeriodSubmitted(): void {
    this.closeGracePeriodModal();
    this.refreshLoanData(true);
  }

  closeLoanFormModal(): void {
    this.showLoanForm = false;
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
  }

  toggleStatusUpdates(): void {
    this.showStatusUpdates = !this.showStatusUpdates;
  }

  onLoanSubmitted(submittedLoan?: LoanApplication): void {
    this.showLoanForm = false;

    if (submittedLoan && this.isCurrentEmployeeLoan(submittedLoan)) {
      this.upsertLoanInDashboard(submittedLoan);
    }

    this.refreshLoanData(false);
    this.messages = [{
      severity: 'success',
      summary: 'Loan Submitted',
      detail: 'Your loan request has been submitted successfully.'
    }];
  }

  viewDetailedHistory(): void {
    if (this.uuid) {
      this.router.navigate(['/admin/hr/loan-management/employee-loan-history', this.employeeId, this.uuid], {
        state: { source: 'employee', employeeName: this.employeeName }
      });
    } else {
      this.router.navigate(['/admin/hr/loan-management/employee-loan-history', this.employeeId, uuidV4()], {
        state: { source: 'employee', employeeName: this.employeeName }
      });
    }
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/admin/hr/loan', uuidV4()]);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  formatRepaymentMonthYear(value?: string | null): string {
    return formatLoanRepaymentMonthYear(value);
  }

  formatRepaymentDay(day?: number | null): string {
    return formatLoanRepaymentDayDisplay(day);
  }

  getLateFeePercentageDisplay(loan: LoanApplication): string {
    return `${Number(loan.lateFeePercentage ?? 2).toFixed(2)}%`;
  }

  getLateFeeGracePeriodDisplay(loan: LoanApplication): string {
    const gracePeriodDays = Math.round(Number(loan.lateFeeGracePeriodDays ?? 15));
    return `${gracePeriodDays} day${gracePeriodDays === 1 ? '' : 's'}`;
  }

  getOverduePolicySummary(loan: LoanApplication): string {
    const lateFee = Number(loan.lateFeePercentage ?? 2);
    const gracePeriod = Math.round(Number(loan.lateFeeGracePeriodDays ?? 15));
    if (!lateFee && !gracePeriod) {
      return '';
    }
    return `${this.getLateFeePercentageDisplay(loan)} late fee after ${this.getLateFeeGracePeriodDisplay(loan)} grace`;
  }

  getTotalRequests(): number {
    return this.allLoans.length;
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'PENDING': return 'pending';
      case 'APPROVED': return 'approved';
      case 'READY_FOR_DISBURSEMENT': return 'ready_for_disbursement';
      case 'ACTIVE': return 'active';
      case 'REJECTED': return 'rejected';
      case 'COMPLETED': return 'completed';
      case 'SKIPPED': return 'skipped';
      case 'OVERDUE': return 'overdue';
      case 'DEFAULTED': return 'defaulted';
      case 'PAUSED': return 'paused';
      default: return status?.toLowerCase() || '';
    }
  }

  getStatusDisplay(status: string): string {
    if (!status) return '';
    if (status.toUpperCase() === 'READY_FOR_DISBURSEMENT') {
      return 'Disbursable';
    }
    return String(status)
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  getStatusIconClass(status: string): string {
    switch(status) {
      case 'PENDING': return 'pending';
      case 'APPROVED': return 'approved';
      case 'ACTIVE': return 'active';
      case 'READY_FOR_DISBURSEMENT': return 'ready';
      case 'COMPLETED': return 'completed';
      case 'REJECTED': return 'rejected';
      case 'SKIPPED': return 'skipped';
      case 'OVERDUE': return 'overdue';
      case 'DEFAULTED': return 'defaulted';
      case 'PAUSED': return 'paused';
      default: return 'pending';
    }
  }

  viewLoanDetails(loan: LoanApplication): void {
    this.selectedLoanForDetails = loan;
    this.showLoanDetailsModal = true;

    this.loanApplicationService.getApplicationById(String(loan.id)).subscribe({
      next: (latestLoan) => {
        if (!latestLoan) {
          return;
        }
        this.selectedLoanForDetails = latestLoan;
        this.replaceLoanInDashboard(latestLoan);
        this.refreshPayableLoans();
        this.calculateLoanCounts();
        this.refreshApplicationUpdates();
      },
      error: (error) => {
        console.error('Error refreshing selected loan details:', error);
      }
    });
  }

  closeLoanDetailsModal(): void {
    this.showLoanDetailsModal = false;
    this.selectedLoanForDetails = null;
  }

  viewRepaymentSchedule(loan: LoanApplication): void {
    console.log('viewRepaymentSchedule called with loan:', loan);
    this.selectedLoanForSchedule = loan;
    
    this.loanApplicationService.getApplicationById(String(loan.id)).subscribe({
      next: (latestLoan) => {
        if (latestLoan) {
          this.selectedLoanForSchedule = latestLoan;
          this.replaceLoanInDashboard(latestLoan);
        }
      },
      error: (error) => {
        console.error('Error refreshing repayment schedule loan:', error);
      }
    });
  }

  closeRepaymentSchedule(): void {
    this.selectedLoanForSchedule = null;
  }

  makePaymentFromReminder(loan: LoanApplication, installment: RepaymentScheduleItem): void {
    this.selectedPaymentLoan = loan;
    this.selectedPaymentInstallment = installment;
    this.allowPaymentLoanSelection = false;
    this.showPaymentForm = true;
  }

  private refreshPayableLoans(): void {
    this.payableLoans = this.allLoans.filter(loan =>
      (loan.status === 'ACTIVE' || loan.status === 'SKIPPED' || loan.status === 'OVERDUE') && loan.currentBalance > 0
    );
  }

  private getActiveLoansForExtension(): LoanApplication[] {
    return this.allLoans.filter((loan) => loan.status === 'ACTIVE');
  }

  private getPreferredPayableLoan(): LoanApplication | null {
    return [...this.payableLoans]
      .sort((left, right) => {
        const leftInstallment = this.getNextOpenInstallmentForLoan(left);
        const rightInstallment = this.getNextOpenInstallmentForLoan(right);
        const leftDue = new Date(leftInstallment?.dueDate || left.requestDate || 0).getTime();
        const rightDue = new Date(rightInstallment?.dueDate || right.requestDate || 0).getTime();
        return leftDue - rightDue;
      })[0] || null;
  }

  private getNextOpenInstallmentForLoan(loan: LoanApplication): RepaymentScheduleItem | null {
    return [...(loan.repaymentSchedule || [])]
      .filter((item) => item.status === 'PENDING' || item.status === 'OVERDUE')
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())[0] || null;
  }

  hasRepaymentActionLock(): boolean {
    return this.allLoans.some((loan) =>
      (loan.status === 'PAUSED' || loan.status === 'DEFAULTED') && Number(loan.currentBalance || 0) > 0
    );
  }

  getPaymentActionNote(): string {
    if (this.payableLoans.length > 0) {
      return `You can pay ${this.payableLoans.length} loan${this.payableLoans.length > 1 ? 's' : ''} right now.`;
    }
    if (this.hasRepaymentActionLock()) {
      return 'One or more loans are paused or defaulted. Repayment actions stay locked until admin restores the loan.';
    }
    return 'No repayment is due right now. Payment opens automatically when a loan becomes active, skipped, or overdue.';
  }

  private syncSelectedLoanDetails(): void {
    if (this.selectedLoanForDetails) {
      const refreshedDetailLoan = this.allLoans.find((loan) =>
        loan.id === this.selectedLoanForDetails?.id || loan.loanCode === this.selectedLoanForDetails?.loanCode
      );
      if (refreshedDetailLoan) {
        this.selectedLoanForDetails = refreshedDetailLoan;
      }
    }

    if (this.selectedLoanForSchedule) {
      const refreshedScheduleLoan = this.allLoans.find((loan) =>
        loan.id === this.selectedLoanForSchedule?.id || loan.loanCode === this.selectedLoanForSchedule?.loanCode
      );
      if (refreshedScheduleLoan) {
        this.selectedLoanForSchedule = refreshedScheduleLoan;
      }
    }
  }

  private replaceLoanInDashboard(updatedLoan: LoanApplication): void {
    const loanIndex = this.allLoans.findIndex((loan) =>
      loan.id === updatedLoan.id || loan.loanCode === updatedLoan.loanCode
    );
    if (loanIndex < 0) {
      return;
    }
    const nextLoans = [...this.allLoans];
    nextLoans[loanIndex] = updatedLoan;
    this.allLoans = this.sortLoansByRecent(nextLoans);
    this.syncSelectedLoanDetails();
  }

  private upsertLoanInDashboard(loan: LoanApplication): void {
    const loanIndex = this.allLoans.findIndex((existingLoan) =>
      existingLoan.id === loan.id || existingLoan.loanCode === loan.loanCode
    );

    if (loanIndex >= 0) {
      this.replaceLoanInDashboard(loan);
    } else {
      this.allLoans = this.sortLoansByRecent([loan, ...this.allLoans]);
      this.syncSelectedLoanDetails();
    }

    this.refreshPayableLoans();
    this.calculateLoanCounts();
    this.refreshApplicationUpdates();
    this.refreshRecentLoanRows();
    this.isDataLoaded = true;
  }

  private refreshApplicationUpdates(): void {
    const allUpdates: Array<{ 
      loanId: string; 
      status: LoanApplication['status']; 
      changedAt: string; 
      message: string;
      iconClass: string;
    }> = [];
    
    this.allLoans.forEach(loan => {
      const historyEntries = loan.statusHistory || [];
      historyEntries.forEach(item => {
        if (item.changedAt && this.isValidDate(item.changedAt)) {
          allUpdates.push({
            loanId: this.formatAdvanceLoanDisplayId(loan),
            status: item.status,
            changedAt: item.changedAt,
            message: item.notes ? item.notes : `Loan ${this.formatAdvanceLoanDisplayId(loan)} status updated to ${this.getStatusDisplay(item.status)}.`,
            iconClass: this.getStatusIconClass(item.status)
          });
        }
      });
    });
    
    this.allLoans.forEach(loan => {
      if (loan.status !== 'PENDING' && loan.requestDate) {
        const alreadyExists = allUpdates.some(update => 
          update.loanId === this.formatAdvanceLoanDisplayId(loan) && 
          update.status === loan.status &&
          Math.abs(new Date(update.changedAt).getTime() - new Date(loan.requestDate).getTime()) < 60000
        );
        if (!alreadyExists) {
          allUpdates.push({
            loanId: this.formatAdvanceLoanDisplayId(loan),
            status: loan.status,
            changedAt: loan.requestDate,
            message: `Loan ${this.formatAdvanceLoanDisplayId(loan)} is currently ${this.getStatusDisplay(loan.status)}.`,
            iconClass: this.getStatusIconClass(loan.status)
          });
        }
      }
    });
    
    const sortedUpdates = allUpdates.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
    this.applicationUpdates = sortedUpdates;
    console.log('Status updates loaded:', this.applicationUpdates.length);
  }
}
// import { IDelay } from './../../../../../../node_modules/exponential-backoff/dist/delay/delay.interface.d';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router'; 
import { Subscription } from 'rxjs';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication, RepaymentScheduleItem } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanRepaymentService } from '../../../service/loan/loan-repayment.service';
import { EmployeeService } from '../../../service/employee.service';
import {
  compareLoanSortValues,
  formatLoanPurposeDisplay,
  formatLoanRepaymentDayDisplay,
  formatLoanRepaymentMonthYear,
  resolveLoanTotalRepayableAmount
} from '../../../service/loan/loan-display.util';

@Component({
  selector: 'app-employee-dashboard',
  templateUrl: './employee-loan-dashboard.component.html',
  styleUrls: ['./employee-loan-dashboard.component.scss']
})
export class EmployeeDashboardComponent implements OnInit, OnDestroy {
  employeeName: string = 'Employee Name';
  employeeId: string = 'EMP-123';
  employeeDepartment: string = '';
  isLoading: boolean = false;
  uuid: string = '';
  
  showHistory: boolean = true;
  showStatusUpdates: boolean = true;
  showLoanForm: boolean = false;
  showPaymentForm: boolean = false;
  
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
  private loanSubscription!: Subscription;
  selectedLoanForSchedule: LoanApplication | null = null;
  selectedLoanForDetails: LoanApplication | null = null;
  showLoanDetailsModal: boolean = false;
  messages: Message[] = [];
  payableLoans: LoanApplication[] = [];
  selectedPaymentLoanId = '';
  autoMonthlyAmount = 0;
  selectedmodeofPayment = '';
  paymentReference = '';
  paymentNarration = '';
  bankName = '';
  accountName = '';
  accountNumber = '';
  cardHolderName = '';
  cardLast4 = '';
  cashReceiverName = '';
  payrollCycle = '';
  paymentFormError = '';
  applicationUpdates: Array<{ loanId: string; status: LoanApplication['status']; changedAt: string; message: string }> = [];
  historySortField: string = 'requestDate';
  historySortDirection: 'asc' | 'desc' = 'desc';

  historyColumns = [
    { header: 'Loan ID', field: 'loanCode' },
    {
      header: 'Date',
      formatter: (row: LoanApplication) => new Date(row.requestDate).toLocaleDateString()
    },
    { header: 'Purpose', field: 'purpose' },
    {
      header: 'Amount',
      formatter: (row: LoanApplication) => this.formatCurrency(row.amount)
    },
    {
      header: 'Status',
      formatter: (row: LoanApplication) => this.getStatusDisplay(row.status),
      badgeClass: (row: LoanApplication) => `status-badge status-${this.getStatusClass(row.status)}`
    }
  ];

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private loanApplicationService: LoanApplicationService,
    private loanRepaymentService: LoanRepaymentService,
    private employeeService: EmployeeService
  ) {}

  ngOnInit(): void {
    this.loadEmployeeData();
    this.setupLoanSubscription();
  }

  ngOnDestroy(): void {
    if (this.loanSubscription) {
      this.loanSubscription.unsubscribe();
    }
  }

  get sortedRecentLoans(): LoanApplication[] {
    return this.sortHistoryLoans(this.allLoans).slice(0, 5);
  }

  get recentApplicationUpdates(): Array<{ loanId: string; status: LoanApplication['status']; changedAt: string; message: string }> {
    return this.applicationUpdates.slice(0, 3);
  }

  get dashboardStatusCards(): Array<{
    label: string;
    value: number;
    tone: string;
    icon: string;
    note: string;
  }> {
    return [
      { label: 'Pending', value: this.loanCounts.pending, tone: 'pending', icon: 'fa-hourglass-half', note: 'Submitted and waiting for review' },
      { label: 'Awaiting Interest', value: this.loanCounts.awaitingInterestAcceptance, tone: 'awaiting', icon: 'fa-percent', note: 'Awaiting your decision on interest' },
      { label: 'Ready To Disburse', value: this.loanCounts.readyForDisbursement, tone: 'ready', icon: 'fa-hand-holding-dollar', note: 'Approved and lined up for release' },
      { label: 'Active', value: this.loanCounts.active, tone: 'active', icon: 'fa-check-circle', note: 'Repayments currently running' },
      { label: 'Skipped', value: this.loanCounts.skipped, tone: 'skipped', icon: 'fa-forward', note: 'Grace-adjusted repayment windows' },
      { label: 'Overdue', value: this.loanCounts.overdue, tone: 'overdue', icon: 'fa-triangle-exclamation', note: 'Repayments behind schedule' },
      { label: 'Paused', value: this.loanCounts.paused, tone: 'paused', icon: 'fa-circle-pause', note: 'Admin has temporarily locked actions' },
      { label: 'Defaulted', value: this.loanCounts.defaulted, tone: 'defaulted', icon: 'fa-shield-halved', note: 'Repayment is locked pending admin action' },
      { label: 'Rejected', value: this.loanCounts.rejected, tone: 'rejected', icon: 'fa-ban', note: 'Requests that did not pass review' },
      { label: 'Completed', value: this.loanCounts.completed, tone: 'completed', icon: 'fa-flag-checkered', note: `Total requests: ${this.getTotalRequests()}` }
    ];
  }

  get primaryDashboardStatusCards() {
    return this.dashboardStatusCards.filter((card) =>
      ['awaiting', 'ready', 'active', 'overdue'].includes(card.tone)
    );
  }

  get secondaryDashboardStatusCards() {
    return this.dashboardStatusCards.filter((card) =>
      !['awaiting', 'ready', 'active', 'overdue'].includes(card.tone)
    );
  }

  get employeeDashboardCards(): Array<{
    label: string;
    value: number;
    tone: string;
    icon: string;
    note: string;
  }> {
    return [
      { label: 'Pending', value: this.loanCounts.pending, tone: 'pending', icon: 'fa-hourglass-half', note: 'Submitted and waiting for review' },
      { label: 'Approved', value: this.loanCounts.approved, tone: 'approved', icon: 'fa-check-circle', note: 'Approved and awaiting next step' },
      { label: 'Active', value: this.loanCounts.active, tone: 'active', icon: 'fa-check-circle', note: 'Repayments currently running' },
      { label: 'Rejected', value: this.loanCounts.rejected, tone: 'rejected', icon: 'fa-ban', note: 'Requests that did not pass review' },
      { label: 'Completed', value: this.loanCounts.completed, tone: 'completed', icon: 'fa-flag-checkered', note: `Total requests: ${this.getTotalRequests()}` }
    ];
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

    return /^ADVLO-/i.test(rawCode) ? rawCode : `ADVLO-${rawCode}`;
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
  }

  getHistorySortIcon(field: string): string {
    if (this.historySortField !== field) {
      return 'fa-sort';
    }

    return this.historySortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  setupLoanSubscription(): void {
    // Subscribe to loan updates for real-time data
    this.loanSubscription = this.loanApplicationService.getApplicationsObservable().subscribe({
      next: (applications) => {
        const employeeLoans = applications.filter((loan) => this.isCurrentEmployeeLoan(loan));
        this.allLoans = this.sortLoansByRecent(employeeLoans);
        this.syncSelectedLoanDetails();
        this.refreshPayableLoans();
        this.calculateLoanCounts();
        this.refreshApplicationUpdates();
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

      const userId = (sessionStorage.getItem('userid') || '').trim();

      this.employeeService.getEmployeeByUserId(userId).subscribe({
        next: (response) => {
          // const employees = this.extractEmployees(response);
          // const matchedEmployee = this.resolveCurrentEmployee(employees);

          // if (matchedEmployee) {
          //   this.employeeName = this.getEmployeeFullName(matchedEmployee) || this.employeeName;
          //   this.employeeId = String(
          //     matchedEmployee?.id ?? matchedEmployee?.employeeId ?? matchedEmployee?.employeeCode ?? this.employeeId
          //   ).trim() || this.employeeId;
          //   this.employeeDepartment = String(
          //     matchedEmployee?.department?.name ?? matchedEmployee?.department ?? this.employeeDepartment
          //   ).trim();
          // }

          this.employeeId = response.id
          this.employeeName = `${response.firstName} ${response.lastName}`

          this.loadLoanData();
        },
        error: (error) => {
          console.error('Error resolving current employee:', error);
          this.loadLoanData();
        }
      });
    });
  }

  loadLoanData(): void {
    this.isLoading = true;
    this.loanApplicationService.getApplicationsByEmployeeId(this.employeeId, this.employeeName).subscribe({
      next: (applications) => {
        this.allLoans = this.sortLoansByRecent(applications);
        this.syncSelectedLoanDetails();
        this.refreshPayableLoans();
        this.calculateLoanCounts();
        this.refreshApplicationUpdates();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading loan data:', error);
        this.isLoading = false;
      }
    });
  }

  private isCurrentEmployeeLoan(loan: LoanApplication): boolean {
    if (String(loan.employeeId) === this.employeeId) {
      return true;
    }

    return (loan.fullName ?? '').trim().toLowerCase() === this.employeeName.trim().toLowerCase();
  }

  private extractEmployees(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.content)) {
      return response.content;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
  }

  private resolveCurrentEmployee(employees: any[]): any | undefined {
    const userRegData = this.readStoredUserRegData();
    const sessionUsername = String(sessionStorage.getItem('username') || localStorage.getItem('username') || '').trim().toLowerCase();
    const sessionUserId = String(sessionStorage.getItem('userid') || localStorage.getItem('userid') || '').trim();
    const regEmail = String(userRegData?.email || '').trim().toLowerCase();
    const regUsername = String(userRegData?.username || '').trim().toLowerCase();

    return employees.find((employee) => {
      const identifiers = [
        employee?.id,
        employee?.userId,
        employee?.user?.id,
        employee?.employeeId,
        employee?.employeeCode,
        employee?.staffId
      ]
        .map((value) => String(value ?? '').trim())
        .filter(Boolean);
      const employeeEmail = String(employee?.email || employee?.workEmail || '').trim().toLowerCase();
      const employeeUsername = String(employee?.username || employee?.userName || '').trim().toLowerCase();
      const employeeFullName = this.getEmployeeFullName(employee).toLowerCase();

      if (sessionUserId && identifiers.includes(sessionUserId)) {
        return true;
      }

      if (regEmail && employeeEmail === regEmail) {
        return true;
      }

      if (sessionUsername && (employeeUsername === sessionUsername || employeeEmail === sessionUsername || employeeFullName === sessionUsername)) {
        return true;
      }

      if (regUsername && (employeeUsername === regUsername || employeeEmail === regUsername || employeeFullName === regUsername)) {
        return true;
      }

      return false;
    });
  }

  private readStoredUserRegData(): any | null {
    const rawValue = sessionStorage.getItem('userRegData') || localStorage.getItem('userRegData');

    if (!rawValue || rawValue === 'undefined' || rawValue === 'null') {
      return null;
    }

    try {
      return JSON.parse(rawValue);
    } catch {
      return null;
    }
  }

  private getEmployeeFullName(employee: any): string {
    const fullName = String(employee?.fullName || '').trim();
    if (fullName) {
      return fullName;
    }

    return [employee?.firstName, employee?.lastName]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' ');
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
        case 'AWAITING_INTEREST_ACCEPTANCE':
          this.loanCounts.awaitingInterestAcceptance++;
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
    this.resetPaymentForm();
    this.refreshPayableLoans();

    if (!this.payableLoans.length) {
      this.messages = [{
        severity: 'warn',
        summary: 'Repayment Action Locked',
        detail: this.getPaymentActionNote()
      }];
      return;
    }

    this.showPaymentForm = true;
  }

  closePaymentFormModal(): void {
    this.showPaymentForm = false;
    this.resetPaymentForm();
  }

  onPaymentLoanSelect(loanId: string): void {
    this.selectedPaymentLoanId = loanId;
    this.autoMonthlyAmount = this.getDueAmountForLoan(loanId);
    this.paymentFormError = '';
  }

  submitPayment(): void {
    this.paymentFormError = '';

    if (!this.selectedPaymentLoanId) {
      this.paymentFormError = 'Please select a loan ID to pay.';
      return;
    }

    if (!this.selectedmodeofPayment) {
      this.paymentFormError = 'Please select a payment method.';
      return;
    }

    if (this.autoMonthlyAmount <= 0) {
      this.paymentFormError = 'No payable installment found for the selected loan.';
      return;
    }

    if (!this.validateMethodSpecificDetails()) {
      return;
    }

    this.loanRepaymentService.recordPayment(Number(this.selectedPaymentLoanId), {
      totalAmount: this.autoMonthlyAmount,
      paymentMethod: this.selectedmodeofPayment,
      paidAt: new Date().toISOString(),
      referenceNumber: this.paymentReference || undefined,
      notes: this.paymentNarration || undefined,
      receivedBy: this.cashReceiverName || undefined
    }).subscribe({
      next: () => {
        this.messages = [{
          severity: 'success',
          summary: 'Payment Recorded',
          detail: `Payment of ${this.formatCurrency(this.autoMonthlyAmount)} was recorded successfully.`
        }];
        this.closePaymentFormModal();
        this.loadLoanData();
      },
      error: () => {
        this.paymentFormError = 'Unable to process payment right now. Please try again.';
      }
    });
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

  onLoanSubmitted(): void {
    this.showLoanForm = false;
    this.loadLoanData();
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
    return `${this.getLateFeePercentageDisplay(loan)} late fee after ${this.getLateFeeGracePeriodDisplay(loan)} grace`;
  }

  getTotalRequests(): number {
    return this.allLoans.length;
  }

  // getStatusDisplay(status: string): string {
  //   switch (status) {
  //     case 'PENDING': return 'Pending';
  //     case 'AWAITING_INTEREST_ACCEPTANCE': return 'Awaiting Interest';
  //     case 'APPROVED': return 'Approved';
  //     case 'READY_FOR_DISBURSEMENT': return 'Ready for Disbursement';
  //     case 'ACTIVE': return 'Active';
  //     case 'REJECTED': return 'Rejected';
  //     case 'COMPLETED': return 'Completed';
  //     case 'SKIPPED': return 'Skipped';
  //     case 'OVERDUE': return 'Overdue';
  //     case 'DEFAULTED': return 'Defaulted';
  //     case 'PAUSED': return 'Paused';
  //     default: return status;
  //   }
  // }

getStatusClass(status: string): string {
  switch(status) {
    case 'PENDING': return 'pending';
    case 'AWAITING_INTEREST_ACCEPTANCE': return 'awaiting_interest_acceptance';
    case 'APPROVED': return 'approved';
    case 'READY_FOR_DISBURSEMENT': return 'ready_for_disbursement';
    case 'ACTIVE': return 'active';
    case 'REJECTED': return 'rejected';
    case 'COMPLETED': return 'completed';
    case 'SKIPPED': return 'skipped';
    case 'OVERDUE': return 'overdue';
    case 'DEFAULTED': return 'defaulted';
    case 'PAUSED': return 'paused';
    default: return status.toLowerCase();
  }
}

getStatusDisplay(status: string): string {
  switch(status) {
    case 'PENDING': return 'Pending';
    case 'AWAITING_INTEREST_ACCEPTANCE': return 'Awaiting Interest Acceptance';
    case 'APPROVED': return 'Approved';
    case 'READY_FOR_DISBURSEMENT': return 'Ready for Disbursement';
    case 'ACTIVE': return 'Active';
    case 'REJECTED': return 'Rejected';
    case 'COMPLETED': return 'Completed';
    case 'SKIPPED': return 'Skipped';
    case 'OVERDUE': return 'Overdue';
    case 'DEFAULTED': return 'Defaulted';
    case 'PAUSED': return 'Paused';
    default: return status;
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
    this.selectedLoanForSchedule = loan;

    this.loanApplicationService.getApplicationById(String(loan.id)).subscribe({
      next: (latestLoan) => {
        if (!latestLoan) {
          return;
        }

        this.selectedLoanForSchedule = latestLoan;
        this.replaceLoanInDashboard(latestLoan);
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
  this.selectedLoanForSchedule = loan;
  // Open payment modal for this specific installment
  // You can emit an event or open the modal directly
}
  private refreshPayableLoans(): void {
    this.payableLoans = this.allLoans.filter(loan =>
      (loan.status === 'ACTIVE' || loan.status === 'SKIPPED' || loan.status === 'OVERDUE') && loan.currentBalance > 0
    );
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

  private getDueAmountForLoan(loanId: string): number {
    const loan = this.allLoans.find(item => String(item.id) === loanId);
    if (!loan) {
      return 0;
    }

    const pendingInstallment = [...(loan.repaymentSchedule || [])]
      .filter((item: RepaymentScheduleItem) => item.status === 'PENDING' || item.status === 'OVERDUE')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    if (pendingInstallment?.totalAmount) {
      return Number(pendingInstallment.totalAmount.toFixed(2));
    }

    if (loan.repaymentAmount > 0) {
      return Number(loan.repaymentAmount.toFixed(2));
    }

    return 0;
  }

  private validateMethodSpecificDetails(): boolean {
    switch (this.selectedmodeofPayment) {
      case 'BANK_TRANSFER':
        if (!this.bankName || !this.accountName || !this.accountNumber) {
          this.paymentFormError = 'Enter bank name, account name and account number.';
          return false;
        }
        return true;
      case 'CARD':
        if (!this.cardHolderName || !this.cardLast4) {
          this.paymentFormError = 'Enter card holder name and last 4 digits.';
          return false;
        }
        return true;
      case 'CASH':
        if (!this.cashReceiverName) {
          this.paymentFormError = 'Enter cash receiver name.';
          return false;
        }
        return true;
      case 'PAYROLL_DEDUCTION':
        if (!this.payrollCycle) {
          this.paymentFormError = 'Select payroll deduction cycle.';
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  private resetPaymentForm(): void {
    this.selectedPaymentLoanId = '';
    this.autoMonthlyAmount = 0;
    this.selectedmodeofPayment = '';
    this.paymentReference = '';
    this.paymentNarration = '';
    this.bankName = '';
    this.accountName = '';
    this.accountNumber = '';
    this.cardHolderName = '';
    this.cardLast4 = '';
    this.cashReceiverName = '';
    this.payrollCycle = '';
    this.paymentFormError = '';
  }

  private refreshApplicationUpdates(): void {
    const updates = this.allLoans
      .flatMap(loan =>
        (loan.statusHistory || [])
          .filter(item => item.status !== 'PENDING')
          .map(item => ({
            loanId: this.formatAdvanceLoanDisplayId(loan),
            status: item.status,
            changedAt: item.changedAt,
            message: item.notes || `Loan ${this.formatAdvanceLoanDisplayId(loan)} status updated to ${item.status}.`
          }))
      )
      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
      .slice(0, 5);

    this.applicationUpdates = updates.map((item) => ({ ...item, loanId: String(item.loanId) }));
  }

  
}

import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanApprovalService } from '../../../service/loan/loan-approval.service';
import { RepaymentDayHelperService } from '../../../service/loan/repayment-day-helper.service';
import {
  compareLoanSortValues,
  formatLoanDepartmentDisplay,
  formatLoanPurposeDisplay,
  resolveLoanTotalRepayableAmount
} from '../../../service/loan/loan-display.util';

@Component({
  selector: 'app-loan-approval-ui',
  templateUrl: './loan-approval-ui.component.html',
  styleUrls: ['./loan-approval-ui.component.scss']
})
export class LoanApprovalUiComponent implements OnInit {
  searchTerm: string = '';
  sortField: string = 'requestDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  filters = {
    employeeId: '',
    department: '',
    status: '',
    minAmount: null as number | null,
    maxAmount: null as number | null
  };

  loanApplications: LoanApplication[] = [];
  filteredLoans: LoanApplication[] = [];
  isLoading = true;
  messages: Message[] = [];

  // Repayment day properties
  selectedRepaymentDay: number = 15;  // Add this property
  repaymentStartDate: string = '';
  availableRepaymentDays: number[] = [];
  repaymentDayWarning: string = '';

  // Approval modal properties
  showApprovalModal = false;
  selectedLoanForApproval: LoanApplication | null = null;
  proposedInterestRate: number = 0;
  proposedRepaymentDay: number = 15;
  approvalNotes: string = '';

  constructor(
    private location: Location,
    private router: Router,
    private loanApplicationService: LoanApplicationService,
    private loanApprovalService: LoanApprovalService,
    private repaymentDayHelper: RepaymentDayHelperService
  ) {}

  ngOnInit() {
    this.loadApplications();
    this.setDefaultRepaymentStartDate();
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

  getLoanTotalRepayable(loan: LoanApplication): number {
    return resolveLoanTotalRepayableAmount(loan);
  }

  openLoanDetails(loan: LoanApplication): void {
    this.viewLoanDetails(loan.id, uuidV4());
  }

  loadApplications(): void {
    this.isLoading = true;
    this.loanApplicationService.getAllApplications().subscribe({
      next: (applications) => {
        this.loanApplications = applications.map((loan) => ({
          ...loan,
          department: this.formatDepartmentDisplay(loan.department)
        }));
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading applications:', error);
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
        loan.status.toUpperCase().includes(term)
      );
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
  }

  onSearch(event: any) {
    this.searchTerm = event.target.value;
    this.applyFilters();
  }

  resetFilters() {
    this.searchTerm = '';
    this.filters = {
      employeeId: '',
      department: '',
      status: '',
      minAmount: null,
      maxAmount: null
    };
    this.sortField = 'requestDate';
    this.sortDirection = 'desc';
    this.applyFilters();
  }

  applyStatusFromCard(status: '' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED'): void {
    this.filters.status = status;
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

  getStatusClass(status: string): string {
    switch (status) {
      case 'APPROVED': return 'status-approved';
      case 'PENDING': return 'status-pending';
      case 'REJECTED': return 'status-rejected';
      case 'ACTIVE': return 'status-active';
      case 'COMPLETED': return 'status-completed';
      default: return 'status-default';
    }
  }

  get statusCounts() {
    return {
      pending: this.loanApplications.filter(loan => loan.status === 'PENDING').length,
      approved: this.loanApplications.filter(loan => loan.status === 'APPROVED').length,
      rejected: this.loanApplications.filter(loan => loan.status === 'REJECTED').length,
      active: this.loanApplications.filter(loan => loan.status === 'ACTIVE').length,
      completed: this.loanApplications.filter(loan => loan.status === 'COMPLETED').length,
      total: this.loanApplications.length
    };
  }

  // Open approval modal
 openApprovalModal(loan: LoanApplication): void {
  this.selectedLoanForApproval = loan;
  this.proposedInterestRate = this.loanApprovalService.determineInterestRate(loan);
  this.proposedRepaymentDay = loan.repaymentDay || 15;
  this.approvalNotes = '';
  
  // Set default repayment start date (1 month from today)
  const today = new Date();
  today.setMonth(today.getMonth() + 1);
  this.repaymentStartDate = today.toISOString().split('T')[0];
  this.selectedRepaymentDay = this.proposedRepaymentDay;
  
  // Update available days based on the start date
  this.onRepaymentStartDateChange(this.repaymentStartDate);
  
  this.showApprovalModal = true;
}

  // Submit approval
submitApproval(): void {
  if (!this.selectedLoanForApproval) return;
  
  // Make sure we're passing the repayment start date and day
  const repaymentStartDate = this.repaymentStartDate;
  const repaymentDay = this.proposedRepaymentDay;
  
  console.log('Submitting approval with:', {
    loanId: this.selectedLoanForApproval.id,
    interestRate: this.proposedInterestRate,
    repaymentStartDate: repaymentStartDate,
    repaymentDay: repaymentDay
  });
  
  this.loanApprovalService.approveLoan(
    this.selectedLoanForApproval.id,
    this.approvalNotes,
    this.proposedInterestRate,
    repaymentStartDate,  // Pass the start date
    repaymentDay         // Pass the day
  ).subscribe({
    next: () => {
      this.messages = [{
        severity: 'success',
        summary: 'Loan Approved',
        detail: `Loan approved with ${this.proposedInterestRate}% interest rate. Awaiting employee acceptance.`
      }];
      this.showApprovalModal = false;
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


  // Close approval modal
  closeApprovalModal(): void {
    this.showApprovalModal = false;
    this.selectedLoanForApproval = null;
  }

  // Reject loan
  rejectLoan(applicationId: string | number, reason?: string): void {
    const rejectionReason = (reason || '').trim();
    if (!rejectionReason) {
      this.messages = [{
        severity: 'warn',
        summary: 'Reason Required',
        detail: 'Please provide a rejection reason.'
      }];
      return;
    }

    this.loanApprovalService.rejectLoan(applicationId, rejectionReason).subscribe({
      next: () => {
        this.messages = [{
          severity: 'success',
          summary: 'Loan Rejected',
          detail: 'Loan rejected successfully.'
        }];
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
      this.selectedRepaymentDay = suggestedDay;
    }
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
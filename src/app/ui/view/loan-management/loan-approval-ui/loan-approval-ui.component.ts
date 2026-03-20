import { Component, OnInit } from '@angular/core';
import { Location, formatDate } from '@angular/common';
import { Router } from '@angular/router';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanApprovalService } from '../../../service/loan/loan-approval.service';
import { compareLoanSortValues, formatLoanPurposeDisplay } from '../../../service/loan/loan-display.util';

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

  constructor(
    private location: Location,
    private router: Router,
    private loanApplicationService: LoanApplicationService,
    private loanApprovalService: LoanApprovalService
  ) {}

  ngOnInit() {
    this.loadApplications();
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

  openLoanDetails(loan: LoanApplication): void {
    this.viewLoanDetails(loan.id, uuidV4());
  }

  handleLoanAction(event: { actionId: string; row: LoanApplication }) {
    if (event.actionId === 'view') {
      this.viewLoanDetails(event.row.id, uuidV4());
      return;
    }
    if (event.actionId === 'history') {
      this.seeLoanHistory(event.row.employeeId);
    }
  }

  loadApplications(): void {
    this.isLoading = true;
    this.loanApplicationService.getAllApplications().subscribe({
      next: (applications) => {
        this.loanApplications = applications;
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
        (loan.department ?? '').toLowerCase().includes(term)
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

  filterByDepartment(department: string) {
    this.filters.department = department;
    this.applyFilters();
  }

  filterByStatus(status: string) {
    this.filters.status = status;
    this.applyFilters();
  }

  filterByAmountRange(min: number, max: number) {
    this.filters.minAmount = min;
    this.filters.maxAmount = max;
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
        case 'employeeId':
          valueA = String(a.employeeId).toLowerCase();
          valueB = String(b.employeeId).toLowerCase();
          break;
        case 'fullName':
          valueA = (a.fullName ?? '').toLowerCase();
          valueB = (b.fullName ?? '').toLowerCase();
          break;
        case 'department':
          valueA = (a.department ?? '').toLowerCase();
          valueB = (b.department ?? '').toLowerCase();
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

  getSortIndicator(field: string): string {
    if (this.sortField !== field) return '';
    return this.sortDirection === 'asc' ? ' ↑' : ' ↓';
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

  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'fa-sort';
    }
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  approveLoan(applicationId: string | number): void {
    this.loanApprovalService.approveLoan(applicationId).subscribe({
      next: () => {
        this.messages = [{
          severity: 'success',
          summary: 'Loan Approved',
          detail: 'Loan approved successfully.'
        }];
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

  rejectLoan(applicationId: string | number, reason?: string): void {
    const rejectionReason = (reason || '').trim();
    if (!rejectionReason) {
      this.messages = [{
        severity: 'warn',
        summary: 'Reason Required',
        detail: 'Please provide a rejection reason from the loan details screen.'
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

  getDocumentNames(loan: LoanApplication): string {
    if (!loan.supportingDocuments || loan.supportingDocuments.length === 0) {
      return '';
    }

    return loan.supportingDocuments.map((document) => document.name).join(', ');
  }

  formatFileSize(sizeInBytes: number): string {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    }

    if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    }

    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/admin/hr/loan', uuidV4()]);
  }
}

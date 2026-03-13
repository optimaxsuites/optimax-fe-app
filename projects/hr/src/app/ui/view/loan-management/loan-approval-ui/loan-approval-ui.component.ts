import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanApprovalService } from '../../../service/loan/loan-approval.service';

@Component({
  selector: 'app-loan-approval-ui',
  templateUrl: './loan-approval-ui.component.html',
  styleUrls: ['./loan-approval-ui.component.scss']
})
export class LoanApprovalUiComponent implements OnInit {
  searchTerm: string = '';
  
  // Add sorting properties only
  sortField: string = 'dateSubmitted';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // Add filter properties
  filters = {
    employeeId: '',
    department: '',
    status: '',
    minAmount: null as number | null,
    maxAmount: null as number | null
  }

  // Use service data
  loanApplications: LoanApplication[] = [];
  filteredLoans: LoanApplication[] = [];
  isLoading = true;
  messages: Message[] = [];

  loanColumns = [
    { header: 'Application ID', field: 'id' },
    { header: 'Employee', field: 'fullName' },
    { header: 'Employee ID', field: 'employeeId' },
    { header: 'Department', field: 'department' },
    {
      header: 'Loan Amount',
      formatter: (row: LoanApplication) => this.formatCurrency(row.loanAmount)
    },
    { header: 'Purpose', field: 'purpose' },
    {
      header: 'Status',
      field: 'status',
      badgeClass: (row: LoanApplication) => `status-badge ${this.getStatusClass(row.status)}`
    },
    {
      header: 'Date Submitted',
      formatter: (row: LoanApplication) => new Date(row.dateSubmitted).toLocaleDateString()
    }
  ];

  loanActions = [
    { id: 'view', label: 'View Details', className: 'btn-view' },
    { id: 'history', label: 'History', className: 'btn-history' }
  ];

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

  handleLoanAction(event: { actionId: string; row: LoanApplication }) {
    if (event.actionId === 'view') {
      this.viewLoanDetails(event.row.id, event.row.employeeId);
      return;
    }
    if (event.actionId === 'history') {
      this.seeLoanHistory(event.row.employeeId);
    }
  }

  // Load applications from service
  loadApplications(): void {
    this.isLoading = true;
    this.loanApplicationService.getAllApplications().subscribe({
      next: (applications) => {
        this.loanApplications = applications;
        this.applyFilters(); // This will now also sort
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading applications:', error);
        this.isLoading = false;
      }
    });
  }

  // Apply all filters
  applyFilters() {
    let results = [...this.loanApplications];

    // Employee ID filter
    if (this.filters.employeeId) {
      const term = this.filters.employeeId.toLowerCase();
      results = results.filter(loan => 
        loan.employeeId.toLowerCase().includes(term)
      );
    }

    // Department filter
    if (this.filters.department) {
      const term = this.filters.department.toLowerCase();
      results = results.filter(loan => 
        loan.department.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.filters.status) {
      const term = this.filters.status.toUpperCase();
      results = results.filter(loan => 
        loan.status.toUpperCase().includes(term)
      );
    }

    // Min Amount filter
    if (this.filters.minAmount !== null) {
      results = results.filter(loan => loan.loanAmount >= this.filters.minAmount!);
    }

    // Max Amount filter
    if (this.filters.maxAmount !== null) {
      results = results.filter(loan => loan.loanAmount <= this.filters.maxAmount!);
    }

    // Apply search term 
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      results = results.filter(loan => 
        loan.fullName.toLowerCase().includes(term) ||
        loan.employeeId.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    results = this.sortData(results);
    this.filteredLoans = results;
  }

  // Update search method
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
    // Reset sorting to default
    this.sortField = 'dateSubmitted';
    this.sortDirection = 'desc';
    this.applyFilters();
  }

  applyStatusFromCard(status: '' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED'): void {
    this.filters.status = status;
    this.applyFilters();
  }

  // NEW: Sorting method
  sortData(data: LoanApplication[]): LoanApplication[] {
    return [...data].sort((a, b) => {
      let valueA, valueB;

      // Get values based on sort field
      switch(this.sortField) {
        case 'dateSubmitted':
          valueA = new Date(a.dateSubmitted).getTime();
          valueB = new Date(b.dateSubmitted).getTime();
          break;
        case 'loanAmount':
          valueA = a.loanAmount;
          valueB = b.loanAmount;
          break;
        case 'employeeId':
          valueA = a.employeeId.toLowerCase();
          valueB = b.employeeId.toLowerCase();
          break;
        case 'fullName':
          valueA = a.fullName.toLowerCase();
          valueB = b.fullName.toLowerCase();
          break;
        default:
          return 0;
      }

      // Compare values
      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // NEW: Set sort field and direction
  setSort(field: string): void {
    if (this.sortField === field) {
      // Toggle direction if same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New field, default to descending for dates, ascending for others
      this.sortField = field;
      this.sortDirection = field === 'dateSubmitted' ? 'desc' : 'asc';
    }
    this.applyFilters();
  }

  // NEW: Get sort indicator
  getSortIndicator(field: string): string {
    if (this.sortField !== field) return '';
    return this.sortDirection === 'asc' ? ' ↑' : ' ↓';
  }

  // Add status class method
  getStatusClass(status: string): string {
    switch(status) {
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

  // Get sort icon class
  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'fa-sort'; // Default unsorted icon
    }
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  // Approve/Reject methods
  approveLoan(applicationId: string): void {
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

  rejectLoan(applicationId: string, reason?: string): void {
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

  viewLoanDetails(applicationId: string, uuid: string) {
    this.router.navigate(['/admin/hr/loan-management/loan-details', applicationId, uuid], {
      state: { source: 'approval' }
    });
  }

  seeLoanHistory(employeeId: string) {
    this.router.navigate(['/admin/hr/loan-management/employee-loan-history', employeeId, uuidV4()], {
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

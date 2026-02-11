import { employeeDTO } from './../../../domain/employee.dto';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoanService, LoanApplication } from '../../../service/loan/loan.service'; // Add this import

@Component({
  selector: 'app-loan-approval-ui',
  templateUrl: './loan-approval-ui.component.html',
  styleUrls: ['./loan-approval-ui.component.scss']
})
export class LoanApprovalUiComponent implements OnInit {
  searchTerm: string = '';
  
  // Add filter properties
  filters = {
    employeeId: '',
    department: '',
    status: '',
    minAmount: null as number | null,
    maxAmount: null as number | null
  }

  // Remove mock data and use service data
  loanApplications: LoanApplication[] = []; // Changed from mock to empty
  filteredLoans: LoanApplication[] = [];
  isLoading = true; // Add loading state

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
    private router: Router,
    private loanService: LoanService // Inject LoanService
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
    this.loanService.getAllApplications().subscribe({
      next: (applications) => {
        this.loanApplications = applications;
        this.filteredLoans = [...applications];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading applications:', error);
        // Fallback to mock data if service fails (for demo)
        this.loadMockData();
        this.isLoading = false;
      }
    });
  }

  // Fallback method if service fails
  loadMockData(): void {
    // You can keep your mock data as fallback
    const mockData: LoanApplication[] = [
      {
        id: 'LN-001', employeeId: 'EMP-001', fullName: 'Ayasa', department: 'Finance',
        loanAmount: 50000, status: 'PENDING', dateSubmitted: '2024-01-15',
        purpose: 'Medical Emergency', repaymentPeriod: 12, monthlyRepayment: 4166.67, acknowledgment: true,
        interestRate: 0,
        currentBalance: 0,
        totalPaid: 0,
        statusHistory: [],
        repaymentSchedule: [],
        paymentHistory: []
      },
      // ... keep your other mock data but format it as LoanApplication
    ];
    this.loanApplications = mockData;
    this.filteredLoans = [...mockData];
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
    this.filteredLoans = [...this.loanApplications];
  }

  // Add status class method
  getStatusClass(status: string): string {
    switch(status) {
      case 'APPROVED': return 'status-approved';
      case 'PENDING': return 'status-pending';
      case 'REJECTED': return 'status-rejected';
      default: return 'status-default';
    }
  }

  // ADD THESE METHODS FOR APPROVE/REJECT
  approveLoan(applicationId: string): void {
    if (confirm('Are you sure you want to approve this loan?')) {
      this.loanService.updateApplicationStatus(applicationId, 'APPROVED').subscribe({
        next: () => {
          alert('Loan approved successfully!');
          this.loadApplications(); // Refresh the list
        },
        error: (error) => {
          console.error('Error approving loan:', error);
          alert('Failed to approve loan');
        }
      });
    }
  }

  rejectLoan(applicationId: string): void {
    if (confirm('Are you sure you want to reject this loan?')) {
      this.loanService.updateApplicationStatus(applicationId, 'REJECTED').subscribe({
        next: () => {
          alert('Loan rejected successfully!');
          this.loadApplications(); // Refresh the list
        },
        error: (error) => {
          console.error('Error rejecting loan:', error);
          alert('Failed to reject loan');
        }
      });
    }
  }

viewLoanDetails(applicationId: string, employeeId: string) {
  // Navigate with both employeeId and optional UUID if needed
  this.router.navigate(['/admin/hr/loan-management/loan-details', employeeId]);
}

seeLoanHistory(employeeId: string) {
  // Navigate to employee history page
  this.router.navigate(['/admin/hr/loan-management/employee-loan-history', employeeId]);
}
}

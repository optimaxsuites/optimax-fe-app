import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';

@Component({
  selector: 'app-employee-history',
  templateUrl: './employee-loan-history.component.html',
  styleUrls: ['./employee-loan-history.component.scss']
})
export class EmployeeLoanHistoryComponent implements OnInit {
  employeeId: string = '';
  employeeName: string = '';
  employeeLoans: LoanApplication[] = [];
  filteredLoans: LoanApplication[] = [];
  isLoading: boolean = true;
  viewSource: 'admin' | 'employee' = 'admin';
  selectedLoanForDetails: LoanApplication | null = null;
  showLoanDetailsModal: boolean = false;
  
  // Sorting properties
  sortField: string = 'dateSubmitted';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private loanApplicationService: LoanApplicationService
  ) {}
  
  ngOnInit(): void {
    this.viewSource = window.history.state?.source === 'employee' ? 'employee' : 'admin';

    this.route.params.subscribe(params => {
      this.employeeId = params['employeeId'];
      this.loadEmployeeHistory();
    });
  }
  
  loadEmployeeHistory(): void {
    this.isLoading = true;
    this.loanApplicationService.getApplicationsByEmployeeId(this.employeeId).subscribe({
      next: (applications) => {
        this.employeeLoans = applications;
        this.filteredLoans = [...applications];
        
        if (this.employeeLoans.length > 0) {
          this.employeeName = this.employeeLoans[0].fullName;
        }
        
        // Apply initial sorting
        this.applySort();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading employee history:', error);
        this.isLoading = false;
      }
    });
  }
  
  // Sorting method
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
        case 'interestRate':
          valueA = a.interestRate;
          valueB = b.interestRate;
          break;
        case 'loanId':
          valueA = a.id.toLowerCase();
          valueB = b.id.toLowerCase();
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
      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // Apply sorting
  applySort(): void {
    this.filteredLoans = this.sortData(this.employeeLoans);
  }

  // Set sort field and direction
  setSort(field: string): void {
    if (this.sortField === field) {
      // Toggle direction if same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New field, default to descending for dates, ascending for others
      this.sortField = field;
      this.sortDirection = field === 'dateSubmitted' ? 'desc' : 'asc';
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
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/admin/hr/loan', uuidV4()]);
  }
  
  viewLoanDetails(loan: LoanApplication): void {
    if (this.viewSource === 'employee') {
      this.selectedLoanForDetails = loan;
      this.showLoanDetailsModal = true;
      return;
    }

    this.router.navigate(['/admin/hr/loan-management/loan-details', loan.id, uuidV4()], {
      state: { source: 'admin-history' }
    });
  }

  closeLoanDetailsModal(): void {
    this.showLoanDetailsModal = false;
    this.selectedLoanForDetails = null;
  }
  
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
  
  getTotalBorrowed(): number {
    return this.employeeLoans.reduce((sum, loan) => sum + loan.loanAmount, 0);
  }
  
  getTotalPaid(): number {
    return this.employeeLoans.reduce((sum, loan) => sum + loan.totalPaid, 0);
  }
  
  getTotalBalance(): number {
    return this.employeeLoans.reduce((sum, loan) => sum + loan.currentBalance, 0);
  }
}
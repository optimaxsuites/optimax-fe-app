import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoan } from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-cooperative-loans',
  templateUrl: './cooperative-loans.component.html',
  styleUrls: ['./cooperative-loans.component.scss']
})
export class CooperativeLoansComponent implements OnInit {
  loans: CooperativeLoan[] = [];
  filteredLoans: CooperativeLoan[] = [];
  isLoading = true;
  searchTerm = '';

  // Filters
  filters = {
    status: '',
    minAmount: null as number | null,
    maxAmount: null as number | null
  };

  // Sorting
  sortField = 'applicationDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  statusOptions = ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED'];

  constructor(
    private cooperativeService: CooperativeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLoans();
  }

  loadLoans(): void {
    this.isLoading = true;
    this.cooperativeService.getLoans().subscribe(loans => {
      this.loans = loans;
      this.applyFilters();
      this.isLoading = false;
    });
  }

  applyFilters(): void {
    let results = [...this.loans];

    // Search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      results = results.filter(loan => 
        loan.loanId.toLowerCase().includes(term) ||
        loan.purpose.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.filters.status) {
      results = results.filter(loan => loan.status === this.filters.status);
    }

    // Amount range
    if (this.filters.minAmount !== null) {
      results = results.filter(loan => loan.amount >= this.filters.minAmount!);
    }
    if (this.filters.maxAmount !== null) {
      results = results.filter(loan => loan.amount <= this.filters.maxAmount!);
    }

    this.filteredLoans = this.sortData(results);
  }

  sortData(data: CooperativeLoan[]): CooperativeLoan[] {
    return data.sort((a, b) => {
      let valueA: any, valueB: any;

      switch(this.sortField) {
        case 'loanId':
          valueA = a.loanId;
          valueB = b.loanId;
          break;
        case 'amount':
          valueA = a.amount;
          valueB = b.amount;
          break;
        case 'status':
          valueA = a.status;
          valueB = b.status;
          break;
        case 'applicationDate':
          valueA = new Date(a.applicationDate).getTime();
          valueB = new Date(b.applicationDate).getTime();
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
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

  resetFilters(): void {
    this.searchTerm = '';
    this.filters = { status: '', minAmount: null, maxAmount: null };
    this.sortField = 'applicationDate';
    this.sortDirection = 'desc';
    this.applyFilters();
  }

  viewLoan(id: string): void {
    this.router.navigate([`/admin/hr/cooperative/loans/${id}`]);
  }

  newApplication(): void {
    this.router.navigate(['/admin/hr/cooperative/apply']);
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/cooperative/dashboard']);
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  get pendingCount(): number {
  return this.loans.filter(l => l.status === 'PENDING').length;
  }

  get activeCount(): number {
    return this.loans.filter(l => l.status === 'ACTIVE').length;
  }

  get completedCount(): number {
    return this.loans.filter(l => l.status === 'COMPLETED').length;
  }

  get totalPortfolio(): number {
    return this.loans
      .filter(l => l.status === 'ACTIVE')
      .reduce((sum, l) => sum + l.amount, 0);
  }
}
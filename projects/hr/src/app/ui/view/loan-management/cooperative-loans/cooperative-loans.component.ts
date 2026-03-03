import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoan, CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-cooperative-loans',
  templateUrl: './cooperative-loans.component.html',
  styleUrls: ['./cooperative-loans.component.scss']
})
export class CooperativeLoansComponent implements OnInit {
  loans: CooperativeLoan[] = [];
  filteredLoans: CooperativeLoan[] = [];
  members: CooperativeMember[] = [];
  isLoading = true;
  showApplicationModal = false;
  statusFilter: '' | 'PENDING' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' = '';

  // Sorting
  sortField = 'applicationDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  statusOptions: Array<{ label: string; value: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' }> = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Defaulted', value: 'DEFAULTED' }
  ];

  constructor(
    private cooperativeService: CooperativeService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const status = params.get('status');
      if (status === 'PENDING' || status === 'APPROVED' || status === 'ACTIVE' || status === 'COMPLETED' || status === 'DEFAULTED') {
        this.statusFilter = status;
      }
      this.applyFilters();
    });

    this.loadLoans();
  }

  loadLoans(): void {
    this.isLoading = true;
    this.cooperativeService.getMembers().subscribe(members => {
      this.members = members;
    });

    this.cooperativeService.getLoans().subscribe(loans => {
      this.loans = loans;
      this.applyFilters();
      this.isLoading = false;
    });
  }

  applyFilters(): void {
    let results = [...this.loans];

    // Status filter
    if (this.statusFilter) {
      results = results.filter(loan => loan.status === this.statusFilter);
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
    this.statusFilter = '';
    this.sortField = 'applicationDate';
    this.sortDirection = 'desc';
    this.applyFilters();
  }

  setStatusFilter(status: '' | 'PENDING' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED'): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  viewLoan(id: string): void {
    this.router.navigate([`/admin/hr/cooperative/loans/${id}/${uuidV4()}`]);
  }

  reviewLoan(id: string): void {
    this.router.navigate([`/admin/hr/cooperative/loans/${id}/${uuidV4()}`], {
      queryParams: { mode: 'review' }
    });
  }

  newApplication(): void {
    this.showApplicationModal = true;
  }

  closeApplicationModal(): void {
    this.showApplicationModal = false;
  }

  onApplicationSubmitted(): void {
    this.loadLoans();
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/cooperative/dashboard', uuidV4()]);
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  getMemberName(memberId: string): string {
    const member = this.members.find(item => item.id === memberId);
    return member?.fullName || memberId;
  }

  getRelativeDate(dateValue: string): string {
    const now = Date.now();
    const timestamp = new Date(dateValue).getTime();
    const diffMs = Math.max(0, now - timestamp);
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (days < 1) {
      return 'today';
    }

    if (days < 30) {
      return `${days}d ago`;
    }

    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }

  get pendingCount(): number {
    return this.loans.filter(l => l.status === 'PENDING').length;
  }

  get approvedCount(): number {
    return this.loans.filter(l => l.status === 'APPROVED').length;
  }

  get activeCount(): number {
    return this.loans.filter(l => l.status === 'ACTIVE').length;
  }

  get completedCount(): number {
    return this.loans.filter(l => l.status === 'COMPLETED').length;
  }

  get defaultedCount(): number {
    return this.loans.filter(l => l.status === 'DEFAULTED').length;
  }

  get totalPortfolio(): number {
    return this.loans
      .filter(l => l.status === 'ACTIVE')
      .reduce((sum, l) => sum + l.amount, 0);
  }
}
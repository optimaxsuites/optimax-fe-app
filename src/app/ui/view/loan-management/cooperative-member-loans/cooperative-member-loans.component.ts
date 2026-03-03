import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoan, CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-cooperative-member-loans',
  templateUrl: './cooperative-member-loans.component.html',
  styleUrls: ['./cooperative-member-loans.component.scss']
})
export class CooperativeMemberLoansComponent implements OnInit {
  currentMemberId = '1';
  member?: CooperativeMember;
  loans: CooperativeLoan[] = [];
  filteredLoans: CooperativeLoan[] = [];
  isLoading = true;
  statusFilter: '' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' = '';

  constructor(
    private cooperativeService: CooperativeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLoans();
  }

  loadLoans(): void {
    this.isLoading = true;
    this.member = this.cooperativeService.getMemberById(this.currentMemberId);
    this.loans = this.member ? this.cooperativeService.getLoansByMember(this.member.id) : [];
    this.applyFilters();
    this.isLoading = false;
  }

  applyFilters(): void {
    if (!this.statusFilter) {
      this.filteredLoans = [...this.loans].sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
      return;
    }

    this.filteredLoans = this.loans
      .filter(loan => loan.status === this.statusFilter)
      .sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
  }

  setStatusFilter(status: '' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED'): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  viewLoanDetails(id: string): void {
    this.router.navigate(['/member/cooperative/loans', id, uuidV4()]);
  }

  goBack(): void {
    this.router.navigate(['/member/cooperative/dashboard', uuidV4()]);
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  get pendingCount(): number {
    return this.loans.filter(item => item.status === 'PENDING').length;
  }

  get activeCount(): number {
    return this.loans.filter(item => item.status === 'ACTIVE').length;
  }

  get completedCount(): number {
    return this.loans.filter(item => item.status === 'COMPLETED').length;
  }

  get defaultedCount(): number {
    return this.loans.filter(item => item.status === 'DEFAULTED').length;
  }
}

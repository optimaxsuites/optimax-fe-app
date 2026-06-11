import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import { CooperativeLoan } from '../../../../ui/domain/loan/cooperative-loan.dto';
import { CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-cooperative-member-loans',
  templateUrl: './cooperative-member-loans.component.html',
  styleUrls: ['./cooperative-member-loans.component.scss']
})
export class CooperativeMemberLoansComponent implements OnInit {
  readonly statusOptions: Array<'' | 'PENDING' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'ACTIVE' | 'SKIPPED' | 'OVERDUE' | 'PAUSED' | 'COMPLETED' | 'DEFAULTED' | 'REJECTED'> = [
    '',
    'PENDING',
    'APPROVED',
    'READY_FOR_DISBURSEMENT',
    'ACTIVE',
    'SKIPPED',
    'OVERDUE',
    'PAUSED',
    'COMPLETED',
    'DEFAULTED',
    'REJECTED'
  ];
  currentUuid = uuidV4();
  currentMemberId = 0;
  member?: CooperativeMember;
  loans: CooperativeLoan[] = [];
  filteredLoans: CooperativeLoan[] = [];
  isLoading = true;
  statusFilter: '' | 'PENDING' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'ACTIVE' | 'SKIPPED' | 'OVERDUE' | 'PAUSED' | 'COMPLETED' | 'DEFAULTED' | 'REJECTED' = '';

  constructor(
    private cooperativeService: CooperativeService,
    private route: ActivatedRoute,
    private router: Router,
    private backNavigationService: BackNavigationService
  ) {}

  ngOnInit(): void {
    const routeUuid = this.route.snapshot.paramMap.get('uuid');
    if (routeUuid) {
      this.currentUuid = routeUuid;
    }

    this.loadLoans();
  }

  loadLoans(): void {
    this.isLoading = true;

    this.cooperativeService.getMembers().subscribe({
      next: (members) => {
        this.currentMemberId = this.resolveCurrentMemberId(members);
        this.member = members.find(item => item.id === this.currentMemberId || item.memberId === this.currentMemberId);
        this.cooperativeService.getLoans().subscribe({
          next: (loans) => {
            this.loans = loans
              .filter((loan) => {
                const loanMemberId = Number(loan.cooperativeMemberId || loan.memberId || 0);
                const memberId = Number(this.member?.id || this.member?.memberId || this.currentMemberId || 0);
                return loanMemberId === memberId;
              })
              .sort((left, right) => new Date(right.requestDate || right.applicationDate || '').getTime() - new Date(left.requestDate || left.applicationDate || '').getTime());
            this.applyFilters();
            this.isLoading = false;
          },
          error: () => {
            this.loans = [];
            this.filteredLoans = [];
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.member = this.cooperativeService.getMemberById(this.currentMemberId || 1);
        this.cooperativeService.getLoans().subscribe({
          next: (loans) => {
            const memberId = Number(this.member?.id || this.member?.memberId || this.currentMemberId || 0);
            this.loans = loans
              .filter((loan) => Number(loan.cooperativeMemberId || loan.memberId || 0) === memberId)
              .sort((left, right) => new Date(right.requestDate || right.applicationDate || '').getTime() - new Date(left.requestDate || left.applicationDate || '').getTime());
            this.applyFilters();
            this.isLoading = false;
          },
          error: () => {
            this.loans = [];
            this.filteredLoans = [];
            this.isLoading = false;
          }
        });
      }
    });
  }

  private resolveCurrentMemberId(members: CooperativeMember[]): number {
    const matched = this.cooperativeService.resolveCurrentSessionMember(members);
    return matched?.id ?? members[0]?.id ?? 1;
  }

  applyFilters(): void {
    if (!this.statusFilter) {
      this.filteredLoans = [...this.loans].sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
      return;
    }

    this.filteredLoans = this.loans
      .filter(loan => loan.status === this.statusFilter)
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }

  setStatusFilter(status: '' | 'PENDING' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'ACTIVE' | 'SKIPPED' | 'OVERDUE' | 'PAUSED' | 'COMPLETED' | 'DEFAULTED' | 'REJECTED'): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  viewLoanDetails(id: string): void {
    this.router.navigate(['/member/cooperative/loans', id, this.currentUuid]);
  }

  goBack(): void {
    this.backNavigationService.goBack(['/member/cooperative/dashboard', this.currentUuid]);
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

  get approvedCount(): number {
    return this.loans.filter(item => item.status === 'APPROVED').length;
  }

  get readyForDisbursementCount(): number {
    return this.loans.filter(item => item.status === 'READY_FOR_DISBURSEMENT').length;
  }

  get skippedCount(): number {
    return this.loans.filter(item => item.status === 'SKIPPED').length;
  }

  get overdueCount(): number {
    return this.loans.filter(item => item.status === 'OVERDUE').length;
  }

  get pausedCount(): number {
    return this.loans.filter(item => item.status === 'PAUSED').length;
  }

  get completedCount(): number {
    return this.loans.filter(item => item.status === 'COMPLETED').length;
  }

  get defaultedCount(): number {
    return this.loans.filter(item => item.status === 'DEFAULTED').length;
  }

  get rejectedCount(): number {
    return this.loans.filter(item => item.status === 'REJECTED').length;
  }

  getStatusLabel(status: string): string {
    return String(status || '').replaceAll('_', ' ');
  }

  get memberDisplayName(): string {
    return this.member
      ? this.cooperativeService.getMemberDisplayName(this.member.id || this.member.memberId || this.member.employeeId)
      : 'Cooperative Member';
  }
}

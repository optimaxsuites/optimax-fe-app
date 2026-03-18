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
  currentUuid = uuidV4();
  currentMemberId = '';
  member?: CooperativeMember;
  loans: CooperativeLoan[] = [];
  filteredLoans: CooperativeLoan[] = [];
  isLoading = true;
  statusFilter: '' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' = '';

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
        this.redirectToSharedHistory(this.member?.id || this.currentMemberId || '1');
      },
      error: () => {
        this.member = this.cooperativeService.getMemberById(this.currentMemberId || '1');
        this.redirectToSharedHistory(this.member?.id || this.currentMemberId || '1');
      }
    });
  }

  private redirectToSharedHistory(memberId: string): void {
    this.isLoading = false;
    this.router.navigate(['/admin/hr/loan-management/employee-loan-history', memberId, this.currentUuid], {
      state: { source: 'employee', cooperative: true, uuid: this.currentUuid },
      replaceUrl: true
    });
  }

  private resolveCurrentMemberId(members: CooperativeMember[]): string {
    const sessionUserId = String(sessionStorage.getItem('userid') || '').trim();
    const sessionUsername = String(sessionStorage.getItem('username') || '').trim().toLowerCase();
    const userRegRaw = sessionStorage.getItem('userRegData');
    const userRegData = userRegRaw ? JSON.parse(userRegRaw) : null;
    const regEmail = String(userRegData?.email || '').trim().toLowerCase();

    const matched = members.find(member => {
      const memberId = String(member.id || '').trim();
      const memberCode = String(member.memberId || '').trim();
      const memberEmail = String(member.email || '').trim().toLowerCase();
      const memberName = String(member.fullName || '').trim().toLowerCase();

      if (sessionUserId && (memberId === sessionUserId || memberCode === sessionUserId)) {
        return true;
      }

      if (regEmail && memberEmail === regEmail) {
        return true;
      }

      if (sessionUsername && (memberEmail === sessionUsername || memberName === sessionUsername)) {
        return true;
      }

      return false;
    });

    return matched?.id || members[0]?.id || '1';
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

  setStatusFilter(status: '' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED'): void {
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

  get completedCount(): number {
    return this.loans.filter(item => item.status === 'COMPLETED').length;
  }

  get defaultedCount(): number {
    return this.loans.filter(item => item.status === 'DEFAULTED').length;
  }
}

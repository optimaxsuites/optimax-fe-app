import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoan } from '../../../../ui/domain/loan/cooperative-loan.dto';
import { CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';
import { formatLoanPurposeDisplay } from '../../../service/loan/loan-display.util';

interface RepaymentHistoryItem {
  loanId: string;
  paidAmount: number;
  outstandingAmount: number;
  lastPaymentDate: string;
  status: 'PAID' | 'ONGOING' | 'PENDING';
}

@Component({
  selector: 'app-cooperative-member-detail',
  templateUrl: './cooperative-member-detail.component.html',
  styleUrls: ['./cooperative-member-detail.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CooperativeMemberDetailComponent implements OnInit {
  currentUuid = uuidV4();
  member!: CooperativeMember;
  memberLoans: CooperativeLoan[] = [];
  activeGroups: Array<{
    groupId: number;
    groupName: string;
    monthlyContributionAmount: number;
    totalContribution: number;
    joinedAt: string;
  }> = [];

  pageSize = 5;
  currentPage = 1;
  isLoading = true;
  private returnSource = '';
  private returnGroupId?: number;

  get formattedMemberId(): string {
    if (!this.member || !this.member.memberId) return '';
    return `COP-${this.member.memberId.toString().padStart(3, '0')}`;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public cooperativeService: CooperativeService
  ) {}

  ngOnInit(): void {
    this.returnSource = this.route.snapshot.queryParamMap.get('source') || '';
    const groupId = Number(this.route.snapshot.queryParamMap.get('groupId') || 0);
    this.returnGroupId = Number.isFinite(groupId) && groupId > 0 ? groupId : undefined;

    this.route.params.subscribe(params => {
      let id = params['id'];
      this.currentUuid = params['uuid'] || this.currentUuid;
      if (!id) {
        // No id in route, use current session user
        this.cooperativeService.getMembers().subscribe(members => {
          const current = this.cooperativeService.resolveCurrentSessionMember(members);
          if (current) {
            this.loadMember(current.id.toString());
          } else {
            this.isLoading = false;
          }
        });
      } else {
        this.loadMember(id);
      }
    });
  }

  // Helper method to format status display - Uses label map for common statuses
  private readonly statusLabelMap: Record<string, string> = {
  PENDING: 'Pending',
    APPROVED: 'Approved',
    ACTIVE: 'Active',
    REJECTED: 'Rejected',
    OVERDUE: 'Overdue',
    PAUSED: 'Paused',
    SKIPPED: 'Skipped',
    DEFAULTED: 'Defaulted',
    COMPLETED: 'Completed',
    READY_FOR_DISBURSEMENT: 'Ready For Disbursement',
    INACTIVE: 'Inactive',
    SUSPENDED: 'Suspended',
    PAID: 'Paid',
    ONGOING: 'Ongoing'
  };

  public formatStatusDisplay(status: string): string {
    console.log('Formatting status:', status);
    if (!status) return '';
    return this.statusLabelMap[status] || status
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // Helper method to get group name by ID
  public getGroupName(groupId: number | undefined): string {
    if (!groupId) return '—';
    const group = this.cooperativeService.getGroupById(groupId);
    return group?.name || '—';
  }

  loadMember(id: string): void {
    this.isLoading = true;
    this.cooperativeService.loadMemberById(Number(id)).subscribe(member => {
      if (!member) {
        this.isLoading = false;
        return;
      }

      this.member = member;
      this.cooperativeService.getLoans().subscribe(loans => {
        this.memberLoans = loans.filter(loan => (loan.memberId || loan.cooperativeMemberId) === member.id);
        this.cooperativeService.loadGroupMembershipsForMember(member).subscribe({
          next: memberships => {
            // DEBUG: Log raw memberships data
            console.log('Raw group memberships for member', member, memberships);
            this.activeGroups = memberships
              .filter(membership => membership.status === 'ACTIVE')
              .map(membership => ({
                groupId: membership.groupId,
                groupName: this.cooperativeService.getGroupById(membership.groupId)?.name || 'Unknown Group',
                monthlyContributionAmount: Number(membership.monthlyContributionAmount || 0),
                totalContribution: Number(membership.totalContribution || 0),
                joinedAt: membership.joinedAt || membership.requestedAt || ''
              }));
            this.isLoading = false;
          },
          error: () => {
            this.activeGroups = [];
            this.isLoading = false;
          }
        });
      });
    });
  }

  viewAllMemberLoans(): void {
    this.router.navigate([
      '/admin/hr/loan-management/cooperative-member-loan-history',
      this.member.id,
      this.currentUuid
    ], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  viewLoan(id: string | number): void {
    this.router.navigate(['/admin/hr/cooperative/loans', id.toString(), this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  goBack(): void {
    window.history.back();
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  getTotalBorrowed(): number {
    return this.memberLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0);
  }

  getActiveLoans(): CooperativeLoan[] {
    return this.memberLoans.filter(loan => loan.status === 'ACTIVE');
  }

  getCompletedLoans(): CooperativeLoan[] {
    return this.memberLoans.filter(loan => loan.status === 'COMPLETED');
  }

  get memberTenureMonths(): number {
    if (!this.member || !this.member.joinDate) return 0;
    const join = new Date(this.member.joinDate);
    const now = new Date();
    return (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth());
  }

  getRepaymentHistory(): RepaymentHistoryItem[] {
    // Dummy implementation, replace with real logic if needed
    return [];
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.memberLoans.length / this.pageSize));
  }

  get paginatedLoans(): CooperativeLoan[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.memberLoans.slice(start, start + this.pageSize);
  }


  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  // Add scroll methods
  scrollToGroups(): void {
    const element = document.getElementById('groups-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

 scrollToLoans(): void {
  const element = document.getElementById('loans-section');
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
}
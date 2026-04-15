import { Component, OnInit } from '@angular/core';
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
  styleUrls: ['./cooperative-member-detail.component.scss']
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
  isLoading = true;
  private returnSource = '';
  private returnGroupId?: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cooperativeService: CooperativeService
  ) {}

  ngOnInit(): void {
    this.returnSource = this.route.snapshot.queryParamMap.get('source') || '';
    const groupId = Number(this.route.snapshot.queryParamMap.get('groupId') || 0);
    this.returnGroupId = Number.isFinite(groupId) && groupId > 0 ? groupId : undefined;

    this.route.params.subscribe(params => {
      const id = params['id'];
      this.currentUuid = params['uuid'] || this.currentUuid;
      this.loadMember(id);
    });

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
    this.router.navigate(['/admin/hr/cooperative/loans', this.currentUuid], {
      queryParams: { memberId: this.member.id, dashboard: 'cooperative' }
    });
  }

  viewLoan(id: string | number): void {
    this.router.navigate(['/admin/hr/cooperative/loans', id.toString(), this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  goBack(): void {
    if (this.returnSource === 'group-dashboard') {
      const targetCommands = this.returnGroupId
        ? ['/member/cooperative/groups', this.returnGroupId, this.currentUuid]
        : ['/member/cooperative/dashboard', this.currentUuid];

      this.router.navigate(targetCommands, {
        replaceUrl: true,
        state: {
          memberId: Number(this.member?.id || 0) || undefined,
          source: 'group-dashboard',
          groupId: this.returnGroupId
        }
      }).then((navigated) => {
        if (navigated) {
          window.dispatchEvent(new Event('resize'));
        }
      });
      return;
    }

    this.router.navigate(['/admin/hr/loan', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  getLoanStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  getTotalBorrowed(): number {
    return this.memberLoans.reduce((sum, loan) => sum + loan.amount, 0);
  }

  getActiveLoans(): CooperativeLoan[] {
    return this.memberLoans.filter(l => l.status === 'ACTIVE');
  }

  getCompletedLoans(): CooperativeLoan[] {
    return this.memberLoans.filter(l => l.status === 'COMPLETED');
  }

  get memberTenureMonths(): number {
    return this.cooperativeService.getMemberTenureMonths(this.member);
  }

  getRepaymentHistory(): RepaymentHistoryItem[] {
    return this.memberLoans
      .map(loan => {
        const paidAmount = Number(loan.totalPaid || 0);
        const lastRecordedPaymentDate = loan.paymentHistory
          .map(item => item.paidAt)
          .filter((paidAt): paidAt is string => !!paidAt)
          .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
        let status: 'PAID' | 'ONGOING' | 'PENDING' = 'PENDING';

        if (loan.status === 'COMPLETED') {
          status = 'PAID';
        } else if (loan.status === 'ACTIVE' || loan.status === 'APPROVED') {
          status = 'ONGOING';
        }

        return {
          loanId: loan.loanCode,
          paidAmount,
          outstandingAmount: Math.max(Number(loan.outstandingPrincipal || 0), 0),
          lastPaymentDate: loan.completedDate || lastRecordedPaymentDate || loan.requestDate,
          status
        };
      })
      .sort((a, b) => new Date(b.lastPaymentDate).getTime() - new Date(a.lastPaymentDate).getTime());
  }

  getRepaymentStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }
}
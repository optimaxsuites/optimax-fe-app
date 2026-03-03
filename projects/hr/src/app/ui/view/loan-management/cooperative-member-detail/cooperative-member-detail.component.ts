import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeMember, CooperativeLoan } from '../../../service/loan/cooperative-loan/cooperative.types';

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
  member!: CooperativeMember;
  memberLoans: CooperativeLoan[] = [];
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cooperativeService: CooperativeService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      this.loadMember(id);
    });

  }

  loadMember(id: string): void {
    this.isLoading = true;
    const member = this.cooperativeService.getMemberById(id);
    
    if (member) {
      this.member = member;
      this.memberLoans = this.cooperativeService.getLoansByMember(member.id);
    }
    
    this.isLoading = false;
  }

  editMember(): void {
    this.router.navigate(['/admin/hr/cooperative/members/edit', this.member.id, uuidV4()]);
  }

  applyForLoan(): void {
    this.router.navigate(['/admin/hr/cooperative/dashboard', uuidV4()], {
      queryParams: {
        openApplication: true,
        memberId: this.member.id
      }
    });
  }

  viewAllMemberLoans(): void {
    this.router.navigate(['/admin/hr/cooperative/loans', uuidV4()], {
      queryParams: { memberId: this.member.id }
    });
  }

  viewLoan(id: string): void {
    this.router.navigate(['/admin/hr/cooperative/loans', id, uuidV4()]);
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/cooperative/members', uuidV4()]);
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
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

  getRepaymentHistory(): RepaymentHistoryItem[] {
    return this.memberLoans
      .map(loan => {
        let paidAmount = 0;
        let status: 'PAID' | 'ONGOING' | 'PENDING' = 'PENDING';

        if (loan.status === 'COMPLETED') {
          paidAmount = loan.totalRepayment;
          status = 'PAID';
        } else if (loan.status === 'ACTIVE' || loan.status === 'APPROVED') {
          paidAmount = Math.min(loan.monthlyRepayment * 2, loan.totalRepayment);
          status = 'ONGOING';
        }

        return {
          loanId: loan.loanId,
          paidAmount,
          outstandingAmount: Math.max(loan.totalRepayment - paidAmount, 0),
          lastPaymentDate: loan.completionDate || loan.updatedAt || loan.applicationDate,
          status
        };
      })
      .sort((a, b) => new Date(b.lastPaymentDate).getTime() - new Date(a.lastPaymentDate).getTime());
  }

  getRepaymentStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }
}
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeMember, CooperativeLoan } from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-cooperative-member-detail',
  templateUrl: './cooperative-member-detail.component.html',
  styleUrls: ['./cooperative-member-detail.component.scss']
})
export class CooperativeMemberDetailComponent implements OnInit {
  member!: CooperativeMember;
  memberLoans: CooperativeLoan[] = [];
  isLoading = true;
  activeTab: 'overview' | 'loans' = 'overview';

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

  setActiveTab(tab: 'overview' | 'loans'): void {
    this.activeTab = tab;
  }

  editMember(): void {
    this.router.navigate(['/admin/hr/cooperative/members/edit', this.member.id]);
  }

  applyForLoan(): void {
    this.router.navigate(['/admin/hr/cooperative/apply'], {
      queryParams: { memberId: this.member.id }
    });
  }

  viewLoan(id: string): void {
    this.router.navigate(['/admin/hr/cooperative/loans', id]);
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/cooperative/members']);
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
}
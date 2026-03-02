import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoan, CooperativeMember, CooperativeLoanProduct} from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-cooperative-loan-detail',
  templateUrl: './cooperative-loan-detail.component.html',
  styleUrls: ['./cooperative-loan-detail.component.scss']
})
export class CooperativeLoanDetailComponent implements OnInit {
  loan!: CooperativeLoan;
  member?: CooperativeMember;
  product?: CooperativeLoanProduct;
  isLoading = true;
  
  showRejectModal = false;
  rejectionReason = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cooperativeService: CooperativeService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      this.loadLoan(id);
    });
  }

  loadLoan(id: string): void {
    this.isLoading = true;
    const loan = this.cooperativeService.getLoanById(id);
    
    if (loan) {
      this.loan = loan;
      this.member = this.cooperativeService.getMemberById(loan.memberId);
      this.product = this.cooperativeService.getProductById(loan.productId);
    }
    
    this.isLoading = false;
  }

  approveLoan(): void {
    if (confirm('Approve this loan application?')) {
      this.loan.status = 'APPROVED';
      this.loan.approvedDate = new Date().toISOString();
      this.cooperativeService.updateLoan(this.loan);
    }
  }

  showRejectDialog(): void {
    this.showRejectModal = true;
  }

  rejectLoan(): void {
    if (this.rejectionReason.trim()) {
      this.loan.status = 'REJECTED';
      this.loan.rejectionReason = this.rejectionReason;
      this.cooperativeService.updateLoan(this.loan);
      this.showRejectModal = false;
      this.rejectionReason = '';
    }
  }

  cancelReject(): void {
    this.showRejectModal = false;
    this.rejectionReason = '';
  }

  disburseLoan(): void {
    if (confirm('Disburse this loan?')) {
      this.loan.status = 'ACTIVE';
      this.loan.disbursementDate = new Date().toISOString();
      this.cooperativeService.updateLoan(this.loan);
    }
  }

  completeLoan(): void {
    if (confirm('Mark this loan as completed?')) {
      this.loan.status = 'COMPLETED';
      this.loan.completionDate = new Date().toISOString();
      this.cooperativeService.updateLoan(this.loan);
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/cooperative/loans']);
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }
}
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanApprovalService } from '../../../service/loan/loan-approval.service';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';

@Component({
  selector: 'app-loan-disbursement-ui',
  templateUrl: './loan-disbursement-ui.component.html',
  styleUrls: ['./loan-disbursement-ui.component.scss']
})
export class LoanDisbursementUiComponent implements OnInit {
  currentUuid = uuidV4();
  isLoading = true;
  messages: Message[] = [];

  approvedLoans: LoanApplication[] = [];
  selectedDisbursementLoanId = '';
  disbursementDate = '';
  disbursementAmount = 0;
  disbursementRecipientType: 'BORROWER' | 'THIRD_PARTY' = 'BORROWER';
  thirdPartyName = '';

  checklistIdentityVerified = false;
  checklistAccountVerified = false;
  checklistComplianceCleared = false;
  checklistFundsReserved = false;

  approvedLoanColumns: TableColumn<LoanApplication>[] = [
    { header: 'Loan ID', field: 'id', sortable: true },
    { header: 'Employee', field: 'fullName', sortable: true },
    { header: 'Department', field: 'department', sortable: true },
    {
      header: 'Amount',
      sortable: true,
      sortField: 'loanAmount',
      formatter: (row: LoanApplication) => this.formatCurrency(row.loanAmount)
    },
    {
      header: 'Approved Date',
      sortable: true,
      sortField: 'approvedDate',
      formatter: (row: LoanApplication) =>
        new Date(row.approvedDate || row.dateSubmitted).toLocaleDateString('en-NG', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
    }
  ];

  approvedLoanActions: TableAction<LoanApplication>[] = [
    { id: 'select', label: 'Select', className: 'pick-btn' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loanApplicationService: LoanApplicationService,
    private loanApprovalService: LoanApprovalService
  ) {}

  ngOnInit(): void {
    const routeUuid = this.route.snapshot.paramMap.get('uuid');
    if (routeUuid) {
      this.currentUuid = routeUuid;
    }

    this.route.queryParamMap.subscribe(params => {
      const requestedLoanId = String(params.get('loanId') || '');
      this.loadApprovedLoans(requestedLoanId);
    });
  }

  loadApprovedLoans(preferredLoanId?: string): void {
    this.isLoading = true;
    this.loanApplicationService.getAllApplications().subscribe({
      next: applications => {
        this.approvedLoans = applications
          .filter(loan => loan.status === 'APPROVED')
          .sort((a, b) => new Date(b.approvedDate || b.dateSubmitted).getTime() - new Date(a.approvedDate || a.dateSubmitted).getTime());

        const targetId = preferredLoanId && this.approvedLoans.some(item => item.id === preferredLoanId)
          ? preferredLoanId
          : this.approvedLoans[0]?.id || '';

        this.selectedDisbursementLoanId = targetId;
        this.resetChecks();
        this.syncDisbursementFields();
        this.isLoading = false;
      },
      error: () => {
        this.approvedLoans = [];
        this.selectedDisbursementLoanId = '';
        this.isLoading = false;
      }
    });
  }

  onDisbursementLoanChange(): void {
    this.resetChecks();
    this.syncDisbursementFields();
  }

  pickLoanForDisbursement(loanId: string): void {
    this.selectedDisbursementLoanId = loanId;
    this.onDisbursementLoanChange();
  }

  handleApprovedLoanAction(event: { actionId: string; row: LoanApplication }): void {
    if (event.actionId === 'select') {
      this.pickLoanForDisbursement(event.row.id);
    }
  }

  disburseSelectedLoan(): void {
    const selectedLoan = this.selectedDisbursementLoan;
    if (!selectedLoan || !this.canDisburseSelectedLoan) {
      return;
    }

    const recipientNote = this.disbursementRecipientType === 'THIRD_PARTY'
      ? `Funds released to third-party recipient: ${this.thirdPartyName.trim()}`
      : 'Funds released to borrower account';

    const statusNote = `${recipientNote}. Disbursed on ${this.disbursementDate}. Repayment schedule and interest accrual initiated.`;

    this.loanApprovalService.updateApplicationStatus(selectedLoan.id, {
      status: 'ACTIVE',
      date: new Date().toISOString(),
      changedBy: 'Admin',
      notes: statusNote
    }).subscribe({
      next: () => {
        this.messages = [{
          severity: 'success',
          summary: 'Loan Disbursed',
          detail: `${selectedLoan.id} moved from APPROVED to ACTIVE.`
        }];
        this.loadApprovedLoans();
      },
      error: () => {
        this.messages = [{
          severity: 'error',
          summary: 'Disbursement Failed',
          detail: 'Unable to disburse selected loan right now.'
        }];
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/loan-management/loan-dashboard', this.currentUuid]);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  get selectedDisbursementLoan(): LoanApplication | undefined {
    return this.approvedLoans.find(item => item.id === this.selectedDisbursementLoanId);
  }

  get canDisburseSelectedLoan(): boolean {
    if (!this.selectedDisbursementLoanId || !this.selectedDisbursementLoan) {
      return false;
    }

    if (this.disbursementRecipientType === 'THIRD_PARTY' && !this.thirdPartyName.trim()) {
      return false;
    }

    return this.checklistIdentityVerified
      && this.checklistAccountVerified
      && this.checklistComplianceCleared
      && this.checklistFundsReserved;
  }

  private resetChecks(): void {
    this.disbursementRecipientType = 'BORROWER';
    this.thirdPartyName = '';
    this.checklistIdentityVerified = false;
    this.checklistAccountVerified = false;
    this.checklistComplianceCleared = false;
    this.checklistFundsReserved = false;
  }

  private syncDisbursementFields(): void {
    const selectedLoan = this.selectedDisbursementLoan;
    const today = new Date();
    this.disbursementDate = today.toISOString().split('T')[0];
    this.disbursementAmount = Number(selectedLoan?.loanAmount || 0);
  }
}

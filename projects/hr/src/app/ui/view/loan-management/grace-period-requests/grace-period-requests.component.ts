// grace-period-request.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Message } from 'primeng/api';
import { AdvanceGracePeriodService, CreateGracePeriodRequestPayload } from '../../../service/loan/loan-grace-period.service';
import { LoanApplication, RepaymentScheduleItem } from '../../../service/loan/loan.types';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeRepayment } from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-grace-period-requests',
  templateUrl: './grace-period-requests.component.html',
  styleUrls: ['./grace-period-requests.component.scss']
})
export class GracePeriodRequestsComponent implements OnInit {
  @Input() loan: LoanApplication | null = null;
  @Input() installment: RepaymentScheduleItem | null = null;
  @Input() cooperativeLoan: CooperativeLoan | null = null;
  @Input() cooperativeInstallment: CooperativeRepayment | null = null;
  @Input() member: any = null;
  @Output() close = new EventEmitter<void>();
  @Output() requestSubmitted = new EventEmitter<void>();

  gracePeriodForm: FormGroup;
  isLoading = false;
  messages: Message[] = [];
  maxRequestableDays = 30;
  minRequestableDays = 7;

  constructor(
    private fb: FormBuilder,
    private gracePeriodService: AdvanceGracePeriodService,
    private cooperativeService: CooperativeService
  ) {
    this.gracePeriodForm = this.createForm();
  }

  ngOnInit(): void {}

  createForm(): FormGroup {
    return this.fb.group({
      requestedDays: [15, [Validators.required, Validators.min(7), Validators.max(30)]],
      reason: ['', [Validators.required, Validators.maxLength(500)]],
      paymentSubtype: ['PRINCIPAL_REPAYMENT', Validators.required]
    });
  }

  get dueDate(): string {
    const dueDate = this.installment?.dueDate || this.cooperativeInstallment?.dueDate;
    if (!dueDate) return 'N/A';
    return new Date(dueDate).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get amountDue(): number {
    return this.installment?.totalAmount || this.cooperativeInstallment?.amount || 0;
  }

  get isCooperativeRequest(): boolean {
    return !!this.cooperativeLoan && !!this.cooperativeInstallment;
  }

  get paymentSubtypeOptions(): Array<{ value: string; label: string }> {
    return this.isCooperativeRequest
      ? [
          { value: 'CONTRIBUTION', label: 'Contribution' },
          { value: 'PRINCIPAL_REPAYMENT', label: 'Principal' },
          { value: 'INTEREST_PAYMENT', label: 'Interest' },
          { value: 'LATE_FEE', label: 'Late Fee' }
        ]
      : [
          { value: 'PRINCIPAL_REPAYMENT', label: 'Principal Repayment' },
          { value: 'INTEREST_PAYMENT', label: 'Interest Payment' },
          { value: 'LATE_FEE', label: 'Late Fee' }
        ];
  }

  onSubmit(): void {
    if (this.gracePeriodForm.invalid || (!this.isCooperativeRequest && (!this.loan || !this.installment)) || (this.isCooperativeRequest && (!this.cooperativeLoan || !this.cooperativeInstallment))) {
      this.gracePeriodForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formValue = this.gracePeriodForm.value;

    if (this.isCooperativeRequest && this.cooperativeLoan && this.cooperativeInstallment) {
      const memberId = Number(this.cooperativeLoan.memberId || this.cooperativeLoan.cooperativeMemberId || 0);
      const amountPaid = this.cooperativeInstallment.status === 'PAID' ? Number(this.cooperativeInstallment.amount || 0) : 0;
      const installmentNumber = this.resolveCooperativeInstallmentNumber(this.cooperativeLoan, this.cooperativeInstallment);
      const remainingBalance = this.resolveCooperativeRemainingBalance(this.cooperativeLoan, this.cooperativeInstallment);

      this.cooperativeService.createGracePeriodRequest({
        loanId: this.cooperativeLoan.id,
        memberId,
        installmentNumber,
        paymentSubtype: formValue.paymentSubtype,
        amountPaid,
        remainingBalance,
        requestedAt: new Date().toISOString(),
        requestedDays: formValue.requestedDays,
        reason: formValue.reason,
        status: 'PENDING'
      }).subscribe({
        next: () => {
          this.handleSuccess('Your cooperative grace period request has been submitted for admin review.');
        },
        error: (error) => {
          this.handleFailure(error);
        }
      });
      return;
    }

    const loan = this.loan;
    const installment = this.installment;
    if (!loan || !installment) {
      this.isLoading = false;
      return;
    }

    const payload: CreateGracePeriodRequestPayload = {
      loanId: loan.id,
      employeeId: loan.employeeId,
      installmentNumber: installment.installmentNo,
      paymentSubtype: formValue.paymentSubtype,
      requestedDays: formValue.requestedDays,
      reason: formValue.reason
    };

    this.gracePeriodService.createRequest(payload).subscribe({
      next: () => {
        this.handleSuccess('Your grace period request has been submitted for admin approval.');
      },
      error: (error) => {
        this.handleFailure(error);
      }
    });
  }

  cancel(): void {
    this.close.emit();
  }

  private handleSuccess(detail: string): void {
    this.isLoading = false;
    this.messages = [{
      severity: 'success',
      summary: 'Request Submitted',
      detail
    }];
    setTimeout(() => {
      this.requestSubmitted.emit();
      this.close.emit();
    }, 2000);
  }

  private handleFailure(error: unknown): void {
    this.isLoading = false;
    console.error('Error submitting grace period request:', error);
    this.messages = [{
      severity: 'error',
      summary: 'Submission Failed',
      detail: 'Failed to submit grace period request. Please try again.'
    }];
  }

  private resolveCooperativeInstallmentNumber(loan: CooperativeLoan, installment: CooperativeRepayment): number {
    const repayments = this.cooperativeService.getRepaymentsByLoanId(loan.id)
      .slice()
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());

    const repaymentIndex = repayments.findIndex((entry) =>
      entry.id === installment.id || (
        entry.dueDate === installment.dueDate
        && Number(entry.amount || 0) === Number(installment.amount || 0)
      )
    );

    return repaymentIndex >= 0 ? repaymentIndex + 1 : 1;
  }

  private resolveCooperativeRemainingBalance(loan: CooperativeLoan, installment: CooperativeRepayment): number {
    const repayments = this.cooperativeService.getRepaymentsByLoanId(loan.id);
    const outstandingFromSchedule = repayments
      .filter((entry) => {
        if (entry.id === installment.id) {
          return true;
        }
        return entry.status !== 'PAID';
      })
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    return Number(outstandingFromSchedule || loan.outstandingBalance || loan.totalRepayment || 0);
  }
}
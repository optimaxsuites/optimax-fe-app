import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CooperativeGracePeriodService } from '../../../service/loan/cooperative-grace-period.service';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeRepayment } from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-cooperative-grace-period-request-form',
  templateUrl: './cooperative-grace-period-request-form.component.html',
  styleUrls: ['./cooperative-grace-period-request-form.component.scss']
})
export class CooperativeGracePeriodRequestFormComponent {
  @Input() cooperativeLoan: CooperativeLoan | null = null;
  @Input() cooperativeInstallment: CooperativeRepayment | null = null;
  @Input() member: any = null;
  @Output() close = new EventEmitter<void>();
  @Output() requestSubmitted = new EventEmitter<void>();

  gracePeriodForm: FormGroup;
  isLoading = false;
  messages: any[] = [];
  minRequestableDays = 7;
  maxRequestableDays = 30;

  constructor(private fb: FormBuilder, private gracePeriodService: CooperativeGracePeriodService) {
    this.gracePeriodForm = this.fb.group({
      requestedDays: [15, [Validators.required, Validators.min(7), Validators.max(30)]],
      reason: ['', [Validators.required, Validators.maxLength(500)]],
      paymentSubtype: ['CONTRIBUTION', Validators.required]
    });
  }

  get dueDate(): string {
    const dueDate = this.cooperativeInstallment?.dueDate;
    if (!dueDate) return 'N/A';
    return new Date(dueDate).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get amountDue(): number {
    return this.cooperativeInstallment?.amount || 0;
  }

  get paymentSubtypeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'CONTRIBUTION', label: 'Contribution' },
      { value: 'PRINCIPAL_REPAYMENT', label: 'Principal' },
      { value: 'INTEREST_PAYMENT', label: 'Interest' },
      { value: 'LATE_FEE', label: 'Late Fee' }
    ];
  }

  onSubmit(): void {
    if (this.gracePeriodForm.invalid || !this.cooperativeLoan || !this.cooperativeInstallment) {
      this.gracePeriodForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    const formValue = this.gracePeriodForm.value;
    const memberId = Number(this.cooperativeLoan.memberId || this.cooperativeLoan.cooperativeMemberId || 0);
    const installmentNumber = this.resolveCooperativeInstallmentNumber(this.cooperativeLoan, this.cooperativeInstallment);
    this.gracePeriodService.createRequest({
      loanId: this.cooperativeLoan.id,
      memberId,
      installmentNumber,
      paymentSubtype: formValue.paymentSubtype,
      requestedDays: formValue.requestedDays,
      reason: formValue.reason
    }).subscribe({
      next: () => {
        this.handleSuccess('Your cooperative grace period request has been submitted for admin review.');
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
    this.messages = [{ severity: 'success', summary: 'Request Submitted', detail }];
    setTimeout(() => {
      this.requestSubmitted.emit();
      this.close.emit();
    }, 2000);
  }

  private handleFailure(error: unknown): void {
    this.isLoading = false;
    this.messages = [{ severity: 'error', summary: 'Submission Failed', detail: 'Failed to submit grace period request. Please try again.' }];
  }

  private resolveCooperativeInstallmentNumber(loan: CooperativeLoan, installment: CooperativeRepayment): number {
    // Implement logic as needed
    return 1;
  }

  private resolveCooperativeRemainingBalance(loan: CooperativeLoan, installment: CooperativeRepayment): number {
    // Implement logic as needed
    return Number(loan.outstandingBalance || loan.totalRepayment || 0);
  }
}

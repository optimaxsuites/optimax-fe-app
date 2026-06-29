import { Component, EventEmitter, Input, Output, ViewEncapsulation, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CooperativeGracePeriodService } from '../../../service/loan/cooperative-grace-period.service';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeRepayment } from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-cooperative-grace-period-request-form',
  templateUrl: './cooperative-grace-period-request-form.component.html',
  styleUrls: ['./cooperative-grace-period-request-form.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CooperativeGracePeriodRequestFormComponent implements AfterViewInit {
  @Input() cooperativeLoan: CooperativeLoan | null = null;
  @Input() cooperativeInstallment: CooperativeRepayment | null = null;
  @Input() member: any = null;
  @Input() isModal = true;
  @Output() close = new EventEmitter<void>();
  @Output() requestSubmitted = new EventEmitter<void>();

  gracePeriodForm: FormGroup;
  isLoading = false;
  messages: any[] = [];
  minRequestableDays = 7;
  maxRequestableDays = 30;

  constructor(
    private fb: FormBuilder, 
    private gracePeriodService: CooperativeGracePeriodService,
    private cooperativeService: CooperativeService
  ) {
    this.gracePeriodForm = this.createForm();
  }

  ngAfterViewInit(): void {
    if (this.isModal) {
      this.adjustModalSize();
    }
  }

  private adjustModalSize(): void {
    setTimeout(() => {
      const dialog = document.querySelector('.p-dialog');
      if (dialog) {
        dialog.setAttribute('style', 'width: 90vw !important; max-width: 1200px !important;');
      }
      const dialogContent = document.querySelector('.p-dialog-content');
      if (dialogContent) {
        dialogContent.setAttribute('style', 'padding: 0 !important; max-height: 85vh !important; overflow-y: auto !important;');
      }
    }, 100);
  }

  createForm(): FormGroup {
    return this.fb.group({
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
      .sort((a: CooperativeRepayment, b: CooperativeRepayment) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    const repaymentIndex = repayments.findIndex((repayment: CooperativeRepayment) => 
      repayment.id === installment.id || 
      (repayment.dueDate === installment.dueDate && 
       Number(repayment.amount || 0) === Number(installment.amount || 0))
    );
    
    return repaymentIndex >= 0 ? repaymentIndex + 1 : 1;
  }

  private resolveCooperativeRemainingBalance(loan: CooperativeLoan, installment: CooperativeRepayment): number {
    const repayments = this.cooperativeService.getRepaymentsByLoanId(loan.id);
    const outstandingFromSchedule = repayments
      .filter((repayment: CooperativeRepayment) => {
        if (repayment.id === installment.id) return true;
        return repayment.status !== 'PAID';
      })
      .reduce((sum: number, repayment: CooperativeRepayment) => sum + Number(repayment.amount || 0), 0);
    
    return Number(outstandingFromSchedule || loan.outstandingBalance || loan.totalRepayment || 0);
  }
}
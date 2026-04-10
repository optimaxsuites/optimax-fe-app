// payment-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Message } from 'primeng/api';
import { LoanApplication, RepaymentScheduleItem } from '../../../service/loan/loan.types';
import { AdvancePaymentRecordService, CreatePaymentRecordPayload } from '../../../service/loan/loan-payment-record.service';

export interface BankAccountDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankCode?: string;
}

@Component({
  selector: 'app-payment-modal',
  templateUrl: './loan-payment-modal.component.html',
  styleUrls: ['./loan-payment-modal.component.scss']
})
export class LoanPaymentModalComponent implements OnInit {
  @Input() loan: LoanApplication | null = null;
  @Input() installment: RepaymentScheduleItem | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() paymentSuccess = new EventEmitter<void>();

  paymentForm: FormGroup;
  isLoading = false;
  messages: Message[] = [];
  
  paymentTypes = [
    { value: 'PRINCIPAL_REPAYMENT', label: 'Principal Payment', icon: 'fas fa-money-bill-wave', description: 'Pay towards the principal amount' },
    { value: 'INTEREST_REPAYMENT', label: 'Interest Payment', icon: 'fas fa-percent', description: 'Pay accrued interest' },
    { value: 'LATE_FEE', label: 'Late Fee', icon: 'fas fa-exclamation-triangle', description: 'Pay outstanding late fees' }
  ];
  
  // Bank account details (would come from backend/group settings)
  accountingBankDetails: BankAccountDetails = {
    bankName: 'Zenith Bank',
    accountName: 'Optimax Solutions - Loan Repayment',
    accountNumber: '1012345678',
    bankCode: '057'
  };

  constructor(
    private fb: FormBuilder,
    private paymentRecordService: AdvancePaymentRecordService
  ) {
    this.paymentForm = this.createForm();
  }

  ngOnInit(): void {}

  createForm(): FormGroup {
    return this.fb.group({
      paymentType: ['PRINCIPAL_REPAYMENT', Validators.required],
      amount: [{ value: 0, disabled: true }, Validators.required],
      paymentMethod: ['BANK_TRANSFER', Validators.required],
      paymentReference: ['', Validators.required],
      paidFromAccount: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      notes: ['']
    });
  }

  get dueAmount(): number {
    if (this.installment) {
      return this.installment.totalAmount;
    }
    if (this.loan) {
      return this.loan.repaymentAmount;
    }
    return 0;
  }

  get selectedPaymentType(): 'PRINCIPAL_REPAYMENT' | 'INTEREST_REPAYMENT' | 'LATE_FEE' {
    return this.paymentForm.get('paymentType')?.value || 'PRINCIPAL_REPAYMENT';
  }

  get baseInstallmentAmount(): number {
    if (!this.installment) {
      return this.loan?.repaymentAmount || 0;
    }

    return Number((Number(this.installment.principalAmount || 0) + Number(this.installment.interestAmount || 0)).toFixed(2));
  }

  get lateFeePercentage(): number {
    return Number(this.loan?.lateFeePercentage ?? 2);
  }

  get lateFeeGracePeriodDays(): number {
    return Math.round(Number(this.loan?.lateFeeGracePeriodDays ?? 15));
  }

  get lateFeeAmountDue(): number {
    return Number(this.installment?.lateFeeAmount || 0);
  }

  get selectedAmountDue(): number {
    if (this.selectedPaymentType === 'LATE_FEE') {
      return this.lateFeeAmountDue;
    }

    return this.dueAmount;
  }

  get lateFeeTotalExposure(): number {
    return Number((this.baseInstallmentAmount + this.lateFeeAmountDue).toFixed(2));
  }

  get hasLateFeeDue(): boolean {
    return this.lateFeeAmountDue > 0;
  }

  get paymentAmountLabel(): string {
    return this.selectedPaymentType === 'LATE_FEE' ? 'Late Fee Due' : 'Amount Due';
  }

  get selectedPaymentTypeLabel(): string {
    const selected = this.paymentTypes.find(p => p.value === this.paymentForm.get('paymentType')?.value);
    return selected?.label || 'Payment';
  }

  onSubmit(): void {
    if (this.paymentForm.invalid || !this.loan) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formValue = this.paymentForm.value;

    const payload: CreatePaymentRecordPayload = {
      loanId: this.loan.id,
      paymentType: formValue.paymentType,
      installmentNumber: this.installment?.installmentNo || 0,
      amount: this.selectedAmountDue,
      paymentMethod: formValue.paymentMethod,
      paymentReference: formValue.paymentReference,
      paidFromAccount: formValue.paidFromAccount,
      notes: formValue.notes
    };

    this.paymentRecordService.createPaymentRecord(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.messages = [{
          severity: 'success',
          summary: 'Payment Recorded',
          detail: `Your ${this.selectedPaymentTypeLabel} of ${this.formatCurrency(this.selectedAmountDue)} has been recorded.`
        }];
        setTimeout(() => {
          this.paymentSuccess.emit();
          this.close.emit();
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error recording payment:', error);
        this.messages = [{
          severity: 'error',
          summary: 'Payment Failed',
          detail: 'Failed to record payment. Please try again.'
        }];
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  cancel(): void {
    this.close.emit();
  }
}
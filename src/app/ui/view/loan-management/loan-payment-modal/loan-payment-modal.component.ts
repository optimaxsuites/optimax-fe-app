// payment-modal.component.ts
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
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
export class LoanPaymentModalComponent implements OnInit, OnChanges {
  @Input() loan: LoanApplication | null = null;
  @Input() installment: RepaymentScheduleItem | null = null;
  @Input() loans: LoanApplication[] = [];
  @Input() allowLoanSelection = false;
  @Output() close = new EventEmitter<void>();
  @Output() paymentSuccess = new EventEmitter<void>();

  paymentForm: FormGroup;
  isLoading = false;
  messages: Message[] = [];
  selectedLoanId = '';
  
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

  ngOnInit(): void {
    this.initializeSelection();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loan'] || changes['installment'] || changes['loans'] || changes['allowLoanSelection']) {
      this.initializeSelection();
    }
  }

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

  get availableLoans(): LoanApplication[] {
    if (this.loans.length > 0) {
      return this.loans;
    }

    return this.loan ? [this.loan] : [];
  }

  get currentLoan(): LoanApplication | null {
    if (this.availableLoans.length === 0) {
      return this.loan;
    }

    return this.availableLoans.find((item) => String(item.id) === this.selectedLoanId) || this.availableLoans[0] || null;
  }

  get currentInstallment(): RepaymentScheduleItem | null {
    if (this.installment && this.loan && this.currentLoan?.id === this.loan.id) {
      return this.installment;
    }

    return this.resolveInstallmentForLoan(this.currentLoan);
  }

  get showLoanSelector(): boolean {
    return this.allowLoanSelection && !this.installment && this.availableLoans.length > 1;
  }

  get dueAmount(): number {
    if (this.currentInstallment) {
      return this.currentInstallment.totalAmount;
    }
    if (this.currentLoan) {
      return this.currentLoan.repaymentAmount;
    }
    return 0;
  }

  get selectedPaymentType(): 'PRINCIPAL_REPAYMENT' | 'INTEREST_REPAYMENT' | 'LATE_FEE' {
    return this.paymentForm.get('paymentType')?.value || 'PRINCIPAL_REPAYMENT';
  }

  get baseInstallmentAmount(): number {
    if (!this.currentInstallment) {
      return this.currentLoan?.repaymentAmount || 0;
    }

    return Number((Number(this.currentInstallment.principalAmount || 0) + Number(this.currentInstallment.interestAmount || 0)).toFixed(2));
  }

  get lateFeePercentage(): number {
    return Number(this.currentLoan?.lateFeePercentage ?? 2);
  }

  get lateFeeGracePeriodDays(): number {
    return Math.round(Number(this.currentLoan?.lateFeeGracePeriodDays ?? 15));
  }

  get lateFeeAmountDue(): number {
    return Number(this.currentInstallment?.lateFeeAmount || 0);
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
    if (this.paymentForm.invalid || !this.currentLoan) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formValue = this.paymentForm.value;
    const currentInstallment = this.currentInstallment;

    const payload: CreatePaymentRecordPayload = {
      loanId: this.currentLoan.id,
      paymentType: formValue.paymentType,
      installmentNumber: currentInstallment?.installmentNo || 0,
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

  onLoanSelectionChange(loanId: string): void {
    this.selectedLoanId = loanId;
  }

  getLoanOptionLabel(loan: LoanApplication): string {
    const code = String(loan.loanCode || loan.id || '').trim();
    const nextInstallment = this.resolveInstallmentForLoan(loan);
    const nextAmount = Number(nextInstallment?.totalAmount || loan.repaymentAmount || 0);
    return `${code} - ${this.formatCurrency(nextAmount)} due`;
  }

  private initializeSelection(): void {
    const currentLoanId = String(this.loan?.id || '').trim();
    const availableLoanIds = new Set(this.availableLoans.map((item) => String(item.id)));

    if (currentLoanId && availableLoanIds.has(currentLoanId)) {
      this.selectedLoanId = currentLoanId;
      return;
    }

    if (!availableLoanIds.has(this.selectedLoanId)) {
      this.selectedLoanId = this.availableLoans[0] ? String(this.availableLoans[0].id) : '';
    }
  }

  private resolveInstallmentForLoan(loan: LoanApplication | null): RepaymentScheduleItem | null {
    if (!loan) {
      return null;
    }

    return [...(loan.repaymentSchedule || [])]
      .filter((item) => item.status === 'PENDING' || item.status === 'OVERDUE')
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())[0] || null;
  }
}
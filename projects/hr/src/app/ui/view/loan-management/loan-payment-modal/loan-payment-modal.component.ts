// payment-modal.component.ts
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Message } from 'primeng/api';
import { LoanApplication, RepaymentScheduleItem } from '../../../service/loan/loan.types';
import { AdvancePaymentRecordService, CreatePaymentRecordPayload } from '../../../service/loan/loan-payment-record.service';
import { PaymentConfigService, BankAccountDetails } from '../../../service/loan/loan-payment-config.service';
import { formatNaira } from '../../../service/loan/loan-format.util';

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
  
  constructor(
    private fb: FormBuilder,
    private paymentRecordService: AdvancePaymentRecordService,
    private paymentConfigService: PaymentConfigService
  ) {
    this.paymentForm = this.createForm();
  }

  /** Account details for the selected payment type, from the single shared config source. */
  get accountingBankDetails(): BankAccountDetails {
    return this.paymentConfigService.getAccountDetails(this.selectedPaymentType);
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

  /** Amount still owed on the current installment (principal + interest), net of partial payments. */
  get dueAmount(): number {
    if (this.currentInstallment) {
      return this.roundCurrency(this.remainingPrincipalDue + this.remainingInterestDue);
    }
    if (this.currentLoan) {
      return this.currentLoan.repaymentAmount;
    }
    return 0;
  }

  /**
   * How much of the current installment's principal / interest / late fee has already been paid.
   * Uses the per-component split recorded in the loan's payment history; if the history has no split
   * for this installment, the installment's aggregate paidAmount is applied to interest first, then
   * principal (the usual allocation order).
   */
  private get installmentPaidBreakdown(): { principal: number; interest: number; lateFee: number } {
    const installment = this.currentInstallment;
    if (!installment) {
      return { principal: 0, interest: 0, lateFee: 0 };
    }

    const payments = (this.currentLoan?.paymentHistory || [])
      .filter((payment) => Number(payment.installmentNo) === Number(installment.installmentNo));
    const fromHistory = payments.reduce((sum, payment) => ({
      principal: sum.principal + Number(payment.principalAmount || 0),
      interest: sum.interest + Number(payment.interestPaid || 0),
      lateFee: sum.lateFee + Number(payment.lateFeeAmount || 0)
    }), { principal: 0, interest: 0, lateFee: 0 });

    if (fromHistory.principal + fromHistory.interest + fromHistory.lateFee > 0) {
      return fromHistory;
    }

    const paid = Math.max(Number(installment.paidAmount || 0), 0);
    const interestDue = Number(installment.interestAmount || 0);
    const interest = Math.min(paid, interestDue);
    return { principal: paid - interest, interest, lateFee: 0 };
  }

  get remainingPrincipalDue(): number {
    if (!this.currentInstallment) {
      return 0;
    }
    return this.roundCurrency(Math.max(Number(this.currentInstallment.principalAmount || 0) - this.installmentPaidBreakdown.principal, 0));
  }

  get remainingInterestDue(): number {
    if (!this.currentInstallment) {
      return 0;
    }
    return this.roundCurrency(Math.max(Number(this.currentInstallment.interestAmount || 0) - this.installmentPaidBreakdown.interest, 0));
  }

  private roundCurrency(value: number): number {
    return Number(value.toFixed(2));
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
    const lateFee = Number(this.currentInstallment?.lateFeeAmount || 0);
    return this.roundCurrency(Math.max(lateFee - this.installmentPaidBreakdown.lateFee, 0));
  }

  /** The outstanding amount for the chosen payment type only. */
  get selectedAmountDue(): number {
    switch (this.selectedPaymentType) {
      case 'LATE_FEE':
        return this.lateFeeAmountDue;
      case 'INTEREST_REPAYMENT':
        return this.currentInstallment ? this.remainingInterestDue : 0;
      case 'PRINCIPAL_REPAYMENT':
      default:
        // Without a schedule row there is no principal/interest split, so fall back to the loan's
        // repayment amount rather than recording nothing.
        return this.currentInstallment ? this.remainingPrincipalDue : this.dueAmount;
    }
  }

  get lateFeeTotalExposure(): number {
    return Number((this.baseInstallmentAmount + this.lateFeeAmountDue).toFixed(2));
  }

  get hasLateFeeDue(): boolean {
    return this.lateFeeAmountDue > 0;
  }

  get paymentAmountLabel(): string {
    switch (this.selectedPaymentType) {
      case 'LATE_FEE':
        return 'Late Fee Due';
      case 'INTEREST_REPAYMENT':
        return 'Interest Due';
      default:
        return this.currentInstallment ? 'Principal Due' : 'Amount Due';
    }
  }

  get selectedPaymentTypeLabel(): string {
    const selected = this.paymentTypes.find(p => p.value === this.paymentForm.get('paymentType')?.value);
    return selected?.label || 'Payment';
  }

  onSubmit(): void {
    if (this.isLoading) {
      return;
    }

    if (this.paymentForm.invalid || !this.currentLoan) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    if (this.selectedAmountDue <= 0) {
      this.messages = [{
        severity: 'info',
        summary: 'Nothing Due',
        detail: `There is no outstanding ${this.selectedPaymentTypeLabel.toLowerCase()} on this installment.`
      }];
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
    return formatNaira(amount);
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
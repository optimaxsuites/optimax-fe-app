import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Message } from 'primeng/api';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeLoanGroup, CooperativeRepayment } from '../../../service/loan/cooperative-loan/cooperative.types';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { BankAccountDetails, PaymentConfigService, PaymentTypeConfig } from '../../../service/loan/loan-payment-config.service';

type CooperativeRepaymentPaymentType = 'PRINCIPAL_REPAYMENT' | 'INTEREST_REPAYMENT' | 'LATE_FEE';

@Component({
  selector: 'app-cooperative-payment-modal',
  templateUrl: './cooperative-payment-modal.component.html',
  styleUrls: ['./cooperative-payment-modal.component.scss']
})
export class CooperativePaymentModalComponent implements OnInit, OnChanges {
  @Input() loan: CooperativeLoan | null = null;
  @Input() group: CooperativeLoanGroup | null = null;
  @Input() installment: CooperativeRepayment | null = null;
  @Input() loans: CooperativeLoan[] = [];
  @Input() allowLoanSelection = false;
  @Output() close = new EventEmitter<void>();
  @Output() paymentSuccess = new EventEmitter<void>();

  paymentForm: FormGroup;
  isLoading = false;
  messages: Message[] = [];
  paymentTypes: PaymentTypeConfig[] = [];
  selectedLoanId = '';

  constructor(
    private fb: FormBuilder,
    private paymentConfigService: PaymentConfigService,
    private cooperativeService: CooperativeService
  ) {
    this.paymentForm = this.fb.group({
      paymentType: ['PRINCIPAL_REPAYMENT', Validators.required],
      amount: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0.01)]],
      paymentMethod: ['BANK_TRANSFER', Validators.required],
      paymentReference: ['', Validators.required],
      paidFromAccount: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.initializeSelection();
    this.initializePaymentTypes();
    this.syncAmountWithPaymentType();
    this.paymentForm.get('paymentType')?.valueChanges.subscribe(() => this.syncAmountWithPaymentType());
    this.paymentForm.get('paymentMethod')?.valueChanges.subscribe(() => this.updateSourceAccountValidation());
    this.updateSourceAccountValidation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['group'] || changes['installment'] || changes['loan'] || changes['loans'] || changes['allowLoanSelection']) {
      this.initializeSelection();
      this.initializePaymentTypes();
      this.syncAmountWithPaymentType();
    }
  }

  get availableLoans(): CooperativeLoan[] {
    if (this.loans.length > 0) {
      return this.loans;
    }

    return this.loan ? [this.loan] : [];
  }

  get currentLoan(): CooperativeLoan | null {
    if (this.availableLoans.length === 0) {
      return this.loan;
    }

    return this.availableLoans.find((item) => String(item.id) === this.selectedLoanId) || this.availableLoans[0] || null;
  }

  get currentGroup(): CooperativeLoanGroup | null {
    if (this.group && this.loan && this.currentLoan?.id === this.loan.id) {
      return this.group;
    }

    const groupId = Number(this.currentLoan?.groupId || this.currentLoan?.cooperativeGroupId || 0);
    return groupId ? this.cooperativeService.getGroupById(groupId) || null : null;
  }

  get currentInstallment(): CooperativeRepayment | null {
    if (this.installment && this.loan && this.currentLoan?.id === this.loan.id) {
      return this.installment;
    }

    return this.resolveInstallmentForLoan(this.currentLoan);
  }

  get showLoanSelector(): boolean {
    return this.allowLoanSelection && !this.installment && this.availableLoans.length > 1;
  }

  get selectedPaymentType(): CooperativeRepaymentPaymentType {
    return this.paymentForm.get('paymentType')?.value || 'PRINCIPAL_REPAYMENT';
  }

  get selectedPaymentTypeConfig(): PaymentTypeConfig | undefined {
    return this.paymentTypes.find((type) => type.type === this.selectedPaymentType);
  }

  get selectedAccountDetails(): BankAccountDetails {
    return this.selectedPaymentTypeConfig?.accountDetails || this.paymentConfigService.getCooperativeAccountDetails(this.selectedPaymentType, this.currentGroup);
  }

  get selectedAmountDue(): number {
    if (!this.currentInstallment) {
      return 0;
    }

    if (this.selectedPaymentType === 'INTEREST_REPAYMENT') {
      return Number(this.currentInstallment.interestComponent || 0);
    }

    if (this.selectedPaymentType === 'LATE_FEE') {
      return Number(this.currentInstallment.lateFeeAmount || 0);
    }

    return Number(
      this.currentInstallment.principalComponent
      || Math.max(Number(this.currentInstallment.amount || 0) - Number(this.currentInstallment.interestComponent || 0) - Number(this.currentInstallment.lateFeeAmount || 0), 0)
    );
  }

  get selectedPaymentTypeLabel(): string {
    return this.selectedPaymentTypeConfig?.label || 'Payment';
  }

  get hasValidDestinationAccount(): boolean {
    return this.paymentConfigService.hasValidAccountNumber(this.selectedAccountDetails);
  }

  get destinationAccountError(): string {
    if (this.hasValidDestinationAccount) {
      return '';
    }

    return `No valid ${this.selectedPaymentTypeLabel.toLowerCase()} account is configured for this group yet.`;
  }

  get sourceAccountLabel(): string {
    return this.paymentForm.get('paymentMethod')?.value === 'PAYROLL_DEDUCTION'
      ? 'Payroll Reference / Employee ID'
      : 'Source Account / Wallet Number';
  }

  get sourceAccountHint(): string {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    if (paymentMethod === 'PAYROLL_DEDUCTION') {
      return 'Enter the payroll reference, employee ID, or deduction batch reference.';
    }

    if (paymentMethod === 'CASH') {
      return 'Enter the teller, vault, or cashier reference used to confirm the cash posting.';
    }

    if (paymentMethod === 'MOBILE_MONEY') {
      return 'Enter the mobile money wallet number or transfer identifier.';
    }

    return 'Enter the 10-digit account number used for this payment.';
  }

  get canSubmit(): boolean {
    return !this.isLoading
      && this.paymentForm.valid
      && this.selectedAmountDue > 0
      && this.hasValidDestinationAccount;
  }

  submit(): void {
    if (!this.currentLoan || !this.currentInstallment || !this.canSubmit) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formValue = this.paymentForm.getRawValue();
    this.cooperativeService.recordRepayment(this.currentLoan.id, {
      amount: Number(formValue.amount || this.selectedAmountDue),
      modeofPayment: formValue.paymentMethod,
      paidDate: new Date().toISOString(),
      paymentType: this.selectedPaymentType,
      paymentReference: String(formValue.paymentReference || '').trim(),
      paidFromAccount: String(formValue.paidFromAccount || '').trim(),
      paidIntoAccount: this.selectedAccountDetails.accountNumber
    }).subscribe((recorded) => {
      this.isLoading = false;
      if (!recorded) {
        this.messages = [{
          severity: 'warn',
          summary: 'Payment Not Recorded',
          detail: 'Unable to record this cooperative payment. Check the selected payment type and outstanding amount.'
        }];
        return;
      }

      this.messages = [{
        severity: 'success',
        summary: 'Payment Recorded',
        detail: `${this.selectedPaymentTypeLabel} of ${this.formatCurrency(Number(formValue.amount || this.selectedAmountDue))} has been recorded successfully.`
      }];

      setTimeout(() => {
        this.paymentSuccess.emit();
        this.close.emit();
      }, 900);
    });
  }

  cancel(): void {
    this.close.emit();
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(Number(amount || 0));
  }

  onLoanSelectionChange(loanId: string): void {
    this.selectedLoanId = loanId;
    this.initializePaymentTypes();
    this.syncAmountWithPaymentType();
  }

  getLoanOptionLabel(loan: CooperativeLoan): string {
    const nextInstallment = this.resolveInstallmentForLoan(loan);
    const amountDue = Number(nextInstallment?.amount || loan.repaymentAmount || 0);
    return `${loan.loanCode || loan.loanId || loan.id} - ${this.formatCurrency(amountDue)} due`;
  }

  private initializePaymentTypes(): void {
    this.paymentTypes = this.paymentConfigService
      .getCooperativePaymentTypes(this.currentGroup)
      .filter((type) => type.type !== 'CONTRIBUTION');
  }

  private syncAmountWithPaymentType(): void {
    this.paymentForm.get('amount')?.setValue(this.selectedAmountDue);
  }

  private updateSourceAccountValidation(): void {
    const control = this.paymentForm.get('paidFromAccount');
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    if (!control) {
      return;
    }

    if (paymentMethod === 'PAYROLL_DEDUCTION') {
      control.setValidators([Validators.required, Validators.pattern(/^[A-Za-z0-9\-_/]{4,24}$/)]);
    } else if (paymentMethod === 'MOBILE_MONEY') {
      control.setValidators([Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]);
    } else if (paymentMethod === 'CASH') {
      control.setValidators([Validators.required, Validators.pattern(/^[A-Za-z0-9\-_/]{4,24}$/)]);
    } else {
      control.setValidators([Validators.required, Validators.pattern(/^[0-9]{10}$/)]);
    }

    control.updateValueAndValidity();
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

  private resolveInstallmentForLoan(loan: CooperativeLoan | null): CooperativeRepayment | null {
    if (!loan) {
      return null;
    }

    return this.cooperativeService
      .getRepaymentsByLoanId(loan.id)
      .filter((item) => item.status !== 'PAID')
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())[0] || null;
  }
}
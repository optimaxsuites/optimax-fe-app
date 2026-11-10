import { formatDate } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Message } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { LoanApplicationService, LoanSubmissionUnconfirmedError } from '../../../service/loan/loan-application.service';
import { LoanApplication, LoanApplicationFormData, LoanSupportingDocument } from '../../../service/loan/loan.types';
import { normalizeLoanRepaymentStartDate,
  toLocalDateString
} from '../../../service/loan/loan-display.util';
import { ErrorMessageService } from '../../../shared-component/service/error-message/error-message.service';
import { LoanPurposeService, LoanPurposeData } from '../../../service/loan/loan-purpose.service';
import { EmployeeLoanService } from '../../../service/loan/emoloyee-loan.service';
import { LoanApprovalService } from '../../../service/loan/loan-approval.service';
import { formatNaira } from '../../../service/loan/loan-format.util';
import { resolveEmployeeLevelId } from '../../../service/loan/level-salary.util';
import { LoanService } from '../../../service/loan/loan.service';
import { computeBorrowingCommitment } from '../../../service/loan/loan-eligibility.util';

interface EmployeeIdentityResponse {
  id?: number;
  employeeId?: number | string;
  levelId?: number;
  firstName?: string;
  lastName?: string;
}

/** The signed-in employee couldn't be identified, so the form must not submit as anyone. */
class SignedInEmployeeUnavailableError extends Error {}

@Component({
  selector: 'app-loan-request-form',
  templateUrl: './loan-request-form.component.html',
  styleUrls: ['./loan-request-form.component.scss'],
  encapsulation: ViewEncapsulation.None 
})
export class LoanRequestFormComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  @Input() isModal = false;
  @Input() employeeId = '';
  @Input() employeeName = '';
  @Input() department = '';
  @Output() loanSubmitted = new EventEmitter<LoanApplication>();
  @Output() formCancelled = new EventEmitter<void>();

  loanRequestForm!: FormGroup;
  showOtherPurpose = false;
  isLoading = false;
  showInterestModal = false;
  defaultInterestRate: number | null = null;
  defaultInterestAcknowledged = false;
  pendingPurposeCode: string | null = null;
  supportingDocuments: LoanSupportingDocument[] = [];
  messages: Message[] = [];
  
  loanPurposes: LoanPurposeData[] = [];
  isLoadingPurposes = false;
  
  monthlySalary = 0;
  salaryStatus: 'loading' | 'ok' | 'missing' | 'invalid' | 'error' | 'no-employee' = 'loading';
  identityErrorMessage = '';
  salaryLevelName = '';
  isLoadingSalary = false;

  repaymentBreakdown = { repaymentAmount: 0, totalRepayment: 0, totalInterest: 0 };

  constructor(
    private fb: FormBuilder,
    private loanApplicationService: LoanApplicationService,
    private errorMessageService: ErrorMessageService,
    private loanPurposeService: LoanPurposeService,
    private employeeLoanService: EmployeeLoanService,
    private loanApprovalService: LoanApprovalService,
    private loanService: LoanService
  ) {}

  private toPositiveNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }

    const raw = String(value ?? '').trim();
    if (!raw) {
      return 0;
    }

    if (/^\d+$/.test(raw)) {
      return Number(raw);
    }

    const numericPart = raw.match(/\d+/g)?.join('') || '';
    return numericPart ? Number(numericPart) : 0;
  }

  private unwrapEmployeePayload(payload: unknown): EmployeeIdentityResponse {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    const candidate = payload as Record<string, unknown>;
    const nestedKeys = ['data', 'content', 'result', 'payload', 'employee'];
    for (const key of nestedKeys) {
      const nested = candidate[key];
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        return nested as EmployeeIdentityResponse;
      }
    }

    return candidate as EmployeeIdentityResponse;
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormListeners();
    this.loadLoanPurposes();
    this.loadEmployeeSalary();
  }

 initializeForm(): void {
  this.loanRequestForm = this.fb.group({
    monthlySalary: [{ value: 0, disabled: true }],
    purpose: ['', Validators.required],
    otherPurpose: [''],
    amount: ['', [Validators.required, Validators.min(10000), Validators.max(50000000)]],
    repaymentTime: ['', [Validators.required, Validators.min(1), Validators.max(60)]],
    repaymentStartDate: ['', Validators.required],
    repaymentDay: ['', [Validators.min(1), Validators.max(31)]],
    repaymentAmountAmount: [{ value: '', disabled: true }, [Validators.required]],
    modeOfPayment: ['MONTHLY', Validators.required],
    acknowledgment: [false, Validators.requiredTrue]
  });

  // Always enable repaymentTime and repaymentDay
  this.loanRequestForm.get('repaymentTime')?.enable();
  this.loanRequestForm.get('repaymentDay')?.enable();

    // Add conditional validator for repaymentDay when mode is MONTHLY
    this.loanRequestForm.get('modeOfPayment')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((mode) => {
      const repaymentDayControl = this.loanRequestForm.get('repaymentDay');
      if (mode === 'MONTHLY') {
        repaymentDayControl?.setValidators([Validators.required, Validators.min(1), Validators.max(31)]);
      } else {
        repaymentDayControl?.clearValidators();
        repaymentDayControl?.setValue('');
      }
      repaymentDayControl?.updateValueAndValidity();
    });

    this.loanRequestForm.get('modeOfPayment')?.updateValueAndValidity();

    this.loanRequestForm.get('purpose')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value: string) => {
      this.showOtherPurpose = value === 'other';
      const otherPurposeControl = this.loanRequestForm.get('otherPurpose');
      if (value === 'other') {
        otherPurposeControl?.setValidators(Validators.required);
      } else {
        otherPurposeControl?.clearValidators();
        otherPurposeControl?.setValue('');
      }
      otherPurposeControl?.updateValueAndValidity();
      this.updateAmountValidator();

      const selectedPurpose = this.loanPurposes.find(p => p.code === value);
      if (selectedPurpose && selectedPurpose.defaultInterestRate !== null && selectedPurpose.defaultInterestRate !== undefined) {
        this.pendingPurposeCode = value;
        this.showInterestModal = true;
        this.defaultInterestRate = selectedPurpose.defaultInterestRate;
        this.defaultInterestAcknowledged = false;
        // Do NOT clear the purpose field here. Only clear if user rejects.
      } else {
        this.showInterestModal = false;
        this.defaultInterestRate = null;
        this.defaultInterestAcknowledged = false;
        this.pendingPurposeCode = null;
      }

      // The preview's interest rate depends on the selected purpose.
      this.calculateRepaymentAmount();
    });
  }

  setupFormListeners(): void {
    this.loanRequestForm.get('amount')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.calculateRepaymentAmount();
    });

    this.loanRequestForm.get('repaymentTime')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.calculateRepaymentAmount();
      this.updateRepaymentDayFromStartDate();
    });

    this.loanRequestForm.get('modeOfPayment')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.calculateRepaymentAmount();
    });

    this.loanRequestForm.get('repaymentStartDate')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.updateRepaymentDayFromStartDate();
    });
  }

  setModeOfPayment(mode: string): void {
    this.loanRequestForm.get('modeOfPayment')?.setValue(mode);
  }

  private updateRepaymentDayFromStartDate(): void {
    const repaymentStartDate = this.loanRequestForm.get('repaymentStartDate')?.value;
    const modeOfPayment = this.loanRequestForm.get('modeOfPayment')?.value;
    const repaymentDayControl = this.loanRequestForm.get('repaymentDay');
    
    if (modeOfPayment === 'MONTHLY' && repaymentStartDate) {
      const parsedDate = new Date(repaymentStartDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        const day = parsedDate.getDate();
        if (day >= 1 && day <= 31) {
          if (!repaymentDayControl?.touched || !repaymentDayControl?.value) {
            repaymentDayControl?.setValue(day, { emitEvent: false });
          }
        }
      }
    }
  }

  updateAmountValidator(): void {
    const selectedCode = this.loanRequestForm.get('purpose')?.value;
    const amountControl = this.loanRequestForm.get('amount');

    if (selectedCode && selectedCode !== 'other') {
      const selectedPurpose = this.loanPurposes.find(p => p.code === selectedCode);
      if (selectedPurpose) {
        const validators = [Validators.required];
        
        if (selectedPurpose.minLoanAmount && selectedPurpose.minLoanAmount > 0) {
          validators.push(Validators.min(selectedPurpose.minLoanAmount));
        } else {
          validators.push(Validators.min(10000));
        }
        
        if (selectedPurpose.maxLoanAmount && selectedPurpose.maxLoanAmount > 0) {
          validators.push(Validators.max(selectedPurpose.maxLoanAmount));
        } else {
          validators.push(Validators.max(50000000));
        }
        
        amountControl?.setValidators(validators);
        amountControl?.updateValueAndValidity();
        return;
      }
    }

    amountControl?.setValidators([Validators.required, Validators.min(10000), Validators.max(50000000)]);
    amountControl?.updateValueAndValidity();
  }

  loadLoanPurposes(): void {
    this.isLoadingPurposes = true;
    this.loanPurposeService.getAllPurposes(true).subscribe({
      next: (purposes: LoanPurposeData[]) => {
        // Approval always applies the purpose's rate, so a purpose without one can't be approved;
        // don't offer it until an admin sets a rate in Loan Purpose Management.
        this.loanPurposes = purposes.filter((purpose) => Number(purpose.defaultInterestRate || 0) > 0);
        this.isLoadingPurposes = false;
      },
      error: (err: Error) => {
        console.error('Error loading loan purposes:', err);
        this.isLoadingPurposes = false;
      }
    });
  }

  /**
   * The employee's monthly salary for the one-third eligibility check, from their level:
   * GET /employees/{id} gives `level.id`, matched to a GET /salaries record's `levelId`
   * (base + allowances − deductions). There is no fallback: if it can't be determined the employee
   * is told why and can't submit, because a guessed salary would make the eligibility check meaningless.
   */
  loadEmployeeSalary(): void {
    this.isLoadingSalary = true;
    this.salaryStatus = 'loading';
    this.monthlySalary = 0;

    // Strict lookup of the signed-in employee: never a default or stored-elsewhere id, since the
    // loan is submitted under this employee and their salary sets the limit.
    this.employeeLoanService.getSignedInEmployee().pipe(
      map((employee: any) => this.unwrapEmployeePayload(employee) as any),
      catchError((error) => {
        this.identityErrorMessage = error?.message || 'We couldn\'t confirm who you are. Please sign in again.';
        return throwError(() => new SignedInEmployeeUnavailableError());
      }),
      switchMap((employee: any) => {
        const employeeId = this.toPositiveNumber(employee?.id || 0);
        this.employeeId = employeeId ? String(employeeId) : '';
        if (employee) {
          this.employeeName = this.employeeName || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim();
        }
        // A cached copy may lack `level`; fetch the full record by id when it does.
        const fullEmployee$ = resolveEmployeeLevelId(employee) || !employeeId
          ? of(employee)
          : this.employeeLoanService.getEmployeeById(employeeId).pipe(
              map((response: any) => this.unwrapEmployeePayload(response) as any),
              catchError(() => of(employee))
            );
        return fullEmployee$.pipe(switchMap((fullEmployee) => this.employeeLoanService.getMonthlySalaryForEmployee(fullEmployee)));
      }),
      finalize(() => {
        this.isLoadingSalary = false;
      })
    ).subscribe({
      next: (result) => {
        this.salaryLevelName = result.levelName;
        if (result.status === 'ok') {
          this.salaryStatus = 'ok';
          this.monthlySalary = result.monthlySalary;
        } else {
          this.salaryStatus = result.status;
          this.monthlySalary = 0;
          this.showMessage('warn', 'Salary Not Available', this.salaryProblemMessage, true);
        }
        this.loanRequestForm.get('monthlySalary')?.setValue(this.monthlySalary);
      },
      error: (error) => {
        console.error('Error loading salary:', error);
        this.salaryStatus = error instanceof SignedInEmployeeUnavailableError ? 'no-employee' : 'error';
        this.monthlySalary = 0;
        this.loanRequestForm.get('monthlySalary')?.setValue(0);
        this.showMessage('warn', 'Salary Not Available', this.salaryProblemMessage, true);
      }
    });
  }

  /** Why the salary couldn't be used, for the form's warning (empty when it's fine). */
  get salaryProblemMessage(): string {
    const level = this.salaryLevelName ? ` (${this.salaryLevelName})` : '';
    switch (this.salaryStatus) {
      case 'no-employee':
        return this.identityErrorMessage;
      case 'missing':
        return `No salary is set up for your level${level} in HR records, so your loan limit can't be worked out. Please contact HR before applying.`;
      case 'invalid':
        return `The salary set up for your level${level} doesn't add up (deductions are more than pay). Please contact HR before applying.`;
      case 'error':
        return 'Your salary couldn\'t be loaded, so your loan limit can\'t be worked out. Refresh the page and try again.';
      default:
        return '';
    }
  }

  /** One-third of monthly salary: the most the employee's active loans plus this request may total. */
  get maxTotalBorrowing(): number {
    return Number((this.monthlySalary / 3).toFixed(2));
  }

  /**
   * Interest rate the preview can honestly apply: the purpose's fixed rate if it has one.
   * Purposes without a fixed rate get their rate at approval, so the preview shows principal only.
   */
  get previewInterestRate(): number | null {
    const rate = Number(this.selectedPurposeDefinition?.defaultInterestRate ?? 0);
    return rate > 0 ? rate : null;
  }

  calculateRepaymentAmount(): void {
    const amount = Number(this.loanRequestForm.get('amount')?.value || 0);
    const repaymentTime = Number(this.loanRequestForm.get('repaymentTime')?.value || 0);
    const modeOfPayment = this.loanRequestForm.get('modeOfPayment')?.value;

    if (amount > 0 && repaymentTime > 0) {
      // Same amortisation the approval step uses to build the repayment schedule.
      this.repaymentBreakdown = this.loanApprovalService.calculateRepaymentBreakdown(
        amount,
        repaymentTime,
        this.previewInterestRate ?? 0,
        modeOfPayment === 'ONE_OFF' ? 'ONE_OFF' : 'MONTHLY'
      );
      this.loanRequestForm.get('repaymentAmountAmount')?.setValue(this.repaymentBreakdown.repaymentAmount);
    } else {
      this.repaymentBreakdown = { repaymentAmount: 0, totalRepayment: 0, totalInterest: 0 };
    }
  }

  get selectedPurposeDescription(): string {
    const selectedCode = this.loanRequestForm.get('purpose')?.value;
    if (!selectedCode || selectedCode === 'other') return '';
    const selected = this.loanPurposes.find(p => p.code === selectedCode);
    return selected?.description || '';
  }

  get selectedPurposeDefinition(): LoanPurposeData | undefined {
    const selectedCode = this.loanRequestForm.get('purpose')?.value;
    if (!selectedCode || selectedCode === 'other') {
      return undefined;
    }

    return this.loanPurposes.find((purpose) => purpose.code === selectedCode);
  }

  get minLoanAmount(): number {
    const minAmount = Number(this.selectedPurposeDefinition?.minLoanAmount || 0);
    return minAmount > 0 ? minAmount : 10000;
  }

  get maxLoanAmount(): number {
    const maxAmount = Number(this.selectedPurposeDefinition?.maxLoanAmount || 0);
    return maxAmount > 0 ? maxAmount : 50000000;
  }

  get hasPurposeAmountConstraints(): boolean {
    return !!((this.selectedPurposeDefinition?.minLoanAmount && this.selectedPurposeDefinition.minLoanAmount > 0)
      || (this.selectedPurposeDefinition?.maxLoanAmount && this.selectedPurposeDefinition.maxLoanAmount > 0));
  }

  get selectedPurposeAmountRangeMessage(): string {
    if (!this.selectedPurposeDefinition) {
      return '';
    }

    const hasMin = !!(this.selectedPurposeDefinition.minLoanAmount && this.selectedPurposeDefinition.minLoanAmount > 0);
    const hasMax = !!(this.selectedPurposeDefinition.maxLoanAmount && this.selectedPurposeDefinition.maxLoanAmount > 0);

    if (hasMin && hasMax) {
      return `Allowed range: ${this.formatCurrency(this.selectedPurposeDefinition.minLoanAmount || 0)} to ${this.formatCurrency(this.selectedPurposeDefinition.maxLoanAmount || 0)}.`;
    }

    if (hasMin) {
      return `Minimum allowed amount: ${this.formatCurrency(this.selectedPurposeDefinition.minLoanAmount || 0)}.`;
    }

    if (hasMax) {
      return `Maximum allowed amount: ${this.formatCurrency(this.selectedPurposeDefinition.maxLoanAmount || 0)}.`;
    }

    return '';
  }

  formatCurrency(amount: number): string {
    return formatNaira(amount, { omitZeroKobo: true });
  }

  get purpose(): AbstractControl | null { return this.loanRequestForm.get('purpose'); }
  get otherPurpose(): AbstractControl | null { return this.loanRequestForm.get('otherPurpose'); }
  get amount(): AbstractControl | null { return this.loanRequestForm.get('amount'); }
  get repaymentTime(): AbstractControl | null { return this.loanRequestForm.get('repaymentTime'); }
  get repaymentStartDate(): AbstractControl | null { return this.loanRequestForm.get('repaymentStartDate'); }

  /** The salary-deduction disclaimer above the terms, with this application's own figures once they're known. */
  get salaryDeductionDisclaimer(): string {
    const naira = (v: number) => `₦${(Number(v) || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const { repaymentAmount, totalRepayment } = this.repaymentBreakdown;
    const start = this.repaymentStartDate?.value ? new Date(this.repaymentStartDate.value) : null;
    const startLabel = start && !isNaN(start.getTime()) ? start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'the repayment start date you choose';
    const amounts = totalRepayment > 0
      ? ` That is ${naira(repaymentAmount)} a month, ${naira(totalRepayment)} in total,`
      : '';
    return `Repayments are deducted from your salary. If this loan is approved, the total repayable amount (amount borrowed plus interest) will be taken from your monthly salary through payroll.${amounts} starting from ${startLabel} and continuing until the loan is fully repaid.`;
  }
  get repaymentDay(): AbstractControl | null { return this.loanRequestForm.get('repaymentDay'); }
  get repaymentAmountAmount(): AbstractControl | null { return this.loanRequestForm.get('repaymentAmountAmount'); }
  get modeOfPayment(): AbstractControl | null { return this.loanRequestForm.get('modeOfPayment'); }
  get acknowledgment(): AbstractControl | null { return this.loanRequestForm.get('acknowledgment'); }

  getMinRepaymentDate(): string {
    const today = new Date();
    today.setMonth(today.getMonth() + 1);
    return toLocalDateString(today);
  }

  // ==================== INTEREST RATE MODAL METHODS ====================

  onInterestAcknowledgedChange(): void {
    // State is already bound via ngModel
  }

  acceptInterestAndContinue(): void {
    if (this.defaultInterestAcknowledged && this.pendingPurposeCode) {
      // emitEvent: false — re-emitting would re-run the purpose listener, which reopens the modal
      // and resets defaultInterestAcknowledged, so the consent was always submitted as false.
      this.loanRequestForm.patchValue({ purpose: this.pendingPurposeCode }, { emitEvent: false });
      const purposeControl = this.loanRequestForm.get('purpose');
      purposeControl?.markAsDirty();
      purposeControl?.markAsTouched();
      purposeControl?.updateValueAndValidity();
      this.showInterestModal = false;
      this.pendingPurposeCode = null;
      // Ensure fields are enabled
      this.loanRequestForm.get('repaymentTime')?.enable();
      this.loanRequestForm.get('repaymentDay')?.enable();
    }
  }

  rejectInterestAndResetPurpose(): void {
    this.showInterestModal = false;
    this.defaultInterestAcknowledged = false;
    if (this.pendingPurposeCode) {
      this.loanRequestForm.patchValue({ purpose: '' });
    }
    this.pendingPurposeCode = null;
    this.defaultInterestRate = null;
    // Ensure fields are enabled
    this.loanRequestForm.get('repaymentTime')?.enable();
    this.loanRequestForm.get('repaymentDay')?.enable();
  }

  closeInterestModal(): void {
    this.rejectInterestAndResetPurpose();
  }

  onCancel(): void {
    this.formCancelled.emit();
  }

  private messageTimer?: ReturnType<typeof setTimeout>;

  /** `persist` keeps the message until replaced, for ones the employee must act on. */
  private showMessage(severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string, persist = false): void {
    clearTimeout(this.messageTimer);
    this.messages = [{ severity, summary, detail }];
    if (!persist) {
      this.messageTimer = setTimeout(() => { this.messages = []; }, 5000);
    }
  }

  onSubmit(): void {
    if (this.showInterestModal) {
      this.showMessage('warn', 'Interest Rate Confirmation Required', 
        'Please acknowledge the fixed interest rate for this loan purpose by checking the box and clicking "Accept & Continue".');
      return;
    }

    if (this.salaryStatus !== 'ok' || this.monthlySalary <= 0) {
      this.showMessage('warn', 'Salary Not Available', this.salaryProblemMessage || 'Your salary is still loading. Try again in a moment.', true);
      return;
    }

    if (this.loanRequestForm.valid) {
      this.isLoading = true;

      // Every page of loans, fresh; a failed load must block the request rather than count as "no loans".
      this.loanService.listLoanApplicationsOrFail().pipe(
        catchError(() => throwError(() => new Error(
          'We couldn\'t check your existing loans, so your application wasn\'t sent. Please try again.'
        ))),
        map((loans: LoanApplication[]) => computeBorrowingCommitment(
          (loans || []).filter((loan) => String(loan.employeeId) === String(this.employeeId))
        )),
        switchMap((commitment) => {
          const oneThirdSalary = this.maxTotalBorrowing;
          const requestedAmount = parseFloat(this.loanRequestForm.get('amount')?.value);
          if ((commitment.total + requestedAmount) > oneThirdSalary) {
            this.isLoading = false;
            const remaining = Math.max(oneThirdSalary - commitment.total, 0);
            const parts = [
              commitment.outstandingPrincipal > 0 ? `${this.formatCurrency(commitment.outstandingPrincipal)} still owed on loans you're repaying` : '',
              commitment.pipelineAmount > 0 ? `${this.formatCurrency(commitment.pipelineAmount)} in applications not yet disbursed` : ''
            ].filter(Boolean).join(' and ');
            this.showMessage(
              'error',
              'Loan Limit Exceeded',
              `Your borrowing can't exceed one-third of your monthly salary (${this.formatCurrency(oneThirdSalary)}). `
                + (parts ? `You already have ${parts}, so ` : '')
                + `you can request up to ${this.formatCurrency(remaining)}.`,
              true
            );
            return of(null);
          }

          const selectedPurpose = this.loanPurposes.find(p => p.code === this.loanRequestForm.get('purpose')?.value);
          const hasFixedInterest = !!(selectedPurpose?.defaultInterestRate && selectedPurpose.defaultInterestRate > 0);
          const fixedInterestRate: number | undefined = hasFixedInterest 
            ? (selectedPurpose?.defaultInterestRate ?? undefined)
            : undefined;

          // Always use the selected purpose code from the dropdown, unless 'other' is selected
          let normalizedPurposeCode = '';
          if (this.showOtherPurpose) {
            normalizedPurposeCode = 'other';
          } else if (selectedPurpose) {
            normalizedPurposeCode = selectedPurpose.code;
          } else {
            normalizedPurposeCode = String(this.loanRequestForm.get('purpose')?.value || '').trim();
          }

          const normalizedPurpose = String(
            this.showOtherPurpose
              ? this.loanRequestForm.get('otherPurpose')?.value
              : (selectedPurpose?.name || this.loanRequestForm.get('purpose')?.value)
          ).trim();

          // Properly format the date to ISO format
          let normalizedRepaymentStartDate: string | undefined = undefined;
          const rawStartDate = this.loanRequestForm.get('repaymentStartDate')?.value;
          if (rawStartDate) {
            const date = new Date(rawStartDate);
            if (!isNaN(date.getTime())) {
              normalizedRepaymentStartDate = date.toISOString();
            }
          }

          const normalizedModeOfPayment = this.loanRequestForm.get('modeOfPayment')?.value;

          let repaymentDay: number | undefined = undefined;
          if (normalizedModeOfPayment === 'MONTHLY') {
            const manualDay = Number(this.loanRequestForm.get('repaymentDay')?.value);
            if (manualDay && manualDay >= 1 && manualDay <= 31) {
              repaymentDay = manualDay;
            } else if (normalizedRepaymentStartDate) {
              const startDate = new Date(normalizedRepaymentStartDate);
              if (!Number.isNaN(startDate.getTime())) {
                repaymentDay = startDate.getDate();
              }
            }
          }

          const formData: LoanApplicationFormData = {
            purpose: normalizedPurpose,
            purposeCode: normalizedPurposeCode,
            otherPurpose: this.loanRequestForm.get('otherPurpose')?.value,
            amount: requestedAmount,
            repaymentTime: parseInt(this.loanRequestForm.get('repaymentTime')?.value, 10),
            repaymentStartDate: normalizedRepaymentStartDate || new Date().toISOString(),
            repaymentDay,
            repaymentAmount: parseFloat(this.loanRequestForm.get('repaymentAmountAmount')?.value),
            modeOfPayment: normalizedModeOfPayment,
            acknowledgment: this.loanRequestForm.get('acknowledgment')?.value,
            supportingDocuments: this.supportingDocuments,
            requestDate: new Date().toISOString(),
            employeeId: Number(this.employeeId),
            employeeName: this.employeeName,
            department: this.department,
            monthlySalary: this.monthlySalary,
            hasFixedInterest: hasFixedInterest,
            fixedInterestRate: fixedInterestRate,
            defaultInterestAcknowledged: this.defaultInterestAcknowledged,
            ...(selectedPurpose?.defaultInterestRate ? { defaultInterestRate: selectedPurpose.defaultInterestRate } : {})
          };

          return this.loanApplicationService.submitLoanApplication(formData).pipe(
            finalize(() => { this.isLoading = false; })
          );
        }),
        switchMap((submitResult: any) => {
          if (!submitResult) return of(null);
          if (typeof submitResult.subscribe === 'function') {
            return submitResult;
          }
          return of(submitResult);
        })
      ).subscribe({
        next: (response: any) => {
          if (!response) return;
          const applicationReference = response.loanCode || String(response.id);
          this.showMessage('success', 'Application Submitted', `Your application ID is ${applicationReference}.`);
          this.loanRequestForm.reset();
          this.loanRequestForm.get('modeOfPayment')?.setValue('MONTHLY');
          this.loanRequestForm.get('monthlySalary')?.setValue(this.monthlySalary);
          this.loanRequestForm.get('repaymentTime')?.enable();
          this.loanRequestForm.get('repaymentDay')?.enable();
          this.showOtherPurpose = false;
          this.showInterestModal = false;
          this.defaultInterestRate = null;
          this.defaultInterestAcknowledged = false;
          this.pendingPurposeCode = null;
          this.supportingDocuments = [];
          this.loanSubmitted.emit(response as LoanApplication);
        },
        error: (err: Error) => {
          console.error('Error submitting loan application:', err);
          // Also covers failures before submission (e.g. the eligibility check), which used to leave
          // the Submit button disabled.
          this.isLoading = false;
          if (err instanceof LoanSubmissionUnconfirmedError) {
            // It may have gone through: keep this visible so the employee checks before retrying.
            this.showMessage('warn', 'Submission Not Confirmed', err.message, true);
            return;
          }
          this.showMessage('error', 'Submission Failed', this.errorMessageService.getUserMessage(err, 'There was an error submitting your application.'), true);
        }
      });
    } else {
      this.loanRequestForm.markAllAsTouched();
      if (this.modeOfPayment?.invalid) {
        this.showMessage('warn', 'Validation Error', 'Please select a mode of payment (Monthly or One-off).');
      } else {
        this.showMessage('warn', 'Validation Error', 'Please fill out all required fields correctly before submitting.');
      }
    }
  }
}
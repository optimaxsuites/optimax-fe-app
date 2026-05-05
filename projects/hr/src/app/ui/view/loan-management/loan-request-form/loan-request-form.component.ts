import { formatDate } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation} from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Message } from 'primeng/api';
import { of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanApplication, LoanApplicationFormData, LoanSupportingDocument } from '../../../service/loan/loan.types';
import { normalizeLoanRepaymentStartDate } from '../../../service/loan/loan-display.util';
import { ErrorMessageService } from '../../../shared-component/service/error-message/error-message.service';
import { LoanPurposeService, LoanPurposeData } from '../../../service/loan/loan-purpose.service';
import { EmployeeLoanService } from '../../../service/loan/emoloyee-loan.service';
import { EmployeeService } from '../../../service/employee.service';

@Component({
  selector: 'app-loan-request-form',
  templateUrl: './loan-request-form.component.html',
  styleUrls: ['./loan-request-form.component.scss'],
  encapsulation: ViewEncapsulation.None 
})
export class LoanRequestFormComponent implements OnInit {
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
  isLoadingSalary = false;

  constructor(
    private fb: FormBuilder,
    private loanApplicationService: LoanApplicationService,
    private errorMessageService: ErrorMessageService,
    private loanPurposeService: LoanPurposeService,
    private employeeLoanService: EmployeeLoanService,
    private employeeService: EmployeeService
  ) {}

  private extractSalaryAmount(payload: any): number {
    if (Array.isArray(payload)) {
      return payload.reduce((highest, item) => Math.max(highest, this.extractSalaryAmount(item)), 0);
    }

    if (!payload || typeof payload !== 'object') {
      return Number(payload || 0);
    }

    const directAmount = Number(
      payload?.baseSalary
      || payload?.monthlySalary
      || payload?.salary
      || payload?.grossSalary
      || payload?.netSalary
      || 0
    );

    if (directAmount > 0) {
      return directAmount;
    }

    const nestedKeys = ['data', 'content', 'result', 'salaryDetails', 'salaryData', 'payload'];
    for (const key of nestedKeys) {
      if (payload[key] !== undefined) {
        const nestedAmount = this.extractSalaryAmount(payload[key]);
        if (nestedAmount > 0) {
          return nestedAmount;
        }
      }
    }

    return 0;
  }

  private resolveEmployeeIdCandidate(): number {
    const candidates = [
      this.employeeId,
      sessionStorage.getItem('employeeId'),
      localStorage.getItem('employeeId')
    ];

    for (const candidate of candidates) {
      const value = Number(candidate || 0);
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }

    return 0;
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
    this.loanRequestForm.get('modeOfPayment')?.valueChanges.subscribe((mode) => {
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

    this.loanRequestForm.get('purpose')?.valueChanges.subscribe((value: string) => {
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
    });
  }

  setupFormListeners(): void {
    this.loanRequestForm.get('amount')?.valueChanges.subscribe(() => {
      this.calculateRepaymentAmount();
    });

    this.loanRequestForm.get('repaymentTime')?.valueChanges.subscribe(() => {
      this.calculateRepaymentAmount();
      this.updateRepaymentDayFromStartDate();
    });

    this.loanRequestForm.get('modeOfPayment')?.valueChanges.subscribe(() => {
      this.calculateRepaymentAmount();
    });

    this.loanRequestForm.get('repaymentStartDate')?.valueChanges.subscribe(() => {
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
        this.loanPurposes = purposes;
        this.isLoadingPurposes = false;
      },
      error: (err: Error) => {
        console.error('Error loading loan purposes:', err);
        this.isLoadingPurposes = false;
      }
    });
  }

  loadEmployeeSalary(): void {
    const fallbackEmployeeId = this.resolveEmployeeIdCandidate();
    if (!fallbackEmployeeId) return;

    this.isLoadingSalary = true;

    this.employeeService.getCurrentEmployee().pipe(
      map((employee: any) => {
        const resolvedEmployeeId = Number(employee?.id || employee?.employeeId || fallbackEmployeeId || 0);
        return {
          resolvedEmployeeId,
          employee
        };
      }),
      catchError(() => of({
        resolvedEmployeeId: fallbackEmployeeId,
        employee: null
      })),
      switchMap(({ resolvedEmployeeId, employee }) => {
        if (!resolvedEmployeeId) {
          return of({ salary: 0, employee });
        }

        this.employeeId = String(resolvedEmployeeId);

        return this.employeeLoanService.getSalaryByEmployeeId(resolvedEmployeeId).pipe(
          map((salaryData: any) => ({
            salary: this.extractSalaryAmount(salaryData),
            employee
          })),
          catchError((salaryError: any) => {
            console.error('Error loading salary:', salaryError);
            return this.employeeLoanService.getEmployeeById(resolvedEmployeeId).pipe(
              map((employeeFallback: any) => ({
                salary: this.extractSalaryAmount(employeeFallback) || this.extractSalaryAmount(employee),
                employee: employeeFallback || employee
              })),
              catchError((fallbackErr: any) => {
                console.error('Fallback also failed:', fallbackErr);
                return of({
                  salary: this.extractSalaryAmount(employee),
                  employee
                });
              })
            );
          })
        );
      }),
      finalize(() => {
        this.isLoadingSalary = false;
      })
    ).subscribe({
      next: ({ salary, employee }) => {
        this.monthlySalary = salary && salary > 0 ? salary : 20000000;
        if (employee) {
          this.employeeName = this.employeeName || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim();
        }
        this.loanRequestForm.get('monthlySalary')?.setValue(this.monthlySalary);
      }
    });
  }

  calculateRepaymentAmount(): void {
    const amount = this.loanRequestForm.get('amount')?.value;
    const repaymentTime = this.loanRequestForm.get('repaymentTime')?.value;
    const modeOfPayment = this.loanRequestForm.get('modeOfPayment')?.value;
    
    if (amount && repaymentTime) {
      if (modeOfPayment === 'ONE_OFF') {
        this.loanRequestForm.get('repaymentAmountAmount')?.setValue(amount);
      } else {
        const repaymentAmount = amount / repaymentTime;
        this.loanRequestForm.get('repaymentAmountAmount')?.setValue(Number(repaymentAmount.toFixed(2)));
      }
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
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  get purpose(): AbstractControl | null { return this.loanRequestForm.get('purpose'); }
  get otherPurpose(): AbstractControl | null { return this.loanRequestForm.get('otherPurpose'); }
  get amount(): AbstractControl | null { return this.loanRequestForm.get('amount'); }
  get repaymentTime(): AbstractControl | null { return this.loanRequestForm.get('repaymentTime'); }
  get repaymentStartDate(): AbstractControl | null { return this.loanRequestForm.get('repaymentStartDate'); }
  get repaymentDay(): AbstractControl | null { return this.loanRequestForm.get('repaymentDay'); }
  get repaymentAmountAmount(): AbstractControl | null { return this.loanRequestForm.get('repaymentAmountAmount'); }
  get modeOfPayment(): AbstractControl | null { return this.loanRequestForm.get('modeOfPayment'); }
  get acknowledgment(): AbstractControl | null { return this.loanRequestForm.get('acknowledgment'); }

  getMinRepaymentDate(): string {
    const today = new Date();
    today.setMonth(today.getMonth() + 1);
    return today.toISOString().split('T')[0];
  }

  // ==================== INTEREST RATE MODAL METHODS ====================

  onInterestAcknowledgedChange(): void {
    // State is already bound via ngModel
  }

  acceptInterestAndContinue(): void {
    if (this.defaultInterestAcknowledged && this.pendingPurposeCode) {
      this.loanRequestForm.patchValue({ purpose: this.pendingPurposeCode });
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

  private showMessage(severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string): void {
    this.messages = [{ severity, summary, detail }];
    setTimeout(() => { this.messages = []; }, 5000);
  }

  onSubmit(): void {
    if (this.showInterestModal) {
      this.showMessage('warn', 'Interest Rate Confirmation Required', 
        'Please acknowledge the fixed interest rate for this loan purpose by checking the box and clicking "Accept & Continue".');
      return;
    }

    if (this.loanRequestForm.valid) {
      this.isLoading = true;

      this.employeeLoanService.getAllLoans().pipe(
        map((loans: any[]) => {
          const employeeLoans = (loans || []).filter(l => String(l.employeeId) === String(this.employeeId));
          const activeLoans = employeeLoans.filter(l => l.status === 'ACTIVE');
          const totalActiveLoanAmount = activeLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
          return totalActiveLoanAmount;
        }),
        switchMap((totalActiveLoanAmount: number) => {
          const oneThirdSalary = this.monthlySalary / 3;
          const requestedAmount = parseFloat(this.loanRequestForm.get('amount')?.value);
          if ((totalActiveLoanAmount + requestedAmount) > oneThirdSalary) {
            this.isLoading = false;
            this.showMessage('error', 'Loan Limit Exceeded', `You cannot request this loan because your total active loans would exceed one-third of your monthly salary (₦${oneThirdSalary.toLocaleString()}).`);
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
          this.showMessage('error', 'Submission Failed', this.errorMessageService.getUserMessage(err, 'There was an error submitting your application.'));
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
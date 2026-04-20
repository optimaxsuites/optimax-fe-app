// loan-request-form.component.ts
import { formatDate } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Message } from 'primeng/api';
import { of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanApplicationFormData, LoanSupportingDocument } from '../../../service/loan/loan.types';
import { normalizeLoanRepaymentStartDate } from '../../../service/loan/loan-display.util';
import { ErrorMessageService } from '../../../shared-component/service/error-message/error-message.service';
import { LoanPurposeService, LoanPurposeData } from '../../../service/loan/loan-purpose.service';
import { EmployeeLoanService } from '../../../service/loan/emoloyee-loan.service';
import { EmployeeService } from '../../../service/employee.service';

@Component({
  selector: 'app-loan-request-form',
  templateUrl: './loan-request-form.component.html',
  styleUrls: ['./loan-request-form.component.scss']
})
export class LoanRequestFormComponent implements OnInit {
  @Input() isModal = false;
  @Input() employeeId = '';
  @Input() employeeName = '';
  @Input() department = '';
  @Output() loanSubmitted = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();

  loanRequestForm!: FormGroup;
  showOtherPurpose = false;
  isLoading = false;
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
      repaymentTime: ['', [Validators.required, Validators.min(1), Validators.max(60)]], // Updated: min 1, max 60 months
      repaymentStartDate: ['', Validators.required],
      repaymentDay: [{ value: '', disabled: true }],
      repaymentAmountAmount: [{ value: '', disabled: true }, [Validators.required]],
      modeOfPayment: [{ value: '', disabled: true }, Validators.required],
      acknowledgment: [false, Validators.requiredTrue]
    });

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
    });
  }

  setupFormListeners(): void {
    this.loanRequestForm.get('amount')?.valueChanges.subscribe(() => {
      this.calculateRepaymentAmount();
    });

    this.loanRequestForm.get('repaymentTime')?.valueChanges.subscribe(() => {
      const repaymentTime = this.loanRequestForm.get('repaymentTime')?.value;
      const modeOfPaymentControl = this.loanRequestForm.get('modeOfPayment');

      if (!repaymentTime) {
        modeOfPaymentControl?.reset('');
        modeOfPaymentControl?.disable({ emitEvent: false });
      } else if (modeOfPaymentControl?.disabled) {
        modeOfPaymentControl.enable({ emitEvent: false });
      }

      this.calculateRepaymentAmount();
      this.syncRepaymentDayControl();
    });

    this.loanRequestForm.get('modeOfPayment')?.valueChanges.subscribe((mode: string) => {
      if (mode === 'ONE_OFF') {
        const amount = this.loanRequestForm.get('amount')?.value;
        if (amount) {
          this.loanRequestForm.get('repaymentAmountAmount')?.setValue(amount);
        }
      } else {
        this.calculateRepaymentAmount();
      }

      this.syncRepaymentDayControl();
    });

    this.loanRequestForm.get('repaymentStartDate')?.valueChanges.subscribe(() => {
      this.syncRepaymentDayControl();
    });
  }

  private syncRepaymentDayControl(): void {
    const repaymentDayControl = this.loanRequestForm.get('repaymentDay');
    const modeOfPayment = String(this.loanRequestForm.get('modeOfPayment')?.value || '').trim().toUpperCase();
    const repaymentStartDate = normalizeLoanRepaymentStartDate(this.loanRequestForm.get('repaymentStartDate')?.value);

    if (modeOfPayment === 'MONTHLY') {
      repaymentDayControl?.enable({ emitEvent: false });
      repaymentDayControl?.setValidators([Validators.required, Validators.min(1), Validators.max(31)]);

      const currentValue = Number(repaymentDayControl?.value || 0);
      if (!Number.isFinite(currentValue) || currentValue < 1 || currentValue > 31) {
        repaymentDayControl?.setValue(this.deriveRepaymentDay(repaymentStartDate), { emitEvent: false });
      }
    } else {
      repaymentDayControl?.reset('', { emitEvent: false });
      repaymentDayControl?.clearValidators();
      repaymentDayControl?.disable({ emitEvent: false });
    }

    repaymentDayControl?.updateValueAndValidity({ emitEvent: false });
  }

  private deriveRepaymentDay(repaymentStartDate: string): number | null {
    const normalizedDate = normalizeLoanRepaymentStartDate(repaymentStartDate);
    if (!normalizedDate) {
      return null;
    }

    const parsedDate = new Date(normalizedDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    const derivedDay = parsedDate.getDate();
    return derivedDay >= 1 && derivedDay <= 31 ? derivedDay : null;
  }

  updateAmountValidator(): void {
    const selectedCode = this.loanRequestForm.get('purpose')?.value;
    if (selectedCode && selectedCode !== 'other') {
      const selectedPurpose = this.loanPurposes.find(p => p.code === selectedCode);
      if (selectedPurpose) {
        const amountControl = this.loanRequestForm.get('amount');
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
      }
    }
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
  console.log('Loading salary for employee ID:', this.employeeId || fallbackEmployeeId);

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
      this.monthlySalary = Number(salary || 0);
      if (employee) {
        this.employeeName = this.employeeName || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim();
      }
      this.loanRequestForm.get('monthlySalary')?.setValue(this.monthlySalary);
      console.log('Monthly salary found:', this.monthlySalary);
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

  get maxLoanAmount(): number {
    const selectedCode = this.loanRequestForm.get('purpose')?.value;
    if (!selectedCode || selectedCode === 'other') return 50000000;
    const selected = this.loanPurposes.find(p => p.code === selectedCode);
    return selected?.maxLoanAmount || 50000000;
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

  onDocumentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const selectedDocuments: LoanSupportingDocument[] = Array.from(files).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      uploadedAt: formatDate(new Date(), 'yyyy-MM-dd', 'en-US')
    }));

    this.supportingDocuments = [...this.supportingDocuments, ...selectedDocuments];
    input.value = '';
  }

  removeDocument(index: number): void {
    this.supportingDocuments = this.supportingDocuments.filter((_, i) => i !== index);
  }

  onCancel(): void {
    this.formCancelled.emit();
  }

  private showMessage(severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string): void {
    this.messages = [{ severity, summary, detail }];
    setTimeout(() => { this.messages = []; }, 5000);
  }

  onSubmit(): void {
    if (this.loanRequestForm.valid) {
      this.isLoading = true;

      const selectedPurpose = this.loanPurposes.find(p => p.code === this.loanRequestForm.get('purpose')?.value);
      const normalizedPurpose = String(
        this.showOtherPurpose
          ? this.loanRequestForm.get('otherPurpose')?.value
          : (selectedPurpose?.name || this.loanRequestForm.get('purpose')?.value)
      ).trim();
      const normalizedPurposeCode = String(this.showOtherPurpose ? 'other' : this.loanRequestForm.get('purpose')?.value || '').trim();
      const normalizedRepaymentStartDate = normalizeLoanRepaymentStartDate(this.loanRequestForm.get('repaymentStartDate')?.value);
      const normalizedModeOfPayment = this.loanRequestForm.get('modeOfPayment')?.value;
      const normalizedRepaymentDay = normalizedModeOfPayment === 'MONTHLY'
        ? Number(this.loanRequestForm.get('repaymentDay')?.value || this.deriveRepaymentDay(normalizedRepaymentStartDate) || 0)
        : undefined;
      const repaymentDay = typeof normalizedRepaymentDay === 'number' && normalizedRepaymentDay > 0
        ? normalizedRepaymentDay
        : undefined;
      
      const formData: LoanApplicationFormData = {
        purpose: normalizedPurpose,
        purposeCode: normalizedPurposeCode,
        otherPurpose: this.loanRequestForm.get('otherPurpose')?.value,
        amount: parseFloat(this.loanRequestForm.get('amount')?.value),
        repaymentTime: parseInt(this.loanRequestForm.get('repaymentTime')?.value, 10),
        repaymentStartDate: normalizedRepaymentStartDate,
        repaymentDay,
        repaymentAmount: parseFloat(this.loanRequestForm.get('repaymentAmountAmount')?.value),
        modeOfPayment: normalizedModeOfPayment,
        acknowledgment: this.loanRequestForm.get('acknowledgment')?.value,
        supportingDocuments: this.supportingDocuments,
        requestDate: new Date().toISOString(),
        employeeId: Number(this.employeeId),
        employeeName: this.employeeName,
        department: this.department,
        monthlySalary: this.monthlySalary
      };

      this.loanApplicationService.submitLoanApplication(formData)
        .pipe(finalize(() => { this.isLoading = false; }))
        .subscribe({
          next: (response) => {
            const applicationReference = response.loanCode || String(response.id);
            this.showMessage('success', 'Application Submitted', `Your application ID is ${applicationReference}.`);
            this.loanRequestForm.reset();
            this.loanRequestForm.get('modeOfPayment')?.disable({ emitEvent: false });
            this.loanRequestForm.get('monthlySalary')?.setValue(this.monthlySalary);
            this.showOtherPurpose = false;
            this.supportingDocuments = [];
            this.loanSubmitted.emit();
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
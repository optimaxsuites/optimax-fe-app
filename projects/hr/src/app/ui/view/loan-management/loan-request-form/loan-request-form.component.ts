// loan-request-form.component.ts
import { formatDate } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Message } from 'primeng/api';
import { finalize } from 'rxjs/operators';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanApplicationFormData, LoanSupportingDocument } from '../../../service/loan/loan.types';
import { normalizeLoanRepaymentStartDate } from '../../../service/loan/loan-display.util';
import { ErrorMessageService } from '../../../shared-component/service/error-message/error-message.service';
import { LoanPurposeService, LoanPurposeData } from '../../../service/loan/loan-purpose.service';
import { EmployeeLoanService } from '../../../service/loan/emoloyee-loan.service';

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
  private employeeLoanService: EmployeeLoanService  
) {}


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
    });
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
  if (!this.employeeId) return;
  
  this.isLoadingSalary = true;
  console.log('Loading salary for employee ID:', this.employeeId);
  
  // First, try to get the employee ID as number
  const empId = Number(this.employeeId);
  
  this.employeeLoanService.getSalaryByEmployeeId(empId).subscribe({
    next: (salaryData: any) => {
      console.log('Salary API response:', salaryData);
      
      // The salary endpoint returns { baseSalary, allowance, deductions, etc. }
      this.monthlySalary = salaryData?.baseSalary || 0;
      
      console.log('Monthly salary found:', this.monthlySalary);
      this.loanRequestForm.get('monthlySalary')?.setValue(this.monthlySalary);
      this.isLoadingSalary = false;
    },
    error: (err: any) => {
      console.error('Error loading salary:', err);
      // Try to get from employee endpoint as fallback
      this.employeeLoanService.getEmployeeById(empId).subscribe({
        next: (employee: any) => {
          console.log('Employee fallback data:', employee);
          this.monthlySalary = employee?.monthlySalary || employee?.salary || 0;
          this.loanRequestForm.get('monthlySalary')?.setValue(this.monthlySalary);
          this.isLoadingSalary = false;
        },
        error: (fallbackErr: any) => {
          console.error('Fallback also failed:', fallbackErr);
          this.isLoadingSalary = false;
        }
      });
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
      
      const formData: LoanApplicationFormData = {
        purpose: this.showOtherPurpose 
          ? this.loanRequestForm.get('otherPurpose')?.value 
          : (selectedPurpose?.name || this.loanRequestForm.get('purpose')?.value),
        purposeCode: this.showOtherPurpose ? 'other' : this.loanRequestForm.get('purpose')?.value,
        otherPurpose: this.loanRequestForm.get('otherPurpose')?.value,
        amount: parseFloat(this.loanRequestForm.get('amount')?.value),
        repaymentTime: parseInt(this.loanRequestForm.get('repaymentTime')?.value, 10),
        repaymentStartDate: normalizeLoanRepaymentStartDate(this.loanRequestForm.get('repaymentStartDate')?.value),
        repaymentAmount: parseFloat(this.loanRequestForm.get('repaymentAmountAmount')?.value),
        modeOfPayment: this.loanRequestForm.get('modeOfPayment')?.value,
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
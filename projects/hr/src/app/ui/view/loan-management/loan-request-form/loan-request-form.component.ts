import { formatDate } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Message } from 'primeng/api';
import { finalize } from 'rxjs/operators';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanApplicationFormData, LoanSupportingDocument } from '../../../service/loan/loan.types';
import { ErrorMessageService } from '../../../shared-component/service/error-message/error-message.service';

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
  showOtherPurpose: boolean = false;
  isLoading = false;
  supportingDocuments: LoanSupportingDocument[] = [];
  messages: Message[] = [];

  constructor(
    private fb: FormBuilder,
    private loanApplicationService: LoanApplicationService,
    private errorMessageService: ErrorMessageService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormListeners();
  }

  initializeForm(): void {
    this.loanRequestForm = this.fb.group({
      // Loan Details
      purpose: ['', Validators.required],
      otherPurpose: [''],
      amount: ['', [Validators.required, Validators.min(10000), Validators.max(50000000)]],
      repaymentTime: ['', Validators.required],
      repaymentAmountAmount: [{value: '', disabled: true}, [Validators.required]],
      modeOfPayment: ['', Validators.required],
      // Acknowledgement
      acknowledgment: [false, Validators.requiredTrue]
    });

    // Conditional validation for "Other Purpose" field
    this.loanRequestForm.get('purpose')?.valueChanges.subscribe(value => {
      this.showOtherPurpose = value === 'other';
      const otherPurposeControl = this.loanRequestForm.get('otherPurpose');
      if (value === 'other') {
        otherPurposeControl?.setValidators(Validators.required);
      } else {
        otherPurposeControl?.clearValidators();
        otherPurposeControl?.setValue('');
      }
      otherPurposeControl?.updateValueAndValidity();
    });
  }

  setupFormListeners(): void {
    // Auto-calculate monthly repayment amount
    this.loanRequestForm.get('amount')?.valueChanges.subscribe(() => {
      this.calculaterepaymentAmount();
    });

    this.loanRequestForm.get('repaymentTime')?.valueChanges.subscribe(() => {
      this.calculaterepaymentAmount();
    });

    // Reset monthly repayment when one-off is selected
    this.loanRequestForm.get('modeOfPayment')?.valueChanges.subscribe(mode => {
      if (mode === 'ONE_OFF') {
        // For one-off payment, monthly repayment = total loan amount
        const amount = this.loanRequestForm.get('amount')?.value;
        if (amount) {
          this.loanRequestForm.get('repaymentAmountAmount')?.setValue(amount);
        }
      } else {
        this.calculaterepaymentAmount();
      }
    });
  }

  // Calculation method
  calculaterepaymentAmount(): void {
    const amount = this.loanRequestForm.get('amount')?.value;
    const repaymentTime = this.loanRequestForm.get('repaymentTime')?.value;
    const modeOfPayment = this.loanRequestForm.get('modeOfPayment')?.value;
    
    if (amount && repaymentTime) {
      if (modeOfPayment === 'ONE_OFF') {
        // For one-off payment, show full amount
        this.loanRequestForm.get('repaymentAmountAmount')?.setValue(amount);
      } else {
        // Standard monthly calculation
        const repaymentAmount = amount / repaymentTime;
        this.loanRequestForm.get('repaymentAmountAmount')?.setValue(Number(repaymentAmount.toFixed(2)));
      }
    }
  }

  // Getters for form controls
  get purpose(): AbstractControl | null { 
    return this.loanRequestForm.get('purpose'); 
  }
  
  get otherPurpose(): AbstractControl | null { 
    return this.loanRequestForm.get('otherPurpose'); 
  }
  
  get amount(): AbstractControl | null { 
    return this.loanRequestForm.get('amount'); 
  }
  
  get repaymentTime(): AbstractControl | null { 
    return this.loanRequestForm.get('repaymentTime'); 
  }
  
  get repaymentAmountAmount(): AbstractControl | null { 
    return this.loanRequestForm.get('repaymentAmountAmount'); 
  }
  
  get modeOfPayment(): AbstractControl | null {
    return this.loanRequestForm.get('modeOfPayment');
  }

  get acknowledgment(): AbstractControl | null { 
    return this.loanRequestForm.get('acknowledgment'); 
  }

  onDocumentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) {
      return;
    }

    const selectedDocuments = Array.from(files).map((file) => ({
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
  }

  onSubmit(): void {
    if (this.loanRequestForm.valid) {
      this.isLoading = true;

      // Prepare form data for submission
      const formData: LoanApplicationFormData = {
        purpose: this.loanRequestForm.get('purpose')?.value,
        otherPurpose: this.loanRequestForm.get('otherPurpose')?.value,
        amount: parseFloat(this.loanRequestForm.get('amount')?.value),
        repaymentTime: parseInt(this.loanRequestForm.get('repaymentTime')?.value),
        repaymentAmount: parseFloat(this.loanRequestForm.get('repaymentAmountAmount')?.value),
        modeOfPayment: this.loanRequestForm.get('modeOfPayment')?.value,
        acknowledgment: this.loanRequestForm.get('acknowledgment')?.value,
        supportingDocuments: this.supportingDocuments,
        requestDate: new Date().toISOString(),
        employeeId: Number(this.employeeId),
        employeeName: this.employeeName,
        department: this.department
      };

      this.loanApplicationService.submitLoanApplication(formData)
        .pipe(finalize(() => {
          this.isLoading = false;
        }))
        .subscribe({
          next: (response) => {
            const applicationReference = response.loanCode || String(response.id);
            this.showMessage('success', 'Application Submitted', `Your application ID is ${applicationReference}.`);

            this.loanRequestForm.reset();
            this.showOtherPurpose = false;
            this.supportingDocuments = [];
            this.loanSubmitted.emit();
          },
          error: (error) => {
            console.error('Error submitting loan application:', error);
            this.showMessage(
              'error',
              'Submission Failed',
              this.errorMessageService.getUserMessage(
                error,
                'There was an error submitting your application. Please try again later.'
              )
            );
          }
        });
    } else {
      this.loanRequestForm.markAllAsTouched();
      
      // Show specific error message for payment mode
      if (this.modeOfPayment?.invalid) {
        this.showMessage('warn', 'Validation Error', 'Please select a mode of payment (Monthly or One-off).');
      } else {
        this.showMessage('warn', 'Validation Error', 'Please fill out all required fields correctly before submitting.');
      }
    }
  }
}
import { formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanApplicationFormData } from '../../../service/loan/loan.types';

@Component({
  selector: 'app-loan-request-form',
  templateUrl: './loan-request-form.component.html',
  styleUrls: ['./loan-request-form.component.scss']
})
export class LoanRequestFormComponent implements OnInit {
  loanRequestForm!: FormGroup;
  showOtherPurpose: boolean = false;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private loanApplicationService: LoanApplicationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormListeners();
  }

  initializeForm(): void {
    this.loanRequestForm = this.fb.group({
      // Loan Details
      loanPurpose: ['', Validators.required],
      otherPurpose: [''],
      loanAmount: ['', [Validators.required, Validators.min(10000), Validators.max(50000000)]],
      repaymentPeriod: ['', Validators.required],
      monthlyRepaymentAmount: [{value: '', disabled: true}, [Validators.required]],
      // Payment Mode Field
      paymentMode: ['', Validators.required],
      // Acknowledgement
      acknowledgment: [false, Validators.requiredTrue]
    });

    // Conditional validation for "Other Purpose" field
    this.loanRequestForm.get('loanPurpose')?.valueChanges.subscribe(value => {
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
    this.loanRequestForm.get('loanAmount')?.valueChanges.subscribe(() => {
      this.calculateMonthlyRepayment();
    });

    this.loanRequestForm.get('repaymentPeriod')?.valueChanges.subscribe(() => {
      this.calculateMonthlyRepayment();
    });

    // Reset monthly repayment when one-off is selected
    this.loanRequestForm.get('paymentMode')?.valueChanges.subscribe(mode => {
      if (mode === 'one_off') {
        // For one-off payment, monthly repayment = total loan amount
        const loanAmount = this.loanRequestForm.get('loanAmount')?.value;
        if (loanAmount) {
          this.loanRequestForm.get('monthlyRepaymentAmount')?.setValue(loanAmount);
        }
      } else {
        this.calculateMonthlyRepayment();
      }
    });
  }

  // Calculation method
  calculateMonthlyRepayment(): void {
    const loanAmount = this.loanRequestForm.get('loanAmount')?.value;
    const repaymentPeriod = this.loanRequestForm.get('repaymentPeriod')?.value;
    const paymentMode = this.loanRequestForm.get('paymentMode')?.value;
    
    if (loanAmount && repaymentPeriod) {
      if (paymentMode === 'one_off') {
        // For one-off payment, show full amount
        this.loanRequestForm.get('monthlyRepaymentAmount')?.setValue(loanAmount);
      } else {
        // Standard monthly calculation
        const monthlyRepayment = loanAmount / repaymentPeriod;
        this.loanRequestForm.get('monthlyRepaymentAmount')?.setValue(Number(monthlyRepayment.toFixed(2)));
      }
    }
  }

  // Getters for form controls
  get loanPurpose(): AbstractControl | null { 
    return this.loanRequestForm.get('loanPurpose'); 
  }
  
  get otherPurpose(): AbstractControl | null { 
    return this.loanRequestForm.get('otherPurpose'); 
  }
  
  get loanAmount(): AbstractControl | null { 
    return this.loanRequestForm.get('loanAmount'); 
  }
  
  get repaymentPeriod(): AbstractControl | null { 
    return this.loanRequestForm.get('repaymentPeriod'); 
  }
  
  get monthlyRepaymentAmount(): AbstractControl | null { 
    return this.loanRequestForm.get('monthlyRepaymentAmount'); 
  }
  
  get paymentMode(): AbstractControl | null {
    return this.loanRequestForm.get('paymentMode');
  }

  get acknowledgment(): AbstractControl | null { 
    return this.loanRequestForm.get('acknowledgment'); 
  }

  onSubmit(): void {
    if (this.loanRequestForm.valid) {
      this.isLoading = true;

      // Prepare form data for submission
      const formData: LoanApplicationFormData = {
        loanPurpose: this.loanRequestForm.get('loanPurpose')?.value,
        otherPurpose: this.loanRequestForm.get('otherPurpose')?.value,
        loanAmount: parseFloat(this.loanRequestForm.get('loanAmount')?.value),
        repaymentPeriod: parseInt(this.loanRequestForm.get('repaymentPeriod')?.value),
        monthlyRepaymentAmount: parseFloat(this.loanRequestForm.get('monthlyRepaymentAmount')?.value),
        paymentMode: this.loanRequestForm.get('paymentMode')?.value,
        acknowledgment: this.loanRequestForm.get('acknowledgment')?.value,
        submissionDate: formatDate(new Date(), 'yyyy-MM-dd', 'en-US')
      };

      // Submit to service
      this.loanApplicationService.submitLoanApplication(formData).subscribe({
        next: (response) => {
          console.log('Loan application submitted successfully:', response);
          alert('Application submitted successfully! Your application ID: ' + response.id);

          // Reset form
          this.loanRequestForm.reset();
          this.showOtherPurpose = false;

          // Navigate to dashboard
          this.router.navigate(['/loan-dashboard']);
        },
        error: (error) => {
          console.error('Error submitting loan application:', error);
          alert('There was an error submitting your application. Please try again later.');
        },
        complete: () => {
          this.isLoading = false; 
        }
      });
    } else {
      this.loanRequestForm.markAllAsTouched();
      
      // Show specific error message for payment mode
      if (this.paymentMode?.invalid) {
        alert('Please select a mode of payment (Monthly or One-off).');
      } else {
        alert('Please fill out all required fields correctly before submitting.');
      }
    }
  }
}
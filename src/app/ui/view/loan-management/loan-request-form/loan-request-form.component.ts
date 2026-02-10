import { formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { LoanService } from '../../../service/loan/loan.service';

@Component({
  selector: 'app-loan-request-form',
  templateUrl: './loan-request-form.component.html',
  styleUrls: ['./loan-request-form.component.scss']
})
export class LoanRequestFormComponent implements OnInit {
  loanRequestForm!: FormGroup;
  showOtherPurpose: boolean = false;
  isLoading = false;

  constructor(private fb: FormBuilder,
    private loanService: LoanService, // Inject service
    private router: Router // Inject router for navigation after submission
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormListeners();
  }

  initializeForm(): void {
    this.loanRequestForm = this.fb.group({
      // Only Section 2: Loan Details
      loanPurpose: ['', Validators.required],
      otherPurpose: [''],
      loanAmount: ['', [Validators.required, Validators.min(10000), Validators.max(50000000)]],
      repaymentPeriod: ['', Validators.required],
      monthlyRepaymentAmount: [{value: '', disabled: true}, [Validators.required, Validators.min(5000)]],
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
  }

  // Calculation method
  calculateMonthlyRepayment(): void {
    const loanAmount = this.loanRequestForm.get('loanAmount')?.value;
    const repaymentPeriod = this.loanRequestForm.get('repaymentPeriod')?.value;
    
    if (loanAmount && repaymentPeriod) {
      // Simple calculation: total amount ÷ number of months
      const monthlyRepayment = loanAmount / repaymentPeriod;
      this.loanRequestForm.get('monthlyRepaymentAmount')?.setValue(monthlyRepayment.toFixed(2));
    }
  }

  // Getters for easy access to form controls in the template
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
  
  get acknowledgment(): AbstractControl | null { 
    return this.loanRequestForm.get('acknowledgment'); 
  }

  onSubmit(): void {
    if (this.loanRequestForm.valid) {
      this.isLoading = true;

      // Prepare form data for submission
      const formData = {
        ...this.loanRequestForm.getRawValue(),
        monthlyRepaymentAmount: parseFloat(this.loanRequestForm.get('monthlyRepaymentAmount')?.value),
        submissionDate: formatDate(new Date(), 'yyyy-MM-dd', 'en-US') // Add submission date
      };

      // Submit to service
      this.loanService.submitLoanApplication(formData).subscribe({
        next: (response) => {
          console.log('Loan application submitted successfully:', response);
          alert('Application submitted successfully! Your application ID: ' + response.id);


          // Reset form
          this.loanRequestForm.reset();
          this.showOtherPurpose = false;

          // Navigate to dashboard or confirmation page
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
  }else {
    this.loanRequestForm.markAllAsTouched(); // Highlight validation errors
    alert('Please fill out all required fields correctly before submitting.');
  }
  }
}
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeMember, CooperativeLoanProduct } from '../../../service/loan/cooperative-loan/cooperative.types';



@Component({
  selector: 'app-cooperative-loan-application',
  templateUrl: './cooperative-loan-application.component.html',
  styleUrls: ['./cooperative-loan-application.component.scss']
})
export class CooperativeLoanApplicationComponent implements OnInit {
  applicationForm!: FormGroup;
  members: CooperativeMember[] = [];
  products: CooperativeLoanProduct[] = [];
  selectedProduct?: CooperativeLoanProduct;
  
  // Calculated values
  monthlyRepayment = 0;
  totalRepayment = 0;
  totalInterest = 0;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private cooperativeService: CooperativeService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.initForm();
  }

  loadData(): void {
    this.cooperativeService.getMembers().subscribe(members => {
      this.members = members.filter(m => m.status === 'ACTIVE');
    });
    this.products = this.cooperativeService.getProducts().filter(p => p.status === 'ACTIVE');
  }

  initForm(): void {
    this.applicationForm = this.fb.group({
      memberId: ['', Validators.required],
      productId: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(1000)]],
      purpose: ['', Validators.required],
      duration: ['', [Validators.required, Validators.min(1)]],
      acceptTerms: [false, Validators.requiredTrue]
    });

    // Watch for changes
    this.applicationForm.get('productId')?.valueChanges.subscribe(productId => {
      this.onProductSelect(productId);
    });

    this.applicationForm.get('amount')?.valueChanges.subscribe(() => {
      this.calculateRepayment();
    });

    this.applicationForm.get('duration')?.valueChanges.subscribe(() => {
      this.calculateRepayment();
    });
  }

  onProductSelect(productId: string): void {
    this.selectedProduct = this.products.find(p => p.id === productId);
    if (this.selectedProduct) {
      // Set validators
      this.applicationForm.get('amount')?.setValidators([
        Validators.required,
        Validators.min(this.selectedProduct.minAmount),
        Validators.max(this.selectedProduct.maxAmount)
      ]);
      this.applicationForm.get('duration')?.setValidators([
        Validators.required,
        Validators.min(this.selectedProduct.minDuration),
        Validators.max(this.selectedProduct.maxDuration)
      ]);
      
      this.applicationForm.get('amount')?.updateValueAndValidity();
      this.applicationForm.get('duration')?.updateValueAndValidity();
    }
  }

  calculateRepayment(): void {
    const amount = this.applicationForm.get('amount')?.value;
    const duration = this.applicationForm.get('duration')?.value;
    
    if (amount && duration && this.selectedProduct) {
      this.totalInterest = (amount * this.selectedProduct.interestRate / 100);
      this.totalRepayment = amount + this.totalInterest;
      this.monthlyRepayment = this.totalRepayment / duration;
    }
  }

  onSubmit(): void {
    if (this.applicationForm.valid && this.selectedProduct) {
      const formValue = this.applicationForm.value;
      
      const newLoan = {
        memberId: formValue.memberId,
        productId: formValue.productId,
        amount: formValue.amount,
        purpose: formValue.purpose,
        duration: formValue.duration,
        interestRate: this.selectedProduct.interestRate,
        monthlyRepayment: this.monthlyRepayment,
        totalRepayment: this.totalRepayment,
        status: 'PENDING',
        applicationDate: new Date().toISOString()
      };

      const saved = this.cooperativeService.addLoan(newLoan as any);
      this.router.navigate(['/admin/hr/cooperative/loans', saved.id]);
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/cooperative/dashboard']);
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }
}
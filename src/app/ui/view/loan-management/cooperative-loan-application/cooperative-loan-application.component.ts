import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeMember, CooperativeLoanProduct } from '../../../service/loan/cooperative-loan/cooperative.types';



@Component({
  selector: 'app-cooperative-loan-application',
  templateUrl: './cooperative-loan-application.component.html',
  styleUrls: ['./cooperative-loan-application.component.scss']
})
export class CooperativeLoanApplicationComponent implements OnInit {
  @Input() isModal = false;
  @Input() prefillMemberId: string | null = null;
  @Output() formCancelled = new EventEmitter<void>();
  @Output() applicationSubmitted = new EventEmitter<void>();

  applicationForm!: FormGroup;
  members: CooperativeMember[] = [];
  products: CooperativeLoanProduct[] = [];
  selectedProduct?: CooperativeLoanProduct;
  selectedMember?: CooperativeMember;
  
  // Calculated values
  monthlyRepayment = 0;
  totalRepayment = 0;
  totalInterest = 0;
  prefillMemberParam: string | null = null;
  submitError = '';
  submitSuccessMessage = '';
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private cooperativeService: CooperativeService
  ) {}

  ngOnInit(): void {
    if (this.prefillMemberId) {
      this.prefillMemberParam = this.prefillMemberId;
    }

    this.route.queryParamMap.subscribe(params => {
      this.prefillMemberParam = params.get('memberId') || this.prefillMemberId;
      this.tryApplyPrefillMember();
    });

    this.loadData();
    this.initForm();
  }

  loadData(): void {
    this.cooperativeService.getMembers().subscribe(members => {
      this.members = members.filter(m => m.status === 'ACTIVE');
      this.tryApplyPrefillMember();
    });
    this.products = this.cooperativeService.getProducts().filter(p => p.status === 'ACTIVE');
  }

  tryApplyPrefillMember(): void {
    if (!this.prefillMemberParam || !this.applicationForm || this.members.length === 0) {
      return;
    }

    const matchedMember = this.members.find(member =>
      member.id === this.prefillMemberParam || member.memberId === this.prefillMemberParam
    );

    if (matchedMember) {
      this.applicationForm.patchValue({ memberId: matchedMember.id });
    }
  }

  initForm(): void {
    this.applicationForm = this.fb.group({
      memberId: ['', Validators.required],
      productId: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(1000)]],
      purpose: ['', Validators.required],
      duration: ['', [Validators.required, Validators.min(1)]],
      useSharesAsCollateral: [false],
      pledgedSharesAmount: [0],
      acceptTerms: [false, Validators.requiredTrue],
      acceptAcknowledgement: [false, Validators.requiredTrue]
    });

    // Watch for changes
    this.applicationForm.get('productId')?.valueChanges.subscribe(productId => {
      this.onProductSelect(productId);
    });

    this.applicationForm.get('memberId')?.valueChanges.subscribe(memberId => {
      this.selectedMember = this.members.find(member => member.id === memberId);
      this.validateShareEligibility();
      this.validatePledgedShares();
    });

    this.applicationForm.get('amount')?.valueChanges.subscribe(() => {
      this.calculateRepayment();
      this.validateShareEligibility();
      this.validatePledgedShares();
    });

    this.applicationForm.get('duration')?.valueChanges.subscribe(() => {
      this.calculateRepayment();
    });

    this.applicationForm.get('useSharesAsCollateral')?.valueChanges.subscribe(() => {
      this.validatePledgedShares();
    });

    this.applicationForm.get('pledgedSharesAmount')?.valueChanges.subscribe(() => {
      this.validatePledgedShares();
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

      if (this.selectedProduct.requiresShares) {
        this.applicationForm.patchValue({ useSharesAsCollateral: true }, { emitEvent: false });
      }

      this.validateShareEligibility();
      this.validatePledgedShares();
      this.calculateRepayment();
    }
  }

  validateShareEligibility(): void {
    const amountControl = this.applicationForm.get('amount');
    if (!amountControl) {
      return;
    }

    const amount = Number(amountControl.value || 0);
    if (!this.selectedProduct?.requiresShares || !this.selectedMember || !amount) {
      if (amountControl.hasError('shareLimit')) {
        const errors = { ...(amountControl.errors || {}) };
        delete errors['shareLimit'];
        amountControl.setErrors(Object.keys(errors).length ? errors : null);
      }
      return;
    }

    if (amount > this.selectedMember.shareCapital) {
      amountControl.setErrors({ ...(amountControl.errors || {}), shareLimit: true });
      return;
    }

    if (amountControl.hasError('shareLimit')) {
      const errors = { ...(amountControl.errors || {}) };
      delete errors['shareLimit'];
      amountControl.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  calculateRepayment(): void {
    const amount = Number(this.applicationForm.get('amount')?.value || 0);
    const duration = Number(this.applicationForm.get('duration')?.value || 0);
    
    if (amount > 0 && duration > 0 && this.selectedProduct) {
      this.totalInterest = (amount * this.selectedProduct.interestRate / 100);
      this.totalRepayment = amount + this.totalInterest;
      this.monthlyRepayment = this.totalRepayment / duration;
      return;
    }

    this.totalInterest = 0;
    this.totalRepayment = 0;
    this.monthlyRepayment = 0;
  }

  validatePledgedShares(): void {
    const pledgedControl = this.applicationForm.get('pledgedSharesAmount');
    if (!pledgedControl) {
      return;
    }

    const useCollateral = Boolean(this.applicationForm.get('useSharesAsCollateral')?.value);
    const amount = Number(this.applicationForm.get('amount')?.value || 0);
    const pledgedSharesAmount = Number(pledgedControl.value || 0);
    const availableShares = Number(this.selectedMember?.shareCapital || 0);

    if (!this.selectedProduct?.requiresShares && !useCollateral) {
      pledgedControl.setErrors(null);
      return;
    }

    const errors = { ...(pledgedControl.errors || {}) };
    delete errors['required'];
    delete errors['min'];
    delete errors['maxShares'];
    delete errors['overAmount'];

    if (useCollateral || this.selectedProduct?.requiresShares) {
      if (pledgedSharesAmount <= 0) {
        errors['required'] = true;
      }
      if (pledgedSharesAmount > availableShares) {
        errors['maxShares'] = true;
      }
      if (amount > 0 && pledgedSharesAmount > amount) {
        errors['overAmount'] = true;
      }
    }

    pledgedControl.setErrors(Object.keys(errors).length ? errors : null);
  }

  private validateBeforeSubmit(): boolean {
    this.submitError = '';

    if (!this.selectedProduct || !this.selectedMember) {
      this.submitError = 'Please select member and product.';
      return false;
    }

    const amount = Number(this.applicationForm.get('amount')?.value || 0);
    const duration = Number(this.applicationForm.get('duration')?.value || 0);
    const useSharesAsCollateral = Boolean(this.applicationForm.get('useSharesAsCollateral')?.value);
    const pledgedSharesAmount = Number(this.applicationForm.get('pledgedSharesAmount')?.value || 0);

    if (amount < this.selectedProduct.minAmount || amount > this.selectedProduct.maxAmount) {
      this.submitError = `Amount must be between ${this.formatCurrency(this.selectedProduct.minAmount)} and ${this.formatCurrency(this.selectedProduct.maxAmount)}.`;
      return false;
    }

    if (duration < this.selectedProduct.minDuration || duration > this.selectedProduct.maxDuration) {
      this.submitError = `Duration must be between ${this.selectedProduct.minDuration} and ${this.selectedProduct.maxDuration} months.`;
      return false;
    }

    if (this.selectedProduct.requiresShares && amount > this.selectedMember.shareCapital) {
      this.submitError = 'Share-backed loan amount cannot exceed member available shares.';
      return false;
    }

    if ((this.selectedProduct.requiresShares || useSharesAsCollateral) && pledgedSharesAmount <= 0) {
      this.submitError = 'Please provide a valid amount to pledge as shares collateral.';
      return false;
    }

    if (pledgedSharesAmount > this.selectedMember.shareCapital) {
      this.submitError = 'Pledged shares amount cannot exceed available shares.';
      return false;
    }

    if (amount > 0 && pledgedSharesAmount > amount) {
      this.submitError = 'Pledged shares amount cannot be greater than loan amount.';
      return false;
    }

    return true;
  }

  onSubmit(): void {
    if (this.isSubmitting) {
      return;
    }

    this.applicationForm.markAllAsTouched();
    this.validateShareEligibility();
    this.validatePledgedShares();
    this.calculateRepayment();
    this.submitSuccessMessage = '';

    if (!this.applicationForm.valid || !this.selectedProduct || !this.validateBeforeSubmit()) {
      return;
    }

    this.isSubmitting = true;

    const formValue = this.applicationForm.value;
    const newLoan = {
      memberId: formValue.memberId,
      productId: formValue.productId,
      amount: Number(formValue.amount),
      purpose: String(formValue.purpose || '').trim(),
      duration: Number(formValue.duration),
      interestRate: this.selectedProduct.interestRate,
      monthlyRepayment: this.monthlyRepayment,
      totalRepayment: this.totalRepayment,
      status: 'PENDING' as const,
      applicationDate: new Date().toISOString(),
      useSharesAsCollateral: Boolean(formValue.useSharesAsCollateral || this.selectedProduct.requiresShares),
      pledgedSharesAmount: Number(formValue.pledgedSharesAmount || 0)
    };

    const saved = this.cooperativeService.addLoan(newLoan as any);
    this.submitSuccessMessage = 'Application submitted successfully. Acknowledgement captured and admin notified for approval.';

    setTimeout(() => {
      if (this.isModal) {
        this.applicationSubmitted.emit();
        this.formCancelled.emit();
        this.isSubmitting = false;
        return;
      }

      this.router.navigate(['/admin/hr/cooperative/loans', saved.id, uuidV4()], {
        queryParams: { created: 'pending' }
      });
    }, 1200);
  }

  goBack(): void {
    if (this.isModal) {
      this.formCancelled.emit();
      return;
    }

    this.router.navigate(['/admin/hr/cooperative/dashboard', uuidV4()]);
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }
}
// returns-refunds.component.ts
import { Component, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';

interface ReturnProduct {
  productName: string;
  sku: string;
  quantity: number;
  purchasePrice: number;
}

interface ConditionOption {
  label: string;
  value: string;
}

interface RefundMethod {
  label: string;
  value: string;
  description: string;
}

@Component({
  selector: 'app-returns-refunds',
  templateUrl: './returns-refunds.component.html',
  styleUrls: ['./returns-refunds.component.scss']
})
export class ReturnsRefundsComponent {
  returnForm: FormGroup;
  isSubmitting = signal(false);
  currentStep = signal(1);

  // Computed properties for step navigation
  canGoToStep2 = computed(() => this.currentStep() === 1);
  canGoToStep3 = computed(() => this.currentStep() === 2 && this.returnForm.valid);
  isStep1 = computed(() => this.currentStep() === 1);
  isStep2 = computed(() => this.currentStep() === 2);
  isStep3 = computed(() => this.currentStep() === 3);

  conditionOptions: ConditionOption[] = [
    { label: 'Unopened & New', value: 'new' },
    { label: 'Opened - Like New', value: 'like-new' },
    { label: 'Used - Good', value: 'good' },
    { label: 'Used - Fair', value: 'fair' },
    { label: 'Damaged', value: 'damaged' }
  ];

  refundMethods: RefundMethod[] = [
    { 
      label: 'Original Payment Method', 
      value: 'original', 
      description: 'Refund to your original payment method (3-5 business days)' 
    },
    { 
      label: 'Store Credit', 
      value: 'store-credit', 
      description: 'Instant store credit for future purchases' 
    },
    { 
      label: 'Bank Transfer', 
      value: 'bank-transfer', 
      description: 'Direct bank transfer (2-3 business days)' 
    }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.returnForm = this.createForm();
    this.addProduct(); // Add initial product form
  }

  private createForm(): FormGroup {
    return this.fb.group({
      orderNumber: ['', [Validators.required]],
      orderDate: ['', [Validators.required]],
      products: this.fb.array([]),
      returnReason: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      condition: ['', [Validators.required]],
      refundMethod: ['original', [Validators.required]],
      customerName: ['', [Validators.required]],
      customerEmail: ['', [Validators.required, Validators.email]],
      customerPhone: [''],
      agreeToTerms: [false, [Validators.requiredTrue]]
    });
  }

  // Step Navigation Methods
  nextStep(): void {
    if (this.currentStep() < 3) {
      if (this.currentStep() === 2 && !this.returnForm.valid) {
        this.markFormGroupTouched(this.returnForm);
        return;
      }
      this.currentStep.set(this.currentStep() + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= 3) {
      this.currentStep.set(step);
    }
  }

  // Product Form Array Methods
  get products(): FormArray {
    return this.returnForm.get('products') as FormArray;
  }

  addProduct(): void {
    const productGroup = this.fb.group({
      productName: ['', [Validators.required]],
      sku: [''],
      quantity: ['', [Validators.required, Validators.min(1)]],
      purchasePrice: ['', [Validators.required, Validators.min(0)]]
    });
    
    this.products.push(productGroup);
  }

  removeProduct(index: number): void {
    if (this.products.length > 1) {
      this.products.removeAt(index);
    }
  }

  // Form Submission
  onSubmit(): void {
    if (this.returnForm.valid) {
      this.isSubmitting.set(true);
      
      // Simulate API call
      setTimeout(() => {
        console.log('Return request submitted:', this.returnForm.value);
        this.isSubmitting.set(false);
        
        // Show success message and redirect
        alert('Your return request has been submitted successfully!');
        this.router.navigate(['/return-status']);
      }, 2000);
    } else {
      this.markFormGroupTouched(this.returnForm);
    }
  }

  saveAsDraft(): void {
    const formData = this.returnForm.value;
    localStorage.setItem('returnRequestDraft', JSON.stringify(formData));
    alert('Return request saved as draft!');
  }

  // Helper method to mark all form controls as touched
  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormControl) {
        control.markAsTouched();
      } else if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Calculate total refund amount
  getTotalRefundAmount(): number {
    const products = this.returnForm.get('products')?.value || [];
    return products.reduce((total: number, product: any) => {
      return total + (product.purchasePrice * product.quantity);
    }, 0);
  }

  // Helper methods for template display
  getConditionLabel(): string {
    const conditionValue = this.returnForm.get('condition')?.value;
    const condition = this.conditionOptions.find(c => c.value === conditionValue);
    return condition?.label || 'Not specified';
  }

  getRefundMethodLabel(): string {
    const methodValue = this.returnForm.get('refundMethod')?.value;
    const method = this.refundMethods.find(m => m.value === methodValue);
    return method?.label || 'Original Payment Method';
  }

  getReturnReasonDisplay(): string {
    const reason = this.returnForm.get('returnReason')?.value;
    if (!reason) return 'Not specified';
    
    const reasonMap: {[key: string]: string} = {
      'defective': 'Defective or Damaged',
      'wrong-item': 'Wrong Item Received',
      'not-as-described': 'Not as Described',
      'size-issue': 'Size Doesn\'t Fit',
      'changed-mind': 'Changed My Mind',
      'better-price': 'Found Better Price',
      'other': 'Other Reason'
    };
    
    return reasonMap[reason] || reason;
  }

  // FAQ methods
  faqOpen = signal<{ [key: number]: boolean }>({
    1: false,
    2: false,
    3: false
  });

  toggleFAQ(index: number): void {
    this.faqOpen.update(state => ({
      ...state,
      [index]: !state[index]
    }));
  }

  isFaqOpen(index: number): boolean {
    return this.faqOpen()[index] || false;
  }

  // Navigation methods
  startReturnProcess(): void {
    this.currentStep.set(2);
  }

  checkReturnStatus(): void {
    this.router.navigate(['/return-status']);
  }

  contactSupport(): void {
    window.location.href = 'mailto:support@estore.com';
  }

  liveChat(): void {
    console.log('Starting live chat...');
  }
}
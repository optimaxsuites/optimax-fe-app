import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { RefundRequestService } from '../../../service/refund-request.service';

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

interface RefundRequest {
  id: number;
  transactionId: string;
  reasonForRefund: string;
  cashierComment: string;
  cashierId: string;
  refundMeans: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  createdDate: string;
  updatedDate?: string;
  status?: string;
  refundAmount?: number;
  processedBy?: string;
}

@Component({
  selector: 'app-returns-refunds',
  templateUrl: './returns-refunds.component.html',
  styleUrls: ['./returns-refunds.component.scss']
})
export class ReturnsRefundsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private refundService = inject(RefundRequestService);

  returnForm: FormGroup;
  isSubmitting = signal(false);
  currentStep = signal(1);
  activeSection = signal<'new-request' | 'my-refunds' | 'completed'>('new-request');
  
  // Filtering and search
  statusFilter = signal('all');
  searchTerm = signal('');
  
  // Mock data - replace with actual API calls
  allRefunds = signal<RefundRequest[]>([
    {
      id: 1,
      transactionId: 'ORD-001',
      reasonForRefund: 'Defective product',
      cashierComment: 'Waiting for product inspection',
      cashierId: 'user123',
      refundMeans: 'original',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '+1234567890',
      createdDate: '2024-01-15T10:30:00Z',
      status: 'pending'
    },
    {
      id: 2,
      transactionId: 'ORD-002',
      reasonForRefund: 'Wrong size',
      cashierComment: 'Refund approved',
      cashierId: 'user123',
      refundMeans: 'store-credit',
      customerName: 'Jane Smith',
      customerEmail: 'jane@example.com',
      customerPhone: '+1234567891',
      createdDate: '2024-01-10T14:20:00Z',
      status: 'approved'
    },
    {
      id: 3,
      transactionId: 'ORD-003',
      reasonForRefund: 'Changed mind',
      cashierComment: 'Refund processed successfully',
      cashierId: 'user123',
      refundMeans: 'bank-transfer',
      customerName: 'Bob Johnson',
      customerEmail: 'bob@example.com',
      customerPhone: '+1234567892',
      createdDate: '2024-01-05T09:15:00Z',
      status: 'completed',
      refundAmount: 150.00,
      processedBy: 'Cashier001'
    }
  ]);

  // Computed properties
  refundRequests = computed(() => 
    this.allRefunds().filter(refund => refund.status !== 'completed')
  );

  completedRefunds = computed(() => 
    this.allRefunds().filter(refund => refund.status === 'completed')
  );

  filteredRefunds = computed(() => {
    let refunds = this.refundRequests();
    
    if (this.statusFilter() !== 'all') {
      refunds = refunds.filter(refund => refund.status === this.statusFilter());
    }
    
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      refunds = refunds.filter(refund => 
        refund.transactionId.toLowerCase().includes(term) ||
        refund.customerName.toLowerCase().includes(term) ||
        refund.reasonForRefund.toLowerCase().includes(term)
      );
    }
    
    return refunds;
  });

  pendingCount = computed(() => 
    this.refundRequests().filter(refund => refund.status === 'pending').length
  );

  approvedCount = computed(() => 
    this.refundRequests().filter(refund => refund.status === 'approved').length
  );

  totalRequests = computed(() => this.allRefunds().length);

  // Step navigation computed properties
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

  constructor() {
    this.returnForm = this.createForm();
    this.addProduct();
  }

  ngOnInit() {
    this.loadRefundRequests();
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
  async submitReturnRequest(): Promise<void> {
    if (this.returnForm.valid) {
      this.isSubmitting.set(true);
      
      try {
        const formData = this.prepareRefundData();
        const response = await this.refundService.createRefundRequest(formData).toPromise();
        
        console.log('Return request submitted successfully:', response);
        
        // Add to local state
        this.allRefunds.update(refunds => [formData, ...refunds]);
        
        // Show success message
        alert('Your return request has been submitted successfully!');
        
        // Switch to my refunds section
        this.activeSection.set('my-refunds');
        this.currentStep.set(1);
        this.returnForm.reset();
        this.addProduct(); // Reset to initial product form
        
      } catch (error) {
        console.error('Error submitting return request:', error);
        alert('There was an error submitting your return request. Please try again.');
      } finally {
        this.isSubmitting.set(false);
      }
    } else {
      this.markFormGroupTouched(this.returnForm);
    }
  }

  private prepareRefundData(): any {
    const formValue = this.returnForm.value;
    
    return {
      id: 0, // Will be set by backend
      transactionId: formValue.orderNumber,
      reasonForRefund: formValue.returnReason,
      cashierComment: formValue.description, // Using description as cashier comment
      cashierId: 'user123', // This would be the actual user ID in a real app
      refundMeans: formValue.refundMethod,
      customerName: formValue.customerName,
      customerEmail: formValue.customerEmail,
      customerPhone: formValue.customerPhone,
      createdDate: new Date().toISOString(),
      status: 'pending',
      refundAmount: this.getTotalRefundAmount()
    };
  }

  saveAsDraft(): void {
    const formData = this.returnForm.value;
    localStorage.setItem('returnRequestDraft', JSON.stringify(formData));
    alert('Return request saved as draft!');
  }

  // Refund Management Methods
 loadRefundRequests(): void {
  this.refundService.getRefundRequests().subscribe({
    next: (refunds) => {
      this.allRefunds.set(refunds);
    },
    error: (error) => {
      console.error('Error loading refund requests:', error);
      this.allRefunds.set([]);
    }
  });
}

  async deleteRefundRequest(id: number): Promise<void> {
    if (confirm('Are you sure you want to delete this refund request?')) {
      try {
        await this.refundService.deleteRefundRequest(id).toPromise();
        
        // Remove from local state
        this.allRefunds.update(refunds => refunds.filter(refund => refund.id !== id));
        
        alert('Refund request deleted successfully!');
      } catch (error) {
        console.error('Error deleting refund request:', error);
        alert('There was an error deleting the refund request. Please try again.');
      }
    }
  }

  filterRefunds(): void {
    // The computed property will automatically update
    console.log('Filtering refunds...');
  }

  refreshRefunds(): void {
    this.loadRefundRequests();
    alert('Refund requests refreshed!');
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
}
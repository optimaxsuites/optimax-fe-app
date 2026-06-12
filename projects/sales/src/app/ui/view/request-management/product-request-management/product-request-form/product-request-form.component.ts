import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { ProcurementRequestService } from '../../../../service/procurement-request-management/product-request-management/procurement-request.service';
import { RequestDraftService } from '../../../../service/procurement-request-management/product-request-management/request-draft.service';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { ApprovalService } from '../../../../service/approval-inbox/approval.service'

@Component({
  selector: 'app-product-request-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './product-request-form.component.html',
  styleUrls: ['./product-request-form.component.scss']
})
export class ProductRequestFormComponent implements OnInit, OnDestroy {

  readonly backToListLink = '/admin/sales/commerce/requests/home/' + uuidV4();

  requestForm: FormGroup;
  isSubmitting = false;
  productImages: File[] = [];
  productImagePreviews: string[] = [];
  vendorDocuments: File[] = [];
  currencies = ['NGN', 'EUR', 'GBP', 'USD', 'KES', 'ZAR'];
  
  // Mock customer data - replace with actual customer service
  customerBudget = 50000; // Available budget from Accounting module
  customerId = 'CUST-001'; // From auth service
  private destroy$ = new Subject<void>();
  
  constructor(
    private fb: FormBuilder,
    private procurementRequestService: ProcurementRequestService,
    private router: Router,
    private draftService: RequestDraftService,
    private approvalService: ApprovalService

  ) {
    this.requestForm = this.fb.group({
      productName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
      quantity: [1, [Validators.required, Validators.min(1), Validators.max(999999)]],
      budget: ['', [Validators.required, Validators.min(0.01)], [this.budgetValidator.bind(this)]],
      currency: ['NGN', Validators.required],
      deliveryLocation: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      deliveryDeadline: ['', [Validators.required, this.futureDateValidator]],
      specialInstructions: ['', [Validators.maxLength(1000)]],
      projectName: [''],
      departmentName: ['']
    });
  }

  ngOnInit(): void {
    // Pre-fill customer name if available
    // Load customer budget from service
    this.loadCustomerBudget();
      this.setupAutoSave();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCustomerBudget(): void {
    // Call your customer service to get available budget
    // this.customerService.getAvailableBudget(this.customerId).subscribe(budget => {
    //   this.customerBudget = budget;
    // });
  }


  get today(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
 }

  // Custom validator: budget cannot exceed customer's available budget
  budgetValidator(control: AbstractControl): Promise<ValidationErrors | null> {
    return new Promise((resolve) => {
      const budget = control.value;
      if (budget && budget > this.customerBudget) {
        resolve({ budgetExceeded: { max: this.customerBudget, actual: budget } });
      } else {
        resolve(null);
      }
    });
  }

  // Custom validator: delivery deadline must be future date
  futureDateValidator(control: AbstractControl): ValidationErrors | null {
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate <= today) {
      return { pastDate: true };
    }
    return null;
  }

  onProductImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) { this.addProductImages(Array.from(input.files)); }
  }

  onProductImageDropped(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files) { this.addProductImages(Array.from(files)); }
  }

  private addProductImages(files: File[]): void {
    const maxSize = 10 * 1024 * 1024;
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image. Use the Documents section for non-image files.`);
        continue;
      }
      if (file.size > maxSize) { alert(`${file.name} exceeds 10MB limit`); continue; }
      this.productImages.push(file);
      const reader = new FileReader();
      reader.onload = (e) => { this.productImagePreviews.push(e.target?.result as string); };
      reader.readAsDataURL(file);
    }
  }

  removeProductImage(index: number): void {
    this.productImages.splice(index, 1);
    this.productImagePreviews.splice(index, 1);
  }

  onVendorDocSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) { this.addVendorDocs(Array.from(input.files)); }
  }

  onVendorDocDropped(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files) { this.addVendorDocs(Array.from(files)); }
  }

  private addVendorDocs(files: File[]): void {
    const maxSize = 10 * 1024 * 1024;
    for (const file of files) {
      if (file.size > maxSize) { alert(`${file.name} exceeds 10MB limit`); continue; }
      this.vendorDocuments.push(file);
    }
  }

  removeVendorDoc(index: number): void {
    this.vendorDocuments.splice(index, 1);
  }
  

  getBudgetWarning(): string {
    const budgetControl = this.requestForm.get('budget');
    if (budgetControl?.hasError('budgetExceeded')) {
      const error = budgetControl.errors?.['budgetExceeded'];
      return `Budget (${error.actual}) exceeds your available budget of ${error.max}. Please reduce the budget or contact finance.`;
    }
    return '';
  }

  getDeadlineWarning(): string {
    const deadlineControl = this.requestForm.get('deliveryDeadline');
    if (deadlineControl?.hasError('pastDate')) {
      return 'Delivery deadline must be a future date';
    }
    return '';
  }

  onSubmit(): void {
  if (this.requestForm.invalid) {
    // Mark all fields as touched to show validation errors
    Object.keys(this.requestForm.controls).forEach(key => {
      const control = this.requestForm.get(key);
      control?.markAsTouched();
    });
    return;
  }

  this.isSubmitting = true;
  
  const formValue = this.requestForm.value;

  // Map file selections to mock attachment list with object previews or placeholder links
  const base64Attachments: any[] = [];
  
  this.productImages.forEach((img, idx) => {
    // Check if base64 preview is ready
    const fileUrl = this.productImagePreviews[idx] || URL.createObjectURL(img);
    base64Attachments.push({
      id: `ATT-IMG-${Math.floor(Math.random() * 10000)}`,
      fileName: img.name,
      fileUrl: fileUrl,
      uploadedAt: new Date()
    });
  });

  this.vendorDocuments.forEach((doc, idx) => {
    base64Attachments.push({
      id: `ATT-DOC-${Math.floor(Math.random() * 10000)}`,
      fileName: doc.name,
      fileUrl: URL.createObjectURL(doc),
      uploadedAt: new Date()
    });
  });

  const requestData = {
    customerId: this.customerId,
    customerName: 'Mama Nkechi Enterprises',
    productName: formValue.productName,
    description: formValue.description,
    quantity: formValue.quantity,
    budget: formValue.budget,
    currency: formValue.currency,
    deliveryLocation: formValue.deliveryLocation,
    deliveryDeadline: formValue.deliveryDeadline,
    specialInstructions: formValue.specialInstructions,
    projectName: formValue.projectName || '',
    departmentName: formValue.departmentName || '',
    status: 'PENDING_APPROVAL',  // ← CHANGED: Was 'PENDING', now goes to approval first
    attachments: base64Attachments
  };

  // FIRST: Create the procurement request
  this.procurementRequestService.createRequest(requestData).subscribe({
    next: (response) => {
      // SECOND: Create approval request for this procurement request
      this.createApprovalRequest(response.id, requestData);
    },
    error: (error) => {
      console.error('Error creating request:', error);
      this.isSubmitting = false;
      alert('Failed to create request. Please try again.');
    }
  });
}

// NEW METHOD: Create approval request after procurement request is created
private createApprovalRequest(requestId: string, requestData: any): void {
  const urgency = this.calculateUrgency(requestData.deliveryDeadline);
  const budget = requestData.budget;
  
  const approvalData = {
    requestId: requestId,
    requestType: 'PROCUREMENT',
    requestTitle: requestData.productName,
    requesterId: this.customerId,
    requesterName: 'Mama Nkechi Enterprises',
    requesterDepartment: this.getUserDepartment(), // Get from user profile/service
    budget: budget,
    currency: requestData.currency,
    items: [{
      id: '1',
      productName: requestData.productName,
      quantity: requestData.quantity,
      budget: budget
    }],
    urgency: urgency,
    approvals: this.getApprovalLevels(budget)
  };
  
  this.approvalService.createApprovalRequest(approvalData).subscribe({
    next: (approvalResponse) => {
      this.isSubmitting = false;
      alert('Request submitted for approval! You will be notified once approved.');
      this.router.navigate(['/commerce/requests']);
    },
    error: (error) => {
      console.error('Error creating approval request:', error);
      this.isSubmitting = false;
      alert('Request created but approval setup failed. Please contact support.');
      this.router.navigate(['/commerce/requests']);
    }
  });
}

// HELPER METHODS
private calculateUrgency(deadline: Date): string {
  if (!deadline) return 'MEDIUM';
  const daysUntilDeadline = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilDeadline <= 3) return 'URGENT';
  if (daysUntilDeadline <= 7) return 'HIGH';
  if (daysUntilDeadline <= 14) return 'MEDIUM';
  return 'LOW';
}

private getApprovalLevels(budget: number): any[] {
  return [
    { level: 1, approverRole: 'Manager', required: true }
  ];
}

private getUserDepartment(): string {
  // Get from user service / auth
  // For now, return default or fetch from localStorage
  return 'Procurement';
}

  private setupAutoSave(): void {
  this.requestForm.valueChanges
    .pipe(
      debounceTime(3000), // Save after 3 seconds of no changes
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    )
    .subscribe(formValues => {
      if (this.hasFormData(formValues)) {
        this.autoSaveDraft(formValues);
      }
    });
}

private hasFormData(formValues: any): boolean {
  return !!(formValues.productName || formValues.description || 
            formValues.quantity > 1 || formValues.budget > 0);
}

private autoSaveDraft(formValues: any): void {
  this.draftService.autoSaveDraft(formValues, this.customerId, 'Mama Nkechi Enterprises')
    .subscribe({
      next: (draft) => {
        console.log('Draft auto-saved:', draft.id);
        // Show subtle notification
        this.showAutoSaveNotification();
      },
      error: (error) => {
        console.error('Auto-save failed:', error);
      }
    });
}

private showAutoSaveNotification(): void {
  // Implement a toast/notification
  console.log('Draft saved');
}

  private uploadFiles(requestId: string): void {
    // Implement file upload logic
    // After upload complete, navigate to list so the new row is visible immediately.
    this.router.navigate(['/commerce/requests']);
  }

 saveAsDraft(): void {
  const formValues = this.requestForm.value;
  this.draftService.autoSaveDraft(formValues, this.customerId, 'John Doe Enterprises')
    .subscribe({
      next: (draft) => {
        alert('Draft saved successfully! You can continue later from your drafts page.');
        this.router.navigate(['/commerce/requests/drafts']);
      },
      error: (error) => {
        console.error('Error saving draft:', error);
        alert('Failed to save draft. Please try again.');
      }
    });
}
  // Helper methods for template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.requestForm.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.requestForm.get(fieldName);
    if (!field) return '';
    
    if (field.hasError('required')) {
      return 'This field is required';
    }
    if (field.hasError('minlength')) {
      const error = field.errors?.['minlength'];
      return `Minimum ${error.requiredLength} characters required`;
    }
    if (field.hasError('maxlength')) {
      const error = field.errors?.['maxlength'];
      return `Maximum ${error.requiredLength} characters allowed`;
    }
    if (field.hasError('min')) {
      return 'Value must be greater than 0';
    }
    if (field.hasError('pastDate')) {
      return 'Date must be in the future';
    }
    return '';
  }

  // Add these methods to your component

formatCurrency(amount: number, currency: string): string {
  if (!amount) return `${currency} 0.00`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
}

formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

getUnitPrice(): number {
  const budget = this.requestForm.get('budget')?.value || 0;
  const quantity = this.requestForm.get('quantity')?.value || 1;
  return budget / quantity;
}

isUrgentDeadline(): boolean {
  const deadline = this.requestForm.get('deliveryDeadline')?.value;
  if (!deadline) return false;
  const today = new Date();
  const deadlineDate = new Date(deadline);
  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 5 && diffDays >= 0;
}

getDeadlineMessage(): string {
  const deadline = this.requestForm.get('deliveryDeadline')?.value;
  if (!deadline) return '';
  const today = new Date();
  const deadlineDate = new Date(deadline);
  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Deadline has passed';
  if (diffDays === 0) return 'Urgent - Due today';
  if (diffDays === 1) return 'Urgent - Due tomorrow';
  if (diffDays <= 5) return `Urgent - ${diffDays} days remaining`;
  return `${diffDays} days remaining`;
}

onCurrencyChange(): void {
  // Re-validate budget when currency changes
  this.requestForm.get('budget')?.updateValueAndValidity();
}
}
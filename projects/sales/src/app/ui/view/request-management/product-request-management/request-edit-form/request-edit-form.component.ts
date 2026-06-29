// src/app/ui/view/procurement-request-management/request-edit-form/request-edit-form.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ProcurementRequestService } from '../../../../service/procurement-request-management/product-request-management/procurement-request.service';
import { ProcurementRequest, RequestStatus } from '../../../../domain/procurement-request/product-requests/product-requests.dto';

@Component({
  selector: 'app-request-edit-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './request-edit-form.component.html',
  styleUrls: ['./request-edit-form.component.scss']
})
export class RequestEditFormComponent implements OnInit, OnDestroy {
  
  requestForm: FormGroup;
  isSubmitting = false;
  isLoading = true;
  originalRequest: ProcurementRequest | null = null;
  requestId: string = '';
  
  selectedFiles: File[] = [];
  filePreviewUrls: string[] = [];
  removedAttachments: string[] = [];
  
  currencies = ['NGN', 'EUR', 'GBP', 'USD', 'KES', 'ZAR'];
  
  // Mock customer data - replace with actual customer service
  customerBudget = 50000;
  customerId = 'CUST-001';
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private procurementRequestService: ProcurementRequestService
  ) {
    this.requestForm = this.fb.group({
      productName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
      quantity: [1, [Validators.required, Validators.min(1), Validators.max(999999)]],
      budget: ['', [Validators.required, Validators.min(0.01)], [this.budgetValidator.bind(this)]],
      currency: ['NGN', Validators.required],
      deliveryLocation: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      deliveryDeadline: ['', [Validators.required, this.futureDateValidator]],
      // specialInstructions removed: not in ProcurementRequest
    });
  }

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('id') || '';
    if (this.requestId) {
      this.loadRequest();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRequest(): void {
    this.isLoading = true;
    this.procurementRequestService.getRequestById(this.requestId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (request) => {
          if (request) {
            this.originalRequest = request;
            this.populateForm(request);
            this.loadCustomerBudget();
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading request:', error);
          this.isLoading = false;
          alert('Failed to load request. Please try again.');
          this.router.navigate(['/commerce/requests']);
        }
      });
  }

  private populateForm(request: ProcurementRequest): void {
    this.requestForm.patchValue({
      productName: request.productName,
      description: request.description,
      quantity: request.quantity,
      budget: request.budget,
      currency: request.currency,
      deliveryLocation: request.deliveryLocation,
      deliveryDeadline: this.formatDateForInput(request.deliveryDeadline)
    });
  }

  private loadCustomerBudget(): void {
    // Call your customer service to get available budget
    // this.customerService.getAvailableBudget(this.customerId).subscribe(budget => {
    //   this.customerBudget = budget;
    // });
  }

  private formatDateForInput(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      for (const file of files) {
        if (file.size > maxSize) {
          alert(`File ${file.name} exceeds 10MB limit`);
          return;
        }
        this.selectedFiles.push(file);
        
        // Create preview URL for images
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            this.filePreviewUrls.push(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          this.filePreviewUrls.push('assets/file-icon.png');
        }
      }
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.filePreviewUrls.splice(index, 1);
  }

  removeExistingAttachment(attachmentId: string): void {
    this.removedAttachments.push(attachmentId);
    if (this.originalRequest) {
      this.originalRequest.attachments = this.originalRequest.attachments.filter(a => a.id !== attachmentId);
    }
  }

  getBudgetWarning(): string {
    const budgetControl = this.requestForm.get('budget');
    if (budgetControl?.hasError('budgetExceeded')) {
      const error = budgetControl.errors?.['budgetExceeded'];
      return `Budget (${this.formatCurrency(error.actual, this.requestForm.get('currency')?.value)}) exceeds your available budget of ${this.formatCurrency(error.max, this.requestForm.get('currency')?.value)}. Please reduce the budget or contact finance.`;
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

  hasChanges(): boolean {
    if (!this.originalRequest) return false;
    
    const currentValues = this.requestForm.value;
    return (
      currentValues.productName !== this.originalRequest.productName ||
      currentValues.description !== this.originalRequest.description ||
      currentValues.quantity !== this.originalRequest.quantity ||
      currentValues.budget !== this.originalRequest.budget ||
      currentValues.currency !== this.originalRequest.currency ||
      currentValues.deliveryLocation !== this.originalRequest.deliveryLocation ||
      this.formatDateForInput(this.originalRequest.deliveryDeadline) !== currentValues.deliveryDeadline ||
      this.selectedFiles.length > 0 ||
      this.removedAttachments.length > 0
    );
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files) {
      const fileList = event.dataTransfer.files;
      const fileArray = Array.from(fileList);
      const maxSize = 10 * 1024 * 1024; // 10MB
      for (const file of fileArray) {
        if (file.size > maxSize) {
          alert(`File ${file.name} exceeds 10MB limit`);
          continue;
        }
        this.selectedFiles.push(file);
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            this.filePreviewUrls.push(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          this.filePreviewUrls.push('assets/file-icon.png');
        }
      }
    }
  }

  onSubmit(): void {
    if (this.requestForm.invalid) {
      Object.keys(this.requestForm.controls).forEach(key => {
        const control = this.requestForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    if (!this.hasChanges()) {
      alert('No changes detected. Please make changes before submitting.');
      return;
    }

    this.isSubmitting = true;
    
    const formValue = this.requestForm.value;
    const updateData = {
      id: this.requestId,
      productName: formValue.productName,
      description: formValue.description,
      quantity: formValue.quantity,
      budget: formValue.budget,
      currency: formValue.currency,
      deliveryLocation: formValue.deliveryLocation,
      deliveryDeadline: new Date(formValue.deliveryDeadline),
      specialInstructions: formValue.specialInstructions,
      removedAttachments: this.removedAttachments
    };

    this.procurementRequestService.updateRequest(this.requestId, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Upload new files if any
          if (this.selectedFiles.length > 0) {
            this.uploadNewFiles(response.id);
          } else {
            this.isSubmitting = false;
            alert('Request updated successfully!');
            this.router.navigate(['/commerce/requests', this.requestId]);
          }
        },
        error: (error) => {
          console.error('Error updating request:', error);
          this.isSubmitting = false;
          alert('Failed to update request. Please try again.');
        }
      });
  }

  private uploadNewFiles(requestId: string): void {
    // Add new mock attachments representing newly uploaded files and images
    const newAttachments: any[] = [];
    this.selectedFiles.forEach((file, idx) => {
      newAttachments.push({
        id: `ATT-IMG-${Math.floor(Math.random() * 10000)}`,
        fileName: file.name,
        fileUrl: this.filePreviewUrls[idx],
        uploadedAt: new Date()
      });
    });

    this.procurementRequestService.getRequestById(requestId).subscribe({
      next: (req) => {
        if (req) {
          req.attachments = [...(req.attachments || []), ...newAttachments];
          this.procurementRequestService.saveRequests();
        }
        this.isSubmitting = false;
        alert('Request updated successfully with new attachments!');
        this.router.navigate(['/commerce/requests', requestId]);
      },
      error: () => {
        this.isSubmitting = false;
        this.router.navigate(['/commerce/requests', requestId]);
      }
    });
  }

  cancelEdit(): void {
    if (this.hasChanges()) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        this.router.navigate(['/commerce/requests', this.requestId]);
      }
    } else {
      this.router.navigate(['/commerce/requests', this.requestId]);
    }
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

  get today(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
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
    this.requestForm.get('budget')?.updateValueAndValidity();
  }

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
}
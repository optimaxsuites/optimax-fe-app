import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProcurementRequestService } from '../../../service/procurement-request-management/procurement-request.service';

@Component({
  selector: 'app-procurement-request-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './procurement-request-form.component.html',
  styleUrls: ['./procurement-request-form.component.scss']
})
export class ProcurementRequestFormComponent implements OnInit {
  
  requestForm: FormGroup;
  isSubmitting = false;
  selectedFiles: File[] = [];
  filePreviewUrls: string[] = [];
  currencies = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR'];
  
  // Mock customer data - replace with actual customer service
  customerBudget = 50000; // Available budget from Accounting module
  customerId = 'CUST-001'; // From auth service
  
  constructor(
    private fb: FormBuilder,
    private procurementRequestService: ProcurementRequestService,
    private router: Router
  ) {
    this.requestForm = this.fb.group({
      productName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
      quantity: [1, [Validators.required, Validators.min(1), Validators.max(999999)]],
      budget: ['', [Validators.required, Validators.min(0.01)], [this.budgetValidator.bind(this)]],
      currency: ['USD', Validators.required],
      deliveryLocation: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      deliveryDeadline: ['', [Validators.required, this.futureDateValidator]],
      specialInstructions: ['', [Validators.maxLength(1000)]]
    });
  }

  ngOnInit(): void {
    // Pre-fill customer name if available
    // Load customer budget from service
    this.loadCustomerBudget();
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


  onFileDropped(event: DragEvent): void {
  event.preventDefault();
  const files = event.dataTransfer?.files;
  if (files) {
    // Process dropped files same as onFileSelected
    Array.from(files).forEach(file => {
      if (file.size <= 10 * 1024 * 1024) {
        this.selectedFiles.push(file);
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            this.filePreviewUrls.push(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    });
  }
}

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.filePreviewUrls.splice(index, 1);
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
    const requestData = {
      customerId: this.customerId,
      customerName: 'John Doe Enterprises', // Get from auth/customer service
      productName: formValue.productName,
      description: formValue.description,
      quantity: formValue.quantity,
      budget: formValue.budget,
      currency: formValue.currency,
      deliveryLocation: formValue.deliveryLocation,
      deliveryDeadline: formValue.deliveryDeadline,
      specialInstructions: formValue.specialInstructions,
      status: 'PENDING',
      attachments: []
    };

    // Submit to service
    this.procurementRequestService.createRequest(requestData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        // Upload files if any
        if (this.selectedFiles.length > 0) {
          this.uploadFiles(response.id);
        } else {
          this.router.navigate(['/commerce/requests', response.id]);
        }
      },
      error: (error) => {
        console.error('Error creating request:', error);
        this.isSubmitting = false;
        alert('Failed to create request. Please try again.');
      }
    });
  }

  private uploadFiles(requestId: string): void {
    // Implement file upload logic
    // After upload complete, navigate to detail page
    this.router.navigate(['/commerce/requests', requestId]);
  }

  saveAsDraft(): void {
    // Similar to submit but with status = 'DRAFT'
    console.log('Save as draft', this.requestForm.value);
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
}
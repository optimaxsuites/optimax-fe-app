
import { Component, EventEmitter, Output, Input, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProcurementRequestService } from '../../../service/procurement/procurement.service';

@Component({
  selector: 'app-request-for-quotation-service-form',
  templateUrl: './request-for-quotation-service-form.component.html',
  styleUrl: './request-for-quotation-service-form.component.scss'
})
export class RequestForQuotationServiceFormComponent  implements OnChanges {
  @Input() initialData: any = {};
  @Output() formData = new EventEmitter<any>();
  @Output() back = new EventEmitter<void>();

  serviceForm: FormGroup;
  currencies = ['NGN', 'USD', 'EUR', 'GBP'];
  serviceCategories = [
    'Consulting',
    'IT Services',
    'Marketing',
    'Legal',
    'Accounting',
    'Design',
    'Training',
    'Maintenance',
    'Cleaning',
    'Security',
    'Logistics',
    'Other'
  ];
  experienceLevels = ['Entry', 'Intermediate', 'Expert', 'Senior'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private procurementRequestService: ProcurementRequestService
  ) {
    this.serviceForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      serviceCategory: ['', Validators.required],
      deliveryLocation: ['', Validators.required],
      deliveryDeadline: ['', Validators.required],
      currency: ['NGN', Validators.required],
      items: this.fb.array([]),
      specialInstructions: ['']
    });

    this.addItem();
  }

  ngOnChanges(): void {
    if (this.initialData) {
      this.serviceForm.patchValue(this.initialData);
    }
  }

  get items(): FormArray {
    return this.serviceForm.get('items') as FormArray;
  }

  createItemForm(): FormGroup {
    return this.fb.group({
      id: [this.generateId()],
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      serviceCategory: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      estimatedBudget: [0, [Validators.required, Validators.min(0)]],
      experienceLevel: ['', Validators.required],
      serviceDuration: ['', Validators.required],
      serviceStartDate: ['', Validators.required],
      serviceEndDate: ['', Validators.required],
      requiredQualifications: this.fb.array([]),
      attachments: this.fb.array([])
    });
  }

  addItem(): void {
    this.items.push(this.createItemForm());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  addQualification(itemIndex: number): void {
    const qualifications = this.items.at(itemIndex).get('requiredQualifications') as FormArray;
    qualifications.push(this.fb.control('', Validators.required));
  }

  removeQualification(itemIndex: number, qualIndex: number): void {
    const qualifications = this.items.at(itemIndex).get('requiredQualifications') as FormArray;
    qualifications.removeAt(qualIndex);
  }

  onFileUpload(event: Event, itemIndex: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const attachments = this.items.at(itemIndex).get('attachments') as FormArray;
      Array.from(input.files).forEach(file => {
        const attachment = this.fb.group({
          id: [this.generateId()],
          fileName: [file.name],
          fileUrl: [URL.createObjectURL(file)],
          size: [file.size],
          type: [file.type],
          uploadedAt: [new Date()],
          file: [file]
        });
        attachments.push(attachment);
      });
    }
    input.value = '';
  }

  removeAttachment(itemIndex: number, attachmentIndex: number): void {
    const attachments = this.items.at(itemIndex).get('attachments') as FormArray;
    attachments.removeAt(attachmentIndex);
  }

  getTotalBudget(): number {
    return this.items.controls.reduce((total, item) => {
      const budget = item.get('estimatedBudget')?.value || 0;
      return total + budget;
    }, 0);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  onNext(): void {
    if (this.serviceForm.valid) {
      const formValue = this.serviceForm.value;
      formValue.totalBudget = this.getTotalBudget();
      formValue.procurementType = 'SERVICE';
      
      this.procurementRequestService.createRequest(formValue).subscribe({
        next: (req) => {
          this.router.navigate(['/commerce/requests/new/service', req.id, 'template']);
        },
        error: (err) => {
          console.error('Failed to create request', err);
        }
      });
    } else {
      this.markFormGroupTouched(this.serviceForm);
      console.warn('Form validation failed. Errors:', this.getFormValidationErrors());
    }
  }

  getFormValidationErrors(): any {
    const errors: any = {};
    Object.keys(this.serviceForm.controls).forEach(key => {
      const control = this.serviceForm.get(key);
      if (control?.invalid) {
        if (control instanceof FormArray) {
          errors[key] = control.controls.map((c, idx) => {
            const itemErrors: any = {};
            if (c instanceof FormGroup) {
              Object.keys(c.controls).forEach(itemKey => {
                const itemControl = c.get(itemKey);
                if (itemControl?.invalid) {
                  itemErrors[itemKey] = itemControl.errors;
                }
              });
            }
            return itemErrors;
          });
        } else {
          errors[key] = control.errors;
        }
      }
    });
    return errors;
  }

  onBack(): void {
    this.back.emit();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(c => {
          if (c instanceof FormGroup) {
            this.markFormGroupTouched(c);
          }
        });
      }
    });
  }

  getFormErrorMessage(controlName: string): string {
    const control = this.serviceForm.get(controlName);
    if (control && control.errors) {
      if (control.errors['required']) return 'This field is required';
      if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters required`;
    }
    return '';
  }

  getItemErrorMessage(itemIndex: number, fieldName: string): string {
    const item = this.items.at(itemIndex);
    const control = item.get(fieldName);
    if (control && control.errors) {
      if (control.errors['required']) return 'This field is required';
      if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters required`;
      if (control.errors['min']) return 'Value must be greater than 0';
    }
    return '';
  }

  formatCurrency(value: number): string {
    const currency = this.serviceForm.get('currency')?.value || 'NGN';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency 
    }).format(value || 0);
  }

  getFileIcon(fileType: string): string {
    if (!fileType) return 'fa-file';
    if (fileType.includes('pdf')) return 'fa-file-pdf';
    if (fileType.includes('image')) return 'fa-file-image';
    if (fileType.includes('excel') || fileType.includes('spreadsheet') || fileType.includes('csv')) return 'fa-file-excel';
    if (fileType.includes('word') || fileType.includes('document')) return 'fa-file-word';
    return 'fa-file';
  }

  formatFileSize(size: number): string {
    if (!size) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
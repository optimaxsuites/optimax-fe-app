// procurement-product-form/procurement-product-form.component.ts

import { Component, EventEmitter, Output, Input, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { RequestItem, Attachment } from '../../../domain/procurement-request/procurement.dto';
import { ProcurementRequestService } from '../../../service/procurement/procurement.service';

@Component({
  selector: 'app-request-for-quotation-form',
  templateUrl: './request-for-quotation-form.component.html',
  styleUrl: './request-for-quotation-form.component.scss'
})
export class RequestForQuotationFormComponent  implements OnChanges {
  @Input() initialData: any = {};
  @Output() formData = new EventEmitter<any>();
  @Output() back = new EventEmitter<void>();

  productForm: FormGroup;
  currencies = ['NGN', 'USD', 'EUR', 'GBP'];
  units = ['Pieces', 'Boxes', 'Kg', 'Liters', 'Meters', 'Sets', 'Packages', 'Units'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private procurementRequestService: ProcurementRequestService
  ) {
    this.productForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      deliveryLocation: ['', Validators.required],
      deliveryDeadline: ['', Validators.required],
      deliveryMode: ['STANDARD'],
      currency: ['NGN', Validators.required],
      items: this.fb.array([]),
      specialInstructions: ['']
    });

    // Add initial item
    this.addItem();
  }

  ngOnChanges(): void {
    if (this.initialData) {
      this.productForm.patchValue(this.initialData);
    }
  }

  get items(): FormArray {
    return this.productForm.get('items') as FormArray;
  }

  createItemForm(): FormGroup {
    return this.fb.group({
      id: [this.generateId()],
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit: ['Pieces', Validators.required],
      estimatedBudget: [0, [Validators.required, Validators.min(0)]],
      unitPrice: [0, [Validators.min(0)]],
      specifications: this.fb.group({
        brand: [''],
        model: [''],
        color: [''],
        size: [''],
        material: [''],
        warranty: [''],
        customFields: this.fb.array([])
      }),
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

  addCustomField(itemIndex: number): void {
    const customFields = this.items.at(itemIndex).get('specifications.customFields') as FormArray;
    customFields.push(this.fb.group({
      key: ['', Validators.required],
      value: ['', Validators.required]
    }));
  }

  removeCustomField(itemIndex: number, fieldIndex: number): void {
    const customFields = this.items.at(itemIndex).get('specifications.customFields') as FormArray;
    customFields.removeAt(fieldIndex);
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
    if (this.productForm.valid) {
      const formValue = this.productForm.value;
      formValue.totalBudget = this.getTotalBudget();
      formValue.procurementType = 'PRODUCT';
      // Convert file URLs to actual files for submission
      formValue.items = formValue.items.map((item: any) => ({
        ...item,
        attachments: item.attachments.map((att: any) => ({
          ...att,
          file: att.file || null,
          fileUrl: att.fileUrl || null
        }))
      }));
      
      this.procurementRequestService.createRequest(formValue).subscribe({
        next: (req) => {
          this.router.navigate(['/commerce/requests/new/product', req.id, 'template']);
        },
        error: (err) => {
          console.error('Failed to create request', err);
        }
      });
    } else {
      this.markFormGroupTouched(this.productForm);
    }
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
    const control = this.productForm.get(controlName);
    if (control && control.errors) {
      if (control.errors['required']) return 'This field is required';
      if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters required`;
      if (control.errors['min']) return 'Value must be greater than 0';
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
    const currency = this.productForm.get('currency')?.value || 'NGN';
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
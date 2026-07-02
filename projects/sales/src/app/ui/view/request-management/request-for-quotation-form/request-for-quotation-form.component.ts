// procurement-product-form/procurement-product-form.component.ts

import { Component, EventEmitter, Output, Input, OnChanges, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RequestItem, Attachment } from '../../../domain/procurement-request/procurement.dto';
import { ProcurementRequestService } from '../../../service/procurement/procurement.service';
import { v4 as uuidV4 } from 'uuid';

@Component({
  selector: 'app-request-for-quotation-form',
  templateUrl: './request-for-quotation-form.component.html',
  styleUrl: './request-for-quotation-form.component.scss'
})
export class RequestForQuotationFormComponent implements OnChanges, OnInit {
  @Input() initialData: any = {};
  @Output() formData = new EventEmitter<any>();
  @Output() back = new EventEmitter<void>();

  productForm: FormGroup;
  currencies = ['NGN', 'USD', 'EUR', 'GBP'];
  units = ['Pieces', 'Boxes', 'Kg', 'Liters', 'Meters', 'Sets', 'Packages', 'Units'];
  isEditMode = false;
  requestId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
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

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const uuid = params.get('uuid');
      if (uuid) {
        this.isEditMode = true;
        this.requestId = uuid;
        this.loadRequest(uuid);
      }
    });
  }

  loadRequest(uuid: string): void {
    this.procurementRequestService.getRequest(uuid).subscribe({
      next: (req) => {
        if (req) {
          // Clear any initial item pushed in constructor
          while (this.items.length) {
            this.items.removeAt(0);
          }

          // Populate items array
          if (req.items && req.items.length > 0) {
            req.items.forEach(item => {
              const itemGroup = this.createItemForm();
              
              // Clear custom fields array in specifications
              const specsGroup = itemGroup.get('specifications') as FormGroup;
              const customFields = specsGroup.get('customFields') as FormArray;
              while (customFields.length) {
                customFields.removeAt(0);
              }
              const specs = item.specifications as any;
              if (specs?.customFields) {
                specs.customFields.forEach((field: any) => {
                  customFields.push(this.fb.group({
                    label: [field.label, Validators.required],
                    value: [field.value, Validators.required]
                  }));
                });
              }

              // Clear attachments array
              const attachments = itemGroup.get('attachments') as FormArray;
              while (attachments.length) {
                attachments.removeAt(0);
              }
              if (item.attachments) {
                item.attachments.forEach((att: any) => {
                  attachments.push(this.fb.group({
                    id: [att.id],
                    fileName: [att.fileName, Validators.required],
                    fileUrl: [att.fileUrl],
                    size: [att.size],
                    type: [att.type],
                    uploadedAt: [att.uploadedAt],
                    file: [att.file]
                  }));
                });
              }

              // Patch remaining item values
              itemGroup.patchValue({
                id: item.id,
                name: item.name,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                estimatedBudget: item.estimatedBudget,
                unitPrice: item.unitPrice,
                specifications: {
                  brand: specs?.brand || '',
                  model: specs?.model || '',
                  color: specs?.color || '',
                  size: specs?.size || '',
                  material: specs?.material || '',
                  warranty: specs?.warranty || ''
                }
              });

              this.items.push(itemGroup);
            });
          }

          // Patch general form values
          this.productForm.patchValue({
            title: req.title,
            description: req.description,
            deliveryLocation: req.deliveryLocation,
            deliveryDeadline: req.deliveryDeadline ? new Date(req.deliveryDeadline).toISOString().substring(0, 10) : '',
            currency: req.currency || 'NGN',
            deliveryMode: req.deliveryMode || 'STANDARD',
            specialInstructions: req.specialInstructions || ''
          });
        } else {
          this.isEditMode = false;
        }
      },
      error: (err) => {
        console.warn('Request not found in database, treating as new request draft.', err);
        this.isEditMode = false;
      }
    });
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
    
    const requestId = this.requestId || uuidV4();
    
    if (this.isEditMode && this.requestId) {
      this.procurementRequestService.updateRequest(this.requestId, formValue).subscribe({
        next: (req) => {
          this.router.navigate(['/admin/sales/commerce/requests/new/product', req.id, 'template']);
        },
        error: (err) => {
          console.error('Failed to update request', err);
          this.router.navigate(['/admin/sales/commerce/requests/new/product', requestId, 'template']);
        }
      });
    } else {
      this.procurementRequestService.createRequest({
        ...formValue,
        id: requestId
      }).subscribe({
        next: (req) => {
          this.router.navigate(['/admin/sales/commerce/requests/new/product', req.id, 'template']);
        },
        error: (err) => {
          console.error('Failed to create request', err);
          this.router.navigate(['/admin/sales/commerce/requests/new/product', requestId, 'template']);
        }
      });
    }
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
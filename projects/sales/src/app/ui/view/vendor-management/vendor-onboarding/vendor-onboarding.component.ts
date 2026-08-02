// vendor-onboarding.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import {
  VendorService
} from '../../../service/vendor-management/vendor-management.service';
import {
  OnboardingData,
  DocumentCategory,
  FileUploadData,
  VendorAddress,
  BankDetails
} from '../../../domain/vendor-management/vendor-management.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-vendor-onboarding',
  templateUrl: './vendor-onboarding.component.html',
  styleUrls: ['./vendor-onboarding.component.scss']
})
export class VendorOnboardingComponent implements OnInit, OnDestroy {

  // ============================================================
  // VIEW CHILDREN
  // ============================================================

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // ============================================================
  // STATE
  // ============================================================

  // Stepper
  currentStep: number = 1;
  totalSteps: number = 4;
  stepTitles = [
    'Company Details',
    'Bank & Contacts',
    'Documents',
    'Review & Submit'
  ];

  // Forms
  companyForm!: FormGroup;
  bankContactForm!: FormGroup;
  documentsForm!: FormGroup;

  // Document uploads
  uploadedDocuments: FileUploadData[] = [];
  uploadProgress: { [key: string]: number } = {};
  uploading: boolean = false;

  // UI
  isLoading: boolean = false;
  isSubmitting: boolean = false;
  showSuccess: boolean = false;
  error: string | null = null;
  Math = Math;

  // Available categories
  documentCategories = [
    { value: DocumentCategory.REGISTRATION, label: 'Business Registration', required: true },
    { value: DocumentCategory.TAX, label: 'Tax Certificate', required: true },
    { value: DocumentCategory.LICENCE, label: 'Business Licence', required: true },
    { value: DocumentCategory.INSURANCE, label: 'Insurance', required: false },
    { value: DocumentCategory.CERTIFICATION, label: 'Certification', required: false }
  ];

  // Category options
  categoryOptions = [
    'Electronics',
    'Office Supplies',
    'Construction',
    'IT Services',
    'Consulting',
    'Logistics',
    'Manufacturing',
    'Retail',
    'Healthcare',
    'Education',
    'Hospitality',
    'Agriculture',
    'Automotive',
    'Energy',
    'Telecommunications'
  ];

  // Private
  private destroy$ = new Subject<void>();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private fb: FormBuilder,
    private vendorService: VendorService,
    private router: Router
  ) {
    this.buildForms();
  }

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    // Load any existing draft from localStorage
    this.loadDraft();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Save draft on exit
    this.saveDraft();
  }

  // ============================================================
  // GETTERS
  // ============================================================

  get contacts(): FormArray {
    return this.bankContactForm.get('contacts') as FormArray;
  }

  get documentsArray(): FormArray {
    return this.documentsForm.get('documents') as FormArray;
  }

  get f() {
    return this.companyForm.controls;
  }

  get bf() {
    return this.bankContactForm.controls;
  }

  // ============================================================
  // COMPUTED PROPERTIES
  // ============================================================

  // FIXED: Replaces the filter pipe
  get requiredDocumentCategories() {
    return this.documentCategories.filter(c => c.required);
  }

  // ============================================================
  // FORM BUILDING
  // ============================================================

  private buildForms(): void {
    // Step 1: Company Details
    this.companyForm = this.fb.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      registrationNumber: ['', [Validators.required, Validators.minLength(3)]],
      taxId: ['', [Validators.required, Validators.minLength(5)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]{8,20}$/)]],
      website: [''],
      description: ['', [Validators.maxLength(500)]],
      paymentTerms: [''],
      categories: [[], [Validators.required, Validators.minLength(1)]],
      address: this.fb.group({
        street: ['', [Validators.required, Validators.minLength(3)]],
        city: ['', [Validators.required, Validators.minLength(2)]],
        state: ['', [Validators.required, Validators.minLength(2)]],
        country: ['Nigeria', [Validators.required]],
        postalCode: ['', [Validators.pattern(/^[0-9]{5,10}$/)]]
      })
    });

    // Step 2: Bank & Contacts
    this.bankContactForm = this.fb.group({
      bankDetails: this.fb.group({
        bankName: ['', [Validators.required, Validators.minLength(2)]],
        accountNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
        accountName: ['', [Validators.required, Validators.minLength(2)]],
        swiftCode: ['']
      }),
      contacts: this.fb.array([
        this.createContactForm()
      ])
    });

    // Step 3: Documents
    this.documentsForm = this.fb.group({
      documents: this.fb.array([])
    });
  }

  private createContactForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]{8,20}$/)]],
      role: ['', [Validators.required]],
      isPrimary: [false]
    });
  }

  // ============================================================
  // STEP NAVIGATION
  // ============================================================

  goToStep(step: number): void {
    if (step < 1 || step > this.totalSteps) return;
    if (step > this.currentStep && !this.validateCurrentStep()) return;
    this.currentStep = step;
    this.error = null;
    this.scrollToTop();
  }

  nextStep(): void {
    if (this.validateCurrentStep()) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.error = null;
        this.scrollToTop();
      }
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.error = null;
      this.scrollToTop();
    }
  }

  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        if (this.companyForm.invalid) {
          this.companyForm.markAllAsTouched();
          this.error = 'Please fill in all required company details';
          return false;
        }
        return true;
      case 2:
        if (this.bankContactForm.invalid) {
          this.bankContactForm.markAllAsTouched();
          this.error = 'Please fill in all required bank and contact details';
          return false;
        }
        if (this.contacts.length === 0) {
          this.error = 'Please add at least one contact person';
          return false;
        }
        return true;
      case 3:
        if (this.uploadedDocuments.length === 0) {
          this.error = 'Please upload at least one document';
          return false;
        }
        // Check if all required documents are uploaded
        const requiredCategories = this.documentCategories.filter(c => c.required);
        const uploadedCategories = this.uploadedDocuments.map(d => d.category);
        const missingRequired = requiredCategories.filter(c => !uploadedCategories.includes(c.value));
        if (missingRequired.length > 0) {
          this.error = `Please upload required documents: ${missingRequired.map(c => c.label).join(', ')}`;
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  private scrollToTop(): void {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }

  // ============================================================
  // CONTACT MANAGEMENT
  // ============================================================

  addContact(): void {
    this.contacts.push(this.createContactForm());
  }

  removeContact(index: number): void {
    if (this.contacts.length > 1) {
      this.contacts.removeAt(index);
    } else {
      this.error = 'You need at least one contact person';
    }
  }

  // FIXED: Helper to cast AbstractControl to FormGroup for template
  getContactFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  // ============================================================
  // CATEGORY MANAGEMENT
  // ============================================================

  toggleCategory(category: string): void {
    const categories = this.companyForm.get('categories')?.value || [];
    const index = categories.indexOf(category);
    if (index > -1) {
      categories.splice(index, 1);
    } else {
      categories.push(category);
    }
    this.companyForm.patchValue({ categories });
    this.companyForm.get('categories')?.markAsTouched();
  }

  isCategorySelected(category: string): boolean {
    const categories = this.companyForm.get('categories')?.value || [];
    return categories.includes(category);
  }

  // ============================================================
  // DOCUMENT MANAGEMENT
  // ============================================================

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    // Show category selection for each file
    const files = Array.from(input.files);
    files.forEach(file => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.error = `File "${file.name}" exceeds 10MB limit`;
        return;
      }

      // Check file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        this.error = `File "${file.name}" has unsupported format. Please use PDF, JPEG, PNG, or DOC`;
        return;
      }

      // Auto-assign category based on filename (simple heuristic)
      let category = DocumentCategory.REGISTRATION;
      const fileName = file.name.toLowerCase();
      if (fileName.includes('tax') || fileName.includes('tin')) {
        category = DocumentCategory.TAX;
      } else if (fileName.includes('licence') || fileName.includes('license')) {
        category = DocumentCategory.LICENCE;
      } else if (fileName.includes('insurance')) {
        category = DocumentCategory.INSURANCE;
      } else if (fileName.includes('cert') || fileName.includes('iso')) {
        category = DocumentCategory.CERTIFICATION;
      }

      this.uploadedDocuments.push({
        file: file,
        fileName: file.name,
        category: category,
        issueDate: new Date(),
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      });
    });

    // Reset input
    input.value = '';
    this.error = null;
  }

  removeDocument(index: number): void {
    this.uploadedDocuments.splice(index, 1);
  }

  updateDocumentCategory(index: number, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const category = select.value as DocumentCategory;
    this.uploadedDocuments[index].category = category;
  }

  updateDocumentDates(index: number, field: 'issueDate' | 'expiryDate', event: Event): void {
    const input = event.target as HTMLInputElement;
    const date = new Date(input.value);
    if (!isNaN(date.getTime())) {
      this.uploadedDocuments[index][field] = date;
    }
  }

  getFileSize(size: number): string {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getDocumentIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'fa-file-pdf';
      case 'doc':
      case 'docx': return 'fa-file-word';
      case 'xls':
      case 'xlsx': return 'fa-file-excel';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'fa-file-image';
      default: return 'fa-file';
    }
  }

  getCategoryLabel(category: DocumentCategory): string {
    const found = this.documentCategories.find(c => c.value === category);
    return found ? found.label : category;
  }

  isRequiredDocument(category: DocumentCategory): boolean {
    const found = this.documentCategories.find(c => c.value === category);
    return found ? found.required : false;
  }

  // ============================================================
  // FORM SUBMISSION
  // ============================================================

  submitOnboarding(): void {
    if (!this.validateCurrentStep()) return;

    this.isSubmitting = true;
    this.error = null;

    const formValue = this.companyForm.value;
    const bankValue = this.bankContactForm.value;

    const onboardingData: OnboardingData = {
      companyName: formValue.companyName,
      registrationNumber: formValue.registrationNumber,
      taxId: formValue.taxId,
      email: formValue.email,
      phone: formValue.phone,
      address: formValue.address as VendorAddress,
      bankDetails: bankValue.bankDetails as BankDetails,
      categories: formValue.categories,
      contacts: bankValue.contacts.map((c: any) => ({
        name: c.name,
        email: c.email,
        phone: c.phone,
        role: c.role,
        isPrimary: c.isPrimary || false
      })),
      documents: this.uploadedDocuments,
      paymentTerms: formValue.paymentTerms,
      description: formValue.description,
      website: formValue.website
    };

    this.vendorService.onboardVendor(onboardingData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.isSubmitting = false;
          this.showSuccess = true;
          // Clear draft
          localStorage.removeItem('vendorOnboardingDraft');
          // Navigate after delay
          setTimeout(() => {
            this.router.navigate(['/commerce/manage-vendors', result.vendorId, 'profile']);
          }, 3000);
        },
        error: (err) => {
          console.error('Onboarding failed:', err);
          this.isSubmitting = false;
          this.error = err.message || 'Failed to onboard vendor. Please try again.';
        }
      });
  }

  // ============================================================
  // DRAFT SAVE/RESTORE
  // ============================================================

  saveDraft(): void {
    try {
      const draft = {
        companyForm: this.companyForm.value,
        bankContactForm: this.bankContactForm.value,
        uploadedDocuments: this.uploadedDocuments.map(d => ({
          fileName: d.fileName,
          category: d.category,
          issueDate: d.issueDate,
          expiryDate: d.expiryDate,
        })),
        currentStep: this.currentStep
      };
      localStorage.setItem('vendorOnboardingDraft', JSON.stringify(draft));
    } catch (e) {
      // Ignore draft save errors
    }
  }

  private loadDraft(): void {
    try {
      const draftStr = localStorage.getItem('vendorOnboardingDraft');
      if (!draftStr) return;

      const draft = JSON.parse(draftStr);

      // Restore form values
      if (draft.companyForm) {
        this.companyForm.patchValue(draft.companyForm);
      }

      if (draft.bankContactForm) {
        // Restore contacts
        if (draft.bankContactForm.contacts) {
          this.contacts.clear();
          draft.bankContactForm.contacts.forEach((c: any) => {
            const form = this.createContactForm();
            form.patchValue(c);
            this.contacts.push(form);
          });
        }
        // Restore bank details
        if (draft.bankContactForm.bankDetails) {
          this.bankContactForm.get('bankDetails')?.patchValue(draft.bankContactForm.bankDetails);
        }
      }

      // Restore documents (only metadata, not files)
      if (draft.uploadedDocuments && draft.uploadedDocuments.length > 0) {
        // We can only restore metadata, files need to be re-uploaded
        this.uploadedDocuments = draft.uploadedDocuments.map((d: any) => ({
          ...d,
          file: null as any, // File object can't be restored
        }));
      }

      if (draft.currentStep) {
        this.currentStep = draft.currentStep;
      }
    } catch (e) {
      // Ignore draft load errors
    }
  }

  // ============================================================
  // RESET
  // ============================================================

  resetForm(): void {
    if (!confirm('Are you sure you want to reset all fields? This will clear all entered data.')) {
      return;
    }

    this.companyForm.reset({
      address: {
        country: 'Nigeria'
      }
    });
    this.bankContactForm.reset();
    this.contacts.clear();
    this.contacts.push(this.createContactForm());
    this.uploadedDocuments = [];
    this.currentStep = 1;
    this.error = null;
    localStorage.removeItem('vendorOnboardingDraft');
  }

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  isStepComplete(step: number): boolean {
    switch (step) {
      case 1:
        return this.companyForm.valid;
      case 2:
        return this.bankContactForm.valid && this.contacts.length > 0;
      case 3:
        return this.uploadedDocuments.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  }

  getStepStatus(step: number): 'complete' | 'current' | 'incomplete' {
    if (step < this.currentStep) {
      return this.isStepComplete(step) ? 'complete' : 'incomplete';
    }
    if (step === this.currentStep) {
      return 'current';
    }
    return 'incomplete';
  }

  getStepIcon(step: number): string {
    const status = this.getStepStatus(step);
    if (status === 'complete') return 'fa-check-circle';
    if (status === 'current') return 'fa-circle';
    return 'fa-circle-o';
  }

  formatDate(date: Date): string {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.nextStep();
    }
    if (event.key === 'Escape') {
      this.prevStep();
    }
  }
}
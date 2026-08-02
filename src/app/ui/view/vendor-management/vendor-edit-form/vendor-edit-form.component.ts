// vendor-edit-form.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import {
  VendorService
} from '../../../service/vendor-management/vendor-management.service';
import {
  Vendor,
  VendorStatus,
  VendorTier,
  RiskLevel,
  VendorAddress,
  BankDetails,
  VendorContact
} from '../../../domain/vendor-management/vendor-management.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-vendor-edit',
  templateUrl: './vendor-edit-form.component.html',
  styleUrls: ['./vendor-edit-form.component.scss']
})
export class VendorEditComponent implements OnInit, OnDestroy {

  // ============================================================
  // VIEW CHILDREN
  // ============================================================

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // ============================================================
  // STATE
  // ============================================================

  vendorId: string = '';
  vendor: Vendor | null = null;
  isLoading: boolean = true;
  isSaving: boolean = false;
  error: string | null = null;
  showSuccess: boolean = false;

  // Forms
  editForm!: FormGroup;

  // UI
  Math = Math;
  isDirty: boolean = false;
  showDiscardDialog: boolean = false;
  activeSection: 'company' | 'contacts' | 'bank' | 'documents' = 'company';
  showStatusDropdown: boolean = false;

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

  // Document categories for upload
  documentCategories = [
    { value: 'REGISTRATION', label: 'Business Registration', required: true },
    { value: 'TAX', label: 'Tax Certificate', required: true },
    { value: 'LICENCE', label: 'Business Licence', required: true },
    { value: 'INSURANCE', label: 'Insurance', required: false },
    { value: 'CERTIFICATION', label: 'Certification', required: false }
  ];

  // Enums for template
  VendorStatus = VendorStatus;
  VendorTier = VendorTier;
  RiskLevel = RiskLevel;

  // Private
  private destroy$ = new Subject<void>();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private vendorService: VendorService,
    private fb: FormBuilder
  ) {
    this.buildForm();
  }

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.vendorId = params['id'];
      if (this.vendorId) {
        this.loadVendor();
      }
    });

    // Listen for form changes
    this.editForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.isDirty = true;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // FORM BUILDING
  // ============================================================

  private buildForm(): void {
    this.editForm = this.fb.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      registrationNumber: ['', [Validators.required, Validators.minLength(3)]],
      taxId: ['', [Validators.required, Validators.minLength(5)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]{8,20}$/)]],
      website: [''],
      description: ['', [Validators.maxLength(500)]],
      paymentTerms: [''],
      tier: ['', Validators.required],
      status: ['', Validators.required],
      categories: [[], [Validators.required, Validators.minLength(1)]],
      address: this.fb.group({
        street: ['', [Validators.required, Validators.minLength(3)]],
        city: ['', [Validators.required, Validators.minLength(2)]],
        state: ['', [Validators.required, Validators.minLength(2)]],
        country: ['Nigeria', [Validators.required]],
        postalCode: ['', [Validators.pattern(/^[0-9]{5,10}$/)]]
      }),
      bankDetails: this.fb.group({
        bankName: ['', [Validators.required, Validators.minLength(2)]],
        accountNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
        accountName: ['', [Validators.required, Validators.minLength(2)]],
        swiftCode: ['']
      }),
      contacts: this.fb.array([])
    });
  }

  private createContactForm(contact?: VendorContact): FormGroup {
    return this.fb.group({
      id: [contact?.id || ''],
      name: [contact?.name || '', [Validators.required, Validators.minLength(2)]],
      email: [contact?.email || '', [Validators.required, Validators.email]],
      phone: [contact?.phone || '', [Validators.required, Validators.pattern(/^[0-9+\-\s()]{8,20}$/)]],
      role: [contact?.role || '', [Validators.required]],
      isPrimary: [contact?.isPrimary || false]
    });
  }

  // ============================================================
  // GETTERS - FIXED
  // ============================================================

  get contacts(): FormArray {
    const control = this.editForm.get('contacts');
    if (!control) {
      return this.fb.array([]) as FormArray;
    }
    return control as FormArray;
  }

  get f() {
    return this.editForm.controls;
  }

  // ============================================================
  // HELPER - Cast AbstractControl to FormGroup for template
  // ============================================================

  getContactFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadVendor(): void {
    this.isLoading = true;
    this.error = null;

    this.vendorService.getVendorById(this.vendorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vendor) => {
          this.vendor = vendor;
          this.populateForm(vendor);
          this.isLoading = false;
          this.isDirty = false;
        },
        error: (err) => {
          console.error('Failed to load vendor:', err);
          this.error = 'Failed to load vendor details. Please try again.';
          this.isLoading = false;
        }
      });
  }

  private populateForm(vendor: Vendor): void {
    // Company details
    this.editForm.patchValue({
      companyName: vendor.companyName,
      registrationNumber: vendor.registrationNumber,
      taxId: vendor.taxId,
      email: vendor.email,
      phone: vendor.phone,
      website: vendor.website || '',
      description: vendor.description || '',
      paymentTerms: vendor.paymentTerms || '',
      tier: vendor.tier,
      status: vendor.status,
      categories: vendor.categories || []
    });

    // Address
    this.editForm.get('address')?.patchValue({
      street: vendor.address.street,
      city: vendor.address.city,
      state: vendor.address.state,
      country: vendor.address.country,
      postalCode: vendor.address.postalCode || ''
    });

    // Bank details
    if (vendor.bankDetails) {
      this.editForm.get('bankDetails')?.patchValue({
        bankName: vendor.bankDetails.bankName || '',
        accountNumber: vendor.bankDetails.accountNumber || '',
        accountName: vendor.bankDetails.accountName || '',
        swiftCode: vendor.bankDetails.swiftCode || ''
      });
    }

    // Contacts
    this.contacts.clear();
    if (vendor.contacts && vendor.contacts.length > 0) {
      vendor.contacts.forEach(contact => {
        this.contacts.push(this.createContactForm(contact));
      });
    } else {
      // Add default empty contact
      this.contacts.push(this.createContactForm());
    }
  }

  // ============================================================
  // CONTACT MANAGEMENT
  // ============================================================

  addContact(): void {
    this.contacts.push(this.createContactForm());
    this.isDirty = true;
  }

  removeContact(index: number): void {
    if (this.contacts.length > 1) {
      this.contacts.removeAt(index);
      this.isDirty = true;
    } else {
      this.error = 'You need at least one contact person';
    }
  }

  // ============================================================
  // CATEGORY MANAGEMENT
  // ============================================================

  toggleCategory(category: string): void {
    const categories = this.editForm.get('categories')?.value || [];
    const index = categories.indexOf(category);
    if (index > -1) {
      categories.splice(index, 1);
    } else {
      categories.push(category);
    }
    this.editForm.patchValue({ categories });
    this.editForm.get('categories')?.markAsTouched();
    this.isDirty = true;
  }

  isCategorySelected(category: string): boolean {
    const categories = this.editForm.get('categories')?.value || [];
    return categories.includes(category);
  }

  // ============================================================
  // STATUS MANAGEMENT
  // ============================================================

  changeStatus(status: VendorStatus): void {
    this.editForm.patchValue({ status });
    this.showStatusDropdown = false;
    this.isDirty = true;
  }

  getStatusLabel(status: VendorStatus): string {
    const map: Record<VendorStatus, string> = {
      [VendorStatus.ACTIVE]: 'Active',
      [VendorStatus.INACTIVE]: 'Inactive',
      [VendorStatus.PENDING_ONBOARDING]: 'Pending Onboarding',
      [VendorStatus.UNDER_REVIEW]: 'Under Review',
      [VendorStatus.SUSPENDED]: 'Suspended',
      [VendorStatus.OFFBOARDED]: 'Offboarded',
      [VendorStatus.CONDITIONAL]: 'Conditional'
    };
    return map[status] || status;
  }

  getVendorStatusColor(status: VendorStatus): string {
    const map: Record<VendorStatus, string> = {
      [VendorStatus.ACTIVE]: '#2EB270',
      [VendorStatus.INACTIVE]: '#6B7280',
      [VendorStatus.PENDING_ONBOARDING]: '#F59E0B',
      [VendorStatus.UNDER_REVIEW]: '#F97316',
      [VendorStatus.SUSPENDED]: '#DC2626',
      [VendorStatus.OFFBOARDED]: '#6B7280',
      [VendorStatus.CONDITIONAL]: '#8B5CF6'
    };
    return map[status] || '#6B7280';
  }

  getTierLabel(tier: VendorTier): string {
    const map: Record<VendorTier, string> = {
      [VendorTier.PREFERRED]: '⭐ Preferred',
      [VendorTier.APPROVED]: '✓ Approved',
      [VendorTier.CONDITIONAL]: '⚠️ Conditional'
    };
    return map[tier] || tier;
  }

  // ============================================================
  // SAVE
  // ============================================================

  saveVendor(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.error = 'Please fix all validation errors before saving';
      const firstError = document.querySelector('.form-group .error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    this.isSaving = true;
    this.error = null;

    const formValue = this.editForm.value;

    const updateData: any = {
      companyName: formValue.companyName,
      registrationNumber: formValue.registrationNumber,
      taxId: formValue.taxId,
      email: formValue.email,
      phone: formValue.phone,
      website: formValue.website,
      description: formValue.description,
      paymentTerms: formValue.paymentTerms,
      tier: formValue.tier,
      status: formValue.status,
      categories: formValue.categories,
      address: formValue.address as VendorAddress,
      bankDetails: formValue.bankDetails as BankDetails,
      contacts: formValue.contacts.map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        role: c.role,
        isPrimary: c.isPrimary || false
      }))
    };

    this.vendorService.updateVendor(this.vendorId, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.vendor = updated;
          this.isSaving = false;
          this.isDirty = false;
          this.showSuccess = true;
          setTimeout(() => {
            this.showSuccess = false;
          }, 3000);
          console.log('Vendor updated successfully');
        },
        error: (err) => {
          console.error('Failed to update vendor:', err);
          this.isSaving = false;
          this.error = err.message || 'Failed to update vendor. Please try again.';
        }
      });
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  goBack(): void {
    this.navigateBack();
  }

  navigateBack(): void {
    if (this.isDirty) {
      this.showDiscardDialog = true;
    } else {
      this.goToProfile();
    }
  }

  private goToProfile(): void {
    if (this.vendorId) {
      this.router.navigate(['/admin/sales/commerce/manage-vendors', this.vendorId, 'profile']);
    } else {
      this.location.back();
    }
  }

  cancelDiscard(): void {
    this.showDiscardDialog = false;
  }

  confirmDiscard(): void {
    this.showDiscardDialog = false;
    this.goToProfile();
  }

  // ============================================================
  // SECTION NAVIGATION
  // ============================================================

  scrollToSection(section: typeof this.activeSection): void {
    this.activeSection = section;
    const element = document.getElementById(`section-${section}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  formatDate(date: Date): string {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.editForm.get(fieldName);
    return !!control?.invalid && !!control?.touched;
  }

  getFieldError(fieldName: string): string {
    const control = this.editForm.get(fieldName);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    if (errors['required']) return 'This field is required';
    if (errors['email']) return 'Please enter a valid email address';
    if (errors['minlength']) return `Minimum ${errors['minlength'].requiredLength} characters required`;
    if (errors['pattern']) return 'Invalid format';
    if (errors['maxlength']) return `Maximum ${errors['maxlength'].requiredLength} characters allowed`;

    return 'Invalid input';
  }

  getSectionStatus(section: typeof this.activeSection): 'complete' | 'incomplete' | 'current' {
    const isComplete = this.isSectionComplete(section);
    return isComplete ? 'complete' : 'incomplete';
  }

  private isSectionComplete(section: typeof this.activeSection): boolean {
    switch (section) {
      case 'company':
        return !!(
          this.editForm.get('companyName')?.valid &&
          this.editForm.get('registrationNumber')?.valid &&
          this.editForm.get('taxId')?.valid &&
          this.editForm.get('email')?.valid &&
          this.editForm.get('phone')?.valid &&
          this.editForm.get('categories')?.valid &&
          this.editForm.get('address')?.valid
        );
      case 'contacts':
        return this.contacts.length > 0 && this.contacts.valid;
      case 'bank':
        return !!this.editForm.get('bankDetails')?.valid;
      default:
        return true;
    }
  }

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================

  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.saveVendor();
    }
    if (event.key === 'Escape') {
      this.navigateBack();
    }
  }
}
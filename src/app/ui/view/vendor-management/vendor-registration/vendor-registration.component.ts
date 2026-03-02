import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VendorRegistrationService } from '../../../service/vendor/vendor-registration.service';
import { VendorCategoryService } from '../../../service/vendor/vendor-category.service';
import { VendorComplianceService } from '../../../service/vendor/vendor-compliance.service';
import { VendorCategoryDto } from '../../../domain/vendor.category.dto';
// import { VendorDto, VendorStatus } from '../../../domain/vendor.dto';
// import { VendorRegistrationRequestDto } from '../../../domain/vendor.dto';

type VendorStatus =
  | 'Invited'
  | 'RegistrationInProgress'
  | 'Submitted'
  | 'UnderReview'
  | 'Approved'
  | 'Rejected'
  | 'Suspended';

type AiStatus = 'NotStarted' | 'Running' | 'Passed' | 'NeedsHumanReview' | 'Failed';


type UploadItem = {
  documentType: string;
  file?: File;
  issuedDate?: string;
  expiryDate?: string;
  required?: boolean;
  hint?: string;
};

@Component({
  templateUrl: './vendor-registration.component.html',
})
export class VendorRegistrationComponent implements OnInit {
onChange($event: any) {
throw new Error('Method not implemented.');
}
  // loading = false;
  // submitting = false;
  // submitted = false;

  // token = '';
  // tenantName = 'Vendor Registration';

  // categories: any[] = [];

  // // Steps
  // step = 1; // 1..5

  businessTypes = [
    { label: 'Limited Company', value: 'Limited' },
    { label: 'Sole Proprietor', value: 'SoleProprietor' },
    { label: 'Partnership', value: 'Partnership' },
    { label: 'NGO / Non-Profit', value: 'NGO' },
    { label: 'Other', value: 'Other' },
  ];

  currencies = ['NGN', 'USD', 'GBP', 'EUR'];

  // model: any = {
  //   registrationToken: '',
  //   legalName: '',
  //   tradingName: '',
  //   businessType: 'Limited',

  //   email: '',
  //   phone: '',

  //   address: '',
  //   country: 'Nigeria',
  //   state: '',
  //   status: VendorStatus.Inactive,
  //   website: '',
  //   yearEstablished: undefined,
  //   employeeCount: undefined,

  //   categoryIds: [],
  //   capabilityStatement: '',

  //   primaryContact: {
  //     name: '',
  //     email: '',
  //     phone: '',
  //     role: '',
  //   },

  //   bankName: '',
  //   accountName: '',
  //   accountNumber: '',
  //   currency: 'NGN',

  //   acceptsTerms: false,
  // };

  // // Required documents template
  uploads: any[] = [
    {
      documentType: 'CAC / Company Registration',
      required: true,
      hint: 'Upload your company registration proof (CAC certificate or equivalent).',
    },
    {
      documentType: 'TIN / Tax Identification',
      required: true,
      hint: 'Upload your Tax Identification Number certificate or evidence.',
    },
    {
      documentType: 'VAT Certificate (Optional)',
      required: false,
      hint: 'Upload if applicable to your business.',
    },
    {
      documentType: 'Bank Letter / Account Proof (Optional)',
      required: false,
      hint: 'Proof of bank account details for payments.',
    },
    {
      documentType: 'Other Supporting Document (Optional)',
      required: false,
      hint: 'Any document that strengthens your profile (licenses, permits, etc.).',
    },
  ];
  // // vendorForm: any;

  // constructor(
  //   private route: ActivatedRoute,
  //   private compliance: VendorComplianceService,
  // ) { }

  // ngOnInit(): void {
  //   this.token = this.route.snapshot.paramMap.get('token') ?? '';

  //   if (!this.token) {
  //     console.error('No registration token provided.');
  //     return;
  //   }

  //   this.loadVendorFromLocalStorage(this.token);
  // }

  // private loadVendorFromLocalStorage(token: string): void {
  //   const data = localStorage.getItem('vendors');
  //   if (!data) {
  //     console.warn('No vendors found in local storage.');
  //     return;
  //   }

  //   const vendors = JSON.parse(data);

  //   const vendor = vendors.find((v: any) => v.registrationToken === token);

  //   if (!vendor) {
  //     console.error('Invalid or expired registration token.');
  //     return;
  //   }

  //   // Save to model if needed
  //   this.model = vendor;

  //   // Patch form fields
  //   this.model.patchValue({
  //     legalName: vendor.legalName,
  //     email: vendor.email,
  //     contactName: vendor.primaryContact?.name,
  //     contactEmail: vendor.primaryContact?.email,
  //     contactPhone: vendor.primaryContact?.phone,
  //     contactRole: vendor.primaryContact?.role,
  //   });

  //   // If still invited, move to in-progress
  //   if (vendor.status === 'Invited') {
  //     vendor.status = 'RegistrationInProgress';
  //     vendor.registrationStartedAt = new Date();

  //     this.updateVendorInLocalStorage(vendor);
  //   }
  // }

  // private updateVendorInLocalStorage(updatedVendor: any): void {
  //   const vendors = JSON.parse(localStorage.getItem('vendors') || '[]');

  //   const index = vendors.findIndex(
  //     (v: any) => v.id === updatedVendor.id
  //   );

  //   if (index !== -1) {
  //     vendors[index] = updatedVendor;
  //     localStorage.setItem('vendors', JSON.stringify(vendors));
  //   }
  // }



  // private getStoredVendors(): any[] {
  //   try {
  //     return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
  //   } catch {
  //     return [];
  //   }
  // }

  // private upsertVendor(updatedVendor: any): void {
  //   const vendors = this.getStoredVendors();
  //   const index = vendors.findIndex(v => v.id === updatedVendor.id);

  //   if (index >= 0) vendors[index] = updatedVendor;
  //   else vendors.push(updatedVendor);

  //   localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vendors));
  // }










  // goTo(step: number) {
  //   if (step < 1 || step > 6) return;
  //   this.step = step;
  //   window.scrollTo({ top: 0, behavior: 'smooth' });
  // }

  // next() {
  //   if (!this.canProceed()) return;
  //   this.goTo(this.step + 1);
  // }

  // back() {
  //   this.goTo(this.step - 1);
  // }

  // // Basic step validation (lightweight UX)
  // canProceed(): boolean {
  //   if (this.step === 1) {
  //     return (
  //       !!this.model.legalName?.trim() &&
  //       !!this.model.businessType &&
  //       !!this.model.address?.trim() &&
  //       !!this.model.country?.trim() &&
  //       !!this.model.state?.trim()
  //     );
  //   }
  //   if (this.step === 2) {
  //     return (
  //       !!this.model.primaryContact.name?.trim() &&
  //       !!this.model.primaryContact.email?.trim() &&
  //       !!this.model.primaryContact.phone?.trim() &&
  //       !!this.model.primaryContact.role?.trim()
  //     );
  //   }
  //   if (this.step === 3) {
  //     return (
  //       (this.model.categoryIds?.length ?? 0) > 0 &&
  //       !!this.model.capabilityStatement?.trim()
  //     );
  //   }
  //   if (this.step === 4) {
  //     return !!this.model.bankName
  //       && !!this.model.currency
  //       && !!this.model.accountName
  //       && !!this.model.accountNumber;
  //   }
  //   if (this.step === 5) {
  //     // required docs must exist
  //     return this.uploads.filter((x) => x.required).every((x) => !!x.file);
  //   }
  //   if (this.step === 6) {
  //     // return this.model.acceptsTerms === true;
  //   }
  //   return true;
  // }

  onPickFile(item: UploadItem, event: any) {
    const f: File | undefined = event?.files?.[0];
    item.file = f;
  }

  removeFile(item: UploadItem) {
    item.file = undefined;
  }


  //   // ---------------------------
  // // Submit -> Pending Approval flow
  // // ---------------------------
  // submit() {
  //   // Validate required fields/docs here if needed
  //   this.model.submissionVersion = (this.model.submissionVersion || 0) + 1;

  //   this.model.status = 'UnderReview';
  //   this.model.submittedAt = new Date().toISOString();

  //   // AI kicks off
  //   this.model.aiStatus = 'Running';
  //   this.model.aiConfidenceScore = 0;

  //   this.model.updatedAt = new Date().toISOString();
  //   this.model.updatedBy = 'Vendor';

  //   this.upsertVendor(this.model);

  //   this.submitted = true;
  // }
























  tenantName = 'Vendor Onboarding';
  step = 1;
  submitted = false;

  token = '';

  // Your template binds to `model.*`, so keep it
  model: any = this.createEmptyVendorModel();

  // Your upload config already exists in your component
  // uploads: any[] = []; // keep your current upload list setup
categories: any[] = [
  { id: 1, name: 'Office Supplies' },
  { id: 2, name: 'IT Equipment & Hardware' },
  { id: 3, name: 'Software & Licensing' },
  { id: 4, name: 'Consulting Services' },
  { id: 5, name: 'Construction & Civil Works' },
  { id: 6, name: 'Facility Management' },
  { id: 7, name: 'Security Services' },
  { id: 8, name: 'Logistics & Transportation' },
  { id: 9, name: 'Medical Supplies' },
  { id: 10, name: 'Marketing & Advertising' },
  { id: 11, name: 'Catering Services' },
  { id: 12, name: 'Training & Capacity Building' },
  { id: 13, name: 'Electrical & Engineering Services' },
  { id: 14, name: 'Printing & Branding' },
  { id: 15, name: 'Telecommunications' },
];
  // businessTypes = [
  //   { label: 'Other', value: 'Other' },
  //   { label: 'Limited Company', value: 'Limited' },
  //   { label: 'Sole Proprietor', value: 'Sole' },
  // ];

  private readonly STORAGE_KEY = 'vendors';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';

    if (!this.token) {
      console.error('No registration token provided.');
      // Optional: navigate away
      // this.router.navigate(['/invalid-token']);
      return;
    }

    this.loadVendorByToken(this.token);
  }

  // ---------------------------
  // LocalStorage: Load + Merge
  // ---------------------------
  private loadVendorByToken(token: string): void {
    const vendors = this.getStoredVendors();

    const vendor = vendors.find(v => v.registrationToken === token);

    if (!vendor) {
      console.error('Invalid/expired registration token:', token);
      // Optional:
      // this.router.navigate(['/invalid-token']);
      return;
    }

    // Merge vendor with defaults so missing fields are created
    const merged = this.mergeWithDefaults(vendor);

    // If vendor is invited, move to in-progress as soon as they open onboarding
    if (merged.status === 'Invited') {
      merged.status = 'RegistrationInProgress';
      merged.registrationStartedAt = merged.registrationStartedAt ?? new Date().toISOString();
      merged.updatedAt = new Date().toISOString();
      merged.updatedBy = 'Vendor';
    }

    this.model = merged;

    // Persist the merge + status update (important)
    this.upsertVendor(merged);

    // Optional: if you want to restore step
    this.step = merged.currentOnboardingStep || 1;
  }

  private mergeWithDefaults(vendor: any): any {
    const defaults = this.createEmptyVendorModel();

    // deep merge for nested objects you rely on in template
    return {
      ...defaults,
      ...vendor,
      primaryContact: {
        ...defaults.primaryContact,
        ...(vendor.primaryContact || {}),
      },
      documents: Array.isArray(vendor.documents) ? vendor.documents : [],
      categoryIds: Array.isArray(vendor.categoryIds) ? vendor.categoryIds : [],
      aiFindings: Array.isArray(vendor.aiFindings) ? vendor.aiFindings : [],
    };
  }

  private createEmptyVendorModel(): any {
    return {
      id: '',
      vendorCode: '',
      registrationToken: '',

      legalName: '',
      tradingName: '',
      businessType: 'Other',
      email: '',
      phone: '',
      website: '',
      yearEstablished: undefined,
      employeeCount: undefined,

      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',

      categoryIds: [],
      capabilityStatement: '',

      primaryContact: {
        name: '',
        email: '',
        phone: '',
        role: '',
      },

      bankName: '',
      accountName: '',
      accountNumber: '',
      currency: '',

      documents: [],
      submissionVersion: 0,

      // lifecycle
      status: 'Invited' as VendorStatus,

      // AI
      aiStatus: 'NotStarted' as AiStatus,
      aiConfidenceScore: 0,
      aiFindings: [],

      // tracking
      currentOnboardingStep: 1,
      invitedAt: null,
      registrationStartedAt: null,
      submittedAt: null,

      // approval
      approvedAt: null,
      approvedBy: null,

      // rejection
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,

      // audit
      createdAt: null,
      createdBy: null,
      updatedAt: null,
      updatedBy: null,

      isActive: true,
      isArchived: false,
      acceptsTerms: false,
    };
  }

  private getStoredVendors(): any[] {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private upsertVendor(updatedVendor: any): void {
    const vendors = this.getStoredVendors();
    const index = vendors.findIndex(v => v.id === updatedVendor.id);

    if (index >= 0) vendors[index] = updatedVendor;
    else vendors.push(updatedVendor);

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vendors));
  }

  // ---------------------------
  // Step controls (persist step)
  // ---------------------------
  goTo(step: number) {
    this.step = step;
    this.model.currentOnboardingStep = step;
    this.model.updatedAt = new Date().toISOString();
    this.model.updatedBy = 'Vendor';
    this.upsertVendor(this.model);
  }

  next() {
    if (!this.canProceed()) return;
    this.goTo(Math.min(6, this.step + 1));
  }

  back() {
    this.goTo(Math.max(1, this.step - 1));
  }

  canProceed(): boolean {
    // Keep your existing rules; here’s a sensible minimal version:
    if (this.step === 1) {
      return !!this.model.legalName && !!this.model.businessType && !!this.model.address && !!this.model.country && !!this.model.state;
    }
    if (this.step === 2) {
      return !!this.model.primaryContact?.name && !!this.model.primaryContact?.email && !!this.model.primaryContact?.phone;
    }
    if (this.step === 3) {
      return (this.model.categoryIds?.length ?? 0) > 0 && !!this.model.capabilityStatement;
    }
    if (this.step === 4) {
      // You can validate required docs here based on your `uploads` config
      return true;
    }
    return true;
  }

  // ---------------------------
  // Files -> store in model.documents
  // ---------------------------
  // onPickFile(u: any, event: any) {
  //   const file = event?.files?.[0];
  //   if (!file) return;

  //   u.file = file;

  //   // Save a document record to model.documents (local simulation)
  //   const doc = {
  //     id: 'DOC-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
  //     documentType: u.documentType,
  //     required: !!u.required,
  //     fileName: file.name,
  //     issuedDate: u.issuedDate || null,
  //     expiryDate: u.expiryDate || null,
  //     uploadedAt: new Date().toISOString(),
  //   };

  //   // Replace existing doc of same type
  //   this.model.documents = (this.model.documents || []).filter((d: any) => d.documentType !== u.documentType);
  //   this.model.documents.push(doc);

  //   this.model.updatedAt = new Date().toISOString();
  //   this.model.updatedBy = 'Vendor';
  //   this.upsertVendor(this.model);
  // }

  // removeFile(u: any) {
  //   u.file = null;

  //   this.model.documents = (this.model.documents || []).filter((d: any) => d.documentType !== u.documentType);
  //   this.model.updatedAt = new Date().toISOString();
  //   this.model.updatedBy = 'Vendor';
  //   this.upsertVendor(this.model);
  // }

  // ---------------------------
  // Submit -> Pending Approval flow
  // ---------------------------
  submit() {
    // Validate required fields/docs here if needed
    this.model.submissionVersion = (this.model.submissionVersion || 0) + 1;

    this.model.status = 'UnderReview';
    this.model.submittedAt = new Date().toISOString();

    // AI kicks off
    this.model.aiStatus = 'Running';
    this.model.aiConfidenceScore = 0;

    this.model.updatedAt = new Date().toISOString();
    this.model.updatedBy = 'Vendor';

    this.upsertVendor(this.model);

    this.submitted = true;
  }

}

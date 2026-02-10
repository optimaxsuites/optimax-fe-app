import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { VendorRegistrationService } from '../../../service/vendor/vendor-registration.service';
import { VendorCategoryService } from '../../../service/vendor/vendor-category.service';
import { VendorComplianceService } from '../../../service/vendor/vendor-compliance.service';
import { VendorCategoryDto } from '../../../domain/vendor.category.dto';
import { VendorRegistrationRequestDto } from '../../../domain/vendor.dto';

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
  loading = false;
  submitting = false;
  submitted = false;

  token = '';
  tenantName = 'Vendor Registration';

  categories: VendorCategoryDto[] = [];

  // Steps
  step = 1; // 1..5

  businessTypes = [
    { label: 'Limited Company', value: 'Limited' },
    { label: 'Sole Proprietor', value: 'SoleProprietor' },
    { label: 'Partnership', value: 'Partnership' },
    { label: 'NGO / Non-Profit', value: 'NGO' },
    { label: 'Other', value: 'Other' },
  ];

  currencies = ['NGN', 'USD', 'GBP', 'EUR'];

  model: VendorRegistrationRequestDto = {
    registrationToken: '',
    legalName: '',
    tradingName: '',
    businessType: 'Limited',

    email: '',
    phone: '',

    address: '',
    country: 'Nigeria',
    state: '',

    website: '',
    yearEstablished: undefined,
    employeeCount: undefined,

    categoryIds: [],
    capabilityStatement: '',

    primaryContact: {
      name: '',
      email: '',
      phone: '',
      role: 'Sales',
    },

    bankName: '',
    accountName: '',
    accountNumber: '',
    currency: 'NGN',

    acceptsTerms: false,
  };

  // Required documents template
  uploads: UploadItem[] = [
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

  constructor(
    private route: ActivatedRoute,
    private reg: VendorRegistrationService,
    private categoriesService: VendorCategoryService,
    private compliance: VendorComplianceService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.model.registrationToken = this.token;

    this.categoriesService.getAll().subscribe((c) => (this.categories = c));

    // branding / tenant context
    this.reg.getRegistrationContext(this.token).subscribe({
      next: (ctx) => (this.tenantName = ctx.tenantName),
      error: () => {},
    });
  }

  goTo(step: number) {
    if (step < 1 || step > 5) return;
    this.step = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  next() {
    if (!this.canProceed()) return;
    this.goTo(this.step + 1);
  }

  back() {
    this.goTo(this.step - 1);
  }

  // Basic step validation (lightweight UX)
  canProceed(): boolean {
    if (this.step === 1) {
      return (
        !!this.model.legalName?.trim() &&
        !!this.model.businessType &&
        !!this.model.address?.trim() &&
        !!this.model.country?.trim() &&
        !!this.model.state?.trim()
      );
    }
    if (this.step === 2) {
      return (
        !!this.model.primaryContact.name?.trim() &&
        !!this.model.primaryContact.email?.trim() &&
        !!this.model.primaryContact.phone?.trim()
      );
    }
    if (this.step === 3) {
      return (
        (this.model.categoryIds?.length ?? 0) > 0 &&
        !!this.model.capabilityStatement?.trim()
      );
    }
    if (this.step === 4) {
      // required docs must exist
      return this.uploads.filter((x) => x.required).every((x) => !!x.file);
    }
    if (this.step === 5) {
      return this.model.acceptsTerms === true;
    }
    return true;
  }

  onPickFile(item: UploadItem, event: any) {
    const f: File | undefined = event?.files?.[0];
    item.file = f;
  }

  removeFile(item: UploadItem) {
    item.file = undefined;
  }

  async submit() {
    if (!this.canProceed()) return;

    this.submitting = true;

    this.reg.registerVendor(this.model).subscribe({
      next: (res) => {
        // Upload documents after registration so they are tied to vendorId
        const vendorId = res.vendorId;

        const docs = this.uploads.filter((u) => !!u.file);

        if (docs.length === 0) {
          this.submitted = true;
          this.submitting = false;
          return;
        }

        let completed = 0;
        docs.forEach((d) => {
          this.compliance
            .uploadDocument({
              vendorId,
              documentType: d.documentType,
              issuedDate: d.issuedDate,
              expiryDate: d.expiryDate,
              file: d.file!,
            })
            .subscribe({
              next: () => {
                completed++;
                if (completed === docs.length) {
                  this.submitted = true;
                  this.submitting = false;
                }
              },
              error: () => {
                // even if one fails, stop and show error later if you want
                this.submitting = false;
              },
            });
        });
      },
      error: () => (this.submitting = false),
    });
  }
}

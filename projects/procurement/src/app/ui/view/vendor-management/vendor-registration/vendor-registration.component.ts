import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  CompanyProfileDto,
  DocumentType,
  VendorAIStatus,
  VendorBankDetailsDto,
  VendorCategoryDto,
  VendorContactDto,
  VendorDto,
  VendorStatus,
} from '../../../domain/vendor.dto';

type UploadItem = {
  type: DocumentType;
  label: string;
  required: boolean;
  hint?: string;
  file?: File;
};

@Component({
  templateUrl: './vendor-registration.component.html',
})
export class VendorRegistrationComponent implements OnInit {
  tenantName = 'Vendor Onboarding';
  step = 1;
  submitted = false;
  token = '';

  private readonly STORAGE_KEY = 'vendors';

  businessTypes = [
    { label: 'Limited Company', value: 'Limited' },
    { label: 'Sole Proprietor', value: 'SoleProprietor' },
    { label: 'Partnership', value: 'Partnership' },
    { label: 'NGO / Non-Profit', value: 'NGO' },
    { label: 'Other', value: 'Other' },
  ];

  currencies = [
    { label: 'NGN', value: 'NGN' },
    { label: 'USD', value: 'USD' },
    { label: 'GBP', value: 'GBP' },
    { label: 'EUR', value: 'EUR' },
  ];

  categories: VendorCategoryDto[] = [
    { id: 1, name: 'Office Supplies', des: 'Office consumables and supplies' },
    { id: 2, name: 'IT Equipment & Hardware', des: 'Computers, hardware and accessories' },
    { id: 3, name: 'Software & Licensing', des: 'Software products and subscriptions' },
    { id: 4, name: 'Consulting Services', des: 'Professional and advisory services' },
    { id: 5, name: 'Construction & Civil Works', des: 'Construction projects and civil works' },
    { id: 6, name: 'Facility Management', des: 'Facility support and maintenance' },
    { id: 7, name: 'Security Services', des: 'Physical and corporate security services' },
    { id: 8, name: 'Logistics & Transportation', des: 'Transportation and delivery services' },
    { id: 9, name: 'Medical Supplies', des: 'Medical and health-related products' },
    { id: 10, name: 'Marketing & Advertising', des: 'Branding and promotional services' },
    { id: 11, name: 'Catering Services', des: 'Food and event catering services' },
    { id: 12, name: 'Training & Capacity Building', des: 'Training and learning services' },
    { id: 13, name: 'Electrical & Engineering Services', des: 'Technical and engineering services' },
    { id: 14, name: 'Printing & Branding', des: 'Printing and design services' },
    { id: 15, name: 'Telecommunications', des: 'Telecom and communication services' },
  ];

  uploads: UploadItem[] = [];

  model: VendorDto = this.createEmptyVendorModel();

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';

    if (!this.token) {
      console.error('No registration token provided.');
      return;
    }

    this.loadVendorByToken(this.token);
    this.markRegistrationInProgress(this.token);
    this.initializeUploads();
  }

  private createEmptyVendorModel(): VendorDto {
    const now = new Date().toISOString();

    return {
      id: 0,
      token: '',
      companyProfile: this.createEmptyCompanyProfile(),
      contacts: [this.createEmptyContact()],
      category: [],
      capabilityStatement: '',
      bankDetails: [this.createEmptyBankDetail()],
      status: VendorStatus.Invited,
      aiStatus: VendorAIStatus.Pending,
      submittedOn: '',
      approvedBy: '',
      approvedAt: '',
      rejectedBy: '',
      rejectedAt: '',
      rejectionReason: '',
      lastUpdatedAt: now,
      documentsRequired: [DocumentType.CAC, DocumentType.TIN],
      documentsSubmitted: [],
      documents: [],
      invitedOn: now,
      acceptsTerms: false,
    };
  }

  private createEmptyCompanyProfile(): CompanyProfileDto {
    const now = new Date().toISOString();

    return {
      id: 0,
      legalName: '',
      tradingName: '',
      businessType: '',
      companyEmail: '',
      companyPhone: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      website: '',
      yearEstablished: undefined,
      employeeCount: undefined,
      createdAt: now,
      createdBy: 'Vendor',
    };
  }

  private createEmptyContact(): VendorContactDto {
    return {
      id: Date.now(),
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      role: '',
    };
  }

  private createEmptyBankDetail(): VendorBankDetailsDto {
    return {
      id: Date.now(),
      bankName: '',
      accountName: '',
      accountNumber: '',
      currency: '',
    };
  }

  private getStoredVendors(): VendorDto[] {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  private saveStoredVendors(vendors: VendorDto[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vendors));
  }

  private upsertVendor(updatedVendor: VendorDto): void {
    const vendors = this.getStoredVendors();
    const index = vendors.findIndex((v) => v.id === updatedVendor.id);

    if (index >= 0) {
      vendors[index] = updatedVendor;
    } else {
      vendors.push(updatedVendor);
    }

    this.saveStoredVendors(vendors);
  }

  private loadVendorByToken(token: string): void {
    const vendors = this.getStoredVendors();
    const vendor = vendors.find((v) => v.token === token);

    if (!vendor) {
      console.error('Invalid or expired registration token.');
      return;
    }

    this.model = this.mergeWithDefaults(vendor);
    this.submitted = this.model.status === VendorStatus.UnderReview;
  }

  private mergeWithDefaults(vendor: VendorDto): VendorDto {
    const defaults = this.createEmptyVendorModel();

    return {
      ...defaults,
      ...vendor,
      companyProfile: {
        ...defaults.companyProfile,
        ...(vendor.companyProfile ?? {}),
      },
      contacts:
        Array.isArray(vendor.contacts) && vendor.contacts.length > 0
          ? vendor.contacts
          : [this.createEmptyContact()],
      category: Array.isArray(vendor.category) ? vendor.category : [],
      bankDetails:
        Array.isArray(vendor.bankDetails) && vendor.bankDetails.length > 0
          ? vendor.bankDetails
          : [this.createEmptyBankDetail()],
      documentsRequired: Array.isArray(vendor.documentsRequired)
        ? vendor.documentsRequired
        : [DocumentType.CAC, DocumentType.TIN],
      documentsSubmitted: Array.isArray(vendor.documentsSubmitted)
        ? vendor.documentsSubmitted
        : [],
    };
  }

  private markRegistrationInProgress(token: string): void {
    const vendors = this.getStoredVendors();
    const now = new Date().toISOString();

    const updated = vendors.map((v) => {
      if (v.token !== token) return v;

      const locked =
        v.status === VendorStatus.UnderReview ||
        v.status === VendorStatus.Approved ||
        v.status === VendorStatus.Rejected;

      if (locked) return v;

      return {
        ...v,
        status: VendorStatus.RegistrationInProgress,
        lastUpdatedAt: now,
      };
    });

    this.saveStoredVendors(updated);

    const current = updated.find((v) => v.token === token);
    if (current) {
      this.model = this.mergeWithDefaults(current);
    }
  }

  private initializeUploads(): void {
    this.uploads = [
      {
        type: DocumentType.CAC,
        label: 'CAC / Company Registration',
        required: this.model.documentsRequired.includes(DocumentType.CAC),
        hint: 'Upload your CAC certificate or company registration document.',
      },
      {
        type: DocumentType.TIN,
        label: 'TIN / Tax Identification',
        required: this.model.documentsRequired.includes(DocumentType.TIN),
        hint: 'Upload your Tax Identification document.',
      },
      {
        type: DocumentType.VAT,
        label: 'VAT Certificate',
        required: this.model.documentsRequired.includes(DocumentType.VAT),
        hint: 'Upload VAT certificate if applicable.',
      },
      {
        type: DocumentType.BankLetter,
        label: 'Bank Letter / Account Proof',
        required: this.model.documentsRequired.includes(DocumentType.BankLetter),
        hint: 'Upload a bank confirmation letter or account proof.',
      },
      {
        type: DocumentType.SupportingDocument,
        label: 'Supporting Document',
        required: this.model.documentsRequired.includes(DocumentType.SupportingDocument),
        hint: 'Any extra document that supports your profile.',
      },
    ];
  }

  goTo(step: number): void {
    this.step = step;
    this.persistProgress();
  }

  next(): void {
    if (!this.canProceed()) return;
    this.step = Math.min(6, this.step + 1);
    this.persistProgress();
  }

  back(): void {
    this.step = Math.max(1, this.step - 1);
    this.persistProgress();
  }

  private persistProgress(): void {
    this.model.lastUpdatedAt = new Date().toISOString();
    this.upsertVendor(this.model);
  }

  canProceed(): boolean {
    if (this.step === 1) {
      const p = this.model.companyProfile;
      return !!p.legalName && !!p.businessType && !!p.address && !!p.state && !!p.country;
    }

    if (this.step === 2) {
      return this.model.contacts.every(
        (c) =>
          c.firstName?.trim() &&
          c.lastName?.trim() &&
          c.email?.trim() &&
          c.phoneNumber?.trim() &&
          c.role?.trim()
      );
    }

    if (this.step === 3) {
      return this.model.category.length > 0 && !!this.model.capabilityStatement?.trim();
    }

    if (this.step === 4) {
      return this.model.bankDetails.every(
        (b) =>
          b.bankName?.trim() &&
          b.accountName?.trim() &&
          b.accountNumber?.trim() &&
          b.currency?.trim()
      );
    }

    if (this.step === 5) {
      const requiredDocs = this.uploads.filter((u) => u.required).map((u) => u.type);
      return requiredDocs.every((doc) => this.model.documentsSubmitted.includes(doc));
    }

    return true;
  }

  addContact(): void {
    this.model.contacts.push(this.createEmptyContact());
  }

  removeContact(index: number): void {
    if (this.model.contacts.length === 1) return;
    this.model.contacts.splice(index, 1);
  }

  addBankDetail(): void {
    this.model.bankDetails.push(this.createEmptyBankDetail());
  }

  removeBankDetail(id: number): void {
    if (this.model.bankDetails.length === 1) return;
    this.model.bankDetails = this.model.bankDetails.filter((b) => b.id !== id);
  }

  // onPickFile(item: UploadItem, event: any): void {
  //   const file: File | undefined = event?.files?.[0];
  //   item.file = file;

  //   if (file && !this.model.documentsSubmitted.includes(item.type)) {
  //     this.model.documentsSubmitted.push(item.type);
  //   }
  // }

  onPickFile(item: UploadItem, event: any): void {
  const file: File | undefined = event?.files?.[0];
  if (!file) return;

  item.file = file;

  const reader = new FileReader();
  reader.onload = () => {
    const fileDataUrl = reader.result as string;

    const existingIndex = this.model.documents.findIndex(
      (d) => d.documentType === item.type
    );

    const doc = {
      id: Date.now(),
      documentType: item.type,
      fileName: file.name,
      fileDataUrl,
      uploadedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.model.documents[existingIndex] = doc;
    } else {
      this.model.documents.push(doc);
    }

    if (!this.model.documentsSubmitted.includes(item.type)) {
      this.model.documentsSubmitted.push(item.type);
    }

    this.persistProgress();
  };

  reader.readAsDataURL(file);
}

  // removeFile(item: UploadItem): void {
  //   item.file = undefined;
  //   this.model.documentsSubmitted = this.model.documentsSubmitted.filter((x) => x !== item.type);
  // }

  removeFile(item: UploadItem): void {
  item.file = undefined;

  this.model.documentsSubmitted = this.model.documentsSubmitted.filter(
    (x) => x !== item.type
  );

  this.model.documents = this.model.documents.filter(
    (x) => x.documentType !== item.type
  );

  this.persistProgress();
}

  submitVendor(): void {
    if (!this.canProceed()) return;

    this.model.status = VendorStatus.UnderReview;
    this.model.aiStatus = VendorAIStatus.Pending;
    this.model.submittedOn = new Date().toISOString();
    this.model.lastUpdatedAt = new Date().toISOString();

    this.upsertVendor(this.model);
    this.submitted = true;
  }

  get selectedCategoryNames(): string {
  if (!this.model?.category?.length) {
    return '—';
  }

  return this.model.category.map((c) => c.name).join(', ');
}
}

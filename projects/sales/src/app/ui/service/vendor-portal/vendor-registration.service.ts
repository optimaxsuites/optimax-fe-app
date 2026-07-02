import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import {
  VendorRegistration, RegistrationStatus,
  BusinessIdentity, LegalCompliance, ContactLocation,
  BankingFinance, CapabilitiesExperience, DocumentsDeclaration,
  UploadedDocument, DocumentUploadType,
} from '../../domain/vendor-portal/vendor-registration.dto';

const DRAFT_STORAGE_KEY = 'vr_draft';

@Injectable({ providedIn: 'root' })
export class VendorRegistrationService {

  private registration$$ = new BehaviorSubject<VendorRegistration | null>(this.loadDraft());

  readonly registration$ = this.registration$$.asObservable();

  // ── Draft persistence ─────────────────────────────────────────────────────
  saveDraft(reg: Partial<VendorRegistration>): void {
    const current = this.registration$$.getValue() ?? this.blankRegistration();
    const updated  = { ...current, ...reg, lastModified: new Date() };
    this.registration$$.next(updated as VendorRegistration);
    try {
      // Omit File objects — they can't be serialised
      const serialisable = this.stripFiles(updated as VendorRegistration);
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(serialisable));
    } catch { /* storage full or SSR */ }
  }

  getDraft(): VendorRegistration | null {
    return this.registration$$.getValue();
  }

  clearDraft(): void {
    this.registration$$.next(null);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }

  // ── Step savers ───────────────────────────────────────────────────────────
  saveStep1(data: BusinessIdentity): void {
    this.saveDraft({ step1: data });
  }

  saveStep2(data: LegalCompliance): void {
    this.saveDraft({ step2: data });
  }

  saveStep3(data: ContactLocation): void {
    this.saveDraft({ step3: data });
  }

  saveStep4(data: BankingFinance): void {
    this.saveDraft({ step4: data });
  }

  saveStep5(data: CapabilitiesExperience): void {
    this.saveDraft({ step5: data });
  }

  saveStep6(data: DocumentsDeclaration): void {
    this.saveDraft({ step6: data });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  submit(reg: VendorRegistration): Observable<{ applicationNumber: string }> {
    // In production: POST to /api/vendor-registrations
    const appNum = `VRN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
    const submitted: VendorRegistration = {
      ...reg,
      status:            'submitted',
      submittedDate:     new Date(),
      applicationNumber: appNum,
    };
    this.registration$$.next(submitted);
    // Clear local draft after successful submission
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    return of({ applicationNumber: appNum }).pipe(delay(1200));
  }

  // ── File upload ───────────────────────────────────────────────────────────
  uploadFile(file: File, type: DocumentUploadType): Observable<UploadedDocument> {
    // In production: POST to /api/vendor-registrations/documents
    const doc: UploadedDocument = {
      id:           `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      label:        this.docTypeLabel(type),
      fileName:     file.name,
      fileSize:     this.formatSize(file.size),
      fileUrl:      URL.createObjectURL(file),
      uploadedDate: new Date(),
      isRequired:   this.isRequiredDoc(type),
      status:       'pending',
      file,
    };
    return of(doc).pipe(delay(600));
  }

  // ── Application number check (for routing guard) ──────────────────────────
  checkStatus(applicationNumber: string): Observable<RegistrationStatus> {
    return of('under_review' as RegistrationStatus).pipe(delay(500));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private loadDraft(): VendorRegistration | null {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private blankRegistration(): VendorRegistration {
    return {
      status: 'draft',
      step1: {
        businessName: '', businessType: 'limited_liability',
        businessSize: 'small', ownershipType: 'indigenous',
        yearEstablished: new Date().getFullYear(),
        numberOfEmployees: '', annualTurnoverRange: '',
        currency: 'NGN', businessDescription: '',
      },
      step2: {
        cacRegistrationNumber: '', cacRegistrationDate: '',
        tinNumber: '', vatRegistered: false,
        hasPublicLiabilityInsurance: false,
        hasProfessionalIndemnity: false,
        isoStandards: [],
        hasBeenBlacklisted: false,
        hasLitigationPending: false,
        hasCriminalConviction: false,
      },
      step3: {
        primaryContactName: '', primaryContactTitle: '',
        primaryContactEmail: '', primaryContactPhone: '',
        hasSecondaryContact: false,
        registeredAddressLine1: '', registeredCity: '',
        registeredState: '', registeredCountry: 'Nigeria',
        operatingAddressSameAsRegistered: true,
        hasWarehouse: false,
        deliveryRegions: [],
        hasOwnDeliveryFleet: false,
        deliveryLeadTimeDays: 7,
        canDeliverNationwide: false,
        canDeliverInternationally: false,
      },
      step4: {
        primaryBankName: '', primaryAccountName: '',
        primaryAccountNumber: '', primaryAccountType: 'current',
        primaryCurrency: 'NGN',
        hasSecondaryBankAccount: false,
        preferredPaymentTerms: 'Net 30',
        acceptsAdvancePayment: false,
        acceptsLetterOfCredit: false,
        acceptsMobileMoney: false,
        annualAuditedAccounts: false,
      },
      step5: {
        supplyCategories: [], primaryCategory: 'other',
        categoryDescription: '',
        canHandleEmergencyOrders: false,
        bulkDiscountAvailable: false,
        hasQualityManagementSystem: false,
        hasInspectionFacility: false,
        isManufacturer: false,
        isDistributor: false,
        isServiceProvider: false,
        isImporter: false,
        majorClients: [],
        completedProjectsCount: 0,
        keyPersonnelList: [],
      },
      step6: {
        uploadedDocuments: [],
        declarantName: '', declarantTitle: '',
        declarantEmail: '', declarantPhone: '',
        declarationDate: new Date().toISOString().split('T')[0],
        agreedToTerms: false,
        agreedToPrivacyPolicy: false,
        agreedToCodeOfConduct: false,
        agreedToAntiCorruption: false,
        confirmedAccuracy: false,
      },
    };
  }

  private stripFiles(reg: VendorRegistration): any {
    return JSON.parse(JSON.stringify(reg, (key, val) => {
      if (val instanceof File) return undefined;
      if (typeof val === 'string' && val.startsWith('blob:')) return undefined;
      return val;
    }));
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / k ** i).toFixed(1)} ${s[i]}`;
  }

  isRequiredDoc(type: DocumentUploadType): boolean {
    return ['cac_certificate', 'tax_clearance', 'public_liability_insurance'].includes(type);
  }

  docTypeLabel(type: DocumentUploadType): string {
    const m: Record<DocumentUploadType, string> = {
      cac_certificate:         'CAC Certificate of Incorporation',
      tax_clearance:           'Tax Clearance Certificate',
      vat_certificate:         'VAT Registration Certificate',
      nafdac_cert:             'NAFDAC Registration Certificate',
      son_cert:                'SON Certification',
      public_liability_insurance: 'Public Liability Insurance Policy',
      professional_indemnity:  'Professional Indemnity Insurance',
      iso_certificate:         'ISO Certification',
      annual_accounts:         'Audited Annual Accounts',
      company_profile:         'Company Profile Document',
      bank_reference_letter:   'Bank Reference Letter',
      other:                   'Other Document',
    };
    return m[type] ?? 'Document';
  }
}
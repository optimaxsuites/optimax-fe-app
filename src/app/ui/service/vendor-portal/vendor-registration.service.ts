import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, forkJoin, throwError } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import {
  VendorRegistration, RegistrationStatus,
  BusinessIdentity, LegalCompliance, ContactLocation,
  BankingFinance, CapabilitiesExperience, DocumentsDeclaration,
  UploadedDocument, DocumentUploadType,
} from '../../domain/vendor-portal/vendor-registration.dto';
import { VendorStatus } from '../../domain/vendor-management/vendor-management.dto';
import { environment } from '../../shared-component/service/environments/environment';
import { VendorService as VendorManagementService } from '../vendor-management/vendor-management.service';
import { registrationFromApi, registrationStepToApi } from './registration-api-mapping.util';

/** The logged-in vendor's own record, as Vendor Management holds it. */
export interface OwnVendorRecord {
  vendorId: string;
  status: VendorStatus;
  registration?: VendorRegistration;
}

/**
 * Whether a record holds details uploaded through the portal. Signup only captures the company name
 * and email, so step 1 can't tell; these are required fields no signup record has.
 */
export function hasUploadedDetails(reg?: Partial<VendorRegistration> | null): boolean {
  return !!(reg?.step2?.cacRegistrationNumber || reg?.step3?.primaryContactName || reg?.step4?.primaryBankName);
}

/**
 * Thrown by submit() with a message that is safe to show the vendor. `failedDocuments` lists the labels
 * of documents that could not be uploaded, when that is what went wrong.
 */
export class RegistrationSubmitError extends Error {
  constructor(message: string, public readonly failedDocuments: string[] = []) {
    super(message);
    this.name = 'RegistrationSubmitError';
  }
}

/** Plain wording for the backend's bean-validation codes. */
const FIELD_ERROR_TEXT: Record<string, string> = {
  NotNull: 'is required', NotBlank: 'is required', NotEmpty: 'is required',
  Email: 'must be a valid email address', Size: 'has the wrong length', Pattern: 'is in the wrong format',
};

/** How each registration step is named in the form, for error messages. */
const STEP_NAMES: Record<number, string> = {
  1: 'Business Identity', 2: 'Legal & Compliance', 3: 'Contact & Location',
  4: 'Banking & Finance', 5: 'Capabilities & Experience', 6: 'Documents & Declaration',
};

@Injectable({ providedIn: 'root' })
export class VendorRegistrationService {

  /** Client ids of documents already uploaded to the backend, so a retry doesn't upload them twice. */
  private uploadedDocIds = new Set<string>();

  private readonly baseUrl = environment.apiBaseUrl + '/x/api/v2/commerce';

  private registration$$ = new BehaviorSubject<VendorRegistration | null>(null);

  readonly registration$ = this.registration$$.asObservable();

  constructor(private http: HttpClient, private vendorManagement: VendorManagementService) { }

  // ── The logged-in vendor's record ─────────────────────────────────────────
  /**
   * Finds the record created at signup, or null if this login doesn't map to exactly one vendor.
   * Login only gives us a user id, which is not a vendor id — fetching `vendors/{userid}` could load
   * and then overwrite another vendor — so the record is matched on the login's email instead.
   */
  loadOwnVendor(): Observable<OwnVendorRecord | null> {
    const email = (sessionStorage.getItem('email') || '').trim().toLowerCase();
    if (!email) return of(null);
    return this.vendorManagement.getVendors(1, 200, { search: email }).pipe(
      map(res => res.vendors.filter(v => (v.email || '').trim().toLowerCase() === email)),
      switchMap(matches => matches.length === 1
        ? this.vendorManagement.getVendorById(String(matches[0].id)).pipe(
            map(v => ({ vendorId: String(v.id), status: v.status, registration: v.registration })))
        : of(null))
    );
  }

  // ── Draft persistence ─────────────────────────────────────────────────────
  /** Merges a partial update into the in-memory draft and fires the BehaviorSubject.
   *  No localStorage is used; the server is the source of truth once a record
   *  exists, but for pure draft state (before POST /vendors) we keep it in memory. */
  saveDraft(reg: Partial<VendorRegistration>): void {
    const current = this.registration$$.getValue() ?? this.blankRegistration();
    const updated = { ...current, ...reg, lastModified: new Date() };
    this.registration$$.next(updated as VendorRegistration);
  }

  getDraft(): VendorRegistration | null {
    return this.registration$$.getValue();
  }

  clearDraft(): void {
    this.registration$$.next(null);
  }

  // ── Step savers ───────────────────────────────────────────────────────────
  /** Saves step 1 (Business Identity) in memory and, if the vendor record
   *  already has a server-assigned id, persists via PUT /vendors/{id}/step1. */
  saveStep1(data: BusinessIdentity): void {
    this.saveDraft({ step1: data });
    const id = this.registration$$.getValue()?.id;
    if (id) {
      this.http.put(`${this.baseUrl}/vendors/${id}/step1`, registrationStepToApi(1, data)).pipe(
        catchError((err) => { console.error('[VendorRegistrationService] saveStep1 failed:', err); return of(null); }),
      ).subscribe();
    }
  }

  saveStep2(data: LegalCompliance): void {
    this.saveDraft({ step2: data });
    const id = this.registration$$.getValue()?.id;
    if (id) {
      this.http.put(`${this.baseUrl}/vendors/${id}/step2`, this.stepBody(2, data, id)).pipe(
        catchError((err) => { console.error('[VendorRegistrationService] saveStep2 failed:', err); return of(null); }),
      ).subscribe();
    }
  }

  saveStep3(data: ContactLocation): void {
    this.saveDraft({ step3: data });
    const id = this.registration$$.getValue()?.id;
    if (id) {
      this.http.put(`${this.baseUrl}/vendors/${id}/step3`, this.stepBody(3, data, id)).pipe(
        catchError((err) => { console.error('[VendorRegistrationService] saveStep3 failed:', err); return of(null); }),
      ).subscribe();
    }
  }

  saveStep4(data: BankingFinance): void {
    this.saveDraft({ step4: data });
    const id = this.registration$$.getValue()?.id;
    if (id) {
      this.http.put(`${this.baseUrl}/vendors/${id}/step4`, this.stepBody(4, data, id)).pipe(
        catchError((err) => { console.error('[VendorRegistrationService] saveStep4 failed:', err); return of(null); }),
      ).subscribe();
    }
  }

  saveStep5(data: CapabilitiesExperience): void {
    this.saveDraft({ step5: data });
    const id = this.registration$$.getValue()?.id;
    if (id) {
      this.http.put(`${this.baseUrl}/vendors/${id}/step5`, this.stepBody(5, data, id)).pipe(
        catchError((err) => { console.error('[VendorRegistrationService] saveStep5 failed:', err); return of(null); }),
      ).subscribe();
    }
  }

  saveStep6(data: DocumentsDeclaration): void {
    this.saveDraft({ step6: data });
    const id = this.registration$$.getValue()?.id;
    if (id) {
      this.http.put(`${this.baseUrl}/vendors/${id}/step6`, this.stepBody(6, data, id)).pipe(
        catchError((err) => { console.error('[VendorRegistrationService] saveStep6 failed:', err); return of(null); }),
      ).subscribe();
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  /**
   * Saves the vendor's details onto their existing record (`reg.id`): save every step, upload the
   * documents, then send a not-yet-approved vendor for review. Used for the first upload and every
   * later edit. Every stage reports failure to the caller — nothing is swallowed and there is no
   * offline/"pretend it worked" fallback.
   *
   * What this replaces, and why:
   *  - Vendors have a record from signup, and this used to POST a second one, so their details never
   *    reached the record Vendor Management shows. It never creates a vendor now.
   *  - A failed POST /vendors used to be converted into a fake `APP-<timestamp>` record in localStorage
   *    plus a success screen ("received and under review… confirmation email sent"). The admin never
   *    saw those applications, and the vendor was told they were in.
   *  - Each PUT step2..6 had `catchError(() => of(null))` and PATCH /submit always ran afterwards, so a
   *    half-saved application was still marked submitted with success shown; a failed PATCH was also
   *    reported as success.
   *  - The documents were never sent at all: only a `blob:` URL (meaningless outside this tab) and an
   *    unserialisable `File` (which JSON turns into `{}`) went into the step-6 payload.
   *  - The full registration, including bank account and tax numbers, was written to localStorage in
   *    plaintext and never removed.
   *
   * On success the draft is cleared.
   */
  submit(reg: VendorRegistration, vendorStatus: VendorStatus): Observable<void> {
    if (!reg.id) {
      return throwError(() => new RegistrationSubmitError('We could not find your vendor record, so your details were not saved.'));
    }
    const id = String(reg.id);
    const docs = reg.step6?.uploadedDocuments ?? [];

    // Every step is saved even if one fails (no cancelling the others), so a single attempt reports
    // every step the server rejected instead of revealing them one retry at a time.
    const saveSteps = (): Observable<unknown> => {
      const puts: Observable<{ step: number; err: any } | null>[] = [];
      const put = (n: number, body: unknown) => puts.push(
        this.http.put(`${this.baseUrl}/vendors/${id}/step${n}`, this.stepBody(n, body, id)).pipe(
          map(() => null),
          catchError(err => of({ step: n, err }))
        ));
      if (reg.step1) put(1, reg.step1);
      if (reg.step2) put(2, reg.step2);
      if (reg.step3) put(3, reg.step3);
      if (reg.step4) put(4, reg.step4);
      if (reg.step5) put(5, reg.step5);
      if (reg.step6) put(6, this.serializableStep6(reg.step6));
      return (puts.length ? forkJoin(puts) : of([])).pipe(
        switchMap(results => {
          const failed = results.filter((r): r is { step: number; err: any } => !!r);
          if (!failed.length) return of(null);
          if (failed.every(f => f.err?.status === 0)) {
            return throwError(() => new RegistrationSubmitError('Some of your details could not be saved. Please check your connection and try again.'));
          }
          const lines = failed.map(f => `${STEP_NAMES[f.step] || `Step ${f.step}`}: ${this.serverReason(f.err) || 'could not be saved'}`);
          return throwError(() => new RegistrationSubmitError(`Some of your details could not be saved. ${lines.join(' | ')}`));
        })
      );
    };

    const uploadDocuments = (): Observable<unknown> => {
      const pending = docs.filter(d => d.file && !this.uploadedDocIds.has(d.id));
      if (!pending.length) return of(null);
      return forkJoin(pending.map(doc =>
        this.uploadRegistrationDocument(id, doc, reg.step2).pipe(
          tap(() => this.uploadedDocIds.add(doc.id)),
          map(() => null as { name: string; reason: string } | null),
          // Keep the server's reason: without it a rejected field (an enum spelling, a missing date)
          // is indistinguishable from a network failure.
          catchError(err => of({
            name: doc.label || doc.fileName || 'a document',
            reason: err?.status === 0 ? 'connection problem' : this.serverReason(err),
          }))
        )
      )).pipe(
        switchMap(results => {
          const failed = results.filter((r): r is { name: string; reason: string } => !!r);
          if (!failed.length) return of(null);
          const lines = failed.map(f => f.reason ? `${f.name} (${f.reason})` : f.name);
          return throwError(() => new RegistrationSubmitError(
            `These documents could not be uploaded: ${lines.join(', ')}. Please try again.`,
            failed.map(f => f.name)));
        })
      );
    };

    // Only a vendor still awaiting review is sent for it: this must never put an approved vendor back
    // in the queue, and their edits apply straight away.
    const sendForReview = (): Observable<unknown> => vendorStatus !== VendorStatus.PENDING_ONBOARDING
      ? of(null)
      : this.http.patch<any>(`${this.baseUrl}/vendors/${id}/submit`, {}).pipe(
          catchError(err => throwError(() => new RegistrationSubmitError(this.failureMessage(err, 'Your details were saved, but could not be sent for review.'))))
        );

    return saveSteps().pipe(
      switchMap(() => uploadDocuments()),
      switchMap(() => sendForReview()),
      map(() => undefined),
      tap(() => {
        this.uploadedDocIds.clear();
        this.clearDraft();
      })
    );
  }

  /**
   * What went wrong, in a sentence the vendor can act on: a real connection problem (status 0) says so;
   * otherwise the server's own reason is shown instead of blaming the vendor's connection.
   */
  private failureMessage(err: any, what: string): string {
    if (err?.status === 0) return `${what} Please check your connection and try again.`;
    const reason = this.serverReason(err);
    return reason ? `${what} The server said: ${reason}` : `${what} Please try again.`;
  }

  /**
   * The backend's own message, kept long enough to include the full list of accepted values it names.
   * Validation errors come with `message: null` and the detail in `fieldErrors`, so those are spelled out.
   */
  private serverReason(err: any): string {
    const body = err?.error;
    const fields = Array.isArray(body?.fieldErrors)
      ? body.fieldErrors.map((f: any) => `${f?.field || 'a field'} ${FIELD_ERROR_TEXT[f?.errorCode] || `is invalid (${f?.errorCode || 'unknown'})`}`).join(', ')
      : '';
    const reason = String((typeof body === 'string' ? body : (body?.message || fields || body?.error || '')) || '').trim();
    return reason.length > 1000 ? reason.slice(0, 1000) + '…' : reason;
  }

  /** A step's request body: backend enum spellings, plus the `vendorId` the step endpoints require in
   *  the body (they reject it as NotNull even though the id is already in the URL). Step 1 doesn't need it. */
  private stepBody(n: number, data: unknown, vendorId: string | number): unknown {
    const body = registrationStepToApi(n, data);
    if (n === 1) return body;
    const numeric = Number(vendorId);
    return { ...body, vendorId: isNaN(numeric) ? vendorId : numeric };
  }

  /** Step 6 minus each document's `File` and `blob:` URL — neither can be sent as JSON (a File becomes `{}`). */
  private serializableStep6(step6: DocumentsDeclaration): DocumentsDeclaration {
    return {
      ...step6,
      uploadedDocuments: (step6.uploadedDocuments ?? []).map(({ file, fileUrl, ...meta }) => meta as UploadedDocument)
    };
  }

  /** Uploads one registration document as multipart — the same endpoint and shape the admin Documents tab uses. */
  private uploadRegistrationDocument(vendorId: string, doc: UploadedDocument, step2?: LegalCompliance): Observable<unknown> {
    const file = doc.file as File;
    const form = new FormData();
    form.append('file', file, doc.fileName || file.name);
    form.append('category', this.docCategory(doc.type));
    form.append('type', String(doc.type).toUpperCase());
    form.append('label', doc.label || this.docTypeLabel(doc.type));
    form.append('isRequired', String(!!doc.isRequired));
    const issued = doc.uploadedDate ? new Date(doc.uploadedDate) : new Date();
    form.append('issueDate', (isNaN(issued.getTime()) ? new Date() : issued).toISOString());
    // Only a real expiry the vendor entered — never an invented default date.
    const expiry = this.docExpiry(doc, step2);
    if (expiry) form.append('expiryDate', expiry.toISOString());
    return this.http.post(`${this.baseUrl}/vendors/${vendorId}/documents`, form);
  }

  private docCategory(type: string): string {
    const t = String(type || '').toLowerCase();
    if (['cac_certificate', 'company_profile', 'bank_reference_letter', 'annual_accounts'].includes(t)) return 'REGISTRATION';
    if (['tax_clearance', 'vat_certificate'].includes(t)) return 'TAX';
    if (['nafdac_cert', 'son_cert', 'iso_certificate'].includes(t)) return 'CERTIFICATION';
    if (['public_liability_insurance', 'professional_indemnity'].includes(t)) return 'INSURANCE';
    return 'REGISTRATION';
  }

  /** The expiry the vendor actually entered for this kind of document (step 2 fields), if any. */
  private docExpiry(doc: UploadedDocument, step2?: LegalCompliance): Date | null {
    const raw =
      doc.type === 'tax_clearance' ? step2?.taxClearanceExpiryDate
      : doc.type === 'public_liability_insurance' ? step2?.publicLiabilityExpiryDate
      : doc.type === 'professional_indemnity' ? step2?.professionalIndemnityExpiry
      : doc.expiryDate;
    if (!raw) return null;
    const d = new Date(raw as any);
    return isNaN(d.getTime()) ? null : d;
  }

  // ── File upload ───────────────────────────────────────────────────────────
  uploadFile(file: File, type: DocumentUploadType): Observable<UploadedDocument> {
    const objectUrl = URL.createObjectURL(file);
    const doc: UploadedDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      label: this.docTypeLabel(type),
      fileName: file.name,
      fileSize: this.formatSize(file.size),
      fileUrl: objectUrl,
      uploadedDate: new Date(),
      isRequired: this.isRequiredDoc(type),
      status: 'pending',
      file,
    };
    return of(doc);
  }

  // ── Fetch existing registration ───────────────────────────────────────────
  loadRegistration(vendorId: string): Observable<VendorRegistration> {
    return this.http.get<VendorRegistration>(`${this.baseUrl}/vendors/${vendorId}`).pipe(
      map(reg => registrationFromApi(reg)),
      tap((reg) => this.registration$$.next(reg)),
      catchError((err) => {
        console.error('[VendorRegistrationService] loadRegistration failed:', err);
        return throwError(() => err);
      }),
    );
  }

  // ── Application number check (for routing guard) ──────────────────────────
  checkStatus(applicationNumber: string): Observable<RegistrationStatus> {
    return this.http.get<{ status: RegistrationStatus }>(
      `${this.baseUrl}/vendors/${applicationNumber}`,
    ).pipe(
      map((res) => res.status),
      catchError((err) => {
        console.error('[VendorRegistrationService] checkStatus failed:', err);
        return throwError(() => err);
      }),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
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
      cac_certificate: 'CAC Certificate of Incorporation',
      tax_clearance: 'Tax Clearance Certificate',
      vat_certificate: 'VAT Registration Certificate',
      nafdac_cert: 'NAFDAC Registration Certificate',
      son_cert: 'SON Certification',
      public_liability_insurance: 'Public Liability Insurance Policy',
      professional_indemnity: 'Professional Indemnity Insurance',
      iso_certificate: 'ISO Certification',
      annual_accounts: 'Audited Annual Accounts',
      company_profile: 'Company Profile Document',
      bank_reference_letter: 'Bank Reference Letter',
      other: 'Other Document',
    };
    return m[type] ?? 'Document';
  }
}

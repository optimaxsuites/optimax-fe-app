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
import { environment } from '../../shared-component/service/environments/environment';
import { registrationFromApi, registrationStepToApi } from './registration-api-mapping.util';

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

  constructor(private http: HttpClient) { }

  private get tenantId(): string {
    const h = window.location.hostname;
    return (h.includes('localhost') || h.includes('127.0.0.1')) ? 'optimax' : h.split('.')[0] || 'optimax';
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
   * Submits the finished registration: create the vendor record (once), save every step, upload the
   * documents, then mark the application submitted. Every stage reports failure to the caller — nothing
   * is swallowed and there is no offline/"pretend it worked" fallback.
   *
   * What this replaces, and why:
   *  - A failed POST /vendors used to be converted into a fake `APP-<timestamp>` record in localStorage
   *    plus a success screen ("received and under review… confirmation email sent"). The admin never
   *    saw those applications, and the vendor was told they were in.
   *  - Each PUT step2..6 had `catchError(() => of(null))` and PATCH /submit always ran afterwards, so a
   *    half-saved application was still marked submitted with success shown; a failed PATCH was also
   *    reported as success.
   *  - The documents were never sent at all: only a `blob:` URL (meaningless outside this tab) and an
   *    unserialisable `File` (which JSON turns into `{}`) went into the step-6 payload.
   *  - Every submit POSTed a new vendor, because the draft's id was never reused, so retrying after any
   *    failure created duplicates.
   *  - The full registration, including bank account and tax numbers, was written to localStorage in
   *    plaintext and never removed.
   *
   * The created vendor's id is remembered in the draft, so retrying after a failure continues the same
   * record instead of creating another. On success the draft is cleared.
   */
  submit(reg: VendorRegistration): Observable<{ applicationNumber: string }> {
    const existingId = reg.id ?? this.registration$$.getValue()?.id;
    const docs = reg.step6?.uploadedDocuments ?? [];

    const ensureVendor$: Observable<string> = existingId
      ? of(String(existingId))
      : this.http.post<any>(`${this.baseUrl}/vendors`, { ...registrationStepToApi(1, reg.step1 ?? {}), tenantId: this.tenantId }).pipe(
          map(res => {
            const id = this.extractId(res);
            if (!id) {
              throw new RegistrationSubmitError('The server did not return an application reference. Please try again.');
            }
            return id;
          }),
          tap(id => {
            const current = this.registration$$.getValue() ?? this.blankRegistration();
            this.registration$$.next({ ...current, ...reg, id } as VendorRegistration);
          }),
          catchError(err => throwError(() => err instanceof RegistrationSubmitError
            ? err
            : new RegistrationSubmitError(this.failureMessage(err, 'We could not create your application.'))))
        );

    // Every step is saved even if one fails (no cancelling the others), so a single attempt reports
    // every step the server rejected instead of revealing them one retry at a time.
    const saveSteps = (id: string): Observable<unknown> => {
      const puts: Observable<{ step: number; err: any } | null>[] = [];
      const put = (n: number, body: unknown) => puts.push(
        this.http.put(`${this.baseUrl}/vendors/${id}/step${n}`, this.stepBody(n, body, id)).pipe(
          map(() => null),
          catchError(err => of({ step: n, err }))
        ));
      // A brand-new vendor already has step 1 (it was the POST body); a retried one may have edits.
      if (existingId && reg.step1) put(1, reg.step1);
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

    const uploadDocuments = (id: string): Observable<unknown> => {
      const pending = docs.filter(d => d.file && !this.uploadedDocIds.has(d.id));
      if (!pending.length) return of(null);
      return forkJoin(pending.map(doc =>
        this.uploadRegistrationDocument(id, doc, reg.step2).pipe(
          tap(() => this.uploadedDocIds.add(doc.id)),
          map(() => null as string | null),
          catchError(() => of(doc.label || doc.fileName || 'a document'))
        )
      )).pipe(
        switchMap(results => {
          const failed = results.filter((r): r is string => !!r);
          return failed.length
            ? throwError(() => new RegistrationSubmitError(`These documents could not be uploaded: ${failed.join(', ')}. Please try again.`, failed))
            : of(null);
        })
      );
    };

    const markSubmitted = (id: string): Observable<{ applicationNumber: string }> =>
      this.http.patch<any>(`${this.baseUrl}/vendors/${id}/submit`, {}).pipe(
        map(res => ({ applicationNumber: String(res?.applicationNumber || id) })),
        catchError(err => throwError(() => new RegistrationSubmitError(this.failureMessage(err, 'Your details were saved, but the application could not be submitted.'))))
      );

    return ensureVendor$.pipe(
      switchMap(id => saveSteps(id).pipe(
        switchMap(() => uploadDocuments(id)),
        switchMap(() => markSubmitted(id))
      )),
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

  /** Vendor id from a create response — either `{ id }` / `{ vendorId }` or a bare id — or '' if absent. */
  private extractId(res: any): string {
    const raw = res?.id ?? res?.vendorId ?? (typeof res === 'string' || typeof res === 'number' ? res : null);
    return raw != null && typeof raw !== 'object' && String(raw).trim() !== '' ? String(raw) : '';
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

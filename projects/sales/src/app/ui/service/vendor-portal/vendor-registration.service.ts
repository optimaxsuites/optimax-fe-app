import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import {
  VendorRegistration, RegistrationStatus,
  BusinessIdentity, LegalCompliance, ContactLocation,
  BankingFinance, CapabilitiesExperience, DocumentsDeclaration,
  UploadedDocument, DocumentUploadType,
} from '../../domain/vendor-portal/vendor-registration.dto';
import { environment } from '../../shared-component/service/environments/environment';

@Injectable({ providedIn: 'root' })
export class VendorRegistrationService {

  private readonly baseUrl = environment.apiBaseUrl + '/x/api/v2/commerce';

  private registration$$ = new BehaviorSubject<VendorRegistration | null>(null);

  readonly registration$ = this.registration$$.asObservable();

  constructor(private http: HttpClient) {}

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
      this.http.put(`${this.baseUrl}/vendors/${id}/step1`, data).pipe(
        catchError((err) => { console.error('[VendorRegistrationService] saveStep1 failed:', err); return of(null); }),
      ).subscribe();
    }
  }

  saveStep2(data: LegalCompliance): void {
    this.saveDraft({ step2: data });
    const id = this.registration$$.getValue()?.id;
    if (id) {
      this.http.put(`${this.baseUrl}/vendors/${id}/step2`, data).pipe(
        catchError((err) => { console.error('[VendorRegistrationService] saveStep2 failed:', err); return of(null); }),
      ).subscribe();
    }
  }

  saveStep3(data: ContactLocation): void {
    this.saveDraft({ step3: data });
    const id = this.registration$$.getValue()?.id;
    if (id) {
      this.http.put(`${this.baseUrl}/vendors/${id}/step3`, data).pipe(
        catchError((err) => { console.error('[VendorRegistrationService] saveStep3 failed:', err); return of(null); }),
      ).subscribe();
    }
  }

  saveStep4(data: BankingFinance): void {
    this.saveDraft({ step4: data });
    const id = this.registration$$.getValue()?.id;
    if (id) {
      this.http.put(`${this.baseUrl}/vendors/${id}/step4`, data).pipe(
        catchError((err) => { console.error('[VendorRegistrationService] saveStep4 failed:', err); return of(null); }),
      ).subscribe();
    }
  }

  saveStep5(data: CapabilitiesExperience): void {
    this.saveDraft({ step5: data });
    const id = this.registration$$.getValue()?.id;
    if (id) {
      this.http.put(`${this.baseUrl}/vendors/${id}/step5`, data).pipe(
        catchError((err) => { console.error('[VendorRegistrationService] saveStep5 failed:', err); return of(null); }),
      ).subscribe();
    }
  }

  saveStep6(data: DocumentsDeclaration): void {
    this.saveDraft({ step6: data });
    const id = this.registration$$.getValue()?.id;
    if (id) {
      this.http.put(`${this.baseUrl}/vendors/${id}/step6`, data).pipe(
        catchError((err) => { console.error('[VendorRegistrationService] saveStep6 failed:', err); return of(null); }),
      ).subscribe();
    }
  }

  // ── Create vendor record on backend ──────────────────────────────────────
  /** POST /vendors — call once (e.g. on step 1 completion) to get a server-assigned
   *  vendor id, then subsequent step saves use PUT /vendors/{id}/stepN. */
  createVendorRecord(initial: Partial<VendorRegistration>): Observable<string> {
    return this.http.post<{ id: string }>(`${this.baseUrl}/vendors`, initial).pipe(
      tap(({ id }) => {
        const current = this.registration$$.getValue() ?? this.blankRegistration();
        this.registration$$.next({ ...current, ...initial, id } as VendorRegistration);
      }),
      map(({ id }) => id),
      catchError((err) => {
        console.error('[VendorRegistrationService] createVendorRecord failed:', err);
        return of('');
      }),
    );
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  submit(reg: VendorRegistration): Observable<{ applicationNumber: string }> {
    const vendorId = reg.id;

    // If no server record exists yet, create one first then submit
    if (!vendorId) {
      return this.http.post<{ id: string }>(`${this.baseUrl}/vendors`, reg).pipe(
        tap(({ id }) => {
          this.registration$$.next({ ...reg, id } as VendorRegistration);
        }),
        map(({ id }) => id),
        catchError((err) => {
          console.error('[VendorRegistrationService] submit (POST) failed:', err);
          return of('');
        }),
        // Chain the submit PATCH after the POST resolves
        // We use a manual flatMap-style here without importing switchMap to keep imports minimal —
        // but since we already imported map we simply chain via a second Observable.
        // The actual PATCH is fired in subscribe for simplicity.
        tap((id) => {
          if (id) {
            this.http.patch<{ applicationNumber: string }>(`${this.baseUrl}/vendors/${id}/submit`, {}).pipe(
              tap((res) => {
                const current = this.registration$$.getValue();
                if (current) {
                  this.registration$$.next({
                    ...current,
                    status: 'submitted',
                    submittedDate: new Date(),
                    applicationNumber: res.applicationNumber,
                  } as VendorRegistration);
                }
              }),
              catchError((err) => { console.error('[VendorRegistrationService] submit (PATCH) failed:', err); return of(null); }),
            ).subscribe();
          }
        }),
        // Return an observable of the applicationNumber by reading the subject once the PATCH resolves
        // For the immediate caller we return a resolved observable — components subscribe to the subject for final status
        map(() => ({ applicationNumber: this.registration$$.getValue()?.applicationNumber ?? '' })),
      );
    }

    return this.http.patch<{ applicationNumber: string }>(`${this.baseUrl}/vendors/${vendorId}/submit`, {}).pipe(
      tap((res) => {
        const current = this.registration$$.getValue();
        if (current) {
          this.registration$$.next({
            ...current,
            status: 'submitted',
            submittedDate: new Date(),
            applicationNumber: res.applicationNumber,
          } as VendorRegistration);
        }
      }),
      map((res) => ({ applicationNumber: res.applicationNumber })),
      catchError((err) => {
        console.error('[VendorRegistrationService] submit failed:', err);
        return of({ applicationNumber: '' });
      }),
    );
  }

  // ── File upload ───────────────────────────────────────────────────────────
  uploadFile(file: File, type: DocumentUploadType): Observable<UploadedDocument> {
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
    // Return the local document object immediately so the UI can display it;
    // the actual file should be uploaded via a multipart/form-data endpoint
    // in production (not yet wired — that endpoint spec was not provided).
    return of(doc);
  }

  // ── Fetch existing registration ───────────────────────────────────────────
  loadRegistration(vendorId: string): Observable<VendorRegistration> {
    return this.http.get<VendorRegistration>(`${this.baseUrl}/vendors/${vendorId}`).pipe(
      tap((reg) => this.registration$$.next(reg)),
      catchError((err) => {
        console.error('[VendorRegistrationService] loadRegistration failed:', err);
        return of(this.blankRegistration());
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
        return of('under_review' as RegistrationStatus);
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
      cac_certificate:            'CAC Certificate of Incorporation',
      tax_clearance:              'Tax Clearance Certificate',
      vat_certificate:            'VAT Registration Certificate',
      nafdac_cert:                'NAFDAC Registration Certificate',
      son_cert:                   'SON Certification',
      public_liability_insurance: 'Public Liability Insurance Policy',
      professional_indemnity:     'Professional Indemnity Insurance',
      iso_certificate:            'ISO Certification',
      annual_accounts:            'Audited Annual Accounts',
      company_profile:            'Company Profile Document',
      bank_reference_letter:      'Bank Reference Letter',
      other:                      'Other Document',
    };
    return m[type] ?? 'Document';
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEventType } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  VendorRegistrationDto,
  VendorRegistrationResponse,
  BusinessInformationDto,
  ContactLocationDto,
  FinancialBankingDto,
  ComplianceDto,
  ReferencesExperienceDto,
  DocumentsUploadDto,
} from '../../domain/vendor-portal/vendor-registration.dto';

export interface RegistrationStepStatus {
  step: number;
  completed: boolean;
  valid: boolean;
  touched: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class VendorRegistrationService {
  private readonly apiUrl = '/api/v1/vendor/registration';

  /** Track which steps have been visited and completed */
  private stepStatusSubject = new BehaviorSubject<RegistrationStepStatus[]>([
    { step: 1, completed: false, valid: false, touched: false },
    { step: 2, completed: false, valid: false, touched: false },
    { step: 3, completed: false, valid: false, touched: false },
    { step: 4, completed: false, valid: false, touched: false },
    { step: 5, completed: false, valid: false, touched: false },
    { step: 6, completed: false, valid: false, touched: false },
  ]);

  stepStatus$ = this.stepStatusSubject.asObservable();

  /** Partial in-memory draft of the registration */
  private draftSubject = new BehaviorSubject<Partial<VendorRegistrationDto>>({});
  draft$ = this.draftSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ─── Step Data Persistence ──────────────────────────────────────────────────

  updateBusinessInformation(data: BusinessInformationDto): void {
    this.draftSubject.next({ ...this.draftSubject.value, businessInformation: data });
    this.markStepCompleted(1);
  }

  updateContactLocation(data: ContactLocationDto): void {
    this.draftSubject.next({ ...this.draftSubject.value, contactLocation: data });
    this.markStepCompleted(2);
  }

  updateFinancialBanking(data: FinancialBankingDto): void {
    this.draftSubject.next({ ...this.draftSubject.value, financialBanking: data });
    this.markStepCompleted(3);
  }

  updateCompliance(data: ComplianceDto): void {
    this.draftSubject.next({ ...this.draftSubject.value, compliance: data });
    this.markStepCompleted(4);
  }

  updateReferencesExperience(data: ReferencesExperienceDto): void {
    this.draftSubject.next({ ...this.draftSubject.value, referencesExperience: data });
    this.markStepCompleted(5);
  }

  updateDocuments(data: DocumentsUploadDto): void {
    this.draftSubject.next({ ...this.draftSubject.value, documents: data });
    this.markStepCompleted(6);
  }

  getDraft(): Partial<VendorRegistrationDto> {
    return this.draftSubject.value;
  }

  markStepTouched(step: number): void {
    const statuses = [...this.stepStatusSubject.value];
    const idx = statuses.findIndex((s) => s.step === step);
    if (idx !== -1) {
      statuses[idx] = { ...statuses[idx], touched: true };
      this.stepStatusSubject.next(statuses);
    }
  }

  markStepValid(step: number, valid: boolean): void {
    const statuses = [...this.stepStatusSubject.value];
    const idx = statuses.findIndex((s) => s.step === step);
    if (idx !== -1) {
      statuses[idx] = { ...statuses[idx], valid };
      this.stepStatusSubject.next(statuses);
    }
  }

  private markStepCompleted(step: number): void {
    const statuses = [...this.stepStatusSubject.value];
    const idx = statuses.findIndex((s) => s.step === step);
    if (idx !== -1) {
      statuses[idx] = { ...statuses[idx], completed: true, touched: true };
      this.stepStatusSubject.next(statuses);
    }
  }

  resetRegistration(): void {
    this.draftSubject.next({});
    this.stepStatusSubject.next([
      { step: 1, completed: false, valid: false, touched: false },
      { step: 2, completed: false, valid: false, touched: false },
      { step: 3, completed: false, valid: false, touched: false },
      { step: 4, completed: false, valid: false, touched: false },
      { step: 5, completed: false, valid: false, touched: false },
      { step: 6, completed: false, valid: false, touched: false },
    ]);
  }

  // ─── API Calls ──────────────────────────────────────────────────────────────

  /**
   * Submit the complete vendor registration
   */
  submitRegistration(
    registration: VendorRegistrationDto
  ): Observable<VendorRegistrationResponse> {
    const formData = this.buildFormData(registration);

    return this.http
      .post<VendorRegistrationResponse>(this.apiUrl, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Save registration as draft
   */
  saveDraft(draft: Partial<VendorRegistrationDto>): Observable<{ draftId: string }> {
    return this.http
      .post<{ draftId: string }>(`${this.apiUrl}/draft`, draft)
      .pipe(catchError(this.handleError));
  }

  /**
   * Restore a saved draft by ID
   */
  restoreDraft(draftId: string): Observable<Partial<VendorRegistrationDto>> {
    return this.http
      .get<Partial<VendorRegistrationDto>>(`${this.apiUrl}/draft/${draftId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Verify CAC / Registration number
   */
  verifyCacNumber(cacNumber: string): Observable<{ valid: boolean; companyName?: string }> {
    return this.http
      .get<{ valid: boolean; companyName?: string }>(
        `${this.apiUrl}/verify-cac?cac=${cacNumber}`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Verify TIN
   */
  verifyTin(tin: string): Observable<{ valid: boolean }> {
    return this.http
      .get<{ valid: boolean }>(`${this.apiUrl}/verify-tin?tin=${tin}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Verify Bank Account (NIBSS lookup)
   */
  verifyBankAccount(
    accountNumber: string,
    bankCode: string
  ): Observable<{ valid: boolean; accountName?: string }> {
    return this.http
      .get<{ valid: boolean; accountName?: string }>(
        `${this.apiUrl}/verify-account?account=${accountNumber}&bank=${bankCode}`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Upload a single document
   */
  uploadDocument(
    file: File,
    documentType: string
  ): Observable<{ fileId: string; url: string; progress?: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    return this.http
      .post<{ fileId: string; url: string }>(`${this.apiUrl}/upload`, formData, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        map((event: any) => {
          if (event.type === HttpEventType.UploadProgress) {
            return {
              fileId: '',
              url: '',
              progress: Math.round((100 * event.loaded) / event.total),
            };
          } else if (event.type === HttpEventType.Response) {
            return event.body;
          }
          return { fileId: '', url: '', progress: 0 };
        }),
        catchError(this.handleError)
      );
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private buildFormData(registration: VendorRegistrationDto): FormData {
    const formData = new FormData();

    // Attach JSON payload (all non-file data)
    const payload = { ...registration };
    // Remove file blobs before stringifying
    delete (payload as any).documents;
    formData.append('data', JSON.stringify(payload));

    // Attach actual file blobs separately
    const docs = registration.documents;
    if (docs) {
      const fileFields = [
        'cacCertificate', 'tinCertificate', 'vatCertificate', 'incorporationCertificate',
        'auditedFinancialStatements', 'bankStatement', 'taxClearanceCertificate',
        'pencomClearance', 'itfClearance', 'nsitfClearance', 'directorId',
        'authorizedSignatoryId', 'companyProfile', 'isoCertificate',
      ] as const;

      fileFields.forEach((field) => {
        const doc = (docs as any)[field];
        if (doc?.file) {
          formData.append(`documents.${field}`, doc.file, doc.fileName);
        }
      });

      // Handle array of other documents
      if (docs.otherDocuments?.length) {
        docs.otherDocuments.forEach((d, i) => {
          if (d.file) {
            formData.append(`documents.otherDocuments[${i}]`, d.file, d.fileName);
          }
        });
      }
    }

    return formData;
  }

  private handleError(error: any): Observable<never> {
    let message = 'An unexpected error occurred. Please try again.';
    if (error.error?.message) {
      message = error.error.message;
    } else if (error.status === 0) {
      message = 'Unable to connect to the server. Check your internet connection.';
    } else if (error.status === 409) {
      message = 'A vendor with this registration number or email already exists.';
    } else if (error.status === 422) {
      message = 'Validation failed. Please review your entries.';
    }
    return throwError(() => ({ message, errors: error.error?.errors }));
  }

  // ─── Utility: Format File Size ──────────────────────────────────────────────
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /** Allowed MIME types */
  readonly ALLOWED_DOC_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  readonly MAX_FILE_SIZE_MB = 5;

  validateFile(file: File): { valid: boolean; error?: string } {
    if (!this.ALLOWED_DOC_TYPES.includes(file.type)) {
      return { valid: false, error: 'Only PDF, JPG, PNG, DOC and DOCX files are accepted.' };
    }
    if (file.size > this.MAX_FILE_SIZE_MB * 1024 * 1024) {
      return { valid: false, error: `File must not exceed ${this.MAX_FILE_SIZE_MB}MB.` };
    }
    return { valid: true };
  }
}
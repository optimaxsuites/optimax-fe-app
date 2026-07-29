import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, tap, catchError, shareReplay } from 'rxjs/operators';
import {
  Vendor,
  VendorDashboardStats,
  VendorListResponse,
  VendorPerformanceMetrics,
  VendorPerformanceResponse,
  VendorRiskResponse,
  VendorDocument,
  VendorKPI,
  RiskAlert,
  OnboardingData,
  OnboardingResult,
  OffboardingData,
  VendorRankingData,
  VendorPrediction,
  AnomalyDetection,
  VendorContract,
  VendorMessage,
  Dispute,
  VendorLifecycleHistory,
  VendorRecentActivity,
  VendorStatus,
  VendorTier,
  RiskLevel,
  DocumentCategory,
  DocumentStatus
} from '../../domain/vendor-management/vendor-management.dto';
import { environment } from '../../shared-component/service/environments/environment';

// ============================================================
// VENDOR SERVICE
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class VendorService {

  private readonly baseUrl = environment.apiBaseUrl + '/x/api/v2/commerce';

  // ============================================================
  // TENANT ID HELPER
  // ============================================================

  private get tenantId(): string {
    const h = window.location.hostname;
    return (h.includes('localhost') || h.includes('127.0.0.1')) ? 'optimax' : h.split('.')[0] || 'optimax';
  }

  // ============================================================
  // STATE MANAGEMENT (BehaviorSubjects)
  // ============================================================

  private vendorsSubject = new BehaviorSubject<Vendor[]>([]);
  vendors$ = this.vendorsSubject.asObservable();

  private selectedVendorSubject = new BehaviorSubject<Vendor | null>(null);
  selectedVendor$ = this.selectedVendorSubject.asObservable();

  private dashboardStatsSubject = new BehaviorSubject<VendorDashboardStats | null>(null);
  dashboardStats$ = this.dashboardStatsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  error$ = this.errorSubject.asObservable();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(private http: HttpClient) { }

  // ============================================================
  // DASHBOARD
  // ============================================================

  /**
   * Get vendor dashboard statistics
   * GET /vendor-dashboard/stats?tenantId=
   */
  getDashboardStats(): Observable<VendorDashboardStats> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const params = new HttpParams().set('tenantId', this.tenantId);

    return this.http.get<VendorDashboardStats>(`${this.baseUrl}/vendor-dashboard/stats`, { params })
      .pipe(
        tap(stats => {
          this.dashboardStatsSubject.next(stats);
          this.loadingSubject.next(false);
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to load dashboard stats');
          return throwError(() => err);
        })
      );
  }

  /**
   * Get recent vendor activity feed
   * No direct backend equivalent — returns empty stub
   */
  getRecentActivity(limit: number = 10): Observable<any[]> {
    return of([] as any[]);
  }

  // ============================================================
  // VENDOR CRUD OPERATIONS
  // ============================================================

  /**
   * Get all vendors with pagination and filtering
   * GET /vendors?tenantId=&page=&size=&status=&search=
   */
  getVendors(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: VendorStatus;
      tier?: VendorTier;
      riskLevel?: RiskLevel;
      search?: string;
      category?: string;
    }
  ): Observable<VendorListResponse> {
    this.loadingSubject.next(true);

    let params = new HttpParams()
      .set('tenantId', this.tenantId)
      .set('page', page.toString())
      .set('size', limit.toString());

    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.search) params = params.set('search', filters.search);
    }

    return this.http.get<VendorListResponse>(`${this.baseUrl}/vendors`, { params })
      .pipe(
        tap(response => {
          this.vendorsSubject.next(response.vendors);
          this.loadingSubject.next(false);
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to load vendors');
          return throwError(() => err);
        })
      );
  }

  /**
   * Get a single vendor by ID
   * GET /vendors/{id}
   */
  getVendorById(id: string): Observable<Vendor> {
    this.loadingSubject.next(true);

    return this.http.get<Vendor>(`${this.baseUrl}/vendors/${id}`)
      .pipe(
        tap(vendor => {
          this.selectedVendorSubject.next(vendor);
          this.loadingSubject.next(false);
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to load vendor');
          return throwError(() => err);
        })
      );
  }

  /**
   * Delete vendor — no backend DELETE endpoint; returns void stub
   */
  deleteVendor(id: string): Observable<void> {
    return of(void 0);
  }

  /**
   * Create / Onboard a new vendor
   * POST /vendors — maps onboarding data to VendorBusinessIdentityDTO (step 1)
   */
  onboardVendor(data: OnboardingData): Observable<OnboardingResult> {
    this.loadingSubject.next(true);

    const payload = {
      companyName: data.companyName,
      registrationNumber: data.registrationNumber,
      taxId: data.taxId,
      email: data.email,
      phone: data.phone,
      website: data.website ?? null,
      address: data.address,
      categories: data.categories,
      contacts: data.contacts,
      description: data.description ?? null,
      paymentTerms: data.paymentTerms ?? null,
      tenantId: this.tenantId
    };

    return this.http.post<OnboardingResult>(`${this.baseUrl}/vendors`, payload)
      .pipe(
        tap(() => {
          this.loadingSubject.next(false);
          this.getVendors(1, 20).subscribe();
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to onboard vendor');
          return throwError(() => err);
        })
      );
  }

  /**
   * Update vendor details
   * PUT /vendors/{id}/step1 — best approximation using VendorBusinessIdentityDTO
   */
  updateVendor(id: string, data: Partial<Vendor>): Observable<Vendor> {
    this.loadingSubject.next(true);

    return this.http.put<Vendor>(`${this.baseUrl}/vendors/${id}/step1`, data)
      .pipe(
        tap(vendor => {
          this.selectedVendorSubject.next(vendor);
          this.loadingSubject.next(false);
          this.updateVendorInList(vendor);
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to update vendor');
          return throwError(() => err);
        })
      );
  }

  /**
   * Offboard a vendor
   * PATCH /vendors/{id}/review with status=SUSPENDED or similar; falls back gracefully
   */
  offboardVendor(id: string, data: OffboardingData): Observable<any> {
    this.loadingSubject.next(true);

    const payload = {
      status: VendorStatus.SUSPENDED,
      rejectionReason: (data as any).reason ?? (data as any).offboardingReason ?? null
    };

    return this.http.patch(`${this.baseUrl}/vendors/${id}/review`, payload)
      .pipe(
        tap(() => {
          this.loadingSubject.next(false);
          this.getVendors(1, 20).subscribe();
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to offboard vendor');
          return throwError(() => err);
        })
      );
  }

  /**
   * Update vendor status
   * PATCH /vendors/{id}/review — body: { status, rejectionReason? }
   */
  updateVendorStatus(id: string, status: VendorStatus): Observable<Vendor> {
    return this.http.patch<Vendor>(`${this.baseUrl}/vendors/${id}/review`, { status })
      .pipe(
        tap(vendor => {
          this.selectedVendorSubject.next(vendor);
          this.updateVendorInList(vendor);
        }),
        catchError(err => {
          this.errorSubject.next('Failed to update vendor status');
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // PERFORMANCE
  // ============================================================

  /**
   * Get vendor performance metrics
   * GET /vendor-dashboard/performance?vendorId=
   */
  getVendorPerformance(vendorId: string): Observable<VendorPerformanceResponse> {
    const params = new HttpParams().set('vendorId', vendorId);
    return this.http.get<VendorPerformanceResponse>(`${this.baseUrl}/vendor-dashboard/performance`, { params })
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to load performance data');
          return throwError(() => err);
        })
      );
  }

  /**
   * Get vendor KPIs — no backend equivalent; returns empty stub
   */
  getVendorKPIs(vendorId: string): Observable<VendorKPI[]> {
    return of([] as any);
  }

  /**
   * Get performance trend data — no backend equivalent; returns empty stub
   */
  getPerformanceTrend(vendorId: string, period: 'monthly' | 'quarterly' = 'monthly'): Observable<any> {
    return of({} as any);
  }

  /**
   * Refresh AI-driven performance evaluation — no backend equivalent; returns empty stub
   */
  refreshAIPerformance(vendorId: string): Observable<any> {
    return of({} as any);
  }

  // ============================================================
  // RISK & COMPLIANCE
  // ============================================================

  /**
   * Get vendor risk profile — no backend equivalent; returns empty stub
   */
  getVendorRisk(vendorId: string): Observable<VendorRiskResponse> {
    return of({} as any);
  }

  /**
   * Get risk alerts — no backend equivalent; returns empty stub
   */
  getRiskAlerts(vendorId?: string): Observable<RiskAlert[]> {
    return of([] as any);
  }

  /**
   * Acknowledge / resolve a risk alert — no backend equivalent; returns empty stub
   */
  resolveRiskAlert(alertId: string, resolution: string): Observable<any> {
    return of({} as any);
  }

  /**
   * Initiate sanctions check — no backend equivalent; returns empty stub
   */
  initiateSanctionsCheck(vendorId: string): Observable<any> {
    return of({} as any);
  }

  // ============================================================
  // DOCUMENTS
  // ============================================================

  /**
   * Get vendor documents
   * GET /vendors/{vendorId}/documents
   */
  getVendorDocuments(vendorId: string): Observable<VendorDocument[]> {
    return this.http.get<VendorDocument[]>(`${this.baseUrl}/vendors/${vendorId}/documents`)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to load documents');
          return throwError(() => err);
        })
      );
  }

  /**
   * Upload vendor document
   * POST /vendors/{vendorId}/documents
   */
  uploadDocument(
    vendorId: string,
    file: File,
    category: DocumentCategory,
    issueDate: Date,
    expiryDate: Date
  ): Observable<VendorDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('issueDate', issueDate.toISOString());
    formData.append('expiryDate', expiryDate.toISOString());

    return this.http.post<VendorDocument>(`${this.baseUrl}/vendors/${vendorId}/documents`, formData)
      .pipe(
        tap(() => {
          this.getVendorDocuments(vendorId).subscribe();
        }),
        catchError(err => {
          this.errorSubject.next('Failed to upload document');
          return throwError(() => err);
        })
      );
  }

  /**
   * Verify vendor document
   * PATCH /vendors/documents/{docId}/status — body: { status, notes? }
   */
  verifyDocument(documentId: string, verified: boolean, notes?: string): Observable<any> {
    const payload: any = {
      status: verified ? DocumentStatus.ACTIVE : DocumentStatus.REJECTED
    };
    if (notes) payload.notes = notes;

    return this.http.patch(`${this.baseUrl}/vendors/documents/${documentId}/status`, payload)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to verify document');
          return throwError(() => err);
        })
      );
  }

  /**
   * Delete vendor document
   * DELETE /vendors/documents/{docId}
   */
  deleteDocument(documentId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/vendors/documents/${documentId}`)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to delete document');
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // AI & PREDICTIVE (no backend equivalent — stubs)
  // ============================================================

  /** Get vendor ranking/score — no backend equivalent; returns empty stub */
  getVendorRanking(vendorId: string): Observable<VendorRankingData> {
    return of({} as any);
  }

  /** Get AI predictions for vendor — no backend equivalent; returns empty stub */
  getVendorPredictions(vendorId: string): Observable<VendorPrediction[]> {
    return of([] as any);
  }

  /** Get anomaly detections — no backend equivalent; returns empty stub */
  getAnomalies(vendorId?: string): Observable<AnomalyDetection[]> {
    return of([] as any);
  }

  /** Acknowledge anomaly detection — no backend equivalent; returns empty stub */
  acknowledgeAnomaly(anomalyId: string): Observable<any> {
    return of({} as any);
  }

  // ============================================================
  // LIFECYCLE (no backend equivalent — stub)
  // ============================================================

  /** Get vendor lifecycle history — no backend equivalent; returns empty stub */
  getLifecycleHistory(vendorId: string): Observable<VendorLifecycleHistory[]> {
    return of([] as any);
  }

  // ============================================================
  // CONTRACTS (no backend equivalent — stubs)
  // ============================================================

  /** Get vendor contracts — no backend equivalent; returns empty stub */
  getVendorContracts(vendorId: string): Observable<VendorContract[]> {
    return of([] as any);
  }

  /** Create contract for vendor — no backend equivalent; returns empty stub */
  createContract(vendorId: string, contract: Partial<VendorContract>): Observable<VendorContract> {
    return of({} as any);
  }

  // ============================================================
  // MESSAGING (no backend equivalent — stubs)
  // ============================================================

  /** Get vendor messages — no backend equivalent; returns empty stub */
  getVendorMessages(vendorId: string): Observable<VendorMessage[]> {
    return of([] as any);
  }

  /** Send message to vendor — no backend equivalent; returns empty stub */
  sendMessage(vendorId: string, message: Partial<VendorMessage>): Observable<VendorMessage> {
    return of({} as any);
  }

  /**
   * Mark message as read — no backend equivalent; returns empty stub
   */
  markMessageRead(messageId: string): Observable<any> {
    return of({} as any);
  }

  // ============================================================
  // DISPUTES (no backend equivalent — stubs)
  // ============================================================

  /** Get disputes for vendor — no backend equivalent; returns empty stub */
  getDisputes(vendorId?: string): Observable<Dispute[]> {
    return of([] as any);
  }

  /** Create dispute — no backend equivalent; returns empty stub */
  createDispute(vendorId: string, dispute: Partial<Dispute>): Observable<Dispute> {
    return of({} as any);
  }

  /** Resolve dispute — no backend equivalent; returns empty stub */
  resolveDispute(disputeId: string, resolution: string): Observable<any> {
    return of({} as any);
  }

  // ============================================================
  // EXPORT / REPORT
  // ============================================================

  /**
   * Export vendor list to CSV/Excel
   */
  exportVendors(filters?: any): Observable<Blob> {
    let params = new HttpParams().set('tenantId', this.tenantId);

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }

    return this.http.get(`${this.baseUrl}/vendors/export`, {
      params,
      responseType: 'blob'
    });
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private updateVendorInList(vendor: Vendor): void {
    const current = this.vendorsSubject.getValue();
    const index = current.findIndex(v => v.id === vendor.id);
    if (index !== -1) {
      current[index] = vendor;
      this.vendorsSubject.next([...current]);
    }
  }

  // ============================================================
  // CLEAR STATE
  // ============================================================

  clearState(): void {
    this.vendorsSubject.next([]);
    this.selectedVendorSubject.next(null);
    this.dashboardStatsSubject.next(null);
    this.loadingSubject.next(false);
    this.errorSubject.next(null);
  }
}

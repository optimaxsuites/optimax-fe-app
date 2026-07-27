import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, tap, catchError, delay, shareReplay } from 'rxjs/operators';
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

// ============================================================
// ENVIRONMENT CONFIG (would normally come from environment.ts)
// ============================================================

const API_BASE = '/api/vendor-management'; // Replace with actual base URL

// ============================================================
// MOCK FALLBACK DATA
// ============================================================

const MOCK_TOP_PERFORMERS: Vendor[] = [
  {
    id: 'v-101',
    companyName: 'Apex Industrial Supplies Ltd',
    registrationNumber: 'RC-994821',
    taxId: 'TIN-8849201',
    email: 'contact@apexindustrial.com',
    phone: '+234 803 123 4567',
    website: 'https://apexindustrial.com',
    address: { street: '12 Commercial Avenue', city: 'Ikeja', state: 'Lagos', country: 'Nigeria', postalCode: '100001' },
    status: VendorStatus.ACTIVE,
    tier: VendorTier.PREFERRED,
    riskLevel: RiskLevel.LOW,
    performanceScore: 96.5,
    totalProjects: 34,
    winRate: 88,
    averageRating: 4.9,
    joinedDate: new Date('2024-03-15'),
    lastActivityDate: new Date(),
    categories: ['Industrial Equipment', 'Safety Gear'],
    contacts: [],
    documents: [],
    complianceStatus: { isCompliant: true, documentsVerified: 5, totalRequiredDocuments: 5, expiredDocuments: 0, expiringDocuments: 0, lastComplianceCheck: new Date(), sanctionsClear: true },
    performanceMetrics: { overallScore: 96.5, onTimeDeliveryRate: 98, qualityScore: 95, costCompetitiveness: 94, complianceScore: 100, ratingScore: 98, winRate: 88, totalProjects: 34, totalRevenue: 14500000, averageOrderValue: 426470, lastUpdated: new Date(), trendData: [] },
    lifecycleHistory: [],
    riskAlerts: [],
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date()
  },
  {
    id: 'v-102',
    companyName: 'Global Tech Solutions PLC',
    registrationNumber: 'RC-847291',
    taxId: 'TIN-4720193',
    email: 'info@globaltech.ng',
    phone: '+234 802 987 6543',
    website: 'https://globaltech.ng',
    address: { street: '45 Marina Street', city: 'Lagos Island', state: 'Lagos', country: 'Nigeria', postalCode: '100002' },
    status: VendorStatus.ACTIVE,
    tier: VendorTier.PREFERRED,
    riskLevel: RiskLevel.LOW,
    performanceScore: 92.0,
    totalProjects: 28,
    winRate: 82,
    averageRating: 4.7,
    joinedDate: new Date('2024-06-10'),
    lastActivityDate: new Date(),
    categories: ['Technology/IT', 'Telecommunications'],
    contacts: [],
    documents: [],
    complianceStatus: { isCompliant: true, documentsVerified: 4, totalRequiredDocuments: 4, expiredDocuments: 0, expiringDocuments: 0, lastComplianceCheck: new Date(), sanctionsClear: true },
    performanceMetrics: { overallScore: 92.0, onTimeDeliveryRate: 94, qualityScore: 91, costCompetitiveness: 90, complianceScore: 98, ratingScore: 94, winRate: 82, totalProjects: 28, totalRevenue: 22800000, averageOrderValue: 814285, lastUpdated: new Date(), trendData: [] },
    lifecycleHistory: [],
    riskAlerts: [],
    createdAt: new Date('2024-06-10'),
    updatedAt: new Date()
  },
  {
    id: 'v-103',
    companyName: 'Prime Logistics & Freight Services',
    registrationNumber: 'RC-392019',
    taxId: 'TIN-3920194',
    email: 'operations@primelogistics.com',
    phone: '+234 805 444 3322',
    website: 'https://primelogistics.com',
    address: { street: '8 Wharf Road', city: 'Apapa', state: 'Lagos', country: 'Nigeria', postalCode: '100003' },
    status: VendorStatus.ACTIVE,
    tier: VendorTier.APPROVED,
    riskLevel: RiskLevel.LOW,
    performanceScore: 89.2,
    totalProjects: 45,
    winRate: 79,
    averageRating: 4.5,
    joinedDate: new Date('2024-01-20'),
    lastActivityDate: new Date(),
    categories: ['Logistics/Transport'],
    contacts: [],
    documents: [],
    complianceStatus: { isCompliant: true, documentsVerified: 4, totalRequiredDocuments: 4, expiredDocuments: 0, expiringDocuments: 0, lastComplianceCheck: new Date(), sanctionsClear: true },
    performanceMetrics: { overallScore: 89.2, onTimeDeliveryRate: 91, qualityScore: 88, costCompetitiveness: 89, complianceScore: 95, ratingScore: 90, winRate: 79, totalProjects: 45, totalRevenue: 31200000, averageOrderValue: 693333, lastUpdated: new Date(), trendData: [] },
    lifecycleHistory: [],
    riskAlerts: [],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date()
  },
  {
    id: 'v-104',
    companyName: 'OmniCorp Facilities Ltd',
    registrationNumber: 'RC-582910',
    taxId: 'TIN-9812743',
    email: 'support@omnicorp.ng',
    phone: '+234 818 222 1100',
    website: 'https://omnicorp.ng',
    address: { street: '19 Victoria Island Way', city: 'Victoria Island', state: 'Lagos', country: 'Nigeria', postalCode: '100004' },
    status: VendorStatus.UNDER_REVIEW,
    tier: VendorTier.CONDITIONAL,
    riskLevel: RiskLevel.MEDIUM,
    performanceScore: 74.8,
    totalProjects: 12,
    winRate: 65,
    averageRating: 3.8,
    joinedDate: new Date('2024-09-01'),
    lastActivityDate: new Date(),
    categories: ['Facilities Management', 'Maintenance'],
    contacts: [],
    documents: [],
    complianceStatus: { isCompliant: false, documentsVerified: 2, totalRequiredDocuments: 4, expiredDocuments: 1, expiringDocuments: 1, lastComplianceCheck: new Date(), sanctionsClear: true },
    performanceMetrics: { overallScore: 74.8, onTimeDeliveryRate: 78, qualityScore: 72, costCompetitiveness: 75, complianceScore: 70, ratingScore: 76, winRate: 65, totalProjects: 12, totalRevenue: 6800000, averageOrderValue: 566666, lastUpdated: new Date(), trendData: [] },
    lifecycleHistory: [],
    riskAlerts: [],
    createdAt: new Date('2024-09-01'),
    updatedAt: new Date()
  },
  {
    id: 'v-105',
    companyName: 'Vanguard Security Services',
    registrationNumber: 'RC-204918',
    taxId: 'TIN-1092837',
    email: 'info@vanguardsecurity.com',
    phone: '+234 809 333 4455',
    website: 'https://vanguardsecurity.com',
    address: { street: '100 Allen Avenue', city: 'Ikeja', state: 'Lagos', country: 'Nigeria', postalCode: '100005' },
    status: VendorStatus.SUSPENDED,
    tier: VendorTier.APPROVED,
    riskLevel: RiskLevel.HIGH,
    performanceScore: 61.2,
    totalProjects: 19,
    winRate: 58,
    averageRating: 3.2,
    joinedDate: new Date('2023-11-10'),
    lastActivityDate: new Date(),
    categories: ['Security', 'Surveillance'],
    contacts: [],
    documents: [],
    complianceStatus: { isCompliant: false, documentsVerified: 1, totalRequiredDocuments: 4, expiredDocuments: 2, expiringDocuments: 1, lastComplianceCheck: new Date(), sanctionsClear: false },
    performanceMetrics: { overallScore: 61.2, onTimeDeliveryRate: 60, qualityScore: 65, costCompetitiveness: 68, complianceScore: 50, ratingScore: 62, winRate: 58, totalProjects: 19, totalRevenue: 12400000, averageOrderValue: 652631, lastUpdated: new Date(), trendData: [] },
    lifecycleHistory: [],
    riskAlerts: [],
    createdAt: new Date('2023-11-10'),
    updatedAt: new Date()
  }
];

const MOCK_ACTIVITIES: VendorRecentActivity[] = [
  {
    id: 'act-1',
    vendorId: 'v-101',
    vendorName: 'Apex Industrial Supplies Ltd',
    event: 'Quotation Submitted',
    description: 'Submitted quotation for RFQ-2026-089 (₦4.5M)',
    timestamp: new Date(Date.now() - 25 * 60 * 1000),
    type: 'ORDER',
    icon: 'file-invoice-dollar',
    color: '#2EB270'
  },
  {
    id: 'act-2',
    vendorId: 'v-104',
    vendorName: 'OmniCorp Facilities',
    event: 'Onboarding Application',
    description: 'New vendor registration submitted, awaiting compliance review',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000),
    type: 'ONBOARDING',
    icon: 'user-plus',
    color: '#F59E0B'
  },
  {
    id: 'act-3',
    vendorId: 'v-102',
    vendorName: 'Global Tech Solutions PLC',
    event: 'Tax Certificate Uploaded',
    description: 'Updated annual Tax Clearance Certificate 2026',
    timestamp: new Date(Date.now() - 5 * 3600 * 1000),
    type: 'DOCUMENT',
    icon: 'file-alt',
    color: '#2E6276'
  },
  {
    id: 'act-4',
    vendorId: 'v-105',
    vendorName: 'Vanguard Security Services',
    event: 'Risk Alert Flagged',
    description: 'License expiry date within 7 days notification triggered',
    timestamp: new Date(Date.now() - 12 * 3600 * 1000),
    type: 'RISK',
    icon: 'exclamation-triangle',
    color: '#DC2626'
  }
];

const MOCK_EXPIRING_DOCUMENTS: VendorDocument[] = [
  {
    id: 'doc-1',
    category: DocumentCategory.TAX,
    name: 'Tax Clearance Certificate 2025',
    fileName: 'tax_clearance_2025.pdf',
    fileUrl: '/assets/docs/tax.pdf',
    fileSize: 1024000,
    fileType: 'application/pdf',
    issueDate: new Date('2025-01-01'),
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    status: DocumentStatus.EXPIRING_SOON,
    isRequired: true,
    daysUntilExpiry: 5,
    uploadedAt: new Date('2025-01-02'),
    uploadedBy: 'Vendor Admin'
  },
  {
    id: 'doc-2',
    category: DocumentCategory.INSURANCE,
    name: 'Public Liability Insurance Policy',
    fileName: 'insurance_policy.pdf',
    fileUrl: '/assets/docs/insurance.pdf',
    fileSize: 2048000,
    fileType: 'application/pdf',
    issueDate: new Date('2025-02-01'),
    expiryDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
    status: DocumentStatus.EXPIRING_SOON,
    isRequired: true,
    daysUntilExpiry: 18,
    uploadedAt: new Date('2025-02-02'),
    uploadedBy: 'Vendor Admin'
  }
];

// ============================================================
// VENDOR SERVICE
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class VendorService {

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
   */
  getDashboardStats(): Observable<VendorDashboardStats> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.get<VendorDashboardStats>(`${API_BASE}/dashboard/stats`)
      .pipe(
        tap(stats => {
          this.dashboardStatsSubject.next(stats);
          this.loadingSubject.next(false);
        }),
        catchError(_err => {
          this.loadingSubject.next(false);
          const mockStats: VendorDashboardStats = {
            totalVendors: 48,
            activeVendors: 36,
            pendingOnboarding: 7,
            pendingReview: 3,
            highRiskVendors: 2,
            expiringDocuments: 4,
            averagePerformanceScore: 88.4,
            vendorsByTier: {
              preferred: 14,
              approved: 28,
              conditional: 6
            },
            recentActivity: MOCK_ACTIVITIES,
            expiringDocumentsList: MOCK_EXPIRING_DOCUMENTS,
            topPerformers: MOCK_TOP_PERFORMERS,
            riskAlertsCount: 3,
            monthOverMonthGrowth: 12.5
          };
          this.dashboardStatsSubject.next(mockStats);
          return of(mockStats);
        })
      );
  }

  /**
   * Get recent vendor activity feed
   */
  getRecentActivity(limit: number = 10): Observable<any[]> {
    return this.http.get<any[]>(`${API_BASE}/dashboard/activity`, {
      params: new HttpParams().set('limit', limit.toString())
    }).pipe(
      catchError(() => of(MOCK_ACTIVITIES.slice(0, limit)))
    );
  }

  // ============================================================
  // VENDOR CRUD OPERATIONS
  // ============================================================

  /**
   * Get all vendors with pagination and filtering
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
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.tier) params = params.set('tier', filters.tier);
      if (filters.riskLevel) params = params.set('riskLevel', filters.riskLevel);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.category) params = params.set('category', filters.category);
    }

    return this.http.get<VendorListResponse>(`${API_BASE}/vendors`, { params })
      .pipe(
        tap(response => {
          this.vendorsSubject.next(response.vendors);
          this.loadingSubject.next(false);
        }),
        catchError(_err => {
          this.loadingSubject.next(false);
          const response: VendorListResponse = {
            vendors: MOCK_TOP_PERFORMERS,
            total: MOCK_TOP_PERFORMERS.length,
            page: 1,
            limit: 20,
            totalPages: 1
          };
          this.vendorsSubject.next(response.vendors);
          return of(response);
        })
      );
  }

  /**
   * Get a single vendor by ID
   */
  getVendorById(id: string): Observable<Vendor> {
    this.loadingSubject.next(true);

    return this.http.get<Vendor>(`${API_BASE}/vendors/${id}`)
      .pipe(
        tap(vendor => {
          this.selectedVendorSubject.next(vendor);
          this.loadingSubject.next(false);
        }),
        catchError(_err => {
          this.loadingSubject.next(false);
          const found = MOCK_TOP_PERFORMERS.find(v => v.id === id) || MOCK_TOP_PERFORMERS[0];
          this.selectedVendorSubject.next(found);
          return of(found);
        })
      );
  }

  deleteVendor(id: string): Observable<void> {
    this.loadingSubject.next(true);
    return this.http.delete<void>(`${API_BASE}/vendors/${id}`).pipe(
      tap(() => {
        this.loadingSubject.next(false);
      }),
      catchError(() => {
        this.loadingSubject.next(false);
        return of(void 0);
      })
    );
  }

  /**
   * Create/Onboard a new vendor
   */
  onboardVendor(data: OnboardingData): Observable<OnboardingResult> {
    this.loadingSubject.next(true);

    const formData = this.buildOnboardingFormData(data);

    return this.http.post<OnboardingResult>(`${API_BASE}/vendors/onboard`, formData)
      .pipe(
        tap(result => {
          this.loadingSubject.next(false);
          // Refresh vendor list
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
   */
  updateVendor(id: string, data: Partial<Vendor>): Observable<Vendor> {
    this.loadingSubject.next(true);

    return this.http.put<Vendor>(`${API_BASE}/vendors/${id}`, data)
      .pipe(
        tap(vendor => {
          this.selectedVendorSubject.next(vendor);
          this.loadingSubject.next(false);
          // Update in list
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
   */
  offboardVendor(id: string, data: OffboardingData): Observable<any> {
    this.loadingSubject.next(true);

    return this.http.post(`${API_BASE}/vendors/${id}/offboard`, data)
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
   */
  updateVendorStatus(id: string, status: VendorStatus): Observable<Vendor> {
    return this.http.patch<Vendor>(`${API_BASE}/vendors/${id}/status`, { status })
      .pipe(
        tap(vendor => {
          this.selectedVendorSubject.next(vendor);
          this.updateVendorInList(vendor);
        })
      );
  }

  // ============================================================
  // PERFORMANCE
  // ============================================================

  /**
   * Get vendor performance metrics
   */
  getVendorPerformance(vendorId: string): Observable<VendorPerformanceResponse> {
    return this.http.get<VendorPerformanceResponse>(`${API_BASE}/vendors/${vendorId}/performance`)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to load performance data');
          return throwError(() => err);
        })
      );
  }

  /**
   * Get vendor KPIs for dashboard
   */
  getVendorKPIs(vendorId: string): Observable<VendorKPI[]> {
    return this.http.get<VendorKPI[]>(`${API_BASE}/vendors/${vendorId}/kpis`)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to load KPIs');
          return throwError(() => err);
        })
      );
  }

  /**
   * Get performance trend data
   */
  getPerformanceTrend(vendorId: string, period: 'monthly' | 'quarterly' = 'monthly'): Observable<any> {
    return this.http.get(`${API_BASE}/vendors/${vendorId}/performance/trend`, {
      params: new HttpParams().set('period', period)
    });
  }

  /**
   * Refresh AI-driven performance evaluation
   */
  refreshAIPerformance(vendorId: string): Observable<any> {
    return this.http.post(`${API_BASE}/vendors/${vendorId}/performance/refresh-ai`, {})
      .pipe(
        tap(() => {
          // Re-fetch performance after refresh
          this.getVendorPerformance(vendorId).subscribe();
        })
      );
  }

  // ============================================================
  // RISK & COMPLIANCE
  // ============================================================

  /**
   * Get vendor risk profile
   */
  getVendorRisk(vendorId: string): Observable<VendorRiskResponse> {
    return this.http.get<VendorRiskResponse>(`${API_BASE}/vendors/${vendorId}/risk`)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to load risk data');
          return throwError(() => err);
        })
      );
  }

  /**
   * Get risk alerts
   */
  getRiskAlerts(vendorId?: string): Observable<RiskAlert[]> {
    const url = vendorId
      ? `${API_BASE}/vendors/${vendorId}/risk/alerts`
      : `${API_BASE}/risk/alerts`;

    return this.http.get<RiskAlert[]>(url)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to load risk alerts');
          return throwError(() => err);
        })
      );
  }

  /**
   * Acknowledge/resolve a risk alert
   */
  resolveRiskAlert(alertId: string, resolution: string): Observable<any> {
    return this.http.post(`${API_BASE}/risk/alerts/${alertId}/resolve`, { resolution })
      .pipe(
        tap(() => {
          // Refresh alerts
          this.getRiskAlerts().subscribe();
        })
      );
  }

  /**
   * Initiate sanctions check
   */
  initiateSanctionsCheck(vendorId: string): Observable<any> {
    return this.http.post(`${API_BASE}/vendors/${vendorId}/risk/sanctions-check`, {})
      .pipe(
        tap(() => {
          // Refresh risk profile
          this.getVendorRisk(vendorId).subscribe();
        })
      );
  }

  // ============================================================
  // DOCUMENTS
  // ============================================================

  /**
   * Get vendor documents
   */
  getVendorDocuments(vendorId: string): Observable<VendorDocument[]> {
    return this.http.get<VendorDocument[]>(`${API_BASE}/vendors/${vendorId}/documents`)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to load documents');
          return throwError(() => err);
        })
      );
  }

  /**
   * Upload vendor document
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

    return this.http.post<VendorDocument>(`${API_BASE}/vendors/${vendorId}/documents`, formData)
      .pipe(
        tap(() => {
          // Refresh documents
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
   */
  verifyDocument(documentId: string, verified: boolean, notes?: string): Observable<any> {
    return this.http.post(`${API_BASE}/documents/${documentId}/verify`, { verified, notes })
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to verify document');
          return throwError(() => err);
        })
      );
  }

  /**
   * Delete vendor document
   */
  deleteDocument(documentId: string): Observable<any> {
    return this.http.delete(`${API_BASE}/documents/${documentId}`)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to delete document');
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // AI & PREDICTIVE
  // ============================================================

  /**
   * Get vendor ranking/score
   */
  getVendorRanking(vendorId: string): Observable<VendorRankingData> {
    return this.http.get<VendorRankingData>(`${API_BASE}/ai/ranking/${vendorId}`)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to load ranking data');
          return throwError(() => err);
        })
      );
  }

  /**
   * Get AI predictions for vendor
   */
  getVendorPredictions(vendorId: string): Observable<VendorPrediction[]> {
    return this.http.get<VendorPrediction[]>(`${API_BASE}/ai/predictions/${vendorId}`)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to load predictions');
          return throwError(() => err);
        })
      );
  }

  /**
   * Get anomaly detections
   */
  getAnomalies(vendorId?: string): Observable<AnomalyDetection[]> {
    const url = vendorId
      ? `${API_BASE}/ai/anomalies/${vendorId}`
      : `${API_BASE}/ai/anomalies`;

    return this.http.get<AnomalyDetection[]>(url)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to load anomalies');
          return throwError(() => err);
        })
      );
  }

  /**
   * Acknowledge anomaly detection
   */
  acknowledgeAnomaly(anomalyId: string): Observable<any> {
    return this.http.post(`${API_BASE}/ai/anomalies/${anomalyId}/acknowledge`, {})
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to acknowledge anomaly');
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  /**
   * Get vendor lifecycle history
   */
  getLifecycleHistory(vendorId: string): Observable<VendorLifecycleHistory[]> {
    return this.http.get<VendorLifecycleHistory[]>(`${API_BASE}/vendors/${vendorId}/lifecycle`)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to load lifecycle history');
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // CONTRACTS
  // ============================================================

  /**
   * Get vendor contracts
   */
  getVendorContracts(vendorId: string): Observable<VendorContract[]> {
    return this.http.get<VendorContract[]>(`${API_BASE}/vendors/${vendorId}/contracts`)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to load contracts');
          return throwError(() => err);
        })
      );
  }

  /**
   * Create contract for vendor
   */
  createContract(vendorId: string, contract: Partial<VendorContract>): Observable<VendorContract> {
    return this.http.post<VendorContract>(`${API_BASE}/vendors/${vendorId}/contracts`, contract)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to create contract');
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // MESSAGING
  // ============================================================

  /**
   * Get vendor messages
   */
  getVendorMessages(vendorId: string): Observable<VendorMessage[]> {
    return this.http.get<VendorMessage[]>(`${API_BASE}/vendors/${vendorId}/messages`)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to load messages');
          return throwError(() => err);
        })
      );
  }

  /**
   * Send message to vendor
   */
  sendMessage(vendorId: string, message: Partial<VendorMessage>): Observable<VendorMessage> {
    return this.http.post<VendorMessage>(`${API_BASE}/vendors/${vendorId}/messages`, message)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to send message');
          return throwError(() => err);
        })
      );
  }

  /**
   * Mark message as read
   */
  markMessageRead(messageId: string): Observable<any> {
    return this.http.post(`${API_BASE}/messages/${messageId}/read`, {})
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to mark message as read');
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // DISPUTES
  // ============================================================

  /**
   * Get disputes for vendor
   */
  getDisputes(vendorId?: string): Observable<Dispute[]> {
    const url = vendorId
      ? `${API_BASE}/vendors/${vendorId}/disputes`
      : `${API_BASE}/disputes`;

    return this.http.get<Dispute[]>(url)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to load disputes');
          return throwError(() => err);
        })
      );
  }

  /**
   * Create dispute
   */
  createDispute(vendorId: string, dispute: Partial<Dispute>): Observable<Dispute> {
    return this.http.post<Dispute>(`${API_BASE}/vendors/${vendorId}/disputes`, dispute)
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to create dispute');
          return throwError(() => err);
        })
      );
  }

  /**
   * Resolve dispute
   */
  resolveDispute(disputeId: string, resolution: string): Observable<any> {
    return this.http.post(`${API_BASE}/disputes/${disputeId}/resolve`, { resolution })
      .pipe(
        catchError(err => {
          this.errorSubject.next('Failed to resolve dispute');
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // EXPORT/REPORT
  // ============================================================

  /**
   * Export vendor list to CSV/Excel
   */
  exportVendors(filters?: any): Observable<Blob> {
    let params = new HttpParams();

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }

    return this.http.get(`${API_BASE}/vendors/export`, {
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

  private buildOnboardingFormData(data: OnboardingData): FormData {
    const formData = new FormData();

    // Text fields
    formData.append('companyName', data.companyName);
    formData.append('registrationNumber', data.registrationNumber);
    formData.append('taxId', data.taxId);
    formData.append('email', data.email);
    formData.append('phone', data.phone);
    formData.append('address', JSON.stringify(data.address));
    formData.append('bankDetails', JSON.stringify(data.bankDetails));
    formData.append('categories', JSON.stringify(data.categories));
    formData.append('contacts', JSON.stringify(data.contacts));

    if (data.paymentTerms) formData.append('paymentTerms', data.paymentTerms);
    if (data.description) formData.append('description', data.description);
    if (data.website) formData.append('website', data.website);

    // Documents
    data.documents.forEach((doc, index) => {
      formData.append(`documents[${index}].file`, doc.file);
      formData.append(`documents[${index}].category`, doc.category);
      formData.append(`documents[${index}].fileName`, doc.fileName);
      formData.append(`documents[${index}].issueDate`, doc.issueDate.toISOString());
      formData.append(`documents[${index}].expiryDate`, doc.expiryDate.toISOString());
    });

    return formData;
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
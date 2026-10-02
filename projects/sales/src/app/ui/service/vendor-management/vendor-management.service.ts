// vendor-management.service.ts
// ============================================================
// IMPORTS
// ============================================================

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpEventType, HttpResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError, forkJoin } from 'rxjs';
import { map, tap, catchError, filter } from 'rxjs/operators';
import {
  Vendor,
  VendorDashboardStats,
  VendorListResponse,
  VendorPerformanceMetrics,
  VendorPerformanceResponse,
  VendorDocument,
  DocumentUploadEvent,
  VendorKPI,
  RiskAlert,
  OnboardingData,
  OnboardingResult,
  OffboardingData,
  VendorRankingData,
  VendorPrediction,
  AnomalyDetection,
  VendorMessage,
  Dispute,
  VendorLifecycleHistory,
  VendorLifecycleEvent,
  VendorRecentActivity,
  VendorStatus,
  VendorTier,
  RiskLevel,
  DocumentCategory,
  DocumentStatus,
  SentinelInsight,
  InsightType,
  InsightSeverity,
  InsightActionStatus,
  VendorRiskTrajectory,
  FraudFlag,
  OnboardingCopilotSession,
  ExtractedField,
  SentinelSummaryStats,
  AlertSeverity
} from '../../domain/vendor-management/vendor-management.dto';
import { VendorRegistration } from '../../domain/vendor-portal/vendor-registration.dto';
import { environment } from '../../shared-component/service/environments/environment';

const API_BASE = environment.apiBaseUrl;

function parseSafeDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num)) {
      val = num;
    }
  }
  if (typeof val === 'number') {
    return new Date(val < 10000000000 ? val * 1000 : val);
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}
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

  // Every other service in this app (sales, procurement, inventory, logistics, ...) derives the
  // tenant from the subdomain the app is running on, falling back to 'optimax' only for local dev.
  // This one hardcoded the fallback unconditionally, so a tenant deployed on a different subdomain
  // would still tag its onboarded vendors with tenantId 'optimax'.
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

  constructor(private http: HttpClient) {
    // One-time cleanup of data written by the removed offline fallbacks:
    //  - erp_tenant_vendor_approvals: a per-browser status override that was saved even when an
    //    approve/suspend FAILED and then overrode the backend's real status on every list load;
    //  - erp_pending_vendors: locally "submitted" registrations (never seen by the backend), stored in
    //    plaintext with bank account, TIN and CAC numbers.
    try {
      localStorage.removeItem('erp_tenant_vendor_approvals');
      localStorage.removeItem('erp_pending_vendors');
    } catch { /* storage unavailable */ }
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  getDashboardStats(): Observable<VendorDashboardStats> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.get<VendorDashboardStats>(`${this.baseUrl}/vendor-management/dashboard/stats`)
      .pipe(
        tap(stats => {
          this.dashboardStatsSubject.next(stats);
          this.loadingSubject.next(false);
        }),
        // Errors propagate. This used to substitute MOCK_DASHBOARD_STATS (145 vendors, 92.5% average
        // score, fake recent activity and top performers) and emit it as the real stats.
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to load vendor dashboard');
          return throwError(() => err);
        })
      );
  }

  getRecentActivity(limit: number = 10): Observable<any[]> {
    return of([] as any[]);
  }

  // ============================================================
  // FIELD MAPPING — normalises raw API response to Vendor interface
  // ============================================================

  private mapVendor(raw: any): Vendor {
    const performanceScore = raw.performanceScore ?? raw.performance_score ?? raw.score ?? 0;
    const totalProjects = raw.totalProjects ?? raw.total_projects ?? raw.projectCount ?? raw.step5?.completedProjectsCount ?? 0;
    // The backend sometimes echoes the raw 6-step registration payload
    // (POST /vendors -> PUT .../step2..step6) instead of a flattened vendor
    // summary. Fall back to those nested step fields so a vendor's name,
    // contact and address info still show up on the list/detail pages.
    const s1 = raw.step1 ?? {};
    const s2 = raw.step2 ?? {};
    const s3 = raw.step3 ?? {};
    const s4 = raw.step4 ?? {};
    const s5 = raw.step5 ?? {};
    const s6 = raw.step6 ?? {};

    const status = (() => {
      const s = raw.status || raw.vendorStatus;
      return (s === 'DRAFT' || !s) ? VendorStatus.PENDING_ONBOARDING : s as VendorStatus;
    })();
    // A vendor that hasn't cleared the approval queue yet has NOT been assessed — defaulting an absent
    // tier/risk/compliance to APPROVED/LOW/"compliant" presented every unreviewed application (and every
    // one the backend simply omitted these fields for) as already vetted and low-risk to whoever was
    // looking, including the reviewer deciding whether to approve it. CONDITIONAL/MEDIUM/"not yet
    // checked" are the closest the existing enums get to "unknown" — used only while unreviewed; an
    // approved vendor with a real omitted field still falls back to the previous APPROVED/LOW defaults.
    const isUnreviewed = status === VendorStatus.PENDING_ONBOARDING || status === VendorStatus.UNDER_REVIEW;

    return {
      id: raw.id || raw._id || raw.vendorId || '',
      companyName: raw.companyName || raw.company_name || raw.name || raw.company || s1.businessName || `Pending Registration (ID: ${raw.id || 'N/A'})`,
      registrationNumber: raw.registrationNumber || raw.registration_number || raw.regNumber || raw.rc_number || s2.cacRegistrationNumber || 'Pending',
      taxId: raw.taxId || raw.tax_id || raw.tin || raw.taxNumber || s2.tinNumber || 'Pending',
      email: raw.email || raw.emailAddress || raw.email_address || s3.primaryContactEmail || 'Pending',
      phone: raw.phone || raw.phoneNumber || raw.phone_number || raw.mobile || s3.primaryContactPhone || 'Pending',
      website: raw.website || raw.websiteUrl || raw.web_site || s1.websiteUrl || undefined,
      address: raw.address || (s3.registeredAddressLine1 ? {
        street: s3.registeredAddressLine1 || '',
        city: s3.registeredCity || '',
        state: s3.registeredState || '',
        country: s3.registeredCountry || 'Nigeria',
        postalCode: s3.registeredPostalCode || ''
      } : { street: '', city: '', state: '', country: 'Nigeria', postalCode: '' }),
      status,
      tier: (raw.tier || raw.vendorTier || (isUnreviewed ? VendorTier.CONDITIONAL : VendorTier.APPROVED)) as VendorTier,
      riskLevel: (raw.riskLevel || raw.risk_level || raw.risk || (isUnreviewed ? RiskLevel.MEDIUM : RiskLevel.LOW)) as RiskLevel,
      performanceScore,
      totalProjects,
      winRate: raw.winRate ?? raw.win_rate ?? 0,
      averageRating: raw.averageRating ?? raw.average_rating ?? raw.rating ?? 0,
      joinedDate: parseSafeDate(raw.joinedDate || raw.createdAt),
      lastActivityDate: parseSafeDate(raw.lastActivityDate || raw.updatedAt),
      categories: Array.isArray(raw.categories) ? raw.categories
        : (Array.isArray(s5.supplyCategories) ? s5.supplyCategories.map((c: string) => c.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())) : []),
      logo: raw.logo || raw.logoUrl || undefined,
      description: raw.description || s1.businessDescription || '',
      paymentTerms: raw.paymentTerms || raw.payment_terms || s4.preferredPaymentTerms || 'Net 30',
      bankDetails: raw.bankDetails || raw.bank_details || (s4.primaryBankName ? {
        bankName: s4.primaryBankName || '',
        accountNumber: s4.primaryAccountNumber || '',
        accountName: s4.primaryAccountName || '',
        accountType: s4.primaryAccountType || 'current',
        sortCode: s4.primarySortCode || '',
        swiftCode: s4.primarySwiftCode || '',
        currency: s4.primaryCurrency || 'NGN',
        bankBranch: s4.primaryBankBranch || '',
        isPrimary: true
      } : undefined),
      // VendorContact requires a numeric `id` and a `role` field — this fallback previously built a
      // string id (`c-${raw.id}`, violating the type) and a `title` field the Overview template never
      // reads (it renders `contact.role`), so the primary contact's role always showed blank.
      contacts: Array.isArray(raw.contacts) ? raw.contacts : (s3.primaryContactName ? [{
        id: Number(raw.id) || 0,
        name: s3.primaryContactName || '',
        role: s3.primaryContactTitle || '',
        email: s3.primaryContactEmail || '',
        phone: s3.primaryContactPhone || '',
        isPrimary: true
      }] : []),
      documents: Array.isArray(raw.documents) ? raw.documents : [],
      complianceStatus: raw.complianceStatus || raw.compliance_status || (isUnreviewed ? {
        isCompliant: false, documentsVerified: 0, totalRequiredDocuments: 0,
        expiredDocuments: 0, expiringDocuments: 0, lastComplianceCheck: new Date(),
        sanctionsClear: !(s2.hasBeenBlacklisted ?? false)
      } : {
        isCompliant: true, documentsVerified: 0, totalRequiredDocuments: 0,
        expiredDocuments: 0, expiringDocuments: 0, lastComplianceCheck: new Date(), sanctionsClear: true
      }),
      performanceMetrics: raw.performanceMetrics || raw.performance_metrics || {
        overallScore: performanceScore, onTimeDeliveryRate: 0, qualityScore: 0,
        costCompetitiveness: 0, complianceScore: 0, ratingScore: 0,
        winRate: raw.winRate ?? 0, totalProjects,
        totalRevenue: raw.totalRevenue ?? raw.total_revenue ?? 0,
        averageOrderValue: 0, lastUpdated: new Date(), trendData: []
      },
      lifecycleHistory: Array.isArray(raw.lifecycleHistory) ? raw.lifecycleHistory : [],
      riskAlerts: Array.isArray(raw.riskAlerts) ? raw.riskAlerts : [],
      createdAt: parseSafeDate(raw.createdAt),
      updatedAt: parseSafeDate(raw.updatedAt),
      applicationNumber: raw.applicationNumber || raw.application_number || undefined,
      loginEnabled: raw.loginEnabled ?? false,
      // The backend was originally POSTed the full 6-step registration payload
      // (see VendorRegistrationService.submit) — preserve it here too, field by
      // field, so the Registration tab still shows everything the vendor
      // entered even when the GET response flattens the steps onto the vendor
      // object instead of nesting them under step1..step6/registration (this
      // previously required an exact raw.step1/raw.registration shape, so any
      // other response shape silently dropped the entire tab and every field
      // in it — VAT status, delivery regions, secondary bank, key personnel,
      // the declaration, etc. — even though the vendor had genuinely submitted it).
      registration: this.buildRegistration(raw, s1, s2, s3, s4, s5, s6),
    } as Vendor;
  }

  /**
   * Reassembles the full 6-step vendor portal registration from whatever
   * shape the backend returned it in: already-nested (raw.registration or
   * raw.stepN), or flattened directly onto the vendor object using the same
   * field names as VendorRegistration. Every field is looked up on the
   * nested step first, then the flat raw field, so partial/mixed responses
   * still produce a complete object instead of silently dropping fields.
   * Returns undefined only when there is no registration data at all, so the
   * Registration tab correctly stays hidden for vendors never onboarded
   * through the vendor portal.
   */
  private buildRegistration(raw: any, s1: any, s2: any, s3: any, s4: any, s5: any, s6: any): VendorRegistration | undefined {
    if (raw.registration) return raw.registration;

    const hasSource = !!(
      raw.step1 || raw.step2 || raw.step3 || raw.step4 || raw.step5 || raw.step6 ||
      s1.businessName || s2.cacRegistrationNumber || s3.primaryContactName
    );
    if (!hasSource) return undefined;

    return {
      id: raw.id, applicationNumber: raw.applicationNumber, status: raw.registrationStatus || raw.status,
      submittedDate: raw.submittedDate, lastModified: raw.updatedAt,
      reviewedBy: raw.reviewedBy, rejectionReason: raw.rejectionReason,

      step1: {
        businessName: s1.businessName ?? raw.businessName,
        tradingName: s1.tradingName ?? raw.tradingName,
        businessType: s1.businessType ?? raw.businessType,
        businessSize: s1.businessSize ?? raw.businessSize,
        ownershipType: s1.ownershipType ?? raw.ownershipType,
        yearEstablished: s1.yearEstablished ?? raw.yearEstablished,
        numberOfEmployees: s1.numberOfEmployees ?? raw.numberOfEmployees,
        annualTurnoverRange: s1.annualTurnoverRange ?? raw.annualTurnoverRange,
        currency: s1.currency ?? raw.currency,
        businessDescription: s1.businessDescription ?? raw.businessDescription ?? raw.description,
        missionStatement: s1.missionStatement ?? raw.missionStatement,
        websiteUrl: s1.websiteUrl ?? raw.websiteUrl ?? raw.website,
        linkedinUrl: s1.linkedinUrl ?? raw.linkedinUrl,
        logoFileUrl: s1.logoFileUrl ?? raw.logoFileUrl ?? raw.logo,
      },

      step2: {
        cacRegistrationNumber: s2.cacRegistrationNumber ?? raw.cacRegistrationNumber ?? raw.registrationNumber,
        cacRegistrationDate: s2.cacRegistrationDate ?? raw.cacRegistrationDate,
        cacCertificateFileUrl: s2.cacCertificateFileUrl ?? raw.cacCertificateFileUrl,
        tinNumber: s2.tinNumber ?? raw.tinNumber ?? raw.taxId,
        vatRegistered: s2.vatRegistered ?? raw.vatRegistered ?? false,
        vatNumber: s2.vatNumber ?? raw.vatNumber,
        taxClearanceCertFileUrl: s2.taxClearanceCertFileUrl ?? raw.taxClearanceCertFileUrl,
        taxClearanceExpiryDate: s2.taxClearanceExpiryDate ?? raw.taxClearanceExpiryDate,
        nafdacNumber: s2.nafdacNumber ?? raw.nafdacNumber,
        dprLicenceNumber: s2.dprLicenceNumber ?? raw.dprLicenceNumber,
        sonCertificationNumber: s2.sonCertificationNumber ?? raw.sonCertificationNumber,
        pencomNumber: s2.pencomNumber ?? raw.pencomNumber,
        nscNumber: s2.nscNumber ?? raw.nscNumber,
        otherLicences: s2.otherLicences ?? raw.otherLicences,
        hasPublicLiabilityInsurance: s2.hasPublicLiabilityInsurance ?? raw.hasPublicLiabilityInsurance ?? false,
        publicLiabilityInsurer: s2.publicLiabilityInsurer ?? raw.publicLiabilityInsurer,
        publicLiabilityPolicyNo: s2.publicLiabilityPolicyNo ?? raw.publicLiabilityPolicyNo,
        publicLiabilityExpiryDate: s2.publicLiabilityExpiryDate ?? raw.publicLiabilityExpiryDate,
        publicLiabilityFileUrl: s2.publicLiabilityFileUrl ?? raw.publicLiabilityFileUrl,
        hasProfessionalIndemnity: s2.hasProfessionalIndemnity ?? raw.hasProfessionalIndemnity ?? false,
        professionalIndemnityInsurer: s2.professionalIndemnityInsurer ?? raw.professionalIndemnityInsurer,
        professionalIndemnityPolicyNo: s2.professionalIndemnityPolicyNo ?? raw.professionalIndemnityPolicyNo,
        professionalIndemnityExpiry: s2.professionalIndemnityExpiry ?? raw.professionalIndemnityExpiry,
        isoStandards: s2.isoStandards ?? raw.isoStandards ?? [],
        otherCertifications: s2.otherCertifications ?? raw.otherCertifications,
        hasBeenBlacklisted: s2.hasBeenBlacklisted ?? raw.hasBeenBlacklisted ?? false,
        blacklistedDetails: s2.blacklistedDetails ?? raw.blacklistedDetails,
        hasLitigationPending: s2.hasLitigationPending ?? raw.hasLitigationPending ?? false,
        litigationDetails: s2.litigationDetails ?? raw.litigationDetails,
        hasCriminalConviction: s2.hasCriminalConviction ?? raw.hasCriminalConviction ?? false,
        criminalDetails: s2.criminalDetails ?? raw.criminalDetails,
      },

      step3: {
        primaryContactName: s3.primaryContactName ?? raw.primaryContactName,
        primaryContactTitle: s3.primaryContactTitle ?? raw.primaryContactTitle,
        primaryContactEmail: s3.primaryContactEmail ?? raw.primaryContactEmail ?? raw.email,
        primaryContactPhone: s3.primaryContactPhone ?? raw.primaryContactPhone ?? raw.phone,
        primaryContactPhone2: s3.primaryContactPhone2 ?? raw.primaryContactPhone2,
        hasSecondaryContact: s3.hasSecondaryContact ?? !!raw.secondaryContactName,
        secondaryContactName: s3.secondaryContactName ?? raw.secondaryContactName,
        secondaryContactTitle: s3.secondaryContactTitle ?? raw.secondaryContactTitle,
        secondaryContactEmail: s3.secondaryContactEmail ?? raw.secondaryContactEmail,
        secondaryContactPhone: s3.secondaryContactPhone ?? raw.secondaryContactPhone,
        registeredAddressLine1: s3.registeredAddressLine1 ?? raw.registeredAddressLine1 ?? raw.address?.street,
        registeredAddressLine2: s3.registeredAddressLine2 ?? raw.registeredAddressLine2,
        registeredCity: s3.registeredCity ?? raw.registeredCity ?? raw.address?.city,
        registeredState: s3.registeredState ?? raw.registeredState ?? raw.address?.state,
        registeredPostalCode: s3.registeredPostalCode ?? raw.registeredPostalCode ?? raw.address?.postalCode,
        registeredCountry: s3.registeredCountry ?? raw.registeredCountry ?? raw.address?.country,
        operatingAddressSameAsRegistered: s3.operatingAddressSameAsRegistered ?? true,
        operatingAddressLine1: s3.operatingAddressLine1 ?? raw.operatingAddressLine1,
        operatingAddressLine2: s3.operatingAddressLine2 ?? raw.operatingAddressLine2,
        operatingCity: s3.operatingCity ?? raw.operatingCity,
        operatingState: s3.operatingState ?? raw.operatingState,
        operatingPostalCode: s3.operatingPostalCode ?? raw.operatingPostalCode,
        operatingCountry: s3.operatingCountry ?? raw.operatingCountry,
        hasWarehouse: s3.hasWarehouse ?? !!raw.warehouseAddressLine1,
        warehouseAddressLine1: s3.warehouseAddressLine1 ?? raw.warehouseAddressLine1,
        warehouseCity: s3.warehouseCity ?? raw.warehouseCity,
        warehouseState: s3.warehouseState ?? raw.warehouseState,
        warehouseCapacity: s3.warehouseCapacity ?? raw.warehouseCapacity,
        deliveryRegions: s3.deliveryRegions ?? raw.deliveryRegions ?? [],
        hasOwnDeliveryFleet: s3.hasOwnDeliveryFleet ?? raw.hasOwnDeliveryFleet ?? false,
        fleetSize: s3.fleetSize ?? raw.fleetSize,
        deliveryLeadTimeDays: s3.deliveryLeadTimeDays ?? raw.deliveryLeadTimeDays ?? 0,
        canDeliverNationwide: s3.canDeliverNationwide ?? raw.canDeliverNationwide ?? false,
        canDeliverInternationally: s3.canDeliverInternationally ?? raw.canDeliverInternationally ?? false,
      },

      step4: {
        primaryBankName: s4.primaryBankName ?? raw.primaryBankName ?? raw.bankDetails?.bankName,
        primaryBankBranch: s4.primaryBankBranch ?? raw.primaryBankBranch ?? raw.bankDetails?.bankBranch,
        primaryAccountName: s4.primaryAccountName ?? raw.primaryAccountName ?? raw.bankDetails?.accountName,
        primaryAccountNumber: s4.primaryAccountNumber ?? raw.primaryAccountNumber ?? raw.bankDetails?.accountNumber,
        primaryAccountType: s4.primaryAccountType ?? raw.primaryAccountType ?? raw.bankDetails?.accountType,
        primaryCurrency: s4.primaryCurrency ?? raw.primaryCurrency ?? raw.bankDetails?.currency,
        primarySortCode: s4.primarySortCode ?? raw.primarySortCode ?? raw.bankDetails?.sortCode,
        primaryIban: s4.primaryIban ?? raw.primaryIban,
        primarySwiftCode: s4.primarySwiftCode ?? raw.primarySwiftCode ?? raw.bankDetails?.swiftCode,
        hasSecondaryBankAccount: s4.hasSecondaryBankAccount ?? !!raw.secondaryBankName,
        secondaryBankName: s4.secondaryBankName ?? raw.secondaryBankName,
        secondaryAccountName: s4.secondaryAccountName ?? raw.secondaryAccountName,
        secondaryAccountNumber: s4.secondaryAccountNumber ?? raw.secondaryAccountNumber,
        secondaryAccountType: s4.secondaryAccountType ?? raw.secondaryAccountType,
        secondaryCurrency: s4.secondaryCurrency ?? raw.secondaryCurrency,
        preferredPaymentTerms: s4.preferredPaymentTerms ?? raw.preferredPaymentTerms ?? raw.paymentTerms,
        acceptsAdvancePayment: s4.acceptsAdvancePayment ?? raw.acceptsAdvancePayment ?? false,
        advancePaymentPercentage: s4.advancePaymentPercentage ?? raw.advancePaymentPercentage,
        acceptsLetterOfCredit: s4.acceptsLetterOfCredit ?? raw.acceptsLetterOfCredit ?? false,
        acceptsMobileMoney: s4.acceptsMobileMoney ?? raw.acceptsMobileMoney ?? false,
        mobileMoneyCurrency: s4.mobileMoneyCurrency ?? raw.mobileMoneyCurrency,
        mobileMoneyNumber: s4.mobileMoneyNumber ?? raw.mobileMoneyNumber,
        creditRating: s4.creditRating ?? raw.creditRating,
        annualAuditedAccounts: s4.annualAuditedAccounts ?? raw.annualAuditedAccounts ?? false,
        auditFirmName: s4.auditFirmName ?? raw.auditFirmName,
        lastAuditYear: s4.lastAuditYear ?? raw.lastAuditYear,
        bankReference1Name: s4.bankReference1Name ?? raw.bankReference1Name,
        bankReference1Contact: s4.bankReference1Contact ?? raw.bankReference1Contact,
        tradeReference1Company: s4.tradeReference1Company ?? raw.tradeReference1Company,
        tradeReference1Contact: s4.tradeReference1Contact ?? raw.tradeReference1Contact,
        tradeReference1Email: s4.tradeReference1Email ?? raw.tradeReference1Email,
        tradeReference2Company: s4.tradeReference2Company ?? raw.tradeReference2Company,
        tradeReference2Contact: s4.tradeReference2Contact ?? raw.tradeReference2Contact,
        tradeReference2Email: s4.tradeReference2Email ?? raw.tradeReference2Email,
      },

      step5: {
        supplyCategories: s5.supplyCategories ?? raw.supplyCategories ?? raw.categories ?? [],
        primaryCategory: s5.primaryCategory ?? raw.primaryCategory,
        categoryDescription: s5.categoryDescription ?? raw.categoryDescription,
        canHandleEmergencyOrders: s5.canHandleEmergencyOrders ?? raw.canHandleEmergencyOrders ?? false,
        emergencyLeadTimeHours: s5.emergencyLeadTimeHours ?? raw.emergencyLeadTimeHours,
        minimumOrderValue: s5.minimumOrderValue ?? raw.minimumOrderValue,
        maximumOrderValue: s5.maximumOrderValue ?? raw.maximumOrderValue,
        bulkDiscountAvailable: s5.bulkDiscountAvailable ?? raw.bulkDiscountAvailable ?? false,
        bulkDiscountDetails: s5.bulkDiscountDetails ?? raw.bulkDiscountDetails,
        hasQualityManagementSystem: s5.hasQualityManagementSystem ?? raw.hasQualityManagementSystem ?? false,
        qmsStandard: s5.qmsStandard ?? raw.qmsStandard,
        hasInspectionFacility: s5.hasInspectionFacility ?? raw.hasInspectionFacility ?? false,
        testingEquipmentList: s5.testingEquipmentList ?? raw.testingEquipmentList,
        isManufacturer: s5.isManufacturer ?? raw.isManufacturer ?? false,
        isDistributor: s5.isDistributor ?? raw.isDistributor ?? false,
        isServiceProvider: s5.isServiceProvider ?? raw.isServiceProvider ?? false,
        isImporter: s5.isImporter ?? raw.isImporter ?? false,
        primarySuppliersCountries: s5.primarySuppliersCountries ?? raw.primarySuppliersCountries,
        majorClients: s5.majorClients ?? raw.majorClients ?? [],
        completedProjectsCount: s5.completedProjectsCount ?? raw.completedProjectsCount ?? raw.totalProjects ?? 0,
        averageProjectValue: s5.averageProjectValue ?? raw.averageProjectValue,
        largestProjectValue: s5.largestProjectValue ?? raw.largestProjectValue,
        largestProjectDescription: s5.largestProjectDescription ?? raw.largestProjectDescription,
        technicalStaffCount: s5.technicalStaffCount ?? raw.technicalStaffCount,
        keyPersonnelList: s5.keyPersonnelList ?? raw.keyPersonnelList ?? [],
        industryAssociations: s5.industryAssociations ?? raw.industryAssociations,
        professionalMemberships: s5.professionalMemberships ?? raw.professionalMemberships,
        awardsRecognitions: s5.awardsRecognitions ?? raw.awardsRecognitions,
      },

      step6: {
        uploadedDocuments: s6.uploadedDocuments ?? raw.uploadedDocuments ?? [],
        declarantName: s6.declarantName ?? raw.declarantName,
        declarantTitle: s6.declarantTitle ?? raw.declarantTitle,
        declarantEmail: s6.declarantEmail ?? raw.declarantEmail,
        declarantPhone: s6.declarantPhone ?? raw.declarantPhone,
        declarationDate: s6.declarationDate ?? raw.declarationDate,
        agreedToTerms: s6.agreedToTerms ?? raw.agreedToTerms ?? false,
        agreedToPrivacyPolicy: s6.agreedToPrivacyPolicy ?? raw.agreedToPrivacyPolicy ?? false,
        agreedToCodeOfConduct: s6.agreedToCodeOfConduct ?? raw.agreedToCodeOfConduct ?? false,
        agreedToAntiCorruption: s6.agreedToAntiCorruption ?? raw.agreedToAntiCorruption ?? false,
        confirmedAccuracy: s6.confirmedAccuracy ?? raw.confirmedAccuracy ?? false,
        signatureFileUrl: s6.signatureFileUrl ?? raw.signatureFileUrl,
      },
    } as VendorRegistration;
  }

  // ============================================================
  // VENDOR CRUD OPERATIONS
  // ============================================================

  getVendors(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: VendorStatus;
      statuses?: VendorStatus[];
      tier?: VendorTier;
      riskLevel?: RiskLevel;
      search?: string;
      category?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Observable<VendorListResponse> {
    this.loadingSubject.next(true);

    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', limit.toString());

    if (filters) {
      if (filters.statuses) {
        const statuses = Array.isArray(filters.statuses) ? filters.statuses : [filters.statuses];
        params = params.set('statuses', statuses.join(','));
      } else if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.search) params = params.set('search', filters.search);
      if (filters.tier) params = params.set('tier', filters.tier);
      if (filters.riskLevel) params = params.set('riskLevel', filters.riskLevel);
      if (filters.category) params = params.set('category', filters.category);
      if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params = params.set('dateTo', filters.dateTo);
    }

    return this.http.get<any>(`${this.baseUrl}/vendor-management/vendors`, { params })
      .pipe(
        map(res => {
          const rawVendors: any[] = Array.isArray(res)
            ? res
            : (res?.vendors ?? res?.data ?? res?.content ?? []);
          const backendVendors: Vendor[] = rawVendors.map(v => this.mapVendor(v));

          let finalVendors = backendVendors;

          // Apply filters
          if (filters?.statuses && Array.isArray(filters.statuses)) {
            finalVendors = finalVendors.filter(v => filters.statuses!.includes(v.status));
          } else if (filters?.status) {
            finalVendors = finalVendors.filter(v => v.status === filters.status);
          }

          if (filters?.tier) {
            finalVendors = finalVendors.filter(v => v.tier === filters.tier);
          }

          if (filters?.riskLevel) {
            finalVendors = finalVendors.filter(v => v.riskLevel === filters.riskLevel);
          }

          if (filters?.category) {
            const category = String(filters.category).toLowerCase();
            finalVendors = finalVendors.filter(v => (v.categories || []).some((cat: string) => cat.toLowerCase().includes(category)));
          }

          if (filters?.search) {
            const search = String(filters.search).toLowerCase();
            finalVendors = finalVendors.filter(v =>
              (v.companyName || '').toLowerCase().includes(search) ||
              (v.email || '').toLowerCase().includes(search) ||
              (v.registrationNumber || '').toLowerCase().includes(search)
            );
          }

          // The server's total/totalPages describe the UNFILTERED backendVendors count. If the client-side
          // filtering above actually removed something the server didn't (tier/riskLevel/category aren't
          // guaranteed to be honoured server-side), that total is now wrong for the filtered set — showing
          // e.g. "Showing 1 to 20 of 45" over a page that only has 12 rows left after filtering. Rather
          // than assert a page count we can't verify, fall back to exactly what's on this page.
          const serverFiltered = finalVendors.length === backendVendors.length;
          const totalCount = serverFiltered
            ? (res?.total ?? res?.totalCount ?? res?.totalElements ?? finalVendors.length)
            : finalVendors.length;
          const totalPages = serverFiltered
            ? (res?.totalPages ?? res?.pages ?? Math.max(Math.ceil(totalCount / limit), 1))
            : 1;
          const listResponse: VendorListResponse = {
            vendors: finalVendors,
            total: totalCount,
            page,
            limit,
            totalPages
          };
          return listResponse;
        }),
        tap(response => {
          this.vendorsSubject.next(response.vendors);
          this.loadingSubject.next(false);
        }),
        // A failed load is an error, not an empty/mock list: the previous fallback returned
        // MOCK_VENDORS + locally stored registrations as if they were real vendors, with no
        // error reaching the UI, so an outage looked like live data (and let fake vendors be
        // picked as RFQ recipients).
        catchError(err => {
          console.error('[VendorService] getVendors API failed:', err);
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to load vendors');
          return throwError(() => err);
        })
      );
  }

  getVendorById(id: string): Observable<Vendor> {
    this.loadingSubject.next(true);

    // Always ask the backend and always run the result through mapVendor():
    //  - serving the list cache meant the detail page showed the slim list projection and the
    //    Refresh button just re-read the same cached object;
    //  - returning the raw body skipped mapVendor()'s handling of the nested step1..step6
    //    registration shape (name/contact/address/bank), so a deep link or F5 on the page got
    //    unmapped data and could crash on a missing `address`;
    //  - on failure this used to substitute MOCK_VENDORS[0] (an ACTIVE, 95-score vendor with
    //    invented bank details) for ANY id, so a 404/500 rendered someone else's vendor as real.
    return this.http.get<any>(`${this.baseUrl}/vendor-management/vendors/${id}`)
      .pipe(
        map(raw => {
          const body = raw?.vendor ?? raw?.data ?? raw;
          if (!body || typeof body !== 'object') {
            throw new Error('Vendor not found');
          }
          return this.mapVendor(body);
        }),
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

  deleteVendor(id: string): Observable<void> {
    // Errors propagate: this used to swallow them into a successful `of(void 0)`, so a failed
    // delete was reported (and, in bulk, removed from the list locally) as if it had worked.
    return this.http.delete<void>(`${this.baseUrl}/vendors/${id}`).pipe(
      catchError((err) => { console.error('[VendorManagementService] deleteVendor failed:', err); return throwError(() => err); })
    );
  }

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
   * Changes a vendor's status on the backend and returns the updated vendor.
   *
   * There is deliberately no local fallback. This used to catch every error (401/403/500/offline),
   * persist the *requested* status into a localStorage override that every later getVendors() applied
   * on top of the backend's answer (and that nothing ever cleared), and report success — so a failed
   * approve/suspend looked done, then stuck in that browser while the backend still had the old
   * status. Failures now reach the caller; the backend is the only source of a vendor's status.
   *
   * `reason` is the admin's rejection reason / approval note; it is sent under both `reason` and
   * `notes` because the endpoint's field name isn't documented in this codebase (the unused
   * approveVendor()/rejectVendor() helpers use `notes` and `reason` respectively).
   */
  updateVendorStatus(id: string, status: VendorStatus, reason?: string): Observable<Vendor> {
    const body: Record<string, unknown> = { status };
    const note = reason?.trim();
    if (note) {
      body['reason'] = note;
      body['notes'] = note;
    }

    return this.http.patch<any>(`${this.baseUrl}/vendor-management/vendors/${id}/status`, body)
      .pipe(
        map(raw => {
          // The response may be the full vendor, or only a message / empty body. Only trust it as a
          // vendor when it looks like one — mapping an empty body produced a bogus
          // "Pending Registration (ID: N/A)" vendor that then overwrote the real record.
          const looksLikeVendor = raw && typeof raw === 'object' && raw.id != null && (raw.companyName || raw.name || raw.step1 || raw.status);
          if (looksLikeVendor) {
            return this.mapVendor(raw);
          }
          // Prefer the fully-loaded selected vendor: the detail page listens to selectedVendor$, and
          // merging into the slimmer list copy would replace its full record with a partial one.
          const selected = this.selectedVendorSubject.value;
          const known = (selected && String(selected.id) === String(id) ? selected : null)
            ?? this.vendorsSubject.value.find(v => String(v.id) === String(id));
          return { ...(known ?? ({ id: Number(id) } as Vendor)), status, updatedAt: new Date() } as Vendor;
        }),
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

  enableVendorLogin(id: string, enabled: boolean): Observable<Vendor> {
    return this.http.patch<any>(`${this.baseUrl}/vendor-management/vendors/${id}/enable-login`, { loginEnabled: enabled })
      .pipe(
        map(raw => this.mapVendor(raw)),
        tap(vendor => {
          this.selectedVendorSubject.next(vendor);
          this.updateVendorInList(vendor);
        }),
        catchError(err => {
          this.errorSubject.next('Failed to update vendor login access');
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // PERFORMANCE
  // ============================================================

  /**
   * The real performance endpoint returns VendorPerformanceMetrics directly —
   * kpis/ranking aren't part of the API contract, so they're derived here
   * client-side (kpis purely for display, ranking as a best-effort estimate
   * since the backend doesn't expose a vendor's rank among peers).
   */
  private buildPerformanceResponse(metrics: VendorPerformanceMetrics, vendorId: string): VendorPerformanceResponse {
    return {
      metrics,
      kpis: [
        { label: 'Overall Score', value: metrics.overallScore, unit: '%', color: '#2EB270', icon: 'fa-chart-line', trend: 'up', percentChange: 3.2 },
        { label: 'On-Time Delivery', value: metrics.onTimeDeliveryRate, unit: '%', color: '#2EB270', icon: 'fa-clock', trend: 'up', percentChange: 1.5 },
        { label: 'Quality Score', value: metrics.qualityScore, unit: '%', color: '#F5A623', icon: 'fa-star', trend: 'up', percentChange: 2.1 },
        { label: 'Cost Competitiveness', value: metrics.costCompetitiveness, unit: '%', color: '#F97316', icon: 'fa-tags', trend: 'stable', percentChange: 0.5 },
        { label: 'Compliance Score', value: metrics.complianceScore, unit: '%', color: '#2EB270', icon: 'fa-shield-alt', trend: 'up', percentChange: 4.8 },
        // ratingScore is 0-100 (see VendorPerformanceMetrics), not out of 5 — this previously said '/5'
        // for a value the Performance tab itself renders as a percentage.
        { label: 'Rating Score', value: metrics.ratingScore, unit: '%', color: '#8B5CF6', icon: 'fa-star-half-alt', trend: 'up', percentChange: 2.3 },
        { label: 'Win Rate', value: metrics.winRate, unit: '%', color: '#2E6276', icon: 'fa-trophy', trend: 'up', percentChange: 5.0 },
        { label: 'Total Projects', value: metrics.totalProjects, unit: '', color: '#6B7280', icon: 'fa-project-diagram', trend: 'up', percentChange: 12.0 }
      ],
      ranking: {
        vendorId,
        rank: 0, // Not provided by the backend — no cross-vendor ranking endpoint exists
        score: metrics.overallScore,
        factors: {
          price: metrics.costCompetitiveness,
          delivery: metrics.onTimeDeliveryRate,
          performance: metrics.overallScore,
          compliance: metrics.complianceScore
        },
        recommendation: metrics.overallScore >= 85 ? 'STRONG' : metrics.overallScore >= 70 ? 'MODERATE' : 'WEAK'
      }
    };
  }

  getVendorPerformance(vendorId: string): Observable<VendorPerformanceResponse> {
    this.loadingSubject.next(true);

    return this.http.get<VendorPerformanceMetrics>(`${this.baseUrl}/vendor-management/vendors/${vendorId}/performance`)
      .pipe(
        map(metrics => this.buildPerformanceResponse(metrics, vendorId)),
        tap(() => this.loadingSubject.next(false)),
        // No mock fallback: a failed/absent response used to be replaced with MOCK_PERFORMANCE_METRICS
        // (87.5 overall, 12 months of trend, NGN 12.5M revenue) for every vendor, presented as that
        // vendor's real numbers. The caller now decides how to show "no performance data".
        catchError((err) => {
          console.warn('Performance API failed for vendor:', vendorId, err);
          this.loadingSubject.next(false);
          return throwError(() => err);
        })
      );
  }

  getVendorKPIs(vendorId: string): Observable<VendorKPI[]> {
    return of([] as any);
  }

  getPerformanceTrend(vendorId: string, period: 'monthly' | 'quarterly' = 'monthly'): Observable<any> {
    return of({} as any);
  }

  refreshAIPerformance(vendorId: string): Observable<any> {
    return of({} as any);
  }

  // ============================================================
  // RISK & COMPLIANCE
  // ============================================================

  // Insight types that represent an actual risk to review — TIER_UPGRADE/OPPORTUNITY are positive
  // signals, not something that belongs on a risk-alerts screen.
  private static readonly RISK_RELEVANT_INSIGHT_TYPES = new Set<InsightType>([
    InsightType.PERFORMANCE_DECLINE,
    InsightType.FRAUD_ANOMALY,
    InsightType.DOCUMENT_EXPIRY,
    InsightType.RISK_ESCALATION
  ]);

  private static readonly INSIGHT_STATUS_TO_ALERT_STATUS: Record<InsightActionStatus, RiskAlert['status']> = {
    [InsightActionStatus.OPEN]: 'OPEN',
    [InsightActionStatus.REVIEWED]: 'IN_PROGRESS',
    [InsightActionStatus.ACTIONED]: 'RESOLVED',
    [InsightActionStatus.DISMISSED]: 'DISMISSED'
  };

  private static readonly FRAUD_STATUS_TO_ALERT_STATUS: Record<FraudFlag['status'], RiskAlert['status']> = {
    PENDING_REVIEW: 'OPEN',
    INVESTIGATING: 'IN_PROGRESS',
    ESCALATED: 'IN_PROGRESS',
    APPROVED: 'RESOLVED',
    CLEARED: 'RESOLVED'
  };

  private mapInsightToRiskAlert(insight: SentinelInsight): RiskAlert {
    const status = VendorService.INSIGHT_STATUS_TO_ALERT_STATUS[insight.status] ?? 'OPEN';
    return {
      // Namespaced so insight- and fraud-flag-derived ids (both starting from 1) can't collide.
      id: 1_000_000 + insight.id,
      vendorId: insight.vendorId,
      // Sentinel reports CRITICAL/HIGH/MEDIUM/LOW. RiskAlert.severity is typed as the 3-value
      // AlertSeverity enum, but risk.component.ts's own bucketing already matches on the raw
      // uppercased string (it has separate HIGH/MEDIUM buckets alongside CRITICAL/WARNING/INFO),
      // so passing the real value through preserves detail the UI already knows how to show.
      severity: insight.severity as unknown as AlertSeverity,
      type: insight.type,
      title: insight.finding,
      description: insight.reason,
      detectedAt: insight.detectedAt,
      status,
      actionRequired: status === 'OPEN' || status === 'IN_PROGRESS'
    };
  }

  private mapFraudFlagToRiskAlert(flag: FraudFlag): RiskAlert {
    const status = VendorService.FRAUD_STATUS_TO_ALERT_STATUS[flag.status] ?? 'OPEN';
    return {
      id: 2_000_000 + flag.id,
      vendorId: flag.vendorId,
      severity: flag.severity as unknown as AlertSeverity,
      type: flag.type,
      title: flag.title,
      description: flag.description,
      detectedAt: flag.detectedAt,
      status,
      actionRequired: status === 'OPEN' || status === 'IN_PROGRESS'
    };
  }

  /**
   * There's no vendor-scoped risk-alerts endpoint. Risk alerts are computed from the two real
   * Sentinel feeds — AI insights and fraud flags — filtered down to this vendor. If either feed
   * fails, the whole call fails rather than silently showing one without the other: a risk screen
   * that's quietly missing half its inputs is worse than one that visibly couldn't load.
   */
  getRiskAlerts(vendorId?: string): Observable<RiskAlert[]> {
    if (!vendorId) {
      return of([]);
    }

    return forkJoin([this.getSentinelInsights(), this.getFraudFlags()]).pipe(
      map(([insights, flags]) => {
        const fromInsights = insights
          .filter(i => String(i.vendorId) === vendorId && VendorService.RISK_RELEVANT_INSIGHT_TYPES.has(i.type))
          .map(i => this.mapInsightToRiskAlert(i));
        const fromFlags = flags
          .filter(f => String(f.vendorId) === vendorId)
          .map(f => this.mapFraudFlagToRiskAlert(f));

        return [...fromInsights, ...fromFlags]
          .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
      })
    );
  }


  // Resolving a risk alert and initiating a sanctions check have no real backend endpoint yet
  // (there used to be stub methods here that always reported success without calling out) —
  // removed rather than wire a "Resolve" button to a no-op that would silently do nothing.

  // ============================================================
  // DOCUMENTS
  // ============================================================

  /** Normalises a raw compliance/documents API record onto the VendorDocument shape. */
  /** Documents with genuinely no expiry (e.g. a company profile) get this far-future placeholder
   *  instead of "now" — VendorDocument.expiryDate/daysUntilExpiry aren't optional, and defaulting a
   *  missing date to today made every such document look like it was expiring today with 0 days left. */
  private static readonly NO_EXPIRY = new Date('2099-12-31T00:00:00Z');

  private mapComplianceDocument(raw: any, fallbackVendorId?: string): VendorDocument {
    const expDate = raw.expiryDate ? parseSafeDate(raw.expiryDate) : VendorService.NO_EXPIRY;
    const uploadedAtDate = parseSafeDate(raw.uploadedAt || raw.uploadedDate || raw.createdAt);
    const timeDiff = expDate.getTime() - new Date().getTime();
    const computedDaysUntilExpiry = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));

    let docStatus = DocumentStatus.PENDING_VERIFICATION;
    const statusUpper = String(raw.status || '').toUpperCase();
    if (statusUpper === 'ACTIVE' || statusUpper === 'APPROVED') {
      docStatus = DocumentStatus.ACTIVE;
    } else if (statusUpper === 'EXPIRED') {
      docStatus = DocumentStatus.EXPIRED;
    } else if (statusUpper === 'EXPIRING_SOON') {
      docStatus = DocumentStatus.EXPIRING_SOON;
    } else if (statusUpper === 'REJECTED') {
      docStatus = DocumentStatus.REJECTED;
    } else if (statusUpper === 'PENDING' || statusUpper === 'PENDING_VERIFICATION') {
      docStatus = DocumentStatus.PENDING_VERIFICATION;
    }

    // The backend's stored status was never cross-checked against the actual expiry date, so a
    // document the backend still called ACTIVE (or EXPIRING_SOON) kept showing "Valid until <date>"
    // even once that date had genuinely passed. Only expiry-driven statuses are recomputed —
    // PENDING_VERIFICATION/REJECTED are about verification, not expiry, so they're left alone.
    if (docStatus === DocumentStatus.ACTIVE || docStatus === DocumentStatus.EXPIRING_SOON || docStatus === DocumentStatus.EXPIRED) {
      const EXPIRING_SOON_DAYS = 30;
      if (expDate.getTime() < Date.now()) {
        docStatus = DocumentStatus.EXPIRED;
      } else if (computedDaysUntilExpiry <= EXPIRING_SOON_DAYS) {
        docStatus = DocumentStatus.EXPIRING_SOON;
      } else {
        docStatus = DocumentStatus.ACTIVE;
      }
    }

    let category = DocumentCategory.REGISTRATION;
    const categoryUpper = String(raw.category || '').toUpperCase();
    if (categoryUpper === 'REGISTRATION') {
      category = DocumentCategory.REGISTRATION;
    } else if (categoryUpper === 'TAX') {
      category = DocumentCategory.TAX;
    } else if (categoryUpper === 'LICENCE' || categoryUpper === 'LICENSE') {
      category = DocumentCategory.LICENCE;
    } else if (categoryUpper === 'INSURANCE') {
      category = DocumentCategory.INSURANCE;
    } else if (categoryUpper === 'CERTIFICATION') {
      category = DocumentCategory.CERTIFICATION;
    }

    return {
      id: Number(raw.id),
      vendorId: String(raw.vendorId ?? fallbackVendorId ?? ''),
      vendorName: raw.vendorName || undefined,
      category,
      name: raw.name || raw.label || raw.fileName || 'Unnamed Document',
      fileName: raw.fileName || '',
      fileUrl: raw.fileUrl || '',
      fileSize: Number(raw.fileSize || 0),
      fileType: raw.fileType || (raw.fileName?.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
      issueDate: parseSafeDate(raw.issueDate || raw.createdAt || uploadedAtDate),
      expiryDate: expDate,
      status: docStatus,
      isRequired: !!raw.isRequired,
      verifiedBy: raw.verifiedBy || undefined,
      verifiedDate: raw.verifiedDate ? parseSafeDate(raw.verifiedDate) : undefined,
      verificationNotes: raw.verificationNotes || undefined,
      daysUntilExpiry: raw.daysUntilExpiry ?? computedDaysUntilExpiry,
      uploadedAt: uploadedAtDate,
      uploadedBy: raw.uploadedBy || 'Vendor User'
    } as VendorDocument;
  }

  /** All compliance documents across every vendor. */
  getComplianceDocuments(): Observable<VendorDocument[]> {
    return this.http.get<any[]>(`${this.baseUrl}/vendor-management/compliance/documents`)
      .pipe(
        map(res => (Array.isArray(res) ? res : []).map(raw => this.mapComplianceDocument(raw)))
      );
  }

  getVendorDocuments(vendorId: string): Observable<VendorDocument[]> {
    this.loadingSubject.next(true);

    // Errors propagate. On failure this used to return three invented documents (pointing at a
    // dummy W3C PDF, with hard-coded statuses and expiry days) for any vendor.
    return this.getComplianceDocuments()
      .pipe(
        map(docs => docs.filter(d => d.vendorId === vendorId)),
        tap(() => this.loadingSubject.next(false)),
        catchError(err => {
          this.loadingSubject.next(false);
          console.warn('Documents API failed for vendor:', vendorId, err);
          return throwError(() => err);
        })
      );
  }

  /**
   * Emits real 'progress' events off the HTTP request itself (not a simulated timer), then one
   * 'complete' event once the server has actually stored the document.
   */
  uploadDocument(
    vendorId: string,
    file: File,
    category: DocumentCategory,
    issueDate: Date,
    expiryDate: Date
  ): Observable<DocumentUploadEvent> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('issueDate', issueDate.toISOString());
    formData.append('expiryDate', expiryDate.toISOString());

    return this.http.post<VendorDocument>(`${this.baseUrl}/vendors/${vendorId}/documents`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      filter(event => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response),
      map((event): DocumentUploadEvent => {
        if (event.type === HttpEventType.UploadProgress) {
          const progress = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
          return { type: 'progress', progress };
        }
        return { type: 'complete', document: (event as HttpResponse<VendorDocument>).body as VendorDocument };
      }),
      tap(event => {
        if (event.type === 'complete') {
          // Best-effort cache refresh; a failure here is already toasted and the caller reloads anyway.
          this.getVendorDocuments(vendorId).subscribe({ error: () => { /* surfaced elsewhere */ } });
        }
      }),
      catchError(err => {
        this.errorSubject.next('Failed to upload document');
        return throwError(() => err);
      })
    );
  }

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
  // AI & PREDICTIVE (stubs)
  // ============================================================

  getVendorRanking(vendorId: string): Observable<VendorRankingData> {
    return of({} as any);
  }

  getVendorPredictions(vendorId: string): Observable<VendorPrediction[]> {
    return of([] as any);
  }

  getAnomalies(vendorId?: string): Observable<AnomalyDetection[]> {
    return of([] as any);
  }

  acknowledgeAnomaly(anomalyId: string): Observable<any> {
    return of({} as any);
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  getLifecycleHistory(vendorId: string): Observable<VendorLifecycleHistory[]> {
    this.loadingSubject.next(true);

    return this.http.get<VendorLifecycleHistory[]>(`${this.baseUrl}/vendor-management/vendors/${vendorId}/lifecycle-history`)
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        // Errors propagate. This used to fabricate an audit trail ("Application submitted",
        // "Documents uploaded", "Under review", "Vendor activated in the marketplace") for ANY vendor,
        // including ones that are still pending or were rejected.
        catchError(err => {
          this.loadingSubject.next(false);
          console.warn('Lifecycle API failed for vendor:', vendorId, err);
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // MESSAGING
  // ============================================================

  getVendorMessages(vendorId: string): Observable<VendorMessage[]> {
    return of([] as any);
  }

  sendMessage(vendorId: string, message: Partial<VendorMessage>): Observable<VendorMessage> {
    return of({} as any);
  }

  markMessageRead(messageId: string): Observable<any> {
    return of({} as any);
  }

  // ============================================================
  // DISPUTES
  // ============================================================

  getDisputes(vendorId?: string): Observable<Dispute[]> {
    return of([] as any);
  }

  createDispute(vendorId: string, dispute: Partial<Dispute>): Observable<Dispute> {
    return of({} as any);
  }

  resolveDispute(disputeId: string, resolution: string): Observable<any> {
    return of({} as any);
  }

  // ============================================================
  // EXPORT / REPORT
  // ============================================================

  exportVendors(filters?: any): Observable<Blob> {
    let params = new HttpParams();

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
  // AI VENDOR INTELLIGENCE (SENTINEL)
  // ============================================================

  private sentinelInsightsSubject = new BehaviorSubject<SentinelInsight[]>([]);
  sentinelInsights$ = this.sentinelInsightsSubject.asObservable();

  private fraudFlagsSubject = new BehaviorSubject<FraudFlag[]>([]);
  fraudFlags$ = this.fraudFlagsSubject.asObservable();

  // The AI/Sentinel calls below used to fall back to hard-coded MOCK_* data (or to "apply the change
  // locally and report success") on ANY failure. That put fabricated insights, fraud flags, risk
  // trajectories, extracted registration numbers and summary counts in front of admins as if they
  // were live findings about real vendors, and made failed writes look saved (then quietly revert on
  // the next refresh). Reads now propagate errors; writes update local state only after the backend
  // confirms.

  getSentinelInsights(): Observable<SentinelInsight[]> {
    return this.http.get<SentinelInsight[]>(`${this.baseUrl}/vendor-management/sentinel/insights`)
      .pipe(
        tap(data => this.sentinelInsightsSubject.next(data))
      );
  }

  actOnInsight(insightId: number, action: string): Observable<SentinelInsight[]> {
    const normalizedAction = action.toUpperCase();
    const status: InsightActionStatus = normalizedAction === 'DISMISS'
      ? InsightActionStatus.DISMISSED
      : normalizedAction === 'REVIEW' || normalizedAction === 'INVESTIGATE'
        ? InsightActionStatus.REVIEWED
        : InsightActionStatus.ACTIONED;

    return this.http.post<SentinelInsight[]>(`${API_BASE}/ai/sentinel/insights/${insightId}/action`, { action })
      .pipe(
        map(() => this.sentinelInsightsSubject.value.map(insight => insight.id === insightId ? { ...insight, status } : insight)),
        tap(updated => this.sentinelInsightsSubject.next(updated))
      );
  }

  /** A single vendor's AI-projected risk trend — the only shape the real API exposes. */
  getVendorRiskTrajectory(vendorId: string): Observable<VendorRiskTrajectory> {
    return this.http.get<VendorRiskTrajectory>(`${this.baseUrl}/vendor-management/vendors/${vendorId}/risk-trajectory`);
  }

  /**
   * Trajectories for a set of vendors, fanned out over the per-vendor endpoint (there's no bulk
   * endpoint). A vendor with no trajectory (or a failed call) is simply left out — one vendor's failure
   * must not blank the others, and it must never be replaced by another vendor's mock trajectory
   * (this used to return MOCK_RISK_TRAJECTORIES[0] for any vendor).
   */
  getRiskTrajectories(vendorIds?: string[]): Observable<VendorRiskTrajectory[]> {
    if (!vendorIds || vendorIds.length === 0) {
      return of([]);
    }
    return forkJoin(vendorIds.map(id => this.getVendorRiskTrajectory(id).pipe(catchError(() => of(null))))).pipe(
      map(list => list.filter((t): t is VendorRiskTrajectory => !!t))
    );
  }

  getFraudFlags(): Observable<FraudFlag[]> {
    return this.http.get<FraudFlag[]>(`${this.baseUrl}/vendor-management/fraud-flags`)
      .pipe(
        tap(data => this.fraudFlagsSubject.next(data))
      );
  }

  updateFraudFlagStatus(flagId: number, status: FraudFlag['status']): Observable<FraudFlag[]> {
    return this.http.post<FraudFlag[]>(`${API_BASE}/ai/sentinel/fraud-flags/${flagId}/status`, { status })
      .pipe(
        map(() => this.fraudFlagsSubject.value.map(f => f.id === flagId ? { ...f, status } : f)),
        tap(updated => this.fraudFlagsSubject.next(updated))
      );
  }

  getOnboardingCopilotSession(vendorId?: string): Observable<OnboardingCopilotSession> {
    // The real endpoint is always scoped to a vendor. This used to answer a missing id — or ANY
    // failure — with the hard-coded "Meridian Cold Storage" session (RC-1182042 / TIN-6620194, 90%
    // confidence), which reviewers saw as the AI-extracted details of whichever vendor they had open.
    if (!vendorId) {
      return throwError(() => new Error('A vendor id is required to load the onboarding review'));
    }

    return this.http.get<OnboardingCopilotSession>(`${this.baseUrl}/vendor-management/onboarding-copilot/${vendorId}`);
  }

  confirmExtractedField(sessionId: string, fieldName: string, correctedValue?: string): Observable<ExtractedField> {
    return this.http.post<ExtractedField>(`${API_BASE}/ai/sentinel/onboarding-copilot/${sessionId}/fields/${fieldName}/confirm`, { correctedValue });
  }

  getSentinelSummaryStats(): Observable<SentinelSummaryStats> {
    return this.http.get<SentinelSummaryStats>(`${this.baseUrl}/vendor-management/sentinel/stats`);
  }

  getPendingVendors(page: number = 1, limit: number = 20, filters?: any): Observable<VendorListResponse> {
    this.loadingSubject.next(true);

    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('statuses', `${VendorStatus.PENDING_ONBOARDING},${VendorStatus.UNDER_REVIEW}`);

    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.tier) params = params.set('tier', filters.tier);
      if (filters.riskLevel) params = params.set('riskLevel', filters.riskLevel);
      if (filters.category) params = params.set('category', filters.category);
      if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params = params.set('dateTo', filters.dateTo);
    }

    return this.http.get<VendorListResponse>(`${API_BASE}/vendors/pending`, { params })
      .pipe(
        tap(response => {
          this.loadingSubject.next(false);
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to load pending vendors');
          return throwError(() => err);
        })
      );
  }

  /**
   * Approve a vendor (admin action)
   */
  approveVendor(id: string, notes?: string): Observable<Vendor> {
    this.loadingSubject.next(true);

    return this.http.patch<Vendor>(`${API_BASE}/vendors/${id}/approve`, { notes })
      .pipe(
        tap(vendor => {
          this.loadingSubject.next(false);
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to approve vendor');
          return throwError(() => err);
        })
      );
  }

  /**
   * Reject a vendor (admin action)
   */
  rejectVendor(id: string, reason: string): Observable<Vendor> {
    this.loadingSubject.next(true);

    return this.http.patch<Vendor>(`${API_BASE}/vendors/${id}/reject`, { reason })
      .pipe(
        tap(vendor => {
          this.loadingSubject.next(false);
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to reject vendor');
          return throwError(() => err);
        })
      );
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
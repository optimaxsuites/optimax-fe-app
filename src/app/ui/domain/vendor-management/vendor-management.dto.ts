// vendor-management.dto.ts
// ============================================================
// ENUMS
// ============================================================

export enum VendorStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    PENDING_ONBOARDING = 'PENDING_ONBOARDING',
    UNDER_REVIEW = 'UNDER_REVIEW',
    SUSPENDED = 'SUSPENDED',
    OFFBOARDED = 'OFFBOARDED',
    CONDITIONAL = 'CONDITIONAL'
}

export enum VendorTier {
    PREFERRED = 'PREFERRED',
    APPROVED = 'APPROVED',
    CONDITIONAL = 'CONDITIONAL'
}

export enum RiskLevel {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH'
}

export enum DocumentStatus {
    ACTIVE = 'ACTIVE',
    EXPIRING_SOON = 'EXPIRING_SOON',
    EXPIRED = 'EXPIRED',
    PENDING_VERIFICATION = 'PENDING_VERIFICATION',
    REJECTED = 'REJECTED'
}

export enum DocumentCategory {
    REGISTRATION = 'REGISTRATION',
    TAX = 'TAX',
    LICENCE = 'LICENCE',
    INSURANCE = 'INSURANCE',
    CERTIFICATION = 'CERTIFICATION'
}

export enum VendorLifecycleEvent {
    APPLIED = 'APPLIED',
    DOCUMENTS_SUBMITTED = 'DOCUMENTS_SUBMITTED',
    UNDER_REVIEW = 'UNDER_REVIEW',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    ACTIVATED = 'ACTIVATED',
    SUSPENDED = 'SUSPENDED',
    OFFBOARDED = 'OFFBOARDED'
}

export enum AlertSeverity {
    INFO = 'INFO',
    WARNING = 'WARNING',
    CRITICAL = 'CRITICAL'
}

// ============================================================
// CORE MODELS
// ============================================================

export interface Vendor {
    id: string;
    companyName: string;
    registrationNumber: string;
    taxId: string;
    email: string;
    phone: string;
    website?: string;
    address: VendorAddress;
    status: VendorStatus;
    tier: VendorTier;
    riskLevel: RiskLevel;
    performanceScore: number;
    totalProjects: number;
    winRate: number;
    averageRating: number;
    joinedDate: Date;
    lastActivityDate: Date;
    categories: string[]; // Service/product categories
    logo?: string;
    description?: string;
    paymentTerms?: string;
    bankDetails?: BankDetails;
    contacts: VendorContact[];
    documents: VendorDocument[];
    complianceStatus: ComplianceStatus;
    performanceMetrics: VendorPerformanceMetrics;
    lifecycleHistory: VendorLifecycleHistory[];
    riskAlerts: RiskAlert[];
    createdAt: Date;
    updatedAt: Date;
}

export interface VendorAddress {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
}

export interface BankDetails {
    bankName: string;
    accountNumber: string;
    accountName: string;
    swiftCode?: string;
    verified: boolean;
}

export interface VendorContact {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    isPrimary: boolean;
}

// ============================================================
// DOCUMENT MODELS
// ============================================================

export interface VendorDocument {
    id: string;
    category: DocumentCategory;
    name: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
    issueDate: Date;
    expiryDate: Date;
    status: DocumentStatus;
    isRequired: boolean;
    verifiedBy?: string;
    verifiedDate?: Date;
    verificationNotes?: string;
    daysUntilExpiry: number;
    uploadedAt: Date;
    uploadedBy: string;
    vendorId?: string;
    vendorName?: string;
}

export interface ComplianceStatus {
    isCompliant: boolean;
    documentsVerified: number;
    totalRequiredDocuments: number;
    expiredDocuments: number;
    expiringDocuments: number;
    lastComplianceCheck: Date;
    sanctionsClear: boolean;
}

// ============================================================
// PERFORMANCE MODELS
// ============================================================

export interface VendorPerformanceMetrics {
    overallScore: number;
    onTimeDeliveryRate: number; // 0-100
    qualityScore: number; // 0-100
    costCompetitiveness: number; // 0-100
    complianceScore: number; // 0-100
    ratingScore: number; // 0-100
    winRate: number; // 0-100
    totalProjects: number;
    totalRevenue: number;
    averageOrderValue: number;
    lastUpdated: Date;
    trendData: PerformanceTrendPoint[];
}

export interface PerformanceTrendPoint {
    period: string; // e.g., 'Jan 2026'
    score: number;
    onTimeDelivery: number;
    quality: number;
}

export interface VendorKPI {
    label: string;
    value: number | string;
    unit?: string;
    color: string;
    icon: string;
    trend: 'up' | 'down' | 'stable';
    percentChange: number;
}

// ============================================================
// RISK MODELS
// ============================================================

export interface RiskProfile {
    riskLevel: RiskLevel;
    overallScore: number; // 0-100
    factors: RiskFactor[];
    lastAssessed: Date;
    recommendations: string[];
}

export interface RiskFactor {
    name: string;
    score: number; // 0-100
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
}

export interface RiskAlert {
    id: string;
    vendorId: string;
    severity: AlertSeverity;
    type: string;
    title: string;
    description: string;
    detectedAt: Date;
    resolvedAt?: Date;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
    actionRequired: boolean;
    assignedTo?: string;
    resolutionNotes?: string;
}

export interface SanctionsCheckResult {
    vendorId: string;
    cleared: boolean;
    checkedAt: Date;
    matchesFound: number;
    details?: string;
    referenceId: string;
}

// ============================================================
// LIFECYCLE MODELS
// ============================================================

export interface VendorLifecycleHistory {
    id: string;
    event: VendorLifecycleEvent;
    description: string;
    performedBy: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface OnboardingData {
    companyName: string;
    registrationNumber: string;
    taxId: string;
    email: string;
    phone: string;
    address: VendorAddress;
    bankDetails: BankDetails;
    categories: string[];
    contacts: Omit<VendorContact, 'id'>[];
    documents: FileUploadData[];
    paymentTerms?: string;
    description?: string;
    website?: string;
}

export interface FileUploadData {
    category: DocumentCategory;
    fileName: string;
    file: File;
    issueDate: Date;
    expiryDate: Date;
}

export interface OnboardingResult {
    vendorId: string;
    status: VendorStatus;
    message: string;
    warnings: string[];
}

export interface OffboardingData {
    reason: string;
    finalizeOrders: boolean;
    finalPaymentIssued: boolean;
    notes: string;
    revokeAccess: boolean;
}

// ============================================================
// AI & PREDICTIVE MODELS
// ============================================================

export interface VendorPrediction {
    vendorId: string;
    metric: string;
    predictedValue: number;
    confidence: number;
    timeframe: string;
    actionable: boolean;
    suggestion?: string;
}

export interface VendorRankingData {
    vendorId: string;
    rank: number;
    score: number;
    factors: {
        price: number;
        delivery: number;
        performance: number;
        compliance: number;
    };
    recommendation: 'STRONG' | 'MODERATE' | 'WEAK';
}

export interface AnomalyDetection {
    vendorId: string;
    detected: boolean;
    type: 'PRICE_DEVIATION' | 'BANK_DETAIL_CHANGE' | 'DELIVERY_PATTERN' | 'QUOTATION_BEHAVIOR';
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    detectedAt: Date;
    reviewed: boolean;
    actionTaken?: string;
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export interface VendorDashboardStats {
    totalVendors: number;
    activeVendors: number;
    pendingOnboarding: number;
    pendingReview: number;
    highRiskVendors: number;
    expiringDocuments: number;
    averagePerformanceScore: number;
    vendorsByTier: {
        preferred: number;
        approved: number;
        conditional: number;
    };
    recentActivity: VendorRecentActivity[];
    expiringDocumentsList: VendorDocument[];
    topPerformers: Vendor[];
    riskAlertsCount: number;
    monthOverMonthGrowth: number;
}

export interface VendorRecentActivity {
    id: string;
    vendorId: string;
    vendorName: string;
    event: string;
    description: string;
    timestamp: Date;
    type: 'ONBOARDING' | 'PERFORMANCE' | 'RISK' | 'DOCUMENT' | 'ORDER' | 'GENERAL';
    icon: string;
    color: string;
}

// ============================================================
// CONTRACT MODELS
// ============================================================

export interface VendorContract {
    id: string;
    vendorId: string;
    title: string;
    contractNumber: string;
    startDate: Date;
    endDate: Date;
    renewalDate: Date;
    status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED';
    value: number;
    terms: string;
    documentUrl?: string;
    autoRenew: boolean;
    renewalReminderSent: boolean;
}

// ============================================================
// MESSAGING MODELS
// ============================================================

export interface VendorMessage {
    id: string;
    vendorId: string;
    senderId: string;
    senderName: string;
    senderType: 'INTERNAL' | 'VENDOR';
    subject: string;
    content: string;
    read: boolean;
    createdAt: Date;
    attachments?: string[];
}

export interface Dispute {
    id: string;
    vendorId: string;
    orderId?: string;
    title: string;
    description: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    createdBy: string;
    assignedTo?: string;
    createdAt: Date;
    resolvedAt?: Date;
    resolution?: string;
    messages: DisputeMessage[];
}

export interface DisputeMessage {
    id: string;
    disputeId: string;
    senderId: string;
    senderName: string;
    content: string;
    createdAt: Date;
    attachments?: string[];
}

// ============================================================
// DTO RESPONSE TYPES
// ============================================================

export interface VendorListResponse {
    vendors: Vendor[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface VendorPerformanceResponse {
    metrics: VendorPerformanceMetrics;
    kpis: VendorKPI[];
    ranking: VendorRankingData;
}

export interface VendorRiskResponse {
    riskProfile: RiskProfile;
    alerts: RiskAlert[];
    sanctionsStatus: SanctionsCheckResult;
    documentStatus: VendorDocument[];
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getVendorStatusColor(status: VendorStatus): string {
    const map: Record<VendorStatus, string> = {
        [VendorStatus.ACTIVE]: '#2EB270',
        [VendorStatus.INACTIVE]: '#6B7280',
        [VendorStatus.PENDING_ONBOARDING]: '#F59E0B',
        [VendorStatus.UNDER_REVIEW]: '#F97316',
        [VendorStatus.SUSPENDED]: '#DC2626',
        [VendorStatus.OFFBOARDED]: '#6B7280',
        [VendorStatus.CONDITIONAL]: '#8B5CF6'
    };
    return map[status] || '#6B7280';
}

export function getVendorTierLabel(tier: VendorTier): string {
    const map: Record<VendorTier, string> = {
        [VendorTier.PREFERRED]: '⭐ Preferred',
        [VendorTier.APPROVED]: '✓ Approved',
        [VendorTier.CONDITIONAL]: '⚠️ Conditional'
    };
    return map[tier] || tier;
}

export function getRiskLevelColor(level: RiskLevel): string {
    const map: Record<RiskLevel, string> = {
        [RiskLevel.LOW]: '#2EB270',
        [RiskLevel.MEDIUM]: '#F59E0B',
        [RiskLevel.HIGH]: '#DC2626'
    };
    return map[level] || '#6B7280';
}

export function getDocumentStatusColor(status: DocumentStatus): string {
    const map: Record<DocumentStatus, string> = {
        [DocumentStatus.ACTIVE]: '#2EB270',
        [DocumentStatus.EXPIRING_SOON]: '#F59E0B',
        [DocumentStatus.EXPIRED]: '#DC2626',
        [DocumentStatus.PENDING_VERIFICATION]: '#F97316',
        [DocumentStatus.REJECTED]: '#DC2626'
    };
    return map[status] || '#6B7280';
}
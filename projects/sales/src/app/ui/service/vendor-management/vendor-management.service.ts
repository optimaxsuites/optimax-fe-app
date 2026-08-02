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
  DocumentStatus,
  SentinelInsight,
  InsightType,
  InsightSeverity,
  InsightActionStatus,
  VendorRiskTrajectory,
  FraudFlag,
  OnboardingCopilotSession,
  ExtractedField,
  SmartVendorShortlistItem,
  SentinelQueryResult,
  SentinelGovernanceRule,
  SentinelActionLogEntry,
  SentinelSummaryStats,
  MessageThread,
  ThreadMessage,
  ThreadStatus,
  InternalNote,
  MessageAttachment,
  CannedTemplate,
  DisputeCase,
  DisputeCategory,
  DisputeStage,
  DisputeOutcome,
  DisputeTimelineEvent,
  DisputeEvidenceItem,
  ResolutionSummaryStats,
  ResolutionAuditLogEntry,
  LinkedRecord
} from '../../domain/vendor-management/vendor-management.dto';
import { environment } from '../../shared-component/service/environments/environment';

const API_BASE = environment.apiBaseUrl;

// ============================================================
// MOCK DATA — AI VENDOR INTELLIGENCE (SENTINEL)
// ============================================================

const MOCK_SENTINEL_INSIGHTS: SentinelInsight[] = [
  {
    id: 'ins-1',
    type: InsightType.PERFORMANCE_DECLINE,
    severity: InsightSeverity.HIGH,
    vendorId: 'v-204',
    vendorName: 'Vanguard Security Services',
    finding: 'Delivery performance down 15% over the last 3 RFQs.',
    reason: 'On-time delivery rate fell from 94% to 79% across the last three fulfilled RFQs, with two consecutive late shipments flagged in the last 21 days.',
    evidence: ['RFQ-2291: delivered 4 days late', 'RFQ-2305: delivered 2 days late', 'RFQ-2318: delivered on time but partial shipment'],
    suggestedActions: [
      { label: 'Review', action: 'review', style: 'primary' },
      { label: 'Message Vendor', action: 'message', style: 'secondary' },
      { label: 'Dismiss', action: 'dismiss', style: 'secondary' }
    ],
    status: InsightActionStatus.OPEN,
    detectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    confidence: 87
  },
  {
    id: 'ins-2',
    type: InsightType.FRAUD_ANOMALY,
    severity: InsightSeverity.CRITICAL,
    vendorId: 'v-217',
    vendorName: 'OmniCorp Facilities Ltd',
    finding: 'Bank details changed 2 days before the latest invoice.',
    reason: 'Bank account number and account name were updated 2 days prior to submission of a ₦4.2M invoice, a pattern statistically associated with payment redirection fraud.',
    evidence: ['Bank details modified: 26 Jul 2026, 11:42 PM', 'Invoice INV-88213 submitted: 28 Jul 2026, 09:10 AM', 'New account name partially mismatches registered company name'],
    suggestedActions: [
      { label: 'Investigate', action: 'investigate', style: 'primary' },
      { label: 'Approve', action: 'approve', style: 'secondary' },
      { label: 'Escalate', action: 'escalate', style: 'danger' }
    ],
    status: InsightActionStatus.OPEN,
    detectedAt: new Date(Date.now() - 45 * 60 * 1000),
    confidence: 92
  },
  {
    id: 'ins-3',
    type: InsightType.TIER_UPGRADE,
    severity: InsightSeverity.LOW,
    vendorId: 'v-101',
    vendorName: 'Apex Industrial Supplies Ltd',
    finding: '6 straight months above 95%. Eligible for tier upgrade.',
    reason: 'Overall performance score has remained above 95% for 6 consecutive months, with zero compliance flags and a 98% on-time delivery rate, qualifying it for the Preferred tier upgrade criteria.',
    evidence: ['Feb–Jul 2026: performance score 95.1%–98.4%', 'Zero compliance flags in 6 months', 'On-time delivery steady at 98%'],
    suggestedActions: [
      { label: 'Approve', action: 'approve', style: 'primary' },
      { label: 'Review', action: 'review', style: 'secondary' }
    ],
    status: InsightActionStatus.OPEN,
    detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    confidence: 95
  },
  {
    id: 'ins-4',
    type: InsightType.DOCUMENT_EXPIRY,
    severity: InsightSeverity.MEDIUM,
    vendorId: 'v-233',
    vendorName: 'Northbridge Cold Chain Logistics',
    finding: 'Insurance certificate expires in 9 days with no renewal on file.',
    reason: 'Public liability insurance policy expires in 9 days. No renewal document has been submitted and two automated reminders have gone unanswered.',
    evidence: ['Policy expiry: 06 Aug 2026', 'Reminder sent 14 Jul 2026 — no response', 'Reminder sent 21 Jul 2026 — no response'],
    suggestedActions: [
      { label: 'Message Vendor', action: 'message', style: 'primary' },
      { label: 'Review', action: 'review', style: 'secondary' },
      { label: 'Dismiss', action: 'dismiss', style: 'secondary' }
    ],
    status: InsightActionStatus.OPEN,
    detectedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    confidence: 99
  },
  {
    id: 'ins-5',
    type: InsightType.RISK_ESCALATION,
    severity: InsightSeverity.HIGH,
    vendorId: 'v-241',
    vendorName: 'Coastline Marine Freight Co.',
    finding: 'Dispute frequency has tripled in the last 90 days.',
    reason: '3 new disputes opened in the last 90 days versus an average of 1 per quarter historically, two of which cite short-delivery of goods.',
    evidence: ['Dispute #D-4021: short delivery', 'Dispute #D-4058: invoice mismatch', 'Dispute #D-4090: short delivery'],
    suggestedActions: [
      { label: 'Review', action: 'review', style: 'primary' },
      { label: 'Message Vendor', action: 'message', style: 'secondary' },
      { label: 'Dismiss', action: 'dismiss', style: 'secondary' }
    ],
    status: InsightActionStatus.OPEN,
    detectedAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    confidence: 81
  }
];

const MOCK_RISK_TRAJECTORIES: VendorRiskTrajectory[] = [
  {
    vendorId: 'v-204',
    vendorName: 'Vanguard Security Services',
    currentRiskLevel: RiskLevel.MEDIUM,
    direction: 'RISING',
    confidence: 84,
    reason: 'Declining delivery trend combined with a recent dispute and no compensating quality improvement.',
    drivers: [
      { label: 'Delivery trend', impact: 'negative', weight: 45 },
      { label: 'Dispute frequency', impact: 'negative', weight: 25 },
      { label: 'Document renewals current', impact: 'positive', weight: 10 }
    ],
    projections: [
      { horizonDays: 30, projectedRiskScore: 52, confidence: 88 },
      { horizonDays: 60, projectedRiskScore: 61, confidence: 82 },
      { horizonDays: 90, projectedRiskScore: 68, confidence: 76 }
    ],
    lastUpdated: new Date()
  },
  {
    vendorId: 'v-217',
    vendorName: 'OmniCorp Facilities Ltd',
    currentRiskLevel: RiskLevel.MEDIUM,
    direction: 'RISING',
    confidence: 90,
    reason: 'Unresolved fraud flag on bank details plus a prior late compliance renewal.',
    drivers: [
      { label: 'Fraud flag pending', impact: 'negative', weight: 55 },
      { label: 'Compliance history', impact: 'negative', weight: 15 }
    ],
    projections: [
      { horizonDays: 30, projectedRiskScore: 66, confidence: 90 },
      { horizonDays: 60, projectedRiskScore: 74, confidence: 85 },
      { horizonDays: 90, projectedRiskScore: 79, confidence: 79 }
    ],
    lastUpdated: new Date()
  },
  {
    vendorId: 'v-101',
    vendorName: 'Apex Industrial Supplies Ltd',
    currentRiskLevel: RiskLevel.LOW,
    direction: 'IMPROVING',
    confidence: 93,
    reason: 'Sustained high performance, zero disputes, and all documents current with early renewals.',
    drivers: [
      { label: 'Performance trend', impact: 'positive', weight: 50 },
      { label: 'Document renewals', impact: 'positive', weight: 20 },
      { label: 'Dispute frequency', impact: 'positive', weight: 15 }
    ],
    projections: [
      { horizonDays: 30, projectedRiskScore: 8, confidence: 94 },
      { horizonDays: 60, projectedRiskScore: 6, confidence: 91 },
      { horizonDays: 90, projectedRiskScore: 5, confidence: 88 }
    ],
    lastUpdated: new Date()
  },
  {
    vendorId: 'v-233',
    vendorName: 'Northbridge Cold Chain Logistics',
    currentRiskLevel: RiskLevel.LOW,
    direction: 'STABLE',
    confidence: 72,
    reason: 'Solid delivery record offset by an unresolved insurance renewal lapse risk.',
    drivers: [
      { label: 'Delivery trend', impact: 'positive', weight: 30 },
      { label: 'Document renewal lapse risk', impact: 'negative', weight: 30 }
    ],
    projections: [
      { horizonDays: 30, projectedRiskScore: 28, confidence: 75 },
      { horizonDays: 60, projectedRiskScore: 31, confidence: 70 },
      { horizonDays: 90, projectedRiskScore: 30, confidence: 66 }
    ],
    lastUpdated: new Date()
  },
  {
    vendorId: 'v-241',
    vendorName: 'Coastline Marine Freight Co.',
    currentRiskLevel: RiskLevel.MEDIUM,
    direction: 'RISING',
    confidence: 79,
    reason: 'Tripling dispute frequency is the dominant signal, with delivery metrics still nominally acceptable.',
    drivers: [
      { label: 'Dispute frequency', impact: 'negative', weight: 60 },
      { label: 'Delivery trend', impact: 'positive', weight: 10 }
    ],
    projections: [
      { horizonDays: 30, projectedRiskScore: 48, confidence: 82 },
      { horizonDays: 60, projectedRiskScore: 55, confidence: 77 },
      { horizonDays: 90, projectedRiskScore: 59, confidence: 71 }
    ],
    lastUpdated: new Date()
  }
];

const MOCK_FRAUD_FLAGS: FraudFlag[] = [
  {
    id: 'fraud-1',
    vendorId: 'v-217',
    vendorName: 'OmniCorp Facilities Ltd',
    type: 'BANK_DETAIL_CHANGE',
    title: 'Sudden bank detail change before large invoice',
    description: 'Bank account changed 2 days before a ₦4.2M invoice was submitted, with a partial mismatch between the new account name and registered company name.',
    severity: 'HIGH',
    evidence: [
      { label: 'Previous account name', value: 'OMNICORP FACILITIES LTD' },
      { label: 'New account name', value: 'OMNICORP FAC. SERVICES' },
      { label: 'Time between change and invoice', value: '2 days' },
      { label: 'Invoice amount', value: '₦4,200,000' }
    ],
    detectedAt: new Date(Date.now() - 45 * 60 * 1000),
    status: 'PENDING_REVIEW'
  },
  {
    id: 'fraud-2',
    vendorId: 'v-256',
    vendorName: 'BrightPath Office Supplies',
    type: 'DUPLICATE_INVOICE',
    title: 'Duplicate invoice number detected',
    description: 'Invoice INV-77120 was submitted twice within 48 hours against two different purchase orders, with identical line-item totals.',
    severity: 'MEDIUM',
    evidence: [
      { label: 'Invoice number', value: 'INV-77120' },
      { label: 'First submission', value: '24 Jul 2026, PO-9981' },
      { label: 'Second submission', value: '26 Jul 2026, PO-9998' }
    ],
    detectedAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
    status: 'INVESTIGATING'
  },
  {
    id: 'fraud-3',
    vendorId: 'v-262',
    vendorName: 'Sterling Print & Packaging',
    type: 'SUSPICIOUSLY_LOW_BID',
    title: 'Bid 41% below category average',
    description: 'Submitted RFQ bid is 41% below the 90-day category average for equivalent scope, well outside the normal competitive range.',
    severity: 'MEDIUM',
    evidence: [
      { label: 'Bid amount', value: '₦1,180,000' },
      { label: 'Category average (90 days)', value: '₦2,010,000' },
      { label: 'Deviation', value: '-41%' }
    ],
    detectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: 'PENDING_REVIEW'
  },
  {
    id: 'fraud-4',
    vendorId: 'v-270',
    vendorName: 'Delta Waterworks Engineering',
    type: 'DOCUMENT_METADATA_MISMATCH',
    title: 'Document metadata inconsistency on license upload',
    description: 'Uploaded operating license PDF metadata shows a creation date after the stated issue date, and font inconsistencies suggest partial editing.',
    severity: 'LOW',
    evidence: [
      { label: 'Stated issue date', value: '02 Jan 2025' },
      { label: 'File metadata creation date', value: '19 Jun 2026' },
      { label: 'Font consistency check', value: 'Failed on page 1' }
    ],
    detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    status: 'PENDING_REVIEW'
  }
];

const MOCK_ONBOARDING_COPILOT: OnboardingCopilotSession = {
  id: 'onb-copilot-1',
  vendorId: 'v-301',
  vendorName: 'Meridian Cold Storage Ltd',
  extractedFields: [
    { fieldName: 'Registration Number', extractedValue: 'RC-1182042', confidence: 97, sourceDocument: 'business_registration.pdf', confirmed: false },
    { fieldName: 'Tax ID', extractedValue: 'TIN-6620194', confidence: 95, sourceDocument: 'tax_certificate.pdf', confirmed: false },
    { fieldName: 'License Expiry', extractedValue: '14 Nov 2027', confidence: 89, sourceDocument: 'operating_license.pdf', confirmed: false },
    { fieldName: 'Registered Address', extractedValue: '22 Freight Lane, Apapa, Lagos', confidence: 78, sourceDocument: 'business_registration.pdf', confirmed: false },
    { fieldName: 'Insurance Policy Number', extractedValue: 'PLI-88213-NG', confidence: 91, sourceDocument: 'insurance_policy.pdf', confirmed: false }
  ],
  proposedRiskClassification: RiskLevel.MEDIUM,
  riskReasoning: [
    'No prior trading history with the marketplace (new applicant)',
    'All submitted documents verified as authentic with high OCR confidence',
    'Registered address could not be cross-matched against a third-party business registry',
    'Category (Cold Chain Logistics) carries moderate baseline risk due to compliance-sensitive handling requirements'
  ],
  overallExtractionConfidence: 90,
  status: 'AWAITING_CONFIRMATION'
};

const MOCK_SMART_SHORTLIST: SmartVendorShortlistItem[] = [
  {
    vendorId: 'v-101',
    vendorName: 'Apex Industrial Supplies Ltd',
    tier: VendorTier.PREFERRED,
    categoryMatchScore: 96,
    capacityScore: 90,
    costCompetitivenessScore: 88,
    overallFitScore: 94,
    reason: 'Strongest category history for Industrial Equipment with consistent on-time delivery and available capacity.'
  },
  {
    vendorId: 'v-102',
    vendorName: 'Global Tech Solutions PLC',
    tier: VendorTier.PREFERRED,
    categoryMatchScore: 84,
    capacityScore: 82,
    costCompetitivenessScore: 91,
    overallFitScore: 87,
    reason: 'Highly cost-competitive with solid delivery history, slightly less category depth than Apex.'
  },
  {
    vendorId: 'v-103',
    vendorName: 'Prime Logistics & Freight Services',
    tier: VendorTier.APPROVED,
    categoryMatchScore: 79,
    capacityScore: 95,
    costCompetitivenessScore: 75,
    overallFitScore: 81,
    reason: 'Highest available capacity in the shortlist; good fit for larger volume RFQs.'
  },
  {
    vendorId: 'v-233',
    vendorName: 'Northbridge Cold Chain Logistics',
    tier: VendorTier.APPROVED,
    categoryMatchScore: 88,
    capacityScore: 70,
    costCompetitivenessScore: 80,
    overallFitScore: 79,
    reason: 'Best specialist match for cold chain scope, capacity slightly limited this quarter.'
  }
];

const MOCK_GOVERNANCE_RULES: SentinelGovernanceRule[] = [
  { id: 'gov-1', actionLabel: 'Send document-expiry reminder', description: 'Automated email/portal reminder when a document is within 30 days of expiry.', autonomyLevel: 'AUTONOMOUS', editable: true },
  { id: 'gov-2', actionLabel: 'Flag performance decline for review', description: 'Surface a review card when delivery or quality drops beyond threshold.', autonomyLevel: 'AUTONOMOUS', editable: true },
  { id: 'gov-3', actionLabel: 'Recommend tier upgrade/downgrade', description: 'Propose a tier change based on sustained performance trends.', autonomyLevel: 'STAFF_APPROVAL_REQUIRED', editable: true },
  { id: 'gov-4', actionLabel: 'Suspend a vendor', description: 'Temporarily block a vendor from receiving new RFQs.', autonomyLevel: 'STAFF_APPROVAL_REQUIRED', editable: false },
  { id: 'gov-5', actionLabel: 'Change vendor tier', description: 'Move a vendor between Preferred, Approved, and Conditional tiers.', autonomyLevel: 'STAFF_APPROVAL_REQUIRED', editable: false },
  { id: 'gov-6', actionLabel: 'Terminate vendor relationship', description: 'Fully offboard a vendor from the marketplace.', autonomyLevel: 'STAFF_APPROVAL_REQUIRED', editable: false },
  { id: 'gov-7', actionLabel: 'Escalate fraud flag to compliance', description: 'Route a high-severity fraud flag directly to the compliance team queue.', autonomyLevel: 'AUTONOMOUS', editable: true }
];

const MOCK_ACTION_LOG: SentinelActionLogEntry[] = [
  { id: 'log-1', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), actionLabel: 'Sent document-expiry reminder', vendorName: 'Northbridge Cold Chain Logistics', performedBy: 'Sentinel AI', executionType: 'AUTO', dataSummary: 'Insurance policy expires in 9 days — reminder #2 sent via vendor portal.' },
  { id: 'log-2', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), actionLabel: 'Flagged performance decline', vendorName: 'Vanguard Security Services', performedBy: 'Sentinel AI', executionType: 'AUTO', dataSummary: 'On-time delivery rate dropped from 94% to 79% over 3 RFQs.' },
  { id: 'log-3', timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000), actionLabel: 'Approved tier upgrade', vendorName: 'Titan Freight Networks', performedBy: 'A. Okoro (Procurement Lead)', executionType: 'STAFF_APPROVED', dataSummary: 'Upgraded from Approved to Preferred following Sentinel recommendation; 7 months above 93% score.' },
  { id: 'log-4', timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000), actionLabel: 'Escalated fraud flag to compliance', vendorName: 'OmniCorp Facilities Ltd', performedBy: 'Sentinel AI', executionType: 'AUTO', dataSummary: 'Bank detail change + high-value invoice within 48 hours — routed to compliance queue.' },
  { id: 'log-5', timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), actionLabel: 'Confirmed onboarding extraction', vendorName: 'Solaris Renewable Systems', performedBy: 'C. Adeyemi (Vendor Ops)', executionType: 'STAFF_APPROVED', dataSummary: 'Confirmed 5 of 5 extracted fields; corrected registered address.' }
];

// ============================================================
// MOCK DATA — VENDOR RESOLUTION CENTER
// ============================================================

const MOCK_MESSAGE_THREADS: MessageThread[] = [
  {
    id: 'thr-1',
    vendorId: 'v-204',
    vendorName: 'Vanguard Security Services',
    subject: 'Re: RFQ-2026-089 Quotation',
    linkedRecord: { type: 'RFQ', id: 'RFQ-2026-089', label: 'RFQ-2026-089' },
    status: 'AWAITING_STAFF',
    lastMessageAt: new Date(Date.now() - 40 * 60 * 1000),
    lastMessagePreview: 'We can revise the delivery schedule if the site access window is confirmed by Friday.',
    unreadCount: 2,
    firstResponseTimeMinutes: 38,
    resolutionTimeMinutes: null,
    hasLinkedDispute: false,
    internalNotes: [
      { id: 'note-1', authorName: 'A. Okoro (Procurement Lead)', content: 'Flag to site ops before we confirm the access window — check with facilities first.', timestamp: new Date(Date.now() - 35 * 60 * 1000) }
    ],
    messages: [
      { id: 'm-1', sender: 'COMPANY', authorName: 'A. Okoro', content: 'Hi team, following up on RFQ-2026-089 — can you confirm delivery within 10 business days of PO issuance?', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), attachments: [] },
      { id: 'm-2', sender: 'VENDOR', authorName: 'Vanguard Security Services', content: 'Thanks for reaching out. 10 days is tight given current stock levels, but achievable if the site access window is confirmed in advance.', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), attachments: [] },
      { id: 'm-3', sender: 'VENDOR', authorName: 'Vanguard Security Services', content: 'We can revise the delivery schedule if the site access window is confirmed by Friday.', timestamp: new Date(Date.now() - 40 * 60 * 1000), attachments: [
        { id: 'att-1', fileName: 'revised_delivery_schedule.pdf', versions: [{ version: 1, fileName: 'revised_delivery_schedule.pdf', uploadedAt: new Date(Date.now() - 40 * 60 * 1000), uploadedBy: 'Vanguard Security Services' }] }
      ] }
    ]
  },
  {
    id: 'thr-2',
    vendorId: 'v-217',
    vendorName: 'OmniCorp Facilities Ltd',
    subject: 'Re: INV-88213 Payment Query',
    linkedRecord: { type: 'INVOICE', id: 'INV-88213', label: 'Invoice INV-88213' },
    status: 'OPEN',
    lastMessageAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    lastMessagePreview: 'We have paused processing this invoice pending a bank-details verification check.',
    unreadCount: 0,
    firstResponseTimeMinutes: 12,
    resolutionTimeMinutes: null,
    hasLinkedDispute: true,
    disputeCaseId: 'case-2',
    internalNotes: [],
    messages: [
      { id: 'm-4', sender: 'VENDOR', authorName: 'OmniCorp Facilities Ltd', content: 'Please confirm status of invoice INV-88213, it appears overdue.', timestamp: new Date(Date.now() - 21 * 60 * 60 * 1000), attachments: [] },
      { id: 'm-5', sender: 'COMPANY', authorName: 'D. Balogun (Accounts Payable)', content: 'We have paused processing this invoice pending a bank-details verification check.', timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000), attachments: [] }
    ]
  },
  {
    id: 'thr-3',
    vendorId: 'v-101',
    vendorName: 'Apex Industrial Supplies Ltd',
    subject: 'Onboarding welcome — Preferred tier',
    linkedRecord: { type: 'NONE', id: '', label: 'General' },
    status: 'RESOLVED',
    lastMessageAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    lastMessagePreview: 'Thank you — looking forward to continuing to work with the OptimaX team.',
    unreadCount: 0,
    firstResponseTimeMinutes: 55,
    resolutionTimeMinutes: 340,
    hasLinkedDispute: false,
    internalNotes: [],
    messages: [
      { id: 'm-6', sender: 'COMPANY', authorName: 'C. Adeyemi (Vendor Ops)', content: 'Congratulations — your consistent performance has qualified you for a tier upgrade review.', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), attachments: [] },
      { id: 'm-7', sender: 'VENDOR', authorName: 'Apex Industrial Supplies Ltd', content: 'Thank you — looking forward to continuing to work with the OptimaX team.', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), attachments: [] }
    ]
  },
  {
    id: 'thr-4',
    vendorId: 'v-241',
    vendorName: 'Coastline Marine Freight Co.',
    subject: 'Re: PO-7723 short delivery',
    linkedRecord: { type: 'PO', id: 'PO-7723', label: 'PO-7723' },
    status: 'AWAITING_VENDOR',
    lastMessageAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    lastMessagePreview: 'Please provide proof of dispatch for the missing 3 units by end of day tomorrow.',
    unreadCount: 0,
    firstResponseTimeMinutes: 95,
    resolutionTimeMinutes: null,
    hasLinkedDispute: true,
    disputeCaseId: 'case-4',
    internalNotes: [
      { id: 'note-2', authorName: 'A. Okoro (Procurement Lead)', content: 'Third short-delivery complaint in 90 days — loop in compliance once dispute is opened.', timestamp: new Date(Date.now() - 6.2 * 60 * 60 * 1000) }
    ],
    messages: [
      { id: 'm-8', sender: 'COMPANY', authorName: 'A. Okoro', content: 'PO-7723 was received short by 3 units against the manifest. Please advise.', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), attachments: [] },
      { id: 'm-9', sender: 'COMPANY', authorName: 'A. Okoro', content: 'Please provide proof of dispatch for the missing 3 units by end of day tomorrow.', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), attachments: [] }
    ]
  },
  {
    id: 'thr-5',
    vendorId: 'v-233',
    vendorName: 'Northbridge Cold Chain Logistics',
    subject: 'Document renewal reminder — Insurance Policy',
    linkedRecord: { type: 'DOCUMENT', id: 'doc-insurance-233', label: 'Insurance Certificate' },
    status: 'OPEN',
    lastMessageAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    lastMessagePreview: 'Your public liability insurance certificate expires on 06 Aug 2026. Please upload a renewal.',
    unreadCount: 0,
    firstResponseTimeMinutes: null,
    resolutionTimeMinutes: null,
    hasLinkedDispute: false,
    internalNotes: [],
    messages: [
      { id: 'm-10', sender: 'COMPANY', authorName: 'Sentinel AI (automated)', content: 'Your public liability insurance certificate expires on 06 Aug 2026. Please upload a renewal.', timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), attachments: [] }
    ]
  }
];

const MOCK_CANNED_TEMPLATES: CannedTemplate[] = [
  { id: 'tpl-1', name: 'Document Expiry Reminder', category: 'DOCUMENT_EXPIRY', content: 'Hello {{vendorName}}, our records show your {{documentName}} expires on {{expiryDate}}. Please upload a renewed copy at your earliest convenience to avoid disruption to your active RFQs.' },
  { id: 'tpl-2', name: 'Onboarding Welcome', category: 'ONBOARDING_WELCOME', content: 'Welcome to the OptimaX Marketplace, {{vendorName}}! Your application has been approved. You can now view open RFQs and manage your profile from the Vendor Portal.' },
  { id: 'tpl-3', name: 'Performance Review Notice', category: 'PERFORMANCE_REVIEW', content: 'Hello {{vendorName}}, this is a scheduled performance review notice. Your current scorecard is attached — please reach out if you would like to discuss any of the metrics.' },
  { id: 'tpl-4', name: 'Suspension Notice', category: 'SUSPENSION_NOTICE', content: 'Hello {{vendorName}}, following repeated unresolved compliance issues, your account has been temporarily suspended from receiving new RFQs pending review. Please contact your account manager for next steps.' }
];

const MOCK_DISPUTE_CASES: DisputeCase[] = [
  {
    id: 'case-2',
    caseNumber: 'DSP-2026-0142',
    vendorId: 'v-217',
    vendorName: 'OmniCorp Facilities Ltd',
    category: 'FRAUD_SUSPICION',
    subject: 'Suspicious bank detail change prior to invoice submission',
    linkedRecord: { type: 'INVOICE', id: 'INV-88213', label: 'Invoice INV-88213' },
    stage: 'UNDER_REVIEW',
    openedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000),
    ownerName: 'D. Balogun (Compliance)',
    threadId: 'thr-2',
    evidence: [
      { id: 'ev-1', fileName: 'bank_change_log.pdf', uploadedBy: 'Sentinel AI', uploadedAt: new Date(Date.now() - 20 * 60 * 60 * 1000) },
      { id: 'ev-2', fileName: 'invoice_INV-88213.pdf', uploadedBy: 'OmniCorp Facilities Ltd', uploadedAt: new Date(Date.now() - 20 * 60 * 60 * 1000) }
    ],
    timeline: [
      { id: 'tl-1', timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000), actor: 'Sentinel AI', action: 'Case opened', note: 'Auto-escalated from fraud flag: bank details changed 2 days before invoice submission.' },
      { id: 'tl-2', timestamp: new Date(Date.now() - 19 * 60 * 60 * 1000), actor: 'D. Balogun (Compliance)', action: 'Case assigned', note: 'Assigned to compliance for review.' },
      { id: 'tl-3', timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000), actor: 'D. Balogun (Compliance)', action: 'Moved to Under Review', note: 'Requested supporting bank documentation from vendor.' }
    ]
  },
  {
    id: 'case-4',
    caseNumber: 'DSP-2026-0138',
    vendorId: 'v-241',
    vendorName: 'Coastline Marine Freight Co.',
    category: 'DELIVERY_DELAY',
    subject: 'Short delivery on PO-7723 (3 units missing)',
    linkedRecord: { type: 'PO', id: 'PO-7723', label: 'PO-7723' },
    stage: 'VENDOR_NOTIFIED',
    openedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    slaDeadline: new Date(Date.now() + 40 * 60 * 60 * 1000),
    ownerName: 'A. Okoro (Procurement Lead)',
    threadId: 'thr-4',
    evidence: [
      { id: 'ev-3', fileName: 'delivery_manifest_PO-7723.pdf', uploadedBy: 'A. Okoro (Procurement Lead)', uploadedAt: new Date(Date.now() - 8 * 60 * 60 * 1000) }
    ],
    timeline: [
      { id: 'tl-4', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), actor: 'A. Okoro (Procurement Lead)', action: 'Case opened', note: 'This is the 3rd dispute against this vendor in 90 days.' },
      { id: 'tl-5', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), actor: 'A. Okoro (Procurement Lead)', action: 'Vendor notified', note: 'Requested proof of dispatch for missing units.' }
    ]
  },
  {
    id: 'case-5',
    caseNumber: 'DSP-2026-0121',
    vendorId: 'v-256',
    vendorName: 'BrightPath Office Supplies',
    category: 'PAYMENT',
    subject: 'Duplicate invoice submission — INV-77120',
    linkedRecord: { type: 'INVOICE', id: 'INV-77120', label: 'Invoice INV-77120' },
    stage: 'MEDIATION',
    openedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    slaDeadline: new Date(Date.now() - 6 * 60 * 60 * 1000),
    ownerName: 'D. Balogun (Accounts Payable)',
    evidence: [
      { id: 'ev-4', fileName: 'duplicate_invoice_comparison.xlsx', uploadedBy: 'D. Balogun (Accounts Payable)', uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
    ],
    timeline: [
      { id: 'tl-6', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), actor: 'Sentinel AI', action: 'Case opened', note: 'Escalated from duplicate invoice fraud flag.' },
      { id: 'tl-7', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), actor: 'D. Balogun (Accounts Payable)', action: 'Moved to Under Review' },
      { id: 'tl-8', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), actor: 'D. Balogun (Accounts Payable)', action: 'Moved to Mediation', note: 'Vendor disputes intent; scheduling a call to reconcile PO references.' }
    ]
  },
  {
    id: 'case-6',
    caseNumber: 'DSP-2026-0098',
    vendorId: 'v-270',
    vendorName: 'Delta Waterworks Engineering',
    category: 'QUALITY',
    subject: 'Non-conforming materials delivered against PO-6650',
    linkedRecord: { type: 'PO', id: 'PO-6650', label: 'PO-6650' },
    stage: 'CLOSED',
    openedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    slaDeadline: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    ownerName: 'A. Okoro (Procurement Lead)',
    outcome: 'VENDOR_WARNING',
    closedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    evidence: [
      { id: 'ev-5', fileName: 'qa_inspection_report.pdf', uploadedBy: 'A. Okoro (Procurement Lead)', uploadedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000) }
    ],
    timeline: [
      { id: 'tl-9', timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), actor: 'A. Okoro (Procurement Lead)', action: 'Case opened' },
      { id: 'tl-10', timestamp: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000), actor: 'A. Okoro (Procurement Lead)', action: 'Moved to Under Review' },
      { id: 'tl-11', timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), actor: 'A. Okoro (Procurement Lead)', action: 'Case closed', note: 'Second quality issue in 6 months — formal warning issued, no penalty this time.' }
    ]
  },
  {
    id: 'case-7',
    caseNumber: 'DSP-2026-0076',
    vendorId: 'v-262',
    vendorName: 'Sterling Print & Packaging',
    category: 'CONTRACT_BREACH',
    subject: 'Missed exclusivity clause on RFQ-2026-041',
    linkedRecord: { type: 'CONTRACT', id: 'CTR-4471', label: 'Contract CTR-4471' },
    stage: 'CLOSED',
    openedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    slaDeadline: new Date(Date.now() - 33 * 24 * 60 * 60 * 1000),
    ownerName: 'D. Balogun (Compliance)',
    outcome: 'NO_FAULT_FOUND',
    closedAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
    evidence: [],
    timeline: [
      { id: 'tl-12', timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), actor: 'D. Balogun (Compliance)', action: 'Case opened' },
      { id: 'tl-13', timestamp: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000), actor: 'D. Balogun (Compliance)', action: 'Case closed', note: 'Clause was ambiguous and did not clearly apply — no fault found on review.' }
    ]
  }
];

const MOCK_RESOLUTION_AUDIT_LOG: ResolutionAuditLogEntry[] = [
  { id: 'raudit-1', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), actor: 'A. Okoro (Procurement Lead)', action: 'Opened dispute case', targetType: 'DISPUTE', targetLabel: 'DSP-2026-0138 · Coastline Marine Freight Co.', details: 'Category: Delivery Delay. Linked to PO-7723.' },
  { id: 'raudit-2', timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), actor: 'A. Okoro (Procurement Lead)', action: 'Closed dispute case', targetType: 'DISPUTE', targetLabel: 'DSP-2026-0098 · Delta Waterworks Engineering', details: 'Outcome: Vendor Warning.' },
  { id: 'raudit-3', timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000), actor: 'Sentinel AI', action: 'Auto-escalated fraud flag to dispute case', targetType: 'DISPUTE', targetLabel: 'DSP-2026-0142 · OmniCorp Facilities Ltd', details: 'Bank detail change + high-value invoice triggered auto-escalation.' },
  { id: 'raudit-4', timestamp: new Date(Date.now() - 35 * 60 * 1000), actor: 'A. Okoro (Procurement Lead)', action: 'Added internal note', targetType: 'NOTE', targetLabel: 'Thread: Re: RFQ-2026-089 Quotation', details: 'Flag to site ops before we confirm the access window.' },
  { id: 'raudit-5', timestamp: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000), actor: 'D. Balogun (Compliance)', action: 'Closed dispute case', targetType: 'DISPUTE', targetLabel: 'DSP-2026-0076 · Sterling Print & Packaging', details: 'Outcome: No Fault Found.' }
];



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

    return this.http.get<any>(`${this.baseUrl}/vendors`, { params })
      .pipe(
        map(res => {
          const vendors: Vendor[] = Array.isArray(res) ? res : (res?.vendors ?? res?.data ?? []);
          const listResponse: VendorListResponse = { vendors, total: vendors.length, page, limit, totalPages: 1 };
          return listResponse;
        }),
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

  deleteVendor(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/vendors/${id}`).pipe(
      catchError((err) => { console.error('[VendorManagementService] deleteVendor failed:', err); return of(void 0); })
    );
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
  // AI VENDOR INTELLIGENCE (SENTINEL)
  // ============================================================

  private sentinelInsightsSubject = new BehaviorSubject<SentinelInsight[]>([]);
  sentinelInsights$ = this.sentinelInsightsSubject.asObservable();

  private fraudFlagsSubject = new BehaviorSubject<FraudFlag[]>([]);
  fraudFlags$ = this.fraudFlagsSubject.asObservable();

  private actionLogSubject = new BehaviorSubject<SentinelActionLogEntry[]>(MOCK_ACTION_LOG);
  actionLog$ = this.actionLogSubject.asObservable();

  private governanceRulesSubject = new BehaviorSubject<SentinelGovernanceRule[]>(MOCK_GOVERNANCE_RULES);
  governanceRules$ = this.governanceRulesSubject.asObservable();

  /**
   * Get the live, priority-sorted Sentinel insight feed
   */
  getSentinelInsights(): Observable<SentinelInsight[]> {
    return this.http.get<SentinelInsight[]>(`${API_BASE}/ai/sentinel/insights`)
      .pipe(
        tap(data => this.sentinelInsightsSubject.next(data)),
        catchError(() => {
          this.sentinelInsightsSubject.next(MOCK_SENTINEL_INSIGHTS);
          return of(MOCK_SENTINEL_INSIGHTS);
        })
      );
  }

  /**
   * Act on an insight card (review / message / dismiss / investigate / approve / escalate)
   */
  actOnInsight(insightId: string, action: string): Observable<SentinelInsight[]> {
    const current = this.sentinelInsightsSubject.value.length
      ? this.sentinelInsightsSubject.value
      : MOCK_SENTINEL_INSIGHTS;

    const updated = current.map(insight => {
      if (insight.id !== insightId) return insight;
      const status: InsightActionStatus = action === 'dismiss'
        ? InsightActionStatus.DISMISSED
        : action === 'review' || action === 'investigate'
          ? InsightActionStatus.REVIEWED
          : InsightActionStatus.ACTIONED;
      return { ...insight, status };
    });

    return this.http.post<SentinelInsight[]>(`${API_BASE}/ai/sentinel/insights/${insightId}/action`, { action })
      .pipe(
        tap(() => this.sentinelInsightsSubject.next(updated)),
        catchError(() => {
          this.sentinelInsightsSubject.next(updated);
          return of(updated);
        })
      );
  }

  /**
   * Get predictive risk trajectories (30/60/90 day projections) for all monitored vendors
   */
  getRiskTrajectories(): Observable<VendorRiskTrajectory[]> {
    return this.http.get<VendorRiskTrajectory[]>(`${API_BASE}/ai/sentinel/risk-trajectories`)
      .pipe(
        catchError(() => of(MOCK_RISK_TRAJECTORIES))
      );
  }

  /**
   * Get the fraud & anomaly review queue
   */
  getFraudFlags(): Observable<FraudFlag[]> {
    return this.http.get<FraudFlag[]>(`${API_BASE}/ai/sentinel/fraud-flags`)
      .pipe(
        tap(data => this.fraudFlagsSubject.next(data)),
        catchError(() => {
          this.fraudFlagsSubject.next(MOCK_FRAUD_FLAGS);
          return of(MOCK_FRAUD_FLAGS);
        })
      );
  }

  /**
   * Update the status of a fraud flag (investigate / approve / escalate) — never auto-executes
   * anything irreversible; suspension/termination always requires staff sign-off elsewhere.
   */
  updateFraudFlagStatus(flagId: string, status: FraudFlag['status']): Observable<FraudFlag[]> {
    const current = this.fraudFlagsSubject.value.length ? this.fraudFlagsSubject.value : MOCK_FRAUD_FLAGS;
    const updated = current.map(f => f.id === flagId ? { ...f, status } : f);

    return this.http.post<FraudFlag[]>(`${API_BASE}/ai/sentinel/fraud-flags/${flagId}/status`, { status })
      .pipe(
        tap(() => this.fraudFlagsSubject.next(updated)),
        catchError(() => {
          this.fraudFlagsSubject.next(updated);
          return of(updated);
        })
      );
  }

  /**
   * Get the onboarding copilot's extracted fields + proposed risk classification for a vendor application
   */
  getOnboardingCopilotSession(vendorId?: string): Observable<OnboardingCopilotSession> {
    const url = vendorId
      ? `${API_BASE}/ai/sentinel/onboarding-copilot/${vendorId}`
      : `${API_BASE}/ai/sentinel/onboarding-copilot`;

    return this.http.get<OnboardingCopilotSession>(url)
      .pipe(
        catchError(() => of(MOCK_ONBOARDING_COPILOT))
      );
  }

  /**
   * Confirm or correct a single extracted onboarding field — human always owns the final value
   */
  confirmExtractedField(sessionId: string, fieldName: string, correctedValue?: string): Observable<ExtractedField> {
    const field = MOCK_ONBOARDING_COPILOT.extractedFields.find(f => f.fieldName === fieldName);
    const result: ExtractedField = field
      ? { ...field, confirmed: true, corrected: !!correctedValue, extractedValue: correctedValue || field.extractedValue }
      : { fieldName, extractedValue: correctedValue || '', confidence: 100, sourceDocument: '', confirmed: true, corrected: !!correctedValue };

    return this.http.post<ExtractedField>(`${API_BASE}/ai/sentinel/onboarding-copilot/${sessionId}/fields/${fieldName}/confirm`, { correctedValue })
      .pipe(
        catchError(() => of(result))
      );
  }

  /**
   * Get a ranked shortlist of best-fit vendors for building an RFQ (Smart Vendor Selection)
   */
  getSmartVendorShortlist(category?: string): Observable<SmartVendorShortlistItem[]> {
    return this.http.get<SmartVendorShortlistItem[]>(`${API_BASE}/ai/sentinel/smart-shortlist`, {
      params: category ? new HttpParams().set('category', category) : undefined
    }).pipe(
      catchError(() => of(MOCK_SMART_SHORTLIST))
    );
  }

  /**
   * Ask Sentinel a natural-language question about the vendor base
   */
  querySentinel(query: string): Observable<SentinelQueryResult> {
    return this.http.post<SentinelQueryResult>(`${API_BASE}/ai/sentinel/ask`, { query })
      .pipe(
        catchError(() => of(this.buildMockSentinelAnswer(query)))
      );
  }

  private buildMockSentinelAnswer(query: string): SentinelQueryResult {
    const q = query.toLowerCase();

    if (q.includes('dispute')) {
      return {
        query,
        answer: '2 vendors had 2 or more disputes in the last 90 days: Coastline Marine Freight Co. (3 disputes) and BrightPath Office Supplies (2 disputes).',
        matchedVendors: [
          { vendorId: 'v-241', vendorName: 'Coastline Marine Freight Co.', detail: '3 disputes in 90 days — 2 citing short-delivery' },
          { vendorId: 'v-256', vendorName: 'BrightPath Office Supplies', detail: '2 disputes in 90 days — 1 duplicate invoice flag open' }
        ],
        generatedAt: new Date()
      };
    }
    if (q.includes('risk') || q.includes('rising')) {
      return {
        query,
        answer: '3 vendors currently show a Rising risk trajectory: Vanguard Security Services, OmniCorp Facilities Ltd, and Coastline Marine Freight Co.',
        matchedVendors: [
          { vendorId: 'v-204', vendorName: 'Vanguard Security Services', detail: 'Rising — 84% confidence, delivery trend declining' },
          { vendorId: 'v-217', vendorName: 'OmniCorp Facilities Ltd', detail: 'Rising — 90% confidence, unresolved fraud flag' },
          { vendorId: 'v-241', vendorName: 'Coastline Marine Freight Co.', detail: 'Rising — 79% confidence, dispute frequency tripled' }
        ],
        generatedAt: new Date()
      };
    }
    if (q.includes('fraud') || q.includes('bank')) {
      return {
        query,
        answer: '1 vendor has an unresolved bank-detail change flag: OmniCorp Facilities Ltd, pending review since this morning.',
        matchedVendors: [
          { vendorId: 'v-217', vendorName: 'OmniCorp Facilities Ltd', detail: 'Bank details changed 2 days before a ₦4.2M invoice — pending review' }
        ],
        generatedAt: new Date()
      };
    }
    return {
      query,
      answer: 'Based on current vendor data, here are the closest matches to your question. Try asking about disputes, risk trajectory, or fraud flags for more specific results.',
      matchedVendors: [
        { vendorId: 'v-101', vendorName: 'Apex Industrial Supplies Ltd', detail: 'Top performer — eligible for tier upgrade' }
      ],
      generatedAt: new Date()
    };
  }

  /**
   * Get the summary strip stats (active insights, fraud flags pending, actions this week, prediction confidence)
   */
  getSentinelSummaryStats(): Observable<SentinelSummaryStats> {
    return this.http.get<SentinelSummaryStats>(`${API_BASE}/ai/sentinel/summary`)
      .pipe(
        catchError(() => of({
          activeInsights: MOCK_SENTINEL_INSIGHTS.filter(i => i.status === InsightActionStatus.OPEN).length,
          criticalInsights: MOCK_SENTINEL_INSIGHTS.filter(i => i.severity === InsightSeverity.CRITICAL).length,
          fraudFlagsPending: MOCK_FRAUD_FLAGS.filter(f => f.status === 'PENDING_REVIEW').length,
          actionsAutoThisWeek: MOCK_ACTION_LOG.filter(a => a.executionType === 'AUTO').length + 9,
          actionsStaffApprovedThisWeek: MOCK_ACTION_LOG.filter(a => a.executionType === 'STAFF_APPROVED').length + 3,
          averagePredictionConfidence: Math.round(
            MOCK_RISK_TRAJECTORIES.reduce((sum, t) => sum + t.confidence, 0) / MOCK_RISK_TRAJECTORIES.length
          )
        }))
      );
  }

  /**
   * Get the auditable "Actions Taken by Sentinel" log
   */
  getSentinelActionLog(): Observable<SentinelActionLogEntry[]> {
    return this.http.get<SentinelActionLogEntry[]>(`${API_BASE}/ai/sentinel/action-log`)
      .pipe(
        tap(data => this.actionLogSubject.next(data)),
        catchError(() => of(MOCK_ACTION_LOG))
      );
  }

  /**
   * Get the governance panel rules (what Sentinel may do autonomously vs. what always needs sign-off)
   */
  getGovernanceRules(): Observable<SentinelGovernanceRule[]> {
    return this.http.get<SentinelGovernanceRule[]>(`${API_BASE}/ai/sentinel/governance-rules`)
      .pipe(
        catchError(() => of(MOCK_GOVERNANCE_RULES))
      );
  }

  /**
   * Toggle a governance rule's autonomy level. Non-editable rules (e.g. suspend/terminate/change tier)
   * are enforced client-side to always require staff sign-off.
   */
  updateGovernanceRule(ruleId: string, autonomyLevel: SentinelGovernanceRule['autonomyLevel']): Observable<SentinelGovernanceRule[]> {
    const current = this.governanceRulesSubject.value;
    const updated = current.map(r => (r.id === ruleId && r.editable) ? { ...r, autonomyLevel } : r);

    return this.http.post<SentinelGovernanceRule[]>(`${API_BASE}/ai/sentinel/governance-rules/${ruleId}`, { autonomyLevel })
      .pipe(
        tap(() => this.governanceRulesSubject.next(updated)),
        catchError(() => {
          this.governanceRulesSubject.next(updated);
          return of(updated);
        })
      );
  }

  // ============================================================
  // VENDOR RESOLUTION CENTER (MESSAGING & DISPUTE RESOLUTION)
  // ============================================================

  private messageThreadsSubject = new BehaviorSubject<MessageThread[]>([]);
  messageThreads$ = this.messageThreadsSubject.asObservable();

  private disputeCasesSubject = new BehaviorSubject<DisputeCase[]>([]);
  disputeCases$ = this.disputeCasesSubject.asObservable();

  private resolutionAuditLogSubject = new BehaviorSubject<ResolutionAuditLogEntry[]>(MOCK_RESOLUTION_AUDIT_LOG);
  resolutionAuditLog$ = this.resolutionAuditLogSubject.asObservable();

  /**
   * Get all message threads (optionally filtered by vendor — used by the vendor profile's
   * Communication tab so history never needs to be hunted for separately)
   */
  getMessageThreads(vendorId?: string): Observable<MessageThread[]> {
    return this.http.get<MessageThread[]>(`${API_BASE}/resolution/threads`, {
      params: vendorId ? new HttpParams().set('vendorId', vendorId) : undefined
    }).pipe(
      tap(data => this.messageThreadsSubject.next(data)),
      catchError(() => {
        const data = vendorId ? MOCK_MESSAGE_THREADS.filter(t => t.vendorId === vendorId) : MOCK_MESSAGE_THREADS;
        this.messageThreadsSubject.next(this.messageThreadsSubject.value.length ? this.messageThreadsSubject.value : MOCK_MESSAGE_THREADS);
        return of(data);
      })
    );
  }

  /**
   * Send a message on a thread (company-side). Pre-fills context is handled client-side by
   * passing a linkedRecord when opening a new thread from a Directory row or RFQ.
   */
  sendThreadMessage(threadId: string, content: string, authorName: string = 'You'): Observable<ThreadMessage> {
    const newMessage: ThreadMessage = {
      id: 'm-' + Math.random().toString(36).slice(2, 9),
      sender: 'COMPANY',
      authorName,
      content,
      timestamp: new Date(),
      attachments: []
    };

    const current = this.messageThreadsSubject.value.length ? this.messageThreadsSubject.value : MOCK_MESSAGE_THREADS;
    const updated = current.map(t => t.id === threadId
      ? { ...t, messages: [...t.messages, newMessage], lastMessageAt: newMessage.timestamp, lastMessagePreview: content, status: 'AWAITING_VENDOR' as ThreadStatus }
      : t);

    return this.http.post<ThreadMessage>(`${API_BASE}/resolution/threads/${threadId}/messages`, { content })
      .pipe(
        tap(() => this.messageThreadsSubject.next(updated)),
        catchError(() => {
          this.messageThreadsSubject.next(updated);
          return of(newMessage);
        })
      );
  }

  /**
   * Add a private internal note to a thread — never visible to the vendor
   */
  addInternalNote(threadId: string, content: string, authorName: string = 'You'): Observable<InternalNote> {
    const newNote: InternalNote = {
      id: 'note-' + Math.random().toString(36).slice(2, 9),
      authorName,
      content,
      timestamp: new Date()
    };

    const current = this.messageThreadsSubject.value.length ? this.messageThreadsSubject.value : MOCK_MESSAGE_THREADS;
    const updated = current.map(t => t.id === threadId
      ? { ...t, internalNotes: [...t.internalNotes, newNote] }
      : t);

    return this.http.post<InternalNote>(`${API_BASE}/resolution/threads/${threadId}/notes`, { content })
      .pipe(
        tap(() => this.messageThreadsSubject.next(updated)),
        catchError(() => {
          this.messageThreadsSubject.next(updated);
          return of(newNote);
        })
      );
  }

  /**
   * Update a thread's status (e.g. mark Resolved / Archived)
   */
  updateThreadStatus(threadId: string, status: ThreadStatus): Observable<MessageThread[]> {
    const current = this.messageThreadsSubject.value.length ? this.messageThreadsSubject.value : MOCK_MESSAGE_THREADS;
    const updated = current.map(t => t.id === threadId ? { ...t, status } : t);

    return this.http.post<MessageThread[]>(`${API_BASE}/resolution/threads/${threadId}/status`, { status })
      .pipe(
        tap(() => this.messageThreadsSubject.next(updated)),
        catchError(() => {
          this.messageThreadsSubject.next(updated);
          return of(updated);
        })
      );
  }

  /**
   * Get canned templates for repetitive company-side notices
   */
  getCannedTemplates(): Observable<CannedTemplate[]> {
    return this.http.get<CannedTemplate[]>(`${API_BASE}/resolution/templates`)
      .pipe(
        catchError(() => of(MOCK_CANNED_TEMPLATES))
      );
  }

  /**
   * Get all dispute cases
   */
  getDisputeCases(vendorId?: string): Observable<DisputeCase[]> {
    return this.http.get<DisputeCase[]>(`${API_BASE}/resolution/disputes`, {
      params: vendorId ? new HttpParams().set('vendorId', vendorId) : undefined
    }).pipe(
      tap(data => this.disputeCasesSubject.next(data)),
      catchError(() => {
        const data = vendorId ? MOCK_DISPUTE_CASES.filter(c => c.vendorId === vendorId) : MOCK_DISPUTE_CASES;
        this.disputeCasesSubject.next(this.disputeCasesSubject.value.length ? this.disputeCasesSubject.value : MOCK_DISPUTE_CASES);
        return of(data);
      })
    );
  }

  /**
   * Open a new dispute case, either from an escalated thread or directly against a record
   */
  openDisputeCase(payload: {
    vendorId: string;
    vendorName: string;
    category: DisputeCategory;
    subject: string;
    linkedRecord: LinkedRecord;
    ownerName: string;
    threadId?: string;
  }): Observable<DisputeCase> {
    const newCase: DisputeCase = {
      id: 'case-' + Math.random().toString(36).slice(2, 9),
      caseNumber: 'DSP-2026-' + Math.floor(1000 + Math.random() * 8999),
      vendorId: payload.vendorId,
      vendorName: payload.vendorName,
      category: payload.category,
      subject: payload.subject,
      linkedRecord: payload.linkedRecord,
      stage: 'OPENED',
      openedAt: new Date(),
      slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      ownerName: payload.ownerName,
      threadId: payload.threadId,
      evidence: [],
      timeline: [
        { id: 'tl-' + Math.random().toString(36).slice(2, 9), timestamp: new Date(), actor: payload.ownerName, action: 'Case opened' }
      ]
    };

    const current = this.disputeCasesSubject.value.length ? this.disputeCasesSubject.value : MOCK_DISPUTE_CASES;
    const updated = [newCase, ...current];

    return this.http.post<DisputeCase>(`${API_BASE}/resolution/disputes`, payload)
      .pipe(
        tap(() => this.disputeCasesSubject.next(updated)),
        catchError(() => {
          this.disputeCasesSubject.next(updated);
          return of(newCase);
        })
      );
  }

  /**
   * Advance a dispute case to the next pipeline stage, with a timeline entry
   */
  advanceDisputeStage(caseId: string, stage: DisputeStage, actor: string = 'You', note?: string): Observable<DisputeCase[]> {
    const current = this.disputeCasesSubject.value.length ? this.disputeCasesSubject.value : MOCK_DISPUTE_CASES;
    const updated = current.map(c => {
      if (c.id !== caseId) return c;
      const event: DisputeTimelineEvent = {
        id: 'tl-' + Math.random().toString(36).slice(2, 9),
        timestamp: new Date(),
        actor,
        action: `Moved to ${stage.replace('_', ' ')}`,
        note
      };
      return { ...c, stage, timeline: [...c.timeline, event] };
    });

    return this.http.post<DisputeCase[]>(`${API_BASE}/resolution/disputes/${caseId}/stage`, { stage, note })
      .pipe(
        tap(() => this.disputeCasesSubject.next(updated)),
        catchError(() => {
          this.disputeCasesSubject.next(updated);
          return of(updated);
        })
      );
  }

  /**
   * Close a dispute case with a required structured outcome — this is what feeds the outcome
   * back into the vendor's risk/performance profile (e.g. 3 Vendor Warnings in 90 days).
   */
  closeDisputeCase(caseId: string, outcome: DisputeOutcome, actor: string = 'You', note?: string): Observable<DisputeCase[]> {
    const current = this.disputeCasesSubject.value.length ? this.disputeCasesSubject.value : MOCK_DISPUTE_CASES;
    const updated = current.map(c => {
      if (c.id !== caseId) return c;
      const event: DisputeTimelineEvent = {
        id: 'tl-' + Math.random().toString(36).slice(2, 9),
        timestamp: new Date(),
        actor,
        action: 'Case closed',
        note: note || `Outcome recorded: ${outcome.replace('_', ' ')}`
      };
      return { ...c, stage: 'CLOSED' as DisputeStage, outcome, closedAt: new Date(), timeline: [...c.timeline, event] };
    });

    return this.http.post<DisputeCase[]>(`${API_BASE}/resolution/disputes/${caseId}/close`, { outcome, note })
      .pipe(
        tap(() => this.disputeCasesSubject.next(updated)),
        catchError(() => {
          this.disputeCasesSubject.next(updated);
          return of(updated);
        })
      );
  }

  /**
   * Get the resolution center summary strip stats
   */
  getResolutionSummaryStats(): Observable<ResolutionSummaryStats> {
    return this.http.get<ResolutionSummaryStats>(`${API_BASE}/resolution/summary`)
      .pipe(
        catchError(() => {
          const threads = this.messageThreadsSubject.value.length ? this.messageThreadsSubject.value : MOCK_MESSAGE_THREADS;
          const cases = this.disputeCasesSubject.value.length ? this.disputeCasesSubject.value : MOCK_DISPUTE_CASES;
          const openThreads = threads.filter(t => t.status === 'OPEN' || t.status === 'AWAITING_VENDOR' || t.status === 'AWAITING_STAFF');
          const openCases = cases.filter(c => c.stage !== 'CLOSED');
          const overdueCases = openCases.filter(c => new Date(c.slaDeadline).getTime() < Date.now());
          const responseTimes = threads.map(t => t.firstResponseTimeMinutes).filter((v): v is number => v !== null);
          const resolutionTimes = threads.map(t => t.resolutionTimeMinutes).filter((v): v is number => v !== null);

          return of({
            openConversations: openThreads.length,
            openDisputes: openCases.length,
            overdueDisputes: overdueCases.length,
            avgFirstResponseMinutes: responseTimes.length ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0,
            avgResolutionMinutes: resolutionTimes.length ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length) : 0
          });
        })
      );
  }

  /**
   * Get the immutable audit log for the resolution center (audit-ready compliance trail)
   */
  getResolutionAuditLog(): Observable<ResolutionAuditLogEntry[]> {
    return this.http.get<ResolutionAuditLogEntry[]>(`${API_BASE}/resolution/audit-log`)
      .pipe(
        tap(data => this.resolutionAuditLogSubject.next(data)),
        catchError(() => of(MOCK_RESOLUTION_AUDIT_LOG))
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

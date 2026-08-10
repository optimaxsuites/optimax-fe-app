// vendor-management.service.ts
// ============================================================
// IMPORTS
// ============================================================

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
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
  LinkedRecord,
  AlertSeverity
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
      {
        id: 'm-3', sender: 'VENDOR', authorName: 'Vanguard Security Services', content: 'We can revise the delivery schedule if the site access window is confirmed by Friday.', timestamp: new Date(Date.now() - 40 * 60 * 1000), attachments: [
          { id: 'att-1', fileName: 'revised_delivery_schedule.pdf', versions: [{ version: 1, fileName: 'revised_delivery_schedule.pdf', uploadedAt: new Date(Date.now() - 40 * 60 * 1000), uploadedBy: 'Vanguard Security Services' }] }
        ]
      }
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

// ============================================================
// ============================================================
// PENDING VENDOR STORE — shared in-memory bridge between the
// Vendor Portal and the Vendor Management side so that portal
// submissions appear in the Approval Queue even when the backend
// API is unavailable (dev / mock mode).  The store also persists
// to localStorage so entries survive a page refresh.
// ============================================================

export class PendingVendorStore {
  private static readonly STORAGE_KEY = 'erp_pending_vendors';
  private static store: Map<string, Vendor> = PendingVendorStore.rehydrate();

  private static rehydrate(): Map<string, Vendor> {
    try {
      const raw = localStorage.getItem(PendingVendorStore.STORAGE_KEY);
      if (!raw) return new Map();
      const arr: Vendor[] = JSON.parse(raw);
      return new Map(arr.map(v => [v.id, v]));
    } catch {
      return new Map();
    }
  }

  private static persist(): void {
    try {
      localStorage.setItem(
        PendingVendorStore.STORAGE_KEY,
        JSON.stringify(Array.from(PendingVendorStore.store.values()))
      );
    } catch { /* ignore quota errors */ }
  }

  static add(vendor: Vendor): void {
    PendingVendorStore.store.set(vendor.id, vendor);
    PendingVendorStore.persist();
  }

  static getAll(): Vendor[] {
    return Array.from(PendingVendorStore.store.values());
  }

  static getById(id: string): Vendor | undefined {
    return PendingVendorStore.store.get(id);
  }

  static updateStatus(id: string, status: VendorStatus): Vendor | null {
    const vendor = PendingVendorStore.store.get(id);
    if (!vendor) return null;
    const updated: Vendor = { ...vendor, status, updatedAt: new Date() };
    PendingVendorStore.store.set(id, updated);
    PendingVendorStore.persist();
    return updated;
  }

  static remove(id: string): void {
    PendingVendorStore.store.delete(id);
    PendingVendorStore.persist();
  }

  static clear(): void {
    PendingVendorStore.store.clear();
    localStorage.removeItem(PendingVendorStore.STORAGE_KEY);
  }
}

export class TenantVendorApprovalStore {
  private static readonly STORAGE_KEY = 'erp_tenant_vendor_approvals';
  private static store: Map<string, Map<string, VendorStatus>> = TenantVendorApprovalStore.rehydrate();

  private static rehydrate(): Map<string, Map<string, VendorStatus>> {
    try {
      const raw = localStorage.getItem(TenantVendorApprovalStore.STORAGE_KEY);
      if (!raw) return new Map();
      const parsed: Record<string, Record<string, VendorStatus>> = JSON.parse(raw);
      const newStore = new Map<string, Map<string, VendorStatus>>();
      for (const [tenantId, approvals] of Object.entries(parsed)) {
        newStore.set(tenantId, new Map(Object.entries(approvals)));
      }
      return newStore;
    } catch {
      return new Map();
    }
  }

  private static persist(): void {
    try {
      const obj: Record<string, Record<string, VendorStatus>> = {};
      for (const [tenantId, innerMap] of TenantVendorApprovalStore.store.entries()) {
        obj[tenantId] = Object.fromEntries(innerMap.entries());
      }
      localStorage.setItem(TenantVendorApprovalStore.STORAGE_KEY, JSON.stringify(obj));
    } catch { /* ignore */ }
  }

  static getStatus(tenantId: string, vendorId: string): VendorStatus | null {
    const tenantMap = TenantVendorApprovalStore.store.get(tenantId);
    return tenantMap ? tenantMap.get(vendorId) || null : null;
  }

  static setStatus(tenantId: string, vendorId: string, status: VendorStatus): void {
    if (!TenantVendorApprovalStore.store.has(tenantId)) {
      TenantVendorApprovalStore.store.set(tenantId, new Map());
    }
    TenantVendorApprovalStore.store.get(tenantId)!.set(vendorId, status);
    TenantVendorApprovalStore.persist();
  }

  static clear(): void {
    TenantVendorApprovalStore.store.clear();
    localStorage.removeItem(TenantVendorApprovalStore.STORAGE_KEY);
  }
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

  private readonly useMockData: boolean = false;

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
  // MOCK DATA INSIDE THE CLASS
  // ============================================================

  private readonly MOCK_DASHBOARD_STATS: VendorDashboardStats = {
    totalVendors: 145,
    activeVendors: 120,
    pendingOnboarding: 15,
    pendingReview: 10,
    highRiskVendors: 5,
    expiringDocuments: 12,
    averagePerformanceScore: 92.5,
    vendorsByTier: {
      preferred: 40,
      approved: 70,
      conditional: 35
    },
    recentActivity: [
      {
        id: 'activity-1',
        vendorId: 'v-101',
        vendorName: 'TechCorp Solutions',
        event: 'Onboarding completed',
        description: 'Vendor profile was approved and moved to active status.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        type: 'ONBOARDING',
        icon: 'fa-user-check',
        color: '#2EB270'
      },
      {
        id: 'activity-2',
        vendorId: 'v-204',
        vendorName: 'Vanguard Security Services',
        event: 'Risk alert raised',
        description: 'A performance decline alert was triggered for this vendor.',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        type: 'RISK',
        icon: 'fa-exclamation-triangle',
        color: '#F59E0B'
      }
    ],
    expiringDocumentsList: [
      {
        id: 'doc-1',
        category: DocumentCategory.REGISTRATION,
        name: 'Business Registration',
        fileName: 'registration.pdf',
        fileUrl: '#',
        fileSize: 2048,
        fileType: 'pdf',
        issueDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        status: DocumentStatus.EXPIRING_SOON,
        isRequired: true,
        daysUntilExpiry: 12,
        uploadedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        uploadedBy: 'Ops Team',
        vendorId: 'v-102',
        vendorName: 'Global Logistics Ltd'
      } as VendorDocument,
      {
        id: 'doc-2',
        category: DocumentCategory.INSURANCE,
        name: 'Insurance Certificate',
        fileName: 'insurance.pdf',
        fileUrl: '#',
        fileSize: 1536,
        fileType: 'pdf',
        issueDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: DocumentStatus.EXPIRING_SOON,
        isRequired: false,
        daysUntilExpiry: 5,
        uploadedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        uploadedBy: 'Compliance',
        vendorId: 'v-101',
        vendorName: 'TechCorp Solutions'
      } as VendorDocument
    ],
    topPerformers: [
      {
        id: 'v-101',
        companyName: 'TechCorp Solutions',
        registrationNumber: 'RC1029384',
        taxId: 'TIN-483920',
        email: 'contact@techcorp.com',
        phone: '+2348012345678',
        status: VendorStatus.ACTIVE,
        tier: VendorTier.PREFERRED,
        riskLevel: RiskLevel.LOW,
        performanceScore: 95.4,
        totalProjects: 42,
        winRate: 65,
        averageRating: 4.8,
        categories: ['IT Services', 'Hardware'],
        address: { street: '12 Tech Ave', city: 'Lagos', state: 'Lagos', country: 'Nigeria', postalCode: '100001' },
        createdAt: new Date(),
        updatedAt: new Date(),
        contacts: [],
        documents: [],
        complianceStatus: {
          isCompliant: true,
          documentsVerified: 5,
          totalRequiredDocuments: 5,
          expiredDocuments: 0,
          expiringDocuments: 0,
          lastComplianceCheck: new Date(),
          sanctionsClear: true
        },
        performanceMetrics: {
          overallScore: 95.4,
          onTimeDeliveryRate: 98,
          qualityScore: 94,
          costCompetitiveness: 90,
          complianceScore: 97,
          ratingScore: 95,
          winRate: 65,
          totalProjects: 42,
          totalRevenue: 12500000,
          averageOrderValue: 297619,
          lastUpdated: new Date(),
          trendData: []
        },
        lifecycleHistory: [],
        riskAlerts: [],
        joinedDate: new Date(),
        lastActivityDate: new Date()
      } as unknown as Vendor,
      {
        id: 'v-203',
        companyName: 'Apex Industrial Supplies Ltd',
        registrationNumber: 'RC7765421',
        taxId: 'TIN-332198',
        email: 'sales@apex.com',
        phone: '+2348123456789',
        status: VendorStatus.ACTIVE,
        tier: VendorTier.APPROVED,
        riskLevel: RiskLevel.LOW,
        performanceScore: 92.8,
        totalProjects: 28,
        winRate: 61,
        averageRating: 4.6,
        categories: ['Manufacturing'],
        address: { street: '88 Factory Rd', city: 'Abuja', state: 'FCT', country: 'Nigeria', postalCode: '900001' },
        createdAt: new Date(),
        updatedAt: new Date(),
        contacts: [],
        documents: [],
        complianceStatus: {
          isCompliant: true,
          documentsVerified: 5,
          totalRequiredDocuments: 5,
          expiredDocuments: 0,
          expiringDocuments: 0,
          lastComplianceCheck: new Date(),
          sanctionsClear: true
        },
        performanceMetrics: {
          overallScore: 92.8,
          onTimeDeliveryRate: 95,
          qualityScore: 91,
          costCompetitiveness: 89,
          complianceScore: 94,
          ratingScore: 93,
          winRate: 61,
          totalProjects: 28,
          totalRevenue: 8500000,
          averageOrderValue: 303571,
          lastUpdated: new Date(),
          trendData: []
        },
        lifecycleHistory: [],
        riskAlerts: [],
        joinedDate: new Date(),
        lastActivityDate: new Date()
      } as unknown as Vendor
    ],
    riskAlertsCount: 8,
    monthOverMonthGrowth: 4.5
  };

  private readonly MOCK_VENDORS: Vendor[] = [
    {
      id: 'v-101',
      companyName: 'TechCorp Solutions',
      registrationNumber: 'RC1029384',
      taxId: 'TIN-483920',
      email: 'contact@techcorp.com',
      phone: '+2348012345678',
      status: VendorStatus.ACTIVE,
      tier: VendorTier.PREFERRED,
      riskLevel: RiskLevel.LOW,
      performanceScore: 95.4,
      totalProjects: 42,
      winRate: 65,
      averageRating: 4.8,
      categories: ['IT Services', 'Hardware'],
      address: { street: '12 Tech Ave', city: 'Lagos', state: 'Lagos', country: 'Nigeria', postalCode: '100001' },
      contacts: [], documents: [],
      complianceStatus: { isCompliant: true, documentsVerified: 5, totalRequiredDocuments: 5, expiredDocuments: 0, expiringDocuments: 0, lastComplianceCheck: new Date(), sanctionsClear: true },
      performanceMetrics: { overallScore: 95.4, onTimeDeliveryRate: 98, qualityScore: 94, costCompetitiveness: 90, complianceScore: 97, ratingScore: 95, winRate: 65, totalProjects: 42, totalRevenue: 12500000, averageOrderValue: 297619, lastUpdated: new Date(), trendData: [] },
      lifecycleHistory: [], riskAlerts: [],
      joinedDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      lastActivityDate: new Date(),
      createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    } as Vendor,
    {
      id: 'v-102',
      companyName: 'Global Logistics Ltd',
      registrationNumber: 'RC5544332',
      taxId: 'TIN-994823',
      email: 'info@globallogistics.com',
      phone: '+2348099887766',
      status: VendorStatus.PENDING_ONBOARDING,
      tier: VendorTier.CONDITIONAL,
      riskLevel: RiskLevel.MEDIUM,
      performanceScore: 0,
      totalProjects: 0,
      winRate: 0,
      averageRating: 0,
      categories: ['Logistics', 'Supply Chain'],
      address: { street: '45 Trade Rd', city: 'Abuja', state: 'FCT', country: 'Nigeria', postalCode: '900001' },
      contacts: [], documents: [],
      complianceStatus: { isCompliant: false, documentsVerified: 2, totalRequiredDocuments: 5, expiredDocuments: 0, expiringDocuments: 0, lastComplianceCheck: new Date(), sanctionsClear: true },
      performanceMetrics: { overallScore: 0, onTimeDeliveryRate: 0, qualityScore: 0, costCompetitiveness: 0, complianceScore: 0, ratingScore: 0, winRate: 0, totalProjects: 0, totalRevenue: 0, averageOrderValue: 0, lastUpdated: new Date(), trendData: [] },
      lifecycleHistory: [], riskAlerts: [],
      joinedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lastActivityDate: new Date(),
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    } as Vendor,
    {
      id: 'v-103',
      companyName: 'Meridian Cold Storage Ltd',
      registrationNumber: 'RC8876543',
      taxId: 'TIN-112233',
      email: 'admin@meridiancs.com',
      phone: '+2348077665544',
      status: VendorStatus.UNDER_REVIEW,
      tier: VendorTier.APPROVED,
      riskLevel: RiskLevel.MEDIUM,
      performanceScore: 0,
      totalProjects: 0,
      winRate: 0,
      averageRating: 0,
      categories: ['Cold Chain', 'Logistics'],
      address: { street: '22 Freight Lane', city: 'Lagos', state: 'Lagos', country: 'Nigeria', postalCode: '100003' },
      contacts: [], documents: [],
      complianceStatus: { isCompliant: false, documentsVerified: 4, totalRequiredDocuments: 5, expiredDocuments: 0, expiringDocuments: 0, lastComplianceCheck: new Date(), sanctionsClear: true },
      performanceMetrics: { overallScore: 0, onTimeDeliveryRate: 0, qualityScore: 0, costCompetitiveness: 0, complianceScore: 0, ratingScore: 0, winRate: 0, totalProjects: 0, totalRevenue: 0, averageOrderValue: 0, lastUpdated: new Date(), trendData: [] },
      lifecycleHistory: [], riskAlerts: [],
      joinedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      lastActivityDate: new Date(),
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    } as Vendor,
    {
      id: 'v-204',
      companyName: 'Vanguard Security Services',
      registrationNumber: 'RC2034567',
      taxId: 'TIN-567890',
      email: 'ops@vanguardsecurity.com',
      phone: '+2348056789012',
      status: VendorStatus.ACTIVE,
      tier: VendorTier.APPROVED,
      riskLevel: RiskLevel.MEDIUM,
      performanceScore: 79.0,
      totalProjects: 18,
      winRate: 55,
      averageRating: 4.1,
      categories: ['Security', 'Facility Management'],
      address: { street: '34 Guard Lane', city: 'Lagos', state: 'Lagos', country: 'Nigeria', postalCode: '100002' },
      contacts: [], documents: [],
      complianceStatus: { isCompliant: true, documentsVerified: 5, totalRequiredDocuments: 5, expiredDocuments: 0, expiringDocuments: 0, lastComplianceCheck: new Date(), sanctionsClear: true },
      performanceMetrics: { overallScore: 79.0, onTimeDeliveryRate: 79, qualityScore: 80, costCompetitiveness: 75, complianceScore: 82, ratingScore: 80, winRate: 55, totalProjects: 18, totalRevenue: 5400000, averageOrderValue: 300000, lastUpdated: new Date(), trendData: [] },
      lifecycleHistory: [], riskAlerts: [],
      joinedDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      lastActivityDate: new Date(),
      createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    } as Vendor,
    {
      id: 'v-233',
      companyName: 'Northbridge Cold Chain Logistics',
      registrationNumber: 'RC3344556',
      taxId: 'TIN-778899',
      email: 'logistics@northbridge.com',
      phone: '+2348034567890',
      status: VendorStatus.ACTIVE,
      tier: VendorTier.APPROVED,
      riskLevel: RiskLevel.LOW,
      performanceScore: 88.5,
      totalProjects: 31,
      winRate: 60,
      averageRating: 4.4,
      categories: ['Logistics', 'Cold Chain', 'Warehousing'],
      address: { street: '7 Cold Storage Ave', city: 'Port Harcourt', state: 'Rivers', country: 'Nigeria', postalCode: '500001' },
      contacts: [], documents: [],
      complianceStatus: { isCompliant: true, documentsVerified: 5, totalRequiredDocuments: 5, expiredDocuments: 0, expiringDocuments: 1, lastComplianceCheck: new Date(), sanctionsClear: true },
      performanceMetrics: { overallScore: 88.5, onTimeDeliveryRate: 90, qualityScore: 87, costCompetitiveness: 84, complianceScore: 88, ratingScore: 89, winRate: 60, totalProjects: 31, totalRevenue: 9300000, averageOrderValue: 300000, lastUpdated: new Date(), trendData: [] },
      lifecycleHistory: [], riskAlerts: [],
      joinedDate: new Date(Date.now() - 280 * 24 * 60 * 60 * 1000),
      lastActivityDate: new Date(),
      createdAt: new Date(Date.now() - 280 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    } as Vendor
  ];

  // ADD THIS - Mock performance metrics inside the class
  private readonly MOCK_PERFORMANCE_METRICS: VendorPerformanceMetrics = {
    overallScore: 87.5,
    onTimeDeliveryRate: 92,
    qualityScore: 85,
    costCompetitiveness: 78,
    complianceScore: 94,
    ratingScore: 4.5,
    winRate: 68,
    totalProjects: 42,
    totalRevenue: 12500000,
    averageOrderValue: 297619,
    lastUpdated: new Date(),
    trendData: [
      { period: 'Aug 2025', score: 78, onTimeDelivery: 82, quality: 75 },
      { period: 'Sep 2025', score: 80, onTimeDelivery: 85, quality: 78 },
      { period: 'Oct 2025', score: 83, onTimeDelivery: 88, quality: 80 },
      { period: 'Nov 2025', score: 85, onTimeDelivery: 90, quality: 82 },
      { period: 'Dec 2025', score: 86, onTimeDelivery: 91, quality: 84 },
      { period: 'Jan 2026', score: 88, onTimeDelivery: 93, quality: 86 },
      { period: 'Feb 2026', score: 87, onTimeDelivery: 92, quality: 85 },
      { period: 'Mar 2026', score: 90, onTimeDelivery: 94, quality: 88 },
      { period: 'Apr 2026', score: 92, onTimeDelivery: 95, quality: 90 },
      { period: 'May 2026', score: 91, onTimeDelivery: 94, quality: 89 },
      { period: 'Jun 2026', score: 93, onTimeDelivery: 96, quality: 91 },
      { period: 'Jul 2026', score: 95, onTimeDelivery: 97, quality: 93 }
    ]
  };



  private readonly MOCK_RISK_ALERTS: RiskAlert[] = [
    {
      id: 'alert-1',
      vendorId: 'v-101',
      severity: AlertSeverity.CRITICAL,
      type: 'COMPLIANCE',
      title: 'Expired Insurance Certificate',
      description: 'The vendor\'s insurance certificate has expired. Immediate action required.',
      detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'OPEN',
      actionRequired: true,
      assignedTo: 'Compliance Team'
    },
    {
      id: 'alert-2',
      vendorId: 'v-101',
      severity: AlertSeverity.WARNING,
      type: 'PERFORMANCE',
      title: 'Performance Decline Detected',
      description: 'On-time delivery rate dropped below 90% in the last 30 days.',
      detectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      status: 'IN_PROGRESS',
      actionRequired: true
    },
    {
      id: 'alert-3',
      vendorId: 'v-101',
      severity: AlertSeverity.INFO,
      type: 'DOCUMENT',
      title: 'Document Renewal Reminder',
      description: 'Business registration certificate expires in 30 days.',
      detectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'OPEN',
      actionRequired: false
    },
    // Add alerts for other vendors
    {
      id: 'alert-4',
      vendorId: 'v-102',
      severity: AlertSeverity.WARNING,
      type: 'COMPLIANCE',
      title: 'Missing Tax Certificate',
      description: 'Tax certificate has not been uploaded for this vendor.',
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      status: 'OPEN',
      actionRequired: true,
      assignedTo: 'Compliance Team'
    },
    {
      id: 'alert-5',
      vendorId: 'v-203',
      severity: AlertSeverity.INFO,
      type: 'DOCUMENT',
      title: 'Document Review Required',
      description: 'Operating license needs to be reviewed for renewal.',
      detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'OPEN',
      actionRequired: false
    }
  ];

  // vendor-management.service.ts - Add this inside the VendorService class

  private readonly MOCK_DOCUMENTS: VendorDocument[] = [
    {
      id: 'doc-1',
      vendorId: 'v-101',
      category: DocumentCategory.REGISTRATION,
      name: 'Business Registration Certificate',
      fileName: 'business_registration_v101.pdf',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileSize: 2457600,
      fileType: 'application/pdf',
      issueDate: new Date('2024-01-15'),
      expiryDate: new Date('2027-01-14'),
      status: DocumentStatus.ACTIVE,
      isRequired: true,
      daysUntilExpiry: 162,
      uploadedAt: new Date('2024-01-20'),
      uploadedBy: 'Vendor User'
    },
    {
      id: 'doc-2',
      vendorId: 'v-101',
      category: DocumentCategory.TAX,
      name: 'Tax Certificate (TIN)',
      fileName: 'tax_certificate_v101.pdf',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileSize: 1843200,
      fileType: 'application/pdf',
      issueDate: new Date('2024-02-01'),
      expiryDate: new Date('2027-01-31'),
      status: DocumentStatus.ACTIVE,
      isRequired: true,
      daysUntilExpiry: 159,
      uploadedAt: new Date('2024-02-05'),
      uploadedBy: 'Vendor User'
    },
    {
      id: 'doc-3',
      vendorId: 'v-101',
      category: DocumentCategory.LICENCE,
      name: 'Business Operating Licence',
      fileName: 'operating_licence_v101.pdf',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileSize: 3072000,
      fileType: 'application/pdf',
      issueDate: new Date('2023-06-01'),
      expiryDate: new Date('2024-11-30'),
      status: DocumentStatus.EXPIRING_SOON,
      isRequired: true,
      daysUntilExpiry: 28,
      uploadedAt: new Date('2023-06-10'),
      uploadedBy: 'Vendor User'
    },
    {
      id: 'doc-4',
      vendorId: 'v-101',
      category: DocumentCategory.INSURANCE,
      name: 'Public Liability Insurance',
      fileName: 'insurance_policy_v101.pdf',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileSize: 1560000,
      fileType: 'application/pdf',
      issueDate: new Date('2023-08-15'),
      expiryDate: new Date('2024-08-14'),
      status: DocumentStatus.EXPIRED,
      isRequired: false,
      daysUntilExpiry: -5,
      uploadedAt: new Date('2023-08-20'),
      uploadedBy: 'Vendor User'
    },
    {
      id: 'doc-5',
      vendorId: 'v-101',
      category: DocumentCategory.CERTIFICATION,
      name: 'ISO 9001 Certification',
      fileName: 'iso_certification_v101.pdf',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileSize: 2048000,
      fileType: 'application/pdf',
      issueDate: new Date('2024-03-01'),
      expiryDate: new Date('2025-03-01'),
      status: DocumentStatus.PENDING_VERIFICATION,
      isRequired: false,
      daysUntilExpiry: 210,
      uploadedAt: new Date('2024-03-05'),
      uploadedBy: 'Vendor User'
    },
    {
      id: 'doc-6',
      vendorId: 'v-102',
      category: DocumentCategory.REGISTRATION,
      name: 'Business Registration Certificate',
      fileName: 'business_registration_v102.pdf',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileSize: 2355200,
      fileType: 'application/pdf',
      issueDate: new Date('2024-02-10'),
      expiryDate: new Date('2027-02-09'),
      status: DocumentStatus.ACTIVE,
      isRequired: true,
      daysUntilExpiry: 175,
      uploadedAt: new Date('2024-02-15'),
      uploadedBy: 'Vendor User'
    }
  ];

  private readonly MOCK_LIFECYCLE_HISTORY: VendorLifecycleHistory[] = [
    {
      id: 'life-1',
      vendorId: 'v-101',
      event: VendorLifecycleEvent.APPLIED,
      description: 'Vendor application submitted via the Vendor Portal',
      performedBy: 'Vendor User',
      timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      metadata: { source: 'portal', applicationId: 'APP-2026-001' }
    },
    {
      id: 'life-2',
      vendorId: 'v-101',
      event: VendorLifecycleEvent.DOCUMENTS_SUBMITTED,
      description: 'Business registration, tax certificate, and operating licence uploaded',
      performedBy: 'Vendor User',
      timestamp: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      metadata: { documents: ['registration.pdf', 'tax.pdf', 'licence.pdf'] }
    },
    {
      id: 'life-3',
      vendorId: 'v-101',
      event: VendorLifecycleEvent.UNDER_REVIEW,
      description: 'Application moved to under review by procurement team',
      performedBy: 'A. Okoro (Procurement Lead)',
      timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      metadata: { assignedTo: 'A. Okoro' }
    },
    {
      id: 'life-4',
      vendorId: 'v-101',
      event: VendorLifecycleEvent.APPROVED,
      description: 'Vendor application approved after document verification',
      performedBy: 'A. Okoro (Procurement Lead)',
      timestamp: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
      metadata: { approvedBy: 'A. Okoro', notes: 'All documents verified successfully' }
    },
    {
      id: 'life-5',
      vendorId: 'v-101',
      event: VendorLifecycleEvent.ACTIVATED,
      description: 'Vendor account activated in the marketplace',
      performedBy: 'System',
      timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      metadata: { status: 'ACTIVE' }
    },
    {
      id: 'life-6',
      vendorId: 'v-101',
      event: VendorLifecycleEvent.PERFORMANCE_UPDATE,
      description: 'Performance score updated to 95.4% - Vendor upgraded to Preferred Tier',
      performedBy: 'Sentinel AI',
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      metadata: { oldScore: 88, newScore: 95.4, oldTier: 'APPROVED', newTier: 'PREFERRED' }
    },
    {
      id: 'life-7',
      vendorId: 'v-101',
      event: VendorLifecycleEvent.DOCUMENT_VERIFIED,
      description: 'Insurance certificate verified and approved',
      performedBy: 'D. Balogun (Compliance)',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      metadata: { documentId: 'doc-insurance-101', status: 'VERIFIED' }
    },
    {
      id: 'life-8',
      vendorId: 'v-101',
      event: VendorLifecycleEvent.RISK_ALERT,
      description: 'Performance decline alert triggered - On-time delivery rate dropped below 90%',
      performedBy: 'Sentinel AI',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      metadata: { alertId: 'alert-101', type: 'PERFORMANCE_DECLINE', severity: 'WARNING' }
    }
  ];


  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(private http: HttpClient) { }

  // ============================================================
  // DASHBOARD
  // ============================================================

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
          this.dashboardStatsSubject.next(this.MOCK_DASHBOARD_STATS);
          return of(this.MOCK_DASHBOARD_STATS);
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
    const totalProjects = raw.totalProjects ?? raw.total_projects ?? raw.projectCount ?? 0;
    return {
      id: raw.id || raw._id || raw.vendorId || '',
      companyName: raw.companyName || raw.company_name || raw.name || raw.company || '',
      registrationNumber: raw.registrationNumber || raw.registration_number || raw.regNumber || raw.rc_number || '',
      taxId: raw.taxId || raw.tax_id || raw.tin || raw.taxNumber || '',
      email: raw.email || raw.emailAddress || raw.email_address || '',
      phone: raw.phone || raw.phoneNumber || raw.phone_number || raw.mobile || '',
      website: raw.website || raw.websiteUrl || raw.web_site || undefined,
      address: raw.address || { street: '', city: '', state: '', country: 'Nigeria', postalCode: '' },
      status: (raw.status || raw.vendorStatus || VendorStatus.PENDING_ONBOARDING) as VendorStatus,
      tier: (raw.tier || raw.vendorTier || VendorTier.APPROVED) as VendorTier,
      riskLevel: (raw.riskLevel || raw.risk_level || raw.risk || RiskLevel.LOW) as RiskLevel,
      performanceScore,
      totalProjects,
      winRate: raw.winRate ?? raw.win_rate ?? 0,
      averageRating: raw.averageRating ?? raw.average_rating ?? raw.rating ?? 0,
      joinedDate: raw.joinedDate ? new Date(raw.joinedDate) : (raw.createdAt ? new Date(raw.createdAt) : new Date()),
      lastActivityDate: raw.lastActivityDate ? new Date(raw.lastActivityDate) : (raw.updatedAt ? new Date(raw.updatedAt) : new Date()),
      categories: Array.isArray(raw.categories) ? raw.categories : [],
      logo: raw.logo || raw.logoUrl || undefined,
      description: raw.description || '',
      paymentTerms: raw.paymentTerms || raw.payment_terms || 'Net 30',
      bankDetails: raw.bankDetails || raw.bank_details || undefined,
      contacts: Array.isArray(raw.contacts) ? raw.contacts : [],
      documents: Array.isArray(raw.documents) ? raw.documents : [],
      complianceStatus: raw.complianceStatus || raw.compliance_status || {
        isCompliant: true, documentsVerified: 0, totalRequiredDocuments: 0,
        expiredDocuments: 0, expiringDocuments: 0, lastComplianceCheck: new Date(), sanctionsClear: true
      },
      performanceMetrics: raw.performanceMetrics || raw.performance_metrics || {
        overallScore: performanceScore, onTimeDeliveryRate: 0, qualityScore: 0,
        costCompetitiveness: 0, complianceScore: 0, ratingScore: 0,
        winRate: raw.winRate ?? 0, totalProjects,
        totalRevenue: raw.totalRevenue ?? raw.total_revenue ?? 0,
        averageOrderValue: 0, lastUpdated: new Date(), trendData: []
      },
      lifecycleHistory: Array.isArray(raw.lifecycleHistory) ? raw.lifecycleHistory : [],
      riskAlerts: Array.isArray(raw.riskAlerts) ? raw.riskAlerts : [],
      createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
      applicationNumber: raw.applicationNumber || raw.application_number || undefined,
      // The backend was originally POSTed the full 6-step registration payload
      // (see VendorRegistrationService.submit) — preserve it here too if the
      // GET response still carries it, under either shape.
      registration: raw.registration || (raw.step1 ? {
        id: raw.id, applicationNumber: raw.applicationNumber, status: raw.registrationStatus || raw.status,
        submittedDate: raw.submittedDate, lastModified: raw.updatedAt,
        step1: raw.step1, step2: raw.step2, step3: raw.step3,
        step4: raw.step4, step5: raw.step5, step6: raw.step6,
      } : undefined),
    } as Vendor;
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
      .set('tenantId', this.tenantId)
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

    if (this.useMockData) {
      const allMock = [
        ...this.MOCK_VENDORS,
        ...PendingVendorStore.getAll()
      ];
      // Deduplicate — store entries take precedence (they have live status)
      const seen = new Set<string>();
      let mockVendors = allMock.filter(v => {
        if (seen.has(v.id)) return false;
        seen.add(v.id);
        return true;
      });

      // Apply tenant-specific status override
      mockVendors = mockVendors.map(v => {
        const tenantStatus = TenantVendorApprovalStore.getStatus(this.tenantId, v.id);
        if (tenantStatus) {
          return { ...v, status: tenantStatus };
        }
        return v;
      });

      if (filters?.statuses && Array.isArray(filters.statuses)) {
        mockVendors = mockVendors.filter(v => filters.statuses!.includes(v.status));
      } else if (filters?.status) {
        mockVendors = mockVendors.filter(v => v.status === filters.status);
      }

      const listResponse: VendorListResponse = {
        vendors: mockVendors,
        total: mockVendors.length,
        page,
        limit,
        totalPages: 1
      };
      this.vendorsSubject.next(mockVendors);
      this.loadingSubject.next(false);
      return of(listResponse);
    }

    return this.http.get<any>(`${this.baseUrl}/vendors`, { params })
      .pipe(
        map(res => {
          const rawVendors: any[] = Array.isArray(res)
            ? res
            : (res?.vendors ?? res?.data ?? res?.content ?? []);
          const vendors: Vendor[] = rawVendors.map(v => this.mapVendor(v));

          const resultVendors = vendors.length ? vendors : this.filterMockVendors(filters);
          const totalCount = res?.total ?? res?.totalCount ?? res?.totalElements ?? resultVendors.length;
          const totalPages = res?.totalPages ?? res?.pages ?? Math.max(Math.ceil(totalCount / limit), 1);
          const listResponse: VendorListResponse = {
            vendors: resultVendors,
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
        catchError(err => {
          this.loadingSubject.next(false);
          const fallbackVendors = this.filterMockVendors(filters);
          const listResponse: VendorListResponse = { vendors: fallbackVendors, total: fallbackVendors.length, page, limit, totalPages: 1 };
          this.vendorsSubject.next(fallbackVendors);
          return of(listResponse);
        })
      );
  }

  getVendorById(id: string): Observable<Vendor> {
    this.loadingSubject.next(true);

    // Check the live cache first, then the shared portal store
    const cachedVendor = this.vendorsSubject.value.find(v => v.id === id)
      ?? PendingVendorStore.getById(id);
    if (cachedVendor) {
      this.selectedVendorSubject.next(cachedVendor);
      this.loadingSubject.next(false);
      return of(cachedVendor);
    }

    return this.http.get<Vendor>(`${this.baseUrl}/vendors/${id}`)
      .pipe(
        tap(vendor => {
          this.selectedVendorSubject.next(vendor);
          this.loadingSubject.next(false);
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          // Check the portal store first, then fall back to static mocks
          const storeVendor = PendingVendorStore.getById(id);
          const fallbackVendor = storeVendor || this.MOCK_VENDORS.find(v => v.id === id) || this.MOCK_VENDORS[0];
          if (fallbackVendor) {
            const vendorWithDefaults: Vendor = {
              ...fallbackVendor,
              id: id,
              companyName: fallbackVendor.companyName || 'Mock Vendor',
              registrationNumber: fallbackVendor.registrationNumber || 'RC000000',
              taxId: fallbackVendor.taxId || 'TAX-000',
              email: fallbackVendor.email || 'vendor@example.com',
              phone: fallbackVendor.phone || '+2348000000000',
              status: fallbackVendor.status || VendorStatus.ACTIVE,
              tier: fallbackVendor.tier || VendorTier.APPROVED,
              riskLevel: fallbackVendor.riskLevel || RiskLevel.LOW,
              performanceScore: fallbackVendor.performanceScore || 90,
              totalProjects: fallbackVendor.totalProjects || 10,
              winRate: fallbackVendor.winRate || 60,
              averageRating: fallbackVendor.averageRating || 4.5,
              categories: fallbackVendor.categories || ['General'],
              address: fallbackVendor.address || { street: 'N/A', city: 'N/A', state: 'N/A', country: 'Nigeria', postalCode: '000000' },
              contacts: fallbackVendor.contacts || [],
              documents: fallbackVendor.documents || [],
              complianceStatus: fallbackVendor.complianceStatus || {
                isCompliant: true,
                documentsVerified: 3,
                totalRequiredDocuments: 3,
                expiredDocuments: 0,
                expiringDocuments: 0,
                lastComplianceCheck: new Date(),
                sanctionsClear: true
              },
              performanceMetrics: fallbackVendor.performanceMetrics || {
                overallScore: 90,
                onTimeDeliveryRate: 92,
                qualityScore: 90,
                costCompetitiveness: 88,
                complianceScore: 91,
                ratingScore: 90,
                winRate: 60,
                totalProjects: 10,
                totalRevenue: 5000000,
                averageOrderValue: 250000,
                lastUpdated: new Date(),
                trendData: []
              },
              lifecycleHistory: fallbackVendor.lifecycleHistory || [],
              riskAlerts: fallbackVendor.riskAlerts || [],
              createdAt: fallbackVendor.createdAt || new Date(),
              updatedAt: fallbackVendor.updatedAt || new Date(),
              joinedDate: fallbackVendor.joinedDate || new Date(),
              lastActivityDate: fallbackVendor.lastActivityDate || new Date(),
              paymentTerms: fallbackVendor.paymentTerms || 'Net 30',
              bankDetails: fallbackVendor.bankDetails || {
                bankName: 'First Bank',
                accountNumber: '0000000000',
                accountName: 'Vendor Account',
                swiftCode: 'FBNINGLA',
                verified: true
              },
              description: fallbackVendor.description || 'Mock vendor profile loaded locally.'
            } as Vendor;
            this.selectedVendorSubject.next(vendorWithDefaults);
            return of(vendorWithDefaults);
          }
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

  updateVendorStatus(id: string, status: VendorStatus): Observable<Vendor> {
    return this.http.patch<Vendor>(`${this.baseUrl}/vendors/${id}/review`, { status })
      .pipe(
        map(raw => this.mapVendor(raw)),
        tap(vendor => {
          this.selectedVendorSubject.next(vendor);
          this.updateVendorInList(vendor);
          // Sync the status change into the shared store so both sides stay consistent
          PendingVendorStore.updateStatus(id, status);
          TenantVendorApprovalStore.setStatus(this.tenantId, id, status);
        }),
        catchError(() => {
          // Mock fallback — update the shared store and emit the changed vendor
          TenantVendorApprovalStore.setStatus(this.tenantId, id, status);
          const updated = PendingVendorStore.updateStatus(id, status);
          if (updated) {
            const tenantUpdated = { ...updated, status };
            this.updateVendorInList(tenantUpdated);
            this.selectedVendorSubject.next(tenantUpdated);
            return of(tenantUpdated);
          }
          // Vendor might only be in MOCK_VENDORS — patch it inline
          const mockIdx = (this.MOCK_VENDORS as Vendor[]).findIndex(v => v.id === id);
          if (mockIdx !== -1) {
            const patched: Vendor = { ...(this.MOCK_VENDORS as Vendor[])[mockIdx], status, updatedAt: new Date() };
            (this.MOCK_VENDORS as Vendor[])[mockIdx] = patched;
            this.updateVendorInList(patched);
            return of(patched);
          }
          this.errorSubject.next('Failed to update vendor status');
          return throwError(() => new Error('Vendor not found in local store'));
        })
      );
  }

  // ============================================================
  // PERFORMANCE
  // ============================================================

  getVendorPerformance(vendorId: string): Observable<VendorPerformanceResponse> {
    this.loadingSubject.next(true);

    const params = new HttpParams()
      .set('tenantId', this.tenantId)
      .set('vendorId', vendorId);

    return this.http.get<VendorPerformanceResponse>(`${this.baseUrl}/vendor-dashboard/performance`, { params })
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        catchError((err) => {
          console.warn('Performance API failed, using mock data for vendor:', vendorId);
          this.loadingSubject.next(false);

          // Create a copy of the mock metrics with the vendor ID
          const metrics = { ...this.MOCK_PERFORMANCE_METRICS };

          const mockResponse: VendorPerformanceResponse = {
            metrics: metrics,
            kpis: [
              {
                label: 'Overall Score',
                value: metrics.overallScore,
                unit: '%',
                color: '#2EB270',
                icon: 'fa-chart-line',
                trend: 'up',
                percentChange: 3.2
              },
              {
                label: 'On-Time Delivery',
                value: metrics.onTimeDeliveryRate,
                unit: '%',
                color: '#2EB270',
                icon: 'fa-clock',
                trend: 'up',
                percentChange: 1.5
              },
              {
                label: 'Quality Score',
                value: metrics.qualityScore,
                unit: '%',
                color: '#F5A623',
                icon: 'fa-star',
                trend: 'up',
                percentChange: 2.1
              },
              {
                label: 'Cost Competitiveness',
                value: metrics.costCompetitiveness,
                unit: '%',
                color: '#F97316',
                icon: 'fa-tags',
                trend: 'stable',
                percentChange: 0.5
              },
              {
                label: 'Compliance Score',
                value: metrics.complianceScore,
                unit: '%',
                color: '#2EB270',
                icon: 'fa-shield-alt',
                trend: 'up',
                percentChange: 4.8
              },
              {
                label: 'Rating Score',
                value: metrics.ratingScore,
                unit: '/5',
                color: '#8B5CF6',
                icon: 'fa-star-half-alt',
                trend: 'up',
                percentChange: 2.3
              },
              {
                label: 'Win Rate',
                value: metrics.winRate,
                unit: '%',
                color: '#2E6276',
                icon: 'fa-trophy',
                trend: 'up',
                percentChange: 5.0
              },
              {
                label: 'Total Projects',
                value: metrics.totalProjects,
                unit: '',
                color: '#6B7280',
                icon: 'fa-project-diagram',
                trend: 'up',
                percentChange: 12.0
              }
            ],
            ranking: {
              vendorId: vendorId,
              rank: 5,
              score: 87.5,
              factors: {
                price: 85,
                delivery: 92,
                performance: 87,
                compliance: 94
              },
              recommendation: 'STRONG'
            }
          };
          return of(mockResponse);
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

  getVendorRisk(vendorId: string): Observable<VendorRiskResponse> {
    return of({} as any);
  }

  getRiskAlerts(vendorId?: string): Observable<RiskAlert[]> {
    console.log('getRiskAlerts called with vendorId:', vendorId);

    // If vendorId is provided, filter alerts for that vendor
    if (vendorId) {
      const filtered = this.MOCK_RISK_ALERTS.filter(a => a.vendorId === vendorId);
      console.log('Filtered alerts count:', filtered.length);
      // If no alerts found for this vendor, return some default ones
      if (filtered.length === 0) {
        console.log('No alerts found for vendor, returning default info alert');
        return of([
          {
            id: 'default-1',
            vendorId: vendorId,
            severity: AlertSeverity.INFO,
            type: 'GENERAL',
            title: 'No specific alerts for this vendor',
            description: 'All compliance checks are up to date.',
            detectedAt: new Date(),
            status: 'RESOLVED',
            actionRequired: false
          }
        ]);
      }
      return of(filtered);
    }

    console.log('Returning all alerts:', this.MOCK_RISK_ALERTS.length);
    return of(this.MOCK_RISK_ALERTS);
  }


  resolveRiskAlert(alertId: string, resolution: string): Observable<any> {
    return of({} as any);
  }

  initiateSanctionsCheck(vendorId: string): Observable<any> {
    return of({} as any);
  }


  // ============================================================
  // DOCUMENTS
  // ============================================================

  /** The vendor's own documents — from the live cache or the portal store — take
   *  priority over anything else, since these are what the vendor actually
   *  uploaded during registration (as opposed to generic placeholder mocks). */
  private getOwnVendorDocuments(vendorId: string): VendorDocument[] | null {
    const vendor = this.vendorsSubject.value.find(v => v.id === vendorId)
      ?? this.selectedVendorSubject.value
      ?? PendingVendorStore.getById(vendorId);
    if (vendor?.id === vendorId && vendor.documents?.length) {
      return vendor.documents;
    }
    return null;
  }

  getVendorDocuments(vendorId: string): Observable<VendorDocument[]> {
    this.loadingSubject.next(true);

    const ownDocs = this.getOwnVendorDocuments(vendorId);
    if (this.useMockData) {
      this.loadingSubject.next(false);
      return of(ownDocs ?? []);
    }

    const params = new HttpParams().set('tenantId', this.tenantId);

    return this.http.get<VendorDocument[]>(`${this.baseUrl}/vendors/${vendorId}/documents`, { params })
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        catchError(err => {
          this.loadingSubject.next(false);
          console.warn('Documents API failed for vendor:', vendorId);

          // Prefer the vendor's own uploaded documents over any generic mock —
          // these are what was actually submitted during registration.
          if (ownDocs) {
            return of(ownDocs);
          }

          // Filter mock documents for this vendor
          const mockDocs = this.MOCK_DOCUMENTS.filter(doc => doc.vendorId === vendorId);

          // If no specific documents for this vendor, return some default ones
          if (mockDocs.length === 0) {
            // Create vendor-specific mock documents
            const vendorSpecificDocs: VendorDocument[] = [
              {
                id: `doc-${vendorId}-1`,
                vendorId: vendorId,
                category: DocumentCategory.REGISTRATION,
                name: 'Business Registration Certificate',
                fileName: `registration_${vendorId}.pdf`,
                fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                fileSize: 2457600,
                fileType: 'application/pdf',
                issueDate: new Date('2024-01-15'),
                expiryDate: new Date('2027-01-14'),
                status: DocumentStatus.ACTIVE,
                isRequired: true,
                daysUntilExpiry: 162,
                uploadedAt: new Date('2024-01-20'),
                uploadedBy: 'Vendor User'
              },
              {
                id: `doc-${vendorId}-2`,
                vendorId: vendorId,
                category: DocumentCategory.TAX,
                name: 'Tax Certificate',
                fileName: `tax_${vendorId}.pdf`,
                fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                fileSize: 1843200,
                fileType: 'application/pdf',
                issueDate: new Date('2024-02-01'),
                expiryDate: new Date('2027-01-31'),
                status: DocumentStatus.PENDING_VERIFICATION,
                isRequired: true,
                daysUntilExpiry: 159,
                uploadedAt: new Date('2024-02-05'),
                uploadedBy: 'Vendor User'
              },
              {
                id: `doc-${vendorId}-3`,
                vendorId: vendorId,
                category: DocumentCategory.LICENCE,
                name: 'Operating Licence',
                fileName: `licence_${vendorId}.pdf`,
                fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                fileSize: 3072000,
                fileType: 'application/pdf',
                issueDate: new Date('2023-06-01'),
                expiryDate: new Date('2024-11-30'),
                status: DocumentStatus.EXPIRING_SOON,
                isRequired: true,
                daysUntilExpiry: 28,
                uploadedAt: new Date('2023-06-10'),
                uploadedBy: 'Vendor User'
              }
            ];
            return of(vendorSpecificDocs);
          }

          return of(mockDocs);
        })
      );
  }

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

    const params = new HttpParams().set('tenantId', this.tenantId);

    return this.http.get<VendorLifecycleHistory[]>(`${this.baseUrl}/vendors/${vendorId}/lifecycle`, { params })
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        catchError(err => {
          this.loadingSubject.next(false);
          console.warn('Lifecycle API failed, using mock data for vendor:', vendorId);

          // Filter mock data for this vendor or return all if no specific data
          const mockData = this.MOCK_LIFECYCLE_HISTORY.filter(h => h.vendorId === vendorId);
          if (mockData.length === 0) {
            // Return generic mock data for this vendor
            const genericData: VendorLifecycleHistory[] = [
              {
                id: `life-${vendorId}-1`,
                vendorId: vendorId,
                event: VendorLifecycleEvent.APPLIED,
                description: 'Vendor application submitted',
                performedBy: 'Vendor User',
                timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
              },
              {
                id: `life-${vendorId}-2`,
                vendorId: vendorId,
                event: VendorLifecycleEvent.DOCUMENTS_SUBMITTED,
                description: 'Required documents uploaded',
                performedBy: 'Vendor User',
                timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
              },
              {
                id: `life-${vendorId}-3`,
                vendorId: vendorId,
                event: VendorLifecycleEvent.UNDER_REVIEW,
                description: 'Application under review',
                performedBy: 'Procurement Team',
                timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
              },
              {
                id: `life-${vendorId}-4`,
                vendorId: vendorId,
                event: VendorLifecycleEvent.ACTIVATED,
                description: 'Vendor activated in the marketplace',
                performedBy: 'System',
                timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
              }
            ];
            return of(genericData);
          }
          return of(mockData);
        })
      );
  }

  // ============================================================
  // CONTRACTS
  // ============================================================

  getVendorContracts(vendorId: string): Observable<VendorContract[]> {
    return of([] as any);
  }

  createContract(vendorId: string, contract: Partial<VendorContract>): Observable<VendorContract> {
    return of({} as any);
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

  getRiskTrajectories(): Observable<VendorRiskTrajectory[]> {
    return this.http.get<VendorRiskTrajectory[]>(`${API_BASE}/ai/sentinel/risk-trajectories`)
      .pipe(
        catchError(() => of(MOCK_RISK_TRAJECTORIES))
      );
  }

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

  getOnboardingCopilotSession(vendorId?: string): Observable<OnboardingCopilotSession> {
    const url = vendorId
      ? `${API_BASE}/ai/sentinel/onboarding-copilot/${vendorId}`
      : `${API_BASE}/ai/sentinel/onboarding-copilot`;

    return this.http.get<OnboardingCopilotSession>(url)
      .pipe(
        catchError(() => of(MOCK_ONBOARDING_COPILOT))
      );
  }

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

  getSmartVendorShortlist(category?: string): Observable<SmartVendorShortlistItem[]> {
    return this.http.get<SmartVendorShortlistItem[]>(`${API_BASE}/ai/sentinel/smart-shortlist`, {
      params: category ? new HttpParams().set('category', category) : undefined
    }).pipe(
      catchError(() => of(MOCK_SMART_SHORTLIST))
    );
  }

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

  getSentinelActionLog(): Observable<SentinelActionLogEntry[]> {
    return this.http.get<SentinelActionLogEntry[]>(`${API_BASE}/ai/sentinel/action-log`)
      .pipe(
        tap(data => this.actionLogSubject.next(data)),
        catchError(() => of(MOCK_ACTION_LOG))
      );
  }

  getGovernanceRules(): Observable<SentinelGovernanceRule[]> {
    return this.http.get<SentinelGovernanceRule[]>(`${API_BASE}/ai/sentinel/governance-rules`)
      .pipe(
        catchError(() => of(MOCK_GOVERNANCE_RULES))
      );
  }

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
  // VENDOR RESOLUTION CENTER
  // ============================================================

  private messageThreadsSubject = new BehaviorSubject<MessageThread[]>([]);
  messageThreads$ = this.messageThreadsSubject.asObservable();

  private disputeCasesSubject = new BehaviorSubject<DisputeCase[]>([]);
  disputeCases$ = this.disputeCasesSubject.asObservable();

  private resolutionAuditLogSubject = new BehaviorSubject<ResolutionAuditLogEntry[]>(MOCK_RESOLUTION_AUDIT_LOG);
  resolutionAuditLog$ = this.resolutionAuditLogSubject.asObservable();

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

  getCannedTemplates(): Observable<CannedTemplate[]> {
    return this.http.get<CannedTemplate[]>(`${API_BASE}/resolution/templates`)
      .pipe(
        catchError(() => of(MOCK_CANNED_TEMPLATES))
      );
  }

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

  private filterMockVendors(filters?: any): Vendor[] {
    // Merge static mock vendors with any vendors submitted via the portal
    let vendors = [...this.MOCK_VENDORS, ...PendingVendorStore.getAll()];
    // Deduplicate by id (store entries take precedence — they have live status)
    const seen = new Set<string>();
    vendors = vendors.filter(v => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });

    // Apply tenant-specific status override so filters (such as ACTIVE status) match correctly
    vendors = vendors.map(v => {
      const tenantStatus = TenantVendorApprovalStore.getStatus(this.tenantId, v.id);
      if (tenantStatus) {
        return { ...v, status: tenantStatus };
      }
      return v;
    });

    if (!filters) return vendors;

    if (filters.statuses) {
      const statuses = Array.isArray(filters.statuses) ? filters.statuses : [filters.statuses];
      vendors = vendors.filter(v => statuses.includes(v.status));
    } else if (filters.status) {
      vendors = vendors.filter(v => v.status === filters.status);
    }

    if (filters.tier) {
      vendors = vendors.filter(v => v.tier === filters.tier);
    }

    if (filters.riskLevel) {
      vendors = vendors.filter(v => v.riskLevel === filters.riskLevel);
    }

    if (filters.category) {
      const category = String(filters.category).toLowerCase();
      vendors = vendors.filter(v => (v.categories || []).some((cat: string) => cat.toLowerCase().includes(category)));
    }

    if (filters.search) {
      const search = String(filters.search).toLowerCase();
      vendors = vendors.filter(v =>
        (v.companyName || '').toLowerCase().includes(search) ||
        (v.email || '').toLowerCase().includes(search) ||
        (v.registrationNumber || '').toLowerCase().includes(search)
      );
    }

    return vendors;
  }

  getResolutionAuditLog(): Observable<ResolutionAuditLogEntry[]> {
    return this.http.get<ResolutionAuditLogEntry[]>(`${API_BASE}/resolution/audit-log`)
      .pipe(
        tap(data => this.resolutionAuditLogSubject.next(data)),
        catchError(() => of(MOCK_RESOLUTION_AUDIT_LOG))
      );
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
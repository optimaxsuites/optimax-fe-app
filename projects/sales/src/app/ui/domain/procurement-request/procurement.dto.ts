// procurement.dto.ts

/**
 * RequestStatus represents the current phase in the RFQ (Request for Quotation)
 * and procurement request lifecycle.
 */
export type RequestStatus =
  | 'PENDING'             // Initial request state, waiting for procurement team processing
  | 'VENDORS_QUOTING'     // RFQ is active and open for selected vendors to submit pricing quotations
  | 'VENDOR_SELECTED'     // A specific vendor quotation has been approved and accepted by the buyer
  | 'LPO_ISSUED'          // A Local Purchase Order (LPO) has been generated and officially sent to the vendor
  | 'PAYMENT_PENDING'     // Fulfillment is complete, awaiting final invoice settlement authorization
  | 'PAYMENT_CONFIRMED'   // Payment has been successfully released and confirmed for this request
  | 'DELIVERY_IN_PROGRESS'// Vendor is in the process of shipping/delivering goods or executing services
  | 'DELIVERED'           // Procurement items have been fully received and verified at the destination
  | 'CANCELLED'           // The request has been cancelled/aborted by the procurement department
  | 'DRAFT'               // Draft request saved locally by the initiator before formal submission
  | 'PENDING_APPROVAL'    // Awaiting internal managerial approval or review board authorization
  | 'REJECTED'            // Rejected by internal manager/approver during the review phase
  | 'APPROVED';           // Approved internally, ready to be sent to vendor portal



/**
 * ProcurementType determines whether the request is for physical items (PRODUCTS)
 * or external services (SERVICES), impacting the validation and routing forms.
 */
export type ProcurementType =
  | 'PRODUCT'             // Materials, goods, hardware or physical equipment procurement
  | 'SERVICE';            // Professional labor, cleaning, maintenance, or consultation services

export interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  size?: number;
  type?: string;
}

export interface RequestItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  estimatedBudget: number;
  attachments: Attachment[];
  specifications?: Record<string, any>;
  // Service specific
  serviceDuration?: string;
  serviceStartDate?: Date;
  serviceEndDate?: Date;
  requiredQualifications?: string[];
  serviceCategory?: string;
  experienceLevel?: string;
}

export interface ProcurementRequest {
  id: string;
  customerId: string;
  customerName: string;
  procurementType: ProcurementType;
  title: string;
  description: string;
  items: RequestItem[];
  totalBudget: number;
  currency: string;
  deliveryLocation: string;
  deliveryDeadline: Date;
  status: RequestStatus;
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
  selectedVendorId: string;
  selectedVendorName?: string;
  selectedQuotationId?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  cancellationAdditionalNotes?: string;
  // RFQ Settings
  rfqTitle?: string;
  rfqExpiryDate?: Date;
  rfqTemplateId?: string;
  targetVendors?: string[];
  // Approval
  approvalStatus?: 'DRAFT' | 'PENDING' | 'IN_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: Date;
  approvalComments?: string;
  // Vendor Selection
  selectedVendors?: string[];
  deliveryMode?: string;
  specialInstructions?: string;
  serviceCategory?: string;
}

export interface RequestFilters {
  status?: RequestStatus | 'ALL';
  procurementType?: ProcurementType | 'ALL';
  searchTerm?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  size: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

// RFQ Template
export interface RFQTemplate {
  id: string;
  name: string;
  description: string;
  layout: 'STANDARD' | 'MINIMAL' | 'DETAILED' | 'CORPORATE';
  sections: RFQTemplateSection[];
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RFQTemplateSection {
  id: string;
  title: string;
  type: 'HEADER' | 'DETAILS' | 'ITEMS' | 'TERMS' | 'FOOTER';
  content: string;
  order: number;
  isVisible: boolean;
}

// Vendor Suggestion
export interface VendorSuggestion {
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  categories: string[];
  rating: number;
  totalProjects: number;
  completionRate: number;
  averageResponseTime: number;
  matchScore: number;
  isRecommended: boolean;
  reason: string;
}

export interface MasterOrder {
  id: string;
  customerId: string;
  customerName: string;
  orderName: string;
  items: OrderItem[];
  totalBudget: number;
  currency: string;
  masterDeliveryLocation: string;
  masterDeliveryDeadline: Date;
  masterSpecialInstructions?: string;
  selectedVendors?: string[];
  rfqExpiryDate: Date;
  status: MasterOrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  productName: string;
  description: string;
  quantity: number;
  budget: number;
  currency: string;
  deliveryLocation?: string;
  specialInstructions?: string;
  attachments?: Attachment[];
}

export type MasterOrderStatus =
  | 'DRAFT'
  | 'PENDING_VENDOR_QUOTES'
  | 'VENDOR_SELECTION_IN_PROGRESS'
  | 'PARTIALLY_AWARDED'
  | 'FULLY_AWARDED'
  | 'COMPLETED'
  | 'CANCELLED';


/**
 * VendorQuotationStatus represents the lifecycle of a vendor's response
 * to an RFQ, including submission, buyer reviews, awards, and LPO issuances.
 */
export type VendorQuotationStatus =
  | 'PENDING'           // Vendor has been invited/suggested but has not submitted a response yet
  | 'SUBMITTED'         // Vendor has successfully submitted their quotation details to the buyer
  | 'ACCEPTED'          // Buyer approved this specific quotation, triggering subsequent LPO steps
  | 'DECLINED'          // Vendor declined to quote, or buyer rejected the submitted quotation
  | 'EXPIRED'           // The quotation is no longer valid because its validity period has elapsed
  | 'WITHDRAWN'         // The vendor withdrew their quotation before the buyer could accept/decline it
  | 'LPO_GENERATED'     // Customer generated the Local Purchase Order draft from this quotation
  | 'LPO_SENT'          // Customer has sent the finalized LPO document to the vendor
  | 'REVIEW_REQUESTED'; // Customer requested changes or price adjustments, expecting a revised quote

/**
 * Ceiling on how many times the buyer (procurement) can send a vendor's
 * quotation back for changes before the negotiation should be escalated,
 * the vendor contacted directly, or the RFQ re-issued.
 *
 * Mirrors MAX_REVISION_ROUNDS in the vendor portal's vendor.dto.ts — kept as
 * a separate constant (rather than a shared import) so the procurement and
 * vendor-portal domains stay decoupled, but the value must be kept in sync
 * with that file if it ever changes.
 */
export const MAX_QUOTATION_REVISIONS = 3;

/**
 * One entry in a quotation's audit trail. Captures every step of the
 * negotiation — submission, revision requests, resubmissions,
 * award/decline/withdrawal — so the procurement team can see the full
 * back-and-forth instead of just the current status. Append-only: existing
 * entries are never edited or removed.
 */
export type QuotationHistoryAction =
  | 'CREATED'            // Quotation record was created (draft, not yet sent) — mirrors the shared vendor-side event
  | 'SUBMITTED'          // Vendor submitted (or the demo simulated a submission of) this quotation
  | 'VIEWED'             // Buyer opened/reviewed the quotation for the first time
  | 'REVIEW_REQUESTED'   // Buyer sent the quotation back to the vendor for changes
  | 'RESUBMITTED'        // Vendor resubmitted an updated quotation after a revision request
  | 'ACCEPTED'           // Buyer accepted this quotation, triggering LPO generation
  | 'DECLINED'           // Buyer declined this quotation, or it was auto-declined because another was accepted
  | 'LPO_GENERATED'      // An LPO draft was generated from this accepted quotation
  | 'LPO_SENT'           // The finalized LPO was sent to the vendor
  | 'WITHDRAWN'          // The pending/unanswered quotation was cancelled/withdrawn
  | 'STATUS_CHANGED';    // Catch-all for direct status updates not covered above

export interface QuotationHistoryEntry {
  id: string;
  version: number;          // quotation version this entry applies to (see VendorQuotation.version)
  action: QuotationHistoryAction;
  actor: 'VENDOR' | 'CUSTOMER' | 'SYSTEM';
  note?: string;             // free-text detail — revision instructions, decline reason, resubmission summary, etc.
  amount?: number;           // totalAmount at the time of this entry, where relevant (submission/resubmission/acceptance)
  timestamp: Date;
}

export interface VendorQuotation {
  id: string;
  rfqId: string;
  rfqTitle?: string;
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  vendorRating: number;
  status: VendorQuotationStatus;
  items: QuotationItemDetail[];
  totalAmount: number;
  currency: string;
  deliveryTimeline: string;
  validityDays: number;
  vendorEmail?: string;
  vendorPhone?: string;
  termsAndConditions?: string;
  notes?: string;
  declineReason?: string;
  revisionRequestNote?: string; // Notes describing revision instructions/changes requested by the customer
  submittedAt?: Date;
  updatedAt: Date;
  expiresAt: Date;
  isViewed: boolean;
  // ── Negotiation / revision cycle ──────────────────────────────────────────
  // Optional (rather than required) so existing code that builds a
  // VendorQuotation without these — seed data, mocks, partial updates —
  // keeps compiling. QuotationManagementService normalizes every record to
  // have concrete values (version ?? 1, revisionCount ?? 0, history ?? [])
  // as soon as it loads them, so nothing downstream needs to special-case
  // "missing" vs "zero".
  version?: number;              // increments every time the vendor resubmits after a revision request
  revisionCount?: number;        // how many times the buyer has sent this back so far — capped at MAX_QUOTATION_REVISIONS
  revisionRequestedAt?: Date;    // when the currently-active revision request (if any) was raised
  history?: QuotationHistoryEntry[];
  // ── LPO ────────────────────────────────────────────────────────────────────
  // Assigned exactly once, the first time an LPO is needed for this
  // quotation (see QuotationManagementService.ensureLpoAssigned()) — never
  // regenerated on a later visit, so the number on screen always matches
  // what was actually sent to the vendor.
  lpoNumber?: string;
  lpoIssuedAt?: Date;
}

export interface QuotationItemDetail {
  id: string;
  name: string;
  description: string;
  quantity: number; // Requested quantity from the customer
  unitPrice: number;
  totalPrice: number;
  availability: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE' | 'SUBSTITUTE'; // Current availability status committed by the vendor
  alternativeProduct?: string; // Alternative product name (applicable only when availability is SUBSTITUTE)
  availableQuantity?: number; // Partial quantity the vendor can provide (applicable only when availability is PARTIAL)
  deliveryDate?: Date;
  notes?: string;
}

export interface RFQWithQuotations {
  rfq: ProcurementRequest;
  quotations: VendorQuotation[];
  summary: {
    totalVendors: number;
    responded: number;
    pending: number;
    accepted: number;
    declined: number;
    expired: number;
  };
}
// ─── Shared ───────────────────────────────────────────────────────────────────
export type Currency = 'NGN' | 'USD' | 'GBP' | 'EUR';

// ─── RFQ ─────────────────────────────────────────────────────────────────────
export type RfqStatus        = 'open' | 'converted' | 'expired' | 'closed';
export type QuotationStatus  = 'draft' | 'sent' | 'accepted' | 'rejected';
export type ItemAvailability = 'available' | 'unavailable';
export type LpoStatus        = 'pending' | 'accepted' | 'rejected' | 'fulfilled' | 'cancelled';

export interface RfqImage {
  id:     string;
  url:    string;
  label?: string;
}

export interface RfqItem {
  id:               string;
  name:             string;
  description:      string;
  quantity:         number;
  unit:             string;
  specifications?:  string;
  referenceImages?: RfqImage[];
}

export interface Rfq {
  id:                   string;
  rfqNumber:            string;
  clientName:           string;
  clientEmail?:         string;
  issuedDate:           Date;
  dueDate:              Date;
  status:               RfqStatus;
  isRead:               boolean;
  items:                RfqItem[];
  clientInstructions?:  string;
  deliveryAddress?:     string;
  paymentTerms?:        string;
  currency:             string;
  category:             string;
  totalEstimatedValue?: number;
}

// ─── Quotation ────────────────────────────────────────────────────────────────
export interface QuotationItem {
  rfqItemId:    string;
  name:         string;
  description:  string;
  quantity:     number;
  unit:         string;
  unitPrice:    number | null;
  totalPrice:   number | null;
  availability: ItemAvailability;
}

export interface Quotation {
  id:              string;
  quotationNumber: string;
  rfqId:           string;
  rfqNumber:       string;
  clientName:      string;
  createdDate:     Date;
  sentDate?:       Date;
  validUntil:      Date;
  status:          QuotationStatus;
  items:           QuotationItem[];
  subtotal:        number;
  tax:             number;
  total:           number;
  notes?:          string;
  currency:        string;
}

// ─── LPO ─────────────────────────────────────────────────────────────────────
export interface LpoItem {
  id:          string;
  name:        string;
  description: string;
  quantity:    number;
  unit:        string;
  unitPrice:   number;
  totalPrice:  number;
}

export interface Lpo {
  id:                 string;
  lpoNumber:          string;
  quotationId?:       string;
  quotationNumber?:   string;
  rfqNumber?:         string;
  clientName:         string;
  clientEmail?:       string;
  issuedDate:         Date;
  deliveryDate:       Date;
  status:             LpoStatus;
  isRead:             boolean;
  items:              LpoItem[];
  deliveryAddress:    string;
  paymentTerms:       string;
  currency:           string;
  subtotal:           number;
  tax:                number;
  total:              number;
  specialConditions?: string;
  rejectionReason?:   string;
}

// ─── Finance — Invoice ────────────────────────────────────────────────────────
export type InvoiceStatus = 'draft' | 'submitted' | 'approved' | 'paid' | 'overdue' | 'disputed';

export interface InvoiceLineItem {
  id:          string;
  description: string;
  quantity:    number;
  unit:        string;
  unitPrice:   number;
  totalPrice:  number;
}

export interface Invoice {
  id:              string;
  invoiceNumber:   string;
  lpoId?:          string;
  lpoNumber?:      string;
  quotationNumber?: string;
  clientName:      string;
  clientEmail?:    string;
  issuedDate:      Date;
  dueDate:         Date;
  paidDate?:       Date;
  status:          InvoiceStatus;
  items:           InvoiceLineItem[];
  subtotal:        number;
  tax:             number;
  total:           number;
  amountPaid:      number;
  amountOutstanding: number;
  currency:        string;
  notes?:          string;
  bankDetails?:    BankDetails;
}

export interface BankDetails {
  bankName:      string;
  accountName:   string;
  accountNumber: string;
  sortCode?:     string;
}

export interface Payment {
  id:            string;
  invoiceId:     string;
  invoiceNumber: string;
  clientName:    string;
  amount:        number;
  currency:      string;
  paidDate:      Date;
  method:        'bank_transfer' | 'cheque' | 'cash' | 'online';
  reference:     string;
  notes?:        string;
}

export interface FinanceStats {
  totalInvoiced:    number;
  totalPaid:        number;
  totalOutstanding: number;
  totalOverdue:     number;
  invoiceCount:     number;
  paidCount:        number;
  overdueCount:     number;
  pendingCount:     number;
  avgPaymentDays:   number;
  recentPayments:   Payment[];
}

// ─── Documents ────────────────────────────────────────────────────────────────
export type DocumentStatus   = 'active' | 'expiring_soon' | 'expired' | 'pending_review';
export type DocumentCategory = 'registration' | 'tax' | 'licence' | 'insurance' | 'certification' | 'other';

export interface VendorDocument {
  id:           string;
  name:         string;
  category:     DocumentCategory;
  fileUrl:      string;
  fileName:     string;
  fileSize:     string;
  fileType:     string;
  uploadedDate: Date;
  expiryDate?:  Date;
  status:       DocumentStatus;
  notes?:       string;
  isRequired:   boolean;
}

export interface DocumentStats {
  total:         number;
  active:        number;
  expiringSoon:  number;
  expired:       number;
  pendingReview: number;
}

// ─── Performance ──────────────────────────────────────────────────────────────
export interface MonthlyMetric {
  month:     string;  // e.g. 'Jan 2026'
  rfqs:      number;
  quoted:    number;
  won:       number;
  revenue:   number;
}

export interface ClientPerformance {
  clientName:      string;
  totalOrders:     number;
  totalRevenue:    number;
  onTimeRate:      number;
  acceptanceRate:  number;
}

export interface PerformanceStats {
  // Response
  avgRfqResponseHours:     number;
  rfqResponseRate:         number;   // % RFQs quoted vs received
  // Quality
  quotationAcceptanceRate: number;   // % won
  onTimeDeliveryRate:      number;
  // Revenue
  totalRevenueYtd:         number;
  totalRevenueAllTime:     number;
  revenueGrowthPct:        number;   // vs prior period
  // Volume
  totalRfqsReceived:       number;
  totalQuotationsSubmitted:number;
  totalLposAccepted:       number;
  totalLposFulfilled:      number;
  // Rating
  overallRating:           number;   // 1-5
  // Breakdown
  monthlyMetrics:          MonthlyMetric[];
  topClients:              ClientPerformance[];
}

// ─── Stats (dashboard + lpo) ──────────────────────────────────────────────────
export interface VendorStats {
  totalRfqs:              number;
  unreadRfqs:             number;
  openRfqs:               number;
  totalQuotations:        number;
  draftQuotations:        number;
  sentQuotations:         number;
  acceptedQuotations:     number;
  conversionRate:         number;
  pendingResponseDueSoon: number;
}

export interface LpoStats {
  total:      number;
  pending:    number;
  accepted:   number;
  rejected:   number;
  fulfilled:  number;
  unread:     number;
  totalValue: number;
}


export interface RfqImage {
  id:     string;
  url:    string;
  label?: string;
}

export interface RfqItem {
  id:               string;
  name:             string;
  description:      string;
  quantity:         number;
  unit:             string;
  specifications?:  string;
  referenceImages?: RfqImage[];
}

export interface Rfq {
  id:                   string;
  rfqNumber:            string;
  clientName:           string;
  clientEmail?:         string;
  issuedDate:           Date;
  dueDate:              Date;
  status:               RfqStatus;
  isRead:               boolean;
  items:                RfqItem[];
  clientInstructions?:  string;
  deliveryAddress?:     string;
  paymentTerms?:        string;
  currency:             string;
  category:             string;
  totalEstimatedValue?: number;
}

// ─── Quotation ────────────────────────────────────────────────────────────────
export interface QuotationItem {
  rfqItemId:    string;
  name:         string;
  description:  string;
  quantity:     number;
  unit:         string;
  unitPrice:    number | null;
  totalPrice:   number | null;
  availability: ItemAvailability;
}

export interface Quotation {
  id:              string;
  quotationNumber: string;
  rfqId:           string;
  rfqNumber:       string;
  clientName:      string;
  createdDate:     Date;
  sentDate?:       Date;
  validUntil:      Date;
  status:          QuotationStatus;
  items:           QuotationItem[];
  subtotal:        number;
  tax:             number;
  total:           number;
  notes?:          string;
  currency:        string;
}

// ─── LPO ─────────────────────────────────────────────────────────────────────
export interface LpoItem {
  id:          string;
  name:        string;
  description: string;
  quantity:    number;
  unit:        string;
  unitPrice:   number;
  totalPrice:  number;
}

export interface Lpo {
  id:                 string;
  lpoNumber:          string;
  quotationId?:       string;
  quotationNumber?:   string;
  rfqNumber?:         string;
  clientName:         string;
  clientEmail?:       string;
  issuedDate:         Date;
  deliveryDate:       Date;
  status:             LpoStatus;
  isRead:             boolean;
  items:              LpoItem[];
  deliveryAddress:    string;
  paymentTerms:       string;
  currency:           string;
  subtotal:           number;
  tax:                number;
  total:              number;
  specialConditions?: string;
  rejectionReason?:   string;
}


export interface InvoiceLineItem {
  id:          string;
  description: string;
  quantity:    number;
  unit:        string;
  unitPrice:   number;
  totalPrice:  number;
}

export interface Invoice {
  id:              string;
  invoiceNumber:   string;
  lpoId?:          string;
  lpoNumber?:      string;
  quotationNumber?: string;
  clientName:      string;
  clientEmail?:    string;
  issuedDate:      Date;
  dueDate:         Date;
  paidDate?:       Date;
  status:          InvoiceStatus;
  items:           InvoiceLineItem[];
  subtotal:        number;
  tax:             number;
  total:           number;
  amountPaid:      number;
  amountOutstanding: number;
  currency:        string;
  notes?:          string;
  bankDetails?:    BankDetails;
}

export interface BankDetails {
  bankName:      string;
  accountName:   string;
  accountNumber: string;
  sortCode?:     string;
}

export interface Payment {
  id:            string;
  invoiceId:     string;
  invoiceNumber: string;
  clientName:    string;
  amount:        number;
  currency:      string;
  paidDate:      Date;
  method:        'bank_transfer' | 'cheque' | 'cash' | 'online';
  reference:     string;
  notes?:        string;
}

export interface FinanceStats {
  totalInvoiced:    number;
  totalPaid:        number;
  totalOutstanding: number;
  totalOverdue:     number;
  invoiceCount:     number;
  paidCount:        number;
  overdueCount:     number;
  pendingCount:     number;
  avgPaymentDays:   number;
  recentPayments:   Payment[];
}


export interface VendorDocument {
  id:           string;
  name:         string;
  category:     DocumentCategory;
  fileUrl:      string;
  fileName:     string;
  fileSize:     string;
  fileType:     string;
  uploadedDate: Date;
  expiryDate?:  Date;
  status:       DocumentStatus;
  notes?:       string;
  isRequired:   boolean;
}

export interface DocumentStats {
  total:         number;
  active:        number;
  expiringSoon:  number;
  expired:       number;
  pendingReview: number;
}

// ─── Performance ──────────────────────────────────────────────────────────────
export interface MonthlyMetric {
  month:     string;  // e.g. 'Jan 2026'
  rfqs:      number;
  quoted:    number;
  won:       number;
  revenue:   number;
}

export interface ClientPerformance {
  clientName:      string;
  totalOrders:     number;
  totalRevenue:    number;
  onTimeRate:      number;
  acceptanceRate:  number;
}

export interface PerformanceStats {
  // Response
  avgRfqResponseHours:     number;
  rfqResponseRate:         number;   // % RFQs quoted vs received
  // Quality
  quotationAcceptanceRate: number;   // % won
  onTimeDeliveryRate:      number;
  // Revenue
  totalRevenueYtd:         number;
  totalRevenueAllTime:     number;
  revenueGrowthPct:        number;   // vs prior period
  // Volume
  totalRfqsReceived:       number;
  totalQuotationsSubmitted:number;
  totalLposAccepted:       number;
  totalLposFulfilled:      number;
  // Rating
  overallRating:           number;   // 1-5
  // Breakdown
  monthlyMetrics:          MonthlyMetric[];
  topClients:              ClientPerformance[];
}

// ─── Stats (dashboard + lpo) ──────────────────────────────────────────────────
export interface VendorStats {
  totalRfqs:              number;
  unreadRfqs:             number;
  openRfqs:               number;
  totalQuotations:        number;
  draftQuotations:        number;
  sentQuotations:         number;
  acceptedQuotations:     number;
  conversionRate:         number;
  pendingResponseDueSoon: number;
}

export interface LpoStats {
  total:      number;
  pending:    number;
  accepted:   number;
  rejected:   number;
  fulfilled:  number;
  unread:     number;
  totalValue: number;
}

// ─── Vendor Profile ───────────────────────────────────────────────────────────
export type VerificationStatus = 'verified' | 'pending' | 'unverified';

export interface VendorProfile {
  id:                   string;
  companyName:          string;
  tradingName?:         string;
  rcNumber:             string;          // CAC registration number
  taxId:                string;          // TIN
  category:             string;          // primary supply category
  additionalCategories: string[];
  email:                string;
  phone:                string;
  alternatePhone?:      string;
  website?:             string;
  address:              string;
  city:                 string;
  state:                string;
  country:              string;
  contactPersonName:    string;
  contactPersonRole:    string;
  bankDetails:          BankDetails;
  logoUrl?:             string;
  verificationStatus:   VerificationStatus;
  memberSince:          Date;
}

// ─── Document Template (branding) ────────────────────────────────────────────
export type TemplateDocType = 'invoice' | 'quotation';

export interface DocumentTemplate {
  id:              string;
  name:            string;            // e.g. "Default", "Q4 Promo"
  docType:         TemplateDocType;
  isActive:        boolean;           // the one currently used for generated PDFs
  logoUrl?:        string;
  accentColor:     string;            // hex, e.g. '#224957'
  footerText?:     string;
  showBankDetails: boolean;
  notesDefault?:   string;            // pre-filled notes/terms text
  updatedDate:     Date;
}
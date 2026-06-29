// ─── Procurement (buyer side) ─────────────────────────────────────────────────
// These types represent the buyer's view:
//   BuyerRfq  = an RFQ the buyer sent to vendors
//   VendorQuoteResponse = a quotation a vendor submitted in response
//   IssuedLpo = an LPO the buyer creates after selecting a winning vendor

export type BuyerRfqStatus       = 'open' | 'closed' | 'awarded' | 'cancelled' | 'expired';
export type QuoteResponseStatus   = 'received' | 'under_review' | 'shortlisted' | 'awarded' | 'rejected';
export type IssuedLpoStatus       = 'draft' | 'sent' | 'accepted' | 'rejected' | 'fulfilled' | 'cancelled';

// ─── Buyer RFQ ────────────────────────────────────────────────────────────────
export interface BuyerRfqItem {
  id:              string;
  name:            string;
  description:     string;
  quantity:        number;
  unit:            string;
  specifications?: string;
  budgetEstimate?: number;
}

export interface BuyerRfq {
  id:                   string;
  rfqNumber:            string;
  title:                string;
  orderName:            string;
  department:           string;
  category:             string;
  issuedDate:           Date;
  expiryDate:           Date;
  deliveryDeadline:     Date;
  deliveryAddress:      string;
  status:               BuyerRfqStatus;
  currency:             string;
  items:                BuyerRfqItem[];
  totalBudgetEstimate?: number;
  vendorTargeting:      'all' | 'selected';
  vendorsInvited:       number;
  quotesReceived:       number;
  specialInstructions?: string;
  paymentTerms?:        string;
}

// ─── Vendor Quote Response ────────────────────────────────────────────────────
export interface QuoteResponseItem {
  rfqItemId:    string;
  itemName:     string;
  description:  string;
  quantity:     number;
  unit:         string;
  unitPrice:    number | null;
  totalPrice:   number | null;
  availability: 'available' | 'unavailable';
  notes?:       string;
}

export interface VendorQuoteResponse {
  id:               string;
  rfqId:            string;
  rfqNumber:        string;
  quotationNumber:  string;
  vendorId:         string;
  vendorName:       string;
  vendorEmail:      string;
  vendorRating:     number;
  vendorVerified:   boolean;
  submittedDate:    Date;
  validUntil:       Date;
  status:           QuoteResponseStatus;
  currency:         string;
  items:            QuoteResponseItem[];
  subtotal:         number;
  tax:              number;
  total:            number;
  deliveryLeadDays: number;
  paymentTerms:     string;
  notes?:           string;
  // Evaluation
  score?:           number;   // 0-100 computed or manual
  priceRank?:       number;   // 1 = cheapest
}

// ─── Issued LPO (buyer creates) ───────────────────────────────────────────────
export interface IssuedLpoItem {
  id:          string;
  name:        string;
  description: string;
  quantity:    number;
  unit:        string;
  unitPrice:   number;
  totalPrice:  number;
}

export interface IssuedLpo {
  id:                  string;
  lpoNumber:           string;
  rfqId?:              string;
  rfqNumber?:          string;
  quotationId?:        string;
  quotationNumber?:    string;
  vendorName:          string;
  vendorEmail?:        string;
  orderName:           string;
  department:          string;
  issuedDate:          Date;
  deliveryDeadline:    Date;
  deliveryAddress:     string;
  paymentTerms:        string;
  status:              IssuedLpoStatus;
  currency:            string;
  items:               IssuedLpoItem[];
  subtotal:            number;
  tax:                 number;
  total:               number;
  specialConditions?:  string;
  internalNotes?:      string;
}

// ─── Form for creating an LPO ─────────────────────────────────────────────────
export interface CreateLpoForm {
  vendorName:         string;
  vendorEmail:        string;
  orderName:          string;
  department:         string;
  deliveryDeadline:   string;
  deliveryAddress:    string;
  paymentTerms:       string;
  specialConditions:  string;
  internalNotes:      string;
  currency:           string;
  items:              IssuedLpoItem[];
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export interface ProcurementStats {
  totalRfqs:        number;
  openRfqs:         number;
  expiringSoon:     number;
  totalQuotes:      number;
  pendingReview:    number;
  awardsThisMonth:  number;
  totalLposIssued:  number;
  totalLpoValue:    number;
}
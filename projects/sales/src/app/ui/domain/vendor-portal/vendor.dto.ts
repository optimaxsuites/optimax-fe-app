interface VendorProfile {
  id: string;
  businessName: string;
  registrationNumber: string;
  capabilities: string[];  // categories they can supply
  deliveryRegions: string[];
  averageResponseTime: number;  // hours
  rating: number;  // 1-5
  totalQuotationsSubmitted: number;
  quotationAcceptanceRate: number;  // %
  onTimeDeliveryRate: number;  // %
  certifications: Certification[];
}

interface Certification {
  id: string;
  name: string;
  fileUrl: string;
  expiryDate?: Date;
}
export type RfqStatus        = 'open' | 'converted' | 'expired' | 'closed';
export type QuotationStatus  = 'draft' | 'sent' | 'accepted' | 'rejected';
export type ItemAvailability = 'available' | 'unavailable';

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
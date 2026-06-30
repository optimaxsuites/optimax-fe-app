// procurement.dto.ts

export type RequestStatus = 
  | 'PENDING' 
  | 'VENDORS_QUOTING' 
  | 'VENDOR_SELECTED' 
  | 'LPO_ISSUED' 
  | 'PAYMENT_PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'DELIVERY_IN_PROGRESS'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'REJECTED';

export type ProcurementType = 'PRODUCT' | 'SERVICE';

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

// RFQ Generation Request
export interface RFQGenerationRequest {
  procurementRequestId: string;
  templateId: string;
  vendorIds: string[];
  customMessage?: string;
}

// RFQ Generation Response
export interface RFQGenerationResponse {
  rfqId: string;
  rfqNumber: string;
  preview: {
    html: string;
    pdf?: string;
  };
  sentToVendors: string[];
  sentAt: Date;
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
export type RequestStatus = 
  | 'DRAFT'
  | 'PENDING_APPROVAL'     //  NEW - Waiting for internal approval
  | 'PENDING'              // Approved, waiting for vendors
  | 'VENDORS_QUOTING'
  | 'VENDOR_SELECTED'
  | 'LPO_ISSUED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'DELIVERY_IN_PROGRESS'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED';            // NEW - Approval rejected
  
export interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
}

export interface ProcurementRequest {
  id: string;
  customerId: string;
  customerName: string;
  productName: string;
  description: string;
  quantity: number;
  budget: number;
  currency: string;
  deliveryLocation: string;
  deliveryDeadline: Date;
  status: RequestStatus;
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
  selectedVendorId?: string;
  selectedVendorName?: string;
  selectedQuotationId?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  cancellationAdditionalNotes?: string;  
  projectName?: string;
  departmentName?: string;
}

export interface RequestFilters {
  status?: RequestStatus | 'ALL';
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

export interface OrderItem {
  id: string;
  productName: string;
  description: string;
  quantity: number;
  budget: number;
  currency: string;
  deliveryLocation?: string; // Can override master delivery
  specialInstructions?: string;
  attachments?: Attachment[];
}

export interface MasterOrder {
  id: string;
  orderName: string;
  customerId: string;
  customerName: string;
  projectName?: string;
  departmentName?: string;
  items: OrderItem[];
  totalBudget: number;
  currency: string;
  masterDeliveryLocation: string;
  masterDeliveryDeadline: Date;
  masterSpecialInstructions?: string;
  selectedVendors?: string[];
  rfqExpiryDate: Date;
  vendorTargetingType: string;
  status: MasterOrderStatus;
  attachments?: Attachment[];  // ← ADD THIS (for order-level attachments)
  createdAt: Date;
  updatedAt: Date;
}

export type MasterOrderStatus = 
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'PENDING_VENDOR_QUOTES'
  | 'VENDOR_SELECTION_IN_PROGRESS'
  | 'PARTIALLY_AWARDED'
  | 'FULLY_AWARDED'
  | 'COMPLETED'
  | 'CANCELLED';
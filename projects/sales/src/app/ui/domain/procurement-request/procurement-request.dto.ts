export type RequestStatus = 
  | 'PENDING' 
  | 'VENDORS_QUOTING' 
  | 'VENDOR_SELECTED' 
  | 'LPO_ISSUED' 
  | 'PAYMENT_PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'DELIVERY_IN_PROGRESS'
  | 'DELIVERED'
  | 'CANCELLED';

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
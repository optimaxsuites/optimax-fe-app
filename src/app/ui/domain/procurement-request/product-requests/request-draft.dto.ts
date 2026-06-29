export interface RequestDraft {
  id: string;
  customerId: string;
  customerName: string;
  productName: string;
  description: string;
  quantity: number;
  budget: number;
  currency: string;
  deliveryLocation: string;
  deliveryDeadline?: Date;
  specialInstructions?: string;
  attachments: DraftAttachment[];
  status: DraftStatus;
  progress: number;
  lastModified: Date;
  createdAt: Date;
  expiresAt?: Date;
  tags?: string[];
  notes?: string;
}

export interface DraftAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  uploadedAt: Date;
}

export type DraftStatus = 'IN_PROGRESS' | 'COMPLETION_STARTED' | 'AWAITING_INFO' | 'EXPIRED';

export interface DraftSummary {
  totalDrafts: number;
  expiringSoon: number;
  mostRecentDraft: RequestDraft | null;
  completionRate: number;
}

export interface DraftFilters {
  status?: DraftStatus | 'ALL';
  searchTerm?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  size: number;
  sortBy?: 'lastModified' | 'createdAt' | 'productName';
  sortOrder?: 'asc' | 'desc';
}
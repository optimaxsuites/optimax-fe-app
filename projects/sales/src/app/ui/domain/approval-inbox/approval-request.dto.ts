export interface ApprovalRequest {
  id: string;
  requestId: string;
  requestType: 'PROCUREMENT' | 'SERVICE' | 'ORDER';
  requestTitle: string;
  requesterId: string;
  requesterName: string;
  requesterDepartment: string;
  createdAt: Date;
  submittedAt: Date;
  budget: number;
  currency: string;
  items?: ApprovalItem[];
  currentLevel: number;
  status: ApprovalStatus;
  approvals: ApprovalLevel[];
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  reason?: string;
  comments?: ApprovalComment[];
}

export interface ApprovalItem {
  id: string;
  productName: string;
  quantity: number;
  budget: number;
}

export interface ApprovalLevel {
  level: number;
  approverId: string;
  approverName: string;
  approverRole: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  actionAt?: Date;
  comments?: string;
  required: boolean;
}

export interface ApprovalComment {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  comment: string;
  createdAt: Date;
  isInternal: boolean;
}

export type ApprovalStatus = 
  | 'DRAFT'
  | 'PENDING'
  | 'IN_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface ApprovalStats {
  pendingCount: number;
  approvedToday: number;
  rejectedThisWeek: number;
  averageApprovalTime: string;
  urgentPending: number;
}

export interface ApprovalFilters {
  status?: ApprovalStatus | 'ALL';
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'ALL';
  department?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
  page: number;
  size: number;
}

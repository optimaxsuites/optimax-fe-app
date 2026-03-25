export interface RfqDTO{
    id?: number;
    rfqNo?: number;
    date?: string;
    dueDate?: string;
    projectTitle?: string;
    preparedBy?: string;
    items?: RfqItemDTO[];
}

export interface RfqItemDTO{
    id?: number;
    name?: string;
    partNo?: string;
    unit?: number;
    budget?: number;
    description?: string;
}

export enum QuotationStage {
    Pending = 'Pending',
    Converted = 'Converted',
    Sent = 'Sent',

}





export type PRStatus =
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Converted';

export type ApprovalStepStatus = 'NotStarted' | 'Pending' | 'Approved' | 'Rejected';

export interface PRAuditItem {
  action: string;
  by: string;        // userId or "SYSTEM"
  at: string;        // ISO datetime
  meta?: any;
}

export interface PRApprovalStep {
  level: number;
  role: string;           // DepartmentHead | Finance | Procurement
  approverUserId: string; // who must act
  status: ApprovalStepStatus;
  actedAt: string | null;
  comment: string | null;
}

export interface PREscalationRule {
  enabled: boolean;
  dueHours: number;
  escalateToUserId: string;
  lastEscalatedAt: string | null;
}

export interface PRApproval {
  currentLevel: number;
  finalLevel: number;
  state: 'Pending' | 'Approved' | 'Rejected';
  steps: PRApprovalStep[];
  escalation: PREscalationRule;
}

export interface PurchaseRequisitionLS {
  id: number;
  prmNo: string;
  title: string;

  department: string; // store departmentId
  costCenterId: string;
  budgetCodeId: string;

  requiredByDate: string;
  justification: string;

  comment: string;

  currency: string;
  budgetCapAmount: number;

  status: PRStatus;
  createdAt: string;
  submittedAt?: string;

  items: Array<{
    name: string;
    description?: string | null;
    quantity: number;
    unitOfMeasure: string;
    category?: string | null;
    budgetCap: number;
  }>;

  approval?: PRApproval;     // added on submit
  // auditTrail: PRAuditItem[]; // always exists
}

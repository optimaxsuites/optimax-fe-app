export interface ApprovalPolicy {
  actionKey: string;
  approvalType: 'ANY' | 'ALL';
  approvers: string[];  
  description: string;
}
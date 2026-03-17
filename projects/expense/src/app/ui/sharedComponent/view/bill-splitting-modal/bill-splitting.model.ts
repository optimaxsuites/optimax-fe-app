export type BillSplitMethod = 'equal' | 'percentage' | 'amount';

export interface BillSplitParticipant {
  id: string;
  name: string;
  email?: string;

  shareAmount?: number;   // used if method === 'amount'
  sharePercent?: number;  // used if method === 'percentage'
}

export interface BillSplit {
  enabled: boolean;
  method: BillSplitMethod;
  participants: BillSplitParticipant[];
  totalAmount?: number;   // parent passes expense amount
}

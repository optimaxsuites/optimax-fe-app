import { BillSplit } from "../bill-splitting-modal/bill-splitting.model";
export interface RecurringPayment {
  frequency?: 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually' | 'custom' | 'daily';
  startDate: Date;
  endDate?: Date | undefined;
  notifyBeforeNext: boolean;
  emailReminder: boolean;
  amount?: number;
  noEndDate?: boolean;
  type: 'one-time' | 'recurring';
  occurrences?: number;
  billSplit?: BillSplit;
  // Add more fields as needed
}

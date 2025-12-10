export interface GeneratedReport {
  id: number;
  name: string;
  date: string;
  generatedBy: string;
  type: string;
  status: 'Pending' | 'Completed';
  data?: any; // You can make this more specific if you want
}
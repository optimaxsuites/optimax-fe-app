export interface ShiftDTO {
  id: string;
  name: string;
  type: 'morning' | 'evening' | 'night' | 'custom';
  startTime: string;   // "09:00"
  endTime: string;     // "17:00"
  breakTime?: number;  // minutes
  department?: string;
  description?: string;
  color?: string; // used in calendar UI for colorcoded shift
}
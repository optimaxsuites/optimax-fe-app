export interface WorkShiftDTO {
  id: string;
  name: string;
  type: 'morning' | 'evening' | 'night' | 'custom';
  startTime: string;   // "09:00"
  endTime: string;     // "17:00"
  //department?: string;
  description?: string;
  color?: string; // used in calendar UI for colorcoded shift
}
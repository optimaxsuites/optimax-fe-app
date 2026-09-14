export interface ShiftScheduleDTO {
  id: string;
  assignmentGroupId?: string;
  employeeId: string;
  shiftId: string;
  date: string; // ISO date format
  status?: 'scheduled' | 'completed' | 'cancelled';
  project?: string;
  location?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'custom';
  customDays?: string[];
  customInterval?: number;
  repeatCount?: number;
  description?: string;
}
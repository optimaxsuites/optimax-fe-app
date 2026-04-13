export interface ScheduleDTO {
  id: string;
  employeeId: string;
  shiftId: string;
  date: string; // ISO date format
  status?: 'scheduled' | 'completed' | 'cancelled';
  project?: string;
  location?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'custom';
}
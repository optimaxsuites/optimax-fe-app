export interface ScheduleDTO {
  id: string;
  employeeId: string;
  shiftId: string;
  date: string; // ISO date format
  status?: 'scheduled' | 'completed' | 'cancelled';
}
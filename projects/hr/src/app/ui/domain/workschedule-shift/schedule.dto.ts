import { EmployeeDetailDTO, LookupRefDTO } from '../attendance/attendance-event.dto';
import { ShiftApiDTO } from './shift.dto';

/** UI-facing model — one row per calendar day (the assignment form expands recurrence client-side). */
export interface ShiftScheduleDTO {
  id: string;
  assignmentGroupId?: string;
  employeeId: string;
  shiftId: string;
  date: string; // ISO date format
  status?: 'scheduled' | 'completed' | 'cancelled';
  project?: string;
  projectId?: number;
  departmentId?: number;
  location?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'custom';
  customDays?: string[];
  customInterval?: number;
  repeatCount?: number;
  description?: string;
}

/** Raw API shape for GET /workSchedules and friends — employeeId/departmentId/shiftId/projectId are embedded. */
export interface WorkScheduleApiDTO {
  id: number;
  employeeId: EmployeeDetailDTO;
  departmentId: LookupRefDTO;
  shiftId: ShiftApiDTO;
  startDate: string;
  endDate: string;
  status: string; // e.g. 'SCHEDULED'
  projectId: LookupRefDTO;
  location: string;
  recurrence: string; // e.g. 'NONE'
  description: string;
}

/** Request body for POST /workSchedules and PUT /workSchedules/{id} (FK ids, not embedded objects) */
export interface UpsertWorkScheduleRequest {
  id?: number;
  employeeId: number;
  departmentId: number;
  shiftId: number;
  startDate: string;
  endDate: string;
  status: string;
  projectId: number;
  location: string;
  recurrence: string;
  description: string;
}

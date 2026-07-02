export interface ConflictDTO {
  employeeId: string;
  shiftId: string;
  date: string;
  conflictType:
    | 'OVERLAPPING_SHIFT'
    | 'DUPLICATE_ASSIGNMENT'
    | 'EXCEEDS_MAX_HOURS'
    | 'ON_LEAVE'
    | 'INSUFFICIENT_REST';
  message: string;
}
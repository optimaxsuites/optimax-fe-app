/**
 * Timesheet Status Workflow States
 * DRAFT → SUBMITTED → IN_APPROVAL → APPROVED → LOCKED
 */
export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'IN_APPROVAL' | 'APPROVED' | 'LOCKED';

/**
 * Daily timesheet entry record
 *
 * | Field | Type | Description |
 * |-------|------|-------------|
 * | id | string (optional) | Unique identifier for the entry |
 * | date | string | Entry date (YYYY-MM-DD format) |
 * | dayOfWeek | string | Day name (Monday, Tuesday, etc.) |
 * | scheduledHours | number | Scheduled work hours for the day |
 * | actualClockIn | string (optional) | Clock-in time (HH:mm format) |
 * | actualClockOut | string (optional) | Clock-out time (HH:mm format) |
 * | actualHoursWorked | number | Calculated actual hours worked |
 * | projectId | string (optional) | Associated project ID |
 * | projectName | string (optional) | Associated project name |
 * | taskDescription | string (optional) | Description of work performed |
 * | notes | string (optional) | Additional notes for the day |
 */
export interface TimesheetEntry {
  id?: string;
  date: string;
  dayOfWeek: string;
  scheduledHours: number;
  actualClockIn?: string;
  actualClockOut?: string;
  actualHoursWorked: number;
  projectId?: string;
  projectName?: string;
  taskDescription?: string;
  notes?: string;
}

/**
 * Main timesheet data transfer object
 * Handles complete lifecycle from DRAFT to LOCKED status
 *
 * | Field | Type | Description |
 * |-------|------|-------------|
 * | id | string (optional) | Unique timesheet ID |
 * | employeeId | string | Employee ID (required) |
 * | employeeName | string | Employee full name (required) |
 * | departmentId | string (optional) | Employee's department ID |
 * | departmentName | string (optional) | Employee's department name |
 * | weekStartDate | string | Week start date (YYYY-MM-DD format) |
 * | weekEndDate | string | Week end date (YYYY-MM-DD format) |
 * | entries | TimesheetEntry[] | Array of daily records (5 weekdays) |
 * | totalScheduledHours | number | Total scheduled hours for week |
 * | totalActualHours | number | Total actual hours worked |
 * | variance | number | Difference: actualHours - scheduledHours |
 * | status | TimesheetStatus | Current workflow status |
 * | submittedDate | string (optional) | Timestamp when submitted |
 * | submittedBy | string (optional) | User who submitted |
 * | lineManagerId | string (optional) | Manager's ID for approval |
 * | lineManagerName | string (optional) | Manager's name |
 * | approvalDate | string (optional) | Approval timestamp |
 * | approvalNotes | string (optional) | Manager's approval notes |
 * | rejectionReason | string (optional) | Reason for rejection (if rejected) |
 * | rejectionDate | string (optional) | Timestamp when rejected |
 * | lockedDate | string (optional) | Timestamp when locked for payroll |
 * | createdAt | string (optional) | Creation timestamp |
 * | updatedAt | string (optional) | Last update timestamp |
 */
export interface TimesheetDTO {
  id?: string;
  employeeId: string;
  employeeName: string;
  departmentId?: string;
  departmentName?: string;
  weekStartDate: string;
  weekEndDate: string;
  entries: TimesheetEntry[];
  totalScheduledHours: number;
  totalActualHours: number;
  variance: number;
  status: TimesheetStatus;
  submittedDate?: string;
  submittedBy?: string;
  lineManagerId?: string;
  lineManagerName?: string;
  approvalDate?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  rejectionDate?: string;
  lockedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Manager approval request payload
 * Used when manager approves or rejects a timesheet
 *
 * | Field | Type | Description |
 * |-------|------|-------------|
 * | timesheetId | string | ID of timesheet being actioned |
 * | action | 'APPROVE' \| 'REJECT' | Approval action to take |
 * | notes | string (optional) | Notes for approval |
 * | rejectionReason | string (optional) | Reason for rejection (if action='REJECT') |
 */
export interface TimesheetApprovalRequest {
  timesheetId: string;
  action: 'APPROVE' | 'REJECT';
  notes?: string;
  rejectionReason?: string;
}

/**
 * Timesheet request payload for API submission
 * Used when employee submits or resubmits timesheet
 *
 * | Field | Type | Description |
 * |-------|------|-------------|
 * | employeeId | string | Employee ID (required) |
 * | weekStartDate | string | Week start date (required) |
 * | weekEndDate | string | Week end date (required) |
 * | entries | TimesheetEntry[] | Daily records to submit |
 * | status | TimesheetStatus | Desired timesheet status |
 * | submittedDate | string (optional) | Submission timestamp |
 * | approvalNotes | string (optional) | Manager's approval notes |
 * | rejectionReason | string (optional) | Reason for rejection |
 */
export interface TimesheetPayloadDTO {
  employeeId: string;
  weekStartDate: string;
  weekEndDate: string;
  entries: TimesheetEntry[];
  status: TimesheetStatus;
  submittedDate?: string;
  approvalNotes?: string;
  rejectionReason?: string;
}

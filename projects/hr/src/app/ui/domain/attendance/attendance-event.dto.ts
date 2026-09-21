/**
 * Attendance Event Resource: /x/api/v2/hr/attendance-events
 * Attendance Record Resource: /x/api/v2/hr/attendanceRecords
 * See EMPLOYEE_ID_PATTERNS.md for employee identification patterns
 */

export type EventSource = 'BIOMETRIC' | 'REMOTE' | 'MANUAL';
export type EventType = 'IN' | 'OUT';
export type RecordStatus = 'DRAFT' | 'SUBMITTED' | 'IN_APPROVAL' | 'APPROVED' | 'REJECTED' | 'LOCKED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type FlagType = 'CORRECTION' | 'CROSS_BRANCH_BIOMETRIC';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE' | 'OVERTIME';
export type AppliedScheduleType = 'OFFICE_HOURS' | 'SHIFT';

/** Generic {id, name, code, description} reference used for gender, religion, department, jobType, etc. */
export interface LookupRefDTO {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface EmployeeLevelDTO extends LookupRefDTO {
  grade: string;
  position: string;
}

export interface EmployeeMediaDTO {
  id: number;
  name: string;
  mediaNo: string;
}

/** User account snapshot embedded for overrideBy/approvedBy/modifiedBy and employee.user */
export interface UserAccountDTO {
  id: number;
  fullname: string;
  userId: number;
  email: string;
  phoneNumber: string;
  username: string;
  clientType: string;
  gender: string;
  accountId: string;
  address: string;
  city: string;
  state: string;
  country: string;
}

/** Full employee snapshot embedded in attendance-event/attendanceRecord GET responses */
export interface EmployeeDetailDTO {
  id: number;
  firstName: string;
  lastName: string;
  dob: string; // date
  email: string;
  workEmail: string;
  phone: string;
  address: string;
  jobTitle: string;
  supervisor: string;
  bankName: string;
  accountNumber: string;
  nin: string;
  bvn: string;
  employeeStatus: string; // e.g. 'JOINING'
  employementStartDate: string; // date-time (backend spelling)
  employmentEndDate: string; // date-time
  exitReason?: string;
  exitReasonBy?: string;
  exitReasonAt?: string;
  onProbation: boolean;
  probationStartDate: string;
  probationEndDate: string;
  appraisalDueDate: string;
  userId: number;
  gender: LookupRefDTO;
  relationship: LookupRefDTO;
  religion: LookupRefDTO;
  maritalStatus: LookupRefDTO;
  department: LookupRefDTO;
  employeeMedia: EmployeeMediaDTO;
  jobType: LookupRefDTO;
  level: EmployeeLevelDTO;
  user: UserAccountDTO;
}

export interface PagedResponse<T> {
  content: T[];
  totalSize: number;
  page: number;
  size: number;
}

/* ---------------------------- Attendance Events --------------------------- */

/** GET /attendance-events, GET /attendance-events/{id} — response shape (employee is embedded) */
export interface AttendanceEventDTO {
  id: number;
  employeeId: EmployeeDetailDTO;
  source: EventSource;
  eventType: EventType;
  employeeCode: string;
  branchCode: string;
  eventTime: string; // date-time
  deviceId?: string;
  rawTemplateHash?: string;
  deviceIpAddress?: string;
  connectionIpAddress?: string;
  deviceFingerprint?: string;
  userAgent?: string;
  networkType?: string;
  vpnDetected?: boolean;
  gpsLatitude?: number;
  gpsLongitude?: number;
  geoAddress?: string;
  accuracy?: number;
  isCrossBranch: boolean;
  homeBranchCode?: string;
  processed: boolean;
  createdAt: string;
}

/** POST /attendance-events — request body (employeeId is the raw FK) */
export interface CreateAttendanceEventRequest {
  employeeId: number;
  source: EventSource;
  eventType: EventType;
  employeeCode: string;
  branchCode: string;
  eventTime: string; // date-time
  deviceId?: string;
  rawTemplateHash?: string;
  deviceIpAddress?: string;
  connectionIpAddress?: string;
  deviceFingerprint?: string;
  userAgent?: string;
  networkType?: string;
  vpnDetected?: boolean;
  gpsLatitude?: number;
  gpsLongitude?: number;
  geoAddress?: string;
  accuracy?: number;
  isCrossBranch?: boolean;
  homeBranchCode?: string;
  processed?: boolean;
}

/* --------------------------- Attendance Records ---------------------------- */

export interface LocalTimeDTO {
  hour: number;
  minute: number;
  second: number;
  nano: number;
}

/** Shift snapshot embedded inside an applied-schedule snapshot */
export interface ShiftSnapshotDTO {
  id: number;
  name: string;
  type: string; // e.g. 'MORNING'
  startTime: LocalTimeDTO;
  endTime: LocalTimeDTO;
  description: string;
  color: string;
}

/** Snapshot of the schedule active when the attendance record was created (appliedScheduleId on GET responses) */
export interface AppliedScheduleSnapshotDTO {
  id: number;
  employeeId: EmployeeDetailDTO;
  departmentId: LookupRefDTO;
  shiftId: ShiftSnapshotDTO;
  startDate: string; // date
  endDate: string; // date
  status: string; // e.g. 'SCHEDULED'
  projectId: LookupRefDTO;
  location: string;
  recurrence: string; // e.g. 'NONE'
  description: string;
}

/** GET /attendanceRecords, GET /attendanceRecords/{id}, GET /attendanceRecords/dateRange — response shape */
export interface AttendanceRecordDTO {
  id: number;
  employeeId: EmployeeDetailDTO;
  attendanceDate: string; // date
  branchCode: string;
  checkIn?: string; // date-time
  checkOut?: string; // date-time
  checkInLocation?: string;
  checkOutLocation?: string;
  checkInDistance?: number;
  checkOutDistance?: number;
  clockInSource?: EventSource;
  clockOutSource?: EventSource;
  status: AttendanceStatus;
  recordStatus: RecordStatus;
  hours?: number;
  overtimeHours?: number;
  undertimeHours?: number;
  lateMinutes?: number;
  isLate?: boolean;
  isAbsent?: boolean;
  isCrossBranch?: boolean;
  overrideOpen?: boolean;
  overrideBy?: UserAccountDTO;
  overrideReason?: string;
  statusBeforeOverride?: AttendanceStatus;
  appliedScheduleType?: AppliedScheduleType;
  appliedScheduleId?: AppliedScheduleSnapshotDTO;
  appliedExpectedStart?: string; // date-time
  appliedExpectedEnd?: string; // date-time
  appliedShiftName?: string;
  requiresApproval?: boolean;
  approvalStatus?: ApprovalStatus;
  flagType?: FlagType;
  approverNotes?: string;
  approvedBy?: UserAccountDTO;
  approvedAt?: string; // date-time
  modificationReason?: string;
  modifiedBy?: UserAccountDTO;
  modifiedAt?: string; // date-time
  lockedAt?: string; // date-time
  createdAt?: string; // date-time
  updatedAt?: string; // date-time
}

/** POST /attendanceRecords, PUT /attendanceRecords/{id} — request body (FKs are raw ids) */
export interface UpsertAttendanceRecordRequest {
  id?: number;
  employeeId: number;
  attendanceDate: string; // date
  branchCode: string;
  checkIn?: string;
  checkOut?: string;
  checkInLocation?: string;
  checkOutLocation?: string;
  checkInDistance?: number;
  checkOutDistance?: number;
  clockInSource?: EventSource;
  clockOutSource?: EventSource;
  status: AttendanceStatus;
  recordStatus: RecordStatus;
  hours?: number;
  overtimeHours?: number;
  undertimeHours?: number;
  lateMinutes?: number;
  isLate?: boolean;
  isAbsent?: boolean;
  isCrossBranch?: boolean;
  overrideOpen?: boolean;
  overrideBy?: number;
  overrideReason?: string;
  statusBeforeOverride?: AttendanceStatus;
  appliedScheduleType?: AppliedScheduleType;
  appliedScheduleId?: number;
  appliedExpectedStart?: string;
  appliedExpectedEnd?: string;
  appliedShiftName?: string;
  requiresApproval?: boolean;
  approvalStatus?: ApprovalStatus;
  flagType?: FlagType;
  approverNotes?: string;
  approvedBy?: number;
  approvedAt?: string;
  modificationReason?: string;
  modifiedBy?: number;
  modifiedAt?: string;
  lockedAt?: string;
}

/** POST /attendanceRecords/{id}/override/open */
export interface OpenOverrideRequest {
  actorUserId: number;
  reason: string;
}

/** POST /attendanceRecords/clockIn */
export interface ClockInRequest {
  employeeId: number;
  checkIn: string; // date-time
  checkInLocation?: string;
  checkInDistance?: number;
  source: EventSource;
  deviceId?: string;
  deviceFingerprint?: string;
  userAgent?: string;
  networkType?: string;
  vpnDetected?: boolean;
  gpsLatitude?: number;
  gpsLongitude?: number;
  geoAddress?: string;
  gpsAccuracy?: number;
  isCrossBranch?: boolean;
  branchCode: string;
}

/** POST /attendanceRecords/clockOut */
export interface ClockOutRequest {
  employeeId: number;
  checkOut: string; // date-time
  checkOutLocation?: string;
  checkOutDistance?: number;
  source: EventSource;
  deviceId?: string;
  deviceFingerprint?: string;
  userAgent?: string;
  networkType?: string;
  vpnDetected?: boolean;
  gpsLatitude?: number;
  gpsLongitude?: number;
  geoAddress?: string;
  gpsAccuracy?: number;
  branchCode: string;
}

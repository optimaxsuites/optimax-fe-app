import { AttendanceTableRecord } from './attendancetable.dto';

/**
 * Mock Attendance Data for Testing
 * Use this to test cross-branch approvals, remote check-in, and attendance features
 */

export const MOCK_EMPLOYEES = {
  employee1: { id: 101, name: 'John Smith', department: 'Engineering', homeBranchId: 1 },
  employee2: { id: 102, name: 'Sarah Johnson', department: 'Sales', homeBranchId: 1 },
  employee3: { id: 103, name: 'Michael Chen', department: 'Marketing', homeBranchId: 2 },
  employee4: { id: 104, name: 'Emily Davis', department: 'HR', homeBranchId: 1 },
};

export const MOCK_BRANCHES = {
  mainOffice: { id: 1, name: 'Main Office - Lagos' },
  branchA: { id: 2, name: 'Branch A - Abuja' },
  branchB: { id: 3, name: 'Branch B - Port Harcourt' },
};

// Mock attendance records with different scenarios
export const MOCK_ATTENDANCE_RECORDS: AttendanceTableRecord[] = [
  // 1. Normal biometric check-in at home branch
  {
    id: 1001,
    employeeId: '101',
    employee: 'John Smith',
    department: 'Engineering',
    date: new Date('2026-08-28'),
    checkIn: '08:15:00',
    checkOut: '17:30:00',
    checkInLocation: { address: 'Main Office - Lagos', lat: 6.5244, lng: 3.3792 },
    checkOutLocation: { address: 'Main Office - Lagos', lat: 6.5244, lng: 3.3792 },
    clockInSource: 'BIOMETRIC',
    clockOutSource: 'BIOMETRIC',
    status: 'PRESENT',
    hours: 9.25,
    homeBranchId: 1,
    homeBranchName: 'Main Office - Lagos',
    checkedInBranchId: 1,
    checkedInBranchName: 'Main Office - Lagos',
    isCrossBranchAttendance: false,
  },

  // 2. PENDING cross-branch - Employee from Branch 1 checked in at Branch 2
  {
    id: 1002,
    employeeId: '102',
    employee: 'Sarah Johnson',
    department: 'Sales',
    date: new Date('2026-08-28'),
    checkIn: '09:00:00',
    checkOut: null,
    checkInLocation: { address: 'Branch A - Abuja', lat: 9.0765, lng: 7.3986 },
    checkOutLocation: null,
    clockInSource: 'BIOMETRIC',
    status: 'PRESENT',
    hours: 0,
    homeBranchId: 1,
    homeBranchName: 'Main Office - Lagos',
    checkedInBranchId: 2, // Different branch!
    checkedInBranchName: 'Branch A - Abuja',
    isCrossBranchAttendance: true,
    crossBranchApprovalStatus: 'PENDING',
  },

  // 3. APPROVED cross-branch - Already approved by admin
  {
    id: 1003,
    employeeId: '103',
    employee: 'Michael Chen',
    department: 'Marketing',
    date: new Date('2026-08-27'),
    checkIn: '08:30:00',
    checkOut: '17:00:00',
    checkInLocation: { address: 'Branch B - Port Harcourt', lat: 4.8156, lng: 7.0498 },
    checkOutLocation: { address: 'Branch B - Port Harcourt', lat: 4.8156, lng: 7.0498 },
    clockInSource: 'REMOTE',
    clockOutSource: 'REMOTE',
    status: 'PRESENT',
    hours: 8.5,
    homeBranchId: 2,
    homeBranchName: 'Branch A - Abuja',
    checkedInBranchId: 3,
    checkedInBranchName: 'Branch B - Port Harcourt',
    isCrossBranchAttendance: true,
    crossBranchApprovalStatus: 'APPROVED',
  },

  // 4. REJECTED cross-branch - Denied by admin
  {
    id: 1004,
    employeeId: '104',
    employee: 'Emily Davis',
    department: 'HR',
    date: new Date('2026-08-26'),
    checkIn: '10:00:00',
    checkOut: null,
    checkInLocation: { address: 'Branch B - Port Harcourt', lat: 4.8156, lng: 7.0498 },
    checkOutLocation: null,
    clockInSource: 'BIOMETRIC',
    status: 'ABSENT',
    hours: 0,
    homeBranchId: 1,
    homeBranchName: 'Main Office - Lagos',
    checkedInBranchId: 3,
    checkedInBranchName: 'Branch B - Port Harcourt',
    isCrossBranchAttendance: true,
    crossBranchApprovalStatus: 'REJECTED',
  },

  // 5. Remote check-in at home branch
  {
    id: 1005,
    employeeId: '101',
    employee: 'John Smith',
    department: 'Engineering',
    date: new Date('2026-08-27'),
    checkIn: '08:00:00',
    checkOut: '16:45:00',
    checkInLocation: null, // Remote has no physical location
    checkOutLocation: null,
    clockInSource: 'REMOTE',
    clockOutSource: 'REMOTE',
    status: 'PRESENT',
    hours: 8.75,
    homeBranchId: 1,
    homeBranchName: 'Main Office - Lagos',
    checkedInBranchId: 1,
    checkedInBranchName: 'Main Office - Lagos',
    isCrossBranchAttendance: false,
  },

  // 6. PENDING cross-branch + PENDING correction request
  {
    id: 1006,
    employeeId: '102',
    employee: 'Sarah Johnson',
    department: 'Sales',
    date: new Date('2026-08-26'),
    checkIn: '08:45:00',
    checkOut: '18:00:00',
    checkInLocation: { address: 'Branch A - Abuja', lat: 9.0765, lng: 7.3986 },
    checkOutLocation: { address: 'Branch A - Abuja', lat: 9.0765, lng: 7.3986 },
    clockInSource: 'BIOMETRIC',
    clockOutSource: 'BIOMETRIC',
    status: 'PRESENT',
    hours: 9.25,
    homeBranchId: 1,
    homeBranchName: 'Main Office - Lagos',
    checkedInBranchId: 2,
    checkedInBranchName: 'Branch A - Abuja',
    isCrossBranchAttendance: true,
    crossBranchApprovalStatus: 'PENDING',
    correctionRequest: {
      type: 'WRONG_TIME',
      reason: 'Forgot to clock out, actual time was 17:00',
      status: 'PENDING',
      requestedAt: new Date('2026-08-26T18:30:00'),
      requestedBy: 'Sarah Johnson',
    },
  },

  // 7. Multiple pending cross-branch for testing bulk approve
  {
    id: 1007,
    employeeId: '103',
    employee: 'Michael Chen',
    department: 'Marketing',
    date: new Date('2026-08-28'),
    checkIn: '09:15:00',
    checkOut: null,
    checkInLocation: null,
    checkOutLocation: null,
    clockInSource: 'REMOTE',
    status: 'PRESENT',
    hours: 0,
    homeBranchId: 2,
    homeBranchName: 'Branch A - Abuja',
    checkedInBranchId: 1,
    checkedInBranchName: 'Main Office - Lagos',
    isCrossBranchAttendance: true,
    crossBranchApprovalStatus: 'PENDING',
  },

  // 8. Normal record for contrast
  {
    id: 1008,
    employeeId: '104',
    employee: 'Emily Davis',
    department: 'HR',
    date: new Date('2026-08-28'),
    checkIn: '08:30:00',
    checkOut: null,
    checkInLocation: { address: 'Main Office - Lagos', lat: 6.5244, lng: 3.3792 },
    checkOutLocation: null,
    clockInSource: 'BIOMETRIC',
    status: 'PRESENT',
    hours: 0,
    homeBranchId: 1,
    homeBranchName: 'Main Office - Lagos',
    checkedInBranchId: 1,
    checkedInBranchName: 'Main Office - Lagos',
    isCrossBranchAttendance: false,
  },
];

// Helper function to get records by status
export function getMockRecordsByStatus(status: 'PENDING' | 'APPROVED' | 'REJECTED') {
  return MOCK_ATTENDANCE_RECORDS.filter(
    record => record.crossBranchApprovalStatus === status
  );
}

// Helper function to get pending cross-branch records
export function getMockPendingCrossBranch() {
  return MOCK_ATTENDANCE_RECORDS.filter(
    record => record.isCrossBranchAttendance && record.crossBranchApprovalStatus === 'PENDING'
  );
}

// Helper function to get records with pending corrections
export function getMockPendingCorrections() {
  return MOCK_ATTENDANCE_RECORDS.filter(
    record => record.correctionRequest && record.correctionRequest.status === 'PENDING'
  );
}

// Helper function to get all pending (corrections + cross-branch)
export function getMockAllPending() {
  return MOCK_ATTENDANCE_RECORDS.filter(
    record =>
      (record.correctionRequest && record.correctionRequest.status === 'PENDING') ||
      (record.isCrossBranchAttendance && record.crossBranchApprovalStatus === 'PENDING')
  );
}

// Mock statistics
export const MOCK_CROSS_BRANCH_STATS = {
  pending: 3,
  approved: 1,
  rejected: 1,
  total: 5,
};

/**
 * Usage Examples:
 * 
 * 1. In component for testing:
 *    import { MOCK_ATTENDANCE_RECORDS } from './mock-attendance-data';
 *    this.attendanceRecords = MOCK_ATTENDANCE_RECORDS;
 * 
 * 2. In service for development:
 *    return of(MOCK_ATTENDANCE_RECORDS); // Instead of HTTP call
 * 
 * 3. Testing specific scenarios:
 *    const pendingRecords = getMockPendingCrossBranch();
 *    const allPending = getMockAllPending();
 */

import { AttendanceTableRecord } from "./attendancetable.dto";

// Branch definitions
export const BRANCHES = {
  HQ: 1,
  BRANCH_1: 2,
  BRANCH_2: 3
};

export const BRANCH_NAMES: { [key: number]: string } = {
  1: 'HQ (Lagos)',
  2: 'Branch 1 (Abuja)',
  3: 'Branch 2 (Port Harcourt)'
};

export const MOCK_ATTENDANCE: AttendanceTableRecord[] = [
  {
    id: 1,
    employee: 'Eseose Developer',
    employeeId: 1,
    department: 'Engineering',
    date: new Date().toISOString().split('T')[0],
    checkIn: null,
    checkOut: null,
    checkInLocation: null,
    checkOutLocation: null,
    status: 'ABSENT',
    hours: 0,
    lateMinutes: 0,
    overtime: 0,
    homeBranchId: BRANCHES.HQ,
    checkedInBranchId: BRANCHES.HQ
  },
  {
    id: 2,
    employee: 'Jane Smith',
    employeeId: 102,
    department: 'HR',
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:15',
    checkOut: '18:00',
    checkInLocation: { address: '456 Business Ave, Corporate HQ, Lagos', lat: 6.5300, lng: 3.3850 },
    checkOutLocation: { address: '456 Business Ave, Corporate HQ, Lagos', lat: 6.5300, lng: 3.3850 },
    status: 'LATE',
    hours: 8.75,
    lateMinutes: 15,
    overtime: 0.75,
    homeBranchId: BRANCHES.HQ,
    checkedInBranchId: BRANCHES.HQ,
    correctionRequest: {
      id: 201,
      type: 'TIME_CORRECTION',
      reason: 'Traffic delay due to accident on Lagos expressway. Arrived at 9:10 AM, system recorded 9:15',
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
      requestedBy: 'Jane Smith'
    }
  },
  {
    id: 3,
    employee: 'Mike Johnson',
    employeeId: 103,
    department: 'Finance',
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:00',
    checkOut: '17:00',
    checkInLocation: { address: '789 Finance Blvd, Downtown, Lagos', lat: 6.5150, lng: 3.3700 },
    checkOutLocation: { address: '789 Finance Blvd, Downtown, Lagos', lat: 6.5150, lng: 3.3700 },
    status: 'PRESENT',
    hours: 8,
    lateMinutes: 0,
    overtime: 0,
    homeBranchId: BRANCHES.BRANCH_1,
    checkedInBranchId: BRANCHES.HQ
  },
  {
    id: 4,
    employee: 'Sarah Williams',
    employeeId: 104,
    department: 'Engineering',
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:30',
    checkOut: '18:15',
    checkInLocation: { address: '321 Innovation Drive, Tech District, Lagos', lat: 6.5280, lng: 3.3820 },
    checkOutLocation: { address: '321 Innovation Drive, Tech District, Lagos', lat: 6.5280, lng: 3.3820 },
    status: 'LATE',
    hours: 8.75,
    lateMinutes: 30,
    overtime: 0.75,
    homeBranchId: BRANCHES.BRANCH_2,
    checkedInBranchId: BRANCHES.BRANCH_2
  },
  {
    id: 5,
    employee: 'David Brown',
    employeeId: 105,
    department: 'Sales',
    date: new Date().toISOString().split('T')[0],
    checkIn: null,
    checkOut: null,
    checkInLocation: null,
    checkOutLocation: null,
    status: 'ABSENT',
    hours: 0,
    lateMinutes: 0,
    overtime: 0,
    homeBranchId: BRANCHES.HQ,
    checkedInBranchId: undefined,
    correctionRequest: {
      id: 202,
      type: 'STATUS_CORRECTION',
      reason: 'Was working from home for a client meeting. Forgot to check in remotely. Please reopen for late check-in.',
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
      requestedBy: 'David Brown'
    }
  }
];

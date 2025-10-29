import { Injectable } from '@angular/core';

export interface Shift {
  id: number;
  employeeId: number;
  employeeName: string;
  projectId?: number;
  projectName?: string;
  location?: string;
  date: string; 
  expectedClockIn: string; 
  expectedClockOut: string; 
  actualClockIn?: string;
  actualClockOut?: string;
  status: 'Scheduled' | 'Completed' | 'Missed' | 'Late';
  notes?: string;
  verifiedBy?: string;
}

@Injectable({ providedIn: 'root' })
export class ShiftService {
  private shifts: Shift[] = [
    {
      id: 1,
      employeeId: 1,
      employeeName: 'John Doe',
      projectName: 'CivicLens Dashboard',
      date: '2025-10-27',
      expectedClockIn: '09:00',
      expectedClockOut: '17:00',
      status: 'Scheduled',
    },
    {
      id: 2,
      employeeId: 2,
      employeeName: 'Mary Smith',
      projectName: 'iTeleStream Upgrade',
      date: '2025-10-27',
      expectedClockIn: '08:00',
      expectedClockOut: '16:00',
      status: 'Scheduled',
    },
    {
      id: 3,
      employeeId: 5,
      employeeName: 'Tunde Ola',
      projectName: 'ERP Revamp',
      date: '2025-10-28',
      expectedClockIn: '10:00',
      expectedClockOut: '18:00',
      status: 'Scheduled',
    },
  ];

  // ✅ Get all shifts
  getAllShifts(): Shift[] {
    return this.shifts;
  }

  // ✅ Get all shifts for a given employee
  getShiftsForEmployee(employeeId: number): Shift[] {
    return this.shifts.filter(s => s.employeeId === employeeId);
  }

  // ✅ Get today's shift (if any)
  getShiftForToday(employeeId: number): Shift | undefined {
    const today = new Date().toISOString().split('T')[0];
    return this.shifts.find(s => s.employeeId === employeeId && s.date === today);
  }

  // ✅ Mark clock-in
  clockInShift(employeeId: number): Shift | null {
    const shift = this.getShiftForToday(employeeId);
    if (!shift) return null;

    shift.actualClockIn = this.getCurrentTime();

    // Check lateness
    if (shift.actualClockIn > shift.expectedClockIn) {
      shift.status = 'Late';
    } else {
      shift.status = 'Scheduled';
    }

    return shift;
  }

  // ✅ Mark clock-out
  clockOutShift(employeeId: number): Shift | null {
    const shift = this.getShiftForToday(employeeId);
    if (!shift) return null;

    shift.actualClockOut = this.getCurrentTime();
    shift.status = 'Completed';
    return shift;
  }

  // ✅ Create new shift (admin)
  addShift(shift: Shift) {
    shift.id = this.shifts.length + 1;
    this.shifts.push(shift);
  }

  // ✅ Helper
  private getCurrentTime(): string {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:mm
  }
}

import { Injectable } from '@angular/core';

export interface Shift {
  id: number;
  name: string; // e.g., "Morning Shift"
  projectId?: number;
  projectName?: string;
  assignedTo: { id: number; name: string }[]; // multiple employees
  startTime: string; // e.g., '09:00'
  endTime: string;   // e.g., '17:00'
  recurrence?: 'Daily' | 'Weekly' | 'Custom';
  location?: string;
  active: boolean;
  date: string;
}

export interface ShiftRecord {
  id: number;
  shiftId: number;
  employeeId: number;
  employeeName: string;
  date: string; // '2025-10-27'
  expectedClockIn: string;
  expectedClockOut: string;
  actualClockIn?: string;
  actualClockOut?: string;
  status: 'Scheduled' | 'Completed' | 'Late' | 'Missed' | 'Unscheduled';
  notes?: string;
  verifiedBy?: string;
}

@Injectable({ providedIn: 'root' })
export class ShiftService {
  private currentEmployee = 'John Doe'
  private shifts: Shift[] = [
    {
      id: 1,
      name: 'Morning Shift',
      projectName: 'CivicLens Dashboard',
      assignedTo: [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Mary Smith' }
      ],
      startTime: '09:00',
      endTime: '17:00',
      recurrence: 'Daily',
      location: 'Head Office',
      active: true,
      date: '2025-10-27',

    },
    {
      id: 2,
      name: 'Night Duty',
      projectName: 'iTeleStream Upgrade',
      assignedTo: [
        { id: 3, name: 'Tunde Ola' },
        { id: 4, name: 'Jane Johnson' }
      ],
      startTime: '21:00',
      endTime: '06:00',
      recurrence: 'Weekly',
      location: 'Remote',
      date: '2025-10-26',

      active: true,
    },
    {
      id: 3,
      name: 'Support Shift',
      projectName: 'ERP Revamp',
      assignedTo: [{ id: 5, name: 'Samuel Lee' }],
      startTime: '08:00',
      endTime: '16:00',
      recurrence: 'Daily',
      location: 'Client Site',
      date: '2025-10-29',

      active: true,
    }
  ];

  private shiftRecords: ShiftRecord[] = [
  {
      id: 1,
      shiftId: 1,
      employeeId: 1,
      employeeName: 'John Doe',
      date: '2025-10-27',
      expectedClockIn: '09:00',
      expectedClockOut: '17:00',
      status: 'Scheduled',
    },
    // 2. Late Clock-In, Still Working
    {
      id: 2,
      shiftId: 1,
      employeeId: 2,
      employeeName: 'Mary Smith',
      date: '2025-10-27',
      expectedClockIn: '09:00',
      expectedClockOut: '17:00',
      actualClockIn: '09:15', // 🆕 Late clock-in
      status: 'Late',
      notes: 'Arrived late due to traffic issue on Ikorodu road.'
    },
    // 3. Completed Shift
    {
      id: 3,
      shiftId: 2,
      employeeId: 3,
      employeeName: 'Tunde Ola',
      date: '2025-10-26', // 🆕 Change to a previous date
      expectedClockIn: '21:00',
      expectedClockOut: '06:00',
      actualClockIn: '20:55',
      actualClockOut: '06:03',
      status: 'Completed',
    },
    // 4. Missed Shift
    {
      id: 4,
      shiftId: 2,
      employeeId: 4,
      employeeName: 'Jane Johnson',
      date: '2025-10-27',
      expectedClockIn: '21:00',
      expectedClockOut: '06:00',
      status: 'Missed',
      notes: 'Employee called in sick. Needs replacement record.'
    },
    // 5. Another Scheduled (Previous date, to test multi-day records)
    {
      id: 5,
      shiftId: 3,
      employeeId: 5,
      employeeName: 'Samuel Lee',
      date: '2025-10-26', 
      expectedClockIn: '08:00',
      expectedClockOut: '16:00',
      actualClockIn: '07:58',
      actualClockOut: '16:05',
      status: 'Completed',
      verifiedBy: 'Manager A'
    },
    // Add one record for current date to test calendar view's date selection (Assuming today is 2025-10-27)
    {
      id: 6,
      shiftId: 3,
      employeeId: 5,
      employeeName: 'Samuel Lee',
      date: '2025-10-27', 
      expectedClockIn: '08:00',
      expectedClockOut: '16:00',
      status: 'Scheduled',
    }
  ];

  // ✅ Get all shifts
  getAllShifts(): Shift[] {
    return this.shifts;
  }

  // ✅ Get shift records (by employee or all)
  getShiftRecords(employeeId?: number): ShiftRecord[] {
    return employeeId
      ? this.shiftRecords.filter(r => r.employeeId === employeeId)
      : this.shiftRecords;
  }

  // ✅ Clock in
  clockIn(employeeId: number): ShiftRecord | null {
    const today = new Date().toISOString().split('T')[0];
    const record = this.shiftRecords.find(r => r.employeeId === employeeId && r.date === today);
    if (!record) return null;

    record.actualClockIn = this.getCurrentTime();
    record.status = record.actualClockIn > record.expectedClockIn ? 'Late' : 'Scheduled';
    return record;
  }

  // ✅ Clock out
  clockOut(employeeId: number): ShiftRecord | null {
    const today = new Date().toISOString().split('T')[0];
    const record = this.shiftRecords.find(r => r.employeeId === employeeId && r.date === today);
    if (!record) return null;

    record.actualClockOut = this.getCurrentTime();
    record.status = 'Completed';
    return record;
  }

  // ✅ Add a new shift (auto-creates records for assigned employees)
  addShift(shift: Shift, startDate: string, days: number = 7) {
    shift.id = this.shifts.length + 1;
    this.shifts.push(shift);

    // auto-generate records for next N days
    shift.assignedTo.forEach(emp => {
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const formatted = date.toISOString().split('T')[0];

        this.shiftRecords.push({
          id: this.shiftRecords.length + 1,
          shiftId: shift.id,
          employeeId: emp.id,
          employeeName: emp.name,
          date: formatted,
          expectedClockIn: shift.startTime,
          expectedClockOut: shift.endTime,
          status: 'Scheduled',
        });
      }
    });
  }

  private getCurrentTime(): string {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:mm
  }

   getMyShifts(): Shift[] {
    return this.shifts.filter(shift =>
      shift.assignedTo.some(emp => emp.name === this.currentEmployee)
    );
  }

  //  getMyShifts(): Shift[] {
  //   return this.shiftRecords.filter(shift =>
  //     shift.assignedTo.some(emp => emp.name === this.currentEmployee)
  //   );
  // }

  /** Returns all records belonging to current employee */
  getMyRecords(): ShiftRecord[] {
    const allRecords = this.getShiftRecords();
    return allRecords.filter(rec => rec.employeeName === this.currentEmployee);
  }

  /** Combine shift and record info for UI (status, times, etc.) */
  getMyScheduleWithRecords() {
    const myShifts = this.getMyShifts();
    const myRecords = this.getMyRecords();

    return myShifts.map(shift => {
      const rec = myRecords.find(r => r.shiftId === shift.id);
      return {
        ...shift,
        status: rec?.status || 'Not Marked',
        clockIn: rec?.expectedClockIn,
        clockOut: rec?.expectedClockOut,
      };
    });
  }

  /** Optionally set a different user */
  setCurrentEmployee(name: string) {
    this.currentEmployee = name;
  }

  getCurrentEmployee() {
    return this.currentEmployee;
  }
}

import { Component } from '@angular/core';
import { Shift, ShiftRecord, ShiftService } from '../../../../service/schedules.service';



interface EmployeeAttendance {
  employeeId: number;
  employeeName: string;
  record?: ShiftRecord; // Optional - exists only if they've clocked in/out
  status: 'Scheduled' | 'Completed' | 'Late' | 'Missed' | 'Unscheduled';
}

interface ShiftWithAttendance extends Shift {
  attendance: EmployeeAttendance[];
}

@Component({
  selector: 'app-my-schedules',
  templateUrl: './my-schedules.component.html',
  styleUrl: './my-schedules.component.scss'
})
export class MySchedulesComponent {
viewMode: 'calendar' | 'table' = 'calendar';
  shifts: Shift[] = [];
  records: ShiftRecord[] = [];
  selectedDate: Date = new Date();
  selectedDateString = '';

  selectedDateShifts: ShiftWithAttendance[] = [];
  selectedRecord: ShiftRecord | null = null;

  currentUser = { id: 1, name: 'John Doe' }; // Replace with AuthService if available

  constructor(private shiftService: ShiftService) {}

  ngOnInit() {
    // Fetch only the current user’s data
    this.shifts = this.shiftService.getMyShifts();
    this.records = this.shiftService.getMyRecords();
    this.onDateSelect(new Date());
  }

  hasShiftsOnDate(date: any): boolean {
    const dateStr = `${date.year}-${String(date.month + 1).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
    return this.shifts.some(shift => this.isShiftActiveOnDate(shift, dateStr));
  }

  isShiftActiveOnDate(shift: Shift, dateStr: string): boolean {
    const shiftDate = new Date(shift.date);
    const checkDate = new Date(dateStr);

    if (shift.date === dateStr) return true;

    if (shift.recurrence === 'Daily' && checkDate >= shiftDate) {
      return true;
    }

    if (shift.recurrence === 'Weekly') {
      const daysDiff = Math.floor((checkDate.getTime() - shiftDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff % 7 === 0;
    }

    return false;
  }

  onDateSelect(selected: Date) {
    this.selectedDate = selected;
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    this.selectedDateString = `${yyyy}-${mm}-${dd}`;

    // Filter only the current user's shifts
    this.selectedDateShifts = this.shifts
      .filter(shift => this.isShiftActiveOnDate(shift, this.selectedDateString))
      .map(shift => ({
        ...shift,
        attendance: this.buildAttendanceList(shift)
      }));

    this.selectedRecord = null;
  }

  buildAttendanceList(shift: Shift): EmployeeAttendance[] {
    // The employee view only needs their own attendance
    const record = this.records.find(
      r => r.shiftId === shift.id && r.employeeId === this.currentUser.id && r.date === this.selectedDateString
    );

    return [
      {
        employeeId: this.currentUser.id,
        employeeName: this.currentUser.name,
        record: record,
        status: record ? record.status : 'Scheduled'
      }
    ];
  }

  toggleView(view: 'calendar' | 'table') {
    this.viewMode = view;
    this.selectedRecord = null;
  }

  selectRecord(record: ShiftRecord) {
    this.selectedRecord = record;
  }

  clearSelection() {
    this.selectedRecord = null;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'text-green-600 bg-green-100';
      case 'Scheduled': return 'text-yellow-600 bg-yellow-100';
      case 'Late': return 'text-orange-600 bg-orange-100';
      case 'Missed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }
}

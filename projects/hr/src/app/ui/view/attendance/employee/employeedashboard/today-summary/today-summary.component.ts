import { Component, OnInit, inject } from '@angular/core';
import { AttendancetableService } from '../../../../../service/attendance/attendancetable.service';
import { AttendanceTableRecord } from '../../../../../domain/attendance/attendancetable.dto';
import { OfficeHoursService } from '../../../../../service/attendance/office-hours.service';
import { UserSessionService } from '../../../../../service/attendance/user-session.service';
import { EmployeeService } from '../../../../../service/employee.service';

@Component({
  selector: 'app-today-summary',
  templateUrl: './today-summary.component.html',
  styleUrl: './today-summary.component.scss'
})
export class TodaySummaryComponent implements OnInit {

  private attendanceService = inject(AttendancetableService);
  private officehoursService = inject(OfficeHoursService);
  private userSession = inject(UserSessionService);
  private employeeService = inject(EmployeeService);
  summary = {
    hoursWorked: 0,
    expectedHours: 8,
    lateMinutes: 0,
    overtime: 0
  };

  //employeeName = ''; 
  hrEmployeeId: number | null = null;

  private currentUser: any;

  ngOnInit() {
    this.currentUser = this.userSession.getCurrentUser();

    if(!this.currentUser) {
      return;
    }

    // Use EmployeeService which has better fallback mechanisms
    this.employeeService.getEmployeeIdForCurrentUser().subscribe({
      next: (employeeId) => {
        this.hrEmployeeId = employeeId;

        this.attendanceService.attendance$.subscribe(data => {
          this.calculateTodaySummary(data);
        });
      },
      error: (err) => {
        // Failed to resolve employee ID
      }
    });
  }

  private calculateTodaySummary(data: AttendanceTableRecord[]) {
  const today = new Date().toISOString().split('T')[0];

  if (!this.hrEmployeeId) {
    return;
  }

  const record = data.find(
    r =>
      Number(r.employeeId) === this.hrEmployeeId &&
      r.date === today
  );

  const officeHours = this.officehoursService.getOfficeHours();

  const expectedHours = this.calculateExpectedHours(
    officeHours.openingTime,
    officeHours.closingTime
  );

  if (!record) {
    this.summary = {
      hoursWorked: 0,
      expectedHours,
      lateMinutes: 0,
      overtime: 0
    };
    return;
  }

  const hoursWorked = record.hours ?? 0;

  const lateMinutes = this.calculateLateMinutes(
    record.checkIn,
    officeHours.openingTime
  );

  const overtime = this.calculateOvertime(
    record.checkOut,
    officeHours.closingTime
  );

  this.summary = {
    hoursWorked: +hoursWorked.toFixed(2),
    expectedHours,
    lateMinutes,
    overtime
  };
}

private calculateLateMinutes(checkIn: string | null | undefined, openingTime: string): number {
  if (!checkIn) return 0;

  const open = new Date(`1970-01-01T${openingTime}`);
  const checkInTime = new Date(`1970-01-01T${checkIn}`);

  const diff = checkInTime.getTime() - open.getTime();

  return diff > 0 ? Math.floor(diff / 60000) : 0;
}

private calculateOvertime(checkOut: string | null | undefined, closingTime: string): number {
  if (!checkOut) return 0;

  const close = new Date(`1970-01-01T${closingTime}`);
  const checkOutTime = new Date(`1970-01-01T${checkOut}`);

  const diff = checkOutTime.getTime() - close.getTime();

  return diff > 0 ? +((diff / 3600000)).toFixed(2) : 0;
}
private calculateExpectedHours(openingTime: string, closingTime: string): number {
  const open = new Date(`1970-01-01T${openingTime}`);
  const close = new Date(`1970-01-01T${closingTime}`);

  return +((close.getTime() - open.getTime()) / 3600000).toFixed(2);
}


}

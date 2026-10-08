import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { interval, Subscription } from 'rxjs';
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
export class TodaySummaryComponent implements OnInit, OnDestroy {

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
  private latestData: AttendanceTableRecord[] = [];
  private tickSub?: Subscription;

  ngOnDestroy() {
    this.tickSub?.unsubscribe();
  }

  ngOnInit() {
    this.currentUser = this.userSession.getCurrentUser();

    if(!this.currentUser) {
      return;
    }

    // Keep hours ticking while the user is still clocked in
    this.tickSub = interval(30000).subscribe(() => this.calculateTodaySummary(this.latestData));

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
  this.latestData = data;
  const today = this.formatDateLocal(new Date());

  if (!this.hrEmployeeId) {
    return;
  }

  const record = data.find(
    r =>
      Number(r.employeeId) === this.hrEmployeeId &&
      (r.date ? this.formatDateLocal(r.date) === today : false)
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

  let hoursWorked = record.hours ?? 0;
  if (record.checkIn && !record.checkOut) {
    const start = new Date(`${today}T${record.checkIn}`);
    const elapsed = (Date.now() - start.getTime()) / 3600000;
    if (elapsed > 0) hoursWorked = elapsed;
  }

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

private formatDateLocal(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}


}

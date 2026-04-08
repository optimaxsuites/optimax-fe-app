import { Component, OnInit, inject } from '@angular/core';
import { AttendancetableService } from '../../../../../service/attendance/attendancetable.service';
import { OfficeHoursService } from '../../../../../service/attendance/office-hours.service';

type ClockStatus = 'CLOCKED_IN' | 'CLOCKED_OUT';

@Component({
  selector: 'app-checkin-checkout',
  templateUrl: './checkin-checkout.component.html',
  styleUrl: './checkin-checkout.component.scss'
})
export class CheckinCheckoutComponent implements OnInit {

  private attendanceService = inject(AttendancetableService);
  private officeHoursService = inject(OfficeHoursService);

  currentTime = new Date();
  status: ClockStatus = 'CLOCKED_OUT';
  isAbsentToday = false;
  isOfficeHours = true;
  canClockIn = true;
  isWithinOfficeHours = true;
  isAfterOpening = true;
  hasCompletedToday = false;
  isGettingLocation = false;

  //later, change to reflect each individual employee
  employeeid = '001';
  employeeName = 'Chrisha Okorocha';
  department = 'Engineering';

  ngOnInit() {
    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);

      this.status = this.attendanceService.getClockStatus();

    // Optional: react to future changes
    this.attendanceService.clockStatus$.subscribe(s => this.status = s);

    this.attendanceService.attendance$.subscribe(() => {
      this.hasCompletedToday =
  this.attendanceService.hasCompletedToday(this.employeeid);
  this.isAbsentToday =
    this.attendanceService.isEmployeeBlockedToday(this.employeeid);
});

  // Initial check
  this.checkOfficeHours();

  // React if admin changes hours
  this.officeHoursService.officeHours$
    .subscribe(() => this.checkOfficeHours());
  }

  async toggleClock() {
    if (this.isAbsentToday) {
    return; // Block action completely

    this.isGettingLocation = true;
  }

  if (this.status === 'CLOCKED_OUT') {
    this.status = 'CLOCKED_IN';
    this.attendanceService.setClockStatus('CLOCKED_IN');

    await this.attendanceService.clockAction(
      this.employeeid,
      this.employeeName,
      this.department,
      'IN'
    );

  } else {

    this.status = 'CLOCKED_OUT';
    this.attendanceService.setClockStatus('CLOCKED_OUT');

    this.attendanceService.clockAction(
      this.employeeid,
      this.employeeName,
      this.department,
      'OUT'
    );
  }
  this.isGettingLocation  = false;
}

/*checkOfficeHours() {
  this.isOfficeHours =
    this.officeHoursService.isWithinOfficeHours(this.currentTime);
}
checkOfficeHours() {
  const now = this.currentTime;

  const withinHours =
    this.officeHoursService.isWithinOfficeHours(now);

  const afterOpening =
    this.officeHoursService.isAfterOpeningTime(now);

  // Can only clock in during official hours
  this.canClockIn = withinHours;

  // Can clock out anytime after opening
  this.isOfficeHours = afterOpening;
}*/
checkOfficeHours() {
  const now = this.currentTime;

  this.isWithinOfficeHours =
    this.officeHoursService.isWithinOfficeHours(now);

  this.isAfterOpening =
    this.officeHoursService.isAfterOpeningTime(now);
}
    /*if (this.status === 'CLOCKED_OUT') {
      this.status = 'CLOCKED_IN';

      this.attendanceService.clockAction(
        this.employeeid,
        this.employeeName,
        this.department,
        'IN'
      );
    } else {
      this.status = 'CLOCKED_OUT';

      this.attendanceService.clockAction(
        this.employeeid,
        this.employeeName,
        this.department,
        'OUT'
      );
    }*/
  }



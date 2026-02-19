import { Component, OnInit, inject } from '@angular/core';
import { AttendancetableService } from '../../../../../service/attendance/attendancetable.service';

type ClockStatus = 'CLOCKED_IN' | 'CLOCKED_OUT';

@Component({
  selector: 'app-checkin-checkout',
  templateUrl: './checkin-checkout.component.html',
  styleUrl: './checkin-checkout.component.scss'
})
export class CheckinCheckoutComponent implements OnInit {

  private attendanceService = inject(AttendancetableService);

  currentTime = new Date();
  status: ClockStatus = 'CLOCKED_OUT';

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
  }

  toggleClock() {
    if (this.status === 'CLOCKED_OUT') {
      this.status = 'CLOCKED_IN';
      this.attendanceService.setClockStatus('CLOCKED_IN');

      this.attendanceService.clockAction(this.employeeid, this.employeeName, this.department, 'IN');

    } else {
      this.status = 'CLOCKED_OUT';
      this.attendanceService.setClockStatus('CLOCKED_OUT');

      this.attendanceService.clockAction(this.employeeid, this.employeeName, this.department, 'OUT');
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

}

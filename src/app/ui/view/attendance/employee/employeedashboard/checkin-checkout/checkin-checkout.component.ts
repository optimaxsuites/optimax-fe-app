import { Component, OnInit, inject } from '@angular/core';
import { AttendancetableService } from '../../../../../service/attendance/attendancetable.service';
import { OfficeHoursService } from '../../../../../service/attendance/office-hours.service';
import { UserSessionService } from '../../../../../service/attendance/user-session.service';

type ClockStatus = 'CLOCKED_IN' | 'CLOCKED_OUT';

@Component({
  selector: 'app-checkin-checkout',
  templateUrl: './checkin-checkout.component.html',
  styleUrl: './checkin-checkout.component.scss'
})
export class CheckinCheckoutComponent implements OnInit {

  private attendanceService = inject(AttendancetableService);
  private officeHoursService = inject(OfficeHoursService);
  private userSession = inject(UserSessionService);

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
  //employeeid = '001';
  //employeeName = 'Chrisha Okorocha';
  //department = 'Engineering';

  /*private*/hrEmployeeId: string | null = null;
  //private hrDepartment: string = '';
  /*private*/ hrDepartment = '';
  /*private*/ hrEmployeeName = '';

  get currentUser() {
    return this.userSession.getCurrentUser();
  }

  

  ngOnInit() {

    const currentUser = this.userSession.getCurrentUser();

    console.log('getCurrentUser resolved:', currentUser);

    if (currentUser?.userId) {

      console.log('SESSION USER:', currentUser);
    console.log('SESSION USER ID:', currentUser.userId);

      this.attendanceService
        .resolveHrEmployeeId(currentUser.userId)
        .subscribe(result => {

          console.log('Resolved HR employee:', result);

          if (!result) {
            console.error('HR employee not found');
            return;
          }

          this.hrEmployeeId = result.id;
          this.hrDepartment = result.department;
          this.hrEmployeeName = result.fullName;

          console.log('HR employee ID resolved:', this.hrEmployeeId);
        });
    }


    /*const username = sessionStorage.getItem('userid'); // "chrisha"
    if (username) {
      this.attendanceService.resolveHrEmployeeId(username).subscribe(result => {
        if (result) {
          this.hrEmployeeId = result.id;
          this.hrDepartment = result.department;
          this.hrEmployeeName = result.fullName;
          console.log('Resolved HR employee ID:', result); // should print the correct ID
     
        }
        });
    }*/

  setInterval(() => { this.currentTime = new Date(); }, 1000);

  // React to attendance changes
  this.attendanceService.attendance$.subscribe(() => {
    const userId = this.currentUser?.id!;
    this.hasCompletedToday = this.attendanceService.hasCompletedToday(userId);
    this.isAbsentToday = this.attendanceService.isEmployeeBlockedToday(userId);

    // Restore clock status from today's record after refresh
    this.restoreClockStatus();
  });

  this.checkOfficeHours();
  this.officeHoursService.officeHours$.subscribe(() => this.checkOfficeHours());

  // Load today's record for this employee on init//MonthlyattendancelistComponent already handles fetching
  /*const user = this.currentUser;
  if (user?.id) {
    this.attendanceService.fetchByEmployee(parseInt(user.id));
  }*/
}

private restoreClockStatus(): void {
  const userId = this.currentUser?.id!;
  const restored = this.attendanceService.getTodayStatusForEmployee(userId);

  if (restored === 'CLOCKED_IN') {
    this.status = 'CLOCKED_IN';
    this.attendanceService.setClockStatus('CLOCKED_IN');
  } else if (restored === 'CLOCKED_OUT') {
    this.status = 'CLOCKED_OUT';
    this.attendanceService.setClockStatus('CLOCKED_OUT');
  }
}

  /*ngOnInit() {
    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);

      this.status = this.attendanceService.getClockStatus();

    // Optional: react to future changes
    this.attendanceService.clockStatus$.subscribe(s => this.status = s);

    this.attendanceService.attendance$.subscribe(() => {
      this.hasCompletedToday =
  this.attendanceService.hasCompletedToday(this.currentUser?.id!);
  this.isAbsentToday =
    this.attendanceService.isEmployeeBlockedToday(this.currentUser?.id!);
});

  // Initial check
  this.checkOfficeHours();

  // React if admin changes hours
  this.officeHoursService.officeHours$
    .subscribe(() => this.checkOfficeHours());
  }*/

  async toggleClock() {
    if (this.isAbsentToday) return; // Block action completely

    if (!this.hrEmployeeId) {
      console.error('HR employee ID not resolved yet');
      return;
    }

    if (!this.hrDepartment) {
      console.error('HR employee deparment not resolved yet');
      return;
    }

    this.isGettingLocation = true;
    try {
      if (this.status === 'CLOCKED_OUT') {

        console.log('CLOCK PAYLOAD:', {
          employeeId: this.hrEmployeeId,
          employeeName: this.hrEmployeeName,
          department: this.hrDepartment,
          action: 'IN'
        });
    
        this.status = 'CLOCKED_IN';
        this.attendanceService.setClockStatus('CLOCKED_IN');

        await this.attendanceService.clockAction(
          //this.currentUser!.id,
          this.hrEmployeeId, //HR employee ID for API
          //this.currentUser!.name,
          this.hrEmployeeName,
          //this.currentUser!.department,
          this.hrDepartment, //for department
          'IN'
        );

  } else {

      console.log('CLOCK PAYLOAD:', {
        employeeId: this.hrEmployeeId,
        employeeName: this.hrEmployeeName,
        department: this.hrDepartment,
        action: 'OUT'
      });

    this.status = 'CLOCKED_OUT';
    this.attendanceService.setClockStatus('CLOCKED_OUT');

    await this.attendanceService.clockAction(
      //this.currentUser!.id,
      this.hrEmployeeId, //HR employee ID for API
      //this.currentUser!.name,
      this.hrEmployeeName,
      //this.currentUser!.department,
      this.hrDepartment, //for department
      'OUT'
    );
  }
} finally {
    this.isGettingLocation  = false;
}
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



import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-my-attendance',
  templateUrl: './my-attendance.component.html',
  styleUrls: ['./my-attendance.component.scss']
})
export class MyAttendanceComponent implements OnChanges {
  @Input() clockedInTime: string | null = null; // Expect clockedInTime from parent
  // @Input() userRegData: { fullname: string } | null = null; // Add user data from parent
  userInfoRegData: any[] = [];
  userRegData: any = { };
  displayMessage: string = '';
  isClockedIn: boolean = false; // Track clock-in status
  note: string = ''; // For storing notes
  currentDate: string; // Store the current date
  currentTime: string; // Store the current time

  // Days of the week for attendance
  days: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  attendanceStatus: { [key: string]: string } = {};

  constructor() {
    // Initialize attendance status for each day to 'absent' by default
    this.days.forEach(day => {
      this.attendanceStatus[day] = 'absent';
    });

    // Initialize current date and time
    this.currentDate = new Date().toLocaleDateString(); // Current date
    this.currentTime = new Date().toLocaleTimeString(); // Current time
  }
  ngOnInit() {
    this.userInfoRegData = JSON.parse(sessionStorage["userPrimaryInfoRegData"]);
    this.userRegData = this.userInfoRegData;

    }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['clockedInTime']) {
      this.updateDisplayMessage(changes['clockedInTime'].currentValue);
    }

    // Update current date and time if necessary
    this.currentDate = new Date().toLocaleDateString(); // Update current date
    this.currentTime = new Date().toLocaleTimeString(); // Update current time
  }

  updateDisplayMessage(time: string | null) {
    if (time) {
      this.displayMessage = `Clocked in at: ${time}`;
      this.markAttendance(new Date().toLocaleDateString('en-US', { weekday: 'long' })); // Mark attendance for today
    } else {
      this.displayMessage = `Not clocked in yet.`;
    }
  }

  // Mark attendance for a specific day
  markAttendance(dayName: string) {
    this.attendanceStatus[dayName] = 'present'; // Mark present for the day
  }

  // Get attendance status for a specific day
  getStatus(day: string): string {
    return this.attendanceStatus[day] || 'absent'; // Default to 'absent' if not found
  }

  // Get dynamic class for attendance status
  getAttendanceClass(day: string): string {
    return this.attendanceStatus[day] === 'present' ? 'present-class' : 'absent-class';
  }

  // Toggle clock-in/clock-out (for button click)
  toggleClockInOut() { // Renamed here
    this.isClockedIn = !this.isClockedIn;
    this.note = ''; // Reset note when toggling
  }
}

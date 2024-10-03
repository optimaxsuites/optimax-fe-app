import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-my-attendance',
  templateUrl: './my-attendance.component.html',
  styleUrls: ['./my-attendance.component.scss']
})
export class MyAttendanceComponent implements OnChanges {
  @Input() clockedInTime: string | null = null; // Expect clockedInTime from parent
  @Input() userRegData: { fullname: string } | null = null; // Add user data from parent

  displayMessage: string = '';
  isClockedIn: boolean = false; // Track clock-in status

  // Days of the week for attendance
  days: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  attendanceStatus: { [key: string]: string } = {};

  constructor() {
    // Initialize attendance status for each day to 'absent' by default
    this.days.forEach(day => {
      this.attendanceStatus[day] = 'absent';
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['clockedInTime']) {
      this.updateDisplayMessage(changes['clockedInTime'].currentValue);
    }
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
  toggleClockIn() {
    this.isClockedIn = !this.isClockedIn;
  }
}


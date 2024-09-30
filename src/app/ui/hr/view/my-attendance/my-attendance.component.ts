import { Component } from '@angular/core';

@Component({
  selector: 'app-my-attendance',
  templateUrl: './my-attendance.component.html',
  styleUrls: ['./my-attendance.component.scss']
})
export class MyAttendanceComponent {
  // Days of the week for the right-side attendance boxes
  days: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  attendanceStatus: { [key: string]: string } = {};
  isClockedIn: boolean = false;

  // For the period selection (Left Side)
  selectedPeriodStart: string = '2024-09-22';
  selectedPeriodEnd: string = '2024-09-28';

  // Sample week data for the chart (Left Side)
  weekData = [
    { day: 'Sun', hoursWorked: 0 },
    { day: 'Mon', hoursWorked: 42 },
    { day: 'Tue', hoursWorked: 95 },
    { day: 'Wed', hoursWorked: 100 },
    { day: 'Thu', hoursWorked: 64 },
    { day: 'Fri', hoursWorked: 0 },
    { day: 'Sat', hoursWorked: 0 }
  ];

  constructor() {
    // Initialize attendance status for each day to 'absent' by default (Right Side)
    this.days.forEach(day => {
      this.attendanceStatus[day] = 'absent';
    });
  }

  toggleClockIn() {
    this.isClockedIn = !this.isClockedIn;
    // Add your specific logic here (e.g., update state, make API calls)
  }

  // Get the class for attendance boxes (Right Side)
  getAttendanceClass(day: string): string {
    return this.attendanceStatus[day]; // Return 'present' or 'absent' based on attendance
  }



  // Get the current status for a given day (Right Side)
  getStatus(day: string): string {
    return this.attendanceStatus[day]; // Return the current status (present/absent)
  }

  // Toggle attendance status (Right Side)
  markAttendance(day: string): void {
    this.attendanceStatus[day] = this.attendanceStatus[day] === 'present' ? 'absent' : 'present'; // Toggle attendance status
  }
}

import { Component } from '@angular/core';

@Component({
  selector: 'app-time-sheet',
  templateUrl: './time-sheet.component.html',
  styleUrl: './time-sheet.component.scss'
})
export class TimeSheetComponent {
  days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  projects = ['Project A', 'Project B', 'Project C'];  // Example projects
  projectAssignments: { [key: string]: string } = {};  // Track projects assigned for each day
  taskAssignments: { [key: string]: string } = {};     // Track task descriptions for each day
  actualClockInTimes: { [key: string]: string } = {};
  actualClockOutTimes: { [key: string]: string } = {};
  employeeSignature: string = '';
  supervisorSignature: string = '';
  status: string = '';
  timeSheetColumns = [
    { header: 'Day', field: 'day' },
    { header: 'Project', field: 'project' },
    { header: 'Task', field: 'task' },
    { header: 'Resumption Time', field: 'resumptionTime' },
    { header: 'Closing Time', field: 'closingTime' },
    { header: 'Actual Clock-In', field: 'clockIn' },
    { header: 'Actual Clock-Out', field: 'clockOut' },
    { header: 'Hours Worked', field: 'hoursWorked' }
  ];

  calculateHoursWorked(day: string): number {
    const clockIn = this.actualClockInTimes[day];
    const clockOut = this.actualClockOutTimes[day];
    if (clockIn && clockOut) {
      return this.calculateTimeDifference(clockIn, clockOut);
    }
    return 0;
  }

  calculateTimeDifference(start: string, end: string): number {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);

    const startDate = new Date(0, 0, 0, startHour, startMinute);
    const endDate = new Date(0, 0, 0, endHour, endMinute);

    const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60); // Hours
    return diff;
  }

  submitTimesheetToSupervisor() {
    if (this.employeeSignature && this.supervisorSignature) {
      console.log('Timesheet submitted to HR');
      // Logic to submit timesheet
    } else {
      console.log('Please ensure both employee and supervisor have signed');
    }
  }
}

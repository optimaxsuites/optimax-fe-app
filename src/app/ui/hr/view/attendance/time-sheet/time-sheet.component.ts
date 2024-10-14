import { Component } from '@angular/core';

@Component({
  selector: 'app-time-sheet',
  templateUrl: './time-sheet.component.html',
  styleUrl: './time-sheet.component.scss'
})
export class TimeSheetComponent {


    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    actualClockInTimes: { [key: string]: string } = {};
    actualClockOutTimes: { [key: string]: string } = {};
    employeeSignature: string = '';
    supervisorSignature: string = '';
    status:string = ''

    getResumptionTime(day: string): string {
      return '08:30 AM';
    }

    getClosingTime(day: string): string {
      return day === 'Friday' ? '02:30 PM' : '05:30 PM';
    }

    calculateHoursWorked(day: string): string {
      const clockIn = this.actualClockInTimes[day];
      const clockOut = this.actualClockOutTimes[day];
      if (clockIn && clockOut) {
        const hoursWorked = this.calculateTimeDifference(clockIn, clockOut);
        return `${hoursWorked} hours`;
      }
      return '0 hours';
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
        console.log('Time sheet submitted to HR');
        // Logic to submit the timesheet to the HR system
      } else {
        console.log('Please ensure both employee and supervisor have signed');
      }
    }
  }







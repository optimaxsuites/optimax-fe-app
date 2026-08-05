import { Component, OnDestroy, OnInit } from '@angular/core';
import { AttendanceRecord, AttendanceService } from '../../../service/attendance.service';
import { Subscription, interval } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-my-attendance',
  templateUrl: './my-attendance.component.html',
  styleUrls: ['./my-attendance.component.scss'],
  providers: [ConfirmationService, MessageService]
})
export class MyAttendanceComponent implements OnInit, OnDestroy {
  currentTime: string = '';
  currentRecord: AttendanceRecord | null = null;
  history: AttendanceRecord[] = [];
  private sub = new Subscription();

  // Calculated metrics
  hoursWorkedToday: string = '0h';
  expectedHours: string = '8h';
  lateMinutesValue: string = '0m';
  overtimeValue: string = '0h';
  attendanceRate: string = '0%';
  punctualityScore: string = '0%';
  totalOvertimeMonth: string = '0h';
  absencesCount: number = 0;
  lateMinutesLabel: string = 'On time';
  overtimeLabel: string = 'No overtime';

  constructor(private attendanceService: AttendanceService, private confirmationService: ConfirmationService, private messageService: MessageService) {}

  ngOnInit() {
    // Set employee info for backend API calls
    this.setEmployeeInfoFromSession();

    this.history = this.attendanceService.getHistory();
    this.calculateMetrics();

    this.sub.add(
      interval(1000).subscribe(() => {
        this.currentTime = new Date().toLocaleTimeString();
      })
    );

    this.sub.add(
      this.attendanceService.currentRecord$.subscribe(record => {
        this.currentRecord = record;
        this.calculateMetrics();
      })
    );
  }

  private setEmployeeInfoFromSession(): void {
    try {
      const userInfo = sessionStorage.getItem('userPrimaryInfoRegData');
      if (userInfo) {
        const data = JSON.parse(userInfo);
        if (Array.isArray(data) && data.length > 0) {
          const user = data[0];
          const employeeId = user.id || user.employeeId;
          const employeeName = user.fullName || user.name || '';
          if (employeeId) {
            this.attendanceService.setEmployeeInfo(employeeId, employeeName);
          }
        }
      }
    } catch (e) {
      // Could not load employee info from session
    }
  }

  clockIn(): void {
    this.attendanceService.clockIn();
    this.history = this.attendanceService.getHistory();
    this.calculateMetrics();
    this.messageService.add({
      severity: 'success',
      summary: 'Clocked In',
      detail: 'You have clocked in successfully.',
      key: "tl",
      life: 3000
    });
  }

  clockOut(): void {
    this.attendanceService.clockOut();
    this.history = this.attendanceService.getHistory();
    this.calculateMetrics();
    this.messageService.add({
      severity: 'success',
      summary: 'Clocked Out',
      detail: 'You have clocked out successfully.',
      key: "tl",
      life: 3000
    });
  }

  calculateMetrics(): void {
    this.calculateHoursWorked();
    this.calculateLateMinutes();
    this.calculateOvertime();
    this.calculateAttendanceRate();
    this.calculatePunctualityScore();
    this.calculateTotalOvertimeMonth();
    this.calculateAbsences();
  }

  private calculateHoursWorked(): void {
    if (this.currentRecord && this.currentRecord.clockIn && this.currentRecord.clockOut) {
      const hours = this.getTimeDifferenceInHours(this.currentRecord.clockIn, this.currentRecord.clockOut);
      this.hoursWorkedToday = `${hours}h`;
    } else {
      this.hoursWorkedToday = '0h';
    }
  }

  private calculateLateMinutes(): void {
    if (this.currentRecord && this.currentRecord.clockIn) {
      const expectedStartTime = '09:00';
      const minutes = this.getTimeDifferenceInMinutes(expectedStartTime, this.currentRecord.clockIn);
      if (minutes > 0) {
        this.lateMinutesValue = `${minutes}m`;
        this.lateMinutesLabel = 'Late';
      } else {
        this.lateMinutesValue = '0m';
        this.lateMinutesLabel = 'On time';
      }
    } else {
      this.lateMinutesValue = '0m';
      this.lateMinutesLabel = 'On time';
    }
  }

  private calculateOvertime(): void {
    if (this.currentRecord && this.currentRecord.clockIn && this.currentRecord.clockOut) {
      const hours = this.getTimeDifferenceInHours(this.currentRecord.clockIn, this.currentRecord.clockOut);
      const overtime = Math.max(0, hours - 8);
      if (overtime > 0) {
        this.overtimeValue = `${overtime}h`;
        this.overtimeLabel = 'Extra hours';
      } else {
        this.overtimeValue = '0h';
        this.overtimeLabel = 'No overtime';
      }
    } else {
      this.overtimeValue = '0h';
      this.overtimeLabel = 'No overtime';
    }
  }

  private calculateAttendanceRate(): void {
    if (this.history.length === 0) {
      this.attendanceRate = '—';
      return;
    }

    const validRecords = this.history.filter(r => r.status && r.status.trim().length > 0);
    if (validRecords.length === 0) {
      this.attendanceRate = '—';
      return;
    }

    const presentDays = validRecords.filter(r => r.status.toLowerCase() !== 'absent').length;
    const rate = Math.round((presentDays / validRecords.length) * 100);
    this.attendanceRate = `${rate}%`;
  }

  private calculatePunctualityScore(): void {
    if (this.history.length === 0) {
      this.punctualityScore = '—';
      return;
    }

    const validRecords = this.history.filter(r => r.clockIn && r.status && r.status.toLowerCase() !== 'absent');
    if (validRecords.length === 0) {
      this.punctualityScore = '—';
      return;
    }

    const expectedStartTime = '09:00';
    const onTimeCount = validRecords.filter(r => {
      const minutes = this.getTimeDifferenceInMinutes(expectedStartTime, r.clockIn!);
      return minutes <= 0;
    }).length;

    const score = Math.round((onTimeCount / validRecords.length) * 100);
    this.punctualityScore = `${score}%`;
  }

  private calculateTotalOvertimeMonth(): void {
    let totalOvertime = 0;
    const validRecords = this.history.filter(r => r.clockIn && r.clockOut && r.status && r.status.toLowerCase() !== 'absent');

    validRecords.forEach(record => {
      const hours = this.getTimeDifferenceInHours(record.clockIn!, record.clockOut!);
      totalOvertime += Math.max(0, hours - 8);
    });

    const roundedOvertime = Math.round(totalOvertime * 10) / 10;
    this.totalOvertimeMonth = roundedOvertime > 0 ? `${roundedOvertime}h` : '0h';
  }

  private calculateAbsences(): void {
    this.absencesCount = this.history.filter(r => r.status && r.status.toLowerCase() === 'absent').length;
  }

  private getTimeDifferenceInHours(startTime: string, endTime: string): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    let difference = endTotalMinutes - startTotalMinutes;
    if (difference < 0) difference += 24 * 60;

    return Math.round((difference / 60) * 10) / 10;
  }

  private getTimeDifferenceInMinutes(startTime: string, endTime: string): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    let difference = endTotalMinutes - startTotalMinutes;
    if (difference < 0) difference += 24 * 60;

    return difference;
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}

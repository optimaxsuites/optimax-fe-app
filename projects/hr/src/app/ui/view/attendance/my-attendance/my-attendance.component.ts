import { Component, OnDestroy, OnInit } from '@angular/core';
import { AttendancetableService } from '../../../service/attendance/attendancetable.service';
import { EmployeeCorrectionService } from '../../../service/attendance/employee-correction.service';
import { AttendanceTableRecord } from '../../../domain/attendance/attendancetable.dto';
import { UserSessionService } from '../../../service/attendance/user-session.service';
import { EmployeeService } from '../../../service/employee.service';
import { Subscription, interval } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';

interface AttendanceViewRecord {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  duration?: string;
  status: string;
  expectedStartTime?: string;
}

@Component({
  selector: 'app-my-attendance',
  templateUrl: './my-attendance.component.html',
  styleUrls: ['./my-attendance.component.scss'],
  providers: [ConfirmationService, MessageService]
})
export class MyAttendanceComponent implements OnInit, OnDestroy {
  currentTime: string = '';
  currentRecord: AttendanceViewRecord | null = null;
  hasCompletedAttendanceToday = false;
  isClockActionPending = false;
  history: AttendanceViewRecord[] = [];
  filteredHistory: AttendanceViewRecord[] = [];
  private employeeId: string | null = null;
  private employeeName = '';
  private department = '';
  private sub = new Subscription();

  // Date range filtering
  startDate: string = '';
  endDate: string = '';

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

  // Correction request modal
  showCorrectionModal = false;

  constructor(
    private attendanceService: AttendancetableService,
    private userSession: UserSessionService,
    private employeeService: EmployeeService,
    private correctionService: EmployeeCorrectionService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    // Set employee info for backend API calls
    this.setEmployeeInfoFromSession();

    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.endDate = this.formatDateLocal(today);
    this.startDate = this.formatDateLocal(thirtyDaysAgo);

    this.calculateMetrics();

    this.sub.add(
      interval(1000).subscribe(() => {
        this.currentTime = new Date().toLocaleTimeString();
        this.calculateHoursWorked();
      })
    );

    this.sub.add(
      this.attendanceService.attendance$.subscribe(records => {
        this.history = records
          .filter(record => this.employeeId === null || record.employeeId === this.employeeId)
          .map(record => this.toViewRecord(record));
        this.filteredHistory = [...this.history];
        const today = this.formatDateLocal(new Date());
        this.currentRecord = this.history.find(record => record.date === today) ?? null;
        this.hasCompletedAttendanceToday = this.employeeId !== null
          && this.attendanceService.hasCompletedToday(this.employeeId);
        this.calculateMetrics();
      })
    );

    this.resolveEmployeeAndLoadHistory();
  }

  private resolveEmployeeAndLoadHistory(): void {
    const currentUser = this.userSession.getCurrentUser();
    if (!currentUser) return;

    this.employeeService.getEmployeeIdForCurrentUser().subscribe({
      next: employeeId => {
        this.employeeId = String(employeeId);
        this.attendanceService.fetchByEmployee(String(employeeId));
      },
      error: () => {
        this.employeeId = String(currentUser.id);
        this.attendanceService.fetchByEmployee(String(currentUser.id));
      }
    });
  }

  private setEmployeeInfoFromSession(): void {
    const currentUser = this.userSession.getCurrentUser();
    if (currentUser) {
      this.employeeId = String(currentUser.id);
      this.employeeName = currentUser.name;
      this.department = currentUser.department || 'Default Department';
      return;
    }

    try {
      const userInfo = sessionStorage.getItem('userPrimaryInfoRegData');
      if (userInfo) {
        const data = JSON.parse(userInfo);
        if (Array.isArray(data) && data.length > 0) {
          const user = data[0];
          const employeeId = String(user.id || user.employeeId);
          const employeeName = user.fullName || user.name || '';
          if (employeeId) {
            this.employeeId = employeeId;
            this.employeeName = employeeName;
            this.department = user.department?.name || user.department || 'Default Department';
          }
        }
      }
    } catch (e) {
      // Could not load employee info from session
    }
  }

  async clockIn(): Promise<void> {
    if (this.employeeId === null || this.isClockActionPending || this.hasCompletedAttendanceToday) return;
    this.isClockActionPending = true;
    try {
      await this.attendanceService.clockAction(this.employeeId, this.employeeName, this.department, 'IN');
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Clock In Failed', detail: error instanceof Error ? error.message : 'Location permission is required to clock in.', key: 'tl', life: 4000 });
      return;
    } finally {
      this.isClockActionPending = false;
    }
    this.messageService.add({
      severity: 'success',
      summary: 'Clocked In',
      detail: 'You have clocked in successfully.',
      key: "tl",
      life: 3000
    });
  }

  async clockOut(): Promise<void> {
    if (this.employeeId === null || this.isClockActionPending) return;
    this.isClockActionPending = true;
    try {
      await this.attendanceService.clockAction(this.employeeId, this.employeeName, this.department, 'OUT');
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Clock Out Failed', detail: error instanceof Error ? error.message : 'Failed to update attendance.', key: 'tl', life: 4000 });
      return;
    } finally {
      this.isClockActionPending = false;
    }
    this.messageService.add({
      severity: 'success',
      summary: 'Clocked Out',
      detail: 'You have clocked out successfully.',
      key: "tl",
      life: 3000
    });
  }

  private toViewRecord(record: AttendanceTableRecord): AttendanceViewRecord {
    const clockIn = this.toTime(record.checkIn);
    const clockOut = this.toTime(record.checkOut);
    const duration = record.hours !== undefined
      ? `${Math.round(record.hours * 10) / 10}h`
      : clockIn && clockOut ? `${this.getTimeDifferenceInHours(clockIn, clockOut)}h` : undefined;

    return {
      date: record.date ? (typeof record.date === 'string' ? record.date : this.formatDateLocal(record.date)) : '',
      clockIn,
      clockOut,
      duration,
      status: record.status,
      expectedStartTime: record.appliedExpectedStart
    };
  }

  private toTime(value: string | null | undefined): string | null {
    if (!value) return null;
    const match = value.match(/T(\d{2}:\d{2})|^(\d{2}:\d{2})/);
    return match?.[1] ?? match?.[2] ?? value.slice(0, 5);
  }

  private formatDateLocal(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
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
    } else if (this.currentRecord?.clockIn) {
      // Still clocked in: count up to now
      const now = new Date();
      const nowHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      this.hoursWorkedToday = `${this.getTimeDifferenceInHours(this.currentRecord.clockIn, nowHHmm)}h`;
    } else {
      this.hoursWorkedToday = '0h';
    }
  }

  private calculateLateMinutes(): void {
    if (this.currentRecord && this.currentRecord.clockIn) {
      const expectedStartTime = this.currentRecord.expectedStartTime ?? '09:00';
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

    const onTimeCount = validRecords.filter(r => {
      const minutes = this.getTimeDifferenceInMinutes(r.expectedStartTime ?? '09:00', r.clockIn!);
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

  applyDateFilter(): void {
    if (!this.startDate || !this.endDate) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Date Range Required',
        detail: 'Please select both start and end dates.',
        key: 'tl',
        life: 3000
      });
      return;
    }

    this.filteredHistory = this.history.filter(record => {
      if (!record.date) return false;
      return record.date >= this.startDate && record.date <= this.endDate;
    });

    this.messageService.add({
      severity: 'info',
      summary: 'Filter Applied',
      detail: `Showing ${this.filteredHistory.length} records`,
      key: 'tl',
      life: 3000
    });
  }

  resetDateFilter(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.endDate = this.formatDateLocal(today);
    this.startDate = this.formatDateLocal(thirtyDaysAgo);
    this.filteredHistory = [...this.history];

    this.messageService.add({
      severity: 'info',
      summary: 'Filter Reset',
      detail: 'Showing all records',
      key: 'tl',
      life: 3000
    });
  }

  exportAttendanceCSV(): void {
    if (this.filteredHistory.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Records',
        detail: 'No attendance records to export',
        key: 'tl',
        life: 3000
      });
      return;
    }

    const headers = ['Date', 'Clock In', 'Clock Out', 'Hours', 'Status'];
    let csv = headers.join(',') + '\n';

    this.filteredHistory.forEach(record => {
      const row = [
        record.date || '',
        record.clockIn || '-',
        record.clockOut || '-',
        record.duration || '-',
        record.status || ''
      ];
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `my-attendance-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.messageService.add({
      severity: 'success',
      summary: 'Export Successful',
      detail: `Exported ${this.filteredHistory.length} records`,
      key: 'tl',
      life: 3000
    });
  }

  openCorrectionModal(): void {
    this.showCorrectionModal = true;
  }

  closeCorrectionModal(): void {
    this.showCorrectionModal = false;
  }

  handleCorrectionSubmit(event: any): void {
    this.correctionService.submitForCurrentEmployee(event).subscribe({
      next: () => this.messageService.add({
        severity: 'success',
        summary: 'Correction Request Submitted',
        detail: 'Your request has been submitted for review',
        key: 'tl',
        life: 3000
      }),
      error: () => this.messageService.add({
        severity: 'error',
        summary: 'Submission Failed',
        detail: 'Could not submit your correction request. Please try again.',
        key: 'tl',
        life: 4000
      })
    });
    this.closeCorrectionModal();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}

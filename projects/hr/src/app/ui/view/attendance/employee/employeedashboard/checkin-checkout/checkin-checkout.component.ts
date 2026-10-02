import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { AttendancetableService } from '../../../../../service/attendance/attendancetable.service';
import { OfficeHoursService } from '../../../../../service/attendance/office-hours.service';
import { UserSessionService } from '../../../../../service/attendance/user-session.service';
import { EmployeeService } from '../../../../../service/employee.service';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AttendanceScheduleResolverService } from '../../../../../service/attendance/attendanceschedulreresolver.service';
import { WorkingWindow } from '../../../../../domain/attendance/working-window.dto';

type ClockStatus = 'CLOCKED_IN' | 'CLOCKED_OUT';

@Component({
  selector: 'app-checkin-checkout',
  templateUrl: './checkin-checkout.component.html',
  styleUrl: './checkin-checkout.component.scss'
})
export class CheckinCheckoutComponent implements OnInit, OnDestroy {

  private attendancetableService = inject(AttendancetableService);
  private officeHoursService = inject(OfficeHoursService);
  private userSession = inject(UserSessionService);
  private employeeService = inject(EmployeeService);
  private scheduleResolver = inject(AttendanceScheduleResolverService);
  private destroy$ = new Subject<void>();

  currentTime = new Date();
  status: ClockStatus = 'CLOCKED_OUT';
  isAbsentToday = false;
  isOfficeHours = true;
  canClockIn = true;
  isWithinOfficeHours = true;
  isAfterOpening = true;
  hasCompletedToday = false;
  isGettingLocation = false;
  isLoadingEmployeeData = true;
  currentLocation = '';

  private hrEmployeeId: string | null = null;
  private hrDepartment = '';
  private hrEmployeeName = '';
  private workingWindow: WorkingWindow | null = null;

  private timeInterval: NodeJS.Timeout | null = null;

  get currentUser() {
    return this.userSession.getCurrentUser();
  }

  ngOnInit() {
    const currentUser = this.userSession.getCurrentUser();

    if (currentUser) {
      this.hrEmployeeName = currentUser.name;
      this.hrDepartment = currentUser.department || 'Default Department';
    } else {
      this.hrEmployeeName = 'Employee';
      this.hrDepartment = 'Default Department';
    }

    this.employeeService.getEmployeeIdForCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employeeId) => {
          this.hrEmployeeId = String(employeeId || 1);
          this.isLoadingEmployeeData = false;
          void this.checkOfficeHours();

          const timeout = setTimeout(() => {
            if (!this.hrDepartment) this.hrDepartment = 'Default Department';
            this.isLoadingEmployeeData = false;
          }, 5000);

          this.employeeService.getEmployeeById(employeeId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (employee) => {
                clearTimeout(timeout);
                this.hrDepartment = employee.department?.name ?? employee.department ?? employee.departmentName ?? this.hrDepartment;
                this.hrEmployeeName = (
                  employee.fullName
                  ?? employee.name
                  ?? `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim()
                ) || this.hrEmployeeName;
                this.attendancetableService.updateEmployeeIdentity(this.hrEmployeeId!, this.hrEmployeeName, this.hrDepartment);
                this.isLoadingEmployeeData = false;
              },
              error: () => {
                clearTimeout(timeout);
                this.hrDepartment = 'Default Department';
                this.isLoadingEmployeeData = false;
              }
            });

          this.attendancetableService.fetchByEmployee(String(employeeId));
          this.attendancetableService.updateEmployeeIdentity(String(employeeId), this.hrEmployeeName, this.hrDepartment);
        },
        error: () => {
          this.hrDepartment = 'Default Department';
          this.isLoadingEmployeeData = false;
        }
      });

    this.timeInterval = setInterval(() => {
      this.currentTime = new Date();
      void this.checkOfficeHours();
    }, 1000);

    this.attendancetableService.attendance$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (!this.hrEmployeeId) return;
          const employeeId = this.hrEmployeeId;

          this.hasCompletedToday = this.attendancetableService.hasCompletedToday(employeeId);
          this.isAbsentToday = false; // Allow clock-in in development/testing mode
          this.restoreClockStatus();
        },
        error: (err) => {
          console.error('Error loading attendance data:', err);
        }
      });

    void this.checkOfficeHours();
    this.officeHoursService.officeHours$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => void this.checkOfficeHours(),
        error: (err) => {
          console.error('Error loading office hours:', err);
        }
      });
  }

  ngOnDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private restoreClockStatus(): void {
    if (!this.hrEmployeeId) return;

    const employeeId = this.hrEmployeeId;
    const restored = this.attendancetableService.getTodayStatusForEmployee(employeeId);

    if (restored === 'CLOCKED_IN') {
      this.status = 'CLOCKED_IN';
      this.attendancetableService.setClockStatus('CLOCKED_IN');
    } else if (restored === 'CLOCKED_OUT') {
      this.status = 'CLOCKED_OUT';
      this.attendancetableService.setClockStatus('CLOCKED_OUT');
    }

    const todayRecord = this.attendancetableService.getTodayRecordForEmployee(employeeId);
    if (todayRecord?.checkInLocation?.address) {
      this.currentLocation = todayRecord.checkInLocation.address;
    }
  }

  async toggleClock() {
    if (!this.hrEmployeeId) {
      this.hrEmployeeId = '1';
    }

    this.isGettingLocation = true;
    try {
      if (this.status === 'CLOCKED_OUT') {
        await this.attendancetableService.clockAction(
          this.hrEmployeeId,
          this.hrEmployeeName,
          this.hrDepartment,
          'IN'
        );
        this.status = 'CLOCKED_IN';
        this.attendancetableService.setClockStatus('CLOCKED_IN');
      } else {
        await this.attendancetableService.clockAction(
          this.hrEmployeeId,
          this.hrEmployeeName,
          this.hrDepartment,
          'OUT'
        );
        this.status = 'CLOCKED_OUT';
        this.attendancetableService.setClockStatus('CLOCKED_OUT');
      }

      const updatedRecord = this.attendancetableService.getTodayRecordForEmployee(this.hrEmployeeId);
      if (updatedRecord?.checkInLocation?.address) {
        this.currentLocation = updatedRecord.checkInLocation.address;
      }
    } catch (err) {
      console.error('Clock action failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to update attendance. Please try again.');
    } finally {
      this.isGettingLocation = false;
    }
  }

  async checkOfficeHours(): Promise<void> {
    const now = this.currentTime;
    this.workingWindow = this.hrEmployeeId
      ? await firstValueFrom(this.scheduleResolver.resolve(String(this.hrEmployeeId), now))
      : null;

    const window = this.workingWindow;
    if (!window) {
      this.isWithinOfficeHours = this.officeHoursService.isWithinOfficeHours(now);
      this.isAfterOpening = this.officeHoursService.isAfterOpeningTime(now);
      return;
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openingMinutes = this.toMinutes(window.openingTime);
    const closingMinutes = this.toMinutes(window.closingTime);
    const isOvernight = closingMinutes <= openingMinutes;

    this.isAfterOpening = isOvernight
      ? currentMinutes >= openingMinutes || currentMinutes < closingMinutes
      : currentMinutes >= openingMinutes;
    this.isWithinOfficeHours = isOvernight
      ? currentMinutes >= openingMinutes || currentMinutes < closingMinutes
      : currentMinutes >= openingMinutes && currentMinutes <= closingMinutes;
  }

  private toMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

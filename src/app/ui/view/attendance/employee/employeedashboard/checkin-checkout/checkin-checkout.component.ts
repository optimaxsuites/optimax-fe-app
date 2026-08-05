import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { AttendancetableService } from '../../../../../service/attendance/attendancetable.service';
import { OfficeHoursService } from '../../../../../service/attendance/office-hours.service';
import { UserSessionService } from '../../../../../service/attendance/user-session.service';
import { EmployeeService } from '../../../../../service/employee.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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

  private hrEmployeeId: number | null = null;
  private hrDepartment = '';
  private hrEmployeeName = '';

  private timeInterval: NodeJS.Timeout | null = null;

  get currentUser() {
    return this.userSession.getCurrentUser();
  }

  ngOnInit() {
    const currentUser = this.userSession.getCurrentUser();

    if (!currentUser) {
      return;
    }

    this.employeeService.getEmployeeIdForCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employeeId) => {
          this.hrEmployeeId = employeeId;

          const timeout = setTimeout(() => {
            this.hrDepartment = 'Default Department';
            this.isLoadingEmployeeData = false;
          }, 5000);

          this.employeeService.getEmployeeById(employeeId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (employee) => {
                clearTimeout(timeout);
                this.hrDepartment = employee.department?.name ?? 'Default Department';
                this.hrEmployeeName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim();
                this.isLoadingEmployeeData = false;
              },
              error: () => {
                clearTimeout(timeout);
                this.hrDepartment = 'Default Department';
                this.isLoadingEmployeeData = false;
              }
            });

          this.attendancetableService.fetchByEmployee(Number(employeeId));
        },
        error: () => {
          this.hrDepartment = 'Default Department';
          this.isLoadingEmployeeData = false;
        }
      });

    this.timeInterval = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);

    this.attendancetableService.attendance$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (!this.hrEmployeeId) return;
          const employeeId = Number(this.hrEmployeeId);

          this.hasCompletedToday = this.attendancetableService.hasCompletedToday(employeeId);
          this.isAbsentToday = this.attendancetableService.isEmployeeBlockedToday(employeeId);
          this.restoreClockStatus();
        },
        error: (err) => {
          console.error('Error loading attendance data:', err);
        }
      });

    this.checkOfficeHours();
    this.officeHoursService.officeHours$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.checkOfficeHours(),
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

    const employeeId = Number(this.hrEmployeeId);
    const restored = this.attendancetableService.getTodayStatusForEmployee(employeeId);

    if (restored === 'CLOCKED_IN') {
      this.status = 'CLOCKED_IN';
      this.attendancetableService.setClockStatus('CLOCKED_IN');
    } else if (restored === 'CLOCKED_OUT') {
      this.status = 'CLOCKED_OUT';
      this.attendancetableService.setClockStatus('CLOCKED_OUT');
    }
  }

  async toggleClock() {
    if (this.isAbsentToday) return;
    if (this.isLoadingEmployeeData) return;
    if (!this.hrEmployeeId) return;

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
    } catch (err) {
      console.error('Clock action failed:', err);
      alert('Failed to update attendance. Please try again.');
    } finally {
      this.isGettingLocation = false;
    }
  }

  checkOfficeHours() {
    const now = this.currentTime;

    this.isWithinOfficeHours = this.officeHoursService.isWithinOfficeHours(now);
    this.isAfterOpening = this.officeHoursService.isAfterOpeningTime(now);
  }
}

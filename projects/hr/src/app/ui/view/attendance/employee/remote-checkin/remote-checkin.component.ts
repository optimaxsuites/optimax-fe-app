import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RemoteAttendanceService } from '../../../../service/attendance/remote-attendance.service';
import { AttendancetableService } from '../../../../service/attendance/attendancetable.service';
import { UserSessionService } from '../../../../service/attendance/user-session.service';
import { RemoteAttendanceMetadata } from '../../../../domain/attendance/remote-attendance.dto';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

type CheckInMode = 'capture-location' | 'confirmation' | 'success';

@Component({
  selector: 'app-remote-checkin',
  templateUrl: './remote-checkin.component.html',
  styleUrl: './remote-checkin.component.scss'
})
export class RemoteCheckinComponent implements OnInit, OnDestroy {
  private remoteService = inject(RemoteAttendanceService);
  private attendanceService = inject(AttendancetableService);
  private destroy$ = new Subject<void>();

  currentMode: CheckInMode = 'capture-location';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  currentLocation: RemoteAttendanceMetadata | null = null;
  checkInTime: string = '';

  employeeId: string | null = null;
  employeeName = '';
  department = '';

  constructor(private userSession: UserSessionService) {}

  ngOnInit(): void {
    const currentUser = this.userSession.getCurrentUser();
    if (currentUser) {
      this.employeeId = String(currentUser.id);
      this.employeeName = currentUser.name;
      this.department = currentUser.department || 'Default Department';
    } else {
      this.errorMessage = 'Unable to identify the signed-in employee.';
      return;
    }
    this.loadLocationData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  async loadLocationData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.currentLocation = await this.remoteService.getCurrentLocation();
      this.currentMode = 'confirmation';
    } catch (err) {
      this.errorMessage = 'Failed to capture location. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }


  async submitCheckIn(): Promise<void> {
    if (!this.currentLocation || this.employeeId === null) {
      this.errorMessage = 'Location data missing. Please try again.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.attendanceService.recordRemoteCheckIn(
        this.employeeId,
        this.employeeName,
        this.department,
        this.currentLocation
      );

      this.checkInTime = new Date().toLocaleString();
      this.successMessage = `✓ Remote check-in successful at ${this.checkInTime}`;
      this.currentMode = 'success';
    } catch (err) {
      this.errorMessage = 'Check-in failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  goBack(): void {
    this.currentMode = 'capture-location';
    this.currentLocation = null;
    this.errorMessage = '';
  }

  resetAndClose(): void {
    this.currentMode = 'capture-location';
    this.currentLocation = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.checkInTime = '';
    this.isLoading = false;
    this.loadLocationData();
  }

  getLocationWarnings(): string[] {
    const warnings: string[] = [];

    if (!this.currentLocation) return warnings;

    if (this.currentLocation.accuracy && this.currentLocation.accuracy > 100) {
      warnings.push('⚠️ Location accuracy is low (±' + Math.round(this.currentLocation.accuracy) + 'm)');
    }

    return warnings;
  }
}

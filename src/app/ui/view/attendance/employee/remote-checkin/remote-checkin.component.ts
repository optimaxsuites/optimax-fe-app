import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RemoteAttendanceService } from '../../../../service/attendance/remote-attendance.service';
import { AttendancetableService } from '../../../../service/attendance/attendancetable.service';
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
  clockAction: 'IN' | 'OUT' | null = null;
  checkInTime: string = '';

  employeeId: number = 1;
  employeeName: string = 'John Doe';
  department: string = 'Engineering';

  ngOnInit(): void {
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
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }


  async submitCheckIn(): Promise<void> {
    if (!this.currentLocation) {
      this.errorMessage = 'Location data missing. Please try again.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      let fraudResult: any = { hasFraudIndicators: false, flags: [], riskScore: 0 };

      try {
        fraudResult = await new Promise((resolve) => {
          this.remoteService.validateRemoteCheckIn(
            this.currentLocation!,
            this.employeeId,
            0,
            0
          ).subscribe(resolve);
        });
      } catch (fraudErr) {
        console.warn('Fraud detection unavailable, proceeding without validation:', fraudErr);
        fraudResult = { hasFraudIndicators: false, flags: [], riskScore: 0 };
      }

      let warningMsg = '';
      if (fraudResult?.hasFraudIndicators) {
        warningMsg = `WARNING: Suspicious activity detected. ${fraudResult?.recommendations?.join('. ') || 'Please review before proceeding'}`;
        this.errorMessage = warningMsg;
      }

      await this.attendanceService.recordRemoteCheckIn(
        this.employeeId,
        this.employeeName,
        this.department,
        this.currentLocation,
        fraudResult
      );

      this.checkInTime = new Date().toLocaleString();
      this.successMessage = `✓ Remote check-in successful at ${this.checkInTime}`;
      if (fraudResult?.hasFraudIndicators) {
        this.successMessage += ' (Under review due to fraud flags)';
      }
      this.currentMode = 'success';
    } catch (err) {
      this.errorMessage = 'Check-in failed. Please try again.';
      console.error(err);
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

    if (this.currentLocation.vpnDetected) {
      warnings.push('⚠️ VPN or proxy detected - your check-in will be flagged for review');
    }

    if (this.currentLocation.networkType === 'MOBILE') {
      warnings.push('You are checking in via mobile network');
    }

    if (this.currentLocation.approximateAccuracy && this.currentLocation.approximateAccuracy > 100) {
      warnings.push('Location accuracy is low (±' + Math.round(this.currentLocation.approximateAccuracy) + 'm)');
    }

    return warnings;
  }
}

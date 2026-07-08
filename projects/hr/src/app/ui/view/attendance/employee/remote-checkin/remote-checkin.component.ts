import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RemoteAttendanceService } from '../../../../service/attendance/remote-attendance.service';
import { AttendancetableService } from '../../../../service/attendance/attendancetable.service';
import { BiometricDeviceService } from '../../../../service/biometric/biometric-device.service';
import { CapacitorBiometricService } from '../../../../service/biometric/capacitor-biometric.service';
import { RemoteAttendanceMetadata } from '../../../../domain/attendance/remote-attendance.dto';
import { BiometricEnrollmentDTO } from '../../../../domain/biometric/biometric-device.dto';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

type CheckInMode = 'select-method' | 'enroll-fingerprint' | 'fingerprint' | 'web' | 'confirmation' | 'success';

@Component({
  selector: 'app-remote-checkin',
  templateUrl: './remote-checkin.component.html',
  styleUrl: './remote-checkin.component.scss'
})
export class RemoteCheckinComponent implements OnInit, OnDestroy {
  private remoteService = inject(RemoteAttendanceService);
  private attendanceService = inject(AttendancetableService);
  private biometricService = inject(BiometricDeviceService);
  capacitorBiometric = inject(CapacitorBiometricService);
  private destroy$ = new Subject<void>();

  currentMode: CheckInMode = 'select-method';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  enrolledFingerprints: BiometricEnrollmentDTO[] = [];
  currentLocation: RemoteAttendanceMetadata | null = null;
  selectedCheckInMode: 'biometric' | 'web' | null = null;
  clockAction: 'IN' | 'OUT' | null = null;
  checkInTime: string = '';
  fingerprintRegistered: boolean = false;

  employeeId: number = 1; // Should come from session
  employeeName: string = 'John Doe'; // Should come from session
  department: string = 'Engineering'; // Should come from session

  ngOnInit(): void {
    // Check if fingerprint is already registered
    this.checkFingerprintRegistration();
  }

  private checkFingerprintRegistration(): void {
    const registered = localStorage.getItem('fingerprintRegistered');
    this.fingerprintRegistered = registered === 'true';
  }

  async registerFingerprint(): Promise<void> {
    console.log('Starting fingerprint registration...');
    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Register actual biometric credential (will prompt for fingerprint)
      const result = await this.capacitorBiometric.registerBiometricCredential();

      if (!result.success) {
        this.errorMessage = `❌ ${result.error || 'Registration failed'}`;
        this.isLoading = false;
        return;
      }

      // Save registration flag to localStorage
      localStorage.setItem('fingerprintRegistered', 'true');
      this.fingerprintRegistered = true;
      this.successMessage = '✓ Fingerprint registered! Ready to clock in.';
      console.log(`✓ Fingerprint registered on ${this.capacitorBiometric.getPlatformInfo()}`);

      setTimeout(() => {
        this.successMessage = '';
        this.currentMode = 'select-method';
      }, 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      this.errorMessage = `❌ Failed: ${err.message || 'Unknown error'}`;
    } finally {
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEnrolledFingerprints(): void {
    this.biometricService.getEnrolledFingerprints(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (enrollments) => {
          this.enrolledFingerprints = enrollments.filter(e => e.enrollmentStatus === 'SUCCESS');
        },
        error: (err) => {
          console.error('Failed to load fingerprints:', err);
        }
      });
  }

  selectMethod(method: 'fingerprint' | 'web'): void {
    this.selectedCheckInMode = method as any;
    this.errorMessage = '';

    if (method === 'fingerprint') {
      this.currentMode = 'fingerprint';
    } else {
      this.currentMode = 'web';
      this.loadLocationData();
    }
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

  async submitBiometricCheckIn(): Promise<void> {
    console.log('=== submitBiometricCheckIn called ===');

    this.isLoading = true;
    this.errorMessage = '';

    try {
      console.log('Starting biometric authentication...');
      // Authenticate using Capacitor (works on web via WebAuthn, native via biometric APIs)
      const result = await this.capacitorBiometric.authenticateWithBiometric();
      console.log('Authentication result:', result);

      if (!result.success) {
        this.errorMessage = result.error || 'Biometric authentication failed. Please try again.';
        this.isLoading = false;
        return;
      }

      // Get current location for remote check-in
      const location = await this.remoteService.getCurrentLocation();

      // Record clock action (IN or OUT)
      this.clockAction = 'IN'; // In production, determine if IN or OUT based on current state
      this.checkInTime = new Date().toLocaleString();

      // Mock the attendance service call (backend will implement this)
      try {
        await this.attendanceService.clockAction(
          this.employeeId,
          this.employeeName,
          this.department,
          this.clockAction
        );
      } catch (err) {
        // If backend not available, still show success for UI testing
        console.warn('Attendance service unavailable, proceeding with UI test', err);
      }

      this.successMessage = `✓ Successfully clocked ${this.clockAction} at ${this.checkInTime}`;
      this.currentMode = 'success';
    } catch (err) {
      this.errorMessage = 'Biometric check-in failed. Please try again.';
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }


  async submitWebCheckIn(): Promise<void> {
    if (!this.currentLocation) {
      this.errorMessage = 'Location data missing. Please try again.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Validate for fraud before check-in
      const fraudResult: any = await new Promise((resolve) => {
        this.remoteService.validateRemoteCheckIn(
          this.currentLocation!,
          this.employeeId,
          0, // Branch latitude (should come from branch service)
          0  // Branch longitude
        ).subscribe(resolve);
      });

      if (fraudResult?.hasFraudIndicators) {
        this.errorMessage = `WARNING: Suspicious activity detected. ${fraudResult?.recommendations?.join('. ') || 'Please review before proceeding'}`;
        // Still allow check-in but flag for review
      }

      await this.attendanceService.clockAction(
        this.employeeId,
        'Employee Name',
        'Department',
        'IN'
      );

      this.successMessage = 'Remote check-in successful!';
      this.currentMode = 'success';
    } catch (err) {
      this.errorMessage = 'Check-in failed. Please try again.';
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }

  goBack(): void {
    this.currentMode = 'select-method';
    this.selectedCheckInMode = null;
    this.currentLocation = null;
    this.errorMessage = '';
  }

  resetAndClose(): void {
    this.currentMode = 'select-method';
    this.selectedCheckInMode = null;
    this.currentLocation = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.clockAction = null;
    this.checkInTime = '';
    this.isLoading = false;
  }

  getLocationWarnings(): string[] {
    const warnings: string[] = [];

    if (!this.currentLocation) return warnings;

    // Check if location seems unusual
    if (this.currentLocation.networkType === 'MOBILE') {
      warnings.push('You are checking in via mobile network');
    }

    return warnings;
  }
}

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BiometricDeviceService } from '../../../service/biometric/biometric-device.service';
import { BranchService } from '../../../service/branch/branch.service';
import { BiometricEnrollmentDTO, BiometricDeviceDTO } from '../../../domain/biometric/biometric-device.dto';
import { BranchDTO } from '../../../domain/branch/branch.dto';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

type EnrollmentStep = 'select-device' | 'scan-finger' | 'confirm' | 'complete';

@Component({
  selector: 'app-biometric-enrollment',
  templateUrl: './biometric-enrollment.component.html',
  styleUrl: './biometric-enrollment.component.scss'
})
export class BiometricEnrollmentComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private biometricService = inject(BiometricDeviceService);
  private branchService = inject(BranchService);
  private destroy$ = new Subject<void>();

  currentStep: EnrollmentStep = 'select-device';
  availableDevices: BiometricDeviceDTO[] = [];
  selectedDevice: BiometricDeviceDTO | null = null;
  selectedFinger: string = 'RIGHT_INDEX';
  templateQuality: number = 0;
  isScanning: boolean = false;
  isSaving: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  enrollmentForm: FormGroup;

  fingers = [
    { id: 'RIGHT_THUMB', label: 'Right Thumb' },
    { id: 'RIGHT_INDEX', label: 'Right Index Finger' },
    { id: 'RIGHT_MIDDLE', label: 'Right Middle Finger' },
    { id: 'RIGHT_RING', label: 'Right Ring Finger' },
    { id: 'RIGHT_PINKY', label: 'Right Pinky Finger' },
    { id: 'LEFT_THUMB', label: 'Left Thumb' },
    { id: 'LEFT_INDEX', label: 'Left Index Finger' },
    { id: 'LEFT_MIDDLE', label: 'Left Middle Finger' },
    { id: 'LEFT_RING', label: 'Left Ring Finger' },
    { id: 'LEFT_PINKY', label: 'Left Pinky Finger' }
  ];

  constructor() {
    this.enrollmentForm = this.fb.group({
      deviceId: ['', Validators.required],
      finger: ['RIGHT_INDEX', Validators.required],
      fallbackNote: ['']
    });
  }

  ngOnInit(): void {
    this.loadAvailableDevices();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAvailableDevices(): void {
    this.biometricService.getAllDevices()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (devices) => {
          this.availableDevices = devices.filter(d => d.isActive && d.isOnline);
          if (this.availableDevices.length === 0) {
            this.errorMessage = 'No active biometric devices available. Please contact HR.';
          }
        },
        error: (err) => {
          this.errorMessage = 'Failed to load biometric devices';
          console.error(err);
        }
      });
  }

  selectDevice(device: BiometricDeviceDTO): void {
    this.selectedDevice = device;
    this.enrollmentForm.patchValue({ deviceId: device.id });
    this.currentStep = 'scan-finger';
    this.errorMessage = '';
  }

  selectFinger(finger: string): void {
    this.selectedFinger = finger;
    this.enrollmentForm.patchValue({ finger });
  }

  startScanning(): void {
    if (!this.selectedDevice) {
      this.errorMessage = 'Please select a device first';
      return;
    }

    this.isScanning = true;
    this.errorMessage = '';
    this.templateQuality = 0;

    // Simulate scanning with progress
    const scanInterval = setInterval(() => {
      this.templateQuality += Math.random() * 25;
      if (this.templateQuality >= 100) {
        this.templateQuality = 95;
        clearInterval(scanInterval);
        this.isScanning = false;
        this.successMessage = 'Fingerprint scanned successfully!';
        setTimeout(() => {
          this.currentStep = 'confirm';
        }, 1500);
      }
    }, 500);

    // Auto-stop after 15 seconds
    setTimeout(() => {
      clearInterval(scanInterval);
      if (this.templateQuality < 70) {
        this.isScanning = false;
        this.errorMessage = 'Scan failed. Please try again.';
      }
    }, 15000);
  }

  retryScanning(): void {
    this.templateQuality = 0;
    this.successMessage = '';
    this.startScanning();
  }

  confirmEnrollment(): void {
    if (!this.selectedDevice || this.templateQuality < 70) {
      this.errorMessage = 'Scan quality is too low. Please retry.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const enrollmentData: Omit<BiometricEnrollmentDTO, 'id' | 'enrollmentDate'> = {
      employeeId: this.getEmployeeId(),
      deviceId: this.selectedDevice.deviceId,
      templateData: this.generateMockTemplateData(),
      enrolledBy: this.getEmployeeId(),
      templateQuality: Math.round(this.templateQuality),
      isFallback: false,
      enrollmentStatus: 'SUCCESS'
    };

    this.biometricService.enrollFingerprint(enrollmentData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (enrollment) => {
          this.isSaving = false;
          this.successMessage = `Fingerprint enrolled successfully! (Quality: ${enrollment.templateQuality}%)`;
          this.currentStep = 'complete';
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = 'Failed to save fingerprint. Please try again.';
          console.error(err);
        }
      });
  }

  completeEnrollment(): void {
    // Navigate back or close modal
    this.resetForm();
  }

  resetForm(): void {
    this.currentStep = 'select-device';
    this.enrollmentForm.reset({ finger: 'RIGHT_INDEX' });
    this.selectedDevice = null;
    this.templateQuality = 0;
    this.errorMessage = '';
    this.successMessage = '';
  }

  private generateMockTemplateData(): string {
    return btoa(JSON.stringify({
      timestamp: Date.now(),
      device: this.selectedDevice?.deviceId,
      finger: this.selectedFinger,
      quality: this.templateQuality,
      data: 'ENCRYPTED_BIOMETRIC_TEMPLATE_' + Math.random().toString(36)
    }));
  }

  private getEmployeeId(): number {
    // This should come from current user session
    return 1;
  }

  canProceedToScan(): boolean {
    return this.selectedDevice !== null;
  }

  canProceedToConfirm(): boolean {
    return this.templateQuality >= 70;
  }

  getStepDescription(): string {
    const descriptions: Record<EnrollmentStep, string> = {
      'select-device': 'Select the biometric device to use for enrollment',
      'scan-finger': 'Place your finger on the device and wait for scan to complete',
      'confirm': 'Review the scan quality and confirm enrollment',
      'complete': 'Enrollment completed successfully'
    };
    return descriptions[this.currentStep];
  }

  getStepNumber(): string {
    const steps: EnrollmentStep[] = ['select-device', 'scan-finger', 'confirm', 'complete'];
    return `${steps.indexOf(this.currentStep) + 1} of ${steps.length}`;
  }

  getSelectedFingerLabel(): string {
    const finger = this.fingers.find(f => f.id === this.selectedFinger);
    return finger?.label || 'Unknown Finger';
  }
}

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { BiometricEnrollmentComponent } from './biometric-enrollment.component';
import { BiometricDeviceService } from '../../../service/biometric/biometric-device.service';
import { BranchService } from '../../../service/branch/branch.service';
import { of } from 'rxjs';

describe('BiometricEnrollmentComponent', () => {
  let component: BiometricEnrollmentComponent;
  let fixture: ComponentFixture<BiometricEnrollmentComponent>;
  let biometricService: jasmine.SpyObj<BiometricDeviceService>;
  let branchService: jasmine.SpyObj<BranchService>;

  beforeEach(async () => {
    const biometricSpy = jasmine.createSpyObj('BiometricDeviceService', [
      'getAllDevices',
      'enrollFingerprint'
    ]);
    const branchSpy = jasmine.createSpyObj('BranchService', ['getDevicesByBranch']);

    biometricSpy.getAllDevices.and.returnValue(of([
      {
        id: 1,
        deviceId: 'DEV001',
        branchId: 1,
        name: 'Reception Scanner',
        serialNumber: 'SN001',
        deviceType: 'FINGERPRINT',
        manufacturer: 'AuthenTec',
        model: 'EFS50',
        firmwareVersion: '2.1.0',
        macAddress: '00:11:22:33:44:55',
        ipAddress: '192.168.1.100',
        isOnline: true,
        lastHeartbeat: new Date().toISOString(),
        registeredDate: new Date().toISOString(),
        isActive: true,
        maxStorageCapacity: 1000,
        currentTemplateCount: 500
      }
    ]));

    await TestBed.configureTestingModule({
      declarations: [BiometricEnrollmentComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: BiometricDeviceService, useValue: biometricSpy },
        { provide: BranchService, useValue: branchSpy }
      ]
    }).compileComponents();

    biometricService = TestBed.inject(BiometricDeviceService) as jasmine.SpyObj<BiometricDeviceService>;
    branchService = TestBed.inject(BranchService) as jasmine.SpyObj<BranchService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BiometricEnrollmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load available devices on init', () => {
    expect(biometricService.getAllDevices).toHaveBeenCalled();
    expect(component.availableDevices.length).toBe(1);
    expect(component.availableDevices[0].name).toBe('Reception Scanner');
  });

  it('should filter to show only online devices', () => {
    expect(component.availableDevices.every(d => d.isOnline)).toBeTruthy();
  });

  it('should select device and move to scan step', () => {
    const device = component.availableDevices[0];
    component.selectDevice(device);

    expect(component.selectedDevice).toBe(device);
    expect(component.currentStep).toBe('scan-finger');
  });

  it('should select finger', () => {
    component.selectFinger('LEFT_THUMB');
    expect(component.selectedFinger).toBe('LEFT_THUMB');
  });

  it('should not allow scanning without device selection', () => {
    component.selectedDevice = null;
    component.startScanning();
    expect(component.errorMessage).toBeTruthy();
  });

  it('should not allow confirmation with low quality', () => {
    component.selectedDevice = component.availableDevices[0];
    component.templateQuality = 50;
    expect(component.canProceedToConfirm()).toBeFalsy();
  });

  it('should allow confirmation with sufficient quality', () => {
    component.selectedDevice = component.availableDevices[0];
    component.templateQuality = 85;
    expect(component.canProceedToConfirm()).toBeTruthy();
  });

  it('should display correct step number', () => {
    component.currentStep = 'select-device';
    expect(component.getStepNumber()).toBe('1 of 4');

    component.currentStep = 'scan-finger';
    expect(component.getStepNumber()).toBe('2 of 4');

    component.currentStep = 'confirm';
    expect(component.getStepNumber()).toBe('3 of 4');

    component.currentStep = 'complete';
    expect(component.getStepNumber()).toBe('4 of 4');
  });

  it('should reset form', () => {
    component.selectedDevice = component.availableDevices[0];
    component.templateQuality = 85;
    component.errorMessage = 'Test error';
    component.successMessage = 'Test success';

    component.resetForm();

    expect(component.selectedDevice).toBeNull();
    expect(component.templateQuality).toBe(0);
    expect(component.errorMessage).toBe('');
    expect(component.successMessage).toBe('');
    expect(component.currentStep).toBe('select-device');
  });
});

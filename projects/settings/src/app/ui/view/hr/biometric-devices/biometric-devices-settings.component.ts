import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

type DeviceType = 'MULTI' | 'FINGERPRINT' | 'FACE' | 'IRIS' | 'PALM';

interface BiometricDevice {
  id: number;
  deviceId: string;
  branchId: string;
  name: string;
  serialNumber: string;
  deviceType: DeviceType;
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  isOnline: boolean;
  lastHeartbeat: string;
  registeredDate: string;
  isActive: boolean;
  maxStorageCapacity: number;
  currentTemplateCount: number;
}

const API = 'https://be.optimaxsuites.com/x/api/v2/hr/biometric-devices';

@Component({
  selector: 'app-biometric-devices-settings',
  templateUrl: './biometric-devices-settings.component.html',
  styleUrl: './biometric-devices-settings.component.scss',
})
export class BiometricDevicesSettingsComponent implements OnInit {

  devices: BiometricDevice[] = [];
  loading = false;
  saving = false;
  showForm = false;
  editTarget: BiometricDevice | null = null;
  deleteIds: Record<number, boolean> = {};
  formError = '';
  saveSuccess = false;

  readonly deviceTypes: DeviceType[] = ['MULTI', 'FINGERPRINT', 'FACE', 'IRIS', 'PALM'];
  readonly manufacturers: string[] = ['Hikvision', 'ZKTeco', 'Suprema', 'Anviz', 'FingerTec', 'Virdi', 'Realand', 'Other'];

  form: Partial<BiometricDevice> = this.blankForm();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http.get<any>(API).pipe(catchError(() => of({ content: [] }))).subscribe(res => {
      this.devices = res?.content ?? (Array.isArray(res) ? res : []);
      this.loading = false;
    });
  }

  openNew(): void {
    this.editTarget = null;
    this.form = this.blankForm();
    this.formError = '';
    this.saveSuccess = false;
    this.showForm = true;
  }

  openEdit(d: BiometricDevice): void {
    this.editTarget = d;
    this.form = {
      deviceId: d.deviceId, branchId: d.branchId, name: d.name,
      serialNumber: d.serialNumber, deviceType: d.deviceType,
      manufacturer: d.manufacturer, model: d.model,
      firmwareVersion: d.firmwareVersion, macAddress: d.macAddress,
      ipAddress: d.ipAddress, maxStorageCapacity: d.maxStorageCapacity,
      isActive: d.isActive,
    };
    this.formError = '';
    this.saveSuccess = false;
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editTarget = null;
    this.formError = '';
  }

  save(): void {
    if (!this.form.deviceId || !this.form.name || !this.form.ipAddress) {
      this.formError = 'Device ID, Name and IP Address are required.';
      return;
    }
    this.saving = true;
    this.formError = '';
    const body = { ...this.form };
    const req = this.editTarget
      ? this.http.put<BiometricDevice>(`${API}/${this.editTarget.id}`, body)
      : this.http.post<BiometricDevice>(API, body);

    req.pipe(catchError(err => { throw err; })).subscribe({
      next: () => {
        this.saving = false;
        this.saveSuccess = true;
        this.load();
        setTimeout(() => { this.closeForm(); this.saveSuccess = false; }, 1200);
      },
      error: (err: any) => {
        this.saving = false;
        this.formError = err?.error?.message ?? 'Failed to save device.';
      }
    });
  }

  delete(d: BiometricDevice): void {
    if (!confirm(`Delete "${d.name}"? This cannot be undone.`)) return;
    this.deleteIds[d.id] = true;
    this.http.delete(`${API}/${d.id}`).pipe(catchError(() => of(null))).subscribe(() => {
      delete this.deleteIds[d.id];
      this.devices = this.devices.filter(x => x.id !== d.id);
    });
  }

  private blankForm(): Partial<BiometricDevice> {
    return {
      deviceId: '', branchId: '', name: '', serialNumber: '',
      deviceType: 'MULTI', manufacturer: 'Hikvision', model: 'DS-K1T321MFWX',
      firmwareVersion: '', macAddress: '', ipAddress: '',
      maxStorageCapacity: 3000, isActive: true,
    };
  }
}

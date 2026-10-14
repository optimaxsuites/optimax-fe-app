import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavigationLinksService } from '../../shared-component/service/navigation-links/navigation-links.service';
import { PayrollService } from '../../service/payroll.service';
import { BiometricDeviceService } from '../../service/biometric/biometric-device.service';
import { BiometricDeviceDTO, BiometricDeviceType } from '../../domain/biometric/biometric-device.dto';

export type NotifChannel = 'email' | 'in_app' | 'push' | 'sms';

export interface ProjectNotifPrefs {
  projectKey: string;
  projectLabel: string;
  channels: Record<NotifChannel, boolean>;
  events: {
    taskAssigned: boolean;
    statusChange: boolean;
    followUp: boolean;
    supervisorReview: boolean;
    dueReminder: boolean;
    appraisalDeadline: boolean;
  };
}

interface OdooImportState {
  step: 'idle' | 'configure' | 'preview' | 'importing' | 'done' | 'error';
  url: string;
  db: string;
  user: string;
  password: string;
  previewRows: Array<{ name: string; description: string; deadline: string; assignee: string }>;
  importCount: number;
  error: string;
}

const NOTIF_STORE_KEY = 'hr_notif_prefs_v1';

const PROJECT_DEFAULTS: Omit<ProjectNotifPrefs, 'projectKey' | 'projectLabel'> = {
  channels: { email: true, in_app: true, push: false, sms: false },
  events: {
    taskAssigned: true, statusChange: true, followUp: true,
    supervisorReview: true, dueReminder: true, appraisalDeadline: true,
  },
};

@Component({
  selector: 'app-hr-settings',
  templateUrl: './hr-settings.component.html',
  styleUrls: ['./hr-settings.component.scss'],
})
export class HrSettingsComponent implements OnInit {

  preOnboardingLink: string;
  employeeUpdateFormLink: string;
  offboardingFormLink: string;

  // ── Payroll settings ───────────────────────────────────────────────────────
  payrollSettingsLoading = false;
  payrollSettingsSaving = false;
  payrollSaveSuccess = false;

  payrollConfig = {
    payDay: 25,
    lockDay: 20,
    workingDaysPerMonth: 22,
  };

  deductionToggles: Record<string, boolean> = {
    paye: true,
    pension: true,
    nhf: true,
    nsitf: true,
    itf: true,
    healthInsurance: false,
  };

  allowanceDefaults: Record<string, number> = {
    housing: 0,
    transport: 0,
    meal: 0,
    health: 0,
    car: 0,
    security: 0,
    travel: 0,
  };

  get deductionKeys(): string[] { return Object.keys(this.deductionToggles); }
  get allowanceKeys(): string[] { return Object.keys(this.allowanceDefaults); }

  deductionLabel(key: string): string {
    const map: Record<string, string> = {
      paye: 'PAYE Tax', pension: 'Pension (8% Employee)', nhf: 'NHF (2.5%)',
      nsitf: 'NSITF (1%)', itf: 'ITF (1%)', healthInsurance: 'Health Insurance'
    };
    return map[key] ?? key;
  }

  deductionDesc(key: string): string {
    const map: Record<string, string> = {
      paye: 'Pay As You Earn — computed from FIRS tax bands',
      pension: 'RSA Pension contribution (Employee: 8%, Employer: 10%)',
      nhf: 'National Housing Fund contribution to FMB',
      nsitf: 'Nigeria Social Insurance Trust Fund',
      itf: 'Industrial Training Fund levy',
      healthInsurance: 'Company health insurance premium deduction'
    };
    return map[key] ?? '';
  }

  allowanceLabel(key: string): string {
    const map: Record<string, string> = {
      housing: 'Housing Allowance', transport: 'Transport Allowance',
      meal: 'Meal Allowance', health: 'Health Allowance',
      car: 'Car Allowance', security: 'Security Allowance', travel: 'Travel Allowance'
    };
    return map[key] ?? key;
  }

  // ── Biometric Devices ──────────────────────────────────────────────────────
  deviceList: BiometricDeviceDTO[] = [];
  deviceListLoading = false;
  showDeviceForm = false;
  deviceSaving = false;
  deviceDeleteIds: Record<number, boolean> = {};
  deviceEditTarget: BiometricDeviceDTO | null = null;
  deviceFormError = '';
  deviceFormSuccess = false;

  readonly deviceTypeOptions: BiometricDeviceType[] = ['MULTI', 'FINGERPRINT', 'FACE', 'IRIS', 'PALM'];

  deviceForm: Omit<BiometricDeviceDTO, 'id' | 'isOnline' | 'lastHeartbeat' | 'registeredDate' | 'currentTemplateCount'> = {
    deviceId: '',
    branchId: '',
    name: '',
    serialNumber: '',
    deviceType: 'MULTI',
    manufacturer: 'Hikvision',
    model: 'DS-K1T321MFWX',
    firmwareVersion: '',
    macAddress: '',
    ipAddress: '',
    maxStorageCapacity: 3000,
    isActive: true,
  };

  // ── Hikvision Config ───────────────────────────────────────────────────────
  readonly hikCallbackPath = '/x/api/v2/hr/hikvision/callback';
  hikUrlCopied = false;

  get hikCallbackUrl(): string {
    return `https://be.optimaxsuites.com${this.hikCallbackPath}?token=<YOUR_TOKEN>`;
  }

  copyHikUrl(): void {
    navigator.clipboard.writeText(this.hikCallbackUrl).then(() => {
      this.hikUrlCopied = true;
      setTimeout(() => { this.hikUrlCopied = false; }, 2000);
    }).catch(() => {});
  }

  constructor(
    private navLinks: NavigationLinksService,
    private route: ActivatedRoute,
    private payrollService: PayrollService,
    private biometricService: BiometricDeviceService,
  ) {
    this.preOnboardingLink = this.navLinks.getLink('preOnboardingForm');
    this.employeeUpdateFormLink = this.navLinks.getLink('employeeUpdateForm');
    this.offboardingFormLink = this.navLinks.getLink('offboardingForm');
  }

  openForm(route: string): void {
    window.open(route, '_blank');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  activeSection: 'notifications' | 'odoo' | 'general' | 'forms' | 'payroll' | 'office-hours' | 'biometric-devices' | 'hikvision-config' = 'notifications';

  // ── Notification prefs ─────────────────────────────────────────────────────
  readonly notifChannels: Array<{ key: NotifChannel; label: string; icon: string; desc: string }> = [
    { key: 'email', label: 'Email', icon: 'fa-envelope', desc: 'Receive notifications to your registered email address' },
    { key: 'in_app', label: 'In-App', icon: 'fa-bell', desc: 'Alerts appear inside the OptimaX platform sidebar' },
    { key: 'push', label: 'Push', icon: 'fa-mobile-alt', desc: 'Browser or mobile push notifications (requires browser permission)' },
    { key: 'sms', label: 'SMS', icon: 'fa-comment-dots', desc: 'Text messages to your registered phone number' },
  ];

  readonly eventLabels: Record<string, string> = {
    taskAssigned: 'Task assigned to me',
    statusChange: 'Task status changed',
    followUp: 'New follow-up / update posted',
    supervisorReview: 'Supervisor review submitted',
    dueReminder: 'Task due-date reminder (24 h before)',
    appraisalDeadline: 'Appraisal cycle deadline reminder',
  };

  projects: ProjectNotifPrefs[] = [
    { projectKey: 'task_board', projectLabel: 'Task Board', ...this.clone(PROJECT_DEFAULTS) },
    { projectKey: 'appraisal', projectLabel: 'Performance Appraisal', ...this.clone(PROJECT_DEFAULTS) },
    { projectKey: 'recruitment', projectLabel: 'Recruitment', ...this.clone({ ...PROJECT_DEFAULTS, channels: { email: true, in_app: true, push: false, sms: false } }) },
    { projectKey: 'payroll', projectLabel: 'Payroll', ...this.clone({ ...PROJECT_DEFAULTS, channels: { email: true, in_app: false, push: false, sms: false } }) },
    { projectKey: 'leave', projectLabel: 'Leave & Attendance', ...this.clone(PROJECT_DEFAULTS) },
  ];

  expandedProject: string | null = 'task_board';
  saveSuccess = false;

  // ── Odoo import ────────────────────────────────────────────────────────────
  odoo: OdooImportState = {
    step: 'idle', url: '', db: '', user: '', password: '',
    previewRows: [], importCount: 0, error: '',
  };

  readonly odooExportColumns = [
    'Name', 'Description', 'Deadline', 'Assigned To',
    'Priority', 'Stage', 'Tags', 'Sub-tasks',
  ];

  ngOnInit(): void {
    this.loadPrefs();
    this.route.queryParams.subscribe(params => {
      const panel = params['panel'];
      if (panel && ['notifications', 'odoo', 'general', 'forms', 'payroll', 'office-hours', 'biometric-devices', 'hikvision-config'].includes(panel)) {
        this.activeSection = panel as typeof this.activeSection;
        if (panel === 'biometric-devices') {
          this.loadDevices();
        }
      }
    });
    this.loadPayrollSettings();
  }

  loadPayrollSettings(): void {
    this.payrollSettingsLoading = true;
    this.payrollService.getGeneralSettings(1, 1).subscribe({
      next: (res: any) => {
        const s = Array.isArray(res) ? res[0] : (res?.content?.[0] ?? res);
        if (s) {
          this.payrollConfig.payDay = s.payDay ?? s.payday ?? 25;
          this.payrollConfig.lockDay = s.lockDay ?? s.lockdate ?? 20;
          this.payrollConfig.workingDaysPerMonth = s.workingDaysPerMonth ?? 22;
        }
        this.payrollSettingsLoading = false;
      },
      error: () => {
        this.payrollSettingsLoading = false;
      }
    });
  }

  savePayrollSettings(): void {
    this.payrollSettingsSaving = true;
    const payload = {
      payDay: this.payrollConfig.payDay,
      lockDay: this.payrollConfig.lockDay,
      workingDaysPerMonth: this.payrollConfig.workingDaysPerMonth,
      deductions: this.deductionToggles,
      allowanceDefaults: this.allowanceDefaults,
    };
    this.payrollService.postGeneralSettings(payload).subscribe({
      next: () => {
        this.payrollSettingsSaving = false;
        this.payrollSaveSuccess = true;
        setTimeout(() => { this.payrollSaveSuccess = false; }, 2500);
      },
      error: () => { this.payrollSettingsSaving = false; }
    });
  }

  loadDevices(): void {
    this.deviceListLoading = true;
    this.biometricService.getAllDevices().subscribe({
      next: (devices) => { this.deviceList = devices; this.deviceListLoading = false; },
      error: () => { this.deviceListLoading = false; }
    });
  }

  openNewDevice(): void {
    this.deviceEditTarget = null;
    this.deviceForm = {
      deviceId: '', branchId: '', name: '', serialNumber: '',
      deviceType: 'MULTI', manufacturer: 'Hikvision', model: 'DS-K1T321MFWX',
      firmwareVersion: '', macAddress: '', ipAddress: '',
      maxStorageCapacity: 3000, isActive: true,
    };
    this.deviceFormError = '';
    this.deviceFormSuccess = false;
    this.showDeviceForm = true;
  }

  openEditDevice(device: BiometricDeviceDTO): void {
    this.deviceEditTarget = device;
    this.deviceForm = {
      deviceId: device.deviceId, branchId: device.branchId, name: device.name,
      serialNumber: device.serialNumber, deviceType: device.deviceType,
      manufacturer: device.manufacturer, model: device.model,
      firmwareVersion: device.firmwareVersion, macAddress: device.macAddress,
      ipAddress: device.ipAddress, maxStorageCapacity: device.maxStorageCapacity,
      isActive: device.isActive,
    };
    this.deviceFormError = '';
    this.deviceFormSuccess = false;
    this.showDeviceForm = true;
  }

  closeDeviceForm(): void {
    this.showDeviceForm = false;
    this.deviceEditTarget = null;
    this.deviceFormError = '';
  }

  saveDevice(): void {
    if (!this.deviceForm.name || !this.deviceForm.ipAddress || !this.deviceForm.deviceId) {
      this.deviceFormError = 'Device ID, Name, and IP Address are required.';
      return;
    }
    this.deviceSaving = true;
    this.deviceFormError = '';
    const payload: any = { ...this.deviceForm };
    const op = this.deviceEditTarget
      ? this.biometricService.updateDevice(this.deviceEditTarget.id, payload)
      : this.biometricService.registerDevice(payload);

    op.subscribe({
      next: () => {
        this.deviceSaving = false;
        this.deviceFormSuccess = true;
        this.loadDevices();
        setTimeout(() => { this.closeDeviceForm(); this.deviceFormSuccess = false; }, 1200);
      },
      error: (err: any) => {
        this.deviceSaving = false;
        this.deviceFormError = err?.error?.message ?? 'Failed to save device. Please try again.';
      }
    });
  }

  deleteDevice(device: BiometricDeviceDTO): void {
    if (!confirm(`Delete "${device.name}"? This cannot be undone.`)) return;
    this.deviceDeleteIds[device.id] = true;
    this.biometricService.deleteDevice(device.id).subscribe({
      next: () => {
        delete this.deviceDeleteIds[device.id];
        this.deviceList = this.deviceList.filter(d => d.id !== device.id);
      },
      error: () => { delete this.deviceDeleteIds[device.id]; }
    });
  }

  onBiometricSectionEnter(): void {
    this.loadDevices();
  }

  private clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  // ── Persistence ────────────────────────────────────────────────────────────
  private loadPrefs(): void {
    try {
      const raw = localStorage.getItem(NOTIF_STORE_KEY);
      if (raw) {
        const saved: ProjectNotifPrefs[] = JSON.parse(raw);
        saved.forEach(s => {
          const match = this.projects.find(p => p.projectKey === s.projectKey);
          if (match) { match.channels = s.channels; match.events = s.events; }
        });
      }
    } catch { }
  }

  savePrefs(): void {
    localStorage.setItem(NOTIF_STORE_KEY, JSON.stringify(this.projects));
    this.saveSuccess = true;
    setTimeout(() => { this.saveSuccess = false; }, 2500);
  }

  toggleProject(key: string): void {
    this.expandedProject = this.expandedProject === key ? null : key;
  }

  toggleAllChannels(project: ProjectNotifPrefs, on: boolean): void {
    (Object.keys(project.channels) as NotifChannel[]).forEach(k => project.channels[k] = on);
  }

  toggleAllEvents(project: ProjectNotifPrefs, on: boolean): void {
    (Object.keys(project.events) as Array<keyof ProjectNotifPrefs['events']>).forEach(k => project.events[k] = on);
  }

  get eventKeys(): string[] { return Object.keys(this.eventLabels); }

  // Template helper — allows string-keyed access to the typed events object
  projEvents(proj: ProjectNotifPrefs): Record<string, boolean> {
    return proj.events as unknown as Record<string, boolean>;
  }

  // ── Odoo import flow ───────────────────────────────────────────────────────
  startOdooConnect(): void { this.odoo.step = 'configure'; }

  testOdooConnection(): void {
    if (!this.odoo.url || !this.odoo.db || !this.odoo.user) {
      this.odoo.error = 'Please fill URL, database name, and username.'; return;
    }
    // Simulate preview (real impl would call Odoo XML-RPC or REST via a backend proxy)
    this.odoo.step = 'preview';
    this.odoo.error = '';
    this.odoo.previewRows = [
      { name: 'Q3 Planning Session', description: 'Plan department OKRs for Q3', deadline: '2026-07-15', assignee: 'Team Lead' },
      { name: 'Policy Documentation Update', description: 'Update HR policy handbook', deadline: '2026-07-01', assignee: 'HR Admin' },
      { name: 'Onboarding Checklist Revision', description: 'Revise the new hire onboarding checklist', deadline: '2026-06-30', assignee: 'L&D Lead' },
    ];
  }

  confirmOdooImport(): void {
    this.odoo.step = 'importing';
    setTimeout(() => {
      this.odoo.importCount = this.odoo.previewRows.length;
      this.odoo.step = 'done';
    }, 1400);
  }

  resetOdoo(): void {
    this.odoo = { step: 'idle', url: '', db: '', user: '', password: '', previewRows: [], importCount: 0, error: '' };
  }
}

import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { finalize, map, Observable, of, switchMap, tap } from 'rxjs';
import { NavigationLinksService } from '../../../shared-component/service/navigation-links/navigation-links.service';
import { EmployeeService } from '../../../service/employee.service';
import { SelectedEmployeeStore } from '../selected-employee.store';

export type OffboardingStage =
  | 'not_started'
  | 'initiated'
  | 'handover'
  | 'assets'
  | 'access_revoked'
  | 'completed';

export interface AssetItem {
  type: string;
  description: string;
  serialNumber: string;
  dateIssued: string;
  returned: boolean;
  condition: string;
}

export interface HandoverItem {
  responsibility: string;
  status: string;
  handedTo: string;
  notes: string;
}

export interface SystemAccess {
  system: string;
  username: string;
  revoked: boolean;
  revokedDate: string;
}

export interface OffboardingData {
  stage: OffboardingStage;
  lastWorkingDay: string;
  exitReason: string;
  exitReasonDetail: string;
  exitInterviewDone: boolean;
  exitInterviewNotes: string;
  assets: AssetItem[];
  handoverItems: HandoverItem[];
  systemAccess: SystemAccess[];
  outstandingLoans: string;
  leaveBalance: string;
  finalPayDate: string;
  hrOfficer: string;
  initiatedDate: string;
  completedDate: string;
}

const STAGES: Array<{ key: OffboardingStage; label: string; icon: string }> = [
  { key: 'not_started',   label: 'Not Started',    icon: 'fa-circle'        },
  { key: 'initiated',     label: 'Initiated',       icon: 'fa-play-circle'   },
  { key: 'handover',      label: 'Handover',        icon: 'fa-exchange-alt'  },
  { key: 'assets',        label: 'Asset Return',    icon: 'fa-box-open'      },
  { key: 'access_revoked',label: 'Access Revoked',  icon: 'fa-user-slash'    },
  { key: 'completed',     label: 'Completed',       icon: 'fa-check-circle'  },
];

/** Where offboarding data used to be cached. Removed on load so stale copies can't come back. */
const LEGACY_STORAGE_PREFIXES = ['offboarding_data_v1', 'employee_offboarded_'];

/** The employee status set when offboarding completes, by exit reason. */
const EXIT_STATUS_BY_REASON: Record<string, string> = {
  'Resignation (voluntary)': 'RESIGNED',
  'Retirement': 'RESIGNED',
  'Mutual Separation': 'RESIGNED',
};
const DEFAULT_EXIT_STATUS = 'TERMINATED';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function removeLegacyStorage(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && LEGACY_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }
  } catch {}
}

/** The update body for an employee status change, in the shape the profile screen sends. */
function employeeStatusPayload(employee: any, employeeStatus: string, exitReason: string, exitReasonBy: string): any {
  return {
    id: employee.id,
    userId: employee.userId ?? employee.user?.userId ?? null,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    workEmail: employee.workEmail,
    jobTitle: employee.jobTitle,
    departmentId: employee.departmentId ?? employee.department?.id ?? null,
    levelId: employee.levelId ?? employee.level?.id ?? null,
    employmentType: employee.employmentType ?? employee.jobType?.name ?? null,
    supervisor: employee.supervisor,
    employeeStatus,
    employementStartDate: employee.employementStartDate,
    employmentEndDate: employee.employmentEndDate,
    onProbation: employee.onProbation,
    probationStartDate: employee.probationStartDate,
    probationEndDate: employee.probationEndDate,
    appraisalDueDate: employee.appraisalDueDate,
    phone: employee.phone,
    address: employee.address,
    dob: employee.dob,
    genderId: employee.genderId ?? employee.gender?.id ?? null,
    maritalStatusId: employee.maritalStatusId ?? employee.maritalStatus?.id ?? null,
    religionId: employee.religionId ?? employee.religion?.id ?? null,
    bankName: employee.bankName,
    accountNumber: employee.accountNumber,
    nin: employee.nin,
    bvn: employee.bvn,
    jobTypeId: employee.jobTypeId ?? employee.jobType?.id ?? null,
    relationshipId: employee.relationshipId ?? employee.relationship?.id ?? null,
    exitReason,
    exitReasonBy,
  };
}

const DEFAULT_ASSETS: AssetItem[] = [
  { type: 'Laptop',         description: '', serialNumber: '', dateIssued: '', returned: false, condition: '' },
  { type: 'Mobile Phone',   description: '', serialNumber: '', dateIssued: '', returned: false, condition: '' },
  { type: 'Access Card',    description: '', serialNumber: '', dateIssued: '', returned: false, condition: '' },
  { type: 'Vehicle',        description: '', serialNumber: '', dateIssued: '', returned: false, condition: '' },
  { type: 'Uniform',        description: '', serialNumber: '', dateIssued: '', returned: false, condition: '' },
  { type: 'Other',          description: '', serialNumber: '', dateIssued: '', returned: false, condition: '' },
];

const DEFAULT_SYSTEMS: SystemAccess[] = [
  { system: 'OptimaX ERP',             username: '', revoked: false, revokedDate: '' },
  { system: 'Email / Google Workspace', username: '', revoked: false, revokedDate: '' },
  { system: 'Slack / Teams',            username: '', revoked: false, revokedDate: '' },
  { system: 'GitHub / GitLab',          username: '', revoked: false, revokedDate: '' },
  { system: 'VPN',                      username: '', revoked: false, revokedDate: '' },
  { system: 'Payroll System',           username: '', revoked: false, revokedDate: '' },
  { system: 'CRM',                      username: '', revoked: false, revokedDate: '' },
];

const DEFAULT_HANDOVER: HandoverItem[] = [
  { responsibility: '', status: 'Pending', handedTo: '', notes: '' },
  { responsibility: '', status: 'Pending', handedTo: '', notes: '' },
  { responsibility: '', status: 'Pending', handedTo: '', notes: '' },
];

@Component({
  selector: 'app-employee-offboarding',
  templateUrl: './employee-offboarding.component.html',
  styleUrl: './employee-offboarding.component.scss'
})
export class EmployeeOffboardingComponent implements OnInit {
  employeeInView: any;
  stages = STAGES;
  activeTab: 'overview' | 'handover' | 'assets' | 'access' | 'documents' = 'overview';
  showConfirmRevoke = false;
  showConfirmComplete = false;
  saved = false;
  saving = false;
  completing = false;
  /** Saving waits for the first load, so it can't create a record the server already has. */
  loadState: 'loading' | 'ready' | 'error' = 'loading';
  offboardingFormLink = '';
  offboardingId: number | string | null = null;
  /** A change made while a save was in flight; saved as soon as that one finishes. */
  private pendingSave = false;
  private savedTimer: ReturnType<typeof setTimeout> | undefined;

  exitReasons = [
    'Resignation (voluntary)',
    'Termination (company-initiated)',
    'Contract End / Expiry',
    'Retirement',
    'Redundancy',
    'Mutual Separation',
    'Other',
  ];

  handoverStatuses = ['Pending', 'In Progress', 'Completed'];

  ob: OffboardingData = this.defaultData();

  constructor(
    private navLinks: NavigationLinksService,
    private employeeService: EmployeeService,
    private messageService: MessageService,
    private selectedEmployee: SelectedEmployeeStore,
  ) {}

  ngOnInit(): void {
    removeLegacyStorage();
    this.employeeInView = this.selectedEmployee.get();
    this.offboardingFormLink = this.navLinks.getLink('offboardingForm');
    this.loadData();
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  get stageIndex(): number {
    return STAGES.findIndex(s => s.key === this.ob.stage);
  }

  stageStatus(key: OffboardingStage): 'done' | 'active' | 'pending' {
    const idx = STAGES.findIndex(s => s.key === key);
    if (idx < this.stageIndex) return 'done';
    if (idx === this.stageIndex) return 'active';
    return 'pending';
  }

  get assetsReturnedCount(): number {
    return this.ob.assets.filter(a => a.returned).length;
  }

  get systemsRevokedCount(): number {
    return this.ob.systemAccess.filter(s => s.revoked).length;
  }

  get handoverDoneCount(): number {
    return this.ob.handoverItems.filter(h => h.status === 'Completed').length;
  }

  get allAssetsReturned(): boolean {
    return this.ob.assets.every(a => a.returned || !a.description);
  }

  get allAccessRevoked(): boolean {
    return this.ob.systemAccess.every(s => s.revoked);
  }

  get isAccessRevoked(): boolean {
    return this.ob.stage === 'access_revoked' || this.ob.stage === 'completed';
  }

  get exitStatus(): string {
    return EXIT_STATUS_BY_REASON[this.ob.exitReason] ?? DEFAULT_EXIT_STATUS;
  }

  // ── Stage transitions ──────────────────────────────────────────────────────
  initiateOffboarding(): void {
    this.changeAndSave(() => {
      this.ob.stage = 'initiated';
      this.ob.initiatedDate = today();
    });
  }

  advanceTo(stage: OffboardingStage): void {
    this.changeAndSave(() => { this.ob.stage = stage; });
  }

  /** Records the checklist as revoked. It doesn't disable the ERP login; there is no endpoint for that yet. */
  revokeAccess(): void {
    this.showConfirmRevoke = false;
    this.changeAndSave(() => {
      this.ob.systemAccess.forEach(s => {
        if (!s.revoked) {
          s.revoked = true;
          s.revokedDate = today();
        }
      });
      this.ob.stage = 'access_revoked';
    });
  }

  /** Sets the employee's status on the server from the exit reason, then closes the offboarding record. */
  completeOffboarding(): void {
    const id = this.employeeInView?.id;
    if (!id || this.completing || !this.canSave()) return;
    if (!this.ob.exitReason) {
      this.showConfirmComplete = false;
      this.activeTab = 'overview';
      this.messageService.add({ severity: 'warn', summary: 'Exit reason needed', detail: 'Choose an exit reason on the Overview tab before completing offboarding.', key: 'tl', life: 4000 });
      return;
    }

    const status = this.exitStatus;
    const exitReason = [this.ob.exitReason, this.ob.exitReasonDetail].filter(Boolean).join(' — ');
    const exitReasonBy = this.ob.hrOfficer || sessionStorage.getItem('username') || localStorage.getItem('username') || '';
    const before = this.snapshot();
    this.completing = true;

    this.employeeService.getEmployeeById(id).pipe(
      map((res: any) => res?.data ?? res),
      switchMap((employee: any) => this.employeeService.updateEmployee(employeeStatusPayload(employee, status, exitReason, exitReasonBy), id)),
      tap(() => {
        this.employeeInView = { ...this.employeeInView, employeeStatus: status };
        this.selectedEmployee.set(this.employeeInView);
        window.dispatchEvent(new CustomEvent('employee-status-changed', { detail: { id, employeeStatus: status } }));
        this.ob.stage = 'completed';
        this.ob.completedDate = today();
      }),
      switchMap(() => this.persist()),
      finalize(() => { this.completing = false; }),
    ).subscribe({
      next: () => {
        this.showConfirmComplete = false;
        this.messageService.add({ severity: 'success', summary: 'Offboarding complete', detail: `Employee status set to ${status}.`, key: 'tl', life: 4000 });
      },
      error: (err) => {
        const statusChanged = this.employeeInView?.employeeStatus === status;
        this.ob = before;
        this.showConfirmComplete = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Could not complete',
          detail: statusChanged
            ? `The employee status was set to ${status}, but the offboarding record could not be saved. Try again.`
            : (err?.error?.message || 'The employee status could not be updated. Nothing was changed.'),
          key: 'tl',
          life: 6000,
        });
      },
    });
  }

  addHandoverRow(): void {
    this.ob.handoverItems.push({ responsibility: '', status: 'Pending', handedTo: '', notes: '' });
  }

  addAssetRow(): void {
    this.ob.assets.push({ type: '', description: '', serialNumber: '', dateIssued: '', returned: false, condition: '' });
  }

  revokeSystem(sys: SystemAccess): void {
    this.changeAndSave(() => {
      sys.revoked = true;
      sys.revokedDate = today();
      if (this.allAccessRevoked && this.ob.stage === 'assets') {
        this.ob.stage = 'access_revoked';
      }
    });
  }

  openOffboardingForm(): void {
    window.open(this.offboardingFormLink, '_blank');
  }

  /** Saves the current data. Changes made while a save is in flight are saved right after it. */
  saveData(): void {
    if (!this.canSave()) return;
    if (this.saving) {
      this.pendingSave = true;
      return;
    }
    this.persist().subscribe({
      next: () => this.flashSaved(),
      error: (err) => this.showSaveError(err),
    });
  }

  /** Applies a stage change and saves it, undoing the change if the save fails. */
  private changeAndSave(change: () => void): void {
    if (!this.canSave() || this.saving) return;
    const before = this.snapshot();
    change();
    this.persist().subscribe({
      next: () => this.flashSaved(),
      error: (err) => {
        this.ob = before;
        this.showSaveError(err);
      },
    });
  }

  private canSave(): boolean {
    if (!this.employeeInView?.id) {
      this.messageService.add({ severity: 'error', summary: 'No employee', detail: 'Close this profile and open it again from the directory.', key: 'tl', life: 4000 });
      return false;
    }
    if (this.loadState !== 'ready') {
      this.messageService.add({
        severity: 'warn',
        summary: this.loadState === 'loading' ? 'Still loading' : 'Not loaded',
        detail: this.loadState === 'loading'
          ? 'The offboarding record is still loading. Try again in a moment.'
          : 'The offboarding record could not be loaded, so changes can\'t be saved. Reopen this profile to retry.',
        key: 'tl',
        life: 4000,
      });
      return false;
    }
    return true;
  }

  /** One save to the server. A create is followed by a lookup when the reply has no id, so it's never created twice. */
  private persist(): Observable<void> {
    const employeeId = this.employeeInView.id;
    const payload = { ...this.ob, employeeId };
    const creating = !this.offboardingId;
    this.saving = true;

    const save$ = creating
      ? this.employeeService.createOffboarding(payload)
      : this.employeeService.updateOffboarding(this.offboardingId!, payload);

    return save$.pipe(
      switchMap((res: any) => {
        const id = res?.id ?? res?.data?.id;
        if (id || !creating) return of(id);
        return this.employeeService.getOffboarding(employeeId).pipe(map((found: any) => found?.id ?? found?.data?.id));
      }),
      tap((id) => { if (id) this.offboardingId = id; }),
      map(() => undefined),
      finalize(() => {
        this.saving = false;
        if (this.pendingSave) {
          this.pendingSave = false;
          this.saveData();
        }
      }),
    );
  }

  private flashSaved(): void {
    this.saved = true;
    clearTimeout(this.savedTimer);
    this.savedTimer = setTimeout(() => { this.saved = false; }, 2000);
  }

  private showSaveError(err: any): void {
    this.saved = false;
    this.messageService.add({
      severity: 'error',
      summary: 'Not saved',
      detail: err?.error?.message || 'Offboarding changes could not be saved. Check your connection and try again.',
      key: 'tl',
      life: 5000,
    });
  }

  private snapshot(): OffboardingData {
    return JSON.parse(JSON.stringify(this.ob));
  }

  private loadData(): void {
    if (!this.employeeInView?.id) {
      this.loadState = 'error';
      return;
    }

    this.employeeService.getOffboarding(this.employeeInView.id).subscribe({
      next: (res: any) => {
        const record = res?.data ?? res;
        if (record && typeof record === 'object' && record.stage) {
          const { id, ...rest } = record;
          if (id) this.offboardingId = id;
          this.ob = { ...this.defaultData(), ...rest };
        }
        this.loadState = 'ready';
      },
      error: (err) => {
        // 404 just means offboarding hasn't been started for this employee.
        if (err?.status === 404) {
          this.loadState = 'ready';
          return;
        }
        this.loadState = 'error';
        this.messageService.add({ severity: 'error', summary: 'Load failed', detail: 'The offboarding record could not be loaded. Reopen this profile to retry.', key: 'tl', life: 5000 });
      },
    });
  }

  private defaultData(): OffboardingData {
    return {
      stage: 'not_started',
      lastWorkingDay: '',
      exitReason: '',
      exitReasonDetail: '',
      exitInterviewDone: false,
      exitInterviewNotes: '',
      assets: JSON.parse(JSON.stringify(DEFAULT_ASSETS)),
      handoverItems: JSON.parse(JSON.stringify(DEFAULT_HANDOVER)),
      systemAccess: JSON.parse(JSON.stringify(DEFAULT_SYSTEMS)),
      outstandingLoans: '',
      leaveBalance: '',
      finalPayDate: '',
      hrOfficer: '',
      initiatedDate: '',
      completedDate: '',
    };
  }
}

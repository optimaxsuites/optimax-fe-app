import { Component, OnInit } from '@angular/core';
import { NavigationLinksService } from '../../../shared-component/service/navigation-links/navigation-links.service';
import { EmployeeService } from '../../../service/employee.service';

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

const STORE_KEY = 'offboarding_data_v1';

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
  offboardingFormLink = '';
  offboardingId: number | string | null = null;

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
  ) {}

  ngOnInit(): void {
    const employee = localStorage.getItem('employeeInView');
    this.employeeInView = employee ? JSON.parse(employee) : null;
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

  // ── Stage transitions ──────────────────────────────────────────────────────
  initiateOffboarding(): void {
    this.ob.stage = 'initiated';
    this.ob.initiatedDate = new Date().toISOString().split('T')[0];
    this.saveData();
  }

  advanceTo(stage: OffboardingStage): void {
    this.ob.stage = stage;
    this.saveData();
  }

  revokeAccess(): void {
    this.ob.systemAccess.forEach(s => {
      s.revoked = true;
      s.revokedDate = new Date().toISOString().split('T')[0];
    });
    this.ob.stage = 'access_revoked';
    this.showConfirmRevoke = false;
    this.saveData();
  }

  completeOffboarding(): void {
    this.ob.stage = 'completed';
    this.ob.completedDate = new Date().toISOString().split('T')[0];
    this.showConfirmComplete = false;
    this.saveData();
    // Persist access-revoked flag alongside employee so other parts of the
    // app can read it to disable module access for this employee.
    if (this.employeeInView?.id) {
      const key = `employee_offboarded_${this.employeeInView.id}`;
      localStorage.setItem(key, 'true');
    }
  }

  addHandoverRow(): void {
    this.ob.handoverItems.push({ responsibility: '', status: 'Pending', handedTo: '', notes: '' });
  }

  addAssetRow(): void {
    this.ob.assets.push({ type: '', description: '', serialNumber: '', dateIssued: '', returned: false, condition: '' });
  }

  revokeSystem(sys: SystemAccess): void {
    sys.revoked = true;
    sys.revokedDate = new Date().toISOString().split('T')[0];
    if (this.allAccessRevoked && this.ob.stage === 'assets') {
      this.ob.stage = 'access_revoked';
    }
    this.saveData();
  }

  openOffboardingForm(): void {
    window.open(this.offboardingFormLink, '_blank');
  }

  saveData(): void {
    this.saving = true;
    const payload = { ...this.ob, employeeId: this.employeeInView?.id };

    const persist = (response?: any) => {
      if (response?.id) this.offboardingId = response.id;
      const key = this.employeeInView?.id
        ? `${STORE_KEY}_${this.employeeInView.id}`
        : STORE_KEY;
      localStorage.setItem(key, JSON.stringify(this.ob));
      this.saving = false;
      this.saved = true;
      setTimeout(() => { this.saved = false; }, 2000);
    };

    if (!this.employeeInView?.id) {
      persist();
      return;
    }

    const save$ = this.offboardingId
      ? this.employeeService.updateOffboarding(this.offboardingId, payload)
      : this.employeeService.createOffboarding(payload);

    save$.subscribe({
      next: (res) => persist(res),
      error: () => {
        persist();
      }
    });
  }

  private loadData(): void {
    const cacheKey = this.employeeInView?.id
      ? `${STORE_KEY}_${this.employeeInView.id}`
      : STORE_KEY;

    // Load from localStorage immediately (no spinner shown to user)
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      try { this.ob = { ...this.defaultData(), ...JSON.parse(raw) }; } catch {}
    }

    // Silently sync from backend in the background, update if API returns data
    if (!this.employeeInView?.id) return;

    this.employeeService.getOffboarding(this.employeeInView.id).subscribe({
      next: (res) => {
        if (res && typeof res === 'object' && res.stage) {
          const { id, ...rest } = res;
          if (id) this.offboardingId = id;
          this.ob = { ...this.defaultData(), ...rest };
          localStorage.setItem(cacheKey, JSON.stringify(this.ob));
        }
      },
      error: () => { /* silently ignore — localStorage data is already applied */ }
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

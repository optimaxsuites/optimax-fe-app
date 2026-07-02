import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavigationLinksService } from '../../shared-component/service/navigation-links/navigation-links.service';

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

const PROJECT_DEFAULTS: Omit<ProjectNotifPrefs, 'projectKey' | 'projectLabel'>  = {
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

  constructor(
    private navLinks: NavigationLinksService,
    private route: ActivatedRoute,
  ) {
    this.preOnboardingLink      = this.navLinks.getLink('preOnboardingForm');
    this.employeeUpdateFormLink = this.navLinks.getLink('employeeUpdateForm');
    this.offboardingFormLink    = this.navLinks.getLink('offboardingForm');
  }

  openForm(route: string): void {
    window.open(route, '_blank');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  activeSection: 'notifications' | 'odoo' | 'general' | 'forms' = 'notifications';

  // ── Notification prefs ─────────────────────────────────────────────────────
  readonly notifChannels: Array<{ key: NotifChannel; label: string; icon: string; desc: string }> = [
    { key: 'email',  label: 'Email',     icon: 'fa-envelope',      desc: 'Receive notifications to your registered email address' },
    { key: 'in_app', label: 'In-App',    icon: 'fa-bell',          desc: 'Alerts appear inside the OptimaX platform sidebar' },
    { key: 'push',   label: 'Push',      icon: 'fa-mobile-alt',    desc: 'Browser or mobile push notifications (requires browser permission)' },
    { key: 'sms',    label: 'SMS',       icon: 'fa-comment-dots',  desc: 'Text messages to your registered phone number' },
  ];

  readonly eventLabels: Record<string, string> = {
    taskAssigned:      'Task assigned to me',
    statusChange:      'Task status changed',
    followUp:          'New follow-up / update posted',
    supervisorReview:  'Supervisor review submitted',
    dueReminder:       'Task due-date reminder (24 h before)',
    appraisalDeadline: 'Appraisal cycle deadline reminder',
  };

  projects: ProjectNotifPrefs[] = [
    { projectKey: 'task_board',  projectLabel: 'Task Board',         ...this.clone(PROJECT_DEFAULTS) },
    { projectKey: 'appraisal',   projectLabel: 'Performance Appraisal', ...this.clone(PROJECT_DEFAULTS) },
    { projectKey: 'recruitment', projectLabel: 'Recruitment',         ...this.clone({ ...PROJECT_DEFAULTS, channels: { email: true, in_app: true, push: false, sms: false } }) },
    { projectKey: 'payroll',     projectLabel: 'Payroll',             ...this.clone({ ...PROJECT_DEFAULTS, channels: { email: true, in_app: false, push: false, sms: false } }) },
    { projectKey: 'leave',       projectLabel: 'Leave & Attendance',  ...this.clone(PROJECT_DEFAULTS) },
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
      if (panel && ['notifications', 'odoo', 'general', 'forms'].includes(panel)) {
        this.activeSection = panel as typeof this.activeSection;
      }
    });
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
    } catch {}
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

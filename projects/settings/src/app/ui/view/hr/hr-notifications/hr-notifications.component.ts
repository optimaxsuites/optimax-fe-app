import { Component, OnInit } from '@angular/core';

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

const STORE_KEY = 'hr_notif_prefs_v1';

const DEFAULTS: Omit<ProjectNotifPrefs, 'projectKey' | 'projectLabel'> = {
  channels: { email: true, in_app: true, push: false, sms: false },
  events: {
    taskAssigned: true, statusChange: true, followUp: true,
    supervisorReview: true, dueReminder: true, appraisalDeadline: true,
  },
};

@Component({
  selector: 'app-hr-notifications',
  templateUrl: './hr-notifications.component.html',
  styleUrl: './hr-notifications.component.scss',
})
export class HrNotificationsComponent implements OnInit {

  readonly notifChannels: Array<{ key: NotifChannel; label: string; icon: string; desc: string }> = [
    { key: 'email',  label: 'Email',   icon: 'fas fa-envelope',     desc: 'Notifications sent to your registered email' },
    { key: 'in_app', label: 'In-App',  icon: 'fas fa-bell',         desc: 'Alerts inside the OptimaX platform' },
    { key: 'push',   label: 'Push',    icon: 'fas fa-mobile-alt',   desc: 'Browser / mobile push notifications' },
    { key: 'sms',    label: 'SMS',     icon: 'fas fa-comment-dots', desc: 'Text messages to your phone' },
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
    { projectKey: 'task_board',  projectLabel: 'Task Board',            ...this.clone(DEFAULTS) },
    { projectKey: 'appraisal',   projectLabel: 'Performance Appraisal', ...this.clone(DEFAULTS) },
    { projectKey: 'recruitment', projectLabel: 'Recruitment',           ...this.clone(DEFAULTS) },
    { projectKey: 'payroll',     projectLabel: 'Payroll',               ...this.clone({ ...DEFAULTS, channels: { email: true, in_app: false, push: false, sms: false } }) },
    { projectKey: 'leave',       projectLabel: 'Leave & Attendance',    ...this.clone(DEFAULTS) },
  ];

  expandedProject: string | null = 'task_board';
  saveSuccess = false;

  ngOnInit(): void { this.loadPrefs(); }

  private clone<T>(obj: T): T { return JSON.parse(JSON.stringify(obj)); }

  private loadPrefs(): void {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const saved: ProjectNotifPrefs[] = JSON.parse(raw);
        saved.forEach(s => {
          const m = this.projects.find(p => p.projectKey === s.projectKey);
          if (m) { m.channels = s.channels; m.events = s.events; }
        });
      }
    } catch {}
  }

  savePrefs(): void {
    localStorage.setItem(STORE_KEY, JSON.stringify(this.projects));
    this.saveSuccess = true;
    setTimeout(() => { this.saveSuccess = false; }, 2500);
  }

  toggleProject(key: string): void {
    this.expandedProject = this.expandedProject === key ? null : key;
  }

  toggleAllChannels(proj: ProjectNotifPrefs, on: boolean): void {
    (Object.keys(proj.channels) as NotifChannel[]).forEach(k => proj.channels[k] = on);
  }

  toggleAllEvents(proj: ProjectNotifPrefs, on: boolean): void {
    (Object.keys(proj.events) as Array<keyof ProjectNotifPrefs['events']>).forEach(k => proj.events[k] = on);
  }

  get eventKeys(): string[] { return Object.keys(this.eventLabels); }

  projEvents(proj: ProjectNotifPrefs): Record<string, boolean> {
    return proj.events as unknown as Record<string, boolean>;
  }
}

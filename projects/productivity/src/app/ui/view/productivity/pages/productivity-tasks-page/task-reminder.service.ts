import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

export type ReminderOffset = 'none' | '1_day' | '3_days' | '1_week' | '2_weeks';

export interface TaskReminder {
  id: string;
  taskId: string;
  taskTitle: string;
  dueDate: string;
  reminderAt: string;
  note?: string;
  assignee?: string;
  fired: boolean;
  createdAt: string;
}

const REMINDER_KEY = 'productivity_task_reminders_v1';

@Injectable({ providedIn: 'root' })
export class TaskReminderService {
  private readonly _fired$ = new Subject<TaskReminder>();
  readonly onReminderFired = this._fired$.asObservable();

  private intervalRef: ReturnType<typeof setInterval> | null = null;

  constructor(private zone: NgZone) {}

  computeReminderDate(dueDate: string, offset: ReminderOffset): Date | null {
    if (offset === 'none' || !dueDate) return null;
    const due = new Date(dueDate + 'T09:00:00');
    if (isNaN(due.getTime())) return null;
    const DAY = 86_400_000;
    switch (offset) {
      case '1_day':   return new Date(due.getTime() - DAY);
      case '3_days':  return new Date(due.getTime() - 3 * DAY);
      case '1_week':  return new Date(due.getTime() - 7 * DAY);
      case '2_weeks': return new Date(due.getTime() - 14 * DAY);
      default: return null;
    }
  }

  schedule(
    taskId: string,
    taskTitle: string,
    dueDate: string,
    offset: ReminderOffset,
    note?: string,
    assignee?: string,
  ): void {
    if (offset === 'none') return;
    const reminderAt = this.computeReminderDate(dueDate, offset);
    if (!reminderAt) return;
    const all = this.getAll().filter(r => r.taskId !== taskId);
    all.push({
      id: `rem_${Date.now()}`,
      taskId, taskTitle, dueDate,
      reminderAt: reminderAt.toISOString(),
      note, assignee,
      fired: false,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(REMINDER_KEY, JSON.stringify(all));
  }

  remove(taskId: string): void {
    const updated = this.getAll().filter(r => r.taskId !== taskId);
    localStorage.setItem(REMINDER_KEY, JSON.stringify(updated));
  }

  getAll(): TaskReminder[] {
    try { return JSON.parse(localStorage.getItem(REMINDER_KEY) || '[]'); } catch { return []; }
  }

  checkAndFireDue(): TaskReminder[] {
    const now = Date.now();
    const all = this.getAll();
    const fired: TaskReminder[] = [];
    const updated = all.map(r => {
      if (!r.fired && new Date(r.reminderAt).getTime() <= now) {
        const f = { ...r, fired: true };
        fired.push(f);
        return f;
      }
      return r;
    });
    if (fired.length) {
      localStorage.setItem(REMINDER_KEY, JSON.stringify(updated));
      fired.forEach(r => {
        this.zone.run(() => this._fired$.next(r));
        this._triggerBrowser(r);
      });
    }
    return fired;
  }

  startPolling(): void {
    this.stopPolling();
    this.checkAndFireDue();
    this.intervalRef = setInterval(() => this.checkAndFireDue(), 60_000);
  }

  stopPolling(): void {
    if (this.intervalRef !== null) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  private _triggerBrowser(r: TaskReminder): void {
    if (!('Notification' in window)) return;
    const show = () =>
      new Notification(`Task Reminder: ${r.taskTitle}`, {
        body: r.note ? `${r.note} — Due: ${r.dueDate}` : `Due: ${r.dueDate}`,
        icon: '/favicon.ico',
        tag: r.taskId,
      });
    if (Notification.permission === 'granted') { show(); }
    else if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => { if (p === 'granted') show(); });
    }
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface HrNotification {
  id: string;
  title: string;
  body: string;
  recipient: string;
  read: boolean;
  createdAt: string;
  taskId?: string;
}

const NOTIF_KEY = 'hr_task_notifications_v1';

@Injectable({ providedIn: 'root' })
export class HrTaskNotificationService {
  private _count$ = new BehaviorSubject<number>(0);
  readonly unreadCount$ = this._count$.asObservable();

  constructor() { this.refresh(); }

  add(title: string, body: string, recipient: string, taskId?: string): void {
    const all = this.getAll();
    all.unshift({ id: `n${Date.now()}`, title, body, recipient, read: false, createdAt: new Date().toISOString(), taskId });
    localStorage.setItem(NOTIF_KEY, JSON.stringify(all.slice(0, 50)));
    this.refresh();
  }

  getAll(): HrNotification[] {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); } catch { return []; }
  }

  markAllRead(): void {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(this.getAll().map(n => ({ ...n, read: true }))));
    this.refresh();
  }

  private refresh(): void {
    this._count$.next(this.getAll().filter(n => !n.read).length);
  }
}

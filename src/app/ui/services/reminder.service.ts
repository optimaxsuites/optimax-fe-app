import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ChatReminder {
  id: string;
  messageId?: string;       // frontend message id for badge tracking
  messageText: string;
  channel: string;
  targetTime: number;       // Unix ms — the actual meeting/event time
  alertAt: number;          // Unix ms — when to ring (targetTime - leadMs)
  leadMinutes: number;
  fired: boolean;
  snoozedUntil?: number;
}

const STORAGE_KEY = 'optimax_chat_reminders';

@Injectable({ providedIn: 'root' })
export class ReminderService implements OnDestroy {
  /** Emits the reminder currently ringing, or null when silent. */
  readonly active$ = new BehaviorSubject<ChatReminder | null>(null);

  /** Emits the full list on every change so UI can react. */
  readonly list$ = new BehaviorSubject<ChatReminder[]>([]);

  private _tick?: ReturnType<typeof setInterval>;

  constructor() {
    this.list$.next(this._load());
    this._start();
  }

  // ── Public API ─────────────────────────────────────────

  add(reminder: Omit<ChatReminder, 'id' | 'fired'>): ChatReminder {
    const r: ChatReminder = { ...reminder, id: this._uid(), fired: false };
    const list = this._load();
    list.push(r);
    this._save(list);
    this._requestNotificationPermission();
    return r;
  }

  dismiss(id: string): void {
    const list = this._load().map(r =>
      r.id === id ? { ...r, fired: true } : r
    );
    this._save(list);
    if (this.active$.value?.id === id) {
      this.active$.next(null);
    }
  }

  snooze(id: string, minutes = 5): void {
    const snoozedUntil = Date.now() + minutes * 60_000;
    const list = this._load().map(r =>
      r.id === id ? { ...r, snoozedUntil, fired: false } : r
    );
    this._save(list);
    if (this.active$.value?.id === id) {
      this.active$.next(null);
    }
  }

  remove(id: string): void {
    this._save(this._load().filter(r => r.id !== id));
    if (this.active$.value?.id === id) {
      this.active$.next(null);
    }
  }

  getAll(): ChatReminder[] {
    return this._load().filter(r => !r.fired);
  }

  /** True if any non-fired reminder is linked to this message. */
  hasReminderFor(messageId: string): boolean {
    return this._load().some(r => !r.fired && r.messageId === messageId);
  }

  ngOnDestroy(): void {
    clearInterval(this._tick);
  }

  // ── Time parsing ────────────────────────────────────────

  /** Extracts the first time-like string from message text. */
  static extractTime(text: string): Date | null {
    // matches: 3:30pm, 3:30 PM, 15:30, 3pm, 3 pm, 3.30pm
    const m = text.match(
      /\b(\d{1,2})(?:[:.h](\d{2}))?\s*(am|pm|AM|PM)?\b/
    );
    if (!m) return null;

    let hours = parseInt(m[1], 10);
    const minutes = m[2] ? parseInt(m[2], 10) : 0;
    const meridiem = (m[3] || '').toLowerCase();

    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    if (!meridiem && hours < 7) hours += 12; // bare "3" → afternoon heuristic

    const d = new Date();
    d.setSeconds(0, 0);
    d.setHours(hours, minutes);
    // If the time has already passed today, schedule for tomorrow
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    return d;
  }

  // ── Internals ──────────────────────────────────────────

  private _start(): void {
    this._tick = setInterval(() => this._check(), 30_000);
    // also check immediately so a refreshed page picks up pending reminders
    setTimeout(() => this._check(), 500);
  }

  private _check(): void {
    const now = Date.now();
    const list = this._load();
    let changed = false;

    for (const r of list) {
      if (r.fired) continue;
      if (r.snoozedUntil && r.snoozedUntil > now) continue;
      if (r.alertAt <= now) {
        r.fired = true;
        changed = true;
        this._fire(r);
        break; // handle one at a time; next tick handles the rest
      }
    }

    if (changed) this._save(list);
  }

  private _fire(r: ChatReminder): void {
    // OS notification — visible even when tab is minimised or user is in another app
    if (Notification.permission === 'granted') {
      const n = new Notification('Meeting Reminder 🔔', {
        body: r.messageText.slice(0, 120),
        icon: '/assets/icons/icon-72x72.png',
        tag: r.id,
        requireInteraction: true,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }

    // In-app ringing bell overlay
    this.active$.next(r);
  }

  private _load(): ChatReminder[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private _save(list: ChatReminder[]): void {
    // Keep at most 50 reminders; prune old fired ones
    const pruned = list
      .filter(r => !r.fired || r.alertAt > Date.now() - 86_400_000)
      .slice(-50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    this.list$.next([...pruned]);
  }

  private _requestNotificationPermission(): void {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  private _uid(): string {
    return `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
}

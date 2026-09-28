import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ChatReminder {
  id: string;
  backendId?: number;      // set after successful POST to server
  messageId?: string;
  messageText: string;
  channel: string;
  targetTime: number;      // Unix ms — actual meeting/event time
  alertAt: number;         // Unix ms — when to ring
  leadMinutes: number;
  fired: boolean;
  snoozedUntil?: number;
}

interface ApiReminderFullDTO {
  id: number;
  userId: number;
  messageId?: string;
  messageText: string;
  channelName: string;
  targetTimeMs: number;
  alertAtMs: number;
  leadMinutes: number;
  fired: boolean;
  snoozedUntilMs?: number;
}

const CACHE_KEY = 'optimax_chat_reminders';
const API = `${environment.apiBaseUrl}/x/api/v2/ai/collab/chat/reminder`;

@Injectable({ providedIn: 'root' })
export class ReminderService implements OnDestroy {
  /** Emits the reminder currently ringing, or null when silent. */
  readonly active$ = new BehaviorSubject<ChatReminder | null>(null);

  /** Emits the full list on every change so UI can react. */
  readonly list$ = new BehaviorSubject<ChatReminder[]>([]);

  private _tick?: ReturnType<typeof setInterval>;

  constructor(private readonly http: HttpClient) {
    // Seed from local cache immediately (fast paint), then sync from server
    this.list$.next(this._loadCache());
    this._start();
    setTimeout(() => this._syncFromApi(), 1200);
  }

  // ── Public API ─────────────────────────────────────────

  add(reminder: Omit<ChatReminder, 'id' | 'fired' | 'backendId'>): ChatReminder {
    const r: ChatReminder = { ...reminder, id: this._uid(), fired: false };
    const list = this._loadCache();
    list.push(r);
    this._saveCache(list);
    this._requestNotificationPermission();

    // Persist to backend; update local entry with backendId on success
    this.http.post<ApiReminderFullDTO>(API, this._toApiDto(r)).subscribe({
      next: resp => {
        const current = this._loadCache();
        const idx = current.findIndex(x => x.id === r.id);
        if (idx >= 0) {
          current[idx] = { ...current[idx], backendId: resp.id };
          this._saveCache(current);
        }
      },
      error: () => { /* graceful — reminder still works from local cache */ },
    });

    return r;
  }

  dismiss(id: string): void {
    const list = this._loadCache();
    const target = list.find(r => r.id === id);
    const updated = list.map(r => r.id === id ? { ...r, fired: true } : r);
    this._saveCache(updated);
    if (this.active$.value?.id === id) this.active$.next(null);

    if (target?.backendId) {
      this.http.patch(`${API}/${target.backendId}/fire`, {}).subscribe({ error: () => {} });
    }
  }

  snooze(id: string, minutes = 5): void {
    const snoozedUntil = Date.now() + minutes * 60_000;
    const list = this._loadCache();
    const target = list.find(r => r.id === id);
    const updated = list.map(r => r.id === id ? { ...r, snoozedUntil, fired: false } : r);
    this._saveCache(updated);
    if (this.active$.value?.id === id) this.active$.next(null);

    if (target?.backendId) {
      this.http.patch(`${API}/${target.backendId}/snooze?minutes=${minutes}`, {}).subscribe({ error: () => {} });
    }
  }

  remove(id: string): void {
    const list = this._loadCache();
    const target = list.find(r => r.id === id);
    this._saveCache(list.filter(r => r.id !== id));
    if (this.active$.value?.id === id) this.active$.next(null);

    if (target?.backendId) {
      this.http.delete(`${API}/${target.backendId}`).subscribe({ error: () => {} });
    }
  }

  getAll(): ChatReminder[] {
    return this._loadCache().filter(r => !r.fired);
  }

  /** True if any non-fired reminder is linked to this message. */
  hasReminderFor(messageId: string): boolean {
    return this._loadCache().some(r => !r.fired && r.messageId === messageId);
  }

  ngOnDestroy(): void {
    clearInterval(this._tick);
  }

  // ── Time parsing ────────────────────────────────────────

  static extractTime(text: string): Date | null {
    const m = text.match(/\b(\d{1,2})(?:[:.h](\d{2}))?\s*(am|pm|AM|PM)?\b/);
    if (!m) return null;

    let hours = parseInt(m[1], 10);
    const minutes = m[2] ? parseInt(m[2], 10) : 0;
    const meridiem = (m[3] || '').toLowerCase();

    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    if (!meridiem && hours < 7) hours += 12;

    const d = new Date();
    d.setSeconds(0, 0);
    d.setHours(hours, minutes);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    return d;
  }

  // ── Internals ──────────────────────────────────────────

  private _syncFromApi(): void {
    this.http.get<ApiReminderFullDTO[]>(`${API}/me`).subscribe({
      next: list => {
        const reminders = list.map(r => this._fromApi(r));
        this._saveCache(reminders);
      },
      error: () => { /* keep local cache — user may be offline */ },
    });
  }

  private _start(): void {
    this._tick = setInterval(() => this._check(), 30_000);
    setTimeout(() => this._check(), 500);
  }

  private _check(): void {
    const now = Date.now();
    const list = this._loadCache();
    let changed = false;

    for (const r of list) {
      if (r.fired) continue;
      if (r.snoozedUntil && r.snoozedUntil > now) continue;
      if (r.alertAt <= now) {
        r.fired = true;
        changed = true;
        this._fire(r);
        break;
      }
    }

    if (changed) this._saveCache(list);
  }

  private _fire(r: ChatReminder): void {
    if (Notification.permission === 'granted') {
      const n = new Notification('Meeting Reminder 🔔', {
        body: r.messageText.slice(0, 120),
        icon: '/assets/icons/icon-72x72.png',
        tag: r.id,
        requireInteraction: true,
      });
      n.onclick = () => { window.focus(); n.close(); };
    }
    this.active$.next(r);
  }

  private _fromApi(r: ApiReminderFullDTO): ChatReminder {
    return {
      id: `backend_${r.id}`,
      backendId: r.id,
      messageId: r.messageId,
      messageText: r.messageText,
      channel: r.channelName,
      targetTime: r.targetTimeMs,
      alertAt: r.alertAtMs,
      leadMinutes: r.leadMinutes,
      fired: r.fired,
      snoozedUntil: r.snoozedUntilMs,
    };
  }

  private _toApiDto(r: ChatReminder): object {
    return {
      messageId: r.messageId,
      messageText: r.messageText,
      channelName: r.channel,
      targetTimeMs: r.targetTime,
      alertAtMs: r.alertAt,
      leadMinutes: r.leadMinutes,
    };
  }

  private _loadCache(): ChatReminder[] {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private _saveCache(list: ChatReminder[]): void {
    const pruned = list
      .filter(r => !r.fired || r.alertAt > Date.now() - 86_400_000)
      .slice(-50);
    localStorage.setItem(CACHE_KEY, JSON.stringify(pruned));
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

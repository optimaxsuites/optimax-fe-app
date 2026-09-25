import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ChatReminder, ReminderService } from '../../services/reminder.service';

@Component({
  selector: 'app-reminder-bell',
  templateUrl: './reminder-bell.component.html',
  styleUrls: ['./reminder-bell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReminderBellComponent implements OnInit, OnDestroy {
  reminder: ChatReminder | null = null;
  ringing = false;

  /** All non-fired upcoming reminders for the panel list. */
  allReminders: ChatReminder[] = [];
  panelOpen = false;

  private _subs: Subscription[] = [];
  private _loopTimer?: ReturnType<typeof setInterval>;
  private _audioCtx?: AudioContext;

  constructor(
    private reminderService: ReminderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this._subs.push(
      this.reminderService.active$.subscribe(r => {
        this.reminder = r;
        this.cdr.markForCheck();
        if (r) {
          this._startRinging();
        } else {
          this._stopRinging();
        }
      }),

      this.reminderService.list$.subscribe(list => {
        this.allReminders = list.filter(r => !r.fired);
        this.cdr.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this._subs.forEach(s => s.unsubscribe());
    this._stopRinging();
  }

  get upcomingCount(): number {
    return this.allReminders.length;
  }

  togglePanel(): void {
    this.panelOpen = !this.panelOpen;
    this.cdr.markForCheck();
  }

  closePanel(): void {
    this.panelOpen = false;
    this.cdr.markForCheck();
  }

  cancelReminder(id: string): void {
    this.reminderService.remove(id);
  }

  dismiss(): void {
    if (this.reminder) this.reminderService.dismiss(this.reminder.id);
  }

  snooze(minutes: number): void {
    if (this.reminder) this.reminderService.snooze(this.reminder.id, minutes);
  }

  get leadLabel(): string {
    const lead = this.reminder?.leadMinutes ?? 0;
    return lead === 1 ? '1 minute' : `${lead} minutes`;
  }

  formatAlertTime(ms: number): string {
    const d = new Date(ms);
    let h = d.getHours();
    const min = d.getMinutes().toString().padStart(2, '0');
    const mer = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${min} ${mer}`;
  }

  formatLeadLabel(r: ChatReminder): string {
    const alertDate = new Date(r.alertAt);
    const now = new Date();
    const diffMs = r.alertAt - Date.now();
    if (diffMs < 0) return 'Due';
    const diffMin = Math.round(diffMs / 60_000);
    if (diffMin < 60) return `in ${diffMin} min`;
    if (alertDate.toDateString() === now.toDateString()) {
      return `today at ${this.formatAlertTime(r.alertAt)}`;
    }
    return `at ${this.formatAlertTime(r.alertAt)}`;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.panelOpen) this.closePanel();
  }

  private _startRinging(): void {
    this.ringing = true;
    this.cdr.markForCheck();
    this._playBell();
    this._loopTimer = setInterval(() => this._playBell(), 4_000);
  }

  private _stopRinging(): void {
    this.ringing = false;
    clearInterval(this._loopTimer);
    this._loopTimer = undefined;
    this._audioCtx?.close().catch(() => {});
    this._audioCtx = undefined;
    this.cdr.markForCheck();
  }

  private _playBell(): void {
    try {
      const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx() as AudioContext;
      this._audioCtx = ctx;

      const partials: { freq: number; gain: number }[] = [
        { freq: 880,  gain: 0.40 },
        { freq: 1100, gain: 0.25 },
        { freq: 1320, gain: 0.15 },
      ];

      partials.forEach(({ freq, gain }, i) => {
        const osc  = ctx.createOscillator();
        const env  = ctx.createGain();
        osc.connect(env);
        env.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.value = freq;

        const t0 = ctx.currentTime + i * 0.04;
        env.gain.setValueAtTime(gain, t0);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.0);

        osc.start(t0);
        osc.stop(t0 + 2.0);
      });
    } catch {
      // Web Audio API unavailable — silent fallback
    }
  }
}

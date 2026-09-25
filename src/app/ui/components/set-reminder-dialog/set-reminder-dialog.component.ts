import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { ChatReminder, ReminderService } from '../../services/reminder.service';

@Component({
  selector: 'app-set-reminder-dialog',
  templateUrl: './set-reminder-dialog.component.html',
  styleUrls: ['./set-reminder-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetReminderDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() messageText = '';
  @Input() channel = '';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() reminderSet = new EventEmitter<ChatReminder>();

  timeString = '';
  leadMinutes = 2;
  error = '';
  saved = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue && changes['visible'].previousValue === false) {
      this.error = '';
      this.saved = false;
      // Pre-fill from message
      const extracted = ReminderService.extractTime(this.messageText);
      this.timeString = extracted ? this._formatTime(extracted) : '';
    }
  }

  confirm(): void {
    this.error = '';
    const target = this._parseTimeString(this.timeString);
    if (!target) {
      this.error = 'Please enter a valid time (e.g. 3:30 PM)';
      return;
    }
    if (target.getTime() <= Date.now()) {
      this.error = 'That time has already passed today';
      return;
    }

    const alertAt = target.getTime() - this.leadMinutes * 60_000;
    if (alertAt <= Date.now()) {
      this.error = `Not enough time — the meeting is less than ${this.leadMinutes} min away`;
      return;
    }

    // ReminderService is not injected here — emit to parent to call it
    this.reminderSet.emit({
      id: '',
      messageText: this.messageText,
      channel: this.channel,
      targetTime: target.getTime(),
      alertAt,
      leadMinutes: this.leadMinutes,
      fired: false,
    });

    this.saved = true;
    setTimeout(() => this.close(), 1200);
  }

  close(): void {
    this.visibleChange.emit(false);
  }

  private _parseTimeString(raw: string): Date | null {
    // Support: "3:30 PM", "15:30", "3pm", "3:30pm"
    const m = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const mer = (m[3] || '').toLowerCase();
    if (mer === 'pm' && h < 12) h += 12;
    if (mer === 'am' && h === 12) h = 0;
    if (h > 23 || min > 59) return null;

    const d = new Date();
    d.setHours(h, min, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    return d;
  }

  private _formatTime(d: Date): string {
    let h = d.getHours();
    const min = d.getMinutes().toString().padStart(2, '0');
    const mer = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${min} ${mer}`;
  }
}

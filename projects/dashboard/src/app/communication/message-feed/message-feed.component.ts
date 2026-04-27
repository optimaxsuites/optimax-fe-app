import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Message } from '../communication.component';

@Component({
  selector: 'app-message-feed',
  templateUrl: './message-feed.component.html',
  styleUrls: ['./message-feed.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageFeedComponent {
  // ── Inputs ──────────────────────────────────────────
  @Input() messages: Message[] = [];
  @Input() loading = false;
  @Input() activeView: 'channel' | 'dm' | 'threads' = 'channel';
  @Input() activeChannelName = '';
  @Input() activeDmName = '';
  @Input() activeChannelDescription = '';
  @Input() activeThreadId: string | null = null;
  @Input() confirmDeleteId: string | null = null;
  @Input() editingMessageId: string | null = null;
  @Input() editDraft = '';
  @Input() savingEdit = false;
  @Input() reactingIds = new Set<string>();
  @Input() deletingIds = new Set<string>();
  @Input() myUserId = 0;
  @Input() flashId: string | null = null;

  // ── Outputs ─────────────────────────────────────────
  @Output() threadOpened = new EventEmitter<{ msg: Message; event: Event }>();
  @Output() likeToggled = new EventEmitter<{ msg: Message; event: Event }>();
  @Output() pinToggled = new EventEmitter<{ msg: Message; event: Event }>();
  @Output() editStarted = new EventEmitter<{ msg: Message; event?: Event }>();
  @Output() editCancelled = new EventEmitter<void>();
  @Output() editSaved = new EventEmitter<Message>();
  @Output() editDraftChange = new EventEmitter<string>();
  @Output() deleteRequested = new EventEmitter<{ msg: Message; event?: Event }>();
  @Output() deleteConfirmed = new EventEmitter<{ msg: Message; event?: Event }>();
  @Output() deleteDismissed = new EventEmitter<void>();
  @Output() attachmentDownload = new EventEmitter<{ attachment: any; event: Event }>();

  // ── Template helpers ─────────────────────────────────

  isFlashing(id: string): boolean {
    return this.flashId === id;
  }

  isReacting(msgId: string): boolean {
    return this.reactingIds.has(msgId);
  }

  isDeleting(msgId: string): boolean {
    return this.deletingIds.has(msgId);
  }

  isEditing(msgId: string): boolean {
    return this.editingMessageId === msgId;
  }

  isOwnMessage(msg: Message): boolean {
    return Number(msg.senderUserId) === Number(this.myUserId);
  }

  getTopReplies(msg: Message): Message[] {
    return msg.replies.slice(0, 2);
  }

  shouldShowDaySeparator(msgs: Message[], index: number): boolean {
    if (index === 0) return true;
    const prev = msgs[index - 1];
    const curr = msgs[index];
    if (!curr.sentAtRaw || !prev.sentAtRaw) return false;
    return this.getDayLabel(curr.sentAtRaw) !== this.getDayLabel(prev.sentAtRaw);
  }

  getDayLabel(raw: string | number[] | undefined): string {
    const d = this.parseServerDate(raw);
    if (!d) return '';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((today.getTime() - msgDay.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }

  /**
   * FIX #2 (Timezone): Parse server dates as UTC so they display in the
   * browser's local timezone. Java LocalDateTime arrays from the backend
   * represent UTC values — using Date.UTC() triggers correct local conversion.
   */
  parseServerDate(raw: string | number[] | undefined): Date | null {
    if (!raw) return null;
    let d: Date;
    if (Array.isArray(raw)) {
      // Backend array values are UTC — convert via Date.UTC for local display
      d = new Date(Date.UTC(
        raw[0] as number,
        ((raw[1] as number) || 1) - 1,
        (raw[2] as number) || 1,
        (raw[3] as number) || 0,
        (raw[4] as number) || 0,
        (raw[5] as number) || 0,
        // index 6 is nanoseconds — convert to milliseconds
        Math.floor(((raw[6] as number) || 0) / 1_000_000),
      ));
    } else {
      let s = String(raw).trim().replace(' ', 'T');
      // If no timezone info present, treat as UTC (backend sends UTC)
      if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(s)) s += 'Z';
      d = new Date(s);
      if (isNaN(d.getTime())) d = new Date(raw as string);
    }
    return isNaN(d.getTime()) ? null : d;
  }

  trackById(_: number, m: { id: string }): string {
    return m.id;
  }

  onEditKey(e: KeyboardEvent, msg: Message): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.editSaved.emit(msg);
    }
    if (e.key === 'Escape') this.editCancelled.emit();
  }

  getReadCount(_msg: Message): number {
    return 0;
  }
}
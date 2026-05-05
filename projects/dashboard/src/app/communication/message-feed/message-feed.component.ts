import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Message } from '../communication.component';

// damilola worked on this: thread inbox layout, attachment previews, and delivered/seen receipt labels.
@Component({
  selector: 'app-message-feed',
  templateUrl: './message-feed.component.html',
  styleUrls: ['./message-feed.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageFeedComponent {
  private readonly urlRegex = /((https?:\/\/|www\.)[^\s<]+)/gi;
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
  @Input() readCountForMessage: (msg: Message) => number = () => 0;

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

  parseServerDate(raw: string | number[] | undefined): Date | null {
    if (!raw) return null;
    let d: Date;
    if (Array.isArray(raw)) {
      d = new Date(Date.UTC(
        raw[0] as number,
        ((raw[1] as number) || 1) - 1,
        (raw[2] as number) || 1,
        (raw[3] as number) || 0,
        (raw[4] as number) || 0,
        (raw[5] as number) || 0,
        Math.floor(((raw[6] as number) || 0) / 1_000_000),
      ));
    } else {
      let s = String(raw).trim().replace(' ', 'T');
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

  getReadCount(msg: Message): number {
    return this.readCountForMessage(msg);
  }

  readReceiptLabel(msg: Message): string {
    const count = this.getReadCount(msg);
    if (count <= 0) {
      if (msg.deliveryState === 'SENDING') {
        return 'Sending...';
      }
      if (msg.deliveryState === 'DELIVERED') {
        return 'Delivered';
      }
      return 'Sent';
    }
    if (this.activeView === 'dm') {
      return 'Seen';
    }
    return count === 1 ? 'Seen by 1' : `Seen by ${count}`;
  }

  isImageAttachment(attachment: Message['attachment'] | undefined): boolean {
    return Boolean(attachment?.type?.toLowerCase().startsWith('image/'));
  }

  threadSourceLabel(msg: Message): string {
    return msg.sourceType === 'dm' ? 'Direct message' : 'Channel thread';
  }

  threadReplyCountLabel(msg: Message): string {
    const count = Number(msg.threadReplyCount || msg.replies.length || 0);
    return count === 1 ? '1 reply' : `${count} replies`;
  }

  threadPreviewReplies(msg: Message): Message[] {
    return (msg.replies || []).slice(0, 2);
  }

  messageHtml(content: string): string {
    const escaped = this.escapeHtml(content || '');
    return escaped
      .replace(this.urlRegex, (rawUrl) => {
        const normalized = this.normalizePreviewUrl(rawUrl);
        const safeLabel = this.escapeHtml(rawUrl);
        return `<a href="${normalized}" target="_blank" rel="noopener noreferrer" class="chat-link">${safeLabel}</a>`;
      })
      .replace(/\n/g, '<br>');
  }

  messageLinkPreview(msg: Message): {
    url: string;
    displayUrl: string;
    title: string;
    subtitle: string;
    thumbnailUrl: string;
  } | null {
    const match = (msg.content || '').match(this.urlRegex);
    const rawUrl = match?.[0]?.trim();
    if (!rawUrl) return null;
    try {
      const normalized = this.normalizePreviewUrl(rawUrl);
      const parsed = new URL(normalized);
      const hostname = parsed.hostname.replace(/^www\./i, '');
      const path = `${parsed.pathname || ''}${parsed.search || ''}` || '/';
      const displayUrl = `${hostname}${path === '/' ? '' : path}`;
      const imageMatch = parsed.pathname.match(/\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i);
      if (imageMatch) {
        return {
          url: normalized,
          displayUrl,
          title: this.previewFileName(parsed.pathname) || hostname,
          subtitle: 'Direct image link',
          thumbnailUrl: normalized,
        };
      }
      const youtubeId = this.extractYoutubeId(parsed);
      if (youtubeId) {
        return {
          url: normalized,
          displayUrl,
          title: 'YouTube video',
          subtitle: hostname,
          thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
        };
      }
      return {
        url: normalized,
        displayUrl,
        title: hostname,
        subtitle: path === '/' ? 'Website link' : path,
        thumbnailUrl: `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(parsed.origin)}`,
      };
    } catch {
      return null;
    }
  }

  private normalizePreviewUrl(rawUrl: string): string {
    const value = (rawUrl || '').trim();
    return /^https?:\/\//i.test(value) ? value : `https://${value.replace(/^\/+/, '')}`;
  }

  private previewFileName(pathname: string): string {
    return pathname.split('/').pop() || '';
  }

  private extractYoutubeId(parsed: URL): string | null {
    if (/youtube\.com$/i.test(parsed.hostname) || /youtu\.be$/i.test(parsed.hostname)) {
      if (/youtu\.be$/i.test(parsed.hostname)) {
        return parsed.pathname.replace(/\//g, '') || null;
      }
      return parsed.searchParams.get('v');
    }
    return null;
  }

  private escapeHtml(value: string): string {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

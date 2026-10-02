import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnDestroy,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { Message } from '../communication.component';
import { CollaborationService } from '../../../app/ui/services/collaboration.service';
import { ReminderService } from 'src/app/ui/services/reminder.service';

interface HoverPersonCard {
  name: string;
  avatarUrl?: string;
  initials: string;
}

interface MentionCandidate {
  userId: number;
  label: string;
}

interface MentionProfileCard {
  userId: number;
  name: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  avatarUrl?: string;
  initials: string;
  online: boolean;
  lastSeenLabel: string;
}

interface ChatReactionOption {
  code: string;
  emoji: string;
  label: string;
}

// damilola worked on this: thread inbox layout, attachment previews, and delivered/seen receipt labels.
@Component({
  selector: 'app-message-feed',
  templateUrl: './message-feed.component.html',
  styleUrls: ['./message-feed.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageFeedComponent implements OnInit, OnDestroy, OnChanges {
  private readonly urlRegex = /((https?:\/\/|www\.)[^\s<]+)/gi;
  private readonly mentionBoundaryAfterRegex = '(?=$|[\\s.,!?;:()\\[\\]{}"\'`])';
  imageViewerOpen = false;
  imageViewerItems: Array<{ url: string; label: string }> = [];
  imageViewerIndex = 0;
  documentViewerOpen = false;
  documentViewerTitle = '';
  documentViewerUrl: SafeResourceUrl = '';
  documentViewerType: 'pdf' | 'office' | 'file' = 'file';

  constructor(
    private sanitizer: DomSanitizer,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private collabService: CollaborationService,
    readonly reminderService: ReminderService,
  ) {}

  // ── Reminder ─────────────────────────────────────────
  reminderDialogMsg: Message | null = null;
  reminderTimeString = '';
  reminderLeadMinutes = 2;
  reminderError = '';
  reminderSaved = false;
  /** Message IDs that have at least one active (non-fired) reminder. */
  reminderMsgIds = new Set<string>();
  private _reminderListSub?: Subscription;

  hasTimeInMessage(msg: Message): boolean {
    return !!ReminderService.extractTime(msg.content || '');
  }

  openReminderDialog(msg: Message, event: Event): void {
    event.stopPropagation();
    this.reminderDialogMsg = msg;
    this.reminderError = '';
    this.reminderSaved = false;
    const extracted = ReminderService.extractTime(msg.content || '');
    this.reminderTimeString = extracted ? this._formatTime(extracted) : '';
    this.cdr.markForCheck();
  }

  closeReminderDialog(): void {
    this.reminderDialogMsg = null;
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this._reminderListSub = this.reminderService.list$.subscribe(list => {
      this.reminderMsgIds = new Set(
        list.filter(r => !r.fired && r.messageId).map(r => r.messageId!)
      );
      this.cdr.markForCheck();
    });
  }

  confirmReminder(): void {
    this.reminderError = '';
    const target = this._parseReminderTime(this.reminderTimeString);
    if (!target) { this.reminderError = 'Enter a valid time, e.g. 3:30 PM'; return; }
    if (target.getTime() <= Date.now()) { this.reminderError = 'That time has already passed'; return; }
    const alertAt = target.getTime() - this.reminderLeadMinutes * 60_000;
    if (alertAt <= Date.now()) {
      this.reminderError = `Meeting is less than ${this.reminderLeadMinutes} min away`;
      return;
    }
    this.reminderService.add({
      messageId: this.reminderDialogMsg!.id,
      messageText: this.reminderDialogMsg!.content || '',
      channel: (this.reminderDialogMsg as any)?.channelName || 'Chat',
      targetTime: target.getTime(),
      alertAt,
      leadMinutes: this.reminderLeadMinutes,
    });
    this.reminderSaved = true;
    this.cdr.markForCheck();
    setTimeout(() => this.closeReminderDialog(), 1400);
  }

  private _parseReminderTime(raw: string): Date | null {
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
  structuredViewerOpen = false;
  structuredViewerTitle = '';
  structuredViewerHtml = '';
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
  @Input() readUsersForMessage: (msg: Message) => string[] = () => [];
  @Input() readUserCardsForMessage: (msg: Message) => HoverPersonCard[] = () => [];
  @Input() mentionCandidates: MentionCandidate[] = [];
  @Input() resolveMentionProfileCard: (payload: { userId?: number; handle?: string }) => MentionProfileCard | null = () => null;
  @Input() reactionOptions: ChatReactionOption[] = [];
  @Input() activeChannelCall: { channelId: number; jitsiRoom: string; type: 'CALL' | 'VIDEO_CALL'; callerName: string } | null = null;

  // ── Feature: Saved/bookmarked messages ──────────────
  @Input() savedMessageIds: Set<string> = new Set();
  @Output() bookmarkToggled = new EventEmitter<Message>();

  isBookmarked(msg: Message): boolean {
    return this.savedMessageIds.has(msg.id);
  }

  // ── Facebook-style reaction picker ──────────────────
  emojiPickerOpenForId: string | null = null;
  private _pickerDismissListener?: (e: MouseEvent) => void;

  readonly allReactions: ChatReactionOption[] = [
    { code: 'LIKE',      emoji: '👍', label: 'Like' },
    { code: 'LOVE',      emoji: '❤️', label: 'Love' },
    { code: 'LAUGH',     emoji: '😂', label: 'Haha' },
    { code: 'EMOJI_😮',  emoji: '😮', label: 'Wow' },
    { code: 'EMOJI_😢',  emoji: '😢', label: 'Sad' },
    { code: 'EMOJI_😡',  emoji: '😡', label: 'Angry' },
    { code: 'CELEBRATE', emoji: '🎉', label: 'Celebrate' },
    { code: 'FIRE',      emoji: '🔥', label: 'Fire' },
  ];

  reactionEmoji(code: string): string {
    if (!code) return '👍';
    if (code.startsWith('EMOJI_')) return code.slice(6);
    return this.allReactions.find(r => r.code === code)?.emoji ?? '👍';
  }

  reactionLabel(code: string): string {
    if (!code) return 'React';
    if (code.startsWith('EMOJI_')) return code.slice(6);
    return this.allReactions.find(r => r.code === code)?.label ?? 'React';
  }

  topReactionEmojis(msg: Message): string[] {
    if (!msg.reactionCounts) return [];
    return Object.entries(msg.reactionCounts)
      .filter(([, count]) => (count as number) > 0)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([code]) => this.reactionEmoji(code));
  }

  totalReactionCount(msg: Message): number {
    if (!msg.reactionCounts) return 0;
    return Object.values(msg.reactionCounts).reduce((s, c) => s + (c as number), 0);
  }

  openReactionPicker(msgId: string): void {
    if (this.emojiPickerOpenForId === msgId) return;
    this.emojiPickerOpenForId = msgId;
    this.cdr.markForCheck();
    // dismiss when clicking anywhere outside the picker
    if (this._pickerDismissListener) {
      document.removeEventListener('click', this._pickerDismissListener, true);
    }
    this._pickerDismissListener = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.fb-picker-bubble') && !target.closest('.float-action-btn')) {
        this.emojiPickerOpenForId = null;
        this.cdr.markForCheck();
        document.removeEventListener('click', this._pickerDismissListener!, true);
        this._pickerDismissListener = undefined;
      }
    };
    setTimeout(() => document.addEventListener('click', this._pickerDismissListener!, true), 0);
  }

  private _closeReactionPicker(): void {
    if (this._pickerDismissListener) {
      document.removeEventListener('click', this._pickerDismissListener, true);
      this._pickerDismissListener = undefined;
    }
    this.emojiPickerOpenForId = null;
  }

  onReactionPick(msg: Message, code: string, event: Event): void {
    event.stopPropagation();
    this._closeReactionPicker();
    this.cdr.markForCheck();
    this.likeToggled.emit({ msg, event, reactionCode: code });
  }

  // ── Outputs ─────────────────────────────────────────
  @Output() channelCallJoined = new EventEmitter<void>();
  @Output() threadOpened = new EventEmitter<{ msg: Message; event: Event }>();
  @Output() likeToggled = new EventEmitter<{ msg: Message; event: Event; reactionCode?: string }>();
  @Output() pinToggled = new EventEmitter<{ msg: Message; event: Event }>();
  @Output() editStarted = new EventEmitter<{ msg: Message; event?: Event }>();
  @Output() editCancelled = new EventEmitter<void>();
  @Output() editSaved = new EventEmitter<Message>();
  @Output() editDraftChange = new EventEmitter<string>();
  @Output() deleteRequested = new EventEmitter<{ msg: Message; event?: Event }>();
  @Output() deleteConfirmed = new EventEmitter<{ msg: Message; event?: Event }>();
  @Output() deleteDismissed = new EventEmitter<void>();
  @Output() attachmentDownload = new EventEmitter<{ attachment: any; event: Event }>();
  @Output() mentionActivated = new EventEmitter<number>();
  @Output() retryMessage = new EventEmitter<Message>();
  @Output() authorClicked = new EventEmitter<number>();
  @Output() callBackRequested = new EventEmitter<{ callType: 'CALL' | 'VIDEO_CALL' }>();
  @Output() callInviteJoined = new EventEmitter<{ meetingUrl: string; callType: 'CALL' | 'VIDEO_CALL' }>();

  activeMentionProfile: MentionProfileCard | null = null;
  mentionCardPosition: { top: number; left: number } | null = null;

  // ── Template helpers ─────────────────────────────────

  parseCallCard(content: string): { callType: string; callerName: string; jitsiRoom: string; meetingUrl: string } | null {
    try { return JSON.parse(content); } catch { return null; }
  }

  parseCallSummary(content: string): { callType: 'CALL' | 'VIDEO_CALL'; duration: number; callerName: string; callerUserId: number; targetUserId: number } | null {
    try {
      const d = JSON.parse(content);
      if (!d || typeof d !== 'object' || !d.__callSummary) return null;
      return d;
    } catch { return null; }
  }

  parseCallInvite(content: string): { __callInvite: true; callType: 'CALL' | 'VIDEO_CALL'; channelName: string; meetingUrl: string; callerName: string } | null {
    try {
      const d = JSON.parse(content);
      if (!d || typeof d !== 'object' || !d.__callInvite) return null;
      return d;
    } catch { return null; }
  }

  formatSummaryDuration(secs: number): string {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  isCallCardActive(card: { jitsiRoom: string } | null): boolean {
    return !!card && !!this.activeChannelCall && this.activeChannelCall.jitsiRoom === card.jitsiRoom;
  }

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

  private readonly EDIT_WINDOW_MS = 30 * 60 * 1000;

  isWithinEditWindow(msg: Message): boolean {
    const sent = this.parseServerDate(msg.sentAtRaw);
    if (!sent) return true; // no timestamp → assume recent, allow edit/delete
    return Date.now() - sent.getTime() < this.EDIT_WINDOW_MS;
  }

  getTopReplies(msg: Message): Message[] {
    return msg.replies.slice(0, 2);
  }

  isConsecutiveMessage(msgs: Message[], index: number): boolean {
    if (index === 0) return false;
    const prev = msgs[index - 1];
    const curr = msgs[index];
    if (prev.isSystem || curr.isSystem) return false;
    if (curr.messageType === 'CALL_CARD' || prev.messageType === 'CALL_CARD') return false;
    if (this.parseCallSummary(curr.content) || this.parseCallSummary(prev.content)) return false;
    if (this.parseCallInvite(curr.content) || this.parseCallInvite(prev.content)) return false;
    if (Number(prev.senderUserId) !== Number(curr.senderUserId)) return false;
    if (this.shouldShowDaySeparator(msgs, index)) return false;
    const prevDate = this.parseServerDate(prev.sentAtRaw);
    const currDate = this.parseServerDate(curr.sentAtRaw);
    if (!prevDate || !currDate) return false;
    return (currDate.getTime() - prevDate.getTime()) / 60000 < 5;
  }

  reactionPills(msg: Message): Array<{ code: string; emoji: string; label: string; count: number; selfReacted: boolean }> {
    if (!msg.reactionCounts) return [];
    return Object.entries(msg.reactionCounts)
      .filter(([, count]) => (count as number) > 0)
      .map(([code, count]) => ({
        code,
        emoji: this.reactionEmoji(code),
        label: this.reactionLabel(code),
        count: count as number,
        selfReacted: msg.myReactionCode === code,
      }))
      .sort((a, b) => b.count - a.count);
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

  readUsersLabel(msg: Message): string {
    const users = this.readUsersForMessage(msg);
    return users.join(', ');
  }

  readUserCards(msg: Message): HoverPersonCard[] {
    return this.readUserCardsForMessage(msg);
  }

  readReceiptLabel(msg: Message): string {
    const count = this.getReadCount(msg);
    if (count <= 0) {
      if (msg.deliveryState === 'SENDING') {
        return 'Sending...';
      }
      if (msg.deliveryState === 'FAILED') {
        return 'Failed to send';
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

  retryFailed(msg: Message, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.retryMessage.emit(msg);
  }

  onRenderedContentClick(event: Event, msg?: Message): void {
    const mention = this.findClosestAnchor(event, 'chat-mention');
    if (mention) {
      event.preventDefault();
      event.stopPropagation();
      const userId = Number(mention.dataset['userId'] || 0);
      if (userId > 0) {
        if (typeof window !== 'undefined') {
          window.location.hash = `dm-user-${userId}`;
        }
        this.mentionActivated.emit(userId);
      }
      return;
    }

    if (msg) {
      const timeToken = this._findClosestElement(event, '.msg-time-token');
      if (timeToken) {
        event.preventDefault();
        event.stopPropagation();
        this.openReminderDialog(msg, event);
        return;
      }
    }
  }

  private _findClosestElement(event: Event, selector: string): HTMLElement | null {
    const path = typeof (event as any).composedPath === 'function'
      ? ((event as any).composedPath() as EventTarget[])
      : [];
    for (const entry of path) {
      if (entry instanceof HTMLElement) {
        if (entry.matches?.(selector)) return entry;
        const found = entry.closest?.(selector);
        if (found instanceof HTMLElement) return found;
      }
    }
    const rawTarget = event.target as Node | null;
    const el = rawTarget instanceof HTMLElement
      ? rawTarget
      : (rawTarget as any)?.parentElement || null;
    return el?.closest?.(selector) as HTMLElement | null ?? null;
  }

  onRenderedContentHover(event: MouseEvent): void {
    const mention = this.findClosestAnchor(event, 'chat-mention');
    if (!mention) return;
    const userId = Number(mention.dataset['userId'] || 0);
    const handle = mention.dataset['mention'] || mention.textContent || '';
    const profile = this.resolveMentionProfileCard({ userId, handle });
    if (!profile) return;
    const rect = mention.getBoundingClientRect();
    this.activeMentionProfile = profile;
    this.mentionCardPosition = {
      top: rect.bottom + 12,
      left: Math.min(rect.left, Math.max(16, window.innerWidth - 348)),
    };
  }

  onRenderedContentLeave(event: MouseEvent): void {
    const related = event.relatedTarget as HTMLElement | null;
    if (related?.closest('.mention-profile-card')) return;
    if (related?.closest('a.chat-mention')) return;
    this.closeMentionCard();
  }

  onAuthorEnter(event: MouseEvent, msg: Message): void {
    if (!msg.senderUserId) return;
    const profile = this.resolveMentionProfileCard({ userId: msg.senderUserId });
    if (!profile) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.activeMentionProfile = profile;
    this.mentionCardPosition = {
      top: rect.bottom + 8,
      left: Math.min(rect.left, Math.max(16, window.innerWidth - 360)),
    };
  }

  onAuthorLeave(event: MouseEvent): void {
    const related = event.relatedTarget as HTMLElement | null;
    if (related?.closest('.mention-profile-card')) return;
    if (related?.closest('[data-author-card]')) return;
    this.closeMentionCard();
  }

  onAuthorClick(event: Event, msg: Message): void {
    event.stopPropagation();
    if (!msg.senderUserId) return;
    this.closeMentionCard();
    this.authorClicked.emit(msg.senderUserId);
  }

  closeMentionCard(): void {
    this.activeMentionProfile = null;
    this.mentionCardPosition = null;
  }

  isImageAttachment(attachment: Message['attachment'] | undefined): boolean {
    const type = (attachment?.type || '').toLowerCase();
    const fileRef = `${attachment?.name || ''} ${attachment?.downloadUrl || ''}`;
    return Boolean(
      type.startsWith('image/') ||
      /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?|$)/i.test(fileRef),
    );
  }

  attachmentImageSrc(attachment: Message['attachment'] | undefined): string {
    return attachment?.previewUrl || '';
  }

  isPdfAttachment(attachment: Message['attachment'] | undefined): boolean {
    const type = (attachment?.type || '').toLowerCase();
    const fileRef = `${attachment?.name || ''} ${attachment?.downloadUrl || ''}`;
    return type === 'application/pdf' || /\.pdf(\?|$)/i.test(fileRef);
  }

  isVoiceNote(attachment: Message['attachment'] | undefined): boolean {
    if (!attachment) return false;
    const type = (attachment.type || '').toLowerCase();
    const name = (attachment.name || '').toLowerCase();
    return (
      type.startsWith('audio/') ||
      /\.(mp3|wav|aac|m4a|opus|flac|ogg)(\?|$)/i.test(name) ||
      name.startsWith('voice-note-')  // covers .webm / .mp4 recorded by the composer
    );
  }

  isOfficeAttachment(attachment: Message['attachment'] | undefined): boolean {
    const fileRef = `${attachment?.name || ''} ${attachment?.downloadUrl || ''}`.toLowerCase();
    return (
      /\.docx?(\?|$)/i.test(fileRef) ||
      /\.pptx?(\?|$)/i.test(fileRef) ||
      /\.xlsx?(\?|$)/i.test(fileRef)
    );
  }

  isHtmlAttachment(attachment: Message['attachment'] | undefined): boolean {
    const fileRef = `${attachment?.name || ''} ${attachment?.downloadUrl || ''}`.toLowerCase();
    const type = (attachment?.type || '').toLowerCase();
    return /\.html?(\?|$)/i.test(fileRef) || type === 'text/html';
  }

  attachmentBadge(attachment: Message['attachment'] | undefined): string {
    const fileRef = `${attachment?.name || ''}`.toLowerCase();
    if (fileRef.endsWith('.doc') || fileRef.endsWith('.docx')) return 'DOCX';
    if (fileRef.endsWith('.ppt') || fileRef.endsWith('.pptx')) return 'PPTX';
    if (fileRef.endsWith('.xls') || fileRef.endsWith('.xlsx')) return 'XLSX';
    if (fileRef.endsWith('.pdf')) return 'PDF';
    return 'FILE';
  }

  attachmentFileIcon(attachment: Message['attachment'] | undefined): string {
    const name = (attachment?.name || '').toLowerCase();
    const type = (attachment?.type || '').toLowerCase();
    if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) return 'pi-image';
    if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pi-file-pdf';
    if (/\.(doc|docx)$/.test(name)) return 'pi-file-word';
    if (/\.(xls|xlsx|csv)$/.test(name)) return 'pi-file-excel';
    if (/\.(ppt|pptx)$/.test(name)) return 'pi-file';
    if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return 'pi-folder';
    if (/\.(mp4|mov|webm|avi)$/.test(name) || type.startsWith('video/')) return 'pi-video';
    if (/\.(mp3|wav|ogg|aac)$/.test(name) || type.startsWith('audio/')) return 'pi-volume-up';
    return 'pi-paperclip';
  }

  messageAttachments(msg: Message): NonNullable<Message['attachments']> {
    if (msg.attachments?.length) {
      return msg.attachments;
    }
    return msg.attachment ? [msg.attachment] : [];
  }

  imageAttachments(msg: Message): NonNullable<Message['attachments']> {
    return this.messageAttachments(msg).filter((attachment) =>
      this.isImageAttachment(attachment),
    );
  }

  nonImageAttachments(msg: Message): NonNullable<Message['attachments']> {
    return this.messageAttachments(msg).filter(
      (attachment) => !this.isImageAttachment(attachment),
    );
  }

  voiceNoteAttachments(msg: Message): NonNullable<Message['attachments']> {
    return this.nonImageAttachments(msg).filter(att => this.isVoiceNote(att));
  }

  previewableDocumentAttachments(msg: Message): NonNullable<Message['attachments']> {
    return this.nonImageAttachments(msg).filter((attachment) =>
      this.isPdfAttachment(attachment) || this.isOfficeAttachment(attachment),
    );
  }

  genericAttachments(msg: Message): NonNullable<Message['attachments']> {
    return this.nonImageAttachments(msg).filter(
      (attachment) =>
        !this.isPdfAttachment(attachment) &&
        !this.isOfficeAttachment(attachment) &&
        !this.isVoiceNote(attachment),
    );
  }

  // ── Float bar hover state ────────────────────────────
  hoveredMsgId: string | null = null;
  private _msgHoverTimer?: ReturnType<typeof setTimeout>;

  onMsgHover(msgId: string): void {
    clearTimeout(this._msgHoverTimer);
    this.hoveredMsgId = msgId;
  }

  onMsgHoverEnd(): void {
    this._msgHoverTimer = setTimeout(() => {
      this.hoveredMsgId = null;
      this.cdr.markForCheck();
    }, 800);
  }

  // ── Audio player state ───────────────────────────────
  private _audioStates = new Map<string, { playing: boolean; currentTime: number; duration: number }>();
  private _audioBlobUrls = new Map<string, string>();

  private _audioKey(att: any): string {
    return att?.downloadUrl || att?.previewUrl || att?.name || 'audio';
  }

  isAudioPlaying(att: any): boolean {
    return this._audioStates.get(this._audioKey(att))?.playing ?? false;
  }

  getAudioCurrentTime(att: any): number {
    return this._audioStates.get(this._audioKey(att))?.currentTime ?? 0;
  }

  getAudioDuration(att: any): number {
    return this._audioStates.get(this._audioKey(att))?.duration ?? 0;
  }

  getAudioProgress(att: any): number {
    const d = this.getAudioDuration(att);
    return d ? (this.getAudioCurrentTime(att) / d) * 100 : 0;
  }

  formatAudioTime(secs: number): string {
    if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  private async _fetchBlobUrl(url: string): Promise<string> {
    const blob = await firstValueFrom(this.collabService.fetchChatAttachmentBlob(url));
    return URL.createObjectURL(blob);
  }

  private _loadAudioWithDuration(audioEl: HTMLAudioElement, blobUrl: string): Promise<number> {
    audioEl.src = blobUrl;
    audioEl.load();
    return new Promise<number>(resolve => {
      const onMeta = async () => {
        if (!isFinite(audioEl.duration)) {
          // Chrome MediaRecorder WebM files omit the duration header.
          // Seeking to a huge timestamp forces the browser to scan the full file and compute the real duration.
          audioEl.currentTime = 1e101;
          await new Promise<void>(r => {
            audioEl.addEventListener('seeked', () => r(), { once: true });
            setTimeout(r, 2000);
          });
          audioEl.currentTime = 0;
        }
        resolve(isFinite(audioEl.duration) ? audioEl.duration : 0);
      };
      audioEl.addEventListener('loadedmetadata', () => onMeta(), { once: true });
      audioEl.addEventListener('error', () => resolve(0), { once: true });
    });
  }

  async toggleAudio(audioEl: HTMLAudioElement, att: any): Promise<void> {
    const key = this._audioKey(att);
    const state = this._audioStates.get(key) ?? { playing: false, currentTime: 0, duration: 0 };
    if (state.playing) {
      audioEl.pause();
      this._audioStates.set(key, { ...state, playing: false });
      this.cdr.markForCheck();
      return;
    }

    if (!this._audioBlobUrls.has(key)) {
      const rawUrl = att?.downloadUrl || att?.previewUrl;
      if (!rawUrl) return;
      try {
        const blobUrl = await this._fetchBlobUrl(rawUrl);
        this._audioBlobUrls.set(key, blobUrl);
        const dur = await this._loadAudioWithDuration(audioEl, blobUrl);
        this._audioStates.set(key, { ...state, duration: dur });
      } catch {
        return;
      }
    } else {
      const blobUrl = this._audioBlobUrls.get(key)!;
      if (audioEl.src !== blobUrl) {
        await this._loadAudioWithDuration(audioEl, blobUrl);
      }
    }

    try {
      await audioEl.play();
      const updated = this._audioStates.get(key) ?? { playing: false, currentTime: 0, duration: 0 };
      this._audioStates.set(key, { ...updated, playing: true });
    } catch { /* autoplay policy blocked */ }
    this.cdr.markForCheck();
  }

  onAudioMeta(event: Event, att: any): void {
    const el = event.target as HTMLAudioElement;
    const key = this._audioKey(att);
    const state = this._audioStates.get(key) ?? { playing: false, currentTime: 0, duration: 0 };
    this._audioStates.set(key, { ...state, duration: isFinite(el.duration) ? el.duration : 0 });
    this.cdr.markForCheck();
  }

  onAudioTimeUpdate(event: Event, att: any): void {
    const el = event.target as HTMLAudioElement;
    const key = this._audioKey(att);
    const state = this._audioStates.get(key) ?? { playing: true, currentTime: 0, duration: 0 };
    this._audioStates.set(key, { ...state, currentTime: el.currentTime });
    this.cdr.markForCheck();
  }

  onAudioEnded(att: any): void {
    const key = this._audioKey(att);
    const state = this._audioStates.get(key) ?? { playing: false, currentTime: 0, duration: 0 };
    this._audioStates.set(key, { ...state, playing: false, currentTime: 0 });
    this.cdr.markForCheck();
  }

  seekAudio(audioEl: HTMLAudioElement, event: Event, att: any): void {
    const val = Number((event.target as HTMLInputElement).value);
    audioEl.currentTime = val;
    const key = this._audioKey(att);
    const state = this._audioStates.get(key) ?? { playing: false, currentTime: 0, duration: 0 };
    this._audioStates.set(key, { ...state, currentTime: val });
    this.cdr.markForCheck();
  }

  async downloadAttachment(att: any, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const url = att?.downloadUrl || att?.previewUrl;
    if (!url) return;
    try {
      const blobUrl = await this._fetchBlobUrl(url);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = att?.name || 'attachment';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } catch { /* ignore */ }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['messages']) {
      this._preloadVoiceNoteDurations();
    }
  }

  private async _preloadVoiceNoteDurations(): Promise<void> {
    for (const msg of this.messages) {
      for (const att of this.voiceNoteAttachments(msg)) {
        const key = this._audioKey(att);
        if (this._audioBlobUrls.has(key)) continue;
        const url = att?.downloadUrl || att?.previewUrl;
        if (!url) continue;
        try {
          const blobUrl = await this._fetchBlobUrl(url);
          this._audioBlobUrls.set(key, blobUrl);
          const tempAudio = new Audio();
          const dur = await this._loadAudioWithDuration(tempAudio, blobUrl);
          const existing = this._audioStates.get(key) ?? { playing: false, currentTime: 0, duration: 0 };
          this._audioStates.set(key, { ...existing, duration: dur });
          this.cdr.markForCheck();
        } catch { /* ignore */ }
      }
    }
  }

  ngOnDestroy(): void {
    this._audioBlobUrls.forEach(url => URL.revokeObjectURL(url));
    this._audioBlobUrls.clear();
    clearTimeout(this._msgHoverTimer);
    this._closeReactionPicker();
    this._revokeViewerBlob();
    this._reminderListSub?.unsubscribe();
  }

  chatMediaGridClass(imageCount: number): string {
    if (imageCount <= 1) return 'single';
    if (imageCount === 2) return 'duo';
    if (imageCount === 3) return 'trio';
    return 'quad';
  }

  openImageViewer(msg: Message, event?: Event): void {
    event?.stopPropagation();
    const items = this.messageImageItems(msg);
    if (!items.length) return;
    this.imageViewerItems = items;
    this.imageViewerIndex = 0;
    this.imageViewerOpen = true;
  }

  closeImageViewer(): void {
    this.imageViewerOpen = false;
    this.imageViewerItems = [];
    this.imageViewerIndex = 0;
  }

  openStructuredViewer(msg: Message, event?: Event): void {
    event?.stopPropagation();
    this.structuredViewerTitle = this.structuredMessageLabel(msg);
    this.structuredViewerHtml = this.structuredMessageHtml(msg);
    this.structuredViewerOpen = true;
  }

  closeStructuredViewer(): void {
    this.structuredViewerOpen = false;
    this.structuredViewerTitle = '';
    this.structuredViewerHtml = '';
  }

  previousImage(): void {
    if (!this.imageViewerItems.length) return;
    this.imageViewerIndex =
      (this.imageViewerIndex - 1 + this.imageViewerItems.length) %
      this.imageViewerItems.length;
  }

  nextImage(): void {
    if (!this.imageViewerItems.length) return;
    this.imageViewerIndex =
      (this.imageViewerIndex + 1) % this.imageViewerItems.length;
  }

  currentViewerImage(): { url: string; label: string } | null {
    return this.imageViewerItems[this.imageViewerIndex] || null;
  }

  async openDocumentViewer(attachment: Message['attachment'] | undefined, event?: Event): Promise<void> {
    event?.stopPropagation();
    const rawUrl = attachment?.previewUrl || attachment?.downloadUrl;
    if (!rawUrl) return;
    this.documentViewerTitle = attachment!.name || 'Document preview';
    this.documentViewerRawUrl = rawUrl;

    if (this.isPdfAttachment(attachment)) {
      this.documentViewerType = 'pdf';
      this.documentViewerOpen = true;
      this.officePreviewLoading = true;
      this.officePreviewError = '';
      this.documentViewerUrl = '';
      this.cdr.markForCheck();
      try {
        let blobUrl: string;
        if (rawUrl.startsWith('blob:')) {
          // Already a pre-fetched blob URL — use directly, no HTTP request needed
          blobUrl = rawUrl;
        } else {
          blobUrl = await this._fetchBlobUrl(rawUrl);
          this._revokeViewerBlob();
          this._viewerBlobUrl = blobUrl;
        }
        this.documentViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
      } catch {
        // Fallback to original server URL
        this.documentViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          attachment!.downloadUrl || rawUrl
        );
      } finally {
        this.officePreviewLoading = false;
        this.cdr.markForCheck();
      }
      return;
    }

    if (this.isOfficeAttachment(attachment)) {
      this.documentViewerType = 'office';
      this.documentViewerOpen = true;
      this.officePreviewLoading = true;
      this.officePreviewHtml = this.sanitizer.bypassSecurityTrustHtml('');
      this.officePreviewError = '';
      this.officeSheetNames = [];
      this.officeActiveSheet = 0;
      this._officeWorkbook = null;
      this.cdr.markForCheck();

      const nameRef = `${attachment!.name || rawUrl}`.toLowerCase();
      const isDocx = /\.docx?(\?|$)/.test(nameRef);
      const isXlsx = /\.xlsx?(\?|$)/.test(nameRef);
      // Use original server URL for external viewers — blob: URLs are browser-local
      const serverUrl = attachment!.downloadUrl || rawUrl;

      // PPTX (and any unrecognised type): skip client-side conversion — go straight to Office Online Viewer
      if (!isDocx && !isXlsx) {
        this._openWithOfficeOnlineViewer(serverUrl);
        return;
      }

      try {
        // If parent pre-fetched a blob URL, read from it directly; otherwise fetch via API
        const blob = rawUrl.startsWith('blob:')
          ? await fetch(rawUrl).then(r => r.blob())
          : await firstValueFrom(this.collabService.fetchChatAttachmentBlob(rawUrl));
        const arrayBuffer = await blob.arrayBuffer();

        if (isDocx) {
          const mammoth = await import('mammoth');
          const fn = (mammoth as any).convertToHtml ?? (mammoth as any).default?.convertToHtml;
          const result = await fn({ arrayBuffer });
          this.officePreviewHtml = this.sanitizer.bypassSecurityTrustHtml(result.value || '');
        } else if (isXlsx) {
          const XLSX = await import('xlsx');
          const XLSXmod = (XLSX as any).default ?? XLSX;
          const workbook = XLSXmod.read(new Uint8Array(arrayBuffer), { type: 'array' });
          this._officeWorkbook = workbook;
          this.officeSheetNames = workbook.SheetNames as string[];
          this.officePreviewHtml = this.sanitizer.bypassSecurityTrustHtml(
            this._xlsxSheetToHtml(XLSXmod, workbook, 0)
          );
        }
      } catch {
        // Blob conversion failed — fall back to Office Online Viewer with original server URL
        this._openWithOfficeOnlineViewer(serverUrl);
      } finally {
        this.officePreviewLoading = false;
        this.cdr.markForCheck();
      }
      return;
    }

    if (this.isHtmlAttachment(attachment)) {
      this.documentViewerType = 'pdf';
      this.documentViewerOpen = true;
      this.officePreviewLoading = true;
      this.officePreviewError = '';
      this.documentViewerUrl = '';
      this.cdr.markForCheck();
      try {
        let blobUrl: string;
        if (rawUrl.startsWith('blob:')) {
          blobUrl = rawUrl;
        } else {
          blobUrl = await this._fetchBlobUrl(rawUrl);
          this._revokeViewerBlob();
          this._viewerBlobUrl = blobUrl;
        }
        this.documentViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
      } catch {
        this.documentViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          attachment!.downloadUrl || rawUrl
        );
      } finally {
        this.officePreviewLoading = false;
        this.cdr.markForCheck();
      }
      return;
    }

    this.documentViewerType = 'file';
    this.documentViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
    this.documentViewerOpen = true;
  }

  async switchOfficeSheet(index: number): Promise<void> {
    if (!this._officeWorkbook || index === this.officeActiveSheet) return;
    this.officeActiveSheet = index;
    const XLSX = await import('xlsx');
    const XLSXmod = (XLSX as any).default ?? XLSX;
    this.officePreviewHtml = this.sanitizer.bypassSecurityTrustHtml(
      this._xlsxSheetToHtml(XLSXmod, this._officeWorkbook, index)
    );
    this.cdr.markForCheck();
  }

  private _xlsxSheetToHtml(XLSX: any, workbook: any, sheetIndex: number): string {
    const sheetName = workbook.SheetNames[sheetIndex];
    if (!sheetName) return '';
    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_html(sheet);
    const match = raw.match(/<table[\s\S]*?<\/table>/i);
    return match ? match[0] : raw;
  }

  documentViewerRawUrl = '';
  private _viewerBlobUrl: string | null = null;
  officePreviewLoading = false;
  officePreviewHtml: SafeHtml = '';
  officePreviewError = '';
  officeSheetNames: string[] = [];
  officeActiveSheet = 0;
  private _officeWorkbook: any = null;

  private _revokeViewerBlob(): void {
    if (this._viewerBlobUrl) {
      URL.revokeObjectURL(this._viewerBlobUrl);
      this._viewerBlobUrl = null;
    }
  }

  private _openWithOfficeOnlineViewer(rawUrl: string): void {
    const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(rawUrl)}`;
    this._revokeViewerBlob();
    this.documentViewerType = 'pdf';
    this.documentViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
    this.officePreviewLoading = false;
    this.officePreviewError = '';
    this.cdr.markForCheck();
  }

  async downloadViewerFile(event: Event): Promise<void> {
    await this.downloadAttachment(
      { downloadUrl: this.documentViewerRawUrl, name: this.documentViewerTitle },
      event,
    );
  }

  closeDocumentViewer(): void {
    this.documentViewerOpen = false;
    this.documentViewerTitle = '';
    this.documentViewerUrl = '';
    this.documentViewerRawUrl = '';
    this.documentViewerType = 'file';
    this.officePreviewLoading = false;
    this.officePreviewHtml = this.sanitizer.bypassSecurityTrustHtml('');
    this.officePreviewError = '';
    this.officeSheetNames = [];
    this.officeActiveSheet = 0;
    this._officeWorkbook = null;
    this._revokeViewerBlob();
  }

  messageImageItems(msg: Message): Array<{ url: string; label: string }> {
    return this.imageAttachments(msg)
      .map((attachment) => ({
        url: this.attachmentImageSrc(attachment),
        label: attachment.name || 'Image attachment',
      }))
      .filter((item) => !!item.url);
  }

  threadSourceLabel(msg: Message): string {
    return msg.sourceType === 'dm' ? 'Direct message' : 'Channel thread';
  }

  threadReplyCountLabel(msg: Message): string {
    const count = Number(msg.threadReplyCount || this.countReplies(msg.replies || []));
    return count === 1 ? '1 reply' : `${count} replies`;
  }

  totalReplyCount(msg: Message): number {
    return Number(msg.threadReplyCount || this.countReplies(msg.replies || []));
  }

  private countReplies(replies: Message[]): number {
    return (replies || []).reduce(
      (total, reply) => total + 1 + this.countReplies(reply.replies || []),
      0,
    );
  }

  threadPreviewReplies(msg: Message): Message[] {
    return (msg.replies || []).slice(0, 2);
  }

  isIssueCard(msg: Message): boolean {
    if (msg.messageType === 'ISSUE_CARD') return true;
    // Fallback: detect by content shape when messageType is absent or TEXT
    if (msg.messageType && msg.messageType !== 'TEXT') return false;
    try {
      const p = JSON.parse(msg.content || '');
      return (
        typeof p?.id === 'number' &&
        typeof p?.title === 'string' &&
        typeof p?.module === 'string' &&
        typeof p?.priority === 'string' &&
        typeof p?.status === 'string'
      );
    } catch { return false; }
  }

  parseIssueCard(msg: Message): { id: number; title: string; module: string; priority: string; status: string; description: string; reporterName: string; createdAt?: string; resolutionHours?: number } | null {
    try {
      return JSON.parse(msg.content);
    } catch {
      return null;
    }
  }

  formatResolution(hours?: number): string {
    if (hours == null) return '';
    if (hours < 1)   return '< 1h';
    if (hours < 24)  return `${hours}h`;
    const days = Math.floor(hours / 24);
    const rem  = hours % 24;
    return rem ? `${days}d ${rem}h` : `${days}d`;
  }

  issueCardPriorityClass(priority: string): string {
    const p = (priority || '').toUpperCase();
    if (p === 'CRITICAL') return 'issue-priority-critical';
    if (p === 'HIGH') return 'issue-priority-high';
    if (p === 'MEDIUM') return 'issue-priority-medium';
    return 'issue-priority-low';
  }

  issueCardStatusClass(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'OPEN') return 'issue-status-open';
    if (s === 'IN_PROGRESS') return 'issue-status-progress';
    if (s === 'BLOCKED') return 'issue-status-blocked';
    if (s === 'TESTING') return 'issue-status-testing';
    if (s === 'DONE') return 'issue-status-done';
    return 'issue-status-default';
  }

  navigateToIssue(issueId: number): void {
    const uuid = crypto.randomUUID();
    this.router.navigate(['/admin/settings/bug-tracker', uuid], { queryParams: { issue: issueId } });
  }

  isStructuredMessage(msg: Message): boolean {
    if (this.isIssueCard(msg)) return false;
    return this.structuredMessageKind(msg) !== 'plain';
  }

  structuredMessageKind(msg: Message): 'plain' | 'json' | 'html' | 'code' {
    const content = this.normalizedMessageContent(msg);
    if (!content) return 'plain';
    if (this.codeFenceMatch(content)) return 'code';
    if (this.looksLikeJson(content)) return 'json';
    if (this.looksLikeHtml(content)) return 'html';
    if (this.looksLikeCode(content)) return 'code';
    return 'plain';
  }

  structuredMessageLabel(msg: Message): string {
    const kind = this.structuredMessageKind(msg);
    if (kind === 'json') return 'JSON';
    if (kind === 'html') return 'HTML';
    if (kind === 'code') return this.codeFenceLanguage(this.normalizedMessageContent(msg)) || 'CODE';
    return 'TEXT';
  }

  structuredMessageDisplay(msg: Message): string {
    const content = this.normalizedMessageContent(msg);
    const kind = this.structuredMessageKind(msg);
    if (kind === 'json') {
      try {
        return JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        return content;
      }
    }
    if (kind === 'code') {
      const fence = this.codeFenceMatch(content);
      return (fence?.[2] || content).trim();
    }
    return content;
  }

  structuredMessageHtml(msg: Message): string {
    const kind = this.structuredMessageKind(msg);
    return this.structuredMessageDisplay(msg)
      .split('\n')
      .map((line, index) => {
        const safeLine = this.linkifyHtmlText(
          this.highlightStructuredLine(line || ' ', kind),
          'chat-link',
        );
        return `<span class="message-output-line"><em class="message-output-line-number">${index + 1}</em><span class="message-output-line-value">${safeLine}</span></span>`;
      })
      .join('');
  }

  copyMessageContent(msg: Message, event?: Event): void {
    event?.stopPropagation();
    const value = this.structuredMessageDisplay(msg) || msg.content || '';
    if (!value) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(value);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  downloadMessageContent(msg: Message, event?: Event): void {
    event?.stopPropagation();
    const value = this.structuredMessageDisplay(msg) || msg.content || '';
    if (!value) return;
    const extension = this.structuredMessageExtension(msg);
    const blob = new Blob([value], { type: this.structuredMessageMime(msg) });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `message-${msg.id}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  messageHtml(content: string): string {
    const decoded = this.decodeHtmlEntities(content || '');
    const cleaned = this.cleanStructuredPasteArtifacts(decoded);
    if (this.looksLikeJson(cleaned)) {
      return JSON.stringify(JSON.parse(cleaned), null, 2)
        .split('\n')
        .map((line) => this.highlightStructuredLine(line || ' ', 'json'))
        .join('<br>');
    }
    const escaped = this.escapeHtml(cleaned);

    // Resolve [text](url) markdown links before URL regex so URLs inside them
    // are not double-linkified. Use placeholder swap to keep the pipeline safe.
    const mdPlaceholders: string[] = [];
    const mdLinkRe = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
    const withMdLinks = escaped.replace(mdLinkRe, (_match, linkText, linkUrl) => {
      const safeHref = linkUrl.replace(/"/g, '%22');
      const anchor = `<a href="${safeHref}" class="chat-link chat-share-link">${linkText}</a>`;
      mdPlaceholders.push(anchor);
      return `\x00MD${mdPlaceholders.length - 1}\x00`;
    });

    const withUrls = withMdLinks.replace(this.urlRegex, (rawUrl) => {
      const normalized = this.normalizePreviewUrl(rawUrl);
      const safeLabel = this.escapeHtml(rawUrl);
      return `<a href="${normalized}" target="_blank" rel="noopener noreferrer" class="chat-link">${safeLabel}</a>`;
    });

    const restored = withUrls.replace(/\x00MD(\d+)\x00/g, (_, idx) => mdPlaceholders[Number(idx)] ?? '');

    return this._wrapTimesInHtml(this.mentionifyHtml(restored.replace(/\n/g, '<br>')));
  }

  private _wrapTimesInHtml(html: string): string {
    // Wrap explicit am/pm time tokens in text nodes so they become clickable.
    // The (<[^>]*>) branch preserves tags untouched; ([^<]+) processes text content.
    return html.replace(/(<[^>]*>)|([^<]+)/g, (_, tag, text) => {
      if (tag) return tag;
      if (!text) return '';
      return text.replace(
        /\b(\d{1,2}(?:[:.]\d{2})?)\s*(am|pm)\b/gi,
        (t: string) => `<span class="msg-time-token" title="Click to set a reminder">${t}</span>`
      );
    });
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

  private mentionifyHtml(value: string): string {
    let result = value;
    for (const candidate of this.mentionCandidates) {
      const label = (candidate.label || '').trim();
      if (!label) continue;
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^\\w>])@${escapedLabel}${this.mentionBoundaryAfterRegex}`, 'gi');
      result = result.replace(regex, (_full, prefix) => {
        const mentionText = `@${label}`;
        return `${prefix || ''}<a href="#dm-user-${candidate.userId}" class="chat-mention" data-user-id="${candidate.userId}" data-mention="${this.escapeHtml(mentionText)}">${this.escapeHtml(mentionText)}</a>`;
      });
    }
    return result;
  }

  private findClosestAnchor(event: Event, className: string): HTMLAnchorElement | null {
    const path = typeof (event as any).composedPath === 'function'
      ? ((event as any).composedPath() as EventTarget[])
      : [];
    for (const entry of path) {
      if (entry instanceof HTMLElement) {
        const direct = entry.matches?.(`a.${className}`) ? entry : entry.closest?.(`a.${className}`);
        if (direct instanceof HTMLAnchorElement) {
          return direct;
        }
      }
    }
    const rawTarget = event.target as Node | null;
    const elementTarget =
      rawTarget instanceof HTMLElement
        ? rawTarget
        : (rawTarget as any)?.parentElement || null;
    const fallback = elementTarget?.closest?.(`a.${className}`) as HTMLAnchorElement | null;
    return fallback || null;
  }

  private normalizedMessageContent(msg: Message): string {
    return this.cleanStructuredPasteArtifacts(
      this.decodeHtmlEntities(msg.content || '').trim(),
    );
  }

  private decodeHtmlEntities(value: string): string {
    if (!value || typeof document === 'undefined') return value || '';
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
  }

  private cleanStructuredPasteArtifacts(value: string): string {
    let cleaned = value || '';
    // Fix mangled protocol strings from syntax-highlighted URLs
    cleaned = cleaned.replace(/https:\s*class=["'][\w\s-]*["']\s*>\s*\/\//gi, 'https://');
    cleaned = cleaned.replace(/http:\s*class=["'][\w\s-]*["']\s*>\s*\/\//gi, 'http://');
    cleaned = cleaned.replace(/https:\s*&quot;?\s*class=&quot;[\w\s-]*&quot;>\s*\/\//gi, 'https://');
    cleaned = cleaned.replace(/http:\s*&quot;?\s*class=&quot;[\w\s-]*&quot;>\s*\/\//gi, 'http://');
    // Strip all HTML opening tags (span, code, pre, etc.) \u2014 covers PrismJS, highlight.js, CodeMirror
    cleaned = cleaned.replace(/<\/?[a-z][a-z0-9]*(\s[^>]*)?\/?>/gi, '');
    // Strip leftover class="token..." or class='hljs-...' fragments that appear as raw text
    cleaned = cleaned.replace(/class=["'][\w\s-]*["']\s*>/gi, '');
    // Strip encoded variants (&lt;span ...&gt;)
    cleaned = cleaned.replace(/&lt;\/?[a-z][a-z0-9]*(\s[^;]*)?&gt;/gi, '');
    cleaned = cleaned.replace(/&lt;\/span&gt;/gi, '');
    // Normalize non-breaking spaces and trailing whitespace
    cleaned = cleaned.replace(/\u00a0/g, ' ');
    cleaned = cleaned.replace(/[ \t]+\n/g, '\n');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    return cleaned.trim();
  }

  private highlightStructuredLine(
    line: string,
    kind: 'plain' | 'json' | 'html' | 'code',
  ): string {
    if (kind === 'json') return this.highlightJsonLine(line);
    if (kind === 'html') return this.highlightHtmlLine(line);
    if (kind === 'code') return this.highlightCodeLine(line);
    return this.escapeHtml(line);
  }

  private highlightJsonLine(line: string): string {
    let html = this.escapeHtml(line);
    html = html.replace(
      /(&quot;[^&]*?&quot;)(\s*:)/g,
      '<span class="token token-key">$1</span><span class="token token-punctuation">$2</span>',
    );
    html = html.replace(
      /(:\s*)(&quot;[^&]*?&quot;)/g,
      '$1<span class="token token-string">$2</span>',
    );
    html = html.replace(
      /\b(true|false|null)\b/g,
      '<span class="token token-boolean">$1</span>',
    );
    html = html.replace(
      /(^|[\s:[,])(-?\d+(?:\.\d+)?)(?=[\s,\]}]|$)/g,
      '$1<span class="token token-number">$2</span>',
    );
    html = html.replace(/([{}\[\],])/g, '<span class="token token-punctuation">$1</span>');
    return html;
  }

  private highlightHtmlLine(line: string): string {
    let html = this.escapeHtml(line);
    html = html.replace(
      /(&lt;\/?)([a-zA-Z0-9-:]+)/g,
      '$1<span class="token token-tag">$2</span>',
    );
    html = html.replace(
      /([a-zA-Z-:]+)=(&quot;.*?&quot;)/g,
      '<span class="token token-attr-name">$1</span>=<span class="token token-string">$2</span>',
    );
    html = html.replace(/(&lt;|&gt;|\/&gt;)/g, '<span class="token token-punctuation">$1</span>');
    return html;
  }

  private highlightCodeLine(line: string): string {
    let html = this.escapeHtml(line);
    html = html.replace(
      /(\/\/.*$)/g,
      '<span class="token token-comment">$1</span>',
    );
    html = html.replace(
      /(&quot;.*?&quot;|&#39;.*?&#39;|`.*?`)/g,
      '<span class="token token-string">$1</span>',
    );
    html = html.replace(
      /\b(const|let|var|function|class|interface|type|return|import|export|public|private|protected|if|else|for|while|switch|case|try|catch|async|await|new)\b/g,
      '<span class="token token-keyword">$1</span>',
    );
    html = html.replace(
      /\b(\d+(?:\.\d+)?)\b/g,
      '<span class="token token-number">$1</span>',
    );
    return html;
  }

  private linkifyHtmlText(html: string, className: string): string {
    if (!html || typeof document === 'undefined') {
      return html;
    }
    const root = document.createElement('div');
    root.innerHTML = html;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      if (current.parentElement?.tagName !== 'A') {
        textNodes.push(current as Text);
      }
      current = walker.nextNode();
    }
    for (const node of textNodes) {
      const text = node.textContent || '';
      if (!this.urlRegex.test(text)) continue;
      this.urlRegex.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      text.replace(this.urlRegex, (rawUrl, _g1, _g2, offset: number) => {
        if (offset > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
        }
        const anchor = document.createElement('a');
        anchor.href = this.normalizePreviewUrl(rawUrl);
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.className = className;
        anchor.textContent = rawUrl;
        fragment.appendChild(anchor);
        lastIndex = offset + rawUrl.length;
        return rawUrl;
      });
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      node.parentNode?.replaceChild(fragment, node);
      this.urlRegex.lastIndex = 0;
    }
    return root.innerHTML;
  }

  private codeFenceMatch(content: string): RegExpMatchArray | null {
    return content.match(/^```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```$/);
  }

  private codeFenceLanguage(content: string): string | null {
    const language = this.codeFenceMatch(content)?.[1]?.trim();
    return language ? language.toUpperCase() : null;
  }

  private looksLikeJson(content: string): boolean {
    if (!/^[\[{]/.test(content)) return false;
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  private looksLikeHtml(content: string): boolean {
    if (/(?:^|\s)class="token[^"]*">/i.test(content)) {
      return false;
    }
    if (!/^\s*<\/?[a-z][\s\S]*>\s*$/i.test(content)) {
      return false;
    }
    return /<\/[a-z][^>]*>/i.test(content) || /\/>\s*$/i.test(content);
  }

  private looksLikeCode(content: string): boolean {
    const lines = content.split('\n');
    const keywordMatches =
      content.match(
        /\b(const|let|var|function|class|interface|type|return|import|export|public|private|protected|if|else|for|while|switch|case|try|catch|async|await|new)\b/g,
      ) || [];
    return (
      lines.length > 1 && (
        keywordMatches.length >= 2 ||
        (keywordMatches.length >= 1 &&
          /[{}();=<>\[\]]/.test(content) &&
          /(?:^|\n)\s{2,}\S/.test(content))
      )
    );
  }

  private structuredMessageExtension(msg: Message): string {
    const kind = this.structuredMessageKind(msg);
    if (kind === 'json') return 'json';
    if (kind === 'html') return 'html';
    if (kind === 'code') return 'txt';
    return 'txt';
  }

  private structuredMessageMime(msg: Message): string {
    const kind = this.structuredMessageKind(msg);
    if (kind === 'json') return 'application/json';
    if (kind === 'html') return 'text/html';
    return 'text/plain;charset=utf-8';
  }
}

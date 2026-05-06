import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Message } from '../communication.component';
import { CollabMember, EmployeeProfile } from '../../ui/services/collaboration.service';

export type RightPanelMode = 'pinned' | 'thread' | 'details' | null;

export interface ChannelDetailsInput {
  id: string;
  backendId: number;
  name: string;
  description?: string;
  channelType?: 'PUBLIC' | 'PRIVATE';
  createdBy?: number;
}

@Component({
  selector: 'app-thread-panel',
  templateUrl: './thread-panel.component.html',
  styleUrls: ['./thread-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreadPanelComponent {
  private readonly urlRegex = /((https?:\/\/|www\.)[^\s<]+)/gi;
  // ── Inputs ──────────────────────────────────────────
  @Input() mode: RightPanelMode = null;
  @Input() activeThread: Message | null = null;
  @Input() activeThreadReplyToId: string | null = null;
  @Input() activeThreadReplyTarget: Message | null = null;
  @Input() threadReplyDraft = '';
  @Input() threadPendingAttachments: Array<{
    name: string;
    size: string;
    type: string;
    previewUrl?: string;
  }> = [];
  @Input() sendingReply = false;
  @Input() pinnedMessages: Message[] = [];
  @Input() activeChannel: ChannelDetailsInput | null = null;
  @Input() channelMembers: CollabMember[] = [];
  @Input() bannedChannelMembers: CollabMember[] = [];
  @Input() channelMembersLoading = false;
  @Input() canManageChannels = false;
  @Input() nonMembers: EmployeeProfile[] = [];
  @Input() myUserId = 0;
  @Input() memberMenuOpen = false;
  @Input() memberMenuUserId = 0;

  // ── Reply edit/delete state (passed from parent) ────
  @Input() editingReplyId: string | null = null;
  @Input() editReplyDraft = '';
  @Input() confirmDeleteReplyId: string | null = null;

  // Avatar helpers
  @Input() getMemberAvatarUrl!: (userId: number) => string | undefined;
  @Input() getMemberName!: (userId: number) => string;
  @Input() colorFor!: (seed: number) => string;
  @Input() isUserOnline!: (userId: number) => boolean;
  @Input() getEmpName!: (e: EmployeeProfile) => string;
  @Input() getEmpInitials!: (e: EmployeeProfile) => string;
  @Input() getEmpAvatarColor!: (e: EmployeeProfile) => string;
  @Input() getEmpImageUrl!: (e: EmployeeProfile) => string | undefined;

  // ── Outputs ─────────────────────────────────────────
  // Thread navigation
  @Output() threadClosed = new EventEmitter<void>();
  @Output() threadReplyDraftChange = new EventEmitter<string>();
  @Output() replyTargetSet = new EventEmitter<{ reply: Message; event?: Event }>();
  @Output() replyTargetCleared = new EventEmitter<void>();
  @Output() replySent = new EventEmitter<void>();
  @Output() threadFilesSelected = new EventEmitter<File[]>();
  @Output() threadAttachmentRemoved = new EventEmitter<number>();

  // Reply edit
  @Output() replyEditStarted = new EventEmitter<{ reply: Message; event?: Event }>();
  @Output() replyEditCancelled = new EventEmitter<void>();
  @Output() replyEditSaved = new EventEmitter<{ reply: Message; rootId: string }>();
  @Output() editReplyDraftChange = new EventEmitter<string>();

  // Reply delete
  @Output() replyDeleteRequested = new EventEmitter<{ reply: Message; event?: Event }>();
  @Output() replyDeleteConfirmed = new EventEmitter<{ reply: Message; rootMsg: Message; event?: Event }>();
  @Output() replyDeleteDismissed = new EventEmitter<void>();

  // Reply like
  @Output() replyLikeToggled = new EventEmitter<{ msg: Message; event?: Event }>();

  // Pinned
  @Output() pinnedPanelClosed = new EventEmitter<void>();
  @Output() pinnedJumpTo = new EventEmitter<Message>();
  @Output() pinnedUnpin = new EventEmitter<{ msg: Message; event: Event }>();
  @Output() pinnedOpenThread = new EventEmitter<{ msg: Message; event: Event }>();

  // Channel details
  @Output() detailsClosed = new EventEmitter<void>();
  @Output() editChannelClicked = new EventEmitter<Event>();
  @Output() memberMenuOpened = new EventEmitter<{ member: CollabMember; event: Event }>();
  @Output() memberMenuClosed = new EventEmitter<void>();
  @Output() makeOwner = new EventEmitter<number>();
  @Output() removeMember = new EventEmitter<CollabMember>();
  @Output() banMember = new EventEmitter<CollabMember>();
  @Output() unbanMember = new EventEmitter<CollabMember>();
  @Output() addMember = new EventEmitter<number>();
  @Output() leaveChannel = new EventEmitter<void>();
  @Output() deleteChannel = new EventEmitter<void>();

  // ── Helpers ──────────────────────────────────────────

  isChannelOwner(): boolean {
    return this.activeChannel?.createdBy === this.myUserId;
  }

  canAdministerChannel(): boolean {
    return this.canManageChannels || this.isChannelOwner();
  }

  isOwnReply(reply: Message): boolean {
    return Number(reply.senderUserId) === Number(this.myUserId);
  }

  onThreadKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.replySent.emit();
    }
  }

  trackById(_: number, m: { id: string }): string {
    return m.id;
  }

  messageAttachments(msg: Message): NonNullable<Message['attachments']> {
    if (msg.attachments?.length) return msg.attachments;
    return msg.attachment ? [msg.attachment] : [];
  }

  imageAttachments(msg: Message): NonNullable<Message['attachments']> {
    return this.messageAttachments(msg).filter((attachment) => this.isImageAttachment(attachment));
  }

  documentAttachments(msg: Message): NonNullable<Message['attachments']> {
    return this.messageAttachments(msg).filter(
      (attachment) => !this.isImageAttachment(attachment),
    );
  }

  isImageAttachment(attachment: Message['attachment'] | undefined): boolean {
    const type = (attachment?.type || '').toLowerCase();
    const fileRef = `${attachment?.name || ''} ${attachment?.downloadUrl || ''}`;
    return Boolean(
      type.startsWith('image/') ||
      /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?|$)/i.test(fileRef),
    );
  }

  onThreadFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    this.threadFilesSelected.emit(files);
    input.value = '';
  }

  onRenderedContentClick(event: Event): void {
    const rawTarget = event.target as Node | null;
    const elementTarget =
      rawTarget instanceof HTMLElement
        ? rawTarget
        : (rawTarget as any)?.parentElement || null;
    const anchor = elementTarget?.closest?.('a.thread-link') as HTMLAnchorElement | null;
    if (!anchor) return;
    event.preventDefault();
    event.stopPropagation();
    const href = anchor.getAttribute('href');
    if (!href) return;
    window.open(href, '_blank', 'noopener,noreferrer');
  }

  messageHtml(content: string): string {
    const decoded = this.decodeHtmlEntities(content || '');
    if (typeof document === 'undefined') {
      return this.linkifyPlainText(decoded);
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = decoded;
    const hasMarkup = wrapper.querySelector('*');
    if (hasMarkup) {
      wrapper.querySelectorAll('a').forEach((anchor) => {
        anchor.classList.add('thread-link');
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
        const href = anchor.getAttribute('href') || anchor.textContent || '';
        anchor.setAttribute('href', this.normalizePreviewUrl(href));
      });
      wrapper.querySelectorAll('*').forEach((node) => {
        Array.from(node.childNodes)
          .filter((child) => child.nodeType === Node.TEXT_NODE && child.textContent?.match(this.urlRegex))
          .forEach((child) => {
            const replacement = document.createElement('span');
            replacement.innerHTML = this.linkifyPlainText(child.textContent || '');
            child.parentNode?.replaceChild(replacement, child);
          });
      });
      return wrapper.innerHTML;
    }
    return this.linkifyPlainText(decoded);
  }

  private linkifyPlainText(value: string): string {
    return this.escapeHtml(value)
      .replace(this.urlRegex, (rawUrl) => {
        const normalized = this.normalizePreviewUrl(rawUrl);
        const safeLabel = this.escapeHtml(rawUrl);
        return `<a href="${normalized}" target="_blank" rel="noopener noreferrer" class="thread-link">${safeLabel}</a>`;
      })
      .replace(/\n/g, '<br>');
  }

  private normalizePreviewUrl(rawUrl: string): string {
    const value = (rawUrl || '').trim();
    return /^https?:\/\//i.test(value) ? value : `https://${value.replace(/^\/+/, '')}`;
  }

  private escapeHtml(value: string): string {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private decodeHtmlEntities(value: string): string {
    if (!value || typeof document === 'undefined') return value || '';
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
  }
}

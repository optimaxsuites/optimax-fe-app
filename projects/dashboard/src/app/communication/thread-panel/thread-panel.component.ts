import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Message } from '../communication.component';
import { CollabMember, EmployeeProfile } from '../../ui/services/collaboration.service';
import { ComposerMentionOption } from '../message-composer/message-composer.component';

export type RightPanelMode = 'pinned' | 'thread' | 'details' | null;

export interface ChannelDetailsInput {
  id: string;
  backendId: number;
  name: string;
  description?: string;
  channelType?: 'PUBLIC' | 'PRIVATE';
  createdBy?: number;
}

interface MentionCandidate {
  userId: number;
  label: string;
}

interface ChatReactionOption {
  code: string;
  emoji: string;
  label: string;
}

interface MentionProfileCard {
  userId: number;
  name: string;
  email?: string;
  jobTitle?: string;
  department?: string;
  avatarUrl?: string;
  initials: string;
  online: boolean;
  lastSeenLabel: string;
}

@Component({
  selector: 'app-thread-panel',
  templateUrl: './thread-panel.component.html',
  styleUrls: ['./thread-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreadPanelComponent {
  private readonly urlRegex = /((https?:\/\/|www\.)[^\s<]+)/gi;
  private readonly mentionBoundaryAfterRegex = '(?=$|[\\s.,!?;:()\\[\\]{}"\'`])';
  readonly emojiChoices = [
    '😀',
    '😄',
    '😂',
    '😊',
    '😍',
    '😎',
    '🤔',
    '👏',
    '👍',
    '🙌',
    '🙏',
    '🔥',
    '💯',
    '🎉',
    '❤️',
    '🚀',
  ];
  readonly reactionOptions: ChatReactionOption[] = [
    { code: 'LIKE', emoji: '👍', label: 'Like' },
    { code: 'LOVE', emoji: '❤️', label: 'Love' },
    { code: 'LAUGH', emoji: '😂', label: 'Laugh' },
    { code: 'CELEBRATE', emoji: '🎉', label: 'Celebrate' },
    { code: 'FIRE', emoji: '🔥', label: 'Fire' },
  ];
  emojiMenuOpen = false;
  // ── Inputs ──────────────────────────────────────────
  @Input() mode: RightPanelMode = null;
  @Input() activeThread: Message | null = null;
  @Input() activeThreadReplyToId: string | null = null;
  @Input() activeThreadReplyTarget: Message | null = null;
  @Input() threadReplyDraft = '';
  @Input() threadMentionResults: ComposerMentionOption[] = [];
  @Input() threadShowMentionMenu = false;
  @Input() typingUsersLabel = '';
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
  @Input() mentionCandidates: MentionCandidate[] = [];
  @Input() mentionLabel: (employee: ComposerMentionOption) => string = () => '';
  @Input() resolveMentionProfileCard: (payload: { userId?: number; handle?: string }) => MentionProfileCard | null = () => null;

  // ── Outputs ─────────────────────────────────────────
  // Thread navigation
  @Output() threadClosed = new EventEmitter<void>();
  @Output() threadReplyDraftChange = new EventEmitter<string>();
  @Output() threadMentionSelected = new EventEmitter<ComposerMentionOption>();
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
  @Output() replyRetryRequested = new EventEmitter<Message>();

  // Reply like
  @Output() replyLikeToggled = new EventEmitter<{ msg: Message; event?: Event; reactionCode?: string }>();

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
  @Output() mentionActivated = new EventEmitter<number>();
  @Output() attachmentDownload = new EventEmitter<{ attachment: any; event: Event }>();

  activeMentionProfile: MentionProfileCard | null = null;
  mentionCardPosition: { top: number; left: number } | null = null;

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

  onThreadDraftInput(value: string): void {
    this.threadReplyDraftChange.emit(value);
  }

  toggleEmojiMenu(): void {
    this.emojiMenuOpen = !this.emojiMenuOpen;
  }

  appendEmoji(emoji: string): void {
    this.threadReplyDraftChange.emit(`${this.threadReplyDraft || ''}${emoji}`);
    this.emojiMenuOpen = false;
  }

  trackById(_: number, m: { id: string }): string {
    return m.id;
  }

  messageAttachments(msg: Message): NonNullable<Message['attachments']> {
    if (msg.attachments?.length) return msg.attachments;
    return msg.attachment ? [msg.attachment] : [];
  }

  totalReplies(msg: Message | null | undefined): number {
    if (!msg?.replies?.length) {
      return 0;
    }
    return msg.replies.reduce(
      (total, reply) => total + 1 + this.totalReplies(reply),
      0,
    );
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
    const anchor = this.findClosestAnchor(event, 'thread-link');
    const mention = this.findClosestAnchor(event, 'thread-mention');
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
    if (!anchor) return;
    event.preventDefault();
    event.stopPropagation();
    const href = anchor.getAttribute('href');
    if (!href) return;
    window.open(href, '_blank', 'noopener,noreferrer');
  }

  openThreadImage(
    attachment: Message['attachment'] | undefined,
    event: Event,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    const url = attachment?.previewUrl || '';
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (attachment?.downloadUrl) {
      this.attachmentDownload.emit({ attachment, event });
    }
  }

  downloadThreadAttachment(
    attachment: Message['attachment'] | undefined,
    event: Event,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    if (!attachment) return;
    this.attachmentDownload.emit({ attachment, event });
  }

  messageHtml(content: string): string {
    const decoded = this.decodeHtmlEntities(content || '');
    const extractedJson = this.extractStructuredJson(decoded);
    if (extractedJson) {
      return this.linkifyPlainText(extractedJson);
    }
    if (typeof document === 'undefined') {
      return this.mentionifyHtml(this.linkifyPlainText(this.cleanStructuredPasteArtifacts(decoded)));
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.cleanStructuredPasteArtifacts(decoded);
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
      return this.mentionifyHtml(wrapper.innerHTML);
    }
    return this.mentionifyHtml(
      this.linkifyPlainText(this.cleanStructuredPasteArtifacts(decoded)),
    );
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

  private cleanStructuredPasteArtifacts(value: string): string {
    let cleaned = value || '';
    cleaned = cleaned.replace(/https:\s*class="token[^"]*">\s*\/\//gi, 'https://');
    cleaned = cleaned.replace(/http:\s*class="token[^"]*">\s*\/\//gi, 'http://');
    cleaned = cleaned.replace(/https:\s*&quot;?\s*class=&quot;token[^&]*&quot;>\s*\/\//gi, 'https://');
    cleaned = cleaned.replace(/http:\s*&quot;?\s*class=&quot;token[^&]*&quot;>\s*\/\//gi, 'http://');
    cleaned = cleaned.replace(/(?:<span\s+)?class="token[^"]*">/gi, '');
    cleaned = cleaned.replace(/(?:&lt;span\s+)?class=&quot;token[^&]*&quot;>/gi, '');
    cleaned = cleaned.replace(/<\/span>/gi, '');
    cleaned = cleaned.replace(/&lt;\/span&gt;/gi, '');
    cleaned = cleaned.replace(/\u00a0/g, ' ');
    cleaned = cleaned.replace(/\s+(?=")/g, ' ');
    cleaned = cleaned.replace(/:\s+(?=")/g, ': ');
    cleaned = cleaned.replace(/,\s+(?=")/g, ', ');
    cleaned = cleaned.replace(/([{[])\s+(?=")/g, '$1 ');
    cleaned = cleaned.replace(/[ \t]+\n/g, '\n');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    return cleaned.trim();
  }

  private extractStructuredJson(content: string): string | null {
    const cleaned = this.cleanStructuredPasteArtifacts(content);
    const parsedDirect = this.tryFormatJson(cleaned);
    if (parsedDirect) {
      return parsedDirect;
    }
    const jsonBlocks = this.findJsonBlocks(cleaned);
    if (!jsonBlocks.length) {
      return null;
    }
    const formattedBlocks = jsonBlocks
      .map((block) => {
        const formattedJson = this.tryFormatJson(block.json);
        if (!formattedJson) {
          return null;
        }
        const prefix = this.normalizeStructuredPrefix(block.prefix);
        return prefix ? `${prefix}\n${formattedJson}` : formattedJson;
      })
      .filter((value): value is string => !!value);
    return formattedBlocks.length ? formattedBlocks.join('\n\n') : null;
  }

  private tryFormatJson(value: string): string | null {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return null;
    }
  }

  private findJsonBlocks(value: string): Array<{ prefix: string; json: string }> {
    const blocks: Array<{ prefix: string; json: string }> = [];
    let depth = 0;
    let start = -1;
    let cursor = 0;
    let inString = false;
    let escaping = false;

    for (let index = 0; index < value.length; index++) {
      const char = value[index];
      if (inString) {
        if (escaping) {
          escaping = false;
          continue;
        }
        if (char === '\\') {
          escaping = true;
          continue;
        }
        if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{' || char === '[') {
        if (depth === 0) {
          start = index;
        }
        depth++;
        continue;
      }

      if (char === '}' || char === ']') {
        if (depth <= 0) {
          continue;
        }
        depth--;
        if (depth === 0 && start >= 0) {
          blocks.push({
            prefix: value.slice(cursor, start).trim(),
            json: value.slice(start, index + 1).trim(),
          });
          cursor = index + 1;
          start = -1;
        }
      }
    }

    return blocks;
  }

  private normalizeStructuredPrefix(value: string): string {
    const cleaned = (value || '')
      .replace(/\s+/g, ' ')
      .replace(/\s*:\s*$/g, '')
      .trim();
    if (!cleaned) {
      return '';
    }
    const lines = cleaned
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => !!line);
    return lines.join('\n');
  }

  onRenderedContentHover(event: MouseEvent): void {
    const mention = this.findClosestAnchor(event, 'thread-mention');
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
    if (related?.closest('a.thread-mention')) return;
    this.closeMentionCard();
  }

  closeMentionCard(): void {
    this.activeMentionProfile = null;
    this.mentionCardPosition = null;
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
        return `${prefix || ''}<a href="#dm-user-${candidate.userId}" class="thread-mention" data-user-id="${candidate.userId}" data-mention="${this.escapeHtml(mentionText)}">${this.escapeHtml(mentionText)}</a>`;
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

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Message } from '../communication.component';

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
export class MessageFeedComponent {
  private readonly urlRegex = /((https?:\/\/|www\.)[^\s<]+)/gi;
  private readonly codeKeywordRegex =
    /\b(const|let|var|function|class|interface|type|return|import|export|public|private|protected|if|else|for|while|switch|case|try|catch)\b/;
  private readonly mentionBoundaryAfterRegex = '(?=$|[\\s.,!?;:()\\[\\]{}"\'`])';
  imageViewerOpen = false;
  imageViewerItems: Array<{ url: string; label: string }> = [];
  imageViewerIndex = 0;
  documentViewerOpen = false;
  documentViewerTitle = '';
  documentViewerUrl = '';
  documentViewerType: 'pdf' | 'office' | 'file' = 'file';
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

  // ── Outputs ─────────────────────────────────────────
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

  activeMentionProfile: MentionProfileCard | null = null;
  mentionCardPosition: { top: number; left: number } | null = null;

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

  onRenderedContentClick(event: Event): void {
    const mention = this.findClosestAnchor(event, 'chat-mention');
    if (!mention) return;
    event.preventDefault();
    event.stopPropagation();
    const userId = Number(mention.dataset['userId'] || 0);
    if (userId > 0) {
      if (typeof window !== 'undefined') {
        window.location.hash = `dm-user-${userId}`;
      }
      this.mentionActivated.emit(userId);
    }
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

  isOfficeAttachment(attachment: Message['attachment'] | undefined): boolean {
    const fileRef = `${attachment?.name || ''} ${attachment?.downloadUrl || ''}`.toLowerCase();
    return (
      /\.docx?(\?|$)/i.test(fileRef) ||
      /\.pptx?(\?|$)/i.test(fileRef) ||
      /\.xlsx?(\?|$)/i.test(fileRef)
    );
  }

  attachmentBadge(attachment: Message['attachment'] | undefined): string {
    const fileRef = `${attachment?.name || ''}`.toLowerCase();
    if (fileRef.endsWith('.doc') || fileRef.endsWith('.docx')) return 'DOCX';
    if (fileRef.endsWith('.ppt') || fileRef.endsWith('.pptx')) return 'PPTX';
    if (fileRef.endsWith('.xls') || fileRef.endsWith('.xlsx')) return 'XLSX';
    if (fileRef.endsWith('.pdf')) return 'PDF';
    return 'FILE';
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

  previewableDocumentAttachments(msg: Message): NonNullable<Message['attachments']> {
    return this.nonImageAttachments(msg).filter((attachment) =>
      this.isPdfAttachment(attachment) || this.isOfficeAttachment(attachment),
    );
  }

  genericAttachments(msg: Message): NonNullable<Message['attachments']> {
    return this.nonImageAttachments(msg).filter(
      (attachment) => !this.isPdfAttachment(attachment) && !this.isOfficeAttachment(attachment),
    );
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

  openDocumentViewer(attachment: Message['attachment'] | undefined, event?: Event): void {
    event?.stopPropagation();
    if (!attachment?.previewUrl) return;
    this.documentViewerTitle = attachment.name || 'Document preview';
    this.documentViewerUrl = attachment.previewUrl;
    this.documentViewerType = this.isPdfAttachment(attachment)
      ? 'pdf'
      : this.isOfficeAttachment(attachment)
        ? 'office'
        : 'file';
    this.documentViewerOpen = true;
  }

  closeDocumentViewer(): void {
    this.documentViewerOpen = false;
    this.documentViewerTitle = '';
    this.documentViewerUrl = '';
    this.documentViewerType = 'file';
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

  isStructuredMessage(msg: Message): boolean {
    return this.structuredMessageKind(msg) !== 'plain';
  }

  structuredMessageKind(msg: Message): 'plain' | 'json' | 'html' | 'code' {
    const content = this.normalizedMessageContent(msg);
    if (!content) return 'plain';
    if (this.codeFenceMatch(content)) return 'code';
    if (this.extractStructuredJson(content)) return 'json';
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
      const extracted = this.extractStructuredJson(content);
      if (extracted) {
        return extracted;
      }
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
    const extractedJson = this.extractStructuredJson(decoded);
    if (extractedJson) {
      return extractedJson
        .split('\n')
        .map((line) => this.highlightStructuredLine(line || ' ', 'json'))
        .join('<br>');
    }
    const escaped = this.escapeHtml(
      this.cleanStructuredPasteArtifacts(decoded),
    );
    return this.mentionifyHtml(escaped
      .replace(this.urlRegex, (rawUrl) => {
        const normalized = this.normalizePreviewUrl(rawUrl);
        const safeLabel = this.escapeHtml(rawUrl);
        return `<a href="${normalized}" target="_blank" rel="noopener noreferrer" class="chat-link">${safeLabel}</a>`;
      })
      .replace(/\n/g, '<br>'));
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
    return /^\s*<\/?[a-z][\s\S]*>\s*$/i.test(content);
  }

  private looksLikeCode(content: string): boolean {
    const lines = content.split('\n');
    return (
      lines.length > 1 &&
      (this.codeKeywordRegex.test(content) ||
        /[{}();=<>\[\]]/.test(content))
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

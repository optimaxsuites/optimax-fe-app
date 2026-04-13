import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectorRef,
  OnDestroy,
  HostListener,
} from '@angular/core';
import {
  CollabChannel,
  CollabMessage,
  CollabUserInfo,
  CollaborationService,
  EmployeeProfile,
} from '../ui/services/collaboration.service';

// ─────────────────────────────────────────────────────
//  Local interfaces
// ─────────────────────────────────────────────────────
export interface Message {
  id: string;
  backendId?: number;
  author: string;
  initials: string;
  avatarColor: string;
  role?: string;
  time: string;
  content: string;
  replies: Message[];
  liked: boolean;
  likeCount: number;
  pinned: boolean;
  pinnedAt?: number;
  createdAt: Date;
  attachment?: { name: string; size: string; type?: string };
  isSystem?: boolean;
  senderUserId?: number;
  replyToMessageId?: number;
  threadRootMessageId?: number;
}

export interface Channel {
  id: string;
  backendId: number;
  name: string;
  description?: string;
  hasUnread?: boolean;
}

export interface DirectMessage {
  id: string;
  shortName: string;
  initials: string;
  avatarColor: string;
  online: boolean;
  hasUnread?: boolean;
}

// ─────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#10b981', '#6366f1', '#f59e0b', '#2e6276',
  '#ec4899', '#14b8a6', '#8b5cf6', '#0ea5e9',
];

function colorFor(seed: number): string {
  return AVATAR_COLORS[Math.abs(seed) % AVATAR_COLORS.length];
}

function initialsFrom(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return 'U?';
}

function formatSentAt(sentAt: string | number[] | undefined): string {
  if (!sentAt) return '';
  let d: Date;
  if (Array.isArray(sentAt)) {
    d = new Date(sentAt[0], (sentAt[1] || 1) - 1, sentAt[2] || 1, sentAt[3] || 0, sentAt[4] || 0, sentAt[5] || 0);
  } else {
    d = new Date(sentAt);
  }
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────
@Component({
  selector: 'app-communication',
  templateUrl: './communication.component.html',
  styleUrls: ['./communication.component.scss'],
})
export class CommunicationComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('feedEl')     feedEl!:     ElementRef<HTMLDivElement>;
  @ViewChild('composerEl') composerEl!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('threadEl')   threadEl!:   ElementRef<HTMLDivElement>;
  @ViewChild('fileInput')  fileInput!:  ElementRef<HTMLInputElement>;

  // ── Current user ─────────────────────────────────────
  me = { name: 'Loading…', shortName: 'Loading…', initials: '??', avatarColor: '#2e6276', userId: 0 };

  activeView: 'channel' | 'dm' | 'threads' = 'channel';
  activeChannelId  = '';
  activeDmId       = '';
  activeThreadId:  string | null = null;
  showPinnedPanel  = false;
  threadReplyDraft = '';
  draft            = '';
  searchQuery      = '';
  searchResults: { msg: Message; channelId: string; channelName: string }[] = [];
  showSearch     = false;
  showAddChannel = false;
  newChannelName = '';
  pendingAttachment: { name: string; size: string; type: string } | null = null;

  // ── Loading states ────────────────────────────────────
  channelsLoading = true;
  channelsError:  string | null = null;
  messagesLoading = false;
  sendingMessage  = false;
  sendingReply    = false;
  /** Set of local message ids currently waiting for a reaction API response */
  reactingIds     = new Set<string>();

  // ── Sidebar resize ────────────────────────────────────
  sidebarWidth     = 240;
  threadPanelWidth = 380;
  readonly SIDEBAR_MIN = 200;
  readonly SIDEBAR_MAX = 340;
  readonly THREAD_MIN  = 300;
  readonly THREAD_MAX  = 540;
  isResizingSidebar = false;
  isResizingThread  = false;
  private resizeStartX = 0;
  private resizeStartWidth = 0;

  private scrollFeed   = false;
  private scrollThread = false;
  private flashId: string | null = null;
  private flashTimer: any;

  // ── Data ─────────────────────────────────────────────
  channels: Channel[] = [];
  private userDirectory: Record<number, string> = {};

  directMessages: DirectMessage[] = [
    { id: 'dm-1', shortName: 'Amara O.',  initials: 'AO', avatarColor: '#10b981', online: true,  hasUnread: true },
    { id: 'dm-2', shortName: 'Emeka N.',  initials: 'EN', avatarColor: '#6366f1', online: true  },
    { id: 'dm-3', shortName: 'Fatima H.', initials: 'FH', avatarColor: '#f59e0b', online: false },
    { id: 'dm-4', shortName: 'Tunde A.',  initials: 'TA', avatarColor: '#2e6276', online: true  },
    { id: 'dm-5', shortName: 'Ngozi E.',  initials: 'NE', avatarColor: '#ec4899', online: false },
  ];

  channelMessages: Record<string, Message[]> = {};
  dmMessages:      Record<string, Message[]> = {};
  private lastMessageBackendId: number | null = null;

  constructor(private cdr: ChangeDetectorRef, private collabService: CollaborationService) {}

  // ── Lifecycle ─────────────────────────────────────────

  ngOnInit() {
    this.loadCurrentUser();
    this.loadChannels();
    this.directMessages.forEach(dm => { this.dmMessages[dm.id] = []; });
  }

  ngOnDestroy() {
    if (this.flashTimer) clearTimeout(this.flashTimer);
  }

  ngAfterViewChecked() {
    if (this.scrollFeed && this.feedEl?.nativeElement) {
      this.feedEl.nativeElement.scrollTop = this.feedEl.nativeElement.scrollHeight;
      this.scrollFeed = false;
    }
    if (this.scrollThread && this.threadEl?.nativeElement) {
      this.threadEl.nativeElement.scrollTop = this.threadEl.nativeElement.scrollHeight;
      this.scrollThread = false;
    }
  }

  // ── Current user ─────────────────────────────────────

  private loadCurrentUser(): void {
    const userId = Number(sessionStorage.getItem('userid') || 0);
    if (!userId) return;
    this.me.userId = userId;
    this.collabService.getEmployeeByUserId(userId).subscribe({
      next: (emp: EmployeeProfile) => {
        const first    = emp.firstName || '';
        const last     = emp.lastName  || '';
        const fullName = `${first} ${last}`.trim() || emp.user?.fullname || 'User';
        this.me = { name: fullName, shortName: last ? `${first} ${last[0]}.` : first || 'User', initials: initialsFrom(fullName), avatarColor: '#2e6276', userId };
        this.userDirectory[userId] = fullName;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  // ── Channels ──────────────────────────────────────────

  private loadChannels(): void {
    this.channelsLoading = true;
    this.channelsError   = null;
    this.collabService.getHomeChannels().subscribe({
      next: (data) => this.mapAndSetChannels(data.channels || []),
      error: () => {
        this.collabService.getChannels().subscribe({
          next: (list) => this.mapAndSetChannels(list),
          error: (err) => {
            console.error('[Comm] Both channel endpoints failed:', err);
            this.channelsError = 'Could not load channels. Please try again later.';
            this.channelsLoading = false;
            this.channels = [];
            this.cdr.detectChanges();
          },
        });
      },
    });
  }

  private mapAndSetChannels(list: CollabChannel[]): void {
    this.channels = list.map(c => {
      const backendId = Number(c.channelId ?? c.id);
      return { id: String(backendId), backendId, name: c.name, description: c.description, hasUnread: (c.unreadCount ?? 0) > 0 };
    });
    this.channelsLoading = false;
    if (this.channels.length > 0 && !this.activeChannelId) {
      this.selectChannel(this.channels[0].id);
    }
    this.cdr.detectChanges();
  }

  // ── Messages ──────────────────────────────────────────

  private loadChannelMessages(channel: Channel): void {
    if (!channel.backendId) return;
    this.messagesLoading = true;
    this.cdr.detectChanges();

    this.collabService.getChannelSnapshot(channel.backendId).subscribe({
      next: (snap) => {
        this.messagesLoading = false;
        const messages  = snap.messages  || [];
        const reactions = snap.reactions || [];
        if (!messages.length) { this.channelMessages[channel.id] = []; this.cdr.detectChanges(); return; }
        const senderIds = [...new Set(messages.map(m => m.senderUserId))];
        this.loadUserDirectory(senderIds, () => this.buildAndRenderMessages(channel, messages, reactions));
      },
      error: (err) => {
        console.error('[Comm] getChannelSnapshot failed:', err);
        this.messagesLoading = false;
        this.channelMessages[channel.id] = this.channelMessages[channel.id] ?? [];
        this.cdr.detectChanges();
      },
    });
  }

  private loadUserDirectory(userIds: number[], callback: () => void): void {
    const missing = userIds.filter(id => !this.userDirectory[id]);
    if (!missing.length) { callback(); return; }
    this.collabService.getUsersInfo(missing).subscribe({
      next: (users: CollabUserInfo[]) => {
        for (const u of users) {
          if (u.userId == null) continue;
          this.userDirectory[u.userId] = u.fullname || u.username || u.email || `User ${u.userId}`;
        }
        callback();
      },
      error: () => callback(),
    });
  }

  private buildAndRenderMessages(channel: Channel, messages: CollabMessage[], reactions: { messageId: number; reactionCode: string }[]): void {
    const reactionCount = new Map<string, number>();
    for (const r of reactions) {
      const k = `${r.messageId}|${r.reactionCode}`;
      reactionCount.set(k, (reactionCount.get(k) ?? 0) + 1);
    }

    const msgMap = new Map<number, CollabMessage>(messages.map(m => [m.id, m]));
    const roots: CollabMessage[] = [];
    const replyChildren = new Map<number, CollabMessage[]>();

    for (const m of messages) {
      if (m.replyToMessageId && msgMap.has(m.replyToMessageId)) {
        const parentId = m.threadRootMessageId ?? m.replyToMessageId;
        const bucket   = replyChildren.get(parentId) ?? [];
        bucket.push(m);
        replyChildren.set(parentId, bucket);
      } else {
        roots.push(m);
      }
    }

    if (messages.length) this.lastMessageBackendId = messages[messages.length - 1].id;

    const LIKE_CODES = ['LIKE', 'LOVE', 'THUMBS_UP', 'LAUGH'];
    const toLocal = (m: CollabMessage, childReplies: Message[] = []): Message => {
      const totalLikes  = LIKE_CODES.reduce((sum, code) => sum + (reactionCount.get(`${m.id}|${code}`) ?? 0), 0);
      const authorLabel = this.userDirectory[m.senderUserId] || `User ${m.senderUserId}`;
      return {
        id: `backend-${m.id}`, backendId: m.id, author: authorLabel, initials: initialsFrom(authorLabel),
        avatarColor: colorFor(m.senderUserId), time: formatSentAt(m.sentAt), content: m.content || '',
        replies: childReplies, liked: false, likeCount: totalLikes, pinned: false, createdAt: new Date(),
        senderUserId: m.senderUserId, replyToMessageId: m.replyToMessageId, threadRootMessageId: m.threadRootMessageId,
      };
    };

    this.channelMessages[channel.id] = roots.map(root => toLocal(root, (replyChildren.get(root.id) ?? []).map(c => toLocal(c))));

    if (this.lastMessageBackendId) {
      this.collabService.markRead(channel.backendId, this.lastMessageBackendId).subscribe({ error: () => {} });
    }

    channel.hasUnread = false;
    this.scrollFeed   = true;
    this.cdr.detectChanges();
  }

  // ── Resize ────────────────────────────────────────────

  startResizeSidebar(e: MouseEvent): void { this.isResizingSidebar = true; this.resizeStartX = e.clientX; this.resizeStartWidth = this.sidebarWidth; e.preventDefault(); }
  startResizeThread(e: MouseEvent): void  { this.isResizingThread  = true; this.resizeStartX = e.clientX; this.resizeStartWidth = this.threadPanelWidth; e.preventDefault(); }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.isResizingSidebar) this.sidebarWidth     = Math.min(this.SIDEBAR_MAX, Math.max(this.SIDEBAR_MIN, this.resizeStartWidth + (e.clientX - this.resizeStartX)));
    if (this.isResizingThread)  this.threadPanelWidth = Math.min(this.THREAD_MAX,  Math.max(this.THREAD_MIN,  this.resizeStartWidth + (this.resizeStartX - e.clientX)));
  }

  @HostListener('document:mouseup')
  onMouseUp(): void { this.isResizingSidebar = false; this.isResizingThread = false; }

  // ── Computed getters ──────────────────────────────────

  get activeChannel(): Channel | undefined { return this.channels.find(c => c.id === this.activeChannelId); }
  get activeDm(): DirectMessage | undefined { return this.directMessages.find(d => d.id === this.activeDmId); }
  get rawMessages(): Message[] { return this.activeView === 'dm' ? (this.dmMessages[this.activeDmId] || []) : (this.channelMessages[this.activeChannelId] || []); }
  get pinnedMessages(): Message[] { return this.rawMessages.filter(m => m.pinned && !m.isSystem).sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0)); }

  get activeThread(): Message | null {
    if (!this.activeThreadId) return null;
    for (const ch of this.channels) {
      const found = (this.channelMessages[ch.id] || []).find(m => m.id === this.activeThreadId);
      if (found) return found;
    }
    return null;
  }

  get allThreaded(): { msg: Message; channelName: string }[] {
    const out: { msg: Message; channelName: string }[] = [];
    for (const ch of this.channels) {
      (this.channelMessages[ch.id] || []).filter(m => m.replies.length).forEach(m => out.push({ msg: m, channelName: ch.name }));
    }
    return out;
  }

  get rightPanelOpen(): boolean { return this.showPinnedPanel || !!this.activeThreadId; }
  get rightPanelMode(): 'pinned' | 'thread' | null { return this.showPinnedPanel ? 'pinned' : this.activeThreadId ? 'thread' : null; }

  isFlashing(id: string): boolean { return this.flashId === id; }
  isDmOnline(): boolean { return this.activeDm?.online ?? false; }
  isReacting(msgId: string): boolean { return this.reactingIds.has(msgId); }

  composerPlaceholder(): string {
    return this.activeView === 'channel' ? 'Message #' + (this.activeChannel?.name ?? '') : 'Message ' + (this.activeDm?.shortName ?? '');
  }

  // ── Navigation ────────────────────────────────────────

  selectChannel(id: string): void {
    this.activeChannelId = id; this.activeView = 'channel'; this.activeDmId = ''; this.activeThreadId = null; this.showPinnedPanel = false; this.showSearch = false;
    const ch = this.channels.find(c => c.id === id);
    if (ch) { ch.hasUnread = false; this.loadChannelMessages(ch); }
  }

  selectDm(id: string): void {
    this.activeDmId = id; this.activeView = 'dm'; this.activeThreadId = null; this.showPinnedPanel = false; this.showSearch = false;
    const dm = this.directMessages.find(d => d.id === id);
    if (dm) dm.hasUnread = false;
    this.scrollFeed = true;
  }

  setView(v: 'threads'): void { this.activeView = v; this.activeThreadId = null; this.showPinnedPanel = false; }
  toggleAddChannel(): void { this.showAddChannel = !this.showAddChannel; }

  addChannel(): void {
    const name = this.newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name || this.channels.find(c => c.id === name)) return;
    this.channels.push({ id: name, backendId: 0, name, description: `${name} discussions` });
    this.channelMessages[name] = [];
    this.newChannelName = ''; this.showAddChannel = false;
    this.selectChannel(name);
  }

  togglePinnedPanel(): void { this.showPinnedPanel = !this.showPinnedPanel; if (this.showPinnedPanel) this.activeThreadId = null; }
  closePinnedPanel(): void  { this.showPinnedPanel = false; }

  // ── File attachment ───────────────────────────────────

  triggerFileInput(): void { this.fileInput?.nativeElement.click(); }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    const size = file.size < 1024 * 1024 ? (file.size / 1024).toFixed(1) + ' KB' : (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    this.pendingAttachment = { name: file.name, size, type: file.type };
    input.value = '';
    this.cdr.detectChanges();
  }

  removePendingAttachment(): void { this.pendingAttachment = null; }

  // ── Messaging ─────────────────────────────────────────

  sendMessage(): void {
    const text = this.draft.trim();
    if ((!text && !this.pendingAttachment) || this.sendingMessage) return;

    if (this.activeView === 'dm') {
      (this.dmMessages[this.activeDmId] ??= []).push(this.makeLocalMsg(text || '(file attachment)', this.pendingAttachment ?? undefined));
      this.draft = ''; this.pendingAttachment = null; this.scrollFeed = true;
      return;
    }

    const channel = this.activeChannel;
    if (!channel) return;

    if (!channel.backendId) {
      (this.channelMessages[channel.id] ??= []).push(this.makeLocalMsg(text || '(file attachment)', this.pendingAttachment ?? undefined));
      this.draft = ''; this.pendingAttachment = null; this.scrollFeed = true;
      return;
    }

    this.sendingMessage = true;
    const optimistic = this.makeLocalMsg(text || '(file attachment)', this.pendingAttachment ?? undefined);
    (this.channelMessages[channel.id] ??= []).push(optimistic);
    this.draft = ''; this.pendingAttachment = null; this.scrollFeed = true;
    this.cdr.detectChanges();

    this.collabService.sendMessage({ channelId: channel.backendId, senderUserId: this.me.userId, content: text, messageType: 'TEXT' }).subscribe({
      next:  (saved) => { optimistic.backendId = saved.id; this.sendingMessage = false; this.cdr.detectChanges(); },
      error: (err)   => {
        console.error('[Comm] sendMessage failed:', err);
        const idx = (this.channelMessages[channel.id] ?? []).indexOf(optimistic);
        if (idx !== -1) this.channelMessages[channel.id].splice(idx, 1);
        this.sendingMessage = false; this.cdr.detectChanges();
      },
    });
  }

  onComposerKey(e: KeyboardEvent, el: HTMLTextAreaElement): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
    setTimeout(() => { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; });
  }

  onComposerInput(el: HTMLTextAreaElement): void { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; }

  // ── Thread replies → backend ──────────────────────────
  //
  // The mock (collaboration-chat-ai-ui.html) sends thread replies exactly
  // like regular messages but with two extra fields:
  //
  //   replyToMessageId    – id of the message being replied to
  //   threadRootMessageId – id of the root/top message of the thread.
  //                         If the parent is itself a reply, this is the
  //                         parent's threadRootMessageId; otherwise it equals
  //                         replyToMessageId.
  //
  // Endpoint: POST /x/api/v2/ai/collab/chat/message
  // ─────────────────────────────────────────────────────

  openThread(msg: Message, e?: Event): void {
    e?.stopPropagation();
    if (this.activeThreadId === msg.id) { this.activeThreadId = null; return; }
    this.showPinnedPanel = false; this.activeThreadId = msg.id; this.threadReplyDraft = ''; this.scrollThread = true;
    this.cdr.detectChanges();
  }

  closeThread(): void { this.activeThreadId = null; }

  sendReply(): void {
    const text   = this.threadReplyDraft.trim();
    const parent = this.activeThread;
    if (!text || !parent || this.sendingReply) return;

    const channel = this.activeChannel;

    // DM or local-only channel — stay in-memory
    if (this.activeView === 'dm' || !channel?.backendId || !parent.backendId) {
      parent.replies.push(this.makeLocalMsg(text));
      this.threadReplyDraft = ''; this.scrollThread = true;
      this.cdr.detectChanges();
      return;
    }

    this.sendingReply = true;

    // Optimistic local reply shown immediately
    const optimistic = this.makeLocalMsg(text);
    optimistic.replyToMessageId    = parent.backendId;
    optimistic.threadRootMessageId = parent.threadRootMessageId ?? parent.backendId;
    parent.replies.push(optimistic);
    this.threadReplyDraft = ''; this.scrollThread = true;
    this.cdr.detectChanges();

    this.collabService.sendMessage({
      channelId:           channel.backendId,
      senderUserId:        this.me.userId,
      content:             text,
      messageType:         'TEXT',
      replyToMessageId:    parent.backendId,
      threadRootMessageId: parent.threadRootMessageId ?? parent.backendId,
    }).subscribe({
      next: (saved) => {
        optimistic.backendId = saved.id;
        this.sendingReply    = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[Comm] sendReply failed:', err);
        const idx = parent.replies.indexOf(optimistic);
        if (idx !== -1) parent.replies.splice(idx, 1);
        this.sendingReply = false;
        this.cdr.detectChanges();
      },
    });
  }

  onThreadKey(e: KeyboardEvent): void { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendReply(); } }

  // ── Reactions → backend ───────────────────────────────
  //
  // The mock sends:
  //   POST /x/api/v2/ai/collab/chat/reaction
  //   { messageId, userId, reactionCode }
  // then immediately calls selectChannel() to re-fetch the full snapshot
  // so reaction counts refresh.
  //
  // We mirror that here:
  //   1. Optimistic toggle so the UI responds immediately.
  //   2. Fire the API call.
  //   3. On success: silently re-fetch ONLY the reactions from the snapshot
  //      and update likeCount without rebuilding the whole message list
  //      (preserves scroll position, pinned state, local thread replies).
  //   4. On failure: roll back the optimistic change.
  // ─────────────────────────────────────────────────────

  toggleLike(msg: Message, e?: Event): void {
    e?.stopPropagation();
    if (this.reactingIds.has(msg.id)) return; // prevent double-click race

    // Optimistic toggle
    const wasLiked = msg.liked;
    msg.liked      = !msg.liked;
    msg.likeCount  = msg.liked ? msg.likeCount + 1 : Math.max(0, msg.likeCount - 1);
    this.cdr.detectChanges();

    if (!msg.backendId) return; // local-only message — nothing more to do

    this.reactingIds.add(msg.id);

    this.collabService.addReaction({ messageId: msg.backendId, userId: this.me.userId, reactionCode: 'LIKE' }).subscribe({
      next: () => {
        this.reactingIds.delete(msg.id);
        // Silently refresh reaction counts from the snapshot (mirrors the mock's selectChannel() call)
        const channel = this.activeChannel;
        if (channel?.backendId) {
          this.collabService.getChannelSnapshot(channel.backendId).subscribe({
            next:  (snap) => this.refreshReactionCounts(channel, snap.reactions || []),
            error: () => {},
          });
        }
      },
      error: (err) => {
        console.warn('[Comm] addReaction failed — rolling back:', err);
        msg.liked     = wasLiked;
        msg.likeCount = wasLiked ? msg.likeCount + 1 : Math.max(0, msg.likeCount - 1);
        this.reactingIds.delete(msg.id);
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Updates likeCount on every message in the channel from fresh reaction data,
   * WITHOUT rebuilding the message list (preserves scroll, pin state, local replies).
   */
  private refreshReactionCounts(channel: Channel, reactions: { messageId: number; reactionCode: string }[]): void {
    const LIKE_CODES = ['LIKE', 'LOVE', 'THUMBS_UP', 'LAUGH'];
    const reactionCount = new Map<string, number>();
    for (const r of reactions) {
      const k = `${r.messageId}|${r.reactionCode}`;
      reactionCount.set(k, (reactionCount.get(k) ?? 0) + 1);
    }
    for (const msg of this.channelMessages[channel.id] || []) {
      if (!msg.backendId) continue;
      msg.likeCount = LIKE_CODES.reduce((sum, code) => sum + (reactionCount.get(`${msg.backendId}|${code}`) ?? 0), 0);
    }
    this.cdr.detectChanges();
  }

  togglePin(msg: Message, e?: Event): void {
    e?.stopPropagation();
    msg.pinned   = !msg.pinned;
    msg.pinnedAt = msg.pinned ? Date.now() : undefined;
    this.cdr.detectChanges();
  }

  // ── Search ────────────────────────────────────────────

  closeSearch(): void { this.showSearch = false; }

  onSearch(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) { this.searchResults = []; this.showSearch = false; return; }
    this.searchResults = [];
    for (const ch of this.channels) {
      for (const msg of this.channelMessages[ch.id] || []) {
        if (!msg.isSystem && (msg.content.toLowerCase().includes(q) || msg.author.toLowerCase().includes(q))) {
          this.searchResults.push({ msg, channelId: ch.id, channelName: ch.name });
        }
      }
    }
    this.showSearch = true;
  }

  jumpTo(r: { msg: Message; channelId: string; channelName: string }): void {
    this.selectChannel(r.channelId); this.searchQuery = ''; this.showSearch = false;
    setTimeout(() => {
      const el = document.getElementById('msg-' + r.msg.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.flashId    = r.msg.id;
        this.flashTimer = setTimeout(() => { this.flashId = null; this.cdr.detectChanges(); }, 1800);
      }
    }, 120);
  }

  // ── Template helpers ──────────────────────────────────

  trackById(_: number, m: { id: string }): string { return m.id; }

  getChannelIdForMsg(msg: Message): string {
    for (const ch of this.channels) {
      if ((this.channelMessages[ch.id] || []).find(m => m.id === msg.id)) return ch.id;
    }
    return this.activeChannelId;
  }

  getTopReplies(msg: Message): Message[] { return msg.replies.slice(0, 3); }

  openThreadFromList(msg: Message, event: Event): void {
    this.selectChannel(this.getChannelIdForMsg(msg));
    this.openThread(msg, event);
  }

  // ── Private helpers ───────────────────────────────────

  private makeLocalMsg(content: string, attachment?: { name: string; size: string; type: string }): Message {
    const msg: Message = {
      id: 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      author: this.me.name, initials: this.me.initials, avatarColor: this.me.avatarColor,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content, replies: [], liked: false, likeCount: 0, pinned: false, createdAt: new Date(), senderUserId: this.me.userId,
    };
    if (attachment) msg.attachment = attachment;
    return msg;
  }
}
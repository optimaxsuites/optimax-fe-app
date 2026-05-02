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
import { Client } from '@stomp/stompjs';
import {
  CollabChannel,
  CollabMessage,
  CollabMember,
  CollaborationService,
  EmployeeProfile,
  AiRewriteResponse,
  AiSubjectResponse,
  AiSummaryResponse,
  AiEmailComposeResponse,
  CollabFeedHome,
  CollabFeedPost,
  CollabFeedComment,
  CollabFeedMediaItem,
  CollabFeedReactionUser,
} from '../ui/services/collaboration.service';
import { firstValueFrom } from 'rxjs';
import { HeaderStateService } from 'src/app/ui/shared/service/header-state.service';

// damilola worked on this: feed-first collaboration, unread syncing, read receipts, and richer notifications.
// ── Local interfaces ──────────────────────────────────────────────────────────
export interface Message {
  id: string;
  backendId?: number;
  author: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
  role?: string;
  time: string;
  sentAtRaw?: string | number[];
  content: string;
  replies: Message[];
  liked: boolean;
  likeCount: number;
  likeReactionId?: number;
  pinned: boolean;
  pinnedAt?: number;
  createdAt: Date;
  attachment?: {
    name: string;
    size: string;
    type?: string;
    downloadUrl?: string;
    previewUrl?: string;
  };
  isSystem?: boolean;
  senderUserId?: number;
  replyToMessageId?: number;
  threadRootMessageId?: number;
  deleting?: boolean;
  deliveryState?: 'SENDING' | 'DELIVERED' | 'READ';
  sourceType?: 'channel' | 'dm';
  sourceLabel?: string;
  sourceSecondaryLabel?: string;
  threadSummary?: string;
  threadReplyCount?: number;
  threadLastActivityRaw?: string | number[];
}

export interface Channel {
  id: string;
  backendId: number;
  name: string;
  description?: string;
  channelType?: 'PUBLIC' | 'PRIVATE';
  createdBy?: number;
  hasUnread?: boolean;
  unreadCount?: number;
}

export interface DmContact {
  id: string;
  employeeId: number;
  userId: number;
  shortName: string;
  fullName: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
  email?: string;
  jobTitle?: string;
  department?: string;
  online: boolean;
  hasUnread?: boolean;
  unreadCount?: number;
  dmChannelId?: number;
  lastMessagePreview?: string;
  lastMessageTime?: string;
}

interface CollaborationFeedHighlight {
  id: number;
  author: string;
  role: string;
  timeAgo: string;
  content: string;
  tone: 'info' | 'success' | 'focus';
}

interface CollaborationFocusItem {
  id: number;
  title: string;
  owner: string;
  due: string;
  status: 'Pending' | 'In Progress' | 'Review';
}

interface CollaborationMoment {
  id: number;
  title: string;
  time: string;
  type: 'Meeting' | 'Deadline' | 'Update';
}

interface FeedThreadState {
  expanded: boolean;
  loading: boolean;
  comments: FeedCommentNode[];
  draft: string;
  mediaDrafts: FeedMediaDraft[];
  searchQuery: string;
  searchLoading: boolean;
  searchResults: CollabFeedComment[];
  mentionResults: EmployeeProfile[];
  showMentionMenu: boolean;
}

interface FeedCommentNode extends CollabFeedComment {
  replies: FeedCommentNode[];
  depth: number;
  replyOpen: boolean;
  replyDraft: string;
  replyMediaDrafts: FeedMediaDraft[];
  mentionResults: EmployeeProfile[];
  showMentionMenu: boolean;
}

interface FeedMentionTarget {
  mentionResults: EmployeeProfile[];
  showMentionMenu: boolean;
}

interface FeedMediaDraft {
  file: File;
  name: string;
  size: string;
  type: string;
  previewUrl?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#10b981',
  '#6366f1',
  '#f59e0b',
  '#2e6276',
  '#ec4899',
  '#14b8a6',
  '#8b5cf6',
  '#0ea5e9',
];

export function _colorFor(seed: number): string {
  return AVATAR_COLORS[Math.abs(seed) % AVATAR_COLORS.length];
}

export function initialsFrom(name: string): string {
  const p = (name || '').trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return `${p[0][0]}${p[1][0]}`.toUpperCase();
  if (p.length === 1 && p[0].length >= 2) return p[0].slice(0, 2).toUpperCase();
  return 'U?';
}

function parseServerDate(raw: string | number[] | undefined): Date | null {
  if (!raw) return null;
  let d: Date;
  if (Array.isArray(raw)) {
    const [year, month, day, hour = 0, min = 0, sec = 0] = raw as number[];
    d = new Date(Date.UTC(year, month - 1, day, hour, min, sec));
  } else {
    let s = String(raw).trim().replace(' ', 'T');
    if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(s)) s += 'Z';
    d = new Date(s);
    if (isNaN(d.getTime())) d = new Date(raw as string);
  }
  return isNaN(d.getTime()) ? null : d;
}

function formatRelativeTime(raw: string | number[] | undefined): string {
  const d = parseServerDate(raw);
  if (!d) return '';
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - d.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 2) {
    const remainMins = diffMin - diffHr * 60;
    return remainMins > 0 ? `${diffHr}h ${remainMins}m ago` : `${diffHr}h ago`;
  }
  const timeStr = d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (msgDay.getTime() === todayStart.getTime()) return `Today at ${timeStr}`;
  if (msgDay.getTime() === yesterdayStart.getTime())
    return `Yesterday at ${timeStr}`;
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${timeStr}`;
  }
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeStr}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ── Component ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-communication',
  templateUrl: './communication.component.html',
  styleUrls: ['./communication.component.scss'],
})
export class CommunicationComponent
  implements OnInit, AfterViewChecked, OnDestroy
{
  @ViewChild('feedEl') feedEl!: ElementRef<HTMLDivElement>;
  @ViewChild('threadEl') threadEl!: ElementRef<HTMLDivElement>;
  @ViewChild('feedComposerEl') feedComposerEl?: ElementRef<HTMLDivElement>;

  me = {
    name: 'Loading…',
    shortName: 'Loading…',
    initials: '??',
    avatarColor: '#2e6276',
    userId: 0,
    avatarUrl: '',
  };

  workspaceMode: 'feed' | 'chat' = 'feed';
  feedHomeLoading = true;
  feedHomeError: string | null = null;
  feedQuery = '';
  feedHome: CollabFeedHome | null = null;
  feedPosts: CollabFeedPost[] = [];
  featuredFeedPosts: CollabFeedPost[] = [];
  trendingTags: string[] = [];
  selectedFeedPostId: number | null = null;
  creatingPost = false;
  feedMediaError = '';
  postComposer = {
    body: '',
    postType: 'UPDATE',
  };
  feedComposerMentionResults: EmployeeProfile[] = [];
  feedComposerShowMentionMenu = false;
  selectedFeedMedia: FeedMediaDraft[] = [];
  editingFeedPostId: number | null = null;
  editingFeedPostMedia: CollabFeedMediaItem[] = [];
  expandedFeedMediaUrl = '';
  expandedFeedMediaLabel = '';
  feedMediaViewerOpen = false;
  private feedReactionHoverCache: Record<string, string> = {};
  readonly feedReactionOptions = [
    { code: 'LIKE', label: 'Like', icon: 'pi pi-thumbs-up' },
    { code: 'CELEBRATE', label: 'Celebrate', icon: 'pi pi-star-fill' },
    { code: 'SUPPORT', label: 'Support', icon: 'pi pi-heart-fill' },
    { code: 'INSIGHTFUL', label: 'Insightful', icon: 'pi pi-bolt' },
  ];
  readonly supportedFeedModules = [
    'pos',
    'accounting',
    'hr',
    'expense',
    'hospitality',
    'sales',
    'procurement',
    'inventory',
    'reporting',
  ];
  feedThreads: Record<number, FeedThreadState> = {};
  threadInboxQuery = '';

  activeView: 'channel' | 'dm' | 'threads' = 'channel';
  activeChannelId = '';
  activeDmId = '';
  activeThreadId: string | null = null;
  activeThreadReplyToId: string | null = null;
  showPinnedPanel = false;
  showChannelDetails = false;
  showSearch = false;
  searchQuery = '';
  searchResults: { msg: Message; channelId: string; channelName: string }[] =
    [];
  selectedThreadMsg: Message | null = null;

  draft = '';
  threadReplyDraft = '';
  pendingFile: File | null = null;
  pendingAttachment: {
    name: string;
    size: string;
    type: string;
    previewUrl?: string;
  } | null = null;
  sendingMessage = false;
  sendingReply = false;
  uploadingAttachment = false;

  editingMessageId: string | null = null;
  editDraft = '';
  savingEdit = false;
  confirmDeleteId: string | null = null;
  editingReplyId: string | null = null;
  editReplyDraft = '';
  confirmDeleteReplyId: string | null = null;
  deletingIds = new Set<string>();
  reactingIds = new Set<string>();

  showAiToolbar = false;
  aiOutput = { visible: false, loading: false, title: '', content: '' };
  voiceListening = false;
  voiceSupported = false;
  private voiceFinalTranscript = '';
  private voiceManualStop = false;
  private recognition: any = null;

  channelModal = {
    open: false,
    mode: 'create' as 'create' | 'edit',
    name: '',
    description: '',
    channelType: 'PUBLIC' as 'PUBLIC' | 'PRIVATE',
    selectedUserIds: [] as number[],
    saving: false,
    error: '',
    editingChannelId: undefined as number | undefined,
    editingCreatedBy: undefined as number | undefined,
  };

  emailModal = {
    open: false,
    recipients: [] as { email: string; name: string; locked: boolean }[],
    toInput: '',
    subject: '',
    body: '',
    sending: false,
    result: '',
    width: 640,
  };

  callModal = {
    open: false,
    type: 'CALL' as 'CALL' | 'VIDEO_CALL',
    targetName: '',
    targetUserId: 0,
    status: 'ringing' as 'ringing' | 'connected' | 'ended' | 'failed',
    duration: 0,
    muted: false,
    videoOff: false,
  };
  private callDurationTimer: any = null;

  memberMenu = { open: false, memberId: 0, userId: 0 };

  workspaceHighlights: CollaborationFeedHighlight[] = [];

  workspaceFocusItems: CollaborationFocusItem[] = [];

  readonly workspaceMoments: CollaborationMoment[] = [
    { id: 1, title: 'Leadership stand-up', time: '9:30 AM', type: 'Meeting' },
    { id: 2, title: 'Quarterly review pack due', time: '1:00 PM', type: 'Deadline' },
    { id: 3, title: 'Policy rollout note', time: '3:45 PM', type: 'Update' },
  ];

  sidebarWidth = 240;
  threadPanelWidth = 460;
  readonly SIDEBAR_MIN = 200;
  readonly SIDEBAR_MAX = 340;
  readonly THREAD_MIN = 360;
  readonly THREAD_MAX = 720;
  isResizingSidebar = false;
  isResizingThread = false;
  private resizeStartX = 0;
  private resizeStartWidth = 0;

  channels: Channel[] = [];
  dmContacts: DmContact[] = [];
  allEmployees: EmployeeProfile[] = [];
  channelMessages: Record<string, Message[]> = {};
  dmMessages: Record<string, Message[]> = {};
  channelMembers: CollabMember[] = [];
  bannedChannelMembers: CollabMember[] = [];
  channelMembersLoading = false;

  channelsLoading = true;
  channelsError: string | null = null;
  employeesLoading = true;
  employeesError: string | null = null;
  messagesLoading = false;
  soundEnabled = true;

  presenceMap: Record<number, string> = {};
  typingMap: Record<number, boolean> = {};
  private typingTimer: any = null;
  private presencePollTimer: any = null;
  private presenceChannelId: number | null = null;

  private userDirectory: Record<number, string> = {};
  private userEmailCache: Record<number, string> = {};
  private imageCache: Record<string, string> = {};
  private userAvatarCache: Record<number, string> = {};
  private readStateMap: Record<number, number[]> = {};
  private lastMessageBackendId: number | null = null;
  private attachmentPreviewCache: Record<string, string> = {};
  private attachmentPreviewLoading = new Set<string>();
  private flashId: string | null = null;
  private flashTimer: any;
  private scrollFeed = false;
  private scrollThread = false;

  private stompClient: any = null;
  private wsConnected = false;
  private channelSub: any = null;
  private channelPresenceSub: any = null;
  private dmChannelSubs = new Map<number, any>();
  private dmPresenceSubs = new Map<number, any>();

  constructor(
    private cdr: ChangeDetectorRef,
    private collabService: CollaborationService,
    private headerStateService: HeaderStateService,
  ) {}

  ngOnInit() {
    this.workspaceMode =
      sessionStorage.getItem('optimax_workspace_mode') === 'chat'
        ? 'chat'
        : 'feed';
    sessionStorage.removeItem('optimax_workspace_mode');
    if (this.workspaceMode !== 'chat') {
      this.workspaceMode = 'feed';
    }
    if (typeof window !== 'undefined') {
      window.addEventListener(
        'optimax-open-collab-target',
        this.handleNotificationTarget as EventListener,
      );
    }
    this.checkVoiceSupport();
    this.loadCurrentUser();
    this.loadFeedHome();
    this.loadChannels();
    this.loadEmployees();
    this.startPresencePoll();
  }

  ngOnDestroy() {
    if (this.flashTimer) clearTimeout(this.flashTimer);
    if (this.typingTimer) clearTimeout(this.typingTimer);
    if (this.presencePollTimer) clearInterval(this.presencePollTimer);
    if (this.callDurationTimer) clearInterval(this.callDurationTimer);
    if (this.recognition) {
      try {
        this.voiceManualStop = true;
        this.recognition.stop();
      } catch (_) {}
    }
    this.disconnectWebSocket();
    Object.values(this.imageCache).forEach((url) => URL.revokeObjectURL(url));
    Object.values(this.userAvatarCache).forEach((url) =>
      URL.revokeObjectURL(url),
    );
    Object.values(this.attachmentPreviewCache).forEach((url) =>
      URL.revokeObjectURL(url),
    );
    this.clearFeedMediaSelection();
    this.clearPendingAttachment(false);
    if (typeof window !== 'undefined') {
      window.removeEventListener(
        'optimax-open-collab-target',
        this.handleNotificationTarget as EventListener,
      );
    }
  }

  ngAfterViewChecked() {
    if (this.scrollFeed && this.feedEl?.nativeElement) {
      this.feedEl.nativeElement.scrollTop =
        this.feedEl.nativeElement.scrollHeight;
      this.scrollFeed = false;
    }
    if (this.scrollThread && this.threadEl?.nativeElement) {
      this.threadEl.nativeElement.scrollTop =
        this.threadEl.nativeElement.scrollHeight;
      this.scrollThread = false;
    }
  }

  get unreadWorkspaceCount(): number {
    const channelUnread = this.channels.reduce(
      (total, channel) => total + (channel.unreadCount || 0),
      0,
    );
    const dmUnread = this.dmContacts.reduce(
      (total, contact) => total + (contact.unreadCount || 0),
      0,
    );
    return channelUnread + dmUnread;
  }

  private syncHeaderState(): void {
    const unreadChannels = this.channels.reduce(
      (total, channel) => total + (channel.unreadCount || 0),
      0,
    );
    const unreadDirectMessages = this.dmContacts.reduce(
      (total, contact) => total + (contact.unreadCount || 0),
      0,
    );
    this.headerStateService.updateUnreadCounts({
      unreadChannels,
      unreadDirectMessages,
    });
  }

  private pushWorkspaceNotification(payload: {
    title: string;
    body: string;
    category: 'chat' | 'feed' | 'module' | 'system';
    route?: string;
    avatarUrl?: string;
    contextLabel?: string;
    workspaceMode?: 'feed' | 'chat';
    channelBackendId?: number;
    dmUserId?: number;
  }): void {
    this.headerStateService.pushNotification(payload);
  }

  get workspaceStatusLabel(): string {
    if (this.workspaceMode === 'feed') return 'Enterprise feed';
    if (this.activeView === 'threads') return 'Thread collaboration';
    if (this.activeView === 'dm') return 'Direct conversation';
    return 'Channel collaboration';
  }

  get filteredThreadMessages(): Message[] {
    const query = this.threadInboxQuery.trim().toLowerCase();
    if (!query) return this.threadMessages;
    return this.threadMessages.filter((message) =>
      [
        message.author,
        message.content,
        message.sourceLabel,
        message.sourceSecondaryLabel,
        message.threadSummary,
        ...(message.replies || []).map((reply) => reply.content),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }

  get canManageChannels(): boolean {
    const rawRole = sessionStorage.getItem('role') || '';
    return rawRole.toUpperCase().includes('ROLE_ADMIN');
  }

  get canAdministerActiveChannel(): boolean {
    return this.canManageChannels || this.isChannelOwner();
  }

  get selectedFeedPost(): CollabFeedPost | undefined {
    return this.feedPosts.find((post) => post.id === this.selectedFeedPostId);
  }

  get selectedFeedThreadState(): FeedThreadState | null {
    if (!this.selectedFeedPostId) return null;
    return this.feedThreads[this.selectedFeedPostId] || null;
  }

  highlightToneClass(tone: CollaborationFeedHighlight['tone']): string {
    return `highlight-${tone}`;
  }

  highlightToneLabel(tone: CollaborationFeedHighlight['tone']): string {
    if (tone === 'focus') return 'Needs attention';
    if (tone === 'success') return 'Positive momentum';
    return 'Team update';
  }

  focusStatusClass(status: CollaborationFocusItem['status']): string {
    return `focus-${status.toLowerCase().replace(/\s+/g, '-')}`;
  }

  setWorkspaceMode(mode: 'feed' | 'chat'): void {
    this.workspaceMode = mode;
  }

  onFeedComposerInput(event: Event): void {
    const editor = event.target as HTMLDivElement;
    this.postComposer.body = editor.innerHTML || '';
    const draft = (editor.innerText || this.extractTextFromHtml(this.postComposer.body) || '').trimEnd();
    const target = {
      mentionResults: this.feedComposerMentionResults,
      showMentionMenu: this.feedComposerShowMentionMenu,
    } as FeedMentionTarget;
    this.updateMentionResults(draft, target);
    this.feedComposerMentionResults = target.mentionResults;
    this.feedComposerShowMentionMenu = target.showMentionMenu;
    this.cdr.detectChanges();
  }

  applyMentionToComposer(employee: EmployeeProfile): void {
    const plainText = this.extractTextFromHtml(this.postComposer.body || '');
    const replaced = this.replaceMentionToken(plainText, employee);
    if (this.feedComposerEl?.nativeElement) {
      this.feedComposerEl.nativeElement.innerText = replaced;
      this.placeCaretAtEnd(this.feedComposerEl.nativeElement);
      this.postComposer.body = this.feedComposerEl.nativeElement.innerHTML || '';
    } else {
      this.postComposer.body = replaced;
    }
    this.feedComposerShowMentionMenu = false;
    this.feedComposerMentionResults = [];
    this.cdr.detectChanges();
  }

  private placeCaretAtEnd(element: HTMLElement): void {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
    element.focus();
  }

  focusFeedComposer(): void {
    this.feedComposerEl?.nativeElement.focus();
  }

  applyFeedFormatting(command: 'bold' | 'italic' | 'insertUnorderedList'): void {
    this.focusFeedComposer();
    document.execCommand(command);
    this.postComposer.body = this.feedComposerEl?.nativeElement.innerHTML || '';
    this.cdr.detectChanges();
  }

  insertFeedType(postType: string): void {
    this.postComposer.postType = postType;
    this.insertFeedToken(`[${postType}] `);
  }

  insertFeedTag(tag = '#team'): void {
    this.insertFeedToken(`${tag} `);
  }

  insertFeedModule(moduleCode: string): void {
    this.insertFeedToken(`@${moduleCode.toLowerCase()} `);
  }

  private insertFeedToken(token: string): void {
    this.focusFeedComposer();
    document.execCommand('insertText', false, token);
    this.postComposer.body = this.feedComposerEl?.nativeElement.innerHTML || '';
    this.cdr.detectChanges();
  }

  private handleNotificationTarget = (event: CustomEvent): void => {
    this.openNotificationTarget(event.detail);
  };

  private openNotificationTarget(target: any): void {
    if (!target) {
      try {
        target = JSON.parse(
          sessionStorage.getItem('optimax_notification_target') || 'null',
        );
      } catch (_) {
        target = null;
      }
    }
    if (!target) return;
    sessionStorage.removeItem('optimax_notification_target');
    if (target.workspaceMode === 'chat') {
      this.workspaceMode = 'chat';
      if (target.dmUserId) {
        const contact = this.dmContacts.find(
          (item) => Number(item.userId) === Number(target.dmUserId),
        );
        if (contact) {
          this.selectDm(contact.id, true);
          return;
        }
      }
      if (target.channelBackendId) {
        const channel = this.channels.find(
          (item) => Number(item.backendId) === Number(target.channelBackendId),
        );
        if (channel) {
          this.selectChannel(channel.id, true);
          return;
        }
      }
    }
    this.workspaceMode = 'feed';
  }

  onFeedMediaSelected(event: Event): void {
    this.collectFeedMediaDrafts(event, this.selectedFeedMedia);
    this.cdr.detectChanges();
  }

  removeFeedMedia(index: number): void {
    this.removeFeedMediaDraft(this.selectedFeedMedia, index);
    this.cdr.detectChanges();
  }

  removeFeedMediaItem(media: FeedMediaDraft): void {
    const index = this.selectedFeedMedia.indexOf(media);
    if (index >= 0) {
      this.removeFeedMedia(index);
    }
  }

  removeExistingFeedPostMedia(index: number): void {
    this.editingFeedPostMedia.splice(index, 1);
    this.cdr.detectChanges();
  }

  onFeedCommentMediaSelected(postId: number, event: Event): void {
    this.ensureFeedThread(postId);
    this.collectFeedMediaDrafts(event, this.feedThreads[postId].mediaDrafts);
    this.cdr.detectChanges();
  }

  removeFeedCommentMedia(postId: number, index: number): void {
    this.ensureFeedThread(postId);
    this.removeFeedMediaDraft(this.feedThreads[postId].mediaDrafts, index);
    this.cdr.detectChanges();
  }

  onFeedReplyMediaSelected(comment: FeedCommentNode, event: Event): void {
    this.collectFeedMediaDrafts(event, comment.replyMediaDrafts);
    this.cdr.detectChanges();
  }

  removeFeedReplyMedia(comment: FeedCommentNode, index: number): void {
    this.removeFeedMediaDraft(comment.replyMediaDrafts, index);
    this.cdr.detectChanges();
  }

  loadFeedHome(page = 1): void {
    this.feedHomeLoading = true;
    this.feedHomeError = null;
    this.collabService.getFeedHome(this.feedQuery, page, 10).subscribe({
      next: (home) => {
        this.feedHome = home;
        this.featuredFeedPosts = home?.featuredPosts || [];
        this.feedPosts = home?.feed?.content || [];
        this.trendingTags = home?.trendingTags || [];
        this.workspaceHighlights = this.buildWorkspaceHighlights(this.featuredFeedPosts, this.feedPosts);
        this.workspaceFocusItems = this.buildWorkspaceFocusItems(this.feedPosts);
        if (!this.selectedFeedPostId && this.feedPosts.length) {
          this.selectedFeedPostId = this.feedPosts[0].id;
        }
        this.feedHomeLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.collabService.getFeedPosts(this.feedQuery, undefined, page, 10, true).subscribe({
          next: (result) => {
            this.feedPosts = result?.content || [];
            this.featuredFeedPosts = this.feedPosts.filter((post) => post.featured).slice(0, 4);
            this.trendingTags = this.buildTrendingTags(this.feedPosts);
            this.workspaceHighlights = this.buildWorkspaceHighlights(this.featuredFeedPosts, this.feedPosts);
            this.workspaceFocusItems = this.buildWorkspaceFocusItems(this.feedPosts);
            this.feedHome = {
              featuredPosts: this.featuredFeedPosts,
              feed: result,
              trendingTags: this.trendingTags,
              suggestedChannels: this.channels.slice(0, 5).map((channel) => ({
                id: channel.backendId,
                channelId: channel.backendId,
                channelCode: channel.name,
                name: channel.name,
                description: channel.description || '',
                channelType: channel.channelType || 'PUBLIC',
                status: 'ACTIVE',
                createdBy: channel.createdBy || 0,
                createdAt: [],
              })),
              activeChatCount: this.dmContacts.length,
            };
            if (!this.selectedFeedPostId && this.feedPosts.length) {
              this.selectedFeedPostId = this.feedPosts[0].id;
            }
            this.feedHomeLoading = false;
            this.feedHomeError = this.feedPosts.length ? null : 'Could not load enterprise feed.';
            this.cdr.detectChanges();
          },
          error: () => {
            this.feedHomeError = 'Could not load enterprise feed.';
            this.feedHomeLoading = false;
            this.cdr.detectChanges();
          },
        });
      },
    });
  }

  refreshFeed(): void {
    this.loadFeedHome();
  }

  onFeedSearchEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    this.loadFeedHome();
  }

  selectFeedPost(post: CollabFeedPost): void {
    this.selectedFeedPostId = post.id;
    this.ensureFeedThread(post.id);
  }

  ensureFeedThread(postId: number): void {
    if (!this.feedThreads[postId]) {
      this.feedThreads[postId] = {
        expanded: false,
        loading: false,
        comments: [],
        draft: '',
        mediaDrafts: [],
        searchQuery: '',
        searchLoading: false,
        searchResults: [],
        mentionResults: [],
        showMentionMenu: false,
      };
    }
  }

  toggleFeedThread(post: CollabFeedPost): void {
    this.selectFeedPost(post);
    const state = this.feedThreads[post.id];
    state.expanded = !state.expanded;
    if (state.expanded && state.comments.length === 0) {
      this.loadFeedComments(post.id);
    }
  }

  openFeedComments(post: CollabFeedPost): void {
    this.selectFeedPost(post);
    const state = this.feedThreads[post.id];
    if (!state.expanded) {
      state.expanded = true;
    }
    if (state.comments.length === 0) {
      this.loadFeedComments(post.id);
      return;
    }
    this.cdr.detectChanges();
  }

  private loadFeedComments(postId: number): void {
    this.ensureFeedThread(postId);
    const state = this.feedThreads[postId];
    state.loading = true;
    this.collabService.getFeedComments(postId, 1, 50).subscribe({
      next: (result) => {
        state.comments = this.buildFeedCommentTree(result?.content || []);
        state.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        state.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private createFeedCommentNode(comment: CollabFeedComment, depth = 0): FeedCommentNode {
    return {
      ...comment,
      replies: [],
      depth,
      replyOpen: false,
      replyDraft: '',
      replyMediaDrafts: [],
      mentionResults: [],
      showMentionMenu: false,
    };
  }

  private prependFeedComment(postId: number, comment: CollabFeedComment): void {
    this.ensureFeedThread(postId);
    const state = this.feedThreads[postId];
    state.comments = [this.createFeedCommentNode(comment, 0), ...state.comments];
  }

  private appendFeedReply(postId: number, parentCommentId: number, comment: CollabFeedComment): void {
    this.ensureFeedThread(postId);
    const state = this.feedThreads[postId];
    const parent = this.findFeedCommentNode(state.comments, parentCommentId);
    if (!parent || parent.depth >= 2) {
      state.comments = this.buildFeedCommentTree([...state.comments, comment]);
      return;
    }
    parent.replies = [...parent.replies, this.createFeedCommentNode(comment, parent.depth + 1)];
  }

  private findFeedCommentNode(nodes: FeedCommentNode[], id: number): FeedCommentNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      const nested = this.findFeedCommentNode(node.replies, id);
      if (nested) return nested;
    }
    return null;
  }

  private bumpFeedCommentCount(postId: number, increment: number): void {
    this.feedPosts = this.feedPosts.map((post) =>
      post.id === postId
        ? { ...post, commentCount: Number(post.commentCount || 0) + increment }
        : post,
    );
    this.featuredFeedPosts = this.featuredFeedPosts.map((post) =>
      post.id === postId
        ? { ...post, commentCount: Number(post.commentCount || 0) + increment }
        : post,
    );
  }

  async submitFeedPost(): Promise<void> {
    const body = this.postComposer.body.trim();
    if (!body || this.creatingPost) return;
    this.creatingPost = true;
    this.feedMediaError = '';
    try {
      const bodyText = this.extractTextFromHtml(body);
      const parsedPostType = this.extractPostType(bodyText) || this.postComposer.postType;
      const newMediaItems = await this.uploadSelectedFeedMedia();
      const mediaItems = [...this.editingFeedPostMedia, ...newMediaItems];
      const payload = {
        body,
        coverImageUrl: mediaItems[0]?.thumbnailUrl || mediaItems[0]?.url,
        mediaItems,
        tags: this.extractTags(bodyText),
        moduleCodes: this.extractModuleCodes(bodyText),
        postType: parsedPostType,
        status: 'PUBLISHED',
        allowComments: true,
        allowReactions: true,
      };
      if (this.editingFeedPostId) {
        await firstValueFrom(
          this.collabService.updateFeedPost(this.editingFeedPostId, payload),
        );
      } else {
        await firstValueFrom(this.collabService.createFeedPost(payload));
      }
      this.resetFeedComposer();
      this.creatingPost = false;
      this.loadFeedHome();
    } catch (error: any) {
      this.feedMediaError =
        error?.error?.message ||
        error?.message ||
        'Could not post the update with media.';
      this.creatingPost = false;
      this.cdr.detectChanges();
    }
  }

  startEditFeedPost(post: CollabFeedPost): void {
    if (!this.isOwnFeedPost(post)) return;
    this.editingFeedPostId = post.id;
    this.editingFeedPostMedia = [...(post.mediaItems || [])];
    this.postComposer = {
      body: post.body || '',
      postType: post.postType || 'UPDATE',
    };
    if (this.feedComposerEl?.nativeElement) {
      this.feedComposerEl.nativeElement.innerHTML = post.body || '';
    }
    this.feedComposerShowMentionMenu = false;
    this.feedComposerMentionResults = [];
    this.feedMediaError = '';
    this.cdr.detectChanges();
    this.focusFeedComposer();
  }

  cancelFeedPostEdit(): void {
    this.resetFeedComposer();
    this.cdr.detectChanges();
  }

  deleteFeedPost(post: CollabFeedPost): void {
    if (!this.isOwnFeedPost(post)) return;
    if (!window.confirm('Delete this post?')) return;
    this.collabService.deleteFeedPost(post.id).subscribe({
      next: () => {
        this.feedPosts = this.feedPosts.filter((item) => item.id !== post.id);
        this.featuredFeedPosts = this.featuredFeedPosts.filter(
          (item) => item.id !== post.id,
        );
        delete this.feedThreads[post.id];
        if (this.selectedFeedPostId === post.id) {
          this.selectedFeedPostId = this.feedPosts[0]?.id || null;
        }
        if (this.editingFeedPostId === post.id) {
          this.resetFeedComposer();
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.feedMediaError =
          error?.error?.message || 'Could not delete the post right now.';
        this.cdr.detectChanges();
      },
    });
  }

  submitFeedComment(post: CollabFeedPost): void {
    this.ensureFeedThread(post.id);
    const state = this.feedThreads[post.id];
    const content = state.draft.trim();
    if (!content && !state.mediaDrafts.length) return;
    this.uploadFeedDraftMedia(state.mediaDrafts)
      .then((mediaItems) =>
        firstValueFrom(
          this.collabService.createFeedComment(
            post.id,
            content,
            undefined,
            mediaItems,
          ),
        ),
      )
      .then((created) => {
        state.draft = '';
        state.showMentionMenu = false;
        state.mentionResults = [];
        this.clearFeedMediaDrafts(state.mediaDrafts);
        state.mediaDrafts = [];
        this.prependFeedComment(post.id, created);
        this.bumpFeedCommentCount(post.id, 1);
        this.cdr.detectChanges();
      })
      .catch(() => this.cdr.detectChanges());
  }

  submitFeedReply(post: CollabFeedPost, comment: FeedCommentNode): void {
    const content = comment.replyDraft.trim();
    if (!content && !comment.replyMediaDrafts.length) return;
    this.uploadFeedDraftMedia(comment.replyMediaDrafts)
      .then((mediaItems) =>
        firstValueFrom(
          this.collabService.createFeedComment(
            post.id,
            content,
            comment.id,
            mediaItems,
          ),
        ),
      )
      .then((created) => {
        comment.replyDraft = '';
        comment.replyOpen = false;
        comment.mentionResults = [];
        comment.showMentionMenu = false;
        this.clearFeedMediaDrafts(comment.replyMediaDrafts);
        comment.replyMediaDrafts = [];
        this.appendFeedReply(post.id, comment.id, created);
        this.bumpFeedCommentCount(post.id, 1);
        this.cdr.detectChanges();
      })
      .catch(() => this.cdr.detectChanges());
  }

  searchFeedThread(post: CollabFeedPost): void {
    this.ensureFeedThread(post.id);
    const state = this.feedThreads[post.id];
    const query = state.searchQuery.trim();
    if (!query) {
      state.searchResults = [];
      return;
    }
    state.searchLoading = true;
    this.collabService.searchFeedComments(post.id, query, 1, 20).subscribe({
      next: (result) => {
        state.searchResults = result?.content || [];
        state.searchLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        state.searchLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleFeedReaction(post: CollabFeedPost, reactionCode = 'LIKE'): void {
    const currentReaction = (post.actorReactionCode || '').toUpperCase();
    const request = currentReaction === reactionCode
      ? this.collabService.removeFeedReaction(post.id)
      : this.collabService.reactToFeedPost(post.id, reactionCode);

    request.subscribe({
      next: () => {
        this.loadFeedHome();
        if (this.feedThreads[post.id]?.expanded) {
          this.loadFeedComments(post.id);
        }
      },
      error: () => this.cdr.detectChanges(),
    });
  }

  toggleFeedCommentReaction(
    post: CollabFeedPost,
    comment: FeedCommentNode,
    reactionCode = 'LIKE',
  ): void {
    const currentReaction = (comment.actorReactionCode || '').toUpperCase();
    const request = currentReaction === reactionCode
      ? this.collabService.removeFeedCommentReaction(post.id, comment.id)
      : this.collabService.reactToFeedComment(post.id, comment.id, reactionCode);

    request.subscribe({
      next: () => {
        this.loadFeedComments(post.id);
        this.loadFeedHome();
      },
      error: () => this.cdr.detectChanges(),
    });
  }

  isFeedCommentReactionActive(comment: FeedCommentNode, reactionCode: string): boolean {
    return (comment.actorReactionCode || '').toUpperCase() === reactionCode;
  }

  feedCommentReactionValue(comment: FeedCommentNode, reactionCode: string): number {
    return Number(comment.reactionBreakdown?.[reactionCode] || 0);
  }

  openFeedChannel(post: CollabFeedPost): void {
    const channelId = Number(post.channel?.channelId ?? post.channel?.id ?? 0);
    const channel = this.channels.find((item) => item.backendId === channelId);
    this.workspaceMode = 'chat';
    if (channel) {
      this.selectChannel(channel.id);
    }
  }

  openSuggestedChannel(channel: CollabChannel): void {
    this.workspaceMode = 'chat';
    const channelId = Number(channel.channelId ?? channel.id ?? 0);
    const current = this.channels.find((item) => item.backendId === channelId);
    if (current) {
      this.selectChannel(current.id);
    }
  }

  toggleFeedCommentReply(comment: FeedCommentNode): void {
    comment.replyOpen = !comment.replyOpen;
    if (!comment.replyOpen) {
      comment.replyDraft = '';
      comment.mentionResults = [];
      comment.showMentionMenu = false;
    }
    this.cdr.detectChanges();
  }

  onFeedCommentDraftInput(postId: number, value: string): void {
    const state = this.feedThreads[postId];
    state.draft = value;
    this.updateMentionResults(value, state);
    this.cdr.detectChanges();
  }

  onFeedReplyDraftInput(comment: FeedCommentNode, value: string): void {
    comment.replyDraft = value;
    this.updateMentionResults(value, comment);
    this.cdr.detectChanges();
  }

  applyMentionToThread(postId: number, employee: EmployeeProfile): void {
    const state = this.feedThreads[postId];
    state.draft = this.replaceMentionToken(state.draft, employee);
    state.showMentionMenu = false;
    state.mentionResults = [];
  }

  applyMentionToReply(comment: FeedCommentNode, employee: EmployeeProfile): void {
    comment.replyDraft = this.replaceMentionToken(comment.replyDraft, employee);
    comment.showMentionMenu = false;
    comment.mentionResults = [];
  }

  private updateMentionResults(
    draft: string,
    target: { mentionResults: EmployeeProfile[]; showMentionMenu: boolean },
  ): void {
    const mentionMatch = draft.match(/(?:^|\s)@([^\s@]*)$/);
    if (!mentionMatch) {
      target.showMentionMenu = false;
      target.mentionResults = [];
      return;
    }
    const query = (mentionMatch[1] || '').trim().toLowerCase();
    target.mentionResults = this.allEmployees
      .filter((employee) => {
        const fullName = this.feedMentionLabel(employee).toLowerCase();
        const username = (employee.user?.username || '').toLowerCase();
        const email = (employee.user?.email || '').toLowerCase();
        return !query || fullName.includes(query) || username.includes(query) || email.includes(query);
      })
      .slice(0, 6);
    if ('all'.startsWith(query)) {
      target.mentionResults = [
        {
          id: -1,
          firstName: 'all',
          lastName: '',
          user: { id: -1, fullname: 'all', userId: -1, username: 'all' },
        } as EmployeeProfile,
        ...target.mentionResults.filter((employee) => employee.id !== -1),
      ].slice(0, 6);
    }
    target.showMentionMenu = target.mentionResults.length > 0;
  }

  private replaceMentionToken(draft: string, employee: EmployeeProfile): string {
    const mentionName = `@${this.feedMentionLabel(employee)}`.trim();
    return draft.replace(/(?:^|\s)@([^\s@]*)$/, (match) => {
      const prefix = match.startsWith(' ') ? ' ' : '';
      return `${prefix}${mentionName} `;
    });
  }

  feedMentionLabel(employee: EmployeeProfile): string {
    const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
    return fullName || employee.user?.fullname || employee.user?.username || `Employee ${employee.id}`;
  }

  private buildFeedCommentTree(comments: CollabFeedComment[]): FeedCommentNode[] {
    const nodes: FeedCommentNode[] = comments.map((comment) => ({
      ...comment,
      replies: [],
      depth: 0,
      replyOpen: false,
      replyDraft: '',
      replyMediaDrafts: [],
      mentionResults: [],
      showMentionMenu: false,
    }));
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const roots: FeedCommentNode[] = [];

    for (const node of nodes) {
      const parentId = node.parentCommentId;
      if (parentId && byId.has(parentId)) {
        const parent = byId.get(parentId)!;
        if (parent.depth < 2) {
          node.depth = parent.depth + 1;
          parent.replies.push(node);
          continue;
        }
      }
      roots.push(node);
    }

    return roots;
  }

  private parseIncomingNotification(frameBody: string): {
    senderName: string;
    content: string;
    senderUserId?: number;
    avatarUrl?: string;
    contextLabel?: string;
  } {
    try {
      const payload = JSON.parse(frameBody || '{}');
      const senderUserId = Number(payload.senderUserId ?? payload.userId ?? 0);
      const senderName =
        this.userDirectory[senderUserId] ||
        payload.senderName ||
        payload.authorName ||
        'New message';
      const content = String(payload.content || payload.message || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);
      return {
        senderName,
        content,
        senderUserId,
        avatarUrl: this.userAvatarCache[senderUserId],
        contextLabel: payload.channelName || payload.channelCode || payload.channelType || 'New message',
      };
    } catch (_) {
      return { senderName: 'New message', content: '', contextLabel: 'New message' };
    }
  }

  private buildTrendingTags(posts: CollabFeedPost[]): string[] {
    const counts = new Map<string, number>();
    for (const post of posts) {
      for (const tag of post.tags || []) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag);
  }

  private buildWorkspaceHighlights(featuredPosts: CollabFeedPost[], posts: CollabFeedPost[]): CollaborationFeedHighlight[] {
    const source = [...featuredPosts, ...posts].slice(0, 3);
    return source.map((post, index) => ({
      id: post.id || index + 1,
      author: this.feedAuthorName(post.author),
      role: (post.moduleCodes || []).slice(0, 2).join(' • ') || (post.postType || 'UPDATE'),
      timeAgo: this.feedPublishedLabel(post.publishedAt || post.createdAt),
      content: this.extractTextFromHtml(post.summary || post.body || '').slice(0, 140) || 'New collaboration highlight available.',
      tone: index === 0 ? 'focus' : index === 1 ? 'info' : 'success',
    }));
  }

  private buildWorkspaceFocusItems(posts: CollabFeedPost[]): CollaborationFocusItem[] {
    return posts.slice(0, 3).map((post, index) => ({
      id: post.id || index + 1,
      title: post.title || `${post.postType || 'Update'} follow-up`,
      owner: this.feedAuthorName(post.author),
      due: this.feedPublishedLabel(post.publishedAt || post.createdAt),
      status: index === 0 ? 'Pending' : index === 1 ? 'In Progress' : 'Review',
    }));
  }

  clearPendingAttachment(refresh = true): void {
    if (this.pendingAttachment?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.pendingAttachment.previewUrl);
    }
    this.pendingFile = null;
    this.pendingAttachment = null;
    if (refresh) {
      this.cdr.detectChanges();
    }
  }

  feedAuthorName(user?: any): string {
    if (!user) return 'Unknown author';
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return fullName || user.fullname || user.username || `User ${user.userId || user.id || ''}`.trim();
  }

  feedAuthorInitials(user?: any): string {
    return initialsFrom(this.feedAuthorName(user));
  }

  feedAuthorColor(seed: number): string {
    return _colorFor(seed || 1);
  }

  feedPublishedLabel(raw?: string | number[]): string {
    return formatRelativeTime(raw) || 'just now';
  }

  feedCommentCount(post: CollabFeedPost): number {
    return Number(post.commentCount || post.recentComments?.length || 0);
  }

  feedAuthorAvatarUrl(user?: any): string | undefined {
    const userId = Number(user?.userId || user?.id || 0);
    return userId ? this.userAvatarCache[userId] : undefined;
  }

  isOwnFeedPost(post: CollabFeedPost): boolean {
    const authorUserId = Number(post.author?.userId || post.author?.id || 0);
    return !!authorUserId && authorUserId === Number(this.me.userId || 0);
  }

  feedReactionCount(post: CollabFeedPost): number {
    return Number(post.reactionCount || 0);
  }

  feedImageUrl(post: CollabFeedPost): string {
    return this.resolveProtectedMediaUrl(
      post.coverImageUrl || post.mediaItems?.[0]?.url || '',
    );
  }

  feedMediaItems(post: CollabFeedPost): CollabFeedMediaItem[] {
    return (post.mediaItems || []).filter((item) => Boolean(item?.url));
  }

  feedImageItems(post: CollabFeedPost): CollabFeedMediaItem[] {
    return this.feedMediaItems(post).filter((item) => this.isFeedImageItem(item));
  }

  feedNonImageItems(post: CollabFeedPost): CollabFeedMediaItem[] {
    return this.feedMediaItems(post).filter((item) => !this.isFeedImageItem(item));
  }

  feedMediaGridClass(imageCount: number): string {
    if (imageCount <= 1) return 'single';
    if (imageCount === 2) return 'duo';
    if (imageCount === 3) return 'trio';
    return 'quad';
  }

  selectedFeedMediaImages(): FeedMediaDraft[] {
    return this.selectedFeedMedia.filter((media) =>
      media.type.startsWith('image/'),
    );
  }

  selectedFeedMediaOthers(): FeedMediaDraft[] {
    return this.selectedFeedMedia.filter(
      (media) => !media.type.startsWith('image/'),
    );
  }

  selectedFeedMediaGridClass(): string {
    return this.feedMediaGridClass(this.selectedFeedMediaImages().length);
  }

  feedMediaUrl(item?: CollabFeedMediaItem): string {
    return this.resolveProtectedMediaUrl(item?.url || '');
  }

  feedMediaPoster(item?: CollabFeedMediaItem): string {
    return this.resolveProtectedMediaUrl(item?.thumbnailUrl || item?.url || '');
  }

  openFeedMediaDialog(url: string, label = 'Image preview'): void {
    if (!url) return;
    this.expandedFeedMediaUrl = url;
    this.expandedFeedMediaLabel = label;
    this.feedMediaViewerOpen = true;
  }

  closeFeedMediaDialog(): void {
    this.feedMediaViewerOpen = false;
    this.expandedFeedMediaUrl = '';
    this.expandedFeedMediaLabel = '';
  }

  isFeedImageItem(item?: CollabFeedMediaItem): boolean {
    return (item?.mediaType || '').toUpperCase() === 'IMAGE';
  }

  isFeedVideoItem(item?: CollabFeedMediaItem): boolean {
    return (item?.mediaType || '').toUpperCase() === 'VIDEO';
  }

  feedMediaLabel(item?: CollabFeedMediaItem, index = 0): string {
    const caption = (item?.caption || '').trim();
    if (caption) return caption;
    const type = (item?.mediaType || 'FILE').toUpperCase();
    if (type === 'IMAGE') return `Image ${index + 1}`;
    if (type === 'VIDEO') return `Video ${index + 1}`;
    return `Attachment ${index + 1}`;
  }

  feedDisplayBody(post: CollabFeedPost): string {
    const rawBody = (post.body || post.summary || '').trim();
    if (!rawBody) return '';
    const cleaned = rawBody
      .replace(/\[(UPDATE|ANNOUNCEMENT|EVENT|CELEBRATION|KNOWLEDGE|ALERT)\]/gi, '')
      .replace(/(^|\s)@(pos|accounting|hr|expense|hospitality|sales|procurement|inventory|reporting)\b/gi, '$1')
      .trim();
    return cleaned.includes('<') ? cleaned : cleaned.replace(/\n/g, '<br>');
  }

  feedReactionValue(post: CollabFeedPost, reactionCode: string): number {
    return Number(post.reactionBreakdown?.[reactionCode] || 0);
  }

  isFeedReactionActive(post: CollabFeedPost, reactionCode: string): boolean {
    return (post.actorReactionCode || '').toUpperCase() === reactionCode;
  }

  feedReactionHoverText(scope: 'post' | 'comment', id: number, reactionCode: string): string {
    return this.feedReactionHoverCache[`${scope}:${id}:${reactionCode}`] || '';
  }

  loadFeedReactionUsers(
    scope: 'post' | 'comment',
    id: number,
    reactionCode: string,
  ): void {
    const key = `${scope}:${id}:${reactionCode}`;
    if (this.feedReactionHoverCache[key]) return;
    const request =
      scope === 'post'
        ? this.collabService.getFeedPostReactions(id)
        : this.collabService.getFeedCommentReactions(id);
    request.subscribe({
      next: (rows) => {
        const names = (rows || [])
          .filter((row: CollabFeedReactionUser) => (row.reactionCode || '').toUpperCase() === reactionCode)
          .map((row: CollabFeedReactionUser) => this.feedAuthorName(row.user))
          .filter(Boolean);
        this.feedReactionHoverCache[key] = names.length
          ? names.slice(0, 8).join(', ')
          : 'No reactions yet';
        this.cdr.detectChanges();
      },
      error: () => {
        this.feedReactionHoverCache[key] = 'Reaction details unavailable';
      },
    });
  }

  private extractTextFromHtml(source: string): string {
    const element = document.createElement('div');
    element.innerHTML = source || '';
    return (element.textContent || element.innerText || '').trim();
  }

  private extractTags(source: string): string[] {
    const matches = source.match(/#([a-zA-Z0-9_-]+)/g) || [];
    return Array.from(new Set(matches.map((item) => item.replace(/^#/, '').toLowerCase())));
  }

  private extractModuleCodes(source: string): string[] {
    return this.supportedFeedModules.filter((moduleCode) =>
      new RegExp(`(^|\\s)@${moduleCode}(\\b|\\s|$)`, 'i').test(source),
    );
  }

  private extractPostType(source: string): string | undefined {
    const match = source.match(/\[(UPDATE|ANNOUNCEMENT|EVENT|CELEBRATION|KNOWLEDGE|ALERT)\]/i);
    return match?.[1]?.toUpperCase();
  }

  // ── WebSocket ─────────────────────────────────────────

  private connectWebSocket(): void {
    const token = sessionStorage.getItem('token') || '';
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const userId = sessionStorage.getItem('userid') || '';
    const baseUrl = (this.collabService.apiBaseUrl || '').replace(/\/+$/, '');
    const wsUrl = baseUrl.startsWith('https://')
      ? `wss://${baseUrl.replace('https://', '')}/x/ws/collab`
      : `ws://${baseUrl.replace('http://', '')}/x/ws/collab`;

    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      connectHeaders: {
        Authorization: token ? `Bearer ${token}` : '',
        'X-Tenant-ID': tenantId,
        'X-User-ID': userId,
      },
    });
    this.stompClient = client;

    client.onConnect = () => {
      this.wsConnected = true;
      client.subscribe(
        `/topic/collab/chat/user/${this.me.userId}/unread`,
        () => {
          this.loadChannels(true);
        },
      );
      if (this.activeChannelId) {
        const ch = this.activeChannel;
        if (ch) this.subscribeToChannel(ch.backendId);
      }
      for (const dm of this.dmContacts) {
        if (dm.dmChannelId) this.subscribeToDmChannel(dm);
      }
    };
    client.onStompError = (frame) => console.error('STOMP ERROR:', frame);
    client.onWebSocketError = (err) => console.error('WS ERROR:', err);
    client.activate();
  }

  private disconnectWebSocket(): void {
    try {
      if (this.channelSub) {
        this.channelSub.unsubscribe();
        this.channelSub = null;
      }
      if (this.channelPresenceSub) {
        this.channelPresenceSub.unsubscribe();
        this.channelPresenceSub = null;
      }
      this.dmChannelSubs.forEach((s) => {
        try {
          s.unsubscribe();
        } catch (_) {}
      });
      this.dmChannelSubs.clear();
      this.dmPresenceSubs.forEach((s) => {
        try {
          s.unsubscribe();
        } catch (_) {}
      });
      this.dmPresenceSubs.clear();
      if (this.stompClient) {
        this.stompClient.disconnect();
        this.stompClient = null;
      }
    } catch (_) {}
  }

  private subscribeToChannel(channelId: number): void {
    if (!this.stompClient || !this.wsConnected) return;
    if (this.channelSub) {
      try {
        this.channelSub.unsubscribe();
      } catch (_) {}
    }
    if (this.channelPresenceSub) {
      try {
        this.channelPresenceSub.unsubscribe();
      } catch (_) {}
    }

    this.channelSub = this.stompClient.subscribe(
      `/topic/collab/chat/channel/${channelId}`,
      (frame: any) => {
        const ch = this.channels.find((c) => c.backendId === channelId);
        if (!ch) return;
        let senderUserId: number | null = null;
        try {
          const body = JSON.parse(frame.body || '{}');
          senderUserId = Number(body.senderUserId ?? body.userId ?? null);
        } catch (_) {}
        const isOwnMessage =
          senderUserId !== null && senderUserId === this.me.userId;

        if (ch.id !== this.activeChannelId) {
          if (!isOwnMessage) {
            ch.unreadCount = (ch.unreadCount || 0) + 1;
            ch.hasUnread = true;
            this.playNotificationSound();
            const payload = this.parseIncomingNotification(frame.body);
            this.pushWorkspaceNotification({
              title: payload.senderName || `#${ch.name}`,
              body: payload.content || `New message in #${ch.name}`,
              category: 'chat',
              route: `/admin/dashboard/feed/${this.me.userId}`,
              avatarUrl: payload.avatarUrl,
              contextLabel: ch.name,
              workspaceMode: 'chat',
              channelBackendId: ch.backendId,
            });
          }
          this.syncHeaderState();
          this.cdr.detectChanges();
        } else {
          this.reconcileChannelMessages(ch, frame.body);
        }
      },
    );

    this.channelPresenceSub = this.stompClient.subscribe(
      `/topic/collab/chat/presence/channel/${channelId}`,
      (frame: any) => {
        try {
          const list = JSON.parse(frame.body || '[]');
          for (const p of Array.isArray(list) ? list : [list]) {
            if (p.userId == null) continue;
            this.presenceMap[Number(p.userId)] = p.presenceStatus || 'OFFLINE';
            this.typingMap[Number(p.userId)] = Boolean(p.typing);
          }
          this.syncDmOnlineStatus();
          this.cdr.detectChanges();
        } catch (_) {}
      },
    );
  }

  private subscribeToDmChannel(contact: DmContact): void {
    if (!this.stompClient || !this.wsConnected || !contact.dmChannelId) return;
    const chId = contact.dmChannelId;

    if (!this.dmChannelSubs.has(chId)) {
      const sub = this.stompClient.subscribe(
        `/topic/collab/chat/channel/${chId}`,
        (frame: any) => {
          let senderUserId: number | null = null;
          try {
            const body = JSON.parse(frame.body || '{}');
            senderUserId = Number(body.senderUserId ?? body.userId ?? null);
          } catch (_) {}
          const isOwnMessage =
            senderUserId !== null && senderUserId === this.me.userId;
          if (contact.id !== this.activeDmId) {
            if (!isOwnMessage) {
              contact.unreadCount = (contact.unreadCount || 0) + 1;
              contact.hasUnread = true;
              this.playNotificationSound();
              const payload = this.parseIncomingNotification(frame.body);
              this.pushWorkspaceNotification({
                title: payload.senderName || contact.fullName,
                body: payload.content || 'Sent you a direct message.',
                category: 'chat',
                route: `/admin/dashboard/feed/${this.me.userId}`,
                avatarUrl: payload.avatarUrl || contact.avatarUrl,
                contextLabel: 'Direct message',
                workspaceMode: 'chat',
                dmUserId: contact.userId,
              });
            }
            this.syncHeaderState();
            this.cdr.detectChanges();
          } else {
            this.reconcileDmMessages(contact, chId, frame.body);
          }
        },
      );
      this.dmChannelSubs.set(chId, sub);
    }

    if (!this.dmPresenceSubs.has(chId)) {
      const psub = this.stompClient.subscribe(
        `/topic/collab/chat/presence/channel/${chId}`,
        (frame: any) => {
          try {
            const list = JSON.parse(frame.body || '[]');
            for (const p of Array.isArray(list) ? list : [list]) {
              if (p.userId == null) continue;
              this.presenceMap[Number(p.userId)] =
                p.presenceStatus || 'OFFLINE';
              this.typingMap[Number(p.userId)] = Boolean(p.typing);
            }
            this.syncDmOnlineStatus();
            this.cdr.detectChanges();
          } catch (_) {}
        },
      );
      this.dmPresenceSubs.set(chId, psub);
    }
  }

  // ── Reconcile helpers ─────────────────────────────────

  /**
   * Core reconcile logic shared by channel and DM.
   * Handles: new messages, deleted messages, EDITED messages, reply nesting.
   *
   * FIX — EDIT SYNC: When a message already exists by backendId, we now
   * update its content and time from the server snapshot instead of skipping it.
   * This makes edits reflect immediately for all users via WebSocket.
   */
  private applyServerMessages(
    existing: Message[],
    serverMessages: CollabMessage[],
  ): Message[] {
    const serverIds = new Set(serverMessages.map((m) => m.id));
    const serverMap = new Map(serverMessages.map((m) => [m.id, m]));

    // 1. Remove deleted messages (not in server list). Keep local-only (no backendId).
    let filtered = existing.filter(
      (m) => !m.backendId || serverIds.has(m.backendId),
    );

    // 2. Apply edits + remove deleted replies
    for (const msg of filtered) {
      const serverMsg = msg.backendId
        ? serverMap.get(msg.backendId)
        : undefined;
      if (serverMsg) {
        // FIX: Update content if it changed (edit sync)
        if (msg.content !== (serverMsg.content || '')) {
          msg.content = serverMsg.content || '';
          msg.time = formatRelativeTime(serverMsg.sentAt);
          msg.sentAtRaw = serverMsg.sentAt;
        }
      }
      // Remove deleted replies
      if (msg.replies.length) {
        msg.replies = msg.replies.filter(
          (r) => !r.backendId || serverIds.has(r.backendId),
        );
        // Apply edits to replies too
        for (const reply of msg.replies) {
          const serverReply = reply.backendId
            ? serverMap.get(reply.backendId)
            : undefined;
          if (serverReply && reply.content !== (serverReply.content || '')) {
            reply.content = serverReply.content || '';
            reply.time = formatRelativeTime(serverReply.sentAt);
            reply.sentAtRaw = serverReply.sentAt;
          }
          // Second level replies
          if (reply.replies.length) {
            reply.replies = reply.replies.filter(
              (r2) => !r2.backendId || serverIds.has(r2.backendId),
            );
            for (const r2 of reply.replies) {
              const s2 = r2.backendId ? serverMap.get(r2.backendId) : undefined;
              if (s2 && r2.content !== (s2.content || '')) {
                r2.content = s2.content || '';
                r2.time = formatRelativeTime(s2.sentAt);
                r2.sentAtRaw = s2.sentAt;
              }
            }
          }
        }
      }
    }

    // 3. Collect all backendIds already present (including in replies)
    const allExistingIds = new Set<number>();
    const collectIds = (msgs: Message[]) => {
      for (const m of msgs) {
        if (m.backendId) allExistingIds.add(m.backendId);
        collectIds(m.replies);
      }
    };
    collectIds(filtered);

    // 4. Add new messages that aren't present yet
    for (const m of serverMessages) {
      if (allExistingIds.has(m.id)) continue; // already present (existing or reply)

      const author =
        this.userDirectory[m.senderUserId] || `User ${m.senderUserId}`;
      const newMsg: Message = {
        id: `backend-${m.id}`,
        backendId: m.id,
        author,
        initials: initialsFrom(author),
        avatarColor: _colorFor(m.senderUserId),
        avatarUrl: this.userAvatarCache[m.senderUserId],
        time: formatRelativeTime(m.sentAt),
        sentAtRaw: m.sentAt,
        content: m.content || '',
        replies: [],
        liked: false,
        likeCount: 0,
        pinned: false,
        createdAt: new Date(),
        senderUserId: m.senderUserId,
        replyToMessageId: m.replyToMessageId,
        threadRootMessageId: m.threadRootMessageId,
        deliveryState:
          Number(m.senderUserId) === Number(this.me.userId)
            ? 'DELIVERED'
            : undefined,
      };

      // If it's a reply, nest under its parent
      if (m.replyToMessageId) {
        const parent = filtered.find((p) => p.backendId === m.replyToMessageId);
        if (parent) {
          const alreadyInParent = parent.replies.find(
            (r) => r.backendId === m.id,
          );
          if (!alreadyInParent) {
            // Check for optimistic reply in parent.replies
            const optimisticIdx = parent.replies.findIndex(
              (e) =>
                !e.backendId &&
                Number(e.senderUserId) === Number(m.senderUserId) &&
                e.content === (m.content || ''),
            );
            if (optimisticIdx !== -1) {
              parent.replies[optimisticIdx].backendId = m.id;
              parent.replies[optimisticIdx].id = `backend-${m.id}`;
              parent.replies[optimisticIdx].time = formatRelativeTime(m.sentAt);
              parent.replies[optimisticIdx].sentAtRaw = m.sentAt;
              if (Number(m.senderUserId) === Number(this.me.userId)) {
                parent.replies[optimisticIdx].deliveryState = 'DELIVERED';
              }
            } else {
              parent.replies.push(newMsg);
              if (Number(m.senderUserId) !== Number(this.me.userId))
                this.playNotificationSound();
            }
          }
          continue;
        }
      }

      // Top-level message: check for optimistic duplicate
      const optimisticIdx = filtered.findIndex(
        (e) =>
          !e.backendId &&
          Number(e.senderUserId) === Number(m.senderUserId) &&
          e.content === (m.content || ''),
      );
      if (optimisticIdx !== -1) {
        filtered[optimisticIdx].backendId = m.id;
        filtered[optimisticIdx].id = `backend-${m.id}`;
        filtered[optimisticIdx].time = formatRelativeTime(m.sentAt);
        filtered[optimisticIdx].sentAtRaw = m.sentAt;
        if (Number(m.senderUserId) === Number(this.me.userId)) {
          filtered[optimisticIdx].deliveryState = 'DELIVERED';
        }
      } else {
        filtered.push(newMsg);
        if (Number(m.senderUserId) !== Number(this.me.userId))
          this.playNotificationSound();
      }
    }

    return filtered;
  }

  private reconcileChannelMessages(ch: Channel, frameBody: string): void {
    let snap: any;
    try {
      snap = JSON.parse(frameBody || '{}');
    } catch (_) {
      this.fetchAndReconcileChannel(ch);
      return;
    }

    if (!Array.isArray(snap.messages)) {
      this.fetchAndReconcileChannel(ch);
      return;
    }

    const serverMessages: CollabMessage[] = snap.messages || [];
    const existing = this.channelMessages[ch.id] || [];
    const senderIds = [
      ...new Set(
        serverMessages
          .map((m) => m.senderUserId)
          .filter((id) => !this.userDirectory[id]),
      ),
    ];

    const apply = () => {
      this.loadMemberAvatars(senderIds);
      this.channelMessages[ch.id] = [
        ...this.applyServerMessages(existing, serverMessages),
      ];
      this.buildReadStateMap(serverMessages, snap.readStates || []);
      this.applyReadStateToMessages(this.channelMessages[ch.id]);

      // Keep selectedThreadMsg in sync if it's a message in this channel
      if (this.selectedThreadMsg) {
        const updated = this.findMsgInTree(
          this.channelMessages[ch.id],
          this.selectedThreadMsg.id,
        );
        if (updated)
          this.selectedThreadMsg = {
            ...updated,
            replies: [...updated.replies],
          };
      }
      // Keep activeThread in sync for the right panel
      if (this.activeThreadId) {
        const updatedThread = this.findMsgInTree(
          this.channelMessages[ch.id],
          this.activeThreadId,
        );
        if (updatedThread) {
          // Angular CD will pick up the updated replies via activeThread getter
        }
      }

      this.scrollFeed = true;
      this.cdr.detectChanges();
    };

    if (senderIds.length) this.loadUserDirectory(senderIds, apply);
    else apply();
  }

  private reconcileDmMessages(
    contact: DmContact,
    channelId: number,
    frameBody: string,
  ): void {
    let snap: any;
    try {
      snap = JSON.parse(frameBody || '{}');
    } catch (_) {
      this.fetchAndReconcileDm(contact, channelId);
      return;
    }

    if (!Array.isArray(snap.messages)) {
      this.fetchAndReconcileDm(contact, channelId);
      return;
    }

    const serverMessages: CollabMessage[] = snap.messages || [];
    const existing = this.dmMessages[contact.id] || [];
    const senderIds = [
      ...new Set(
        serverMessages
          .map((m) => m.senderUserId)
          .filter((id) => !this.userDirectory[id]),
      ),
    ];

    const apply = () => {
      this.dmMessages[contact.id] = [
        ...this.applyServerMessages(existing, serverMessages),
      ];
      this.updateDmConversationMeta(contact, this.dmMessages[contact.id]);
      this.buildReadStateMap(serverMessages, snap.readStates || []);
      this.applyReadStateToMessages(this.dmMessages[contact.id]);
      if (serverMessages.length) {
        this.lastMessageBackendId = serverMessages[serverMessages.length - 1].id;
        if (contact.id === this.activeDmId && this.lastMessageBackendId) {
          this.collabService
            .markRead(channelId, this.lastMessageBackendId)
            .subscribe({ error: () => {} });
        }
      }

      // Keep selectedThreadMsg in sync if it's a DM message
      if (this.selectedThreadMsg) {
        const updated = this.findMsgInTree(
          this.dmMessages[contact.id],
          this.selectedThreadMsg.id,
        );
        if (updated)
          this.selectedThreadMsg = {
            ...updated,
            replies: [...updated.replies],
          };
      }
      // Keep DM thread panel in sync
      if (this.activeThreadId) {
        const updatedThread = this.findMsgInTree(
          this.dmMessages[contact.id],
          this.activeThreadId,
        );
        if (updatedThread) {
          /* getter picks it up */
        }
      }

      this.scrollFeed = true;
      this.cdr.detectChanges();
    };

    if (senderIds.length) this.loadUserDirectory(senderIds, apply);
    else apply();
  }

  private fetchAndReconcileChannel(ch: Channel): void {
    this.collabService.getChannelSnapshot(ch.backendId).subscribe({
      next: (snap) => this.reconcileChannelMessages(ch, JSON.stringify(snap)),
      error: () => {},
    });
  }

  private fetchAndReconcileDm(contact: DmContact, channelId: number): void {
    this.collabService.getChannelSnapshot(channelId).subscribe({
      next: (snap) =>
        this.reconcileDmMessages(contact, channelId, JSON.stringify(snap)),
      error: () => {},
    });
  }

  private syncDmOnlineStatus(): void {
    for (const dm of this.dmContacts) {
      dm.online = (this.presenceMap[dm.userId] || 'OFFLINE') === 'ONLINE';
    }
  }

  // ── Voice ─────────────────────────────────────────────

  private checkVoiceSupport(): void {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    this.voiceSupported =
      Boolean(SR) && !/firefox/i.test(navigator.userAgent || '');
  }

  // ── Current user ──────────────────────────────────────

  private loadCurrentUser(): void {
    const userId = Number(sessionStorage.getItem('userid') || 0);
    if (!userId) return;
    this.me.userId = userId;
    this.collabService.getEmployeeByUserId(userId).subscribe({
      next: (emp) => {
        const first = emp.firstName || '',
          last = emp.lastName || '';
        const fullName =
          `${first} ${last}`.trim() || emp.user?.fullname || 'User';
        this.me = {
          name: fullName,
          shortName: last ? `${first} ${last[0]}.` : first || 'User',
          initials: initialsFrom(fullName),
          avatarColor: '#2e6276',
          userId,
          avatarUrl: '',
        };
        this.headerStateService.setProfile({
          name: fullName,
          username: emp.user?.username || emp.user?.fullname || fullName,
          accountId: String(emp.user?.id || userId),
          initials: initialsFrom(fullName),
          imageUrl: '',
        });
        this.userDirectory[userId] = fullName;
        if (emp.employeeMedia?.mediaNo) {
          this.collabService
            .fetchEmployeeImageBlob(emp.employeeMedia.mediaNo)
            .then((url) => {
              this.me = { ...this.me, avatarUrl: url };
              this.userAvatarCache[userId] = url;
              this.headerStateService.setProfile({
                name: fullName,
                username: emp.user?.username || emp.user?.fullname || fullName,
                accountId: String(emp.user?.id || userId),
                initials: initialsFrom(fullName),
                imageUrl: url,
              });
              this.cdr.detectChanges();
            })
            .catch(() => {});
        }
        this.cdr.detectChanges();
        this.connectWebSocket();
      },
      error: () => {},
    });
  }

  // ── Employees ─────────────────────────────────────────

  private loadEmployees(): void {
    this.employeesLoading = true;
    this.collabService.getAllEmployees().subscribe({
      next: (res) => {
        const list: EmployeeProfile[] = Array.isArray(res)
          ? res
          : (res?.content ?? res?.data ?? []);
        const existingContacts = new Map(
          this.dmContacts.map((contact) => [Number(contact.userId), contact]),
        );
        this.allEmployees = list;
        this.dmContacts = list
          .filter(
            (e) =>
              e.user?.userId != null &&
              Number(e.user.userId) !== Number(this.me.userId),
          )
          .map((e) => {
            const first = e.firstName || '',
              last = e.lastName || '';
            const fullName =
              `${first} ${last}`.trim() ||
              e.user?.fullname ||
              `Employee ${e.id}`;
            const contact: DmContact = {
              id: `emp-${e.id}`,
              employeeId: e.id,
              userId: Number(e.user!.userId),
              shortName: last ? `${first} ${last[0]}.` : first || fullName,
              fullName,
              initials: initialsFrom(fullName),
              avatarColor: _colorFor(e.id),
              email: e.user?.email || '',
              jobTitle: e.jobTitle,
              department: e.department?.name,
              online: false,
            };
            const existing = existingContacts.get(contact.userId);
            if (existing) {
              contact.dmChannelId = existing.dmChannelId;
              contact.unreadCount = existing.unreadCount;
              contact.hasUnread = existing.hasUnread;
              contact.avatarUrl = existing.avatarUrl || contact.avatarUrl;
            }
            if (e.user?.email)
              this.userEmailCache[contact.userId] = e.user.email;
            if (e.employeeMedia?.mediaNo) {
              const mediaNo = e.employeeMedia.mediaNo;
              if (this.imageCache[mediaNo]) {
                contact.avatarUrl = this.imageCache[mediaNo];
                this.userAvatarCache[contact.userId] = this.imageCache[mediaNo];
              } else {
                this.collabService
                  .fetchEmployeeImageBlob(mediaNo)
                  .then((url) => {
                    this.imageCache[mediaNo] = url;
                    this.userAvatarCache[contact.userId] = url;
                    const c = this.dmContacts.find((d) => d.id === contact.id);
                    if (c) {
                      c.avatarUrl = url;
                      this.cdr.detectChanges();
                    }
                    this.refreshAvatarInMessages(contact.userId, url);
                  })
                  .catch(() => {});
              }
            }
            return contact;
          });
        this.collabService.getChannels().subscribe({
          next: (channels) => {
            this.mapDirectMessageChannels(channels);
            this.syncHeaderState();
            this.employeesLoading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.syncHeaderState();
            this.employeesLoading = false;
            this.cdr.detectChanges();
          },
        });
      },
      error: () => {
        this.employeesError = 'Could not load contacts.';
        this.employeesLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private refreshAvatarInMessages(userId: number, avatarUrl: string): void {
    let changed = false;
    const update = (msgs: Message[]) => {
      for (const m of msgs) {
        if (Number(m.senderUserId) === Number(userId) && !m.avatarUrl) {
          m.avatarUrl = avatarUrl;
          changed = true;
        }
        if (m.replies.length) update(m.replies);
      }
    };
    for (const key of Object.keys(this.channelMessages))
      update(this.channelMessages[key] || []);
    for (const key of Object.keys(this.dmMessages))
      update(this.dmMessages[key] || []);
    if (changed) this.cdr.detectChanges();
  }

  // ── Channels ──────────────────────────────────────────

  private loadChannels(silent = false): void {
    if (!silent) this.channelsLoading = true;
    this.collabService.getHomeChannels().subscribe({
      next: (data) => this.mapAndSetChannels(data.channels || []),
      error: () => {
        this.collabService.getChannels().subscribe({
          next: (list) => this.mapAndSetChannels(list),
          error: () => {
            this.channelsError = 'Could not load channels.';
            this.channelsLoading = false;
            this.channels = [];
            this.cdr.detectChanges();
          },
        });
      },
    });
  }

  private mapAndSetChannels(list: CollabChannel[]): void {
    this.mapDirectMessageChannels(list);
    this.channels = list
      .filter((c) => {
        if (c.channelType !== 'PRIVATE') return true;
        const desc = (c.description || '').toLowerCase();
        const name = (c.name || '').toLowerCase();
        return !(
          desc.startsWith('dm between') ||
          desc.startsWith('direct chat') ||
          name.match(/^dm-\d+-\d+$/) !== null
        );
      })
      .map((c) => {
        const backendId = Number(c.channelId ?? c.id);
        const unreadCount = c.unreadCount ?? 0;
        return {
          id: String(backendId),
          backendId,
          name: c.name,
          description: c.description,
          channelType: c.channelType,
          createdBy: c.createdBy,
          hasUnread: unreadCount > 0,
          unreadCount: unreadCount > 0 ? unreadCount : undefined,
        };
      });
    this.channelsLoading = false;
    if (
      this.channels.length > 0 &&
      !this.activeChannelId &&
      !this.activeDmId &&
      this.activeView === 'channel' &&
      this.workspaceMode === 'chat'
    )
      this.selectChannel(this.channels[0].id);
    this.syncHeaderState();
    this.cdr.detectChanges();
  }

  private mapDirectMessageChannels(list: CollabChannel[]): void {
    const dmChannels = list.filter((channel) => {
      const desc = (channel.description || '').toLowerCase();
      const name = (channel.name || '').toLowerCase();
      return (
        channel.channelType === 'PRIVATE' &&
        (desc.startsWith('dm between') || name.match(/^dm-\d+-\d+$/) !== null)
      );
    });

    for (const channel of dmChannels) {
      const participantIds = this.extractDmParticipantIds(channel);
      const otherUserId = participantIds.find(
        (userId) => Number(userId) !== Number(this.me.userId),
      );
      if (!otherUserId) continue;
      const contact = this.dmContacts.find(
        (entry) => Number(entry.userId) === Number(otherUserId),
      );
      if (!contact) continue;
      contact.dmChannelId = Number(channel.channelId ?? channel.id);
      const unreadCount = Number(channel.unreadCount || 0);
      contact.unreadCount = unreadCount > 0 ? unreadCount : undefined;
      contact.hasUnread = unreadCount > 0;
    }
  }

  private extractDmParticipantIds(channel: CollabChannel): number[] {
    const nameMatch = String(channel.name || '').match(/^dm-(\d+)-(\d+)$/i);
    if (nameMatch) {
      return [Number(nameMatch[1]), Number(nameMatch[2])];
    }
    const descMatch = String(channel.description || '').match(/(\d+)\s+and\s+(\d+)/i);
    if (descMatch) {
      return [Number(descMatch[1]), Number(descMatch[2])];
    }
    return [];
  }

  // ── Channel management ────────────────────────────────

  openCreateChannelModal(): void {
    if (!this.canManageChannels) return;
    this.channelModal = {
      open: true,
      mode: 'create',
      name: '',
      description: '',
      channelType: 'PUBLIC',
      selectedUserIds: [],
      saving: false,
      error: '',
      editingChannelId: undefined,
      editingCreatedBy: undefined,
    };
    this.cdr.detectChanges();
  }

  openEditChannelModal(ch: Channel, e: Event): void {
    e.stopPropagation();
    if (!(this.canManageChannels || Number(ch.createdBy) === Number(this.me.userId))) {
      return;
    }
    this.channelModal = {
      open: true,
      mode: 'edit',
      name: ch.name,
      description: ch.description || '',
      channelType: ch.channelType || 'PUBLIC',
      selectedUserIds: [],
      saving: false,
      error: '',
      editingChannelId: ch.backendId,
      editingCreatedBy: ch.createdBy,
    };
    this.cdr.detectChanges();
  }

  closeChannelModal(): void {
    this.channelModal = { ...this.channelModal, open: false };
  }
  onChannelModalNameChange(val: string): void {
    this.channelModal.name = val;
  }
  onChannelModalDescChange(val: string): void {
    this.channelModal.description = val;
  }
  onChannelModalTypeChange(val: 'PUBLIC' | 'PRIVATE'): void {
    this.channelModal.channelType = val;
  }
  onChannelModalMemberToggle(userId: number): void {
    const idx = this.channelModal.selectedUserIds.indexOf(userId);
    if (idx === -1) this.channelModal.selectedUserIds.push(userId);
    else this.channelModal.selectedUserIds.splice(idx, 1);
  }

  saveChannelModal(): void {
    if (
      (this.channelModal.mode === 'create' && !this.canManageChannels) ||
      (this.channelModal.mode === 'edit' && !this.canAdministerActiveChannel)
    ) {
      this.channelModal.error =
        this.channelModal.mode === 'create'
          ? 'Only administrators can create channels.'
          : 'Only channel owners or administrators can edit this channel.';
      this.cdr.detectChanges();
      return;
    }
    const m = this.channelModal;
    if (!m.name.trim()) {
      m.error = 'Channel name is required.';
      return;
    }
    m.saving = true;
    m.error = '';
    if (m.mode === 'create') {
      this.collabService
        .createChannel({
          name: m.name.trim(),
          description: m.description.trim(),
          channelType: m.channelType,
          createdBy: this.me.userId,
        })
        .subscribe({
          next: (created) => {
            const channelId = Number(created.channelId ?? created.id);
            Promise.all(
              m.selectedUserIds.map((uid) =>
                this.collabService
                  .addChannelMember(channelId, uid)
                  .toPromise()
                  .catch(() => {}),
              ),
            ).finally(() => {
              this.closeChannelModal();
              this.loadChannels();
              setTimeout(() => {
                const ch = this.channels.find((c) => c.backendId === channelId);
                if (ch) this.selectChannel(ch.id);
              }, 400);
            });
          },
          error: () => {
            m.saving = false;
            m.error = 'Failed to create channel.';
            this.cdr.detectChanges();
          },
        });
    } else {
      this.collabService
        .updateChannel(m.editingChannelId!, {
          name: m.name.trim(),
          description: m.description.trim(),
          channelType: m.channelType,
          createdBy: m.editingCreatedBy!,
        })
        .subscribe({
          next: () => {
            this.closeChannelModal();
            this.loadChannels();
          },
          error: () => {
            m.saving = false;
            m.error = 'Failed to update channel.';
            this.cdr.detectChanges();
          },
        });
    }
  }

  deleteActiveChannel(): void {
    const ch = this.activeChannel;
    if (!ch || !this.canAdministerActiveChannel) return;
    if (!confirm(`Delete channel #${ch.name}? This cannot be undone.`)) return;
    this.collabService.deleteChannel(ch.backendId).subscribe({
      next: () => {
        this.channels = this.channels.filter((c) => c.id !== ch.id);
        delete this.channelMessages[ch.id];
        this.activeChannelId = '';
        this.showChannelDetails = false;
        if (this.channels.length) this.selectChannel(this.channels[0].id);
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  toggleChannelDetails(): void {
    this.showChannelDetails = !this.showChannelDetails;
    if (this.showChannelDetails && this.activeChannel)
      this.loadChannelMembers(this.activeChannel.backendId);
  }

  private loadChannelMembers(channelId: number): void {
    this.channelMembersLoading = true;
    this.collabService.getChannelMembers(channelId).subscribe({
      next: (members) => {
        this.channelMembers = members.filter((member) => member.status !== 'BANNED');
        this.collabService.getChannelMembersByStatus(channelId, 'BANNED').subscribe({
          next: (bannedMembers) => {
            this.bannedChannelMembers = bannedMembers;
            this.channelMembersLoading = false;
            this.loadMemberAvatars(
              [...this.channelMembers, ...this.bannedChannelMembers].map((m) => m.userId),
            );
            this.cdr.detectChanges();
          },
          error: () => {
            this.bannedChannelMembers = [];
            this.channelMembersLoading = false;
            this.loadMemberAvatars(this.channelMembers.map((m) => m.userId));
            this.cdr.detectChanges();
          },
        });
      },
      error: () => {
        this.channelMembersLoading = false;
        this.bannedChannelMembers = [];
        this.cdr.detectChanges();
      },
    });
  }

  private loadMemberAvatars(userIds: number[]): void {
    const missing = userIds.filter((uid) => !this.userAvatarCache[uid]);
    for (const uid of missing) {
      const emp = this.allEmployees.find((e) => Number(e.user?.userId) === uid);
      if (emp?.employeeMedia?.mediaNo) {
        const mediaNo = emp.employeeMedia.mediaNo;
        if (this.imageCache[mediaNo]) {
          this.userAvatarCache[uid] = this.imageCache[mediaNo];
        } else {
          this.collabService
            .fetchEmployeeImageBlob(mediaNo)
            .then((url) => {
              this.imageCache[mediaNo] = url;
              this.userAvatarCache[uid] = url;
              this.cdr.detectChanges();
            })
            .catch(() => {});
        }
      }
    }
  }

  getMemberAvatarUrl = (userId: number): string | undefined =>
    this.userAvatarCache[userId];
  getMemberName = (userId: number): string =>
    this.userDirectory[userId] || `User ${userId}`;
  colorFor = (seed: number): string => _colorFor(seed);
  isUserOnline = (userId: number): boolean =>
    (this.presenceMap[userId] || 'OFFLINE') === 'ONLINE';
  getEmpName = (e: EmployeeProfile): string =>
    `${e.firstName || ''} ${e.lastName || ''}`.trim() ||
    e.user?.fullname ||
    `Employee ${e.id}`;
  getEmpInitials = (e: EmployeeProfile): string =>
    initialsFrom(this.getEmpName(e));
  getEmpAvatarColor = (e: EmployeeProfile): string => _colorFor(e.id);
  getEmpImageUrl = (e: EmployeeProfile): string | undefined =>
    e.employeeMedia?.mediaNo
      ? this.imageCache[e.employeeMedia.mediaNo]
      : undefined;

  addMemberToActiveChannel(userId: number): void {
    const ch = this.activeChannel;
    if (!ch || !this.canAdministerActiveChannel) return;
    this.collabService.addChannelMember(ch.backendId, userId).subscribe({
      next: (m) => {
        this.bannedChannelMembers = this.bannedChannelMembers.filter(
          (member) => member.userId !== userId,
        );
        this.channelMembers.push(m);
        this.loadMemberAvatars([userId]);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        const message =
          err?.error?.message || err?.error?.detail || 'Unable to add member.';
        alert(message);
      },
    });
  }

  removeMemberFromChannel(member: CollabMember, e?: Event): void {
    e?.stopPropagation();
    if (!member.id || !this.canAdministerActiveChannel) return;
    this.closeMemberMenu();
    this.collabService.removeChannelMember(member.id).subscribe({
      next: () => {
        this.channelMembers = this.channelMembers.filter(
          (m) => m.id !== member.id,
        );
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  banMemberFromChannel(member: CollabMember, e?: Event): void {
    e?.stopPropagation();
    if (!member.id || !this.canAdministerActiveChannel) return;
    if (!confirm(`Ban ${this.getMemberName(member.userId)} from this channel?`)) {
      return;
    }
    this.closeMemberMenu();
    this.collabService.banChannelMember(member.id).subscribe({
      next: () => {
        this.channelMembers = this.channelMembers.filter((m) => m.id !== member.id);
        this.bannedChannelMembers = [
          ...this.bannedChannelMembers,
          { ...member, status: 'BANNED' },
        ];
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  unbanMemberFromChannel(member: CollabMember, e?: Event): void {
    e?.stopPropagation();
    if (!member.id || !this.canAdministerActiveChannel) return;
    this.collabService.unbanChannelMember(member.id).subscribe({
      next: () => {
        this.bannedChannelMembers = this.bannedChannelMembers.filter(
          (m) => m.id !== member.id,
        );
        this.channelMembers.push({ ...member, status: 'ACTIVE' });
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  makeChannelOwner(userId: number): void {
    const ch = this.activeChannel;
    if (
      !ch ||
      !this.canAdministerActiveChannel ||
      !confirm(`Make ${this.getMemberName(userId)} the channel owner?`)
    )
      return;
    this.closeMemberMenu();
    this.collabService
      .updateChannel(ch.backendId, {
        name: ch.name,
        description: ch.description || '',
        channelType: ch.channelType || 'PUBLIC',
        createdBy: userId,
      })
      .subscribe({
        next: () => {
          ch.createdBy = userId;
          this.cdr.detectChanges();
        },
        error: (err) => console.error(err),
      });
  }

  openMemberMenu(payload: { member: CollabMember; event: Event }): void {
    payload.event.stopPropagation();
    this.memberMenu = {
      open: true,
      memberId: payload.member.id ?? 0,
      userId: payload.member.userId,
    };
    this.cdr.detectChanges();
  }
  closeMemberMenu(): void {
    this.memberMenu = { ...this.memberMenu, open: false };
  }

  leaveActiveChannel(): void {
    const ch = this.activeChannel;
    if (!ch || !confirm(`Leave #${ch.name}?`)) return;
    const myMember = this.channelMembers.find(
      (m) => Number(m.userId) === Number(this.me.userId),
    );
    if (!myMember?.id) {
      this.channels = this.channels.filter((c) => c.id !== ch.id);
      this.activeChannelId = '';
      this.showChannelDetails = false;
      if (this.channels.length) this.selectChannel(this.channels[0].id);
      this.cdr.detectChanges();
      return;
    }
    this.collabService.leaveChannel(myMember.id).subscribe({
      next: () => {
        this.channels = this.channels.filter((c) => c.id !== ch.id);
        delete this.channelMessages[ch.id];
        this.activeChannelId = '';
        this.showChannelDetails = false;
        if (this.channels.length) this.selectChannel(this.channels[0].id);
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  // ── Navigation ────────────────────────────────────────

  selectChannel(id: string, switchWorkspace = false): void {
    this.cancelEdit();
    this.confirmDeleteId = null;
    this.workspaceMode = 'chat';
    this.showChannelDetails = false;
    this.activeChannelId = id;
    this.activeView = 'channel';
    this.activeDmId = '';
    this.activeThreadId = null;
    this.activeThreadReplyToId = null;
    this.showPinnedPanel = false;
    this.showSearch = false;
    const ch = this.channels.find((c) => c.id === id);
    if (ch) {
      ch.hasUnread = false;
      ch.unreadCount = undefined;
      this.syncHeaderState();
      this.presenceChannelId = ch.backendId;
      if (this.channelMessages[id] !== undefined) {
        this.scrollFeed = true;
        this.subscribeToChannel(ch.backendId);
        this.collabService
          .setPresenceOnline(ch.backendId)
          .subscribe({ error: () => {} });
        this.cdr.detectChanges();
      } else {
        this.loadChannelMessages(ch);
      }
    }
  }

  selectDm(contactId: string, switchWorkspace = false): void {
    this.cancelEdit();
    this.confirmDeleteId = null;
    this.workspaceMode = 'chat';
    this.activeDmId = contactId;
    this.activeView = 'dm';
    this.activeChannelId = '';
    this.activeThreadId = null;
    this.activeThreadReplyToId = null;
    this.showPinnedPanel = false;
    this.showSearch = false;
    this.showChannelDetails = false;
    const contact = this.dmContacts.find((d) => d.id === contactId);
    if (!contact) return;
    contact.hasUnread = false;
    contact.unreadCount = undefined;
    this.syncHeaderState();
    this.messagesLoading = true;
    this.cdr.detectChanges();
    this.getOrCreateDmChannel(contact);
  }

  setView(v: 'threads'): void {
    this.workspaceMode = 'chat';
    this.activeView = v;
    this.activeThreadId = null;
    this.activeThreadReplyToId = null;
    this.selectedThreadMsg = null;
    this.showPinnedPanel = false;
    this.showChannelDetails = false;
    this.cancelEdit();
    this.confirmDeleteId = null;
    this.threadInboxQuery = '';
    for (const ch of this.channels) {
      if (this.channelMessages[ch.id] === undefined)
        this.loadChannelMessages(ch);
    }
    for (const dm of this.dmContacts) {
      if (
        dm.dmChannelId &&
        this.dmMessages[dm.id] === undefined
      ) {
        this.loadDmMessages(dm, dm.dmChannelId);
      }
    }
    this.cdr.detectChanges();
  }

  // ── DM ────────────────────────────────────────────────

  private getOrCreateDmChannel(contact: DmContact): void {
    if (contact.dmChannelId) {
      this.subscribeToDmChannel(contact);
      this.loadDmMessages(contact, contact.dmChannelId);
      return;
    }
    const meId = this.me.userId,
      themId = contact.userId;
    const dmName = `dm-${Math.min(meId, themId)}-${Math.max(meId, themId)}`;
    this.collabService.getChannels().subscribe({
      next: (all) => {
        const existing = all.find(
          (c) => c.channelType === 'PRIVATE' && c.name === dmName,
        );
        if (existing) {
          const chId = Number(existing.channelId ?? existing.id);
          contact.dmChannelId = chId;
          this.loadDmMessages(contact, chId);
          this.subscribeToDmChannel(contact);
        } else {
          this.collabService
            .createChannel({
              name: dmName,
              description: `DM between ${meId} and ${themId}`,
              channelType: 'PRIVATE',
              createdBy: meId,
            })
            .subscribe({
              next: (created) => {
                const chId = Number(created.channelId ?? created.id);
                contact.dmChannelId = chId;
                this.collabService
                  .addChannelMember(chId, themId)
                  .subscribe({ error: () => {} });
                this.loadDmMessages(contact, chId);
                this.subscribeToDmChannel(contact);
              },
              error: () => {
                this.messagesLoading = false;
                this.cdr.detectChanges();
              },
            });
        }
      },
      error: () => {
        this.messagesLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadDmMessages(contact: DmContact, channelId: number): void {
    this.collabService.getChannelSnapshot(channelId).subscribe({
      next: (snap) => {
        this.messagesLoading = false;
        this.lastMessageBackendId = null;
        this.readStateMap = {};
        if (!snap.messages?.length) {
          this.dmMessages[contact.id] = [];
          this.cdr.detectChanges();
          return;
        }
        const senderIds = [
          ...new Set(snap.messages.map((m) => m.senderUserId)),
        ];
        this.loadUserDirectory(senderIds, () => {
          this.loadMemberAvatars(senderIds);
          this.dmMessages[contact.id] = this.buildMessageList(
            snap.messages,
            snap.reactions || [],
            snap.attachments || [],
          );
          this.updateDmConversationMeta(contact, this.dmMessages[contact.id]);
          this.buildReadStateMap(snap.messages, snap.readStates || []);
          this.lastMessageBackendId = snap.messages[snap.messages.length - 1].id;
          if (this.lastMessageBackendId) {
            this.collabService
              .markRead(channelId, this.lastMessageBackendId)
              .subscribe({ error: () => {} });
          }
          contact.hasUnread = false;
          contact.unreadCount = undefined;
          this.syncHeaderState();
          this.scrollFeed = true;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.messagesLoading = false;
        this.lastMessageBackendId = null;
        this.readStateMap = {};
        this.dmMessages[contact.id] = [];
        this.cdr.detectChanges();
      },
    });
  }

  // ── Messages (channel) ────────────────────────────────

  private loadChannelMessages(channel: Channel): void {
    if (!channel.backendId) return;
    this.messagesLoading = true;
    this.cdr.detectChanges();
    this.collabService.getChannelSnapshot(channel.backendId).subscribe({
      next: (snap) => {
        this.messagesLoading = false;
        if (!snap.messages?.length) {
          this.lastMessageBackendId = null;
          this.readStateMap = {};
          this.channelMessages[channel.id] = [];
          this.cdr.detectChanges();
          return;
        }
        const senderIds = [
          ...new Set(snap.messages.map((m) => m.senderUserId)),
        ];
        this.loadUserDirectory(senderIds, () => {
          this.loadMemberAvatars(senderIds);
          this.buildAndRenderMessages(
            channel,
            snap.messages,
            snap.reactions || [],
            snap.attachments || [],
            snap.readStates || [],
          );
        });
      },
      error: () => {
        this.messagesLoading = false;
        this.channelMessages[channel.id] =
          this.channelMessages[channel.id] ?? [];
        this.cdr.detectChanges();
      },
    });
  }

  private loadUserDirectory(userIds: number[], callback: () => void): void {
    const missing = userIds.filter((id) => !this.userDirectory[id]);
    if (!missing.length) {
      callback();
      return;
    }
    this.collabService.getUsersInfo(missing).subscribe({
      next: (users) => {
        for (const u of users) {
          if (u.userId != null) {
            this.userDirectory[u.userId] =
              u.fullname || u.username || u.email || `User ${u.userId}`;
            if (u.email) this.userEmailCache[u.userId] = u.email;
          }
        }
        callback();
      },
      error: () => callback(),
    });
  }

  private buildMessageList(
    messages: CollabMessage[],
    reactions: any[],
    attachments: any[],
  ): Message[] {
    const LIKE_CODES = ['LIKE', 'LOVE', 'THUMBS_UP', 'LAUGH'];
    const reactionCount = new Map<string, number>();
    const likedByMe = new Set<number>();
    const likeRxId = new Map<number, number>();

    for (const r of reactions) {
      const k = `${r.messageId}|${r.reactionCode}`;
      reactionCount.set(k, (reactionCount.get(k) ?? 0) + 1);
      if (
        r.userId != null &&
        Number(r.userId) === Number(this.me.userId) &&
        LIKE_CODES.includes(r.reactionCode)
      ) {
        likedByMe.add(Number(r.messageId));
        if (r.id != null) likeRxId.set(Number(r.messageId), r.id);
      }
    }

    const attMap = new Map<number, any>();
    for (const a of attachments) if (a.messageId) attMap.set(a.messageId, a);

    const msgMap = new Map(messages.map((m) => [m.id, m]));
    const roots: CollabMessage[] = [];
    const children = new Map<number, CollabMessage[]>();
    for (const m of messages) {
      if (m.replyToMessageId && msgMap.has(m.replyToMessageId)) {
        const b = children.get(m.replyToMessageId) ?? [];
        b.push(m);
        children.set(m.replyToMessageId, b);
      } else {
        roots.push(m);
      }
    }

    const toLocal = (m: CollabMessage): Message => {
      const totalLikes = LIKE_CODES.reduce(
        (s, c) => s + (reactionCount.get(`${m.id}|${c}`) ?? 0),
        0,
      );
      const author =
        this.userDirectory[m.senderUserId] || `User ${m.senderUserId}`;
      const att = attMap.get(m.id);
      const msg: Message = {
        id: `backend-${m.id}`,
        backendId: m.id,
        author,
        initials: initialsFrom(author),
        avatarColor: _colorFor(m.senderUserId),
        avatarUrl: this.userAvatarCache[m.senderUserId],
        time: formatRelativeTime(m.sentAt),
        sentAtRaw: m.sentAt,
        content: m.content || '',
        replies: (children.get(m.id) ?? []).map((c) => toLocal(c)),
        liked: likedByMe.has(m.id),
        likeCount: totalLikes,
        likeReactionId: likeRxId.get(m.id),
        pinned: false,
        createdAt: new Date(),
        senderUserId: m.senderUserId,
        replyToMessageId: m.replyToMessageId,
        threadRootMessageId: m.threadRootMessageId,
        deliveryState:
          Number(m.senderUserId) === Number(this.me.userId)
            ? 'DELIVERED'
            : undefined,
      };
      if (att)
        msg.attachment = {
          name: att.fileName,
          size: att.fileSize ? formatFileSize(att.fileSize) : '',
          type: this.normalizeAttachmentType(att.contentType, att.fileName),
          downloadUrl: att.downloadUrl,
          previewUrl: this.resolveAttachmentPreviewUrl(att),
        };
      return msg;
    };

    return roots.map((r) => toLocal(r));
  }

  private buildAndRenderMessages(
    channel: Channel,
    messages: CollabMessage[],
    reactions: any[],
    attachments: any[],
    readStates: any[] = [],
  ): void {
    if (messages.length)
      this.lastMessageBackendId = messages[messages.length - 1].id;
    this.channelMessages[channel.id] = this.buildMessageList(
      messages,
      reactions,
      attachments,
    );

    this.buildReadStateMap(messages, readStates);
    this.applyReadStateToMessages(this.channelMessages[channel.id]);

    if (this.lastMessageBackendId)
      this.collabService
        .markRead(channel.backendId, this.lastMessageBackendId)
        .subscribe({ error: () => {} });
    this.collabService
      .setPresenceOnline(channel.backendId)
      .subscribe({ error: () => {} });
    this.presenceChannelId = channel.backendId;
    this.pollChannelPresence(channel.backendId);
    channel.hasUnread = false;
    channel.unreadCount = undefined;
    this.syncHeaderState();
    this.subscribeToChannel(channel.backendId);
    this.scrollFeed = true;
    this.cdr.detectChanges();
  }

  private buildReadStateMap(messages: CollabMessage[], readStates: any[] = []): void {
    this.readStateMap = {};
    for (const rs of readStates) {
      if (rs.userId == null || rs.lastReadMessageId == null) continue;
      const lastId = Number(rs.lastReadMessageId);
      for (const message of messages) {
        if (message.id <= lastId) {
          if (!this.readStateMap[message.id]) this.readStateMap[message.id] = [];
          this.readStateMap[message.id].push(Number(rs.userId));
        }
      }
    }
  }

  private applyReadStateToMessages(messages: Message[]): void {
    for (const message of messages) {
      if (Number(message.senderUserId) === Number(this.me.userId)) {
        message.deliveryState =
          this.getReadCount(message) > 0
            ? 'READ'
            : message.backendId
              ? 'DELIVERED'
              : 'SENDING';
      }
      if (message.replies.length) {
        this.applyReadStateToMessages(message.replies);
      }
    }
  }

  // ── Presence ──────────────────────────────────────────

  private startPresencePoll(): void {
    this.presencePollTimer = setInterval(() => {
      this.collabService.getAllPresence().subscribe({
        next: (list: any[]) => {
          const byUser = new Map<number, any>();
          for (const p of list || []) {
            const prev = byUser.get(Number(p.userId));
            if (!prev || (p.updatedAt || '') >= (prev.updatedAt || ''))
              byUser.set(Number(p.userId), p);
          }
          byUser.forEach((p, uid) => {
            this.presenceMap[uid] = p.presenceStatus || 'OFFLINE';
            this.typingMap[uid] = Boolean(p.typing);
          });
          this.syncDmOnlineStatus();
          this.cdr.detectChanges();
        },
        error: () => {},
      });
      if (this.presenceChannelId)
        this.pollChannelPresence(this.presenceChannelId);
    }, 15_000);
  }

  private pollChannelPresence(channelId: number): void {
    this.collabService.getChannelPresence(channelId).subscribe({
      next: (list: any[]) => {
        for (const p of list || []) {
          if (p.userId == null) continue;
          this.presenceMap[Number(p.userId)] = p.presenceStatus || 'OFFLINE';
          this.typingMap[Number(p.userId)] = Boolean(p.typing);
        }
        this.syncDmOnlineStatus();
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  isUserTyping(userId: number): boolean {
    return (
      Boolean(this.typingMap[userId]) &&
      Number(userId) !== Number(this.me.userId)
    );
  }

  get typingUsersLabel(): string {
    const typing: string[] = [];
    for (const [uid, isTyping] of Object.entries(this.typingMap)) {
      if (!isTyping || Number(uid) === Number(this.me.userId)) continue;
      typing.push(
        (this.userDirectory[Number(uid)] || '').split(' ')[0] || `User ${uid}`,
      );
    }
    if (!typing.length) return '';
    if (typing.length === 1) return `${typing[0]} is typing…`;
    if (typing.length === 2) return `${typing[0]} and ${typing[1]} are typing…`;
    return 'Several people are typing…';
  }

  onComposerTyping(): void {
    const chId =
      this.activeView === 'channel'
        ? this.activeChannel?.backendId
        : this.activeDmContact?.dmChannelId;
    if (!chId) return;
    clearTimeout(this.typingTimer);
    this.collabService.setTyping(chId, true).subscribe({ error: () => {} });
    this.typingTimer = setTimeout(() => {
      this.collabService.setTyping(chId, false).subscribe({ error: () => {} });
    }, 2000);
  }

  playNotificationSound(): void {
    if (!this.soundEnabled) return;
    try {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.02);
      master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      master.connect(ctx.destination);

      const noteA = ctx.createOscillator();
      noteA.type = 'triangle';
      noteA.frequency.setValueAtTime(740, ctx.currentTime);
      noteA.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.18);
      noteA.connect(master);

      const noteB = ctx.createOscillator();
      noteB.type = 'sine';
      noteB.frequency.setValueAtTime(988, ctx.currentTime + 0.03);
      noteB.connect(master);

      noteA.start();
      noteB.start(ctx.currentTime + 0.03);
      noteA.stop(ctx.currentTime + 0.28);
      noteB.stop(ctx.currentTime + 0.22);
      noteA.onended = () => ctx.close();
    } catch (_) {}
  }

  // ── Messaging ─────────────────────────────────────────

  sendMessage(): void {
    if (this.activeView === 'dm') {
      this.sendDmMessage();
      return;
    }
    const text = this.draft.trim();
    if ((!text && !this.pendingAttachment) || this.sendingMessage) return;
    const channel = this.activeChannel;
    if (!channel) return;
    this.sendingMessage = true;
    const optimistic = this.makeLocalMsg(
      text || '(file)',
      this.pendingAttachment ?? undefined,
    );
    (this.channelMessages[channel.id] ??= []).push(optimistic);
    const capturedFile = this.pendingFile,
      capturedAtt = this.pendingAttachment;
    this.draft = '';
    this.pendingFile = null;
    this.pendingAttachment = null;
    this.scrollFeed = true;
    this.cdr.detectChanges();
    this.collabService
      .sendMessage({
        channelId: channel.backendId,
        senderUserId: this.me.userId,
        content: text,
        messageType: 'TEXT',
      })
      .subscribe({
        next: (saved) => {
          optimistic.backendId = saved.id;
          optimistic.id = `backend-${saved.id}`;
          optimistic.deliveryState = 'DELIVERED';
          this.sendingMessage = false;
          this.playNotificationSound();
          if (capturedFile && capturedAtt)
            this.uploadAttachmentForMessage(
              channel,
              saved.id,
              capturedFile,
              capturedAtt,
              optimistic,
            );
          else this.cdr.detectChanges();
        },
        error: () => {
          const idx = (this.channelMessages[channel.id] ?? []).indexOf(
            optimistic,
          );
          if (idx !== -1) this.channelMessages[channel.id].splice(idx, 1);
          this.sendingMessage = false;
          this.cdr.detectChanges();
        },
      });
  }

  sendDmMessage(): void {
    const text = this.draft.trim(),
      contact = this.activeDmContact;
    if (!contact || (!text && !this.pendingAttachment) || this.sendingMessage)
      return;
    const chId = contact.dmChannelId;
    if (!chId) {
      (this.dmMessages[contact.id] ??= []).push(
        this.makeLocalMsg(text || '(file)'),
      );
      this.draft = '';
      this.pendingFile = null;
      this.pendingAttachment = null;
      this.scrollFeed = true;
      return;
    }
    this.sendingMessage = true;
    const optimistic = this.makeLocalMsg(
      text || '(file)',
      this.pendingAttachment ?? undefined,
    );
    (this.dmMessages[contact.id] ??= []).push(optimistic);
    const capturedFile = this.pendingFile,
      capturedAtt = this.pendingAttachment;
    this.draft = '';
    this.pendingFile = null;
    this.pendingAttachment = null;
    this.scrollFeed = true;
    this.cdr.detectChanges();
    this.collabService
      .sendMessage({
        channelId: chId,
        senderUserId: this.me.userId,
        content: text,
        messageType: 'TEXT',
      })
      .subscribe({
        next: (saved) => {
          optimistic.backendId = saved.id;
          optimistic.id = `backend-${saved.id}`;
          optimistic.deliveryState = 'DELIVERED';
          this.sendingMessage = false;
          this.playNotificationSound();
          if (capturedFile && capturedAtt) {
            const fakeCh: Channel = {
              id: `dm-${chId}`,
              backendId: chId,
              name: '',
            };
            this.uploadAttachmentForMessage(
              fakeCh,
              saved.id,
              capturedFile,
              capturedAtt,
              optimistic,
            );
          } else this.cdr.detectChanges();
        },
        error: () => {
          const idx = (this.dmMessages[contact.id] ?? []).indexOf(optimistic);
          if (idx !== -1) this.dmMessages[contact.id].splice(idx, 1);
          this.sendingMessage = false;
          this.cdr.detectChanges();
        },
      });
  }

  private uploadAttachmentForMessage(
    channel: Channel,
    messageId: number,
    file: File,
    meta: { name: string; size: string; type: string; previewUrl?: string },
    optimistic: Message,
  ): void {
    this.uploadingAttachment = true;
    this.collabService
      .uploadAttachment(channel.backendId, this.me.userId, file, messageId)
      .subscribe({
        next: (att) => {
          optimistic.attachment = {
            name: att.fileName || meta.name,
            size: att.fileSize ? formatFileSize(att.fileSize) : meta.size,
            type: att.contentType || meta.type,
            downloadUrl: att.downloadUrl,
            previewUrl:
              optimistic.attachment?.previewUrl ||
              this.resolveAttachmentPreviewUrl(att),
          };
          this.uploadingAttachment = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.uploadingAttachment = false;
          this.cdr.detectChanges();
        },
      });
  }

  onFileSelected(file: File): void {
    this.clearPendingAttachment();
    this.pendingFile = file;
    this.pendingAttachment = {
      name: file.name,
      size: formatFileSize(file.size),
      type: this.normalizeAttachmentType(file.type, file.name),
      previewUrl: this.isImageType(file.type)
        ? URL.createObjectURL(file)
        : undefined,
    };
    this.cdr.detectChanges();
  }

  // ── Edit ──────────────────────────────────────────────

  startEdit(payload: { msg: Message; event?: Event }): void {
    payload.event?.stopPropagation();
    this.confirmDeleteId = null;
    this.editingMessageId = payload.msg.id;
    this.editDraft = payload.msg.content;
    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    this.editingMessageId = null;
    this.editDraft = '';
    this.savingEdit = false;
  }

  saveEdit(msg: Message): void {
    const newContent = this.editDraft.trim();
    if (!newContent || this.savingEdit) return;
    if (newContent === msg.content) {
      this.cancelEdit();
      return;
    }
    if (!msg.backendId) {
      msg.content = newContent;
      this.cancelEdit();
      this.cdr.detectChanges();
      return;
    }
    this.savingEdit = true;
    const original = msg.content;
    msg.content = newContent;
    this.cdr.detectChanges();
    // Resolve channelId for both channel and DM contexts
    const chId =
      this.activeView === 'dm'
        ? (this.activeDmContact?.dmChannelId ?? 0)
        : (this.activeChannel?.backendId ?? 0);
    this.collabService
      .editMessage(msg.backendId, {
        channelId: chId,
        senderUserId: this.me.userId,
        content: newContent,
        messageType: 'TEXT',
        threadRootMessageId: msg.threadRootMessageId ?? null,
        replyToMessageId: msg.replyToMessageId ?? null,
      })
      .subscribe({
        next: () => {
          this.savingEdit = false;
          this.cancelEdit();
          this.cdr.detectChanges();
        },
        error: () => {
          msg.content = original;
          this.savingEdit = false;
          this.cancelEdit();
          this.cdr.detectChanges();
        },
      });
  }

  // ── Delete ────────────────────────────────────────────

  requestDelete(payload: { msg: Message; event?: Event }): void {
    payload.event?.stopPropagation();
    this.cancelEdit();
    this.confirmDeleteId = payload.msg.id;
    this.cdr.detectChanges();
  }

  dismissDelete(): void {
    this.confirmDeleteId = null;
    this.cdr.detectChanges();
  }

  startReplyEdit(payload: { reply: Message; event?: Event }): void {
    payload.event?.stopPropagation();
    this.confirmDeleteReplyId = null;
    this.editingReplyId = payload.reply.id;
    this.editReplyDraft = payload.reply.content;
    this.cdr.detectChanges();
  }

  cancelReplyEdit(): void {
    this.editingReplyId = null;
    this.editReplyDraft = '';
    this.cdr.detectChanges();
  }

  saveReplyEdit(payload: { reply: Message; rootId: string }): void {
    const { reply } = payload;
    const newContent = this.editReplyDraft.trim();
    if (!newContent || newContent === reply.content) {
      this.cancelReplyEdit();
      return;
    }
    if (!reply.backendId) {
      reply.content = newContent;
      this.cancelReplyEdit();
      return;
    }
    const channelId =
      this.activeView === 'dm'
        ? this.activeDmContact?.dmChannelId
        : this.activeChannel?.backendId;
    if (!channelId) return;
    const original = reply.content;
    reply.content = newContent;
    this.cdr.detectChanges();
    this.collabService
      .editMessage(reply.backendId, {
        channelId,
        senderUserId: this.me.userId,
        content: newContent,
        messageType: 'TEXT',
        threadRootMessageId: reply.threadRootMessageId ?? null,
        replyToMessageId: reply.replyToMessageId ?? null,
      })
      .subscribe({
        next: () => {
          this.cancelReplyEdit();
          this.cdr.detectChanges();
        },
        error: () => {
          reply.content = original;
          this.cancelReplyEdit();
          this.cdr.detectChanges();
        },
      });
  }

  requestReplyDelete(payload: { reply: Message; event?: Event }): void {
    payload.event?.stopPropagation();
    this.editingReplyId = null;
    this.confirmDeleteReplyId = payload.reply.id;
    this.cdr.detectChanges();
  }

  dismissReplyDelete(): void {
    this.confirmDeleteReplyId = null;
    this.cdr.detectChanges();
  }

  confirmReplyDelete(payload: { reply: Message; rootMsg: Message; event?: Event }): void {
    payload.event?.stopPropagation();
    const { reply } = payload;
    if (!reply.backendId) {
      this.spliceMessage(reply);
      this.dismissReplyDelete();
      return;
    }
    reply.deleting = true;
    this.cdr.detectChanges();
    this.collabService.deleteMessage(reply.backendId).subscribe({
      next: () => {
        this.spliceMessage(reply);
        this.confirmDeleteReplyId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        reply.deleting = false;
        this.cdr.detectChanges();
      },
    });
  }

  confirmDelete(payload: { msg: Message; event?: Event }): void {
    const { msg } = payload;
    payload.event?.stopPropagation();
    this.confirmDeleteId = null;
    if (!msg.backendId) {
      this.spliceMessage(msg);
      return;
    }
    this.deletingIds.add(msg.id);
    msg.deleting = true;
    this.cdr.detectChanges();
    this.collabService.deleteMessage(msg.backendId).subscribe({
      next: () => {
        this.deletingIds.delete(msg.id);
        this.spliceMessage(msg);
        if (this.activeThreadId === msg.id) this.closeThread();
        if (this.selectedThreadMsg?.id === msg.id)
          this.selectedThreadMsg = null;
        this.cdr.detectChanges();
      },
      error: () => {
        msg.deleting = false;
        this.deletingIds.delete(msg.id);
        this.cdr.detectChanges();
      },
    });
  }

  private spliceMessage(msg: Message): void {
    const searchAndSplice = (lists: Message[][]) => {
      for (const list of lists) {
        const idx = list.findIndex((m) => m.id === msg.id);
        if (idx !== -1) {
          list.splice(idx, 1);
          return true;
        }
        for (const root of list) {
          const ri = root.replies.findIndex((r) => r.id === msg.id);
          if (ri !== -1) {
            root.replies.splice(ri, 1);
            return true;
          }
          for (const reply of root.replies) {
            const nri = reply.replies.findIndex((r) => r.id === msg.id);
            if (nri !== -1) {
              reply.replies.splice(nri, 1);
              return true;
            }
          }
        }
      }
      return false;
    };
    if (
      !searchAndSplice(
        this.channels.map((ch) => this.channelMessages[ch.id] ?? []),
      )
    )
      searchAndSplice(
        this.dmContacts.map((dm) => this.dmMessages[dm.id] ?? []),
      );
  }

  // ── Threads ───────────────────────────────────────────

  openThread(payload: { msg: Message; event?: Event }): void {
    const { msg } = payload;
    payload.event?.stopPropagation();
    if (this.activeThreadId === msg.id) {
      this.activeThreadId = null;
      this.activeThreadReplyToId = null;
      return;
    }
    this.showPinnedPanel = false;
    this.showChannelDetails = false;
    this.activeThreadId = msg.id;
    this.activeThreadReplyToId = null;
    this.threadReplyDraft = '';
    this.scrollThread = true;
    this.cdr.detectChanges();
  }

  closeThread(): void {
    this.activeThreadId = null;
    this.activeThreadReplyToId = null;
  }

  setThreadReplyTarget(payload: { reply: Message; event?: Event }): void {
    payload.event?.stopPropagation();
    this.activeThreadReplyToId = payload.reply.id;
    this.threadReplyDraft = '';
    this.cdr.detectChanges();
  }

  clearThreadReplyTarget(): void {
    this.activeThreadReplyToId = null;
    this.threadReplyDraft = '';
    this.cdr.detectChanges();
  }

  /**
   * sendReply works for both channels AND DMs.
   * DM threads use the DM channel's backendId as channelId.
   */
  sendReply(): void {
    const text = this.threadReplyDraft.trim(),
      rootMsg = this.activeThread;
    if (!text || !rootMsg || this.sendingReply) return;

    const source = this.resolveThreadMessageSource(rootMsg);
    const isDm = source?.type === 'dm';
    const channelId = isDm
      ? source?.dmChannelId
      : source?.channelBackendId;

    const replyTarget = this.activeThreadReplyToId
      ? (this.findMsgInTree(rootMsg.replies, this.activeThreadReplyToId) ??
        rootMsg)
      : rootMsg;
    const threadRootId = rootMsg.backendId,
      replyToId = replyTarget.backendId ?? rootMsg.backendId;

    if (!channelId || !rootMsg.backendId) {
      const opt = this.makeLocalMsg(text);
      opt.replyToMessageId = replyToId;
      opt.threadRootMessageId = threadRootId;
      if (this.activeThreadReplyToId) replyTarget.replies.push(opt);
      else rootMsg.replies.push(opt);
      this.threadReplyDraft = '';
      this.activeThreadReplyToId = null;
      this.scrollThread = true;
      this.cdr.detectChanges();
      return;
    }

    this.sendingReply = true;
    const optimistic = this.makeLocalMsg(text);
    optimistic.replyToMessageId = replyToId;
    optimistic.threadRootMessageId = threadRootId;
    if (this.activeThreadReplyToId) replyTarget.replies.push(optimistic);
    else rootMsg.replies.push(optimistic);
    this.threadReplyDraft = '';
    this.activeThreadReplyToId = null;
    this.scrollThread = true;
    this.cdr.detectChanges();

    this.collabService
      .sendMessage({
        channelId,
        senderUserId: this.me.userId,
        content: text,
        messageType: 'TEXT',
        replyToMessageId: replyToId ?? null,
        threadRootMessageId: threadRootId ?? null,
      })
      .subscribe({
        next: (saved) => {
          optimistic.backendId = saved.id;
          optimistic.id = `backend-${saved.id}`;
          this.sendingReply = false;
          this.cdr.detectChanges();
        },
        error: () => {
          const bucket = this.activeThreadReplyToId
            ? replyTarget.replies
            : rootMsg.replies;
          const idx = bucket.indexOf(optimistic);
          if (idx !== -1) bucket.splice(idx, 1);
          this.sendingReply = false;
          this.cdr.detectChanges();
        },
      });
  }

  // ── Reactions ─────────────────────────────────────────

  toggleLike(payload: { msg: Message; event?: Event }): void {
    const { msg } = payload;
    payload.event?.stopPropagation();
    if (this.reactingIds.has(msg.id)) return;
    const wasLiked = msg.liked,
      wasCount = msg.likeCount,
      wasId = msg.likeReactionId;
    msg.liked = !wasLiked;
    msg.likeCount = msg.liked ? wasCount + 1 : Math.max(0, wasCount - 1);
    if (!msg.liked) msg.likeReactionId = undefined;
    this.cdr.detectChanges();
    if (!msg.backendId) return;
    this.reactingIds.add(msg.id);
    const refresh = () => {
      this.reactingIds.delete(msg.id);
      const ch = this.activeChannel;
      if (ch?.backendId)
        this.collabService
          .getChannelSnapshot(ch.backendId)
          .subscribe({
            next: (snap) =>
              this.refreshReactionCounts(ch, snap.reactions || []),
            error: () => {},
          });
    };
    const rollback = () => {
      msg.liked = wasLiked;
      msg.likeCount = wasCount;
      msg.likeReactionId = wasId;
      this.reactingIds.delete(msg.id);
      this.cdr.detectChanges();
    };
    if (wasLiked && wasId != null)
      this.collabService
        .deleteReaction(wasId)
        .subscribe({ next: refresh, error: rollback });
    else
      this.collabService
        .addReaction({
          messageId: msg.backendId,
          userId: this.me.userId,
          reactionCode: 'LIKE',
        })
        .subscribe({ next: refresh, error: rollback });
  }

  private refreshReactionCounts(channel: Channel, reactions: any[]): void {
    const LIKE_CODES = ['LIKE', 'LOVE', 'THUMBS_UP', 'LAUGH'];
    const rc = new Map<string, number>(),
      lbm = new Set<number>(),
      lrm = new Map<number, number>();
    for (const r of reactions) {
      rc.set(
        `${r.messageId}|${r.reactionCode}`,
        (rc.get(`${r.messageId}|${r.reactionCode}`) ?? 0) + 1,
      );
      if (
        r.userId != null &&
        Number(r.userId) === Number(this.me.userId) &&
        LIKE_CODES.includes(r.reactionCode)
      ) {
        lbm.add(Number(r.messageId));
        if (r.id != null) lrm.set(Number(r.messageId), r.id);
      }
    }
    for (const msg of this.channelMessages[channel.id] || []) {
      if (!msg.backendId) continue;
      msg.likeCount = LIKE_CODES.reduce(
        (s, c) => s + (rc.get(`${msg.backendId}|${c}`) ?? 0),
        0,
      );
      msg.liked = lbm.has(msg.backendId);
      msg.likeReactionId = lrm.get(msg.backendId);
    }
    this.cdr.detectChanges();
  }

  togglePin(payload: { msg: Message; event?: Event }): void {
    const { msg } = payload;
    payload.event?.stopPropagation();
    msg.pinned = !msg.pinned;
    msg.pinnedAt = msg.pinned ? Date.now() : undefined;
    this.cdr.detectChanges();
  }

  // ── Search ────────────────────────────────────────────

  onSearch(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.searchResults = [];
      this.showSearch = false;
      return;
    }
    this.searchResults = [];
    for (const ch of this.channels) {
      for (const msg of this.channelMessages[ch.id] || []) {
        if (
          !msg.isSystem &&
          (msg.content.toLowerCase().includes(q) ||
            msg.author.toLowerCase().includes(q))
        )
          this.searchResults.push({
            msg,
            channelId: ch.id,
            channelName: ch.name,
          });
      }
    }
    this.showSearch = true;
  }

  closeSearch(): void {
    this.showSearch = false;
  }

  jumpTo(r: { msg: Message; channelId: string; channelName: string }): void {
    this.selectChannel(r.channelId);
    this.searchQuery = '';
    this.showSearch = false;
    setTimeout(() => {
      const el = document.getElementById('msg-' + r.msg.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.flashId = r.msg.id;
        this.flashTimer = setTimeout(() => {
          this.flashId = null;
          this.cdr.detectChanges();
        }, 1800);
      }
    }, 120);
  }

  getFlashId(): string | null {
    return this.flashId;
  }

  // ── Email ─────────────────────────────────────────────

  private getEmailForUser(userId: number): string {
    return this.userEmailCache[userId] || '';
  }

  private getChannelMemberEmails(): {
    email: string;
    name: string;
    locked: boolean;
  }[] {
    return this.channelMembers
      .filter((m) => Number(m.userId) !== Number(this.me.userId))
      .map((m) => ({
        email: this.getEmailForUser(m.userId),
        name: this.getMemberName(m.userId),
        locked: true,
      }))
      .filter((r) => r.email);
  }

  openEmailModal(nameOrEmail?: string): void {
    const recipients: { email: string; name: string; locked: boolean }[] = [];
    if (this.activeView === 'dm' && this.activeDmContact) {
      const email =
        this.activeDmContact.email ||
        this.getEmailForUser(this.activeDmContact.userId);
      if (email)
        recipients.push({
          email,
          name: this.activeDmContact.fullName,
          locked: true,
        });
    } else if (this.activeView === 'channel') {
      recipients.push(...this.getChannelMemberEmails());
    }
    if (nameOrEmail && !nameOrEmail.includes('@')) {
      const dm = this.dmContacts.find((d) => d.fullName === nameOrEmail);
      if (dm?.email && !recipients.find((r) => r.email === dm.email))
        recipients.push({ email: dm.email, name: dm.fullName, locked: true });
    } else if (nameOrEmail?.includes('@')) {
      if (!recipients.find((r) => r.email === nameOrEmail))
        recipients.push({
          email: nameOrEmail,
          name: nameOrEmail,
          locked: true,
        });
    }
    this.emailModal = {
      open: true,
      recipients,
      toInput: '',
      subject: '',
      body: '',
      sending: false,
      result: '',
      width: Math.min(640, window.innerWidth - 80),
    };
    this.cdr.detectChanges();
  }

  closeEmailModal(): void {
    this.emailModal = { ...this.emailModal, open: false };
  }

  addEmailRecipient(): void {
    const raw = this.emailModal.toInput.trim();
    if (!raw || !raw.includes('@')) return;
    if (!this.emailModal.recipients.find((r) => r.email === raw))
      this.emailModal.recipients.push({ email: raw, name: raw, locked: false });
    this.emailModal.toInput = '';
    this.cdr.detectChanges();
  }

  removeEmailRecipient(idx: number): void {
    const r = this.emailModal.recipients[idx];
    if (r?.locked) return;
    this.emailModal.recipients.splice(idx, 1);
    this.cdr.detectChanges();
  }

  sendEmailAction(): void {
    const m = this.emailModal;
    if (!m.recipients.length || !m.body.trim()) return;
    m.sending = true;
    m.result = '';
    const ch = this.activeChannel,
      chId = ch?.backendId ?? this.activeDmContact?.dmChannelId ?? 0;
    this.collabService
      .triggerAction({
        channelId: chId,
        messageId: null,
        initiatorUserId: this.me.userId,
        targetUserId: this.me.userId,
        actionType: 'EMAIL',
        subject: m.subject,
        payloadJson: JSON.stringify({
          to: m.recipients.map((r) => r.email).join(','),
          subject: m.subject,
          body: m.body,
          tone: 'professional',
        }),
      })
      .subscribe({
        next: (res) => {
          m.sending = false;
          m.result = `Sent — ${res.status}`;
          this.cdr.detectChanges();
        },
        error: (err) => {
          m.sending = false;
          m.result = `Failed: ${err?.message || 'Unknown error'}`;
          this.cdr.detectChanges();
        },
      });
  }

  composeEmailFromAi(): void {
    if (!this.emailModal.body.trim()) return;
    this.emailModal.sending = true;
    this.collabService
      .aiComposeEmail({
        purpose: this.emailModal.subject || 'Business email',
        audience: 'external',
        context: this.emailModal.body,
        tone: 'professional',
      })
      .subscribe({
        next: (res) => {
          if (res.subject) this.emailModal.subject = res.subject;
          if (res.body) this.emailModal.body = res.body;
          this.emailModal.sending = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.emailModal.sending = false;
          this.cdr.detectChanges();
        },
      });
  }

  // ── Call ──────────────────────────────────────────────

  startCall(type: 'CALL' | 'VIDEO_CALL'): void {
    const target = this.activeDmContact,
      targetName = target?.fullName ?? this.activeChannel?.name ?? 'Contact',
      targetUserId = target?.userId ?? 0;
    this.callModal = {
      open: true,
      type,
      targetName,
      targetUserId,
      status: 'ringing',
      duration: 0,
      muted: false,
      videoOff: type === 'CALL',
    };
    this.cdr.detectChanges();
    const chId = target?.dmChannelId ?? this.activeChannel?.backendId ?? 0;
    this.collabService
      .triggerAction({
        channelId: chId,
        messageId: null,
        initiatorUserId: this.me.userId,
        targetUserId,
        actionType: type,
        subject: `${type === 'CALL' ? 'Voice' : 'Video'} call with ${targetName}`,
        payloadJson: JSON.stringify({ type }),
      })
      .subscribe({
        next: () => {
          this.callModal.status = 'connected';
          this.callDurationTimer = setInterval(() => {
            this.callModal.duration++;
            this.cdr.detectChanges();
          }, 1000);
          this.cdr.detectChanges();
        },
        error: () => {
          this.callModal.status = 'failed';
          this.cdr.detectChanges();
        },
      });
  }

  endCall(): void {
    if (this.callDurationTimer) {
      clearInterval(this.callDurationTimer);
      this.callDurationTimer = null;
    }
    this.callModal.status = 'ended';
    setTimeout(() => {
      this.callModal.open = false;
      this.cdr.detectChanges();
    }, 1200);
    this.cdr.detectChanges();
  }

  toggleMute(): void {
    this.callModal.muted = !this.callModal.muted;
    this.cdr.detectChanges();
  }
  toggleVideo(): void {
    this.callModal.videoOff = !this.callModal.videoOff;
    this.cdr.detectChanges();
  }

  // ── AI ────────────────────────────────────────────────

  toggleAiToolbar(): void {
    this.showAiToolbar = !this.showAiToolbar;
  }
  closeAiOutput(): void {
    this.aiOutput = { visible: false, loading: false, title: '', content: '' };
  }

  aiRewrite(): void {
    const content = this.draft.trim();
    if (!content) return;
    this.aiOutput = {
      visible: true,
      loading: true,
      title: 'AI Rewrite',
      content: '',
    };
    this.cdr.detectChanges();
    this.collabService.aiRewrite(content).subscribe({
      next: (res: AiRewriteResponse) => {
        let body = res.body || res.rewrittenText || res.content || '';
        const uf = body
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        if (uf.startsWith('{')) {
          try {
            const p = JSON.parse(uf);
            body = p.body || p.content || body;
          } catch (_) {}
        }
        this.aiOutput = {
          visible: true,
          loading: false,
          title: 'AI Rewrite',
          content: body || 'No result.',
        };
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.aiOutput = {
          visible: true,
          loading: false,
          title: 'AI Rewrite',
          content: 'Error: ' + (err?.message || 'Failed'),
        };
        this.cdr.detectChanges();
      },
    });
  }

  aiSubject(): void {
    this.aiOutput = {
      visible: true,
      loading: true,
      title: 'AI Subject',
      content: '',
    };
    this.cdr.detectChanges();
    this.collabService.aiSuggestSubject(this.draft.trim()).subscribe({
      next: (res: AiSubjectResponse) => {
        this.aiOutput = {
          visible: true,
          loading: false,
          title: 'AI Subject',
          content:
            (res.suggestions || [])
              .map((s, i) => `${i + 1}. ${s}`)
              .join('\n') || 'No suggestions.',
        };
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.aiOutput = {
          visible: true,
          loading: false,
          title: 'AI Subject',
          content: 'Error: ' + (err?.message || 'Failed'),
        };
        this.cdr.detectChanges();
      },
    });
  }

  aiSummarize(): void {
    const msgs = this.rawMessages.filter((m) => !m.isSystem);
    if (!msgs.length) return;
    this.aiOutput = {
      visible: true,
      loading: true,
      title: 'AI Summary',
      content: '',
    };
    this.cdr.detectChanges();
    this.collabService
      .aiSummarizeDiscussion(
        this.activeChannel?.name || 'Discussion',
        msgs.map((m) => `${m.author}: ${m.content}`).join('\n'),
      )
      .subscribe({
        next: (res: AiSummaryResponse) => {
          const kp =
            (res.keyPoints || []).map((x, i) => `${i + 1}. ${x}`).join('\n') ||
            'None';
          const dc =
            (res.decisions || []).map((x, i) => `${i + 1}. ${x}`).join('\n') ||
            'None';
          const ai =
            (res.actionItems || [])
              .map((x, i) => `${i + 1}. ${x}`)
              .join('\n') || 'None';
          this.aiOutput = {
            visible: true,
            loading: false,
            title: 'AI Summary',
            content: [
              res.summary || 'No summary.',
              '\nKey Points:\n' + kp,
              '\nDecisions:\n' + dc,
              '\nAction Items:\n' + ai,
            ].join('\n'),
          };
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.aiOutput = {
            visible: true,
            loading: false,
            title: 'AI Summary',
            content: 'Error: ' + (err?.message || 'Failed'),
          };
          this.cdr.detectChanges();
        },
      });
  }

  voiceCompose(): void {
    if (!this.voiceSupported) {
      this.aiOutput = {
        visible: true,
        loading: false,
        title: 'Voice Compose',
        content: 'Use Chrome or Edge for voice.',
      };
      return;
    }
    if (this.voiceListening && this.recognition) {
      this.voiceManualStop = true;
      this.recognition.stop();
      return;
    }
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = true;
    this.recognition = rec;
    this.voiceListening = true;
    this.voiceManualStop = false;
    this.voiceFinalTranscript = '';
    this.aiOutput = {
      visible: true,
      loading: false,
      title: 'Voice Compose',
      content: 'Listening… speak your message.',
    };
    this.cdr.detectChanges();
    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) this.voiceFinalTranscript += chunk + ' ';
        else interim += chunk;
      }
      this.aiOutput = {
        visible: true,
        loading: false,
        title: 'Voice Compose',
        content: `Listening…\n\n"${(this.voiceFinalTranscript + interim).trim()}"`,
      };
      this.cdr.detectChanges();
    };
    rec.onerror = () => {};
    rec.onend = () => {
      if (this.voiceListening && !this.voiceManualStop) {
        try {
          rec.start();
          return;
        } catch (_) {}
      }
      const transcript = this.voiceFinalTranscript.trim();
      this.voiceListening = false;
      this.voiceManualStop = false;
      this.recognition = null;
      this.voiceFinalTranscript = '';
      if (!transcript) {
        this.aiOutput = {
          visible: true,
          loading: false,
          title: 'Voice Compose',
          content: 'No transcript captured.',
        };
        this.cdr.detectChanges();
        return;
      }
      this.aiOutput = {
        visible: true,
        loading: true,
        title: 'Voice → AI Compose',
        content: `Transcript:\n"${transcript}"\n\nComposing…`,
      };
      this.cdr.detectChanges();
      this.collabService
        .aiComposeEmail({
          purpose: 'Business email from voice note',
          audience: 'external',
          context: transcript,
        })
        .subscribe({
          next: (res: AiEmailComposeResponse) => {
            let subj = res.subject || 'Draft',
              body = res.body || '';
            const uf = body
              .replace(/^```(?:json)?\s*/i, '')
              .replace(/\s*```$/i, '')
              .trim();
            if (uf.startsWith('{')) {
              try {
                const p = JSON.parse(uf);
                subj = p.subject || subj;
                body = p.body || body;
              } catch (_) {}
            }
            this.aiOutput = {
              visible: true,
              loading: false,
              title: 'Voice → AI Compose',
              content: `Subject: ${subj}\n\n${body}`,
            };
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.aiOutput = {
              visible: true,
              loading: false,
              title: 'Voice Compose',
              content: `Transcript: "${transcript}"\n\nError: ${err?.message || 'Failed'}`,
            };
            this.cdr.detectChanges();
          },
        });
    };
    rec.start();
  }

  // ── Resize ────────────────────────────────────────────

  startResizeSidebar(e: MouseEvent): void {
    this.isResizingSidebar = true;
    this.resizeStartX = e.clientX;
    this.resizeStartWidth = this.sidebarWidth;
    e.preventDefault();
  }
  startResizeThread(e: MouseEvent): void {
    this.isResizingThread = true;
    this.resizeStartX = e.clientX;
    this.resizeStartWidth = this.threadPanelWidth;
    e.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.isResizingSidebar)
      this.sidebarWidth = Math.min(
        this.SIDEBAR_MAX,
        Math.max(
          this.SIDEBAR_MIN,
          this.resizeStartWidth + (e.clientX - this.resizeStartX),
        ),
      );
    if (this.isResizingThread)
      this.threadPanelWidth = Math.min(
        this.THREAD_MAX,
        Math.max(
          this.THREAD_MIN,
          this.resizeStartWidth + (this.resizeStartX - e.clientX),
        ),
      );
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isResizingSidebar = false;
    this.isResizingThread = false;
  }

  // ── Computed getters ──────────────────────────────────

  get activeChannel(): Channel | undefined {
    return this.channels.find((c) => c.id === this.activeChannelId);
  }
  get activeDmContact(): DmContact | undefined {
    return this.dmContacts.find((d) => d.id === this.activeDmId);
  }
  get rawMessages(): Message[] {
    if (this.activeView === 'threads') {
      return this.filteredThreadMessages;
    }
    return this.activeView === 'dm'
      ? this.dmMessages[this.activeDmId] || []
      : this.channelMessages[this.activeChannelId] || [];
  }

  get threadMessages(): Message[] {
    const channelThreads = this.channels.flatMap((channel) =>
      (this.channelMessages[channel.id] || [])
        .filter((message) => (message.replies || []).length > 0 && !message.isSystem)
        .map((message) =>
          this.decorateThreadMessage(message, {
            sourceType: 'channel',
            sourceLabel: channel.name,
            sourceSecondaryLabel: channel.description || 'Channel discussion',
          }),
        ),
    );
    const dmThreads = this.dmContacts.flatMap((contact) =>
      (this.dmMessages[contact.id] || [])
        .filter((message) => (message.replies || []).length > 0 && !message.isSystem)
        .map((message) =>
          this.decorateThreadMessage(message, {
            sourceType: 'dm',
            sourceLabel: contact.fullName,
            sourceSecondaryLabel: contact.jobTitle || 'Direct conversation',
          }),
        ),
    );
    return [...channelThreads, ...dmThreads]
      .sort((left, right) => {
        const leftTime = this.latestThreadTimestamp(left);
        const rightTime = this.latestThreadTimestamp(right);
        return rightTime - leftTime;
      });
  }
  get pinnedMessages(): Message[] {
    return this.rawMessages
      .filter((m) => m.pinned && !m.isSystem)
      .sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0));
  }

  get activeThread(): Message | null {
    if (!this.activeThreadId) return null;
    for (const ch of this.channels) {
      const f = this.findMsgInTree(
        this.channelMessages[ch.id] || [],
        this.activeThreadId,
      );
      if (f) return f;
    }
    // FIX: Also search DM messages so DM threads work in the right panel
    for (const dm of this.dmContacts) {
      const f = this.findMsgInTree(
        this.dmMessages[dm.id] || [],
        this.activeThreadId,
      );
      if (f) return f;
    }
    return null;
  }

  get activeThreadReplyTarget(): Message | null {
    if (!this.activeThreadReplyToId || !this.activeThread) return null;
    return this.findMsgInTree(
      this.activeThread.replies,
      this.activeThreadReplyToId,
    );
  }

  get rightPanelOpen(): boolean {
    return (
      this.showPinnedPanel || !!this.activeThreadId || this.showChannelDetails
    );
  }
  get rightPanelMode(): 'pinned' | 'thread' | 'details' | null {
    if (this.showChannelDetails) return 'details';
    if (this.showPinnedPanel) return 'pinned';
    if (this.activeThreadId) return 'thread';
    return null;
  }

  private latestThreadTimestamp(message: Message): number {
    const ownTime = this.messageTimestamp(message);
    const replyTimes = (message.replies || []).map((reply) =>
      this.latestThreadTimestamp(reply),
    );
    return Math.max(ownTime, ...replyTimes, 0);
  }

  private messageTimestamp(message: Message): number {
    const parsed = parseServerDate(message.sentAtRaw);
    return parsed?.getTime() || message.createdAt?.getTime() || 0;
  }

  private decorateThreadMessage(
    message: Message,
    metadata: {
      sourceType: 'channel' | 'dm';
      sourceLabel: string;
      sourceSecondaryLabel: string;
    },
  ): Message {
    const replies = this.flattenThreadReplies(message);
    const latestReply = replies[replies.length - 1];
    const summary = replies
      .slice(0, 2)
      .map((reply) => `${reply.author}: ${reply.content}`)
      .join(' • ');
    return {
      ...message,
      sourceType: metadata.sourceType,
      sourceLabel: metadata.sourceLabel,
      sourceSecondaryLabel: metadata.sourceSecondaryLabel,
      threadSummary: summary || message.content,
      threadReplyCount: replies.length,
      threadLastActivityRaw: latestReply?.sentAtRaw || message.sentAtRaw,
    };
  }

  private flattenThreadReplies(message: Message): Message[] {
    const output: Message[] = [];
    const walk = (items: Message[]) => {
      for (const item of items) {
        output.push(item);
        if (item.replies?.length) {
          walk(item.replies);
        }
      }
    };
    walk(message.replies || []);
    return output;
  }

  private resolveThreadMessageSource(message: Message): {
    type: 'channel' | 'dm';
    channelBackendId?: number;
    dmChannelId?: number;
  } | null {
    for (const channel of this.channels) {
      if (this.findMsgInTree(this.channelMessages[channel.id] || [], message.id)) {
        return { type: 'channel', channelBackendId: channel.backendId };
      }
    }
    for (const contact of this.dmContacts) {
      if (this.findMsgInTree(this.dmMessages[contact.id] || [], message.id)) {
        return { type: 'dm', dmChannelId: contact.dmChannelId };
      }
    }
    return null;
  }

  private updateDmConversationMeta(contact: DmContact, messages: Message[]): void {
    const latest = this.findLatestMessage(messages);
    if (!latest) return;
    contact.lastMessagePreview = latest.attachment?.name
      ? `Attachment: ${latest.attachment.name}`
      : latest.content;
    contact.lastMessageTime = latest.time;
  }

  private findLatestMessage(messages: Message[]): Message | null {
    const output: Message[] = [];
    const walk = (items: Message[]) => {
      for (const item of items) {
        output.push(item);
        if (item.replies?.length) {
          walk(item.replies);
        }
      }
    };
    walk(messages || []);
    if (!output.length) return null;
    return output.sort(
      (left, right) => this.messageTimestamp(right) - this.messageTimestamp(left),
    )[0];
  }

  get allThreaded(): { msg: Message; channelName: string }[] {
    const out: { msg: Message; channelName: string }[] = [];
    for (const ch of this.channels)
      (this.channelMessages[ch.id] || [])
        .filter((m) => m.replies.length)
        .forEach((m) => out.push({ msg: m, channelName: ch.name }));
    return out;
  }

  get nonMembers(): EmployeeProfile[] {
    const memberUserIds = new Set(this.channelMembers.map((m) => m.userId));
    const bannedUserIds = new Set(this.bannedChannelMembers.map((m) => m.userId));
    return this.allEmployees.filter(
      (e) =>
        e.user?.userId != null &&
        !memberUserIds.has(Number(e.user.userId)) &&
        !bannedUserIds.has(Number(e.user.userId)) &&
        Number(e.user.userId) !== this.me.userId,
    );
  }

  get modalEmployees(): EmployeeProfile[] {
    return this.allEmployees.filter(
      (e) => e.user?.userId != null && Number(e.user.userId) !== this.me.userId,
    );
  }

  isChannelOwner(): boolean {
    return this.activeChannel?.createdBy === this.me.userId;
  }
  isOwnMessage(msg: Message): boolean {
    return Number(msg.senderUserId) === Number(this.me.userId);
  }

  getReadCount(msg: Message): number {
    if (!msg.backendId) return 0;
    return (this.readStateMap[msg.backendId] || []).filter(
      (uid) => uid !== this.me.userId,
    ).length;
  }

  findMsgInTree(messages: Message[], id: string): Message | null {
    for (const m of messages) {
      if (m.id === id) return m;
      const f = this.findMsgInTree(m.replies, id);
      if (f) return f;
    }
    return null;
  }

  composerPlaceholder(): string {
    if (this.activeView === 'dm')
      return 'Message ' + (this.activeDmContact?.shortName ?? '');
    return 'Message #' + (this.activeChannel?.name ?? '');
  }

  togglePinnedPanel(): void {
    this.showPinnedPanel = !this.showPinnedPanel;
    if (this.showPinnedPanel) {
      this.activeThreadId = null;
      this.showChannelDetails = false;
    }
  }

  closePinnedPanel(): void {
    this.showPinnedPanel = false;
  }

  downloadAttachment(
    attachment: { name: string; downloadUrl?: string },
    e: Event,
  ): void {
    e.preventDefault();
    if (!attachment.downloadUrl) return;
    const token = sessionStorage.getItem('token') || '',
      tenantId = sessionStorage.getItem('tenantId') || 'default',
      userId = sessionStorage.getItem('userid') || '';
    const url = attachment.downloadUrl.startsWith('http')
      ? attachment.downloadUrl
      : `${this.collabService.apiBaseUrl}${attachment.downloadUrl}`;
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'X-User-ID': userId,
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        const obj = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), {
          href: obj,
          download: attachment.name || 'download',
        });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(obj), 10_000);
      })
      .catch((err) => console.error('[Comm] download failed:', err));
  }

  openThreadFromList(msg: Message, event: Event): void {
    event.stopPropagation();
    this.selectedThreadMsg = msg;
    this.threadReplyDraft = '';
    this.cdr.detectChanges();
  }

  closeSelectedThread(): void {
    this.selectedThreadMsg = null;
    this.cdr.detectChanges();
  }

  getChannelNameForMsg(msg: Message): string {
    for (const ch of this.channels) {
      if ((this.channelMessages[ch.id] || []).find((m) => m.id === msg.id))
        return ch.name;
    }
    return '';
  }

  sendThreadReply(): void {
    const text = this.threadReplyDraft.trim(),
      rootMsg = this.selectedThreadMsg;
    if (!text || !rootMsg || this.sendingReply) return;

    const channelId = this.getChannelIdForMsg(rootMsg);
    const ch = this.channels.find((c) => c.id === channelId);
    // Also find DM channel if not a regular channel message
    const dmContact = !ch
      ? this.dmContacts.find((d) =>
          (this.dmMessages[d.id] || []).find((m) => m.id === rootMsg.id),
        )
      : null;
    const backendChId = ch?.backendId ?? dmContact?.dmChannelId;

    if (!backendChId || !rootMsg.backendId) {
      rootMsg.replies.push(this.makeLocalMsg(text));
      this.threadReplyDraft = '';
      this.selectedThreadMsg = { ...rootMsg };
      this.cdr.detectChanges();
      return;
    }

    this.sendingReply = true;
    const optimistic = this.makeLocalMsg(text);
    optimistic.replyToMessageId = rootMsg.backendId;
    optimistic.threadRootMessageId = rootMsg.backendId;
    rootMsg.replies = [...rootMsg.replies, optimistic];
    this.selectedThreadMsg = { ...rootMsg, replies: rootMsg.replies };
    this.threadReplyDraft = '';
    this.scrollThread = true;
    this.cdr.detectChanges();

    this.collabService
      .sendMessage({
        channelId: backendChId,
        senderUserId: this.me.userId,
        content: text,
        messageType: 'TEXT',
        replyToMessageId: rootMsg.backendId,
        threadRootMessageId: rootMsg.backendId,
      })
      .subscribe({
        next: (saved) => {
          optimistic.backendId = saved.id;
          optimistic.id = `backend-${saved.id}`;
          this.sendingReply = false;
          this.cdr.detectChanges();
        },
        error: () => {
          rootMsg.replies = rootMsg.replies.filter((r) => r !== optimistic);
          this.selectedThreadMsg = { ...rootMsg };
          this.sendingReply = false;
          this.cdr.detectChanges();
        },
      });
  }

  getChannelIdForMsg(msg: Message): string {
    for (const ch of this.channels) {
      if ((this.channelMessages[ch.id] || []).find((m) => m.id === msg.id))
        return ch.id;
    }
    return this.activeChannelId;
  }

  // ── DM thread helpers ─────────────────────────────────

  /**
   * Opens a thread for a DM message in the right panel (same as channel thread).
   * Wire this up in the template: (threadOpened)="openThread($event)" works for
   * both channel and DM since activeThread getter searches both message stores.
   */
  openDmThread(payload: { msg: Message; event?: Event }): void {
    this.openThread(payload);
  }

  private async uploadSelectedFeedMedia(): Promise<CollabFeedMediaItem[]> {
    return this.uploadFeedDraftMedia(this.selectedFeedMedia);
  }

  private clearFeedMediaSelection(): void {
    this.clearFeedMediaDrafts(this.selectedFeedMedia);
    this.selectedFeedMedia = [];
  }

  private collectFeedMediaDrafts(event: Event, target: FeedMediaDraft[]): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    this.feedMediaError = '';
    for (const file of files) {
      target.push({
        file,
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type,
        previewUrl:
          this.isImageType(file.type) || (file.type || '').startsWith('video/')
            ? URL.createObjectURL(file)
            : undefined,
      });
    }
    input.value = '';
  }

  private removeFeedMediaDraft(target: FeedMediaDraft[], index: number): void {
    const media = target[index];
    if (media?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(media.previewUrl);
    }
    target.splice(index, 1);
  }

  private clearFeedMediaDrafts(target: FeedMediaDraft[]): void {
    for (const item of target) {
      if (item.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
    }
  }

  private async uploadFeedDraftMedia(drafts: FeedMediaDraft[]): Promise<CollabFeedMediaItem[]> {
    if (!drafts.length) return [];
    const uploads = drafts.map((item) =>
      firstValueFrom(this.collabService.uploadFeedMedia(item.file)).catch(
        (error) => {
          const reason =
            error?.error?.message ||
            error?.message ||
            'Media upload failed.';
          throw new Error(
            `${item.name}: ${reason}`,
          );
        },
      ),
    );
    const results = await Promise.all(uploads);
    return results.map((item) => ({
      mediaType: item.mediaType || this.mapMediaType(item.contentType),
      url: item.url,
      thumbnailUrl: item.thumbnailUrl || item.url,
      caption: item.caption,
    }));
  }

  private mapMediaType(contentType?: string): string {
    if (this.isImageType(contentType)) return 'IMAGE';
    if ((contentType || '').startsWith('video/')) return 'VIDEO';
    return 'FILE';
  }

  private normalizeAttachmentType(contentType?: string, fileName?: string): string {
    if (contentType) return contentType;
    const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
      return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    }
    return 'application/octet-stream';
  }

  private isImageType(type?: string): boolean {
    return (type || '').toLowerCase().startsWith('image/');
  }

  private resetFeedComposer(): void {
    this.postComposer = {
      body: '',
      postType: 'UPDATE',
    };
    this.editingFeedPostId = null;
    this.editingFeedPostMedia = [];
    this.feedComposerShowMentionMenu = false;
    this.feedComposerMentionResults = [];
    this.feedMediaError = '';
    if (this.feedComposerEl?.nativeElement) {
      this.feedComposerEl.nativeElement.innerHTML = '';
    }
    this.clearFeedMediaSelection();
  }

  private resolveAttachmentPreviewUrl(att: any): string | undefined {
    const type = this.normalizeAttachmentType(att.contentType, att.fileName);
    if (!this.isImageType(type)) return undefined;
    const key = att.downloadUrl || `${att.messageId}-${att.fileName}`;
    if (this.attachmentPreviewCache[key]) {
      return this.attachmentPreviewCache[key];
    }
    if (!this.attachmentPreviewLoading.has(key) && att.downloadUrl) {
      this.attachmentPreviewLoading.add(key);
      this.fetchAttachmentBlobUrl(att.downloadUrl)
        .then((url) => {
          this.attachmentPreviewCache[key] = url;
          this.syncAttachmentPreviewUrls(key, url);
        })
        .finally(() => {
          this.attachmentPreviewLoading.delete(key);
        });
    }
    return undefined;
  }

  private syncAttachmentPreviewUrls(key: string, previewUrl: string): void {
    const sync = (messages: Message[]) => {
      for (const message of messages) {
        if (message.attachment) {
          const attachmentKey =
            message.attachment.downloadUrl ||
            `${message.backendId || message.id}-${message.attachment.name}`;
          if (attachmentKey === key) {
            message.attachment.previewUrl = previewUrl;
          }
        }
        if (message.replies.length) {
          sync(message.replies);
        }
      }
    };

    Object.values(this.channelMessages).forEach((messages) => sync(messages || []));
    Object.values(this.dmMessages).forEach((messages) => sync(messages || []));
    this.cdr.detectChanges();
  }

  private async fetchAttachmentBlobUrl(downloadUrl: string): Promise<string> {
    const token = sessionStorage.getItem('token') || '';
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const userId =
      sessionStorage.getItem('userid') ||
      sessionStorage.getItem('userId') ||
      String(this.me.userId || '');
    const url = downloadUrl.startsWith('http')
      ? downloadUrl
      : `${this.collabService.apiBaseUrl}${downloadUrl}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'X-User-ID': userId,
      },
    });
    if (!response.ok) {
      throw new Error(`${response.status}`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  private resolveProtectedMediaUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('blob:')) return url;
    if (/^https?:\/\//i.test(url) && !url.includes('/x/api/v2/')) {
      return url;
    }
    const absoluteUrl = /^https?:\/\//i.test(url)
      ? url
      : `${this.collabService.apiBaseUrl}${url}`;
    if (this.attachmentPreviewCache[url]) {
      return this.attachmentPreviewCache[url];
    }
    if (!this.attachmentPreviewLoading.has(url)) {
      this.attachmentPreviewLoading.add(url);
      this.fetchAttachmentBlobUrl(url)
        .then((blobUrl) => {
          this.attachmentPreviewCache[url] = blobUrl;
          this.cdr.detectChanges();
        })
        .finally(() => {
          this.attachmentPreviewLoading.delete(url);
        });
    }
    return absoluteUrl;
  }

  trackById(_: number, m: { id: string }): string {
    return m.id;
  }
  trackByThreaded(_: number, t: { msg: Message; channelName: string }): string {
    return t.msg.id;
  }

  getChannelIconPath(name: string): string {
    const n = (name || '').toLowerCase();
    if (/announce|broadcast|news|alert|update/.test(n))
      return 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z';
    if (/general|team|lounge|water|social|random|fun/.test(n))
      return 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z';
    if (/dev|eng|code|tech|backend|frontend|software|api|infra/.test(n))
      return 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4';
    if (/design|ui|ux|creative|brand|style|visual/.test(n))
      return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
    if (/sale|revenue|growth|business|deal|client|customer/.test(n))
      return 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6';
    if (/support|help|ticket|assist/.test(n))
      return 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z';
    if (/ops|operation|infra|devops|deploy|server/.test(n))
      return 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01';
    if (/hr|people|culture|talent|recruit|hiring/.test(n))
      return 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z';
    if (/market|campaign|ads|seo/.test(n))
      return 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z';
    if (/finance|account|budget|money|payment|invoice/.test(n))
      return 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    if (/product|roadmap|plan|feature|backlog/.test(n))
      return 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01';
    return 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z';
  }

  private makeLocalMsg(
    content: string,
    attachment?: {
      name: string;
      size: string;
      type: string;
      previewUrl?: string;
    },
  ): Message {
    const msg: Message = {
      id: 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      author: this.me.name,
      initials: this.me.initials,
      avatarColor: this.me.avatarColor,
      avatarUrl: this.me.avatarUrl,
      time: new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      content,
      replies: [],
      liked: false,
      likeCount: 0,
      pinned: false,
      createdAt: new Date(),
      senderUserId: this.me.userId,
      deliveryState: 'SENDING',
    };
    if (attachment) msg.attachment = attachment;
    return msg;
  }

  // Legacy aliases kept for compatibility
  private fetchAndAppendNewMessages(channel: Channel): void {
    this.fetchAndReconcileChannel(channel);
  }
  private fetchAndAppendNewDmMessages(
    contact: DmContact,
    channelId: number,
  ): void {
    this.fetchAndReconcileDm(contact, channelId);
  }

  private extractSubjectAndBody(content: string): {
    subject: string;
    body: string;
  } {
    const lines = content.trim().split('\n');
    let subject = '',
      bodyStartIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const subjectMatch = line.match(/^Subject:\s*(.+)$/i);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        bodyStartIndex = i + 1;
        while (bodyStartIndex < lines.length && !lines[bodyStartIndex].trim())
          bodyStartIndex++;
      }
      break;
    }
    return { subject, body: lines.slice(bodyStartIndex).join('\n').trim() };
  }

  onAiOutputUsed(content: string): void {
    const { subject, body } = this.extractSubjectAndBody(content);
    const recipients: { email: string; name: string; locked: boolean }[] = [];
    if (this.activeView === 'dm' && this.activeDmContact) {
      const email =
        this.activeDmContact.email ||
        this.getEmailForUser(this.activeDmContact.userId);
      if (email)
        recipients.push({
          email,
          name: this.activeDmContact.fullName,
          locked: true,
        });
    } else if (this.activeView === 'channel') {
      recipients.push(...this.getChannelMemberEmails());
    }
    this.emailModal = {
      open: true,
      recipients,
      toInput: '',
      subject,
      body,
      sending: false,
      result: '',
      width: Math.min(640, window.innerWidth - 80),
    };
    this.cdr.detectChanges();
  }
}

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
import { Router } from '@angular/router';
import { Client } from '@stomp/stompjs';
import {
  CollabChannel,
  CollabChannelSnap,
  CollabMessage,
  CollabMember,
  CollabAttachmentFull,
  CollabDocumentFolder,
  CollaborationService,
  EmployeeProfile,
  UserPrimaryInfo,
  AiRewriteResponse,
  AiSubjectResponse,
  AiSummaryResponse,
  AiEmailComposeResponse,
  CollabFeedHome,
  CollabFeedNotification,
  CollabFeedPost,
  CollabFeedComment,
  CollabFeedMediaItem,
  CollabFeedReactionUser,
  TaskRoutineSummary,
} from '../ui/services/collaboration.service';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';
import { HeaderStateService } from '../../../../../src/app/ui/shared/service/header-state.service';
import {
  ComposerLinkPreview,
  ComposerMentionOption,
  MessageComposerComponent,
} from './message-composer/message-composer.component';

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
  attachments?: Array<{
    name: string;
    size: string;
    type?: string;
    downloadUrl?: string;
    previewUrl?: string;
  }>;
  isSystem?: boolean;
  senderUserId?: number;
  replyToMessageId?: number;
  threadRootMessageId?: number;
  deleting?: boolean;
  deliveryState?: 'SENDING' | 'DELIVERED' | 'READ' | 'FAILED';
  sourceType?: 'channel' | 'dm';
  sourceLabel?: string;
  sourceSecondaryLabel?: string;
  threadSummary?: string;
  threadReplyCount?: number;
  threadLastActivityRaw?: string | number[];
  messageType?: string;
  retryMeta?: {
    mode: 'channel' | 'dm' | 'thread';
    backendChannelId: number;
    content: string;
    files?: File[];
    attachments?: Array<{
      name: string;
      size: string;
      type?: string;
      previewUrl?: string;
    }>;
    replyToMessageId?: number;
    threadRootMessageId?: number;
  };
}

export interface Channel {
  id: string;
  backendId: number;
  name: string;
  description?: string;
  channelType?: 'PUBLIC' | 'PRIVATE';
  workspaceMode?: 'CHAT' | 'DOCUMENT_LIBRARY' | 'HYBRID';
  allowFolders?: boolean;
  allowSubfolders?: boolean;
  createdBy?: number;
  hasUnread?: boolean;
  unreadCount?: number;
}

interface ChannelDocumentFile {
  id: number;
  folderId?: number | null;
  name: string;
  contentType?: string;
  fileSize?: number;
  downloadUrl?: string;
  uploadedAt?: string;
  downloadCount?: number;
}

interface DocumentFolderModalState {
  open: boolean;
  mode: 'create' | 'edit';
  folderId: number | null;
  name: string;
  description: string;
  parentFolderId: number | null;
  createdByLabel: string;
  createdAtLabel: string;
  saving: boolean;
  error: string;
}

interface FolderTreeItem {
  folder: CollabDocumentFolder;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}

interface DocShareModalState {
  open: boolean;
  itemName: string;
  itemType: 'file' | 'folder';
  itemUrl: string;
  targetType: 'channel' | 'dm';
  targetId: string;
  sending: boolean;
  error: string;
}

export interface DmContact {
  id: string;
  employeeId: number;
  userId: number;
  username?: string;
  shortName: string;
  fullName: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
  email?: string;
  accountVerified?: boolean | string;
  accountState?: string;
  jobTitle?: string;
  department?: string;
  online: boolean;
  hasUnread?: boolean;
  unreadCount?: number;
  dmChannelId?: number;
  dmChannelIds?: number[];
  lastMessagePreview?: string;
  lastMessageTime?: string;
  lastMessageTimestamp?: number;
  openIssueCount?: number;
  openTaskCount?: number;
  openEventCount?: number;
  phone?: string;
  dob?: string;
  birthdayMonthDayLabel?: string;
  birthdayCountdownLabel?: string;
  daysUntilBirthday?: number | null;
  birthdayIsToday?: boolean;
}

interface BirthdayReminderItem {
  id: string;
  employeeId: number;
  userId: number;
  fullName: string;
  shortName: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
  jobTitle?: string;
  department?: string;
  dob: string;
  birthdayMonthDayLabel: string;
  birthdayCountdownLabel: string;
  daysUntilBirthday: number;
  birthdayIsToday: boolean;
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

interface ChatArrivalToast {
  id: number;
  title: string;
  body: string;
  avatarUrl?: string;
  initials: string;
  tone: 'dm' | 'channel';
  channelId?: string;
  dmId?: string;
  messageBackendId?: number;
  threadRootMessageBackendId?: number;
}

interface ChatReactionOption {
  code: string;
  emoji: string;
  label: string;
}

interface HoverPerson {
  name: string;
  avatarUrl?: string;
  initials: string;
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

const COLLAB_UNREAD_SNAPSHOT_KEY = 'optimax_collab_unread_snapshot';

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

interface FeedLinkPreview {
  url: string;
  displayUrl: string;
  title: string;
  subtitle: string;
  thumbnailUrl: string;
  kind: 'image' | 'video' | 'youtube' | 'website';
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
const FEED_URL_REGEX = /((https?:\/\/|www\.)[^\s<]+)/gi;
const BIRTHDAY_REMINDER_WINDOW_DAYS = 10;

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
  @ViewChild(MessageComposerComponent) messageComposer?: MessageComposerComponent;
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
  renderedRecentFeedPosts: CollabFeedPost[] = [];
  renderedFeaturedFeedPosts: CollabFeedPost[] = [];
  trendingTags: string[] = [];
  selectedFeedPostId: number | null = null;
  showViewedFeedPosts = false;
  feedPage = 1;
  feedPageSize = 10;
  feedHasMore = false;
  loadingMoreFeed = false;
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
  expandedFeedMediaItems: Array<{ url: string; label: string; mediaType: string }> = [];
  expandedFeedMediaIndex = 0;
  private feedReactionHoverCache: Record<string, string> = {};
  private feedReactionUsersCache: Record<string, HoverPerson[]> = {};
  private seenFeedNotificationIds = new Set<number>();
  private viewedFeedPostIds = new Set<number>();
  private protectedMediaUrlCache: Record<string, string> = {};
  private protectedMediaLoading = new Set<string>();
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
  showChatRail = false;
  showFeedRail = false;
  mobileSidebarOpen = false;
  showSearch = false;
  searchQuery = '';
  searchResults: { msg: Message; channelId: string; channelName: string }[] =
    [];
  selectedThreadMsg: Message | null = null;

  draft = '';
  chatMentionResults: EmployeeProfile[] = [];
  chatShowMentionMenu = false;
  threadReplyDraft = '';
  threadMentionResults: EmployeeProfile[] = [];
  threadShowMentionMenu = false;
  threadPendingFiles: File[] = [];
  threadPendingAttachments: Array<{
    name: string;
    size: string;
    type: string;
    previewUrl?: string;
  }> = [];
  pendingFiles: File[] = [];
  pendingAttachments: Array<{
    name: string;
    size: string;
    type: string;
    previewUrl?: string;
  }> = [];
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
    workspaceMode: 'CHAT' as 'CHAT' | 'DOCUMENT_LIBRARY' | 'HYBRID',
    allowFolders: false,
    allowSubfolders: false,
    selectedUserIds: [] as number[],
    saving: false,
    error: '',
    editingChannelId: undefined as number | undefined,
    editingCreatedBy: undefined as number | undefined,
  };

  documentFolders: CollabDocumentFolder[] = [];
  documentFiles: ChannelDocumentFile[] = [];
  folderTreeItems: FolderTreeItem[] = [];
  documentLibraryLoading = false;
  documentLibraryError = '';
  activeDocumentFolderId: number | null = null;
  expandedFolderIds: Set<number> = new Set();
  copiedFileId: number | null = null;
  birthdayCardDismissed = true;
  pendingShareDocTarget: { channelBackendId: number; folderId: number | null } | null = null;
  pendingShareFolderId: number | null = null;
  channelWorkspacePane: 'chat' | 'files' = 'chat';
  docShareModal: DocShareModalState = {
    open: false,
    itemName: '',
    itemType: 'file',
    itemUrl: '',
    targetType: 'channel',
    targetId: '',
    sending: false,
    error: '',
  };
  documentFolderModal: DocumentFolderModalState = {
    open: false,
    mode: 'create',
    folderId: null,
    name: '',
    description: '',
    parentFolderId: null,
    createdByLabel: '',
    createdAtLabel: '',
    saving: false,
    error: '',
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
  taskRoutineTodos: TaskRoutineSummary[] = [];
  upcomingBirthdays: BirthdayReminderItem[] = [];

  workspaceFocusItems: CollaborationFocusItem[] = [];
  chatArrivalToasts: ChatArrivalToast[] = [];
  private chatArrivalToastTimers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly workspaceMoments: CollaborationMoment[] = [
    { id: 1, title: 'Leadership stand-up', time: '9:30 AM', type: 'Meeting' },
    { id: 2, title: 'Quarterly review pack due', time: '1:00 PM', type: 'Deadline' },
    { id: 3, title: 'Policy rollout note', time: '3:45 PM', type: 'Update' },
  ];

  sidebarWidth = 240;
  threadPanelWidth = 460;
  chatRailWidth = 340;
  readonly SIDEBAR_MIN = 200;
  readonly SIDEBAR_MAX = 340;
  readonly THREAD_MIN = 360;
  readonly THREAD_MAX = 720;
  readonly CHAT_RAIL_MIN = 300;
  readonly CHAT_RAIL_MAX = 520;
  isResizingSidebar = false;
  isResizingThread = false;
  isResizingChatRail = false;
  private resizeStartX = 0;
  private resizeStartWidth = 0;

  channels: Channel[] = [];
  dmContacts: DmContact[] = [];
  allEmployees: EmployeeProfile[] = [];
  private allIssues: any[] = [];
  private allTasks: any[] = [];
  private allEvents: any[] = [];

  analyticsPanel: {
    open: boolean;
    contact: DmContact | null;
    issues: any[];
    tasks: any[];
    events: any[];
  } = { open: false, contact: null, issues: [], tasks: [], events: [] };

  channelAttachmentsPanel: {
    open: boolean;
    channel: Channel | null;
    attachments: any[];
    loading: boolean;
    activeTab: 'documents' | 'media' | 'links';
    searchQuery: string;
    links: string[];
  } = { open: false, channel: null, attachments: [], loading: false, activeTab: 'documents', searchQuery: '', links: [] };

  selfContact: DmContact | null = null;
  selfStats = { openIssueCount: 0, openTaskCount: 0, openEventCount: 0 };

  get totalDmUnread(): number {
    return (this.dmContacts || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }
  channelMessages: Record<string, Message[]> = {};
  dmMessages: Record<string, Message[]> = {};
  channelMembers: CollabMember[] = [];
  bannedChannelMembers: CollabMember[] = [];
  channelMembersLoading = false;

  channelsLoading = true;
  channelsError: string | null = null;
  private channelsRequestInFlight = false;
  private lastChannelsLoadedAt = 0;
  private readonly CHANNELS_CACHE_TTL_MS = 15_000;
  employeesLoading = true;
  employeesError: string | null = null;
  dmDeactivateDialog: {
    open: boolean;
    contact: DmContact | null;
    saving: boolean;
    error: string;
  } = {
    open: false,
    contact: null,
    saving: false,
    error: '',
  };
  deactivatedDmUsersDialog: {
    open: boolean;
    loading: boolean;
    error: string;
    users: any[];
    restoringUserId: number | null;
  } = {
    open: false,
    loading: false,
    error: '',
    users: [],
    restoringUserId: null,
  };
  messagesLoading = false;
  conversationAccessMessage = '';
  soundEnabled = true;
  selectedRingtone = 'telephone';
  readonly ringtoneOptions = [
    { value: 'telephone', label: 'Old telephone' },
    { value: 'nokia', label: 'Nokia' },
    { value: 'classic', label: 'Classic ping' },
    { value: 'soft', label: 'Soft chime' },
    { value: 'crystal', label: 'Crystal bell' },
    { value: 'pulse', label: 'Pulse' },
    { value: 'doorbell', label: 'Doorbell' },
  ];
  readonly chatReactionOptions: ChatReactionOption[] = [
    { code: 'LIKE', emoji: '👍', label: 'Like' },
    { code: 'LOVE', emoji: '❤️', label: 'Love' },
    { code: 'LAUGH', emoji: '😂', label: 'Laugh' },
    { code: 'CELEBRATE', emoji: '🎉', label: 'Celebrate' },
    { code: 'FIRE', emoji: '🔥', label: 'Fire' },
  ];

  presenceMap: Record<number, string> = {};
  private presenceUpdatedAtMap: Record<number, string> = {};
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
  private docDownloadCounts: Record<number, number> = {};
  private attachmentPreviewLoading = new Set<string>();
  private flashId: string | null = null;
  private flashTimer: any;
  private pendingNotificationMessageBackendId: number | null = null;
  private queuedNotificationTarget: any = null;
  private typingEndpointBlocked = false;
  private scrollFeed = false;
  private scrollThread = false;
  private chatResourcesLoaded = false;
  private chatRealtimeStarted = false;
  private pendingMentionConversationUserId: number | null = null;

  private stompClient: any = null;
  private wsConnected = false;
  private channelSub: any = null;
  private channelPresenceSub: any = null;
  private channelMessageSubs = new Map<number, any>();
  private dmChannelSubs = new Map<number, any>();
  private dmPresenceSubs = new Map<number, any>();
  private conversationSyncTimer: any = null;
  private readonly INITIAL_CHAT_HISTORY_LIMIT = 30;
  private readonly CHAT_HISTORY_PAGE_SIZE = 30;
  private readonly MAX_CHAT_HISTORY_LIMIT = 240;
  private channelSnapshotInFlight = new Map<
    string,
    Promise<CollabChannelSnap | null>
  >();
  private channelSnapshotFailureUntil = new Map<number, number>();
  private channelSnapshotConsecutiveFailures = new Map<number, number>();
  private channelSnapshotLastErrorStatus = new Map<number, number>();
  private channelSnapshotLastErrorMessage = new Map<number, string>();
  private readonly SNAPSHOT_POLL_MAX_FAILURES = 6;
  private attachmentPreviewFailed = new Set<string>();
  private messageAttachmentHydrationInFlight = new Set<number>();
  private hydratedMessageAttachmentIds = new Set<number>();
  private channelHistoryLimit = new Map<number, number>();
  private channelHistoryExhausted = new Set<number>();
  private historyLoadInFlight = new Set<number>();
  private notificationAudioContext: AudioContext | null = null;
  private audioPrimed = false;
  private loadingOlderHistory = false;
  private historyPagingArmed = false;
  private pendingForcedChannelsRefresh = false;
  private channelsRetryTimer: number | null = null;
  private preserveFeedScrollOffset: number | null = null;
  private dmMembershipRepairAttempted = new Set<string>();
  private dmMembershipRepairInFlight = new Set<string>();
  private cachedCollabChannels: CollabChannel[] = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private collabService: CollaborationService,
    private headerStateService: HeaderStateService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.selectedRingtone = localStorage.getItem('optimax_message_ringtone') || 'telephone';
    this.restoreSeenFeedNotificationIds();
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
      window.addEventListener('hashchange', this.handleMentionHashChange);
      window.addEventListener('touchstart', this.primeNotificationAudio, {
        passive: true,
      });
      window.addEventListener('mousedown', this.primeNotificationAudio, {
        passive: true,
      });
    }
    this.checkVoiceSupport();
    this.requestBrowserNotificationPermission();
    this.loadCurrentUser();
    this.loadFeedHome();
    this.loadChannels();
    this.loadEmployees();
    this.chatResourcesLoaded = true;
    this.connectWebSocket();
    if (this.workspaceMode === 'chat') {
      this.startPresencePoll();
      this.startConversationSync();
    }
    this.processMentionHashNavigation();
  }

  ngOnDestroy() {
    if (this.flashTimer) clearTimeout(this.flashTimer);
    if (this.typingTimer) clearTimeout(this.typingTimer);
    if (this.channelsRetryTimer != null) clearTimeout(this.channelsRetryTimer);
    if (this.presencePollTimer) clearInterval(this.presencePollTimer);
    if (this.conversationSyncTimer) clearInterval(this.conversationSyncTimer);
    if (this.callDurationTimer) clearInterval(this.callDurationTimer);
    if (this.recognition) {
      try {
        this.voiceManualStop = true;
        this.recognition.stop();
      } catch (_) {}
    }
    this.disconnectWebSocket();
    this.chatArrivalToastTimers.forEach((timer) => clearTimeout(timer));
    this.chatArrivalToastTimers.clear();
    Object.values(this.imageCache).forEach((url) => URL.revokeObjectURL(url));
    Object.values(this.userAvatarCache).forEach((url) =>
      URL.revokeObjectURL(url),
    );
    Object.values(this.attachmentPreviewCache).forEach((url) =>
      URL.revokeObjectURL(url),
    );
    Object.values(this.protectedMediaUrlCache).forEach((url) =>
      URL.revokeObjectURL(url),
    );
    this.clearFeedMediaSelection();
    this.clearPendingAttachments(false);
    if (typeof window !== 'undefined') {
      window.removeEventListener(
        'optimax-open-collab-target',
        this.handleNotificationTarget as EventListener,
      );
      window.removeEventListener('hashchange', this.handleMentionHashChange);
      window.removeEventListener('touchstart', this.primeNotificationAudio as EventListener);
      window.removeEventListener('mousedown', this.primeNotificationAudio as EventListener);
    }
  }

  ngAfterViewChecked() {
    if (this.scrollFeed && this.feedEl?.nativeElement) {
      this.feedEl.nativeElement.scrollTop =
        this.feedEl.nativeElement.scrollHeight;
      this.scrollFeed = false;
    } else if (
      this.preserveFeedScrollOffset != null &&
      this.feedEl?.nativeElement
    ) {
      const el = this.feedEl.nativeElement;
      el.scrollTop = Math.max(
        el.scrollHeight - this.preserveFeedScrollOffset,
        0,
      );
      this.preserveFeedScrollOffset = null;
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
    this.writeCurrentUnreadSnapshot();
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
    messageBackendId?: number;
    threadRootMessageBackendId?: number;
  }): void {
    this.headerStateService.pushNotification(payload);
  }

  private pushChatMessagePreview(payload: {
    title: string;
    body: string;
    avatarUrl?: string;
    contextLabel?: string;
    channelBackendId?: number;
    dmUserId?: number;
    messageBackendId?: number;
    threadRootMessageBackendId?: number;
  }): void {
    this.headerStateService.pushMessagePreview({
      title: payload.title,
      body: payload.body,
      createdAt: Date.now(),
      route: this.resolveCollaborationRoute(),
      avatarUrl: payload.avatarUrl,
      contextLabel: payload.contextLabel,
      workspaceMode: 'chat',
      channelBackendId: payload.channelBackendId,
      dmUserId: payload.dmUserId,
      messageBackendId: payload.messageBackendId,
      threadRootMessageBackendId: payload.threadRootMessageBackendId,
    });
  }

  private pushChatArrivalToast(payload: {
    title: string;
    body: string;
    avatarUrl?: string;
    tone: 'dm' | 'channel';
    channelId?: string;
    dmId?: string;
    messageBackendId?: number;
    threadRootMessageBackendId?: number;
  }): void {
    const toastId = Date.now() + Math.floor(Math.random() * 1000);
    const initials = (payload.title || 'M')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'M';
    const toast: ChatArrivalToast = {
      id: toastId,
      title: payload.title,
      body: payload.body,
      avatarUrl: payload.avatarUrl,
      initials,
      tone: payload.tone,
      channelId: payload.channelId,
      dmId: payload.dmId,
      messageBackendId: payload.messageBackendId,
      threadRootMessageBackendId: payload.threadRootMessageBackendId,
    };
    this.chatArrivalToasts = [toast, ...this.chatArrivalToasts].slice(0, 3);
    this.triggerMobileHaptics();
    const timer = setTimeout(
      () => this.dismissChatArrivalToast(toastId),
      this.isMobileViewport() ? 6500 : 4000,
    );
    this.chatArrivalToastTimers.set(toastId, timer);
    this.cdr.detectChanges();
  }

  dismissChatArrivalToast(id: number): void {
    const timer = this.chatArrivalToastTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.chatArrivalToastTimers.delete(id);
    }
    this.chatArrivalToasts = this.chatArrivalToasts.filter((toast) => toast.id !== id);
    this.cdr.detectChanges();
  }

  openChatArrivalToast(toast: ChatArrivalToast): void {
    this.dismissChatArrivalToast(toast.id);
    this.pendingNotificationMessageBackendId =
      Number(toast.messageBackendId || toast.threadRootMessageBackendId || 0) || null;
    this.setWorkspaceMode('chat');
    if (toast.dmId) {
      this.selectDm(toast.dmId, true);
      return;
    }
    if (toast.channelId) {
      this.selectChannel(toast.channelId, true);
    }
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

  get recentFeedPosts(): CollabFeedPost[] {
    return this.renderedRecentFeedPosts;
  }

  get oldFeedPosts(): CollabFeedPost[] {
    return this.feedPosts.filter((post) => this.viewedFeedPostIds.has(Number(post.id)));
  }

  get visibleFeaturedFeedPosts(): CollabFeedPost[] {
    return this.renderedFeaturedFeedPosts;
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
    if (this.isMobileViewport()) {
      this.mobileSidebarOpen = false;
    }
    if (mode === 'chat') {
      this.ensureChatBootstrap();
      this.startConversationSync();
      return;
    }
    this.stopPresencePolling();
    this.stopConversationSync();
    this.unsubscribeChatStreams();
  }

  toggleFeedRail(): void {
    if (this.isMobileViewport()) {
      this.showFeedRail = false;
      return;
    }
    this.showFeedRail = !this.showFeedRail;
  }

  isMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 920;
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen = false;
  }

  onSidebarChannelSelected(id: string): void {
    this.closeMobileSidebar();
    this.selectChannel(id);
  }

  onSidebarDmSelected(id: string): void {
    this.closeMobileSidebar();
    this.selectDm(id);
  }

  deactivateDmContact(contact: DmContact): void {
    if (!this.canManageChannels || !contact?.userId) {
      return;
    }
    this.dmDeactivateDialog = {
      open: true,
      contact,
      saving: false,
      error: '',
    };
    this.closeMobileSidebar();
  }

  closeDmDeactivateDialog(): void {
    if (this.dmDeactivateDialog.saving) {
      return;
    }
    this.dmDeactivateDialog = {
      open: false,
      contact: null,
      saving: false,
      error: '',
    };
  }

  confirmDmDeactivate(): void {
    const contact = this.dmDeactivateDialog.contact;
    if (!this.canManageChannels || !contact?.userId || this.dmDeactivateDialog.saving) {
      return;
    }
    this.dmDeactivateDialog = {
      ...this.dmDeactivateDialog,
      saving: true,
      error: '',
    };

    this.collabService.deactivateDmUser(contact.userId).subscribe({
      next: () => {
        this.dmContacts = this.dmContacts.filter((dm) => dm.id !== contact.id);
        this.allEmployees = this.allEmployees.map((employee) => {
          const employeeUserId = Number(this.employeeUserId(employee) || 0);
          if (employeeUserId !== Number(contact.userId)) {
            return employee;
          }
          return {
            ...employee,
            accountVerified: false,
            accountState: 'SUSPENDED',
            user: employee.user
              ? {
                  ...employee.user,
                  accountVerified: false,
                  accountState: 'SUSPENDED',
                }
              : employee.user,
          };
        });
        if (this.activeView === 'dm' && this.activeDmId === contact.id) {
          this.activeDmId = '';
          if (this.channels.length) {
            this.selectChannel(this.channels[0].id);
          }
        }
        this.upcomingBirthdays = this.buildUpcomingBirthdays(this.dmContacts);
        this.closeMobileSidebar();
        this.dmDeactivateDialog = {
          open: false,
          contact: null,
          saving: false,
          error: '',
        };
        this.cdr.detectChanges();
      },
      error: () => {
        this.dmDeactivateDialog = {
          ...this.dmDeactivateDialog,
          saving: false,
          error: 'Unable to deactivate this direct message user. Please try again.',
        };
        this.cdr.detectChanges();
      },
    });
  }

  openDeactivatedDmUsersDialog(): void {
    if (!this.canManageChannels) {
      return;
    }
    this.deactivatedDmUsersDialog = {
      open: true,
      loading: true,
      error: '',
      users: [],
      restoringUserId: null,
    };
    this.closeMobileSidebar();
    this.collabService.getDeactivatedDmUsers().subscribe({
      next: (users) => {
        this.deactivatedDmUsersDialog = {
          ...this.deactivatedDmUsersDialog,
          loading: false,
          users: Array.isArray(users) ? users : [],
          error: '',
        };
        this.cdr.detectChanges();
      },
      error: () => {
        this.deactivatedDmUsersDialog = {
          ...this.deactivatedDmUsersDialog,
          loading: false,
          error: 'Unable to load deactivated DM users.',
        };
        this.cdr.detectChanges();
      },
    });
  }

  restoreDmUser(user: any): void {
    const userId = Number(user?.id || 0);
    if (!this.canManageChannels || !userId || this.deactivatedDmUsersDialog.restoringUserId) {
      return;
    }
    this.deactivatedDmUsersDialog = {
      ...this.deactivatedDmUsersDialog,
      restoringUserId: userId,
      error: '',
    };
    this.collabService.restoreDmUser(userId).subscribe({
      next: () => {
        this.deactivatedDmUsersDialog = {
          ...this.deactivatedDmUsersDialog,
          restoringUserId: null,
          users: this.deactivatedDmUsersDialog.users.filter(
            (item) => Number(item?.id || 0) !== userId,
          ),
        };
        this.loadEmployees(true);
        this.cdr.detectChanges();
      },
      error: () => {
        this.deactivatedDmUsersDialog = {
          ...this.deactivatedDmUsersDialog,
          restoringUserId: null,
          error: 'Unable to enable this user. Please try again.',
        };
        this.cdr.detectChanges();
      },
    });
  }

  onSidebarViewSet(v: 'threads'): void {
    this.closeMobileSidebar();
    this.setView(v);
  }

  onSidebarCreateChannel(): void {
    this.closeMobileSidebar();
    this.openCreateChannelModal();
  }

  onSidebarJumpTo(payload: { msg: any; channelId: string; channelName: string }): void {
    this.closeMobileSidebar();
    this.jumpTo(payload);
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
    setTimeout(() => this.openNotificationTarget(event.detail), 80);
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
    this.pendingNotificationMessageBackendId =
      Number(target.messageBackendId || target.threadRootMessageBackendId || 0) || null;
    if (target.workspaceMode === 'chat') {
      this.workspaceMode = 'chat';
      if (target.dmUserId) {
        const contact = this.dmContacts.find(
          (item) => Number(item.userId) === Number(target.dmUserId),
        );
        if (contact) {
          sessionStorage.removeItem('optimax_notification_target');
          this.queuedNotificationTarget = null;
          this.selectDm(contact.id, true);
          return;
        }
        this.queuedNotificationTarget = target;
        sessionStorage.setItem('optimax_notification_target', JSON.stringify(target));
        return;
      }
      if (target.channelBackendId) {
        const channel = this.channels.find(
          (item) => Number(item.backendId) === Number(target.channelBackendId),
        );
        if (channel) {
          sessionStorage.removeItem('optimax_notification_target');
          this.queuedNotificationTarget = null;
          this.selectChannel(channel.id, true);
          return;
        }
        this.queuedNotificationTarget = target;
        sessionStorage.setItem('optimax_notification_target', JSON.stringify(target));
        return;
      }
    }
    sessionStorage.removeItem('optimax_notification_target');
    this.queuedNotificationTarget = null;
    this.workspaceMode = 'feed';
  }

  private replayQueuedNotificationTarget(): void {
    if (!this.queuedNotificationTarget) {
      return;
    }
    const target = this.queuedNotificationTarget;
    this.queuedNotificationTarget = null;
    this.openNotificationTarget(target);
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

  loadFeedHome(page = 1, append = false): void {
    this.feedHomeLoading = !append;
    this.loadingMoreFeed = append;
    this.feedHomeError = null;
    this.collabService.getFeedHome(this.feedQuery, page, this.feedPageSize).subscribe({
      next: (home) => {
        const nextPosts = home?.feed?.content || [];
        const mergedPosts = append ? [...this.feedPosts, ...nextPosts.filter((post) => !this.feedPosts.some((existing) => existing.id === post.id))] : nextPosts;
        this.feedHome = home;
        this.feedPage = page;
        this.featuredFeedPosts = home?.featuredPosts || [];
        this.feedPosts = mergedPosts;
        this.trendingTags = home?.trendingTags || [];
        this.refreshVisibleFeedCollections(nextPosts, append);
        this.preloadFeedMediaUrls(this.feedPosts);
        this.preloadFeedMediaUrls(this.featuredFeedPosts);
        this.workspaceHighlights = this.buildWorkspaceHighlights(this.featuredFeedPosts, this.feedPosts);
        this.workspaceFocusItems = this.buildWorkspaceFocusItems(this.feedPosts);
        const total = Number(home?.feed?.totalSize || mergedPosts.length);
        this.feedHasMore = this.feedPosts.length < total;
        if (!this.selectedFeedPostId && this.recentFeedPosts.length) {
          this.selectedFeedPostId = this.recentFeedPosts[0].id;
        }
        this.loadTaskRoutineSummaries();
        this.loadFeedNotifications();
        this.feedHomeLoading = false;
        this.loadingMoreFeed = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.collabService.getFeedPosts(this.feedQuery, undefined, page, this.feedPageSize, true).subscribe({
          next: (result) => {
            const nextPosts = result?.content || [];
            this.feedPage = page;
            this.feedPosts = append
              ? [...this.feedPosts, ...nextPosts.filter((post) => !this.feedPosts.some((existing) => existing.id === post.id))]
              : nextPosts;
            this.featuredFeedPosts = this.feedPosts.filter((post) => post.featured).slice(0, 4);
            this.refreshVisibleFeedCollections(nextPosts, append);
            this.preloadFeedMediaUrls(this.feedPosts);
            this.preloadFeedMediaUrls(this.featuredFeedPosts);
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
            this.feedHasMore = this.feedPosts.length < Number(result?.totalSize || this.feedPosts.length);
            if (!this.selectedFeedPostId && this.recentFeedPosts.length) {
              this.selectedFeedPostId = this.recentFeedPosts[0].id;
            }
            this.loadTaskRoutineSummaries();
            this.loadFeedNotifications();
            this.feedHomeLoading = false;
            this.loadingMoreFeed = false;
            this.feedHomeError = this.feedPosts.length ? null : 'Could not load enterprise feed.';
            this.cdr.detectChanges();
          },
          error: () => {
            this.feedHomeError = 'Could not load enterprise feed.';
            this.feedHomeLoading = false;
            this.loadingMoreFeed = false;
            this.cdr.detectChanges();
          },
        });
      },
    });
  }

  refreshFeed(): void {
    this.feedPage = 1;
    this.feedHasMore = false;
    this.showViewedFeedPosts = false;
    this.loadFeedHome(1, false);
  }

  onFeedSearchEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    this.feedPage = 1;
    this.feedHasMore = false;
    this.showViewedFeedPosts = false;
    this.loadFeedHome(1, false);
  }

  loadMoreFeedPosts(): void {
    if (this.loadingMoreFeed || !this.feedHasMore) return;
    this.loadFeedHome(this.feedPage + 1, true);
  }

  selectFeedPost(post: CollabFeedPost): void {
    this.selectedFeedPostId = post.id;
    this.markFeedPostViewed(post);
    this.ensureFeedThread(post.id);
  }

  showOldFeedPosts(): void {
    this.showViewedFeedPosts = true;
    this.refreshVisibleFeedCollections([], false, false);
    if (!this.selectedFeedPost && this.oldFeedPosts.length) {
      this.selectedFeedPostId = this.oldFeedPosts[0].id;
    }
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

  shareFeedPost(post: CollabFeedPost, platform: 'facebook' | 'linkedin' | 'twitter' | 'instagram'): void {
    const shareUrl = this.shareableFeedPostUrl(post);
    const rawText = `${post.title || 'Enterprise update'} ${this.extractTextFromHtml(post.summary || post.body || '').slice(0, 120)}`.trim();
    const shareText = encodeURIComponent(rawText);
    let targetUrl = '';
    if (platform === 'facebook') {
      targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${shareText}`;
    } else if (platform === 'linkedin') {
      targetUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    } else if (platform === 'twitter') {
      targetUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${shareText}`;
    } else {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(`${rawText}\n${shareUrl}`).catch(() => {});
      }
      targetUrl = `https://www.instagram.com/`;
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer,width=720,height=640');
  }

  private shareableFeedPostUrl(post: CollabFeedPost): string {
    const base = window.location.origin || '';
    const path = `${this.resolveCollaborationRoute()}#post-${post.id}`;
    return `${base}${path}`;
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

  private applyFeedReactionDelta<T extends { reactionCount?: number; reactionBreakdown?: Record<string, number>; actorReactionCode?: string | null }>(
    item: T,
    reactionCode: string,
  ): T {
    const nextCode = reactionCode.toUpperCase();
    const currentCode = (item.actorReactionCode || '').toUpperCase();
    const breakdown = { ...(item.reactionBreakdown || {}) };
    let reactionCount = Number(item.reactionCount || 0);

    if (currentCode && breakdown[currentCode]) {
      breakdown[currentCode] = Math.max(0, Number(breakdown[currentCode] || 0) - 1);
      reactionCount = Math.max(0, reactionCount - 1);
      if (breakdown[currentCode] === 0) {
        delete breakdown[currentCode];
      }
    }

    if (currentCode !== nextCode) {
      breakdown[nextCode] = Number(breakdown[nextCode] || 0) + 1;
      reactionCount += 1;
    }

    return {
      ...item,
      reactionCount,
      reactionBreakdown: breakdown,
      actorReactionCode: currentCode === nextCode ? null : nextCode,
    };
  }

  private syncFeedPostReaction(postId: number, reactionCode: string): void {
    this.feedPosts = this.feedPosts.map((post) =>
      post.id === postId ? this.applyFeedReactionDelta(post, reactionCode) : post,
    );
    this.featuredFeedPosts = this.featuredFeedPosts.map((post) =>
      post.id === postId ? this.applyFeedReactionDelta(post, reactionCode) : post,
    );
  }

  async submitFeedPost(): Promise<void> {
    const body = (this.postComposer.body || '').trim();
    const bodyText = this.extractTextFromHtml(body);
    if (this.creatingPost) return;
    this.creatingPost = true;
    this.feedMediaError = '';
    try {
      const parsedPostType = this.extractPostType(bodyText) || this.postComposer.postType;
      const newMediaItems = await this.uploadSelectedFeedMedia();
      const mediaItems = [...this.editingFeedPostMedia, ...newMediaItems];
      if (!bodyText && !mediaItems.length) {
        this.feedMediaError = 'Add text or upload media before posting.';
        this.creatingPost = false;
        this.cdr.detectChanges();
        return;
      }
      const payload = {
        // damilola worked on this: image-first feed posts should submit without forcing visible text.
        body: body || '<p></p>',
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
        this.syncFeedPostReaction(post.id, reactionCode);
        this.workspaceHighlights = this.buildWorkspaceHighlights(this.featuredFeedPosts, this.feedPosts);
        this.cdr.detectChanges();
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
        const updated = this.applyFeedReactionDelta(comment, reactionCode);
        Object.assign(comment, updated);
        this.cdr.detectChanges();
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
    this.markFeedPostViewed(post);
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
    const mentionPool = this.chatMentionPool();
    const filtered = mentionPool
      .filter((employee) => {
        const fullName = this.feedMentionLabel(employee).toLowerCase();
        const username = (employee.user?.username || '').toLowerCase();
        const email = (employee.user?.email || '').toLowerCase();
        return !query || fullName.includes(query) || username.includes(query) || email.includes(query);
      })
      .slice(0, 8);
    target.mentionResults = filtered;
    if ('all'.startsWith(query)) {
      target.mentionResults = [
        {
          id: -1,
          firstName: 'all',
          lastName: '',
          user: { id: -1, fullname: 'all', userId: -1, username: 'all' },
        } as EmployeeProfile,
        ...target.mentionResults.filter((employee) => employee.id !== -1),
      ].slice(0, 8);
    }
    if (!target.mentionResults.length && !query) {
      target.mentionResults = [
        {
          id: -1,
          firstName: 'all',
          lastName: '',
          user: { id: -1, fullname: 'all', userId: -1, username: 'all' },
        } as EmployeeProfile,
      ];
    }
    target.showMentionMenu = target.mentionResults.length > 0;
  }

  onChatDraftChanged(value: string): void {
    this.draft = value;
    const target = {
      mentionResults: [] as EmployeeProfile[],
      showMentionMenu: false,
    };
    this.updateMentionResults(this.draft, target);
    this.chatMentionResults = target.mentionResults;
    this.chatShowMentionMenu = target.showMentionMenu;
    this.cdr.detectChanges();
  }

  onThreadReplyDraftChanged(value: string): void {
    this.threadReplyDraft = value;
    const target = {
      mentionResults: [] as EmployeeProfile[],
      showMentionMenu: false,
    };
    this.updateMentionResults(this.threadReplyDraft, target);
    this.threadMentionResults = target.mentionResults;
    this.threadShowMentionMenu = target.showMentionMenu;
    this.onComposerTyping();
    this.cdr.detectChanges();
  }

  applyChatMention(employee: ComposerMentionOption): void {
    this.draft = this.replaceMentionToken(this.draft, employee as EmployeeProfile);
    this.chatMentionResults = [];
    this.chatShowMentionMenu = false;
    this.cdr.detectChanges();
  }

  applyThreadMention(employee: ComposerMentionOption): void {
    this.threadReplyDraft = this.replaceMentionToken(
      this.threadReplyDraft,
      employee as EmployeeProfile,
    );
    this.threadMentionResults = [];
    this.threadShowMentionMenu = false;
    this.cdr.detectChanges();
  }

  private chatMentionPool(): EmployeeProfile[] {
    const merged = new Map<number, EmployeeProfile>();
    const collect = (employee: EmployeeProfile | null | undefined) => {
      if (!employee) return;
      const key = Number(employee.user?.userId || employee.user?.id || employee.id || 0);
      if (!key || merged.has(key)) return;
      // Exclude suspended/closed/deactivated accounts from mention suggestions
      const state = this.normalizeIdentityText(
        employee.accountState || employee.user?.accountState || '',
      );
      if (state === 'suspended' || state === 'closed') return;
      merged.set(key, employee);
    };
    this.allEmployees.forEach(collect);
    this.dmContacts.forEach((contact) =>
      collect({
        id: Number(contact.employeeId || contact.userId || 0),
        firstName: contact.fullName.split(' ')[0] || contact.fullName,
        lastName: contact.fullName.split(' ').slice(1).join(' '),
        user: {
          id: Number(contact.userId || 0),
          userId: Number(contact.userId || 0),
          fullname: contact.fullName,
          username: contact.email || contact.fullName,
          email: contact.email || '',
        },
      } as EmployeeProfile),
    );
    this.channelMembers.forEach((member) =>
      collect({
        id: Number(member.userId || 0),
        firstName: this.getMemberName(member.userId).split(' ')[0] || this.getMemberName(member.userId),
        lastName: this.getMemberName(member.userId).split(' ').slice(1).join(' '),
        user: {
          id: Number(member.userId || 0),
          userId: Number(member.userId || 0),
          fullname: this.getMemberName(member.userId),
          username: this.userEmailCache[member.userId] || this.getMemberName(member.userId),
          email: this.userEmailCache[member.userId] || '',
        },
      } as EmployeeProfile),
    );
    Object.entries(this.userDirectory).forEach(([userId, fullName]) =>
      collect({
        id: Number(userId),
        firstName: fullName.split(' ')[0] || fullName,
        lastName: fullName.split(' ').slice(1).join(' '),
        user: {
          id: Number(userId),
          userId: Number(userId),
          fullname: fullName,
          username: this.userEmailCache[Number(userId)] || fullName,
          email: this.userEmailCache[Number(userId)] || '',
        },
      } as EmployeeProfile),
    );
    return Array.from(merged.values());
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
    return fullName || employee.fullname || employee.user?.fullname || employee.user?.username || `User ${employee.id}`;
  }

  chatMentionLabel(option: ComposerMentionOption): string {
    const fullName = `${option.firstName || ''} ${option.lastName || ''}`.trim();
    return fullName || option.fullname || option.user?.fullname || option.user?.username || `User ${option.id}`;
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
    messageBackendId?: number;
    threadRootMessageBackendId?: number;
  } {
    try {
      const payload = JSON.parse(frameBody || '{}');
      const msg = (payload.message && typeof payload.message === 'object') ? payload.message : payload;
      const senderUserId = Number(msg.senderUserId ?? msg.userId ?? 0);
      const senderName =
        this.userDirectory[senderUserId] ||
        this.notificationFieldText(msg.senderName, '') ||
        this.notificationFieldText(msg.authorName, '') ||
        'New message';
      const content = this.notificationFieldText(msg.content, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);
      return {
        senderName,
        content,
        senderUserId,
        avatarUrl: this.userAvatarCache[senderUserId],
        contextLabel:
          this.notificationFieldText(
            payload.channelName ?? payload.channelCode ?? payload.channelType,
            '',
          ) || 'New message',
        messageBackendId: Number(msg.id ?? msg.messageId ?? 0) || undefined,
        threadRootMessageBackendId: Number(msg.threadRootMessageId ?? 0) || undefined,
      };
    } catch (_) {
      return { senderName: 'New message', content: '', contextLabel: 'New message' };
    }
  }

  private notificationFieldText(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
      return value.trim() || fallback;
    }
    if (value == null) {
      return fallback;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      const parts = value
        .map((entry) => this.notificationFieldText(entry, ''))
        .filter(Boolean);
      return parts.length ? parts.join(', ') : fallback;
    }
    if (typeof value === 'object') {
      const candidate =
        (value as any).title ||
        (value as any).name ||
        (value as any).label ||
        (value as any).message ||
        (value as any).content;
      if (candidate != null) {
        return this.notificationFieldText(candidate, fallback);
      }
    }
    return fallback;
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

  private loadTaskRoutineSummaries(): void {
    this.collabService.getTaskRoutineTopTodos(5).subscribe({
      next: (todos) => {
        this.taskRoutineTodos = todos || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.taskRoutineTodos = [];
        this.cdr.detectChanges();
      },
    });
  }

  private loadFeedNotifications(): void {
    this.collabService.getFeedNotifications().subscribe({
      next: (notifications) => {
        (notifications || []).forEach((notification) => this.publishFeedNotification(notification));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  private publishFeedNotification(notification: CollabFeedNotification): void {
    if (notification.read || this.seenFeedNotificationIds.has(notification.id)) {
      return;
    }
    this.seenFeedNotificationIds.add(notification.id);
    this.persistSeenFeedNotificationIds();
    this.headerStateService.pushNotification({
      title: `${this.feedAuthorName(notification.actor)} mentioned everyone`,
      body: notification.body || notification.title || '@all notification',
      category: 'feed',
      route: this.resolveCollaborationRoute(),
      avatarUrl: this.feedAuthorAvatarUrl(notification.actor),
      contextLabel: 'Enterprise feed',
      workspaceMode: 'feed',
    });
    this.playNotificationSound(this.shouldUseUrgentNotificationSound());
  }

  private restoreSeenFeedNotificationIds(): void {
    try {
      const raw = sessionStorage.getItem('optimax_seen_feed_notifications');
      if (!raw) return;
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) {
        this.seenFeedNotificationIds = new Set(ids.map((value) => Number(value)).filter(Boolean));
      }
    } catch (_) {}
  }

  private persistSeenFeedNotificationIds(): void {
    sessionStorage.setItem(
      'optimax_seen_feed_notifications',
      JSON.stringify(Array.from(this.seenFeedNotificationIds).slice(-100)),
    );
  }

  private restoreViewedFeedPostIds(): void {
    try {
      const raw = localStorage.getItem(this.viewedFeedPostsStorageKey());
      if (!raw) return;
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) {
        this.viewedFeedPostIds = new Set(ids.map((value) => Number(value)).filter(Boolean));
      }
    } catch (_) {}
  }

  private persistViewedFeedPostIds(): void {
    localStorage.setItem(
      this.viewedFeedPostsStorageKey(),
      JSON.stringify(Array.from(this.viewedFeedPostIds).slice(-300)),
    );
  }

  private viewedFeedPostsStorageKey(): string {
    return `optimax_viewed_feed_posts_${Number(this.me.userId || 0) || 'guest'}`;
  }

  private refreshVisibleFeedCollections(
    exposedPosts: CollabFeedPost[] = [],
    append = false,
    markAsViewed = true,
  ): void {
    if (this.showViewedFeedPosts) {
      this.renderedRecentFeedPosts = [...this.feedPosts];
      this.renderedFeaturedFeedPosts = [...this.featuredFeedPosts];
      return;
    }

    const baselineViewed = new Set(this.viewedFeedPostIds);

    if (append) {
      const existingIds = new Set(this.renderedRecentFeedPosts.map((post) => Number(post.id)));
      const nextVisible = (exposedPosts || []).filter(
        (post) =>
          !baselineViewed.has(Number(post.id)) &&
          !existingIds.has(Number(post.id)),
      );
      this.renderedRecentFeedPosts = [...this.renderedRecentFeedPosts, ...nextVisible];
      if (markAsViewed) {
        this.markFeedPostsViewed(nextVisible);
      }
    } else {
      this.renderedRecentFeedPosts = this.feedPosts.filter(
        (post) => !baselineViewed.has(Number(post.id)),
      );
      if (markAsViewed) {
        this.markFeedPostsViewed(this.renderedRecentFeedPosts);
      }
    }

    this.renderedFeaturedFeedPosts = this.featuredFeedPosts.filter(
      (post) => !baselineViewed.has(Number(post.id)),
    );
  }

  private markFeedPostsViewed(posts: CollabFeedPost[]): void {
    const newPostIds = (posts || [])
      .map((post) => Number(post?.id || 0))
      .filter((postId) => postId && !this.viewedFeedPostIds.has(postId));

    if (!newPostIds.length) {
      return;
    }

    newPostIds.forEach((postId) => this.viewedFeedPostIds.add(postId));
    this.persistViewedFeedPostIds();
    this.bumpFeedViewCount(newPostIds);
  }

  private markFeedPostViewed(post: CollabFeedPost): void {
    const postId = Number(post?.id || 0);
    if (!postId || this.viewedFeedPostIds.has(postId)) {
      return;
    }
    this.viewedFeedPostIds.add(postId);
    this.persistViewedFeedPostIds();
    this.bumpFeedViewCount([postId]);
  }

  private bumpFeedViewCount(postIds: number[]): void {
    const idSet = new Set(postIds.map((value) => Number(value)).filter(Boolean));
    const incrementViewCount = (post: CollabFeedPost): CollabFeedPost =>
      idSet.has(Number(post.id))
        ? { ...post, viewCount: Number(post.viewCount || 0) + 1 }
        : post;
    this.feedPosts = this.feedPosts.map(incrementViewCount);
    this.featuredFeedPosts = this.featuredFeedPosts.map(incrementViewCount);
    this.renderedRecentFeedPosts = this.renderedRecentFeedPosts.map(incrementViewCount);
    this.renderedFeaturedFeedPosts = this.renderedFeaturedFeedPosts.map(incrementViewCount);
  }

  clearPendingAttachments(refresh = true): void {
    for (const attachment of this.pendingAttachments) {
      if (attachment.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    }
    this.pendingFiles = [];
    this.pendingAttachments = [];
    if (refresh) {
      this.cdr.detectChanges();
    }
  }

  removePendingAttachment(index: number): void {
    const attachment = this.pendingAttachments[index];
    if (attachment?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    this.pendingAttachments.splice(index, 1);
    this.pendingFiles.splice(index, 1);
    this.cdr.detectChanges();
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
    return (post.mediaItems || []).filter((item) =>
      Boolean(item?.url || item?.thumbnailUrl),
    );
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
    return this.resolveProtectedMediaUrl(
      item?.url || item?.thumbnailUrl || '',
    );
  }

  feedMediaPoster(item?: CollabFeedMediaItem): string {
    return this.resolveProtectedMediaUrl(item?.thumbnailUrl || item?.url || '');
  }

  openFeedMediaDialog(url: string, label = 'Image preview'): void {
    if (!url) return;
    this.expandedFeedMediaItems = [{ url, label, mediaType: 'IMAGE' }];
    this.expandedFeedMediaIndex = 0;
    this.expandedFeedMediaUrl = url;
    this.expandedFeedMediaLabel = label;
    this.feedMediaViewerOpen = true;
  }

  openFeedMediaCarousel(items: CollabFeedMediaItem[], startIndex = 0): void {
    const mediaItems = items
      .map((item, index) => ({
        url: this.feedMediaUrl(item),
        label: this.feedMediaLabel(item, index),
        mediaType: (item.mediaType || 'FILE').toUpperCase(),
      }))
      .filter((item) => !!item.url);
    if (!mediaItems.length) return;
    this.expandedFeedMediaItems = mediaItems;
    this.expandedFeedMediaIndex = Math.min(Math.max(0, startIndex), mediaItems.length - 1);
    this.syncExpandedFeedMedia();
    this.feedMediaViewerOpen = true;
  }

  previousFeedMedia(): void {
    if (!this.expandedFeedMediaItems.length) return;
    this.expandedFeedMediaIndex =
      (this.expandedFeedMediaIndex - 1 + this.expandedFeedMediaItems.length) % this.expandedFeedMediaItems.length;
    this.syncExpandedFeedMedia();
  }

  nextFeedMedia(): void {
    if (!this.expandedFeedMediaItems.length) return;
    this.expandedFeedMediaIndex = (this.expandedFeedMediaIndex + 1) % this.expandedFeedMediaItems.length;
    this.syncExpandedFeedMedia();
  }

  closeFeedMediaDialog(): void {
    this.feedMediaViewerOpen = false;
    this.expandedFeedMediaUrl = '';
    this.expandedFeedMediaLabel = '';
    this.expandedFeedMediaItems = [];
    this.expandedFeedMediaIndex = 0;
  }

  isFeedImageItem(item?: CollabFeedMediaItem): boolean {
    return (
      (item?.mediaType || '').toUpperCase() === 'IMAGE' ||
      this.isImageType(item?.contentType) ||
      this.looksLikeImageFile(
        item?.fileName || item?.url || item?.thumbnailUrl,
      )
    );
  }

  isFeedVideoItem(item?: CollabFeedMediaItem): boolean {
    return (
      (item?.mediaType || '').toUpperCase() === 'VIDEO' ||
      (item?.contentType || '').startsWith('video/') ||
      this.looksLikeVideoFile(
        item?.fileName || item?.url || item?.thumbnailUrl,
      )
    );
  }

  isFeedPdfItem(item?: CollabFeedMediaItem): boolean {
    return (
      (item?.mediaType || '').toUpperCase() === 'PDF' ||
      (item?.contentType || '').toLowerCase() === 'application/pdf' ||
      this.looksLikePdfFile(
        item?.fileName || item?.url || item?.thumbnailUrl,
      )
    );
  }

  isFeedOfficeItem(item?: CollabFeedMediaItem): boolean {
    const mediaType = (item?.mediaType || '').toUpperCase();
    const fileRef = (
      item?.fileName ||
      item?.url ||
      item?.thumbnailUrl ||
      ''
    ).toLowerCase();
    return (
      mediaType === 'DOCX' ||
      mediaType === 'PPTX' ||
      fileRef.endsWith('.docx') ||
      fileRef.endsWith('.pptx') ||
      fileRef.endsWith('.doc') ||
      fileRef.endsWith('.ppt')
    );
  }

  isDraftPdf(media: FeedMediaDraft): boolean {
    return media.type === 'application/pdf' || media.name.toLowerCase().endsWith('.pdf');
  }

  isDraftOffice(media: FeedMediaDraft): boolean {
    const lower = media.name.toLowerCase();
    return lower.endsWith('.doc') || lower.endsWith('.docx') || lower.endsWith('.ppt') || lower.endsWith('.pptx');
  }

  officeFileBadge(name: string): string {
    const lower = name.toLowerCase();
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'DOCX';
    if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return 'PPTX';
    if (lower.endsWith('.pdf')) return 'PDF';
    return 'FILE';
  }

  currentExpandedFeedMediaType(): string {
    return this.expandedFeedMediaItems[this.expandedFeedMediaIndex]?.mediaType || 'IMAGE';
  }

  private syncExpandedFeedMedia(): void {
    const current = this.expandedFeedMediaItems[this.expandedFeedMediaIndex];
    this.expandedFeedMediaUrl = current?.url || '';
    this.expandedFeedMediaLabel = current?.label || '';
  }

  feedMediaLabel(item?: CollabFeedMediaItem, index = 0): string {
    const caption = (item?.caption || '').trim();
    if (caption) return caption;
    const fileName = (item?.fileName || '').trim();
    if (fileName) return fileName;
    const type = (item?.mediaType || 'FILE').toUpperCase();
    if (type === 'IMAGE') return `Image ${index + 1}`;
    if (type === 'VIDEO') return `Video ${index + 1}`;
    return `Attachment ${index + 1}`;
  }

  private looksLikeImageFile(value?: string): boolean {
    return /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(value || '');
  }

  private looksLikeVideoFile(value?: string): boolean {
    return /\.(mp4|webm|mov|m4v|ogg)$/i.test(value || '');
  }

  private looksLikePdfFile(value?: string): boolean {
    return /\.pdf$/i.test(value || '');
  }

  feedComposerLinkPreview(): FeedLinkPreview | null {
    return this.linkPreviewFromText(this.extractTextFromHtml(this.postComposer.body || ''));
  }

  chatDraftLinkPreview(): ComposerLinkPreview | null {
    const preview = this.linkPreviewFromText(this.draft || '');
    return preview ? { ...preview } : null;
  }

  feedPostLinkPreview(post: CollabFeedPost): FeedLinkPreview | null {
    return this.linkPreviewFromText(this.extractTextFromHtml(post.body || post.summary || ''));
  }

  feedCommentLinkPreview(comment: { content?: string }): FeedLinkPreview | null {
    return this.linkPreviewFromText(comment.content || '');
  }

  feedCommentDraftLinkPreview(postId: number): FeedLinkPreview | null {
    return this.linkPreviewFromText(this.feedThreads[postId]?.draft || '');
  }

  feedReplyDraftLinkPreview(comment: FeedCommentNode): FeedLinkPreview | null {
    return this.linkPreviewFromText(comment.replyDraft || '');
  }

  feedDisplayBody(post: CollabFeedPost): string {
    const rawBody = (post.body || post.summary || '').trim();
    if (!rawBody) return '';
    const cleaned = rawBody
      .replace(/\[(UPDATE|ANNOUNCEMENT|EVENT|CELEBRATION|KNOWLEDGE|ALERT)\]/gi, '')
      .replace(/(^|\s)@(pos|accounting|hr|expense|hospitality|sales|procurement|inventory|reporting)\b/gi, '$1')
      .trim();
    if (cleaned.includes('<')) {
      return this.linkifyHtmlText(cleaned, 'feed-linkified');
    }
    return this.linkifyPlainText(cleaned, 'feed-linkified');
  }

  feedDisplayCommentContent(content?: string): string {
    const value = (content || '').trim();
    if (!value) return '';
    if (value.includes('<')) {
      return this.linkifyHtmlText(value, 'feed-linkified');
    }
    return this.linkifyPlainText(value, 'feed-linkified');
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

  feedReactionHoverUsers(scope: 'post' | 'comment', id: number, reactionCode: string): HoverPerson[] {
    return this.feedReactionUsersCache[`${scope}:${id}:${reactionCode}`] || [];
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
        const people = (rows || [])
          .filter((row: CollabFeedReactionUser) => (row.reactionCode || '').toUpperCase() === reactionCode)
          .map((row: CollabFeedReactionUser) => {
            const name = this.feedAuthorName(row.user);
            const userId = Number(
              row.user?.userId ||
              row.user?.id ||
              0,
            );
            return {
              name,
              avatarUrl: userId ? this.userAvatarCache[userId] : undefined,
              initials: initialsFrom(name),
            } as HoverPerson;
          })
          .filter((row: HoverPerson) => Boolean(row.name));
        this.feedReactionUsersCache[key] = people.slice(0, 8);
        this.feedReactionHoverCache[key] = people.length
          ? people.slice(0, 8).map((row) => row.name).join(', ')
          : 'No reactions yet';
        this.cdr.detectChanges();
      },
      error: () => {
        this.feedReactionUsersCache[key] = [];
        this.feedReactionHoverCache[key] = 'Reaction details unavailable';
      },
    });
  }

  private extractTextFromHtml(source: string): string {
    const element = document.createElement('div');
    element.innerHTML = source || '';
    return (element.textContent || element.innerText || '').trim();
  }

  private linkifyPlainText(source: string, className: string): string {
    const escaped = this.escapeHtml(source || '');
    return escaped
      .replace(FEED_URL_REGEX, (rawUrl) => {
        const normalized = this.normalizePreviewUrl(rawUrl);
        const safeLabel = this.escapeHtml(rawUrl);
        return `<a href="${normalized}" target="_blank" rel="noopener noreferrer" class="${className}">${safeLabel}</a>`;
      })
      .replace(/\n/g, '<br>');
  }

  private linkifyHtmlText(source: string, className: string): string {
    if (!source || typeof document === 'undefined') {
      return source || '';
    }
    const root = document.createElement('div');
    root.innerHTML = source;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      if (current.parentElement?.tagName !== 'A') {
        nodes.push(current as Text);
      }
      current = walker.nextNode();
    }
    for (const node of nodes) {
      const text = node.textContent || '';
      if (!FEED_URL_REGEX.test(text)) continue;
      FEED_URL_REGEX.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      text.replace(FEED_URL_REGEX, (rawUrl, _a, _b, offset: number) => {
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
      FEED_URL_REGEX.lastIndex = 0;
    }
    return root.innerHTML;
  }

  private escapeHtml(value: string): string {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private linkPreviewFromText(source: string): FeedLinkPreview | null {
    const match = (source || '').match(FEED_URL_REGEX);
    const rawUrl = match?.[0]?.trim();
    if (!rawUrl) return null;
    return this.buildLinkPreview(rawUrl);
  }

  private buildLinkPreview(rawUrl: string): FeedLinkPreview | null {
    const normalized = this.normalizePreviewUrl(rawUrl);
    if (!normalized) return null;
    try {
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
          kind: 'image',
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
          kind: 'youtube',
        };
      }
      const videoMatch = parsed.pathname.match(/\.(mp4|webm|mov|m4v|ogg)$/i);
      if (videoMatch) {
        return {
          url: normalized,
          displayUrl,
          title: this.previewFileName(parsed.pathname) || hostname,
          subtitle: 'Direct video link',
          thumbnailUrl: `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(parsed.origin)}`,
          kind: 'video',
        };
      }
      const pdfMatch = parsed.pathname.match(/\.pdf$/i);
      if (pdfMatch) {
        return {
          url: normalized,
          displayUrl,
          title: this.previewFileName(parsed.pathname) || hostname,
          subtitle: 'PDF document',
          thumbnailUrl: `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(parsed.origin)}`,
          kind: 'website',
        };
      }
      const officeMatch = parsed.pathname.match(/\.(docx?|pptx?|xlsx?)$/i);
      if (officeMatch) {
        return {
          url: normalized,
          displayUrl,
          title: this.previewFileName(parsed.pathname) || hostname,
          subtitle: 'Office document',
          thumbnailUrl: `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(parsed.origin)}`,
          kind: 'website',
        };
      }
      return {
        url: normalized,
        displayUrl,
        title: hostname,
        subtitle: path === '/' ? 'Website link' : path,
        thumbnailUrl: `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(parsed.origin)}`,
        kind: 'website',
      };
    } catch {
      return null;
    }
  }

  private normalizePreviewUrl(rawUrl: string): string {
    const value = (rawUrl || '').trim();
    if (!value) return '';
    return /^https?:\/\//i.test(value) ? value : `https://${value.replace(/^\/+/, '')}`;
  }

  private previewFileName(pathname: string): string {
    const segments = pathname.split('/').filter(Boolean);
    return decodeURIComponent(segments[segments.length - 1] || '');
  }

  private extractYoutubeId(parsed: URL): string {
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace(/\//g, '').trim();
    }
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v') || '';
    }
    return '';
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
    if (this.chatRealtimeStarted && this.stompClient) {
      return;
    }
    const token = this.normalizedRealtimeToken();
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const userId =
      sessionStorage.getItem('userid') ||
      sessionStorage.getItem('userId') ||
      '';
    const wsUrl = this.resolveCollabWebSocketUrl();

    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
      connectHeaders: {
        Authorization: token ? `Bearer ${token}` : '',
        'X-Tenant-ID': tenantId,
        'X-User-ID': userId,
        userid: userId,
      },
    });
    this.stompClient = client;
    this.chatRealtimeStarted = true;

    client.onConnect = () => {
      this.wsConnected = true;
      client.subscribe(
        `/topic/collab/chat/user/${this.me.userId}/unread`,
        () => {
          this.loadChannels(true);
        },
      );
      this.loadChannels(true, true);
      for (const ch of this.channels) {
        this.subscribeToChannel(ch.backendId);
      }
      for (const dm of this.dmContacts) {
        this.subscribeToDmContactChannels(dm);
      }
    };
    client.onStompError = (frame) => console.error('STOMP ERROR:', frame);
    client.onWebSocketClose = () => {
      this.wsConnected = false;
    };
    client.onWebSocketError = (err) => console.error('WS ERROR:', err);
    client.activate();
  }

  private disconnectWebSocket(): void {
    try {
      this.unsubscribeChatStreams();
      if (this.stompClient) {
        this.stompClient.disconnect();
        this.stompClient = null;
      }
      this.wsConnected = false;
      this.chatRealtimeStarted = false;
    } catch (_) {}
  }

  private normalizedRealtimeToken(): string {
    const candidates = [
      sessionStorage.getItem('Token'),
      sessionStorage.getItem('token'),
      sessionStorage.getItem('accessToken'),
      localStorage.getItem('Token2'),
      localStorage.getItem('token'),
    ];
    for (const raw of candidates) {
      const token = this.normalizeRealtimeTokenValue(raw);
      if (token) {
        return token;
      }
    }
    return '';
  }

  private normalizeRealtimeTokenValue(raw: string | null): string {
    if (!raw) return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (trimmed.includes('=') && trimmed.includes(';')) {
      const tokenStartIndex = trimmed.indexOf('=') + 1;
      const tokenEndIndex = trimmed.indexOf(';', tokenStartIndex);
      return trimmed
        .substring(
          tokenStartIndex,
          tokenEndIndex > -1 ? tokenEndIndex : undefined,
        )
        .trim();
    }
    return trimmed.replace(/^Bearer\s+/i, '').trim();
  }

  private resolveCollabWebSocketUrl(): string {
    const configuredBaseUrl = (this.collabService.apiBaseUrl || '').replace(/\/+$/, '');
    if (typeof window !== 'undefined') {
      const currentHost = window.location.host;
      const currentProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const currentHostname = window.location.hostname || '';
      const shouldPreferCurrentOrigin =
        !!currentHost &&
        !/^(localhost|127\.0\.0\.1)$/i.test(currentHostname);
      if (shouldPreferCurrentOrigin) {
        return `${currentProtocol}//${currentHost}/x/ws/collab`;
      }
    }
    if (configuredBaseUrl.startsWith('https://')) {
      return `wss://${configuredBaseUrl.replace('https://', '')}/x/ws/collab`;
    }
    return `ws://${configuredBaseUrl.replace('http://', '')}/x/ws/collab`;
  }

  private unsubscribeChatStreams(): void {
    if (this.channelSub) {
      try {
        this.channelSub.unsubscribe();
      } catch (_) {}
      this.channelSub = null;
    }
    if (this.channelPresenceSub) {
      try {
        this.channelPresenceSub.unsubscribe();
      } catch (_) {}
      this.channelPresenceSub = null;
    }
    this.channelMessageSubs.forEach((s) => {
      try {
        s.unsubscribe();
      } catch (_) {}
    });
    this.channelMessageSubs.clear();
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
  }

  private subscribeToChannel(channelId: number): void {
    if (!this.stompClient || !this.wsConnected) return;
    if (!this.channelMessageSubs.has(channelId)) {
      const sub = this.stompClient.subscribe(
        `/topic/collab/chat/channel/${channelId}`,
        (frame: any) => {
          const ch = this.channels.find((c) => c.backendId === channelId);
          if (!ch) return;
          let senderUserId: number | null = null;
          try {
            const body = JSON.parse(frame.body || '{}');
            const msg = (body.message && typeof body.message === 'object') ? body.message : body;
            senderUserId = Number(msg.senderUserId ?? msg.userId ?? null);
          } catch (_) {}
          const isOwnMessage =
            senderUserId !== null && senderUserId === this.me.userId;

          if (!isOwnMessage) {
            this.loadChannels(true, true);
            const incoming = this.parseIncomingNotification(frame.body);
            this.pushChatMessagePreview({
              title: incoming.senderName || ch.name,
              body: incoming.content || `New message in ${ch.name}`,
              avatarUrl: incoming.avatarUrl,
              contextLabel: ch.name,
              channelBackendId: ch.backendId,
              messageBackendId: incoming.messageBackendId,
              threadRootMessageBackendId: incoming.threadRootMessageBackendId,
            });
            this.pushWorkspaceNotification({
              title: incoming.senderName || ch.name,
              body: incoming.content || `New message in ${ch.name}`,
              category: 'chat',
              route: this.resolveCollaborationRoute(),
              avatarUrl: incoming.avatarUrl,
              contextLabel: ch.name,
              workspaceMode: 'chat',
              channelBackendId: ch.backendId,
              messageBackendId: incoming.messageBackendId,
              threadRootMessageBackendId: incoming.threadRootMessageBackendId,
            });
            this.pushChatArrivalToast({
              title: incoming.senderName || ch.name,
              body: incoming.content || `New message in ${ch.name}`,
              avatarUrl: incoming.avatarUrl,
              tone: 'channel',
              channelId: ch.id,
              messageBackendId: incoming.messageBackendId,
              threadRootMessageBackendId: incoming.threadRootMessageBackendId,
            });
            this.showBrowserNotification(
              incoming.senderName || ch.name,
              incoming.content || `New message in ${ch.name}`,
              {
                tag: `channel-${ch.id}`,
                icon: incoming.avatarUrl,
                target: {
                  workspaceMode: 'chat',
                  channelBackendId: ch.backendId,
                  messageBackendId: incoming.messageBackendId,
                  threadRootMessageBackendId: incoming.threadRootMessageBackendId,
                },
              },
            );
            this.playNotificationSound(this.shouldUseUrgentNotificationSound());
          }

          if (!this.isViewingChannel(ch.id)) {
            if (!isOwnMessage) {
              ch.unreadCount = (ch.unreadCount || 0) + 1;
              ch.hasUnread = true;
              this.channels = [...this.channels];
            }
            this.syncHeaderState();
            this.cdr.detectChanges();
          } else {
            this.reconcileChannelMessages(ch, frame.body);
          }
        },
      );
      this.channelMessageSubs.set(channelId, sub);
    }

    if (this.channelPresenceSub) {
      try {
        this.channelPresenceSub.unsubscribe();
      } catch (_) {}
    }

    this.channelPresenceSub = this.stompClient.subscribe(
      `/topic/collab/chat/presence/channel/${channelId}`,
      (frame: any) => {
        try {
          const list = JSON.parse(frame.body || '[]');
          this.applyPresenceEntries(Array.isArray(list) ? list : [list]);
          this.syncDmOnlineStatus();
          this.cdr.detectChanges();
        } catch (_) {}
      },
    );
  }

  private subscribeToDmContactChannels(contact: DmContact): void {
    for (const chId of this.dmChannelIdsFor(contact)) {
      this.subscribeToDmChannel(contact, chId);
    }
  }

  private subscribeToDmChannel(contact: DmContact, explicitChannelId?: number): void {
    if (!this.stompClient || !this.wsConnected) return;
    const chId = Number(explicitChannelId || contact.dmChannelId || 0);
    if (!chId) return;

    if (!this.dmChannelSubs.has(chId)) {
      const sub = this.stompClient.subscribe(
        `/topic/collab/chat/channel/${chId}`,
        (frame: any) => {
          let senderUserId: number | null = null;
          try {
            const body = JSON.parse(frame.body || '{}');
            const msg = (body.message && typeof body.message === 'object') ? body.message : body;
            senderUserId = Number(msg.senderUserId ?? msg.userId ?? null);
          } catch (_) {}
          const isOwnMessage =
            senderUserId !== null && senderUserId === this.me.userId;
          if (!isOwnMessage) {
            this.loadChannels(true, true);
            const incoming = this.parseIncomingNotification(frame.body);
            this.pushChatMessagePreview({
              title: incoming.senderName || contact.fullName,
              body: incoming.content || `New direct message from ${contact.fullName}`,
              avatarUrl: incoming.avatarUrl || contact.avatarUrl,
              contextLabel: 'Direct message',
              dmUserId: contact.userId,
              messageBackendId: incoming.messageBackendId,
              threadRootMessageBackendId: incoming.threadRootMessageBackendId,
            });
            this.pushWorkspaceNotification({
              title: incoming.senderName || contact.fullName,
              body: incoming.content || `New direct message from ${contact.fullName}`,
              category: 'chat',
              route: this.resolveCollaborationRoute(),
              avatarUrl: incoming.avatarUrl || contact.avatarUrl,
              contextLabel: 'Direct message',
              workspaceMode: 'chat',
              dmUserId: contact.userId,
              messageBackendId: incoming.messageBackendId,
              threadRootMessageBackendId: incoming.threadRootMessageBackendId,
            });
            this.pushChatArrivalToast({
              title: incoming.senderName || contact.fullName,
              body: incoming.content || `New direct message from ${contact.fullName}`,
              avatarUrl: incoming.avatarUrl || contact.avatarUrl,
              tone: 'dm',
              dmId: contact.id,
              messageBackendId: incoming.messageBackendId,
              threadRootMessageBackendId: incoming.threadRootMessageBackendId,
            });
            this.showBrowserNotification(
              incoming.senderName || contact.fullName,
              incoming.content || `New direct message from ${contact.fullName}`,
              {
                tag: `dm-${contact.id}`,
                icon: incoming.avatarUrl || contact.avatarUrl,
                target: {
                  workspaceMode: 'chat',
                  dmUserId: contact.userId,
                  messageBackendId: incoming.messageBackendId,
                  threadRootMessageBackendId: incoming.threadRootMessageBackendId,
                },
              },
            );
            this.playNotificationSound(this.shouldUseUrgentNotificationSound());
          }
          if (!this.isViewingDm(contact.id)) {
            if (!isOwnMessage) {
              contact.unreadCount = (contact.unreadCount || 0) + 1;
              contact.hasUnread = true;
              this.dmContacts = [...this.dmContacts];
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
          this.applyPresenceEntries(Array.isArray(list) ? list : [list]);
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
    const existingPersistedCount = existing.filter((message) => !!message.backendId).length;
    const looksPartialSnapshot = serverMessages.length > 0 && serverMessages.length < existingPersistedCount;

    // 1. Remove deleted messages (not in server list). Keep local-only (no backendId).
    let filtered = looksPartialSnapshot
      ? [...existing]
      : existing.filter((m) => !m.backendId || serverIds.has(m.backendId));

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
        messageType: m.messageType,
        deliveryState:
          Number(m.senderUserId) === Number(this.me.userId)
            ? 'DELIVERED'
            : undefined,
      };

      // If it's a reply, nest under its parent
      if (m.replyToMessageId) {
        const parent = this.findMsgByBackendId(filtered, m.replyToMessageId);
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
                this.playNotificationSound(this.shouldUseUrgentNotificationSound());
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
          this.playNotificationSound(this.shouldUseUrgentNotificationSound());
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

    const shouldAutoScroll = this.shouldAutoScrollFeed() || !existing.length;
    const apply = () => {
      this.loadMemberAvatars(senderIds);
      this.channelMessages[ch.id] = [
        ...this.applyServerMessages(existing, serverMessages),
      ];
      this.hydrateMessageAttachments(this.channelMessages[ch.id]);
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

      this.scrollFeed = shouldAutoScroll;
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

    const shouldAutoScroll = this.shouldAutoScrollFeed() || !existing.length;
    const apply = () => {
      this.dmMessages[contact.id] = [
        ...this.applyServerMessages(existing, serverMessages),
      ];
      this.hydrateMessageAttachments(this.dmMessages[contact.id]);
      this.updateDmConversationMeta(contact, this.dmMessages[contact.id]);
      this.buildReadStateMap(serverMessages, snap.readStates || []);
      this.applyReadStateToMessages(this.dmMessages[contact.id]);
      if (serverMessages.length) {
        this.lastMessageBackendId = serverMessages[serverMessages.length - 1].id;
        if (this.isViewingDm(contact.id) && this.lastMessageBackendId) {
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

      this.scrollFeed = shouldAutoScroll;
      this.cdr.detectChanges();
    };

    if (senderIds.length) this.loadUserDirectory(senderIds, apply);
    else apply();
  }

  private fetchAndReconcileChannel(ch: Channel): void {
    this.getChannelSnapshotWithFallback(
      ch.backendId,
      this.currentHistoryLimit(ch.backendId),
    ).then((snap) => {
      if (snap) {
        if (this.activeView === 'channel' && this.activeChannelId === ch.id) {
          this.conversationAccessMessage = '';
        }
        this.reconcileChannelMessages(ch, JSON.stringify(snap));
      }
    });
  }

  private fetchAndReconcileDm(contact: DmContact, channelId: number): void {
    this.getChannelSnapshotWithFallback(
      channelId,
      this.currentHistoryLimit(channelId),
    ).then((snap) => {
      if (snap) {
        if (this.activeView === 'dm' && this.activeDmId === contact.id) {
          this.conversationAccessMessage = '';
        }
        this.reconcileDmMessages(contact, channelId, JSON.stringify(snap));
      }
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
    this.applySessionUserFallback(userId);
    this.restoreViewedFeedPostIds();
    this.collabService.getUserPrimaryInfoByUserId(userId).subscribe({
      next: (profile) => {
        const userRecord = this.mapUserPrimaryInfoToEmployee(profile);
        const fullName = this.getEmpName(userRecord) || 'User';
        const shortName =
          userRecord.lastName && userRecord.firstName
            ? `${userRecord.firstName} ${userRecord.lastName[0]}.`
            : userRecord.firstName || fullName;
        const avatarUrl = this.getEmpImageUrl(userRecord) || '';
        this.me = {
          name: fullName,
          shortName,
          initials: initialsFrom(fullName),
          avatarColor: '#2e6276',
          userId,
          avatarUrl,
        };
        this.headerStateService.setProfile({
          name: fullName,
          username: userRecord.user?.username || userRecord.username || fullName,
          accountId: String(this.employeeUserId(userRecord) || userId),
          initials: initialsFrom(fullName),
          imageUrl: avatarUrl,
        });
        this.userDirectory[userId] = fullName;
        if (avatarUrl) {
          this.userAvatarCache[userId] = avatarUrl;
        }
        this.dmContacts = this.stripSelfFromDmContacts(this.dmContacts);
        this.cdr.detectChanges();
        if (!this.chatRealtimeStarted) {
          this.connectWebSocket();
        }
        if (this.workspaceMode === 'chat') {
          this.startPresencePoll();
        }
      },
      error: () => {
        if (!this.chatRealtimeStarted) {
          this.connectWebSocket();
        }
        if (this.workspaceMode === 'chat') {
          this.startPresencePoll();
        }
        this.cdr.detectChanges();
      },
    });
  }

  private applySessionUserFallback(userId: number): void {
    try {
      const raw =
        sessionStorage.getItem('userRegData') ||
        localStorage.getItem('userRegData');
      const parsed = raw ? JSON.parse(raw) : null;
      const displayName =
        parsed?.fullname ||
        parsed?.name ||
        parsed?.username ||
        sessionStorage.getItem('fullname') ||
        localStorage.getItem('fullname') ||
        `User ${userId}`;
      const avatarUrl =
        parsed?.profileImage ||
        parsed?.imageUrl ||
        parsed?.avatarUrl ||
        parsed?.profilePicture ||
        parsed?.photoUrl ||
        parsed?.employee?.profileImage ||
        parsed?.employeeProfile?.profileImage ||
        '';
      this.me = {
        name: displayName,
        shortName: displayName,
        initials: initialsFrom(displayName),
        avatarColor: '#2e6276',
        userId,
        avatarUrl,
      };
      this.headerStateService.setProfile({
        name: displayName,
        username: parsed?.username || parsed?.fullname || displayName,
        accountId: String(parsed?.id || parsed?.userId || userId),
        initials: initialsFrom(displayName),
        imageUrl: avatarUrl,
      });
      this.userDirectory[userId] = displayName;
    } catch (_) {}
  }

  // ── Employees ─────────────────────────────────────────

  private mapUserPrimaryInfoToEmployee(profile: UserPrimaryInfo): EmployeeProfile {
    const normalizedUserId = Number(
      profile?.userId || profile?.user?.userId || profile?.user?.id || profile?.id || 0,
    );
    const normalizedFullName =
      (profile?.fullname || profile?.user?.fullname || '').trim();
    const [firstName = '', ...lastParts] = normalizedFullName.split(/\s+/).filter(Boolean);
    const lastName = lastParts.join(' ');
    return {
      id: normalizedUserId || Number(profile?.id || 0),
      firstName,
      lastName,
      fullname: normalizedFullName,
      username: profile?.username || profile?.user?.username || '',
      email: profile?.email || profile?.user?.email || '',
      profileImage: profile?.profileImage || '',
      userId: normalizedUserId || undefined,
      accountVerified: profile?.accountVerified ?? profile?.user?.accountVerified,
      accountState: profile?.accountState || profile?.user?.accountState || '',
      dob:
        profile?.dob ||
        profile?.DOB ||
        profile?.birthDate ||
        profile?.dateOfBirth ||
        undefined,
      employeeStatus: 'ACTIVE',
      employeeMedia: null,
      user: normalizedUserId
        ? {
            id: normalizedUserId,
            userId: normalizedUserId,
            fullname: normalizedFullName,
            email: profile?.email || profile?.user?.email || '',
            username: profile?.username || profile?.user?.username || '',
            accountVerified: profile?.accountVerified ?? profile?.user?.accountVerified,
            accountState: profile?.accountState || profile?.user?.accountState || '',
          }
        : undefined,
    };
  }

  private isDmEligibleAccount(employee: EmployeeProfile | null | undefined): boolean {
    if (!employee) {
      return false;
    }
    const verifiedRaw =
      employee.accountVerified ?? employee.user?.accountVerified ?? false;
    const accountVerified =
      verifiedRaw === true ||
      String(verifiedRaw || '').trim().toLowerCase() === 'true';
    const accountState = this.normalizeIdentityText(
      employee.accountState || employee.user?.accountState || '',
    );
    if (accountState === 'suspended' || accountState === 'closed') {
      return false;
    }
    return accountVerified || accountState === 'opened';
  }

  private isOwnUserId(userId: number | null | undefined): boolean {
    const normalized = Number(userId || 0);
    if (!normalized) return false;
    const sessionUserId = Number(
      sessionStorage.getItem('userid') ||
      sessionStorage.getItem('userId') ||
      this.me.userId ||
      0,
    );
    return normalized === sessionUserId;
  }

  private normalizeIdentityText(value: string | null | undefined): string {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  private isOwnDmContact(contact: DmContact | null | undefined): boolean {
    if (!contact) return false;
    if (this.isOwnUserId(contact.userId) || this.isOwnUserId(contact.employeeId)) {
      return true;
    }

    const sessionUser = (() => {
      try {
        const raw =
          sessionStorage.getItem('userRegData') ||
          localStorage.getItem('userRegData');
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    })();

    const myNames = new Set(
      [
        this.me?.name,
        this.me?.shortName,
        sessionStorage.getItem('fullname'),
        localStorage.getItem('fullname'),
        sessionUser?.fullname,
        sessionUser?.name,
      ]
        .map((value) => this.normalizeIdentityText(value))
        .filter(Boolean),
    );
    const myEmails = new Set(
      [sessionUser?.email, sessionStorage.getItem('email'), localStorage.getItem('email')]
        .map((value) => this.normalizeIdentityText(value))
        .filter(Boolean),
    );
    const myUsernames = new Set(
      [
        sessionUser?.username,
        sessionStorage.getItem('username'),
        localStorage.getItem('username'),
      ]
        .map((value) => this.normalizeIdentityText(value))
        .filter(Boolean),
    );

    const contactNames = [
      contact.fullName,
      contact.shortName,
      `${contact.fullName}`.replace(/\s+/g, ' ').trim(),
    ]
      .map((value) => this.normalizeIdentityText(value))
      .filter(Boolean);
    if (contactNames.some((value) => myNames.has(value))) {
      return true;
    }

    const contactEmail = this.normalizeIdentityText(contact.email);
    if (contactEmail && myEmails.has(contactEmail)) {
      return true;
    }

    const contactUsername = this.normalizeIdentityText(contact.username);
    return Boolean(contactUsername && myUsernames.has(contactUsername));
  }

  private stripSelfFromDmContacts(contacts: DmContact[]): DmContact[] {
    const result: DmContact[] = [];
    for (const c of contacts || []) {
      if (this.isOwnDmContact(c)) {
        this.selfContact = c;
      } else {
        result.push(c);
      }
    }
    return result;
  }

  private loadEmployees(_forceRefresh = false): void {
    this.employeesLoading = true;
    forkJoin({
      profiles: this.collabService.getAllUserPrimaryInformation(),
      hrEmployees: this.collabService.getAllEmployees().pipe(
        catchError(() => of([])),
      ),
    }).subscribe({
      next: ({ profiles: profilesResponse, hrEmployees: hrEmployeesResponse }) => {
        const profiles: UserPrimaryInfo[] = Array.isArray(profilesResponse)
          ? profilesResponse
          : (profilesResponse as any)?.content ?? (profilesResponse as any)?.data ?? [];
        const hrEmployees = this.extractHrEmployees(hrEmployeesResponse);
        const hrEmployeeByUserId = new Map<number, any>();
        const hrEmployeeByEmail = new Map<string, any>();
        const hrEmployeeByName = new Map<string, any>();
        for (const employee of hrEmployees) {
          const userId = Number(
            employee?.userId ||
              employee?.user?.userId ||
              employee?.user?.id ||
              employee?.account?.userId ||
              0,
          );
          if (userId) {
            hrEmployeeByUserId.set(userId, employee);
          }
          const email = this.normalizeIdentityText(
            employee?.email || employee?.user?.email || '',
          );
          if (email) {
            hrEmployeeByEmail.set(email, employee);
          }
          const fullName = this.normalizeIdentityText(
            employee?.fullname ||
              employee?.fullName ||
              `${employee?.firstName || ''} ${employee?.lastName || ''}`,
          );
          if (fullName) {
            hrEmployeeByName.set(fullName, employee);
          }
        }
        const mergedProfiles = new Map<number, EmployeeProfile>();
        profiles.forEach((profile) => {
          const mappedProfile = this.mapUserPrimaryInfoToEmployee(profile);
          const profileUserId = Number(
            profile?.userId ||
              profile?.user?.userId ||
              profile?.user?.id ||
              profile?.id ||
              0,
          );
          const profileEmail = this.normalizeIdentityText(
            profile?.email || profile?.user?.email || '',
          );
          const profileName = this.normalizeIdentityText(
            profile?.fullname || profile?.user?.fullname || '',
          );
          const hrRecord =
            hrEmployeeByUserId.get(profileUserId) ||
            hrEmployeeByEmail.get(profileEmail) ||
            hrEmployeeByName.get(profileName);
          const merged = this.mergeEmployeeProfileWithHrRecord(
            mappedProfile,
            hrRecord,
          );
          const key = Number(this.employeeUserId(merged) || merged.id || 0);
          if (key) {
            mergedProfiles.set(key, merged);
          }
        });
        hrEmployees.forEach((employee) => {
          const mapped = this.mapHrEmployeeToEmployeeProfile(employee);
          if (!mapped) {
            return;
          }
          const key = Number(this.employeeUserId(mapped) || mapped.id || 0);
          if (!key) {
            return;
          }
          const existing = mergedProfiles.get(key);
          mergedProfiles.set(
            key,
            existing
              ? this.mergeEmployeeProfileWithHrRecord(existing, employee)
              : mapped,
          );
        });
        const list: EmployeeProfile[] = Array.from(mergedProfiles.values())
          .filter((profile) => this.employeeUserId(profile) != null);

        // Capture self BEFORE filter removes the logged-in user
        const selfProfile = list.find(
          (e) =>
            this.isOwnUserId(this.employeeUserId(e)) ||
            this.isOwnUserId(Number(e.id)),
        );
        if (selfProfile) {
          const spFirst = selfProfile.firstName || '';
          const spLast = selfProfile.lastName || '';
          const spFullName =
            `${spFirst} ${spLast}`.trim() ||
            selfProfile.fullname ||
            selfProfile.user?.fullname ||
            this.me.name ||
            'Me';
          const spUserId = Number(
            this.employeeUserId(selfProfile) || selfProfile.id,
          );
          this.selfContact = {
            id: `self-${selfProfile.id}`,
            employeeId: selfProfile.id,
            userId: spUserId,
            username:
              selfProfile.user?.username || selfProfile.username || '',
            shortName: spLast
              ? `${spFirst} ${spLast[0]}.`
              : spFirst || spFullName,
            fullName: spFullName,
            initials: initialsFrom(spFullName),
            avatarColor: _colorFor(selfProfile.id),
            email:
              selfProfile.user?.email ||
              selfProfile.email ||
              sessionStorage.getItem('email') ||
              localStorage.getItem('email') ||
              '',
            online: true,
            hasUnread: false,
            jobTitle: selfProfile.jobTitle,
            department: selfProfile.department?.name,
          };
          const selfAvatar = this.getEmpImageUrl(selfProfile);
          if (selfAvatar) this.selfContact.avatarUrl = selfAvatar;
        }

        const existingContacts = new Map(
          this.dmContacts.map((contact) => [Number(contact.userId), contact]),
        );
        this.allEmployees = list;
        this.dmContacts = list
          .filter(
            (e) =>
              this.employeeUserId(e) != null &&
              !this.isOwnUserId(this.employeeUserId(e)) &&
              this.isDmEligibleAccount(e),
          )
          .map((e) => {
            const first = e.firstName || '',
              last = e.lastName || '';
            const fullName =
              `${first} ${last}`.trim() ||
              e.fullname ||
              e.user?.fullname ||
              `User ${e.id}`;
            const employeeUserId = Number(this.employeeUserId(e));
            const contact: DmContact = {
              id: `emp-${e.id}`,
              employeeId: e.id,
              userId: employeeUserId,
              username: e.user?.username || e.username || '',
              shortName: last ? `${first} ${last[0]}.` : first || fullName,
              fullName,
              initials: initialsFrom(fullName),
              avatarColor: _colorFor(e.id),
              email: e.user?.email || e.email || '',
              accountVerified: e.accountVerified ?? e.user?.accountVerified,
              accountState: e.accountState || e.user?.accountState || '',
              jobTitle: e.jobTitle,
              department: e.department?.name,
              online: false,
              dob: e.dob,
            };
            const existing = existingContacts.get(contact.userId);
            if (existing) {
              contact.dmChannelId = existing.dmChannelId;
              contact.unreadCount = existing.unreadCount;
              contact.hasUnread = existing.hasUnread;
              contact.avatarUrl = existing.avatarUrl || contact.avatarUrl;
              contact.lastMessageTimestamp = existing.lastMessageTimestamp;
              contact.openIssueCount = existing.openIssueCount;
              contact.openTaskCount = existing.openTaskCount;
              contact.openEventCount = existing.openEventCount;
            }
            try {
              const stored = localStorage.getItem(`dm_ts_${employeeUserId}`);
              if (stored && !contact.lastMessageTimestamp) {
                contact.lastMessageTimestamp = Number(stored);
              }
            } catch (_) {}
            this.applyBirthdayReminderToContact(contact);
            if (contact.email) {
              this.userEmailCache[contact.userId] = contact.email;
            }
            const avatarUrl = this.getEmpImageUrl(e);
            if (avatarUrl) {
              contact.avatarUrl = avatarUrl;
              this.userAvatarCache[contact.userId] = avatarUrl;
            }
            return contact;
          });
        this.dmContacts = this.stripSelfFromDmContacts(this.dmContacts);
        this.upcomingBirthdays = this.buildUpcomingBirthdays(this.dmContacts);
        this.enrichBirthdaysFromHrDetails(this.dmContacts);
        if (this.cachedCollabChannels.length) {
          this.mapDirectMessageChannels(this.cachedCollabChannels);
        } else {
          this.loadChannels(true);
        }
        const activeDm = this.activeDmContact;
        if (
          activeDm &&
          activeDm.dmChannelId &&
          this.activeView === 'dm' &&
          this.dmMessages[activeDm.id] === undefined
        ) {
          this.loadDmMessages(activeDm, activeDm.dmChannelId);
        }
        this.syncHeaderState();
        this.employeesLoading = false;
        this.applyPendingMentionConversation();
        this.replayQueuedNotificationTarget();
        this.cdr.detectChanges();
        setTimeout(() => this.loadWorkEffectivenessData(), 2000);
      },
      error: () => {
        this.employeesError = 'Could not load contacts.';
        this.employeesLoading = false;
        this.upcomingBirthdays = [];
        this.cdr.detectChanges();
      },
    });
  }

  private extractHrEmployees(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.content)) {
      return response.content;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    if (Array.isArray(response?.items)) {
      return response.items;
    }
    return [];
  }

  private mergeEmployeeProfileWithHrRecord(
    profile: EmployeeProfile,
    employee: any,
  ): EmployeeProfile {
    if (!employee) {
      return profile;
    }
    const firstName =
      String(employee?.firstName || employee?.firstname || profile.firstName || '').trim();
    const lastName =
      String(employee?.lastName || employee?.lastname || profile.lastName || '').trim();
    const fullName =
      String(
        employee?.fullname ||
          employee?.fullName ||
          `${firstName} ${lastName}`.trim() ||
          profile.fullname ||
          profile.user?.fullname ||
          '',
      ).trim();
    const departmentName =
      employee?.department?.name ||
      employee?.departmentName ||
      employee?.department ||
      profile.department?.name ||
      '';
    const departmentCode =
      employee?.department?.code ||
      profile.department?.code ||
      departmentName
        .toString()
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-');
    const media =
      employee?.employeeMedia ||
      employee?.profilePic ||
      employee?.profilePicture ||
      null;

    return {
      ...profile,
      id: Number(employee?.id || employee?.employeeId || profile.id || 0) || profile.id,
      firstName: firstName || profile.firstName,
      lastName: lastName || profile.lastName,
      fullname: fullName || profile.fullname,
      email:
        employee?.email ||
        employee?.user?.email ||
        profile.email ||
        profile.user?.email ||
        '',
      accountVerified:
        employee?.accountVerified ??
        employee?.user?.accountVerified ??
        employee?.account?.accountVerified ??
        profile.accountVerified ??
        profile.user?.accountVerified,
      accountState:
        employee?.accountState ||
        employee?.user?.accountState ||
        employee?.account?.accountState ||
        profile.accountState ||
        profile.user?.accountState ||
        '',
      username:
        employee?.username ||
        employee?.user?.username ||
        profile.username ||
        profile.user?.username ||
        '',
      userId:
        Number(
          employee?.userId ||
            employee?.user?.userId ||
            employee?.user?.id ||
            profile.userId ||
            0,
        ) || profile.userId,
      jobTitle:
        employee?.jobTitle ||
        employee?.designation ||
        employee?.position ||
        profile.jobTitle,
      dob:
        employee?.DOB ||
        employee?.dob ||
        employee?.birthDate ||
        employee?.dateOfBirth ||
        profile.dob,
      department: departmentName
        ? {
            id: Number(employee?.department?.id || profile.department?.id || 0),
            name: String(departmentName),
            code: String(departmentCode || 'DEPARTMENT'),
          }
        : profile.department,
      employeeMedia:
        media && media?.mediaNo
          ? {
              id: Number(media?.id || 0),
              name: String(media?.name || 'profile-image'),
              mediaNo: String(media.mediaNo),
            }
          : profile.employeeMedia,
      user:
        profile.userId || employee?.userId || employee?.user?.userId || employee?.user?.id
          ? {
              id: Number(
                employee?.user?.id ||
                  employee?.userId ||
                  employee?.user?.userId ||
                  profile.user?.id ||
                  profile.userId ||
                  0,
              ),
              userId: Number(
                employee?.userId ||
                  employee?.user?.userId ||
                  employee?.user?.id ||
                  profile.user?.userId ||
                  profile.userId ||
                  0,
              ),
              fullname: fullName || profile.user?.fullname || profile.fullname || '',
              email:
                employee?.user?.email ||
                employee?.email ||
                profile.user?.email ||
                profile.email ||
                '',
              username:
                employee?.user?.username ||
                employee?.username ||
                profile.user?.username ||
                profile.username ||
                '',
              accountVerified:
                employee?.accountVerified ??
                employee?.user?.accountVerified ??
                employee?.account?.accountVerified ??
                profile.user?.accountVerified ??
                profile.accountVerified,
              accountState:
                employee?.accountState ||
                employee?.user?.accountState ||
                employee?.account?.accountState ||
                profile.user?.accountState ||
                profile.accountState ||
                '',
            }
          : profile.user,
    };
  }

  private mapHrEmployeeToEmployeeProfile(employee: any): EmployeeProfile | null {
    if (!employee) {
      return null;
    }
    const merged = this.mergeEmployeeProfileWithHrRecord(
      {
        id: Number(employee?.id || employee?.employeeId || 0),
        firstName: String(employee?.firstName || employee?.firstname || '').trim(),
        lastName: String(employee?.lastName || employee?.lastname || '').trim(),
        fullname: String(
          employee?.fullname ||
            employee?.fullName ||
            `${employee?.firstName || ''} ${employee?.lastName || ''}`,
        ).trim(),
        username: String(employee?.username || employee?.user?.username || '').trim(),
        email: String(employee?.email || employee?.user?.email || '').trim(),
        accountVerified:
          employee?.accountVerified ??
          employee?.user?.accountVerified ??
          employee?.account?.accountVerified,
        accountState:
          employee?.accountState ||
          employee?.user?.accountState ||
          employee?.account?.accountState ||
          '',
        profileImage: String(employee?.profileImage || '').trim(),
        userId: Number(
          employee?.userId ||
            employee?.user?.userId ||
            employee?.user?.id ||
            0,
        ) || undefined,
        jobTitle: String(
          employee?.jobTitle || employee?.designation || employee?.position || '',
        ).trim(),
        dob:
          employee?.DOB ||
          employee?.dob ||
          employee?.birthDate ||
          employee?.dateOfBirth ||
          undefined,
        department: undefined,
        employeeMedia: null,
        employeeStatus: String(employee?.employeeStatus || 'ACTIVE').trim(),
        user: undefined,
      },
      employee,
    );
    return this.employeeUserId(merged) != null ? merged : null;
  }

  private normalizeBirthdaySource(raw: unknown): string | null {
    if (typeof raw !== 'string') {
      return null;
    }
    const value = raw.trim();
    if (!value) {
      return null;
    }
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) {
      return null;
    }
    const year = parsed.getUTCFullYear();
    const month = `${parsed.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${parsed.getUTCDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private computeBirthdayReminder(rawDob: string | null | undefined): {
    dob: string;
    birthdayMonthDayLabel: string;
    birthdayCountdownLabel: string;
    daysUntilBirthday: number;
    birthdayIsToday: boolean;
  } | null {
    const normalized = this.normalizeBirthdaySource(rawDob);
    if (!normalized) {
      return null;
    }
    const [, monthRaw, dayRaw] = normalized.split('-');
    const birthMonth = Number(monthRaw || 0);
    const birthDay = Number(dayRaw || 0);
    if (!birthMonth || !birthDay) {
      return null;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let nextBirthday = new Date(today.getFullYear(), birthMonth - 1, birthDay);
    if (
      nextBirthday.getMonth() !== birthMonth - 1 ||
      nextBirthday.getDate() !== birthDay
    ) {
      return null;
    }
    if (nextBirthday.getTime() < today.getTime()) {
      nextBirthday = new Date(today.getFullYear() + 1, birthMonth - 1, birthDay);
    }
    const daysUntilBirthday = Math.round(
      (nextBirthday.getTime() - today.getTime()) / 86400000,
    );
    const birthdayMonthDayLabel = nextBirthday.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });
    const birthdayIsToday = daysUntilBirthday === 0;
    const birthdayCountdownLabel = birthdayIsToday
      ? 'Today'
      : daysUntilBirthday === 1
        ? 'Tomorrow'
        : `${daysUntilBirthday} days`;
    return {
      dob: normalized,
      birthdayMonthDayLabel,
      birthdayCountdownLabel,
      daysUntilBirthday,
      birthdayIsToday,
    };
  }

  private applyBirthdayReminderToContact(contact: DmContact): void {
    const reminder = this.computeBirthdayReminder(contact.dob);
    contact.birthdayMonthDayLabel = reminder?.birthdayMonthDayLabel;
    contact.birthdayCountdownLabel =
      reminder && reminder.daysUntilBirthday <= BIRTHDAY_REMINDER_WINDOW_DAYS
        ? reminder.birthdayCountdownLabel
        : undefined;
    contact.daysUntilBirthday = reminder?.daysUntilBirthday ?? null;
    contact.birthdayIsToday = reminder?.birthdayIsToday ?? false;
  }

  private buildUpcomingBirthdays(contacts: DmContact[]): BirthdayReminderItem[] {
    return (contacts || [])
      .map((contact) => {
        const reminder = this.computeBirthdayReminder(contact.dob);
        if (!reminder) {
          return null;
        }
        return {
          id: contact.id,
          employeeId: contact.employeeId,
          userId: contact.userId,
          fullName: contact.fullName,
          shortName: contact.shortName,
          initials: contact.initials,
          avatarColor: contact.avatarColor,
          avatarUrl: contact.avatarUrl,
          jobTitle: contact.jobTitle,
          department: contact.department,
          dob: reminder.dob,
          birthdayMonthDayLabel: reminder.birthdayMonthDayLabel,
          birthdayCountdownLabel: reminder.birthdayCountdownLabel,
          daysUntilBirthday: reminder.daysUntilBirthday,
          birthdayIsToday: reminder.birthdayIsToday,
        } as BirthdayReminderItem;
      })
      .filter((entry): entry is BirthdayReminderItem => !!entry)
      .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday)
      .slice(0, 8);
  }

  private enrichBirthdaysFromHrDetails(contacts: DmContact[]): void {
    const contactsMissingDob = (contacts || []).filter(
      (contact) => contact.userId && !this.normalizeBirthdaySource(contact.dob),
    );
    if (!contactsMissingDob.length) {
      return;
    }

    const detailRequests = contactsMissingDob.map((contact) =>
      this.collabService.getEmployeeByUserId(contact.userId).pipe(
        catchError(() => of(null)),
      ),
    );

    forkJoin(detailRequests).subscribe((responses) => {
      let updated = false;

      responses.forEach((response, index) => {
        const contact = contactsMissingDob[index];
        if (!contact) {
          return;
        }

        const employee = (response as any)?.data || response || null;
        const dob = this.normalizeBirthdaySource(
          employee?.DOB ||
            employee?.dob ||
            employee?.birthDate ||
            employee?.dateOfBirth ||
            employee?.user?.DOB ||
            employee?.user?.dob ||
            null,
        );

        if (!dob) {
          return;
        }

        const liveContact = this.dmContacts.find(
          (entry) => Number(entry.userId) === Number(contact.userId),
        );
        if (!liveContact) {
          return;
        }

        liveContact.dob = dob;
        liveContact.jobTitle =
          liveContact.jobTitle ||
          employee?.jobTitle ||
          employee?.designation ||
          employee?.position ||
          undefined;
        liveContact.department =
          liveContact.department ||
          employee?.department?.name ||
          employee?.departmentName ||
          employee?.department ||
          undefined;
        this.applyBirthdayReminderToContact(liveContact);
        updated = true;
      });

      if (!updated) {
        return;
      }

      this.upcomingBirthdays = this.buildUpcomingBirthdays(this.dmContacts);
      this.syncHeaderState();
      this.cdr.detectChanges();
    });
  }

  private resolveCollaborationRoute(): string {
    return `/admin/dashboard/communications/${this.resolveDashboardRouteUuid()}`;
  }

  private resolveDashboardRouteUuid(): string {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(
        /\/admin\/dashboard\/communications\/([^/?#]+)/,
      );
      if (match?.[1]) {
        return match[1];
      }
    }
    return (
      String(sessionStorage.getItem('uuid') || '').trim() ||
      String(localStorage.getItem('uuid') || '').trim() ||
      'uu'
    );
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

  loadChannels(silent = false, force = false): void {
    const now = Date.now();
    const hasCachedChannels = this.cachedCollabChannels.length > 0;
    const cacheIsFresh =
      hasCachedChannels &&
      now - this.lastChannelsLoadedAt < this.CHANNELS_CACHE_TTL_MS;

    if (!silent && hasCachedChannels) {
      this.channelsLoading = false;
      this.channelsError = null;
      this.mapAndSetChannels(this.cachedCollabChannels);
      if (cacheIsFresh && !force) {
        return;
      }
      silent = true;
    }

    if (this.channelsRequestInFlight) {
      if (force) {
        this.pendingForcedChannelsRefresh = true;
      }
      if (!silent && !hasCachedChannels) {
        this.channelsLoading = true;
      }
      return;
    }

    if (!silent) this.channelsLoading = true;
    this.channelsError = null;
    this.channelsRequestInFlight = true;
    this.collabService.getHomeChannels().subscribe({
      next: (home) => {
        this.clearChannelsRetryTimer();
        this.lastChannelsLoadedAt = Date.now();
        this.mapAndSetChannels(home?.channels || []);
        this.channelsRequestInFlight = false;
        this.flushPendingForcedChannelsRefresh();
      },
      error: () => {
        this.channelsRequestInFlight = false;
        this.flushPendingForcedChannelsRefresh();
        if (!this.channels.length) {
          this.channelsError = 'Could not load channels.';
          this.channels = [];
          this.scheduleChannelsRetry();
        }
        this.channelsLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private mapAndSetChannels(list: CollabChannel[]): void {
    this.channelsError = null;
    const storedUnreadSnapshot = this.readStoredUnreadSnapshot();
    const existingChannelUnread = new Map(
      this.channels.map((channel) => [
        Number(channel.backendId),
        Number(channel.unreadCount || 0),
      ]),
    );
    this.cachedCollabChannels = list;
    this.mapDirectMessageChannels(list);
    const allowedIds = new Set(
      list
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
        .map((c) => Number(c.channelId ?? c.id)),
    );
    this.channelMessageSubs.forEach((sub, channelId) => {
      if (allowedIds.has(channelId)) return;
      try {
        sub.unsubscribe();
      } catch (_) {}
      this.channelMessageSubs.delete(channelId);
    });
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
        const isActiveChannel = this.isViewingChannel(String(backendId));
        const serverUnreadCount = Number(c.unreadCount ?? 0);
        const preservedUnreadCount = existingChannelUnread.get(backendId) || 0;
        const storedUnreadCount = storedUnreadSnapshot.channels.get(backendId) || 0;
        const unreadCount = isActiveChannel
          ? 0
          : Math.max(serverUnreadCount, preservedUnreadCount, storedUnreadCount);
        return {
          id: String(backendId),
          backendId,
          name: c.name,
          description: c.description,
          channelType: c.channelType,
          workspaceMode: c.workspaceMode || 'CHAT',
          allowFolders: Boolean(c.allowFolders),
          allowSubfolders: Boolean(c.allowSubfolders),
          createdBy: c.createdBy,
          hasUnread: !isActiveChannel && unreadCount > 0,
          unreadCount: unreadCount > 0 ? unreadCount : undefined,
        };
      });
    if (this.wsConnected) {
      this.channels.forEach((channel) => this.subscribeToChannel(channel.backendId));
    }
    this.channelsLoading = false;
    this.applyPendingShareDoc();
    if (
      this.channels.length > 0 &&
      !this.activeChannelId &&
      !this.activeDmId &&
      this.activeView === 'channel' &&
      this.workspaceMode === 'chat'
    )
      this.selectChannel(this.channels[0].id);
    this.syncHeaderState();
    this.replayQueuedNotificationTarget();
    this.cdr.detectChanges();
  }

  private mapDirectMessageChannels(list: CollabChannel[]): void {
    const storedUnreadSnapshot = this.readStoredUnreadSnapshot();
    const existingDmUnread = new Map(
      this.dmContacts.map((contact) => [
        Number(contact.userId),
        Number(contact.unreadCount || 0),
      ]),
    );
    for (const contact of this.dmContacts) {
      contact.dmChannelId = undefined;
      contact.dmChannelIds = undefined;
      contact.unreadCount = undefined;
      contact.hasUnread = false;
    }

    const dmChannels = list.filter((channel) => {
      const desc = (channel.description || '').toLowerCase();
      const name = (channel.name || '').toLowerCase();
      return (
        channel.channelType === 'PRIVATE' &&
        (desc.startsWith('dm between') || name.match(/^dm-\d+-\d+$/) !== null)
      );
    });

    const channelsByUserId = new Map<number, CollabChannel[]>();
    const unreadByUserId = new Map<number, number>();

    for (const channel of dmChannels) {
      const participantIds = this.extractDmParticipantIds(channel);
      const includesCurrentUser = participantIds.some(
        (userId) => Number(userId) === Number(this.me.userId),
      );
      if (!includesCurrentUser) continue;
      const otherUserId = participantIds.find(
        (userId) => Number(userId) !== Number(this.me.userId),
      );
      if (!otherUserId) continue;
      const contact = this.dmContacts.find(
        (entry) => Number(entry.userId) === Number(otherUserId),
      );
      if (!contact) continue;
      const candidates = channelsByUserId.get(Number(otherUserId)) || [];
      candidates.push(channel);
      channelsByUserId.set(Number(otherUserId), candidates);
      const unreadCount = Number(channel.unreadCount || 0);
      unreadByUserId.set(
        Number(otherUserId),
        (unreadByUserId.get(Number(otherUserId)) || 0) + unreadCount,
      );
    }

    for (const contact of this.dmContacts) {
      const candidates = channelsByUserId.get(Number(contact.userId)) || [];
      const selected = this.pickPreferredDmChannel(contact, candidates);
      if (!selected) continue;
      this.assignDmChannels(contact, selected, candidates);
      const unreadCount = Math.max(
        unreadByUserId.get(Number(contact.userId)) || 0,
        existingDmUnread.get(Number(contact.userId)) || 0,
        storedUnreadSnapshot.dms.get(Number(contact.userId)) || 0,
      );
      contact.unreadCount = unreadCount > 0 ? unreadCount : undefined;
      contact.hasUnread = unreadCount > 0;
    }

    this.dmContacts = [...this.dmContacts];

    if (this.wsConnected) {
      for (const contact of this.dmContacts) {
        this.subscribeToDmContactChannels(contact);
      }
    }
  }

  private readStoredUnreadSnapshot(): {
    channels: Map<number, number>;
    dms: Map<number, number>;
  } {
    const channels = new Map<number, number>();
    const dms = new Map<number, number>();
    if (typeof sessionStorage === 'undefined') {
      return { channels, dms };
    }
    try {
      const raw = sessionStorage.getItem(COLLAB_UNREAD_SNAPSHOT_KEY);
      const parsed = JSON.parse(raw || '[]');
      if (!Array.isArray(parsed)) {
        return { channels, dms };
      }
      for (const entry of parsed) {
        const unreadCount = Number(entry?.unreadCount || 0);
        if (unreadCount <= 0) {
          continue;
        }
        const backendId = Number(entry?.backendId || 0);
        const dmUserId = Number(entry?.dmUserId || 0);
        if (entry?.type === 'dm' && dmUserId > 0) {
          dms.set(dmUserId, Math.max(dms.get(dmUserId) || 0, unreadCount));
          continue;
        }
        if (backendId > 0) {
          channels.set(backendId, Math.max(channels.get(backendId) || 0, unreadCount));
        }
      }
    } catch (_) {}
    return { channels, dms };
  }

  private writeCurrentUnreadSnapshot(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    try {
      const snapshot = [
        ...this.channels
          .filter((channel) => Number(channel.unreadCount || 0) > 0)
          .map((channel) => ({
            backendId: Number(channel.backendId),
            type: 'channel',
            unreadCount: Number(channel.unreadCount || 0),
          })),
        ...this.dmContacts
          .filter((contact) => Number(contact.unreadCount || 0) > 0)
          .map((contact) => ({
            backendId: Number(contact.dmChannelId || 0),
            type: 'dm',
            dmUserId: Number(contact.userId),
            unreadCount: Number(contact.unreadCount || 0),
          })),
      ];
      sessionStorage.setItem(
        COLLAB_UNREAD_SNAPSHOT_KEY,
        JSON.stringify(snapshot),
      );
    } catch (_) {}
  }

  private dmChannelIdsFor(contact: DmContact): number[] {
    const explicitIds = (contact.dmChannelIds || [])
      .map((value) => Number(value))
      .filter((value) => value > 0);
    const fallbackId = Number(contact.dmChannelId || 0);
    if (fallbackId > 0 && !explicitIds.includes(fallbackId)) {
      explicitIds.unshift(fallbackId);
    }
    return Array.from(new Set(explicitIds));
  }

  private flushPendingForcedChannelsRefresh(): void {
    if (!this.pendingForcedChannelsRefresh) {
      return;
    }
    this.pendingForcedChannelsRefresh = false;
    setTimeout(() => this.loadChannels(true, true), 0);
  }

  private scheduleChannelsRetry(): void {
    if (this.channelsRetryTimer != null) {
      return;
    }
    this.channelsRetryTimer = window.setTimeout(() => {
      this.channelsRetryTimer = null;
      this.loadChannels(true, true);
    }, 1500);
  }

  private clearChannelsRetryTimer(): void {
    if (this.channelsRetryTimer == null) {
      return;
    }
    window.clearTimeout(this.channelsRetryTimer);
    this.channelsRetryTimer = null;
  }

  private isBrokenSnapshotChannel(channelId: number): boolean {
    if (!channelId) {
      return false;
    }
    const status = this.channelSnapshotLastErrorStatus.get(channelId) || 0;
    const failures = this.channelSnapshotConsecutiveFailures.get(channelId) || 0;
    return failures > 0 && (status >= 500 || status === 0);
  }

  private orderDmChannelCandidates(channels: CollabChannel[]): CollabChannel[] {
    return [...channels].sort((left, right) => {
      const leftBroken = this.isBrokenSnapshotChannel(
        Number(left.channelId ?? left.id),
      );
      const rightBroken = this.isBrokenSnapshotChannel(
        Number(right.channelId ?? right.id),
      );
      if (leftBroken !== rightBroken) {
        return leftBroken ? 1 : -1;
      }

      const createdDiff =
        this.channelCreatedAtValue(right) - this.channelCreatedAtValue(left);
      if (createdDiff !== 0) {
        return createdDiff;
      }
      return Number(right.channelId ?? right.id) - Number(left.channelId ?? left.id);
    });
  }

  private matchingDmChannels(
    contact: DmContact,
    channels: CollabChannel[],
  ): CollabChannel[] {
    return channels.filter((channel) => {
      const participantIds = this.extractDmParticipantIds(channel);
      return (
        channel.channelType === 'PRIVATE' &&
        participantIds.includes(Number(this.me.userId)) &&
        participantIds.includes(Number(contact.userId))
      );
    });
  }

  private prioritizeDmChannelIds(
    contact: DmContact,
    preferredChannelId?: number | null,
    channels?: CollabChannel[],
  ): number[] {
    const candidateIds = new Set<number>();
    for (const value of contact.dmChannelIds || []) {
      const numericValue = Number(value);
      if (numericValue > 0) {
        candidateIds.add(numericValue);
      }
    }
    const currentChannelId = Number(contact.dmChannelId || 0);
    if (currentChannelId > 0) {
      candidateIds.add(currentChannelId);
    }
    for (const channel of channels || []) {
      const channelId = Number(channel.channelId ?? channel.id);
      if (channelId > 0) {
        candidateIds.add(channelId);
      }
    }

    return Array.from(candidateIds).sort((left, right) => {
      if (preferredChannelId && left === preferredChannelId) {
        return -1;
      }
      if (preferredChannelId && right === preferredChannelId) {
        return 1;
      }
      const leftBroken = this.isBrokenSnapshotChannel(left);
      const rightBroken = this.isBrokenSnapshotChannel(right);
      if (leftBroken !== rightBroken) {
        return leftBroken ? 1 : -1;
      }
      return right - left;
    });
  }

  private assignDmChannels(
    contact: DmContact,
    selectedChannel: CollabChannel | null,
    candidates: CollabChannel[],
  ): number | null {
    if (!selectedChannel) {
      contact.dmChannelId = undefined;
      contact.dmChannelIds = undefined;
      return null;
    }

    const selectedChannelId = Number(
      selectedChannel.channelId ?? selectedChannel.id,
    );
    contact.dmChannelId = selectedChannelId;
    contact.dmChannelIds = this.prioritizeDmChannelIds(
      contact,
      selectedChannelId,
      candidates,
    );
    return selectedChannelId;
  }

  private pickPreferredDmChannel(
    contact: DmContact,
    candidates: CollabChannel[],
  ): CollabChannel | null {
    if (!candidates.length) {
      return null;
    }

    const currentChannelId = Number(contact.dmChannelId || 0);
    if (currentChannelId > 0 && !this.isBrokenSnapshotChannel(currentChannelId)) {
      const current = candidates.find(
        (channel) =>
          Number(channel.channelId ?? channel.id) === currentChannelId,
      );
      if (current) {
        return current;
      }
    }

    return this.orderDmChannelCandidates(candidates)[0] || null;
  }

  private resolveExistingDmChannel(
    contact: DmContact,
    channels: CollabChannel[],
  ): number | null {
    const candidates = this.matchingDmChannels(contact, channels);
    const selected = this.pickPreferredDmChannel(contact, candidates);
    return this.assignDmChannels(contact, selected, candidates);
  }

  private compareDmChannelPriority(
    left: CollabChannel,
    right: CollabChannel,
  ): number {
    const leftStamp = this.channelCreatedAtValue(left);
    const rightStamp = this.channelCreatedAtValue(right);
    if (leftStamp !== rightStamp) {
      return leftStamp - rightStamp;
    }
    return Number(left.channelId ?? left.id) - Number(right.channelId ?? right.id);
  }

  private channelCreatedAtValue(channel: CollabChannel): number {
    const createdAt = Array.isArray(channel.createdAt) ? channel.createdAt : [];
    if (!createdAt.length) {
      return Number(channel.channelId ?? channel.id) || Number.MAX_SAFE_INTEGER;
    }
    const [
      year,
      month,
      day,
      hour = 0,
      minute = 0,
      second = 0,
      nano = 0,
    ] = createdAt;
    return new Date(
      year || 0,
      Math.max((month || 1) - 1, 0),
      day || 1,
      hour || 0,
      minute || 0,
      second || 0,
      Math.floor((nano || 0) / 1_000_000),
    ).getTime();
  }

  private findAlternateDmChannelId(
    contact: DmContact,
    currentChannelId: number,
  ): number | null {
    const candidates = this.orderDmChannelCandidates(
      this.matchingDmChannels(contact, this.cachedCollabChannels || []).filter(
        (channel) =>
          Number(channel.channelId ?? channel.id) !== Number(currentChannelId),
      ),
    );

    if (!candidates.length) {
      return null;
    }
    return Number(candidates[0].channelId ?? candidates[0].id) || null;
  }

  private findBestDmChannelId(contact: DmContact): number | null {
    const candidates = this.orderDmChannelCandidates(
      this.matchingDmChannels(contact, this.cachedCollabChannels || []),
    );

    if (!candidates.length) {
      return null;
    }
    return Number(candidates[0].channelId ?? candidates[0].id) || null;
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
      workspaceMode: 'CHAT',
      allowFolders: false,
      allowSubfolders: false,
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
      workspaceMode: ch.workspaceMode || 'CHAT',
      allowFolders: Boolean(ch.allowFolders),
      allowSubfolders: Boolean(ch.allowSubfolders),
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
  onChannelModalWorkspaceModeChange(val: 'CHAT' | 'DOCUMENT_LIBRARY' | 'HYBRID'): void {
    this.channelModal.workspaceMode = val;
    if (val === 'CHAT') {
      this.channelModal.allowFolders = false;
      this.channelModal.allowSubfolders = false;
    }
  }
  onChannelModalAllowFoldersChange(val: boolean): void {
    this.channelModal.allowFolders = val;
    if (!val) {
      this.channelModal.allowSubfolders = false;
    }
  }
  onChannelModalAllowSubfoldersChange(val: boolean): void {
    this.channelModal.allowSubfolders = this.channelModal.allowFolders ? val : false;
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
          workspaceMode: m.workspaceMode,
          allowFolders: m.allowFolders,
          allowSubfolders: m.allowSubfolders,
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
              this.loadChannels(false, true);
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
          workspaceMode: m.workspaceMode,
          allowFolders: m.allowFolders,
          allowSubfolders: m.allowSubfolders,
          createdBy: m.editingCreatedBy!,
        })
        .subscribe({
          next: () => {
            this.closeChannelModal();
            this.loadChannels(false, true);
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
      const emp = this.allEmployees.find((e) => this.employeeUserId(e) === uid);
      const avatarUrl = emp ? this.getEmpImageUrl(emp) : '';
      if (avatarUrl) {
        this.userAvatarCache[uid] = avatarUrl;
        this.cdr.detectChanges();
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
    e.fullname ||
    e.user?.fullname ||
    `User ${e.id}`;
  getEmpInitials = (e: EmployeeProfile): string =>
    initialsFrom(this.getEmpName(e));
  getEmpAvatarColor = (e: EmployeeProfile): string => _colorFor(e.id);
  getEmpImageUrl = (e: EmployeeProfile): string | undefined =>
    e.profileImage ||
    (e.employeeMedia?.mediaNo ? this.imageCache[e.employeeMedia.mediaNo] : undefined);

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
        workspaceMode: ch.workspaceMode || 'CHAT',
        allowFolders: Boolean(ch.allowFolders),
        allowSubfolders: Boolean(ch.allowSubfolders),
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

  isDocumentLibraryChannel(channel: Channel | null | undefined): boolean {
    return channel?.workspaceMode === 'DOCUMENT_LIBRARY';
  }

  isHybridWorkspaceChannel(channel: Channel | null | undefined): boolean {
    return channel?.workspaceMode === 'HYBRID';
  }

  hasFileWorkspace(channel: Channel | null | undefined): boolean {
    return this.isDocumentLibraryChannel(channel) || this.isHybridWorkspaceChannel(channel);
  }

  isShowingDocumentLibrary(): boolean {
    const activeChannel = this.activeChannel || null;
    if (this.activeView !== 'channel' || !activeChannel) {
      return false;
    }
    if (this.isDocumentLibraryChannel(activeChannel)) {
      return true;
    }
    return this.isHybridWorkspaceChannel(activeChannel) && this.channelWorkspacePane === 'files';
  }

  switchHybridWorkspacePane(pane: 'chat' | 'files'): void {
    const activeChannel = this.activeChannel;
    if (!activeChannel || !this.isHybridWorkspaceChannel(activeChannel)) {
      return;
    }
    this.channelWorkspacePane = pane;
    if (pane === 'files') {
      this.loadDocumentLibrary(activeChannel, this.activeDocumentFolderId);
    } else {
      this.focusMessageComposerSoon();
      this.scrollToLatestMessageSoon();
    }
    this.cdr.detectChanges();
  }

  private resetDocumentLibraryState(): void {
    this.documentFolders = [];
    this.documentFiles = [];
    this.folderTreeItems = [];
    this.expandedFolderIds = new Set();
    this.documentLibraryError = '';
    this.documentLibraryLoading = false;
    this.activeDocumentFolderId = null;
    this.documentFolderModal = {
      open: false,
      mode: 'create',
      folderId: null,
      name: '',
      description: '',
      parentFolderId: null,
      createdByLabel: '',
      createdAtLabel: '',
      saving: false,
      error: '',
    };
  }

  private loadDocumentLibrary(channel: Channel, preferredFolderId?: number | null): void {
    this.documentLibraryLoading = true;
    this.documentLibraryError = '';
    this.messagesLoading = false;
    this.activeDocumentFolderId = preferredFolderId ?? this.activeDocumentFolderId ?? null;
    this.collabService.getDocumentFolders(channel.backendId).subscribe({
      next: (folders) => {
        this.documentFolders = folders || [];
        const hasActiveFolder = this.documentFolders.some(
          (folder) => Number(folder.id) === Number(this.activeDocumentFolderId || 0),
        );
        if (!hasActiveFolder) {
          this.activeDocumentFolderId = null;
        }
        // Expand path to active folder so it's visible in the tree
        if (this.activeDocumentFolderId != null) {
          this.expandedFolderIds.add(Number(this.activeDocumentFolderId));
          this.expandPathToFolder(this.activeDocumentFolderId);
        }
        this.rebuildFolderTree();
        // Navigate to a pending shared folder if one arrived via deep link
        if (this.pendingShareFolderId != null) {
          const targetFolderId = this.pendingShareFolderId;
          this.pendingShareFolderId = null;
          this.openDocumentFolder(targetFolderId);
          return;
        }
        this.loadDocumentFiles(channel.backendId, this.activeDocumentFolderId);
      },
      error: () => {
        this.documentLibraryLoading = false;
        this.documentLibraryError = 'Could not load folders.';
        this.cdr.detectChanges();
      },
    });
  }

  private loadDocumentFiles(channelId: number, folderId?: number | null): void {
    this.collabService.getChannelDocuments(channelId, folderId ?? null).subscribe({
      next: (files) => {
        this.documentFiles = (files || []).map((file) => ({
          id: Number(file.id),
          folderId: file.folderId ?? null,
          name: file.fileName,
          contentType: file.contentType,
          fileSize: file.fileSize,
          downloadUrl: file.downloadUrl,
          uploadedAt: file.uploadedAt,
          downloadCount: this.docDownloadCounts[Number(file.id)] ?? (file.downloadCount ?? 0),
        }));
        this.documentLibraryLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.documentFiles = [];
        this.documentLibraryLoading = false;
        this.documentLibraryError = 'Could not load documents.';
        this.cdr.detectChanges();
      },
    });
  }

  activeDocumentFolders(): CollabDocumentFolder[] {
    const parentId = this.activeDocumentFolderId ?? null;
    return this.documentFolders.filter(
      (folder) => Number(folder.parentFolderId || 0) === Number(parentId || 0),
    );
  }

  rebuildFolderTree(): void {
    this.folderTreeItems = this.buildFlatTree(null, 0);
    this.cdr.detectChanges();
  }

  trackFolderItem(_index: number, item: FolderTreeItem): number {
    return Number(item.folder.id);
  }

  private buildFlatTree(parentId: number | null, depth: number): FolderTreeItem[] {
    const result: FolderTreeItem[] = [];
    const children = this.documentFolders.filter(
      (f) => Number(f.parentFolderId || 0) === Number(parentId || 0),
    );
    for (const folder of children) {
      const hasChildren = this.documentFolders.some(
        (f) => Number(f.parentFolderId || 0) === Number(folder.id),
      );
      const expanded = this.expandedFolderIds.has(Number(folder.id));
      result.push({ folder, depth, hasChildren, expanded });
      if (expanded) {
        result.push(...this.buildFlatTree(folder.id, depth + 1));
      }
    }
    return result;
  }

  toggleFolderExpand(folderId: number, event?: Event): void {
    event?.stopPropagation();
    const id = Number(folderId);
    if (this.expandedFolderIds.has(id)) {
      this.expandedFolderIds.delete(id);
    } else {
      this.expandedFolderIds.add(id);
    }
    this.rebuildFolderTree();
  }

  private expandPathToFolder(folderId: number | null): void {
    if (folderId == null) return;
    let cursor = this.documentFolders.find((f) => Number(f.id) === Number(folderId));
    while (cursor?.parentFolderId != null) {
      this.expandedFolderIds.add(Number(cursor.parentFolderId));
      cursor = this.documentFolders.find((f) => Number(f.id) === Number(cursor!.parentFolderId));
    }
  }

  currentDocumentFolder(): CollabDocumentFolder | null {
    return (
      this.documentFolders.find(
        (entry) => Number(entry.id) === Number(this.activeDocumentFolderId || 0),
      ) || null
    );
  }

  currentDocumentParentFolderId(): number | null {
    return this.currentDocumentFolder()?.parentFolderId ?? null;
  }

  formatFolderTimestamp(value?: string | number[]): string {
    if (!value) return 'Not available';
    const date = Array.isArray(value) ? new Date(Number(value[0]), Number(value[1] || 1) - 1, Number(value[2] || 1), Number(value[3] || 0), Number(value[4] || 0), Number(value[5] || 0)) : new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
  }

  folderCreatedByLabel(userId?: number | null): string {
    const uid = Number(userId || 0);
    if (!uid) return this.me.name || 'Unknown user';
    return this.userDirectory[uid] || (uid === Number(this.me.userId) ? this.me.name : `User ${uid}`);
  }

  documentBreadcrumbs(): CollabDocumentFolder[] {
    const crumbs: CollabDocumentFolder[] = [];
    let cursor = this.currentDocumentFolder();
    const seen = new Set<number>();
    while (cursor && !seen.has(Number(cursor.id))) {
      crumbs.unshift(cursor);
      seen.add(Number(cursor.id));
      cursor =
        this.documentFolders.find(
          (entry) => Number(entry.id) === Number(cursor?.parentFolderId || 0),
        ) || null;
    }
    return crumbs;
  }

  activeDocumentFolderName(): string {
    return this.currentDocumentFolder()?.name || 'Root';
  }

  openDocumentFolder(folderId: number | null): void {
    const activeChannel = this.activeChannel;
    if (!activeChannel || !this.hasFileWorkspace(activeChannel)) {
      return;
    }
    this.activeDocumentFolderId = folderId;
    if (folderId != null) {
      this.expandedFolderIds.add(Number(folderId));
      this.expandPathToFolder(folderId);
    }
    this.rebuildFolderTree();
    this.loadDocumentFiles(activeChannel.backendId, folderId);
  }

  openCreateDocumentFolderModal(): void {
    const activeChannel = this.activeChannel;
    if (!activeChannel || !this.hasFileWorkspace(activeChannel) || !activeChannel.allowFolders) {
      return;
    }
    if (this.activeDocumentFolderId != null && !activeChannel.allowSubfolders) {
      this.documentLibraryError = 'This channel allows folders but not subfolders.';
      this.cdr.detectChanges();
      return;
    }
    this.documentFolderModal = {
      open: true,
      mode: 'create',
      folderId: null,
      name: '',
      description: '',
      parentFolderId: this.activeDocumentFolderId,
      createdByLabel: this.me.name,
      createdAtLabel: new Date().toLocaleString(),
      saving: false,
      error: '',
    };
  }

  openEditDocumentFolderModal(folder: CollabDocumentFolder, event?: Event): void {
    event?.stopPropagation();
    this.documentFolderModal = {
      open: true,
      mode: 'edit',
      folderId: folder.id,
      name: folder.name,
      description: folder.description || '',
      parentFolderId: folder.parentFolderId ?? null,
      createdByLabel: this.folderCreatedByLabel(folder.createdBy),
      createdAtLabel: this.formatFolderTimestamp(folder.createdAt),
      saving: false,
      error: '',
    };
  }

  closeDocumentFolderModal(): void {
    this.documentFolderModal = {
      ...this.documentFolderModal,
      open: false,
      saving: false,
      error: '',
    };
  }

  saveDocumentFolderModal(): void {
    const activeChannel = this.activeChannel;
    const modal = this.documentFolderModal;
    if (!activeChannel || !this.hasFileWorkspace(activeChannel)) return;
    if (!modal.name.trim()) {
      this.documentFolderModal = { ...modal, error: 'Folder name is required.' };
      return;
    }
    this.documentFolderModal = { ...modal, saving: true, error: '' };
    const payload = {
      name: modal.name.trim(),
      description: modal.description.trim(),
      parentFolderId: modal.parentFolderId,
      createdBy: this.me.userId,
    };
    const request =
      modal.mode === 'create'
        ? this.collabService.createDocumentFolder(activeChannel.backendId, payload)
        : this.collabService.updateDocumentFolder(activeChannel.backendId, Number(modal.folderId), payload);
    request.subscribe({
      next: () => {
        this.closeDocumentFolderModal();
        this.loadDocumentLibrary(activeChannel, this.activeDocumentFolderId);
      },
      error: () => {
        this.documentFolderModal = {
          ...this.documentFolderModal,
          saving: false,
          error: modal.mode === 'create' ? 'Failed to create folder.' : 'Failed to update folder.',
        };
        this.cdr.detectChanges();
      },
    });
  }

  renameDocumentFolder(folder: CollabDocumentFolder, event?: Event): void {
    this.openEditDocumentFolderModal(folder, event);
  }

  deleteDocumentFolder(folder: CollabDocumentFolder, event?: Event): void {
    event?.stopPropagation();
    const activeChannel = this.activeChannel;
    if (!activeChannel || !this.hasFileWorkspace(activeChannel)) {
      return;
    }
    if (!confirm(`Delete folder "${folder.name}"? This only works if it is empty.`)) {
      return;
    }
    this.collabService.deleteDocumentFolder(activeChannel.backendId, folder.id).subscribe({
      next: () => {
        const fallbackFolderId =
          Number(this.activeDocumentFolderId) === Number(folder.id)
            ? folder.parentFolderId ?? null
            : this.activeDocumentFolderId;
        this.loadDocumentLibrary(activeChannel, fallbackFolderId);
      },
      error: () => {
        this.documentLibraryError = 'Failed to delete folder. Ensure it has no subfolders or documents.';
        this.cdr.detectChanges();
      },
    });
  }

  uploadDocumentFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    const activeChannel = this.activeChannel;
    if (!files.length || !activeChannel || !this.hasFileWorkspace(activeChannel)) {
      if (input) input.value = '';
      return;
    }
    this.documentLibraryLoading = true;
    Promise.all(
      files.map((file) =>
        firstValueFrom(
          this.collabService.uploadChannelDocument(
            activeChannel.backendId,
            this.me.userId,
            file,
            this.activeDocumentFolderId,
          ),
        ).catch(() => null),
      ),
    ).finally(() => {
      input.value = '';
      this.loadDocumentLibrary(activeChannel, this.activeDocumentFolderId);
    });
  }

  selectChannel(id: string, switchWorkspace = false): void {
    if (this.activeView === 'channel' && this.activeChannelId === id) {
      this.workspaceMode = 'chat';
      this.messagesLoading = false;
      this.showChannelDetails = false;
      this.showPinnedPanel = false;
      this.showSearch = false;
      const activeChannel = this.channels.find((channel) => channel.id === id);
      if (activeChannel && this.hasFileWorkspace(activeChannel)) {
        this.channelWorkspacePane = 'files';
        this.loadDocumentLibrary(activeChannel, this.activeDocumentFolderId);
        this.cdr.detectChanges();
        return;
      }
      if (activeChannel?.unreadCount) {
        activeChannel.hasUnread = false;
        activeChannel.unreadCount = undefined;
        this.channels = [...this.channels];
        this.syncHeaderState();
        if (this.lastMessageBackendId) {
          this.collabService
            .markRead(activeChannel.backendId, this.lastMessageBackendId)
            .subscribe({ error: () => {} });
        }
      }
      this.scrollToLatestMessageSoon();
      this.cdr.detectChanges();
      return;
    }
    this.cancelEdit();
    this.confirmDeleteId = null;
    this.conversationAccessMessage = '';
    this.workspaceMode = 'chat';
    this.showChannelDetails = false;
    this.preserveFeedScrollOffset = null;
    this.activeChannelId = id;
    this.activeView = 'channel';
    this.activeDmId = '';
    this.activeThreadId = null;
    this.activeThreadReplyToId = null;
    this.showPinnedPanel = false;
    this.showSearch = false;
    const ch = this.channels.find((c) => c.id === id);
    if (ch) {
      this.channelWorkspacePane = this.hasFileWorkspace(ch) ? 'files' : 'chat';
      if (this.hasFileWorkspace(ch)) {
        this.resetDocumentLibraryState();
        this.loadDocumentLibrary(ch);
      }
      if (this.isDocumentLibraryChannel(ch)) {
        this.cdr.detectChanges();
        return;
      }
      this.presenceChannelId = ch.backendId;
      if (
        this.channelMessages[id] !== undefined &&
        !this.hasRecoverableSnapshotFailure(ch.backendId)
      ) {
        this.messagesLoading = false;
        this.conversationAccessMessage = '';
        this.subscribeToChannel(ch.backendId);
        if (this.isViewingChannel(ch.id) && this.lastMessageBackendId) {
          ch.hasUnread = false;
          ch.unreadCount = undefined;
          this.channels = [...this.channels];
          this.syncHeaderState();
          this.collabService
            .markRead(ch.backendId, this.lastMessageBackendId)
            .subscribe({ error: () => {} });
        }
        this.collabService
          .setPresenceOnline(ch.backendId)
          .subscribe({ error: () => {} });
        this.startConversationSync();
        this.scrollToLatestMessageSoon();
        this.cdr.detectChanges();
        this.focusMessageComposerSoon();
      } else {
        this.channelSnapshotFailureUntil.delete(ch.backendId);
        this.channelSnapshotConsecutiveFailures.delete(ch.backendId);
        this.channelSnapshotLastErrorStatus.delete(ch.backendId);
        this.channelSnapshotLastErrorMessage.delete(ch.backendId);
        this.historyPagingArmed = false;
        this.loadChannelMessages(ch);
        this.focusMessageComposerSoon();
      }
    }
  }

  selectDm(contactId: string, switchWorkspace = false): void {
    if (this.activeView === 'dm' && this.activeDmId === contactId) {
      this.workspaceMode = 'chat';
      this.messagesLoading = false;
      this.showChannelDetails = false;
      this.showPinnedPanel = false;
      this.showSearch = false;
      const activeContact = this.dmContacts.find((contact) => contact.id === contactId);
      if (activeContact?.unreadCount) {
        activeContact.hasUnread = false;
        activeContact.unreadCount = undefined;
        this.dmContacts = [...this.dmContacts];
        this.syncHeaderState();
        if (activeContact.dmChannelId && this.lastMessageBackendId) {
          this.collabService
            .markRead(activeContact.dmChannelId, this.lastMessageBackendId)
            .subscribe({ error: () => {} });
        }
      }
      this.scrollToLatestMessageSoon();
      this.cdr.detectChanges();
      return;
    }
    this.cancelEdit();
    this.confirmDeleteId = null;
    this.conversationAccessMessage = '';
    this.workspaceMode = 'chat';
    this.activeDmId = contactId;
    this.activeView = 'dm';
    this.activeChannelId = '';
    this.activeThreadId = null;
    this.activeThreadReplyToId = null;
    this.showPinnedPanel = false;
    this.showSearch = false;
    this.showChannelDetails = false;
    this.preserveFeedScrollOffset = null;
    const contact = this.dmContacts.find((d) => d.id === contactId);
    if (!contact) return;
    if (
      contact.dmChannelId &&
      this.dmMessages[contact.id] !== undefined &&
      !this.hasRecoverableSnapshotFailure(contact.dmChannelId)
    ) {
      this.messagesLoading = false;
      this.conversationAccessMessage = '';
      this.subscribeToDmContactChannels(contact);
      if (this.isViewingDm(contact.id) && this.lastMessageBackendId) {
        contact.hasUnread = false;
        contact.unreadCount = undefined;
        this.dmContacts = [...this.dmContacts];
        this.syncHeaderState();
        this.collabService
          .markRead(contact.dmChannelId, this.lastMessageBackendId)
          .subscribe({ error: () => {} });
      }
      this.startConversationSync();
      this.scrollToLatestMessageSoon();
      this.cdr.detectChanges();
      this.focusMessageComposerSoon();
      return;
    }
    this.messagesLoading = true;
    this.scrollToLatestMessageSoon();
    this.startConversationSync();
    this.cdr.detectChanges();
    this.historyPagingArmed = false;
    this.getOrCreateDmChannel(contact);
    this.focusMessageComposerSoon();
  }

  setView(v: 'threads'): void {
    this.workspaceMode = 'chat';
    this.conversationAccessMessage = '';
    this.activeView = v;
    this.stopConversationSync();
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

  private expectedDmChannelName(contact: DmContact): string {
    const meId = this.me.userId;
    const themId = contact.userId;
    return `dm-${Math.min(meId, themId)}-${Math.max(meId, themId)}`;
  }

  private getOrCreateDmChannel(contact: DmContact, onReady?: (channelId: number) => void): void {
    if (contact.dmChannelId) {
      const preferredChannelId = this.findBestDmChannelId(contact);
      const cachedChannelId = Number(
        preferredChannelId || contact.dmChannelId,
      );
      contact.dmChannelId = cachedChannelId;
      contact.dmChannelIds = this.dmChannelIdsFor(contact).length
        ? this.dmChannelIdsFor(contact)
        : [cachedChannelId];
      this.subscribeToDmContactChannels(contact);
      if (
        this.dmMessages[contact.id] !== undefined &&
        !this.hasRecoverableSnapshotFailure(cachedChannelId)
      ) {
        this.messagesLoading = false;
      } else {
        this.channelSnapshotFailureUntil.delete(cachedChannelId);
        this.channelSnapshotConsecutiveFailures.delete(cachedChannelId);
        this.channelSnapshotLastErrorStatus.delete(cachedChannelId);
        this.channelSnapshotLastErrorMessage.delete(cachedChannelId);
        this.loadDmMessages(contact, cachedChannelId);
      }
      onReady?.(cachedChannelId);
      return;
    }
    const meId = this.me.userId,
      themId = contact.userId;
    const tryExisting = (all: CollabChannel[]): boolean => {
      const chId = this.resolveExistingDmChannel(contact, all);
      if (!chId) return false;
      this.subscribeToDmContactChannels(contact);
      if (
        this.dmMessages[contact.id] !== undefined &&
        !this.hasRecoverableSnapshotFailure(chId)
      ) {
        this.messagesLoading = false;
      } else {
        this.channelSnapshotFailureUntil.delete(chId);
        this.channelSnapshotLastErrorStatus.delete(chId);
        this.channelSnapshotLastErrorMessage.delete(chId);
        this.loadDmMessages(contact, chId);
      }
      onReady?.(chId);
      return true;
    };

    if (this.cachedCollabChannels.length && tryExisting(this.cachedCollabChannels)) {
      return;
    }

    this.collabService.getChannels().subscribe({
      next: (all) => {
        this.cachedCollabChannels = all || [];
        this.mapDirectMessageChannels(this.cachedCollabChannels);
        if (contact.dmChannelId) {
          const chId = Number(contact.dmChannelId);
          this.subscribeToDmContactChannels(contact);
          if (
            this.dmMessages[contact.id] !== undefined &&
            !this.hasRecoverableSnapshotFailure(chId)
          ) {
            this.messagesLoading = false;
          } else {
            this.channelSnapshotFailureUntil.delete(chId);
            this.channelSnapshotLastErrorStatus.delete(chId);
            this.channelSnapshotLastErrorMessage.delete(chId);
            this.loadDmMessages(contact, chId);
          }
          onReady?.(chId);
          return;
        }
        if (tryExisting(this.cachedCollabChannels)) {
          return;
        }
        this.createDirectMessageChannel(contact, meId, themId, onReady);
      },
      error: () => {
        this.collabService.getHomeChannels().subscribe({
          next: (home) => {
            this.cachedCollabChannels = home?.channels || [];
            this.mapDirectMessageChannels(this.cachedCollabChannels);
            if (tryExisting(this.cachedCollabChannels)) {
              return;
            }
            this.createDirectMessageChannel(contact, meId, themId, onReady);
          },
          error: () => {
            this.messagesLoading = false;
            this.conversationAccessMessage =
              'Unable to verify this direct conversation right now. Please retry.';
            this.cdr.detectChanges();
          },
        });
      },
    });
  }

  private createDirectMessageChannel(
    contact: DmContact,
    meId: number,
    themId: number,
    onReady?: (channelId: number) => void,
  ): void {
    this.collabService
      .createChannel({
        name: this.expectedDmChannelName(contact),
        description: `DM between ${meId} and ${themId}`,
        channelType: 'PRIVATE',
        createdBy: meId,
      })
      .subscribe({
        next: (created) => {
          const chId = Number(created.channelId ?? created.id);
          contact.dmChannelId = chId;
          contact.dmChannelIds = [chId];
          this.collabService
            .addChannelMember(chId, themId)
            .subscribe({ error: () => {} });
          this.loadDmMessages(contact, chId);
          this.subscribeToDmContactChannels(contact);
          onReady?.(chId);
        },
      error: () => {
        this.messagesLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private loadDmMessages(contact: DmContact, channelId: number): void {
    const hadExistingMessages = this.dmMessages[contact.id] !== undefined;
    const existingMessages = [...(this.dmMessages[contact.id] || [])];
    this.historyPagingArmed = false;
    this.messagesLoading = true;
    this.conversationAccessMessage = '';
    this.cdr.detectChanges();
    this.getChannelSnapshotWithFallback(
      channelId,
      this.currentHistoryLimit(channelId),
    ).then((snap) => {
      if (!snap) {
        const status = this.channelSnapshotLastErrorStatus.get(channelId) || 0;
        if (status === 403) {
          void this.handleForbiddenDmSnapshot(contact, channelId);
          return;
        }
        const alternateChannelId =
          status >= 500 || status === 0
            ? this.findAlternateDmChannelId(contact, channelId)
            : null;
        if (alternateChannelId) {
          contact.dmChannelId = alternateChannelId;
          contact.dmChannelIds = this.prioritizeDmChannelIds(
            contact,
            alternateChannelId,
          );
          this.channelHistoryLimit.set(
            alternateChannelId,
            this.currentHistoryLimit(channelId),
          );
          this.channelSnapshotFailureUntil.delete(alternateChannelId);
          this.channelSnapshotLastErrorStatus.delete(alternateChannelId);
          this.channelSnapshotLastErrorMessage.delete(alternateChannelId);
          this.subscribeToDmContactChannels(contact);
          this.loadDmMessages(contact, alternateChannelId);
          return;
        }
        if (contact.id === this.activeDmId && this.activeView === 'dm') {
          this.messagesLoading = false;
        }
        this.lastMessageBackendId = null;
        this.readStateMap = {};
        this.cdr.detectChanges();
        return;
      }
        this.conversationAccessMessage = '';
        this.dmMembershipRepairAttempted.delete(this.dmMembershipRepairKey(contact, channelId));
        this.messagesLoading = false;
        this.lastMessageBackendId = null;
        this.readStateMap = {};
        if (!snap.messages?.length) {
          this.dmMessages[contact.id] = [];
          if (contact.id === this.activeDmId && (contact.lastMessagePreview || contact.hasUnread)) {
            setTimeout(() => {
              if (contact.id === this.activeDmId) {
                this.fetchAndReconcileDm(contact, channelId);
              }
            }, 700);
          }
          this.cdr.detectChanges();
          return;
        }
        const senderIds = [
          ...new Set(snap.messages.map((m) => m.senderUserId)),
        ];
        this.loadUserDirectory(senderIds, () => {
          this.loadMemberAvatars(senderIds);
          const renderedMessages = this.buildMessageList(
            snap.messages,
            snap.reactions || [],
            snap.attachments || [],
          );
          this.dmMessages[contact.id] = this.mergeRenderedMessagesWithPending(
            renderedMessages,
            existingMessages,
          );
          this.hydrateMessageAttachments(this.dmMessages[contact.id]);
          this.updateDmConversationMeta(contact, this.dmMessages[contact.id]);
          this.buildReadStateMap(snap.messages, snap.readStates || []);
          this.lastMessageBackendId = snap.messages[snap.messages.length - 1].id;
          if (this.lastMessageBackendId && this.isViewingDm(contact.id)) {
            this.collabService
              .markRead(channelId, this.lastMessageBackendId)
              .subscribe({ error: () => {} });
          }
          if (this.isViewingDm(contact.id)) {
            contact.hasUnread = false;
            contact.unreadCount = undefined;
            this.dmContacts = [...this.dmContacts];
            this.syncHeaderState();
          }
          if (!hadExistingMessages) {
            this.scrollFeed = true;
          }
          this.cdr.detectChanges();
          if (!hadExistingMessages) {
            this.scrollToLatestMessageSoon();
          }
          this.consumePendingNotificationHighlight(this.dmMessages[contact.id]);
        });
    });
  }

  // ── Messages (channel) ────────────────────────────────

  private loadChannelMessages(channel: Channel): void {
    if (!channel.backendId) return;
    const existingMessages = [...(this.channelMessages[channel.id] || [])];
    this.historyPagingArmed = false;
    this.messagesLoading = true;
    this.cdr.detectChanges();
    this.getChannelSnapshotWithFallback(
      channel.backendId,
      this.currentHistoryLimit(channel.backendId),
    ).then((snap) => {
      if (!snap) {
        const status = this.channelSnapshotLastErrorStatus.get(channel.backendId) || 0;
        this.lastMessageBackendId = null;
        this.readStateMap = {};
        if (status === 403 && this.activeView === 'channel' && this.activeChannelId === channel.id) {
          this.messagesLoading = false;
        }
        this.cdr.detectChanges();
        return;
      }
        this.conversationAccessMessage = '';
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
          const renderedMessages = this.buildMessageList(
            snap.messages,
            snap.reactions || [],
            snap.attachments || [],
          );
          this.channelMessages[channel.id] = this.mergeRenderedMessagesWithPending(
            renderedMessages,
            existingMessages,
          );
          this.hydrateMessageAttachments(this.channelMessages[channel.id]);
          this.lastMessageBackendId = snap.messages[snap.messages.length - 1].id;
          this.buildReadStateMap(snap.messages, snap.readStates || []);
          this.applyReadStateToMessages(this.channelMessages[channel.id]);
          if (this.lastMessageBackendId && this.isViewingChannel(channel.id))
            this.collabService
              .markRead(channel.backendId, this.lastMessageBackendId)
              .subscribe({ error: () => {} });
          this.collabService
            .setPresenceOnline(channel.backendId)
            .subscribe({ error: () => {} });
          this.presenceChannelId = channel.backendId;
          this.pollChannelPresence(channel.backendId);
          if (this.isViewingChannel(channel.id)) {
            channel.hasUnread = false;
            channel.unreadCount = undefined;
            this.channels = [...this.channels];
            this.syncHeaderState();
          }
          this.subscribeToChannel(channel.backendId);
          this.scrollFeed = true;
          this.cdr.detectChanges();
          this.scrollToLatestMessageSoon();
          this.consumePendingNotificationHighlight(this.channelMessages[channel.id]);
        });
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
    const LIKE_CODES = ['LIKE', 'LOVE', 'THUMBS_UP', 'LAUGH', 'CELEBRATE', 'FIRE'];
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

    const attMap = new Map<number, any[]>();
    for (const a of attachments) {
      if (!a.messageId) continue;
      const bucket = attMap.get(a.messageId) ?? [];
      bucket.push(a);
      attMap.set(a.messageId, bucket);
    }

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
      const attList = attMap.get(m.id) || [];
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
        messageType: m.messageType,
        deliveryState:
          Number(m.senderUserId) === Number(this.me.userId)
            ? 'DELIVERED'
            : undefined,
      };
      if (attList.length) {
        const mappedAttachments = attList.map((att) => ({
          name: att.fileName || att.originalFileName || att.name || 'Attachment',
          size: att.fileSize ? formatFileSize(att.fileSize) : '',
          type: this.normalizeAttachmentType(
            att.contentType,
            att.fileName || att.originalFileName || att.name || att.downloadUrl,
          ),
          downloadUrl: att.downloadUrl,
          previewUrl: this.resolveAttachmentPreviewUrl(att),
        }));
        msg.attachments = mappedAttachments;
        msg.attachment = mappedAttachments[0];
      }
      return msg;
    };

    return roots.map((r) => toLocal(r));
  }

  private hydrateMessageAttachments(messages: Message[], attempt = 0): void {
    const queue: Message[] = [];
    const collect = (items: Message[]) => {
      for (const item of items || []) {
        if (item.backendId && !item.attachments?.length && !item.attachment) {
          queue.push(item);
        }
        if (item.replies?.length) {
          collect(item.replies);
        }
      }
    };
    collect(messages);

    for (const message of queue) {
      const backendId = Number(message.backendId || 0);
      if (
        !backendId ||
        this.hydratedMessageAttachmentIds.has(backendId) ||
        this.messageAttachmentHydrationInFlight.has(backendId)
      ) {
        continue;
      }
      this.messageAttachmentHydrationInFlight.add(backendId);
      this.collabService.getAttachmentsForMessage(backendId).subscribe({
        next: (attachments) => {
          this.messageAttachmentHydrationInFlight.delete(backendId);
          if (!attachments?.length) {
            if (attempt < 2) {
              setTimeout(() => this.hydrateMessageAttachments(messages, attempt + 1), 900);
            }
            return;
          }
          this.hydratedMessageAttachmentIds.add(backendId);
          const mappedAttachments = attachments.map((att) => ({
            name: att.fileName || 'Attachment',
            size: att.fileSize ? formatFileSize(att.fileSize) : '',
            type: this.normalizeAttachmentType(
              att.contentType,
              att.fileName || att.downloadUrl,
            ),
            downloadUrl: att.downloadUrl,
            previewUrl: this.resolveAttachmentPreviewUrl(att),
          }));
          message.attachments = mappedAttachments;
          message.attachment = mappedAttachments[0];
          if (this.selectedThreadMsg?.backendId === backendId) {
            this.selectedThreadMsg = {
              ...this.selectedThreadMsg,
              attachments: mappedAttachments,
              attachment: mappedAttachments[0],
            };
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.messageAttachmentHydrationInFlight.delete(backendId);
        },
      });
    }
  }

  private mergeRenderedMessagesWithPending(
    rendered: Message[],
    existing: Message[],
  ): Message[] {
    const next = [...rendered];

    const attachPending = (pending: Message): void => {
      if (pending.backendId) return;

      if (pending.replyToMessageId) {
        const parent = this.findMsgByBackendId(next, pending.replyToMessageId);
        if (parent) {
          const replyExists = parent.replies.some(
            (reply) => reply.id === pending.id,
          );
          if (!replyExists) {
            parent.replies = [...parent.replies, pending];
          }
          return;
        }
      }

      const rootExists = next.some((message) => message.id === pending.id);
      if (!rootExists) {
        next.push(pending);
      }
    };

    const walk = (items: Message[]) => {
      for (const item of items || []) {
        attachPending(item);
        if (item.replies?.length) {
          walk(item.replies);
        }
      }
    };

    walk(existing);
    return next;
  }

  private buildAndRenderMessages(
    channel: Channel,
    messages: CollabMessage[],
    reactions: any[],
    attachments: any[],
    readStates: any[] = [],
    preserveScrollPosition = false,
  ): void {
    if (messages.length)
      this.lastMessageBackendId = messages[messages.length - 1].id;
    this.channelMessages[channel.id] = this.buildMessageList(
      messages,
      reactions,
      attachments,
    );
    this.hydrateMessageAttachments(this.channelMessages[channel.id]);

    this.buildReadStateMap(messages, readStates);
    this.applyReadStateToMessages(this.channelMessages[channel.id]);

    if (this.lastMessageBackendId && this.isViewingChannel(channel.id))
      this.collabService
        .markRead(channel.backendId, this.lastMessageBackendId)
        .subscribe({ error: () => {} });
    this.collabService
      .setPresenceOnline(channel.backendId)
      .subscribe({ error: () => {} });
    this.presenceChannelId = channel.backendId;
    this.pollChannelPresence(channel.backendId);
    if (this.isViewingChannel(channel.id)) {
      channel.hasUnread = false;
      channel.unreadCount = undefined;
      this.syncHeaderState();
    }
    this.subscribeToChannel(channel.backendId);
    this.scrollFeed = !preserveScrollPosition;
    this.cdr.detectChanges();
    this.consumePendingNotificationHighlight(this.channelMessages[channel.id]);
  }

  private consumePendingNotificationHighlight(messages: Message[]): void {
    if (!this.pendingNotificationMessageBackendId) {
      return;
    }
    const target = this.findMsgByBackendId(messages, this.pendingNotificationMessageBackendId);
    if (!target) {
      return;
    }
    this.pendingNotificationMessageBackendId = null;
    this.flashId = target.id;
    clearTimeout(this.flashTimer);
    setTimeout(() => {
      const el = document.getElementById('msg-' + target.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      this.cdr.detectChanges();
    }, 180);
    this.flashTimer = setTimeout(() => {
      this.flashId = null;
      this.cdr.detectChanges();
    }, 2000);
  }

  private findMsgByBackendId(messages: Message[], backendId: number): Message | null {
    for (const message of messages || []) {
      if (Number(message.backendId) === Number(backendId)) {
        return message;
      }
      const child = this.findMsgByBackendId(message.replies || [], backendId);
      if (child) {
        return child;
      }
    }
    return null;
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
    if (this.presencePollTimer) {
      return;
    }
    this.presencePollTimer = setInterval(() => {
      this.collabService.getAllPresence().subscribe({
        next: (list: any[]) => {
          const byUser = new Map<number, any>();
          for (const p of list || []) {
            const prev = byUser.get(Number(p.userId));
            if (!prev || (p.updatedAt || '') >= (prev.updatedAt || ''))
              byUser.set(Number(p.userId), p);
          }
          this.applyPresenceEntries(Array.from(byUser.values()));
          this.syncDmOnlineStatus();
          this.cdr.detectChanges();
        },
        error: () => {},
      });
      if (this.presenceChannelId)
        this.pollChannelPresence(this.presenceChannelId);
    }, 15_000);
  }

  private stopPresencePolling(): void {
    if (this.presencePollTimer) {
      clearInterval(this.presencePollTimer);
      this.presencePollTimer = null;
    }
  }

  private startConversationSync(): void {
    if (this.conversationSyncTimer) {
      return;
    }
    this.conversationSyncTimer = setInterval(() => {
      this.syncActiveConversationState();
    }, 5000);
  }

  private stopConversationSync(): void {
    if (this.conversationSyncTimer) {
      clearInterval(this.conversationSyncTimer);
      this.conversationSyncTimer = null;
    }
  }

  private syncActiveConversationState(): void {
    if (this.workspaceMode !== 'chat') {
      return;
    }
    if (!this.shouldPollActiveConversationSnapshot()) {
      return;
    }
    if (this.activeView === 'channel' && this.activeChannel) {
      this.fetchAndReconcileChannel(this.activeChannel);
      return;
    }
    if (this.activeView === 'dm' && this.activeDmContact?.dmChannelId) {
      this.fetchAndReconcileDm(
        this.activeDmContact,
        this.activeDmContact.dmChannelId,
      );
    }
  }

  private shouldPollActiveConversationSnapshot(): boolean {
    if (!this.wsConnected) {
      return false;
    }
    if (this.activeView === 'channel' && this.activeChannel) {
      const failures = this.channelSnapshotConsecutiveFailures.get(this.activeChannel.backendId) || 0;
      if (failures >= this.SNAPSHOT_POLL_MAX_FAILURES) {
        return false;
      }
      if (
        this.hasRecoverableSnapshotFailure(this.activeChannel.backendId) ||
        this.channelMessages[this.activeChannel.id] === undefined
      ) {
        return true;
      }
      return false;
    }
    if (this.activeView === 'dm' && this.activeDmContact?.dmChannelId) {
      const failures = this.channelSnapshotConsecutiveFailures.get(this.activeDmContact.dmChannelId) || 0;
      if (failures >= this.SNAPSHOT_POLL_MAX_FAILURES) {
        return false;
      }
      if (
        this.hasRecoverableSnapshotFailure(this.activeDmContact.dmChannelId) ||
        this.dmMessages[this.activeDmId] === undefined
      ) {
        return true;
      }
      return false;
    }
    return false;
  }

  private ensureChatBootstrap(): void {
    this.chatResourcesLoaded = true;
    this.startPresencePoll();
    this.connectWebSocket();
  }

  private pollChannelPresence(channelId: number): void {
    this.collabService.getChannelPresence(channelId).subscribe({
      next: (list: any[]) => {
        this.applyPresenceEntries(list || []);
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

  private applyPresenceEntries(entries: any[]): void {
    for (const p of entries || []) {
      if (p?.userId == null) continue;
      const userId = Number(p.userId);
      this.presenceMap[userId] = p.presenceStatus || 'OFFLINE';
      this.typingMap[userId] = Boolean(p.typing);
      if (p.updatedAt) {
        this.presenceUpdatedAtMap[userId] = String(p.updatedAt);
      }
    }
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

  private shouldDisableTypingEndpoint(err: any): boolean {
    const status = Number(err?.status || 0);
    return status === 0 || status === 502 || status === 503 || status === 504;
  }

  onComposerTyping(): void {
    if (this.typingEndpointBlocked) return;
    const chId =
      this.activeView === 'channel'
        ? this.activeChannel?.backendId
        : this.activeDmContact?.dmChannelId;
    if (!chId) return;
    clearTimeout(this.typingTimer);
    this.collabService.setTyping(chId, true).subscribe({
      error: (err) => {
        if (this.shouldDisableTypingEndpoint(err)) {
          this.typingEndpointBlocked = true;
        }
      },
    });
    this.typingTimer = setTimeout(() => {
      if (this.typingEndpointBlocked) return;
      this.collabService.setTyping(chId, false).subscribe({
        error: (err) => {
          if (this.shouldDisableTypingEndpoint(err)) {
            this.typingEndpointBlocked = true;
          }
        },
      });
    }, 2000);
  }

  playNotificationSound(urgent = false): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.ensureNotificationAudioContext();
      if (!ctx) return;
      if (typeof ctx.resume === 'function' && ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }

      if (this.selectedRingtone === 'telephone' && !urgent) {
        this.playTelephoneRingSound(ctx);
        this.triggerMobileHaptics(urgent);
        return;
      }

      if (this.selectedRingtone === 'nokia' && !urgent) {
        this.playNokiaRingSound(ctx);
        this.triggerMobileHaptics(urgent);
        return;
      }

      if (this.selectedRingtone === 'doorbell' && !urgent) {
        this.playDoorbellSound(ctx);
        this.triggerMobileHaptics(urgent);
        return;
      }

      const peakGain = urgent ? 0.42 : 0.24;
      const tones =
        urgent
          ? [
              { type: 'triangle' as OscillatorType, frequency: 880, start: 0, stop: 0.16 },
              { type: 'sine' as OscillatorType, frequency: 1174, start: 0.2, stop: 0.38 },
              { type: 'triangle' as OscillatorType, frequency: 988, start: 0.46, stop: 0.78 },
            ]
          : this.selectedRingtone === 'crystal'
          ? [
              { type: 'sine' as OscillatorType, frequency: 1046, start: 0, stop: 0.18 },
              { type: 'triangle' as OscillatorType, frequency: 1318, start: 0.05, stop: 0.32 },
            ]
          : this.selectedRingtone === 'pulse'
            ? [
                { type: 'square' as OscillatorType, frequency: 620, start: 0, stop: 0.12 },
                { type: 'square' as OscillatorType, frequency: 620, start: 0.16, stop: 0.28 },
                { type: 'triangle' as OscillatorType, frequency: 880, start: 0.31, stop: 0.46 },
              ]
            : this.selectedRingtone === 'soft'
              ? [
                  { type: 'sine' as OscillatorType, frequency: 660, start: 0, stop: 0.22 },
                  { type: 'sine' as OscillatorType, frequency: 784, start: 0.08, stop: 0.3 },
                ]
              : [
                  { type: 'triangle' as OscillatorType, frequency: 740, start: 0, stop: 0.28 },
                  { type: 'sine' as OscillatorType, frequency: 988, start: 0.03, stop: 0.22 },
                ];

      // Find the natural duration of one ring (max stop time of all tones)
      const oneDuration = tones.reduce((max, t) => Math.max(max, t.stop), 0);
      const ringGap = 0.12;
      const ringOffsets = urgent ? [0] : [0, oneDuration + ringGap, (oneDuration + ringGap) * 2];

      ringOffsets.forEach((ringOffset) => {
        const master = ctx.createGain();
        master.gain.setValueAtTime(0.0001, ctx.currentTime + ringOffset);
        master.gain.exponentialRampToValueAtTime(peakGain, ctx.currentTime + ringOffset + 0.02);
        master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ringOffset + oneDuration);
        master.connect(ctx.destination);
        tones.forEach((tone) => {
          const oscillator = ctx.createOscillator();
          oscillator.type = tone.type;
          oscillator.frequency.setValueAtTime(tone.frequency, ctx.currentTime + ringOffset + tone.start);
          oscillator.connect(master);
          oscillator.start(ctx.currentTime + ringOffset + tone.start);
          oscillator.stop(ctx.currentTime + ringOffset + tone.stop);
        });
      });
      this.triggerMobileHaptics(urgent);
    } catch (_) {}
  }

  private playTelephoneRingSound(ctx: AudioContext): void {
    // Classic old rotary-telephone ring: two "brring" bursts ~0.6s apart.
    // Each burst is a sawtooth + triangle carrier at 1350/2700 Hz, amplitude-
    // trilled at 20 Hz by scheduling 9 gain peaks in 420ms — the same effect
    // a mechanical ringer produces by hammering a bell 20 times per second.
    const ringBurst = (startTime: number): void => {
      const duration = 0.42;
      const trillHz = 20;
      const period = 1 / trillHz;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, startTime);
      masterGain.connect(ctx.destination);

      // Schedule the 20 Hz trill envelope
      const cycles = Math.floor(duration / period);
      for (let i = 0; i < cycles; i++) {
        const peak = startTime + i * period + period * 0.25;
        const valley = startTime + i * period + period * 0.75;
        masterGain.gain.linearRampToValueAtTime(0.36, peak);
        masterGain.gain.linearRampToValueAtTime(0.03, valley);
      }
      masterGain.gain.linearRampToValueAtTime(0, startTime + duration);

      // Two partials for the bell timbre
      ([
        { freq: 1350, type: 'sawtooth' as OscillatorType },
        { freq: 2700, type: 'triangle' as OscillatorType },
      ] as { freq: number; type: OscillatorType }[]).forEach(({ freq, type }) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    };

    const t = ctx.currentTime;
    ringBurst(t);         // brring
    ringBurst(t + 0.60);  // brring  ← ring 1 pair (0.18s gap within pair)
    ringBurst(t + 1.34);  // brring
    ringBurst(t + 1.94);  // brring  ← ring 2 pair (0.60s pause between pairs)
    ringBurst(t + 2.68);  // brring
    ringBurst(t + 3.28);  // brring  ← ring 3 pair
  }

  private playNokiaRingSound(ctx: AudioContext): void {
    // Nokia Gran Vals excerpt — the iconic 3310 ringtone.
    // RTTTL: Nokia:d=4,o=5,b=225:8e5,8d5,4f#4,4g#4,8c#5,8b4,4d4,4e4,8b4,8a4,4c#4,4e4,a4
    const bpm = 225;
    const q = 60 / bpm;       // quarter-note duration in seconds
    const e = q / 2;           // eighth-note duration

    const notes: { freq: number; dur: number }[] = [
      { freq: 659.25, dur: e },   // E5
      { freq: 587.33, dur: e },   // D5
      { freq: 369.99, dur: q },   // F#4
      { freq: 415.30, dur: q },   // G#4
      { freq: 554.37, dur: e },   // C#5
      { freq: 493.88, dur: e },   // B4
      { freq: 293.66, dur: q },   // D4
      { freq: 329.63, dur: q },   // E4
      { freq: 493.88, dur: e },   // B4
      { freq: 440.00, dur: e },   // A4
      { freq: 277.18, dur: q },   // C#4
      { freq: 329.63, dur: q },   // E4
      { freq: 440.00, dur: q },   // A4 (final note)
    ];

    let t = ctx.currentTime;
    notes.forEach(({ freq, dur }) => {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.28, t + 0.012);
      gain.gain.setValueAtTime(0.28, t + dur * 0.82);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + dur);

      t += dur;
    });
  }

  private playDoorbellSound(ctx: AudioContext): void {
    const ringOffsets = [0, 0.85, 1.70];
    ringOffsets.forEach((offset) => {
      const dingGain = ctx.createGain();
      dingGain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      dingGain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + offset + 0.02);
      dingGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.5);
      dingGain.connect(ctx.destination);
      const ding = ctx.createOscillator();
      ding.type = 'sine';
      ding.frequency.setValueAtTime(880, ctx.currentTime + offset);
      ding.connect(dingGain);
      ding.start(ctx.currentTime + offset);
      ding.stop(ctx.currentTime + offset + 0.5);

      const dongGain = ctx.createGain();
      dongGain.gain.setValueAtTime(0.0001, ctx.currentTime + offset + 0.28);
      dongGain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + offset + 0.30);
      dongGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.78);
      dongGain.connect(ctx.destination);
      const dong = ctx.createOscillator();
      dong.type = 'sine';
      dong.frequency.setValueAtTime(698, ctx.currentTime + offset + 0.28);
      dong.connect(dongGain);
      dong.start(ctx.currentTime + offset + 0.28);
      dong.stop(ctx.currentTime + offset + 0.78);
    });
  }

  private ensureNotificationAudioContext(): AudioContext | null {
    try {
      if (this.notificationAudioContext) {
        return this.notificationAudioContext;
      }
      const AudioCtxCtor =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxCtor) return null;
      this.notificationAudioContext = new AudioCtxCtor();
      return this.notificationAudioContext;
    } catch (_) {
      return null;
    }
  }

  private primeNotificationAudio = (): void => {
    if (this.audioPrimed) return;
    const ctx = this.ensureNotificationAudioContext();
    if (!ctx) return;
    this.audioPrimed = true;
    try {
      if (typeof ctx.resume === 'function' && ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.00001, ctx.currentTime);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.01);
    } catch (_) {}
  };

  private shouldUseUrgentNotificationSound(): boolean {
    return (
      typeof document !== 'undefined' &&
      (document.visibilityState !== 'visible' || !document.hasFocus())
    );
  }

  private isChatSurfaceVisible(): boolean {
    return (
      this.workspaceMode === 'chat' &&
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible' &&
      document.hasFocus()
    );
  }

  private isViewingChannel(channelId: string): boolean {
    return (
      this.isChatSurfaceVisible() &&
      this.activeView === 'channel' &&
      this.activeChannelId === channelId
    );
  }

  private isViewingDm(contactId: string): boolean {
    return (
      this.isChatSurfaceVisible() &&
      this.activeView === 'dm' &&
      this.activeDmId === contactId
    );
  }

  private requestBrowserNotificationPermission(): void {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  private triggerMobileHaptics(urgent = false): void {
    try {
      if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
        return;
      }
      navigator.vibrate(urgent ? [220, 120, 260] : [140, 70, 140]);
    } catch (_) {}
  }

  private showBrowserNotification(
    title: string,
    body: string,
    options: { tag?: string; icon?: string; target?: any } = {},
  ): void {
    if (typeof Notification === 'undefined') {
      this.triggerMobileHaptics(true);
      return;
    }
    if (Notification.permission !== 'granted') {
      this.triggerMobileHaptics(true);
      return;
    }
    if (!this.isMobileViewport() && document.visibilityState === 'visible' && document.hasFocus()) return;
    try {
      const notif = new Notification(title, {
        body,
        tag: options.tag,
        icon: options.icon || undefined,
        silent: false,
      });
      notif.onclick = () => {
        window.focus();
        if (options.target) {
          sessionStorage.setItem(
            'optimax_notification_target',
            JSON.stringify(options.target),
          );
          window.dispatchEvent(
            new CustomEvent('optimax-open-collab-target', {
              detail: options.target,
            }),
          );
        }
        notif.close();
      };
    } catch (_) {
      this.triggerMobileHaptics(true);
    }
  }

  setRingtone(tone: string): void {
    this.selectedRingtone = tone || 'classic';
    localStorage.setItem('optimax_message_ringtone', this.selectedRingtone);
    this.playNotificationSound();
  }

  // ── Messaging ─────────────────────────────────────────

  sendMessage(): void {
    if (this.activeView === 'dm') {
      this.sendDmMessage();
      return;
    }
    const text = this.draft.trim();
    if ((!text && !this.pendingAttachments.length) || this.sendingMessage) return;
    const channel = this.activeChannel;
    if (!channel) return;
    const outboundContent = text || this.attachmentsPlaceholderText(this.pendingAttachments);
    this.sendingMessage = true;
    const optimistic = this.makeLocalMsg(
      outboundContent,
      this.pendingAttachments,
    );
    optimistic.retryMeta = {
      mode: 'channel',
      backendChannelId: channel.backendId,
      content: outboundContent,
      files: [...this.pendingFiles],
      attachments: this.pendingAttachments.map((item) => ({ ...item })),
    };
    (this.channelMessages[channel.id] ??= []).push(optimistic);
    const capturedFiles = [...this.pendingFiles];
    const capturedAttachments = this.pendingAttachments.map((item) => ({ ...item }));
    this.draft = '';
    this.chatMentionResults = [];
    this.chatShowMentionMenu = false;
    this.pendingFiles = [];
    this.pendingAttachments = [];
    this.scrollFeed = true;
    this.cdr.detectChanges();
    this.focusMessageComposerSoon();
    this.collabService
      .sendMessage({
        channelId: channel.backendId,
        senderUserId: this.me.userId,
        content: outboundContent,
        messageType: 'TEXT',
      })
      .subscribe({
        next: (saved) => {
          optimistic.backendId = saved.id;
          optimistic.id = `backend-${saved.id}`;
          optimistic.deliveryState = 'DELIVERED';
          optimistic.retryMeta = undefined;
          this.sendingMessage = false;
          this.syncActiveConversationState();
          if (capturedFiles.length && capturedAttachments.length) {
            this.uploadAttachmentsForMessage(
              channel,
              saved.id,
              capturedFiles,
              capturedAttachments,
              optimistic,
            );
          }
          else this.cdr.detectChanges();
          this.focusMessageComposerSoon();
        },
        error: () => {
          optimistic.deliveryState = 'FAILED';
          this.sendingMessage = false;
          this.cdr.detectChanges();
          this.focusMessageComposerSoon();
        },
      });
  }

  sendDmMessage(): void {
    const text = this.draft.trim(),
      contact = this.activeDmContact;
    if (!contact || (!text && !this.pendingAttachments.length) || this.sendingMessage)
      return;
    const chId = contact.dmChannelId;
    if (!chId) {
      this.getOrCreateDmChannel(contact, (resolvedChannelId) => {
        if (contact.id !== this.activeDmId) return;
        contact.dmChannelId = resolvedChannelId;
        contact.dmChannelIds = [resolvedChannelId];
        this.sendDmMessage();
      });
      return;
    }
    const outboundContent = text || this.attachmentsPlaceholderText(this.pendingAttachments);
    this.sendingMessage = true;
    const optimistic = this.makeLocalMsg(
      outboundContent,
      this.pendingAttachments,
    );
    optimistic.retryMeta = {
      mode: 'dm',
      backendChannelId: chId,
      content: outboundContent,
      files: [...this.pendingFiles],
      attachments: this.pendingAttachments.map((item) => ({ ...item })),
    };
    (this.dmMessages[contact.id] ??= []).push(optimistic);
    const capturedFiles = [...this.pendingFiles];
    const capturedAttachments = this.pendingAttachments.map((item) => ({ ...item }));
    this.draft = '';
    this.chatMentionResults = [];
    this.chatShowMentionMenu = false;
    this.pendingFiles = [];
    this.pendingAttachments = [];
    this.scrollFeed = true;
    this.cdr.detectChanges();
    this.focusMessageComposerSoon();
    this.collabService
      .sendMessage({
        channelId: chId,
        senderUserId: this.me.userId,
        content: outboundContent,
        messageType: 'TEXT',
      })
      .subscribe({
        next: (saved) => {
          optimistic.backendId = saved.id;
          optimistic.id = `backend-${saved.id}`;
          optimistic.deliveryState = 'DELIVERED';
          optimistic.retryMeta = undefined;
          this.sendingMessage = false;
          this.syncActiveConversationState();
          if (capturedFiles.length && capturedAttachments.length) {
            const fakeCh: Channel = {
              id: `dm-${chId}`,
              backendId: chId,
              name: '',
            };
            this.uploadAttachmentsForMessage(
              fakeCh,
              saved.id,
              capturedFiles,
              capturedAttachments,
              optimistic,
            );
          } else this.cdr.detectChanges();
          this.focusMessageComposerSoon();
        },
        error: () => {
          optimistic.deliveryState = 'FAILED';
          this.sendingMessage = false;
          this.cdr.detectChanges();
          this.focusMessageComposerSoon();
        },
      });
  }

  private uploadAttachmentsForMessage(
    channel: Channel,
    messageId: number,
    files: File[],
    metadata: Array<{ name: string; size: string; type?: string; previewUrl?: string }>,
    optimistic: Message,
  ): void {
    this.uploadingAttachment = true;
    const uploads = files.map((file, index) =>
      firstValueFrom(
        this.collabService.uploadAttachment(
          channel.backendId,
          this.me.userId,
          file,
          messageId,
        ),
      ).then((att) => {
        const meta = metadata[index];
        return {
          name: att.fileName || meta?.name || file.name,
          size: att.fileSize ? formatFileSize(att.fileSize) : meta?.size || formatFileSize(file.size),
          type: att.contentType || meta?.type || file.type,
          downloadUrl: att.downloadUrl,
          previewUrl: meta?.previewUrl || this.resolveAttachmentPreviewUrl(att),
        };
      }),
    );
    Promise.all(uploads)
      .then((attachments) => {
        optimistic.attachments = attachments;
        optimistic.attachment = attachments[0];
        this.uploadingAttachment = false;
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.uploadingAttachment = false;
        this.cdr.detectChanges();
      });
  }

  onFilesSelected(files: File[]): void {
    for (const file of files) {
      this.pendingFiles.push(file);
      this.pendingAttachments.push({
        name: file.name,
        size: formatFileSize(file.size),
        type: this.normalizeAttachmentType(file.type, file.name),
        previewUrl: this.isImageType(file.type)
          ? URL.createObjectURL(file)
          : undefined,
      });
    }
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
      this.selectedThreadMsg = null;
      return;
    }
    this.showPinnedPanel = false;
    this.showChannelDetails = false;
    this.activeThreadId = msg.id;
    this.selectedThreadMsg = {
      ...msg,
      replies: [...(msg.replies || [])],
    };
    this.activeThreadReplyToId = null;
    this.threadReplyDraft = '';
    this.threadMentionResults = [];
    this.threadShowMentionMenu = false;
    this.clearThreadPendingAttachments();
    this.scrollThread = true;
    this.cdr.detectChanges();
  }

  closeThread(): void {
    this.activeThreadId = null;
    this.selectedThreadMsg = null;
    this.activeThreadReplyToId = null;
    this.threadReplyDraft = '';
    this.threadMentionResults = [];
    this.threadShowMentionMenu = false;
    this.clearThreadPendingAttachments();
  }

  private getThreadSourceRoot(threadId: string): Message | null {
    for (const ch of this.channels) {
      const found = this.findMsgInTree(
        this.channelMessages[ch.id] || [],
        threadId,
      );
      if (found) {
        return found;
      }
    }
    for (const dm of this.dmContacts) {
      const found = this.findMsgInTree(
        this.dmMessages[dm.id] || [],
        threadId,
      );
      if (found) {
        return found;
      }
    }
    return null;
  }

  private refreshSelectedThreadFromSource(threadId: string): Message | null {
    const sourceRoot = this.getThreadSourceRoot(threadId);
    if (sourceRoot) {
      this.selectedThreadMsg = {
        ...sourceRoot,
        replies: [...(sourceRoot.replies || [])],
      };
      return sourceRoot;
    }
    return null;
  }

  setThreadReplyTarget(payload: { reply: Message; event?: Event }): void {
    payload.event?.stopPropagation();
    this.activeThreadReplyToId = payload.reply.id;
    this.threadReplyDraft = '';
    this.threadMentionResults = [];
    this.threadShowMentionMenu = false;
    this.clearThreadPendingAttachments();
    this.cdr.detectChanges();
  }

  clearThreadReplyTarget(): void {
    this.activeThreadReplyToId = null;
    this.threadReplyDraft = '';
    this.threadMentionResults = [];
    this.threadShowMentionMenu = false;
    this.clearThreadPendingAttachments();
    this.cdr.detectChanges();
  }

  /**
   * sendReply works for both channels AND DMs.
   * DM threads use the DM channel's backendId as channelId.
   */
  sendReply(): void {
    const text = this.threadReplyDraft.trim();
    const rootMsg = this.activeThread;
    if (
      (!text && !this.threadPendingAttachments.length) ||
      !rootMsg ||
      this.sendingReply
    ) {
      return;
    }

    const source = this.resolveThreadMessageSource(rootMsg);
    const isDm = source?.type === 'dm';
    const channelId = isDm
      ? source?.dmChannelId
      : source?.channelBackendId;

    const replyTarget = this.activeThreadReplyToId
      ? (this.findMsgInTree(rootMsg.replies, this.activeThreadReplyToId) ??
        rootMsg)
      : rootMsg;
    const replyingToNestedMessage = Boolean(this.activeThreadReplyToId);
    const threadRootId = rootMsg.backendId,
      replyToId = replyTarget.backendId ?? rootMsg.backendId;
    const outboundContent =
      text || this.attachmentsPlaceholderText(this.threadPendingAttachments);
    const sourceRootMsg =
      (rootMsg ? this.getThreadSourceRoot(rootMsg.id) : null) || rootMsg;

    if (!channelId || !sourceRootMsg?.backendId) {
      const opt = this.makeLocalMsg(
        outboundContent,
        this.threadPendingAttachments,
      );
      opt.replyToMessageId = replyToId;
      opt.threadRootMessageId = threadRootId;
      const fallbackReplyTarget = this.activeThreadReplyToId
        ? (this.findMsgInTree(
            sourceRootMsg?.replies || [],
            this.activeThreadReplyToId,
          ) ?? sourceRootMsg)
        : sourceRootMsg;
      if (replyingToNestedMessage && fallbackReplyTarget) {
        fallbackReplyTarget.replies.push(opt);
      } else {
        sourceRootMsg.replies.push(opt);
      }
      this.threadReplyDraft = '';
      this.threadMentionResults = [];
      this.threadShowMentionMenu = false;
      this.activeThreadReplyToId = null;
      this.clearThreadPendingAttachments();
      this.refreshSelectedThreadFromSource(sourceRootMsg.id);
      this.scrollThread = true;
      this.cdr.detectChanges();
      return;
    }
    const stableRootMsg = sourceRootMsg;

    this.sendingReply = true;
    const optimistic = this.makeLocalMsg(
      outboundContent,
      this.threadPendingAttachments,
    );
    optimistic.replyToMessageId = replyToId;
    optimistic.threadRootMessageId = threadRootId;
    optimistic.retryMeta = {
      mode: 'thread',
      backendChannelId: channelId,
      content: outboundContent,
      files: [...this.threadPendingFiles],
      attachments: this.threadPendingAttachments.map((item) => ({ ...item })),
      replyToMessageId: replyToId,
      threadRootMessageId: threadRootId,
    };
    const sourceReplyTarget = this.activeThreadReplyToId
      ? (this.findMsgInTree(
          stableRootMsg.replies,
          this.activeThreadReplyToId,
        ) ?? stableRootMsg)
      : stableRootMsg;
    if (replyingToNestedMessage) sourceReplyTarget.replies.push(optimistic);
    else stableRootMsg.replies.push(optimistic);
    const capturedFiles = [...this.threadPendingFiles];
    const capturedAttachments = this.threadPendingAttachments.map((item) => ({
      ...item,
    }));
    this.threadReplyDraft = '';
    this.threadMentionResults = [];
    this.threadShowMentionMenu = false;
    this.activeThreadReplyToId = null;
    this.threadPendingFiles = [];
    this.threadPendingAttachments = [];
    this.refreshSelectedThreadFromSource(stableRootMsg.id);
    this.scrollThread = true;
    this.cdr.detectChanges();

    this.collabService
      .sendMessage({
        channelId,
        senderUserId: this.me.userId,
        content: outboundContent,
        messageType: 'TEXT',
        replyToMessageId: replyToId ?? null,
        threadRootMessageId: threadRootId ?? null,
      })
      .subscribe({
        next: (saved) => {
          optimistic.backendId = saved.id;
          optimistic.id = `backend-${saved.id}`;
          optimistic.deliveryState = 'DELIVERED';
          optimistic.retryMeta = undefined;
          this.sendingReply = false;
          this.syncActiveConversationState();
          this.refreshSelectedThreadFromSource(stableRootMsg.id);
          if (capturedFiles.length && capturedAttachments.length) {
            const attachmentChannel: Channel = {
              id: `thread-${channelId}`,
              backendId: channelId,
              name: '',
            };
            this.uploadAttachmentsForMessage(
              attachmentChannel,
              saved.id,
              capturedFiles,
              capturedAttachments,
              optimistic,
            );
          }
          this.cdr.detectChanges();
        },
        error: () => {
          optimistic.deliveryState = 'FAILED';
          this.sendingReply = false;
          this.refreshSelectedThreadFromSource(stableRootMsg.id);
          this.cdr.detectChanges();
        },
      });
  }

  // ── Reactions ─────────────────────────────────────────

  toggleLike(payload: { msg: Message; event?: Event; reactionCode?: string }): void {
    const { msg } = payload;
    const reactionCode = (payload.reactionCode || 'LIKE').toUpperCase();
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
      const source = this.resolveThreadMessageSource(msg);
      if (source?.type === 'channel' && source.channelBackendId) {
        const ch = this.channels.find((entry) => entry.backendId === source.channelBackendId);
        if (ch) {
          this.getChannelSnapshotWithFallback(ch.backendId).then((snap) => {
            if (snap) this.refreshReactionCounts(ch, snap.reactions || []);
          });
        }
      } else if (source?.type === 'dm' && source.dmChannelId) {
        const contact = this.dmContacts.find((entry) => entry.dmChannelId === source.dmChannelId);
        if (contact) {
          this.getChannelSnapshotWithFallback(source.dmChannelId).then((snap) => {
            if (!snap) return;
            const renderedMessages = this.buildMessageList(
              snap.messages || [],
              snap.reactions || [],
              snap.attachments || [],
            );
            this.dmMessages[contact.id] = this.mergeRenderedMessagesWithPending(
              renderedMessages,
              this.dmMessages[contact.id] || [],
            );
            this.hydrateMessageAttachments(this.dmMessages[contact.id]);
            this.cdr.detectChanges();
          });
        }
      }
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
          reactionCode,
        })
        .subscribe({ next: refresh, error: rollback });
  }

  private refreshReactionCounts(channel: Channel, reactions: any[]): void {
    const LIKE_CODES = ['LIKE', 'LOVE', 'THUMBS_UP', 'LAUGH', 'CELEBRATE', 'FIRE'];
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

  openMentionConversation(userId: number): void {
    if (!userId || Number(userId) === Number(this.me.userId)) {
      return;
    }
    let contact = this.dmContacts.find(
      (dm) =>
        Number(dm.userId) === Number(userId) ||
        Number(dm.employeeId || 0) === Number(userId),
    );
    if (!contact) {
      const employee = this.allEmployees.find(
        (entry) =>
          Number(entry.user?.userId || entry.user?.id || entry.id || 0) === Number(userId) ||
          Number(entry.id || 0) === Number(userId),
      );
      if (!employee) {
        return;
      }
      const fullName =
        `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
        employee.fullname ||
        employee.user?.fullname ||
        `User ${employee.id}`;
      contact = {
        id: `emp-${employee.id}`,
        employeeId: employee.id,
        userId: Number(employee.user?.userId || employee.user?.id || userId),
        username: employee.user?.username || employee.username || '',
        shortName: employee.lastName
          ? `${employee.firstName || fullName} ${employee.lastName[0]}.`
          : employee.firstName || fullName,
        fullName,
        initials: initialsFrom(fullName),
        avatarColor: _colorFor(employee.id),
        avatarUrl: this.getEmpImageUrl(employee) || this.userAvatarCache[userId],
        email: employee.user?.email || employee.email || '',
        jobTitle: employee.jobTitle,
        department: employee.department?.name,
        online: this.isUserOnline(userId),
      };
      this.dmContacts = this.stripSelfFromDmContacts([
        contact,
        ...this.dmContacts.filter((dm) => dm.id !== contact!.id),
      ]);
      this.cdr.detectChanges();
    }
    this.selectDm(contact.id, true);
    this.focusMessageComposerSoon();
    this.clearMentionHash();
  }

  private focusMessageComposerSoon(): void {
    setTimeout(() => this.messageComposer?.focusComposer(), 0);
    setTimeout(() => this.messageComposer?.focusComposer(), 180);
  }

  private handleMentionHashChange = (): void => {
    this.processMentionHashNavigation();
  };

  private processMentionHashNavigation(): void {
    if (typeof window === 'undefined') return;
    if (this.processShareDocHash()) return;
    const match = window.location.hash.match(/^#dm-user-(\d+)$/i);
    if (!match) return;
    const userId = Number(match[1]);
    if (!userId || Number(userId) === Number(this.me.userId)) {
      this.clearMentionHash();
      return;
    }
    if (!this.dmContacts.length && !this.allEmployees.length) {
      this.pendingMentionConversationUserId = userId;
      return;
    }
    this.pendingMentionConversationUserId = null;
    this.openMentionConversation(userId);
  }

  private processShareDocHash(): boolean {
    if (typeof window === 'undefined') return false;
    const match = window.location.hash.match(/^#share-doc:(\d+):(\d*)$/i);
    if (!match) return false;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    const channelBackendId = Number(match[1]);
    const folderId = match[2] ? Number(match[2]) : null;
    const channel = this.channels.find((c) => c.backendId === channelBackendId);
    if (!channel) {
      this.pendingShareDocTarget = { channelBackendId, folderId };
      return true;
    }
    this.pendingShareDocTarget = null;
    this.selectChannel(channel.id);
    if (folderId != null) {
      this.pendingShareFolderId = folderId;
    }
    return true;
  }

  private applyPendingShareDoc(): void {
    if (!this.pendingShareDocTarget) return;
    const { channelBackendId, folderId } = this.pendingShareDocTarget;
    const channel = this.channels.find((c) => c.backendId === channelBackendId);
    if (!channel) return;
    this.pendingShareDocTarget = null;
    this.selectChannel(channel.id);
    if (folderId != null) {
      this.pendingShareFolderId = folderId;
    }
  }

  private applyPendingMentionConversation(): void {
    if (!this.pendingMentionConversationUserId) return;
    const userId = this.pendingMentionConversationUserId;
    this.pendingMentionConversationUserId = null;
    this.openMentionConversation(userId);
  }

  private clearMentionHash(): void {
    if (typeof window === 'undefined') return;
    if (!window.location.hash.startsWith('#dm-user-')) return;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
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

  openSelfAnalyticsPanel(): void {
    const self: DmContact = this.selfContact ?? {
      id: String(this.me.userId),
      userId: Number(this.me.userId),
      employeeId: 0,
      fullName: this.me.name,
      shortName: this.me.shortName,
      initials: this.me.initials,
      avatarColor: this.me.avatarColor,
      avatarUrl: this.me.avatarUrl || undefined,
      online: true,
      hasUnread: false,
      email: sessionStorage.getItem('email') || localStorage.getItem('email') || undefined,
    };
    this.openAnalyticsPanel(self);
  }

  openAnalyticsPanel(contact: DmContact): void {
    const uid = contact.userId;
    const email = (contact.email || '').toLowerCase();
    const name = (contact.fullName || '').toLowerCase();
    const issues = this.allIssues.filter((issue) => {
      if (issue.status === 'DONE' || issue.status === 'WONT_FIX') return false;
      if (issue.assigneeUserId && Number(issue.assigneeUserId) === uid) return true;
      if (email && issue.assigneeEmail && String(issue.assigneeEmail).toLowerCase() === email) return true;
      return false;
    });
    const empId = contact.employeeId;
    const TASK_DONE_SET = new Set(['DONE', 'ARCHIVED', 'CLOSED', 'COMPLETED']);
    const tasks = this.allTasks.filter((task) => {
      if (TASK_DONE_SET.has(task.status)) return false;
      const assigneeEmpId = Number(task.assigneeEmployee?.id ?? task.assigneeEmployeeId ?? 0);
      if (assigneeEmpId && (assigneeEmpId === empId || assigneeEmpId === uid)) return true;
      if (Number(task.assigneeUserId || task.userId || 0) === uid) return true;
      return false;
    });
    const events = this.allEvents.filter((event) => {
      const attendees: string[] = Array.isArray(event.attendees) ? event.attendees : [];
      const all = [...attendees, event.organizer || ''];
      return all.some((a) => {
        const s = String(a).toLowerCase();
        return (email && s.includes(email)) || (name && s.includes(name));
      });
    });
    this.analyticsPanel = { open: true, contact, issues, tasks, events };
    this.cdr.markForCheck();
  }

  closeAnalyticsPanel(): void {
    this.analyticsPanel = { ...this.analyticsPanel, open: false };
    this.cdr.markForCheck();
  }

  getLinkDomain(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
  }

  get channelAttachmentDocuments(): any[] {
    const q = this.channelAttachmentsPanel.searchQuery.toLowerCase();
    return this.channelAttachmentsPanel.attachments.filter((a) => {
      const isDoc = !this.isMediaAttachment(a);
      return isDoc && (!q || (a.fileName || '').toLowerCase().includes(q));
    });
  }

  get channelAttachmentMedia(): any[] {
    const q = this.channelAttachmentsPanel.searchQuery.toLowerCase();
    return this.channelAttachmentsPanel.attachments.filter((a) => {
      const isMedia = this.isMediaAttachment(a);
      return isMedia && (!q || (a.fileName || '').toLowerCase().includes(q));
    });
  }

  private isMediaAttachment(att: any): boolean {
    const ct: string = (att.contentType || '').toLowerCase();
    return ct.startsWith('image/') || ct.startsWith('video/');
  }

  getProtectedImageUrl(url: string): string {
    return this.resolveProtectedMediaUrl(url);
  }

  openChannelMediaViewer(clickedAtt: any, event: Event): void {
    event.stopPropagation();
    const allMedia = this.channelAttachmentMedia;
    const startIndex = allMedia.findIndex((a) => a.downloadUrl === clickedAtt.downloadUrl);
    const items = allMedia.map((a) => ({
      url: this.resolveProtectedMediaUrl(a.downloadUrl),
      label: a.fileName || '',
      mediaType: (a.contentType || '').startsWith('video/') ? 'VIDEO' : 'IMAGE',
    }));
    this.expandedFeedMediaItems = items;
    this.expandedFeedMediaIndex = Math.max(0, startIndex);
    this.expandedFeedMediaUrl = items[this.expandedFeedMediaIndex]?.url || '';
    this.expandedFeedMediaLabel = items[this.expandedFeedMediaIndex]?.label || '';
    this.feedMediaViewerOpen = true;
  }

  downloadChannelAttachment(att: any, event: Event): void {
    event.stopPropagation();
    this.downloadAttachment({ name: att.fileName, downloadUrl: att.downloadUrl }, event);
  }

  private extractLinksFromMessages(messages: Message[]): string[] {
    const found = new Set<string>();
    const urlRe = /((https?:\/\/|www\.)[^\s<"']+)/gi;
    const walk = (msgs: Message[]) => {
      for (const m of msgs || []) {
        const text = m.content || '';
        let match: RegExpExecArray | null;
        urlRe.lastIndex = 0;
        while ((match = urlRe.exec(text)) !== null) {
          let u = match[1];
          if (u.startsWith('www.')) u = 'https://' + u;
          found.add(u.replace(/[.,;!?)]+$/, ''));
        }
        if (m.replies?.length) walk(m.replies);
      }
    };
    walk(messages);
    return Array.from(found).reverse();
  }

  openChannelAttachmentsPanel(channel: Channel): void {
    const msgs = this.channelMessages[channel.id] || [];
    const links = this.extractLinksFromMessages(msgs);
    this.channelAttachmentsPanel = { open: true, channel, attachments: [], loading: true, activeTab: 'documents', searchQuery: '', links };
    this.cdr.markForCheck();
    this.collabService.getAttachmentsByChannel(channel.backendId).subscribe({
      next: (atts) => {
        this.channelAttachmentsPanel = { ...this.channelAttachmentsPanel, attachments: atts, loading: false };
        this.cdr.markForCheck();
      },
      error: () => {
        this.channelAttachmentsPanel = { ...this.channelAttachmentsPanel, loading: false };
        this.cdr.markForCheck();
      },
    });
  }

  closeChannelAttachmentsPanel(): void {
    this.channelAttachmentsPanel = { ...this.channelAttachmentsPanel, open: false, searchQuery: '', links: [] };
    this.cdr.markForCheck();
  }

  navigateToBugTracker(issueId?: number): void {
    const uuid = crypto.randomUUID();
    const extras = issueId ? { queryParams: { issue: issueId } } : {};
    this.router.navigate(['/admin/settings/bug-tracker', uuid], extras);
  }

  navigateToTaskWorkspace(taskId?: number | string): void {
    const uuid = crypto.randomUUID();
    const extras = taskId ? { queryParams: { taskId: String(taskId) } } : {};
    this.router.navigate(['/admin/hr/productivity', uuid], extras);
  }

  navigateToMeetings(): void {
    const uuid = crypto.randomUUID();
    this.router.navigate(['/admin/dashboard/meetings-appointments', uuid]);
  }

  getFileIcon(contentType: string): string {
    if (!contentType) return 'pi pi-file';
    if (contentType.startsWith('image/')) return 'pi pi-image';
    if (contentType.startsWith('video/')) return 'pi pi-video';
    if (contentType.includes('pdf')) return 'pi pi-file-pdf';
    if (contentType.includes('word') || contentType.includes('document')) return 'pi pi-file-word';
    if (contentType.includes('sheet') || contentType.includes('excel')) return 'pi pi-file-excel';
    if (contentType.includes('zip') || contentType.includes('compressed')) return 'pi pi-file-arrow-down';
    return 'pi pi-file';
  }

  private loadWorkEffectivenessData(): void {
    forkJoin({
      issues: this.collabService.getOpenIssues().pipe(catchError(() => of([]))),
      tasks: this.collabService.getOpenWorkTasks().pipe(catchError(() => of([]))),
      events: this.collabService.getAllMeetingEvents().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ issues, tasks, events }) => {
        const toArr = (r: any): any[] =>
          Array.isArray(r) ? r :
          Array.isArray(r?.content) ? r.content :
          Array.isArray(r?.data) ? r.data :
          Array.isArray(r?.items) ? r.items :
          Array.isArray(r?.results) ? r.results : [];

        const issueArr = toArr(issues);
        const taskArr  = toArr(tasks);
        const eventArr = toArr(events);
        this.allIssues = issueArr;
        this.allTasks  = taskArr;
        this.allEvents = eventArr;

        // ── build all-person lookup tables (DM contacts + self) ──────────────
        const selfUserId = Number(this.me.userId || 0);
        const selfEmpId  = this.selfContact?.employeeId ?? 0;
        const selfEmail  = (this.selfContact?.email || sessionStorage.getItem('email') || localStorage.getItem('email') || '').toLowerCase().trim();
        const selfName   = (this.selfContact?.fullName || this.me.name || '').toLowerCase().trim();

        // userId → DmContact (or self sentinel -1)
        const contactByUserId  = new Map<number, number>(); // userId  → internal key (userId)
        const contactByEmpId   = new Map<number, number>(); // empId   → userId
        const contactByEmail   = new Map<string, number>(); // email   → userId
        const contactByName    = new Map<string, number>(); // name    → userId
        const contactByUname   = new Map<string, number>(); // username → userId

        const registerContact = (uid: number, empId: number, email: string, name: string, username: string) => {
          if (uid)      contactByUserId.set(uid, uid);
          if (empId)    contactByEmpId.set(empId, uid);
          if (email)    contactByEmail.set(email, uid);
          if (name)     contactByName.set(name, uid);
          if (username) contactByUname.set(username.toLowerCase(), uid);
        };

        for (const c of this.dmContacts) {
          registerContact(
            c.userId,
            c.employeeId,
            (c.email || '').toLowerCase().trim(),
            (c.fullName || '').toLowerCase().trim(),
            (c.username || '').toLowerCase().trim(),
          );
        }
        if (selfUserId) {
          registerContact(selfUserId, selfEmpId, selfEmail, selfName, '');
        }

        // ── resolve any string (email/name/username) → userId ────────────────
        const resolve = (raw: string): number => {
          const s = raw.toLowerCase().trim();
          if (!s) return 0;
          if (contactByEmail.has(s))  return contactByEmail.get(s)!;
          if (contactByName.has(s))   return contactByName.get(s)!;
          if (contactByUname.has(s))  return contactByUname.get(s)!;
          for (const [e, uid] of contactByEmail) if (s.includes(e) || e.includes(s)) return uid;
          for (const [n, uid] of contactByName)  if (s.includes(n) || n.includes(s)) return uid;
          return 0;
        };

        // ── issues ──────────────────────────────────────────────────────────
        const issueCount = new Map<number, number>();
        const ISSUE_DONE = new Set(['DONE', 'WONT_FIX', 'CLOSED', 'RESOLVED', 'ARCHIVED']);
        for (const issue of issueArr) {
          if (ISSUE_DONE.has(String(issue.status || '').toUpperCase())) continue;
          let uid = Number(issue.assigneeUserId || 0);
          if (!uid) uid = resolve(issue.assigneeEmail || issue.assigneeName || '');
          if (uid) issueCount.set(uid, (issueCount.get(uid) ?? 0) + 1);
        }

        // ── tasks ────────────────────────────────────────────────────────────
        const taskCount = new Map<number, number>(); // keyed by userId
        const TASK_DONE = new Set(['DONE', 'ARCHIVED', 'CLOSED', 'COMPLETED']);
        for (const task of taskArr) {
          if (TASK_DONE.has(String(task.status || '').toUpperCase())) continue;
          // try employee ID first (backend returns assigneeEmployee.id)
          const empId = Number(task.assigneeEmployee?.id ?? task.assigneeEmployeeId ?? 0);
          let uid = empId ? (contactByEmpId.get(empId) ?? 0) : 0;
          // fallback: direct userId fields
          if (!uid) uid = Number(task.assigneeUserId ?? task.userId ?? 0);
          // fallback: name/email strings
          if (!uid) uid = resolve(task.assigneeName || task.assigneeEmail || '');
          if (uid) taskCount.set(uid, (taskCount.get(uid) ?? 0) + 1);
        }

        // ── events ───────────────────────────────────────────────────────────
        const eventCount = new Map<number, number>();
        for (const ev of eventArr) {
          const attendees: string[] = Array.isArray(ev.attendees) ? ev.attendees : [];
          const participants = ev.organizer ? [...attendees, ev.organizer] : [...attendees];
          for (const a of participants) {
            const uid = Number(ev.attendeeUserIds?.[a]) || resolve(String(a));
            if (uid) eventCount.set(uid, (eventCount.get(uid) ?? 0) + 1);
          }
        }

        // ── apply to DM contacts ────────────────────────────────────────────
        this.dmContacts = this.dmContacts.map((c) => ({
          ...c,
          openIssueCount: issueCount.get(c.userId) ?? 0,
          openTaskCount:  taskCount.get(c.userId) ?? 0,
          openEventCount: eventCount.get(c.userId) ?? 0,
        }));

        // ── self stats ──────────────────────────────────────────────────────
        this.selfStats = {
          openIssueCount: selfUserId ? (issueCount.get(selfUserId) ?? 0) : 0,
          openTaskCount:  selfUserId ? (taskCount.get(selfUserId) ?? 0) : 0,
          openEventCount: selfUserId ? (eventCount.get(selfUserId) ?? 0) : 0,
        };

        this.cdr.markForCheck();
      },
    });
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
  startResizeChatRail(e: MouseEvent): void {
    this.isResizingChatRail = true;
    this.resizeStartX = e.clientX;
    this.resizeStartWidth = this.chatRailWidth;
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
    if (this.isResizingChatRail)
      this.chatRailWidth = Math.min(
        this.CHAT_RAIL_MAX,
        Math.max(
          this.CHAT_RAIL_MIN,
          this.resizeStartWidth + (this.resizeStartX - e.clientX),
        ),
      );
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (!this.isMobileViewport()) {
      this.mobileSidebarOpen = false;
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isResizingSidebar = false;
    this.isResizingThread = false;
    this.isResizingChatRail = false;
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

  get historyLoading(): boolean {
    return this.messagesLoading || this.loadingOlderHistory;
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
    if (
      this.selectedThreadMsg &&
      this.selectedThreadMsg.id === this.activeThreadId
    ) {
      return this.selectedThreadMsg;
    }
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

  get birthdayPanelOpen(): boolean {
    return !this.birthdayCardDismissed && !this.rightPanelOpen && !this.isMobileViewport();
  }

  docFileDescription(file: ChannelDocumentFile): string {
    const parts: string[] = [];
    const ext = file.contentType ? (file.contentType.split('/').pop() || '').toUpperCase() : '';
    if (ext) parts.push(ext);
    if (file.fileSize) parts.push(formatFileSize(file.fileSize));
    if (file.uploadedAt) {
      try {
        const d = new Date(file.uploadedAt);
        if (!Number.isNaN(d.getTime())) {
          parts.push(d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }));
        }
      } catch (_) {}
    }
    return parts.join(' · ');
  }

  private buildShareDocUrl(channelBackendId: number, folderId: number | null): string {
    if (typeof window === 'undefined') return '';
    const base = window.location.href.split('#')[0];
    return `${base}#share-doc:${channelBackendId}:${folderId ?? ''}`;
  }

  deleteDocumentFile(file: ChannelDocumentFile, event?: Event): void {
    event?.stopPropagation();
    if (!confirm(`Delete "${file.name}"?`)) return;
    this.collabService.deleteAttachment(file.id).subscribe({
      next: () => {
        this.documentFiles = this.documentFiles.filter((f) => f.id !== file.id);
        this.cdr.detectChanges();
      },
      error: () => {
        this.documentLibraryError = `Failed to delete "${file.name}".`;
        this.cdr.detectChanges();
      },
    });
  }

  openFileShareModal(file: ChannelDocumentFile, event?: Event): void {
    event?.stopPropagation();
    const channelBackendId = this.activeChannel?.backendId ?? 0;
    this.docShareModal = {
      open: true,
      itemName: file.name,
      itemType: 'file',
      itemUrl: this.buildShareDocUrl(channelBackendId, file.folderId ?? null),
      targetType: 'channel',
      targetId: this.channels[0]?.id || '',
      sending: false,
      error: '',
    };
    this.cdr.detectChanges();
  }

  openFolderShareModal(folder: CollabDocumentFolder, event?: Event): void {
    event?.stopPropagation();
    const channelBackendId = this.activeChannel?.backendId ?? 0;
    this.docShareModal = {
      open: true,
      itemName: folder.name,
      itemType: 'folder',
      itemUrl: this.buildShareDocUrl(channelBackendId, Number(folder.id)),
      targetType: 'channel',
      targetId: this.channels[0]?.id || '',
      sending: false,
      error: '',
    };
    this.cdr.detectChanges();
  }

  closeDocShareModal(): void {
    this.docShareModal = { ...this.docShareModal, open: false, sending: false, error: '' };
    this.cdr.detectChanges();
  }

  setShareTargetType(type: 'channel' | 'dm'): void {
    const defaultId = type === 'channel' ? (this.channels[0]?.id || '') : (this.dmContacts[0]?.id || '');
    this.docShareModal = { ...this.docShareModal, targetType: type, targetId: defaultId };
  }

  setShareTargetId(id: string): void {
    this.docShareModal = { ...this.docShareModal, targetId: id };
  }

  executeDocShare(): void {
    const modal = this.docShareModal;
    if (!modal.targetId || modal.sending) return;
    const label = modal.itemType === 'folder' ? 'folder' : 'file';
    const content = modal.itemUrl
      ? `${this.me.name} has shared the ${label} "${modal.itemName}". [Click here to access](${modal.itemUrl})`
      : `${this.me.name} has shared the ${label} "${modal.itemName}".`;
    this.docShareModal = { ...modal, sending: true, error: '' };
    this.cdr.detectChanges();

    let channelBackendId: number | null = null;
    if (modal.targetType === 'channel') {
      const ch = this.channels.find((c) => c.id === modal.targetId);
      channelBackendId = ch?.backendId ?? null;
    } else {
      const dm = this.dmContacts.find((d) => d.id === modal.targetId);
      channelBackendId = dm?.dmChannelId ?? null;
    }
    if (!channelBackendId) {
      this.docShareModal = { ...this.docShareModal, sending: false, error: 'Could not resolve destination.' };
      this.cdr.detectChanges();
      return;
    }
    this.collabService.sendMessage({ channelId: channelBackendId, senderUserId: this.me.userId, content, messageType: 'TEXT' })
      .subscribe({
        next: () => {
          this.closeDocShareModal();
        },
        error: () => {
          this.docShareModal = { ...this.docShareModal, sending: false, error: 'Failed to share. Please try again.' };
          this.cdr.detectChanges();
        },
      });
  }

  toggleChatRail(): void {
    if (this.isMobileViewport()) {
      this.showChatRail = false;
      return;
    }
    this.showChatRail = !this.showChatRail;
  }

  get rightPanelMode(): 'pinned' | 'thread' | 'details' | null {
    if (this.showChannelDetails) return 'details';
    if (this.showPinnedPanel) return 'pinned';
    if (this.activeThreadId) return 'thread';
    return null;
  }

  private async getChannelSnapshotWithFallback(
    channelId: number,
    recentMessageLimit = this.INITIAL_CHAT_HISTORY_LIMIT,
  ): Promise<CollabChannelSnap | null> {
    const now = Date.now();
    const failureUntil = this.channelSnapshotFailureUntil.get(channelId) || 0;
    if (failureUntil > now) {
      return null;
    }
    const requestKey = this.snapshotRequestKey(channelId, recentMessageLimit);
    const existingRequest = this.channelSnapshotInFlight.get(requestKey);
    if (existingRequest) {
      return existingRequest;
    }

    const request = firstValueFrom(
      this.collabService.getChannelSnapshot(channelId, recentMessageLimit),
    )
      .then((snap) => {
        this.channelSnapshotFailureUntil.delete(channelId);
        this.channelSnapshotConsecutiveFailures.delete(channelId);
        this.channelSnapshotLastErrorStatus.delete(channelId);
        this.channelSnapshotLastErrorMessage.delete(channelId);
        return snap;
      })
      .catch((error: any) => {
        const status = Number(error?.status || 0);
        const message = String(
          error?.error?.message || error?.message || '',
        ).trim();
        this.channelSnapshotLastErrorStatus.set(channelId, status);
        this.channelSnapshotLastErrorMessage.set(channelId, message);
        if (status >= 500 || !status) {
          const failures = (this.channelSnapshotConsecutiveFailures.get(channelId) || 0) + 1;
          this.channelSnapshotConsecutiveFailures.set(channelId, failures);
          const backoffMs = Math.min(4_000 * Math.pow(2, failures - 1), 120_000);
          this.channelSnapshotFailureUntil.set(channelId, Date.now() + backoffMs);
          if (failures >= this.SNAPSHOT_POLL_MAX_FAILURES) {
            this.messagesLoading = false;
            this.cdr.detectChanges();
          }
        }
        return null;
      })
      .finally(() => {
        this.channelSnapshotInFlight.delete(requestKey);
      });

    this.channelSnapshotInFlight.set(requestKey, request);
    return request;
  }

  private dmMembershipRepairKey(contact: DmContact, channelId: number): string {
    return `${contact.id}:${channelId}`;
  }

  private hasRecoverableSnapshotFailure(channelId: number): boolean {
    const status = this.channelSnapshotLastErrorStatus.get(channelId) || 0;
    return status >= 500 || !status;
  }

  onChatFeedScroll(): void {
    if (
      this.messagesLoading ||
      this.loadingOlderHistory ||
      !this.feedEl?.nativeElement
    ) {
      return;
    }
    if (!this.historyPagingArmed) {
      this.historyPagingArmed = true;
      return;
    }
    const el = this.feedEl.nativeElement;
    if (el.scrollTop > 80) {
      return;
    }
    if (this.activeView === 'channel' && this.activeChannel) {
      void this.loadOlderHistory(this.activeChannel.backendId, 'channel');
      return;
    }
    if (this.activeView === 'dm' && this.activeDmContact?.dmChannelId) {
      void this.loadOlderHistory(this.activeDmContact.dmChannelId, 'dm');
    }
  }

  private async loadOlderHistory(
    channelId: number,
    mode: 'channel' | 'dm',
  ): Promise<void> {
    if (
      this.channelHistoryExhausted.has(channelId) ||
      this.historyLoadInFlight.has(channelId)
    ) {
      return;
    }

    const currentLimit = this.currentHistoryLimit(channelId);
    const nextLimit = Math.min(
      currentLimit + this.CHAT_HISTORY_PAGE_SIZE,
      this.MAX_CHAT_HISTORY_LIMIT,
    );
    if (nextLimit <= currentLimit) {
      this.channelHistoryExhausted.add(channelId);
      return;
    }

    const currentCount = this.rawMessages.length;
    if (this.feedEl?.nativeElement) {
      const el = this.feedEl.nativeElement;
      this.preserveFeedScrollOffset = el.scrollHeight - el.scrollTop;
    }

    this.loadingOlderHistory = true;
    this.historyLoadInFlight.add(channelId);
    this.channelHistoryLimit.set(channelId, nextLimit);
    this.cdr.detectChanges();

    const snap = await this.getChannelSnapshotWithFallback(channelId, nextLimit);

    this.historyLoadInFlight.delete(channelId);
    this.loadingOlderHistory = false;
    if (!snap) {
      this.channelHistoryLimit.set(channelId, currentLimit);
      this.cdr.detectChanges();
      return;
    }

    if ((snap.messages || []).length <= currentCount) {
      this.channelHistoryExhausted.add(channelId);
    }

    this.conversationAccessMessage = '';

    if (mode === 'channel' && this.activeChannel?.backendId === channelId) {
      const senderIds = [...new Set((snap.messages || []).map((m) => m.senderUserId))];
      this.loadUserDirectory(senderIds, () => {
        this.loadMemberAvatars(senderIds);
        this.buildAndRenderMessages(
          this.activeChannel!,
          snap.messages || [],
          snap.reactions || [],
          snap.attachments || [],
          snap.readStates || [],
          true,
        );
      });
      return;
    }
    if (mode === 'dm' && this.activeDmContact?.dmChannelId === channelId) {
      const senderIds = [...new Set((snap.messages || []).map((m) => m.senderUserId))];
      const activeContact = this.activeDmContact;
      this.loadUserDirectory(senderIds, () => {
        this.loadMemberAvatars(senderIds);
        this.dmMessages[activeContact.id] = this.buildMessageList(
          snap.messages || [],
          snap.reactions || [],
          snap.attachments || [],
        );
        this.updateDmConversationMeta(activeContact, this.dmMessages[activeContact.id]);
        this.buildReadStateMap(snap.messages || [], snap.readStates || []);
        this.applyReadStateToMessages(this.dmMessages[activeContact.id]);
        this.lastMessageBackendId = snap.messages?.length
          ? snap.messages[snap.messages.length - 1].id
          : null;
        this.cdr.detectChanges();
      });
    }
  }

  private currentHistoryLimit(channelId: number): number {
    return this.channelHistoryLimit.get(channelId) || this.INITIAL_CHAT_HISTORY_LIMIT;
  }

  private shouldAutoScrollFeed(): boolean {
    const el = this.feedEl?.nativeElement;
    if (!el) {
      return true;
    }
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom <= 120;
  }

  private snapshotRequestKey(channelId: number, recentMessageLimit: number): string {
    return `${channelId}:${recentMessageLimit}`;
  }

  private async handleForbiddenDmSnapshot(
    contact: DmContact,
    channelId: number,
  ): Promise<void> {
    const repairKey = this.dmMembershipRepairKey(contact, channelId);
    const detail =
      this.channelSnapshotLastErrorMessage.get(channelId) ||
      'You do not currently have access to this direct conversation.';

    if (this.dmMembershipRepairInFlight.has(repairKey)) {
      return;
    }

    if (this.dmMembershipRepairAttempted.has(repairKey)) {
      this.messagesLoading = false;
      this.lastMessageBackendId = null;
      this.readStateMap = {};
      this.dmMessages[contact.id] = this.dmMessages[contact.id] ?? [];
      this.conversationAccessMessage = '';
      contact.dmChannelId = undefined;
      contact.dmChannelIds = undefined;
      this.cdr.detectChanges();
      return;
    }

    this.dmMembershipRepairAttempted.add(repairKey);
    this.dmMembershipRepairInFlight.add(repairKey);
    this.conversationAccessMessage = '';
    contact.dmChannelId = undefined;
    contact.dmChannelIds = undefined;
    this.channelSnapshotFailureUntil.delete(channelId);
    this.channelSnapshotLastErrorStatus.delete(channelId);
    this.channelSnapshotLastErrorMessage.delete(channelId);
    this.cdr.detectChanges();

    this.dmMembershipRepairInFlight.delete(repairKey);
    this.getOrCreateDmChannel(contact);
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
    const ts = this.messageTimestamp(latest);
    if (ts) {
      contact.lastMessageTimestamp = ts;
      try { localStorage.setItem(`dm_ts_${contact.userId}`, String(ts)); } catch (_) {}
    }
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

  private scrollToLatestMessageSoon(): void {
    this.scrollFeed = true;
    setTimeout(() => {
      this.scrollFeed = true;
      this.cdr.detectChanges();
      this.highlightLatestActiveMessageSoon();
    }, 120);
  }

  private highlightLatestActiveMessageSoon(): void {
    setTimeout(() => {
      const latest = this.findLatestMessage(this.rawMessages || []);
      if (!latest) return;
      this.flashId = latest.id;
      clearTimeout(this.flashTimer);
      const el = document.getElementById('msg-' + latest.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      this.cdr.detectChanges();
      this.flashTimer = setTimeout(() => {
        this.flashId = null;
        this.cdr.detectChanges();
      }, 1800);
    }, 180);
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
        this.employeeUserId(e) != null &&
        !memberUserIds.has(Number(this.employeeUserId(e))) &&
        !bannedUserIds.has(Number(this.employeeUserId(e))) &&
        Number(this.employeeUserId(e)) !== this.me.userId,
    );
  }

  get modalEmployees(): EmployeeProfile[] {
    return this.allEmployees.filter(
      (e) => this.employeeUserId(e) != null && Number(this.employeeUserId(e)) !== this.me.userId,
    );
  }

  private employeeUserId(employee: EmployeeProfile): number | null {
    const userId = employee.userId ?? employee.user?.userId ?? employee.user?.id ?? null;
    return userId == null ? null : Number(userId);
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

  getReadUsers(msg: Message): string[] {
    if (!msg.backendId) return [];
    return (this.readStateMap[msg.backendId] || [])
      .filter((uid) => uid !== this.me.userId)
      .map((uid) => this.userDirectory[uid] || `User ${uid}`);
  }

  getReadUserCards(msg: Message): HoverPerson[] {
    if (!msg.backendId) return [];
    return (this.readStateMap[msg.backendId] || [])
      .filter((uid) => uid !== this.me.userId)
      .map((uid) => {
        const name = this.userDirectory[uid] || `User ${uid}`;
        return {
          name,
          avatarUrl: this.userAvatarCache[uid],
          initials: initialsFrom(name),
        } as HoverPerson;
      });
  }

  getMentionCandidates(): Array<{ userId: number; label: string }> {
    const candidates = new Map<number, string>();
    const add = (userId: number | null | undefined, label: string | null | undefined) => {
      const normalizedId = Number(userId || 0);
      const normalizedLabel = (label || '').trim();
      if (!normalizedId || !normalizedLabel || candidates.has(normalizedId)) return;
      candidates.set(normalizedId, normalizedLabel);
    };

    this.allEmployees.forEach((employee) => {
      const userId = Number(employee.user?.userId || employee.user?.id || employee.id || 0);
      add(userId, this.feedMentionLabel(employee));
    });

    this.dmContacts.forEach((contact) => add(contact.userId, contact.fullName));
    this.channelMembers.forEach((member) => add(member.userId, this.getMemberName(member.userId)));
    Object.entries(this.userDirectory).forEach(([userId, name]) => add(Number(userId), name));

    return Array.from(candidates.entries())
      .map(([userId, label]) => ({ userId, label }))
      .sort((a, b) => b.label.length - a.label.length);
  }

  resolveMentionProfileCard = (payload: { userId?: number; handle?: string }): MentionProfileCard | null => {
    const explicitUserId = Number(payload?.userId || 0);
    const normalizedHandle = (payload?.handle || '').replace(/^@/, '').trim().toLowerCase();

    const findEmployeeByUserId = (userId: number): EmployeeProfile | undefined =>
      this.allEmployees.find(
        (employee) =>
          Number(employee.user?.userId || employee.user?.id || employee.id || 0) === userId ||
          Number(employee.id || 0) === userId,
      );

    let userId = explicitUserId;
    let employee = userId ? findEmployeeByUserId(userId) : undefined;

    if (!employee && normalizedHandle) {
      employee = this.allEmployees.find((candidate) =>
        this.feedMentionLabel(candidate).trim().toLowerCase() === normalizedHandle ||
        (candidate.user?.fullname || '').trim().toLowerCase() === normalizedHandle ||
        (candidate.user?.username || '').trim().toLowerCase() === normalizedHandle
      );
      if (employee) {
        userId = Number(employee.user?.userId || employee.user?.id || employee.id || 0);
      }
    }

    if (!userId && normalizedHandle) {
      const matchedEntry = Object.entries(this.userDirectory).find(
        ([, name]) => (name || '').trim().toLowerCase() === normalizedHandle,
      );
      if (matchedEntry) {
        userId = Number(matchedEntry[0]);
      }
    }

    if (!userId) return null;

    const name =
      employee ? this.feedMentionLabel(employee) : this.userDirectory[userId] || payload.handle || `User ${userId}`;
    const updatedAt = this.presenceUpdatedAtMap[userId];
    const lastSeenLabel = this.buildLastSeenLabel(userId, updatedAt);

    return {
      userId,
      name,
      email: employee?.user?.email || employee?.email || this.userEmailCache[userId] || '',
      jobTitle: employee?.jobTitle || '',
      department: employee?.department?.name || '',
      avatarUrl: (employee ? this.getEmpImageUrl(employee) : undefined) || this.userAvatarCache[userId],
      initials: initialsFrom(name),
      online: this.isUserOnline(userId),
      lastSeenLabel,
    };
  };

  private buildLastSeenLabel(userId: number, rawUpdatedAt?: string): string {
    if (this.isUserOnline(userId)) {
      return 'Online now';
    }
    const parsed = parseServerDate(rawUpdatedAt);
    if (!parsed) {
      return 'Last online unavailable';
    }
    const datePart = parsed.toLocaleDateString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timePart = parsed.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `Last online ${datePart} at ${timePart}`;
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
    firstValueFrom(this.collabService.fetchChatAttachmentBlob(attachment.downloadUrl))
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

  downloadDocumentFile(file: ChannelDocumentFile, event: Event): void {
    event.stopPropagation();
    this.docDownloadCounts[file.id] = (this.docDownloadCounts[file.id] || 0) + 1;
    const updated = this.documentFiles.find((f) => f.id === file.id);
    if (updated) {
      updated.downloadCount = this.docDownloadCounts[file.id];
      this.cdr.detectChanges();
    }
    this.collabService.incrementAttachmentDownloadCount(file.id).subscribe({ error: () => {} });
    this.downloadAttachment(
      { name: file.name, downloadUrl: file.downloadUrl },
      event,
    );
  }

  copyFileLink(file: ChannelDocumentFile, event: Event): void {
    event.stopPropagation();
    const url = file.downloadUrl || '';
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      this.copiedFileId = Number(file.id);
      this.cdr.detectChanges();
      setTimeout(() => {
        this.copiedFileId = null;
        this.cdr.detectChanges();
      }, 2000);
    });
  }

  openThreadFromList(msg: Message, event: Event): void {
    event.stopPropagation();
    this.selectedThreadMsg = msg;
    this.threadReplyDraft = '';
    this.cdr.detectChanges();
  }

  closeSelectedThread(): void {
    this.selectedThreadMsg = null;
    this.threadReplyDraft = '';
    this.clearThreadPendingAttachments();
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
    if ((!text && !this.threadPendingAttachments.length) || !rootMsg || this.sendingReply) return;

    const channelId = this.getChannelIdForMsg(rootMsg);
    const ch = this.channels.find((c) => c.id === channelId);
    // Also find DM channel if not a regular channel message
    const dmContact = !ch
      ? this.dmContacts.find((d) =>
          (this.dmMessages[d.id] || []).find((m) => m.id === rootMsg.id),
        )
      : null;
    const backendChId = ch?.backendId ?? dmContact?.dmChannelId;
    const outboundContent =
      text || this.attachmentsPlaceholderText(this.threadPendingAttachments);

    if (!backendChId || !rootMsg.backendId) {
      rootMsg.replies.push(this.makeLocalMsg(outboundContent, this.threadPendingAttachments));
      this.threadReplyDraft = '';
      this.clearThreadPendingAttachments();
      this.selectedThreadMsg = { ...rootMsg };
      this.cdr.detectChanges();
      return;
    }

    this.sendingReply = true;
    const optimistic = this.makeLocalMsg(outboundContent, this.threadPendingAttachments);
    optimistic.replyToMessageId = rootMsg.backendId;
    optimistic.threadRootMessageId = rootMsg.backendId;
    rootMsg.replies = [...rootMsg.replies, optimistic];
    this.selectedThreadMsg = { ...rootMsg, replies: rootMsg.replies };
    const capturedFiles = [...this.threadPendingFiles];
    const capturedAttachments = this.threadPendingAttachments.map((item) => ({ ...item }));
    this.threadReplyDraft = '';
    this.threadPendingFiles = [];
    this.threadPendingAttachments = [];
    this.scrollThread = true;
    this.cdr.detectChanges();

    this.collabService
      .sendMessage({
        channelId: backendChId,
        senderUserId: this.me.userId,
        content: outboundContent,
        messageType: 'TEXT',
        replyToMessageId: rootMsg.backendId,
        threadRootMessageId: rootMsg.backendId,
      })
      .subscribe({
        next: (saved) => {
          optimistic.backendId = saved.id;
          optimistic.id = `backend-${saved.id}`;
          this.sendingReply = false;
          if (capturedFiles.length && capturedAttachments.length) {
            const fakeCh: Channel = {
              id: ch?.id || `thread-${backendChId}`,
              backendId: backendChId,
              name: ch?.name || dmContact?.fullName || '',
            };
            this.uploadAttachmentsForMessage(
              fakeCh,
              saved.id,
              capturedFiles,
              capturedAttachments,
              optimistic,
            );
          }
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

  onThreadFilesSelected(files: File[]): void {
    for (const file of files) {
      this.threadPendingFiles.push(file);
      this.threadPendingAttachments.push({
        name: file.name,
        size: formatFileSize(file.size),
        type: this.normalizeAttachmentType(file.type, file.name),
        previewUrl: this.isImageType(file.type) ? URL.createObjectURL(file) : undefined,
      });
    }
    this.cdr.detectChanges();
  }

  removeThreadPendingAttachment(index: number): void {
    const [removed] = this.threadPendingAttachments.splice(index, 1);
    this.threadPendingFiles.splice(index, 1);
    if (removed?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(removed.previewUrl);
    }
    this.cdr.detectChanges();
  }

  private clearThreadPendingAttachments(): void {
    this.threadPendingAttachments.forEach((attachment) => {
      if (attachment.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    });
    this.threadPendingFiles = [];
    this.threadPendingAttachments = [];
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
      mediaType: this.normalizeFeedMediaType(
        item.mediaType,
        item.contentType,
        item.fileName || item.url,
      ),
      url: item.url,
      thumbnailUrl: item.thumbnailUrl || item.url,
      caption: item.caption,
      fileName: item.fileName,
      contentType: item.contentType,
      fileSize: item.fileSize,
    }));
  }

  private normalizeFeedMediaType(
    mediaType?: string,
    contentType?: string,
    fileNameOrUrl?: string,
  ): string {
    const upperType = (mediaType || '').toUpperCase();
    if (
      upperType === 'IMAGE' ||
      upperType === 'VIDEO' ||
      upperType === 'PDF' ||
      upperType === 'FILE'
    ) {
      return upperType;
    }
    if (this.isImageType(contentType) || this.looksLikeImageFile(fileNameOrUrl)) {
      return 'IMAGE';
    }
    if (
      (contentType || '').startsWith('video/') ||
      this.looksLikeVideoFile(fileNameOrUrl)
    ) {
      return 'VIDEO';
    }
    if (
      (contentType || '').toLowerCase() === 'application/pdf' ||
      this.looksLikePdfFile(fileNameOrUrl)
    ) {
      return 'PDF';
    }
    return 'FILE';
  }

  private mapMediaType(contentType?: string): string {
    if (this.isImageType(contentType)) return 'IMAGE';
    if ((contentType || '').startsWith('video/')) return 'VIDEO';
    return 'FILE';
  }

  private normalizeAttachmentType(contentType?: string, fileName?: string): string {
    if (contentType && contentType !== 'application/octet-stream') return contentType;
    const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
      return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    }
    if (['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v'].includes(ext)) {
      return `video/${ext === 'mov' ? 'quicktime' : ext}`;
    }
    if (ext === 'pdf') {
      return 'application/pdf';
    }
    if (ext === 'doc') {
      return 'application/msword';
    }
    if (ext === 'docx') {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (ext === 'ppt') {
      return 'application/vnd.ms-powerpoint';
    }
    if (ext === 'pptx') {
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    }
    if (ext === 'xls') {
      return 'application/vnd.ms-excel';
    }
    if (ext === 'xlsx') {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    return 'application/octet-stream';
  }

  private attachmentsPlaceholderText(
    attachments: Array<{ name: string; type?: string }> | null | undefined,
  ): string {
    if (!attachments?.length) return '(attachment)';
    if (attachments.length === 1) {
      const attachment = attachments[0];
      if (this.isImageType(attachment.type)) {
        return `Image: ${attachment.name}`;
      }
      if ((attachment.type || '').startsWith('video/')) {
        return `Video: ${attachment.name}`;
      }
      return `Attachment: ${attachment.name}`;
    }
    const imageCount = attachments.filter((attachment) =>
      this.isImageType(attachment.type),
    ).length;
    if (imageCount === attachments.length) {
      return `${attachments.length} images`;
    }
    return `${attachments.length} attachments`;
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
    if (!att.downloadUrl) return undefined;
    const type = this.normalizeAttachmentType(
      att.contentType,
      att.fileName || att.originalFileName || att.name || att.downloadUrl,
    );
    const isPreviewable =
      this.isImageType(type) ||
      type === 'application/pdf' ||
      /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(
        String(att.fileName || att.originalFileName || att.name || ''),
      );
    if (!isPreviewable) return undefined;
    const key = att.downloadUrl || `${att.messageId}-${att.fileName}`;
    if (this.attachmentPreviewCache[key]) {
      return this.attachmentPreviewCache[key];
    }
    if (!this.attachmentPreviewLoading.has(key) && !this.attachmentPreviewFailed.has(key) && att.downloadUrl) {
      this.attachmentPreviewLoading.add(key);
      this.fetchAttachmentBlobUrl(att.downloadUrl)
        .then((url) => {
          this.attachmentPreviewCache[key] = url;
          this.syncAttachmentPreviewUrls(key, url);
        })
        .catch(() => {
          this.attachmentPreviewFailed.add(key);
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
        if (message.attachments?.length) {
          for (const attachment of message.attachments) {
            const attachmentKey =
              attachment.downloadUrl ||
              `${message.backendId || message.id}-${attachment.name}`;
            if (attachmentKey === key) {
              attachment.previewUrl = previewUrl;
            }
          }
        }
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
    const blob = await firstValueFrom(
      this.collabService.fetchChatAttachmentBlob(downloadUrl),
    ).catch((err) => { throw err; });
    return URL.createObjectURL(blob);
  }

  private resolveProtectedMediaUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('blob:')) return url;
    if (/^https?:\/\//i.test(url) && !url.includes('/x/api/v2/')) {
      return url;
    }
    if (this.protectedMediaUrlCache[url]) {
      return this.protectedMediaUrlCache[url];
    }
    if (!this.protectedMediaLoading.has(url)) {
      this.protectedMediaLoading.add(url);
      this.fetchAttachmentBlobUrl(url)
        .then((blobUrl) => {
          this.protectedMediaUrlCache[url] = blobUrl;
          this.cdr.detectChanges();
        })
        .catch(() => {})
        .finally(() => {
          this.protectedMediaLoading.delete(url);
        });
    }
    return '';
  }

  private preloadFeedMediaUrls(posts: CollabFeedPost[]): void {
    for (const post of posts || []) {
      for (const media of post.mediaItems || []) {
        if (media.url) {
          this.resolveProtectedMediaUrl(media.url);
        }
        if (media.thumbnailUrl) {
          this.resolveProtectedMediaUrl(media.thumbnailUrl);
        }
      }
      for (const comment of post.recentComments || []) {
        for (const media of comment.mediaItems || []) {
          if (media.url) {
            this.resolveProtectedMediaUrl(media.url);
          }
          if (media.thumbnailUrl) {
            this.resolveProtectedMediaUrl(media.thumbnailUrl);
          }
        }
      }
    }
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
    attachments?: Array<{
      name: string;
      size: string;
      type: string;
      previewUrl?: string;
    }>,
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
    if (attachments?.length) {
      msg.attachments = attachments.map((attachment) => ({ ...attachment }));
      msg.attachment = msg.attachments[0];
    }
    return msg;
  }

  retryFailedMessage(msg: Message): void {
    if (!msg.retryMeta || msg.deliveryState !== 'FAILED') {
      return;
    }
    msg.deliveryState = 'SENDING';
    this.cdr.detectChanges();
    const retryMeta = msg.retryMeta;
    this.collabService
      .sendMessage({
        channelId: retryMeta.backendChannelId,
        senderUserId: this.me.userId,
        content: retryMeta.content,
        messageType: 'TEXT',
        replyToMessageId: retryMeta.replyToMessageId,
        threadRootMessageId: retryMeta.threadRootMessageId,
      })
      .subscribe({
        next: (saved) => {
          msg.backendId = saved.id;
          msg.id = `backend-${saved.id}`;
          msg.deliveryState = 'DELIVERED';
          const files = retryMeta.files || [];
          const attachments = retryMeta.attachments || [];
          msg.retryMeta = undefined;
          if (files.length && attachments.length) {
            this.uploadAttachmentsForMessage(
              {
                id: this.activeChannelId || `dm-${retryMeta.backendChannelId}`,
                backendId: retryMeta.backendChannelId,
                name: this.activeChannel?.name || this.activeDmContact?.fullName || '',
              },
              saved.id,
              files,
              attachments,
              msg,
            );
          } else {
            this.cdr.detectChanges();
          }
        },
        error: () => {
          msg.deliveryState = 'FAILED';
          this.cdr.detectChanges();
        },
      });
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

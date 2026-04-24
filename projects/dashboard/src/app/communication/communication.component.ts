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
} from '../ui/services/collaboration.service';

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
  };
  isSystem?: boolean;
  senderUserId?: number;
  replyToMessageId?: number;
  threadRootMessageId?: number;
  deleting?: boolean;
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

/**
 * FIX #2 (Timezone): Parse server dates correctly as UTC.
 * The backend sends Java LocalDateTime arrays which are in UTC.
 * Using Date.UTC() ensures correct conversion to the user's local timezone.
 */
function parseServerDate(raw: string | number[] | undefined): Date | null {
  if (!raw) return null;
  let d: Date;
  if (Array.isArray(raw)) {
    // Backend sends UTC values — use Date.UTC so browser converts to local tz
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
    // If no timezone info, assume UTC (backend sends UTC)
    if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(s)) {
      s += 'Z';
    }
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

  // ── Me ──────────────────────────────────────────────
  me = {
    name: 'Loading…',
    shortName: 'Loading…',
    initials: '??',
    avatarColor: '#2e6276',
    userId: 0,
    avatarUrl: '',
  };

  // ── View state ──────────────────────────────────────
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

  // ── Composer ─────────────────────────────────────────
  draft = '';
  threadReplyDraft = '';
  pendingFile: File | null = null;
  pendingAttachment: { name: string; size: string; type: string } | null = null;
  sendingMessage = false;
  sendingReply = false;
  uploadingAttachment = false;

  // ── Edit / Delete ────────────────────────────────────
  editingMessageId: string | null = null;
  editDraft = '';
  savingEdit = false;
  confirmDeleteId: string | null = null;
  deletingIds = new Set<string>();
  reactingIds = new Set<string>();

  // ── AI ───────────────────────────────────────────────
  showAiToolbar = false;
  aiOutput = { visible: false, loading: false, title: '', content: '' };
  voiceListening = false;
  voiceSupported = false;
  private voiceFinalTranscript = '';
  private voiceManualStop = false;
  private recognition: any = null;

  // ── Modals ───────────────────────────────────────────
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

  // ── Layout ───────────────────────────────────────────
  sidebarWidth = 240;
  threadPanelWidth = 380;
  readonly SIDEBAR_MIN = 200;
  readonly SIDEBAR_MAX = 340;
  readonly THREAD_MIN = 300;
  readonly THREAD_MAX = 560;
  isResizingSidebar = false;
  isResizingThread = false;
  private resizeStartX = 0;
  private resizeStartWidth = 0;

  // ── Data ─────────────────────────────────────────────
  channels: Channel[] = [];
  dmContacts: DmContact[] = [];
  allEmployees: EmployeeProfile[] = [];
  channelMessages: Record<string, Message[]> = {};
  dmMessages: Record<string, Message[]> = {};
  channelMembers: CollabMember[] = [];
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
  private flashId: string | null = null;
  private flashTimer: any;
  private scrollFeed = false;
  private scrollThread = false;

  // ── WebSocket ─────────────────────────────────────────
  private stompClient: any = null;
  private wsConnected = false;
  private channelSub: any = null;
  private channelPresenceSub: any = null;
  private dmChannelSubs = new Map<number, any>();
  private dmPresenceSubs = new Map<number, any>();

  constructor(
    private cdr: ChangeDetectorRef,
    private collabService: CollaborationService,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────

  ngOnInit() {
    this.checkVoiceSupport();
    this.loadCurrentUser();
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
    client.onStompError = (frame: any) => console.error('STOMP ERROR:', frame);
    client.onWebSocketError = (err: any) => console.error('WS ERROR:', err);
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
        try { s.unsubscribe(); } catch (_) {}
      });
      this.dmChannelSubs.clear();
      this.dmPresenceSubs.forEach((s) => {
        try { s.unsubscribe(); } catch (_) {}
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
      try { this.channelSub.unsubscribe(); } catch (_) {}
    }
    if (this.channelPresenceSub) {
      try { this.channelPresenceSub.unsubscribe(); } catch (_) {}
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
          // Not the active channel — only increment unread for others' messages
          if (!isOwnMessage) {
            ch.unreadCount = (ch.unreadCount || 0) + 1;
            ch.hasUnread = true;
            this.playNotificationSound();
          }
          this.cdr.detectChanges();
        } else {
          // FIX #1 (Duplicates): Skip re-fetch for own messages on active channel.
          // Our optimistic message is already in the list; the WS event is redundant.
          if (isOwnMessage) return;
          this.fetchAndAppendNewMessages(ch);
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
            }
            this.cdr.detectChanges();
          } else {
            // FIX #1 (Duplicates): Skip re-fetch for own DM messages too
            if (isOwnMessage) return;
            this.fetchAndAppendNewDmMessages(contact, chId);
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
        this.userDirectory[userId] = fullName;
        if (emp.employeeMedia?.mediaNo) {
          this.collabService
            .fetchEmployeeImageBlob(emp.employeeMedia.mediaNo)
            .then((url) => {
              this.me = { ...this.me, avatarUrl: url };
              this.userAvatarCache[userId] = url;
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
        this.employeesLoading = false;
        this.cdr.detectChanges();
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
    if (this.channels.length > 0 && !this.activeChannelId)
      this.selectChannel(this.channels[0].id);
    this.cdr.detectChanges();
  }

  // ── Channel management ────────────────────────────────

  openCreateChannelModal(): void {
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
    if (!ch || ch.createdBy !== this.me.userId) return;
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
        this.channelMembers = members;
        this.channelMembersLoading = false;
        this.loadMemberAvatars(members.map((m) => m.userId));
        this.cdr.detectChanges();
      },
      error: () => {
        this.channelMembersLoading = false;
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
    if (!ch) return;
    this.collabService.addChannelMember(ch.backendId, userId).subscribe({
      next: (m) => {
        this.channelMembers.push(m);
        this.loadMemberAvatars([userId]);
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  removeMemberFromChannel(member: CollabMember, e?: Event): void {
    e?.stopPropagation();
    if (!member.id) return;
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

  makeChannelOwner(userId: number): void {
    const ch = this.activeChannel;
    if (
      !ch ||
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

  selectChannel(id: string): void {
    this.cancelEdit();
    this.confirmDeleteId = null;
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

  selectDm(contactId: string): void {
    this.cancelEdit();
    this.confirmDeleteId = null;
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
    this.messagesLoading = true;
    this.cdr.detectChanges();
    this.getOrCreateDmChannel(contact);
  }

  setView(v: 'threads'): void {
    this.activeView = v;
    this.activeThreadId = null;
    this.activeThreadReplyToId = null;
    this.selectedThreadMsg = null;
    this.showPinnedPanel = false;
    this.showChannelDetails = false;
    this.cancelEdit();
    this.confirmDeleteId = null;
    for (const ch of this.channels) {
      if (this.channelMessages[ch.id] === undefined) {
        this.loadChannelMessages(ch);
      }
    }
    this.cdr.detectChanges();
  }

  // ── DM ────────────────────────────────────────────────

  private getOrCreateDmChannel(contact: DmContact): void {
    if (contact.dmChannelId) {
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
          this.buildDmMessages(
            contact,
            snap.messages,
            snap.reactions || [],
            snap.attachments || [],
          );
        });
      },
      error: () => {
        this.messagesLoading = false;
        this.dmMessages[contact.id] = [];
        this.cdr.detectChanges();
      },
    });
  }

  private buildDmMessages(
    contact: DmContact,
    messages: CollabMessage[],
    reactions: any[],
    attachments: any[],
  ): void {
    const built = this.buildMessageList(messages, reactions, attachments);
    this.dmMessages[contact.id] = built;
    this.scrollFeed = true;
    this.cdr.detectChanges();
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
      };
      if (att)
        msg.attachment = {
          name: att.fileName,
          size: '',
          type: undefined,
          downloadUrl: att.downloadUrl,
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

    this.readStateMap = {};
    for (const rs of readStates) {
      if (rs.userId == null || rs.lastReadMessageId == null) continue;
      const lastId = Number(rs.lastReadMessageId);
      for (const m of messages) {
        if (m.id <= lastId) {
          if (!this.readStateMap[m.id]) this.readStateMap[m.id] = [];
          this.readStateMap[m.id].push(Number(rs.userId));
        }
      }
    }

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
    this.subscribeToChannel(channel.backendId);
    this.scrollFeed = true;
    this.cdr.detectChanges();
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
      const ctx = new AudioCtx(),
        osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
      osc.onended = () => ctx.close();
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
          // Assign the real backend ID to the optimistic message so dedup works
          optimistic.backendId = saved.id;
          optimistic.id = `backend-${saved.id}`;
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
          // Assign real backend ID so dedup works
          optimistic.backendId = saved.id;
          optimistic.id = `backend-${saved.id}`;
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
          } else {
            this.cdr.detectChanges();
          }
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
    meta: { name: string; size: string; type: string },
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
    this.pendingFile = file;
    this.pendingAttachment = {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
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
    const ch = this.activeChannel;
    this.collabService
      .editMessage(msg.backendId, {
        channelId: ch?.backendId ?? 0,
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
    for (const ch of this.channels) {
      const list = this.channelMessages[ch.id] ?? [];
      const idx = list.findIndex((m) => m.id === msg.id);
      if (idx !== -1) {
        list.splice(idx, 1);
        return;
      }
      for (const root of list) {
        const ri = root.replies.findIndex((r) => r.id === msg.id);
        if (ri !== -1) {
          root.replies.splice(ri, 1);
          return;
        }
      }
    }
    for (const dm of this.dmContacts) {
      const list = this.dmMessages[dm.id] ?? [];
      const idx = list.findIndex((m) => m.id === msg.id);
      if (idx !== -1) {
        list.splice(idx, 1);
        return;
      }
    }
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

  sendReply(): void {
    const text = this.threadReplyDraft.trim(),
      rootMsg = this.activeThread;
    if (!text || !rootMsg || this.sendingReply) return;
    const channel = this.activeChannel;
    const replyTarget = this.activeThreadReplyToId
      ? (this.findMsgInTree(rootMsg.replies, this.activeThreadReplyToId) ??
        rootMsg)
      : rootMsg;
    const threadRootId = rootMsg.backendId,
      replyToId = replyTarget.backendId ?? rootMsg.backendId;

    if (this.activeView === 'dm' || !channel?.backendId || !rootMsg.backendId) {
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
        channelId: channel.backendId,
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
        this.collabService.getChannelSnapshot(ch.backendId).subscribe({
          next: (snap) => this.refreshReactionCounts(ch, snap.reactions || []),
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
        ) {
          this.searchResults.push({
            msg,
            channelId: ch.id,
            channelName: ch.name,
          });
        }
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
    return this.activeView === 'dm'
      ? this.dmMessages[this.activeDmId] || []
      : this.channelMessages[this.activeChannelId] || [];
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
    return this.allEmployees.filter(
      (e) =>
        e.user?.userId != null &&
        !memberUserIds.has(Number(e.user.userId)) &&
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
    const text = this.threadReplyDraft.trim();
    const rootMsg = this.selectedThreadMsg;
    if (!text || !rootMsg || this.sendingReply) return;

    const channelId = this.getChannelIdForMsg(rootMsg);
    const ch = this.channels.find((c) => c.id === channelId);
    if (!ch?.backendId || !rootMsg.backendId) {
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

    this.collabService.sendMessage({
      channelId: ch.backendId,
      senderUserId: this.me.userId,
      content: text,
      messageType: 'TEXT',
      replyToMessageId: rootMsg.backendId,
      threadRootMessageId: rootMsg.backendId,
    }).subscribe({
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
    attachment?: { name: string; size: string; type: string },
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
    };
    if (attachment) msg.attachment = attachment;
    return msg;
  }

  /**
   * FIX #3 (Delete sync) + FIX #1 (Duplicates):
   * After fetching snapshot, reconcile deletions by removing messages that no
   * longer exist in the server snapshot. Then add only genuinely new messages.
   * Optimistic match uses createdAt timestamp to avoid false deduplication.
   */
  private fetchAndAppendNewMessages(channel: Channel): void {
    this.collabService.getChannelSnapshot(channel.backendId).subscribe({
      next: (snap) => {
        const existing = this.channelMessages[channel.id] || [];
        const snapIds = new Set((snap.messages || []).map((m) => m.id));

        // FIX #3: Remove messages that were deleted on the server
        const beforeCount = existing.length;
        const reconciled = existing.filter(
          (m) => !m.backendId || snapIds.has(m.backendId),
        );
        const removedCount = beforeCount - reconciled.length;
        this.channelMessages[channel.id] = reconciled;

        // Find messages new to us
        const existingBackendIds = new Set(reconciled.map((m) => m.backendId).filter(Boolean));
        const newRaw = (snap.messages || []).filter(
          (m) => !existingBackendIds.has(m.id),
        );

        if (!newRaw.length && removedCount === 0) return;

        if (!newRaw.length) {
          // Only deletions happened — just re-render
          this.channelMessages[channel.id] = [...reconciled];
          this.cdr.detectChanges();
          return;
        }

        const senderIds = [...new Set(newRaw.map((m) => m.senderUserId))];
        this.loadUserDirectory(senderIds, () => {
          this.loadMemberAvatars(senderIds);
          const current = this.channelMessages[channel.id] || [];
          for (const m of newRaw) {
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
            };
            if (m.replyToMessageId) {
              const parent = current.find(
                (p) => p.backendId === m.replyToMessageId,
              );
              if (parent) {
                parent.replies.push(newMsg);
                continue;
              }
            }
            // FIX #1: Tighten optimistic dedup — match on content + sender +
            // recent timestamp (within 30s) to avoid false positives
            const optimisticIdx = current.findIndex(
              (e) =>
                !e.backendId &&
                e.senderUserId === m.senderUserId &&
                e.content === m.content &&
                (Date.now() - e.createdAt.getTime()) < 30_000,
            );
            if (optimisticIdx !== -1) {
              current[optimisticIdx].backendId = m.id;
              current[optimisticIdx].id = `backend-${m.id}`;
            } else {
              current.push(newMsg);
              if (Number(m.senderUserId) !== Number(this.me.userId))
                this.playNotificationSound();
            }
          }
          this.channelMessages[channel.id] = [...current];
          this.scrollFeed = true;
          this.cdr.detectChanges();
        });
      },
      error: () => {},
    });
  }

  /**
   * FIX #3 (Delete sync) + FIX #1 (Duplicates) for DM channels.
   */
  private fetchAndAppendNewDmMessages(
    contact: DmContact,
    channelId: number,
  ): void {
    this.collabService.getChannelSnapshot(channelId).subscribe({
      next: (snap) => {
        const existing = this.dmMessages[contact.id] || [];
        const snapIds = new Set((snap.messages || []).map((m) => m.id));

        // FIX #3: Remove deleted messages
        const beforeCount = existing.length;
        const reconciled = existing.filter(
          (m) => !m.backendId || snapIds.has(m.backendId),
        );
        const removedCount = beforeCount - reconciled.length;
        this.dmMessages[contact.id] = reconciled;

        const existingBackendIds = new Set(reconciled.map((m) => m.backendId).filter(Boolean));
        const newRaw = (snap.messages || []).filter(
          (m) => !existingBackendIds.has(m.id),
        );

        if (!newRaw.length && removedCount === 0) return;

        if (!newRaw.length) {
          this.dmMessages[contact.id] = [...reconciled];
          this.cdr.detectChanges();
          return;
        }

        const senderIds = [...new Set(newRaw.map((m) => m.senderUserId))];
        this.loadUserDirectory(senderIds, () => {
          const current = this.dmMessages[contact.id] || [];
          for (const m of newRaw) {
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
            };
            // FIX #1: Tighten optimistic dedup with timestamp guard
            const optimisticIdx = current.findIndex(
              (e) =>
                !e.backendId &&
                e.senderUserId === m.senderUserId &&
                e.content === m.content &&
                (Date.now() - e.createdAt.getTime()) < 30_000,
            );
            if (optimisticIdx !== -1) {
              current[optimisticIdx].backendId = m.id;
              current[optimisticIdx].id = `backend-${m.id}`;
            } else {
              current.push(newMsg);
              if (Number(m.senderUserId) !== Number(this.me.userId))
                this.playNotificationSound();
            }
          }
          this.dmMessages[contact.id] = [...current];
          this.scrollFeed = true;
          this.cdr.detectChanges();
        });
      },
      error: () => {},
    });
  }

  private extractSubjectAndBody(content: string): {
    subject: string;
    body: string;
  } {
    const lines = content.trim().split('\n');
    let subject = '';
    let bodyStartIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const subjectMatch = line.match(/^Subject:\s*(.+)$/i);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        bodyStartIndex = i + 1;
        while (bodyStartIndex < lines.length && !lines[bodyStartIndex].trim()) {
          bodyStartIndex++;
        }
      }
      break;
    }
    const body = lines.slice(bodyStartIndex).join('\n').trim();
    return { subject, body };
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
      subject: subject,
      body: body,
      sending: false,
      result: '',
      width: Math.min(640, window.innerWidth - 80),
    };
    this.cdr.detectChanges();
  }
}
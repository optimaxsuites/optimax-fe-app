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
  CollabMember,
  CollaborationService,
  EmployeeProfile,
  AiRewriteResponse,
  AiSubjectResponse,
  AiSummaryResponse,
  AiEmailComposeResponse,
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
  jobTitle?: string;
  department?: string;
  online: boolean;
  hasUnread?: boolean;
  dmChannelId?: number;
}

export interface AiOutput {
  visible: boolean;
  loading: boolean;
  title: string;
  content: string;
  rawJson?: string;
}

export interface ChannelModal {
  open: boolean;
  mode: 'create' | 'edit';
  name: string;
  description: string;
  channelType: 'PUBLIC' | 'PRIVATE';
  selectedUserIds: number[];
  saving: boolean;
  error: string;
  editingChannelId?: number;
  editingCreatedBy?: number;
}

export interface EmailModal {
  open: boolean;
  to: string;
  subject: string;
  body: string;
  sending: boolean;
  result: string;
}

// ─────────────────────────────────────────────────────
//  Module-level helpers (private, not exposed to template)
// ─────────────────────────────────────────────────────
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

function _colorFor(seed: number): string {
  return AVATAR_COLORS[Math.abs(seed) % AVATAR_COLORS.length];
}

function initialsFrom(name: string): string {
  const p = (name || '').trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return `${p[0][0]}${p[1][0]}`.toUpperCase();
  if (p.length === 1 && p[0].length >= 2) return p[0].slice(0, 2).toUpperCase();
  return 'U?';
}

function parseServerDate(raw: string | number[] | undefined): Date | null {
  if (!raw) return null;
  let d: Date;
  if (Array.isArray(raw)) {
    d = new Date(
      raw[0] as number,
      ((raw[1] as number) || 1) - 1,
      (raw[2] as number) || 1,
      (raw[3] as number) || 0,
      (raw[4] as number) || 0,
      (raw[5] as number) || 0,
    );
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
  const diffMs = Math.max(0, Date.now() - d.getTime());
  const secs = Math.floor(diffMs / 1000);
  if (secs < 10) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 2) return `${hrs}h ago`;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatSentAt(sentAt: string | number[] | undefined): string {
  return formatRelativeTime(sentAt);
}

function getDayLabelFn(raw: string | number[] | undefined): string {
  const d = parseServerDate(raw);
  if (!d) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - msgDay.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ─────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────
@Component({
  selector: 'app-communication',
  templateUrl: './communication.component.html',
  styleUrls: ['./communication.component.scss'],
})
export class CommunicationComponent
  implements OnInit, AfterViewChecked, OnDestroy
{
  @ViewChild('feedEl') feedEl!: ElementRef<HTMLDivElement>;
  @ViewChild('composerEl') composerEl!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('threadEl') threadEl!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  me = {
    name: 'Loading…',
    shortName: 'Loading…',
    initials: '??',
    avatarColor: '#2e6276',
    userId: 0,
    avatarUrl: '',
  };

  activeView: 'channel' | 'dm' | 'threads' = 'channel';
  activeChannelId = '';
  activeDmId = '';
  activeThreadId: string | null = null;
  activeThreadReplyToId: string | null = null;
  showPinnedPanel = false;
  threadReplyDraft = '';
  draft = '';
  searchQuery = '';
  searchResults: { msg: Message; channelId: string; channelName: string }[] =
    [];
  showSearch = false;

  pendingFile: File | null = null;
  pendingAttachment: { name: string; size: string; type: string } | null = null;

  // ── Loading ───────────────────────────────────────────
  channelsLoading = true;
  channelsError: string | null = null;
  employeesLoading = true;
  employeesError: string | null = null;
  messagesLoading = false;
  sendingMessage = false;
  sendingReply = false;
  uploadingAttachment = false;
  reactingIds = new Set<string>();

  // ── Edit / Delete ─────────────────────────────────────
  editingMessageId: string | null = null;
  editDraft = '';
  savingEdit = false;
  confirmDeleteId: string | null = null;
  deletingIds = new Set<string>();

  // ── Presence & typing ─────────────────────────────────
  presenceMap: Record<number, string> = {};
  typingMap: Record<number, boolean> = {};
  private typingTimer: any = null;
  private presencePollTimer: any = null;
  private presenceChannelId: number | null = null;
  soundEnabled = true;

  // ── Channel manage panel ──────────────────────────────
  showChannelDetails = false;
  channelMembers: CollabMember[] = [];
  channelMembersLoading = false;

  // ── Channel create/edit modal ─────────────────────────
  channelModal: ChannelModal = {
    open: false,
    mode: 'create',
    name: '',
    description: '',
    channelType: 'PUBLIC',
    selectedUserIds: [],
    saving: false,
    error: '',
  };

  // ── Email modal ───────────────────────────────────────
  emailModal: EmailModal = {
    open: false,
    to: '',
    subject: '',
    body: '',
    sending: false,
    result: '',
  };

  // ── AI toolbar ────────────────────────────────────────
  showAiToolbar = false;
  aiOutput: AiOutput = {
    visible: false,
    loading: false,
    title: '',
    content: '',
  };
  voiceListening = false;
  voiceSupported = false;
  private voiceFinalTranscript = '';
  private voiceManualStop = false;
  private recognition: any = null;

  // ── Resize ────────────────────────────────────────────
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

  private scrollFeed = false;
  private scrollThread = false;
  private flashId: string | null = null;
  private flashTimer: any;

  // ── Data ─────────────────────────────────────────────
  channels: Channel[] = [];
  dmContacts: DmContact[] = [];
  allEmployees: EmployeeProfile[] = [];
  private userDirectory: Record<number, string> = {};
  private imageCache: Record<string, string> = {};

  channelMessages: Record<string, Message[]> = {};
  dmMessages: Record<string, Message[]> = {};
  private lastMessageBackendId: number | null = null;

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
    if (this.recognition) {
      try {
        this.voiceManualStop = true;
        this.recognition.stop();
      } catch (_) {}
    }
    Object.values(this.imageCache).forEach((url) => URL.revokeObjectURL(url));
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

  // ─────────────────────────────────────────────────────
  //  FIX: Template-accessible wrapper for colorFor helper
  // ─────────────────────────────────────────────────────
  colorFor(seed: number): string {
    return _colorFor(seed);
  }

  // ── Voice ─────────────────────────────────────────────
  private checkVoiceSupport(): void {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    this.voiceSupported =
      Boolean(SR) && !/firefox/i.test(navigator.userAgent || '');
  }

  // ── Current user ─────────────────────────────────────
  private loadCurrentUser(): void {
    const userId = Number(sessionStorage.getItem('userid') || 0);
    if (!userId) return;
    this.me.userId = userId;
    this.collabService.getEmployeeByUserId(userId).subscribe({
      next: (emp) => {
        const first = emp.firstName || '';
        const last = emp.lastName || '';
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
              this.cdr.detectChanges();
            })
            .catch(() => {});
        }
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  // ── Employees / DM contacts ──────────────────────────

  private loadEmployees(): void {
    this.employeesLoading = true;
    this.employeesError = null;
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
            const first = e.firstName || '';
            const last = e.lastName || '';
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
              jobTitle: e.jobTitle,
              department: e.department?.name,
              online: false,
            };
            if (e.employeeMedia?.mediaNo) {
              const mediaNo = e.employeeMedia.mediaNo;
              if (this.imageCache[mediaNo]) {
                contact.avatarUrl = this.imageCache[mediaNo];
              } else {
                this.collabService
                  .fetchEmployeeImageBlob(mediaNo)
                  .then((url) => {
                    this.imageCache[mediaNo] = url;
                    const c = this.dmContacts.find((d) => d.id === contact.id);
                    if (c) {
                      c.avatarUrl = url;
                      this.cdr.detectChanges();
                    }
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

  // ── Channels ──────────────────────────────────────────

  private loadChannels(): void {
    this.channelsLoading = true;
    this.channelsError = null;
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
        const isDm =
          desc.startsWith('dm between') ||
          desc.startsWith('direct chat') ||
          name.match(/^dm-\d+-\d+$/) !== null;
        return !isDm;
      })
      .map((c) => {
        const backendId = Number(c.channelId ?? c.id);
        return {
          id: String(backendId),
          backendId,
          name: c.name,
          description: c.description,
          channelType: c.channelType,
          createdBy: c.createdBy,
          hasUnread: (c.unreadCount ?? 0) > 0,
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

  toggleMemberInModal(userId: number): void {
    const idx = this.channelModal.selectedUserIds.indexOf(userId);
    if (idx === -1) this.channelModal.selectedUserIds.push(userId);
    else this.channelModal.selectedUserIds.splice(idx, 1);
  }

  isMemberSelectedInModal(userId: number): boolean {
    return this.channelModal.selectedUserIds.includes(userId);
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
            const memberAdds = m.selectedUserIds.map((uid) =>
              this.collabService
                .addChannelMember(channelId, uid)
                .toPromise()
                .catch(() => {}),
            );
            Promise.all(memberAdds).finally(() => {
              this.closeChannelModal();
              this.loadChannels();
              setTimeout(() => {
                const ch = this.channels.find((c) => c.backendId === channelId);
                if (ch) this.selectChannel(ch.id);
              }, 400);
            });
          },
          error: (err) => {
            m.saving = false;
            m.error = 'Failed to create channel.';
            console.error(err);
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
          error: (err) => {
            m.saving = false;
            m.error = 'Failed to update channel.';
            console.error(err);
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
      error: (err) => console.error('[Comm] deleteChannel failed:', err),
    });
  }

  toggleChannelDetails(): void {
    this.showChannelDetails = !this.showChannelDetails;
    if (this.showChannelDetails && this.activeChannel) {
      this.loadChannelMembers(this.activeChannel.backendId);
    }
  }

  private loadChannelMembers(channelId: number): void {
    this.channelMembersLoading = true;
    this.collabService.getChannelMembers(channelId).subscribe({
      next: (members) => {
        this.channelMembers = members;
        this.channelMembersLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.channelMembersLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  addMemberToActiveChannel(userId: number): void {
    const ch = this.activeChannel;
    if (!ch) return;
    this.collabService.addChannelMember(ch.backendId, userId).subscribe({
      next: (m) => {
        this.channelMembers.push(m);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('[Comm] addChannelMember failed:', err),
    });
  }

  removeMemberFromChannel(member: CollabMember, e: Event): void {
    e.stopPropagation();
    if (!member.id) return;
    this.collabService.removeChannelMember(member.id).subscribe({
      next: () => {
        this.channelMembers = this.channelMembers.filter(
          (m) => m.id !== member.id,
        );
        this.cdr.detectChanges();
      },
      error: (err) => console.error('[Comm] removeChannelMember failed:', err),
    });
  }

  getMemberName(userId: number): string {
    return this.userDirectory[userId] || `User ${userId}`;
  }

  // ── DM ────────────────────────────────────────────────

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
    if (contact.hasUnread) contact.hasUnread = false;
    this.messagesLoading = true;
    this.cdr.detectChanges();
    this.getOrCreateDmChannel(contact);
  }

  private getOrCreateDmChannel(contact: DmContact): void {
    if (contact.dmChannelId) {
      this.loadDmMessages(contact, contact.dmChannelId);
      return;
    }
    const meId = this.me.userId;
    const themId = contact.userId;
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
              },
              error: (err) => {
                console.error('[Comm] getOrCreateDmChannel failed:', err);
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
        const messages = snap.messages || [];
        const reactions = snap.reactions || [];
        const attachments = snap.attachments || [];
        if (!messages.length) {
          this.dmMessages[contact.id] = [];
          this.cdr.detectChanges();
          return;
        }
        const senderIds = [...new Set(messages.map((m) => m.senderUserId))];
        this.loadUserDirectory(senderIds, () =>
          this.buildDmMessages(contact, messages, reactions, attachments),
        );
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
    reactions: {
      id?: number;
      messageId: number;
      userId?: number;
      reactionCode: string;
    }[],
    attachments: {
      id?: number;
      messageId: number;
      fileName: string;
      downloadUrl?: string;
    }[],
  ): void {
    const LIKE_CODES = ['LIKE', 'LOVE', 'THUMBS_UP', 'LAUGH'];
    const reactionCount = new Map<string, number>();
    const likedByMe = new Set<number>();
    const likeReactionIdMap = new Map<number, number>();
    for (const r of reactions) {
      const k = `${r.messageId}|${r.reactionCode}`;
      reactionCount.set(k, (reactionCount.get(k) ?? 0) + 1);
      if (
        r.userId != null &&
        Number(r.userId) === Number(this.me.userId) &&
        LIKE_CODES.includes(r.reactionCode)
      ) {
        likedByMe.add(Number(r.messageId));
        if (r.id != null) likeReactionIdMap.set(Number(r.messageId), r.id);
      }
    }
    const attMap = new Map<number, (typeof attachments)[0]>();
    for (const a of attachments) {
      if (a.messageId) attMap.set(a.messageId, a);
    }
    const msgMap = new Map<number, CollabMessage>(
      messages.map((m) => [m.id, m]),
    );
    const roots: CollabMessage[] = [];
    const children = new Map<number, CollabMessage[]>();
    for (const m of messages) {
      if (m.replyToMessageId && msgMap.has(m.replyToMessageId)) {
        const b = children.get(m.replyToMessageId) ?? [];
        b.push(m);
        children.set(m.replyToMessageId, b);
      } else roots.push(m);
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
        time: formatSentAt(m.sentAt),
        sentAtRaw: m.sentAt,
        content: m.content || '',
        replies: (children.get(m.id) ?? []).map((c) => toLocal(c)),
        liked: likedByMe.has(m.id),
        likeCount: totalLikes,
        likeReactionId: likeReactionIdMap.get(m.id),
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
    this.dmMessages[contact.id] = roots.map((r) => toLocal(r));
    this.scrollFeed = true;
    this.cdr.detectChanges();
  }

  sendDmMessage(): void {
    const text = this.draft.trim();
    const contact = this.activeDmContact;
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
    const capturedFile = this.pendingFile;
    const capturedAtt = this.pendingAttachment;
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
          this.sendingMessage = false;
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
        error: (err) => {
          console.error('[Comm] sendDmMessage failed:', err);
          const idx = (this.dmMessages[contact.id] ?? []).indexOf(optimistic);
          if (idx !== -1) this.dmMessages[contact.id].splice(idx, 1);
          this.sendingMessage = false;
          this.cdr.detectChanges();
        },
      });
  }

  // ── Email modal ───────────────────────────────────────

  openEmailModal(toEmail?: string, toName?: string): void {
    this.emailModal = {
      open: true,
      to: toEmail || '',
      subject: '',
      body: '',
      sending: false,
      result: '',
    };
    if (toName) this.emailModal.subject = `Message for ${toName}`;
    this.cdr.detectChanges();
  }

  closeEmailModal(): void {
    this.emailModal = { ...this.emailModal, open: false };
  }

  sendEmailAction(): void {
    const m = this.emailModal;
    if (!m.to.trim() || !m.body.trim()) return;
    m.sending = true;
    m.result = '';
    const ch = this.activeChannel;
    const chId = ch?.backendId ?? this.activeDmContact?.dmChannelId ?? 0;
    this.collabService
      .triggerAction({
        channelId: chId,
        messageId: null,
        initiatorUserId: this.me.userId,
        targetUserId: this.me.userId,
        actionType: 'EMAIL',
        subject: m.subject,
        payloadJson: JSON.stringify({
          to: m.to,
          subject: m.subject,
          body: m.body,
          tone: 'professional',
        }),
      })
      .subscribe({
        next: (res) => {
          m.sending = false;
          m.result = `✅ Email sent — status: ${res.status}`;
          this.cdr.detectChanges();
        },
        error: (err) => {
          m.sending = false;
          m.result = `❌ Failed: ${err?.message || 'Unknown error'}`;
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

  // ── Messages (channel) ────────────────────────────────

  private loadChannelMessages(channel: Channel): void {
    if (!channel.backendId) return;
    this.messagesLoading = true;
    this.cdr.detectChanges();
    this.collabService.getChannelSnapshot(channel.backendId).subscribe({
      next: (snap) => {
        this.messagesLoading = false;
        const messages = snap.messages || [];
        const reactions = snap.reactions || [];
        const attachments = snap.attachments || [];
        if (!messages.length) {
          this.channelMessages[channel.id] = [];
          this.cdr.detectChanges();
          return;
        }
        const senderIds = [...new Set(messages.map((m) => m.senderUserId))];
        this.loadUserDirectory(senderIds, () =>
          this.buildAndRenderMessages(
            channel,
            messages,
            reactions,
            attachments,
          ),
        );
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
          if (u.userId != null)
            this.userDirectory[u.userId] =
              u.fullname || u.username || u.email || `User ${u.userId}`;
        }
        callback();
      },
      error: () => callback(),
    });
  }

  private buildAndRenderMessages(
    channel: Channel,
    messages: CollabMessage[],
    reactions: {
      id?: number;
      messageId: number;
      userId?: number;
      reactionCode: string;
    }[],
    attachments: {
      id?: number;
      messageId: number;
      fileName: string;
      downloadUrl?: string;
    }[],
  ): void {
    const LIKE_CODES = ['LIKE', 'LOVE', 'THUMBS_UP', 'LAUGH'];
    const reactionCount = new Map<string, number>();
    const likedByMe = new Set<number>();
    const likeReactionIdMap = new Map<number, number>();
    for (const r of reactions) {
      const k = `${r.messageId}|${r.reactionCode}`;
      reactionCount.set(k, (reactionCount.get(k) ?? 0) + 1);
      if (
        r.userId != null &&
        Number(r.userId) === Number(this.me.userId) &&
        LIKE_CODES.includes(r.reactionCode)
      ) {
        likedByMe.add(Number(r.messageId));
        if (r.id != null) likeReactionIdMap.set(Number(r.messageId), r.id);
      }
    }
    const attMap = new Map<number, (typeof attachments)[0]>();
    for (const a of attachments) {
      if (a.messageId) attMap.set(a.messageId, a);
    }
    const msgMap = new Map<number, CollabMessage>(
      messages.map((m) => [m.id, m]),
    );
    const roots: CollabMessage[] = [];
    const directChildren = new Map<number, CollabMessage[]>();
    for (const m of messages) {
      if (m.replyToMessageId && msgMap.has(m.replyToMessageId)) {
        const b = directChildren.get(m.replyToMessageId) ?? [];
        b.push(m);
        directChildren.set(m.replyToMessageId, b);
      } else roots.push(m);
    }
    if (messages.length)
      this.lastMessageBackendId = messages[messages.length - 1].id;
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
        time: formatSentAt(m.sentAt),
        sentAtRaw: m.sentAt,
        content: m.content || '',
        replies: (directChildren.get(m.id) ?? []).map((c) => toLocal(c)),
        liked: likedByMe.has(m.id),
        likeCount: totalLikes,
        likeReactionId: likeReactionIdMap.get(m.id),
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
    this.channelMessages[channel.id] = roots.map((r) => toLocal(r));
    if (this.lastMessageBackendId) {
      this.collabService
        .markRead(channel.backendId, this.lastMessageBackendId)
        .subscribe({ error: () => {} });
    }
    this.collabService
      .setPresenceOnline(channel.backendId)
      .subscribe({ error: () => {} });
    this.presenceChannelId = channel.backendId;
    this.pollChannelPresence(channel.backendId);
    channel.hasUnread = false;
    this.scrollFeed = true;
    this.cdr.detectChanges();
  }

  // ── Presence & Typing ─────────────────────────────────

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
          for (const dm of this.dmContacts) {
            dm.online = (this.presenceMap[dm.userId] || 'OFFLINE') === 'ONLINE';
          }
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
        for (const dm of this.dmContacts) {
          dm.online = (this.presenceMap[dm.userId] || 'OFFLINE') === 'ONLINE';
        }
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  isUserOnline(userId: number): boolean {
    return (this.presenceMap[userId] || 'OFFLINE') === 'ONLINE';
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
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
      osc.onended = () => ctx.close();
    } catch (_) {}
  }

  leaveActiveChannel(): void {
    const ch = this.activeChannel;
    if (!ch) return;
    if (!confirm(`Leave #${ch.name}?`)) return;
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
      error: (err) => console.error('[Comm] leaveChannel failed:', err),
    });
  }

  // ── Day separator helpers ─────────────────────────────

  getDayLabel(raw: string | number[] | undefined): string {
    return getDayLabelFn(raw);
  }

  shouldShowDaySeparator(msgs: Message[], index: number): boolean {
    if (index === 0) return true;
    const prev = msgs[index - 1];
    const curr = msgs[index];
    if (!curr.sentAtRaw || !prev.sentAtRaw) return false;
    return getDayLabelFn(curr.sentAtRaw) !== getDayLabelFn(prev.sentAtRaw);
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
    if (this.activeView === 'dm') return this.dmMessages[this.activeDmId] || [];
    return this.channelMessages[this.activeChannelId] || [];
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

  findMsgInTree(messages: Message[], id: string): Message | null {
    for (const m of messages) {
      if (m.id === id) return m;
      const f = this.findMsgInTree(m.replies, id);
      if (f) return f;
    }
    return null;
  }

  get allThreaded(): { msg: Message; channelName: string }[] {
    const out: { msg: Message; channelName: string }[] = [];
    for (const ch of this.channels) {
      (this.channelMessages[ch.id] || [])
        .filter((m) => m.replies.length)
        .forEach((m) => out.push({ msg: m, channelName: ch.name }));
    }
    return out;
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

  isFlashing(id: string): boolean {
    return this.flashId === id;
  }
  isDmOnline(): boolean {
    return this.activeDmContact?.online ?? false;
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
    return Number(msg.senderUserId) === Number(this.me.userId);
  }
  isChannelOwner(): boolean {
    return this.activeChannel?.createdBy === this.me.userId;
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

  composerPlaceholder(): string {
    if (this.activeView === 'dm')
      return 'Message ' + (this.activeDmContact?.shortName ?? '');
    return 'Message #' + (this.activeChannel?.name ?? '');
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
      this.presenceChannelId = ch.backendId;
      this.loadChannelMessages(ch);
    }
  }

  setView(v: 'threads'): void {
    this.activeView = v;
    this.activeThreadId = null;
    this.activeThreadReplyToId = null;
    this.showPinnedPanel = false;
    this.showChannelDetails = false;
    this.cancelEdit();
    this.confirmDeleteId = null;
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

  // ── File attachment ───────────────────────────────────

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.pendingFile = file;
    this.pendingAttachment = {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
    };
    input.value = '';
    this.cdr.detectChanges();
  }

  removePendingAttachment(): void {
    this.pendingFile = null;
    this.pendingAttachment = null;
  }

  downloadAttachment(
    attachment: { name: string; downloadUrl?: string },
    e: Event,
  ): void {
    e.preventDefault();
    if (!attachment.downloadUrl) return;
    const token = sessionStorage.getItem('token') || '';
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const userId = sessionStorage.getItem('userid') || '';
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

  // ── Messaging ─────────────────────────────────────────

  sendMessage(): void {
    if (this.activeView === 'dm') {
      this.sendDmMessage();
      return;
    }
    const text = this.draft.trim();
    const channel = this.activeChannel;
    if ((!text && !this.pendingAttachment) || this.sendingMessage || !channel)
      return;
    if (!channel.backendId) {
      (this.channelMessages[channel.id] ??= []).push(
        this.makeLocalMsg(
          text || '(file)',
          this.pendingAttachment ?? undefined,
        ),
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
    (this.channelMessages[channel.id] ??= []).push(optimistic);
    const capturedFile = this.pendingFile;
    const capturedAtt = this.pendingAttachment;
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
          this.sendingMessage = false;
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

  onComposerKey(e: KeyboardEvent, el: HTMLTextAreaElement): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
      return;
    }
    this.onComposerTyping();
    setTimeout(() => {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    });
  }

  onComposerInput(el: HTMLTextAreaElement): void {
    this.onComposerTyping();
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  // ── Edit message ──────────────────────────────────────

  startEdit(msg: Message, e?: Event): void {
    e?.stopPropagation();
    this.confirmDeleteId = null;
    this.editingMessageId = msg.id;
    this.editDraft = msg.content;
    this.cdr.detectChanges();
  }
  cancelEdit(): void {
    this.editingMessageId = null;
    this.editDraft = '';
    this.savingEdit = false;
  }
  onEditKey(e: KeyboardEvent, msg: Message): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.saveEdit(msg);
    }
    if (e.key === 'Escape') this.cancelEdit();
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

  // ── Delete message ────────────────────────────────────

  requestDelete(msg: Message, e?: Event): void {
    e?.stopPropagation();
    this.cancelEdit();
    this.confirmDeleteId = msg.id;
    this.cdr.detectChanges();
  }
  dismissDelete(): void {
    this.confirmDeleteId = null;
    this.cdr.detectChanges();
  }
  confirmDelete(msg: Message, e?: Event): void {
    e?.stopPropagation();
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

  openThread(msg: Message, e?: Event): void {
    e?.stopPropagation();
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
  setThreadReplyTarget(reply: Message, e?: Event): void {
    e?.stopPropagation();
    this.activeThreadReplyToId = reply.id;
    this.threadReplyDraft = '';
    this.cdr.detectChanges();
  }
  clearThreadReplyTarget(): void {
    this.activeThreadReplyToId = null;
    this.threadReplyDraft = '';
    this.cdr.detectChanges();
  }

  sendReply(): void {
    const text = this.threadReplyDraft.trim();
    const rootMsg = this.activeThread;
    if (!text || !rootMsg || this.sendingReply) return;
    const channel = this.activeChannel;
    const replyTarget = this.activeThreadReplyToId
      ? (this.findMsgInTree(rootMsg.replies, this.activeThreadReplyToId) ??
        rootMsg)
      : rootMsg;
    const threadRootId = rootMsg.backendId;
    const replyToId = replyTarget.backendId ?? rootMsg.backendId;

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

  onThreadKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendReply();
    }
  }

  // ── Reactions ─────────────────────────────────────────

  toggleLike(msg: Message, e?: Event): void {
    e?.stopPropagation();
    if (this.reactingIds.has(msg.id)) return;
    const wasLiked = msg.liked;
    const wasCount = msg.likeCount;
    const wasId = msg.likeReactionId;
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

  private refreshReactionCounts(
    channel: Channel,
    reactions: {
      id?: number;
      messageId: number;
      userId?: number;
      reactionCode: string;
    }[],
  ): void {
    const LIKE_CODES = ['LIKE', 'LOVE', 'THUMBS_UP', 'LAUGH'];
    const rc = new Map<string, number>();
    const lbm = new Set<number>();
    const lrm = new Map<number, number>();
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

  togglePin(msg: Message, e?: Event): void {
    e?.stopPropagation();
    msg.pinned = !msg.pinned;
    msg.pinnedAt = msg.pinned ? Date.now() : undefined;
    this.cdr.detectChanges();
  }

  // ── Search ────────────────────────────────────────────

  closeSearch(): void {
    this.showSearch = false;
  }
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
      title: '✏️ AI Rewrite',
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
        if (body && body.length > 40) this.draft = body;
        this.aiOutput = {
          visible: true,
          loading: false,
          title: '✏️ AI Rewrite',
          content: body || 'No result.',
        };
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.aiOutput = {
          visible: true,
          loading: false,
          title: '✏️ AI Rewrite',
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
      title: '🏷️ AI Subject',
      content: '',
    };
    this.cdr.detectChanges();
    this.collabService.aiSuggestSubject(this.draft.trim()).subscribe({
      next: (res: AiSubjectResponse) => {
        this.aiOutput = {
          visible: true,
          loading: false,
          title: '🏷️ AI Subject',
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
          title: '🏷️ AI Subject',
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
      title: '📌 AI Summary',
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
            title: '📌 AI Summary',
            content: [
              res.summary || 'No summary.',
              '\n📌 Key Points:\n' + kp,
              '\n✅ Decisions:\n' + dc,
              '\n🎯 Action Items:\n' + ai,
            ].join('\n'),
          };
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.aiOutput = {
            visible: true,
            loading: false,
            title: '📌 AI Summary',
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
        title: '🎙️ Voice Compose',
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
      title: '🎙️ Voice Compose',
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
        title: '🎙️ Voice Compose',
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
          title: '🎙️ Voice Compose',
          content: 'No transcript captured.',
        };
        this.cdr.detectChanges();
        return;
      }
      this.draft = transcript;
      this.aiOutput = {
        visible: true,
        loading: true,
        title: '🎙️ Voice → AI Compose',
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
            let subj = res.subject || 'Draft';
            let body = res.body || '';
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
              title: '🎙️ Voice → AI Compose',
              content: `Subject: ${subj}\n\n${body}`,
            };
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.aiOutput = {
              visible: true,
              loading: false,
              title: '🎙️ Voice Compose',
              content: `Transcript: "${transcript}"\n\nError: ${err?.message || 'Failed'}`,
            };
            this.cdr.detectChanges();
          },
        });
    };
    rec.start();
  }

  // ── Template helpers ──────────────────────────────────

  parseServerDate(raw: string | number[] | undefined): Date | null {
    return parseServerDate(raw);
  }

  trackById(_: number, m: { id: string }): string {
    return m.id;
  }

  getChannelIdForMsg(msg: Message): string {
    for (const ch of this.channels) {
      if ((this.channelMessages[ch.id] || []).find((m) => m.id === msg.id))
        return ch.id;
    }
    return this.activeChannelId;
  }

  getTopReplies(msg: Message): Message[] {
    return msg.replies.slice(0, 3);
  }

  openThreadFromList(msg: Message, event: Event): void {
    this.selectChannel(this.getChannelIdForMsg(msg));
    this.openThread(msg, event);
  }

  getEmpName(e: EmployeeProfile): string {
    return (
      `${e.firstName || ''} ${e.lastName || ''}`.trim() ||
      e.user?.fullname ||
      `Employee ${e.id}`
    );
  }
  getEmpInitials(e: EmployeeProfile): string {
    return initialsFrom(this.getEmpName(e));
  }
  getEmpAvatarColor(e: EmployeeProfile): string {
    return _colorFor(e.id);
  }
  getEmpImageUrl(e: EmployeeProfile): string | undefined {
    if (!e.employeeMedia?.mediaNo) return undefined;
    return this.imageCache[e.employeeMedia.mediaNo];
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
        hour: '2-digit',
        minute: '2-digit',
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
}

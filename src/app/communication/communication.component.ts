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

export interface Message {
  id: string;
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
}

export interface Channel {
  id: string;
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

@Component({
  selector: 'app-communication',
  templateUrl: './communication.component.html',
})
export class CommunicationComponent
  implements OnInit, AfterViewChecked, OnDestroy
{
  @ViewChild('feedEl') feedEl!: ElementRef<HTMLDivElement>;
  @ViewChild('composerEl') composerEl!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('threadEl') threadEl!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('sidebarEl') sidebarEl!: ElementRef<HTMLDivElement>;
  @ViewChild('threadPanelEl') threadPanelEl!: ElementRef<HTMLDivElement>;

  me = {
    name: 'David Kindness',
    shortName: 'David K.',
    initials: 'DK',
    avatarColor: '#2e6276',
  };

  activeView: 'channel' | 'dm' | 'threads' | 'saved' = 'channel';
  activeChannelId = 'general';
  activeDmId = '';
  activeThreadId: string | null = null;
  showPinnedPanel = false;
  threadReplyDraft = '';
  draft = '';
  searchQuery = '';
  searchResults: { msg: Message; channelId: string; channelName: string }[] =
    [];
  showSearch = false;
  showAddChannel = false;
  newChannelName = '';
  pendingAttachment: { name: string; size: string; type: string } | null = null;

  // Sidebar resize
  sidebarWidth = 220;
  threadPanelWidth = 360;
  readonly SIDEBAR_MIN = 180;
  readonly SIDEBAR_MAX = 320;
  readonly THREAD_MIN = 280;
  readonly THREAD_MAX = 520;

  isResizingSidebar = false;
  isResizingThread = false;
  private resizeStartX = 0;
  private resizeStartWidth = 0;

  private scrollFeed = false;
  private scrollThread = false;
  private flashId: string | null = null;
  private flashTimer: any;

  channels: Channel[] = [
    {
      id: 'general',
      name: 'general',
      description: 'Company-wide announcements',
      hasUnread: true,
    },
    {
      id: 'erp-hr',
      name: 'erp-hr',
      description: 'HR discussions',
      hasUnread: true,
    },
    {
      id: 'erp-accounting',
      name: 'erp-accounting',
      description: 'Finance & accounting',
    },
    { id: 'erp-pos', name: 'erp-pos', description: 'Point of Sale' },
    {
      id: 'erp-expenses',
      name: 'erp-expenses',
      description: 'Expense approvals',
      hasUnread: true,
    },
    { id: 'engineering', name: 'engineering', description: 'Dev team' },
    { id: 'random', name: 'random', description: 'Off-topic' },
  ];

  directMessages: DirectMessage[] = [
    {
      id: 'dm-1',
      shortName: 'Amara O.',
      initials: 'AO',
      avatarColor: '#10b981',
      online: true,
      hasUnread: true,
    },
    {
      id: 'dm-2',
      shortName: 'Emeka N.',
      initials: 'EN',
      avatarColor: '#6366f1',
      online: true,
    },
    {
      id: 'dm-3',
      shortName: 'Fatima H.',
      initials: 'FH',
      avatarColor: '#f59e0b',
      online: false,
    },
    {
      id: 'dm-4',
      shortName: 'Tunde A.',
      initials: 'TA',
      avatarColor: '#2e6276',
      online: true,
    },
    {
      id: 'dm-5',
      shortName: 'Ngozi E.',
      initials: 'NE',
      avatarColor: '#ec4899',
      online: false,
    },
  ];

  channelMessages: Record<string, Message[]> = {};
  dmMessages: Record<string, Message[]> = {};

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.seed();
  }
  ngOnDestroy() {
    if (this.flashTimer) clearTimeout(this.flashTimer);
  }

  ngAfterViewChecked() {
    if (this.scrollFeed) {
      if (this.feedEl?.nativeElement) {
        this.feedEl.nativeElement.scrollTop =
          this.feedEl.nativeElement.scrollHeight;
      }
      this.scrollFeed = false;
    }
    if (this.scrollThread) {
      if (this.threadEl?.nativeElement) {
        this.threadEl.nativeElement.scrollTop =
          this.threadEl.nativeElement.scrollHeight;
      }
      this.scrollThread = false;
    }
  }

  // ── Resize handlers ─────────────────────

  startResizeSidebar(e: MouseEvent) {
    this.isResizingSidebar = true;
    this.resizeStartX = e.clientX;
    this.resizeStartWidth = this.sidebarWidth;
    e.preventDefault();
  }

  startResizeThread(e: MouseEvent) {
    this.isResizingThread = true;
    this.resizeStartX = e.clientX;
    this.resizeStartWidth = this.threadPanelWidth;
    e.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    if (this.isResizingSidebar) {
      const delta = e.clientX - this.resizeStartX;
      this.sidebarWidth = Math.min(
        this.SIDEBAR_MAX,
        Math.max(this.SIDEBAR_MIN, this.resizeStartWidth + delta),
      );
    }
    if (this.isResizingThread) {
      const delta = this.resizeStartX - e.clientX;
      this.threadPanelWidth = Math.min(
        this.THREAD_MAX,
        Math.max(this.THREAD_MIN, this.resizeStartWidth + delta),
      );
    }
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    this.isResizingSidebar = false;
    this.isResizingThread = false;
  }

  // ── Computed getters ──────────────────────

  get activeChannel(): Channel | undefined {
    return this.channels.find((c) => c.id === this.activeChannelId);
  }

  get activeDm(): DirectMessage | undefined {
    return this.directMessages.find((d) => d.id === this.activeDmId);
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

  get unpinnedMessages(): Message[] {
    return this.rawMessages.filter((m) => !m.pinned);
  }

  get activeThread(): Message | null {
    if (!this.activeThreadId) return null;
    for (const ch of this.channels) {
      const found = (this.channelMessages[ch.id] || []).find(
        (m) => m.id === this.activeThreadId,
      );
      if (found) return found;
    }
    for (const dm of this.directMessages) {
      const found = (this.dmMessages[dm.id] || []).find(
        (m) => m.id === this.activeThreadId,
      );
      if (found) return found;
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
    return this.showPinnedPanel || !!this.activeThreadId;
  }

  get rightPanelMode(): 'pinned' | 'thread' | null {
    if (this.showPinnedPanel) return 'pinned';
    if (this.activeThreadId) return 'thread';
    return null;
  }

  isFlashing(id: string): boolean {
    return this.flashId === id;
  }

  isDmOnline(): boolean {
    return this.activeDm ? this.activeDm.online : false;
  }

  composerPlaceholder(): string {
    if (this.activeView === 'channel') {
      return 'Message #' + (this.activeChannel ? this.activeChannel.name : '');
    }
    return 'Message ' + (this.activeDm ? this.activeDm.shortName : '');
  }

  getFileIcon(type?: string): string {
    if (!type) return 'file';
    if (type.includes('image')) return 'image';
    if (type.includes('pdf')) return 'pdf';
    if (
      type.includes('sheet') ||
      type.includes('excel') ||
      type.includes('csv')
    )
      return 'sheet';
    if (type.includes('word') || type.includes('document')) return 'doc';
    return 'file';
  }

  // ── Navigation ────────────────────────────

  selectChannel(id: string) {
    this.activeChannelId = id;
    this.activeView = 'channel';
    this.activeDmId = '';
    this.activeThreadId = null;
    this.showPinnedPanel = false;
    this.showSearch = false;
    const ch = this.channels.find((c) => c.id === id);
    if (ch) ch.hasUnread = false;
    this.scrollFeed = true;
  }

  selectDm(id: string) {
    this.activeDmId = id;
    this.activeView = 'dm';
    this.activeThreadId = null;
    this.showPinnedPanel = false;
    this.showSearch = false;
    const dm = this.directMessages.find((d) => d.id === id);
    if (dm) dm.hasUnread = false;
    this.scrollFeed = true;
  }

  setView(v: 'threads' | 'saved') {
    this.activeView = v;
    this.activeThreadId = null;
    this.showPinnedPanel = false;
  }

  toggleAddChannel() {
    this.showAddChannel = !this.showAddChannel;
  }

  addChannel() {
    const name = this.newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name || this.channels.find((c) => c.id === name)) return;
    this.channels.push({ id: name, name, description: `${name} discussions` });
    this.channelMessages[name] = [];
    this.newChannelName = '';
    this.showAddChannel = false;
    this.selectChannel(name);
  }

  // ── Pinned panel ──────────────────────────

  togglePinnedPanel() {
    this.showPinnedPanel = !this.showPinnedPanel;
    if (this.showPinnedPanel) this.activeThreadId = null;
  }

  closePinnedPanel() {
    this.showPinnedPanel = false;
  }

  // ── File attachment ───────────────────────

  triggerFileInput() {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const size =
      file.size < 1024 * 1024
        ? (file.size / 1024).toFixed(1) + ' KB'
        : (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    this.pendingAttachment = { name: file.name, size, type: file.type };
    input.value = '';
    this.cdr.detectChanges();
  }

  removePendingAttachment() {
    this.pendingAttachment = null;
  }

  // ── Messaging ─────────────────────────────

  sendMessage() {
    const text = this.draft.trim();
    if (!text && !this.pendingAttachment) return;
    const msg = this.makeMsg(
      text || '(file attachment)',
      this.pendingAttachment ?? undefined,
    );
    if (this.activeView === 'dm') {
      (this.dmMessages[this.activeDmId] ??= []).push(msg);
    } else {
      (this.channelMessages[this.activeChannelId] ??= []).push(msg);
    }
    this.draft = '';
    this.pendingAttachment = null;
    this.scrollFeed = true;
  }

  onComposerKey(e: KeyboardEvent, el: HTMLTextAreaElement) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
    setTimeout(() => {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    });
  }

  onComposerInput(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  // ── Thread ────────────────────────────────

  openThread(msg: Message, e?: Event) {
    e?.stopPropagation();
    if (this.activeThreadId === msg.id) {
      this.activeThreadId = null;
      return;
    }
    this.showPinnedPanel = false;
    this.activeThreadId = msg.id;
    this.threadReplyDraft = '';
    this.scrollThread = true;
    this.cdr.detectChanges();
  }

  closeThread() {
    this.activeThreadId = null;
  }

  sendReply() {
    const text = this.threadReplyDraft.trim();
    if (!text || !this.activeThread) return;
    this.activeThread.replies.push(this.makeMsg(text));
    this.threadReplyDraft = '';
    this.scrollThread = true;
    this.cdr.detectChanges();
  }

  onThreadKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendReply();
    }
  }

  // ── Actions ───────────────────────────────

  toggleLike(msg: Message, e?: Event) {
    e?.stopPropagation();
    msg.liked = !msg.liked;
    msg.likeCount = msg.liked
      ? msg.likeCount + 1
      : Math.max(0, msg.likeCount - 1);
    this.cdr.detectChanges();
  }

  togglePin(msg: Message, e?: Event) {
    e?.stopPropagation();
    msg.pinned = !msg.pinned;
    msg.pinnedAt = msg.pinned ? Date.now() : undefined;
    this.cdr.detectChanges();
  }

  // ── Search ────────────────────────────────

  closeSearch() {
    this.showSearch = false;
  }

  onSearch() {
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

  jumpTo(r: { msg: Message; channelId: string; channelName: string }) {
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

  openThreadFromList(msg: Message, event: Event) {
    this.selectChannel(this.getChannelIdForMsg(msg));
    this.openThread(msg, event);
  }

  // ── Private helpers ───────────────────────

  private makeMsg(
    content: string,
    attachment?: { name: string; size: string; type: string },
  ): Message {
    const msg: Message = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      author: this.me.name,
      initials: this.me.initials,
      avatarColor: this.me.avatarColor,
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
    };
    if (attachment) msg.attachment = attachment;
    return msg;
  }

  private seed() {
    const m = (
      id: string,
      author: string,
      initials: string,
      color: string,
      role: string,
      time: string,
      content: string,
      extra: Partial<Message> = {},
    ): Message => ({
      id,
      author,
      initials,
      avatarColor: color,
      role,
      time,
      content,
      replies: [],
      liked: false,
      likeCount: 0,
      pinned: false,
      createdAt: new Date(),
      ...extra,
    });

    this.channelMessages['general'] = [
      m(
        'g0',
        'Amara Okonkwo',
        'AO',
        '#10b981',
        'HR Manager',
        '09:05 AM',
        'Amara O. joined the channel',
        { isSystem: true },
      ),
      m(
        'g1',
        'Amara Okonkwo',
        'AO',
        '#10b981',
        'HR Manager',
        '09:10 AM',
        'Good morning everyone. We have a few important HR updates before the week kicks off. Please review the updated leave policy document shared last Friday.',
        {
          likeCount: 3,
          replies: [
            m(
              'g1r1',
              'Tunde Adeyemi',
              'TA',
              '#2e6276',
              'Product Mgr',
              '09:40 AM',
              'Thanks for the heads up. Will circulate to the team.',
            ),
            m(
              'g1r2',
              'Seun Adesanya',
              'SA',
              '#14b8a6',
              'QA Engineer',
              '10:35 AM',
              'Noted. Will review before Thursday.',
            ),
          ],
        },
      ),
      m(
        'g2',
        'Emeka Nwachukwu',
        'EN',
        '#6366f1',
        'Lead Developer',
        '09:22 AM',
        'The new ERP module deployment is this Saturday at 10 PM. Downtime expected: ~2 hours. Please plan accordingly.',
        { likeCount: 4, liked: true },
      ),
      m(
        'g3',
        'Bode Lawal',
        'BL',
        '#8b5cf6',
        'DevOps',
        '09:30 AM',
        'Server backups are complete. Good to proceed with the Saturday window.',
      ),
      m(
        'g4',
        'Fatima Hassan',
        'FH',
        '#f59e0b',
        'Finance Director',
        '10:15 AM',
        "Q3 financial reports are on the shared drive. Department heads — please review budget vs actuals before Thursday's CFO call.",
        {
          pinned: true,
          pinnedAt: Date.now() - 2000,
          likeCount: 5,
          attachment: {
            name: 'Q3_Financial_Report.pdf',
            size: '2.4 MB',
            type: 'application/pdf',
          },
        },
      ),
      m(
        'g5',
        'Tunde Adeyemi',
        'TA',
        '#2e6276',
        'Product Manager',
        '11:00 AM',
        "Reminder: Sprint review at 3 PM today. Demos should be ready — we're presenting the POS reconciliation feature.",
        { pinned: true, pinnedAt: Date.now() - 1000 },
      ),
      m(
        'g6',
        'Ngozi Eze',
        'NE',
        '#ec4899',
        'Sales Lead',
        '11:45 AM',
        'September numbers are in. We exceeded target by 12%. Full breakdown on the sales channel.',
        { likeCount: 7, liked: true },
      ),
    ];

    this.channelMessages['erp-hr'] = [
      m(
        'h1',
        'Amara Okonkwo',
        'AO',
        '#10b981',
        'HR Manager',
        '08:30 AM',
        'September payroll processed and approved. All staff should receive credit by end of business today.',
        { likeCount: 4 },
      ),
      m(
        'h2',
        'Chidi Okafor',
        'CO',
        '#0ea5e9',
        'Designer',
        '09:15 AM',
        "Hi Amara, I submitted my annual leave request for Oct 14–18. Could you confirm it's been received?",
      ),
      m(
        'h3',
        'Amara Okonkwo',
        'AO',
        '#10b981',
        'HR Manager',
        '09:20 AM',
        "Confirmed Chidi. Your request is in the system — status PENDING your line manager's approval.",
      ),
    ];

    this.channelMessages['engineering'] = [
      m(
        'e1',
        'Emeka Nwachukwu',
        'EN',
        '#6366f1',
        'Lead Dev',
        '08:00 AM',
        'v2.4.1 is branched and in staging. Please hold feature merges until after the Saturday deployment.',
      ),
      m(
        'e2',
        'Bode Lawal',
        'BL',
        '#8b5cf6',
        'DevOps',
        '08:15 AM',
        'CI pipeline is green. All regression tests passed.',
        { likeCount: 2 },
      ),
    ];

    this.channelMessages['erp-pos'] = [
      m(
        'p1',
        'Ngozi Eze',
        'NE',
        '#ec4899',
        'Sales Lead',
        '07:55 AM',
        'All POS terminals at Ikeja branch are online. Opening checks complete.',
      ),
    ];

    ['erp-accounting', 'erp-expenses', 'random'].forEach((id) => {
      this.channelMessages[id] = [];
    });

    this.dmMessages['dm-1'] = [
      m(
        'd1',
        'Amara Okonkwo',
        'AO',
        '#10b981',
        '',
        '09:05 AM',
        'Hi David, could you review the updated performance review template? We need to finalise it before Thursday.',
      ),
      m(
        'd2',
        'David Kindness',
        'DK',
        '#2e6276',
        '',
        '09:12 AM',
        "Sure, I'll look at it within the hour. Any specific section you want me to focus on?",
      ),
      m(
        'd3',
        'Amara Okonkwo',
        'AO',
        '#10b981',
        '',
        '09:14 AM',
        'Mainly the KPI scoring section — the old template caused a lot of confusion across departments.',
      ),
    ];

    ['dm-2', 'dm-3', 'dm-4', 'dm-5'].forEach((id) => {
      this.dmMessages[id] = [];
    });
  }
}

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
  OnInit,
} from '@angular/core';
import { Channel, DmContact } from '../communication.component';

export interface MeInfo {
  name: string;
  shortName: string;
  initials: string;
  avatarColor: string;
  userId: number;
  avatarUrl: string;
}

@Component({
  selector: 'app-channel-sidebar',
  templateUrl: './channel-sidebar.component.html',
  styleUrls: ['./channel-sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelSidebarComponent implements OnInit {
  constructor(private cdr: ChangeDetectorRef) {}

  // ── Feature: Presence status ─────────────────────────
  presencePickerOpen = false;
  presenceEmoji = '🟢';
  presenceText = '';

  ngOnInit(): void {
    try {
      const stored = localStorage.getItem('collab_presence_status');
      if (stored) {
        const p = JSON.parse(stored);
        this.presenceEmoji = p.emoji || '🟢';
        this.presenceText = p.text || '';
      }
    } catch {}
  }

  readonly presencePresets = [
    { emoji: '🟢', text: 'Active' },
    { emoji: '🎯', text: 'Focused — do not disturb' },
    { emoji: '📅', text: 'In a meeting' },
    { emoji: '🏃', text: 'Away' },
    { emoji: '🔴', text: 'Offline' },
  ];

  savePresence(emoji: string, text: string): void {
    this.presenceEmoji = emoji;
    this.presenceText = text;
    this.presencePickerOpen = false;
    try { localStorage.setItem('collab_presence_status', JSON.stringify({ emoji, text })); } catch {}
    this.cdr.markForCheck();
  }

  togglePresencePicker(): void {
    this.presencePickerOpen = !this.presencePickerOpen;
    this.cdr.markForCheck();
  }

  // ── Inputs ──────────────────────────────────────────
  @Input() me!: MeInfo;
  @Input() channels: Channel[] = [];
  @Input() dmContacts: DmContact[] = [];
  @Input() upcomingBirthdays: Array<{
    id: string;
    fullName: string;
    shortName: string;
    birthdayMonthDayLabel: string;
    birthdayCountdownLabel: string;
    birthdayIsToday: boolean;
    daysUntilBirthday: number;
    avatarUrl?: string;
    initials?: string;
    avatarColor?: string;
    jobTitle?: string;
    department?: string;
  }> = [];
  @Input() activeChannelId = '';
  @Input() activeDmId = '';
  @Input() activeView: 'channel' | 'dm' | 'threads' | 'saved' = 'channel';
  @Input() channelsLoading = false;
  @Input() channelsError: string | null = null;
  @Input() employeesLoading = false;
  @Input() employeesError: string | null = null;
  @Input() soundEnabled = true;
  @Input() selectedRingtone = 'classic';
  @Input() ringtoneOptions: Array<{ value: string; label: string }> = [];
  @Input() canCreateChannels = false;
  @Input() canDeactivateDmUsers = false;
  @Input() searchQuery = '';
  @Input() showSearch = false;
  @Input() searchResults: { msg: any; channelId: string; channelName: string }[] = [];
  @Input() totalDmUnread = 0;
  @Input() workspaceName = 'OptimaX';
  @Input() selfStats: { openIssueCount: number; openTaskCount: number; openEventCount: number } = { openIssueCount: 0, openTaskCount: 0, openEventCount: 0 };

  // ── Outputs ─────────────────────────────────────────
  @Output() channelSelected = new EventEmitter<string>();
  @Output() dmSelected = new EventEmitter<string>();
  @Output() viewSet = new EventEmitter<'threads' | 'saved'>();
  @Output() createChannel = new EventEmitter<void>();
  @Output() dmDeactivated = new EventEmitter<DmContact>();
  @Output() deactivatedDmUsersOpened = new EventEmitter<void>();
  @Output() channelsRetried = new EventEmitter<void>();
  @Output() soundToggled = new EventEmitter<void>();
  @Output() ringtoneChanged = new EventEmitter<string>();
  @Output() emailCompose = new EventEmitter<void>();
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() searchExecuted = new EventEmitter<void>();
  @Output() searchFocused = new EventEmitter<void>();
  @Output() searchClosed = new EventEmitter<void>();
  @Output() jumpTo = new EventEmitter<{ msg: any; channelId: string; channelName: string }>();
  @Output() workspaceOpened = new EventEmitter<DmContact>();
  @Output() channelAttachmentsRequested = new EventEmitter<Channel>();
  @Output() viewProfile = new EventEmitter<DmContact>();
  @Output() selfWorkspaceOpened = new EventEmitter<void>();

  // ── Sidebar quick-filter ─────────────────────────────
  sidebarFilter = '';

  get filteredChannels(): Channel[] {
    const q = this.sidebarFilter.trim().toLowerCase();
    if (!q) return this.channels;
    return this.channels.filter(ch => ch.name.toLowerCase().includes(q));
  }

  clearSidebarFilter(): void {
    this.sidebarFilter = '';
    this.cdr.markForCheck();
  }

  // ── Draggable divider ────────────────────────────────
  topPanelHeight = 220;
  private dragStartY = 0;
  private dragStartHeight = 0;

  startDividerDrag(event: MouseEvent): void {
    event.preventDefault();
    this.dragStartY = event.clientY;
    this.dragStartHeight = this.topPanelHeight;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientY - this.dragStartY;
      this.topPanelHeight = Math.max(80, Math.min(this.dragStartHeight + delta, 520));
      this.cdr.markForCheck();
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ── Birthday panel state ──────────────────────────────
  birthdaysPanelOpen = true;

  closeBirthdaysPanel(): void {
    this.birthdaysPanelOpen = false;
    this.cdr.markForCheck();
  }

  private readonly UPCOMING_WINDOW_DAYS = 30;

  get nearBirthdays() {
    return this.upcomingBirthdays.filter(
      (b) => b.daysUntilBirthday <= this.UPCOMING_WINDOW_DAYS,
    );
  }

  get nextBirthdayPerson() {
    return this.upcomingBirthdays[0] ?? null;
  }

  get nextBirthdayCalendar(): {
    monthLabel: string;
    weeks: (number | null)[][];
    targetDay: number;
    todayDay: number;
  } | null {
    const person = this.nextBirthdayPerson;
    if (!person) return null;
    const today = new Date();
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const target = new Date(base);
    target.setDate(base.getDate() + person.daysUntilBirthday);
    const year = target.getFullYear();
    const month = target.getMonth();
    const targetDay = target.getDate();
    const monthLabel = target.toLocaleDateString([], { month: 'long', year: 'numeric' });
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    const sameMonth =
      base.getFullYear() === year && base.getMonth() === month;
    return { monthLabel, weeks, targetDay, todayDay: sameMonth ? base.getDate() : -1 };
  }

  trackBirthday(_i: number, b: { id: string }): string {
    return b.id;
  }

  // ── DM hover card ────────────────────────────────────
  hoveredDm: DmContact | null = null;
  dmCardPos: { top: number; left: number } = { top: 0, left: 0 };
  private dmHideTimer: any = null;

  showDmCard(event: MouseEvent, dm: DmContact): void {
    clearTimeout(this.dmHideTimer);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.dmCardPos = { top: rect.top, left: rect.right + 6 };
    this.hoveredDm = dm;
    this.cdr.markForCheck();
  }

  keepDmCard(): void {
    clearTimeout(this.dmHideTimer);
  }

  hideDmCard(): void {
    this.dmHideTimer = setTimeout(() => {
      this.hoveredDm = null;
      this.cdr.markForCheck();
    }, 180);
  }

  closeDmCard(): void {
    clearTimeout(this.dmHideTimer);
    this.hoveredDm = null;
    this.cdr.markForCheck();
  }

  openAnalytics(dm: DmContact): void {
    this.closeDmCard();
    this.workspaceOpened.emit(dm);
  }

  // ── Channel hover card ───────────────────────────────
  hoveredChannel: Channel | null = null;
  channelCardPos: { top: number; left: number } = { top: 0, left: 0 };
  private chHideTimer: any = null;

  showChannelCard(event: MouseEvent, ch: Channel): void {
    clearTimeout(this.chHideTimer);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.channelCardPos = { top: rect.top, left: rect.right + 6 };
    this.hoveredChannel = ch;
    this.cdr.markForCheck();
  }

  keepChannelCard(): void {
    clearTimeout(this.chHideTimer);
  }

  hideChannelCard(): void {
    this.chHideTimer = setTimeout(() => {
      this.hoveredChannel = null;
      this.cdr.markForCheck();
    }, 180);
  }

  closeChannelCard(): void {
    clearTimeout(this.chHideTimer);
    this.hoveredChannel = null;
    this.cdr.markForCheck();
  }

  openChannelAttachments(ch: Channel): void {
    this.closeChannelCard();
    this.channelAttachmentsRequested.emit(ch);
  }

  // ── Close hover cards on Escape ─────────────────────
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDmCard();
    this.closeChannelCard();
  }

  // ── Template helpers ─────────────────────────────────

  isUserTyping(_userId: number): boolean {
    return false;
  }

  private normalizeIdentityText(value: string | null | undefined): string {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  private isOwnContact(contact: DmContact): boolean {
    const myUserId = Number(
      this.me?.userId ||
        sessionStorage.getItem('userid') ||
        sessionStorage.getItem('userId') ||
        0,
    );
    const contactUserId = Number(contact?.userId || 0);
    const contactEmployeeId = Number(contact?.employeeId || 0);
    if (myUserId && (contactUserId === myUserId || contactEmployeeId === myUserId)) {
      return true;
    }

    let sessionUser: any = null;
    try {
      const raw =
        sessionStorage.getItem('userRegData') ||
        localStorage.getItem('userRegData');
      sessionUser = raw ? JSON.parse(raw) : null;
    } catch (_) {}

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

    const contactName = this.normalizeIdentityText(contact?.fullName);
    if (contactName && myNames.has(contactName)) {
      return true;
    }

    const contactEmail = this.normalizeIdentityText(contact?.email);
    if (contactEmail && myEmails.has(contactEmail)) {
      return true;
    }

    const contactUsername = this.normalizeIdentityText((contact as any)?.username);
    return Boolean(contactUsername && myUsernames.has(contactUsername));
  }

  get visibleDmContacts(): DmContact[] {
    const q = this.sidebarFilter.trim().toLowerCase();
    return (this.dmContacts || [])
      .filter((contact) => !this.isOwnContact(contact))
      .filter((contact) => !q || (contact.fullName || contact.shortName || '').toLowerCase().includes(q))
      .sort((a, b) => {
        const ta = a.lastMessageTimestamp ?? 0;
        const tb = b.lastMessageTimestamp ?? 0;
        if (tb !== ta) return tb - ta;
        const ua = (a.unreadCount ?? 0) > 0 ? 1 : 0;
        const ub = (b.unreadCount ?? 0) > 0 ? 1 : 0;
        return ub - ua;
      });
  }

  requestDmDeactivation(event: Event, contact: DmContact): void {
    event.preventDefault();
    event.stopPropagation();
    this.dmDeactivated.emit(contact);
  }

  openDeactivatedDmUsers(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.deactivatedDmUsersOpened.emit();
  }

  isDocumentLibraryChannel(channel: Channel | null | undefined): boolean {
    return (
      channel?.workspaceMode === 'DOCUMENT_LIBRARY' ||
      channel?.workspaceMode === 'HYBRID'
    );
  }

  getChannelIconPath(name: string): string {
    const n = (name || '').toLowerCase();
    if (/document|directory|library|folder|file|archive|repository|erp/.test(n))
      return 'M3 7.5A1.5 1.5 0 014.5 6H9l1.5 1.5H19.5A1.5 1.5 0 0121 9v8.5a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5v-10z';
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
    if (/market|campaign|ads|seo|growth/.test(n))
      return 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z';
    if (/finance|account|budget|money|payment|invoice/.test(n))
      return 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    if (/product|roadmap|plan|feature|backlog/.test(n))
      return 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01';
    return 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z';
  }
}

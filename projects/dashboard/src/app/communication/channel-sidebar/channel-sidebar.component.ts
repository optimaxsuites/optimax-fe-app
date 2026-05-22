import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  ChangeDetectionStrategy,
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
export class ChannelSidebarComponent {
  // ── Inputs ──────────────────────────────────────────
  @Input() me!: MeInfo;
  @Input() channels: Channel[] = [];
  @Input() dmContacts: DmContact[] = [];
  @Input() activeChannelId = '';
  @Input() activeDmId = '';
  @Input() activeView: 'channel' | 'dm' | 'threads' = 'channel';
  @Input() channelsLoading = false;
  @Input() channelsError: string | null = null;
  @Input() employeesLoading = false;
  @Input() employeesError: string | null = null;
  @Input() soundEnabled = true;
  @Input() selectedRingtone = 'classic';
  @Input() ringtoneOptions: Array<{ value: string; label: string }> = [];
  @Input() canCreateChannels = false;
  @Input() searchQuery = '';
  @Input() showSearch = false;
  @Input() searchResults: { msg: any; channelId: string; channelName: string }[] = [];

  // ── Outputs ─────────────────────────────────────────
  @Output() channelSelected = new EventEmitter<string>();
  @Output() dmSelected = new EventEmitter<string>();
  @Output() viewSet = new EventEmitter<'threads'>();
  @Output() createChannel = new EventEmitter<void>();
  @Output() channelsRetried = new EventEmitter<void>();
  @Output() soundToggled = new EventEmitter<void>();
  @Output() ringtoneChanged = new EventEmitter<string>();
  @Output() emailCompose = new EventEmitter<void>();
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() searchExecuted = new EventEmitter<void>();
  @Output() searchClosed = new EventEmitter<void>();
  @Output() jumpTo = new EventEmitter<{ msg: any; channelId: string; channelName: string }>();

  // ── Template helpers ─────────────────────────────────

  isUserTyping(_userId: number): boolean {
    // Typing state is managed by parent; expose via input if needed
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
    return (this.dmContacts || []).filter((contact) => !this.isOwnContact(contact));
  }

  isDocumentLibraryChannel(channel: Channel | null | undefined): boolean {
    return (
      channel?.workspaceMode === 'DOCUMENT_LIBRARY' ||
      channel?.workspaceMode === 'HYBRID'
    );
  }

  /**
   * Returns an SVG path string for a channel icon based on the channel name.
   */
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

import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { Subscription } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthenticationService } from 'src/app/ui/auth/service/authentication.service';
import { ChatRealtimeNotifierService } from 'src/app/ui/shared/service/chat-realtime-notifier.service';
import {
  HeaderNotificationItem,
  HeaderProfileState,
  HeaderStateService,
} from 'src/app/ui/shared/service/header-state.service';
import { environment } from 'src/environments/environment.prod';

// dami just modified this to sharpen the app header and keep profile/notification state in sync.
@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Input() sidebarHidden!: boolean;

  headerProfile: HeaderProfileState = {
    name: 'OptimaX User',
    username: '',
    accountId: '',
    initials: 'OU',
  };
  notifications: HeaderNotificationItem[] = [];
  unreadMessages = 0;
  unreadChannels = 0;
  unreadDirectMessages = 0;
  unreadNotifications = 0;
  showUnreadNotificationsDialog = false;
  currentUserId = '';
  companyName = 'OptimaX';
  aiInsight = '';
  aiLoading = true;
  showAiPanel = false;
  aiModel = 'llama-4-scout';
  aiInsightTime = '';
  aiInsightIcon = '💡';
  private headerSub?: Subscription;
  private avatarListener = (e: Event) => {
    const url = (e as CustomEvent).detail?.avatarUrl || '';
    this.headerProfile = { ...this.headerProfile, imageUrl: url };
    this.headerStateService.setProfile(this.headerProfile);
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private authenticationService: AuthenticationService,
    private headerStateService: HeaderStateService,
    private chatRealtimeNotifierService: ChatRealtimeNotifierService,
  ) {}

  ngOnInit(): void {
    if (sessionStorage.getItem('username') == null) {
      this.router.navigate(['']);
      return;
    }

    this.syncProfileFromSession();
    this.loadCompanyName();
    this.loadAiInsight();
    window.addEventListener('optimax-avatar-updated', this.avatarListener);
    this.chatRealtimeNotifierService.start(this.resolveCollaborationRouteUuid());
    this.headerSub = this.headerStateService.view$.subscribe((state) => {
      this.notifications = state.notifications;
      this.unreadMessages = state.unreadMessages;
      this.unreadChannels = state.unreadChannels;
      this.unreadDirectMessages = state.unreadDirectMessages;
      this.unreadNotifications = state.unreadNotifications;
      if (state.profile) {
        this.headerProfile = state.profile;
      }
    });
  }

  ngOnDestroy(): void {
    this.headerSub?.unsubscribe();
    this.chatRealtimeNotifierService.stop();
    window.removeEventListener('optimax-avatar-updated', this.avatarListener);
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  openNotifications(): void {
    this.headerStateService.markAllNotificationsRead();
    this.headerStateService.markAllMessagePreviewsRead();
    this.headerStateService.updateUnreadCounts({ unreadChannels: 0, unreadDirectMessages: 0 });
  }

  clearAllNotifications(): void {
    this.headerStateService.clearAllNotifications();
    this.headerStateService.markAllMessagePreviewsRead();
    this.headerStateService.updateUnreadCounts({ unreadChannels: 0, unreadDirectMessages: 0 });
    this.showUnreadNotificationsDialog = false;
  }

  openUnreadNotificationsDialog(): void {
    this.showUnreadNotificationsDialog = true;
  }

  closeUnreadNotificationsDialog(): void {
    this.showUnreadNotificationsDialog = false;
  }

  openNotification(item: HeaderNotificationItem): void {
    this.headerStateService.markNotificationRead(item.id);
    const route =
      item.workspaceMode === 'chat'
        ? this.resolveCollaborationRoute()
        : item.route || this.resolveCollaborationRoute();
    this.dispatchCollabTarget(item, route);
  }

  get latestNotifications(): HeaderNotificationItem[] {
    return this.notifications.slice(0, 5);
  }

  get unreadNotificationItems(): HeaderNotificationItem[] {
    return this.notifications.filter((entry) => !entry.read);
  }

  get unreadBellCount(): number {
    return Number(this.unreadNotifications || 0);
  }

  viewAllNotifications(): void {
    const route = this.resolveCollaborationRoute();
    if (typeof window !== 'undefined') {
      const target = { workspaceMode: 'chat', route };
      sessionStorage.setItem('optimax_notification_target', JSON.stringify(target));
      window.dispatchEvent(
        new CustomEvent('optimax-open-collab-target', { detail: target }),
      );
    }
    this.router.navigateByUrl(route).catch(() => {});
  }

  logout(): void {
    this.authenticationService.logout();
  }

  navigateToProfile(): void {
    const uuid = this.resolveCollaborationRouteUuid();
    this.router.navigate(['/admin/dashboard/user-profile', uuid]);
  }

  navigateToSettings(): void {
    this.router.navigate(['/admin/settings/general-settings', uuidV4()]);
  }

  private loadCompanyName(): void {
    try {
      const raw = sessionStorage.getItem('userPrimaryInfoRegData');
      if (raw) {
        const info = JSON.parse(raw);
        this.companyName = info?.companyName || 'OptimaX';
      }
    } catch {}
  }

  refreshAiInsight(): void {
    sessionStorage.removeItem('optimax_ai_insight');
    this.loadAiInsight();
  }

  private pickInsightIcon(text: string): string {
    const t = text.toLowerCase();
    if (/payroll|salary|pay|remit/.test(t)) return '💰';
    if (/leave|absence|holiday/.test(t)) return '🏖️';
    if (/recruit|hire|candidate|applicant/.test(t)) return '🎯';
    if (/task|deadline|overdue/.test(t)) return '⏰';
    if (/team|collaborate|meeting/.test(t)) return '👥';
    if (/report|analytic|review/.test(t)) return '📊';
    if (/train|skill|learn/.test(t)) return '📚';
    if (/approve|pending|action/.test(t)) return '✅';
    return '💡';
  }

  private loadAiInsight(): void {
    // Use cached insight within the same session unless explicitly refreshed
    const cached = sessionStorage.getItem('optimax_ai_insight');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        this.aiInsight = parsed.text || '';
        this.aiModel = parsed.model || 'llama-4-scout';
        this.aiInsightTime = parsed.time || '';
        this.aiInsightIcon = this.pickInsightIcon(this.aiInsight);
        this.aiLoading = false;
        return;
      } catch {}
    }

    this.aiLoading = true;
    this.aiInsight = '';
    try {
      const raw = sessionStorage.getItem('userRegData');
      const user = raw ? JSON.parse(raw) : {};
      const role = user?.roles || user?.role || 'staff';
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      const day = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];

      const prompt = `You are a smart workplace assistant for ${this.companyName}. The user is a ${role} and it is ${timeOfDay} on ${day}. Generate exactly one short, specific, actionable workplace insight or nudge (10 words max) relevant to their role in an HR/ERP system. Reply with ONLY the insight text — no quotes, no intro phrases.`;

      const token = sessionStorage.getItem('Token') || sessionStorage.getItem('accessToken') || localStorage.getItem('Token2') || '';
      const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` });

      this.http.post<any>(
        `${environment.apiBaseUrl}/x/api/v2/ai/agent/prompt`,
        { prompt, mode: 'chat', responseFormat: 'text' },
        { headers }
      ).subscribe({
        next: (res) => {
          const text = (res?.response || res?.executiveSummary || '').replace(/[*#_`]/g, '').trim();
          const insight = text.split(/[.\n]/)[0].trim();
          const modelUsed = res?.model || 'llama-4-scout';
          const now = new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(new Date());
          this.aiInsight = insight;
          this.aiModel = modelUsed.includes('8b') ? 'llama-3.1-8b' : modelUsed.includes('scout') ? 'llama-4-scout' : modelUsed;
          this.aiInsightTime = `Generated at ${now}`;
          this.aiInsightIcon = this.pickInsightIcon(insight);
          this.aiLoading = false;
          try {
            sessionStorage.setItem('optimax_ai_insight', JSON.stringify({
              text: insight, model: this.aiModel, time: this.aiInsightTime
            }));
          } catch {}
        },
        error: () => {
          this.aiInsight = '';
          this.aiLoading = false;
        }
      });
    } catch {
      this.aiLoading = false;
    }
  }

  private syncProfileFromSession(): void {
    try {
      const raw = sessionStorage.getItem('userRegData');
      if (!raw) return;
      const user = JSON.parse(raw);
      let primary: any = {};
      try { primary = JSON.parse(sessionStorage.getItem('userPrimaryInfoRegData') || '{}'); } catch {}
      const displayName =
        user?.fullname || user?.name || user?.username || 'OptimaX User';
      this.currentUserId = String(user?.userId || user?.id || sessionStorage.getItem('userid') || '');
      const initials = displayName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase() || '')
        .join('') || 'OU';
      const imageUrl =
        primary?.profileImage ||
        localStorage.getItem('userProfileAvatar') ||
        user?.profileImage ||
        user?.imageUrl ||
        user?.avatarUrl ||
        user?.employee?.profileImage ||
        user?.employeeProfile?.profileImage ||
        '';

      this.headerProfile = {
        name: displayName,
        username: user?.username || displayName,
        accountId: user?.accountId || user?.id || '',
        imageUrl,
        initials,
      };

      this.headerStateService.setProfile(this.headerProfile);
    } catch (_) {}
    if (!this.currentUserId) {
      this.currentUserId = String(
        sessionStorage.getItem('userid') ||
          sessionStorage.getItem('uuid') ||
          sessionStorage.getItem('userId') ||
          '',
      );
    }
  }

  displayNotificationText(value: unknown, fallback = ''): string {
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
        .map((entry) => this.displayNotificationText(entry, ''))
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
        return this.displayNotificationText(candidate, fallback);
      }
    }
    return fallback;
  }

  private dispatchCollabTarget(item: any, route: string): void {
    if (item.workspaceMode === 'chat') {
      sessionStorage.setItem('optimax_workspace_mode', 'chat');
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('optimax_notification_target', JSON.stringify(item));
      window.dispatchEvent(
        new CustomEvent('optimax-open-collab-target', { detail: item }),
      );
    }
    this.router.navigateByUrl(route).then(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('optimax-open-collab-target', { detail: item }),
        );
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('optimax-open-collab-target', { detail: item }),
          );
        }, 220);
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('optimax-open-collab-target', { detail: item }),
          );
        }, 700);
      }
    }).catch(() => {});
  }

  private resolveCollaborationRoute(): string {
    return `/admin/dashboard/communications/${this.resolveCollaborationRouteUuid()}`;
  }

  private resolveCollaborationRouteUuid(): string {
    return (
      this.extractRouteUserId(this.router.url) ||
      String(sessionStorage.getItem('uuid') || '').trim() ||
      String(localStorage.getItem('uuid') || '').trim() ||
      'uu'
    );
  }

  private extractRouteUserId(url: string): string {
    const match = String(url || '').match(/\/admin\/dashboard\/communications\/([^/?#]+)/);
    return match?.[1] || '';
  }
}

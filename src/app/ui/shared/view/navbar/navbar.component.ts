import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthenticationService } from 'src/app/ui/auth/service/authentication.service';
import { ChatRealtimeNotifierService } from 'src/app/ui/shared/service/chat-realtime-notifier.service';
import {
  HeaderMessagePreviewItem,
  HeaderNotificationItem,
  HeaderProfileState,
  HeaderStateService,
} from 'src/app/ui/shared/service/header-state.service';

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
  messagePreviews: HeaderMessagePreviewItem[] = [];
  unreadMessages = 0;
  unreadNotifications = 0;
  currentUserId = '';
  private headerSub?: Subscription;

  constructor(
    private router: Router,
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
    this.chatRealtimeNotifierService.start(this.currentUserId);
    this.headerSub = this.headerStateService.view$.subscribe((state) => {
      this.notifications = state.notifications;
      this.messagePreviews = state.messagePreviews;
      this.unreadMessages = state.messagePreviews.filter((entry) => !entry.read).length;
      this.unreadNotifications = state.unreadNotifications;
      if (state.profile) {
        this.headerProfile = state.profile;
      }
    });
  }

  ngOnDestroy(): void {
    this.headerSub?.unsubscribe();
    this.chatRealtimeNotifierService.stop();
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  openMessages(): void {
    sessionStorage.setItem('optimax_workspace_mode', 'chat');
  }

  openNotifications(): void {
  }

  openNotification(item: HeaderNotificationItem): void {
    this.headerStateService.markNotificationRead(item.id);
    const route =
      item.route || `/admin/dashboard/communications/${this.currentUserId}`;
    this.dispatchCollabTarget(item, route);
  }

  openMessagePreview(item: HeaderMessagePreviewItem): void {
    this.headerStateService.markMessagePreviewRead(item.id);
    const route =
      item.route || `/admin/dashboard/communications/${this.currentUserId}`;
    this.dispatchCollabTarget(item, route);
  }

  get latestNotifications(): HeaderNotificationItem[] {
    return this.notifications.slice(0, 5);
  }

  get latestMessagePreviews(): HeaderMessagePreviewItem[] {
    return this.messagePreviews.slice(0, 5);
  }

  viewAllMessages(): void {
    sessionStorage.setItem('optimax_workspace_mode', 'chat');
    this.router.navigateByUrl(`/admin/dashboard/communications/${this.currentUserId}`).catch(() => {});
  }

  viewAllNotifications(): void {
    if (typeof window !== 'undefined') {
      const target = { workspaceMode: 'feed', route: `/admin/dashboard/communications/${this.currentUserId}` };
      sessionStorage.setItem('optimax_notification_target', JSON.stringify(target));
      window.dispatchEvent(
        new CustomEvent('optimax-open-collab-target', { detail: target }),
      );
    }
    this.router.navigateByUrl(`/admin/dashboard/communications/${this.currentUserId}`).catch(() => {});
  }

  logout(): void {
    this.authenticationService.logout();
  }

  private syncProfileFromSession(): void {
    try {
      const raw = sessionStorage.getItem('userRegData');
      if (!raw) return;
      const user = JSON.parse(raw);
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
}

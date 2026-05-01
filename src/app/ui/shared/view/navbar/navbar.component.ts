import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthenticationService } from 'src/app/ui/auth/service/authentication.service';
import {
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
  unreadMessages = 0;
  unreadNotifications = 0;
  currentUserId = '';
  private headerSub?: Subscription;

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private headerStateService: HeaderStateService,
  ) {}

  ngOnInit(): void {
    if (sessionStorage.getItem('username') == null) {
      this.router.navigate(['']);
      return;
    }

    this.syncProfileFromSession();
    this.headerSub = this.headerStateService.view$.subscribe((state) => {
      this.notifications = state.notifications;
      this.unreadMessages = state.unreadMessages;
      this.unreadNotifications = state.unreadNotifications;
      if (state.profile) {
        this.headerProfile = state.profile;
      }
    });
  }

  ngOnDestroy(): void {
    this.headerSub?.unsubscribe();
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  openMessages(): void {
    sessionStorage.setItem('optimax_workspace_mode', 'chat');
    this.router.navigateByUrl(`/admin/dashboard/feed/${this.currentUserId}`).catch(() => {});
  }

  openNotifications(): void {
    this.headerStateService.markAllNotificationsRead();
  }

  openNotification(item: HeaderNotificationItem): void {
    this.headerStateService.markAllNotificationsRead();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('optimax_notification_target', JSON.stringify(item));
      window.dispatchEvent(
        new CustomEvent('optimax-open-collab-target', { detail: item }),
      );
    }
    if (item.route) {
      this.router.navigateByUrl(item.route).catch(() => {});
    }
  }

  get latestNotifications(): HeaderNotificationItem[] {
    return this.notifications.slice(0, 5);
  }

  viewAllNotifications(): void {
    this.headerStateService.markAllNotificationsRead();
    if (typeof window !== 'undefined') {
      const target = { workspaceMode: 'feed', route: `/admin/dashboard/feed/${this.currentUserId}` };
      sessionStorage.setItem('optimax_notification_target', JSON.stringify(target));
      window.dispatchEvent(
        new CustomEvent('optimax-open-collab-target', { detail: target }),
      );
    }
    this.router.navigateByUrl(`/admin/dashboard/feed/${this.currentUserId}`).catch(() => {});
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
  }
}

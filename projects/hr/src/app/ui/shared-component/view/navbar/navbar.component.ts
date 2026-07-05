import { Component, Output, EventEmitter, Input, OnDestroy, OnInit, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthenticationService } from '../../service/auth-service/authentication.service';
import { NavigationLinksService } from '../../service/navigation-links/navigation-links.service';
import { Subscription } from 'rxjs';
import { HrTaskNotificationService, HrNotification } from '../../../service/hr-task-notification.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Input() sidebarHidden!: boolean;

  userInfoRegData: any = {};
  userRegData: any = {};
  private navigationSubscription?: Subscription;
  private notifSub?: Subscription;
  private notifListSub?: Subscription;

  readonly hrSettingsRoute: string;

  notifCount = 0;
  showNotifPanel = false;
  notifications: HrNotification[] = [];

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private navLinks: NavigationLinksService,
    private notifService: HrTaskNotificationService,
  ){
    this.hrSettingsRoute = this.navLinks.getLink('HRSettings');
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }


  ngOnInit() {
    // Always wire up notification subscription — must not be inside the early return
    // because it needs to work even before the session is fully populated (new-tab opens).
    this.notifSub = this.notifService.unreadCount$.subscribe((count: number) => {
      this.notifCount = count;
    });
    this.notifListSub = this.notifService.notifications$.subscribe(items => {
      this.notifications = items;
    });

    if (sessionStorage.getItem("username") == null) {
        // Session not yet populated — the async auto-login will populate it shortly.
        // Subscribe to router events so we refresh user data once the session arrives.
        this.navigationSubscription = this.router.events.subscribe((event) => {
          if (event instanceof NavigationEnd) {
            if (sessionStorage.getItem("username")) this.refreshUserData();
          }
        });
      return;
    }

    this.refreshUserData();
    this.navigationSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.refreshUserData();
      }
    });
  }

  ngOnDestroy(): void {
    this.navigationSubscription?.unsubscribe();
    this.notifSub?.unsubscribe();
    this.notifListSub?.unsubscribe();
  }

  @HostListener('document:click')
  onDocClick(): void { if (this.showNotifPanel) this.showNotifPanel = false; }

  toggleNotifPanel(): void {
    this.showNotifPanel = !this.showNotifPanel;
  }

  markAllRead(): void {
    this.notifService.markAllRead();
    this.showNotifPanel = false;
  }

  notifTime(iso: string): string {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
  }
  




  logout(): void {
    this.authenticationService.logout();

    // sessionStorage.removeItem("username");
    // sessionStorage.removeItem("token");

    // //added by yomi
    // sessionStorage.removeItem("userInfoRegData");
    // sessionStorage.removeItem("userRegData");
    // sessionStorage.removeItem("accessToken");
    // sessionStorage.removeItem("userid");
    // sessionStorage.removeItem("Token");

    // this.router.navigate([''])
}

  private readUserRegData(): any[] {
    const rawValue = sessionStorage.getItem('userRegData');

    if (!rawValue || rawValue === 'undefined') {
      return [];
    }

    try {
      return JSON.parse(rawValue);
    } catch {
      return [];
    }
  }

  private refreshUserData(): void {
    this.userInfoRegData = this.readUserRegData();
    this.userRegData = this.userInfoRegData && Array.isArray(this.userInfoRegData) && this.userInfoRegData.length > 0
      ? this.userInfoRegData[0]
      : this.userInfoRegData;
  }



}

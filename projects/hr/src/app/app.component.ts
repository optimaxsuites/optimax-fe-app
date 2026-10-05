import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { TabConfig } from './ui/shared-component/service/interface/data';
import { RecruitmentListComponent } from './ui/view/recruitment/recruitment-list/recruitment-list.component';
import { CandidateComponent } from './ui/view/recruitment/candidate/candidate.component';
import { ScheduledInterviewComponent } from './ui/view/recruitment/scheduled-interview/scheduled-interview.component';
import { AuthenticationService } from './ui/shared-component/service/auth-service/authentication.service';
import { MetadataService } from './ui/service/metadata.service';
import { environment } from './ui/shared-component/service/environments/environment';

const DEV_LOGIN_STORAGE_KEY = 'devLoginCredentials';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppHrComponent {
  messageService: any;
  navigationLink: any;
  sidebarHidden: boolean = true;

  constructor(
    private authenticationService: AuthenticationService,
    private metadataService: MetadataService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.checkScreenWidth();

    // Development mode: sign in for real so the session holds the actual user ID and a fresh token.
    if (environment.env === 'development') {
      if (this.authenticationService.isAuthenticated() && this.hasRealLoginSession()) {
        this.metadataService.fetchMetaData(true);
      } else {
        // Reload once after signing in so components initialise with the real session.
        this.userLoginAction().then(() => {
          if (this.hasRealLoginSession()) {
            window.location.reload();
          }
        });
      }
    } else if (this.authenticationService.isAuthenticated()) {
      this.metadataService.fetchMetaData(true);
    } else {
      this.userLoginAction();
    }
    this.exposeGlobalHelpers();

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.checkScreenWidth();
        window.requestAnimationFrame(() => {
          this.checkScreenWidth();
          window.dispatchEvent(new Event('resize'));
        });
      }
    });

    // if (this.authenticationService.isAuthenticated()) {
    //   this.metadataService.fetchMetaData(true);
    //   return;
    // }
  }

  /** True when the session came from a real sign-in (not the old hardcoded dev user). */
  private hasRealLoginSession(): boolean {
    try {
      const userRegData = JSON.parse(sessionStorage.getItem('userRegData') || 'null');
      return !!userRegData?.accessToken && !!sessionStorage.getItem('userid');
    } catch {
      return false;
    }
  }

  async userLoginAction(): Promise<void> {
    const credentials = this.getDevLoginCredentials();
    if (!credentials) {
      if (environment.env !== 'development') {
        return;
      }
      console.warn(
        '🔧 [Development Mode] No dev login saved. Run loginAs("<username>", "<password>") in the console to sign in.',
      );
      return;
    }

    console.log(`🔧 [Development Mode] Signing in as ${credentials.username}...`);
    const loginDetails = {
      username: credentials.username,
      password: credentials.password,
      project: 'ERP',
      clientId: 'optimax-erp-web',
      appVersion: '2026.05.30',
    };

    try {
      const data = await this.authenticationService
        .userLogin(loginDetails)
        .toPromise();

      if (!data) {
        console.error('🔧 [Development Mode] Sign-in returned no data.');
        return;
      }

      this.loadInitParam(data);
      this.metadataService.fetchMetaData(true);
    } catch (error) {
      console.error(
        `🔧 [Development Mode] Sign-in failed for ${credentials.username}. ` +
          'Check the password and run loginAs("<username>", "<password>") again.',
        error,
      );
      this.authenticationService.logout();
    }
  }

  private getDevLoginCredentials(): { username: string; password: string } | null {
    if (environment.env !== 'development') {
      return null;
    }

    try {
      const stored = JSON.parse(localStorage.getItem(DEV_LOGIN_STORAGE_KEY) || 'null');
      if (stored?.username && stored?.password) {
        return { username: stored.username, password: stored.password };
      }
    } catch {
      // Ignore malformed stored credentials.
    }
    return null;
  }

  /**
   * Save dev login credentials in this browser only (never in source) and sign in with them.
   */
  async loginAs(username: string, password: string): Promise<void> {
    if (environment.env !== 'development') {
      console.error('loginAs() is only available in development mode.');
      return;
    }

    localStorage.setItem(DEV_LOGIN_STORAGE_KEY, JSON.stringify({ username, password }));
    this.authenticationService.logout();
    await this.userLoginAction();

    if (this.hasRealLoginSession()) {
      window.location.reload();
    }
  }

  loadInitParam(data: any) {
    const role = data.roles;
    const username = data.username;
    const fullname =
      data.fullname || data.fullName || data.name || data.username;
    const email = data.email;
    const userId = data.id ?? data.userId;

    sessionStorage.setItem('role', role);
    sessionStorage.setItem('username', username);
    sessionStorage.setItem('fullname', fullname);
    sessionStorage.setItem('email', email);
    sessionStorage.setItem('userid', userId);

    try {
      localStorage.setItem('role', role);
      localStorage.setItem('username', username);
      localStorage.setItem('fullname', fullname);
      localStorage.setItem('email', email);
      localStorage.setItem('userid', userId);
    } catch (e) {
      console.warn(
        'localStorage quota exceeded or disabled, proceeding with sessionStorage only',
        e,
      );
    }

    const token = this.extractToken(data.accessToken);

    if (!token) {
      throw new Error('Unable to extract access token from login response');
    }

    sessionStorage.setItem('Token', token);
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('accessToken', data.accessToken);
    sessionStorage.setItem('userRegData', JSON.stringify(data));

    try {
      localStorage.setItem('Token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('Token2', token);
      localStorage.setItem('accessToken2', data.accessToken);
      localStorage.setItem('userRegData', JSON.stringify(data));
    } catch (e) {
      console.warn(
        'localStorage quota exceeded or disabled, proceeding with sessionStorage only',
        e,
      );
    }
  }

  private extractToken(accessToken: unknown): string {
    const rawToken = String(accessToken || '').trim();

    if (!rawToken) {
      return '';
    }

    const cookieMatch = rawToken.match(/=(.*?)(;|$)/);
    if (cookieMatch?.[1]) {
      return cookieMatch[1].trim();
    }

    const bearerMatch = rawToken.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch?.[1]) {
      return bearerMatch[1].trim();
    }

    return rawToken;
  }

  toggleSidebar() {
    this.sidebarHidden = !this.sidebarHidden; // Toggle sidebar visibility
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenWidth();
  }

  private checkScreenWidth(): void {
    this.sidebarHidden = window.innerWidth <= 992;
  }

  /**
   * Log out and clear all session data
   */
  logout(): void {
    console.log('Logging out...');
    const devLogin = localStorage.getItem(DEV_LOGIN_STORAGE_KEY);
    sessionStorage.clear();
    localStorage.clear();
    if (devLogin) {
      localStorage.setItem(DEV_LOGIN_STORAGE_KEY, devLogin);
    }
    window.location.href = '/';
  }

  /**
   * Get current user information from session
   */
  getCurrentUserInfo(): {
    username: string | null;
    role: string | null;
    userId: string | null;
    isAdmin: boolean;
  } {
    const username = sessionStorage.getItem('username');
    const role = sessionStorage.getItem('role');
    const userId = sessionStorage.getItem('userid');

    return {
      username,
      role,
      userId,
      isAdmin: role === 'ROLE_ADMIN',
    };
  }

  /**
   * Expose helper functions to browser console for easy switching
   */
  private exposeGlobalHelpers(): void {
    (window as any).loginAs = (username: string, password: string) =>
      this.loginAs(username, password);
    (window as any).logout = () => this.logout();
    (window as any).getCurrentUser = () => this.getCurrentUserInfo();

    console.log(
      'Console helpers available: loginAs(username, password), logout(), getCurrentUser()',
    );
  }
}

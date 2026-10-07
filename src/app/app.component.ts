import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { TabConfig } from './ui/shared-component/service/interface/data';
import { RecruitmentListComponent } from './ui/view/recruitment/recruitment-list/recruitment-list.component';
import { CandidateComponent } from './ui/view/recruitment/candidate/candidate.component';
import { ScheduledInterviewComponent } from './ui/view/recruitment/scheduled-interview/scheduled-interview.component';
import { AuthenticationService } from './ui/shared-component/service/auth-service/authentication.service';
import { MetadataService } from './ui/service/metadata.service';
import { environment } from './ui/shared-component/service/environments/environment';
import { firstValueFrom } from 'rxjs';

// Dev-only bearer token for eseose. Expires 24h after issue (this one: 2026-10-08 15:02 WAT).
// Signing in as eseose anywhere else invalidates it early.
const DEV_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJ0ZW5hbnQiOiJvcHRpbWF4Iiwic3ViIjoiZXNlb3NlIiwiaWF0IjoxNzkxMzgxNzM3LCJleHAiOjE3OTE0NjgxMzd9.IeSicPKkLMnXMAQQqiw9_euqF3nxYCcLQnGDWGDgFSI';

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
    this.restoreSessionFromLocalStorage();

    // Development mode: set hardcoded authentication.
    // The token expires 24h after it is issued — replace DEV_TOKEN daily.
    if (environment.env === 'development') {
      console.log('🔧 [Development Mode] Setting hardcoded authentication for eseose');
      this.setDevSession();
      this.metadataService.fetchMetaData(true);
    } else if (this.authenticationService.isAuthenticated()) {
      this.metadataService.fetchMetaData(true);
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

  private async signIn(username: string, password: string): Promise<boolean> {
    const loginDetails = {
      username,
      password,
      project: 'ERP',
      clientId: 'optimax-erp-web',
      appVersion: '2026.05.30',
    };

    try {
      const data = await firstValueFrom(this.authenticationService.userLogin(loginDetails));

      if (!data) {
        console.error('Sign-in returned no data.');
        return false;
      }

      this.loadInitParam(data);
      this.metadataService.fetchMetaData(true);
      return true;
    } catch (error: unknown) {
      console.error(`Sign-in failed for ${username}. Check the credentials and try again.`, error);
      return false;
    }
  }

  async loginAs(username: string, password: string): Promise<void> {
    if (environment.env !== 'development') {
      console.error('loginAs() is only available in development mode.');
      return;
    }

    this.authenticationService.logout();
    if (await this.signIn(username, password)) {
      window.location.reload();
    }
  }

  loadInitParam(data: any) {
    const response = data?.data ?? data;
    const user = response?.user ?? response;
    const roleValue = user.roles ?? user.role ?? response.roles ?? response.role;
    const role = Array.isArray(roleValue) ? roleValue[0] : roleValue;
    const username = user.username ?? user.userName ?? response.username ?? '';
    const fullname =
      user.fullname || user.fullName || user.name || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || username;
    const email = user.email ?? response.email ?? '';
    const userId = user.userId ?? user.id ?? response.userId ?? response.id;
    const accessToken =
      response.accessToken ?? response.token ?? user.accessToken ?? user.token;

    if (userId === undefined || userId === null || String(userId).trim() === '') {
      throw new Error('Login response does not include an authentication user ID');
    }
    const token = this.extractToken(accessToken);
    if (!token) {
      throw new Error('Unable to extract access token from login response');
    }

    sessionStorage.setItem('role', String(role ?? ''));
    sessionStorage.setItem('username', String(username));
    sessionStorage.setItem('fullname', String(fullname));
    sessionStorage.setItem('email', String(email));
    sessionStorage.setItem('userid', String(userId));

    try {
      localStorage.setItem('role', String(role ?? ''));
      localStorage.setItem('username', String(username));
      localStorage.setItem('fullname', String(fullname));
      localStorage.setItem('email', String(email));
      localStorage.setItem('userid', String(userId));
    } catch (e) {
      console.warn(
        'localStorage quota exceeded or disabled, proceeding with sessionStorage only',
        e,
      );
    }

    sessionStorage.setItem('Token', token);
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('accessToken', String(accessToken));
    sessionStorage.setItem('userRegData', JSON.stringify(data));

    try {
      localStorage.setItem('Token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('Token2', token);
      localStorage.setItem('accessToken2', String(accessToken));
      localStorage.setItem('userRegData', JSON.stringify(data));
    } catch (e) {
      console.warn(
        'localStorage quota exceeded or disabled, proceeding with sessionStorage only',
        e,
      );
    }
  }

  private setDevSession(): void {
    // Eseose Odion: auth user ID 65 -> employee ID 13.
    const devUser = {
      id: 65,
      userId: 65,
      username: 'eseose',
      fullname: 'Eseose Odion',
      email: 'eseose.odion@centrifugegroup.com',
      role: 'ADMIN',
    };

    for (const storage of [sessionStorage, localStorage]) {
      storage.setItem('Token', DEV_TOKEN);
      storage.setItem('token', DEV_TOKEN);
      storage.setItem('userid', String(devUser.userId));
      storage.setItem('username', devUser.username);
      storage.setItem('fullname', devUser.fullname);
      storage.setItem('email', devUser.email);
      storage.setItem('role', devUser.role);
      storage.setItem('userRegData', JSON.stringify(devUser));
    }
    sessionStorage.setItem('uuid', '1');
  }

  /**
   * sessionStorage is cleared for every new tab/browser restart, but the login is also kept in
   * localStorage. Copy it back so screens that read the user from sessionStorage (names, user ID)
   * don't fall back to "Admin" while the token is still valid.
   */
  private restoreSessionFromLocalStorage(): void {
    const keys = ['role', 'username', 'fullname', 'email', 'userid', 'Token', 'token', 'userRegData'];
    try {
      for (const key of keys) {
        const localValue = localStorage.getItem(key);
        if (!sessionStorage.getItem(key) && localValue && localValue !== 'undefined' && localValue !== 'null') {
          sessionStorage.setItem(key, localValue);
        }
      }
    } catch {
      // Storage unavailable (e.g. privacy mode); screens fall back to their defaults.
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
    sessionStorage.clear();
    localStorage.clear();
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

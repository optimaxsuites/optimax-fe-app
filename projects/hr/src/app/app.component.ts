import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { TabConfig } from './ui/shared-component/service/interface/data';
import { RecruitmentListComponent } from './ui/view/recruitment/recruitment-list/recruitment-list.component';
import { CandidateComponent } from './ui/view/recruitment/candidate/candidate.component';
import { ScheduledInterviewComponent } from './ui/view/recruitment/scheduled-interview/scheduled-interview.component';
import { AuthenticationService } from './ui/shared-component/service/auth-service/authentication.service';
import { MetadataService } from './ui/service/metadata.service';
import { environment } from './ui/shared-component/service/environments/environment';

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
    this.userLoginAction();
    this.exposeGlobalHelpers();  // Added by Ese to expose helper functions for console testing

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

  async userLoginAction(): Promise<void> {
    console.log("Signing in user with hardcoded credentials for testing...");
    const loginDetails = {
      // username: 'Ayaobasheba',
      username: 'developer',
      password: '123456',
      project: 'ERP',
      apiKey: environment.apiKey,
    };

if (!loginDetails.username || !loginDetails.password) {
  this.messageService.add({
    severity: 'error',
    summary: 'Error',
    detail: 'Username and password are required',
  });
  return;
}

try {
  const data = await this.authenticationService
    .userLogin(loginDetails)
    .toPromise();

  if (!data) {
    return;
  }

  this.loadInitParam(data);
  this.metadataService.fetchMetaData(true);

} catch (error) {
  // Do NOT call logout here — it would redirect to login and break shared task links
  // opened in a new tab where the user is already authenticated via localStorage.
  console.warn('Background auto-login skipped (likely a shared-link tab):', error);
}
  }

  loadInitParam(data: any) {
    const fullname = data.fullname || data.fullName || data.name || data.username;
    sessionStorage.setItem('role', data.roles);
    sessionStorage.setItem('username', data.username);
    sessionStorage.setItem('fullname', fullname);
    sessionStorage.setItem('email', data.email);
    sessionStorage.setItem('userid', data.id);
    const token = this.extractToken(data.accessToken);

if (!token) {
  throw new Error('Unable to extract access token from login response');
}

sessionStorage.setItem('Token', token);
sessionStorage.setItem('token', token);
sessionStorage.setItem('accessToken', data.accessToken);
sessionStorage.setItem('userRegData', JSON.stringify(data));

// Persist all auth keys to localStorage so shared links opened in a new tab stay authenticated
localStorage.setItem('Token', token);
localStorage.setItem('token', token);
localStorage.setItem('Token2', token);
localStorage.setItem('accessToken2', data.accessToken);
localStorage.setItem('userid', String(data.id || ''));
localStorage.setItem('username', data.username || '');
localStorage.setItem('fullname', fullname || '');
localStorage.setItem('email', data.email || '');
localStorage.setItem('role', data.roles || '');
localStorage.setItem('userRegData', JSON.stringify(data));
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

  // ========== Added by Ese for testing cooperative features - Console only ==========

  /**
   * Switch to admin account
   */
  async switchToAdmin(): Promise<void> {
    console.log('Switching to admin account...');
    const loginDetails = {
      username: 'damilola',
      password: 'Damilolar@123',
      project: 'ERP',
      apiKey: environment.apiKey,
    };

    try {
      const data = await this.authenticationService.userLogin(loginDetails).toPromise();
      if (data) {
        this.loadInitParam(data);
        this.metadataService.fetchMetaData(true);
        window.location.reload();
      } else {
        console.error('Failed to switch to admin: No data returned');
      }
    } catch (error) {
      console.error('Failed to switch to admin:', error);
    }
  }

  /**
   * Switch to regular user account
   */
  async switchToUser(): Promise<void> {
    console.log('Switching to user account...');
    const loginDetails = {
      username: 'developer',
      password: '123456',
      project: 'ERP',
      apiKey: environment.apiKey,
    };

    try {
      const data = await this.authenticationService.userLogin(loginDetails).toPromise();
      if (data) {
        this.loadInitParam(data);
        this.metadataService.fetchMetaData(true);
        window.location.reload();
      } else {
        console.error('Failed to switch to user: No data returned');
      }
    } catch (error) {
      console.error('Failed to switch to user:', error);
    }
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
  getCurrentUserInfo(): { username: string | null; role: string | null; userId: string | null; isAdmin: boolean } {
    const username = sessionStorage.getItem('username');
    const role = sessionStorage.getItem('role');
    const userId = sessionStorage.getItem('userid');
    return {
      username,
      role,
      userId,
      isAdmin: role === 'ROLE_ADMIN'
    };
  }

  /**
   * Expose helper functions to browser console for easy switching
   */
  private exposeGlobalHelpers(): void {
    (window as any).switchToAdmin = () => this.switchToAdmin();
    (window as any).switchToUser = () => this.switchToUser();
    (window as any).logout = () => this.logout();
    (window as any).getCurrentUser = () => this.getCurrentUserInfo();
    console.log('Console helpers available: switchToAdmin(), switchToUser(), logout(), getCurrentUser()');
  }
}
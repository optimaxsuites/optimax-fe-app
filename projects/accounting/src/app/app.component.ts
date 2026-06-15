import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from './ui/sharedComponent/service/auth-service/authentication.service';
import { environment } from './ui/sharedComponent/service/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'erp-accounting';

  private hasLoggedIn = false;

  constructor(private authenticationService: AuthenticationService) {
    const isExpiredOrMissing = this.authenticationService.isAuthenticated() === false;
    if (isExpiredOrMissing) {

      // Clear stale expired tokens before re-logging in
      sessionStorage.removeItem('Token');
      localStorage.removeItem('Token2');
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
      sessionStorage.removeItem('accessToken');
      localStorage.removeItem('accessToken2');
      this.userLoginAction();
    }
  }

  ngOnInit(): void {
    const existingUser = sessionStorage.getItem('userPrimaryInfoRegData');

    console.log('[Optimax Diagnostic] Logged-in User:', existingUser ? JSON.parse(existingUser) : 'No profile loaded yet');

    if (!existingUser) {
      const userId = sessionStorage.getItem('userid');
      if (userId) {
        this.fetchUserPrimaryInfo(userId);
      }
    }
  }

  // ✅ FIXED: Now async with try/catch, mirroring Hospitality exactly
  async userLoginAction(): Promise<void> {
    if (this.hasLoggedIn) return;
    this.hasLoggedIn = true;

    console.warn('[Optimax Accounting] Auto-login sequence starting...');

    const loginDetails = {
      username: 'developer',
      password: '123456',
      project: 'ERP',
      clientId: environment.clientId,
      appVersion: environment.appVersion,
    };

    try {
      this.authenticationService.userLogin(loginDetails).subscribe({
        next: (data: any) => {
          if (data) {
            this.loadInitParam(data);

            if (data.username) {
              this.fetchUserByUsername(data.username);
            } else if (data.id) {
              this.fetchUserPrimaryInfo(String(data.id));
            }
          }
        },
        error: (err: any) => {
          console.error('[Optimax Accounting] Auto-login failed:', err);
          this.hasLoggedIn = false; // ✅ Reset on error to allow retry, mirroring Hospitality
        }
      });
    } catch (error) {
      console.error('[Optimax Accounting] Unexpected error during login:', error);
      this.hasLoggedIn = false; // ✅ Reset on error to allow retry, mirroring Hospitality
    }
  }

  private fetchUserByUsername(username: string): void {
    this.authenticationService.getRegDataByUsername(username).subscribe({
      next: (userData: any) => {
        const userId = userData?.id || userData?.userId;
        if (userId) {
          sessionStorage.setItem('userid', String(userId));
          this.fetchUserPrimaryInfo(String(userId));
        }
      },
      error: (err: any) => {
        console.warn('[Optimax Accounting] Could not fetch user by username:', err);
      }
    });
  }

  private fetchUserPrimaryInfo(userId: string): void {
    this.authenticationService.getUserPrimaryInfoById(userId).subscribe({
      next: (primaryInfo: any) => {
        sessionStorage.setItem('userPrimaryInfoRegData', JSON.stringify(primaryInfo));
        console.log('[Optimax Accounting] User primary info loaded:', primaryInfo?.username || userId);
      },
      error: (err: any) => {
        console.warn('[Optimax Accounting] Could not fetch user primary info:', err);
      }
    });
  }

  loadInitParam(data: any): void {
    if (!data) {
      return;
    }

    if (data.roles)    sessionStorage.setItem('role', data.roles);
    if (data.username) sessionStorage.setItem('username', data.username);
    if (data.fullname) sessionStorage.setItem('fullname', data.fullname);
    if (data.email)    sessionStorage.setItem('email', data.email);
    if (data.id)       sessionStorage.setItem('userid', String(data.id));

    const entityId = this.extractEntityId(data);
    if (entityId) {
      sessionStorage.setItem('entityId', entityId);
      localStorage.setItem('entityId', entityId);
      console.log('[Optimax Accounting] Stored entityId:', entityId);
    }

    if (data.ecode && data.ecode !== 'null') {
      localStorage.setItem('tenantId', data.ecode);
    }

    const safeUserData = { ...data, accessToken: undefined, token: undefined };
    sessionStorage.setItem('userRegData', JSON.stringify(safeUserData));

    const userId = sessionStorage.getItem('userid');
    if (userId) {
      this.authenticationService.getUserBranchInfoById(userId).subscribe({
        next: (branchData: any) => {
          sessionStorage.setItem('userBranchInfoRegData', JSON.stringify(branchData));
        },
        error: () => { /* Branch info is optional */ }
      });
    }
  }

  private extractEntityId(data: any): string | null {
    if (!data) {
      return null;
    }

    const keys = [
      'entityId', 'EntityId', 'entityID', 'entity_id',
      'entity', 'clientId', 'clientID', 'client_id', 'clientid',
      'companyId', 'companyID', 'company_id', 'companyid'
    ];

    for (const key of keys) {
      const value = data[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }

    if (typeof data === 'object') {
      return this.extractEntityId(data.data) || this.extractEntityId(data.user) || this.extractEntityId(data.response) || null;
    }

    return null;
  }
}

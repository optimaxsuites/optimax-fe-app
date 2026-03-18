import { Component, HostListener } from '@angular/core';
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
  styleUrl: './app.component.scss',
})
export class AppHrComponent {
  messageService: any;
  navigationLink: any;
  router: any;
  sidebarHidden: boolean = true;
  constructor(
    private authenticationService: AuthenticationService,
    private metadataService: MetadataService,
  ) {}

  ngOnInit(): void {
    if (this.authenticationService.isAuthenticated()) {
      this.metadataService.fetchMetaData(true);
      return;
    }

    this.userLoginAction();
  }

  async userLoginAction(): Promise<void> {
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
      this.authenticationService.logout();
    }
  }

  loadInitParam(data: any) {
    sessionStorage.setItem('role', data.roles);
    sessionStorage.setItem('username', data.username);
    sessionStorage.setItem('fullname', data.fullname);
    sessionStorage.setItem('email', data.email);
    sessionStorage.setItem('userid', data.id);
    const token = this.extractToken(data.accessToken);

    if (!token) {
      throw new Error('Unable to extract access token from login response');
    }

    sessionStorage.setItem('Token', token);
    sessionStorage.setItem('token', token);
    localStorage.setItem('Token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('Token2', token);
    sessionStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('accessToken2', data.accessToken);
    sessionStorage.setItem('userRegData', JSON.stringify(data));
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
}

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';

const DEFAULT_SERVER = 'https://be.optimaxsuites.com';

@Component({
  selector: 'app-workspace-setup',
  templateUrl: './workspace-setup.component.html',
  styleUrls: ['./workspace-setup.component.scss'],
})
export class WorkspaceSetupComponent {
  workspaceId = localStorage.getItem('workspaceId') || '';
  serverUrl = localStorage.getItem('serverUrl') || DEFAULT_SERVER;
  wsError = '';
  urlError = '';

  constructor(
    private router: Router,
    private navigationLink: NavigationLinksService,
  ) {}

  continue(): void {
    this.wsError = '';
    this.urlError = '';

    const ws = this.workspaceId.trim().toLowerCase();
    if (!ws) {
      this.wsError = 'Enter your workspace ID to continue.';
      return;
    }

    const url = this.serverUrl.trim().replace(/\/$/, '');
    if (!url || !url.startsWith('http')) {
      this.urlError = 'Enter a valid server URL (e.g. https://be.optimaxsuites.com).';
      return;
    }

    localStorage.setItem('workspaceId', ws);
    sessionStorage.setItem('workspaceId', ws);
    localStorage.setItem('serverUrl', url);
    sessionStorage.setItem('serverUrl', url);

    const loginLink = this.navigationLink.getLink('signinLink');
    this.router.navigate([loginLink]);
  }

  skip(): void {
    localStorage.setItem('workspaceId', 'optimax');
    sessionStorage.setItem('workspaceId', 'optimax');
    localStorage.setItem('serverUrl', DEFAULT_SERVER);
    sessionStorage.setItem('serverUrl', DEFAULT_SERVER);
    const loginLink = this.navigationLink.getLink('signinLink');
    this.router.navigate([loginLink]);
  }
}

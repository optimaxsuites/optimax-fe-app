import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, of, map, catchError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { NavigationLinksService } from '../../shared/service/navigation-links/navigation-links.service';
import { AuthenticationService } from './authentication.service';

@Injectable({ providedIn: 'root' })
export class VendorPortalGuard implements CanActivate {

  private baseUrl = (environment as any).apiBaseUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private navLinks: NavigationLinksService,
    private authService: AuthenticationService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | boolean | UrlTree {

    if (!this.authService.isAuthenticated()) {
      const loginLink = this.navLinks.getLink('signinLink');
      return this.router.parseUrl(loginLink);
    }

    const role = sessionStorage.getItem('userApplicationRole') || '';
    // Only enforce vendor login-enabled check for VENDOR role users
    if (!role.includes('VENDOR')) {
      return true;
    }

    const userId = sessionStorage.getItem('userid');
    if (!userId) return true;

    const tenantId = sessionStorage.getItem('tenantId') || localStorage.getItem('tenantId') || 'optimax';

    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/commerce/vendors/by-user/${userId}`, {
        headers: { 'X-Tenant-ID': tenantId }
      })
      .pipe(
        map(vendor => {
          if (vendor?.loginEnabled === true) {
            return true;
          }
          // loginEnabled is false — send to pending page
          const pendingLink = this.navLinks.getLink('vendorPendingLink');
          return this.router.parseUrl(pendingLink);
        }),
        catchError(() => {
          // If vendor record not found or API error, block access to portal
          const pendingLink = this.navLinks.getLink('vendorPendingLink');
          return of(this.router.parseUrl(pendingLink));
        })
      );
  }
}

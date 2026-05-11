import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthenticationService } from './authentication.service';
import { LoginComponent } from '../view/login/login.component';
import { NavigationLinksService } from '../../shared/service/navigation-links/navigation-links.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router, 
    private navigationLink: NavigationLinksService,
    private authService: AuthenticationService
  ) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {

    // -------- TOKEN BYPASS CHECK --------

    if (this.authService.isAuthenticated()) {
      return true;
    } else {
      if (state.url) {
        sessionStorage.setItem('postLoginRedirect', state.url);
        localStorage.setItem('postLoginRedirect', state.url);
        if (state.url.includes('/expensesApproval/')) {
          sessionStorage.setItem('pendingApprovalRedirect', state.url);
          localStorage.setItem('pendingApprovalRedirect', state.url);
        }
      }
      const loginLink = this.navigationLink.getLink('signinLink');
      if (state.url) {
        return this.router.parseUrl(`${loginLink}?redirect=${encodeURIComponent(state.url)}`);
      }
      return this.router.parseUrl(loginLink);
      
    }
  }
}

import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthenticationService } from '../shared-component/service/auth-service/authentication.service';
import { NavigationLinksService } from '../shared-component/service/navigation-links/navigation-links.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private router: Router,
    private navigationLink: NavigationLinksService,
    private authService: AuthenticationService
  ) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    // First check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      const loginLink = this.navigationLink.getLink('signinLink');
      this.router.navigate([loginLink]);
      return false;
    }

    // Check required roles from route data
    const requiredRoles: string[] = next.data['roles'] || [];

    if (requiredRoles.length === 0) {
      // No specific roles required, allow access
      return true;
    }

    // Get user role from session/local storage
    const userRole = this.getUserRole();

    // Check if user has one of the required roles
    const hasRequiredRole = requiredRoles.includes(userRole);

    if (hasRequiredRole) {
      return true;
    } else {
      // User doesn't have required role, redirect to unauthorized page or home
      console.warn(`Access denied. User role '${userRole}' not in required roles: ${requiredRoles.join(', ')}`);
      this.router.navigate([this.navigationLink.getLink('home')]);
      return false;
    }
  }

  private getUserRole(): string {
    // Try multiple storage locations and keys for role
    const roleKeys = ['role', 'userRole', 'Role', 'ROLE'];
    for (const key of roleKeys) {
      const role = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (role) {
        return role;
      }
    }

    // Try to get from userRegData JSON object
    try {
      const userRegData = sessionStorage.getItem('userRegData') || localStorage.getItem('userRegData');
      if (userRegData) {
        const userData = JSON.parse(userRegData);
        if (userData.role) {
          return userData.role;
        }
      }
    } catch (e) {
      console.debug('Could not parse userRegData for role');
    }

    return 'ROLE_USER'; // Default to user role if not found
  }
}

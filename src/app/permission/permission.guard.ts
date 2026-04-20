import { ActivatedRouteSnapshot, CanActivate, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { PermissionService } from './permission.service';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'   
})


export class PermissionGuard implements CanActivate {

   constructor(private permService: PermissionService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const requiredAppCodes: string[] = route.data['appCode']; // can be string or array

    const codes = Array.isArray(requiredAppCodes) ? requiredAppCodes : [requiredAppCodes];

    const hasAccess = codes.some(code => this.permService.hasPermission(code));

    if (hasAccess) {
      return true;
    }

    this.router.navigate(['/unauthorized']);
    return false;
  }

};

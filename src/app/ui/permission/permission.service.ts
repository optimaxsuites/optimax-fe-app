import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {

 private user: any;

  constructor(private router: Router) {
    // this.user = JSON.parse(sessionStorage.getItem('userApplicationRole') || '{}');
  }

  private get activePermissions() {
    const user = JSON.parse(sessionStorage.getItem('userApplicationRole') || '{}');
    if (!user?.appRole?.appRolePermissionList) return [];
    return user.appRole.appRolePermissionList.filter(
      (p: any) => p.canView || p.canCreate || p.canDelete || p.canUpdate
    );
  }

  hasPermission(appCode: string): boolean {
    console.log(appCode)
    console.log(this.activePermissions.some((p: any) => p.appRegister.appCode === appCode))
    console.log(this.activePermissions)
    return this.activePermissions.some((p: any) => p.appRegister.appCode === appCode);
  }

  hasOnlyPermission(appCode: string): boolean {
    const perms = this.activePermissions;
    return perms.length === 1 && perms[0].appRegister.appCode === appCode;
  }

  isSuperUser(): boolean {
  const roles = sessionStorage.getItem("role");
  return roles?.includes("ROLE_ADMIN") ?? false;
  } 
}

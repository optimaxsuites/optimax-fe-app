import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

declare const window: Window & { __TAURI_INTERNALS__?: unknown };

@Injectable({ providedIn: 'root' })
export class WorkspaceGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const isTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;
    if (isTauri && !localStorage.getItem('workspaceId')) {
      this.router.navigate(['/workspace-setup']);
      return false;
    }
    return true;
  }
}

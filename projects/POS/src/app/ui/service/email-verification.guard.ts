// email-verification.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';

@Injectable({
  providedIn: 'root'
})
export class EmailVerificationGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const user = this.authService.getCurrentUser();
    
    if (user && !user.verified) {
      // Redirect to verification required page
      this.router.navigate(['/verify-required']);
      return false;
    }
    
    return true;
  }
}
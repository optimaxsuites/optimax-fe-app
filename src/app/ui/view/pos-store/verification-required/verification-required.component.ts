// verification-required.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../../service/auth.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-verification-required',
  templateUrl: './verification-required.component.html',
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class VerificationRequiredComponent implements OnInit, OnDestroy {
  isLoading = false;
  message = '';
  error = '';
  username = '';
  email = '';
  resendCooldown = 0;
  isSignupSuccess = false;
  private cooldownInterval: any;
  private storeUuid: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get store UUID from route
    this.storeUuid = this.route.snapshot.paramMap.get('uuid') || '';

    // Check for signup success query parameter
    this.route.queryParams.subscribe(params => {
      this.isSignupSuccess = params['signupSuccess'] === 'true';
      if (this.isSignupSuccess) {
        this.message = 'Signup Successful! 🎉 Please check your email to verify your account.';
      }
    });

    // Get user data from localStorage
    const userData = this.authService.getPendingVerification();
    if (userData) {
      this.username = userData.username;
      this.email = userData.email;
    } else {
      // Try to get from current user if they're logged in but not verified
      const currentUser = this.authService.getCurrentUser();
      if (currentUser && !currentUser.verified) {
        this.username = currentUser.username;
        this.email = currentUser.email;
      } else {
        // No user data found, redirect to home
        this.redirectToHome();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
  }

  resendVerification(): void {
    if (!this.username) {
      this.error = 'Unable to find user information. Please try signing up again.';
      return;
    }

    if (this.resendCooldown > 0) {
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.message = '';

    this.authService.resendVerificationEmail(this.username).subscribe({
      next: () => {
        this.isLoading = false;
        this.message = 'Verification email sent successfully! Please check your inbox and spam folder.';
        this.startResendCooldown();
      },
      error: (error) => {
        this.isLoading = false;
        
        if (error.includes('Email service is temporarily unavailable')) {
          this.error = 'Email service is currently unavailable. Your account was created, but we cannot send verification emails right now. Please try again later.';
        } else {
          this.error = error || 'Failed to send verification email. Please try again.';
        }
      }
    });
  }

  checkVerification(): void {
    if (!this.username) {
      this.error = 'Unable to find user information. Please try signing up again.';
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.message = '';

    this.authService.checkVerificationStatus(this.username).subscribe({
      next: (status) => {
        this.isLoading = false;
        
        if (status.verified) {
          this.message = 'Email verified successfully! Redirecting to login...';
          
          // Clear pending verification data
          this.authService.clearPendingVerification();
          
          // Redirect to login after a short delay
          setTimeout(() => {
            this.redirectToLogin();
          }, 2000);
        } else {
          this.error = 'Your email has not been verified yet. Please check your email and click the verification link.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.error = error || 'Failed to check verification status. Please try again.';
      }
    });
  }

  goToLogin(): void {
    this.authService.clearPendingVerification();
    this.redirectToLogin();
  }

  private redirectToLogin(): void {
    if (this.storeUuid) {
      this.router.navigate(['/optimerce', this.storeUuid]);
    } else {
      this.router.navigate(['/']);
    }
  }

  private redirectToHome(): void {
    if (this.storeUuid) {
      this.router.navigate(['/optimerce', this.storeUuid]);
    } else {
      this.router.navigate(['/']);
    }
  }

  private startResendCooldown(): void {
    this.resendCooldown = 60; // 60 seconds cooldown
    
    this.cooldownInterval = setInterval(() => {
      this.resendCooldown--;
      
      if (this.resendCooldown <= 0) {
        clearInterval(this.cooldownInterval);
      }
    }, 1000);
  }
}
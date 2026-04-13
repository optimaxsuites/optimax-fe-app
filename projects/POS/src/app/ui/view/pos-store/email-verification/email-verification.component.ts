import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../service/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-email-verification',
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        
        <!-- Loading State -->
        <div *ngIf="isLoading" class="text-center">
          <div class="mb-6">
            <i class="fa-solid fa-spinner fa-spin text-6xl text-customGreen"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-3">Verifying Your Email</h2>
          <p class="text-gray-600">Please wait while we verify your email address...</p>
          <div class="mt-4">
            <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div class="bg-customGreen h-full rounded-full animate-pulse" style="width: 70%"></div>
            </div>
          </div>
        </div>

        <!-- Success State -->
        <div *ngIf="isVerified && !isLoading" class="text-center">
          <div class="mb-6">
            <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <i class="fa-solid fa-circle-check text-4xl text-green-500"></i>
            </div>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-3">Email Verified Successfully!</h2>
          <p class="text-gray-600 mb-6">
            Your email has been verified. You can now sign in to your account and access all features.
          </p>
          
          <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div class="flex items-start">
              <i class="fa-solid fa-check text-green-500 mt-1 mr-3"></i>
              <div class="text-left">
                <p class="text-sm text-green-800 font-medium">Account activated</p>
                <p class="text-xs text-green-700 mt-1">You will be redirected to the login page in {{ redirectCountdown }} seconds...</p>
              </div>
            </div>
          </div>

          <button
            (click)="goToLogin()"
            class="w-full bg-customGreen hover:bg-customBlue text-white py-3 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-customGreen focus:ring-offset-2"
          >
            Continue to Sign In
          </button>
        </div>

        <!-- Error State -->
        <div *ngIf="error && !isLoading" class="text-center">
          <div class="mb-6">
            <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <i class="fa-solid fa-circle-xmark text-4xl text-red-500"></i>
            </div>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-3">Verification Failed</h2>
          <p class="text-gray-600 mb-6">{{ error }}</p>

          <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div class="flex items-start">
              <i class="fa-solid fa-circle-exclamation text-red-500 mt-1 mr-3"></i>
              <div class="text-left text-sm text-red-800">
                <p class="font-medium mb-2">Common issues:</p>
                <ul class="list-disc list-inside space-y-1 text-xs">
                  <li>The verification link may have expired</li>
                  <li>The link may have already been used</li>
                  <li>The link may be invalid or corrupted</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <button
              (click)="goToVerificationRequired()"
              class="w-full bg-customGreen hover:bg-customBlue text-white py-3 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-customGreen focus:ring-offset-2"
            >
              Request New Verification Link
            </button>
            
            <button
              (click)="goToHome()"
              class="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>

        <!-- No Token State -->
        <div *ngIf="!token && !isLoading" class="text-center">
          <div class="mb-6">
            <div class="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <i class="fa-solid fa-triangle-exclamation text-4xl text-yellow-500"></i>
            </div>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-3">Invalid Verification Link</h2>
          <p class="text-gray-600 mb-6">
            The verification link appears to be invalid or incomplete. Please check your email for the correct link.
          </p>
          
          <button
            (click)="goToHome()"
            class="w-full bg-customGreen hover:bg-customBlue text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            Back to Home
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
    
    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
  `]
})
export class EmailVerificationComponent implements OnInit, OnDestroy {
  isVerified = false;
  error = '';
  isLoading = true;
  token: string | null = null;
  storeUuid: string = '';
  redirectCountdown = 5;
  private redirectInterval: any;
  private querySubscription?: Subscription;
  private paramSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get store UUID from parent route
    this.paramSubscription = this.route.parent?.paramMap.subscribe(params => {
      this.storeUuid = params.get('uuid') || '';
    });
    this.verifyEmail();
  }

  ngOnDestroy(): void {
    if (this.redirectInterval) {
      clearInterval(this.redirectInterval);
    }
    if (this.querySubscription) {
      this.querySubscription.unsubscribe();
    }
    if (this.paramSubscription) {
      this.paramSubscription.unsubscribe();
    }
  }

  verifyEmail(): void {
    this.querySubscription = this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      
      if (!this.token) {
        this.isLoading = false;
        this.error = 'No verification token provided. Please check your email for the correct verification link.';
        return;
      }

      // Call the verification API
      this.authService.verifyEmail(this.token).subscribe({
        next: (response) => {
          console.log('Verification successful:', response);
          this.isLoading = false;
          this.isVerified = true;
          
          // Clear any pending verification data
          this.authService.clearPendingVerification();
          
          // Start countdown for automatic redirect
          this.startRedirectCountdown();
        },
        error: (error) => {
          console.error('Verification failed:', error);
          this.isLoading = false;
          this.error = this.parseErrorMessage(error);
        }
      });
    });
  }

  private parseErrorMessage(error: any): string {
    if (typeof error === 'string') {
      // Check for specific error patterns
      if (error.toLowerCase().includes('expired')) {
        return 'This verification link has expired. Please request a new verification email.';
      }
      if (error.toLowerCase().includes('already verified')) {
        return 'This account has already been verified. You can sign in now.';
      }
      if (error.toLowerCase().includes('invalid')) {
        return 'This verification link is invalid. Please request a new verification email.';
      }
      return error;
    }
    return 'Unable to verify your email. Please try again or request a new verification link.';
  }

  private startRedirectCountdown(): void {
    this.redirectInterval = setInterval(() => {
      this.redirectCountdown--;
      
      if (this.redirectCountdown <= 0) {
        clearInterval(this.redirectInterval);
        this.goToLogin();
      }
    }, 1000);
  }

  goToLogin(): void {
    if (this.redirectInterval) {
      clearInterval(this.redirectInterval);
    }
    const uuid = this.storeUuid;
    if (uuid) {
      this.router.navigate(['/optimerce', uuid], { queryParams: { verified: 'true' } });
    } else {
      this.router.navigate(['/'], { queryParams: { verified: 'true' } });
    }
  }

  goToVerificationRequired(): void {
    if (this.redirectInterval) {
      clearInterval(this.redirectInterval);
    }
    const uuid = this.storeUuid;
    if (uuid) {
      this.router.navigate(['/optimerce', uuid, 'verify-required']);
    } else {
      this.router.navigate(['/verify-required']);
    }
  }

  goToHome(): void {
    if (this.redirectInterval) {
      clearInterval(this.redirectInterval);
    }
    const uuid = this.storeUuid;
    if (uuid) {
      this.router.navigate(['/optimerce', uuid]);
    } else {
      this.router.navigate(['/']);
    }
  }
}
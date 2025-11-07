// auth-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, SignupData, LoginData } from '../../../service/auth.service';

@Component({
  selector: 'app-auth-modal',
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss']
})
export class AuthModalComponent implements OnInit, OnDestroy {
  @Input() initialMode: 'login' | 'signup' = 'login';
  @Input() storeUuid: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() login = new EventEmitter<{username: string, password: string}>();
  @Output() signup = new EventEmitter<{name: string, username: string, email: string, phone: string, password: string}>();
  @Output() guest = new EventEmitter<void>();
  
  // NEW: Add toast notification output
  @Output() showToast = new EventEmitter<{title: string, message: string, type: 'success' | 'error' | 'warning' | 'info'}>();

  mode: 'login' | 'signup';
  loginForm: FormGroup;
  signupForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.mode = this.initialMode;
    
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.signupForm = this.fb.group({
      fullname: ['', [Validators.required, Validators.maxLength(100)]],
      username: ['', [
        Validators.required, 
        Validators.minLength(3), 
        Validators.maxLength(20), 
        Validators.pattern(/^[a-zA-Z0-9_]+$/)
      ]],
      email: ['', [Validators.required, Validators.email]],
      phonenumber: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]{10,15}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });

    this.signupForm.setValidators(this.passwordMatchValidator.bind(this));
  }

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    if (!this.storeUuid) {
      this.storeUuid = this.getCurrentStoreUuid();
    }
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  private getCurrentStoreUuid(): string {
    const uuid = this.route.snapshot.paramMap.get('uuid') || 
                 this.route.parent?.snapshot.paramMap.get('uuid') ||
                 this.route.firstChild?.snapshot.paramMap.get('uuid') ||
                 '';
    return uuid;
  }

  private getTimeBasedGreeting(): string {
    const hour = new Date().getHours();
    const emojis = ['🌅', '☀️', '🌙'];
    
    if (hour < 12) {
      return `Good Morning ${emojis[0]}`;
    } else if (hour < 17) {
      return `Good Afternoon ${emojis[1]}`;
    } else {
      return `Good Evening ${emojis[2]}`;
    }
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (!password || !confirmPassword) {
      return null;
    }

    if (confirmPassword.value === '') {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      const errors = confirmPassword.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        confirmPassword.setErrors(Object.keys(errors).length === 0 ? null : errors);
      }
    }
    
    return null;
  }

  switchMode(mode: 'login' | 'signup'): void {
    this.mode = mode;
    this.errorMessage = '';
    this.successMessage = '';
    this.loginForm.reset();
    this.signupForm.reset();
  }

  onLogin(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const loginData: LoginData = {
        username: this.loginForm.value.username,
        password: this.loginForm.value.password
      };

      this.authService.login(loginData).subscribe({
        next: (response) => {
          this.isLoading = false;
          
          if (!response) {
            this.errorMessage = 'Invalid response from server. Please try again.';
            this.showToast.emit({
              title: 'Login Failed',
              message: 'Invalid response from server. Please try again.',
              type: 'error'
            });
            return;
          }
          
          if (response.verified === false) {
            this.errorMessage = 'Please verify your email before logging in. Check your inbox for the verification link.';
            
            this.showToast.emit({
              title: 'Verification Required',
              message: 'Please verify your email before logging in.',
              type: 'warning'
            });
            
            this.authService.storePendingVerification({
              username: loginData.username,
              email: response.email
            });
            
            setTimeout(() => {
              this.closeModal();
              const uuid = this.storeUuid || this.getCurrentStoreUuid();
              this.router.navigate(['/store', uuid, 'verify-required']);
            }, 2000);
            return;
          }
          
          // Emit login event FIRST
          this.login.emit(loginData);
          
          // Then show toast AFTER a small delay to ensure parent component has processed the login
          setTimeout(() => {
            const greeting = this.getTimeBasedGreeting();
            this.showToast.emit({
              title: `Welcome Back! 🎉`,
              message: `${greeting}, ${loginData.username}! Great to see you again.`,
              type: 'success'
            });
          }, 100);
          
          this.closeModal();
          
          setTimeout(() => {
            const uuid = this.storeUuid || this.getCurrentStoreUuid();
            this.router.navigate(['/store', uuid, 'dashboard']);
          }, 500);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error || 'Login failed. Please check your credentials and try again.';
          
          this.showToast.emit({
            title: 'Login Failed',
            message: error || 'Please check your credentials and try again.',
            type: 'error'
          });
        }
      });
    }
  }

  onSignup(): void {
    if (this.signupForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const signupData: SignupData = {
        fullname: this.signupForm.value.fullname,
        username: this.signupForm.value.username,
        email: this.signupForm.value.email,
        password: this.signupForm.value.password,
        phonenumber: this.signupForm.value.phonenumber
      };

      this.authService.signup(signupData).subscribe({
        next: (response) => {
          this.isLoading = false;
          
          if (response.success) {
            this.successMessage = response.message;
            
            // NEW: Show success toast for signup
            const greeting = this.getTimeBasedGreeting();
            this.showToast.emit({
              title: 'Account Created Successfully! 🎉',
              message: `${greeting}, ${signupData.username}! Welcome to our store. Please check your email to verify your account.`,
              type: 'success'
            });
            
            this.authService.storePendingVerification({
              username: signupData.username,
              email: signupData.email
            });
            
            setTimeout(() => {
              this.closeModal();
              const uuid = this.storeUuid || this.getCurrentStoreUuid();
              this.router.navigate(['/store', uuid, 'verify-required']);
            }, 2000);
          } else {
            this.errorMessage = response.message || 'Signup failed. Please try again.';
            
            // NEW: Show error toast
            this.showToast.emit({
              title: 'Signup Failed',
              message: response.message || 'Please try again.',
              type: 'error'
            });
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error || 'An error occurred during signup. Please try again.';
          
          // NEW: Show error toast
          this.showToast.emit({
            title: 'Signup Failed',
            message: error || 'An error occurred. Please try again.',
            type: 'error'
          });
        }
      });
    } else {
      Object.keys(this.signupForm.controls).forEach(key => {
        const control = this.signupForm.get(key);
        control?.markAsTouched();
      });
    }
  }

  onGuest(): void {
    // NEW: Show info toast for guest
    this.showToast.emit({
      title: 'Continuing as Guest',
      message: 'You can create an account anytime to save your preferences and track orders.',
      type: 'info'
    });
    
    this.guest.emit();
    this.closeModal();
  }

  closeModal(): void {
    this.close.emit();
  }
}
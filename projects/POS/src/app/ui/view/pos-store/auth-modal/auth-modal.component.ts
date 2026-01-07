import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, SignupData, LoginData } from '../../../service/auth.service';
import { AuthStateService } from '../../../service/auth-state.service';

@Component({
  selector: 'app-auth-modal',
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss']
})
export class AuthModalComponent implements OnInit, OnDestroy {
  @Input() initialMode: 'login' | 'signup' = 'login';
  @Input() storeUuid: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() login = new EventEmitter<{username: string, password: string, rememberMe: boolean}>();
  @Output() signup = new EventEmitter<{name: string, username: string, email: string, phone: string, password: string, rememberMe: boolean}>();
  @Output() guest = new EventEmitter<void>();
  
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
    private route: ActivatedRoute,
    private authStateService: AuthStateService
  ) {
    this.mode = this.initialMode;
    
    // Check for remembered user
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    
    this.loginForm = this.fb.group({
      username: [rememberedUsername || '', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [rememberMe || false]
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
      confirmPassword: ['', [Validators.required]],
      rememberMe: [false]
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

  // Helper method for template
  hasRememberedUsername(): boolean {
    return !!localStorage.getItem('rememberedUsername');
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
    
    if (mode === 'login') {
      this.loginForm.reset();
      const rememberedUsername = localStorage.getItem('rememberedUsername');
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      
      if (rememberedUsername) {
        this.loginForm.patchValue({
          username: rememberedUsername,
          rememberMe: rememberMe
        });
      }
    } else {
      this.signupForm.reset();
    }
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
      
      const rememberMe = this.loginForm.value.rememberMe;

      this.authService.login(loginData).subscribe({
        next: (response) => {
          this.isLoading = false;
          
          console.log('Login response:', response);
          
          // Get user data from localStorage (stored by AuthService)
          const storedUserData = this.authService.getCurrentUser();
          
          // Check if user needs verification (from stored data or response)
          if (storedUserData?.verified === false || response.verified === false) {
            this.errorMessage = 'Please verify your email before logging in. Check your inbox for the verification link.';
            
            this.showToast.emit({
              title: 'Verification Required',
              message: 'Please verify your email before logging in.',
              type: 'warning'
            });
            
            this.authService.storePendingVerification({
              username: loginData.username,
              email: response.email || storedUserData?.email || ''
            });
            
            setTimeout(() => {
              this.closeModal();
              const uuid = this.storeUuid || this.getCurrentStoreUuid();
              this.router.navigate(['optimerce', uuid, 'verify-required']);
            }, 2000);
            return;
          }
          
          // Update auth state using data from localStorage
          const userData = {
            name: storedUserData?.username || loginData.username,
            isGuest: false,
            username: loginData.username,
            email: storedUserData?.email || response.email
          };
          
          this.authStateService.setUser(userData);
          
          // Emit login event with rememberMe
          this.login.emit({
            username: loginData.username,
            password: loginData.password,
            rememberMe: rememberMe
          });
          
          // Store rememberMe preference
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('rememberedUsername', loginData.username);
          } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('rememberedUsername');
          }
          
          // Show success toast
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
            this.router.navigate(['/optimerce', uuid]);
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

      const formValue = this.signupForm.value;
      const rememberMe = formValue.rememberMe;

      // Prepare signup data according to AuthService SignupData interface
      const signupData: SignupData = {
        fullname: formValue.fullname,
        username: formValue.username,
        email: formValue.email,
        password: formValue.password,
        phonenumber: formValue.phonenumber
      };

      this.authService.signup(signupData).subscribe({
        next: (response) => {
          this.isLoading = false;
          
          if (response.success) {
            this.successMessage = response.message || 'Account created successfully!';
            
            // Update auth state immediately (user will need to verify)
            const userData = {
              name: formValue.fullname,
              isGuest: false,
              username: formValue.username,
              email: formValue.email,
              requiresVerification: true
            };
            
            this.authStateService.setUser(userData);
            
            // Store rememberMe preference
            if (rememberMe) {
              localStorage.setItem('rememberMe', 'true');
              localStorage.setItem('rememberedUsername', formValue.username);
              localStorage.setItem('rememberedEmail', formValue.email);
            }
            
            // Store pending verification
            this.authService.storePendingVerification({
              username: formValue.username,
              email: formValue.email
            });
            
            // Show success toast
            const greeting = this.getTimeBasedGreeting();
            this.showToast.emit({
              title: 'Account Created Successfully! 🎉',
              message: `${greeting}, ${formValue.username}! Welcome to our store. Please check your email to verify your account.`,
              type: 'success'
            });
            
            // Emit signup event with rememberMe
            this.signup.emit({
              name: formValue.fullname,
              username: formValue.username,
              email: formValue.email,
              phone: formValue.phonenumber,
              password: formValue.password,
              rememberMe: rememberMe
            });
            
            // Redirect to verification page
            setTimeout(() => {
              this.closeModal();
              const uuid = this.storeUuid || this.getCurrentStoreUuid();
              this.router.navigate(['/store', uuid, 'verify-required']);
            }, 2000);
          } else {
            this.errorMessage = response.message || 'Signup failed. Please try again.';
            
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
          
          this.showToast.emit({
            title: 'Signup Failed',
            message: error || 'An error occurred. Please try again.',
            type: 'error'
          });
        }
      });
    } else {
      // Mark all required fields as touched to show validation errors
      Object.keys(this.signupForm.controls).forEach(key => {
        const control = this.signupForm.get(key);
        if (control && key !== 'rememberMe') {
          control.markAsTouched();
        }
      });
    }
  }

  onGuest(): void {
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
  
  // Clear remembered credentials
  clearRememberedCredentials(): void {
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('rememberedUsername');
    localStorage.removeItem('rememberedEmail');
    
    this.loginForm.patchValue({
      username: '',
      rememberMe: false
    });
    
    this.showToast.emit({
      title: 'Credentials Cleared',
      message: 'Remembered login information has been cleared.',
      type: 'info'
    });
  }
}
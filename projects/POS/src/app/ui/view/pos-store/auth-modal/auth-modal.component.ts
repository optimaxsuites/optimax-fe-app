import { Component, EventEmitter, Output, Input } from '@angular/core';

@Component({
  selector: 'app-auth-modal',
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss']
})
export class AuthModalComponent {
    @Input() initialMode: 'login' | 'signup' = 'login'; 
  @Output() close = new EventEmitter<void>();
  @Output() login = new EventEmitter<{email: string, password: string}>();
  @Output() signup = new EventEmitter<{name: string, email: string, phone: string, password: string}>();
  @Output() guest = new EventEmitter<void>();

  isLoginMode = true;
  showPassword = false;

  closeModal(): void {
    this.close.emit();
  }
  ngOnChanges(): void {
    this.isLoginMode = this.initialMode === 'login';
  }
  toggleMode(isLogin: boolean): void {
    this.isLoginMode = isLogin;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onLogin(): void {
    //  you would get these values from the form
    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;
    
    this.login.emit({ email, password });
  }

  onSignup(): void {
    //  you would get these values from the form
    const name = (document.getElementById('fullName') as HTMLInputElement).value;
    const email = (document.getElementById('signupEmail') as HTMLInputElement).value;
    const phone = (document.getElementById('phone') as HTMLInputElement).value;
    const password = (document.getElementById('signupPassword') as HTMLInputElement).value;
    
    this.signup.emit({ name, email, phone, password });
  }

  continueAsGuest(): void {
    this.guest.emit();
  }
}
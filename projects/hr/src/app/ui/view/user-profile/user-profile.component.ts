import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '../../shared-component/service/auth-service/authentication.service';
import { MessageService } from 'primeng/api';

interface LoginActivity {
  timestamp: string;
  device: string;
  browser: string;
  status: 'success' | 'current';
}

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss',
  providers: [MessageService],
})
export class UserProfileComponent implements OnInit {
  activeTab: 'profile' | 'security' | 'account' | 'activity' = 'profile';

  userData: any = {};
  avatarUrl: string = '';
  avatarInitials = '';
  uploadingAvatar = false;

  profileForm: FormGroup;
  passwordForm: FormGroup;
  savingProfile = false;
  savingPassword = false;
  showCurrentPw = false;
  showNewPw = false;
  showConfirmPw = false;

  loginActivities: LoginActivity[] = [];

  private readonly AVATAR_KEY = 'userProfileAvatar';
  private readonly ACTIVITY_KEY = 'userLoginActivity';

  constructor(
    private fb: FormBuilder,
    private authService: AuthenticationService,
    private messageService: MessageService,
  ) {
    this.profileForm = this.fb.group({
      fullName: [''],
      email: ['', [Validators.email]],
      phone: [''],
      username: [{ value: '', disabled: true }],
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.loadUserData();
    this.loadAvatar();
    this.loadOrCreateLoginActivity();
  }

  private loadUserData(): void {
    const raw = sessionStorage.getItem('userRegData') || localStorage.getItem('userRegData');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.userData = Array.isArray(parsed) ? (parsed[0] ?? {}) : parsed;
      } catch { this.userData = {}; }
    }

    const fullName = this.userData.fullName || this.userData.fullname
      || sessionStorage.getItem('fullname') || localStorage.getItem('fullname') || '';
    const email = this.userData.email || sessionStorage.getItem('email') || localStorage.getItem('email') || '';
    const username = this.userData.username || sessionStorage.getItem('username') || localStorage.getItem('username') || '';
    const phone = this.userData.phone || this.userData.phoneNumber || '';

    this.profileForm.patchValue({ fullName, email, phone, username });

    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    this.avatarInitials = parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (parts[0]?.[0] ?? username[0] ?? '?').toUpperCase();
  }

  private loadAvatar(): void {
    const saved = localStorage.getItem(this.AVATAR_KEY);
    if (saved) this.avatarUrl = saved;
  }

  private loadOrCreateLoginActivity(): void {
    const stored = localStorage.getItem(this.ACTIVITY_KEY);
    let history: LoginActivity[] = stored ? JSON.parse(stored) : [];

    const now = new Date().toISOString();
    const browser = this.detectBrowser();
    const device = this.detectDevice();
    const current: LoginActivity = { timestamp: now, device, browser, status: 'current' };

    // Mark previous entries as success
    history = history.map(h => ({ ...h, status: 'success' as const }));
    history.unshift(current);
    if (history.length > 10) history = history.slice(0, 10);

    localStorage.setItem(this.ACTIVITY_KEY, JSON.stringify(history));
    this.loginActivities = history;
  }

  private detectBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Edg')) return 'Microsoft Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return 'Unknown Browser';
  }

  private detectDevice(): string {
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) return 'Mobile';
    if (/Tablet|iPad/i.test(ua)) return 'Tablet';
    return 'Desktop';
  }

  onAvatarFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please select a valid image file.', key: 'up', life: 3000 });
      return;
    }
    this.uploadingAvatar = true;
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarUrl = reader.result as string;
      localStorage.setItem(this.AVATAR_KEY, this.avatarUrl);
      this.uploadingAvatar = false;
      this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Profile picture updated.', key: 'up', life: 3000 });
    };
    reader.readAsDataURL(file);
  }

  removeAvatar(): void {
    this.avatarUrl = '';
    localStorage.removeItem(this.AVATAR_KEY);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.savingProfile = true;
    const { fullName, email, phone } = this.profileForm.value;

    // Persist to storage (backend user update call can go here when endpoint available)
    const updated = { ...this.userData, fullName, email, phone };
    const raw = JSON.stringify(Array.isArray(JSON.parse(sessionStorage.getItem('userRegData') || '[]')) ? [updated] : updated);
    sessionStorage.setItem('userRegData', raw);
    localStorage.setItem('userRegData', raw);
    if (fullName) { sessionStorage.setItem('fullname', fullName); localStorage.setItem('fullname', fullName); }
    if (email) { sessionStorage.setItem('email', email); localStorage.setItem('email', email); }

    this.savingProfile = false;
    this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Profile details updated successfully.', key: 'up', life: 3000 });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      this.messageService.add({ severity: 'error', summary: 'Mismatch', detail: 'New passwords do not match.', key: 'up', life: 3000 });
      return;
    }

    const username = this.userData.username || sessionStorage.getItem('username') || localStorage.getItem('username') || '';
    if (!username) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not determine account username. Please log out and back in.', key: 'up', life: 4000 });
      return;
    }

    this.savingPassword = true;
    this.authService.changePassword(username, currentPassword, newPassword).subscribe({
      next: (res: any) => {
        this.savingPassword = false;
        if (res?.code === '1000') {
          this.passwordForm.reset();
          this.messageService.add({ severity: 'success', summary: 'Done', detail: 'Password updated successfully.', key: 'up', life: 3000 });
        } else {
          this.messageService.add({ severity: 'error', summary: 'Failed', detail: res?.message || 'Could not change password.', key: 'up', life: 4000 });
        }
      },
      error: () => {
        this.savingPassword = false;
        this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Incorrect current password or server error.', key: 'up', life: 4000 });
      },
    });
  }

  private passwordMatchValidator(group: FormGroup) {
    const nw = group.get('newPassword')?.value;
    const cf = group.get('confirmPassword')?.value;
    return nw && cf && nw !== cf ? { mismatch: true } : null;
  }

  get role(): string {
    return this.userData.roles?.[0]?.roleName
      || this.userData.role
      || sessionStorage.getItem('role')
      || localStorage.getItem('role')
      || '—';
  }

  get accountId(): string {
    return this.userData.accountId || this.userData.id || sessionStorage.getItem('userid') || '—';
  }

  get username(): string {
    return this.userData.username || sessionStorage.getItem('username') || '—';
  }

  get memberSince(): string {
    const d = this.userData.createdAt || this.userData.joinedAt || this.userData.dateCreated;
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  formatActivity(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  pwHasUpper(pw: string): boolean { return /[A-Z]/.test(pw); }
  pwHasNumber(pw: string): boolean { return /[0-9]/.test(pw); }
  pwHasSpecial(pw: string): boolean { return /[^A-Za-z0-9]/.test(pw); }

  get passwordStrength(): { label: string; pct: number; color: string } {
    const pw: string = this.passwordForm.get('newPassword')?.value || '';
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: 'Weak', pct: 20, color: '#ef4444' };
    if (score <= 2) return { label: 'Fair', pct: 45, color: '#f97316' };
    if (score <= 3) return { label: 'Good', pct: 70, color: '#eab308' };
    return { label: 'Strong', pct: 100, color: '#22c55e' };
  }
}

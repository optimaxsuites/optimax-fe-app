import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CollaborationService } from '../ui/services/collaboration.service';
import { AuthenticationService } from 'src/app/ui/auth/service/authentication.service';
import { UserInfoService } from 'src/app/ui/auth/service/user-info.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
  providers: [MessageService],
})
export class DashUserProfileComponent implements OnInit {
  activeTab: 'profile' | 'security' = 'profile';

  userData: any = {};
  primaryInfo: any = {};
  avatarUrl = '';
  initials = 'U';
  uploadingAvatar = false;
  loadingProfile = true;
  savingProfile = false;
  savingPassword = false;
  showCurrentPw = false;
  showNewPw = false;
  showConfirmPw = false;
  postCount: number | null = null;
  loadingPosts = true;

  profileForm: FormGroup;
  passwordForm: FormGroup;

  private readonly AVATAR_KEY = 'userProfileAvatar';

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private collabService: CollaborationService,
    private authService: AuthenticationService,
    private userInfoService: UserInfoService,
  ) {
    this.profileForm = this.fb.group({
      nickname: [''],
      phone: [''],
      bio: [''],
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadFromSession();
    this.loadFromApi();
    this.loadPostCount();
  }

  private loadFromSession(): void {
    try {
      const raw = sessionStorage.getItem('userRegData');
      if (raw) this.userData = JSON.parse(raw);
      const primary = sessionStorage.getItem('userPrimaryInfoRegData');
      if (primary) this.primaryInfo = JSON.parse(primary);
    } catch {}
    this.avatarUrl = this.primaryInfo?.profileImage || localStorage.getItem(this.AVATAR_KEY) || '';
    this.rebuildInitials();
    this.patchForm();
  }

  private loadFromApi(): void {
    const userId = sessionStorage.getItem('userid');
    if (!userId) { this.loadingProfile = false; return; }

    this.authService.getUserPrimaryInfoById(userId).subscribe({
      next: (data) => {
        if (data) {
          this.primaryInfo = data;
          sessionStorage.setItem('userPrimaryInfoRegData', JSON.stringify(data));
          if (data.profileImage) {
            this.avatarUrl = data.profileImage;
            localStorage.setItem(this.AVATAR_KEY, data.profileImage);
          }
          this.patchForm();
          this.rebuildInitials();
        }
        this.loadingProfile = false;
      },
      error: () => { this.loadingProfile = false; },
    });
  }

  private patchForm(): void {
    const nickname = this.primaryInfo?.nickname || this.userData?.nickname || '';
    const phone = this.primaryInfo?.phoneNumber || this.primaryInfo?.phone || this.userData?.phone || '';
    const bio = this.primaryInfo?.bio || '';
    this.profileForm.patchValue({ nickname, phone, bio });
  }

  private rebuildInitials(): void {
    const name = this.primaryInfo?.fullname ||
      this.userData?.fullname ||
      this.userData?.name ||
      this.userData?.username || '';
    this.initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p: string) => p[0]?.toUpperCase() || '')
      .join('') || 'U';
  }

  private loadPostCount(): void {
    const rawId = sessionStorage.getItem('userid') || sessionStorage.getItem('userId') || '0';
    const userId = String(rawId).trim();
    this.collabService.getFeedPosts('', undefined, 1, 200, false).subscribe({
      next: (result) => {
        if (result?.content) {
          this.postCount = result.content.filter((p) => {
            const authorId = String(p.authorUserId ?? p.author?.id ?? p.author?.userId ?? '').trim();
            return authorId && authorId === userId;
          }).length;
        } else {
          this.postCount = 0;
        }
        this.loadingPosts = false;
      },
      error: () => { this.postCount = 0; this.loadingPosts = false; },
    });
  }

  onAvatarFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingAvatar = true;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      localStorage.setItem(this.AVATAR_KEY, base64);
      this.avatarUrl = base64;
      window.dispatchEvent(new CustomEvent('optimax-avatar-updated', { detail: { avatarUrl: base64 } }));

      const payload = {
        fullname: this.primaryInfo?.fullname || this.userData?.fullname || '',
        email: this.primaryInfo?.email || this.userData?.email || '',
        username: this.userData?.username || '',
        profileImage: base64,
      };
      this.userInfoService.saveBasicInfo(payload).subscribe({
        next: (data) => {
          if (data) {
            this.primaryInfo = { ...this.primaryInfo, ...data };
            sessionStorage.setItem('userPrimaryInfoRegData', JSON.stringify(this.primaryInfo));
          }
          this.uploadingAvatar = false;
          this.messageService.add({ severity: 'success', summary: 'Photo updated', detail: 'Profile photo saved across all devices.' });
        },
        error: () => {
          this.uploadingAvatar = false;
          this.messageService.add({ severity: 'warn', summary: 'Saved locally', detail: 'Photo saved in this browser only. Backend sync failed.' });
        },
      });
    };
    reader.readAsDataURL(file);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.savingProfile = true;
    this.rebuildInitials();

    const payload = {
      fullname: this.primaryInfo?.fullname || this.userData?.fullname || '',
      nickname: this.profileForm.value.nickname,
      phoneNumber: this.profileForm.value.phone,
      bio: this.profileForm.value.bio,
      email: this.primaryInfo?.email || this.userData?.email || '',
      username: this.userData?.username || '',
    };

    this.userInfoService.saveBasicInfo(payload).subscribe({
      next: (data) => {
        if (data) {
          this.primaryInfo = { ...this.primaryInfo, ...data };
          sessionStorage.setItem('userPrimaryInfoRegData', JSON.stringify(this.primaryInfo));
        }
        this.savingProfile = false;
        this.messageService.add({ severity: 'success', summary: 'Profile saved', detail: 'Your profile has been updated.' });
      },
      error: () => {
        this.savingProfile = false;
        this.messageService.add({ severity: 'error', summary: 'Save failed', detail: 'Could not update profile. Please try again.' });
      },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) {
      this.messageService.add({ severity: 'error', summary: 'Mismatch', detail: 'New passwords do not match.' });
      return;
    }
    const username = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
    if (!username) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Unable to identify account. Please log out and back in.' });
      return;
    }
    this.savingPassword = true;
    this.authService.changePassword(username, currentPassword, newPassword).subscribe({
      next: (res: any) => {
        this.savingPassword = false;
        if (res?.code === '1000') {
          this.passwordForm.reset();
          this.messageService.add({ severity: 'success', summary: 'Password updated', detail: 'Your password has been changed. Please log in again.' });
          setTimeout(() => this.authService.logout(), 2000);
        } else {
          this.messageService.add({ severity: 'error', summary: 'Failed', detail: res?.message || 'Could not change password.' });
        }
      },
      error: () => {
        this.savingPassword = false;
        this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Incorrect current password or server error.' });
      },
    });
  }

  get displayName(): string {
    return this.profileForm.value?.fullname || this.primaryInfo?.fullname || this.userData?.fullname || this.userData?.username || '—';
  }
  get username(): string { return this.userData?.username || '—'; }
  get email(): string { return this.primaryInfo?.email || this.userData?.email || '—'; }
  get accountId(): string { return this.userData?.accountId || this.userData?.id || '—'; }
  get role(): string { return this.userData?.roles || this.userData?.role || '—'; }
}

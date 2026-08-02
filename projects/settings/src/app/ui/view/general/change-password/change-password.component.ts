import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { environment } from '../../../sharedComponents/service/environments/environment';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss'],
  providers: [MessageService],
})
export class ChangePasswordComponent {
  changePasswordForm: FormGroup;
  loading = false;

  menuItems = [
    { id: 1, name: 'Change Password', icon: 'pi pi-key' },
    { id: 2, name: 'Backup Data', icon: 'pi pi-cloud-upload' },
    { id: 3, name: 'Delete account', icon: 'pi pi-trash' },
  ];

  openItem: number = 1;
  backupInProgress = false;
  backupCompleted = false;
  backupUrl: string | null = null;
  showDeleteModal = false;
  deleteConfirmText = '';
  showDeleteStoreModal = false;
  deleteStoreConfirmText = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private messageService: MessageService
  ) {
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword, confirmPassword } = this.changePasswordForm.value;
    if (newPassword !== confirmPassword) {
      this.messageService.add({
        severity: 'error', summary: 'Mismatch',
        detail: 'New passwords do not match.', life: 3000,
      });
      return;
    }
    this.loading = true;
    const username = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
    const payload = JSON.stringify({ username, oldPassword: currentPassword, newPassword });
    this.http
      .post<any>(`${environment.apiBaseUrl}/x/api/v2/us/ur/changepassword`, payload, {
        headers: { 'Content-Type': 'application/json' },
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (res?.code === '1000') {
            this.messageService.add({
              severity: 'success', summary: 'Password updated',
              detail: 'Your password has been changed. Please log in again.', life: 3000,
            });
            this.changePasswordForm.reset();
            setTimeout(() => {
              sessionStorage.clear();
              localStorage.clear();
              this.router.navigate(['/']);
            }, 2500);
          } else {
            this.messageService.add({
              severity: 'error', summary: 'Failed',
              detail: res?.message || 'Could not change password.', life: 4000,
            });
          }
        },
        error: () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error', summary: 'Error',
            detail: 'Password change failed. Please try again.', life: 4000,
          });
        },
      });
  }

  startBackup(): void {
    this.backupInProgress = true;
    this.backupCompleted = false;
    setTimeout(() => {
      this.backupInProgress = false;
      this.backupCompleted = true;
      this.backupUrl = '#';
    }, 3000);
  }

  openDeleteModal(): void { this.showDeleteModal = true; this.deleteConfirmText = ''; }
  closeDeleteModal(): void { this.showDeleteModal = false; this.deleteConfirmText = ''; }
  deleteAccount(): void {
    if (this.deleteConfirmText === 'Delete my account') {
      console.log('Account deletion requested');
      this.closeDeleteModal();
    }
  }
  openDeleteStoreModal(): void { this.showDeleteStoreModal = true; this.deleteStoreConfirmText = ''; }
  closeDeleteStoreModal(): void { this.showDeleteStoreModal = false; this.deleteStoreConfirmText = ''; }
  deleteStore(): void {
    if (this.deleteStoreConfirmText === 'Delete my store') {
      console.log('Store deletion requested');
      this.closeDeleteStoreModal();
    }
  }
}

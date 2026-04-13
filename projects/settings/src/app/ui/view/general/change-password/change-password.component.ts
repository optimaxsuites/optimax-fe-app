import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent {
 changePasswordForm: FormGroup;
  menuItems = [
    {id: 1, name: 'Change Password', icon: 'pi pi-key' },
    { id: 2, name: 'Backup Data', icon: 'pi pi-cloud-upload' },
    {id: 3, name: 'Delete account', icon: 'pi pi-trash' },
  ];

  openItem: number = 1

  backupInProgress = false;
  backupCompleted = false;
  backupUrl: string | null = null;
  showDeleteModal = false;
  deleteConfirmText = '';
   showDeleteStoreModal = false;
  deleteStoreConfirmText = '';

  constructor(private fb: FormBuilder) {
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.changePasswordForm.valid) {
      const formValue = this.changePasswordForm.value;

      if (formValue.newPassword !== formValue.confirmPassword) {
        alert('New passwords do not match.');
        return;
      }

      console.log('Password Data:', formValue);
      // Make API call here to update password
    }
  }

    startBackup() {
    this.backupInProgress = true;
    this.backupCompleted = false;

    // Simulate backup process
   const backup = setTimeout(() => {
      this.backupInProgress = false;
      this.backupCompleted = true;
      this.backupUrl = 'https://your-backup-link.com/shop-backup.zip';
    }, 3000); 

  }

    openDeleteModal() {
    this.showDeleteModal = true;
    this.deleteConfirmText = '';
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.deleteConfirmText = '';
  }

  deleteAccount() {
    if (this.deleteConfirmText === 'Delete my account') {
      // TODO: Call backend API to delete account/store
      console.log('Account deleted!');
      this.closeDeleteModal();
      // Optionally, redirect to login page
    }
  }

    openDeleteStoreModal() {
    this.showDeleteStoreModal = true;
    this.deleteStoreConfirmText = '';
  }
  closeDeleteStoreModal() {
    this.showDeleteStoreModal = false;
    this.deleteStoreConfirmText = '';
  }
  deleteStore() {
    if (this.deleteStoreConfirmText === 'Delete my store') {
      console.log('Store deleted!');
      this.closeDeleteStoreModal();
      // TODO: Call backend API to delete store data
    }
  }
}


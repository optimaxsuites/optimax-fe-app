import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent {
 changePasswordForm: FormGroup;

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
  }


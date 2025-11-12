import { Component } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { GeneralSettingsService } from '../../../service/general-settings-service.service';
import { AuthenticationService } from '../../../sharedComponents/service/auth-service/authentication.service';
import { countriesData } from '../../../sharedComponents/service/country-data';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  passwordForm!: FormGroup;

  isEditMode: boolean = false;
  isChangePasswordOpen: boolean = false;
  form!: FormGroup;

  countries: any[] = countriesData;
  states: any[] = [];
  cities: any[] = [];
  industries: any[] = [
    { id: 1, name: 'Retail' }, { id: 2, name: 'Food & Beverage' }, { id: 3, name: 'Pharmacy & Health' },
    { id: 4, name: 'Hospitality' }, { id: 5, name: 'Beauty & Personal Care' }, { id: 6, name: 'Automotive' },
    { id: 7, name: 'Groceries & Food Stores' }, { id: 8, name: 'Entertainment & Events' }, { id: 9, name: 'Health & Fitness' },
    { id: 10, name: 'Fashion' }, { id: 11, name: 'Electronics & Gadgets' }, { id: 12, name: 'Construction & Hardware' },
    { id: 13, name: 'Education' }, { id: 14, name: 'Home & Garden' }, { id: 15, name: 'Arts & Crafts' }, { id: 16, name: 'Wholesale Distribution' },
  ];
  currencies: { code: string, label: string }[] = [
    { code: 'NGN', label: 'Naira (₦)' }, { code: 'USD', label: 'US Dollar ($)' },
    { code: 'EUR', label: 'Euro (€)' }, { code: 'GBP', label: 'Pound Sterling (£)' },
  ];
  languages: string[] = ['English', 'Yoruba', 'Igbo', 'Hausa', 'French'];
  timeZones: { value: string, label: string }[] = [
    { value: 'Africa/Lagos', label: 'Africa/Lagos (GMT+1)' }, { value: 'UTC', label: 'UTC' },
    { value: 'Africa/Accra', label: 'Africa/Accra (GMT+0)' }, { value: 'America/New_York', label: 'New York (GMT-5)' },
  ];

  private actualId: number | null = null;

    constructor(
      private fb: FormBuilder,
      private generalSettingsService: GeneralSettingsService,
      private authService: AuthenticationService,
      private messageService: MessageService
    ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email: new FormControl({ value: '', disabled: true }, [Validators.required, Validators.email]),
      phoneNumber: new FormControl({ value: '', disabled: true }),
      fullname: new FormControl({ value: '', disabled: true }),
      username: new FormControl({ value: '', disabled: true }),
      domain: new FormControl({ value: '', disabled: true }),
      address: new FormControl({ value: '', disabled: true }),
      country: new FormControl({ value: '', disabled: true }),
      state: new FormControl({ value: '', disabled: true }),
      city: new FormControl({ value: '', disabled: true }),
      postalCode: new FormControl({ value: '', disabled: true }),
      industry: new FormControl({ value: '', disabled: true }),
      companyName: new FormControl({ value: '', disabled: true }, [Validators.required]),
      clientType: new FormControl({ value: '', disabled: true }),
      bio: new FormControl({ value: '', disabled: true }, [Validators.required]),
      currency: new FormControl({ value: '', disabled: true }),
      language: new FormControl({ value: '', disabled: true }),
      timeZone: new FormControl({ value: '', disabled: true }),
    });

    // this.passwordForm = this.fb.group({
    //   currentPassword: ['', Validators.required],
    //   newPassword: ['', [Validators.required, Validators.minLength(6)]],
    //   confirmPassword: ['', Validators.required]
    // });

    const storedUserId = sessionStorage.getItem('userid');
    console.log(storedUserId)
    if (storedUserId) {
      this.fetchUserData(+storedUserId);
    } else {
      console.error('User ID not found in session. Cannot fetch user data.');
    }

  }

  fetchUserData(userId: number): void {
    this.generalSettingsService.getUserPrimaryInfo(userId).subscribe({
      next: (data) => {
        if (data.id) {
          this.actualId = data.id;
          // sessionStorage.setItem('userid', data.id.toString());
        }

        this.form.patchValue({
          fullname: data.fullname,
          username: data.username,
          email: data.email,
          phoneNumber: data.phoneNumber,
          companyName: data.companyName,
          domain: data.domain,
          address: data.address,
          country: data.country,
          industry: data.industry,
          clientType: data.clientType,
          bio: data.bio,
          currency: data.currency,
          language: data.language,
          timeZone: data.timeZone,
          postalCode: data.postalCode,

        });

        if (data.country) {
          const selectedCountry = this.countries.find(c => c.name === data.country);
          if (selectedCountry) {
            this.states = selectedCountry.states;
          }
        }
        if (data.state) {
          const selectedState = this.states.find(s => s.name === data.state);
          if (selectedState) {
            this.cities = selectedState.cities;
          }
        }

        this.form.updateValueAndValidity();
      },
      error: (err) => {
        console.error('Failed to fetch user data:', err);
      }
    });
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    if (this.isEditMode) {
      this.form.enable();
    } else {
      this.form.disable();
    }
  }

  selectSetting(setting: string): void {
    // this.selectedSetting = setting;
    this.isEditMode = false;
    this.form.disable();

    // 🔹 Open side modal directly if "Security/privacy"
    if (setting === 'Security/privacy') {
      this.openChangePassword();
    }
  }

  goBack(): void {
    // this.selectedSetting = null;
    this.isEditMode = false;
    this.form.disable();
  }

  goBackSideModal(): void {
  
  // this.selectedSetting = null;
  this.isEditMode = false;
  this.form.disable();

  // Close the side modal
  this.closeChangePassword();
}

  onCountrySelect(country: any): void {
  
    if (country && country.states) {
      this.states = country.states;
      this.form.patchValue({ state: null, city: null });
    } else {
      this.states = [];
      this.cities = [];
    }
  }

  onStateSelect(state: any): void {
    // const selectedState = this.states.find(s => s.name === state);
    if (state && state.cities) {
      this.cities = state.cities;
      this.form.patchValue({ city: null });
    } else {
      this.cities = [];
    }
  }

  submit(): void {
    console.log(this.form)
    console.log(this.actualId)

    if (this.form.valid && this.actualId) {
      const updatedData = this.form.getRawValue();
      this.generalSettingsService.updateUserPrimaryInfo(this.actualId, updatedData).subscribe({
        next: (response) => {
          console.log('Update successful!', response);
          this.messageService.add({
          severity: 'success',
          summary: 'Profile updated',
          detail: 'Profile updated successfully.',
          key: 'tl',
          life: 3000,
        });
          this.toggleEditMode();
        },
        error: (err) => {
          this.messageService.add({
          severity: 'error',
          summary: 'Profile update failed',
          detail: 'Profile update failed.',
          key: 'tl',
          life: 3000,
        });
          console.error('Update failed:', err);
        }
      });
    } else {
       error: (err: any) => {
          this.messageService.add({
          severity: 'error',
          summary: 'Invalid form',
          detail: 'Form is invalid. Please correct the errors.',
          key: 'tl',
          life: 3000,
        });
      console.log('Form is invalid. Please correct the errors.', err);
      this.form.markAllAsTouched();
    }
  }
}

  // 🔹 Side modal control
  openChangePassword(): void {
    this.isChangePasswordOpen = true;
  }

  closeChangePassword(): void {
    this.isChangePasswordOpen = false;
  }

  changePassword(): void {
    if (this.passwordForm.valid) {
      const { newPassword, confirmPassword } = this.passwordForm.value;
      if (newPassword !== confirmPassword) {
        alert('Passwords do not match!');
        return;
      }

      console.log('Password updated:', this.passwordForm.value);
      alert('Password updated successfully!');
      this.passwordForm.reset();
      this.closeChangePassword(); // close modal after update
    } else {
      this.passwordForm.markAllAsTouched();
    }
  }
}

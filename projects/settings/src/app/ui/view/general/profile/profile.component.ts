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

  logoPreview: string | null = null;
  logoError: string | null = null;

  countries: any[] = countriesData;
  states: any[] = [];
  cities: any[] = [];
  industries: any[] = [
    { id: 1, name: 'Retail' }, { id: 2, name: 'Food & Beverage' }, { id: 3, name: 'Pharmacy & Health' },
    { id: 4, name: 'Hospitality' }, { id: 5, name: 'Beauty & Personal Care' }, { id: 6, name: 'Automotive' },
    { id: 7, name: 'Groceries & Food Stores' }, { id: 8, name: 'Entertainment & Events' }, { id: 9, name: 'Health & Fitness' },
    { id: 10, name: 'Fashion' }, { id: 11, name: 'Electronics & Gadgets' }, { id: 12, name: 'Construction & Hardware' },
    { id: 13, name: 'Education' }, { id: 14, name: 'Home & Garden' }, { id: 15, name: 'Arts & Crafts' }, { id: 16, name: 'Wholesale Distribution' },
    { id: 17, name: 'Information Technology' },
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

  private sessionUserId: number | null = null;

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
      companyLogo: new FormControl({ value: '', disabled: true }),
    });

    const storedUserId = sessionStorage.getItem('userid');
    if (storedUserId) {
      this.sessionUserId = +storedUserId;
      this.fetchUserData(this.sessionUserId);
    } else {
      console.error('User ID not found in session. Cannot fetch user data.');
    }

  }

  fetchUserData(userId: number): void {
    this.generalSettingsService.getUserPrimaryInfo(userId).subscribe({
      next: (data) => {
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
          companyLogo: data.companyLogo ?? null,
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
    this.isEditMode = false;
    this.form.disable();

    if (setting === 'Security/privacy') {
      this.openChangePassword();
    }
  }

  goBack(): void {
    this.isEditMode = false;
    this.form.disable();
  }

  goBackSideModal(): void {
    this.isEditMode = false;
    this.form.disable();
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
    if (state && state.cities) {
      this.cities = state.cities;
      this.form.patchValue({ city: null });
    } else {
      this.cities = [];
    }
  }

  submit(): void {
    if (this.form.valid && this.sessionUserId) {
      const rawData = this.form.getRawValue();
      const updatedData = { ...rawData, companyLogo: this.logoPreview ?? rawData.companyLogo };
      this.generalSettingsService.updateUserPrimaryInfo(this.sessionUserId, updatedData).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success', summary: 'Profile updated',
            detail: 'Profile updated successfully.', key: 'tl', life: 3000,
          });
          this.toggleEditMode();
        },
        error: (err: any) => {
          this.messageService.add({
            severity: 'error', summary: 'Profile update failed',
            detail: err?.message || 'Profile update failed. Please try again.', key: 'tl', life: 6000,
          });
        },
      });
    } else {
      this.messageService.add({
        severity: 'warn', summary: 'Invalid form',
        detail: 'Please fill all required fields.', key: 'tl', life: 3000,
      });
      this.form.markAllAsTouched();
    }
  }

  // Side modal control
  openChangePassword(): void {
    this.isChangePasswordOpen = true;
  }

  closeChangePassword(): void {
    this.isChangePasswordOpen = false;
  }

  onLogoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.logoError = 'Please upload an image file.';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.logoError = 'Logo must be under 2 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreview = reader.result as string;
      this.logoError = null;
    };
    reader.readAsDataURL(file);
  }

  clearLogo(): void {
    this.logoPreview = null;
    this.logoError = null;
  }
}

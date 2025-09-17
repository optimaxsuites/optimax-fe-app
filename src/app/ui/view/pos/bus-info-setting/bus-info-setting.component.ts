import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

enum Currency {
  NGN = 'Nigerian Naira',
  USD = 'United States Dollar',
  EUR = 'Euro',
  GBP = 'British Pound Sterling',
  CAD = 'Canadian Dollar',
  AUD = 'Australian Dollar',
  ZAR = 'South African Rand',
  GHS = 'Ghanaian Cedi',
  KES = 'Kenyan Shilling',
  INR = 'Indian Rupee',
  JPY = 'Japanese Yen',
  CNY = 'Chinese Yuan',
  AED = 'United Arab Emirates Dirham',
  BRL = 'Brazilian Real',
  CHF = 'Swiss Franc',
  SEK = 'Swedish Krona',
  NOK = 'Norwegian Krone',
  MXN = 'Mexican Peso',
  SGD = 'Singapore Dollar',
  HKD = 'Hong Kong Dollar',
}

interface GlobalSettingsDTO {
  id: number;
  defaultMarkupPercentage: number;
  currency: string;
  lowStockThreshold: number;
  allowMultiplePaymentMethods: boolean;
  autoRestockNotification: boolean;
  logo: string | null;
}

@Component({
  selector: 'app-bus-info-setting',
  templateUrl: './bus-info-setting.component.html',
  styleUrls: ['./bus-info-setting.component.scss'],
  providers: [MessageService],
})
export class BusInfoSettingComponent implements OnInit {
  settingsForm!: FormGroup;
  currencies = Object.entries(Currency).map(([code, name]) => ({ code, name }));
  imagePreview: string | ArrayBuffer | null = null;
  errorMessage: string | null = null;
  storageKey = 'businessSettings';
  isLogoRequired = true;

  initialSettings: GlobalSettingsDTO = {
    id: 1,
    defaultMarkupPercentage: 0,
    currency: '',
    lowStockThreshold: 0,
    allowMultiplePaymentMethods: false,
    autoRestockNotification: false,
    logo: null,
  };

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.settingsForm = this.fb.group({
      defaultMarkupPercentage: [
        this.initialSettings.defaultMarkupPercentage,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
      currency: [this.initialSettings.currency, Validators.required],
      lowStockThreshold: [
        this.initialSettings.lowStockThreshold,
        [Validators.required, Validators.min(1)],
      ],
      allowMultiplePaymentMethods: [
        this.initialSettings.allowMultiplePaymentMethods,
        [Validators.required, Validators.requiredTrue],
      ],
      autoRestockNotification: [
        this.initialSettings.autoRestockNotification,
        [Validators.required, Validators.requiredTrue],
      ],
    });

    // Clear the logo on initialization
    this.clearLogo();
  }

  onLogoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      this.errorMessage = 'No file selected.';
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Please upload an image file.';
      return;
    }

    if (file.size > 1024 * 1024) {
      this.errorMessage = 'File size must be less than 1MB.';
      return;
    }

    // Read and display the image
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result;
      this.errorMessage = null;
    };
    reader.readAsDataURL(file);
  }

  clearLogo(): void {
    this.imagePreview = null;
    this.errorMessage = null;
    const fileInput = document.getElementById('logo') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  isFormValid(): boolean {
    return (
      this.settingsForm.valid &&
      (this.isLogoRequired ? !!this.imagePreview : true)
    );
  }

  saveSettings(): void {
    if (!this.imagePreview && this.isLogoRequired) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please upload a business logo.',
        life: 3000,
      });
      return;
    }

    if (this.settingsForm.valid) {
      const formData = this.settingsForm.value;

      const updatedSettings: GlobalSettingsDTO = {
        ...this.initialSettings,
        ...formData,
        logo: this.imagePreview as string,
      };

      console.log('Saving settings:', updatedSettings);

      localStorage.setItem(this.storageKey, JSON.stringify(updatedSettings));

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Settings saved successfully!',
        life: 3000,
      });

      this.resetForm(false);
    } else {
      this.markFormGroupTouched(this.settingsForm);
    }
  }

  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  resetForm(showMessage: boolean = true): void {
    this.settingsForm.reset({
      defaultMarkupPercentage: 0,
      currency: '',
      lowStockThreshold: 0,
      allowMultiplePaymentMethods: false,
      autoRestockNotification: false,
    });

    this.clearLogo();

    if (showMessage) {
      this.messageService.add({
        severity: 'info',
        summary: 'Reset',
        detail: 'Form has been reset to initial values.',
        life: 3000,
      });
    }
  }

  toggleLogoRequired(): void {
    this.isLogoRequired = !this.isLogoRequired;
  }
}

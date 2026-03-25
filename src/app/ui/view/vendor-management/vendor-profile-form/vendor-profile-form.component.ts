import { Component } from '@angular/core';
import {
  CompanyProfileDto,
  VendorAIStatus,
  VendorDto,
  VendorStatus,
} from '../../../domain/vendor.dto';
// import emailjs from '@emailjs/browser';

@Component({
  selector: 'app-vendor-profile-form',
  templateUrl: './vendor-profile-form.component.html',
  styleUrl: './vendor-profile-form.component.scss',
})
export class VendorProfileFormComponent {
  private storageKey = 'vendors';

  model: Partial<CompanyProfileDto> = {
    legalName: '',
    tradingName: '',
    businessType: '',
    companyEmail: '',
    companyPhone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    website: '',
    yearEstablished: undefined,
    employeeCount: undefined,
  };

  businessTypes = [
    { label: 'Limited Liability Company', value: 'LLC' },
    { label: 'Sole Proprietorship', value: 'Sole Proprietorship' },
    { label: 'Partnership', value: 'Partnership' },
    { label: 'Corporation', value: 'Corporation' },
  ];

  generatePassword(length: number = 10): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';

    let password = '';

    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
  }

  submitCompanyProfile(): void {
    if (!this.isValid()) {
      alert('Please fill all required fields.');
      return;
    }

    const now = new Date().toISOString();

    const companyProfile: CompanyProfileDto = {
      id: Date.now(),
      legalName: this.model.legalName!.trim(),
      tradingName: this.model.tradingName?.trim() || '',
      businessType: this.model.businessType!,
      companyEmail: this.model.companyEmail?.trim() || '',
      companyPhone: this.model.companyPhone?.trim() || '',
      address: this.model.address!.trim(),
      city: this.model.city?.trim() || '',
      state: this.model.state!.trim(),
      country: this.model.country!.trim(),
      postalCode: this.model.postalCode?.trim() || '',
      website: this.model.website?.trim() || '',
      yearEstablished: this.model.yearEstablished,
      employeeCount: this.model.employeeCount,
      createdAt: now,
      createdBy: 'Vendor', // change this if you have current user
    };

    const vendors = this.getVendors();
    const generatedPassword = this.generatePassword();

    const vendor: VendorDto = {
      id: Date.now(),
      token: this.generateRegistrationToken(),
      companyProfile,
      contacts: [],
      category: [],
      capabilityStatement: '',
      bankDetails: [],
      status: VendorStatus.Draft,
      aiStatus: VendorAIStatus.Pending,
      submittedOn: undefined,
      approvedBy: undefined,
      approvedAt: undefined,
      rejectedBy: undefined,
      rejectedAt: undefined,
      rejectionReason: undefined,
      lastUpdatedAt: now,
      documentsRequired: [],
      documentsSubmitted: [],
      documents: [],
      invitedOn: now,
      acceptsTerms: false,

      password: generatedPassword,
      
    };

    vendors.push(vendor);
    localStorage.setItem(this.storageKey, JSON.stringify(vendors));

    this.sendVendorLoginEmail(vendor, generatedPassword);

    console.log('Saved vendor draft:', vendor);
    alert('Company profile saved successfully as draft.');
  }

  sendVendorLoginEmail(vendor: VendorDto, password: string): void {
    const templateParams = {
      company_name: vendor.companyProfile.legalName,
      email: vendor.companyProfile.companyEmail,
      password: password,
    };

    // emailjs
    //   .send(
    //     'service_0br6dpa',
    //     'template_xch3n8c',
    //     templateParams,
    //     'TTpd0TR2mf6rJKstH',
    //   )
    //   .then(() => {
    //     console.log('Login email sent successfully');
    //   })
    //   .catch((err) => {
    //     console.error('Email failed', err);
    //   });
  }

  private getVendors(): VendorDto[] {
    return JSON.parse(localStorage.getItem(this.storageKey) ?? '[]');
  }

  private generateRegistrationToken(): string {
    const random = Math.floor(100000 + Math.random() * 900000);
    return `VND-${Date.now()}-${random}`;
  }

  private isValid(): boolean {
    return !!(
      this.model.legalName &&
      this.model.businessType &&
      this.model.address &&
      this.model.state &&
      this.model.country
    );
  }
}

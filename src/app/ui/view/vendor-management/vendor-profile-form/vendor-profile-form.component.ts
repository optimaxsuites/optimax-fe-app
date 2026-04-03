import { Component } from '@angular/core';
import {
  CompanyProfileDto,
  VendorAIStatus,
  VendorDto,
  VendorStatus,
} from '../../../domain/vendor.dto';
import { MailerServiceService } from '../../../service/mailer-service.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-vendor-profile-form',
  templateUrl: './vendor-profile-form.component.html',
  styleUrl: './vendor-profile-form.component.scss',
  providers: [MessageService],
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

  constructor(
    private mailerService: MailerServiceService,
    private messageService: MessageService,
  ) {}

  generatePassword(length: number = 10): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';

    let password = '';

    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
  }

  // submitCompanyProfile(): void {
  //   if (!this.isValid()) {
  //     this.messageService.add({
  //       severity: 'warn',
  //       summary: 'Validation Error',
  //       detail: 'Please fill all required fields.',
  //       life: 3000,
  //     });
  //     return;
  //   }

  //   const now = new Date().toISOString();

  //   const companyProfile: CompanyProfileDto = {
  //     id: Date.now(),
  //     legalName: this.model.legalName!.trim(),
  //     tradingName: this.model.tradingName?.trim() || '',
  //     businessType: this.model.businessType!,
  //     companyEmail: this.model.companyEmail?.trim() || '',
  //     companyPhone: this.model.companyPhone?.trim() || '',
  //     address: this.model.address!.trim(),
  //     city: this.model.city?.trim() || '',
  //     state: this.model.state!.trim(),
  //     country: this.model.country!.trim(),
  //     postalCode: this.model.postalCode?.trim() || '',
  //     website: this.model.website?.trim() || '',
  //     yearEstablished: this.model.yearEstablished,
  //     employeeCount: this.model.employeeCount,
  //     createdAt: now,
  //     createdBy: 'Vendor', // change this if you have current user
  //   };

  //   const vendors = this.getVendors();
  //   const generatedPassword = this.generatePassword();

  //   const vendor: VendorDto = {
  //     id: Date.now(),
  //     token: this.generateRegistrationToken(),
  //     companyProfile,
  //     contacts: [],
  //     category: [],
  //     capabilityStatement: '',
  //     bankDetails: [],
  //     status: VendorStatus.Draft,
  //     aiStatus: VendorAIStatus.Pending,
  //     submittedOn: undefined,
  //     approvedBy: undefined,
  //     approvedAt: undefined,
  //     rejectedBy: undefined,
  //     rejectedAt: undefined,
  //     rejectionReason: undefined,
  //     lastUpdatedAt: now,
  //     documentsRequired: [],
  //     documentsSubmitted: [],
  //     documents: [],
  //     invitedOn: now,
  //     acceptsTerms: false,

  //     password: generatedPassword,
  //   };

  //   vendors.push(vendor);
  //   localStorage.setItem(this.storageKey, JSON.stringify(vendors));

  //   this.sendVendorLoginDetails(vendor, generatedPassword);

  //   console.log('Saved vendor draft:', vendor);
  //   this.messageService.add({
  //     severity: 'success',
  //     summary: 'Successful',
  //     detail: 'Company profile saved successfully as draft.',
  //     life: 3000,
  //   });
  // }

  submitCompanyProfile(): void {
    if (!this.isValid()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill all required fields.',
        life: 3000,
      });
      return;
    }

    const vendors = this.getVendors();
    const companyEmail = this.model.companyEmail?.trim().toLowerCase() || '';
    const legalName = this.model.legalName?.trim().toLowerCase() || '';
    const companyPhone = this.model.companyPhone?.trim() || '';

    const vendorAlreadyExists = vendors.some((vendor: VendorDto) => {
      const vEmail =
        vendor.companyProfile?.companyEmail?.trim().toLowerCase() || '';

      const vName =
        vendor.companyProfile?.legalName?.trim().toLowerCase() || '';

      const vPhone = vendor.companyProfile?.companyPhone?.trim() || '';

      return (
        vEmail === companyEmail ||
        vName === legalName || 
        vPhone === companyPhone 
      );
    });

    if (vendorAlreadyExists) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Vendor Already Exists',
        detail:
          'A vendor with the same email, company name, or phone number already exists.',
        life: 3000,
      });
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
      createdBy: 'Vendor',
    };

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

    this.sendVendorLoginDetails(vendor, generatedPassword);

    console.log('Saved vendor draft:', vendor);

    this.messageService.add({
      severity: 'success',
      summary: 'Successful',
      detail: 'Company profile saved successfully as draft.',
      life: 3000,
    });
  }

  // sendVendorLoginEmail(vendor: VendorDto, password: string): void {
  //   const templateParams = {
  //     company_name: vendor.companyProfile.legalName,
  //     email: vendor.companyProfile.companyEmail,
  //     password: password,
  //   };

  //   emailjs
  //     .send(
  //       'service_0br6dpa',
  //       'template_xch3n8c',
  //       templateParams,
  //       'TTpd0TR2mf6rJKstH',
  //     )
  //     .then(() => {
  //       console.log('Login email sent successfully');
  //     })
  //     .catch((err) => {
  //       console.error('Email failed', err);
  //     });
  // }
  sendVendorLoginDetails(vendor: VendorDto, password: string): void {
    const body = {
      name: vendor.companyProfile.legalName,
      recieverEmail: vendor.companyProfile.companyEmail,
      subject: 'Welcome',
      body: `
<p>Hello ${vendor.companyProfile.legalName},</p>

<p>Your vendor account has been created successfully.</p>

<p><strong>Login credentials:</strong></p>

<p>
Email: ${vendor.companyProfile.companyEmail}<br>
Password: ${password}
</p>

<p>Please login to the vendor portal and complete your registration.</p>

<p>Regards,<br>Procurement Team</p>
    `.trim(),
    };

    this.mailerService.sendMail(body).subscribe({
      next: () => {
        console.log('Login email sent successfully');
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Login credentials have been sent to the company email.',
          life: 3000,
        });
      },
      error: (err) => {
        console.error('Login email failed', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: err?.message || 'Failed to send login email.',
          life: 3000,
        });
      },
    });
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
      this.model.companyEmail &&
      this.model.address &&
      this.model.state &&
      this.model.country
    );
  }
}

import { Component, OnInit } from '@angular/core';
import { VendorService } from '../../../service/vendor/vendor.service';
import { VendorCategoryDto } from '../../../domain/vendor.category.dto';
import {
  VendorDto,
  VendorListQuery,
  VendorStatus,
} from '../../../domain/vendor.dto';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VendorRegistrationService } from '../../../service/vendor/vendor-registration.service';


@Component({
  templateUrl: './vendor-list.component.html',
})
export class VendorListComponent implements OnInit {
  loading = false;
  displayVendorForm: boolean = false;
  vendorForm: FormGroup;
  vendors: VendorDto[] = [];
  total = 0;

  categories: VendorCategoryDto[] = []; // you can load from API later
  statusOptions = [
    { label: 'All', value: null },
    { label: 'Pending', value: VendorStatus.Pending },
    { label: 'Approved', value: VendorStatus.Approved },
    { label: 'Rejected', value: VendorStatus.Rejected },
    { label: 'Inactive', value: VendorStatus.Inactive },
    { label: 'PendingRegistration', value: VendorStatus.PendingRegistration },
    { label: 'PendingApproval', value: VendorStatus.PendingApproval }
  ];

  query: VendorListQuery = { q: '', status: 'All', page: 1, pageSize: 10 };

  constructor(
    private vendorService: VendorService,
    private vendorRegService: VendorRegistrationService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.vendorForm = this.fb.group({
      legalName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      contactName: ['', Validators.required],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: [''],
      contactRole: [''],
    });
  }

  ngOnInit(): void {
    // TODO: load categories from API if you have endpoint
    this.fetchInvitedAndInProgress();
    // this.displayVendorForm = true;
  }

fetchInvitedAndInProgress(): void {
  const data = JSON.parse(localStorage.getItem('vendors') || '[]');

  this.vendors = data.filter((v: any) =>
    v.status === 'Invited' ||
    v.status === 'RegistrationInProgress'
  );
}

  onPage(event: any) {
    // PrimeNG paginator is 0-indexed
    const page = (event.page ?? 0) + 1;
    this.query.page = page;
    this.query.pageSize = event.rows ?? this.query.pageSize;
    this.fetchInvitedAndInProgress();
  }

  open(v: VendorDto) {
    this.router.navigate(['/vendor', v.id]);
  }







  openForm() {
    this.displayVendorForm = true
  }
  private generateId(): string {
    return 'V-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  private generateToken(): string {
    return Math.random().toString(36).substring(2) + Date.now();
  }

  addVendor() {
    if (this.vendorForm.invalid) {
      this.vendorForm.markAllAsTouched();
      return;
    }

    const payload: any = {
      // ===== Identity =====
      id: this.generateId(),
      vendorCode: 'VEN-' + Date.now(),
      registrationToken: this.generateToken(),

      // ===== Core Business Info =====
      legalName: this.vendorForm.value.legalName,
      tradingName: '',
      businessType: 'Other',
      email: this.vendorForm.value.email,
      phone: '',
      website: '',
      yearEstablished: undefined,
      employeeCount: undefined,

      // ===== Address =====
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',

      // ===== Categories / Capabilities =====
      categoryIds: [],
      capabilityStatement: '',

      // ===== Primary Contact =====
      primaryContact: {
        name: this.vendorForm.value.contactName,
        email: this.vendorForm.value.contactEmail,
        phone: this.vendorForm.value.contactPhone || '',
        role: this.vendorForm.value.contactRole || '',
      },

      // ===== Banking Details =====
      bankName: '',
      accountName: '',
      accountNumber: '',
      currency: '',

      // ===== Compliance / Documents =====
      documents: [], // later store uploaded docs here
      submissionVersion: 0,

      // ===== Lifecycle Status =====
      status: 'Invited',
      /*
        Possible values:
        Invited
        RegistrationInProgress
        Submitted
        UnderReview
        Approved
        Rejected
        Suspended
      */

      // ===== AI Validation =====
      aiStatus: 'NotStarted',
      /*
        NotStarted
        Running
        Passed
        NeedsHumanReview
        Failed
      */
      aiConfidenceScore: 0,
      aiFindings: [],

      // ===== Registration Tracking =====
      currentOnboardingStep: 0,
      registrationStartedAt: null,
      submittedAt: null,

      // ===== Approval Tracking =====
      approvedAt: null,
      approvedBy: null,

      // ===== Rejection Tracking =====
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,

      // ===== Audit Fields =====
      invitedAt: new Date(),
      createdAt: new Date(),
      createdBy: 'Admin',
      updatedAt: null,
      updatedBy: null,

      // ===== Flags =====
      isActive: true,
      isArchived: false,
      acceptsTerms: false
    };

    // Get existing vendors
    const existing = JSON.parse(localStorage.getItem('vendors') || '[]');

    // Add new vendor
    existing.push(payload);

    // Save back
    localStorage.setItem('vendors', JSON.stringify(existing));

    // Reset form
    this.vendorForm.reset();

    this.displayVendorForm = false;


    this.fetchInvitedAndInProgress();

    console.log('Vendor saved locally:', payload);
  }


}

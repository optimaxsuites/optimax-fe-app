import { Component, OnInit } from '@angular/core';
import { VendorService } from '../../../service/vendor/vendor.service';
import { VendorCategoryDto } from '../../../domain/vendor.category.dto';
import { VendorDto, VendorStatus } from '../../../domain/vendor.dto';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VendorRegistrationService } from '../../../service/vendor/vendor-registration.service';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-vendor-list',
  templateUrl: './vendor-list.component.html',
  styleUrl: './vendor-list.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class VendorListComponent implements OnInit {
  loading = false;
  displayVendorForm: boolean = false;
  isEditMode = false;
  vendorForm: FormGroup;
  vendors: VendorDto[] = [];
  selectVendor: VendorDto[] = [];

  selectedVendor: any | null = null;
  filteredVendors: VendorDto[] = [];
  displayVendorView = false;

  total = 0;

  categories: VendorCategoryDto[] = []; // you can load from API later

  columns = [
    { header: 'Vondor ID', field: 'id', sortable: true },
    {
      header: 'Business Name',
      field: 'companyProfile.legalName',
      sortable: true,
    },
    {
      header: 'Registration Token',
      field: 'token',
      sortable: true,
    },
    { header: 'Email', field: 'companyProfile.companyEmail', sortable: true },
    {
      header: 'Invited On',
      field: 'invitedOn',
      sortable: true,
      formatter: (row: any) =>
        new Date(row.invitedOn).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
    {
      header: 'Status',
      sortable: true,
      field: 'status',
      formatter: (row: any) => row.status ?? '__',
      badgeClass: (row: any) =>
        'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center ' +
        this.statusBadgeClass(row.status),
    },
  ];

  actions = [
    { id: 'view', label: 'View', icon: 'pi pi-eye' },
    // { id: 'edit', label: 'Edit', icon: 'pi pi-pencil' },
    // { id: 'resendInvite', label: 'Resend Invite', icon: 'pi pi-refresh' },
    { id: 'delete', label: 'Delete', icon: 'pi pi-trash', className: 'danger' },
  ];

  query: any = { q: '', status: null as string | null };

  constructor(
    private vendorService: VendorService,
    private vendorRegService: VendorRegistrationService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router,
    private fb: FormBuilder,
  ) {
    this.vendorForm = this.fb.group({
      legalName: ['', Validators.required],
      companyEmail: ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      contactEmail: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // TODO: load categories from API if you have endpoint
    this.fetchInvited();
    this.displayVendorForm = false;
  }

  onTabChange(event: { value: any }) {
    // Update content based on selected tab
    console.log('Selected Tab: ', event.value);
  }

  applyFilters(): void {
    const q = (this.query.q || '').trim().toLowerCase();
    const status = this.query.status; // optional dropdown filter

    this.filteredVendors = this.vendors.filter((v: any) => {
      // Status filter (optional)
      if (status && v.status !== status) return false;

      // Text search filter
      if (!q) return true;

      const haystack = [v.id, v.legalName, v.email, v.invitedOn, v.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }

  openItem($event: any) {
  }
  onAction($event: { actionId: string; row: VendorDto }) {
    const vendor = $event.row;

    switch ($event.actionId) {
      case 'view':
        this.view(vendor);
        break;

      case 'edit':
        this.edit(vendor);
        break;

      case 'resendInvite':
        this.resendInvite(vendor);
        break;

      case 'delete':
        this.delete(vendor);
        break;

      default:
        console.warn('Unknown action:', $event.actionId, vendor);
        this.messageService.add({
          severity: 'warn',
          summary: 'Action',
          detail: 'Unknown action selected.',
          life: 2500,
        });
        break;
    }
  }
  // delete(vendor: VendorDto) {
  //   throw new Error('Method not implemented.');
  // }

  delete(vendor: VendorDto): void {
    this.confirmationService.confirm({
      header: 'Delete Vendor',
      message: `Are you sure you want to delete ${vendor.companyProfile.legalName}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',

      accept: () => {
        const key = 'vendors';
        const vendors: VendorDto[] = JSON.parse(
          localStorage.getItem(key) ?? '[]',
        );

        const updated = vendors.filter((v) => v.id !== vendor.id);

        localStorage.setItem(key, JSON.stringify(updated));

        this.vendors = updated;
        this.filteredVendors = [...updated];
        this.fetchInvited();
      },
    });
  }
  resendInvite(vendor: VendorDto) {
    throw new Error('Method not implemented.');
  }
  edit(vendor: VendorDto) {
    this.isEditMode = true;
    this.selectedVendor = vendor;

    this.vendorForm.patchValue({
      legalName: vendor.companyProfile?.legalName ?? '',
      companyEmail: vendor.companyProfile?.companyEmail ?? '',
      firstName: vendor.contacts?.[0]?.firstName ?? '',
      lastName: vendor.contacts?.[0]?.lastName ?? '',
      phoneNumber: vendor.contacts?.[0]?.phoneNumber ?? '',
      contactEmail: vendor.contacts?.[0]?.email ?? '',
      role: vendor.contacts?.[0]?.role ?? '',
    });

    this.displayVendorForm = true;
  }
  view(vendor: VendorDto): void {
    this.isEditMode = false;
    this.selectedVendor = vendor;
    this.displayVendorView = true;
  }

  closeVendorView(): void {
    this.displayVendorView = false;
    this.selectedVendor = null;
  }

  fetchInvited(): void {
    const data = JSON.parse(localStorage.getItem('vendors') || '[]');

    this.vendors = data.filter((v: any) => v.status === 'Invited' ||
      v.status === 'RegistrationInProgress' || v.status === 'Draft');

    this.applyFilters();
  }

  onPage(event: any) {
    // PrimeNG paginator is 0-indexed
    const page = (event.page ?? 0) + 1;
    this.query.page = page;
    this.query.pageSize = event.rows ?? this.query.pageSize;
    this.fetchInvited();
  }

  open(v: VendorDto) {
    this.router.navigate(['/vendor', v.id]);
  }

  openForm() {
    this.displayVendorForm = true;
  }
  private generateId(): string {
    return 'V-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  private generateToken(): string {
    return Math.random().toString(36).substring(2) + Date.now();
  }

  // addVendor() {
  //   if (this.vendorForm.invalid) {
  //     this.vendorForm.markAllAsTouched();
  //     return;
  //   }

  //   const payload: any = {
  //     // ===== Identity =====
  //     id: this.generateId(),
  //     vendorCode: 'VEN-' + Date.now(),
  //     registrationToken: this.generateToken(),

  //     // ===== Core Business Info =====
  //     legalName: this.vendorForm.value.legalName,
  //     tradingName: '',
  //     businessType: 'Other',
  //     email: this.vendorForm.value.email,
  //     phone: '',
  //     website: '',
  //     yearEstablished: undefined,
  //     employeeCount: undefined,

  //     // ===== Address =====
  //     address: '',
  //     city: '',
  //     state: '',
  //     country: '',
  //     postalCode: '',

  //     // ===== Categories / Capabilities =====
  //     categoryIds: [],
  //     capabilityStatement: '',

  //     // ===== Primary Contact =====
  //     primaryContact: {
  //       name: this.vendorForm.value.contactName,
  //       email: this.vendorForm.value.contactEmail,
  //       phone: this.vendorForm.value.contactPhone || '',
  //       role: this.vendorForm.value.contactRole || '',
  //     },

  //     // ===== Banking Details =====
  //     bankName: '',
  //     accountName: '',
  //     accountNumber: '',
  //     currency: '',

  //     // ===== Compliance / Documents =====
  //     documents: [], // later store uploaded docs here
  //     submissionVersion: 0,

  //     // ===== Lifecycle Status =====
  //     status: 'Invited',
  //     /*
  //       Possible values:
  //       Invited
  //       RegistrationInProgress
  //       Submitted
  //       UnderReview
  //       Approved
  //       Rejected
  //       Suspended
  //     */

  //     // ===== AI Validation =====
  //     aiStatus: 'NotStarted',
  //     /*
  //       NotStarted
  //       Running
  //       Passed
  //       NeedsHumanReview
  //       Failed
  //     */
  //     aiConfidenceScore: 0,
  //     aiFindings: [],

  //     // ===== Registration Tracking =====
  //     currentOnboardingStep: 0,
  //     registrationStartedAt: null,
  //     submittedAt: null,

  //     // ===== Approval Tracking =====
  //     approvedAt: null,
  //     approvedBy: null,

  //     // ===== Rejection Tracking =====
  //     rejectedAt: null,
  //     rejectedBy: null,
  //     rejectionReason: null,

  //     // ===== Audit Fields =====
  //     invitedAt: new Date(),
  //     createdAt: new Date(),
  //     createdBy: 'Admin',
  //     updatedAt: null,
  //     updatedBy: null,

  //     // ===== Flags =====
  //     isActive: true,
  //     isArchived: false,
  //     acceptsTerms: false,
  //   };

  //   // Get existing vendors
  //   const existing = JSON.parse(localStorage.getItem('vendors') || '[]');

  //   // Add new vendor
  //   existing.push(payload);

  //   // Save back
  //   localStorage.setItem('vendors', JSON.stringify(existing));

  //   // Reset form
  //   this.vendorForm.reset();

  //   this.displayVendorForm = false;

  //   this.fetchInvited();

  //   console.log('Vendor saved locally:', payload);
  // }

  getVendorsFromStorage(): VendorDto[] {
    return JSON.parse(localStorage.getItem('vendors') ?? '[]');
  }

  addVendor(): void {
    const formValue = this.vendorForm.value;

    const newVendor: VendorDto = {
      id: Math.floor(Math.random() * 1000000),
      companyProfile: {
        legalName: formValue.legalName,
        companyEmail: formValue.companyEmail,
      },
      contacts: [
        {
          firstName: formValue.firstName,
          lastName: formValue.lastName,
          phoneNumber: formValue.phoneNumber,
          email: formValue.contactEmail,
          role: formValue.role,
        },
      ],
      token: this.generateRegistrationToken(),
      status: VendorStatus.Invited,
      invitedOn: new Date().toISOString(),
    } as VendorDto;

    const vendors = this.getVendorsFromStorage();
    vendors.push(newVendor);

    localStorage.setItem('vendors', JSON.stringify(vendors));
    this.vendors = vendors;
    this.filteredVendors = [...vendors];

    this.vendorForm.reset();
    this.displayVendorForm = false;
    this.isEditMode = false;
    this.selectedVendor = null;
  }
  generateRegistrationToken(): string {
    const randomPart = Math.random().toString(36).substring(2, 11);
    const timestampPart = Date.now().toString();

    return `${randomPart}${timestampPart}`;
  }
  updateVendor(): void {
    if (!this.selectedVendor) return;

    const formValue = this.vendorForm.value;
    const key = 'vendors';

    const vendors: VendorDto[] = JSON.parse(localStorage.getItem(key) ?? '[]');

    const updated = vendors.map((v) => {
      if (v.id !== this.selectedVendor?.id) return v;

      return {
        ...v,
        companyProfile: {
          ...v.companyProfile,
          legalName: formValue.legalName,
          companyEmail: formValue.companyEmail,
        },
        contacts: [
          {
            ...v.contacts?.[0],
            firstName: formValue.firstName,
            lastName: formValue.lastName,
            phoneNumber: formValue.phoneNumber,
            email: formValue.contactEmail,
            role: formValue.role,
          },
        ],
      };
    });

    localStorage.setItem(key, JSON.stringify(updated));
    this.vendors = updated;
    this.filteredVendors = [...updated];

    this.displayVendorForm = false;
  }
  saveVendor(): void {
    if (this.vendorForm.invalid) {
      this.vendorForm.markAllAsTouched();
      return;
    }

    if (this.isEditMode) {
      this.updateVendor();
      this.fetchInvited();
    } else {
      this.addVendor();
      this.fetchInvited();
    }
  }

  private readonly statusClasses: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
    Inactive: 'bg-gray-200 text-gray-700 ring-1 ring-gray-300',
    Cancelled: 'bg-gray-300 text-gray-900 ring-1 ring-gray-400',

    Submitted: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
    Converted: 'bg-sky-100 text-sky-800 ring-1 ring-sky-200',

    Pending: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    PendingApproval: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    PendingRegistration: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    UnderReview: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',

    Approved: 'bg-green-100 text-green-800 ring-1 ring-green-200',
    AiApproved: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',

    Rejected: 'bg-red-100 text-red-800 ring-1 ring-red-200',
    AiRejected: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200',
    AiFlagged: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200',

    AiPending: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
  };

  statusBadgeClass(status: string): string {
    return (
      this.statusClasses[status] ??
      'bg-gray-100 text-gray-800 ring-1 ring-gray-200'
    );
  }
}

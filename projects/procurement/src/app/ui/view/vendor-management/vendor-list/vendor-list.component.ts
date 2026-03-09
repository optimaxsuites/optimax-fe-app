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
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-vendor-list',
  templateUrl: './vendor-list.component.html',
  styleUrl: './vendor-list.component.scss',
  providers: [MessageService],
})
export class VendorListComponent implements OnInit {
  loading = false;
  displayVendorForm: boolean = false;
  vendorForm: FormGroup;
  vendors: VendorDto[] = [];
  selectVendor: VendorDto[] = [];
  filteredVendors: VendorDto[] = [];
  total = 0;

  categories: VendorCategoryDto[] = []; // you can load from API later

  columns = [
    { header: 'Vondor ID', field: 'id', sortable: true },
    { header: 'Business Name', field: 'legalName', sortable: true },
    {
      header: 'Registration Token',
      field: 'registrationToken',
      sortable: true,
    },
    { header: 'Email', field: 'email', sortable: true },
    {
      header: 'Invited On',
      field: 'createdAt',
      sortable: true,
      formatter: (row: any) =>
        new Date(row.createdAt).toLocaleDateString('en-US', {
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
    { id: 'edit', label: 'Edit', icon: 'pi pi-pencil' },
    { id: 'resendInvite', label: 'Resend Invite', icon: 'pi pi-refresh' },
    { id: 'delete', label: 'Delete', icon: 'pi pi-trash', className: 'danger' },
  ];



  query: any = { q: '', status: null as string | null };

  constructor(
    private vendorService: VendorService,
    private vendorRegService: VendorRegistrationService,
    private messageService: MessageService,
    private router: Router,
    private fb: FormBuilder,
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
    this.fetchInvited();
    // this.displayVendorForm = true;
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

      const haystack = [
        v.id,
        v.legalName,
        v.email,
        v.registrationToken,
        v.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }

  openItem($event: any) {
    throw new Error('Method not implemented.');
  }
  onAction($event: { actionId: string; row: VendorDto }) {
    const i = $event.row;

    switch ($event.actionId) {
      case 'view':
        this.view(i);
        break;

      case 'edit':
        this.edit(i);
        break;

      case 'resendInvite':
        this.resendInvite(i);
        break;

      case 'delete':
        this.delete(i);
        break;

      default:
        console.warn('Unknown action:', $event.actionId, i);
        this.messageService.add({
          severity: 'warn',
          summary: 'Action',
          detail: 'Unknown action selected.',
          life: 2500,
        });
        break;
    }
  }
  delete(i: VendorDto) {
    throw new Error('Method not implemented.');
  }
  resendInvite(i: VendorDto) {
    throw new Error('Method not implemented.');
  }
  edit(i: VendorDto) {
    throw new Error('Method not implemented.');
  }
  view(i: VendorDto) {
    throw new Error('Method not implemented.');
  }

  fetchInvited(): void {
    const data = JSON.parse(localStorage.getItem('vendors') || '[]');

    this.vendors = data.filter((v: any) => v.status === 'Invited');

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
      acceptsTerms: false,
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

    this.fetchInvited();

    console.log('Vendor saved locally:', payload);
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

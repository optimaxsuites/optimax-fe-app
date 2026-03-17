import { Component } from '@angular/core';
import { VendorService } from '../../../service/vendor/vendor.service';
import { Router } from '@angular/router';
import { VendorDto } from '../../../domain/vendor.dto';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-approved-vendor',
  templateUrl: './approved-vendor.component.html',
  styleUrl: './approved-vendor.component.scss',
  providers: [MessageService],
})
export class ApprovedVendorComponent {
  vendors: any[] = [];
  total = 0;
  loading = false;
  selectedVendors = [];

  // keep this consistent with your other pages
  query: any = {
    page: 1,
    pageSize: 10,
    search: '',
    status: 'Approved', // ✅ force Approved list
  };

  selectedVendor: any | null = null;
  // currentAction: VendorAction | null = null;

  // dialog state (optional)
  displayVendorDialog = false;
  actionComment = '';

  columns = [
    {
      header: 'Vendor Id',
      field: 'id',
      sortable: true,
      // formatter: (row: VendorDto) => row.id,
    },
    {
      header: 'Business Name',
      field: 'companyProfile.legalName',
      sortable: true,
      // formatter: (row: VendorDto) => row.legalName,
    },
        {
      header: 'Registration Token',
      field: 'token',
      sortable: true,
    },
    {
      header: 'Email',
      field: 'companyProfile.companyEmail',
      sortable: true,
      // formatter: (row: VendorDto) => row.email,
    },
    {
      header: 'Approved On',
      field: 'approvedAt',
      sortable: true,
      formatter: (row: any) =>
        new Date(row.approvedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
    {
      header: 'Approved By',
      field: 'approvedBy',
      sortable: true,
      formatter: (row: VendorDto) => row.approvedBy ?? '-',
    },
    {
      header: 'Status',
      field: 'status',
      sortable: true,
      formatter: (row: any) => row.status ?? '__',
      badgeClass: (row: any) =>
        'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center ' +
        this.statusBadgeClass(row.status),
    },
  ];

  actions = [
    {
      id: 'view',
      label: 'View',
      icon: 'pi pi-eye',
    },
    // {
    //   id: 'revalidate',
    //   label: 'Re-validate',
    //   icon: 'pi pi-refresh',
    // },
    // {
    //   id: 'suspend',
    //   label: 'Suspend',
    //   icon: 'pi pi-ban',
    // },
  ];

  constructor(
    private vendorService: VendorService,
    private router: Router,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.fetch();
  }

  onAction($event: { actionId: string; row: any }) {
    const v = $event.row;

    switch ($event.actionId) {
      case 'view':
        this.reviewVendor(v);
        break;

      case 'revalidate':
        this.openAction(v);
        break;

      case 'suspend':
        this.openAction(v);
        break;

      default:
        console.warn('Unknown action:', $event.actionId, v);
        this.messageService.add({
          severity: 'warn',
          summary: 'Action',
          detail: 'Unknown action selected.',
          life: 2500,
        });
        break;
    }
  }

  fetch(): void {
    this.loading = true;

    setTimeout(() => {
      // small delay to simulate loading state
      const data = JSON.parse(localStorage.getItem('vendors') || '[]');

      this.vendors = data.filter(
        (v: any) => v.status === 'Approved'
      );

      this.loading = false;
    }, 300);
  }

  reviewVendor(v: any): void {
          this.selectedVendor = v;
    this.displayVendorDialog = true;
    // this.router.navigate(['admin/procurement/vendor-management', v.id, 'review']);
  }

  openAction(v: any): void {
    this.selectedVendor = v;
    this.actionComment = '';
    this.displayVendorDialog = true;
  }

  onPageChange(event: any): void {
    // PrimeNG paginator emits { first, rows, page, pageCount }
    this.query.page = (event.page ?? 0) + 1;
    this.query.pageSize = event.rows ?? this.query.pageSize;
    this.fetch();
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

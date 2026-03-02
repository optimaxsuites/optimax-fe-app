import { Component, OnInit } from '@angular/core';
import { VendorService } from '../../../service/vendor/vendor.service';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { VendorDto } from '../../../domain/vendor.dto';

type VendorAction = 'Reinvite' | 'Archive';

@Component({
  selector: 'app-rejected-vendor',
  templateUrl: './rejected-vendor.component.html',
  styleUrl: './rejected-vendor.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class RejectedVendorComponent implements OnInit {
  vendors: any[] = [];
  selectedVendors = [];
  loading = false;
  total = 0;

  // Keep query consistent with your other lists
  query: any = {
    page: 1,
    pageSize: 10,
    search: null,
    status: 'Rejected', // IMPORTANT
  };

  columns = [
    {
      header: 'Vendor Id',
      field: 'id',
      sortable: true,
    },
    {
      header: 'Business Name',
      field: 'legalName',
      sortable: true,
    },
    {
      header: 'Email',
      field: 'email',
      sortable: true,
    },
    {
      header: 'Rejected On',
      field: 'rejectedAt',
      sortable: true,
      formatter: (row: any) =>
        new Date(row.rejectedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
    {
      header: 'Rejected By',
      field: 'rejectedBy',
      sortable: true,
      formatter: (row: any) => row.approvedBy ?? '-',
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
      id: 'review',
      label: 'Review',
      icon: 'pi pi-eye',
    },
    {
      id: 'reinvite',
      label: 'Reinvite',
      icon: 'pi pi-refresh',
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: 'pi pi-ban',
    },
  ];

  constructor(
    private vendorService: VendorService,
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.fetchRejected();
  }

  onAction($event: { actionId: string; row: any }) {
    const v = $event.row;

    switch ($event.actionId) {
      case 'review':
        this.reviewVendor(v);
        break;

      case 'revalidate':
        this.openAction(v); // or whatever fits your flow
        break;

      case 'suspend':
        this.openAction(v); // or create 'Suspend' if you have it
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

  fetchRejected(): void {
    this.loading = true;

    setTimeout(() => {
      // small delay to simulate loading state
      const data = JSON.parse(localStorage.getItem('vendors') || '[]');

      this.vendors = data.filter((v: any) => v.status === 'Rejected');

      this.loading = false;
    }, 300);
  }

  reviewVendor(v: any): void {
    // Route to your vendor review/details component
    // Change the route to match your app routing
    this.router.navigate(['admin/procurement/vendor-management', v.id, 'review']);
  }

  openAction($event: { actionId: string; row: any }): void {
    const v = $event.row;

    switch ($event.actionId) {
      case 'review':
        this.reviewVendor(v);
        break;
      case 'reinvite':
        this.confirmAllowResubmit(v, 'Reinvite');
        break;

      case 'archive':
        this.confirmArchive(v, 'Archive'); // or whatever fits your flow
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

  private confirmAllowResubmit(v: any, p0: string): void {
    this.confirmationService.confirm({
      header: 'Allow Resubmission',
      message: `Allow ${v.legalName ?? 'this vendor'} to edit and resubmit their registration?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, Allow',
      rejectLabel: 'Cancel',
      accept: () => this.allowResubmit(v),
    });
  }

  private allowResubmit(v: any): void {
    this.loading = true;
  }

  private confirmArchive(v: any, p0: string): void {
    this.confirmationService.confirm({
      header: 'Archive Vendor',
      message: `Archive ${v.legalName ?? 'this vendor'}? They will be hidden from active lists.`,
      icon: 'pi pi-trash',
      acceptLabel: 'Archive',
      rejectLabel: 'Cancel',
      accept: () => this.archiveVendor(v),
    });
  }

  private archiveVendor(v: any): void {
    this.loading = true;
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

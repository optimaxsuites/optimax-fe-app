import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { VendorApprovalService } from '../../../service/vendor/vendor-approval.service';
import { VendorDto, VendorStatus } from '../../../domain/vendor.dto';
import { Router } from '@angular/router';

@Component({
  templateUrl: './vendor-approval.component.html',
})
export class VendorApprovalComponent implements OnInit {
  loading = false;
  vendors: VendorDto[] = [];

  actionDialog = false;
  selected?: VendorDto;
  action: 'Approve' | 'Reject' | 'RequestChanges' = 'Approve';
  reason = '';
  selectedVendor: any;
  displayVendorDialog: boolean = false;

  columns = [
    { header: 'Vendor Id', field: 'id', sortable: true },

    {
      header: 'Business Name',
      field: 'legalName',
      sortable: true,
      // Optional: show vendorCode under the name (text version)
      formatter: (row: any) =>
        row.vendorCode
          ? `${row.legalName} (#${row.vendorCode})`
          : row.legalName,
    },

    {
      header: 'Registration Token',
      field: 'registrationToken',
      sortable: true,
    },
    { header: 'Email', field: 'email', sortable: true },

    {
      header: 'Submitted On',
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
      field: 'status',
      sortable: true,
      formatter: (row: any) => row.status ?? '—',
      badgeClass: (row: any) =>
        'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center ' +
        this.statusBadgeClass(row.status),
    },

    {
      header: 'AI status',
      field: 'aiStatus',
      sortable: true,
      formatter: (row: any) => row.aiStatus ?? '—',
      badgeClass: (row: any) =>
        'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center ' +
        this.statusBadgeClass(row.aiStatus),
    },
  ];

  actions = [
    { id: 'review', label: 'Review', icon: 'pi pi-eye' },
    {
      id: 'approve',
      label: 'Approve',
      icon: 'pi pi-check',
      className: 'success',
    },
    { id: 'reject', label: 'Reject', icon: 'pi pi-times', className: 'danger' },
    {
      id: 'requestChanges',
      label: 'Request Changes',
      icon: 'pi pi-send',
      className: 'warning',
    },
  ];

  constructor(
    private approval: VendorApprovalService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.fetch();
  }

  onAction(ev: { actionId: string; row: any }) {
    const v = ev.row;

    switch (ev.actionId) {
      case 'review':
        this.reviewVendor(v);
        break;

      case 'approve':
        this.approveVendor(v);
        break;

      case 'reject':
        this.rejectVendor(v);
        break;

      case 'requestChanges':
        this.openAction(v, 'RequestChanges');
        break;

      default:
        console.warn('Unknown action:', ev);
        break;
    }
  }

  fetch() {
    this.loading = true;

    setTimeout(() => {
      // small delay to simulate loading state
      const data = JSON.parse(localStorage.getItem('vendors') || '[]');

      this.vendors = data.filter(
        (v: any) => v.status === 'Submitted' || v.status === 'UnderReview',
      );

      this.loading = false;
    }, 300);
  }

  openAction(v: any, action: 'Approve' | 'Reject' | 'RequestChanges') {
    this.selected = v;
    this.action = action;
    this.reason = '';
    this.actionDialog = true;
  }

  // approveVendor(v: VendorDto): void {
  //   const key = 'vendors';

  //   const vendors: VendorDto[] = JSON.parse(localStorage.getItem(key) ?? '[]');

  //   const updated = vendors.map((x) => {
  //     if (x.id === v.id) {
  //       return {
  //         ...x,
  //         status: VendorStatus.Approved,
  //       };
  //     }

  //     // 🔥 Auto sync: if AI becomes approved, force status approved
  //     if (
  //       (x as any).aiStatus === 'AIApproved' &&
  //       x.status !== VendorStatus.Approved
  //     ) {
  //       return {
  //         ...x,
  //         status: VendorStatus.Approved,
  //       };
  //     }

  //     return x;
  //   });

  //   localStorage.setItem(key, JSON.stringify(updated));

  //   // refresh UI
  //   // this.vendors = [...updated];
  // }
  approveVendor(v: VendorDto): void {
    const key = 'vendors';

    const vendors: VendorDto[] = JSON.parse(localStorage.getItem(key) ?? '[]');
    const now = new Date().toISOString();

    const updated = vendors.map((x) => {
      if (x.id === v.id) {
        return {
          ...x,
          status: VendorStatus.Approved,
          approvedAt: now,
          approvedBy: 'Admin', // replace with real user later
        };
      }

      // Auto sync: AIApproved → Approved
      if (x.aiStatus === 'AIApproved' && x.status !== VendorStatus.Approved) {
        return {
          ...x,
          status: VendorStatus.Approved,
          approvedAt: now,
          approvedBy: 'System',
        };
      }

      return x;
    });

    localStorage.setItem(key, JSON.stringify(updated));

    // ✅ fetch back and show only UnderReview
    this.vendors = this.getVendorsFromStorage().filter(
      (x) => x.status === VendorStatus.UnderReview,
    );

    // ✅ if using OnPush change detection
    this.cdr?.markForCheck?.();
  }

  private getVendorsFromStorage(): VendorDto[] {
    return JSON.parse(localStorage.getItem('vendors') ?? '[]');
  }

  rejectVendor(v: VendorDto): void {
    const key = 'vendors';

    const vendors: VendorDto[] = JSON.parse(localStorage.getItem(key) ?? '[]');
    const now = new Date().toISOString();

    const updated = vendors.map((x) => {
      if (x.id === v.id) {
        return {
          ...x,
          status: VendorStatus.Rejected,
          rejectedAt: now,
          rejectedBy: 'Admin', // replace with real user later
        };
      }

      // Auto sync: AIApproved → Approved
      if (x.aiStatus === 'AIApproved' && x.status !== VendorStatus.Approved) {
        return {
          ...x,
          status: VendorStatus.AiFlagged,
          rejectedAt: now,
          rejectedBy: 'System',
        };
      }

      return x;
    });

    localStorage.setItem(key, JSON.stringify(updated));

    // ✅ fetch back and show only UnderReview
    this.vendors = this.getVendorsFromStorage().filter(
      (x) => x.status === VendorStatus.UnderReview,
    );

    // ✅ if using OnPush change detection
    this.cdr?.markForCheck?.();
  }

  submitAction() {
    const vendorId = this.selected?.id;
    if (!vendorId) return; // or show toast: "Select a vendor first"

    this.approval
      .actOnVendor({
        vendorId,
        action: this.action,
        reason: this.reason?.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.actionDialog = false;
          this.fetch();
        },
      });
  }

  reviewVendor(v: any): void {
    this.router.navigate([
      '/admin/procurement/vendor-management',
      v.id,
      'review',
    ]);

    //   this.selectedVendor = v;
    // this.displayVendorDialog = true;
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

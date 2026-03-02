import { Component, OnInit } from '@angular/core';
import { VendorService } from '../../../service/vendor/vendor.service';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';



type VendorAction = 'Reinvite' | 'Archive';

@Component({
  selector: 'app-rejected-vendor',
  templateUrl: './rejected-vendor.component.html',
  styleUrl: './rejected-vendor.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class RejectedVendorComponent implements OnInit {
vendors: any[] = [];
  loading = false;
  total = 0;

  // Keep query consistent with your other lists
  query: any = {
    page: 1,
    pageSize: 10,
    search: null,
    status: 'Rejected', // IMPORTANT
  };

  constructor(
    private vendorService: VendorService,
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.fetchRejected();
  }

  fetchRejected(): void {
    this.loading = true;

    // Force this screen to only load rejected vendors
    this.query.status = 'Rejected';

    this.vendorService.getVendors(this.query).subscribe({
      next: (res: any) => {
        this.vendors = res?.items ?? [];
        this.total = res?.total ?? this.vendors.length;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load rejected vendors.',
        });
      },
    });
  }

  reviewVendor(v: any): void {
    // Route to your vendor review/details component
    // Change the route to match your app routing
    this.router.navigate(['/procurement/vendor-management', v.id, 'review']);
  }

  openAction(v: any, action: VendorAction): void {
    switch (action) {
      case 'Reinvite':
        this.confirmAllowResubmit(v);
        break;

      case 'Archive':
        this.confirmArchive(v);
        break;

      default:
        return;
    }
  }

  private confirmAllowResubmit(v: any): void {
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

    // ✅ Backend should:
    // - Set VendorStatus = RegistrationInProgress (or InProgress)
    // - Clear RejectionReason/RejectedAt
    // - Optionally notify vendor by email
    // this.vendorService.allowVendorResubmit(v.id).subscribe({
    //   next: () => {
    //     this.messageService.add({
    //       severity: 'success',
    //       summary: 'Success',
    //       detail: 'Vendor can now resubmit registration.',
    //     });
    //     this.fetchRejected(); // refresh list
    //   },
    //   error: () => {
    //     this.loading = false;
    //     this.messageService.add({
    //       severity: 'error',
    //       summary: 'Error',
    //       detail: 'Failed to allow vendor resubmission.',
    //     });
    //   },
    // });
  }

  private confirmArchive(v: any): void {
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

    // ✅ Backend should soft-delete / archive
    // this.vendorService.archiveVendor(v.id).subscribe({
    //   next: () => {
    //     this.messageService.add({
    //       severity: 'success',
    //       summary: 'Archived',
    //       detail: 'Vendor archived successfully.',
    //     });
    //     this.fetchRejected();
    //   },
    //   error: () => {
    //     this.loading = false;
    //     this.messageService.add({
    //       severity: 'error',
    //       summary: 'Error',
    //       detail: 'Failed to archive vendor.',
    //     });
    //   },
    // });
  }

  // (Optional) if you add pagination later with p-paginator
  // onPageChange(e: any): void {
  //   this.query.page = (e.page ?? 0) + 1;
  //   this.query.pageSize = e.rows ?? this.query.pageSize;
  //   this.fetchRejected();
  // }
}

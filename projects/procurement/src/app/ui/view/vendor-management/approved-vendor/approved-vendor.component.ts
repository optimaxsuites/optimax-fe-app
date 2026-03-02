import { Component } from '@angular/core';
import { VendorService } from '../../../service/vendor/vendor.service';
import { Router } from '@angular/router';
import { VendorDto } from '../../../domain/vendor.dto';

@Component({
  selector: 'app-approved-vendor',
  templateUrl: './approved-vendor.component.html',
  styleUrl: './approved-vendor.component.scss'
})
export class ApprovedVendorComponent {
 vendors: any[] = [];
  total = 0;
  loading = false;

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
  actionDialogVisible = false;
  actionComment = '';

  constructor(
    private vendorService: VendorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetch();
  }

  fetch(): void {
    this.loading = true;

    // ✅ always enforce Approved filter
    this.query.status = 'Approved';

    this.vendorService.getVendors(this.query).subscribe({
      next: (res: any) => {
        this.vendors = res?.items ?? [];
        this.total = res?.total ?? this.vendors.length;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  // used by your "View" button (same handler name as pending table for consistency)
  reviewVendor(v: any): void {
    // Navigate to your vendor detail page (adjust route to match your app)
    this.router.navigate(['/procurement/vendor-management', v.id, 'review']);
  }

  openAction(v: any): void {
    this.selectedVendor = v;
    // this.currentAction = action;

    // If you already have a shared modal flow, hook into it here
    // For now we'll open a generic dialog that can take comment/reason.
    this.actionComment = '';
    this.actionDialogVisible = true;
  }

  // call this from your dialog "Confirm" button
  // confirmAction(): void {
  //   if (!this.selectedVendor) return;

  //   const vendorId = this.selectedVendor.id;

  //   this.loading = true;
  //   this.actionDialogVisible = false;

  //   // Choose API call based on action
  //   const req$ =
  //     this.currentAction === 'Suspend'
  //       ? this.vendorService.suspendVendor(vendorId, { reason: this.actionComment })
  //       : this.vendorService.revalidateVendor(vendorId);

  //   req$.subscribe({
  //     next: () => {
  //       this.loading = false;
  //       this.selectedVendor = null;
  //       this.currentAction = null;
  //       this.fetch(); // refresh list
  //     },
  //     error: () => {
  //       this.loading = false;
  //     },
  //   });
  // }

  // optional helper if you add pagination controls later
  onPageChange(event: any): void {
    // PrimeNG paginator emits { first, rows, page, pageCount }
    this.query.page = (event.page ?? 0) + 1;
    this.query.pageSize = event.rows ?? this.query.pageSize;
    this.fetch();
  }
}

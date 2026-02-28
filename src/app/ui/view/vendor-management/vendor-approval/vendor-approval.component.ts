import { Component, OnInit } from '@angular/core';
import { VendorApprovalService } from '../../../service/vendor/vendor-approval.service';
import { VendorDto } from '../../../domain/vendor.dto';
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

  constructor(private approval: VendorApprovalService, private router: Router) { }

  ngOnInit(): void {
    this.fetch();
  }

  fetch() {
    this.loading = true;

    setTimeout(() => {   // small delay to simulate loading state
      const data = JSON.parse(localStorage.getItem('vendors') || '[]');

      this.vendors = data.filter((v: any) =>
        v.status === 'Submitted' ||
        v.status === 'UnderReview'
      );

      this.loading = false;
    }, 300);
  }

  openAction(v: VendorDto, action: 'Approve' | 'Reject' | 'RequestChanges') {
    this.selected = v;
    this.action = action;
    this.reason = '';
    this.actionDialog = true;
  }

  // submitAction() {
  //   if (!this.selected) return;

  //   this.approval
  //     .actOnVendor({
  //       vendorId: this.selected.id,
  //       action: this.action,
  //       reason: this.reason?.trim() || undefined,
  //     })
  //     .subscribe({
  //       next: () => {
  //         this.actionDialog = false;
  //         this.fetch();
  //       },
  //     });
  // }

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

  reviewVendor(v: any) {
    this.router.navigate(['/procurement/vendor-management', v.id, 'review']);

    //   this.selectedVendor = v;
    // this.displayVendorDialog = true;

  }
}

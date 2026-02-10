import { Component, OnInit } from '@angular/core';
import { VendorApprovalService } from '../../../service/vendor/vendor-approval.service';
import { VendorDto } from '../../../domain/vendor.dto';

@Component({
  templateUrl: './vendor-approval.component.html',
})
export class VendorApprovalComponent implements OnInit {
  loading = false;
  vendors: VendorDto[] = [];

  actionDialog = false;
  selected?: VendorDto;
  action: 'Approve' | 'Reject' | 'RequestMoreInfo' = 'Approve';
  reason = '';

  constructor(private approval: VendorApprovalService) {}

  ngOnInit(): void {
    this.fetch();
  }

  fetch() {
    this.loading = true;
    this.approval.getPendingVendors().subscribe({
      next: (v) => {
        this.vendors = v;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  openAction(v: VendorDto, action: 'Approve' | 'Reject' | 'RequestMoreInfo') {
    this.selected = v;
    this.action = action;
    this.reason = '';
    this.actionDialog = true;
  }

  submitAction() {
    if (!this.selected) return;

    this.approval
      .actOnVendor({
        vendorId: this.selected.id,
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
}

import { Component, Input } from '@angular/core';
import { VendorStatus } from '../../../domain/vendor.dto';

@Component({
  selector: 'app-vendor-status-badge',
  templateUrl: './vendor-status-badge.component.html',
})
export class VendorStatusBadgeComponent {
  @Input() status: VendorStatus | string = VendorStatus.Pending;

  get cls(): string {
    const s = String(this.status);
    if (s === VendorStatus.Approved) return 'bg-green-50 text-green-700 ring-green-200';
    if (s === VendorStatus.Rejected) return 'bg-red-50 text-red-700 ring-red-200';
    if (s === VendorStatus.Inactive) return 'bg-slate-50 text-slate-600 ring-slate-200';
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }

  get label(): string {
    return String(this.status);
  }
}

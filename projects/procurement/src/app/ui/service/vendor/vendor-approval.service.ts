import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
// import { VendorApprovalActionDto, VendorDto } from '../../domain/vendor.dto';
import { VendorLocalDbService } from './vendor-local-db.service';

@Injectable({ providedIn: 'root' })
export class VendorApprovalService {
  private tenantId = 'TENANT_DEMO';

  constructor(private db: VendorLocalDbService) {}

  // getPendingVendors(): Observable<VendorDto[]> {
  //   return this.db.getPendingVendors(this.tenantId);
  // }

  // actOnVendor(action: VendorApprovalActionDto): Observable<void> {
  //   return this.db.actOnVendor(this.tenantId, action);
  // }
}

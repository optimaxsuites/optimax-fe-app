import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  PagedResult,
  VendorDto,
  VendorListQuery,
} from '../../domain/vendor.dto';
import { VendorLocalDbService } from './vendor-local-db.service';

@Injectable({ providedIn: 'root' })
export class VendorService {
  // For now: hardcoded tenant. Later: resolve from auth/tenant context.
  private tenantId = 'TENANT_DEMO';

  constructor(private db: VendorLocalDbService) {}

  getVendors(query: VendorListQuery): Observable<PagedResult<VendorDto>> {
    return this.db.listVendors(this.tenantId, query);
  }

  getVendorById(id: string): Observable<VendorDto> {
    return this.db.getVendorById(this.tenantId, id);
  }

  setVendorInactive(id: string): Observable<void> {
    return this.db.setVendorInactive(this.tenantId, id);
  }

  getApprovedVendorsForSelection(categoryId?: string): Observable<VendorDto[]> {
    return this.db.getApprovedVendorsForSelection(this.tenantId, categoryId);
  }
}

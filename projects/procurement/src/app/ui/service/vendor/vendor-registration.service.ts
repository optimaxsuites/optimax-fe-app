import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  VendorDto,
  // VendorRegistrationResponseDto,
} from '../../domain/vendor.dto';
import { VendorLocalDbService } from './vendor-local-db.service';

@Injectable({ providedIn: 'root' })
export class VendorRegistrationService {
  constructor(private db: VendorLocalDbService) {}

  // registerVendor(
  //   payload: VendorDto,
  // ): Observable<VendorRegistrationResponseDto> {
  //   return this.db.registerVendor(payload);
  // }

  // getRegistrationContext(
  //   token: string,
  // ): Observable<{ tenantName: string; tenantId: string }> {
  //   return this.db.getRegistrationContext(token);
  // }
}

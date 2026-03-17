import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  UploadComplianceDocumentRequestDto,
  VendorComplianceDocumentDto,
} from '../../domain/vendor.compliance.dto';
import { VendorLocalDbService } from './vendor-local-db.service';

@Injectable({ providedIn: 'root' })
export class VendorComplianceService {
  private tenantId = 'TENANT_DEMO';

  constructor(private db: VendorLocalDbService) {}

  // getVendorDocuments(
  //   vendorId: string,
  // ): Observable<VendorComplianceDocumentDto[]> {
  //   return this.db.getVendorDocuments(this.tenantId, vendorId);
  // }

  // uploadDocument(
  //   req: UploadComplianceDocumentRequestDto,
  // ): Observable<VendorComplianceDocumentDto> {
  //   return this.db.uploadDocument(this.tenantId, req);
  // }

  // approveDocument(documentId: string, reviewerNote?: string): Observable<void> {
  //   return this.db.approveDocument(this.tenantId, documentId, reviewerNote);
  // }

  // rejectDocument(documentId: string, reviewerNote: string): Observable<void> {
  //   return this.db.rejectDocument(this.tenantId, documentId, reviewerNote);
  // }
}

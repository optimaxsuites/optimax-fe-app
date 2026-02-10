import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { VendorService } from '../../../service/vendor/vendor.service';
import { VendorComplianceService } from '../../../service/vendor/vendor-compliance.service';
import { VendorDto } from '../../../domain/vendor.dto';
import { VendorComplianceDocumentDto } from '../../../domain/vendor.compliance.dto';

@Component({
  templateUrl: './vendor-details.component.html',
})
export class VendorDetailsComponent implements OnInit {
  loading = false;
  vendor?: VendorDto;

  docsLoading = false;
  documents: VendorComplianceDocumentDto[] = [];

  constructor(
    private route: ActivatedRoute,
    private vendorService: VendorService,
    private complianceService: VendorComplianceService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadVendor(id);
    this.loadDocs(id);
  }

  loadVendor(id: string) {
    this.loading = true;
    this.vendorService.getVendorById(id).subscribe({
      next: (v) => {
        this.vendor = v;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  loadDocs(vendorId: string) {
    this.docsLoading = true;
    this.complianceService.getVendorDocuments(vendorId).subscribe({
      next: (docs) => {
        this.documents = docs;
        this.docsLoading = false;
      },
      error: () => (this.docsLoading = false),
    });
  }

  uploadDoc(evt: {
    documentType: string;
    issuedDate?: string;
    expiryDate?: string;
    file: File;
  }) {
    if (!this.vendor) return;

    this.complianceService
      .uploadDocument({
        vendorId: this.vendor.id,
        documentType: evt.documentType,
        issuedDate: evt.issuedDate,
        expiryDate: evt.expiryDate,
        file: evt.file,
      })
      .subscribe({
        next: () => this.loadDocs(this.vendor!.id),
      });
  }

  approveDoc(docId: string) {
    this.complianceService.approveDocument(docId).subscribe({
      next: () => this.loadDocs(this.vendor!.id),
    });
  }

  rejectDoc(docId: string) {
    this.complianceService
      .rejectDocument(docId, 'Document rejected')
      .subscribe({
        next: () => this.loadDocs(this.vendor!.id),
      });
  }
}

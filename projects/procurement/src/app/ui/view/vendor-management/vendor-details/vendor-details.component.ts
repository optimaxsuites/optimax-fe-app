import { Component, input, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { VendorService } from '../../../service/vendor/vendor.service';
import { VendorComplianceService } from '../../../service/vendor/vendor-compliance.service';
import { VendorDto } from '../../../domain/vendor.dto';
import { VendorComplianceDocumentDto } from '../../../domain/vendor.compliance.dto';

@Component({
  selector: 'app-vendor-details',
  templateUrl: './vendor-details.component.html',
})
export class VendorDetailsComponent implements OnInit {
  @Input() vendor!: any;
approveVendor() {
throw new Error('Method not implemented.');
}
requestChanges() {
throw new Error('Method not implemented.');
}
rejectVendor() {
throw new Error('Method not implemented.');
}
  loading = false;
  // vendor?: any;

  // @Input() vendor: any; 

  docsLoading = false;
  documents: VendorComplianceDocumentDto[] = [];

  constructor(
    private route: ActivatedRoute,
    private vendorService: VendorService,
    private complianceService: VendorComplianceService,
  ) {}

ngOnInit(): void {
  const id = this.route.snapshot.paramMap.get('id');

  if (!id) {
    console.error('Vendor ID not provided.');
    return;
  }

  this.loadVendor(id);
  this.loadDocs(id);
}

loadVendor(id: string) {
  this.loading = true;

  try {
    const data = JSON.parse(localStorage.getItem('vendors') || '[]');

    const vendor = data.find((v: any) => v.id === id);

    if (!vendor) {
      console.error('Vendor not found.');
      this.loading = false;
      return;
    }

    this.vendor = vendor;
  } catch (err) {
    console.error('Error loading vendor from localStorage:', err);
  }

  this.loading = false;
}

loadDocs(id: string) {
  const data = JSON.parse(localStorage.getItem('vendors') || '[]');
  const vendor = data.find((v: any) => v.id === id);

  this.documents = vendor?.documents || [];
}

  uploadDoc(evt: {
    documentType: string;
    issuedDate?: string;
    expiryDate?: string;
    file: File;
  }) {
    const vendorId = this.vendor?.id;
  if (!vendorId) return;

    this.complianceService
      .uploadDocument({
        vendorId,
        documentType: evt.documentType,
        issuedDate: evt.issuedDate,
        expiryDate: evt.expiryDate,
        file: evt.file,
      })
      .subscribe({
        next: () => this.loadDocs(vendorId),
      });
  }

approveDoc(docId: string) {
  const vendorId = this.vendor?.id;
  if (!vendorId) return;

  this.complianceService.approveDocument(docId).subscribe({
    next: () => this.loadDocs(vendorId),
  });
}

rejectDoc(docId: string) {
  const vendorId = this.vendor?.id;
  if (!vendorId) return;

  this.complianceService.rejectDocument(docId, 'Document rejected').subscribe({
    next: () => this.loadDocs(vendorId),
  });
}
}

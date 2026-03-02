import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-compliance-document-upload',
  templateUrl: './compliance-document-upload.component.html',
})
export class ComplianceDocumentUploadComponent {
  @Input() documentTypes: string[] = ['CAC', 'TIN', 'VAT', 'NDA', 'Other'];
  @Output() upload = new EventEmitter<{
    documentType: string;
    issuedDate?: string;
    expiryDate?: string;
    file: File;
  }>();

  documentType = 'CAC';
  issuedDate?: string;
  expiryDate?: string;
  file?: File;

  onSelect(event: any) {
    const f: File | undefined = event?.files?.[0];
    this.file = f;
  }

  submit() {
    if (!this.file) return;
    this.upload.emit({
      documentType: this.documentType,
      issuedDate: this.issuedDate,
      expiryDate: this.expiryDate,
      file: this.file,
    });
    this.file = undefined;
  }
}

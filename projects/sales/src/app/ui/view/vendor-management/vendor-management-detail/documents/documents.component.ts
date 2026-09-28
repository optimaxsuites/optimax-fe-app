// documents.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import {
  VendorDocument,
  DocumentCategory,
  DocumentStatus,
  getDocumentStatusColor
} from '../../../../domain/vendor-management/vendor-management.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-vendor-documents',
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss']
})
export class VendorDocumentsComponent implements OnChanges {

  // ============================================================
  // INPUTS
  // ============================================================

  /** The list of vendor documents */
  @Input() documents: VendorDocument[] = [];

  /** The vendor ID for upload operations */
  @Input() vendorId: string = '';

  /** Whether the component is in a loading state */
  @Input() isLoading: boolean = false;

  /** Real upload state, driven by the parent's HTTP call — not simulated here. */
  @Input() isUploadingDocument: boolean = false;
  @Input() uploadProgress: number = 0;
  @Input() uploadServerError: string | null = null;

  /**
   * Whether the current viewer may upload, delete or verify documents here. A vendor's documents
   * come from the vendor themself via the Vendor Portal — customers viewing Vendor Management get
   * a read-only view of them, never a way to add to or change a vendor's own document record.
   */
  @Input() canManage: boolean = true;

  // ============================================================
  // OUTPUTS
  // ============================================================

  /** Emits when a document should be uploaded */
  @Output() uploadDocument = new EventEmitter<{ file: File; category: DocumentCategory; issueDate: Date; expiryDate: Date }>();

  /** Emits when a document should be deleted */
  @Output() deleteDocument = new EventEmitter<string>();

  /** Emits when a document should be verified */
  @Output() verifyDocument = new EventEmitter<{ documentId: string; verified: boolean; notes?: string }>();

  /** Emits when the user wants to refresh the document list */
  @Output() refresh = new EventEmitter<void>();

  // ============================================================
  // VIEW CHILDREN
  // ============================================================

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // ============================================================
  // STATE
  // ============================================================

  /** Show the upload modal */
  showUploadModal: boolean = false;

  /** Selected file for upload */
  selectedFile: File | null = null;

  /** Selected category for the file */
  selectedCategory: DocumentCategory = DocumentCategory.REGISTRATION;

  /** Issue date for the document */
  issueDate: string = new Date().toISOString().split('T')[0];

  /** Expiry date for the document (default 1 year from now) */
  expiryDate: string = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

  /** Client-side validation error (checked before the upload is even started) */
  uploadError: string | null = null;

  /** Selected document for verification */
  selectedDocForVerification: VendorDocument | null = null;

  /** Show verify modal */
  showVerifyModal: boolean = false;

  /** Verification notes */
  verificationNotes: string = '';

  /** Verify modal error message */
  verifyError: string | null = null;

  /** Selected document for viewing */
  selectedDocumentForView: VendorDocument | null = null;

  /** Show document viewer modal */
  showDocumentViewer: boolean = false;

  /** Document viewer zoom level */
  viewerZoom: number = 1;

  /** Document viewer page number */
  viewerPage: number = 1;

  /** Total pages (mock) */
  viewerTotalPages: number = 3;

  // ============================================================
  // ENUMS FOR TEMPLATE
  // ============================================================

  DocumentCategory = DocumentCategory;
  DocumentStatus = DocumentStatus;

  // ============================================================
  // LIFECYCLE
  // ============================================================

  /**
   * The parent owns the actual upload call; when isUploadingDocument flips back to false, the
   * upload finished one way or another. On success (no server error) the modal closes itself —
   * on failure it stays open with the error already visible via displayedUploadError.
   */
  ngOnChanges(changes: SimpleChanges): void {
    const uploadFinished = changes['isUploadingDocument'] &&
      changes['isUploadingDocument'].previousValue === true &&
      changes['isUploadingDocument'].currentValue === false;

    if (uploadFinished && !this.uploadServerError) {
      this.closeUploadModal();
    }
  }

  // ============================================================
  // COMPUTED PROPERTIES
  // ============================================================

  /** Whichever upload error applies right now — a client-side validation issue, or one from the server. */
  get displayedUploadError(): string | null {
    return this.uploadError || this.uploadServerError;
  }

  /** Available document categories for upload */
  get documentCategories(): { value: DocumentCategory; label: string; required: boolean }[] {
    return [
      { value: DocumentCategory.REGISTRATION, label: 'Business Registration', required: true },
      { value: DocumentCategory.TAX, label: 'Tax Certificate', required: true },
      { value: DocumentCategory.LICENCE, label: 'Business Licence', required: true },
      { value: DocumentCategory.INSURANCE, label: 'Insurance', required: false },
      { value: DocumentCategory.CERTIFICATION, label: 'Certification', required: false }
    ];
  }

  /** Documents grouped by category */
  get documentsByCategory(): Map<DocumentCategory, VendorDocument[]> {
    const map = new Map<DocumentCategory, VendorDocument[]>();
    this.documentCategories.forEach(cat => {
      const docs = this.documents.filter(d => d.category === cat.value);
      if (docs.length > 0) {
        map.set(cat.value, docs);
      }
    });
    return map;
  }

  /** Documents that are expiring soon (within 30 days) */
  get expiringDocuments(): VendorDocument[] {
    return this.documents.filter(d => 
      d.status === DocumentStatus.EXPIRING_SOON
    );
  }

  /** Documents that are expired */
  get expiredDocuments(): VendorDocument[] {
    return this.documents.filter(d => 
      d.status === DocumentStatus.EXPIRED
    );
  }

  /** Documents that are active */
  get activeDocuments(): VendorDocument[] {
    return this.documents.filter(d => 
      d.status === DocumentStatus.ACTIVE
    );
  }

  /** Documents pending verification */
  get pendingDocuments(): VendorDocument[] {
    return this.documents.filter(d => 
      d.status === DocumentStatus.PENDING_VERIFICATION
    );
  }

  /** Documents that are rejected */
  get rejectedDocuments(): VendorDocument[] {
    return this.documents.filter(d => 
      d.status === DocumentStatus.REJECTED
    );
  }

  /** Total document count */
  get totalDocuments(): number {
    return this.documents.length;
  }

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  getDocumentStatusColor(status: DocumentStatus): string {
    return getDocumentStatusColor(status);
  }

  getDocumentStatusLabel(status: DocumentStatus): string {
    const map: Record<DocumentStatus, string> = {
      [DocumentStatus.ACTIVE]: 'Active',
      [DocumentStatus.EXPIRING_SOON]: 'Expiring Soon',
      [DocumentStatus.EXPIRED]: 'Expired',
      [DocumentStatus.PENDING_VERIFICATION]: 'Pending Verification',
      [DocumentStatus.REJECTED]: 'Rejected'
    };
    return map[status] || status;
  }

  // FIXED: Handle null/undefined category
  getCategoryLabel(category: DocumentCategory | string): string {
    if (!category) return 'Unknown';
    const found = this.documentCategories.find(c => c.value === category);
    return found ? found.label : String(category);
  }

  isRequiredDocument(category: DocumentCategory): boolean {
    const found = this.documentCategories.find(c => c.value === category);
    return found ? found.required : false;
  }

  // FIXED: Handle null/undefined date
  formatDate(date: Date | string | null | undefined): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  // FIXED: Added formatDateTime method
  formatDateTime(date: Date | string | null | undefined): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getDaysUntilExpiry(date: Date | string | null | undefined): number {
    if (!date) return 0;
    const now = new Date();
    const expiry = new Date(date);
    if (isNaN(expiry.getTime())) return 0;
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getFileSize(size: number): string {
    if (!size || size === 0) return '0 B';
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getDocumentIcon(fileName: string): string {
    if (!fileName) return 'fa-file';
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'fa-file-pdf';
      case 'doc':
      case 'docx': return 'fa-file-word';
      case 'xls':
      case 'xlsx': return 'fa-file-excel';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'fa-file-image';
      default: return 'fa-file';
    }
  }

  // ============================================================
  // FILE UPLOAD
  // ============================================================

  /** Open file picker */
  openFilePicker(): void {
    if (!this.canManage) return;
    this.fileInput?.nativeElement?.click();
  }

  /** Handle file selection */
  onFileSelected(event: Event): void {
    if (!this.canManage) return;
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.uploadError = `File "${file.name}" exceeds 10MB limit`;
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      this.uploadError = `File "${file.name}" has unsupported format. Please use PDF, JPEG, PNG, or DOC`;
      return;
    }

    this.selectedFile = file;
    this.uploadError = null;
    this.showUploadModal = true;
    // Reset input
    input.value = '';
  }

  /** Close upload modal — a no-op while a real upload is in flight; there's nothing to cancel it. */
  closeUploadModal(): void {
    if (this.isUploadingDocument) return;
    this.showUploadModal = false;
    this.selectedFile = null;
    this.uploadError = null;
  }

  /** Submit upload */
  submitUpload(): void {
    if (!this.canManage || !this.selectedFile) return;

    // A cleared date input leaves issueDate/expiryDate as ''. new Date('') is an Invalid
    // Date, and the service calls .toISOString() on it when building the request — an
    // uncaught RangeError that used to leave isUploading stuck true (spinner forever).
    const issue = new Date(this.issueDate);
    const expiry = new Date(this.expiryDate);
    if (!this.issueDate || !this.expiryDate || isNaN(issue.getTime()) || isNaN(expiry.getTime())) {
      this.uploadError = 'Please provide both an issue date and an expiry date.';
      return;
    }
    if (expiry.getTime() < issue.getTime()) {
      this.uploadError = 'Expiry date cannot be before the issue date.';
      return;
    }

    this.uploadError = null;
    // The parent owns the actual HTTP call and reports real progress back via isUploadingDocument/
    // uploadProgress — this component no longer simulates progress with a timer. It also reloads
    // the document list once the backend confirms the upload; emitting refresh here too would just
    // re-fetch the stale pre-upload list a moment before that real reload lands.
    this.uploadDocument.emit({
      file: this.selectedFile,
      category: this.selectedCategory,
      issueDate: issue,
      expiryDate: expiry
    });
  }

  /** Update selected category */
  onCategoryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedCategory = select.value as DocumentCategory;
  }

  // ============================================================
  // DOCUMENT ACTIONS
  // ============================================================

  /** Delete a document */
  onDeleteDocument(documentId: number): void {
    if (!this.canManage) return;
    if (confirm('Are you sure you want to delete this document?')) {
      this.deleteDocument.emit(String(documentId));
    }
  }

  /** Open verify modal - FIXED to accept null */
  openVerifyModal(document: VendorDocument | null): void {
    if (!this.canManage || !document) return;
    this.selectedDocForVerification = document;
    this.verificationNotes = '';
    this.verifyError = null;
    this.showVerifyModal = true;
  }

  /** Close verify modal */
  closeVerifyModal(): void {
    this.showVerifyModal = false;
    this.selectedDocForVerification = null;
    this.verificationNotes = '';
    this.verifyError = null;
  }

  /** Verification-notes are required when rejecting so the vendor knows what to fix. */
  get verifyNotesRequired(): boolean {
    return !this.verificationNotes.trim();
  }

  /** True when approving a document that has already expired. */
  get verifyingExpiredDocument(): boolean {
    if (!this.selectedDocForVerification?.expiryDate) return false;
    return this.getDaysUntilExpiry(this.selectedDocForVerification.expiryDate) < 0;
  }

  /** Submit verification */
  submitVerification(verified: boolean): void {
    if (!this.canManage || !this.selectedDocForVerification) return;

    if (!verified && this.verifyNotesRequired) {
      this.verifyError = 'Please explain why this document is being rejected.';
      return;
    }

    if (verified && this.verifyingExpiredDocument &&
      !confirm('This document has already expired. Approve it anyway?')) {
      return;
    }

    this.verifyDocument.emit({
      documentId: String(this.selectedDocForVerification.id),
      verified: verified,
      notes: this.verificationNotes || undefined
    });

    this.closeVerifyModal();
    // The parent reloads the document list once the backend confirms the verification
    // (see handleDocumentVerify); emitting refresh here too just re-fetched the
    // stale pre-verification list a moment before that real reload landed.
  }

  /** Download document - FIXED to accept null */
  downloadDocument(document: VendorDocument | null): void {
    if (!document?.fileUrl) return;
    window.open(document.fileUrl, '_blank');
  }

  // ============================================================
  // DOCUMENT VIEWER METHODS
  // ============================================================

  /** Open document viewer - FIXED to accept null */
  openDocumentViewer(document: VendorDocument | null): void {
    if (!document) return;
    this.selectedDocumentForView = document;
    this.showDocumentViewer = true;
    this.viewerPage = 1;
    this.viewerZoom = 1;
  }

  /** Close document viewer */
  closeDocumentViewer(): void {
    this.showDocumentViewer = false;
    this.selectedDocumentForView = null;
    this.viewerPage = 1;
    this.viewerZoom = 1;
  }

  /** Zoom in */
  zoomIn(): void {
    if (this.viewerZoom < 2.5) {
      this.viewerZoom += 0.25;
    }
  }

  /** Zoom out */
  zoomOut(): void {
    if (this.viewerZoom > 0.5) {
      this.viewerZoom -= 0.25;
    }
  }

  /** Reset zoom */
  resetZoom(): void {
    this.viewerZoom = 1;
  }

  /** Next page */
  nextPage(): void {
    if (this.viewerPage < this.viewerTotalPages) {
      this.viewerPage++;
    }
  }

  /** Previous page */
  prevPage(): void {
    if (this.viewerPage > 1) {
      this.viewerPage--;
    }
  }

  /** Get document icon based on file type - FIXED to accept null */
  getDocumentViewerIcon(document: VendorDocument | null): string {
    if (!document || !document.fileName) return 'fa-file';
    const ext = document.fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'fa-file-pdf';
      case 'doc':
      case 'docx': return 'fa-file-word';
      case 'xls':
      case 'xlsx': return 'fa-file-excel';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'fa-file-image';
      default: return 'fa-file';
    }
  }

  // ============================================================
  // TRACK BY FUNCTIONS
  // ============================================================

  trackByDocumentId(index: number, document: VendorDocument): number {
    return document.id;
  }

  trackByCategory(index: number, category: string): string {
    return category;
  }
}
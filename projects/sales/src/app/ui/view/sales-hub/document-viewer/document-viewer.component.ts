import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  ViewableDocument, documentObjectUrl, downloadDocument, isImageDocument
} from '../../../service/sales/document-file.util';

/**
 * Full-screen preview of an uploaded document (the customer's LPO, a signed delivery note) —
 * images shown directly, PDFs in the browser's viewer — with Download and Open in New Tab.
 */
@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-viewer.component.html',
  styleUrls: ['./document-viewer.component.scss']
})
export class DocumentViewerComponent implements OnChanges, OnDestroy {
  @Input() title = 'Document';
  @Input() document: ViewableDocument | null = null;
  @Output() closed = new EventEmitter<void>();

  safeUrl: SafeResourceUrl | null = null;
  private rawUrl: string | null = null;
  private revoke = false;

  constructor(private sanitizer: DomSanitizer) {}

  get isImage(): boolean {
    return isImageDocument(this.document);
  }

  ngOnChanges(): void {
    this.release();
    const target = this.document ? documentObjectUrl(this.document) : null;
    this.rawUrl = target?.url || null;
    this.revoke = !!target?.revoke;
    this.safeUrl = this.rawUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(this.rawUrl) : null;
  }

  ngOnDestroy(): void {
    this.release();
  }

  download(): void {
    if (this.document) downloadDocument(this.document);
  }

  openInNewTab(): void {
    if (this.rawUrl) window.open(this.rawUrl, '_blank', 'noopener');
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closed.emit();
  }

  private release(): void {
    if (this.rawUrl && this.revoke) URL.revokeObjectURL(this.rawUrl);
    this.rawUrl = null;
  }
}

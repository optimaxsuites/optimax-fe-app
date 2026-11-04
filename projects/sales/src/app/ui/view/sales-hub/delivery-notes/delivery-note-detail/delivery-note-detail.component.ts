import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { renderElementToPdf } from '../../../../service/sales/sales-document-email.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, of, takeUntil } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SalesService } from '../../../../service/sales/sales.service';
import { Customer, SalesDeliveryNote, SalesDeliveryNoteStatus, SalesLpo, MerchantInfo, QuoteDocumentAttachment } from '../../../../domain/sales/sales.dto';
import { DocumentViewerComponent } from '../../document-viewer/document-viewer.component';
import { ViewableDocument, downloadDocument, hasDocumentContent } from '../../../../service/sales/document-file.util';
import { formatApiDate, formatApiDateTime } from '../../../../service/sales/date.util';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';
import { DeliveryNoteDocumentComponent } from '../delivery-note-document/delivery-note-document.component';
import { QuoteTemplate, QUOTE_TEMPLATES } from '../../template-types/quote-templates.config';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';

/** A destructive or reason-requiring action waiting on the confirmation modal. */
interface PendingAction {
  title: string;
  message: string;
  confirmLabel: string;
  icon: string;
  danger?: boolean;
  /** When set, the modal asks for a reason (required) under this label. */
  reasonLabel?: string;
  run: (reason: string) => void;
}

@Component({
  selector: 'app-delivery-note-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageModule, DocumentViewerComponent, BackButtonComponent, DeliveryNoteDocumentComponent, ToastModule],
  providers: [MessageService],
  templateUrl: './delivery-note-detail.component.html',
  // Page chrome (header, action bar, sidebar cards) is shared with the Quote detail page rather
  // than copied a third time; delivery-note-specific bits live in the component's own sheet.
  styleUrls: ['../../quotations/quote-detail/quote-detail.component.scss', './delivery-note-detail.component.scss']
})
export class DeliveryNoteDetailComponent implements OnInit, OnDestroy {
  @Input() detailId?: string;
  @Output() closed = new EventEmitter<void>();
  @Output() edit = new EventEmitter<string>();

  note: SalesDeliveryNote | null = null;
  customers: Customer[] = [];
  merchantInfo: MerchantInfo | null = null;
  orderId: string | null = null;
  poNumber = '';
  attention = '';
  contactPerson = '';
  invoiceNumber = '';
  /** Date of Delivery saved from the wizard (SalesDeliveryNoteMeta.deliveryDate), if any. */
  deliveryDate = '';
  /** Template picked in the Generate Delivery Note wizard, if any (see SalesDeliveryNoteMeta.templateId). */
  template: QuoteTemplate | null = null;
  isLoading = true;
  isDownloading = false;
  isUpdatingStatus = false;
  /** The note's SalesLpo, if it has one. */
  lpo: SalesLpo | null = null;
  isUpdatingLpo = false;
  isDeleting = false;
  pendingAction: PendingAction | null = null;
  /** Whether the signed delivery note has been uploaded (the first step of Generate Invoice). */
  hasSignedCopy = false;
  /** The customer from the note's quote / order — the Customer card's fallback when the note has
   *  no recipient snapshot and the customer list doesn't have them. */
  private sourceCustomer: any = null;
  /** The LPO file the seller uploaded, kept on the quote until the backend stores it (see View LPO). */
  lpoFile: QuoteDocumentAttachment | null = null;
  showLpoViewer = false;
  /** Set once the note's quote has been looked for — "not uploaded" isn't said before then. */
  quoteChecked = false;
  private quoteRequestedFor: string | null = null;
  /** The logo uploaded for this delivery note, or its quote's (see SalesService.getDeliveryNoteLogo). */
  logo: string | null = null;
  actionReason = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService,
    private messageService: MessageService
  ) { }

  // Same navigation-staleness fix as the other detail pages in this module — subscribes to the
  // live paramMap instead of reading route.snapshot once, so navigating between two different
  // delivery notes' URLs actually reloads instead of reusing the previous one.
  /** A result carried over from the page that routed here, e.g. "Delivery note emailed to …". */
  flash: { severity: string; text: string } | null = (typeof history !== 'undefined' && history.state?.flash) || null;

  ngOnInit(): void {
    this.salesService.getCustomers({ page: 0, size: 200 }).pipe(takeUntil(this.destroy$)).subscribe(res => this.customers = res.data);
    this.salesService.getMyMerchantInfo().pipe(takeUntil(this.destroy$)).subscribe(merchant => this.merchantInfo = merchant);

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = this.detailId || params.get('id');
      if (id) {
        this.loadNote(id);
      } else {
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNote(id: string): void {
    this.isLoading = true;
    this.salesService.getDeliveryNoteById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (note) => {
        this.note = note;
        this.isLoading = false;
        if (note) this.loadContext(note);
      },
      error: (err) => {
        console.error('Error loading delivery note:', err);
        this.isLoading = false;
      }
    });
  }

  /** Fills the document fields from the note itself, the LPO number from its SalesLpo, and the
   *  order number / invoice number from its order. Notes generated before the backend had these
   *  columns fall back to the legacy values stored on the quote (SalesDeliveryNoteMeta). */
  private loadContext(note: SalesDeliveryNote): void {
    this.hasSignedCopy = !!(note.receivedAt || note.signedDocumentUrl);
    this.quoteChecked = false;
    this.quoteRequestedFor = null;
    if (note.quoteId != null) this.loadQuote(note, note.quoteId);
    this.attention = note.attention || '';
    this.contactPerson = note.contactPerson || '';
    this.deliveryDate = note.deliveryDate ? String(note.deliveryDate) : '';
    this.template = QUOTE_TEMPLATES.find(t => t.id === note.templateId) || null;

    const lpo$ = note.lpoId != null
      ? this.salesService.getSalesLpoById(note.lpoId)
      : note.quoteId != null ? this.salesService.getSalesLpoForQuote(note.quoteId) : of(null);
    lpo$.pipe(takeUntil(this.destroy$)).subscribe(lpo => {
      this.lpo = lpo;
      if (lpo?.lpoNumber) this.poNumber = lpo.lpoNumber;
      if (lpo?.quoteId != null) this.loadQuote(note, lpo.quoteId);
    });

    if (note.salesOrderId == null) {
      this.quoteChecked ||= note.quoteId == null && note.lpoId == null;
      return;
    }
    const transactionId = note.salesOrderId;
    this.salesService.getOrderIdLookup().pipe(takeUntil(this.destroy$)).subscribe(lookup => {
      this.orderId = lookup.byTransactionId.get(transactionId) || null;
    });
    this.salesService.getSalesandTransactionsById(transactionId).pipe(takeUntil(this.destroy$)).subscribe(tx => {
      if (!tx) {
        this.quoteChecked ||= this.quoteRequestedFor == null;
        return;
      }
      this.invoiceNumber = (tx.invoiceId as any)?.invoiceNumber || '';
      // Older notes have no quoteId of their own — find the quote (where the LPO file is kept)
      // through the order instead
      const txQuoteId = (tx.quoteId as any)?.id ?? (typeof tx.quoteId !== 'object' ? tx.quoteId : null);
      if (txQuoteId != null) {
        this.loadQuote(note, txQuoteId);
        if (note.lpoId == null && note.quoteId == null) {
          this.salesService.getSalesLpoForQuote(txQuoteId).pipe(takeUntil(this.destroy$)).subscribe(lpo => {
            this.lpo ||= lpo;
            if (lpo?.lpoNumber) this.poNumber ||= lpo.lpoNumber;
          });
        }
      } else {
        this.quoteChecked ||= this.quoteRequestedFor == null;
      }
      this.sourceCustomer ||= this.salesService.quoteCustomer(tx.quoteId) || (typeof tx.customerId === 'object' ? tx.customerId : null);
      this.lpoFile ||= this.salesService.getQuoteLpoDocument(tx.quoteId as any);
      if (this.salesService.hasSignedDeliveryNoteDocument(tx.quoteId as any)) this.hasSignedCopy = true;
      const meta = this.salesService.getDeliveryNoteMeta(tx.quoteId as any);
      this.poNumber ||= meta.poNumber || '';
      this.attention ||= meta.attention || '';
      this.contactPerson ||= meta.contactPerson || '';
      this.deliveryDate ||= meta.deliveryDate || '';
      this.template ||= QUOTE_TEMPLATES.find(t => t.id === meta.templateId) || null;
    });
  }

  /** Fetches the note's quote once (whichever link found it first) — the LPO file, signed copy and
   *  logo are kept on it, and its customer/items fill in older notes. */
  private loadQuote(note: SalesDeliveryNote, quoteId: number | string): void {
    if (this.quoteRequestedFor != null) return;
    this.quoteRequestedFor = String(quoteId);
    this.salesService.getQuoteById(quoteId).pipe(takeUntil(this.destroy$)).subscribe(quote => {
      this.quoteChecked = true;
      if (!quote) return;
      if (this.salesService.hasSignedDeliveryNoteDocument(quote)) this.hasSignedCopy = true;
      this.logo = this.salesService.getDeliveryNoteLogo(quote);
      this.sourceCustomer = this.salesService.quoteCustomer(quote) || this.sourceCustomer;
      this.lpoFile = this.salesService.getQuoteLpoDocument(quote) || this.lpoFile;
      this.backfillFromQuote(note, quote);
    });
  }

  /** Notes saved before they picked everything up from their quote can be missing lines, the
   *  address or the recipient — fill those in from the quote and save. */
  private backfillFromQuote(note: SalesDeliveryNote, quote: any): void {
    if (!note.id) return;
    const customer = this.customers.find(c => c.id === note.customerId);
    const patched = this.salesService.fillMissingFromQuote(note, quote, customer);
    if (!patched) return;
    this.note = { ...(this.note || note), ...patched };
    this.salesService.updateDeliveryNote(note.id, patched).pipe(takeUntil(this.destroy$)).subscribe({
      error: err => console.error('Error filling in the delivery note from its quote:', err)
    });
  }

  /** The recipient as captured when the note was issued, falling back to the live customer
   *  record for notes created before recipientName/recipientPhone existed. */
  /** The note's customer from the customer list — ids are compared as strings since the API
   *  isn't consistent about sending them as numbers or strings — else the quote's / order's. */
  private get customer(): any {
    const id = this.note?.customerId;
    return (id != null ? this.customers.find(c => String(c.id) === String(id)) : null) || this.sourceCustomer;
  }

  get customerName(): string {
    return this.note?.recipientName || this.customer?.name || this.customer?.customerName || 'Customer';
  }

  /** The customer's address on file, shown when the note itself has none saved. */
  get customerAddressFallback(): string {
    return this.salesService.deliveryAddressFor(this.customer, this.sourceCustomer);
  }

  get customerPhone(): string {
    return this.note?.recipientPhone || this.customer?.phone || '';
  }

  // ============================================================
  // VIEW LPO — the order document the customer sent back
  // ============================================================

  /** The LPO file: the backend's stored copy once it has one (document.fileUrl), else the file
   *  kept on the quote. */
  get lpoDocument(): ViewableDocument | null {
    const stored = this.lpo?.document;
    if (stored?.fileUrl) {
      return { fileName: stored.fileName || 'LPO', contentType: stored.contentType, url: stored.fileUrl, uploadedAt: stored.uploadedAt };
    }
    if (this.lpoFile?.base64Content) {
      return { fileName: this.lpoFile.fileName || stored?.fileName || 'LPO', contentType: this.lpoFile.contentType,
        base64Content: this.lpoFile.base64Content, uploadedAt: this.lpoFile.uploadedAt };
    }
    return null;
  }

  get canViewLpo(): boolean {
    return hasDocumentContent(this.lpoDocument);
  }

  get lpoFileName(): string {
    return this.lpoDocument?.fileName || this.lpo?.document?.fileName || 'LPO';
  }

  viewLpo(): void {
    if (!this.canViewLpo) {
      this.messageService.add({ severity: 'warn', summary: 'No LPO File', detail: 'No LPO file is available for this delivery note.' });
      return;
    }
    this.showLpoViewer = true;
  }

  closeLpoViewer(): void {
    this.showLpoViewer = false;
  }

  downloadLpo(): void {
    const doc = this.lpoDocument;
    if (!doc || !downloadDocument(doc)) {
      this.messageService.add({ severity: 'warn', summary: 'No LPO File', detail: 'No LPO file is available for this delivery note.' });
    }
  }

  getTotalQuantity(): number {
    return (this.note?.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }

  /** Once delivered, the next step is the invoice — unless one has already been made. */
  canGenerateInvoice(): boolean {
    return this.note?.status === 'DELIVERED' && this.note?.invoiceId == null;
  }

  /** Invoice flow that starts by uploading the signed delivery note (see InvoiceFormComponent). */
  generateInvoice(): void {
    if (!this.note?.id || !this.canGenerateInvoice()) return;
    const quoteId = this.note.quoteId;
    if (quoteId == null) {
      this.messageService.add({ severity: 'warn', summary: 'No Quote', detail: 'This delivery note is not linked to a quote, so an invoice cannot be generated from it.' });
      return;
    }
    const uuid = this.route.snapshot.paramMap.get('uuid');
    const path = uuid ? ['/admin/sales/invoices/new', uuid] : ['/admin/sales/invoices/new'];
    this.router.navigate(path, { queryParams: { quoteId: String(quoteId), deliveryNoteId: String(this.note.id) } });
  }

  viewInvoice(): void {
    if (this.note?.invoiceId == null) return;
    const uuid = this.route.snapshot.paramMap.get('uuid');
    this.router.navigate(uuid ? ['/admin/sales/invoices', this.note.invoiceId, uuid] : ['/admin/sales/invoices', this.note.invoiceId]);
  }

  canEdit(): boolean {
    return this.note?.status === 'PENDING';
  }

  canMarkDispatched(): boolean {
    return this.note?.status === 'PENDING';
  }

  canMarkInTransit(): boolean {
    return this.note?.status === 'DISPATCHED';
  }

  canMarkDelivered(): boolean {
    return this.note?.status === 'DISPATCHED' || this.note?.status === 'IN_TRANSIT';
  }

  /** Goods can come back once they've left — whether or not they were signed for yet. */
  canMarkReturned(): boolean {
    return ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].includes(this.note?.status || '');
  }

  /** Cancellable until it's been delivered (or has already ended). */
  canCancel(): boolean {
    return ['PENDING', 'DISPATCHED', 'IN_TRANSIT'].includes(this.note?.status || '');
  }

  /** Only a note that never went out (or was cancelled) can be deleted outright. */
  canDelete(): boolean {
    return this.note?.status === 'PENDING' || this.note?.status === 'CANCELLED';
  }

  editNote(): void {
    if (!this.note?.id) return;
    if (this.edit.observed) {
      this.edit.emit(String(this.note.id));
      return;
    }
    const uuid = this.route.snapshot.paramMap.get('uuid');
    const path = uuid ? ['/admin/sales/delivery-notes', this.note.id, 'edit', uuid] : ['/admin/sales/delivery-notes', this.note.id, 'edit'];
    this.router.navigate(path);
  }

  updateStatus(status: SalesDeliveryNoteStatus, reason?: string): void {
    if (!this.note?.id || this.isUpdatingStatus) return;
    this.isUpdatingStatus = true;
    this.salesService.updateDeliveryNoteStatus(this.note, status, reason).subscribe({
      next: (updated) => {
        this.isUpdatingStatus = false;
        this.note = { ...this.note!, ...(updated || {}), status: updated?.status || status };
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `Delivery note marked as ${this.getStatusLabel(status).toLowerCase()}.` });
      },
      error: (err) => {
        console.error('Error updating delivery note status:', err);
        this.isUpdatingStatus = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: this.withReason('Failed to update status.', err) });
      }
    });
  }

  // ============================================================
  // CONFIRMATION MODAL — cancel / return / delete / LPO reject & delete
  // ============================================================

  private ask(action: PendingAction): void {
    this.actionReason = '';
    this.pendingAction = action;
  }

  closePendingAction(): void {
    this.pendingAction = null;
    this.actionReason = '';
  }

  confirmPendingAction(): void {
    const action = this.pendingAction;
    if (!action) return;
    const reason = this.actionReason.trim();
    if (action.reasonLabel && !reason) return;
    this.closePendingAction();
    action.run(reason);
  }

  askCancel(): void {
    this.ask({
      title: 'Cancel Delivery Note', icon: 'fa-ban', danger: true, confirmLabel: 'Cancel Delivery Note',
      message: `Cancel delivery note ${this.note?.deliveryNumber}? It stays on record as cancelled.`,
      reasonLabel: 'Reason for cancelling',
      run: reason => this.updateStatus('CANCELLED', reason)
    });
  }

  askReturn(): void {
    this.ask({
      title: 'Mark as Returned', icon: 'fa-undo', danger: true, confirmLabel: 'Mark Returned',
      message: `Record that the goods on ${this.note?.deliveryNumber} came back?`,
      run: () => this.updateStatus('RETURNED')
    });
  }

  askDelete(): void {
    this.ask({
      title: 'Delete Delivery Note', icon: 'fa-trash-alt', danger: true, confirmLabel: 'Delete',
      message: `Permanently delete delivery note ${this.note?.deliveryNumber}? This can't be undone.`,
      run: () => this.deleteNote()
    });
  }

  private deleteNote(): void {
    if (!this.note?.id || this.isDeleting) return;
    this.isDeleting = true;
    this.salesService.deleteDeliveryNote(this.note.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Delivery note deleted.' });
        this.goToDeliveryNotesList();
      },
      error: (err) => {
        console.error('Error deleting delivery note:', err);
        this.isDeleting = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: this.withReason('Failed to delete the delivery note.', err) });
      }
    });
  }

  // ============================================================
  // LPO — verify / reject / delete
  // ============================================================

  getLpoStatusClass(status: string | undefined): string {
    return ({ RECEIVED: 'sent', VERIFIED: 'accepted', REJECTED: 'declined' } as Record<string, string>)[status || ''] || 'draft';
  }

  getLpoStatusLabel(status: string | undefined): string {
    return ({ RECEIVED: 'Received', VERIFIED: 'Verified', REJECTED: 'Rejected' } as Record<string, string>)[status || ''] || '—';
  }

  verifyLpo(): void {
    if (!this.lpo?.id || this.isUpdatingLpo) return;
    this.runLpoUpdate(this.salesService.verifySalesLpo(this.lpo), 'LPO verified.', 'Failed to verify the LPO.');
  }

  askRejectLpo(): void {
    this.ask({
      title: 'Reject LPO', icon: 'fa-times-circle', danger: true, confirmLabel: 'Reject LPO',
      message: `Reject LPO ${this.lpo?.lpoNumber || ''}? The customer will need to send a corrected one.`,
      reasonLabel: 'Reason for rejecting',
      run: reason => {
        if (!this.lpo?.id) return;
        this.runLpoUpdate(this.salesService.rejectSalesLpo(this.lpo, reason), 'LPO rejected.', 'Failed to reject the LPO.');
      }
    });
  }

  private runLpoUpdate(request: Observable<SalesLpo>, success: string, failure: string): void {
    this.isUpdatingLpo = true;
    request.subscribe({
      next: (updated) => {
        this.isUpdatingLpo = false;
        this.lpo = { ...this.lpo!, ...(updated || {}) };
        this.messageService.add({ severity: 'success', summary: 'Success', detail: success });
      },
      error: (err) => {
        console.error('Error updating LPO:', err);
        this.isUpdatingLpo = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: this.withReason(failure, err) });
      }
    });
  }

  askDeleteLpo(): void {
    this.ask({
      title: 'Delete LPO', icon: 'fa-trash-alt', danger: true, confirmLabel: 'Delete LPO',
      message: `Delete LPO ${this.lpo?.lpoNumber || ''} and unlink it from this delivery note? This can't be undone.`,
      run: () => this.deleteLpo()
    });
  }

  /** Deletes the LPO, then clears the note's lpoId so it doesn't point at a missing record. */
  private deleteLpo(): void {
    const lpoId = this.lpo?.id;
    if (lpoId == null || !this.note?.id || this.isUpdatingLpo) return;
    this.isUpdatingLpo = true;
    this.salesService.deleteSalesLpo(lpoId).pipe(
      switchMap(() => this.note!.lpoId === lpoId
        ? this.salesService.updateDeliveryNote(this.note!.id!, { ...this.note!, lpoId: undefined })
        : of(this.note!))
    ).subscribe({
      next: (updated) => {
        this.isUpdatingLpo = false;
        this.note = { ...this.note!, ...(updated || {}), lpoId: undefined };
        this.lpo = null;
        this.poNumber = '';
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'LPO deleted.' });
      },
      error: (err) => {
        console.error('Error deleting LPO:', err);
        this.isUpdatingLpo = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: this.withReason('Failed to delete the LPO.', err) });
      }
    });
  }

  /** "Failed to update status. (The backend's reason.) Please try again." */
  private withReason(message: string, err: unknown): string {
    const reason = this.salesService.errorReason(err);
    return `${message}${reason ? ` (${reason})` : ''} Please try again.`;
  }

  goBack(): void {
    if (this.closed.observed) {
      this.closed.emit();
      return;
    }
    this.router.navigate(['/admin/sales/sales-hub']);
  }

  goToDeliveryNotesList(): void {
    // Must match the [cacheKey] passed to <app-nav-tab> in sales-hub.component.html.
    sessionStorage.setItem('sales-hub', 'Delivery Notes');
    const uuid = this.route.snapshot.paramMap.get('uuid');
    this.router.navigate(uuid ? ['/admin/sales/sales-hub', uuid] : ['/admin/sales/sales-hub']);
  }

  viewCustomer(): void {
    if (!this.note?.customerId) return;
    const uuid = this.route.snapshot.paramMap.get('uuid');
    // Same id preference as the Quote detail page: the customer's code, falling back to the numeric id
    const customer = this.customers.find(c => c.id === this.note?.customerId);
    const id = customer?.customerId ?? String(this.note.customerId);
    this.router.navigate(uuid ? ['/admin/sales/customers', id, uuid] : ['/admin/sales/customers', id]);
  }

  downloadPDF(): void {
    const element = document.getElementById('delivery-note-detail-sheet');
    if (!element) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Unable to find delivery note to generate PDF.' });
      return;
    }
    this.isDownloading = true;
    // Shared renderer: compressed, sharp and multi-page (this used to keep only page one).
    renderElementToPdf(element).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DeliveryNote-${this.note?.deliveryNumber || 'note'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      this.isDownloading = false;
    }).catch(err => {
      console.error('Error generating PDF:', err);
      this.isDownloading = false;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to build PDF document.' });
    });
  }

  printNote(): void {
    window.print();
  }

  formatDate(date: any): string {
    return formatApiDate(date, { day: 'numeric', month: 'short', year: 'numeric' }, 'en-NG', '—');
  }

  formatDateTime(date: any): string {
    return formatApiDateTime(date, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }, 'en-NG', '—');
  }

  /** Maps delivery statuses onto the quote-detail stylesheet's status colours (the shared sheet
   *  has no delivery-specific ones): pending = draft grey, dispatched/in transit = sent,
   *  delivered = accepted green, returned/cancelled = declined red. */
  getStatusClass(status: string | undefined): string {
    const classes: Record<string, string> = {
      PENDING: 'draft',
      DISPATCHED: 'sent',
      IN_TRANSIT: 'sent',
      DELIVERED: 'accepted',
      RETURNED: 'declined',
      CANCELLED: 'declined'
    };
    return classes[status || 'PENDING'] || 'draft';
  }

  getStatusLabel(status: string | undefined): string {
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      DISPATCHED: 'Dispatched',
      IN_TRANSIT: 'In Transit',
      DELIVERED: 'Delivered',
      RETURNED: 'Returned',
      CANCELLED: 'Cancelled'
    };
    return labels[status || 'PENDING'] || 'Pending';
  }
}

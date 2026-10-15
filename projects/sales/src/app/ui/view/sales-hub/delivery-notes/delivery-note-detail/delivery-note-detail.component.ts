import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, of, takeUntil } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SalesService } from '../../../../service/sales/sales.service';
import { Customer, SalesDeliveryNote, SalesDeliveryNoteStatus, SalesLpo, MerchantInfo } from '../../../../domain/sales/sales.dto';
import { formatApiDate, formatApiDateTime } from '../../../../service/sales/date.util';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';
import { DeliveryNoteDocumentComponent } from '../delivery-note-document/delivery-note-document.component';
import { QuoteTemplate, QUOTE_TEMPLATES } from '../../template-types/template-types.component';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

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
  imports: [CommonModule, FormsModule, BackButtonComponent, DeliveryNoteDocumentComponent, ToastModule],
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
  /** Whether the signed delivery note has been uploaded — required before Mark Delivered. */
  hasSignedCopy = false;
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
    if (note.quoteId != null) {
      this.salesService.getQuoteById(note.quoteId).pipe(takeUntil(this.destroy$)).subscribe(quote => {
        if (this.salesService.hasSignedDeliveryNoteDocument(quote)) this.hasSignedCopy = true;
      });
    }
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
    });

    if (note.salesOrderId == null) return;
    const transactionId = note.salesOrderId;
    this.salesService.getOrderIdLookup().pipe(takeUntil(this.destroy$)).subscribe(lookup => {
      this.orderId = lookup.byTransactionId.get(transactionId) || null;
    });
    this.salesService.getSalesandTransactionsById(transactionId).pipe(takeUntil(this.destroy$)).subscribe(tx => {
      if (!tx) return;
      this.invoiceNumber = (tx.invoiceId as any)?.invoiceNumber || '';
      if (this.salesService.hasSignedDeliveryNoteDocument(tx.quoteId as any)) this.hasSignedCopy = true;
      const meta = this.salesService.getDeliveryNoteMeta(tx.quoteId as any);
      this.poNumber ||= meta.poNumber || '';
      this.attention ||= meta.attention || '';
      this.contactPerson ||= meta.contactPerson || '';
      this.deliveryDate ||= meta.deliveryDate || '';
      this.template ||= QUOTE_TEMPLATES.find(t => t.id === meta.templateId) || null;
    });
  }

  /** The recipient as captured when the note was issued, falling back to the live customer
   *  record for notes created before recipientName/recipientPhone existed. */
  get customerName(): string {
    if (this.note?.recipientName) return this.note.recipientName;
    const customer = this.customers.find(c => c.id === this.note?.customerId);
    return customer?.name || 'Customer';
  }

  get customerPhone(): string {
    if (this.note?.recipientPhone) return this.note.recipientPhone;
    const customer = this.customers.find(c => c.id === this.note?.customerId);
    return customer?.phone || '';
  }

  getTotalQuantity(): number {
    return (this.note?.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
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

  /** Tooltip for Mark Delivered while it's blocked on the signed copy. */
  get markDeliveredHint(): string {
    return this.hasSignedCopy ? 'Mark Delivered' : 'Upload the signed delivery note (from its quote) before marking it delivered';
  }

  updateStatus(status: SalesDeliveryNoteStatus, reason?: string): void {
    if (!this.note?.id || this.isUpdatingStatus) return;
    if (status === 'DELIVERED' && !this.hasSignedCopy) {
      this.messageService.add({ severity: 'warn', summary: 'Signed Copy Needed', detail: this.markDeliveredHint + '.' });
      return;
    }
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
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status. Please try again.' });
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
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete the delivery note. Please try again.' });
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
        this.messageService.add({ severity: 'error', summary: 'Error', detail: `${failure} Please try again.` });
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
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete the LPO. Please try again.' });
      }
    });
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
    setTimeout(() => {
      html2canvas(element, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`DeliveryNote-${this.note?.deliveryNumber || 'note'}.pdf`);
        this.isDownloading = false;
      }).catch(err => {
        console.error('Error generating PDF:', err);
        this.isDownloading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to build PDF document.' });
      });
    }, 100);
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

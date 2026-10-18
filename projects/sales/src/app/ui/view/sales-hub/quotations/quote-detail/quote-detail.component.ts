import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, lastValueFrom } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { Quote, Invoice, SalesandTransactions, AdditionalQuoteOptions, SalesDeliveryNote, QuoteDocumentAttachment } from '../../../../domain/sales/sales.dto';
import { formatApiDate, parseApiDate } from '../../../../service/sales/date.util';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SendEmailModalComponent } from '../../send-email-modal/send-email-modal.component';
import { SalesDocumentComponent } from '../../sales-document/sales-document.component';
import { SalesDocumentModel, quoteDocument } from '../../../../service/sales/sales-document';
import { QuoteTemplate, QUOTE_TEMPLATES } from '../../template-types/template-types.component';
import { SalesDocumentEmailService, renderElementToPdf } from '../../../../service/sales/sales-document-email.service';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-quote-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, BackButtonComponent, SendEmailModalComponent, SalesDocumentComponent],
  templateUrl: './quote-detail.component.html',
  styleUrls: ['./quote-detail.component.scss']
})
export class QuoteDetailComponent implements OnInit, OnDestroy {
  @Input() detailId?: string;
  @Output() closed = new EventEmitter<void>();
  @Output() edit = new EventEmitter<string>();

  quote: Quote | null = null;
  isLoading = true;
  isDownloading = false;

  orderId: string | null = null;
  deliveryNote: SalesDeliveryNote | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService,
    private documentEmail: SalesDocumentEmailService
  ) {}

  get additionalOpts(): AdditionalQuoteOptions | undefined {
    if (!this.quote?.additionalOptions) return undefined;
    return Array.isArray(this.quote.additionalOptions) ? this.quote.additionalOptions[0] : (this.quote.additionalOptions as any);
  }

  // Reading route.snapshot.paramMap once here meant navigating from one quote's detail URL
  // straight to another's (e.g. browser Back/Forward between two previously visited quotes) kept
  // showing the first quote — Angular's default RouteReuseStrategy reuses this component instance
  // across same-route-pattern navigations, so ngOnInit never re-ran. Subscribing to the live
  // paramMap instead re-loads whenever the :id actually changes.
  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = this.detailId || params.get('id');
      if (id) {
        this.loadQuote(id);
      } else {
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadQuote(id: string): void {
    this.isLoading = true;
    this.salesService.getQuoteById(id).subscribe({
      next: (quote: Quote | null) => {
        this.quote = quote;
        this.isLoading = false;
        if (quote) {
          this.loadOrderId(quote.id);
          this.loadDeliveryNoteState(quote.id);
        }
      },
      error: (err: any) => {
        console.error('Error loading quote:', err);
        this.isLoading = false;
      }
    });
  }

  private loadOrderId(quoteId: number): void {
    this.salesService.getOrderIdLookup().subscribe(lookup => {
      this.orderId = lookup.byQuoteId.get(quoteId) || null;
    });
  }

  /** Read-only check for whether a delivery note already exists for this quote — unlike
   *  getOrCreateDeliveryNoteForQuote(), this never creates one; that only happens when the
   *  seller explicitly runs the Generate Delivery Note wizard. */
  loadDeliveryNoteState(quoteId: number | undefined = this.quote?.id): void {
    if (quoteId == null) return;
    this.salesService.getQuoteDeliveryNoteMap().subscribe(map => {
      this.deliveryNote = map.get(quoteId) || null;
    });
  }

  canConvert(): boolean {
    return this.quote?.status === 'SENT';
  }

  /** Same ACCEPTED-or-CONVERTED treatment canDeleteQuote() already uses — see
   *  QuoteListComponent.isConvertedOrAccepted() for why. */
  private isConvertedOrAccepted(): boolean {
    return this.quote?.status === 'CONVERTED' || this.quote?.status === 'ACCEPTED';
  }

  canGenerateDeliveryNote(): boolean {
    return this.isConvertedOrAccepted() && !this.deliveryNote;
  }

  canUploadSignedDeliveryNote(): boolean {
    return this.isConvertedOrAccepted() && !!this.deliveryNote && !this.salesService.hasSignedDeliveryNoteDocument(this.quote);
  }

  canCreateInvoice(): boolean {
    return this.isConvertedOrAccepted() && this.salesService.hasSignedDeliveryNoteDocument(this.quote);
  }

  goToGenerateDeliveryNote(): void {
    if (!this.quote) return;
    const uuid = this.route.snapshot.paramMap.get('uuid');
    const path = uuid ? ['/admin/sales/delivery-notes/generate', uuid] : ['/admin/sales/delivery-notes/generate'];
    this.router.navigate(path, { queryParams: { quoteId: String(this.quote.id) } });
  }

  goToCreateInvoice(): void {
    if (!this.quote || !this.canCreateInvoice()) return;
    const uuid = this.route.snapshot.paramMap.get('uuid');
    const path = uuid ? ['/admin/sales/invoices/new', uuid] : ['/admin/sales/invoices/new'];
    this.router.navigate(path, { queryParams: { quoteId: String(this.quote.id) } });
  }

  // ============================================================
  // SIGNED DELIVERY NOTE RE-UPLOAD
  // ============================================================

  showSignedDeliveryNoteModal = false;
  signedDeliveryNoteFileName = '';
  private signedDeliveryNoteFile: QuoteDocumentAttachment | null = null;
  isSavingSignedDeliveryNote = false;
  /** From the signed copy's Name / Date sign-off — saved on the delivery note. */
  receivedByName = '';
  receivedDate = '';

  openSignedDeliveryNoteModal(): void {
    this.signedDeliveryNoteFileName = '';
    this.signedDeliveryNoteFile = null;
    this.receivedByName = '';
    this.receivedDate = new Date().toISOString().substring(0, 10);
    this.showSignedDeliveryNoteModal = true;
  }

  get canSubmitSignedDeliveryNote(): boolean {
    return !!this.signedDeliveryNoteFileName && !!this.receivedByName.trim() && !!this.receivedDate && !this.isSavingSignedDeliveryNote;
  }

  closeSignedDeliveryNoteModal(): void {
    this.showSignedDeliveryNoteModal = false;
  }

  onSignedDeliveryNoteFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    this.signedDeliveryNoteFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.signedDeliveryNoteFile = {
        fileName: file.name,
        base64Content: dataUrl.split(',')[1] || '',
        contentType: file.type || 'application/pdf',
        uploadedAt: new Date()
      };
    };
    reader.readAsDataURL(file);
  }

  submitSignedDeliveryNote(): void {
    if (!this.quote || !this.signedDeliveryNoteFile || !this.canSubmitSignedDeliveryNote) return;
    this.isSavingSignedDeliveryNote = true;
    this.salesService.recordSignedDeliveryNote(this.quote.id, this.signedDeliveryNoteFile, this.deliveryNote, {
      receivedByName: this.receivedByName.trim(),
      receivedAt: new Date(this.receivedDate).toISOString()
    }).subscribe({
      next: ({ quote, note, noteSaved }) => {
        this.isSavingSignedDeliveryNote = false;
        this.quote = quote;
        if (note) this.deliveryNote = note;
        this.showSignedDeliveryNoteModal = false;
        this.messageService.add(noteSaved
          ? { severity: 'success', summary: 'Uploaded', detail: 'Signed delivery note uploaded and the delivery marked as delivered — you can now create the invoice.' }
          : { severity: 'warn', summary: 'Uploaded', detail: 'Signed copy uploaded, but who received it couldn\'t be saved on the delivery note.' });
      },
      error: (err) => {
        console.error('Error uploading signed delivery note:', err);
        this.isSavingSignedDeliveryNote = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to upload signed delivery note. Please try again.' });
      }
    });
  }

  /** "VAT @ 10%" when every taxed line uses the same rate, plain "VAT" when they differ —
   *  instead of the 7.5% this used to be hardcoded to whatever was actually entered. */
  get taxLabel(): string {
    const rates = Array.from(new Set(((this.quote?.items || []) as any[])
      .map(item => Number(item.taxRate) || 0)
      .filter(rate => rate > 0)));
    return rates.length === 1 ? `VAT @ ${rates[0]}%` : 'VAT';
  }

  formatCurrency(amount: number): string {
    const currency = this.quote?.currency || 'NGN';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
  }

  getQuoteDate(): Date | string | null {
    return this.quote?.createdAt ?? ((this.quote as any).quoteDate ?? (this.quote as any).quote_date ?? null);
  }

  getQuoteValidUntil(): Date | string | null {
    return this.quote?.validUntil ?? ((this.quote as any).expiresAt ?? (this.quote as any).expiryDate ?? null);
  }

  getQuoteCustomerName(): string {
    if (!this.quote) return 'Customer';

    const { customerName, customerId } = this.quote as any;

    if (customerName) {
      if (typeof customerName === 'object') {
        return customerName.name || customerName.customerName || String(customerName) || 'Customer';
      }
      return String(customerName);
    }

    if (customerId) {
      if (typeof customerId === 'object') {
        return customerId.name || customerId.customerName || String(customerId) || 'Customer';
      }
      return `Customer #${customerId}`;
    }

    return 'Customer';
  }

  getQuoteCustomerId(): string {
    if (!this.quote?.customerId) return '';

    const customerId = this.quote.customerId as any;
    if (typeof customerId === 'object') {
      return customerId.customerId ?? String(customerId.id ?? '');
    }
    return String(customerId);
  }

  formatDate(date: any): string {
    return formatApiDate(date, { day: 'numeric', month: 'short', year: 'numeric' }, 'en-NG', '');
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'DRAFT': 'status-draft',
      'SENT': 'status-sent',
      'ACCEPTED': 'status-accepted',
      'DECLINED': 'status-declined',
      'EXPIRED': 'status-expired',
      'CONVERTED': 'status-converted'
    };
    return classes[status] || 'status-draft';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'DRAFT': 'draft',
      'SENT': 'sent',
      'ACCEPTED': 'accepted',
      'DECLINED': 'declined',
      'EXPIRED': 'expired',
      'CONVERTED': 'converted'
    };
    return classes[status] || 'draft';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'DRAFT': 'Draft',
      'SENT': 'Sent',
      'ACCEPTED': 'Accepted',
      'DECLINED': 'Declined',
      'EXPIRED': 'Expired',
      'CONVERTED': 'Converted'
    };
    return labels[status] || status;
  }

  isExpiringSoon(validUntil: unknown): boolean {
    const validDate = parseApiDate(validUntil);
    if (!validDate) return false;
    const diffTime = validDate.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  }

  getTotalQuantity(): number {
    if (!this.quote || !this.quote.items) return 0;
    return this.quote.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  getMerchantAddressStr(): string {
    const addr = (this.quote?.merchantDetails as any)?.address;
    if (!addr) return '';
    return Array.isArray(addr) ? addr.filter(Boolean).join(', ') : String(addr);
  }

  getCustomerAddressStr(): string {
    const c = (this.quote?.customerId || this.quote?.customerName) as any;
    const addr = c?.address;
    if (!addr) return '';
    return Array.isArray(addr) ? addr.filter(Boolean).join(', ') : String(addr);
  }

  getAdditionalCharges(): { label: string; amount: number }[] {
    const charges: number[] = (this.quote as any)?.additionalCharges || [];
    const labels: string[] = (this.quote as any)?.additionalChargesLabel || [];
    return charges.map((amount, i) => ({ label: labels[i] || 'Additional Charge', amount }));
  }

  getTotalInWords(amount: number): string {
    // Simple number to words conversion - you can expand this
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (amount === 0) return 'Zero';
    
    const currency = this.quote?.currency || 'NGN';
    const currencySymbol = currency === 'NGN' ? 'Naira' : currency;
    
    const naira = Math.floor(amount);
    const kobo = Math.round((amount - naira) * 100);
    
    if (naira === 0) return `${kobo} Kobo`;
    
    let words = this.numberToWords(naira) + ' ' + currencySymbol;
    if (kobo > 0) {
      words += ` and ${this.numberToWords(kobo)} Kobo`;
    }
    return words;
  }

  private numberToWords(num: number): string {
    if (num === 0) return 'Zero';
    
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Million', 'Billion'];
    
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const u = num % 10;
      return tens[t] + (u > 0 ? ' ' + units[u] : '');
    }
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const r = num % 100;
      return units[h] + ' Hundred' + (r > 0 ? ' and ' + this.numberToWords(r) : '');
    }
    
    let result = '';
    let remaining = num;
    let group = 0;
    
    while (remaining > 0) {
      const chunk = remaining % 1000;
      if (chunk > 0) {
        const chunkWords = this.numberToWords(chunk);
        result = chunkWords + (thousands[group] ? ' ' + thousands[group] : '') + (result ? ' ' + result : '');
      }
      remaining = Math.floor(remaining / 1000);
      group++;
    }
    
    return result;
  }

  showSendQuoteModal = false;
  showAcceptQuoteModal = false;
  showDeclineQuoteModal = false;
  showDeleteQuoteModal = false;
  
  pendingQuoteNumber = '';
  pendingCustomerName = '';

  // Send Quote — the same email dialog as the create form, and a real email (PDF of this page's
  // sheet attached). Once it's sent the quote moves to SENT, which swaps this button for
  // Customer Accepted / Declined.
  emailSubject = '';
  emailMessage = '';
  isSendingEmail = false;

  private get quoteCustomerName(): string {
    return (this.quote?.customerName as any)?.name || (typeof this.quote?.customerName === 'string' ? this.quote.customerName : '') || 'Customer';
  }

  /** The customer's email from the nested customer on the quote, or — when the record doesn't
   *  carry it — from the customer list. */
  private async resolveCustomerEmail(quote: any): Promise<string> {
    const nested = quote.customerName || quote.customerId;
    const direct = nested?.email || quote.customerId?.email;
    if (direct || nested?.id == null) return direct || '';
    try {
      const res = await lastValueFrom(this.salesService.getCustomers({ page: 0, size: 200 }));
      return res.data.find(c => String(c.id) === String(nested.id))?.email || '';
    } catch {
      return '';
    }
  }

  private get merchantName(): string {
    const m: any = this.quote?.merchantDetails;
    return m?.companyName || m?.name || 'our company';
  }

  sendQuote(): void {
    if (!this.quote) return;
    this.pendingQuoteNumber = this.quote.quoteNumber || '';
    this.pendingCustomerName = this.quoteCustomerName;
    this.emailSubject = `Quotation ${this.quote.quoteNumber} from ${this.merchantName}`;
    this.emailMessage = `Dear ${this.quoteCustomerName},\n\nPlease find the details of your quotation below:`;
    this.showSendQuoteModal = true;
  }

  async confirmSendQuote(): Promise<void> {
    if (!this.quote || this.isSendingEmail) return;
    const quote = this.quote;
    this.isSendingEmail = true;

    const sheet = document.getElementById('quote-detail-sheet');
    const pdfBlob = sheet ? await renderElementToPdf(sheet).catch(err => {
      console.warn('[QuoteDetailComponent] PDF attachment generation failed, sending without attachment:', err);
      return null;
    }) : null;

    const result = await this.documentEmail.sendQuote(quote, {
      to: await this.resolveCustomerEmail(quote),
      recipientName: this.quoteCustomerName,
      subject: this.emailSubject,
      message: this.emailMessage,
      companyName: this.merchantName,
      sentBy: (quote.merchantDetails as any)?.email,
      pdfBlob
    });

    if (this.documentEmail.isSent(result)) {
      try {
        this.quote = await lastValueFrom(this.salesService.markQuoteSent(quote));
      } catch (err) {
        console.error('Quote emailed, but marking it SENT failed:', err);
        this.messageService.add({ severity: 'warn', summary: 'Status Not Updated', detail: 'The quote was emailed, but its status could not be changed to Sent.' });
      }
      this.showSendQuoteModal = false;
    }
    this.isSendingEmail = false;
  }

  acceptQuote(): void {
    if (!this.quote) return;
    const custName = (this.quote.customerName as any)?.name || this.quote.customerName || 'Customer';
    this.pendingQuoteNumber = this.quote.quoteNumber || '';
    this.pendingCustomerName = custName;
    this.showAcceptQuoteModal = true;
  }

  confirmAcceptQuote(): void {
    if (!this.quote) return;
    this.showAcceptQuoteModal = false;
    // Stays on the quote detail page (rather than jumping to the order) — the new flow's next
    // step, Generate Delivery Note, is a button right here once conversion lands.
    this.salesService.convertQuote(this.quote).subscribe({
      next: ({ quote }) => {
        this.quote = quote;
        this.loadDeliveryNoteState();
        this.messageService.add({ severity: 'success', summary: 'Converted', detail: `Quote ${quote.quoteNumber} converted to an order.` });
      },
      error: (err: any) => {
        console.error('Error accepting quote:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to convert quote. Please try again.' });
      }
    });
  }

  declineQuote(): void {
    if (!this.quote) return;
    const custName = (this.quote.customerName as any)?.name || this.quote.customerName || 'Customer';
    this.pendingQuoteNumber = this.quote.quoteNumber || '';
    this.pendingCustomerName = custName;
    this.showDeclineQuoteModal = true;
  }

  confirmDeclineQuote(): void {
    if (!this.quote) return;
    this.showDeclineQuoteModal = false;
    this.salesService.updateQuote(String(this.quote.id), { status: 'DECLINED' }).subscribe({
      next: (updated: Quote) => {
        this.quote = updated;
        this.salesService.upsertTransactionForQuote(updated.id, { status: 'QUOTE_REJECTED', quoteAcceptedOrRejectedDate: new Date() }).subscribe({
          error: (err) => console.error('Failed to sync quote-declined status to Sales & Transactions:', err)
        });
      },
      error: (err: any) => {
        console.error('Error declining quote:', err);
      }
    });
  }

  /** Same rule as QuoteListComponent.canDeleteQuote(): once a quote is CONVERTED (or ACCEPTED, on
   *  its way there) it already has a real SalesandTransactions order/invoice referencing it. */
  canDeleteQuote(): boolean {
    return !!this.quote && this.quote.status !== 'CONVERTED' && this.quote.status !== 'ACCEPTED';
  }

  deleteQuote(): void {
    if (!this.quote) return;
    if (!this.canDeleteQuote()) {
      this.messageService.add({ severity: 'warn', summary: 'Cannot Delete', detail: `Quote ${this.quote.quoteNumber} has already been converted to an order and can no longer be deleted.` });
      return;
    }
    const custName = (this.quote.customerName as any)?.name || this.quote.customerName || 'Customer';
    this.pendingQuoteNumber = this.quote.quoteNumber || '';
    this.pendingCustomerName = custName;
    this.showDeleteQuoteModal = true;
  }

  // This doesn't actually delete the quote record — it marks it EXPIRED (a soft archive), the
  // same as a quote that naturally passed its validUntil date without a response. It used to
  // claim "deleted successfully" in the success toast while silently doing this instead, which
  // is a different, misleading thing from what QuoteListComponent's real delete (a genuine
  // DELETE call) does.
  confirmDeleteQuote(): void {
    if (!this.quote || !this.canDeleteQuote()) return;
    const quoteNumber = this.quote.quoteNumber;
    this.showDeleteQuoteModal = false;
    this.salesService.updateQuote(String(this.quote.id), { status: 'EXPIRED' }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Archived', detail: `Quote ${quoteNumber} marked as expired.` });
        this.goBack();
      },
      error: (err: any) => {
        console.error('Error archiving quote:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to archive quote. Please try again.' });
      }
    });
  }

  goBack(): void {
    if (this.closed.observed) {
      this.closed.emit();
    } else {
      // Must match the [cacheKey] passed to <app-nav-tab> in sales-hub.component.html.
      const sessionStorageKey = 'sales-hub';
      sessionStorage.setItem(sessionStorageKey, 'Quotes');

      const uuid = this.route.snapshot.paramMap.get('uuid');
      if (uuid) {
        this.router.navigate(['/admin/sales/sales-hub', uuid]);
      } else {
        this.router.navigate(['/admin/sales/sales-hub']);
      }
    }
  }

  goToQuotesList(): void {
    // Must match the [cacheKey] passed to <app-nav-tab> in sales-hub.component.html.
    const sessionStorageKey = 'sales-hub';
    sessionStorage.setItem(sessionStorageKey, 'Quotes');

    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/sales-hub', uuid]);
    } else {
      this.router.navigate(['/admin/sales/sales-hub']);
    }
  }

  editQuote(): void {
    if (this.edit.observed) {
      this.edit.emit(String(this.quote!.id));
    } else {
      const uuid = this.route.snapshot.paramMap.get('uuid');
      if (uuid) {
        this.router.navigate(['/admin/sales/quotes', String(this.quote!.id), 'edit', uuid]);
      } else {
        this.router.navigate(['/admin/sales/quotes', String(this.quote!.id), 'edit']);
      }
    }
  }

  viewCustomer(): void {
    if (!this.quote || !this.quote.customerId) return;

    const customerId = this.quote.customerId as any;
    let id = '';

    if (typeof customerId === 'object') {
      id = customerId.customerId ?? String(customerId.id ?? '');
    } else {
      id = String(customerId);
    }

    if (!id) return;

    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/customers', id, uuid]);
    } else {
      this.router.navigate(['/admin/sales/customers', id]);
    }
  }

  // ── The document: the quote in the template the seller picked ──
  /** The seller's company profile (logo, address, bank) for the document's "From" block. */
  private merchant: any = null;
  private merchantRequested = false;
  private docCache: { key: unknown[]; doc: SalesDocumentModel } | null = null;
  private templateQuote: any = null;

  get document(): SalesDocumentModel {
    if (!this.merchantRequested) {
      this.merchantRequested = true;
      this.salesService.getMyMerchantInfo().pipe(takeUntil(this.destroy$)).subscribe(m => this.merchant = m);
    }
    const key = [this.quote, this.merchant];
    if (!this.docCache || this.docCache.key.some((v, i) => v !== key[i])) {
      const merchant = this.merchant ? { ...this.quote?.merchantDetails, ...this.merchant } : this.quote?.merchantDetails;
      this.docCache = { key, doc: quoteDocument(this.quote, merchant, undefined) };
    }
    return this.docCache.doc;
  }

  /** The template chosen when the quote was created (see SalesService.saveDocumentTemplate). */
  get documentTemplate(): QuoteTemplate | null {
    const id = this.salesService.getDocumentTemplateId('QUOTE', this.quote?.id, this.quote);
    return QUOTE_TEMPLATES.find(t => t.id === id) || null;
  }

  async downloadPDF(): Promise<void> {
    const element = document.getElementById('quote-detail-sheet');
    if (!element || this.isDownloading) {
      if (!element) this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not find the document to export.' });
      return;
    }
    this.isDownloading = true;
    try {
      const blob = await renderElementToPdf(element);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quote-${this.quote?.quoteNumber || 'Detail'}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to generate PDF.' });
    } finally {
      this.isDownloading = false;
    }
  }
}
// src/app/ui/view/sales-module/invoice-detail/invoice-detail.component.ts

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, lastValueFrom, forkJoin } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { Invoice, InvoiceStatus, PaymentMethod, SaleLifecycleStatus, SalesandTransactions, SalesDeliveryNote, QuoteDocumentAttachment } from '../../../../domain/sales/sales.dto';
import { formatApiDate, parseApiDate } from '../../../../service/sales/date.util';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SendEmailModalComponent } from '../../send-email-modal/send-email-modal.component';
import { SalesDocumentComponent } from '../../sales-document/sales-document.component';
import { SalesDocumentModel, invoiceDocument } from '../../../../service/sales/sales-document';
import { QuoteTemplate, QUOTE_TEMPLATES } from '../../template-types/template-types.component';
import { DocumentViewerComponent } from '../../document-viewer/document-viewer.component';
import { ViewableDocument, downloadDocument, hasDocumentContent } from '../../../../service/sales/document-file.util';
import { SalesDocumentEmailService, renderElementToPdf } from '../../../../service/sales/sales-document-email.service';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';
import { SharedOverlayModule } from '../../../../../shared-overlay.module';
import { PaymentReceiptComponent } from '../../payment-receipt/payment-receipt.component';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, BackButtonComponent, SharedOverlayModule, PaymentReceiptComponent, SendEmailModalComponent, DocumentViewerComponent, SalesDocumentComponent],
  templateUrl: './invoice-detail.component.html',
  styleUrls: ['./invoice-detail.component.scss']
})
export class InvoiceDetailComponent implements OnInit, OnDestroy {
  @Input() detailId?: string;
  private destroy$ = new Subject<void>();
  @Output() closed = new EventEmitter<void>();
  @Output() edit = new EventEmitter<string>();

  invoice: any = null;
  isLoading = true;
  showPaymentModal = false;
  paymentAmount = 0;
  isDownloading = false;

  selectedReceiptPaymentId?: string | number;
  showReceiptModal = false;

  openReceiptForPayment(paymentId: string | number): void {
    this.selectedReceiptPaymentId = paymentId;
    this.showReceiptModal = true;
  }

  closeReceipt(): void {
    this.selectedReceiptPaymentId = undefined;
    this.showReceiptModal = false;
  }

  invoicePayments: SalesandTransactions[] = [];
  paymentMethod: PaymentMethod = 'BANK_TRANSFER';
  paymentReference = '';
  paymentNotes = '';
  paymentDate = new Date().toISOString().substring(0, 10);
  isSavingPayment = false;

  paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CARD', label: 'Credit/Debit Card' },
    { value: 'CASH', label: 'Cash' },
    { value: 'POS', label: 'POS Terminal' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money' },
    { value: 'CHEQUE', label: 'Cheque' }
  ];

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService,
    private documentEmail: SalesDocumentEmailService
  ) {}

  // Reading route.snapshot.paramMap once here meant navigating from one invoice's detail URL
  // straight to another's kept showing the first invoice — Angular's default RouteReuseStrategy
  // reuses this component instance across same-route-pattern navigations, so ngOnInit never
  // re-ran. Subscribing to the live paramMap instead re-loads whenever the :id actually changes.
  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = this.detailId || params.get('id');
      if (id) {
        this.loadInvoice(id);
      } else {
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Order number linking this invoice to its quote / delivery note / transaction. */
  orderNumber = '';

  // ── Signed delivery note (invoices that came through Quote → LPO → Delivery Note) ──
  deliveryNote: SalesDeliveryNote | null = null;
  private signedFile: QuoteDocumentAttachment | null = null;
  signedLookupDone = false;
  showSignedViewer = false;

  /** Whether this invoice came through the quote / delivery flow (a standalone one didn't). */
  get fromDeliveryFlow(): boolean {
    return !!this.invoice?.quoteId || !!this.deliveryNote;
  }

  /** The signed copy: the backend's stored file once it has one, else the file kept on the quote. */
  get signedDocument(): ViewableDocument | null {
    if (this.deliveryNote?.signedDocumentUrl) {
      return { fileName: `Signed-${this.deliveryNote.deliveryNumber || 'DeliveryNote'}`, url: this.deliveryNote.signedDocumentUrl };
    }
    if (this.signedFile?.base64Content) {
      return { fileName: this.signedFile.fileName || 'Signed delivery note', contentType: this.signedFile.contentType,
        base64Content: this.signedFile.base64Content, uploadedAt: this.signedFile.uploadedAt };
    }
    return null;
  }

  get canViewSigned(): boolean {
    return hasDocumentContent(this.signedDocument);
  }

  /** Finds the invoice's delivery note and the signed copy uploaded for it. */
  private loadSignedDeliveryNote(invoice: Invoice): void {
    this.deliveryNote = null;
    this.signedFile = null;
    this.signedLookupDone = false;
    const quoteId = invoice.quoteId;
    if (quoteId == null || quoteId === '') {
      this.signedLookupDone = true;
      return;
    }
    forkJoin({
      quote: this.salesService.getQuoteById(quoteId),
      notes: this.salesService.getDeliveryNotes({ quoteId, size: 1000 })
    }).pipe(takeUntil(this.destroy$)).subscribe(({ quote, notes }) => {
      this.templateQuote = quote;
      this.signedFile = this.salesService.getQuoteSignedDeliveryNote(quote);
      this.deliveryNote = notes.data.find(n => String(n.invoiceId) === String(invoice.id))
        || notes.data.find(n => String(n.quoteId) === String(quoteId))
        || null;
      this.signedLookupDone = true;
    });
  }

  viewSignedDeliveryNote(): void {
    if (this.canViewSigned) this.showSignedViewer = true;
  }

  downloadSignedDeliveryNote(): void {
    const doc = this.signedDocument;
    if (!doc || !downloadDocument(doc)) {
      this.messageService.add({ severity: 'warn', summary: 'Not Available', detail: 'No signed delivery note file is available for this invoice.' });
    }
  }

  openDeliveryNote(): void {
    if (this.deliveryNote?.id == null) return;
    const uuid = this.route.snapshot.paramMap.get('uuid');
    this.router.navigate(uuid ? ['/admin/sales/delivery-notes', this.deliveryNote.id, uuid] : ['/admin/sales/delivery-notes', this.deliveryNote.id]);
  }

  loadInvoice(id: string): void {
    this.isLoading = true;
    this.salesService.getInvoiceById(id).subscribe({
      next: (invoice: Invoice | null) => {
        this.invoice = invoice;
        if (invoice) {
          this.loadPaymentsForInvoice(invoice.id);
          this.loadSignedDeliveryNote(invoice);
          this.salesService.getOrderIdLookup().pipe(takeUntil(this.destroy$)).subscribe(lookup => {
            this.orderNumber = this.salesService.orderNumberForInvoice(invoice, lookup);
          });
        } else {
          this.isLoading = false;
        }
      },
      error: (err: any) => {
        console.error('Error loading invoice:', err);
        this.isLoading = false;
      }
    });
  }

  loadPaymentsForInvoice(invoiceId: string | number): void {
    this.salesService.getSalesandTransactions({ invoiceId, size: 100 }).subscribe({
      next: (res) => {
        this.invoicePayments = res.data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading invoice payments:', err);
        this.isLoading = false;
      }
    });
  }

  openPaymentModal(): void {
    if (this.invoice) {
      this.paymentAmount = this.invoice.balanceDue || 0;
      this.paymentMethod = 'BANK_TRANSFER';
      this.paymentReference = '';
      this.paymentNotes = '';
      this.paymentDate = new Date().toISOString().substring(0, 10);
      this.showPaymentModal = true;
    }
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
  }

  savePayment(): void {
    if (!this.invoice || this.paymentAmount <= 0) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please enter a valid payment amount' });
      return;
    }
    
    const balanceDue = this.invoice.balanceDue || 0;
    if (this.paymentAmount > balanceDue) {
      if (!confirm(`The amount exceeds the invoice's balance due (${this.formatCurrency(balanceDue)}). Proceed?`)) {
        return;
      }
    }

    this.isSavingPayment = true;

    const newBalanceDue = Math.max(0, balanceDue - this.paymentAmount);
    const payload: Partial<SalesandTransactions> = {
      invoiceId: this.invoice,
      customerId: this.invoice.customerId,
      customerName: this.invoice.customerName,
      paidAmount: this.paymentAmount,
      totalAmount: this.invoice.totalAmount,
      currency: this.invoice.currency,
      paymentMethod: this.paymentMethod,
      reference: this.paymentReference.trim() || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      // A payment that doesn't clear the full balance is still in progress, not completed —
      // mislabeling every partial payment as PAYMENT_COMPLETED would make the lifecycle
      // tracker lie about outstanding balances.
      status: newBalanceDue === 0 ? 'PAYMENT_COMPLETED' : 'PAYMENT_IN_PROGRESS',
      orderDate: new Date(this.paymentDate),
      transactionNotes: this.paymentNotes.trim(),
      balanceDue: newBalanceDue
    };

    // This invoice already has a transaction tracking it since it was created (see
    // SalesService.trackNewInvoice()) — advance that same record rather than creating a
    // second, duplicate one every time a payment is recorded.
    this.salesService.upsertTransactionForInvoice(this.invoice.id, payload).subscribe({
      next: (res) => {
        this.isSavingPayment = false;
        this.showPaymentModal = false;
        this.loadInvoice(this.invoice!.id);
        this.openReceiptForPayment(String(res.id) || '');
      },
      error: (err) => {
        this.isSavingPayment = false;
        console.error('Error recording payment:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to record payment. Please try again.' });
      }
    });
  }

  /** "VAT @ 10%" when every taxed line uses the same rate, plain "VAT" when they differ —
   *  instead of the 7.5% this used to be hardcoded to whatever was actually entered. */
  get taxLabel(): string {
    const rates = Array.from(new Set(((this.invoice?.items || []) as any[])
      .map(item => Number(item.taxRate) || 0)
      .filter(rate => rate > 0)));
    return rates.length === 1 ? `VAT @ ${rates[0]}%` : 'VAT';
  }

  formatCurrency(amount: number): string {
    const currency = this.invoice?.currency || 'NGN';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
  }

  formatDate(date: any): string {
    return formatApiDate(date, { day: 'numeric', month: 'short', year: 'numeric' }, 'en-NG', '');
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'DRAFT': 'status-draft',
      'SENT': 'status-sent',
      'PAID': 'status-paid',
      'PARTIAL': 'status-partial',
      'OVERDUE': 'status-overdue',
      'CANCELLED': 'status-cancelled'
    };
    return classes[status] || 'status-draft';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'DRAFT': 'draft',
      'SENT': 'sent',
      'PAID': 'paid',
      'PARTIAL': 'partial',
      'OVERDUE': 'overdue',
      'CANCELLED': 'cancelled'
    };
    return classes[status] || 'draft';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'DRAFT': 'Draft',
      'SENT': 'Sent',
      'PAID': 'Paid',
      'PARTIAL': 'Partial',
      'OVERDUE': 'Overdue',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  isOverdue(dueDate: Date | string): boolean {
    const due = parseApiDate(dueDate);
    if (!due) return false;
    return due < new Date();
  }

  getTotalQuantity(): number {
    if (!this.invoice || !this.invoice.items) return 0;
    return this.invoice.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
  }

  getTotalInWords(amount: number): string {
    if (amount === 0) return 'Zero';
    
    const currency = this.invoice?.currency || 'NGN';
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



  getMerchantAddressStr(): string {
    const addr = (this.invoice?.merchantDetails as any)?.address;
    if (!addr) return '';
    return Array.isArray(addr) ? addr.filter(Boolean).join(', ') : String(addr);
  }

  getCustomerAddressStr(): string {
    const c = (this.invoice?.customerId || this.invoice?.customerName) as any;
    const addr = c?.address;
    if (!addr) return '';
    return Array.isArray(addr) ? addr.filter(Boolean).join(', ') : String(addr);
  }

  getInvoiceCustomerName(): string {
    const inv = this.invoice as any;
    const cName = inv?.customerName;
    if (!cName) return 'Customer';
    if (typeof cName === 'object') return cName.name || cName.customerName || 'Customer';
    return String(cName);
  }

  getAdditionalCharges(): { label: string; amount: number }[] {
    const charges: number[] = this.invoice?.additionalCharges || [];
    const labels: string[] = (this.invoice as any)?.additionalChargesLabel || [];
    return charges.map((amount: number, i: number) => ({ label: labels[i] || 'Additional Charge', amount }));
  }

  get additionalInvoiceOpts(): any {
    const opts = this.invoice?.additionalOptions;
    if (!opts) return undefined;
    return Array.isArray(opts) ? opts[0] : opts;
  }

  showSendInvoiceModal = false;
  showCancelInvoiceModal = false;
  pendingInvoiceNumber = '';
  pendingCustomerName = '';

  // Send Invoice — the same email dialog as the create form, and a real email (PDF of this
  // page's sheet attached). Once it's sent the invoice moves to SENT.
  emailSubject = '';
  emailMessage = '';
  isSendingEmail = false;

  private get invoiceCustomerName(): string {
    return (this.invoice?.customerName as any)?.name || (typeof this.invoice?.customerName === 'string' ? this.invoice.customerName : '') || 'Customer';
  }

  /** The customer's email from the nested customer on the invoice, or — when the record doesn't
   *  carry it — from the customer list. */
  private async resolveCustomerEmail(invoice: any): Promise<string> {
    const nested = invoice.customerName || invoice.customerId;
    const direct = nested?.email || invoice.customerId?.email;
    if (direct || nested?.id == null) return direct || '';
    try {
      const res = await lastValueFrom(this.salesService.getCustomers({ page: 0, size: 200 }));
      return res.data.find(c => String(c.id) === String(nested.id))?.email || '';
    } catch {
      return '';
    }
  }

  private get merchantName(): string {
    const m: any = this.invoice?.merchantDetails;
    return m?.companyName || m?.name || 'our company';
  }

  sendInvoice(): void {
    if (!this.invoice) return;
    this.pendingInvoiceNumber = this.invoice.invoiceNumber || '';
    this.pendingCustomerName = this.invoiceCustomerName;
    this.emailSubject = `Invoice ${this.invoice.invoiceNumber} from ${this.merchantName}`;
    this.emailMessage = `Dear ${this.invoiceCustomerName},\n\nPlease find the details of your invoice below:`;
    this.showSendInvoiceModal = true;
  }

  async confirmSendInvoice(): Promise<void> {
    if (!this.invoice || this.isSendingEmail) return;
    const invoice = this.invoice;
    this.isSendingEmail = true;

    const sheet = document.getElementById('invoice-detail-sheet');
    const pdfBlob = sheet ? await renderElementToPdf(sheet).catch(err => {
      console.warn('[InvoiceDetailComponent] PDF attachment generation failed, sending without attachment:', err);
      return null;
    }) : null;

    const result = await this.documentEmail.sendInvoice(invoice, {
      to: await this.resolveCustomerEmail(invoice),
      recipientName: this.invoiceCustomerName,
      subject: this.emailSubject,
      message: this.emailMessage,
      companyName: this.merchantName,
      sentBy: (invoice.merchantDetails as any)?.email,
      pdfBlob
    });

    if (this.documentEmail.isSent(result)) {
      try {
        this.invoice = await lastValueFrom(this.salesService.markInvoiceSent(invoice));
      } catch (err) {
        console.error('Invoice emailed, but marking it SENT failed:', err);
        this.messageService.add({ severity: 'warn', summary: 'Status Not Updated', detail: 'The invoice was emailed, but its status could not be changed to Sent.' });
      }
      this.showSendInvoiceModal = false;
    }
    this.isSendingEmail = false;
  }

  cancelInvoice(): void {
    if (!this.invoice) return;
    this.pendingInvoiceNumber = this.invoice.invoiceNumber || '';
    this.showCancelInvoiceModal = true;
  }

  confirmCancelInvoice(): void {
    if (!this.invoice) return;
    const invoiceNumber = this.invoice.invoiceNumber;
    this.showCancelInvoiceModal = false;
    this.salesService.updateInvoice(this.invoice.id, { status: 'CANCELLED' }).subscribe({
      next: (updated: Invoice) => {
        this.invoice = updated;
        this.messageService.add({ severity: 'success', summary: 'Cancelled', detail: `Invoice ${invoiceNumber} cancelled successfully` });
      },
      error: (err: any) => {
        console.error('Error cancelling invoice:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to cancel invoice. Please try again.' });
      }
    });
  }

  goBack(): void {
    if (this.closed.observed) {
      this.closed.emit();
    } else {
      // Must match the [cacheKey] passed to <app-nav-tab> in sales-hub.component.html.
      const sessionStorageKey = 'sales-hub';
      sessionStorage.setItem(sessionStorageKey, 'Invoices');

      const uuid = this.route.snapshot.paramMap.get('uuid');
      if (uuid) {
        this.router.navigate(['/admin/sales/sales-hub', uuid]);
      } else {
        this.router.navigate(['/admin/sales/sales-hub']);
      }
    }
  }

  goToInvoicesList(): void {
    // Must match the [cacheKey] passed to <app-nav-tab> in sales-hub.component.html.
    const sessionStorageKey = 'sales-hub';
    sessionStorage.setItem(sessionStorageKey, 'Invoices');

    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/sales-hub', uuid]);
    } else {
      this.router.navigate(['/admin/sales/sales-hub']);
    }
  }

  editInvoice(): void {
    if (this.edit.observed) {
      this.edit.emit(this.invoice!.id);
    } else {
      const uuid = this.route.snapshot.paramMap.get('uuid');
      if (uuid) {
        this.router.navigate(['/admin/sales/invoices', this.invoice!.id, 'edit', uuid]);
      } else {
        this.router.navigate(['/admin/sales/invoices', this.invoice!.id, 'edit']);
      }
    }
  }

  viewCustomer(): void {
    if (this.invoice && this.invoice.customerId) {
      const uuid = this.route.snapshot.paramMap.get('uuid');
      if (uuid) {
        this.router.navigate(['/admin/sales/customers', this.invoice.customerId, uuid]);
      } else {
        this.router.navigate(['/admin/sales/customers', this.invoice.customerId]);
      }
    }
  }

  // ── The document: the invoice in the template the seller picked ──
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
    const key = [this.invoice, this.merchant, this.orderNumber];
    if (!this.docCache || this.docCache.key.some((v, i) => v !== key[i])) {
      const merchant = this.merchant ? { ...this.invoice?.merchantDetails, ...this.merchant } : this.invoice?.merchantDetails;
      this.docCache = { key, doc: invoiceDocument(this.invoice, merchant, undefined, this.orderNumber || undefined) };
    }
    return this.docCache.doc;
  }

  /** The template chosen when the invoice was created (see SalesService.saveDocumentTemplate). */
  get documentTemplate(): QuoteTemplate | null {
    const id = this.salesService.getDocumentTemplateId('INVOICE', this.invoice?.id, this.templateQuote);
    return QUOTE_TEMPLATES.find(t => t.id === id) || null;
  }

  async downloadPDF(): Promise<void> {
    const element = document.getElementById('invoice-detail-sheet');
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
      a.download = `Invoice-${this.invoice?.invoiceNumber || 'Detail'}.pdf`;
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
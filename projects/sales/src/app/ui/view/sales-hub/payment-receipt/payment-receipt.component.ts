import { Component, OnInit, Input, Output, EventEmitter, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { SalesService, OrderSnapshot } from '../../../service/sales/sales.service';
import { SalesandTransactions } from '../../../domain/sales/sales.dto';
import { SalesDocumentModel, receiptDocument } from '../../../service/sales/sales-document';
import { SalesDocumentEmailService, renderElementToPdf } from '../../../service/sales/sales-document-email.service';
import { SalesDocumentComponent } from '../sales-document/sales-document.component';
import { SendEmailModalComponent } from '../send-email-modal/send-email-modal.component';
import { QuoteTemplate, QUOTE_TEMPLATES } from '../template-types/template-types.component';

/**
 * Payment receipt for an order (a Sales & Transactions record): a conventional receipt — who
 * paid, for which invoice, the lines, totals, amount received and balance — built from the
 * order's invoice/quote/customer (see SalesService.getOrderSnapshot) and drawn by
 * SalesDocumentComponent in the invoice's template colour. Download/Print/Email all use it.
 */
@Component({
  selector: 'app-payment-receipt',
  standalone: true,
  imports: [CommonModule, SalesDocumentComponent, SendEmailModalComponent],
  templateUrl: './payment-receipt.component.html',
  styleUrl: './payment-receipt.component.scss',
  // Print styles have to reach outside this component to hide the rest of the page
  encapsulation: ViewEncapsulation.None
})
export class PaymentReceiptComponent implements OnInit, OnDestroy {
  /** The order (Sales & Transactions record) id. */
  @Input() paymentId?: string | number;
  @Input() paymentObj?: SalesandTransactions;
  @Output() closed = new EventEmitter<void>();

  receipt: SalesDocumentModel | null = null;
  template: QuoteTemplate | null = null;
  private snapshot: OrderSnapshot | null = null;
  private merchant: any = null;
  isLoading = true;
  isDownloading = false;

  // Email
  showEmailModal = false;
  isEmailing = false;
  emailSubject = '';
  emailMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private messageService: MessageService,
    private salesService: SalesService,
    private documentEmail: SalesDocumentEmailService
  ) {}

  ngOnInit(): void {
    const targetId = this.paymentId ?? this.paymentObj?.id;
    if (targetId == null || targetId === '') {
      this.isLoading = false;
      return;
    }
    forkJoin({
      snapshot: this.salesService.getOrderSnapshot(targetId),
      merchant: this.salesService.getMyMerchantInfo()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ snapshot, merchant }) => {
        this.snapshot = snapshot;
        this.merchant = merchant;
        if (snapshot) this.receipt = this.buildReceipt(snapshot, merchant);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading receipt:', err);
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildReceipt(s: OrderSnapshot, merchant: any): SalesDocumentModel {
    const tx: any = s.tx;
    const receiptNumber = `RCT-${String(tx.paymentNumber || this.salesService.orderNumberFor(tx) || tx.id).replace(/^(PAY|ORD)-/, '')}`;
    const templateId = this.salesService.getDocumentTemplateId('INVOICE', s.invoice?.id, s.quote);
    this.template = QUOTE_TEMPLATES.find(t => t.id === templateId) || null;
    return receiptDocument({
      receiptNumber,
      tx,
      invoice: s.invoice,
      quote: s.quote,
      customer: s.customer,
      merchant: merchant ? { ...(s.invoice as any)?.merchantDetails, ...merchant } : (s.invoice as any)?.merchantDetails,
      items: s.items,
      orderNumber: this.salesService.orderNumberFor(tx),
      paidNow: Number(tx.paidAmount) || 0
    });
  }

  close(): void {
    this.closed.emit();
  }

  private async renderPdf(): Promise<Blob> {
    const element = document.getElementById('receipt-sheet');
    if (!element) throw new Error('Receipt element not found');
    return renderElementToPdf(element);
  }

  async downloadPDF(): Promise<void> {
    if (!this.receipt || this.isDownloading) return;
    this.isDownloading = true;
    try {
      const blob = await this.renderPdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${this.receipt.number}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Error generating receipt PDF:', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to generate the receipt PDF.' });
    } finally {
      this.isDownloading = false;
    }
  }

  printReceipt(): void {
    window.print();
  }

  // ── Email ──

  get recipientEmail(): string {
    return this.snapshot?.customer?.email || '';
  }

  openEmail(): void {
    if (!this.receipt) return;
    if (!this.recipientEmail) {
      this.messageService.add({ severity: 'warn', summary: 'Missing Email', detail: 'This customer has no email address on file.' });
      return;
    }
    this.emailSubject = `Payment Receipt ${this.receipt.number} from ${this.receipt.from.name}`;
    this.emailMessage = `Dear ${this.receipt.to.name},\n\nThank you for your payment. Your receipt is attached.`;
    this.showEmailModal = true;
  }

  async sendEmail(): Promise<void> {
    if (!this.receipt || this.isEmailing) return;
    this.isEmailing = true;
    const pdfBlob = await this.renderPdf().catch(err => {
      console.warn('[PaymentReceiptComponent] Receipt PDF failed, sending without attachment:', err);
      return null;
    });
    const outcome = await this.documentEmail.sendReceipt({
      number: this.receipt.number,
      total: this.receipt.total,
      paidNow: this.receipt.paidNow,
      balanceDue: this.receipt.balanceDue,
      currency: this.receipt.currency,
      invoiceNumber: this.snapshot?.invoice?.invoiceNumber
    }, {
      to: this.recipientEmail,
      recipientName: this.receipt.to.name,
      subject: this.emailSubject,
      message: this.emailMessage,
      companyName: this.receipt.from.name,
      sentBy: this.merchant?.email,
      pdfBlob
    });
    this.isEmailing = false;
    if (this.documentEmail.isSent(outcome.result)) this.showEmailModal = false;
  }
}

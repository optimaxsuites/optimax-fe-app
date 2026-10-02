import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, takeUntil, lastValueFrom } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { SalesService } from '../../../../service/sales/sales.service';
import { SalesEmailService } from '../../../../service/sales/sales-email.service';
import { Customer, DeliveryNote, MerchantInfo, Quote, QuoteDocumentAttachment, SendSalesEmailRequest } from '../../../../domain/sales/sales.dto';
import { formatApiDate } from '../../../../service/sales/date.util';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';
import { DeliveryNoteDocumentComponent } from '../delivery-note-document/delivery-note-document.component';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

/**
 * The quote-driven "Generate Delivery Note" wizard (Conversion -> Receive LPO -> Delivery
 * Tracking -> Generate Delivery Note -> Re-upload Signed Delivery Note -> Send Invoice):
 *
 * Step 1 — upload the LPO the customer sent back. Receiving it is the gate: nothing below is
 * created until it's uploaded, since generating a delivery note without a customer's purchase
 * order isn't supposed to be possible under this flow.
 *
 * Step 2 — once the LPO is in, the delivery note itself is created/derived (via
 * getOrCreateDeliveryNoteForQuote(), the same item/customer/address derivation
 * getOrCreateDeliveryNote() already does for an order) and shown as a live, read-only preview.
 * Carrier/tracking ("Delivery Tracking" — not a separate page, just these two fields) are
 * editable inline here. From here it's generated: downloaded as a PDF or emailed to the customer
 * via the same sales-email endpoint Quote/Invoice already use.
 */
@Component({
  selector: 'app-generate-delivery-note',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BackButtonComponent, DeliveryNoteDocumentComponent, ToastModule],
  providers: [MessageService],
  templateUrl: './generate-delivery-note.component.html',
  styleUrls: ['./generate-delivery-note.component.scss']
})
export class GenerateDeliveryNoteComponent implements OnInit, OnDestroy {
  currentStep: 1 | 2 = 1;
  isLoading = true;
  today = new Date();
  quoteId?: number;
  quote: Quote | null = null;
  customers: Customer[] = [];
  merchantInfo: MerchantInfo | null = null;

  // Step 1 — LPO upload
  lpoFileName = '';
  private lpoFile: QuoteDocumentAttachment | null = null;
  poNumberInput = '';
  isSavingLpo = false;

  // Step 2 — the generated note + inline-editable delivery details. carrier/trackingNumber
  // persist to the real DeliveryNote backend fields; poNumber/attention/contactPerson have no
  // backend column so they ride on the quote's additionalOptions (see DeliveryNoteMeta).
  deliveryNote: DeliveryNote | null = null;
  carrier = '';
  trackingNumber = '';
  poNumber = '';
  attention = '';
  contactPerson = '';
  deliveryDate = '';
  isSavingTracking = false;
  isDownloading = false;
  isEmailing = false;

  showSendModal = false;
  emailSubject = '';
  emailMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService,
    private salesEmailService: SalesEmailService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    const quoteIdParam = this.route.snapshot.queryParamMap.get('quoteId');
    this.quoteId = quoteIdParam ? Number(quoteIdParam) : undefined;
    if (!this.quoteId) {
      this.isLoading = false;
      return;
    }

    forkJoin({
      quote: this.salesService.getQuoteById(this.quoteId),
      customers: this.salesService.getCustomers({ page: 0, size: 200 }),
      merchant: this.salesService.getMyMerchantInfo(),
      noteByQuoteId: this.salesService.getQuoteDeliveryNoteMap()
    }).pipe(takeUntil(this.destroy$)).subscribe(({ quote, customers, merchant, noteByQuoteId }) => {
      this.quote = quote;
      this.customers = customers.data;
      this.merchantInfo = merchant;
      this.isLoading = false;

      const meta = this.salesService.getDeliveryNoteMeta(quote);
      this.poNumberInput = meta.poNumber || '';
      this.attention = meta.attention || this.selectedCustomer?.name || '';
      this.contactPerson = meta.contactPerson || merchant?.name || merchant?.companyName || '';

      const existingNote = this.quoteId ? noteByQuoteId.get(this.quoteId) : undefined;
      if (existingNote) {
        // Already generated for this quote (e.g. they navigated back here) — skip straight to
        // the preview instead of re-asking for the LPO.
        this.deliveryNote = existingNote;
        this.carrier = existingNote.carrier || '';
        this.trackingNumber = existingNote.trackingNumber || '';
        this.poNumber = meta.poNumber || '';
        this.deliveryDate = this.toDateInputValue(existingNote.dispatchedAt || existingNote.createdAt || new Date());
        this.currentStep = 2;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Previews the delivery note with the still-unsaved carrier/tracking edits applied, so the
   *  live preview reflects what's being typed before "Save" persists it. */
  get previewNote(): DeliveryNote {
    return { ...this.deliveryNote!, carrier: this.carrier, trackingNumber: this.trackingNumber };
  }

  get selectedCustomer(): Customer | null {
    const customerId = (this.quote?.customerId as any)?.id ?? this.quote?.customerId;
    return this.customers.find(c => String(c.id) === String(customerId)) || null;
  }

  // ============================================================
  // STEP 1 — UPLOAD LPO
  // ============================================================

  onLpoFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    this.lpoFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.lpoFile = {
        fileName: file.name,
        base64Content: dataUrl.split(',')[1] || '',
        contentType: file.type || 'application/pdf',
        uploadedAt: new Date()
      };
    };
    reader.readAsDataURL(file);
  }

  submitLpo(): void {
    if (!this.quoteId || !this.lpoFile || this.isSavingLpo) return;
    this.isSavingLpo = true;
    this.salesService.saveQuoteLpoDocument(this.quoteId, this.lpoFile).pipe(
      switchMap(() => this.salesService.saveDeliveryNoteMeta(this.quoteId!, {
        poNumber: this.poNumberInput || undefined,
        attention: this.attention || undefined,
        contactPerson: this.contactPerson || undefined
      }))
    ).subscribe({
      next: (updatedQuote) => {
        this.quote = updatedQuote;
        this.poNumber = this.poNumberInput;
        // The LPO is in — now create/derive the actual delivery note record.
        this.salesService.getOrCreateDeliveryNoteForQuote(this.quoteId!).subscribe({
          next: (note) => {
            this.isSavingLpo = false;
            if (!note) {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'LPO uploaded, but the delivery note could not be generated. Please try again.' });
              return;
            }
            this.deliveryNote = note;
            this.carrier = note.carrier || '';
            this.trackingNumber = note.trackingNumber || '';
            this.deliveryDate = this.toDateInputValue(note.dispatchedAt || note.createdAt || new Date());
            this.currentStep = 2;
          },
          error: (err) => {
            console.error('Error generating delivery note:', err);
            this.isSavingLpo = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'LPO uploaded, but the delivery note could not be generated. Please try again.' });
          }
        });
      },
      error: (err) => {
        console.error('Error saving LPO:', err);
        this.isSavingLpo = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save the uploaded LPO. Please try again.' });
      }
    });
  }

  // ============================================================
  // STEP 2 — TRACKING + GENERATE
  // ============================================================

  saveTracking(): void {
    if (!this.deliveryNote?.id || !this.quoteId || this.isSavingTracking) return;
    this.isSavingTracking = true;
    this.salesService.updateDeliveryNote(this.deliveryNote.id, {
      ...this.deliveryNote,
      carrier: this.carrier || undefined,
      trackingNumber: this.trackingNumber || undefined
    }).pipe(
      switchMap(updated => this.salesService.saveDeliveryNoteMeta(this.quoteId!, {
        poNumber: this.poNumber || undefined,
        attention: this.attention || undefined,
        contactPerson: this.contactPerson || undefined
      }).pipe(map(() => updated)))
    ).subscribe({
      next: (updated) => {
        this.isSavingTracking = false;
        this.deliveryNote = { ...this.deliveryNote!, ...updated, carrier: this.carrier, trackingNumber: this.trackingNumber };
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Delivery details saved.' });
      },
      error: (err) => {
        console.error('Error saving delivery details:', err);
        this.isSavingTracking = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save delivery details. Please try again.' });
      }
    });
  }

  private toDateInputValue(date: Date | string): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().substring(0, 10);
  }

  private async generatePdfBlob(): Promise<Blob> {
    const element = document.getElementById('generate-dn-preview');
    if (!element) throw new Error('Preview element not found');
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    return pdf.output('blob');
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).replace(/^data:[^;]+;base64,/, ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async downloadPDF(): Promise<void> {
    if (this.isDownloading) return;
    this.isDownloading = true;
    try {
      const blob = await this.generatePdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DeliveryNote-${this.deliveryNote?.deliveryNumber || 'note'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to build PDF document.' });
    } finally {
      this.isDownloading = false;
    }
  }

  /** Opens the Send modal, pre-filled with an editable subject/message — confirmSendEmail()
   *  does the actual send once the seller confirms. */
  openSendModal(): void {
    if (!this.quote || !this.deliveryNote) return;
    const customer = this.selectedCustomer;
    const email = customer?.email || (this.quote.customerName as any)?.email || (this.quote.customerId as any)?.email || '';
    if (!email) {
      this.messageService.add({ severity: 'warn', summary: 'Missing Email', detail: 'Could not find a recipient email address for this customer.' });
      return;
    }
    const company = this.merchantInfo?.companyName || this.merchantInfo?.name || 'our company';
    this.emailSubject = `Delivery Note ${this.deliveryNote.deliveryNumber} from ${company}`;
    this.emailMessage = `Hi ${customer?.name || 'there'},\n\nPlease find attached the delivery note ${this.deliveryNote.deliveryNumber} for your order.`;
    this.showSendModal = true;
  }

  async confirmSendEmail(): Promise<void> {
    if (this.isEmailing || !this.quote || !this.deliveryNote) return;

    const customer = this.selectedCustomer;
    const email = customer?.email || (this.quote.customerName as any)?.email || (this.quote.customerId as any)?.email || '';
    if (!email) {
      this.messageService.add({ severity: 'warn', summary: 'Missing Email', detail: 'Could not find a recipient email address for this customer.' });
      return;
    }

    this.showSendModal = false;
    this.isEmailing = true;
    try {
      const blob = await this.generatePdfBlob();
      const base64Content = await this.blobToBase64(blob);
      const fileName = `DeliveryNote-${this.deliveryNote.deliveryNumber}.pdf`;
      const note = this.deliveryNote;

      const itemsRows = (note.items || []).map(item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.productName || ''}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.unit || ''}</td>
        </tr>`).join('');

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px;">
          <h2 style="color: #184440; margin-top: 0;">Delivery Note Details</h2>
          ${this.renderEmailMessageHtml(this.emailMessage || `Hi ${customer?.name || 'there'},\n\nPlease find attached the delivery note ${note.deliveryNumber} for your order.`)}
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Delivery Note #:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${note.deliveryNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Carrier:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${note.carrier || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Tracking #:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${note.trackingNumber || '—'}</td>
            </tr>
          </table>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb;">Item</th>
                <th style="text-align: center; padding: 8px; border-bottom: 2px solid #e5e7eb;">Quantity</th>
                <th style="text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb;">Unit</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
          <p style="margin-top: 24px;">Thank you for your business!</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #6b7280; text-align: center; margin-bottom: 0;">This is an automated notification from ${this.merchantInfo?.companyName || this.merchantInfo?.name || 'our company'}.</p>
        </div>`;

      const payload: SendSalesEmailRequest = {
        documentType: 'DELIVERY_NOTE',
        documentId: note.id!,
        documentNumber: note.deliveryNumber,
        to: email,
        subject: this.emailSubject || `Delivery Note ${note.deliveryNumber} from ${this.merchantInfo?.companyName || this.merchantInfo?.name || 'our company'}`,
        message: htmlBody,
        attachments: [{ fileName, base64Content, contentType: 'application/pdf', type: 'application/pdf' }],
        sentBy: this.merchantInfo?.email || 'system'
      };

      const response = await lastValueFrom(this.salesEmailService.send(payload));
      if (response?.status === 'FAILED' || response?.status === 'BOUNCED') {
        this.messageService.add({ severity: 'error', summary: 'Email Not Delivered', detail: response.failureReason || `Delivery to ${email} failed.` });
      } else {
        this.messageService.add({ severity: 'success', summary: 'Email Sent', detail: `Delivery note sent to ${email}.` });
      }
    } catch (err) {
      console.error('Error emailing delivery note:', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to send the delivery note by email.' });
    } finally {
      this.isEmailing = false;
    }
  }

  /** Renders the seller's free-typed email message (plain text from the Send modal's textarea)
   *  as safe HTML paragraphs — escaped so pasted/typed `<`, `>`, `&` can't break the email markup
   *  or inject anything, since this text goes straight into an HTML email body. */
  private renderEmailMessageHtml(message: string): string {
    const escape = (s: string) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return message
      .split(/\n{2,}/)
      .map(para => `<p style="margin:0 0 12px;">${escape(para).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  // ============================================================
  // NAVIGATION / UTIL
  // ============================================================

  goBack(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (this.quoteId) {
      const path = uuid ? ['/admin/sales/quotes', this.quoteId, uuid] : ['/admin/sales/quotes', this.quoteId];
      this.router.navigate(path);
      return;
    }
    this.router.navigate(['/admin/sales/sales-hub']);
  }

  finish(): void {
    this.goBack();
  }

  formatDate(date: unknown): string {
    return formatApiDate(date);
  }
}

// sales-document-email.service.ts
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { MessageService } from 'primeng/api';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, Quote, SalesDeliveryNote, SalesEmailAttachment, SendSalesEmailRequest } from '../../domain/sales/sales.dto';
import { SalesEmailService } from './sales-email.service';
import { NotificationService } from '../procurement/notification.service';
import { formatApiDate } from './date.util';

/** How a quote/invoice email went: SENT/QUEUED count as sent (the document can move to SENT),
 *  FAILED and NO_EMAIL don't. */
export type DocumentEmailResult = 'SENT' | 'QUEUED' | 'FAILED' | 'NO_EMAIL';

/** A send's outcome plus a human-readable line for an inline message. */
export interface DocumentEmailOutcome {
  result: DocumentEmailResult;
  detail: string;
}

export interface DocumentEmailOptions {
  /** Recipient — callers resolve it from whatever customer data they have. */
  to: string;
  recipientName: string;
  subject: string;
  /** The seller's free-typed message (plain text), shown above the itemised summary. */
  message: string;
  companyName: string;
  sentBy?: string;
  /** Accent colour of the chosen template (forms know it; detail pages fall back to the default). */
  accent?: string;
  /** Template section visibility — everything shows when omitted. */
  showSection?: (key: 'showTermsConditions' | 'showNotes' | 'showTaxBreakdown') => boolean;
  /** The rendered PDF to attach, if one could be produced. */
  pdfBlob?: Blob | null;
}

const DEFAULT_ACCENT = '#184440';

/**
 * Builds and sends the quote/invoice email — the same itemised HTML summary and PDF attachment
 * whether it's sent from the create form or later from the detail page's Send button. Shows the
 * result toast itself (through the app-wide MessageService, so it survives navigation).
 */
@Injectable({ providedIn: 'root' })
export class SalesDocumentEmailService {

  constructor(
    private salesEmailService: SalesEmailService,
    private messageService: MessageService,
    private notificationService: NotificationService
  ) {}

  isSent(result: DocumentEmailResult): boolean {
    return result === 'SENT' || result === 'QUEUED';
  }

  sendQuote(quote: Quote, opts: DocumentEmailOptions): Promise<DocumentEmailResult> {
    const addOpts = firstOptions(quote.additionalOptions);
    return this.send('QUOTE', 'Quote', {
      id: quote.id,
      number: quote.quoteNumber,
      title: 'Quotation Details',
      metaRows: [['Quotation Number', quote.quoteNumber], ['Valid Until', formatApiDate(quote.validUntil)]],
      doc: quote,
      terms: addOpts?.terms,
      notes: addOpts?.notes,
      attachments: addOpts?.attachments
    }, opts);
  }

  sendInvoice(invoice: Invoice, opts: DocumentEmailOptions): Promise<DocumentEmailResult> {
    const addOpts = firstOptions(invoice.additionalOptions);
    return this.send('INVOICE', 'Invoice', {
      id: invoice.id,
      number: invoice.invoiceNumber,
      title: 'Invoice Details',
      metaRows: [['Invoice Number', invoice.invoiceNumber], ['Due Date', formatApiDate(invoice.dueDate)]],
      doc: invoice,
      terms: addOpts?.terms,
      notes: invoice.notes || addOpts?.notes,
      attachments: addOpts?.attachments
    }, opts);
  }

  /**
   * Emails a payment receipt. The sales email endpoint has no RECEIPT document type, so this goes
   * through the general notification email endpoint, with the receipt PDF attached.
   */
  async sendReceipt(receipt: { number: string; total: number; paidNow?: number; balanceDue?: number; currency: string; invoiceNumber?: string },
                    opts: DocumentEmailOptions): Promise<DocumentEmailOutcome> {
    if (!opts.to) {
      const detail = 'Could not find a recipient email address for this customer.';
      this.messageService.add({ severity: 'warn', summary: 'Missing Email', detail });
      return { result: 'NO_EMAIL', detail };
    }
    const fmt = (n: number | undefined) => `${receipt.currency} ${(Number(n) || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    const accent = opts.accent || DEFAULT_ACCENT;
    const row = (label: string, value: string, bold = false) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; ${bold ? 'font-weight: bold;' : ''}">${label}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; ${bold ? 'font-weight: bold;' : ''}">${value}</td>
        </tr>`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px;">
        <h2 style="color: ${accent}; margin-top: 0;">Payment Receipt</h2>
        ${renderEmailMessageHtml(opts.message || `Dear ${opts.recipientName},\n\nThank you for your payment. Your receipt is attached.`)}
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
          ${row('Receipt Number', receipt.number)}
          ${receipt.invoiceNumber ? row('Invoice Number', receipt.invoiceNumber) : ''}
          ${row('Amount Received', fmt(receipt.paidNow), true)}
          ${row('Invoice Total', fmt(receipt.total))}
          ${row('Balance Due', fmt(receipt.balanceDue))}
        </table>
        <p style="margin-top: 24px;">Thank you for your business!</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #6b7280; text-align: center; margin-bottom: 0;">This is an automated notification from ${opts.companyName}.</p>
      </div>`;
    const attachments = opts.pdfBlob
      ? [{ fileName: `Receipt-${receipt.number}.pdf`, base64Content: await blobToBase64(opts.pdfBlob), contentType: 'application/pdf' }]
      : [];
    try {
      await lastValueFrom(this.notificationService.sendDirectEmail({
        to: opts.to,
        subject: opts.subject || `Payment Receipt ${receipt.number} from ${opts.companyName}`,
        body: html,
        html: true,
        tenant: tenantFromHost(),
        attachments
      }));
      return this.outcome('SENT', 'Email Sent', `Receipt ${receipt.number} was emailed to ${opts.to}.`);
    } catch (err) {
      console.error('[SalesDocumentEmailService] Failed to send receipt email:', err);
      return this.outcome('FAILED', 'Email Error', `The receipt could not be emailed${httpReason(err) ? ` (${httpReason(err)})` : ''}. Please try again.`);
    }
  }

  /**
   * Emails a delivery note: same request shape as quotes/invoices (via the sales email endpoint),
   * falling back to the general notification email endpoint if the sales endpoint rejects the
   * request outright — e.g. a backend that doesn't take DELIVERY_NOTE as a document type.
   */
  async sendDeliveryNote(note: SalesDeliveryNote, opts: DocumentEmailOptions): Promise<DocumentEmailOutcome> {
    if (!opts.to) {
      const detail = 'Could not find a recipient email address for this customer.';
      this.messageService.add({ severity: 'warn', summary: 'Missing Email', detail });
      return { result: 'NO_EMAIL', detail };
    }

    const html = buildDeliveryNoteEmailHtml(note, opts);
    const subject = opts.subject || `Delivery Note ${note.deliveryNumber} from ${opts.companyName}`;
    const pdf = opts.pdfBlob
      ? { fileName: `DeliveryNote-${note.deliveryNumber}.pdf`, base64Content: await blobToBase64(opts.pdfBlob), contentType: 'application/pdf' }
      : null;

    const payload: SendSalesEmailRequest = {
      documentType: 'DELIVERY_NOTE',
      documentId: note.id!,
      documentNumber: note.deliveryNumber,
      to: opts.to,
      cc: [],
      bcc: [],
      subject,
      message: html,
      attachments: pdf ? [{ ...pdf, type: 'application/pdf' }] : [],
      sentBy: opts.sentBy || 'system'
    };

    let rejected: unknown = null;
    try {
      const response = await lastValueFrom(this.salesEmailService.send(payload));
      // An empty reply (`{}`) means nothing was logged or sent — fall through to the general endpoint.
      if (!response?.status && response?.id == null) throw new Error('Sales email endpoint returned an empty response');
      if (response?.status === 'FAILED' || response?.status === 'BOUNCED') {
        return this.outcome('FAILED', 'Email Not Delivered', response.failureReason || `Delivery to ${opts.to} failed.`);
      }
      if (response?.status === 'PENDING') {
        return this.outcome('QUEUED', 'Email Queued', `Delivery note queued for delivery to ${opts.to}. It hasn't been confirmed sent yet.`);
      }
      return this.outcome('SENT', 'Email Sent', `Delivery note ${note.deliveryNumber} was emailed to ${opts.to}.`);
    } catch (err) {
      rejected = err;
      console.warn('[SalesDocumentEmailService] Sales email endpoint rejected the delivery note; trying the general email endpoint:', err);
    }

    try {
      await lastValueFrom(this.notificationService.sendDirectEmail({
        to: opts.to,
        subject,
        body: html,
        html: true,
        tenant: tenantFromHost(),
        attachments: pdf ? [pdf] : []
      }));
      return this.outcome('SENT', 'Email Sent', `Delivery note ${note.deliveryNumber} was emailed to ${opts.to}.`);
    } catch (err) {
      console.error('[SalesDocumentEmailService] Failed to send delivery note email:', rejected, err);
      return this.outcome('FAILED', 'Email Error', `The delivery note could not be emailed${httpReason(err) ? ` (${httpReason(err)})` : ''}. Please try again.`);
    }
  }

  private outcome(result: DocumentEmailResult, summary: string, detail: string): DocumentEmailOutcome {
    const severity = result === 'SENT' ? 'success' : result === 'QUEUED' ? 'info' : 'error';
    this.messageService.add({ severity, summary, detail });
    return { result, detail };
  }

  private async send(
    documentType: 'QUOTE' | 'INVOICE',
    label: string,
    d: { id: number; number: string; title: string; metaRows: [string, string][]; doc: Quote | Invoice; terms?: string; notes?: string; attachments?: any[] },
    opts: DocumentEmailOptions
  ): Promise<DocumentEmailResult> {
    if (!opts.to) {
      this.messageService.add({ severity: 'warn', summary: 'Missing Email', detail: 'Could not find recipient email address' });
      return 'NO_EMAIL';
    }

    // Carry over any files already attached to the document (Additional Options → Attachments)
    const attachments: SalesEmailAttachment[] = (d.attachments || [])
      .filter((a: any) => !!a.fileUrl)
      .map((a: any) => ({
        fileName: a.fileName || `${label}-${d.number}.pdf`,
        fileUrl: a.fileUrl as string,
        size: a.size || 0,
        type: a.type || 'application/pdf'
      }));
    if (opts.pdfBlob) {
      attachments.push({
        fileName: `${label}-${d.number}.pdf`,
        base64Content: await blobToBase64(opts.pdfBlob),
        contentType: 'application/pdf',
        type: 'application/pdf'
      });
    }

    const payload: SendSalesEmailRequest = {
      documentType,
      documentId: d.id,
      documentNumber: d.number,
      to: opts.to,
      cc: [],
      bcc: [],
      subject: opts.subject || `${label} ${d.number} from ${opts.companyName}`,
      message: buildDocumentEmailHtml(d, opts),
      attachments,
      sentBy: opts.sentBy || 'system'
    };

    try {
      const response = await lastValueFrom(this.salesEmailService.send(payload));
      // A 2xx only means the backend logged the send request — trust `status`, not the HTTP call.
      // An empty reply (`{}`) means nothing was logged or sent, so it isn't a success either.
      if (!response?.status && response?.id == null) {
        this.messageService.add({ severity: 'error', summary: 'Email Not Sent', detail: `The server didn't confirm the ${label.toLowerCase()} email to ${opts.to}. Please try again.` });
        return 'FAILED';
      }
      if (response?.status === 'FAILED' || response?.status === 'BOUNCED') {
        this.messageService.add({ severity: 'error', summary: 'Email Not Delivered', detail: response.failureReason || `Delivery to ${opts.to} failed.` });
        return 'FAILED';
      }
      if (response?.status === 'PENDING') {
        this.messageService.add({ severity: 'info', summary: 'Email Queued', detail: `${label} queued for delivery to ${opts.to}. It hasn't been confirmed sent yet.` });
        return 'QUEUED';
      }
      this.messageService.add({ severity: 'success', summary: 'Email Sent', detail: `${label} sent successfully to ${opts.to}` });
      return 'SENT';
    } catch (err) {
      console.error(`[SalesDocumentEmailService] Failed to send ${label.toLowerCase()} email:`, err);
      const reason = httpReason(err);
      this.messageService.add({ severity: 'error', summary: 'Email Error', detail: `Failed to send ${label.toLowerCase()} email${reason ? ` (${reason})` : ''}.` });
      return 'FAILED';
    }
  }
}

function tenantFromHost(): string {
  const h = window.location.hostname;
  return (h.includes('localhost') || h.includes('127.0.0.1')) ? 'optimax' : h.split('.')[0] || 'optimax';
}

/** The backend's own message for a failed request, when it sent one. */
function httpReason(err: any): string {
  const body = err?.error;
  return (typeof body === 'string' ? body : body?.message || body?.error) || err?.statusText || '';
}

function buildDeliveryNoteEmailHtml(note: SalesDeliveryNote, opts: DocumentEmailOptions): string {
  const rows = (note.items || []).map(item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 600;">${item.productName || ''}</div>
            ${item.description ? `<div style="font-size: 12px; color: #6b7280;">${item.description}</div>` : ''}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.unit || ''}</td>
        </tr>`).join('');
  const accent = opts.accent || DEFAULT_ACCENT;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px;">
      <h2 style="color: ${accent}; margin-top: 0;">Delivery Note Details</h2>
      ${renderEmailMessageHtml(opts.message || `Hi ${opts.recipientName},\n\nPlease find attached the delivery note ${note.deliveryNumber} for your order.`)}
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Delivery Note #:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${note.deliveryNumber}</td>
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
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top: 24px;">Thank you for your business!</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 12px; color: #6b7280; text-align: center; margin-bottom: 0;">This is an automated notification from ${opts.companyName}.</p>
    </div>`;
}

function firstOptions(opts: any): any {
  return Array.isArray(opts) ? opts[0] : opts;
}

/** Renders the seller's plain-text message as escaped HTML paragraphs, so typed `<`, `>`, `&`
 *  can't break the email markup or inject anything. */
export function renderEmailMessageHtml(message: string): string {
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return message
    .split(/\n{2,}/)
    .map(para => `<p style="margin:0 0 12px;">${escape(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function buildDocumentEmailHtml(
  d: { title: string; metaRows: [string, string][]; doc: Quote | Invoice; terms?: string; notes?: string },
  opts: DocumentEmailOptions
): string {
  const doc: any = d.doc;
  const accent = opts.accent || DEFAULT_ACCENT;
  const show = (key: 'showTermsConditions' | 'showNotes' | 'showTaxBreakdown') => opts.showSection ? opts.showSection(key) : true;
  const currency = doc.currency || 'NGN';
  const fmt = (n: number) => (n || 0).toLocaleString('en-NG');

  const itemsRows = (doc.items || []).map((item: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 600;">${item.productName || ''}</div>
            ${item.description ? `<div style="font-size: 12px; color: #6b7280;">${item.description}</div>` : ''}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${currency} ${fmt(item.unitPrice)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.taxRate || 0}%</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${currency} ${fmt(item.total)}</td>
        </tr>`).join('');

  const chargeRows = (doc.additionalCharges || []).map((amount: number, i: number) => `
        <tr>
          <td colspan="4" style="padding: 4px 8px; text-align: right; color: #374151;">${doc.additionalChargesLabel?.[i] || 'Additional Charge'}:</td>
          <td style="padding: 4px 8px; text-align: right;">${currency} ${fmt(amount)}</td>
        </tr>`).join('');

  const section = (heading: string, text: string | undefined, key: 'showTermsConditions' | 'showNotes') =>
    text && show(key)
      ? `<div style="margin-top: 16px;">
           <h3 style="font-size: 14px; color: ${accent}; margin-bottom: 6px;">${heading}</h3>
           <p style="font-size: 13px; color: #374151; white-space: pre-line;">${text}</p>
         </div>`
      : '';

  const taxRow = show('showTaxBreakdown')
    ? `<tr>
          <td colspan="4" style="padding: 4px 8px; text-align: right; color: #374151;">Tax:</td>
          <td style="padding: 4px 8px; text-align: right;">${currency} ${fmt(doc.taxAmount)}</td>
        </tr>`
    : '';

  const metaRows = d.metaRows.map(([label, value]) => `
        <tr>
          <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e5e7eb;">${label}:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${value}</td>
        </tr>`).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px;">
      <h2 style="color: ${accent}; margin-top: 0;">${d.title}</h2>
      ${renderEmailMessageHtml(opts.message || `Dear ${opts.recipientName},`)}
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">${metaRows}</table>

      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb;">Item</th>
            <th style="text-align: center; padding: 8px; border-bottom: 2px solid #e5e7eb;">Qty</th>
            <th style="text-align: right; padding: 8px; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
            <th style="text-align: right; padding: 8px; border-bottom: 2px solid #e5e7eb;">Tax</th>
            <th style="text-align: right; padding: 8px; border-bottom: 2px solid #e5e7eb;">Line Total</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px;">
        <tr>
          <td colspan="4" style="padding: 4px 8px; text-align: right; color: #374151;">Subtotal:</td>
          <td style="padding: 4px 8px; text-align: right;">${currency} ${fmt(doc.subtotal)}</td>
        </tr>
        ${doc.discountAmount ? `<tr>
          <td colspan="4" style="padding: 4px 8px; text-align: right; color: #374151;">Discount:</td>
          <td style="padding: 4px 8px; text-align: right;">-${currency} ${fmt(doc.discountAmount)}</td>
        </tr>` : ''}
        ${taxRow}
        ${chargeRows}
        <tr>
          <td colspan="4" style="padding: 10px 8px; text-align: right; font-weight: bold; border-top: 2px solid ${accent};">Total Amount:</td>
          <td style="padding: 10px 8px; text-align: right; font-weight: bold; border-top: 2px solid ${accent}; color: ${accent};">${currency} ${fmt(doc.totalAmount)}</td>
        </tr>
      </table>

      ${section('Terms &amp; Conditions', d.terms, 'showTermsConditions')}
      ${section('Notes', d.notes, 'showNotes')}

      <p style="margin-top: 24px;">Thank you for your business!</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 12px; color: #6b7280; text-align: center; margin-bottom: 0;">This is an automated notification from ${opts.companyName}.</p>
    </div>`;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).replace(/^data:[^;]+;base64,/, ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Renders an on-screen document sheet to a multi-page A4 PDF — what the detail pages download
 *  and attach. `pdf-printing-active` lets the sheet's stylesheet adjust for capture. */
export async function renderElementToPdf(element: HTMLElement, scale = 3): Promise<Blob> {
  element.classList.add('pdf-printing-active');
  try {
    await new Promise(resolve => setTimeout(resolve, 300));
    // scale 3 → ~290dpi across an A4 width, which keeps text crisp when the page is zoomed/printed
    const canvas = await html2canvas(element, {
      scale, useCORS: true, allowTaint: true, backgroundColor: '#ffffff',
      scrollX: 0, scrollY: 0, windowWidth: Math.max(element.scrollWidth, 794)
    });
    const imgData = canvas.toDataURL('image/png');
    const pageH = 297;
    const imgW = 210;
    const imgH = (canvas.height * imgW) / canvas.width;
    // Without compression jsPDF stores the page image raw: ~19 MB at scale 3, which the email
    // endpoint can't take (it answered `{}` and sent nothing). Compressed it's a few hundred KB.
    // The alias embeds the image once even when it spans several pages.
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH, 'document-page', 'FAST');
    let heightLeft = imgH - pageH;
    while (heightLeft > 0) {
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, heightLeft - imgH, imgW, imgH, 'document-page', 'FAST');
      heightLeft -= pageH;
    }
    return pdf.output('blob');
  } finally {
    element.classList.remove('pdf-printing-active');
  }
}

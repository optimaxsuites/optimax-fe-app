import { of, throwError } from 'rxjs';

import { SalesDocumentEmailService, renderEmailMessageHtml } from './sales-document-email.service';

describe('SalesDocumentEmailService', () => {
  let service: SalesDocumentEmailService;
  let emailApi: { send: jasmine.Spy };
  let messages: { add: jasmine.Spy };
  let notifications: { sendDirectEmail: jasmine.Spy };

  const quote: any = {
    id: 5, quoteNumber: 'QUO-5', currency: 'NGN', validUntil: '2026-11-01',
    items: [{ productName: 'Widget', quantity: 2, unitPrice: 100, total: 200 }],
    subtotal: 200, taxAmount: 15, totalAmount: 215,
    additionalOptions: { terms: 'Pay in 30 days', attachments: [{ fileName: 'spec.pdf', fileUrl: 'https://x/spec.pdf' }] }
  };
  const opts = (over: any = {}) => ({
    to: 'a@acme.com', recipientName: 'Acme Co', subject: 'Your quote', message: 'Hi <team> & co',
    companyName: 'Optimax', ...over
  });

  beforeEach(() => {
    emailApi = { send: jasmine.createSpy('send').and.returnValue(of({ status: 'SENT' })) };
    messages = { add: jasmine.createSpy('add') };
    notifications = { sendDirectEmail: jasmine.createSpy('sendDirectEmail').and.returnValue(of({})) };
    service = new SalesDocumentEmailService(emailApi as any, messages as any, notifications as any);
  });

  it('sends the quote with its itemised summary, escaped message, existing attachments and the PDF', async () => {
    const result = await service.sendQuote(quote, opts({ pdfBlob: new Blob(['pdf']) }));

    expect(result).toBe('SENT');
    const payload = emailApi.send.calls.mostRecent().args[0];
    expect(payload).toEqual(jasmine.objectContaining({ documentType: 'QUOTE', documentId: 5, documentNumber: 'QUO-5', to: 'a@acme.com', subject: 'Your quote' }));
    expect(payload.message).toContain('Hi &lt;team&gt; &amp; co');
    expect(payload.message).toContain('Widget');
    expect(payload.message).toContain('Pay in 30 days');
    expect(payload.attachments.map((a: any) => a.fileName)).toEqual(['spec.pdf', 'Quote-QUO-5.pdf']);
    expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
  });

  it('hides sections the template turns off', async () => {
    await service.sendQuote(quote, opts({ showSection: () => false }));
    const html = emailApi.send.calls.mostRecent().args[0].message;
    expect(html).not.toContain('Pay in 30 days');
    expect(html).not.toContain('Tax:');
  });

  it('counts a queued email as sent, but not a failed or bounced one', async () => {
    emailApi.send.and.returnValue(of({ status: 'PENDING' }));
    expect(service.isSent(await service.sendQuote(quote, opts()))).toBeTrue();

    emailApi.send.and.returnValue(of({ status: 'BOUNCED', failureReason: 'No mailbox' }));
    expect(service.isSent(await service.sendQuote(quote, opts()))).toBeFalse();

    emailApi.send.and.returnValue(throwError(() => new Error('down')));
    expect(await service.sendQuote(quote, opts())).toBe('FAILED');
  });

  it('does not call the API without a recipient', async () => {
    expect(await service.sendInvoice({ ...quote, invoiceNumber: 'INV-1' }, opts({ to: '' }))).toBe('NO_EMAIL');
    expect(emailApi.send).not.toHaveBeenCalled();
  });

  it('renders paragraphs and line breaks from the plain-text message', () => {
    expect(renderEmailMessageHtml('Line 1\nLine 2\n\nPara 2')).toBe(
      '<p style="margin:0 0 12px;">Line 1<br>Line 2</p><p style="margin:0 0 12px;">Para 2</p>');
  });

  describe('sendDeliveryNote', () => {
    const note: any = { id: 7, deliveryNumber: 'DN-7', status: 'PENDING', customerAddress: '', items: [{ productName: 'Widget', quantity: 2, unit: 'pcs' }] };

    it('sends the same request shape as quotes/invoices (cc/bcc included) and reports success', async () => {
      const outcome = await service.sendDeliveryNote(note, opts({ pdfBlob: new Blob(['pdf']) }));
      const payload = emailApi.send.calls.mostRecent().args[0];
      expect(payload).toEqual(jasmine.objectContaining({ documentType: 'DELIVERY_NOTE', documentId: 7, cc: [], bcc: [] }));
      expect(payload.message).toContain('Widget');
      expect(payload.attachments[0].fileName).toBe('DeliveryNote-DN-7.pdf');
      expect(outcome.result).toBe('SENT');
      expect(notifications.sendDirectEmail).not.toHaveBeenCalled();
    });

    it('falls back to the general email endpoint when the sales one rejects the request', async () => {
      emailApi.send.and.returnValue(throwError(() => ({ status: 400, error: { message: 'Unknown documentType' } })));
      const outcome = await service.sendDeliveryNote(note, opts());
      expect(notifications.sendDirectEmail).toHaveBeenCalledWith(jasmine.objectContaining({ to: 'a@acme.com', html: true }));
      expect(outcome.result).toBe('SENT');
    });

    it('explains the failure when both endpoints fail', async () => {
      emailApi.send.and.returnValue(throwError(() => ({ status: 400 })));
      notifications.sendDirectEmail.and.returnValue(throwError(() => ({ status: 500, error: { message: 'SMTP down' } })));
      const outcome = await service.sendDeliveryNote(note, opts());
      expect(outcome.result).toBe('FAILED');
      expect(outcome.detail).toContain('SMTP down');
    });

    it('does not fall back for a delivery failure — that address really bounced', async () => {
      emailApi.send.and.returnValue(of({ status: 'BOUNCED', failureReason: 'No mailbox' }));
      const outcome = await service.sendDeliveryNote(note, opts());
      expect(outcome).toEqual({ result: 'FAILED', detail: 'No mailbox' });
      expect(notifications.sendDirectEmail).not.toHaveBeenCalled();
    });
  });
});

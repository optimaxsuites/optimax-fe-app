import { of, throwError } from 'rxjs';

import { SalesDocumentEmailService, renderEmailMessageHtml } from './sales-document-email.service';

describe('SalesDocumentEmailService', () => {
  let service: SalesDocumentEmailService;
  let emailApi: { send: jasmine.Spy };
  let messages: { add: jasmine.Spy };

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
    service = new SalesDocumentEmailService(emailApi as any, messages as any);
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
});

import { of } from 'rxjs';
import { FormBuilder } from '@angular/forms';

import { QuoteFormComponent } from './quote-form.component';
import { Quote } from '../../../../domain/sales/sales.dto';

describe('QuoteFormComponent: lands on the quote detail page after delivery', () => {
  let component: QuoteFormComponent;
  let router: { navigate: jasmine.Spy };
  let messages: { add: jasmine.Spy };
  let salesService: jasmine.SpyObj<any>;
  let documentEmail: jasmine.SpyObj<any>;

  const quote = { id: 5, quoteNumber: 'QUO-5', customerName: { name: 'Acme Co' } } as unknown as Quote;

  beforeEach(() => {
    router = { navigate: jasmine.createSpy('navigate') };
    messages = { add: jasmine.createSpy('add') };
    salesService = jasmine.createSpyObj('SalesService', ['updateQuote', 'markQuoteSent']);
    salesService.markQuoteSent.and.callFake((q: any) => of({ ...q, status: 'SENT' }));
    documentEmail = jasmine.createSpyObj('SalesDocumentEmailService', ['sendQuote', 'isSent']);
    documentEmail.isSent.and.callFake((r: string) => r === 'SENT' || r === 'QUEUED');
    component = new QuoteFormComponent(
      messages as any,
      new FormBuilder(),
      { snapshot: { paramMap: { get: () => null }, queryParamMap: { get: () => null } } } as any,
      salesService,
      { getProfile: () => of(null) } as any,
      { detectChanges: () => {} } as any,
      {} as any,
      jasmine.createSpyObj('SalesEmailService', ['send']),
      router as any,
      documentEmail
    );
  });

  const expectDetailPage = () =>
    expect(router.navigate).toHaveBeenCalledWith(['/admin/sales/quotes', 5], { replaceUrl: true });

  it('goes to the detail page right after a PDF download', async () => {
    spyOn<any>(component, 'downloadQuotePdf').and.returnValue(Promise.resolve(null));
    await (component as any).handleDeliveryAction(quote, 'pdf');
    expectDetailPage();
  });

  it('waits for the Send modal for email, then goes to the detail page once sent', async () => {
    const send = spyOn<any>(component, 'sendQuoteEmail').and.returnValue(Promise.resolve());
    await (component as any).handleDeliveryAction(quote, 'email');
    expect(component.showSendQuoteModal).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();

    await component.confirmSendQuote();

    expect(send).toHaveBeenCalled();
    expectDetailPage();
  });

  it('downloads and emails for "both", then goes to the detail page', async () => {
    component.selectedAction = 'both';
    const download = spyOn<any>(component, 'downloadQuotePdf').and.returnValue(Promise.resolve(null));
    spyOn<any>(component, 'sendQuoteEmail').and.returnValue(Promise.resolve());
    await (component as any).handleDeliveryAction(quote, 'both');

    await component.confirmSendQuote();

    expect(download).toHaveBeenCalled();
    expectDetailPage();
  });

  it('still goes to the (already saved) quote when the Send modal is closed without sending', async () => {
    await (component as any).handleDeliveryAction(quote, 'email');

    component.skipSendQuote();

    expect(component.showSendQuoteModal).toBeFalse();
    expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'info' }));
    expectDetailPage();
  });

  describe('emailing marks the quote SENT, so its detail page offers Customer Accepted / Declined', () => {
    beforeEach(() => spyOn<any>(component, 'generateQuotePDF').and.returnValue(Promise.resolve(new Blob(['x']))));

    it('marks it SENT once the email has gone out', async () => {
      documentEmail.sendQuote.and.returnValue(Promise.resolve('SENT'));
      expect(await (component as any).sendQuoteEmail({ ...quote, customerName: { name: 'Acme', email: 'a@acme.com' } })).toBeTrue();
      expect(salesService.markQuoteSent).toHaveBeenCalledWith(jasmine.objectContaining({ id: 5 }));
    });

    it('leaves it a DRAFT (Send Quote stays on its detail page) when the email fails', async () => {
      documentEmail.sendQuote.and.returnValue(Promise.resolve('FAILED'));
      expect(await (component as any).sendQuoteEmail({ ...quote, customerName: { name: 'Acme', email: 'a@acme.com' } })).toBeFalse();
      expect(salesService.markQuoteSent).not.toHaveBeenCalled();
    });

    it('a PDF-only delivery never marks it SENT', async () => {
      spyOn<any>(component, 'downloadQuotePdf').and.returnValue(Promise.resolve(null));
      await (component as any).handleDeliveryAction(quote, 'pdf');
      expect(salesService.markQuoteSent).not.toHaveBeenCalled();
      expect(documentEmail.sendQuote).not.toHaveBeenCalled();
    });
  });
});

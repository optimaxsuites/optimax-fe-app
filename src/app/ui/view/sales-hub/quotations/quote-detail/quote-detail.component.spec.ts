import { of, Subject } from 'rxjs';

import { QuoteDetailComponent } from './quote-detail.component';
import { SalesService } from '../../../../service/sales/sales.service';
import { Quote, QuoteStatus } from '../../../../domain/sales/sales.dto';

describe('QuoteDetailComponent', () => {
  let component: QuoteDetailComponent;
  let salesService: jasmine.SpyObj<SalesService>;
  let documentEmail: jasmine.SpyObj<any>;

  const quote = (over: Partial<Quote> = {}): Quote => ({
    id: 1, quoteNumber: 'QUO-1', status: 'SENT' as QuoteStatus, ...over
  } as Quote);

  const activatedRoute = (paramMap$: any = of({ get: () => null } as any)) => ({
    paramMap: paramMap$,
    snapshot: { paramMap: { get: () => null } }
  } as any);

  beforeEach(() => {
    salesService = jasmine.createSpyObj<SalesService>('SalesService', [
      'getQuoteById', 'updateQuote', 'getOrderIdLookup', 'getQuoteDeliveryNoteMap',
      'hasSignedDeliveryNoteDocument', 'convertQuote', 'saveSignedDeliveryNoteDocument', 'recordSignedDeliveryNote', 'markQuoteSent', 'getCustomers'
    ]);
    salesService.getQuoteById.and.returnValue(of(null));
    salesService.getOrderIdLookup.and.returnValue(of({ byQuoteId: new Map(), byTransactionId: new Map() }));
    salesService.getQuoteDeliveryNoteMap.and.returnValue(of(new Map()));
    salesService.hasSignedDeliveryNoteDocument.and.returnValue(false);
    documentEmail = jasmine.createSpyObj('SalesDocumentEmailService', ['sendQuote', 'isSent']);
    documentEmail.isSent.and.callFake((r: string) => r === 'SENT' || r === 'QUEUED');
    component = new QuoteDetailComponent(
      { add: jasmine.createSpy('add') } as any,
      activatedRoute(),
      { navigate: jasmine.createSpy('navigate') } as any,
      salesService,
      documentEmail
    );
  });

  describe('canDeleteQuote / deleteQuote: same guard as QuoteListComponent', () => {
    it('is false once a quote has been converted (or on its way there)', () => {
      component.quote = quote({ status: 'CONVERTED' as QuoteStatus });
      expect(component.canDeleteQuote()).toBeFalse();

      component.quote = quote({ status: 'ACCEPTED' as QuoteStatus });
      expect(component.canDeleteQuote()).toBeFalse();
    });

    it('is true for a quote that never produced a downstream order', () => {
      component.quote = quote({ status: 'SENT' as QuoteStatus });
      expect(component.canDeleteQuote()).toBeTrue();
    });

    it('refuses to open the archive-confirm modal for a converted quote', () => {
      component.quote = quote({ status: 'CONVERTED' as QuoteStatus });

      component.deleteQuote();

      expect(component.showDeleteQuoteModal).toBeFalse();
    });
  });

  describe('confirmDeleteQuote: archives (marks EXPIRED), does not actually delete', () => {
    it('calls updateQuote with status EXPIRED, never a real delete endpoint', () => {
      salesService.updateQuote.and.returnValue(of({ ...quote(), status: 'EXPIRED' } as any));
      component.quote = quote({ id: 5, status: 'SENT' as QuoteStatus });

      component.confirmDeleteQuote();

      expect(salesService.updateQuote).toHaveBeenCalledWith('5', { status: 'EXPIRED' });
    });

    it('does not call updateQuote at all for an already-converted quote (defensive re-check)', () => {
      component.quote = quote({ status: 'CONVERTED' as QuoteStatus });

      component.confirmDeleteQuote();

      expect(salesService.updateQuote).not.toHaveBeenCalled();
    });
  });

  describe('Generate Delivery Note / Upload Signed Delivery Note / Create Invoice progression', () => {
    it('only offers Generate Delivery Note once CONVERTED and no note exists yet', () => {
      component.quote = quote({ status: 'SENT' as QuoteStatus });
      expect(component.canGenerateDeliveryNote()).toBeFalse();

      component.quote = quote({ status: 'CONVERTED' as QuoteStatus });
      component.deliveryNote = null;
      expect(component.canGenerateDeliveryNote()).toBeTrue();

      component.deliveryNote = { id: 1 } as any;
      expect(component.canGenerateDeliveryNote()).toBeFalse();
    });

    it('only offers Upload Signed Delivery Note once a note exists and no signed copy is uploaded yet', () => {
      component.quote = quote({ status: 'CONVERTED' as QuoteStatus });
      component.deliveryNote = null;
      expect(component.canUploadSignedDeliveryNote()).toBeFalse();

      component.deliveryNote = { id: 1 } as any;
      salesService.hasSignedDeliveryNoteDocument.and.returnValue(false);
      expect(component.canUploadSignedDeliveryNote()).toBeTrue();

      salesService.hasSignedDeliveryNoteDocument.and.returnValue(true);
      expect(component.canUploadSignedDeliveryNote()).toBeFalse();
    });

    it('only offers Create Invoice once the signed delivery note has been uploaded', () => {
      component.quote = quote({ status: 'CONVERTED' as QuoteStatus });
      salesService.hasSignedDeliveryNoteDocument.and.returnValue(false);
      expect(component.canCreateInvoice()).toBeFalse();

      salesService.hasSignedDeliveryNoteDocument.and.returnValue(true);
      expect(component.canCreateInvoice()).toBeTrue();
    });
  });

  describe('navigation staleness: reloads when the route id actually changes', () => {
    it('calls getQuoteById again for a second id pushed through the same paramMap subscription', () => {
      const paramMap$ = new Subject<any>();
      salesService.getQuoteById.and.returnValue(of(quote({ id: 1 })));
      const c = new QuoteDetailComponent(
        { add: jasmine.createSpy('add') } as any,
        activatedRoute(paramMap$.asObservable()),
        { navigate: jasmine.createSpy('navigate') } as any,
        salesService,
        documentEmail
      );

      c.ngOnInit();
      paramMap$.next({ get: () => '1' } as any);
      expect(salesService.getQuoteById).toHaveBeenCalledWith('1');

      paramMap$.next({ get: () => '2' } as any);
      expect(salesService.getQuoteById).toHaveBeenCalledWith('2');
      expect(salesService.getQuoteById).toHaveBeenCalledTimes(2);
    });
  });

  describe('submitSignedDeliveryNote: records who received the goods on the delivery note', () => {
    const file: any = { fileName: 'signed.pdf', base64Content: 'x', contentType: 'application/pdf', uploadedAt: new Date() };

    beforeEach(() => {
      component.quote = quote({ status: 'CONVERTED' as QuoteStatus });
      component.deliveryNote = { id: 5, deliveryNumber: 'DN-5' } as any;
      component.openSignedDeliveryNoteModal();
      component.signedDeliveryNoteFileName = 'signed.pdf';
      (component as any).signedDeliveryNoteFile = file;
    });

    it('requires the receiver\'s name before it can be submitted', () => {
      expect(component.canSubmitSignedDeliveryNote).toBeFalse();
      component.submitSignedDeliveryNote();
      expect(salesService.recordSignedDeliveryNote).not.toHaveBeenCalled();
    });

    it('sends the file, the note and the receiver details, and keeps the updated note', () => {
      component.receivedByName = '  J. Okafor ';
      component.receivedDate = '2026-10-15';
      const savedNote = { id: 5, receivedByName: 'J. Okafor' } as any;
      salesService.recordSignedDeliveryNote.and.returnValue(of({ quote: quote({ id: 1 }), note: savedNote, noteSaved: true }));

      component.submitSignedDeliveryNote();

      expect(salesService.recordSignedDeliveryNote).toHaveBeenCalledWith(1, file, jasmine.objectContaining({ id: 5 }), {
        receivedByName: 'J. Okafor', receivedAt: new Date('2026-10-15').toISOString()
      });
      expect(component.deliveryNote).toBe(savedNote);
      expect(component.showSignedDeliveryNoteModal).toBeFalse();
    });
  });

  describe('Send Quote: the same email dialog, a real email, then Customer Accepted / Declined', () => {
    const draft = () => quote({ id: 1, quoteNumber: 'QUO-1', status: 'DRAFT' as QuoteStatus, customerName: { id: 7, name: 'Acme Co', email: 'a@acme.com' } as any });

    it('opens the email dialog pre-filled with an editable subject and message', () => {
      component.quote = draft();
      component.sendQuote();
      expect(component.showSendQuoteModal).toBeTrue();
      expect(component.emailSubject).toContain('QUO-1');
      expect(component.emailMessage).toContain('Acme Co');
    });

    it('emails the edited subject/message to the customer, then marks the quote SENT', async () => {
      component.quote = draft();
      component.sendQuote();
      component.emailSubject = 'Edited subject';
      documentEmail.sendQuote.and.returnValue(Promise.resolve('SENT'));
      salesService.markQuoteSent.and.returnValue(of(quote({ id: 1, status: 'SENT' as QuoteStatus })));

      await component.confirmSendQuote();

      expect(documentEmail.sendQuote).toHaveBeenCalledWith(jasmine.objectContaining({ id: 1 }), jasmine.objectContaining({ to: 'a@acme.com', subject: 'Edited subject' }));
      expect(component.quote?.status).toBe('SENT');
      expect(component.showSendQuoteModal).toBeFalse();
    });

    it('looks the email up from the customer list when the quote does not carry it', async () => {
      component.quote = quote({ id: 1, status: 'DRAFT' as QuoteStatus, customerName: { id: 7, name: 'Acme Co' } as any });
      salesService.getCustomers.and.returnValue(of({ data: [{ id: 7, email: 'lookup@acme.com' }], total: 1 } as any));
      documentEmail.sendQuote.and.returnValue(Promise.resolve('SENT'));
      salesService.markQuoteSent.and.returnValue(of(quote({ id: 1, status: 'SENT' as QuoteStatus })));

      await component.confirmSendQuote();

      expect(documentEmail.sendQuote).toHaveBeenCalledWith(jasmine.any(Object), jasmine.objectContaining({ to: 'lookup@acme.com' }));
    });

    it('keeps the dialog open and the quote a DRAFT when the email fails', async () => {
      component.quote = draft();
      component.sendQuote();
      documentEmail.sendQuote.and.returnValue(Promise.resolve('FAILED'));

      await component.confirmSendQuote();

      expect(salesService.markQuoteSent).not.toHaveBeenCalled();
      expect(component.quote?.status).toBe('DRAFT');
      expect(component.showSendQuoteModal).toBeTrue();
    });
  });
});

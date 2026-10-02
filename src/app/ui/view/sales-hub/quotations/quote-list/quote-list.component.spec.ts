import { of } from 'rxjs';

import { QuoteListComponent } from './quote-list.component';
import { SalesService } from '../../../../service/sales/sales.service';
import { Quote, QuoteStatus } from '../../../../domain/sales/sales.dto';

describe('QuoteListComponent', () => {
  let component: QuoteListComponent;
  let salesService: jasmine.SpyObj<SalesService>;

  const quote = (over: Partial<Quote> = {}): Quote => ({
    id: 1, quoteNumber: 'QUO-1', status: 'SENT' as QuoteStatus, ...over
  } as Quote);

  beforeEach(() => {
    salesService = jasmine.createSpyObj<SalesService>('SalesService', [
      'getQuotes', 'getCustomers', 'deleteQuote', 'getOrderIdLookup', 'getQuoteDeliveryNoteMap',
      'hasSignedDeliveryNoteDocument', 'convertQuote', 'saveSignedDeliveryNoteDocument'
    ]);
    salesService.getQuotes.and.returnValue(of({ data: [], total: 0 } as any));
    salesService.getCustomers.and.returnValue(of({ data: [], total: 0 } as any));
    salesService.getOrderIdLookup.and.returnValue(of({ byQuoteId: new Map(), byTransactionId: new Map() }));
    salesService.getQuoteDeliveryNoteMap.and.returnValue(of(new Map()));
    salesService.hasSignedDeliveryNoteDocument.and.returnValue(false);
    component = new QuoteListComponent(
      { add: jasmine.createSpy('add') } as any,
      salesService,
      { snapshot: { paramMap: { get: () => null } } } as any,
      { navigate: jasmine.createSpy('navigate') } as any
    );
  });

  describe('canDeleteQuote', () => {
    it('is true for DRAFT/SENT/DECLINED/EXPIRED quotes', () => {
      (['DRAFT', 'SENT', 'DECLINED', 'EXPIRED'] as QuoteStatus[]).forEach(status => {
        expect(component.canDeleteQuote(quote({ status }))).toBeTrue();
      });
    });

    it('is false once a quote has been converted to a real order (or is on its way there)', () => {
      expect(component.canDeleteQuote(quote({ status: 'CONVERTED' as QuoteStatus }))).toBeFalse();
      expect(component.canDeleteQuote(quote({ status: 'ACCEPTED' as QuoteStatus }))).toBeFalse();
    });
  });

  describe('deleteQuote: refuses to even open the confirm modal for a converted quote', () => {
    it('blocks a CONVERTED quote with a warning instead of showing the delete modal', () => {
      const q = quote({ status: 'CONVERTED' as QuoteStatus });

      component.deleteQuote(q);

      expect(component.showDeleteModal).toBeFalse();
    });

    it('opens the confirm modal for a deletable quote', () => {
      const q = quote({ status: 'DRAFT' as QuoteStatus });

      component.deleteQuote(q);

      expect(component.showDeleteModal).toBeTrue();
      expect(component.pendingDeleteQuote).toBe(q);
    });
  });

  describe('confirmDeleteQuote: defensive re-check even if somehow reached for a converted quote', () => {
    it('does not call the real delete API for a CONVERTED quote', () => {
      (component as any).pendingDeleteQuote = quote({ status: 'CONVERTED' as QuoteStatus });

      component.confirmDeleteQuote();

      expect(salesService.deleteQuote).not.toHaveBeenCalled();
    });

    it('calls the real delete API for a deletable quote', () => {
      salesService.deleteQuote.and.returnValue(of(undefined as any));
      (component as any).pendingDeleteQuote = quote({ id: 3, status: 'DRAFT' as QuoteStatus });

      component.confirmDeleteQuote();

      expect(salesService.deleteQuote).toHaveBeenCalledWith('3');
    });
  });

  describe('Generate Delivery Note / Upload Signed Delivery Note / Create Invoice progression', () => {
    it('only offers Generate Delivery Note once CONVERTED and no note exists yet', () => {
      const q = quote({ id: 9, status: 'CONVERTED' as QuoteStatus });
      component.deliveryNoteByQuoteId = new Map();
      expect(component.canGenerateDeliveryNote(q)).toBeTrue();

      component.deliveryNoteByQuoteId = new Map([[9, { id: 1 } as any]]);
      expect(component.canGenerateDeliveryNote(q)).toBeFalse();
    });

    it('also offers it for an ACCEPTED quote, same as CONVERTED', () => {
      const q = quote({ id: 9, status: 'ACCEPTED' as QuoteStatus });
      component.deliveryNoteByQuoteId = new Map();
      expect(component.canGenerateDeliveryNote(q)).toBeTrue();
    });

    it('only offers Create Invoice once the signed delivery note has been uploaded', () => {
      const q = quote({ id: 9, status: 'CONVERTED' as QuoteStatus });
      salesService.hasSignedDeliveryNoteDocument.and.returnValue(false);
      expect(component.canCreateInvoice(q)).toBeFalse();

      salesService.hasSignedDeliveryNoteDocument.and.returnValue(true);
      expect(component.canCreateInvoice(q)).toBeTrue();
    });
  });

  describe('bulkDeleteQuotes', () => {
    beforeEach(() => {
      spyOn(window, 'confirm').and.returnValue(true);
    });

    it('only deletes the selected quotes that are actually deletable, skipping converted ones', () => {
      salesService.deleteQuote.and.returnValue(of(undefined as any));
      component.quotes = [
        quote({ id: 1, status: 'DRAFT' as QuoteStatus }),
        quote({ id: 2, status: 'CONVERTED' as QuoteStatus })
      ];
      component.selectedQuoteIds = [1, 2];

      component.bulkDeleteQuotes();

      expect(salesService.deleteQuote).toHaveBeenCalledTimes(1);
      expect(salesService.deleteQuote).toHaveBeenCalledWith('1');
    });

    it('does nothing (no API calls) when every selected quote is already converted', () => {
      component.quotes = [quote({ id: 1, status: 'CONVERTED' as QuoteStatus })];
      component.selectedQuoteIds = [1];

      component.bulkDeleteQuotes();

      expect(salesService.deleteQuote).not.toHaveBeenCalled();
    });
  });
});

import { of } from 'rxjs';

import { GenerateDeliveryNoteComponent } from './generate-delivery-note.component';
import { SalesService } from '../../../../service/sales/sales.service';
import { SalesEmailService } from '../../../../service/sales/sales-email.service';
import { DeliveryNote, Quote } from '../../../../domain/sales/sales.dto';

describe('GenerateDeliveryNoteComponent', () => {
  let component: GenerateDeliveryNoteComponent;
  let salesService: jasmine.SpyObj<SalesService>;
  let salesEmailService: jasmine.SpyObj<SalesEmailService>;

  const quote = (over: Partial<Quote> = {}): Quote => ({
    id: 1, quoteNumber: 'QUO-1', status: 'CONVERTED', customerId: { id: 1, name: 'Acme Co' } as any, items: [], ...over
  } as Quote);

  const note = (over: Partial<DeliveryNote> = {}): DeliveryNote => ({
    id: 1, deliveryNumber: 'DN-1', status: 'PENDING', customerId: 1, customerAddress: '1 Main St', items: [], ...over
  } as DeliveryNote);

  const activatedRoute = (quoteId: string | null = '1') => ({
    snapshot: { queryParamMap: { get: () => quoteId }, paramMap: { get: () => null } }
  } as any);

  beforeEach(() => {
    salesService = jasmine.createSpyObj<SalesService>('SalesService', [
      'getQuoteById', 'getCustomers', 'getMyMerchantInfo', 'getQuoteDeliveryNoteMap',
      'saveQuoteLpoDocument', 'getOrCreateDeliveryNoteForQuote', 'updateDeliveryNote'
    ]);
    salesEmailService = jasmine.createSpyObj<SalesEmailService>('SalesEmailService', ['send']);

    salesService.getQuoteById.and.returnValue(of(quote()));
    salesService.getCustomers.and.returnValue(of({ data: [{ id: 1, name: 'Acme Co', email: 'a@acme.com' }], total: 1 } as any));
    salesService.getMyMerchantInfo.and.returnValue(of({ id: 1, name: 'Merchant' } as any));
    salesService.getQuoteDeliveryNoteMap.and.returnValue(of(new Map()));

    component = new GenerateDeliveryNoteComponent(
      activatedRoute(),
      { navigate: jasmine.createSpy('navigate') } as any,
      salesService,
      salesEmailService,
      { add: jasmine.createSpy('add') } as any
    );
  });

  it('starts on step 1 for a quote with no delivery note yet', () => {
    component.ngOnInit();
    expect(component.currentStep).toBe(1);
    expect(component.quote?.id).toBe(1);
  });

  it('skips straight to step 2 when a delivery note already exists for this quote', () => {
    salesService.getQuoteDeliveryNoteMap.and.returnValue(of(new Map([[1, note()]])));

    component.ngOnInit();

    expect(component.currentStep).toBe(2);
    expect(component.deliveryNote?.id).toBe(1);
  });

  describe('submitLpo', () => {
    beforeEach(() => component.ngOnInit());

    it('does nothing without a file selected', () => {
      component.submitLpo();
      expect(salesService.saveQuoteLpoDocument).not.toHaveBeenCalled();
    });

    it('saves the LPO, generates the delivery note, and advances to step 2', () => {
      (component as any).lpoFile = { fileName: 'lpo.pdf', base64Content: 'xyz', contentType: 'application/pdf', uploadedAt: new Date() };
      salesService.saveQuoteLpoDocument.and.returnValue(of(quote()));
      salesService.getOrCreateDeliveryNoteForQuote.and.returnValue(of(note()));

      component.submitLpo();

      expect(salesService.saveQuoteLpoDocument).toHaveBeenCalledWith(1, jasmine.objectContaining({ fileName: 'lpo.pdf' }));
      expect(salesService.getOrCreateDeliveryNoteForQuote).toHaveBeenCalledWith(1);
      expect(component.currentStep).toBe(2);
      expect(component.deliveryNote?.id).toBe(1);
    });

    it('surfaces an error and stays on step 1 if the delivery note could not be generated', () => {
      (component as any).lpoFile = { fileName: 'lpo.pdf', base64Content: 'xyz', contentType: 'application/pdf', uploadedAt: new Date() };
      salesService.saveQuoteLpoDocument.and.returnValue(of(quote()));
      salesService.getOrCreateDeliveryNoteForQuote.and.returnValue(of(null));

      component.submitLpo();

      expect(component.currentStep).toBe(1);
      expect(component.isSavingLpo).toBeFalse();
    });
  });
});

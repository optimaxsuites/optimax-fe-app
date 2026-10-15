import { of } from 'rxjs';

import { GenerateDeliveryNoteComponent } from './generate-delivery-note.component';
import { SalesService } from '../../../../service/sales/sales.service';
import { SalesEmailService } from '../../../../service/sales/sales-email.service';
import { SalesDeliveryNote, SalesLpo, Quote } from '../../../../domain/sales/sales.dto';

describe('GenerateDeliveryNoteComponent', () => {
  let component: GenerateDeliveryNoteComponent;
  let salesService: jasmine.SpyObj<SalesService>;
  let salesEmailService: jasmine.SpyObj<SalesEmailService>;

  const quote = (over: Partial<Quote> = {}): Quote => ({
    id: 1, quoteNumber: 'QUO-1', status: 'CONVERTED', customerId: { id: 1, name: 'Acme Co' } as any, items: [], ...over
  } as Quote);

  const note = (over: Partial<SalesDeliveryNote> = {}): SalesDeliveryNote => ({
    id: 1, deliveryNumber: 'DN-1', status: 'PENDING', customerId: 1, customerAddress: '1 Main St', items: [], ...over
  } as SalesDeliveryNote);

  const activatedRoute = (quoteId: string | null = '1') => ({
    snapshot: { queryParamMap: { get: () => quoteId }, paramMap: { get: () => null } }
  } as any);

  const lpoFile = () => ({ fileName: 'lpo.pdf', base64Content: 'xyz', contentType: 'application/pdf', uploadedAt: new Date() });

  beforeEach(() => {
    salesService = jasmine.createSpyObj<SalesService>('SalesService', [
      'getQuoteById', 'getCustomers', 'getMyMerchantInfo', 'getQuoteDeliveryNoteMap',
      'saveQuoteLpoDocument', 'getOrCreateDeliveryNoteForQuote', 'updateDeliveryNote',
      'getDeliveryNoteMeta', 'getSalesLpoForQuote', 'createSalesLpo', 'updateSalesLpo', 'getQuoteLpoDocument'
    ]);
    salesEmailService = jasmine.createSpyObj<SalesEmailService>('SalesEmailService', ['send']);

    salesService.getQuoteById.and.returnValue(of(quote()));
    salesService.getCustomers.and.returnValue(of({ data: [{ id: 1, name: 'Acme Co', email: 'a@acme.com' }], total: 1 } as any));
    salesService.getMyMerchantInfo.and.returnValue(of({ id: 1, name: 'Merchant' } as any));
    salesService.getQuoteDeliveryNoteMap.and.returnValue(of(new Map()));
    salesService.getDeliveryNoteMeta.and.returnValue({});
    salesService.getSalesLpoForQuote.and.returnValue(of(null));
    salesService.getQuoteLpoDocument.and.returnValue(null);
    salesService.createSalesLpo.and.callFake(body => of({ ...body, id: 9 } as SalesLpo));
    salesService.updateSalesLpo.and.callFake((id, body) => of({ ...body, id } as SalesLpo));
    salesService.updateDeliveryNote.and.callFake((id, body) => of(body as SalesDeliveryNote));

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

  describe('reopening a quote that already has a delivery note', () => {
    it('goes to the template step when no template was picked', () => {
      salesService.getQuoteDeliveryNoteMap.and.returnValue(of(new Map([[1, note()]])));

      component.ngOnInit();

      expect(component.currentStep).toBe(2);
      expect(component.deliveryNote?.id).toBe(1);
    });

    it('restores the note\'s own template, date and contacts, and the LPO number from the SalesLpo', () => {
      salesService.getQuoteDeliveryNoteMap.and.returnValue(of(new Map([[1, note({
        templateId: 'minimal', deliveryDate: '2026-07-15T00:00:00.000Z', attention: 'J. Okafor', contactPerson: 'A. Bello'
      })]])));
      salesService.getSalesLpoForQuote.and.returnValue(of({ id: 9, lpoNumber: 'PR-1' } as SalesLpo));

      component.ngOnInit();

      expect(component.currentStep).toBe(3);
      expect(component.selectedTemplate?.id).toBe('minimal');
      expect(component.deliveryDate).toBe('2026-07-15');
      expect(component.attention).toBe('J. Okafor');
      expect(component.contactPerson).toBe('A. Bello');
      expect(component.poNumber).toBe('PR-1');
    });

    it('falls back to the legacy values stored on the quote for notes generated before the backend fields existed', () => {
      salesService.getQuoteDeliveryNoteMap.and.returnValue(of(new Map([[1, note({ createdAt: '2026-07-01' })]])));
      salesService.getDeliveryNoteMeta.and.returnValue({ templateId: 'compact', deliveryDate: '2026-07-20', poNumber: 'OLD-1' });

      component.ngOnInit();

      expect(component.selectedTemplate?.id).toBe('compact');
      expect(component.deliveryDate).toBe('2026-07-20');
      expect(component.poNumber).toBe('OLD-1');
    });
  });

  describe('submitLpo', () => {
    beforeEach(() => component.ngOnInit());

    it('does nothing without a file selected', () => {
      component.submitLpo();
      expect(salesService.saveQuoteLpoDocument).not.toHaveBeenCalled();
    });

    it('keeps the file on the quote, records a SalesLpo, and creates the note linked to it', () => {
      (component as any).lpoFile = lpoFile();
      component.poNumberInput = 'PR-1';
      salesService.saveQuoteLpoDocument.and.returnValue(of(quote()));
      salesService.getOrCreateDeliveryNoteForQuote.and.returnValue(of(note()));

      component.submitLpo();

      expect(salesService.saveQuoteLpoDocument).toHaveBeenCalledWith(1, jasmine.objectContaining({ fileName: 'lpo.pdf' }));
      expect(salesService.createSalesLpo).toHaveBeenCalledWith(jasmine.objectContaining({
        lpoNumber: 'PR-1', quoteId: 1, status: 'RECEIVED',
        document: jasmine.objectContaining({ fileName: 'lpo.pdf', fileUrl: '' })
      }));
      expect(salesService.getOrCreateDeliveryNoteForQuote).toHaveBeenCalledWith(1, jasmine.objectContaining({ lpoId: 9 }));
      expect(component.currentStep).toBe(2);
      expect(component.lpo?.id).toBe(9);
    });

    it('updates the quote\'s existing SalesLpo on a re-upload instead of creating another', () => {
      component.lpo = { id: 4, lpoNumber: 'OLD', status: 'RECEIVED' } as SalesLpo;
      (component as any).lpoFile = lpoFile();
      component.poNumberInput = 'NEW';
      salesService.saveQuoteLpoDocument.and.returnValue(of(quote()));
      salesService.getOrCreateDeliveryNoteForQuote.and.returnValue(of(note()));

      component.submitLpo();

      expect(salesService.updateSalesLpo).toHaveBeenCalledWith(4, jasmine.objectContaining({ lpoNumber: 'NEW' }));
      expect(salesService.createSalesLpo).not.toHaveBeenCalled();
    });

    it('stays on step 1 if the delivery note could not be saved', () => {
      (component as any).lpoFile = lpoFile();
      salesService.saveQuoteLpoDocument.and.returnValue(of(quote()));
      salesService.getOrCreateDeliveryNoteForQuote.and.returnValue(of(note({ id: undefined })));

      component.submitLpo();

      expect(component.currentStep).toBe(1);
      expect(component.isSavingLpo).toBeFalse();
    });
  });

  describe('confirmTemplate', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.deliveryNote = note();
      component.currentStep = 2;
    });

    it('saves the picked template on the note and advances to the preview', () => {
      (component as any).templatePicker = { selectedTemplate: { id: 'emirates' } };

      component.confirmTemplate();

      expect(salesService.updateDeliveryNote).toHaveBeenCalledWith(1, jasmine.objectContaining({ templateId: 'emirates', deliveryNumber: 'DN-1' }));
      expect(component.currentStep).toBe(3);
    });

    it('falls back to the first template when the picker is not available', () => {
      component.confirmTemplate();

      expect(salesService.updateDeliveryNote).toHaveBeenCalledWith(1, jasmine.objectContaining({ templateId: 'standard' }));
    });
  });

  describe('saveDetails', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.deliveryNote = note();
    });

    it('PUTs the full note with the edited date and contacts', () => {
      component.deliveryDate = '2026-07-15';
      component.attention = 'J. Okafor';

      component.saveDetails();

      expect(salesService.updateDeliveryNote).toHaveBeenCalledWith(1, jasmine.objectContaining({
        deliveryNumber: 'DN-1', attention: 'J. Okafor', deliveryDate: new Date('2026-07-15').toISOString()
      }));
      expect(component.isSavingDetails).toBeFalse();
    });

    it('saves a changed LPO number to the SalesLpo and links it', () => {
      component.lpo = { id: 9, lpoNumber: 'PR-1' } as SalesLpo;
      component.poNumber = 'PR-2';

      component.saveDetails();

      expect(salesService.updateSalesLpo).toHaveBeenCalledWith(9, jasmine.objectContaining({ lpoNumber: 'PR-2' }));
      expect(salesService.updateDeliveryNote).toHaveBeenCalledWith(1, jasmine.objectContaining({ lpoId: 9 }));
    });

    it('creates a SalesLpo for a legacy note that only had the number stored on the quote', () => {
      component.poNumber = 'OLD-1';

      component.saveDetails();

      expect(salesService.createSalesLpo).toHaveBeenCalledWith(jasmine.objectContaining({ lpoNumber: 'OLD-1', quoteId: 1 }));
      expect(salesService.updateDeliveryNote).toHaveBeenCalledWith(1, jasmine.objectContaining({ lpoId: 9 }));
    });

    it('leaves the SalesLpo alone when the number has not changed', () => {
      component.lpo = { id: 9, lpoNumber: 'PR-1' } as SalesLpo;
      component.poNumber = 'PR-1';

      component.saveDetails();

      expect(salesService.updateSalesLpo).not.toHaveBeenCalled();
      expect(salesService.createSalesLpo).not.toHaveBeenCalled();
    });
  });

  describe('openSendModal / confirmSendEmail: compose-before-send', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.deliveryNote = note({ id: 7, deliveryNumber: 'DN-7' });
    });

    it('opens the modal pre-filled with an editable subject/message instead of sending immediately', () => {
      component.openSendModal();

      expect(component.showSendModal).toBeTrue();
      expect(component.emailSubject).toContain('DN-7');
      expect(component.emailMessage).toContain('DN-7');
      expect(salesEmailService.send).not.toHaveBeenCalled();
    });

    it('warns instead of opening the modal when the customer has no email', () => {
      component.customers = [{ id: 1, name: 'Acme Co' } as any]; // no email field
      component.openSendModal();
      expect(component.showSendModal).toBeFalse();
    });

    it('sends with the edited subject/message once confirmed, closing the modal first', async () => {
      component.showSendModal = true;
      component.emailSubject = 'Custom subject';
      component.emailMessage = 'Custom message body';
      salesEmailService.send.and.returnValue(of({ status: 'SENT' } as any));
      spyOn<any>(component, 'generatePdfBlob').and.returnValue(Promise.resolve(new Blob(['x'])));

      await component.confirmSendEmail();

      expect(component.showSendModal).toBeFalse();
      expect(salesEmailService.send).toHaveBeenCalledWith(jasmine.objectContaining({
        subject: 'Custom subject',
        message: jasmine.stringContaining('Custom message body')
      }));
      expect(salesService.updateDeliveryNote).toHaveBeenCalledWith(7, jasmine.objectContaining({ sentAt: jasmine.any(String) }));
    });
  });
});

import { of } from 'rxjs';

import { GenerateDeliveryNoteComponent } from './generate-delivery-note.component';
import { SalesService } from '../../../../service/sales/sales.service';
import { SalesEmailService } from '../../../../service/sales/sales-email.service';
import { SalesDeliveryNote, SalesLpo, Quote } from '../../../../domain/sales/sales.dto';

describe('GenerateDeliveryNoteComponent', () => {
  let component: GenerateDeliveryNoteComponent;
  let salesService: jasmine.SpyObj<SalesService>;
  let salesEmailService: jasmine.SpyObj<SalesEmailService>;
  let documentEmail: jasmine.SpyObj<any>;

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
      'getDeliveryNoteMeta', 'getSalesLpoForQuote', 'createSalesLpo', 'updateSalesLpo', 'getQuoteLpoDocument', 'fillMissingFromQuote', 'getDeliveryNoteLogo', 'saveDeliveryNoteLogo'
    ]);
    salesEmailService = jasmine.createSpyObj<SalesEmailService>('SalesEmailService', ['send']);
    documentEmail = jasmine.createSpyObj('SalesDocumentEmailService', ['sendDeliveryNote', 'isSent']);
    documentEmail.isSent.and.callFake((r: string) => r === 'SENT' || r === 'QUEUED');

    salesService.getQuoteById.and.returnValue(of(quote()));
    salesService.getCustomers.and.returnValue(of({ data: [{ id: 1, name: 'Acme Co', email: 'a@acme.com' }], total: 1 } as any));
    salesService.getMyMerchantInfo.and.returnValue(of({ id: 1, name: 'Merchant' } as any));
    salesService.getQuoteDeliveryNoteMap.and.returnValue(of(new Map()));
    salesService.getDeliveryNoteMeta.and.returnValue({});
    salesService.getSalesLpoForQuote.and.returnValue(of(null));
    salesService.getQuoteLpoDocument.and.returnValue(null);
    salesService.fillMissingFromQuote.and.returnValue(null);
    salesService.getDeliveryNoteLogo.and.returnValue(null);
    salesService.saveDeliveryNoteLogo.and.returnValue(of(quote()));
    salesService.createSalesLpo.and.callFake(body => of({ ...body, id: 9 } as SalesLpo));
    salesService.updateSalesLpo.and.callFake((id, body) => of({ ...body, id } as SalesLpo));
    salesService.updateDeliveryNote.and.callFake((id, body) => of(body as SalesDeliveryNote));

    component = new GenerateDeliveryNoteComponent(
      activatedRoute(),
      { navigate: jasmine.createSpy('navigate') } as any,
      salesService,
      salesEmailService,
      { add: jasmine.createSpy('add') } as any,
      documentEmail
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

  describe('fixing up notes created without their lines or address', () => {
    it('fills a note\'s missing items and address from its quote and saves them', () => {
      salesService.getQuoteDeliveryNoteMap.and.returnValue(of(new Map([[1, note({ items: [], customerAddress: '' })]])));
      salesService.fillMissingFromQuote.and.callFake((n: any) => ({
        ...n, customerAddress: '12 Broad St, Lagos', items: [{ productName: 'Widget', quantity: 3, unit: '' }]
      }));

      component.ngOnInit();

      expect(salesService.fillMissingFromQuote).toHaveBeenCalledWith(jasmine.objectContaining({ id: 1 }), jasmine.objectContaining({ id: 1 }), jasmine.anything());
      expect(salesService.updateDeliveryNote).toHaveBeenCalledWith(1, jasmine.objectContaining({
        customerAddress: '12 Broad St, Lagos',
        items: [jasmine.objectContaining({ productName: 'Widget', quantity: 3 })]
      }));
      expect(component.deliveryNote?.items.length).toBe(1);
    });

    it('leaves a complete note alone', () => {
      salesService.getQuoteDeliveryNoteMap.and.returnValue(of(new Map([[1, note({ items: [{ productName: 'Widget', quantity: 3, unit: '' }], customerAddress: '1 Main St' })]])));

      component.ngOnInit();

      expect(salesService.updateDeliveryNote).not.toHaveBeenCalled();
    });

    it('reads epoch-second dates from the API instead of landing in January 1970', () => {
      const seconds = Math.floor(new Date('2026-10-20T00:00:00Z').getTime() / 1000);
      salesService.getQuoteDeliveryNoteMap.and.returnValue(of(new Map([[1, note({ deliveryDate: seconds as any })]])));

      component.ngOnInit();

      expect(component.deliveryDate).toBe('2026-10-20');
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
      (component as any).lpoFileChanged = true;
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
      (component as any).lpoFileChanged = true;
      component.poNumberInput = 'NEW';
      salesService.saveQuoteLpoDocument.and.returnValue(of(quote()));
      salesService.getOrCreateDeliveryNoteForQuote.and.returnValue(of(note()));

      component.submitLpo();

      expect(salesService.updateSalesLpo).toHaveBeenCalledWith(4, jasmine.objectContaining({ lpoNumber: 'NEW' }));
      expect(salesService.createSalesLpo).not.toHaveBeenCalled();
    });

    it('stays on step 1 if the delivery note could not be saved', () => {
      (component as any).lpoFile = lpoFile();
      (component as any).lpoFileChanged = true;
      salesService.saveQuoteLpoDocument.and.returnValue(of(quote()));
      salesService.getOrCreateDeliveryNoteForQuote.and.returnValue(of(note({ id: undefined })));

      component.submitLpo();

      expect(component.currentStep).toBe(1);
      expect(component.isSavingLpo).toBeFalse();
    });
  });

  describe('LPO step: one click on Continue', () => {
    beforeEach(() => component.ngOnInit());

    it('waits for the chosen file to finish reading before Continue can run', () => {
      (component as any).lpoFile = lpoFile();
      component.isReadingLpo = true;
      component.submitLpo();
      expect(salesService.saveQuoteLpoDocument).not.toHaveBeenCalled();
    });

    it('fills a freshly created note from its quote straight away', () => {
      (component as any).lpoFile = lpoFile();
      (component as any).lpoFileChanged = true;
      salesService.saveQuoteLpoDocument.and.returnValue(of(quote()));
      salesService.getOrCreateDeliveryNoteForQuote.and.returnValue(of(note()));

      component.submitLpo();

      expect(component.currentStep).toBe(2);
      expect(salesService.fillMissingFromQuote).toHaveBeenCalledWith(jasmine.objectContaining({ id: 1 }), jasmine.anything(), jasmine.anything());
    });
  });

  describe('logo', () => {
    beforeEach(() => component.ngOnInit());

    it('starts from the quote\'s logo', () => {
      salesService.getDeliveryNoteLogo.and.returnValue('quote-logo.png');
      component.ngOnInit();
      expect(component.logo).toBe('quote-logo.png');
    });

    it('saves an uploaded logo on the quote along with the details', () => {
      component.deliveryNote = note();
      (component as any).pendingLogo = { fileName: 'logo.png', base64Content: 'abc', contentType: 'image/png', uploadedAt: 'now' };

      component.saveDetails();

      expect(salesService.saveDeliveryNoteLogo).toHaveBeenCalledWith(1, jasmine.objectContaining({ fileName: 'logo.png' }));
      expect(salesService.updateDeliveryNote).toHaveBeenCalled();
      expect((component as any).pendingLogo).toBeNull();
    });

    it('does not re-save when no new logo was picked', () => {
      component.deliveryNote = note();
      component.saveDetails();
      expect(salesService.saveDeliveryNoteLogo).not.toHaveBeenCalled();
    });
  });

  describe('Save Draft — on every step, saves and stays put', () => {
    it('step 1: saves the LPO file and number without generating the note', () => {
      component.ngOnInit();
      (component as any).lpoFile = lpoFile();
      (component as any).lpoFileChanged = true;
      component.poNumberInput = 'PR-1';
      salesService.saveQuoteLpoDocument.and.returnValue(of(quote()));

      component.saveDraft();

      expect(salesService.saveQuoteLpoDocument).toHaveBeenCalled();
      expect(salesService.createSalesLpo).toHaveBeenCalledWith(jasmine.objectContaining({ lpoNumber: 'PR-1' }));
      expect(salesService.getOrCreateDeliveryNoteForQuote).not.toHaveBeenCalled();
      expect(component.currentStep).toBe(1);
      expect(component.isSavingDraft).toBeFalse();
    });

    it('step 1: refuses when there is nothing to save yet', () => {
      component.ngOnInit();
      component.saveDraft();
      expect(salesService.createSalesLpo).not.toHaveBeenCalled();
    });

    it('step 2: saves the template currently picked', () => {
      component.ngOnInit();
      component.deliveryNote = note();
      component.currentStep = 2;
      (component as any).templatePicker = { selectedTemplate: { id: 'compact' } };

      component.saveDraft();

      expect(salesService.updateDeliveryNote).toHaveBeenCalledWith(1, jasmine.objectContaining({ templateId: 'compact' }));
      expect(component.currentStep).toBe(2);
    });

    it('step 3: saves the delivery details', () => {
      component.ngOnInit();
      component.deliveryNote = note();
      component.currentStep = 3;
      component.attention = 'J. Okafor';

      component.saveDraft();

      expect(salesService.updateDeliveryNote).toHaveBeenCalledWith(1, jasmine.objectContaining({ attention: 'J. Okafor' }));
      expect(component.currentStep).toBe(3);
    });

    it('restores a previously saved LPO file so it needn\'t be uploaded again', () => {
      salesService.getQuoteLpoDocument.and.returnValue({ fileName: 'saved-lpo.pdf', base64Content: 'x', contentType: 'application/pdf', uploadedAt: 'then' });
      component.ngOnInit();
      expect(component.lpoFileName).toBe('saved-lpo.pdf');
    });
  });

  describe('moving between steps', () => {
    beforeEach(() => {
      salesService.getQuoteDeliveryNoteMap.and.returnValue(of(new Map([[1, note({ templateId: 'minimal' })]])));
      component.ngOnInit();
    });

    it('can go back to any earlier step', () => {
      expect(component.currentStep).toBe(3);
      component.goToStep(2);
      expect(component.currentStep).toBe(2);
      component.goToStep(1);
      expect(component.currentStep).toBe(1);
    });

    it('continuing from step 1 with nothing changed reuses the LPO and the note, and keeps edits', () => {
      component.lpo = { id: 9, lpoNumber: 'PR-1', status: 'RECEIVED' } as SalesLpo;
      component.poNumberInput = 'PR-1';
      (component as any).lpoFile = lpoFile();
      component.deliveryDate = '2026-12-01';
      salesService.getOrCreateDeliveryNoteForQuote.and.returnValue(of(note()));
      component.goToStep(1);

      component.submitLpo();

      expect(salesService.saveQuoteLpoDocument).not.toHaveBeenCalled();
      expect(salesService.updateSalesLpo).not.toHaveBeenCalled();
      expect(salesService.createSalesLpo).not.toHaveBeenCalled();
      expect(component.currentStep).toBe(2);
      expect(component.deliveryDate).toBe('2026-12-01');
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

  describe('routing to the delivery note detail page', () => {
    const router = () => (component as any).router.navigate as jasmine.Spy;

    beforeEach(() => {
      component.ngOnInit();
      component.deliveryNote = note({ id: 7 });
    });

    it('goes there right after the PDF downloads', async () => {
      spyOn<any>(component, 'generatePdfBlob').and.returnValue(Promise.resolve(new Blob(['x'])));
      await component.downloadPDF();
      expect(router()).toHaveBeenCalledWith(['/admin/sales/delivery-notes', 7], { replaceUrl: true, state: undefined });
    });

    it('goes there on Done', () => {
      component.finish();
      expect(router()).toHaveBeenCalledWith(['/admin/sales/delivery-notes', 7], { replaceUrl: true, state: undefined });
    });

    it('stays put when the email fails, so it can be retried', async () => {
      component.customers = [{ id: 1, name: 'Acme Co', email: 'a@acme.com' } as any];
      documentEmail.sendDeliveryNote.and.returnValue(Promise.resolve({ result: 'FAILED', detail: 'Delivery failed.' }));
      spyOn<any>(component, 'generatePdfBlob').and.returnValue(Promise.resolve(new Blob(['x'])));

      await component.confirmSendEmail();

      expect(router()).not.toHaveBeenCalled();
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

    it('sends the edited subject/message through the shared email service, then shows the result on the detail page', async () => {
      component.showSendModal = true;
      component.emailSubject = 'Custom subject';
      component.emailMessage = 'Custom message body';
      documentEmail.sendDeliveryNote.and.returnValue(Promise.resolve({ result: 'SENT', detail: 'Delivery note DN-7 was emailed to a@acme.com.' }));
      spyOn<any>(component, 'generatePdfBlob').and.returnValue(Promise.resolve(new Blob(['x'])));

      await component.confirmSendEmail();

      expect(component.showSendModal).toBeFalse();
      expect(documentEmail.sendDeliveryNote).toHaveBeenCalledWith(jasmine.objectContaining({ id: 7 }), jasmine.objectContaining({
        to: 'a@acme.com', subject: 'Custom subject', message: 'Custom message body', pdfBlob: jasmine.any(Blob)
      }));
      expect(salesService.updateDeliveryNote).toHaveBeenCalledWith(7, jasmine.objectContaining({ sentAt: jasmine.any(String) }));
      expect((component as any).router.navigate).toHaveBeenCalledWith(['/admin/sales/delivery-notes', 7], {
        replaceUrl: true, state: { flash: { severity: 'success', text: 'Delivery note DN-7 was emailed to a@acme.com.' } }
      });
    });

    it('stays on step 3 with the reason shown inline when the email fails', async () => {
      documentEmail.sendDeliveryNote.and.returnValue(Promise.resolve({ result: 'FAILED', detail: 'The delivery note could not be emailed (Bad request).' }));
      spyOn<any>(component, 'generatePdfBlob').and.returnValue(Promise.resolve(new Blob(['x'])));

      await component.confirmSendEmail();

      expect(component.emailOutcome).toEqual({ severity: 'error', text: 'The delivery note could not be emailed (Bad request).' });
      expect((component as any).router.navigate).not.toHaveBeenCalled();
      expect(salesService.updateDeliveryNote).not.toHaveBeenCalledWith(7, jasmine.objectContaining({ sentAt: jasmine.any(String) }));
    });

    it('still sends, without the attachment, when the PDF cannot be rendered', async () => {
      documentEmail.sendDeliveryNote.and.returnValue(Promise.resolve({ result: 'SENT', detail: 'ok' }));
      spyOn<any>(component, 'generatePdfBlob').and.returnValue(Promise.reject(new Error('canvas')));

      await component.confirmSendEmail();

      expect(documentEmail.sendDeliveryNote).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ pdfBlob: null }));
    });
  });
});

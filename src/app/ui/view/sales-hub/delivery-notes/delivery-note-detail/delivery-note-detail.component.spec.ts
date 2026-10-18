import { of, Subject, throwError } from 'rxjs';

import { DeliveryNoteDetailComponent } from './delivery-note-detail.component';
import { SalesService } from '../../../../service/sales/sales.service';
import { SalesDeliveryNote } from '../../../../domain/sales/sales.dto';

describe('DeliveryNoteDetailComponent', () => {
  let component: DeliveryNoteDetailComponent;
  let salesService: jasmine.SpyObj<SalesService>;

  const note = (over: Partial<SalesDeliveryNote> = {}): SalesDeliveryNote => ({
    id: 1, deliveryNumber: 'DN-1', status: 'PENDING', items: [], customerAddress: '', ...over
  } as SalesDeliveryNote);

  const activatedRoute = (paramMap$: any = of({ get: () => null } as any)) => ({
    paramMap: paramMap$,
    snapshot: { paramMap: { get: () => null } }
  } as any);

  beforeEach(() => {
    salesService = jasmine.createSpyObj<SalesService>('SalesService', [
      'getDeliveryNoteById', 'updateDeliveryNoteStatus', 'getCustomers', 'getMyMerchantInfo',
      'getOrderIdLookup', 'getSalesandTransactionsById', 'getDeliveryNoteMeta', 'getSalesLpoById', 'getSalesLpoForQuote',
      'deleteDeliveryNote', 'updateDeliveryNote', 'verifySalesLpo', 'rejectSalesLpo', 'deleteSalesLpo',
      'getQuoteById', 'hasSignedDeliveryNoteDocument', 'fillMissingFromQuote', 'getDeliveryNoteLogo', 'deliveryAddressFor',
      'quoteCustomer', 'getQuoteLpoDocument', 'errorReason'
    ]);
    salesService.errorReason.and.callFake((err: any) => err?.error?.message || '');
    salesService.quoteCustomer.and.callFake((q: any) => q?.customerName && typeof q.customerName === 'object' ? q.customerName : null);
    salesService.getQuoteLpoDocument.and.callFake((q: any) => q?.additionalOptions?.lpoDocument || null);
    salesService.getDeliveryNoteLogo.and.returnValue(null);
    salesService.deliveryAddressFor.and.returnValue('');
    salesService.fillMissingFromQuote.and.returnValue(null);
    salesService.getQuoteById.and.returnValue(of(null));
    salesService.hasSignedDeliveryNoteDocument.and.returnValue(false);
    salesService.getDeliveryNoteById.and.returnValue(of(null));
    salesService.getCustomers.and.returnValue(of({ data: [{ id: 1, name: 'Acme Co' }], total: 1 } as any));
    salesService.getMyMerchantInfo.and.returnValue(of({ id: 1, name: 'Merchant' } as any));
    salesService.getOrderIdLookup.and.returnValue(of({ byQuoteId: new Map(), byTransactionId: new Map(), byInvoiceId: new Map() }));
    salesService.getSalesandTransactionsById.and.returnValue(of(null));
    salesService.getDeliveryNoteMeta.and.returnValue({});
    salesService.getSalesLpoById.and.returnValue(of(null));
    salesService.getSalesLpoForQuote.and.returnValue(of(null));
    component = new DeliveryNoteDetailComponent(
      activatedRoute(),
      { navigate: jasmine.createSpy('navigate') } as any,
      salesService,
      { add: jasmine.createSpy('add') } as any
    );
  });

  describe('status guards', () => {
    it('only a PENDING note can be edited or marked dispatched', () => {
      component.note = note({ status: 'PENDING' });
      expect(component.canEdit()).toBeTrue();
      expect(component.canMarkDispatched()).toBeTrue();
      expect(component.canMarkDelivered()).toBeFalse();
    });

    it('only a DISPATCHED note can be marked delivered', () => {
      component.note = note({ status: 'DISPATCHED' });
      expect(component.canEdit()).toBeFalse();
      expect(component.canMarkDispatched()).toBeFalse();
      expect(component.canMarkDelivered()).toBeTrue();
    });

    it('a DELIVERED note allows none of these actions', () => {
      component.note = note({ status: 'DELIVERED' });
      expect(component.canEdit()).toBeFalse();
      expect(component.canMarkDispatched()).toBeFalse();
      expect(component.canMarkDelivered()).toBeFalse();
    });
  });

  describe('updateStatus', () => {
    it('sends the full note to the transition endpoint and updates it locally on success', () => {
      component.note = note({ id: 1, status: 'PENDING' });
      salesService.updateDeliveryNoteStatus.and.returnValue(of(note({ id: 1, status: 'DISPATCHED' })));

      component.updateStatus('DISPATCHED');

      expect(salesService.updateDeliveryNoteStatus).toHaveBeenCalledWith(jasmine.objectContaining({ id: 1, deliveryNumber: 'DN-1' }), 'DISPATCHED', undefined);
      expect(component.note?.status).toBe('DISPATCHED');
      expect(component.isUpdatingStatus).toBeFalse();
    });
  });

  describe('more status actions', () => {
    it('offers In Transit only from DISPATCHED, Returned once it has left, and Cancel until delivered', () => {
      component.note = note({ status: 'DISPATCHED' });
      expect(component.canMarkInTransit()).toBeTrue();
      expect(component.canMarkReturned()).toBeTrue();
      expect(component.canCancel()).toBeTrue();

      component.note = note({ status: 'DELIVERED' });
      expect(component.canMarkInTransit()).toBeFalse();
      expect(component.canMarkReturned()).toBeTrue();
      expect(component.canCancel()).toBeFalse();

      component.note = note({ status: 'PENDING' });
      expect(component.canMarkReturned()).toBeFalse();
      expect(component.canCancel()).toBeTrue();
    });

    it('only lets a PENDING or CANCELLED note be deleted', () => {
      component.note = note({ status: 'PENDING' });
      expect(component.canDelete()).toBeTrue();
      component.note = note({ status: 'CANCELLED' });
      expect(component.canDelete()).toBeTrue();
      component.note = note({ status: 'DISPATCHED' });
      expect(component.canDelete()).toBeFalse();
    });

    it('won\'t cancel without a reason, then sends the reason with the cancel', () => {
      component.note = note({ id: 1, status: 'PENDING' });
      salesService.updateDeliveryNoteStatus.and.returnValue(of(note({ id: 1, status: 'CANCELLED' })));

      component.askCancel();
      component.confirmPendingAction();
      expect(salesService.updateDeliveryNoteStatus).not.toHaveBeenCalled();
      expect(component.pendingAction).not.toBeNull();

      component.actionReason = 'Customer changed order';
      component.confirmPendingAction();
      expect(salesService.updateDeliveryNoteStatus).toHaveBeenCalledWith(jasmine.objectContaining({ id: 1 }), 'CANCELLED', 'Customer changed order');
      expect(component.note?.status).toBe('CANCELLED');
      expect(component.pendingAction).toBeNull();
    });

    it('deletes the note only after confirming, then goes back to the list', () => {
      component.note = note({ id: 1, status: 'PENDING' });
      salesService.deleteDeliveryNote.and.returnValue(of(undefined));

      component.askDelete();
      expect(salesService.deleteDeliveryNote).not.toHaveBeenCalled();
      component.confirmPendingAction();

      expect(salesService.deleteDeliveryNote).toHaveBeenCalledWith(1);
      expect((component as any).router.navigate).toHaveBeenCalled();
    });
  });

  describe('after delivery: Generate Invoice', () => {
    it('Mark Delivered works without a signed copy — that\'s uploaded when generating the invoice', () => {
      component.note = note({ id: 1, status: 'IN_TRANSIT' });
      component.hasSignedCopy = false;
      salesService.updateDeliveryNoteStatus.and.returnValue(of(note({ id: 1, status: 'DELIVERED' })));

      component.updateStatus('DELIVERED');

      expect(salesService.updateDeliveryNoteStatus).toHaveBeenCalledWith(jasmine.objectContaining({ id: 1 }), 'DELIVERED', undefined);
      expect(component.note?.status).toBe('DELIVERED');
    });

    it('says why when the backend refuses the change', () => {
      component.note = note({ id: 1, status: 'IN_TRANSIT' });
      salesService.updateDeliveryNoteStatus.and.returnValue(throwError(() => ({ status: 400, error: { message: 'Signed copy required' } })));

      component.updateStatus('DELIVERED');

      expect((component as any).messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
        severity: 'error', detail: 'Failed to update status. (Signed copy required) Please try again.'
      }));
      expect(component.isUpdatingStatus).toBeFalse();
    });

    it('offers Generate Invoice only once delivered and not yet invoiced', () => {
      component.note = note({ status: 'IN_TRANSIT' });
      expect(component.canGenerateInvoice()).toBeFalse();
      component.note = note({ status: 'DELIVERED' });
      expect(component.canGenerateInvoice()).toBeTrue();
      component.note = note({ status: 'DELIVERED', invoiceId: 12 });
      expect(component.canGenerateInvoice()).toBeFalse();
    });

    it('opens the invoice flow that starts with uploading the signed delivery note', () => {
      component.note = note({ id: 4, status: 'DELIVERED', quoteId: 3 });
      component.generateInvoice();
      expect((component as any).router.navigate).toHaveBeenCalledWith(['/admin/sales/invoices/new'], { queryParams: { quoteId: '3', deliveryNoteId: '4' } });
    });

    it('goes to the invoice once there is one', () => {
      component.note = note({ id: 4, status: 'DELIVERED', invoiceId: 12 });
      component.viewInvoice();
      expect((component as any).router.navigate).toHaveBeenCalledWith(['/admin/sales/invoices', 12]);
    });

    it('detects the signed copy from the note\'s receipt or from the file on its quote', () => {
      (component as any).loadContext(note({ receivedAt: '2026-10-15' }));
      expect(component.hasSignedCopy).toBeTrue();

      salesService.getQuoteById.and.returnValue(of({ id: 3 } as any));
      salesService.hasSignedDeliveryNoteDocument.and.returnValue(true);
      (component as any).loadContext(note({ quoteId: 3 }));
      expect(component.hasSignedCopy).toBeTrue();

      salesService.hasSignedDeliveryNoteDocument.and.returnValue(false);
      (component as any).loadContext(note({ quoteId: 3 }));
      expect(component.hasSignedCopy).toBeFalse();
    });
  });

  describe('fixing up notes created without their lines', () => {
    it('fills missing items from the quote, shows them and saves them', () => {
      salesService.getQuoteById.and.returnValue(of({ id: 3, items: [{ productName: 'Widget', quantity: 3 }] } as any));
      salesService.fillMissingFromQuote.and.callFake((n: any) => ({ ...n, items: [{ productName: 'Widget', quantity: 3, unit: '' }] }));
      salesService.updateDeliveryNote.and.callFake((id, body) => of(body as any));
      const n = note({ id: 1, quoteId: 3, items: [], customerAddress: '1 Main St' });
      component.note = n;

      (component as any).loadContext(n);

      expect(component.note?.items.length).toBe(1);
      expect(salesService.updateDeliveryNote).toHaveBeenCalledWith(1, jasmine.objectContaining({
        items: [jasmine.objectContaining({ productName: 'Widget' })], customerAddress: '1 Main St'
      }));
    });
  });

  describe('Customer card', () => {
    it('finds the customer even when the ids come back as different types', () => {
      component.customers = [{ id: 7, name: 'Acme Co', phone: '0803' } as any];
      component.note = note({ customerId: '7' as any });
      expect(component.customerName).toBe('Acme Co');
      expect(component.customerPhone).toBe('0803');
    });

    it('prefers the recipient captured on the note', () => {
      component.note = note({ recipientName: 'Acme (at issue)' });
      expect(component.customerName).toBe('Acme (at issue)');
    });

    it('falls back to the customer on the note\'s quote', () => {
      salesService.getQuoteById.and.returnValue(of({ id: 3, customerName: { id: 7, name: 'Quote Customer Ltd' } } as any));
      component.note = note({ quoteId: 3, customerId: 99 });
      (component as any).loadContext(component.note);
      expect(component.customerName).toBe('Quote Customer Ltd');
    });
  });

  describe('LPO Document — view or download the LPO the seller uploaded', () => {
    const lpoDoc = { fileName: 'lpo.pdf', base64Content: btoa('%PDF-1.4'), contentType: 'application/pdf', uploadedAt: 'then' };

    it('finds the LPO file on the note\'s quote', () => {
      salesService.getQuoteById.and.returnValue(of({ id: 3, additionalOptions: { lpoDocument: lpoDoc } } as any));
      component.note = note({ quoteId: 3 });
      (component as any).loadContext(component.note);

      expect(component.canViewLpo).toBeTrue();
      expect(component.lpoDocument).toEqual(jasmine.objectContaining({ fileName: 'lpo.pdf', base64Content: lpoDoc.base64Content }));
      component.viewLpo();
      expect(component.showLpoViewer).toBeTrue();
    });

    it('finds it through the order for older notes that have no quote link of their own', () => {
      salesService.getSalesandTransactionsById.and.returnValue(of({ id: 10, quoteId: { id: 3 } } as any));
      salesService.getQuoteById.and.returnValue(of({ id: 3, additionalOptions: { lpoDocument: lpoDoc } } as any));
      component.note = note({ salesOrderId: 10 });
      (component as any).loadContext(component.note);

      expect(salesService.getQuoteById).toHaveBeenCalledWith(3);
      expect(component.canViewLpo).toBeTrue();
      expect(component.quoteChecked).toBeTrue();
    });

    it('uses the backend\'s stored copy once the LPO record has one', () => {
      component.lpo = { id: 9, document: { fileName: 'lpo.pdf', fileUrl: 'https://files/lpo.pdf', contentType: 'application/pdf' } } as any;
      expect(component.lpoDocument?.url).toBe('https://files/lpo.pdf');
    });

    it('says so when there is nothing to show', () => {
      component.viewLpo();
      expect(component.showLpoViewer).toBeFalse();
      expect((component as any).messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'warn' }));
    });
  });

  describe('LPO actions', () => {
    const lpo = { id: 9, lpoNumber: 'PR-1', status: 'RECEIVED' } as any;

    beforeEach(() => {
      component.note = note({ id: 1, lpoId: 9 });
      component.lpo = { ...lpo };
      component.poNumber = 'PR-1';
    });

    it('verifies the LPO', () => {
      salesService.verifySalesLpo.and.returnValue(of({ ...lpo, status: 'VERIFIED' }));
      component.verifyLpo();
      expect(salesService.verifySalesLpo).toHaveBeenCalledWith(jasmine.objectContaining({ id: 9 }));
      expect(component.lpo?.status).toBe('VERIFIED');
    });

    it('rejects the LPO with the reason given', () => {
      salesService.rejectSalesLpo.and.returnValue(of({ ...lpo, status: 'REJECTED', notes: 'Wrong amount' }));
      component.askRejectLpo();
      component.actionReason = 'Wrong amount';
      component.confirmPendingAction();
      expect(salesService.rejectSalesLpo).toHaveBeenCalledWith(jasmine.objectContaining({ id: 9 }), 'Wrong amount');
      expect(component.lpo?.status).toBe('REJECTED');
    });

    it('deletes the LPO and unlinks it from the note', () => {
      salesService.deleteSalesLpo.and.returnValue(of(undefined));
      salesService.updateDeliveryNote.and.callFake((id, body) => of(body as any));

      component.askDeleteLpo();
      component.confirmPendingAction();

      expect(salesService.deleteSalesLpo).toHaveBeenCalledWith(9);
      expect(salesService.updateDeliveryNote).toHaveBeenCalledWith(1, jasmine.objectContaining({ lpoId: undefined }));
      expect(component.lpo).toBeNull();
      expect(component.poNumber).toBe('');
      expect(component.note?.lpoId).toBeUndefined();
    });
  });

  describe('document fields', () => {
    it('reads them from the note itself, the LPO number from its SalesLpo, and the recipient snapshot', () => {
      salesService.getSalesLpoById.and.returnValue(of({ id: 9, lpoNumber: 'PR-1' } as any));
      component.note = note({
        lpoId: 9, attention: 'J. Okafor', contactPerson: 'A. Bello', templateId: 'minimal',
        deliveryDate: '2026-07-15T00:00:00.000Z', recipientName: 'Acme (at issue)', recipientPhone: '0803'
      });

      (component as any).loadContext(component.note);

      expect(salesService.getSalesLpoById).toHaveBeenCalledWith(9);
      expect(component.poNumber).toBe('PR-1');
      expect(component.attention).toBe('J. Okafor');
      expect(component.contactPerson).toBe('A. Bello');
      expect(component.template?.id).toBe('minimal');
      expect(component.deliveryDate).toBe('2026-07-15T00:00:00.000Z');
      expect(component.customerName).toBe('Acme (at issue)');
      expect(component.customerPhone).toBe('0803');
    });

    it('falls back to the legacy values on the quote for notes from before the backend fields existed', () => {
      salesService.getSalesandTransactionsById.and.returnValue(of({ id: 10, quoteId: { id: 3 }, invoiceId: { invoiceNumber: 'INV-1' } } as any));
      salesService.getDeliveryNoteMeta.and.returnValue({ poNumber: 'OLD-1', attention: 'Legacy Attn', templateId: 'compact' });
      component.note = note({ salesOrderId: 10 });

      (component as any).loadContext(component.note);

      expect(component.poNumber).toBe('OLD-1');
      expect(component.attention).toBe('Legacy Attn');
      expect(component.template?.id).toBe('compact');
      expect(component.invoiceNumber).toBe('INV-1');
    });
  });

  describe('navigation staleness: reloads when the route id actually changes', () => {
    it('calls getDeliveryNoteById again for a second id pushed through the same paramMap subscription', () => {
      const paramMap$ = new Subject<any>();
      salesService.getDeliveryNoteById.and.returnValue(of(note({ id: 1 })));
      const c = new DeliveryNoteDetailComponent(
        activatedRoute(paramMap$.asObservable()),
        { navigate: jasmine.createSpy('navigate') } as any,
        salesService,
        { add: jasmine.createSpy('add') } as any
      );

      c.ngOnInit();
      paramMap$.next({ get: () => '1' } as any);
      expect(salesService.getDeliveryNoteById).toHaveBeenCalledWith('1');

      paramMap$.next({ get: () => '2' } as any);
      expect(salesService.getDeliveryNoteById).toHaveBeenCalledWith('2');
      expect(salesService.getDeliveryNoteById).toHaveBeenCalledTimes(2);
    });
  });

  describe('customerName: looks up the customer by id from the loaded customers list', () => {
    it('reads .name off the matching customer', () => {
      component.customers = [{ id: 1, name: 'Acme Co' } as any];
      component.note = note({ customerId: 1 });
      expect(component.customerName).toBe('Acme Co');
    });

    it('falls back to a sensible default when no matching customer is present', () => {
      component.customers = [];
      component.note = note({ customerId: 99 });
      expect(component.customerName).toBe('Customer');
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SalesService } from './sales.service';
import { environment } from '../../shared-component/service/environments/environment';

const BASE = environment.apiBaseUrl + '/x/api/v2/commerce';

describe('SalesService', () => {
  let service: SalesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SalesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getOrCreateDeliveryNote: assembled from the order + its linked invoice', () => {
    const order: any = {
      id: 42,
      orderId: 'ORD-42',
      paymentNumber: 'PAY-42',
      invoiceId: { invoiceNumber: 'INV-42', items: [{ productName: 'Widget', quantity: 3 }] },
      customerId: { id: 7, name: 'Acme Co', deliverAddress: ['12 Broad Street', 'Lagos'] },
      shippingAddress: '',
      billingAddress: '10 Marina Road',
      carrier: 'DHL',
      trackingNumber: 'TRK-1'
    };

    it('derives the ship-to address from the customer\'s deliverAddress when no shippingAddress is set on the order', () => {
      let result: any;
      service.getOrCreateDeliveryNote(42).subscribe(r => (result = r));

      http.expectOne(`${BASE}/sales-orders/42`).flush(order);
      http.expectOne(r => r.url === `${BASE}/delivery-notes` && r.method === 'GET').flush({ data: [], total: 0 });
      http.expectOne(r => r.url === `${BASE}/delivery-notes` && r.method === 'POST').flush({});

      expect(result.customerAddress).toBe('12 Broad Street, Lagos');
      expect(result.deliveryNumber).toBe('DN-42');
      expect(result.carrier).toBe('DHL');
      expect(result.trackingNumber).toBe('TRK-1');
      expect(result.customerId).toBe(7);
      expect(result.salesOrderId).toBe(42);
    });

    it('reuses an existing delivery note\'s number instead of creating a duplicate when one already exists for this order', () => {
      let result: any;
      service.getOrCreateDeliveryNote(42).subscribe(r => (result = r));

      http.expectOne(`${BASE}/sales-orders/42`).flush(order);
      http.expectOne(r => r.url === `${BASE}/delivery-notes` && r.method === 'GET')
        .flush({ data: [{ deliveryNumber: 'DN-EXISTING-1' }], total: 1 });

      // No POST should follow — verified by http.verify() in afterEach failing if one is left pending/unexpected.
      expect(result.deliveryNumber).toBe('DN-EXISTING-1');
    });

    it('still returns a usable note when persisting the delivery note record fails', () => {
      let result: any;
      service.getOrCreateDeliveryNote(42).subscribe(r => (result = r));

      http.expectOne(`${BASE}/sales-orders/42`).flush(order);
      http.expectOne(r => r.url === `${BASE}/delivery-notes` && r.method === 'GET').flush({ data: [], total: 0 });
      http.expectOne(r => r.url === `${BASE}/delivery-notes` && r.method === 'POST')
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(result).toBeTruthy();
      expect(result.deliveryNumber).toBe('DN-42');
    });

    it('returns null when the order itself cannot be found', () => {
      let result: any;
      service.getOrCreateDeliveryNote(999).subscribe(r => (result = r));

      http.expectOne(`${BASE}/sales-orders/999`).flush('not found', { status: 404, statusText: 'Not Found' });
      http.expectOne(r => r.url === `${BASE}/delivery-notes` && r.method === 'GET').flush({ data: [], total: 0 });

      expect(result).toBeNull();
    });
  });

  describe('getOrCreateDeliveryNote: picks up its items and details from its quote', () => {
    it('fetches the order\'s quote and uses its lines and customer, plus the links and extras', () => {
      let posted: any;
      service.getOrCreateDeliveryNote(42, { lpoId: 9, attention: 'J. Okafor' }).subscribe();

      http.expectOne(`${BASE}/sales-orders/42`).flush({
        id: 42, orderId: 'ORD-42', quoteId: { id: 3 },
        invoiceId: { id: 5, items: [{ productId: 1, productName: 'Invoice copy', quantity: 9 }] },
        customerId: { id: 7, name: 'Order Customer', phone: '0000' }
      });
      http.expectOne(r => r.url === `${BASE}/delivery-notes` && r.method === 'GET').flush({ data: [], total: 0 });
      http.expectOne(r => r.url === `${BASE}/quotes/3` && r.method === 'GET').flush({
        id: 3,
        items: [{ id: 11, productId: 77, productName: 'Widget', description: 'Blue', quantity: 3 }],
        customerName: { id: 7, name: 'Acme Co', phone: '0803', deliverAddress: ['12 Broad St'] },
        additionalOptions: { address: 'SELLER HQ, Lekki' }
      });
      const req = http.expectOne(r => r.url === `${BASE}/delivery-notes` && r.method === 'POST');
      posted = req.request.body;
      req.flush({ id: 100 });

      expect(posted).toEqual(jasmine.objectContaining({
        quoteId: 3, invoiceId: 5, customerId: 7, recipientName: 'Acme Co', recipientPhone: '0803',
        deliveryAddress: '12 Broad St', lpoId: 9, attention: 'J. Okafor', status: 'PENDING'
      }));
      expect(posted.items).toEqual([jasmine.objectContaining({
        productName: 'Widget', productId: '77', quoteItemId: 11, description: 'Blue', quantity: 3, orderedQuantity: 3
      })]);
    });
  });

  describe('getOrCreateDeliveryNoteForQuote: the quote is the fallback source for lines and address', () => {
    it('takes the quote\'s items and address when the order carries neither, and keeps them if the create response drops them', () => {
      let result: any;
      service.getOrCreateDeliveryNoteForQuote(3).subscribe(r => (result = r));

      http.expectOne(r => r.url === `${BASE}/sales-orders` && r.method === 'GET').flush([{ id: 42, orderId: 'ORD-42', quoteId: { id: 3 } }]);
      http.expectOne(r => r.url === `${BASE}/quotes/3` && r.method === 'GET').flush({
        id: 3, items: [{ id: 11, productId: 77, productName: 'Widget', quantity: 3 }],
        customerName: { id: 7, name: 'Acme Co', address: ['12 Broad St', 'Lagos'] }
      });
      http.expectOne(`${BASE}/sales-orders/42`).flush({ id: 42, orderId: 'ORD-42', customerId: { id: 7, name: 'Acme Co' } });
      http.expectOne(r => r.url === `${BASE}/delivery-notes` && r.method === 'GET').flush({ data: [], total: 0 });
      const post = http.expectOne(r => r.url === `${BASE}/delivery-notes` && r.method === 'POST');
      expect(post.request.body.items).toEqual([jasmine.objectContaining({ productName: 'Widget', quantity: 3, quoteItemId: 11, productId: '77' })]);
      expect(post.request.body.customerAddress).toBe('12 Broad St, Lagos');
      post.flush({ id: 100, items: [] });

      expect(result.id).toBe(100);
      expect(result.items.length).toBe(1);
    });
  });

  describe('fillMissingFromQuote: fixing up notes saved before they used their quote', () => {
    const quote = {
      id: 3, items: [{ id: 11, productName: 'Widget', quantity: 3 }],
      customerName: { id: 7, name: 'Acme Co', phone: '0803', address: ['12 Broad St', 'Lagos'] },
      additionalOptions: { address: 'SELLER HQ, Lekki' }
    };

    it('fills the missing items, address and recipient from the quote', () => {
      const patched: any = service.fillMissingFromQuote({ id: 1, deliveryNumber: 'DN-1', status: 'PENDING', customerAddress: '', items: [] } as any, quote);
      expect(patched.items).toEqual([jasmine.objectContaining({ productName: 'Widget', quantity: 3 })]);
      expect(patched.customerAddress).toBe('12 Broad St, Lagos');
      expect(patched.recipientName).toBe('Acme Co');
      expect(patched.recipientPhone).toBe('0803');
      expect(patched.quoteId).toBe(3);
    });

    it('never overwrites what the note already has, and returns null when nothing is missing', () => {
      const complete: any = {
        id: 1, deliveryNumber: 'DN-1', status: 'PENDING', quoteId: 3, customerAddress: 'Site B', deliveryAddress: 'Site B',
        recipientName: 'Kept', recipientPhone: '1', items: [{ productName: 'Kept', quantity: 1, unit: '' }]
      };
      expect(service.fillMissingFromQuote(complete, quote)).toBeNull();
    });

    it('never uses the seller\'s address stored on the quote', () => {
      const patched: any = service.fillMissingFromQuote(
        { id: 1, deliveryNumber: 'DN-1', status: 'PENDING', customerAddress: '', items: [] } as any,
        { ...quote, customerName: { id: 7, name: 'Acme Co' } });
      expect(patched.customerAddress).toBe('');
      expect(JSON.stringify(patched)).not.toContain('SELLER HQ');
    });
  });

  describe('delivery note endpoints', () => {
    const note: any = { id: 5, deliveryNumber: 'DN-5', status: 'PENDING', items: [], customerAddress: '', createdAt: 'x', updatedAt: 'y' };

    it('fetches a single note by id instead of filtering the whole list', () => {
      service.getDeliveryNoteById(5).subscribe();
      http.expectOne(r => r.url === `${BASE}/delivery-notes/5` && r.method === 'GET').flush(note);
    });

    it('updates with a full-record PUT, leaving server-managed timestamps out of the body', () => {
      service.updateDeliveryNote(5, note).subscribe();
      const req = http.expectOne(r => r.url === `${BASE}/delivery-notes/5` && r.method === 'PUT');
      expect(req.request.body.deliveryNumber).toBe('DN-5');
      expect(req.request.body.createdAt).toBeUndefined();
      expect(req.request.body.updatedAt).toBeUndefined();
      expect(req.request.body.tenantId).toBeTruthy();
      req.flush(note);
    });

    const transitions: [string, string, string][] = [
      ['DISPATCHED', 'dispatch', 'dispatchedAt'],
      ['IN_TRANSIT', 'in-transit', 'inTransitAt'],
      ['DELIVERED', 'deliver', 'deliveredAt'],
      ['RETURNED', 'return', 'returnedAt'],
      ['CANCELLED', 'cancel', 'cancelledAt']
    ];
    transitions.forEach(([status, path, stamp]) => {
      it(`moves to ${status} through PATCH /{id}/${path} with the full record`, () => {
        service.updateDeliveryNoteStatus(note, status as any).subscribe();
        const req = http.expectOne(r => r.url === `${BASE}/delivery-notes/5/${path}` && r.method === 'PATCH');
        expect(req.request.body.status).toBe(status);
        expect(req.request.body.deliveryNumber).toBe('DN-5');
        expect(req.request.body[stamp]).toBeTruthy();
        req.flush({ ...note, status });
      });
    });

    it('sends the cancellation reason with a cancel', () => {
      service.updateDeliveryNoteStatus(note, 'CANCELLED', 'Customer changed order').subscribe();
      const req = http.expectOne(`${BASE}/delivery-notes/5/cancel`);
      expect(req.request.body.cancellationReason).toBe('Customer changed order');
      req.flush(note);
    });

    it('falls back to a PUT for PENDING, which has no transition endpoint', () => {
      service.updateDeliveryNoteStatus({ ...note, status: 'DISPATCHED' }, 'PENDING').subscribe();
      const req = http.expectOne(r => r.url === `${BASE}/delivery-notes/5` && r.method === 'PUT');
      expect(req.request.body.status).toBe('PENDING');
      req.flush(note);
    });

    it('maps a quote to its note through the note\'s own quoteId', () => {
      let result: any;
      service.getQuoteDeliveryNoteMap().subscribe(r => (result = r));
      http.expectOne(r => r.url === `${BASE}/sales-orders`).flush([]);
      http.expectOne(r => r.url === `${BASE}/delivery-notes`).flush([{ id: 5, deliveryNumber: 'DN-5', quoteId: 3 }]);
      expect(result.get(3)?.deliveryNumber).toBe('DN-5');
    });
  });

  describe('recordSignedDeliveryNote', () => {
    const note: any = { id: 5, deliveryNumber: 'DN-5', status: 'DELIVERED', items: [], customerAddress: '' };
    const dispatched: any = { ...note, status: 'DISPATCHED' };
    const received = { receivedByName: 'J. Okafor', receivedAt: '2026-10-15T00:00:00.000Z' };
    const doc: any = { fileName: 'signed.pdf', base64Content: 'x', contentType: 'application/pdf', uploadedAt: 'now' };

    const flushQuoteSave = () => {
      http.expectOne(r => r.url === `${BASE}/quotes/3` && r.method === 'GET').flush({ id: 3, additionalOptions: {} });
      http.expectOne(r => r.url === `${BASE}/quotes/3` && r.method === 'PUT').flush({ id: 3 });
    };

    it('stores the file on the quote, then saves who received it on the full note', () => {
      let result: any;
      service.recordSignedDeliveryNote(3, doc, note, received).subscribe(r => (result = r));
      flushQuoteSave();
      const put = http.expectOne(r => r.url === `${BASE}/delivery-notes/5` && r.method === 'PUT');
      expect(put.request.body).toEqual(jasmine.objectContaining({ deliveryNumber: 'DN-5', ...received }));
      put.flush({ ...note, ...received });

      expect(result.noteSaved).toBeTrue();
      expect(result.note.receivedByName).toBe('J. Okafor');
    });

    it('marks a dispatched note delivered once the signed copy is in, keeping the receiver details', () => {
      let result: any;
      service.recordSignedDeliveryNote(3, doc, dispatched, received).subscribe(r => (result = r));
      flushQuoteSave();
      http.expectOne(r => r.url === `${BASE}/delivery-notes/5` && r.method === 'PUT').flush({ ...dispatched, ...received });
      const deliver = http.expectOne(r => r.url === `${BASE}/delivery-notes/5/deliver` && r.method === 'PATCH');
      expect(deliver.request.body).toEqual(jasmine.objectContaining({ status: 'DELIVERED', ...received }));
      deliver.flush({ ...dispatched, ...received, status: 'DELIVERED' });

      expect(result.note.status).toBe('DELIVERED');
      expect(result.noteSaved).toBeTrue();
    });

    it('leaves a cancelled note\'s status alone', () => {
      service.recordSignedDeliveryNote(3, doc, { ...note, status: 'CANCELLED' }, received).subscribe();
      flushQuoteSave();
      http.expectOne(r => r.url === `${BASE}/delivery-notes/5` && r.method === 'PUT').flush({ ...note, status: 'CANCELLED' });
      // no PATCH .../deliver — http.verify() in afterEach fails if one was sent
    });

    it('still succeeds, flagged, when the note update fails after the file was stored', () => {
      let result: any;
      service.recordSignedDeliveryNote(3, doc, note, received).subscribe(r => (result = r));
      flushQuoteSave();
      http.expectOne(`${BASE}/delivery-notes/5`).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(result.noteSaved).toBeFalse();
      expect(result.quote.id).toBe(3);
    });
  });

  describe('create responses that are just the new id', () => {
    it('keeps the id when POST /delivery-notes answers with a bare number (no second Continue needed)', () => {
      let result: any;
      service.createDeliveryNote({ deliveryNumber: 'DN-1', status: 'PENDING', items: [], customerAddress: '' }).subscribe(r => (result = r));
      http.expectOne(r => r.url === `${BASE}/delivery-notes` && r.method === 'POST').flush(55);
      expect(result.id).toBe(55);
      expect(result.deliveryNumber).toBe('DN-1');
    });

    it('unwraps a { data } response for an LPO', () => {
      let result: any;
      service.createSalesLpo({ lpoNumber: 'PR-1', quoteId: 3 }).subscribe(r => (result = r));
      http.expectOne(r => r.url === `${BASE}/sales-lpos` && r.method === 'POST').flush({ data: { id: 9, status: 'RECEIVED' } });
      expect(result.id).toBe(9);
      expect(result.lpoNumber).toBe('PR-1');
    });
  });

  describe('getDeliveryNoteLogo', () => {
    it('prefers the logo uploaded for the delivery note, then the quote\'s own', () => {
      const uploaded = { additionalOptions: { deliveryNoteLogo: { base64Content: 'abc', contentType: 'image/png' } }, logoUrl: ['quote.png'] } as any;
      expect(service.getDeliveryNoteLogo(uploaded)).toBe('data:image/png;base64,abc');
      expect(service.getDeliveryNoteLogo({ logoUrl: ['quote.png'] } as any)).toBe('quote.png');
      expect(service.getDeliveryNoteLogo({} as any)).toBeNull();
    });
  });

  describe('order numbers: one per Sales & Transactions record, linking quote → delivery note → invoice', () => {
    it('uses the backend\'s own number when it sends one', () => {
      expect(service.orderNumberFor({ id: 42, orderId: 'ORD-REAL-1' })).toBe('ORD-REAL-1');
      expect(service.orderNumberFor({ id: 42, orderNumber: 'SO-2026-123456' })).toBe('SO-2026-123456');
    });

    it('otherwise derives ORD-<year>-<id>, the same every time', () => {
      expect(service.orderNumberFor({ id: 42, orderDate: '2026-03-04T10:00:00Z' })).toBe('ORD-2026-00042');
      expect(service.orderNumberFor({ id: 42, orderDate: '2026-03-04T10:00:00Z' })).toBe(service.orderNumberFor({ id: 42, orderDate: '2026-03-04T10:00:00Z' }));
      expect(service.orderNumberFor({ id: 7 })).toBe('ORD-00007');
      expect(service.orderNumberFor(null)).toBe('');
    });

    it('maps each quote, transaction and invoice in a chain to the same number', () => {
      let lookup: any;
      service.getOrderIdLookup().subscribe(r => (lookup = r));
      http.expectOne(r => r.url === `${BASE}/sales-orders`).flush([
        { id: 42, orderDate: '2026-03-04T10:00:00Z', quoteId: { id: 3 }, invoiceId: { id: 8 } },
        { id: 43, orderDate: '2026-05-01T10:00:00Z', invoiceId: { id: 9 } }
      ]);

      expect(lookup.byQuoteId.get(3)).toBe('ORD-2026-00042');
      expect(lookup.byTransactionId.get(42)).toBe('ORD-2026-00042');
      expect(lookup.byInvoiceId.get(8)).toBe('ORD-2026-00042');
      expect(lookup.byInvoiceId.get(9)).toBe('ORD-2026-00043');
    });

    it('finds an invoice\'s number through its own record, else through its quote', () => {
      const lookup = { byQuoteId: new Map([[3, 'ORD-2026-00042']]), byInvoiceId: new Map([[9, 'ORD-2026-00043']]) };
      expect(service.orderNumberForInvoice({ id: 9 }, lookup)).toBe('ORD-2026-00043');
      expect(service.orderNumberForInvoice({ id: 8, quoteId: '3' }, lookup)).toBe('ORD-2026-00042');
      expect(service.orderNumberForInvoice({ id: 8 }, lookup)).toBe('');
    });
  });

  describe('sales LPO endpoints', () => {
    const lpo: any = { id: 9, lpoNumber: 'PR-1', quoteId: 3, status: 'RECEIVED', document: {}, createdAt: 'x' };

    it('picks the quote\'s most recent LPO that has not been rejected', () => {
      let result: any;
      service.getSalesLpoForQuote(3).subscribe(r => (result = r));
      const req = http.expectOne(r => r.url === `${BASE}/sales-lpos` && r.method === 'GET');
      expect(req.request.params.get('quoteId')).toBe('3');
      req.flush([
        { id: 1, quoteId: 3, status: 'VERIFIED' },
        { id: 4, quoteId: 3, status: 'REJECTED' },
        { id: 2, quoteId: 3, status: 'RECEIVED' },
        { id: 8, quoteId: 99, status: 'RECEIVED' }
      ]);
      expect(result.id).toBe(2);
    });

    it('creates with POST and updates with a full-record PUT', () => {
      service.createSalesLpo({ lpoNumber: 'PR-1', quoteId: 3 }).subscribe();
      http.expectOne(r => r.url === `${BASE}/sales-lpos` && r.method === 'POST').flush(lpo);

      service.updateSalesLpo(9, lpo).subscribe();
      const put = http.expectOne(r => r.url === `${BASE}/sales-lpos/9` && r.method === 'PUT');
      expect(put.request.body.createdAt).toBeUndefined();
      put.flush(lpo);
    });

    it('verifies and rejects through their PATCH endpoints', () => {
      service.verifySalesLpo(lpo).subscribe();
      const verify = http.expectOne(r => r.url === `${BASE}/sales-lpos/9/verify` && r.method === 'PATCH');
      expect(verify.request.body.status).toBe('VERIFIED');
      verify.flush(lpo);

      service.rejectSalesLpo(lpo, 'Wrong amount').subscribe();
      const reject = http.expectOne(r => r.url === `${BASE}/sales-lpos/9/reject` && r.method === 'PATCH');
      expect(reject.request.body.status).toBe('REJECTED');
      expect(reject.request.body.notes).toBe('Wrong amount');
      reject.flush(lpo);
    });
  });

  describe('getPaymentReceipt: real merchant info + a receipt number that is never just "RCT-"', () => {
    it('falls back through orderId/id when paymentNumber was never set, instead of always "RCT-"', () => {
      let result: any;
      service.getPaymentReceipt('7').subscribe(r => (result = r));

      http.expectOne(`${BASE}/sales-orders/7`).flush({ id: 7, orderId: 'ORD-7', paymentNumber: '', invoiceId: {}, customerId: {} });
      http.expectOne(`${BASE}/merchant-info/my`).flush({ id: 1, name: 'Real Merchant Ltd' });

      expect(result.receiptNumber).toBe('RCT-7');
      expect(result.merchantInfo.name).toBe('Real Merchant Ltd');
    });

    it('uses the placeholder merchant info only when the real merchant record is unavailable', () => {
      let result: any;
      service.getPaymentReceipt('7').subscribe(r => (result = r));

      http.expectOne(`${BASE}/sales-orders/7`).flush({ id: 7, paymentNumber: 'PAY-7', invoiceId: {}, customerId: {} });
      http.expectOne(`${BASE}/merchant-info/my`).flush('not found', { status: 404, statusText: 'Not Found' });

      expect(result.receiptNumber).toBe('RCT-7');
      expect(result.merchantInfo).toBeTruthy();
    });
  });

  describe('getConvertedQuotesAwaitingDeliveryNote: the Delivery Notes tab\'s dashboard queue', () => {
    it('excludes converted quotes whose linked order already has a delivery note', () => {
      let result: any;
      service.getConvertedQuotesAwaitingDeliveryNote().subscribe(r => (result = r));

      http.expectOne(r => r.url === `${BASE}/quotes`).flush([
        { id: 1, quoteNumber: 'QUO-1', status: 'CONVERTED' },
        { id: 2, quoteNumber: 'QUO-2', status: 'CONVERTED' }
      ]);
      http.expectOne(r => r.url === `${BASE}/sales-orders`).flush([
        { id: 10, quoteId: { id: 1 } },
        { id: 20, quoteId: { id: 2 } }
      ]);
      http.expectOne(r => r.url === `${BASE}/delivery-notes`).flush({
        data: [{ deliveryNumber: 'DN-20', salesOrderId: 20 }],
        total: 1
      });

      expect(result.map((q: any) => q.id)).toEqual([1]);
    });

    it('returns an empty list rather than throwing when a fetch fails', () => {
      let result: any;
      service.getConvertedQuotesAwaitingDeliveryNote().subscribe(r => (result = r));

      http.expectOne(r => r.url === `${BASE}/quotes`).flush('boom', { status: 500, statusText: 'Server Error' });
      http.expectOne(r => r.url === `${BASE}/sales-orders`).flush([]);
      http.expectOne(r => r.url === `${BASE}/delivery-notes`).flush({ data: [], total: 0 });

      expect(result).toEqual([]);
    });
  });

  describe('createMerchantInfo / updateMerchantInfo: now scoped to the real tenant', () => {
    it('createMerchantInfo sends tenantId', () => {
      service.createMerchantInfo({ name: 'Acme' }).subscribe();
      const req = http.expectOne(`${BASE}/merchant-info`);
      expect(req.request.body.tenantId).toBeTruthy();
      req.flush({});
    });

    it('updateMerchantInfo sends tenantId', () => {
      service.updateMerchantInfo(1, { name: 'Acme' }).subscribe();
      const req = http.expectOne(`${BASE}/merchant-info/1`);
      expect(req.request.body.tenantId).toBeTruthy();
      req.flush({});
    });
  });
});

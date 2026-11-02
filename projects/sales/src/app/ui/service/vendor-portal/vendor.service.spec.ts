import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { VendorService } from './vendor.service';
import { Rfq } from '../../domain/vendor-portal/vendor.dto';
import { environment } from '../../shared-component/service/environments/environment';

const BASE = environment.apiBaseUrl + '/x/api/v2/commerce';

describe('VendorService', () => {
  let service: VendorService;
  let http: HttpTestingController;

  const apiRfq = {
    id: 3, vendorId: 7, procurementRequestId: 90, rfqNumber: 'RFQ-90', clientName: 'Buyer Ltd', currency: 'NGN',
    issuedDate: '2026-11-01T00:00:00Z', dueDate: '2026-11-20T00:00:00Z', status: 'OPEN', isRead: false, category: 'IT',
    items: [{ id: 11, vendorRfqId: 3, name: 'Laptop', quantity: 2, unit: 'pcs' }],
  };

  beforeEach(() => {
    sessionStorage.setItem('userid', '65');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(VendorService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.removeItem('userid');
  });

  const flushVendorId = (vendorId: number | null = 7) => {
    const req = http.expectOne(`${BASE}/vendors/by-user/65`);
    if (vendorId === null) req.flush('x', { status: 404, statusText: 'Not Found' });
    else req.flush({ id: vendorId, userAccountId: 65 });
  };
  const listRequest = (path: string) => http.expectOne(r => r.url === `${BASE}/${path}`);

  /** Loads one RFQ into the service, with the vendor id lookup already done. */
  const givenRfq = (): Rfq => {
    service.loadRfqs();
    flushVendorId();
    listRequest('vendor-rfqs').flush([apiRfq]);
    return service.getRfqsSnapshot()[0];
  };

  describe('which vendor it asks for', () => {
    it('asks for RFQs by vendor id, not the login\'s user id', () => {
      service.loadRfqs();
      flushVendorId();
      const req = listRequest('vendor-rfqs');
      expect(req.request.params.get('vendorId')).toBe('7');
      req.flush([apiRfq]);
    });

    it('only looks the vendor id up once', () => {
      givenRfq();
      service.loadLpos();
      listRequest('vendor-lpos').flush([]);
      http.expectNone(`${BASE}/vendors/by-user/65`);
    });

    it('looks it up again for a different login, so one vendor never gets another\'s records', () => {
      givenRfq();
      sessionStorage.setItem('userid', '66');
      service.loadLpos();
      http.expectOne(`${BASE}/vendors/by-user/66`).flush({ id: 8 });
      const req = listRequest('vendor-lpos');
      expect(req.request.params.get('vendorId')).toBe('8');
      req.flush([]);
    });

    it('a login with no vendor reports that, and asks for nothing', () => {
      let message: string | null = null;
      service.loadError$.subscribe(m => (message = m));
      service.loadRfqs();
      flushVendorId(null);
      http.expectNone(r => r.url === `${BASE}/vendor-rfqs`);
      expect(message as unknown as string).toContain('RFQs');
    });
  });

  describe('loading lists', () => {
    it('maps an RFQ to the portal\'s model', () => {
      const rfq = givenRfq();
      expect(rfq.id).toBe('3');
      expect(rfq.procurementRequestId).toBe('90');
      expect(rfq.status).toBe('open');
      expect(rfq.items[0].id).toBe('11');
    });

    it('a failed load is reported, then clears once it works — it doesn\'t look like an empty list', () => {
      let message: string | null = null;
      service.loadError$.subscribe(m => (message = m));

      service.loadLpos();
      flushVendorId();
      listRequest('vendor-lpos').flush('x', { status: 500, statusText: 'Server Error' });
      expect(message as unknown as string).toContain('LPOs');

      service.loadLpos();
      listRequest('vendor-lpos').flush([]);
      expect(message).toBeNull();
    });

    it('an LPO the buyer issued is waiting for the vendor\'s answer', () => {
      service.loadLpos();
      flushVendorId();
      listRequest('vendor-lpos').flush([{ id: 5, status: 'ISSUED', issuedDate: '2026-11-01', deliveryDate: '2026-12-01', items: [] }]);
      expect(service.getLposSnapshot()[0].status).toBe('pending');
    });

    it('joins a quotation to its RFQ whichever loads first', () => {
      service.loadQuotations();
      flushVendorId();
      listRequest('vendor-quotations/').flush([
        { id: 40, rfqId: 90, vendorStatus: 'SUBMITTED', totalAmount: 1075, createdAt: '2026-11-01', items: [{ id: 1, name: 'Laptop', quantity: 2, unitPrice: 500, totalPrice: 1000, availability: 'AVAILABLE' }] },
      ]);
      expect(service.getQuotationsSnapshot()[0].rfqNumber).toBe('');

      service.loadRfqs();
      listRequest('vendor-rfqs').flush([apiRfq]);

      const q = service.getQuotationsSnapshot()[0];
      expect(q.rfqId).toBe('3');
      expect(q.rfqNumber).toBe('RFQ-90');
      expect(q.clientName).toBe('Buyer Ltd');
      expect(q.status).toBe('sent');
      expect(q.items[0].rfqItemId).toBe('11');
      expect(q.items[0].unit).toBe('pcs');
      expect(q.items[0].availability).toBe('available');
      expect(service.rfqHasQuotation('3')).toBeTrue();
    });
  });

  describe('quotations', () => {
    const priced = (rfq: Rfq) => {
      const q = service.createQuotationFromRfq(rfq);
      q.items[0].unitPrice = 500;
      return q;
    };
    const apiSaved = (status: string) => ({
      id: 40, rfqId: 90, vendorStatus: status, totalAmount: 1075, createdAt: '2026-11-01',
      items: [{ id: 1, name: 'Laptop', quantity: 2, unitPrice: 500, totalPrice: 1000, availability: 'AVAILABLE' }],
    });

    it('opening the editor sends nothing, so an abandoned quote leaves nothing behind', () => {
      const rfq = givenRfq();
      service.createQuotationFromRfq(rfq);
      http.expectNone(`${BASE}/vendor-quotations/`);
    });

    it('submitting never calls the buyer\'s accept endpoint', () => {
      const out: any = {};
      service.sendQuotation(priced(givenRfq())).subscribe(s => (out.saved = s));

      const req = http.expectOne(`${BASE}/vendor-quotations/`);
      expect(req.request.method).toBe('POST');
      req.flush(apiSaved('SUBMITTED'));

      http.expectNone(r => r.url.endsWith('/accept'));
      expect(out.saved.status).toBe('sent');
    });

    it('sends the API\'s body: the buyer\'s request id, numbers, and no made-up id or rating', () => {
      service.sendQuotation(priced(givenRfq())).subscribe();
      const req = http.expectOne(`${BASE}/vendor-quotations/`);
      const body = req.request.body;

      expect('id' in body).toBeFalse();
      expect('vendorRating' in body).toBeFalse();
      expect(body.rfqId).toBe(90);
      expect(body.vendorId).toBe(7);
      expect(body.vendorStatus).toBe('SUBMITTED');
      expect(body.totalAmount).toBeCloseTo(1075);
      expect(body.items[0].availability).toBe('AVAILABLE');
      expect(body.items[0].totalPrice).toBe(1000);
      req.flush(apiSaved('SUBMITTED'));
    });

    it('the temporary draft is replaced by the saved record, not listed twice', () => {
      service.updateQuotation(priced(givenRfq())).subscribe();
      expect(service.getQuotationsSnapshot().length).toBe(1);
      http.expectOne(`${BASE}/vendor-quotations/`).flush(apiSaved('DRAFT'));

      const list = service.getQuotationsSnapshot();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('40');
    });

    it('saving an already-saved quotation updates it instead of creating another', () => {
      const out: any = {};
      service.updateQuotation(priced(givenRfq())).subscribe(s => (out.saved = s));
      http.expectOne(`${BASE}/vendor-quotations/`).flush(apiSaved('DRAFT'));

      service.sendQuotation(out.saved).subscribe();
      const req = http.expectOne(`${BASE}/vendor-quotations/40`);
      expect(req.request.method).toBe('PUT');
      req.flush(apiSaved('SUBMITTED'));
    });

    it('a failed submit is an error, leaves the draft in place, and doesn\'t mark the RFQ converted', () => {
      const rfq = givenRfq();
      const q = priced(rfq);
      const out: any = {};
      service.sendQuotation(q).subscribe({ error: e => (out.error = e) });
      http.expectOne(`${BASE}/vendor-quotations/`).flush('x', { status: 400, statusText: 'Bad Request' });

      expect(out.error.message).toContain('could not be submitted');
      expect(service.getQuotationsSnapshot()[0].status).toBe('draft');
      expect(service.getRfqsSnapshot()[0].status).toBe('open');
    });
  });

  describe('LPOs', () => {
    const givenLpo = () => {
      service.loadLpos();
      flushVendorId();
      listRequest('vendor-lpos').flush([{
        id: 5, status: 'ISSUED', issuedDate: '2026-11-01', deliveryDate: '2026-12-01',
        items: [{ id: 6, name: 'Laptop', quantity: 2, unitPrice: 500, totalPrice: 1000 }],
      }]);
    };

    it('only shows accepted once the server agrees', () => {
      givenLpo();
      service.acceptLpo('5').subscribe();
      expect(service.getLposSnapshot()[0].status).toBe('pending');
      http.expectOne(`${BASE}/vendor-lpos/5/accept`).flush({});
      expect(service.getLposSnapshot()[0].status).toBe('accepted');
    });

    it('a failed reject is an error and changes nothing', () => {
      givenLpo();
      const out: any = {};
      service.rejectLpo('5', 'No stock').subscribe({ error: e => (out.error = e) });
      const req = http.expectOne(`${BASE}/vendor-lpos/5/reject`);
      expect(req.request.body.rejectionReason).toBe('No stock');
      req.flush('x', { status: 500, statusText: 'Server Error' });

      expect(out.error.message).toContain('could not be rejected');
      expect(service.getLposSnapshot()[0].status).toBe('pending');
    });
  });

  describe('invoices', () => {
    const invoice = (): any => ({
      id: 'inv-1', invoiceNumber: 'INV-1', lpoId: '5', lpoNumber: 'LPO-5', clientName: 'Buyer Ltd',
      issuedDate: new Date('2026-11-01'), dueDate: new Date('2026-12-01'), status: 'submitted',
      subtotal: 1000, tax: 75, total: 1075, amountPaid: 0, amountOutstanding: 1075, currency: 'NGN',
      bankDetails: { bankName: 'GTB', accountName: 'Acme', accountNumber: '0123456789' },
      items: [{ id: 'line-1', lpoItemId: '6', description: 'Laptop', quantity: 2, unit: 'pcs', unitPrice: 500, totalPrice: 1000 }],
    });
    const apiInvoice = (status: string) => ({
      id: 70, invoiceNumber: 'INV-1', lpoId: 5, status, issuedDate: '2026-11-01', dueDate: '2026-12-01', total: 1075,
      items: [{ id: 71, lpoItemId: 6, description: 'Laptop', quantity: 2, unitPrice: 500, totalPrice: 1000 }],
    });

    it('creates a draft, then submits it — creating alone never reached the buyer', () => {
      const out: any = {};
      service.createInvoice(invoice()).subscribe(i => (out.sent = i));
      flushVendorId();

      const post = http.expectOne(`${BASE}/vendor-invoices`);
      const body = post.request.body;
      expect(post.request.method).toBe('POST');
      expect('id' in body).toBeFalse();
      expect(body.status).toBe('DRAFT');
      expect(body.vendorId).toBe(7);
      expect(body.lpoId).toBe(5);
      expect(body.bankName).toBe('GTB');
      expect('id' in body.items[0]).toBeFalse();
      expect(body.items[0].lpoItemId).toBe(6);
      post.flush(apiInvoice('DRAFT'));

      http.expectOne(`${BASE}/vendor-invoices/70/submit`).flush(apiInvoice('SUBMITTED'));
      expect(out.sent.status).toBe('submitted');
      expect(service.getInvoicesSnapshot().length).toBe(1);
    });

    it('if the send fails it says so, and the draft stays listed so it isn\'t raised twice', () => {
      const out: any = {};
      service.createInvoice(invoice()).subscribe({ error: e => (out.error = e) });
      flushVendorId();
      http.expectOne(`${BASE}/vendor-invoices`).flush(apiInvoice('DRAFT'));
      http.expectOne(`${BASE}/vendor-invoices/70/submit`).flush('x', { status: 500, statusText: 'Server Error' });

      expect(out.error.savedAsDraft).toBeTrue();
      expect(out.error.message).toContain('saved as a draft');
      expect(service.getInvoicesSnapshot()[0].status).toBe('draft');
    });

    it('a failed create is an error and lists nothing', () => {
      const out: any = {};
      service.createInvoice(invoice()).subscribe({ error: e => (out.error = e) });
      flushVendorId();
      http.expectOne(`${BASE}/vendor-invoices`).flush('x', { status: 400, statusText: 'Bad Request' });

      expect(out.error.savedAsDraft).toBeUndefined();
      expect(service.getInvoicesSnapshot().length).toBe(0);
    });
  });
});

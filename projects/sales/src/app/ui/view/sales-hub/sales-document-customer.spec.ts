import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SalesService } from '../../service/sales/sales.service';
import { invoiceDocument, quoteDocument } from '../../service/sales/sales-document';
import { environment } from '../../shared-component/service/environments/environment';

const BASE = `${environment.apiBaseUrl}/x/api/v2/commerce`;

describe('Customer name on quote and invoice details', () => {
  let service: SalesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SalesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const resolve = (doc: any) => {
    const out: { customer?: any } = {};
    service.documentCustomer(doc).subscribe(c => (out.customer = c));
    return out;
  };

  it('looks the customer up when the record only carries their id', () => {
    const out = resolve({ id: 1, customerId: 12, customerName: null });
    http.expectOne(`${BASE}/customers/12`).flush({ id: 12, name: 'Acme Ltd', email: 'a@acme.example' });
    expect(out.customer.name).toBe('Acme Ltd');
  });

  it('looks them up when the embedded customer has no name', () => {
    const out = resolve({ id: 1, customerName: { id: 12 } });
    http.expectOne(`${BASE}/customers/12`).flush({ id: 12, name: 'Acme Ltd' });
    expect(out.customer.name).toBe('Acme Ltd');
  });

  it('uses an embedded customer that already has a name, without a lookup', () => {
    const out = resolve({ id: 1, customerName: { id: 12, name: 'Embedded Ltd' } });
    http.expectNone(`${BASE}/customers/12`);
    expect(out.customer.name).toBe('Embedded Ltd');
  });

  it('keeps what was embedded if the lookup fails', () => {
    const out = resolve({ id: 1, customerId: { id: 12, email: 'a@acme.example' } });
    http.expectOne(`${BASE}/customers/12`).flush('x', { status: 500, statusText: 'Server Error' });
    expect(out.customer.email).toBe('a@acme.example');
  });

  it('asks for nothing when there is no customer at all', () => {
    const out = resolve({ id: 1 });
    expect(out.customer).toBeNull();
  });

  describe('the PDF', () => {
    it('prints the looked-up customer\'s name', () => {
      const doc = quoteDocument({ id: 1, customerId: 12, items: [] }, {}, { name: 'Acme Ltd' });
      expect(doc.to.name).toBe('Acme Ltd');
      const inv = invoiceDocument({ id: 1, customerId: 12, items: [] }, {}, { name: 'Acme Ltd' });
      expect(inv.to.name).toBe('Acme Ltd');
    });

    it('prints a name sent as plain text instead of "Customer"', () => {
      expect(quoteDocument({ id: 1, customerName: 'Text Name Ltd', items: [] }, {}).to.name).toBe('Text Name Ltd');
    });
  });
});

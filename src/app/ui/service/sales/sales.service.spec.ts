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

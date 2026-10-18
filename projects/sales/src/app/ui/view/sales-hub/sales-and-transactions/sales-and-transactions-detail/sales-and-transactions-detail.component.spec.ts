import { of, Subject } from 'rxjs';

import { SalesAndTransactionsDetailComponent } from './sales-and-transactions-detail.component';
import { SalesService, OrderSnapshot } from '../../../../service/sales/sales.service';
import { deriveOrderProgress } from '../../../../service/sales/order-progress';

describe('SalesAndTransactionsDetailComponent', () => {
  let component: SalesAndTransactionsDetailComponent;
  let salesService: jasmine.SpyObj<SalesService>;

  const activatedRoute = (paramMap$: any = of({ get: () => null } as any)) => ({
    paramMap: paramMap$,
    snapshot: { paramMap: { get: () => null } }
  } as any);

  const snapshot = (over: Partial<OrderSnapshot> = {}): OrderSnapshot => {
    const s: any = {
      tx: { id: 1, status: 'QUOTE_CONVERTED', totalAmount: 0, paidAmount: 0 },
      quote: { id: 3, quoteNumber: 'QUO-3', status: 'CONVERTED', currency: 'NGN', subtotal: 200, taxAmount: 20, totalAmount: 220,
        items: [{ productName: 'Widget', quantity: 2, unitPrice: 100, taxRate: 10, total: 220 }] },
      invoice: null, deliveryNote: null, lpo: null,
      customer: { id: 7, name: 'Acme Co', email: 'a@acme.com', phone: '0803', address: ['12 Broad St', 'Lagos'] },
      items: [{ productName: 'Widget', quantity: 2, unitPrice: 100, taxRate: 10, total: 220 }],
      ...over
    };
    s.progress = s.progress || deriveOrderProgress({ tx: s.tx, quote: s.quote, hasLpo: !!s.lpo, deliveryNote: s.deliveryNote, invoice: s.invoice });
    return s;
  };

  const load = (s: OrderSnapshot) => {
    component.snapshot = s;
    component.transaction = s.tx;
  };

  beforeEach(() => {
    salesService = jasmine.createSpyObj<SalesService>('SalesService', ['getOrderSnapshot', 'orderNumberFor', 'getQuoteLpoDocument']);
    salesService.orderNumberFor.and.callFake((tx: any) => tx?.orderId || '');
    salesService.getOrderSnapshot.and.returnValue(of(null));
    salesService.getQuoteLpoDocument.and.returnValue(null);
    component = new SalesAndTransactionsDetailComponent(
      activatedRoute(),
      { navigate: jasmine.createSpy('navigate') } as any,
      salesService
    );
  });

  describe('the order\'s details come from its linked documents', () => {
    it('shows the full customer record', () => {
      load(snapshot());
      expect(component.getCustomerName()).toBe('Acme Co');
      expect(component.getCustomerEmail()).toBe('a@acme.com');
      expect(component.getCustomerPhone()).toBe('0803');
      expect(component.getBillingAddress()).toBe('12 Broad St, Lagos');
    });

    it('lists the quote\'s line items and takes its totals when the order record has none', () => {
      load(snapshot());
      expect(component.getItemsList().length).toBe(1);
      expect(component.subtotal).toBe(200);
      expect(component.taxAmount).toBe(20);
      expect(component.totalAmount).toBe(220);
      expect(component.balanceDue).toBe(220);
      expect(component.getQuoteNumber()).toBe('QUO-3');
    });

    it('ships to the delivery note\'s address once there is one', () => {
      load(snapshot({ deliveryNote: { id: 4, deliveryNumber: 'DN-4', status: 'DISPATCHED', items: [], customerAddress: 'Site B, Lekki' } as any }));
      expect(component.getShippingAddress()).toBe('Site B, Lekki');
    });
  });

  describe('lifecycle', () => {
    it('follows the delivery, not just quote and invoice events', () => {
      load(snapshot({ lpo: { id: 9, lpoNumber: 'PR-1' } as any, deliveryNote: { id: 4, deliveryNumber: 'DN-4', status: 'IN_TRANSIT', items: [], customerAddress: '' } as any }));
      expect(component.progressLabel).toBe('In Transit');
      expect(component.isStageReached(2)).toBeTrue();   // LPO Received
      expect(component.isStageReached(3)).toBeTrue();   // Delivery Note
      expect(component.isStageReached(4)).toBeFalse();  // Delivered
      expect(component.stageDetail(3)).toContain('DN-4');
    });

    it('marks where a stopped order stopped', () => {
      load(snapshot({ quote: { id: 3, status: 'DECLINED', items: [] } as any }));
      expect(component.progressLabel).toBe('Quote Declined');
      expect(component.isStageStopped(0)).toBeTrue();
      expect(component.isStageReached(0)).toBeFalse();
    });
  });

  describe('navigation staleness: reloads when the route id actually changes', () => {
    it('loads the order snapshot again for a second id pushed through the same paramMap subscription', () => {
      const paramMap$ = new Subject<any>();
      salesService.getOrderSnapshot.and.returnValue(of(snapshot()));
      const c = new SalesAndTransactionsDetailComponent(
        activatedRoute(paramMap$.asObservable()),
        { navigate: jasmine.createSpy('navigate') } as any,
        salesService
      );

      c.ngOnInit();
      paramMap$.next({ get: () => '1' } as any);
      expect(salesService.getOrderSnapshot).toHaveBeenCalledWith('1');

      paramMap$.next({ get: () => '2' } as any);
      expect(salesService.getOrderSnapshot).toHaveBeenCalledWith('2');
      expect(salesService.getOrderSnapshot).toHaveBeenCalledTimes(2);
    });
  });
});

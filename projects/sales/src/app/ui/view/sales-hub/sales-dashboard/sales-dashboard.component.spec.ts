import { of, Subject } from 'rxjs';

import { SalesDashboardComponent } from './sales-dashboard.component';
import { SalesService } from '../../../service/sales/sales.service';
import { Invoice, InvoiceStatus } from '../../../domain/sales/sales.dto';

describe('SalesDashboardComponent', () => {
  let component: SalesDashboardComponent;
  let salesService: jasmine.SpyObj<SalesService>;

  const invoice = (over: Partial<Invoice> = {}): Invoice => ({
    id: 1, invoiceNumber: 'INV-1', status: 'SENT' as InvoiceStatus, totalAmount: 1000,
    issueDate: new Date(), ...over
  } as Invoice);

  beforeEach(() => {
    salesService = jasmine.createSpyObj<SalesService>('SalesService', ['getQuotes', 'getInvoices', 'getCustomers', 'getSalesandTransactions']);
    component = new SalesDashboardComponent(
      { add: jasmine.createSpy('add') } as any,
      salesService,
      { snapshot: { paramMap: { get: () => null } } } as any,
      { navigate: jasmine.createSpy('navigate') } as any
    );
  });

  describe('Total Revenue: only counts invoices actually sent to a customer', () => {
    it('excludes DRAFT invoices from totalRevenue', () => {
      salesService.getQuotes.and.returnValue(of({ data: [], total: 0 } as any));
      salesService.getInvoices.and.returnValue(of({
        data: [invoice({ id: 1, status: 'SENT' as InvoiceStatus, totalAmount: 500 }), invoice({ id: 2, status: 'DRAFT' as InvoiceStatus, totalAmount: 9000 })],
        total: 2
      } as any));
      salesService.getCustomers.and.returnValue(of({ data: [], total: 0 } as any));
      salesService.getSalesandTransactions.and.returnValue(of({ data: [], total: 0 } as any));

      (component as any).loadDashboardData();

      expect(component.stats.totalRevenue).toBe(500);
    });
  });

  describe('loadDashboardData: stale response guard', () => {
    it('a slower first request does not overwrite the faster, more recent one', () => {
      const first$ = new Subject<any>();
      const second$ = new Subject<any>();
      let call = 0;
      salesService.getInvoices.and.callFake(() => (call++ === 0 ? first$ : second$).asObservable());
      salesService.getQuotes.and.returnValue(of({ data: [], total: 0 } as any));
      salesService.getCustomers.and.returnValue(of({ data: [], total: 0 } as any));
      salesService.getSalesandTransactions.and.returnValue(of({ data: [], total: 0 } as any));

      (component as any).loadDashboardData(); // request 1 (slow)
      (component as any).loadDashboardData(); // request 2 (fast, resolves first)

      second$.next({ data: [invoice({ totalAmount: 200, status: 'SENT' as InvoiceStatus })], total: 1 });
      second$.complete();
      expect(component.stats.totalRevenue).toBe(200);

      // request 1 finally resolves after request 2 already won — must not overwrite it.
      first$.next({ data: [invoice({ totalAmount: 999999, status: 'SENT' as InvoiceStatus })], total: 1 });
      first$.complete();

      expect(component.stats.totalRevenue).toBe(200);
    });
  });
});

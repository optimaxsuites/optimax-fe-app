import { of, throwError } from 'rxjs';

import { SalesAndTransactionsListComponent } from './sales-and-transactions-list.component';
import { SalesService } from '../../../../service/sales/sales.service';
import { SalesandTransactions, SaleLifecycleStatus } from '../../../../domain/sales/sales.dto';

describe('SalesAndTransactionsListComponent', () => {
  let component: SalesAndTransactionsListComponent;

  const tx = (over: Partial<SalesandTransactions> = {}): SalesandTransactions => ({
    id: 1, orderId: 'ORD-1', totalAmount: 1000, paidAmount: 0, balanceDue: 1000,
    status: 'QUOTE_SENT' as SaleLifecycleStatus, ...over
  } as SalesandTransactions);

  let salesService: jasmine.SpyObj<SalesService>;

  beforeEach(() => {
    salesService = jasmine.createSpyObj<SalesService>('SalesService', ['getSalesandTransactions', 'getCustomers', 'updateSalesandTransactions', 'updateInvoice', 'orderNumberFor', 'getDeliveryNotes', 'getSalesLpos', 'getQuoteLpoDocument', 'getQuotes', 'getInvoices']);
    salesService.orderNumberFor.and.callFake((tx: any) => tx?.orderId || '');
    salesService.getSalesandTransactions.and.returnValue(of({ data: [], total: 0 } as any));
    salesService.getCustomers.and.returnValue(of({ data: [], total: 0 } as any));
    salesService.getDeliveryNotes.and.returnValue(of({ data: [], total: 0 }));
    salesService.getSalesLpos.and.returnValue(of([]));
    salesService.getQuoteLpoDocument.and.returnValue(null);
    salesService.getQuotes.and.returnValue(of({ data: [], total: 0 }));
    salesService.getInvoices.and.returnValue(of({ data: [], total: 0 }));
    component = new SalesAndTransactionsListComponent(
      salesService,
      { navigate: jasmine.createSpy('navigate') } as any,
      { snapshot: { paramMap: { get: () => null } } } as any,
      { add: jasmine.createSpy('add') } as any
    );
  });

  describe('canRecordPayment', () => {
    it('is true whenever a balance remains and the transaction is not rejected/failed', () => {
      expect(component.canRecordPayment(tx({ balanceDue: 500, status: 'PAYMENT_PENDING' as SaleLifecycleStatus }))).toBeTrue();
    });

    it('is false once fully paid (no balance due)', () => {
      expect(component.canRecordPayment(tx({ balanceDue: 0, status: 'PAYMENT_COMPLETED' as SaleLifecycleStatus }))).toBeFalse();
    });

    it('is false for a rejected quote or a failed payment even if balanceDue is stale/nonzero', () => {
      expect(component.canRecordPayment(tx({ balanceDue: 500, status: 'QUOTE_REJECTED' as SaleLifecycleStatus }))).toBeFalse();
      expect(component.canRecordPayment(tx({ balanceDue: 500, status: 'PAYMENT_FAILED' as SaleLifecycleStatus }))).toBeFalse();
    });

    it('is false once the invoice has been cancelled, even if balanceDue is stale/nonzero', () => {
      expect(component.canRecordPayment(tx({ balanceDue: 500, status: 'INVOICE_CANCELLED' as SaleLifecycleStatus }))).toBeFalse();
    });

    it('is false before any invoice exists yet (still at quote stage)', () => {
      expect(component.canRecordPayment(tx({ balanceDue: 500, status: 'QUOTE_SENT' as SaleLifecycleStatus }))).toBeFalse();
      expect(component.canRecordPayment(tx({ balanceDue: 500, status: 'QUOTE_CONVERTED' as SaleLifecycleStatus }))).toBeFalse();
    });

    it('is false for a refunded or returned order even if balanceDue is stale/nonzero', () => {
      expect(component.canRecordPayment(tx({ balanceDue: 500, status: 'PAYMENT_REFUNDED' as SaleLifecycleStatus }))).toBeFalse();
      expect(component.canRecordPayment(tx({ balanceDue: 500, status: 'RETURNED' as SaleLifecycleStatus }))).toBeFalse();
    });
  });

  describe('savePayment: keeping the linked invoice in sync', () => {
    it('pushes the new paidAmount/balanceDue onto the linked invoice after a successful payment', () => {
      const t = tx({ id: 5, balanceDue: 1000, paidAmount: 0, totalAmount: 1000, invoiceId: { id: 99 } as any });
      component.selectedTxForPayment = t;
      component.paymentAmount = 400;
      salesService.updateSalesandTransactions.and.returnValue(of({ ...t, paidAmount: 400, balanceDue: 600 } as any));
      salesService.updateInvoice.and.returnValue(of({} as any));

      component.savePayment();

      expect(salesService.updateInvoice).toHaveBeenCalledWith(99, jasmine.objectContaining({ amountPaid: 400, balanceDue: 600 }));
    });

    it('does not attempt to sync an invoice when the transaction has none linked', () => {
      const t = tx({ id: 6, balanceDue: 1000, paidAmount: 0, totalAmount: 1000, invoiceId: undefined as any });
      component.selectedTxForPayment = t;
      component.paymentAmount = 400;
      salesService.updateSalesandTransactions.and.returnValue(of({ ...t, paidAmount: 400, balanceDue: 600 } as any));

      component.savePayment();

      expect(salesService.updateInvoice).not.toHaveBeenCalled();
    });

    it('does not fail the payment flow if syncing the invoice fails', () => {
      const t = tx({ id: 5, balanceDue: 1000, paidAmount: 0, totalAmount: 1000, invoiceId: { id: 99 } as any });
      component.selectedTxForPayment = t;
      component.paymentAmount = 400;
      salesService.updateSalesandTransactions.and.returnValue(of({ ...t, paidAmount: 400, balanceDue: 600 } as any));
      salesService.updateInvoice.and.returnValue(throwError(() => new Error('500')));

      expect(() => component.savePayment()).not.toThrow();
      expect(component.isSavingPayment).toBeFalse();
    });
  });

  describe('canViewReceipt', () => {
    it('is false until at least one payment has been recorded', () => {
      expect(component.canViewReceipt(tx({ paidAmount: 0 }))).toBeFalse();
    });

    it('is true once any amount has been paid', () => {
      expect(component.canViewReceipt(tx({ paidAmount: 250 }))).toBeTrue();
    });
  });

  describe('status column and filters follow the order\'s real stage', () => {
    it('shows a delivery stage the order record\'s own status never reached', () => {
      salesService.getSalesandTransactions.and.returnValue(of({ data: [
        { id: 42, status: 'QUOTE_CONVERTED', quoteId: { id: 3, status: 'CONVERTED' } },
        { id: 43, status: 'QUOTE_SENT', quoteId: { id: 5, status: 'SENT' } }
      ], total: 2 } as any));
      salesService.getDeliveryNotes.and.returnValue(of({ data: [{ id: 4, salesOrderId: 42, status: 'IN_TRANSIT' }] as any, total: 1 }));

      component.loadTransactions();

      const order = component.transactions.find((t: any) => t.id === 42)!;
      expect(component.progressOf(order).label).toBe('In Transit');
      expect(component.getStageCount('IN_DELIVERY')).toBe(1);
      expect(component.getStageCount('QUOTE')).toBe(1);

      component.selectedStatus = 'IN_DELIVERY';
      component.applyFilters();
      expect(component.filteredTransactions.map((t: any) => t.id)).toEqual([42]);
    });
  });

  describe('quote number and amount come from the linked quote/invoice', () => {
    const load = (orders: any[], quotes: any[] = [], invoices: any[] = []) => {
      salesService.getSalesandTransactions.and.returnValue(of({ data: orders, total: orders.length } as any));
      salesService.getQuotes.and.returnValue(of({ data: quotes, total: quotes.length } as any));
      salesService.getInvoices.and.returnValue(of({ data: invoices, total: invoices.length } as any));
      component.loadTransactions();
    };

    it('shows the quote number when the order only carries the quote\'s id', () => {
      load([tx({ id: 1, quoteId: 3 as any })], [{ id: 3, quoteNumber: 'QUO-003', totalAmount: 1000 }]);
      expect(component.getQuoteNumber(component.transactions[0])).toBe('QUO-003');
    });

    it('still reads a quote number nested on the order', () => {
      load([tx({ id: 1, quoteId: { id: 3, quoteNumber: 'QUO-003' } as any })]);
      expect(component.getQuoteNumber(component.transactions[0])).toBe('QUO-003');
    });

    it('finds orders by their quote number when it is only linked by id', () => {
      load([tx({ id: 1, quoteId: 3 as any }), tx({ id: 2, orderId: 'ORD-2', quoteId: 4 as any })],
        [{ id: 3, quoteNumber: 'QUO-003' }, { id: 4, quoteNumber: 'QUO-004' }]);
      component.searchTerm = 'quo-004';
      component.applyFilters();
      expect(component.filteredTransactions.map((t: any) => t.id)).toEqual([2]);
    });

    it('uses the invoice total once invoiced, over a stale copy on the order', () => {
      load([tx({ id: 1, totalAmount: 1000, quoteId: 3 as any, invoiceId: 7 as any })],
        [{ id: 3, totalAmount: 1200 }], [{ id: 7, totalAmount: 1290 }]);
      expect(component.amountOf(component.transactions[0])).toBe(1290);
    });

    it('uses the quote total before there is an invoice', () => {
      load([tx({ id: 1, totalAmount: 1000, quoteId: 3 as any })], [{ id: 3, totalAmount: 1200 }]);
      expect(component.amountOf(component.transactions[0])).toBe(1200);
    });

    it('falls back to the order\'s own total when neither document is found', () => {
      load([tx({ id: 1, totalAmount: 1000, quoteId: 99 as any })]);
      expect(component.amountOf(component.transactions[0])).toBe(1000);
    });
  });
});

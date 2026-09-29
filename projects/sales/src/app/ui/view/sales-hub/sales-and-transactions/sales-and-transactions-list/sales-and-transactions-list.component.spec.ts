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
    salesService = jasmine.createSpyObj<SalesService>('SalesService', ['getSalesandTransactions', 'getCustomers', 'updateSalesandTransactions', 'updateInvoice']);
    salesService.getSalesandTransactions.and.returnValue(of({ data: [], total: 0 } as any));
    salesService.getCustomers.and.returnValue(of({ data: [], total: 0 } as any));
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

  describe('canGenerateDeliveryNote', () => {
    it('is false before an invoice exists (still at quote stage)', () => {
      expect(component.canGenerateDeliveryNote(tx({ status: 'QUOTE_SENT' as SaleLifecycleStatus }))).toBeFalse();
      expect(component.canGenerateDeliveryNote(tx({ status: 'QUOTE_ACCEPTED' as SaleLifecycleStatus }))).toBeFalse();
      expect(component.canGenerateDeliveryNote(tx({ status: 'QUOTE_CONVERTED' as SaleLifecycleStatus }))).toBeFalse();
    });

    it('is false once the invoice has been cancelled', () => {
      expect(component.canGenerateDeliveryNote(tx({ status: 'INVOICE_CANCELLED' as SaleLifecycleStatus }))).toBeFalse();
    });

    it('is true from INVOICE_SENT onward through the rest of the fulfilment lifecycle', () => {
      const laterStatuses: SaleLifecycleStatus[] = [
        'INVOICE_SENT', 'PAYMENT_PENDING', 'PAYMENT_COMPLETED', 'DISPATCHED', 'DELIVERED'
      ] as SaleLifecycleStatus[];
      laterStatuses.forEach(status => {
        expect(component.canGenerateDeliveryNote(tx({ status }))).toBeTrue();
      });
    });
  });

  describe('openDeliveryNoteModal', () => {
    it('navigates to the delivery note form with the order id as a query param', () => {
      const t = tx({ id: 7 });
      const navigateSpy = (component as any).router.navigate as jasmine.Spy;

      component.openDeliveryNoteModal(t);

      expect(navigateSpy).toHaveBeenCalledWith(
        ['/admin/sales/delivery-notes/new'],
        { queryParams: { orderId: '7' } }
      );
    });

    it('includes the :uuid segment when one is present on the current route', () => {
      const routeWithUuid = { snapshot: { paramMap: { get: () => 'abc-123' } } } as any;
      const navigateSpy = jasmine.createSpy('navigate');
      const c = new SalesAndTransactionsListComponent(
        salesService,
        { navigate: navigateSpy } as any,
        routeWithUuid,
        { add: jasmine.createSpy('add') } as any
      );

      c.openDeliveryNoteModal(tx({ id: 9 }));

      expect(navigateSpy).toHaveBeenCalledWith(
        ['/admin/sales/delivery-notes/new', 'abc-123'],
        { queryParams: { orderId: '9' } }
      );
    });

    it('stops event propagation when an event is passed', () => {
      const event = jasmine.createSpyObj('Event', ['stopPropagation']);
      component.openDeliveryNoteModal(tx({ id: 3 }), event);
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });
});

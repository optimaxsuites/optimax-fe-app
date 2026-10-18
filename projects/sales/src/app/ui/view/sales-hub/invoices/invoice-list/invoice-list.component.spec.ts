import { of } from 'rxjs';

import { InvoiceListComponent } from './invoice-list.component';
import { SalesService } from '../../../../service/sales/sales.service';
import { Invoice, InvoiceStatus } from '../../../../domain/sales/sales.dto';

describe('InvoiceListComponent', () => {
  let component: InvoiceListComponent;
  let salesService: jasmine.SpyObj<SalesService>;

  const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

  const invoice = (over: Partial<Invoice> = {}): Invoice => ({
    id: 1, invoiceNumber: 'INV-1', status: 'SENT' as InvoiceStatus, dueDate: futureDate, ...over
  } as Invoice);

  beforeEach(() => {
    salesService = jasmine.createSpyObj<SalesService>('SalesService', ['getInvoices', 'getCustomers', 'updateInvoice', 'getOrderIdLookup', 'orderNumberForInvoice']);
    salesService.getOrderIdLookup.and.returnValue(of({ byQuoteId: new Map(), byTransactionId: new Map(), byInvoiceId: new Map() }));
    salesService.orderNumberForInvoice.and.returnValue('');
    salesService.getCustomers.and.returnValue(of({ data: [], total: 0 } as any));
    component = new InvoiceListComponent(
      { add: jasmine.createSpy('add') } as any,
      salesService,
      { snapshot: { paramMap: { get: () => null } } } as any,
      { navigate: jasmine.createSpy('navigate') } as any
    );
  });

  describe('Overdue filter: was permanently broken (OVERDUE is not a real InvoiceStatus)', () => {
    it('actually returns overdue SENT invoices instead of always zero results', () => {
      salesService.getInvoices.and.returnValue(of({
        data: [
          invoice({ id: 1, status: 'SENT' as InvoiceStatus, dueDate: pastDate }),
          invoice({ id: 2, status: 'SENT' as InvoiceStatus, dueDate: futureDate }),
          invoice({ id: 3, status: 'DRAFT' as InvoiceStatus, dueDate: pastDate })
        ],
        total: 3
      } as any));
      component.filters.status = 'OVERDUE';

      component.loadInvoices();

      expect(component.invoices.length).toBe(1);
      expect(component.invoices[0].id).toBe(1);
      expect(component.totalElements).toBe(1);
    });

    it('stats.overdue reflects reality instead of a hardcoded 0, so the AI banner can actually appear', () => {
      salesService.getInvoices.and.returnValue(of({
        data: [invoice({ id: 1, status: 'SENT' as InvoiceStatus, dueDate: pastDate })],
        total: 1
      } as any));

      component.loadInvoices();

      expect(component.stats.overdue).toBe(1);
    });
  });

  describe('bulkCancelInvoices: had no handler before', () => {
    beforeEach(() => spyOn(window, 'confirm').and.returnValue(true));

    it('cancels every selected invoice that is not already cancelled', () => {
      salesService.updateInvoice.and.returnValue(of({} as any));
      component.invoices = [
        invoice({ id: 1, status: 'SENT' as InvoiceStatus }),
        invoice({ id: 2, status: 'CANCELLED' as InvoiceStatus })
      ];
      component.selectedInvoiceIds = [1, 2] as any;
      salesService.getInvoices.and.returnValue(of({ data: [], total: 0 } as any));

      component.bulkCancelInvoices();

      expect(salesService.updateInvoice).toHaveBeenCalledTimes(1);
      expect(salesService.updateInvoice).toHaveBeenCalledWith(1, { status: 'CANCELLED' });
    });
  });

  describe('confirmSendReminder: no longer mutates invoice status', () => {
    it('does not call updateInvoice at all (used to silently force status to SENT)', () => {
      (component as any).pendingInvoice = invoice({ id: 1, status: 'SENT' as InvoiceStatus });

      component.confirmSendReminder();

      expect(salesService.updateInvoice).not.toHaveBeenCalled();
    });
  });
});

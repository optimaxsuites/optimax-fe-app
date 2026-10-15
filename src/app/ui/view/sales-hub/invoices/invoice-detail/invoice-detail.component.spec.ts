import { of } from 'rxjs';

import { InvoiceDetailComponent } from './invoice-detail.component';
import { Invoice, InvoiceStatus } from '../../../../domain/sales/sales.dto';

describe('InvoiceDetailComponent: Send Invoice emails the customer, then marks it SENT', () => {
  let component: InvoiceDetailComponent;
  let salesService: jasmine.SpyObj<any>;
  let documentEmail: jasmine.SpyObj<any>;

  const draft = () => ({
    id: 8, invoiceNumber: 'INV-8', status: 'DRAFT' as InvoiceStatus,
    customerName: { id: 7, name: 'Acme Co', email: 'a@acme.com' }
  } as unknown as Invoice);

  beforeEach(() => {
    salesService = jasmine.createSpyObj('SalesService', ['markInvoiceSent', 'getCustomers']);
    documentEmail = jasmine.createSpyObj('SalesDocumentEmailService', ['sendInvoice', 'isSent']);
    documentEmail.isSent.and.callFake((r: string) => r === 'SENT' || r === 'QUEUED');
    component = new InvoiceDetailComponent(
      { add: jasmine.createSpy('add') } as any,
      { paramMap: of({ get: () => null }), snapshot: { paramMap: { get: () => null } } } as any,
      { navigate: jasmine.createSpy('navigate') } as any,
      salesService,
      documentEmail
    );
  });

  it('opens the email dialog pre-filled with an editable subject and message', () => {
    component.invoice = draft();
    component.sendInvoice();
    expect(component.showSendInvoiceModal).toBeTrue();
    expect(component.emailSubject).toContain('INV-8');
    expect(component.emailMessage).toContain('Acme Co');
  });

  it('marks it SENT once the email has gone out', async () => {
    component.invoice = draft();
    component.sendInvoice();
    documentEmail.sendInvoice.and.returnValue(Promise.resolve('SENT'));
    salesService.markInvoiceSent.and.returnValue(of({ ...draft(), status: 'SENT' }));

    await component.confirmSendInvoice();

    expect(documentEmail.sendInvoice).toHaveBeenCalledWith(jasmine.objectContaining({ id: 8 }), jasmine.objectContaining({ to: 'a@acme.com' }));
    expect(component.invoice?.status).toBe('SENT');
    expect(component.showSendInvoiceModal).toBeFalse();
  });

  it('keeps the dialog open and the invoice a DRAFT when the email fails', async () => {
    component.invoice = draft();
    component.sendInvoice();
    documentEmail.sendInvoice.and.returnValue(Promise.resolve('FAILED'));

    await component.confirmSendInvoice();

    expect(salesService.markInvoiceSent).not.toHaveBeenCalled();
    expect(component.invoice?.status).toBe('DRAFT');
    expect(component.showSendInvoiceModal).toBeTrue();
  });
});

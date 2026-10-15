import { of } from 'rxjs';
import { FormBuilder } from '@angular/forms';

import { InvoiceFormComponent } from './invoice-form.component';
import { Invoice } from '../../../../domain/sales/sales.dto';

describe('InvoiceFormComponent: lands on the invoice detail page after delivery', () => {
  let component: InvoiceFormComponent;
  let router: { navigate: jasmine.Spy };
  let salesService: jasmine.SpyObj<any>;
  let documentEmail: jasmine.SpyObj<any>;

  const invoice = { id: 8, invoiceNumber: 'INV-8', quoteId: 3, customerName: { name: 'Acme Co' } } as unknown as Invoice;

  beforeEach(() => {
    router = { navigate: jasmine.createSpy('navigate') };
    salesService = jasmine.createSpyObj('SalesService', ['updateQuote', 'markInvoiceSent']);
    salesService.updateQuote.and.returnValue(of({}));
    salesService.markInvoiceSent.and.callFake((i: any) => of({ ...i, status: 'SENT' }));
    documentEmail = jasmine.createSpyObj('SalesDocumentEmailService', ['sendInvoice', 'isSent']);
    documentEmail.isSent.and.callFake((r: string) => r === 'SENT' || r === 'QUEUED');
    component = new InvoiceFormComponent(
      { add: jasmine.createSpy('add') } as any,
      new FormBuilder(),
      { snapshot: { paramMap: { get: () => null }, queryParamMap: { get: () => null } } } as any,
      salesService,
      { getProfile: () => of(null) } as any,
      {} as any,
      jasmine.createSpyObj('SalesEmailService', ['send']),
      { detectChanges: () => {} } as any,
      router as any,
      documentEmail
    );
  });

  const expectDetailPage = () =>
    expect(router.navigate).toHaveBeenCalledWith(['/admin/sales/invoices', 8], { replaceUrl: true });

  it('goes to the detail page once the email has been sent', async () => {
    spyOn<any>(component, 'sendInvoiceEmail').and.returnValue(Promise.resolve());
    await (component as any).handleDeliveryAction(invoice, 'email');
    expect(router.navigate).not.toHaveBeenCalled();

    await component.confirmSendInvoice();

    expectDetailPage();
  });

  it('closing the Send modal still finishes the submit: marks the quote converted and opens the invoice', async () => {
    await (component as any).handleDeliveryAction(invoice, 'email');

    component.skipSendInvoice();

    expect(salesService.updateQuote).toHaveBeenCalledWith(3, { status: 'CONVERTED' });
    expect(component.showSendInvoiceModal).toBeFalse();
    expectDetailPage();
  });

  describe('emailing marks the invoice SENT', () => {
    beforeEach(() => spyOn<any>(component, 'generateInvoicePDF').and.returnValue(Promise.resolve(new Blob(['x']))));

    it('marks it SENT once the email has gone out', async () => {
      documentEmail.sendInvoice.and.returnValue(Promise.resolve('QUEUED'));
      expect(await (component as any).sendInvoiceEmail({ ...invoice, customerName: { name: 'Acme', email: 'a@acme.com' } })).toBeTrue();
      expect(salesService.markInvoiceSent).toHaveBeenCalledWith(jasmine.objectContaining({ id: 8 }));
    });

    it('leaves it a DRAFT when the email fails', async () => {
      documentEmail.sendInvoice.and.returnValue(Promise.resolve('FAILED'));
      expect(await (component as any).sendInvoiceEmail({ ...invoice, customerName: { name: 'Acme', email: 'a@acme.com' } })).toBeFalse();
      expect(salesService.markInvoiceSent).not.toHaveBeenCalled();
    });
  });
});

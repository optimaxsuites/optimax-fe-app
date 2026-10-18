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
    salesService = jasmine.createSpyObj('SalesService', ['markInvoiceSent', 'getCustomers', 'getQuoteById', 'getDeliveryNotes', 'getQuoteSignedDeliveryNote']);
    salesService.getQuoteById.and.returnValue(of(null));
    salesService.getDeliveryNotes.and.returnValue(of({ data: [], total: 0 }));
    salesService.getQuoteSignedDeliveryNote.and.returnValue(null);
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

  describe('Signed Delivery Note — for invoices from the Quote → LPO → Delivery Note flow', () => {
    const signed = { fileName: 'signed-dn.pdf', base64Content: btoa('%PDF'), contentType: 'application/pdf', uploadedAt: 'then' };

    it('shows the signed copy stored for the invoice\'s quote, with its delivery note', () => {
      salesService.getQuoteById.and.returnValue(of({ id: 3 } as any));
      salesService.getQuoteSignedDeliveryNote.and.returnValue(signed);
      salesService.getDeliveryNotes.and.returnValue(of({ data: [{ id: 4, deliveryNumber: 'DN-4', quoteId: 3, receivedByName: 'J. Okafor', items: [] } as any], total: 1 }));

      (component as any).loadSignedDeliveryNote({ id: 8, quoteId: '3' });

      expect(component.fromDeliveryFlow).toBeTrue();
      expect(component.deliveryNote?.deliveryNumber).toBe('DN-4');
      expect(component.canViewSigned).toBeTrue();
      component.viewSignedDeliveryNote();
      expect(component.showSignedViewer).toBeTrue();
    });

    it('uses the delivery note\'s stored URL once the backend provides one', () => {
      component.deliveryNote = { id: 4, deliveryNumber: 'DN-4', signedDocumentUrl: 'https://files/signed.pdf' } as any;
      expect(component.signedDocument?.url).toBe('https://files/signed.pdf');
    });

    it('is not shown for a standalone invoice', () => {
      component.invoice = { id: 9 } as any;
      (component as any).loadSignedDeliveryNote({ id: 9 });
      expect(component.fromDeliveryFlow).toBeFalse();
      expect(salesService.getQuoteById).not.toHaveBeenCalled();
    });

    it('says when nothing was uploaded', () => {
      salesService.getQuoteById.and.returnValue(of({ id: 3 } as any));
      (component as any).loadSignedDeliveryNote({ id: 8, quoteId: '3' });
      expect(component.canViewSigned).toBeFalse();
      expect(component.signedLookupDone).toBeTrue();
    });
  });
});

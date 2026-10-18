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
    salesService = jasmine.createSpyObj('SalesService', ['updateQuote', 'markInvoiceSent', 'recordSignedDeliveryNote', 'updateDeliveryNote']);
    salesService.updateDeliveryNote.and.callFake((id: any, body: any) => of(body));
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

  describe('tax on a line', () => {
    const addLine = (qty: number, price: number, tax: number) => {
      (component as any).addLineItem();
      const row = (component as any).items.at((component as any).items.length - 1);
      row.patchValue({ quantity: qty, unitPrice: price, taxRate: tax });
      return row;
    };

    it('changes the line amount as soon as a tax rate is entered, with tax as its own row', () => {
      const row = addLine(2, 100, 10);

      expect(row.getRawValue().total).toBe(220);
      expect(component.subtotal).toBe(200);
      expect(component.totalTax).toBe(20);
      expect(component.grandTotal).toBe(220);
    });

    it('carries each line\'s tax rate onto the saved record used for the email and PDF', () => {
      addLine(2, 100, 10);
      const enriched = (component as any).withFormTax({ id: 1, items: [{ productName: 'Widget', quantity: 2, unitPrice: 100 }] });
      expect(enriched.items[0].taxRate).toBe(10);
      expect(enriched.taxAmount).toBe(20);
    });

    it('keeps the backend\'s values when it does return them', () => {
      addLine(2, 100, 10);
      const enriched = (component as any).withFormTax({ id: 1, taxAmount: 5, items: [{ taxRate: 2.5, total: 205 }] });
      expect(enriched.items[0].taxRate).toBe(2.5);
      expect(enriched.taxAmount).toBe(5);
    });
  });

  describe('Generate Invoice from a delivery note: Upload Signed Delivery Note → Template → Preview & Send', () => {
    const signed: any = { fileName: 'signed.pdf', base64Content: 'x', contentType: 'application/pdf', uploadedAt: 'now' };

    beforeEach(() => {
      component.deliveryNoteId = '4';
      component.quoteId = '3';
      component.deliveryNote = { id: 4, deliveryNumber: 'DN-4', status: 'DELIVERED', items: [], customerAddress: '' } as any;
      component.currentStep = 0;
    });

    it('will not move on without a signed copy, and says why on the card', async () => {
      await component.submitSignedCopy();
      expect(component.currentStep as number).toBe(0);
      expect(component.signedError).toContain('Choose the signed delivery note');
      expect(salesService.recordSignedDeliveryNote).not.toHaveBeenCalled();
    });

    it('requires who received the goods and when', async () => {
      component.signedFileName = 'signed.pdf';
      (component as any).signedFile = signed;
      component.receivedByName = '';
      await component.submitSignedCopy();
      expect(component.signedError).toContain('who received the goods');
      expect(salesService.recordSignedDeliveryNote).not.toHaveBeenCalled();
    });

    it('waits for a file that is still being read instead of needing another click', async () => {
      let finishReading!: (f: any) => void;
      component.signedFileName = 'signed.pdf';
      (component as any).signedFileReady = new Promise(resolve => (finishReading = resolve));
      component.receivedByName = 'J. Okafor';
      component.receivedDate = '2026-10-18';
      salesService.recordSignedDeliveryNote.and.returnValue(of({ quote: {} as any, note: null, noteSaved: true }));

      const pending = component.submitSignedCopy();
      expect(component.isSavingSignedCopy).toBeTrue();
      finishReading(signed);
      await pending;

      expect(salesService.recordSignedDeliveryNote).toHaveBeenCalledWith('3', signed, jasmine.anything(), jasmine.anything());
      expect(component.currentStep as number).toBe(3);
    });

    it('stores the signed copy with the receiver, then goes to the template', async () => {
      component.signedFileName = 'signed.pdf';
      (component as any).signedFile = signed;
      component.receivedByName = 'J. Okafor';
      component.receivedDate = '2026-10-18';
      salesService.recordSignedDeliveryNote.and.returnValue(of({ quote: {} as any, note: { id: 4, receivedByName: 'J. Okafor' } as any, noteSaved: true }));

      await component.submitSignedCopy();

      expect(salesService.recordSignedDeliveryNote).toHaveBeenCalledWith('3', signed, jasmine.objectContaining({ id: 4 }), {
        receivedByName: 'J. Okafor', receivedAt: new Date('2026-10-18').toISOString()
      });
      expect(component.currentStep as number).toBe(3);
    });

    it('moves straight on when a signed copy is already on file', async () => {
      component.signedCopyOnFile = 'signed-earlier.pdf';
      await component.submitSignedCopy();
      expect(component.currentStep as number).toBe(3);
      expect(salesService.recordSignedDeliveryNote).not.toHaveBeenCalled();
    });

    it('Back from the template returns to the signed copy step', () => {
      component.currentStep = 3;
      component.prevStep();
      expect(component.currentStep as number).toBe(0);
    });

    it('links the delivery note to the invoice once it is created', () => {
      (component as any).finalizeInvoiceSubmit({ id: 8, invoiceNumber: 'INV-8' } as any);
      expect(salesService.updateDeliveryNote).toHaveBeenCalledWith(4, jasmine.objectContaining({ invoiceId: 8 }));
    });
  });
});

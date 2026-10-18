import { of } from 'rxjs';
import { PaymentReceiptComponent } from './payment-receipt.component';

describe('PaymentReceiptComponent', () => {
  let component: PaymentReceiptComponent;
  let salesService: jasmine.SpyObj<any>;
  let documentEmail: jasmine.SpyObj<any>;

  const snapshot: any = {
    tx: { id: 42, totalAmount: 1000, paidAmount: 400, paymentMethod: 'BANK_TRANSFER', reference: 'REF-1' },
    invoice: { id: 8, invoiceNumber: 'INV-8', dueDate: '2026-11-17' },
    quote: { id: 3 },
    customer: { id: 7, name: 'Acme Co', email: 'a@acme.com' },
    items: [{ productName: 'iPad', quantity: 1, unitPrice: 1000, total: 1000 }],
    deliveryNote: null, lpo: null, progress: {}
  };

  beforeEach(() => {
    salesService = jasmine.createSpyObj('SalesService', ['getOrderSnapshot', 'getMyMerchantInfo', 'orderNumberFor', 'getDocumentTemplateId']);
    salesService.getOrderSnapshot.and.returnValue(of(snapshot));
    salesService.getMyMerchantInfo.and.returnValue(of({ companyName: 'Seller Ltd', email: 'seller@x.com' }));
    salesService.orderNumberFor.and.returnValue('ORD-2026-00042');
    salesService.getDocumentTemplateId.and.returnValue('emirates');
    documentEmail = jasmine.createSpyObj('SalesDocumentEmailService', ['sendReceipt', 'isSent']);
    documentEmail.isSent.and.callFake((r: string) => r === 'SENT');
    component = new PaymentReceiptComponent({ add: jasmine.createSpy('add') } as any, salesService, documentEmail);
    component.paymentId = 42;
  });

  it('fills the receipt from the order: customer, invoice, lines, amounts', () => {
    component.ngOnInit();
    const r = component.receipt!;
    expect(salesService.getOrderSnapshot).toHaveBeenCalledWith(42);
    expect(r.number).toBe('RCT-2026-00042');
    expect(r.to.name).toBe('Acme Co');
    expect(r.from.name).toBe('Seller Ltd');
    expect(r.lines.length).toBe(1);
    expect(r.paidNow).toBe(400);
    expect(r.balanceDue).toBe(600);
    expect(r.references).toContain({ label: 'Invoice #', value: 'INV-8' });
    expect(component.template?.id).toBe('emirates');
  });

  it('emails the receipt (with its PDF) to the customer', async () => {
    component.ngOnInit();
    spyOn<any>(component, 'renderPdf').and.returnValue(Promise.resolve(new Blob(['x'])));
    documentEmail.sendReceipt.and.returnValue(Promise.resolve({ result: 'SENT', detail: 'ok' }));

    component.openEmail();
    expect(component.showEmailModal).toBeTrue();
    await component.sendEmail();

    expect(documentEmail.sendReceipt).toHaveBeenCalledWith(
      jasmine.objectContaining({ number: 'RCT-2026-00042', paidNow: 400, invoiceNumber: 'INV-8' }),
      jasmine.objectContaining({ to: 'a@acme.com', pdfBlob: jasmine.any(Blob) }));
    expect(component.showEmailModal).toBeFalse();
  });
});

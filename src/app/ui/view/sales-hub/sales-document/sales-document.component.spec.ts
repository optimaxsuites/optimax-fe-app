import { SalesDocumentComponent } from './sales-document.component';
import { QUOTE_TEMPLATES } from '../template-types/template-types.component';
import { quoteDocument, receiptDocument } from '../../../service/sales/sales-document';

describe('SalesDocumentComponent', () => {
  let component: SalesDocumentComponent;
  const template = (id: string) => QUOTE_TEMPLATES.find(t => t.id === id)!;
  const quote = { quoteNumber: 'QT-1', items: [{ productName: 'iPad', quantity: 1, unitPrice: 100, taxRate: 7.5, total: 107.5 }], subtotal: 100, taxAmount: 7.5, totalAmount: 107.5 };

  beforeEach(() => {
    component = new SalesDocumentComponent();
    component.doc = quoteDocument(quote, { companyName: 'Seller' }, { name: 'Buyer' });
  });

  it('lays a quote out in the template the seller picked', () => {
    component.template = template('emirates');
    expect(component.layout).toBe('centrifuge');
    expect(component.accent).toBe('#A32638');
    component.template = template('minimal');
    expect(component.layout).toBe('minimal');
    component.template = null;
    expect(component.layout).toBe('standard');
  });

  it('always uses the receipt layout for receipts, in the template\'s colour', () => {
    component.doc = receiptDocument({ receiptNumber: 'RCT-1', tx: { totalAmount: 100, paidAmount: 100 } });
    component.template = template('custom-client');
    expect(component.layout).toBe('receipt');
    expect(component.accent).toBe('#2EB270');
  });

  it('labels tax with the rate and hides the per-line column when the template turns tax breakdown off', () => {
    expect(component.taxLabel).toBe('Tax @ 7.5%');
    expect(component.hasLineTax).toBeTrue();
    component.template = template('minimal');
    expect(component.hasLineTax).toBeFalse();
  });

  it('formats money in the document currency', () => {
    expect(component.money(1500)).toContain('1,500.00');
  });
});

import { amountInWords, invoiceDocument, numberToWords, quoteDocument, receiptDocument } from './sales-document';

describe('sales-document builders', () => {
  const merchant = { companyName: 'Centrifuge Group Ltd', address: ['Plot 5', 'Lekki'], bankDetails: { bankName: 'GTBank', accountNumber: '123' }, logoUrl: ['logo.png'] };
  const items = [{ productName: 'iPad', description: '9th gen', quantity: 2, unitPrice: 100, taxRate: 10, total: 220 }];

  it('builds a quote with its customer, lines, totals and the seller\'s bank details', () => {
    const doc = quoteDocument({ quoteNumber: 'QT-1', validUntil: '2026-11-17', items, subtotal: 200, taxAmount: 20, totalAmount: 220,
      customerName: { name: 'Acme', address: ['12 Broad St'] } }, merchant);
    expect(doc.kind).toBe('QUOTE');
    expect(doc.to.name).toBe('Acme');
    expect(doc.from.address).toBe('Plot 5, Lekki');
    expect(doc.lines[0]).toEqual(jasmine.objectContaining({ description: 'iPad', detail: '9th gen', taxRate: 10, amount: 220 }));
    expect(doc.secondaryDate?.label).toBe('Valid Until');
    expect(doc.bank?.bankName).toBe('GTBank');
    expect(doc.logoUrl).toBe('logo.png');
  });

  it('builds an invoice with its due date and order number', () => {
    const doc = invoiceDocument({ invoiceNumber: 'INV-1', dueDate: '2026-11-17', paymentTerms: 'Net 30', items, totalAmount: 220 }, merchant, { name: 'Acme' }, 'ORD-2026-00042');
    expect(doc.secondaryDate?.label).toBe('Due Date');
    expect(doc.references).toEqual([{ label: 'Order #', value: 'ORD-2026-00042' }, { label: 'Payment Terms', value: 'Net 30' }]);
  });

  it('builds a receipt with what was paid and what is left', () => {
    const doc = receiptDocument({ receiptNumber: 'RCT-1', tx: { totalAmount: 1000, paidAmount: 400, paymentMethod: 'BANK_TRANSFER' },
      invoice: { invoiceNumber: 'INV-1', items }, customer: { name: 'Acme' }, merchant });
    expect(doc.kind).toBe('RECEIPT');
    expect(doc.paidNow).toBe(400);
    expect(doc.balanceDue).toBe(600);
    expect(doc.references).toContain({ label: 'Invoice #', value: 'INV-1' });
    expect(doc.references).toContain({ label: 'Payment Method', value: 'BANK TRANSFER' });
    expect(doc.lines.length).toBe(1);
  });

  it('writes amounts in words', () => {
    expect(numberToWords(955675)).toBe('Nine Hundred and Fifty Five Thousand Six Hundred and Seventy Five');
    expect(amountInWords(1500.5)).toBe('One Thousand Five Hundred Naira and Fifty Kobo only');
    expect(amountInWords(0)).toBe('Zero Naira only');
  });
});

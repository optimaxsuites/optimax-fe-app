import { deriveOrderProgress } from './order-progress';

describe('deriveOrderProgress: where an order actually is', () => {
  const label = (docs: any) => deriveOrderProgress(docs).label;

  it('follows the quote', () => {
    expect(label({ quote: { status: 'DRAFT' } })).toBe('Quote Draft');
    expect(label({ quote: { status: 'SENT' } })).toBe('Quote Sent');
    expect(label({ quote: { status: 'CONVERTED' } })).toBe('Awaiting LPO');
  });

  it('then the LPO and the delivery note', () => {
    const quote = { status: 'CONVERTED' };
    expect(label({ quote, hasLpo: true })).toBe('LPO Received');
    expect(label({ quote, hasLpo: true, deliveryNote: { status: 'PENDING' } })).toBe('Delivery Pending');
    expect(label({ quote, hasLpo: true, deliveryNote: { status: 'DISPATCHED' } })).toBe('Dispatched');
    expect(label({ quote, hasLpo: true, deliveryNote: { status: 'IN_TRANSIT' } })).toBe('In Transit');
    expect(deriveOrderProgress({ quote, deliveryNote: { status: 'DELIVERED' } })).toEqual(jasmine.objectContaining({ label: 'Delivered', stage: 4, filter: 'DELIVERED' }));
  });

  it('then the invoice and payments — even though the order record\'s own status lags behind', () => {
    const base = { quote: { status: 'CONVERTED' }, deliveryNote: { status: 'DELIVERED' } };
    expect(label({ ...base, tx: { status: 'QUOTE_CONVERTED' }, invoice: { status: 'SENT' } })).toBe('Awaiting Payment');
    expect(label({ ...base, tx: { status: 'INVOICE_SENT', totalAmount: 100, paidAmount: 40 }, invoice: { status: 'SENT' } })).toBe('Partly Paid');
    expect(deriveOrderProgress({ ...base, tx: { totalAmount: 100, paidAmount: 100 }, invoice: { status: 'SENT' } }).stage).toBe(6);
  });

  it('says why an order stopped', () => {
    expect(deriveOrderProgress({ quote: { status: 'DECLINED' } })).toEqual(jasmine.objectContaining({ label: 'Quote Declined', stopped: true, filter: 'STOPPED' }));
    expect(label({ quote: { status: 'CONVERTED' }, deliveryNote: { status: 'RETURNED' } })).toBe('Returned');
    expect(label({ quote: { status: 'CONVERTED' }, deliveryNote: { status: 'DELIVERED' }, invoice: { status: 'CANCELLED' } })).toBe('Invoice Cancelled');
  });

  it('handles a standalone invoice with no quote', () => {
    expect(label({ tx: { status: 'INVOICE_SENT' }, invoice: { status: 'SENT' } })).toBe('Awaiting Payment');
  });
});

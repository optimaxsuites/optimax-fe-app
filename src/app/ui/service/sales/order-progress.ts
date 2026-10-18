// order-progress.ts
//
// Where an order actually is in the sales flow. The Sales & Transactions record's own `status`
// is only advanced on quote and invoice events, so on its own it can't say whether the LPO has
// come in or where the delivery is. This reads the order's linked documents instead — the quote,
// its LPO, its delivery note, its invoice and the payments — and reports the furthest point
// reached (or why it stopped).

/** The milestones of an order, in order. */
export const ORDER_STAGES = [
  'Quote Sent',
  'Quote Accepted',
  'LPO Received',
  'Delivery Note',
  'Delivered',
  'Invoiced',
  'Paid'
] as const;

/** The table's status filters — each covers one or more stages. */
export type OrderFilter = 'QUOTE' | 'AWAITING_LPO' | 'IN_DELIVERY' | 'DELIVERED' | 'INVOICED' | 'PAID' | 'STOPPED';

export type OrderTone = 'draft' | 'sent' | 'accepted' | 'pending' | 'transit' | 'delivered' | 'invoice' | 'paid' | 'cancelled';

export interface OrderProgress {
  /** Index into ORDER_STAGES of the furthest milestone reached. */
  stage: number;
  label: string;
  tone: OrderTone;
  filter: OrderFilter;
  /** Declined, cancelled or returned — the order stopped at `stage`. */
  stopped: boolean;
}

export interface OrderDocuments {
  /** The Sales & Transactions record (payments live here). */
  tx?: any;
  quote?: any;
  hasLpo?: boolean;
  deliveryNote?: any;
  invoice?: any;
}

const progress = (stage: number, label: string, tone: OrderTone, filter: OrderFilter, stopped = false): OrderProgress =>
  ({ stage, label, tone, filter, stopped });

export function deriveOrderProgress({ tx, quote, hasLpo, deliveryNote, invoice }: OrderDocuments): OrderProgress {
  const txStatus: string = tx?.status || '';
  const total = Number(tx?.totalAmount ?? invoice?.totalAmount ?? quote?.totalAmount) || 0;
  const paid = Number(tx?.paidAmount) || 0;
  const fullyPaid = (paid > 0 && paid >= total) || txStatus === 'PAYMENT_COMPLETED' || txStatus === 'RECEIPT_GENERATED';

  // Stopped orders — say why, at the stage they stopped
  if (quote?.status === 'DECLINED' || txStatus === 'QUOTE_REJECTED') return progress(0, 'Quote Declined', 'cancelled', 'STOPPED', true);
  if (quote?.status === 'EXPIRED' && !deliveryNote && !invoice) return progress(0, 'Quote Expired', 'cancelled', 'STOPPED', true);
  if (invoice?.status === 'CANCELLED' || txStatus === 'INVOICE_CANCELLED') return progress(5, 'Invoice Cancelled', 'cancelled', 'STOPPED', true);
  if (deliveryNote?.status === 'RETURNED' || txStatus === 'RETURNED') return progress(4, 'Returned', 'cancelled', 'STOPPED', true);
  if (deliveryNote?.status === 'CANCELLED' && !invoice) return progress(3, 'Delivery Cancelled', 'cancelled', 'STOPPED', true);

  // Payment and invoice
  if (fullyPaid) return progress(6, 'Paid', 'paid', 'PAID');
  if (paid > 0) return progress(5, 'Partly Paid', 'pending', 'INVOICED');
  if (invoice || txStatus === 'INVOICE_SENT' || txStatus.startsWith('PAYMENT_')) {
    return invoice?.status === 'DRAFT'
      ? progress(5, 'Invoice Draft', 'invoice', 'INVOICED')
      : progress(5, 'Awaiting Payment', 'invoice', 'INVOICED');
  }

  // Delivery
  switch (deliveryNote?.status) {
    case 'DELIVERED': return progress(4, 'Delivered', 'delivered', 'DELIVERED');
    case 'IN_TRANSIT': return progress(3, 'In Transit', 'transit', 'IN_DELIVERY');
    case 'DISPATCHED': return progress(3, 'Dispatched', 'transit', 'IN_DELIVERY');
    case 'PENDING': return progress(3, 'Delivery Pending', 'pending', 'IN_DELIVERY');
  }
  if (txStatus === 'DELIVERED') return progress(4, 'Delivered', 'delivered', 'DELIVERED');
  if (txStatus === 'DISPATCHED' || txStatus === 'IN_TRANSIT') return progress(3, txStatus === 'IN_TRANSIT' ? 'In Transit' : 'Dispatched', 'transit', 'IN_DELIVERY');

  // LPO and quote
  if (hasLpo) return progress(2, 'LPO Received', 'accepted', 'IN_DELIVERY');
  if (['ACCEPTED', 'CONVERTED'].includes(quote?.status) || txStatus === 'QUOTE_ACCEPTED' || txStatus === 'QUOTE_CONVERTED') {
    return progress(1, 'Awaiting LPO', 'accepted', 'AWAITING_LPO');
  }
  if (quote?.status === 'DRAFT') return progress(0, 'Quote Draft', 'draft', 'QUOTE');
  return progress(0, 'Quote Sent', 'sent', 'QUOTE');
}

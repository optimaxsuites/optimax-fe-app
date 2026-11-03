// sales-document.ts
//
// One shape for everything SalesDocumentComponent prints — a quote, an invoice or a payment
// receipt — so all three render (and download) through the same template layouts. The builders
// below turn the API records into it.

import { formatApiDate } from './date.util';

export type SalesDocumentKind = 'QUOTE' | 'INVOICE' | 'RECEIPT';

export interface SalesDocumentParty {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  taxId?: string;
}

export interface SalesDocumentLine {
  description: string;
  detail?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  amount: number;
}

export interface SalesDocumentModel {
  kind: SalesDocumentKind;
  number: string;
  issueDate?: unknown;
  /** Valid Until (quote), Due Date (invoice), … */
  secondaryDate?: { label: string; value: unknown };
  /** Extra reference rows — Order #, Invoice #, Payment Method, … */
  references: { label: string; value: string }[];
  from: SalesDocumentParty;
  to: SalesDocumentParty;
  logoUrl?: string | null;
  currency: string;
  lines: SalesDocumentLine[];
  subtotal: number;
  discount: number;
  tax: number;
  charges: { label: string; amount: number }[];
  total: number;
  /** Receipts: what this payment covered, everything paid so far, and what's left. */
  paidNow?: number;
  paidToDate?: number;
  balanceDue?: number;
  bank?: { bankName?: string; accountName?: string; accountNumber?: string } | null;
  projectTitle?: string;
  notes?: string;
  terms?: string;
  signatureText?: string;
}

const LABELS: Record<SalesDocumentKind, string> = { QUOTE: 'Quotation', INVOICE: 'Invoice', RECEIPT: 'Receipt' };

export function documentTitle(kind: SalesDocumentKind): string {
  return LABELS[kind];
}

const joinAddress = (v: unknown): string =>
  Array.isArray(v) ? v.filter(Boolean).join(', ') : (typeof v === 'string' ? v : '');

const firstOptions = (opts: any): any => (Array.isArray(opts) ? opts[0] : opts) || {};

function merchantParty(merchant: any): SalesDocumentParty {
  return {
    name: merchant?.companyName || merchant?.name || 'Your Company',
    address: joinAddress(merchant?.address),
    email: merchant?.email,
    phone: merchant?.phone,
    taxId: merchant?.taxId
  };
}

function customerParty(customer: any, fallbackName = 'Customer'): SalesDocumentParty {
  return {
    name: customer?.name || customer?.customerName || fallbackName,
    address: joinAddress(customer?.address) || joinAddress(customer?.deliverAddress),
    email: customer?.email,
    phone: customer?.phone,
    taxId: customer?.taxId
  };
}

function lines(items: any[] | undefined): SalesDocumentLine[] {
  return (items || []).map(item => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return {
      description: item.productName || item.description || '',
      detail: item.productName && item.description ? item.description : undefined,
      quantity,
      unitPrice,
      taxRate: Number(item.taxRate) || 0,
      amount: Number(item.total ?? item.amount) || quantity * unitPrice
    };
  });
}

function charges(doc: any): { label: string; amount: number }[] {
  return (doc?.additionalCharges || []).map((amount: number, i: number) => ({
    label: doc?.additionalChargesLabel?.[i] || 'Additional Charge',
    amount: Number(amount) || 0
  }));
}

function logoOf(doc: any, merchant: any): string | null {
  const logo = doc?.logoUrl ?? merchant?.logoUrl;
  return (Array.isArray(logo) ? logo[0] : logo) || null;
}

function bankOf(doc: any, merchant: any) {
  const b = doc?.merchantDetails?.bankDetails || merchant?.bankDetails;
  return b && (b.bankName || b.accountNumber) ? b : null;
}

/** The customer embedded on a quote/invoice (customerName and customerId both carry it). */
function embeddedCustomer(doc: any): any {
  const c = typeof doc?.customerName === 'object' ? doc.customerName : doc?.customerId;
  if (c && typeof c === 'object') return c;
  // Some records carry just the name as text, which used to print "Customer" on the document instead.
  return typeof doc?.customerName === 'string' && doc.customerName.trim() ? { name: doc.customerName } : null;
}

export function quoteDocument(quote: any, merchant?: any, customer?: any): SalesDocumentModel {
  const opts = firstOptions(quote?.additionalOptions);
  const m = merchant || quote?.merchantDetails;
  return {
    kind: 'QUOTE',
    number: quote?.quoteNumber || '',
    issueDate: quote?.createdAt || quote?.quoteDate,
    secondaryDate: { label: 'Valid Until', value: quote?.validUntil || quote?.expiresAt },
    references: [],
    from: merchantParty(m),
    to: customerParty(customer || embeddedCustomer(quote)),
    logoUrl: logoOf(quote, m),
    currency: quote?.currency || 'NGN',
    lines: lines(quote?.items),
    subtotal: Number(quote?.subtotal) || 0,
    discount: Number(quote?.discountAmount) || 0,
    tax: Number(quote?.taxAmount) || 0,
    charges: charges(quote),
    total: Number(quote?.totalAmount) || 0,
    bank: bankOf(quote, m),
    projectTitle: undefined,
    notes: quote?.notes || opts.notes,
    terms: quote?.terms || opts.terms,
    signatureText: opts.signatureText
  };
}

export function invoiceDocument(invoice: any, merchant?: any, customer?: any, orderNumber?: string): SalesDocumentModel {
  const opts = firstOptions(invoice?.additionalOptions);
  const m = merchant || invoice?.merchantDetails;
  const references = [];
  if (orderNumber) references.push({ label: 'Order #', value: orderNumber });
  if (invoice?.paymentTerms) references.push({ label: 'Payment Terms', value: String(invoice.paymentTerms) });
  return {
    kind: 'INVOICE',
    number: invoice?.invoiceNumber || '',
    issueDate: invoice?.issueDate || invoice?.createdAt,
    secondaryDate: { label: 'Due Date', value: invoice?.dueDate },
    references,
    from: merchantParty(m),
    to: customerParty(customer || embeddedCustomer(invoice)),
    logoUrl: logoOf(invoice, m),
    currency: invoice?.currency || 'NGN',
    lines: lines(invoice?.items),
    subtotal: Number(invoice?.subtotal) || 0,
    discount: Number(invoice?.discountAmount) || 0,
    tax: Number(invoice?.taxAmount) || 0,
    charges: charges(invoice),
    total: Number(invoice?.totalAmount) || 0,
    bank: bankOf(invoice, m),
    notes: invoice?.notes || opts.notes,
    terms: invoice?.terms || opts.terms,
    signatureText: opts.signatureText
  };
}

/** A payment receipt: the invoice's (or quote's) lines and totals, plus what was paid. */
export function receiptDocument(params: {
  receiptNumber: string;
  tx: any;
  invoice?: any;
  quote?: any;
  customer?: any;
  merchant?: any;
  items?: any[];
  orderNumber?: string;
  paidNow?: number;
  paidOn?: unknown;
}): SalesDocumentModel {
  const { tx, invoice, quote, merchant } = params;
  const priced = invoice || quote || {};
  const total = Number(tx?.totalAmount) || Number(priced.totalAmount) || 0;
  const paidToDate = Number(tx?.paidAmount) || 0;
  const references = [];
  if (invoice?.invoiceNumber) references.push({ label: 'Invoice #', value: invoice.invoiceNumber });
  if (params.orderNumber) references.push({ label: 'Order #', value: params.orderNumber });
  if (tx?.paymentMethod) references.push({ label: 'Payment Method', value: String(tx.paymentMethod).replace(/_/g, ' ') });
  if (tx?.reference) references.push({ label: 'Reference', value: String(tx.reference) });
  return {
    kind: 'RECEIPT',
    number: params.receiptNumber,
    issueDate: params.paidOn || tx?.updatedAt || tx?.orderDate,
    secondaryDate: invoice?.dueDate ? { label: 'Due Date', value: invoice.dueDate } : undefined,
    references,
    from: merchantParty(merchant || priced.merchantDetails),
    to: customerParty(params.customer || embeddedCustomer(priced) || embeddedCustomer(tx)),
    logoUrl: logoOf(priced, merchant),
    currency: tx?.currency || priced.currency || 'NGN',
    lines: lines(params.items?.length ? params.items : priced.items),
    subtotal: Number(tx?.subtotal) || Number(priced.subtotal) || 0,
    discount: Number(tx?.discountAmount) || Number(priced.discountAmount) || 0,
    tax: Number(tx?.taxAmount) || Number(priced.taxAmount) || 0,
    charges: charges(priced),
    total,
    paidNow: params.paidNow ?? paidToDate,
    paidToDate,
    balanceDue: Math.max(0, total - paidToDate),
    bank: null,
    notes: tx?.transactionNotes,
    terms: undefined
  };
}

export function formatDocumentDate(value: unknown): string {
  return formatApiDate(value, { day: 'numeric', month: 'short', year: 'numeric' }, 'en-NG', '—');
}

// ── Amount in words ───────────────────────────────────────────────────────────

const UNITS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const TEENS = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

function wordsUnder1000(n: number): string {
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + UNITS[n % 10] : '');
  return UNITS[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + wordsUnder1000(n % 100) : '');
}

export function numberToWords(num: number): string {
  num = Math.floor(Math.abs(num));
  if (num === 0) return 'Zero';
  const parts: string[] = [];
  for (let scale = 0; num > 0; scale++, num = Math.floor(num / 1000)) {
    const chunk = num % 1000;
    if (chunk) parts.unshift(wordsUnder1000(chunk) + (SCALES[scale] ? ' ' + SCALES[scale] : ''));
  }
  return parts.join(' ');
}

/** "Eight Hundred and Eighty-Nine Thousand Naira only" style wording for a total. */
export function amountInWords(amount: number, currency = 'NGN'): string {
  const major = Math.floor(Math.abs(amount) || 0);
  const minor = Math.round(((Math.abs(amount) || 0) - major) * 100);
  const [majorName, minorName] = currency === 'NGN' ? ['Naira', 'Kobo'] : currency === 'USD' ? ['Dollars', 'Cents'] : [currency, 'Cents'];
  let words = `${numberToWords(major)} ${majorName}`;
  if (minor) words += ` and ${numberToWords(minor)} ${minorName}`;
  return `${words} only`;
}

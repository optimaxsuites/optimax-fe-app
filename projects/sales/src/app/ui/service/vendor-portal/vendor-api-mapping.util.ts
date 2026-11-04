// vendor-api-mapping.util.ts
//
// The portal's models were written before the API: statuses are lowercase ('open', 'pending') where the
// backend sends enum constants ('OPEN', 'ISSUED'), ids are strings where it sends numbers, and a quotation
// has a differently shaped body altogether (vendorStatus/totalAmount, no rfqNumber or clientName). Every
// RFQ, quotation, LPO and invoice crosses this file, so the screens keep working with their own models.

import {
  Invoice, ItemAvailability, Lpo, LpoStatus, Quotation, QuotationItem, QuotationStatus, Rfq,
} from '../../domain/vendor-portal/vendor.dto';
import { parseApiDate } from '../sales/date.util';

const DAY_MS = 24 * 60 * 60 * 1000;

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const lower = (v: unknown): string => str(v).toLowerCase();
const num = (v: unknown): number | undefined => {
  const n = Number(v);
  return v === null || v === undefined || v === '' || isNaN(n) ? undefined : n;
};
// Through the shared parser: the backend sends dates as seconds, which new Date() reads as January 1970.
const date = (v: unknown): Date => parseApiDate(v) ?? new Date(NaN);
const optionalDate = (v: unknown): Date | undefined => (v ? date(v) : undefined);

/** A list response, however the backend wrapped it. */
export function listFromApi(res: any): any[] {
  if (Array.isArray(res)) return res;
  return Array.isArray(res?.data) ? res.data : Array.isArray(res?.content) ? res.content : [];
}

// ── RFQ ───────────────────────────────────────────────────────────────────────
export function rfqFromApi(raw: any): Rfq {
  return {
    ...raw,
    id: str(raw.id),
    procurementRequestId: str(raw.procurementRequestId),
    status: lower(raw.status) as Rfq['status'],
    issuedDate: date(raw.issuedDate),
    dueDate: date(raw.dueDate),
    items: (raw.items ?? []).map((i: any) => ({ ...i, id: str(i.id), description: i.description ?? '' })),
  };
}

// ── Quotation ─────────────────────────────────────────────────────────────────
const QUOTATION_STATUS_FROM_API: Record<string, QuotationStatus> = {
  SUBMITTED: 'sent', SENT: 'sent', RESUBMITTED: 'sent', DECLINED: 'rejected',
};

const QUOTATION_STATUS_TO_API: Record<QuotationStatus, string> = {
  draft: 'DRAFT', sent: 'SUBMITTED', revision_requested: 'REVISION_REQUESTED',
  accepted: 'ACCEPTED', rejected: 'REJECTED', withdrawn: 'WITHDRAWN',
};

/**
 * @param rfqs The vendor's RFQs. The API's `rfqId` is the buyer's request id (`procurementRequestId` on
 * the vendor's copy), and the name, number and units of what was asked for only exist on the RFQ.
 */
export function quotationFromApi(raw: any, rfqs: Rfq[] = []): Quotation {
  const apiRfqId = str(raw.rfqId);
  const rfq = rfqs.find(r => r.procurementRequestId === apiRfqId) ?? rfqs.find(r => r.id === apiRfqId);
  const status = str(raw.vendorStatus ?? raw.status).toUpperCase();
  const createdDate = date(raw.createdAt);
  const total = Number(raw.totalAmount ?? 0);

  const items: QuotationItem[] = (raw.items ?? []).map((i: any) => {
    const asked = rfq?.items.find(r => r.name === i.name);
    return {
      rfqItemId: asked?.id ?? str(i.id),
      name: i.name,
      description: i.description ?? '',
      quantity: i.quantity,
      unit: asked?.unit ?? '',
      unitPrice: i.unitPrice ?? null,
      totalPrice: i.totalPrice ?? null,
      availability: (lower(i.availability) || 'available') as ItemAvailability,
      offeredQuantity: i.offeredQuantity ?? null,
      exceptionNote: i.exceptionNote ?? null,
      substituteDescription: i.substituteDescription ?? null,
    };
  });
  const subtotal = items.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0);

  return {
    id: str(raw.id),
    quotationNumber: raw.quotationNumber || `QT-${raw.id}`,
    rfqId: rfq?.id ?? apiRfqId,
    rfqNumber: rfq?.rfqNumber ?? '',
    clientName: rfq?.clientName ?? '',
    createdDate,
    sentDate: optionalDate(raw.submittedAt),
    validUntil: raw.expiresAt
      ? date(raw.expiresAt)
      : new Date(createdDate.getTime() + Number(raw.validityDays ?? 14) * DAY_MS),
    status: QUOTATION_STATUS_FROM_API[status] ?? (status.toLowerCase() as QuotationStatus),
    items,
    subtotal,
    tax: total - subtotal,
    total,
    notes: raw.notes ?? '',
    currency: raw.currency,
    vendorId: str(raw.vendorId),
    vendorCode: raw.vendorCode,
    vendorRating: raw.vendorRating,
    version: raw.version ?? 1,
    revisionCount: raw.revisionCount ?? 0,
    revisionRequestNote: raw.revisionRequestNote ?? undefined,
    revisionRequestedAt: optionalDate(raw.revisionRequestedAt),
    history: (raw.history ?? []).map((h: any) => ({
      id: str(h.id), version: h.version, action: h.action, actor: h.actor, note: h.note,
      total: h.amount, timestamp: date(h.timestamp),
    })),
    includeSignature: raw.includeSignature,
  };
}

/** The POST/PUT body. No id, numbers or history: the server assigns those, and would reject `quot-123`. */
export function quotationToApi(q: Quotation, vendorId: string, tenantId: string, rfq?: Rfq): any {
  const status = QUOTATION_STATUS_TO_API[q.status];
  return {
    tenantId,
    rfqId: num(rfq?.procurementRequestId) ?? num(q.rfqId),
    vendorId: num(vendorId),
    vendorCode: q.vendorCode,
    procurementStatus: status,
    vendorStatus: status,
    totalAmount: q.total,
    currency: q.currency,
    validityDays: Math.max(1, Math.round((new Date(q.validUntil).getTime() - new Date(q.createdDate).getTime()) / DAY_MS)),
    notes: q.notes,
    items: q.items.map(i => ({
      name: i.name,
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice ?? 0,
      totalPrice: i.totalPrice ?? 0,
      availability: i.availability.toUpperCase(),
      offeredQuantity: i.offeredQuantity,
      exceptionNote: i.exceptionNote,
      substituteDescription: i.substituteDescription,
    })),
  };
}

// ── LPO ───────────────────────────────────────────────────────────────────────
// ISSUED is the buyer having sent it: to the vendor, that is an LPO waiting for their answer.
const LPO_STATUS_FROM_API: Record<string, LpoStatus> = { ISSUED: 'pending', SENT: 'pending' };

export function lpoFromApi(raw: any): Lpo {
  const status = str(raw.status).toUpperCase();
  return {
    ...raw,
    id: str(raw.id),
    quotationId: raw.quotationId != null ? str(raw.quotationId) : undefined,
    status: LPO_STATUS_FROM_API[status] ?? (status.toLowerCase() as LpoStatus),
    issuedDate: date(raw.issuedDate),
    deliveryDate: date(raw.deliveryDate),
    items: (raw.items ?? []).map((i: any) => ({ ...i, id: str(i.id), description: i.description ?? '' })),
  };
}

// ── Invoice ───────────────────────────────────────────────────────────────────
export function invoiceFromApi(raw: any): Invoice {
  const { bankName, bankAccountName, bankAccountNumber, bankSortCode, ...rest } = raw;
  return {
    ...rest,
    id: str(raw.id),
    lpoId: raw.lpoId != null ? str(raw.lpoId) : undefined,
    status: lower(raw.status) as Invoice['status'],
    issuedDate: date(raw.issuedDate),
    dueDate: date(raw.dueDate),
    paidDate: optionalDate(raw.paidDate),
    bankDetails: bankName
      ? { bankName, accountName: bankAccountName, accountNumber: bankAccountNumber, sortCode: bankSortCode }
      : undefined,
    items: (raw.items ?? []).map((i: any) => ({
      ...i,
      id: str(i.id),
      lpoItemId: i.lpoItemId != null ? str(i.lpoItemId) : undefined,
    })),
  };
}

/** The POST body. Always a draft: `vendor-invoices/{id}/submit` is what actually sends it to the buyer. */
export function invoiceToApi(inv: Invoice, vendorId: string): any {
  return {
    vendorId: num(vendorId),
    invoiceNumber: inv.invoiceNumber,
    lpoId: num(inv.lpoId),
    lpoNumber: inv.lpoNumber,
    quotationNumber: inv.quotationNumber,
    clientName: inv.clientName,
    clientEmail: inv.clientEmail,
    issuedDate: new Date(inv.issuedDate).toISOString(),
    dueDate: new Date(inv.dueDate).toISOString(),
    status: 'DRAFT',
    subtotal: inv.subtotal,
    tax: inv.tax,
    total: inv.total,
    amountPaid: inv.amountPaid,
    amountOutstanding: inv.amountOutstanding,
    currency: inv.currency,
    notes: inv.notes,
    bankName: inv.bankDetails?.bankName,
    bankAccountName: inv.bankDetails?.accountName,
    bankAccountNumber: inv.bankDetails?.accountNumber,
    bankSortCode: inv.bankDetails?.sortCode,
    includeSignature: inv.includeSignature,
    items: inv.items.map(i => ({
      lpoItemId: num(i.lpoItemId),
      description: i.description,
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
    })),
  };
}

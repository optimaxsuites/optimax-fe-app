import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Rfq,
  Quotation,
  QuotationItem,
  QuotationHistoryEntry,
  Lpo,
  LpoItem,
  Invoice,
  Payment,
  VendorDocument,
  VendorStats,
  LpoStats,
  FinanceStats,
  DocumentStats,
  PerformanceStats,
  ItemAvailability,
  MonthlyMetric,
  ClientPerformance,
  VendorProfile,
  DocumentTemplate,
  TemplateDocType,
  LogoPosition,
  TemplateDensity,
  MAX_REVISION_ROUNDS,
} from '../../domain/vendor-portal/vendor.dto';
import { STORAGE_KEYS, loadFromStorage, saveToStorage, clearAllStorage } from './local-store.util';
import { PROCUREMENT_STORAGE_KEYS } from '../procurement/procurement-store.util';

// Pure helper — recomputes per-line totals and quotation totals from item
// state. Exported so both the service (on save/resubmit) and the dashboard
// component (live, as the vendor edits) can share one source of truth for
// the pricing rules instead of drifting apart.
export function lineTotal(item: QuotationItem): number | null {
  if (item.unitPrice === null || item.unitPrice < 0) return null;
  switch (item.availability) {
    case 'available':
      return item.unitPrice * item.quantity;
    case 'partial':
      return item.offeredQuantity !== null ? item.unitPrice * item.offeredQuantity : null;
    case 'substitute':
      return item.unitPrice * (item.offeredQuantity ?? item.quantity);
    case 'unavailable':
      return null;
  }
}

export function computeQuotationTotals(q: Quotation): Quotation {
  const items = q.items.map((i) => ({ ...i, totalPrice: lineTotal(i) }));
  const subtotal = items.reduce((s, i) => s + (i.totalPrice ?? 0), 0);
  return { ...q, items, subtotal, tax: subtotal * 0.075, total: subtotal * 1.075 };
}

// Is this single line item in a submittable state? Every item needs a
// definitive, explained answer before a quotation can go out — either it's
// priced and available (in full, in part, or as a substitute) or it's
// explicitly marked unavailable with a reason.
export function isItemValid(item: QuotationItem): boolean {
  switch (item.availability) {
    case 'available':
      return item.unitPrice !== null && item.unitPrice >= 0;
    case 'partial':
      return (
        item.unitPrice !== null &&
        item.unitPrice >= 0 &&
        item.offeredQuantity !== null &&
        item.offeredQuantity > 0 &&
        item.offeredQuantity < item.quantity &&
        !!item.exceptionNote?.trim()
      );
    case 'substitute':
      return item.unitPrice !== null && item.unitPrice >= 0 && !!item.substituteDescription?.trim();
    case 'unavailable':
      return !!item.exceptionNote?.trim();
  }
}

export function isQuotationSubmittable(q: Quotation): boolean {
  return (
    q.items.length > 0 &&
    q.items.every((i) => isItemValid(i)) &&
    q.items.some((i) => i.availability !== 'unavailable')
  );
}

const AVAILABILITY_LABEL: Record<ItemAvailability, string> = {
  available: 'full qty',
  partial: 'partial qty',
  substitute: 'substitute',
  unavailable: 'unavailable',
};

function fmtMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

// Builds the short, human-readable account of what changed between two
// versions of the same quotation — e.g. "Gate Valve DN80: unit price
// ₦165,000 → ₦150,000; Total ₦4,257,000 → ₦4,187,500." This is what turns a
// bare "vendor resubmitted" log line into something a reviewer can actually
// act on without re-reading every line item by hand. Used to fill in the
// RESUBMITTED history entry's `note` — see resubmitQuotation() below.
export function summarizeQuotationChanges(previous: Quotation, next: Quotation): string {
  const parts: string[] = [];

  for (const item of next.items) {
    const before = previous.items.find((i) => i.rfqItemId === item.rfqItemId);
    if (!before) {
      parts.push(`${item.name}: added`);
      continue;
    }

    const availabilityChanged = before.availability !== item.availability;
    const qtyChanged = before.offeredQuantity !== item.offeredQuantity;
    const priceChanged = before.unitPrice !== item.unitPrice;
    if (!availabilityChanged && !qtyChanged && !priceChanged) continue;

    if (availabilityChanged) {
      parts.push(`${item.name}: ${AVAILABILITY_LABEL[before.availability]} → ${AVAILABILITY_LABEL[item.availability]}`);
    } else if (item.availability === 'partial' && qtyChanged) {
      parts.push(
        `${item.name}: now offering ${item.offeredQuantity ?? 0} of ${item.quantity} (was ${before.offeredQuantity ?? 0})`,
      );
    } else if (priceChanged && item.unitPrice !== null) {
      const wasText = before.unitPrice !== null ? fmtMoney(before.unitPrice, next.currency) : 'unpriced';
      parts.push(`${item.name}: unit price ${wasText} → ${fmtMoney(item.unitPrice, next.currency)}`);
    } else {
      parts.push(`${item.name}: updated`);
    }
  }

  if (previous.total !== next.total) {
    parts.unshift(`Total ${fmtMoney(previous.total, previous.currency)} → ${fmtMoney(next.total, next.currency)}`);
  }

  return parts.length > 0 ? parts.join('; ') : 'Resubmitted with no changes to items.';
}

@Injectable({ providedIn: 'root' })
export class VendorService {
  // Seeded only the very first time this ever runs in a given browser; every
  // run after that loads whatever was last persisted to localStorage
  // instead (see local-store.util.ts for the shared-vs-vendor key layout,
  // and the constructor below for the other half of this — writing changes
  // back out).
  private rfqs$$ = new BehaviorSubject<Rfq[]>(loadFromStorage(STORAGE_KEYS.RFQS, () => this.seedRfqs()));
  private quotations$$ = new BehaviorSubject<Quotation[]>(
    loadFromStorage(STORAGE_KEYS.QUOTATIONS, () => this.seedQuotations()),
  );
  private lpos$$ = new BehaviorSubject<Lpo[]>(loadFromStorage(STORAGE_KEYS.LPOS, () => this.seedLpos()));
  private invoices$$ = new BehaviorSubject<Invoice[]>(
    loadFromStorage(STORAGE_KEYS.INVOICES, () => this.seedInvoices()),
  );
  private documents$$ = new BehaviorSubject<VendorDocument[]>(
    loadFromStorage(STORAGE_KEYS.DOCUMENTS, () => this.seedDocuments()),
  );
  private profile$$ = new BehaviorSubject<VendorProfile>(
    loadFromStorage(STORAGE_KEYS.PROFILE, () => this.seedProfile()),
  );
  private templates$$ = new BehaviorSubject<DocumentTemplate[]>(
    loadFromStorage(STORAGE_KEYS.TEMPLATES, () => this.seedTemplates()),
  );

  readonly profile$ = this.profile$$.asObservable();
  readonly templates$ = this.templates$$.asObservable();
  readonly rfqs$ = this.rfqs$$.asObservable();
  readonly quotations$ = this.quotations$$.asObservable();
  readonly lpos$ = this.lpos$$.asObservable();
  readonly invoices$ = this.invoices$$.asObservable();
  readonly documents$ = this.documents$$.asObservable();

  // Every mutator in this service ends in a `.next()` on one of the subjects
  // above. Rather than remember to call a "save" function at each of those
  // ~15 call sites, we persist centrally by subscribing to our own subjects
  // once, here — so any future mutator gets durable storage for free just by
  // following the existing `subject$$.next(...)` pattern.
  constructor() {
    this.rfqs$$.subscribe((v) => saveToStorage(STORAGE_KEYS.RFQS, v));
    this.quotations$$.subscribe((v) => saveToStorage(STORAGE_KEYS.QUOTATIONS, v));
    this.lpos$$.subscribe((v) => saveToStorage(STORAGE_KEYS.LPOS, v));
    this.invoices$$.subscribe((v) => saveToStorage(STORAGE_KEYS.INVOICES, v));
    this.documents$$.subscribe((v) => saveToStorage(STORAGE_KEYS.DOCUMENTS, v));
    this.profile$$.subscribe((v) => saveToStorage(STORAGE_KEYS.PROFILE, v));
    this.templates$$.subscribe((v) => saveToStorage(STORAGE_KEYS.TEMPLATES, v));
  }

  // ── Procurement ↔ vendor-portal bridge ──────────────────────────────────────
  // The request-management (procurement) module and this portal are two
  // different personas over the *same* simulated backend (see
  // local-store.util.ts). These methods are the seam between them: procurement
  // pushes RFQs in through upsertExternalRfq(), and reads Quotations back out
  // through the snapshot getters below — see
  // service/procurement/rfq-quotation-bridge.util.ts for the shape mapping.

  /** Procurement creates/updates an RFQ and it should appear here, in this vendor's inbox. */
  upsertExternalRfq(rfq: Rfq): void {
    const existing = this.rfqs$$.getValue();
    const idx = existing.findIndex((r) => r.id === rfq.id);
    if (idx === -1) {
      this.rfqs$$.next([rfq, ...existing]);
      return;
    }
    // Preserve isRead — procurement re-syncing an RFQ (e.g. after a status
    // change on its side) shouldn't un-read something the vendor already saw.
    const updated = [...existing];
    updated[idx] = { ...rfq, isRead: existing[idx].isRead };
    this.rfqs$$.next(updated);
  }

  /** Synchronous snapshots for services (procurement) that need to read this
   *  data inline rather than subscribing — always current, since they share
   *  this same singleton instance. */
  getRfqsSnapshot(): Rfq[] {
    this.loadRfqs();
    return this.rfqs$$.getValue();
  }
  getQuotationsSnapshot(): Quotation[] {
    this.loadQuotations();
    return this.quotations$$.getValue();
  }
  getLposSnapshot(): Lpo[] {
    this.loadLpos();
    return this.lpos$$.getValue();
  }

  /** Buyer (procurement) opened this quotation for the first time. */
  markQuotationViewedByCustomer(id: string): void {
    const current = this.quotations$$.getValue().find((x) => x.id === id);
    if (!current || current.history.some((h) => h.action === 'VIEWED')) return;
    const entry: QuotationHistoryEntry = {
      id: `hist-${Date.now()}`,
      version: current.version,
      action: 'VIEWED',
      actor: 'CUSTOMER',
      timestamp: new Date(),
    };
    this.quotations$$.next(
      this.quotations$$.getValue().map((x) => (x.id === id ? { ...x, history: [...x.history, entry] } : x)),
    );
  }

  // ── RFQ ──────────────────────────────────────────────────────────────────────
  getRfqs(): Observable<Rfq[]> {
    this.loadRfqs();
    return this.rfqs$.pipe(
      map((l) => [...l].sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime())),
    );
  }
  markRfqAsRead(id: string): void {
    this.rfqs$$.next(this.rfqs$$.getValue().map((r) => (r.id === id ? { ...r, isRead: true } : r)));
    this.markRfqAsReadInStorage(id);
  }
  rfqHasQuotation(rfqId: string): boolean {
    return this.quotations$$.getValue().some((q) => q.rfqId === rfqId);
  }

  loadRfqs(): void {
    this.rfqs$$.next(loadFromStorage(STORAGE_KEYS.RFQS, () => this.seedRfqs()));
  }

  private getConvertedRfqIds(): string[] {
    try {
      const stored = localStorage.getItem('vendor_converted_rfq_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private markRfqAsConvertedInStorage(id: string): void {
    const ids = this.getConvertedRfqIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem('vendor_converted_rfq_ids', JSON.stringify(ids));
    }
  }

  private getReadRfqIds(): string[] {
    try {
      const stored = localStorage.getItem('vendor_read_rfq_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private markRfqAsReadInStorage(id: string): void {
    const ids = this.getReadRfqIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem('vendor_read_rfq_ids', JSON.stringify(ids));
    }
  }

  loadQuotations(): void {
    this.quotations$$.next(loadFromStorage(STORAGE_KEYS.QUOTATIONS, () => this.seedQuotations()));
  }

  // ── Quotation ─────────────────────────────────────────────────────────────────
  getQuotations(): Observable<Quotation[]> {
    this.loadQuotations();
    return this.quotations$.pipe(
      map((l) => [...l].sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())),
    );
  }
  createQuotationFromRfq(rfq: Rfq): Quotation {
    const items: QuotationItem[] = rfq.items.map((item) => ({
      rfqItemId: item.id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: null,
      totalPrice: null,
      availability: 'available' as ItemAvailability,
      offeredQuantity: null,
      exceptionNote: null,
      substituteDescription: null,
    }));
    const q: Quotation = {
      id: `quot-${Date.now()}`,
      quotationNumber: `QT-${new Date().getFullYear()}-${String(this.quotations$$.getValue().length + 1).padStart(3, '0')}`,
      rfqId: rfq.id,
      rfqNumber: rfq.rfqNumber,
      clientName: rfq.clientName,
      createdDate: new Date(),
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'draft',
      items,
      subtotal: 0,
      tax: 0,
      total: 0,
      currency: rfq.currency,
      notes: '',
      vendorId: this.profile$$.getValue().id,
      vendorName: this.profile$$.getValue().companyName,
      vendorCode: this.profile$$.getValue().rcNumber,
      vendorRating: 4.6,
      version: 1,
      revisionCount: 0,
      includeSignature: true,
      history: [
        { id: `hist-${Date.now()}`, version: 1, action: 'CREATED', actor: 'VENDOR', timestamp: new Date() },
      ],
    };
    this.quotations$$.next([q, ...this.quotations$$.getValue()]);
    this.rfqs$$.next(
      this.rfqs$$.getValue().map((r) => (r.id === rfq.id ? { ...r, status: 'converted' } : r)),
    );
    this.markRfqAsConvertedInStorage(rfq.id);
    return q;
  }

  updateQuotation(q: Quotation): void {
    this.quotations$$.next(
      this.quotations$$.getValue().map((x) => (x.id === q.id ? computeQuotationTotals(q) : x)),
    );
  }

  /** First submission — draft becomes visible to the client. */
  sendQuotation(id: string): void {
    let sentQuote: Quotation | undefined;
    this.quotations$$.next(
      this.quotations$$.getValue().map((q) => {
        if (q.id !== id) return q;
        const recalculated = computeQuotationTotals(q);
        const entry: QuotationHistoryEntry = {
          id: `hist-${Date.now()}`,
          version: recalculated.version,
          action: 'SUBMITTED',
          actor: 'VENDOR',
          total: recalculated.total,
          timestamp: new Date(),
        };
        sentQuote = {
          ...recalculated,
          status: 'sent' as const,
          sentDate: new Date(),
          history: [...recalculated.history, entry],
        };
        return sentQuote;
      }),
    );
    if (sentQuote) {
      this.syncQuotationToBuyerPortal(sentQuote);
    }
  }

  private syncQuotationToBuyerPortal(q: Quotation): void {
    const vendorQuotation = {
      id: q.id,
      rfqId: q.rfqId,
      rfqTitle: q.clientName + ' - ' + q.rfqNumber,
      vendorId: 'v-custom',
      vendorName: 'Apex Sourcing Solutions',
      vendorCode: 'APX001',
      vendorRating: 4.9,
      vendorEmail: 'sales@apexsourcing.com',
      vendorPhone: '+234-809-123-4567',
      status: 'SUBMITTED',
      items: q.items.map((item: any, idx: number) => ({
        id: item.rfqItemId || `qi-${idx}`,
        name: item.name,
        description: item.description || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice || 0,
        totalPrice: (item.unitPrice || 0) * item.quantity,
        availability: item.availability === 'available' ? 'AVAILABLE' : 'UNAVAILABLE'
      })),
      totalAmount: q.total,
      currency: q.currency,
      deliveryTimeline: '7 business days',
      validityDays: 14,
      submittedAt: q.sentDate || new Date(),
      updatedAt: new Date(),
      expiresAt: q.validUntil,
      isViewed: false,
      termsAndConditions: q.notes || '',
      notes: q.notes || ''
    };

    try {
      const stored = localStorage.getItem(PROCUREMENT_STORAGE_KEYS.QUOTATIONS);
      let currentList: any[] = [];
      if (stored) {
        currentList = JSON.parse(stored);
      }
      currentList = currentList.filter((x: any) => x.id !== vendorQuotation.id);
      currentList.unshift(vendorQuotation);
      localStorage.setItem(PROCUREMENT_STORAGE_KEYS.QUOTATIONS, JSON.stringify(currentList));
      console.log('Quotation synced to buyer database successfully:', vendorQuotation.id);
    } catch (e) {
      console.error('Error syncing quotation to procurement db:', e);
    }
  }

  // ── Negotiation / revision cycle ────────────────────────────────────────────
  /**
   * Client-side action: send a quotation back to the vendor for changes.
   * In production this is triggered from the client's UI (request-management
   * module) against a shared backend. It's exposed here on VendorService so
   * the vendor portal can exercise and demo the full loop against the same
   * mock store until the two sides are wired to one API.
   */
  requestRevision(quotationId: string, note: string): { ok: boolean; reason?: string } {
    this.loadQuotations();
    const current = this.quotations$$.getValue().find((x) => x.id === quotationId);
    if (!current) return { ok: false, reason: 'Quotation not found.' };
    if (current.status !== 'sent') {
      return { ok: false, reason: 'Only a submitted quotation awaiting a decision can be sent back for revision.' };
    }
    if (current.revisionCount >= MAX_REVISION_ROUNDS) {
      return {
        ok: false,
        reason: `This quotation has already been revised ${MAX_REVISION_ROUNDS} times. Please reach out to the vendor directly, or close/re-issue the RFQ.`,
      };
    }

    const entry: QuotationHistoryEntry = {
      id: `hist-${Date.now()}`,
      version: current.version,
      action: 'REVISION_REQUESTED',
      actor: 'CUSTOMER',
      note,
      timestamp: new Date(),
    };
    this.quotations$$.next(
      this.quotations$$.getValue().map((x) =>
        x.id === quotationId
          ? {
            ...x,
            status: 'revision_requested' as const,
            revisionRequestNote: note,
            revisionRequestedAt: new Date(),
            revisionCount: x.revisionCount + 1,
            history: [...x.history, entry],
          }
          : x,
      ),
    );
    return { ok: true };
  }

  /**
   * Client-side action: accept a submitted quotation, closing the
   * negotiation. Exposed here alongside requestRevision() for the same demo
   * reason — see that method's doc comment.
   *
   * Exactly as a real procurement backend would, accepting immediately
   * raises the LPO against the accepted terms, so the vendor can carry
   * straight on into "receive LPO → create invoice" without a separate
   * manual hand-off step.
   */
  acceptQuotation(quotationId: string, note?: string): { ok: boolean; reason?: string } {
    this.loadQuotations();
    const current = this.quotations$$.getValue().find((x) => x.id === quotationId);
    if (!current) return { ok: false, reason: 'Quotation not found.' };
    if (current.status !== 'sent') {
      return { ok: false, reason: 'Only a submitted quotation awaiting a decision can be accepted.' };
    }

    const entry: QuotationHistoryEntry = {
      id: `hist-${Date.now()}`,
      version: current.version,
      action: 'ACCEPTED',
      actor: 'CUSTOMER',
      note,
      total: current.total,
      timestamp: new Date(),
    };
    const accepted: Quotation = { ...current, status: 'accepted', history: [...current.history, entry] };
    this.quotations$$.next(this.quotations$$.getValue().map((x) => (x.id === quotationId ? accepted : x)));
    // LPO generation is a separate, explicit step — see generateLpoForQuotation() below —
    // rather than happening automatically the instant a quotation is accepted.
    return { ok: true };
  }

  /**
   * Explicit, separate step: raise the LPO against an accepted quotation.
   * Idempotent — calling this again for a quotation that already has one
   * just returns the existing Lpo rather than creating a duplicate.
   */
  generateLpoForQuotation(quotationId: string): { ok: boolean; lpo?: Lpo; reason?: string } {
    this.loadQuotations();
    this.loadLpos();
    const existing = this.lpos$$.getValue().find((l) => l.quotationId === quotationId);
    if (existing) return { ok: true, lpo: existing };

    const quotation = this.quotations$$.getValue().find((x) => x.id === quotationId);
    if (!quotation) return { ok: false, reason: 'Quotation not found.' };
    if (quotation.status !== 'accepted') {
      return { ok: false, reason: 'Only an accepted quotation can have an LPO generated for it.' };
    }

    const lpo = this.buildLpoFromAcceptedQuotation(quotation);
    this.lpos$$.next([lpo, ...this.lpos$$.getValue()]);
    const entry: QuotationHistoryEntry = {
      id: `hist-${Date.now()}`,
      version: quotation.version,
      action: 'LPO_GENERATED',
      actor: 'SYSTEM',
      note: `LPO ${lpo.lpoNumber} generated.`,
      timestamp: new Date(),
    };
    this.quotations$$.next(
      this.quotations$$.getValue().map((x) => (x.id === quotationId ? { ...x, history: [...x.history, entry] } : x)),
    );
    return { ok: true, lpo };
  }

  /**
   * Client-side action: reject a submitted quotation, closing the
   * negotiation with no LPO. Exposed here for the same demo reason as
   * requestRevision() and acceptQuotation() above.
   */
  rejectQuotation(quotationId: string, reason: string): { ok: boolean; reason?: string } {
    this.loadQuotations();
    const current = this.quotations$$.getValue().find((x) => x.id === quotationId);
    if (!current) return { ok: false, reason: 'Quotation not found.' };
    if (current.status !== 'sent') {
      return { ok: false, reason: 'Only a submitted quotation awaiting a decision can be rejected.' };
    }

    const entry: QuotationHistoryEntry = {
      id: `hist-${Date.now()}`,
      version: current.version,
      action: 'REJECTED',
      actor: 'CUSTOMER',
      note: reason,
      timestamp: new Date(),
    };
    this.quotations$$.next(
      this.quotations$$.getValue().map((x) =>
        x.id === quotationId ? { ...x, status: 'rejected' as const, history: [...x.history, entry] } : x,
      ),
    );
    return { ok: true };
  }

  /** Vendor's action: resubmit an updated quotation after a revision request. */
  resubmitQuotation(q: Quotation): void {
    const previous = this.quotations$$.getValue().find((x) => x.id === q.id);
    const recalculated = computeQuotationTotals(q);
    const newVersion = recalculated.version + 1;
    const entry: QuotationHistoryEntry = {
      id: `hist-${Date.now()}`,
      version: newVersion,
      action: 'RESUBMITTED',
      actor: 'VENDOR',
      total: recalculated.total,
      // Auto-generated account of what actually changed since the last
      // round, so the log tells the reviewer what was done instead of just
      // that something was — see summarizeQuotationChanges() above.
      note: previous ? summarizeQuotationChanges(previous, recalculated) : undefined,
      timestamp: new Date(),
    };
    const updated: Quotation = {
      ...recalculated,
      version: newVersion,
      status: 'sent',
      sentDate: new Date(),
      revisionRequestNote: undefined,
      history: [...recalculated.history, entry],
    };
    this.quotations$$.next(this.quotations$$.getValue().map((x) => (x.id === q.id ? updated : x)));
    this.syncQuotationToBuyerPortal(updated);
  }

  /** Vendor pulls back a quotation that hasn't been decided on yet. */
  withdrawQuotation(id: string, reason?: string): void {
    this.quotations$$.next(
      this.quotations$$.getValue().map((x) => {
        if (x.id !== id) return x;
        const entry: QuotationHistoryEntry = {
          id: `hist-${Date.now()}`,
          version: x.version,
          action: 'WITHDRAWN',
          actor: 'VENDOR',
          note: reason,
          timestamp: new Date(),
        };
        return { ...x, status: 'withdrawn' as const, history: [...x.history, entry] };
      }),
    );
  }

  loadLpos(): void {
    this.lpos$$.next(loadFromStorage(STORAGE_KEYS.LPOS, () => this.seedLpos()));
  }

  // ── LPO ──────────────────────────────────────────────────────────────────────
  getLpos(): Observable<Lpo[]> {
    this.loadLpos();
    return this.lpos$.pipe(
      map((l) => [...l].sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime())),
    );
  }
  markLpoAsRead(id: string): void {
    this.lpos$$.next(this.lpos$$.getValue().map((l) => (l.id === id ? { ...l, isRead: true } : l)));
  }
  acceptLpo(id: string): void {
    this.lpos$$.next(
      this.lpos$$.getValue().map((l) => (l.id === id ? { ...l, status: 'accepted' as const } : l)),
    );
  }
  rejectLpo(id: string, reason: string): void {
    this.lpos$$.next(
      this.lpos$$
        .getValue()
        .map((l) =>
          l.id === id ? { ...l, status: 'rejected' as const, rejectionReason: reason } : l,
        ),
    );
  }

  // How much of each LPO line item has already been invoiced, across every
  // invoice raised against that LPO (any status — a draft invoice still
  // claims the quantity so two drafts can't both bill the same units).
  // Keyed by lpoItemId; lines a vendor added manually (no lpoItemId) aren't included.
  getInvoicedQuantities(lpoId: string): Record<string, number> {
    const out: Record<string, number> = {};
    for (const inv of this.invoices$$.getValue()) {
      if (inv.lpoId !== lpoId) continue;
      for (const item of inv.items) {
        if (!item.lpoItemId) continue;
        out[item.lpoItemId] = (out[item.lpoItemId] ?? 0) + item.quantity;
      }
    }
    return out;
  }

  // Vendor's action: raise an invoice (optionally against an LPO). Persists it
  // and, if every LPO line is now fully billed, marks that LPO 'fulfilled'.
  createInvoice(invoice: Invoice): Invoice {
    this.invoices$$.next([invoice, ...this.invoices$$.getValue()]);

    if (invoice.lpoId) {
      const lpo = this.lpos$$.getValue().find((l) => l.id === invoice.lpoId);
      if (lpo) {
        const invoicedNow = this.getInvoicedQuantities(lpo.id);
        const fullyBilled = lpo.items.every((li) => (invoicedNow[li.id] ?? 0) >= li.quantity);
        if (fullyBilled && lpo.status !== 'fulfilled') {
          this.lpos$$.next(
            this.lpos$$.getValue().map((l) => (l.id === lpo.id ? { ...l, status: 'fulfilled' as const } : l)),
          );
        }
      }

      // Sync to procurement request and transition status to PAYMENT_PENDING
      const stored = localStorage.getItem(PROCUREMENT_STORAGE_KEYS.REQUESTS);
      if (stored) {
        try {
          const requests = JSON.parse(stored);
          const matchingRequest = requests.find((r: any) =>
            invoice.lpoId!.includes(r.id) ||
            `lpo-${r.id}` === invoice.lpoId ||
            (invoice.lpoNumber && invoice.lpoNumber.includes(r.id.replace('PR-', '')))
          );
          if (matchingRequest) {
            matchingRequest.status = 'PAYMENT_PENDING';
            localStorage.setItem(PROCUREMENT_STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
            console.log('Procurement request status updated to PAYMENT_PENDING for invoice:', invoice.invoiceNumber);
          }
        } catch (e) {
          console.error('Error updating procurement request status on invoice creation:', e);
        }
      }

      // Save invoice to shared db
      try {
        const storedInvoices = localStorage.getItem('vendor_submitted_invoices_db');
        let invoicesList: any[] = [];
        if (storedInvoices) {
          invoicesList = JSON.parse(storedInvoices);
        }
        invoicesList = invoicesList.filter((x: any) => x.id !== invoice.id);
        invoicesList.unshift(invoice);
        localStorage.setItem('vendor_submitted_invoices_db', JSON.stringify(invoicesList));
      } catch (e) {
        console.error('Error saving invoice to vendor_submitted_invoices_db:', e);
      }
    }
    return invoice;
  }

  // ── Finance ───────────────────────────────────────────────────────────────────
  getInvoices(): Observable<Invoice[]> {
    return this.invoices$.pipe(
      map((l) => [...l].sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime())),
    );
  }

  getFinanceStats(): Observable<FinanceStats> {
    const invoices = this.invoices$$.getValue();
    const payments = this.seedPayments(); // static for now
    const paid = invoices.filter((i) => i.status === 'paid');
    const overdue = invoices.filter((i) => i.status === 'overdue');
    const pending = invoices.filter((i) => i.status === 'submitted' || i.status === 'approved');

    const avgPaymentDays =
      paid.length > 0
        ? Math.round(
          paid.reduce((s, i) => {
            const days = i.paidDate
              ? (new Date(i.paidDate).getTime() - new Date(i.issuedDate).getTime()) / (1000 * 60 * 60 * 24)
              : 0;
            return s + days;
          }, 0) / paid.length,
        )
        : 0;

    return of({
      totalInvoiced: invoices.reduce((s, i) => s + i.total, 0),
      totalPaid: paid.reduce((s, i) => s + i.total, 0),
      totalOutstanding: pending.reduce((s, i) => s + i.amountOutstanding, 0),
      totalOverdue: overdue.reduce((s, i) => s + i.amountOutstanding, 0),
      invoiceCount: invoices.length,
      paidCount: paid.length,
      overdueCount: overdue.length,
      pendingCount: pending.length,
      avgPaymentDays,
      recentPayments: payments.slice(0, 5),
    });
  }

  // ── Documents ─────────────────────────────────────────────────────────────────
  getDocuments(): Observable<VendorDocument[]> {
    return this.documents$.pipe(
      map((l) => [...l].sort((a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime())),
    );
  }

  getDocumentStats(): Observable<DocumentStats> {
    const docs = this.documents$$.getValue();
    return of({
      total: docs.length,
      active: docs.filter((d) => d.status === 'active').length,
      expiringSoon: docs.filter((d) => d.status === 'expiring_soon').length,
      expired: docs.filter((d) => d.status === 'expired').length,
      pendingReview: docs.filter((d) => d.status === 'pending_review').length,
    });
  }

  uploadDocument(doc: Omit<VendorDocument, 'id' | 'uploadedDate' | 'status'>): VendorDocument {
    const now = new Date();
    const status = this.resolveDocStatus(doc.expiryDate);
    const newDoc: VendorDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      uploadedDate: now,
      status,
    };
    this.documents$$.next([newDoc, ...this.documents$$.getValue()]);
    return newDoc;
  }

  deleteDocument(id: string): void {
    this.documents$$.next(this.documents$$.getValue().filter((d) => d.id !== id));
  }

  // ── Vendor Profile ─────────────────────────────────────────────────────────────
  updateProfile(patch: Partial<VendorProfile>): void {
    this.profile$$.next({ ...this.profile$$.getValue(), ...patch });
  }
  getProfile(): Observable<VendorProfile> {
    return this.profile$;
  }

  // ── Document Templates (branding) ────────────────────────────────────────────
  getTemplates(docType?: TemplateDocType): Observable<DocumentTemplate[]> {
    return this.templates$.pipe(
      map((list) => (docType ? list.filter((t) => t.docType === docType) : list)),
    );
  }

  getActiveTemplate(docType: TemplateDocType): Observable<DocumentTemplate | undefined> {
    return this.templates$.pipe(
      map((list) => list.find((t) => t.docType === docType && t.isActive)),
    );
  }

  saveTemplate(
    template: Omit<DocumentTemplate, 'id' | 'updatedDate'>,
    id?: string,
  ): DocumentTemplate {
    const list = this.templates$$.getValue();
    const now = new Date();

    if (id) {
      const updated = list.map((t) => (t.id === id ? { ...t, ...template, updatedDate: now } : t));
      this.templates$$.next(updated);
      return updated.find((t) => t.id === id)!;
    }

    const newTemplate: DocumentTemplate = {
      ...template,
      id: `tmpl-${Date.now()}`,
      updatedDate: now,
    };
    this.templates$$.next([...list, newTemplate]);
    return newTemplate;
  }

  setActiveTemplate(id: string, docType: TemplateDocType): void {
    const list = this.templates$$
      .getValue()
      .map((t) => (t.docType === docType ? { ...t, isActive: t.id === id } : t));
    this.templates$$.next(list);
  }

  deleteTemplate(id: string): void {
    this.templates$$.next(this.templates$$.getValue().filter((t) => t.id !== id));
  }

  // ── Performance ───────────────────────────────────────────────────────────────
  getPerformanceStats(): Observable<PerformanceStats> {
    return of(this.buildPerformanceStats());
  }

  // ── Shared vendor stats ───────────────────────────────────────────────────────
  getVendorStats(): Observable<VendorStats> {
    const rfqs = this.rfqs$$.getValue();
    const quotations = this.quotations$$.getValue();
    const now = new Date();
    const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const accepted = quotations.filter((q) => q.status === 'accepted').length;
    const sent = quotations.filter((q) => q.status === 'sent').length;
    return of({
      totalRfqs: rfqs.length,
      unreadRfqs: rfqs.filter((r) => !r.isRead).length,
      openRfqs: rfqs.filter((r) => r.status === 'open').length,
      totalQuotations: quotations.length,
      draftQuotations: quotations.filter((q) => q.status === 'draft').length,
      sentQuotations: sent,
      acceptedQuotations: accepted,
      revisionRequestedQuotations: quotations.filter((q) => q.status === 'revision_requested').length,
      conversionRate: sent + accepted > 0 ? Math.round((accepted / (sent + accepted)) * 100) : 0,
      pendingResponseDueSoon: rfqs.filter(
        (r) => r.status === 'open' && r.dueDate >= now && r.dueDate <= threeDays,
      ).length,
    });
  }

  getLpoStats(): Observable<LpoStats> {
    const lpos = this.lpos$$.getValue();
    return of({
      total: lpos.length,
      pending: lpos.filter((l) => l.status === 'pending').length,
      accepted: lpos.filter((l) => l.status === 'accepted').length,
      rejected: lpos.filter((l) => l.status === 'rejected').length,
      fulfilled: lpos.filter((l) => l.status === 'fulfilled').length,
      unread: lpos.filter((l) => !l.isRead).length,
      totalValue: lpos
        .filter((l) => l.status === 'accepted' || l.status === 'fulfilled')
        .reduce((s, l) => s + l.total, 0),
    });
  }

  getApprovedVendors(): Observable<any[]> {
    return of([]);
  }

  // ── Private helpers ───────────────────────────────────────────────────────────
  private resolveDocStatus(expiry?: Date): VendorDocument['status'] {
    if (!expiry) return 'active';
    const now = new Date();
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (expiry < now) return 'expired';
    if (expiry <= thirtyDays) return 'expiring_soon';
    return 'active';
  }

  private buildPerformanceStats(): PerformanceStats {
    const months: MonthlyMetric[] = [
      { month: 'Jan 2026', rfqs: 8, quoted: 6, won: 3, revenue: 2_850_000 },
      { month: 'Feb 2026', rfqs: 11, quoted: 9, won: 5, revenue: 4_200_000 },
      { month: 'Mar 2026', rfqs: 7, quoted: 7, won: 4, revenue: 3_600_000 },
      { month: 'Apr 2026', rfqs: 14, quoted: 11, won: 6, revenue: 6_100_000 },
      { month: 'May 2026', rfqs: 9, quoted: 8, won: 4, revenue: 3_900_000 },
      { month: 'Jun 2026', rfqs: 5, quoted: 4, won: 2, revenue: 1_800_000 },
    ];
    const topClients: ClientPerformance[] = [
      {
        clientName: 'Dangote Industries Ltd',
        totalOrders: 8,
        totalRevenue: 9_200_000,
        onTimeRate: 92,
        acceptanceRate: 78,
      },
      {
        clientName: 'GTBank Facilities Management',
        totalOrders: 5,
        totalRevenue: 4_800_000,
        onTimeRate: 100,
        acceptanceRate: 83,
      },
      {
        clientName: 'Nestlé Nigeria Plc',
        totalOrders: 4,
        totalRevenue: 7_100_000,
        onTimeRate: 88,
        acceptanceRate: 67,
      },
      {
        clientName: 'Flour Mills of Nigeria Plc',
        totalOrders: 3,
        totalRevenue: 2_400_000,
        onTimeRate: 100,
        acceptanceRate: 75,
      },
      {
        clientName: 'Access Bank Plc',
        totalOrders: 3,
        totalRevenue: 3_200_000,
        onTimeRate: 95,
        acceptanceRate: 60,
      },
    ];
    return {
      avgRfqResponseHours: 18,
      rfqResponseRate: 84,
      quotationAcceptanceRate: 61,
      onTimeDeliveryRate: 94,
      totalRevenueYtd: 22_450_000,
      totalRevenueAllTime: 58_300_000,
      revenueGrowthPct: 23,
      totalRfqsReceived: 54,
      totalQuotationsSubmitted: 45,
      totalLposAccepted: 24,
      totalLposFulfilled: 19,
      overallRating: 4.3,
      monthlyMetrics: months,
      topClients,
    };
  }

  // ── Dev/demo tooling ─────────────────────────────────────────────────────────
  /**
   * Wipes every locally-persisted vendor-portal record and reloads the
   * original demo dataset. Handy once you've been exercising the simulated
   * negotiation flow for a while and want a clean slate — this is dev/demo
   * tooling only, not something a real vendor backend would ever expose.
   */
  resetDemoData(): void {
    clearAllStorage();
    this.rfqs$$.next(this.seedRfqs());
    this.quotations$$.next(this.seedQuotations());
    this.lpos$$.next(this.seedLpos());
    this.invoices$$.next(this.seedInvoices());
    this.documents$$.next(this.seedDocuments());
    this.profile$$.next(this.seedProfile());
    this.templates$$.next(this.seedTemplates());
  }

  // Turns an accepted Quotation into the Lpo a procurement backend would
  // issue against it — used by acceptQuotation() above. Items marked
  // 'unavailable' were never priced and are dropped; 'partial'/'substitute'
  // items carry over at the quantity the vendor actually offered rather than
  // the quantity originally requested.
  private buildLpoFromAcceptedQuotation(q: Quotation): Lpo {
    const sourceRfq = this.rfqs$$.getValue().find((r) => r.id === q.rfqId);
    const items: LpoItem[] = q.items
      .filter((i) => i.availability !== 'unavailable' && i.unitPrice !== null)
      .map((i) => {
        const qty = i.offeredQuantity ?? i.quantity;
        const isSubstitute = i.availability === 'substitute' && !!i.substituteDescription;
        return {
          id: `lpo-item-${i.rfqItemId}`,
          name: isSubstitute ? `${i.name} (substitute)` : i.name,
          description: isSubstitute ? (i.substituteDescription as string) : i.description,
          quantity: qty,
          unit: i.unit,
          unitPrice: i.unitPrice as number,
          totalPrice: i.totalPrice ?? (i.unitPrice as number) * qty,
        };
      });

    return {
      id: `lpo-${Date.now()}`,
      lpoNumber: `LPO-${new Date().getFullYear()}-${String(this.lpos$$.getValue().length + 1).padStart(3, '0')}`,
      quotationId: q.id,
      quotationNumber: q.quotationNumber,
      rfqNumber: q.rfqNumber,
      clientName: q.clientName,
      clientEmail: sourceRfq?.clientEmail,
      issuedDate: new Date(),
      // A real LPO would carry a client-specified delivery date; the RFQ
      // doesn't capture one, so this demo defaults to two weeks out.
      deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'pending',
      isRead: false,
      items,
      deliveryAddress: sourceRfq?.deliveryAddress ?? 'To be confirmed with client',
      paymentTerms: sourceRfq?.paymentTerms ?? 'Net 30',
      currency: q.currency,
      subtotal: q.subtotal,
      tax: q.tax,
      total: q.total,
    };
  }

  // ── Seed: RFQs ────────────────────────────────────────────────────────────────
  private seedRfqs(): Rfq[] {
    const staticRfqs: Rfq[] = [
      {
        id: 'rfq-001',
        rfqNumber: 'RFQ-2026-001',
        clientName: 'Dangote Industries Ltd',
        clientEmail: 'procurement@dangote.com',
        issuedDate: new Date('2026-06-06'),
        dueDate: new Date('2026-06-14'),
        status: 'open',
        isRead: false,
        currency: 'NGN',
        category: 'Industrial Equipment',
        totalEstimatedValue: 4_500_000,
        deliveryAddress: '2 Elephant Cement House, Victoria Island, Lagos',
        paymentTerms: 'Net 30',
        clientInstructions: `All quoted items must comply with ISO 9001:2015. Delivery during business hours (8 am–5 pm) only. Include manufacturer warranty docs with each item. Single consolidated delivery required — no partial deliveries. Quote in NGN only; VAT must be separated. Deliver within 21 days of PO issuance. Notify our logistics team 48 hrs before arrival.`,
        items: [
          {
            id: 'rfq-001-i1',
            name: 'Industrial Pressure Gauge',
            description: 'Stainless steel, 0–100 PSI, 2.5″ dial, glycerine filled',
            quantity: 50,
            unit: 'pcs',
            specifications: 'ASME B40.100, SS316L wetted parts',
            referenceImages: [
              {
                id: 'img-1',
                url: 'https://placehold.co/400x300/e8f2f7/224957?text=Pressure+Gauge',
                label: 'Reference model',
              },
            ],
          },
          {
            id: 'rfq-001-i2',
            name: 'Gate Valve DN80',
            description: 'Full bore, PN16, flanged ends, body: carbon steel',
            quantity: 20,
            unit: 'pcs',
            specifications: 'Trim: 13Cr, ends: flanged ASME 150#',
            referenceImages: [
              {
                id: 'img-2',
                url: 'https://placehold.co/400x300/e8f2f7/224957?text=Gate+Valve',
                label: 'DN80 reference',
              },
            ],
          },
          {
            id: 'rfq-001-i3',
            name: 'Pipe Insulation Foam Wrap',
            description: '2″ dia, 1″ wall, pre-slit, closed-cell elastomeric foam',
            quantity: 200,
            unit: 'metres',
            specifications: 'Thermal conductivity ≤ 0.040 W/m·K',
          },
        ],
      },
      {
        id: 'rfq-002',
        rfqNumber: 'RFQ-2026-002',
        clientName: 'Flour Mills of Nigeria Plc',
        clientEmail: 'supplies@flourmills.com.ng',
        issuedDate: new Date('2026-06-05'),
        dueDate: new Date('2026-06-20'),
        status: 'open',
        isRead: false,
        currency: 'NGN',
        category: 'Office Supplies & IT',
        totalEstimatedValue: 850_000,
        deliveryAddress: '2 Old Dock Rd, Apapa, Lagos',
        paymentTerms: 'Advance payment',
        clientInstructions: `All IT equipment must include original manufacturer receipts. Minimum quotation validity: 30 days.`,
        items: [
          {
            id: 'rfq-002-i1',
            name: 'HP 508A Toner Cartridge Set',
            description: 'Full set — Black, Cyan, Magenta, Yellow',
            quantity: 10,
            unit: 'sets',
            specifications: 'Genuine HP original only',
            referenceImages: [
              {
                id: 'img-3',
                url: 'https://placehold.co/400x300/f0f4f8/224957?text=HP+Toner+Set',
                label: 'HP 508A reference',
              },
            ],
          },
          {
            id: 'rfq-002-i2',
            name: 'A4 Copy Paper 80gsm',
            description: 'Ream of 500 sheets, ISO brightness ≥104%, acid-free',
            quantity: 100,
            unit: 'reams',
          },
          {
            id: 'rfq-002-i3',
            name: 'USB-C Hub 7-in-1',
            description: 'HDMI 4K + 3×USB-A + SD/TF + PD 100W',
            quantity: 15,
            unit: 'pcs',
            specifications: 'Compatible: MacBook, Dell XPS, Lenovo ThinkPad',
          },
        ],
      },
      {
        id: 'rfq-003',
        rfqNumber: 'RFQ-2026-003',
        clientName: 'GTBank Facilities Management',
        clientEmail: 'facilities@gtbank.com',
        issuedDate: new Date('2026-06-01'),
        dueDate: new Date('2026-06-10'),
        status: 'converted',
        isRead: true,
        currency: 'NGN',
        category: 'Cleaning & Facilities',
        totalEstimatedValue: 1_200_000,
        deliveryAddress: '635 Akin Adesola St, Victoria Island, Lagos',
        paymentTerms: 'Net 45',
        clientInstructions: `Products must be eco-friendly and biodegradable.`,
        items: [
          {
            id: 'rfq-003-i1',
            name: 'Industrial Floor Cleaner',
            description: 'Concentrated, marble/terrazzo, 25 L jerrycan, pH neutral',
            quantity: 30,
            unit: 'jerrycans',
            specifications: 'Dilution 1:50, fragrance-free, non-slip',
          },
          {
            id: 'rfq-003-i2',
            name: 'Microfibre Cleaning Cloths',
            description: '40×40 cm, 300 GSM, colour-coded by zone',
            quantity: 500,
            unit: 'pcs',
            specifications: 'Machine washable ×500 cycles',
          },
        ],
      },
      {
        id: 'rfq-004',
        rfqNumber: 'RFQ-2026-004',
        clientName: 'Nestlé Nigeria Plc',
        clientEmail: 'procurement@ng.nestle.com',
        issuedDate: new Date('2026-05-28'),
        dueDate: new Date('2026-06-08'),
        status: 'open',
        isRead: true,
        currency: 'NGN',
        category: 'Packaging Materials',
        totalEstimatedValue: 6_750_000,
        deliveryAddress: '22–24 Industrial Ave, Ilupeju, Lagos',
        paymentTerms: 'Net 60',
        clientInstructions: `All packaging must meet NAFDAC and SON requirements.`,
        items: [
          {
            id: 'rfq-004-i1',
            name: 'BOPP Laminated Woven Bags',
            description: '50 kg capacity, food-grade inner liner',
            quantity: 10_000,
            unit: 'pcs',
            specifications: 'GSM 90±5',
          },
          {
            id: 'rfq-004-i2',
            name: 'Corrugated Carton 30×20×15 cm',
            description: '3-ply export carton',
            quantity: 5_000,
            unit: 'pcs',
            specifications: 'Burst factor ≥12, BCT ≥400 N',
          },
          {
            id: 'rfq-004-i3',
            name: 'Stretch Wrap Film',
            description: '23 µm clear, 500 mm × 300 m',
            quantity: 100,
            unit: 'rolls',
            specifications: 'Pre-stretch 250%, puncture resistant',
          },
        ],
      },
      {
        id: 'rfq-005',
        rfqNumber: 'RFQ-2026-005',
        clientName: 'Airtel Nigeria',
        clientEmail: 'vendor@ng.airtel.com',
        issuedDate: new Date('2026-05-20'),
        dueDate: new Date('2026-05-30'),
        status: 'expired',
        isRead: true,
        currency: 'NGN',
        category: 'Network Hardware',
        totalEstimatedValue: 12_000_000,
        deliveryAddress: 'Plot 1, Hakeem Balogun St, CBD, Abuja',
        paymentTerms: 'Net 30',
        clientInstructions: `All network equipment must carry valid OEM warranty.`,
        items: [
          {
            id: 'rfq-005-i1',
            name: 'Managed Layer 3 Switch 48-Port',
            description: '48-port gigabit L3 with 4×SFP+ uplinks, PoE+, stackable',
            quantity: 10,
            unit: 'units',
            specifications: 'Cisco Catalyst 9200 or equivalent',
            referenceImages: [
              {
                id: 'img-5',
                url: 'https://placehold.co/400x300/e8f2f7/224957?text=L3+Switch',
                label: 'Switch reference',
              },
            ],
          },
        ],
      },
    ];

    try {
      const stored = localStorage.getItem(PROCUREMENT_STORAGE_KEYS.REQUESTS);
      if (stored) {
        const requests = JSON.parse(stored);
        if (Array.isArray(requests)) {
          const convertedIds = this.getConvertedRfqIds();
          const readIds = this.getReadRfqIds();

          const mappedRfqs: Rfq[] = requests
            .filter((req: any) => req.status === 'APPROVED' || req.status === 'VENDORS_QUOTING')
            .map((req: any) => {
              const items = (req.items || []).map((item: any, idx: number) => ({
                id: item.id || `item-${idx}`,
                name: item.name,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit || 'pcs',
                specifications: item.specifications || ''
              }));

              const rfqId = req.id;
              const numericId = rfqId.replace('PR-', '');

              return {
                id: rfqId,
                rfqNumber: `RFQ-2026-${numericId}`,
                clientName: req.customerName || 'Internal Client',
                clientEmail: 'procurement@' + (req.customerName || 'client').toLowerCase().replace(/\s+/g, '') + '.com',
                issuedDate: new Date(req.createdAt || Date.now()),
                dueDate: new Date(req.deliveryDeadline || Date.now()),
                status: convertedIds.includes(rfqId) ? 'converted' : 'open',
                isRead: readIds.includes(rfqId),
                items,
                clientInstructions: req.specialInstructions || req.description,
                deliveryAddress: req.deliveryLocation,
                paymentTerms: 'Net 30',
                currency: req.currency || 'NGN',
                category: req.procurementType === 'SERVICE' ? 'Professional Services' : 'Industrial Equipment',
                totalEstimatedValue: req.totalBudget
              };
            });
          return [...mappedRfqs, ...staticRfqs];
        }
      }
    } catch (e) {
      console.error('Error loading procurement requests in vendor portal:', e);
    }
    return staticRfqs;
  }

  private seedQuotations(): Quotation[] {
    return [
      {
        id: 'quot-seed-001',
        quotationNumber: 'QT-2026-001',
        rfqId: 'rfq-003',
        rfqNumber: 'RFQ-2026-003',
        clientName: 'GTBank Facilities Management',
        createdDate: new Date('2026-06-02'),
        sentDate: new Date('2026-06-03'),
        validUntil: new Date('2026-06-17'),
        status: 'sent',
        currency: 'NGN',
        subtotal: 980_000,
        tax: 73_500,
        total: 1_053_500,
        notes: 'Prices include delivery to all Lagos Island branches.',
        version: 1,
        revisionCount: 0,
        history: [
          { id: 'hist-seed-001a', version: 1, action: 'CREATED', actor: 'VENDOR', timestamp: new Date('2026-06-02') },
          { id: 'hist-seed-001b', version: 1, action: 'SUBMITTED', actor: 'VENDOR', total: 1_053_500, timestamp: new Date('2026-06-03') },
        ],
        items: [
          {
            rfqItemId: 'rfq-003-i1',
            name: 'Industrial Floor Cleaner',
            description: 'Concentrated, 25 L jerrycan',
            quantity: 30,
            unit: 'jerrycans',
            unitPrice: 18_500,
            totalPrice: 555_000,
            availability: 'available',
            offeredQuantity: null,
            exceptionNote: null,
            substituteDescription: null,
          },
          {
            rfqItemId: 'rfq-003-i2',
            name: 'Microfibre Cleaning Cloths',
            description: '40×40 cm, 300 GSM',
            quantity: 500,
            unit: 'pcs',
            unitPrice: 850,
            totalPrice: 425_000,
            availability: 'available',
            offeredQuantity: null,
            exceptionNote: null,
            substituteDescription: null,
          },
        ],
      },
      {
        id: 'quot-seed-002',
        quotationNumber: 'QT-2026-002',
        rfqId: 'rfq-005',
        rfqNumber: 'RFQ-2026-005',
        clientName: 'Airtel Nigeria',
        createdDate: new Date('2026-05-22'),
        validUntil: new Date('2026-06-05'),
        status: 'draft',
        currency: 'NGN',
        subtotal: 9_800_000,
        tax: 735_000,
        total: 10_535_000,
        notes: 'Includes OEM warranty and on-site installation support.',
        version: 1,
        revisionCount: 0,
        history: [
          { id: 'hist-seed-002a', version: 1, action: 'CREATED', actor: 'VENDOR', timestamp: new Date('2026-05-22') },
        ],
        items: [
          {
            rfqItemId: 'rfq-005-i1',
            name: 'Managed Layer 3 Switch 48-Port',
            description: '48-port gigabit L3',
            quantity: 10,
            unit: 'units',
            unitPrice: 980_000,
            totalPrice: 9_800_000,
            availability: 'available',
            offeredQuantity: null,
            exceptionNote: null,
            substituteDescription: null,
          },
        ],
      },
      {
        // Demo seed: shows the negotiation cycle mid-flight — one item only
        // partially available and one substituted, client has already sent
        // it back once asking about the pressure gauge shortfall.
        id: 'quot-seed-003',
        quotationNumber: 'QT-2026-003',
        rfqId: 'rfq-001',
        rfqNumber: 'RFQ-2026-001',
        clientName: 'Dangote Industries Ltd',
        createdDate: new Date('2026-06-08'),
        sentDate: new Date('2026-06-09'),
        validUntil: new Date('2026-06-23'),
        status: 'revision_requested',
        currency: 'NGN',
        subtotal: 3_960_000,
        tax: 297_000,
        total: 4_257_000,
        notes: 'Gate valves are OEM-equivalent, not the specified brand — spec sheet attached separately.',
        version: 1,
        revisionCount: 1,
        revisionRequestNote:
          'We need the full 50 pressure gauges for this delivery — can you source the remaining 20 from another line, or should we split the PO across two vendors? Please advise and resubmit.',
        revisionRequestedAt: new Date('2026-06-10T09:15:00'),
        history: [
          { id: 'hist-seed-003a', version: 1, action: 'CREATED', actor: 'VENDOR', timestamp: new Date('2026-06-08') },
          { id: 'hist-seed-003b', version: 1, action: 'SUBMITTED', actor: 'VENDOR', total: 4_257_000, timestamp: new Date('2026-06-09') },
          {
            id: 'hist-seed-003c',
            version: 1,
            action: 'REVISION_REQUESTED',
            actor: 'CUSTOMER',
            note: 'We need the full 50 pressure gauges for this delivery — can you source the remaining 20 from another line, or should we split the PO across two vendors? Please advise and resubmit.',
            timestamp: new Date('2026-06-10T09:15:00'),
          },
        ],
        items: [
          {
            rfqItemId: 'rfq-001-i1',
            name: 'Industrial Pressure Gauge',
            description: 'Stainless steel, 0–100 PSI, 2.5″ dial, glycerine filled',
            quantity: 50,
            unit: 'pcs',
            unitPrice: 12_000,
            totalPrice: 360_000,
            availability: 'partial',
            offeredQuantity: 30,
            exceptionNote: 'Only 30 units in stock this cycle; remaining 20 arrive on the next shipment in ~3 weeks.',
            substituteDescription: null,
          },
          {
            rfqItemId: 'rfq-001-i2',
            name: 'Gate Valve DN80',
            description: 'Full bore, PN16, flanged ends, body: carbon steel',
            quantity: 20,
            unit: 'pcs',
            unitPrice: 165_000,
            totalPrice: 3_300_000,
            availability: 'substitute',
            offeredQuantity: 20,
            exceptionNote: 'Same PN16 rating and flange standard; OEM-equivalent trim.',
            substituteDescription: 'Kitz DN80 PN16 gate valve (equivalent spec) in place of the named brand — in stock now.',
          },
          {
            rfqItemId: 'rfq-001-i3',
            name: 'Pipe Insulation Foam Wrap',
            description: '2″ dia, 1″ wall, pre-slit, closed-cell elastomeric foam',
            quantity: 200,
            unit: 'metres',
            unitPrice: 1_500,
            totalPrice: 300_000,
            availability: 'available',
            offeredQuantity: null,
            exceptionNote: null,
            substituteDescription: null,
          },
        ],
      },
    ];
  }

  private seedLpos(): any[] {
    const defaultLpos = [
      {
        id: 'lpo-001',
        lpoNumber: 'LPO-2026-001',
        quotationId: 'quot-seed-001',
        quotationNumber: 'QT-2026-001',
        rfqNumber: 'RFQ-2026-003',
        clientName: 'GTBank Facilities Management',
        clientEmail: 'facilities@gtbank.com',
        issuedDate: new Date('2026-06-05'),
        deliveryDate: new Date('2026-06-19'),
        status: 'pending',
        isRead: false,
        currency: 'NGN',
        deliveryAddress: '635 Akin Adesola St, Victoria Island, Lagos',
        paymentTerms: 'Net 45 days from delivery',
        subtotal: 980_000,
        tax: 73_500,
        total: 1_053_500,
        specialConditions: `Vendor must provide delivery note signed by our facilities manager. Items must be delivered in original manufacturer packaging.`,
        items: [
          {
            id: 'lpo-001-i1',
            name: 'Industrial Floor Cleaner',
            description: 'Concentrated, 25 L jerrycan',
            quantity: 30,
            unit: 'jerrycans',
            unitPrice: 18_500,
            totalPrice: 555_000,
          },
          {
            id: 'lpo-001-i2',
            name: 'Microfibre Cleaning Cloths',
            description: '40×40 cm, 300 GSM',
            quantity: 500,
            unit: 'pcs',
            unitPrice: 850,
            totalPrice: 425_000,
          },
        ],
      },
      {
        id: 'lpo-002',
        lpoNumber: 'LPO-2026-002',
        clientName: 'Nestlé Nigeria Plc',
        clientEmail: 'procurement@ng.nestle.com',
        rfqNumber: 'RFQ-2026-004',
        issuedDate: new Date('2026-06-04'),
        deliveryDate: new Date('2026-06-25'),
        status: 'fulfilled',
        isRead: true,
        currency: 'NGN',
        deliveryAddress: '22–24 Industrial Ave, Ilupeju, Lagos',
        paymentTerms: 'Net 60 days',
        subtotal: 6_200_000,
        tax: 465_000,
        total: 6_665_000,
        specialConditions: `All items must arrive with NAFDAC compliance certificates.`,
        items: [
          {
            id: 'lpo-002-i1',
            name: 'BOPP Laminated Woven Bags',
            description: '50 kg capacity',
            quantity: 10_000,
            unit: 'pcs',
            unitPrice: 580,
            totalPrice: 5_800_000,
          },
          {
            id: 'lpo-002-i2',
            name: 'Corrugated Carton 30×20×15 cm',
            description: '3-ply export carton',
            quantity: 1_000,
            unit: 'pcs',
            unitPrice: 400,
            totalPrice: 400_000,
          },
        ],
      },
      {
        id: 'lpo-003',
        lpoNumber: 'LPO-2026-003',
        clientName: 'Dangote Industries Ltd',
        clientEmail: 'procurement@dangote.com',
        rfqNumber: 'RFQ-2026-001',
        issuedDate: new Date('2026-06-07'),
        deliveryDate: new Date('2026-06-21'),
        status: 'pending',
        isRead: false,
        currency: 'NGN',
        deliveryAddress: '2 Elephant Cement House, Victoria Island, Lagos',
        paymentTerms: 'Net 30 days from invoice',
        subtotal: 3_850_000,
        tax: 288_750,
        total: 4_138_750,
        specialConditions: `All items must include ISO compliance certification.`,
        items: [
          {
            id: 'lpo-003-i1',
            name: 'Industrial Pressure Gauge',
            description: 'Stainless steel, 0–100 PSI',
            quantity: 50,
            unit: 'pcs',
            unitPrice: 45_000,
            totalPrice: 2_250_000,
          },
          {
            id: 'lpo-003-i2',
            name: 'Gate Valve DN80',
            description: 'Full bore, PN16',
            quantity: 20,
            unit: 'pcs',
            unitPrice: 72_000,
            totalPrice: 1_440_000,
          },
          {
            id: 'lpo-003-i3',
            name: 'Pipe Insulation Foam Wrap',
            description: '2″ dia, 1″ wall',
            quantity: 200,
            unit: 'metres',
            unitPrice: 800,
            totalPrice: 160_000,
          },
        ],
      },
      {
        id: 'lpo-004',
        lpoNumber: 'LPO-2026-004',
        clientName: 'Access Bank Plc',
        clientEmail: 'vendor@accessbankplc.com',
        issuedDate: new Date('2026-05-30'),
        deliveryDate: new Date('2026-06-12'),
        status: 'fulfilled',
        isRead: true,
        currency: 'NGN',
        deliveryAddress: 'Plot 1665, Oyin Jolayemi St, Victoria Island',
        paymentTerms: 'Advance payment',
        subtotal: 1_450_000,
        tax: 108_750,
        total: 1_558_750,
        items: [
          {
            id: 'lpo-004-i1',
            name: 'Executive Office Chair',
            description: 'High-back leather executive chair',
            quantity: 25,
            unit: 'units',
            unitPrice: 58_000,
            totalPrice: 1_450_000,
          },
        ],
      },
      {
        id: 'lpo-005',
        lpoNumber: 'LPO-2026-005',
        clientName: 'MTN Nigeria Communications Plc',
        clientEmail: 'procurement@mtn.com.ng',
        issuedDate: new Date('2026-05-25'),
        deliveryDate: new Date('2026-06-05'),
        status: 'rejected',
        isRead: true,
        currency: 'NGN',
        deliveryAddress: 'MTN House, 1 Mobolaji Johnson Ave, Lagos',
        paymentTerms: 'Net 30',
        subtotal: 8_400_000,
        tax: 630_000,
        total: 9_030_000,
        rejectionReason:
          'Our budget for this procurement cycle has been exhausted. We will reissue in Q3 2026.',
        items: [
          {
            id: 'lpo-005-i1',
            name: 'UPS Battery Backup 10KVA',
            description: 'Online double-conversion UPS',
            quantity: 12,
            unit: 'units',
            unitPrice: 700_000,
            totalPrice: 8_400_000,
          },
        ],
      },
      {
        // Demo seed: accepted, nothing invoiced against it yet — a ready
        // starting point for trying the "Create Invoice" flow.
        id: 'lpo-006',
        lpoNumber: 'LPO-2026-006',
        clientName: 'Julius Berger Nigeria Plc',
        clientEmail: 'supplychain@julius-berger.com',
        issuedDate: new Date('2026-06-20'),
        deliveryDate: new Date('2026-07-10'),
        status: 'accepted',
        isRead: true,
        currency: 'NGN',
        deliveryAddress: 'Plot 1023, Josif Broz Tito St, Utako, Abuja',
        paymentTerms: 'Net 30 days from delivery, staged',
        subtotal: 4_500_000,
        tax: 337_500,
        total: 4_837_500,
        specialConditions: 'Delivery may be staged across two batches; invoice per batch delivered.',
        items: [
          {
            id: 'lpo-006-i1',
            name: 'Reinforced Steel Mesh 6mm',
            description: '2.4m × 6m sheets, BRC standard',
            quantity: 300,
            unit: 'sheets',
            unitPrice: 12_500,
            totalPrice: 3_750_000,
          },
          {
            id: 'lpo-006-i2',
            name: 'Concrete Spacer Blocks 40mm',
            description: 'High-density, load-bearing',
            quantity: 5_000,
            unit: 'pcs',
            unitPrice: 150,
            totalPrice: 750_000,
          },
        ],
      },
    ];

    try {
      const stored = localStorage.getItem('vendor_lpos_db');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const parsedLpos = parsed.map(l => ({
            ...l,
            issuedDate: l.issuedDate ? new Date(l.issuedDate) : new Date(),
            deliveryDate: l.deliveryDate ? new Date(l.deliveryDate) : new Date()
          }));
          const defaultFiltered = defaultLpos.filter(dl => !parsedLpos.some(pl => pl.id === dl.id));
          return [...parsedLpos, ...defaultFiltered];
        }
      }
    } catch (e) {
      console.error('Error reading vendor_lpos_db:', e);
    }
    return defaultLpos;
  }

  private seedInvoices(): Invoice[] {
    return [
      {
        id: 'inv-001',
        invoiceNumber: 'INV-2026-001',
        lpoId: 'lpo-004',
        lpoNumber: 'LPO-2026-004',
        clientName: 'Access Bank Plc',
        clientEmail: 'vendor@accessbankplc.com',
        issuedDate: new Date('2026-06-01'),
        dueDate: new Date('2026-06-15'),
        paidDate: new Date('2026-06-10'),
        status: 'paid',
        currency: 'NGN',
        subtotal: 1_450_000,
        tax: 108_750,
        total: 1_558_750,
        amountPaid: 1_558_750,
        amountOutstanding: 0,
        notes: 'Full payment received. Thank you.',
        bankDetails: {
          bankName: 'Zenith Bank',
          accountName: 'TechSupply Nigeria Ltd',
          accountNumber: '1234567890',
        },
        items: [
          {
            id: 'inv-001-i1',
            lpoItemId: 'lpo-004-i1',
            description: 'Executive Office Chair (25 units × ₦58,000)',
            quantity: 25,
            unit: 'units',
            unitPrice: 58_000,
            totalPrice: 1_450_000,
          },
        ],
      },
      {
        id: 'inv-002',
        invoiceNumber: 'INV-2026-002',
        lpoId: 'lpo-002',
        lpoNumber: 'LPO-2026-002',
        quotationNumber: 'QT-2026-003',
        clientName: 'Nestlé Nigeria Plc',
        clientEmail: 'procurement@ng.nestle.com',
        issuedDate: new Date('2026-06-05'),
        dueDate: new Date('2026-07-05'),
        status: 'submitted',
        currency: 'NGN',
        subtotal: 6_200_000,
        tax: 465_000,
        total: 6_665_000,
        amountPaid: 0,
        amountOutstanding: 6_665_000,
        notes: 'Payment due 60 days from invoice date as per LPO terms.',
        bankDetails: {
          bankName: 'Zenith Bank',
          accountName: 'TechSupply Nigeria Ltd',
          accountNumber: '1234567890',
        },
        items: [
          {
            id: 'inv-002-i1',
            lpoItemId: 'lpo-002-i1',
            description: 'BOPP Laminated Woven Bags (10,000 pcs × ₦580)',
            quantity: 10_000,
            unit: 'pcs',
            unitPrice: 580,
            totalPrice: 5_800_000,
          },
          {
            id: 'inv-002-i2',
            lpoItemId: 'lpo-002-i2',
            description: 'Corrugated Carton 30×20×15 cm (1,000 pcs × ₦400)',
            quantity: 1_000,
            unit: 'pcs',
            unitPrice: 400,
            totalPrice: 400_000,
          },
        ],
      },
      {
        id: 'inv-003',
        invoiceNumber: 'INV-2026-003',
        clientName: 'GTBank Facilities Management',
        clientEmail: 'facilities@gtbank.com',
        lpoNumber: 'LPO-2026-001',
        issuedDate: new Date('2026-05-10'),
        dueDate: new Date('2026-05-25'),
        status: 'overdue',
        currency: 'NGN',
        subtotal: 980_000,
        tax: 73_500,
        total: 1_053_500,
        amountPaid: 500_000,
        amountOutstanding: 553_500,
        notes: 'Partial payment received. Balance outstanding.',
        bankDetails: {
          bankName: 'Zenith Bank',
          accountName: 'TechSupply Nigeria Ltd',
          accountNumber: '1234567890',
        },
        items: [
          {
            id: 'inv-003-i1',
            description: 'Industrial Floor Cleaner (30 jerrycans × ₦18,500)',
            quantity: 30,
            unit: 'jerrycans',
            unitPrice: 18_500,
            totalPrice: 555_000,
          },
          {
            id: 'inv-003-i2',
            description: 'Microfibre Cleaning Cloths (500 pcs × ₦850)',
            quantity: 500,
            unit: 'pcs',
            unitPrice: 850,
            totalPrice: 425_000,
          },
        ],
      },
      {
        id: 'inv-004',
        invoiceNumber: 'INV-2026-004',
        clientName: 'Dangote Industries Ltd',
        clientEmail: 'procurement@dangote.com',
        issuedDate: new Date('2026-04-15'),
        dueDate: new Date('2026-05-15'),
        paidDate: new Date('2026-05-12'),
        status: 'paid',
        currency: 'NGN',
        subtotal: 3_200_000,
        tax: 240_000,
        total: 3_440_000,
        amountPaid: 3_440_000,
        amountOutstanding: 0,
        bankDetails: {
          bankName: 'Zenith Bank',
          accountName: 'TechSupply Nigeria Ltd',
          accountNumber: '1234567890',
        },
        items: [
          {
            id: 'inv-004-i1',
            description: 'Industrial Equipment Supply — Q1 2026',
            quantity: 1,
            unit: 'lot',
            unitPrice: 3_200_000,
            totalPrice: 3_200_000,
          },
        ],
      },
      {
        id: 'inv-005',
        invoiceNumber: 'INV-2026-005',
        clientName: 'Flour Mills of Nigeria Plc',
        clientEmail: 'supplies@flourmills.com.ng',
        issuedDate: new Date('2026-06-08'),
        dueDate: new Date('2026-06-22'),
        status: 'draft',
        currency: 'NGN',
        subtotal: 720_000,
        tax: 54_000,
        total: 774_000,
        amountPaid: 0,
        amountOutstanding: 774_000,
        notes: 'Draft — pending LPO confirmation before submission.',
        bankDetails: {
          bankName: 'Zenith Bank',
          accountName: 'TechSupply Nigeria Ltd',
          accountNumber: '1234567890',
        },
        items: [
          {
            id: 'inv-005-i1',
            description: 'Office Supplies & IT Equipment',
            quantity: 1,
            unit: 'lot',
            unitPrice: 720_000,
            totalPrice: 720_000,
          },
        ],
      },
    ];
  }

  private seedPayments(): Payment[] {
    return [
      {
        id: 'pay-001',
        invoiceId: 'inv-001',
        invoiceNumber: 'INV-2026-001',
        clientName: 'Access Bank Plc',
        amount: 1_558_750,
        currency: 'NGN',
        paidDate: new Date('2026-06-10'),
        method: 'bank_transfer',
        reference: 'ABP/TRF/20260610/001',
        notes: 'Full payment',
      },
      {
        id: 'pay-002',
        invoiceId: 'inv-003',
        invoiceNumber: 'INV-2026-003',
        clientName: 'GTBank Facilities Management',
        amount: 500_000,
        currency: 'NGN',
        paidDate: new Date('2026-05-20'),
        method: 'bank_transfer',
        reference: 'GTB/TRF/20260520/842',
        notes: 'Partial payment',
      },
      {
        id: 'pay-003',
        invoiceId: 'inv-004',
        invoiceNumber: 'INV-2026-004',
        clientName: 'Dangote Industries Ltd',
        amount: 3_440_000,
        currency: 'NGN',
        paidDate: new Date('2026-05-12'),
        method: 'bank_transfer',
        reference: 'DAN/TRF/20260512/119',
        notes: 'Full payment',
      },
    ];
  }

  private seedDocuments(): VendorDocument[] {
    const now = new Date();
    const soon = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
    const expired = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const future = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    return [
      {
        id: 'doc-001',
        name: 'CAC Certificate of Incorporation',
        category: 'registration',
        fileUrl: '#',
        fileName: 'CAC_Certificate_TechSupply.pdf',
        fileSize: '2.4 MB',
        fileType: 'pdf',
        uploadedDate: new Date('2026-01-15'),
        expiryDate: future,
        status: 'active',
        isRequired: true,
        notes: 'Company registration certificate from the Corporate Affairs Commission',
      },
      {
        id: 'doc-002',
        name: 'Tax Clearance Certificate 2025',
        category: 'tax',
        fileUrl: '#',
        fileName: 'Tax_Clearance_2025.pdf',
        fileSize: '1.1 MB',
        fileType: 'pdf',
        uploadedDate: new Date('2026-02-01'),
        expiryDate: new Date('2026-12-31'),
        status: 'active',
        isRequired: true,
      },
      {
        id: 'doc-003',
        name: 'SON Product Certification',
        category: 'certification',
        fileUrl: '#',
        fileName: 'SON_Cert_2026.pdf',
        fileSize: '890 KB',
        fileType: 'pdf',
        uploadedDate: new Date('2026-01-20'),
        expiryDate: soon,
        status: 'expiring_soon',
        isRequired: true,
        notes: 'Standards Organisation of Nigeria product certification — renewal in progress',
      },
      {
        id: 'doc-004',
        name: 'Public Liability Insurance',
        category: 'insurance',
        fileUrl: '#',
        fileName: 'PLI_Policy_2026.pdf',
        fileSize: '3.2 MB',
        fileType: 'pdf',
        uploadedDate: new Date('2026-01-05'),
        expiryDate: expired,
        status: 'expired',
        isRequired: true,
        notes: 'EXPIRED — please upload renewed policy immediately',
      },
      {
        id: 'doc-005',
        name: 'NAFDAC Registration',
        category: 'licence',
        fileUrl: '#',
        fileName: 'NAFDAC_Reg_2026.pdf',
        fileSize: '1.8 MB',
        fileType: 'pdf',
        uploadedDate: new Date('2026-03-10'),
        expiryDate: future,
        status: 'active',
        isRequired: false,
      },
      {
        id: 'doc-006',
        name: 'ISO 9001:2015 Certificate',
        category: 'certification',
        fileUrl: '#',
        fileName: 'ISO_9001_Certificate.pdf',
        fileSize: '1.5 MB',
        fileType: 'pdf',
        uploadedDate: new Date('2025-11-01'),
        expiryDate: new Date('2027-11-01'),
        status: 'active',
        isRequired: false,
        notes: 'Quality management system certification',
      },
      {
        id: 'doc-007',
        name: 'Company Profile',
        category: 'other',
        fileUrl: '#',
        fileName: 'TechSupply_Company_Profile.pdf',
        fileSize: '5.6 MB',
        fileType: 'pdf',
        uploadedDate: new Date('2026-04-12'),
        status: 'pending_review',
        isRequired: false,
      },
    ];
  }
  private seedProfile(): VendorProfile {
    return {
      id: 'vendor-001',
      companyName: 'Apex Industrial Supplies Ltd',
      tradingName: 'Apex Supplies',
      rcNumber: 'RC 1834562',
      taxId: 'TIN 01928374-0001',
      category: 'Industrial Equipment',
      additionalCategories: ['Office Furniture', 'Safety Equipment'],
      email: 'procurement@apexsupplies.ng',
      phone: '+234 803 123 4567',
      alternatePhone: '+234 1 280 5566',
      website: 'www.apexsupplies.ng',
      address: '14 Adeola Odeku Street, Victoria Island',
      city: 'Lagos',
      state: 'Lagos State',
      country: 'Nigeria',
      contactPersonName: 'Ngozi Eze',
      contactPersonRole: 'Procurement Manager',
      bankDetails: {
        bankName: 'Zenith Bank Plc',
        accountName: 'Apex Industrial Supplies Ltd',
        accountNumber: '1012345678',
        sortCode: '057150013',
      },
      logoUrl: undefined,
      verificationStatus: 'verified',
      memberSince: new Date('2023-02-14'),
    };
  }

  private seedTemplates(): DocumentTemplate[] {
    return [
      {
        id: 'tmpl-inv-default',
        name: 'Default',
        docType: 'invoice',
        isActive: true,
        baseStyle: 'classic',
        logoPosition: 'left',
        accentColor: '#224957',
        density: 'detailed',
        footerText: 'Thank you for your business. Payment due within terms stated above.',
        showBankDetails: true,
        notesDefault: 'All amounts in NGN unless otherwise stated.',
        updatedDate: new Date('2026-04-01'),
      },
      {
        id: 'tmpl-quo-default',
        name: 'Default',
        docType: 'quotation',
        isActive: true,
        baseStyle: 'modern',
        logoPosition: 'left',
        accentColor: '#224957',
        density: 'simple',
        footerText: 'This quotation is valid for 14 days from the date of issue.',
        showBankDetails: false,
        notesDefault: 'Prices are subject to change without prior notice.',
        updatedDate: new Date('2026-04-01'),
      },
    ];
  }
}

// quotation-management.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  VendorQuotation,
  RFQWithQuotations,
  VendorQuotationStatus,
  QuotationHistoryEntry,
  QuotationHistoryAction,
  MAX_QUOTATION_REVISIONS,
  ProcurementRequest,
} from '../../domain/procurement-request/procurement.dto';
import { PROCUREMENT_STORAGE_KEYS, loadFromStorage, saveToStorage } from './procurement-store.util';
import { VendorService } from '../vendor-portal/vendor.service';
import {
  isLiveQuotationId,
  fromLiveId,
  sharedQuotationToVendorQuotation,
  parseIdToNumber,
} from './rfq-quotation-bridge.util';

@Injectable({
  providedIn: 'root'
})
export class QuotationManagementService {
  // Loaded once per app run: read the namespaced key, falling back to the
  // old raw 'vendor_quotations_db_v3' key (migrated forward automatically —
  // see procurement-store.util.ts), or the seed data below on a fresh
  // browser. Every record is then normalized so version/revisionCount/
  // history are always concrete values, whether it just arrived from
  // long-untouched legacy storage or is brand new seed data — see
  // normalizeQuotation() below.
  private quotations: VendorQuotation[] = [];

  constructor(private http: HttpClient, private vendorService: VendorService) {
    this.reloadFromStorage();
  }

  /**
   * Quotations that actually came from the connected vendor portal (as
   * opposed to procurement's own local/demo quotations) — read live off
   * VendorService's shared store and converted to procurement's shape.
   * Draft quotations are excluded: the vendor hasn't sent those yet, so the
   * buyer shouldn't see them.
   */
  private getLiveQuotationsForRfq(rfqId: string): VendorQuotation[] {
    const lpos = this.vendorService.getLposSnapshot();
    const requests = loadFromStorage<ProcurementRequest[]>(PROCUREMENT_STORAGE_KEYS.REQUESTS, () => []);
    return this.vendorService.getQuotationsSnapshot()
      .filter(q => q.rfqId === rfqId && q.status !== 'draft')
      .map(q => sharedQuotationToVendorQuotation(q, lpos.some(l => l.quotationId === q.id), undefined, requests));
  }

  private getAllLiveQuotations(): VendorQuotation[] {
    const lpos = this.vendorService.getLposSnapshot();
    const requests = loadFromStorage<ProcurementRequest[]>(PROCUREMENT_STORAGE_KEYS.REQUESTS, () => []);
    return this.vendorService.getQuotationsSnapshot()
      .filter(q => q.status !== 'draft')
      .map(q => sharedQuotationToVendorQuotation(q, lpos.some(l => l.quotationId === q.id), undefined, requests));
  }

  private findLiveQuotation(quotationId: string | number) {
    return this.vendorService.getQuotationsSnapshot().find(q => q.id === fromLiveId(quotationId));
  }

  // ── Negotiation / revision cycle helpers ────────────────────────────────────
  /**
   * Fills in version / revisionCount / history with sensible defaults for any
   * quotation that predates those fields (old seed data, anything migrated
   * from the legacy localStorage key). Idempotent — already-normalized
   * records pass through unchanged.
   */
  private normalizeQuotation(q: VendorQuotation): VendorQuotation {
    const version = q.version ?? 1;
    const revisionCount = q.revisionCount ?? (q.status === 'REVIEW_REQUESTED' ? 1 : 0);
    const history = q.history && q.history.length > 0 ? q.history : this.inferHistory(q);
    return { ...q, version, revisionCount, history };
  }

  private normalizeAll(qs: VendorQuotation[]): VendorQuotation[] {
    return qs.map((q) => this.normalizeQuotation(q));
  }

  /**
   * Best-effort reconstruction of a plausible audit trail for a quotation
   * that doesn't have one yet, from whatever fields it already has
   * (status / submittedAt / declineReason / revisionRequestNote / …). Used
   * only to backfill legacy/seed records — every mutator below appends
   * proper history entries for anything that happens from now on.
   */
  private inferHistory(q: VendorQuotation): QuotationHistoryEntry[] {
    const entries: QuotationHistoryEntry[] = [];
    const wasSubmitted = !!q.submittedAt && q.items.length > 0;

    if (wasSubmitted) {
      entries.push(this.historyEntry(q, 'SUBMITTED', 'VENDOR', undefined, q.totalAmount, q.submittedAt));
    }

    switch (q.status) {
      case 'ACCEPTED':
      case 'LPO_GENERATED':
      case 'LPO_SENT':
        entries.push(this.historyEntry(q, 'ACCEPTED', 'CUSTOMER', undefined, q.totalAmount, q.updatedAt));
        if (q.status === 'LPO_GENERATED' || q.status === 'LPO_SENT') {
          entries.push(this.historyEntry(q, 'LPO_GENERATED', 'CUSTOMER', undefined, q.totalAmount, q.updatedAt));
        }
        if (q.status === 'LPO_SENT') {
          entries.push(this.historyEntry(q, 'LPO_SENT', 'CUSTOMER', undefined, undefined, q.updatedAt));
        }
        break;
      case 'DECLINED':
        entries.push(
          this.historyEntry(q, 'DECLINED', wasSubmitted ? 'CUSTOMER' : 'VENDOR', q.declineReason, undefined, q.updatedAt),
        );
        break;
      case 'REVIEW_REQUESTED':
        entries.push(
          this.historyEntry(q, 'REVIEW_REQUESTED', 'CUSTOMER', q.revisionRequestNote, undefined, q.revisionRequestedAt ?? q.updatedAt),
        );
        break;
      case 'WITHDRAWN':
        entries.push(this.historyEntry(q, 'WITHDRAWN', 'VENDOR', undefined, undefined, q.updatedAt));
        break;
      default:
        // PENDING / SUBMITTED-without-further-action / EXPIRED — nothing to add beyond the submission entry above (if any).
        break;
    }

    return entries;
  }

  private historyEntry(
    q: VendorQuotation,
    action: QuotationHistoryAction,
    actor: 'VENDOR' | 'CUSTOMER' | 'SYSTEM',
    note: string | undefined,
    amount: number | undefined,
    timestamp: Date | undefined,
  ): QuotationHistoryEntry {
    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      quoteId: q,
      version: q.version ?? 1,
      action,
      actor,
      note,
      amount,
      timestamp: timestamp ?? new Date(),
    };
  }

  private persist(): void {
    saveToStorage(PROCUREMENT_STORAGE_KEYS.QUOTATIONS, this.quotations);
  }

  private generateLpoNumber(): string {
    const year = new Date().getFullYear();
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `LPO-${year}-${suffix}`;
  }

  private buildDefaultQuotations(): VendorQuotation[] {
    const list: any[] = [
      {
        id: 1,
        rfqId: 'RFQ1',
        rfqTitle: 'Office Equipment & IT Hardware',
        vendorId: 'v1',
        vendorName: 'TechPro Solutions Ltd',
        vendorCode: 'TPS001',
        vendorRating: 4.8,
        vendorEmail: 'procurement@techpro.example',
        vendorPhone: '+234-800-555-0101',
        status: 'SUBMITTED',
        items: [
          { id: 1, name: 'Dell XPS 15 Laptop', description: '15-inch i7, 16GB RAM, 512GB SSD', quantity: 2, unitPrice: 150000, totalPrice: 300000, availability: 'AVAILABLE' },
          { id: 2, name: 'HP LaserJet Printer', description: 'Multifunction monochrome printer', quantity: 1, unitPrice: 150000, totalPrice: 150000, availability: 'SUBSTITUTE', alternativeProduct: 'Canon imageCLASS LBP226dw' }
        ],
        totalAmount: 450000,
        currency: 'NGN',
        deliveryTimeline: '5-7 business days',
        validityDays: 14,
        submittedAt: new Date('2024-01-15T10:30:00'),
        updatedAt: new Date('2024-01-15T10:30:00'),
        expiresAt: new Date('2024-01-29T23:59:59'),
        isViewed: false,
        termsAndConditions: '1. Warranty: 3 years on laptops\n2. Payment: Net 30 after delivery',
        notes: 'Price includes delivery and initial configuration support.'
      },
      {
        id: 2,
        rfqId: 'RFQ1',
        rfqTitle: 'Office Equipment & IT Hardware',
        vendorId: 'v2',
        vendorName: 'Global Supplies Inc',
        vendorCode: 'GSI002',
        vendorRating: 4.6,
        vendorEmail: 'orders@globalsupplies.example',
        vendorPhone: '+234-811-333-2211',
        status: 'ACCEPTED',
        items: [
          { id: 3, name: 'Dell XPS 15 Laptop', description: '15-inch i7, 16GB RAM, 512GB SSD', quantity: 2, unitPrice: 140000, totalPrice: 280000, availability: 'PARTIAL', availableQuantity: 1 },
          { id: 4, name: 'HP LaserJet Printer', description: 'Multifunction monochrome printer', quantity: 1, unitPrice: 140000, totalPrice: 140000, availability: 'UNAVAILABLE' }
        ],
        totalAmount: 420000,
        currency: 'NGN',
        deliveryTimeline: '3-5 business days',
        validityDays: 30,
        submittedAt: new Date('2024-01-14T14:20:00'),
        updatedAt: new Date('2024-01-16T09:00:00'),
        expiresAt: new Date('2024-02-13T23:59:59'),
        isViewed: true,
        termsAndConditions: '1. Standard commercial warranty applies\n2. Payment: Immediate upon delivery',
        notes: 'Bulk discount applied to unit rates.'
      },
      {
        id: 3,
        rfqId: 'RFQ1',
        rfqTitle: 'Office Equipment & IT Hardware',
        vendorId: 'v3',
        vendorName: 'Quality Goods Co',
        vendorCode: 'QGC003',
        vendorRating: 4.4,
        vendorEmail: 'sales@qualitygoods.example',
        vendorPhone: '+234-802-999-8877',
        status: 'DECLINED',
        items: [],
        totalAmount: 0,
        currency: 'NGN',
        deliveryTimeline: '',
        validityDays: 0,
        declineReason: 'Unable to meet delivery timeline',
        submittedAt: new Date('2024-01-13T08:15:00'),
        updatedAt: new Date('2024-01-13T08:15:00'),
        expiresAt: new Date('2024-01-27T23:59:59'),
        isViewed: true,
        termsAndConditions: 'N/A',
        notes: 'We cannot commit to the 3-day turnaround required.'
      },
      {
        id: 4,
        rfqId: 'RFQ2',
        rfqTitle: 'Premium Ergonomic Chairs',
        vendorId: 'v4',
        vendorName: 'Premium Electronics Hub',
        vendorCode: 'PEH005',
        vendorRating: 4.9,
        vendorEmail: 'deals@premiumelectronics.example',
        vendorPhone: '+234-900-111-0000',
        status: 'PENDING',
        items: [],
        totalAmount: 0,
        currency: 'NGN',
        deliveryTimeline: '',
        validityDays: 7,
        expiresAt: new Date('2026-01-30T23:59:59'),
        isViewed: false,
        updatedAt: new Date('2026-01-16T00:00:00')
      },
      {
        id: 5,
        rfqId: 'RFQ2',
        rfqTitle: 'Premium Ergonomic Chairs',
        vendorId: 'v5',
        vendorName: 'Express Logistics & Supply',
        vendorCode: 'ELS004',
        vendorRating: 4.2,
        vendorEmail: 'quote@expresslogistics.example',
        vendorPhone: '+234-805-444-2222',
        status: 'EXPIRED',
        items: [],
        totalAmount: 0,
        currency: 'NGN',
        deliveryTimeline: '',
        validityDays: 7,
        expiresAt: new Date('2026-12-10T23:59:59'),
        isViewed: false,
        updatedAt: new Date('2024-01-11T00:00:00')
      },
      {
        id: 6,
        rfqId: 'RFQ3',
        rfqTitle: 'AWS Cloud Infrastructure Consulting',
        vendorId: 'v6',
        vendorName: 'CloudScale Solutions',
        vendorCode: 'CSS008',
        vendorRating: 4.7,
        vendorEmail: 'cloud@cloudscale.example',
        vendorPhone: '+234-803-777-6655',
        status: 'SUBMITTED',
        items: [
          { id: 5, name: 'AWS Solutions Architecture Services', description: 'Migration setup, end-to-end audit, server deployment', quantity: 1, unitPrice: 12000000, totalPrice: 12000000, availability: 'AVAILABLE' }
        ],
        totalAmount: 12000000,
        currency: 'NGN',
        deliveryTimeline: '45 business days',
        validityDays: 60,
        submittedAt: new Date('2026-06-25T11:00:00'),
        updatedAt: new Date('2026-06-25T11:00:00'),
        expiresAt: new Date('2026-08-25T23:59:59'),
        isViewed: false,
        termsAndConditions: '1. Scope limited to AWS cloud platform\n2. 50% milestone billing',
        notes: 'Price includes post-migration support for 3 months.'
      },
      {
        id: 7,
        rfqId: 'RFQ3',
        rfqTitle: 'AWS Cloud Infrastructure Consulting',
        vendorId: 'v1',
        vendorName: 'TechPro Solutions Ltd',
        vendorCode: 'TPS001',
        vendorRating: 4.8,
        vendorEmail: 'procurement@techpro.example',
        vendorPhone: '+234-800-555-0101',
        status: 'PENDING',
        items: [],
        totalAmount: 0,
        currency: 'NGN',
        deliveryTimeline: '',
        validityDays: 0,
        expiresAt: new Date('2026-07-25T23:59:59'),
        isViewed: false,
        updatedAt: new Date('2026-06-26T00:00:00')
      },
      {
        id: 8,
        rfqId: 'RFQ4',
        rfqTitle: 'Janitorial & Corporate Cleaning Services',
        vendorId: 'v8',
        vendorName: 'Lagos Clean Services',
        vendorCode: 'LCS009',
        vendorRating: 4.5,
        vendorEmail: 'clean@lagosclean.example',
        vendorPhone: '+234-802-123-4567',
        status: 'ACCEPTED',
        items: [
          { id: 6, name: 'Office Cleaning Services', description: 'Monthly deep sanitisation and cleanup', quantity: 6, unitPrice: 400000, totalPrice: 2400000, availability: 'AVAILABLE' }
        ],
        totalAmount: 2400000,
        currency: 'NGN',
        deliveryTimeline: 'Recurring Monthly',
        validityDays: 90,
        submittedAt: new Date('2026-06-20T09:00:00'),
        updatedAt: new Date('2026-06-21T10:00:00'),
        expiresAt: new Date('2026-09-20T23:59:59'),
        isViewed: true,
        termsAndConditions: '1. Contract duration: 6 months minimum\n2. Invoiced monthly',
        notes: 'Quotes covers basic cleaning supplies.'
      },
      {
        id: 9,
        rfqId: 'RFQ4',
        rfqTitle: 'Janitorial & Corporate Cleaning Services',
        vendorId: 'v5',
        vendorName: 'Express Logistics & Supply',
        vendorCode: 'ELS004',
        vendorRating: 4.2,
        vendorEmail: 'quote@expresslogistics.example',
        vendorPhone: '+234-805-444-2222',
        status: 'DECLINED',
        items: [],
        totalAmount: 0,
        currency: 'NGN',
        deliveryTimeline: '',
        validityDays: 0,
        declineReason: 'Out of region service region limitations',
        submittedAt: new Date('2026-06-18T16:45:00'),
        updatedAt: new Date('2026-06-18T16:45:00'),
        expiresAt: new Date('2026-07-02T23:59:59'),
        isViewed: true,
        termsAndConditions: 'N/A',
        notes: 'Lagos Mainland area only.'
      },
      {
        id: 10,
        rfqId: 'RFQ5',
        rfqTitle: 'Office Furniture Procurement',
        vendorId: 'v10',
        vendorName: 'Comfort Seatings Ltd',
        vendorCode: 'CSL010',
        vendorRating: 4.6,
        vendorEmail: 'comfort@seatings.example',
        vendorPhone: '+234-909-555-1122',
        status: 'SUBMITTED',
        items: [
          { id: 7, name: 'High-Back Ergonomic Desk Chairs', description: 'Adjustable dynamic mesh lumbar support chairs', quantity: 20, unitPrice: 90000, totalPrice: 1800000, availability: 'AVAILABLE' }
        ],
        totalAmount: 1800000,
        currency: 'NGN',
        deliveryTimeline: '10 business days',
        validityDays: 30,
        submittedAt: new Date('2026-06-28T14:00:00'),
        updatedAt: new Date('2026-06-28T14:00:00'),
        expiresAt: new Date('2026-07-28T23:59:59'),
        isViewed: false,
        termsAndConditions: '1. Standard 2 year structural warranty\n2. Payment: 50% upfront, 50% on completion',
        notes: 'Chairs will be assembled on-site.'
      },
      {
        id: 11,
        rfqId: 'RFQ5',
        rfqTitle: 'Office Furniture Procurement',
        vendorId: 'v3',
        vendorName: 'Quality Goods Co',
        vendorCode: 'QGC003',
        vendorRating: 4.4,
        vendorEmail: 'sales@qualitygoods.example',
        vendorPhone: '+234-802-999-8877',
        status: 'SUBMITTED',
        items: [
          { id: 8, name: 'High-Back Ergonomic Desk Chairs', description: 'Adjustable dynamic mesh lumbar support chairs', quantity: 20, unitPrice: 97500, totalPrice: 1950000, availability: 'AVAILABLE' }
        ],
        totalAmount: 1950000,
        currency: 'NGN',
        deliveryTimeline: '7 business days',
        validityDays: 14,
        submittedAt: new Date('2026-06-29T15:30:00'),
        updatedAt: new Date('2026-06-29T15:30:00'),
        expiresAt: new Date('2026-07-13T23:59:59'),
        isViewed: false,
        termsAndConditions: '1. Full replacement warranty for 1 year\n2. Payment: Net 15 days',
        notes: 'Fast delivery guaranteed.'
      },
      {
        id: 12,
        rfqId: 'RFQ5',
        rfqTitle: 'Office Furniture Procurement',
        vendorId: 'v2',
        vendorName: 'Global Supplies Inc',
        vendorCode: 'GSI002',
        vendorRating: 4.6,
        vendorEmail: 'orders@globalsupplies.example',
        vendorPhone: '+234-811-333-2211',
        status: 'EXPIRED',
        items: [],
        totalAmount: 0,
        currency: 'NGN',
        deliveryTimeline: '',
        validityDays: 0,
        expiresAt: new Date('2026-06-30T23:59:59'),
        isViewed: false,
        updatedAt: new Date('2026-06-15T00:00:00')
      }
    ];
    return list.map(q => ({
      ...q,
      quotationId: String(q.id)
    })) as VendorQuotation[];
  }

  private reloadFromStorage(): void {
    const rawQuotations = loadFromStorage<VendorQuotation[]>(
      PROCUREMENT_STORAGE_KEYS.QUOTATIONS,
      () => this.buildDefaultQuotations(),
    );
    const requests = loadFromStorage<ProcurementRequest[]>(
      PROCUREMENT_STORAGE_KEYS.REQUESTS,
      () => [],
    );

    this.quotations = this.normalizeAll(rawQuotations).map((q) => {
      const match = requests.find((r) => String(r.id) === String(q.rfqId));
      if (match) {
        const mappedItems = q.items.map((item) => {
          const origItem = match.items.find((i) => String(i.id) === String(item.id));
          return {
            ...item,
            name: origItem ? origItem.name : item.name,
          };
        });
        return { ...q, rfqTitle: match.title, items: mappedItems };
      }
      return q;
    });
  }

  // Get all quotations for an RFQ
  getQuotationsForRFQ(rfqId: string): Observable<RFQWithQuotations> {
    this.reloadFromStorage();
    // Merge in live vendor-submitted quotations (from the shared vendor-portal
    // store), not just procurement's own local/demo quotations — otherwise a
    // real quotation the vendor submitted never appears here, "accepting" it
    // silently operates on local mock data instead of the shared record, and
    // the LPO generated from it never reaches the vendor portal.
    const matchingQuotes = [...this.quotations, ...this.getLiveQuotationsForRfq(rfqId)].filter(
      q => q.rfqId.toLowerCase() === rfqId.toLowerCase()
    );

    const responded = matchingQuotes.filter(
      q => ['SUBMITTED', 'ACCEPTED', 'DECLINED', 'LPO_GENERATED', 'LPO_SENT', 'REVIEW_REQUESTED'].includes(q.status)
    ).length;

    const pending = matchingQuotes.filter(q => q.status === 'PENDING').length;
    const accepted = matchingQuotes.filter(q => ['ACCEPTED', 'LPO_GENERATED', 'LPO_SENT'].includes(q.status)).length;
    const declined = matchingQuotes.filter(q => q.status === 'DECLINED').length;
    const expired = matchingQuotes.filter(q => q.status === 'EXPIRED').length;

    const rfqTitle = matchingQuotes[0]?.rfqTitle || 'Request for Quotation';

    const rfqData: RFQWithQuotations = {
      rfq: {
        id: parseIdToNumber(rfqId),
        customerId: 'cust-101',
        customerName: 'Optimax Industries',
        procurementType: rfqId.toLowerCase() === 'rfq3' ? 'SERVICE' : 'PRODUCT',
        title: rfqTitle,
        description: `Procurement details for ${rfqTitle}.`,
        items: matchingQuotes[0]?.items.map((it, idx) => ({
          id: idx + 1,
          name: it.name,
          description: it.description,
          quantity: it.quantity,
          unit: 'Pieces',
          estimatedBudget: it.totalPrice,
          attachments: []
        })) || [],
        totalBudget: matchingQuotes.reduce((acc, curr) => acc + curr.totalAmount, 0) || 1500000,
        currency: matchingQuotes[0]?.currency || 'NGN',
        deliveryLocation: 'Lagos, Nigeria',
        deliveryDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: accepted > 0 ? 'VENDOR_SELECTED' : 'VENDORS_QUOTING',
        attachments: [],
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        createdBy: 'ADMIN',
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updatedBy: 'ADMIN',
        suggestedVendorIds: [],
        suggestedVendors: [],
        selectedVendorId: matchingQuotes.find(q => q.status === 'ACCEPTED')?.vendorId || '',
        selectedVendorName: matchingQuotes.find(q => q.status === 'ACCEPTED')?.vendorName || '',
        selectedQuotationId: matchingQuotes.find(q => q.status === 'ACCEPTED')?.id?.toString() || '',
        approvalStatus: 'APPROVED',
        approvedBy: 'ADMIN',
        approvedAt: new Date()
      } as any,
      quotations: matchingQuotes,
      summary: {
        totalVendors: matchingQuotes.length,
        responded,
        pending,
        accepted,
        declined,
        expired
      }
    };

    return of(rfqData).pipe(delay(100));
  }

  // Get detailed quotation by ID
  getQuotationDetail(quotationId: string | number): Observable<VendorQuotation> {
    if (isLiveQuotationId(quotationId)) {
      const realId = fromLiveId(quotationId);
      const liveQ = this.vendorService.getQuotationsSnapshot().find(q => q.id === realId);
      if (liveQ) {
        const lpos = this.vendorService.getLposSnapshot();
        const requests = loadFromStorage<ProcurementRequest[]>(PROCUREMENT_STORAGE_KEYS.REQUESTS, () => []);
        const mapped = sharedQuotationToVendorQuotation(liveQ, lpos.some(l => l.quotationId === liveQ.id), undefined, requests);
        return of(mapped).pipe(delay(100));
      }
    }
    this.reloadFromStorage();
    const found = this.quotations.find(q => String(q.id) === String(quotationId));
    if (!found) {
      return throwError(() => new Error(`Quotation not found: ${quotationId}`));
    }
    return of({ ...found }).pipe(delay(100));
  }

  // Accept a quotation
  acceptQuotation(quotationId: string | number, notes?: string): Observable<{ message: string }> {
    if (isLiveQuotationId(quotationId)) {
      const realId = fromLiveId(quotationId);
      const result = this.vendorService.acceptQuotation(realId, notes);
      if (!result.ok) {
        return throwError(() => new Error(result.reason ?? 'Unable to accept this quotation.'));
      }

      // Update the procurement request in storage!
      const liveQ = this.vendorService.getQuotationsSnapshot().find(q => q.id === realId);
      if (liveQ) {
        const requests = loadFromStorage<ProcurementRequest[]>(PROCUREMENT_STORAGE_KEYS.REQUESTS, () => []);
        const reqIdx = requests.findIndex(r => String(r.id) === String(liveQ.rfqId));
        if (reqIdx !== -1) {
          requests[reqIdx] = {
            ...requests[reqIdx],
            status: 'VENDOR_SELECTED',
            selectedQuotationId: String(quotationId),
            selectedVendorId: liveQ.vendorId || '',
            selectedVendorName: liveQ.vendorName || '',
            updatedAt: new Date()
          };
          saveToStorage(PROCUREMENT_STORAGE_KEYS.REQUESTS, requests);
        }
      }

      return of({ message: 'Quotation successfully accepted.' }).pipe(delay(100));
    }

    const found = this.quotations.find(q => String(q.id) === String(quotationId));
    if (found) {
      found.status = 'ACCEPTED';
      found.updatedAt = new Date();
      found.history = [
        ...(found.history ?? []),
        this.historyEntry(found, 'ACCEPTED', 'CUSTOMER', notes, found.totalAmount, found.updatedAt),
      ];

      // Decline other quotations for same RFQ
      this.quotations.forEach(q => {
        if (q.rfqId === found.rfqId && String(q.id) !== String(found.id) && (q.status === 'SUBMITTED' || q.status === 'PENDING' || q.status === 'REVIEW_REQUESTED')) {
          q.status = 'DECLINED';
          q.declineReason = 'Another quotation was accepted for this RFQ';
          q.updatedAt = new Date();
          q.history = [
            ...(q.history ?? []),
            this.historyEntry(q, 'DECLINED', 'SYSTEM', q.declineReason, undefined, q.updatedAt),
          ];
        }
      });

      this.persist();
      return of({
        message: 'Quotation successfully accepted.'
      }).pipe(delay(100));
    }
    return throwError(() => new Error(`Quotation not found: ${quotationId}`));
  }

  // Send LPO to vendor
  sendLpoToVendor(quotationId: string | number, lpoNumber: string): Observable<{ message: string }> {
    if (isLiveQuotationId(quotationId)) {
      // For a live quotation, the LPO itself was already generated (and is
      // already visible to the vendor in their shared store) the moment the
      // LPO preview screen was opened — see ensureLpoAssigned(). There's no
      // further "send" action needed for a real, connected vendor.
      return of({ message: 'The LPO has already been delivered to the vendor.' }).pipe(delay(100));
    }

    const found = this.quotations.find(q => String(q.id) === String(quotationId));
    if (found) {
      found.status = 'LPO_SENT';
      found.updatedAt = new Date();
      found.history = [
        ...(found.history ?? []),
        this.historyEntry(found, 'LPO_SENT', 'CUSTOMER', `LPO ${lpoNumber} sent to vendor.`, undefined, found.updatedAt),
      ];
      this.persist();
      return of({ message: 'LPO has been successfully sent to the vendor.' }).pipe(delay(100));
    }
    return throwError(() => new Error(`Quotation not found: ${quotationId}`));
  }

  // Update quotation status
  updateQuotationStatus(quotationId: string | number, status: VendorQuotationStatus): Observable<{ message: string }> {
    if (isLiveQuotationId(quotationId)) {
      return throwError(() => new Error(
        'This is a live vendor quotation — use accept, decline, or request changes instead of a direct status update.'
      ));
    }

    const found = this.quotations.find(q => String(q.id) === String(quotationId));
    if (found) {
      found.status = status;
      found.updatedAt = new Date();
      found.history = [
        ...(found.history ?? []),
        this.historyEntry(found, 'STATUS_CHANGED', 'SYSTEM', `Status changed to ${status}.`, undefined, found.updatedAt),
      ];
      this.persist();
      return of({ message: `Quotation status updated to ${status}.` }).pipe(delay(100));
    }
    return throwError(() => new Error(`Quotation not found: ${quotationId}`));
  }

  // Reject a quotation
  rejectQuotation(quotationId: string | number, reason: string): Observable<{ message: string }> {
    if (isLiveQuotationId(quotationId)) {
      const result = this.vendorService.rejectQuotation(fromLiveId(quotationId), reason);
      if (!result.ok) {
        return throwError(() => new Error(result.reason ?? 'Unable to decline this quotation.'));
      }
      return of({ message: 'Quotation declined successfully.' }).pipe(delay(100));
    }

    const found = this.quotations.find(q => String(q.id) === String(quotationId));
    if (found) {
      found.status = 'DECLINED';
      found.declineReason = reason;
      found.updatedAt = new Date();
      found.history = [
        ...(found.history ?? []),
        this.historyEntry(found, 'DECLINED', 'CUSTOMER', reason, undefined, found.updatedAt),
      ];
      this.persist();
      return of({ message: 'Quotation declined successfully.' }).pipe(delay(100));
    }
    return throwError(() => new Error(`Quotation not found: ${quotationId}`));
  }

  // Request Changes (Review Requested) — capped at MAX_QUOTATION_REVISIONS (3) round trips.
  requestChanges(quotationId: string | number, notes: string): Observable<{ message: string }> {
    if (isLiveQuotationId(quotationId)) {
      const result = this.vendorService.requestRevision(fromLiveId(quotationId), notes);
      if (!result.ok) {
        return throwError(() => new Error(result.reason ?? 'Unable to request changes.'));
      }
      return of({ message: 'Request changes notes sent to the vendor.' }).pipe(delay(100));
    }

    const found = this.quotations.find(q => String(q.id) === String(quotationId));
    if (!found) {
      return throwError(() => new Error(`Quotation not found: ${quotationId}`));
    }

    const revisionCount = found.revisionCount ?? 0;
    if (revisionCount >= MAX_QUOTATION_REVISIONS) {
      return throwError(() => new Error(
        `This quotation has already been sent back for revision ${MAX_QUOTATION_REVISIONS} times. ` +
        `Please reach out to the vendor directly, or decline this quotation and re-issue the RFQ.`
      ));
    }

    found.status = 'REVIEW_REQUESTED';
    found.revisionRequestNote = notes;
    found.revisionRequestedAt = new Date();
    found.revisionCount = revisionCount + 1;
    found.updatedAt = new Date();
    found.history = [
      ...(found.history ?? []),
      this.historyEntry(found, 'REVIEW_REQUESTED', 'CUSTOMER', notes, undefined, found.revisionRequestedAt),
    ];
    this.persist();
    return of({ message: 'Request changes notes sent to the vendor.' }).pipe(delay(100));
  }

  // Simulate vendor resubmission (overwriting old quotation details)
  simulateVendorResubmit(quotationId: string | number, newTotal: number, newNotes?: string): Observable<{ message: string }> {
    if (isLiveQuotationId(quotationId)) {
      return throwError(() => new Error(
        'This is a live quotation from a connected vendor — resubmission has to come from the vendor\'s own portal, it can\'t be simulated from procurement.'
      ));
    }

    const found = this.quotations.find(q => String(q.id) === String(quotationId));
    if (found) {
      const newVersion = (found.version ?? 1) + 1;
      found.status = 'SUBMITTED';
      found.totalAmount = newTotal;
      found.notes = newNotes || 'Updated specifications and price matching client requests.';
      found.revisionRequestNote = undefined; // clear request note
      found.submittedAt = new Date();
      found.updatedAt = new Date();
      found.version = newVersion;

      // Update item totals to reflect new total amount roughly (for visual consistency)
      if (found.items && found.items.length > 0) {
        const itemRatio = newTotal / found.items.reduce((acc, it) => acc + (it.totalPrice || 0), 0);
        found.items.forEach(it => {
          it.unitPrice = Math.round(it.unitPrice * (itemRatio || 1));
          it.totalPrice = it.unitPrice * it.quantity;
        });
      }

      found.history = [
        ...(found.history ?? []),
        { ...this.historyEntry(found, 'RESUBMITTED', 'VENDOR', newNotes, newTotal, found.submittedAt), version: newVersion },
      ];

      this.persist();
      return of({ message: 'New quotation sent from vendor.' }).pipe(delay(100));
    }
    return throwError(() => new Error(`Quotation not found: ${quotationId}`));
  }

  // Cancel pending quotation (vendor hasn't responded)
  cancelPendingQuotation(rfqId: string, vendorId: string): Observable<{ message: string }> {
    const matchingQuotes = this.quotations.filter(
      q => q.rfqId.toLowerCase() === rfqId.toLowerCase() && q.vendorId === vendorId
    );
    if (matchingQuotes.length > 0) {
      matchingQuotes.forEach(q => {
        q.status = 'WITHDRAWN';
        q.updatedAt = new Date();
        q.history = [
          ...(q.history ?? []),
          this.historyEntry(q, 'WITHDRAWN', 'VENDOR', undefined, undefined, q.updatedAt),
        ];
      });
      this.persist();
      return of({ message: 'Pending quotation successfully cancelled.' }).pipe(delay(100));
    }
    return throwError(() => new Error(`Pending quotation not found for RFQ: ${rfqId}, Vendor: ${vendorId}`));
  }

  // Get all quotations dashboard
  getQuotationsDashboard(filters?: any): Observable<any> {
    this.reloadFromStorage();
    return of({ quotations: [...this.quotations, ...this.getAllLiveQuotations()] }).pipe(delay(100));
  }

  // Mark quotation as viewed
  markAsViewed(quotationId: string | number): Observable<void> {
    if (isLiveQuotationId(quotationId)) {
      this.vendorService.markQuotationViewedByCustomer(fromLiveId(quotationId));
      return of(void 0).pipe(delay(50));
    }

    const found = this.quotations.find(q => String(q.id) === String(quotationId));
    if (found && !found.isViewed) {
      found.isViewed = true;
      found.history = [
        ...(found.history ?? []),
        this.historyEntry(found, 'VIEWED', 'CUSTOMER', undefined, undefined, new Date()),
      ];
      this.persist();
    }
    return of(void 0).pipe(delay(50));
  }

  /**
   * Resolves this quotation's LPO number/date — assigning one only if it
   * doesn't have one yet — so a component can call this on every visit and
   * always get back the same, stable value instead of inventing a new one
   * per page load.
   */
  ensureLpoAssigned(quotationId: string | number): Observable<{ lpoId: string; lpoNumber: string; lpoIssuedAt: Date }> {
    if (isLiveQuotationId(quotationId)) {
      const realId = fromLiveId(quotationId);
      const result = this.vendorService.generateLpoForQuotation(realId);
      if (!result.ok || !result.lpo) {
        return throwError(() => new Error(result.reason ?? 'Unable to generate an LPO for this quotation.'));
      }
      return of({ lpoId: result.lpo.id, lpoNumber: result.lpo.lpoNumber, lpoIssuedAt: result.lpo.issuedDate }).pipe(delay(50));
    }

    const found = this.quotations.find(q => String(q.id) === String(quotationId));
    if (!found) {
      return throwError(() => new Error(`Quotation not found: ${quotationId}`));
    }
    if (!found.lpoNumber) {
      found.lpoNumber = this.generateLpoNumber();
      found.lpoIssuedAt = new Date();
      this.persist();
    }
    // Local/demo quotations never spawn a separate Lpo entity, so there's no
    // real Lpo.id to hand back — fall back to the quotation's own id.
    return of({ lpoId: String(found.id), lpoNumber: found.lpoNumber, lpoIssuedAt: found.lpoIssuedAt! }).pipe(delay(50));
  }

  /** Full audit trail for a quotation, oldest first — for a future timeline/history UI. */
  getQuotationHistory(quotationId: string | number): Observable<QuotationHistoryEntry[]> {
    if (isLiveQuotationId(quotationId)) {
      const live = this.findLiveQuotation(quotationId);
      if (!live) {
        return throwError(() => new Error(`Quotation not found: ${quotationId}`));
      }
      const hasLpo = this.vendorService.getLposSnapshot().some(l => l.quotationId === live.id);
      const requests = loadFromStorage<ProcurementRequest[]>(PROCUREMENT_STORAGE_KEYS.REQUESTS, () => []);
      return of(sharedQuotationToVendorQuotation(live, hasLpo, undefined, requests).history ?? []).pipe(delay(50));
    }
    const found = this.quotations.find(q => String(q.id) === String(quotationId));
    if (!found) {
      return throwError(() => new Error(`Quotation not found: ${quotationId}`));
    }
    return of([...(found.history ?? [])]).pipe(delay(50));
  }
}
// quotation-management.service.ts

import { toApiDate } from '../sales/date.util';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, EMPTY } from 'rxjs';
import { map, expand, reduce, catchError } from 'rxjs/operators';
import {
  VendorQuotation,
  RFQWithQuotations,
  VendorQuotationStatus,
  QuotationHistoryEntry,
  MAX_QUOTATION_REVISIONS,
  ProcurementRequest,
} from '../../domain/procurement-request/procurement.dto';
import { environment } from '../../shared-component/service/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuotationManagementService {

  private readonly baseUrl = environment.apiBaseUrl + '/x/api/v2/commerce';

  constructor(private http: HttpClient) {}

  private get tenantId(): string {
    const h = window.location.hostname;
    return (h.includes('localhost') || h.includes('127.0.0.1')) ? 'optimax' : h.split('.')[0] || 'optimax';
  }

  // ── Quotation queries ────────────────────────────────────────────────────────

  getQuotationsByRfq(rfqId: string): Observable<VendorQuotation[]> {
    const params = new HttpParams()
      .set('page', '1')
      .set('size', '100')
      .set('rfqId', rfqId);
    return this.http.get<any>(`${this.baseUrl}/vendor-quotations/`, { params }).pipe(
      map(res => Array.isArray(res) ? res : (res?.data ?? res ?? []))
    );
  }

  getQuotation(id: string | number): Observable<VendorQuotation> {
    return this.http.get<VendorQuotation>(`${this.baseUrl}/vendor-quotations/${id}`);
  }

  private fetchQuotationsPage(page: number, size: number, filters?: any): Observable<VendorQuotation[]> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));

    if (filters?.rfqId) { params = params.set('rfqId', filters.rfqId); }
    if (filters?.vendorId) { params = params.set('vendorId', filters.vendorId); }
    if (filters?.status) { params = params.set('status', filters.status); }

    return this.http.get<any>(`${this.baseUrl}/vendor-quotations/`, { params }).pipe(
      map(res => Array.isArray(res) ? res : (res?.data ?? res ?? []))
    );
  }

  /**
   * When the caller asks for a specific page (filters.page set), returns just that page —
   * unchanged behavior. When no page is specified, the caller wants the complete dataset (e.g.
   * the dashboard's client-side grouping/stats/filtering need every quotation), so this now
   * auto-paginates through the backend's fixed page size and accumulates every record instead of
   * silently returning only the first `size` (previously defaulted to 50) and undercounting
   * everything past it with no indication anything was missing.
   */
  getAllQuotations(filters?: any): Observable<VendorQuotation[]> {
    // 50 is the page size this unfiltered endpoint was already called with before auto-pagination
    // existed, so the first request is identical to what is known to work.
    const size = filters?.size || 50;

    if (filters?.page !== undefined) {
      return this.fetchQuotationsPage(filters.page + 1, size, filters);
    }

    const MAX_PAGES = 100; // safety cap (5,000 records at size=50) against a runaway loop
    return this.fetchQuotationsPage(1, size, filters).pipe(
      // A failure on a later page keeps the pages already loaded (with a warning) rather than
      // discarding everything; a failure on the first page still propagates as an error.
      expand((batch, i) => (batch.length === size && i + 1 < MAX_PAGES)
        ? this.fetchQuotationsPage(i + 2, size, filters).pipe(
            catchError(err => {
              console.warn(`[QuotationManagementService] page ${i + 2} failed; showing ${(i + 1) * size} quotations loaded so far`, err);
              return EMPTY;
            })
          )
        : EMPTY),
      reduce((all, batch) => [...all, ...batch], [] as VendorQuotation[])
    );
  }

  // ── Quotation detail (alias used by existing components) ────────────────────

  getQuotationDetail(quotationId: string | number): Observable<VendorQuotation> {
    return this.getQuotation(quotationId);
  }

  // ── RFQ + quotations aggregate view ─────────────────────────────────────────

  getQuotationsForRFQ(rfqId: string): Observable<RFQWithQuotations> {
    return this.getQuotationsByRfq(rfqId).pipe(
      map((quotations: VendorQuotation[]) => {
        const responded = quotations.filter(q =>
          ['SUBMITTED', 'ACCEPTED', 'DECLINED', 'LPO_GENERATED', 'LPO_SENT', 'REVIEW_REQUESTED'].includes(q.status)
        ).length;
        const pending = quotations.filter(q => q.status === 'PENDING').length;
        const accepted = quotations.filter(q => ['ACCEPTED', 'LPO_GENERATED', 'LPO_SENT'].includes(q.status)).length;
        const declined = quotations.filter(q => q.status === 'DECLINED').length;
        const expired  = quotations.filter(q => q.status === 'EXPIRED').length;

        const rfqTitle = (quotations[0] as any)?.rfqTitle || 'Request for Quotation';

        const rfqData: RFQWithQuotations = {
          rfq: {
            id: Number(rfqId) || 0,
            title: rfqTitle,
            status: accepted > 0 ? 'VENDOR_SELECTED' : 'VENDORS_QUOTING',
            selectedVendorId: quotations.find(q => q.status === 'ACCEPTED')?.vendorId || '',
            selectedVendorName: quotations.find(q => q.status === 'ACCEPTED')?.vendorName || '',
            selectedQuotationId: quotations.find(q => q.status === 'ACCEPTED')?.id?.toString() || '',
          } as any,
          quotations,
          summary: {
            totalVendors: quotations.length,
            responded,
            pending,
            accepted,
            declined,
            expired
          }
        };
        return rfqData;
      })
    );
  }

  // ── Quotation dashboard (all quotations) ─────────────────────────────────────

  getQuotationsDashboard(filters?: any): Observable<any> {
    return this.getAllQuotations(filters).pipe(
      map(quotations => ({ quotations }))
    );
  }

  // ── Lifecycle actions ────────────────────────────────────────────────────────

  acceptQuotation(quotationId: string | number, note?: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.baseUrl}/vendor-quotations/${quotationId}/accept`,
      note ? { note } : {}
    );
  }

  declineQuotation(quotationId: string | number, reason: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.baseUrl}/vendor-quotations/${quotationId}/decline`,
      { reason }
    );
  }

  /** Alias used by components that call rejectQuotation */
  rejectQuotation(quotationId: string | number, reason: string): Observable<{ message: string }> {
    return this.declineQuotation(quotationId, reason);
  }

  requestRevision(quotationId: string | number, note: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.baseUrl}/vendor-quotations/${quotationId}/request-revision`,
      { note }
    );
  }

  /** Alias used by components that call requestChanges */
  requestChanges(quotationId: string | number, notes: string): Observable<{ message: string }> {
    return this.requestRevision(quotationId, notes);
  }

  generateLpo(quotationId: string | number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.baseUrl}/vendor-quotations/${quotationId}/generate-lpo`,
      {}
    );
  }

  markAsViewed(quotationId: string | number): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/vendor-quotations/${quotationId}/mark-viewed`,
      {}
    );
  }

  // ── LPO helpers ──────────────────────────────────────────────────────────────

  ensureLpoAssigned(quotationId: string | number): Observable<{ lpoId: string; lpoNumber: string; lpoIssuedAt: Date }> {
    return this.generateLpo(quotationId).pipe(
      map((res: any) => ({
        lpoId: res?.lpoId ?? String(quotationId),
        lpoNumber: res?.lpoNumber ?? `LPO-${new Date().getFullYear()}-${String(quotationId)}`,
        lpoIssuedAt: res?.lpoIssuedAt ? toApiDate(res.lpoIssuedAt) : new Date()
      }))
    );
  }

  sendLpoToVendor(quotationId: string | number, lpoNumber: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.baseUrl}/vendor-quotations/${quotationId}/generate-lpo`,
      { lpoNumber }
    );
  }

  // ── Status & history helpers ─────────────────────────────────────────────────

  getQuotationHistory(quotationId: string | number): Observable<QuotationHistoryEntry[]> {
    return this.getQuotation(quotationId).pipe(
      map(q => q.history ?? [])
    );
  }

  // ── Write (create / update) ──────────────────────────────────────────────────

  createQuotation(quotation: Partial<VendorQuotation>): Observable<VendorQuotation> {
    return this.http.post<VendorQuotation>(
      `${this.baseUrl}/vendor-quotations/`,
      quotation
    );
  }

  updateQuotation(id: string | number, quotation: Partial<VendorQuotation>): Observable<VendorQuotation> {
    return this.http.put<VendorQuotation>(
      `${this.baseUrl}/vendor-quotations/${id}`,
      quotation
    );
  }

  // ── Simulation helpers (dev/demo only — no-op in production) ────────────────

  simulateVendorResubmit(quotationId: string | number, _newTotal: number, _newNotes?: string): Observable<{ message: string }> {
    // Vendor resubmission originates from the vendor portal; nothing to do here.
    return new Observable(observer => {
      observer.next({ message: 'Vendor resubmission must come from the vendor portal.' });
      observer.complete();
    });
  }
}

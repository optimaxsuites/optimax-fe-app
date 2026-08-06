import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import {
  ProcurementRequest,
  RequestFilters,
  PaginatedResponse,
  RFQTemplate,
  VendorSuggestion,
  ProcurementCategory
} from '../../domain/procurement-request/procurement.dto';
import { environment } from '../../shared-component/service/environments/environment';
import { VendorService } from '../vendor-management/vendor-management.service';
import { Vendor, VendorStatus } from '../../domain/vendor-management/vendor-management.dto';

// Maps each procurement category (as returned by getProcurementCategories()) to the
// keywords used to recognize a matching vendor — checked against both the vendor's
// registered supply categories and its display category strings, since the two
// sides of the app don't share one taxonomy.
const PROCUREMENT_CATEGORY_KEYWORDS: Record<string, string[]> = {
  'IT & Electronics': ['it', 'tech', 'electronic', 'hardware', 'software', 'telecom'],
  'Office Furniture & Fixtures': ['furniture', 'fixture'],
  'Stationery & Office Supplies': ['stationery', 'office supp', 'supplies'],
  'Industrial & Maintenance': ['industrial', 'maintenance', 'equipment', 'mechanical', 'engineering', 'automotive', 'manufactur'],
  'Professional & Advisory Services': ['consult', 'advisory', 'professional', 'financial', 'legal'],
  'Logistics, Freight & Transport': ['logistic', 'freight', 'transport', 'cold chain', 'warehous', 'shipping'],
  'Facility Operations & Utilities': ['facilit', 'security', 'cleaning', 'utilit', 'real estate']
};

@Injectable({
  providedIn: 'root'
})
export class ProcurementRequestService {

  private readonly baseUrl = environment.apiBaseUrl + '/x/api/v2/commerce';

  constructor(private http: HttpClient, private vendorService: VendorService) {}

  private get tenantId(): string {
    const h = window.location.hostname;
    return (h.includes('localhost') || h.includes('127.0.0.1')) ? 'optimax' : h.split('.')[0] || 'optimax';
  }

  /**
   * No-op stub — vendor portal mirror is handled server-side.
   */
  private syncRfqMirror(_r: any): void {}

  getRequests(filters: RequestFilters): Observable<PaginatedResponse<ProcurementRequest>> {
    let params = new HttpParams()
      .set('tenantId', this.tenantId)
      .set('page', String((filters.page || 0) + 1))
      .set('size', String(filters.size || 10));

    if (filters.status && filters.status !== 'ALL') {
      params = params.set('status', filters.status);
    }
    if (filters.procurementType) {
      params = params.set('procurementType', filters.procurementType);
    }
    if (filters.searchTerm) {
      params = params.set('search', filters.searchTerm);
    }

    return this.http.get<any>(
      `${this.baseUrl}/procurement-requests/`,
      { params }
    ).pipe(
      map((res: any) => {
        const arr: ProcurementRequest[] = Array.isArray(res) ? res : (res?.data ?? []);
        return {
          data: arr,
          totalElements: arr.length,
          totalPages: 1,
          currentPage: filters.page || 0,
          pageSize: filters.size || 10
        } as PaginatedResponse<ProcurementRequest>;
      })
    );
  }

  getRequest(id: number): Observable<ProcurementRequest> {
    return this.http.get<ProcurementRequest>(
      `${this.baseUrl}/procurement-requests/${id}`
    );
  }

  createRequest(request: Partial<ProcurementRequest>): Observable<ProcurementRequest> {
    return this.http.post<ProcurementRequest>(
      `${this.baseUrl}/procurement-requests/`,
      { ...request, tenantId: this.tenantId }
    );
  }

  updateRequest(id: number, request: Partial<ProcurementRequest>): Observable<ProcurementRequest> {
    return this.http.put<ProcurementRequest>(
      `${this.baseUrl}/procurement-requests/${id}`,
      request
    );
  }

  updateRequestStatus(id: number, status: string): Observable<ProcurementRequest> {
    return this.http.patch<ProcurementRequest>(
      `${this.baseUrl}/procurement-requests/${id}/status`,
      { status }
    );
  }

  submitForApproval(id: number): Observable<ProcurementRequest> {
    return this.http.patch<ProcurementRequest>(
      `${this.baseUrl}/procurement-requests/${id}/submit-for-approval`,
      {}
    );
  }

  selectVendor(id: number, vendorId: string, quotationId: string): Observable<ProcurementRequest> {
    return this.http.patch<ProcurementRequest>(
      `${this.baseUrl}/procurement-requests/${id}/select-vendor`,
      { vendorId, quotationId }
    );
  }

  cancelRequest(id: number, reason: string): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/procurement-requests/${id}/status`,
      { status: 'CANCELLED', reason }
    );
  }

  deleteRequest(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/procurement-requests/${id}`
    );
  }

  addRequestItem(requestId: number, item: any): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/procurement-requests/${requestId}/items`,
      item
    );
  }

  updateRequestItem(itemId: number, item: any): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/procurement-requests/items/${itemId}`,
      item
    );
  }

  deleteRequestItem(itemId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/procurement-requests/items/${itemId}`
    );
  }

  uploadAttachment(requestId: string, file: File): Observable<{ attachmentId: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ attachmentId: string; url: string }>(
      `${this.baseUrl}/procurement-requests/${requestId}/attachments`,
      formData
    );
  }

  deleteAttachment(attachmentId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/procurement-requests/attachments/${attachmentId}`
    );
  }

  getRFQTemplates(): Observable<RFQTemplate[]> {
    const params = new HttpParams().set('tenantId', this.tenantId).set('page', '1').set('size', '50');
    return this.http.get<any>(
      `${this.baseUrl}/rfq-templates/`,
      { params }
    ).pipe(map(res => Array.isArray(res) ? res : (res?.data ?? [])));
  }

  getRFQTemplate(id: string): Observable<RFQTemplate> {
    return this.http.get<RFQTemplate>(
      `${this.baseUrl}/rfq-templates/${id}`
    );
  }

  createRFQTemplate(template: Partial<RFQTemplate>): Observable<RFQTemplate> {
    return this.http.post<RFQTemplate>(
      `${this.baseUrl}/rfq-templates/`,
      { ...template, tenantId: this.tenantId }
    );
  }

  updateRFQTemplate(id: string, template: Partial<RFQTemplate>): Observable<RFQTemplate> {
    return this.http.put<RFQTemplate>(
      `${this.baseUrl}/rfq-templates/${id}`,
      { ...template, tenantId: this.tenantId }
    );
  }

  deleteRFQTemplate(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/rfq-templates/${id}`
    );
  }

  /**
   * Suggests vendors for an RFQ: only vendors that have been accepted (status
   * ACTIVE) are eligible at all, and among those, only ones whose registered
   * expertise matches the RFQ's category are returned — ranked by how well
   * they match plus their tier/performance/rating.
   */
  getVendorSuggestions(requestId: number): Observable<VendorSuggestion[]> {
    return this.getRequest(requestId).pipe(
      switchMap(request => {
        const categoryNames = this.getRequestCategoryNames(request);
        // Fetch every accepted vendor — rejection/pending vendors are never
        // eligible for suggestion, regardless of category.
        return this.vendorService.getVendors(1, 200, { status: VendorStatus.ACTIVE }).pipe(
          map(response => this.buildVendorSuggestions(response.vendors, categoryNames))
        );
      }),
      catchError((err) => {
        console.error('[ProcurementRequestService] getVendorSuggestions failed:', err);
        return of([]);
      })
    );
  }

  /** Every distinct category name referenced by the request (top-level + line items). */
  private getRequestCategoryNames(request: ProcurementRequest): string[] {
    const names = new Set<string>();
    if (request.serviceCategory) names.add(request.serviceCategory);
    (request.items || []).forEach(item => {
      if (item.category?.name) names.add(item.category.name);
      if (item.serviceCategory) names.add(item.serviceCategory);
    });
    return Array.from(names);
  }

  private vendorMatchesCategory(vendor: Vendor, categoryNames: string[]): boolean {
    if (categoryNames.length === 0) return true; // No category on the request — don't exclude anyone.
    const vendorCategoryText = [
      ...(vendor.categories || []),
      ...(vendor.registration?.step5?.supplyCategories || []),
      vendor.registration?.step5?.primaryCategory || ''
    ].join(' ').toLowerCase();

    return categoryNames.some(name => {
      // Direct match against the RFQ category's own name (handles vendors whose
      // category strings already line up, e.g. imported/legacy records).
      if (vendorCategoryText.includes(name.toLowerCase())) return true;
      const keywords = PROCUREMENT_CATEGORY_KEYWORDS[name] || [];
      return keywords.some(kw => vendorCategoryText.includes(kw));
    });
  }

  private buildVendorSuggestions(vendors: Vendor[], categoryNames: string[]): VendorSuggestion[] {
    return vendors
      .filter(v => this.vendorMatchesCategory(v, categoryNames))
      .map(v => {
        const tierScore = v.tier === 'PREFERRED' ? 20 : v.tier === 'APPROVED' ? 10 : 0;
        const performanceScore = Math.round((v.performanceScore || 0) * 0.3);
        const ratingScore = Math.round((v.averageRating || 0) / 5 * 10);
        const matchScore = Math.min(100, 40 + tierScore + performanceScore + ratingScore);

        const matchedCategory = categoryNames.find(name => {
          const text = (v.categories || []).join(' ').toLowerCase();
          return text.includes(name.toLowerCase()) ||
            (PROCUREMENT_CATEGORY_KEYWORDS[name] || []).some(kw => text.includes(kw));
        });

        return {
          id: Number(v.id.replace(/\D/g, '')) || 0,
          vendorId: v.id,
          vendorName: v.companyName,
          vendorCode: v.registrationNumber || v.id,
          categories: v.categories || [],
          rating: v.averageRating || 0,
          reviews: [],
          totalProjects: v.totalProjects || 0,
          completionRate: v.performanceMetrics?.onTimeDeliveryRate || 0,
          averageResponseTime: 0,
          matchScore,
          isRecommended: matchScore >= 70,
          reason: matchedCategory
            ? `Accepted vendor matching your ${matchedCategory} category · ${this.tierLabel(v.tier)} tier · ${Math.round(v.performanceScore || 0)}% performance score`
            : `Accepted ${this.tierLabel(v.tier)} tier vendor`
        } as VendorSuggestion;
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);
  }

  private tierLabel(tier: any): string {
    const map: Record<string, string> = { PREFERRED: 'Preferred', APPROVED: 'Approved', CONDITIONAL: 'Conditional' };
    return map[tier] || 'Approved';
  }

  getSavedVendorRating(_requestId: number, _vendorId: string): any {
    return { rating: 0, count: 0 };
  }

  getCategories(): Observable<string[]> {
    return of(['PRODUCT', 'SERVICE']);
  }

  getProcurementCategories(): Observable<ProcurementCategory[]> {
    const params = new HttpParams().set('tenantId', this.tenantId);
    return this.http.get<any>(`${this.baseUrl}/categories`, { params }).pipe(
      map((res: any) => {
        const arr = res.data ?? res ?? [];
        const defaults = this.getDefaultCategories();
        if (Array.isArray(arr) && arr.length > 0) {
          const custom = arr.map((cat: any) => ({
            id: cat.id,
            categoryId: cat.categoryId || cat.name || String(cat.id),
            name: cat.name,
            description: cat.description || ''
          }));
          const filteredDefaults = defaults.filter(d => 
            !custom.some(c => c.name.toLowerCase() === d.name.toLowerCase())
          );
          return [...custom, ...filteredDefaults];
        }
        return defaults;
      }),
      catchError(() => {
        return of(this.getDefaultCategories());
      })
    );
  }

  private getDefaultCategories(): ProcurementCategory[] {
    return [
      { id: 1, categoryId: 'CAT-001', name: 'IT & Electronics', description: 'Computers, hardware, peripherals, and office gadgets' },
      { id: 2, categoryId: 'CAT-002', name: 'Office Furniture & Fixtures', description: 'Chairs, desks, conference tables, and storage' },
      { id: 3, categoryId: 'CAT-003', name: 'Stationery & Office Supplies', description: 'Paper, pens, toner, and general office consumables' },
      { id: 4, categoryId: 'CAT-004', name: 'Industrial & Maintenance', description: 'Tools, spare parts, cleaning supplies, and machinery' },
      { id: 5, categoryId: 'CAT-005', name: 'Professional & Advisory Services', description: 'Consulting, auditing, legal, and advisory services' },
      { id: 6, categoryId: 'CAT-006', name: 'Logistics, Freight & Transport', description: 'Freight, courier, fleet management, and shipping' },
      { id: 7, categoryId: 'CAT-007', name: 'Facility Operations & Utilities', description: 'HVAC, security systems, cleaning, and maintenance' }
    ];
  }
}

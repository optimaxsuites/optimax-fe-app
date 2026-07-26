import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  ProcurementRequest,
  RequestFilters,
  PaginatedResponse,
  RFQTemplate,
  VendorSuggestion,
  ProcurementType,
  RequestStatus,
  RFQTemplateSection,
  ProcurementCategory
} from '../../domain/procurement-request/procurement.dto';
import { PROCUREMENT_STORAGE_KEYS, loadFromStorage, saveToStorage } from './procurement-store.util';
import { VendorService } from '../vendor-portal/vendor.service';
import { procurementRequestToRfq, requestIsVendorVisible } from './rfq-quotation-bridge.util';

@Injectable({
  providedIn: 'root'
})
export class ProcurementRequestService {

  constructor(private vendorService: VendorService) { }

  /**
   * Mirrors this request into the shared vendor-portal store as an Rfq, so
   * it shows up in the vendor's RFQ inbox — see rfq-quotation-bridge.util.ts.
   * Runs whenever the request is newly vendor-visible (just sent out for
   * quotes) or was already shared before (so status changes like
   * cancellation still propagate instead of leaving a stale mirror behind).
   */
  private syncRfqMirror(request: ProcurementRequest): void {
    const alreadyShared = this.vendorService.getRfqsSnapshot().some(r => r.id === String(request.id));
    if (requestIsVendorVisible(request.status) || alreadyShared) {
      this.vendorService.upsertExternalRfq(procurementRequestToRfq(request));
    }
  }

  private requests: ProcurementRequest[] = loadFromStorage(
    PROCUREMENT_STORAGE_KEYS.REQUESTS,
    () => this.buildDefaultRequests(),
  );

  private buildDefaultRequests(): ProcurementRequest[] {
    return [
      {
        id: 1,
        customerId: 'CUST-101',
        customerName: 'HQ Corporate Operations',
        procurementType: 'PRODUCT',
        title: 'High-End Developer Laptops (M3 Max)',
        description: 'Procurement of 10 developer-grade laptops for the engineering department to support high-performance compiling.',
        items: [
          {
            id: 1,
            name: 'MacBook Pro 16"',
            description: 'M3 Max, 32GB RAM, 1TB SSD',
            quantity: 10,
            unit: 'Pieces',
            estimatedBudget: 15000000
          }
        ],
        totalBudget: 15000000,
        currency: 'NGN',
        status: 'PENDING',
        createdAt: new Date('2026-06-25'),
        createdBy: 'ADMIN',
        updatedAt: new Date('2026-06-25'),
        updatedBy: 'ADMIN',
        suggestedVendorIds: [],
        suggestedVendors: [],
        selectedVendorId: '',
        selectedVendorName: '',
        selectedQuotationId: '',
        approvalStatus: 'PENDING',
        approvedBy: '',
        approvedAt: new Date()
      },
      {
        id: 2,
        customerId: 'CUST-102',
        customerName: 'HQ Corporate Operations',
        procurementType: 'SERVICE',
        title: 'Janitorial & Corporate Cleaning Services',
        description: 'Monthly cleaning and facility sanitisation services contract for HQ operations.',
        items: [
          {
            id: 2,
            name: 'Office Cleaning Services',
            description: 'Daily sanitisation and general facility cleanup services',
            quantity: 6,
            unit: 'Months',
            estimatedBudget: 2400000
          }
        ],
        totalBudget: 2400000,
        currency: 'NGN',
        status: 'VENDORS_QUOTING',
        createdAt: new Date('2026-06-20'),
        createdBy: 'ADMIN',
        updatedAt: new Date('2026-06-20'),
        updatedBy: 'ADMIN',
        suggestedVendorIds: [],
        suggestedVendors: [],
        selectedVendorId: '',
        selectedVendorName: '',
        selectedQuotationId: '',
        approvalStatus: 'PENDING',
        approvedBy: '',
        approvedAt: new Date()
      },
      {
        id: 3,
        customerId: 'CUST-101',
        customerName: 'Marketing Department',
        procurementType: 'PRODUCT',
        title: 'Ergonomic Mesh Office Chairs',
        description: 'Procurement of ergonomic chairs to replace worn-out seating in the marketing and sales division.',
        items: [
          {
            id: 3,
            name: 'Ergonomic Desk Chair',
            description: 'Mesh back, adjustable armrests, and dynamic lumbar support',
            quantity: 25,
            unit: 'Pieces',
            estimatedBudget: 3500000
          }
        ],
        totalBudget: 3500000,
        currency: 'NGN',
        status: 'VENDOR_SELECTED',
        createdAt: new Date('2026-06-18'),
        createdBy: 'ADMIN',
        updatedAt: new Date('2026-06-18'),
        updatedBy: 'ADMIN',
        suggestedVendorIds: [],
        suggestedVendors: [],
        selectedVendorId: '',
        selectedVendorName: '',
        selectedQuotationId: '',
        approvalStatus: 'APPROVED',
        approvedBy: 'ADMIN',
        approvedAt: new Date()
      },
      {
        id: 4,
        customerId: 'CUST-103',
        customerName: 'IT Operations',
        procurementType: 'SERVICE',
        title: 'AWS Cloud Infrastructure Consulting',
        description: 'Migration services for transferring on-premise CRM tools to AWS Cloud Infrastructure.',
        items: [
          {
            id: 4,
            name: 'AWS Solutions Architecture Services',
            description: 'End-to-end audit, migration layout plan, and server deployment',
            quantity: 1,
            unit: 'Units',
            estimatedBudget: 12500000
          }
        ],
        totalBudget: 12500000,
        currency: 'NGN',
        status: 'LPO_ISSUED',
        createdAt: new Date('2026-06-10'),
        createdBy: 'ADMIN',
        updatedAt: new Date('2026-06-10'),
        updatedBy: 'ADMIN',
        suggestedVendorIds: [],
        suggestedVendors: [],
        selectedVendorId: '',
        selectedVendorName: '',
        selectedQuotationId: '',
        approvalStatus: 'APPROVED',
        approvedBy: 'ADMIN',
        approvedAt: new Date()
      },
      {
        id: 5,
        customerId: 'CUST-101',
        customerName: 'HQ Corporate Operations',
        procurementType: 'PRODUCT',
        title: 'Executive Ergonomic Desks',
        description: 'Procurement of premium height-adjustable executive desks for the management office.',
        items: [
          {
            id: 5,
            name: 'Premium Standing Desk',
            description: 'Dual-motor, steel frame, bamboo top executive standing desk',
            quantity: 15,
            unit: 'Pieces',
            estimatedBudget: 4500000
          }
        ],
        totalBudget: 4500000,
        currency: 'NGN',
        status: 'DELIVERED',
        createdAt: new Date('2026-06-12'),
        createdBy: 'ADMIN',
        updatedAt: new Date('2026-07-02'),
        updatedBy: 'ADMIN',
        suggestedVendorIds: [],
        suggestedVendors: [],
        selectedVendorId: 'VND-001',
        selectedVendorName: 'Apex Tech Distributors',
        selectedQuotationId: 'q-pr005',
        approvalStatus: 'APPROVED',
        approvedBy: 'ADMIN',
        approvedAt: new Date()
      }
    ];
  }

  private reloadRequests(): void {
    this.requests = loadFromStorage(
      PROCUREMENT_STORAGE_KEYS.REQUESTS,
      () => this.buildDefaultRequests(),
    );
  }

  private persistRequests(): void {
    saveToStorage(PROCUREMENT_STORAGE_KEYS.REQUESTS, this.requests);
  }

  // Orders removed — ProcurementRequest is the single source of truth

  getRequests(filters: RequestFilters): Observable<PaginatedResponse<ProcurementRequest>> {
    this.reloadRequests();
    let filtered = [...this.requests];

    if (filters.status && filters.status !== 'ALL') {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        String(r.id).toLowerCase().includes(term) ||
        r.title.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term)
      );
    }

    const page = filters.page || 0;
    const size = filters.size || 10;
    const totalElements = filtered.length;
    const totalPages = Math.ceil(totalElements / size);
    const paginatedData = filtered.slice(page * size, (page + 1) * size);

    const response: PaginatedResponse<ProcurementRequest> = {
      data: paginatedData,
      totalElements,
      totalPages,
      currentPage: page,
      pageSize: size
    };

    return of(response).pipe(delay(200));
  }

  getRequest(id: number): Observable<ProcurementRequest> {
    this.reloadRequests();
    const request = this.requests.find(r => r.id === id);
    if (!request) {
      return throwError(() => new Error(`Request not found: ${id}`));
    }
    return of(request).pipe(delay(100));
  }

  private generateNextId(): number {
    const ids = this.requests.map(r => r.id);
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return maxId + 1;
  }

  createRequest(request: Partial<ProcurementRequest>): Observable<ProcurementRequest> {
    const id = this.generateNextId();
    const newRequest: ProcurementRequest = {
      id,
      customerId: request.customerId || 'CUST-DEFAULT',
      customerName: request.customerName || 'General Operations',
      procurementType: request.procurementType || 'PRODUCT',
      title: request.title || 'Untitled Request',
      description: request.description || '',
      items: (request.items || []).map((item, idx) => ({
        ...item,
        id: item.id || (id * 100 + idx),
        name: item.name || 'Generic Item',
        description: item.description || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'Units',
        estimatedBudget: item.estimatedBudget || 0
      })),
      totalBudget: request.totalBudget || 0,
      currency: request.currency || 'NGN',
      status: request.status || 'PENDING',
      createdAt: new Date(),
      createdBy: request.createdBy || 'ADMIN',
      updatedAt: new Date(),
      updatedBy: request.updatedBy || 'ADMIN',
      suggestedVendorIds: request.suggestedVendorIds || [],
      suggestedVendors: request.suggestedVendors || [],
      selectedVendorId: request.selectedVendorId || '',
      selectedVendorName: request.selectedVendorName || '',
      selectedQuotationId: request.selectedQuotationId || '',
      approvalStatus: request.approvalStatus || 'PENDING',
      approvedBy: request.approvedBy || '',
      approvedAt: request.approvedAt || new Date()
    };

    this.requests.unshift(newRequest);
    this.persistRequests();
    this.syncRfqMirror(newRequest);
    return of(newRequest).pipe(delay(200));
  }

  updateRequest(id: number, request: Partial<ProcurementRequest>): Observable<ProcurementRequest> {
    const idx = this.requests.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.requests[idx] = { ...this.requests[idx], ...request, updatedAt: new Date() };
      this.persistRequests();
      this.syncRfqMirror(this.requests[idx]);
      return of(this.requests[idx]).pipe(delay(100));
    }
    throw new Error(`Request not found: ${id}`);
  }

  cancelRequest(id: number, reason: string): Observable<void> {
    const request = this.requests.find(r => r.id === id);
    if (request) {
      request.status = 'CANCELLED';
      request.cancellationReason = reason;
      request.cancelledAt = new Date();
      this.persistRequests();
      this.syncRfqMirror(request);
    }
    return of(undefined).pipe(delay(100));
  }

  deleteRequest(id: number): Observable<void> {
    this.requests = this.requests.filter(r => r.id !== id);
    this.persistRequests();
    return of(undefined).pipe(delay(100));
  }

  getSavedVendorRating(requestId: number, vendorId: string): any {
    return { rating: 4.5, count: 12 };
  }

  getRFQTemplates(): Observable<RFQTemplate[]> {
    const templates: RFQTemplate[] = [
      {
        id: 'TPL-001',
        name: 'Standard Goods RFQ',
        description: 'Template for general goods and equipment',
        layout: 'STANDARD',
        sections: [],
        isDefault: true,
        createdBy: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'TPL-002',
        name: 'Professional Services RFQ',
        description: 'Template for contracting services',
        layout: 'DETAILED',
        sections: [],
        isDefault: false,
        createdBy: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    return of(templates);
  }

  getRFQTemplate(id: string): Observable<RFQTemplate> {
    return of({
      id,
      name: 'Sample Template',
      description: 'Mock template description',
      layout: 'STANDARD',
      sections: [],
      isDefault: true,
      createdBy: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  getVendorSuggestions(requestId: number): Observable<VendorSuggestion[]> {
    const suggestions: VendorSuggestion[] = [
      {
        id: 1,
        vendorId: 'VND-001',
        vendorName: 'Apex Tech Distributors',
        vendorCode: 'VND-APX',
        categories: ['Technology'],
        rating: 4.8,
        reviews: ['Excellent service', 'Fast delivery'],
        totalProjects: 30,
        completionRate: 98,
        averageResponseTime: 2.4,
        matchScore: 95,
        isRecommended: true,
        reason: 'Authorized dealer with highly competitive prices'
      },
      {
        id: 2,
        vendorId: 'VND-002',
        vendorName: 'Lagos Clean Services',
        vendorCode: 'VND-LCS',
        categories: ['Cleaning'],
        rating: 4.5,
        reviews: ['Good quality', 'Reliable'],
        totalProjects: 15,
        completionRate: 92,
        averageResponseTime: 4.1,
        matchScore: 90,
        isRecommended: false,
        reason: 'Reliable supplier'
      }
    ];
    return of(suggestions);
  }

  uploadAttachment(requestId: string, file: File): Observable<{ attachmentId: string; url: string }> {
    return of({
      attachmentId: `ATT-${Math.random().toString(36).substring(2, 9)}`,
      url: URL.createObjectURL(file)
    }).pipe(delay(300));
  }

  getCategories(): Observable<string[]> {
    return of(['PRODUCT', 'SERVICE']);
  }

  getProcurementCategories(): Observable<ProcurementCategory[]> {
    const categories: ProcurementCategory[] = [
      { id: 1, categoryId: 'CAT-001', name: 'IT & Electronics', description: 'Computers, hardware, peripherals, and office gadgets' },
      { id: 2, categoryId: 'CAT-002', name: 'Office Furniture & Fixtures', description: 'Chairs, desks, conference tables, and storage' },
      { id: 3, categoryId: 'CAT-003', name: 'Stationery & Office Supplies', description: 'Paper, pens, toner, and general office consumables' },
      { id: 4, categoryId: 'CAT-004', name: 'Industrial & Maintenance', description: 'Tools, spare parts, cleaning supplies, and machinery' },
      { id: 5, categoryId: 'CAT-005', name: 'Professional & Advisory Services', description: 'Consulting, auditing, legal, and advisory services' },
      { id: 6, categoryId: 'CAT-006', name: 'Logistics, Freight & Transport', description: 'Freight, courier, fleet management, and shipping' },
      { id: 7, categoryId: 'CAT-007', name: 'Facility Operations & Utilities', description: 'HVAC, security systems, cleaning, and maintenance' }
    ];
    return of(categories);
  }
}
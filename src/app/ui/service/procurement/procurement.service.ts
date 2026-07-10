import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { 
  ProcurementRequest, 
  RequestFilters, 
  PaginatedResponse, 
  MasterOrder,
  RFQTemplate,
  VendorSuggestion,
  ProcurementType,
  RequestStatus,
  OrderItem,
  RFQTemplateSection
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
    const alreadyShared = this.vendorService.getRfqsSnapshot().some(r => r.id === request.id);
    if (requestIsVendorVisible(request.status) || alreadyShared) {
      this.vendorService.upsertExternalRfq(procurementRequestToRfq(request));
    }
  }

  private requests: ProcurementRequest[] = loadFromStorage(
    PROCUREMENT_STORAGE_KEYS.REQUESTS,
    () => this.buildDefaultRequests(),
  );

  private orders: MasterOrder[] = loadFromStorage(
    PROCUREMENT_STORAGE_KEYS.ORDERS,
    () => this.buildDefaultOrders(),
  );

  private buildDefaultOrders(): MasterOrder[] {
    return [
    {
      id: 'MO-001',
      customerId: 'CUST-101',
      customerName: 'HQ Corporate Operations',
      orderName: 'Q3 Corporate Facility Upgrades',
      totalBudget: 18500000,
      currency: 'NGN',
      masterDeliveryLocation: 'HQ Office, Lekki Phase 1, Lagos',
      masterDeliveryDeadline: new Date('2026-08-15'),
      status: 'PENDING_VENDOR_QUOTES',
      rfqExpiryDate: new Date('2026-07-15'),
      items: [
        {
          id: 'oi-1',
          productName: 'Premium Ergonomic Chairs',
          description: 'High quality ergonomic mesh desk chairs',
          quantity: 50,
          budget: 10000000,
          currency: 'NGN',
          deliveryLocation: 'HQ Office, Lekki Phase 1, Lagos'
        },
        {
          id: 'oi-2',
          productName: 'Modular Conference Tables',
          description: 'Wooden conference table with cable management',
          quantity: 5,
          budget: 8500000,
          currency: 'NGN',
          deliveryLocation: 'HQ Office, Lekki Phase 1, Lagos'
        }
      ],
      createdAt: new Date('2026-06-15'),
      updatedAt: new Date('2026-06-15')
    }
    ];
  }

  private buildDefaultRequests(): ProcurementRequest[] {
    return [
      {
        id: 'PR-001',
        customerId: 'CUST-101',
        customerName: 'HQ Corporate Operations',
        procurementType: 'PRODUCT',
        title: 'High-End Developer Laptops (M3 Max)',
        description: 'Procurement of 10 developer-grade laptops for the engineering department to support high-performance compiling.',
        items: [
          {
            id: 'item-1',
            name: 'MacBook Pro 16"',
            description: 'M3 Max, 32GB RAM, 1TB SSD',
            quantity: 10,
            unit: 'Pieces',
            estimatedBudget: 15000000,
            attachments: []
          }
        ],
        totalBudget: 15000000,
        currency: 'NGN',
        deliveryLocation: 'HQ Office, Lekki Phase 1, Lagos',
        deliveryDeadline: new Date('2026-07-20'),
        status: 'PENDING',
        attachments: [],
        createdAt: new Date('2026-06-25'),
        updatedAt: new Date('2026-06-25'),
        selectedVendorId: ''
      },
      {
        id: 'PR-002',
        customerId: 'CUST-102',
        customerName: 'HQ Corporate Operations',
        procurementType: 'SERVICE',
        title: 'Janitorial & Corporate Cleaning Services',
        description: 'Monthly cleaning and facility sanitisation services contract for HQ operations.',
        items: [
          {
            id: 'item-2',
            name: 'Office Cleaning Services',
            description: 'Daily sanitisation and general facility cleanup services',
            quantity: 6,
            unit: 'Months',
            estimatedBudget: 2400000,
            attachments: []
          }
        ],
        totalBudget: 2400000,
        currency: 'NGN',
        deliveryLocation: 'HQ Office, Lekki Phase 1, Lagos',
        deliveryDeadline: new Date('2026-12-31'),
        status: 'VENDORS_QUOTING',
        attachments: [],
        createdAt: new Date('2026-06-20'),
        updatedAt: new Date('2026-06-20'),
        selectedVendorId: ''
      },
      {
        id: 'PR-003',
        customerId: 'CUST-101',
        customerName: 'Marketing Department',
        procurementType: 'PRODUCT',
        title: 'Ergonomic Mesh Office Chairs',
        description: 'Procurement of ergonomic chairs to replace worn-out seating in the marketing and sales division.',
        items: [
          {
            id: 'item-3',
            name: 'Ergonomic Desk Chair',
            description: 'Mesh back, adjustable armrests, and dynamic lumbar support',
            quantity: 25,
            unit: 'Pieces',
            estimatedBudget: 3500000,
            attachments: []
          }
        ],
        totalBudget: 3500000,
        currency: 'NGN',
        deliveryLocation: 'HQ Office, Lekki Phase 1, Lagos',
        deliveryDeadline: new Date('2026-07-15'),
        status: 'VENDOR_SELECTED',
        attachments: [],
        createdAt: new Date('2026-06-18'),
        updatedAt: new Date('2026-06-18'),
        selectedVendorId: ''
      },
      {
        id: 'PR-004',
        customerId: 'CUST-103',
        customerName: 'IT Operations',
        procurementType: 'SERVICE',
        title: 'AWS Cloud Infrastructure Consulting',
        description: 'Migration services for transferring on-premise CRM tools to AWS Cloud Infrastructure.',
        items: [
          {
            id: 'item-4',
            name: 'AWS Solutions Architecture Services',
            description: 'End-to-end audit, migration layout plan, and server deployment',
            quantity: 1,
            unit: 'Units',
            estimatedBudget: 12500000,
            attachments: []
          }
        ],
        totalBudget: 12500000,
        currency: 'NGN',
        deliveryLocation: 'Remote / Virtual Deployment',
        deliveryDeadline: new Date('2026-09-30'),
        status: 'LPO_ISSUED',
        attachments: [],
        createdAt: new Date('2026-06-10'),
        updatedAt: new Date('2026-06-10'),
        selectedVendorId: ''
      },
      {
        id: 'PR-005',
        customerId: 'CUST-101',
        customerName: 'HQ Corporate Operations',
        procurementType: 'PRODUCT',
        title: 'Executive Ergonomic Desks',
        description: 'Procurement of premium height-adjustable executive desks for the management office.',
        items: [
          {
            id: 'item-5',
            name: 'Premium Standing Desk',
            description: 'Dual-motor, steel frame, bamboo top executive standing desk',
            quantity: 15,
            unit: 'Pieces',
            estimatedBudget: 4500000,
            attachments: []
          }
        ],
        totalBudget: 4500000,
        currency: 'NGN',
        deliveryLocation: 'HQ Office, Lekki Phase 1, Lagos',
        deliveryDeadline: new Date('2026-08-15'),
        status: 'DELIVERED',
        attachments: [],
        createdAt: new Date('2026-06-12'),
        updatedAt: new Date('2026-07-02'),
        selectedVendorId: 'VND-001',
        selectedVendorName: 'Apex Tech Distributors',
        selectedQuotationId: 'q-pr005'
      }
    ];
  }

  private persistRequests(): void {
    saveToStorage(PROCUREMENT_STORAGE_KEYS.REQUESTS, this.requests);
  }

  private persistOrders(): void {
    saveToStorage(PROCUREMENT_STORAGE_KEYS.ORDERS, this.orders);
  }

  getRequests(filters: RequestFilters): Observable<PaginatedResponse<ProcurementRequest>> {
    let filtered = [...this.requests];

    if (filters.status && filters.status !== 'ALL') {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.id.toLowerCase().includes(term) ||
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

  getRequest(id: string): Observable<ProcurementRequest> {
    const request = this.requests.find(r => r.id === id);
    if (!request) {
      return throwError(() => new Error(`Request not found: ${id}`));
    }
    return of(request).pipe(delay(100));
  }

  private generateNextId(): string {
    const numericIds = this.requests
      .map(r => r.id)
      .filter(id => id.startsWith('PR-'))
      .map(id => parseInt(id.replace('PR-', ''), 10))
      .filter(num => !isNaN(num));
    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
    const nextId = maxId + 1;
    return `PR-${String(nextId).padStart(3, '0')}`;
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
        id: item.id || `item-gen-${idx}`,
        name: item.name || 'Generic Item',
        description: item.description || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'Units',
        estimatedBudget: item.estimatedBudget || 0,
        attachments: item.attachments || []
      })),
      totalBudget: request.totalBudget || 0,
      currency: request.currency || 'NGN',
      deliveryLocation: request.deliveryLocation || 'Office HQ',
      deliveryDeadline: request.deliveryDeadline ? new Date(request.deliveryDeadline) : new Date(),
      status: request.status || 'PENDING',
      attachments: request.attachments || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      selectedVendorId: ''
    };

    this.requests.unshift(newRequest);
    this.persistRequests();
    this.syncRfqMirror(newRequest);
    return of(newRequest).pipe(delay(200));
  }

  updateRequest(id: string, request: Partial<ProcurementRequest>): Observable<ProcurementRequest> {
    const idx = this.requests.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.requests[idx] = { ...this.requests[idx], ...request, updatedAt: new Date() };
      this.persistRequests();
      this.syncRfqMirror(this.requests[idx]);
      return of(this.requests[idx]).pipe(delay(100));
    }
    throw new Error(`Request not found: ${id}`);
  }

  cancelRequest(id: string, reason: string): Observable<void> {
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

  deleteRequest(id: string): Observable<void> {
    this.requests = this.requests.filter(r => r.id !== id);
    this.persistRequests();
    return of(undefined).pipe(delay(100));
  }

  getOrders(): Observable<MasterOrder[]> {
    return of(this.orders).pipe(delay(200));
  }

  getOrder(id: string): Observable<MasterOrder> {
    const order = this.orders.find(o => o.id === id);
    if (!order) {
      throw new Error(`Order not found: ${id}`);
    }
    return of(order).pipe(delay(100));
  }

  getSavedVendorRating(requestId: string, vendorId: string): any {
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

  getVendorSuggestions(requestId: string): Observable<VendorSuggestion[]> {
    const suggestions: VendorSuggestion[] = [
      {
        vendorId: 'VND-001',
        vendorName: 'Apex Tech Distributors',
        vendorCode: 'VND-APX',
        categories: ['Technology'],
        rating: 4.8,
        totalProjects: 30,
        completionRate: 98,
        averageResponseTime: 2.4,
        matchScore: 95,
        isRecommended: true,
        reason: 'Authorized dealer with highly competitive prices'
      },
      {
        vendorId: 'VND-002',
        vendorName: 'Lagos Clean Services',
        vendorCode: 'VND-LCS',
        categories: ['Cleaning'],
        rating: 4.5,
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
}
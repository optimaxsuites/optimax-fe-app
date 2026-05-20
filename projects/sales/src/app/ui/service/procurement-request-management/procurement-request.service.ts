import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { ProcurementRequest, RequestFilters, PaginatedResponse, RequestStatus } from '../../domain/procurement-request/procurement-request.dto';

@Injectable({
  providedIn: 'root'
})
export class ProcurementRequestService {

  // Mock data - replace with actual API calls later
  private mockRequests: ProcurementRequest[] = [
    {
      id: 'REQ-001',
      customerId: 'CUST-001',
      customerName: 'LagosLoop (logistics tech)',
      productName: 'Office Laptops',
      description: '15 high-performance laptops for accounting department',
      quantity: 15,
      budget: 22500,
      currency: 'NGN',
      deliveryLocation: 'Lagos, Nigeria',
      deliveryDeadline: new Date('2026-06-15'),
      status: 'VENDORS_QUOTING',
      attachments: [],
      createdAt: new Date('2026-05-10'),
      updatedAt: new Date('2026-05-10')
    },
    {
      id: 'REQ-002',
      customerId: 'CUST-001',
      customerName: 'PadiPay (fintech)',
      productName: 'Office Chairs',
      description: '30 ergonomic office chairs',
      quantity: 30,
      budget: 4500,
      currency: 'NGN',
      deliveryLocation: 'Lagos, Nigeria',
      deliveryDeadline: new Date('2026-05-30'),
      status: 'VENDOR_SELECTED',
      attachments: [],
      createdAt: new Date('2026-05-05'),
      updatedAt: new Date('2026-05-12'),
      selectedVendorId: 'VEND-001',
      selectedVendorName: 'Furniture Hub Ltd'
    },
    {
      id: 'REQ-003',
      customerId: 'CUST-001',
      customerName: 'Mary Adeleke Enterprises',
      productName: 'Printer Cartridges',
      description: '50 units of HP laser toner cartridges',
      quantity: 50,
      budget: 1250,
      currency: 'NGN',
      deliveryLocation: 'Lagos, Nigeria',
      deliveryDeadline: new Date('2026-05-20'),
      status: 'DELIVERED',
      attachments: [],
      createdAt: new Date('2026-04-25'),
      updatedAt: new Date('2026-05-18'),
      selectedVendorId: 'VEND-002',
      selectedVendorName: 'Office Supplies NG'
    },
    {
      id: 'REQ-004',
      customerId: 'CUST-001',
      customerName: 'AfriByte Solutions (software dev)',
      productName: 'Network Switches',
      description: '10 Cisco network switches',
      quantity: 10,
      budget: 8000,
      currency: 'NGN',
      deliveryLocation: 'Abuja, Nigeria',
      deliveryDeadline: new Date('2026-06-01'),
      status: 'PENDING',
      attachments: [],
      createdAt: new Date('2026-05-15'),
      updatedAt: new Date('2026-05-15')
    },
    {
      id: 'REQ-005',
      customerId: 'CUST-001',
      customerName: 'Ziko Mart (convenience store)',
      productName: 'Standing Desks',
      description: '20 adjustable standing desks',
      quantity: 20,
      budget: 6000,
      currency: 'NGN',
      deliveryLocation: 'Lagos, Nigeria',
      deliveryDeadline: new Date('2026-05-25'),
      status: 'CANCELLED',
      attachments: [],
      createdAt: new Date('2026-04-28'),
      updatedAt: new Date('2026-05-02'),
      cancellationReason: 'Budget reallocation'
    }
  ];

  getRequests(filters: RequestFilters): Observable<PaginatedResponse<ProcurementRequest>> {
    // Simulate API delay
    return of(this.getPaginatedMockData(filters)).pipe(delay(500));
  }

  getRequestById(id: string): Observable<ProcurementRequest | undefined> {
    return of(this.mockRequests.find(req => req.id === id)).pipe(delay(300));
  }

  cancelRequest(id: string, reason: string): Observable<ProcurementRequest> {
    const request = this.mockRequests.find(req => req.id === id);
    if (request) {
      request.status = 'CANCELLED';
      request.cancellationReason = reason;
      request.cancelledAt = new Date();
      request.updatedAt = new Date();
    }
    return of(request!).pipe(delay(500));
  }

  createRequest(requestData: any): Observable<ProcurementRequest> {
  const newRequest: ProcurementRequest = {
    id: `REQ-${Math.floor(Math.random() * 1000)}`,
    customerId: requestData.customerId,
    customerName: requestData.customerName,
    productName: requestData.productName,
    description: requestData.description,
    quantity: requestData.quantity,
    budget: requestData.budget,
    currency: requestData.currency,
    deliveryLocation: requestData.deliveryLocation,
    deliveryDeadline: new Date(requestData.deliveryDeadline),
    status: 'PENDING',
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  this.mockRequests.unshift(newRequest);
  return of(newRequest).pipe(delay(500));
}


  private getPaginatedMockData(filters: RequestFilters): PaginatedResponse<ProcurementRequest> {
    let filteredData = [...this.mockRequests];

    // Apply status filter
    if (filters.status && filters.status !== 'ALL') {
      filteredData = filteredData.filter(req => req.status === filters.status);
    }

    // Apply search filter
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const search = filters.searchTerm.toLowerCase();
      filteredData = filteredData.filter(req => 
        req.id.toLowerCase().includes(search) ||
        req.productName.toLowerCase().includes(search) ||
        req.description.toLowerCase().includes(search)
      );
    }

    // Apply date filters
    if (filters.dateFrom) {
      filteredData = filteredData.filter(req => new Date(req.createdAt) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      filteredData = filteredData.filter(req => new Date(req.createdAt) <= filters.dateTo!);
    }

    // Pagination
    const start = filters.page * filters.size;
    const end = start + filters.size;
    const paginatedData = filteredData.slice(start, end);

    return {
      data: paginatedData,
      totalElements: filteredData.length,
      totalPages: Math.ceil(filteredData.length / filters.size),
      currentPage: filters.page,
      pageSize: filters.size
    };
  }
}
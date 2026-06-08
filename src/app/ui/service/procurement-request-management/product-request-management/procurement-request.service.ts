import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { ProcurementRequest, RequestFilters, PaginatedResponse, RequestStatus, MasterOrder, MasterOrderStatus } from '../../../domain/procurement-request/product-requests/product-requests.dto';

export interface VendorRatingSummary {
  vendorId: string;
  vendorName: string;
  requestId: string;
  productName: string;
  overallRating: number;
  communicationRating: number;
  deliveryRating: number;
  qualityRating: number;
  valueRating: number;
  review: string;
  pros?: string[];
  cons?: string[];
  wouldRecommend: boolean;
  tags?: string[];
  anonymous?: boolean;
  submittedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProcurementRequestService {

  private getRatingStorageKey(requestId: string, vendorId: string): string {
    return `vendor-rating:${requestId}:${vendorId}`;
  }

  private mockOrders: MasterOrder[] = [
  {
    id: 'ORD-0001',
    customerId: 'CUST-001',
    customerName: 'LagosLoop (logistics tech)',
    orderName: 'Q2 Office Equipment Bundle',
    projectName: 'Office Upgrade Q2',
    departmentName: 'Operations',
    items: [
      {
        id: 'ITEM-1',
        productName: 'Mechanical Keyboards',
        description: 'Cherry MX Blue switches, full size',
        quantity: 20,
        budget: 3000,
        currency: 'NGN',
        deliveryLocation: 'Lagos, Nigeria',
        specialInstructions: 'Include wrist rests'
      },
      {
        id: 'ITEM-2',
        productName: 'Monitor Stands',
        description: 'Adjustable dual-monitor stands',
        quantity: 20,
        budget: 2400,
        currency: 'NGN',
        deliveryLocation: 'Lagos, Nigeria',
        specialInstructions: ''
      },
      {
        id: 'ITEM-3',
        productName: 'USB-C Hubs',
        description: '7-port USB-C hubs with power delivery',
        quantity: 30,
        budget: 1500,
        currency: 'NGN',
        deliveryLocation: 'Lagos, Nigeria',
        specialInstructions: ''
      }
    ],
    totalBudget: 6900,
    currency: 'NGN',
    masterDeliveryLocation: 'Lagos, Nigeria',
    masterDeliveryDeadline: new Date('2026-07-10'),
    masterSpecialInstructions: 'Deliver together in one shipment',
    selectedVendors: [],
    rfqExpiryDate: new Date('2026-06-20'),
    vendorTargetingType: 'ALL_VENDORS',  // ← ADD THIS
    status: 'PENDING_VENDOR_QUOTES',
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-01')
  },
  {
    id: 'ORD-0002',
    customerId: 'CUST-001',
    customerName: 'PadiPay (fintech)',
    orderName: 'Server Room Upgrade',
    projectName: 'Infrastructure Upgrade',
    departmentName: 'IT',
    items: [
      {
        id: 'ITEM-1',
        productName: 'Rack-mount Servers',
        description: '2U rack servers, 64GB RAM',
        quantity: 4,
        budget: 32000,
        currency: 'NGN',
        deliveryLocation: 'Abuja, Nigeria',
        specialInstructions: 'Fragile — white-glove delivery required'
      },
      {
        id: 'ITEM-2',
        productName: 'Cat6 Ethernet Cables',
        description: '50m spools, shielded',
        quantity: 10,
        budget: 500,
        currency: 'NGN',
        deliveryLocation: 'Abuja, Nigeria',
        specialInstructions: ''
      }
    ],
    totalBudget: 32500,
    currency: 'NGN',
    masterDeliveryLocation: 'Abuja, Nigeria',
    masterDeliveryDeadline: new Date('2026-07-25'),
    masterSpecialInstructions: '',
    selectedVendors: [],
    rfqExpiryDate: new Date('2026-06-25'),
    vendorTargetingType: 'SELECTED_VENDORS',  // ← ADD THIS
    status: 'VENDOR_SELECTION_IN_PROGRESS',
    createdAt: new Date('2026-05-20'),
    updatedAt: new Date('2026-05-22')
  }
];

  // Mock data - replace with actual API calls later
  private mockRequests: ProcurementRequest[] = [
    {
      id: 'REQ-TRACKMAP',
      customerId: 'CUST-TEST',
      customerName: 'Test Company',
      productName: 'Demo Product for Tracking',
      description: 'This request is for testing the delivery tracking map view.',
      quantity: 1,
      budget: 1000,
      currency: 'NGN',
      deliveryLocation: 'Test Address, Lagos, Nigeria',
      deliveryDeadline: new Date('2026-06-10'),
      status: 'DELIVERY_IN_PROGRESS',
      attachments: [],
      createdAt: new Date('2026-05-28'),
      updatedAt: new Date('2026-05-29'),
      selectedVendorId: 'VEND-TEST',
      selectedVendorName: 'Test Vendor',
    },
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

  constructor() {
    this.loadRequestsFromStorage();
    this.loadOrdersFromStorage();
  }

  saveRequests(): void {
    this.saveRequestsToStorage();
  }

  saveOrders(): void {
    this.saveOrdersToStorage();
  }

  private loadRequestsFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('erp_requests');
      if (stored) {
        try {
          this.mockRequests = JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse requests from localStorage', e);
        }
      } else {
        this.saveRequestsToStorage();
      }
    }
  }

  private saveRequestsToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('erp_requests', JSON.stringify(this.mockRequests));
    }
  }

  private loadOrdersFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('erp_orders');
      if (stored) {
        try {
          this.mockOrders = JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse orders from localStorage', e);
        }
      } else {
        this.saveOrdersToStorage();
      }
    }
  }

  private saveOrdersToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('erp_orders', JSON.stringify(this.mockOrders));
    }
  }

  getRequests(filters: RequestFilters): Observable<PaginatedResponse<ProcurementRequest>> {
    // Simulate API delay
    return of(this.getPaginatedMockData(filters)).pipe(delay(500));
  }

  getRequestById(id: string): Observable<ProcurementRequest | undefined> {
    return of(this.mockRequests.find(req => req.id === id)).pipe(delay(300));
  }

  cancelRequest(id: string, reason: string, additionalNotes?: string): Observable<ProcurementRequest> {
  const request = this.mockRequests.find(req => req.id === id);
  if (request) {
    request.status = 'CANCELLED';
    request.cancellationReason = reason;
    request.cancellationAdditionalNotes = additionalNotes;
    request.cancelledAt = new Date();
    request.updatedAt = new Date();
    this.saveRequestsToStorage();
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
    status: requestData.status || 'PENDING_APPROVAL',
    attachments: requestData.attachments || [],
    projectName: requestData.projectName || '',
    departmentName: requestData.departmentName || '',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  this.mockRequests.unshift(newRequest);
  this.saveRequestsToStorage();
  return of(newRequest).pipe(delay(500));
}

createMasterOrder(orderData: any): Observable<{ id: string }> {
  const id = `ORD-${Math.floor(Math.random() * 9000) + 1000}`;
  const items: any[] = Array.isArray(orderData.items) ? orderData.items : [];
  const totalBudget = items.reduce((sum: number, item: any) => sum + (Number(item.budget) || 0), 0);

  const order: MasterOrder = {
    id,
    customerId: orderData.customerId || 'CUST-001',
    customerName: orderData.customerName || 'Unknown',
    orderName: orderData.orderName,
    projectName: orderData.projectName || '',
    departmentName: orderData.departmentName || '',
    items: items.map((item: any, idx: number) => ({
      id: `ITEM-${idx + 1}`,
      productName: item.productName,
      description: item.description,
      quantity: item.quantity,
      budget: item.budget,
      currency: item.currency || orderData.currency || 'NGN',
      deliveryLocation: item.deliveryLocation || orderData.masterDeliveryLocation,
      specialInstructions: item.specialInstructions || '',
      attachments: item.attachments || []  // ← ADD THIS to preserve attachments
    })),
    totalBudget,
    currency: orderData.currency || 'NGN',
    masterDeliveryLocation: orderData.masterDeliveryLocation,
    masterDeliveryDeadline: new Date(orderData.masterDeliveryDeadline),
    masterSpecialInstructions: orderData.masterSpecialInstructions,
    selectedVendors: orderData.selectedVendors || [],
    rfqExpiryDate: new Date(orderData.rfqExpiryDate),
    vendorTargetingType: orderData.vendorTargetingType || 'ALL_VENDORS',  // ← ADD THIS
    status: orderData.status || 'PENDING_APPROVAL' as MasterOrderStatus,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  this.mockOrders.unshift(order);
  this.saveOrdersToStorage();
  return of({ id }).pipe(delay(500));
}

getOrders(): Observable<MasterOrder[]> {
  return of([...this.mockOrders]).pipe(delay(300));
}

getOrderById(id: string): Observable<MasterOrder | undefined> {
  return of(this.mockOrders.find(o => o.id === id)).pipe(delay(300));
}

updateRequest(id: string, updateData: any): Observable<ProcurementRequest> {
  const request = this.mockRequests.find(req => req.id === id);
  if (request) {
    Object.assign(request, updateData);
    if (updateData.removedAttachments && Array.isArray(updateData.removedAttachments)) {
      request.attachments = (request.attachments || []).filter(
        a => !updateData.removedAttachments.includes(a.id)
      );
    }
    request.updatedAt = new Date();
    this.saveRequestsToStorage();
  }
  return of(request!).pipe(delay(500));
}

  getSavedVendorRating(requestId: string, vendorId?: string): VendorRatingSummary | null {
    if (!vendorId || typeof localStorage === 'undefined') {
      return null;
    }

    const rawRating = localStorage.getItem(this.getRatingStorageKey(requestId, vendorId));
    if (!rawRating) {
      return null;
    }

    try {
      return JSON.parse(rawRating) as VendorRatingSummary;
    } catch (error) {
      console.error('Error parsing saved vendor rating:', error);
      return null;
    }
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


updateRequestStatus(id: string, status: RequestStatus): Observable<ProcurementRequest> {
  const request = this.mockRequests.find(r => r.id === id);
  if (request) {
    request.status = status;
    request.updatedAt = new Date();
    this.saveRequestsToStorage();
  }
  return of(request!).pipe(delay(500));
}

updateOrderStatus(id: string, status: MasterOrderStatus): Observable<MasterOrder> {
  const order = this.mockOrders.find(o => o.id === id);
  if (order) {
    order.status = status;
    order.updatedAt = new Date();
    this.saveOrdersToStorage();
  }
  return of(order!).pipe(delay(500));
}

sendRFQToVendors(requestId: string): Observable<any> {
  // Notify vendors that a new RFQ is available
  console.log(`RFQ sent to vendors for request ${requestId}`);
  return of({ success: true }).pipe(delay(500));
}

notifyCustomerOfRejection(requestId: string, reason: string): Observable<any> {
  // Send email/in-app notification to customer
  console.log(`Customer notified of rejection for request ${requestId}: ${reason}`);
  return of({ success: true }).pipe(delay(500));
}


}
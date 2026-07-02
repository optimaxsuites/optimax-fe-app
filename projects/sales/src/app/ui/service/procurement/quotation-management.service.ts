// quotation-management.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { VendorQuotation, RFQWithQuotations, VendorQuotationStatus } from '../../domain/procurement-request/procurement.dto';

@Injectable({
  providedIn: 'root'
})
export class QuotationManagementService {
  private apiUrl = '/api/procurement';

  constructor(private http: HttpClient) {}

  // Get all quotations for an RFQ
  getQuotationsForRFQ(rfqId: string): Observable<RFQWithQuotations> {
    return this.http.get<RFQWithQuotations>(`${this.apiUrl}/rfq/${rfqId}/quotations`);
  }

  // Get detailed quotation by ID
  getQuotationDetail(quotationId: string): Observable<VendorQuotation> {
    return this.http.get<VendorQuotation>(`${this.apiUrl}/quotations/${quotationId}`);
  }

  // Accept a quotation
  acceptQuotation(quotationId: string, notes?: string): Observable<{ lpoId: string; message: string }> {
    return this.http.post<{ lpoId: string; message: string }>(`${this.apiUrl}/quotations/${quotationId}/accept`, { notes });
  }

  // Reject a quotation
  rejectQuotation(quotationId: string, reason: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/quotations/${quotationId}/reject`, { reason });
  }

  // Cancel pending quotation (vendor hasn't responded)
  cancelPendingQuotation(rfqId: string, vendorId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/rfq/${rfqId}/vendors/${vendorId}/cancel`, {});
  }

  // Get all quotations dashboard
  getQuotationsDashboard(filters?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/quotations/dashboard`, { params: filters });
  }

  // Mark quotation as viewed
  markAsViewed(quotationId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/quotations/${quotationId}/view`, {});
  }
}
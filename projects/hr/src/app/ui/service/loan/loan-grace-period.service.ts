// advance-grace-period.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment';
import { fetchAllPages } from './paginated-fetch.util';

export interface GracePeriodRequest {
  id?: number;
  loanId: number;
  employeeId: number;
  installmentNumber: number;
  paymentSubtype: 'PRINCIPAL_REPAYMENT' | 'INTEREST_PAYMENT' | 'LATE_FEE';
  amountPaid: number;
  remainingBalance: number;
  requestedAt: string;
  requestedDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  reviewedAt?: string;
  reviewedBy?: number | { id: number; fullname: string; userId?: number; email?: string; username?: string; };
  reviewNote?: string;
  rejectionReason?: string;
  approvedGraceDays?: number;
  newDueDate?: string;
  paymentCompletedAt?: string;
}

export interface CreateGracePeriodRequestPayload {
  loanId: number;
  employeeId: number;
  installmentNumber: number;
  paymentSubtype: 'PRINCIPAL_REPAYMENT' | 'INTEREST_PAYMENT' | 'LATE_FEE';
  requestedDays: number;
  reason: string;
}

@Injectable({ providedIn: 'root' })
export class AdvanceGracePeriodService {
  private readonly baseUrl = `${environment.apiBaseUrl}/x/api/v2/hr/advanceGracePeriodRequests`;

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = sessionStorage.getItem('token');
    const tenantId = 'optimax';
    return {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
      'Content-Type': 'application/json'
    };
  }

  /** All matching requests across every page, or just `params.page` when one is given. */
  getAllRequests(params?: { page?: number; size?: number; loanId?: number; status?: string }): Observable<GracePeriodRequest[]> {
    const fetchPage = (page: number) => {
      let httpParams = new HttpParams().set('page', page.toString());
      if (params?.size) httpParams = httpParams.set('size', params.size.toString());
      if (params?.loanId) httpParams = httpParams.set('loanId', params.loanId.toString());
      if (params?.status) httpParams = httpParams.set('status', params.status);

      return this.http.get<unknown>(this.baseUrl, {
        headers: this.getHeaders(),
        params: httpParams
      }).pipe(map(res => this.safeParseResponse(res)));
    };

    if (params?.page) {
      return fetchPage(params.page).pipe(map((res) => (Array.isArray(res) ? res : res?.content || []) as GracePeriodRequest[]));
    }
    return fetchAllPages<GracePeriodRequest>(fetchPage);
  }

  getRequestById(id: number): Observable<GracePeriodRequest> {
    return this.http.get<GracePeriodRequest>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  getRequestsByLoanId(loanId: number): Observable<GracePeriodRequest[]> {
    return this.getAllRequests({ loanId });
  }

  createRequest(payload: CreateGracePeriodRequestPayload): Observable<GracePeriodRequest> {
    const requestBody = {
      ...payload,
      requestedAt: new Date().toISOString(),
      status: 'PENDING',
      amountPaid: 0,
      remainingBalance: 0
    };

    return this.http.post<GracePeriodRequest>(this.baseUrl, requestBody, {
      headers: this.getHeaders()
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  updateRequest(id: number, payload: Partial<GracePeriodRequest>): Observable<GracePeriodRequest> {
    return this.http.put<GracePeriodRequest>(`${this.baseUrl}/${id}`, payload, {
      headers: this.getHeaders()
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  approveRequest(id: number, approvedGraceDays: number, newDueDate: string, reviewNote?: string): Observable<GracePeriodRequest> {
    // First get the complete request data to preserve all fields
    return this.getRequestById(id).pipe(
      switchMap(fullRequest => {
        // Only send the fields that need to be updated
        const updatePayload = {
          status: 'APPROVED' as const,
          approvedGraceDays,
          newDueDate,
          reviewNote: reviewNote || `Grace period of ${approvedGraceDays} days approved. New due date: ${new Date(newDueDate).toLocaleDateString()}`,
          reviewedAt: new Date().toISOString(),
          reviewedBy: this.getCurrentUserId()
        };
        
        return this.updateRequest(id, updatePayload).pipe(
          map(response => {
            // Merge fullRequest (complete data) + response (backend updates) + updatePayload (our updates)
            // This ensures no data is lost when backend returns partial response
            return {
              ...fullRequest,
              ...response,
              ...updatePayload,
              // Explicitly preserve critical fields that might be null in backend response
              loanId: fullRequest.loanId,
              employeeId: fullRequest.employeeId,
              installmentNumber: fullRequest.installmentNumber,
              paymentSubtype: fullRequest.paymentSubtype,
              amountPaid: fullRequest.amountPaid,
              remainingBalance: fullRequest.remainingBalance,
              reason: fullRequest.reason,
              requestedDays: fullRequest.requestedDays,
              requestedAt: fullRequest.requestedAt
            } as GracePeriodRequest;
          })
        );
      })
    );
  }

  rejectRequest(id: number, rejectionReason: string, reviewNote?: string): Observable<GracePeriodRequest> {
    // First get the complete request data to preserve all fields
    return this.getRequestById(id).pipe(
      switchMap(fullRequest => {
        const updatePayload = {
          status: 'REJECTED' as const,
          rejectionReason,
          reviewNote: reviewNote || rejectionReason,
          reviewedAt: new Date().toISOString(),
          reviewedBy: this.getCurrentUserId()
        };
        
        return this.updateRequest(id, updatePayload).pipe(
          map(response => {
            // Merge fullRequest (complete data) + response (backend updates) + updatePayload (our updates)
            // This ensures no data is lost when backend returns partial response
            return {
              ...fullRequest,
              ...response,
              ...updatePayload,
              // Explicitly preserve critical fields that might be null in backend response
              loanId: fullRequest.loanId,
              employeeId: fullRequest.employeeId,
              installmentNumber: fullRequest.installmentNumber,
              paymentSubtype: fullRequest.paymentSubtype,
              amountPaid: fullRequest.amountPaid,
              remainingBalance: fullRequest.remainingBalance,
              reason: fullRequest.reason,
              requestedDays: fullRequest.requestedDays,
              requestedAt: fullRequest.requestedAt
            } as GracePeriodRequest;
          })
        );
      })
    );
  }

  private getCurrentUserId(): number {
    const storedUserId = String(sessionStorage.getItem('userid') || localStorage.getItem('userid') || '').trim();
    const parsedUserId = Number(storedUserId);
    return Number.isFinite(parsedUserId) ? parsedUserId : 0;
  }

  private safeParseResponse(response: any): any {
    if (!response) return response;
    if (typeof response === 'object') return response;
    if (typeof response === 'string') {
      let cleanResponse = response.trim();
      if (cleanResponse.charCodeAt(0) === 0xFEFF) cleanResponse = cleanResponse.substring(1);
      try { return JSON.parse(cleanResponse); }
      catch (err) { 
        const error = err as Error;
        throw new Error(`Invalid JSON response: ${error.message}`);
      }
    }
    return response;
  }
}
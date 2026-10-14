import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment';
import { fetchAllPages } from './paginated-fetch.util';
import { getTokenFromStorage } from './cooperative-loan/token-util';
import { resolveTenantId } from './loan-tenant.util';
import { CooperativeGraceRequestPaymentSubtype } from './loan-payment-types';

export interface CooperativeGracePeriodRequest {
  id?: number;
  loanId: number;
  memberId: number;
  installmentNumber: number;
  paymentSubtype: CooperativeGraceRequestPaymentSubtype;
  amountPaid: number;
  remainingBalance: number;
  requestedAt: string;
  requestedDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  reviewedAt?: string;
  reviewedBy?: any;
  reviewNote?: string;
  rejectionReason?: string;
  approvedGraceDays?: number;
  newDueDate?: string;
  paymentCompletedAt?: string;
}

export interface CreateCooperativeGracePeriodRequestPayload {
  loanId: number;
  memberId: number;
  installmentNumber: number;
  paymentSubtype: CooperativeGraceRequestPaymentSubtype;
  requestedDays: number;
  reason: string;
}

@Injectable({ providedIn: 'root' })
export class CooperativeGracePeriodService {
  private readonly baseUrl = `${environment.apiBaseUrl}/x/api/v2/hr/cooperativeGracePeriodRequests`;

  constructor(private http: HttpClient) {}

  private getHeaders(): Record<string, string> {
    const token = getTokenFromStorage();
    const headers: Record<string, string> = {
      'X-Tenant-ID': this.getTenantId(),
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private getTenantId(): string {
    return resolveTenantId();
  }

  /** All matching requests across every page, or just `params.page` when one is given. */
  getAllRequests(params?: { page?: number; size?: number; loanId?: number; memberId?: number; status?: string }): Observable<CooperativeGracePeriodRequest[]> {
    const fetchPage = (page: number) => {
      let httpParams = new HttpParams().set('page', page.toString());
      if (params?.size) httpParams = httpParams.set('size', params.size.toString());
      if (params?.loanId) httpParams = httpParams.set('loanId', params.loanId.toString());
      if (params?.memberId) httpParams = httpParams.set('memberId', params.memberId.toString());
      if (params?.status) httpParams = httpParams.set('status', params.status);
      return this.http.get<unknown>(this.baseUrl, {
        headers: this.getHeaders(),
        params: httpParams
      });
    };

    if (params?.page) {
      return fetchPage(params.page).pipe(map((res: any) => (Array.isArray(res) ? res : res?.content || []) as CooperativeGracePeriodRequest[]));
    }
    return fetchAllPages<CooperativeGracePeriodRequest>(fetchPage);
  }

  getRequestById(id: number): Observable<CooperativeGracePeriodRequest> {
    return this.http.get<CooperativeGracePeriodRequest>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(map(res => res as CooperativeGracePeriodRequest));
  }

  createRequest(payload: CreateCooperativeGracePeriodRequestPayload): Observable<CooperativeGracePeriodRequest> {
    const requestBody = {
      ...payload,
      requestedAt: new Date().toISOString(),
      status: 'PENDING',
      amountPaid: 0,
      remainingBalance: 0
    };
    return this.http.post<CooperativeGracePeriodRequest>(this.baseUrl, requestBody, {
      headers: this.getHeaders()
    }).pipe(map(res => res as CooperativeGracePeriodRequest));
  }

  updateRequest(id: number, payload: Partial<CooperativeGracePeriodRequest>): Observable<CooperativeGracePeriodRequest> {
    return this.http.put<CooperativeGracePeriodRequest>(`${this.baseUrl}/${id}`, payload, {
      headers: this.getHeaders()
    }).pipe(map(res => res as CooperativeGracePeriodRequest));
  }

  approveRequest(id: number, approvedGraceDays: number, newDueDate: string, reviewNote?: string): Observable<CooperativeGracePeriodRequest> {
    return this.updateRequest(id, {
      status: 'APPROVED',
      approvedGraceDays,
      newDueDate,
      reviewNote: reviewNote || `Grace period of ${approvedGraceDays} days approved. New due date: ${new Date(newDueDate).toLocaleDateString()}`,
      reviewedAt: new Date().toISOString(),
      // reviewedBy: this.getCurrentUserId() // Add user logic if needed
    });
  }

  rejectRequest(id: number, rejectionReason: string, reviewNote?: string): Observable<CooperativeGracePeriodRequest> {
    return this.updateRequest(id, {
      status: 'REJECTED',
      rejectionReason,
      reviewNote: reviewNote || rejectionReason,
      reviewedAt: new Date().toISOString(),
      // reviewedBy: this.getCurrentUserId() // Add user logic if needed
    });
  }
}

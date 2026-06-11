import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment';

export interface CooperativeGracePeriodRequest {
  id?: number;
  loanId: number;
  memberId: number;
  installmentNumber: number;
  paymentSubtype: 'CONTRIBUTION' | 'PRINCIPAL_REPAYMENT' | 'INTEREST_PAYMENT' | 'LATE_FEE';
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
  paymentSubtype: 'CONTRIBUTION' | 'PRINCIPAL_REPAYMENT' | 'INTEREST_PAYMENT' | 'LATE_FEE';
  requestedDays: number;
  reason: string;
}

@Injectable({ providedIn: 'root' })
export class CooperativeGracePeriodService {
  private readonly baseUrl = `${environment.apiBaseUrl}/x/api/v2/hr/cooperativeGracePeriodRequests`;

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

  getAllRequests(params?: { page?: number; size?: number; loanId?: number; memberId?: number; status?: string }): Observable<CooperativeGracePeriodRequest[]> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.size) httpParams = httpParams.set('size', params.size.toString());
    if (params?.loanId) httpParams = httpParams.set('loanId', params.loanId.toString());
    if (params?.memberId) httpParams = httpParams.set('memberId', params.memberId.toString());
    if (params?.status) httpParams = httpParams.set('status', params.status);
    return this.http.get<CooperativeGracePeriodRequest[]>(this.baseUrl, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(map(res => res as CooperativeGracePeriodRequest[]));
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

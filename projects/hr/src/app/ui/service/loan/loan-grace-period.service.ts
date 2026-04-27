// advance-grace-period.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment';

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
  reviewedBy?: number | { id: number; fullname: string; };
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

  getAllRequests(params?: { page?: number; size?: number; loanId?: number; status?: string }): Observable<GracePeriodRequest[]> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.size) httpParams = httpParams.set('size', params.size.toString());
    if (params?.loanId) httpParams = httpParams.set('loanId', params.loanId.toString());
    if (params?.status) httpParams = httpParams.set('status', params.status);

    return this.http.get<GracePeriodRequest[]>(this.baseUrl, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(map(res => this.safeParseResponse(res)));
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
    return this.updateRequest(id, {
      status: 'APPROVED',
      approvedGraceDays,
      newDueDate,
      reviewNote: reviewNote || `Grace period of ${approvedGraceDays} days approved. New due date: ${new Date(newDueDate).toLocaleDateString()}`,
      reviewedAt: new Date().toISOString(),
      reviewedBy: this.getCurrentUserId()
    });
  }

  rejectRequest(id: number, rejectionReason: string, reviewNote?: string): Observable<GracePeriodRequest> {
    return this.updateRequest(id, {
      status: 'REJECTED',
      rejectionReason,
      reviewNote: reviewNote || rejectionReason,
      reviewedAt: new Date().toISOString(),
      reviewedBy: this.getCurrentUserId()
    });
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
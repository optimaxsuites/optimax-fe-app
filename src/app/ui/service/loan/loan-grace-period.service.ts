// advance-grace-period.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AdvanceGracePeriodRequest {
  id?: number;
  loanId: number;
  employeeId: number;
  installmentNumber: number;
  paymentSubtype: 'PRINCIPAL_REPAYMENT' | 'INTEREST_ONLY' | 'LATE_FEE';
  amountPaid: number;
  remainingBalance: number;
  requestedAt: string;
  requestedDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  reviewedAt?: string;
  reviewedBy?: number | { id: number; fullname: string; userId: number; email: string; };
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
  paymentSubtype: 'PRINCIPAL_REPAYMENT' | 'INTEREST_ONLY' | 'LATE_FEE';
  amountPaid: number;
  remainingBalance: number;
  requestedDays: number;
  reason: string;
}

@Injectable({ providedIn: 'root' })
export class AdvanceGracePeriodService {
  private readonly baseUrl = 'https://be.optimaxsuites.com/x/api/v2/hr/advanceGracePeriodRequests';

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

  getAllRequests(params?: { page?: number; size?: number; loanId?: number; status?: string }): Observable<AdvanceGracePeriodRequest[]> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.size) httpParams = httpParams.set('size', params.size.toString());
    if (params?.loanId) httpParams = httpParams.set('loanId', params.loanId.toString());
    if (params?.status) httpParams = httpParams.set('status', params.status);

    return this.http.get<AdvanceGracePeriodRequest[]>(this.baseUrl, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  getRequestById(id: number): Observable<AdvanceGracePeriodRequest> {
    return this.http.get<AdvanceGracePeriodRequest>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  createRequest(payload: CreateGracePeriodRequestPayload): Observable<AdvanceGracePeriodRequest> {
    const requestBody = {
      ...payload,
      requestedAt: new Date().toISOString(),
      status: 'PENDING'
    };

    return this.http.post<AdvanceGracePeriodRequest>(this.baseUrl, requestBody, {
      headers: this.getHeaders()
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  updateRequest(id: number, payload: Partial<AdvanceGracePeriodRequest>): Observable<AdvanceGracePeriodRequest> {
    return this.http.put<AdvanceGracePeriodRequest>(`${this.baseUrl}/${id}`, payload, {
      headers: this.getHeaders()
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  approveRequest(id: number, approvedGraceDays: number, newDueDate: string, reviewNote?: string): Observable<AdvanceGracePeriodRequest> {
    return this.updateRequest(id, {
      status: 'APPROVED',
      approvedGraceDays,
      newDueDate,
      reviewNote: reviewNote || `Grace period of ${approvedGraceDays} days approved. New due date: ${new Date(newDueDate).toLocaleDateString()}`,
      reviewedAt: new Date().toISOString(),
      reviewedBy: this.getCurrentUserId()
    });
  }

  rejectRequest(id: number, rejectionReason: string, reviewNote?: string): Observable<AdvanceGracePeriodRequest> {
    return this.updateRequest(id, {
      status: 'REJECTED',
      rejectionReason,
      reviewNote: reviewNote || rejectionReason,
      reviewedAt: new Date().toISOString(),
      reviewedBy: this.getCurrentUserId()
    });
  }

  markPaymentCompleted(id: number, paymentCompletedAt?: string): Observable<AdvanceGracePeriodRequest> {
    return this.updateRequest(id, {
      status: 'COMPLETED',
      paymentCompletedAt: paymentCompletedAt || new Date().toISOString()
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
      catch (e) {
        const error = e as Error;
        throw new Error(`Invalid JSON response: ${error.message}`);
      }
    }
    return response;
  }
}
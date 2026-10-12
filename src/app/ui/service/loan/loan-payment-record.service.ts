// advance-payment-record.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment';
import { fetchAllPages } from './paginated-fetch.util';

export interface PaymentRecord {
  id?: number;
  loanId: number;
  paymentType: 'PRINCIPAL_REPAYMENT' | 'INTEREST_REPAYMENT' | 'LATE_FEE';
  installmentNumber: number;
  amount: number;
  principalApplied?: number;
  interestApplied?: number;
  lateFeeApplied?: number;
  remainingBalance?: number;
  paymentMethod: 'BANK_TRANSFER' | 'CARD' | 'CASH' | 'PAYROLL_DEDUCTION' | 'MOBILE_MONEY';
  paymentReference: string;
  paidFromAccount: string;
  paidAt?: string;
  recordedBy?: number;
  recordedAt?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  notes?: string;
}

export interface CreatePaymentRecordPayload {
  loanId: number;
  paymentType: 'PRINCIPAL_REPAYMENT' | 'INTEREST_REPAYMENT' | 'LATE_FEE';
  installmentNumber: number;
  amount: number;
  paymentMethod: 'BANK_TRANSFER' | 'CARD' | 'CASH' | 'PAYROLL_DEDUCTION' | 'MOBILE_MONEY';
  paymentReference: string;
  paidFromAccount: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class AdvancePaymentRecordService {
  private readonly baseUrl = `${environment.apiBaseUrl}/x/api/v2/hr/advancePaymentRecords`;

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

  /** All matching records across every page, or just `params.page` when one is given. */
  getAllPaymentRecords(params?: { page?: number; size?: number; loanId?: number }): Observable<PaymentRecord[]> {
    const fetchPage = (page: number) => {
      let httpParams = new HttpParams().set('page', page.toString());
      if (params?.size) httpParams = httpParams.set('size', params.size.toString());
      if (params?.loanId) httpParams = httpParams.set('loanId', params.loanId.toString());

      return this.http.get<unknown>(this.baseUrl, {
        headers: this.getHeaders(),
        params: httpParams
      }).pipe(map(res => this.safeParseResponse(res)));
    };

    if (params?.page) {
      return fetchPage(params.page).pipe(map((res: any) => (Array.isArray(res) ? res : res?.content || []) as PaymentRecord[]));
    }
    return fetchAllPages<PaymentRecord>(fetchPage);
  }

  getPaymentRecordById(id: number): Observable<PaymentRecord> {
    return this.http.get<PaymentRecord>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  getPaymentRecordsByLoanId(loanId: number): Observable<PaymentRecord[]> {
    return this.getAllPaymentRecords({ loanId });
  }

  createPaymentRecord(payload: CreatePaymentRecordPayload): Observable<PaymentRecord> {
    const requestBody = {
      ...payload,
      paidAt: new Date().toISOString(),
      recordedBy: this.getCurrentUserId(),
      recordedAt: new Date().toISOString(),
      status: 'PENDING'
    };

    return this.http.post<PaymentRecord>(this.baseUrl, requestBody, {
      headers: this.getHeaders()
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  updatePaymentRecord(id: number, payload: Partial<PaymentRecord>): Observable<PaymentRecord> {
    return this.http.put<PaymentRecord>(`${this.baseUrl}/${id}`, payload, {
      headers: this.getHeaders()
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  confirmPayment(id: number, paymentReference: string): Observable<PaymentRecord> {
    return this.updatePaymentRecord(id, {
      status: 'COMPLETED',
      paymentReference: paymentReference
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
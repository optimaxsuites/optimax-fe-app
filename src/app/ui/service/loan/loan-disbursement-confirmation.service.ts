// advance-disbursement-confirmation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment';

export interface DisbursementConfirmation {
  id?: number;
  loanId: number;
  disbursedAmount: number;
  disbursementConfirmedAt: string;
  disbursementConfirmedBy: number;
  disbursementInstructionReference: string;
  disbursementReference: string;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'PAYROLL_DEDUCTION';
  notes?: string;
}

export interface CreateDisbursementPayload {
  loanId: number;
  disbursedAmount: number;
  disbursementInstructionReference: string;
  disbursementReference: string;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'PAYROLL_DEDUCTION';
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class AdvanceDisbursementConfirmationService {
  private readonly baseUrl = `${environment.apiBaseUrl}/x/api/v2/hr/advanceLoanDisbursementConfirmations`;

  constructor(private http: HttpClient) {}

  private getTenantId(): string {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const hostnameParts = hostname.split('.').filter(Boolean);
    return hostnameParts[0] || 'optimax';
  }

  private getAccessToken(): string {
    return String(
      sessionStorage.getItem('Token') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('accessToken') ||
      localStorage.getItem('Token') ||
      localStorage.getItem('token') ||
      ''
    ).trim();
  }

  private getHeaders() {
    const token = this.getAccessToken();
    const tenantId = this.getTenantId();
    const headers: Record<string, string> = {
      'X-Tenant-ID': tenantId,
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  getAllConfirmations(params?: { page?: number; size?: number; loanId?: number }): Observable<DisbursementConfirmation[]> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.size) httpParams = httpParams.set('size', params.size.toString());
    if (params?.loanId) httpParams = httpParams.set('loanId', params.loanId.toString());

    return this.http.get<DisbursementConfirmation[]>(this.baseUrl, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  getConfirmationById(id: number): Observable<DisbursementConfirmation> {
    return this.http.get<DisbursementConfirmation>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  getConfirmationByLoanId(loanId: number): Observable<DisbursementConfirmation | null> {
    return this.getAllConfirmations({ loanId }).pipe(
      map(confirmations => confirmations.length > 0 ? confirmations[0] : null)
    );
  }

  createConfirmation(payload: CreateDisbursementPayload): Observable<DisbursementConfirmation> {
    const requestBody = {
      ...payload
    };

    console.log('[DisbursementConfirmation] Creating record', {
      url: this.baseUrl,
      payload: requestBody,
      hasToken: !!this.getAccessToken(),
      tenantId: this.getTenantId(),
      currentUserId: this.getCurrentUserId()
    });

    return this.http.post<DisbursementConfirmation>(this.baseUrl, requestBody, {
      headers: this.getHeaders()
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  updateConfirmation(id: number, payload: Partial<DisbursementConfirmation>): Observable<DisbursementConfirmation> {
    return this.http.put<DisbursementConfirmation>(`${this.baseUrl}/${id}`, payload, {
      headers: this.getHeaders()
    }).pipe(map(res => this.safeParseResponse(res)));
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
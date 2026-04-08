import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AdvanceInterestAgreement {
  id?: number;
  loanId: number;
  employeeId: number;
  proposedInterestRate: number;
  agreedInterestRate: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  agreedAt?: string;
  agreementMethod: 'EMAIL_LINK' | 'DASHBOARD' | 'ADMIN_OVERRIDE';
  ipAddress?: string;
  notes?: string;
}

export interface CreateInterestAgreementPayload {
  loanId: number;
  employeeId: number;
  proposedInterestRate: number;
  agreementMethod: 'EMAIL_LINK' | 'DASHBOARD';
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class AdvanceInterestAgreementService {
  private readonly baseUrl = 'https://be.optimaxsuites.com/x/api/v2/hr/advanceLoanInterestAgreements';

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

  getAllAgreements(params?: { page?: number; size?: number; loanId?: number; status?: string }): Observable<AdvanceInterestAgreement[]> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.size) httpParams = httpParams.set('size', params.size.toString());
    if (params?.loanId) httpParams = httpParams.set('loanId', params.loanId.toString());
    if (params?.status) httpParams = httpParams.set('status', params.status);

    return this.http.get<AdvanceInterestAgreement[]>(this.baseUrl, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  getAgreementById(id: number): Observable<AdvanceInterestAgreement> {
    return this.http.get<AdvanceInterestAgreement>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  getAgreementByLoanId(loanId: number): Observable<AdvanceInterestAgreement | null> {
    return this.getAllAgreements({ loanId }).pipe(
      map(agreements => agreements.length > 0 ? agreements[0] : null)
    );
  }

  createAgreement(payload: CreateInterestAgreementPayload): Observable<AdvanceInterestAgreement> {
    const requestBody = {
      ...payload,
      status: 'PENDING'
    };

    return this.http.post<AdvanceInterestAgreement>(this.baseUrl, requestBody, {
      headers: this.getHeaders()
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  updateAgreement(id: number, payload: Partial<AdvanceInterestAgreement>): Observable<AdvanceInterestAgreement> {
    return this.http.put<AdvanceInterestAgreement>(`${this.baseUrl}/${id}`, payload, {
      headers: this.getHeaders()
    }).pipe(map(res => this.safeParseResponse(res)));
  }

  acceptAgreement(id: number, agreedInterestRate: number, ipAddress?: string): Observable<AdvanceInterestAgreement> {
    return this.updateAgreement(id, {
      status: 'ACCEPTED',
      agreedInterestRate,
      agreedAt: new Date().toISOString(),
      ipAddress: ipAddress || this.getClientIp()
    });
  }

  declineAgreement(id: number, notes?: string): Observable<AdvanceInterestAgreement> {
    return this.updateAgreement(id, {
      status: 'DECLINED',
      notes: notes || 'Interest rate declined by employee'
    });
  }

  private getClientIp(): string {
    return '0.0.0.0';
  }

  private safeParseResponse(response: any): any {
    if (!response) return response;
    if (typeof response === 'object') return response;
    if (typeof response === 'string') {
      let cleanResponse = response.trim();
      if (cleanResponse.charCodeAt(0) === 0xFEFF) cleanResponse = cleanResponse.substring(1);
      try { 
        return JSON.parse(cleanResponse); 
      } 
      catch (err) { 
        const error = err as Error;
        throw new Error(`Invalid JSON response: ${error.message}`);
      }
    }
    return response;
  }
}
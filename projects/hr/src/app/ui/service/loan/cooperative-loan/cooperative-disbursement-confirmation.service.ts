import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../shared-component/environments/environment';
import {
  CooperativeLoanApiService,
  CooperativeLoanDisbursementConfirmationApiPayload,
  CooperativeLoanDisbursementConfirmationApiResponse
} from './cooperative-loan-api.service';

export interface CooperativeDisbursementConfirmation {
  id?: number;
  loanId: number;
  disbursedAmount: number;
  memberId?: number;
  groupMembershipId?: number;
  groupName?: string;
  disbursementConfirmedAt?: string;
  disbursementConfirmedBy?: number;
  disbursementInstructionReference: string;
  disbursementReference: string;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'PAYROLL_DEDUCTION';
  notes?: string;
}

export interface CreateCooperativeDisbursementPayload {
  loanId: number;
  disbursedAmount: number;
  memberId?: number;
  groupMembershipId?: number;
  groupName?: string;
  disbursementInstructionReference: string;
  disbursementReference: string;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'PAYROLL_DEDUCTION';
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class CooperativeDisbursementConfirmationService {
  constructor(
    private apiService: CooperativeLoanApiService,
    private http: HttpClient
  ) {}

  getAllConfirmations(params?: { page?: number; size?: number; loanId?: number }): Observable<CooperativeDisbursementConfirmation[]> {
    return this.apiService.getDisbursementConfirmations(params).pipe(
      map((items) => items.map((item) => this.mapConfirmation(item)))
    );
  }

  getConfirmationByLoanId(loanId: number): Observable<CooperativeDisbursementConfirmation | null> {
    return this.getAllConfirmations({ loanId }).pipe(
      map((items) => items.length > 0 ? items[0] : null)
    );
  }

  createConfirmation(payload: CreateCooperativeDisbursementPayload): Observable<CooperativeDisbursementConfirmation> {
    const requestBody: CooperativeLoanDisbursementConfirmationApiPayload = {
      ...payload
    };
    return this.apiService.createDisbursementConfirmation(requestBody).pipe(
      map((item) => this.mapConfirmation(item))
    );
  }

  updateConfirmation(id: number, payload: Partial<CooperativeDisbursementConfirmation>): Observable<CooperativeDisbursementConfirmation> {
    const requestBody: Partial<CooperativeLoanDisbursementConfirmationApiPayload> = {
      ...payload,
      disbursementConfirmedBy: payload.disbursementConfirmedBy
    };
    return this.apiService.updateDisbursementConfirmation(id, requestBody).pipe(
      map((item) => this.mapConfirmation(item))
    );
  }

  notifyAccountingWebhook(url: string | undefined, payload: Record<string, unknown>): Observable<unknown> {
    const targetUrl = String(url || '').trim();
    if (!targetUrl) {
      return of(null);
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.getTenantId()
    });

    return this.http.post(targetUrl, payload, { headers });
  }

  private getTenantId(): string {
    const tenant = sessionStorage.getItem('tenantId')
      || sessionStorage.getItem('tenant')
      || localStorage.getItem('tenantId')
      || localStorage.getItem('tenant')
      || 'optimax';
    return tenant && tenant !== 'undefined' && tenant !== 'null' ? tenant : 'optimax';
  }

  private mapConfirmation(item: CooperativeLoanDisbursementConfirmationApiResponse): CooperativeDisbursementConfirmation {
    return {
      id: item.id,
      loanId: item.loanId,
      disbursedAmount: Number(item.disbursedAmount || 0),
      memberId: item.memberId,
      groupMembershipId: item.groupMembershipId,
      groupName: item.groupName,
      disbursementConfirmedAt: item.disbursementConfirmedAt,
      disbursementConfirmedBy: typeof item.disbursementConfirmedBy === 'number' ? item.disbursementConfirmedBy : item.disbursementConfirmedBy?.id,
      disbursementInstructionReference: item.disbursementInstructionReference,
      disbursementReference: item.disbursementReference,
      paymentMethod: (item.paymentMethod || 'BANK_TRANSFER') as CooperativeDisbursementConfirmation['paymentMethod'],
      notes: item.notes
    };
  }
}
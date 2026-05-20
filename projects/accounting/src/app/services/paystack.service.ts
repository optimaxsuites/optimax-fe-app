import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../ui/sharedComponent/service/environments/environment';
import {
  PaystackApiResponse,
  PaystackBalanceDTO,
  PaystackInitializeDTO,
  PaystackInitializePayload,
  PaystackRecipientDTO,
  PaystackRecipientPayload,
  PaystackTransactionDTO,
  PaystackTransferDTO,
  PaystackTransferPayload,
  PaystackVerifyDTO
} from '../ui/domain/accounting.dto';

@Injectable({
  providedIn: 'root'
})
export class PaystackService {
  private readonly baseUrl = `${environment.apiBaseUrl}/x/api/v2/accounting/paystack`;
  private readonly tenantId = 'optimax';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ 'X-Tenant-ID': this.tenantId });
  }

  // ── Balance ───────────────────────────────────────────
  getBalance(): Observable<PaystackApiResponse<PaystackBalanceDTO>> {
    return this.http.get<PaystackApiResponse<PaystackBalanceDTO>>(
      `${this.baseUrl}/balance`,
      { headers: this.getHeaders() }
    );
  }

  // ── Transactions ──────────────────────────────────────
  getTransactions(
    startDate?: string,
    endDate?: string,
    type?: string
  ): Observable<PaystackApiResponse<PaystackTransactionDTO[]>> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate)   params = params.set('endDate',   endDate);
    if (type)      params = params.set('type',      type);

    return this.http.get<PaystackApiResponse<PaystackTransactionDTO[]>>(
      `${this.baseUrl}/transactions`,
      { headers: this.getHeaders(), params }
    );
  }

  getTransactionByReference(reference: string): Observable<PaystackApiResponse<PaystackTransactionDTO>> {
    return this.http.get<PaystackApiResponse<PaystackTransactionDTO>>(
      `${this.baseUrl}/transactions/${reference}`,
      { headers: this.getHeaders() }
    );
  }

  // ── Payment Initialization ────────────────────────────
  initializePayment(payload: PaystackInitializePayload): Observable<PaystackApiResponse<PaystackInitializeDTO>> {
    return this.http.post<PaystackApiResponse<PaystackInitializeDTO>>(
      `${this.baseUrl}/initialize`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  verifyPayment(reference: string): Observable<PaystackApiResponse<PaystackVerifyDTO>> {
    return this.http.get<PaystackApiResponse<PaystackVerifyDTO>>(
      `${this.baseUrl}/verify/${reference}`,
      { headers: this.getHeaders() }
    );
  }

  // ── Recipients ────────────────────────────────────────
  createRecipient(payload: PaystackRecipientPayload): Observable<PaystackApiResponse<PaystackRecipientDTO>> {
    return this.http.post<PaystackApiResponse<PaystackRecipientDTO>>(
      `${this.baseUrl}/recipient`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // ── Transfers ─────────────────────────────────────────
  initiateTransfer(payload: PaystackTransferPayload): Observable<PaystackApiResponse<PaystackTransferDTO>> {
    return this.http.post<PaystackApiResponse<PaystackTransferDTO>>(
      `${this.baseUrl}/transfer`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  getTransferByReference(reference: string): Observable<PaystackApiResponse<PaystackTransferDTO>> {
    return this.http.get<PaystackApiResponse<PaystackTransferDTO>>(
      `${this.baseUrl}/transfer/${reference}`,
      { headers: this.getHeaders() }
    );
  }
}

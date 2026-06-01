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

export interface PaystackBalanceResponse {
  id: number;
  availableBalance: number;
  ledgerBalance: number;
  currency: string;
  fetchedAt: string;
  fetchedBy: string;
  stale: boolean;
  balance?: number; // compatibility alias for HTML templates
}

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
  getBalance(): Observable<PaystackBalanceResponse> {
    return this.http.get<PaystackBalanceResponse>(
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

  // ── Recipients (list existing) ────────────────────────
  listRecipients(page = 1, perPage = 50): Observable<any> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('perPage', String(perPage));
    return this.http.get<any>(
      `${this.baseUrl}/recipients`,
      { headers: this.getHeaders(), params }
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

  /** Direct transfer — uses recipientCode, reference & reason instead of employeeId */
  initiateDirectTransfer(payload: {
    source: string;
    amount: number;
    recipient: string;
    reference: string;
    reason: string;
  }): Observable<any> {
    return this.http.post<any>(
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

  getTransferById(id: string | number): Observable<PaystackApiResponse<any>> {
    return this.http.get<PaystackApiResponse<any>>(
      `${this.baseUrl}/transfers/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // ── All Transfers (list) ──────────────────────────────
  getTransfers(query?: { [key: string]: string }): Observable<any> {
    let params = new HttpParams();
    if (query) {
      Object.keys(query).forEach(k => { if (query[k]) params = params.set(k, query[k]); });
    }
    return this.http.get<any>(`${this.baseUrl}/transfers`, { headers: this.getHeaders(), params });
  }

  /**
   * Finalize a transfer that requires OTP.
   * POST /transfer/finalize_transfer  { transfer_code, otp }
   */
  finalizeTransfer(transferCode: string, otp: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/transfer/finalize`,
      { transfer_code: transferCode, otp },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Verify the status of a transfer by reference.
   * GET /transfer/verify/:reference
   */
  verifyTransfer(reference: string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/transfer/verify/${reference}`,
      { headers: this.getHeaders() }
    );
  }

  // ── OTP Control (Transfers Control API) ───────────────

  /**
   * Initiate disabling OTP for transfers.
   * Paystack sends an OTP to the business phone.
   * POST /transfer/disable_otp
   */
  initiateDisableOtp(): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/transfer/disable-otp`,
      {},
      { headers: this.getHeaders() }
    );
  }

  /**
   * Finalize disabling OTP using the OTP sent to phone.
   * POST /transfer/disable_otp_finalize  { otp }
   */
  finalizeDisableOtp(otp: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/transfer/disable-otp-finalize`,
      { otp },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Re-enable OTP requirement for transfers.
   * POST /transfer/enable_otp
   */
  enableOtp(): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/transfer/enable-otp`,
      {},
      { headers: this.getHeaders() }
    );
  }

  /**
   * Resend OTP to customer for a pending transfer.
   * POST /transfer/resend_otp  { transfer_code, reason: "resend_otp" }
   */
  resendOtp(transferCode: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/transfer/resend-otp`,
      { transfer_code: transferCode, reason: 'resend_otp' },
      { headers: this.getHeaders() }
    );
  }
}



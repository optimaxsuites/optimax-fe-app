import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../ui/sharedComponent/service/environments/environment';
import {
  AccountingTransactionDTO,
  BankConnectionDTO,
  CreateBankConnectionPayload,
  CreateDisbursementPayload,
  CreateTransactionPayload,
  DisbursementDTO,
  PagedResponse
} from '../ui/domain/accounting.dto';

@Injectable({
  providedIn: 'root'
})
export class DisbursementService {

  private readonly baseUrl = `${environment.apiBaseUrl}/x/api/v2/accounting`;
  private readonly tenantId = 'optimax';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ 'X-Tenant-ID': this.tenantId });
  }

  /**
   * Convert Java date array [year, month, day, hour, min, sec, nano] to JS Date.
   * Java months are 1-based; JS months are 0-based.
   */
  static parseJavaDate(arr: number[]): Date {
    if (!arr || arr.length < 3) return new Date();
    return new Date(arr[0], arr[1] - 1, arr[2], arr[3] ?? 0, arr[4] ?? 0, arr[5] ?? 0);
  }

  // ── Transactions ────────────────────────────────────────

  /**
   * Fetch approved transactions ready for disbursement.
   * Pass status='APPROVED' and optionally a sourceModule filter.
   */
  getApprovedTransactions(sourceModule?: string): Observable<PagedResponse<AccountingTransactionDTO>> {
    let params = new HttpParams().set('status', 'APPROVED').set('size', '100');
    if (sourceModule) {
      params = params.set('sourceModule', sourceModule);
    }
    return this.http.get<PagedResponse<AccountingTransactionDTO>>(
      `${this.baseUrl}/transactions/tray`,
      { headers: this.getHeaders(), params }
    );
  }

  /**
   * Create a transaction record — first step of the disbursement two-phase commit.
   */
  createTransaction(payload: CreateTransactionPayload): Observable<AccountingTransactionDTO> {
    return this.http.post<AccountingTransactionDTO>(
      `${this.baseUrl}/transactions`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // ── Disbursements ───────────────────────────────────────

  /**
   * Fetch all disbursements for dashboard stats.
   */
  getDisbursements(): Observable<PagedResponse<DisbursementDTO>> {
    const params = new HttpParams().set('size', '200');
    return this.http.get<PagedResponse<DisbursementDTO>>(
      `${this.baseUrl}/disbursements/tray`,
      { headers: this.getHeaders(), params }
    );
  }

  /**
   * Create a disbursement record — second step of the payout flow.
   */
  createDisbursement(payload: CreateDisbursementPayload): Observable<DisbursementDTO> {
    return this.http.post<DisbursementDTO>(
      `${this.baseUrl}/disbursements`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // ── Bank Connections ────────────────────────────────────

  getBankConnections(): Observable<PagedResponse<BankConnectionDTO>> {
    return this.http.get<PagedResponse<BankConnectionDTO>>(
      `${this.baseUrl}/bank-connections`,
      { headers: this.getHeaders() }
    );
  }

  createBankConnection(payload: CreateBankConnectionPayload): Observable<BankConnectionDTO> {
    return this.http.post<BankConnectionDTO>(
      `${this.baseUrl}/bank-connections`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  updateBankConnection(id: number, payload: Partial<CreateBankConnectionPayload>): Observable<BankConnectionDTO> {
    return this.http.put<BankConnectionDTO>(
      `${this.baseUrl}/bank-connections/${id}`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  deleteBankConnection(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/bank-connections/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // ── HR Integration ──────────────────────────────────────
  
  getEmployeeById(id: number): Observable<any> {
    return this.http.get<any>(
      `${environment.apiBaseUrl}/x/api/v2/hr/employees/${id}`,
      { headers: this.getHeaders() }
    );
  }

  getEmployees(size: number = 200): Observable<any> {
    const params = new HttpParams().set('size', size.toString());
    return this.http.get<any>(
      `${environment.apiBaseUrl}/x/api/v2/hr/employees`,
      { headers: this.getHeaders(), params }
    );
  }
}

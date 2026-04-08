import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';

// Minimal type stubs for API compatibility
export type CooperativeLoanApiMemberRef = any;
export type CooperativeGroupApiResponse = any;
export type CooperativeLoanApiResponse = any;
export type CooperativeLoanApiCreatePayload = any;
export type CooperativeLoanApiUpdatePayload = any;
export type CooperativeLoanApiMemberPayload = any;

@Injectable({ providedIn: 'root' })
export class CooperativeLoanApiService {
  private readonly loansBaseUrl = 'https://be.optimaxsuites.com/x/api/v2/hr/cooperativeLoans';
  private readonly membersBaseUrl = 'https://be.optimaxsuites.com/x/api/v2/hr/cooperativeMembers';
  private readonly groupsBaseUrl = 'https://be.optimaxsuites.com/x/api/v2/hr/cooperativeGroups';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token') || sessionStorage.getItem('Token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': 'optimax',
      'Content-Type': 'application/json'
    });
  }

  private logRequest(method: string, url: string): void {
    console.log(`[CooperativeLoanApi] ${method} ${url}`);
  }

  private handleError(error: HttpErrorResponse, context: string) {
    console.error(`[CooperativeLoanApi] Error in ${context}:`, error);
    if (error.status === 401) {
      console.warn('Authentication failed. Token may be invalid or expired.');
    }
    return throwError(() => error);
  }

  // ==================== MEMBER ENDPOINTS ====================
  getAllMembers(): Observable<CooperativeLoanApiMemberRef[]> {
    const url = `${this.membersBaseUrl}?page=1&size=100`;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<any>(url, { headers }).pipe(
      map((response) => {
        if (response && response.content && Array.isArray(response.content)) {
          console.log(`[CooperativeLoanApi] Members received: ${response.content.length} of ${response.totalElements}`);
          return response.content;
        }
        if (Array.isArray(response)) {
          console.log(`[CooperativeLoanApi] Members received: ${response.length}`);
          return response;
        }
        return [];
      }),
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getAllMembers'))
    );
  }

  createMember(payload: CooperativeLoanApiMemberPayload): Observable<CooperativeLoanApiMemberRef> {
    const url = `${this.membersBaseUrl}`;
    this.logRequest('POST', url);
    const headers = this.getAuthHeaders();
    return this.http.post<CooperativeLoanApiMemberRef>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'createMember'))
    );
  }

  updateMember(id: number, payload: CooperativeLoanApiMemberPayload): Observable<CooperativeLoanApiMemberRef> {
    const url = `${this.membersBaseUrl}/${id}`;
    this.logRequest('PUT', url);
    const headers = this.getAuthHeaders();
    return this.http.put<CooperativeLoanApiMemberRef>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'updateMember'))
    );
  }

  getMemberById(id: number): Observable<CooperativeLoanApiMemberRef> {
    const url = `${this.membersBaseUrl}/${id}`;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<CooperativeLoanApiMemberRef>(url, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getMemberById'))
    );
  }

  // ==================== LOAN ENDPOINTS ====================
  getAllLoans(): Observable<CooperativeLoanApiResponse[]> {
    const url = `${this.loansBaseUrl}?page=1&size=100`;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<any>(url, { headers }).pipe(
      map((response) => {
        if (response && response.content && Array.isArray(response.content)) {
          return response.content;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      }),
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getAllLoans'))
    );
  }

  createLoan(payload: CooperativeLoanApiCreatePayload): Observable<CooperativeLoanApiResponse> {
    const url = `${this.loansBaseUrl}`;
    this.logRequest('POST', url);
    const headers = this.getAuthHeaders();
    return this.http.post<CooperativeLoanApiResponse>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'createLoan'))
    );
  }

  updateLoan(id: number, payload: CooperativeLoanApiUpdatePayload): Observable<CooperativeLoanApiResponse> {
    const url = `${this.loansBaseUrl}/${id}`;
    this.logRequest('PUT', url);
    const headers = this.getAuthHeaders();
    return this.http.put<CooperativeLoanApiResponse>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'updateLoan'))
    );
  }

  getLoanById(id: number): Observable<CooperativeLoanApiResponse> {
    const url = `${this.loansBaseUrl}/${id}`;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<CooperativeLoanApiResponse>(url, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getLoanById'))
    );
  }

  // ==================== GROUP ENDPOINTS ====================
  getAllCooperativeGroups(): Observable<CooperativeGroupApiResponse[]> {
    const url = `${this.groupsBaseUrl}`;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<CooperativeGroupApiResponse[]>(url, { headers }).pipe(
      map((groups) => {
        console.log(`[CooperativeLoanApi] Groups received: ${groups?.length || 0}`);
        return groups;
      }),
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getAllCooperativeGroups'))
    );
  }

  getCooperativeGroupById(id: number): Observable<CooperativeGroupApiResponse> {
    const url = `${this.groupsBaseUrl}/${id}`;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<CooperativeGroupApiResponse>(url, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getCooperativeGroupById'))
    );
  }
}
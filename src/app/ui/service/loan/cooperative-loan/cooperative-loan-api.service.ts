import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { getTokenFromStorage } from './token-util';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';

// Minimal type stubs for API compatibility
export type CooperativeLoanApiMemberRef = any;
export type CooperativeGroupApiResponse = any;
export type CooperativeLoanApiResponse = any;
export type CooperativeLoanApiCreatePayload = any;
export type CooperativeLoanApiUpdatePayload = any;
export type CooperativeLoanApiMemberPayload = any;

@Injectable({ providedIn: 'root' })
export class CooperativeLoanApiService {
  private baseUrl = 'https://be.optimaxsuites.com/x/api/v2/hr/cooperativeLoans';

  constructor(private http: HttpClient) {}

  // Helper method for debugging
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

  getAllMembers(): Observable<CooperativeLoanApiMemberRef[]> {
    this.logRequest('GET', `${this.baseUrl}/members`);
    const token = getTokenFromStorage();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.get<CooperativeLoanApiMemberRef[]>(`${this.baseUrl}/members`, headers ? { headers } : {}).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getAllMembers'))
    );
  }

  createMember(payload: CooperativeLoanApiMemberPayload): Observable<CooperativeLoanApiMemberRef> {
    this.logRequest('POST', `${this.baseUrl}/members`);
    const token = getTokenFromStorage();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.post<CooperativeLoanApiMemberRef>(`${this.baseUrl}/members`, payload, headers ? { headers } : {}).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'createMember'))
    );
  }

  updateMember(id: number, payload: CooperativeLoanApiMemberPayload): Observable<CooperativeLoanApiMemberRef> {
    this.logRequest('PUT', `${this.baseUrl}/members/${id}`);
    const token = getTokenFromStorage();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.put<CooperativeLoanApiMemberRef>(`${this.baseUrl}/members/${id}`, payload, headers ? { headers } : {}).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'updateMember'))
    );
  }

  getMemberById(id: number): Observable<CooperativeLoanApiMemberRef> {
    this.logRequest('GET', `${this.baseUrl}/members/${id}`);
    const token = getTokenFromStorage();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.get<CooperativeLoanApiMemberRef>(`${this.baseUrl}/members/${id}`, headers ? { headers } : {}).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getMemberById'))
    );
  }

  getAllLoans(): Observable<CooperativeLoanApiResponse[]> {
    this.logRequest('GET', this.baseUrl);
    return this.http.get<CooperativeLoanApiResponse[]>(`${this.baseUrl}`).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getAllLoans'))
    );
  }

  createLoan(payload: CooperativeLoanApiCreatePayload): Observable<CooperativeLoanApiResponse> {
    this.logRequest('POST', this.baseUrl);
    return this.http.post<CooperativeLoanApiResponse>(`${this.baseUrl}`, payload).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'createLoan'))
    );
  }

  updateLoan(id: number, payload: CooperativeLoanApiUpdatePayload): Observable<CooperativeLoanApiResponse> {
    this.logRequest('PUT', `${this.baseUrl}/${id}`);
    return this.http.put<CooperativeLoanApiResponse>(`${this.baseUrl}/${id}`, payload).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'updateLoan'))
    );
  }

  getLoanById(id: number): Observable<CooperativeLoanApiResponse> {
    this.logRequest('GET', `${this.baseUrl}/${id}`);
    return this.http.get<CooperativeLoanApiResponse>(`${this.baseUrl}/${id}`).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getLoanById'))
    );
  }

  // Group methods - CORRECT ENDPOINTS (without /members prefix)
  getAllCooperativeGroups(): Observable<CooperativeGroupApiResponse[]> {
    this.logRequest('GET', `${this.baseUrl}/groups`);
    return this.http.get<CooperativeGroupApiResponse[]>(`${this.baseUrl}/groups`).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getAllCooperativeGroups'))
    );
  }

  getCooperativeGroupById(id: number): Observable<CooperativeGroupApiResponse> {
    this.logRequest('GET', `${this.baseUrl}/groups/${id}`);
    return this.http.get<CooperativeGroupApiResponse>(`${this.baseUrl}/groups/${id}`).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getCooperativeGroupById'))
    );
  }
}
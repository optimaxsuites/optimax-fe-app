import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';
import {
  CrossBranchCheckInRequest,
  CreateCrossBranchRequestBody,
  CrossBranchApprovalRequest,
  CrossBranchAdminOverride,
  PagedResponse
} from '../../domain/attendance/cross-branch-request.dto';

const EMPTY_PAGE: PagedResponse<CrossBranchCheckInRequest> = { content: [], totalSize: 0, page: 0, size: 0 };

@Injectable({ providedIn: 'root' })
export class CrossBranchAttendanceService {
  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/hr/cross-branch-requests`;
  private requestsSubject = new BehaviorSubject<CrossBranchCheckInRequest[]>([]);
  requests$ = this.requestsSubject.asObservable();

  constructor(private http: HttpClient) {}

  getRequests(): CrossBranchCheckInRequest[] {
    return this.requestsSubject.value;
  }

  /** GET /cross-branch-requests */
  getAllRequests(page?: number, size?: number): Observable<CrossBranchCheckInRequest[]> {
    let params = new HttpParams();
    if (page !== undefined) params = params.set('page', page);
    if (size !== undefined) params = params.set('size', size);

    return this.http.get<PagedResponse<CrossBranchCheckInRequest>>(this.BASE, { params }).pipe(
      catchError(error => {
        console.error('Failed to get cross-branch requests:', error);
        return of(EMPTY_PAGE);
      }),
      map(res => res.content || []),
      tap(requests => this.requestsSubject.next(requests))
    );
  }

  /** GET /cross-branch-requests/{id} */
  getRequest(id: number): Observable<CrossBranchCheckInRequest | null> {
    return this.http.get<CrossBranchCheckInRequest>(`${this.BASE}/${id}`).pipe(
      catchError(error => {
        console.error(`Failed to get cross-branch request ${id}:`, error);
        return of(null);
      })
    );
  }

  /** POST /cross-branch-requests */
  createRequest(body: CreateCrossBranchRequestBody): Observable<CrossBranchCheckInRequest> {
    return this.http.post<CrossBranchCheckInRequest>(this.BASE, body);
  }

  /** DELETE /cross-branch-requests/{id} */
  deleteRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/${id}`);
  }

  /** GET /cross-branch-requests/employee/{employeeId} */
  getRequestsByEmployee(employeeId: number): Observable<CrossBranchCheckInRequest[]> {
    return this.http.get<PagedResponse<CrossBranchCheckInRequest>>(`${this.BASE}/employee/${employeeId}`).pipe(
      catchError(error => {
        console.error(`Failed to get cross-branch requests for employee ${employeeId}:`, error);
        return of(EMPTY_PAGE);
      }),
      map(res => res.content || [])
    );
  }

  /** GET /cross-branch-requests/pending */
  getOutstandingRequests(supervisorId?: number): Observable<CrossBranchCheckInRequest[]> {
    return this.http.get<PagedResponse<CrossBranchCheckInRequest>>(`${this.BASE}/pending`).pipe(
      catchError(error => {
        console.error('Failed to get pending cross-branch requests:', error);
        return of(EMPTY_PAGE);
      }),
      map(res => res.content || []),
      tap(requests => this.requestsSubject.next(requests))
    );
  }

  /** PUT /cross-branch-requests/{id}/approve */
  approveCrossBranchRequest(
    id: number,
    supervisorId: number,
    supervisorName: string,
    note?: string
  ): Observable<CrossBranchCheckInRequest> {
    return this.putApproval(id, { supervisorId, action: 'APPROVE', note });
  }

  /** PUT /cross-branch-requests/{id}/approve */
  rejectCrossBranchRequest(
    id: number,
    supervisorId: number,
    supervisorName: string,
    reason: string
  ): Observable<CrossBranchCheckInRequest> {
    return this.putApproval(id, { supervisorId, action: 'REJECT', note: reason });
  }

  /** PUT /cross-branch-requests/{id}/override — supervisor-initiated override (same body shape as approve) */
  performSupervisorOverride(
    id: number,
    supervisorId: number,
    action: 'APPROVE' | 'REJECT',
    note?: string
  ): Observable<CrossBranchCheckInRequest> {
    const request: CrossBranchApprovalRequest = { supervisorId, action, note };
    return this.http.put<CrossBranchCheckInRequest>(`${this.BASE}/${id}/override`, request).pipe(
      tap(updated => this.applyUpdate(updated)),
      catchError(err => { throw err; })
    );
  }

  /** POST /cross-branch-requests/{id}/override — admin override */
  performAdminOverride(
    id: number,
    adminId: number,
    adminName: string,
    action: string,
    reason: string
  ): Observable<CrossBranchCheckInRequest> {
    const request: CrossBranchAdminOverride = { adminId, action, reason };
    return this.http.post<CrossBranchCheckInRequest>(`${this.BASE}/${id}/override`, request).pipe(
      tap(updated => this.applyUpdate(updated)),
      catchError(err => { throw err; })
    );
  }

  isApprovalRequired(homeBranchCode: string, requestedBranchCode: string): boolean {
    return homeBranchCode !== requestedBranchCode;
  }

  private putApproval(id: number, request: CrossBranchApprovalRequest): Observable<CrossBranchCheckInRequest> {
    return this.http.put<CrossBranchCheckInRequest>(`${this.BASE}/${id}/approve`, request).pipe(
      tap(updated => this.applyUpdate(updated)),
      catchError(err => { throw err; })
    );
  }

  private applyUpdate(updated: CrossBranchCheckInRequest): void {
    const requests = this.requestsSubject.value.map(r => r.id === updated.id ? updated : r);
    this.requestsSubject.next(requests);
  }
}

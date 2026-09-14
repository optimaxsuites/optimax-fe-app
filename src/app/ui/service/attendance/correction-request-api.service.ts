import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CorrectionRequest, CorrectionStatus } from '../../domain/attendance/correctionrequest.dto';
import { map } from 'rxjs/operators';

/**
 * HTTP API service for Correction Requests
 * Communicates with backend: /x/api/v2/hr/correction-requests
 */
@Injectable({
  providedIn: 'root'
})
export class CorrectionRequestApiService {
  private readonly API_BASE = '/x/api/v2/hr/correction-requests';

  constructor(private http: HttpClient) {}

  /**
   * Submit a new correction request
   * POST /x/api/v2/hr/correction-requests
   */
  submitCorrectionRequest(request: CorrectionRequest): Observable<CorrectionRequest> {
    return this.http.post<CorrectionRequest>(this.API_BASE, request).pipe(
      map(response => this.normalizeDateFields(response))
    );
  }

  /**
   * Get employee's own correction requests
   * GET /x/api/v2/hr/correction-requests?employeeId=X
   */
  getEmployeeCorrectionRequests(employeeId: string): Observable<CorrectionRequest[]> {
    const params = new HttpParams().set('employeeId', employeeId);
    return this.http.get<CorrectionRequest[]>(this.API_BASE, { params }).pipe(
      map(requests => requests.map(r => this.normalizeDateFields(r)))
    );
  }

  /**
   * Get a single correction request by ID
   * GET /x/api/v2/hr/correction-requests/:id
   */
  getCorrectionRequest(id: string): Observable<CorrectionRequest> {
    return this.http.get<CorrectionRequest>(`${this.API_BASE}/${id}`).pipe(
      map(response => this.normalizeDateFields(response))
    );
  }

  /**
   * Get correction requests for approval (admin view)
   * GET /x/api/v2/hr/correction-requests/approval/pending
   */
  getPendingApprovals(): Observable<CorrectionRequest[]> {
    return this.http.get<CorrectionRequest[]>(`${this.API_BASE}/approval/pending`).pipe(
      map(requests => requests.map(r => this.normalizeDateFields(r)))
    );
  }

  /**
   * Approve a correction request
   * PUT /x/api/v2/hr/correction-requests/:id/approve
   */
  approveCorrectionRequest(
    id: string,
    approverName: string,
    comment?: string
  ): Observable<CorrectionRequest> {
    return this.http.put<CorrectionRequest>(
      `${this.API_BASE}/${id}/approve`,
      { approverName, comment }
    ).pipe(
      map(response => this.normalizeDateFields(response))
    );
  }

  /**
   * Reject a correction request
   * PUT /x/api/v2/hr/correction-requests/:id/reject
   */
  rejectCorrectionRequest(
    id: string,
    rejectorName: string,
    reason: string
  ): Observable<CorrectionRequest> {
    return this.http.put<CorrectionRequest>(
      `${this.API_BASE}/${id}/reject`,
      { rejectorName, reason }
    ).pipe(
      map(response => this.normalizeDateFields(response))
    );
  }

  /**
   * Resubmit a correction request with additional evidence
   * PUT /x/api/v2/hr/correction-requests/:id/resubmit
   */
  resubmitCorrectionRequest(
    id: string,
    evidence: string
  ): Observable<CorrectionRequest> {
    return this.http.put<CorrectionRequest>(
      `${this.API_BASE}/${id}/resubmit`,
      { evidence }
    ).pipe(
      map(response => this.normalizeDateFields(response))
    );
  }

  /**
   * Withdraw a pending correction request
   * DELETE /x/api/v2/hr/correction-requests/:id
   */
  withdrawCorrectionRequest(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/${id}`);
  }

  /**
   * Get correction requests by status (for admin filtering)
   * GET /x/api/v2/hr/correction-requests?status=PENDING&status=UNDER_REVIEW
   */
  getCorrectionRequestsByStatus(statuses: CorrectionStatus[]): Observable<CorrectionRequest[]> {
    let params = new HttpParams();
    statuses.forEach(status => {
      params = params.append('status', status);
    });
    return this.http.get<CorrectionRequest[]>(this.API_BASE, { params }).pipe(
      map(requests => requests.map(r => this.normalizeDateFields(r)))
    );
  }

  /**
   * Get correction requests by date range (for reporting)
   * GET /x/api/v2/hr/correction-requests?startDate=X&endDate=Y
   */
  getCorrectionRequestsByDateRange(
    startDate: Date,
    endDate: Date
  ): Observable<CorrectionRequest[]> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());
    return this.http.get<CorrectionRequest[]>(this.API_BASE, { params }).pipe(
      map(requests => requests.map(r => this.normalizeDateFields(r)))
    );
  }

  /**
   * Normalize date string fields to Date objects
   * @private
   */
  private normalizeDateFields(record: any): CorrectionRequest {
    return {
      ...record,
      date: record.date ? new Date(record.date) : new Date(),
      createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
      updatedAt: record.updatedAt ? new Date(record.updatedAt) : undefined,
      requestedClockIn: record.requestedClockIn ? new Date(record.requestedClockIn) : undefined,
      requestedClockOut: record.requestedClockOut ? new Date(record.requestedClockOut) : undefined,
      history: (record.history || []).map((h: any) => ({
        ...h,
        createdAt: h.createdAt ? new Date(h.createdAt) : new Date()
      }))
    };
  }
}

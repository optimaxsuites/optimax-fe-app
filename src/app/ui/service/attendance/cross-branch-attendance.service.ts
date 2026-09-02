import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';
import {
  CrossBranchCheckInRequest,
  CrossBranchApprovalRequest,
  CrossBranchAdminOverride,
  AuditLogEntryDTO
} from '../../domain/attendance/cross-branch-request.dto';
import { v4 as uuidv4 } from 'uuid';

const API_ENDPOINTS = {
  REQUESTS: () => `${environment.apiBaseUrl}/x/api/v2/hr/cross-branch-requests`,
  REQUEST_APPROVE: (id: string) => `${environment.apiBaseUrl}/x/api/v2/hr/cross-branch-requests/${id}/approve`,
  REQUEST_REJECT: (id: string) => `${environment.apiBaseUrl}/x/api/v2/hr/cross-branch-requests/${id}/reject`,
  REQUEST_OVERRIDE: (id: string) => `${environment.apiBaseUrl}/x/api/v2/hr/cross-branch-requests/${id}/override`,
  VALIDATE_PROXIMITY: (branchId: number) => `${environment.apiBaseUrl}/x/api/v2/hr/cross-branch-requests/validate-proximity/${branchId}`,
  AUDIT_LOG: () => `${environment.apiBaseUrl}/x/api/v2/hr/audit-log/cross-branch`,
  COMPLIANCE_REPORT: () => `${environment.apiBaseUrl}/x/api/v2/hr/cross-branch-reports`
};

let cachedIpAddress: string | null = null;

@Injectable({ providedIn: 'root' })
export class CrossBranchAttendanceService {
  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/hr`;
  private requestsSubject = new BehaviorSubject<CrossBranchCheckInRequest[]>([]);
  private auditLogSubject = new BehaviorSubject<AuditLogEntryDTO[]>([]);

  requests$ = this.requestsSubject.asObservable();
  auditLog$ = this.auditLogSubject.asObservable();

  constructor(private http: HttpClient) {}

  getRequests(): CrossBranchCheckInRequest[] {
    return this.requestsSubject.value;
  }

  /**
   * ⚠️ NOTE: Manual employee requests removed (2026-08-31)
   * Cross-branch requests are now AUTO-CREATED by backend when employee checks in at different branch
   * Requests are flagged for supervisor/admin approval after the fact (RETROSPECTIVE only)
   */

  approveCrossBranchRequest(
    requestId: string,
    supervisorId: number,
    supervisorName: string,
    note?: string
  ): Observable<CrossBranchCheckInRequest> {
    const approvalRequest: CrossBranchApprovalRequest = {
      requestId,
      supervisorId,
      action: 'APPROVE',
      note,
      ipAddress: cachedIpAddress || 'Unknown',
      userAgent: navigator.userAgent
    };

    this.fetchIpAddressIfNeeded();

    return this.http.put<CrossBranchCheckInRequest>(API_ENDPOINTS.REQUEST_APPROVE(requestId), approvalRequest).pipe(
      tap(updatedRequest => {
        const requests = this.requestsSubject.value.map(r => r.id === requestId ? updatedRequest : r);
        this.requestsSubject.next(requests);

        const auditEntry: AuditLogEntryDTO = {
          id: uuidv4(),
          actor: { id: supervisorId, name: supervisorName, role: 'SUPERVISOR' },
          action: 'APPROVED',
          timestamp: new Date(),
          details: `Supervisor approved cross-branch check-in request. Note: ${note || 'None'}`,
          ipAddress: cachedIpAddress || 'Unknown',
          userAgent: navigator.userAgent
        };
        this.addAuditLogEntry(auditEntry);
      }),
      catchError(err => { throw err; })
    );
  }

  rejectCrossBranchRequest(
    requestId: string,
    supervisorId: number,
    supervisorName: string,
    reason: string
  ): Observable<CrossBranchCheckInRequest> {
    const rejectionRequest: CrossBranchApprovalRequest = {
      requestId,
      supervisorId,
      action: 'REJECT',
      note: reason,
      ipAddress: cachedIpAddress || 'Unknown',
      userAgent: navigator.userAgent
    };

    this.fetchIpAddressIfNeeded();

    return this.http.put<CrossBranchCheckInRequest>(API_ENDPOINTS.REQUEST_REJECT(requestId), rejectionRequest).pipe(
      tap(updatedRequest => {
        const requests = this.requestsSubject.value.map(r => r.id === requestId ? updatedRequest : r);
        this.requestsSubject.next(requests);

        const auditEntry: AuditLogEntryDTO = {
          id: uuidv4(),
          actor: { id: supervisorId, name: supervisorName, role: 'SUPERVISOR' },
          action: 'REJECTED',
          timestamp: new Date(),
          details: `Supervisor rejected cross-branch check-in request. Reason: ${reason}`,
          ipAddress: cachedIpAddress || 'Unknown',
          userAgent: navigator.userAgent
        };
        this.addAuditLogEntry(auditEntry);
      }),
      catchError(err => { throw err; })
    );
  }

  getOutstandingRequests(supervisorId: number): Observable<CrossBranchCheckInRequest[]> {
    const url = `${API_ENDPOINTS.REQUESTS()}?supervisorId=${supervisorId}&status=PENDING`;
    return this.http.get<any>(url).pipe(
      map(res => Array.isArray(res) ? res : (res?.requests ?? [])),
      catchError(() => of([]))
    );
  }

  getEmployeeAuditTrail(
    employeeId: number,
    startDate?: string,
    endDate?: string
  ): Observable<AuditLogEntryDTO[]> {
    let url = `${API_ENDPOINTS.AUDIT_LOG()}?employeeId=${employeeId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    return this.http.get<any>(url).pipe(
      map(res => Array.isArray(res) ? res : (res?.auditLog ?? [])),
      tap(entries => this.auditLogSubject.next(entries)),
      catchError(() => of([]))
    );
  }

  performAdminOverride(
    requestId: string,
    adminId: number,
    adminName: string,
    action: string,
    reason: string
  ): Observable<CrossBranchCheckInRequest> {
    const overrideRequest: CrossBranchAdminOverride = {
      requestId,
      adminId,
      action,
      reason,
      ipAddress: cachedIpAddress || 'Unknown',
      userAgent: navigator.userAgent
    };

    this.fetchIpAddressIfNeeded();

    return this.http.post<CrossBranchCheckInRequest>(API_ENDPOINTS.REQUEST_OVERRIDE(requestId), overrideRequest).pipe(
      tap(updatedRequest => {
        const requests = this.requestsSubject.value.map(r => r.id === requestId ? updatedRequest : r);
        this.requestsSubject.next(requests);

        const auditEntry: AuditLogEntryDTO = {
          id: uuidv4(),
          actor: { id: adminId, name: adminName, role: 'ADMIN' },
          action: 'OVERRIDDEN',
          timestamp: new Date(),
          details: `Admin override on cross-branch request. Action: ${action}. Reason: ${reason}`,
          ipAddress: cachedIpAddress || 'Unknown',
          userAgent: navigator.userAgent
        };
        this.addAuditLogEntry(auditEntry);
      }),
      catchError(err => { throw err; })
    );
  }

  validateBranchProximity(
    employeeId: number,
    targetBranchId: number,
    lat: number,
    lng: number,
    maxDistanceKm: number = 10
  ): Observable<{ isWithinRadius: boolean; distance: number }> {
    const body = { lat, lng, maxDistanceKm };
    return this.http.post<any>(API_ENDPOINTS.VALIDATE_PROXIMITY(targetBranchId), body).pipe(
      catchError(() => of({ isWithinRadius: false, distance: 999999 }))
    );
  }

  getRequestsByBranch(
    branchId: number,
    startDate?: string,
    endDate?: string
  ): Observable<CrossBranchCheckInRequest[]> {
    let url = `${API_ENDPOINTS.REQUESTS()}?branchId=${branchId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    return this.http.get<any>(url).pipe(
      map(res => Array.isArray(res) ? res : (res?.requests ?? [])),
      catchError(() => of([]))
    );
  }

  generateComplianceReport(startDate: string, endDate: string): Observable<any> {
    const url = `${API_ENDPOINTS.COMPLIANCE_REPORT()}?startDate=${startDate}&endDate=${endDate}`;
    return this.http.get<any>(url).pipe(
      catchError(() => of({ summary: {}, details: [] }))
    );
  }

  private addAuditLogEntry(entry: AuditLogEntryDTO): void {
    const current = this.auditLogSubject.value;
    this.auditLogSubject.next([...current, entry]);
  }

  private fetchIpAddressIfNeeded(): void {
    if (!cachedIpAddress) {
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => { cachedIpAddress = data.ip || 'Unknown'; })
        .catch(() => { cachedIpAddress = 'Unknown'; });
    }
  }

  isApprovalRequired(homeBranchId: number, requestedBranchId: number): boolean {
    return homeBranchId !== requestedBranchId;
  }

  getRequestStatus(requestId: string): Observable<string> {
    return this.requests$
      .pipe(
        map(requests => {
          const request = requests.find(r => r.id === requestId);
          return request?.supervisorApprovalStatus || 'UNKNOWN';
        })
      );
  }
}


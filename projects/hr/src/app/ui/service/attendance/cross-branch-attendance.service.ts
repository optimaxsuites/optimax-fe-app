import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';

let cachedIpAddress: string | null = null;
import {
  CrossBranchCheckInRequest,
  CrossBranchApprovalRequest,
  CrossBranchAdminOverride,
  CrossBranchAuditQuery,
  AuditLogEntryDTO
} from '../../domain/attendance/cross-branch-request.dto';
import { v4 as uuidv4 } from 'uuid';

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

  requestCrossBranchCheckIn(
    employeeId: number,
    requestedBranchId: number,
    homeBranchId: number,
    approvalType: 'PRE_APPROVAL' | 'RETROSPECTIVE' = 'PRE_APPROVAL',
    supervisorId?: number
  ): Observable<CrossBranchCheckInRequest> {
    const request: Omit<CrossBranchCheckInRequest, 'id' | 'createdAt' | 'updatedAt'> = {
      employeeId,
      requestDate: new Date().toISOString().split('T')[0],
      requestedBranchId,
      homeBranchId,
      approvalRequired: approvalType === 'PRE_APPROVAL',
      approvalType,
      supervisorId,
      supervisorApprovalStatus: 'PENDING',
      auditLog: [
        {
          id: uuidv4(),
          actor: {
            id: employeeId,
            name: 'Employee',
            role: 'EMPLOYEE'
          },
          action: 'REQUESTED',
          timestamp: new Date().toISOString(),
          details: `Cross-branch check-in request for branch ${requestedBranchId}`,
          ipAddress: cachedIpAddress || 'Unknown',
          userAgent: navigator.userAgent
        }
      ]
    };

    this.fetchIpAddressIfNeeded();

    return this.http.post<CrossBranchCheckInRequest>(
      `${this.BASE}/cross-branch-requests`,
      request
    ).pipe(
      tap(newRequest => {
        const requests = this.requestsSubject.value;
        this.requestsSubject.next([...requests, newRequest]);
        this.addAuditLogEntry(newRequest.auditLog[0]);
      }),
      catchError((err) => {
        console.error('Error creating cross-branch request:', err);
        throw err;
      })
    );
  }

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

    return this.http.put<CrossBranchCheckInRequest>(
      `${this.BASE}/cross-branch-requests/${requestId}/approve`,
      approvalRequest
    ).pipe(
      tap(updatedRequest => {
        const requests = this.requestsSubject.value
          .map(r => r.id === requestId ? updatedRequest : r);
        this.requestsSubject.next(requests);

        const auditEntry: AuditLogEntryDTO = {
          id: uuidv4(),
          actor: {
            id: supervisorId,
            name: supervisorName,
            role: 'SUPERVISOR'
          },
          action: 'APPROVED',
          timestamp: new Date().toISOString(),
          details: `Supervisor approved cross-branch check-in request. Note: ${note || 'None'}`,
          ipAddress: cachedIpAddress || 'Unknown',
          userAgent: navigator.userAgent
        };
        this.addAuditLogEntry(auditEntry);
      }),
      catchError((err) => {
        console.error('Error approving cross-branch request:', err);
        throw err;
      })
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

    return this.http.put<CrossBranchCheckInRequest>(
      `${this.BASE}/cross-branch-requests/${requestId}/reject`,
      rejectionRequest
    ).pipe(
      tap(updatedRequest => {
        const requests = this.requestsSubject.value
          .map(r => r.id === requestId ? updatedRequest : r);
        this.requestsSubject.next(requests);

        const auditEntry: AuditLogEntryDTO = {
          id: uuidv4(),
          actor: {
            id: supervisorId,
            name: supervisorName,
            role: 'SUPERVISOR'
          },
          action: 'REJECTED',
          timestamp: new Date().toISOString(),
          details: `Supervisor rejected cross-branch check-in request. Reason: ${reason}`,
          ipAddress: cachedIpAddress || 'Unknown',
          userAgent: navigator.userAgent
        };
        this.addAuditLogEntry(auditEntry);
      }),
      catchError((err) => {
        console.error('Error rejecting cross-branch request:', err);
        throw err;
      })
    );
  }

  getOutstandingRequests(supervisorId: number): Observable<CrossBranchCheckInRequest[]> {
    return this.http.get<any>(
      `${this.BASE}/cross-branch-requests?supervisorId=${supervisorId}&status=PENDING`
    ).pipe(
      map(res => Array.isArray(res) ? res : (res?.requests ?? [])),
      catchError(() => of([]))
    );
  }

  getEmployeeAuditTrail(
    employeeId: number,
    startDate?: string,
    endDate?: string
  ): Observable<AuditLogEntryDTO[]> {
    let url = `${this.BASE}/audit-log/cross-branch?employeeId=${employeeId}`;

    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    return this.http.get<any>(url)
      .pipe(
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

    return this.http.post<CrossBranchCheckInRequest>(
      `${this.BASE}/cross-branch-requests/${requestId}/override`,
      overrideRequest
    ).pipe(
      tap(updatedRequest => {
        const requests = this.requestsSubject.value
          .map(r => r.id === requestId ? updatedRequest : r);
        this.requestsSubject.next(requests);

        const auditEntry: AuditLogEntryDTO = {
          id: uuidv4(),
          actor: {
            id: adminId,
            name: adminName,
            role: 'ADMIN'
          },
          action: 'OVERRIDDEN',
          timestamp: new Date().toISOString(),
          details: `Admin override on cross-branch request. Action: ${action}. Reason: ${reason}`,
          ipAddress: cachedIpAddress || 'Unknown',
          userAgent: navigator.userAgent
        };
        this.addAuditLogEntry(auditEntry);
      }),
      catchError((err) => {
        console.error('Error performing admin override:', err);
        throw err;
      })
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
    return this.http.post<any>(
      `${this.BASE}/cross-branch-requests/validate-proximity/${targetBranchId}`,
      body
    ).pipe(
      catchError(() => of({ isWithinRadius: false, distance: 999999 }))
    );
  }

  getRequestsByBranch(
    branchId: number,
    startDate?: string,
    endDate?: string
  ): Observable<CrossBranchCheckInRequest[]> {
    let url = `${this.BASE}/cross-branch-requests?branchId=${branchId}`;

    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    return this.http.get<any>(url)
      .pipe(
        map(res => Array.isArray(res) ? res : (res?.requests ?? [])),
        catchError(() => of([]))
      );
  }

  generateComplianceReport(startDate: string, endDate: string): Observable<any> {
    return this.http.get<any>(
      `${this.BASE}/cross-branch-reports?startDate=${startDate}&endDate=${endDate}`
    ).pipe(
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

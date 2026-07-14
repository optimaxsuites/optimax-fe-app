import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, timer } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';
import {
  CorrectionRequestDTO,
  CorrectionApprovalDTO,
  CorrectionSLADTO,
  CorrectionsStats,
  CorrectionStatus
} from '../../domain/attendance/correction-workflow.dto';
import { v4 as uuidv4 } from 'uuid';

let cachedIpAddress: string | null = null;

@Injectable({ providedIn: 'root' })
export class CorrectionRequestService {
  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/hr`;
  private requestsSubject = new BehaviorSubject<CorrectionRequestDTO[]>([]);
  private pendingRequestsSubject = new BehaviorSubject<CorrectionRequestDTO[]>([]);
  private slaTimers = new Map<string, NodeJS.Timeout>();

  requests$ = this.requestsSubject.asObservable();
  pendingRequests$ = this.pendingRequestsSubject.asObservable();

  readonly SLA_HOURS = 24; // 24-hour SLA for correction requests
  readonly SLA_MS = this.SLA_HOURS * 60 * 60 * 1000;

  constructor(private http: HttpClient) {}

  /**
   * Submit a new correction request
   */
  submitCorrectionRequest(
    attendanceRecordId: number,
    employeeId: number,
    correctionType: 'MISSING_IN' | 'MISSING_OUT' | 'WRONG_TIME' | 'OTHER',
    originalTime: string | null,
    requestedTime: string,
    reason: string,
    supportingDocs?: string[]
  ): Observable<CorrectionRequestDTO> {
    const request: CorrectionRequestDTO = {
      id: uuidv4(),
      attendanceRecordId,
      employeeId,
      requestedBy: employeeId,
      correctionType,
      originalTime: originalTime || undefined,
      requestedTime,
      reason,
      supportingDocs: supportingDocs || [],
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    return this.http.post<CorrectionRequestDTO>(
      `${this.BASE}/correction-requests`,
      request
    ).pipe(
      tap(savedRequest => {
        // Add to local list
        const requests = this.requestsSubject.value;
        this.requestsSubject.next([...requests, savedRequest]);

        // Start SLA timer
        this.startSLATimer(savedRequest.id);
      }),
      catchError((err) => {throw err;
      })
    );
  }

  /**
   * Get pending corrections for supervisor
   */
  getPendingForSupervisor(supervisorId: number): Observable<CorrectionRequestDTO[]> {
    return this.http.get<any>(
      `${this.BASE}/correction-requests/pending?supervisorId=${supervisorId}`
    ).pipe(
      map(res => Array.isArray(res) ? res : (res?.requests ?? [])),
      tap(requests => {
        this.pendingRequestsSubject.next(requests);

        // Start SLA timers for all
        requests.forEach(req => this.startSLATimer(req.id));
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Get corrections for employee
   */
  getEmployeeCorrectionRequests(employeeId: number): Observable<CorrectionRequestDTO[]> {
    return this.http.get<any>(
      `${this.BASE}/correction-requests/employee/${employeeId}`
    ).pipe(
      map(res => Array.isArray(res) ? res : (res?.requests ?? [])),
      catchError(() => of([]))
    );
  }

  /**
   * Approve correction request
   * Updates attendance record and moves to SUBMITTED status
   */
  approveCorrectionRequest(
    requestId: string,
    supervisorId: number,
    supervisorName: string,
    reviewerNotes?: string
  ): Observable<CorrectionRequestDTO> {
    this.fetchIpAddressIfNeeded();

    const approval: CorrectionApprovalDTO = {
      requestId,
      approvedBy: supervisorId,
      approverName: supervisorName,
      action: 'APPROVE',
      reviewerNotes,
      approvedAt: new Date().toISOString(),
      ipAddress: cachedIpAddress || 'Unknown',
      userAgent: navigator.userAgent
    };

    return this.http.post<CorrectionRequestDTO>(
      `${this.BASE}/correction-requests/${requestId}/approve`,
      approval
    ).pipe(
      tap(updated => {
        // Update local list
        const requests = this.requestsSubject.value
          .map(r => r.id === requestId ? updated : r);
        this.requestsSubject.next(requests);

        // Remove from pending
        const pending = this.pendingRequestsSubject.value
          .filter(r => r.id !== requestId);
        this.pendingRequestsSubject.next(pending);

        // Clear SLA timer
        this.clearSLATimer(requestId);

        // Notify employee
        this.notifyEmployee(updated.employeeId, 'CORRECTION_APPROVED',
          `Your correction request has been approved.`);
      }),
      catchError((err) => {throw err;
      })
    );
  }

  /**
   * Reject correction request
   * Returns to PENDING for employee to resubmit with evidence
   */
  rejectCorrectionRequest(
    requestId: string,
    supervisorId: number,
    supervisorName: string,
    rejectionReason: string,
    reviewerNotes?: string
  ): Observable<CorrectionRequestDTO> {
    this.fetchIpAddressIfNeeded();

    const approval: CorrectionApprovalDTO = {
      requestId,
      approvedBy: supervisorId,
      approverName: supervisorName,
      action: 'REJECT',
      rejectionReason,
      reviewerNotes,
      approvedAt: new Date().toISOString(),
      ipAddress: cachedIpAddress || 'Unknown',
      userAgent: navigator.userAgent
    };

    return this.http.post<CorrectionRequestDTO>(
      `${this.BASE}/correction-requests/${requestId}/reject`,
      approval
    ).pipe(
      tap(updated => {
        // Update local list
        const requests = this.requestsSubject.value
          .map(r => r.id === requestId ? updated : r);
        this.requestsSubject.next(requests);

        // Remove from pending
        const pending = this.pendingRequestsSubject.value
          .filter(r => r.id !== requestId);
        this.pendingRequestsSubject.next(pending);

        // Clear SLA timer
        this.clearSLATimer(requestId);

        // Notify employee to resubmit
        this.notifyEmployee(updated.employeeId, 'CORRECTION_REJECTED',
          `Your correction request was rejected. Reason: ${rejectionReason}`);
      }),
      catchError((err) => {throw err;
      })
    );
  }

  /**
   * Escalate correction to HR Admin (SLA breach)
   */
  escalateToHR(
    requestId: string,
    supervisorId: number,
    reason: string
  ): Observable<CorrectionRequestDTO> {
    const escalation = {
      requestId,
      escalatedBy: supervisorId,
      reason,
      escalatedAt: new Date().toISOString()
    };

    return this.http.post<CorrectionRequestDTO>(
      `${this.BASE}/correction-requests/${requestId}/escalate`,
      escalation
    ).pipe(
      tap(updated => {
        // Clear SLA timer
        this.clearSLATimer(requestId);

        // Notify HR Admin
        this.notifyHRAdmin('CORRECTION_ESCALATED',
          `Correction request ${requestId.substring(0, 8)}... escalated: ${reason}`);
      }),
      catchError((err) => {throw err;
      })
    );
  }

  /**
   * Get SLA information for a request
   */
  getSLA(requestId: string): Observable<CorrectionSLADTO> {
    return this.http.get<CorrectionSLADTO>(
      `${this.BASE}/correction-requests/${requestId}/sla`
    ).pipe(
      catchError(() => of({
        requestId,
        createdAt: new Date().toISOString(),
        slaDeadline: new Date(Date.now() + this.SLA_MS).toISOString(),
        isEscalated: false,
        timeRemainingMs: this.SLA_MS
      }))
    );
  }

  /**
   * Get statistics on corrections
   */
  getCorrectionStats(): Observable<CorrectionsStats> {
    return this.http.get<CorrectionsStats>(
      `${this.BASE}/correction-requests/stats`
    ).pipe(
      catchError(() => of({
        total: 0,
        pending: 0,
        underReview: 0,
        approved: 0,
        rejected: 0,
        averageResolutionTime: 0,
        slaBreach: 0
      }))
    );
  }

  /**
   * Start SLA timer for a request
   * Escalates to HR if deadline passes
   */
  private startSLATimer(requestId: string): void {
    // Clear existing timer
    this.clearSLATimer(requestId);

    // Set timer to check SLA in 1 minute (polling interval)
    const timer = setInterval(() => {
      this.getSLA(requestId).subscribe(sla => {
        if (sla.isEscalated && !sla.escalatedAt) {
          // SLA breached, notify HR
          this.notifyHRAdmin('CORRECTION_SLA_BREACH',
            `Correction request ${requestId.substring(0, 8)}... has exceeded 24-hour SLA`);

          // Mark as escalated in backend
          this.escalateToHR(requestId, 0, 'Automatic SLA escalation').subscribe();

          // Clear timer
          this.clearSLATimer(requestId);
        }
      });
    }, 60000); // Check every minute

    this.slaTimers.set(requestId, timer);
  }

  /**
   * Clear SLA timer
   */
  private clearSLATimer(requestId: string): void {
    const timer = this.slaTimers.get(requestId);
    if (timer) {
      clearInterval(timer);
      this.slaTimers.delete(requestId);
    }
  }

  /**
   * Get remaining time for SLA
   */
  getTimeRemainingForSLA(createdAt: string): number {
    const createdTime = new Date(createdAt).getTime();
    const deadline = createdTime + this.SLA_MS;
    return Math.max(0, deadline - Date.now());
  }

  /**
   * Check if SLA is breached
   */
  isSLABreached(createdAt: string): boolean {
    return this.getTimeRemainingForSLA(createdAt) <= 0;
  }

  /**
   * Get formatted time remaining
   */
  getTimeRemainingFormatted(createdAt: string): string {
    const remaining = this.getTimeRemainingForSLA(createdAt);
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  private fetchIpAddressIfNeeded(): void {
    if (!cachedIpAddress) {
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => { cachedIpAddress = data.ip || 'Unknown'; })
        .catch(() => { cachedIpAddress = 'Unknown'; });
    }
  }

  private notifyEmployee(employeeId: number, notificationType: string, message: string): void {
    // Notification service would handle this}

  private notifyHRAdmin(notificationType: string, message: string): void {
    // Notification service would handle this}
}


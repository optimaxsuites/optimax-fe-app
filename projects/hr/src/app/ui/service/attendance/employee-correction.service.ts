import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, catchError, switchMap, take } from 'rxjs/operators';
import { of } from 'rxjs';
import {
  CorrectionRequest,
  CreateCorrectionRequestBody
} from '../../domain/attendance/correctionrequest.dto';
import { CorrectionRequestApiService } from './correction-request-api.service';
import { UserSessionService } from './user-session.service';
import { EmployeeService } from '../employee.service';
import { AdminCorrectionApprovalService } from './admin-correction-approval.service';

@Injectable({
  providedIn: 'root'
})
export class EmployeeCorrectionService {
  private requestsSubject = new BehaviorSubject<CorrectionRequest[]>([]);
  requests$ = this.requestsSubject.asObservable();
  private initialized = false;

  private get requests(): CorrectionRequest[] {
    return this.requestsSubject.value;
  }

  constructor(
    private correctionApi: CorrectionRequestApiService,
    private userSession: UserSessionService,
    private employeeService: EmployeeService,
    private adminCorrections: AdminCorrectionApprovalService
  ) {}

  /** Submits as the logged-in employee (the form only knows a placeholder id) and refreshes the admin list. */
  submitForCurrentEmployee(request: CorrectionRequest): Observable<CorrectionRequest> {
    return this.employeeService.getEmployeeIdForCurrentUser().pipe(
      take(1),
      switchMap(employeeId => this.addRequest({ ...request, employeeId: String(employeeId) })),
      tap(() => this.adminCorrections.loadPendingApprovals())
    );
  }

  initialize() {
    if (this.initialized) return;
    this.initialized = true;

    // Paint from cache immediately, then refresh from the backend.
    this.loadRequestsFromStorage();

    this.correctionApi.getAllCorrectionRequests().subscribe({
      next: requests => {
        this.requestsSubject.next(requests);
        this.persistRequests();
      },
      error: error => console.error('Failed to load correction requests:', error)
    });
  }

  private loadRequestsFromStorage() {
    const cached: CorrectionRequest[] = JSON.parse(
      localStorage.getItem('correctionRequests') || '[]'
    );
    // Convert date strings back to Date objects
    const normalized = cached.map((r: any) => ({
      ...r,
      date: r.date ? new Date(r.date) : new Date(),
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined,
      requestedClockIn: r.requestedClockIn ? new Date(r.requestedClockIn) : undefined,
      requestedClockOut: r.requestedClockOut ? new Date(r.requestedClockOut) : undefined
    }));
    this.requestsSubject.next(normalized);
  }

  addRequest(request: CorrectionRequest): Observable<CorrectionRequest> {
    return this.correctionApi.submitCorrectionRequest(this.toCreateBody(request)).pipe(
      tap(created => {
        this.requestsSubject.next([created, ...this.requests]);
        this.persistRequests();
      }),
      catchError(error => {
        console.error('Failed to submit correction request:', error);
        throw error;
      })
    );
  }

  startReview(id: string, actorName = 'Supervisor'): Observable<CorrectionRequest | null> {
    const request = this.requests.find(r => r.id === id);
    if (!request || request.locked || request.status !== 'PENDING') {
      return of(null);
    }

    return this.correctionApi.updateStatus(id, {
      newStatus: 'UNDER_REVIEW',
      actorUserId: this.currentActorId(),
      comments: 'Supervisor is reviewing the correction request.'
    }).pipe(
      tap(updated => this.applyUpdate(updated)),
      catchError(error => {
        console.error('Failed to start review:', error);
        throw error;
      })
    );
  }

  approveRequest(id: string, actorName = 'Supervisor', comment?: string): Observable<CorrectionRequest> {
    return this.correctionApi.updateStatus(id, {
      newStatus: 'SUBMITTED',
      actorUserId: this.currentActorId(),
      comments: comment || 'Correction approved and attendance record updated.'
    }).pipe(
      tap(updated => this.applyUpdate(updated)),
      catchError(error => {
        console.error('Failed to approve correction request:', error);
        throw error;
      })
    );
  }

  rejectRequest(id: string, actorName: string, reason: string): Observable<CorrectionRequest> {
    return this.correctionApi.updateStatus(id, {
      newStatus: 'REJECTED',
      actorUserId: this.currentActorId(),
      comments: reason
    }).pipe(
      tap(updated => this.applyUpdate(updated)),
      catchError(error => {
        console.error('Failed to reject correction request:', error);
        throw error;
      })
    );
  }

  /**
   * The correction-requests API only supports a status transition (no evidence field on
   * PUT /{id}/status), so resubmission is modeled as moving the request back to PENDING.
   */
  resubmitRequest(id: string, evidence: string): Observable<CorrectionRequest> {
    return this.correctionApi.updateStatus(id, {
      newStatus: 'PENDING',
      actorUserId: this.currentActorId(),
      comments: `Resubmitted with additional evidence: ${evidence}`
    }).pipe(
      tap(updated => this.applyUpdate(updated)),
      catchError(error => {
        console.error('Failed to resubmit correction request:', error);
        throw error;
      })
    );
  }

  updateRequest(id: string, changes: Partial<CorrectionRequest>) {
    const updated = this.requests.map(req =>
      req.id === id && !req.locked
        ? { ...req, ...changes, updatedAt: new Date() }
        : req
    );
    this.requestsSubject.next(updated);
    this.persistRequests();
  }

  deleteRequest(id: string): Observable<void> {
    return this.correctionApi.withdrawCorrectionRequest(id).pipe(
      tap(() => {
        const filtered = this.requests.filter(req => req.id !== id);
        this.requestsSubject.next(filtered);
        this.persistRequests();
      }),
      catchError(error => {
        console.error('Failed to delete correction request:', error);
        throw error;
      })
    );
  }

  canStartReview(request: CorrectionRequest): boolean {
    return !request.locked && request.status === 'PENDING';
  }

  canApproveOrReject(request: CorrectionRequest): boolean {
    return !request.locked && request.status === 'UNDER_REVIEW';
  }

  canResubmit(request: CorrectionRequest): boolean {
    return !request.locked && request.status === 'REJECTED';
  }

  getRequests(): Observable<CorrectionRequest[]> {
    return this.requests$;
  }

  private applyUpdate(updated: CorrectionRequest) {
    const newRequests = this.requests.map(req => req.id === updated.id ? updated : req);
    this.requestsSubject.next(newRequests);
    this.persistRequests();
  }

  private toCreateBody(request: CorrectionRequest): CreateCorrectionRequestBody {
    return {
      employeeId: Number(request.employeeId),
      attendanceDate: this.toLocalDateTime(request.date),
      // The form's issue type is really a correction type; the backend's issueType for a missed clock is MISSED_CLOCK.
      issueType: request.correctionType === 'MISSING_IN' || request.correctionType === 'MISSING_OUT'
        ? 'MISSED_CLOCK'
        : request.issueType,
      correctionType: request.correctionType,
      requestedClockIn: request.requestedClockIn ? this.toIso(request.requestedClockIn) : undefined,
      requestedClockOut: request.requestedClockOut ? this.toIso(request.requestedClockOut) : undefined,
      description: request.description,
      evidence: request.evidence
    };
  }

  // Calendar date as local midnight with no zone, so UTC conversion can't move it to another day.
  private toLocalDateTime(value: Date | string): string {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00`;
    const d = value instanceof Date ? value : new Date(value);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00:00`;
  }

  // Local wall-clock with no zone: the backend stores LocalDateTime, so a Z or offset would shift or break it.
  private toIso(value: Date | string): string {
    const d = value instanceof Date ? value : new Date(value);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  private currentActorId(): number {
    return this.userSession.getCurrentUser()?.userId ?? 0;
  }

  private persistRequests() {
    try {
      localStorage.setItem('correctionRequests', JSON.stringify(this.requests));
    } catch (e) {
      console.warn('Failed to persist correction requests to localStorage', e);
    }
  }
}

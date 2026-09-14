import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import {
  CorrectionRequest,
  CorrectionRequestHistory,
  CorrectionStatus
} from '../../domain/attendance/correctionrequest.dto';
import { CorrectionRequestApiService } from './correction-request-api.service';

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

  constructor(private correctionApi: CorrectionRequestApiService) {}

  initialize() {
    if (this.initialized) return;
    this.initialized = true;
    this.loadRequestsFromStorage();
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
    const now = new Date();
    const preparedRequest: CorrectionRequest = {
      ...request,
      status: 'PENDING',
      locked: false,
      rejectionReason: undefined,
      latestNotification: 'Supervisor notified of new correction request.',
      history: [
        this.createHistory('PENDING', 'Employee', 'Correction request submitted.')
      ],
      createdAt: request.createdAt || now,
      updatedAt: now
    };

    // Submit to backend API
    return this.correctionApi.submitCorrectionRequest(preparedRequest).pipe(
      tap(created => {
        // Update local state with API response
        this.requestsSubject.next([created, ...this.requests]);
        this.persistRequests();
      }),
      catchError(error => {
        console.error('Failed to submit correction request:', error);
        // Fall back to local storage only
        this.requestsSubject.next([preparedRequest, ...this.requests]);
        this.persistRequests();
        throw error;
      })
    );
  }

  startReview(id: string, supervisorName = 'Supervisor') {
    this.transitionRequest(id, request => {
      if (request.locked || request.status !== 'PENDING') {
        return request;
      }

      return this.withTransition(
        request,
        'UNDER_REVIEW',
        supervisorName,
        'Supervisor is reviewing the correction request.',
        'Employee notified: correction request is under review.'
      );
    });
  }

  approveRequest(id: string, supervisorName = 'Supervisor', comment?: string): Observable<CorrectionRequest> {
    return this.correctionApi.approveCorrectionRequest(id, supervisorName, comment).pipe(
      tap(approved => {
        // Update local state with approved request
        const updated = this.requests.map(r => r.id === id ? approved : r);
        this.requestsSubject.next(updated);
        this.persistRequests();
      }),
      catchError(error => {
        console.error('Failed to approve correction request:', error);
        throw error;
      })
    );
  }

  rejectRequest(id: string, supervisorName: string, reason: string): Observable<CorrectionRequest> {
    return this.correctionApi.rejectCorrectionRequest(id, supervisorName, reason).pipe(
      tap(rejected => {
        // Update local state with rejected request
        const updated = this.requests.map(r => r.id === id ? rejected : r);
        this.requestsSubject.next(updated);
        this.persistRequests();
      }),
      catchError(error => {
        console.error('Failed to reject correction request:', error);
        throw error;
      })
    );
  }

  resubmitRequest(id: string, evidence: string): Observable<CorrectionRequest> {
    return this.correctionApi.resubmitCorrectionRequest(id, evidence).pipe(
      tap(resubmitted => {
        // Update local state with resubmitted request
        const updated = this.requests.map(r => r.id === id ? resubmitted : r);
        this.requestsSubject.next(updated);
        this.persistRequests();
      }),
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
    // Ensure dates are Date objects before emitting
    const dateAwareUpdated = updated.map(u => ({
      ...u,
      createdAt: u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt),
      updatedAt: u.updatedAt instanceof Date ? u.updatedAt : (u.updatedAt ? new Date(u.updatedAt) : undefined),
      date: u.date instanceof Date ? u.date : new Date(u.date),
      requestedClockIn: u.requestedClockIn instanceof Date ? u.requestedClockIn : (u.requestedClockIn ? new Date(u.requestedClockIn) : undefined),
      requestedClockOut: u.requestedClockOut instanceof Date ? u.requestedClockOut : (u.requestedClockOut ? new Date(u.requestedClockOut) : undefined)
    }));
    this.requestsSubject.next(dateAwareUpdated);
    this.persistRequests();
  }

  deleteRequest(id: string) {
    const filtered = this.requests.filter(req => req.id !== id);
    this.requestsSubject.next(filtered);
    this.persistRequests();
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

  private transitionRequest(id: string, transition: (request: CorrectionRequest) => CorrectionRequest) {
    const request = this.requests.find(r => r.id === id);
    if (!request) return;

    const updated = transition(request);
    const newRequests = this.requests.map(req => req.id === id ? updated : req);
    this.requestsSubject.next(newRequests);
    this.persistRequests();
  }

  private persistRequests() {
    try {
      localStorage.setItem('correctionRequests', JSON.stringify(this.requests));
    } catch (e) {
      console.warn('Failed to persist correction requests to localStorage', e);
    }
  }

  private withTransition(
    request: CorrectionRequest,
    status: CorrectionStatus,
    actor: string,
    note: string,
    latestNotification: string
  ): CorrectionRequest {
    return {
      ...request,
      status,
      latestNotification,
      history: [
        ...(request.history || []),
        this.createHistory(status, actor, note)
      ],
      updatedAt: new Date()
    };
  }

  private createHistory(
    status: CorrectionStatus,
    actor: string,
    note: string
  ): CorrectionRequestHistory {
    return {
      createdAt: new Date(),
      status,
      actor,
      note
    };
  }
}

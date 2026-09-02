import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  CorrectionRequest,
  CorrectionRequestHistory,
  CorrectionStatus
} from '../../domain/attendance/correctionrequest.dto';

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

  constructor() {}

  initialize() {
    if (this.initialized) return;
    this.initialized = true;
    this.loadRequestsFromStorage();
  }

  private loadRequestsFromStorage() {
    const cached: any[] = JSON.parse(
      localStorage.getItem('correctionRequests') || '[]'
    );
    // Convert date strings back to Date objects
    const requests: CorrectionRequest[] = cached.map(r => ({
      ...r,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined,
      date: r.date ? new Date(r.date) : new Date(),
      requestedClockIn: r.requestedClockIn ? new Date(r.requestedClockIn) : undefined,
      requestedClockOut: r.requestedClockOut ? new Date(r.requestedClockOut) : undefined
    }));
    this.requestsSubject.next(requests);
  }

  addRequest(request: CorrectionRequest) {
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

    this.requestsSubject.next([preparedRequest, ...this.requests]);
    this.persistRequests();
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

  approveRequest(id: string, supervisorName = 'Supervisor', comment?: string) {
    this.transitionRequest(id, request => {
      if (request.locked || (request.status !== 'UNDER_REVIEW' && request.status !== 'PENDING')) {
        return request;
      }

      return {
        ...this.withTransition(
          request,
          'SUBMITTED',
          supervisorName,
          comment || 'Correction approved and attendance record updated.',
          'Employee notified: correction request approved and submitted.'
        ),
        locked: true
      };
    });
  }

  rejectRequest(id: string, supervisorName: string, reason: string) {
    this.transitionRequest(id, request => {
      if (request.locked || (request.status !== 'UNDER_REVIEW' && request.status !== 'PENDING')) {
        return request;
      }

      return {
        ...this.withTransition(
          request,
          'REJECTED',
          supervisorName,
          reason,
          'Employee notified: correction request rejected. More evidence may be submitted.'
        ),
        rejectionReason: reason,
        locked: false
      };
    });
  }

  resubmitRequest(id: string, evidence: string) {
    this.transitionRequest(id, request => {
      if (request.locked || request.status !== 'REJECTED') {
        return request;
      }

      const mergedEvidence = (request.evidence ? request.evidence + '\n\n' : '') +
        'Resubmission evidence:\n' + evidence;

      return {
        ...this.withTransition(
          request,
          'PENDING',
          'Employee',
          'Correction request resubmitted with additional evidence.',
          'Supervisor notified of resubmitted correction request.'
        ),
        evidence: mergedEvidence,
        rejectionReason: undefined,
        locked: false
      };
    });
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
      // Convert Date objects to ISO strings for localStorage
      const serializableRequests = this.requests.map(r => ({
        ...r,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
        date: r.date instanceof Date ? r.date.toISOString() : r.date
      }));
      localStorage.setItem('correctionRequests', JSON.stringify(serializableRequests));
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

  private createHistory(status: CorrectionStatus, actor: string, note?: string): CorrectionRequestHistory {
    return {
      status,
      actor,
      note,
      createdAt: new Date()
    };
  }
}

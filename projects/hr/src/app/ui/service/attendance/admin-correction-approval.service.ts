import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AttendanceTableRecord } from '../../domain/attendance/attendancetable.dto';
import { CorrectionRequest, CorrectionType, CreateCorrectionRequestBody } from '../../domain/attendance/correctionrequest.dto';
import { CorrectionRequestApiService } from './correction-request-api.service';
import { UserSessionService } from './user-session.service';

export interface CorrectionRequestSubmission {
  employeeId: string;
  employeeName: string;
  recordId: number;
  type: CorrectionType;
  reason: string;
  currentStatus: string;
  requestedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminCorrectionApprovalService {
  private readonly STORAGE_KEY = 'correctionRequests';
  private correctionRequestsSubject = new BehaviorSubject<CorrectionRequest[]>([]);
  public correctionRequests$ = this.correctionRequestsSubject.asObservable();

  constructor(
    private correctionApi: CorrectionRequestApiService,
    private userSession: UserSessionService
  ) {
    this.loadFromStorage();
    this.loadPendingApprovals();
  }

  /**
   * Load all correction requests from the backend (no dedicated "pending" sub-route exists
   * for this resource, so pending is derived client-side).
   */
  loadPendingApprovals(): void {
    this.correctionApi.getAllCorrectionRequests().subscribe({
      next: (requests: CorrectionRequest[]) => {
        this.correctionRequestsSubject.next(requests);
        this.saveToStorage(requests);
      },
      error: error => {
        console.error('Failed to load correction requests:', error);
        // Fall back to localStorage
        this.loadFromStorage();
      }
    });
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const requests: CorrectionRequest[] = JSON.parse(stored);
        // Convert date strings back to Date objects
        const normalized = requests.map((req: any) => ({
          ...req,
          date: req.date ? new Date(req.date) : new Date(),
          createdAt: req.createdAt ? new Date(req.createdAt) : new Date(),
          updatedAt: req.updatedAt ? new Date(req.updatedAt) : undefined,
          requestedClockIn: req.requestedClockIn ? new Date(req.requestedClockIn) : undefined,
          requestedClockOut: req.requestedClockOut ? new Date(req.requestedClockOut) : undefined,
          history: (req.history || []).map((h: any) => ({
            ...h,
            createdAt: h.createdAt ? new Date(h.createdAt) : new Date()
          }))
        }));
        this.correctionRequestsSubject.next(normalized);
      }
    } catch (e) {
      console.error('Failed to load correction requests from storage:', e);
    }
  }

  private saveToStorage(requests?: CorrectionRequest[]): void {
    try {
      const toSave = requests || this.correctionRequestsSubject.value;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error('Failed to save correction requests:', e);
    }
  }

  submitCorrectionRequest(
    submission: CorrectionRequestSubmission,
    attendanceRecord?: AttendanceTableRecord
  ): Observable<CorrectionRequest> {
    const body: CreateCorrectionRequestBody = {
      employeeId: Number(submission.employeeId),
      attendanceDate: (attendanceRecord?.date instanceof Date ? attendanceRecord.date : new Date()).toISOString(),
      issueType: submission.type,
      correctionType: submission.type,
      description: submission.reason
    };

    return this.correctionApi.submitCorrectionRequest(body).pipe(
      tap((created) => {
        const current = this.correctionRequestsSubject.value;
        this.correctionRequestsSubject.next([created, ...current]);
        this.saveToStorage();
      }),
      catchError(error => {
        console.error('Failed to submit correction request:', error);
        throw error;
      })
    );
  }

  approveCorrectionRequest(recordId: number | string, adminName: string): Observable<CorrectionRequest> {
    const idStr = recordId.toString();
    const requests = this.correctionRequestsSubject.value;
    const requestIndex = requests.findIndex(r => r.id === idStr);

    if (requestIndex === -1) {
      return throwError(() => new Error('Correction request not found'));
    }

    return this.decide(idStr, 'SUBMITTED', `Approved by ${adminName}`).pipe(
      tap(approved => {
        const updated = [...requests];
        updated[requestIndex] = approved;
        this.correctionRequestsSubject.next(updated);
        this.saveToStorage();
      }),
      catchError(error => {
        console.error('Failed to approve correction request:', error);
        throw error;
      })
    );
  }

  rejectCorrectionRequest(recordId: number | string, reason: string, adminName: string = 'Admin'): Observable<CorrectionRequest> {
    const idStr = recordId.toString();
    const requests = this.correctionRequestsSubject.value;
    const requestIndex = requests.findIndex(r => r.id === idStr);

    if (requestIndex === -1) {
      return throwError(() => new Error('Correction request not found'));
    }

    return this.decide(idStr, 'REJECTED', reason).pipe(
      tap(rejected => {
        const updated = [...requests];
        updated[requestIndex] = rejected;
        this.correctionRequestsSubject.next(updated);
        this.saveToStorage();
      }),
      catchError(error => {
        console.error('Failed to reject correction request:', error);
        throw error;
      })
    );
  }

  deleteCorrectionRequest(recordId: number | string): Observable<void> {
    const idStr = recordId.toString();
    return this.correctionApi.withdrawCorrectionRequest(idStr).pipe(
      tap(() => {
        const requests = this.correctionRequestsSubject.value;
        const filtered = requests.filter(r => r.id !== idStr);
        this.correctionRequestsSubject.next(filtered);
        this.saveToStorage();
      }),
      catchError(error => {
        console.error('Failed to delete correction request:', error);
        throw error;
      })
    );
  }

  getPendingRequests(): CorrectionRequest[] {
    return this.correctionRequestsSubject.value.filter(
      r => r.status === 'PENDING'
    );
  }

  getAllRequests(): CorrectionRequest[] {
    return this.correctionRequestsSubject.value;
  }

  clearRequests(): void {
    this.correctionRequestsSubject.next([]);
    this.saveToStorage();
  }

  // Approve is one call to SUBMITTED, reject is one call to REJECTED; no intermediate review step.
  private decide(
    id: string,
    newStatus: 'SUBMITTED' | 'REJECTED',
    comments: string
  ): Observable<CorrectionRequest> {
    return this.correctionApi.updateStatus(id, {
      newStatus,
      actorUserId: this.currentActorId(),
      comments
    });
  }

  private currentActorId(): number {
    return this.userSession.getCurrentUser()?.userId ?? 0;
  }
}

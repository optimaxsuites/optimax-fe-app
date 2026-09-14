import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AttendanceTableRecord } from '../../domain/attendance/attendancetable.dto';
import { CorrectionRequest, CorrectionType } from '../../domain/attendance/correctionrequest.dto';
import { CorrectionRequestApiService } from './correction-request-api.service';

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

  constructor(private correctionApi: CorrectionRequestApiService) {
    this.loadPendingApprovals();
  }

  /**
   * Load pending corrections from backend API
   */
  loadPendingApprovals(): void {
    this.correctionApi.getPendingApprovals().subscribe(
      (requests: CorrectionRequest[]) => {
        this.correctionRequestsSubject.next(requests);
        this.saveToStorage(requests);
      },
      error => {
        console.error('Failed to load pending approvals:', error);
        // Fall back to localStorage
        this.loadFromStorage();
      }
    );
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
    // Build a CorrectionRequest from submission
    const correctionRequest: CorrectionRequest = {
      id: `${Date.now()}`,
      employeeId: submission.employeeId,
      employeeName: submission.employeeName,
      department: attendanceRecord?.department || '',
      date: attendanceRecord?.date || new Date(),
      issueType: submission.type as any,
      correctionType: submission.type,
      description: submission.reason,
      status: 'PENDING',
      locked: false,
      history: [],
      createdAt: new Date()
    };

    return this.correctionApi.submitCorrectionRequest(correctionRequest).pipe(
      tap((created) => {
        // Add to local list
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

    // Call API to approve
    return this.correctionApi.approveCorrectionRequest(idStr, adminName).pipe(
      tap(approved => {
        // Update local state
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

    // Call API to reject
    return this.correctionApi.rejectCorrectionRequest(idStr, adminName, reason).pipe(
      tap(rejected => {
        // Update local state
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

  deleteCorrectionRequest(recordId: number | string): void {
    const recordIdStr = recordId.toString();
    const requests = this.correctionRequestsSubject.value;
    const filtered = requests.filter(r => r.id !== recordIdStr);
    this.correctionRequestsSubject.next(filtered);
    this.saveToStorage();
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
}

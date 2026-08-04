import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AttendanceTableRecord } from '../../domain/attendance/attendancetable.dto';

export interface CorrectionRequestSubmission {
  employeeId: number;
  employeeName: string;
  recordId: number;
  type: 'TIME_CORRECTION' | 'STATUS_CORRECTION' | 'LOCATION_CORRECTION';
  reason: string;
  currentStatus: string;
  requestedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class CorrectionRequestService {
  private readonly STORAGE_KEY = 'correctionRequests';
  private correctionRequestsSubject = new BehaviorSubject<AttendanceTableRecord[]>([]);
  public correctionRequests$ = this.correctionRequestsSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.correctionRequestsSubject.next(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load correction requests:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.correctionRequestsSubject.value));
    } catch (e) {
      console.error('Failed to save correction requests:', e);
    }
  }

  submitCorrectionRequest(submission: CorrectionRequestSubmission, attendanceRecord: AttendanceTableRecord): void {
    const updatedRecord = {
      ...attendanceRecord,
      correctionRequest: {
        id: Date.now(),
        type: submission.type,
        reason: submission.reason,
        status: 'PENDING' as const,
        requestedAt: submission.requestedAt,
        requestedBy: submission.employeeName
      }
    };

    const currentRequests = this.correctionRequestsSubject.value;
    const existingIndex = currentRequests.findIndex(r => r.id === updatedRecord.id);

    if (existingIndex > -1) {
      currentRequests[existingIndex] = updatedRecord;
    } else {
      currentRequests.push(updatedRecord);
    }

    this.correctionRequestsSubject.next([...currentRequests]);
    this.saveToStorage();
  }

  approveCorrectionRequest(recordId: number, adminName: string): void {
    const requests = this.correctionRequestsSubject.value;
    const record = requests.find(r => r.id === recordId);

    if (record && record.correctionRequest) {
      record.correctionRequest.status = 'APPROVED';
      record.correctionRequest.approvedBy = adminName;
      record.status = 'PRESENT';
      this.correctionRequestsSubject.next([...requests]);
      this.saveToStorage();
    }
  }

  rejectCorrectionRequest(recordId: number, reason: string): void {
    const requests = this.correctionRequestsSubject.value;
    const record = requests.find(r => r.id === recordId);

    if (record && record.correctionRequest) {
      record.correctionRequest.status = 'REJECTED';
      record.correctionRequest.rejectionReason = reason;
      this.correctionRequestsSubject.next([...requests]);
      this.saveToStorage();
    }
  }

  deleteCorrectionRequest(recordId: number): void {
    const requests = this.correctionRequestsSubject.value;
    const filtered = requests.filter(r => r.id !== recordId);
    this.correctionRequestsSubject.next(filtered);
    this.saveToStorage();
  }

  getPendingRequests(): AttendanceTableRecord[] {
    return this.correctionRequestsSubject.value.filter(
      r => r.correctionRequest?.status === 'PENDING'
    );
  }

  getAllRequests(): AttendanceTableRecord[] {
    return this.correctionRequestsSubject.value;
  }

  clearRequests(): void {
    this.correctionRequestsSubject.next([]);
    this.saveToStorage();
  }
}

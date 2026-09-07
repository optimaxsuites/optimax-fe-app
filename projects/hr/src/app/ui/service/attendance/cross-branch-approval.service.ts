import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AttendanceTableRecord } from '../../domain/attendance/attendancetable.dto';

export interface CrossBranchApprovalSubmission {
  employeeId: number;
  employeeName: string;
  recordId: number;
  homeBranchId: number;
  homeBranchName: string;
  checkedInBranchId: number;
  checkedInBranchName: string;
  detectedAt: string; // When system detected cross-branch
}

@Injectable({
  providedIn: 'root'
})
export class CrossBranchApprovalService {
  private readonly STORAGE_KEY = 'crossBranchApprovals';
  private crossBranchRecordsSubject = new BehaviorSubject<AttendanceTableRecord[]>([]);
  public crossBranchRecords$ = this.crossBranchRecordsSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const records = JSON.parse(stored);
        // Convert date strings back to Date objects
        const normalized = records.map((record: any) => ({
          ...record,
          date: record.date ? new Date(record.date) : null
        }));
        this.crossBranchRecordsSubject.next(normalized);
      }
    } catch (e) {
      console.error('Failed to load cross-branch approvals:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.crossBranchRecordsSubject.value));
    } catch (e) {
      console.error('Failed to save cross-branch approvals:', e);
    }
  }

  /**
   * Flag a record as cross-branch (called when employee clocks in at different branch)
   */
  flagCrossBranchRecord(submission: CrossBranchApprovalSubmission, attendanceRecord: AttendanceTableRecord): void {
    const updatedRecord = {
      ...attendanceRecord,
      isCrossBranchAttendance: true,
      homeBranchId: submission.homeBranchId,
      homeBranchName: submission.homeBranchName,
      checkedInBranchId: submission.checkedInBranchId,
      checkedInBranchName: submission.checkedInBranchName,
      crossBranchApprovalStatus: 'PENDING' as const,
      crossBranchRequestId: `CB-${Date.now()}` // Generate unique ID
    };

    const currentRecords = this.crossBranchRecordsSubject.value;
    const existingIndex = currentRecords.findIndex(r => r.id === updatedRecord.id);

    if (existingIndex > -1) {
      currentRecords[existingIndex] = updatedRecord;
    } else {
      currentRecords.push(updatedRecord);
    }

    this.crossBranchRecordsSubject.next([...currentRecords]);
    this.saveToStorage();
  }

  /**
   * Approve cross-branch attendance (admin action)
   */
  approveCrossBranch(recordId: number, adminName: string, note?: string): void {
    const records = this.crossBranchRecordsSubject.value;
    const record = records.find(r => r.id === recordId);

    if (record && record.isCrossBranchAttendance) {
      record.crossBranchApprovalStatus = 'APPROVED';
      
      // Add correction request-like tracking
      record.correctionRequest = {
        ...record.correctionRequest,
        type: 'LOCATION_CORRECTION',
        reason: `Cross-branch attendance approved: ${record.homeBranchName} → ${record.checkedInBranchName}`,
        status: 'APPROVED',
        requestedAt: record.date || new Date(),
        requestedBy: record.employee,
        approvedBy: adminName,
        approvalNotes: note || 'Cross-branch attendance approved'
      };

      this.crossBranchRecordsSubject.next([...records]);
      this.saveToStorage();
    }
  }

  /**
   * Reject cross-branch attendance (admin action)
   */
  rejectCrossBranch(recordId: number, adminName: string, reason: string): void {
    const records = this.crossBranchRecordsSubject.value;
    const record = records.find(r => r.id === recordId);

    if (record && record.isCrossBranchAttendance) {
      record.crossBranchApprovalStatus = 'REJECTED';
      
      // Mark as rejected with reason
      record.correctionRequest = {
        ...record.correctionRequest,
        type: 'LOCATION_CORRECTION',
        reason: `Unauthorized cross-branch attendance: ${record.homeBranchName} → ${record.checkedInBranchName}`,
        status: 'REJECTED',
        requestedAt: record.date || new Date(),
        requestedBy: record.employee,
        approvedBy: adminName,
        rejectionReason: reason
      };

      // Optionally mark attendance as ABSENT or invalid
      // record.status = 'ABSENT';

      this.crossBranchRecordsSubject.next([...records]);
      this.saveToStorage();
    }
  }

  /**
   * Get all pending cross-branch records (for admin queue)
   */
  getPendingCrossBranchRecords(): AttendanceTableRecord[] {
    return this.crossBranchRecordsSubject.value.filter(
      r => r.isCrossBranchAttendance && r.crossBranchApprovalStatus === 'PENDING'
    );
  }

  /**
   * Get all cross-branch records (approved, rejected, pending)
   */
  getAllCrossBranchRecords(): AttendanceTableRecord[] {
    return this.crossBranchRecordsSubject.value.filter(
      r => r.isCrossBranchAttendance
    );
  }

  /**
   * Get cross-branch records by employee
   */
  getCrossBranchByEmployee(employeeId: string): AttendanceTableRecord[] {
    return this.crossBranchRecordsSubject.value.filter(
      r => r.employeeId === employeeId && r.isCrossBranchAttendance
    );
  }

  /**
   * Get cross-branch records by date range
   */
  getCrossBranchByDateRange(startDate: Date, endDate: Date): AttendanceTableRecord[] {
    return this.crossBranchRecordsSubject.value.filter(
      r => r.isCrossBranchAttendance && 
           r.date && 
           r.date >= startDate && 
           r.date <= endDate
    );
  }

  /**
   * Remove a cross-branch record
   */
  deleteCrossBranchRecord(recordId: number): void {
    const records = this.crossBranchRecordsSubject.value;
    const filtered = records.filter(r => r.id !== recordId);
    this.crossBranchRecordsSubject.next(filtered);
    this.saveToStorage();
  }

  /**
   * Clear all cross-branch records
   */
  clearRecords(): void {
    this.crossBranchRecordsSubject.next([]);
    this.saveToStorage();
  }

  /**
   * Get statistics for cross-branch attendance
   */
  getCrossBranchStats(): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  } {
    const records = this.crossBranchRecordsSubject.value;
    return {
      total: records.length,
      pending: records.filter(r => r.crossBranchApprovalStatus === 'PENDING').length,
      approved: records.filter(r => r.crossBranchApprovalStatus === 'APPROVED').length,
      rejected: records.filter(r => r.crossBranchApprovalStatus === 'REJECTED').length
    };
  }
}

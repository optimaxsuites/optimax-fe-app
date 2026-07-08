import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';
import {
  AttendanceRecordDTO,
  RecordStatus,
  ShiftDTO,
  ScheduleDTO
} from '../../domain/attendance/attendance-event.dto';

@Injectable({ providedIn: 'root' })
export class AttendanceRecordService {
  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/hr`;
  private recordsSubject = new BehaviorSubject<AttendanceRecordDTO[]>([]);

  records$ = this.recordsSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get or create attendance record for employee on specific date
   */
  getOrCreateRecord(
    employeeId: number,
    workDate: string
  ): Observable<AttendanceRecordDTO> {
    return this.http.get<AttendanceRecordDTO>(
      `${this.BASE}/attendance-records/employee/${employeeId}?date=${workDate}`
    ).pipe(
      catchError(() => {
        // Create new record if doesn't exist
        return this.http.post<AttendanceRecordDTO>(
          `${this.BASE}/attendance-records`,
          {
            employeeId,
            workDate,
            status: 'DRAFT',
            isCrossBranch: false,
            fraudFlags: []
          }
        );
      })
    );
  }

  /**
   * Update attendance record with clock-in/out times
   */
  updateRecord(
    recordId: number,
    updates: Partial<AttendanceRecordDTO>
  ): Observable<AttendanceRecordDTO> {
    return this.http.put<AttendanceRecordDTO>(
      `${this.BASE}/attendance-records/${recordId}`,
      updates
    ).pipe(
      tap(updated => {
        const records = this.recordsSubject.value;
        const index = records.findIndex(r => r.id === recordId);
        if (index >= 0) {
          records[index] = updated;
          this.recordsSubject.next([...records]);
        }
      }),
      catchError((err) => {
        console.error('Error updating attendance record:', err);
        throw err;
      })
    );
  }

  /**
   * Get all records for employee
   */
  getRecordsByEmployee(employeeId: number): Observable<AttendanceRecordDTO[]> {
    return this.http.get<any>(
      `${this.BASE}/attendance-records/employee/${employeeId}`
    ).pipe(
      map(res => Array.isArray(res) ? res : (res?.records ?? [])),
      tap(records => {
        const current = this.recordsSubject.value;
        const filtered = current.filter(r => r.employeeId !== employeeId);
        this.recordsSubject.next([...filtered, ...records]);
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Get records for date range
   */
  getRecordsByDateRange(
    employeeId: number,
    startDate: string,
    endDate: string
  ): Observable<AttendanceRecordDTO[]> {
    return this.http.get<any>(
      `${this.BASE}/attendance-records/employee/${employeeId}?startDate=${startDate}&endDate=${endDate}`
    ).pipe(
      map(res => Array.isArray(res) ? res : (res?.records ?? [])),
      catchError(() => of([]))
    );
  }

  /**
   * Calculate metrics based on shift definition
   */
  calculateMetrics(
    record: AttendanceRecordDTO,
    shift: ShiftDTO
  ): Partial<AttendanceRecordDTO> {
    if (!record.clockInTime || !record.clockOutTime) {
      return { isAbsent: true };
    }

    const clockIn = new Date(record.clockInTime);
    const clockOut = new Date(record.clockOutTime);
    const shiftStart = this.parseTimeToDate(record.workDate, shift.startTime);
    const shiftEnd = this.parseTimeToDate(record.workDate, shift.endTime);

    // Handle overnight shifts
    let adjustedShiftEnd = shiftEnd;
    if (shift.isOvernight && shiftEnd < shiftStart) {
      adjustedShiftEnd = new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    // Calculate totals
    const totalMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);
    const totalHours = totalMinutes / 60;

    // Check if late
    const graceThreshold = new Date(shiftStart.getTime() + (shift.graceMinutes || 10) * 60 * 1000);
    const isLate = clockIn > graceThreshold;
    const lateMinutes = isLate ? Math.floor((clockIn.getTime() - shiftStart.getTime()) / (1000 * 60)) : 0;

    // Calculate undertime
    const scheduledMinutes = (adjustedShiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60);
    const undertimeMinutes = Math.max(0, scheduledMinutes - totalMinutes);
    const undertimeHours = undertimeMinutes / 60;

    // Calculate overtime (after OT threshold from shift end)
    const otThresholdTime = new Date(adjustedShiftEnd.getTime() + (shift.otThresholdMinutes || 30) * 60 * 1000);
    const overtimeMinutes = clockOut > otThresholdTime
      ? Math.floor((clockOut.getTime() - otThresholdTime.getTime()) / (1000 * 60))
      : 0;
    const overtimeHours = overtimeMinutes / 60;

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      isLate,
      lateMinutes,
      undertimeHours: Math.round(undertimeHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      isAbsent: false
    };
  }

  /**
   * Submit record for approval
   */
  submitRecord(recordId: number): Observable<AttendanceRecordDTO> {
    return this.http.post<AttendanceRecordDTO>(
      `${this.BASE}/attendance-records/${recordId}/submit`,
      {}
    ).pipe(
      catchError((err) => {
        console.error('Error submitting record:', err);
        throw err;
      })
    );
  }

  /**
   * Lock record (after approval, prevents further changes)
   */
  lockRecord(recordId: number): Observable<AttendanceRecordDTO> {
    return this.http.post<AttendanceRecordDTO>(
      `${this.BASE}/attendance-records/${recordId}/lock`,
      {}
    ).pipe(
      catchError((err) => {
        console.error('Error locking record:', err);
        throw err;
      })
    );
  }

  /**
   * Get shifts for employee
   */
  getEmployeeShifts(employeeId: number): Observable<ShiftDTO[]> {
    return this.http.get<any>(
      `${this.BASE}/employees/${employeeId}/shifts`
    ).pipe(
      map(res => Array.isArray(res) ? res : (res?.shifts ?? [])),
      catchError(() => of([]))
    );
  }

  /**
   * Get current shift for employee on date
   */
  getCurrentShift(employeeId: number, date: string): Observable<ShiftDTO | null> {
    return this.http.get<any>(
      `${this.BASE}/employees/${employeeId}/current-shift?date=${date}`
    ).pipe(
      map(res => res?.shift || null),
      catchError(() => of(null))
    );
  }

  /**
   * Get all shifts (for admin)
   */
  getAllShifts(): Observable<ShiftDTO[]> {
    return this.http.get<any>(
      `${this.BASE}/shifts`
    ).pipe(
      map(res => Array.isArray(res) ? res : (res?.shifts ?? [])),
      catchError(() => of([]))
    );
  }

  /**
   * Create or update shift
   */
  upsertShift(shift: ShiftDTO): Observable<ShiftDTO> {
    if (shift.id) {
      return this.http.put<ShiftDTO>(
        `${this.BASE}/shifts/${shift.id}`,
        shift
      );
    } else {
      return this.http.post<ShiftDTO>(
        `${this.BASE}/shifts`,
        shift
      );
    }
  }

  /**
   * Parse time string (HH:mm) to Date on given date
   */
  private parseTimeToDate(dateStr: string, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(dateStr);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Get stats for date range
   */
  getAttendanceStats(
    employeeId: number,
    startDate: string,
    endDate: string
  ): Observable<{
    present: number;
    absent: number;
    late: number;
    overtime: number;
    undertime: number;
  }> {
    return this.http.get<any>(
      `${this.BASE}/attendance-records/stats?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`
    ).pipe(
      map(res => res?.stats || {
        present: 0,
        absent: 0,
        late: 0,
        overtime: 0,
        undertime: 0
      }),
      catchError(() => of({
        present: 0,
        absent: 0,
        late: 0,
        overtime: 0,
        undertime: 0
      }))
    );
  }
}

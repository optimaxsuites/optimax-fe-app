import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';
import {
  AttendanceRecordDTO,
  UpsertAttendanceRecordRequest,
  OpenOverrideRequest,
  ClockInRequest,
  ClockOutRequest,
  PagedResponse
} from '../../domain/attendance/attendance-event.dto';

const EMPTY_PAGE: PagedResponse<AttendanceRecordDTO> = { content: [], totalSize: 0, page: 0, size: 0 };

@Injectable({ providedIn: 'root' })
export class AttendanceRecordService {
  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords`;

  constructor(private http: HttpClient) {}

  getRecords(page?: number, size?: number): Observable<PagedResponse<AttendanceRecordDTO>> {
    let params = new HttpParams();
    if (page !== undefined) params = params.set('page', page);
    if (size !== undefined) params = params.set('size', size);

    return this.http.get<PagedResponse<AttendanceRecordDTO>>(this.BASE, { params }).pipe(
      catchError(error => {
        console.error('Failed to get attendance records:', error);
        return of(EMPTY_PAGE);
      })
    );
  }

  getRecord(id: number): Observable<AttendanceRecordDTO | null> {
    return this.http.get<AttendanceRecordDTO>(`${this.BASE}/${id}`).pipe(
      catchError(error => {
        console.error(`Failed to get attendance record ${id}:`, error);
        return of(null);
      })
    );
  }

  createRecord(record: UpsertAttendanceRecordRequest): Observable<AttendanceRecordDTO> {
    return this.http.post<AttendanceRecordDTO>(this.BASE, record);
  }

  updateRecord(id: number, record: UpsertAttendanceRecordRequest): Observable<AttendanceRecordDTO> {
    return this.http.put<AttendanceRecordDTO>(`${this.BASE}/${id}`, record);
  }

  deleteRecord(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/${id}`);
  }

  openOverride(id: number, request: OpenOverrideRequest): Observable<AttendanceRecordDTO> {
    return this.http.post<AttendanceRecordDTO>(`${this.BASE}/${id}/override/open`, request);
  }

  clockIn(request: ClockInRequest): Observable<AttendanceRecordDTO> {
    return this.http.post<AttendanceRecordDTO>(`${this.BASE}/clockIn`, request);
  }

  clockOut(request: ClockOutRequest): Observable<AttendanceRecordDTO> {
    return this.http.post<AttendanceRecordDTO>(`${this.BASE}/clockOut`, request);
  }

  getRecordsByDateRange(
    employeeId?: number,
    startDate?: string,
    endDate?: string
  ): Observable<PagedResponse<AttendanceRecordDTO>> {
    let params = new HttpParams();
    if (employeeId !== undefined) params = params.set('employeeId', employeeId);
    if (startDate) params = params.set('from', startDate);
    if (endDate) params = params.set('to', endDate);

    return this.http.get<PagedResponse<AttendanceRecordDTO>>(`${this.BASE}/dateRange`, { params }).pipe(
      catchError(error => {
        console.error('Failed to get attendance records for date range:', error);
        return of(EMPTY_PAGE);
      })
    );
  }
}

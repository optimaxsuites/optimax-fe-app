import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';
import {
  AttendanceSummaryDTO,
  LateArrivalDTO,
  AbsentEmployeeDTO,
  MarkAttendanceResponseDTO
} from '../../domain/attendance/attendance-summary.dto';

@Injectable({
  providedIn: 'root'
})
export class AttendashboardService {
  private apiUrl = `${environment.apiBaseUrl}/x/api/v2/hr`;

  constructor(private http: HttpClient) { }

  getTodayStats(): Observable<AttendanceSummaryDTO | null> {
    return this.http.get<AttendanceSummaryDTO>(
      `${this.apiUrl}/attendance-records/stats/today`
    ).pipe(
      catchError(error => {
        console.error('Failed to get today stats:', error);
        return of(null);
      })
    );
  }

  getLateArrivals(): Observable<LateArrivalDTO[]> {
    return this.http.get<LateArrivalDTO[]>(
      `${this.apiUrl}/attendance-records/late/today`
    ).pipe(
      catchError(error => {
        console.error('Failed to get late arrivals:', error);
        return of([]);
      })
    );
  }

  getAbsentees(): Observable<AbsentEmployeeDTO[]> {
    return this.http.get<AbsentEmployeeDTO[]>(
      `${this.apiUrl}/attendance-records/absent/today`
    ).pipe(
      catchError(error => {
        console.error('Failed to get absentees:', error);
        return of([]);
      })
    );
  }

  markAttendance(): Observable<MarkAttendanceResponseDTO | null> {
    return this.http.post<MarkAttendanceResponseDTO>(
      `${this.apiUrl}/attendance-records/mark`,
      {}
    ).pipe(
      catchError(error => {
        console.error('Failed to mark attendance:', error);
        return of(null);
      })
    );
  }
}


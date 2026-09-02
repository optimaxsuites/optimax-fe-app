import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class AttendashboardService {
  private apiUrl = `${environment.apiBaseUrl}/x/api/v2/hr`;

  constructor(private http: HttpClient) { }

  getTodayStats(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/attendance/stats/today`
    ).pipe(
      catchError(error => {
        console.error('Failed to get today stats:', error);
        return of(null);
      })
    );
  }

  getLateArrivals(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/attendance/late/today`
    ).pipe(
      catchError(error => {
        console.error('Failed to get late arrivals:', error);
        return of([]);
      })
    );
  }

  getAbsentees(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/attendance/absent/today`
    ).pipe(
      catchError(error => {
        console.error('Failed to get absentees:', error);
        return of([]);
      })
    );
  }

  markAttendance(): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/attendance/mark`,
      {}
    ).pipe(
      catchError(error => {
        console.error('Failed to mark attendance:', error);
        return of(null);
      })
    );
  }
}

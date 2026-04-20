import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AttendashboardService {
  private baseUrl = '/api/attendance';

  constructor(private http: HttpClient) { }
  getTodayStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/stats/today`);
  }

  getDepartmentHeatmap(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/departments/heatmap`);
  }

  getLateArrivals(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/late/today`);
  }

  markAttendance(): Observable<void> {
  return this.http.post<void>('/api/attendance/mark', {});
}

}

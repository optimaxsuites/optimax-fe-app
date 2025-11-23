import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LogisticsService {
  constructor(private http: HttpClient) {}

  private baseUrl() {
    return '/x/api/v2/pos'; // adapt if you have a global base helper
  }

  getLogistics(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl()}/logistics`);
  }

  createLogistic(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl()}/logistics`, payload);
  }

  deleteLogistic(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl()}/logistics/${id}`); 
  }
}
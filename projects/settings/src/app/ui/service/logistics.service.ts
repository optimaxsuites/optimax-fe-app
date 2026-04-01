import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../sharedComponents/service/environments/environment.prod';

@Injectable({ providedIn: 'root' })
export class LogisticsService {
  constructor(private http: HttpClient) {}

  private baseUrl() {
    return environment.apiBaseUrl
  }

  getLogistics(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl()}/x/api/v2/pos/logistics/partner`);
  }

  createLogistic(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl()}/x/api/v2/pos/logistics/partner`, payload);
  }

  deleteLogistic(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl()}/x/api/v2/pos/logistics/partner/${id}`); 
  }
}
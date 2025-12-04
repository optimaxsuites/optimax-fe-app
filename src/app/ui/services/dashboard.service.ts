// dashboard.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SalesPerformanceResponse } from '../models/interface/dashboard.models';

// export interface SalesPerformanceResponse {
//   // flexible shape for the sales performance response; refine fields as needed
//   [key: string]: any;
// }

@Injectable({ providedIn: 'root' })
export class DashboardService {
  // set your API base url (adjust as needed)
  private baseUrl = '/x/api/v2/pos/salesreport';
  // or use environment.apiUrl + '/pos/salesreport'

  constructor(private http: HttpClient) {}

  /**
   * Call sales performance report.
   * - body must match swagger: startDate, endDate, branchIds[], cashierIds[], paymentMethods[], groupBy
   * - tenantId should come from sessionStorage or your app config
   */
  salesPerformanceReport(body: any): Observable<SalesPerformanceResponse> {
    const tenantId = sessionStorage.getItem('tenantId') || 'mod'; // fallback tenant
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId
    });

    const url = `${this.baseUrl}/salesperformancereport`; // as in swagger
    return this.http.post<SalesPerformanceResponse>(url, body, { headers });
  }
}

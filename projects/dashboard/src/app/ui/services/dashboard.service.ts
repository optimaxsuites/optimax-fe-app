// dashboard.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SalesPerformanceResponse } from '../models/interface/dashboard.models';
import { environment } from '../sharedComponent/service/environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  // FIXED: Updated base URL based on typical API patterns
  private baseUrl = environment.apiBaseUrl
  
  constructor(private http: HttpClient) {}

  /**
   * Call sales performance report.
   * - body must match swagger: startDate, endDate, branchIds[], cashierIds[], paymentMethods[], groupBy
   * - tenantId should come from sessionStorage or your app config
   */
  salesPerformanceReport(body: any): Observable<SalesPerformanceResponse> {

   

    // FIXED: Correct endpoint path (adjust if needed)
    const url = `${this.baseUrl}/x/api/v2/pos/salesreport/salesperformancereport`; 
    
    console.log('API Call:', {
      url: url,
      payload: body,
      cashierIds: body.cashierIds
    });
    
    return this.http.post<SalesPerformanceResponse>(url, body);
  }

  /**
   * ADDITIONAL: Get refunds data if your API has separate endpoint
   */
  getRefundsReport(cashierId: number, startDate: string, endDate: string): Observable<any> {
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId,
      'Authorization': `Bearer ${sessionStorage.getItem('token') || ''}`
    });

    const payload = {
      cashierId: cashierId,
      startDate: startDate,
      endDate: endDate
    };

    return this.http.post(`${this.baseUrl}/refunds`, payload, { headers });
  }
}
// employee-loan.service.ts - NO LOCAL STORAGE
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../shared-component/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmployeeLoanService {
    /**
     * Retrieve all loans from the backend (GET /x/api/v2/hr/advanceLoans)
     */
    getAllLoans(): Observable<any[]> {
      const token = sessionStorage.getItem('token');
      const tenantId = 'optimax';
      return this.http.get<any[]>(`${this.baseUrl}/x/api/v2/hr/advanceLoans`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenantId,
          'Accept': 'application/json'
        }
      });
    }

  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getSalaryByEmployeeId(employeeId: number): Observable<any> {
    const token = sessionStorage.getItem('token');
    const tenantId = 'optimax';
    
    
    return this.http.get<any>(`${this.baseUrl}/x/api/v2/hr/salaries/${employeeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'Accept': 'application/json'
      }
    });
  }

  getEmployeeById(employeeId: number): Observable<any> {
    const token = sessionStorage.getItem('token');
    const tenantId = 'optimax';
    
    return this.http.get<any>(`${this.baseUrl}/x/api/v2/hr/employees/${employeeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'Accept': 'application/json'
      }
    });
  }

    /**
   * Retrieve all employee levels from the backend (GET /x/api/v2/hr/levels)
   */
  getAllLevels(): Observable<any[]> {
    const token = sessionStorage.getItem('token');
    const tenantId = 'optimax';
    return this.http.get<any[]>(`${this.baseUrl}/x/api/v2/hr/levels`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'Accept': 'application/json'
      }
    });
  }
  
}
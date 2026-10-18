// employee-loan.service.ts - NO LOCAL STORAGE
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { LevelSalaryRecord, LevelSalaryResolution, resolveBaseSalaryForLevel, resolveEmployeeLevelId, resolveMonthlySalaryForLevel } from './level-salary.util';
import { environment } from '../../shared-component/environments/environment';
import { resolveTenantId } from './loan-tenant.util';
import { resolveSessionUserId } from './loan-display.util';

@Injectable({
  providedIn: 'root'
})
export class EmployeeLoanService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  /**
   * The signed-in employee: the session's user id → GET /employees/employee/by/userId/{userId}.
   * Unlike EmployeeService.getCurrentEmployee, this never substitutes a default employee (that one
   * falls back to employee #1 in development mode), so loan screens can't show or act as someone else.
   */
  getSignedInEmployee(): Observable<any> {
    const userId = resolveSessionUserId();
    if (!userId) {
      return throwError(() => new Error('No signed-in user was found in this session. Please sign in again.'));
    }
    return this.http.get<any>(`${this.baseUrl}/x/api/v2/hr/employees/employee/by/userId/${userId}`, {
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
        'X-Tenant-ID': resolveTenantId(),
        'Accept': 'application/json'
      }
    }).pipe(
      map((response) => {
        const employee = response?.data || response;
        if (!employee?.id) {
          throw new Error(`No employee record is linked to your user account (user ID ${userId}).`);
        }
        return employee;
      })
    );
  }

  /** All salary records (GET /x/api/v2/hr/salaries); each belongs to a level via `levelId`. */
  getAllSalaries(): Observable<LevelSalaryRecord[]> {
    return this.http.get<any>(`${this.baseUrl}/x/api/v2/hr/salaries`, {
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
        'X-Tenant-ID': resolveTenantId(),
        'Accept': 'application/json'
      }
    }).pipe(
      map((response) => (Array.isArray(response) ? response : (response?.content || response?.data || [])) as LevelSalaryRecord[])
    );
  }

  /**
   * Monthly salary for an employee record from GET /x/api/v2/hr/employees/{id}: the salary set up for
   * the employee's level (`level.id` matched to a salary record's `levelId`).
   */
  getMonthlySalaryForEmployee(employee: any): Observable<LevelSalaryResolution & { levelId: number; levelName: string }> {
    const levelId = resolveEmployeeLevelId(employee);
    const levelName = String(employee?.level?.position || employee?.level?.name || employee?.jobTitle || '').trim();
    if (!levelId) {
      return of({ status: 'missing' as const, levelId: 0, levelName });
    }
    return this.getAllSalaries().pipe(
      map((salaries) => ({ ...resolveMonthlySalaryForLevel(levelId, salaries), levelId, levelName }))
    );
  }

  /** Base salary for an employee id, via their level (0 when it can't be determined). */
  getBaseSalaryForEmployeeId(employeeId: number): Observable<number> {
    return this.getEmployeeById(employeeId).pipe(
      switchMap((response: any) => {
        const levelId = resolveEmployeeLevelId(response?.data || response);
        return levelId
          ? this.getAllSalaries().pipe(map((salaries) => resolveBaseSalaryForLevel(levelId, salaries)))
          : of(0);
      })
    );
  }

  /**
   * GET /x/api/v2/hr/salaries/{id} looks up a salary *record* by its own id, not by employee, so it
   * must not be used to find an employee's salary. Use getMonthlySalaryForEmployee instead.
   */
  getSalaryByEmployeeId(employeeId: number): Observable<any> {
    const token = sessionStorage.getItem('token');
    const tenantId = resolveTenantId();
    
    
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
    const tenantId = resolveTenantId();
    
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
    const tenantId = resolveTenantId();
    return this.http.get<any[]>(`${this.baseUrl}/x/api/v2/hr/levels`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'Accept': 'application/json'
      }
    });
  }
  
}
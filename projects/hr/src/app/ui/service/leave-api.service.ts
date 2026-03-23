import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../shared-component/environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class LeaveApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    throw error;
  }

  // ==================== EMPLOYEES ====================

  getEmployees(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/hr/employees`)
      .pipe(catchError(this.handleError));
  }

  getEmployeeById(id: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/hr/employees/${id}`)
      .pipe(catchError(this.handleError));
  }
  
  // ==================== DEPARTMENTS ====================

getDepartments(): Observable<any> {
  return this.http
    .get<any>(`${this.baseUrl}/x/api/v2/hr/departments`)
    .pipe(catchError(this.handleError));
}

  // ==================== LEVELS ====================

  getLevels(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/hr/levels`)
      .pipe(catchError(this.handleError));
  }

  getLevelById(id: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/hr/levels/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== LEAVE TYPES ====================

  getLeaveTypes(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/hr/leaveTypes`)
      .pipe(catchError(this.handleError));
  }

  createLeaveType(data: any): Observable<any> {
    const payload = {
      name: data.name,
      defaultDays: data.defaultDays,
      code: data.code,
      description: data.description
    };
    
    return this.http
      .post<any>(`${this.baseUrl}/x/api/v2/hr/leaveTypes`, payload)
      .pipe(catchError(this.handleError));
  }

  getLeaveTypeById(id: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/hr/leaveTypes/${id}`)
      .pipe(catchError(this.handleError));
  }

  updateLeaveType(id: number, data: any): Observable<any> {
    return this.http
      .put<any>(`${this.baseUrl}/x/api/v2/hr/leaveTypes/${id}`, data)
      .pipe(catchError(this.handleError));
  }

  deleteLeaveType(id: number): Observable<any> {
    return this.http
      .delete<any>(`${this.baseUrl}/x/api/v2/hr/leaveTypes/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== LEAVE ALLOCATIONS ====================

  getLeaveAllocations(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/hr/leaveAllocations`)
      .pipe(catchError(this.handleError));
  }

  createLeaveAllocation(data: any): Observable<any> {
    const payload = {
      allocatedDays: data.allocatedDays,
      levelId: data.levelId,
      leaveTypeId: data.leaveTypeId
    };

    return this.http
      .post<any>(`${this.baseUrl}/x/api/v2/hr/leaveAllocations`, payload)
      .pipe(catchError(this.handleError));
  }

  getLeaveAllocationById(id: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/hr/leaveAllocations/${id}`)
      .pipe(catchError(this.handleError));
  }

  updateLeaveAllocation(id: number, data: any): Observable<any> {
    return this.http
      .put<any>(`${this.baseUrl}/x/api/v2/hr/leaveAllocations/${id}`, data)
      .pipe(catchError(this.handleError));
  }

  deleteLeaveAllocation(id: number): Observable<any> {
    return this.http
      .delete<any>(`${this.baseUrl}/x/api/v2/hr/leaveAllocations/${id}`)
      .pipe(catchError(this.handleError));
  }

  getLeaveAllocationsByLevel(levelId: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/hr/leaveAllocations/getLeaveByLevel/${levelId}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== LEAVE BALANCES ====================

  getLeaveBalances(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/hr/leaves`)
      .pipe(catchError(this.handleError));
  }

  createLeaveBalance(data: any): Observable<any> {
    const payload = {
      employeeId: String(data.employeeId), // Convert to string
      employee: data.employeeId, // Numeric ID
      leaveTypeId: data.leaveTypeId,
      balance: data.balance,
      usedDays: data.usedDays || 0
    };

    return this.http
      .post<any>(`${this.baseUrl}/x/api/v2/hr/leaves`, payload)
      .pipe(catchError(this.handleError));
  }

  getLeaveBalanceById(id: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/hr/leaves/${id}`)
      .pipe(catchError(this.handleError));
  }

  updateLeaveBalance(id: number, data: any): Observable<any> {
    const payload = {
    id: id,
    employeeId: data.employeeId,
    employee: data.employee,
    leaveTypeId: data.leaveTypeId,
    balance: data.balance,
    usedDays: data.usedDays
  };
    return this.http
      .put<any>(`${this.baseUrl}/x/api/v2/hr/leaves/${id}`, payload)
      .pipe(catchError(this.handleError));
  }

  deleteLeaveBalance(id: number): Observable<any> {
    return this.http
      .delete<any>(`${this.baseUrl}/x/api/v2/hr/leaves/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== LEAVE PLAN POLICIES ====================

  getLeavePlanPolicies(page: number = 1, size: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/hr/leave-plan-policies`, { params })
      .pipe(catchError(this.handleError));
  }

  createLeavePlanPolicy(data: any): Observable<any> {
    return this.http
      .post<any>(`${this.baseUrl}/x/api/v2/hr/leave-plan-policies`, data)
      .pipe(catchError(this.handleError));
  }

  getLeavePlanPolicyById(id: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/hr/leave-plan-policies/${id}`)
      .pipe(catchError(this.handleError));
  }

  updateLeavePlanPolicy(id: number, data: any): Observable<any> {
    return this.http
      .put<any>(`${this.baseUrl}/x/api/v2/hr/leave-plan-policies/${id}`, data)
      .pipe(catchError(this.handleError));
  }

  deleteLeavePlanPolicy(id: number): Observable<any> {
    return this.http
      .delete<any>(`${this.baseUrl}/x/api/v2/hr/leave-plan-policies/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== LEAVE PLAN RECORDS ====================

getLeavePlanRecords(page: number = 1, size: number = 100): Observable<any> {
  const params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString());

  return this.http
    .get<any>(`${this.baseUrl}/x/api/v2/hr/leave-plan-records`, { params })
    .pipe(catchError(this.handleError));
}

getLeavePlanRecordById(id: number): Observable<any> {
  return this.http
    .get<any>(`${this.baseUrl}/x/api/v2/hr/leave-plan-records/${id}`)
    .pipe(catchError(this.handleError));
}

createLeavePlanRecord(data: any): Observable<any> {
  // Don't send id - backend generates it
  const payload = {
    createdBy: data.createdBy,
    startDate: data.startDate,
    endDate: data.endDate,
    status: data.status || 'PENDING',
    leaveType: data.leaveType,
    totalDays: data.totalDays,
    planReason: data.planReason || '',
    attachment: data.attachment || null
  };

  return this.http
    .post<any>(`${this.baseUrl}/x/api/v2/hr/leave-plan-records`, payload)
    .pipe(catchError(this.handleError));
}

updateLeavePlanRecord(id: number, data: any): Observable<any> {
  // Include id in payload for update
  const payload = {
    id: id,
    createdBy: data.createdBy,
    startDate: data.startDate,
    endDate: data.endDate,
    status: data.status,
    leaveType: data.leaveType,
    totalDays: data.totalDays,
    planReason: data.planReason,
    attachment: data.attachment,
    adminComment: data.adminComment,
    decisionBy: data.decisionBy,
    decisionOn: data.decisionOn
  };

  return this.http
    .put<any>(`${this.baseUrl}/x/api/v2/hr/leave-plan-records/${id}`, payload)
    .pipe(catchError(this.handleError));
}

deleteLeavePlanRecord(id: number): Observable<any> {
  return this.http
    .delete<any>(`${this.baseUrl}/x/api/v2/hr/leave-plan-records/${id}`)
    .pipe(catchError(this.handleError));
}

// ==================== CURRENT EMPLOYEE (if not already added) ====================

getEmployeeByUserId(userId: string): Observable<any> {
  return this.http
    .get<any>(`${this.baseUrl}/x/api/v2/hr/employees/employee/by/userId/${userId}`)
    .pipe(catchError(this.handleError));
}

getCurrentUserId(): string | null {
  return sessionStorage.getItem('userid') || localStorage.getItem('userid');
}

getCurrentEmployee(): Observable<any> {
  const userId = this.getCurrentUserId();
  console.log(userId);
  if (!userId) {
    console.warn('No userId found');
    return of(null);
  }
  return this.getEmployeeByUserId(userId).pipe(
    map(response => response?.data ?? response ?? null)
  );
}
}
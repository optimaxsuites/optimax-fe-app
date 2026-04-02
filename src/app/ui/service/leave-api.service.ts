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
      employeeId: String(data.employeeId),
      employee: data.employeeId,
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

  // ==================== LEAVE PLAN RECORDS (NEW FORMAT) ====================

  /**
   * Get all leave plan records with transformation
   * Converts date arrays to Date objects and sorts by latest first
   */
  getLeavePlanRecords(page: number = 1, size: number = 100): Observable<any[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/hr/leave-plan-records`, { params })
      .pipe(
        map(response => {
          const records = Array.isArray(response) ? response : (response?.data || response?.content || []);
          return this.transformLeavePlanRecords(records);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get single leave plan record by ID
   */
  getLeavePlanRecordById(id: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/hr/leave-plan-records/${id}`)
      .pipe(
        map(response => this.transformSingleRecord(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Create leave plan record
   * POST expects: createdBy (userId), leaveTypeId (number), dates, status
   */
  createLeavePlanRecord(data: any): Observable<any> {
    const now = new Date().toISOString();
    
    const payload = {
      createdAt: now,
      createdBy: data.createdBy, // userId (number)
      startDate: data.startDate, // ISO string
      endDate: data.endDate, // ISO string
      status: data.status || 'PENDING',
      leaveTypeId: data.leaveTypeId, // number
      totalDays: data.totalDays,
      planReason: data.planReason || '',
      attachment: data.attachment || '',
      adminComment: data.adminComment || '',
      decisionBy: data.decisionBy || null,
      decisionOn: data.decisionOn || null
    };

    console.log('📤 Creating leave plan record:', payload);

    return this.http
      .post<any>(`${this.baseUrl}/x/api/v2/hr/leave-plan-records`, payload)
      .pipe(
        map(response => this.transformSingleRecord(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Update leave plan record
   * PUT expects: id + all fields
   */
  updateLeavePlanRecord(id: number, data: any): Observable<any> {
    const payload = {
      id: id,
      createdAt: data.createdAt,
      createdBy: data.createdBy, // userId (number)
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status,
      leaveTypeId: data.leaveTypeId, // number
      totalDays: data.totalDays,
      planReason: data.planReason,
      attachment: data.attachment,
      adminComment: data.adminComment,
      decisionBy: data.decisionBy,
      decisionOn: data.decisionOn
    };

    console.log(' Updating leave plan record:', payload);

    return this.http
      .post<any>(`${this.baseUrl}/x/api/v2/hr/leave-plan-records`, payload)
      .pipe(
        map(response => this.transformSingleRecord(response)),
        catchError(this.handleError)
      );
  }
reateLeaveType(data: any): Observable<any> {
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
  /**
   * Delete leave plan record
   */
  deleteLeavePlanRecord(id: number): Observable<any> {
    return this.http
      .delete<any>(`${this.baseUrl}/x/api/v2/hr/leave-plan-records/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== DATA TRANSFORMATION HELPERS ====================

  /**
   * Transform array of leave plan records from backend format to frontend format
   */
  private transformLeavePlanRecords(records: any[]): any[] {
    if (!Array.isArray(records)) {
      return [];
    }

    const transformed = records.map(record => this.transformSingleRecord(record));
    
    // Sort by createdAt descending (latest first)
    return transformed.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }

  /**
   * Transform single leave plan record from backend format to frontend format
   */
  private transformSingleRecord(record: any): any {
    if (!record) return null;

    return {
      id: record.id,
      createdAt: this.convertDateArrayToISO(record.createdAt),
      createdBy: {
        id: record.createdBy?.userId || record.createdBy?.id || record.createdBy,
        userId: record.createdBy?.userId || record.createdBy?.id || record.createdBy,
        fullname: record.createdBy?.fullname || record.createdBy?.username || 'Unknown'
      },
      startDate: this.convertDateArrayToISO(record.startDate),
      endDate: this.convertDateArrayToISO(record.endDate),
      status: record.status,
      leaveType: {
        id: record.leaveType?.id || record.leaveTypeId,
        name: record.leaveType?.name || 'Unknown',
        code: record.leaveType?.code || '',
        description: record.leaveType?.description || ''
      },
      leaveTypeId: record.leaveType?.id || record.leaveTypeId,
      totalDays: record.totalDays,
      planReason: record.planReason || '',
      attachment: record.attachment || '',
      adminComment: record.adminComment || '',
      decisionBy: record.decisionBy ? {
        id: record.decisionBy?.userId || record.decisionBy?.id || record.decisionBy,
        userId: record.decisionBy?.userId || record.decisionBy?.id || record.decisionBy,
        fullname: record.decisionBy?.fullname || record.decisionBy?.username || 'Unknown'
      } : null,
      decisionOn: this.convertDateArrayToISO(record.decisionOn)
    };
  }

  /**
   * Convert date array [year, month, day, hour, min, sec, nano] to ISO string
   */
  private convertDateArrayToISO(dateArray: any): string {
    if (!dateArray) return '';
    
    // If already a string, return it
    if (typeof dateArray === 'string') {
      return dateArray;
    }

    // If it's an array: [year, month, day, hour, min, sec, nano]
    if (Array.isArray(dateArray) && dateArray.length >= 3) {
      const [year, month, day, hour = 0, min = 0, sec = 0] = dateArray;
      // Month in Date is 0-indexed, backend sends 1-indexed
      const date = new Date(year, month - 1, day, hour, min, sec);
      return date.toISOString();
    }

    return '';
  }

  // ==================== CURRENT EMPLOYEE ====================

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
    console.log('Current userId:', userId);
    if (!userId) {
      console.warn('No userId found');
      return of(null);
    }
    return this.getEmployeeByUserId(userId).pipe(
      map(response => response?.data ?? response ?? null)
    );
  }
  getCurrentUserIdAsNumber(): number | null {
  const userId = this.getCurrentUserId();
  return userId ? parseInt(userId, 10) : null;
}
// ==================== LEAVE REQUEST RECORDS ====================

/**
 * Get all leave request records with transformation
 */
getLeaveRequestRecords(page: number = 1, size: number = 100): Observable<any[]> {
  const params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString());

  return this.http
    .get<any>(`${this.baseUrl}/x/api/v2/hr/leave-request-records`, { params })
    .pipe(
      map(response => {
        const records = Array.isArray(response) ? response : (response?.data || response?.content || []);
        return this.transformLeaveRequestRecords(records);
      }),
      catchError(this.handleError)
    );
}

/**
 * Get single leave request record by ID
 */
getLeaveRequestRecordById(id: number): Observable<any> {
  return this.http
    .get<any>(`${this.baseUrl}/x/api/v2/hr/leave-request-records/${id}`)
    .pipe(
      map(response => this.transformSingleRequestRecord(response)),
      catchError(this.handleError)
    );
}

/**
 * Create leave request record
 * POST expects: createdBy (userId), leaveTypeId (number), dates, status
 */
createLeaveRequestRecord(data: any): Observable<any> {
  const now = new Date().toISOString();
  
  const payload = {
    createdAt: now,
    createdBy: data.createdBy, // userId (number)
    leaveTypeId: data.leaveTypeId, // number
    startDate: data.startDate, // ISO string
    endDate: data.endDate, // ISO string
    totalDays: data.totalDays,
    status: 'PENDING',
    leaveReason: data.leaveReason || '',
    attachment: data.attachment || '',
    adminComment: '',
    decisionBy: null,
    decisionOn: null
  };

  console.log('📤 Creating leave request record:', payload);

  return this.http
    .post<any>(`${this.baseUrl}/x/api/v2/hr/leave-request-records`, payload)
    .pipe(
      map(response => this.transformSingleRequestRecord(response)),
      catchError(this.handleError)
    );
}

/**
 * Update leave request record (for approve/reject)
 */
updateLeaveRequestRecord(id: number, data: any): Observable<any> {
  const payload = {
    id: id,
    createdAt: data.createdAt,
    createdBy: data.createdBy, // userId (number)
    leaveTypeId: data.leaveTypeId, // number
    startDate: data.startDate,
    endDate: data.endDate,
    totalDays: data.totalDays,
    status: data.status,
    leaveReason: data.leaveReason,
    attachment: data.attachment,
    adminComment: data.adminComment,
    decisionBy: data.decisionBy,
    decisionOn: data.decisionOn
  };

  console.log(' Updating leave request record:', payload);

  return this.http
    .post<any>(`${this.baseUrl}/x/api/v2/hr/leave-request-records`, payload)
    .pipe(
      map(response => this.transformSingleRequestRecord(response)),
      catchError(this.handleError)
    );
}

/**
 * Delete leave request record
 */
deleteLeaveRequestRecord(id: number): Observable<any> {
  return this.http
    .delete<any>(`${this.baseUrl}/x/api/v2/hr/leave-request-records/${id}`)
    .pipe(catchError(this.handleError));
}

// ==================== LEAVE REQUEST TRANSFORMATION ====================

/**
 * Transform array of leave request records
 */
private transformLeaveRequestRecords(records: any[]): any[] {
  if (!Array.isArray(records)) {
    return [];
  }

  const transformed = records.map(record => this.transformSingleRequestRecord(record));
  
  // Sort by createdAt descending (latest first)
  return transformed.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });
}

/**
 * Transform single leave request record
 */
private transformSingleRequestRecord(record: any): any {
  if (!record) return null;

  return {
    id: record.id,
    createdAt: this.convertDateArrayToISO(record.createdAt),
    createdBy: {
      id: record.createdBy?.userId || record.createdBy?.id || record.createdBy,
      userId: record.createdBy?.userId || record.createdBy?.id || record.createdBy,
      fullname: record.createdBy?.fullname || record.createdBy?.username || 'Unknown'
    },
    leaveType: {
      id: record.leaveType?.id || record.leaveTypeId,
      name: record.leaveType?.name || 'Unknown',
      code: record.leaveType?.code || '',
      description: record.leaveType?.description || ''
    },
    leaveTypeId: record.leaveType?.id || record.leaveTypeId,
    startDate: this.convertDateArrayToISO(record.startDate),
    endDate: this.convertDateArrayToISO(record.endDate),
    totalDays: record.totalDays,
    status: record.status,
    leaveReason: record.leaveReason || '',
    attachment: record.attachment || '',
    adminComment: record.adminComment || '',
    decisionBy: record.decisionBy ? {
      id: record.decisionBy?.userId || record.decisionBy?.id || record.decisionBy,
      userId: record.decisionBy?.userId || record.decisionBy?.id || record.decisionBy,
      fullname: record.decisionBy?.fullname || record.decisionBy?.username || 'Unknown'
    } : null,
    decisionOn: this.convertDateArrayToISO(record.decisionOn)
  };
}
}
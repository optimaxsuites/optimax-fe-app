import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../shared-component/environments/environment';
import {
  ProfileChangeRequestDTO,
  ProfileChangeRequestFilter,
  RequestStatus,
  FieldChangeType,
  RequestType,
  BankChangePayload,
} from '../model/profile-change-request.model';

@Injectable({
  providedIn: 'root',
})
export class ProfileChangeRequestService {
  private readonly STORAGE_KEY = 'optimax_profile_change_requests';
  private readonly baseUrl = `${environment.apiBaseUrl}/x/api/v2/hr/profileChangeRequests`;
  private readonly employeesUrl = `${environment.apiBaseUrl}/x/api/v2/hr/employees`;
  private requestsSubject = new BehaviorSubject<ProfileChangeRequestDTO[]>([]);
  public requests$ = this.requestsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadRequestsFromStorage();
  }

  /**
   * Submit a new profile change request.
   * Uses backend first, with localStorage fallback while rollout stabilizes.
   */
  submitProfileChangeRequest(request: ProfileChangeRequestDTO): Observable<ProfileChangeRequestDTO> {
    const preparedRequest = this.prepareLocalRequest(request);

    return this.http.post<any>(this.baseUrl, this.toApiPayload(preparedRequest)).pipe(
      map((response) => this.normalizeRequestResponse(response, preparedRequest)),
      tap((savedRequest) => this.upsertRequest(savedRequest)),
      catchError((error) => {
        console.error('Error submitting profile change request to backend:', error);
        this.upsertRequest(preparedRequest);
        return of(preparedRequest);
      })
    );
  }

  /**
   * Get all profile change requests with optional filtering
   */
  getProfileChangeRequests(filter?: ProfileChangeRequestFilter): Observable<ProfileChangeRequestDTO[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((response) => this.normalizeRequestListResponse(response)),
      map((requests) => this.applyFilter(requests, filter)),
      tap((requests) => this.replaceOrMergeRequests(requests, filter)),
      catchError((error) => {
        console.error('Error loading profile change requests from backend:', error);
        return of(this.applyFilter(this.requestsSubject.value, filter));
      })
    );
  }

  /**
   * Get requests for a specific employee
   */
  getEmployeeRequests(employeeId: string | number): Observable<ProfileChangeRequestDTO[]> {
    return this.http.get<any>(`${this.baseUrl}/employee/${employeeId}`).pipe(
      map((response) => this.normalizeRequestListResponse(response)),
      map((requests) => this.applyFilter(requests, { employeeId })),
      tap((requests) => this.replaceEmployeeRequests(employeeId, requests)),
      catchError((error) => {
        console.error(`Error loading profile change requests for employee ${employeeId}:`, error);
        return of(this.applyFilter(this.requestsSubject.value, { employeeId }));
      })
    );
  }

  /**
   * Get a specific request by ID
   */
  getProfileChangeRequestById(id: string | number): Observable<ProfileChangeRequestDTO | null> {
    const request = this.requestsSubject.value.find((r) => String(r.id) === String(id)) || null;
    return of(request);

    // TODO: Replace with backend call when ready
    // return this.http.get<ProfileChangeRequestDTO>(
    //   `${this.baseUrl}/x/api/v2/hr/profile-change-requests/${id}`
    // );
  }

  /**
   * Approve a profile change request
   */
  approveProfileChangeRequest(id: string | number, processedBy: any): Observable<ProfileChangeRequestDTO> {
    const request = this.findRequestById(id);
    if (!request) {
      return throwError(() => new Error(`Profile change request ${id} was not found`));
    }

    const approvedRequest = this.withStatus(id, request, 'approved', processedBy);
    return this.applyApprovedChangesToEmployee(approvedRequest).pipe(
      switchMap(() => this.saveRequestStatus(approvedRequest))
    );
  }

  /**
   * Reject a profile change request
   */
  rejectProfileChangeRequest(id: string | number, rejectionReason: string, processedBy: any): Observable<ProfileChangeRequestDTO> {
    const request = this.findRequestById(id);
    if (!request) {
      return throwError(() => new Error(`Profile change request ${id} was not found`));
    }

    const rejectedRequest = this.withStatus(id, request, 'rejected', processedBy, rejectionReason);
    return this.saveRequestStatus(rejectedRequest);
  }

  /**
   * Create a bank change request using the generic structure
   */
  submitBankChangeRequest(
    employeeId: string | number,
    employeeName: string,
    currentBank: BankChangePayload,
    requestedBank: BankChangePayload,
    reason?: string,
    employeeEmail?: string
  ): Observable<ProfileChangeRequestDTO> {
    const request: ProfileChangeRequestDTO = {
      employeeId,
      employeeName,
      employeeEmail,
      requestType: 'change',
      fieldChangeType: 'bank',
      request: [
        {
          fieldName: 'bankName',
          value: requestedBank.bankName,
          oldValue: currentBank.bankName,
        },
        {
          fieldName: 'accountNumber',
          value: requestedBank.accountNumber,
          oldValue: currentBank.accountNumber,
        },
      ],
      reason,
      status: 'pending',
      submittedDate: new Date(),
    };

    return this.submitProfileChangeRequest(request);
  }

  /**
   * Get pending requests count
   */
  getPendingRequestsCount(employeeId?: string | number): Observable<number> {
    let requests = this.requestsSubject.value.filter((r) => r.status === 'pending');
    if (employeeId) {
      requests = requests.filter((r) => String(r.employeeId) === String(employeeId));
    }
    return of(requests.length);
  }

  /**
   * Load requests from localStorage
   */
  private loadRequestsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const requests: ProfileChangeRequestDTO[] = JSON.parse(stored);
        // Convert date strings back to Date objects
        requests.forEach((r) => {
          r.submittedDate = new Date(r.submittedDate);
          if (r.processedDate) {
            r.processedDate = new Date(r.processedDate);
          }
        });
        this.requestsSubject.next(requests);
      }
    } catch (error) {
      console.error('Error loading profile change requests from storage:', error);
    }
  }

  /**
   * Save requests to localStorage
   */
  private saveRequestsToStorage(requests: ProfileChangeRequestDTO[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));
    } catch (error) {
      console.error('Error saving profile change requests to storage:', error);
    }
  }

  /**
   * Clear all requests (for testing/reset)
   */
  clearAllRequests(): void {
    this.requestsSubject.next([]);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private prepareLocalRequest(request: ProfileChangeRequestDTO): ProfileChangeRequestDTO {
    return {
      ...request,
      id: request.id || `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      submittedDate: request.submittedDate || new Date(),
      status: request.status || 'pending',
    };
  }

  private toApiPayload(request: ProfileChangeRequestDTO): any {
    return {
      id: typeof request.id === 'number' ? request.id : parseInt(String(request.id).replace(/\D/g, '')) || 0,
      employeeId: Number(request.employeeId) || 0,
      requestType: request.requestType,
      fieldChangeType: request.fieldChangeType,
      request: request.request.map((item) => ({
        id: item.id || 0,
        profileChangeRequestId: item.profileChangeRequestId || 0,
        fieldName: item.fieldName,
        value: String(item.value ?? ''),
        oldValue: String(item.oldValue ?? ''),
      })),
      reason: request.reason || '',
      status: request.status,
      submittedDate: this.toIsoDate(request.submittedDate),
      processedDate: request.processedDate ? this.toIsoDate(request.processedDate) : null,
      processedBy: this.getProcessedById(request.processedBy),
      rejectionReason: request.rejectionReason || '',
    };
  }

  private normalizeRequestResponse(response: any, fallback?: ProfileChangeRequestDTO): ProfileChangeRequestDTO {
    const raw = response?.data ?? response?.result ?? response ?? {};
    const request = this.fromApiRequest(raw);
    return {
      ...fallback,
      ...request,
      employeeName: fallback?.employeeName || request.employeeName,
      employeeEmail: fallback?.employeeEmail || request.employeeEmail,
    };
  }

  private normalizeRequestListResponse(response: any): ProfileChangeRequestDTO[] {
    const raw = response?.data?.content
      ?? response?.data?.items
      ?? response?.data
      ?? response?.content
      ?? response?.items
      ?? response;

    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.map((item) => this.fromApiRequest(item));
  }

  private fromApiRequest(raw: any): ProfileChangeRequestDTO {
    const employee = raw?.employee;
    const employeeName = raw?.employeeName
      || [employee?.firstName, employee?.lastName].filter(Boolean).join(' ').trim()
      || undefined;

    return {
      id: raw?.id,
      employeeId: raw?.employeeId ?? employee?.id,
      employeeName,
      employeeEmail: raw?.employeeEmail || employee?.workEmail || employee?.email,
      requestType: raw?.requestType,
      fieldChangeType: raw?.fieldChangeType,
      request: Array.isArray(raw?.request) ? raw.request.map((item: any) => ({
        id: item?.id,
        profileChangeRequestId: item?.profileChangeRequestId ?? item?.profileChangeRequest?.id,
        fieldName: item?.fieldName,
        value: item?.value,
        oldValue: item?.oldValue,
      })) : [],
      reason: raw?.reason,
      status: raw?.status || 'pending',
      submittedDate: this.fromApiDate(raw?.submittedDate) || new Date(),
      processedDate: this.fromApiDate(raw?.processedDate),
      processedBy: this.normalizeProcessedBy(raw?.processedBy),
      rejectionReason: raw?.rejectionReason,
    };
  }

  private applyFilter(
    requests: ProfileChangeRequestDTO[],
    filter?: ProfileChangeRequestFilter
  ): ProfileChangeRequestDTO[] {
    let filtered = [...requests];

    if (filter?.status) {
      filtered = filtered.filter((r) => r.status === filter.status);
    }
    if (filter?.fieldChangeType) {
      filtered = filtered.filter((r) => r.fieldChangeType === filter.fieldChangeType);
    }
    if (filter?.employeeId) {
      filtered = filtered.filter((r) => String(r.employeeId) === String(filter.employeeId));
    }

    return filtered;
  }

  private upsertRequest(request: ProfileChangeRequestDTO): void {
    const requests = this.requestsSubject.value;
    const existingIndex = requests.findIndex((r) => String(r.id) === String(request.id));
    const updated = existingIndex >= 0
      ? requests.map((item, index) => index === existingIndex ? request : item)
      : [request, ...requests];

    this.requestsSubject.next(updated);
    this.saveRequestsToStorage(updated);
  }

  private findRequestById(id: string | number): ProfileChangeRequestDTO | undefined {
    return this.requestsSubject.value.find((r) => String(r.id) === String(id));
  }

  private withStatus(
    id: string | number,
    request: ProfileChangeRequestDTO,
    status: RequestStatus,
    processedBy: any,
    rejectionReason = ''
  ): ProfileChangeRequestDTO {
    return {
      ...request,
      id,
      status,
      processedDate: new Date(),
      processedBy,
      rejectionReason,
    };
  }

  private saveRequestStatus(request: ProfileChangeRequestDTO): Observable<ProfileChangeRequestDTO> {
    return this.http.post<any>(this.baseUrl, this.toApiPayload(request)).pipe(
      map((response) => this.normalizeRequestResponse(response, request)),
      tap((updatedRequest) => this.upsertRequest(updatedRequest))
    );
  }

  private applyApprovedChangesToEmployee(request: ProfileChangeRequestDTO): Observable<any> {
    const employeeId = request.employeeId;
    if (!employeeId) {
      return throwError(() => new Error('Cannot approve request without an employee id'));
    }

    return this.http.get<any>(`${this.employeesUrl}/${employeeId}`).pipe(
      map((response) => response?.data ?? response?.result ?? response),
      map((employee) => this.buildUpdatedEmployeePayload(employee, request)),
      switchMap((employeePayload) => this.http.post<any>(this.employeesUrl, this.toEmployeeFormData(employeePayload)))
    );
  }

  private buildUpdatedEmployeePayload(employee: any, request: ProfileChangeRequestDTO): any {
    const updatedEmployee = {
      ...employee,
      id: Number(request.employeeId) || employee?.id,
    };

    console.log(updatedEmployee)

    request.request.forEach((change) => {
      updatedEmployee[change.fieldName] = change.value;
    });

    return this.normalizeEmployeePayloadForUpdate(updatedEmployee);
  }

  private toEmployeeFormData(employee: any): FormData {
    const formData = new FormData();
    formData.append('employee', JSON.stringify(employee));
    return formData;
  }

  private normalizeEmployeePayloadForUpdate(employee: any): any {
    return {
      id: Number(employee?.id) || 0,
      firstName: employee?.firstName || '',
      lastName: employee?.lastName || '',
      email: employee?.email || '',
      workEmail: employee?.workEmail || '',
      phone: employee?.phone || '',
      address: employee?.address || '',
      jobTitle: this.getNamedValue(employee?.jobTitle),
      supervisor: this.getNamedValue(employee?.supervisor),
      bankName: employee?.bankName || '',
      accountNumber: employee?.accountNumber || '',
      nin: employee?.nin || '',
      bvn: employee?.bvn || '',
      employeeStatus: employee?.employeeStatus || employee?.employmentStatus || 'ACTIVE',
      onProbation: Boolean(employee?.onProbation),
      dob: this.toDateOnlyString(employee?.dob),
      employementStartDate: this.toOptionalIsoDate(employee?.employementStartDate || employee?.employmentStartDate),
      employmentEndDate: this.toOptionalIsoDate(employee?.employmentEndDate),
      probationStartDate: this.toOptionalDateOnlyString(employee?.probationStartDate),
      probationEndDate: this.toOptionalDateOnlyString(employee?.probationEndDate),
      appraisalDueDate: this.toOptionalDateOnlyString(employee?.appraisalDueDate),
      genderId: this.getRelationId(employee, 'gender'),
      relationshipId: this.getRelationId(employee, 'relationship'),
      religionId: this.getRelationId(employee, 'religion'),
      maritalStatusId: this.getRelationId(employee, 'maritalStatus'),
      departmentId: this.getRelationId(employee, 'department'),
      employeeMediaId: this.getRelationId(employee, 'employeeMedia'),
      jobTypeId: this.getRelationId(employee, 'jobType'),
      levelId: this.getRelationId(employee, 'level'),
      userId: Number(employee?.userId ?? employee?.user?.id ?? 0) || 0,
    };
  }

  private replaceEmployeeRequests(employeeId: string | number, employeeRequests: ProfileChangeRequestDTO[]): void {
    const others = this.requestsSubject.value.filter((r) => String(r.employeeId) !== String(employeeId));
    const updated = [...employeeRequests, ...others];
    this.requestsSubject.next(updated);
    this.saveRequestsToStorage(updated);
  }

  private replaceOrMergeRequests(requests: ProfileChangeRequestDTO[], filter?: ProfileChangeRequestFilter): void {
    if (!filter?.employeeId && !filter?.status && !filter?.fieldChangeType) {
      this.requestsSubject.next(requests);
      this.saveRequestsToStorage(requests);
      return;
    }

    requests.forEach((request) => this.upsertRequest(request));
  }

  private getProcessedById(processedBy: any): number {
    if (typeof processedBy === 'number') {
      return processedBy;
    }
    return Number(processedBy?.id || sessionStorage.getItem('userid') || localStorage.getItem('userid') || 0) || 0;
  }

  private toIsoDate(value: Date | string | number[] | undefined): string {
    const date = this.fromApiDate(value) || new Date();
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }

  private toOptionalIsoDate(value: Date | string | number[] | null | undefined): string | null {
    return value ? this.toIsoDate(value) : null;
  }

  private toDateOnlyString(value: Date | string | number[] | null | undefined): string {
    return this.toOptionalDateOnlyString(value) || '';
  }

  private toOptionalDateOnlyString(value: Date | string | number[] | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const date = this.fromApiDate(value);
    if (!date) {
      return String(value || '') || null;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getRelationId(employee: any, field: string): number | null {
    const direct = employee?.[`${field}Id`];
    const nested = employee?.[field]?.id;
    const value = direct ?? nested;
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  private getNamedValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    return String(value.name || value.fullName || value.fullname || value.title || '');
  }

  private fromApiDate(value: Date | string | number[] | null | undefined): Date | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? undefined : value;
    }

    if (Array.isArray(value)) {
      const [
        year,
        month,
        day,
        hour = 0,
        minute = 0,
        second = 0,
        nano = 0
      ] = value;

      if (!year || !month || !day) {
        return undefined;
      }

      const millisecond = Math.floor(Number(nano || 0) / 1_000_000);
      const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        millisecond
      );

      return Number.isNaN(date.getTime()) ? undefined : date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private normalizeProcessedBy(processedBy: any): any {
    if (!processedBy || typeof processedBy !== 'object') {
      return processedBy;
    }

    return {
      ...processedBy,
      name: processedBy.name || processedBy.fullname || processedBy.username || String(processedBy.id || ''),
    };
  }
}

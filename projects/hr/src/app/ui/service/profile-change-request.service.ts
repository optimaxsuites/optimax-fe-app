import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
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
  private requestsSubject = new BehaviorSubject<ProfileChangeRequestDTO[]>([]);
  public requests$ = this.requestsSubject.asObservable();

  constructor() {
    this.loadRequestsFromStorage();
  }

  /**
   * Submit a new profile change request
   * Uses localStorage until backend is ready
   */
  submitProfileChangeRequest(request: ProfileChangeRequestDTO): Observable<ProfileChangeRequestDTO> {
    // Generate ID if not provided
    if (!request.id) {
      request.id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    // Ensure submittedDate
    if (!request.submittedDate) {
      request.submittedDate = new Date();
    }

    // Store in localStorage
    const requests = this.requestsSubject.value;
    const updated = [request, ...requests];
    this.requestsSubject.next(updated);
    this.saveRequestsToStorage(updated);

    // TODO: Replace with backend call when ready
    // return this.http.post<ProfileChangeRequestDTO>(
    //   `${this.baseUrl}/x/api/v2/hr/profile-change-requests`,
    //   request
    // );

    return of(request);
  }

  /**
   * Get all profile change requests with optional filtering
   */
  getProfileChangeRequests(filter?: ProfileChangeRequestFilter): Observable<ProfileChangeRequestDTO[]> {
    let requests = this.requestsSubject.value;

    if (filter) {
      if (filter.status) {
        requests = requests.filter((r) => r.status === filter.status);
      }
      if (filter.fieldChangeType) {
        requests = requests.filter((r) => r.fieldChangeType === filter.fieldChangeType);
      }
      if (filter.employeeId) {
        requests = requests.filter((r) => r.employeeId === filter.employeeId);
      }
    }

    return of(requests);

    // TODO: Replace with backend call when ready
    // let url = `${this.baseUrl}/x/api/v2/hr/profile-change-requests`;
    // if (filter) {
    //   const params = new URLSearchParams();
    //   if (filter.status) params.append('status', filter.status);
    //   if (filter.fieldChangeType) params.append('fieldChangeType', filter.fieldChangeType);
    //   if (filter.employeeId) params.append('employeeId', String(filter.employeeId));
    //   if (filter.page) params.append('page', String(filter.page));
    //   if (filter.size) params.append('size', String(filter.size));
    //   if (params.toString()) url += `?${params.toString()}`;
    // }
    // return this.http.get<ProfileChangeRequestDTO[]>(url);
  }

  /**
   * Get requests for a specific employee
   */
  getEmployeeRequests(employeeId: string | number): Observable<ProfileChangeRequestDTO[]> {
    return this.getProfileChangeRequests({ employeeId });
  }

  /**
   * Get a specific request by ID
   */
  getProfileChangeRequestById(id: string): Observable<ProfileChangeRequestDTO | null> {
    const request = this.requestsSubject.value.find((r) => r.id === id) || null;
    return of(request);

    // TODO: Replace with backend call when ready
    // return this.http.get<ProfileChangeRequestDTO>(
    //   `${this.baseUrl}/x/api/v2/hr/profile-change-requests/${id}`
    // );
  }

  /**
   * Approve a profile change request
   */
  approveProfileChangeRequest(id: string, processedBy: any): Observable<ProfileChangeRequestDTO> {
    const requests = this.requestsSubject.value;
    const request = requests.find((r) => r.id === id);

    if (request) {
      request.status = 'approved';
      request.processedDate = new Date();
      request.processedBy = processedBy;

      this.requestsSubject.next([...requests]);
      this.saveRequestsToStorage(requests);
    }

    return of(request!);

    // TODO: Replace with backend call when ready
    // return this.http.put<ProfileChangeRequestDTO>(
    //   `${this.baseUrl}/x/api/v2/hr/profile-change-requests/${id}/approve`,
    //   { processedBy }
    // );
  }

  /**
   * Reject a profile change request
   */
  rejectProfileChangeRequest(id: string, rejectionReason: string, processedBy: any): Observable<ProfileChangeRequestDTO> {
    const requests = this.requestsSubject.value;
    const request = requests.find((r) => r.id === id);

    if (request) {
      request.status = 'rejected';
      request.processedDate = new Date();
      request.processedBy = processedBy;
      request.rejectionReason = rejectionReason;

      this.requestsSubject.next([...requests]);
      this.saveRequestsToStorage(requests);
    }

    return of(request!);

    // TODO: Replace with backend call when ready
    // return this.http.put<ProfileChangeRequestDTO>(
    //   `${this.baseUrl}/x/api/v2/hr/profile-change-requests/${id}/reject`,
    //   { rejectionReason, processedBy }
    // );
  }

  /**
   * Create a bank change request using the generic structure
   */
  submitBankChangeRequest(
    employeeId: string | number,
    employeeName: string,
    currentBank: BankChangePayload,
    requestedBank: BankChangePayload,
    reason?: string
  ): Observable<ProfileChangeRequestDTO> {
    const request: ProfileChangeRequestDTO = {
      employeeId,
      employeeName,
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
      requests = requests.filter((r) => r.employeeId === employeeId);
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
}

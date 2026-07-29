import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApprovalRequest,
  ApprovalStatus,
  ApprovalFilters,
  ApprovalStats,
  ApprovalComment
} from '../../domain/approval-inbox/approval-request.dto';
import { environment } from '../../shared-component/service/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApprovalService {

  private readonly baseUrl = environment.apiBaseUrl + '/x/api/v2/commerce';

  constructor(private http: HttpClient) {}

  private get tenantId(): string {
    const h = window.location.hostname;
    return (h.includes('localhost') || h.includes('127.0.0.1')) ? 'optimax' : h.split('.')[0] || 'optimax';
  }

  getApprovalRequests(filters: ApprovalFilters): Observable<{ data: ApprovalRequest[]; totalElements: number; totalPages: number }> {
    let params = new HttpParams()
      .set('tenantId', this.tenantId)
      .set('page', String(filters.page || 0))
      .set('size', String(filters.size || 10));

    if (filters.status && filters.status !== 'ALL') {
      params = params.set('status', filters.status);
    }
    if (filters.urgency && filters.urgency !== 'ALL') {
      params = params.set('urgency', filters.urgency);
    }
    if (filters.department) {
      params = params.set('department', filters.department);
    }
    if (filters.searchTerm) {
      params = params.set('search', filters.searchTerm);
    }

    return this.http.get<any>(`${this.baseUrl}/approvals`, { params }).pipe(
      map(res => ({
        data: res?.data ?? res ?? [],
        totalElements: res?.totalElements ?? 0,
        totalPages: res?.totalPages ?? 0
      }))
    );
  }

  getApprovalById(id: string): Observable<ApprovalRequest | undefined> {
    return this.http.get<ApprovalRequest>(`${this.baseUrl}/approvals/${id}`);
  }

  getApprovalStats(): Observable<ApprovalStats> {
    return this.http.get<ApprovalStats>(`${this.baseUrl}/approvals/stats`);
  }

  createApprovalRequest(data: any): Observable<ApprovalRequest> {
    return this.http.post<ApprovalRequest>(`${this.baseUrl}/approvals`, data);
  }

  approveRequest(id: string, level: number, comments: string): Observable<ApprovalRequest> {
    return this.http.patch<ApprovalRequest>(
      `${this.baseUrl}/approvals/${id}/approve`,
      { level, comments }
    );
  }

  rejectRequest(id: string, level: number, comments: string): Observable<ApprovalRequest> {
    return this.http.patch<ApprovalRequest>(
      `${this.baseUrl}/approvals/${id}/reject`,
      { reason: comments, level }
    );
  }

  addComment(id: string, comment: string, isInternal: boolean): Observable<ApprovalRequest> {
    return this.http.post<ApprovalRequest>(
      `${this.baseUrl}/approvals/${id}/comments`,
      { comment, isInternal }
    );
  }

  getDepartments(): Observable<string[]> {
    return of(['IT Department', 'Operations', 'Marketing', 'Finance', 'HR', 'Sales']);
  }
}

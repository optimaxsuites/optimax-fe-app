import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../sharedComponents/service/environments/environment.prod';

@Injectable({ providedIn: 'root' })
export class IssueTrackerApiService {

  constructor(private http: HttpClient) {}

  private base(): string {
    return (isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl) + '/x/api/v2/manager/issues';
  }

  private root(): string {
    return (isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl);
  }

  private authHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('Token') || sessionStorage.getItem('token') ||
                  sessionStorage.getItem('accessToken') || localStorage.getItem('Token2') || '';
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const userId = sessionStorage.getItem('userid') || sessionStorage.getItem('userId') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token.replace(/^bearer /i, '').trim()}`,
      'X-Tenant-ID': tenantId,
      'X-User-ID': userId,
      'Content-Type': 'application/json',
    });
  }

  getChannels() {
    return this.http.get<any[]>(`${this.root()}/x/api/v2/ai/collab/chat/channel`,
      { headers: this.authHeaders() }).pipe(catchError(this.err));
  }

  getAllUsers() {
    return this.http.get<any[]>(`${this.root()}/x/api/v2/us/ur/findAllUserPrimaryInformation`,
      { headers: this.authHeaders() }).pipe(catchError(this.err));
  }

  getAllTasks(page = 1, size = 100) {
    return this.http.get<any[]>(`${this.root()}/x/api/v2/hr/workTasks?page=${page}&size=${size}`,
      { headers: this.authHeaders() }).pipe(catchError(this.err));
  }

  createTask(body: any) {
    return this.http.post<any>(`${this.root()}/x/api/v2/hr/workTasks`, body,
      { headers: this.authHeaders() }).pipe(catchError(this.err));
  }

  getAll(page = 1, size = 50) {
    return this.http.get<any[]>(`${this.base()}?page=${page}&size=${size}`).pipe(catchError(this.err));
  }

  getByModule(module: string) {
    return this.http.get<any[]>(`${this.base()}/by-module/${module}`).pipe(catchError(this.err));
  }

  getByAssignee(userId: number) {
    return this.http.get<any[]>(`${this.base()}/by-assignee/${userId}`).pipe(catchError(this.err));
  }

  getByWorkTask(workTaskId: number) {
    return this.http.get<any[]>(`${this.base()}/by-work-task/${workTaskId}`).pipe(catchError(this.err));
  }

  getByPerformanceGoal(goalId: number) {
    return this.http.get<any[]>(`${this.base()}/by-performance-goal/${goalId}`).pipe(catchError(this.err));
  }

  get(id: number) {
    return this.http.get<any>(`${this.base()}/${id}`).pipe(catchError(this.err));
  }

  create(body: any) {
    return this.http.post<any>(this.base(), body).pipe(catchError(this.err));
  }

  update(id: number, body: any) {
    return this.http.put<any>(`${this.base()}/${id}`, body).pipe(catchError(this.err));
  }

  patchStatus(id: number, status: string) {
    return this.http.patch<any>(`${this.base()}/${id}/status?status=${status}`, {}).pipe(catchError(this.err));
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.base()}/${id}`).pipe(catchError(this.err));
  }

  addWorkLog(issueId: number, body: any) {
    return this.http.post<any>(`${this.base()}/${issueId}/work-log`, body).pipe(catchError(this.err));
  }

  getWorkLog(issueId: number) {
    return this.http.get<any[]>(`${this.base()}/${issueId}/work-log`).pipe(catchError(this.err));
  }

  shareIssue(issueId: number, body: any) {
    return this.http.post<any>(`${this.base()}/${issueId}/share`, body).pipe(catchError(this.err));
  }

  getShares(issueId: number) {
    return this.http.get<any[]>(`${this.base()}/${issueId}/shares`).pipe(catchError(this.err));
  }

  postCollabMessage(channelId: number, senderUserId: number, content: string) {
    return this.http.post<any>(`${this.root()}/x/api/v2/ai/collab/chat/message`,
      { channelId, senderUserId, content, messageType: 'TEXT' },
      { headers: this.authHeaders() }).pipe(catchError(this.err));
  }

  postIssueCardMessage(channelId: number, senderUserId: number, issue: any) {
    const content = JSON.stringify({
      id: issue.id,
      title: issue.title,
      module: issue.module,
      priority: issue.priority,
      status: issue.status,
      description: issue.description || '',
      reporterName: issue.reporterName || '',
    });
    return this.http.post<any>(`${this.root()}/x/api/v2/ai/collab/chat/message`,
      { channelId, senderUserId, content, messageType: 'ISSUE_CARD' },
      { headers: this.authHeaders() }).pipe(catchError(this.err));
  }

  getDmChannels() {
    return this.http.get<any[]>(`${this.root()}/x/api/v2/ai/collab/chat/channel`,
      { headers: this.authHeaders() }).pipe(catchError(this.err));
  }

  private err(error: HttpErrorResponse) {
    const msg = error.error?.message || error.message || 'An unexpected error occurred.';
    return throwError(() => msg);
  }
}

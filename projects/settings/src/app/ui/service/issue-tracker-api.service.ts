import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../sharedComponents/service/environments/environment.prod';

@Injectable({ providedIn: 'root' })
export class IssueTrackerApiService {

  constructor(private http: HttpClient) {}

  private base(): string {
    return (isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl) + '/x/api/v2/manager/issues';
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

  private err(error: HttpErrorResponse) {
    const msg = error.error?.message || error.message || 'An unexpected error occurred.';
    return throwError(() => msg);
  }
}

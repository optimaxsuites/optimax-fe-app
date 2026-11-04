import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../sharedComponent/service/environments/environment.prod';

@Injectable({ providedIn: 'root' })
export class ProcurementLpoService {

  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/commerce/procurement-lpos`;

  constructor(private http: HttpClient) {}

  getAll(procurementRequestId?: number): Observable<any[]> {
    const url = procurementRequestId
      ? `${this.BASE}/?procurementRequestId=${procurementRequestId}`
      : `${this.BASE}/`;
    return this.http.get<any[]>(url).pipe(catchError(this.err));
  }

  get(id: number): Observable<any> {
    return this.http.get<any>(`${this.BASE}/${id}`).pipe(catchError(this.err));
  }

  create(dto: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/`, dto).pipe(catchError(this.err));
  }

  update(id: number, dto: any): Observable<any> {
    return this.http.put<any>(`${this.BASE}/${id}`, dto).pipe(catchError(this.err));
  }

  updateStatus(id: number, status: string): Observable<any> {
    return this.http.patch<any>(`${this.BASE}/${id}/status`, { status }).pipe(catchError(this.err));
  }

  uploadDocument(id: number, file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<any>(`${this.BASE}/${id}/upload-document`, form).pipe(catchError(this.err));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/${id}`).pipe(catchError(this.err));
  }

  private err(error: HttpErrorResponse) {
    const msg = error.error?.message || error.statusText || 'An unexpected error occurred.';
    return throwError(() => `${error.status} ${msg}`);
  }
}

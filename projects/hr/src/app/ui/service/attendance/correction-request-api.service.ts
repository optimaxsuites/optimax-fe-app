import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';
import {
  CorrectionRequest,
  CorrectionRequestApiDTO,
  CreateCorrectionRequestBody,
  UpdateCorrectionStatusRequest,
  PagedResponse
} from '../../domain/attendance/correctionrequest.dto';

/**
 * HTTP API service for Correction Requests
 * Communicates with backend: /x/api/v2/hr/correction-requests
 */
@Injectable({
  providedIn: 'root'
})
export class CorrectionRequestApiService {
  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/hr/correction-requests`;

  constructor(private http: HttpClient) {}

  /** GET /correction-requests */
  getAllCorrectionRequests(page?: number, size?: number): Observable<CorrectionRequest[]> {
    let params = new HttpParams();
    if (page !== undefined) params = params.set('page', page);
    if (size !== undefined) params = params.set('size', size);

    return this.http.get<PagedResponse<CorrectionRequestApiDTO>>(this.BASE, { params }).pipe(
      map(res => (res.content || []).map(r => this.toUiModel(r)))
    );
  }

  /** GET /correction-requests/{id} */
  getCorrectionRequest(id: string): Observable<CorrectionRequest> {
    return this.http.get<CorrectionRequestApiDTO>(`${this.BASE}/${id}`).pipe(
      map(r => this.toUiModel(r))
    );
  }

  /** GET /correction-requests/employee/{employeeId} */
  getEmployeeCorrectionRequests(employeeId: string): Observable<CorrectionRequest[]> {
    return this.http.get<PagedResponse<CorrectionRequestApiDTO>>(`${this.BASE}/employee/${employeeId}`).pipe(
      map(res => (res.content || []).map(r => this.toUiModel(r)))
    );
  }

  /** POST /correction-requests */
  submitCorrectionRequest(body: CreateCorrectionRequestBody): Observable<CorrectionRequest> {
    return this.http.post<CorrectionRequestApiDTO>(this.BASE, body).pipe(
      map(r => this.toUiModel(r))
    );
  }

  /** PUT /correction-requests/{id}/status — handles review/approve/reject/resubmit transitions */
  updateStatus(id: string, request: UpdateCorrectionStatusRequest): Observable<CorrectionRequest> {
    // Backend limits comments to 1000 characters
    const body = { ...request, comments: request.comments?.slice(0, 1000) };
    return this.http.put<CorrectionRequestApiDTO>(`${this.BASE}/${id}/status`, body).pipe(
      map(r => this.toUiModel(r))
    );
  }

  /** DELETE /correction-requests/{id} */
  withdrawCorrectionRequest(id: string): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/${id}`);
  }

  private toUiModel(dto: CorrectionRequestApiDTO): CorrectionRequest {
    const employee = dto.employeeId;

    return {
      id: String(dto.id),
      employeeId: employee ? String(employee.id) : '',
      employeeName: employee ? `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() : undefined,
      department: employee?.department?.name ?? '',
      date: this.toDate(dto.attendanceDate) ?? new Date(),
      issueType: dto.issueType,
      correctionType: dto.correctionType,
      requestedClockIn: this.toDate(dto.requestedClockIn),
      requestedClockOut: this.toDate(dto.requestedClockOut),
      description: dto.description,
      evidence: dto.evidence,
      status: dto.status,
      locked: dto.locked,
      rejectionReason: dto.rejectionReason,
      latestNotification: dto.latestNotification,
      history: (dto.history || []).map(h => ({
        status: h.status,
        actor: String(h.actor),
        note: h.comments,
        createdAt: this.toDate(h.createdAt) ?? new Date()
      })),
      createdAt: this.toDate(dto.createdAt) ?? new Date(),
      updatedAt: this.toDate(dto.updatedAt)
    };
  }

  // The backend serialises LocalDateTime as [y, m, d, h, mi, s, nano], which `new Date()` misreads.
  private toDate(value: unknown): Date | undefined {
    if (!value) return undefined;
    if (Array.isArray(value)) {
      const [y, mo, d, h = 0, mi = 0, s = 0, nano = 0] = value as number[];
      return new Date(y, mo - 1, d, h, mi, s, Math.floor(nano / 1e6));
    }
    const parsed = new Date(value as string);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
}

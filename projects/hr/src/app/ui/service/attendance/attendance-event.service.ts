import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';
import {
  AttendanceEventDTO,
  CreateAttendanceEventRequest,
  EventType,
  PagedResponse
} from '../../domain/attendance/attendance-event.dto';

const EMPTY_PAGE: PagedResponse<AttendanceEventDTO> = { content: [], totalSize: 0, page: 0, size: 0 };

@Injectable({ providedIn: 'root' })
export class AttendanceEventService {
  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/hr/attendance-events`;

  /** In-memory suppression of duplicate taps: same employee + eventType within the window is ignored. */
  readonly DEDUP_WINDOW_MS = 90000; // 90 seconds
  private recentEventsCache = new Map<string, number>();

  constructor(private http: HttpClient) {}

  getEvents(page?: number, size?: number): Observable<PagedResponse<AttendanceEventDTO>> {
    let params = new HttpParams();
    if (page !== undefined) params = params.set('page', page);
    if (size !== undefined) params = params.set('size', size);

    return this.http.get<PagedResponse<AttendanceEventDTO>>(this.BASE, { params }).pipe(
      catchError(error => {
        console.error('Failed to get attendance events:', error);
        return of(EMPTY_PAGE);
      })
    );
  }

  getEvent(id: number): Observable<AttendanceEventDTO | null> {
    return this.http.get<AttendanceEventDTO>(`${this.BASE}/${id}`).pipe(
      catchError(error => {
        console.error(`Failed to get attendance event ${id}:`, error);
        return of(null);
      })
    );
  }

  createEvent(event: CreateAttendanceEventRequest): Observable<AttendanceEventDTO> {
    return this.http.post<AttendanceEventDTO>(this.BASE, event);
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/${id}`);
  }

  markProcessed(id: number): Observable<AttendanceEventDTO> {
    return this.http.post<AttendanceEventDTO>(`${this.BASE}/${id}/mark-processed`, {});
  }

  getEventsByEmployee(employeeId: number): Observable<PagedResponse<AttendanceEventDTO>> {
    return this.http.get<PagedResponse<AttendanceEventDTO>>(`${this.BASE}/employee/${employeeId}`).pipe(
      catchError(error => {
        console.error(`Failed to get events for employee ${employeeId}:`, error);
        return of(EMPTY_PAGE);
      })
    );
  }

  getUnprocessedEvents(): Observable<PagedResponse<AttendanceEventDTO>> {
    return this.http.get<PagedResponse<AttendanceEventDTO>>(`${this.BASE}/unprocessed`).pipe(
      catchError(error => {
        console.error('Failed to get unprocessed events:', error);
        return of(EMPTY_PAGE);
      })
    );
  }

  /**
   * Submit a biometric/remote/manual event, suppressing duplicate taps: an event with the same
   * employee + eventType within DEDUP_WINDOW_MS of the last one is not sent to the backend.
   */
  submitEvent(event: CreateAttendanceEventRequest): Observable<AttendanceEventDTO | null> {
    const dedupKey = `${event.employeeId}:${event.eventType}`;
    const lastSeen = this.recentEventsCache.get(dedupKey);
    if (lastSeen && Date.now() - lastSeen < this.DEDUP_WINDOW_MS) {
      return of(null);
    }

    return this.createEvent(event).pipe(
      tap(() => {
        this.recentEventsCache.set(dedupKey, Date.now());
        this.cleanupDedupCache();
      }),
      catchError(error => {
        console.error('Failed to submit attendance event:', error);
        throw error;
      })
    );
  }

  wouldBeDuplicated(employeeId: number, eventType: EventType): boolean {
    const dedupKey = `${employeeId}:${eventType}`;
    const lastSeen = this.recentEventsCache.get(dedupKey);
    return lastSeen ? Date.now() - lastSeen < this.DEDUP_WINDOW_MS : false;
  }

  getTimeUntilNextEvent(employeeId: number, eventType: EventType): number {
    const dedupKey = `${employeeId}:${eventType}`;
    const lastSeen = this.recentEventsCache.get(dedupKey);
    if (!lastSeen) return 0;
    return Math.max(0, this.DEDUP_WINDOW_MS - (Date.now() - lastSeen));
  }

  clearDedupCache(): void {
    this.recentEventsCache.clear();
  }

  private cleanupDedupCache(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.recentEventsCache.entries()) {
      if (now - timestamp > this.DEDUP_WINDOW_MS) {
        this.recentEventsCache.delete(key);
      }
    }
  }
}

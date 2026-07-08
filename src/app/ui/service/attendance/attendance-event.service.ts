import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';
import {
  AttendanceEventDTO,
  ProcessingResult,
  EventSource,
  EventType,
  FraudFlagCode
} from '../../domain/attendance/attendance-event.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable({ providedIn: 'root' })
export class AttendanceEventService {
  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/hr`;
  private eventsSubject = new BehaviorSubject<AttendanceEventDTO[]>([]);
  private recentEventsCache = new Map<string, { timestamp: number; event: AttendanceEventDTO }>();

  events$ = this.eventsSubject.asObservable();
  readonly DEDUP_WINDOW_MS = 90000; // 90 seconds

  constructor(private http: HttpClient) {}

  /**
   * Submit an attendance event (biometric, remote, or manual)
   * Includes deduplication check: events within 90 seconds with same
   * employeeCode and eventType are suppressed
   */
  submitEvent(
    source: EventSource,
    employeeCode: string,
    employeeId: number,
    branchCode: string,
    eventType: EventType,
    options?: {
      deviceId?: string;
      rawTemplateHash?: string;
      ipAddress?: string;
      deviceFingerprint?: string;
      gpsLat?: number;
      gpsLng?: number;
      isCrossBranch?: boolean;
      homeBranchCode?: string;
    }
  ): Observable<ProcessingResult> {
    const dedup_key = `${employeeCode}:${eventType}`;

    // Check deduplication window
    const cached = this.recentEventsCache.get(dedup_key);
    if (cached && Date.now() - cached.timestamp < this.DEDUP_WINDOW_MS) {
      return of({
        eventId: cached.event.id || 0,
        status: 'DUPLICATE',
        message: `Duplicate event suppressed. Previous event within ${this.DEDUP_WINDOW_MS / 1000}s window.`,
        fraudFlags: []
      });
    }

    const event: AttendanceEventDTO = {
      source,
      employeeCode,
      employeeId,
      branchCode,
      deviceId: options?.deviceId,
      eventTime: new Date().toISOString(),
      eventType,
      rawTemplateHash: options?.rawTemplateHash,
      ipAddress: options?.ipAddress,
      deviceFingerprint: options?.deviceFingerprint,
      gpsLat: options?.gpsLat,
      gpsLng: options?.gpsLng,
      fraudFlags: [],
      isCrossBranch: options?.isCrossBranch || false,
      homeBranchCode: options?.homeBranchCode,
      processed: false
    };

    return this.http.post<ProcessingResult>(
      `${this.BASE}/attendance-events`,
      event
    ).pipe(
      tap(result => {
        // Cache the event for deduplication
        this.recentEventsCache.set(dedup_key, {
          timestamp: Date.now(),
          event
        });

        // Add to local events list
        const events = this.eventsSubject.value;
        this.eventsSubject.next([...events, event]);

        // Cleanup old cache entries
        this.cleanupDedupCache();
      }),
      catchError((err) => {
        console.error('Error submitting attendance event:', err);
        throw err;
      })
    );
  }

  /**
   * Biometric event with template hash and device info
   */
  submitBiometricEvent(
    employeeCode: string,
    employeeId: number,
    branchCode: string,
    deviceId: string,
    templateHash: string,
    eventType: EventType,
    ipAddress?: string,
    isCrossBranch?: boolean,
    homeBranchCode?: string
  ): Observable<ProcessingResult> {
    return this.submitEvent(
      'BIOMETRIC',
      employeeCode,
      employeeId,
      branchCode,
      eventType,
      {
        deviceId,
        rawTemplateHash: templateHash,
        ipAddress,
        isCrossBranch,
        homeBranchCode
      }
    );
  }

  /**
   * Remote (web/mobile) event with IP, device fingerprint, and optional GPS
   */
  submitRemoteEvent(
    employeeCode: string,
    employeeId: number,
    branchCode: string,
    eventType: EventType,
    ipAddress: string,
    deviceFingerprint: string,
    gpsLat?: number,
    gpsLng?: number,
    isCrossBranch?: boolean,
    homeBranchCode?: string
  ): Observable<ProcessingResult> {
    return this.submitEvent(
      'REMOTE',
      employeeCode,
      employeeId,
      branchCode,
      eventType,
      {
        ipAddress,
        deviceFingerprint,
        gpsLat,
        gpsLng,
        isCrossBranch,
        homeBranchCode
      }
    );
  }

  /**
   * Manual event (correction, admin entry)
   */
  submitManualEvent(
    employeeCode: string,
    employeeId: number,
    branchCode: string,
    eventType: EventType,
    reason?: string
  ): Observable<ProcessingResult> {
    return this.submitEvent(
      'MANUAL',
      employeeCode,
      employeeId,
      branchCode,
      eventType,
      {}
    );
  }

  /**
   * Fetch unprocessed events (for batch processing)
   */
  getUnprocessedEvents(limit: number = 100): Observable<AttendanceEventDTO[]> {
    return this.http.get<any>(
      `${this.BASE}/attendance-events/unprocessed?limit=${limit}`
    ).pipe(
      map(res => Array.isArray(res) ? res : (res?.events ?? [])),
      catchError(() => of([]))
    );
  }

  /**
   * Fetch events for a specific employee on a date
   */
  getEventsByEmployeeAndDate(
    employeeId: number,
    date: string
  ): Observable<AttendanceEventDTO[]> {
    return this.http.get<any>(
      `${this.BASE}/attendance-events/employee/${employeeId}?date=${date}`
    ).pipe(
      map(res => Array.isArray(res) ? res : (res?.events ?? [])),
      catchError(() => of([]))
    );
  }

  /**
   * Get recent events with fraud flags
   */
  getFlaggedEvents(
    startDate?: string,
    endDate?: string,
    fraudFlagType?: string
  ): Observable<AttendanceEventDTO[]> {
    let url = `${this.BASE}/attendance-events/flagged`;
    const params = [];

    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    if (fraudFlagType) params.push(`flagType=${fraudFlagType}`);

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return this.http.get<any>(url)
      .pipe(
        map(res => Array.isArray(res) ? res : (res?.events ?? [])),
        catchError(() => of([]))
      );
  }

  /**
   * Check if event would be deduplicated
   */
  wouldBeDuplicated(employeeCode: string, eventType: EventType): boolean {
    const dedup_key = `${employeeCode}:${eventType}`;
    const cached = this.recentEventsCache.get(dedup_key);
    return cached ? Date.now() - cached.timestamp < this.DEDUP_WINDOW_MS : false;
  }

  /**
   * Get time until next event is allowed (for duplicate prevention)
   */
  getTimeUntilNextEvent(employeeCode: string, eventType: EventType): number {
    const dedup_key = `${employeeCode}:${eventType}`;
    const cached = this.recentEventsCache.get(dedup_key);
    if (!cached) return 0;

    const elapsed = Date.now() - cached.timestamp;
    return Math.max(0, this.DEDUP_WINDOW_MS - elapsed);
  }

  /**
   * Clean up old cache entries (older than dedup window)
   */
  private cleanupDedupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.recentEventsCache.entries()) {
      if (now - value.timestamp > this.DEDUP_WINDOW_MS) {
        this.recentEventsCache.delete(key);
      }
    }
  }

  /**
   * Clear cache (for testing)
   */
  clearDedupCache(): void {
    this.recentEventsCache.clear();
  }

  /**
   * Get current dedup cache state
   */
  getDedupCacheState(): Map<string, { timestamp: number; event: AttendanceEventDTO }> {
    return new Map(this.recentEventsCache);
  }
}

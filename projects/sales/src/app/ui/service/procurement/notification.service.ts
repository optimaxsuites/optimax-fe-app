import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ProcurementNotification, NotificationType } from '../../domain/procurement-request/procurement.dto';
import { environment } from '../../shared-component/service/environments/environment';

export interface NotificationTrigger {
  type: NotificationType;
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  relatedEntityId: string;
  relatedEntityType: string;
  templateData: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private readonly baseUrl = environment.apiBaseUrl + '/x/api/v2/commerce';
  private notifications$$ = new BehaviorSubject<ProcurementNotification[]>([]);
  readonly notifications$ = this.notifications$$.asObservable();

  constructor(private http: HttpClient) {}

  private get tenantId(): string {
    const h = window.location.hostname;
    return (h.includes('localhost') || h.includes('127.0.0.1')) ? 'optimax' : h.split('.')[0] || 'optimax';
  }

  /**
   * Triggers an email + in-app notification. Called by procurement components
   * at each lifecycle event (RFQ sent, LPO issued, GRN approved, payment done).
   */
  trigger(trigger: NotificationTrigger): Observable<ProcurementNotification[]> {
    return this.http.post<any>(`${this.baseUrl}/notifications/trigger`, {
      ...trigger,
      tenantId: this.tenantId,
      channels: ['EMAIL', 'IN_APP']
    }).pipe(
      map(res => Array.isArray(res) ? res : (res?.notifications ?? [])),
      tap(list => {
        const current = this.notifications$$.getValue();
        this.notifications$$.next([...list, ...current]);
      }),
      catchError(err => {
        console.error('[NotificationService] trigger failed:', err);
        return of([]);
      })
    );
  }

  /**
   * Loads notification history for a specific entity.
   */
  getForEntity(entityId: string, entityType: string): Observable<ProcurementNotification[]> {
    const params = new HttpParams()
      .set('entityId', entityId)
      .set('entityType', entityType)
      .set('tenantId', this.tenantId);
    return this.http.get<any>(`${this.baseUrl}/notifications`, { params }).pipe(
      map(res => Array.isArray(res) ? res : (res?.data ?? [])),
      tap(list => this.notifications$$.next(list)),
      catchError(() => of([]))
    );
  }

  retryFailed(notificationId: string): Observable<ProcurementNotification> {
    return this.http.patch<ProcurementNotification>(
      `${this.baseUrl}/notifications/${notificationId}/retry`, {}
    ).pipe(catchError(err => { throw err; }));
  }

  getDeliveryStatus(notificationId: string): Observable<ProcurementNotification> {
    return this.http.get<ProcurementNotification>(
      `${this.baseUrl}/notifications/${notificationId}`
    ).pipe(catchError(err => { throw err; }));
  }
}

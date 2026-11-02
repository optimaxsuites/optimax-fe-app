import { toApiDate } from '../sales/date.util';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../shared-component/service/environments/environment';

export interface ProcurementMessage {
  id: string;
  rfqId: string | number;
  senderId: string;
  senderName: string;
  senderRole: 'REQUESTER' | 'VENDOR' | 'SYSTEM';
  content: string;
  attachments?: { name: string; url: string; size: number }[];
  isRead: boolean;
  createdAt: Date;
  messageType: 'TEXT' | 'REVISION_REQUEST' | 'CLARIFICATION' | 'SYSTEM_NOTIFICATION';
}

export interface SendMessagePayload {
  rfqId: string | number;
  content: string;
  messageType: 'TEXT' | 'REVISION_REQUEST' | 'CLARIFICATION' | 'SYSTEM_NOTIFICATION';
  tenantId: string;
  senderRole: 'REQUESTER' | 'VENDOR';
}

@Injectable({
  providedIn: 'root'
})
export class ProcurementMessagingService {

  private readonly baseUrl = environment.apiBaseUrl + '/x/api/v2/commerce';

  constructor(private http: HttpClient) {}

  private get tenantId(): string {
    const h = window.location.hostname;
    return (h.includes('localhost') || h.includes('127.0.0.1')) ? 'optimax' : h.split('.')[0] || 'optimax';
  }

  getMessages(rfqId: string | number): Observable<ProcurementMessage[]> {
    const params = new HttpParams()
      .set('rfqId', String(rfqId))
      .set('page', '1')
      .set('size', '100');

    return this.http.get<any>(`${this.baseUrl}/rfq-messages`, { params }).pipe(
      map((res: any) => {
        const raw: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        return raw.map(m => ({
          ...m,
          createdAt: m.createdAt ? toApiDate(m.createdAt) : new Date()
        })) as ProcurementMessage[];
      }),
      catchError(err => {
        console.error('[ProcurementMessaging] Failed to load messages:', err);
        return of([] as ProcurementMessage[]);
      })
    );
  }

  sendMessage(
    rfqId: string | number,
    content: string,
    senderRole: 'REQUESTER' | 'VENDOR',
    type: 'TEXT' | 'REVISION_REQUEST' | 'CLARIFICATION' | 'SYSTEM_NOTIFICATION' = 'TEXT'
  ): Observable<ProcurementMessage> {
    const payload: SendMessagePayload = {
      rfqId,
      content,
      messageType: type,
      tenantId: this.tenantId,
      senderRole
    };

    // A failed send used to be swallowed and turned into a fabricated local "sent" message —
    // the caller had no way to tell it wasn't real, so it rendered as delivered, then silently
    // disappeared the next time pollMessages() replaced the list with the server's real one
    // (which never contained it). Re-throw instead so the caller can show a real error and keep
    // the user's draft instead of a false success.
    return this.http.post<any>(`${this.baseUrl}/rfq-messages`, payload).pipe(
      map((res: any) => ({
        ...res,
        createdAt: res.createdAt ? toApiDate(res.createdAt) : new Date()
      }) as ProcurementMessage),
      catchError(err => {
        console.error('[ProcurementMessaging] Failed to send message:', err);
        return throwError(() => err);
      })
    );
  }

  markAsRead(messageId: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/rfq-messages/${messageId}/read`, {}).pipe(
      catchError(err => {
        console.error('[ProcurementMessaging] Failed to mark as read:', err);
        return of(undefined as void);
      })
    );
  }
}

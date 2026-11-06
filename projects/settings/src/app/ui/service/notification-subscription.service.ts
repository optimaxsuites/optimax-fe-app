import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NotificationSubscription {
  module: string;
  eventType: string;
  inApp: boolean;
  email: boolean;
  pushNotif: boolean;
  sms: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationSubscriptionService {
  private readonly api = '/x/api/v2/notifications/subscriptions';

  constructor(private http: HttpClient) {}

  getSubscriptions(): Observable<NotificationSubscription[]> {
    return this.http.get<NotificationSubscription[]>(this.api);
  }

  saveSubscriptions(subs: NotificationSubscription[]): Observable<NotificationSubscription[]> {
    return this.http.put<NotificationSubscription[]>(this.api, subs);
  }
}

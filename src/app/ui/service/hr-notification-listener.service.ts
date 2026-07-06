import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface HrBankChangeNotification {
  type: 'bank_change_request';
  employeeName: string;
  employeeId: string;
  requestedBankName: string;
  requestedAccountNumber: string;
  recipientEmail: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class HrNotificationListenerService {
  private bankChangeNotifications$ = new BehaviorSubject<HrBankChangeNotification[]>([]);
  
  constructor(private ngZone: NgZone) {
    this.initializeListeners();
  }

  /**
   * Get observable of all bank change notifications received
   */
  getBankChangeNotifications(): Observable<HrBankChangeNotification[]> {
    return this.bankChangeNotifications$.asObservable();
  }

  /**
   * Get the latest bank change notification
   */
  getLatestNotification(): HrBankChangeNotification | null {
    const notifications = this.bankChangeNotifications$.value;
    return notifications.length > 0 ? notifications[0] : null;
  }

  /**
   * Clear all stored notifications
   */
  clearNotifications(): void {
    this.bankChangeNotifications$.next([]);
  }

  /**
   * Initialize event listeners for in-app notifications
   */
  private initializeListeners(): void {
    if (typeof window === 'undefined') return;

    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('hr-bank-change-notification', (event: any) => {
        this.ngZone.run(() => {
          const notification: HrBankChangeNotification = event.detail;
          const current = this.bankChangeNotifications$.value;
          
          // Keep max 50 notifications
          const updated = [notification, ...current].slice(0, 50);
          this.bankChangeNotifications$.next(updated);

          console.log('HR Bank Change Notification received:', notification);
        });
      });
    });
  }

  /**
   * Manually add a notification (useful for testing)
   */
  addNotification(notification: HrBankChangeNotification): void {
    const current = this.bankChangeNotifications$.value;
    const updated = [notification, ...current].slice(0, 50);
    this.bankChangeNotifications$.next(updated);
  }
}

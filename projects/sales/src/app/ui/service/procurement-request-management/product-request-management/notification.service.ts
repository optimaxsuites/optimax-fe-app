import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, BehaviorSubject, interval, of, fromEvent, timer } from 'rxjs';
import { map, filter, switchMap, retry, takeUntil, share, catchError, delay } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import type { Notification as NotificationModel, NotificationType, NotificationCounts, NotificationPreferences } from '../../../domain/procurement-request/product-requests/notification.dto';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  
  private wsConnection: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private notificationSubject = new Subject<NotificationModel>();
  private connectionStatus = new BehaviorSubject<ConnectionStatus>('DISCONNECTED');
  private destroy$ = new Subject<void>();
  
  // Public observables
  public notifications$ = this.notificationSubject.asObservable();
  public connectionStatus$ = this.connectionStatus.asObservable();
  
  // Mock data for demo
  private mockNotifications: NotificationModel[] = [];
  private unreadCount = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCount.asObservable();
  
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  constructor(private http: HttpClient) {
    this.loadMockData();
    this.connectWebSocket();
    this.startHeartbeat();
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMockData(): void {
    // Mock notifications for demo
    this.mockNotifications = [
      {
        id: '1',
        userId: 'CUST-001',
        type: 'REQUEST_STATUS_CHANGED',
        title: 'Request Status Updated',
        message: 'Your request REQ-001 has moved to "Vendors Quoting" stage',
        severity: 'INFO',
        status: 'UNREAD',
        data: { requestId: 'REQ-001', status: 'VENDORS_QUOTING' },
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
        actions: [{ label: 'View Request', action: 'view', url: '/commerce/requests/REQ-001', primary: true }]
      },
      {
        id: '2',
        userId: 'CUST-001',
        type: 'QUOTATION_RECEIVED',
        title: 'New Quotation Received',
        message: 'Furniture Hub Ltd submitted a quotation for your request',
        severity: 'SUCCESS',
        status: 'UNREAD',
        data: { requestId: 'REQ-001', vendorId: 'VEND-001', vendorName: 'Furniture Hub Ltd', amount: 21000, currency: 'NGN' },
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
        actions: [
          { label: 'View Quotation', action: 'view', url: '/commerce/requests/REQ-001', primary: true },
          { label: 'Dismiss', action: 'dismiss', primary: false }
        ]
      },
      {
        id: '3',
        userId: 'CUST-001',
        type: 'DELIVERY_DISPATCHED',
        title: 'Order Dispatched',
        message: 'Your order has been dispatched and is on its way',
        severity: 'SUCCESS',
        status: 'READ',
        data: { requestId: 'REQ-002', trackingNumber: 'TRK-123456789' },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        actions: [{ label: 'Track Delivery', action: 'track', url: '/commerce/track/REQ-002', primary: true }]
      },
      {
        id: '4',
        userId: 'CUST-001',
        type: 'PAYMENT_CONFIRMED',
        title: 'Payment Confirmed',
        message: 'Your payment of $22,500 has been confirmed',
        severity: 'SUCCESS',
        status: 'READ',
        data: { requestId: 'REQ-001', amount: 22500, currency: 'NGN' },
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        actions: [{ label: 'View Receipt', action: 'view', url: '/commerce/requests/REQ-001', primary: true }]
      },
      {
        id: '5',
        userId: 'CUST-001',
        type: 'DELIVERY_DELAYED',
        title: 'Delivery Delay Notice',
        message: 'Your delivery has been delayed due to weather conditions. New ETA: Tomorrow',
        severity: 'WARNING',
        status: 'UNREAD',
        data: { requestId: 'REQ-003', eta: '2026-06-01' },
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        actions: [{ label: 'Track Delivery', action: 'track', url: '/commerce/track/REQ-003', primary: true }]
      }
    ];
    
    this.updateUnreadCount();
  }

  private updateUnreadCount(): void {
    const unread = this.mockNotifications.filter(n => n.status === 'UNREAD').length;
    this.unreadCount.next(unread);
  }

  // WebSocket Connection
  private connectWebSocket(): void {
    const wsUrl = 'ws://localhost:8080/ws/notifications'; // Replace with your WebSocket URL
    
    this.wsConnection = new WebSocket(wsUrl);
    
    this.wsConnection.onopen = () => {
      console.log('WebSocket connected');
      this.connectionStatus.next('CONNECTED');
      this.reconnectAttempts = 0;
    };
    
    this.wsConnection.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data) as NotificationModel;
        this.addNotification(notification);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.wsConnection.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.connectionStatus.next('ERROR');
    };
    
    this.wsConnection.onclose = () => {
      console.log('WebSocket disconnected');
      this.connectionStatus.next('DISCONNECTED');
      this.attemptReconnect();
    };
  }

  // SSE (Server-Sent Events) Alternative
  private connectSSE(): void {
    const sseUrl = 'http://localhost:8080/sse/notifications'; // Replace with your SSE URL
    
    this.eventSource = new EventSource(sseUrl);
    
    this.eventSource.onopen = () => {
      console.log('SSE connection opened');
      this.connectionStatus.next('CONNECTED');
    };
    
    this.eventSource.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data) as NotificationModel;
        this.addNotification(notification);
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };
    
    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      this.connectionStatus.next('ERROR');
      this.eventSource?.close();
      this.attemptReconnect();
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connectWebSocket();
      }, delay);
    } else {
      console.log('Max reconnection attempts reached. Falling back to polling.');
      this.startPolling();
    }
  }

  private startPolling(): void {
    // Fallback to HTTP polling every 10 seconds
    interval(10000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.pollNotifications();
      });
  }

  private pollNotifications(): void {
    this.http.get<NotificationModel[]>('/api/notifications/poll')
      .pipe(catchError(error => {
        console.error('Polling error:', error);
        return of([]);
      }))
      .subscribe(notifications => {
        notifications.forEach(notif => this.addNotification(notif));
      });
  }

  private startHeartbeat(): void {
    // Send heartbeat every 30 seconds to keep connection alive
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
          this.wsConnection.send(JSON.stringify({ type: 'HEARTBEAT', timestamp: Date.now() }));
        }
      });
  }

  private addNotification(notification: NotificationModel): void {
    // Add to beginning of array
    this.mockNotifications.unshift(notification);
    
    // Keep only last 100 notifications
    if (this.mockNotifications.length > 100) {
      this.mockNotifications.pop();
    }
    
    this.updateUnreadCount();
    this.notificationSubject.next(notification);
    
    // Show browser notification if enabled
    this.showBrowserNotification(notification);
  }

  private showBrowserNotification(notification: NotificationModel): void {
    if (window.Notification.permission === 'granted') {
      const browserNotif = new window.Notification(notification.title, {
        body: notification.message,
        icon: '/assets/notification-icon.png',
        tag: notification.id,
        requireInteraction: notification.severity === 'ERROR'
      });
      
      browserNotif.onclick = () => {
        if (notification.data.url) {
          window.location.href = notification.data.url;
        }
      };
    }
  }

  // Public methods
  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  getNotifications(page: number = 0, size: number = 20): Observable<{ data: NotificationModel[]; total: number }> {
    // Replace with actual API call
    const start = page * size;
    const paginated = this.mockNotifications.slice(start, start + size);
    return of({
      data: paginated,
      total: this.mockNotifications.length
    }).pipe(delay(300));
  }

  markAsRead(notificationId: string): Observable<void> {
    const notification = this.mockNotifications.find(n => n.id === notificationId);
    if (notification && notification.status === 'UNREAD') {
      notification.status = 'READ';
      notification.readAt = new Date();
      this.updateUnreadCount();
    }
    return of(void 0).pipe(delay(100));
  }

  markAllAsRead(): Observable<void> {
    this.mockNotifications.forEach(n => {
      if (n.status === 'UNREAD') {
        n.status = 'READ';
        n.readAt = new Date();
      }
    });
    this.updateUnreadCount();
    return of(void 0).pipe(delay(100));
  }

  archiveNotification(notificationId: string): Observable<void> {
    const notification = this.mockNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.status = 'ARCHIVED';
    }
    return of(void 0).pipe(delay(100));
  }

  deleteNotification(notificationId: string): Observable<void> {
    const index = this.mockNotifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      this.mockNotifications.splice(index, 1);
      this.updateUnreadCount();
    }
    return of(void 0).pipe(delay(100));
  }

  requestBrowserPermission(): void {
    if (window.Notification.permission !== 'granted' && window.Notification.permission !== 'denied') {
      window.Notification.requestPermission();
    }
  }

  getUnreadCount(): Observable<number> {
    return this.unreadCount$;
  }

  getConnectionStatus(): Observable<ConnectionStatus> {
    return this.connectionStatus$;
  }

  // WebSocket send method for actions like "seen"
  sendWebSocketMessage(message: any): void {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify(message));
    }
  }
}

type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';
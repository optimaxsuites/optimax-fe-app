// src/app/ui/view/notification/notification-center.component.ts

import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from '../../../../service/procurement-request-management/product-request-management/notification.service';
import { Notification, NotificationType, NotificationSeverity } from '../../../../domain/procurement-request/product-requests/notification.dto';

@Component({
  selector: 'app-notification-center',
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.scss']
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  unreadCount = 0;
  connectionStatus: string = 'DISCONNECTED';
  isLoading = false;
  showDropdown = false;
  showFullPage = false;
  
  // Filters
  selectedFilter: NotificationType | 'ALL' = 'ALL';
  selectedSeverity: NotificationSeverity | 'ALL' = 'ALL';
  searchTerm = '';
  
  // Pagination
  currentPage = 0;
  pageSize = 20;
  totalNotifications = 0;
  
  private destroy$ = new Subject<void>();
  
  // Icon mapping
  private typeIcons: Record<NotificationType, string> = {
    'REQUEST_CREATED': 'file-plus',
    'REQUEST_UPDATED': 'edit',
    'REQUEST_STATUS_CHANGED': 'refresh-cw',
    'REQUEST_CANCELLED': 'x-circle',
    'QUOTATION_RECEIVED': 'file-text',
    'QUOTATION_SELECTED': 'check-circle',
    'VENDOR_SELECTED': 'check-circle',
    'LPO_ISSUED': 'file',
    'PAYMENT_RECEIVED': 'credit-card',
    'PAYMENT_CONFIRMED': 'check-circle',
    'DELIVERY_DISPATCHED': 'truck',
    'DELIVERY_IN_TRANSIT': 'truck',
    'DELIVERY_OUT_FOR_DELIVERY': 'package',
    'DELIVERY_DELIVERED': 'home',
    'DELIVERY_DELAYED': 'clock',
    'VENDOR_RESPONSE': 'message-circle',
    'SYSTEM_ALERT': 'alert-circle',
    'REMINDER': 'bell'
  };
  
  private severityColors: Record<NotificationSeverity, string> = {
    'INFO': 'severity-info',
    'SUCCESS': 'severity-success',
    'WARNING': 'severity-warning',
    'ERROR': 'severity-error'
  };

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.subscribeToRealtime();
    this.requestBrowserPermission();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadNotifications(): void {
    this.isLoading = true;
    this.notificationService.getNotifications(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notifications = response.data;
          this.totalNotifications = response.total;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.isLoading = false;
        }
      });
  }

  private subscribeToRealtime(): void {
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        this.notifications.unshift(notification);
        this.totalNotifications++;
        this.applyFilters();
        this.playNotificationSound(notification);
      });

    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
      });

    this.notificationService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.connectionStatus = status;
      });
  }

  private requestBrowserPermission(): void {
    this.notificationService.requestBrowserPermission();
  }

  private playNotificationSound(notification: Notification): void {
    // Play sound based on severity
    const audio = new Audio();
    switch (notification.severity) {
      case 'SUCCESS':
        audio.src = '/assets/sounds/success.mp3';
        break;
      case 'WARNING':
        audio.src = '/assets/sounds/warning.mp3';
        break;
      case 'ERROR':
        audio.src = '/assets/sounds/error.mp3';
        break;
      default:
        audio.src = '/assets/sounds/notification.mp3';
    }
    audio.play().catch(e => console.log('Audio play failed:', e));
  }

  applyFilters(): void {
    let filtered = [...this.notifications];
    
    if (this.selectedFilter !== 'ALL') {
      filtered = filtered.filter(n => n.type === this.selectedFilter);
    }
    
    if (this.selectedSeverity !== 'ALL') {
      filtered = filtered.filter(n => n.severity === this.selectedSeverity);
    }
    
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(search) ||
        n.message.toLowerCase().includes(search)
      );
    }
    
    this.filteredNotifications = filtered;
  }

  markAsRead(notification: Notification): void {
    if (notification.status === 'UNREAD') {
      this.notificationService.markAsRead(notification.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          notification.status = 'READ';
          notification.readAt = new Date();
          this.applyFilters();
        });
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.notifications.forEach(n => {
          if (n.status === 'UNREAD') {
            n.status = 'READ';
            n.readAt = new Date();
          }
        });
        this.applyFilters();
      });
  }

  deleteNotification(notification: Notification): void {
    this.notificationService.deleteNotification(notification.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const index = this.notifications.findIndex(n => n.id === notification.id);
        if (index !== -1) {
          this.notifications.splice(index, 1);
          this.totalNotifications--;
          this.applyFilters();
        }
      });
  }

  handleAction(notification: Notification, action: any): void {
    this.markAsRead(notification);
    
    if (action.url) {
      this.router.navigateByUrl(action.url);
    }
    
    this.showDropdown = false;
    this.showFullPage = false;
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    return `${diffDays} days ago`;
  }

  getTypeIcon(type: NotificationType): string {
    return this.typeIcons[type] || 'bell';
  }

  getSeverityClass(severity: NotificationSeverity): string {
    return this.severityColors[severity];
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) {
      this.loadNotifications();
    }
  }

  openFullPage(): void {
    this.showFullPage = true;
    this.showDropdown = false;
    this.loadNotifications();
  }

  closeFullPage(): void {
    this.showFullPage = false;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-dropdown') && !target.closest('.notification-bell')) {
      this.showDropdown = false;
    }
  }

  loadMore(): void {
    this.currentPage++;
    this.notificationService.getNotifications(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notifications = [...this.notifications, ...response.data];
          this.totalNotifications = response.total;
          this.applyFilters();
        },
        error: (error) => {
          console.error('Error loading more notifications:', error);
        }
      });
  }

  getConnectionStatusIcon(): string {
    switch (this.connectionStatus) {
      case 'CONNECTED': return 'wifi';
      case 'CONNECTING': return 'loader';
      case 'ERROR': return 'wifi-off';
      default: return 'wifi-off';
    }
  }

  getConnectionStatusText(): string {
    switch (this.connectionStatus) {
      case 'CONNECTED': return 'Live';
      case 'CONNECTING': return 'Connecting...';
      case 'ERROR': return 'Offline';
      default: return 'Offline';
    }
  }
}
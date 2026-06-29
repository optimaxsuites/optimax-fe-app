// src/app/ui/domain/notification/notification.model.ts

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  status: NotificationStatus;
  data: NotificationData;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
  actions?: NotificationAction[];
}

export type NotificationType = 
  | 'REQUEST_CREATED'
  | 'REQUEST_UPDATED'
  | 'REQUEST_STATUS_CHANGED'
  | 'REQUEST_CANCELLED'
  | 'QUOTATION_RECEIVED'
  | 'QUOTATION_SELECTED'
  | 'VENDOR_SELECTED'
  | 'LPO_ISSUED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_CONFIRMED'
  | 'DELIVERY_DISPATCHED'
  | 'DELIVERY_IN_TRANSIT'
  | 'DELIVERY_OUT_FOR_DELIVERY'
  | 'DELIVERY_DELIVERED'
  | 'DELIVERY_DELAYED'
  | 'VENDOR_RESPONSE'
  | 'SYSTEM_ALERT'
  | 'REMINDER';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';

export interface NotificationData {
  requestId?: string;
  quotationId?: string;
  vendorId?: string;
  vendorName?: string;
  trackingNumber?: string;
  eta?: string;
  amount?: number;
  currency?: string;
  status?: string;
  message?: string;
  url?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationAction {
  label: string;
  action: string;
  url?: string;
  primary?: boolean;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  types: {
    [key in NotificationType]?: {
      enabled: boolean;
      email: boolean;
      push: boolean;
      inApp: boolean;
    };
  };
}

export interface NotificationCounts {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  bySeverity: Record<NotificationSeverity, number>;
}
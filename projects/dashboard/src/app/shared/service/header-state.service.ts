import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// damilola worked on this: shared header state for unread counts, profile sync, and live notifications.
export interface HeaderNotificationItem {
  id: string;
  title: string;
  body: string;
  category: 'chat' | 'feed' | 'module' | 'system';
  createdAt: number;
  read: boolean;
  route?: string;
  avatarUrl?: string;
  contextLabel?: string;
  workspaceMode?: 'feed' | 'chat';
  channelBackendId?: number;
  dmUserId?: number;
  messageBackendId?: number;
  threadRootMessageBackendId?: number;
  taskRoutineId?: string;
  taskUpdateId?: string;
  taskReviewId?: string;
}

export interface HeaderProfileState {
  name: string;
  username?: string;
  accountId?: string | number;
  imageUrl?: string;
  initials: string;
}

export interface HeaderMessagePreviewItem {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  route?: string;
  avatarUrl?: string;
  contextLabel?: string;
  workspaceMode?: 'feed' | 'chat';
  channelBackendId?: number;
  dmUserId?: number;
  messageBackendId?: number;
  threadRootMessageBackendId?: number;
}

export interface HeaderState {
  unreadChannels: number;
  unreadDirectMessages: number;
  unreadMessages: number;
  unreadNotifications: number;
  notifications: HeaderNotificationItem[];
  messagePreviews: HeaderMessagePreviewItem[];
  profile: HeaderProfileState | null;
}

const STORAGE_KEY = 'optimax_header_state';
const DEFAULT_TITLE = 'OptimaX Suites';

@Injectable({ providedIn: 'root' })
export class HeaderStateService {
  private readonly state$ = new BehaviorSubject<HeaderState>(
    this.readStoredState(),
  );
  private suppressPushUntil = 0;

  readonly view$ = this.state$.asObservable();

  constructor(private ngZone: NgZone) {
    this.refreshTitle(this.state$.value);
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent);
      window.addEventListener(
        'optimax-notification',
        this.handleNotificationEvent as EventListener,
      );
    }
  }

  get snapshot(): HeaderState {
    return this.state$.value;
  }

  updateUnreadCounts(payload: {
    unreadChannels?: number;
    unreadDirectMessages?: number;
  }): void {
    const next: HeaderState = {
      ...this.state$.value,
      unreadChannels:
        payload.unreadChannels ?? this.state$.value.unreadChannels,
      unreadDirectMessages:
        payload.unreadDirectMessages ?? this.state$.value.unreadDirectMessages,
    };
    next.unreadMessages = this.computeUnreadMessages(next);
    this.commit(next);
  }

  setProfile(profile: HeaderProfileState | null): void {
    this.commit({
      ...this.state$.value,
      profile,
    });
  }

  pushNotification(
    item: Omit<HeaderNotificationItem, 'id' | 'createdAt' | 'read'>,
  ): void {
    const isSuppressed = Date.now() < this.suppressPushUntil;
    const nextItem: HeaderNotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      read: isSuppressed,
      ...item,
      title: this.stringifyNotificationField(item.title, 'New update'),
      body: this.stringifyNotificationField(
        item.body,
        'A new module event is available.',
      ),
      contextLabel: item.contextLabel
        ? this.stringifyNotificationField(item.contextLabel, '')
        : item.contextLabel,
    };
    const notifications = [nextItem, ...this.state$.value.notifications].slice(
      0,
      25,
    );
    this.commit({
      ...this.state$.value,
      notifications,
      unreadNotifications: notifications.filter((entry) => !entry.read).length,
    });
  }

  pushMessagePreview(
    item: Omit<HeaderMessagePreviewItem, 'id' | 'read'>,
  ): void {
    const nextItem: HeaderMessagePreviewItem = {
      ...item,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Number(item.createdAt || Date.now()),
      read: false,
      title: this.stringifyNotificationField(item.title, 'New message'),
      body: this.stringifyNotificationField(item.body, 'A new message arrived.'),
      contextLabel: item.contextLabel
        ? this.stringifyNotificationField(item.contextLabel, '')
        : item.contextLabel,
    };
    const key = `${nextItem.channelBackendId || 'dm'}-${nextItem.dmUserId || 'user'}-${nextItem.messageBackendId || nextItem.id}`;
    const existing = this.state$.value.messagePreviews || [];
    const deduped = existing.filter((entry) => {
      const entryKey = `${entry.channelBackendId || 'dm'}-${entry.dmUserId || 'user'}-${entry.messageBackendId || entry.id}`;
      return entryKey !== key;
    });
    const messagePreviews = [nextItem, ...deduped].slice(0, 20);
    this.commit({
      ...this.state$.value,
      messagePreviews,
      unreadMessages: this.computeUnreadMessages({
        ...this.state$.value,
        messagePreviews,
      }),
    });
  }

  markMessagePreviewRead(messagePreviewId: string): void {
    const messagePreviews = this.state$.value.messagePreviews.map((entry) =>
      entry.id === messagePreviewId ? { ...entry, read: true } : entry,
    );
    this.commit({
      ...this.state$.value,
      messagePreviews,
      unreadMessages: this.computeUnreadMessages({
        ...this.state$.value,
        messagePreviews,
      }),
    });
  }

  markAllMessagePreviewsRead(): void {
    const messagePreviews = this.state$.value.messagePreviews.map((entry) => ({
      ...entry,
      read: true,
    }));
    this.commit({
      ...this.state$.value,
      messagePreviews,
      unreadMessages: this.computeUnreadMessages({
        ...this.state$.value,
        messagePreviews,
      }),
    });
  }

  markAllNotificationsRead(): void {
    this.suppressPushUntil = Date.now() + 6000;
    this.commit({
      ...this.state$.value,
      unreadNotifications: 0,
      notifications: this.state$.value.notifications.map((entry) => ({
        ...entry,
        read: true,
      })),
    });
  }

  clearAllNotifications(): void {
    this.commit({
      ...this.state$.value,
      unreadNotifications: 0,
      notifications: [],
    });
  }

  markNotificationRead(notificationId: string): void {
    const notifications = this.state$.value.notifications.map((entry) =>
      entry.id === notificationId ? { ...entry, read: true } : entry,
    );
    this.commit({
      ...this.state$.value,
      notifications,
      unreadNotifications: notifications.filter((entry) => !entry.read).length,
    });
  }

  private commit(next: HeaderState): void {
    this.state$.next(next);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    this.refreshTitle(next);
  }

  private readStoredState(): HeaderState {
    if (typeof sessionStorage === 'undefined') {
      return this.emptyState();
    }
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return this.emptyState();
      }
      const parsed = JSON.parse(raw);
      // On every page load, reset message unread counts and previews so stale
      // DM/channel badges don't persist across reloads. The real-time notifier
      // will re-populate them as live events arrive.
      return {
        unreadChannels: 0,
        unreadDirectMessages: 0,
        unreadMessages: 0,
        unreadNotifications: 0,
        notifications: [],
        messagePreviews: [],
        profile: parsed?.profile || null,
      };
    } catch (_) {
      return this.emptyState();
    }
  }

  private emptyState(): HeaderState {
    return {
      unreadChannels: 0,
      unreadDirectMessages: 0,
      unreadMessages: 0,
      unreadNotifications: 0,
      notifications: [],
      messagePreviews: [],
      profile: null,
    };
  }

  private computeUnreadMessages(state: HeaderState): number {
    const aggregateUnread =
      Number(state.unreadChannels || 0) + Number(state.unreadDirectMessages || 0);
    const previewUnread = (state.messagePreviews || []).filter(
      (entry) => !entry.read,
    ).length;
    return Math.max(aggregateUnread, previewUnread);
  }

  private refreshTitle(state: HeaderState): void {
    if (typeof document === 'undefined') {
      return;
    }
    const totalUnread = state.unreadMessages + state.unreadNotifications;
    document.title =
      totalUnread > 0 ? `(${totalUnread}) ${DEFAULT_TITLE}` : DEFAULT_TITLE;
  }

  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== STORAGE_KEY || !event.newValue) {
      return;
    }
    try {
      const parsed = JSON.parse(event.newValue) as HeaderState;
      this.ngZone.run(() => {
        this.state$.next(parsed);
        this.refreshTitle(parsed);
      });
    } catch (_) {}
  };

  private handleNotificationEvent = (event: CustomEvent): void => {
    const detail = event.detail || {};
    this.ngZone.run(() => {
      this.pushNotification({
        title: this.stringifyNotificationField(detail.title, 'New update'),
        body: this.stringifyNotificationField(
          detail.body,
          'A new module event is available.',
        ),
        category: detail.category || 'module',
        route: detail.route,
      });
    });
  };

  private stringifyNotificationField(
    value: unknown,
    fallback: string,
  ): string {
    if (typeof value === 'string') {
      const cleaned = value.trim();
      return cleaned || fallback;
    }
    if (value == null) {
      return fallback;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      const parts = value
        .map((entry) => this.stringifyNotificationField(entry, ''))
        .filter(Boolean);
      return parts.length ? parts.join(', ') : fallback;
    }
    if (typeof value === 'object') {
      const candidate = (value as any).title || (value as any).name || (value as any).label || (value as any).message;
      if (candidate) {
        return this.stringifyNotificationField(candidate, fallback);
      }
    }
    return fallback;
  }

  private sanitizeStoredNotification(
    entry: Partial<HeaderNotificationItem> | null | undefined,
  ): HeaderNotificationItem {
    return {
      id:
        this.stringifyNotificationField(entry?.id, '').trim() ||
        `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: this.stringifyNotificationField(entry?.title, 'New update'),
      body: this.stringifyNotificationField(
        entry?.body,
        'A new module event is available.',
      ),
      category: (entry?.category as any) || 'module',
      createdAt: Number(entry?.createdAt || Date.now()),
      read: Boolean(entry?.read),
      route: entry?.route,
      avatarUrl: entry?.avatarUrl,
      contextLabel: entry?.contextLabel
        ? this.stringifyNotificationField(entry.contextLabel, '')
        : entry?.contextLabel,
      workspaceMode: entry?.workspaceMode,
      channelBackendId: entry?.channelBackendId,
      dmUserId: entry?.dmUserId,
      messageBackendId: entry?.messageBackendId,
      threadRootMessageBackendId: entry?.threadRootMessageBackendId,
      taskRoutineId: entry?.taskRoutineId,
      taskUpdateId: entry?.taskUpdateId,
      taskReviewId: entry?.taskReviewId,
    };
  }

  private sanitizeStoredMessagePreview(
    entry: Partial<HeaderMessagePreviewItem> | null | undefined,
  ): HeaderMessagePreviewItem {
    return {
      id:
        this.stringifyNotificationField(entry?.id, '').trim() ||
        `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: this.stringifyNotificationField(entry?.title, 'New message'),
      body: this.stringifyNotificationField(
        entry?.body,
        'A new message arrived.',
      ),
      createdAt: Number(entry?.createdAt || Date.now()),
      read: Boolean(entry?.read),
      route: entry?.route,
      avatarUrl: entry?.avatarUrl,
      contextLabel: entry?.contextLabel
        ? this.stringifyNotificationField(entry.contextLabel, '')
        : entry?.contextLabel,
      workspaceMode: entry?.workspaceMode,
      channelBackendId: entry?.channelBackendId,
      dmUserId: entry?.dmUserId,
      messageBackendId: entry?.messageBackendId,
      threadRootMessageBackendId: entry?.threadRootMessageBackendId,
    };
  }
}

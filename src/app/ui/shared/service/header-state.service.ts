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
}

export interface HeaderProfileState {
  name: string;
  username?: string;
  accountId?: string | number;
  imageUrl?: string;
  initials: string;
}

export interface HeaderState {
  unreadChannels: number;
  unreadDirectMessages: number;
  unreadMessages: number;
  unreadNotifications: number;
  notifications: HeaderNotificationItem[];
  profile: HeaderProfileState | null;
}

const STORAGE_KEY = 'optimax_header_state';
const DEFAULT_TITLE = 'OptimaX Suites';

@Injectable({ providedIn: 'root' })
export class HeaderStateService {
  private readonly state$ = new BehaviorSubject<HeaderState>(
    this.readStoredState(),
  );

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
    next.unreadMessages = next.unreadChannels + next.unreadDirectMessages;
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
    const nextItem: HeaderNotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      read: false,
      ...item,
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

  markAllNotificationsRead(): void {
    this.commit({
      ...this.state$.value,
      unreadNotifications: 0,
      notifications: this.state$.value.notifications.map((entry) => ({
        ...entry,
        read: true,
      })),
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
      return {
        unreadChannels: Number(parsed?.unreadChannels || 0),
        unreadDirectMessages: Number(parsed?.unreadDirectMessages || 0),
        unreadMessages: Number(parsed?.unreadMessages || 0),
        unreadNotifications: Number(parsed?.unreadNotifications || 0),
        notifications: Array.isArray(parsed?.notifications)
          ? parsed.notifications
          : [],
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
      profile: null,
    };
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
        title: detail.title || 'New update',
        body: detail.body || 'A new module event is available.',
        category: detail.category || 'module',
        route: detail.route,
      });
    });
  };
}

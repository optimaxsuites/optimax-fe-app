import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Client } from '@stomp/stompjs';
import { MessageService } from 'primeng/api';
import {
  CollabChannel,
  CollaborationService,
} from '../../../../../projects/dashboard/src/app/ui/services/collaboration.service';
import { HeaderStateService } from './header-state.service';

// damilola worked on this: global chat toast and browser notification listener outside the collaboration page.
interface GlobalChatChannelTarget {
  backendId: number;
  type: 'channel' | 'dm';
  channelId?: string;
  dmUserId?: number;
  label: string;
  unreadCount: number;
}

@Injectable({ providedIn: 'root' })
export class ChatRealtimeNotifierService implements OnDestroy {
  private stompClient: Client | null = null;
  private wsConnected = false;
  private started = false;
  private currentUserId = 0;
  private currentRouteUserId = '';
  private channelTargets = new Map<number, GlobalChatChannelTarget>();
  private channelSubs = new Map<number, any>();
  private userNameCache = new Map<number, string>();
  private refreshChannelsCooldownUntil = 0;

  constructor(
    private readonly collabService: CollaborationService,
    private readonly headerStateService: HeaderStateService,
    private readonly messageService: MessageService,
    private readonly router: Router,
    private readonly ngZone: NgZone,
  ) {}

  start(currentRouteUserId: string): void {
    this.currentRouteUserId = currentRouteUserId || this.currentRouteUserId;
    this.currentUserId = this.resolveCurrentUserId();
    if (!this.currentUserId || this.started) {
      return;
    }
    this.started = true;
    this.refreshChannels();
    this.connectSocket();
    this.ensureNotificationPermission();
  }

  stop(): void {
    this.channelSubs.forEach((sub) => {
      try {
        sub.unsubscribe();
      } catch (_) {}
    });
    this.channelSubs.clear();
    this.channelTargets.clear();
    if (this.stompClient) {
      try {
        this.stompClient.deactivate();
      } catch (_) {}
      this.stompClient = null;
    }
    this.wsConnected = false;
    this.started = false;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private connectSocket(): void {
    const token = this.normalizedToken();
    if (!token) {
      return;
    }
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const baseUrl = (this.collabService.apiBaseUrl || '').replace(/\/+$/, '');
    const wsUrl = baseUrl.startsWith('https://')
      ? `wss://${baseUrl.replace('https://', '')}/x/ws/collab`
      : `ws://${baseUrl.replace('http://', '')}/x/ws/collab`;

    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'X-User-ID': String(this.currentUserId),
        userid: String(this.currentUserId),
      },
    });

    client.onConnect = () => {
      this.wsConnected = true;
      client.subscribe(
        `/topic/collab/chat/user/${this.currentUserId}/unread`,
        () => this.refreshChannels(),
      );
      this.refreshChannels();
    };

    client.onStompError = (frame) =>
      console.error('Global chat STOMP error:', frame);
    client.onWebSocketError = (error) =>
      console.error('Global chat websocket error:', error);

    this.stompClient = client;
    client.activate();
  }

  private refreshChannels(): void {
    if (Date.now() < this.refreshChannelsCooldownUntil) {
      return;
    }
    this.collabService.getChannels().subscribe({
      next: (channels) => this.applyChannelTargets(channels || []),
      error: () => {
        this.refreshChannelsCooldownUntil = Date.now() + 30_000;
      },
    });
  }

  private applyChannelTargets(channels: CollabChannel[]): void {
    this.refreshChannelsCooldownUntil = 0;
    const nextTargets = new Map<number, GlobalChatChannelTarget>();
    let unreadChannels = 0;
    let unreadDirectMessages = 0;

    for (const channel of channels) {
      const backendId = Number(channel.channelId ?? channel.id);
      if (!backendId) {
        continue;
      }
      const unreadCount = Number(channel.unreadCount || 0);
      if (this.isDirectMessageChannel(channel)) {
        unreadDirectMessages += unreadCount;
        const dmUserId = this.extractOtherDmUserId(channel);
        nextTargets.set(backendId, {
          backendId,
          type: 'dm',
          dmUserId,
          label: 'Direct message',
          unreadCount,
        });
      } else {
        unreadChannels += unreadCount;
        nextTargets.set(backendId, {
          backendId,
          type: 'channel',
          channelId: String(backendId),
          label: channel.name || 'Channel',
          unreadCount,
        });
      }
    }

    this.headerStateService.updateUnreadCounts({
      unreadChannels,
      unreadDirectMessages,
    });

    this.channelSubs.forEach((sub, backendId) => {
      if (nextTargets.has(backendId)) {
        return;
      }
      try {
        sub.unsubscribe();
      } catch (_) {}
      this.channelSubs.delete(backendId);
    });

    this.channelTargets = nextTargets;
    if (this.wsConnected) {
      nextTargets.forEach((target) => this.subscribeToChannel(target));
    }
  }

  private subscribeToChannel(target: GlobalChatChannelTarget): void {
    if (!this.stompClient || !this.wsConnected || this.channelSubs.has(target.backendId)) {
      return;
    }
    const sub = this.stompClient.subscribe(
      `/topic/collab/chat/channel/${target.backendId}`,
      (frame) => {
        const incoming = this.parseIncoming(frame.body);
        if (
          incoming.senderUserId &&
          Number(incoming.senderUserId) === Number(this.currentUserId)
        ) {
          return;
        }

        this.refreshChannels();

        const routeUserId =
          this.currentRouteUserId || String(this.currentUserId);
        const notificationTargetBase = {
          workspaceMode: 'chat' as const,
          route: `/admin/dashboard/communications/${routeUserId}`,
          channelBackendId:
            target.type === 'channel' ? target.backendId : undefined,
          dmUserId: target.type === 'dm' ? target.dmUserId : undefined,
        };
        this.loadVerifiedIncomingMessage(target.backendId, incoming, 0, (latestMessage) => {
          if (!latestMessage) {
            return;
          }
          const latestSenderUserId = Number(
            latestMessage?.senderUserId || incoming.senderUserId || 0,
          );
          if (
            latestSenderUserId &&
            latestSenderUserId === Number(this.currentUserId)
          ) {
            return;
          }
          const notificationTarget = {
            ...notificationTargetBase,
            messageBackendId:
              Number(latestMessage?.id || incoming.messageBackendId || 0) || undefined,
            threadRootMessageBackendId:
              Number(
                latestMessage?.threadRootMessageId ||
                  incoming.threadRootMessageBackendId ||
                  0,
              ) || undefined,
          };
          this.resolveIncomingDisplay(
            target,
            incoming,
            latestMessage,
            (resolved) =>
              this.publishIncomingNotification(
                target,
                resolved,
                notificationTarget,
              ),
          );
        });
      },
    );
    this.channelSubs.set(target.backendId, sub);
  }

  private parseIncoming(frameBody: string): {
    senderName: string;
    content: string;
    senderUserId?: number;
    avatarUrl?: string;
    messageBackendId?: number;
    threadRootMessageBackendId?: number;
  } {
    try {
      const payload = JSON.parse(frameBody || '{}');
      return {
        senderName: this.notificationText(
          payload.senderName ?? payload.authorName,
          'New message',
        ),
        content: this.notificationText(
          payload.content ?? payload.message,
          '',
        )
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 160),
        senderUserId: Number(payload.senderUserId ?? payload.userId ?? 0) || undefined,
        messageBackendId: Number(payload.id ?? payload.messageId ?? 0) || undefined,
        threadRootMessageBackendId:
          Number(payload.threadRootMessageId ?? 0) || undefined,
      };
    } catch (_) {
      return { senderName: 'New message', content: '' };
    }
  }

  private isDirectMessageChannel(channel: CollabChannel): boolean {
    const desc = (channel.description || '').toLowerCase();
    const name = (channel.name || '').toLowerCase();
    return (
      channel.channelType === 'PRIVATE' &&
      (desc.startsWith('dm between') || /^dm-\d+-\d+$/.test(name))
    );
  }

  private extractOtherDmUserId(channel: CollabChannel): number | undefined {
    const ids = [
      ...((channel.name || '').match(/\d+/g) || []),
      ...((channel.description || '').match(/\d+/g) || []),
    ]
      .map((value) => Number(value))
      .filter((value) => !!value);
    return ids.find((value) => Number(value) !== Number(this.currentUserId));
  }

  private showBrowserNotification(
    title: string,
    body: string,
    icon: string | undefined,
    target: {
      workspaceMode: 'chat';
      route: string;
      channelBackendId?: number;
      dmUserId?: number;
      messageBackendId?: number;
      threadRootMessageBackendId?: number;
    },
  ): void {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return;
    }
    if (document.visibilityState === 'visible') {
      return;
    }
    if (Notification.permission !== 'granted') {
      return;
    }
    const notification = new Notification(title, {
      body,
      icon,
      tag: `optimax-chat-${target.channelBackendId || target.dmUserId || 'message'}`,
    });
    notification.onclick = () => {
      window.focus();
      sessionStorage.setItem('optimax_notification_target', JSON.stringify(target));
      window.dispatchEvent(
        new CustomEvent('optimax-open-collab-target', { detail: target }),
      );
      this.router.navigateByUrl(target.route).catch(() => {});
      notification.close();
    };
    setTimeout(() => notification.close(), 4500);
  }

  private publishIncomingNotification(
    target: GlobalChatChannelTarget,
    resolved: {
      title: string;
      detail: string;
      createdAt: number;
      avatarUrl?: string;
    },
    notificationTarget: {
      workspaceMode: 'chat';
      route: string;
      channelBackendId?: number;
      dmUserId?: number;
      messageBackendId?: number;
      threadRootMessageBackendId?: number;
    },
  ): void {
    this.ngZone.run(() => {
      this.headerStateService.pushMessagePreview({
        title: resolved.title,
        body: resolved.detail,
        createdAt: resolved.createdAt,
        route: notificationTarget.route,
        avatarUrl: resolved.avatarUrl,
        contextLabel: target.type === 'dm' ? 'Direct message' : target.label,
        workspaceMode: 'chat',
        channelBackendId: notificationTarget.channelBackendId,
        dmUserId: notificationTarget.dmUserId,
        messageBackendId: notificationTarget.messageBackendId,
        threadRootMessageBackendId: notificationTarget.threadRootMessageBackendId,
      });
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        !this.router.url.includes('/admin/dashboard/communications/')
      ) {
        this.messageService.add({
          key: 'tf',
          severity: 'info',
          summary: resolved.title,
          detail: resolved.detail,
          life: 4000,
        });
      }
      this.showBrowserNotification(
        resolved.title,
        resolved.detail,
        resolved.avatarUrl,
        notificationTarget,
      );
    });
  }

  private loadVerifiedIncomingMessage(
    channelBackendId: number,
    incoming: {
      senderName: string;
      content: string;
      senderUserId?: number;
      avatarUrl?: string;
      messageBackendId?: number;
      threadRootMessageBackendId?: number;
    },
    attempt: number,
    done: (message: any | null) => void,
  ): void {
    this.collabService.getChannelSnapshot(channelBackendId).subscribe({
      next: (snap) => {
        const latestMessage = this.pickLatestIncomingMessage(
          snap?.messages || [],
          incoming.messageBackendId,
        );
        if (
          !latestMessage &&
          attempt < 2
        ) {
          setTimeout(
            () =>
              this.loadVerifiedIncomingMessage(
                channelBackendId,
                incoming,
                attempt + 1,
                done,
              ),
            attempt === 0 ? 220 : 500,
          );
          return;
        }
        done(latestMessage);
      },
      error: () => {
        if (attempt < 2) {
          setTimeout(
            () =>
              this.loadVerifiedIncomingMessage(
                channelBackendId,
                incoming,
                attempt + 1,
                done,
              ),
            attempt === 0 ? 220 : 500,
          );
          return;
        }
        done(null);
      },
    });
  }

  private resolveIncomingDisplay(
    target: GlobalChatChannelTarget,
    incoming: {
      senderName: string;
      content: string;
      senderUserId?: number;
      avatarUrl?: string;
      messageBackendId?: number;
      threadRootMessageBackendId?: number;
    },
    latestMessage: any | null,
    done: (resolved: {
      title: string;
      detail: string;
      createdAt: number;
      avatarUrl?: string;
    }) => void,
  ): void {
    const senderUserId = Number(
      latestMessage?.senderUserId || incoming.senderUserId || 0,
    );
    const detail = this.notificationText(
      latestMessage?.content ?? incoming.content,
      target.type === 'dm'
        ? 'New direct message'
        : `New message in ${target.label}`,
    )
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
    const createdAt = this.toTimestamp(latestMessage?.sentAt) || Date.now();
    this.resolveSenderName(senderUserId, incoming.senderName, (title) =>
      done({
        title: title || (target.type === 'dm' ? 'Direct message' : target.label),
        detail,
        createdAt,
        avatarUrl: incoming.avatarUrl,
      }),
    );
  }

  private resolveSenderName(
    senderUserId: number,
    incomingSenderName: string,
    done: (name: string) => void,
  ): void {
    if (incomingSenderName?.trim()) {
      done(incomingSenderName.trim());
      return;
    }
    if (senderUserId && this.userNameCache.has(senderUserId)) {
      done(this.userNameCache.get(senderUserId) || 'New message');
      return;
    }
    if (senderUserId) {
      this.collabService.getUsersInfo([senderUserId]).subscribe({
        next: (users) => {
          const user = (users || [])[0];
          const name =
            (user?.fullname || user?.username || user?.email || '').trim();
          if (name) {
            this.userNameCache.set(senderUserId, name);
          }
          done(name || 'New message');
        },
        error: () => done('New message'),
      });
      return;
    }
    done('New message');
  }

  private pickLatestIncomingMessage(
    messages: any[],
    preferredMessageId?: number,
  ): any | null {
    if (!Array.isArray(messages) || !messages.length) {
      return null;
    }
    if (preferredMessageId) {
      const exact = messages.find(
        (entry) => Number(entry?.id) === Number(preferredMessageId),
      );
      if (exact) {
        return exact;
      }
    }
    return [...messages]
      .sort((left, right) => this.toTimestamp(right?.sentAt) - this.toTimestamp(left?.sentAt))[0];
  }

  private toTimestamp(value: unknown): number {
    if (Array.isArray(value)) {
      const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] =
        value as number[];
      if (!year || !month || !day) {
        return 0;
      }
      return new Date(
        year,
        Number(month) - 1,
        day,
        hour,
        minute,
        second,
        Math.floor(Number(nano || 0) / 1_000_000),
      ).getTime();
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private ensureNotificationPermission(): void {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return;
    }
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  private resolveCurrentUserId(): number {
    const candidates = [
      sessionStorage.getItem('userid'),
      sessionStorage.getItem('userId'),
    ];
    for (const raw of candidates) {
      const parsed = Number(raw || 0);
      if (parsed) {
        return parsed;
      }
    }
    try {
      const raw = sessionStorage.getItem('userRegData');
      if (raw) {
        const parsed = JSON.parse(raw);
        return Number(parsed?.userId || parsed?.id || 0) || 0;
      }
    } catch (_) {}
    return 0;
  }

  private normalizedToken(): string {
    const candidates = [
      sessionStorage.getItem('Token'),
      sessionStorage.getItem('token'),
      sessionStorage.getItem('accessToken'),
      localStorage.getItem('Token2'),
      localStorage.getItem('token'),
    ];
    for (const raw of candidates) {
      const token = this.normalizeToken(raw);
      if (token) {
        return token;
      }
    }
    return '';
  }

  private normalizeToken(raw: string | null): string {
    if (!raw) return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (trimmed.toLowerCase().startsWith('bearer ')) {
      return trimmed.slice(7).trim();
    }
    if (trimmed.includes('=') && trimmed.includes(';')) {
      const tokenStartIndex = trimmed.indexOf('=') + 1;
      const tokenEndIndex = trimmed.indexOf(';', tokenStartIndex);
      return trimmed
        .substring(
          tokenStartIndex,
          tokenEndIndex > -1 ? tokenEndIndex : undefined,
        )
        .trim();
    }
    return trimmed;
  }

  private notificationText(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
      return value.trim() || fallback;
    }
    if (value == null) {
      return fallback;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      const parts = value
        .map((entry) => this.notificationText(entry, ''))
        .filter(Boolean);
      return parts.length ? parts.join(', ') : fallback;
    }
    if (typeof value === 'object') {
      const candidate =
        (value as any).title ||
        (value as any).name ||
        (value as any).label ||
        (value as any).message;
      return this.notificationText(candidate, fallback);
    }
    return fallback;
  }
}

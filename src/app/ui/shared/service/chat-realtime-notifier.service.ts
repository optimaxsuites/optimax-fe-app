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

const COLLAB_UNREAD_SNAPSHOT_KEY = 'optimax_collab_unread_snapshot';

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
  private refreshChannelsInFlight = false;
  private lastChannelsRefreshAt = 0;
  private refreshChannelsFailureCount = 0;
  private readonly refreshChannelsTtlMs = 10_000;
  private readonly fallbackRefreshIntervalMs = 15_000;
  private fallbackRefreshTimer: number | null = null;
  private notificationAudioContext: AudioContext | null = null;
  private audioPrimed = false;

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
    this.refreshChannels(true);
    this.startFallbackRefresh();
    this.connectSocket();
    this.ensureNotificationPermission();
    this.bindAudioPriming();
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
    this.stopFallbackRefresh();
    this.unbindAudioPriming();
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
    const wsUrl = this.resolveCollabWebSocketUrl();

    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
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
        () => this.refreshChannels(true),
      );
      this.refreshChannels(true);
    };

    client.onStompError = (frame) =>
      console.error('Global chat STOMP error:', frame);
    client.onWebSocketClose = () => {
      this.wsConnected = false;
    };
    client.onWebSocketError = (error) =>
      console.error('Global chat websocket error:', error);

    this.stompClient = client;
    client.activate();
  }

  private resolveCollabWebSocketUrl(): string {
    const configuredBaseUrl = (this.collabService.apiBaseUrl || '').replace(/\/+$/, '');
    if (typeof window !== 'undefined') {
      const currentHost = window.location.host;
      const currentProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const currentHostname = window.location.hostname || '';
      const shouldPreferCurrentOrigin =
        !!currentHost &&
        !/^(localhost|127\.0\.0\.1)$/i.test(currentHostname);
      if (shouldPreferCurrentOrigin) {
        return `${currentProtocol}//${currentHost}/x/ws/collab`;
      }
    }
    if (configuredBaseUrl.startsWith('https://')) {
      return `wss://${configuredBaseUrl.replace('https://', '')}/x/ws/collab`;
    }
    return `ws://${configuredBaseUrl.replace('http://', '')}/x/ws/collab`;
  }

  private refreshChannels(force = false): void {
    if (Date.now() < this.refreshChannelsCooldownUntil) {
      return;
    }
    if (this.refreshChannelsInFlight) {
      return;
    }
    if (
      !force &&
      this.channelTargets.size &&
      Date.now() - this.lastChannelsRefreshAt < this.refreshChannelsTtlMs
    ) {
      return;
    }
    this.refreshChannelsInFlight = true;
    this.collabService.getHomeChannels().subscribe({
      next: (home) => {
        this.lastChannelsRefreshAt = Date.now();
        this.refreshChannelsInFlight = false;
        this.refreshChannelsFailureCount = 0;
        this.applyChannelTargets(home?.channels || []);
      },
      error: () => {
        this.refreshChannelsInFlight = false;
        this.refreshChannelsFailureCount++;
        const backoffMs = Math.min(
          5_000 * Math.pow(2, this.refreshChannelsFailureCount - 1),
          120_000,
        );
        this.refreshChannelsCooldownUntil = Date.now() + backoffMs;
      },
    });
  }

  private applyChannelTargets(channels: CollabChannel[]): void {
    this.refreshChannelsCooldownUntil = 0;
    this.refreshChannelsFailureCount = 0;
    const previousTargets = new Map(this.channelTargets);
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
    this.persistUnreadSnapshot(nextTargets);
    this.publishFallbackUnreadNotifications(previousTargets, nextTargets);

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

  private startFallbackRefresh(): void {
    if (this.fallbackRefreshTimer != null || typeof window === 'undefined') {
      return;
    }
    this.fallbackRefreshTimer = window.setInterval(() => {
      this.refreshChannels();
    }, this.fallbackRefreshIntervalMs);
  }

  private stopFallbackRefresh(): void {
    if (this.fallbackRefreshTimer == null || typeof window === 'undefined') {
      return;
    }
    window.clearInterval(this.fallbackRefreshTimer);
    this.fallbackRefreshTimer = null;
  }

  private publishFallbackUnreadNotifications(
    previousTargets: Map<number, GlobalChatChannelTarget>,
    nextTargets: Map<number, GlobalChatChannelTarget>,
  ): void {
    if (this.wsConnected || previousTargets.size === 0) {
      return;
    }

    const routeUserId = this.currentRouteUserId || String(this.currentUserId);
    nextTargets.forEach((target, backendId) => {
      const previousUnread = Number(previousTargets.get(backendId)?.unreadCount || 0);
      const nextUnread = Number(target.unreadCount || 0);
      if (nextUnread <= previousUnread) {
        return;
      }
      const increase = nextUnread - previousUnread;
      const notificationTarget = {
        workspaceMode: 'chat' as const,
        route: `/admin/dashboard/communications/${routeUserId}`,
        channelBackendId:
          target.type === 'channel' ? target.backendId : undefined,
        dmUserId: target.type === 'dm' ? target.dmUserId : undefined,
      };
      const title =
        target.type === 'dm' ? 'New direct message' : `New message in ${target.label}`;
      const detail =
        increase === 1
          ? 'You have 1 new unread message.'
          : `You have ${increase} new unread messages.`;
      this.publishIncomingNotification(
        target,
        {
          title,
          detail,
          createdAt: Date.now(),
        },
        notificationTarget,
      );
    });
  }

  private persistUnreadSnapshot(
    targets: Map<number, GlobalChatChannelTarget>,
  ): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    try {
      sessionStorage.setItem(
        COLLAB_UNREAD_SNAPSHOT_KEY,
        JSON.stringify(
          Array.from(targets.values()).map((target) => ({
            backendId: target.backendId,
            type: target.type,
            dmUserId: target.dmUserId,
            unreadCount: Number(target.unreadCount || 0),
            label: target.label,
          })),
        ),
      );
    } catch (_) {}
  }

  private bumpUnreadSnapshot(target: GlobalChatChannelTarget): void {
    const snapshot = this.readUnreadSnapshot();
    const key =
      target.type === 'dm'
        ? `dm:${Number(target.dmUserId || 0)}`
        : `channel:${Number(target.backendId || 0)}`;
    if (!key.endsWith(':0')) {
      snapshot.set(key, (snapshot.get(key) || 0) + 1);
    }
    this.writeUnreadSnapshot(snapshot);

    const current = this.headerStateService.snapshot;
    this.headerStateService.updateUnreadCounts({
      unreadChannels:
        target.type === 'channel'
          ? Number(current.unreadChannels || 0) + 1
          : Number(current.unreadChannels || 0),
      unreadDirectMessages:
        target.type === 'dm'
          ? Number(current.unreadDirectMessages || 0) + 1
          : Number(current.unreadDirectMessages || 0),
    });
  }

  private readUnreadSnapshot(): Map<string, number> {
    const snapshot = new Map<string, number>();
    if (typeof sessionStorage === 'undefined') {
      return snapshot;
    }
    try {
      const raw = sessionStorage.getItem(COLLAB_UNREAD_SNAPSHOT_KEY);
      const parsed = JSON.parse(raw || '[]');
      if (!Array.isArray(parsed)) {
        return snapshot;
      }
      for (const entry of parsed) {
        const unreadCount = Number(entry?.unreadCount || 0);
        if (unreadCount <= 0) {
          continue;
        }
        if (entry?.type === 'dm' && Number(entry?.dmUserId || 0) > 0) {
          snapshot.set(`dm:${Number(entry.dmUserId)}`, unreadCount);
        } else if (Number(entry?.backendId || 0) > 0) {
          snapshot.set(`channel:${Number(entry.backendId)}`, unreadCount);
        }
      }
    } catch (_) {}
    return snapshot;
  }

  private writeUnreadSnapshot(snapshot: Map<string, number>): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    try {
      const payload = Array.from(snapshot.entries())
        .map(([key, unreadCount]) => {
          const [type, rawId] = key.split(':');
          const id = Number(rawId || 0);
          if (type === 'dm') {
            return {
              backendId: 0,
              type: 'dm',
              dmUserId: id,
              unreadCount,
            };
          }
          return {
            backendId: id,
            type: 'channel',
            unreadCount,
          };
        })
        .filter((entry) => Number(entry.unreadCount || 0) > 0);
      sessionStorage.setItem(
        COLLAB_UNREAD_SNAPSHOT_KEY,
        JSON.stringify(payload),
      );
    } catch (_) {}
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

        this.bumpUnreadSnapshot(target);
        this.refreshChannels(true);

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
      const msg = (payload.message && typeof payload.message === 'object') ? payload.message : payload;
      return {
        senderName: this.notificationText(
          msg.senderName ?? msg.authorName,
          'New message',
        ),
        content: this.notificationText(msg.content, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 160),
        senderUserId: Number(msg.senderUserId ?? msg.userId ?? 0) || undefined,
        messageBackendId: Number(msg.id ?? msg.messageId ?? 0) || undefined,
        threadRootMessageBackendId:
          Number(msg.threadRootMessageId ?? 0) || undefined,
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
    if (
      document.visibilityState === 'visible' &&
      typeof document.hasFocus === 'function' &&
      document.hasFocus()
    ) {
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
      this.headerStateService.pushNotification({
        title: resolved.title,
        body: resolved.detail,
        category: 'chat',
        route: notificationTarget.route,
        avatarUrl: resolved.avatarUrl,
        contextLabel: target.type === 'dm' ? 'Direct message' : target.label,
        workspaceMode: 'chat',
        channelBackendId: notificationTarget.channelBackendId,
        dmUserId: notificationTarget.dmUserId,
        messageBackendId: notificationTarget.messageBackendId,
        threadRootMessageBackendId: notificationTarget.threadRootMessageBackendId,
      });
      this.playNotificationCue();
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

  private bindAudioPriming(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('touchstart', this.primeNotificationAudio, {
      passive: true,
    });
    window.addEventListener('mousedown', this.primeNotificationAudio, {
      passive: true,
    });
  }

  private unbindAudioPriming(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.removeEventListener('touchstart', this.primeNotificationAudio as EventListener);
    window.removeEventListener('mousedown', this.primeNotificationAudio as EventListener);
  }

  private playNotificationCue(): void {
    this.triggerMobileHaptics();
    if (
      typeof document !== 'undefined' &&
      this.router.url.includes('/admin/dashboard/communications/') &&
      document.visibilityState === 'visible' &&
      typeof document.hasFocus === 'function' &&
      document.hasFocus()
    ) {
      return;
    }
    try {
      const ctx = this.ensureNotificationAudioContext();
      if (!ctx) {
        return;
      }
      if (typeof ctx.resume === 'function' && ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.62);
      gain.connect(ctx.destination);

      [
        { type: 'triangle' as OscillatorType, frequency: 740, start: 0, stop: 0.24 },
        { type: 'sine' as OscillatorType, frequency: 988, start: 0.04, stop: 0.2 },
      ].forEach((tone) => {
        const oscillator = ctx.createOscillator();
        oscillator.type = tone.type;
        oscillator.frequency.setValueAtTime(tone.frequency, ctx.currentTime + tone.start);
        oscillator.connect(gain);
        oscillator.start(ctx.currentTime + tone.start);
        oscillator.stop(ctx.currentTime + tone.stop);
      });
    } catch (_) {}
  }

  private ensureNotificationAudioContext(): AudioContext | null {
    try {
      if (this.notificationAudioContext) {
        return this.notificationAudioContext;
      }
      const AudioCtxCtor =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxCtor) {
        return null;
      }
      this.notificationAudioContext = new AudioCtxCtor();
      return this.notificationAudioContext;
    } catch (_) {
      return null;
    }
  }

  private primeNotificationAudio = (): void => {
    if (this.audioPrimed) {
      return;
    }
    const ctx = this.ensureNotificationAudioContext();
    if (!ctx) {
      return;
    }
    this.audioPrimed = true;
    try {
      if (typeof ctx.resume === 'function' && ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.00001, ctx.currentTime);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.01);
    } catch (_) {}
  };

  private triggerMobileHaptics(): void {
    try {
      if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
        return;
      }
      navigator.vibrate([140, 70, 140]);
    } catch (_) {}
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

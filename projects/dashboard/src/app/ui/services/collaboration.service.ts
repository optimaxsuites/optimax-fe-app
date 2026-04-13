import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../sharedComponent/service/environments/environment';

// ─────────────────────────────────────────────────────
//  Interfaces
// ─────────────────────────────────────────────────────
export interface CollabChannel {
  id: number;
  channelId?: number;
  channelCode: string;
  name: string;
  description: string;
  channelType: 'PUBLIC' | 'PRIVATE';
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: number;
  createdAt: number[];
  unreadCount?: number;
}

export interface CollabMessage {
  id: number;
  channelId: number;
  senderUserId: number;
  content: string;
  messageType: string;
  sentAt: string | number[];
  replyToMessageId?: number;
  threadRootMessageId?: number;
}

export interface CollabReaction {
  id?: number;
  messageId: number;
  userId: number;
  reactionCode: string;
}

export interface CollabAttachment {
  id?: number;
  messageId: number;
  fileName: string;
  downloadUrl?: string;
}

export interface CollabMember {
  userId: number;
  channelId: number;
  role: string;
}

export interface CollabChannelSnap {
  channel: CollabChannel;
  members: CollabMember[];
  messages: CollabMessage[];
  attachments: CollabAttachment[];
  reactions: CollabReaction[];
  readStates: any[];
}

export interface CollabUserInfo {
  userId: number;
  fullname?: string;
  username?: string;
  email?: string;
}

export interface EmployeeProfile {
  id: number;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  department?: { name: string };
  user?: { id: number; fullname: string; userId: number };
}

// ─────────────────────────────────────────────────────
//  Service
// ─────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class CollaborationService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  /**
   * The mock HTML sends THREE headers on every request:
   *   Authorization: Bearer <token>
   *   X-Tenant-ID:   <tenantId>
   *   X-User-ID:     <userId>      ← required by backend for user context
   *
   * Missing X-User-ID causes:
   *   500 IllegalArgumentException "Missing authenticated user context header."
   */
  private get headers(): HttpHeaders {
    const token = sessionStorage.getItem('token') || '';
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const userId = sessionStorage.getItem('userid') || '';

    console.log(
      '[CollabService] Building headers — tenantId:',
      tenantId,
      '| userId:',
      userId,
      '| hasToken:',
      !!token,
    );

    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
      'X-User-ID': userId, // ← the missing piece
    });
  }

  // ── Channels ──────────────────────────────────────────

  /** GET /x/api/v2/ai/collab/chat/home/me */
  getHomeChannels(): Observable<{ channels: CollabChannel[] }> {
    const url = `${this.baseUrl}/x/api/v2/ai/collab/chat/home/me`;
    console.log('[CollabService] getHomeChannels →', url);
    return this.http.get<{ channels: CollabChannel[] }>(url, {
      headers: this.headers,
    });
  }

  /** GET /x/api/v2/ai/collab/chat/channel */
  getChannels(): Observable<CollabChannel[]> {
    const url = `${this.baseUrl}/x/api/v2/ai/collab/chat/channel`;
    console.log('[CollabService] getChannels →', url);
    return this.http.get<CollabChannel[]>(url, { headers: this.headers });
  }

  /** GET /x/api/v2/ai/collab/chat/home/me/channel/{channelId} */
  getChannelSnapshot(channelId: number): Observable<CollabChannelSnap> {
    const url = `${this.baseUrl}/x/api/v2/ai/collab/chat/home/me/channel/${channelId}?recentMessageLimit=120`;
    console.log('[CollabService] getChannelSnapshot →', url);
    return this.http.get<CollabChannelSnap>(url, { headers: this.headers });
  }

  // ── User directory ────────────────────────────────────

  /** POST /x/api/v2/us/ur/get/users/primary/info */
  getUsersInfo(userIds: number[]): Observable<CollabUserInfo[]> {
    const url = `${this.baseUrl}/x/api/v2/us/ur/get/users/primary/info`;
    console.log('[CollabService] getUsersInfo →', url, '| userIds:', userIds);
    return this.http.post<CollabUserInfo[]>(url, userIds, {
      headers: this.headers,
    });
  }

  // ── Messages ─────────────────────────────────────────

  /** POST /x/api/v2/ai/collab/chat/message */
  sendMessage(payload: {
    channelId: number;
    senderUserId: number;
    content: string;
    messageType: string;
    replyToMessageId?: number | null;
    threadRootMessageId?: number | null;
  }): Observable<CollabMessage> {
    const url = `${this.baseUrl}/x/api/v2/ai/collab/chat/message`;
    console.log('[CollabService] sendMessage →', url, '| payload:', payload);
    return this.http.post<CollabMessage>(url, payload, {
      headers: this.headers,
    });
  }

  // ── Reactions ─────────────────────────────────────────

  /** POST /x/api/v2/ai/collab/chat/reaction */
  addReaction(payload: {
    messageId: number;
    userId: number;
    reactionCode: string;
  }): Observable<any> {
    const url = `${this.baseUrl}/x/api/v2/ai/collab/chat/reaction`;
    console.log('[CollabService] addReaction →', url, '| payload:', payload);
    return this.http.post<any>(url, payload, { headers: this.headers });
  }

  // ── Mark read ─────────────────────────────────────────

  /** POST /x/api/v2/ai/collab/chat/read/mark */
  markRead(channelId: number, lastReadMessageId: number): Observable<any> {
    const url = `${this.baseUrl}/x/api/v2/ai/collab/chat/read/mark`;
    const userId = Number(sessionStorage.getItem('userid') || 0);
    const payload = { channelId, userId, lastReadMessageId };
    console.log('[CollabService] markRead →', url, '| payload:', payload);
    return this.http.post<any>(url, payload, { headers: this.headers });
  }

  // ── Presence ──────────────────────────────────────────

  /** POST /x/api/v2/ai/collab/chat/presence/upsert */
  setPresenceOnline(channelId: number): Observable<any> {
    const url = `${this.baseUrl}/x/api/v2/ai/collab/chat/presence/upsert`;
    const userId = Number(sessionStorage.getItem('userid') || 0);
    console.log(
      '[CollabService] setPresenceOnline →',
      url,
      '| channelId:',
      channelId,
      '| userId:',
      userId,
    );
    return this.http.post<any>(
      url,
      { channelId, userId, presenceStatus: 'ONLINE', typing: false },
      { headers: this.headers },
    );
  }

  // ── Employee profile ──────────────────────────────────

  /** GET /x/api/v2/hr/employees/employee/by/userId/{id} */
  getEmployeeByUserId(userId: number): Observable<EmployeeProfile> {
    const url = `${this.baseUrl}/x/api/v2/hr/employees/employee/by/userId/${userId}`;
    console.log('[CollabService] getEmployeeByUserId →', url);
    return this.http.get<EmployeeProfile>(url, { headers: this.headers });
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../sharedComponent/service/environments/environment';

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

export interface CollabAttachmentFull {
  id: number;
  channelId: number;
  messageId: number;
  uploaderUserId: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  downloadUrl: string;
  uploadedAt: string;
}

export interface CollabMember {
  id?: number;
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

export interface EmployeeMedia {
  id: number;
  name: string;
  mediaNo: string;
}

export interface EmployeeProfile {
  id: number;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  department?: { id: number; name: string; code: string };
  employeeMedia?: EmployeeMedia | null;
  employeeStatus?: string;
  user?: {
    id: number;
    fullname: string;
    userId: number;
    email?: string;
    username?: string;
  };
}

export interface AiRewriteResponse {
  body?: string;
  rewrittenText?: string;
  content?: string;
  subject?: string;
  provider?: string;
  qualityScore?: number;
}
export interface AiSubjectResponse {
  suggestions?: string[];
  provider?: string;
  qualityScore?: number;
}
export interface AiSummaryResponse {
  summary?: string;
  keyPoints?: string[];
  decisions?: string[];
  actionItems?: string[];
  provider?: string;
  qualityScore?: number;
}
export interface AiEmailComposeResponse {
  subject?: string;
  body?: string;
  provider?: string;
  qualityScore?: number;
}
export interface CollabActionResponse {
  status: string;
  payloadJson?: string;
}

@Injectable({ providedIn: 'root' })
export class CollaborationService {
  private readonly baseUrl = environment.apiBaseUrl;
  get apiBaseUrl(): string {
    return this.baseUrl;
  }

  constructor(private http: HttpClient) {}

  private get headers(): HttpHeaders {
    const token = sessionStorage.getItem('token') || '';
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const userId = sessionStorage.getItem('userid') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
      'X-User-ID': userId,
    });
  }

  private get multipartHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token') || '';
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const userId = sessionStorage.getItem('userid') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
      'X-User-ID': userId,
    });
  }

  // ── Employees ─────────────────────────────────────────

  /** GET /x/api/v2/hr/employees — returns array or paginated wrapper */
  getAllEmployees(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/x/api/v2/hr/employees`, {
      headers: this.headers,
    });
  }

  getEmployeeById(id: number): Observable<EmployeeProfile> {
    return this.http.get<EmployeeProfile>(
      `${this.baseUrl}/x/api/v2/hr/employees/${id}`,
      { headers: this.headers },
    );
  }

  getEmployeeByUserId(userId: number): Observable<EmployeeProfile> {
    return this.http.get<EmployeeProfile>(
      `${this.baseUrl}/x/api/v2/hr/employees/employee/by/userId/${userId}`,
      { headers: this.headers },
    );
  }

  fetchEmployeeImageBlob(mediaNo: string): Promise<string> {
    const token = sessionStorage.getItem('token') || '';
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    return fetch(`${this.baseUrl}/x/api/v2/hr/employees/images/${mediaNo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        Accept: 'image/*,*/*',
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.blob();
      })
      .then((blob) => URL.createObjectURL(blob));
  }

  // ── Channels ──────────────────────────────────────────

  getHomeChannels(): Observable<{ channels: CollabChannel[] }> {
    return this.http.get<{ channels: CollabChannel[] }>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/home/me`,
      { headers: this.headers },
    );
  }

  getChannels(): Observable<CollabChannel[]> {
    return this.http.get<CollabChannel[]>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/channel`,
      { headers: this.headers },
    );
  }

  getChannelById(channelId: number): Observable<CollabChannel> {
    return this.http.get<CollabChannel>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/channel/${channelId}`,
      { headers: this.headers },
    );
  }

  getChannelSnapshot(channelId: number): Observable<CollabChannelSnap> {
    return this.http.get<CollabChannelSnap>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/home/me/channel/${channelId}?recentMessageLimit=120`,
      { headers: this.headers },
    );
  }

  createChannel(payload: {
    name: string;
    description: string;
    channelType: 'PUBLIC' | 'PRIVATE';
    createdBy: number;
  }): Observable<CollabChannel> {
    return this.http.post<CollabChannel>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/channel`,
      payload,
      { headers: this.headers },
    );
  }

  updateChannel(
    channelId: number,
    payload: {
      name: string;
      description: string;
      channelType: 'PUBLIC' | 'PRIVATE';
      createdBy: number;
    },
  ): Observable<CollabChannel> {
    return this.http.put<CollabChannel>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/channel/${channelId}`,
      payload,
      { headers: this.headers },
    );
  }

  deleteChannel(channelId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/channel/${channelId}`,
      { headers: this.headers },
    );
  }

  // ── Channel Members ───────────────────────────────────

  getChannelMembers(channelId: number): Observable<CollabMember[]> {
    return this.http.get<CollabMember[]>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/channel-member/channel/${channelId}`,
      { headers: this.headers },
    );
  }

  addChannelMember(
    channelId: number,
    userId: number,
    role = 'MEMBER',
  ): Observable<CollabMember> {
    return this.http.post<CollabMember>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/channel-member`,
      { channelId, userId, role },
      { headers: this.headers },
    );
  }

  removeChannelMember(memberId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/channel-member/${memberId}`,
      { headers: this.headers },
    );
  }

  leaveChannel(memberId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/channel-member/${memberId}/leave`,
      {},
      { headers: this.headers },
    );
  }

  // ── User directory ────────────────────────────────────

  getUsersInfo(userIds: number[]): Observable<CollabUserInfo[]> {
    return this.http.post<CollabUserInfo[]>(
      `${this.baseUrl}/x/api/v2/us/ur/get/users/primary/info`,
      userIds,
      { headers: this.headers },
    );
  }

  // ── Messages ─────────────────────────────────────────

  sendMessage(payload: {
    channelId: number;
    senderUserId: number;
    content: string;
    messageType: string;
    replyToMessageId?: number | null;
    threadRootMessageId?: number | null;
  }): Observable<CollabMessage> {
    return this.http.post<CollabMessage>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/message`,
      payload,
      { headers: this.headers },
    );
  }

  editMessage(
    messageId: number,
    payload: {
      channelId: number;
      senderUserId: number;
      content: string;
      messageType: string;
      threadRootMessageId?: number | null;
      replyToMessageId?: number | null;
    },
  ): Observable<number> {
    return this.http.put<number>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/message/${messageId}`,
      payload,
      { headers: this.headers },
    );
  }

  deleteMessage(messageId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/message/${messageId}`,
      { headers: this.headers },
    );
  }

  // ── Attachments ───────────────────────────────────────

  uploadAttachment(
    channelId: number,
    uploaderUserId: number,
    file: File,
    messageId?: number | null,
  ): Observable<CollabAttachmentFull> {
    let url = `${this.baseUrl}/x/api/v2/ai/collab/chat/attachment/upload?channelId=${channelId}&uploaderUserId=${uploaderUserId}`;
    if (messageId) url += `&messageId=${messageId}`;
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<CollabAttachmentFull>(url, fd, {
      headers: this.multipartHeaders,
    });
  }

  getAttachmentsForMessage(
    messageId: number,
  ): Observable<CollabAttachmentFull[]> {
    return this.http.get<CollabAttachmentFull[]>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/attachment/message/${messageId}`,
      { headers: this.headers },
    );
  }

  deleteAttachment(attachmentId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/attachment/${attachmentId}`,
      { headers: this.headers },
    );
  }

  // ── Reactions ─────────────────────────────────────────

  addReaction(payload: {
    messageId: number;
    userId: number;
    reactionCode: string;
  }): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/reaction`,
      payload,
      { headers: this.headers },
    );
  }

  deleteReaction(reactionId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/reaction/${reactionId}`,
      { headers: this.headers },
    );
  }

  // ── Mark read ─────────────────────────────────────────

  markRead(channelId: number, lastReadMessageId: number): Observable<any> {
    const userId = Number(sessionStorage.getItem('userid') || 0);
    return this.http.post<any>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/read/mark`,
      { channelId, userId, lastReadMessageId },
      { headers: this.headers },
    );
  }

  // ── Presence ──────────────────────────────────────────

  setPresenceOnline(channelId: number): Observable<any> {
    const userId = Number(sessionStorage.getItem('userid') || 0);
    return this.http.post<any>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/presence/upsert`,
      { channelId, userId, presenceStatus: 'ONLINE', typing: false },
      { headers: this.headers },
    );
  }

  upsertPresence(channelId: number, presenceStatus: string): Observable<any> {
    const userId = Number(sessionStorage.getItem('userid') || 0);
    return this.http.post<any>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/presence/upsert`,
      { channelId, userId, presenceStatus, typing: false },
      { headers: this.headers },
    );
  }

  setTyping(channelId: number, typing: boolean): Observable<any> {
    const userId = Number(sessionStorage.getItem('userid') || 0);
    return this.http.patch<any>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/presence/typing`,
      { channelId, userId, typing },
      { headers: this.headers },
    );
  }

  getChannelPresence(channelId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/presence/channel/${channelId}`,
      { headers: this.headers },
    );
  }

  getAllPresence(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/presence`,
      { headers: this.headers },
    );
  }

  // ── AI features ───────────────────────────────────────

  aiRewrite(content: string): Observable<AiRewriteResponse> {
    return this.http.post<AiRewriteResponse>(
      `${this.baseUrl}/x/api/v2/ai/collab/email/rewrite`,
      {
        operation: 'REWRITE',
        purpose: 'Rewrite chat draft',
        context: content,
        tone: 'professional',
        language: 'en',
        length: 'short',
      },
      { headers: this.headers },
    );
  }

  aiSuggestSubject(content: string): Observable<AiSubjectResponse> {
    return this.http.post<AiSubjectResponse>(
      `${this.baseUrl}/x/api/v2/ai/collab/subject/suggest`,
      {
        context: content || 'Generate channel subject',
        tone: 'professional',
        audience: 'team',
        maxSuggestions: 5,
      },
      { headers: this.headers },
    );
  }

  aiSummarizeDiscussion(
    subject: string,
    discussionText: string,
  ): Observable<AiSummaryResponse> {
    return this.http.post<AiSummaryResponse>(
      `${this.baseUrl}/x/api/v2/ai/collab/discussion/summarize`,
      {
        subject,
        discussionText,
        summaryStyle: 'executive',
        maxActionItems: 10,
      },
      { headers: this.headers },
    );
  }

  aiComposeEmail(payload: {
    purpose: string;
    audience: string;
    context: string;
    tone?: string;
    length?: string;
  }): Observable<AiEmailComposeResponse> {
    return this.http.post<AiEmailComposeResponse>(
      `${this.baseUrl}/x/api/v2/ai/collab/email/compose`,
      {
        operation: 'COMPOSE',
        purpose: payload.purpose,
        audience: payload.audience,
        tone: payload.tone || 'professional',
        context: payload.context,
        language: 'en',
        length: payload.length || 'medium',
      },
      { headers: this.headers },
    );
  }

  triggerAction(payload: {
    channelId: number;
    messageId?: number | null;
    initiatorUserId: number;
    targetUserId: number;
    actionType: string;
    subject?: string;
    payloadJson?: string;
  }): Observable<CollabActionResponse> {
    return this.http.post<CollabActionResponse>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/action`,
      payload,
      { headers: this.headers },
    );
  }
}

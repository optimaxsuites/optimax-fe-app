import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../sharedComponent/service/environments/environment';

// damilola worked on this: collaboration and analytics API wiring for the new workspace UI.
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
  status?: 'ACTIVE' | 'BANNED' | 'LEFT' | 'REMOVED';
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

export interface PaginationResult<T> {
  content: T[];
  totalSize: number;
  page: number;
  size: number;
}

export interface CollabFeedMediaItem {
  mediaType?: string;
  url?: string;
  thumbnailUrl?: string;
  caption?: string;
}

export interface CollabFeedMediaUpload {
  mediaType?: string;
  url?: string;
  thumbnailUrl?: string;
  caption?: string;
  fileName?: string;
  contentType?: string;
  fileSize?: number;
}

export interface CollabFeedUser {
  id?: number;
  userId?: number;
  fullname?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface CollabFeedComment {
  id: number;
  postId: number;
  parentCommentId?: number;
  threadRootCommentId?: number;
  author?: CollabFeedUser;
  content: string;
  mediaItems?: CollabFeedMediaItem[];
  deleted?: boolean;
  replyCount?: number;
  reactionCount?: number;
  reactionBreakdown?: Record<string, number>;
  actorReactionCode?: string | null;
  createdAt?: string | number[];
  updatedAt?: string | number[];
}

export interface CollabFeedReactionUser {
  id: number;
  postId?: number;
  commentId?: number;
  reactionCode: string;
  reactedAt?: string | number[];
  user?: CollabFeedUser;
}

export interface CollabFeedPost {
  id: number;
  author?: CollabFeedUser;
  channel?: CollabChannel;
  title?: string;
  body?: string;
  summary?: string;
  coverImageUrl?: string;
  mediaItems?: CollabFeedMediaItem[];
  tags?: string[];
  moduleCodes?: string[];
  postType?: string;
  status?: string;
  allowComments?: boolean;
  allowReactions?: boolean;
  pinned?: boolean;
  featured?: boolean;
  eventAt?: string | number[];
  publishedAt?: string | number[];
  createdAt?: string | number[];
  updatedAt?: string | number[];
  shareCount?: number;
  viewCount?: number;
  commentCount?: number;
  reactionCount?: number;
  reactionBreakdown?: Record<string, number>;
  actorReactionCode?: string | null;
  recentComments?: CollabFeedComment[];
}

export interface CollabFeedHome {
  featuredPosts: CollabFeedPost[];
  feed: PaginationResult<CollabFeedPost>;
  trendingTags: string[];
  suggestedChannels: CollabChannel[];
  activeChatCount: number;
}

export interface CollabFeedNotification {
  id: number;
  recipientUserId: number;
  actorUserId: number;
  postId?: number;
  commentId?: number;
  notificationType: string;
  title: string;
  body: string;
  read: boolean;
  createdAt?: string | number[];
  actor?: CollabFeedUser;
}

export interface AnalyticsInsight {
  title: string;
  value: string;
  changeText: string;
  narrative: string;
  severity: string;
}

export interface AnalyticsCapability {
  capabilityId: string;
  moduleCode: string;
  label: string;
  analysisType: string;
  prompt: string;
  nextPrompt: string;
}

export interface AnalyticsModuleCard {
  code: string;
  name: string;
  status: string;
  theme: string;
  summary: string;
  highlights: AnalyticsInsight[];
  drilldowns: AnalyticsCapability[];
  starterPrompts: string[];
}

export interface TaskRoutineAttachment {
  id?: string;
  name?: string;
  size?: string;
  type?: string;
  previewUrl?: string;
}

export interface TaskRoutineWorkItem {
  id?: string;
  title: string;
  ownerUserId?: number | null;
  ownerName?: string;
  timelineStart?: string;
  timelineDue?: string;
  dependency?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
  progress?: number;
}

export interface TaskRoutineUpdate {
  id?: string;
  authorUserId?: number | null;
  authorName?: string;
  note: string;
  progress?: number;
  createdAt?: string;
  attachments?: TaskRoutineAttachment[];
}

export interface TaskRoutineReview {
  id?: string;
  reviewerUserId?: number | null;
  reviewerName?: string;
  decision: 'APPROVED' | 'CHANGES' | 'NOTED';
  note: string;
  createdAt?: string;
  emailPreview?: string;
  attachments?: TaskRoutineAttachment[];
}

export interface TaskRoutineUser {
  id?: number;
  userId?: number;
  fullname?: string;
  username?: string;
  email?: string;
}

export interface TaskRoutinePlan {
  id?: number;
  owner?: TaskRoutineUser;
  assignee?: TaskRoutineUser;
  supervisor?: TaskRoutineUser;
  ownerUserId?: number | null;
  assigneeUserId?: number | null;
  supervisorUserId?: number | null;
  title: string;
  description?: string;
  lane?: 'BACKLOG' | 'TODAY' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  status?: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  progress?: number;
  timelineStart?: string;
  timelineDue?: string;
  routineType?: 'Daily' | 'Routine' | 'Workplan';
  priority?: 'Low' | 'Medium' | 'High';
  dependencyType?: 'NONE' | 'PROJECT' | 'PERSON';
  dependencyValue?: string;
  projectName?: string;
  tags?: string[];
  attachments?: TaskRoutineAttachment[];
  workItems?: TaskRoutineWorkItem[];
  updates?: TaskRoutineUpdate[];
  reviews?: TaskRoutineReview[];
  sharedWithSupervisor?: boolean;
  supervisorApproved?: boolean;
  linkedToProductivity?: boolean;
  linkedToPayroll?: boolean;
  payrollMonth?: string;
  productivityWeight?: number;
  emailQueuedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  blockedCount?: number;
  openChildCount?: number;
}

export interface TaskRoutineStaffOption {
  employeeId?: number;
  userId?: number;
  firstName?: string;
  lastName?: string;
  fullname?: string;
  role?: string;
  department?: string;
}

export interface TaskRoutineSummary {
  id: number;
  title: string;
  assigneeName?: string;
  lane?: 'BACKLOG' | 'TODAY' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  status?: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  progress?: number;
  blockedCount?: number;
  openChildCount?: number;
  timelineDue?: string;
  projectName?: string;
}

export interface TaskRoutineHome {
  plans: PaginationResult<TaskRoutinePlan>;
  staffOptions: TaskRoutineStaffOption[];
  topTodos: TaskRoutineSummary[];
}

export interface AnalyticsWorkspace {
  workspaceCode: string;
  timeframe: string;
  branchId?: number;
  subscribedModules: string[];
  modules: AnalyticsModuleCard[];
  enterpriseHighlights: AnalyticsInsight[];
  chatCapabilities: AnalyticsCapability[];
  generatedAt?: string | number[];
}

export interface AnalyticsDrilldown {
  moduleCode: string;
  capabilityId: string;
  title: string;
  narrative: string;
  highlights: AnalyticsInsight[];
  nextPrompts: string[];
  chart?: { type?: string; title?: string; labels?: string[]; series?: number[][] };
  generatedAt?: string | number[];
}

export interface AnalyticsChatResponse {
  conversationId: string;
  moduleCode: string;
  answer: string;
  suggestedDrilldowns: AnalyticsCapability[];
  followUpPrompts: string[];
  chart?: { type?: string; title?: string; labels?: string[]; series?: number[][] };
  generatedAt?: string | number[];
}

@Injectable({ providedIn: 'root' })
export class CollaborationService {
  private readonly baseUrl = environment.apiBaseUrl;
  get apiBaseUrl(): string {
    return this.baseUrl;
  }

  constructor(private http: HttpClient) {}

  private currentUserId(): number {
    const direct =
      sessionStorage.getItem('userid') ||
      sessionStorage.getItem('userId') ||
      '';
    const parsedDirect = Number(direct || 0);
    if (parsedDirect) {
      return parsedDirect;
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

  private get headers(): HttpHeaders {
    const token = sessionStorage.getItem('token') || '';
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const userId =
      sessionStorage.getItem('userid') ||
      sessionStorage.getItem('userId') ||
      '';
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
    const userId =
      sessionStorage.getItem('userid') ||
      sessionStorage.getItem('userId') ||
      '';
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

  getChannelMembersByStatus(
    channelId: number,
    status: 'ACTIVE' | 'BANNED' | 'LEFT' | 'REMOVED',
  ): Observable<CollabMember[]> {
    return this.http.get<CollabMember[]>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/channel-member/channel/${channelId}/status/${status}`,
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

  banChannelMember(memberId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/channel-member/${memberId}/ban`,
      {},
      { headers: this.headers },
    );
  }

  unbanChannelMember(memberId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/channel-member/${memberId}/unban`,
      {},
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
    const userId = this.currentUserId();
    return this.http.post<any>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/read/mark`,
      { channelId, userId, lastReadMessageId },
      { headers: this.headers },
    );
  }

  // ── Presence ──────────────────────────────────────────

  setPresenceOnline(channelId: number): Observable<any> {
    const userId = this.currentUserId();
    return this.http.post<any>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/presence/upsert`,
      { channelId, userId, presenceStatus: 'ONLINE', typing: false },
      { headers: this.headers },
    );
  }

  upsertPresence(channelId: number, presenceStatus: string): Observable<any> {
    const userId = this.currentUserId();
    return this.http.post<any>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/presence/upsert`,
      { channelId, userId, presenceStatus, typing: false },
      { headers: this.headers },
    );
  }

  setTyping(channelId: number, typing: boolean): Observable<any> {
    const userId = this.currentUserId();
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
        purpose: 'Rewrite collaboration message with clearer grammar and professional semantics',
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

  // ── Enterprise feed ─────────────────────────────────

  getFeedHome(query = '', page = 1, size = 10): Observable<CollabFeedHome> {
    const encodedQuery = encodeURIComponent(query || '');
    return this.http.get<CollabFeedHome>(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/home/me?query=${encodedQuery}&page=${page}&size=${size}`,
      { headers: this.headers },
    );
  }

  getFeedPosts(
    query = '',
    channelId?: number,
    page = 1,
    size = 10,
    publishedOnly = true,
  ): Observable<PaginationResult<CollabFeedPost>> {
    const params = [
      `query=${encodeURIComponent(query || '')}`,
      `page=${page}`,
      `size=${size}`,
      `publishedOnly=${publishedOnly}`,
      channelId ? `channelId=${channelId}` : '',
    ]
      .filter(Boolean)
      .join('&');

    return this.http.get<PaginationResult<CollabFeedPost>>(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/post?${params}`,
      { headers: this.headers },
    );
  }

  createFeedPost(payload: {
    title?: string;
    body: string;
    summary?: string;
    coverImageUrl?: string;
    mediaItems?: CollabFeedMediaItem[];
    tags?: string[];
    moduleCodes?: string[];
    postType?: string;
    channelId?: number | null;
    featured?: boolean;
  }): Observable<CollabFeedPost> {
    return this.http.post<CollabFeedPost>(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/post`,
      {
        ...payload,
        status: 'PUBLISHED',
        allowComments: true,
        allowReactions: true,
      },
      { headers: this.headers },
    );
  }

  updateFeedPost(
    id: number,
    payload: {
      title?: string;
      body: string;
      summary?: string;
      coverImageUrl?: string;
      mediaItems?: CollabFeedMediaItem[];
      tags?: string[];
      moduleCodes?: string[];
      postType?: string;
      channelId?: number | null;
      featured?: boolean;
      status?: string;
      allowComments?: boolean;
      allowReactions?: boolean;
      pinned?: boolean;
    },
  ): Observable<number> {
    return this.http.put<number>(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/post/${id}`,
      payload,
      { headers: this.headers },
    );
  }

  deleteFeedPost(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/post/${id}`,
      { headers: this.headers },
    );
  }

  uploadFeedMedia(file: File): Observable<CollabFeedMediaUpload> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<CollabFeedMediaUpload>(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/post/media/upload`,
      fd,
      { headers: this.multipartHeaders },
    );
  }

  getFeedComments(
    postId: number,
    page = 1,
    size = 20,
  ): Observable<PaginationResult<CollabFeedComment>> {
    return this.http.get<PaginationResult<CollabFeedComment>>(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/comment/post/${postId}?page=${page}&size=${size}`,
      { headers: this.headers },
    );
  }

  searchFeedComments(
    postId: number,
    query: string,
    page = 1,
    size = 20,
  ): Observable<PaginationResult<CollabFeedComment>> {
    return this.http.get<PaginationResult<CollabFeedComment>>(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/comment/search?postId=${postId}&query=${encodeURIComponent(query || '')}&page=${page}&size=${size}`,
      { headers: this.headers },
    );
  }

  createFeedComment(
    postId: number,
    content: string,
    parentCommentId?: number | null,
    mediaItems?: CollabFeedMediaItem[],
  ): Observable<CollabFeedComment> {
    return this.http.post<CollabFeedComment>(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/comment`,
      {
        postId,
        content,
        parentCommentId: parentCommentId ?? null,
        mediaItems: mediaItems || [],
      },
      { headers: this.headers },
    );
  }

  reactToFeedPost(
    postId: number,
    reactionCode: string,
  ): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/reaction`,
      { postId, reactionCode },
      { headers: this.headers },
    );
  }

  removeFeedReaction(postId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/reaction/post/${postId}`,
      { headers: this.headers },
    );
  }

  reactToFeedComment(
    postId: number,
    commentId: number,
    reactionCode: string,
  ): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/reaction`,
      { postId, commentId, reactionCode },
      { headers: this.headers },
    );
  }

  removeFeedCommentReaction(
    postId: number,
    commentId: number,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/reaction/post/${postId}?commentId=${commentId}`,
      { headers: this.headers },
    );
  }

  getFeedPostReactions(postId: number): Observable<CollabFeedReactionUser[]> {
    return this.http.get<CollabFeedReactionUser[]>(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/reaction/post/${postId}`,
      { headers: this.headers },
    );
  }

  getFeedCommentReactions(commentId: number): Observable<CollabFeedReactionUser[]> {
    return this.http.get<CollabFeedReactionUser[]>(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/reaction/comment/${commentId}`,
      { headers: this.headers },
    );
  }

  getFeedNotifications(): Observable<CollabFeedNotification[]> {
    return this.http.get<CollabFeedNotification[]>(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/notification/me`,
      { headers: this.headers },
    );
  }

  markFeedNotificationRead(id: number): Observable<CollabFeedNotification> {
    return this.http.post<CollabFeedNotification>(
      `${this.baseUrl}/x/api/v2/ai/collab/feed/notification/${id}/read`,
      {},
      { headers: this.headers },
    );
  }

  // ── Tasks and routines ─────────────────────────────

  getTaskRoutineHome(
    query = '',
    status = 'ALL',
    page = 1,
    size = 10,
  ): Observable<TaskRoutineHome> {
    return this.http.get<TaskRoutineHome>(
      `${this.baseUrl}/x/api/v2/ai/tasks-routines/home/me?query=${encodeURIComponent(query || '')}&status=${encodeURIComponent(status)}&page=${page}&size=${size}`,
      { headers: this.headers },
    );
  }

  getTaskRoutinePlans(
    query = '',
    status = 'ALL',
    page = 1,
    size = 10,
  ): Observable<PaginationResult<TaskRoutinePlan>> {
    return this.http.get<PaginationResult<TaskRoutinePlan>>(
      `${this.baseUrl}/x/api/v2/ai/tasks-routines/plans?query=${encodeURIComponent(query || '')}&status=${encodeURIComponent(status)}&page=${page}&size=${size}`,
      { headers: this.headers },
    );
  }

  getTaskRoutinePlan(id: number): Observable<TaskRoutinePlan> {
    return this.http.get<TaskRoutinePlan>(
      `${this.baseUrl}/x/api/v2/ai/tasks-routines/plans/${id}`,
      { headers: this.headers },
    );
  }

  createTaskRoutinePlan(payload: TaskRoutinePlan): Observable<TaskRoutinePlan> {
    return this.http.post<TaskRoutinePlan>(
      `${this.baseUrl}/x/api/v2/ai/tasks-routines/plans`,
      payload,
      { headers: this.headers },
    );
  }

  updateTaskRoutinePlan(id: number, payload: TaskRoutinePlan): Observable<TaskRoutinePlan> {
    return this.http.put<TaskRoutinePlan>(
      `${this.baseUrl}/x/api/v2/ai/tasks-routines/plans/${id}`,
      payload,
      { headers: this.headers },
    );
  }

  deleteTaskRoutinePlan(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/x/api/v2/ai/tasks-routines/plans/${id}`,
      { headers: this.headers },
    );
  }

  getTaskRoutineStaffOptions(): Observable<TaskRoutineStaffOption[]> {
    return this.http.get<TaskRoutineStaffOption[]>(
      `${this.baseUrl}/x/api/v2/ai/tasks-routines/staff-options`,
      { headers: this.headers },
    );
  }

  getTaskRoutineTopTodos(size = 5): Observable<TaskRoutineSummary[]> {
    return this.http.get<TaskRoutineSummary[]>(
      `${this.baseUrl}/x/api/v2/ai/tasks-routines/top-todos/me?size=${size}`,
      { headers: this.headers },
    );
  }

  uploadTaskRoutineAttachment(file: File): Observable<TaskRoutineAttachment> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<TaskRoutineAttachment>(
      `${this.baseUrl}/x/api/v2/ai/tasks-routines/attachments/upload`,
      fd,
      { headers: this.multipartHeaders },
    );
  }

  // ── Analytics workspace ─────────────────────────────

  getDefaultAnalyticsWorkspace(): Observable<AnalyticsWorkspace> {
    return this.http.get<AnalyticsWorkspace>(
      `${this.baseUrl}/x/api/v2/ai/analytics/workspace/default`,
      { headers: this.headers },
    );
  }

  getAnalyticsWorkspace(payload: {
    timeframe?: string;
    branchId?: number | null;
    subscribedModules?: string[];
    includeAllModules?: boolean;
    includeCrossDomain?: boolean;
    focusArea?: string;
  }): Observable<AnalyticsWorkspace> {
    return this.http.post<AnalyticsWorkspace>(
      `${this.baseUrl}/x/api/v2/ai/analytics/workspace`,
      payload,
      { headers: this.headers },
    );
  }

  getAnalyticsDrilldown(payload: {
    moduleCode: string;
    capabilityId: string;
    timeframe?: string;
    branchId?: number | null;
    subscribedModules?: string[];
  }): Observable<AnalyticsDrilldown> {
    return this.http.post<AnalyticsDrilldown>(
      `${this.baseUrl}/x/api/v2/ai/analytics/drilldown`,
      payload,
      { headers: this.headers },
    );
  }

  chatAnalytics(payload: {
    prompt: string;
    moduleCode?: string;
    timeframe?: string;
    branchId?: number | null;
    subscribedModules?: string[];
    drillPath?: string[];
    autoFetch?: boolean;
  }): Observable<AnalyticsChatResponse> {
    return this.http.post<AnalyticsChatResponse>(
      `${this.baseUrl}/x/api/v2/ai/analytics/chat`,
      payload,
      { headers: this.headers },
    );
  }
}

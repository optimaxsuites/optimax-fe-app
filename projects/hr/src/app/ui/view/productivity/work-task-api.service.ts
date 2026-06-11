import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// ── Enums ────────────────────────────────────────────────────────────────────
export type WorkTaskStatus = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type WorkTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SubtaskStatus = 'OPEN' | 'IN_PROGRESS' | 'BLOCKED';
export type GoalStatus = 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
export type SubmissionStatus = 'DRAFT' | 'SUBMITTED';
export type ReviewStatus = 'PENDING' | 'REVIEWED';

// ── Employee stub (from backend EmployeeFullDTO) ──────────────────────────────
export interface EmployeeRef {
  id: number;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department?: { name: string };
}

// ── Work Task ─────────────────────────────────────────────────────────────────
export interface WorkTaskSubtask {
  id: number;
  workTaskId: number;
  title: string;
  done: boolean;
  assigneeEmployee?: EmployeeRef;
  status: SubtaskStatus;
  startDate?: string;
  dueDate?: string;
  dependency?: string;
}

export interface WorkTaskFollowUp {
  id: number;
  workTaskId: number;
  authorEmployee?: EmployeeRef;
  text: string;
  decision?: string;
  progress: number;
  photoUrls?: string;
  createdAt: string;
}

export interface WorkTaskFull {
  id: number;
  title: string;
  description: string;
  assigneeEmployee?: EmployeeRef;
  supervisorEmployee?: EmployeeRef;
  status: WorkTaskStatus;
  priority: WorkTaskPriority;
  startDate?: string;
  dueDate?: string;
  weight: number;
  progress: number;
  tags?: string;
  createdByUserId?: number;
  createdAt: string;
  updatedAt: string;
  subtasks: WorkTaskSubtask[];
  followUps: WorkTaskFollowUp[];
}

export interface WorkTaskDTO {
  id?: number;
  title: string;
  description?: string;
  assigneeEmployeeId?: number;
  supervisorEmployeeId?: number;
  status?: WorkTaskStatus;
  priority?: WorkTaskPriority;
  startDate?: string;
  dueDate?: string;
  weight?: number;
  progress?: number;
  tags?: string;
  createdByUserId?: number;
}

export interface SubtaskDTO {
  id?: number;
  workTaskId: number;
  title: string;
  done?: boolean;
  assigneeEmployeeId?: number;
  status?: SubtaskStatus;
  startDate?: string;
  dueDate?: string;
  dependency?: string;
}

export interface FollowUpDTO {
  id?: number;
  workTaskId: number;
  authorEmployeeId?: number;
  text: string;
  decision?: string;
  progress?: number;
  photoUrls?: string;
}

// ── Performance Goal ──────────────────────────────────────────────────────────
export interface KpiDTO {
  id?: number;
  goalId?: number;
  text: string;
  done?: boolean;
}

export interface PerformanceGoalFull {
  id: number;
  employee?: EmployeeRef;
  cycleYear?: number;
  cycleQuarter?: string;
  title: string;
  description?: string;
  weight: number;
  dueDate?: string;
  selfRating: number;
  rationale?: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
  kpis: KpiDTO[];
}

export interface PerformanceGoalDTO {
  id?: number;
  employeeId?: number;
  cycleYear?: number;
  cycleQuarter?: string;
  title: string;
  description?: string;
  weight?: number;
  dueDate?: string;
  selfRating?: number;
  rationale?: string;
  status?: GoalStatus;
}

// ── Appraisal Submission ──────────────────────────────────────────────────────
export interface AppraisalSubmissionFull {
  id: number;
  employee?: EmployeeRef;
  cycleYear?: number;
  cycleQuarter?: string;
  status: SubmissionStatus;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  goals: PerformanceGoalFull[];
  supervisorReview?: SupervisorReviewFull;
}

export interface AppraisalSubmissionDTO {
  id?: number;
  employeeId?: number;
  cycleYear?: number;
  cycleQuarter?: string;
  status?: SubmissionStatus;
}

// ── Supervisor Review ─────────────────────────────────────────────────────────
export interface SupervisorReviewFull {
  id: number;
  submission?: { id: number; cycleYear?: number; cycleQuarter?: string };
  reviewerEmployee?: EmployeeRef;
  supervisorScore: number;
  reviewNote?: string;
  decision?: string;
  status: ReviewStatus;
  reviewedAt?: string;
  createdAt: string;
}

export interface SupervisorReviewDTO {
  id?: number;
  submissionId?: number;
  reviewerEmployeeId?: number;
  supervisorScore?: number;
  reviewNote?: string;
  decision?: string;
  status?: ReviewStatus;
}

// ── Service ───────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class WorkTaskApiService {
  private readonly base = 'https://be.optimaxsuites.com/x/api/v2/hr';

  constructor(private readonly http: HttpClient) {}

  // ── Work Tasks ─────────────────────────────────────────────────────────────
  getAllTasks(page = 1, size = 100): Observable<WorkTaskFull[]> {
    return this.http.get<WorkTaskFull[]>(`${this.base}/workTasks?page=${page}&size=${size}`)
      .pipe(catchError(this.handleError));
  }

  getTasksByAssignee(employeeId: number): Observable<WorkTaskFull[]> {
    return this.http.get<WorkTaskFull[]>(`${this.base}/workTasks/byAssignee/${employeeId}?size=100`)
      .pipe(catchError(this.handleError));
  }

  getTasksBySupervisor(employeeId: number): Observable<WorkTaskFull[]> {
    return this.http.get<WorkTaskFull[]>(`${this.base}/workTasks/bySupervisor/${employeeId}?size=100`)
      .pipe(catchError(this.handleError));
  }

  getTask(id: number): Observable<WorkTaskFull> {
    return this.http.get<WorkTaskFull>(`${this.base}/workTasks/${id}`)
      .pipe(catchError(this.handleError));
  }

  createTask(dto: WorkTaskDTO): Observable<WorkTaskFull> {
    return this.http.post<WorkTaskFull>(`${this.base}/workTasks`, dto)
      .pipe(catchError(this.handleError));
  }

  updateTask(id: number, dto: WorkTaskDTO): Observable<WorkTaskFull> {
    return this.http.put<WorkTaskFull>(`${this.base}/workTasks/${id}`, dto)
      .pipe(catchError(this.handleError));
  }

  updateTaskStatus(id: number, status: WorkTaskStatus): Observable<WorkTaskFull> {
    return this.http.patch<WorkTaskFull>(`${this.base}/workTasks/${id}/status?status=${status}`, {})
      .pipe(catchError(this.handleError));
  }

  updateTaskProgress(id: number, progress: number): Observable<WorkTaskFull> {
    return this.http.patch<WorkTaskFull>(`${this.base}/workTasks/${id}/progress?progress=${progress}`, {})
      .pipe(catchError(this.handleError));
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/workTasks/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ── Sub-tasks ──────────────────────────────────────────────────────────────
  getSubtasks(workTaskId: number): Observable<WorkTaskSubtask[]> {
    return this.http.get<WorkTaskSubtask[]>(`${this.base}/taskSubtasks/byTask/${workTaskId}`)
      .pipe(catchError(this.handleError));
  }

  createSubtask(dto: SubtaskDTO): Observable<WorkTaskSubtask> {
    return this.http.post<WorkTaskSubtask>(`${this.base}/taskSubtasks`, dto)
      .pipe(catchError(this.handleError));
  }

  toggleSubtask(id: number): Observable<WorkTaskSubtask> {
    return this.http.patch<WorkTaskSubtask>(`${this.base}/taskSubtasks/${id}/toggle`, {})
      .pipe(catchError(this.handleError));
  }

  updateSubtask(id: number, dto: SubtaskDTO): Observable<WorkTaskSubtask> {
    return this.http.put<WorkTaskSubtask>(`${this.base}/taskSubtasks/${id}`, dto)
      .pipe(catchError(this.handleError));
  }

  deleteSubtask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/taskSubtasks/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ── Follow-ups ─────────────────────────────────────────────────────────────
  getFollowUps(workTaskId: number): Observable<WorkTaskFollowUp[]> {
    return this.http.get<WorkTaskFollowUp[]>(`${this.base}/taskFollowUps/byTask/${workTaskId}`)
      .pipe(catchError(this.handleError));
  }

  createFollowUp(dto: FollowUpDTO): Observable<WorkTaskFollowUp> {
    return this.http.post<WorkTaskFollowUp>(`${this.base}/taskFollowUps`, dto)
      .pipe(catchError(this.handleError));
  }

  updateFollowUp(id: number, dto: FollowUpDTO): Observable<WorkTaskFollowUp> {
    return this.http.put<WorkTaskFollowUp>(`${this.base}/taskFollowUps/${id}`, dto)
      .pipe(catchError(this.handleError));
  }

  deleteFollowUp(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/taskFollowUps/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ── Performance Goals ──────────────────────────────────────────────────────
  getAllGoals(): Observable<PerformanceGoalFull[]> {
    return this.http.get<PerformanceGoalFull[]>(`${this.base}/performanceGoals?size=200`)
      .pipe(catchError(this.handleError));
  }

  getGoalsByEmployee(employeeId: number): Observable<PerformanceGoalFull[]> {
    return this.http.get<PerformanceGoalFull[]>(`${this.base}/performanceGoals/byEmployee/${employeeId}`)
      .pipe(catchError(this.handleError));
  }

  getGoalsByCycle(employeeId: number, year: number, quarter: string): Observable<PerformanceGoalFull[]> {
    return this.http.get<PerformanceGoalFull[]>(
      `${this.base}/performanceGoals/byEmployee/${employeeId}/cycle?year=${year}&quarter=${quarter}`)
      .pipe(catchError(this.handleError));
  }

  createGoal(dto: PerformanceGoalDTO): Observable<PerformanceGoalFull> {
    return this.http.post<PerformanceGoalFull>(`${this.base}/performanceGoals`, dto)
      .pipe(catchError(this.handleError));
  }

  updateGoal(id: number, dto: PerformanceGoalDTO): Observable<PerformanceGoalFull> {
    return this.http.put<PerformanceGoalFull>(`${this.base}/performanceGoals/${id}`, dto)
      .pipe(catchError(this.handleError));
  }

  submitSelfAssessment(goalId: number, selfRating: number, rationale?: string): Observable<PerformanceGoalFull> {
    const r = rationale ? `&rationale=${encodeURIComponent(rationale)}` : '';
    return this.http.patch<PerformanceGoalFull>(
      `${this.base}/performanceGoals/${goalId}/selfAssessment?selfRating=${selfRating}${r}`, {})
      .pipe(catchError(this.handleError));
  }

  deleteGoal(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/performanceGoals/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ── KPIs ───────────────────────────────────────────────────────────────────
  createKpi(dto: KpiDTO): Observable<KpiDTO> {
    return this.http.post<KpiDTO>(`${this.base}/performanceKpis`, dto)
      .pipe(catchError(this.handleError));
  }

  toggleKpi(id: number): Observable<KpiDTO> {
    return this.http.patch<KpiDTO>(`${this.base}/performanceKpis/${id}/toggle`, {})
      .pipe(catchError(this.handleError));
  }

  deleteKpi(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/performanceKpis/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ── Appraisal Submissions ──────────────────────────────────────────────────
  getSubmissionsByEmployee(employeeId: number): Observable<AppraisalSubmissionFull[]> {
    return this.http.get<AppraisalSubmissionFull[]>(`${this.base}/appraisalSubmissions/byEmployee/${employeeId}`)
      .pipe(catchError(this.handleError));
  }

  getPendingSubmissions(): Observable<AppraisalSubmissionFull[]> {
    return this.http.get<AppraisalSubmissionFull[]>(`${this.base}/appraisalSubmissions/pending`)
      .pipe(catchError(this.handleError));
  }

  createSubmission(dto: AppraisalSubmissionDTO): Observable<AppraisalSubmissionFull> {
    return this.http.post<AppraisalSubmissionFull>(`${this.base}/appraisalSubmissions`, dto)
      .pipe(catchError(this.handleError));
  }

  submitAppraisal(id: number): Observable<AppraisalSubmissionFull> {
    return this.http.patch<AppraisalSubmissionFull>(`${this.base}/appraisalSubmissions/${id}/submit`, {})
      .pipe(catchError(this.handleError));
  }

  // ── Supervisor Reviews ─────────────────────────────────────────────────────
  getPendingReviews(): Observable<SupervisorReviewFull[]> {
    return this.http.get<SupervisorReviewFull[]>(`${this.base}/supervisorReviews/pending`)
      .pipe(catchError(this.handleError));
  }

  getReviewsByReviewer(reviewerEmployeeId: number): Observable<SupervisorReviewFull[]> {
    return this.http.get<SupervisorReviewFull[]>(`${this.base}/supervisorReviews/byReviewer/${reviewerEmployeeId}`)
      .pipe(catchError(this.handleError));
  }

  createReview(dto: SupervisorReviewDTO): Observable<SupervisorReviewFull> {
    return this.http.post<SupervisorReviewFull>(`${this.base}/supervisorReviews`, dto)
      .pipe(catchError(this.handleError));
  }

  submitReview(id: number, dto: SupervisorReviewDTO): Observable<SupervisorReviewFull> {
    return this.http.patch<SupervisorReviewFull>(`${this.base}/supervisorReviews/${id}/submit`, dto)
      .pipe(catchError(this.handleError));
  }

  // ── Collab media upload (persists follow-up photos) ──────────────────────
  // Uses same auth headers as CollaborationService to ensure upload works in Docker deployment
  uploadMedia(file: File): Observable<{ url?: string; fileName?: string; contentType?: string }> {
    const raw = sessionStorage.getItem('Token') || sessionStorage.getItem('token') ||
                sessionStorage.getItem('accessToken') || localStorage.getItem('Token2') || '';
    // Normalise cookie-style and Bearer-prefixed tokens
    let token = raw.trim();
    if (token.includes('=') && token.includes(';')) {
      const eq = token.indexOf('=') + 1;
      const sc = token.indexOf(';', eq);
      token = token.substring(eq, sc > -1 ? sc : undefined).trim();
    } else if (/^bearer /i.test(token)) {
      token = token.slice(7).trim();
    }
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const userId = sessionStorage.getItem('userid') || sessionStorage.getItem('userId') || '';
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
      'X-User-ID': userId,
      userid: userId,
    });
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url?: string; fileName?: string; contentType?: string }>(
      'https://be.optimaxsuites.com/x/api/v2/ai/collab/feed/post/media/upload', fd, { headers })
      .pipe(catchError(this.handleError));
  }

  // ── Collaboration channels ─────────────────────────────────────────────────
  getCollabChannels(): Observable<Array<{ id: number; name: string; channelCode: string; channelType: string; status: string }>> {
    const token = sessionStorage.getItem('Token') || sessionStorage.getItem('token') || sessionStorage.getItem('accessToken') || '';
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId, 'Content-Type': 'application/json' });
    return this.http.get<any[]>('https://be.optimaxsuites.com/x/api/v2/ai/collab/chat/channel', { headers })
      .pipe(catchError(this.handleError));
  }

  sendChannelMessage(channelId: number, content: string): Observable<any> {
    const token = sessionStorage.getItem('Token') || sessionStorage.getItem('token') || sessionStorage.getItem('accessToken') || '';
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const userId = Number(sessionStorage.getItem('userid') || sessionStorage.getItem('userId') || '0');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId, 'Content-Type': 'application/json' });
    return this.http.post<any>(
      'https://be.optimaxsuites.com/x/api/v2/ai/collab/chat/message',
      { channelId, senderUserId: userId, content, messageType: 'TEXT' },
      { headers })
      .pipe(catchError(this.handleError));
  }

  createCollabFeedPost(channelId: number, body: string): Observable<any> {
    const token = sessionStorage.getItem('Token') || sessionStorage.getItem('token') || sessionStorage.getItem('accessToken') || '';
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId, 'Content-Type': 'application/json' });
    return this.http.post<any>(
      'https://be.optimaxsuites.com/x/api/v2/ai/collab/feed/post',
      { body, channelId, status: 'PUBLISHED', allowComments: true, allowReactions: true, postType: 'UPDATE' },
      { headers })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('WorkTaskApiService error:', error);
    return throwError(() => error);
  }
}

import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MessageService } from 'primeng/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { HeaderStateService } from '../../../../../src/app/ui/shared/service/header-state.service';
import { environment } from '../ui/sharedComponent/service/environments/environment';
import {
  CollaborationService,
  TaskRoutinePlan,
  TaskRoutineReview,
  TaskRoutineStaffOption,
  TaskRoutineSummary,
  TaskRoutineUpdate,
  TaskRoutineWorkItem,
  TaskRoutineAttachment,
} from '../ui/services/collaboration.service';

// damilola worked on this: rebuilt tasks and routines into an enterprise planner with sticky-board and gantt views.
type TaskLane = 'BACKLOG' | 'TODAY' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
type ComposeMode = 'sticky' | 'form' | 'batch';
type PlannerVisualMode = 'sticky' | 'gantt' | 'tree';
type ReviewDecision = 'APPROVED' | 'CHANGES' | 'NOTED';
type DependencyType = 'NONE' | 'PROJECT' | 'PERSON';
type TaskPriority = 'Low' | 'Medium' | 'High';
type RoutineType = 'Daily' | 'Routine' | 'Workplan';
type TaskStatusBucket = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
type WorkItemStatus = 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
type TaskStage = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
type TreeSortField = 'title' | 'owner' | 'stage' | 'timeline' | 'progress' | 'dependency' | 'updatedAt';
type TaskDetailViewMode = 'overview' | 'activity';

interface TaskAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  previewUrl?: string;
}

interface TaskUpdate {
  id: string;
  authorUserId?: number | null;
  author: string;
  note: string;
  progress: number;
  createdAt: string;
  attachments?: TaskAttachment[];
}

interface TaskReview {
  id: string;
  reviewerUserId?: number | null;
  reviewer: string;
  decision: ReviewDecision;
  note: string;
  createdAt: string;
  emailPreview?: string;
  attachments: TaskAttachment[];
}

interface TaskActivityEntry {
  id: string;
  type: 'update' | 'review';
  actor: string;
  stamp: string;
  progress?: number;
  decision?: ReviewDecision;
  body: string;
  attachments: TaskAttachment[];
}

interface TaskWorkItem {
  id: string;
  title: string;
  ownerUserId?: number | null;
  owner: string;
  timelineStart: string;
  timelineDue: string;
  dependency: string;
  status: WorkItemStatus;
  progress: number;
}

interface DraftWorkItem {
  id: string;
  title: string;
  owner: string;
  timelineStart: string;
  timelineDue: string;
  dependency: string;
  status: WorkItemStatus;
  progress: number;
}

interface RoutineTask {
  id: string;
  title: string;
  description: string;
  ownerUserId?: number | null;
  assigneeUserId?: number | null;
  supervisorUserId?: number | null;
  lane: TaskLane;
  progress: number;
  owner: string;
  assignee: string;
  timelineStart: string;
  timelineDue: string;
  routineType: RoutineType;
  priority: TaskPriority;
  dependencyType: DependencyType;
  dependencyValue: string;
  projectName: string;
  tags: string[];
  attachments: TaskAttachment[];
  updates: TaskUpdate[];
  reviews: TaskReview[];
  workItems: TaskWorkItem[];
  sharedWithSupervisor: boolean;
  supervisorApproved: boolean;
  linkedToProductivity?: boolean;
  linkedToPayroll?: boolean;
  payrollMonth?: string;
  productivityWeight?: number;
  emailQueuedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ReminderCard {
  title: string;
  caption: string;
  tone: 'due' | 'review' | 'routine';
  taskId?: string;
}

interface DemoTaskBlueprint {
  title: string;
  description: string;
  routineType: RoutineType;
  priority: TaskPriority;
  projectName: string;
  lane: TaskLane;
  progress: number;
  dueInDays: number;
  sharedWithSupervisor?: boolean;
  supervisorApproved?: boolean;
  tags: string[];
  workItems: Array<{
    title: string;
    dependency?: string;
    status: WorkItemStatus;
    startOffset: number;
    dueOffset: number;
    progress: number;
  }>;
}

interface PerformanceCard {
  name: string;
  role: string;
  weeklyScore: number;
  monthlyScore: number;
  completed: number;
  awaitingReview: number;
  lastUpdate: string;
}

interface PersonOption {
  name: string;
  role: string;
  userId?: number | null;
}

interface DraftState {
  title: string;
  description: string;
  stage: TaskStage;
  routineType: RoutineType;
  priority: TaskPriority;
  timelineStart: string;
  timelineDue: string;
  assignee: string;
  projectName: string;
  dependencyType: DependencyType;
  dependencyValue: string;
  tags: string;
  workItems: DraftWorkItem[];
}

@Component({
  selector: 'app-feed',
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss'],
  providers: [MessageService],
})
export class FeedComponent implements OnInit, OnDestroy {
  @Input() userInfo: any = {};

  readonly lanes: Array<{
    key: TaskLane;
    label: string;
    subtitle: string;
    icon: string;
    accent: string;
  }> = [
    {
      key: 'BACKLOG',
      label: 'Pinned backlog',
      subtitle: 'Ideas, work briefs, and newly captured plans.',
      icon: 'pi pi-thumbtack',
      accent: 'tone-backlog',
    },
    {
      key: 'TODAY',
      label: 'Today focus',
      subtitle: 'Work due now and immediate execution items.',
      icon: 'pi pi-calendar-clock',
      accent: 'tone-today',
    },
    {
      key: 'IN_PROGRESS',
      label: 'In progress',
      subtitle: 'Sub tasks actively moving across teams.',
      icon: 'pi pi-play-circle',
      accent: 'tone-progress',
    },
    {
      key: 'REVIEW',
      label: 'Supervisor review',
      subtitle: 'Shared plans awaiting feedback or sign-off.',
      icon: 'pi pi-eye',
      accent: 'tone-review',
    },
    {
      key: 'DONE',
      label: 'Closed loop',
      subtitle: 'Completed outcomes feeding formal reporting.',
      icon: 'pi pi-check-circle',
      accent: 'tone-done',
    },
  ];

  readonly enterpriseProjects = [
    'OptimaXCloud IAAS',
    'Treasury Controls Rollout',
    'Retail Network Uplift',
    'Terminal Safety Dashboard',
    'Vendor Compliance Programme',
  ];
  routineTypeOptions: RoutineType[] = ['Daily', 'Routine', 'Workplan'];
  dependencyTypeOptions: Array<{ label: string; value: DependencyType }> = [
    { label: 'None', value: 'NONE' },
    { label: 'Project', value: 'PROJECT' },
    { label: 'Person', value: 'PERSON' },
  ];
  stageOptions: Array<{ label: string; value: TaskStage }> = [
    { label: 'Open', value: 'OPEN' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Closed', value: 'CLOSED' },
  ];

  currentUuid = 'uu';
  isSupervisor = false;
  isLoading = false;
  activePage: 'planner' | 'reviews' | 'reports' = 'planner';
  composeMode: ComposeMode = 'sticky';
  visualMode: PlannerVisualMode = 'tree';
  composerVisible = false;
  taskDialogVisible = false;
  taskDetailViewMode: TaskDetailViewMode = 'overview';
  taskBoard: Record<TaskLane, RoutineTask[]> = {
    BACKLOG: [],
    TODAY: [],
    IN_PROGRESS: [],
    REVIEW: [],
    DONE: [],
  };
  people: PersonOption[] = [];
  staffOptions: TaskRoutineStaffOption[] = [];
  draft: DraftState = this.emptyDraft();
  batchRows = '';
  pendingAttachments: TaskAttachment[] = [];
  pendingUpdateAttachments: TaskAttachment[] = [];
  pendingReviewAttachments: TaskAttachment[] = [];
  reminders: ReminderCard[] = [];
  updateDrafts: Record<string, string> = {};
  supervisorNotes: Record<string, string> = {};
  highlightedUpdateId: string | null = null;
  highlightedReviewId: string | null = null;
  selectedReviewOwner = 'All';
  searchTerm = '';
  selectedStatusBucket: TaskStatusBucket = 'ALL';
  selectedTask: RoutineTask | null = null;
  selectedTaskSubTaskDraft: DraftWorkItem | null = null;
  expandedTreeTaskIds = new Set<string>();
  treeSortField: TreeSortField = 'updatedAt';
  treeSortDirection: 'asc' | 'desc' = 'desc';
  treeFilterOwner = '';
  treeFilterStage: TaskStage | 'ALL' = 'ALL';
  metadataDialogVisible = false;
  historyFilter = '';
  projectOptions: string[] = [...this.enterpriseProjects];
  newMetadata = {
    project: '',
    stage: '',
    routineType: '',
    dependencyLabel: '',
    dependencyValue: 'PROJECT' as DependencyType,
  };
  reminderDialogVisible = false;
  reminderDialogTitle = '';
  reminderDialogBody = '';
  readonly demoProjects = ['Siemens Delivery Office', 'Glo Nigeria Network PMO', 'MTN Nigeria Experience Hub', 'CAC Digital Filing Programme'];
  private readonly notificationTargetListener = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (detail?.taskRoutineId) {
      this.applyNotificationTarget(detail);
    }
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly headerStateService: HeaderStateService,
    private readonly collaborationService: CollaborationService,
    private readonly messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.currentUuid = this.route.snapshot.paramMap.get('uuid') || 'uu';
    this.isSupervisor = this.readRole().includes('ROLE_ADMIN') || this.readRole().includes('SUPERVISOR');
    this.loadMetadataConfig();
    if (typeof window !== 'undefined') {
      window.addEventListener('optimax-open-collab-target', this.notificationTargetListener as EventListener);
    }
    this.loadHomeData();
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('optimax-open-collab-target', this.notificationTargetListener as EventListener);
    }
    this.revokeAttachmentUrls(this.pendingAttachments);
    this.revokeAttachmentUrls(this.pendingUpdateAttachments);
    this.revokeAttachmentUrls(this.pendingReviewAttachments);
    this.tasks.forEach((task) => this.revokeAttachmentUrls(task.attachments));
    this.tasks.forEach((task) => task.reviews.forEach((review) => this.revokeAttachmentUrls(review.attachments || [])));
  }

  get tasks(): RoutineTask[] {
    return this.lanes.flatMap((lane) => this.taskBoard[lane.key]);
  }

  get dropListIds(): string[] {
    return this.lanes.map((lane) => this.dropListId(lane.key));
  }

  get selectedTaskUpdates(): TaskUpdate[] {
    return this.selectedTask?.updates || [];
  }

  get selectedTaskReviews(): TaskReview[] {
    return this.selectedTask?.reviews || [];
  }

  get selectedTaskActivityTimeline(): TaskActivityEntry[] {
    if (!this.selectedTask) return [];
    const updates = this.selectedTask.updates.map((update) => ({
      id: update.id,
      type: 'update' as const,
      actor: this.updateAuthorLabel(update),
      stamp: update.createdAt,
      progress: update.progress,
      body: update.note,
      attachments: update.attachments || [],
    }));
    const reviews = this.selectedTask.reviews.map((review) => ({
      id: review.id,
      type: 'review' as const,
      actor: this.reviewReviewerLabel(review),
      stamp: review.createdAt,
      decision: review.decision,
      body: review.note,
      attachments: review.attachments || [],
    }));
    return [...updates, ...reviews].sort((left, right) => right.stamp.localeCompare(left.stamp));
  }

  get reminderMetrics(): { label: string; value: string; caption: string }[] {
    const total = this.tasks.length || 1;
    const completed = this.taskBoard.DONE.length;
    const review = this.taskBoard.REVIEW.length;
    const workstreams = this.tasks.reduce((sum, task) => sum + task.workItems.length, 0);
    return [
      {
        label: 'Active plans',
        value: String(this.taskBoard.TODAY.length + this.taskBoard.IN_PROGRESS.length),
        caption: 'parent tasks moving across the organisation',
      },
      {
        label: 'Tracked sub tasks',
        value: String(workstreams),
        caption: 'child items monitored from start to finish',
      },
      {
        label: 'Completion',
        value: `${Math.round((completed / total) * 100)}%`,
        caption: 'plans already closed into reporting',
      },
      {
        label: 'Supervisor queue',
        value: String(review),
        caption: 'shared plans awaiting feedback',
      },
    ];
  }

  get visibleReviewTasks(): RoutineTask[] {
    const reviewTasks = this.reviewTasks;
    if (this.selectedReviewOwner === 'All') return reviewTasks;
    return reviewTasks.filter((task) => task.assignee?.trim() === this.selectedReviewOwner);
  }

  get reviewTasks(): RoutineTask[] {
    return this.tasks.filter(
      (task) => task.sharedWithSupervisor || task.lane === 'REVIEW' || task.supervisorApproved,
    );
  }

  get reviewAssignees(): string[] {
    return [...new Set(this.reviewTasks.map((task) => task.assignee?.trim()).filter((name): name is string => !!name))]
      .sort((left, right) => left.localeCompare(right));
  }

  get filteredTasks(): RoutineTask[] {
    const query = this.searchTerm.trim().toLowerCase();
    const base = this.tasks.filter(
      (task) => this.selectedStatusBucket === 'ALL' || this.belongsToStatusBucket(task, this.selectedStatusBucket),
    );
    if (!query) return base;
    return base.filter((task) => this.matchesTaskQuery(task, query));
  }

  get statusBuckets(): Array<{
    key: TaskStatusBucket;
    label: string;
    count: number;
    icon: string;
    caption: string;
  }> {
    return [
      {
        key: 'OPEN',
        label: 'Open',
        count: this.tasks.filter((task) => this.belongsToStatusBucket(task, 'OPEN')).length,
        icon: 'pi pi-folder-open',
        caption: 'Pinned or scheduled plans still being arranged.',
      },
      {
        key: 'IN_PROGRESS',
        label: 'In Progress',
        count: this.tasks.filter((task) => this.belongsToStatusBucket(task, 'IN_PROGRESS')).length,
        icon: 'pi pi-chart-line',
        caption: 'Execution and review sub tasks in motion.',
      },
      {
        key: 'CLOSED',
        label: 'Closed',
        count: this.tasks.filter((task) => this.belongsToStatusBucket(task, 'CLOSED')).length,
        icon: 'pi pi-check-circle',
        caption: 'Finished plans already contributing to reporting.',
      },
    ];
  }

  get selectedStatusTasks(): RoutineTask[] {
    const ownerQuery = this.treeFilterOwner.trim().toLowerCase();
    return this.filteredTasks
      .filter((task) => {
        const matchesOwner = !ownerQuery || (task.owner || '').toLowerCase().includes(ownerQuery) || (task.assignee || '').toLowerCase().includes(ownerQuery);
        const matchesStage = this.treeFilterStage === 'ALL' || this.stageForTask(task) === this.treeFilterStage;
        return matchesOwner && matchesStage;
      })
      .slice()
      .sort((left, right) => this.compareTreeTasks(left, right));
  }

  get selectedStatusTitle(): string {
    if (this.selectedStatusBucket === 'ALL') return 'All task plans';
    return this.statusBuckets.find((bucket) => bucket.key === this.selectedStatusBucket)?.label || 'Tasks';
  }

  get reportCards(): PerformanceCard[] {
    const grouped = new Map<string, RoutineTask[]>();
    this.tasks.forEach((task) => {
      const key = task.assignee || task.owner;
      grouped.set(key, [...(grouped.get(key) || []), task]);
    });

    return Array.from(grouped.entries()).map(([name, rows]) => {
      const completed = rows.filter((task) => task.lane === 'DONE').length;
      const awaitingReview = rows.filter((task) => task.lane === 'REVIEW').length;
      const progressBase = rows.length ? rows.reduce((sum, task) => sum + task.progress, 0) / rows.length : 0;
      const itemBonus = Math.min(18, rows.reduce((sum, task) => sum + task.workItems.length, 0));
      const monthlyScore = Math.min(100, Math.round(progressBase * 0.75 + itemBonus));
      const weeklyScore = Math.min(100, Math.round(progressBase));
      const latestUpdate = rows
        .flatMap((task) => task.updates)
        .sort((left, right) => this.normalizeDateTimeValue(right.createdAt).localeCompare(this.normalizeDateTimeValue(left.createdAt)))[0];

      return {
        name,
        role: this.people.find((person) => person.name === name)?.role || 'Contributor',
        weeklyScore,
        monthlyScore,
        completed,
        awaitingReview,
        lastUpdate: latestUpdate
          ? new Date(latestUpdate.createdAt).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })
          : 'No updates yet',
      };
    });
  }

  get historyCards(): RoutineTask[] {
    const query = this.historyFilter.trim().toLowerCase();
    const rows = this.tasks
      .slice()
      .sort((left, right) => {
        const leftTime = new Date(left.emailQueuedAt || left.timelineDue || left.timelineStart).getTime();
        const rightTime = new Date(right.emailQueuedAt || right.timelineDue || right.timelineStart).getTime();
        return rightTime - leftTime;
      });
    if (!query) {
      return rows;
    }
    return rows.filter((task) => this.matchesTaskQuery(task, query));
  }

  get ganttDayLabels(): Array<{ iso: string; label: string }> {
    const range = this.ganttRange();
    const days: Array<{ iso: string; label: string }> = [];
    const current = new Date(range.start);
    while (current <= range.end) {
      const iso = this.isoFromDate(current);
      days.push({
        iso,
        label: current.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      });
      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  get ganttTasks(): RoutineTask[] {
    return this.selectedStatusTasks;
  }

  tasksForLane(lane: TaskLane): RoutineTask[] {
    return this.taskBoard[lane].filter((task) => this.filteredTasks.includes(task));
  }

  laneProgress(lane: TaskLane): number {
    const tasks = this.tasksForLane(lane);
    if (!tasks.length) return 0;
    return Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length);
  }

  openComposer(mode?: ComposeMode): void {
    if (mode) this.composeMode = mode;
    this.composerVisible = true;
  }

  closeComposer(): void {
    this.composerVisible = false;
    this.resetDraft();
    this.batchRows = '';
  }

  setActivePage(page: 'planner' | 'reviews' | 'reports'): void {
    if (page === 'reviews' && !this.isSupervisor) {
      this.activePage = 'reports';
      return;
    }
    this.activePage = page;
  }

  setComposeMode(mode: ComposeMode): void {
    this.composeMode = mode;
  }

  setVisualMode(mode: PlannerVisualMode): void {
    this.visualMode = mode;
  }

  setTreeSort(field: TreeSortField): void {
    if (this.treeSortField === field) {
      this.treeSortDirection = this.treeSortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }
    this.treeSortField = field;
    this.treeSortDirection = field === 'updatedAt' ? 'desc' : 'asc';
  }

  isTreeSort(field: TreeSortField, direction?: 'asc' | 'desc'): boolean {
    return this.treeSortField === field && (!direction || this.treeSortDirection === direction);
  }

  toggleTreeTask(taskId: string): void {
    if (this.expandedTreeTaskIds.has(taskId)) {
      this.expandedTreeTaskIds.delete(taskId);
      return;
    }
    this.expandedTreeTaskIds.add(taskId);
  }

  isTreeTaskExpanded(taskId: string): boolean {
    return this.expandedTreeTaskIds.has(taskId);
  }

  stageLabelForTask(task: RoutineTask): string {
    return this.stageForTask(task).replace('_', ' ');
  }

  setTaskStageFromTree(task: RoutineTask, stage: TaskStage): void {
    task.lane = this.stageToLane(stage);
    if (stage === 'CLOSED') {
      task.progress = 100;
    } else if (stage === 'IN_PROGRESS' && task.progress < 35) {
      task.progress = 35;
    }
    this.syncTaskProgress(task);
    this.moveTaskForProgress(task);
    this.saveTask(task);
  }

  updateTaskFromTree(task: RoutineTask): void {
    const owner = this.findPersonByName(task.owner || this.currentActor());
    task.owner = owner?.name || task.owner || this.currentActor();
    task.ownerUserId = owner?.userId ?? task.ownerUserId ?? this.meUserId();
    const assignee = this.findPersonByName(task.assignee);
    task.assignee = assignee?.name || task.assignee || this.currentActor();
    task.assigneeUserId = assignee?.userId ?? task.assigneeUserId ?? null;
    task.timelineStart = this.normalizeIsoDate(task.timelineStart);
    task.timelineDue = this.normalizeIsoDate(task.timelineDue || task.timelineStart);
    task.progress = Math.max(0, Math.min(100, Number(task.progress || 0)));
    this.syncTaskProgress(task);
    this.moveTaskForProgress(task);
    this.saveTask(task);
  }

  deleteTask(task: RoutineTask): void {
    if (!/^\d+$/.test(task.id)) {
      for (const lane of this.lanes) {
        this.taskBoard[lane.key] = this.taskBoard[lane.key].filter((row) => row.id !== task.id);
      }
      if (this.selectedTask?.id === task.id) this.closeTaskDialog();
      this.loadReminderCards();
      this.toast('success', 'Task deleted', 'The task has been removed.');
      return;
    }
    this.collaborationService.deleteTaskRoutinePlan(Number(task.id)).subscribe({
      next: () => {
        for (const lane of this.lanes) {
          this.taskBoard[lane.key] = this.taskBoard[lane.key].filter((row) => row.id !== task.id);
        }
        if (this.selectedTask?.id === task.id) this.closeTaskDialog();
        this.loadReminderCards();
        this.toast('success', 'Task deleted', 'The task has been removed.');
      },
      error: (error) => this.toast('error', 'Delete failed', this.errorDetail(error, 'The task could not be deleted.')),
    });
  }

  private compareTreeTasks(left: RoutineTask, right: RoutineTask): number {
    let result = 0;
    if (this.treeSortField === 'title') {
      result = (left.title || '').localeCompare(right.title || '');
    } else if (this.treeSortField === 'owner') {
      result = (left.owner || '').localeCompare(right.owner || '');
    } else if (this.treeSortField === 'stage') {
      result = this.stageForTask(left).localeCompare(this.stageForTask(right));
    } else if (this.treeSortField === 'timeline') {
      result = this.normalizeIsoDate(left.timelineDue).localeCompare(this.normalizeIsoDate(right.timelineDue));
    } else if (this.treeSortField === 'progress') {
      result = Number(left.progress || 0) - Number(right.progress || 0);
    } else if (this.treeSortField === 'dependency') {
      result = (left.dependencyValue || '').localeCompare(right.dependencyValue || '');
    } else {
      result = this.normalizeDateTimeValue(left.updatedAt || left.createdAt || left.emailQueuedAt).localeCompare(
        this.normalizeDateTimeValue(right.updatedAt || right.createdAt || right.emailQueuedAt),
      );
    }
    return this.treeSortDirection === 'asc' ? result : -result;
  }

  canEditParentProgress(task: RoutineTask): boolean {
    return !task.workItems.length;
  }

  setStatusBucket(bucket: TaskStatusBucket): void {
    this.selectedStatusBucket = bucket;
  }

  openReminderDigest(): void {
    const reviewCount = this.tasks.filter((task) => task.sharedWithSupervisor && !task.supervisorApproved).length;
    const dueToday = this.tasks.filter((task) => task.timelineDue === this.todayIso() && task.lane !== 'DONE').length;
    const upcomingCount = this.tasks.filter((task) => this.daysBetween(this.todayIso(), task.timelineDue) <= 2 && task.lane !== 'DONE').length;
    this.showReminderDialog(
      this.isSupervisor ? 'Supervisor reminder centre' : 'Daily reminder centre',
      this.isSupervisor
        ? `${reviewCount} shared plan${reviewCount === 1 ? '' : 's'} need review, ${dueToday} task${dueToday === 1 ? '' : 's'} are due today, and ${upcomingCount} plan${upcomingCount === 1 ? '' : 's'} need close monitoring.`
        : `${dueToday} task${dueToday === 1 ? '' : 's'} are due today, ${reviewCount} item${reviewCount === 1 ? '' : 's'} are awaiting supervisor response, and ${upcomingCount} plan${upcomingCount === 1 ? '' : 's'} need follow-up.`,
    );
  }

  loadDemoData(): void {
    if (!this.people.length) {
      this.toast('warn', 'HR staff unavailable', 'Load staff options first before generating demo tasks.');
      return;
    }

    const requests = this.demoBlueprints().map((blueprint, index) => {
      const existing = this.findExistingDemoTask(blueprint.title);
      const demoTask = this.buildDemoTask(blueprint, index, existing || undefined);
      const payload = this.toApiPlan(demoTask);
      return existing && /^\d+$/.test(existing.id)
        ? this.collaborationService.updateTaskRoutinePlan(Number(existing.id), payload)
        : this.collaborationService.createTaskRoutinePlan(payload);
    });

    forkJoin(requests).subscribe({
      next: () => {
        this.projectOptions = [...new Set([...this.projectOptions, ...this.demoProjects])].sort((a, b) => a.localeCompare(b));
        this.persistMetadataConfig();
        this.loadHomeData();
        this.toast('success', 'Demo data loaded', 'Tasks and routines demo data has been refreshed from HR staff records.');
        setTimeout(() => this.openReminderDigest(), 250);
      },
      error: (error) => {
        this.toast('error', 'Demo load failed', this.errorDetail(error, 'The demo task data could not be generated.'));
      },
    });
  }

  deleteDemoData(): void {
    const demoTasks = this.tasks.filter((task) => task.tags.includes('demo-seed') && /^\d+$/.test(task.id));
    if (!demoTasks.length) {
      this.toast('info', 'No demo data', 'There are no persisted demo tasks to remove.');
      return;
    }

    forkJoin(demoTasks.map((task) => this.collaborationService.deleteTaskRoutinePlan(Number(task.id)))).subscribe({
      next: () => {
        this.loadHomeData();
        this.toast('success', 'Demo data removed', 'All seeded demo task plans have been deleted.');
      },
      error: (error) => {
        this.toast('error', 'Delete failed', this.errorDetail(error, 'The demo task data could not be deleted.'));
      },
    });
  }

  openTaskDialog(task: RoutineTask): void {
    this.selectedTask = task;
    this.selectedTaskSubTaskDraft = this.emptyDraftWorkItem(task.assignee || this.currentActor());
    this.taskDetailViewMode = 'overview';
    this.taskDialogVisible = true;
  }

  openTaskHistory(task: RoutineTask): void {
    this.openTaskDialog(task);
    this.taskDetailViewMode = 'activity';
  }

  closeTaskDialog(): void {
    this.taskDialogVisible = false;
    this.selectedTask = null;
    this.selectedTaskSubTaskDraft = null;
    this.taskDetailViewMode = 'overview';
    this.revokeAttachmentUrls(this.pendingUpdateAttachments);
    this.pendingUpdateAttachments = [];
    this.revokeAttachmentUrls(this.pendingReviewAttachments);
    this.pendingReviewAttachments = [];
  }

  closeReminderDialog(): void {
    this.reminderDialogVisible = false;
  }

  createTask(): void {
    if (this.composeMode === 'batch') {
      this.createBatchTasks();
      return;
    }

    const title = this.draft.title.trim();
    if (!title) {
      this.toast('warn', 'Task title required', 'Enter a task title before saving.');
      return;
    }

    const task = this.buildTaskFromDraft(title);
    this.syncTaskProgress(task);
    this.collaborationService.createTaskRoutinePlan(this.toApiPlan(task)).subscribe({
      next: () => {
        this.closeComposer();
        this.loadHomeData();
        this.toast('success', 'Task saved', 'The task plan has been saved successfully.');
      },
      error: (error) => {
        this.toast('error', 'Save failed', this.errorDetail(error, 'The task note could not be saved.'));
      },
    });
  }

  addDraftWorkItem(): void {
    this.draft.workItems.push(this.emptyDraftWorkItem(this.draft.assignee || this.currentActor()));
  }

  removeDraftWorkItem(index: number): void {
    this.draft.workItems.splice(index, 1);
  }

  onAttachmentSelected(event: Event): void {
    this.collectAttachments(event, this.pendingAttachments, true);
  }

  onReviewAttachmentSelected(event: Event): void {
    this.collectAttachments(event, this.pendingReviewAttachments, true);
  }

  onUpdateAttachmentSelected(event: Event): void {
    this.collectAttachments(event, this.pendingUpdateAttachments, true);
  }

  onUpdateEditorPaste(event: ClipboardEvent): void {
    this.collectPastedAttachments(event, this.pendingUpdateAttachments);
  }

  onReviewEditorPaste(event: ClipboardEvent): void {
    this.collectPastedAttachments(event, this.pendingReviewAttachments);
  }

  removeReviewAttachment(attachment: TaskAttachment): void {
    this.removeAttachmentFromCollection(attachment, 'pendingReviewAttachments');
  }

  removeUpdateAttachment(attachment: TaskAttachment): void {
    this.removeAttachmentFromCollection(attachment, 'pendingUpdateAttachments');
  }

  removePendingAttachment(attachment: TaskAttachment): void {
    this.removeAttachmentFromCollection(attachment, 'pendingAttachments');
  }

  drop(event: CdkDragDrop<RoutineTask[]>, lane: TaskLane): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }

    this.taskBoard[lane].forEach((task) => {
      task.lane = lane;
      if (lane === 'TODAY' && task.progress < 18) task.progress = 18;
      if (lane === 'IN_PROGRESS' && task.progress < 45) task.progress = 45;
      if (lane === 'REVIEW' && task.progress < 76) task.progress = 76;
      if (lane === 'DONE') task.progress = 100;
    });
    this.taskBoard[lane].forEach((task) => this.saveTask(task));
  }

  addDailyUpdate(task: RoutineTask): void {
    const note = (this.updateDrafts[task.id] || '').trim();
    if (!note) return;
    this.syncTaskProgress(task);
    const currentProgress = task.workItems.length ? this.taskRollupPercent(task) : Number(task.progress || 0);
    const authorUserId = this.meUserId();
    const updateAttachments = this.pendingUpdateAttachments.map((attachment) => ({ ...attachment }));
    const updateId = this.makeId('upd');
    task.progress = currentProgress;
    task.updates.unshift({
      id: updateId,
      authorUserId,
      author: this.currentActor(),
      note,
      progress: currentProgress,
      createdAt: new Date().toISOString(),
      attachments: updateAttachments,
    });
    this.moveTaskForProgress(task);
    this.updateDrafts[task.id] = '';
    this.revokeAttachmentUrls(this.pendingUpdateAttachments);
    this.pendingUpdateAttachments = [];
    if (task.assignee !== this.currentActor() || this.isSupervisor) {
      this.headerStateService.pushNotification({
        title: `${this.currentActor()} added a task update`,
        body: `${task.title}: ${this.stripHtml(note).slice(0, 120) || 'A new update was added.'}`,
        category: 'module',
        route: `/admin/dashboard/tasks-routines/${this.currentUuid}`,
        contextLabel: 'Tasks and Routines',
        taskRoutineId: task.id,
        taskUpdateId: updateId,
      });
    }
    this.saveTask(task);
  }

  addDetailedReview(task: RoutineTask, decision: ReviewDecision): void {
    this.applyReview(task, decision);
  }

  nudgeProgress(task: RoutineTask, step: number): void {
    if (task.workItems.length) {
      const distributed = Math.max(0, Math.min(100, this.taskRollupPercent(task) + step));
      task.workItems = task.workItems.map((item) => ({
        ...item,
        progress: item.status === 'DONE' ? 100 : distributed,
      }));
      this.syncTaskProgress(task);
    } else {
      task.progress = Math.max(0, Math.min(100, Number(task.progress || 0) + step));
    }
    this.moveTaskForProgress(task);
    this.saveTask(task);
  }

  shareWithSupervisor(task: RoutineTask): void {
    task.sharedWithSupervisor = true;
    task.lane = 'REVIEW';
    task.emailQueuedAt = new Date().toISOString();
    const supervisor = this.supervisorName();
    this.headerStateService.pushNotification({
      title: `${task.assignee} shared a task plan`,
      body: `${task.title} was sent to ${supervisor} for review.`,
      category: 'module',
      route: `/admin/dashboard/tasks-routines/${this.currentUuid}`,
      contextLabel: 'Tasks and Routines',
    });
    this.saveTask(task);
  }

  applyReview(task: RoutineTask, decision: ReviewDecision): void {
    const note = (this.supervisorNotes[task.id] || '').trim();
    const reviewAttachments = this.pendingReviewAttachments.map((attachment) => ({ ...attachment }));
    const reviewId = this.makeId('rev');
    task.reviews.unshift({
      id: reviewId,
      reviewerUserId: this.meUserId(),
      reviewer: this.currentActor(),
      decision,
      note: note || this.defaultReviewMessage(decision),
      createdAt: new Date().toISOString(),
      attachments: reviewAttachments,
    });
    task.supervisorApproved = decision === 'APPROVED';
    task.sharedWithSupervisor = true;
    task.lane = decision === 'APPROVED' ? 'IN_PROGRESS' : 'REVIEW';
    this.supervisorNotes[task.id] = '';
    this.revokeAttachmentUrls(this.pendingReviewAttachments);
    this.pendingReviewAttachments = [];
    this.headerStateService.pushNotification({
      title: `Review update for ${task.assignee}`,
      body: `${task.title} was ${decision.toLowerCase().replace('_', ' ')} by ${this.currentActor()}.`,
      category: 'module',
      route: `/admin/dashboard/tasks-routines/${this.currentUuid}`,
      contextLabel: 'Supervisor review',
      taskRoutineId: task.id,
      taskReviewId: reviewId,
    });
    this.saveTask(task);
  }

  rewriteUpdateDraft(task: RoutineTask): void {
    const draft = (this.updateDrafts[task.id] || '').trim();
    if (!draft) {
      this.toast('warn', 'Nothing to rewrite', 'Enter an update before using AI rewrite.');
      return;
    }
    this.collaborationService.aiRewrite(this.stripHtml(draft)).subscribe({
      next: (res) => {
        this.updateDrafts[task.id] = res.body || res.rewrittenText || res.content || draft;
        this.toast('success', 'Update polished', 'The task update has been rewritten with clearer semantics.');
      },
      error: (error) => this.toast('error', 'Rewrite failed', this.errorDetail(error, 'AI rewrite could not update the task note.')),
    });
  }

  rewriteSupervisorNote(task: RoutineTask): void {
    const draft = (this.supervisorNotes[task.id] || '').trim();
    if (!draft) {
      this.toast('warn', 'Nothing to rewrite', 'Enter supervisor feedback before using AI rewrite.');
      return;
    }
    this.collaborationService.aiRewrite(this.stripHtml(draft)).subscribe({
      next: (res) => {
        this.supervisorNotes[task.id] = res.body || res.rewrittenText || res.content || draft;
        this.toast('success', 'Review polished', 'The supervisor note has been rewritten with clearer semantics.');
      },
      error: (error) => this.toast('error', 'Rewrite failed', this.errorDetail(error, 'AI rewrite could not update the supervisor feedback.')),
    });
  }

  updateWorkItem(task: RoutineTask, item: TaskWorkItem): void {
    const owner = this.findPersonByName(item.owner || task.assignee || this.currentActor());
    item.owner = owner?.name || item.owner || task.assignee || this.currentActor();
    item.ownerUserId = owner?.userId ?? item.ownerUserId ?? null;
    item.timelineStart = this.normalizeIsoDate(item.timelineStart || task.timelineStart || this.todayIso());
    item.timelineDue = this.normalizeIsoDate(item.timelineDue || item.timelineStart || task.timelineDue || this.todayIso());
    item.progress = this.statusProgress(item.status, item.progress);
    this.syncTaskProgress(task);
    this.moveTaskForProgress(task);
    this.saveTask(task);
  }

  addSubTaskToSelectedTask(task: RoutineTask): void {
    const draft = this.selectedTaskSubTaskDraft;
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) {
      this.toast('warn', 'Sub task description required', 'Enter a sub task description before saving.');
      return;
    }

    const owner = this.findPersonByName(draft.owner || task.assignee || this.currentActor());
    task.workItems.push({
      id: this.makeId('wi'),
      title,
      ownerUserId: owner?.userId ?? null,
      owner: owner?.name || draft.owner || task.assignee || this.currentActor(),
      timelineStart: this.normalizeIsoDate(draft.timelineStart || task.timelineStart || this.todayIso()),
      timelineDue: this.normalizeIsoDate(draft.timelineDue || draft.timelineStart || task.timelineDue || this.todayIso()),
      dependency: draft.dependency.trim(),
      status: draft.status,
      progress: this.statusProgress(draft.status, draft.progress),
    });
    this.syncTaskProgress(task);
    this.moveTaskForProgress(task);
    this.selectedTaskSubTaskDraft = this.emptyDraftWorkItem(task.assignee || this.currentActor());
    this.saveTask(task);
    this.toast('success', 'Sub task added', 'The sub task has been added to the task.');
  }

  deleteSubTask(task: RoutineTask, item: TaskWorkItem): void {
    task.workItems = task.workItems.filter((row) => row.id !== item.id);
    this.syncTaskProgress(task);
    this.moveTaskForProgress(task);
    this.saveTask(task);
    this.toast('success', 'Sub task deleted', 'The sub task has been removed.');
  }

  taskCompletionLabel(task: RoutineTask): string {
    if (!task.workItems.length) return 'No sub tasks added yet';
    const completed = task.workItems.filter((item) => item.status === 'DONE').length;
    return `${completed}/${task.workItems.length} sub tasks closed`;
  }

  downloadTaskReminder(task: RoutineTask): void {
    this.downloadIcs(
      task.title,
      task.description,
      task.timelineStart,
      task.timelineDue,
    );
  }

  downloadSubTaskReminder(task: RoutineTask, item: TaskWorkItem): void {
    this.downloadIcs(
      `${task.title} - ${item.title}`,
      `${item.owner} | ${item.dependency || 'No dependency'}`,
      item.timelineStart,
      item.timelineDue,
    );
  }

  findTaskById(taskId: string): RoutineTask | undefined {
    return this.tasks.find((task) => task.id === taskId);
  }

  taskRollupPercent(task: RoutineTask): number {
    if (!task.workItems.length) return task.progress;
    return Math.round(task.workItems.reduce((sum, item) => sum + item.progress, 0) / task.workItems.length);
  }

  taskBlockedCount(task: RoutineTask): number {
    return task.workItems.filter((item) => item.status === 'BLOCKED').length;
  }

  taskOpenCount(task: RoutineTask): number {
    return task.workItems.filter((item) => item.status !== 'DONE').length;
  }

  taskStatusTone(task: RoutineTask): string {
    if (task.lane === 'DONE') return 'is-done';
    if (task.lane === 'REVIEW') return 'is-review';
    if (task.lane === 'IN_PROGRESS') return 'is-progress';
    return 'is-open';
  }

  workItemTone(status: WorkItemStatus): string {
    return `work-${status.toLowerCase()}`;
  }

  updateAuthorLabel(update: TaskUpdate): string {
    return this.cleanDisplayName(update.author) || this.personNameByUserId(update.authorUserId) || 'Staff';
  }

  reviewReviewerLabel(review: TaskReview): string {
    return this.cleanDisplayName(review.reviewer) || this.personNameByUserId(review.reviewerUserId) || 'Supervisor';
  }

  latestTaskUpdate(task: RoutineTask): TaskUpdate | null {
    return task.updates?.length ? task.updates[0] : null;
  }

  latestTaskReview(task: RoutineTask): TaskReview | null {
    return task.reviews?.length ? task.reviews[0] : null;
  }

  reviewDecisionStamp(decision: ReviewDecision): string {
    if (decision === 'APPROVED') return 'Approved';
    if (decision === 'CHANGES') return 'Changes Requested';
    return 'Noted';
  }

  supervisorEmailPreview(task: RoutineTask): string {
    const supervisor = this.supervisorName();
    return `To: ${supervisor} | Subject: Review request - ${task.title} | ${task.assignee} shared ${task.workItems.length || 1} tracked item(s) for review.`;
  }

  ganttColumn(startIso: string, dueIso: string): string {
    const labels = this.ganttDayLabels;
    const startIndex = Math.max(
      1,
      labels.findIndex((day) => day.iso === this.clampIsoToRange(startIso)) + 1,
    );
    const endIndex = Math.max(
      startIndex,
      labels.findIndex((day) => day.iso === this.clampIsoToRange(dueIso)) + 1,
    );
    return `${startIndex} / span ${endIndex - startIndex + 1}`;
  }

  ganttDependencyLine(task: RoutineTask, item: TaskWorkItem): { left: number; width: number } | null {
    if (!item.dependency) return null;
    const source = task.workItems.find(
      (candidate) => candidate.id !== item.id && candidate.title.trim().toLowerCase() === item.dependency.trim().toLowerCase(),
    );
    if (!source) return null;
    const labels = this.ganttDayLabels;
    const total = Math.max(1, labels.length);
    const startIndex = this.ganttIndexForIso(item.timelineStart, labels, 'start');
    const sourceEndIndex = this.ganttIndexForIso(source.timelineDue, labels, 'end');
    if (startIndex <= sourceEndIndex) {
      return null;
    }
    const left = (sourceEndIndex / total) * 100;
    const width = Math.max(((startIndex - sourceEndIndex) / total) * 100, 2);
    return { left, width };
  }

  trackTask(index: number, task: RoutineTask): string {
    return task.id;
  }

  trackWorkItem(index: number, item: TaskWorkItem | DraftWorkItem): string {
    return 'id' in item && item.id ? item.id : `${item.title}-${index}`;
  }

  dropListId(lane: TaskLane): string {
    return `tasks-routines-${lane.toLowerCase()}`;
  }

  toneClass(review: TaskReview): string {
    return `review-${review.decision.toLowerCase()}`;
  }

  attachmentLooksLikeImage(attachment: TaskAttachment): boolean {
    return attachment.type.startsWith('image/');
  }

  private loadHomeData(): void {
    this.isLoading = true;
    this.collaborationService.getTaskRoutineHome(this.searchTerm, this.selectedStatusBucket, 1, 50).subscribe({
      next: (home) => {
        this.staffOptions = home.staffOptions || [];
        this.people = this.staffOptions.map((person) => ({
          name: person.fullname || [person.firstName, person.lastName].filter(Boolean).join(' ').trim(),
          role: person.role || person.department || 'Staff',
          userId: person.userId ?? null,
        })).filter((person) => person.name);
        if (!this.people.length) {
          const sessionUser = this.sessionProfileName();
          if (sessionUser) {
            this.people = [{ name: sessionUser, role: String(this.userInfo?.role || 'Staff') }];
          }
        }
        this.taskBoard = { BACKLOG: [], TODAY: [], IN_PROGRESS: [], REVIEW: [], DONE: [] };
        (home.plans?.content || []).map((plan) => this.fromApiPlan(plan)).forEach((task) => this.taskBoard[task.lane].push(task));
        this.mergeProjectOptions();
        if (this.selectedReviewOwner !== 'All' && !this.reviewAssignees.includes(this.selectedReviewOwner)) {
          this.selectedReviewOwner = 'All';
        }
        this.draft = this.emptyDraft();
        this.loadReminderCards();
        this.notifyAtLogin();
        this.applyNotificationTargetIfPresent();
        this.isLoading = false;
      },
      error: (error) => {
        this.people = [];
        this.taskBoard = { BACKLOG: [], TODAY: [], IN_PROGRESS: [], REVIEW: [], DONE: [] };
        this.isLoading = false;
        this.toast('error', 'Tasks unavailable', this.errorDetail(error, 'Tasks and routines could not be loaded.'));
      },
    });
  }

  private saveTask(task: RoutineTask): void {
    const payload = this.toApiPlan(task);
    const request$ = task.id.startsWith('task-')
      ? this.collaborationService.createTaskRoutinePlan(payload)
      : this.collaborationService.updateTaskRoutinePlan(Number(task.id), payload);
    request$.subscribe({
      next: (saved) => this.replaceTaskWithApi(saved),
      error: (error) => this.toast('error', 'Update failed', this.errorDetail(error, 'The task update could not be saved.')),
    });
  }

  private saveTaskAndRefresh(task: RoutineTask): void {
    const payload = this.toApiPlan(task);
    const request$ = task.id.startsWith('task-')
      ? this.collaborationService.createTaskRoutinePlan(payload)
      : this.collaborationService.updateTaskRoutinePlan(Number(task.id), payload);
    request$.subscribe({
      next: () => this.loadHomeData(),
      error: (error) => this.toast('error', 'Refresh failed', this.errorDetail(error, 'The task could not be refreshed from the server.')),
    });
  }

  private createBatchTasks(): void {
    const rows = this.batchRows
      .split('\n')
      .map((row) => row.trim())
      .filter(Boolean);
    if (!rows.length) return;
    const payloads = rows
      .map((row) => {
        const [title, assignee, dueDate, projectName, dependencyValue] = row.split('|').map((item) => item.trim());
        if (!title) return null;
        const assigneePerson = this.findPersonByName(assignee || this.currentActor());
        return {
          title,
          description: projectName ? `Batch-created workplan linked to ${projectName}.` : 'Batch-created daily task entry.',
          ownerUserId: Number(this.meUserId() || assigneePerson?.userId || 0) || null,
          assigneeUserId: assigneePerson?.userId ?? this.meUserId(),
          supervisorUserId: this.supervisorUserId(),
          lane: 'BACKLOG' as TaskLane,
          progress: 8,
          timelineStart: this.todayIso(),
          timelineDue: dueDate || this.todayIso(),
          routineType: 'Workplan' as RoutineType,
          priority: 'Medium' as TaskPriority,
          dependencyType: (dependencyValue ? 'PERSON' : 'NONE') as DependencyType,
          dependencyValue: dependencyValue || '',
          projectName: projectName || '',
          tags: ['batch'],
          attachments: [] as TaskAttachment[],
          updates: [] as TaskUpdate[],
          reviews: [] as TaskReview[],
          workItems: [] as TaskWorkItem[],
          sharedWithSupervisor: false,
          supervisorApproved: false,
          linkedToProductivity: true,
          linkedToPayroll: false,
        } as RoutineTask;
      })
      .filter((task): task is RoutineTask => !!task)
      .map((task) => this.toApiPlan(task));

    if (!payloads.length) return;
    forkJoin(payloads.map((payload) => this.collaborationService.createTaskRoutinePlan(payload))).subscribe({
      next: () => {
        this.batchRows = '';
        this.closeComposer();
        this.loadHomeData();
        this.toast('success', 'Batch saved', 'Batch task rows have been persisted.');
      },
      error: (error) => {
        this.toast('error', 'Batch save failed', this.errorDetail(error, 'One or more batch task rows could not be saved.'));
      },
    });
  }

  private buildTaskFromDraft(title: string): RoutineTask {
    const assignee = this.findPersonByName(this.draft.assignee || this.currentActor());
    return this.normalizeTask({
      id: this.makeId('task'),
      title,
      description: this.draft.description.trim() || 'Task created from the tasks and routines planner.',
      ownerUserId: this.meUserId(),
      assigneeUserId: assignee?.userId ?? this.meUserId(),
      supervisorUserId: this.supervisorUserId(),
      lane: this.stageToLane(this.draft.stage),
      progress: 10,
      owner: this.currentActor(),
      assignee: assignee?.name || this.draft.assignee || this.currentActor(),
      timelineStart: this.draft.timelineStart || this.todayIso(),
      timelineDue: this.draft.timelineDue || this.todayIso(),
      routineType: this.draft.routineType,
      priority: this.draft.priority,
      dependencyType: this.draft.dependencyType,
      dependencyValue: this.draft.dependencyType === 'NONE' ? '' : this.draft.dependencyValue,
      projectName: this.draft.projectName,
      tags: this.draft.tags
        .split(',')
        .map((tag: string) => tag.trim())
        .filter(Boolean),
      attachments: this.pendingAttachments.map((attachment) => ({ ...attachment })),
      updates: [],
      reviews: [],
      workItems: this.draft.workItems
        .filter((item) => item.title.trim())
        .map((item) => ({
          id: this.makeId('wi'),
          title: item.title.trim(),
          ownerUserId: this.findPersonByName(item.owner || this.draft.assignee || this.currentActor())?.userId ?? null,
          owner: item.owner || assignee?.name || this.draft.assignee || this.currentActor(),
          timelineStart: item.timelineStart || this.draft.timelineStart || this.todayIso(),
          timelineDue: item.timelineDue || this.draft.timelineDue || this.todayIso(),
          dependency: item.dependency.trim(),
          status: item.status,
          progress: this.statusProgress(item.status, item.progress),
        })),
      sharedWithSupervisor: false,
      supervisorApproved: false,
      linkedToProductivity: true,
      linkedToPayroll: false,
      productivityWeight: 1,
    });
  }

  private fromApiPlan(plan: TaskRoutinePlan): RoutineTask {
    return this.normalizeTask({
      id: String(plan.id || this.makeId('task')),
      title: plan.title,
      description: plan.description || '',
      ownerUserId: plan.ownerUserId ?? plan.owner?.userId ?? plan.owner?.id ?? null,
      assigneeUserId: plan.assigneeUserId ?? plan.assignee?.userId ?? plan.assignee?.id ?? null,
      supervisorUserId: plan.supervisorUserId ?? plan.supervisor?.userId ?? plan.supervisor?.id ?? null,
      lane: plan.lane || 'BACKLOG',
      progress: plan.progress || 0,
      owner: this.displayNameFromUser(plan.owner, plan.ownerUserId),
      assignee: this.displayNameFromUser(plan.assignee, plan.assigneeUserId),
      timelineStart: this.normalizeIsoDate(plan.timelineStart || this.todayIso()),
      timelineDue: this.normalizeIsoDate(plan.timelineDue || plan.timelineStart || this.todayIso()),
      routineType: plan.routineType || 'Daily',
      priority: plan.priority || 'Medium',
      dependencyType: plan.dependencyType || 'NONE',
      dependencyValue: plan.dependencyValue || '',
      projectName: plan.projectName || '',
      tags: plan.tags || [],
      attachments: (plan.attachments || []).map((attachment) => this.mapAttachmentFromApi(attachment)),
      updates: (plan.updates || []).map((update) => ({
        id: update.id || this.makeId('upd'),
        authorUserId: update.authorUserId ?? null,
        author: this.cleanDisplayName(update.authorName) || this.personNameByUserId(update.authorUserId) || 'Staff',
        note: update.note,
        progress: Number(update.progress || 0),
        createdAt: this.normalizeDateTimeValue(update.createdAt || new Date().toISOString()),
        attachments: (update.attachments || []).map((attachment) => this.mapAttachmentFromApi(attachment)),
      })),
      reviews: (plan.reviews || []).map((review) => ({
        id: review.id || this.makeId('rev'),
        reviewerUserId: review.reviewerUserId ?? null,
        reviewer: this.cleanDisplayName(review.reviewerName) || this.personNameByUserId(review.reviewerUserId) || 'Reviewer',
        decision: review.decision,
        note: review.note,
        createdAt: this.normalizeDateTimeValue(review.createdAt || new Date().toISOString()),
        emailPreview: review.emailPreview,
        attachments: (review.attachments || []).map((attachment) => this.mapAttachmentFromApi(attachment)),
      })),
      workItems: (plan.workItems || []).map((item) => ({
        id: item.id || this.makeId('wi'),
        title: item.title || 'Untitled sub task',
        ownerUserId: item.ownerUserId ?? null,
        owner: item.ownerName || this.personNameByUserId(item.ownerUserId) || this.displayNameFromUser(plan.assignee, plan.assigneeUserId) || this.currentActor(),
        timelineStart: this.normalizeIsoDate(item.timelineStart || plan.timelineStart || this.todayIso()),
        timelineDue: this.normalizeIsoDate(item.timelineDue || item.timelineStart || plan.timelineDue || this.todayIso()),
        dependency: item.dependency || '',
        status: item.status,
        progress: this.statusProgress(item.status, Number(item.progress || 0)),
      })),
      sharedWithSupervisor: !!plan.sharedWithSupervisor,
      supervisorApproved: !!plan.supervisorApproved,
      linkedToProductivity: !!plan.linkedToProductivity,
      linkedToPayroll: !!plan.linkedToPayroll,
      payrollMonth: plan.payrollMonth || '',
      productivityWeight: Number(plan.productivityWeight || 0),
      emailQueuedAt: this.normalizeDateTimeValue(plan.emailQueuedAt),
      createdAt: this.normalizeDateTimeValue(plan.createdAt),
      updatedAt: this.normalizeDateTimeValue(plan.updatedAt),
    });
  }

  private toApiPlan(task: RoutineTask): TaskRoutinePlan {
    return {
      id: /^\d+$/.test(task.id) ? Number(task.id) : undefined,
      ownerUserId: task.ownerUserId ?? this.findPersonByName(task.owner)?.userId ?? this.meUserId(),
      assigneeUserId: task.assigneeUserId ?? this.findPersonByName(task.assignee)?.userId ?? this.meUserId(),
      supervisorUserId: task.supervisorUserId ?? this.supervisorUserId(),
      title: task.title,
      description: task.description,
      lane: task.lane,
      status: this.taskStatusForLane(task.lane),
      progress: taskRollup(task),
      timelineStart: task.timelineStart,
      timelineDue: task.timelineDue,
      routineType: task.routineType,
      priority: task.priority,
      dependencyType: task.dependencyType,
      dependencyValue: task.dependencyValue,
      projectName: task.projectName,
      tags: task.tags,
      attachments: task.attachments.map((attachment) => this.mapAttachmentToApi(attachment)),
      workItems: task.workItems.map((item) => ({
        id: item.id,
        title: item.title,
        ownerUserId: item.ownerUserId ?? this.findPersonByName(item.owner)?.userId ?? null,
        ownerName: item.owner,
        timelineStart: item.timelineStart,
        timelineDue: item.timelineDue,
        dependency: item.dependency,
        status: item.status,
        progress: this.statusProgress(item.status, item.progress),
      })),
      updates: task.updates.map((update) => ({
        id: update.id,
        authorUserId: update.authorUserId ?? this.findPersonByName(update.author)?.userId ?? this.meUserId(),
        authorName: this.updateAuthorLabel(update),
        note: update.note,
        progress: update.progress,
        createdAt: update.createdAt,
        attachments: (update.attachments || []).map((attachment) => this.mapAttachmentToApi(attachment)),
      })),
      reviews: task.reviews.map((review) => ({
        id: review.id,
        reviewerUserId: review.reviewerUserId ?? this.findPersonByName(review.reviewer)?.userId ?? this.meUserId(),
        reviewerName: this.reviewReviewerLabel(review),
        decision: review.decision,
        note: review.note,
        createdAt: review.createdAt,
        emailPreview: review.emailPreview || this.supervisorEmailPreview(task),
        attachments: (review.attachments || []).map((attachment) => this.mapAttachmentToApi(attachment)),
      })),
      sharedWithSupervisor: task.sharedWithSupervisor,
      supervisorApproved: task.supervisorApproved,
      linkedToProductivity: task.linkedToProductivity ?? true,
      linkedToPayroll: task.linkedToPayroll ?? false,
      payrollMonth: task.payrollMonth,
      productivityWeight: task.productivityWeight ?? 1,
    };
  }

  private replaceTaskWithApi(plan: TaskRoutinePlan): void {
    const mapped = this.fromApiPlan(plan);
    for (const lane of this.lanes) {
      const rows = this.taskBoard[lane.key];
      const index = rows.findIndex((task) => task.id === mapped.id || (!!plan.id && task.id === String(plan.id)));
      if (index >= 0) {
        rows.splice(index, 1);
      }
    }
    this.taskBoard[mapped.lane].unshift(mapped);
    if (this.selectedTask?.id === mapped.id || this.selectedTask?.id === String(plan.id)) {
      this.selectedTask = mapped;
    }
    this.loadReminderCards();
  }

  private loadReminderCards(): void {
    this.reminders = [];
    const dueToday = this.tasks.filter((task) => task.timelineDue === this.todayIso() && task.lane !== 'DONE');
    dueToday.slice(0, 3).forEach((task) => {
      this.reminders.push({
        title: task.title,
        caption: `Due today for ${task.assignee}`,
        tone: 'due',
        taskId: task.id,
      });
    });

    const reviewTasks = this.tasks.filter((task) => task.sharedWithSupervisor && !task.supervisorApproved);
    reviewTasks.slice(0, 2).forEach((task) => {
      this.reminders.push({
        title: task.title,
        caption: `Awaiting supervisor action for ${task.assignee}`,
        tone: 'review',
        taskId: task.id,
      });
    });

    if (!this.reminders.length) {
      this.reminders.push({
        title: 'Planner is clear',
        caption: 'No urgent blockers are currently surfacing on the board.',
        tone: 'routine',
      });
    }
  }

  private notifyAtLogin(): void {
    const key = `optimax_tasks_routines_reminder_${this.todayIso()}_${this.currentActor()}`;
    if (sessionStorage.getItem(key)) return;
    const reviewCount = this.tasks.filter((task) => task.sharedWithSupervisor && !task.supervisorApproved).length;
    const dueToday = this.tasks.filter((task) => task.timelineDue === this.todayIso() && task.lane !== 'DONE').length;
    if (reviewCount || dueToday) {
      this.showReminderDialog(
        this.isSupervisor ? 'Supervisor review reminders' : 'Today’s routine reminders',
        this.isSupervisor
          ? `${reviewCount} shared plan${reviewCount === 1 ? '' : 's'} need review and ${dueToday} task${dueToday === 1 ? '' : 's'} are due today.`
          : `${dueToday} task${dueToday === 1 ? '' : 's'} are due today and ${reviewCount} shared item${reviewCount === 1 ? '' : 's'} are in review.`,
      );
      this.headerStateService.pushNotification({
        title: this.isSupervisor ? 'Supervisor review reminders' : 'Today’s routine reminders',
        body: this.isSupervisor
          ? `${reviewCount} shared plan${reviewCount === 1 ? '' : 's'} need review and ${dueToday} task${dueToday === 1 ? '' : 's'} are due today.`
          : `${dueToday} task${dueToday === 1 ? '' : 's'} are due today and ${reviewCount} shared item${reviewCount === 1 ? '' : 's'} are in review.`,
        category: 'module',
        route: `/admin/dashboard/tasks-routines/${this.currentUuid}`,
        contextLabel: 'Tasks and Routines',
      });
      sessionStorage.setItem(key, '1');
    }
  }

  // damilola worked on this: use live HR staff names to seed enterprise demo plans instead of hardcoded sample users.
  private demoBlueprints(): DemoTaskBlueprint[] {
    return [
      {
        title: 'Continue work on IAAS for OptimaXCloud',
        description: 'Coordinate UI, backend integration, and vendor subscription sub tasks into one supervised delivery track.',
        routineType: 'Workplan',
        priority: 'High',
        projectName: 'Siemens Delivery Office',
        lane: 'IN_PROGRESS',
        progress: 48,
        dueInDays: 0,
        sharedWithSupervisor: true,
        tags: ['demo-seed', 'cloud', 'iaas'],
        workItems: [
          { title: 'Develop UI', status: 'IN_PROGRESS', startOffset: -2, dueOffset: 1, progress: 45 },
          { title: 'Link backend to UI', dependency: 'Develop UI', status: 'OPEN', startOffset: 1, dueOffset: 4, progress: 10 },
          { title: 'Subscribe to hyperscaler vendors', dependency: 'Link backend to UI', status: 'BLOCKED', startOffset: 3, dueOffset: 6, progress: 0 },
        ],
      },
      {
        title: 'Review telecom partner onboarding checklist',
        description: 'Daily routine to clear outstanding onboarding, compliance, and dependency tasks for network partners.',
        routineType: 'Daily',
        priority: 'Medium',
        projectName: 'Glo Nigeria Network PMO',
        lane: 'TODAY',
        progress: 24,
        dueInDays: 0,
        tags: ['demo-seed', 'daily', 'partner'],
        workItems: [
          { title: 'Validate onboarding dossier', status: 'DONE', startOffset: -1, dueOffset: 0, progress: 100 },
          { title: 'Confirm dependency on legal clearance', status: 'IN_PROGRESS', startOffset: 0, dueOffset: 1, progress: 35 },
        ],
      },
      {
        title: 'Track digital experience stabilisation sub tasks',
        description: 'Supervisor-facing coordination board for mobile touchpoints, support flows, and rollout sequencing.',
        routineType: 'Routine',
        priority: 'High',
        projectName: 'MTN Nigeria Experience Hub',
        lane: 'REVIEW',
        progress: 76,
        dueInDays: 1,
        sharedWithSupervisor: true,
        tags: ['demo-seed', 'review', 'experience'],
        workItems: [
          { title: 'Complete support journey fixes', status: 'DONE', startOffset: -4, dueOffset: -1, progress: 100 },
          { title: 'Validate release dependencies', dependency: 'Complete support journey fixes', status: 'IN_PROGRESS', startOffset: -1, dueOffset: 1, progress: 70 },
          { title: 'Prepare rollout report', dependency: 'Validate release dependencies', status: 'OPEN', startOffset: 1, dueOffset: 2, progress: 10 },
        ],
      },
      {
        title: 'Close statutory filing readiness tasks',
        description: 'Bring filing sub tasks into one plan with compliance milestones, reminders, and supervisor checkpoints.',
        routineType: 'Workplan',
        priority: 'Medium',
        projectName: 'CAC Digital Filing Programme',
        lane: 'BACKLOG',
        progress: 12,
        dueInDays: 4,
        tags: ['demo-seed', 'compliance', 'filing'],
        workItems: [
          { title: 'Compile filing pack', status: 'OPEN', startOffset: 0, dueOffset: 2, progress: 15 },
          { title: 'Confirm payment evidence', dependency: 'Compile filing pack', status: 'OPEN', startOffset: 2, dueOffset: 3, progress: 0 },
          { title: 'Submit final filing', dependency: 'Confirm payment evidence', status: 'OPEN', startOffset: 3, dueOffset: 4, progress: 0 },
        ],
      },
    ];
  }

  private buildDemoTask(blueprint: DemoTaskBlueprint, index: number, existing?: RoutineTask): RoutineTask {
    const assignee = this.people[index % this.people.length];
    const owner = this.people[(index + 1) % this.people.length] || assignee;
    const supervisor = this.demoSupervisor(assignee?.userId ?? null, owner?.userId ?? null);
    const startIso = this.plusDaysIso(Math.min(...blueprint.workItems.map((item) => item.startOffset), 0));
    const dueIso = this.plusDaysIso(blueprint.dueInDays);
    return this.normalizeTask({
      id: existing?.id || this.makeId('task'),
      title: blueprint.title,
      description: blueprint.description,
      ownerUserId: owner?.userId ?? this.meUserId(),
      assigneeUserId: assignee?.userId ?? this.meUserId(),
      supervisorUserId: supervisor?.userId ?? this.supervisorUserId(),
      lane: blueprint.lane,
      progress: blueprint.progress,
      owner: owner?.name || assignee?.name || this.currentActor(),
      assignee: assignee?.name || this.currentActor(),
      timelineStart: startIso,
      timelineDue: dueIso,
      routineType: blueprint.routineType,
      priority: blueprint.priority,
      dependencyType: 'PROJECT',
      dependencyValue: blueprint.projectName,
      projectName: blueprint.projectName,
      tags: blueprint.tags,
      attachments: [],
      updates: [
        {
          id: existing?.updates?.[0]?.id || this.makeId('upd'),
          authorUserId: assignee?.userId ?? this.meUserId(),
          author: assignee?.name || this.currentActor(),
          note: `${blueprint.title} is progressing with cross-team follow-up and monitored milestones.`,
          progress: blueprint.progress,
          createdAt: new Date().toISOString(),
        },
      ],
      reviews: blueprint.sharedWithSupervisor
        ? [
            {
              id: existing?.reviews?.[0]?.id || this.makeId('rev'),
              reviewerUserId: supervisor?.userId ?? null,
              reviewer: supervisor?.name || this.supervisorName(),
              decision: blueprint.supervisorApproved ? 'APPROVED' : 'NOTED',
              note: blueprint.supervisorApproved
                ? 'Approved for execution tracking.'
                : 'Shared for review and awaiting detailed supervisor direction.',
              createdAt: new Date().toISOString(),
              emailPreview: `${supervisor?.name || this.supervisorName()} received a review update for ${assignee?.name || this.currentActor()}.`,
              attachments: [],
            },
          ]
        : [],
      workItems: blueprint.workItems.map((item, itemIndex) => {
        const itemOwner = this.people[(index + itemIndex) % this.people.length] || assignee;
        return {
          id: this.makeId('wi'),
          title: item.title,
          ownerUserId: itemOwner?.userId ?? assignee?.userId ?? null,
          owner: itemOwner?.name || assignee?.name || this.currentActor(),
          timelineStart: this.plusDaysIso(item.startOffset),
          timelineDue: this.plusDaysIso(item.dueOffset),
          dependency: item.dependency || '',
          status: item.status,
          progress: this.statusProgress(item.status, item.progress),
        };
      }),
      sharedWithSupervisor: !!blueprint.sharedWithSupervisor,
      supervisorApproved: !!blueprint.supervisorApproved,
      linkedToProductivity: true,
      linkedToPayroll: false,
      productivityWeight: 1,
    });
  }

  private findExistingDemoTask(title: string): RoutineTask | null {
    return this.tasks.find((task) => task.tags.includes('demo-seed') && task.title.trim().toLowerCase() === title.trim().toLowerCase()) || null;
  }

  private demoSupervisor(...excludedUserIds: Array<number | null | undefined>): PersonOption | undefined {
    const excluded = new Set(excludedUserIds.filter((value): value is number => !!value));
    return (
      this.people.find((person) => /manager|lead|supervisor|partner|head|admin/i.test(person.role) && !excluded.has(person.userId || -1)) ||
      this.people.find((person) => !excluded.has(person.userId || -1))
    );
  }

  private daysBetween(startIso: string, endIso: string): number {
    const start = new Date(`${startIso}T00:00:00`);
    const end = new Date(`${endIso}T00:00:00`);
    return Math.round((end.getTime() - start.getTime()) / 86400000);
  }

  private matchesTaskQuery(task: RoutineTask, query: string): boolean {
    return [
      task.title,
      task.description,
      task.assignee,
      task.owner,
      task.projectName,
      task.dependencyValue,
      task.routineType,
      task.priority,
      task.lane,
      task.timelineStart,
      task.timelineDue,
      task.tags.join(' '),
      task.workItems.map((item) => `${item.title} ${item.owner} ${item.status} ${item.dependency}`).join(' '),
    ]
      .join(' ')
      .toLowerCase()
      .includes(query);
  }

  private belongsToStatusBucket(task: RoutineTask, bucket: Exclude<TaskStatusBucket, 'ALL'>): boolean {
    if (bucket === 'OPEN') return task.lane === 'BACKLOG' || task.lane === 'TODAY';
    if (bucket === 'IN_PROGRESS') return task.lane === 'IN_PROGRESS' || task.lane === 'REVIEW';
    return task.lane === 'DONE';
  }

  private syncTaskProgress(task: RoutineTask): void {
    if (!task.workItems.length) return;
    const aggregate = task.workItems.reduce((sum, item) => sum + this.statusProgress(item.status, item.progress), 0);
    task.progress = Math.round(aggregate / task.workItems.length);
  }

  private moveTaskForProgress(task: RoutineTask): void {
    if (task.progress >= 100) {
      this.moveTask(task, 'DONE');
    } else if (task.sharedWithSupervisor && task.progress >= 70) {
      this.moveTask(task, 'REVIEW');
    } else if (task.progress >= 40) {
      this.moveTask(task, 'IN_PROGRESS');
    } else if (task.progress >= 15) {
      this.moveTask(task, 'TODAY');
    }
  }

  private moveTask(task: RoutineTask, lane: TaskLane): void {
    if (task.lane === lane) return;
    const source = this.taskBoard[task.lane];
    const index = source.findIndex((row) => row.id === task.id);
    if (index >= 0) source.splice(index, 1);
    task.lane = lane;
    if (lane === 'DONE') task.progress = 100;
    this.taskBoard[lane].unshift(task);
  }

  private normalizeTask(task: any): RoutineTask {
    const normalized: RoutineTask = {
      id: task.id || this.makeId('task'),
      title: task.title || 'Untitled task',
      description: task.description || '',
      ownerUserId: task.ownerUserId ?? null,
      assigneeUserId: task.assigneeUserId ?? null,
      supervisorUserId: task.supervisorUserId ?? null,
      lane: (task.lane || 'BACKLOG') as TaskLane,
      progress: Number(task.progress || 0),
      owner: task.owner || this.personNameByUserId(task.ownerUserId) || task.assignee || this.currentActor(),
      assignee: task.assignee || task.owner || this.currentActor(),
      timelineStart: task.timelineStart || this.todayIso(),
      timelineDue: task.timelineDue || task.timelineStart || this.todayIso(),
      routineType: (task.routineType || 'Daily') as RoutineType,
      priority: (task.priority || 'Medium') as TaskPriority,
      dependencyType: (task.dependencyType || 'NONE') as DependencyType,
      dependencyValue: task.dependencyValue || '',
      projectName: task.projectName || '',
      tags: Array.isArray(task.tags) ? task.tags : [],
      attachments: Array.isArray(task.attachments)
        ? task.attachments.map((attachment: any) => ({
            ...attachment,
            previewUrl: this.normalizeAttachmentUrl(attachment.previewUrl),
          }))
        : [],
      updates: Array.isArray(task.updates)
        ? task.updates.map((update: any) => ({
            ...update,
            authorUserId: update.authorUserId ?? null,
            author: this.cleanDisplayName(update.author) || this.personNameByUserId(update.authorUserId) || this.currentActor(),
            createdAt: this.normalizeDateTimeValue(update.createdAt || new Date().toISOString()),
            attachments: Array.isArray(update.attachments)
              ? update.attachments.map((attachment: any) => ({
                  ...attachment,
                  previewUrl: this.normalizeAttachmentUrl(attachment.previewUrl),
                }))
              : [],
          }))
        : [],
      reviews: Array.isArray(task.reviews)
        ? task.reviews.map((review: any) => ({
            ...review,
            reviewerUserId: review.reviewerUserId ?? null,
            reviewer: this.cleanDisplayName(review.reviewer) || this.personNameByUserId(review.reviewerUserId) || this.currentActor(),
            createdAt: this.normalizeDateTimeValue(review.createdAt || new Date().toISOString()),
            attachments: Array.isArray(review.attachments)
              ? review.attachments.map((attachment: any) => ({
                  ...attachment,
                  previewUrl: this.normalizeAttachmentUrl(attachment.previewUrl),
                }))
              : [],
          }))
        : [],
      workItems: Array.isArray(task.workItems)
        ? task.workItems.map((item: any) => ({
            id: item.id || this.makeId('wi'),
            title: item.title || 'Untitled sub task',
            ownerUserId: item.ownerUserId ?? null,
            owner: item.owner || this.personNameByUserId(item.ownerUserId) || task.assignee || this.currentActor(),
            timelineStart: this.normalizeIsoDate(item.timelineStart || task.timelineStart || this.todayIso()),
            timelineDue: this.normalizeIsoDate(item.timelineDue || item.timelineStart || task.timelineDue || this.todayIso()),
            dependency: item.dependency || '',
            status: (item.status || 'OPEN') as WorkItemStatus,
            progress: this.statusProgress((item.status || 'OPEN') as WorkItemStatus, Number(item.progress || 0)),
          }))
        : [],
      sharedWithSupervisor: !!task.sharedWithSupervisor,
      supervisorApproved: !!task.supervisorApproved,
      linkedToProductivity: task.linkedToProductivity ?? true,
      linkedToPayroll: !!task.linkedToPayroll,
      payrollMonth: task.payrollMonth || '',
      productivityWeight: Number(task.productivityWeight || 0),
      emailQueuedAt: task.emailQueuedAt,
      createdAt: this.normalizeDateTimeValue(task.createdAt),
      updatedAt: this.normalizeDateTimeValue(task.updatedAt),
    };
    this.syncTaskProgress(normalized);
    return normalized;
  }

  private normalizeIsoDate(value: any): string {
    if (!value) return this.todayIso();
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? this.todayIso() : parsed.toISOString().slice(0, 10);
    }
    if (Array.isArray(value) && value.length >= 3) {
      const [year, month, day] = value;
      if ([year, month, day].every((part) => typeof part === 'number')) {
        return `${year}`.padStart(4, '0') + `-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? this.todayIso() : parsed.toISOString().slice(0, 10);
  }

  private normalizeDateTimeValue(value: any): string {
    if (!value) return new Date().toISOString();
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    }
    if (Array.isArray(value) && value.length >= 6) {
      const [year, month, day, hour, minute, second, nano = 0] = value;
      if ([year, month, day, hour, minute, second].every((part) => typeof part === 'number')) {
        const millis = Math.floor(Number(nano || 0) / 1000000);
        const parsed = new Date(year, Math.max(0, month - 1), day, hour, minute, second, millis);
        return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
      }
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  private resetDraft(): void {
    this.revokeAttachmentUrls(this.pendingAttachments);
    this.pendingAttachments = [];
    this.draft = this.emptyDraft();
  }

  private emptyDraft(): DraftState {
    return {
      title: '',
      description: '',
      stage: 'OPEN',
      routineType: 'Daily',
      priority: 'Medium',
      timelineStart: this.todayIso(),
      timelineDue: this.plusDaysIso(5),
      assignee: this.currentActor(),
      projectName: this.projectOptions?.[0] || this.enterpriseProjects?.[0] || '',
      dependencyType: 'NONE',
      dependencyValue: '',
      tags: '',
      workItems: [
        this.emptyDraftWorkItem(this.currentActor()),
        this.emptyDraftWorkItem(this.currentActor(), 2),
      ],
    };
  }

  private emptyDraftWorkItem(owner: string, dayOffset = 0): DraftWorkItem {
    return {
      id: this.makeId('dwi'),
      title: '',
      owner,
      timelineStart: this.plusDaysIso(dayOffset),
      timelineDue: this.plusDaysIso(dayOffset + 2),
      dependency: '',
      status: 'OPEN',
      progress: 0,
    };
  }

  private currentActor(): string {
    return this.sessionProfileName() || this.userInfo?.username || this.people[0]?.name || 'Staff';
  }

  private supervisorName(): string {
    if (this.isSupervisor) return this.currentActor();
    return this.people.find((person) => /manager|lead|supervisor|partner|head/i.test(person.role))?.name || this.people[0]?.name || 'Supervisor';
  }

  private sessionProfileName(): string {
    return (
      this.userInfo?.fullname ||
      sessionStorage.getItem('fullname') ||
      sessionStorage.getItem('username') ||
      ''
    );
  }

  private readRole(): string {
    return sessionStorage.getItem('role') || '';
  }

  private makeId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private plusDaysIso(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private isoFromDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private ganttRange(): { start: Date; end: Date } {
    const items = this.ganttTasks.flatMap((task) => [task, ...task.workItems]);
    if (!items.length) {
      return {
        start: new Date(this.todayIso()),
        end: new Date(this.plusDaysIso(14)),
      };
    }

    const starts = items.map((item: any) => new Date(item.timelineStart || this.todayIso()).getTime());
    const ends = items.map((item: any) => new Date(item.timelineDue || item.timelineStart || this.todayIso()).getTime());
    const min = new Date(Math.min(...starts));
    const max = new Date(Math.max(...ends));
    min.setDate(min.getDate() - 1);
    max.setDate(max.getDate() + 1);
    return { start: min, end: max };
  }

  private clampIsoToRange(iso: string): string {
    const labels = this.ganttDayLabels.map((day) => day.iso);
    if (!labels.length) return iso;
    if (iso < labels[0]) return labels[0];
    if (iso > labels[labels.length - 1]) return labels[labels.length - 1];
    return iso;
  }

  private ganttIndexForIso(
    iso: string,
    labels: Array<{ iso: string; label: string }>,
    anchor: 'start' | 'end',
  ): number {
    const clamped = this.clampIsoToRange(iso);
    const index = labels.findIndex((day) => day.iso === clamped);
    if (index < 0) return 0;
    return anchor === 'end' ? index + 1 : index;
  }

  private statusProgress(status: WorkItemStatus, progress: number): number {
    if (status === 'DONE') return 100;
    if (status === 'BLOCKED') return Math.min(progress || 25, 65);
    if (status === 'IN_PROGRESS') return Math.max(progress || 35, 20);
    return Math.min(progress || 0, 25);
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  private collectAttachments(event: Event, target: TaskAttachment[], uploadToApi = false): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    if (!uploadToApi) {
      files.forEach((file) => target.push(this.localAttachmentFromFile(file)));
      input.value = '';
      return;
    }
    files.forEach((file) => {
      const preview = this.localAttachmentFromFile(file);
      target.push(preview);
      this.collaborationService.uploadTaskRoutineAttachment(file).subscribe({
        next: (saved) => {
          const index = target.findIndex((row) => row.id === preview.id);
          const merged = this.mapAttachmentFromApi(saved, preview.previewUrl);
          if (index >= 0) {
            target[index] = merged;
          } else {
            target.push(merged);
          }
        },
        error: (error) => {
          this.toast('error', 'Attachment failed', this.errorDetail(error, `Could not upload ${file.name}.`));
        },
      });
    });
    input.value = '';
  }

  private collectPastedAttachments(event: ClipboardEvent, target: TaskAttachment[]): void {
    const items = Array.from(event.clipboardData?.items || []);
    const files = items
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file);
    if (!files.length) {
      return;
    }
    event.preventDefault();
    files.forEach((file) => {
      const preview = this.localAttachmentFromFile(file);
      target.push(preview);
      this.collaborationService.uploadTaskRoutineAttachment(file).subscribe({
        next: (saved) => {
          const index = target.findIndex((row) => row.id === preview.id);
          const merged = this.mapAttachmentFromApi(saved, preview.previewUrl);
          if (index >= 0) {
            target[index] = merged;
          } else {
            target.push(merged);
          }
        },
        error: (error) => {
          this.toast('error', 'Paste upload failed', this.errorDetail(error, `Could not upload ${file.name}.`));
        },
      });
    });
  }

  insertUpdateTable(task: RoutineTask): void {
    this.updateDrafts[task.id] = `${this.updateDrafts[task.id] || ''}<table border="1" style="width:100%; border-collapse:collapse;"><tr><th>Step</th><th>Owner</th><th>Status</th></tr><tr><td></td><td></td><td></td></tr></table>`;
  }

  insertReviewTable(task: RoutineTask): void {
    this.supervisorNotes[task.id] = `${this.supervisorNotes[task.id] || ''}<table border="1" style="width:100%; border-collapse:collapse;"><tr><th>Observation</th><th>Action</th><th>Owner</th></tr><tr><td></td><td></td><td></td></tr></table>`;
  }

  private removeAttachmentFromCollection(
    attachment: TaskAttachment,
    collection: 'pendingAttachments' | 'pendingReviewAttachments' | 'pendingUpdateAttachments',
  ): void {
    const rows = this[collection];
    const index = rows.findIndex((row) => row.id === attachment.id);
    if (index >= 0) {
      const [removed] = rows.splice(index, 1);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    }
  }

  private revokeAttachmentUrls(attachments: TaskAttachment[]): void {
    attachments.forEach((attachment) => {
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    });
  }

  private defaultReviewMessage(decision: ReviewDecision): string {
    if (decision === 'APPROVED') return 'Approved and released for tracking.';
    if (decision === 'CHANGES') return 'Changes requested before approval.';
    return 'Review noted for follow-up.';
  }

  private localAttachmentFromFile(file: File): TaskAttachment {
    return {
      id: this.makeId('att'),
      name: file.name,
      size: this.formatFileSize(file.size),
      type: file.type,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    };
  }

  private mapAttachmentFromApi(attachment?: TaskRoutineAttachment, fallbackPreviewUrl?: string): TaskAttachment {
    return {
      id: attachment?.id || this.makeId('att'),
      name: attachment?.name || 'Attachment',
      size: attachment?.size || '',
      type: attachment?.type || 'application/octet-stream',
      previewUrl: this.normalizeAttachmentUrl(attachment?.previewUrl) || fallbackPreviewUrl,
    };
  }

  private mapAttachmentToApi(attachment: TaskAttachment): TaskRoutineAttachment {
    return {
      id: attachment.id,
      name: attachment.name,
      size: attachment.size,
      type: attachment.type,
      previewUrl: attachment.previewUrl,
    };
  }

  private normalizeAttachmentUrl(url?: string): string | undefined {
    if (!url) return undefined;
    if (/^https?:\/\//i.test(url) || url.startsWith('blob:')) {
      return url;
    }
    const base = (environment.baseUrl || environment.apiBaseUrl || '').replace(/\/$/, '');
    return `${base}${url.startsWith('/') ? url : `/${url}`}`;
  }

  private findPersonByName(name?: string): PersonOption | undefined {
    const normalized = (name || '').trim().toLowerCase();
    if (!normalized) return undefined;
    return this.people.find((person) => person.name.trim().toLowerCase() === normalized);
  }

  private personNameByUserId(userId?: number | null): string {
    if (!userId) return '';
    return this.people.find((person) => Number(person.userId || 0) === Number(userId))?.name || '';
  }

  private cleanDisplayName(value?: string | null): string {
    const cleaned = String(value || '').trim();
    if (!cleaned || cleaned.toLowerCase() === 'undefined' || cleaned.toLowerCase() === 'null') {
      return '';
    }
    return cleaned;
  }

  private displayNameFromUser(user?: { fullname?: string; username?: string }, userId?: number | null): string {
    return user?.fullname || user?.username || this.personNameByUserId(userId) || this.currentActor();
  }

  private meUserId(): number | null {
    const value = Number(sessionStorage.getItem('userid') || sessionStorage.getItem('userId') || this.userInfo?.userId || 0);
    return value || null;
  }

  private supervisorUserId(): number | null {
    if (this.isSupervisor) {
      return this.meUserId();
    }
    return this.people.find((person) => /manager|lead|supervisor|partner|head/i.test(person.role))?.userId ?? null;
  }

  private taskStatusForLane(lane: TaskLane): 'OPEN' | 'IN_PROGRESS' | 'CLOSED' {
    if (lane === 'DONE') return 'CLOSED';
    if (lane === 'IN_PROGRESS' || lane === 'REVIEW') return 'IN_PROGRESS';
    return 'OPEN';
  }

  openMetadataDialog(): void {
    this.metadataDialogVisible = true;
  }

  addProjectMetadata(): void {
    const value = this.newMetadata.project.trim();
    if (!value) return;
    if (!this.projectOptions.includes(value)) {
      this.projectOptions = [...this.projectOptions, value].sort((a, b) => a.localeCompare(b));
      this.persistMetadataConfig();
      this.toast('success', 'Project added', `${value} is now available in task metadata.`);
    }
    this.newMetadata.project = '';
  }

  addStageMetadata(): void {
    const value = this.newMetadata.stage.trim();
    if (!value) return;
    const normalized = value.toUpperCase().replace(/\s+/g, '_') as TaskStage;
    if (!this.stageOptions.some((stage) => stage.value === normalized || stage.label.toLowerCase() === value.toLowerCase())) {
      this.stageOptions = [...this.stageOptions, { label: value, value: normalized }].sort((a, b) => a.label.localeCompare(b.label));
      this.persistMetadataConfig();
      this.toast('success', 'Stage added', `${value} is now available in stage selection.`);
    }
    this.newMetadata.stage = '';
  }

  addRoutineTypeMetadata(): void {
    const value = this.newMetadata.routineType.trim();
    if (!value) return;
    if (!this.routineTypeOptions.some((type) => type.toLowerCase() === value.toLowerCase())) {
      this.routineTypeOptions = [...this.routineTypeOptions, value as RoutineType].sort((a, b) => a.localeCompare(b));
      this.persistMetadataConfig();
      this.toast('success', 'Routine type added', `${value} is now available in routine type selection.`);
    }
    this.newMetadata.routineType = '';
  }

  addDependencyTypeMetadata(): void {
    const label = this.newMetadata.dependencyLabel.trim();
    if (!label) return;
    const value = (this.newMetadata.dependencyValue || 'PROJECT') as DependencyType;
    if (!this.dependencyTypeOptions.some((dependency) => dependency.label.toLowerCase() === label.toLowerCase())) {
      this.dependencyTypeOptions = [...this.dependencyTypeOptions, { label, value }];
      this.persistMetadataConfig();
      this.toast('success', 'Dependency type added', `${label} is now available in dependency selection.`);
    }
    this.newMetadata.dependencyLabel = '';
    this.newMetadata.dependencyValue = 'PROJECT';
  }

  exportHistoryExcel(): void {
    const rows = this.historyCards.map((task) => ({
      Title: task.title,
      Assignee: task.assignee,
      Owner: task.owner,
      Stage: this.stageForTask(task),
      Progress: `${task.progress}%`,
      StartDate: task.timelineStart,
      EndDate: task.timelineDue,
      Project: task.projectName,
      RoutineType: task.routineType,
      DependencyType: task.dependencyType,
      DependencyValue: task.dependencyValue,
      SubTasks: task.workItems.length,
      Blocked: this.taskBlockedCount(task),
      SharedToSupervisor: task.sharedWithSupervisor ? 'Yes' : 'No',
      Approved: task.supervisorApproved ? 'Yes' : 'No',
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Task History');
    XLSX.writeFile(book, `tasks-routines-history-${this.todayIso()}.xlsx`);
  }

  exportHistoryPdf(): void {
    const pdf = new jsPDF({ orientation: 'landscape' });
    pdf.setFontSize(16);
    pdf.text('Tasks and Routines History', 14, 16);
    autoTable(pdf, {
      startY: 24,
      head: [['Title', 'Assignee', 'Stage', 'Progress', 'Timeline', 'Project', 'Sub tasks']],
      body: this.historyCards.map((task) => [
        task.title,
        task.assignee,
        this.stageForTask(task),
        `${task.progress}%`,
        `${task.timelineStart} - ${task.timelineDue}`,
        task.projectName || 'No project',
        `${task.workItems.length}`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 92, 114] },
    });
    pdf.save(`tasks-routines-history-${this.todayIso()}.pdf`);
  }

  stageForTask(task: RoutineTask): TaskStage {
    return this.taskStatusForLane(task.lane);
  }

  private stageToLane(stage: TaskStage): TaskLane {
    if (stage === 'CLOSED') return 'DONE';
    if (stage === 'IN_PROGRESS') return 'IN_PROGRESS';
    return 'BACKLOG';
  }

  private mergeProjectOptions(): void {
    const liveProjects = this.tasks.map((task) => task.projectName).filter(Boolean);
    this.projectOptions = [...new Set([...this.projectOptions, ...liveProjects])].sort((a, b) => a.localeCompare(b));
  }

  private metadataStorageKey(): string {
    return 'optimax_tasks_routines_metadata';
  }

  private loadMetadataConfig(): void {
    try {
      const raw = localStorage.getItem(this.metadataStorageKey());
      if (!raw) return;
      const parsed = JSON.parse(raw) as { projects?: unknown[]; stages?: any[]; routineTypes?: unknown[]; dependencyTypes?: any[] };
      if (Array.isArray(parsed?.projects)) {
        this.projectOptions = [
          ...new Set(parsed.projects.filter((project): project is string => typeof project === 'string' && !!project.trim())),
        ];
      }
      if (Array.isArray(parsed?.stages)) {
        this.stageOptions = parsed.stages
          .filter((stage: any) => stage && typeof stage.label === 'string' && typeof stage.value === 'string')
          .map((stage: any) => ({ label: stage.label, value: stage.value as TaskStage }));
      }
      if (Array.isArray(parsed?.routineTypes)) {
        this.routineTypeOptions = [
          ...new Set(parsed.routineTypes.filter((type): type is RoutineType => typeof type === 'string' && !!type.trim())),
        ];
      }
      if (Array.isArray(parsed?.dependencyTypes)) {
        this.dependencyTypeOptions = parsed.dependencyTypes
          .filter((dependency: any) => dependency && typeof dependency.label === 'string' && typeof dependency.value === 'string')
          .map((dependency: any) => ({ label: dependency.label, value: dependency.value as DependencyType }));
      }
    } catch (_) {}
  }

  private persistMetadataConfig(): void {
    localStorage.setItem(this.metadataStorageKey(), JSON.stringify({
      projects: this.projectOptions,
      stages: this.stageOptions,
      routineTypes: this.routineTypeOptions,
      dependencyTypes: this.dependencyTypeOptions,
    }));
  }

  private toast(severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string): void {
    this.messageService.add({ key: 'tasks-routines', severity, summary, detail, life: 4000 });
  }

  private errorDetail(error: any, fallback: string): string {
    return error?.error?.message || error?.message || fallback;
  }

  private stripHtml(value: string): string {
    return String(value || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private applyNotificationTargetIfPresent(): void {
    try {
      const raw = sessionStorage.getItem('optimax_notification_target');
      if (!raw) return;
      const target = JSON.parse(raw);
      if (!target?.taskRoutineId) return;
      sessionStorage.removeItem('optimax_notification_target');
      this.applyNotificationTarget(target);
    } catch (_) {}
  }

  private applyNotificationTarget(target: any): void {
    const task = this.findTaskById(String(target?.taskRoutineId || ''));
    if (!task) return;
    this.openTaskDialog(task);
    this.highlightedUpdateId = target.taskUpdateId || null;
    this.highlightedReviewId = target.taskReviewId || null;
    setTimeout(() => {
      this.highlightedUpdateId = null;
      this.highlightedReviewId = null;
    }, 5000);
  }

  private showReminderDialog(title: string, body: string): void {
    this.reminderDialogTitle = title;
    this.reminderDialogBody = body;
    this.reminderDialogVisible = true;
    this.playReminderTone();
  }

  private playReminderTone(): void {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);

      const first = ctx.createOscillator();
      first.type = 'sine';
      first.frequency.setValueAtTime(880, ctx.currentTime);
      first.connect(gain);
      const second = ctx.createOscillator();
      second.type = 'triangle';
      second.frequency.setValueAtTime(660, ctx.currentTime + 0.18);
      second.connect(gain);

      first.start();
      second.start(ctx.currentTime + 0.18);
      first.stop(ctx.currentTime + 0.28);
      second.stop(ctx.currentTime + 0.62);
      second.onended = () => ctx.close();
    } catch (_) {}
  }

  private downloadIcs(title: string, description: string, startDate: string, endDate: string): void {
    const start = this.icsDate(startDate, 9);
    const end = this.icsDate(endDate || startDate, 17);
    const content = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OptimaX//Tasks and Routines//EN',
      'BEGIN:VEVENT',
      `UID:${this.makeId('ics')}`,
      `DTSTAMP:${this.icsDate(this.todayIso(), 0)}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${this.escapeIcs(title)}`,
      `DESCRIPTION:${this.escapeIcs(description || title)}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${this.escapeIcs(title)}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    saveAs(blob, `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'task-reminder'}.ics`);
  }

  private icsDate(isoDate: string, hour: number): string {
    const date = new Date(`${isoDate}T00:00:00`);
    date.setHours(hour, 0, 0, 0);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
  }

  private escapeIcs(value: string): string {
    return (value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }
}

function taskRollup(task: RoutineTask): number {
  if (!task.workItems.length) {
    return Number(task.progress || 0);
  }
  return Math.round(task.workItems.reduce((sum, item) => sum + Number(item.progress || 0), 0) / task.workItems.length);
}
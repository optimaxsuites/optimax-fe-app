import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import {
  ProductivityCycleCard,
  ProductivityDataService,
  ProductivityInsight,
  ProductivityLeaderboardRow,
  ProductivityMetricCard,
  ProductivityScorecardCard,
  ProductivityTaskCard,
} from './productivity-data.service';
import {
  ProductivityReviewCycleOption,
  ProductivityReviewEmployeeOption,
  ProductivityReviewService,
  ProductivityReviewSubmission,
} from './productivity-review.service';

type ProductivityView = 'overview' | 'tasks' | 'reviews' | 'analytics';

@Component({
  selector: 'app-productivity-workspace',
  templateUrl: './productivity-workspace.component.html',
  styleUrls: ['./productivity-workspace.component.scss'],
})
export class ProductivityWorkspaceComponent implements OnInit, OnDestroy {
  activeView: ProductivityView = 'overview';
  private readonly subscription = new Subscription();

  readonly tabs: { key: ProductivityView; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'pi pi-home' },
    { key: 'tasks', label: 'Tasks', icon: 'pi pi-check-square' },
    { key: 'reviews', label: 'Reviews', icon: 'pi pi-star' },
    { key: 'analytics', label: 'Analytics', icon: 'pi pi-chart-line' },
  ];

  metrics: ProductivityMetricCard[] = [];
  tasks: ProductivityTaskCard[] = [];
  cycles: ProductivityCycleCard[] = [];
  scorecards: ProductivityScorecardCard[] = [];
  leaderboard: ProductivityLeaderboardRow[] = [];
  trendPoints: number[] = [0, 0, 0, 0, 0, 0];
  insights: ProductivityInsight[] = [];
  reviewCycles: ProductivityReviewCycleOption[] = [];
  directReports: ProductivityReviewEmployeeOption[] = [];
  reviewSubmissions: ProductivityReviewSubmission[] = [];
  currentEmployee: ProductivityReviewEmployeeOption | null = null;

  selfReviewDraft = {
    cycleId: '',
    score: 3,
    summary: '',
    blockers: '',
  };

  supervisorReviewDraft = {
    cycleId: '',
    employeeId: '',
    score: 3,
    summary: '',
    blockers: '',
  };

  reviewNotice = '';

  supervisorReviewRate = '0%';
  highRiskUnits = 0;
  highRiskSummary = 'No technology delivery risk is visible yet.';

  constructor(
    private readonly productivityDataService: ProductivityDataService,
    private readonly productivityReviewService: ProductivityReviewService
  ) {}

  ngOnInit(): void {
    this.productivityDataService.init();
    this.productivityReviewService.init();
    this.subscription.add(
      this.productivityDataService.workspace$.subscribe((workspace) => {
        this.metrics = workspace.metrics;
        this.tasks = workspace.tasks;
        this.cycles = workspace.cycles;
        this.scorecards = workspace.scorecards;
        this.leaderboard = workspace.leaderboard;
        this.trendPoints = workspace.trendPoints;
        this.insights = workspace.insights;
        this.supervisorReviewRate = workspace.supervisorReviewRate;
        this.highRiskUnits = workspace.highRiskUnits;
        this.highRiskSummary = workspace.highRiskSummary;
      })
    );
    this.subscription.add(
      this.productivityReviewService.workflow$.subscribe((workflow) => {
        this.reviewCycles = workflow.cycles;
        this.currentEmployee = workflow.currentEmployee;
        this.directReports = workflow.directReports;
        this.reviewSubmissions = workflow.submissions;

        if (!this.selfReviewDraft.cycleId) {
          this.selfReviewDraft.cycleId = workflow.cycles[0]?.id || '';
        }

        if (!this.supervisorReviewDraft.cycleId) {
          this.supervisorReviewDraft.cycleId = workflow.cycles[0]?.id || '';
        }

        if (!this.supervisorReviewDraft.employeeId) {
          this.supervisorReviewDraft.employeeId = workflow.directReports[0]?.id || '';
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  setActiveView(view: ProductivityView): void {
    this.activeView = view;
  }

  toneClass(tone: string): string {
    return `tone-${tone}`;
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
  }

  groupedTasks(): { label: string; items: ProductivityTaskCard[] }[] {
    return [
      {
        label: 'Needs attention',
        items: this.tasks.filter((task) => ['Overdue'].includes(task.status)),
      },
      {
        label: 'In execution',
        items: this.tasks.filter((task) => task.status === 'In Progress'),
      },
      {
        label: 'Queued work',
        items: this.tasks.filter((task) => task.status === 'Pending'),
      },
    ];
  }

  metricIcon(index: number): string {
    return [
      'fa-solid fa-list-check',
      'fa-solid fa-triangle-exclamation',
      'fa-solid fa-gauge-high',
      'fa-solid fa-user-check',
    ][index] || 'fa-solid fa-chart-column';
  }

  metricTrendClass(tone: string): string {
    return `trend-${tone}`;
  }

  submitSelfReview(): void {
    if (!this.selfReviewDraft.cycleId || !this.selfReviewDraft.summary.trim()) {
      this.reviewNotice = 'Self review needs a cycle and a short summary.';
      return;
    }

    this.productivityReviewService.submitSelfReview({
      cycleId: this.selfReviewDraft.cycleId,
      score: Number(this.selfReviewDraft.score),
      summary: this.selfReviewDraft.summary.trim(),
      blockers: this.selfReviewDraft.blockers.trim(),
    });
    this.productivityDataService.refresh();
    this.reviewNotice = 'Self review submitted.';
    this.selfReviewDraft.summary = '';
    this.selfReviewDraft.blockers = '';
  }

  submitSupervisorReview(): void {
    if (
      !this.supervisorReviewDraft.cycleId ||
      !this.supervisorReviewDraft.employeeId ||
      !this.supervisorReviewDraft.summary.trim()
    ) {
      this.reviewNotice = 'Supervisor review needs a cycle, an employee, and a short summary.';
      return;
    }

    this.productivityReviewService.submitSupervisorReview({
      cycleId: this.supervisorReviewDraft.cycleId,
      employeeId: this.supervisorReviewDraft.employeeId,
      score: Number(this.supervisorReviewDraft.score),
      summary: this.supervisorReviewDraft.summary.trim(),
      blockers: this.supervisorReviewDraft.blockers.trim(),
    });
    this.productivityDataService.refresh();
    this.reviewNotice = 'Supervisor review submitted.';
    this.supervisorReviewDraft.summary = '';
    this.supervisorReviewDraft.blockers = '';
  }

  get productivityDensityRows(): ProductivityLeaderboardRow[] {
    return this.leaderboard
      .slice()
      .sort((a, b) => Number.parseInt(b.score, 10) - Number.parseInt(a.score, 10));
  }
}

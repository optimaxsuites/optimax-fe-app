// vendor-ai-intelligence.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { VendorService } from '../../../service/vendor-management/vendor-management.service';
import {
  SentinelInsight,
  InsightSeverity,
  InsightActionStatus,
  VendorRiskTrajectory,
  RiskTrajectoryDirection,
  FraudFlag,
  OnboardingCopilotSession,
  ExtractedField,
  SmartVendorShortlistItem,
  SentinelQueryResult,
  SentinelGovernanceRule,
  SentinelActionLogEntry,
  SentinelSummaryStats,
  RiskLevel,
  getInsightSeverityColor,
  getRiskTrajectoryColor,
  getRiskTrajectoryIcon,
  getRiskLevelColor
} from '../../../domain/vendor-management/vendor-management.dto';

type WorkspaceTab = 'feed' | 'trajectory' | 'fraud' | 'onboarding' | 'shortlist' | 'governance';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-vendor-ai-intelligence',
  templateUrl: './vendor-ai-intelligence.component.html',
  styleUrl: './vendor-ai-intelligence.component.scss'
})
export class VendorAiIntelligenceComponent implements OnInit, OnDestroy {

  // Expose enum to template
  readonly InsightSeverity = InsightSeverity;

  // ============================================================
  // STATE
  // ============================================================

  isLoading = true;
  activeTab: WorkspaceTab = 'feed';

  summary: SentinelSummaryStats | null = null;
  insights: SentinelInsight[] = [];
  trajectories: VendorRiskTrajectory[] = [];
  fraudFlags: FraudFlag[] = [];
  onboardingSession: OnboardingCopilotSession | null = null;
  shortlist: SmartVendorShortlistItem[] = [];
  governanceRules: SentinelGovernanceRule[] = [];
  actionLog: SentinelActionLogEntry[] = [];

  // Insight feed filters
  insightSeverityFilter: 'ALL' | InsightSeverity = 'ALL';

  // Ask Sentinel
  sentinelQuery: string = '';
  sentinelAnswer: SentinelQueryResult | null = null;
  isAsking = false;
  readonly suggestedQueries: string[] = [
    'Which vendors had 2+ disputes in 90 days?',
    'Which vendors have a rising risk trajectory?',
    'Any unresolved bank detail changes?'
  ];

  // Selected trajectory for detail view
  selectedTrajectoryVendorId: string | null = null;

  // Toast / confirmation feedback
  actionFeedback: string | null = null;

  private subscriptions: Subscription[] = [];

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(private vendorService: VendorService) { }

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadAll(): void {
    this.isLoading = true;

    this.subscriptions.push(
      this.vendorService.getSentinelSummaryStats().subscribe(s => this.summary = s)
    );

    this.subscriptions.push(
      this.vendorService.getSentinelInsights().subscribe(data => {
        this.insights = data;
        this.isLoading = false;
      })
    );

    this.subscriptions.push(
      this.vendorService.getRiskTrajectories().subscribe(data => {
        this.trajectories = data;
        if (data.length && !this.selectedTrajectoryVendorId) {
          this.selectedTrajectoryVendorId = data[0].vendorId;
        }
      })
    );

    this.subscriptions.push(
      this.vendorService.getFraudFlags().subscribe(data => this.fraudFlags = data)
    );

    this.subscriptions.push(
      this.vendorService.getOnboardingCopilotSession().subscribe(data => this.onboardingSession = data)
    );

    this.subscriptions.push(
      this.vendorService.getSmartVendorShortlist().subscribe(data => this.shortlist = data)
    );

    this.subscriptions.push(
      this.vendorService.getGovernanceRules().subscribe(data => this.governanceRules = data)
    );

    this.subscriptions.push(
      this.vendorService.getSentinelActionLog().subscribe(data => this.actionLog = data)
    );
  }

  refreshSummary(): void {
    this.vendorService.getSentinelSummaryStats().subscribe(s => this.summary = s);
  }

  // ============================================================
  // TAB NAVIGATION
  // ============================================================

  setTab(tab: WorkspaceTab): void {
    this.activeTab = tab;
  }

  // ============================================================
  // INSIGHT FEED
  // ============================================================

  get filteredInsights(): SentinelInsight[] {
    const open = this.insights.filter(i => i.status !== InsightActionStatus.DISMISSED);
    const bySeverity = this.insightSeverityFilter === 'ALL'
      ? open
      : open.filter(i => i.severity === this.insightSeverityFilter);

    const order: Record<InsightSeverity, number> = {
      [InsightSeverity.CRITICAL]: 0,
      [InsightSeverity.HIGH]: 1,
      [InsightSeverity.MEDIUM]: 2,
      [InsightSeverity.LOW]: 3
    };
    return [...bySeverity].sort((a, b) => order[a.severity] - order[b.severity]);
  }

  handleInsightAction(insight: SentinelInsight, action: string): void {
    this.vendorService.actOnInsight(insight.id, action).subscribe(updated => {
      this.insights = updated;
      this.actionFeedback = this.feedbackFor(action, insight.vendorName);
      this.refreshSummary();
      this.clearFeedbackSoon();
    });
  }

  feedbackFor(action: string, vendorName: string): string {
    const map: Record<string, string> = {
      review: `Marked "${vendorName}" for review.`,
      message: `Draft message opened for ${vendorName}.`,
      dismiss: `Insight dismissed for ${vendorName}.`,
      investigate: `${vendorName} moved to investigation.`,
      approve: `Approved recommendation for ${vendorName}.`,
      escalate: `${vendorName} escalated to compliance.`
    };
    return map[action] || `Action recorded for ${vendorName}.`;
  }

  private clearFeedbackSoon(): void {
    setTimeout(() => this.actionFeedback = null, 4000);
  }

  getSeverityColor(severity: InsightSeverity): string {
    return getInsightSeverityColor(severity);
  }

  getInsightIcon(type: string): string {
    const map: Record<string, string> = {
      PERFORMANCE_DECLINE: 'fa-chart-line',
      FRAUD_ANOMALY: 'fa-triangle-exclamation',
      TIER_UPGRADE: 'fa-trophy',
      DOCUMENT_EXPIRY: 'fa-file-circle-exclamation',
      RISK_ESCALATION: 'fa-shield-halved',
      OPPORTUNITY: 'fa-bullseye'
    };
    return map[type] || 'fa-circle-info';
  }

  timeAgo(date: Date): string {
    const diffMs = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // ============================================================
  // RISK TRAJECTORY
  // ============================================================

  get selectedTrajectory(): VendorRiskTrajectory | null {
    return this.trajectories.find(t => t.vendorId === this.selectedTrajectoryVendorId) || null;
  }

  selectTrajectory(vendorId: string): void {
    this.selectedTrajectoryVendorId = vendorId;
  }

  getTrajectoryColor(direction: RiskTrajectoryDirection): string {
    return getRiskTrajectoryColor(direction);
  }

  getTrajectoryIcon(direction: RiskTrajectoryDirection): string {
    return getRiskTrajectoryIcon(direction);
  }

  getRiskLevelColor(level: RiskLevel): string {
    return getRiskLevelColor(level);
  }

  getTrajectoryPointX(index: number, total: number): number {
    const padding = 30;
    const width = 460 - padding * 2;
    // index 0 = "today" (current), 1..3 = 30/60/90 day projections
    return padding + (index / total) * width;
  }

  getTrajectoryPointY(score: number): number {
    const padding = 16;
    const height = 160 - padding * 2;
    return padding + height - (score / 100) * height;
  }

  getTrajectoryPath(trajectory: VendorRiskTrajectory): string {
    const currentScore = trajectory.currentRiskLevel === RiskLevel.LOW ? 15
      : trajectory.currentRiskLevel === RiskLevel.MEDIUM ? 45 : 75;
    const points = [
      { x: this.getTrajectoryPointX(0, 3), y: this.getTrajectoryPointY(currentScore) },
      ...trajectory.projections.map((p, i) => ({
        x: this.getTrajectoryPointX(i + 1, 3),
        y: this.getTrajectoryPointY(p.projectedRiskScore)
      }))
    ];
    return points.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x},${p.y}`).join(' ');
  }

  // ============================================================
  // FRAUD & ANOMALY QUEUE
  // ============================================================

  get pendingFraudFlags(): FraudFlag[] {
    return this.fraudFlags.filter(f => f.status === 'PENDING_REVIEW' || f.status === 'INVESTIGATING');
  }

  updateFraudStatus(flag: FraudFlag, status: FraudFlag['status']): void {
    this.vendorService.updateFraudFlagStatus(flag.id, status).subscribe(updated => {
      this.fraudFlags = updated;
      this.actionFeedback = `${flag.vendorName} flag marked as ${status.replace('_', ' ').toLowerCase()}.`;
      this.refreshSummary();
      this.clearFeedbackSoon();
    });
  }

  fraudSeverityColor(severity: 'LOW' | 'MEDIUM' | 'HIGH'): string {
    const map = { LOW: '#2E6276', MEDIUM: '#F59E0B', HIGH: '#DC2626' };
    return map[severity];
  }

  // ============================================================
  // ONBOARDING COPILOT
  // ============================================================

  editingField: string | null = null;
  correctionValue: string = '';

  startCorrection(field: ExtractedField): void {
    this.editingField = field.fieldName;
    this.correctionValue = field.extractedValue;
  }

  cancelCorrection(): void {
    this.editingField = null;
    this.correctionValue = '';
  }

  confirmField(field: ExtractedField, corrected: boolean): void {
    if (!this.onboardingSession) return;
    const value = corrected ? this.correctionValue : undefined;

    this.vendorService.confirmExtractedField(this.onboardingSession.id, field.fieldName, value).subscribe(result => {
      if (!this.onboardingSession) return;
      this.onboardingSession = {
        ...this.onboardingSession,
        extractedFields: this.onboardingSession.extractedFields.map(f =>
          f.fieldName === field.fieldName ? result : f
        )
      };
      this.editingField = null;
      this.correctionValue = '';
      this.actionFeedback = corrected
        ? `Corrected "${field.fieldName}" and confirmed.`
        : `Confirmed "${field.fieldName}".`;
      this.clearFeedbackSoon();
    });
  }

  get allFieldsConfirmed(): boolean {
    return !!this.onboardingSession && this.onboardingSession.extractedFields.every(f => f.confirmed);
  }

  confidenceClass(confidence: number): string {
    if (confidence >= 90) return 'high';
    if (confidence >= 75) return 'medium';
    return 'low';
  }

  // ============================================================
  // SMART VENDOR SELECTION
  // ============================================================

  get rankedShortlist(): SmartVendorShortlistItem[] {
    return [...this.shortlist].sort((a, b) => b.overallFitScore - a.overallFitScore);
  }

  // ============================================================
  // ASK SENTINEL
  // ============================================================

  askSentinel(query?: string): void {
    const q = (query ?? this.sentinelQuery).trim();
    if (!q) return;

    this.sentinelQuery = q;
    this.isAsking = true;
    this.vendorService.querySentinel(q).subscribe(result => {
      this.sentinelAnswer = result;
      this.isAsking = false;
    });
  }

  clearSentinelAnswer(): void {
    this.sentinelAnswer = null;
    this.sentinelQuery = '';
  }

  // ============================================================
  // GOVERNANCE PANEL
  // ============================================================

  toggleAutonomy(rule: SentinelGovernanceRule): void {
    if (!rule.editable) return;
    const next = rule.autonomyLevel === 'AUTONOMOUS' ? 'STAFF_APPROVAL_REQUIRED' : 'AUTONOMOUS';
    this.vendorService.updateGovernanceRule(rule.id, next).subscribe(updated => {
      this.governanceRules = updated;
      this.actionFeedback = `"${rule.actionLabel}" is now ${next === 'AUTONOMOUS' ? 'autonomous' : 'staff sign-off required'}.`;
      this.clearFeedbackSoon();
    });
  }

  logExecutionClass(entry: SentinelActionLogEntry): string {
    return entry.executionType === 'AUTO' ? 'auto' : 'staff';
  }
}

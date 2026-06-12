import { Component, OnInit } from '@angular/core';
import {
  AnalyticsCapability,
  AnalyticsChatResponse,
  AnalyticsDrilldown,
  AnalyticsModuleCard,
  AnalyticsWorkspace,
  CollaborationService,
} from '../ui/services/collaboration.service';

// dami just modified this to build the modern analytics workspace and drilldown flow.
@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss'],
})
export class AnalyticsComponent implements OnInit {
  workspaceLoading = true;
  workspaceError: string | null = null;
  workspace: AnalyticsWorkspace | null = null;
  selectedModuleCode = 'pos';
  selectedCapabilityId = '';
  drilldownLoading = false;
  drilldown: AnalyticsDrilldown | null = null;
  chatLoading = false;
  chatResponse: AnalyticsChatResponse | null = null;
  chatPrompt = 'Summarize what leadership should focus on this week.';
  timeframe = 'last 30 days';
  focusArea = 'executive-summary';
  readonly availableModules = [
    'pos',
    'accounting',
    'hr',
    'expense',
    'hospitality',
    'sales',
    'procurement',
    'inventory',
    'reporting',
  ];

  constructor(private collaborationService: CollaborationService) {}

  ngOnInit(): void {
    this.loadWorkspace();
  }

  get selectedModule(): AnalyticsModuleCard | undefined {
    return this.workspace?.modules?.find(
      (module) => module.code === this.selectedModuleCode,
    );
  }

  get selectedCapability(): AnalyticsCapability | undefined {
    return this.selectedModule?.drilldowns?.find(
      (capability) => capability.capabilityId === this.selectedCapabilityId,
    );
  }

  loadWorkspace(): void {
    this.workspaceLoading = true;
    this.workspaceError = null;
    this.collaborationService
      .getAnalyticsWorkspace({
        timeframe: this.timeframe,
        subscribedModules: this.availableModules,
        includeAllModules: false,
        includeCrossDomain: true,
        focusArea: this.focusArea,
      })
      .subscribe({
        next: (workspace) => {
          this.workspace = workspace;
          this.selectedModuleCode =
            workspace.modules?.[0]?.code || this.selectedModuleCode;
          this.selectedCapabilityId =
            workspace.modules?.[0]?.drilldowns?.[0]?.capabilityId || '';
          this.workspaceLoading = false;
          if (this.selectedCapabilityId) {
            this.loadDrilldown(this.selectedModuleCode, this.selectedCapabilityId);
          }
        },
        error: () => {
          this.workspaceLoading = false;
          this.workspaceError = 'Could not load analytics workspace.';
        },
      });
  }

  selectModule(moduleCode: string): void {
    this.selectedModuleCode = moduleCode;
    this.selectedCapabilityId =
      this.selectedModule?.drilldowns?.[0]?.capabilityId || '';
    if (this.selectedCapabilityId) {
      this.loadDrilldown(this.selectedModuleCode, this.selectedCapabilityId);
    }
  }

  loadDrilldown(moduleCode: string, capabilityId: string): void {
    this.selectedModuleCode = moduleCode;
    this.selectedCapabilityId = capabilityId;
    this.drilldownLoading = true;
    this.collaborationService
      .getAnalyticsDrilldown({
        moduleCode,
        capabilityId,
        timeframe: this.timeframe,
        subscribedModules: this.workspace?.subscribedModules || this.availableModules,
      })
      .subscribe({
        next: (drilldown) => {
          this.drilldown = drilldown;
          this.drilldownLoading = false;
        },
        error: () => {
          this.drilldownLoading = false;
        },
      });
  }

  runAnalyticsChat(prompt?: string): void {
    const effectivePrompt = (prompt || this.chatPrompt).trim();
    if (!effectivePrompt) return;
    this.chatPrompt = effectivePrompt;
    this.chatLoading = true;
    this.collaborationService
      .chatAnalytics({
        prompt: effectivePrompt,
        moduleCode: this.selectedModuleCode,
        timeframe: this.timeframe,
        subscribedModules: this.workspace?.subscribedModules || this.availableModules,
        drillPath: this.drilldown?.title ? [this.drilldown.title] : [],
        autoFetch: false,
      })
      .subscribe({
        next: (response) => {
          this.chatResponse = response;
          this.chatLoading = false;
        },
        error: () => {
          this.chatLoading = false;
        },
      });
  }

  chartSeriesValue(index: number): number {
    return this.drilldown?.chart?.series?.[0]?.[index] || 0;
  }

  chartBarHeight(index: number): number {
    const current = this.chartSeriesValue(index);
    const values = this.drilldown?.chart?.series?.[0] || [];
    const max = Math.max(...values, 1);
    return Math.max(18, (current / max) * 180);
  }

  severityClass(severity?: string): string {
    return `severity-${(severity || 'info').toLowerCase()}`;
  }
}

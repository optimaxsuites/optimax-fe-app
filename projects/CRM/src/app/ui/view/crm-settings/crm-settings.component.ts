import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CrmApiService } from '../../service/crm-api.service';
import { Pipeline, PipelineStage } from '../../domain/crm.model';

@Component({
  selector: 'app-crm-settings',
  templateUrl: './crm-settings.component.html',
  styleUrls: ['./crm-settings.component.scss'],
})
export class CrmSettingsComponent implements OnInit {
  activeTab = 'pipeline';
  loading$ = new BehaviorSubject(true);

  pipelines: Pipeline[] = [];
  activePipeline: Pipeline | null = null;
  stages: PipelineStage[] = [];

  // new stage inline form
  newStageName = '';
  newStageProb: number | null = null;
  newStageColor = '#25925B';

  constructor(private api: CrmApiService, private snack: MatSnackBar) {}

  ngOnInit() { this.loadPipelines(); }

  loadPipelines() {
    this.loading$.next(true);
    this.api.getPipelines().subscribe({
      next: (data) => {
        this.pipelines = data || [];
        if (this.pipelines.length) this.selectPipeline(this.pipelines[0]);
        this.loading$.next(false);
      },
      error: () => this.loading$.next(false),
    });
  }

  selectPipeline(p: Pipeline) {
    this.activePipeline = p;
    this.stages = p.stages ? [...p.stages] : [];
  }

  addStage() {
    if (!this.newStageName.trim() || !this.activePipeline?.id) return;
    const stage: PipelineStage = {
      pipelineId: this.activePipeline.id,
      name: this.newStageName.trim(),
      probability: this.newStageProb ?? undefined,
      color: this.newStageColor,
      stageOrder: this.stages.length + 1,
    };
    this.api.createStage(stage).subscribe({
      next: () => {
        this.snack.open('Stage added', 'Close', { duration: 3000 });
        this.newStageName = '';
        this.newStageProb = null;
        this.loadPipelines();
      },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  removeStage(stage: PipelineStage) {
    if (!stage.id || !confirm(`Delete stage "${stage.name}"?`)) return;
    this.api.deleteStage(stage.id).subscribe({
      next: () => { this.snack.open('Stage removed', 'Close', { duration: 3000 }); this.loadPipelines(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  saveSettings() {
    this.snack.open('Settings saved', 'Close', { duration: 2500 });
  }
}

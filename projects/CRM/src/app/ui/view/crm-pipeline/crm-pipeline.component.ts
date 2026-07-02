import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import { CrmApiService } from '../../service/crm-api.service';
import { Deal, Pipeline, PipelineStage } from '../../domain/crm.model';
import { SAMPLE_PIPELINES } from '../../service/crm-sample-data';

interface StageColumn {
  stage: PipelineStage;
  deals: Deal[];
}

@Component({
  selector: 'app-crm-pipeline',
  templateUrl: './crm-pipeline.component.html',
  styleUrls: ['./crm-pipeline.component.scss'],
})
export class CrmPipelineComponent implements OnInit {
  loading$ = new BehaviorSubject(true);
  saving$ = new BehaviorSubject(false);
  pipelines: Pipeline[] = [];
  activePipeline: Pipeline | null = null;
  columns: StageColumn[] = [];
  showDealForm = false;
  targetStageId: number | null = null;
  dealForm!: FormGroup;

  constructor(
    private api: CrmApiService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    this.buildDealForm();
    this.loadPipelines();
  }

  buildDealForm() {
    this.dealForm = this.fb.group({
      title: [''],
      contactName: [''],
      accountName: [''],
      dealValue: [null],
      currency: ['NGN'],
      probability: [null],
      expectedClose: [null],
      ownerName: [''],
    });
  }

  loadPipelines() {
    this.loading$.next(true);
    this.pipelines = SAMPLE_PIPELINES;
    this.api.getPipelines().subscribe({
      next: (data) => { if (data?.length) this.pipelines = data; },
      error: () => {},
      complete: () => {
        if (this.pipelines.length) this.selectPipeline(this.pipelines[0]);
        else this.loading$.next(false);
      },
    });
  }

  selectPipeline(p: Pipeline) {
    this.activePipeline = p;
    this.loadDeals(p.id!);
  }

  loadDeals(pipelineId: number) {
    this.loading$.next(true);
    this.api.getDealsByPipeline(pipelineId).subscribe({
      next: (deals) => {
        const dealList = deals || [];
        this.columns = (this.activePipeline?.stages || []).map(stage => ({
          stage,
          deals: dealList.filter(d => d.stageId === stage.id),
        }));
      },
      error: () => {
        this.columns = (this.activePipeline?.stages || []).map(stage => ({ stage, deals: [] }));
      },
      complete: () => this.loading$.next(false),
    });
  }

  get columnIds(): string[] {
    return this.columns.map(c => `col-${c.stage.id}`);
  }

  drop(event: CdkDragDrop<Deal[]>, toCol: StageColumn) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      const deal = event.container.data[event.currentIndex];
      if (deal.id) {
        this.api.moveDealStage(deal.id, toCol.stage.id!, toCol.stage.name).subscribe({
          next: () => this.snack.open(`Moved to ${toCol.stage.name}`, 'Close', { duration: 2000 }),
          error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
        });
      }
    }
  }

  openDealForm(stageId: number) {
    this.targetStageId = stageId;
    this.dealForm.reset({ currency: 'NGN' });
    this.showDealForm = true;
  }

  closeDealForm() { this.showDealForm = false; this.targetStageId = null; }

  saveDeal() {
    const col = this.columns.find(c => c.stage.id === this.targetStageId);
    const payload: Deal = {
      ...this.dealForm.value,
      title: this.dealForm.value.title || 'New Deal',
      pipelineId: this.activePipeline?.id,
      pipelineName: this.activePipeline?.name,
      stageId: this.targetStageId,
      stageName: col?.stage.name,
      status: 'OPEN',
    };
    this.saving$.next(true);
    this.api.createDeal(payload).pipe(finalize(() => this.saving$.next(false))).subscribe({
      next: () => {
        this.snack.open('Deal created', 'Close', { duration: 3000 });
        this.closeDealForm();
        if (this.activePipeline?.id) this.loadDeals(this.activePipeline.id);
      },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  deleteDeal(deal: Deal) {
    if (!confirm(`Delete deal "${deal.title}"?`)) return;
    this.api.deleteDeal(deal.id!).subscribe({
      next: () => { this.snack.open('Deal deleted', 'Close', { duration: 3000 }); if (this.activePipeline?.id) this.loadDeals(this.activePipeline.id); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  columnTotal(col: StageColumn): string {
    const sum = col.deals.reduce((s, d) => s + (d.dealValue || 0), 0);
    return this.formatValue(sum);
  }

  get totalDeals(): number {
    return this.columns.reduce((sum, c) => sum + c.deals.length, 0);
  }

  formatValue(v?: number): string {
    if (!v) return '—';
    if (v >= 1_000_000) return '₦' + (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000) return '₦' + (v / 1_000).toFixed(1) + 'K';
    return '₦' + v.toLocaleString();
  }

  probBg(p?: number): string {
    if (!p) return '#f1f5f9';
    if (p >= 70) return '#dcfce7';
    if (p >= 40) return '#fef3c7';
    return '#fee2e2';
  }

  probColor(p?: number): string {
    if (!p) return '#94a3b8';
    if (p >= 70) return '#166534';
    if (p >= 40) return '#92400e';
    return '#dc2626';
  }
}

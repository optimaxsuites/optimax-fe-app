import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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

  // Pipeline management
  showManagePanel = false;
  pipelineForm!: FormGroup;
  stageForm!: FormGroup;
  stageEditForm!: FormGroup;
  editingStage: PipelineStage | null = null;
  savingPipeline$ = new BehaviorSubject(false);
  savingStage$ = new BehaviorSubject(false);

  constructor(
    private api: CrmApiService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    this.buildDealForm();
    this.buildPipelineForm();
    this.buildStageForm();
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

  buildPipelineForm() {
    this.pipelineForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
    });
  }

  buildStageForm() {
    this.stageForm = this.fb.group({
      name: ['', Validators.required],
      probability: [null],
      stageOrder: [null],
    });
    this.stageEditForm = this.fb.group({
      name: ['', Validators.required],
      probability: [null],
      stageOrder: [null],
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

  // ── Pipeline Management ──────────────────────────────────────────────────

  openManagePanel() {
    this.pipelineForm.reset();
    this.stageForm.reset();
    this.editingStage = null;
    this.showManagePanel = true;
  }

  closeManagePanel() { this.showManagePanel = false; }

  createPipeline() {
    if (this.pipelineForm.invalid) { this.pipelineForm.markAllAsTouched(); return; }
    const payload: Pipeline = { ...this.pipelineForm.value, stages: [] };
    this.savingPipeline$.next(true);
    this.api.createPipeline(payload).pipe(finalize(() => this.savingPipeline$.next(false))).subscribe({
      next: (p) => {
        this.snack.open(`Pipeline "${p.name}" created`, 'Close', { duration: 3000 });
        this.pipelineForm.reset();
        this.loadPipelines();
      },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  editCurrentPipeline() {
    if (!this.activePipeline) return;
    this.pipelineForm.patchValue({ name: this.activePipeline.name, description: this.activePipeline.description });
  }

  updatePipeline() {
    if (!this.activePipeline?.id || this.pipelineForm.invalid) { this.pipelineForm.markAllAsTouched(); return; }
    const payload: Pipeline = { ...this.activePipeline, ...this.pipelineForm.value };
    this.savingPipeline$.next(true);
    this.api.updatePipeline(this.activePipeline.id, payload).pipe(finalize(() => this.savingPipeline$.next(false))).subscribe({
      next: (p) => {
        this.snack.open(`Pipeline updated`, 'Close', { duration: 3000 });
        this.loadPipelines();
      },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  addStage() {
    if (this.stageForm.invalid) { this.stageForm.markAllAsTouched(); return; }
    const payload: PipelineStage = {
      ...this.stageForm.value,
      pipelineId: this.activePipeline?.id,
      stageOrder: this.stageForm.value.stageOrder || (this.activePipeline?.stages?.length || 0) + 1,
    };
    this.savingStage$.next(true);
    this.api.createStage(payload).pipe(finalize(() => this.savingStage$.next(false))).subscribe({
      next: () => {
        this.snack.open('Stage added', 'Close', { duration: 3000 });
        this.stageForm.reset();
        this.editingStage = null;
        this.loadPipelines();
      },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  startEditStage(stage: PipelineStage) {
    this.editingStage = stage;
    this.stageEditForm.patchValue({ name: stage.name, probability: stage.probability, stageOrder: stage.stageOrder });
  }

  saveStage() {
    if (!this.editingStage?.id || this.stageEditForm.invalid) { this.stageEditForm.markAllAsTouched(); return; }
    const payload: PipelineStage = { ...this.editingStage, ...this.stageEditForm.value };
    this.savingStage$.next(true);
    this.api.updateStage(this.editingStage.id, payload).pipe(finalize(() => this.savingStage$.next(false))).subscribe({
      next: () => {
        this.snack.open('Stage updated', 'Close', { duration: 3000 });
        this.stageEditForm.reset();
        this.editingStage = null;
        this.loadPipelines();
      },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  cancelStageEdit() { this.editingStage = null; this.stageEditForm.reset(); }

  removeStage(stage: PipelineStage) {
    if (!stage.id || !confirm(`Delete stage "${stage.name}"? Deals in this stage will need reassignment.`)) return;
    this.api.deleteStage(stage.id).subscribe({
      next: () => { this.snack.open('Stage deleted', 'Close', { duration: 3000 }); this.loadPipelines(); },
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

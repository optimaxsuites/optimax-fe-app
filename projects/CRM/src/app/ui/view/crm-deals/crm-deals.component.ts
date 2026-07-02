import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { BehaviorSubject, finalize } from 'rxjs';
import { CrmApiService } from '../../service/crm-api.service';
import { Deal, Pipeline } from '../../domain/crm.model';

@Component({
  selector: 'app-crm-deals',
  templateUrl: './crm-deals.component.html',
  styleUrls: ['./crm-deals.component.scss'],
})
export class CrmDealsComponent implements OnInit {
  loading$ = new BehaviorSubject(true);
  saving$ = new BehaviorSubject(false);
  dataSource = new MatTableDataSource<Deal>();
  displayedColumns = ['title', 'stageName', 'contactName', 'dealValue', 'probability', 'status', 'expectedClose', 'actions'];
  searchTerm = '';
  selectedStatus = '';
  showForm = false;
  editingDeal: Deal | null = null;
  form!: FormGroup;
  pipelines: Pipeline[] = [];

  statusOptions = ['OPEN', 'WON', 'LOST', 'ON_HOLD'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private api: CrmApiService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    this.buildForm();
    this.load();
    this.loadPipelines();
  }

  buildForm() {
    this.form = this.fb.group({
      title: ['', Validators.required],
      contactId: [null],
      contactName: [''],
      accountId: [null],
      accountName: [''],
      pipelineId: [null],
      pipelineName: [''],
      stageId: [null],
      stageName: [''],
      dealValue: [null],
      currency: ['NGN'],
      probability: [null],
      expectedClose: [null],
      status: ['OPEN'],
      ownerName: [''],
      lostReason: [''],
      tags: [''],
    });
  }

  loadPipelines() {
    this.api.getPipelines().subscribe({
      next: (data) => { if (data?.length) this.pipelines = data; },
      error: () => {},
    });
  }

  load() {
    this.loading$.next(true);
    this.dataSource.filterPredicate = (row, f) => {
      const q = f.toLowerCase();
      return (
        (row.title?.toLowerCase().includes(q) ||
        row.contactName?.toLowerCase().includes(q) ||
        row.stageName?.toLowerCase().includes(q)) ?? false
      );
    };
    this.api.getDeals(1, 200).subscribe({
      next: (data) => {
        let list = data || [];
        if (this.selectedStatus) list = list.filter((d) => d.status === this.selectedStatus);
        this.dataSource.data = list;
        this.loading$.next(false);
        setTimeout(() => (this.dataSource.paginator = this.paginator));
      },
      error: () => this.loading$.next(false),
    });
  }

  applySearch(term: string) {
    this.searchTerm = term;
    this.dataSource.filter = term.trim().toLowerCase();
  }

  applyStatusFilter() {
    this.load();
  }

  openForm(d?: Deal) {
    this.editingDeal = d || null;
    this.form.reset({ status: 'OPEN', currency: 'NGN' });
    if (d) {
      this.form.patchValue(d);
    }
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingDeal = null;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload: Deal = this.form.value;
    this.saving$.next(true);
    const op = this.editingDeal?.id
      ? this.api.updateDeal(this.editingDeal.id, payload)
      : this.api.createDeal(payload);

    op.pipe(finalize(() => this.saving$.next(false))).subscribe({
      next: () => {
        this.snack.open(`Deal ${this.editingDeal ? 'updated' : 'created'}`, 'Close', { duration: 3000 });
        this.closeForm();
        this.load();
      },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  delete(d: Deal) {
    if (!confirm(`Delete deal "${d.title}"?`)) return;
    this.api.deleteDeal(d.id!).subscribe({
      next: () => {
        this.snack.open('Deal deleted', 'Close', { duration: 3000 });
        this.load();
      },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  statusColor(s?: string): string {
    const map: Record<string, string> = {
      OPEN: '#6366f1',
      WON: '#10b981',
      LOST: '#ef4444',
      ON_HOLD: '#f59e0b',
    };
    return map[s || ''] || '#64748b';
  }

  formatValue(v?: number): string {
    if (v == null) return '—';
    if (v >= 1_000_000) return '₦' + (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000) return '₦' + (v / 1_000).toFixed(1) + 'K';
    return '₦' + v.toLocaleString('en-NG');
  }

  probabilityColor(p?: number): string {
    if (!p) return '#94a3b8';
    if (p >= 70) return '#10b981';
    if (p >= 40) return '#f59e0b';
    return '#ef4444';
  }
}

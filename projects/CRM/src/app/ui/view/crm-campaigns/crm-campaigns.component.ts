import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import { CrmApiService } from '../../service/crm-api.service';
import { Campaign } from '../../domain/crm.model';

@Component({
  selector: 'app-crm-campaigns',
  templateUrl: './crm-campaigns.component.html',
  styleUrls: ['./crm-campaigns.component.scss'],
})
export class CrmCampaignsComponent implements OnInit {
  loading$ = new BehaviorSubject(true);
  saving$ = new BehaviorSubject(false);
  campaigns: Campaign[] = [];
  showForm = false;
  editingCampaign: Campaign | null = null;
  form!: FormGroup;

  typeOptions = ['EMAIL', 'WHATSAPP', 'SMS', 'DRIP', 'WEBINAR', 'SOCIAL_MEDIA', 'DIRECT_MAIL', 'OTHER'];
  statusOptions = ['DRAFT', 'ACTIVE', 'SCHEDULED', 'PAUSED', 'COMPLETED'];

  typeIcons: Record<string, string> = {
    EMAIL: '📧', WHATSAPP: '💬', SMS: '📱', DRIP: '⚡',
    WEBINAR: '🎙', SOCIAL_MEDIA: '📢', DIRECT_MAIL: '📬', OTHER: '📣',
  };

  constructor(
    private api: CrmApiService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    this.buildForm();
    this.load();
  }

  buildForm() {
    this.form = this.fb.group({
      name: [''],
      campaignType: ['EMAIL'],
      status: ['DRAFT'],
      description: [''],
      targetAudience: [''],
      budget: [null],
      startDate: [null],
      endDate: [null],
      ownerName: [''],
      tags: [''],
    });
  }

  load() {
    this.loading$.next(true);
    this.api.getCampaigns(1, 100).subscribe({
      next: (data) => { this.campaigns = data || []; this.loading$.next(false); },
      error: () => this.loading$.next(false),
    });
  }

  openForm(c?: Campaign) {
    this.editingCampaign = c || null;
    this.form.reset({ campaignType: 'EMAIL', status: 'DRAFT' });
    if (c) this.form.patchValue(c);
    this.showForm = true;
  }

  closeForm() { this.showForm = false; this.editingCampaign = null; }

  save() {
    const payload: Campaign = this.form.value;
    this.saving$.next(true);
    const op = this.editingCampaign?.id
      ? this.api.updateCampaign(this.editingCampaign.id, payload)
      : this.api.createCampaign(payload);
    op.pipe(finalize(() => this.saving$.next(false))).subscribe({
      next: () => {
        this.snack.open(`Campaign ${this.editingCampaign ? 'updated' : 'created'}`, 'Close', { duration: 3000 });
        this.closeForm();
        this.load();
      },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  delete(c: Campaign) {
    if (!confirm(`Delete campaign "${c.name}"?`)) return;
    this.api.deleteCampaign(c.id!).subscribe({
      next: () => { this.snack.open('Campaign deleted', 'Close', { duration: 3000 }); this.load(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  icon(type?: string): string { return this.typeIcons[type || ''] || '📣'; }

  statusBadge(status?: string): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-neutral', ACTIVE: 'badge-success', SCHEDULED: 'badge-warning',
      PAUSED: 'badge-warning', COMPLETED: 'badge-info',
    };
    return `badge ${map[status || ''] || 'badge-neutral'}`;
  }

  formatBudget(v?: number): string {
    if (!v) return '—';
    if (v >= 1_000_000) return '₦' + (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000) return '₦' + (v / 1_000).toFixed(1) + 'K';
    return '₦' + v.toLocaleString();
  }
}

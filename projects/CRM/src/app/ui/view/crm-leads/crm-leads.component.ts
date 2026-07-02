import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import { CrmApiService } from '../../service/crm-api.service';
import { Lead } from '../../domain/crm.model';

@Component({
  selector: 'app-crm-leads',
  templateUrl: './crm-leads.component.html',
  styleUrls: ['./crm-leads.component.scss'],
})
export class CrmLeadsComponent implements OnInit {
  loading$ = new BehaviorSubject(true);
  saving$ = new BehaviorSubject(false);
  leads: Lead[] = [];
  filtered: Lead[] = [];
  searchTerm = '';
  statusFilter = '';
  sourceFilter = '';
  showForm = false;
  editingLead: Lead | null = null;
  form!: FormGroup;

  statusOptions = ['NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED'];
  sourceOptions = ['WEBSITE', 'REFERRAL', 'WHATSAPP', 'TRADE_SHOW', 'COLD_CALL', 'LINKEDIN', 'EVENT', 'DIRECT', 'OTHER'];

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
      firstName: [''],
      lastName: [''],
      email: [''],
      phone: [''],
      companyName: [''],
      jobTitle: [''],
      leadSource: ['WEBSITE'],
      status: ['NEW'],
      ownerName: [''],
      estimatedValue: [null],
      notes: [''],
      tags: [''],
    });
  }

  load() {
    this.loading$.next(true);
    this.api.getLeads(1, 200).subscribe({
      next: (data) => {
        this.leads = data || [];
        this.applyFilters();
        this.loading$.next(false);
      },
      error: () => this.loading$.next(false),
    });
  }

  applyFilters() {
    const q = this.searchTerm.toLowerCase();
    this.filtered = this.leads.filter(l => {
      const matchSearch = !q ||
        `${l.firstName} ${l.lastName}`.toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.companyName || '').toLowerCase().includes(q);
      const matchStatus = !this.statusFilter || l.status === this.statusFilter;
      const matchSource = !this.sourceFilter || l.leadSource === this.sourceFilter;
      return matchSearch && matchStatus && matchSource;
    });
  }

  openForm(l?: Lead) {
    this.editingLead = l || null;
    this.form.reset({ status: 'NEW', leadSource: 'WEBSITE' });
    if (l) this.form.patchValue(l);
    this.showForm = true;
  }

  closeForm() { this.showForm = false; this.editingLead = null; }

  save() {
    const payload: Lead = this.form.value;
    this.saving$.next(true);
    const op = this.editingLead?.id
      ? this.api.updateLead(this.editingLead.id, payload)
      : this.api.createLead(payload);
    op.pipe(finalize(() => this.saving$.next(false))).subscribe({
      next: () => {
        this.snack.open(`Lead ${this.editingLead ? 'updated' : 'created'}`, 'Close', { duration: 3000 });
        this.closeForm();
        this.load();
      },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  convert(l: Lead) {
    if (!confirm(`Convert ${l.firstName} ${l.lastName} to a Contact?`)) return;
    this.api.convertLead(l.id!).subscribe({
      next: () => { this.snack.open('Lead converted to contact', 'Close', { duration: 3000 }); this.load(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  delete(l: Lead) {
    if (!confirm(`Delete lead ${l.firstName} ${l.lastName}?`)) return;
    this.api.deleteLead(l.id!).subscribe({
      next: () => { this.snack.open('Lead deleted', 'Close', { duration: 3000 }); this.load(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  initials(l: Lead): string {
    return `${l.firstName?.[0] || ''}${l.lastName?.[0] || ''}`.toUpperCase();
  }

  avatarColor(l: Lead): string {
    const colors = ['#25925B','#2E6276','#f59e0b','#ec4899','#0ea5e9','#10b981','#6366f1'];
    return colors[(l.id || 0) % colors.length];
  }

  scoreClass(score?: number): string {
    if (!score) return 'low';
    if (score >= 80) return 'high';
    if (score >= 50) return 'med';
    return 'low';
  }

  statusBadgeClass(status?: string): string {
    const map: Record<string, string> = {
      NEW: 'badge-info', CONTACTED: 'badge-warning',
      QUALIFIED: 'badge-success', DISQUALIFIED: 'badge-danger',
    };
    return `badge ${map[status || ''] || 'badge-neutral'}`;
  }

  sourceClass(source?: string): string {
    const map: Record<string, string> = {
      REFERRAL: 'referral', WEBSITE: 'website', COLD_CALL: 'cold',
      EVENT: 'trade', TRADE_SHOW: 'trade', LINKEDIN: 'referral',
    };
    return `badge-source ${map[source || ''] || ''}`;
  }
}

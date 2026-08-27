import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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

  importing = false;
  importProgress = 0;
  importDone = 0;
  importErrors: string[] = [];
  showImportSummary = false;

  @ViewChild('leadsInput') leadsInputRef!: ElementRef<HTMLInputElement>;

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
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', Validators.email],
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
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
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

  importLeads() {
    this.leadsInputRef.nativeElement.value = '';
    this.leadsInputRef.nativeElement.click();
  }

  onLeadsFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const leads = this.parseCsv(e.target?.result as string);
      if (!leads.length) {
        this.snack.open('No valid rows found in CSV. Check column headers.', 'Close', { duration: 5000 });
        return;
      }
      this.runImport(leads);
    };
    reader.readAsText(file);
  }

  private parseCsv(csv: string): Partial<Lead>[] {
    const lines = csv.replace(/\r/g, '').split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ''));
    const colMap: Record<string, keyof Lead> = {
      firstname: 'firstName', first: 'firstName', fname: 'firstName',
      lastname: 'lastName', last: 'lastName', lname: 'lastName',
      email: 'email', emailaddress: 'email',
      phone: 'phone', mobile: 'phone', tel: 'phone',
      company: 'companyName', companyname: 'companyName', organisation: 'companyName',
      jobtitle: 'jobTitle', title: 'jobTitle', position: 'jobTitle',
      leadsource: 'leadSource', source: 'leadSource',
      status: 'status',
      estimatedvalue: 'estimatedValue', value: 'estimatedValue',
      owner: 'ownerName', ownername: 'ownerName',
      notes: 'notes', tags: 'tags',
    };
    const leads: Partial<Lead>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.every(v => !v.trim())) continue;
      const lead: Partial<Lead> = {};
      headers.forEach((h, idx) => {
        const field = colMap[h];
        if (field && values[idx]) (lead as any)[field] = values[idx].trim();
      });
      if (lead.firstName || lead.email) {
        lead.firstName = lead.firstName || 'Unknown';
        lead.lastName = lead.lastName || '';
        lead.status = (lead.status as string) || 'NEW';
        leads.push(lead);
      }
    }
    return leads;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
      current += ch;
    }
    result.push(current);
    return result;
  }

  private runImport(leads: Partial<Lead>[]) {
    this.importing = true;
    this.importProgress = 50;
    this.importDone = 0;
    this.importErrors = [];
    this.showImportSummary = false;
    this.snack.open(`Sending ${leads.length} leads to server…`, '', { duration: 2500 });
    this.api.bulkCreateLeads(leads as Lead[]).subscribe({
      next: (res) => {
        this.importing = false;
        this.importProgress = 100;
        this.importDone = res.created;
        this.importErrors = res.errors || [];
        this.showImportSummary = true;
        this.snack.open(`Import complete: ${res.created} created, ${res.failed} failed.`, 'Close', { duration: 6000 });
        this.load();
      },
      error: (e) => {
        this.importing = false;
        this.snack.open(`Import failed: ${e}`, 'Close', { duration: 5000 });
      },
    });
  }

  sourceClass(source?: string): string {
    const map: Record<string, string> = {
      REFERRAL: 'referral', WEBSITE: 'website', COLD_CALL: 'cold',
      EVENT: 'trade', TRADE_SHOW: 'trade', LINKEDIN: 'referral',
    };
    return `badge-source ${map[source || ''] || ''}`;
  }
}

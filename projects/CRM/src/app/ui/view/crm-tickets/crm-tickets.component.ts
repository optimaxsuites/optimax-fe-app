import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import { CrmApiService } from '../../service/crm-api.service';
import { Ticket } from '../../domain/crm.model';

@Component({
  selector: 'app-crm-tickets',
  templateUrl: './crm-tickets.component.html',
  styleUrls: ['./crm-tickets.component.scss'],
})
export class CrmTicketsComponent implements OnInit {
  loading$ = new BehaviorSubject(true);
  saving$ = new BehaviorSubject(false);
  tickets: Ticket[] = [];
  filtered: Ticket[] = [];
  statusFilter = '';
  priorityFilter = '';
  searchTerm = '';
  showForm = false;
  form!: FormGroup;

  statusOptions = ['OPEN', 'IN_PROGRESS', 'PENDING_CLIENT', 'RESOLVED', 'CLOSED'];
  priorityOptions = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  categoryOptions = ['BILLING', 'TECHNICAL', 'ONBOARDING', 'FEATURE_REQUEST', 'BUG', 'ACCESS_CONTROL', 'DATA_MIGRATION', 'OTHER'];

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
      subject: [''],
      description: [''],
      contactName: [''],
      accountName: [''],
      status: ['OPEN'],
      priority: ['MEDIUM'],
      category: ['TECHNICAL'],
      channel: ['EMAIL'],
    });
  }

  load() {
    this.loading$.next(true);
    this.api.getTickets(1, 100).subscribe({
      next: (data) => {
        this.tickets = data || [];
        this.applyFilters();
        this.loading$.next(false);
      },
      error: () => this.loading$.next(false),
    });
  }

  applyFilters() {
    const q = this.searchTerm.toLowerCase();
    this.filtered = this.tickets.filter(t => {
      const matchSearch = !q ||
        (t.subject || '').toLowerCase().includes(q) ||
        (t.accountName || '').toLowerCase().includes(q) ||
        (t.ticketNumber || '').toLowerCase().includes(q);
      const matchStatus = !this.statusFilter || t.status === this.statusFilter;
      const matchPriority = !this.priorityFilter || t.priority === this.priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }

  openForm() {
    this.form.reset({ status: 'OPEN', priority: 'MEDIUM', category: 'TECHNICAL', channel: 'EMAIL' });
    this.showForm = true;
  }

  closeForm() { this.showForm = false; }

  save() {
    const payload: Ticket = this.form.value;
    this.saving$.next(true);
    this.api.createTicket(payload).pipe(finalize(() => this.saving$.next(false))).subscribe({
      next: () => {
        this.snack.open('Ticket created', 'Close', { duration: 3000 });
        this.closeForm();
        this.load();
      },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  resolve(t: Ticket) {
    const resolution = prompt('Resolution notes:');
    if (resolution === null) return;
    this.api.resolveTicket(t.id!, resolution).subscribe({
      next: () => { this.snack.open('Ticket resolved', 'Close', { duration: 3000 }); this.load(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  close(t: Ticket) {
    if (!confirm('Close this ticket?')) return;
    this.api.closeTicket(t.id!).subscribe({
      next: () => { this.snack.open('Ticket closed', 'Close', { duration: 3000 }); this.load(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  delete(t: Ticket) {
    if (!confirm(`Delete ticket "${t.ticketNumber}"?`)) return;
    this.api.deleteTicket(t.id!).subscribe({
      next: () => { this.snack.open('Ticket deleted', 'Close', { duration: 3000 }); this.load(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  statusBadge(status?: string): string {
    const map: Record<string, string> = {
      OPEN: 'badge-warning', IN_PROGRESS: 'badge-info', PENDING_CLIENT: 'badge-purple',
      RESOLVED: 'badge-success', CLOSED: 'badge-neutral',
    };
    return `badge ${map[status || ''] || 'badge-neutral'}`;
  }

  priorityBadge(priority?: string): string {
    const map: Record<string, string> = {
      CRITICAL: 'badge-danger', HIGH: 'badge-warning', MEDIUM: 'badge-info', LOW: 'badge-neutral',
    };
    return `badge ${map[priority || ''] || 'badge-neutral'}`;
  }

  isBreaching(t: Ticket): boolean {
    if (!t.slaDueAt || ['RESOLVED', 'CLOSED'].includes(t.status || '')) return false;
    return (new Date(t.slaDueAt).getTime() - Date.now()) < 2 * 3600000;
  }

  slaPct(t: Ticket): number {
    if (!t.slaDueAt || !t.createdAt) return 10;
    const total = new Date(t.slaDueAt).getTime() - new Date(t.createdAt).getTime();
    const elapsed = Date.now() - new Date(t.createdAt).getTime();
    return Math.min(100, Math.round((elapsed / total) * 100));
  }

  slaFillClass(t: Ticket): string {
    const pct = this.slaPct(t);
    if (pct >= 85) return 'breach';
    if (pct >= 65) return 'warn';
    return 'ok';
  }

  slaRemaining(t: Ticket): string {
    if (!t.slaDueAt) return '—';
    const ms = new Date(t.slaDueAt).getTime() - Date.now();
    if (ms < 0) return 'Overdue';
    const hrs = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hrs >= 24) return `${Math.floor(hrs / 24)}d left`;
    return hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left`;
  }
}

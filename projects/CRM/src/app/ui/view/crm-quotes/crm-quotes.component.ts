import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import { CrmApiService } from '../../service/crm-api.service';
import { Quote } from '../../domain/crm.model';

@Component({
  selector: 'app-crm-quotes',
  templateUrl: './crm-quotes.component.html',
  styleUrls: ['./crm-quotes.component.scss'],
})
export class CrmQuotesComponent implements OnInit {
  loading$ = new BehaviorSubject(true);
  saving$ = new BehaviorSubject(false);
  quotes: Quote[] = [];
  showForm = false;
  editingQuote: Quote | null = null;
  form!: FormGroup;

  statusOptions = ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED'];

  constructor(
    private api: CrmApiService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    this.buildForm();
    this.load();
    const nav = history.state as { openForm?: boolean };
    if (nav?.openForm) {
      this.openForm();
    }
  }

  buildForm() {
    this.form = this.fb.group({
      title: ['', Validators.required],
      contactName: [''],
      accountName: [''],
      dealName: [''],
      status: ['DRAFT'],
      currency: ['NGN'],
      vatPercent: [7.5],
      discountAmount: [0],
      subtotal: [null],
      validUntil: [null],
      terms: [''],
      notes: [''],
      ownerName: [''],
    });
  }

  load() {
    this.loading$.next(true);
    this.api.getQuotes(1, 100).subscribe({
      next: (data) => { this.quotes = data || []; this.loading$.next(false); },
      error: () => this.loading$.next(false),
    });
  }

  openForm(q?: Quote) {
    this.editingQuote = q || null;
    this.form.reset({ status: 'DRAFT', currency: 'NGN', vatPercent: 7.5, discountAmount: 0 });
    if (q) this.form.patchValue(q);
    this.showForm = true;
  }

  closeForm() { this.showForm = false; this.editingQuote = null; }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const payload: Quote = this.form.value;
    this.saving$.next(true);
    const op = this.editingQuote?.id
      ? this.api.updateQuote(this.editingQuote.id, payload)
      : this.api.createQuote(payload);
    op.pipe(finalize(() => this.saving$.next(false))).subscribe({
      next: () => {
        this.snack.open(`Quote ${this.editingQuote ? 'updated' : 'created'}`, 'Close', { duration: 3000 });
        this.closeForm();
        this.load();
      },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  delete(q: Quote) {
    if (!confirm(`Delete quote "${q.quoteNumber || q.title}"?`)) return;
    this.api.deleteQuote(q.id!).subscribe({
      next: () => { this.snack.open('Quote deleted', 'Close', { duration: 3000 }); this.load(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  statusBadge(status?: string): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-info', SENT: 'badge-warning', VIEWED: 'badge-info',
      ACCEPTED: 'badge-success', REJECTED: 'badge-danger', EXPIRED: 'badge-danger',
    };
    return `badge ${map[status || ''] || 'badge-neutral'}`;
  }

  formatValue(v?: number): string {
    if (!v) return '—';
    if (v >= 1_000_000) return '₦' + (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000) return '₦' + (v / 1_000).toFixed(1) + 'K';
    return '₦' + v.toLocaleString();
  }

  isExpiringSoon(q: Quote): boolean {
    if (!q.validUntil) return false;
    const days = (new Date(q.validUntil).getTime() - Date.now()) / 86400000;
    return days > 0 && days < 7;
  }
}

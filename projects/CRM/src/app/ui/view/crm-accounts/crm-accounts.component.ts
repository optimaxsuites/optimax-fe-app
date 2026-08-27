import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import { CrmApiService } from '../../service/crm-api.service';
import { Account } from '../../domain/crm.model';

@Component({
  selector: 'app-crm-accounts',
  templateUrl: './crm-accounts.component.html',
  styleUrls: ['./crm-accounts.component.scss'],
})
export class CrmAccountsComponent implements OnInit {
  loading$ = new BehaviorSubject(true);
  saving$ = new BehaviorSubject(false);
  accounts: Account[] = [];
  filtered: Account[] = [];
  searchTerm = '';
  industryFilter = '';
  showForm = false;
  editingAccount: Account | null = null;
  form!: FormGroup;

  industryOptions = ['Banking','Manufacturing','Telecom','Insurance','Oil & Gas','Government','Technology','Healthcare','Retail','Finance'];

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
      name: ['', Validators.required],
      industry: [''],
      accountType: ['PROSPECT'],
      website: [''],
      phone: [''],
      email: [''],
      address: [''],
      city: [''],
      state: [''],
      country: ['Nigeria'],
      annualRevenue: [null],
      employeeCount: [null],
      ownerName: [''],
      tags: [''],
    });
  }

  load() {
    this.loading$.next(true);
    this.api.getAccounts(1, 200).subscribe({
      next: (data) => {
        this.accounts = data || [];
        this.applyFilters();
        this.loading$.next(false);
      },
      error: () => this.loading$.next(false),
    });
  }

  applyFilters() {
    const q = this.searchTerm.toLowerCase();
    this.filtered = this.accounts.filter(a => {
      const matchSearch = !q || (a.name || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q);
      const matchIndustry = !this.industryFilter || a.industry === this.industryFilter;
      return matchSearch && matchIndustry;
    });
  }

  openForm(a?: Account) {
    this.editingAccount = a || null;
    this.form.reset({ accountType: 'PROSPECT', country: 'Nigeria' });
    if (a) this.form.patchValue(a);
    this.showForm = true;
  }

  closeForm() { this.showForm = false; this.editingAccount = null; }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const payload: Account = this.form.value;
    this.saving$.next(true);
    const op = this.editingAccount?.id
      ? this.api.updateAccount(this.editingAccount.id, payload)
      : this.api.createAccount(payload);
    op.pipe(finalize(() => this.saving$.next(false))).subscribe({
      next: () => {
        this.snack.open(`Account ${this.editingAccount ? 'updated' : 'created'}`, 'Close', { duration: 3000 });
        this.closeForm();
        this.load();
      },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  delete(a: Account) {
    if (!confirm(`Delete account "${a.name}"?`)) return;
    this.api.deleteAccount(a.id!).subscribe({
      next: () => { this.snack.open('Account deleted', 'Close', { duration: 3000 }); this.load(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  initials(a: Account): string {
    return (a.name || '?').split(' ').map(w => w[0]).slice(0, 3).join('').toUpperCase();
  }

  avatarColor(a: Account): string {
    const colors = ['#e11d48','#f59e0b','#0ea5e9','#7c3aed','#10b981','#25925B','#2E6276','#ec4899'];
    return colors[(a.id || 0) % colors.length];
  }

  scoreClass(score?: number): string {
    if (!score) return 'low';
    if (score >= 80) return 'high';
    if (score >= 50) return 'med';
    return 'low';
  }

  importAccounts() { this.snack.open('Import Accounts — coming soon', 'OK', { duration: 3000 }); }

  formatRevenue(v?: number): string {
    if (!v) return '—';
    if (v >= 1_000_000_000) return '₦' + (v / 1_000_000_000).toFixed(1) + 'B';
    if (v >= 1_000_000) return '₦' + (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000) return '₦' + (v / 1_000).toFixed(1) + 'K';
    return '₦' + v.toLocaleString();
  }

  empSize(n?: number): string {
    if (!n) return '—';
    if (n >= 10000) return '10,000+';
    if (n >= 5000) return '5,000–10,000';
    if (n >= 1000) return '1,000–5,000';
    if (n >= 500) return '500–1,000';
    if (n >= 50) return '50–500';
    return '1–50';
  }
}

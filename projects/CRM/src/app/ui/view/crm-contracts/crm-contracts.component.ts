import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import { CrmApiService } from '../../service/crm-api.service';
import { Contract } from '../../domain/crm.model';

@Component({
  selector: 'app-crm-contracts',
  templateUrl: './crm-contracts.component.html',
  styleUrls: ['./crm-contracts.component.scss'],
})
export class CrmContractsComponent implements OnInit {
  loading$ = new BehaviorSubject(true);
  saving$ = new BehaviorSubject(false);
  contracts: Contract[] = [];
  showForm = false;
  editingContract: Contract | null = null;
  form!: FormGroup;

  statusOptions = ['DRAFT', 'UNDER_REVIEW', 'PENDING_SIGNATURE', 'ACTIVE', 'EXPIRED', 'TERMINATED'];

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
      title: ['', Validators.required],
      contactName: [''],
      accountName: [''],
      dealName: [''],
      status: ['DRAFT'],
      contractValue: [null],
      currency: ['NGN'],
      startDate: [null],
      endDate: [null],
      renewalDate: [null],
      autoRenew: [false],
      terms: [''],
      documentUrl: [''],
      ownerName: [''],
    });
  }

  load() {
    this.loading$.next(true);
    this.api.getContracts(1, 100).subscribe({
      next: (data) => { this.contracts = data || []; this.loading$.next(false); },
      error: () => this.loading$.next(false),
    });
  }

  openForm(c?: Contract) {
    this.editingContract = c || null;
    this.form.reset({ status: 'DRAFT', currency: 'NGN', autoRenew: false });
    if (c) this.form.patchValue(c);
    this.showForm = true;
  }

  closeForm() { this.showForm = false; this.editingContract = null; }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const payload: Contract = this.form.value;
    this.saving$.next(true);
    const op = this.editingContract?.id
      ? this.api.updateContract(this.editingContract.id, payload)
      : this.api.createContract(payload);
    op.pipe(finalize(() => this.saving$.next(false))).subscribe({
      next: () => {
        this.snack.open(`Contract ${this.editingContract ? 'updated' : 'created'}`, 'Close', { duration: 3000 });
        this.closeForm();
        this.load();
      },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  delete(c: Contract) {
    if (!confirm(`Delete contract "${c.contractNumber || c.title}"?`)) return;
    this.api.deleteContract(c.id!).subscribe({
      next: () => { this.snack.open('Contract deleted', 'Close', { duration: 3000 }); this.load(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  statusBadge(status?: string): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-neutral', UNDER_REVIEW: 'badge-orange', PENDING_SIGNATURE: 'badge-warning',
      ACTIVE: 'badge-success', EXPIRED: 'badge-danger', TERMINATED: 'badge-danger',
    };
    return `badge ${map[status || ''] || 'badge-neutral'}`;
  }

  formatValue(v?: number): string {
    if (!v) return '—';
    if (v >= 1_000_000) return '₦' + (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000) return '₦' + (v / 1_000).toFixed(1) + 'K';
    return '₦' + v.toLocaleString();
  }

  renewingSoon(c: Contract): boolean {
    if (!c.renewalDate) return false;
    const days = (new Date(c.renewalDate).getTime() - Date.now()) / 86400000;
    return days > 0 && days < 90;
  }
}

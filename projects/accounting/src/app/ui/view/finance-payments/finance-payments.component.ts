import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DisbursementService } from '../../../services/disbursement.service';
import { AccountingTransactionDTO } from '../../domain/accounting.dto';

@Component({
  selector: 'app-finance-payments',
  templateUrl: './finance-payments.component.html',
  styleUrls: ['./finance-payments.component.scss'],
})
export class FinancePaymentsComponent implements OnInit, OnDestroy {
  activeFilter = 'all';
  wizardStep = 1;
  loading = false;

  allTransactions: AccountingTransactionDTO[] = [];
  private subs = new Subscription();

  constructor(private disbursementService: DisbursementService) {}

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  load(): void {
    this.loading = true;
    const module = this.activeFilter === 'all' ? undefined : this.activeFilter;
    this.subs.add(
      this.disbursementService.getApprovedTransactions(module).subscribe({
        next: res => { this.allTransactions = res.content; this.loading = false; },
        error: () => { this.loading = false; }
      })
    );
  }

  setFilter(f: string): void {
    this.activeFilter = f;
    this.load();
  }

  setStep(s: number): void { this.wizardStep = s; }

  get requests(): AccountingTransactionDTO[] { return this.allTransactions; }

  get totalAwaiting(): number {
    return this.allTransactions.reduce((s, t) => s + (t.amount ?? 0), 0);
  }

  get requiresSecondAuth(): number {
    return this.allTransactions.filter(t => (t.amount ?? 0) >= 500_000).length;
  }

  formatNgn(val: number): string {
    return '₦' + (val ?? 0).toLocaleString();
  }

  displayName(t: AccountingTransactionDTO): string {
    return t.description
      || t.metadata?.memberName
      || t.metadata?.employeeName
      || `TXN-${t.id}`;
  }

  displayMeta(t: AccountingTransactionDTO): string {
    return [t.sourceModule, t.metadata?.groupName || t.metadata?.purpose]
      .filter(Boolean).join(' · ');
  }

  avatarText(t: AccountingTransactionDTO): string {
    return this.displayName(t).split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  moduleClass(m: string): string {
    return ({ HR: 'payroll', EXPENSE: 'expense', BANK: 'vendor', HOSPITALITY: 'loans', MARKETPLACE: 'loans' } as any)[m] || '';
  }

  avatarClass(m: string): string {
    return ({ HR: 'payroll-bg', EXPENSE: 'expense-bg', BANK: 'vendor-bg', HOSPITALITY: 'loans-bg' } as any)[m] || '';
  }

  tagClass(m: string): string {
    return ({ HR: 'payroll-tag', EXPENSE: 'expense-tag', BANK: 'vendor-tag', HOSPITALITY: 'loans-tag' } as any)[m] || '';
  }

  parseDate(d: any): Date {
    if (Array.isArray(d)) return DisbursementService.parseJavaDate(d);
    return new Date(d);
  }
}

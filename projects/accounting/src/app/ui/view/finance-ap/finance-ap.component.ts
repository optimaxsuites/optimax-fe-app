import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { DisbursementService } from '../../../services/disbursement.service';
import { AccountingTransactionDTO, SourceModule, TransactionReviewStatus } from '../../domain/accounting.dto';
import { downloadCsv } from '../../sharedComponent/export.util';

@Component({
  selector: 'app-finance-ap',
  templateUrl: './finance-ap.component.html',
  styleUrls: ['./finance-ap.component.scss'],
})
export class FinanceApComponent implements OnInit, OnDestroy {
  bills: AccountingTransactionDTO[] = [];
  loading = false;
  activeFilter = 'all';

  private subs = new Subscription();

  constructor(
    private disbursementService: DisbursementService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  load(): void {
    this.loading = true;
    const module = this.activeFilter === 'all' ? undefined : this.activeFilter;
    this.subs.add(
      this.disbursementService.getApprovedTransactions(module).subscribe({
        next: res => {
          // AP = expense/vendor-side transactions
          const apModules: string[] = [SourceModule.EXPENSE, SourceModule.HR];
          this.bills = res.content.filter(t =>
            apModules.includes(t.sourceModule as string) ||
            t.metadata?.apBill ||
            t.metadata?.billType === 'AP'
          );
          this.loading = false;
        },
        error: () => { this.loading = false; }
      })
    );
  }

  setFilter(f: string): void {
    this.activeFilter = f;
    this.load();
  }

  ageDays(t: AccountingTransactionDTO): number {
    const d = Array.isArray(t.transactionDate)
      ? DisbursementService.parseJavaDate(t.transactionDate as number[])
      : new Date(t.transactionDate as string);
    return Math.floor((Date.now() - d.getTime()) / 86_400_000);
  }

  isDueToday(t: AccountingTransactionDTO): boolean { return this.ageDays(t) === 0; }
  isDueThisWeek(t: AccountingTransactionDTO): boolean { return this.ageDays(t) <= 7; }

  billStatusLabel(t: AccountingTransactionDTO): string {
    if (t.status === TransactionReviewStatus.DISBURSED) return 'PAID';
    if (this.ageDays(t) > 0 && t.status !== TransactionReviewStatus.APPROVED) return 'OVERDUE';
    if (t.status === TransactionReviewStatus.APPROVED) return 'APPROVED';
    return 'PENDING';
  }

  billStatusClass(t: AccountingTransactionDTO): string {
    const label = this.billStatusLabel(t);
    if (label === 'PAID')     return 'badge-green';
    if (label === 'OVERDUE')  return 'badge-red';
    if (label === 'APPROVED') return 'badge-amber';
    return 'badge-gray';
  }

  displayVendor(t: AccountingTransactionDTO): string {
    return t.metadata?.vendorName || t.metadata?.employeeName || t.description || `TXN-${t.id}`;
  }

  formatNgn(val: number): string {
    return '₦' + (val ?? 0).toLocaleString();
  }

  formatDate(d: any): string {
    const date = Array.isArray(d)
      ? DisbursementService.parseJavaDate(d)
      : new Date(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  payNow(t: AccountingTransactionDTO): void {
    const uuid = this.route.snapshot.params['uuid'];
    this.router.navigateByUrl(`/admin/accounting/payments/${uuid}`);
  }

  get totalAP(): number     { return this.bills.reduce((s, t) => s + (t.amount ?? 0), 0); }
  get dueToday(): number    { return this.bills.filter(t => this.isDueToday(t)).reduce((s, t) => s + t.amount, 0); }
  get dueThisWeek(): number { return this.bills.filter(t => this.isDueThisWeek(t)).reduce((s, t) => s + t.amount, 0); }
  get paidCount(): number   { return this.bills.filter(t => t.status === TransactionReviewStatus.DISBURSED).length; }

  get overdueCount(): number { return this.bills.filter(t => this.billStatusLabel(t) === 'OVERDUE').length; }
  get dueTodayCount(): number { return this.bills.filter(t => this.isDueToday(t) && this.billStatusLabel(t) !== 'PAID').length; }

  exportCsv(): void {
    const headers = ['Reference', 'Vendor / Employee', 'Module', 'Date', 'Amount', 'Status'];
    const rows = this.bills.map(b => [
      b.transactionReference,
      this.displayVendor(b),
      b.sourceModule,
      this.formatDate(b.transactionDate),
      b.amount,
      this.billStatusLabel(b),
    ]);
    downloadCsv(`accounts-payable-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  get insightText(): string {
    if (this.loading) return 'Loading payables…';
    const n = this.bills.length;
    if (!n) return 'No payable bills found. Bills are generated when expense or HR disbursement requests are approved.';
    const parts: string[] = [`${n} bill${n !== 1 ? 's' : ''} · ₦${this.totalAP.toLocaleString()} total AP`];
    if (this.overdueCount > 0) parts.push(`⚠ ${this.overdueCount} overdue`);
    if (this.dueTodayCount > 0) parts.push(`${this.dueTodayCount} due today`);
    if (this.paidCount > 0) parts.push(`${this.paidCount} paid`);
    const action = this.overdueCount > 0
      ? ` → Process ${this.overdueCount} overdue bill${this.overdueCount > 1 ? 's' : ''} immediately to avoid supplier disputes.`
      : this.dueTodayCount > 0
        ? ` → ${this.dueTodayCount} payment${this.dueTodayCount > 1 ? 's' : ''} due today. Use Pay Now to process.`
        : ' → No urgent bills. Payables are current.';
    return parts.join(' · ') + action;
  }
}

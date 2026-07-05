import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountingService } from '../../../services/accounting.service';
import { AccountingTransactionDTO, SourceModule, TransactionReviewStatus } from '../../domain/accounting.dto';
import { DisbursementService } from '../../../services/disbursement.service';
import { downloadCsv } from '../../sharedComponent/export.util';

@Component({
  selector: 'app-finance-ar',
  templateUrl: './finance-ar.component.html',
  styleUrls: ['./finance-ar.component.scss'],
})
export class FinanceArComponent implements OnInit, OnDestroy {
  invoices: AccountingTransactionDTO[] = [];
  totalSize = 0;
  page = 0;
  pageSize = 20;
  loading = false;

  private subs = new Subscription();

  constructor(
    private accountingService: AccountingService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  load(): void {
    this.loading = true;
    this.subs.add(
      this.accountingService.getTransactions(this.page, this.pageSize).subscribe({
        next: res => {
          // AR = income-generating transactions (SALES, POS, MARKETPLACE, HOSPITALITY source modules)
          const arModules: string[] = [SourceModule.POS, SourceModule.HOSPITALITY, SourceModule.MARKETPLACE];
          this.invoices = res.content.filter(t =>
            arModules.includes(t.sourceModule as string) ||
            t.metadata?.invoiceType === 'AR' ||
            t.metadata?.arInvoice
          );
          this.totalSize = res.totalSize;
          this.loading = false;
        },
        error: () => { this.loading = false; }
      })
    );
  }

  ageDays(t: AccountingTransactionDTO): number {
    const d = Array.isArray(t.transactionDate)
      ? DisbursementService.parseJavaDate(t.transactionDate as number[])
      : new Date(t.transactionDate as string);
    return Math.floor((Date.now() - d.getTime()) / 86_400_000);
  }

  ageBucket(t: AccountingTransactionDTO): string {
    const days = this.ageDays(t);
    if (days < 30)  return 'CURRENT';
    if (days < 60)  return '30-60 DAYS';
    if (days < 90)  return '60-90 DAYS';
    return '90+ DAYS';
  }

  ageBadgeClass(t: AccountingTransactionDTO): string {
    const bucket = this.ageBucket(t);
    if (bucket === 'CURRENT')    return 'badge-green';
    if (bucket === '30-60 DAYS') return 'badge-amber';
    if (bucket === '60-90 DAYS') return 'badge-orange';
    return 'badge-red';
  }

  statusBadgeClass(status: string): string {
    if (status === TransactionReviewStatus.APPROVED || status === 'PAID') return 'badge-green';
    if (status === TransactionReviewStatus.REJECTED)                       return 'badge-red';
    return 'badge-amber';
  }

  displayLabel(status: string): string {
    if (status === TransactionReviewStatus.APPROVED) return 'PAID';
    if (status === TransactionReviewStatus.REJECTED) return 'CANCELLED';
    return 'PENDING';
  }

  isOutstanding(t: AccountingTransactionDTO): boolean {
    return t.status !== TransactionReviewStatus.APPROVED && t.status !== ('DISBURSED' as any);
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

  get totalAR(): number { return this.invoices.reduce((s, t) => s + (t.amount ?? 0), 0); }
  get current(): number { return this.invoices.filter(t => this.ageDays(t) < 30).reduce((s, t) => s + (t.amount ?? 0), 0); }
  get days30(): number  { return this.invoices.filter(t => this.ageDays(t) >= 30 && this.ageDays(t) < 60).reduce((s, t) => s + (t.amount ?? 0), 0); }
  get days60(): number  { return this.invoices.filter(t => this.ageDays(t) >= 60 && this.ageDays(t) < 90).reduce((s, t) => s + (t.amount ?? 0), 0); }
  get days90(): number  { return this.invoices.filter(t => this.ageDays(t) >= 90).reduce((s, t) => s + (t.amount ?? 0), 0); }

  recordPayment(t: AccountingTransactionDTO): void {
    const uuid = this.route.snapshot.params['uuid'];
    this.router.navigateByUrl(`/admin/accounting/payments/${uuid}`);
  }

  prevPage(): void { if (this.page > 0) { this.page--; this.load(); } }
  nextPage(): void { if ((this.page + 1) * this.pageSize < this.totalSize) { this.page++; this.load(); } }

  exportCsv(): void {
    const headers = ['Reference', 'Description', 'Module', 'Date', 'Amount', 'Age Bucket', 'Status'];
    const rows = this.invoices.map(inv => [
      inv.transactionReference,
      inv.description || inv.metadata?.memberName || '',
      inv.sourceModule,
      this.formatDate(inv.transactionDate),
      inv.amount,
      this.ageBucket(inv),
      this.displayLabel(inv.status),
    ]);
    downloadCsv(`accounts-receivable-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  get outstandingCount(): number { return this.invoices.filter(t => this.isOutstanding(t)).length; }
  get aging30Plus(): number { return this.invoices.filter(t => this.ageDays(t) >= 30).reduce((s, t) => s + (t.amount ?? 0), 0); }

  get insightText(): string {
    if (this.loading) return 'Loading receivables…';
    const n = this.invoices.length;
    if (!n) return 'No receivable invoices found. AR is derived from POS, Hospitality and Marketplace transactions.';
    const parts: string[] = [`${n} invoice${n !== 1 ? 's' : ''} · ₦${this.totalAR.toLocaleString()} total`];
    parts.push(`₦${this.current.toLocaleString()} current`);
    if (this.aging30Plus > 0) parts.push(`⚠ ₦${this.aging30Plus.toLocaleString()} aging (30+ days)`);
    if (this.days90 > 0) parts.push(`🔴 ₦${this.days90.toLocaleString()} critical (90+ days)`);
    const action = this.days90 > 0
      ? ' → Escalate 90+ day overdue balances to collections immediately.'
      : this.aging30Plus > 0
        ? ' → Follow up on invoices over 30 days — consider sending payment reminders.'
        : ' → Receivables are current. No overdue balances.';
    return parts.join(' · ') + action;
  }
}

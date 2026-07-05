import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DisbursementService } from '../../../services/disbursement.service';
import { PaystackService, PaystackBalanceResponse } from '../../../services/paystack.service';
import { BankConnectionDTO, PaystackTransactionDTO, PaystackTransactionType } from '../../domain/accounting.dto';
import { formatFlexDate } from '../../sharedComponent/date.util';

@Component({
  selector: 'app-finance-banking',
  templateUrl: './finance-banking.component.html',
  styleUrls: ['./finance-banking.component.scss'],
})
export class FinanceBankingComponent implements OnInit, OnDestroy {
  activeTab = 'accounts';
  loading = false;

  bankConnections: BankConnectionDTO[] = [];
  paystackTxns: PaystackTransactionDTO[] = [];
  paystackBalance: PaystackBalanceResponse | null = null;

  readonly PaystackTransactionType = PaystackTransactionType;

  private subs = new Subscription();

  constructor(
    private disbursementService: DisbursementService,
    private paystackService: PaystackService
  ) {}

  ngOnInit(): void { this.loadAll(); }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  setTab(tab: string): void { this.activeTab = tab; }

  loadAll(): void {
    this.loading = true;

    this.subs.add(
      this.disbursementService.getBankConnections().subscribe({
        next: res => { this.bankConnections = res.content; },
        error: () => {}
      })
    );

    this.subs.add(
      this.paystackService.getBalance().subscribe({
        next: bal => { this.paystackBalance = bal; },
        error: () => {}
      })
    );

    this.subs.add(
      this.paystackService.getTransactions().subscribe({
        next: res => { this.paystackTxns = (res.data || []); this.loading = false; },
        error: () => { this.loading = false; }
      })
    );
  }

  formatNgn(val: number): string {
    if (!val) return '₦0';
    return '₦' + val.toLocaleString();
  }

  formatDate(d: any): string { return formatFlexDate(d); }

  providerInitials(name: string): string {
    return (name || 'BK').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  get totalBalance(): number {
    return (this.paystackBalance?.availableBalance ?? 0) / 100;
  }

  get insightText(): string {
    if (this.loading) return 'Connecting to bank data sources…';
    const conns = this.bankConnections.length;
    const active = this.bankConnections.filter(c => c.active).length;
    const bal = this.paystackBalance ? `Paystack balance: ₦${this.totalBalance.toLocaleString()}` : 'Paystack balance unavailable';
    const parts: string[] = [bal];
    if (conns > 0) parts.push(`${active} of ${conns} bank connection${conns !== 1 ? 's' : ''} active`);
    else parts.push('No bank accounts connected via Mono');
    if (this.paystackTxns.length > 0) parts.push(`${this.paystackTxns.length} recent transactions`);
    const action = conns === 0
      ? ' → Connect a bank account via Mono Open Banking to enable statement sync and reconciliation.'
      : active < conns
        ? ` → ${conns - active} connection${conns - active > 1 ? 's' : ''} inactive — check API credentials in Settings.`
        : ' → All bank connections active. Use Reconciliation tab to match statement lines to GL entries.';
    return parts.join(' · ') + action;
  }
}

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DisbursementService } from '../../../services/disbursement.service';
import { PaystackService, PaystackBalanceResponse } from '../../../services/paystack.service';
import { BankConnectionDTO, PaystackTransactionDTO, PaystackTransactionType } from '../../domain/accounting.dto';

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

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  providerInitials(name: string): string {
    return (name || 'BK').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  get totalBalance(): number {
    return (this.paystackBalance?.availableBalance ?? 0) / 100;
  }
}

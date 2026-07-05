import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountingService } from '../../../services/accounting.service';
import { AccountDTO, AccountType, PaginationResult } from '../../domain/accounting.dto';

@Component({
  selector: 'app-finance-coa',
  templateUrl: './finance-coa.component.html',
  styleUrls: ['./finance-coa.component.scss'],
})
export class FinanceCoaComponent implements OnInit, OnDestroy {
  accounts: AccountDTO[] = [];
  loading = false;
  searchQuery = '';
  filterType = '';

  expanded: { [key: number]: boolean } = {};

  readonly AccountType = AccountType;

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
      this.accountingService.getAccounts(0, 200).subscribe({
        next: (res: PaginationResult<AccountDTO>) => {
          this.accounts = res.content;
          this.loading = false;
        },
        error: () => { this.loading = false; }
      })
    );
  }

  get parentAccounts(): AccountDTO[] {
    const q = this.searchQuery.toLowerCase();
    return this.accounts.filter(a => {
      const isParent = !a.parentAccountId && !a.parentAccount;
      if (!isParent) return false;
      if (this.filterType && a.accountType !== this.filterType) return false;
      if (q && !a.accountName.toLowerCase().includes(q) && !String(a.accountCode).includes(q)) return false;
      return true;
    });
  }

  childrenOf(parent: AccountDTO): AccountDTO[] {
    return this.accounts.filter(a =>
      (a.parentAccount?.id ?? a.parentAccountId) === parent.id
    );
  }

  countByType(type: string): number {
    return this.accounts.filter(a => a.accountType === type).length;
  }

  normalBalance(type: AccountType): string {
    return [AccountType.ASSET, AccountType.EXPENSE].includes(type) ? 'Debit' : 'Credit';
  }

  typeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      ASSET: 'badge-blue', LIABILITY: 'badge-red', EQUITY: 'badge-purple',
      INCOME: 'badge-green', EXPENSE: 'badge-orange', COST_OF_SALES: 'badge-amber'
    };
    return map[type] || 'badge-gray';
  }

  toggle(id: number): void {
    this.expanded[id] = !this.expanded[id];
  }

  deleteAccount(account: AccountDTO): void {
    if (!confirm(`Delete account "${account.accountCode} — ${account.accountName}"? This cannot be undone.`)) return;
    this.subs.add(
      this.accountingService.deleteAccount(account.id).subscribe({
        next: () => { this.accounts = this.accounts.filter(a => a.id !== account.id); },
        error: (err) => { alert('Could not delete account: ' + (err?.error?.message || 'Server error')); }
      })
    );
  }

  navigateTo(segment: string): void {
    const uuid = this.route.snapshot.params['uuid'];
    this.router.navigateByUrl(`/admin/accounting/${segment}/${uuid}`);
  }
}

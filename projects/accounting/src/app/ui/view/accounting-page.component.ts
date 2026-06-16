import { Component, Type } from '@angular/core';
import { TransactionsComponent } from './transactions/transactions.component';
import { ChartOfAccountsComponent } from './chart-of-accounts/chart-of-accounts.component';
import { BankAccountOverviewComponent } from './bank-account-overview/bank-account-overview.component';
import { GeneralTransactionsComponent } from './general-transactions/general-transactions.component';
import { TransferFundsComponent } from './transfer-funds/transfer-funds.component';
import { SalesReconciliationComponent } from './sales-reconciliation/sales-reconciliation.component';
import { BankReconciliationComponent } from './bank-reconciliation/bank-reconciliation.component';
import { DisbursementComponent } from './disbursement/disbursement.component';
import { GeneralLedgerComponent } from './general-ledger/general-ledger.component';
import { BookKeepingComponent } from './book-keeping/book-keeping.component';
import { AccountingQueueComponent } from './accounting-queue/accounting-queue.component';
import { BankConnectionSettingsComponent } from './bank-connection-settings/bank-connection-settings.component';
import { DisbursementFlowComponent } from './disbursement/disbursement-flow/disbursement-flow.component';

export interface TabConfig {
  name: string;
  component: any;
  icon?: string;
  hasDropdown?: boolean;
  dropdownOptions?: DropdownOption[];
  role?: string
}

export interface DropdownOption {
  label: string;
  action: string;
  component: Type<any>;
}


@Component({
  selector: 'app-accounting-page',
  templateUrl: './accounting-page.component.html',
  styleUrls: ['./accounting-page.component.scss'],
})
export class AccountingPageComponent {

  tabsConfig: TabConfig[] = [
      {
        name: 'Accounting Transactions',
        component: AccountingQueueComponent,
        icon: 'pi pi-inbox'
      },

      {
        name: 'Chart of Accounts',
        component: ChartOfAccountsComponent,
        icon: 'pi pi-sitemap'
      },

      {
        name: 'Journal Entries',
        component: BookKeepingComponent,
        icon: 'pi pi-book'
      },

      {
        name: 'General Ledger',
        component: GeneralLedgerComponent,
        icon: 'pi pi-list'
      },

      {
        name: 'Payments',
        component: DisbursementComponent,
        icon: 'pi pi-wallet'
      },

      {
        name: 'Bank',
        component: BankAccountOverviewComponent,
        icon: 'pi pi-building'
      },

      {
        name: 'Settings',
        component: BankConnectionSettingsComponent,
        icon: 'pi pi-cog'
      },

      {
        name: 'Disburse',
        component: DisbursementFlowComponent,
        icon: 'pi pi-send'
      }
    ];
}

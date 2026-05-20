import { Component, Type } from '@angular/core';
import { ReconciliationComponent } from '../reconcillation/reconciliation.component';
import { SalesReconciliationComponent } from '../sales-reconciliation/sales-reconciliation.component';
import { BankTransactionsComponent } from '../bank-transactions/bank-transactions.component';

export interface TabConfig {
  name: string;
  component: any;
  hasDropdown?: boolean;
  dropdownOptions?: DropdownOption[];
  role?: string;
}

export interface DropdownOption {
  label: string;
  action: string;
  component: Type<any>;
}

@Component({
  selector: 'app-general-reconciliation',
  templateUrl: './general-reconciliation.component.html',
  styleUrl: './general-reconciliation.component.scss',
})
export class GeneralReconciliationComponent {
  tabsConfig: TabConfig[] = [
    {
      name: 'Bank Reconciliation',
      component: ReconciliationComponent,
    },

    {
      name: 'Sales Reconciliation',
      component: SalesReconciliationComponent,
    },

    {
      name: 'Bank Transactions',
      component: BankTransactionsComponent,
    },
  ];
}

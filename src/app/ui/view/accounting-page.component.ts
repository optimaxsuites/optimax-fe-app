import { Component, Type } from '@angular/core';
import { TransactionsComponent } from './transactions/transactions.component';
import { ChartOfAccountsComponent } from './chart-of-accounts/chart-of-accounts.component';
import { BankAccountOverviewComponent } from './bank-account-overview/bank-account-overview.component';
import { GeneralTransactionsComponent } from './general-transactions/general-transactions.component';
import { TransferFundsComponent } from './transfer-funds/transfer-funds.component';
import { SalesReconciliationComponent } from './sales-reconciliation/sales-reconciliation.component';
import { BankReconciliationComponent } from './bank-reconciliation/bank-reconciliation.component';
import { SmartAccountantAiComponent } from './smart-accountant-ai/smart-accountant-ai.component';

export interface TabConfig {
  name: string;
  component: any;
  icon?: string; // PrimeIcons class or Font Awesome class
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
        name: 'Transactions',
        component: TransactionsComponent,
        icon: 'pi pi-list'
      },

      {
        name: 'Journal Entries',
        component: GeneralTransactionsComponent,
        icon: 'pi pi-book'
      },

      {
        name: 'Transfers',
        component: TransferFundsComponent,
        icon: 'pi pi-arrow-right-arrow-left'
      },

      {
        name: 'Chart of Accounts',
        component: ChartOfAccountsComponent,
        icon: 'pi pi-chart-bar'
      },
      {
        name: 'Bank Account Overview',
        component: BankAccountOverviewComponent,
        icon: 'pi pi-building'
      },

      // {
      //   name: 'Sales Reconciliation',
      //   component: SalesReconciliationComponent,
      //   icon: 'pi pi-dollar'
      // },

      // {
      //   name: 'Bank Reconciliation',
      //   component: BankReconciliationComponent,
      //   icon: 'pi pi-briefcase'
      // },

      {
        name: 'Smart Accountant',
        component: SmartAccountantAiComponent,
        icon: 'pi pi-sparkles'
      },
      {
        name: 'Settings',
        component: SmartAccountantAiComponent,
        icon: 'pi pi-cog'
      }
      // { name: 'Products', component: QuotationComponent },
      // { name: 'Inventory', component: BookKeepingComponent },
  
      // {
      //   name: 'Settings',
      //   component: null,
      //   hasDropdown: true,
      //   dropdownOptions: [
      //     { label: 'Configurations', action: 'configurations', component: ConfigurationComponent },
      //     { label: 'Users', action: 'users', component: ManageUsersComponent }
      //   ]
      // }
    ];
  // constructor( private dialogRef: MatDialog ){}
  // openDialog(){
  //   this.dialogRef.open(InvoiceModalComponent)
  // }
}

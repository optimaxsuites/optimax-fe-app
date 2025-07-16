import { Component, Type } from '@angular/core';
import { TransactionsComponent } from './transactions/transactions.component';
import { ChartOfAccountsComponent } from './chart-of-accounts/chart-of-accounts.component';
import { BankAccountOverviewComponent } from './bank-account-overview/bank-account-overview.component';

export interface TabConfig {
  name: string;
  component: any;
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
      },

      {
        name: 'Chart of Accounts',
        component: ChartOfAccountsComponent
      },
      {
        name: 'Bank Account Overview',
        component: BankAccountOverviewComponent
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

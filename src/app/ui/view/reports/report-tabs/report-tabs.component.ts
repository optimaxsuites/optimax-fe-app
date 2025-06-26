import { Component, Type } from '@angular/core';
import { Router } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { AccountingReportsComponent } from '../../accounting-reports/accounting-reports.component';
import { BalanceSheetComponent } from '../balance-sheet/balance-sheet.component';
import { TaxSummaryComponent } from '../tax-summary/tax-summary.component';
import { CashFlowComponent } from '../cash-flow/cash-flow.component';
import { IncomeStatementComponent } from '../income-statement/income-statement.component';


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
  selector: 'app-report-tabs',
  templateUrl: './report-tabs.component.html',
  styleUrls: ['./report-tabs.component.scss']
})
export class  ReportTabsComponent {


    tabsConfig: TabConfig[] = [
        {
          name: 'Financial Statement',
          component: AccountingReportsComponent,
        },
  
        {
          name: 'Balance Sheet',
          component: BalanceSheetComponent
        },
        { name: 'Income Statement', component: IncomeStatementComponent },
        { name: 'Cash Flow', component: CashFlowComponent },
        { name: 'Tax Summary', component: TaxSummaryComponent },

    
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
  

}
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountingPageComponent } from './ui/view/accounting-page.component';
import { QuotationModalComponent } from './ui/view/quotation-modal/quotation-modal.component';
import { AccountingReportsComponent } from './ui/view/accounting-reports/accounting-reports.component';
import { BalanceSheetComponent } from './ui/view/reports/balance-sheet/balance-sheet.component';
import { IncomeStatementComponent } from './ui/view/reports/income-statement/income-statement.component';
import { CashFlowComponent } from './ui/view/reports/cash-flow/cash-flow.component';
import { TaxSummaryComponent } from './ui/view/reports/tax-summary/tax-summary.component';
import { ReportTabsComponent } from './ui/view/reports/report-tabs/report-tabs.component';


const routes: Routes = [
  {
    path: '',
    redirectTo: 'admin/accounting/transaction/dhwy7829iokdw',
    pathMatch: 'full',
  },
  {
      path: 'admin/accounting/transaction/:uuid',
      component: AccountingPageComponent,
    },
    {
      path: 'admin/quotation-form',
      component: QuotationModalComponent,
    },
    {
      path: 'admin/quotation-form/:id',
      component: QuotationModalComponent,
    },

     { 
      path: 'admin/accounting/reports/:uuid',
       component: ReportTabsComponent 
      },
  // { 
  //   path: 'admin/accounting/reports/balance-sheet',
  //    component: BalanceSheetComponent 
  //   },
  // {
  //    path: 'admin/accounting/reports/income-statement',
  //    component: IncomeStatementComponent
  //    },
  // {
  //    path: 'admin/accounting/reports/cash-flow',
  //     component: CashFlowComponent 
  //   },
  // { 
  //   path: 'admin/accounting/reports/tax-summary', 
  //   component: TaxSummaryComponent
  //  },
  // { path: '', redirectTo: '/reports', pathMatch: 'full' }

    
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

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
import { ReconcillationComponent } from './ui/view/reconcillation/reconcillation.component';


const routes: Routes = [
  {
    path: '',
    redirectTo: 'transaction/dhwy7829iokdw',
    pathMatch: 'full',
  },
  {
      path: 'transaction/:uuid',
      component: AccountingPageComponent,
    },
    {
      path: 'reconciliation/:uuid',
      component: ReconcillationComponent,
    },
    {
      path: 'admin/quotation-form/:id',
      component: QuotationModalComponent,
    },

  { path: 'reports', component: AccountingReportsComponent },
  { path: 'reports/balance-sheet', component: BalanceSheetComponent },
  { path: 'reports/income-statement', component: IncomeStatementComponent },
  { path: 'reports/cash-flow', component: CashFlowComponent },
  { path: 'reports/tax-summary', component: TaxSummaryComponent },
  // ...other routes
     { 
      path: 'reports/:uuid',
       component: ReportTabsComponent 
      },
  // { 
  //   path: 'reports/balance-sheet',
  //    component: BalanceSheetComponent 
  //   },
  // {
  //    path: 'reports/income-statement',
  //    component: IncomeStatementComponent
  //    },
  // {
  //    path: 'reports/cash-flow',
  //     component: CashFlowComponent 
  //   },
  // { 
  //   path: 'reports/tax-summary', 
  //   component: TaxSummaryComponent
  //  },
  // { path: '', redirectTo: '/reports', pathMatch: 'full' }

    
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

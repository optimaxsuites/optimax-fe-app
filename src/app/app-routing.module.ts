import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountingPageComponent } from './ui/view/accounting-page.component';
import { QuotationModalComponent } from './ui/view/quotation-modal/quotation-modal.component';
import { BudgetingForecastingComponent } from './ui/view/budgeting-forecasting/budgeting-forecasting.component';
import { AccountingReportsComponent } from './ui/view/accounting-reports/accounting-reports.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/admin/accounting/dhwy7829iokdw',
    pathMatch: 'full',
  },
  {
      path: 'admin/accounting/:uuid',
      component: AccountingPageComponent,
    },
    {
      path: 'AccountingReports',
      component: AccountingReportsComponent,
    },
    {
      path: 'quotation-form/:id',
      component: QuotationModalComponent,
    },
    
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

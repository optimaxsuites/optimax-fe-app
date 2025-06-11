import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountingPageComponent } from './ui/view/accounting-page.component';
import { QuotationModalComponent } from './ui/view/quotation-modal/quotation-modal.component';
import { AccountingReportsComponent } from './ui/view/accounting-reports/accounting-reports.component';

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
      path: 'admin/accounting/accounting-reports/:uuid',
      component: AccountingReportsComponent,
    },
    {
      path: 'quotation-form',
      component: QuotationModalComponent,
    },
    {
      path: 'quotation-form/:id',
      component: QuotationModalComponent,
    },
    
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

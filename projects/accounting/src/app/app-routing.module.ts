import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountingPageComponent } from './ui/view/accounting-page.component';
import { QuotationModalComponent } from './ui/view/quotation-modal/quotation-modal.component';

const routes: Routes = [
  {
      path: '',
      component: AccountingPageComponent,
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

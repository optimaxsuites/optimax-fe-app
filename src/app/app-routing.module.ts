import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PurchasePageComponent } from './ui/view/purchase-page.component';
import { RfqModalComponent } from './ui/view/rfq-modal/rfq-modal.component';

const routes: Routes = [

   {
        path: 'admin/purchase/:uuid',
        component: PurchasePageComponent,
      },

       {
        path: 'purchase/rfq-modal',
        component: RfqModalComponent,
      },
      {
        path: 'purchase/rfq-modal/:rfqId',
        component: RfqModalComponent
      },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

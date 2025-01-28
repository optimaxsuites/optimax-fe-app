import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PosPageComponent } from './ui/view/pos-page.component';
import { CloseRegisterComponent } from './ui/view/close-register/close-register.component';
import { OpenRegisterComponent } from './ui/view/open-register/open-register.component';
import { RequestDetailsComponent } from './ui/view/request-details/request-details.component';
import { OrderRefundComponent } from './ui/view/order-refund/order-refund.component';
import { OrderDetailComponent } from './ui/view/order-detail/order-detail.component';
import { CashPaymentComponent } from './ui/view/cash-payment/cash-payment.component';
import { CheckoutOrdersComponent } from './ui/view/checkout-orders/checkout-orders.component';
import { PosCheckoutPageComponent } from './ui/view/pos-checkout-page/pos-checkout-page.component';

const routes: Routes = [
  {path:  '',
    redirectTo: 'admin/pos/34567whr4567yhsdzr56',
    pathMatch: 'full'
  },
  {
    path: 'admin/pos/:uuid',
    component: PosPageComponent,
  },
  { path: '', loadChildren: () => import('./user/user.module').then(m => m.UserModule) },
 
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}

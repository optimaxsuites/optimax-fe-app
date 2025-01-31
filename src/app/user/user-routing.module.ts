import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CashPaymentComponent } from '../ui/view/cash-payment/cash-payment.component';
import { CheckoutOrdersComponent } from '../ui/view/checkout-orders/checkout-orders.component';
import { CloseRegisterComponent } from '../ui/view/close-register/close-register.component';
import { OpenRegisterComponent } from '../ui/view/open-register/open-register.component';
import { OrderDetailComponent } from '../ui/view/order-detail/order-detail.component';
import { OrderRefundComponent } from '../ui/view/order-refund/order-refund.component';
import { PosCheckoutPageComponent } from '../ui/view/pos-checkout-page/pos-checkout-page.component';
import { RequestDetailsComponent } from '../ui/view/request-details/request-details.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'user/checkout/34567whr4567yhsdzr56',
    pathMatch: 'full',
  },
  {
    path: 'user/checkout/orders/:uuid',
    component: CheckoutOrdersComponent,
  },
  {
    path: 'user/checkout/cash-payment/:uuid',
    component: CashPaymentComponent,
  },
  {
    path: 'user/checkout/order/:uuid',
    component: OrderDetailComponent,
  },
  {
    path: 'user/checkout/refund/:uuid',
    component: OrderRefundComponent,
  },
  {
    path: 'user/checkout/refund-request/:uuid',
    component: RequestDetailsComponent,
  },
  {
    path: 'user/checkout/openRegister/:uuid',
    component: OpenRegisterComponent,
  },
  {
    path: 'user/checkout/closeRegister/:uuid',
    component: CloseRegisterComponent,
  },
  {
    path: 'user/checkout/:uuid',
    component: PosCheckoutPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserRoutingModule {}

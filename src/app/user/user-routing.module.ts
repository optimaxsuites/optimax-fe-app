import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CashPaymentComponent } from '../ui/view/cash-payment/cash-payment.component';
import { CheckoutOrdersComponent } from '../ui/view/checkout-orders/checkout-orders.component';
import { OpenRegisterComponent } from '../ui/view/open-register/open-register.component';
import { OrderDetailComponent } from '../ui/view/order-detail/order-detail.component';
import { OrderRefundComponent } from '../ui/view/order-refund/order-refund.component';
import { PosCheckoutPageComponent } from '../ui/view/pos-checkout-page/pos-checkout-page.component';
import { RequestDetailsComponent } from '../ui/view/request-details/request-details.component';
import { CheckoutKitchenComponent } from '../ui/view/checkout-kitchen/checkout-kitchen.component';
import { KitchenOrderComponent } from '../ui/view/kitchen-order/kitchen-order.component';
import { HotelCheckoutComponent } from '../ui/view/hotel-checkout/hotel-checkout.component';
import { RefundComponent } from '../ui/view/refund/refund/refund.component';
import { PosStoreComponent } from '../ui/view/pos-store/pos-store.component';
import { PermissionGuard } from '../ui/permission/permission.guard';
import { StoreCheckoutComponent } from '../ui/view/pos-store/store-checkout/store-checkout.component';
import { OrderConfirmationComponent } from '../ui/view/pos-store/order-confirmation/order-confirmation.component';
import { ProductDetailsComponent } from '../ui/view/pos-store/product-details/product-details.component';
import { CategoryProductsComponent } from '../ui/view/pos-store/category-products/category-products.component';
import { VerificationRequiredComponent } from '../ui/view/verification-required/verification-required.component';
import { EmailVerificationComponent } from '../ui/view/pos-store/email-verification/email-verification.component';
import { ReturnsRefundsComponent } from '../ui/view/pos-store/returns-refunds/returns-refunds.component';
import { OrderHistoryComponent } from '../ui/view/pos-store/order-history/order-history.component';
// import { ProductDetailsComponent } from '../ui/view/pos-store/product-details/product-details.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: '34567whr4567yhsdzr56',
    pathMatch: 'full',
  },
  {
    path: 'orders/:uuid',
    component: CheckoutOrdersComponent,
    // canActivate: [PermissionGuard],
    // data: { appCode: ['POS_CHKOUT'] }
    // canActivate: [PermissionGuard],
    // data: { appCode: ['POS_CHKOUT'] }
  },
  {
    path: 'cash-payment/:uuid',
    component: CashPaymentComponent,
    // canActivate: [PermissionGuard],
    //   data: { appCode: ['POS_INV'] }
    // canActivate: [PermissionGuard],
    //   data: { appCode: ['POS_INV'] }
  },
  {
    path: 'order/:uuid',
    component: OrderDetailComponent,
    // canActivate: [PermissionGuard],
    //   data: { appCode: ['POS_CHKOUT', 'kitchen_order', 'kitchen_payment'] }
  },
  {
    path: 'refund/:uuid',
    component: OrderRefundComponent,
    // canActivate: [PermissionGuard],
    //   data: { appCode: ['POS_CHKOUT', 'kitchen_order', 'kitchen_payment'] }
  },
  {
    path: 'refund-request/:uuid',
    component: RequestDetailsComponent,
    // canActivate: [PermissionGuard],
    //   data: { appCode: ['POS_CHKOUT', 'kitchen_order', 'kitchen_payment'] }
    // canActivate: [PermissionGuard],
    //   data: { appCode: ['POS_CHKOUT', 'kitchen_order', 'kitchen_payment'] }
  },
  {
    path: 'openRegister/:uuid',
    component: OpenRegisterComponent,
    // canActivate: [PermissionGuard],
    //   data: { appCode: ['POS_CHKOUT'] }
    // canActivate: [PermissionGuard],
    //   data: { appCode: ['POS_CHKOUT'] }
  },
  {
    path: ':uuid',
    component: PosCheckoutPageComponent,
    // canActivate: [PermissionGuard],
    //   data: { appCode: ['POS_CHKOUT'] }
    // canActivate: [PermissionGuard],
    //   data: { appCode: ['POS_CHKOUT'] }
  },
  {
    path: 'kitchen/orders/:uuid',
    component: KitchenOrderComponent,
    // canActivate: [PermissionGuard],
    //   data: { appCode: ['kitchen_order', 'kitchen_payment'] }
    // canActivate: [PermissionGuard],
    //   data: { appCode: ['kitchen_order', 'kitchen_payment'] }
  },
  {
    path: 'kitchen/:uuid',
    component: CheckoutKitchenComponent,
    // canActivate: [PermissionGuard],
    //   data: { appCode: ['kitchen_order', 'kitchen_payment'] }
    // canActivate: [PermissionGuard],
    //   data: { appCode: ['kitchen_order', 'kitchen_payment'] }
  },
  {
    path: 'hotel/:uuid',
    component: HotelCheckoutComponent,
    // canActivate: [PermissionGuard],
    //   data: { appCode: ['HOP_ROOM'] }
    // canActivate: [PermissionGuard],
    //   data: { appCode: ['HOP_ROOM'] }
  },
  // {
  //   path: 'store/:uuid',
  //   component: PosStoreComponent,
  // },
  // {
  //   path: 'store/store-checkout',
  //   component: StoreCheckoutComponent,
  // },
  // {
  //   path: 'store/:uuid',
  //   component: PosStoreComponent,
    
  //   children: [
  //     {
  //       path: 'product-details/:id',
  //       component: ProductDetailsComponent,
  //     },
  //   ],
  // },

{
  path: 'store/:uuid',
  children: [
    {
      path: '',
      component: PosStoreComponent,
    },
    {
      path: 'checkout',
      component: StoreCheckoutComponent,
    },
    {
      path: 'order-confirmation/:id',
      component: OrderConfirmationComponent,
    },
    {
      path: 'product-details/:id',
      component: ProductDetailsComponent,
    },
    {
      path: 'order-history',
      component: OrderHistoryComponent
    },
    {
      path: 'category/:categoryName',  // ADD THIS ROUTE
      component: CategoryProductsComponent,
    },
  { path: 'store/:uuid/order-confirmation/:orderId', component: OrderConfirmationComponent },
    { path: 'verify-required', component: VerificationRequiredComponent },
  { path: 'verify-email', component: EmailVerificationComponent },
  { path: 'return-refund', component: ReturnsRefundsComponent}
  ]
}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserRoutingModule {}

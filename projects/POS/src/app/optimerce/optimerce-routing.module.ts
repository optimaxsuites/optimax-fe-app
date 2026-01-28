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
import { VerificationRequiredComponent } from '../ui/view/pos-store/verification-required/verification-required.component';
import { EmailVerificationComponent } from '../ui/view/pos-store/email-verification/email-verification.component';
import { ReturnsRefundsComponent } from '../ui/view/pos-store/returns-refunds/returns-refunds.component';
import { OrderHistoryComponent } from '../ui/view/pos-store/order-history/order-history.component';
import { CheckoutKitchenHistoryComponent } from '../ui/view/checkout-kitchen-history/checkout-kitchen-history.component';
import { CustomerCleanupComponent } from '../ui/view/pos-store/customer-cleanup/customer-cleanup.component';
// import { ProductDetailsComponent } from '../ui/view/pos-store/product-details/product-details.component';

const routes: Routes = [
  {
    path: 'customer-cleanup',
    component: CustomerCleanupComponent
  },
{
  path: ':uuid',
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
      runGuardsAndResolvers: 'paramsChange' 
    },
    {
      path: 'order-history',
      component: OrderHistoryComponent
    },
    {
      path: 'category/:categoryName',
      component: CategoryProductsComponent,
    },
    { path: 'store/:uuid/order-confirmation/:orderId', component: OrderConfirmationComponent },
    { path: 'verify-required', component: VerificationRequiredComponent },
    { path: 'verify-email', component: EmailVerificationComponent },
    { path: 'return-refund', component: ReturnsRefundsComponent},

  ]
}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OptimerceRoutingModule {}

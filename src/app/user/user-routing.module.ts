import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { CashPaymentComponent } from "../ui/view/cash-payment/cash-payment.component";
import { CheckoutOrdersComponent } from "../ui/view/checkout-orders/checkout-orders.component";
import { CloseRegisterComponent } from "../ui/view/close-register/close-register.component";
import { OpenRegisterComponent } from "../ui/view/open-register/open-register.component";
import { OrderDetailComponent } from "../ui/view/order-detail/order-detail.component";
import { OrderRefundComponent } from "../ui/view/order-refund/order-refund.component";
import { PosCheckoutPageComponent } from "../ui/view/pos-checkout-page/pos-checkout-page.component";
import { RequestDetailsComponent } from "../ui/view/request-details/request-details.component";
import { CheckoutKitchenComponent } from "../ui/view/checkout-kitchen/checkout-kitchen.component";
import { KitchenOrderComponent } from "../ui/view/kitchen-order/kitchen-order.component";
import { HotelCheckoutComponent } from "../ui/view/hotel-checkout/hotel-checkout.component";
import { PosStoreComponent } from "../ui/view/pos-store/pos-store.component";

const routes: Routes = [
  {
    path: "",
    redirectTo: "user/checkout/34567whr4567yhsdzr56",
    pathMatch: "full",
  },
  {
    path: "user/checkout/orders/:uuid",
    component: CheckoutOrdersComponent,
  },
  {
    path: "user/checkout/cash-payment/:uuid",
    component: CashPaymentComponent,
  },
  {
    path: "user/checkout/order/:uuid",
    component: OrderDetailComponent,
  },
  {
    path: "user/checkout/refund/:uuid",
    component: OrderRefundComponent,
  },
  {
    path: "user/checkout/refund-request/:uuid",
    component: RequestDetailsComponent,
  },
  {
    path: "user/checkout/openRegister/:uuid",
    component: OpenRegisterComponent,
  },
  {
    path: "user/checkout/closeRegister/:uuid",
    component: CloseRegisterComponent,
  },
  {
    path: "user/checkout/:uuid",
    component: PosCheckoutPageComponent,
  },
  {
    path: "user/checkout/kitchen/order/:uuid",
    component: KitchenOrderComponent,
  },
  {
    path: "user/checkout/kitchen/:uuid",
    component: CheckoutKitchenComponent,
  },
  {
    path: "user/checkout/hotel/:uuid",
    component: HotelCheckoutComponent,
  },
  {
    path: "user/store/:uuid",
    component: PosStoreComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserRoutingModule {}

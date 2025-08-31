import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { CashPaymentComponent } from "../ui/view/cash-payment/cash-payment.component";
import { CheckoutOrdersComponent } from "../ui/view/checkout-orders/checkout-orders.component";
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
    redirectTo: "34567whr4567yhsdzr56",
    pathMatch: "full",
  },
  {
    path: "orders/:uuid",
    component: CheckoutOrdersComponent,
  },
  {
    path: "cash-payment/:uuid",
    component: CashPaymentComponent,
  },
  {
    path: "order/:uuid",
    component: OrderDetailComponent,
  },
  {
    path: "refund/:uuid",
    component: OrderRefundComponent,
  },
  {
    path: "refund-request/:uuid",
    component: RequestDetailsComponent,
  },
  {
    path: "openRegister/:uuid",
    component: OpenRegisterComponent,
  },
  {
    path: ":uuid",
    component: PosCheckoutPageComponent,
  },
  {
    path: "kitchen/orders/:uuid",
    component: KitchenOrderComponent,
  },
  {
    path: "kitchen/:uuid",
    component: CheckoutKitchenComponent,
  },
  {
    path: "hotel/:uuid",
    component: HotelCheckoutComponent,
  },
  {
    path: "store/:uuid",
    component: PosStoreComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserRoutingModule {}

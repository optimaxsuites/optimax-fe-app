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
import { InventoryComponent } from './ui/view/inventory/inventory.component';
import { ViewInventoryComponent } from './ui/view/inventory/view-inventory/view-inventory.component';
import { EditInventoryComponent } from './ui/view/inventory/edit-inventory/edit-inventory.component';
import { InformationComponent } from './ui/view/inventory/information/information.component';
import { ProductsComponent } from './ui/view/products/products.component';
import { ReportDashboardComponent } from './ui/view/report-dashboard/report-dashboard.component';

import { RefundComponent } from './ui/view/refund/refund/refund.component';
import { SaleComponent } from './ui/view/sales/sale/sale.component';
import { AddIngredientComponent } from './ui/view/ingredient/add-ingredient/add-ingredient.component';
import { HotelCheckoutComponent } from './ui/view/hotel-checkout/hotel-checkout.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'admin/pos/product/34567whr4567yhsdzr56',
    pathMatch: 'full',
  },
  {
    path: 'admin/pos/product/:uuid',
    component: ProductsComponent,
  },

  {
    path: 'admin/pos/hotel-checkout/:uuid',
    component: HotelCheckoutComponent,
  },
  {
    path: 'admin/pos/inventory/:uuid',
    component: InventoryComponent,
  },
  {
    path: 'admin/pos/sale/:uuid',
    component: SaleComponent,
  },
  {
    path: 'admin/pos/report/:uuid',
    component: ReportDashboardComponent,
  },
  {
    path: 'admin/pos/refunds/:uuid',
    component: RefundComponent,
  },
  // {
  //   path: 'inventory',
  //   component: InventoryComponent,
  // },
  {
    path: 'view',
    component: ViewInventoryComponent,
  },
  {
    path: 'supplier-details',
    component: InformationComponent,
  },
  {
    path: 'add-ingredient',
    component: AddIngredientComponent,
  },
  // {
  //   path: 'add-inventory',
  //   component: AddInventoryComponent,
  // },

  // {
  //   path: '',
  //   loadChildren: () => import('./user/user.module').then((m) => m.UserModule),
  // },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

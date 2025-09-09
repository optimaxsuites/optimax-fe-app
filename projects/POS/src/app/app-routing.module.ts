import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PosPageComponent } from './ui/view/pos-page.component';
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
import { IngredientComponent } from './ui/view/ingredient/ingredient/ingredient.component';
import { AddIngredientComponent } from './ui/view/ingredient/add-ingredient/add-ingredient.component';
import { HotelCheckoutComponent } from './ui/view/hotel-checkout/hotel-checkout.component';
import { ViewIngredientsComponent } from './ui/view/ingredient/view-ingredients/view-ingredients.component';
import { EditIngredientsComponent } from './ui/view/ingredient/edit-ingredients/edit-ingredients.component';
import { SalesComponent } from './ui/view/sales/sales.component';
import { PermissionGuard } from './ui/permission/permission.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'product/34567whr4567yhsdzr56',
    pathMatch: 'full',
  },
  
  {
    path: 'product/:uuid',
    component: ProductsComponent,
    // canActivate: [PermissionGuard],
    // data: { appCode: ['POS_PDT'] }

  },
  {
    path: "refund-request/:uuid",
    component: RequestDetailsComponent,
      // canActivate: [PermissionGuard],
      //   data: { appCode: ['POS_CHKOUT', 'kitchen_order', 'kitchen_payment'] }
  },

  {
    path: 'inventory/:uuid',
    component: InventoryComponent,
    // canActivate: [PermissionGuard],
    // data: { appCode: ['POS_INV'] }
  },
  {
    path: 'sale/:uuid',
    component: SalesComponent,
    // canActivate: [PermissionGuard],
    // data: { appCode: ['POS_SALES'] }
  },
  {
  path: 'user/checkout/orders/:uuid',
  component: CheckoutOrdersComponent,
    // canActivate: [PermissionGuard],
    // data: { appCode: ['POS_CHKOUT'] }
},

  {
    path: 'report/:uuid',
    component: ReportDashboardComponent,
    // canActivate: [PermissionGuard],
    // data: { appCode: ['POS_REPRT'] }
  },
  {
    path: 'refunds/:uuid',
    component: RefundComponent,
    // canActivate: [PermissionGuard],
    // data: { appCode: ['POS_RFND'] }
  },
  {
    path : 'orderRefund/:uuid',
    component : OrderRefundComponent,
    // canActivate: [PermissionGuard],
    // data: { appCode: ['POS_RFND'] }
  },
  {
    path: 'ingredients/:uuid',
    component: IngredientComponent,
    // canActivate: [PermissionGuard],
    // data: { appCode: ['POS_ING'] }
  },
  // {
  //   path: 'inventory',
  //   component: InventoryComponent,
  // },
  {
    path: 'view',
    component: ViewInventoryComponent,
    // canActivate: [PermissionGuard],
    // data: { appCode: ['POS_INV'] }
  },
  {
    path: 'supplier-details',
    component: InformationComponent,
    // canActivate: [PermissionGuard],
    // data: { appCode: ['POS_INV'] }
  },
  {
    path: 'add-ingredient',
    component: AddIngredientComponent,
    // canActivate: [PermissionGuard],
    // data: { appCode: ['POS_ING'] }
  },
  {
    path: 'view-ingredient',
    component: ViewIngredientsComponent,
    // canActivate: [PermissionGuard],
    // data: { appCode: ['POS_ING'] }
  },
  {
    path: 'edit-ingredient',
    component: EditIngredientsComponent,
    // canActivate: [PermissionGuard],
    // data: { appCode: ['POS_ING'] }
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

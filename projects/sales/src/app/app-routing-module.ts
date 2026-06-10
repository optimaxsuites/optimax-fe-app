import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductRequestDetailComponent } from './ui/view/request-management/product-request-management/product-request-detail/product-request-detail.component';
import { ProductRequestFormComponent } from './ui/view/request-management/product-request-management/product-request-form/product-request-form.component';
import { ProductRequestListComponent } from './ui/view/request-management/product-request-management/product-request-list/product-request-list.component';
import { RequestManagementComponent } from './ui/view/request-management/request-management.component';
import { RequestEditFormComponent } from './ui/view/request-management/product-request-management/request-edit-form/request-edit-form.component';
import { DeliveryTrackingMapComponent } from './ui/view/request-management/product-request-management/delivery-tracking-map/delivery-tracking-map.component';
import { RequestDraftsComponent } from './ui/view/request-management/product-request-management/request-drafts/request-drafts.component';
import { ServiceRequestFormComponent } from './ui/view/request-management/service-request-management/service-request-form/service-request-form.component';
import { ServiceRequestDetailComponent } from './ui/view/request-management/service-request-management/service-request-detail/service-request-detail.component';
import { MultiItemRequestFormComponent } from './ui/view/request-management/product-request-management/multi-item-request-form/multi-item-request-form.component';
import { OrderDetailComponent } from './ui/view/request-management/product-request-management/order-detail/order-detail.component';
import { VendorPortalComponent } from './ui/view/vendor-portal/vendor-portal.component';

const routes: Routes = [
  // Procurement requests — specific segments before dynamic ones
  {
    path: 'commerce/requests/new',
    component: ProductRequestFormComponent,
  },
  {
    path: 'commerce/requests/drafts',
    component: RequestDraftsComponent,
  },
  {
    path: 'commerce/requests/:id/edit',
    component: RequestEditFormComponent,
  },
  {
    path: 'commerce/requests/:id/tracking',
    component: DeliveryTrackingMapComponent,
  },
  {
    path: 'commerce/requests/:id',
    component: ProductRequestDetailComponent,
  },
  // Sidebar entry point — UUID here satisfies UuidGuard on the parent admin/sales route
  {
    path: 'commerce/requests/home/:uuid',
    component: RequestManagementComponent,
  },

  // Vendor portal
  {
    path: 'vendor-portal/:uuid',
    component: VendorPortalComponent,
  },

  // Multi-item orders — with UUID for sidebar entry, without for internal nav
  {
    path: 'commerce/orders/new',
    component: MultiItemRequestFormComponent,
  },
  {
    path: 'commerce/orders/new/:uuid',
    component: MultiItemRequestFormComponent,
  },
  {
    path: 'commerce/orders/:id',
    component: OrderDetailComponent,
  },

  // Service requests
  {
    path: 'commerce/service-requests/new',
    component: ServiceRequestFormComponent,
  },
  {
    path: 'commerce/service-requests/:id/edit',
    component: ServiceRequestFormComponent,
  },
  {
    path: 'commerce/service-requests/:id',
    component: ServiceRequestDetailComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}

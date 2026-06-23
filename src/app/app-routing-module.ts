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
import { OrderDetailComponent } from './ui/view/request-management/product-request-management/order-detail/order-detail.component';
import { SalesDashboardComponent } from './ui/view/sales-hub/sales-dashboard/sales-dashboard.component';
import { SalesHubComponent } from './ui/view/sales-hub/sales-hub.component';
import { QuoteListComponent } from './ui/view/sales-hub/quotations/quote-list/quote-list.component';
import { QuoteFormComponent } from './ui/view/sales-hub/quotations/quote-form/quote-form.component';
import { QuoteDetailComponent } from './ui/view/sales-hub/quotations/quote-detail/quote-detail.component';
import { InvoiceListComponent } from './ui/view/sales-hub/invoices/invoice-list/invoice-list.component';
import { InvoiceFormComponent } from './ui/view/sales-hub/invoices/invoice-form/invoice-form.component';
import { InvoiceDetailComponent } from './ui/view/sales-hub/invoices/invoice-detail/invoice-detail.component';
import { VendorPortalComponent } from './ui/view/vendor-portal/vendor-portal.component';
import { CustomerFormComponent } from './ui/view/sales-hub/customer-management/customer-form/customer-form.component';
import { CustomerDetailComponent } from './ui/view/sales-hub/customer-management/customer-detail/customer-detail.component';
import { SalesOrdersDetailComponent } from './ui/view/sales-hub/sales-order/sales-orders-detail/sales-orders-detail.component';


export const routes: Routes = [
  // {
  //   path: "",
  //   redirectTo: 'commerce/requests',
  //   pathMatch: 'full'
  // },
  {
    path: '',
    redirectTo: '/admin/sales/sales-hub',
    pathMatch: 'full'
  },

  // --- Sales Hub ---
  {
    path: 'sales-hub',
    component: SalesHubComponent
  },
  {
    path: 'sales-hub/:uuid',
    component: SalesHubComponent
  },

  // --- Quotes ---
  {
    path: 'quotes/new',
    component: QuoteFormComponent
  },
  {
    path: 'quotes/new/:uuid',
    component: QuoteFormComponent
  },
  {
    path: 'quotes/:id',
    component: QuoteDetailComponent
  },
  {
    path: 'quotes/:id/:uuid',
    component: QuoteDetailComponent
  },
  {
    path: 'quotes/:id/edit',
    component: QuoteFormComponent
  },
  {
    path: 'quotes/:id/edit/:uuid',
    component: QuoteFormComponent
  },

  // --- Invoices ---
  {
    path: 'invoices/new',
    component: InvoiceFormComponent
  },
  {
    path: 'invoices/new/:uuid',
    component: InvoiceFormComponent
  },
  {
    path: 'invoices/:id',
    component: InvoiceDetailComponent
  },
  {
    path: 'invoices/:id/:uuid',
    component: InvoiceDetailComponent
  },
  {
    path: 'invoices/:id/edit',
    component: InvoiceFormComponent
  },
  {
    path: 'invoices/:id/edit/:uuid',
    component: InvoiceFormComponent
  },

  // --- Customers ---
  {
    path: 'customers/new',
    component: CustomerFormComponent
  },
  {
    path: 'customers/new/:uuid',
    component: CustomerFormComponent
  },
  {
    path: 'customers/:id',
    component: CustomerDetailComponent
  },
  {
    path: 'customers/:id/:uuid',
    component: CustomerDetailComponent
  },
  {
    path: 'customers/:id/edit',
    component: CustomerFormComponent
  },
  {
    path: 'customers/:id/edit/:uuid',
    component: CustomerFormComponent
  },

  // --- Sales Orders ---
  {
    path: 'orders/:id',
    component: SalesOrdersDetailComponent
  },
  {
    path: 'orders/:id/:uuid',
    component: SalesOrdersDetailComponent
  },

  // --- Other routes ---
  {
    path: 'commerce/requests',
    component: RequestManagementComponent
  },
  {
    path: 'commerce/requests/home/:uuid',
    component: RequestManagementComponent
  },
  {
    path: 'commerce/requests/new',
    component: ProductRequestFormComponent
  },
  {
    path: 'commerce/requests/drafts',
    component: RequestDraftsComponent
  },
  {
    path: 'commerce/requests/:id',
    component: ProductRequestDetailComponent
  },
  {
    path: 'commerce/requests/:id/edit',
    component: RequestEditFormComponent
  },
  {
    path: 'commerce/requests/:id/tracking',
    component: DeliveryTrackingMapComponent
  },
  {
    path: 'commerce/service-requests',
    component: RequestManagementComponent
  },
  {
    path: 'commerce/service-requests/new',
    component: ServiceRequestFormComponent
  },
  {
    path: 'commerce/service-requests/:id/edit',
    component: ServiceRequestFormComponent
  },
  {
    path: 'commerce/service-requests/:id',
    component: ServiceRequestDetailComponent
  },
  {
    path: 'commerce/orders/:id',
    component: OrderDetailComponent
  },
  {
    path: 'vendor-portal/:uuid',
    component: VendorPortalComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

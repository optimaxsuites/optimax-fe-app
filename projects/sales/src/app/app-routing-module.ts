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


const routes: Routes = [
  // {
  //   path: "",
  //   redirectTo: 'commerce/requests',
  //   pathMatch: 'full'
  // },
  {
    path: '',
    redirectTo: '/sales-hub',
    pathMatch: 'full'
  },
  
  // --- Sales Hub ---
  {
    path: 'sales-hub',
    component: SalesHubComponent
  },
  {
    path: 'admin/sales/sales-hub',
    component: SalesHubComponent
  },
  {
    path: 'admin/sales/sales-hub/:uuid',
    component: SalesHubComponent
  },

  // --- Quotes ---
  // {
  //   path: 'sales/quotes',
  //   component: QuoteListComponent
  // },
  // {
  //   path: 'sales/quotes/new',
  //   component: QuoteFormComponent
  // },
  // {
  //   path: 'sales/quotes/:id',
  //   component: QuoteDetailComponent
  // },
  // {
  //   path: 'sales/quotes/:id/edit',
  //   component: QuoteFormComponent
  // },
  // Admin routes
  // {
  //   path: 'admin/sales/sales/quotes',
  //   component: QuoteListComponent
  // },
  {
    path: 'admin/sales/sales/quotes/:uuid',
    component: QuoteListComponent
  },
  // {
  //   path: 'admin/sales/sales/quotes/new',
  //   component: QuoteFormComponent
  // },
  // {
  //   path: 'admin/sales/sales/quotes/new/:uuid',
  //   component: QuoteFormComponent
  // },
  // {
  //   path: 'admin/sales/sales/quotes/:id',
  //   component: QuoteDetailComponent
  // },
  // {
  //   path: 'admin/sales/sales/quotes/:id/:uuid',
  //   component: QuoteDetailComponent
  // },
  // {
  //   path: 'admin/sales/sales/quotes/:id/edit',
  //   component: QuoteFormComponent
  // },
  // {
  //   path: 'admin/sales/sales/quotes/:id/edit/:uuid',
  //   component: QuoteFormComponent
  // },

  // --- Invoices ---
  // {
  //   path: 'sales/invoices',
  //   component: InvoiceListComponent
  // },
  // {
  //   path: 'sales/invoices/new',
  //   component: InvoiceFormComponent
  // },
  // {
  //   path: 'sales/invoices/:id',
  //   component: InvoiceDetailComponent
  // },
  // {
  //   path: 'sales/invoices/:id/edit',
  //   component: InvoiceFormComponent
  // },
  // Admin routes
  // {
  //   path: 'admin/sales/sales/invoices',
  //   component: InvoiceListComponent
  // },
  // {
  //   path: 'admin/sales/sales/invoices/:uuid',
  //   component: InvoiceListComponent
  // },
  // {
  //   path: 'admin/sales/sales/invoices/new',
  //   component: InvoiceFormComponent
  // },
  // {
  //   path: 'admin/sales/sales/invoices/new/:uuid',
  //   component: InvoiceFormComponent
  // },
  // {
  //   path: 'admin/sales/sales/invoices/:id',
  //   component: InvoiceDetailComponent
  // },
  // {
  //   path: 'admin/sales/sales/invoices/:id/:uuid',
  //   component: InvoiceDetailComponent
  // },
  // {
  //   path: 'admin/sales/sales/invoices/:id/edit',
  //   component: InvoiceFormComponent
  // },
  // {
  //   path: 'admin/sales/sales/invoices/:id/edit/:uuid',
  //   component: InvoiceFormComponent
  // },

  // --- Other routes ---
  {
    path: 'commerce/requests',
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
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

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
    component: SalesHubComponent,
    data: { title: 'Sales Hub' }
  },
  {
    path: 'sales-hub/:uuid',
    component: SalesHubComponent,
    data: { title: 'Sales Hub' }
  },
  {
    path: 'admin/sales/sales-hub',
    component: SalesHubComponent,
    data: { title: 'Sales Hub' }
  },
  {
    path: 'admin/sales/sales-hub/:uuid',
    component: SalesHubComponent,
    data: { title: 'Sales Hub' }
  },

  // --- Quotes List ---
  {
    path: 'sales/quotes',
    component: QuoteListComponent
  },
  {
    path: 'sales/quotes/:uuid',
    component: QuoteListComponent
  },
  {
    path: 'admin/sales/sales/quotes',
    component: QuoteListComponent
  },
  {
    path: 'admin/sales/sales/quotes/:uuid',
    component: QuoteListComponent
  },
  {
    path: 'quotes',
    component: QuoteListComponent
  },
  {
    path: 'quotes/:uuid',
    component: QuoteListComponent
  },
  {
    path: 'admin/sales/quotes',
    component: QuoteListComponent
  },
  {
    path: 'admin/sales/quotes/:uuid',
    component: QuoteListComponent
  },

  // --- Quote Form (New) ---
  {
    path: 'sales/quotes/new',
    component: QuoteFormComponent
  },
  {
    path: 'sales/quotes/new/:uuid',
    component: QuoteFormComponent
  },
  {
    path: 'admin/sales/sales/quotes/new',
    component: QuoteFormComponent
  },
  {
    path: 'admin/sales/sales/quotes/new/:uuid',
    component: QuoteFormComponent
  },
  {
    path: 'quotes/new',
    component: QuoteFormComponent
  },
  {
    path: 'quotes/new/:uuid',
    component: QuoteFormComponent
  },
  {
    path: 'admin/sales/quotes/new',
    component: QuoteFormComponent
  },
  {
    path: 'admin/sales/quotes/new/:uuid',
    component: QuoteFormComponent
  },

  // --- Quote Detail ---
  {
    path: 'sales/quotes/:id',
    component: QuoteDetailComponent
  },
  {
    path: 'sales/quotes/:id/:uuid',
    component: QuoteDetailComponent
  },
  {
    path: 'admin/sales/sales/quotes/:id',
    component: QuoteDetailComponent
  },
  {
    path: 'admin/sales/sales/quotes/:id/:uuid',
    component: QuoteDetailComponent
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
    path: 'admin/sales/quotes/:id',
    component: QuoteDetailComponent
  },
  {
    path: 'admin/sales/quotes/:id/:uuid',
    component: QuoteDetailComponent
  },

  // --- Quote Form (Edit) ---
  {
    path: 'sales/quotes/:id/edit',
    component: QuoteFormComponent
  },
  {
    path: 'sales/quotes/:id/edit/:uuid',
    component: QuoteFormComponent
  },
  {
    path: 'admin/sales/sales/quotes/:id/edit',
    component: QuoteFormComponent
  },
  {
    path: 'admin/sales/sales/quotes/:id/edit/:uuid',
    component: QuoteFormComponent
  },
  {
    path: 'quotes/:id/edit',
    component: QuoteFormComponent
  },
  {
    path: 'quotes/:id/edit/:uuid',
    component: QuoteFormComponent
  },
  {
    path: 'admin/sales/quotes/:id/edit',
    component: QuoteFormComponent
  },
  {
    path: 'admin/sales/quotes/:id/edit/:uuid',
    component: QuoteFormComponent
  },

  // --- Invoices List ---
  {
    path: 'sales/invoices',
    component: InvoiceListComponent
  },
  {
    path: 'sales/invoices/:uuid',
    component: InvoiceListComponent
  },
  {
    path: 'admin/sales/sales/invoices',
    component: InvoiceListComponent
  },
  {
    path: 'admin/sales/sales/invoices/:uuid',
    component: InvoiceListComponent
  },
  {
    path: 'invoices',
    component: InvoiceListComponent
  },
  {
    path: 'invoices/:uuid',
    component: InvoiceListComponent
  },
  {
    path: 'admin/sales/invoices',
    component: InvoiceListComponent
  },
  {
    path: 'admin/sales/invoices/:uuid',
    component: InvoiceListComponent
  },

  // --- Invoice Form (New) ---
  {
    path: 'sales/invoices/new',
    component: InvoiceFormComponent
  },
  {
    path: 'sales/invoices/new/:uuid',
    component: InvoiceFormComponent
  },
  {
    path: 'admin/sales/sales/invoices/new',
    component: InvoiceFormComponent
  },
  {
    path: 'admin/sales/sales/invoices/new/:uuid',
    component: InvoiceFormComponent
  },
  {
    path: 'invoices/new',
    component: InvoiceFormComponent
  },
  {
    path: 'invoices/new/:uuid',
    component: InvoiceFormComponent
  },
  {
    path: 'admin/sales/invoices/new',
    component: InvoiceFormComponent
  },
  {
    path: 'admin/sales/invoices/new/:uuid',
    component: InvoiceFormComponent
  },

  // --- Invoice Detail ---
  {
    path: 'sales/invoices/:id',
    component: InvoiceDetailComponent
  },
  {
    path: 'sales/invoices/:id/:uuid',
    component: InvoiceDetailComponent
  },
  {
    path: 'admin/sales/sales/invoices/:id',
    component: InvoiceDetailComponent
  },
  {
    path: 'admin/sales/sales/invoices/:id/:uuid',
    component: InvoiceDetailComponent
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
    path: 'admin/sales/invoices/:id',
    component: InvoiceDetailComponent
  },
  {
    path: 'admin/sales/invoices/:id/:uuid',
    component: InvoiceDetailComponent
  },

  // --- Invoice Form (Edit) ---
  {
    path: 'sales/invoices/:id/edit',
    component: InvoiceFormComponent
  },
  {
    path: 'sales/invoices/:id/edit/:uuid',
    component: InvoiceFormComponent
  },
  {
    path: 'admin/sales/sales/invoices/:id/edit',
    component: InvoiceFormComponent
  },
  {
    path: 'admin/sales/sales/invoices/:id/edit/:uuid',
    component: InvoiceFormComponent
  },
  {
    path: 'invoices/:id/edit',
    component: InvoiceFormComponent
  },
  {
    path: 'invoices/:id/edit/:uuid',
    component: InvoiceFormComponent
  },
  {
    path: 'admin/sales/invoices/:id/edit',
    component: InvoiceFormComponent
  },
  {
    path: 'admin/sales/invoices/:id/edit/:uuid',
    component: InvoiceFormComponent
  },
  {
    path: 'commerce/requests',
    component: RequestManagementComponent
  },
  {
    path: 'commerce/requests/new/:uuid',
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
    path: 'commerce/orders/new/:uuid',
    component: ProductRequestFormComponent
    //redirectTo: '/commerce/requests/new/:uuid',
    //pathMatch: 'full'
  },
  {
    path: 'commerce/orders/:id',
    component: OrderDetailComponent
  },
   // Vendor portal
  {
    path: 'vendor-portal/:uuid',
    component: VendorPortalComponent,
    // path: 'commerce/requests/:id/tracking',
  },

]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

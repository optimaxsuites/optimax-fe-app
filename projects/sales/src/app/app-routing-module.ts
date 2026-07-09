import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RequestForQuotationFormComponent } from './ui/view/request-management/request-for-quotation-form/request-for-quotation-form.component';
import { RequestForQuotationServiceFormComponent } from './ui/view/request-management/request-for-quotation-service-form/request-for-quotation-service-form.component';
import { ProcurementTypeSelectorComponent } from './ui/view/request-management/procurement-type-selector/procurement-type-selector.component';
import { RfqTemplateSelectorComponent } from './ui/view/request-management/rfq-template-selector/rfq-template-selector.component';
import { VendorSelectionComponent } from './ui/view/request-management/vendor-selection/vendor-selection.component';
import { RequestForQuotationDetailComponent } from './ui/view/request-management/request-for-quotation-detail/request-for-quotation-detail.component';
import { RfqPreviewComponent } from './ui/view/request-management/rfq-preview/rfq-preview.component';
import { RequestManagementComponent } from './ui/view/request-management/request-management.component';
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
import { ProductServiceCatalogFormComponent } from './ui/view/sales-hub/product-service-catalog/product-service-catalog-form/product-service-catalog-form.component';
import { ProductServiceCatalogDetailComponent } from './ui/view/sales-hub/product-service-catalog/product-service-catalog-detail/product-service-catalog-detail.component';
import { RfqDetailWithQuotationsComponent } from './ui/view/request-management/rfq-detail-with-quotations/rfq-detail-with-quotations.component';
import { QuotationsDashboardComponent } from './ui/view/request-management/quotations-dashboard/quotations-dashboard.component';
import { QuotationDetailComponent } from './ui/view/request-management/quotation-detail/quotation-detail.component';
import { LpoPreviewComponent } from './ui/view/request-management/lpo-preview/lpo-preview.component';
import { RequestForQuotationDraftsComponent } from './ui/view/request-management/request-for-quotation-drafts/request-for-quotation-drafts.component';

export const routes: Routes = [
  {
    path: "",
    redirectTo: 'commerce/requests',
    pathMatch: 'full'
  },
  // {
  //   path: '',
  //   redirectTo: 'sales-hub',
  //   pathMatch: 'full'
  // },

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

  // --- Products/Services Catalog ---
  {
    path: 'products',
    redirectTo: 'sales-hub',
    pathMatch: 'full'
  },
  {
    path: 'products/new',
    component: ProductServiceCatalogFormComponent
  },
  {
    path: 'products/new/:uuid',
    component: ProductServiceCatalogFormComponent
  },
  {
    path: 'products/:id',
    component: ProductServiceCatalogDetailComponent
  },
  {
    path: 'products/:id/:uuid',
    component: ProductServiceCatalogDetailComponent
  },
  {
    path: 'products/:id/edit',
    component: ProductServiceCatalogFormComponent
  },
  {
    path: 'products/:id/edit/:uuid',
    component: ProductServiceCatalogFormComponent
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
    path: 'commerce/requests/drafts/:uuid',
    component: RequestForQuotationDraftsComponent
  },
  {
    path: 'commerce/requests/home/:uuid',
    component: RequestManagementComponent
  },
  {
    path: 'commerce/requests/new',
    component: ProcurementTypeSelectorComponent
  },
  {
    path: 'commerce/requests/:id',
    component: RequestForQuotationDetailComponent
  },
  {
    path: 'commerce/requests/new/product',
    component: RequestForQuotationFormComponent
  },
  {
    path: 'commerce/requests/new/product/:uuid',
    component: RequestForQuotationFormComponent
  },
  {
    path: 'commerce/requests/new/product/:uuid/template',
    component: RfqTemplateSelectorComponent
  },
  {
    path: 'commerce/requests/new/product/:uuid/vendors',
    component: VendorSelectionComponent
  },
  {
    path: 'commerce/requests/new/product/:uuid/preview',
    component: RfqPreviewComponent
  },
  {
    path: 'commerce/requests/new/service',
    component: RequestForQuotationServiceFormComponent
  },
  {
    path: 'commerce/requests/new/service/:uuid',
    component: RequestForQuotationServiceFormComponent
  },
  {
    path: 'commerce/requests/new/service/:uuid/template',
    component: RfqTemplateSelectorComponent
  },
  {
    path: 'commerce/requests/new/service/:uuid/vendors',
    component: VendorSelectionComponent
  },
  {
    path: 'commerce/requests/new/service/:uuid/preview',
    component: RfqPreviewComponent
  },
  {
    path: 'commerce/service-requests',
    component: RequestManagementComponent
  },
  {
    path: 'commerce/quotations',
    component: QuotationsDashboardComponent
  },
  {
    path: 'commerce/quotations/:id',
    component: QuotationDetailComponent
  },
  {
    path: 'commerce/quotations/:id/generate-lpo',
    component: LpoPreviewComponent
  },
  {
    path: 'commerce/quotations/:id/:uuid',
    component: QuotationDetailComponent
  },
  // RFQ Detail with Quotations
  {
    path: 'commerce/requests/:id/quotations',
    component: RfqDetailWithQuotationsComponent
  },
  {
    path: 'commerce/requests/:id/quotations/:uuid',
    component: RfqDetailWithQuotationsComponent
  },
  {
    path: 'vendor-portal/:uuid',
    component: VendorPortalComponent
  },
  {
    path: 'reports/:uuid',
    redirectTo: 'sales-hub',
    pathMatch: 'full'
  },
  {
    path: 'reports',
    redirectTo: 'sales-hub',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

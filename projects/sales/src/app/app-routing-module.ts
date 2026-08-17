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
import { ProcurementMessagingComponent } from './ui/view/request-management/procurement-messaging/procurement-messaging.component';
import { DeliveryManagementComponent } from './ui/view/sales-hub/delivery-management/delivery-management.component';
import { PaymentProcessingComponent } from './ui/view/sales-hub/payment-processing/payment-processing.component';
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
import { SalesAndTransactionsDetailComponent } from './ui/view/sales-hub/sales-and-transactions/sales-and-transactions-detail/sales-and-transactions-detail.component';
import { ProductServiceCatalogFormComponent } from './ui/view/sales-hub/product-service-catalog/product-service-catalog-form/product-service-catalog-form.component';
import { ProductServiceCatalogDetailComponent } from './ui/view/sales-hub/product-service-catalog/product-service-catalog-detail/product-service-catalog-detail.component';
import { RfqDetailWithQuotationsComponent } from './ui/view/request-management/rfq-detail-with-quotations/rfq-detail-with-quotations.component';
import { QuotationsDashboardComponent } from './ui/view/request-management/quotations-dashboard/quotations-dashboard.component';
import { QuotationDetailComponent } from './ui/view/request-management/quotation-detail/quotation-detail.component';
import { LpoPreviewComponent } from './ui/view/request-management/lpo-preview/lpo-preview.component';
import { RequestForQuotationDraftsComponent } from './ui/view/request-management/request-for-quotation-drafts/request-for-quotation-drafts.component';
import { ApprovalRfqDetailComponent } from './ui/view/request-management/approval-rfq-detail/approval-rfq-detail.component';
import { VendorManagementComponent } from './ui/view/vendor-management/vendor-management.component';
import { VendorManagementDashboardComponent } from './ui/view/vendor-management/vendor-management-dashboard/vendor-management-dashboard.component';
import { VendorManagementListComponent } from './ui/view/vendor-management/vendor-management-list/vendor-management-list.component';
import { VendorManagementDetailComponent } from './ui/view/vendor-management/vendor-management-detail/vendor-management-detail.component';
import { DeliveryTrackingComponent } from './ui/view/request-management/delivery-tracking/delivery-tracking.component';
import { PaymentVoucherComponent } from './ui/view/request-management/payment-voucher/payment-voucher.component';
import { ReceiptPreviewComponent } from './ui/view/request-management/receipt-preview/receipt-preview.component';
import { InventoryComponent } from './ui/view/inventory/inventory.component';
import { LogisticsComponent } from './ui/view/logistics/logistics.component';
import { ProductManagementFormComponent } from './ui/view/inventory/product/product-management-form/product-management-form.component';
import { BranchDetailComponent } from './ui/view/branch/branch-detail/branch-detail.component';
import { BranchInventoryFormComponent } from './ui/view/branch/branch-inventory-form/branch-inventory-form.component';
import { BranchFormComponent } from './ui/view/branch/branch-form/branch-form.component';
import { StockMovementFormComponent } from './ui/view/inventory/stock/stock-movement-form/stock-movement-form.component';
import { StockMovementDetailComponent } from './ui/view/inventory/stock/stock-movement-detail/stock-movement-detail.component';
import { TransferWizardComponent } from './ui/view/inventory/stock/transfer-wizard/transfer-wizard.component';
import { BulkTransferComponent } from './ui/view/inventory/stock/bulk-transfer/bulk-transfer.component';


export const routes: Routes = [
  {
    path: "",
    redirectTo: 'commerce/inventory',
    pathMatch: 'full'
  },



  // =======================================================================================================
  //                                                INVENTORY ROUTES
  // =======================================================================================================
  {
    path: 'commerce/inventory',
    component: InventoryComponent
  },
  {
    path: 'commerce/inventory/:uuid',
    component: InventoryComponent
  },

  // --------------------------------------- Product Management -----------------------------------------
  {
    path: 'admin/sales/inventory/products/new',
    component: ProductManagementFormComponent
  },
  {
    path: 'admin/sales/inventory/products/new/:uuid',
    component: ProductManagementFormComponent
  },
  {
    path: 'admin/sales/inventory/products/:id/edit',
    component: ProductManagementFormComponent
  },
  {
    path: 'admin/sales/inventory/products/:id/edit/:uuid',
    component: ProductManagementFormComponent
  },
  
  // --------------------------------------- Branch Management -----------------------------------------
  {
    path: 'admin/sales/inventory/branches/new',
    component: BranchFormComponent
  },
  {
    path: 'admin/sales/inventory/branches/:branchId',
    component: BranchDetailComponent
  },
  {
    path: 'admin/sales/inventory/branches/:branchId/add-product',
    component: BranchInventoryFormComponent
  },
  
  // --------------------------------------- Stock Movements -----------------------------------------
  {
    path: 'admin/sales/inventory/movements/new',
    component: StockMovementFormComponent
  },
  {
    path: 'admin/sales/inventory/movements/transfer',
    component: TransferWizardComponent
  },
  {
    path: 'admin/sales/inventory/movements/bulk-transfer',
    component: BulkTransferComponent
  },
  {
    path: 'admin/sales/inventory/movements/:id',
    component: StockMovementDetailComponent
  },
  {
    path: 'admin/sales/inventory/movements/:id/edit',
    component: StockMovementFormComponent
  },



  // *******************************************************************************************************



  // =======================================================================================================
  //                                                LOGISTICS ROUTES
  // =======================================================================================================
  {
    path: 'commerce/logistics',
    component: LogisticsComponent
  },
  {
    path: 'commerce/logistics/:uuid',
    component: LogisticsComponent
  },



  // *******************************************************************************************************



  // =======================================================================================================
  //                                                VENDOR MANAGEMENT ROUTES
  // =======================================================================================================
  {
    path: 'commerce/manage-vendors',
    component: VendorManagementComponent
  },
  {
    path: 'commerce/manage-vendors/:uuid',
    component: VendorManagementComponent
  },
  {
    path: 'commerce/manage-vendors/:id/profile',
    component: VendorManagementDetailComponent
  },


  // *******************************************************************************************************



  // =======================================================================================================
  //                                                SALES HUB ROUTES
  // =======================================================================================================
  {
    path: 'sales-hub',
    component: SalesHubComponent
  },
  {
    path: 'sales-hub/:uuid',
    component: SalesHubComponent
  },

  // ------------------------------------------- Quotes -----------------------------------------------------
  {
    path: 'quotes/new',
    component: QuoteFormComponent
  },
  {
    path: 'quotes/new/:uuid',
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
    path: 'quotes/:id',
    component: QuoteDetailComponent
  },
  {
    path: 'quotes/:id/:uuid',
    component: QuoteDetailComponent
  },

  // ------------------------------------------ Invoices ----------------------------------------------------
  {
    path: 'invoices/new',
    component: InvoiceFormComponent
  },
  {
    path: 'invoices/new/:uuid',
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
    path: 'invoices/:id',
    component: InvoiceDetailComponent
  },
  {
    path: 'invoices/:id/:uuid',
    component: InvoiceDetailComponent
  },

  // ------------------------------------------ Customers ---------------------------------------------------
  {
    path: 'customers/new',
    component: CustomerFormComponent
  },
  {
    path: 'customers/new/:uuid',
    component: CustomerFormComponent
  },
  {
    path: 'customers/:id/edit',
    component: CustomerFormComponent
  },
  {
    path: 'customers/:id/edit/:uuid',
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

  // ---------------------------------------- Product/Services Catalogue ---------------------------------------
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
    path: 'products/:id/edit',
    component: ProductServiceCatalogFormComponent
  },
  {
    path: 'products/:id/edit/:uuid',
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

  // ----------------------------------------- Sales & Transactions -------------------------------------------
  {
    path: 'sales-and-transactions/:id',
    component: SalesAndTransactionsDetailComponent
  },
  {
    path: 'sales-and-transactions/:id/:uuid',
    component: SalesAndTransactionsDetailComponent
  },
  {
    path: 'orders/:id',
    component: SalesAndTransactionsDetailComponent
  },
  {
    path: 'orders/:id/:uuid',
    component: SalesAndTransactionsDetailComponent
  },


  // *******************************************************************************************************



  // =======================================================================================================
  //                                                REQUEST MANAGEMENT ROUTES
  // =======================================================================================================

  // ------------------------------------------ Request Management ------------------------------------------
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


  // ------------------------------------------------ Quotations ---------------------------------------------
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
  {
    path: 'commerce/requests/:id/quotations',
    component: RfqDetailWithQuotationsComponent
  },
  {
    path: 'commerce/requests/:id/quotations/:uuid',
    component: RfqDetailWithQuotationsComponent
  },


  // ----------------------------------------------- Approvals ----------------------------------------------
  {
    path: 'commerce/requests/approvals/:id',
    component: ApprovalRfqDetailComponent
  },


  // -------------------------------------------- Delivery Tracking -----------------------------------------
  {
    path: 'commerce/requests/:id/delivery',
    component: DeliveryTrackingComponent
  },
  {
    path: 'commerce/requests/:id/delivery/:uuid',
    component: DeliveryTrackingComponent
  },


  // -------------------------------------------- Payment Vouchers ------------------------------------------
  {
    path: 'commerce/payment-vouchers',
    component: PaymentVoucherComponent
  },
  {
    path: 'commerce/payment-vouchers/:id',
    component: PaymentVoucherComponent
  },
  {
    path: 'commerce/payment-vouchers/:id/:uuid',
    component: PaymentVoucherComponent
  },


  // --------------------------------------- Receipt / Document Preview ---------------------------------------
  {
    path: 'commerce/receipts/:type/:id',
    component: ReceiptPreviewComponent
  },
  {
    path: 'commerce/receipts/:type/:id/:uuid',
    component: ReceiptPreviewComponent
  },




  // *******************************************************************************************************



  // ========================================================================================================
  //                                                VENDOR PORTAL ROUTES
  // ========================================================================================================

  {
    path: 'vendor-portal',
    component: VendorPortalComponent
  },
  {
    path: 'vendor-portal/:uuid',
    component: VendorPortalComponent
  },


  // ----------------------------------------- Procurement Messaging -----------------------------------------
  {
    path: 'commerce/requests/:id/messages',
    component: ProcurementMessagingComponent
  },
  {
    path: 'commerce/requests/:id/messages/:uuid',
    component: ProcurementMessagingComponent
  },


  // ------------------------------------------ Delivery Management ------------------------------------------
  {
    path: 'deliveries',
    component: DeliveryManagementComponent
  },
  {
    path: 'deliveries/:uuid',
    component: DeliveryManagementComponent
  },


  // ------------------------------------------- Payment Processing ------------------------------------------
  {
    path: 'payments',
    component: PaymentProcessingComponent
  },
  {
    path: 'payments/:uuid',
    component: PaymentProcessingComponent
  },


  // ----------------------------------------------- Reports -------------------------------------------------
  {
    path: 'reports/:uuid',
    redirectTo: 'sales-hub',
    pathMatch: 'full'
  },
  {
    path: 'reports',
    redirectTo: 'sales-hub',
    pathMatch: 'full'
  },

  // UUID-only path (from sidebar nav links like /admin/sales/{uuid}) — must be last
  {
    path: ':uuid',
    redirectTo: 'commerce/requests',
    pathMatch: 'full'
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
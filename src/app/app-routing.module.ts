import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DefaultComponent } from './default.component';
import { LoginComponent } from './ui/auth/view/login/login.component';
import { RegisterComponent } from './ui/auth/view/register/register.component';
import { MailVerificationComponent } from './ui/auth/view/mail-verification/mail-verification.component';
import { VerificationSuccessfullComponent } from './ui/auth/view/mail-verification/verification-successfull.component';
import { VerificationFailedComponent } from './ui/auth/view/mail-verification/verification-failed.component';
import { UserRegLayoutComponent } from './ui/auth/view/user-reg-layout.component';
import { BusinessRegComponent } from './ui/auth/view/business-reg/business-reg.component';
import { UserComponent } from './user.component';
import { PosCheckoutPageComponent } from './ui/pos/view/pos-checkout-page/pos-checkout-page.component';
// import { CheckoutOrdersComponent } from './ui/pos/view/checkout-orders.component';

import { MasterComponent } from './master.component';
import { DashboardPageComponent } from './ui/dashboard/view/dashboard-page.component';
import { SalesPageComponent } from './ui/sales/view/sales-page.component';
import { QuotationModalComponent } from './ui/sales/view/quotation-modal/quotation-modal.component';
import { ProformaInvoiceModalComponent } from './ui/sales/view/proforma-invoice-modal/proforma-invoice-modal.component';
import { DispatchNoteModalComponent } from './ui/sales/view/dispatch-note-modal/dispatch-note-modal.component';
import { InvoiceModalComponent } from './ui/sales/view/invoice-modal/invoice-modal.component';
import { AccountingPageComponent } from './ui/accounting/view/accounting-page.component';
import { PurchasePageComponent } from './ui/purchase/view/purchase-page.component';
import { RfqComponent } from './ui/purchase/view/rfq/rfq.component';
import { RfqModalComponent } from './ui/purchase/view/rfq-modal/rfq-modal.component';
import { InventoryPageComponent } from './ui/inventory/view/inventory-page.component';
import { InventoryFormComponent } from './ui/inventory/view/inventory-form/inventory-form.component';
import { ViewProductAsideComponent } from './ui/shared/view/view-product-aside/view-product-aside.component';
import { SettingsPageComponent } from './ui/settings/view/settings-page.component';
import { PaymentReceiptsModalComponent } from './ui/accounting/view/payment-receipts-modal/payment-receipts-modal.component';
import { SalesOrderComponent } from './ui/accounting/view/sales-order/sales-order.component';
import { PaymentRecordReceivedComponent } from './ui/accounting/view/payment-record-received/payment-record-received.component';
import { CrmPageComponent } from './ui/crm/view/crm-page.component';
import { PosPageComponent } from './ui/pos/view/pos-page.component';
import { VendorCategoryComponent } from './ui/crm/view/vendor-category/vendor-category.component';
import { VendorIndividualComponent } from './ui/crm/view/vendor-individual/vendor-individual.component';
import { VendorListComponent } from './ui/crm/view/vendor-list/vendor-list.component';
import { VendorManagementComponent } from './ui/crm/view/vendorMangement/vendorManagement';
// import { AuthGuard } from './ui/auth/service/auth.guard';
import { CheckoutOrdersComponent } from './ui/pos/view/checkout-orders/checkout-orders.component';
import { CashPaymentComponent } from './ui/pos/view/cash-payment/cash-payment.component';
import { OrderDetailComponent } from './ui/pos/view/order-detail/order-detail.component';
import { VerifyTokenComponent } from './ui/auth/view/verify-token/verify-token.component';
import { ExpensesComponent } from './ui/expenses/view/expenses.component';
import { ExpenseFormsModalComponent } from './ui/expenses/view/expense-forms-modal/expense-forms-modal.component';
// import { randomTokenResolver } from './ui/shared/domain/random-token/random-token.resolver';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'user/auth/sign-in/3bbfd81a-f9ef-4d61-9969-cc7b8f29a25b',
    pathMatch: 'full',
  },
  {
    path: '',
    component: DefaultComponent,
    children: [
      {
        path: 'user/auth/sign-in/:uuid',
        component: LoginComponent,
      },
      {
        path: 'user/auth/sign-up/:uuid',
        component: RegisterComponent,
      },
      {
        path: 'user/auth/emv/:uuid',
        component: MailVerificationComponent,
      },
      {
        path: 'user/auth/vrs/:uuid',
        component: VerificationSuccessfullComponent,
      },
      {
        path: 'user/auth/vrf/:uuid',
        component: VerificationFailedComponent,
      },
      {
        path: 'user/auth/verify',
        component: VerifyTokenComponent,
      },
    ],
  },

  {
    path: 'admin/settings/user-reg/:uuid',
    component: UserRegLayoutComponent,
  },
  {
    path: 'business-registration',
    component: BusinessRegComponent,
  },

  {
    path: '',
    component: UserComponent,
    // canActivate: [AuthGuard],
    children: [
      {
        path: 'user/checkout/:uuid',
        component: PosCheckoutPageComponent,
      },
      {
        path: 'user/checkout/orders/:uuid',
        component: CheckoutOrdersComponent,
      },
      {
        path: 'user/checkout/cash-payment/:uuid',
        component: CashPaymentComponent,
      },
      {
        path: 'user/checkout/order/:uuid',
        component: OrderDetailComponent,
      },
    ],
  },

  {
    path: '',
    component: MasterComponent,
    // canActivate: [AuthGuard],
    children: [
      {
        path: 'admin/dashboard/:uuid',
        component: DashboardPageComponent,
      },
      {
        path: 'admin/sales/:uuid',
        component: SalesPageComponent,
      },
      {
        path: 'sales/quotation/quotation-form',
        component: QuotationModalComponent,
      },
      {
        path: 'sales/quotation/quotation-form/:id',
        component: QuotationModalComponent,
      },
      {
        path: 'sales/proformer-invoice/proformer-invoice-form',
        component: ProformaInvoiceModalComponent,
      },
      {
        path: 'sales/dispatch-note/dispatch-note-form',
        component: DispatchNoteModalComponent,
      },
      {
        path: 'sales/invoice/invoice-form',
        component: InvoiceModalComponent,
      },
      {
        path: 'admin/accounting/:uuid',
        component: AccountingPageComponent,
      },
      {
        path: 'admin/purchase/:uuid',
        component: PurchasePageComponent,
      },
      {
        path: 'rfq',
        component: RfqComponent,
      },
      {

        path: 'purchase/rfq-modal',
        component: RfqModalComponent,
      },
      // { path: '', redirectTo: '/purchase', pathMatch: 'full' },
      { path: 'purchase/rfq-modal/:rfqId', component: RfqModalComponent },

      {
        path: 'admin/inventory/:uuid',
        component: InventoryPageComponent,
      },
      { path: 'inventory/inventory-form', component: InventoryFormComponent },
      {
        path: 'inventory/inventory-form/:id',
        component: InventoryFormComponent,
      },
      {
        path: 'inventory/view-product',
        component: ViewProductAsideComponent,
      },
      {
        path: 'admin/settings/:uuid',
        component: SettingsPageComponent,
      },
      {
        path: 'payment-receipts-modal',
        component: PaymentReceiptsModalComponent,
      },
      {
        path: 'sales-order',
        component: SalesOrderComponent,
      },
      {
        path: 'payment-record-received',
        component: PaymentRecordReceivedComponent,
      },
      {
        path: 'admin/crm/:uuid',
        component: CrmPageComponent,
      },
      {
        path: 'admin/expenses/:uuid',
        component: ExpensesComponent,
      },
      {

        path: 'expenses/expensesForm',
        component: ExpenseFormsModalComponent,
      },
      { path: '', redirectTo: '/expenses', pathMatch: 'full' },
      {
        path: 'admin/pos/:uuid',
        component: PosPageComponent,
      },
      {
        path: 'crm/vendorCategory',
        component: VendorCategoryComponent,
      },
      {
        path: 'crm/individualVendor',
        component: VendorIndividualComponent,
      },

      {
        path: 'crm/vendorList',
        component: VendorListComponent,
      },
      {
        path: 'crm/vendorManagement',
        component: VendorManagementComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { MasterComponent } from './layout/master/master.component';
import { DefaultComponent } from './layout/default/default.component';
import { LoginComponent } from './accounts/login/login.component';
import { RegisterComponent } from './accounts/register/register.component';
import { AccountingPageComponent } from './pages/accounting-page/accounting-page.component';
import { MembersPageComponent } from './pages/members-page/members-page.component';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';
import { InvoiceModalComponent } from './components/invoice-modal/invoice-modal.component';
import { SalesCardComponent } from './components/sales-card/sales-card.component';
import { SalesPageComponent } from './pages/sales-page/sales-page.component';
import { QuotationComponent } from './components/quotation/quotation.component';
import { ProformaInvoiceComponent } from './components/proforma-invoice/proforma-invoice.component';
import { ReceiptComponent } from './components/receipt/receipt.component';
import { PaymentReceiptsModalComponent } from './components/payment-receipts-modal/payment-receipts-modal.component';
import { PaymentRecordReceivedComponent } from './components/payment-record-received/payment-record-received.component';
import { SalesOrderComponent } from './components/sales-order/sales-order.component';
// import { SalesOrderModalComponent } from './components/rfq-modal/rfq-modal.component';
import { InventoryPageComponent } from './pages/inventory-page/inventory-page.component';
import { InventoryFormComponent } from './components/inventory-form/inventory-form.component';
import { PurchasePageComponent } from './pages/purchase-page/purchase-page.component';
import { RfqComponent } from './components/rfq/rfq.component';
import { RfqModalComponent } from './components/rfq-modal/rfq-modal.component';
import { QuotationModalComponent } from './components/quotation-modal/quotation-modal.component';
import { ProformaInvoiceModalComponent } from './components/proforma-invoice-modal/proforma-invoice-modal.component';
import { DispatchNoteModalComponent } from './components/dispatch-note-modal/dispatch-note-modal.component';

const routes: Routes = [
  {
    path: '',
    component: DefaultComponent,
    children: [
      {
        path: '',
        component: LoginComponent,
      },
      {
        path: 'register',
        component: RegisterComponent,
      },
    ],
  },

  {
    path: '',
    component: MasterComponent,
    children: [
      {
        path: 'dashboard',
        component: DashboardPageComponent,
      },
      {
        path: 'sales',
        component: SalesPageComponent,
      },
      {
        path: 'sales/quotation/quotation-form',
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
        path: 'accounting',
        component: AccountingPageComponent,
      },
      {
        path: 'purchase',
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
      { path: '', redirectTo: '/purchase', pathMatch: 'full' },
      // { path: 'purchase/rfq-modal/:id', component: RfqModalComponent },
      { path: 'purchase/rfq-modal/:rfqId', component: RfqModalComponent },

      
      {
        path: 'inventory',
        component: InventoryPageComponent,
      },
      { path: 'inventory/inventory-form', 
        component: InventoryFormComponent 
      },
      {
        path: 'inventory/inventory-form/:id',
        component: InventoryFormComponent,
      },
      {
        path: 'members',
        component: MembersPageComponent,
      },
      {
        path: 'settings',
        component: SettingsPageComponent,
      },
      {
        path: 'payment-receipts-modal',
        component: PaymentReceiptsModalComponent,
      },

      // {
      //   path: 'sales-order-modal',
      //   component: SalesOrderModalComponent,
      // },
      {
        path: 'sales-order',
        component: SalesOrderComponent,
      },
      {
        path: 'payment-record-received',
        component: PaymentRecordReceivedComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

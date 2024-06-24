import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { CdkScrollable } from '@angular/cdk/scrolling';

import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { DropdownModule } from 'primeng/dropdown';
// import { EditorModule } from "@progress/kendo-angular-editor";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { AsyncPipe } from '@angular/common';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CustomerFulfilmentComponent } from './components/customer-fulfilment/customer-fulfilment.component';
import { EarningsComponent } from './components/earnings/earnings.component';
import { FooterComponent } from './components/footer/footer.component';
import { LevelsComponent } from './components/levels/levels.component';
import { ManagementComponent } from './components/management/management.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ProductDesignComponent } from './components/product-design/product-design.component';
import { ProfileCardComponent } from './components/profile-card/profile-card.component';
import { ProfileInfoComponent } from './components/profile-info/profile-info.component';
import { QuestionAnswerComponent } from './components/question-answer/question-answer.component';
import { SalesCardComponent } from './components/sales-card/sales-card.component';
import { SearchbarComponent } from './components/searchbar/searchbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { SponsorComponent } from './components/sponsor/sponsor.component';
import { TodaySalesComponent } from './components/today-sales/today-sales.component';
import { TopProductsComponent } from './components/top-products/top-products.component';
import { TotalRevenueComponent } from './components/total-revenue/total-revenue.component';
import { TransactionCardComponent } from './components/transaction-card/transaction-card.component';
import { UserInterfaceComponent } from './components/user-interface/user-interface.component';
import { MasterComponent } from './layout/master/master.component';
import { DefaultComponent } from './layout/default/default.component';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { AccountingPageComponent } from './pages/accounting-page/accounting-page.component';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';
import { MembersPageComponent } from './pages/members-page/members-page.component';
import { LoginComponent } from './accounts/login/login.component';
import { RegisterComponent } from './accounts/register/register.component';
import { CanvasJSAngularChartsModule } from '@canvasjs/angular-charts';
import { InvoiceModalComponent } from './components/invoice-modal/invoice-modal.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { SalesPageComponent } from './pages/sales-page/sales-page.component';
import { MatCardModule } from '@angular/material/card';
import { QuotationComponent } from './components/quotation/quotation.component';
import { ProformaInvoiceComponent } from './components/proforma-invoice/proforma-invoice.component';
import { ReceiptComponent } from './components/receipt/receipt.component';
import { InvoiceComponent } from './components/invoice/invoice.component';
import { NumberOnlyDirective } from './directive/number-only/number-only.directive';
import { GeneralLedegerManagementComponent } from './components/general-ledeger-management/general-ledeger-management.component';
import { AccountPayabaleManagementComponent } from './components/account-payabale-management/account-payabale-management.component';
import { AccountReceivableManagementComponent } from './components/account-receivable-management/account-receivable-management.component';
import { BudgetingForecastingComponent } from './components/budgeting-forecasting/budgeting-forecasting.component';
import { CashManagementComponent } from './components/cash-management/cash-management.component';
import { PaymentReceiptsComponent } from './components/payment-receipts/payment-receipts.component';
import { PaymentReceiptsModalComponent } from './components/payment-receipts-modal/payment-receipts-modal.component';
import { PaymentRecordReceivedComponent } from './components/payment-record-received/payment-record-received.component';
import { SalesOrderComponent } from './components/sales-order/sales-order.component';
import { MatGridListModule } from '@angular/material/grid-list';
import { EditableLabelComponent } from './editable-label/editable-label.component';
import { ConfigureTaxPopupComponent } from './components/configure-tax-popup/configure-tax-popup.component';
import { NumberCurrencyPopupComponent } from './components/number-currency-popup/number-currency-popup.component';
import { AddNewClientComponent } from './components/add-new-client/add-new-client.component';
import { InventoryPageComponent } from './pages/inventory-page/inventory-page.component';
import { InventoryTableComponent } from './components/inventory-table/inventory-table.component';
import { InventoryFormComponent } from './components/inventory-form/inventory-form.component';
import { ManagedInventoryTableComponent } from './components/managed-inventory-table/managed-inventory-table.component';

import { PurchasePageComponent } from './pages/purchase-page/purchase-page.component';
import { RfqComponent } from './components/rfq/rfq.component';
import { RfqModalComponent } from './components/rfq-modal/rfq-modal.component';
import { BookKeepingComponent } from './components/book-keeping/book-keeping.component';
import { StripHtmlPipe } from './pipes/strip-html/strip-html.pipe';
import { QuotationModalComponent } from './components/quotation-modal/quotation-modal.component';
import { ProformaInvoiceModalComponent } from './components/proforma-invoice-modal/proforma-invoice-modal.component';
import { DispatchNoteComponent } from './components/dispatch-note/dispatch-note.component';
import { DispatchNoteModalComponent } from './components/dispatch-note-modal/dispatch-note-modal.component';
import { MailVerificationComponent } from './accounts/mail-verification/mail-verification.component';
import { ToastrModule } from 'ngx-toastr';
import { CrmPageComponent } from './pages/crm-page/crm-page.component';
import { VendorListComponent } from './components/vendor-category-list/vendor-list.component';
import { VendorManagementComponent } from './components/vendorMangement/vendorManagement';

@NgModule({
  declarations: [
    AppComponent,
    GeneralLedegerManagementComponent,
    CustomerFulfilmentComponent,
    EarningsComponent,
    FooterComponent,
    LevelsComponent,
    ManagementComponent,
    NavbarComponent,
    ProductDesignComponent,
    ProfileCardComponent,
    ProfileInfoComponent,
    QuestionAnswerComponent,
    SalesCardComponent,
    SearchbarComponent,
    SidebarComponent,
    SponsorComponent,
    TodaySalesComponent,
    TopProductsComponent,
    TotalRevenueComponent,
    TransactionCardComponent,
    UserInterfaceComponent,
    MasterComponent,
    DefaultComponent,
    DashboardPageComponent,
    AccountingPageComponent,
    SettingsPageComponent,
    MembersPageComponent,
    LoginComponent,
    RegisterComponent,
    InvoiceModalComponent,
    SalesPageComponent,
    QuotationComponent,
    ProformaInvoiceComponent,
    ReceiptComponent,
    InvoiceComponent,
    NumberOnlyDirective,
    AccountPayabaleManagementComponent,
    AccountReceivableManagementComponent,
    BudgetingForecastingComponent,
    CashManagementComponent,
    PaymentReceiptsComponent,
    RfqComponent,
    PaymentReceiptsModalComponent,
    PaymentRecordReceivedComponent,
    SalesOrderComponent,
    EditableLabelComponent,
    ConfigureTaxPopupComponent,
    NumberCurrencyPopupComponent,
    AddNewClientComponent,
    InventoryPageComponent,
    InventoryTableComponent,
    InventoryFormComponent,
    ManagedInventoryTableComponent,
    PurchasePageComponent,
    RfqModalComponent,
    BookKeepingComponent,
    StripHtmlPipe,
    QuotationModalComponent,
    ProformaInvoiceModalComponent,
    DispatchNoteComponent,
    DispatchNoteModalComponent,
    MailVerificationComponent,
    CrmPageComponent,
    VendorListComponent,
    VendorManagementComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MatTabGroup,
    FormsModule,
    MatTooltip,
    MatGridListModule,
    ReactiveFormsModule,
    NgApexchartsModule,
    CanvasJSAngularChartsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTabsModule,
    MatDatepickerModule,
    MatSelectModule,
    MatTooltipModule,
    MatButtonModule,
    CdkScrollable,
    MatTabsModule,
    MatDividerModule,
    DropdownModule,
    // EditorModule,
    MatCardModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AngularEditorModule,
    AsyncPipe,
    MatAutocompleteModule,
    MatExpansionModule,
    MatRadioModule,
    MatPaginatorModule,
    MatTableModule,
    MatRadioModule,
    ToastrModule.forRoot({
      timeOut: 10000,
      positionClass: 'toast-top-right',
      // preventDuplicates: true,
    }),
  ],
  providers: [provideAnimationsAsync(), provideNativeDateAdapter()],
  bootstrap: [AppComponent],
})
export class AppModule {}

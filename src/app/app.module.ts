import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
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

import { ButtonModule } from 'primeng/button';
import { EditorModule } from 'primeng/editor';
import { PasswordModule } from 'primeng/password';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { SidebarModule } from 'primeng/sidebar';
import { DialogModule } from 'primeng/dialog';
import { TabViewModule } from 'primeng/tabview';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SplitButtonModule } from 'primeng/splitbutton';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { StepperModule } from 'primeng/stepper';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';
// import { MessageService } from 'primeng/api';
import { RippleModule } from 'primeng/ripple';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';

// import { EditorModule } from "@progress/kendo-angular-editor";

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { AsyncPipe } from '@angular/common';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AppRoutingModule } from './app-routing.module';
import { CanvasJSAngularChartsModule } from '@canvasjs/angular-charts';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';

import { AppComponent } from './app.component';
import { GeneralLedegerManagementComponent } from './ui/shared/view/general-ledeger-management/general-ledeger-management.component';
import { CustomerFulfilmentComponent } from './ui/shared/view/customer-fulfilment/customer-fulfilment.component';
import { EarningsComponent } from './ui/dashboard/view/earnings/earnings.component';
import { FooterComponent } from './ui/shared/view/footer/footer.component';
import { LevelsComponent } from './ui/dashboard/view/levels/levels.component';
import { ManagementComponent } from './ui/shared/view/management/management.component';
import { NavbarComponent } from './ui/shared/view/navbar/navbar.component';
import { ProductDesignComponent } from './ui/shared/view/product-design/product-design.component';
import { ProfileInfoComponent } from './ui/shared/view/profile-info/profile-info.component';
import { QuestionAnswerComponent } from './ui/shared/view/question-answer/question-answer.component';
import { SalesCardComponent } from './ui/dashboard/view/sales-card/sales-card.component';
import { SearchbarComponent } from './ui/shared/view/searchbar/searchbar.component';
import { SidebarComponent } from './ui/shared/view/sidebar/sidebar.component';
import { SponsorComponent } from './ui/dashboard/view/sponsor/sponsor.component';
import { TodaySalesComponent } from './ui/dashboard/view/today-sales/today-sales.component';
import { TopProductsComponent } from './ui/dashboard/view/top-products/top-products.component';
import { TotalRevenueComponent } from './ui/dashboard/view/total-revenue/total-revenue.component';
import { TransactionCardComponent } from './ui/dashboard/view/transaction-card/transaction-card.component';
import { UserInterfaceComponent } from './ui/shared/view/user-interface/user-interface.component';
import { MasterComponent } from './master.component';
import { DefaultComponent } from './default.component';
import { DashboardPageComponent } from './ui/dashboard/view/dashboard-page.component';
import { AccountingPageComponent } from './ui/accounting/view/accounting-page.component';
import { SettingsPageComponent } from './ui/settings/view/settings-page.component';
import { LoginComponent } from './ui/auth/view/login/login.component';
import { RegisterComponent } from './ui/auth/view/register/register.component';
import { InvoiceModalComponent } from './ui/sales/view/invoice-modal/invoice-modal.component';
import { SalesPageComponent } from './ui/sales/view/sales-page.component';
import { QuotationComponent } from './ui/sales/view/quotation/quotation.component';
import { ProformaInvoiceComponent } from './ui/sales/view/proforma-invoice/proforma-invoice.component';
import { ReceiptComponent } from './ui/shared/view/receipt/receipt.component';
import { InvoiceComponent } from './ui/sales/view/invoice/invoice.component';
import { NumberOnlyDirective } from './ui/shared/domain/number-only/number-only.directive';
import { AccountPayabaleManagementComponent } from './ui/shared/view/account-payabale-management/account-payabale-management.component';
import { AccountReceivableManagementComponent } from './ui/accounting/view/account-receivable-management/account-receivable-management.component';
import { BudgetingForecastingComponent } from './ui/accounting/view/budgeting-forecasting/budgeting-forecasting.component';
import { CashManagementComponent } from './ui/shared/view/cash-management/cash-management.component';
import { PaymentReceiptsComponent } from './ui/accounting/view/payment-receipts/payment-receipts.component';
import { RfqComponent } from './ui/purchase/view/rfq/rfq.component';
import { PaymentReceiptsModalComponent } from './ui/accounting/view/payment-receipts-modal/payment-receipts-modal.component';
import { PaymentRecordReceivedComponent } from './ui/accounting/view/payment-record-received/payment-record-received.component';
import { SalesOrderComponent } from './ui/accounting/view/sales-order/sales-order.component';
import { EditableLabelComponent } from './ui/shared/view/editable-label/editable-label.component';
import { ConfigureTaxPopupComponent } from './ui/shared/view/configure-tax-popup/configure-tax-popup.component';
import { NumberCurrencyPopupComponent } from './ui/shared/view/number-currency-popup/number-currency-popup.component';
import { AddNewClientComponent } from './ui/sales/view/add-new-client/add-new-client.component';
import { InventoryPageComponent } from './ui/inventory/view/inventory-page.component';
import { InventoryTableComponent } from './ui/inventory/view/inventory-table/inventory-table.component';
import { InventoryFormComponent } from './ui/inventory/view/inventory-form/inventory-form.component';
import { ManagedInventoryTableComponent } from './ui/shared/view/managed-inventory-table/managed-inventory-table.component';
import { PurchasePageComponent } from './ui/purchase/view/purchase-page.component';
import { RfqModalComponent } from './ui/purchase/view/rfq-modal/rfq-modal.component';
import { BookKeepingComponent } from './ui/accounting/view/book-keeping/book-keeping.component';
import { StripHtmlPipe } from './ui/shared/domain/strip-html/strip-html.pipe';
import { QuotationModalComponent } from './ui/sales/view/quotation-modal/quotation-modal.component';
import { ProformaInvoiceModalComponent } from './ui/sales/view/proforma-invoice-modal/proforma-invoice-modal.component';
import { DispatchNoteComponent } from './ui/sales/view/dispatch-note/dispatch-note.component';
import { DispatchNoteModalComponent } from './ui/sales/view/dispatch-note-modal/dispatch-note-modal.component';
import { MailVerificationComponent } from './ui/auth/view/mail-verification/mail-verification.component';
import { CrmPageComponent } from './ui/crm/view/crm-page.component';
import { VendorManagementComponent } from './ui/crm/view/vendorMangement/vendorManagement';
import { VendorCategoryComponent } from './ui/crm/view/vendor-category/vendor-category.component';
import { VendorIndividualComponent } from './ui/crm/view/vendor-individual/vendor-individual.component';
import { UserRegComponent } from './ui/auth/view/user-reg/user-reg.component';
import { BusinessRegComponent } from './ui/auth/view/business-reg/business-reg.component';
import { Navbar2Component } from './ui/shared/view/navbar/navbar2.component';
import { PosPageComponent } from './ui/pos/view/pos-page.component';
import { ProductsComponent } from './ui/pos/view/products/products.component';
import { ConfigurationComponent } from './ui/pos/view/configuration/configuration.component';
import { POSDashboardComponent } from './ui/pos/view/posdashboard/posdashboard.component';
import { PosCheckoutPageComponent } from './ui/pos/view/pos-checkout-page/pos-checkout-page.component';
import { UserComponent } from './user.component';
import { VerificationSuccessfullComponent } from './ui/auth/view/mail-verification/verification-successfull.component';
import { VerificationFailedComponent } from './ui/auth/view/mail-verification/verification-failed.component';
import { VendorListComponent } from './ui/crm/view/vendor-list/vendor-list.component';
import { UserRegLayoutComponent } from './ui/auth/view/user-reg-layout.component';
import { ProductCardComponent } from './ui/pos/view/product-card/product-card.component';
import { CartItemCardComponent } from './ui/pos/view/cart-item-card/cart-item-card.component';
import { ManageUsersComponent } from './ui/pos/view/manage-users/manage-users.component';
import { ManageUserFormComponent } from './ui/pos/view/manage-user-form/manage-user-form.component';
import { ModalComponent } from './ui/shared/view/modal/modal.component';
import { CommisionComponent } from './ui/pos/view/commision/commision.component';
import { AuthInterceptor } from './ui/auth/service/auth.interceptor.service';
import { ProfileCardComponent } from './ui/shared/view/profile-card/profile-card.component';
import { CheckoutHeaderComponent } from './ui/pos/view/pos-checkout-page/components/checkout-header/checkout-header.component';
import { ButtonComponent } from './ui/shared/view/button/button.component';
import { BackButtonComponent } from './ui/shared/view/back-button/back-button.component';
import { CheckoutOrdersComponent } from './ui/pos/view/checkout-orders/checkout-orders.component';
import { CashPaymentComponent } from './ui/pos/view/cash-payment/cash-payment.component';
import { OrderDetailComponent } from './ui/pos/view/order-detail/order-detail.component';
import { VerifyTokenComponent } from './ui/auth/view/verify-token/verify-token.component';
import { ExpensesComponent } from './ui/expenses/view/expenses.component';
import { ExpenseTableComponent } from './ui/expenses/view/expense-table/expense-table.component';
import { ExpenseFormsModalComponent } from './ui/expenses/view/expense-forms-modal/expense-forms-modal.component';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { OrderRefundComponent } from './ui/pos/view/order-refund/order-refund.component';
import { DropdownComponent } from './ui/shared/view/dropdown/dropdown.component';
import { RequestDetailsComponent } from './ui/pos/view/request-details/request-details.component';
import { OpenRegisterComponent } from './ui/pos/view/open-register/open-register.component';
import { CloseRegisterComponent } from './ui/pos/view/close-register/close-register.component';
import { TruncatePipe } from './truncate.pipe';
import { SideModalComponent } from './ui/shared/view/side-modal/side-modal.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { UploadRecieptComponent } from './ui/expenses/view/upload-reciept/upload-reciept.component';
import { AddPerDiemComponent } from './ui/expenses/view/add-per-diem/add-per-diem.component';
import { ExpenseSummaryComponent } from './ui/expenses/view/expense-summary/expense-summary.component';
import { ExpenseApprovalComponent } from './ui/expenses/view/expense-approval/expense-approval.component';

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
    // MembersPageComponent,
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
    VendorManagementComponent,
    VendorCategoryComponent,
    VendorIndividualComponent,
    UserRegComponent,
    BusinessRegComponent,
    Navbar2Component,
    PosPageComponent,
    ProductsComponent,
    ConfigurationComponent,
    POSDashboardComponent,
    PosCheckoutPageComponent,
    UserComponent,
    VerificationSuccessfullComponent,
    VerificationFailedComponent,
    VendorListComponent,
    UserRegLayoutComponent,
    ProductCardComponent,
    CartItemCardComponent,
    ManageUsersComponent,
    ManageUserFormComponent,
    ModalComponent,
    CommisionComponent,
    ModalComponent,
    CheckoutHeaderComponent,
    ButtonComponent,
    BackButtonComponent,
    CheckoutOrdersComponent,
    CashPaymentComponent,
    OrderDetailComponent,
    VerifyTokenComponent,
    ExpensesComponent,
    ExpenseTableComponent,
    ExpenseFormsModalComponent,
    OrderRefundComponent,
    DropdownComponent,
    RequestDetailsComponent,
    OpenRegisterComponent,
    CloseRegisterComponent,
    TruncatePipe,
    SideModalComponent,
    UploadRecieptComponent,
    AddPerDiemComponent,
    ExpenseSummaryComponent,
    ExpenseApprovalComponent,
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
    MatProgressSpinnerModule,
    SidebarModule,
    DialogModule,
    TabViewModule,
    ToolbarModule,
    ConfirmDialogModule,
    SplitButtonModule,
    PanelModule,
    DividerModule,
    OverlayPanelModule,
    StepperModule,
    InputTextModule,
    FloatLabelModule,
    // EditorModule,
    // MessagesModule,
    // MessageModule,
    RippleModule,
    TableModule,
    PasswordModule,
    ButtonModule,
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
    ToastModule,
    TagModule,
    CalendarModule,
    CheckboxModule,
    NgSelectModule,
    // ToastrModule.forRoot(),
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent],
})
export class AppModule {}

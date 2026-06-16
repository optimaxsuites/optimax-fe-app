import { NgModule } from '@angular/core'; // trigger re-compile 2
import { BrowserModule } from '@angular/platform-browser';
// import { NgApexchartsModule } from "ng-apexcharts";

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BudgetingForecastingComponent } from './ui/view/budgeting-forecasting/budgeting-forecasting.component';
import { AccountReceivableManagementComponent } from './ui/view/account-receivable-management/account-receivable-management.component';
// import { AccountPayabaleManagementComponent } from './ui/sharedComponent/view/account-payabale-management/account-payabale-management.component';
import { AccountingPageComponent } from './ui/view/accounting-page.component';
import { BookKeepingComponent } from './ui/view/book-keeping/book-keeping.component';
import { PaymentReceiptsComponent } from './ui/view/payment-receipts/payment-receipts.component';
import { PaymentReceiptsModalComponent } from './ui/view/payment-receipts-modal/payment-receipts-modal.component';
import { PaymentRecordReceivedComponent } from './ui/view/payment-record-received/payment-record-received.component';
import { SalesOrderComponent } from './ui/view/sales-order/sales-order.component';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

/////////////mat
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { DragDropModule } from '@angular/cdk/drag-drop';

///////primeng
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
import { RippleModule } from 'primeng/ripple';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';

import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { QuotationComponent } from './ui/view/quotation/quotation.component';
import { ButtonComponent } from './ui/sharedComponent/view/button/button.component';
import { QuotationModalComponent } from './ui/view/quotation-modal/quotation-modal.component';
import { AddNewClientComponent } from './ui/view/add-new-client/add-new-client.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { SideModalComponent } from './ui/sharedComponent/view/side-modal/side-modal.component';
import { AddQuotationItemComponent } from './ui/view/add-quotation-item/add-quotation-item.component';
import { AddShippingDetailsComponent } from './ui/view/add-shipping-details/add-shipping-details.component';
import { BackButtonComponent } from './ui/sharedComponent/view/back-button/back-button.component';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './ui/sharedComponent/service/auth-service/auth.interceptor.service';
import { TransactionsComponent } from './ui/view/transactions/transactions.component';
import { NavTabComponent } from './ui/sharedComponent/view/nav-tab/nav-tab.component';
import { AccountingReportsComponent } from './ui/view/accounting-reports/accounting-reports.component';
import { ReportTabsComponent } from './ui/view/reports/report-tabs/report-tabs.component';
import { BalanceSheetComponent } from './ui/view/reports/balance-sheet/balance-sheet.component';
import { IncomeStatementComponent } from './ui/view/reports/income-statement/income-statement.component';
import { TaxSummaryComponent } from './ui/view/reports/tax-summary/tax-summary.component';
import { CashFlowComponent } from './ui/view/reports/cash-flow/cash-flow.component';
import { ReportContextComponent } from './ui/view/reports/report-context.component';
import { AccountingDiagnosticsComponent } from './ui/view/reports/accounting-diagnostics.component';
import { TaxTypeFilterPipe } from './ui/view/reports/tax-type-filter.pipe';
import { ChartOfAccountsComponent } from './ui/view/chart-of-accounts/chart-of-accounts.component';
import { PaginatorModule } from 'primeng/paginator';
import { TransactionSideModalComponent } from './ui/view/transaction-side-modal/transaction-side-modal.component';
import { NewCoaModalComponent } from './ui/view/new-coa-modal/new-coa-modal.component';
import { ConnectMonoComponent } from './ui/view/connect-mono/connect-mono.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { IncomeStatementChartsComponent } from './ui/view/reports/income-statement/income-statement-charts/income-statement-charts.component';
import { IncomeStatementFilterComponent } from './ui/view/reports/income-statement/income-statement-filter/income-statement-filter.component';
import { CalendarModule } from 'primeng/calendar';
import { AccordionModule } from 'primeng/accordion';
import { BankAccountOverviewComponent } from './ui/view/bank-account-overview/bank-account-overview.component';
import { DropdownModule } from 'primeng/dropdown';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { FileUploadModule } from 'primeng/fileupload';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { BankReconciliationComponent } from './ui/view/bank-reconciliation/bank-reconciliation.component';
import { SalesReconciliationComponent } from './ui/view/sales-reconciliation/sales-reconciliation.component';
import { ReconciliationComponent } from './ui/view/reconcillation/reconciliation.component';
import { GeneralReconciliationComponent } from './ui/view/general-reconciliation/general-reconciliation.component';
import { ReconciliationTabComponent } from './ui/view/reconciliation-tab/reconciliation-tab.component';
import { ReconcileSalesComponent } from './ui/view/reconcile-sales/reconcile-sales.component';
import { GeneralTransactionsComponent } from './ui/view/general-transactions/general-transactions.component';
import { ReconciliationKanbanComponent } from './ui/view/reconciliation-kanban/reconciliation-kanban.component';
import { TransferFundsComponent } from './ui/view/transfer-funds/transfer-funds.component';
import { SmartAccountantAiComponent } from './ui/view/smart-accountant-ai/smart-accountant-ai.component';
import { DeletedRecordsComponent } from './ui/view/deleted-records/deleted-records.component';
import { JwtHelperService, JWT_OPTIONS } from '@auth0/angular-jwt';
import { ConfirmationService } from 'primeng/api';
import { PdfViewerWrapperModule } from './ui/sharedComponent/view/pdf-viewer-wrapper/pdf-viewer-wrapper.module';
import { DisbursementComponent } from './ui/view/disbursement/disbursement.component';
import { GeneralLedgerComponent } from './ui/view/general-ledger/general-ledger.component';
import { ToastComponent } from './ui/sharedComponent/view/toast/toast.component';
import { AccountingQueueComponent } from './ui/view/accounting-queue/accounting-queue.component';
import { LargeSideModalComponent } from './ui/sharedComponent/view/large-side-modal/large-side-modal.component';
import { BankConnectionSettingsComponent } from './ui/view/bank-connection-settings/bank-connection-settings.component';
import { PayoutComponent } from './ui/view/disbursement/payout-wizard/payout-wizard.component';
import { PaystackComponent } from './ui/view/paystack/paystack.component';
import { BankTransactionsComponent } from './ui/view/bank-transactions/bank-transactions.component';
import { PaystackTransferDetailComponent } from './ui/view/bank-account-overview/paystack-transfer-detail/paystack-transfer-detail.component';
import { PaystackInitiateTransferComponent } from './ui/view/paystack-initiate-transfer/paystack-initiate-transfer.component';

@NgModule({
  declarations: [
    AppComponent,
    BudgetingForecastingComponent,
    AccountReceivableManagementComponent,
    AccountingPageComponent,
    BookKeepingComponent,
    PaymentReceiptsComponent,
    PaymentReceiptsModalComponent,
    PaymentRecordReceivedComponent,
    SalesOrderComponent,
    QuotationComponent,
    ChartOfAccountsComponent,
    TransactionSideModalComponent,
    NewCoaModalComponent,
    ConnectMonoComponent,
    ReportTabsComponent,
    BalanceSheetComponent,
    AccountingDiagnosticsComponent,
    IncomeStatementComponent,
    TaxSummaryComponent,
    CashFlowComponent,
    ReportContextComponent,
    TaxTypeFilterPipe,
    IncomeStatementChartsComponent,
    IncomeStatementFilterComponent,
    BankReconciliationComponent,
    ReconciliationComponent,
    SalesReconciliationComponent,
    GeneralReconciliationComponent,
    BankAccountOverviewComponent,
    ReconciliationTabComponent,
    ReconcileSalesComponent,
    ReconciliationKanbanComponent,
    GeneralTransactionsComponent,
    TransferFundsComponent,
    SmartAccountantAiComponent,
    DeletedRecordsComponent,
    NavTabComponent,
    AccountingReportsComponent,
    QuotationModalComponent,
    AddNewClientComponent,
    AddQuotationItemComponent,
    AddShippingDetailsComponent,
    TransactionsComponent,
    DisbursementComponent,
    GeneralLedgerComponent,
    ToastComponent,
    AccountingQueueComponent,
    BankConnectionSettingsComponent,
    PaystackComponent,
    BankTransactionsComponent,
    PaystackTransferDetailComponent,
    PaystackInitiateTransferComponent
  ],
  imports: [
    // BrowserModule,
    // BrowserAnimationsModule,
    CommonModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    AngularEditorModule,
    MatGridListModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTabsModule,
    MatDatepickerModule,
    MatSelectModule,
    MatTooltipModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatAutocompleteModule,
    MatExpansionModule,
    MatRadioModule,
    MatPaginatorModule,
    MatTableModule,
    MatMenuModule,
    SidebarModule,
    TabViewModule,
    NgSelectModule,
    ButtonComponent,
    BackButtonComponent,
    ToolbarModule,
    ConfirmDialogModule,
    SplitButtonModule,
    PanelModule,
    DividerModule,
    OverlayPanelModule,
    StepperModule,
    TagModule,
    InputTextModule,
    FloatLabelModule,
    EditorModule,
    MessagesModule,
    MessageModule,
    RippleModule,
    TableModule,
    PasswordModule,
    ToastModule,
    ButtonModule,
    HttpClientModule,
    CardModule,
    PaginatorModule,
    DialogModule,
    NgApexchartsModule,
    CalendarModule,
    AccordionModule,
    DragDropModule,
    DropdownModule,
    SelectButtonModule,
    TooltipModule,
    FileUploadModule,
    ToggleButtonModule,
    ProgressSpinnerModule,
    PdfViewerWrapperModule,
    SideModalComponent,
    LargeSideModalComponent,
    PayoutComponent
  ],
  providers: [
    MessageService,
    ConfirmationService,
    { provide: JWT_OPTIONS, useValue: JWT_OPTIONS },
    JwtHelperService,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent],
})
export class AppAccountingModule {}

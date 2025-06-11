import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

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
import { HttpClientModule } from '@angular/common/http';
import { TransactionsComponent } from './ui/view/transactions/transactions.component';
import { NavTabComponent } from "./ui/sharedComponent/view/nav-tab/nav-tab.component";
import { AccountingReportsComponent } from './ui/view/accounting-reports/accounting-reports.component';
import { ChartOfAccountsComponent } from './ui/view/chart-of-accounts/chart-of-accounts.component';
import { PaginatorModule } from 'primeng/paginator';

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
    QuotationModalComponent,
    AddNewClientComponent,
    AddQuotationItemComponent,
    AddShippingDetailsComponent,
    TransactionsComponent,
    AccountingReportsComponent,
    ChartOfAccountsComponent,
  ],
  imports: [
    // BrowserModule,
    // BrowserAnimationsModule,
    CommonModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    AngularEditorModule,
    MatTabGroup,
    MatTooltip,
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
    MatTabsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatAutocompleteModule,
    MatExpansionModule,
    MatRadioModule,
    MatPaginatorModule,
    MatTableModule,
    MatRadioModule,
    MatMenuModule,
    SidebarModule,
    TabViewModule,
    NgSelectModule,
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
    ButtonComponent,
    SideModalComponent,
    BackButtonComponent,
    HttpClientModule,
    CardModule,
    NavTabComponent,
    PaginatorModule,
    DialogModule
],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppAccountingModule { }

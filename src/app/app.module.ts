import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { DropdownModule } from 'primeng/dropdown';
// import { EditorModule } from "@progress/kendo-angular-editor";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule} from '@angular/common/http';
import { AngularEditorModule } from '@kolkov/angular-editor';




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
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgApexchartsModule,
    CanvasJSAngularChartsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDatepickerModule,
    MatSelectModule,
    MatTooltipModule,
    MatButtonModule,
    CdkScrollable,
    MatTabsModule,
    MatDividerModule,
    DropdownModule,
    // EditorModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AngularEditorModule

    
  ],
  providers: [provideAnimationsAsync(), provideNativeDateAdapter()],
  bootstrap: [AppComponent],
})
export class AppModule {}
